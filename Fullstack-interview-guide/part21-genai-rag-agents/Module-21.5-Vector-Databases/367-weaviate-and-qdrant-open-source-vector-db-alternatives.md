# Weaviate and Qdrant — Open Source Vector DB Alternatives
> Part 21 — Generative AI for Full Stack Engineers · Vector Databases
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Weaviate and Qdrant are open-source vector databases** you self-host (Docker, Kubernetes) — they give you capabilities beyond pgvector (built-in hybrid search, richer filtering, native multi-tenancy) without Pinecone's per-query pricing; tradeoff is operational overhead vs a managed service
- **Weaviate**: schema-based; built-in hybrid search (BM25 + vector in one query); Python-centric ecosystem; `text2vec` modules can embed inside Weaviate itself; good fit when you need keyword + semantic search together and want one endpoint
- **Qdrant**: schema-less (add vectors + payload, no schema definition); top benchmark performance; written in Rust (high throughput, low memory usage); excellent payload filtering with rich query language; native Spring AI support; good fit when search performance and filtering are the primary requirements
- **Both support Spring AI VectorStore interface**: same Java code as pgvector or Pinecone; config-only swap
- **Hybrid search is the key differentiator**: both Weaviate and Qdrant support combining dense vector search with sparse (BM25 keyword) search — this is critical when some queries need exact term matching (product codes, names) and others need semantic understanding
- **Self-hosted means you manage availability**: Kubernetes deployment + health monitoring + backup strategy + index rebuild on failure; budget 1 engineer-day per month for operations; this cost doesn't exist with Pinecone

---

## 1. One-Line Definition
Weaviate and Qdrant are open-source vector databases that provide hybrid search, rich payload filtering, and multi-tenancy — alternatives to Pinecone when you need more control, avoidance of vendor lock-in, or cost predictability at high query volumes.

---

## 2. Decision Matrix

| Dimension | pgvector | Pinecone | Weaviate | Qdrant |
|-----------|---------|---------|---------|-------|
| Hosting | Self (Postgres) | Managed (serverless) | Self or Cloud | Self or Cloud |
| Hybrid search | Manual (+ Elasticsearch) | Limited (metadata filter) | ✅ Native BM25+vector | ✅ Native sparse+dense |
| Performance at 10M vectors | Degraded | ✅ Excellent | ✅ Good | ✅ Excellent |
| Schema requirement | Flexible (metadata) | No schema | Yes (class schema) | No schema (payload) |
| Multi-tenancy | Manual partitioning | Namespaces | Multi-tenancy API | Collections or payload |
| Spring AI support | ✅ | ✅ | ✅ | ✅ |
| Operational overhead | Low (existing Postgres) | Zero | Medium | Medium |
| Cost at 100M QPS | Postgres compute | $ expensive per query | Compute only | Compute only |

---

## 3. Weaviate Spring AI Setup

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-weaviate-store-spring-boot-starter</artifactId>
</dependency>
```

```yaml
spring:
  ai:
    vectorstore:
      weaviate:
        host:        localhost:8080
        scheme:      http
        api-key:     ${WEAVIATE_API_KEY}
        object-class: DocumentChunk     # Weaviate class name (like a table name)
```

```java
// Docker Compose for local dev
// docker-compose.yaml excerpt:
// weaviate:
//   image: semitechnologies/weaviate:1.24.0
//   ports:
//     - "8080:8080"
//   environment:
//     QUERY_DEFAULTS_LIMIT: 25
//     DEFAULT_VECTORIZER_MODULE: none    # We provide our own embeddings

// Spring AI VectorStore usage — identical to pgvector
@Service
public class WeaviateSearchService {
    private final VectorStore vectorStore;
    
    public List<Document> search(String query) {
        return vectorStore.similaritySearch(
            SearchRequest.query(query).withTopK(5).withSimilarityThreshold(0.65)
        );
    }
}
```

---

## 4. Qdrant Spring AI Setup

```xml
<dependency>
  <groupId>org.springframework.ai</groupId>
  <artifactId>spring-ai-qdrant-store-spring-boot-starter</artifactId>
</dependency>
```

```yaml
spring:
  ai:
    vectorstore:
      qdrant:
        host:            localhost
        port:            6334            # Qdrant gRPC port (faster than REST)
        collection-name: document-chunks
        api-key:         ${QDRANT_API_KEY}
        initialize-schema: true
```

```bash
# Run Qdrant locally
docker run -p 6333:6333 -p 6334:6334 qdrant/qdrant:v1.7.0
```

---

## 5. Hybrid Search with Qdrant (Key Differentiator)

```java
// Qdrant hybrid search: dense vector + sparse (BM25) keyword combined
// This is what you use when queries can be either semantic OR keyword-based
// Example: "Spring Boot @Transactional" — keyword match on exact annotation name
//         "how do I manage database transactions" — semantic match

