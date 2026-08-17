# Redis as Cache — TTL, Eviction Policies
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Redis as a cache works on one principle: store frequently-read data in memory so you don't hit the database on every request. The cache sits between your application and the database and absorbs most reads.
- TTL (Time To Live) is the most important cache correctness knob. Without TTL, stale data lives forever. Too short a TTL and you constantly miss; too long and users see outdated data. Every cached value needs a TTL chosen to match the acceptable staleness of that data type.
- Six eviction policies (what Redis deletes when memory is full): **noeviction** (error — never delete), **allkeys-lru** (delete least recently used from all keys), **volatile-lru** (LRU but only from keys with a TTL), **allkeys-lfu** (LFU — least frequently used), **volatile-lfu**, **volatile-ttl** (delete soonest-to-expire first). For a pure cache: **allkeys-lru** or **allkeys-lfu**. For mixed cache + durable data: **volatile-lru**.
- Cache stampede (also called thundering herd): a popular key expires and 1,000 concurrent requests all miss the cache simultaneously, all hammer the database at the same time. Prevention: probabilistic early expiration, mutex lock on rebuild, or background refresh before expiry.
- Cache-aside is the most common pattern: application checks cache → on miss, reads from DB → stores in cache → returns. Write-through (write to cache AND DB together) is safer for consistency but slower writes. Never use write-behind (write to cache, async flush to DB) for financial data.
- Gap to bridge: candidates say "set a TTL" but can't explain what TTL to set, when TTL should be 0, why eviction policy matters, or what happens during cache stampede.

---

## 1. One-Line Definition
Redis as a cache stores the result of expensive operations (database reads, API calls, computed aggregates) in fast in-memory storage with a time limit, so the same result can be served many times without repeating the expensive operation.

---

## 2. The Problem It Solves

An e-commerce platform has a product detail page. Every time a user opens a product page, the backend runs a query joining four tables: products, inventory, pricing, and reviews. This query takes 80ms on average. During a flash sale, 50,000 users open the same product page per minute. At 80ms per query, your database needs to handle 833 queries per second just for this one product's page load — and the result is the same for all 50,000 users.

Without a cache, the database is crushed. With a cache: the first request runs the query, stores the result in Redis with `SET product:1001:detail <json> EX 300` (5-minute TTL). The next 49,999 requests check Redis first, find the key, get the response in 0.3ms. Your database sees 1 query per 5 minutes for this product instead of 833 per second.

But the cache introduces a new problem: what if the product price changes? The cache still returns the old price for up to 5 minutes. This is the core tension of caching: **performance vs. consistency**. Your TTL is the dial that controls how long you're willing to show stale data.

The second problem a cache solves is service-level isolation. Under load, if every API call were hitting the database, a spike in reads would slow down writes. Redis handles reads; the database handles writes. They can be tuned and scaled independently.

---

## 3. How It Works Internally

### The Mental Model
Think of a cache as a coat check at a restaurant. The first guest (request) brings their coat (data) to the restaurant. The coat check attendant (your application) stores it on a tagged hook (Redis key) and gives the guest a ticket (the key name). For the next hour (TTL), anyone asking for that coat gets it immediately from the coat check — no trip to the car park (database). After an hour, the tag expires and the next person who asks has to go get it from the car park again.

"Eviction" is what happens when the coat check runs out of hooks: the attendant has to decide which coat to drop to make space. LRU = drop the coat that has been sitting uncollected the longest.

### Cache-Aside Pattern — Step by Step

```
REQUEST COMES IN
      │
      ▼
Check Redis: GET key
      │
  ┌───┴───┐
  │       │
HIT       MISS
  │         │
  │         ▼
  │   Fetch from database (80ms)
  │         │
  │         ▼
  │   SET key value EX {ttl}
  │         │
  └────┬────┘
       │
       ▼
Return result to caller (0.3ms on HIT, 80ms+ on MISS)
```

### TTL Decision Framework

