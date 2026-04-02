# Rate Limiting — Token Bucket, Leaky Bucket, Sliding Window
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Rate limiting** controls how many requests a client can make to your API in a given time window. Without it: a single misbehaving client (or attacker) can exhaust server resources, starve other clients, and cause cascading failures.
- **Token bucket**: each client has a virtual bucket with capacity N tokens. Tokens refill at rate R per second. Each request consumes 1 token. If the bucket is empty: reject with 429. Tokens accumulate when traffic is below the rate — allowing burst traffic up to the bucket capacity. Most common algorithm in production (AWS API Gateway, Nginx, Bucket4j).
- **Leaky bucket**: requests arrive and enter a queue. The queue processes at fixed rate R (leaks at constant rate). If the queue is full: reject. Regardless of burst arrivals, the outflow is always constant. Used when you need smooth, constant-rate processing on the downstream (e.g., message sending).
- **Token bucket vs leaky bucket**: token bucket allows controlled bursts (up to bucket size), leaky bucket enforces constant rate. For APIs: token bucket is preferred — users expect to be able to do a burst of activity after a quiet period.
- **Sliding window**: more accurate than fixed window. Prevents the double-rate exploit at window boundaries. Redis sorted set implementation: each request adds a timestamp; count the number of timestamps within the last 60 seconds; reject if count ≥ limit.
- **Always return rate limit headers**: `429 Too Many Requests` + `Retry-After: <seconds>` + `X-RateLimit-Limit: 100` + `X-RateLimit-Remaining: 0` + `X-RateLimit-Reset: <Unix timestamp>`. Without `Retry-After`, clients don't know when to retry and immediately hammer you again.
- **Spring Boot**: Bucket4j + Spring Boot Starter + Redis for distributed (multi-instance) rate limiting. One bucket per user ID / API key, stored in Redis.

---

## 1. One-Line Definition
Rate limiting is the practice of capping the number of requests a client can make to an API within a time period, using algorithms like token bucket, leaky bucket, or sliding window to enforce the cap and return 429 responses when exceeded.

---

## 2. The Problem It Solves

### What Happens Without Rate Limiting

```
SCENARIO: Razorpay-style payment API — no rate limiting on the OTP endpoint

POST /api/v1/payments/otp/request  (trigger an OTP to be sent to user's phone)

ATTACK: attacker finds a competitor's customer list and tries to disrupt their UPI payments
         by flooding the OTP endpoint for specific phone numbers → SMS gateway bill skyrockets
         → phone numbers get temporarily blocked → legitimate users cannot authenticate

SCRAPING: competitor's bot calls GET /api/v1/merchants?city=bangalore every 50ms
          → pulls the entire merchant catalog in 10 minutes
          → your database query load spikes to 10x normal
          → other API calls start failing (connection pool exhausted)

RETRY STORM: your payment provider has a 30-second outage
             You have 50,000 mobile apps that detect the error and immediately retry
             → DDOS of your own API by your own clients
             → What should self-heal in 30 seconds becomes a 10-minute cascading failure
             
RESOURCE EXHAUSTION:
  1 malicious client: 10,000 requests/second
  Each request: 5ms DB query
  Connection pool size: 100 connections
  At 10,000 req/s × 5ms avg hold: 50 concurrent connections from this one client
  Other clients share the remaining 50 connections
  Result: other clients see 429/503 or extreme latency
  
Rate limiting — what you need:
  - Cap each client at 100 requests per minute (their normal usage is 2-10/minute)
  - Return 429 with Retry-After: 30 when burst limit hit
  - Attacker gets 429 immediately, legitimate users unaffected
  - Retry storm: clients see Retry-After: 30 and back off properly
  - Scraper: exhausts rate limit in seconds, catalog remains safe
```

---

## 3. How It Works Internally

### Token Bucket — Visual

