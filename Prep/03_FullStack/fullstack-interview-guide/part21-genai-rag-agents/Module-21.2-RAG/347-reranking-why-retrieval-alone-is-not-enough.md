# Reranking — Why Retrieval Alone Is Not Enough
> Part 21 — Generative AI for Full Stack Engineers · RAG
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The retrieval problem**: vector similarity search is fast but imprecise — it finds chunks that are topically related to the query but not necessarily the ones that best answer the specific question; the top-3 chunks by cosine similarity may include tangentially related content that dilutes the LLM's answer
- **Reranking is a second-pass precision filter**: retrieve a larger candidate set (k=20) with fast vector search, then apply a slower but more accurate model (cross-encoder) that scores each candidate against the query for specific relevance, then pass only the top 3-5 highest-scoring candidates to the LLM
- **Bi-encoder vs cross-encoder**: the embedding model is a bi-encoder (embeds query and document independently, then compares); a cross-encoder reads both query and document together in a single pass and produces a relevance score — much more accurate but too slow for first-pass retrieval over large databases
- **Practical outcome**: retrieve 20 with the fast bi-encoder → rerank to top 3 with the slow cross-encoder → pass to LLM; this yields frontier-quality answers at production-scale retrieval speed
- **The lost-in-the-middle fix**: after reranking, put the highest-scoring chunk first and second-highest last; middle positions are statistically recalled less well by LLMs; front-loading the most relevant chunk improves answer accuracy
- **When to skip reranking**: prototypes; simple uniform knowledge bases where retrieval precision is already high; any system where 200-500ms extra latency is unacceptable and retrieval quality is good enough without it

---

## 1. One-Line Definition
Reranking is a second retrieval pass that uses a more accurate relevance model (cross-encoder) to re-score a large candidate set of retrieved chunks and select only the most relevant few for the LLM prompt, improving answer quality at the cost of additional inference latency.

---

## 2. The Problem Reranking Solves

```
QUERY: "How do I cancel my subscription and get a refund?"

NAÏVE RETRIEVAL (top-3 by vector similarity):
  Score 0.82: "Subscription cancellation is available in Account Settings."
  Score 0.80: "Refunds are processed within 7 days of request."
  Score 0.79: "Our subscription plans include monthly and annual options."

The third chunk (subscription plan options) is topically related 
("subscription") but does NOT answer the question.
The LLM must ignore it — but it takes up context space and 
can confuse the generation.

RETRIEVAL + RERANKING:
  First pass (top-20 by cosine similarity):
    ...includes all the above plus more related chunks...
  
  Reranker scores each candidate against the SPECIFIC query 
  "How do I cancel my subscription and get a refund?":
  
  Rerank score 0.96: "Subscription cancellation is available in Account Settings."
  Rerank score 0.93: "To cancel: go to Settings > Subscription > Cancel. 
                       Your refund will be processed within 7 days."
  Rerank score 0.91: "Refunds are processed within 7 days of request."
  Rerank score 0.32: "Our subscription plans include monthly and annual options."
                     ← FILTERED OUT (low specific relevance)

Top-3 after reranking: directly answer the question; no noise.
```

---

## 3. Bi-Encoder vs Cross-Encoder

```
BI-ENCODER (used in first-pass retrieval):

  Query → [Encoder] → query_vector
  Doc   → [Encoder] → doc_vector
  similarity = cosine(query_vector, doc_vector)
  
  Pro:  Fast — doc vectors are pre-computed and stored;
        query vector is computed once;
        similarity is just a dot product
  Con:  Lower accuracy — query and document are encoded 
        independently; no direct interaction between them
  
─────────────────────────────────────────────────────────────────────────

CROSS-ENCODER (used in reranking):

  [Query + Document] → [Cross-Encoder] → relevance_score (0.0 - 1.0)
  
  The model reads BOTH query AND document in the same forward pass.
  Self-attention can directly compare query tokens against doc tokens.
  
  Pro:  High accuracy — direct query-document interaction;
        captures "does this specific sentence answer this specific question?"
  Con:  Slow — cannot pre-compute; must run inference for EVERY
        (query, candidate_doc) pair at query time
        At 20 candidates: 20 inference passes per user query
  
─────────────────────────────────────────────────────────────────────────

PRACTICAL COMBINATION:
  First pass: bi-encoder (fast) → retrieve top 20 candidates
  Second pass: cross-encoder (slower but accurate) → score 20, return top 3
  
  Net result:
  - Retrieval speed: maintained (fast bi-encoder does the heavy lifting)
  - Answer quality: frontier-level (cross-encoder finds the truly relevant chunks)
```

---

## 4. Reranker Models

```
HOSTED RERANKERS:
  Cohere Rerank API:    
    REST call: POST /v1/rerank
    Input: query + list of documents
    Output: relevance scores for each document
    Latency: ~100-300ms for 20 documents

  Jina Reranker v2:
    Similar REST API; open-source version available
    Good multilingual support

SELF-HOSTED (open source):
  cross-encoder/ms-marco-MiniLM-L-6-v2  (Hugging Face)
    Small, fast, English-only
    Run with Spring AI + Hugging Face inference endpoint
    
  BAAI/bge-reranker-v2-m3  (Hugging Face)
    Multilingual; strong on non-English queries
    Good choice for India market (Hindi + English queries)

SPRING AI RERANKER (when available):
  Some vector stores have built-in reranker support.
  Check Spring AI's VectorStore SPI for current support.
  
  Manual approach (works today):
  // Call Cohere Rerank API after pgvector retrieval
```

