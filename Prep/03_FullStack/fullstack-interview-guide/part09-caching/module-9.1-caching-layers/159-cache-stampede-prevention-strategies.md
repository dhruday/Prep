# Cache Stampede — Prevention Strategies
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Cache stampede** (also called thundering herd): a hot cache key expires, and thousands of concurrent requests all miss the cache simultaneously and all race to query the DB — the DB gets hit with a sudden spike it wasn't designed for
- **Prevention 1 — Mutex/lock**: only ONE request queries the DB; others wait and then read from the freshly populated cache
- **Prevention 2 — Probabilistic early expiry** (PER): start refreshing the cache before it actually expires — with a randomised probability that increases as TTL approaches zero
- **Prevention 3 — Background refresh**: cache serves the stale value while a single background thread refreshes it asynchronously
- 🔥 The production default: **Caffeine's `refreshAfterWrite`** gives you background refresh with zero extra code; combine with a mutex for truly critical hot keys in Redis

---

## 1. One-Line Definition
A cache stampede happens when a popular cache key expires at the same moment that many concurrent requests are waiting for it — all requests then simultaneously hit the database, causing a load spike that can overwhelm the DB and cause cascading failures.

---

## 2. The Problem It Solves

It is a Tuesday morning at Swiggy. 50,000 users simultaneously open the app to check lunch deals. Your deal feed is cached in Redis with a 5-minute TTL. At exactly 11:30:00 AM, the TTL expires on the deal feed cache key.

In the milliseconds between TTL expiry and the first request re-populating the cache, all 50,000 concurrent requests — held in NGINX, in-flight to your Spring Boot service — each see a cache miss. Each one independently queries the DB for the same deal data. Your PostgreSQL instance, normally handling 200 queries/second, suddenly receives 50,000 queries in under 100ms. Connection pools exhaust within seconds. Query latency spikes from 20ms to 8 seconds. Users see loading spinners or errors. The deal feed that was supposed to drive your highest-traffic minute of the week is down.

This is a cache stampede. It is caused not by a bug in your business logic but by the fundamental design of cache TTL expiry combined with high concurrency. The fix must be baked into how the cache refreshes.

---

## 3. How It Works Internally

### The Mental Model
Imagine a single water tap in an office — that is your DB. 200 people walking by throughout the day use it in small groups — no problem. But at 12:00 PM exactly, everyone's lunch break starts at the same time. All 200 people walk to the tap simultaneously. The tap cannot handle 200 people at once. Chaos.

Cache stampede is the same — except the exact moment of "lunch break" is the moment your cache key expires. Prevention strategies are about staggering who gets to go to the tap, or making sure someone refills the water cooler before lunch starts.

### The Mechanism — Step by Step

**What causes a stampede:**
1. Redis TTL expires for key `deals:homepage`
2. At the same timestamp (millisecond precision), 5,000 requests are in flight to the service
3. All 5,000 call `redisTemplate.get("deals:homepage")` → all get `null` (cache miss)
4. All 5,000 execute the DB query
5. DB gets 5,000 simultaneous queries for the same data
6. DB overwhelmed → all queries slow → all requests timeout → service appears down

**Prevention 1 — Mutex / Distributed Lock:**
1. On cache miss, request 1 acquires a Redis lock `lock:deals:homepage`
2. Request 1 queries the DB and populates the cache
3. Requests 2–5,000: try to acquire the lock → fail → sleep 50ms → retry → cache now populated → read from cache
4. Only one DB query for 5,000 concurrent requests
5. Trade-off: request 2–5,000 experience 50–150ms additional latency while waiting

**Prevention 2 — Probabilistic Early Recomputation (PER):**
1. Cache stores the value with original TTL and a `delta` (recompute cost estimate in seconds)
2. On each cache read: compute `time_to_expire = TTL_remaining`
3. With probability `exp(-β × time_to_expire / delta)` → decide to recompute now (before expiry)
4. As TTL approaches zero, this probability approaches 1 — almost certain to recompute
5. At TTL 5 minutes from now, probability is near zero — won't recompute early
6. One of the early readers triggers an early refresh; the TTL is extended; no mass expiry event ever happens
7. No lock needed — probabilistic spread prevents many readers from recomputing simultaneously

