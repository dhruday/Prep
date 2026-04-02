# Redis as Distributed Cache
> Part 9 — Caching Strategy
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Redis is an **in-memory** data store — reads in under 1ms vs 20–200ms for a DB query
- Five key data structures: **String** (simple values), **Hash** (objects), **List** (ordered), **Set** (unique), **ZSet** (sorted set with score)
- **TTL** controls expiry: `EXPIRE key seconds` or `SET key value EX seconds` — essential to prevent unbounded memory growth
- **Eviction policies**: `allkeys-lru` (safest general default) — Redis removes least-recently-used keys when memory runs out
- 🔥 As a distributed cache, Redis solves the multi-pod consistency problem: all 20 pods read from the same Redis instance instead of having 20 independent in-memory caches

---

## 1. One-Line Definition
Redis is an in-memory key-value data store that acts as a distributed cache — all service instances share one Redis cluster, so cached data is consistent across all pods and responses return in under 1ms without touching the database.

---

## 2. The Problem It Solves

Your Spring Boot service now runs as 10 pods in Kubernetes for scale. Each pod has a local in-memory Caffeine cache of product data. Pod A handles a request and caches product 42's details. Pod B handles the next request — cache miss, queries DB again, caches its own copy. Pod C, same thing.

You've spent 10x more DB queries than a single-pod system would. Worse, when someone updates product 42's price, you need to invalidate all 10 pods' local caches. You can evict from the local pod's cache, but the other 9 pods still serve the stale price.

Redis as a distributed cache solves both problems. All 10 pods read from and write to the same Redis instance. When pod A caches product 42, all other pods benefit immediately — the next request on any pod hits Redis instead of the DB. When product 42 is updated, one `DEL product::42` in Redis clears the cache for all pods simultaneously.

---

## 3. How It Works Internally

### The Mental Model
Think of Redis as a shared whiteboard in an open office. Each desk (pod) has their own notepad (local Caffeine cache) — ultra-fast to read, but nobody else can see it. The whiteboard (Redis) is visible to everyone — slightly slower to walk to (1ms network call) but everyone reads the same information. You use both: scribble on your notepad for the most recently used items (L1 Caffeine), and write important shared data on the whiteboard (L2 Redis).

### The Mechanism — Step by Step

**Redis as a cache vs as a DB:**
- As a DB: data is primary source of truth; you need durability (AOF/RDB persistence); data loss is unacceptable
- As a cache: data is a copy of your real DB; data loss means a cache miss, not data loss; persistence optional
- For caching: disable persistence (saves CPU, reduces latency) or enable RDB snapshots only for cache warmup after restart

