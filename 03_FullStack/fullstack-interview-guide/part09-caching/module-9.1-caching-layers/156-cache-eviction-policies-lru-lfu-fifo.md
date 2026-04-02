# Cache Eviction Policies — LRU, LFU, FIFO
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **LRU** (Least Recently Used): evict the item that was accessed furthest back in time — works well for temporal locality (recently used data is likely to be used again)
- **LFU** (Least Frequently Used): evict the item with the fewest total accesses — works well when some items are structurally "hot" forever (e.g. a homepage product)
- **FIFO** (First In, First Out): evict the oldest inserted item — simple but ignores access patterns; rarely optimal for real caches
- 🔥 Redis default is **allkeys-lru** — safe for general caches; switch to **allkeys-lfu** (Redis 4+) when your workload has long-lived hot keys
- The classic interview question: "Implement LRU Cache in O(1)" → **HashMap + Doubly Linked List** (or Java's `LinkedHashMap`)

---

## 1. One-Line Definition
Cache eviction policies decide which item to remove when the cache is full and a new item needs space — LRU removes the least recently used, LFU removes the least frequently used, and FIFO removes the oldest inserted item.

---

## 2. The Problem It Solves

Every cache has a fixed size limit. Memory is not free. A Redis instance has 8GB. An in-process Caffeine cache holds 10,000 entries. When the cache is full and a new item arrives, something has to leave to make room.

The question is: which item should leave? Choose the wrong item and you create a "cache miss storm" — you just evicted the data that 80% of requests actually need. Now all those requests hit your DB simultaneously and you have undone all the benefit of the cache.

Imagine you have a product catalog cache with 10,000 slots. Your homepage shows 20 featured products that every user loads. But your catalog has 1 million products. With FIFO eviction, those 20 homepage products will eventually be pushed out as newer items arrive — even though they are accessed 10,000 times per hour. With LRU, they stay warm because they are constantly being used, keeping them at the front of the eviction queue. With LFU, they are essentially permanent residents because their access count far exceeds any other item.

Choosing the right policy is the difference between a cache that helps and a cache that thrills you in staging and destroys you in production.

---

## 3. How It Works Internally

### The Mental Model
Imagine your cache as a hotel with 100 rooms. When a new guest arrives and the hotel is full, you need to ask one guest to leave. **FIFO** says: "Ask whoever checked in first to leave — doesn't matter if they've been here every week for years." **LRU** says: "Ask whoever hasn't been active recently — they've probably already left mentally." **LFU** says: "Ask whoever visited the fewest times — they're clearly not a loyal guest."

Each policy has a situation where it makes the right call and situations where it makes the wrong call.

### The Mechanism — Step by Step

**LRU (Least Recently Used):**
1. Every cache access (read or write) moves that item to the "most recently used" position
2. The cache maintains an implicit ordering from most-recently to least-recently used
3. On eviction: remove the item at the "least recently used" end
4. Data structure: HashMap for O(1) lookup + Doubly Linked List for O(1) move-to-front and O(1) remove-from-tail
5. Works well because of **temporal locality** — if you used something recently, you'll likely use it again soon

**LFU (Least Frequently Used):**
1. Every access increments a frequency counter for that item
2. On eviction: remove the item with the lowest frequency counter
3. Tie-breaking: among items with the same frequency, evict the least recently used one
4. Data structure: HashMap of item→frequency + min-heap or frequency buckets
5. Works well when hot items (homepage features, popular products) should survive regardless of recent access
6. Problem: **frequency aging** — an item that was hot 6 months ago but is now rarely accessed keeps a high counter and never gets evicted. Redis uses a decay counter to solve this.

**FIFO (First In, First Out):**
1. Items are stored in insertion order (queue structure)
2. On eviction: remove the item that was inserted earliest, regardless of access patterns
3. Simple to implement — just a queue
4. Works well when items have a natural expiry based on age (log entries, time-series data)
5. Does not benefit from any access pattern — a frequently accessed item that was inserted early will be evicted

**Where they live:**
- Redis: configurable via `maxmemory-policy` (allkeys-lru, allkeys-lfu, volatile-lru, volatile-lfu, allkeys-random, noeviction)
- Caffeine (Spring's default in-process cache): configurable via `maximumSize` + `expireAfterAccess` (LRU) or `expireAfterWrite` (TTL)
- Java's `LinkedHashMap`: can be LRU by construction — pass `accessOrder=true` to constructor

### ASCII Diagram

```
LRU Cache — HashMap + Doubly Linked List

HashMap: { "A"→node_A, "B"→node_B, "C"→node_C }

Most Recently Used                    Least Recently Used
       │                                        │
       ▼                                        ▼
  [HEAD] ←→ [node_C] ←→ [node_A] ←→ [node_B] ←→ [TAIL]
              (just     (5 min ago)  (2 hrs ago)
               accessed)

Access "A":  move node_A to after HEAD
  [HEAD] ←→ [node_A] ←→ [node_C] ←→ [node_B] ←→ [TAIL]

Cache full, add "D":  evict node_B (LRU), insert node_D after HEAD
  [HEAD] ←→ [node_D] ←→ [node_A] ←→ [node_C] ←→ [TAIL]

HashMap: { "A"→node_A, "C"→node_C, "D"→node_D }  (B evicted)
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Naive LRU cache using a simple HashMap — O(n) eviction, wrong approach
public class NaiveLruCache<K, V> {
    private final int capacity;
    private final Map<K, V> map = new HashMap<>();
    private final List<K> accessOrder = new ArrayList<>(); // O(n) to scan!

    public V get(K key) {
        if (!map.containsKey(key)) return null;
        // O(n) to find and move to end — terrible at scale
        accessOrder.remove(key);
        accessOrder.add(key);
        return map.get(key);
    }

    public void put(K key, V value) {
        if (map.size() >= capacity && !map.containsKey(key)) {
            K lru = accessOrder.remove(0); // O(n) — removes from front of ArrayList
            map.remove(lru);
        }
        map.put(key, value);
        accessOrder.add(key);
    }
}
```
> **Why this fails in production:** `ArrayList.remove(index 0)` is O(n) — it shifts every element left. At 10,000 cache entries and high request rate, this is a performance disaster. The whole point of an LRU cache is O(1) access AND O(1) eviction.

### Right Way — Production Quality

**Option 1: Classic interview answer — HashMap + Doubly Linked List (O(1) everything):**
```java
public class LruCache<K, V> {

    // Node in doubly linked list
    private static class Node<K, V> {
        K key;
        V value;
        Node<K, V> prev, next;
        Node(K key, V value) { this.key = key; this.value = value; }
    }

    private final int capacity;
    // O(1) lookup
    private final Map<K, Node<K, V>> map = new HashMap<>();
    // Sentinel head/tail — no null checks, simplifies edge cases
    private final Node<K, V> head = new Node<>(null, null);
    private final Node<K, V> tail = new Node<>(null, null);

    public LruCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    public V get(K key) {
        Node<K, V> node = map.get(key);
        if (node == null) return null;
        moveToFront(node);   // O(1)
        return node.value;
    }

    public void put(K key, V value) {
        Node<K, V> node = map.get(key);
        if (node != null) {
            // Update existing node — move to front
            node.value = value;
            moveToFront(node);   // O(1)
        } else {
            if (map.size() == capacity) {
                // Evict LRU — the node just before tail
                Node<K, V> lru = tail.prev;
                remove(lru);         // O(1)
                map.remove(lru.key); // O(1)
            }
            Node<K, V> newNode = new Node<>(key, value);
            addToFront(newNode); // O(1)
            map.put(key, newNode);
        }
    }

    private void moveToFront(Node<K, V> node) {
        remove(node);
        addToFront(node);
    }

    private void remove(Node<K, V> node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void addToFront(Node<K, V> node) {
        node.next = head.next;
        node.prev = head;
        head.next.prev = node;
        head.next = node;
    }
}
```

**Option 2: Production Spring Boot cache with Caffeine (LRU/LFU, zero boilerplate):**
```java
// Spring Boot + Caffeine — the real production choice
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        // products cache: LRU by access time
        // maximumSize=10000 — evicts LRU when full
        // expireAfterAccess=30min — TTL resets on every read (good for active products)
        manager.registerCustomCache("products",
            Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterAccess(30, TimeUnit.MINUTES)
                .recordStats()   // enables hit rate monitoring via Micrometer
                .build());

        // categories cache: TTL but NOT LRU — categories rarely change, always serve from cache
        // expireAfterWrite — TTL counts from write, not last access
        manager.registerCustomCache("categories",
            Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(1, TimeUnit.HOURS)
                .recordStats()
                .build());

        return manager;
    }
}
```

**Redis eviction policy — application.yml compatible config:**
```yaml
# Redis server config (redis.conf or AWS ElastiCache parameter group)
maxmemory: 2gb
# allkeys-lru: evict any key using LRU when memory limit reached (best general default)
# allkeys-lfu: use LFU — better if you have long-lived hot keys (Redis 4+)
# volatile-lru: only evict keys that have a TTL set — safer if some keys must never be evicted
# noeviction: reject new writes when full — use only if you prefer errors over stale data
maxmemory-policy: allkeys-lru
```

> **Key decisions here:**
> - `maximumSize` is mandatory in Caffeine — without it, the cache grows unbounded and causes out-of-memory errors
> - `expireAfterAccess` vs `expireAfterWrite`: use access-based for popular items (TTL resets on reads, keeps hot items warm); use write-based for freshness-critical data
> - Redis `allkeys-lru` is safer than `volatile-lru` because `volatile-lru` only evicts keyed entries with TTL — if you forget to set TTL on a key, it becomes permanent even at memory limit
> - `recordStats()` in Caffeine exposes hit rates to Micrometer — watch for hit rate drops below 80% as a signal to increase cache size or re-examine your eviction policy

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is LRU caching and why is it used more often than FIFO?"

**Hruday's answer:**
> LRU stands for Least Recently Used — when the cache is full and a new item needs space, LRU evicts whichever item was accessed least recently. FIFO simply removes whatever was added to the cache first, ignoring whether it's been accessed since.
>
> LRU wins in most real-world systems because of temporal locality — data that was accessed recently is statistically likely to be accessed again soon. A product page accessed 1 second ago is far more likely to be requested again than one that was last accessed 2 hours ago. FIFO doesn't account for this at all, so it can evict highly popular items that just happen to have been loaded early. For a product catalog or session cache, LRU keeps the frequently used data warm, which is exactly what the cache is for. FIFO is occasionally used for time-series caches where data legitimately expires in insertion order — like log buffers — but that's a narrow use case.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you implement an LRU cache in O(1) time for both get and put? Walk me through the data structure."

**Hruday's answer:**
> The key insight is that you need O(1) for three operations: lookup (does this key exist?), move-to-front (mark as recently used), and evict-last (remove the least recently used). No single standard data structure gives you all three in O(1), so you combine two.
>
> You use a **HashMap** for O(1) lookup — keys map to nodes. You use a **Doubly Linked List** for O(1) ordering — because with both prev and next pointers, you can remove and re-insert any node in O(1) without scanning the list. The head of the list holds the most recently used item, the tail holds the least recently used.
>
> On every `get`: look up the node in the HashMap, then remove it from its current position in the list and re-insert it at the head. Both operations are O(1) because you have the node pointer directly.
>
> On `put` when cache is full: remove the node at the tail (the LRU item), delete its key from the HashMap, create a new node at the head, and add to the HashMap. All O(1).
>
> In Java, `LinkedHashMap` with `accessOrder=true` and the `removeEldestEntry` override gives you this without writing it by hand — it's backed by exactly this structure internally.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you choose LFU over LRU, and what problem does the LFU 'frequency aging' issue cause?"

**Hruday's answer:**
> I'd choose LFU when my workload has structurally hot keys that don't change — for example, a homepage that always shows the same 20 featured products, or a lookup table of country codes that's read thousands of times per minute. LRU might evict these if they haven't been accessed in the last few minutes due to a brief traffic lull, even though they're the most important items to cache. LFU would keep them because their total access count is extremely high.
>
> The frequency aging problem is the main weakness of classic LFU. Imagine a product that went viral during a flash sale 3 months ago — it accumulated 100,000 cache hits. Now that sale is over and it gets 5 hits per day. With naive LFU, that item's frequency counter is still 100,000, so it never gets evicted even though it's now rarely used, and new popular items can't take its slot. The cache becomes polluted with historically hot but now cold items.
>
> Redis solves this with a decay-based approximate LFU — the frequency counter is capped at 255 and decays over time (configurable via `lfu-decay-time`). So items that were hot in the past will eventually have their frequency decay toward zero and become eligible for eviction. The default decay is 1 unit per minute, so a historically hot item naturally becomes evictable within hours if no longer accessed.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You're building a product recommendation cache for Swiggy. 10 million unique products, but 20% of products get 80% of all requests. What eviction policy would you choose and how would you size the cache?"

**Hruday's answer:**
> This is a classic Pareto distribution workload — 20% of items get 80% of traffic. LRU handles this well because those 20% hot products will stay in the cache due to constant recent access. I would start with Redis `allkeys-lru`.
>
> For sizing, if I have 10 million products but 80% of traffic hits 2 million products, I want to cache those 2 million. A typical product JSON object is about 2KB. So 2 million × 2KB = 4GB. I'd provision an 8GB Redis instance to give headroom and avoid constant eviction pressure.
>
> I'd monitor the cache hit rate via Redis `INFO stats` or Micrometer metrics. If the hit rate is above 90%, the cache is right-sized. If it drops below 80%, the working set is larger than I estimated and I need to either increase memory or switch to LFU to be more selective about what stays warm.
>
> For the truly critical items — the top 100 restaurants and their menus that every user sees on the homepage — I'd consider pinning them with no TTL (in Redis, keys without TTL are never evicted by `volatile-lru`, only by `allkeys-lru`). Using `volatile-lru` on everything else combined with no-TTL keys for critical items gives me both safety nets.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| LRU implementation | "I'd use a LinkedList" | Doubly linked list + HashMap together — LinkedList alone is O(n) for moves; you need the HashMap so you can jump directly to any node in O(1) |
| LFU frequency problem | "LFU is always better than LRU" | LFU has frequency staleness — historically hot items pollute the cache; Redis fixes this with decay. LRU is the safer general default |
| Redis eviction | "Set `maxmemory` and you're done" | Must also set `maxmemory-policy` — default is `noeviction` which rejects writes when full, causing errors instead of graceful eviction |
| Caffeine vs Redis | "Pick one" | Use both: Caffeine for in-process L1 (microsecond latency), Redis for distributed L2 (millisecond latency, shared across pods) |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we built an in-process cache for Angular component configuration data using a Map with a manual size limit. When the limit was hit, we just cleared the whole map — which caused a thundering herd as every component re-fetched at the same time. After studying this problem, I'd now use Caffeine with LRU eviction and a maximum size, which gives graceful eviction instead of a full cache flush. The concept of evicting the least-used item to make room — rather than clearing everything — was the insight I was missing. I also now use Redis `allkeys-lru` as a production standard with `maxmemory` configured before any cache goes live."

---

## 8. Scale Evolution

**1,000 users/day →** An in-process Caffeine LRU cache with `maximumSize=1000` handles everything. No need for distributed cache. LRU is correct — recently accessed items are likely to be popular.

**100,000 users/day →** Cache needs to be shared across multiple pods — move to Redis. Set `maxmemory-policy: allkeys-lru`. Configure `maxmemory` to leave 20% headroom on the Redis instance. Monitor hit rate. At this scale, eviction policy errors start to cost real DB load.

**10 million users/day →** LRU vs LFU becomes a strategic decision based on your workload access pattern. Consider Redis `allkeys-lfu` if you have structurally hot keys (homepage, top sellers). Add a local Caffeine L1 cache in front of Redis to reduce Redis network calls by ~60% for the hottest keys. Cache hit rate at each layer must be monitored separately — an L1 hit rate below 50% means your L1 cache is too small.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment method lists, UPI handle lookups — small fixed sets, extremely hot access patterns — LFU ideal | Know when LFU beats LRU: fixed hot working sets |
| Swiggy / Meesho | Restaurant/product catalog — Pareto workload (20% items, 80% traffic) — LRU keeps hot items warm automatically | Can you explain cache sizing math for a working set? |
| Adobe / Microsoft | Creative asset metadata, document templates — large datasets with skewed access — LRU with Caffeine + Redis two-tier | Know the two-tier cache pattern and when to apply it |
| SAP Labs | Enterprise product master data — relatively small working set, must never be evicted — `volatile-lru` + no-TTL pinning for critical keys | Do you know how to pin critical cache items in Redis using eviction policy nuances? |

---

## 10. Related Topics — What to Study Next

- **Topic 157 — Cache Invalidation Strategies** — eviction handles full caches; invalidation handles stale data — they solve different problems and you need both
- **Topic 158 — Cache Aside vs Read-Through vs Write-Through** — how data gets into the cache in the first place; eviction policy only matters once the cache is populated
- **Topic 102 — Redis as Cache (TTL, Eviction Policies)** — Redis-specific deep dive covering all 8 eviction policies in detail and when each applies
- **Topic 159 — Cache Stampede Prevention** — what happens when LRU evicts a hot key and thousands of requests hit the DB simultaneously; how to prevent it
- **Topic 281 — Implement LRU Cache (DSA)** — the classic coding interview question; HashMap + Doubly Linked List in detail with full Java implementation

---

*Part 9 · Cache Eviction Policies — LRU, LFU, FIFO · Full Stack Interview Guide · Hruday D · 2026*
