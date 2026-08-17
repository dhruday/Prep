# Vector Databases — How Similarity Search Works Internally
> Part 21 — Generative AI for Full Stack Engineers · RAG
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **A vector database stores high-dimensional float arrays (embeddings) and finds the most similar ones for a query vector** — "similar" means geometrically close in the N-dimensional space; the database's job is to do this search faster than scanning every row
- **Cosine similarity measures the angle between two vectors** — not their length; two embeddings with cosine similarity of 1.0 are identical in meaning; 0.0 means orthogonal/unrelated; -1.0 means opposite meaning; threshold of 0.65-0.75 is a typical "relevant" cutoff for RAG
- **Exact nearest neighbour (kNN) is O(n) — too slow at scale**: scanning every vector to find the top-k closest hits takes linear time over the entire database; at 10 million documents, this is seconds per query; ANN (approximate nearest neighbour) with HNSW index reduces this to O(log n) with a small accuracy trade-off
- **HNSW (Hierarchical Navigable Small World)** creates a multi-layer graph where each node connects to its nearest neighbours; search starts at the top sparse layer, finds approximate nearest, drops down to bottom dense layer for precision; this is what pgvector's HNSW index and Pinecone use under the hood
- **pgvector is the pragmatic starting point**: adds a `VECTOR` column type to Postgres; enables cosine+L2 searches; HNSW index handles millions of vectors; if you already run Postgres, this is zero new infrastructure — Spring AI provides native support
- **When to leave pgvector**: when you need multi-tenant namespace isolation at scale, built-in metadata filtering, or automatic horizontal sharding of billions of vectors — then move to Pinecone, Weaviate, or Qdrant

---

## 1. One-Line Definition
A vector database is a storage and search system purpose-built to find the k most semantically similar items (by cosine or L2 distance between embedding vectors) for an arbitrary query vector, using approximate nearest neighbour (ANN) algorithms to do so in milliseconds at scale.

---

## 2. Why Regular Databases Don't Work for This

```
Standard relational query: 
  SELECT * FROM documents WHERE category = 'refund';
  → Exact match; fast with a B-tree index; O(log n)

Vector similarity query:
  "Find me the 3 documents most semantically similar 
   to this 1536-dimensional float array."
  
  Naive SQL: 
  SELECT *, (embedding <=> query_vector) AS distance
  FROM documents
  ORDER BY distance
  LIMIT 3;
  
  → Sequential scan; computes distance for EVERY row; O(n)
  → At 1M documents: takes 2-5 seconds — unusable for real-time RAG

Solution: ANN index (HNSW or IVFFlat) reduces this to O(log n)
  → At 1M documents: takes 10-50ms — acceptable for RAG
```

---

## 3. How Cosine Similarity Works

```
Two documents become vectors after embedding:
  "Refunds are available within 7 days."
  → v1 = [0.12, -0.34, 0.09, ..., 0.22]   (1536 dimensions)
  
  "Returns accepted within one week of purchase."
  → v2 = [0.11, -0.32, 0.10, ..., 0.21]   (different numbers, similar direction)
  
  "The cat sat on the mat."
  → v3 = [-0.5, 0.7, -0.1, ..., 0.05]    (very different direction)

Cosine similarity formula:
  similarity(A, B) = (A · B) / (|A| × |B|)
  
  = dot product of A and B
    ─────────────────────────
    product of their magnitudes
    
  similarity(v1, v2) = 0.97  ← semantically related
  similarity(v1, v3) = 0.12  ← unrelated

Cosine distance = 1 - cosine_similarity
  v1 ↔ v2: distance = 0.03 (close)
  v1 ↔ v3: distance = 0.88 (far)

pgvector operator: <=>  (cosine distance, lower = more similar)
  SELECT content FROM documents ORDER BY embedding <=> query_vec LIMIT 3;
```

---

## 4. HNSW — How the Index Works

```
WITHOUT HNSW (exact kNN):
  Compare query against ALL N vectors → O(N) distance computations
  N = 1,000,000 documents: slow
  
WITH HNSW (Hierarchical Navigable Small World):
  Layer 0 (top): sparse graph, ~50 nodes, each connected to 4-8 nearest
  Layer 1:       denser graph, ~500 nodes
  Layer 2 (bottom): all N nodes, each connected to ~16 nearest

SEARCH ALGORITHM:
  1. Start at the entry point in the top sparse layer
  2. Greedy search: move to the neighbour closest to the query vector
  3. When no closer neighbour exists in this layer, drop down to the next layer
  4. Repeat until Layer 2 (all nodes)
  5. Return top-k nearest from final layer

Why it's fast:
  The sparse top layers quickly narrow the search to a small neighbourhood.
  The dense bottom layer refines within that neighbourhood.
  Total comparisons: O(log N) instead of O(N)

Trade-off: ANN, not exact NN
  HNSW returns approximate top-k, not guaranteed exact top-k.
  In practice, recall @ k=10 is 95-99% accurate at typical settings.
  For RAG, this is acceptable — you want semantically close chunks, 
  not a mathematically guaranteed global minimum.

HNSW parameters:
  m = 16      : connections per node; higher = better recall, more memory  
  ef_construction = 64: search width during build; higher = better index, slower build
  ef_search         : search width at query time; higher = better recall, slower query
```

