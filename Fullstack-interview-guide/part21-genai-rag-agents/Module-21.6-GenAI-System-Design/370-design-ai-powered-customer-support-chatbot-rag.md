# Design an AI-Powered Customer Support Chatbot with RAG
> Part 21 — Generative AI for Full Stack Engineers · GenAI System Design
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Core architecture**: React chat UI → Spring Boot API → Semantic Cache (Redis/pgvector) → RAG pipeline (pgvector retrieval → GPT-4o-mini generation) → SSE streaming response back to UI; 80% of queries cached after week 1
- **Two-tier retrieval for quality**: dense vector search (top 20 candidates via HNSW) → Cohere Rerank cross-encoder (top 3 kept) → LLM injection; reranking improves answer relevance by 15-20% vs raw vector retrieval  
- **Knowledge ingestion pipeline (offline)**: Support docs/PDFs → loader → semantic chunking (500 tokens, 50-token overlap) → `text-embedding-3-small` → pgvector with source/section/version metadata
- **Session design**: stateless sessions (conversation history in encrypted client-side cookie or Redis TTL=30min) to avoid sticky sessions; Spring AI `MessageChatMemoryAdvisor` for history injection
- **Escalation path**: confidence threshold on retrieval; if `maxSimilarity < 0.55` OR if model responds with "I'm not sure", route to human queue with full conversation context; never let the bot confidently hallucinate
- **Cost controls**: semantic cache first (40-60% cache hit rate reduces cost by that much); GPT-4o-mini default (3× cheaper than GPT-4o for most support queries); token budget per-user per-day; rate limit to 30 RPM per user

---

## 1. System Overview

**Functional requirements:**
- Answer questions from support knowledge base (docs, FAQs, policies)
- Stream responses token-by-token
- Remember conversation context within a session
- Escalate to human when confidence is low
- Support 50K users/day with < 2s TTFR (time to first response)

**Non-functional requirements:**
- p99 latency < 3s (including LLM generation)
- Daily cost target: < $500 (manageable)
- Availability: 99.5%
- Security: no PII sent to LLM, no system prompt leakage

---

## 2. High-Level Architecture

```
┌────────────────────────────────────────────────────────┐
│                    OFFLINE INGESTION                    │
│  Support Docs → Chunker → Embedder → pgvector Store    │
└────────────────────────────────────────────────────────┘
                          ↕ (offline, daily or on-change)
┌────────────────────────────────────────────────────────┐
│                   ONLINE REQUEST PATH                   │
│                                                         │
│  React UI                                               │
│    → POST /api/chat (fetch + ReadableStream)            │
│       ↓                                                 │
│  Spring Boot API Gateway                               │
│    → Auth check + Rate limit + Input guard              │
│       ↓                                                 │
│  Semantic Cache (pgvector query > 0.92 threshold)       │
│    Cache HIT  → SSE stream cached answer               │
│    Cache MISS ↓                                        │
│  RAG Service                                            │
│    1. Embed query (text-embedding-3-small)             │
│    2. Vector search top-20 (HNSW, pgvector)            │
│    3. Rerank to top-3 (Cohere Rerank API)              │
│    4. Inject into prompt                               │
│    5. ChatClient.stream().content()                    │
│       → SSE token stream → React UI                    │
│       ↓                                                │
│  Escalation check                                      │
│    → If similarity < 0.55: human queue ticket          │
└────────────────────────────────────────────────────────┘
```

---

## 3. Key Component Design

### 3.1 Ingestion Pipeline

```java
@Service
public class SupportDocIngestionService {

    private final VectorStore vectorStore;
    
    public void ingest(String docContent, String source, String version) {
        // Semantic chunking: split at paragraph/heading boundaries
        List<String> chunks = semanticChunker.chunk(docContent, 500, 50);
        
        List<Document> documents = IntStream.range(0, chunks.size())
            .mapToObj(i -> new Document(
                chunks.get(i),
                Map.of(
                    "source", source,
                    "chunk_index", i,
                    "version", version,
                    "ingested_at", Instant.now().toString()
                )
            ))
            .toList();
        
        // Idempotent: delete old version's chunks before inserting new
        deleteBySourceVersion(source, previousVersion);
        vectorStore.add(documents);
        log.info("Ingested {} chunks from source={} version={}", chunks.size(), source, version);
    }
}
```

### 3.2 RAG Query Service

```java
@Service
public class SupportRagService {

    private final VectorStore vectorStore;
    private final RerankingService reranker;
    private final ChatClient chatClient;
    
    private static final String SYSTEM_PROMPT = """
        You are a customer support assistant for Hruday Commerce.
        Answer ONLY based on the provided context.
        If the context does not contain the answer, say:
        "I don't have enough information. Let me connect you with a support agent."
        Do not invent information. Be concise and friendly.
        """;

    public Flux<String> streamAnswer(String query, List<Message> history) {
        // Step 1: Retrieve candidates
        List<Document> candidates = vectorStore.similaritySearch(
            SearchRequest.query(query).withTopK(20).withSimilarityThreshold(0.50)
        );
        
        if (candidates.isEmpty() || candidates.get(0).getScore() < 0.55) {
            // Low confidence → escalate
            escalationService.createTicket(query, history);
            return Flux.just("I'm connecting you to a support agent who can help better.");
        }
        
        // Step 2: Rerank to top-3
        List<Document> reranked = reranker.rerank(query, candidates, 3);
        
        // Step 3: Build context
        String context = reranked.stream()
            .map(Document::getContent)
            .collect(Collectors.joining("\n\n---\n\n"));
        
        // Step 4: Stream response
        return chatClient.prompt()
            .system(SYSTEM_PROMPT)
            .messages(history)   // Conversation memory
            .user("""
                Context:
                %s
                
                Question: %s
                """.formatted(context, query))
            .stream()
            .content();
    }
}
```

