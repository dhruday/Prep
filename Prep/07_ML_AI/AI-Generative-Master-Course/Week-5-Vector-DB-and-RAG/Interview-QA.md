# 🎯 Week 5 Interview Questions: Vector DB & RAG

## 📚 Table of Contents
1. [Conceptual Questions](#-conceptual-questions)
2. [Technical Deep Dive](#-technical-deep-dive)
3. [System Design Questions](#-system-design-questions)
4. [Coding Challenges](#-coding-challenges)
5. [Behavioral Scenarios](#-behavioral-scenarios)

---

## 💡 Conceptual Questions

### Q1: What is a Vector Database and why do we need it for AI applications?

**Answer:**

A **Vector Database** is a specialized database designed to store, index, and query high-dimensional vectors (embeddings).

**Why we need it:**

| Traditional DB | Vector DB |
|----------------|-----------|
| Exact match queries | Semantic similarity |
| Keyword search | Meaning-based search |
| Structured data | Unstructured data |
| SQL queries | ANN algorithms |

**Key capabilities:**
1. **Store embeddings:** High-dimensional vectors (512-4096 dimensions)
2. **Fast similarity search:** Using ANN (Approximate Nearest Neighbor) algorithms
3. **Scale:** Handle millions/billions of vectors
4. **Metadata filtering:** Combine vector search with traditional filters

**AI Application Use Cases:**
- Semantic search (find similar documents by meaning)
- Recommendation systems (similar items/users)
- RAG (retrieve relevant context for LLMs)
- Image similarity search
- Anomaly detection

---

### Q2: Explain the difference between exact nearest neighbor and approximate nearest neighbor search.

**Answer:**

| Aspect | Exact NN | Approximate NN |
|--------|----------|----------------|
| **Accuracy** | 100% accurate | ~95-99% accurate |
| **Speed** | O(n) - slow | O(log n) - fast |
| **Scalability** | Poor for large datasets | Excellent |
| **Memory** | Full scan required | Index structures |
| **Use Case** | Small datasets, critical accuracy | Production systems |

**Exact NN:**
- Compares query against EVERY vector
- Guarantees finding the true nearest neighbors
- Time complexity: O(n × d) where n=vectors, d=dimensions
- Practical limit: ~10,000 vectors

**Approximate NN (ANN):**
- Uses clever indexing structures
- May miss some true neighbors
- Trade-off: small accuracy loss for massive speed gains

**Common ANN Algorithms:**

1. **HNSW (Hierarchical Navigable Small World)**
   - Best overall performance
   - Multiple layers of graphs
   - Used by: ChromaDB, Pinecone, Qdrant

2. **IVF (Inverted File Index)**
   - Clusters vectors into buckets
   - Only searches relevant clusters
   - Used by: FAISS

3. **LSH (Locality Sensitive Hashing)**
   - Hash functions that preserve similarity
   - Similar items hash to same bucket
   - Used by: Older systems

---

### Q3: What is RAG and how does it solve the limitations of LLMs?

**Answer:**

**RAG = Retrieval Augmented Generation**

A technique that combines retrieval systems with generative models to produce more accurate, grounded responses.

**LLM Limitations RAG Solves:**

| LLM Problem | RAG Solution |
|-------------|--------------|
| Knowledge cutoff | Retrieve current information |
| Hallucinations | Ground responses in retrieved facts |
| No private data | Access company-specific documents |
| Context limits | Select most relevant chunks |
| No citations | Provide source references |

**RAG Architecture:**

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│  Query  │────▶│  Retriever  │────▶│ Top-K Docs  │
└─────────┘     └─────────────┘     └──────┬──────┘
                                           │
                                           ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│ Answer  │◀────│     LLM     │◀────│   Prompt    │
└─────────┘     └─────────────┘     │ + Context   │
                                    └─────────────┘
```

**RAG Formula:**
$$P(answer|query) = \sum_{d \in D} P(d|query) \cdot P(answer|query, d)$$

Where:
- $P(d|query)$ = retrieval probability
- $P(answer|query, d)$ = generation probability given document

---

### Q4: What are embeddings and how do they enable semantic search?

**Answer:**

**Embeddings** are dense vector representations of data (text, images, audio) that capture semantic meaning in a high-dimensional space.

**Key Properties:**
1. **Similar items → Similar vectors**
2. **Dimensional:** Typically 384-4096 dimensions
3. **Learned:** Created by neural networks
4. **Dense:** Every dimension has a value (vs. sparse one-hot)

**How Semantic Search Works:**

```
Query: "comfortable shoes for running"
      ↓ Embedding Model
Query Vector: [0.2, -0.5, 0.8, ...]
      ↓ Similarity Search
Finds: "athletic sneakers with cushioning" (similar vector)
NOT: "shoe repair shop" (different vector despite word match)
```

**Why This Enables Semantic Search:**
- Traditional search: exact keyword matching
- Semantic search: meaning matching via vector similarity

**Similarity Metrics:**

1. **Cosine Similarity:**
$$\text{cos}(\mathbf{A}, \mathbf{B}) = \frac{\mathbf{A} \cdot \mathbf{B}}{||\mathbf{A}|| \cdot ||\mathbf{B}||}$$

2. **Euclidean Distance:**
$$d(\mathbf{A}, \mathbf{B}) = \sqrt{\sum_{i=1}^{n}(A_i - B_i)^2}$$

3. **Dot Product:**
$$\mathbf{A} \cdot \mathbf{B} = \sum_{i=1}^{n} A_i \cdot B_i$$

---

### Q5: Explain chunking strategies and when to use each.

**Answer:**

**Chunking** = Breaking documents into smaller pieces for embedding and retrieval.

**Why Chunk?**
1. Embedding models have token limits (512-8192)
2. Smaller chunks = more precise retrieval
3. Larger chunks = more context

**Chunking Strategies:**

| Strategy | Chunk Size | Use Case |
|----------|------------|----------|
| Fixed Size | 500-1000 chars | General purpose |
| Recursive | Variable | Structured text |
| Sentence | 1-3 sentences | Q&A systems |
| Semantic | Variable | Complex documents |
| Document | Full doc | Short documents |

**1. Fixed Size Chunking:**
```python
# Simple but may break mid-sentence
chunks = [text[i:i+500] for i in range(0, len(text), 500)]
```

**2. Recursive Character Splitting:**
```python
# Tries to split at natural boundaries
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""]
)
```

**3. Semantic Chunking:**
```python
# Groups semantically related sentences
# Uses embedding similarity to find natural breaks
```

**Best Practices:**
- **Overlap:** 10-20% overlap between chunks
- **Size:** 500-1500 tokens typically optimal
- **Test:** Experiment with your specific use case
- **Metadata:** Preserve section headers, page numbers

---

## 🔧 Technical Deep Dive

### Q6: How does HNSW (Hierarchical Navigable Small World) work?

**Answer:**

HNSW is the most popular ANN algorithm, used by most modern vector databases.

**Core Concepts:**

**1. NSW (Navigable Small World):**
- Graph where each node (vector) connects to several neighbors
- "Greedy routing" navigates from entry point toward query
- Like "six degrees of separation"

**2. Hierarchical Layers:**
- Multiple layers of graphs
- Top layers: sparse, long-distance connections
- Bottom layers: dense, local connections
- Start search at top, descend to bottom

```
Layer 2:  [A]═══════════════[H]
           ║                 ║
Layer 1:  [A]═══[C]═══[E]═══[H]
           ║    ║     ║     ║
Layer 0:  [A]-[B]-[C]-[D]-[E]-[F]-[G]-[H]
```

**Search Process:**
1. Enter at top layer
2. Greedily move to nearest neighbor of query
3. When can't improve, descend to next layer
4. Repeat until bottom layer
5. Return K nearest neighbors

**Key Parameters:**

| Parameter | Description | Typical Value |
|-----------|-------------|---------------|
| `M` | Connections per node | 16-64 |
| `ef_construction` | Search width during build | 100-200 |
| `ef_search` | Search width during query | 50-200 |

**Trade-offs:**
- Higher M = better recall, more memory
- Higher ef = better recall, slower search

---

### Q7: How do you handle document updates in a RAG system?

**Answer:**

Document updates are challenging because:
1. Need to track which chunks belong to which document
2. Must maintain consistency during updates
3. Performance impact of frequent updates

**Strategies:**

**1. Full Re-indexing (Simple):**
```python
def update_document(doc_id, new_content):
    # Delete all chunks for this document
    vectorstore.delete(filter={"doc_id": doc_id})
    
    # Re-chunk and re-embed
    chunks = splitter.split_text(new_content)
    
    # Add new chunks
    vectorstore.add_documents(
        documents=chunks,
        metadatas=[{"doc_id": doc_id, "chunk_idx": i} 
                   for i in range(len(chunks))]
    )
```

**2. Chunk-level Updates (Efficient):**
```python
def update_document_smart(doc_id, new_content):
    # Get existing chunks
    existing = get_chunks(doc_id)
    new_chunks = splitter.split_text(new_content)
    
    # Compare using content hash
    for i, (old, new) in enumerate(zip(existing, new_chunks)):
        if hash(old) != hash(new):
            update_chunk(doc_id, i, new)
    
    # Handle length changes
    if len(new_chunks) > len(existing):
        add_chunks(doc_id, new_chunks[len(existing):])
    elif len(new_chunks) < len(existing):
        delete_chunks(doc_id, range(len(new_chunks), len(existing)))
```

**3. Versioning (Audit Trail):**
```python
# Keep all versions, mark latest
metadata = {
    "doc_id": doc_id,
    "version": version,
    "is_current": True,
    "updated_at": timestamp
}
# Query with filter: {"is_current": True}
```

**Best Practices:**
- Store document version/timestamp in metadata
- Use soft deletes for audit trails
- Batch updates during low-traffic periods
- Consider CDC (Change Data Capture) for source systems

---

### Q8: How do you evaluate a RAG system?

**Answer:**

RAG evaluation covers both **retrieval** and **generation** components.

**Retrieval Metrics:**

| Metric | Formula | What it Measures |
|--------|---------|------------------|
| Recall@K | $\frac{\text{relevant retrieved}}{\text{total relevant}}$ | Coverage |
| Precision@K | $\frac{\text{relevant retrieved}}{K}$ | Accuracy |
| MRR | $\frac{1}{n}\sum_{i=1}^{n}\frac{1}{\text{rank}_i}$ | Ranking quality |
| NDCG | Normalized Discounted Cumulative Gain | Ranked relevance |

**Generation Metrics:**

| Metric | What it Measures |
|--------|------------------|
| Faithfulness | Does answer align with retrieved context? |
| Relevance | Does answer address the question? |
| Answer Correctness | Is the answer factually correct? |
| Hallucination Rate | % of claims not supported by context |

**Evaluation Framework with RAGAS:**

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall
)

results = evaluate(
    dataset=eval_dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall
    ]
)
```

**Manual Evaluation Rubric:**

| Score | Criteria |
|-------|----------|
| 5 | Perfect - complete, accurate, well-sourced |
| 4 | Good - mostly accurate, minor issues |
| 3 | Acceptable - answers question, some inaccuracies |
| 2 | Poor - significant issues or incomplete |
| 1 | Fail - incorrect, irrelevant, or hallucinated |

**A/B Testing:**
- Compare different chunking strategies
- Test different embedding models
- Evaluate prompt variations
- Measure user satisfaction

---

### Q9: What is hybrid search and when should you use it?

**Answer:**

**Hybrid Search** = Combining semantic (vector) search with keyword (lexical) search.

**Why Hybrid?**

| Semantic Search | Keyword Search |
|-----------------|----------------|
| Understands meaning | Exact matches |
| Good for questions | Good for names, codes |
| May miss keywords | Misses synonyms |
| "What causes X?" | "Error code ABC123" |

**Implementation:**

```python
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_community.vectorstores import Chroma

# Vector retriever (semantic)
vector_retriever = Chroma(
    embedding_function=embeddings
).as_retriever(search_kwargs={"k": 5})

# BM25 retriever (keyword)
bm25_retriever = BM25Retriever.from_documents(
    documents, k=5
)

# Combine with Reciprocal Rank Fusion
hybrid_retriever = EnsembleRetriever(
    retrievers=[vector_retriever, bm25_retriever],
    weights=[0.6, 0.4]  # Favor semantic
)
```

**Reciprocal Rank Fusion (RRF):**
$$RRF(d) = \sum_{r \in R} \frac{1}{k + r(d)}$$

Where:
- $r(d)$ = rank of document $d$ in retriever $r$
- $k$ = constant (typically 60)

**When to Use:**

| Use Case | Recommendation |
|----------|----------------|
| General Q&A | Hybrid (60/40 semantic) |
| Code search | Hybrid (40/60 keyword) |
| Legal documents | Hybrid with metadata |
| Creative queries | Semantic only |
| Exact lookups | Keyword only |

---

### Q10: How do you handle multi-turn conversations in RAG?

**Answer:**

Multi-turn conversations require:
1. Maintaining context across turns
2. Resolving pronouns and references
3. Understanding conversation flow

**Strategies:**

**1. Query Rewriting:**
```python
def rewrite_query(conversation_history, current_query):
    """Rewrite query to be standalone"""
    
    messages = [
        {
            "role": "system",
            "content": """Rewrite the user's question to be standalone,
            incorporating context from the conversation.
            Only output the rewritten question."""
        },
        {
            "role": "user", 
            "content": f"""Conversation:
{format_history(conversation_history)}

Latest question: {current_query}

Rewritten question:"""
        }
    ]
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages,
        temperature=0
    )
    
    return response.choices[0].message.content
```

**Example:**
```
Turn 1: "Tell me about Python decorators"
Turn 2: "How do I use them with arguments?"
Rewritten: "How do I use Python decorators with arguments?"
```

**2. Context Accumulation:**
```python
class ConversationalRAG:
    def __init__(self):
        self.memory = ConversationBufferWindowMemory(k=5)
        self.all_retrieved_docs = []
    
    def chat(self, query):
        # Rewrite query
        standalone_query = self.rewrite_query(query)
        
        # Retrieve
        new_docs = self.retrieve(standalone_query)
        
        # Accumulate context (avoid duplicates)
        for doc in new_docs:
            if doc not in self.all_retrieved_docs:
                self.all_retrieved_docs.append(doc)
        
        # Generate with full context
        response = self.generate(
            query=query,
            context=self.all_retrieved_docs[-10:],  # Last 10 docs
            history=self.memory.load()
        )
        
        # Update memory
        self.memory.add(query, response)
        
        return response
```

**3. Summary-based Memory:**
```python
# For long conversations, summarize older context
def summarize_context(docs):
    summary = llm.invoke(
        f"Summarize the key information from: {docs}"
    )
    return summary

# Use summary + recent docs for context
context = summarize_context(old_docs) + recent_docs
```

---

## 🏗️ System Design Questions

### Q11: Design a document Q&A system for a 10,000-employee company

**Answer:**

**Requirements Gathering:**
- 500K documents (PDFs, Word, Confluence, etc.)
- 10,000 concurrent users peak
- Multiple departments with access controls
- 99.9% uptime SLA
- Sub-second search latency

**Architecture:**

```
┌──────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER                             │
└─────────────────────────────┬────────────────────────────────────┘
                              │
┌─────────────────────────────▼────────────────────────────────────┐
│                       API GATEWAY                                 │
│              (Rate Limiting, Auth, Routing)                       │
└───────┬─────────────────────┬────────────────────────┬───────────┘
        │                     │                        │
┌───────▼───────┐    ┌───────▼───────┐       ┌───────▼───────┐
│   CHAT API    │    │  SEARCH API   │       │  INGEST API   │
│ (Stateless)   │    │ (Stateless)   │       │   (Async)     │
│   x 10 pods   │    │   x 5 pods    │       │   x 3 pods    │
└───────┬───────┘    └───────┬───────┘       └───────┬───────┘
        │                    │                       │
        └────────────────────┼───────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      SERVICE MESH                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   RAG Core   │  │  Embedding   │  │   Document   │           │
│  │   Service    │  │   Service    │  │  Processor   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                      DATA LAYER                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Pinecone   │  │  PostgreSQL  │  │    Redis     │           │
│  │  (Vectors)   │  │   (Meta)     │  │   (Cache)    │           │
│  │   Managed    │  │   Cluster    │  │   Cluster    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │     S3       │  │   Kafka      │                              │
│  │  (Raw Docs)  │  │  (Events)    │                              │
│  └──────────────┘  └──────────────┘                              │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Component Details:**

**1. Document Ingestion:**
```python
# Async processing with Celery/Kafka
@task
def process_document(doc_id):
    # 1. Download from S3
    doc = s3.get_object(doc_id)
    
    # 2. Extract text (Unstructured.io)
    text = extract_text(doc)
    
    # 3. Chunk
    chunks = smart_chunker.split(text)
    
    # 4. Generate embeddings (batch)
    embeddings = embed_batch(chunks)
    
    # 5. Store in vector DB with namespace
    pinecone_index.upsert(
        vectors=embeddings,
        namespace=doc.department
    )
    
    # 6. Update metadata in Postgres
    db.update_doc_status(doc_id, "indexed")
```

**2. Access Control:**
```python
def search_with_acl(user, query):
    # Get user's permissions
    allowed_departments = get_user_permissions(user.id)
    
    # Search with namespace filtering
    results = []
    for dept in allowed_departments:
        dept_results = pinecone_index.query(
            vector=embed(query),
            namespace=dept,
            top_k=5
        )
        results.extend(dept_results)
    
    # Re-rank combined results
    return rerank(results, query)[:10]
```

**3. Caching Strategy:**
- Redis for frequent queries (TTL: 1 hour)
- Cache embeddings for common terms
- Cache document metadata
- Invalidate on document updates

**Scaling Considerations:**

| Component | Scaling Strategy |
|-----------|------------------|
| API | Horizontal (K8s HPA) |
| Embeddings | GPU nodes + batching |
| Vector DB | Managed service (Pinecone) |
| Processing | Queue-based workers |

**Cost Estimation (Monthly):**
- Pinecone: ~$2,000 (500K vectors)
- GPU (embeddings): ~$500
- OpenAI API: ~$5,000
- Infrastructure: ~$3,000
- **Total:** ~$10,500/month

---

### Q12: How would you reduce latency in a production RAG system?

**Answer:**

**Latency Breakdown:**
```
Total: 2-5 seconds
├── Embedding Query: 50-200ms
├── Vector Search: 10-50ms
├── Fetch Documents: 50-100ms
├── LLM Generation: 1-4 seconds ← Bottleneck
└── Network Overhead: 50-100ms
```

**Optimization Strategies:**

**1. Embedding Optimizations:**
```python
# Cache frequent query embeddings
@lru_cache(maxsize=10000)
def cached_embed(query: str):
    return embedding_model.embed(query)

# Use smaller, faster embedding model
# OpenAI ada-002: 50ms vs text-embedding-3-large: 100ms
```

**2. Vector Search Optimizations:**
```python
# Pre-filter by metadata before vector search
results = vectorstore.query(
    vector=query_vec,
    filter={
        "department": user_dept,
        "date": {"$gte": last_week}
    },
    top_k=5  # Limit K
)

# Use namespaces/collections for partitioning
# Search only relevant partition
```

**3. LLM Optimizations:**
```python
# Use streaming for perceived latency
async def stream_response(query, context):
    stream = await client.chat.completions.create(
        model="gpt-3.5-turbo",  # Faster than gpt-4
        messages=build_messages(query, context),
        stream=True,
        max_tokens=500  # Limit output length
    )
    
    async for chunk in stream:
        yield chunk.choices[0].delta.content

# Consider smaller/distilled models for simple queries
def select_model(query_complexity):
    if complexity < 0.3:
        return "gpt-3.5-turbo"
    else:
        return "gpt-4"
```

**4. Caching:**
```python
# Semantic cache - find similar past queries
def semantic_cache_lookup(query):
    similar = cache_vectorstore.similarity_search(
        query, 
        score_threshold=0.95  # High similarity
    )
    if similar:
        return cache.get(similar[0].id)
    return None

# Result cache
@cache(ttl=3600)
def cached_rag_query(query_hash, context_hash):
    return generate_response(query, context)
```

**5. Parallel Processing:**
```python
import asyncio

async def fast_rag(query):
    # Parallel: embed + warm up LLM connection
    embed_task = asyncio.create_task(async_embed(query))
    warmup_task = asyncio.create_task(warmup_llm())
    
    query_vec = await embed_task
    
    # Parallel: search multiple indexes
    search_tasks = [
        search_index(idx, query_vec) 
        for idx in indexes
    ]
    results = await asyncio.gather(*search_tasks)
    
    # Generate (streaming)
    await warmup_task
    return stream_generate(query, merge_results(results))
```

**Latency Targets:**

| Tier | P50 | P99 | Use Case |
|------|-----|-----|----------|
| Real-time | <1s | <2s | Chat, search |
| Near-real-time | <3s | <5s | Detailed analysis |
| Batch | <30s | <60s | Report generation |

---

## 💻 Coding Challenges

### Q13: Implement a simple vector database from scratch

**Challenge:** Build a basic vector database with add, search, and delete operations.

```python
"""
Implement a Vector Database from scratch
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
import heapq

class SimpleVectorDB:
    def __init__(self, dimension: int):
        """
        Initialize vector database
        
        Args:
            dimension: Size of vectors to store
        """
        self.dimension = dimension
        self.vectors: Dict[str, np.ndarray] = {}
        self.metadata: Dict[str, Dict] = {}
    
    def add(
        self, 
        id: str, 
        vector: List[float], 
        metadata: Optional[Dict] = None
    ) -> None:
        """
        Add a vector to the database
        
        Args:
            id: Unique identifier
            vector: Vector to store
            metadata: Optional metadata
        """
        if len(vector) != self.dimension:
            raise ValueError(f"Vector dimension must be {self.dimension}")
        
        self.vectors[id] = np.array(vector, dtype=np.float32)
        self.metadata[id] = metadata or {}
    
    def add_batch(
        self, 
        items: List[Tuple[str, List[float], Optional[Dict]]]
    ) -> None:
        """Add multiple vectors"""
        for id, vector, metadata in items:
            self.add(id, vector, metadata)
    
    def delete(self, id: str) -> bool:
        """Delete a vector by ID"""
        if id in self.vectors:
            del self.vectors[id]
            del self.metadata[id]
            return True
        return False
    
    def _cosine_similarity(
        self, 
        v1: np.ndarray, 
        v2: np.ndarray
    ) -> float:
        """Calculate cosine similarity"""
        dot_product = np.dot(v1, v2)
        norm_v1 = np.linalg.norm(v1)
        norm_v2 = np.linalg.norm(v2)
        
        if norm_v1 == 0 or norm_v2 == 0:
            return 0.0
        
        return dot_product / (norm_v1 * norm_v2)
    
    def _euclidean_distance(
        self, 
        v1: np.ndarray, 
        v2: np.ndarray
    ) -> float:
        """Calculate euclidean distance"""
        return np.linalg.norm(v1 - v2)
    
    def search(
        self, 
        query_vector: List[float], 
        k: int = 5,
        metric: str = "cosine",
        filter: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Search for k nearest neighbors
        
        Args:
            query_vector: Query vector
            k: Number of results
            metric: "cosine" or "euclidean"
            filter: Metadata filter
            
        Returns:
            List of results with id, score, metadata
        """
        if len(query_vector) != self.dimension:
            raise ValueError(f"Query vector dimension must be {self.dimension}")
        
        query = np.array(query_vector, dtype=np.float32)
        
        # Calculate similarities/distances
        scores = []
        for id, vector in self.vectors.items():
            # Apply filter
            if filter:
                metadata = self.metadata[id]
                if not self._matches_filter(metadata, filter):
                    continue
            
            if metric == "cosine":
                score = self._cosine_similarity(query, vector)
            else:  # euclidean
                score = -self._euclidean_distance(query, vector)
            
            scores.append((score, id))
        
        # Get top k (using heap for efficiency)
        top_k = heapq.nlargest(k, scores, key=lambda x: x[0])
        
        # Format results
        results = []
        for score, id in top_k:
            results.append({
                "id": id,
                "score": float(score),
                "metadata": self.metadata[id]
            })
        
        return results
    
    def _matches_filter(self, metadata: Dict, filter: Dict) -> bool:
        """Check if metadata matches filter"""
        for key, value in filter.items():
            if key not in metadata:
                return False
            if isinstance(value, dict):
                # Handle operators like $gt, $lt, $in
                for op, op_value in value.items():
                    if op == "$gt" and not metadata[key] > op_value:
                        return False
                    elif op == "$lt" and not metadata[key] < op_value:
                        return False
                    elif op == "$in" and metadata[key] not in op_value:
                        return False
            elif metadata[key] != value:
                return False
        return True
    
    def __len__(self) -> int:
        return len(self.vectors)


# ============================================
# TEST THE IMPLEMENTATION
# ============================================

if __name__ == "__main__":
    # Create database
    db = SimpleVectorDB(dimension=3)
    
    # Add vectors
    db.add("doc1", [1.0, 0.0, 0.0], {"category": "tech"})
    db.add("doc2", [0.9, 0.1, 0.0], {"category": "tech"})
    db.add("doc3", [0.0, 1.0, 0.0], {"category": "health"})
    db.add("doc4", [0.1, 0.9, 0.1], {"category": "health"})
    
    # Search
    results = db.search([1.0, 0.0, 0.0], k=2)
    print("Top 2 similar to [1,0,0]:")
    for r in results:
        print(f"  {r['id']}: {r['score']:.3f}")
    
    # Search with filter
    results = db.search(
        [0.5, 0.5, 0.0], 
        k=2,
        filter={"category": "tech"}
    )
    print("\nTop 2 in 'tech' category:")
    for r in results:
        print(f"  {r['id']}: {r['score']:.3f}")
```

---

### Q14: Implement a RAG pipeline with LangChain

**Challenge:** Build a complete RAG pipeline with document loading, chunking, indexing, and querying.

```python
"""
Complete RAG Pipeline Implementation
"""

from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain_community.document_loaders import TextLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from typing import List
import os

class RAGPipeline:
    def __init__(
        self,
        persist_directory: str = "./rag_db",
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        self.embeddings = OpenAIEmbeddings()
        self.llm = ChatOpenAI(model="gpt-4", temperature=0)
        self.persist_directory = persist_directory
        
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        self.vectorstore = None
        self._load_or_create_vectorstore()
    
    def _load_or_create_vectorstore(self):
        """Load existing or create new vectorstore"""
        if os.path.exists(self.persist_directory):
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings
            )
        else:
            self.vectorstore = Chroma(
                persist_directory=self.persist_directory,
                embedding_function=self.embeddings
            )
    
    def ingest_documents(self, file_paths: List[str]) -> int:
        """
        Ingest documents into the vector store
        
        Args:
            file_paths: List of file paths to ingest
            
        Returns:
            Number of chunks indexed
        """
        all_docs = []
        
        for path in file_paths:
            # Select loader based on file type
            if path.endswith(".pdf"):
                loader = PyPDFLoader(path)
            else:
                loader = TextLoader(path)
            
            docs = loader.load()
            
            # Add source to metadata
            for doc in docs:
                doc.metadata["source"] = os.path.basename(path)
            
            all_docs.extend(docs)
        
        # Split into chunks
        chunks = self.splitter.split_documents(all_docs)
        
        # Add to vectorstore
        self.vectorstore.add_documents(chunks)
        
        return len(chunks)
    
    def _format_docs(self, docs) -> str:
        """Format documents for context"""
        return "\n\n".join([
            f"[Source: {doc.metadata.get('source', 'Unknown')}]\n{doc.page_content}"
            for doc in docs
        ])
    
    def create_chain(self):
        """Create the RAG chain"""
        
        # Retriever
        retriever = self.vectorstore.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5}
        )
        
        # Prompt
        prompt = ChatPromptTemplate.from_template("""
You are a helpful assistant that answers questions based on the provided context.

Context:
{context}

Question: {question}

Instructions:
- Answer based ONLY on the provided context
- If the context doesn't contain the answer, say "I don't have enough information"
- Cite sources when possible
- Be concise but thorough

Answer:
        """)
        
        # Chain
        chain = (
            {"context": retriever | self._format_docs, "question": RunnablePassthrough()}
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
        return chain
    
    def query(self, question: str) -> dict:
        """
        Query the RAG system
        
        Args:
            question: User question
            
        Returns:
            Dict with answer and sources
        """
        # Get relevant documents
        docs = self.vectorstore.similarity_search(question, k=5)
        
        # Create and run chain
        chain = self.create_chain()
        answer = chain.invoke(question)
        
        return {
            "answer": answer,
            "sources": [
                {
                    "source": doc.metadata.get("source", "Unknown"),
                    "content": doc.page_content[:200] + "..."
                }
                for doc in docs
            ]
        }
    
    def query_with_history(
        self, 
        question: str, 
        history: List[tuple]
    ) -> dict:
        """Query with conversation history"""
        
        # Build history string
        history_str = ""
        for q, a in history[-3:]:  # Last 3 turns
            history_str += f"User: {q}\nAssistant: {a}\n\n"
        
        # Rewrite question to be standalone
        rewrite_prompt = ChatPromptTemplate.from_template("""
Given this conversation history:
{history}

Rewrite this question to be standalone (include all necessary context):
{question}

Standalone question:
        """)
        
        rewrite_chain = rewrite_prompt | self.llm | StrOutputParser()
        standalone_question = rewrite_chain.invoke({
            "history": history_str,
            "question": question
        })
        
        # Query with rewritten question
        return self.query(standalone_question)


# ============================================
# USAGE EXAMPLE
# ============================================

if __name__ == "__main__":
    # Initialize pipeline
    rag = RAGPipeline()
    
    # Ingest documents
    chunks = rag.ingest_documents(["doc1.txt", "doc2.pdf"])
    print(f"Indexed {chunks} chunks")
    
    # Query
    result = rag.query("What is the main topic?")
    print(f"Answer: {result['answer']}")
    print(f"Sources: {[s['source'] for s in result['sources']]}")
```

---

## 🎭 Behavioral Scenarios

### Q15: Your RAG system is returning irrelevant results. How do you debug it?

**Answer:**

**Systematic Debugging Approach:**

**Step 1: Identify the Problem Layer**
```
Query → Embedding → Retrieval → Context → Generation → Response
   └─ Is the issue in retrieval or generation?
```

**Step 2: Retrieval Debugging**
```python
def debug_retrieval(query, expected_doc_id):
    # 1. Check embedding
    query_embedding = embeddings.embed_query(query)
    print(f"Query embedding norm: {np.linalg.norm(query_embedding)}")
    
    # 2. Get retrieved documents
    results = vectorstore.similarity_search_with_relevance_scores(
        query, k=10
    )
    
    print("\nTop 10 retrieved documents:")
    for doc, score in results:
        print(f"  Score: {score:.3f} | {doc.metadata['source'][:50]}")
    
    # 3. Check if expected document exists
    expected = vectorstore.get(expected_doc_id)
    if expected:
        # Calculate similarity
        expected_embedding = embeddings.embed_query(expected['content'])
        similarity = cosine_similarity(query_embedding, expected_embedding)
        print(f"\nExpected doc similarity: {similarity:.3f}")
    
    # 4. Analyze chunking
    print("\nChunk analysis:")
    print(f"  Expected content length: {len(expected['content'])}")
    print(f"  Was relevant content chunked properly?")
```

**Step 3: Common Issues & Fixes**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Wrong documents retrieved | Poor chunking | Adjust chunk size, overlap |
| Relevant doc not found | Embedding mismatch | Try different embedding model |
| Scores all similar | Vector space issue | Normalize embeddings |
| Metadata filter excludes | Wrong filter logic | Debug filter conditions |

**Step 4: Generation Debugging**
```python
def debug_generation(query, retrieved_docs, response):
    print("=== Context Analysis ===")
    print(f"Query: {query}")
    print(f"Context length: {sum(len(d.page_content) for d in retrieved_docs)}")
    
    # Check if answer is in context
    for doc in retrieved_docs:
        # Simple check - does context mention key terms?
        key_terms = extract_key_terms(query)
        matches = [t for t in key_terms if t.lower() in doc.page_content.lower()]
        print(f"  Doc matches {len(matches)}/{len(key_terms)} key terms")
    
    print("\n=== Response Analysis ===")
    print(f"Response length: {len(response)}")
    print(f"Hallucination check: {detect_hallucination(response, retrieved_docs)}")
```

**Step 5: Implement Monitoring**
```python
# Log all queries for analysis
def monitored_query(query):
    start = time.time()
    
    # Retrieval
    docs = retrieve(query)
    retrieval_time = time.time() - start
    
    # Generation
    response = generate(query, docs)
    total_time = time.time() - start
    
    # Log
    log_query({
        "query": query,
        "retrieval_time": retrieval_time,
        "total_time": total_time,
        "num_docs": len(docs),
        "top_doc_score": docs[0].score if docs else 0,
        "response_length": len(response)
    })
    
    return response
```

---

### Q16: A customer reports the chatbot is "making things up." How do you address this?

**Answer:**

**Immediate Response:**

1. **Acknowledge:** "Thank you for reporting. Accuracy is our top priority."
2. **Gather details:** "Can you share the specific query and response?"
3. **Investigate:** Check logs, reproduce the issue

**Root Cause Analysis:**

```python
def analyze_hallucination(query, response):
    # 1. Get context that was used
    context = get_context_from_logs(query)
    
    # 2. Check claims in response
    claims = extract_claims(response)
    
    verification = []
    for claim in claims:
        # Is claim supported by context?
        supported = verify_claim_in_context(claim, context)
        verification.append({
            "claim": claim,
            "supported": supported,
            "evidence": find_evidence(claim, context)
        })
    
    # 3. Calculate hallucination rate
    hallucination_rate = sum(1 for v in verification if not v["supported"]) / len(claims)
    
    return {
        "hallucination_rate": hallucination_rate,
        "unsupported_claims": [v for v in verification if not v["supported"]]
    }
```

**Mitigation Strategies:**

**1. Prompt Engineering:**
```python
SYSTEM_PROMPT = """
You are a helpful assistant. STRICT RULES:
1. ONLY use information from the provided context
2. If the context doesn't contain the answer, say "I don't have this information"
3. NEVER make up facts, statistics, or quotes
4. Always indicate confidence level
5. Cite specific sources for claims

Context: {context}
"""
```

**2. Output Verification:**
```python
def verified_response(query, response, context):
    verification_prompt = f"""
    Verify this response against the context.
    
    Response: {response}
    Context: {context}
    
    For each factual claim:
    1. Is it supported by the context? (Yes/No)
    2. If not supported, mark as [UNVERIFIED]
    
    Return the response with [UNVERIFIED] markers.
    """
    
    verified = llm.invoke(verification_prompt)
    
    if "[UNVERIFIED]" in verified:
        # Flag for review or regenerate
        return regenerate_conservative(query, context)
    
    return response
```

**3. Confidence Scoring:**
```python
def add_confidence(response, context):
    # Use model to rate confidence
    confidence_prompt = f"""
    Rate your confidence that this response is fully supported by the context.
    
    Response: {response}
    Context: {context}
    
    Confidence (0-100):
    """
    
    confidence = int(llm.invoke(confidence_prompt))
    
    if confidence < 70:
        return f"[Low Confidence] {response}\n\nPlease verify this information."
    
    return response
```

**Communication to Customer:**
- Share findings
- Explain mitigation steps
- Provide timeline for fixes
- Offer manual verification for critical queries

---

## 📝 Quick Reference Cheatsheet

### Key Concepts

| Term | Definition |
|------|------------|
| **Embedding** | Dense vector representation of data |
| **Vector DB** | Database optimized for similarity search |
| **RAG** | Retrieval-Augmented Generation |
| **Chunking** | Breaking documents into smaller pieces |
| **ANN** | Approximate Nearest Neighbor |
| **HNSW** | Hierarchical Navigable Small World (ANN algorithm) |
| **Hybrid Search** | Combining semantic + keyword search |

### Common Formulas

**Cosine Similarity:**
$$\cos(\theta) = \frac{A \cdot B}{||A|| \cdot ||B||}$$

**Euclidean Distance:**
$$d = \sqrt{\sum_{i=1}^{n}(a_i - b_i)^2}$$

**Recall@K:**
$$\text{Recall@K} = \frac{\text{Relevant items in top K}}{\text{Total relevant items}}$$

### Interview Tips

1. **Explain trade-offs:** Every choice has pros/cons
2. **Think about scale:** "That works for 100 docs, but at 1M..."
3. **Consider failure modes:** "What if retrieval fails?"
4. **Mention monitoring:** "We'd track these metrics..."
5. **Stay practical:** Real-world constraints matter

---

**Good luck with your interviews!** 🎯
