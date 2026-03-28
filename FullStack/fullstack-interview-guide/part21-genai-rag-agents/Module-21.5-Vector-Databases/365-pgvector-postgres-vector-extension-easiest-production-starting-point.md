# pgvector — Postgres Vector Extension, Easiest Production Starting Point
> Part 21 — Generative AI for Full Stack Engineers · Vector Databases
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **pgvector is the correct default choice** for teams already running Postgres: same database, same backup strategy, same monitoring, same DBA expertise, no new infrastructure; operational cost is near-zero; start here, migrate to a dedicated vector DB only when pgvector is the measured bottleneck
- **Core operator**: `<=>` is cosine distance in pgvector; `<->` is L2 (Euclidean) distance; `<#>` is negative inner product; for text embeddings, always use `<=>` (cosine) because magnitude doesn't carry semantic information
- **HNSW index for production**: `CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops)` — turns linear O(n) scan into O(log n) approximate nearest neighbour; without an index, pgvector does a full table scan which is fine for < 100K rows, slow above that
- **HNSW tuning parameters**: `m` (number of connections per layer, default 16) and `ef_construction` (build quality, default 64); higher values = better recall but slower index build and larger index; `m=16, ef_construction=64` is the safe default for most workloads
- **Index build is single-threaded and slow**: building HNSW on 1M vectors takes 30-60 minutes; do it during a maintenance window; monitor with `SELECT phase, blocks_done, blocks_total FROM pg_stat_progress_create_index`
- **Spring AI pgvector autoconfiguration**: add `spring-ai-pgvector-store-spring-boot-starter`; configure `dimensions`, `distance-type`, `initialize-schema: true`; Spring AI creates the table and index automatically; you interact only via `VectorStore` interface

---

## 1. One-Line Definition
pgvector is a Postgres extension that adds a `vector` data type, cosine/L2/inner-product distance operators, and HNSW approximate nearest neighbour indexing — making your existing Postgres database a capable vector store without adding new infrastructure.

---

## 2. Schema Setup

```sql
-- Enable the extension (run once per database)
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents / chunks table
CREATE TABLE document_chunks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content     TEXT            NOT NULL,
    embedding   vector(1536)    NOT NULL,    -- dimension must match embedding model
    
    -- Metadata for filtering
    source_doc  TEXT,
    section     TEXT,
    domain      TEXT,
    chunk_index INT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- HNSW index for fast cosine similarity search
-- Build this AFTER loading your initial data (much faster)
CREATE INDEX ON document_chunks 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Pre-filter index on metadata (for domain-scoped searches)
CREATE INDEX ON document_chunks (domain);
```

---

## 3. Manual SQL — Understanding the Core Operations

```sql
-- Cosine similarity search (lower <=> = more similar)
-- Top 5 chunks most similar to a query embedding
SELECT 
    id,
    content,
    source_doc,
    1 - (embedding <=> '[0.1, 0.2, ..., 0.3]'::vector) AS similarity
FROM document_chunks
WHERE domain = 'support'                                   -- pre-filter
    AND 1 - (embedding <=> '[...]'::vector) > 0.65        -- similarity threshold
ORDER BY embedding <=> '[...]'::vector                     -- cosine distance ascending
LIMIT 5;
```

---

## 4. Spring AI Integration

```java
// application.yaml
spring:
  ai:
    vectorstore:
      pgvector:
        dimensions: 1536               # Must match embedding model
        distance-type: COSINE_DISTANCE
        index-type: HNSW
        initialize-schema: true        # Auto-creates table + index in dev
        schema-name: public
        table-name: vector_store

// Service layer — Spring AI VectorStore interface
@Service
public class DocumentStore {

    private final VectorStore vectorStore;
    
    // Store document chunks
    public void store(String content, Map<String, Object> metadata) {
        Document doc = new Document(content, metadata);
        vectorStore.add(List.of(doc));
    }
    
    // Search by semantic similarity
    public List<Document> search(String query, String domain, int topK) {
        return vectorStore.similaritySearch(
            SearchRequest.query(query)
                .withTopK(topK)
                .withSimilarityThreshold(0.65)
                .withFilterExpression("metadata['domain'] == '" + domain + "'")
        );
    }
    
    // Delete by metadata filter (e.g., remove all chunks from a document)
    public void deleteBySource(String sourceDoc) {
        vectorStore.delete(List.of(/* document IDs to delete */));
    }
}
```

