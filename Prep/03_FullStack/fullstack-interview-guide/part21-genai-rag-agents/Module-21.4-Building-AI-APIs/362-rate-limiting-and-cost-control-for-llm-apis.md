# Rate Limiting and Cost Control for LLM APIs
> Part 21 — Generative AI for Full Stack Engineers · Building AI APIs
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **LLM API costs are unbound by default**: a single uncontrolled endpoint can generate a $10,000 AWS bill in one night if hit with a simple load test or abuse scenario; rate limiting + cost controls are non-negotiable before going live
- **Three layers of protection**: (1) per-user rate limits (requests per minute, tokens per day); (2) application-level cost budget (circuit break at $X/day via usage tracking); (3) model tiering (expensive model for complex queries, cheap model for simple ones — same cost reduction as hardware tiering)
- **Token budgets beat request counts**: a user sending 10 short queries is cheaper than 1 query with a 50-page PDF; track token consumption per user, not just request count; OpenAI usage object returns `promptTokens + completionTokens` per call
- **Resilience4j `RateLimiter` for per-user control**: wrap LLM calls with `RateLimiter` keyed by userId; default to 10 RPM per user for non-premium; throw `RequestNotPermitted` if exceeded; return HTTP 429 with `Retry-After` header
- **Daily token budget with Redis**: persist token consumption per userId in Redis with a 24-hour TTL; check before each call; deny with informative message if budget exceeded; reset at midnight UTC
- **Semantic cache (topic 363) cuts cost 30-60%** for repeated similar queries — implement before adding quotas, since cached responses don't consume tokens

---

## 1. One-Line Definition
Rate limiting and cost control for LLM APIs means enforcing per-user request limits, daily token budgets, and model tiering to prevent individual users or abuse scenarios from generating runaway API costs.

---

## 2. Cost Explosion Scenarios

```
COMMON COST EXPLOSION PATTERNS
│
├── The Stress Test Scenario
│   QA runs a load test against /api/ai/chat at 100 RPS
│   → 100 OpenAI GPT-4o calls/second × $0.015/1K tokens × 500 tokens avg
│   → $750/minute → $45,000/hour
│
├── The Prompt Bomb
│   User crafts a 50-page PDF (200K tokens) and submits it for "summarisation"
│   → Single call costs $3+ (GPT-4o input pricing)
│   → 100 users doing this = $300 in 10 minutes
│
├── The Agent Loop
│   Agent hits maxIterations=unlimited
│   → 50 LLM calls per "request" at $0.015 each = $0.75 per user query
│   → 10,000 users/day = $7,500/day instead of $150/day
│
└── The Public Endpoint
    API deployed without auth
    → Scrapers hit endpoint to generate training data for free
    → Bill arrives Friday, engineers notice Monday
```

---

## 3. Per-User Rate Limiting with Resilience4j

```java
// application.yaml
resilience4j:
  ratelimiter:
    instances:
      llm-standard:
        limit-for-period: 10        # 10 requests per window
        limit-refresh-period: 60s   # 1-minute window
        timeout-duration: 0s        # Fail immediately (no queuing)
      llm-premium:
        limit-for-period: 60
        limit-refresh-period: 60s
        timeout-duration: 0s
```

```java
@Service
public class RateLimitedLlmService {

    private final ChatClient chatClient;
    private final RateLimiterRegistry rateLimiterRegistry;
    
    // Different rate limiters per user tier
    public String chat(String userId, String userTier, String message) {
        String limiterName = "premium".equals(userTier) ? "llm-premium" : "llm-standard";
        RateLimiter limiter = rateLimiterRegistry.rateLimiter(limiterName + "-" + userId);
        
        // Check rate limit before calling LLM
        if (!limiter.acquirePermission()) {
            throw new RateLimitExceededException(userId, 
                "Rate limit exceeded. Try again in " + 
                limiter.getMetrics().getAvailablePermissions() + "s");
        }
        
        return callLlm(message);
    }
}

// Controller — return 429 with standard headers
@ExceptionHandler(RateLimitExceededException.class)
public ResponseEntity<ErrorResponse> handleRateLimit(RateLimitExceededException e) {
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
        .header("Retry-After", "60")
        .header("X-RateLimit-Limit", "10")
        .body(new ErrorResponse("RATE_LIMIT_EXCEEDED", e.getMessage()));
}
```

---

## 4. Daily Token Budget with Redis

