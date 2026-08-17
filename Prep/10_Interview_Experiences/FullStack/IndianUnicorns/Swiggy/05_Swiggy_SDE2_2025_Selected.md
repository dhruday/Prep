# Swiggy — SDE-2 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Swiggy |
| **Role** | Backend Engineer SDE-2 |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Bangalore, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/swiggy-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Design a Least Recently Used Cache with Time-Based Expiry and Batch Eviction

```java
import java.util.*;
import java.util.concurrent.*;

/**
 * LRU Cache with TTL (Time-To-Live) expiry.
 * - get(): O(1) — returns null if expired
 * - put(): O(1) — sets value + TTL
 * - Lazy expiry on access + periodic batch eviction via scheduled thread
 * 
 * Uses: HashMap + DoublyLinkedList + DelayQueue for expiry
 */
public class LRUCacheWithTTL<K, V> {
    
    static class Node<K, V> implements Delayed {
        K key;
        V value;
        long expiryTime; // absolute time in ms
        Node<K, V> prev, next;
        
        Node(K key, V value, long ttlMs) {
            this.key = key;
            this.value = value;
            this.expiryTime = System.currentTimeMillis() + ttlMs;
        }
        
        boolean isExpired() {
            return System.currentTimeMillis() > expiryTime;
        }
        
        @Override
        public long getDelay(TimeUnit unit) {
            return unit.convert(expiryTime - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
        }
        
        @Override
        public int compareTo(Delayed o) {
            return Long.compare(this.getDelay(TimeUnit.MILLISECONDS), 
                              o.getDelay(TimeUnit.MILLISECONDS));
        }
    }
    
    private final int capacity;
    private final long defaultTtlMs;
    private final Map<K, Node<K, V>> map;
    private final Node<K, V> head, tail; // Sentinel nodes
    private final DelayQueue<Node<K, V>> expiryQueue;
    private final ScheduledExecutorService cleaner;
    
    public LRUCacheWithTTL(int capacity, long defaultTtlMs) {
        this.capacity = capacity;
        this.defaultTtlMs = defaultTtlMs;
        this.map = new ConcurrentHashMap<>(capacity);
        
        this.head = new Node<>(null, null, 0);
        this.tail = new Node<>(null, null, 0);
        head.next = tail;
        tail.prev = head;
        
        this.expiryQueue = new DelayQueue<>();
        
        // Background cleaner runs every second
        this.cleaner = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "lru-ttl-cleaner");
            t.setDaemon(true);
            return t;
        });
        
        this.cleaner.scheduleAtFixedRate(this::evictExpired, 1, 1, TimeUnit.SECONDS);
    }
    
    public synchronized V get(K key) {
        Node<K, V> node = map.get(key);
        if (node == null) return null;
        
        // Check TTL
        if (node.isExpired()) {
            removeNode(node);
            map.remove(key);
            return null;
        }
        
        // Move to front (most recently used)
        moveToFront(node);
        return node.value;
    }
    
    public synchronized void put(K key, V value) {
        put(key, value, defaultTtlMs);
    }
    
    public synchronized void put(K key, V value, long ttlMs) {
        Node<K, V> existing = map.get(key);
        
        if (existing != null) {
            // Update existing
            existing.value = value;
            existing.expiryTime = System.currentTimeMillis() + ttlMs;
            moveToFront(existing);
            return;
        }
        
        // Evict if at capacity
        while (map.size() >= capacity) {
            Node<K, V> lru = tail.prev;
            if (lru == head) break;
            removeNode(lru);
            map.remove(lru.key);
        }
        
        // Insert new
        Node<K, V> node = new Node<>(key, value, ttlMs);
        map.put(key, node);
        addToFront(node);
        expiryQueue.offer(node);
    }
    
    private void evictExpired() {
        Node<K, V> expired;
        while ((expired = expiryQueue.poll()) != null) {
            synchronized (this) {
                // Double-check: node might have been refreshed
                Node<K, V> current = map.get(expired.key);
                if (current != null && current.isExpired()) {
                    removeNode(current);
                    map.remove(current.key);
                }
            }
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
    
    public synchronized int size() {
        return map.size();
    }
    
    public void shutdown() {
        cleaner.shutdown();
    }
}
```

### Question 2: Find Minimum Number of Platforms Required at a Railway Station

```java
/**
 * Given arrival[] and departure[] times, find min platforms needed.
 * 
 * Approach: Sort events → scan with counter.
 * Arrival = +1 platform, Departure = -1 platform.
 * Max concurrent = answer.
 * 
 * Time: O(n log n) for sorting
 * Space: O(n) for events array
 */
public int findMinPlatforms(int[] arrival, int[] departure) {
    int n = arrival.length;
    int[][] events = new int[2 * n][2]; // [time, type] where +1=arrive, -1=depart
    
    for (int i = 0; i < n; i++) {
        events[2 * i] = new int[]{ arrival[i], 1 };       // arrive
        events[2 * i + 1] = new int[]{ departure[i], -1 }; // depart
    }
    
    // Sort by time; if same time, departures first (-1 < 1)
    Arrays.sort(events, (a, b) -> a[0] != b[0] ? a[0] - b[0] : a[1] - b[1]);
    
    int platforms = 0, maxPlatforms = 0;
    
    for (int[] event : events) {
        platforms += event[1];
        maxPlatforms = Math.max(maxPlatforms, platforms);
    }
    
    return maxPlatforms;
}
```

