# Foundation 05 — Caching

> A cache hit is 100x faster than a database query.
> Design your cache layer before you design your database layer.

---

## The Cache Hierarchy

```
Fastest                                     Slowest
   │                                            │
   ▼                                            ▼
L1 CPU    L2 CPU    RAM     SSD       HDD     Network
Cache     Cache    Cache   Storage  Storage   Storage
0.5 ns    7 ns    100 ns   1 ms     20 ms    150 ms

System Design Analogy:
Browser  →  CDN Edge  →  App Cache  →  Redis  →  DB
Cache        Cache       (in-process)
```

---

## Cache Levels in System Design

### Level 1: Browser Cache

```
HTTP Cache-Control headers control browser caching:

Cache-Control: max-age=3600, public     → Cache for 1 hour, shareable
Cache-Control: max-age=0, private       → Don't cache, user-specific
Cache-Control: no-cache                 → Must revalidate before using
Cache-Control: no-store                 → Never cache (sensitive data)
Cache-Control: stale-while-revalidate=60 → Serve stale, refresh async
ETag: "abc123"                          → Version identifier for conditional requests

GET /api/user/123
If-None-Match: "abc123"
→ 304 Not Modified (serve from browser cache)
→ 200 OK with new ETag (new content)
```

**Use for:** Static assets (JS, CSS, images), API responses that rarely change

---

### Level 2: CDN (Content Delivery Network)

**What:** Globally distributed edge servers that cache content close to users.

```
User (India) → CDN Edge (Mumbai) → Cache HIT → 10ms latency
                                 → Cache MISS → Origin (US) → 200ms

CDN Architecture:
    Origin Server
         │
    ┌────┴────┐
    │ CDN     │ (Points of Presence worldwide)
    │ PoP 1   │ ──▶ Users (North America)
    │ PoP 2   │ ──▶ Users (Europe)
    │ PoP 3   │ ──▶ Users (Asia)
    │ PoP 4   │ ──▶ Users (Australia)
    └─────────┘
```

**CDN Invalidation Strategies:**
```
1. URL versioning:  /assets/main.abc123.js  → change hash when content changes
2. TTL expiry:      Cache-Control: max-age=86400 → wait 24 hours
3. Manual purge:    CloudFront invalidation, Cloudflare cache purge
4. Soft purge:      Mark as stale, serve stale while fetching fresh (Varnish)
```

**CDN Providers:** CloudFront (AWS), Cloudflare, Fastly, Akamai, GCP Cloud CDN

**Use for:** Static assets, images, videos, public API responses, HTML pages

---

### Level 3: Application-Level Cache (In-Process)

```python
# In-process LRU cache (Guava, Caffeine, functools.lru_cache)
from functools import lru_cache

@lru_cache(maxsize=10000)
def get_user_config(user_id: int) -> dict:
    return db.query("SELECT * FROM user_config WHERE id = ?", user_id)
```

**Pros:** Zero network latency, no serialization cost
**Cons:** Not shared across instances, cache invalidation across pods is hard
**Use for:** Config data, feature flags, rarely-changing lookup tables

---

### Level 4: Distributed Cache (Redis / Memcached)

```
App Server 1 ──┐
App Server 2 ──┤──▶ Redis Cluster ──▶ Cache HIT (1ms)
App Server 3 ──┘                   └──▶ Cache MISS ──▶ DB (100ms)
```

**Redis vs Memcached:**

| Feature | Redis | Memcached |
|---------|-------|-----------|
| Data structures | Rich (List, Set, Hash, etc.) | Simple key-value |
| Persistence | Yes (RDB + AOF) | No |
| Replication | Yes | No (client-side) |
| Clustering | Built-in | Client-side hashing |
| Pub/Sub | Yes | No |
| Lua scripting | Yes | No |
| Memory efficiency | Lower (rich data) | Higher (simple) |
| Thread model | Single-threaded (v6: I/O threads) | Multi-threaded |

**Choose Redis:** Almost always — richer feature set, persistence, clustering
**Choose Memcached:** Only when you need simplicity and multi-threading at scale

---

## Cache Patterns

### Cache-Aside (Lazy Loading) — Most Common

```
Read flow:
1. Check cache
2. If HIT → return cached value
3. If MISS → query DB, store in cache, return

Write flow:
1. Write to DB
2. Invalidate cache (don't write-through)
```

