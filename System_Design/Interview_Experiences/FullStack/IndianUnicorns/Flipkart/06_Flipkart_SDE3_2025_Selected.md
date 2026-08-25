# Flipkart — SDE-3 FullStack Interview Experience (2025) — #6

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Flipkart |
| **Role** | SDE-3 |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |
| **Team** | Flipkart Commerce Platform |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Machine Coding + 2 Technical + System Design + HM)

---

## Round 1: Coding
**Duration:** 60 minutes

### Questions Asked
1. **LRU Cache with Expiry + Write-Through** (LeetCode 146 variant)
2. **Follow-up: Make it thread-safe with minimal contention**

### 💡 LRU Cache with TTL + Write-Through

```java
class LRUCacheWithTTL<K, V> {
    private final int capacity;
    private final long defaultTTLms;
    private final Map<K, Node<K, V>> map;
    private final Node<K, V> head, tail; // Doubly-linked list sentinels
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    private final Consumer<Map.Entry<K, V>> writeThrough; // Optional write-through callback
    
    LRUCacheWithTTL(int capacity, long defaultTTLms, Consumer<Map.Entry<K, V>> writeThrough) {
        this.capacity = capacity;
        this.defaultTTLms = defaultTTLms;
        this.map = new HashMap<>();
        this.writeThrough = writeThrough;
        
        head = new Node<>(null, null, 0);
        tail = new Node<>(null, null, 0);
        head.next = tail;
        tail.prev = head;
    }
    
    V get(K key) {
        lock.readLock().lock();
        try {
            Node<K, V> node = map.get(key);
            if (node == null) return null;
            
            // Check TTL
            if (node.isExpired()) {
                // Need write lock to remove
                lock.readLock().unlock();
                lock.writeLock().lock();
                try {
                    // Double-check after acquiring write lock
                    node = map.get(key);
                    if (node != null && node.isExpired()) {
                        removeNode(node);
                        map.remove(key);
                    }
                    return null;
                } finally {
                    lock.readLock().lock(); // Downgrade
                    lock.writeLock().unlock();
                }
            }
            
            // Move to front (most recently used)
            // Need write lock for this
            return node.value;
        } finally {
            lock.readLock().unlock();
        }
    }
    
    void put(K key, V value) {
        put(key, value, defaultTTLms);
    }
    
    void put(K key, V value, long ttlMs) {
        lock.writeLock().lock();
        try {
            Node<K, V> existing = map.get(key);
            
            if (existing != null) {
                existing.value = value;
                existing.expiresAt = System.currentTimeMillis() + ttlMs;
                moveToFront(existing);
            } else {
                // Evict if at capacity
                if (map.size() >= capacity) {
                    Node<K, V> lru = tail.prev;
                    removeNode(lru);
                    map.remove(lru.key);
                }
                
                Node<K, V> newNode = new Node<>(key, value, System.currentTimeMillis() + ttlMs);
                addToFront(newNode);
                map.put(key, newNode);
            }
        } finally {
            lock.writeLock().unlock();
        }
        
        // Write-through to backing store (outside lock)
        if (writeThrough != null) {
            writeThrough.accept(Map.entry(key, value));
        }
    }
    
    // Periodic cleanup of expired entries
    void evictExpired() {
        lock.writeLock().lock();
        try {
            // Walk from tail (LRU end) — expired entries likely near tail
            Node<K, V> current = tail.prev;
            while (current != head) {
                Node<K, V> prev = current.prev;
                if (current.isExpired()) {
                    removeNode(current);
                    map.remove(current.key);
                }
                current = prev;
            }
        } finally {
            lock.writeLock().unlock();
        }
    }
    
    private void addToFront(Node<K, V> node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
    
    private void removeNode(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private void moveToFront(Node<K, V> node) {
        removeNode(node);
        addToFront(node);
    }
    
    static class Node<K, V> {
        K key;
        V value;
        long expiresAt;
        Node<K, V> prev, next;
        
        Node(K key, V value, long expiresAt) {
            this.key = key;
            this.value = value;
            this.expiresAt = expiresAt;
        }
        
        boolean isExpired() {
            return System.currentTimeMillis() > expiresAt;
        }
    }
}
```

---

## Round 2: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Flipkart's Search System**
   - Query understanding: spell correction, synonym expansion
   - Product ranking: relevance + personalization + freshness
   - Faceted filters: brand, price range, ratings, category
   - Autocomplete / search suggestions
   - Scale: 100M products, 50K queries/sec during sale

