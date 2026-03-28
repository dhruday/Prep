# HNSW Indexing — How Approximate Nearest Neighbour Search Works
> Part 21 — Generative AI for Full Stack Engineers · Vector Databases
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Without HNSW, similarity search is O(n)**: compute distance from your query to every vector — 1 million cosine distance comparisons per query; fine for < 100K vectors, unusably slow at scale
- **HNSW is a multi-layer graph where upper layers skip long distances and lower layers handle precision**: think of it like a highway system — upper layers are highways (skip most nodes, jump far), lower layers are local roads (precise nearest neighbours); this makes search O(log n) — sub-millisecond even at 10M vectors
- **"Approximate"**: HNSW finds the ~95-99% correct nearest neighbours, not guaranteed 100%; this tradeoff (recall < 1.0 for dramatically faster search) is the entire point; for RAG, missing 1-2% of slightly-relevant chunks is acceptable
- **Three key parameters**: `m` (number of connections per node, default 16; higher = better recall, more memory); `ef_construction` (graph build quality, default 64; higher = better recall during build, slower build); `ef_search` (search beam width at query time, default 40; higher = better recall, slower query)
- **Memory cost**: HNSW index uses ~100-200 bytes per vector beyond the raw vector storage; 1M vectors of 1536 dims = 6GB raw + ~150MB HNSW overhead — manageable
- **Rebuild vs update**: HNSW supports incremental inserts (no full rebuild needed); deletes mark vectors as deleted but don't free memory until a manual reindex; periodic reindex for large delete volumes

---

## 1. One-Line Definition
HNSW (Hierarchical Navigable Small World) is a multi-layer graph index that finds approximate nearest neighbours in O(log n) time by navigating from coarse highway layers to fine-grained local layers — making sub-100ms semantic search practical at millions of scale.

---

## 2. How It Works — The Layers

```
HNSW GRAPH STRUCTURE (simplified)

Layer 3 (top — highway):  A ─────────────────────── F
                          (few nodes, long-range skip links)

Layer 2:            A ──── C ──────── E ─── F
                    (more nodes, medium-range links)

Layer 1:            A ─ B ─ C ─ D ─ E ─ F
                    (more nodes, shorter-range links)

Layer 0 (bottom — local neighbourhood):  A─B─C─D─E─F─G─H...
                    (all nodes, precise nearest neighbour graph)

SEARCH PROCESS for query Q:
1. Start at entry node on top layer
2. Greedy walk toward Q's nearest neighbour on top layer
3. Drop to next layer at the closest node found
4. Repeat: greedy walk → drop layer
5. At Layer 0: exhaustive search in the small local neighbourhood
6. Return top-k results
```

---

## 3. The Math Intuition

Cosine similarity between two vectors u and v:

$$\text{similarity}(u, v) = \frac{u \cdot v}{\|u\| \|v\|}$$

HNSW never computes this for all N vectors. It navigates the graph, computing cosine distance only for the nodes it visits — typically O(log N × m) comparisons instead of O(N).

**Recall = fraction of true nearest neighbours found**:
- Higher `ef_search` → more nodes visited → higher recall → slower
- Lower `ef_search` → fewer nodes visited → lower recall → faster
- Production sweet spot: `ef_search = 40-100` for > 95% recall at < 50ms

---

## 4. pgvector — HNSW Index in Practice

```sql
-- Create HNSW index for cosine distance
CREATE INDEX document_embedding_hnsw_idx
ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (
    m              = 16,    -- connections per node; increase to 32 for better recall
    ef_construction = 64    -- build quality; increase to 128 for large, important indexes
);

-- At query time, control ef_search per session
SET hnsw.ef_search = 64;   -- default: 40; increase → better recall, slower

-- Monitor index build progress
SELECT 
    phase,
    blocks_done,
    blocks_total,
    ROUND(100.0 * blocks_done / NULLIF(blocks_total, 0), 1) AS pct_complete
FROM pg_stat_progress_create_index
WHERE relid = 'document_chunks'::regclass;

-- After index creation, verify it's being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT content, 1-(embedding <=> '[0.1,0.2,...]'::vector) AS score
FROM document_chunks
ORDER BY embedding <=> '[0.1,0.2,...]'::vector
LIMIT 5;
-- Look for: "Index Scan using document_embedding_hnsw_idx"
```

---

