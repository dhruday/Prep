# Semantic Caching of LLM Responses — Vector Similarity Approach
> Part 21 — Generative AI for Full Stack Engineers · Building AI APIs
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Semantic cache answers similar questions without calling the LLM again**: "What are your opening hours?" and "When are you open?" map to the same answer; traditional exact-match Redis cache misses both; semantic cache hits the second by comparing embedding similarity
- **How it works**: on each request, embed the query → search vector store for similar past queries above a similarity threshold (e.g., 0.92) → cache hit: return stored answer; cache miss: call LLM, store query+answer in cache, return answer
- **Cost impact**: in a support chatbot, 50-60% of questions are semantically duplicates; caching cuts LLM API spend by 30-60% without degrading quality; semantic cache is the highest ROI optimisation before adding more infrastructure
- **Similarity threshold is the key tuning parameter**: too low (0.80) → cache hits on unrelated questions → wrong answers; too high (0.98) → effectively exact-match → misses semantically equivalent phrasing; 0.90-0.93 is the sweet spot for most FAQ/support use cases
- **Cache invalidation strategy**: mark cache entries with a `topicTag`; when product or policy changes, invalidate by tag not by individual entry; TTL-based fallback (7 days for stable facts, 1 day for volatile data like prices)
- **Spring AI integration**: `QuestionAnswerAdvisor` in Spring AI has a built-in semantic cache option; for custom control, build a `SemanticCacheService` wrapping your `VectorStore` — same vector store used for RAG can serve dual purpose as semantic cache

---

## 1. One-Line Definition
Semantic caching stores LLM query-answer pairs in a vector store and returns cached answers for semantically similar future queries above a cosine similarity threshold — cutting LLM API costs 30-60% with no quality degradation for repeated question patterns.

---

## 2. How the Pipeline Works

```
REQUEST FLOW WITH SEMANTIC CACHE
┌─────────────┐
│ User Query  │ "What time do you close on Sundays?"
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Embed query         │ → [0.23, -0.45, 0.67, ...] (1536 dims)
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│ Vector search in cache store            │
│ Find cached queries with similarity>0.92│
│                                         │
│ Found: "What are your Sunday hours?"    │
│ Similarity: 0.96 → CACHE HIT ✅         │
└──────┬──────────────────────────────────┘
       │ Cache hit                     │ Cache miss
       ▼                               ▼
┌──────────────┐              ┌────────────────────┐
│ Return stored│              │ Call LLM            │
│ answer       │              │ Get response        │
│ immediately  │              │ Store query+answer  │
└──────────────┘              │ in vector store     │
                              │ Return response     │
                              └────────────────────┘
```

---

## 3. Semantic Cache Service Implementation

```java
@Service
public class SemanticCacheService {

    private static final double SIMILARITY_THRESHOLD = 0.92;
    private static final String CACHE_COLLECTION = "llm_response_cache";
    
    private final VectorStore vectorStore;
    private final ChatClient chatClient;
    
    public String getCachedOrGenerate(String query, String context) {
        // Step 1: Search for semantically similar cached query
        List<Document> hits = vectorStore.similaritySearch(
            SearchRequest.query(query)
                .withTopK(1)
                .withSimilarityThreshold(SIMILARITY_THRESHOLD)
                .withFilterExpression("metadata['type'] == 'cache_entry'")
        );
        
        if (!hits.isEmpty()) {
            // CACHE HIT — return stored answer
            String cachedAnswer = (String) hits.get(0).getMetadata().get("answer");
            log.debug("Semantic cache hit. Similarity threshold met. Query: {}", query.substring(0, 60));
            cacheHitCounter.increment();
            return cachedAnswer;
        }
        
        // CACHE MISS — call LLM
        cacheMissCounter.increment();
        String answer = chatClient.prompt()
            .system(context)
            .user(query)
            .call()
            .content();
        
        // Store query + answer in cache
        storeInCache(query, answer);
        return answer;
    }
    
    private void storeInCache(String query, String answer) {
        Document cacheEntry = new Document(
            query,   // The document text that gets embedded
            Map.of(
                "answer", answer,
                "type", "cache_entry",
                "cached_at", Instant.now().toString(),
                // TTL handled by scheduled cleanup
                "expires_at", Instant.now().plusSeconds(604_800).toString() // 7 days
            )
        );
        vectorStore.add(List.of(cacheEntry));
    }
    
    // Scheduled cleanup of expired entries
    @Scheduled(cron = "0 0 2 * * *")  // 2 AM daily
    public void evictExpiredEntries() {
        Instant cutoff = Instant.now().minusSeconds(604_800); // 7 days
        vectorStore.delete(List.of(/* query expired entries */));
        log.info("Semantic cache eviction complete");
    }
}
```

---

## 4. Cache Invalidation by Topic

