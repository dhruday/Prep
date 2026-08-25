# 141. Search System (like Google, Elasticsearch)

## 📌 Problem Statement

**Design a search system** that allows users to search through millions of documents with autocomplete.

**Example**:
```
User types: "machine lear"
Autocomplete suggests: "machine learning", "machine learning tutorial"
User searches: "machine learning tutorial"
Results: Top 10 relevant documents ranked by relevance
```

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **Full-text search**: Search across title, content, tags
2. **Autocomplete**: Suggest queries as user types
3. **Ranking**: Return results sorted by relevance
4. **Filters**: Filter by date, category, author
5. **Highlighting**: Highlight matching terms in results

### **Non-Functional Requirements**

1. **Low latency**: Search results in < 200ms
2. **High throughput**: 10k search queries/sec
3. **Scalability**: 100 million documents
4. **Relevance**: High-quality results (precision & recall)

---

## 🎯 Step 2: Capacity Estimation

### **Documents**

```
Total documents: 100 million
Document size: 10 KB average
Total storage: 100M × 10 KB = 1 TB (raw data)
Index size: 30% of raw data = 300 GB (inverted index)
```

### **Search Queries**

```
Searches per day: 100 million
Searches per second: 100M / 86400 = 1.2k QPS
Peak traffic: 5x = 6k QPS
```

---

## 🎯 Step 3: Core Concepts

### **1. Inverted Index**

**Problem**: Searching 100M documents linearly (slow)

**Solution**: Inverted index (term → document IDs)

**Example**:

```
Documents:
Doc 1: "Machine learning is amazing"
Doc 2: "Learning Python is fun"
Doc 3: "Machine vision and learning"

Inverted Index:
"machine"  → [1, 3]
"learning" → [1, 2, 3]
"python"   → [2]
"amazing"  → [1]
"fun"      → [2]
"vision"   → [3]
```

**Search "machine learning"**:

```
1. Lookup "machine" → [1, 3]
2. Lookup "learning" → [1, 2, 3]
3. Intersection → [1, 3]  (both terms present)
```

---

### **2. TF-IDF (Term Frequency-Inverse Document Frequency)**

**Ranking algorithm**: Score documents by relevance

**Formula**:

```
TF-IDF(term, doc) = TF(term, doc) × IDF(term)

TF(term, doc) = (Frequency of term in doc) / (Total terms in doc)
IDF(term) = log(Total documents / Documents containing term)
```

**Example**:

```
Query: "machine learning"
Doc 1: "Machine learning is amazing and machine learning is powerful"
Doc 2: "Learning Python"

TF("machine", Doc 1) = 2 / 8 = 0.25
TF("learning", Doc 1) = 2 / 8 = 0.25
IDF("machine") = log(2 / 1) = 0.3  (appears in 1 doc)
IDF("learning") = log(2 / 2) = 0    (appears in all docs, common word)

Score(Doc 1) = (0.25 × 0.3) + (0.25 × 0) = 0.075
Score(Doc 2) = (0 × 0.3) + (0.5 × 0) = 0

Ranking: Doc 1 (0.075) > Doc 2 (0)
```

**Insight**: Rare terms ("machine") score higher than common terms ("learning")

---

### **3. BM25 (Best Matching 25)** ✓

**Improved ranking** (used by Elasticsearch)

**Formula** (simplified):

```
BM25(term, doc) = IDF(term) × (TF(term, doc) × (k + 1)) / (TF(term, doc) + k × (1 - b + b × (doc_length / avg_doc_length)))

k = 1.2 (term frequency saturation)
b = 0.75 (length normalization)
```

**Benefit**: Better than TF-IDF (handles document length, term saturation)

---

## 🎯 Step 4: High-Level Design

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │
       │ 1. Search query: "machine learning"
       ▼
┌─────────────────────────────────────┐
│      Load Balancer                  │
└──────────────┬──────────────────────┘
               │
               │ 2. Route to Search Service
               ▼
┌─────────────────────────────────────┐
│      Search Service (API)           │
│  - Parse query                      │
│  - Query Elasticsearch              │
│  - Rank results                     │
└──────────────┬──────────────────────┘
               │
               │ 3. Query index
               ▼
┌─────────────────────────────────────┐
│    Elasticsearch Cluster            │
│  - Inverted index (sharded)         │
│  - BM25 ranking                     │
└──────────────┬──────────────────────┘
               │
               │ 4. Return results
               ▼
