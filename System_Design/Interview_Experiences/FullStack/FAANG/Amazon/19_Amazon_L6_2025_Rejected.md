# Amazon — L6 Interview Experience (2025)

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Amazon |
| **Role** | SDE-3 |
| **Level** | L6 (Senior) |
| **YOE** | 6 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Seattle |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience/) |

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 4 On-site)
- **Timeline:** 3 weeks
- **Format:** Virtual

## Round 3: Coding — LRU Cache with TTL and Frequency Tracking

### Problem
Design an advanced cache that combines:
1. **LRU eviction** — evict least recently used when capacity full
2. **TTL (Time-To-Live)** — entries expire after configurable duration
3. **Frequency tracking** — promote frequently accessed keys
4. **Batch expiry** — lazy + periodic cleanup of expired entries
5. **Stats** — hit rate, miss rate, eviction count

This is a hybrid LRU + LFU with TTL (the "adaptive cache" Amazon uses internally).

### 💡 Interview-Ready Answer

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

public class AdaptiveCache<K, V> {

    static class CacheEntry<K, V> {
        final K key;
        V value;
        long expiresAt;          // System.nanoTime() deadline
        final AtomicInteger frequency = new AtomicInteger(1);
        long lastAccessed;

        CacheEntry(K key, V value, long ttlNanos) {
            this.key = key;
            this.value = value;
            this.lastAccessed = System.nanoTime();
            this.expiresAt = (ttlNanos > 0) ? this.lastAccessed + ttlNanos : Long.MAX_VALUE;
        }

        boolean isExpired() {
            return System.nanoTime() >= expiresAt;
        }
    }

    private final int capacity;
    private final long defaultTTLNanos;
    private final Map<K, CacheEntry<K, V>> store;
    private final LinkedList<K> accessOrder; // front = most recent

    // Stats
    private final AtomicLong hits = new AtomicLong(0);
    private final AtomicLong misses = new AtomicLong(0);
    private final AtomicLong evictions = new AtomicLong(0);
    private final AtomicLong expirations = new AtomicLong(0);

    public AdaptiveCache(int capacity, long defaultTTLMillis) {
        this.capacity = capacity;
        this.defaultTTLNanos = TimeUnit.MILLISECONDS.toNanos(defaultTTLMillis);
        this.store = new ConcurrentHashMap<>(capacity);
        this.accessOrder = new LinkedList<>();
    }

    public synchronized V get(K key) {
        CacheEntry<K, V> entry = store.get(key);

        if (entry == null) {
            misses.incrementAndGet();
            return null;
        }

        // Check TTL
        if (entry.isExpired()) {
            remove(key);
            expirations.incrementAndGet();
            misses.incrementAndGet();
            return null;
        }

        // Update access order and frequency
        accessOrder.remove(key);
        accessOrder.addFirst(key);
        entry.frequency.incrementAndGet();
        entry.lastAccessed = System.nanoTime();
        hits.incrementAndGet();

        return entry.value;
    }

    public synchronized void put(K key, V value) {
        put(key, value, defaultTTLNanos);
    }

    public synchronized void put(K key, V value, long ttlNanos) {
        // Lazy expiry: clean expired entries before adding
        cleanExpired();

        CacheEntry<K, V> existing = store.get(key);
        if (existing != null) {
            // Update existing
            existing.value = value;
            existing.expiresAt = (ttlNanos > 0) ? System.nanoTime() + ttlNanos : Long.MAX_VALUE;
            existing.lastAccessed = System.nanoTime();
            existing.frequency.incrementAndGet();
            accessOrder.remove(key);
            accessOrder.addFirst(key);
            return;
        }

        // Evict if needed
        while (store.size() >= capacity && !accessOrder.isEmpty()) {
            evictOne();
        }

        CacheEntry<K, V> entry = new CacheEntry<>(key, value, ttlNanos);
        store.put(key, entry);
        accessOrder.addFirst(key);
    }

    /**
     * Eviction strategy: hybrid LRU + LFU.
     * Among the bottom 25% LRU entries, evict the one with lowest frequency.
     * This balances recency and frequency.
     */
    private void evictOne() {
        // Candidates: bottom 25% of access order (least recently used)
        int candidateCount = Math.max(1, accessOrder.size() / 4);

        K victimKey = null;
        int lowestFreq = Integer.MAX_VALUE;

        // Iterate from tail (least recently used)
        Iterator<K> it = accessOrder.descendingIterator();
        int checked = 0;
        while (it.hasNext() && checked < candidateCount) {
            K candidate = it.next();
            CacheEntry<K, V> entry = store.get(candidate);
            if (entry == null) {
                it.remove();
                continue;
            }
            // Prefer to evict expired entries first
            if (entry.isExpired()) {
                victimKey = candidate;
                break;
            }
            if (entry.frequency.get() < lowestFreq) {
                lowestFreq = entry.frequency.get();
                victimKey = candidate;
            }
            checked++;
        }

        if (victimKey != null) {
            remove(victimKey);
            evictions.incrementAndGet();
        }
    }

    private void remove(K key) {
        store.remove(key);
        accessOrder.remove(key);
    }

