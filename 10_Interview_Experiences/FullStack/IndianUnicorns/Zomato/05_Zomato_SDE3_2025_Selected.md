# Zomato — SDE-3 FullStack Interview Experience (2025) — #5

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Zomato |
| **Role** | Senior Software Engineer |
| **Level** | SDE-3 |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Gurgaon, India |
| **Source** | [GeeksForGeeks](https://www.geeksforgeeks.org/zomato-interview-experience/) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (OA + 2 Technical + System Design + HM)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Design a Multi-Level Caching System (L1 in-memory, L2 Redis)

```java
import java.util.*;
import java.util.concurrent.*;

/**
 * Multi-level cache: L1 (in-memory LRU) → L2 (Redis/external) → DB.
 * 
 * Read: L1 hit? return. L1 miss → L2 hit? populate L1, return. L2 miss → DB → populate L2 + L1.
 * Write: Write to DB → invalidate L1 + L2 (write-through invalidation).
 * 
 * L1: bounded LRU with TTL, per-instance (not shared).
 * L2: shared external cache (Redis), larger capacity.
 * 
 * Features:
 * - Async L2/DB fetch with singleflight (prevent thundering herd)
 * - Stats: hit rate per level
 */
public class MultiLevelCache<K, V> {
    
    interface CacheLevel<K, V> {
        V get(K key);
        void put(K key, V value, long ttlMs);
        void invalidate(K key);
    }
    
    // L1: In-memory LRU with TTL
    static class L1Cache<K, V> implements CacheLevel<K, V> {
        private final int capacity;
        private final LinkedHashMap<K, CacheEntry<V>> map;
        
        static class CacheEntry<V> {
            V value;
            long expiresAt;
            
            CacheEntry(V value, long ttlMs) {
                this.value = value;
                this.expiresAt = System.currentTimeMillis() + ttlMs;
            }
            
            boolean isExpired() { return System.currentTimeMillis() > expiresAt; }
        }
        
        L1Cache(int capacity) {
            this.capacity = capacity;
            this.map = new LinkedHashMap<>(capacity, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<K, CacheEntry<V>> eldest) {
                    return size() > capacity;
                }
            };
        }
        
        @Override
        public synchronized V get(K key) {
            CacheEntry<V> entry = map.get(key);
            if (entry == null || entry.isExpired()) {
                if (entry != null) map.remove(key);
                return null;
            }
            return entry.value;
        }
        
        @Override
        public synchronized void put(K key, V value, long ttlMs) {
            map.put(key, new CacheEntry<>(value, ttlMs));
        }
        
        @Override
        public synchronized void invalidate(K key) {
            map.remove(key);
        }
    }
    
    // L2: Simulated external cache (Redis-like)
    static class L2Cache<K, V> implements CacheLevel<K, V> {
        private final ConcurrentHashMap<K, CacheEntry<V>> store = new ConcurrentHashMap<>();
        
        static class CacheEntry<V> {
            V value;
            long expiresAt;
            
            CacheEntry(V value, long ttlMs) {
                this.value = value;
                this.expiresAt = System.currentTimeMillis() + ttlMs;
            }
        }
        
        @Override
        public V get(K key) {
            CacheEntry<V> entry = store.get(key);
            if (entry == null || System.currentTimeMillis() > entry.expiresAt) {
                if (entry != null) store.remove(key);
                return null;
            }
            return entry.value;
        }
        
        @Override
        public void put(K key, V value, long ttlMs) {
            store.put(key, new CacheEntry<>(value, ttlMs));
        }
        
        @Override
        public void invalidate(K key) {
            store.remove(key);
        }
    }
    
    private final L1Cache<K, V> l1;
    private final L2Cache<K, V> l2;
    private final java.util.function.Function<K, V> dbLoader;
    private final long l1TtlMs;
    private final long l2TtlMs;
    
    // Singleflight: prevent thundering herd on cache miss
    private final ConcurrentHashMap<K, CompletableFuture<V>> inflight = new ConcurrentHashMap<>();
    
    // Stats
    private final java.util.concurrent.atomic.AtomicLong l1Hits = new java.util.concurrent.atomic.AtomicLong();
    private final java.util.concurrent.atomic.AtomicLong l2Hits = new java.util.concurrent.atomic.AtomicLong();
    private final java.util.concurrent.atomic.AtomicLong misses = new java.util.concurrent.atomic.AtomicLong();
    
    public MultiLevelCache(int l1Capacity, long l1TtlMs, long l2TtlMs,
                           java.util.function.Function<K, V> dbLoader) {
        this.l1 = new L1Cache<>(l1Capacity);
        this.l2 = new L2Cache<>();
        this.dbLoader = dbLoader;
        this.l1TtlMs = l1TtlMs;
        this.l2TtlMs = l2TtlMs;
    }
    
    public V get(K key) {
        // L1 check
        V value = l1.get(key);
        if (value != null) {
            l1Hits.incrementAndGet();
            return value;
        }
        
        // L2 check
        value = l2.get(key);
        if (value != null) {
            l2Hits.incrementAndGet();
            l1.put(key, value, l1TtlMs); // Promote to L1
            return value;
        }
        
        // DB fetch with singleflight
        misses.incrementAndGet();
        return fetchWithSingleflight(key);
    }
    
    private V fetchWithSingleflight(K key) {
        CompletableFuture<V> future = inflight.computeIfAbsent(key, k -> {
            return CompletableFuture.supplyAsync(() -> {
                V val = dbLoader.apply(k);
                if (val != null) {
                    l2.put(k, val, l2TtlMs);
                    l1.put(k, val, l1TtlMs);
                }
                return val;
            });
        });
        
        try {
            V result = future.get(5, TimeUnit.SECONDS);
            inflight.remove(key); // Cleanup
            return result;
        } catch (Exception e) {
            inflight.remove(key);
            return null;
        }
    }
    
    public void invalidate(K key) {
        l1.invalidate(key);
        l2.invalidate(key);
    }
    
    public String getStats() {
        long total = l1Hits.get() + l2Hits.get() + misses.get();
        return String.format("L1 hit: %.1f%%, L2 hit: %.1f%%, Miss: %.1f%% (total: %d)",
            total > 0 ? l1Hits.get() * 100.0 / total : 0,
            total > 0 ? l2Hits.get() * 100.0 / total : 0,
            total > 0 ? misses.get() * 100.0 / total : 0,
            total);
    }
}
```

---

## Round 2: System Design — Zomato Restaurant Partner Dashboard

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│          Zomato Restaurant Partner Dashboard                    │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Restaurant Partner App (Web + Tablet)             │           │
│  │                                                   │           │
│  │ ┌────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐ │           │
│  │ │ Orders │ │  Menu   │ │Analytics │ │Settings │ │           │
│  │ │ Queue  │ │ Manager │ │Dashboard │ │ Hours   │ │           │
│  │ └────────┘ └─────────┘ └──────────┘ └─────────┘ │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Order Management:                                 │           │
│  │                                                   │           │
│  │ New Order → Accept (auto-accept option) →         │           │
│  │ Preparing → Ready for Pickup →                    │           │
│  │ Picked Up by Delivery Partner                     │           │
│  │                                                   │           │
│  │ - Real-time push via WebSocket                    │           │
│  │ - Audio alert for new orders                      │           │
│  │ - Auto-reject if not accepted in 3 minutes        │           │
│  │ - Batch accept during peak hours                  │           │
│  │ - Prep time estimation (ML-based)                 │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Menu Management:                                  │           │
│  │ - Toggle items available/unavailable real-time    │           │
│  │ - Bulk price update                               │           │
│  │ - Category reordering                             │           │
│  │ - Image upload with auto-compression              │           │
│  │ - Seasonal/promotional items                      │           │
│  │ - Addon/variant configuration                     │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌──────────────────────────────────────────────────┐           │
│  │ Analytics:                                        │           │
│  │ - Revenue: daily/weekly/monthly trend             │           │
│  │ - Top selling items                               │           │
│  │ - Average prep time vs target                     │           │
│  │ - Customer rating distribution                    │           │
│  │ - Order cancellation rate + reasons               │           │
│  │ - Competitor benchmarking (zone avg)              │           │
│  │                                                   │           │
│  │ Pre-aggregated in OLAP (ClickHouse):              │           │
│  │ - Hourly rollups for real-time dashboard          │           │
│  │ - Daily rollups for trend charts                  │           │
│  └──────────────────────────────────────────────────┘           │
│                                                                 │
│  Backend:                                                       │
│  - API Gateway → Restaurant Service → Order Service             │  
│  - WebSocket for real-time order push                           │
│  - Kafka for order events                                       │
│  - PostgreSQL for orders/menu                                   │
│  - ClickHouse for analytics (pre-aggregated)                    │
│  - S3 + CDN for menu images                                     │
│  - Redis for session + real-time availability                   │
│                                                                 │
│  Scale: 200K+ restaurant partners, 2M orders/day               │
│  Latency: order push < 500ms, menu update < 1s                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Zomato SDE-3 = **Multi-level cache + restaurant partner dashboard design**
- **Multi-level cache**: L1 (in-memory LRU) → L2 (Redis) → DB — waterfall lookup with promotion
- **Singleflight pattern**: `computeIfAbsent` with `CompletableFuture` — prevents thundering herd on cache miss
- **Cache stats**: atomic counters for L1 hits, L2 hits, misses — monitor hit rates to tune capacity/TTL
- **TTL strategy**: L1 shorter (30s) than L2 (5min) — L1 is per-instance, stale data is worse
- **Write invalidation**: invalidate both levels on write — simpler than write-through for consistency
- **Analytics**: ClickHouse OLAP for pre-aggregated dashboards — PostgreSQL for transactional data
- Zomato SDE-3 = **food-tech domain**: order lifecycle, prep time estimation, restaurant operations

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| OA | Medium | DSA |
| DSA | Hard | Multi-Level Cache, Singleflight |
| System Design | Very Hard | Restaurant Dashboard, Analytics |
| Technical 2 | Hard | Java, Distributed Systems |
| HM | Medium | Culture Fit |