┌─────────────────────────────────────┐
│       Cache (Redis)                 │
│  - Cache popular queries            │
└─────────────────────────────────────┘
```

---

## 🎯 Step 5: Elasticsearch Implementation

### **1. Create Index**

```json
PUT /documents
{
  "settings": {
    "number_of_shards": 5,
    "number_of_replicas": 1,
    "analysis": {
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "snowball"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "my_analyzer"
      },
      "content": {
        "type": "text",
        "analyzer": "my_analyzer"
      },
      "tags": {
        "type": "keyword"
      },
      "created_at": {
        "type": "date"
      }
    }
  }
}
```

---

### **2. Index Document**

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(['localhost:9200'])

document = {
    'title': 'Machine Learning Tutorial',
    'content': 'Learn machine learning basics...',
    'tags': ['ml', 'tutorial'],
    'created_at': '2024-01-15T10:00:00Z'
}

es.index(index='documents', id=1, body=document)
```

---

### **3. Search**

```python
def search(query, page=1, size=10):
    body = {
        'query': {
            'multi_match': {
                'query': query,
                'fields': ['title^3', 'content'],  # Boost title 3x
                'type': 'best_fields',
                'operator': 'and'
            }
        },
        'from': (page - 1) * size,
        'size': size,
        'highlight': {
            'fields': {
                'title': {},
                'content': {}
            }
        }
    }
    
    result = es.search(index='documents', body=body)
    
    return {
        'total': result['hits']['total']['value'],
        'results': [
            {
                'id': hit['_id'],
                'title': hit['_source']['title'],
                'content': hit['_source']['content'][:200],
                'score': hit['_score'],
                'highlights': hit.get('highlight', {})
            }
            for hit in result['hits']['hits']
        ]
    }

# Usage
results = search('machine learning', page=1, size=10)
```

---

### **4. Filters**

```python
body = {
    'query': {
        'bool': {
            'must': {
                'multi_match': {
                    'query': 'machine learning',
                    'fields': ['title', 'content']
                }
            },
            'filter': [
                {'term': {'tags': 'tutorial'}},
                {'range': {'created_at': {'gte': '2024-01-01'}}}
            ]
        }
    }
}

result = es.search(index='documents', body=body)
```

---

## 🎯 Step 6: Autocomplete (Trie / Prefix Search)

### **Approach 1: Trie**

**Concept**: Store queries in trie, search by prefix

**Example**:

```
Queries: ["machine learning", "machine vision", "learning python"]

Trie:
    m
    └── a
        └── c
            └── h
                └── i
                    └── n
                        └── e
                            ├── (space)
                            │   ├── l (learning, count=1000)
                            │   └── v (vision, count=500)

Search "mach" → Traverse to "mach" → Get all children → ["machine learning", "machine vision"]
```

**Implementation**:

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False
        self.frequency = 0
        self.query = None

class Autocomplete:
    def __init__(self):
        self.root = TrieNode()
    
    def insert(self, query, frequency):
        node = self.root
        for char in query:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True
        node.frequency = frequency
        node.query = query
    
    def search(self, prefix, limit=10):
        # 1. Find prefix node
        node = self.root
        for char in prefix:
            if char not in node.children:
                return []
            node = node.children[char]
        
        # 2. DFS to collect all queries
        results = []
        self._dfs(node, results)
        
        # 3. Sort by frequency, return top N
        results.sort(key=lambda x: x['frequency'], reverse=True)
        return results[:limit]
    
    def _dfs(self, node, results):
        if node.is_end:
            results.append({'query': node.query, 'frequency': node.frequency})
        
        for child in node.children.values():
            self._dfs(child, results)

# Usage
autocomplete = Autocomplete()
autocomplete.insert('machine learning', frequency=1000)
autocomplete.insert('machine vision', frequency=500)
autocomplete.insert('learning python', frequency=800)

suggestions = autocomplete.search('mach', limit=5)
# Result: [{'query': 'machine learning', 'frequency': 1000}, {'query': 'machine vision', 'frequency': 500}]
```

---

### **Approach 2: Elasticsearch Completion Suggester** ✓

**Better**: Use Elasticsearch completion suggester (optimized trie)

**Index**:

```json
PUT /autocomplete
{
  "mappings": {
    "properties": {
      "suggest": {
        "type": "completion"
      }
    }
  }
}

