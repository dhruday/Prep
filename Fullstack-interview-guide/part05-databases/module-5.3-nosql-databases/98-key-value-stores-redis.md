# Key-Value Stores — Redis Use Cases
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Redis = an in-memory data structure store. Data lives in RAM → sub-millisecond reads/writes. Supports persistence (RDB snapshots + AOF logs) but primarily used as a cache, session store, rate limiter, pub/sub broker, or distributed lock manager — NOT as a primary database for critical long-lived data.
- Core data structures: String (any binary safe value — counters, serialised JSON), List (ordered, LPUSH/RPOP = queue), Set (unordered unique members — tags, unique visitors), Sorted Set/ZSet (members with scores — leaderboards, priority queues), Hash (field-value pairs within one key — user profile), Bitmap, HyperLogLog, Stream.
- TTL (Time To Live): set expiry on any key with `EXPIRE key seconds` or `SET key value EX seconds`. Expired keys are automatically deleted. Essential for caches and sessions.
- Use case 1 — Caching: store the result of expensive DB queries in Redis with a TTL. On next request: check Redis first (cache hit → return immediately), fall through to DB only on cache miss.
- Use case 2 — Session storage: stateless API servers can store user sessions in Redis as a shared store — any server can look up any session by session ID. Session expires automatically via TTL.
- Use case 3 — Rate limiting: use INCR + EXPIRE per (user_id, time_window) key. If count > limit, reject the request.
- Use case 4 — Distributed lock: SETNX (SET if Not eXists) with a TTL creates a lock that expires automatically if the holder crashes.
- Use case 5 — Pub/Sub / queuing: SUBSCRIBE/PUBLISH for fan-out messaging; Lists for simple work queues (BLPOP for blocking pop).
- Gap to bridge: candidates say "use Redis for caching" but cannot explain cache invalidation strategies, how rate limiting works atomically, why SETNX alone is not a safe lock, or the risk of cache stampede

---

## 1. One-Line Definition
Redis is an in-memory data structure server that provides sub-millisecond read/write access for caching, session management, rate limiting, and ephemeral data patterns — acting as the performance tier in front of slower persistent databases.

---

## 2. The Problem It Solves

```
WITHOUT Redis (all reads from database):

  API endpoint: GET /api/products/{id}
  
  - Spring Boot receives request
  - Queries PostgreSQL: SELECT + 2 JOINs → 8ms
  - At 5,000 requests/second for product detail pages:
    5000 × 8ms = would need 40 "parallel" DB capacity seconds/second
    Practically: database CPU saturates at ~3,000 req/sec
    Beyond that: timeouts, connection pool exhaustion
  
  Most product reads are for the SAME popular products:
  - iPhone 15 page: 2,000 requests/hour
  - AirPods page: 1,500 requests/hour
  - Top 100 products: 90% of all reads
  
  All 5,000 req/sec hit the database even though 90% ask for the same 100 products.

WITH Redis cache:
  
  First request for iPhone 15: DB query → 8ms → result stored in Redis with TTL=5min
  Requests 2 through 500,000 for iPhone 15 (within 5 min): Redis lookup → 0.2ms
  DB sees: only cache misses and cache refreshes (5% of traffic) instead of 100%
  
  Result: DB load drops 95%. Response time: 0.2ms vs 8ms.
  DB can handle 10× more write operations with freed capacity.

WITHOUT Redis (rate limiting):
  
  An attacker sends 10,000 OTP requests for the same phone number in 1 minute.
  Each triggers an SMS: 10,000 × ₹0.10 = ₹1,000 in 60 seconds.
  Without limiting: cost explodes, SMS gateway flags the account.

WITH Redis rate limiting:
  
  Key: rate:otp:+91-9876543210:2026-01-10-10 (user + time window)
  On each OTP request:
    INCR rate:otp:+91-9876543210:2026-01-10-10 → returns count
    If count == 1: EXPIRE the key for 60 seconds
    If count > 5: reject with "too many requests"
  
  Result: phone number can only receive 5 OTPs per minute.
  Attacker's 10,000 requests: first 5 succeed, remaining 9,995 are rejected instantly.
```

