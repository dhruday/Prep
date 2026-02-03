# 📘 ChromaDB - The AI-Native Open-Source Vector Database

---

## **Purpose (Why this exists):**

### **The Developer Pain ChromaDB Solves:**

```javascript
const before_chroma = {
  problem: {
    complexity: 'Setting up vector DB is complicated',
    
    typical_setup: [
      '1. Install Docker',
      '2. Configure database server',
      '3. Set up network/ports',
      '4. Learn complex API',
      '5. Manage infrastructure',
      '6. Handle scaling',
      '7. Deal with deployment headaches'
    ],
    
    time_to_first_query: '2-4 hours (if lucky)',
    
    developer_frustration: {
      beginner: 'Just want to test semantic search!',
      reality: 'Stuck in infrastructure hell',
      
      quote: '"I just wanted to search documents, not become a DevOps engineer!"'
    }
  },
  
  existing_solutions: {
    pinecone: 'Easy but costs money, vendor lock-in',
    faiss: 'Fast but not a full database',
    milvus: 'Powerful but heavy setup',
    weaviate: 'Feature-rich but complex'
  }
};

const with_chroma = {
  revolution: {
    installation: 'pip install chromadb',
    setup: 'import chromadb',
    first_query: '5 minutes',
    
    code_to_working: `
      import chromadb
      client = chromadb.Client()
      collection = client.create_collection("docs")
      collection.add(documents=["Hello world"], ids=["1"])
      results = collection.query(query_texts=["Hi"], n_results=1)
      # DONE! 🎉
    `
  },
  
  breakthrough: {
    embedded: 'No server needed for development',
    batteries_included: 'Embeddings built-in',
    python_native: 'Feels like working with Python dict',
    flexible: 'Can scale to client-server when needed',
    
    tagline: '"The SQLite of vector databases"'
  },
  
  why_chroma_wins: {
    developer_experience: 'Get started in minutes, not hours',
    no_config: 'Sensible defaults everywhere',
    gradual_complexity: 'Simple for prototypes, powerful for production',
    open_source: 'Free, inspectable, modifiable',
    
    perfect_for: [
      'Learning vector databases',
      'Prototyping RAG systems',
      'Small to medium production apps',
      'Side projects and experiments'
    ]
  }
};
```

---

## **What it is:**

### **ChromaDB Core Concepts:**

```javascript
const chromadb = {
  definition: 'Open-source embedding database designed for AI applications',
  
  tagline: 'The AI-native open-source embedding database',
  
  key_features: {
    embedded_mode: {
      what: 'Runs in-process (no server)',
      benefit: 'Zero config, instant start',
      use_case: 'Development, prototypes, small apps'
    },
    
    client_server: {
      what: 'Separate server process',
      benefit: 'Multiple clients, persistence, scale',
      use_case: 'Production deployments'
    },
    
    built_in_embeddings: {
      what: 'Automatic text-to-vector conversion',
      benefit: 'No need for separate embedding model',
      models: 'Sentence Transformers, OpenAI, Cohere, etc.'
    },
    
    collections: {
      what: 'Tables for vectors',
      benefit: 'Organize different document types',
      example: 'collection_docs, collection_code, collection_images'
    },
    
    metadata_filtering: {
      what: 'Filter search by metadata',
      benefit: 'Combine semantic + structured search',
      example: 'Find similar docs from 2023 by author John'
    }
  },
  
  architecture: {
    storage: 'DuckDB (embedded analytics DB)',
    indexing: 'HNSW (fast approximate search)',
    api: 'Python-first, with JS/TS support',
    deployment: 'Local, Docker, Kubernetes, cloud'
  },
  
  vs_competitors: {
    pinecone: 'Chroma is open-source, self-hosted',
    faiss: 'Chroma is full database (CRUD, metadata)',
    weaviate: 'Chroma is simpler, easier to start',
    
    sweet_spot: 'Easy as Pinecone, flexible as open-source'
  }
};
```

### **ChromaDB Components:**

```javascript
const chroma_components = {
  client: {
    what: 'Entry point to ChromaDB',
    types: {
      ephemeral: 'In-memory (testing)',
      persistent: 'Saves to disk',
      http: 'Connects to server'
    },
    code: `client = chromadb.Client()`
  },
  
  collection: {
    what: 'Container for embeddings',
    analogies: {
      sql: 'Like a table',
      mongodb: 'Like a collection',
      elasticsearch: 'Like an index'
    },
    
    operations: {
      add: 'Insert documents',
      query: 'Semantic search',
      get: 'Retrieve by ID',
      update: 'Modify documents',
      delete: 'Remove documents'
    }
  },
  
  embedding_function: {
    what: 'Converts text to vectors',
    built_in: [
      'SentenceTransformerEmbeddingFunction',
      'OpenAIEmbeddingFunction',
      'CohereEmbeddingFunction',
      'HuggingFaceEmbeddingFunction'
    ],
    custom: 'Can bring your own'
  },
  
  metadata: {
    what: 'Structured data about documents',
    examples: {
      source: 'Filename or URL',
      author: 'Who wrote it',
      date: 'When created',
      category: 'Type/topic',
      custom: 'Any key-value pairs'
    }
  }
};
```

