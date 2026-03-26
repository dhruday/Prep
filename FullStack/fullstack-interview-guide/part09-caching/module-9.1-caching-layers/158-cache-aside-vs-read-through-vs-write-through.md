# Cache Aside vs Read-Through vs Write-Through vs Write-Behind
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Cache Aside** (lazy loading): application code checks cache, calls DB on miss, populates cache — you control everything; Spring `@Cacheable` uses this pattern
- **Read-Through**: cache sits in front of DB, cache fetches from DB on miss automatically — less code, less control
- **Write-Through**: every write goes to cache AND DB synchronously — cache always consistent but write latency doubles
- **Write-Behind** (write-back): write to cache first, DB updated asynchronously later — lowest write latency but risk of data loss if cache crashes
- 🔥 Interview shortcut: **Cache Aside + Write-Through** is the most common production combination — reads are lazy, writes keep cache consistent immediately

---

## 1. One-Line Definition
Cache access patterns define who is responsible for loading and updating the cache: Cache Aside puts the application code in charge, Read-Through puts the cache in charge, Write-Through writes to cache and DB together, and Write-Behind writes to cache first and DB later.

---

## 2. The Problem It Solves

Without a defined cache access pattern, engineers write ad-hoc caching logic everywhere: one service checks the cache before every DB call, another updates the cache after some writes but not others, a third ignores the cache and always hits the DB. The result is inconsistent caching behaviour across the codebase, hard-to-debug stale data, and cache logic mixed into business logic everywhere.

Formalising which pattern you use makes your caching strategy predictable and maintainable. It also forces you to think about the consistency trade-offs upfront rather than discovering them in production. When a junior engineer asks "should this endpoint read from cache?" the answer should come from your pattern choice, not from ad-hoc judgment call by call.

---

## 3. How It Works Internally

### The Mental Model
Imagine a library where the shelves are your cache and the warehouse in the back is your database.

**Cache Aside**: You (the application) check the shelf yourself. If the book is there, you take it. If not, you walk to the warehouse, get the book, put it on the shelf for future use, and then take it.

**Read-Through**: A librarian (the cache) stands between you and the warehouse. You ask the librarian for the book. If she has it, she gives it to you. If not, she goes to the warehouse herself, puts it on her shelf, and gives you a copy.

**Write-Through**: Whenever someone writes a new book, they give a copy to the librarian AND to the warehouse simultaneously before confirming the write is done.

**Write-Behind**: Whenever someone writes a new book, they give it to the librarian immediately (fast). The librarian then queues the warehouse update and does it later in the background.

### The Mechanism — Step by Step

**Cache Aside (Lazy Loading):**
1. Application checks cache for key
2. Cache HIT → return cached value
3. Cache MISS → application queries DB, stores result in cache with TTL, returns result
4. On write: application updates DB; optionally evicts cache key (or updates it)
5. Cache is only filled when data is actually requested — no upfront work
6. Problem: first request after cold start or eviction always hits DB; multiple concurrent misses can all hit DB simultaneously (cache stampede)

**Read-Through:**
1. Application requests data from cache (data layer abstraction)
2. Cache checks its store for the key
3. HIT → return; MISS → cache delegates to a `CacheLoader` that queries DB
4. Application code never directly queries DB — it always asks the cache
5. Used by: Google Guava's `LoadingCache`, Caffeine's `LoadingCache`, some ORM second-level caches

**Write-Through:**
1. Application writes to cache
2. Cache writes to DB synchronously **before returning success** to the application
3. Both cache and DB are updated in a single logical write
4. Application waits for both to confirm — write latency is the sum of cache write + DB write
5. Cache is always consistent with DB after any write — no stale data except for TTL expiry
6. Problem: slower writes, wasted cache space for data that is never read after being written

**Write-Behind (Write-Back):**
1. Application writes to cache — returns success immediately
2. Cache adds the write to a queue (asynchronous)
3. Cache periodically flushes the queue to DB (every 100ms or when queue reaches size N)
4. Fastest write path — DB write happens in the background
5. Problem: if cache crashes between the write confirmation and the DB flush, data is permanently lost
6. Use case: non-critical high-frequency writes like analytics counters, view counts

### ASCII Diagram

