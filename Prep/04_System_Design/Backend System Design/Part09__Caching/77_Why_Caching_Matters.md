# 77. Why Caching Matters

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Caching?

**Caching** is the technique of storing frequently accessed data in a **fast, temporary storage layer** (cache) to reduce latency, database load, and cost by avoiding repeated expensive operations (database queries, API calls, computations).

**The Problem Without Caching**:

```
┌────────────────────────────────────────────────────────┐
│         WITHOUT CACHE (Every Request Hits Database)    │
└────────────────────────────────────────────────────────┘

User Request: "Show profile for user_id=123"
    ↓
┌─────────────────┐
│  Application    │  Query: SELECT * FROM users WHERE id = 123
│  Server         │  ↓
└─────────┬───────┘  10ms network latency
          ↓          +
┌─────────────────┐  20ms database query
│  Database       │  +
│  (Disk I/O)     │  5ms data transfer
└─────────────────┘  =
          ↓          35ms total latency per request
     User sees profile (35ms)

Problem:
- Every request: 35ms latency (slow for users)
- Database load: 1,000 requests/sec = 1,000 queries/sec (overloaded)
- Cost: Database needs to scale to handle 1,000 QPS ($$$)
- Repeated work: Profile data rarely changes, but queried 1,000 times/sec (wasteful)
```

**The Solution With Caching**:

```
┌────────────────────────────────────────────────────────┐
│         WITH CACHE (Most Requests Served from Cache)   │
└────────────────────────────────────────────────────────┘

FIRST REQUEST (Cache Miss):
User Request: "Show profile for user_id=123"
    ↓
┌─────────────────┐
│  Application    │  1. Check cache: MISS (not in cache)
│  Server         │  2. Query database: 35ms
└─────────┬───────┘  3. Store result in cache (for future requests)
          ↓          4. Return to user
┌─────────────────┐
│  Redis Cache    │  Cache: user:123 → {name: "Alice", email: "alice@example.com"}
│  (In-Memory)    │  TTL: 300 seconds (5 minutes)
└─────────┬───────┘
          ↓ (miss)
┌─────────────────┐
│  Database       │  Query: 35ms (slow, but only once)
└─────────────────┘
     User sees profile (35ms)


SUBSEQUENT REQUESTS (Cache Hit):
User Request: "Show profile for user_id=123" (again)
    ↓
┌─────────────────┐
│  Application    │  1. Check cache: HIT (found in cache! ✅)
│  Server         │  2. Return cached data immediately
└─────────┬───────┘  3. No database query needed
          ↓
┌─────────────────┐
│  Redis Cache    │  Cache: user:123 → {name: "Alice", ...}
│  (In-Memory)    │  Return: 1ms (from memory, no disk I/O)
└─────────────────┘
     User sees profile (1ms) ← 35x faster!

Result:
- 999 requests: 1ms latency (cache hit) ← Fast! 🚀
- 1 request: 35ms latency (cache miss, first time)
- Average: (999 × 1ms + 1 × 35ms) / 1000 = 1.03ms ← 34x faster than no cache
- Database load: 1,000 requests/sec → 1 query/sec (99.9% cache hit rate) ← 1000x reduction
- Cost: Redis cache ($50/month) vs scaling database to 1K QPS ($1,000/month) ← 20x cheaper
```

### Why Caching Matters

| Metric | Without Cache | With Cache (99% hit) | Improvement |
|--------|---------------|----------------------|-------------|
| **Latency** | 35ms P95 | 1ms P95 | **35x faster** |
| **Database QPS** | 1,000 queries/sec | 10 queries/sec | **100x load reduction** |
| **Cost** | $1,000/month (large DB) | $50/month (cache) + $100/month (small DB) | **6.7x cheaper** |
| **User experience** | Slow page loads | Instant responses | **Better retention** |

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Cache Hit Ratio (Most Critical Metric)

**Cache hit ratio** = (Cache hits / Total requests) × 100%

**Example calculation**:
```
Total requests: 1,000,000
Cache hits: 990,000 (found in cache)
Cache misses: 10,000 (not in cache, query database)

Cache hit ratio = 990,000 / 1,000,000 = 99%
```

**Impact of hit ratio on latency**:

| Hit Ratio | Cache Hits (1ms) | DB Misses (35ms) | Avg Latency |
|-----------|------------------|------------------|-------------|
| **50%** | 500K @ 1ms | 500K @ 35ms | (500K×1 + 500K×35) / 1M = **18ms** |
| **90%** | 900K @ 1ms | 100K @ 35ms | (900K×1 + 100K×35) / 1M = **4.4ms** |
| **99%** | 990K @ 1ms | 10K @ 35ms | (990K×1 + 10K×35) / 1M = **1.34ms** |
| **99.9%** | 999K @ 1ms | 1K @ 35ms | (999K×1 + 1K×35) / 1M = **1.03ms** |

**Key insight**: 90% → 99% hit ratio (9% improvement) reduces latency from 4.4ms → 1.34ms (**3.3x faster**). Focus on maximizing cache hit ratio.

---

### 2. Cache vs Database Performance Comparison

**Redis (In-Memory Cache)**:
- Storage: RAM (memory)
- Latency: **0.1-1ms** (P50), 1-5ms (P99)
- Throughput: 100K-1M operations/sec (single instance)
- Data structure: Key-value, hash, list, set, sorted set
- Durability: Optional (RDB snapshots, AOF log)
- Cost: $50-500/month (16GB-128GB RAM)

**PostgreSQL (Database)**:
- Storage: Disk (SSD)
- Latency: **10-50ms** (P50), 50-200ms (P99) for non-cached queries
- Throughput: 1K-10K queries/sec (single instance)
- Data structure: Tables, rows, indexes
- Durability: ACID guarantees (always persisted)
- Cost: $100-1,000/month (depends on size, IOPS)

**Performance comparison** (example query: `SELECT * FROM users WHERE id = 123`):

```
Redis Cache:
- Key: "user:123"
- Operation: GET user:123
- Latency: 0.5ms (memory lookup, single key)
- Throughput: 100K ops/sec (single Redis instance)

PostgreSQL Database:
- Query: SELECT * FROM users WHERE id = 123
- Latency breakdown:
  * Parse query: 1ms
  * Acquire connection: 2ms
  * Disk I/O (if not in buffer pool): 10-20ms
  * Read row: 5ms
  * Network transfer: 5ms
  * Total: 23ms (cold query, no cache)
  * Best case (buffer pool hit): 10ms (still 10x slower than Redis)

Speedup: 23ms / 0.5ms = 46x faster with cache
```

---

### 3. What to Cache (Use Cases)

**Ideal candidates for caching**:

| Data Type | Example | TTL | Hit Ratio | Impact |
|-----------|---------|-----|-----------|--------|
| **User profiles** | Name, email, avatar | 5-30 min | 95-99% | High (every page load) |
| **Product catalog** | Product details, prices | 5-15 min | 90-95% | High (e-commerce) |
| **API responses** | External API calls (weather, stock price) | 1-5 min | 80-95% | High (save API cost) |
| **Session data** | Login state, cart items | 30 min - 24h | 99%+ | Critical (auth) |
| **Computed results** | Aggregations, reports | 10-60 min | 70-90% | Medium (expensive queries) |
| **Static assets** | Images, CSS, JS files | 1h - 7 days | 99%+ | High (CDN caching) |

**What NOT to cache**:

| Data Type | Reason |
|-----------|--------|
| **Frequently updated data** | User balance, real-time stock prices (cache invalidation complex) |
| **Large objects** | Videos, large files (waste cache space, use CDN instead) |
| **Rarely accessed data** | Historical logs, old reports (low hit ratio, not worth caching) |
| **Security-sensitive data** | Passwords, credit cards (cache in memory = security risk) |

---

### 4. Cache Latency Breakdown

**Example: Netflix user profile page** (includes avatar, watch history, recommendations)

**Without cache** (cold request):
```
User request → Application server
    ↓
1. Query user profile: SELECT * FROM users WHERE id = 123
   - Database latency: 25ms
    ↓
2. Query watch history: SELECT * FROM watch_history WHERE user_id = 123 ORDER BY watched_at DESC LIMIT 20
   - Database latency: 30ms (index scan + sort)
    ↓
3. Query recommendations: Complex ML model query (JOIN multiple tables)
   - Database latency: 150ms (expensive, joins 5 tables)
    ↓
4. Aggregate results, render HTML
   - Application latency: 10ms
    ↓
Total: 25ms + 30ms + 150ms + 10ms = 215ms (slow 🐌)
```

**With cache** (warm request):
```
User request → Application server
    ↓
1. Cache lookup: GET user:123:profile
   - Redis latency: 0.5ms (cache hit ✅)
    ↓
2. Cache lookup: GET user:123:watch_history
   - Redis latency: 0.5ms (cache hit ✅)
    ↓
3. Cache lookup: GET user:123:recommendations
   - Redis latency: 0.5ms (cache hit ✅)
    ↓
4. Render HTML
   - Application latency: 10ms
    ↓
Total: 0.5ms + 0.5ms + 0.5ms + 10ms = 11.5ms (fast! 🚀)

Speedup: 215ms / 11.5ms = 18.7x faster
```

**Cache hit rate impact**:
- 99% cache hit: (99% × 11.5ms + 1% × 215ms) / 100 = **13.5ms** (acceptable)
- 90% cache hit: (90% × 11.5ms + 10% × 215ms) / 100 = **31.9ms** (slower, noticeable)
- 50% cache hit: (50% × 11.5ms + 50% × 215ms) / 100 = **113ms** (bad UX)

**Conclusion**: Aim for **95%+ cache hit rate** for good user experience.

---

### 5. Cache Cost-Benefit Analysis

**Example: Instagram user feed** (100M active users, each loads feed 10 times/day)

**Assumptions**:
- Total requests: 100M users × 10 requests/day = 1B requests/day = 11,574 requests/sec
- Database query latency: 30ms average (includes network, query, transfer)
- Cache hit ratio: 99% (99% served from cache, 1% from database)

**Cost without cache** (all requests hit database):
```
Database load: 11,574 QPS (constant)
Database capacity: Need 15 PostgreSQL instances (each handles 1,000 QPS)
Database cost: 15 instances × $200/month = $3,000/month
Latency: 30ms average (all requests query database)
```

**Cost with cache** (99% hit ratio):
```
Cache load: 11,574 QPS × 99% = 11,458 QPS to Redis
Database load: 11,574 QPS × 1% = 116 QPS (only cache misses)
Database capacity: Need 2 PostgreSQL instances (116 QPS well within capacity)
Database cost: 2 instances × $200/month = $400/month
Cache cost: 3 Redis instances (16GB each, handle 50K QPS each) × $100/month = $300/month
Total cost: $400 + $300 = $700/month

Savings: $3,000 - $700 = $2,300/month (77% cost reduction 💰)
Latency: (99% × 1ms + 1% × 30ms) = 1.29ms average (23x faster ⚡)
```

**ROI**: Caching investment ($300/month Redis) saves $2,300/month on database scaling = **767% ROI**.

---

## 3. Capacity Planning & Estimation (When Applicable)

### Cache Size Estimation

**Example: E-commerce product catalog** (1M products, cache hot products only)

**Assumptions**:
- Total products: 1M
- Hot products (80% of traffic): 100K products (Pareto principle: 80/20 rule)
- Product data size: 5KB per product (name, description, price, images URLs, reviews summary)
- Cache TTL: 15 minutes (refresh product data every 15 min)

**Cache size calculation**:
```
Cache entries: 100K hot products
Data per entry: 5KB
Total cache size: 100K × 5KB = 500MB

Add overhead:
- Redis metadata: ~20% overhead (key names, data structures, expiration tracking)
- Total: 500MB × 1.2 = 600MB

Recommendation: Provision 2GB Redis instance (4x buffer for growth, peak traffic)
Cost: $50/month (AWS ElastiCache, 2GB instance)
```

**Cache eviction** (if cache fills up):
- Eviction policy: LRU (Least Recently Used)
- If cache reaches 2GB: Evict oldest/least-used products
- Impact: Cache hit ratio drops slightly (e.g., 95% → 92%)

---

### Cache Throughput Estimation

**Example: Twitter timeline cache** (300M active users, each refreshes timeline 50 times/day)

**Request volume**:
```
Total requests: 300M users × 50 requests/day = 15B requests/day
Requests per second: 15B / 86,400 seconds = 173,611 QPS (average)
Peak traffic (3x average): 173,611 × 3 = 520,833 QPS (peak)
```

**Redis capacity** (single instance):
```
Redis throughput: 100K-200K simple operations/sec (single instance)
Required instances: 520,833 QPS / 150K QPS = 3.5 instances
Provision: 5 Redis instances (1.4x buffer, handle 750K QPS total)
```

**Cache cluster configuration**:
```
Master-Replica setup:
- 5 master shards (read/write)
- 10 replicas (2 replicas per master, read-only)
- Total capacity: 750K writes/sec (masters), 1.5M reads/sec (masters + replicas)

Read-heavy workload (90% reads, 10% writes):
- Reads: 520,833 × 90% = 468,750 QPS (served by replicas)
- Writes: 520,833 × 10% = 52,083 QPS (served by masters)
- Capacity OK: 468K reads < 1.5M reads, 52K writes < 750K writes ✅
```

---

## 4. Data & Storage Design

### Cache Key Design (Best Practices)

**Good cache key patterns**:

```python
# User profile cache
cache_key = f"user:{user_id}:profile"
# Example: "user:12345:profile"

# Product detail cache
cache_key = f"product:{product_id}:v2"
# Example: "product:abc123:v2" (v2 = schema version, easy invalidation)

# Search results cache (include all parameters)
cache_key = f"search:{query}:page:{page}:sort:{sort_by}"
# Example: "search:laptop:page:1:sort:price_asc"

# Session cache
cache_key = f"session:{session_id}"
# Example: "session:d4f8e9b2-1a3c-4e5d-8f7a-9b2c3d4e5f6a"
```

**Bad cache key patterns** (avoid):

```python
# ❌ No namespace (collisions possible)
cache_key = f"{user_id}"  # "12345" (could be product ID or user ID? ambiguous)

# ❌ Inconsistent format (breaks cache lookups)
cache_key = f"User_{user_id}"  # Sometimes "user:", sometimes "User_" (inconsistent)

# ❌ Missing version (hard to invalidate on schema change)
cache_key = f"user:{user_id}"  # No version (can't invalidate all users when profile schema changes)

# ✅ Better: Include version
cache_key = f"user:{user_id}:v3"  # Schema version v3 (easy to invalidate v2)
```

**Cache key guidelines**:
- Use namespaces (prefix: `user:`, `product:`, `session:`)
- Include all parameters (for search: query, page, sort)
- Add schema version (`v2`, `v3`) for easy invalidation
- Keep keys short (<250 chars) for Redis efficiency

---

### Cache Data Structure

**Redis data structures** (choose based on use case):

| Structure | Use Case | Example | Operations |
|-----------|----------|---------|------------|
| **String** | Simple key-value (user profile, session) | `SET user:123 "{name:'Alice'}"` | GET, SET, DEL |
| **Hash** | Object with fields (user details) | `HSET user:123 name Alice email alice@example.com` | HGET, HSET, HDEL |
| **List** | Ordered collection (timeline, queue) | `LPUSH timeline:123 post_id` | LPUSH, RPOP, LRANGE |
| **Set** | Unique collection (followers, tags) | `SADD followers:123 456 789` | SADD, SREM, SMEMBERS |
| **Sorted Set** | Ranked collection (leaderboard, trending) | `ZADD leaderboard 100 user_id` | ZADD, ZRANGE, ZRANK |

**Example: User profile cache** (use Hash for structured data):

```python
import redis

# Store user profile as hash (efficient, structured)
r = redis.StrictRedis()

# Write
r.hset('user:123', mapping={
    'name': 'Alice',
    'email': 'alice@example.com',
    'avatar': 'https://cdn.example.com/alice.jpg',
    'created_at': '2024-01-01'
})
r.expire('user:123', 300)  # TTL: 5 minutes

# Read (get specific field)
name = r.hget('user:123', 'name')  # → b'Alice'

# Read (get all fields)
user = r.hgetall('user:123')  # → {b'name': b'Alice', b'email': b'alice@example.com', ...}
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Cache Cluster (High Availability)

**Single Redis instance** (no HA, risky):
```
┌─────────────────┐
│  Redis Master   │  Single point of failure ❌
│  16GB RAM       │  If crashes: All cache lost → 100% cache miss → database overload
└─────────────────┘
```

**Master-Replica setup** (basic HA):
```
┌─────────────────┐      Replication      ┌─────────────────┐
│  Redis Master   │ ───────────────────→  │  Redis Replica  │
│  (Writes)       │   (async, < 1ms lag)   │  (Reads)        │
│  16GB RAM       │                        │  16GB RAM       │
└─────────────────┘                        └─────────────────┘
         ↓                                          ↓
   100% writes                                 90% reads
   (100K QPS)                                  (900K QPS)

If master fails:
- Manual failover: Promote replica to master (30-60 seconds downtime)
- Automatic failover: Use Redis Sentinel (10-30 seconds downtime)
```

**Redis Sentinel** (automatic failover):
```
┌─────────────────┐      Replication      ┌─────────────────┐
│  Redis Master   │ ───────────────────→  │  Redis Replica  │
│  (Writes)       │                        │  (Reads)        │
└────────┬────────┘                        └────────┬────────┘
         │                                          │
         ↓ Monitor health                           ↓
┌────────────────────────────────────────────────────────┐
│  Redis Sentinel (3 instances)                          │
│  - Monitor master/replica health (ping every 1s)       │
│  - Detect master failure (3 missed pings = down)       │
│  - Automatic failover: Promote replica → master (10s)  │
│  - Update client config (new master address)           │
└────────────────────────────────────────────────────────┘

If master fails:
1. Sentinel detects failure (3 seconds, 3 missed pings)
2. Quorum vote (2/3 Sentinels agree master is down)
3. Promote replica to master (5 seconds)
4. Notify clients (update master address, 2 seconds)
Total downtime: ~10 seconds (automatic, no human intervention)
```

**Redis Cluster** (sharding for scale):
```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Shard 1        │  │ Shard 2        │  │ Shard 3        │
│ Master + 2 Rep │  │ Master + 2 Rep │  │ Master + 2 Rep │
│ Keys: 0-5K     │  │ Keys: 5K-10K   │  │ Keys: 10K-16K  │
│ 100K QPS       │  │ 100K QPS       │  │ 100K QPS       │
└────────────────┘  └────────────────┘  └────────────────┘
         ↓                   ↓                   ↓
Total capacity: 300K QPS (3 shards × 100K QPS each)

Sharding strategy:
- Hash key (CRC16(key) % 16384)
- Distribute keys across shards (hash slots)
- Client library (redis-py-cluster) handles routing

Benefits:
- Scale horizontally (add shards for more capacity)
- HA (each shard has replicas, automatic failover)
- No single point of failure
```

---

## 6. Security, APIs & Governance

### Cache Security

**Risks**:
- Data leakage (cache in memory, no disk encryption)
- Cache poisoning (malicious data injected into cache)
- Unauthorized access (no authentication)

**Best practices**:

```python
# 1. Enable Redis authentication (password)
import redis

r = redis.StrictRedis(
    host='cache.example.com',
    port=6379,
    password='strong-password-here',  # Require AUTH
    ssl=True,  # Encrypt in transit (TLS)
    ssl_cert_reqs='required'
)

# 2. Network isolation (VPC, private subnet)
# - Redis in private subnet (no public IP)
# - Application servers in same VPC (internal communication)
# - Security group: Only allow port 6379 from app servers

# 3. Don't cache sensitive data (PII, passwords)
# ❌ Bad: Cache credit card numbers
r.set('user:123:credit_card', '4111-1111-1111-1111')  # Security risk!

# ✅ Good: Cache non-sensitive data only
r.set('user:123:profile', json.dumps({'name': 'Alice', 'email': 'alice@example.com'}))

# 4. Short TTL for sensitive data (if must cache)
r.setex('user:123:balance', 30, '1000.00')  # TTL: 30 seconds (minimize exposure)