---

## **How it works (Intuition):**

### **ChromaDB Mental Model:**

```javascript
// Think of ChromaDB like a smart filing cabinet

const filing_cabinet_analogy = {
  traditional_cabinet: {
    organization: 'Alphabetical folders',
    search: 'Must know exact label',
    limitation: 'Synonyms in different folders',
    
    example: {
      query: 'Find papers about "ML"',
      misses: 'Papers labeled "AI" or "Deep Learning"'
    }
  },
  
  chroma_cabinet: {
    organization: 'By semantic meaning',
    search: 'Find by concept',
    magic: 'Automatically groups similar content',
    
    example: {
      query: 'Find papers about "ML"',
      finds: [
        'Papers about ML',
        'Papers about AI',
        'Papers about neural networks',
        'Papers about deep learning'
      ],
      
      reason: 'Understands they\'re related concepts!'
    }
  },
  
  how_it_organizes: `
    Physical Space:           Semantic Space:
    
    [A] [B] [C] [D]          Machine Learning ●
                                              ╱ ╲
    Must know exact       vs               ╱     ╲
    folder name                           ●       ● 
                                        AI       Neural Nets
                                        
                             Related concepts cluster together!
  `
};

const chroma_workflow = {
  step1_add: {
    you_provide: {
      documents: ['Machine learning is amazing', 'Python is great'],
      metadata: [{category: 'AI'}, {category: 'Programming'}],
      ids: ['doc1', 'doc2']
    },
    
    chroma_does: {
      step1: 'Convert text to embeddings (vectors)',
      step2: 'Store vectors in HNSW index',
      step3: 'Store metadata in DuckDB',
      step4: 'Link everything together',
      
      result: 'Documents ready to search!'
    }
  },
  
  step2_query: {
    you_provide: {
      query: 'Tell me about AI',
      n_results: 5
    },
    
    chroma_does: {
      step1: 'Convert query to embedding',
      step2: 'Search HNSW index for similar vectors',
      step3: 'Apply any metadata filters',
      step4: 'Return closest matches with distances',
      
      result: 'Semantically similar documents!'
    }
  },
  
  magic: 'All embedding/indexing happens automatically! You just add/query.'
};
```

### **Collections Intuition:**

```javascript
const collections_explained = {
  concept: 'Separate "tables" for different data types',
  
  real_world_analogy: {
    library: {
      fiction_section: 'Collection("fiction")',
      non_fiction_section: 'Collection("non_fiction")',
      reference_section: 'Collection("reference")',
      
      why_separate: 'Different content, different search patterns'
    }
  },
  
  in_chroma: {
    user_docs: {
      collection: 'collection("user_documents")',
      content: 'User-uploaded PDFs, docs',
      metadata: ['user_id', 'upload_date', 'filename']
    },
    
    knowledge_base: {
      collection: 'collection("kb_articles")',
      content: 'Company documentation',
      metadata: ['category', 'last_updated', 'author']
    },
    
    code_snippets: {
      collection: 'collection("code")',
      content: 'Code examples',
      metadata: ['language', 'framework', 'difficulty']
    }
  },
  
  benefits: {
    isolation: 'Queries don\'t mix data',
    optimization: 'Each collection tuned separately',
    organization: 'Clear structure',
    security: 'Different permissions per collection'
  }
};
```

---

## **How it works (Math – simplified):**

### **Under the Hood:**

```python
# ChromaDB's Pipeline

import chromadb
import numpy as np

# Step 1: Text → Embedding (automatic)
def understand_embeddings():
    """
    When you add text, ChromaDB:
    
    1. Tokenizes: "machine learning" → ["machine", "learning"]
    2. Model encoding: tokens → [0.23, -0.15, ..., 0.67] (384D)
    3. Normalization: Scale to unit length
    4. Storage: Save in HNSW index
    
    Math:
      text → tokenizer → model → embedding ∈ ℝ^d
      
    Default: Uses sentence-transformers/all-MiniLM-L6-v2
      - 384 dimensions
      - 22M parameters
      - Fast and accurate
    """
    pass

# Step 2: Similarity Search
def understand_search():
    """
    When you query, ChromaDB:
    
    1. Embed query: "AI tutorial" → vector
    2. HNSW search: Find k approximate nearest neighbors
    3. Calculate exact distances to candidates
    4. Sort by distance
    5. Return top-k
    
    Similarity Metric: Cosine Distance
      distance = 1 - cosine_similarity
      
    Where cosine_similarity:
      cos(θ) = (A · B) / (||A|| × ||B||)
    
    Range: 0 (identical) to 2 (opposite)
    """
    pass

# Step 3: HNSW Index Structure
def understand_hnsw():
    """
    Hierarchical Navigable Small World graph:
    
    - Multi-layer graph
    - Each node connected to M neighbors
    - Search starts at top, narrows down
    
    Complexity:
      Build: O(n log n)
      Search: O(log n)
      
    vs Brute Force:
      Build: O(1)
      Search: O(n)  ← Too slow for large n!
    
    Trade-off:
      99%+ accuracy, 100-1000x faster
    """
    pass
```