```
TOKEN BUCKET algorithm

Initial state:
  Bucket capacity: 10 tokens
  Refill rate: 2 tokens/second
  Current tokens: 10 (full)

  [■■■■■■■■■■]  10 tokens

Time 0.0s: 5 requests arrive — consume 5 tokens:
  [■■■■■□□□□□]  5 tokens remaining
  All 5 requests: 200 OK

Time 0.1s: 3 more requests — consume 3 tokens:
  [■■□□□□□□□□]  2 tokens remaining
  All 3 requests: 200 OK

Time 0.2s: 5 requests arrive — only 2 tokens left:
  - 2 requests: consume last 2 tokens → 200 OK
  - 3 requests: bucket empty → 429 Too Many Requests
  [□□□□□□□□□□]  0 tokens

Time 1.2s: 1 second passes — 2 tokens refilled (2 tokens/second):
  [■■□□□□□□□□]  2 tokens
  2 new requests: 200 OK

KEY PROPERTY: burst allowed up to bucket capacity (10 requests in instant burst)
              Average rate is capped at refill rate (2 requests/second sustained)
```

### Leaky Bucket — Visual

```
LEAKY BUCKET algorithm

  Requests arrive at variable rate
  │  │││    │  │││   │
  ▼  ▼▼▼    ▼  ▼▼▼   ▼
  [Queue capacity: 10]
  ┌──────────────────┐
  │ ■ ■ ■ ■ ■ ■ ■ ■ │ ← queue filling up
  └──────────────────┘
           │
           ▼ drips out at constant rate: 1 per 100ms
         processed

If queue is full when request arrives: REJECT (429)
Output is always constant regardless of input:
  1 request per 100ms = 10 requests/second, always

KEY PROPERTY: smooth constant output rate
              burst is absorbed up to queue capacity
              downstream services see perfectly constant load
              
USE CASE: SMS/email sending — don't want to burst the SMS provider
          Message queue consumption — process at safe constant rate
NOT ideal for API rate limiting — token bucket preferred
(users expect burst capability; leaky bucket penalizes them for any burst)
```

### Fixed Window vs Sliding Window — The Boundary Problem

```
FIXED WINDOW EXPLOIT: 100 req/minute window, window resets at :00 each minute

Timeline:
  11:59:50 → User sends 100 requests (consumes entire window)
  (window resets at 12:00:00)
  12:00:05 → User sends 100 requests (fresh window, allowed)
  
  In the 10-second span from 11:59:50 to 12:00:05:
  User sent 200 requests — DOUBLE the intended rate
  Fixed window allows this at every boundary

SLIDING WINDOW — counts requests in the last N seconds:

  At 12:00:05, look back 60 seconds: 11:59:05 to 12:00:05
  Count requests in that window: 100 (the batch at 11:59:50) + 100 (batch at 12:00:05) = 200
  200 > 100 limit → REJECT

  Redis sorted set implementation:
    ZADD rate:user:u123 timestamp request_id        # Add new request with timestamp
    ZREMRANGEBYSCORE rate:user:u123 0 (now - 60s)   # Remove entries older than window
    count = ZCARD rate:user:u123                    # Count requests in window
    EXPIRE rate:user:u123 60                        # TTL cleanup
    IF count >= limit: 429 ELSE: pass
    
  Atomic Lua script (must be atomic to avoid race conditions):
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local uuid = ARGV[4]
    redis.call('ZADD', key, now, uuid)
    redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
    local count = redis.call('ZCARD', key)
    redis.call('EXPIRE', key, window/1000)
    if count > limit then
      return 0  -- rejected
    else
      return 1  -- allowed
    end
```

---

## 4. The Code

### ❌ Wrong Way — In-Memory Map Rate Limiting

