# Fallback Strategy When AI Is Unavailable — Graceful Degradation
> Part 22 — AI Integration Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **AI features will fail**: OpenAI has periodic outages; API keys hit rate limits; context windows overflow; billing limits get breached; the correct design makes the application useful even when AI is 100% unavailable
- **Two degradation levels**: (1) graceful degradation — non-AI fallback that serves most of the use case (rule-based or cached response); (2) full degradation — feature visibly unavailable with a clear message and ETA; never a 500 error
- **Resilience4j circuit breaker is the gatekeeper**: wraps LLM calls; opens when error rate > 50% in a 30s window; fallback method called immediately when circuit is open — zero wait, zero timeout; circuit tries to recover (half-open) after 30 seconds
- **Fallback types by feature**: support chat → static FAQ index (keyword search); code explanation → link to documentation; doc summary → extract first paragraph; content moderation → blocklist-only check + assume safe until AI recovers; product recommendation → rule-based popular items; semantic search → keyword tsvector search
- **Communicate AI status to users**: when the AI feature degrades, display a subtle indicator ("Using simplified mode") rather than silently serving worse results; users accept degraded quality when they know why; they blame the product when they don't
- **Semantic cache as implicit fallback**: frequently asked questions already cached in the vector store; cache hits serve instantly even when the LLM is completely down — this is a very effective natural fallback for read-heavy AI features

---

## 1. One-Line Definition
AI graceful degradation means every LLM-powered feature has a defined fallback that provides reduced but functional service when the LLM API is unavailable — ensuring AI outages don't cascade into product-wide failures.

---

## 2. Fallback Catalogue

```
FEATURE              → PRIMARY (AI)           → FALLBACK (non-AI)
──────────────────────────────────────────────────────────────────
Support chatbot      → RAG + LLM answer       → Keyword FAQ search
Code completion      → LLM suggestion         → Template snippets
Doc summarisation    → LLM summary            → First paragraph extraction
Product recs         → LLM + embedding recs   → Bestsellers by category
Content moderation   → LLM classification     → Blocklist-only (conservative)
Semantic search      → Vector similarity      → BM25 keyword search
Structured extract   → LLM entity()           → Regex pattern extraction
Meeting scheduling   → Agent booking          → Google Calendar link
```

---

## 3. Circuit Breaker + Fallback

```java
@Service
public class ChatService {

    private final ChatClient chatClient;
    private final FaqKeywordSearchService faqSearch;
    private final SemanticCacheService semanticCache;
    
    @CircuitBreaker(
        name = "llm-chat",
        fallbackMethod = "fallbackChat"
    )
    public String chat(String sessionId, String userId, String message) {
        // Check semantic cache first — works even when LLM is down
        // (cache uses vector store, not LLM)
        Optional<String> cached = semanticCache.get(message, "support_chat");
        if (cached.isPresent()) {
            return cached.get();
        }
        
        // LLM call — wrapped by circuit breaker
        return ragService.answer(sessionId, userId, message);
    }
    
    // Called when circuit is open OR when LLM throws
    public String fallbackChat(String sessionId, String userId, 
                                String message, Exception e) {
        log.warn("LLM unavailable for chat. userId={} Falling back to keyword FAQ. cause={}",
            userId, e.getClass().getSimpleName());
        
        // Non-AI fallback: keyword FAQ search
        List<FaqEntry> faqs = faqSearch.search(message);
        
        if (!faqs.isEmpty()) {
            return "Based on our FAQ:\n\n" + faqs.get(0).answer() + 
                "\n\n[Using simplified mode — AI assistant temporarily unavailable]";
        }
        
        return "I'm temporarily unable to assist. Please contact " +
               "support@company.com or call +91-80-XXXXXXX. " +
               "[AI assistant temporarily unavailable — estimated recovery: 15 minutes]";
    }
}
```

---

## 4. Multi-Level Fallback for Search

```java
@Service
public class SearchService {

    private final VectorStore vectorStore;        // pgvector (separate from LLM)
    private final JdbcTemplate jdbcTemplate;       // keyword fallback

    // Level 1: Semantic vector search (always preferred)
    // Level 2: pgvector often still works when LLM API is down (pgvector is local)
    // Level 3: SQL keyword search — last resort

    public List<SearchResult> search(String query) {
        try {
            // Vector search — pgvector is independent of OpenAI API
            // Only embedding model call fails when OpenAI is down
            List<Float> embedding = embeddingModel.embed(query);
            return toResults(vectorStore.similaritySearch(
                SearchRequest.query(query).withTopK(10)
            ));
        } catch (Exception vectorEx) {
            log.warn("Vector search failed. Falling back to keyword search.", vectorEx);
            return keywordSearch(query);
        }
    }
    
    private List<SearchResult> keywordSearch(String query) {
        // BM25 via Postgres tsvector — completely independent of OpenAI
        return jdbcTemplate.query("""
            SELECT id, title, snippet
            FROM products
            WHERE ts_content @@ plainto_tsquery('english', ?)
            ORDER BY ts_rank(ts_content, plainto_tsquery('english', ?)) DESC
            LIMIT 10
            """, (rs, row) -> new SearchResult(
                rs.getString("id"),
                rs.getString("title"),
                rs.getString("snippet")
            ), query, query);
    }
}
```