### **Distance Metrics:**

```python
# ChromaDB supports multiple distance metrics

import numpy as np

def l2_distance(vec_a, vec_b):
    """
    L2 (Euclidean) Distance - default in ChromaDB
    
    Formula:
      d = √(Σ(a_i - b_i)²)
    
    Properties:
      - Geometric distance in space
      - Range: [0, ∞)
      - Smaller = more similar
    """
    return np.sqrt(np.sum((vec_a - vec_b) ** 2))


def cosine_distance(vec_a, vec_b):
    """
    Cosine Distance
    
    Formula:
      d = 1 - cos(θ) = 1 - (A·B)/(||A||×||B||)
    
    Properties:
      - Angle-based
      - Range: [0, 2]
      - Ignores magnitude
    """
    cosine_sim = np.dot(vec_a, vec_b) / (
        np.linalg.norm(vec_a) * np.linalg.norm(vec_b)
    )
    return 1 - cosine_sim


def inner_product(vec_a, vec_b):
    """
    Inner Product (Dot Product)
    
    Formula:
      ip = Σ(a_i × b_i)
    
    Properties:
      - Simple multiplication sum
      - Higher = more similar
      - Fast to compute
    """
    return np.dot(vec_a, vec_b)


# Example
vec1 = np.array([1, 2, 3])
vec2 = np.array([1.1, 2.1, 3.1])

print(f"L2: {l2_distance(vec1, vec2):.4f}")           # ~0.1732
print(f"Cosine: {cosine_distance(vec1, vec2):.4f}")    # ~0.0001
print(f"Inner Product: {inner_product(vec1, vec2):.4f}") # ~15.4
```

---

## **Visual Explanation (described):**

### **ChromaDB Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                     │
│          Python/JavaScript/TypeScript Code              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓ (Simple API)
┌─────────────────────────────────────────────────────────┐
│                     CHROMA CLIENT                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Collection API                                   │  │
│  │  - add()    - query()    - update()   - delete()  │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          ↓                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Embedding Functions                              │  │
│  │  - SentenceTransformer (default)                  │  │
│  │  - OpenAI                                        │  │
│  │  - Cohere                                        │  │
│  │  - Custom                                        │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          ↓                              │
│  ┌─────────────────────────────────────────┐            │
│  │  HNSW Index (Vector Search)             │            │
│  │  - Fast approximate nearest neighbor    │            │
│  │  - 99%+ accuracy                        │            │
│  └─────────────────────────────────────────┘            │
│                          ↓                              │
│  ┌─────────────────────────────────────────┐            │
│  │  DuckDB (Metadata Storage)              │            │
│  │  - Structured data                      │            │
│  │  - Filtering, WHERE clauses             │            │
│  └─────────────────────────────────────────┘            │
│                          ↓                              │
│  ┌─────────────────────────────────────────┐            │
│  │  Persistent Storage                     │            │
│  │  - Local disk / S3 / GCS                │            │
│  └─────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### **Query Flow:**

```
USER QUERY: "Find docs about machine learning"
        ↓
┌──────────────────────────┐
│  1. Text Preprocessing   │
│  - Tokenization          │
│  - Cleaning              │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  2. Embedding Generation │
│  text → [0.2, -0.5, ...] │
│  (384 or 768 dimensions) │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  3. HNSW Search          │
│  - Approximate NN        │
│  - Get 50 candidates     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  4. Exact Distance Calc  │
│  - Compute precise       │
│  - Sort by distance      │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  5. Metadata Filtering   │
│  - Apply WHERE clause    │
│  - Check permissions     │
└──────────┬───────────────┘
           ↓
┌──────────────────────────┐
│  6. Return Results       │
│  - Top k documents       │
│  - With distances        │
│  - With metadata         │
└──────────────────────────┘
```

---

## **Simple Example:**

### **JavaScript Conceptual Understanding:**

