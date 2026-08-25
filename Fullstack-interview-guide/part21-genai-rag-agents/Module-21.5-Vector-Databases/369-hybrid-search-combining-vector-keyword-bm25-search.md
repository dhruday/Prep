# Hybrid Search — Combining Vector + Keyword BM25 Search
> Part 21 — Generative AI for Full Stack Engineers · Vector Databases
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Vector search alone has a blind spot**: it finds semantically similar text, but misses exact term matches — product codes, names, error codes, specific API endpoints; "NullPointerException at line 42" returns conceptually related results, not the exact error; this is when BM25 keyword search wins
- **BM25 is the best-practice keyword search algorithm** (used by Elasticsearch, pgvector tsvector, Lucene): it scores documents by term frequency (how often the query word appears) and inverse document frequency (how unique the term is across the corpus); exact matches rank highest
- **Hybrid search combines both**: get top-k from vector search + top-k from BM25 → merge with a fusion algorithm → return final ranked list; this catches both "semantic meaning" and "exact keyword" queries with a single pipeline
- **Two fusion approaches**: (1) Reciprocal Rank Fusion (RRF) — no score normalisation needed, just invert rank positions (rank 1 = high score, rank 20 = low score), sum RRF scores; (2) Linear interpolation — `alpha × vector_score + (1-alpha) × bm25_score` where alpha is tuned per use case
- **Postgres hybrid search**: pgvector for semantic (`<=>`) + `tsvector` GIN index for keyword (`@@`); merge results in Java; works well up to medium scale
- **At scale**: Qdrant and Weaviate have native hybrid search (sparse + dense fusion) in a single query; eliminates the two-query merge in application code

---

## 1. One-Line Definition
Hybrid search combines vector similarity (semantic meaning) with BM25 keyword search (exact term matching) via result fusion, delivering better retrieval quality than either method alone — especially for queries that mix conceptual intent with specific technical terms.

---

## 2. When Each Method Wins

```
QUERY TYPES AND BEST METHOD

Semantic (vector wins):
  "How do I handle concurrent database updates?"
  "What causes slow Spring Boot startup?"
  "Explain the difference between SQL and NoSQL"
  → Meaning matters, exact words don't

Keyword (BM25 wins):
  "NullPointerException in OrderService.processPayment"
  "error code ERR-4291 Razorpay refund"
  "@Transactional rollback behaviour"
  "CVE-2024-12345 Spring Security"
  → Exact terms matter, paraphrase loses the signal

Hybrid (both needed):
  "Why does @Async fail in same class calls?"
  "Razorpay payment gateway 500 error timeout fix"
  "Spring Boot 3.2 breaking changes for Java 17"
  → Specific terms + conceptual context
```

---

## 3. Postgres Hybrid Search (pgvector + tsvector)

```sql
-- Schema: add tsvector column alongside vector column
ALTER TABLE document_chunks 
ADD COLUMN ts_content TSVECTOR 
GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- GIN index for keyword search
CREATE INDEX doc_chunks_ts_idx ON document_chunks USING gin(ts_content);
-- HNSW index for vector search (from topic 368)
CREATE INDEX doc_chunks_hnsw_idx ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- Vector search results (top 20 candidates)
SELECT id, content, 
       1 - (embedding <=> $1) AS vector_score
FROM document_chunks
WHERE domain = $2
ORDER BY embedding <=> $1
LIMIT 20;

-- BM25/keyword search results (top 20 candidates)
SELECT id, content,
       ts_rank(ts_content, plainto_tsquery('english', $3)) AS keyword_score
FROM document_chunks
WHERE domain = $2
  AND ts_content @@ plainto_tsquery('english', $3)
LIMIT 20;
```

```java
// Java merge with Reciprocal Rank Fusion (RRF)
@Service
public class HybridSearchService {

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingModel embeddingModel;

    public List<String> hybridSearch(String query, String domain, int topK) {
        // Step 1: Get vector search results (top 20)
        List<Float> embedding = embeddingModel.embed(query).stream()
            .map(d -> (float)(double)d).toList();
        
        List<SearchResult> vectorResults = vectorSearch(embedding, domain, 20);
        List<SearchResult> keywordResults = keywordSearch(query, domain, 20);
        
        // Step 2: Reciprocal Rank Fusion
        return rrfMerge(vectorResults, keywordResults, topK);
    }
    
    private List<String> rrfMerge(
            List<SearchResult> vectorResults, 
            List<SearchResult> keywordResults, 
            int topK) {
        
        int k = 60; // RRF constant (standard is 60)
        Map<String, Double> rrfScores = new HashMap<>();
        
        // RRF from vector results
        for (int i = 0; i < vectorResults.size(); i++) {
            String id = vectorResults.get(i).id();
            rrfScores.merge(id, 1.0 / (k + i + 1), Double::sum);
        }
        
        // RRF from keyword results
        for (int i = 0; i < keywordResults.size(); i++) {
            String id = keywordResults.get(i).id();
            rrfScores.merge(id, 1.0 / (k + i + 1), Double::sum);
        }
        
        // Sort by RRF score and return top-k content
        return rrfScores.entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(topK)
            .map(e -> getContentById(e.getKey()))
            .toList();
    }
}

public record SearchResult(String id, String content, double score) {}
```

---

## 4. Qdrant Native Hybrid Search

