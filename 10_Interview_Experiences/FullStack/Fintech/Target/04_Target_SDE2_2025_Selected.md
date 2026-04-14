# Target — SDE-2 FullStack Interview Experience (2025) — #4

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Target |
| **Role** | Senior Software Engineer |
| **Level** | SDE-2 |
| **YOE** | 5 years |
| **Date** | April 2025 |
| **Result** | ✅ Selected |
| **Location** | Minneapolis, MN (Hybrid) |
| **Source** | [Glassdoor](https://www.glassdoor.com/Interview/Target-Interview-Questions-E194521.htm) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 4 (OA + 2 Technical + HM)

---

## Round 1: DSA
**Duration:** 60 minutes

### Question 1: Design a Rate-Limited API Gateway with Token Bucket per User

```java
import java.util.concurrent.*;

/**
 * Token Bucket Rate Limiter:
 * - Each user gets a bucket with capacity C and refill rate R tokens/second
 * - Request consumes 1 token — if empty, reject (429)
 * - Lazy refill: calculate tokens on access, don't use a timer
 * 
 * Thread-safe using ConcurrentHashMap + AtomicLong for token count.
 * 
 * Time: O(1) per request
 * Space: O(U) where U = number of active users
 */
public class TokenBucketRateLimiter {
    
    static class Bucket {
        final int capacity;
        final double refillRate; // tokens per second
        double tokens;
        long lastRefillTimestamp;
        
        Bucket(int capacity, double refillRate) {
            this.capacity = capacity;
            this.refillRate = refillRate;
            this.tokens = capacity; // Start full
            this.lastRefillTimestamp = System.nanoTime();
        }
        
        synchronized boolean tryConsume() {
            refill();
            
            if (tokens >= 1.0) {
                tokens -= 1.0;
                return true;
            }
            return false;
        }
        
        private void refill() {
            long now = System.nanoTime();
            double elapsed = (now - lastRefillTimestamp) / 1_000_000_000.0;
            double tokensToAdd = elapsed * refillRate;
            
            tokens = Math.min(capacity, tokens + tokensToAdd);
            lastRefillTimestamp = now;
        }
        
        // Seconds until next token is available
        double retryAfter() {
            if (tokens >= 1.0) return 0;
            return (1.0 - tokens) / refillRate;
        }
    }
    
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final int defaultCapacity;
    private final double defaultRefillRate;
    
    // Cleanup timer for idle buckets
    private final ScheduledExecutorService cleanupScheduler;
    
    public TokenBucketRateLimiter(int capacity, double refillRate) {
        this.defaultCapacity = capacity;
        this.defaultRefillRate = refillRate;
        
        this.cleanupScheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "rate-limiter-cleanup");
            t.setDaemon(true);
            return t;
        });
        
        // Every 5 minutes, remove buckets idle for > 10 minutes
        this.cleanupScheduler.scheduleAtFixedRate(() -> {
            long cutoff = System.nanoTime() - 600_000_000_000L; // 10 min
            buckets.entrySet().removeIf(e -> e.getValue().lastRefillTimestamp < cutoff);
        }, 5, 5, TimeUnit.MINUTES);
    }
    
    public RateLimitResult tryAcquire(String userId) {
        Bucket bucket = buckets.computeIfAbsent(userId, 
            k -> new Bucket(defaultCapacity, defaultRefillRate));
        
        if (bucket.tryConsume()) {
            return new RateLimitResult(true, 0);
        } else {
            return new RateLimitResult(false, bucket.retryAfter());
        }
    }
    
    public static class RateLimitResult {
        final boolean allowed;
        final double retryAfterSeconds;
        
        RateLimitResult(boolean allowed, double retryAfterSeconds) {
            this.allowed = allowed;
            this.retryAfterSeconds = retryAfterSeconds;
        }
    }
}
```

### Question 2: Merge Overlapping Intervals with Streaming Input

```java
/**
 * Streaming interval merge: intervals arrive one at a time.
 * Maintain a sorted set of non-overlapping intervals.
 * On each new interval, merge with any overlapping existing intervals.
 * 
 * Time: O(log n) per insert + O(k) for merging k overlapping intervals
 * Space: O(n) — TreeMap of non-overlapping intervals
 */
public class StreamingIntervalMerge {
    
    // TreeMap: key = start, value = end (non-overlapping, sorted by start)
    private final TreeMap<Integer, Integer> intervals = new TreeMap<>();
    
    public void addInterval(int start, int end) {
        if (start > end) return;
        
        // Find all intervals that overlap with [start, end]
        // An interval [s, e] overlaps if s <= end AND e >= start
        
        Integer lo = intervals.floorKey(end);   // Largest start <= end
        Integer hi = intervals.ceilingKey(start); // Smallest start >= start
        
        // Actually, we need to find the range [lo..hi] that overlaps
        // More precise: check intervals with start <= end AND end >= start
        
        int mergedStart = start;
        int mergedEnd = end;
        
        // Remove all overlapping intervals and expand merged range
        // Check from the left: intervals whose end >= start
        Map.Entry<Integer, Integer> entry = intervals.floorEntry(end);
        
        // Collect all overlapping
        NavigableMap<Integer, Integer> toCheck = intervals.headMap(end, true);
        
        List<Integer> toRemove = new ArrayList<>();
        
        for (Map.Entry<Integer, Integer> e : toCheck.descendingMap().entrySet()) {
            int s = e.getKey();
            int eEnd = e.getValue();
            
            if (eEnd < start) break; // No more overlap possible (sorted, going left)
            
            // This interval overlaps
            mergedStart = Math.min(mergedStart, s);
            mergedEnd = Math.max(mergedEnd, eEnd);
            toRemove.add(s);
        }
        
        // Also check the interval just after 'end'
        Map.Entry<Integer, Integer> ceiling = intervals.ceilingEntry(start);
        while (ceiling != null && ceiling.getKey() <= mergedEnd) {
            mergedStart = Math.min(mergedStart, ceiling.getKey());
            mergedEnd = Math.max(mergedEnd, ceiling.getValue());
            toRemove.add(ceiling.getKey());
            ceiling = intervals.higherEntry(ceiling.getKey());
        }
        
        // Remove overlapping intervals
        for (int key : toRemove) {
            intervals.remove(key);
        }
        
        // Insert merged interval
        intervals.put(mergedStart, mergedEnd);
    }
    
    public List<int[]> getIntervals() {
        List<int[]> result = new ArrayList<>();
        for (Map.Entry<Integer, Integer> e : intervals.entrySet()) {
            result.add(new int[]{ e.getKey(), e.getValue() });
        }
        return result;
    }
}
```

---

## Round 2: System Design — Target Inventory Management + Curbside Pickup

### Architecture:
```
┌─────────────────────────────────────────────────────────────────┐
│           Target Inventory + Curbside Pickup System             │
│                                                                 │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐                      │
│  │ Website │  │ App      │  │ POS      │                       │
│  │ (Online)│  │ (Mobile) │  │ (In-Store)│                      │
│  └────┬────┘  └────┬─────┘  └────┬─────┘                      │
│       │            │             │                              │
│       ▼            ▼             ▼                              │
│  ┌──────────────────────────────────────┐                       │
│  │     API Gateway + BFF Layer          │                       │
│  └────────────────┬─────────────────────┘                       │
│                   │                                             │
│  ┌────────────────┼────────────────┐                            │
│  │    Inventory Allocation Engine   │                           │
│  │                                  │                           │
│  │  Per-Store Inventory View:       │                           │
│  │  ┌──────────────────────────┐    │                           │
│  │  │ Store #1234: Widget A    │    │                           │
│  │  │ On-hand: 50              │    │                           │
│  │  │ Reserved (curbside): 5   │    │                           │
│  │  │ Reserved (ship): 8       │    │                           │
│  │  │ Damaged/hold: 2          │    │                           │
│  │  │ Available to sell: 35    │    │                           │
│  │  │ Safety stock: 10         │    │                           │
│  │  │ Available to promise: 25 │    │                           │
│  │  └──────────────────────────┘    │                           │
│  │                                  │                           │
│  │  ATP = on_hand - reserved -      │                           │
│  │        damaged - safety_stock    │                           │
│  │                                  │                           │
│  │  Reservation: 2-phase            │                           │
│  │  1. Soft reserve (5 min TTL)     │                           │
│  │  2. Hard reserve (payment done)  │                           │
│  └──────────────────────────────────┘                            │
│                                                                 │
│  Curbside Pickup Flow:                                          │
│  1. Customer places order online → reserve inventory at store   │
│  2. Store associate picks items → scan barcode → mark "picked"  │
│  3. Customer arrives → checks in via app (geofence 200m)        │
│  4. Associate notified → brings order to car → scan handoff     │
│  5. Customer confirms receipt → order complete                  │
│                                                                 │
│  ┌──────────────────────────────────────────────┐               │
│  │ Data Stores                                   │               │
│  │ - PostgreSQL: orders, reservations            │               │
│  │ - Redis: real-time inventory counts (ATP)     │               │
│  │ - Kafka: inventory events (sale/return/recv)  │               │
│  │ - Elasticsearch: product search + availability│               │
│  └──────────────────────────────────────────────┘               │
│                                                                 │
│  Scale: 1,900 stores, 200K+ SKUs per store,                    │
│         1M+ curbside orders/day peak (holiday)                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways
- Target SDE-2 = **Token bucket rate limiter + streaming intervals + inventory system design**
- **Token bucket lazy refill**: calculate tokens on access — no background thread per bucket
- **Cleanup scheduler**: remove idle buckets periodically — prevent memory leak from abandoned users
- **Retry-After header**: `(1.0 - tokens) / refillRate` — tells client exactly when to retry
- **Streaming interval merge**: TreeMap-based — `floorEntry`/`ceilingEntry` to find overlapping range
- **ATP (Available to Promise)**: on_hand - reserved - damaged - safety_stock — key retail concept
- **2-phase reservation**: soft (TTL) → hard (paid) — prevents overselling while allowing cart abandonment
- Target = **retail domain expertise** — inventory management, ATP, curbside pickup, omnichannel

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| DSA | Medium-Hard | Token Bucket, Interval Merge |
| System Design | Hard | Inventory, Curbside Pickup |
| Technical 2 | Medium | Java, Spring Boot |
| HM | Medium | Culture Fit |