---

## 3. How It Works Internally

### Key Redis Data Structures and When to Use Each

```
STRING
  SET user:profile:U-001 <json_blob> EX 300   ← store with 5-minute TTL
  GET user:profile:U-001
  INCR page:views:product:P-001                ← atomic increment counter
  
  Use for: caching any JSON/text response, counters, feature flags.

HASH (field-value map within one key)
  HSET user:settings:U-001 theme dark language en notifications on
  HGET user:settings:U-001 theme     → "dark"
  HGETALL user:settings:U-001        → all field-value pairs
  HDEL user:settings:U-001 notifications
  
  Use for: user profiles/settings where you want to update individual fields
  without deserialising and re-serialising a full JSON blob.
  Memory efficient for structured objects with many fields.

LIST (ordered, allows duplicates — implemented as doubly linked list)
  RPUSH work:queue:email job-001 job-002 job-003    ← right push (enqueue)
  BLPOP work:queue:email 30                         ← blocking left pop (dequeue, wait 30s)
  
  LPUSH notifications:U-001 <json> EX 86400         ← push to left (recent first)
  LRANGE notifications:U-001 0 19                   ← get first 20 items
  LTRIM notifications:U-001 0 99                    ← keep only most recent 100
  
  Use for: FIFO queues, notification feeds, activity logs (with LTRIM for bounded size).

SET (unordered, unique members)
  SADD product:tags:P-001 "spring" "java" "backend"
  SMEMBERS product:tags:P-001                        → {"spring", "java", "backend"}
  SISMEMBER product:tags:P-001 "java"               → 1 (true)
  
  SADD daily:unique:visitors:2026-01-10 "user-123"  ← track unique visitors today
  SCARD daily:unique:visitors:2026-01-10             → count of unique visitors
  
  SUNIONSTORE combined:tags "product:tags:P-001" "product:tags:P-002"  ← tag union
  SINTERSTORE common:tags "product:tags:P-001" "product:tags:P-002"   ← tag intersection
  
  Use for: unique sets (unique daily visitors, tags), set operations (intersection/union).

SORTED SET / ZSET (members with float scores — ordered by score)
  ZADD leaderboard 9850.0 "user:U-001"    ← add user with score
  ZADD leaderboard 9500.0 "user:U-002"
  ZADD leaderboard 10200.0 "user:U-003"
  
  ZREVRANGE leaderboard 0 9 WITHSCORES    ← top 10 users (highest score first)
  ZRANK leaderboard "user:U-001"           ← get rank of user (0-indexed)
  ZINCRBY leaderboard 50.0 "user:U-001"   ← increment score atomically
  
  Use for: leaderboards, priority queues,
           time-ordered feeds (score = timestamp).
  
HyperLogLog (probabilistic unique count — uses ~12KB regardless of set size)
  PFADD page:unique:2026-01-10:home user-123 user-456 user-789
  PFCOUNT page:unique:2026-01-10:home   → approximate unique count (~0.81% error)
  
  Use for: unique visitor counts at scale where approximate accuracy is acceptable
  and you don't want to store billions of user IDs per day.
```

### Cache Stampede Problem and Prevention

```
CACHE STAMPEDE (also called thundering herd):

  Popular product cache entry expires at T=0.
  10,000 concurrent requests arrive at T=0.000001 seconds.
  All 10,000 check Redis: all get "cache miss" simultaneously (key has expired).
  All 10,000 → query the database simultaneously.
  Database: receives 10,000 identical queries at once → CPU spike → potential crash.

SOLUTION 1 — Staggered TTL (simple, incomplete fix):
  Add random jitter to TTL: 300 + random(0, 30) seconds.
  Multiple popular keys don't expire at exactly the same time.
  Helps when multiple cache keys expire at once.
  Does NOT help if one very popular key expires under high load.

SOLUTION 2 — Cache lock (probabilistic early expiration):
  When a key is about to expire (e.g., within 5 seconds of TTL end):
    ONE request (the first to check) gets a lock and refreshes the cache.
    All other requests continue serving the SLIGHTLY STALE cached value.
    When the refresh completes, TTL is extended.
  
  Implementation: store the value AND the calculated expiry time separately.
  On access: if now() > stored_expiry_time AND lock acquired → refresh.
  If lock NOT acquired → serve stale value (fine for most cases).

SOLUTION 3 — Background refresh (proactive):
  A scheduled refresher runs at TTL/2 for popular keys.
  Cache never expires under traffic — refreshed before expiry.
  Only feasible for a known set of "always hot" cache keys.
```

