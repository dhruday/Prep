# Uber — SDE-3 FullStack Interview Experience (2025) — #3

## 📋 Meta
| Field | Details |
|-------|---------|
| **Company** | Uber |
| **Role** | SDE-3 |
| **Level** | L5b |
| **YOE** | 7 years |
| **Date** | April 2025 |
| **Result** | ❌ Rejected |
| **Location** | Bangalore, India |
| **Source** | [LeetCode Discuss](https://leetcode.com/discuss/interview-experience) |
| **Author** | Anonymous |

---

## 🔄 Interview Process Overview
- **Total Rounds:** 5 (2 Coding + LLD + System Design + Domain)
- **Rejection Reason:** Domain round — couldn't handle Uber-specific geo-spatial questions

---

## Round 1: Coding 1
**Duration:** 45 minutes

### Questions Asked
1. **Minimum Cost to Connect All Cities** (MST - Prim's / Kruskal's with Union-Find)
2. **Follow-up: If some cities are already connected, what changes?**

### 💡 MST with Pre-existing Connections

```java
class ConnectCities {
    // Kruskal's MST with Union-Find
    public int minimumCost(int n, int[][] connections, int[][] existing) {
        // existing connections have cost 0
        UnionFind uf = new UnionFind(n + 1); // 1-indexed cities
        
        int totalCost = 0;
        int edgesUsed = 0;
        
        // First, union pre-existing connections (free)
        for (int[] conn : existing) {
            uf.union(conn[0], conn[1]);
        }
        
        // Sort new connections by cost
        Arrays.sort(connections, (a, b) -> a[2] - b[2]);
        
        for (int[] conn : connections) {
            int city1 = conn[0], city2 = conn[1], cost = conn[2];
            
            if (uf.find(city1) != uf.find(city2)) {
                uf.union(city1, city2);
                totalCost += cost;
                edgesUsed++;
            }
        }
        
        // Check if all cities connected
        int root = uf.find(1);
        for (int i = 2; i <= n; i++) {
            if (uf.find(i) != root) return -1; // Impossible
        }
        
        return totalCost;
    }
    
    static class UnionFind {
        int[] parent, rank;
        
        UnionFind(int n) {
            parent = new int[n];
            rank = new int[n];
            for (int i = 0; i < n; i++) parent[i] = i;
        }
        
        int find(int x) {
            if (parent[x] != x) parent[x] = find(parent[x]); // Path compression
            return parent[x];
        }
        
        void union(int x, int y) {
            int px = find(x), py = find(y);
            if (px == py) return;
            if (rank[px] < rank[py]) { int tmp = px; px = py; py = tmp; }
            parent[py] = px;
            if (rank[px] == rank[py]) rank[px]++;
        }
    }
}
// Time: O(E log E) for sort, O(E α(V)) for unions ≈ O(E log E)
```

---

## Round 2: LLD
**Duration:** 60 minutes

### Questions Asked
1. **Design an In-Memory Rate Limiter supporting multiple strategies**
   - Token Bucket, Sliding Window, Fixed Window
   - Per-user, per-API, per-IP

### 💡 Rate Limiter with Strategy Pattern

```java
// Strategy interface
interface RateLimitStrategy {
    boolean allowRequest(String key);
    void reset(String key);
}

// Token Bucket
class TokenBucketStrategy implements RateLimitStrategy {
    private final int maxTokens;
    private final double refillRate; // tokens per second
    private final Map<String, double[]> buckets = new ConcurrentHashMap<>();
    // [tokens, lastRefillTimestamp]
    
    TokenBucketStrategy(int maxTokens, double refillRate) {
        this.maxTokens = maxTokens;
        this.refillRate = refillRate;
    }
    
    public synchronized boolean allowRequest(String key) {
        double[] bucket = buckets.computeIfAbsent(key, k -> new double[]{maxTokens, System.nanoTime()});
        
        double now = System.nanoTime();
        double elapsed = (now - bucket[1]) / 1e9; // seconds
        bucket[0] = Math.min(maxTokens, bucket[0] + elapsed * refillRate);
        bucket[1] = now;
        
        if (bucket[0] >= 1.0) {
            bucket[0] -= 1.0;
            return true;
        }
        return false;
    }
    
    public void reset(String key) { buckets.remove(key); }
}

// Sliding Window Log
class SlidingWindowLogStrategy implements RateLimitStrategy {
    private final int maxRequests;
    private final long windowMs;
    private final Map<String, Deque<Long>> logs = new ConcurrentHashMap<>();
    
    SlidingWindowLogStrategy(int maxRequests, long windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }
    
    public boolean allowRequest(String key) {
        Deque<Long> log = logs.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        long now = System.currentTimeMillis();
        long windowStart = now - windowMs;
        
        // Remove expired entries
        while (!log.isEmpty() && log.peekFirst() <= windowStart) {
            log.pollFirst();
        }
        
        if (log.size() < maxRequests) {
            log.addLast(now);
            return true;
        }
        return false;
    }
    
    public void reset(String key) { logs.remove(key); }
}

// Composite Rate Limiter: combine per-user + per-API
class CompositeRateLimiter {
    private final Map<String, RateLimitStrategy> perUserLimiters;
    private final Map<String, RateLimitStrategy> perApiLimiters;
    private final RateLimitStrategy globalLimiter;
    
    boolean allowRequest(String userId, String apiEndpoint, String ipAddress) {
        String userKey = "user:" + userId;
        String apiKey = "api:" + apiEndpoint;
        String ipKey = "ip:" + ipAddress;
        
        // Check all limits — short-circuit on first failure
        RateLimitStrategy userLimiter = perUserLimiters.get(userId);
        if (userLimiter != null && !userLimiter.allowRequest(userKey)) {
            return false; // User rate limit exceeded
        }
        
        RateLimitStrategy apiLimiter = perApiLimiters.get(apiEndpoint);
        if (apiLimiter != null && !apiLimiter.allowRequest(apiKey)) {
            return false; // API rate limit exceeded
        }
        
        if (!globalLimiter.allowRequest(ipKey)) {
            return false; // Global IP rate limit exceeded
        }
        
        return true;
    }
}

// Configuration-driven setup:
// /api/search: TokenBucket(100, 10.0) — burst-friendly
// /api/payment: SlidingWindowLog(5, 60000) — strict, 5 per minute
// Global: TokenBucket(1000, 100.0) — IP-based
```

---

## Round 3: System Design
**Duration:** 60 minutes

### Questions Asked
1. **Design Uber's Dynamic Pricing (Surge Pricing) System**

### 💡 Interview-Ready Answer

```
Uber Surge Pricing:
┌──────────────────────────────────────────────────────────────┐
│  Goal: Balance supply (drivers) and demand (riders)          │
│  by adjusting price dynamically per geo-region               │
│                                                                │
│  Geo-Spatial Partitioning (H3 Hexagonal Grid):               │
│  - World divided into hex cells (H3 resolution 7 ≈ 5 km²)  │
│  - Each hex independently calculates surge multiplier        │
│  - Why hex? Uniform distance to center from edges            │
│    (squares have corner-to-center ≠ edge-to-center)          │
│                                                                │
│  Surge Calculation (per hex, every 2 minutes):               │
│  supply_score = active_drivers - en_route_to_pickup          │
│  demand_score = pending_requests + predicted_requests (ML)   │
│                                                                │
│  ratio = demand_score / max(supply_score, 1)                 │
│                                                                │
│  surge_multiplier = f(ratio):                                │
│    ratio < 1.0  → 1.0x  (no surge)                          │
│    ratio 1-1.5  → 1.2x  (light surge)                       │
│    ratio 1.5-2  → 1.5x  (moderate)                          │
│    ratio 2-3    → 2.0x  (high)                               │
│    ratio > 3    → 2.5-3x (extreme — capped for fairness)    │
│                                                                │
│  Smoothing: exponential moving average (α=0.3)               │
│  surge_t = α * raw_surge + (1 - α) * surge_{t-1}            │
│  Prevents wild oscillations                                   │
│                                                                │
│  Architecture:                                                │
│  ┌──────────────────────────────────────────────┐            │
│  │ Driver Location Service                       │            │
│  │ (GPS pings → H3 cell mapping → Redis GeoSet) │            │
│  └──────────┬───────────────────────────────────┘            │
│             │                                                │
│  ┌──────────▼───────────────────────────────────┐            │
│  │ Surge Computation Service (every 2 min)       │            │
│  │ - Count drivers per H3 cell                   │            │
│  │ - Count pending ride requests per cell         │            │
│  │ - ML: predict demand next 10 min               │            │
│  │   (features: time, day, weather, events,       │            │
│  │    historical demand, nearby cell trends)       │            │
│  │ - Calculate multiplier per cell                 │            │
│  │ - Smooth with EMA                               │            │
│  │ - Store in Redis: surge:{h3_cell} → multiplier │            │
│  └──────────┬───────────────────────────────────┘            │
│             │                                                │
│  ┌──────────▼───────────────────────────────────┐            │
│  │ Pricing Service                                │            │
│  │ - base_fare + (distance × per_km × surge)     │            │
│  │   + (time × per_min × surge)                   │            │
│  │ - Show upfront price to rider                  │            │
│  │ - Lock surge for 5 min after ride request      │            │
│  └──────────────────────────────────────────────┘            │
│                                                                │
│  Anti-Abuse:                                                  │
│  - Surge cap: max 3x in most markets                         │
│  - Natural disaster: disable surge (regulatory + PR)         │
│  - Driver manipulation: detect coordinated log-off            │
│    (if 50%+ drivers in hex log off within 2 min, flag event) │
│  - Rider: show surge clearly + show "notify when drops"      │
│                                                                │
│  Scale:                                                       │
│  - 20M+ rides/day globally                                   │
│  - Surge recomputed every 2 min for 1M+ hex cells            │
│  - Redis cluster: 100K writes/sec for location updates       │
│  - Latency: surge lookup < 10ms (Redis key lookup)           │
└──────────────────────────────────────────────────────────────┘
```

---

## Round 4: Domain Round (Where I Failed)
**Duration:** 60 minutes

### Questions Asked
1. **How would you implement geofencing for airport pickup zones?**
2. **Explain point-in-polygon algorithms and their trade-offs**
3. **How does Uber handle GPS drift in urban canyons?**

### 💡 Where I Failed and What I Should Have Said

```
Geofencing:
- Geofence = polygon defined by lat/lng vertices
- Airport zones: pickup (arrivals terminal), dropoff (departures), staging (driver wait)
- Algorithm: Ray Casting (point-in-polygon) — O(n) per vertex
  - Cast ray from point to infinity
  - Count polygon edge intersections
  - Odd = inside, Even = outside

- Better for millions of points: R-Tree spatial index
  - First: bounding box check (cheap)
  - Then: precise polygon check (expensive, only if bbox matches)

GPS Drift Fix:
- Map matching: snap GPS point to nearest road segment (Hidden Markov Model)
- Kalman filter: combine GPS + accelerometer + gyroscope
- Urban canyon: multi-path reflection from buildings
  - Use WiFi + cell tower triangulation as additional signal
  - Weight GPS samples by HDOP (Horizontal Dilution of Precision)
  - Discard samples with HDOP > 5
```

---

## 🎯 Key Takeaways
- Uber SDE-3 domain round = **geo-spatial knowledge is mandatory**
- **MST with pre-existing connections** = union existing first, then Kruskal's
- **Rate Limiter** with Strategy Pattern — multiple algorithms + composite per-user/per-API
- **Surge Pricing** = H3 hex grid + supply/demand ratio + EMA smoothing + surge cap
- **Geofencing** = Ray Casting for point-in-polygon, R-Tree for spatial indexing
- **GPS drift** = Kalman filter + map matching + HDOP filtering
- Uber values **geo-spatial fundamentals** — study H3, geohash, R-Tree, map matching

## 📊 Difficulty Assessment
| Round | Difficulty | Topics |
|-------|-----------|--------|
| Coding | Medium-Hard | MST, Union-Find, Kruskal's |
| LLD | Hard | Strategy Pattern, Rate Limiter, Concurrency |
| System Design | Very Hard | Surge Pricing, H3 Grid, ML Prediction |
| Domain | Very Hard | Geofencing, GPS, Spatial Algorithms |