**Prevention 3 — Background/Async Refresh (Stale-While-Revalidate):**
1. Cache entry has two timestamps: `soft_expire` (serve stale after this) and `hard_expire` (never use after this)
2. On read: if before `soft_expire` → return fresh; if between soft and hard → return stale + trigger background refresh
3. Background thread calls DB, populates new value, updates both timestamps
4. Zero latency penalty for users — they always get an instant response (possibly 1-request stale)
5. Only one background DB call, not thousands of concurrent ones
6. Risk: data can be stale for up to one background refresh cycle — not suitable for near-real-time data

### ASCII Diagram

```
WITHOUT PROTECTION — Stampede timeline:

time ──────────────────────────────────────────────────►
       T=0            T=5min (TTL expires)
       cache warm      │─────┬────────────────────────
                             │ 5000 requests, all miss
                             │ 5000 DB queries simultaneously
                             │ DB overwhelmed ⚠️
                             └─ user sees error

                             
WITH MUTEX LOCK:

time ──────────────────────────────────────────────────►
       T=5min (TTL expires)
       │
       ├── Request 1: acquires lock → queries DB → populates cache → releases lock
       │
       ├── Requests 2─5000: wait for lock → read cache (hit) → return instantly
       │
       (1 DB query instead of 5000)


WITH BACKGROUND REFRESH:

time ──────────────────────────────────────────────────►
       T=4min55s (soft expire)          T=5min (hard expire)
       │                                │
       ├── Any reader triggers         request reads stale value (acceptable)
       │   background DB query         + background query completes
       │   (non-blocking)              cache now fresh
       │
       (0 additional latency; 1 background DB query)
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
@Service
public class DealService {

    private final RedisTemplate<String, List<Deal>> redis;
    private final DealRepository repo;

    public List<Deal> getHomeDeals() {
        String key = "deals:homepage";
        List<Deal> cached = (List<Deal>) redis.opsForValue().get(key);
        if (cached != null) return cached;

        // STAMPEDE RISK: if 5000 requests reach this line simultaneously,
        // 5000 DB queries fire at the same moment.
        // No lock, no stagger, no background refresh — pure thundering herd.
        List<Deal> deals = repo.findActiveDeals();
        redis.opsForValue().set(key, deals, 5, TimeUnit.MINUTES);
        return deals;
    }
}
```
> **Why this fails in production:** At high concurrency, TTL expiry creates a race condition. All concurrent requests see the miss simultaneously and all fire DB queries. With 5,000 simultaneous identical queries, connection pools exhaust and the DB grinds to a halt.

### Right Way — Production Quality

**Option 1 — Mutex Lock (Redis distributed lock prevents parallel DB queries):**
```java
@Service
public class DealService {

    private final RedisTemplate<String, List<Deal>> redis;
    private final DealRepository repo;
    // Redisson provides a distributed lock backed by Redis
    private final RedissonClient redisson;

    public List<Deal> getHomeDeals() {
        String cacheKey = "deals:homepage";

        // Check cache first — fast path, no lock needed
        List<Deal> cached = (List<Deal>) redis.opsForValue().get(cacheKey);
        if (cached != null) return cached;

        // Cache miss — acquire lock so only ONE thread queries the DB
        RLock lock = redisson.getLock("lock:" + cacheKey);
        try {
            // tryLock: wait up to 200ms for lock, hold for max 5 seconds
            // 5-second max prevents the lock from being held forever if DB is slow
            if (lock.tryLock(200, 5000, TimeUnit.MILLISECONDS)) {
                try {
                    // Double-check after acquiring lock — another thread may have populated
                    // the cache while we were waiting for the lock
                    cached = (List<Deal>) redis.opsForValue().get(cacheKey);
                    if (cached != null) return cached;

                    // Only ONE request reaches here — all others are waiting for the lock
                    List<Deal> deals = repo.findActiveDeals();
                    redis.opsForValue().set(cacheKey, deals, 5, TimeUnit.MINUTES);
                    return deals;
                } finally {
                    lock.unlock();
                }
            } else {
                // Could not acquire lock in 200ms — serve stale data if available,
                // or return a fallback empty list rather than letting the request fail
                log.warn("Could not acquire deal cache lock — serving stale/fallback");
                return cached != null ? cached : Collections.emptyList();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Collections.emptyList();
        }
    }
}
```