```
DATA TYPE                     ACCEPTABLE STALENESS    RECOMMENDED TTL
──────────────────────────────────────────────────────────────────────
User account balance           0 seconds             DO NOT CACHE
Active order status            0 seconds             DO NOT CACHE
Inventory count (live checkout) < 5 seconds          5–10s or skip
Recently viewed items           minutes              5–15 minutes
Product details (price/stock)   1–5 minutes          60–300 seconds
Session / auth token            session lifetime     30 minutes (+ refresh)
Static reference data           hours–days           6–24 hours
Product images / CDN content    days–weeks           7 days (CDN TTL)
Analytics aggregates             hours               1 hour

RULE: TTL = how long you can afford to show data that's wrong.
If a wrong value causes money loss or bad UX → shorter TTL or skip cache.
If a wrong value causes mild inconvenience → longer TTL is acceptable.
```

### Eviction Policies — Internal Mechanism

```
MEMORY LIMIT HIT → Redis must evict (delete) one key to free space

Policy name         Pool of candidates        Algorithm
──────────────────────────────────────────────────────────────
noeviction          —                        Return OOM error. Never evict.
                                             Use when: you want errors,
                                             not silent data loss.

allkeys-lru         All keys                 Approximate LRU — evict the
                                             key that was least recently
                                             accessed. Good default for cache.

volatile-lru        Keys WITH a TTL only     LRU but only among keys that
                                             have an expiry set. Protects
                                             permanent data (no TTL) from eviction.

allkeys-lfu         All keys                 Approximate LFU — evict the
                                             key accessed least frequently.
                                             Better than LRU for skewed access
                                             patterns (some keys always hot).

volatile-lfu        Keys WITH a TTL only     LFU but only among TTL keys.

volatile-ttl        Keys WITH a TTL only     Evict the key closest to expiry.
                                             Reasoning: it's about to die anyway.

volatile-random     Keys WITH a TTL only     Random. Rarely correct choice.
allkeys-random      All keys                 Random. Rarely correct choice.

──────────────────────────────────────────────
RECOMMENDATION:
  Pure cache (all keys are cached data)    → allkeys-lru or allkeys-lfu
  Mixed (cache + session + permanent)      → volatile-lru
  Session store only                       → volatile-ttl
  Primary data store (never evict)        → noeviction (+ monitor memory closely)
```

### Cache Stampede — The Hidden Problem

```
T=0:        Key "product:1001" expires (TTL ran out)
T=0.001:    Request 1 → cache MISS → starts DB query
T=0.001:    Request 2 → cache MISS → starts DB query
T=0.001:    Request 3 → cache MISS → starts DB query
...
T=0.001:    1000 concurrent requests, all cache MISS, all start DB query

→ 1000 simultaneous DB queries for the same piece of data
→ Database CPU spikes to 100%
→ Other queries slow down across the whole system
→ Possibly a complete outage

PREVENTION STRATEGIES:
1. Mutex lock: first miss acquires a Redis lock (SETNX),
   does the DB query, sets the cache, releases lock.
   Other misses wait on the lock → only 1 DB query.

2. Probabilistic early expiry: when a key has < 10% of its
   TTL remaining, a random fraction of requests recompute it
   proactively. Key stays warm; no thundering herd.

3. Background refresh: a scheduled job refreshes the cache
   before TTL expires. Key is always hot; misses never happen.
   Works for predictable, high-value keys like product details.
```

---

## 4. The Code

### Wrong Way — No TTL, No Eviction Strategy

```java
// Wrong: caching without TTL — data lives forever
redisTemplate.opsForValue().set("product:" + productId, productJson);
// productJson will be stale forever if the product changes.
// Redis memory grows without bound until the server runs out of RAM.
// noeviction policy (default in some configs) → OOM error in production.
```
> **Why this fails in production:** Without TTL you accumulate stale data indefinitely. A product that was deleted six months ago is still in Redis. MongoDB changed the price but Redis says the old price. And when Redis runs out of memory, it either crashes or errors every SET/GET.

### Right Way — Cache-Aside with TTL