---

## 4. The Code

### Wrong Way — No Cache Invalidation Strategy
```java
// WRONG: Cache without a TTL and without invalidation on product update

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepo;
    private final RedisTemplate<String, String> redis;

    public Product getProduct(String productId) throws JsonProcessingException {
        String key = "product:" + productId;
        String cached = redis.opsForValue().get(key);

        if (cached != null) {
            return objectMapper.readValue(cached, Product.class);
        }

        Product product = productRepo.findById(productId).orElseThrow();
        // WRONG: Cached forever — no TTL, no expiry
        redis.opsForValue().set(key, objectMapper.writeValueAsString(product));
        // When product price changes: cache still serves old price indefinitely
        // Users see wrong prices. Support tickets spike. Feature reverted.
        return product;
    }
}
```
> **Why this fails:** Without a TTL, the cached product is served forever. Price changes, stock updates, and product deactivations are invisible to users until the server restarts or the key is manually deleted.

### Right Way — Cache with TTL, Invalidation, and Rate Limiting
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepo;
    private final RedisTemplate<String, String> redis;
    private final ObjectMapper objectMapper;

    private static final String PRODUCT_CACHE_PREFIX = "product:v1:";
    private static final Duration PRODUCT_CACHE_TTL = Duration.ofMinutes(10);

    // READ: cache-aside pattern with TTL
    public Product getProduct(String productId) {
        String key = PRODUCT_CACHE_PREFIX + productId;

        // Check cache first
        String cached = redis.opsForValue().get(key);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, Product.class);
            } catch (JsonProcessingException e) {
                // If cache value is corrupt: log and fall through to DB
                log.warn("Cache deserialization failed for key {}", key, e);
                redis.delete(key);
            }
        }

        // Cache miss: query database
        Product product = productRepo.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product: " + productId));

        try {
            // Store in cache with TTL — will auto-expire in 10 minutes
            redis.opsForValue().set(
                key,
                objectMapper.writeValueAsString(product),
                PRODUCT_CACHE_TTL
            );
        } catch (JsonProcessingException e) {
            log.error("Failed to cache product {}", productId, e);
            // Don't throw — cache failure is non-critical, DB read succeeded
        }

        return product;
    }

    // WRITE: invalidate cache on product update
    @Transactional
    public Product updateProduct(String productId, UpdateProductRequest req) {
        Product product = productRepo.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product: " + productId));

        product.setName(req.getName());
        product.setPrice(req.getPrice());
        product.setInStock(req.isInStock());

        Product saved = productRepo.save(product);

        // Invalidate cache AFTER successful DB write
        String key = PRODUCT_CACHE_PREFIX + productId;
        redis.delete(key);
        // Next read will be a cache miss → fetch fresh from DB → re-cache

        return saved;
    }
}

// RATE LIMITING: OTP request rate limiter using Redis INCR + EXPIRE
@Service
@RequiredArgsConstructor
public class RateLimiterService {

    private final RedisTemplate<String, String> redis;
    private final StringRedisTemplate stringRedisTemplate;

    private static final int OTP_MAX_PER_MINUTE = 5;