**Option 2 — Caffeine `refreshAfterWrite` (background async refresh — zero user latency):**
```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(DealRepository repo) {
        CaffeineCacheManager manager = new CaffeineCacheManager();

        manager.registerCustomCache("deals",
            Caffeine.newBuilder()
                .maximumSize(1_000)
                // expireAfterWrite: hard expire — entry removed N time after write
                .expireAfterWrite(10, TimeUnit.MINUTES)
                // refreshAfterWrite: triggers ASYNC background refresh N time after write
                // Requests during refresh window get the STALE value (no blocking, no stampede)
                // When refresh completes, next request gets fresh value
                .refreshAfterWrite(5, TimeUnit.MINUTES)
                .recordStats()
                // CacheLoader: called by background thread on refresh
                // Application code just calls @Cacheable as normal
                .build(new CacheLoader<Object, Object>() {
                    @Override
                    public Object load(Object key) throws Exception {
                        log.info("Background refresh for deal cache key: {}", key);
                        return repo.findActiveDeals();
                    }
                }));

        return manager;
    }
}

// Service is clean — no lock code, no refresh logic
@Service
public class DealService {

    @Cacheable(value = "deals", key = "'homepage'")
    public List<Deal> getHomeDeals() {
        return dealRepository.findActiveDeals();
    }
}
```

**application.yml — staggered TTL to prevent all keys expiring together:**
```yaml
# If you have 10,000 product cache keys all set with the same TTL,
# they all expire at the same time → mass stampede.
# Add jitter (random offset) to spread expiry times.
spring:
  cache:
    redis:
      # Base TTL for products — see ProductService for jitter logic
      time-to-live: 3600000   # 1 hour base
```

```java
// Add TTL jitter in service to prevent synchronized mass expiry
@Service
public class ProductService {
    private static final Random RANDOM = new Random();

    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        return repo.findById(id).orElseThrow();
    }

    public void cacheProduct(Long id, Product p) {
        // TTL between 55 and 65 minutes — prevents all 10,000 products expiring at the same second
        long ttlSeconds = 3300 + RANDOM.nextInt(600);  // 55 min + 0..10 min random
        redisTemplate.opsForValue().set("products::" + id, p, ttlSeconds, TimeUnit.SECONDS);
    }
}
```

> **Key decisions here:**
> - The **double-check after acquiring the lock** is critical — without it, the first thread to acquire the lock queries the DB, and when the second thread gets the lock, it queries the DB again even though the cache was just populated
> - `refreshAfterWrite` is different from `expireAfterWrite` — refresh triggers a background DB call but keeps serving the old value; expire removes the entry so the next read blocks and waits for DB
> - **TTL jitter** is the simplest stampede prevention for large caches — if your 10,000 product keys all have identical TTLs, they all expire simultaneously; adding ±5 minutes of randomness spreads expiry across a 10-minute window, limiting simultaneous misses to ~1/10 of the keys at any moment

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a cache stampede and when does it happen?"

