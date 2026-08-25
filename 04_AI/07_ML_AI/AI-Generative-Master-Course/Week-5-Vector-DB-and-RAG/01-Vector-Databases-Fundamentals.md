# 🗄️ Vector Databases: Fundamentals

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Why Vector Databases?](#-why-vector-databases)
3. [Core Concepts](#-core-concepts)
4. [Vector Search Algorithms](#-vector-search-algorithms)
5. [Popular Vector Databases](#-popular-vector-databases)
6. [Mathematical Foundations](#-mathematical-foundations)
7. [Implementation](#-implementation)
8. [Performance Optimization](#-performance-optimization)
9. [Interview Questions](#-interview-questions)
10. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is a Vector Database?

```
Traditional Database vs Vector Database

TRADITIONAL DATABASE:
┌──────────────────────────────────────────┐
│ id │ name    │ age │ city              │
├────┼─────────┼─────┼───────────────────┤
│ 1  │ Alice   │ 25  │ New York          │
│ 2  │ Bob     │ 30  │ Los Angeles       │
└──────────────────────────────────────────┘

Query: "Find person where city = 'New York'"
Result: Row 1 (exact match)

VECTOR DATABASE:
┌──────────────────────────────────────────────────────┐
│ id │ content           │ vector                      │
├────┼───────────────────┼─────────────────────────────┤
│ 1  │ "Happy dog"       │ [0.2, 0.8, 0.1, ...]       │
│ 2  │ "Joyful puppy"    │ [0.21, 0.79, 0.12, ...]    │
│ 3  │ "Sad cat"         │ [0.1, 0.2, 0.9, ...]       │
└──────────────────────────────────────────────────────┘

Query: "Find similar to 'cheerful dog'"
Query Vector: [0.22, 0.78, 0.11, ...]
Result: Row 1 & 2 (SEMANTIC match, not exact!)
```

### Real-World Analogy

```
Imagine a LIBRARY with millions of books:

TRADITIONAL SEARCH:
- You search: "machine learning"
- Computer finds books with EXACT words "machine learning"
- Misses: "AI algorithms", "neural networks", "deep learning"

VECTOR SEARCH:
- You search: "machine learning"
- Computer UNDERSTANDS the concept
- Finds: "machine learning" + "AI algorithms" + "neural networks"
- Why? Because they're "close" in meaning space!

┌────────────────────────────────────────────────────────┐
│              MEANING SPACE (Simplified)                 │
│                                                         │
│     "machine learning" ●──────● "deep learning"        │
│                        \      /                         │
│                         ●────●                          │
│                    "AI"       "neural networks"         │
│                                                         │
│                                                         │
│     "cooking recipes" ●                                │
│                        \                               │
│                         ●──────● "chef tips"           │
│                       "food"                           │
│                                                         │
│  (These clusters are FAR from each other)              │
└────────────────────────────────────────────────────────┘
```

### The Magic: Embeddings

```
Text → Numbers (Vectors) → Searchable!

"I love pizza"
     ↓ (Embedding Model)
[0.12, -0.45, 0.78, 0.33, -0.21, ...]  (768 or more dimensions!)

Similar meanings = Similar numbers!

"I adore pizza"     → [0.13, -0.44, 0.77, 0.34, -0.20, ...]
"I hate pizza"      → [-0.15, 0.48, 0.75, 0.30, 0.25, ...]
"Quantum physics"   → [0.89, 0.12, -0.55, 0.67, 0.43, ...]
```

---

## 🎯 Why Vector Databases?

### The Problem with Traditional Search

```
KEYWORD SEARCH FAILURES:

Query: "How to fix a broken heart?"

Traditional: Searches for documents containing "fix", "broken", "heart"
Results: 
- Cardiac surgery manuals
- Plumbing repair guides
- Broken glass cleanup

Vector Search: Understands the MEANING
Results:
- Emotional healing guides
- Relationship advice
- Psychology articles
```

### Use Cases

| Use Case | Description |
|----------|-------------|
| **Semantic Search** | Find documents by meaning, not keywords |
| **RAG** | Retrieve relevant context for LLMs |
| **Recommendation** | Similar products/content |
| **Image Search** | Find similar images |
| **Anomaly Detection** | Find outliers in data |
| **Deduplication** | Find near-duplicate content |
| **Chatbots** | Context retrieval for conversations |

### Why Not Just Use SQL?

```
SQL APPROACH:
┌─────────────────────────────────────────────────┐
│ SELECT * FROM documents                          │
│ WHERE content LIKE '%machine learning%'          │
│                                                  │
│ Problems:                                        │
│ ├── Exact match only                            │
│ ├── Can't understand synonyms                   │
│ ├── No semantic understanding                   │
│ ├── Poor performance on large text              │
│ └── Doesn't scale for similarity search         │
└─────────────────────────────────────────────────┘

VECTOR APPROACH:
┌─────────────────────────────────────────────────┐
│ SELECT * FROM vectors                            │
│ ORDER BY cosine_similarity(query_vec, doc_vec)   │
│ LIMIT 5                                          │
│                                                  │
│ Advantages:                                      │
│ ├── Semantic understanding                      │
│ ├── Finds related concepts                      │
│ ├── Language-agnostic                           │
│ ├── Works for any embeddable data               │
│ └── Optimized for similarity search             │
└─────────────────────────────────────────────────┘
```

---

## 🧠 Core Concepts

### 1. Vectors (Embeddings)

```python
# What is a vector?
# A list of numbers representing meaning

# Example: 3D vector (real vectors have 768-1536 dimensions!)
cat_vector = [0.2, 0.8, 0.1]
dog_vector = [0.3, 0.7, 0.15]
car_vector = [0.9, 0.1, 0.85]

# cat and dog are CLOSE (similar)
# cat and car are FAR (different)
```

### 2. Distance Metrics

```
How do we measure "similarity"?

┌─────────────────────────────────────────────────────────┐
│                   DISTANCE METRICS                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. COSINE SIMILARITY                                   │
│     Measures angle between vectors                       │
│     Range: -1 to 1 (1 = identical direction)            │
│                                                          │
│          A · B                                          │
│     cos(θ) = ─────────                                  │
│              ||A|| ||B||                                │
│                                                          │
│     Best for: Text embeddings (most common!)            │
│                                                          │
│  2. EUCLIDEAN DISTANCE (L2)                             │
│     Measures straight-line distance                      │
│                                                          │
│     d = √(Σ(aᵢ - bᵢ)²)                                  │
│                                                          │
│     Best for: When magnitude matters                    │
│                                                          │
│  3. DOT PRODUCT                                         │
│     Simple multiplication sum                            │
│                                                          │
│     dot = Σ(aᵢ × bᵢ)                                    │
│                                                          │
│     Best for: Normalized vectors                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3. Indexing

```
Why can't we just compare all vectors?

Problem: 1 million documents, 768-dimensional vectors
Brute force: Compare query with ALL 1 million vectors
             = Too slow! O(n)

Solution: Smart indexing!

┌─────────────────────────────────────────────────────────┐
│                    INDEXING STRATEGIES                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. FLAT (Brute Force)                                  │
│     ├── Compare with everything                         │
│     ├── 100% accurate                                   │
│     └── Slow for large datasets                         │
│                                                          │
│  2. IVF (Inverted File)                                 │
│     ├── Cluster vectors into groups                     │
│     ├── Only search relevant clusters                   │
│     └── Faster, slightly less accurate                  │
│                                                          │
│  3. HNSW (Hierarchical NSW)                             │
│     ├── Graph-based navigation                          │
│     ├── Very fast                                       │
│     └── Most popular for production                     │
│                                                          │
│  4. PQ (Product Quantization)                           │
│     ├── Compress vectors                                │
│     ├── Memory efficient                                │
│     └── Trade accuracy for speed                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Vector Search Algorithms

### HNSW (Hierarchical Navigable Small World)

```
HNSW: The Most Popular Algorithm

Think of it like airport connections:

LAYER 2 (Few nodes, long jumps):
    NYC ─────────────────── London ─────────────── Tokyo
                                    
LAYER 1 (More nodes, medium jumps):
    NYC ── Chicago ── Denver ── LA ── Hawaii ── Tokyo
                                    
LAYER 0 (All nodes, short jumps):
    NYC─Boston─Philly─DC─Atlanta─Chicago─...─Tokyo

SEARCH PROCESS:
1. Start at top layer (few connections)
2. Jump to nearest neighbor
3. Move down to next layer
4. Repeat until Layer 0
5. Find exact nearest neighbors

Complexity: O(log n) instead of O(n)!
```

```python
"""
HNSW Conceptual Implementation
"""

import numpy as np
from typing import List, Tuple
import heapq

class HNSWNode:
    def __init__(self, id: int, vector: np.ndarray, level: int):
        self.id = id
        self.vector = vector
        self.level = level
        # Neighbors at each level
        self.neighbors: dict[int, List[int]] = {l: [] for l in range(level + 1)}

class SimpleHNSW:
    """Simplified HNSW for understanding"""
    
    def __init__(self, dim: int, M: int = 16, ef_construction: int = 200):
        self.dim = dim
        self.M = M  # Max neighbors per node
        self.ef_construction = ef_construction
        self.nodes: dict[int, HNSWNode] = {}
        self.entry_point = None
        self.max_level = 0
    
    def _distance(self, v1: np.ndarray, v2: np.ndarray) -> float:
        """Cosine distance"""
        return 1 - np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
    
    def _random_level(self) -> int:
        """Generate random level for new node"""
        level = 0
        while np.random.random() < 0.5 and level < 16:
            level += 1
        return level
    
    def _search_layer(
        self, 
        query: np.ndarray, 
        entry_points: List[int], 
        ef: int, 
        layer: int
    ) -> List[Tuple[float, int]]:
        """Search single layer, return ef nearest neighbors"""
        
        visited = set(entry_points)
        candidates = []  # Min heap (distance, id)
        results = []     # Max heap (-distance, id)
        
        for ep in entry_points:
            dist = self._distance(query, self.nodes[ep].vector)
            heapq.heappush(candidates, (dist, ep))
            heapq.heappush(results, (-dist, ep))
        
        while candidates:
            dist_c, c = heapq.heappop(candidates)
            dist_f = -results[0][0]
            
            if dist_c > dist_f:
                break
            
            # Explore neighbors
            for neighbor_id in self.nodes[c].neighbors.get(layer, []):
                if neighbor_id not in visited:
                    visited.add(neighbor_id)
                    dist_n = self._distance(query, self.nodes[neighbor_id].vector)
                    
                    if dist_n < dist_f or len(results) < ef:
                        heapq.heappush(candidates, (dist_n, neighbor_id))
                        heapq.heappush(results, (-dist_n, neighbor_id))
                        
                        if len(results) > ef:
                            heapq.heappop(results)
        
        return [(−d, i) for d, i in results]
    
    def search(self, query: np.ndarray, k: int = 5) -> List[Tuple[int, float]]:
        """Search for k nearest neighbors"""
        
        if not self.entry_point:
            return []
        
        # Start from entry point
        current = self.entry_point
        
        # Traverse from top to layer 1
        for layer in range(self.max_level, 0, -1):
            results = self._search_layer(query, [current], 1, layer)
            current = results[0][1]
        
        # Search layer 0 with ef neighbors
        results = self._search_layer(query, [current], max(k, 100), 0)
        
        # Return top k
        results.sort(key=lambda x: x[0])
        return [(id, dist) for dist, id in results[:k]]
```

### IVF (Inverted File Index)

```
IVF: Cluster-Based Search

Step 1: Training (offline)
┌─────────────────────────────────────────────────────┐
│         Cluster all vectors using K-Means           │
│                                                      │
│    Cluster 1: ● ● ●        Cluster 2: ○ ○ ○        │
│               ●                        ○ ○          │
│                                                      │
│    Cluster 3: △ △          Cluster 4: □ □ □        │
│               △ △ △                    □            │
└─────────────────────────────────────────────────────┘

Step 2: Searching
┌─────────────────────────────────────────────────────┐
│  Query: ★                                           │
│                                                      │
│  1. Find nearest cluster centroids                  │
│     → Cluster 2 is closest                          │
│                                                      │
│  2. Only search within Cluster 2                    │
│     → Compare ★ with ○ ○ ○ ○ ○                     │
│                                                      │
│  3. Return nearest ○                                │
│                                                      │
│  Instead of searching ALL vectors,                  │
│  we only search 1/4 of them!                        │
└─────────────────────────────────────────────────────┘
```

---

## 🏆 Popular Vector Databases

### Comparison Table

| Database | Type | Best For | Pros | Cons |
|----------|------|----------|------|------|
| **ChromaDB** | Embedded | Prototyping, small apps | Easy, Python-native | Not for production scale |
| **Pinecone** | Managed | Production | Fully managed, fast | Cost, vendor lock-in |
| **Weaviate** | Self-hosted/Cloud | Hybrid search | GraphQL, multimodal | Complex setup |
| **Milvus** | Self-hosted | Large scale | Very fast, scalable | Operational complexity |
| **Qdrant** | Self-hosted/Cloud | Production | Fast, Rust-based | Newer, smaller community |
| **FAISS** | Library | Research, embedding | Facebook-backed, fast | Not a database, just index |
| **pgvector** | Extension | Existing Postgres | SQL integration | Limited at huge scale |

### Quick Decision Guide

```
CHOOSING A VECTOR DATABASE:

START
  │
  ├─ Just learning / prototyping?
  │    └─ YES → ChromaDB or FAISS
  │
  ├─ Need production, don't want to manage?
  │    └─ YES → Pinecone
  │
  ├─ Already using Postgres?
  │    └─ YES → pgvector
  │
  ├─ Need self-hosted + scalable?
  │    └─ YES → Milvus or Qdrant
  │
  ├─ Need hybrid (keyword + vector)?
  │    └─ YES → Weaviate
  │
  └─ Huge scale (billions of vectors)?
       └─ YES → Milvus or Pinecone Enterprise
```

---

## 📐 Mathematical Foundations

### Cosine Similarity

$$\text{cosine\_similarity}(A, B) = \frac{A \cdot B}{||A|| \times ||B||} = \frac{\sum_{i=1}^{n} A_i B_i}{\sqrt{\sum_{i=1}^{n} A_i^2} \times \sqrt{\sum_{i=1}^{n} B_i^2}}$$

```python
import numpy as np

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors"""
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    return dot_product / (norm_a * norm_b)

# Example
v1 = np.array([1, 2, 3])
v2 = np.array([1, 2, 3.1])  # Very similar
v3 = np.array([-1, -2, -3])  # Opposite

print(f"v1 vs v2: {cosine_similarity(v1, v2):.4f}")  # ~0.9999
print(f"v1 vs v3: {cosine_similarity(v1, v3):.4f}")  # -1.0000
```

### Euclidean Distance

$$d(A, B) = \sqrt{\sum_{i=1}^{n} (A_i - B_i)^2}$$

```python
def euclidean_distance(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate Euclidean distance"""
    return np.sqrt(np.sum((a - b) ** 2))

# Or simply:
# return np.linalg.norm(a - b)
```

### Dot Product

$$A \cdot B = \sum_{i=1}^{n} A_i \times B_i$$

```python
def dot_product(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate dot product"""
    return np.dot(a, b)
```

### Why Cosine is Preferred

```
COSINE vs EUCLIDEAN for Text

Document A: "cat cat cat dog" → [3, 1, 0]  (cat, dog, car counts)
Document B: "cat dog"         → [1, 1, 0]
Document C: "car car"         → [0, 0, 2]

EUCLIDEAN DISTANCE:
d(A, B) = √((3-1)² + (1-1)² + (0-0)²) = √4 = 2.0
d(A, C) = √((3-0)² + (1-0)² + (0-2)²) = √14 = 3.74

Says: A is closer to B ✓

COSINE SIMILARITY:
cos(A, B) = (3×1 + 1×1) / (√10 × √2) = 4/4.47 = 0.894
cos(A, C) = (3×0 + 1×0 + 0×2) / (√10 × √4) = 0/6.32 = 0.0

Says: A is MUCH closer to B ✓✓

Cosine ignores magnitude (document length)
→ Better for text where length varies!
```

---

## 💻 Implementation

### Basic Vector Operations

```python
"""
Vector Database Fundamentals - Implementation
"""

import numpy as np
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass
import json

# ============================================
# BASIC VECTOR STORE (From Scratch)
# ============================================

@dataclass
class Document:
    id: str
    content: str
    embedding: np.ndarray
    metadata: dict

class SimpleVectorStore:
    """A simple vector store for learning purposes"""
    
    def __init__(self, metric: str = "cosine"):
        self.documents: Dict[str, Document] = {}
        self.metric = metric
    
    def _compute_similarity(
        self, 
        query: np.ndarray, 
        doc: np.ndarray
    ) -> float:
        """Compute similarity based on metric"""
        
        if self.metric == "cosine":
            dot = np.dot(query, doc)
            norm = np.linalg.norm(query) * np.linalg.norm(doc)
            return dot / norm if norm > 0 else 0
        
        elif self.metric == "euclidean":
            # Convert distance to similarity (smaller = more similar)
            distance = np.linalg.norm(query - doc)
            return 1 / (1 + distance)
        
        elif self.metric == "dot":
            return np.dot(query, doc)
        
        else:
            raise ValueError(f"Unknown metric: {self.metric}")
    
    def add(
        self, 
        id: str, 
        content: str, 
        embedding: np.ndarray, 
        metadata: dict = None
    ):
        """Add a document to the store"""
        self.documents[id] = Document(
            id=id,
            content=content,
            embedding=embedding,
            metadata=metadata or {}
        )
    
    def search(
        self, 
        query_embedding: np.ndarray, 
        k: int = 5,
        filter: dict = None
    ) -> List[Tuple[Document, float]]:
        """Search for k most similar documents"""
        
        results = []
        
        for doc in self.documents.values():
            # Apply metadata filter
            if filter:
                match = all(
                    doc.metadata.get(key) == value 
                    for key, value in filter.items()
                )
                if not match:
                    continue
            
            # Compute similarity
            similarity = self._compute_similarity(
                query_embedding, 
                doc.embedding
            )
            results.append((doc, similarity))
        
        # Sort by similarity (descending)
        results.sort(key=lambda x: x[1], reverse=True)
        
        return results[:k]
    
    def delete(self, id: str):
        """Delete a document"""
        if id in self.documents:
            del self.documents[id]
    
    def save(self, path: str):
        """Save to file"""
        data = {
            id: {
                "content": doc.content,
                "embedding": doc.embedding.tolist(),
                "metadata": doc.metadata
            }
            for id, doc in self.documents.items()
        }
        with open(path, "w") as f:
            json.dump(data, f)
    
    def load(self, path: str):
        """Load from file"""
        with open(path, "r") as f:
            data = json.load(f)
        
        for id, doc_data in data.items():
            self.add(
                id=id,
                content=doc_data["content"],
                embedding=np.array(doc_data["embedding"]),
                metadata=doc_data["metadata"]
            )

# ============================================
# USAGE EXAMPLE
# ============================================

def demo_simple_vector_store():
    """Demonstrate simple vector store"""
    
    # Create store
    store = SimpleVectorStore(metric="cosine")
    
    # Simulate embeddings (in reality, use an embedding model)
    np.random.seed(42)
    
    documents = [
        ("doc1", "Python is a programming language", {"category": "tech"}),
        ("doc2", "Machine learning uses algorithms", {"category": "tech"}),
        ("doc3", "Cats are popular pets", {"category": "animals"}),
        ("doc4", "Dogs are loyal companions", {"category": "animals"}),
        ("doc5", "Neural networks learn patterns", {"category": "tech"}),
    ]
    
    # Add documents with random embeddings (demo only)
    for id, content, metadata in documents:
        embedding = np.random.randn(384)  # 384-dim embedding
        store.add(id, content, embedding, metadata)
    
    # Search
    query_embedding = np.random.randn(384)
    results = store.search(query_embedding, k=3)
    
    print("Top 3 results:")
    for doc, score in results:
        print(f"  {doc.id}: {doc.content[:30]}... (score: {score:.4f})")
    
    # Search with filter
    results = store.search(
        query_embedding, 
        k=3, 
        filter={"category": "tech"}
    )
    
    print("\nTop 3 tech results:")
    for doc, score in results:
        print(f"  {doc.id}: {doc.content[:30]}... (score: {score:.4f})")

if __name__ == "__main__":
    demo_simple_vector_store()
```

### Using FAISS (Facebook AI Similarity Search)

```python
"""
FAISS: Fast Vector Similarity Search
"""

import numpy as np
import faiss

# ============================================
# BASIC FAISS USAGE
# ============================================

def faiss_basic_example():
    """Basic FAISS operations"""
    
    # Parameters
    dimension = 128
    num_vectors = 10000
    num_queries = 5
    k = 4  # Top-k results
    
    # Generate random vectors (replace with real embeddings)
    np.random.seed(42)
    database_vectors = np.random.random((num_vectors, dimension)).astype('float32')
    query_vectors = np.random.random((num_queries, dimension)).astype('float32')
    
    # ==========================================
    # Method 1: Flat Index (Exact Search)
    # ==========================================
    print("=== Flat Index (Exact) ===")
    
    # Create index
    index_flat = faiss.IndexFlatL2(dimension)  # L2 distance
    
    # Add vectors
    index_flat.add(database_vectors)
    print(f"Index contains {index_flat.ntotal} vectors")
    
    # Search
    distances, indices = index_flat.search(query_vectors, k)
    
    print(f"Query 0 - Top {k} neighbors: {indices[0]}")
    print(f"Query 0 - Distances: {distances[0]}")
    
    # ==========================================
    # Method 2: IVF Index (Approximate Search)
    # ==========================================
    print("\n=== IVF Index (Approximate) ===")
    
    nlist = 100  # Number of clusters
    
    # Create IVF index
    quantizer = faiss.IndexFlatL2(dimension)
    index_ivf = faiss.IndexIVFFlat(quantizer, dimension, nlist)
    
    # Train the index (required for IVF)
    index_ivf.train(database_vectors)
    
    # Add vectors
    index_ivf.add(database_vectors)
    
    # Search (nprobe = number of clusters to search)
    index_ivf.nprobe = 10
    distances, indices = index_ivf.search(query_vectors, k)
    
    print(f"Query 0 - Top {k} neighbors: {indices[0]}")
    
    # ==========================================
    # Method 3: HNSW Index
    # ==========================================
    print("\n=== HNSW Index ===")
    
    # Create HNSW index
    M = 32  # Number of connections per layer
    index_hnsw = faiss.IndexHNSWFlat(dimension, M)
    
    # Add vectors
    index_hnsw.add(database_vectors)
    
    # Search
    distances, indices = index_hnsw.search(query_vectors, k)
    
    print(f"Query 0 - Top {k} neighbors: {indices[0]}")
    
    # ==========================================
    # Cosine Similarity with FAISS
    # ==========================================
    print("\n=== Cosine Similarity ===")
    
    # Normalize vectors for cosine similarity
    faiss.normalize_L2(database_vectors)
    faiss.normalize_L2(query_vectors)
    
    # Use inner product (equivalent to cosine for normalized vectors)
    index_cosine = faiss.IndexFlatIP(dimension)  # Inner Product
    index_cosine.add(database_vectors)
    
    similarities, indices = index_cosine.search(query_vectors, k)
    
    print(f"Query 0 - Top {k} neighbors: {indices[0]}")
    print(f"Query 0 - Similarities: {similarities[0]}")

if __name__ == "__main__":
    faiss_basic_example()
```

---

## ⚡ Performance Optimization

### Index Selection Guide

```
FAISS INDEX SELECTION:

Data Size < 1000:
└── IndexFlatL2 (exact search, fast enough)

Data Size 1K - 1M:
├── Speed priority: IndexHNSWFlat
├── Memory priority: IndexIVFPQ
└── Balanced: IndexIVFFlat

Data Size > 1M:
├── IndexIVFPQ (memory efficient)
├── IndexHNSWFlat (if RAM available)
└── Use GPU: GpuIndexFlatL2
```

### Memory Optimization

```python
"""
Memory Optimization Techniques
"""

import faiss
import numpy as np

def memory_efficient_index():
    """Create memory-efficient index with PQ compression"""
    
    dimension = 768
    num_vectors = 1_000_000
    
    # Product Quantization parameters
    m = 8        # Number of sub-vectors
    n_bits = 8   # Bits per sub-vector (256 centroids)
    nlist = 4096 # Number of clusters
    
    # Create index with PQ compression
    quantizer = faiss.IndexFlatL2(dimension)
    index = faiss.IndexIVFPQ(quantizer, dimension, nlist, m, n_bits)
    
    # Memory comparison
    # Original: 768 * 4 bytes * 1M = 3 GB
    # With PQ:  8 bytes * 1M = 8 MB  (375x reduction!)
    
    print(f"Original memory: {dimension * 4 * num_vectors / 1e9:.2f} GB")
    print(f"PQ memory: {m * num_vectors / 1e6:.2f} MB")
    
    return index
```

### Batch Operations

```python
def efficient_batch_add(index, vectors, batch_size=10000):
    """Add vectors in batches for memory efficiency"""
    
    num_vectors = len(vectors)
    
    for i in range(0, num_vectors, batch_size):
        batch = vectors[i:i + batch_size]
        index.add(batch)
        print(f"Added {min(i + batch_size, num_vectors)}/{num_vectors}")
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is a vector database?**

> **A:** A vector database stores and searches high-dimensional vectors (embeddings). Unlike traditional databases that find exact matches, vector databases find similar items based on semantic meaning using distance metrics like cosine similarity.

**Q2: What is an embedding?**

> **A:** An embedding is a numerical representation (vector) of data that captures its meaning. Text like "happy dog" becomes [0.2, 0.8, 0.1, ...]. Similar meanings produce similar vectors.

**Q3: Why use cosine similarity instead of Euclidean distance for text?**

> **A:** Cosine similarity measures the angle between vectors, ignoring magnitude. This is important for text because document length varies - a 1000-word document about cats should be similar to a 100-word document about cats.

### Intermediate Level

**Q4: Explain the trade-off between accuracy and speed in vector search.**

> **A:** Exact search (flat index) is 100% accurate but O(n) slow. Approximate methods like IVF and HNSW trade some accuracy for O(log n) speed. IVF might miss vectors in wrong clusters; HNSW might not find the absolute nearest. Tuning parameters (nprobe, ef) balances this trade-off.

**Q5: How does HNSW work?**

> **A:** HNSW builds a multi-layer graph. Higher layers have fewer nodes with long-range connections. Search starts at top, greedily moving to nearest neighbor, then descends layers. At layer 0 (all nodes), it finds exact neighbors. This gives O(log n) search complexity.

**Q6: When would you choose Pinecone over ChromaDB?**

> **A:** Pinecone for production: fully managed, scales automatically, SLA guarantees. ChromaDB for development: free, embedded, simple. Choose Pinecone when you need reliability at scale without DevOps overhead.

### Advanced Level

**Q7: Design a vector search system for 10 billion vectors.**

> **A:** Architecture:
> - **Sharding:** Partition vectors across multiple machines
> - **Index:** IVF-PQ for memory efficiency
> - **Replication:** Multiple replicas per shard for availability
> - **Caching:** Cache frequent queries
> - **Two-phase search:** Coarse search on all shards, then fine search on candidates
> - **Monitoring:** Track recall, latency percentiles

**Q8: How do you handle updates in a vector database?**

> **A:** Options:
> 1. **Delete + Insert:** Simple but can cause fragmentation
> 2. **In-place update:** If supported (Pinecone, Weaviate)
> 3. **Rebuild index:** Periodically rebuild for optimal performance
> 4. **Soft delete:** Mark as deleted, filter at query time

---

## 📝 Homework

### Easy

1. Implement cosine similarity from scratch
2. Create a simple vector store with 100 documents
3. Compare search results with different distance metrics

### Medium

4. Build a FAISS index with IVF and benchmark search speed
5. Implement metadata filtering for your vector store
6. Compare memory usage of different FAISS index types

### Hard

7. Build a hybrid search combining BM25 and vector search
8. Implement a distributed vector search across multiple machines
9. Create a real-time indexing pipeline for streaming data

---

## 🎯 Key Takeaways

```
Vector Database Essentials:
├── Stores embeddings (semantic representations)
├── Enables similarity search (not exact match)
├── Uses distance metrics (cosine, euclidean)
└── Requires smart indexing for scale

Index Types:
├── Flat: Exact, slow, small data
├── IVF: Approximate, clusters, medium data
├── HNSW: Approximate, graphs, fast, popular
└── PQ: Compressed, memory efficient

Production Considerations:
├── Choose based on scale and requirements
├── Trade-off: accuracy vs speed vs memory
├── Consider managed vs self-hosted
└── Plan for updates and maintenance
```

---

**Next:** [02-ChromaDB-Deep-Dive.md](./02-ChromaDB-Deep-Dive.md) - Master ChromaDB for RAG applications! 🎯