**Key operations for caching:**
1. `SET key value EX seconds` — store with TTL in one atomic operation
2. `GET key` — retrieve; returns `nil` if key doesn't exist or TTL expired
3. `DEL key` — explicit eviction; Redis removes key immediately
4. `EXPIRE key seconds` — add or update TTL on existing key
5. `TTL key` — check remaining TTL (returns -1 if no TTL, -2 if key doesn't exist)
6. `MGET key1 key2 key3` — fetch multiple keys in one round-trip (essential for batch reads)
7. `GETSET key value` — atomic get old value + set new value (useful for cache population with race safety)

**Data structures for caching:**
- **String**: cache serialised JSON of a single object — `product:42 → "{id:42, name:...}"`
- **Hash**: cache object fields individually — `product:42 → {name: "...", price: "99", stock: "10"}` — allows partial updates (`HSET product:42 price 89`) without deserialising/re-serialising the full object
- **ZSet** (sorted set): cache a ranked list — `recommendations:user:1 → {productA: score 0.9, productB: score 0.7}` — great for leaderboards, feed ranking
- **Set**: cache a collection of unique IDs — `tags:product:42 → {electronics, laptop, sale}` — supports set operations (intersection, union)
- **List**: cache recent activity (push to head, trim old entries) — `recent:user:1 → [orderId3, orderId2, orderId1]`

**Data flow through cache layers:**

```
Request
   │
   ▼
L1: Caffeine (in-process, < 1μs)
   │ miss
   ▼
L2: Redis (distributed, ~1ms)
   │ miss
   ▼
L3: PostgreSQL (source of truth, 20–200ms)
   │
result flows back up, populating each layer
```

**Redis Cluster vs Sentinel vs Standalone:**
- Standalone: single node — fine for development; SPOF in production
- Sentinel: 1 master + N replicas + 3 sentinel monitors; auto-failover in 30–60 seconds; good for high availability
- Cluster: data is sharded across multiple master nodes (16,384 hash slots); scales write capacity; `MGET` on keys in different slots requires client-side batching
- For caching: Redis Sentinel is usually enough; Redis Cluster is needed only at very high data volume or write throughput

### ASCII Diagram

```
Spring Boot Pod A          Spring Boot Pod B
─────────────────          ─────────────────
[Caffeine L1 cache]        [Caffeine L1 cache]
      │  miss                     │  miss
      └──────────┐   ┌────────────┘
                 ▼   ▼
         ┌─────────────────┐
         │   Redis          │  ← Shared L2 cache
         │   (6379)         │
         │                  │
         │  product:42  ─►  │  {"id":42,"price":99}  TTL: 3587s
         │  product:99  ─►  │  {"id":99,"price":150} TTL: 1822s
         │  user:1:cart ─►  │  ["item1","item2"]      TTL: 600s
         └─────────────────┘
                 │  miss
                 ▼
         ┌─────────────────┐
         │   PostgreSQL     │  ← Source of truth
         └─────────────────┘
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Direct RedisTemplate usage scattered through service code
@Service
public class ProductService {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;
    @Autowired
    private ProductRepository repo;

    public Product getProduct(Long id) {
        String key = "product:" + id;
        // Problem 1: manual cast — ClassCastException if serialisation changes
        Product cached = (Product) redisTemplate.opsForValue().get(key);
        if (cached != null) return cached;

        Product p = repo.findById(id).orElseThrow();
        // Problem 2: no TTL — this key lives in Redis forever, consuming memory
        redisTemplate.opsForValue().set(key, p);
        return p;
    }
}
```
> **Why this fails in production:** No TTL means Redis fills up permanently with stale product data. When `maxmemory` is hit, Redis starts evicting keys randomly (if `allkeys-random` policy) or rejects writes (if `noeviction`). Also, direct `RedisTemplate` calls scatter cache logic through business code — harder to test and reason about.

### Right Way — Production Quality

**Spring Boot + Redis cache via annotations (preferred for service-layer caching):**
```java
// application.yml
spring:
  cache:
    type: redis
  data:
    redis:
      host: ${REDIS_HOST:localhost}  # injected from Kubernetes Secret
      port: 6379
      password: ${REDIS_PASSWORD:}  # never hardcode passwords
      timeout: 2000ms               # 2-second connection timeout — fail fast, don't block requests
      lettuce:
        pool:
          max-active: 20   # max connections in pool
          max-idle: 10
          min-idle: 5
  cache:
    redis:
      time-to-live: 3600000   # default TTL: 1 hour for all caches
      cache-null-values: false  # never cache null — prevents "not found" being served as cached null

---

// CacheConfig.java — per-cache TTL overrides
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public RedisCacheManagerBuilderCustomizer redisCacheManagerCustomizer() {
        return builder -> builder
            // Products: cache for 1 hour — product data changes infrequently
            .withCacheConfiguration("products",
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofHours(1))
                    .disableCachingNullValues()
                    .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer())))
            // Cart: cache for 30 minutes — user-specific, shorter TTL
            .withCacheConfiguration("carts",
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofMinutes(30))
                    .disableCachingNullValues())
            // Categories: cache for 24 hours — very rarely changes
            .withCacheConfiguration("categories",
                RedisCacheConfiguration.defaultCacheConfig()
                    .entryTtl(Duration.ofHours(24)));
    }
}
```

**Service layer — clean cache-annotated methods:**
```java
@Service
@Slf4j
public class ProductService {

    private final ProductRepository repo;

    // @Cacheable: cache hit = skip method; cache miss = call method, store result
    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        log.debug("Cache miss — DB query for product {}", id);
        return repo.findById(id)
            .orElseThrow(() -> new ProductNotFoundException(id));
    }

    // @CachePut: always call method AND update cache — keeps cache fresh after writes
    @CachePut(value = "products", key = "#product.id")
    @Transactional
    public Product updateProduct(Product product) {
        return repo.save(product);
    }

    // @CacheEvict: remove key from cache after method runs
    @CacheEvict(value = "products", key = "#id")
    @Transactional
    public void deleteProduct(Long id) {
        repo.deleteById(id);
    }

    // Batch read: use MGET to fetch multiple keys in one Redis round-trip
    public Map<Long, Product> getProducts(List<Long> ids) {
        // Each call to @Cacheable is one Redis GET — for 100 ids that's 100 round-trips
        // For batch reads, use RedisTemplate directly with MGET
        List<String> keys = ids.stream()
            .map(id -> "products::" + id)
            .collect(Collectors.toList());

        List<Object> results = redisTemplate.opsForValue().multiGet(keys);
        Map<Long, Product> found = new HashMap<>();
        List<Long> missing = new ArrayList<>();

        for (int i = 0; i < ids.size(); i++) {
            if (results.get(i) != null) {
                found.put(ids.get(i), (Product) results.get(i));
            } else {
                missing.add(ids.get(i));
            }
        }

        // Only query DB for the IDs that were not in Redis
        if (!missing.isEmpty()) {
            List<Product> fromDb = repo.findAllById(missing);
            for (Product p : fromDb) {
                found.put(p.getId(), p);
                // Manually populate Redis for the missed keys with TTL
                redisTemplate.opsForValue().set(
                    "products::" + p.getId(), p, 1, TimeUnit.HOURS);
            }
        }
        return found;
    }
}
```

**Redis as a Hash-based cache (partial field updates without full re-serialisation):**
```java
@Service
public class InventoryService {

    private final StringRedisTemplate redis;

    // Store inventory as a Redis Hash — each field is a separate set/get
    public void updateStock(Long productId, int newStock) {
        String key = "inventory:" + productId;
        // HSET: update just the 'stock' field — no need to fetch/deserialise/re-serialise the full object
        redis.opsForHash().put(key, "stock", String.valueOf(newStock));
        redis.expire(key, 1, TimeUnit.HOURS);  // refresh TTL on update
    }

    public Integer getStock(Long productId) {
        String key = "inventory:" + productId;
        // HGET: fetch only the 'stock' field — minimal data transfer
        Object value = redis.opsForHash().get(key, "stock");
        return value != null ? Integer.parseInt(value.toString()) : null;
    }
}
```

> **Key decisions here:**
> - `GenericJackson2JsonRedisSerializer` stores JSON — human-readable in Redis, survives class refactors better than Java serialisation
> - Per-cache TTL overrides are important — a cart (30 min) and a product (1 hour) and a category (24 hours) all need different TTLs
> - `disableCachingNullValues()` prevents `null` returns from being stored as cached nulls — a `null` means "not found in DB right now" which may change later
> - Redis Hash for inventory allows `HSET` partial updates without deserialising the full object — critical when stock changes 1,000 times/second during a flash sale but name/description change once a month

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Why do you use Redis as a cache instead of a regular in-process cache like a HashMap?"

**Hruday's answer:**
> In a single-process application, an in-process cache like a HashMap or Caffeine is faster — no network call, just memory access. But in a production microservices deployment, your service runs as multiple pods — maybe 20 pods for scale. Each pod has its own in-process cache. If pod A caches product 42 in its local HashMap and pod B gets the next request for product 42, pod B has a cache miss and queries the DB. You get 20 independent caches for the same data, which multiplies your DB load instead of reducing it. And when product 42 changes, you need to invalidate all 20 pods' local caches — there's no shared signal.
>
> Redis solves this by being a shared external cache. All 20 pods connect to the same Redis instance. When pod A fetches product 42 from DB and stores it in Redis, all other pods benefit immediately on their next request. One Redis TTL expiry or `DEL` evicts the key for all pods simultaneously. The cost is one network round-trip per Redis call — about 1ms — which is still 20–200x faster than a DB query.
>
> In practice, the best architecture combines both: a short-TTL Caffeine L1 cache (in-process, sub-millisecond) and a longer-TTL Redis L2 cache (shared, ~1ms). The Caffeine cache absorbs the highest-frequency reads within a pod, Redis absorbs the rest.

---

### Q2 — Deep Dive
**Interviewer asks:** "When would you use a Redis Hash instead of a Redis String to store an object? What is the practical difference?"

**Hruday's answer:**
> A Redis String typically holds the entire object serialised as JSON. To update any single field, you have to: GET the JSON, deserialise it in application code, modify the field, re-serialise it, SET the new JSON. That's a read-modify-write cycle — three operations, one of which includes deserialisation overhead.
>
> A Redis Hash stores each field of the object as a separate key-value pair within the hash. To update one field, you call `HSET key field value` — one atomic write of just the changed field. No read, no deserialise, no re-serialise. This is significantly better for objects where individual fields change at different rates.
>
> The practical example I use is inventory. A product object has name, description, images, price, and stock. Name and description change monthly. Stock changes potentially hundreds of times per second during a flash sale. With a String, every stock update deserialises and re-serialises the entire product object. With a Hash, `HSET inventory:42 stock 99` updates just the stock integer atomically. Under high-frequency stock updates, the Hash approach reduces Redis CPU and serialisation overhead by an order of magnitude.
>
> Use String when you always read and write the full object. Use Hash when different parts of an object update at different rates — particularly inventory, counters, user session data.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What is the difference between Redis Sentinel and Redis Cluster, and when would you choose each for a caching layer?"

**Hruday's answer:**
> Redis Sentinel provides high availability for a single master. You have one master handling all writes and reads, plus replicas for read scaling, plus three sentinel processes that monitor the master. If the master fails, sentinels vote and promote a replica to master within 30–60 seconds. The application reconnects and continues. The total addressable data is limited to what one master can hold in memory.
>
> Redis Cluster provides horizontal sharding. Data is spread across multiple masters — 16,384 hash slots divided among N masters. Adding a new master redistributes slots, so total storage scales linearly. Each master also has replicas for HA. Client libraries (Lettuce in Spring) are cluster-aware and route keys to the correct master automatically.
>
> For a caching layer, I'd choose Sentinel when my entire cached dataset fits comfortably on one Redis instance — say, under 64GB. Most applications are in this category. Sentinel gives HA with simpler operations and no cross-slot limitations. Spring Data Redis integrates with Sentinel via `spring.data.redis.sentinel.master` and `sentinel.nodes` config.
>
> I'd choose Cluster when the cache size exceeds a single machine or write throughput exceeds a single master's capacity — typically beyond 100,000 writes/second or 100GB+ dataset. The caveat is that `MGET` across multiple keys stored on different nodes requires the client to batch multiple requests. For most cache workloads, Sentinel is the right choice.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "At Swiggy, a user's active order appears in multiple services — order service, delivery service, and notification service. How would you design the Redis caching for order data?"

**Hruday's answer:**
> I'd use a shared Redis cluster with a canonical cache key per order: `order:{orderId}`. The order service owns writing to this key — it's the source of truth and the only service that modifies order state.
>
> Each service that reads order data uses `@Cacheable("orders")` with the order ID as key. TTL would be 30 minutes — orders complete within 45 minutes, so this naturally expires old orders without cleanup code.
>
> When the order service updates order status (confirmed, picked_up, delivered), it uses `@CachePut("orders")` which updates the Redis key in place. The delivery service and notification service will get the fresh value on their next read without any extra coordination.
>
> For the notification service specifically, it may need to read order data immediately after a status change — within 100ms. Because `@CachePut` updates Redis synchronously before returning, the notification service reading 50ms later will get the correct new status from Redis.
>
> One important detail: I'd structure the cache key to include version or use `@CachePut` carefully to avoid the window between a write starting and completing. With Spring's `@Transactional` and `@CachePut`, the cache update happens after the transaction commits — so reads always see a committed state, never a partial in-progress update.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| No TTL | "Set the value and it's cached" | Without TTL, Redis fills up permanently — always set TTL via `EX` parameter or `EXPIRE`; configure `maxmemory-policy` as a safety net |
| Java serialisation | "Use ObjectOutputStream to store objects" | Java serialisation is brittle — class renames break deserialisation; use Jackson JSON serialisation (`GenericJackson2JsonRedisSerializer`) |
| Redis as primary DB | "Store everything important in Redis" | Redis may lose data on restart if persistence is off; for cache, this is fine — for primary data, use PostgreSQL/MongoDB |
| Clustered `MGET` | "MGET works the same in cluster and standalone" | In Redis Cluster, keys on different slots require separate round-trips; ensure cache key design keeps related keys on the same node using hash tags `{prefix}:key` |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our React microfrontend fetched user preference data on every render — colour theme, language, display density. This was hitting our Spring Boot backend on every page load. I added a Redis cache with a 15-minute TTL via Spring's `@Cacheable`. The result was immediate: 94% of preference reads were served from cache, and the Spring Boot service's DB query rate for preferences dropped to near zero. The thing I learned that session was to always set `disableCachingNullValues()` — the first version without that setting started caching `null` for users whose preferences weren't set yet, and everyone saw the default theme regardless of their saved settings until the TTL expired."

---

## 8. Scale Evolution

**1,000 users/day →** A single Redis standalone instance is more than enough. Set `maxmemory 256mb` and `maxmemory-policy allkeys-lru`. Spring Boot `@Cacheable` with Redis as backend. No clustering needed.

**100,000 users/day →** Redis Sentinel (1 master + 2 replicas + 3 sentinels) for HA. Configure read-from-replica for `@Cacheable` reads to distribute load — `ReadFrom.REPLICA_PREFERRED` in Lettuce. Monitor cache hit rate via Redis `INFO stats`. Add a local Caffeine L1 cache in front of Redis for the hottest 1,000 keys.

**10 million users/day →** Redis Cluster with 6 nodes (3 masters + 3 replicas). Cache warming becomes a dedicated concern — a background job pre-populates the cache on startup and after cluster additions. Per-service Redis namespacing to prevent key collisions across teams. Separate Redis instances per service type: one cluster for user sessions, one for product catalog, one for rate limiting. Monitor per-key hotspots and use hash tags for related keys in the same slot.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | UPI handle → VPA lookups, merchant session state — Redis as distributed session + lookup cache with strict TTL | Know Redis Sentinel HA setup; know `ReadFrom.REPLICA_PREFERRED` for read scaling |
| Swiggy / Meesho | Restaurant data, deal feeds, order status — multiple services sharing order data via Redis; Hash vs String choice for inventory | Can you design a Redis key scheme for data shared across multiple microservices? |
| Adobe / Microsoft | Creative asset metadata, user preferences across devices — Redis Hash for partial field updates, long TTLs for stable metadata | Do you know `HSET` for partial updates vs full object re-serialisation? |
| SAP Labs | Enterprise configuration data, product master data — Redis Cluster for large datasets, `@Cacheable` with `disableCachingNullValues` | Can you explain the null caching trap and why it matters in enterprise data systems? |

---

## 10. Related Topics — What to Study Next

- **Topic 101 — Redis Data Structures (String, Hash, List, Set, ZSet)** — full coverage of all five data structures with use cases per type
- **Topic 102 — Redis as Cache — TTL, Eviction Policies** — deep dive on `EXPIRE`, `maxmemory`, and all 8 eviction policy options
- **Topic 104 — Redis Distributed Lock — Redlock Algorithm** — using Redis for distributed locking (Topic 159 cache stampede mutex)
- **Topic 161 — Cache Consistency in Microservices** — building on this topic: how to keep Redis cache consistent when multiple services write to the same data
- **Topic 150 — Single Point of Failure: Redis** — Redis Sentinel vs Cluster for HA; `@Retryable` on cache misses during Redis failover

---

*Part 9 · Redis as Distributed Cache · Full Stack Interview Guide · Hruday D · 2026*