```javascript
// ChromaDB Concept (JavaScript-like pseudocode)

class ChromaCollection {
  constructor(name) {
    this.name = name;
    this.documents = [];      // Store documents
    this.embeddings = [];     // Store vectors
    this.metadata = [];       // Store metadata
    this.ids = [];           // Document IDs
  }
  
  // Add documents
  add({ documents, metadatas, ids }) {
    documents.forEach((doc, i) => {
      // 1. Generate embedding
      const embedding = this.embed(doc);  // text → vector
      
      // 2. Store everything
      this.documents.push(doc);
      this.embeddings.push(embedding);
      this.metadata.push(metadatas[i]);
      this.ids.push(ids[i]);
    });
    
    console.log(`Added ${documents.length} documents to ${this.name}`);
  }
  
  // Semantic search
  query({ query_texts, n_results = 5, where = null }) {
    // 1. Embed query
    const queryEmbedding = this.embed(query_texts[0]);
    
    // 2. Calculate similarities
    const results = this.embeddings.map((embedding, i) => ({
      document: this.documents[i],
      metadata: this.metadata[i],
      id: this.ids[i],
      distance: this.cosineSimilarity(queryEmbedding, embedding)
    }));
    
    // 3. Apply filters
    let filtered = results;
    if (where) {
      filtered = results.filter(r => 
        this.matchesFilter(r.metadata, where)
      );
    }
    
    // 4. Sort and return top-k
    filtered.sort((a, b) => a.distance - b.distance);
    return filtered.slice(0, n_results);
  }
  
  // Mock embedding function
  embed(text) {
    // In reality: call transformer model
    // Here: simplified hash-based vector
    const vector = [];
    for (let i = 0; i < 384; i++) {
      const hash = (text.charCodeAt(i % text.length) * (i + 1)) % 100;
      vector.push(hash / 100);
    }
    return vector;
  }
  
  cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] ** 2;
      normB += vecB[i] ** 2;
    }
    
    return 1 - (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
  }
  
  matchesFilter(metadata, filter) {
    return Object.entries(filter).every(([key, value]) => 
      metadata[key] === value
    );
  }
}

// Usage
const collection = new ChromaCollection('my_docs');

// Add documents
collection.add({
  documents: [
    'Machine learning is a subset of AI',
    'Python is great for data science',
    'Deep learning uses neural networks'
  ],
  metadatas: [
    { category: 'AI', year: 2023 },
    { category: 'Programming', year: 2023 },
    { category: 'AI', year: 2023 }
  ],
  ids: ['doc1', 'doc2', 'doc3']
});

// Query
const results = collection.query({
  query_texts: ['Tell me about AI'],
  n_results: 2,
  where: { category: 'AI' }
});

console.log('\nSearch Results:');
results.forEach((r, i) => {
  console.log(`${i + 1}. ${r.document} (distance: ${r.distance.toFixed(3)})`);
});
```

### **Python Real Implementation:**