---

## Round 2: System Design — Swiggy Real-Time Delivery Allocation System

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│              Swiggy Delivery Allocation System                  │
│                                                                 │
│  Order Placed                                                   │
│  ┌──────────┐                                                   │
│  │ Order    │──→ Allocation Engine ──→ Assign Delivery Partner   │
│  │ Service  │                                                   │
│  └──────────┘                                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────┐        │
│  │              Allocation Engine                       │        │
│  │                                                     │        │
│  │  1. QUERY: Find available DPs within 3km of rest.   │        │
│  │     └─ Redis GEOSEARCH (H3 hex-indexed)             │        │
│  │                                                     │        │
│  │  2. SCORE: Rank candidates by:                      │        │
│  │     ├─ Distance to restaurant (40% weight)          │        │
│  │     ├─ Current queue depth (25% weight)             │        │
│  │     ├─ Acceptance rate (15% weight)                 │        │
│  │     ├─ Rating (10% weight)                          │        │
│  │     └─ Earnings fairness adjustment (10% weight)    │        │
│  │                                                     │        │
│  │  3. OFFER: Send to top-ranked DP                    │        │
│  │     └─ 30-second accept timeout                     │        │
│  │     └─ If rejected/timeout → next candidate         │        │
│  │     └─ After 3 rejects → expand radius to 5km      │        │
│  │                                                     │        │
│  │  4. BATCH: During peak hours, batch orders           │        │
│  │     └─ Hungarian Algorithm for optimal assignment    │        │
│  │     └─ Group 2-3 nearby orders for same DP          │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│  │ DP Location  │  │ Queue Mgmt   │  │ Surge Detection  │      │
│  │ Service      │  │ Service      │  │ Service          │      │
│  │ - GPS every  │  │ - DP current │  │ - Demand/supply  │      │
│  │   5 seconds  │  │   orders     │  │   ratio per zone │      │
│  │ - Redis GEO  │  │ - Max 3      │  │ - Dynamic radius │      │
│  │ - H3 cells   │  │   concurrent │  │   expansion      │      │
│  └──────────────┘  └──────────────┘  └──────────────────┘      │
│                                                                 │
│  Data Flow:                                                     │
│  DP App ──MQTT──→ Location Service ──→ Redis GEO                │
│  Order Service ──Kafka──→ Allocation Engine                     │
│  Allocation ──Push Notification──→ DP App                       │
│                                                                 │
│  Scale:                                                         │
│  - 2M orders/day peak, 500K concurrent DPs                     │
│  - Allocation latency: < 2 seconds                             │
│  - GPS updates: 100K/second aggregate                          │
│  - Kafka partitioned by city_id (50 cities = 50 partitions)    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions:
- **H3 hexagonal grid**: Uber's H3 library for spatial indexing — better than geohash for equidistant neighbors
- **Hungarian Algorithm**: optimal bipartite matching for batch assignment — O(n³) but n is small (< 50 per batch)
- **Earnings fairness**: track daily earnings per DP — boost score for lower-earning DPs to ensure equitable distribution
- **Radius expansion**: start 3km → 5km → 7km if no accepts — prevents order starvation
- **MQTT for GPS**: lightweight pub/sub protocol — better than WebSocket for mobile battery life

---

## 🎯 Key Takeaways
- Swiggy SDE-2 = **LRU with TTL + event-based scheduling + delivery allocation design**
- **LRU + TTL**: dual eviction — LRU for capacity, DelayQueue for time-based — lazy + periodic cleanup
- **ConcurrentHashMap + synchronized**: minimize lock scope — CHM for reads, sync for structural mutations
- **Platform problem**: event sweep line — arrival/departure events sorted by time — classic greedy
- **Delivery allocation**: multi-factor scoring (distance + queue + rating + fairness) — not just nearest
- **Hungarian Algorithm**: for batch optimization during peak hours — optimal matching
- **H3 hexagonal grid**: superior to geohash for spatial queries — uniform neighbor distances
- Swiggy = **food delivery domain knowledge** is a differentiator — understand allocation, batching, surge

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Hard | LRU+TTL, Event Sweepline |
| System Design | Very Hard | Delivery Allocation, Geo, Matching |
| Technical 2 | Medium-Hard | Java, Concurrency, APIs |
| HM | Medium | Culture Fit |