```
CACHE ASIDE                     READ-THROUGH
─────────────                   ────────────
App → Cache?                    App → Cache
         │                              │
    miss │                         miss │
         ↓                              ↓
       App → DB                   Cache → DB
         │     │                        │
         │ result                   result
         ↓                              ↓
       App → Cache (store)        Cache (store + return)
         ↓
       return result

WRITE-THROUGH                   WRITE-BEHIND
─────────────                   ────────────
App → Cache (write)             App → Cache (write)
         │                              │
         ↓                         ✓ return immediately
       Cache → DB (sync)               │
         │                         [async queue]
    both ✓                              │
         │                         Cache → DB (batch later)
       return success
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Mixed ad-hoc caching — no consistent pattern
@Service
public class ProductService {

    @Autowired private ProductRepository repo;
    @Autowired private RedisTemplate<String, Product> redis;

    public Product getProduct(Long id) {
        // Sometimes checks cache
        Product cached = (Product) redis.opsForValue().get("product:" + id);
        if (cached != null) return cached;
        Product p = repo.findById(id).orElseThrow();
        redis.opsForValue().set("product:" + id, p, 1, TimeUnit.HOURS);
        return p;
    }

    public void updateProduct(Product p) {
        repo.save(p);
        // Sometimes updates cache — but only if it was created by the developer who wrote THIS method
        // The developer who wrote getProduct had a different TTL in mind
        // This creates subtle inconsistency — who owns the cache lifecycle?
        redis.opsForValue().set("product:" + p.getId(), p, 30, TimeUnit.MINUTES);
        // 1 hour in read, 30 minutes in write — now the cache has two different TTL policies
    }
}
```
> **Why this fails in production:** Cache logic is scattered across multiple methods with inconsistent TTLs, no clear ownership, and no guarantee of consistency. Any developer touching this code must read all related methods to understand the full caching behaviour.

### Right Way — Production Quality

**Cache Aside — Spring `@Cacheable` annotation (the standard Java production choice):**
```java
@Service
public class ProductService {

    private final ProductRepository repo;
    private final KafkaTemplate<String, CacheInvalidationEvent> kafka;

    // Cache Aside, read side: check cache first; populate on miss
    // Spring manages the cache interaction — no manual Redis code needed
    // Cache key: "products::42" (cacheName + "::" + key)
    @Cacheable(value = "products", key = "#id", unless = "#result == null")
    public Product getProduct(Long id) {
        // This method body only executes on a cache MISS
        log.debug("Cache miss — querying DB for product {}", id);
        return repo.findById(id).orElseThrow(() -> new ProductNotFoundException(id));
    }

    // Write side: update DB, then update cache with new value
    // @CachePut always executes the method AND stores the result in cache
    // Difference from @CacheEvict: @CachePut updates in place; @CacheEvict removes (causes next read to miss)
    @CachePut(value = "products", key = "#product.id")
    @Transactional
    public Product updateProduct(Product product) {
        Product saved = repo.save(product);
        // Broadcast to other pods via Kafka (see Topic 157)
        kafka.send("cache-invalidation",
            new CacheInvalidationEvent("products", product.getId().toString()));
        return saved;  // Spring stores this return value in cache
    }

    // Delete: remove from DB AND remove from cache
    @CacheEvict(value = "products", key = "#id")
    @Transactional
    public void deleteProduct(Long id) {
        repo.deleteById(id);
    }
}
```

**Read-Through — Caffeine LoadingCache (synchronous auto-population on miss):**
```java
@Configuration
public class CacheConfig {

    @Bean
    public LoadingCache<Long, Product> productCache(ProductRepository repo) {
        return Caffeine.newBuilder()
            .maximumSize(10_000)
            .expireAfterWrite(30, TimeUnit.MINUTES)
            .recordStats()
            // CacheLoader defines what happens on cache miss
            // Called automatically by the cache — application code never queries DB directly
            .build(id -> repo.findById(id).orElse(null));
    }
}

@Service
public class ProductService {

    private final LoadingCache<Long, Product> productCache;

    public Product getProduct(Long id) {
        // Always call the cache — it handles miss + DB load automatically
        // No if/else, no manual cache interaction
        return productCache.get(id);
    }
}
```

**Write-Behind — Redis counter update (for non-critical high-frequency writes):**
```java
@Service
public class ProductViewCountService {

    private final RedisTemplate<String, Long> redis;
    // @Scheduled flush to DB every 30 seconds — batched write
    private final ProductRepository repo;

    // Fast write: increment counter in Redis immediately
    // Return to caller before any DB write happens
    public void recordView(Long productId) {
        String key = "views:product:" + productId;
        redis.opsForValue().increment(key);
        // Set expiry to prevent unbounded growth
        redis.expire(key, 1, TimeUnit.HOURS);
    }

    // Async flush: every 30 seconds, read all view counters and batch-write to DB
    // @Scheduled runs on a background thread — does not block any request
    @Scheduled(fixedDelay = 30_000)
    public void flushViewCounts() {
        Set<String> keys = redis.keys("views:product:*");
        if (keys == null || keys.isEmpty()) return;

        for (String key : keys) {
            Long count = redis.opsForValue().getAndDelete(key);  // atomic get + delete
            if (count != null && count > 0) {
                Long productId = Long.parseLong(key.replace("views:product:", ""));
                // Increment in DB — addViewCount increments existing count by N in one SQL UPDATE
                repo.addViewCount(productId, count);
            }
        }
    }
}
```