---

## 5. Implementation Pattern

### Full Retrieve → Rerank → Generate Pipeline

```java
@Service
public class RagWithRerankService {

    private final VectorStore vectorStore;
    private final ChatClient chatClient;
    private final RerankClient rerankClient;  // wraps Cohere/Jina API

    public String query(String userQuestion) {
        
        // STEP 1: Fast retrieval — get 20 candidates
        List<Document> candidates = vectorStore.similaritySearch(
            SearchRequest.query(userQuestion)
                .withTopK(20)           // larger set for reranking
                .withSimilarityThreshold(0.50)  // lower threshold; reranker will filter
        );
        
        if (candidates.isEmpty()) {
            return "I don't have enough information to answer this accurately.";
        }
        
        // STEP 2: Rerank — score each candidate against the specific query
        List<RankedDocument> reranked = rerankClient.rerank(
            userQuestion,
            candidates,
            3           // top 3 after reranking
        );
        
        // STEP 3: Position the most relevant chunk first (lost-in-middle fix)
        // reranked is already sorted by score descending
        
        // STEP 4: Build context from top-3 reranked chunks
        String context = reranked.stream()
            .map(RankedDocument::content)
            .collect(Collectors.joining("\n\n---\n\n"));
        
        // STEP 5: Generate
        return chatClient.prompt()
            .system("""
                Answer using ONLY the CONTEXT. 
                If the answer is not in the CONTEXT, say: 
                "I don't have enough information to answer this accurately."
                """)
            .user(u -> u.text("CONTEXT:\n{ctx}\n\nQUESTION: {q}")
                .param("ctx", context)
                .param("q", userQuestion))
            .call()
            .content();
    }
}
```

---

## 6. The Pattern in Practice

### Wrong Way — Retrieving just 3 without reranking

```
❌ Top-3 by cosine similarity (no reranking):

  The similarity scores cluster tightly: 0.82, 0.80, 0.79.
  The difference between a relevant and an irrelevant chunk 
  is often < 0.05 in cosine distance.
  Vector similarity cannot distinguish "topically related" 
  from "specifically answers the question."
  
  The LLM receives 1 highly relevant chunk + 2 noisy chunks.
  The noisy chunks dilute the answer quality.
```

```
✅ Retrieve 20 + rerank to top 3:

  First pass catches all potentially relevant chunks (wide net).
  Reranker scores by specific relevance (precise filter).
  
  The LLM receives 3 chunks that all directly answer the question.
  No noise. The generated answer is clearly grounded.
  
  Latency cost: +100-300ms for reranker call.
  Answer quality gain: significant for complex/specific queries.
  
  Verdict: worth it for any customer-facing quality bar.
```

---

## 7. Interview Questions & Model Answers

### Q1 — Why rerank
**Interviewer:** "You mentioned your RAG system uses reranking. Why add that complexity?"

**Hruday:**
> "Vector similarity search finds documents that are topically related to the query, but it can't distinguish between a document that generally mentions the topic and one that specifically answers the question. The cosine similarity scores for related-but-not-directly-helpful chunks are often within 0.03-0.05 of the truly relevant chunks — indistinguishable by similarity threshold alone. A cross-encoder reranker reads the query and each candidate document together, which gives it the context to score specific relevance much more accurately. The trade-off is latency: retrieving 20 candidates takes a few milliseconds, reranking them with a cross-encoder takes another 100-300ms. For a user-facing support chatbot, that trade-off is worth it — the answer quality improvement is visible and reduces the escalation rate to human agents."

---

## 8. Scale Evolution

**Prototype →** Skip reranking; focus on getting chunking and retrieval right first; add if precision is visibly poor.

**Production →** Add reranking for customer-facing use cases; start with Cohere Rerank API (easiest to add); measure answer quality before/after.

**High scale + latency sensitive →** Host cross-encoder model on internal GPU endpoint; batch reranking requests to reduce API call overhead; cache reranked results for repeated queries (semantic caching at reranking layer).

---

## 9. Company Relevance

| Company | Why reranking matters | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Support chatbot accuracy: wrong information about refunds or chargebacks has business impact | Demonstrate retrieve-20/rerank-to-3 approach; latency budget analysis |
| Swiggy / Meesho | Product search precision: "vegetarian north Indian under ₹500" must return precise results, not just vaguely related options | Reranking for specificity in multi-attribute queries; hybrid with keyword filters |
| Adobe / Microsoft | Copilot feature quality: enterprise users have low tolerance for irrelevant answers in productivity tools | Cross-encoder reranking as a standard component; position bias awareness (lost-in-the-middle) |
| SAP Labs | SAP Joule assistant: wrong procedural answers for SAP configuration tasks have real operational impact | High-precision reranking for procedural queries; first chunk = most relevant |

---

## 10. Related Topics — What to Study Next

- **Topic 343 — RAG Architecture** — reranking is the optional precision layer between retrieval and generation
- **Topic 346 — Chunking Strategies** — reranking improves precision on top of good chunking; bad chunking cannot be fully rescued by reranking
- **Topic 344 — Vector Databases** — retrieval quality is the first-pass input to the reranker

---

*Part 21 · Reranking — Why Retrieval Alone Is Not Enough · Full Stack Interview Guide · Hruday D · 2026*