// With Qdrant Java SDK (when Spring AI abstraction isn't enough for hybrid)
@Service
public class HybridSearchService {

    private final QdrantClient qdrantClient;
    
    public List<SearchResult> hybridSearch(String query, float alpha) {
        // alpha = 0.0 → pure keyword; 1.0 → pure vector; 0.5 → balanced
        
        List<Float> denseEmbedding = embeddingModel.embed(query);
        Map<String, Float> sparseEmbedding = bm25Encoder.encode(query);
        
        QueryPoints request = QueryPoints.newBuilder()
            .setCollectionName("document-chunks")
            .setPrefetch(PrefetchQuery.newBuilder()
                .setQuery(VectorInput.newBuilder()
                    .setDense(DenseVector.newBuilder().addAllData(denseEmbedding))
                    .setSparse(SparseVector.newBuilder()
                        .addAllIndices(sparseEmbedding.keySet().stream().map(Integer::parseInt).toList())
                        .addAllValues(new ArrayList<>(sparseEmbedding.values())))
                )
                .setLimit(20)
            )
            .setQuery(FusionQuery.newBuilder().setFusion(Fusion.RRF))  // Reciprocal Rank Fusion
            .setLimit(5)
            .build();
        
        return qdrantClient.queryAsync(request).get();
    }
}
```

---

## 6. Wrong Way vs Right Way

```java
// ❌ Using Weaviate/Qdrant when pgvector is sufficient
// Team is new to AI, 100K documents, standard RAG use case
// → Added Kubernetes deployment, monitoring, backups, upgrades
// → All for a capability pgvector covers equally well
```

```java
// ✅ Choose Weaviate/Qdrant when there is a specific, measurable need
// Use cases that justify the operational overhead:
// 1. Hybrid search required (product codes + semantic queries mixed)
// 2. Data governance: cannot use Pinecone (data sovereignty / vendor lock-in policy)
// 3. Very high QPS with predictable volume (compute cost beats Pinecone per-query)
// 4. Rich filtering on payload (Qdrant's filter DSL is ~more expressive than pgvector)
```

---

## 7. Scale Evolution

**Prototype →** Neither Weaviate nor Qdrant; use pgvector; avoid the operational overhead before you need the features.

**Production →** Evaluate when hitting pgvector limits AND needing hybrid search OR richer filtering; Qdrant in Docker Compose → Kubernetes Deployment with PersistentVolumeClaim.

**High scale →** Qdrant distributed cluster (sharding + replication); Weaviate Kubernetes Operator; health monitoring via `/healthz` endpoints; Prometheus scraping Qdrant `/metrics` endpoint; index backup schedule.

---

## 8. Company Relevance

| Company | Relevance | Interview signal |
|---------|----------|-----------------|
| Razorpay / PhonePe | Data sovereignty (financial data) may prevent Pinecone; Qdrant self-hosted | Describe Qdrant Kubernetes setup; data governance reason for not using managed cloud |
| Swiggy / Meesho | Product search: item codes (keyword) + descriptions (semantic) → hybrid search | Weaviate hybrid BM25+vector for search; Spring AI facade |
| Adobe / Microsoft | Large enterprise corpus with rich metadata filters | Qdrant payload filter DSL for complex attribute-based retrieval |
| SAP Labs | SAP-managed infra, vendor lock-in constraints → prefer open source | Qdrant as self-hosted alternative; same Spring AI interface |

---

## 9. Interview Questions & Model Answers

### Q1 — When would you use Qdrant instead of pgvector or Pinecone?
**Hruday:**
> "Two main reasons. First, hybrid search: if the use case needs both semantic similarity and keyword matching in a single query — for example, finding documentation about a specific Spring annotation `@Transactional` where exact term matching matters alongside conceptual similarity — Qdrant's native sparse+dense fusion gives me that without stitching together a separate Elasticsearch instance. Second, cost predictability at high query volume: Pinecone Serverless charges per query, so at very high QPS the per-query cost adds up fast; self-hosting Qdrant on Kubernetes means I pay only for compute, which predictably scales. The trade-off is operational overhead — I own the HA configuration, backups, and upgrades. With Spring AI's VectorStore abstraction, the Java code is identical either way, so I can start with pgvector, validate the use case, and migrate to Qdrant only when there's a measured reason."

---

*Part 21 · Weaviate and Qdrant — Open Source Vector DB Alternatives · Full Stack Interview Guide · Hruday D · 2026*