> **Key decisions here:**
> - `@CachePut` vs `@CacheEvict` on writes: `@CachePut` keeps cache warm (no miss on next read); `@CacheEvict` forces next reader to re-query DB — use `@CacheEvict` when the new value is expensive to serialize or when you aren't sure the write result will be immediately read again
> - Read-Through with Caffeine `LoadingCache` is cleanest when the cache is the only access path — works well for reference data (country codes, categories)
> - Write-Behind is **only** for non-critical data (view counts, click tracking) — never use it for financial data, inventory, or any data where loss would cause a correctness issue
> - `unless = "#result == null"` in `@Cacheable` prevents caching null returns — otherwise a `null` is cached and future requests get a cached `null` instead of checking the DB

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Cache Aside and how does Spring Boot's `@Cacheable` implement it?"

**Hruday's answer:**
> Cache Aside is a pattern where the application code is responsible for checking the cache, querying the DB on a miss, and storing the result. The cache is "to the side" of the DB — you explicitly go around it when there's a miss and explicitly populate it afterward. It's called lazy loading because the cache is only filled when data is actually requested.
>
> Spring's `@Cacheable` annotation implements Cache Aside for you. When you annotate a method with `@Cacheable(value = "products", key = "#id")`, Spring wraps the method with an interceptor. Before executing the method body, the interceptor checks the cache for the key. If found, it returns the cached value and skips the method body entirely. If not found, it executes the method, takes the return value, stores it in the cache under the key, and returns it to the caller. The method body itself — which typically contains a DB call — only executes on a cache miss. All of this works without any cache interaction code in the business method, which keeps the logic clean.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the difference between `@Cacheable`, `@CachePut`, and `@CacheEvict`? When do you use each?"

**Hruday's answer:**
> These three annotations handle different parts of the cache lifecycle. `@Cacheable` is for reads — it checks the cache first and only calls the method on a miss. `@CachePut` is for writes — it always calls the method but also stores the result in the cache afterward. `@CacheEvict` is for deletes or forced invalidation — it removes an entry from the cache after the method runs without replacing it.
>
> The practical rule: use `@Cacheable` on your read service methods like `getProduct(id)`. Use `@CachePut` on your update methods when you want to keep the cache warm — the updated object is returned by the method and Spring stores it directly, so the next read gets the fresh value from cache without hitting DB. Use `@CacheEvict` when you don't have the updated value to put back — for example, a partial update where you only modified the name and don't want to re-fetch the whole object.
>
> The subtle difference between `@CachePut` and `@CacheEvict` on writes matters at scale: `@CachePut` means zero cache misses after a write; `@CacheEvict` means one guaranteed DB hit per write operation — that's fine for low-traffic APIs but adds DB load under high write rates.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Why would you choose Cache Aside over Write-Through? What does Write-Through buy you and what does it cost?"

**Hruday's answer:**
> Write-Through gives you guaranteed cache consistency — after every write, both the cache and DB reflect the same value. Reads never see stale data, assuming you're using synchronous writes. The cost is write latency: every write now waits for both a cache write and a DB write to complete. For a DB write that takes 15ms and a Redis write that takes 1ms, you've added 1ms to every write — not terrible. But more importantly, you're caching data that may never be read. If you write a million product records and only 10,000 are ever read, you've wasted Redis memory on 990,000 entries that just expire by TTL.
>
> Cache Aside avoids this waste — the cache only contains data that has been requested at least once. It's also simpler because you're not coupling the write path to the cache layer, which reduces the blast radius of a cache failure affecting your writes.
>
> I generally prefer Cache Aside with explicit `@CacheEvict` or `@CachePut` on writes. Write-Through is better when the read/write ratio is balanced and you need the guarantee that reads never miss after writes — an order status page where writes and reads happen in quick succession is a good fit.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "For Swiggy's order tracking page where order status updates frequently, what caching pattern would you use?"