    /**
     * Returns true if the request is allowed (under rate limit).
     * Returns false if the rate limit is exceeded.
     */
    public boolean isOtpRequestAllowed(String phoneNumber) {
        // Minute-window key: changes every minute
        String window = String.valueOf(Instant.now().getEpochSecond() / 60);
        String key = "rate:otp:" + phoneNumber + ":" + window;

        // INCR is atomic — safe for concurrent requests
        Long count = stringRedisTemplate.opsForValue().increment(key);

        if (count != null && count == 1) {
            // First request in this window: set expiry for the key
            // (expire in 60 seconds so the key cleans itself up)
            redis.expire(key, Duration.ofSeconds(60));
        }

        return count != null && count <= OTP_MAX_PER_MINUTE;
    }

    // Alternatively: using Lua script for atomicity (INCR + EXPIRE in one operation)
    public boolean isOtpRequestAllowedAtomic(String phoneNumber) {
        String window = String.valueOf(Instant.now().getEpochSecond() / 60);
        String key = "rate:otp:" + phoneNumber + ":" + window;

        // Lua script executed atomically inside Redis (no race between INCR and EXPIRE)
        String luaScript = """
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then
                redis.call('EXPIRE', KEYS[1], 60)
            end
            return count
            """;

        Long count = redis.execute(
            new DefaultRedisScript<>(luaScript, Long.class),
            List.of(key)
        );

        return count != null && count <= OTP_MAX_PER_MINUTE;
    }
}
```

```java
// DISTRIBUTED LOCK: Using Redisson (preferred over raw SETNX)
// pom.xml: <dependency><groupId>org.redisson</groupId><artifactId>redisson-spring-boot-starter</artifactId>...>

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final RedissonClient redissonClient;
    private final InventoryRepository inventoryRepo;

    @Transactional
    public boolean reserveInventory(String productId, int quantity) {
        // Lock key is per-product — concurrent reservations for DIFFERENT products don't block
        RLock lock = redissonClient.getLock("lock:inventory:" + productId);

        boolean locked = false;
        try {
            // Try to acquire lock: wait up to 3 seconds, lock auto-expires in 10 seconds
            // Auto-expiry ensures lock is released if this JVM crashes mid-way
            locked = lock.tryLock(3, 10, TimeUnit.SECONDS);
            if (!locked) {
                // Another process holds the lock — conflict, retry or fail
                throw new ResourceConflictException("Inventory update in progress for: " + productId);
            }

            Inventory inventory = inventoryRepo.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory: " + productId));

            if (inventory.getAvailableQty() < quantity) {
                return false;  // insufficient stock
            }

            inventory.setAvailableQty(inventory.getAvailableQty() - quantity);
            inventory.setReservedQty(inventory.getReservedQty() + quantity);
            inventoryRepo.save(inventory);
            return true;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Lock acquisition interrupted", e);
        } finally {
            // ALWAYS release the lock in finally — even if an exception occurred
            if (locked && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Redis and why would you use it instead of just using a database?"

**Hruday's answer:**
> Redis is an in-memory data structure server. Everything stored in Redis lives in RAM, which is why reads and writes are sub-millisecond — typically 0.1 to 0.5ms compared to 5-15ms for a database query on SSD.
>
> I'd use Redis as a performance layer in front of the database, not instead of it. Typical patterns: cache expensive database query results in Redis with a TTL so repeated requests for the same data are served from memory. Store user sessions in Redis so any stateless API server can look up any user's session by ID. Implement rate limiting by storing per-user request counts in Redis with the window duration as TTL.
>
> The key distinction: Redis is for ephemeral or derived data that can be recreated from the primary database if lost. Financial transactions, user accounts, and orders live in PostgreSQL because they must be durable and queryable. Product pages, authentication sessions, and API response caches live in Redis because speed matters and staleness of seconds is acceptable.

---

### Q2 — Cache Invalidation
**Interviewer asks:** "A user updates their profile picture but still sees the old one for several minutes. What went wrong and how do you fix it?"

**Hruday's answer:**
> The profile data was cached in Redis with a long TTL. The user's update wrote to the database successfully, but the cache key still holds the pre-update value for the remaining TTL duration. This is a stale cache problem.
>
> The fix: cache invalidation on write. When the profile is updated, delete the cache key immediately after the successful database write. The next GET request will be a cache miss, fetch fresh data from the database, and store it back in Redis with a fresh TTL. All subsequent reads will see the updated profile.
>
> The code pattern: write to DB → on success: delete Redis key (not update) — delete is safer than update because it's atomic and idempotent. If we update the cache key instead, a race condition between two concurrent updates could leave the wrong version in cache.
>
> For this specific case — user's own profile — read-after-write consistency is critical. I'd also ensure the GET after a profile update is routed to avoid cache temporarily (either don't re-cache immediately, or force a primary DB read on the confirmation page).

---

### Q3 — Rate Limiting Implementation
**Interviewer asks:** "Implement a rate limiter: 5 requests per minute per user using Redis."

**Hruday's answer:**
> The standard approach: a Redis key per user per time window, incremented on each request.
>
> Key structure: `rate:{user_id}:{minute_epoch}` where minute_epoch is `unix_timestamp / 60` — changes every 60 seconds.
>
> On each request: atomically INCR the key. If the result is 1, also set EXPIRE to 60 seconds. If the result exceeds 5, reject the request.
>
> The atomic concern: INCR and EXPIRE are two separate operations. A small window exists after INCR returns 1 but before EXPIRE is set — if the process crashes here, the key has no expiry and blocks the user forever. The fix: use a Lua script that runs both INCR and EXPIRE atomically in Redis's single-threaded execution model, or use `SET key 0 EX 60 NX` to create the key with TTL in one command if it doesn't exist.
>
> Advanced option: a sliding window counter using a Sorted Set where each request is a ZSet member scored by timestamp. Count members in the last 60 seconds with ZRANGEBYSCORE. More accurate but higher memory — fine for most use cases, over-engineered for simple per-minute limits.

---

### Q4 — Distributed Lock
**Interviewer asks:** "How do you prevent two instances of a service from running the same scheduled job simultaneously?"

**Hruday's answer:**
> Classic distributed lock problem. Two service instances — both with a @Scheduled job that fires every 5 minutes — must ensure only one executes at a given time.
>
> Using Redisson's `tryLock`: at job start, try to acquire a lock with a key like `lock:job:report-generator`. Include two timeouts: the wait time (how long to wait if lock is held — 0 seconds for a job, meaning fail fast) and the lease time (how long the lock holds before auto-expiring — slightly longer than the expected job duration).
>
> If tryLock returns false: the other instance holds the lock and is running the job. This instance skips execution. If tryLock returns true: this instance runs the job. After completion, it explicitly releases the lock.
>
> The auto-expiry (lease time) is the critical safety mechanism: if the instance crashes mid-job, the lock doesn't stay acquired forever — it expires and the other instance can acquire it on the next scheduled run.
>
> Don't use raw SETNX — it doesn't handle the lock expiry renewal when the job runs longer than expected. Redisson watchdog extends the lock TTL automatically while the lock holder is alive.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Cache everything with a long TTL" | "Set TTL to 24 hours to maximise cache efficiency" | "Long TTL means stale data is served for longer after updates. A 24-hour TTL for a product's price means a price change takes up to 24 hours to reflect for users. Cache duration should match the acceptable staleness for that data type: static data (cities, countries) → 24+ hours fine. Product prices → 5-10 minutes maximum. User sessions → no TTL (explicit logout) or short sliding expiration. Stock levels → 30 seconds maximum. Never default to 24 hours — set TTL based on how often the data changes and how much staleness is acceptable." |
| "Redis is a database replacement" | "Just use Redis as your main database — no SQL needed" | "Redis is primarily in-memory. Yes, it has RDB snapshots and AOF persistence, but: (1) on restart before a snapshot, recent writes may be lost; (2) the entire dataset must fit in RAM; (3) it lacks SQL querying, joins, or complex aggregations. Use Redis for ephemeral high-speed data (sessions, cache, rate limiters) with a persistent database (Postgres, MongoDB) as the source of truth. The pattern is complementary, not substitutive." |
| "INCR + EXPIRE is atomic" | "I do INCR then EXPIRE — that's atomic with Redis single-threaded model" | "INCR and EXPIRE are two separate Redis commands. Between them, another client could call INCR on the same key — if the first EXPIRE hasn't run yet, both now have a key with no expiry. This is a race condition window, even though Redis is single-threaded. The fix: use a Lua script (both commands in one atomic execution block) or use the SET key value EX ttl NX pattern to set the initial counter with TTL in one command. The correctness gap is rare but real in production under concurrent high load." |
| "Single Redis for everything" | "Use one Redis instance for all use cases — sessions, cache, pub/sub, locks" | "Mixing volatile cache data with critical session data and distributed locks on one Redis instance creates operational risk. Cache evictions (when memory fills with cache data under LRU eviction policy) could evict active user sessions or distributed lock keys — catastrophic. Use separate Redis instances (or at least separate databases: SELECT 0 for cache, SELECT 1 for sessions, SELECT 2 for locks) with different maxmemory-policy: allkeys-lru for cache, noeviction for sessions. Better: separate Redis deployments per concern, especially for session and lock data." |

---

## 7. Hruday's Real Experience Hook

> "At Capgemini, a product search API was running too slowly — every search hit PostgreSQL full-text search, which on a 2-million-product catalogue took 200-400ms per query. I implemented a Redis caching layer: search results cached by normalised query string with a 2-minute TTL. The most common searches (top 100 queries by frequency, visible in analytics) became Redis hits serving at ~1ms. Overall search response time on the 95th percentile dropped from 380ms to 12ms. One subtle issue I ran into: users who searched the same term with different capitalisation bypassed the cache. Fix was normalising the cache key to lowercase + trimmed before looking up. Always normalise your cache keys."

---

## 8. Scale Evolution

**Small system:** Single Redis instance. Default `maxmemory-policy: noeviction` if all data is critical. Standalone Redis with AOF persistence for durability.

**Medium system:** Redis Replication (primary + read replicas) for read scaling. Separate Redis instances for cache (LRU eviction acceptable) vs sessions (noeviction). Redis Sentinel for automated failover.

**Large system:** Redis Cluster for horizontal scaling across multiple nodes. Sharded by key hash space. Be aware: multi-key operations (MGET, pipelines across keys) may not work if keys hash to different nodes. Design keys to be atomic operations whenever possible.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | OTP rate limiting, payment session storage, idempotency key storage (SETNX), API response caching for public endpoints. Redis is a core infrastructure component. | "Design a rate limiter that limits 100 API calls per minute per merchant using Redis." |
| Swiggy / Meesho | Product catalogue caching (menu items with 5-min TTL), user cart storage (session), delivery partner live location (Geo commands), flash sale inventory counters. | "A flash sale starts. How do you use Redis to manage inventory counters for 10,000 concurrent requests?" |
| Adobe / Microsoft | API response caching for asset metadata, user preferences as Hash, notification delivery queues as Redis Lists, feature flag storage. | "How would you implement a feature flag system in Redis that can be updated without redeployment?" |
| SAP Labs (current) | SAP uses Redis for API gateway caching (SAP API Management) and for session management in cloud-native SAP applications. Redis use in BTP (Business Technology Platform) services is increasing. | "How would you implement distributed session management for a horizontally scaled Spring Boot application on SAP BTP?" |

---

## 10. Related Topics — What to Study Next

- **Topic 101 — Redis Data Structures** — deep dive into all Redis data structures (String, Hash, List, Set, ZSet, Bitmap, HyperLogLog, Stream), when to use each, memory implications
- **Topic 102 — Redis as Cache** — detailed cache patterns: write-through, write-behind, read-through, cache eviction policies, TTL strategy per data type
- **Topic 104 — Redis Distributed Lock (Redlock)** — the Redlock algorithm for distributed locking across multiple Redis nodes — more robust than single-node SETNX

---

*Part 5 · Key-Value Stores — Redis Use Cases · Full Stack Interview Guide · Hruday D · 2026*