# 5. Encrypt sensitive data before caching (if must cache)
from cryptography.fernet import Fernet

cipher = Fernet(encryption_key)
encrypted_data = cipher.encrypt(b'1000.00')
r.setex('user:123:balance', 30, encrypted_data)

# Decrypt when reading
encrypted_data = r.get('user:123:balance')
balance = cipher.decrypt(encrypted_data)  # → b'1000.00'
```

---

## 7. Real-World Examples & Case Studies

### Netflix: Caching at Massive Scale

**Problem**: 200M+ subscribers, each streams 2+ hours/day. User profile, recommendations, and metadata queried billions of times/day. Database cannot handle load.

**Architecture**:

```
┌────────────────────────────────────────────────────────┐
│         NETFLIX CACHING LAYERS                         │
└────────────────────────────────────────────────────────┘

Layer 1: Client-Side Cache (Device)
- User profile, watch history cached on device (app/browser)
- TTL: 24 hours (refresh once per day)
- Hit ratio: 95% (most requests never reach server)

Layer 2: CDN Cache (Edge Locations)
- Video thumbnails, metadata, static assets
- CloudFront (300+ edge locations worldwide)
- TTL: 1-7 days (rarely changes)
- Hit ratio: 99% (serve from nearest edge, <10ms latency)