```java
// Qdrant: sparse (BM25) + dense (vector) in a single query — no manual merge
@Service
public class QdrantHybridSearchService {

    private final QdrantClient qdrantClient;
    
    public List<String> hybridSearch(String query, int topK) {
        List<Float> denseVector = embeddingModel.embed(query);
        // Sparse BM25 representation (would come from BM25 encoder or SPLADE model)
        SparseVector sparseVector = bm25Encoder.encode(query);
        
        QueryPoints request = QueryPoints.newBuilder()
            .setCollectionName("document-chunks")
            .addPrefetch(PrefetchQuery.newBuilder()
                .setQuery(VectorInput.newBuilder()
                    .setDense(DenseVector.newBuilder().addAllData(denseVector)))
                .setUsing("dense")
                .setLimit(20))
            .addPrefetch(PrefetchQuery.newBuilder()
                .setQuery(VectorInput.newBuilder()
                    .setSparse(sparseVector))
                .setUsing("sparse")
                .setLimit(20))
            .setQuery(FusionQuery.newBuilder()
                .setFusion(Fusion.RRF))   // Reciprocal Rank Fusion built in
            .setLimit(topK)
            .build();
        
        return qdrantClient.queryAsync(request).get()
            .stream()
            .map(r -> (String) r.getPayload().get("content").getStringValue())
            .toList();
    }
}
```

---

## 5. Wrong Way vs Right Way

```java
// ❌ Pure vector search — misses exact technical terms
List<Document> results = vectorStore.similaritySearch(
    SearchRequest.query("NullPointerException OrderService processPayment")
        .withTopK(5)
);
// → Retrieves "handling null values in Java", "defensive programming patterns"
// → Misses the EXACT document about NullPointerException in OrderService
```

```java
// ✅ Hybrid search — catches both the error type (keyword) and context (vector)
List<String> results = hybridSearchService.hybridSearch(
    "NullPointerException OrderService processPayment", "support", 5
);
// → Top result: exact error document (keyword hit)
// → Next: related null handling patterns (vector hit)
// → Combined: better recall than either alone
```

---

## 6. Alpha Tuning (Linear Interpolation)

```java
// When RRF isn't enough and you need explicit weighting:
// finalScore = alpha × vectorScore + (1 - alpha) × bm25Score

// alpha = 0.7 → semantic-dominant (description search)
// alpha = 0.3 → keyword-dominant (technical error search)
// alpha = 0.5 → balanced (general Q&A)

public List<String> hybridSearchWeighted(String query, float alpha) {
    List<SearchResult> vectorResults  = vectorSearch(query, 20);
    List<SearchResult> keywordResults = keywordSearch(query, 20);
    
    Map<String, Double> mergedScores = new HashMap<>();
    vectorResults.forEach(r -> mergedScores.merge(r.id(), alpha * r.score(), Double::sum));
    keywordResults.forEach(r -> mergedScores.merge(r.id(), (1-alpha) * r.score(), Double::sum));
    
    return mergedScores.entrySet().stream()
        .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
        .limit(5)
        .map(e -> getContentById(e.getKey()))
        .toList();
}
```

---

## 7. Scale Evolution

**Prototype →** Implement pgvector for vector search; defer BM25 until there is user feedback that keyword queries are underperforming.

**Production →** Add `tsvector` GIN index to pgvector table; implement RRF merge in Java service; A/B test hybrid vs pure vector recall quality using golden question set.

**High scale →** Migrate to Qdrant native hybrid search (single query, no application-level merge); sparse vector from SPLADE model for better BM25 encoding than PostgreSQL `plainto_tsquery`; tune per-query-type alpha via feature flag.

---

## 8. Company Relevance

| Company | Hybrid search need | Interview signal |
|---------|--------------------|-----------------|
| Razorpay / PhonePe | Error code lookup + error type semantic search | Hybrid required: "ERR-4291" (keyword) + "why did my payment fail" (semantic) |
| Swiggy / Meesho | Product name exact match ("Bosch Mixer") + description semantic | Qdrant hybrid or pgvector+tsvector; alpha = 0.4 (keyword-leaning) |
| Adobe / Microsoft | API docs: function names (keyword) + usage explanation (semantic) | Describe RRF fusion; pgvector + tsvector in existing Postgres |
| SAP Labs | GL code exact match + description similarity for invoice suggestion | Hybrid critical: account codes are exact, descriptions are semantic |

---

## 9. Interview Questions & Model Answers

### Q1 — When would you use hybrid search vs pure vector search?
**Hruday:**
> "Pure vector search works well when the user's intent is conceptual — 'how do I handle payments that timeout?' But it struggles with exact terms: if the user searches for 'ERR-4291' or '@Transactional rollbackFor', the vector might return documents that discuss error handling in general, not the specific error. Hybrid search solves this by running both BM25 keyword search and vector search, then merging with Reciprocal Rank Fusion. RRF is elegant — I don't need to normalise scores across the two result sets; I just invert rank positions and sum them. In Postgres I pair pgvector's HNSW index with a tsvector GIN index and merge in Java. At higher scale, Qdrant's native hybrid search API does the fusion in one query. I tune the alpha weight per query type — 0.7 semantic for exploratory questions, 0.3 semantic for technical term lookups."

---

*Part 21 · Hybrid Search — Combining Vector + Keyword BM25 Search · Full Stack Interview Guide · Hruday D · 2026*