    /**
     * Lazy cleanup: remove expired entries encountered during scan.
     * Only scans tail portion to keep it O(1) amortized.
     */
    private void cleanExpired() {
        int checkLimit = Math.min(accessOrder.size(), capacity / 10 + 1);
        Iterator<K> it = accessOrder.descendingIterator();
        int checked = 0;
        while (it.hasNext() && checked < checkLimit) {
            K key = it.next();
            CacheEntry<K, V> entry = store.get(key);
            if (entry != null && entry.isExpired()) {
                store.remove(key);
                it.remove();
                expirations.incrementAndGet();
            }
            checked++;
        }
    }

    public synchronized int size() {
        return store.size();
    }

    public Map<String, Object> getStats() {
        long h = hits.get(), m = misses.get();
        double hitRate = (h + m) > 0 ? (100.0 * h / (h + m)) : 0;

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("size", store.size());
        stats.put("capacity", capacity);
        stats.put("hits", h);
        stats.put("misses", m);
        stats.put("hitRate", String.format("%.1f%%", hitRate));
        stats.put("evictions", evictions.get());
        stats.put("expirations", expirations.get());
        return stats;
    }

    /**
     * Get frequency distribution of cached items.
     */
    public Map<Integer, Integer> getFrequencyDistribution() {
        Map<Integer, Integer> dist = new TreeMap<>();
        for (CacheEntry<K, V> entry : store.values()) {
            if (!entry.isExpired()) {
                dist.merge(entry.frequency.get(), 1, Integer::sum);
            }
        }
        return dist;
    }

    public static void main(String[] args) throws InterruptedException {
        AdaptiveCache<String, String> cache = new AdaptiveCache<>(5, 2000); // 5 items, 2s TTL

        System.out.println("=== Basic Operations ===");
        cache.put("a", "Apple");
        cache.put("b", "Banana");
        cache.put("c", "Cherry");
        cache.put("d", "Date");
        cache.put("e", "Elderberry");

        System.out.println("get(a): " + cache.get("a"));  // hit
        System.out.println("get(a): " + cache.get("a"));  // hit (freq=3)
        System.out.println("get(b): " + cache.get("b"));  // hit
        System.out.println("get(z): " + cache.get("z"));  // miss

        // Add more → triggers eviction
        System.out.println("\n=== Adding 'f' (triggers eviction) ===");
        cache.put("f", "Fig");
        // 'c', 'd', or 'e' should be evicted (low freq, LRU)
        System.out.println("get(c): " + cache.get("c")); // likely null (evicted)
        System.out.println("get(a): " + cache.get("a")); // should still be present (high freq)

        System.out.println("\nStats: " + cache.getStats());

        // TTL expiry
        System.out.println("\n=== TTL Expiry ===");
        cache.put("temp", "Temporary", TimeUnit.MILLISECONDS.toNanos(500));
        System.out.println("get(temp) immediately: " + cache.get("temp")); // hit
        Thread.sleep(600); // wait for TTL
        System.out.println("get(temp) after 600ms: " + cache.get("temp")); // miss (expired)

        // Frequency distribution
        System.out.println("\nFrequency distribution: " + cache.getFrequencyDistribution());
        System.out.println("Final stats: " + cache.getStats());

        // Large-scale simulation
        System.out.println("\n=== Large-Scale Simulation (Zipf-like access) ===");
        AdaptiveCache<Integer, String> bigCache = new AdaptiveCache<>(100, 10000);
        Random rand = new Random(42);

        // Insert 200 items
        for (int i = 0; i < 200; i++) {
            bigCache.put(i, "value-" + i);
        }

        // Simulate Zipf-like access: hot keys accessed much more often
        for (int i = 0; i < 10000; i++) {
            // Power-law distribution: lower keys much more likely
            int key = (int) Math.pow(rand.nextDouble() * Math.pow(200, 0.5), 2);
            key = Math.min(key, 199);
            bigCache.get(key);
        }

        System.out.println("Large cache stats: " + bigCache.getStats());
        System.out.println("Freq dist (top 5): ");
        bigCache.getFrequencyDistribution().entrySet().stream()
            .sorted(Map.Entry.<Integer, Integer>comparingByKey().reversed())
            .limit(5)
            .forEach(e -> System.out.printf("  freq=%d: %d items%n", e.getKey(), e.getValue()));
    }
}
```

## 🎯 Key Takeaways
- Amazon L6 expects **production-grade** cache implementations, not textbook LRU
- Hybrid eviction: among bottom 25% LRU, pick lowest frequency — balances recency + frequency
- **Lazy expiry** is preferred over background threads for interview simplicity
- System.nanoTime() for TTL (not currentTimeMillis) — monotonic, no wall-clock drift
- AtomicInteger/AtomicLong for stats even in synchronized context — shows concurrent thinking
- Zipf-like access patterns are realistic — hot keys benefit from frequency tracking
- ConcurrentHashMap store + synchronized methods — discuss tradeoff with lock-free approaches

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | Arrays, String |
| DSA 1 | Medium | Binary Search, Greedy |
| DSA 2 | Hard | Cache Design, Eviction Policies, Concurrency |
| System Design | Hard | Distributed Caching (ElastiCache) |
| Bar Raiser | Hard | LP Deep Dive, System Thinking |