---

## 5. pgvector in Practice

```sql
-- Setup
CREATE EXTENSION vector;

-- Table
CREATE TABLE vector_store (
    id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content   TEXT NOT NULL,
    metadata  JSONB,
    embedding VECTOR(1536)   -- must match embedding model dimensions
);

-- HNSW index (best for high-recall RAG)
CREATE INDEX ON vector_store 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Alternatively IVFFlat (faster build, slightly lower recall)
CREATE INDEX ON vector_store
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Query: top-3 most similar to a query vector
SELECT content, metadata, 1 - (embedding <=> '[0.1, -0.3, ...]') AS similarity
FROM vector_store
ORDER BY embedding <=> '[0.1, -0.3, ...]'
LIMIT 3;

-- With metadata filter (filter by document category before vector search)
SELECT content
FROM vector_store
WHERE metadata->>'category' = 'refund-policy'
ORDER BY embedding <=> '[0.1, -0.3, ...]'
LIMIT 3;
```

---

## 6. The Pattern in Practice

### Wrong Way — Adding vectors but not the index

```
❌ Missing HNSW index:

  Without index: ORDER BY embedding <=> query_vec executes as 
  a full sequential scan — every year the table grows, 
  every query gets slower.
  
  At 100K documents: ~200ms per query (borderline acceptable)
  At 1M documents: ~2 seconds per query (broken user experience)
```

```
✅ Add the HNSW index immediately:

  CREATE INDEX ON vector_store
  USING hnsw (embedding vector_cosine_ops) 
  WITH (m = 16, ef_construction = 64);
  
  With HNSW at 1M documents: 10-30ms per query ✅
  
  Also add:
  - withSimilarityThreshold(0.65) in Spring AI — filters 
    low-relevance results before they reach the LLM
  - Metadata pre-filter WHERE clause — narrows search to 
    the relevant document category before vector scan
```

---

## 7. Vector DB Comparison

```
DB          DEPLOYMENT     STRENGTHS                    START WHEN
─────────────────────────────────────────────────────────────────────────
pgvector    Self-hosted     Postgres-native; zero new    Always start here
            (add extension) infra; Spring AI support;    (works to ~10M docs)
                            SQL metadata filters

Pinecone    Managed SaaS    Serverless; auto-scale;      When pgvector ops
                            namespace isolation;          become expensive; 
                            built-in metadata filtering;  or > 10M vectors
                            REST API + Java SDK

Weaviate    Managed/        Open source; GraphQL API;    Multi-modal data;
            Self-hosted     multi-modal (text+image);    hybrid search needed
                            hybrid search; schema-aware

Qdrant      Managed/        Open source; payload         Alternative to 
            Self-hosted     filter performance;          Weaviate; good 
                            Rust-based (fast);           for custom deployments
                            REST + gRPC API
```

---

## 8. Interview Questions & Model Answers

### Q1 — Internals
**Interviewer:** "How does a vector database find similar documents quickly?"

**Hruday:**
> "Without an index, it would scan every stored vector and compute cosine distance — O(n), which becomes seconds at a million documents. Vector databases use approximate nearest neighbour algorithms, specifically HNSW in most modern implementations. HNSW builds a multi-layered graph where each node is connected to its nearest neighbours. At query time, it starts at the top sparse layer, greedily moves toward the query vector's neighbourhood, then drops to denser layers for finer precision. The result is O(log n) search time with 95-99% recall accuracy — a small trade-off in exactness for a huge gain in speed."

---

## 9. Scale Evolution

**Prototype (< 100K docs) →** pgvector; IVFFlat index; no metadata filtering needed; Spring AI auto-manages.

**Production (100K - 10M docs) →** pgvector + HNSW; similarity threshold; metadata pre-filter; monitor query latency.

**Large scale (> 10M docs) →** Consider Pinecone or Weaviate; namespace per tenant; horizontal sharding; dedicated vector infrastructure; hybrid search (Topic 369).

---

## 10. Company Relevance

| Company | Vector DB concern | Interview signal |
|---------|------------------|-----------------|
| Razorpay / PhonePe | Transaction-linked document retrieval; merchant-specific document isolation | Metadata filter for merchant_id namespace; pgvector starting point with clear upgrade path |
| Swiggy / Meesho | Million-item catalogue search; semantic product search | HNSW at scale; hybrid search (vector + keyword for product names) |
| Adobe / Microsoft | Azure AI Search has native vector search capabilities; enterprise-scale vector retrieval | Azure AI Search knowledge store; HNSW under the hood; REST API integration from Spring |
| SAP Labs | SAP AI Core vector search; customer knowledge base isolation | Multi-tenant namespace design; no cross-customer data leakage in retrieval |

---

## 11. Related Topics — What to Study Next

- **Topic 345 — Embeddings** — how text becomes the vectors stored here
- **Topic 365 — pgvector Deep Dive** — production pgvector configuration in detail
- **Topic 366 — Pinecone** — when and how to migrate from pgvector to managed service
- **Topic 368 — HNSW Indexing** — full HNSW algorithm walkthrough

---

*Part 21 · Vector Databases — How Similarity Search Works Internally · Full Stack Interview Guide · Hruday D · 2026*