```python
# ============================================
# 1. Basic ChromaDB Setup
# ============================================

import chromadb
from chromadb.config import Settings

# Three ways to create a client

# A) Ephemeral (in-memory, for testing)
client = chromadb.Client()

# B) Persistent (saves to disk)
client = chromadb.PersistentClient(path="./chroma_db")

# C) HTTP Client (connects to server)
client = chromadb.HttpClient(host="localhost", port=8000)


# ============================================
# 2. Basic CRUD Operations
# ============================================

# Create or get collection
collection = client.get_or_create_collection(
    name="my_documents",
    metadata={"description": "My document collection"}
)

# Add documents
collection.add(
    documents=[
        "Machine learning is a subset of artificial intelligence",
        "Python is a popular programming language for data science",
        "Deep learning uses neural networks with many layers"
    ],
    metadatas=[
        {"source": "textbook", "chapter": 1},
        {"source": "tutorial", "chapter": 1},
        {"source": "textbook", "chapter": 5}
    ],
    ids=["doc1", "doc2", "doc3"]
)

# Query (semantic search)
results = collection.query(
    query_texts=["Tell me about AI"],
    n_results=2
)

print("🔍 Search Results:")
for doc, distance in zip(results['documents'][0], results['distances'][0]):
    print(f"  - {doc}")
    print(f"    Distance: {distance:.4f}\n")

# Get by ID
doc = collection.get(ids=["doc1"])
print(f"📄 Retrieved: {doc['documents'][0]}")

# Update
collection.update(
    ids=["doc1"],
    documents=["ML is a branch of AI focused on learning from data"],
    metadatas=[{"source": "textbook", "chapter": 1, "updated": True}]
)

# Delete
collection.delete(ids=["doc3"])

# Count
print(f"📊 Total documents: {collection.count()}")


# ============================================
# 3. Custom Embedding Functions
# ============================================

from chromadb.utils import embedding_functions

# A) Default (Sentence Transformers)
default_ef = embedding_functions.DefaultEmbeddingFunction()

# B) OpenAI
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="your-api-key",
    model_name="text-embedding-ada-002"
)

# C) Cohere
cohere_ef = embedding_functions.CohereEmbeddingFunction(
    api_key="your-api-key",
    model_name="embed-english-v3.0"
)

# D) Hugging Face
huggingface_ef = embedding_functions.HuggingFaceEmbeddingFunction(
    api_key="your-api-key",
    model_name="sentence-transformers/all-mpnet-base-v2"
)

# E) Custom
class CustomEmbeddingFunction:
    def __init__(self, model_name="all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(model_name)
    
    def __call__(self, texts):
        return self.model.encode(texts).tolist()

custom_ef = CustomEmbeddingFunction()

# Use custom embedding function
collection_custom = client.get_or_create_collection(
    name="custom_embeddings",
    embedding_function=custom_ef
)


# ============================================
# 4. Metadata Filtering
# ============================================

collection = client.get_or_create_collection("filtered_docs")

# Add documents with metadata
collection.add(
    documents=[
        "Python tutorial for beginners",
        "Advanced Python techniques",
        "JavaScript basics",
        "JavaScript advanced patterns",
        "Machine learning with Python"
    ],
    metadatas=[
        {"language": "Python", "level": "beginner", "year": 2023},
        {"language": "Python", "level": "advanced", "year": 2023},
        {"language": "JavaScript", "level": "beginner", "year": 2022},
        {"language": "JavaScript", "level": "advanced", "year": 2023},
        {"language": "Python", "level": "intermediate", "year": 2023}
    ],
    ids=["doc1", "doc2", "doc3", "doc4", "doc5"]
)

# Filter by metadata
results = collection.query(
    query_texts=["programming tutorial"],
    n_results=3,
    where={"language": "Python"}  # Only Python docs
)

print("\n🔍 Filtered Search (Python only):")
for doc in results['documents'][0]:
    print(f"  - {doc}")

# Complex filters
results = collection.query(
    query_texts=["coding guide"],
    n_results=2,
    where={
        "$and": [
            {"language": "Python"},
            {"level": {"$ne": "beginner"}}  # Not beginner
        ]
    }
)

print("\n🔍 Complex Filter (Python, not beginner):")
for doc in results['documents'][0]:
    print(f"  - {doc}")

# Filter operators
"""
Supported operators:
  - $eq: equals
  - $ne: not equals
  - $gt: greater than
  - $gte: greater than or equal
  - $lt: less than
  - $lte: less than or equal
  - $in: in list
  - $nin: not in list
  - $and: logical AND
  - $or: logical OR
"""


# ============================================
# 5. Advanced Features
# ============================================

# A) Multiple Collections
collections = {
    'code': client.get_or_create_collection("code_snippets"),
    'docs': client.get_or_create_collection("documentation"),
    'issues': client.get_or_create_collection("github_issues")
}

# B) Collection Management
all_collections = client.list_collections()
print(f"\n📚 All Collections: {[c.name for c in all_collections]}")

# Delete collection
client.delete_collection("temp_collection")

# C) Batch Operations
collection.add(
    documents=["doc1", "doc2", "doc3"] * 100,  # 300 docs
    ids=[f"id_{i}" for i in range(300)]
)

# D) Update/Upsert
collection.upsert(
    ids=["doc1"],
    documents=["Updated document"],
    metadatas=[{"updated": True}]
)


# ============================================
# 6. Distance Metrics
# ============================================

# Create collections with different metrics
l2_collection = client.get_or_create_collection(
    name="l2_distance",
    metadata={"hnsw:space": "l2"}  # Euclidean distance (default)
)

cosine_collection = client.get_or_create_collection(
    name="cosine_distance",
    metadata={"hnsw:space": "cosine"}  # Cosine distance
)

ip_collection = client.get_or_create_collection(
    name="inner_product",
    metadata={"hnsw:space": "ip"}  # Inner product
)


# ============================================
# 7. Include/Exclude Parameters
# ============================================

results = collection.query(
    query_texts=["Python programming"],
    n_results=2,
    include=[
        "documents",   # Include document text
        "metadatas",   # Include metadata
        "distances",   # Include distances
        "embeddings"   # Include embeddings (vectors)
    ]
)

print("\n📦 Full Results:")
print(f"Documents: {results['documents']}")
print(f"Metadatas: {results['metadatas']}")
print(f"Distances: {results['distances']}")
print(f"Embeddings shape: {len(results['embeddings'][0])} vectors")


# ============================================
# 8. Persistence and Backup
# ============================================

# Persistent client automatically saves
persistent_client = chromadb.PersistentClient(path="./my_chroma_db")

# All operations auto-saved to ./my_chroma_db/

# To backup: Copy the directory
import shutil
shutil.copytree("./my_chroma_db", "./backup_chroma_db")

# To restore: Copy back
shutil.copytree("./backup_chroma_db", "./restored_chroma_db")


# ============================================
# 9. Client-Server Mode
# ============================================

# Terminal 1: Start server
"""
chroma run --host localhost --port 8000 --path ./chroma_data
"""

# Terminal 2: Connect client
from chromadb import HttpClient

client = HttpClient(host="localhost", port=8000)
collection = client.get_or_create_collection("remote_docs")

# Use exactly like embedded mode!


# ============================================
# 10. Complete Example: Document Q&A
# ============================================

import chromadb
from sentence_transformers import SentenceTransformer

class DocumentQA:
    """
    Complete document Q&A system with ChromaDB
    """
    
    def __init__(self, collection_name="qa_docs"):
        # Initialize
        self.client = chromadb.PersistentClient(path="./qa_chroma")
        self.collection = self.client.get_or_create_collection(collection_name)
    
    def add_documents(self, documents, metadatas=None):
        """Add documents to the database"""
        ids = [f"doc_{i}" for i in range(len(documents))]
        
        if metadatas is None:
            metadatas = [{"index": i} for i in range(len(documents))]
        
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
        print(f"✅ Added {len(documents)} documents")
    
    def ask(self, question, n_results=3, filters=None):
        """Ask a question and get relevant documents"""
        results = self.collection.query(
            query_texts=[question],
            n_results=n_results,
            where=filters
        )
        
        return {
            'question': question,
            'answers': results['documents'][0],
            'sources': results['metadatas'][0],
            'distances': results['distances'][0]
        }
    
    def get_stats(self):
        """Get collection statistics"""
        return {
            'total_documents': self.collection.count(),
            'collection_name': self.collection.name
        }


# Example usage
qa_system = DocumentQA()

# Add knowledge base
documents = [
    "ChromaDB is an open-source embedding database for AI applications.",
    "Vector databases store high-dimensional vectors for similarity search.",
    "HNSW is an algorithm for approximate nearest neighbor search.",
    "Python is the primary language for ChromaDB.",
    "Embeddings convert text into numerical vectors."
]

metadatas = [
    {"topic": "ChromaDB", "difficulty": "beginner"},
    {"topic": "Vector DB", "difficulty": "beginner"},
    {"topic": "Algorithms", "difficulty": "intermediate"},
    {"topic": "Programming", "difficulty": "beginner"},
    {"topic": "ML Basics", "difficulty": "beginner"}
]

qa_system.add_documents(documents, metadatas)

# Ask questions
print("\n" + "="*60)
result = qa_system.ask("What is ChromaDB?", n_results=2)
print(f"Q: {result['question']}")
print("\nTop Answers:")
for i, (doc, dist) in enumerate(zip(result['answers'], result['distances'])):
    print(f"{i+1}. {doc}")
    print(f"   Relevance: {(1-dist)*100:.1f}%\n")

# Filtered question
print("="*60)
result = qa_system.ask(
    "programming concepts",
    n_results=2,
    filters={"difficulty": "beginner"}
)
print(f"Q: {result['question']} (beginner only)")
print("\nFiltered Answers:")
for doc in result['answers']:
    print(f"- {doc}")

# Stats
print("\n" + "="*60)
stats = qa_system.get_stats()
print(f"📊 Stats: {stats}")
```