---

## 5. Performance Characteristics

| Dataset size | Without HNSW | With HNSW | Notes |
|-------------|-------------|-----------|-------|
| < 10K rows | < 50ms | < 10ms | Index overhead not worth it |
| 10K–500K rows | 200-2,000ms | 10-30ms | HNSW required |
| 500K–5M rows | 2-20s (unusable) | 20-100ms | HNSW + metadata pre-filter |
| > 5M rows | ❌ | 100-500ms | Consider Pinecone/Qdrant |

---

## 6. Wrong Way vs Right Way

```sql
-- ❌ No HNSW index — linear scan on large table
-- On 1M vectors, this runs for 5-20 seconds
SELECT content 
FROM document_chunks 
ORDER BY embedding <=> $1 LIMIT 5;
-- pg explain: "Seq Scan on document_chunks (cost=0.00..999999.00...)"
```

```sql
-- ✅ HNSW index present — approximate nearest neighbour, milliseconds
-- Same query, index reduces search space from O(n) to O(log n)
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
SELECT content 
FROM document_chunks 
WHERE domain = 'support'          -- metadata pre-filter reduces candidates
ORDER BY embedding <=> $1 LIMIT 5;
-- pg explain: "Index Scan using document_chunks_embedding_idx"
```

---

## 7. Migration Path to Dedicated Vector DB

```
WHEN pgvector is NOT enough:

Signals to watch:
  → HNSW index build taking > 4 hours
  → p99 similarity search > 200ms despite index
  → Need for multi-tenant isolation at the DB level
  → Need for hybrid search (vector + full text keyword BM25) at scale
  → Operations team lacks Postgres expertise for vector tuning

Migration is config-only with Spring AI:
  # Remove: spring-ai-pgvector-store-spring-boot-starter
  # Add:    spring-ai-pinecone-store-spring-boot-starter
  
  spring:
    ai:
      vectorstore:
        pinecone:
          api-key: ${PINECONE_API_KEY}
          environment: us-east1-gcp
          index-name: my-index
          namespace: default
  
  // Zero Java code changes — VectorStore interface is the same
```

---

## 8. Scale Evolution

**Prototype →** `initialize-schema: true`; no HNSW index (table scan is fine < 10K rows); full Spring AI autoconfiguration.

**Production →** HNSW index created via migration; `initialize-schema: false`; metadata columns indexed; Postgres 16 with `max_parallel_workers_per_gather = 4` for parallel scans.

**High scale →** Partitioning by `domain` column (separate physical segment per domain); pgBouncer connection pool since HNSW builds hold exclusive locks; read replica for search queries; evaluate migration to Pinecone at > 2M vectors.

---

## 9. Company Relevance

| Company | pgvector relevance | Interview signal |
|---------|--------------------|-----------------|
| Razorpay / PhonePe | Already on Postgres for transactional data; pgvector adds AI without new infra | Defend pgvector-first choice; describe migration path to Pinecone when needed |
| Swiggy / Meesho | Postgres is common; product search semantic layer can be pgvector | HNSW tuning for catalogue size; pre-filter by category metadata |
| Adobe / Microsoft | Enterprise products often on managed Postgres (AWS RDS, Azure Database) | `initialize-schema: false` for managed RDS; extension enabled via admin |
| SAP Labs | SAP HANA is primary, but Spring AI pgvector useful for prototype phases | pgvector on dev/test; describe evaluation criteria for production vector DB choice |

---

## 10. Interview Questions & Model Answers

### Q1 — When would you choose pgvector vs Pinecone?
**Hruday:**
> "I start with pgvector because for most RAG workloads it's more than enough, and it runs in the same Postgres instance I'm already operating — same backup, same monitoring, same DBA expertise. With HNSW indexing, pgvector handles up to 2-3 million vectors with p99 search latency under 100ms. The signals I watch for migration to a managed vector DB like Pinecone are: index build times exceeding 4 hours, search p99 creeping above 200ms despite index tuning, or needing advanced features like multi-region replication or hybrid BM25+vector search at scale. The key advantage of Spring AI's VectorStore abstraction is that this migration is purely a config change — no Java code changes at all."

---

*Part 21 · pgvector — Postgres Vector Extension, Easiest Production Starting Point · Full Stack Interview Guide · Hruday D · 2026*