POST /autocomplete/_doc/1
{
  "suggest": {
    "input": ["machine learning", "ml"],
    "weight": 1000
  }
}
```

**Search**:

```python
def autocomplete(prefix, limit=5):
    body = {
        'suggest': {
            'query-suggest': {
                'prefix': prefix,
                'completion': {
                    'field': 'suggest',
                    'size': limit,
                    'skip_duplicates': True
                }
            }
        }
    }
    
    result = es.search(index='autocomplete', body=body)
    
    suggestions = []
    for option in result['suggest']['query-suggest'][0]['options']:
        suggestions.append(option['text'])
    
    return suggestions

# Usage
suggestions = autocomplete('mach', limit=5)
# Result: ['machine learning', 'machine vision']
```

---

## 🎯 Step 7: Optimizations

### **1. Caching (Redis)**

**Problem**: Popular queries ("machine learning") hit Elasticsearch repeatedly

**Solution**: Cache search results

```python
import hashlib

def search_with_cache(query):
    # 1. Generate cache key
    cache_key = hashlib.md5(query.encode()).hexdigest()
    
    # 2. Check cache
    cached = redis.get(f'search:{cache_key}')
    if cached:
        return json.loads(cached)
    
    # 3. Cache miss → Query Elasticsearch
    results = search(query)
    
    # 4. Store in cache (TTL = 1 hour)
    redis.setex(f'search:{cache_key}', 3600, json.dumps(results))
    
    return results
```

---

### **2. Sharding**

**Problem**: 100M documents → Single node bottleneck

**Solution**: Shard index across multiple nodes

```json
PUT /documents
{
  "settings": {
    "number_of_shards": 10,  // Distribute across 10 shards
    "number_of_replicas": 2  // 2 replicas per shard (high availability)
  }
}
```

**Sharding strategy**: Hash-based (document_id % num_shards)

---

### **3. Query Optimization**

**Problem**: Searching all fields slow

**Solution**: Boost important fields, limit fields

```python
body = {
    'query': {
        'multi_match': {
            'query': 'machine learning',
            'fields': ['title^3', 'content'],  // Search title (3x boost) + content
            'type': 'best_fields'
        }
    },
    '_source': ['title', 'content'],  // Only return these fields
}
```

---

## 🎯 Step 8: Real-World Examples

### **1. Google Search**

**Scale**: 8.5 billion searches/day

**Algorithm**: PageRank (link analysis) + Content relevance

**Features**:
- Autocomplete (Google Suggest)
- Spell correction ("Did you mean...?")
- Rich snippets (featured results)

**Infrastructure**: Custom (not Elasticsearch, proprietary)

---

### **2. Elasticsearch (Used by Uber, Netflix, GitHub)**

**Scale**: 1+ trillion documents indexed globally

**Use cases**:
- Uber: Search drivers, trips, locations
- Netflix: Search movies, shows
- GitHub: Search code, repositories

**Features**:
- Full-text search
- Aggregations (faceted search)
- Geospatial search

---

### **3. Amazon Product Search**

**Scale**: 350+ million products

**Algorithm**: A9 (proprietary, based on relevance + sales rank)

**Features**:
- Autocomplete
- Filters (price, brand, rating)
- Personalized results (based on purchase history)

---

## 🎓 Interview Tips

**Q: "How do you design a search system?"**

A: "I use **Elasticsearch** for full-text search:

**Core components**:
1. **Inverted index**: Term → Document IDs (fast lookup)
2. **BM25 ranking**: Score documents by relevance (better than TF-IDF)
3. **Sharding**: Distribute index across nodes (scalability)

**Search flow**:
```
User query: 'machine learning'
1. Parse query → Tokenize → ['machine', 'learning']
2. Lookup inverted index:
   - 'machine' → [Doc 1, Doc 3]
   - 'learning' → [Doc 1, Doc 2, Doc 3]
3. Intersection → [Doc 1, Doc 3]
4. Rank by BM25 → Doc 1 (score 0.8), Doc 3 (score 0.5)
5. Return top 10 results
```

**Autocomplete**: Trie (prefix search) or Elasticsearch completion suggester

**Optimizations**: Redis cache (popular queries), field boosting (title^3)

**Scale**: 10k QPS, 100M documents, <200ms latency

Real-world: Uber (search drivers), Netflix (search shows), GitHub (search code)"

---

## 📚 Summary

**Core**: Inverted index (term → docs) + BM25 ranking (relevance scoring)

**Architecture**: Elasticsearch cluster (sharded) + Redis cache + API service

**Autocomplete**: Trie (prefix search) or Elasticsearch completion suggester

**Optimizations**: Caching, sharding, field boosting

**Real-world**: Google (PageRank), Elasticsearch (Uber/Netflix), Amazon (A9) 🚀

