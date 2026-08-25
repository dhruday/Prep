# 🎨 ChromaDB: Deep Dive

## 📚 Table of Contents
1. [Beginner Friendly Explanation](#-beginner-friendly-explanation)
2. [Installation & Setup](#-installation--setup)
3. [Core Concepts](#-core-concepts)
4. [CRUD Operations](#-crud-operations)
5. [Embeddings](#-embeddings)
6. [Querying & Filtering](#-querying--filtering)
7. [Persistence & Production](#-persistence--production)
8. [Advanced Features](#-advanced-features)
9. [Best Practices](#-best-practices)
10. [Interview Questions](#-interview-questions)
11. [Homework](#-homework)

---

## 🔰 Beginner Friendly Explanation

### What is ChromaDB?

```
ChromaDB = Your AI's Memory Bank

Think of it like a smart filing cabinet:

REGULAR FILING CABINET:
├── You label folders: "2024 Taxes", "Medical Records"
├── To find something, you need the EXACT label
└── Can't find "health documents" if labeled "Medical Records"

CHROMADB (Smart Filing):
├── You add documents with meaning
├── ChromaDB understands what they're about
├── Search by meaning: "health stuff" → finds "Medical Records"!
└── Perfect for AI assistants that need to remember things
```

### Why ChromaDB?

```
┌──────────────────────────────────────────────────────────┐
│                     WHY CHROMADB?                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ✅ SIMPLE                                                │
│     - Python-native                                       │
│     - 5 lines to get started                             │
│     - No server setup needed                             │
│                                                           │
│  ✅ FAST                                                  │
│     - In-memory by default                               │
│     - Optimized for small-medium datasets                │
│                                                           │
│  ✅ AI-FIRST                                              │
│     - Built for LLM applications                         │
│     - Direct LangChain integration                       │
│     - Automatic embedding support                        │
│                                                           │
│  ✅ FREE & OPEN SOURCE                                    │
│     - Apache 2.0 license                                 │
│     - No cost for development                            │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### ChromaDB in RAG

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG WITH CHROMADB                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  INDEXING PHASE (One-time):                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │ Documents│ → │ Embed    │ → │ Store in │                │
│  │          │   │          │   │ ChromaDB │                │
│  └──────────┘   └──────────┘   └──────────┘                │
│                                                              │
│  QUERY PHASE (Every question):                              │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐│
│  │ Question │ → │ Embed    │ → │ Search   │ → │ Return   ││
│  │          │   │          │   │ ChromaDB │   │ Context  ││
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘│
│                                                              │
│  GENERATION PHASE:                                          │
│  ┌──────────────────────┐   ┌──────────────────────┐       │
│  │ Context + Question   │ → │ LLM generates answer │       │
│  └──────────────────────┘   └──────────────────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Installation & Setup

### Installation

```bash
# Basic installation
pip install chromadb

# With OpenAI embeddings
pip install chromadb openai

# With HuggingFace embeddings
pip install chromadb sentence-transformers

# Full installation for production
pip install chromadb[all]
```

### Quick Start

```python
"""
ChromaDB Quick Start - 5 Lines to Semantic Search!
"""

import chromadb

# 1. Create client
client = chromadb.Client()

# 2. Create collection (like a table)
collection = client.create_collection("my_docs")

# 3. Add documents (ChromaDB embeds automatically!)
collection.add(
    documents=["Python is great", "I love machine learning"],
    ids=["doc1", "doc2"]
)

# 4. Search!
results = collection.query(
    query_texts=["programming languages"],
    n_results=1
)

print(results["documents"])  # [['Python is great']]
```

---

## 🧠 Core Concepts

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CHROMADB ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                      CLIENT                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ Ephemeral   │  │ Persistent  │  │   HTTP      │  │   │
│  │  │ (In-Memory) │  │ (Disk)      │  │   (Server)  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   COLLECTIONS                        │   │
│  │  ┌─────────────────────────────────────────────┐    │   │
│  │  │ Collection: "documents"                      │    │   │
│  │  │ ┌─────┬──────────┬───────────┬───────────┐  │    │   │
│  │  │ │ ID  │ Document │ Embedding │ Metadata  │  │    │   │
│  │  │ ├─────┼──────────┼───────────┼───────────┤  │    │   │
│  │  │ │doc1 │ "Hello"  │ [0.1,...] │ {type:..} │  │    │   │
│  │  │ │doc2 │ "World"  │ [0.2,...] │ {type:..} │  │    │   │
│  │  │ └─────┴──────────┴───────────┴───────────┘  │    │   │
│  │  └─────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                EMBEDDING FUNCTION                    │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │  Default    │  │  OpenAI     │  │  HuggingFace│  │   │
│  │  │ (all-Mini)  │  │             │  │             │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Description |
|-----------|-------------|
| **Client** | Connection to ChromaDB (memory, disk, or server) |
| **Collection** | Container for documents (like a database table) |
| **Document** | Text content to be searched |
| **Embedding** | Vector representation of document |
| **Metadata** | Key-value pairs for filtering |
| **ID** | Unique identifier for each document |

### Client Types

```python
import chromadb

# ============================================
# 1. EPHEMERAL CLIENT (In-Memory)
# ============================================
# Data lost when program ends
# Good for: Testing, quick experiments

client = chromadb.Client()

# ============================================
# 2. PERSISTENT CLIENT (Disk)
# ============================================
# Data saved to disk
# Good for: Development, small production

client = chromadb.PersistentClient(path="./chroma_db")

# ============================================
# 3. HTTP CLIENT (Server)
# ============================================
# Connect to remote server
# Good for: Production, shared access

# First, start server: chroma run --path /db_path
client = chromadb.HttpClient(host="localhost", port=8000)
```

---

## 📝 CRUD Operations

### Create (Add Documents)

```python
"""
Adding Documents to ChromaDB
"""

import chromadb

client = chromadb.PersistentClient(path="./my_db")

# Create or get collection
collection = client.get_or_create_collection(
    name="knowledge_base",
    metadata={"description": "Company knowledge base"}
)

# ============================================
# METHOD 1: Add with automatic embedding
# ============================================

collection.add(
    documents=[
        "Machine learning is a subset of AI",
        "Neural networks are inspired by the brain",
        "Deep learning uses many layers"
    ],
    ids=["ml-001", "ml-002", "ml-003"],
    metadatas=[
        {"topic": "ml", "level": "beginner"},
        {"topic": "neural-nets", "level": "intermediate"},
        {"topic": "deep-learning", "level": "advanced"}
    ]
)

# ============================================
# METHOD 2: Add with pre-computed embeddings
# ============================================

import numpy as np

# Your own embeddings (must match collection's dimension)
embeddings = [
    [0.1, 0.2, 0.3, ...],  # 384 dimensions for default
    [0.2, 0.3, 0.4, ...],
]

collection.add(
    embeddings=embeddings,
    documents=["Doc 1 text", "Doc 2 text"],
    ids=["custom-001", "custom-002"]
)

# ============================================
# METHOD 3: Add without documents (embeddings only)
# ============================================

collection.add(
    embeddings=embeddings,
    ids=["embed-001", "embed-002"],
    metadatas=[{"source": "external"}, {"source": "external"}]
)

print(f"Collection now has {collection.count()} documents")
```

### Read (Query Documents)

```python
"""
Querying ChromaDB
"""

# ============================================
# BASIC QUERY
# ============================================

results = collection.query(
    query_texts=["What is artificial intelligence?"],
    n_results=3
)

print(results)
# {
#     'ids': [['ml-001', 'ml-002', 'ml-003']],
#     'documents': [['Machine learning...', 'Neural networks...', 'Deep learning...']],
#     'distances': [[0.3, 0.5, 0.6]],
#     'metadatas': [[{'topic': 'ml'}, ...]]
# }

# ============================================
# QUERY WITH METADATA FILTER
# ============================================

results = collection.query(
    query_texts=["advanced techniques"],
    n_results=5,
    where={"level": "advanced"}  # Only advanced docs
)

# ============================================
# QUERY WITH DOCUMENT FILTER
# ============================================

results = collection.query(
    query_texts=["learning"],
    n_results=5,
    where_document={"$contains": "neural"}  # Must contain "neural"
)

# ============================================
# GET BY ID
# ============================================

docs = collection.get(
    ids=["ml-001", "ml-002"]
)

# ============================================
# GET ALL DOCUMENTS
# ============================================

all_docs = collection.get()  # Warning: Large collections!

# ============================================
# GET WITH FILTERS
# ============================================

filtered = collection.get(
    where={"topic": "ml"},
    limit=10
)
```

### Update Documents

```python
"""
Updating Documents in ChromaDB
"""

# ============================================
# UPDATE DOCUMENTS
# ============================================

collection.update(
    ids=["ml-001"],
    documents=["Machine learning is a powerful subset of AI"],
    metadatas=[{"topic": "ml", "level": "beginner", "updated": True}]
)

# ============================================
# UPSERT (Update or Insert)
# ============================================

collection.upsert(
    ids=["ml-001", "ml-004"],  # ml-001 exists, ml-004 is new
    documents=[
        "Updated ML definition",
        "Brand new document about transformers"
    ],
    metadatas=[
        {"topic": "ml", "version": 2},
        {"topic": "transformers", "version": 1}
    ]
)
```

### Delete Documents

```python
"""
Deleting from ChromaDB
"""

# ============================================
# DELETE BY ID
# ============================================

collection.delete(ids=["ml-003"])

# ============================================
# DELETE BY FILTER
# ============================================

collection.delete(
    where={"level": "beginner"}
)

# ============================================
# DELETE COLLECTION
# ============================================

client.delete_collection("knowledge_base")
```

---

## 🎯 Embeddings

### Default Embedding

```python
"""
ChromaDB Default Embedding
Uses: all-MiniLM-L6-v2 (384 dimensions)
"""

import chromadb

# Default embedding is automatic
collection = client.create_collection("default_embed")

# Just add documents - embedding happens automatically
collection.add(
    documents=["Hello world", "Machine learning rocks"],
    ids=["1", "2"]
)
```

### OpenAI Embeddings

```python
"""
Using OpenAI Embeddings with ChromaDB
"""

import chromadb
from chromadb.utils import embedding_functions

# Create OpenAI embedding function
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key="your-api-key",
    model_name="text-embedding-3-small"  # or "text-embedding-3-large"
)

# Create collection with OpenAI embeddings
collection = client.create_collection(
    name="openai_embeddings",
    embedding_function=openai_ef
)

# Add documents (will use OpenAI for embedding)
collection.add(
    documents=["AI is transforming industries"],
    ids=["1"]
)
```

### HuggingFace Embeddings

```python
"""
Using HuggingFace Embeddings
"""

from chromadb.utils import embedding_functions

# HuggingFace embedding function
hf_ef = embedding_functions.HuggingFaceEmbeddingFunction(
    model_name="sentence-transformers/all-mpnet-base-v2",  # 768 dims
    api_key="optional-hf-token"
)

collection = client.create_collection(
    name="hf_embeddings",
    embedding_function=hf_ef
)
```

### Custom Embedding Function

```python
"""
Custom Embedding Function
"""

from chromadb import Documents, EmbeddingFunction, Embeddings
import numpy as np

class MyEmbeddingFunction(EmbeddingFunction):
    def __call__(self, input: Documents) -> Embeddings:
        # Your custom embedding logic
        # Must return List[List[float]]
        
        embeddings = []
        for doc in input:
            # Example: simple character-based embedding (don't use in production!)
            vec = [ord(c) / 255 for c in doc[:384]]
            vec += [0] * (384 - len(vec))  # Pad to 384
            embeddings.append(vec)
        
        return embeddings

# Use custom function
collection = client.create_collection(
    name="custom_embed",
    embedding_function=MyEmbeddingFunction()
)
```

### Embedding Comparison

| Model | Dimensions | Speed | Quality | Cost |
|-------|------------|-------|---------|------|
| all-MiniLM-L6-v2 (default) | 384 | Fast | Good | Free |
| all-mpnet-base-v2 | 768 | Medium | Better | Free |
| text-embedding-3-small | 1536 | API | Best | Paid |
| text-embedding-3-large | 3072 | API | Best | Paid |

---

## 🔍 Querying & Filtering

### Query Parameters

```python
"""
Advanced Querying in ChromaDB
"""

# ============================================
# FULL QUERY OPTIONS
# ============================================

results = collection.query(
    query_texts=["search query"],      # Text to search for
    n_results=10,                       # Number of results
    where={"field": "value"},           # Metadata filter
    where_document={"$contains": "x"},  # Document filter
    include=["documents", "distances", "metadatas", "embeddings"]
)
```

### Metadata Filters

```python
"""
Metadata Filtering Operators
"""

# ============================================
# COMPARISON OPERATORS
# ============================================

# Equals
where={"status": "active"}
where={"status": {"$eq": "active"}}

# Not equals
where={"status": {"$ne": "deleted"}}

# Greater than
where={"price": {"$gt": 100}}

# Greater than or equal
where={"price": {"$gte": 100}}

# Less than
where={"price": {"$lt": 100}}

# Less than or equal
where={"price": {"$lte": 100}}

# In list
where={"category": {"$in": ["tech", "science"]}}

# Not in list
where={"category": {"$nin": ["spam", "deleted"]}}

# ============================================
# LOGICAL OPERATORS
# ============================================

# AND
where={
    "$and": [
        {"category": "tech"},
        {"price": {"$lt": 100}}
    ]
}

# OR
where={
    "$or": [
        {"category": "tech"},
        {"category": "science"}
    ]
}

# Combined
where={
    "$and": [
        {"status": "active"},
        {
            "$or": [
                {"priority": "high"},
                {"deadline": {"$lt": "2024-01-01"}}
            ]
        }
    ]
}
```

### Document Filters

```python
"""
Document Content Filtering
"""

# Contains substring
where_document={"$contains": "machine learning"}

# Does not contain
where_document={"$not_contains": "deprecated"}

# Combined with metadata
results = collection.query(
    query_texts=["AI applications"],
    where={"category": "tech"},
    where_document={"$contains": "neural"},
    n_results=5
)
```

### Include Options

```python
"""
Control What's Returned
"""

# Minimal (just IDs)
results = collection.query(
    query_texts=["query"],
    include=[]  # Only returns IDs
)

# Full response
results = collection.query(
    query_texts=["query"],
    include=["documents", "metadatas", "distances", "embeddings"]
)

# Response structure:
# {
#     "ids": [["id1", "id2"]],
#     "documents": [["doc1", "doc2"]],
#     "metadatas": [[{...}, {...}]],
#     "distances": [[0.1, 0.2]],
#     "embeddings": [[[0.1, ...], [0.2, ...]]]
# }
```

---

## 💾 Persistence & Production

### Persistent Storage

```python
"""
Persistent ChromaDB Storage
"""

import chromadb

# ============================================
# LOCAL PERSISTENCE
# ============================================

# Data stored in ./chroma_db folder
client = chromadb.PersistentClient(path="./chroma_db")

# Create collection (persisted automatically)
collection = client.get_or_create_collection("persistent_docs")

# Add data (saved to disk automatically)
collection.add(
    documents=["This will persist"],
    ids=["persist-001"]
)

# Restart program - data is still there!
# collection = client.get_collection("persistent_docs")
# print(collection.count())  # 1
```

### Running ChromaDB Server

```bash
# Install server dependencies
pip install chromadb[server]

# Start server
chroma run --path /path/to/persist --port 8000

# Or with Docker
docker run -p 8000:8000 chromadb/chroma
```

```python
"""
Connecting to ChromaDB Server
"""

import chromadb

# Connect to running server
client = chromadb.HttpClient(
    host="localhost",
    port=8000
)

# Use normally
collection = client.get_or_create_collection("server_collection")
```

### Production Configuration

```python
"""
Production-Ready ChromaDB Setup
"""

import chromadb
from chromadb.config import Settings

# ============================================
# PRODUCTION SETTINGS
# ============================================

settings = Settings(
    # Persistence
    is_persistent=True,
    persist_directory="./production_db",
    
    # Anonymized telemetry (disable in production)
    anonymized_telemetry=False,
    
    # Allow reset (disable in production!)
    allow_reset=False
)

client = chromadb.Client(settings)

# ============================================
# ENVIRONMENT-BASED CONFIG
# ============================================

import os

def get_chroma_client():
    """Get ChromaDB client based on environment"""
    
    env = os.getenv("ENVIRONMENT", "development")
    
    if env == "production":
        return chromadb.HttpClient(
            host=os.getenv("CHROMA_HOST"),
            port=int(os.getenv("CHROMA_PORT", 8000))
        )
    elif env == "development":
        return chromadb.PersistentClient(path="./dev_db")
    else:
        return chromadb.Client()  # In-memory for testing
```

---

## 🚀 Advanced Features

### Multi-Modal Collections

```python
"""
Storing Different Data Types
"""

# Images (as embeddings)
image_collection = client.create_collection(
    name="images",
    metadata={"type": "image"}
)

# Use CLIP or similar for image embeddings
# image_embeddings = clip_model.encode(images)

image_collection.add(
    embeddings=image_embeddings,
    ids=["img-001", "img-002"],
    metadatas=[
        {"filename": "cat.jpg", "category": "animals"},
        {"filename": "dog.jpg", "category": "animals"}
    ]
)
```

### Batch Operations

```python
"""
Efficient Batch Operations
"""

# ============================================
# BATCH ADD
# ============================================

def batch_add(collection, documents, batch_size=100):
    """Add documents in batches"""
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        ids = [f"doc-{i+j}" for j in range(len(batch))]
        
        collection.add(
            documents=batch,
            ids=ids
        )
        print(f"Added {min(i + batch_size, len(documents))}/{len(documents)}")

# ============================================
# PARALLEL QUERIES
# ============================================

from concurrent.futures import ThreadPoolExecutor

def parallel_query(collection, queries, n_results=5):
    """Run multiple queries in parallel"""
    
    def single_query(query):
        return collection.query(
            query_texts=[query],
            n_results=n_results
        )
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(single_query, queries))
    
    return results
```

### Collection Management

```python
"""
Managing Multiple Collections
"""

# ============================================
# LIST COLLECTIONS
# ============================================

collections = client.list_collections()
print([c.name for c in collections])

# ============================================
# COLLECTION INFO
# ============================================

collection = client.get_collection("my_docs")

print(f"Name: {collection.name}")
print(f"Count: {collection.count()}")
print(f"Metadata: {collection.metadata}")

# ============================================
# MODIFY COLLECTION METADATA
# ============================================

collection.modify(
    metadata={"description": "Updated description"}
)

# ============================================
# PEEK AT DATA
# ============================================

sample = collection.peek(limit=5)  # Quick look at first 5 docs
```

---

## ✨ Best Practices

### 1. ID Strategy

```python
"""
ID Best Practices
"""

import uuid
import hashlib

# ============================================
# OPTION 1: UUID (Unique, no meaning)
# ============================================

id = str(uuid.uuid4())  # "550e8400-e29b-41d4-a716-446655440000"

# ============================================
# OPTION 2: Content Hash (Deduplication)
# ============================================

def content_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()[:16]

id = content_hash("Document content")  # "a1b2c3d4e5f6g7h8"

# ============================================
# OPTION 3: Structured ID (Meaningful)
# ============================================

id = f"doc_{source}_{timestamp}_{index}"  # "doc_wiki_20240101_001"
```

### 2. Metadata Design

```python
"""
Metadata Best Practices
"""

# ============================================
# GOOD: Flat, filterable
# ============================================

metadata = {
    "source": "wiki",
    "category": "science",
    "date": "2024-01-15",
    "author": "john_doe",
    "word_count": 500,
    "is_verified": True
}

# ============================================
# BAD: Nested (not supported)
# ============================================

# metadata = {
#     "author": {
#         "name": "John",
#         "email": "john@example.com"  # NOT SUPPORTED
#     }
# }

# ============================================
# WORKAROUND: Flatten nested data
# ============================================

metadata = {
    "author_name": "John",
    "author_email": "john@example.com"
}
```

### 3. Chunking Strategy

```python
"""
Document Chunking for ChromaDB
"""

from langchain.text_splitter import RecursiveCharacterTextSplitter

def chunk_document(document: str, chunk_size: int = 1000):
    """Chunk document for optimal retrieval"""
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=200,  # Overlap prevents context loss
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    
    chunks = splitter.split_text(document)
    
    return [
        {
            "content": chunk,
            "metadata": {
                "chunk_index": i,
                "total_chunks": len(chunks)
            }
        }
        for i, chunk in enumerate(chunks)
    ]

# ============================================
# RECOMMENDED CHUNK SIZES
# ============================================

# FAQ/Short docs: 200-500 characters
# Articles: 500-1000 characters
# Technical docs: 1000-2000 characters
# Code: 500-1500 characters
```

### 4. Error Handling

```python
"""
Robust ChromaDB Operations
"""

import chromadb
from chromadb.errors import (
    InvalidDimensionException,
    DuplicateIDError
)

def safe_add(collection, documents, ids, metadatas=None):
    """Add documents with error handling"""
    
    try:
        collection.add(
            documents=documents,
            ids=ids,
            metadatas=metadatas
        )
        return {"success": True, "added": len(documents)}
    
    except DuplicateIDError as e:
        # IDs already exist - try upsert instead
        collection.upsert(
            documents=documents,
            ids=ids,
            metadatas=metadatas
        )
        return {"success": True, "upserted": len(documents)}
    
    except InvalidDimensionException as e:
        # Embedding dimension mismatch
        return {"success": False, "error": str(e)}
    
    except Exception as e:
        return {"success": False, "error": str(e)}
```

---

## ❓ Interview Questions

### Beginner Level

**Q1: What is ChromaDB used for?**

> **A:** ChromaDB is an open-source vector database designed for AI applications. It stores embeddings (vector representations) of text/data and enables semantic search - finding similar items by meaning rather than keywords. Primary use: RAG systems for LLMs.

**Q2: How does ChromaDB handle embeddings?**

> **A:** ChromaDB can:
> 1. Auto-generate embeddings using built-in model (all-MiniLM-L6-v2)
> 2. Accept custom embedding functions (OpenAI, HuggingFace)
> 3. Store pre-computed embeddings directly
>
> Embeddings are stored alongside documents and metadata.

**Q3: What's the difference between `add` and `upsert`?**

> **A:** 
> - `add`: Inserts new documents. Fails if ID already exists.
> - `upsert`: Insert if new, update if exists. Never fails on duplicates.
>
> Use `add` for guaranteed new data, `upsert` for idempotent operations.

### Intermediate Level

**Q4: How would you optimize ChromaDB for a million documents?**

> **A:** Optimizations:
> 1. **Batch operations:** Add in batches of 1000-5000
> 2. **Persistent storage:** Use PersistentClient, not memory
> 3. **Server mode:** Run as HTTP server for production
> 4. **Metadata indexing:** Use filterable metadata to reduce search space
> 5. **Appropriate chunking:** Smaller chunks = more vectors but better precision

**Q5: How do you handle document updates in ChromaDB?**

> **A:** Strategy depends on use case:
> 1. **Full replace:** Delete old, add new (cleanest)
> 2. **Upsert:** Update if same ID
> 3. **Version metadata:** Keep old with `version` field, filter by latest
> 4. **Soft delete:** Add `deleted: true` metadata, filter it out

**Q6: Compare ChromaDB with Pinecone.**

> **A:** 
> | Aspect | ChromaDB | Pinecone |
> |--------|----------|----------|
> | Cost | Free | Paid |
> | Hosting | Self-hosted | Managed |
> | Scale | Small-medium | Enterprise |
> | Setup | Simple | Simple |
> | Best for | Development, POC | Production |

### Advanced Level

**Q7: How would you implement multi-tenancy in ChromaDB?**

> **A:** Options:
> 1. **Collection per tenant:** Each tenant gets own collection
> 2. **Metadata isolation:** All in one collection, filter by `tenant_id`
> 3. **Separate instances:** Different ChromaDB instances per tenant
>
> Collection per tenant is cleanest but has overhead for many tenants.

**Q8: Design a RAG system with ChromaDB for 10 million documents.**

> **A:** Architecture:
> - **Chunking:** Split into ~1M chunks of 1000 chars each
> - **Sharding:** Multiple ChromaDB instances by topic/date
> - **Caching:** Cache frequent queries
> - **Two-phase retrieval:** Coarse metadata filter, then vector search
> - **Monitoring:** Track query latency, recall rates
> - **Consider migration:** At this scale, consider Milvus or Pinecone

---

## 📝 Homework

### Easy

1. Create a ChromaDB collection with 50 documents
2. Implement search with metadata filtering
3. Compare results with different embedding models

### Medium

4. Build a document Q&A system with persistence
5. Implement batch processing for large document sets
6. Create a multi-collection system (users, documents, conversations)

### Hard

7. Build a hybrid search combining ChromaDB with keyword search
8. Implement a caching layer for frequent queries
9. Create a monitoring dashboard for ChromaDB performance

---

## 🎯 Key Takeaways

```
ChromaDB Essentials:
├── Simple, Python-native vector DB
├── Perfect for RAG and AI apps
├── Auto-embedding or bring your own
└── Great for development and small production

Best Practices:
├── Use meaningful IDs
├── Design flat metadata
├── Chunk documents appropriately
├── Use persistent storage for production
└── Handle errors gracefully

When to Use ChromaDB:
├── ✅ Prototyping and development
├── ✅ Small to medium datasets (<1M docs)
├── ✅ Python-centric applications
├── ❌ Massive scale (use Pinecone/Milvus)
├── ❌ Enterprise SLA requirements
```

---

**Next:** [03-RAG-Pipelines.md](./03-RAG-Pipelines.md) - Build production RAG systems! 🔗