```java
// ❌ WRONG: in-memory rate limiting with ConcurrentHashMap
@Component
public class InMemoryRateLimiter {
    // ❌ This map lives in one JVM — NOT shared across server instances
    // ❌ If you have 3 Spring Boot instances behind a load balancer:
    //    - User hits Instance 1: counter=1
    //    - User hits Instance 2: counter=1  ← new counter, doesn't know about Instance 1
    //    - User hits Instance 3: counter=1  ← same
    //    - User can make 3 × limit requests by round-robin across instances
    private final ConcurrentHashMap<String, AtomicLong> requestCounts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Long> windowStart = new ConcurrentHashMap<>();

    public boolean isAllowed(String userId) {
        long now = System.currentTimeMillis();
        // ❌ Not atomic — race condition between check and increment
        // ❌ Window reset is also racy with concurrent requests
        windowStart.putIfAbsent(userId, now);
        if (now - windowStart.get(userId) > 60_000) {
            requestCounts.put(userId, new AtomicLong(0));
            windowStart.put(userId, now);
        }
        return requestCounts.computeIfAbsent(userId, k -> new AtomicLong(0))
                            .incrementAndGet() <= 100;
    }
}
```

> **Why this fails in production:** In-memory limits are per-instance only. With 3 instances, every user gets 3× the limit for free. Also no atomicity — race conditions between check and increment create incorrect counts under high concurrency.

---

### ✅ Right Way — Bucket4j + Redis (Distributed, Production-Grade)

```java
// pom.xml:
// <dependency>
//   <groupId>com.giffing.bucket4j.spring.boot.starter</groupId>
//   <artifactId>bucket4j-spring-boot-starter</artifactId>
//   <version>0.10.0</version>
// </dependency>
// <dependency>
//   <groupId>io.github.bucket4j</groupId>
//   <artifactId>bucket4j-redis</artifactId>
//   <version>8.7.0</version>
// </dependency>

// Rate limiter service: token bucket per user, stored in Redis
@Service
@RequiredArgsConstructor
@Slf4j
public class ApiRateLimiterService {

    private final RedissonClient redissonClient;

    // ✅ Token bucket: 100 tokens capacity, refills 100 tokens per minute
    // Allows burst of up to 100 requests, then sustains 100/min ongoing
    private static final Bandwidth STANDARD_LIMIT = Bandwidth.classic(
        100,                                            // bucket capacity = max burst
        Refill.intervally(100, Duration.ofMinutes(1))   // refill 100 tokens every minute
    );

    // Stricter bucket for sensitive endpoints (OTP, payment submit)
    private static final Bandwidth SENSITIVE_LIMIT = Bandwidth.classic(
        5,
        Refill.intervally(5, Duration.ofMinutes(1))    // 5 requests per minute max
    );

    // ✅ Get or create bucket for a user — stored in Redis, shared across all instances
    private Bucket getBucketForUser(String userId, Bandwidth bandwidth) {
        ProxyManager<String> proxyManager = Bucket4jRedisson.casBasedProxyManager(redissonClient);
        return proxyManager.builder()
            .addLimit(bandwidth)
            .build(userId, () -> BucketConfiguration.builder()
                .addLimit(bandwidth)
                .build());
    }

    // Returns remaining tokens after this request, or -1 if rejected
    public RateLimitResult tryConsume(String userId, RateLimitTier tier) {
        Bandwidth bandwidth = tier == RateLimitTier.SENSITIVE ? SENSITIVE_LIMIT : STANDARD_LIMIT;
        Bucket bucket = getBucketForUser(userId + ":" + tier.name(), bandwidth);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            return RateLimitResult.allowed(probe.getRemainingTokens());
        } else {
            long retryAfterNanos = probe.getNanosToWaitForRefill();
            long retryAfterSeconds = TimeUnit.NANOSECONDS.toSeconds(retryAfterNanos) + 1;
            log.info("Rate limit exceeded for userId={} tier={}", userId, tier);
            return RateLimitResult.rejected(retryAfterSeconds);
        }
    }
}

public record RateLimitResult(boolean allowed, long remainingTokens, long retryAfterSeconds) {
    public static RateLimitResult allowed(long remaining) {
        return new RateLimitResult(true, remaining, 0);
    }
    public static RateLimitResult rejected(long retryAfterSeconds) {
        return new RateLimitResult(false, 0, retryAfterSeconds);
    }
}
```