```java
@Service
public class ProductCacheService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;

    // Cache TTL: 5 minutes — product details can be up to 5 mins stale.
    // Price-sensitive data would warrant a shorter TTL.
    private static final Duration PRODUCT_CACHE_TTL = Duration.ofMinutes(5);

    public ProductCacheService(
        RedisTemplate<String, String> redisTemplate,
        ProductRepository productRepository,
        ObjectMapper objectMapper
    ) {
        this.redisTemplate = redisTemplate;
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
    }

    public ProductDto getProduct(Long productId) {
        String cacheKey = "product:" + productId;

        // 1. Try cache first
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, ProductDto.class);
            } catch (JsonProcessingException e) {
                // Corrupt cache entry — delete it and fall through to DB
                redisTemplate.delete(cacheKey);
            }
        }

        // 2. Cache miss — load from database
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));

        ProductDto dto = ProductDto.from(product);

        // 3. Store in cache with TTL
        try {
            redisTemplate.opsForValue().set(
                cacheKey,
                objectMapper.writeValueAsString(dto),
                PRODUCT_CACHE_TTL
            );
        } catch (JsonProcessingException e) {
            // Serialization failure — continue without caching.
            // Log the error but don't fail the user request.
            // Better to be slow than to crash.
        }

        return dto;
    }

    // When a product is updated: delete the cache key immediately.
    // Next request will fetch fresh data from DB and re-populate cache.
    // This is "cache invalidation on write" — the correct pattern.
    public void evictProductCache(Long productId) {
        redisTemplate.delete("product:" + productId);
    }
}
```

### Right Way — Spring Cache Abstraction (Cleaner for Simple Cases)

```java
// application.yml — tell Spring to use Redis for @Cacheable
spring:
  cache:
    type: redis
  data:
    redis:
      host: localhost
      port: 6379

  # TTL per cache name — 5 minutes for products, 30 min for users
  cache:
    redis:
      time-to-live: 300s   # default TTL
    cache-names:
      - products
      - userProfiles
```

```java
@Service
public class ProductService {

    private final ProductRepository productRepository;

    // @Cacheable: on first call, stores result in "products" cache
    // key = "product::{productId}" in Redis
    // Second call with same ID returns from Redis, method body skips entirely
    @Cacheable(value = "products", key = "#productId")
    public ProductDto getProduct(Long productId) {
        return ProductDto.from(
            productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId))
        );
    }

    // @CacheEvict: when product updates, removes the key from cache
    // The next call to getProduct() will reload from DB
    @CacheEvict(value = "products", key = "#product.id")
    public void updateProduct(Product product) {
        productRepository.save(product);
    }

    // @CachePut: updates the cache after saving, without evicting
    // Useful when you want to keep the cache warm after a write
    @CachePut(value = "products", key = "#result.id")
    public ProductDto createProduct(CreateProductRequest request) {
        Product product = productRepository.save(Product.from(request));
        return ProductDto.from(product);
    }
}
```

### Configuration — Eviction Policy and Memory Limit

```yaml
# redis.conf or Redis cluster config
# Set maxmemory to protect the host machine from Redis consuming all RAM
maxmemory 2gb

# allkeys-lru: best policy for a pure cache use case
# All keys are eligible for eviction, LRU approximation used
maxmemory-policy allkeys-lru

# lfu-log-factor: controls how quickly LFU frequency decays
# Lower value = smaller difference between frequent and rare access
# Default 10 is usually fine
lfu-log-factor 10

# This tells Redis how many samples to use when approximating LRU
# More samples = closer to true LRU but more CPU
# Default 5 is the practical sweet spot
maxmemory-samples 5
```

> **Key decisions here:**
> - Handle corrupted cache entries with try/catch and delete — never propagate parse errors to callers
> - Always set maxmemory in production — an unbounded Redis eats all server RAM and kills other processes
> - Use `allkeys-lru` for pure cache; `volatile-lru` when some Redis keys should never be evicted (session tokens stored permanently)
> - Spring `@Cacheable` is fine for simple cases but manual RedisTemplate gives you more control (different TTLs per value, custom serialization, stampede protection)

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How do you invalidate a cache entry when the underlying data changes?"

**Hruday's answer:**
> The most reliable approach is immediate eviction on write. When the product is updated in the database, the service immediately calls Redis DELETE on that product's cache key. The next request for that product will be a cache miss and will fetch the fresh data from the database, then re-cache it. This is the cache-aside pattern with write-time invalidation.
>
> A simpler approach for lower-consistency requirements is to rely on TTL alone — don't explicitly invalidate, just let the cache expire. If a product's price is cached for 5 minutes and it changes, at most 5 minutes of users see the old price. Whether this is acceptable depends on business requirements. For product descriptions, sure. For pricing during active purchases, probably not.
>
> A third pattern is event-driven invalidation: when the database is updated, publish an event to a Kafka topic or Redis pub/sub channel. A cache subscriber consumes the event and deletes the key from Redis. This decouples the write path from cache management but adds complexity and latency in the invalidation propagation.
>
> In practice I prefer explicit delete on write. It's simple, synchronous, and easy to reason about. TTL as a backstop handles cases where the delete failed.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is cache stampede and how do you prevent it in production?"