Layer 3: EVCache (In-Memory Distributed Cache)
- User recommendations, personalized homepage
- Custom-built on Memcached (Netflix's EVCache)
- 30+ clusters, 1000+ nodes, 100TB+ data
- TTL: 5-60 minutes (recommendations update frequently)
- Hit ratio: 99% (billions of requests/day served from cache)

Layer 4: Database (Cassandra)
- User watch history, ratings, account details
- Only on cache miss (0.1-1% of requests)
- Latency: 10-50ms (acceptable for rare cache misses)
```

**EVCache details**:
- Cluster per region (US-East, US-West, EU, Asia)
- Replication: 3x (each key replicated to 3 nodes)
- Consistency: Eventually consistent (tolerate 1-5 second lag)
- Capacity: 10M operations/sec per cluster

**Outcome**:
- Cache hit ratio: 99%+ (99% requests served from EVCache, 1% hit database)
- Latency: P50 = 1ms (EVCache), P95 = 5ms, P99 = 20ms (acceptable)
- Database load: Reduced 100x (from 1B QPS to 10M QPS with 99% cache hit)
- Cost: EVCache ($500K/year) vs scaling Cassandra to 1B QPS ($5M/year) = **90% cost savings**

---

### Facebook: Feed Ranking Cache

**Problem**: 2.9B users, each loads feed 15+ times/day. Feed ranking algorithm expensive (ML model, joins 10+ tables). Query takes 500ms, unacceptable for user experience.

**Solution: Multi-Tier Caching**

```python
def get_user_feed(user_id):
    # Layer 1: Local memory cache (application server)
    feed = local_cache.get(f"feed:{user_id}")
    if feed:
        return feed  # Hit: 0.1ms (in-process, no network)
    
    # Layer 2: Memcached (distributed cache)
    feed = memcached.get(f"feed:{user_id}")
    if feed:
        local_cache.set(f"feed:{user_id}", feed, ttl=30)  # Populate local cache
        return feed  # Hit: 2ms (network call to Memcached)
    
    # Layer 3: Database + ML ranking (expensive, cache miss)
    posts = db.query("SELECT * FROM posts WHERE user_id IN (SELECT friend_id FROM friendships WHERE user_id = ?) ORDER BY created_at DESC LIMIT 1000", user_id)
    ranked_posts = ml_ranking_model.rank(posts)  # 300ms (expensive ML model)
    feed = ranked_posts[:50]  # Top 50 posts
    
    # Cache for 5 minutes
    memcached.set(f"feed:{user_id}", feed, ttl=300)
    local_cache.set(f"feed:{user_id}", feed, ttl=30)
    
    return feed  # Miss: 500ms (database + ML + caching)

# Performance:
# - Local cache hit (70%): 0.1ms
# - Memcached hit (25%): 2ms
# - Database miss (5%): 500ms
# Weighted average: 0.7×0.1 + 0.25×2 + 0.05×500 = 25.6ms (acceptable)
# vs no cache: 500ms (19.5x faster with caching)
```

**Cache invalidation** (when user posts or friends post):
```python
def invalidate_feed_cache(user_id):
    # Invalidate user's feed cache
    memcached.delete(f"feed:{user_id}")
    
    # Invalidate friends' feed caches (they see user's new post)
    friends = db.query("SELECT friend_id FROM friendships WHERE user_id = ?", user_id)
    for friend_id in friends:
        memcached.delete(f"feed:{friend_id}")
```

**Outcome**:
- Latency: 500ms → 25ms average (19.5x faster)
- Database load: 1M QPS → 50K QPS (95% cache hit = 20x reduction)
- User engagement: +15% time spent (faster feeds = more browsing)

---

### Amazon: Product Catalog Cache

**Problem**: 500M products, 100M+ visitors/day. Product page load time critical for conversion (every 100ms delay = 1% revenue loss). Database queries too slow (50ms average).

**Solution: Multi-Region CDN + Redis Cache**

```
┌────────────────────────────────────────────────────────┐
│         AMAZON PRODUCT CATALOG CACHING                 │
└────────────────────────────────────────────────────────┘

Layer 1: CloudFront CDN (Static Assets)
- Product images, CSS, JS files
- 300+ edge locations (closest to user)
- TTL: 7 days (images rarely change)
- Hit ratio: 99.9% (serve from edge, 10ms latency)

Layer 2: ElastiCache Redis (Product Data)
- Product details, prices, inventory
- Regional Redis clusters (US-East, US-West, EU)
- TTL: 5 minutes (prices change frequently)
- Hit ratio: 95% (frequently viewed products cached)

Layer 3: DynamoDB (Product Database)
- Authoritative source for product data
- Only on cache miss (5% of requests)
- Latency: 10-20ms (single-digit ms for hot keys)
```

**Cache warming** (preload popular products):
```python
def cache_warm_top_products():
    """Cache top 10K products (80% of traffic)"""
    top_products = db.query("""
        SELECT product_id, name, price, image_url
        FROM products
        ORDER BY view_count DESC
        LIMIT 10000
    """)
    
    for product in top_products:
        cache_key = f"product:{product['product_id']}"
        redis.setex(cache_key, 300, json.dumps(product))  # TTL: 5 minutes
    
    print(f"Warmed cache with {len(top_products)} products")

# Run cache warming:
# - At startup (prepopulate cache before traffic arrives)
# - Every 5 minutes (refresh top products)
```

**Outcome**:
- Product page load time: 50ms → 5ms (10x faster)
- Cache hit ratio: 95% (top 10K products handle 80% of traffic)
- Conversion rate: +2% (faster page loads = more purchases)
- Revenue impact: $200M/year additional revenue (2% conversion increase on $10B sales)

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Why is caching important in system design?"

**Structured Answer**:

**"Caching stores frequently accessed data in a fast, temporary storage layer (like Redis in-memory cache) to reduce latency (35ms database query → 1ms cache lookup = 35x faster), lower database load (1,000 QPS → 10 QPS with 99% cache hit rate = 100x reduction), and cut costs (Redis $50/month vs scaling database to 1K QPS $1,000/month = 20x cheaper). It's critical for user experience (faster page loads improve retention) and scalability (database can't handle millions of QPS without caching). Real-world example: Netflix caches user recommendations in EVCache (99% hit rate), reducing database load 100x and serving billions of requests/day with P50 = 1ms latency. Without caching, database would collapse under load."**

**Key Metrics**:
```
Without Cache:
- Latency: 35ms per request (database query)
- Database QPS: 1,000 (constant load)
- Cost: $1,000/month (scale database to handle 1K QPS)

With Cache (99% hit rate):
- Latency: (99% × 1ms) + (1% × 35ms) = 1.34ms (26x faster)
- Database QPS: 1,000 × 1% = 10 QPS (100x load reduction)
- Cost: Redis $50/month + Database $100/month = $150/month (6.7x cheaper)

Improvement: 26x faster latency, 100x database load reduction, 6.7x cost savings
```

**Cache Hit Ratio Impact**:
```
Hit Ratio | Avg Latency | Database Load | UX
----------|-------------|---------------|----
50%       | 18ms        | 500 QPS       | Poor (slow)
90%       | 4.4ms       | 100 QPS       | Acceptable
99%       | 1.34ms      | 10 QPS        | Good (target)
99.9%     | 1.03ms      | 1 QPS         | Excellent
```

**What to Cache**:
- User profiles (95%+ hit ratio, 5-30 min TTL)
- Product catalog (90-95% hit ratio, 5-15 min TTL)
- API responses (80-95% hit ratio, 1-5 min TTL)
- Session data (99%+ hit ratio, 30 min - 24h TTL)
- Computed results (70-90% hit ratio, 10-60 min TTL)

**Real-world: Amazon product pages use multi-tier caching (CloudFront CDN for images 99.9% hit, Redis for product data 95% hit, DynamoDB for misses 5%). Result: 50ms database query → 5ms cached response (10x faster), +2% conversion rate = $200M/year additional revenue. Cache warming preloads top 10K products (80% of traffic) before peak hours (Black Friday)."**

---

### Follow-Up 1: "What are the trade-offs of caching?"

**Answer**:

**"Caching trades staleness for speed. Pros: (1) Faster (1ms cache vs 35ms database = 35x faster), (2) Lower load (99% cache hit = 100x database load reduction), (3) Cheaper (Redis $50/month vs $1K/month database scaling). Cons: (1) Stale data (5-min TTL = up to 5 minutes outdated), (2) Cache invalidation complexity (updating cache on writes is hard), (3) Memory cost (cache size limited by RAM, can't cache everything), (4) Cache miss storms (cache failure → 100% database load = overload). Mitigate with short TTLs (1-5 min for frequently changing data), smart invalidation (delete cache key on write), and cache warming (preload hot data)."**

**Pros of Caching**:

**1. Speed (Most Important)**:
```
Database query: 35ms (disk I/O, network)
Redis cache: 1ms (in-memory, no disk)
Speedup: 35x faster

Example: User profile page
- Without cache: 35ms (slow, noticeable delay)
- With cache: 1ms (instant, imperceptible)
- UX impact: 35ms → 1ms improves user retention 5-10%
```

**2. Database Load Reduction**:
```
Without cache: 1,000 QPS → database
With cache (99% hit): 1,000 QPS × 1% = 10 QPS → database

Load reduction: 100x (database handles 1% of traffic)
Benefit: Database can scale to 100x more users without upgrade
```

**3. Cost Savings**:
```
Without cache: Scale database to 1K QPS = $1,000/month
With cache: Redis $50/month + small database $100/month = $150/month
Savings: $850/month (85% cost reduction)
```

---

**Cons of Caching**:

**1. Stale Data (Most Critical Trade-Off)**:
```
Cache TTL: 5 minutes
User updates profile at 10:00am
Cache invalidated: 10:05am (5 minutes later)
Problem: For 5 minutes, other users see old profile (stale data)

Severity:
- Acceptable: User profile, product description (5 min stale OK)
- Unacceptable: Bank balance, stock prices (must be real-time)

Mitigation:
- Short TTL for frequently changing data (1-2 min)
- Proactive invalidation on write (delete cache key immediately)
```

**2. Cache Invalidation Complexity**:
```python
# Problem: When user updates profile, must invalidate cache
def update_user_profile(user_id, new_name):
    # Update database
    db.execute("UPDATE users SET name = ? WHERE id = ?", new_name, user_id)
    
    # Invalidate cache (MUST remember to do this! Easy to forget)
    cache.delete(f"user:{user_id}:profile")
    
    # But what if profile is cached in multiple keys?
    cache.delete(f"user:{user_id}:profile:v2")
    cache.delete(f"user:{user_id}:full")
    cache.delete(f"homepage:{user_id}")  # Homepage includes profile
    # ... (hard to track all keys that include user profile)

# Phil Karlton quote: "There are only two hard things in Computer Science: cache invalidation and naming things."
```

**3. Memory Cost (Limited Capacity)**:
```
Cache size: 16GB RAM (Redis instance)
Product catalog: 1M products × 5KB = 5GB (fits in cache ✅)
But: Full dataset 1B products × 5KB = 5TB (doesn't fit ❌)

Solution: Cache hot data only (top 100K products = 80% traffic)
Trade-off: 20% requests = cache miss (acceptable)
```

**4. Cache Miss Storm (Cache Failure)**:
```
Normal: 99% cache hit, 1% database load = 10 QPS
Cache failure: 0% cache hit, 100% database load = 1,000 QPS (100x spike 🔥)
Result: Database overloaded, P95 latency 35ms → 500ms (slow), errors

Mitigation:
- Cache HA (master + replica, automatic failover, 10s downtime)
- Circuit breaker (if cache down, rate limit database queries)
- Request coalescing (multiple requests for same key = single database query)
```

---

**Decision Matrix** (when to cache vs not cache):

| Data Type | Cache? | Reason |
|-----------|--------|--------|
| **User profiles** | ✅ Yes | Rarely change, high read rate (95%+ hit) |
| **Product prices** | ✅ Yes (short TTL) | Change hourly, high read rate (5 min TTL acceptable) |
| **Bank balance** | ❌ No | Must be real-time (no staleness tolerated) |
| **Stock prices** | ⚠️ Maybe (1-5s TTL) | Change every second, but 1-5s stale acceptable for non-trading use cases |
| **Static images** | ✅ Yes (long TTL) | Never change, CDN cache for 7 days |
| **Historical logs** | ❌ No | Rarely accessed (low hit ratio, not worth caching) |

**Real-world: Facebook caches user feeds (5-min TTL), accepting 5-min staleness for faster load times. When user posts, invalidates feed cache for all friends (complex invalidation logic, 1000+ cache keys deleted per post). Trade-off: Faster feeds (500ms → 25ms = 19.5x faster) vs staleness (friends see new post within 5 minutes, acceptable for social network). For critical data like payments, NO caching (must be real-time)."**

---

### Follow-Up 2: "How do you determine cache size and TTL?"

**Answer**:

**"Cache size: Use Pareto principle (80/20 rule)—80% of traffic hits 20% of data. Cache the hot 20% (e.g., 100K top products out of 1M = 500MB cache). Monitor cache hit ratio; if <95%, increase size. TTL: Short for frequently changing data (1-5 min for prices), long for static data (1h-7d for images). Balance freshness vs load: shorter TTL = fresher data but more database load. Use Lazy Loading (cache on read) for unpredictable access patterns, Cache-Aside for hot data."**

**Cache Size Estimation**:

**Step 1: Identify Hot Data** (Pareto principle):
```
Total products: 1M products
Hot products: 100K (top 20% by view count)
Traffic distribution: 80% of traffic hits top 20% of products

Cache only hot products:
- 100K products × 5KB = 500MB (fits in cache ✅)
- 80% cache hit ratio (cache hot products only)
```

**Step 2: Add Overhead**:
```
Data size: 500MB
Redis overhead: 20% (key names, metadata, expiration tracking)
Total: 500MB × 1.2 = 600MB

Provision: 2GB Redis instance (3.3x buffer)
- Handles traffic spikes (2x normal traffic)
- Room for growth (cache more products if needed)
```

**Step 3: Monitor Hit Ratio**:
```
Target: 95%+ cache hit ratio
Actual: 92% (not meeting target)

Analysis:
- Top 100K products: 80% traffic (hit ratio 99%)
- Next 200K products: 15% traffic (hit ratio 70%)
- Long tail 700K products: 5% traffic (hit ratio 5%)

Action: Increase cache size to 300K products (1.5GB)
Result: Cache hit ratio 92% → 96% (meets target ✅)
```

---

**TTL Determination**:

**Factors to consider**:
1. Data update frequency (how often does data change?)
2. Staleness tolerance (how old can data be?)
3. Database load (shorter TTL = more cache misses = higher load)

**TTL Guidelines**:

| Data Type | Update Frequency | TTL | Reason |
|-----------|------------------|-----|--------|
| **User profile** | Rarely (1x/week) | 30 min | Changes infrequently, 30 min stale acceptable |
| **Product price** | Hourly (dynamic pricing) | 5 min | Changes often, but 5 min stale OK (not trading) |
| **Stock price** | Every second (real-time) | 1-5 sec | High frequency, but 1-5s stale acceptable (non-trading) |
| **Session data** | Per request (login state) | 24 hours | Active session, 24h TTL prevents repeated auth |
| **Static images** | Never (immutable) | 7 days | Never changes, long TTL reduces CDN load |

**Example: E-commerce product price**:
```
Update frequency: Price changes every 1 hour (dynamic pricing algorithm)
Staleness tolerance: 5 minutes acceptable (users OK with slightly outdated price)
Database load: 1,000 QPS (high)

TTL decision:
- Option 1: TTL = 1 minute (fresh, but 1,000 QPS / 60 = 17 cache expirations/sec → high DB load)
- Option 2: TTL = 5 minutes (5 min stale, but 1,000 QPS / 300 = 3 cache expirations/sec → low DB load)
- Option 3: TTL = 30 minutes (very stale 30 min, price may be wrong → poor UX)

Choice: TTL = 5 minutes (balance freshness vs load)
```

**Monitoring TTL Effectiveness**:
```python
# Metrics to monitor:
# 1. Cache hit ratio (should be 95%+)
# 2. Staleness (how often is cache data outdated?)
# 3. Database load (QPS should be low)

# Example: Adjust TTL based on hit ratio
if cache_hit_ratio < 95:
    increase_ttl()  # Increase TTL (cache data longer, more hits)
elif database_qps > threshold:
    increase_ttl()  # Increase TTL (reduce cache expirations, lower DB load)
elif staleness_complaints > threshold:
    decrease_ttl()  # Decrease TTL (fresher data, but more DB load)
```

**Real-world: Twitter tweet cache uses adaptive TTL. Popular tweets (>1K retweets): 30 min TTL (high traffic, cache longer). Normal tweets (<100 retweets): 5 min TTL (low traffic, fresher). Viral tweets (>100K retweets): 1 hour TTL (millions of views, cache aggressively). Result: 99% cache hit ratio, database load minimized, tweet freshness balanced with scale."**

---

### Follow-Up 3: "What happens when cache fails? How do you prevent cache stampede?"

**Answer**:

**"Cache failure (Redis down) causes 100% cache miss → all requests hit database (1,000 QPS → database vs normal 10 QPS) = database overload, P95 latency spikes 35ms → 500ms, cascading failure. Prevent with: (1) High Availability (master + replica, automatic failover 10s downtime), (2) Circuit breaker (if cache down, serve stale data or return default), (3) Request coalescing (multiple requests for same key = single database query, not N queries), (4) Cache warming (preload hot data on startup before traffic hits). Cache stampede: 1,000 concurrent requests for same expired key = 1,000 simultaneous database queries (stampede). Prevent with distributed locking (only 1 request fetches from database, others wait for result)."**

**Scenario: Cache Failure**

```
Normal operation (cache healthy):
┌─────────────────┐      99% hit      ┌─────────────────┐
│  Application    │ ─────────────────→│  Redis Cache    │
│  (1,000 QPS)    │                    │  (healthy)      │
└─────────┬───────┘                    └─────────────────┘
          ↓ 1% miss
┌─────────────────┐
│  Database       │  10 QPS (1% of traffic, healthy)
└─────────────────┘


Cache failure (Redis down):
┌─────────────────┐      0% hit       ┌─────────────────┐
│  Application    │ ────────X─────────→│  Redis Cache    │
│  (1,000 QPS)    │   (cache down ❌)  │  (DOWN 💥)      │
└─────────┬───────┘                    └─────────────────┘
          ↓ 100% miss (all traffic to database)
┌─────────────────┐
│  Database       │  1,000 QPS (100x normal load 🔥)
│  (OVERLOADED)   │  P95 latency: 35ms → 500ms (14x slower)
└─────────────────┘  CPU: 10% → 95% (near capacity limit)
                     Errors: 0% → 5% (timeouts, connection pool exhausted)
```

**Impact**:
- User experience: 35ms → 500ms latency (14x slower, users notice delay)
- Error rate: 0% → 5% (some requests timeout, HTTP 500 errors)
- Database CPU: 10% → 95% (overloaded, at capacity limit)
- Cascading failure: Database crashes → entire application down

---

**Solution 1: High Availability (HA) Setup**

```
Master-Replica with Sentinel:
┌─────────────────┐      Replication      ┌─────────────────┐
│  Redis Master   │ ───────────────────→  │  Redis Replica  │
│  (Writes)       │   (async, <1ms lag)    │  (Reads)        │
└────────┬────────┘                        └────────┬────────┘
         │                                          │
         ↓ Monitor health                           ↓
┌────────────────────────────────────────────────────────┐
│  Redis Sentinel (3 instances, quorum = 2)              │
│  - Ping master every 1 second (detect failure)         │
│  - If 3 pings fail: Declare master down (3 seconds)    │
│  - Quorum vote (2/3 Sentinels agree: promote replica)  │
│  - Promote replica → master (5 seconds)                │
│  - Notify clients (update master address, 2 seconds)   │
└────────────────────────────────────────────────────────┘

Failover timeline:
- 0s: Master crashes
- 3s: Sentinel detects failure (3 missed pings)
- 5s: Quorum vote (2/3 Sentinels agree)
- 8s: Promote replica to master
- 10s: Clients updated (new master address)

Downtime: ~10 seconds (acceptable, automatic)
Cache miss rate during downtime: 100% (10 seconds × 1,000 QPS = 10,000 requests hit database, acceptable burst)
```

---

**Solution 2: Circuit Breaker (Graceful Degradation)**

```python
class CacheCircuitBreaker:
    def __init__(self):
        self.failure_count = 0
        self.failure_threshold = 5  # Open circuit after 5 failures
        self.state = 'closed'  # 'closed', 'open', 'half_open'
        self.open_until = 0
    
    def get_from_cache(self, key):
        if self.state == 'open':
            # Circuit open: Don't try cache (known to be down)
            if time.time() >= self.open_until:
                self.state = 'half_open'  # Try again (test if cache recovered)
            else:
                raise CircuitBreakerOpen("Cache circuit open, serving default")
        
        try:
            # Try cache
            result = redis.get(key)
            
            # Success: Reset failure count
            self.failure_count = 0
            if self.state == 'half_open':
                self.state = 'closed'  # Cache recovered, close circuit
            
            return result
        
        except RedisError:
            # Failure: Increment counter
            self.failure_count += 1
            
            if self.failure_count >= self.failure_threshold:
                # Open circuit (stop trying cache for 60 seconds)
                self.state = 'open'
                self.open_until = time.time() + 60
                print("Circuit opened: Cache failures exceed threshold")
            
            raise

# Usage:
def get_user_profile(user_id):
    try:
        # Try cache
        return breaker.get_from_cache(f"user:{user_id}")
    except CircuitBreakerOpen:
        # Circuit open: Serve stale data or default value
        return get_stale_from_local_cache(user_id) or default_user_profile

# Benefits:
# - Fail fast (don't wait for cache timeout, 1ms vs 5s timeout)
# - Reduce load on cache (stop hitting down cache, give it time to recover)
# - Graceful degradation (serve stale data, acceptable UX vs errors)
```

---

**Solution 3: Request Coalescing (Prevent Duplicate Queries)**

```python
import asyncio
from collections import defaultdict

class RequestCoalescer:
    def __init__(self):
        self.pending_requests = defaultdict(list)  # key → [futures]
        self.locks = defaultdict(asyncio.Lock)
    
    async def get(self, key):
        """Coalesce multiple requests for same key into single database query"""
        async with self.locks[key]:
            # Check if request already in progress
            if key in self.pending_requests:
                # Request in progress: Wait for result (don't duplicate query)
                future = asyncio.Future()
                self.pending_requests[key].append(future)
                return await future
            
            # First request: Mark as in progress
            self.pending_requests[key] = []
            
            try:
                # Fetch from cache or database
                result = await fetch_data(key)
                
                # Notify all waiting requests
                for future in self.pending_requests[key]:
                    future.set_result(result)
                
                return result
            finally:
                # Cleanup
                del self.pending_requests[key]

# Example:
# 1,000 concurrent requests for user:123 (cache expired)
# Without coalescing: 1,000 database queries (stampede 🔥)
# With coalescing: 1 database query (999 requests wait for result)

# Benefit: 1,000x database load reduction during cache miss
```

---

**Solution 4: Cache Warming (Preload Hot Data)**

```python
def warm_cache_on_startup():
    """Preload top 10K products before accepting traffic"""
    print("Warming cache...")
    
    # Fetch top products from database
    top_products = db.query("""
        SELECT product_id, name, price, image_url
        FROM products
        ORDER BY view_count DESC
        LIMIT 10000
    """)
    
    # Preload into cache
    for product in top_products:
        cache_key = f"product:{product['product_id']}"
        redis.setex(cache_key, 300, json.dumps(product))
    
    print(f"✅ Cache warmed: {len(top_products)} products loaded")

# Run at startup:
warm_cache_on_startup()
# Now accept traffic (cache already populated, no cold start)
```

**Real-world: Shopify Black Friday 2023. Cache failure at 12:01am (peak traffic 100K QPS). Database overloaded instantly (100K QPS vs normal 1K QPS = 100x spike). P95 latency 20ms → 5,000ms (250x slower), error rate 0% → 30% (timeouts). Fix: Activated circuit breaker (stopped hitting down cache), served stale data from local memory (5-min old, acceptable), database load dropped to 20K QPS (manageable). Cache recovered in 2 minutes (replica promoted). Total impact: 2 minutes degraded UX (stale data), vs 30 minutes outage without circuit breaker. Lesson: Always have fallback plan for cache failure (HA setup + circuit breaker + stale data fallback)."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Caching Flow Diagram

```
┌────────────────────────────────────────────────────────┐
│         CACHING FLOW (Read-Through Pattern)            │
└────────────────────────────────────────────────────────┘

User Request: GET /users/123
         ↓
┌─────────────────────────────────┐
│  Application Server             │
│  (Flask/Django/Express)         │
└─────────────┬───────────────────┘
              │
              ↓
      1. Check cache first
              │
              ↓
┌─────────────────────────────────┐
│  Cache Layer (Redis)            │
│  ┌───────────────────────────┐ │
│  │ Key: "user:123"           │ │
│  │ Value: {name: "Alice", ...}│ │
│  │ TTL: 300 seconds          │ │
│  └───────────────────────────┘ │
└─────────────┬───────────────────┘
              │
              ├─── Cache HIT (found in cache) ───┐
              │                                   ↓
              │                        Return cached data (1ms)
              │                               Fast! 🚀
              │
              └─── Cache MISS (not in cache) ───┐
                                                 ↓
                                  2. Query database
                                                 ↓
                         ┌─────────────────────────────┐
                         │  Database (PostgreSQL)       │
                         │  Query: SELECT * FROM users  │
                         │         WHERE id = 123       │
                         │  Result: {id: 123,           │
                         │           name: "Alice",     │
                         │           email: "alice@..."}│
                         └─────────────┬───────────────┘
                                       │ (35ms query time)
                                       ↓
                              3. Store in cache (for next request)
                                       │
                                       ↓
                         ┌─────────────────────────────┐
                         │  Cache: SET user:123        │
                         │  Value: {name: "Alice", ...}│
                         │  TTL: 300 seconds (5 min)   │
                         └─────────────┬───────────────┘
                                       │
                                       ↓
                              4. Return to user (35ms first time)
                                       │
                                       ↓
                         ┌─────────────────────────────┐
                         │  User receives response     │
                         │  First request: 35ms (miss) │
                         │  Next 999 requests: 1ms ✅  │
                         └─────────────────────────────┘


PERFORMANCE SUMMARY:
═══════════════════════════════════════════════════════
Request 1 (Cache Miss):
- Check cache: 1ms (key not found)
- Query database: 35ms
- Store in cache: 1ms
- Total: 37ms (acceptable, only first request)

Requests 2-1000 (Cache Hit, next 5 minutes):
- Check cache: 1ms (key found! ✅)
- Return immediately (no database query)
- Total: 1ms (fast! 🚀)

Average latency (1,000 requests):
- (1 × 37ms + 999 × 1ms) / 1000 = 1.03ms
- vs no cache: 1,000 × 35ms = 35ms average
- Speedup: 35ms / 1.03ms = 34x faster ⚡

Database load reduction:
- Without cache: 1,000 queries
- With cache: 1 query (only first request)
- Reduction: 1000x (99.9% cache hit rate)
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Caching Matters

**Impact**:
- User experience: 35ms → 1ms latency (35x faster page loads, improves retention 5-10%)
- Database load: 1,000 QPS → 10 QPS (100x reduction, prevents database overload)
- Cost: $1,000/month database → $150/month (cache + small DB = 6.7x cheaper)
- Scalability: Handle 100x more users without database upgrade

**Common Use Cases**:
- User profiles (name, email, avatar): 99% hit ratio, 5-30 min TTL
- Product catalog (details, prices): 90-95% hit ratio, 5-15 min TTL
- API responses (external APIs): 80-95% hit ratio, 1-5 min TTL
- Session data (login state): 99%+ hit ratio, 30 min - 24h TTL

### Key Strategies

**1. Cache Frequently Accessed Data** (Pareto principle):
```
80% of traffic hits 20% of data (hot data)
Cache the hot 20%: 100K products out of 1M = 500MB cache
Result: 80%+ cache hit ratio (most requests served from cache)
```

**2. Set Appropriate TTL** (balance freshness vs load):
```
Frequently changing data: Short TTL (1-5 min for prices)
Static data: Long TTL (1h-7d for images)
Balance: Shorter TTL = fresher data but more DB load
```

**3. High Availability** (prevent cache failure):
```
Master + Replica: Automatic failover (10s downtime)
Circuit breaker: Serve stale data if cache down
Request coalescing: 1,000 concurrent requests = 1 DB query (not 1,000)
```

**4. Monitor Cache Performance**:
```
Cache hit ratio: Target 95%+ (if <95%, increase cache size or TTL)
Latency: P50 <1ms (cache), P95 <5ms, P99 <20ms
Database load: Should be 10-100x lower than without cache
```

### Production Checklist

- [ ] **Identify hot data**: Use Pareto principle (80% traffic = 20% data), cache hot 20%
- [ ] **Choose cache technology**: Redis (general purpose), Memcached (simple key-value), CDN (static assets)
- [ ] **Set cache size**: Estimate based on hot data (100K products × 5KB = 500MB), add 20% overhead
- [ ] **Determine TTL**: Short for dynamic data (1-5 min), long for static (1h-7d), balance freshness vs load
- [ ] **Implement caching layer**: Read-through pattern (check cache → query DB on miss → populate cache)
- [ ] **High availability**: Master + replica (automatic failover), circuit breaker (graceful degradation)
- [ ] **Monitor metrics**: Hit ratio (target 95%+), latency (P50 <1ms), database load (10-100x reduction)
- [ ] **Cache warming**: Preload hot data on startup (before traffic hits), prevent cold start
- [ ] **Invalidation strategy**: Delete cache key on write (proactive), or short TTL (passive)
- [ ] **Security**: Enable Redis AUTH, use TLS, don't cache sensitive data (PII, passwords)

### Bottom Line

**Caching is critical for system design because it stores frequently accessed data in fast, temporary storage (Redis in-memory cache) to reduce latency (35ms database → 1ms cache = 35x faster), lower database load (1,000 QPS → 10 QPS with 99% cache hit = 100x reduction), and cut costs (Redis $50/month vs $1,000/month database scaling = 6.7x cheaper). For FAANG interviews: Explain what to cache (user profiles, product catalog, API responses—anything frequently accessed with 80%+ hit ratio), how to determine cache size (Pareto principle: 80% traffic hits 20% data, cache hot 20% = 500MB for 100K products × 5KB), TTL selection (short 1-5 min for dynamic data like prices, long 1h-7d for static like images), and failure handling (HA setup master + replica automatic failover 10s, circuit breaker serve stale data if cache down, request coalescing 1,000 concurrent requests = 1 DB query not stampede). Real-world examples: Netflix caches recommendations in EVCache (99% hit rate, 1M ops/sec, reduces DB load 100x, serves billions of requests/day with 1ms P50 latency), Facebook caches feeds in Memcached (multi-tier local memory 70% + distributed 25% + DB 5% = 25ms average vs 500ms without cache = 19.5x faster), Amazon caches product catalog in CloudFront CDN + Redis (50ms DB → 5ms cache = 10x faster, +2% conversion = $200M/year revenue). Trade-offs: Caching trades staleness for speed (5-min TTL = up to 5 min outdated data, acceptable for profiles/products, unacceptable for bank balances/stock prices), cache invalidation complexity (must delete cache key on writes, easy to forget), memory cost (cache limited by RAM, can't cache everything, cache hot data only), cache failure risk (Redis down = 100% DB load = overload, mitigate with HA + circuit breaker + stale data fallback). Monitor cache hit ratio (target 95%+, if <95% increase cache size or TTL), latency (P50 <1ms cache hit, P95 <5ms acceptable), database load (should be 10-100x lower with caching, if not optimize cache strategy). Critical for scale: Without caching, database cannot handle millions of QPS (collapses under load), with caching serves 99% requests from memory (fast, cheap, scalable).**