## 5. Parameter Tuning Guide

| Parameter | Low value | High value | Recommended default |
|-----------|-----------|-----------|-------------------|
| `m` | Faster build, lower recall | Slower build, higher recall, more memory | 16 |
| `ef_construction` | Faster build, lower recall | Slower build, higher recall | 64 |
| `ef_search` | Faster query, lower recall | Slower query, higher recall | 40-100 |

```
Optimise for use case:
  → Customer support FAQ (precision matters):   m=16, ef_construction=64, ef_search=100
  → Product recommendations (speed matters):    m=16, ef_construction=64, ef_search=40
  → Legal document retrieval (recall critical): m=32, ef_construction=128, ef_search=150
```

---

## 6. HNSW vs IVFFlat (the other pgvector index)

| Index | Build speed | Query speed | Memory | Recall |
|-------|------------|-------------|--------|--------|
| **HNSW** | Slow | Fast | High | High (95-99%) |
| IVFFlat | Fast | Moderate | Low | Moderate (90-95%) |
| No index (sequential scan) | N/A | Very slow O(n) | None | 100% |

**Use HNSW** unless: vector table is > 100GB and memory is a hard constraint; in that case, IVFFlat requires fewer resources.

---

## 7. Wrong Way vs Right Way

```sql
-- ❌ Large dataset, no index — O(n) full scan
-- 1M vectors × 1536 dims × 4 bytes = 6GB of data scanned per query
-- Result: 5-20 second query time
SELECT content FROM document_chunks 
ORDER BY embedding <=> $1 LIMIT 5;
```

```sql
-- ✅ HNSW index — O(log n) approximate nearest neighbour
-- Same 1M vectors: 10-30ms query time with 97%+ recall
-- Build the index first:
CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);

-- Query unchanged — Postgres planner automatically uses the index
SELECT content FROM document_chunks 
ORDER BY embedding <=> $1 LIMIT 5;
```

---

## 8. Scale Evolution

**Prototype →** No HNSW index needed for < 50K vectors; sequential scan is fast enough; monitor query latency.

**Production →** HNSW index when query latency exceeds 50ms (typically at 100K+ vectors); build during a maintenance window (single-threaded, locks table); default params `m=16, ef_construction=64`.

**High scale →** Higher `m` and `ef_construction` for large indexes (> 5M vectors); `ef_search` tuned per query type; partitioned table with separate HNSW index per partition (domain or tenant) reduces index size × faster build × independent rebuild; consider migrating to Qdrant/Pinecone when build times exceed maintenance windows.

---

## 9. Company Relevance

| Company | HNSW relevance | Interview signal |
|---------|---------------|-----------------|
| Razorpay / PhonePe | Fast retrieval for support chatbot over 500K FAQ + policy documents | Describe HNSW + ef_search tuning for p99 < 30ms |
| Swiggy / Meesho | Product catalogue with 5M+ items → HNSW is mandatory | Horizontal partitioning by category; separate index per partition |
| Adobe / Microsoft | Doc search over large corpus — recall accuracy matters | Higher ef_search for legal/compliance retrieval; explain recall vs speed tradeoff |
| SAP Labs | ERP knowledge base — performance SLA on AI suggestions | Monitor via EXPLAIN ANALYZE; set ef_search per query type |

---

## 10. Interview Questions & Model Answers

### Q1 — How does HNSW work and why is it used for vector search?
**Hruday:**
> "HNSW builds a multi-layer graph where each layer represents a different granularity of neighbourhood. The top layer is a highway — it connects far-apart nodes and lets you jump across the graph in one hop. Lower layers are progressively finer-grained. When I search for the nearest neighbour of a query vector, I enter the graph at the top layer, greedily walk toward the query, then descend to the next layer at the closest node I found, and repeat until I'm at the bottom layer doing a precise local search. This turns an O(n) brute-force scan into O(log n). The tradeoff is approximate results — I might miss 1-3% of truly relevant vectors — but for RAG and similarity search, that tradeoff is completely acceptable. In pgvector, I create it with `CREATE INDEX USING hnsw (embedding vector_cosine_ops)` and tune `m` for recall-memory balance and `ef_search` at query time for speed-recall balance."

---

*Part 21 · HNSW Indexing — How Approximate Nearest Neighbour Search Works · Full Stack Interview Guide · Hruday D · 2026*