**Hruday's answer:**
> Cache stampede happens when a heavily cached key expires and many concurrent requests simultaneously find a cache miss. They all go to the database at the same time, overwhelming it with redundant queries for the same piece of data.
>
> Say a product key is cached for 5 minutes and 5,000 requests per second hit it at peak. When the key expires, all 5,000 concurrent in-flight requests find a miss simultaneously and each fires a database query. The database CPU jumps immediately. If the query takes 100ms, you have 500 simultaneous queries in-flight. For many databases, this is enough to cause cascading slow-down or complete outage.
>
> My preferred prevention for high-traffic keys is a distributed mutex. When a request finds a cache miss, before querying the database it tries to acquire a Redis lock: `SET lock:product:1001 1 NX EX 5`. Only one request gets the lock. That request does the DB query and sets the cache. Requests that fail to get the lock wait briefly and retry the cache read — they now hit the key that the lock-holder just populated.
>
> For predictable high-value keys, background refresh is even better: a scheduler checks each key's TTL and, when it drops below 10% of the original TTL, proactively refreshes the value before it expires. The key is always warm. No stampede is possible because the key never actually expires.
>
> At SAP Labs we used Spring Cache with scheduled background refresh for the most important reference data caches. For dynamic product data I'd use the lock-based approach.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When should you NOT use Redis as a cache?"

**Hruday's answer:**
> Don't cache data where correctness is mandatory at the time of decisions. Account balance before a debit, stock count before a reservation, seat availability before a booking — these must be read from the database because the cache could be stale by any amount. Using a stale balance cache to check if a user can buy creates a window for double-spending.
>
> Don't cache data with very high write rates. If a counter updates 10,000 times per second, caching it adds complexity without benefit — the TTL expires almost immediately, cache hit rate is near zero, and you're still going to the database on almost every request.
>
> Don't use Redis as a cache if the primary bottleneck is not read latency from the database. If your application is slow because of heavy computation, network calls to external APIs, or inefficient code — caching won't fix it. Profile first.
>
> Also reconsider read-through caches for very personalised data. If every user has a unique response (a personalised feed, dynamic pricing), you can't share a cached response between users. The hit rate of such a cache is near zero, and you've added Redis infrastructure for no benefit.

---

### Q4 — Scenario
**Interviewer asks:** "Design the caching strategy for a product catalogue in an e-commerce platform expecting 100K requests per second during a flash sale."

**Hruday's answer:**
> At 100K requests per second, the database simply cannot handle every read. Caching is the core solution here, not database scaling.
>
> Tier 1: HTTP response cache at the CDN level. Product detail pages that are identical for all users — CDN caches the full HTTP response. A flash sale might have 95% of traffic to just 100 products. CDN handles most of this before it even reaches the origin servers.
>
> Tier 2: Application-level Redis cache. For requests that miss CDN (authenticated users, personalised pricing, cart interactions), each app server checks Redis before the database. Key pattern: `product:{productId}:detail`. TTL: 60 seconds during flash sale (shorter than normal to reduce staleness on high-volatility inventory data). Use `allkeys-lru` eviction policy.
>
> Tier 3: Database read replicas. Cache misses during the first minute of a sale will hit the database. Multiple PostgreSQL read replicas handle this burst. After the first few minutes, the cache is warm and read replica load drops dramatically.
>
> Stampede protection: 100 products × 100K req/sec = up to 10K concurrent cache misses per second at sale start. Use a distributed mutex on each product ID to ensure only one cache rebuild per product. Value stored should be the full serialized DTO — no joins on the hot read path.
>
> Cache invalidation: stock count is excluded from the 60-second cache — it updates too fast. Stock is read from the database with a short connection timeout. Only product description, images, and non-inventory details are cached for 60 seconds.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Set TTL to a long value for performance" | "I'll cache for one hour to maximise hit rate" | "TTL must match the staleness tolerance of the specific data. Product descriptions can be cached an hour. But if you cache inventory counts for an hour during a flash sale, customers buy products that went out of stock 59 minutes ago. The hit rate vs. staleness trade-off is data-dependent. There is no universal 'best TTL.'" |
| "Redis handles cache eviction automatically" | "I don't need to configure eviction — Redis will figure it out" | "Default Redis maxmemory-policy is 'noeviction' — when memory fills, Redis returns OOM errors for every new SET command. Your application starts failing. You MUST configure maxmemory and set an eviction policy before going to production. For a pure cache: allkeys-lru. For mixed usage: volatile-lru." |
| "Cache everything" | "I'll cache all database reads to speed up the app" | "Caching highly personalised or rapidly changing data gives near-zero hit rate. If user 1002's response differs from user 1001's, you can't share a cached value between them. Caching where hit rate is < 10% adds Redis latency (0.3ms per miss) to every call without benefit. Profile your hit rate in staging. If it's low, the data shouldn't be cached." |
| "Cache and database are always in sync" | "The cache is always consistent with the database" | "They are NOT in sync — that is the definition of a cache. The cache is always a snapshot of some previous state. If you need real-time consistency, you don't need a cache; you need to query the database directly. Design your system to tolerate the staleness window defined by your TTL, and identify the specific cases where you MUST skip the cache and go to the database directly." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs we had a reference data API — cost centres, company codes, GL accounts — that was queried on every financial document save, thousands of times per minute. This data changed maybe once a week. Without caching, this API was the most-hit endpoint on the database. I replaced it with a Spring `@Cacheable` that stored the reference data in Redis with a 30-minute TTL and used `@CacheEvict` triggered from the admin update API. The database queries for this endpoint dropped from thousands per minute to zero to near-zero. The Spring Cache abstraction made the change a one-line annotation on the service method — the architectural insight was recognising something that looks frequently read but rarely changes is exactly what a cache is designed for."