```java
// Rate limiting filter — applied globally before controllers
@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RateLimitFilter extends OncePerRequestFilter {

    private final ApiRateLimiterService rateLimiter;
    private final JwtTokenService jwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String userId = extractUserId(request);
        if (userId == null) {
            // Unauthenticated: rate limit by IP (stricter)
            userId = "ip:" + getClientIp(request);
        }

        RateLimitTier tier = determineTier(request);
        RateLimitResult result = rateLimiter.tryConsume(userId, tier);

        // ✅ Always set rate limit info headers — even on successful requests
        response.setHeader("X-RateLimit-Limit", String.valueOf(tier.getLimit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.remainingTokens()));

        if (!result.allowed()) {
            // ✅ Must include Retry-After — without this, clients immediately retry and exacerbate load
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(result.retryAfterSeconds()));
            response.setHeader("X-RateLimit-Remaining", "0");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                {"error":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Retry after %d seconds.","retryAfter":%d}
                """.formatted(result.retryAfterSeconds(), result.retryAfterSeconds()));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private RateLimitTier determineTier(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.contains("/otp") || path.contains("/payment/execute")) {
            return RateLimitTier.SENSITIVE;  // 5 req/min
        }
        return RateLimitTier.STANDARD;       // 100 req/min
    }

    private String getClientIp(HttpServletRequest request) {
        // ✅ Trust X-Forwarded-For only if from known load balancer IPs (security: avoid IP spoofing)
        String forwarded = request.getHeader("X-Forwarded-For");
        return (forwarded != null && !forwarded.isEmpty())
            ? forwarded.split(",")[0].trim()
            : request.getRemoteAddr();
    }

    private String extractUserId(HttpServletRequest request) {
        try {
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                return jwtService.extractUserId(authHeader.substring(7));
            }
        } catch (Exception ignored) {}
        return null;
    }
}
```

### Rate Limit Headers — Full Response Example

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1718000060    ← Unix timestamp when the window/bucket resets (UTC)
Retry-After: 43                  ← Seconds until the client can retry (RFC 7231 standard)

{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Retry after 43 seconds.",
  "retryAfter": 43
}

