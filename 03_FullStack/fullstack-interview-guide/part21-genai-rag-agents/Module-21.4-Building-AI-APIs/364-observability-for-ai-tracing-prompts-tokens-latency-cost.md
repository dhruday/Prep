# Observability for AI — Tracing Prompts, Tokens, Latency, Cost
> Part 21 — Generative AI for Full Stack Engineers · Building AI APIs
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **LLM observability has three dimensions** beyond normal application observability: (1) LLM-specific metrics (token counts, model name, finish reason); (2) prompt traceability (which system prompt + user message produced which response, for debugging regressions when the model updates); (3) cost attribution (token × price = dollar amount per request, per user, per feature, per day)
- **Spring AI + Micrometer**: Spring AI auto-emits `gen_ai.*` metrics via Micrometer — `gen_ai.client.token.usage` (prompt_tokens and completion_tokens as tags), `gen_ai.client.operation.duration` (LLM call latency), and vector store metrics; zero code needed for these to appear in Prometheus + Grafana
- **Prompt tracing with distributed tracing**: add a `trace_id` to every LLM call metadata; log `{traceId, userId, promptHash, inputTokens, outputTokens, model, latency, finishReason, cost}` as a structured log line; correlate with your APM tool (Zipkin, Jaeger, OpenTelemetry)
- **Cost tracking formula**: `cost = (inputTokens × inputPrice) + (outputTokens × outputPrice)`; track this per-request and aggregate by user, feature, and model; set a Grafana alert on daily spend > threshold
- **Finish reason tells you what happened**: `STOP` = normal completion; `LENGTH` = hit max_tokens limit (truncated response — increase limit or reduce prompt); `CONTENT_FILTER` = safety filter triggered; `FUNCTION_CALL` = agent called a tool; monitor `LENGTH` rate — high rate means responses are being cut off
- **Prompt versioning**: give every system prompt a version tag (e.g., `v3.2`); log which prompt version produced each response; when quality degrades after a model update, check if a specific prompt version is the common factor

---

## 1. One-Line Definition
AI observability means tracking token usage, LLM call latency, cost per request, prompt versions, and finish reasons — providing the visibility needed to debug quality regressions, control spend, and ensure SLA compliance for AI-powered features.

---

## 2. What to Measure

```
AI OBSERVABILITY DIMENSIONS
│
├── OPERATIONAL METRICS (Micrometer / Prometheus)
│   ├── gen_ai.client.operation.duration  (p50, p95, p99 LLM call latency)
│   ├── gen_ai.client.token.usage         (promptTokens, completionTokens by model)
│   ├── vectorstore.query.duration        (similarity search latency)
│   └── vectorstore.query.results         (number of chunks returned)
│
├── COST METRICS (custom Micrometer counters)
│   ├── ai.cost.per_request_usd           (histogram)
│   ├── ai.cost.daily_total_usd           (gauge, reset daily)
│   └── ai.cost.by_feature_usd            (counter with feature tag)
│
├── QUALITY METRICS
│   ├── llm.finish_reason                 (STOP / LENGTH / CONTENT_FILTER / FUNCTION_CALL)
│   ├── llm.cache.hit_rate               (semantic cache)
│   └── rag.retrieval.chunk_count        (how many chunks retrieved per query)
│
└── PROMPT TRACEABILITY
    ├── Prompt version tag on each request
    ├── Prompt hash (SHA256 of system prompt) for change detection
    └── Full prompt logging to secure audit store (PII stripped)
```

---

## 3. Spring AI Auto-Metrics (Zero Code)

```yaml
# application.yaml — enable Spring AI observability
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
  
management:
  endpoints:
    web:
      exposure:
        include: health, metrics, prometheus
  metrics:
    tags:
      application: ${spring.application.name}
```

```java
// Spring AI emits these metrics AUTOMATICALLY via Micrometer:
// - gen_ai.client.operation.duration{gen_ai.system="openai", gen_ai.operation.name="chat", model="gpt-4o-mini"}
// - gen_ai.client.token.usage{gen_ai.system="openai", token.type="input", model="gpt-4o-mini"}  
// - gen_ai.client.token.usage{gen_ai.system="openai", token.type="output", model="gpt-4o-mini"}

// These flow into your existing Prometheus scrape + Grafana dashboard
// No additional code required.
```

---

## 4. Custom Cost Tracking

