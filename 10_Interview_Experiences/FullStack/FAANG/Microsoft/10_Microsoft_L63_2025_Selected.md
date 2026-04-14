# Microsoft — L63 FullStack Interview Experience (2025) — #10

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Microsoft |
| **Role** | Senior Software Engineer |
| **Level** | L63 |
| **YOE** | 7 years |
| **Date** | March 2025 |
| **Result** | ✅ Selected |
| **Location** | Hyderabad, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/microsoft-interview-experience/) |
| **Author** | Anonymous |
| **Team** | Azure Data |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (Phone Screen + 3 Technical + HM with "As Appropriate")

---

## Round 3: Coding — Design an LRU Cache with Expiry and Batch Eviction
**Duration:** 45 minutes

### Question: Implement an LRU Cache that supports time-based expiry (TTL) per key. Additionally, support batch eviction: given memory pressure, evict the oldest N entries at once.

```java
import java.util.*;

/**
 * LRU Cache with TTL + Batch Eviction:
 * 
 * - get(key): return value if exists and not expired, else null
 * - put(key, value, ttlMs): insert with TTL
 * - evictBatch(n): remove n least-recently-used entries
 * - size(): return count of non-expired entries
 * 
 * Implementation: HashMap + Doubly-Linked List + lazy TTL check.
 * 
 * Time: get/put O(1), evictBatch O(N), size O(1)
 */
class LRUCacheWithTTL<K, V> {
    
    private static class Node<K, V> {
        K key;
        V value;
        long expiresAt; // System.currentTimeMillis() + ttl
        Node<K, V> prev, next;
        
        Node(K key, V value, long expiresAt) {
            this.key = key; this.value = value; this.expiresAt = expiresAt;
        }
    }
    
    private final int capacity;
    private final Map<K, Node<K, V>> map;
    private final Node<K, V> head; // Most recent
    private final Node<K, V> tail; // Least recent
    private int size;
    
    public LRUCacheWithTTL(int capacity) {
        this.capacity = capacity;
        this.map = new HashMap<>();
        this.head = new Node<>(null, null, 0); // Sentinel
        this.tail = new Node<>(null, null, 0); // Sentinel
        head.next = tail;
        tail.prev = head;
        this.size = 0;
    }
    
    public V get(K key) {
        Node<K, V> node = map.get(key);
        if (node == null) return null;
        
        // Check TTL
        if (node.expiresAt > 0 && System.currentTimeMillis() > node.expiresAt) {
            removeNode(node);
            map.remove(key);
            size--;
            return null;
        }
        
        // Move to front (most recently used)
        moveToHead(node);
        return node.value;
    }
    
    public void put(K key, V value, long ttlMs) {
        Node<K, V> existing = map.get(key);
        
        if (existing != null) {
            existing.value = value;
            existing.expiresAt = ttlMs > 0 ? System.currentTimeMillis() + ttlMs : 0;
            moveToHead(existing);
            return;
        }
        
        // Evict if at capacity
        if (size >= capacity) {
            evictLRU();
        }
        
        long expiresAt = ttlMs > 0 ? System.currentTimeMillis() + ttlMs : 0; // 0 = no expiry
        Node<K, V> node = new Node<>(key, value, expiresAt);
        map.put(key, node);
        addToHead(node);
        size++;
    }
    
    /**
     * Batch eviction: remove N least-recently-used entries.
     * Walk from tail (LRU end) and remove N nodes.
     * 
     * Use case: memory pressure detected → evict aggressively.
     */
    public int evictBatch(int n) {
        int evicted = 0;
        
        while (evicted < n && size > 0) {
            Node<K, V> lru = tail.prev;
            if (lru == head) break; // Empty
            
            removeNode(lru);
            map.remove(lru.key);
            size--;
            evicted++;
        }
        
        return evicted;
    }
    
    /**
     * Evict all expired entries proactively.
     * Called periodically or when size exceeds soft limit.
     */
    public int evictExpired() {
        long now = System.currentTimeMillis();
        int evicted = 0;
        
        // Walk from tail (oldest) — likely to find expired entries first
        Node<K, V> current = tail.prev;
        while (current != head) {
            Node<K, V> prev = current.prev;
            
            if (current.expiresAt > 0 && now > current.expiresAt) {
                removeNode(current);
                map.remove(current.key);
                size--;
                evicted++;
            }
            
            current = prev;
        }
        
        return evicted;
    }
    
    private void evictLRU() {
        Node<K, V> lru = tail.prev;
        if (lru != head) {
            removeNode(lru);
            map.remove(lru.key);
            size--;
        }
    }
    
    private void addToHead(Node<K, V> node) {
        node.prev = head;
        node.next = head.next;
        head.next.prev = node;
        head.next = node;
    }
    
    private void removeNode(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }
    
    private void moveToHead(Node<K, V> node) {
        removeNode(node);
        addToHead(node);
    }
    
    public int size() { return size; }
    
    /**
     * Get all keys (for debugging/monitoring).
     * Returns in MRU → LRU order.
     */
    public List<K> keys() {
        List<K> keys = new ArrayList<>();
        Node<K, V> current = head.next;
        while (current != tail) {
            keys.add(current.key);
            current = current.next;
        }
        return keys;
    }
}
```

---

## 🎯 Key Takeaways
- Microsoft L63 = **LRU Cache with TTL + batch eviction — classic DS with production extensions**
- **Sentinel nodes**: `head` and `tail` dummies — eliminates null checks in add/remove
- **Lazy TTL check**: check expiry in `get()` — O(1), don't scan all entries proactively
- **Proactive eviction**: `evictExpired()` walks from tail (oldest entries) — called periodically or on memory pressure
- **Batch eviction**: `evictBatch(n)` removes N entries from tail — useful for GC pressure relief
- **TTL = 0 means no expiry**: sentinel value, separate from expired
- **Key insight**: doubly-linked list maintains access order, HashMap provides O(1) lookup — standard LRU
- Microsoft = **Azure + productivity tools** — cache design is common because of Azure Redis, Cosmos DB

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Phone Screen | Medium-Hard | Coding |
| Coding 1 | Hard | LRU + TTL + Batch |
| System Design | Very Hard | Azure Data Pipeline |
| Coding 2 | Hard | Graphs |
| HM | Medium | Culture + Values |