### 3.3 Conversation Memory

```java
@Service
public class SessionMemoryService {

    private final RedisTemplate<String, List<Message>> redis;
    private static final Duration TTL = Duration.ofMinutes(30);
    
    public List<Message> getHistory(String sessionId) {
        List<Message> history = redis.opsForValue().get("session:" + sessionId);
        return history != null ? history : List.of();
    }
    
    public void append(String sessionId, String userMsg, String assistantMsg) {
        List<Message> history = new ArrayList<>(getHistory(sessionId));
        history.add(new UserMessage(userMsg));
        history.add(new AssistantMessage(assistantMsg));
        
        // Keep last 10 turns (20 messages) to control context window usage
        if (history.size() > 20) {
            history = history.subList(history.size() - 20, history.size());
        }
        
        redis.opsForValue().set("session:" + sessionId, history, TTL);
    }
}
```

---

## 4. Wrong Way vs Right Way

```java
// ❌ No retrieval — LLM answers from its training data only
// → Hallucinated refund policies, incorrect product info, stale pricing
public String answer(String question) {
    return chatClient.prompt().user(question).call().content();
}

// ❌ No escalation — bot confidently answers everything
// → "I'm sorry to hear that! Your refund of ₹4999 has been processed."
// → But the refund was never actually processed — hallucination
```

```java
// ✅ RAG + confidence check + escalation
public Flux<String> answer(String sessionId, String question) {
    if (semanticCache.hit(question)) return semanticCache.getStored(question);
    return ragService.streamAnswer(question, sessionMemory.getHistory(sessionId));
    // Internally: retrieval → confidence check → escalate if low → RAG → stream
}
```

---

## 5. Cost Model

```
50,000 users/day × avg 3 queries/user = 150,000 queries/day

With semantic cache (50% hit rate):
  75,000 cache hits     → $0 LLM cost
  75,000 cache misses   → LLM call

Per LLM call (GPT-4o-mini):
  Input: 1,500 tokens (3 chunks × 400 + query + history)
  Output: 200 tokens
  Cost: (1500 × $0.00015 + 200 × $0.0006) / 1000 = $0.000345 per call

Daily LLM cost:
  75,000 × $0.000345 = $25.88/day

Plus reranking (Cohere Rerank):
  75,000 × $0.002 per 20-doc rerank = $150/day

Total: ~$175/day — well within $500 target
```

---

## 6. Scale Evolution

**Prototype →** Single Spring Boot instance; pgvector without reranking; batch LLM call (no streaming); 1K users/day.

**Production →** SSE streaming; semantic cache; Cohere reranking; Redis session memory; escalation queue; 50K users/day.

**High scale →** Horizontal Spring Boot scaling (stateless); pgvector read replica for search; async Kafka-based ingestion pipeline; per-domain shard in pgvector; 500K users/day; SLA on TTFR < 800ms (target via caching).

---

## 7. Company Relevance

| Company | Chatbot context | Interview signal |
|---------|----------------|-----------------|
| Razorpay / PhonePe | Payment dispute chatbot — policy queries are high-stakes | Describe escalation path + confidence threshold + audit logging |
| Swiggy / Meesho | Order tracking, refund status chatbot | Session memory for multi-turn order queries; Kafka ingestion for order status docs |
| Adobe / Microsoft | Product documentation assistant — Creative Cloud help | Describe version-tagged ingestion; invalidation when docs update |
| SAP Labs | ERP module help assistant — SAP Business Technology Platform | Multi-tenant namespace isolation; per-customer knowledge base |

---

## 8. Interview Questions & Model Answers

### Q1 — Walk me through the design of an AI customer support chatbot
**Hruday:**
> "I'd build it in three layers. First, an offline ingestion pipeline that chunks support documentation into 500-token semantic chunks, embeds them with `text-embedding-3-small`, and stores them in pgvector with source and version metadata. Second, the online RAG query path: the user's question is embedded, I retrieve top-20 candidates from pgvector's HNSW index, rerank to the top 3 using a Cohere cross-encoder (which dramatically improves precision), inject those 3 chunks as context into a Spring AI ChatClient call, and stream the response back via SSE. Third, the safety and cost layer: a semantic cache sits in front of the LLM call — after a week, 40-60% of queries hit the cache saving their token cost entirely. A confidence check on retrieval similarity routes low-confidence queries to a human queue rather than risk a confident wrong answer. For conversation continuity, session history is stored in Redis with a 30-minute TTL, and I inject the last 10 turns into the prompt context."

---

*Part 21 · Design an AI-Powered Customer Support Chatbot with RAG · Full Stack Interview Guide · Hruday D · 2026*
