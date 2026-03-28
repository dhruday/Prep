# AI as a Microservice — Isolating LLM Calls Behind a Service Boundary
> Part 22 — AI Integration Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why isolate AI behind its own service**: LLM calls have fundamentally different characteristics from regular API calls — 2-10 second latency, high per-call cost, third-party API dependency, token budgets, rate limits, model versioning; mixing these concerns into your main service makes it brittle and hard to operate
- **The AI microservice owns**: the LLM client, the prompt templates (versioned), the vector store connection, the embedding model, cost tracking, rate limiter, semantic cache, and fallback logic; nothing else touches these
- **Contract between AI service and caller**: simple REST endpoint — POST /api/ai/generate with `{feature, input, sessionId}` returns `{output, tokensUsed, modelUsed, cacheHit, latencyMs}`; the callers don't know or care what model is used; this is the key decoupling that lets you swap models or providers without changing callers
- **Resilience patterns at the boundary**: Resilience4j circuit breaker around all LLM API calls (open when > 50% error rate in 30s window); fallback = templated response or "AI temporarily unavailable" — never a 500 error; Retry with exponential backoff for 429 (rate limit) and 503 (provider outage)
- **Independent scaling**: LLM API calls are network-bound (waiting for the provider), not CPU-bound; the AI service runs with many virtual threads but few physical threads; it can scale independently from compute-bound services
- **Model versioning at the service boundary**: callers pass a `featureId` (e.g., `"support_chat"`, `"code_explain"`); the AI service maintains a feature→model mapping in config (`support_chat → gpt-4o-mini`, `code_explain → gpt-4o`); model upgrades = config change only, no deployment of callers

---

## 1. One-Line Definition
The AI microservice pattern isolates all LLM client code, prompt templates, vector stores, and cost controls behind a single service boundary — protecting the rest of your system from the high latency, cost variability, and operational complexity of LLM APIs.

---

## 2. What the AI Service Owns

```
ai-service/
├── LLM Client (Spring AI ChatClient, configured per provider)
├── Prompt Registry (versioned system prompts per feature)
├── VectorStore (pgvector / Pinecone — RAG retrieval)
├── EmbeddingModel (text-embedding-3-small)
├── SemanticCacheService (Redis / pgvector similarity cache)
├── TokenBudgetService (daily per-user / per-tenant limits)
├── RateLimiterService (Resilience4j per-user)
├── CostTrackingService (Micrometer counters by model + feature)
└── FallbackRegistry (canned responses per feature when AI unavailable)
```

---

## 3. Service Contract

```java
// AI Service API — what callers see
@PostMapping("/api/ai/generate")
public ResponseEntity<AiResponse> generate(@RequestBody AiRequest request) { ... }

// Request
public record AiRequest(
    String featureId,      // "support_chat", "code_explain", "doc_summary"
    String input,          // User message / content to process (sanitised by caller)
    String sessionId,      // For conversation memory (optional)
    String userId,         // For rate limiting and budget
    String tenantId        // For multi-tenant isolation (optional)
) {}

// Response
public record AiResponse(
    String output,         // The generated text
    String modelUsed,      // "gpt-4o-mini" — for audit; callers don't use this to branch
    long tokensUsed,       // Total tokens (for caller-side cost awareness)
    boolean cacheHit,      // Was this served from semantic cache?
    long latencyMs         // Total AI service processing time
) {}
```

---

## 4. Feature-to-Model Routing

```yaml
# application.yaml — change models without deploying callers
ai-service:
  feature-routing:
    support_chat:
      model: gpt-4o-mini
      max-tokens: 500
      temperature: 0.3
    code_explain:
      model: gpt-4o
      max-tokens: 1000
      temperature: 0.0
    doc_summary:
      model: gpt-4o-mini
      max-tokens: 300
      temperature: 0.0
    rag_query:
      model: gpt-4o-mini
      retrieval: true       # enable RAG pipeline for this feature
      rerank: true
```

```java
@Service
public class FeatureRoutingService {

    private final Map<String, FeatureConfig> featureConfigs;  // Loaded from yaml
    
    public AiResponse process(AiRequest request) {
        FeatureConfig config = featureConfigs.getOrDefault(
            request.featureId(), 
            FeatureConfig.defaults()
        );
        
        // Rate limit check
        rateLimiter.check(request.userId());
        // Budget check
        tokenBudget.checkAndReserve(request.userId(), estimateTokens(request.input()));
        // Semantic cache check
        Optional<String> cached = semanticCache.get(request.input(), request.featureId());
        if (cached.isPresent()) {
            return AiResponse.cached(cached.get());
        }
        
        // Route to correct pipeline
        if (config.isRetrieval()) {
            return ragPipeline.process(request, config);
        } else {
            return directLlmPipeline.process(request, config);
        }
    }
}
```