---

## 5. Feature Flag Integration

```java
// Use feature flags to instantly disable AI features under load
// or during incidents — without deployment
@Service
public class AiFeatureService {

    private final UnleashClient unleash;  // or LaunchDarkly, Spring Boot featureflags
    
    public String getResponse(String userId, String message) {
        boolean aiEnabled = unleash.isEnabled("ai-chat-feature", 
            Context.builder().userId(userId).build());
        
        if (!aiEnabled) {
            // Maintenance mode: feature flag set to off by ops team
            return faqSearch.answer(message) + " [AI features temporarily paused for maintenance]";
        }
        
        return chatService.chat(userId, message);
    }
}
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ No fallback — AI outage = product outage
@PostMapping("/api/chat")
public String chat(@RequestBody ChatRequest req) {
    return llmService.call(req.message());  // No circuit breaker, no fallback
    // → LLM is down → 503/500 → user sees error → support tickets spike
}
```

```java
// ❌ Silent degradation — serving worse results without telling the user
@CircuitBreaker(name = "llm", fallbackMethod = "silentFallback")
public String chat(String message) { return llm.call(message); }

public String silentFallback(String message, Exception e) {
    return "I can help with that!";  // Empty, unhelpful, but no error shown
    // → User thinks AI replied; gets nothing useful; loses trust
}
```

```java
// ✅ Transparent degradation with useful fallback
public String fallbackChat(String message, Exception e) {
    List<FaqEntry> results = faqKeywordSearch.search(message);
    if (!results.isEmpty()) {
        return results.get(0).answer() + 
               "\n\n[Using simplified mode — full AI assistant restoring shortly]";
    }
    return "I'm temporarily limited. Please try again in a few minutes or contact support.";
}
```

---

## 7. Circuit Breaker States (Micrometer visibility)

```java
// Expose circuit breaker state to Grafana
@Component
public class CircuitBreakerMetricsExporter {

    private final CircuitBreakerRegistry registry;
    private final MeterRegistry meterRegistry;
    
    @PostConstruct
    public void bind() {
        registry.circuitBreaker("llm-chat").getEventPublisher()
            .onStateTransition(event -> {
                String newState = event.getStateTransition().getToState().name();
                log.warn("Circuit breaker state change: {}", newState);
                Gauge.builder("ai.circuit.state")
                    .tag("state", newState)
                    .register(meterRegistry, this, t -> 
                        "OPEN".equals(newState) ? 1.0 : 0.0);
            });
    }
}
// Grafana alert: ai.circuit.state = 1 → PagerDuty notification
```

---

## 8. Scale Evolution

**Prototype →** Resilience4j `@CircuitBreaker` with basic fallback text; log when fallback is invoked.

**Production →** Feature-specific fallback (keyword search, first-paragraph, rule-based recs); semantic cache as natural fallback; user-visible "simplified mode" indicator; Grafana alert on circuit open.

**High scale →** Feature flag kill switch for instant AI feature disable during incidents; separate fallback service with pre-computed responses; SLO tracking for AI feature availability (target 99.5% including fallback as "available").

---

## 9. Company Relevance

| Company | Fallback relevance | Interview signal |
|---------|------------------|-----------------|
| Razorpay / PhonePe | Payment support chat — AI down cannot mean support is down | Keyword FAQ fallback; circuit breaker; never a 500 on AI features |
| Swiggy / Meesho | Product recommendation AI — fallback to bestsellers by category | Rule-based fallback; feature flag for category-specific AI enable/disable |
| Adobe / Microsoft | Creative AI tools — fallback to template library | Graceful "AI temporarily unavailable" with pre-generated alternatives |
| SAP Labs | ERP AI suggestions — fallback to rule-based GL code mapping | Conservative fallback: suggest empty + manual entry; audit log marks AI-unavailable |

---

## 10. Interview Questions & Model Answers

### Q1 — How do you design an AI feature that degrades gracefully when the LLM is unavailable?
**Hruday:**
> "Every AI feature I build has three layers. First, a semantic cache serves cached responses for frequent queries even when the LLM is completely down — by the second week of a feature being live, 40-60% of queries hit cache. Second, a Resilience4j circuit breaker wraps every LLM call: when error rate exceeds 50% in a 30-second window, it opens and the fallback method is called immediately — no waiting for timeouts. Third, each feature has a specific non-AI fallback: the support chatbot falls back to a keyword FAQ search, semantic search falls back to BM25 tsvector search, content moderation falls back to blocklist-only. When the fallback is active, I display a visible 'simplified mode' indicator — users accept lower quality when they understand why, but they distrust the product when they silently receive worse results. This means an OpenAI outage degrades some features but the application remains fully functional."

---

*Part 22 · Fallback Strategy When AI Is Unavailable — Graceful Degradation · Full Stack Interview Guide · Hruday D · 2026*