---

## 8. Scale Evolution

**1,000 users →** A single Redis instance with a few `@Cacheable` annotations on key service methods. Default settings are fine. Hit rate monitoring with Spring Boot Actuator metrics. TTLs set conservatively.

**100,000 users →** Monitor Redis memory usage and hit/miss rates actively. Tune TTLs based on real hit rates. Add stamped protection for top-traffic keys (flash sale items, homepage products). Separate Redis eviction policy per namespace if using mixed cache + session storage.

**10 million users →** Redis Cluster for horizontal memory scaling. Cache warming strategy on deploy (pre-populate most-accessed keys before traffic hits). Tiered caching: CDN → Redis → database. Shard popular product caches to avoid a single hot Redis slot. Consider separate Redis clusters per service (product cache, session, rate limiting) to prevent one service's evictions from hurting another's hit rate.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Rate limiting, OTP caching, merchant config — TTL choices are critical for correctness. OTP with 10-minute TTL is standard. Stale payment config would cause transaction failures. | "How do you ensure your OTP cache doesn't serve expired OTPs, even after multiple Redis restarts?" |
| Swiggy / Meesho | Flash sales and restaurant menu caching. What TTL for menu prices? What happens at 9pm peak load when the restaurant menu cache expires for 50K users simultaneously? | "How do you prevent cache stampede on your most popular restaurant menu during peak dinner hour?" |
| Adobe / Microsoft | Document metadata caching, user preference caching, enterprise feature flags. Long TTL + explicit eviction on config changes. | "Design the caching strategy for user role and permissions in a SaaS product with thousands of enterprise customers." |
| SAP Labs (current) | Reference data caches — GL accounts, cost centres, company codes. These change rarely but are read on every financial transaction. Long TTL + admin-triggered eviction pattern. | "How would you cache master data that changes on a schedule but must be immediately fresh after an admin update?" |

---

## 10. Related Topics — What to Study Next

- **Topic 101 — Redis Data Structures** — the String structure is what stores cached values; Hash is the right choice for partial object caching. Both are prerequisites for this topic.
- **Topic 157 — Cache Invalidation Strategies** — Part 9 covers the broader strategies: cache-aside, write-through, write-behind, and why invalidation is "one of the two hard problems in computer science"
- **Topic 159 — Cache Stampede Prevention** — dedicated topic in Part 9 with additional prevention strategies including probabilistic early expiry with formal proof
- **Topic 161 — Cache Consistency in Microservices** — how cache invalidation works across multiple services each with their own Redis instances; includes CDC-based invalidation patterns

---

*Part 5 · Redis as Cache — TTL, Eviction Policies · Full Stack Interview Guide · Hruday D · 2026*