```python
def get_user(user_id):
    # Step 1: Check cache
    cached = redis.get(f"user:{user_id}")
    if cached:
        return deserialize(cached)
    
    # Step 2: Cache miss → hit DB
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    
    # Step 3: Populate cache
    redis.setex(f"user:{user_id}", 3600, serialize(user))  # TTL: 1 hour
    
    return user

def update_user(user_id, data):
    db.execute("UPDATE users SET ... WHERE id = ?", user_id)
    redis.delete(f"user:{user_id}")  # Invalidate cache
```

**Pros:** Cache only what's requested, resilient to cache failures
**Cons:** Cache miss penalty on first access, potential stale data window

---

### Read-Through Cache

```
App ──▶ Cache ──▶ (if miss) DB
         │
         └──▶ Return (cache populated by cache layer, not app)
```

**Difference from Cache-Aside:** The cache library itself handles DB fetching.
**Used by:** Amazon ElastiCache with write-through config, NCache

---

### Write-Through Cache

```
Write flow:
App ──▶ Cache ──▶ DB
        (write to both synchronously)

Read flow:
App ──▶ Cache ──▶ HIT always (data already there from write)
```

**Pros:** Cache always consistent with DB, no cold start
**Cons:** Write latency (must wait for DB), cache bloat (write things not read)

---

### Write-Behind (Write-Back) Cache

```
Write flow:
App ──▶ Cache (immediate return)
             └──▶ async ──▶ DB (later, in batches)
```

**Pros:** Very fast writes
**Cons:** Risk of data loss (cache crash before write), complexity

---

### Refresh-Ahead Cache

```
Before TTL expires → proactively refresh cache from DB
User never sees cache miss (if prediction correct)
```

**Used for:** Trending data, high-traffic keys you know will be needed

---

## Cache Invalidation Strategies

> "There are only two hard things in Computer Science: cache invalidation and naming things." — Phil Karlton

### 1. TTL (Time-To-Live)
```
redis.setex("key", ttl_seconds, value)

Short TTL (1-60s):    Near real-time data (stock prices, counts)
Medium TTL (1-24h):   User profiles, product catalog
Long TTL (days):      Config, reference data
No TTL:               Static data (must invalidate on change)
```

### 2. Event-Based Invalidation
```
DB Update → Publish event → Consumer invalidates cache

DynamoDB Streams / MySQL binlog → Kafka → Cache Invalidation Service
→ redis.delete(affected_keys)
```

### 3. Cache Versioning
```
Version embedded in key:
  "user:123:v3"  → profile version 3

On update: bump version, old cache keys expire naturally
Problem: Old keys never explicitly deleted (use TTL as safety net)
```

### 4. Write-Through (No Invalidation Needed)
```
Update both cache and DB atomically → cache never stale
Cost: Higher write latency
```

---

## Cache Eviction Policies

| Policy | How | Use When |
|--------|-----|---------|
| **LRU** (Least Recently Used) | Evict least recently accessed | General purpose (default) |
| **LFU** (Least Frequently Used) | Evict least accessed overall | Long-term popularity-based |
| **MRU** (Most Recently Used) | Evict most recently accessed | Scan-resistant (e.g., log rotation) |
| **FIFO** | Evict oldest inserted | Queue-like workloads |
| **Random** | Evict randomly | Simple, cache-friendly workloads |
| **TTL** | Evict on expiry | Time-bounded data |
| **Allkeys-LRU** | LRU across all keys (Redis) | When all data is cache-worthy |
| **Volatile-LRU** | LRU on keys with TTL set | Mixed critical/cache data |

**Redis eviction policy config:**
```
maxmemory-policy allkeys-lru    # Most common
maxmemory-policy volatile-lru   # Only evict TTL keys
maxmemory-policy allkeys-lfu    # LFU based
maxmemory-policy noeviction     # Return error when full (don't use)
```

---

## Cache Problems and Solutions

### Cache Stampede (Thundering Herd)

**Problem:** Cache expires → 1000 concurrent requests all miss → all hit DB simultaneously → DB overload

**Solutions:**

```python
# Solution 1: Mutex Lock (only one request fetches, others wait)
def get_with_mutex(key, fetch_fn, ttl):
    value = redis.get(key)
    if value:
        return value
    
    lock_key = f"lock:{key}"
    if redis.setnx(lock_key, "1"):  # Acquire lock
        redis.expire(lock_key, 10)
        try:
            value = fetch_fn()
            redis.setex(key, ttl, value)
            return value
        finally:
            redis.delete(lock_key)
    else:
        time.sleep(0.05)  # Wait and retry
        return get_with_mutex(key, fetch_fn, ttl)

# Solution 2: Probabilistic early expiration
import random, math
def get_with_pxr(key, fetch_fn, ttl, beta=1):
    value, expiry = redis.get_with_expiry(key)
    now = time.time()
    
    # Proactively recompute before expiry with some probability
    if now - beta * math.log(random.random()) >= expiry:
        value = fetch_fn()
        redis.setex(key, ttl, value)
    
    return value

# Solution 3: Stale-while-revalidate
# Serve stale content immediately, refresh asynchronously
```