**Hruday's answer:**
> Order status is write-heavy and read-heavy simultaneously, and correctness matters — users reload the page to check "Is my order picked up yet?" I'd use Cache Aside with write-through updates (via `@CachePut`) and a short TTL.
>
> On every status update — restaurant_confirmed, order_picked_up, out_for_delivery, delivered — the order service updates the DB and uses `@CachePut` to immediately update the Redis cache entry for that order ID. The TTL I'd set is 30 minutes from last write — orders complete within 45 minutes, so entries naturally expire.
>
> For the read path, every GET to `/orders/{id}` uses `@Cacheable` — serves from Redis in under 2ms. Because `@CachePut` is called on every status update, the cache is always current with the DB. No staleness window.
>
> I would NOT use write-behind here — losing status updates in a crash would mean users see outdated order status, which causes customer support calls. The async nature of write-behind is wrong for this use case. Write-through via `@CachePut` is synchronous and safe.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| @Cacheable vs @CachePut | "Both cache the result" | `@Cacheable` skips the method on cache hit; `@CachePut` always runs the method AND updates the cache — use @CachePut for writes, @Cacheable for reads |
| Write-Behind safety | "Write-Behind is always most performant" | Write-Behind risks permanent data loss if cache fails before flush; never use for financial, inventory, or any user-critical data |
| Cache Aside cold start | "Cache Aside is always fine" | Cache Aside means ALL requests hit the DB on cold start or after eviction — plan for cache warming (Topic 162) at startup |
| `unless="#result == null"` | Skip this annotation attribute | Without it, null returns are cached — a future request gets a cached null and thinks the data doesn't exist even if it does |

---

## 7. Hruday's Real Experience Hook
> "At Oracle India, we had a custom caching layer that used an ad-hoc mix of patterns — some methods checked cache manually, others didn't, and there was no consistency in TTL values across the codebase. When I moved to SAP and worked with Spring's `@Cacheable` + `@CachePut` + `@CacheEvict` annotations, the difference was significant — the pattern forced consistency. Every developer on the team could look at a method and know exactly how it interacted with the cache from the annotations alone. I now treat the Cache Aside pattern via Spring annotations as a non-negotiable standard for any Java service that uses caching."

---

## 8. Scale Evolution

**1,000 users/day →** Cache Aside with Spring `@Cacheable` + a small Caffeine in-process cache. No Redis needed yet. Reads for the same resource within the same request batches return from memory. Write-through with `@CachePut` is zero overhead at this scale.

**100,000 users/day →** Move to Redis as the cache backend. Cache Aside still correct but now works across multiple pods (shared Redis vs local Caffeine). Consistent cache key naming becomes important — all pods must generate the same Redis key for the same resource.

**10 million users/day →** Cache Aside + Write-Through may not scale if write volume is very high (write amplification). Consider a two-layer architecture: local Caffeine L1 (Cache Aside, 30-second TTL, ultra-fast) + distributed Redis L2 (Read-Through for L1 misses, 30-minute TTL). Write-Behind for analytics/view counts at this scale — the 30-second DB flush window is acceptable for non-critical counters and massively reduces DB write IOPS.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment status, account balance — Cache Aside + Write-Through with no write-behind allowed for safety-critical data | Know the safety argument against Write-Behind for financial data |
| Swiggy / Meesho | Product catalog (Cache Aside, warm miss acceptable), order status (Write-Through for freshness), view counts (Write-Behind, acceptable loss) — all three patterns in one system | Can you choose the right pattern per data type within the same system? |
| Adobe / Microsoft | Creative asset metadata — Read-Through with Caffeine LoadingCache for clean abstraction; content editing uses Write-Through for collaborative consistency | Know when Read-Through simplifies code vs adding unnecessary abstraction |
| SAP Labs | Enterprise master data — Cache Aside with explicit eviction on write; the pattern needs to survive multi-pod deployment on kubernetes where cache is shared via Redis | Can you explain why `@CachePut` is the right choice over `@CacheEvict` for update operations? |

---

## 10. Related Topics — What to Study Next

- **Topic 157 — Cache Invalidation Strategies** — the invalidation half of Write-Through; how `@CacheEvict` works across distributed pods via Kafka broadcast
- **Topic 159 — Cache Stampede Prevention** — the main weakness of Cache Aside: what happens when a hot key expires and 1,000 concurrent requests all miss simultaneously
- **Topic 162 — Cache Warming Strategies** — filling the cache before the first user request so cold-start cache misses don't cascade to the DB
- **Topic 160 — Redis as Distributed Cache** — the backing store for all server-side caching patterns; data structures, TTL, and cluster behaviour
- **Topic 48 — HikariCP Connection Pooling** — understanding DB connection limits is important context for why cache miss storms (from Cache Aside cold starts) are dangerous

---

*Part 9 · Cache Aside vs Read-Through vs Write-Through vs Write-Behind · Full Stack Interview Guide · Hruday D · 2026*