```java
@Service
public class TokenBudgetService {

    private static final long DAILY_TOKEN_LIMIT = 100_000L;   // ~$1.50/user/day at GPT-4o-mini
    private static final long DAILY_SECONDS = 86_400L;
    
    private final RedisTemplate<String, String> redisTemplate;
    
    private String budgetKey(String userId) {
        return "llm:tokens:" + LocalDate.now() + ":" + userId;
    }
    
    public void checkAndReserve(String userId, int estimatedTokens) {
        String key = budgetKey(userId);
        Long current = redisTemplate.opsForValue().increment(key, estimatedTokens);
        
        // Set TTL on first write (key expires at end of day)
        if (current != null && current <= estimatedTokens) {
            redisTemplate.expire(key, Duration.ofSeconds(DAILY_SECONDS));
        }
        
        if (current != null && current > DAILY_TOKEN_LIMIT) {
            // Roll back the reservation
            redisTemplate.opsForValue().decrement(key, estimatedTokens);
            throw new DailyBudgetExceededException(userId, DAILY_TOKEN_LIMIT);
        }
    }
    
    public void recordActualUsage(String userId, int actualTokensUsed, int estimated) {
        // Correct the reservation with actual usage
        int correction = actualTokensUsed - estimated;
        if (correction != 0) {
            redisTemplate.opsForValue().increment(budgetKey(userId), correction);
        }
    }
}

// In the LLM service — track actual usage from response
@Service 
public class CostTrackedLlmService {

    public String chat(String userId, String message) {
        int estimated = estimateInputTokens(message) + 500; // rough output estimate
        tokenBudgetService.checkAndReserve(userId, estimated);
        
        ChatResponse response = chatClient.prompt()
            .user(message)
            .call()
            .chatResponse();
        
        Usage usage = response.getMetadata().getUsage();
        int actual = (int)(usage.getPromptTokens() + usage.getGenerationTokens());
        tokenBudgetService.recordActualUsage(userId, actual, estimated);
        
        return response.getResult().getOutput().getContent();
    }
    
    private int estimateInputTokens(String text) {
        return (int)(text.length() / 3.5); // rough: 3.5 chars per token
    }
}
```

---

## 5. Model Tiering — Cost Reduction

```java
// Route to cheap model for simple queries, expensive model for complex ones
@Service
public class AdaptiveLlmService {

    private final ChatClient.Builder clientBuilder;
    
    public String chat(String message, QueryComplexity complexity) {
        String model = switch (complexity) {
            case SIMPLE   -> "gpt-4o-mini";      // $0.00015/1K input tokens
            case MODERATE -> "gpt-4o-mini";      // Same — 4o-mini handles most cases well
            case COMPLEX  -> "gpt-4o";           // $0.005/1K input — 33× more expensive
            case ANALYSIS -> "claude-3-5-sonnet";// Best for long document analysis
        };
        
        return clientBuilder.build().prompt()
            .user(message)
            .options(OpenAiChatOptions.builder().withModel(model).build())
            .call()
            .content();
    }
    
    // Classify query complexity before routing
    public QueryComplexity classify(String message) {
        if (message.length() < 200 && !message.contains("analyse") 
                && !message.contains("compare")) {
            return QueryComplexity.SIMPLE;
        }
        return QueryComplexity.COMPLEX;
    }
}
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ Public endpoint, no rate limiting, no budget
@PostMapping("/chat")  // No auth, no rate limit, no cost cap
public String chat(@RequestBody String message) {
    return chatClient.prompt().user(message).call().content();
}
// → One curl loop can cost thousands of dollars overnight
```

```java
// ✅ Protected endpoint with auth + rate limit + token budget
@PostMapping("/chat")
@PreAuthorize("isAuthenticated()")  // Auth required
public String chat(
    @AuthenticationPrincipal UserDetails user,
    @RequestBody @Valid ChatRequest request
) {
    String userId = user.getUsername();
    String tier   = userService.getTier(userId);
    
    rateLimitedLlm.check(userId, tier);                        // Rate limit check
    tokenBudgetService.checkAndReserve(userId, 1000);          // Budget check
    return costTrackedLlm.chat(userId, request.message());     // Tracked call
}
```

---

## 7. Scale Evolution

**Prototype →** Resilience4j `RateLimiter` per userId; log token usage to console; single model.

**Production →** Redis token budget with daily TTL; model tiering (mini for simple, full for complex); 429 responses with `Retry-After`; Micrometer counter on `llm.budget.exceeded` and `llm.rate.limited`.

**High scale →** Centralised quota service (microservice) instead of Redis per-instance; prepaid credit model for enterprise users; predictive budget alerts (email when user hits 80% daily budget); cost anomaly detection (alert if any single user generates > $10 in one hour).

---

## 8. Company Relevance

| Company | Cost control relevance | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial APIs — LLM cost is an operational cost like infrastructure | Token budget per merchant; Resilience4j rate limiter on LLM endpoints |
| Swiggy / Meesho | High volume consumer app — millions of users, small margins | Aggressive model tiering; semantic cache first; tight per-user limits |
| Adobe / Microsoft | Creative tools — users may send large documents (1M token context) | Input token limit (reject > 50K tokens); tiered pricing matched to product plans |
| SAP Labs | B2B SaaS — cost must be predictable for enterprise contracts | Monthly token budget per customer org; usage dashboard; overage alerts |

---

## 9. Interview Questions & Model Answers

### Q1 — How do you prevent runaway LLM API costs?
**Hruday:**
> "Four layers. First, authentication on every LLM endpoint — no public access. Second, per-user rate limiting via Resilience4j RateLimiter — returns 429 with Retry-After header before the request hits the LLM. Third, daily token budget tracked in Redis — I estimate tokens upfront, reserve them, then correct with actual usage from the response metadata; if the user's budget is exhausted they get a clear message with reset time. Fourth, model tiering — I route simple single-turn queries to GPT-4o-mini which is 33× cheaper than GPT-4o; only complex analytical queries hit the expensive model. Together these reduce per-feature LLM spend by 60-80% compared to a naïve 'just call the best model for everything' approach."

---

*Part 21 · Rate Limiting and Cost Control for LLM APIs · Full Stack Interview Guide · Hruday D · 2026*