---

### Cache Penetration

**Problem:** Requests for non-existent keys always miss cache → always hit DB → DoS

**Solutions:**
```python
# Solution 1: Cache null values
user = db.get(user_id)
if user is None:
    redis.setex(f"user:{user_id}", 60, "NULL")  # Cache absence
else:
    redis.setex(f"user:{user_id}", 3600, serialize(user))

# Solution 2: Bloom filter
bloom = BloomFilter(capacity=10_000_000, error_rate=0.001)
# Load all valid user_ids into bloom filter

def get_user(user_id):
    if user_id not in bloom:
        return None  # Definitely doesn't exist, skip DB
    # ... proceed with cache lookup
```

---

### Cache Avalanche

**Problem:** Many cache keys expire simultaneously → all miss at once → DB overwhelmed

**Solutions:**
```python
# Add jitter to TTL
import random

base_ttl = 3600
jitter = random.randint(0, 300)  # 0-5 minute jitter
redis.setex(key, base_ttl + jitter, value)

# Stagger cache warming
# Use circuit breaker around DB calls
# Multi-layer cache (L1 app cache + L2 Redis → less chance both miss)
```

---

### Hot Key Problem

**Problem:** One key accessed millions of times/sec (celebrity tweet, trending product) → single Redis shard overwhelmed

**Solutions:**
```
1. Local in-process cache for hot keys
   App server caches hot key in memory for 1-5 seconds
   → No Redis calls for most requests

2. Key replication
   Store hot key as: key:shard:0, key:shard:1, ..., key:shard:N
   Read randomly from any shard

3. Read replicas per shard
   Route hot-key reads to dedicated read replicas

4. Redis Cluster with virtual nodes
   More shards → hot key spread across more nodes
```

---

## Cache Sizing

```
Cache size = (working set size) × (target hit rate factor)

Working set: Data actively accessed in a given time window
  "80% of traffic hits 20% of data" (Pareto principle)

Example: 1TB total data, 80/20 rule:
  20% = 200GB → cache this for 80% hit rate
  With 95% hit rate target: cache ~30% = 300GB

Alternatively:
  Start with 10-20% of DB size
  Monitor hit rate → if < 80%, increase cache
  
Redis memory rule: 
  Store 1M objects × 1KB each = ~1.2-1.5GB (overhead)
  Redis typically 1.2-1.5x raw data size
```

---

## Distributed Cache Architecture

### Redis Cluster

```
Hash slots: 16,384 total
Distributed across N master nodes

3-master cluster:
  Master 1: slots 0-5460      + Replica 1
  Master 2: slots 5461-10922  + Replica 2
  Master 3: slots 10923-16383 + Replica 3

key → CRC16(key) % 16384 → slot → node

Client connects to any node → MOVED redirect if wrong shard
```

### Redis Sentinel (HA for non-cluster)

```
           ┌──────────┐
           │ Sentinel │──monitors──┐
           │ (3 nodes)│            │
           └──────────┘            │
                                   ▼
Client ──▶ Sentinel ──▶ Master ──replicates──▶ Replicas
                │
                └──▶ On master failure:
                     elect new master from replicas
                     notify all clients
```

---

## Cache Interview Questions

**Q: How would you cache a social network feed?**
> Pre-compute feeds and cache in Redis (push model). Each user has a sorted set of tweet IDs. On read, fetch tweet IDs from cache, then get tweet content (also cached separately). Expire feed cache after 24 hours of inactivity.

**Q: How do you handle cache invalidation for a product catalog?**
> Write-through: update cache and DB together. Use event-driven invalidation via change data capture. Add 5-minute jitter to TTL to prevent avalanche.

**Q: What's the difference between Redis and Memcached?**
> Redis has richer data structures, persistence, clustering, pub/sub. Memcached is simpler and multi-threaded. Choose Redis for almost all modern use cases.

**Q: How would you implement a leaderboard?**
> Redis Sorted Set (ZADD score member). O(log N) insert, O(log N) rank query. ZREVRANGE for top-N. Scores auto-sorted.

---

*Next: `06_messaging_systems.md`*