---

## **Real-World Applications:**

### **1. RAG (Retrieval-Augmented Generation):**

```python
import chromadb
from openai import OpenAI

class RAGSystem:
    """
    Complete RAG system with ChromaDB
    """
    
    def __init__(self, openai_api_key):
        self.client = chromadb.PersistentClient(path="./rag_db")
        self.collection = self.client.get_or_create_collection("rag_docs")
        self.llm = OpenAI(api_key=openai_api_key)
    
    def ingest_documents(self, documents, metadatas=None):
        """Add documents to knowledge base"""
        ids = [f"doc_{i}" for i in range(len(documents))]
        self.collection.add(
            documents=documents,
            metadatas=metadatas or [{}] * len(documents),
            ids=ids
        )
    
    def ask(self, question, n_context=3):
        """Answer question using RAG"""
        # 1. Retrieve relevant documents
        results = self.collection.query(
            query_texts=[question],
            n_results=n_context
        )
        
        # 2. Build context
        context = "\n\n".join(results['documents'][0])
        
        # 3. Generate answer
        prompt = f"""Answer the question based on the context below.
        
Context:
{context}

Question: {question}

Answer:"""
        
        response = self.llm.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}]
        )
        
        return {
            'answer': response.choices[0].message.content,
            'sources': results['documents'][0]
        }

# Use in chatbot, documentation search, etc.
```

### **2. Semantic Code Search:**

```python
class CodeSearchEngine:
    """
    Search code by functionality, not syntax
    """
    
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./code_db")
        self.collection = self.client.get_or_create_collection("code_snippets")
    
    def index_codebase(self, code_files):
        """Index all code files"""
        documents = []
        metadatas = []
        ids = []
        
        for i, file_info in enumerate(code_files):
            # Extract function/class definitions
            # (In reality, parse AST)
            documents.append(file_info['code'])
            metadatas.append({
                'file': file_info['path'],
                'language': file_info['language'],
                'type': file_info['type']  # function, class, etc.
            })
            ids.append(f"code_{i}")
        
        self.collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
    
    def search(self, natural_language_query):
        """Search code by what it does"""
        results = self.collection.query(
            query_texts=[natural_language_query],
            n_results=5
        )
        
        return results

# Example queries:
# "function that sorts a list"
# "code that connects to database"
# "class that handles authentication"
```

### **3. Content Recommendation:**