---

## 5. Resilience Configuration

```yaml
resilience4j:
  circuitbreaker:
    instances:
      openai-llm:
        sliding-window-size: 20
        failure-rate-threshold: 50       # Open circuit at 50% error rate
        wait-duration-in-open-state: 30s
        permitted-calls-in-half-open-state: 3
  
  retry:
    instances:
      openai-llm:
        max-attempts: 3
        wait-duration: 1s
        exponential-backoff-multiplier: 2
        retry-exceptions:
          - org.springframework.web.client.ResourceAccessException
          - io.github.resilience4j.ratelimiter.RequestNotPermitted
```

```java
@Service
public class ResilientLlmClient {

    private final ChatClient chatClient;
    private final FallbackRegistry fallbackRegistry;
    
    @CircuitBreaker(name = "openai-llm", fallbackMethod = "fallbackResponse")
    @Retry(name = "openai-llm")
    public String call(String featureId, String systemPrompt, String userInput) {
        return chatClient.prompt()
            .system(systemPrompt)
            .user(userInput)
            .call()
            .content();
    }
    
    // Called when circuit is open or retries exhausted
    public String fallbackResponse(String featureId, String systemPrompt, 
                                   String userInput, Exception e) {
        log.warn("LLM circuit open for feature={}. Returning fallback.", featureId, e);
        return fallbackRegistry.get(featureId);
        // e.g., "I'm temporarily unavailable. Please try again in a few minutes."
    }
}
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ LLM calls scattered across multiple services
// OrderService directly calls OpenAI
@Service
class OrderService {
    ChatClient chatClient;  // LLM client in a business service
    public String summariseOrder(Order o) { return chatClient.prompt()...call().content(); }
}

// SupportService also calls OpenAI directly
@Service
class SupportService {
    ChatClient chatClient;  // Duplicate — no shared rate limiting, no central cache
    public String answer(String q) { return chatClient.prompt()...call().content(); }
}
// → Each service has its own rate limiters, cost tracking, prompt versions
// → A model change requires deployment of every service that calls OpenAI
// → No central visibility into total LLM spend or usage patterns
```

```java
// ✅ All LLM calls go through the AI service
// OrderService and SupportService call ai-service:
AiResponse response = aiServiceClient.post()
    .uri("/api/ai/generate")
    .bodyValue(new AiRequest("order_summary", orderText, null, userId, tenantId))
    .retrieve()
    .bodyToMono(AiResponse.class)
    .block();
// → Single point: model routing, rate limiting, cost tracking, semantic cache, fallbacks
// → Model change = update ai-service config; all callers unaffected
```

---

## 7. Scale Evolution

**Prototype →** AI service as a separate Spring Boot module; shared LLM client; basic feature routing.

**Production →** Independent deployable service; Resilience4j circuit breaker + retry; semantic cache; cost tracking by feature; fallback responses per feature.

**High scale →** Horizontal scaling with stateless design (session memory in Redis); async streaming via SSE (proxy SSE response from AI service to caller); dedicated AI service instance per model tier (one for GPT-4o, one for GPT-4o-mini); SLA monitoring on AI service latency with per-feature SLO.

---

## 8. Company Relevance

| Company | AI microservice value | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Finance platform with strict service isolation; LLM costs must be centralised | Single AI service billing; circuit breaker prevents LLM outage cascading to payments |
| Swiggy / Meesho | Multiple product teams (search, support, personalisation) sharing LLM | Shared rate limits and cost tracking; model routing per feature |
| Adobe / Microsoft | Enterprise product with compliance — all AI calls must be auditable centrally | Centralised prompt version audit; request logging |
| SAP Labs | SAP BTP (Business Technology Platform) service architecture | AI service as a BTP microservice; central token budget per customer org |

---

## 9. Interview Questions & Model Answers

### Q1 — How do you integrate AI into a microservices architecture?
**Hruday:**
> "I create a dedicated AI microservice that owns everything LLM-related: the Spring AI ChatClient configuration, prompt templates (versioned in a registry), the vector store connection, semantic cache, rate limiting, token budgets, cost tracking, and fallback responses. Every other service calls this AI service via REST — they pass a featureId and input; they get back output, model used, and tokens consumed. This decoupling means a model swap from GPT-4o to Claude is a config change in the AI service — no deployment of the 6 services that call it. For resilience, I wrap all LLM calls in a Resilience4j circuit breaker: when the provider is down or rate-limiting us, the circuit opens and fallback responses are returned rather than cascading timeouts. The AI service scales independently from the business services — LLM calls are network-bound, so many virtual threads with few platform threads is the right resource model."

---

*Part 22 · AI as a Microservice — Isolating LLM Calls Behind a Service Boundary · Full Stack Interview Guide · Hruday D · 2026*