**Hruday's answer:**
> A cache stampede happens when a hot, frequently-read cache key expires at the same moment that many concurrent requests are in flight to your service. All those requests see a cache miss simultaneously and all independently go to the database to fetch the data. Instead of your cache absorbing 99% of reads, suddenly the DB gets thousands of queries for identical data in the same second.
>
> The trigger is usually a TTL expiry — you set a 5-minute TTL on a deal feed, and at exactly minute 5, 3,000 concurrent users' requests all reach your service and all see the cache miss. The DB, which normally handles 200 queries per second, suddenly gets 3,000 identical queries in one second. Connection pools exhaust, queries queue up, latency spikes from 20ms to 10 seconds, and the service appears to be down.
>
> It is a timing problem, not a bug in business logic. Hot data + TTL expiry + high concurrency = stampede. The fix must address the concurrency at the cache miss point, not the business logic.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain three specific techniques to prevent a cache stampede."

**Hruday's answer:**
> The first technique is a **distributed mutex lock**. When a request sees a cache miss, it tries to acquire a distributed lock in Redis. Only the request that gets the lock queries the DB and populates the cache. All other requests wait briefly and then read from the freshly populated cache. This eliminates the duplicate DB queries entirely — one DB call regardless of how many concurrent misses. The trade-off is slightly higher latency for the waiting requests, typically 50–200ms.
>
> The second technique is **background refresh** — what Caffeine calls `refreshAfterWrite`. The cache has two thresholds: a soft expiry after which it serves stale values while triggering a background DB query, and a hard expiry after which the entry is truly gone. Most concurrent requests get instant responses with the stale value — zero latency penalty. One background thread makes the DB call. When it completes, the cache is refreshed. This is my preferred approach for data where a few seconds of staleness is acceptable.
>
> The third technique is **TTL jitter** — randomising the TTL of each cache entry so they don't all expire simultaneously. Instead of all 10,000 product cache keys expiring at exactly 11:00 AM, they expire randomly between 10:55 and 11:05. The stampede is spread across 10 minutes, reducing simultaneous misses by 10x. This is the simplest fix and often sufficient combined with a background refresh.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use a mutex lock approach vs background refresh? What are the trade-offs?"

**Hruday's answer:**
> I'd use a mutex lock when data freshness is critical — for example, a user's account balance or a product's real-time inventory count. With a mutex, the data the user receives is always fresh from the DB, never stale. The trade-off is latency: the threads waiting for the lock experience 50–200ms delay. For financial data, I'm happy to pay this latency cost in exchange for correctness.
>
> I'd use background refresh when I can tolerate brief staleness and low latency is more important. For a deal feed or product catalog, serving a value that is 30 seconds old while the cache refreshes in the background is perfectly acceptable. Users don't notice. The first request that triggers the background refresh returns instantly with the old value, and the second request (a few hundred milliseconds later) gets the fresh value. No user experiences any extra latency at all.
>
> The deciding factor is: "Would it be a problem if a user got data that is 30 seconds old?" For a homepage deal — no. For a payment confirmation — yes. For an inventory count showing a sold-out item as in stock — maybe, but I'd argue a 30-second window is acceptable for most product listings with a fallback check at checkout.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Your flash sale goes live at 12:00 PM. At 11:59 AM, you manually clear the cache for all 10,000 deal entries to serve fresh prices. At 12:00 PM, 100,000 users open the app. What happens and how would you have prevented this?"

**Hruday's answer:**
> What happens is a massive planned stampede. You cleared 10,000 cache keys 60 seconds before your highest-traffic event. At 12:00 PM, 100,000 users all see cache misses. The DB gets potentially 100,000 queries in the first few seconds.
>
> The prevention has two parts: how you invalidate, and how you pre-warm. Instead of clearing the cache right before the sale, I would use event-driven cache warming. At 11:55 AM, a background job runs that pre-populates all 10,000 deal cache keys with the correct flash sale prices. By 12:00 PM, the cache is fully warm with correct data. Users hit the cache, not the DB.
>
> If I had to clear the cache (for example, due to a price correction at 11:59), I'd use a staggered eviction — clear keys across a 2-minute window using a Kafka-driven eviction pipeline with rate limiting, so the DB re-population happens at 10 entries per second rather than 10,000 simultaneously. Combined with a mutex lock on each key, at most one request per key hits the DB during the repopulation window — roughly 10–20 concurrent DB queries instead of 100,000.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Cache miss is fine" | "Just query DB on miss" | At high concurrency, simultaneous misses = stampede; the pattern `miss → query DB` is only safe if you control concurrency at the miss point |
| Double-check after lock | Acquire lock → query DB directly | Without double-check after acquiring the lock, the second thread to get the lock queries DB even though the first thread just populated the cache |
| Caffeine refreshAfterWrite | "refreshAfterWrite means stale data is never served" | refreshAfterWrite DOES serve stale data — that's by design; it serves old value and refreshes in background; use expireAfterWrite if you can't tolerate any staleness |
| "Clear cache before sale" | "Flush everything before high traffic" | Clearing cache before a traffic spike guarantees a stampede; pre-warm instead — fill the cache before traffic arrives |