```python
class ContentRecommender:
    """
    Recommend similar content based on user interaction
    """
    
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./content_db")
        self.articles = self.client.get_or_create_collection("articles")
        self.user_history = self.client.get_or_create_collection("user_profiles")
    
    def add_content(self, articles):
        """Add articles to database"""
        self.articles.add(
            documents=[a['text'] for a in articles],
            metadatas=[{
                'title': a['title'],
                'category': a['category'],
                'date': a['date']
            } for a in articles],
            ids=[a['id'] for a in articles]
        )
    
    def get_recommendations(self, user_id, n=10):
        """Get personalized recommendations"""
        # Get user's reading history
        history = self.user_history.get(ids=[user_id])
        
        if not history['documents']:
            # Cold start: return popular items
            return self.get_popular()
        
        # Find similar articles
        recommendations = self.articles.query(
            query_texts=history['documents'],
            n_results=n
        )
        
        return recommendations

# Powers: Netflix, Spotify, Medium, etc.
```

---

## **Common Misconceptions:**

### ❌ **Misconception 1: "ChromaDB is only for small projects"**

**Reality:**
```python
production_scale = {
    'myth': 'Chroma is toy database',
    
    'reality': {
        'small': 'Embedded mode: millions of vectors',
        'medium': 'Client-server: tens of millions',
        'large': 'Distributed (coming): billions',
        
        'production_users': [
            'LangChain (default vector store)',
            'Anthropic (Claude documentation)',
            'Many Y Combinator startups',
            'Fortune 500 companies (undisclosed)'
        ]
    },
    
    'when_not_chroma': {
        'very_large_scale': '>100M vectors → Consider Pinecone, Weaviate',
        'multi_datacenter': 'Global deployment → Consider managed solution',
        'complex_graph': 'Neo4j-like queries → Consider Weaviate'
    }
}
```

### ❌ **Misconception 2: "Need to manage embeddings manually"**

**Reality:**
```python
# ChromaDB handles embeddings automatically!

collection.add(
    documents=["Text 1", "Text 2"],  # Just text!
    ids=["1", "2"]
)
# ✅ Embeddings generated automatically

collection.query(
    query_texts=["Search query"],  # Just text!
    n_results=5
)
# ✅ Query embedded automatically

# No need to:
# - Load embedding model
# - Generate vectors
# - Manage dimensions
# - Normalize
# - Store separately

# It just works!
```

### ❌ **Misconception 3: "Can't use with existing databases"**

**Reality:**
```python
hybrid_architecture = {
    'pattern': 'Use both PostgreSQL and ChromaDB',
    
    'postgres': {
        'stores': 'Structured data (users, orders, etc.)',
        'queries': 'SQL (exact matching, transactions)'
    },
    
    'chroma': {
        'stores': 'Embeddings + metadata',
        'queries': 'Semantic search'
    },
    
    'workflow': {
        'step1': 'User searches "comfortable shoes"',
        'step2': 'ChromaDB finds similar products',
        'step3': 'Get product IDs',
        'step4': 'Query PostgreSQL for details (price, stock)',
        'step5': 'Combine results'
    },
    
    'best_of_both': 'Semantic search + ACID transactions'
}
```

---

## **Best Practices:**

### **1. Collection Design:**

```python
collection_design_patterns = {
    'anti_pattern': {
        'single_collection': 'Put everything in one collection',
        'problem': 'Mixed document types, slow queries, hard to manage'
    },
    
    'pattern': {
        'separate_by_type': {
            'user_docs': 'User uploaded files',
            'kb_articles': 'Knowledge base',
            'chat_history': 'Conversation logs',
            'code': 'Code snippets'
        },
        
        'benefits': [
            'Faster queries (smaller search space)',
            'Easier management',
            'Different embedding models per type',
            'Clear organization'
        ]
    },
    
    'example': """
    # Good
    docs = client.get_or_create_collection("user_documents")
    code = client.get_or_create_collection("code_snippets")
    
    # Bad
    everything = client.get_or_create_collection("all_data")
    """
}
```

### **2. Metadata Strategy:**

```python
metadata_best_practices = {
    'good': {
        'consistent_schema': 'Same keys across documents',
        'indexed_fields': 'Fields you'll filter on',
        'reasonable_size': '< 1KB per document',
        
        'example': {
            'source': 'filename.pdf',
            'page': 42,
            'category': 'technical',
            'date': '2023-10-15',
            'author': 'John Doe'
        }
    },
    
    'bad': {
        'inconsistent': 'Different keys per document',
        'large_blobs': 'Storing entire documents in metadata',
        'nested_complex': 'Deep nesting',
        
        'example': {
            'sometimes_source': 'file.pdf',
            'sometimes_from': 'other.pdf',
            'huge_field': '...(5MB of text)...',
            'deeply': {'nested': {'structure': {'bad': True}}}
        }
    }
}
```

### **3. Performance Optimization:**