```java
@Service
public class LlmCostTrackingService {

    // GPT-4o pricing (as of 2025 — always check current pricing)
    private static final Map<String, double[]> PRICING = Map.of(
        "gpt-4o",        new double[]{0.005, 0.015},   // input, output per 1K tokens
        "gpt-4o-mini",   new double[]{0.00015, 0.0006},
        "gpt-4o-batch",  new double[]{0.0025, 0.0075}
    );
    
    private final MeterRegistry meterRegistry;
    
    public double recordCost(String model, String feature, long inputTokens, long outputTokens) {
        double[] prices = PRICING.getOrDefault(model, new double[]{0.005, 0.015});
        double cost = (inputTokens * prices[0] / 1000.0) + (outputTokens * prices[1] / 1000.0);
        
        // Per-request cost histogram
        DistributionSummary.builder("ai.cost.per_request_usd")
            .tag("model", model)
            .tag("feature", feature)
            .register(meterRegistry)
            .record(cost);
        
        // Running daily total
        Counter.builder("ai.cost.total_usd")
            .tag("model", model)
            .tag("feature", feature)
            .tag("day", LocalDate.now().toString())
            .register(meterRegistry)
            .increment(cost);
        
        return cost;
    }
}

// Weave into the LLM service
@Service
public class ObservableLlmService {

    public String chat(String userId, String feature, String message) {
        long start = System.currentTimeMillis();
        
        ChatResponse chatResponse = chatClient.prompt()
            .user(message)
            .call()
            .chatResponse();
        
        // Extract usage from response
        Usage usage = chatResponse.getMetadata().getUsage();
        String finishReason = chatResponse.getResult().getMetadata().getFinishReason();
        
        // Record cost
        costTracker.recordCost(
            "gpt-4o-mini", feature, 
            usage.getPromptTokens(), 
            usage.getGenerationTokens()
        );
        
        // Structured log line for per-request traceability
        log.info("llm_call feature={} userId={} model=gpt-4o-mini " +
                 "inputTokens={} outputTokens={} latencyMs={} finishReason={} traceId={}",
            feature, userId,
            usage.getPromptTokens(), usage.getGenerationTokens(),
            System.currentTimeMillis() - start,
            finishReason,
            MDC.get("traceId"));
        
        // Alert on truncated responses
        if ("LENGTH".equals(finishReason)) {
            log.warn("Response truncated for userId={} feature={}", userId, feature);
            Counter.builder("ai.finish_reason.length").register(meterRegistry).increment();
        }
        
        return chatResponse.getResult().getOutput().getContent();
    }
}
```

---

## 5. Prompt Version Tracking

```java
// Every system prompt has a version
public class PromptRegistry {

    private static final String SUPPORT_PROMPT_VERSION = "support-v3.2";
    
    public static final String SUPPORT_SYSTEM_PROMPT = """
        You are a customer support assistant for Hruday Commerce.
        [... prompt content ...]
        """;
    
    // On each call, add version to MDC so it appears in every log line
    public void setContext(String promptVersion) {
        MDC.put("promptVersion", promptVersion);
    }
}

// Grafana query: break down LLM error rate by promptVersion
// → When model updates cause quality degradation, which prompt version is affected?
// → Were specific prompt versions fine while others regressed?
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ No observability — flying blind
public String chat(String message) {
    return chatClient.prompt().user(message).call().content();
    // No latency tracking, no token counts, no cost, no way to debug regressions
}
```

```java
// ✅ Fully observable — every dimension tracked
public String chat(String userId, String feature, String message) {
    try (var ignored = tracer.startScopedSpan("llm.chat")) {
        ChatResponse response = chatClient.prompt().user(message).call().chatResponse();
        Usage usage = response.getMetadata().getUsage();
        
        costTracker.recordCost("gpt-4o-mini", feature, 
            usage.getPromptTokens(), usage.getGenerationTokens());
        
        log.info("llm feature={} userId={} tokens={}/{} finishReason={} traceId={}",
            feature, userId, 
            usage.getPromptTokens(), usage.getGenerationTokens(),
            response.getResult().getMetadata().getFinishReason(),
            MDC.get("traceId"));
        
        return response.getResult().getOutput().getContent();
    }
}
```

---

## 7. Scale Evolution

**Prototype →** Spring AI auto-metrics enabled; structured log line per LLM call; finish reason logging.

**Production →** Custom cost counter per model + feature; daily cost alert in Grafana (threshold: $50/day); prompt version tag in MDC; `LENGTH` finish reason alert (indicates prompt + output config needs tuning).

**High scale →** Distributed tracing (OpenTelemetry) correlated across frontend → API → LLM call; per-user cost attribution dashboard; anomaly detection on token usage spikes; LLM audit log (separate from application logs) with 90-day retention for GDPR investigations.

---

## 8. Company Relevance

| Company | Observability need | Interview signal |
|---------|------------------|-----------------|
| Razorpay / PhonePe | Cost attribution per payment product feature; regulatory audit logging | Structured log per LLM call; cost counter by feature |
| Swiggy / Meesho | LLM latency affecting search/recommendation UX at scale | p95 latency SLO on LLM calls; circuit break if p95 > 3s |
| Adobe / Microsoft | Prompt regression detection after model updates | Prompt version tracking; quality metric baselines |
| SAP Labs | Enterprise SLA on AI features; per-tenant cost reporting for billing | Per-tenant cost aggregation; daily report generation |

---

## 9. Interview Questions & Model Answers

### Q1 — How do you debug a quality regression after an LLM model update?
**Hruday:**
> "When a model updates silently — which happens with GPT-4o, all models are replaced at the provider without a version change — quality can regress without obvious errors. My defence is prompt version tracking: every system prompt has a version tag in MDC so it appears on every log line. After a suspected regression, I query my logs for the affected prompt version, compare response quality before and after the model update date, and check the finish reason distribution — specifically if LENGTH increased (responses getting cut off) or if structured output parsing is now failing more often. With Spring AI, Micrometer auto-emits LLM latency and token usage, so I also correlate quality changes with token count changes; if the model is producing significantly fewer output tokens for the same prompts, it's likely the model changed its brevity behaviour."

---

*Part 21 · Observability for AI — Tracing Prompts, Tokens, Latency, Cost · Full Stack Interview Guide · Hruday D · 2026*