---

## 7. Hruday's Real Experience Hook
> "At SAP, we had a product configuration cache that was manually invalidated during each deployment. Since all instances were restarted at the same time, all instances started with a cold cache simultaneously and all hit the DB in the first few seconds. It wasn't a 'stampede' in the textbook sense — more like a cold-start DB spike — but the root cause was identical. The fix we applied was staggered restart deployment plus a cache warming step in the application's @PostConstruct that pre-loaded the top 20 most-used configurations before the instance started accepting traffic. That reduced the cold-start DB load by 85%. I now treat cache warming as a mandatory step in any production caching design."

---

## 8. Scale Evolution

**1,000 users/day →** Stampede risk is low — at 1,000 users/day, simultaneous cache misses are rare. Basic Cache Aside without protection is fine. TTL jitter is a good habit to build even at this scale.

**100,000 users/day →** Stampede becomes a real risk during traffic spikes. Add TTL jitter for all large cache namespaces. Add background refresh (`refreshAfterWrite`) for your highest-traffic cache keys — homepage, product listings, deal feeds.

**10 million users/day →** Stampede prevention is a first-class architectural concern. Every cache key involving aggregated data (feeds, catalogs, recommendations) uses background refresh. Hot individual keys (specific product pages after viral events) use mutex locks. Cache warming is automated with a dedicated pre-warming service that pre-populates the cache during low-traffic windows. Rate-limit cache miss processing — only N DB queries per second allowed per key prefix.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Bill payment lookup and UPI handle resolution — high concurrency at peak payment hours; TTL expiry at peak = stampede; mutex protection for payment-critical lookups | Can you explain the double-check locking pattern after acquiring a distributed lock? |
| Swiggy / Meesho | Flash sales and deal feeds — the exact stampede scenario; clearing cache before high-traffic events is a known failure pattern | Can you prevent a planned stampede when cache is cleared before a flash sale? |
| Adobe / Microsoft | Creative asset template catalog — batch invalidation during deployment can cause cold-start stampede | Know about cache warming at startup as stampede prevention |
| SAP Labs | ERP pricing rule caches — rules change in batch at end-of-month; mass TTL expiry when rules are re-cached simultaneously | TTL jitter strategy for preventing synchronised mass expiry |

---

## 10. Related Topics — What to Study Next

- **Topic 162 — Cache Warming Strategies** — the proactive counterpart to stampede prevention; filling the cache before traffic arrives so there are no misses to stampede from
- **Topic 104 — Redis Distributed Lock (Redlock Algorithm)** — the distributed lock mechanism used in Option 1; how Redlock works across multiple Redis nodes
- **Topic 163 — Stale-While-Revalidate Pattern** — the conceptual foundation of background refresh; how this HTTP-originated pattern applies to server-side caching
- **Topic 149 — Auto-Scaling Strategies** — a complementary defence: auto-scale DB replicas before known traffic spikes so even if a stampede hits, the DB has more capacity
- **Topic 158 — Cache Aside vs Read-Through vs Write-Through** — understanding Cache Aside is the prerequisite; stampede is a Cache Aside failure mode that Read-Through caches can handle internally

---

*Part 9 · Cache Stampede — Prevention Strategies · Full Stack Interview Guide · Hruday D · 2026*