```java
@Service
public class CacheInvalidationService {

    private final VectorStore vectorStore;
    
    // When product pricing changes — invalidate all pricing-related cache entries
    public void invalidateByTopic(String topicTag) {
        // With pgvector: delete by metadata filter
        // vectorStore.delete with filter expression on topicTag
        log.info("Invalidating semantic cache for topic: {}", topicTag);
        // Implementation: tagged entries use metadata['topic'] = topicTag
        // Delete all documents where metadata['topic'] = topicTag
    }
    
    // Use: called from admin event or Kafka consumer
    // invalidateByTopic("pricing")       → all price-related cached answers gone
    // invalidateByTopic("store_hours")   → only hours answers gone
    // invalidateByTopic("all")           → full cache clear (rare)
}
```

---

## 5. Threshold Tuning Guide

| Threshold | Effect | Use case |
|-----------|--------|----------|
| 0.98+ | Near exact-match only | Safety-critical answers where paraphrase risk matters |
| 0.92-0.95 | Same intent, different phrasing | ✅ Default for FAQ, support chatbots, product descriptions |  
| 0.88-0.92 | Topic-similar (may differ in meaning) | Only for generic factual responses with no risk of wrong answer |
| < 0.88 | Too broad — related topic hits | ❌ Avoid for any user-facing response |

---

## 6. Wrong Way vs Right Way

```java
// ❌ Exact-match Redis cache — misses the entire semantic equivalence problem
@Cacheable(value = "llm-responses", key = "#query")
public String answer(String query) {
    return callLlm(query);
}
// "opening hours" and "when are you open" are DIFFERENT cache keys
// → two separate LLM calls for the same answer
```

```java
// ✅ Semantic cache — catches equivalent questions regardless of phrasing
public String answer(String query) {
    return semanticCacheService.getCachedOrGenerate(query, SYSTEM_CONTEXT);
}
// "opening hours" → embedded → similarity search → hits "when are you open?" entry → cached answer returned
```

---

## 7. Spring AI Advisor Pattern

```java
// Spring AI has built-in cache support within the Advisor chain
@Bean
public ChatClient ragChatClientWithCache(
    ChatClient.Builder builder,
    VectorStore vectorStore
) {
    return builder
        .defaultAdvisors(
            new QuestionAnswerAdvisor(
                vectorStore,
                SearchRequest.defaults()
                    .withSimilarityThreshold(0.65)
                    .withTopK(3)
            )
        )
        .build();
}
// For custom semantic caching, wrap ChatClient calls in SemanticCacheService
// before the ChatClient.prompt() call
```

---

## 8. Scale Evolution

**Prototype →** Semantic cache as a simple service wrapping `VectorStore`; 7-day TTL via metadata timestamp; log hit/miss to console.

**Production →** Separate cache collection in pgvector (not mixed with RAG docs); Micrometer counters for hit rate (target: > 40%); topic-tagged invalidation on content updates.

**High scale →** Cache warming on deploy (pre-embed common FAQ questions); A/B test similarity thresholds; per-tenant cache namespacing for B2B products; cache hit rate as SLI (below 30% = content is non-repetitive, cache adding latency without benefit — disable).

---

## 9. Company Relevance

| Company | Semantic cache relevance | Interview signal |
|---------|------------------------|-----------------|
| Razorpay / PhonePe | Payment FAQ chatbot — "how do I dispute a charge" asked 10,000 times/day | 50%+ hit rate; reduces LLM spend from $10K to $5K/month |
| Swiggy / Meesho | Product description generation — many similar queries for items in same category | Topic invalidation when catalogue updates; per-category threshold tuning |
| Adobe / Microsoft | Help documentation chatbot — users ask same questions about UI features | Cache by product version tag; invalidate on release day |
| SAP Labs | ERP assistant — same compliance or GL code questions asked by multiple users | Per-tenant namespacing; invalidation on policy updates |

---

## 10. Interview Questions & Model Answers

### Q1 — Explain how semantic caching differs from Redis caching for LLM responses
**Hruday:**
> "Standard Redis cache uses the exact query string as the key — 'What time do you close?' and 'When are you open on Sundays?' are two different keys, two cache misses, two LLM calls costing twice as much. Semantic cache embeds the query and does a nearest-neighbour search in a vector store. If a semantically equivalent question was answered before and its cosine similarity to the current query is above my threshold — say 0.92 — the cached answer comes back instantly with no LLM call. In a support chatbot where the same questions get rephrased in dozens of ways, this cuts LLM API spend by 40-60%. The key operation parameter is the similarity threshold: too low and you answer dissimilar questions with the wrong cached response; too high and it degrades to exact-match. I tune it per use case — 0.92 for FAQ, 0.95 for anything where answer specificity matters."

---

*Part 21 · Semantic Caching of LLM Responses — Vector Similarity Approach · Full Stack Interview Guide · Hruday D · 2026*