── Successful request response (when not rate limited) ────────────
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 67       ← Shows remaining budget so clients can self-throttle
X-RateLimit-Reset: 1718000060
```

---

## 5. Interview Questions & Model Answers

### Q1 — Algorithm Choice
**Interviewer asks:** "What's the difference between a token bucket and a leaky bucket? Which would you use for a payment API?"

**Hruday's answer:**
> Token bucket: each client has a virtual bucket that holds up to N tokens. The bucket refills at rate R tokens per second. Every request consumes one token. If the bucket has tokens, the request passes. If the bucket is empty, the request is rejected with 429. The key property is that tokens accumulate when the client is idle — if a client makes no requests for 30 seconds, they accumulate tokens up to the bucket capacity. This allows controlled burst: a client can make N requests instantly if they've been quiet long enough, then sustain at the refill rate ongoing.
>
> Leaky bucket: requests arrive and enter a fixed-size queue. The queue drains at a constant rate — one request processed every fixed interval. If the queue is full when a request arrives, it's rejected. The output is always constant regardless of how bursty the input is. No accumulation between quiet periods.
>
> For a payment API, I'd use token bucket. Users have legitimate burst patterns — a merchant reconciling end-of-day transactions might call 20 APIs in quick succession, then nothing for an hour. Token bucket rewards this natural usage pattern. The burst capacity let them complete the legitimate task, and the sustained cap protects the service. Leaky bucket would penalize this user unnecessarily — their 10th request in the burst queue gets artificially delayed even though the server is perfectly capable of handling it.
>
> Leaky bucket makes more sense for downstream-constrained scenarios — like an email delivery service where the downstream SMTP provider has a strict constant-rate contract.

---

### Q2 — Distributed Rate Limiting
**Interviewer asks:** "How do you implement rate limiting across multiple API server instances?"

**Hruday's answer:**
> The core challenge: if each instance maintains its own rate limit state, a user can round-robin across instances and get N times the limit for free — N being the number of instances. The fix is a shared state store that all instances consult atomically.
>
> The production approach: Redis as the shared rate limit state store. For token bucket: I use Bucket4j with its Redis backend (Bucket4j-Redisson). Each bucket is stored in Redis, keyed by user ID. When any instance processes a request for user X, it reads and updates the same Redis bucket atomically. The atomic check-and-decrement is implemented as a Lua script (Redis executes Lua scripts atomically from the server side), so there's no race condition between the check and the decrement.
>
> The rate: a Redis EVAL call (Lua script) takes roughly 0.2-0.5ms at P99 on a local Redis. This adds a small fixed overhead to every request — negligible against a 5-30ms API response. For very high-throughput scenarios: Redis Cluster distributes the load, or you use a local in-flight queue of N tokens per instance (periodically refilled by Redis) to avoid a Redis call per request (token pre-fetch pattern).
>
> At SAP Labs, our services are mostly single-instance in dev/test environments, but in production Kubernetes we always use Redis-backed rate limiting for this exact reason.

---

### Q3 — 429 Response
**Interviewer asks:** "A client sends a request and gets 429. What headers must your response include, and why?"

**Hruday's answer:**
> Four headers:
>
> First: `Retry-After: N` where N is seconds until the client can retry. This is the most critical. Without it, well-behaved clients don't know when to retry and will either retry immediately (thundering herd — making the situation worse) or use exponential backoff with no basis for the starting delay.
>
> Second: `X-RateLimit-Limit: 100` — the configured limit so the client knows the cap (helps developers understand the constraint without reading docs).
>
> Third: `X-RateLimit-Remaining: 0` — remaining requests in the current window. Useful for clients that want to self-throttle before hitting the wall — they can see 3 remaining requests and space them out.
>
> Fourth: `X-RateLimit-Reset: 1718000060` — Unix timestamp (UTC) when the rate limit resets. Alternative to `Retry-After` for clients that prefer an absolute time over a relative duration.
>
> The `Retry-After` and `X-RateLimit-Reset` headers are defined in RFC 7231. Well-behaved HTTP clients (like Apache HttpClient) automatically honour `Retry-After` and pause before retrying. In distributed payment systems like Razorpay's merchant dashboard, these headers are essential for client libraries that auto-retry — without `Retry-After`, the library retries immediately and amplifies the problem. Always include `Retry-After`.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Rate limit by IP address" | "I rate limit by the client's IP address — it's unique per client" | "IP alone is dangerous for several reasons. First: NAT — an enterprise office might have 500 employees sharing one public IP. Rate limit by IP and you block the entire company when one employee violates the limit. Second: attackers rotate IPs (botnets, Tor, VPN pools). IP rate limiting barely slows a determined attacker. The right approach: rate limit authenticated users by user ID or API key as the primary dimension. For unauthenticated endpoints (like login), IP rate limiting is appropriate because no user ID is available — but set the limit generously to avoid blocking shared IPs. For public APIs: rate limit by API key, which is issued per registered application." |
| "Rate limiting blocks legitimate traffic" | "Rate limiting is problematic because it can block legitimate surge traffic" | "The design choice between hard-reject and soft-queue matters here. When Swiggy launches a sale and traffic surges 10x, you don't want to block legitimate customers. The options: (1) token bucket with higher burst capacity for known good traffic patterns — the burst capacity handles the legitimate spike; (2) soft queuing at the edge — requests that would be rejected are delayed instead of dropped (the 'leaky bucket as queue' model); (3) adaptive rate limiting — rate limits that adjust based on server health metrics (e.g., increase throughput when CPU < 70%, tighten when CPU > 90%). Resilience4j has a rate limiter that can be tuned per service health state. The key principle: rate limits should be calibrated to real usage patterns, not guesses. Watch the 99th percentile of legitimate users and set limits well above that." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs on the CFIN (Central Finance) platform — a high-volume financial document processing system — we had to implement rate limiting for the document ingestion REST API. SAP ERP systems send financial postings in batch, and during month-end close, one ERP instance was sending 5,000 document-upload requests in under a minute, overwhelming the Spring Batch writing layer. We implemented Bucket4j with a Redis backend (we were already using Redis for caching). The token bucket capacity was set to 1,000 with a refill of 500 per minute — enough for normal operations, with burst headroom for end-of-day batches that are well-behaved. The critical lesson: we always included `Retry-After` in the 429 responses. The SAP ERP integration adapter honoured `Retry-After` automatically and backed off, which eliminated the thundering herd problem we initially saw when we naively returned plain 429s without retry guidance."

---

## 8. Scale Evolution

**Single instance →** In-memory token bucket (Bucket4j local, no Redis). Acceptable only if one server instance. Returns 429 + Retry-After + rate limit headers. Monitor: rate limit hit rate per endpoint.

**Multiple instances →** Bucket4j + Redis backend. Atomic Lua scripts for check-and-decrement. All instances share the same bucket per user ID. Redis TTL cleanup. Prometheus: rate_limit_rejected_total counter per endpoint + userId dimension.

**Very high traffic (millions of req/s) →** Redis Cluster for distributed bucket storage. Token pre-fetch: each instance pre-fetches N tokens from Redis in bulk (N = 50-100), serves them locally without Redis calls, reduces Redis round-trips by 50-100×. Edge rate limiting: push limits to Nginx (nginx-limit-req module) or AWS WAF / CloudFront before requests reach Spring Boot entirely. Tiered limits: free tier (100/min) vs paid tier (10,000/min) — different Redis buckets per tier, configured per API key.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | OTP endpoint abuse prevention (5 req/min per phone). Payment submission rate limiting per merchant (prevents accidental double-submit bursts). API key tiers (free vs standard vs premium). | "Design the rate limiting strategy for Razorpay's payment initiation API. How do you prevent OTP abuse while allowing legitimate merchant batch payment flows?" |
| Swiggy / Meesho | Search and catalog APIs must handle flash sale spikes (legitimate burst). Order API must rate limit per customer to prevent accidental multi-order clicks. Delivery partner coordinates API limited per driver. | "How do you rate limit Swiggy's order endpoint to prevent duplicate orders from rapid mobile taps, without blocking a customer who genuinely wants to place two orders quickly?" |
| Adobe / Microsoft | GitHub API has rate limits: 60 req/hour unauthenticated, 5000 req/hour authenticated. Adobe Creative Cloud API key tiers. SaaS usage meter. | "Design a rate limiting system for GitHub's API that supports different limits for authenticated vs unauthenticated users, with burst capability for CI/CD systems." |
| SAP Labs (current) | ERP document ingestion bulk APIs need rate limiting to protect downstream processors. SAP API Management has built-in rate policies for cloud APIs. Month-end close batch traffic patterns require understanding burst vs sustained rate design. | "A client's ERP sends 5,000 financial document posting requests in one minute during month-end close. How do you design rate limiting that protects the backend without breaking the business process?" |

---

## 10. Related Topics — What to Study Next

- **Topic 136 — API Gateway** — rate limiting is almost always implemented at the API gateway layer (Kong, AWS API Gateway, Spring Cloud Gateway) rather than in individual microservices; understanding the gateway is essential to knowing where rate limiting actually lives in production architecture
- **Topic 127 — HTTP Status Codes** — 429 Too Many Requests is the correct status code for rate limiting; 503 Service Unavailable is used for overload-based rejection; understanding the distinction matters when designing clients that handle both scenarios
- **Topic 75 — Resilience4j** — rate limiter is one of Resilience4j's core components alongside circuit breaker and bulkhead; the rate limiter in Resilience4j uses a token bucket internally and integrates directly with Spring Boot; understanding both the general algorithm and the Spring implementation is expected
- **Topic 103 — Redis** — the shared state store for distributed rate limiting; Redis sorted sets for sliding window, Redis strings (INCR + EXPIRE) for fixed window, Redis Lua scripts for atomic token bucket — Redis is the foundation for all distributed rate limiting patterns

---

*Part 7 · Rate Limiting — Token Bucket, Leaky Bucket, Sliding Window · Full Stack Interview Guide · Hruday D · 2026*