### 💡 Key Architecture

```
Query Flow:
User types "iph" → Autocomplete service (Trie + Elasticsearch prefix)
User searches "iphone 15pro" → 
  1. Query Understanding: "iphone 15 pro" (tokenize, spell correct)
  2. Query Expansion: "iphone 15 pro" OR "apple iphone 15 pro"  
  3. Elasticsearch: BM25 scoring + custom boosting
  4. Re-ranking: ML model (click-through rate, conversion, personalization)
  5. Facet aggregation: brand counts, price ranges
  6. Return top 60 results (paginated)

Search Architecture:
┌───────────┐
│   User    │
└─────┬─────┘
      │
┌─────▼─────────────┐
│  Search Gateway    │  Rate limit, cache popular queries (Caffeine L1 → Redis L2)
└─────┬─────────────┘
      │
┌─────▼──────────────┐
│ Query Understanding │
│ • Tokenizer         │  "iphone15pro" → ["iphone", "15", "pro"]
│ • Spell Corrector   │  "iphne" → "iphone" (edit distance ≤ 2, SymSpell)
│ • Synonym Expansion │  "mobile" → "mobile" OR "phone" OR "smartphone"  
│ • Intent Detection  │  "iphone under 50000" → intent=purchase, price_max=50000
└─────┬──────────────┘
      │
┌─────▼──────────────┐
│ Elasticsearch       │  10 shards × 2 replicas = 20 instances
│ Cluster             │  Index: product catalog (100M docs)
│                     │  BM25 + function_score boosting:
│                     │    - title match: 3x boost
│                     │    - exact match: 5x boost
│                     │    - in-stock: 2x boost
│                     │    - sponsored: position boost
│                     │    - recency: decay function (newer = higher)
└─────┬──────────────┘
      │ Top 200 candidates
┌─────▼──────────────┐
│ Re-Ranking Service  │  ML model (LightGBM / TensorFlow Serving)
│                     │  Features:
│                     │    - Query-product relevance score
│                     │    - Historical CTR for this product
│                     │    - User's past purchase categories
│                     │    - Price competitiveness score
│                     │    - Seller rating
│                     │    - Product freshness
│                     │  → Re-scores top 200 → return top 60
└─────┬──────────────┘
      │
┌─────▼──────────────┐
│ Facet Aggregation   │  Elasticsearch aggregations:
│                     │  - Brand: terms agg (top 20 brands)
│                     │  - Price: range agg (buckets: 0-500, 500-1K, ...)
│                     │  - Rating: terms agg (4+, 3+, ...)
│                     │  - Category: terms agg (hierarchical)
│                     │  Applied as post_filter (preserves other facet counts)
└──────────────────────┘

Indexing Pipeline:
Product catalog changes (Kafka) → 
  Transform Worker → 
    Enrich (fetch seller, brand, image info) →
      Index to ES (bulk API, background) →
        Verify (compare source vs index, periodic audit)

Scale Handling (Big Billion Days):
- Query cache: 40% hit rate on popular queries (30-second TTL)
- ES cluster: 20 data nodes, autoscale to 40 during sale
- Read replicas: 2 → 4 during peak
- Circuit breaker: if ES latency > 500ms, serve from cache-only mode
- Fallback: if search is down, redirect to category pages
```

---

## 🎯 Key Takeaways
- Flipkart SDE-3 = **LRU with TTL + Search system design + e-commerce domain**
- **LRU + TTL**: check expiry on `get`, periodic `evictExpired`, write-through to backing store
- **Thread-safety**: `ReadWriteLock` → concurrent reads, exclusive writes
- **Write-through**: persist to DB outside the lock to minimize contention
- **Search pipeline**: query understanding → ES retrieval → ML re-ranking → facet aggregation
- **Spell correction**: SymSpell (precomputed deletes) — faster than Levenshtein at query time
- **Facets**: ES `post_filter` preserves other facet counts when user applies a filter
- Flipkart SDE-3: expect **deep system design** + solid DSA + leadership stories

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Machine Coding | Medium-Hard | Java Craft Demo |
| Coding | Hard | LRU + TTL + Thread Safety |
| Technical 2 | Medium-Hard | Java Internals, Concurrency |
| System Design | Hard | Search, Elasticsearch, ML Re-ranking |
| HM | Medium | Leadership, Ownership |