```python
def optimize_chroma():
    """Performance tips"""
    
    tips = {
        'batch_operations': {
            'bad': 'Add one document at a time',
            'good': 'Batch 100-1000 documents',
            
            'code': """
            # Good
            collection.add(
                documents=batch_docs,  # 500 docs
                ids=batch_ids
            )
            
            # Bad
            for doc in docs:
                collection.add(documents=[doc], ids=[id])  # Slow!
            """
        },
        
        'query_optimization': {
            'use_filters': 'Reduce search space',
            'limit_k': 'Don\'t request more than needed',
            'exclude_embeddings': 'Don\'t include unless needed',
            
            'code': """
            # Good
            results = collection.query(
                query_texts=["query"],
                n_results=5,  # Only what you need
                where={"category": "relevant"},  # Filter
                include=["documents", "metadatas"]  # Exclude embeddings
            )
            """
        },
        
        'embedding_model': {
            'tradeoff': 'Speed vs accuracy',
            'fast': 'all-MiniLM-L6-v2 (384D, fast)',
            'accurate': 'all-mpnet-base-v2 (768D, slower)',
            'openai': 'text-embedding-ada-002 (1536D, API call)'
        }
    }
    
    return tips


# ============================================
# 4. Production Deployment
# ============================================

production_checklist = {
    'persistence': [
        '✓ Use PersistentClient',
        '✓ Set up regular backups',
        '✓ Test restore procedure'
    ],
    
    'monitoring': [
        '✓ Track query latency',
        '✓ Monitor collection size',
        '✓ Alert on failures',
        '✓ Log slow queries'
    ],
    
    'scaling': [
        '✓ Start with embedded mode',
        '✓ Move to client-server when needed',
        '✓ Consider managed hosting if grows large',
        '✓ Implement caching layer'
    ],
    
    'security': [
        '✓ Use authentication (if client-server)',
        '✓ Encrypt sensitive data',
        '✓ Implement rate limiting',
        '✓ Validate user inputs'
    ]
}
```

---

## **Key Takeaways:**

```javascript
const chromadb_mastery = {
  why_chroma: {
    easiest: 'Simplest vector DB to start with',
    powerful: 'Production-ready features',
    flexible: 'Embedded to client-server',
    free: 'Open-source, no vendor lock-in'
  },
  
  core_features: {
    automatic_embeddings: 'No manual vector management',
    collections: 'Organize documents logically',
    metadata_filtering: 'Combine semantic + structured search',
    persistence: 'Save to disk automatically'
  },
  
  when_to_use: [
    'Learning vector databases',
    'Building RAG applications',
    'Semantic search',
    'Content recommendations',
    'Small to medium scale (< 10M vectors)'
  ],
  
  remember: {
    'Installation': 'pip install chromadb',
    'Simplest code': '4 lines to working search',
    'Free': 'No costs, no limits',
    'Production': 'Used by many companies'
  }
};
```

---

## ✅ **Review Questions:**

1. **Conceptual:**
   - How does ChromaDB simplify vector database usage?
   - What's the difference between embedded and client-server mode?
   - How do metadata filters work?

2. **Technical:**
   - What embedding models can ChromaDB use?
   - How to optimize query performance?
   - When to use different distance metrics?

3. **Practical:**
   - How to build a RAG system with ChromaDB?
   - How to handle production deployment?
   - When to choose ChromaDB vs other vector DBs?

---

## 🧩 **Practice Problems:**

### **Problem 1: Personal Knowledge Base**

```python
# Build a personal knowledge management system:
# - Ingest notes, articles, bookmarks
# - Semantic search across all content
# - Tag-based filtering
# - Export summaries

class PersonalKnowledgeBase:
    def add_note(self, content, tags):
        pass
    
    def search(self, query, tags=None):
        pass
    
    def get_related(self, note_id):
        pass
```

### **Problem 2: Code Documentation Search**

```python
# Build code documentation search:
# - Index API documentation
# - Natural language queries
# - Code example retrieval
# - Filter by language/version
```

---

## 🚀 **Mini Project:**

**Build a "Second Brain" App:**

```python
class SecondBrain:
    """
    Complete personal knowledge system:
    
    Features:
    1. Ingest multiple sources:
       - Text files, PDFs, web pages
       - Twitter bookmarks
       - YouTube transcripts
       - Email archives
    
    2. Intelligent search:
       - Semantic search
       - Filter by source, date, topic
       - Find connections between notes
    
    3. AI Features:
       - Automatic tagging
       - Generate summaries
       - Answer questions about your knowledge
       - Find related content
    
    4. Web Interface:
       - Upload documents
       - Search interface
       - Visual knowledge graph
    
    Technologies:
    - ChromaDB for vector storage
    - Streamlit for UI
    - LangChain for RAG
    - OpenAI for summaries
    
    Make it actually useful for daily work!
    """
```

---

**🎉 ChromaDB Complete!**

You now understand:
- ChromaDB fundamentals
- CRUD operations
- Metadata filtering
- Production deployment

**Next:** **RAG Architecture** - Combine retrieval + generation! 🚀