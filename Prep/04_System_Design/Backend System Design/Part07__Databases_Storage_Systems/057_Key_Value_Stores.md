# 57. Key-Value Stores

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Key-Value Stores**: Simplest NoSQL database model where data stored as key-value pairs (like hash table)—optimized for high-speed lookups, caching, session management, and real-time applications requiring sub-millisecond latency at massive scale.

### Core Concept

**What it is:**
- **Simple data model**: Key (unique identifier) → Value (arbitrary data)
- **In-memory storage**: Data primarily in RAM for extreme speed (Redis, Memcached)
- **Persistent options**: Disk-backed for durability (DynamoDB, Redis with AOF/RDB)
- **Distributed**: Horizontally scalable across multiple nodes
- **Limited queries**: No complex queries, JOINs, or aggregations—only GET/SET/DELETE

**Why it exists:**
- **Speed**: Sub-millisecond latency (0.1-1ms typical) vs database queries (10-100ms)
- **Simplicity**: Minimal overhead, no schema, no query planning
- **Scalability**: Linear horizontal scaling via consistent hashing
- **Caching**: Reduce database load, speed up application responses
- **Real-time**: Handle millions of operations/second for hot data

**Simple analogy:**
- **Relational database**: Like a library with card catalog, Dewey Decimal System
  - Complex organization, powerful search, slower retrieval
- **Key-value store**: Like a coat check
  - Give ticket (key), get coat (value)
  - Instant retrieval, no complex lookups
  - Fast but simple

### Key Components

**1. Data Model**
```
Key: "user:1000:profile"
Value: {"name": "John", "email": "john@example.com", "age": 30}

Key: "session:abc123"
Value: "user_id=1000&expires=1234567890"

Key: "counter:page:views"
Value: 42153
```

**2. Operations**
- **GET**: Retrieve value by key (O(1) lookup)
- **SET**: Store/update key-value pair
- **DELETE**: Remove key-value pair
- **EXISTS**: Check if key exists
- **EXPIRE**: Set TTL (time-to-live) for auto-deletion

**3. Advanced Data Structures** (Redis)
- **Strings**: Simple key-value
- **Hashes**: Object with field-value pairs
- **Lists**: Ordered collection (queue, stack)
- **Sets**: Unordered unique values
- **Sorted Sets**: Ordered by score (leaderboards)
- **Bitmaps, HyperLogLog, Streams**

### Popular Key-Value Stores

**Redis (Remote Dictionary Server):**
- In-memory, disk-backed (optional)
- Rich data structures (lists, sets, sorted sets)
- Pub/Sub messaging
- Lua scripting
- Replication, clustering
- Use cases: Cache, session store, real-time analytics, leaderboards
- Speed: 100k-1M operations/second per node

**Amazon DynamoDB:**
- Fully managed, serverless
- SSD-backed, durable
- Automatic scaling
- Global tables (multi-region)
- Pay per request or provisioned capacity
- Use cases: Session store, user profiles, product catalogs
- Speed: Single-digit millisecond latency

**Memcached:**
- Pure in-memory cache
- Simple protocol, minimal features
- Multi-threaded (better CPU utilization than Redis)
- No persistence, no replication
- Use cases: Database query caching, page caching
- Speed: Sub-millisecond latency

### Why Key-Value Stores Matter

**Business Impact:**
- **Performance**: 10-100x faster than database queries
- **Cost**: Reduce database load (fewer expensive database servers)
- **Scale**: Handle millions of users with sub-second response times
- **Availability**: Replicated across regions for 99.99%+ uptime
- **User experience**: Instant page loads, real-time updates

**Role in interviews:**
- FAANG asks: "Design a caching layer for Twitter timeline"
- Performance questions: "How to reduce database load by 90%?"
- Scale questions: "Handle 1M requests/second for session lookup"
- Trade-off questions: "When to use Redis vs Memcached vs DynamoDB?"

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔴 Redis Deep Dive

#### Architecture and Internals

```
┌─────────────────────────────────────────────────────────────┐
│          REDIS ARCHITECTURE (Single Instance)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CLIENT CONNECTIONS                                 │    │
│  │  - TCP connections (port 6379)                      │    │
│  │  - Redis protocol (RESP)                            │    │
│  │  - Pipelining support (batch commands)              │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SINGLE-THREADED EVENT LOOP                         │    │
│  │  - One command at a time (no race conditions)       │    │
│  │  - Non-blocking I/O (epoll/kqueue)                  │    │
│  │  - Fast: All in-memory, no disk I/O per command     │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  IN-MEMORY DATA STRUCTURES                          │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  Hash Table (main keyspace)              │      │    │
│  │  │  - Key → RedisObject pointer             │      │    │
│  │  │  - O(1) lookup                           │      │    │
│  │  │  - Rehashing when size doubles           │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │  RedisObject Types:                                 │    │
│  │  - String: char array or long integer               │    │
│  │  - List: Linked list or ziplist (small)             │    │
│  │  - Hash: Hash table or ziplist (small)              │    │
│  │  - Set: Hash table or intset (small integers)       │    │
│  │  - Sorted Set: Skip list + hash table               │    │
│  │  - Stream: Radix tree + listpack                    │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  PERSISTENCE (Optional)                             │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  RDB (Redis Database Snapshot)           │      │    │
│  │  │  - Point-in-time snapshot                │      │    │
│  │  │  - Compact binary format                 │      │    │
│  │  │  - Fork process for background save      │      │    │
│  │  │  - Fast restart, smaller files           │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  AOF (Append-Only File)                  │      │    │
│  │  │  - Log every write command               │      │    │
│  │  │  - Better durability (fsync options)     │      │    │
│  │  │  - Larger files, slower restart          │      │    │
│  │  │  - AOF rewrite for compaction            │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Memory Management:                                          │
│  - maxmemory: Maximum memory limit                          │
│  - Eviction policies:                                       │
│    • noeviction: Return error when full                     │
│    • allkeys-lru: Evict least recently used (any key)       │
│    • volatile-lru: Evict LRU (keys with TTL only)           │
│    • allkeys-lfu: Evict least frequently used               │
│    • volatile-ttl: Evict soonest expiring keys              │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          REDIS CLUSTER (Distributed)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  HASH SLOT DISTRIBUTION                             │    │
│  │  - 16384 hash slots (0-16383)                       │    │
│  │  - CRC16(key) % 16384 → slot number                 │    │
│  │  - Slots distributed across master nodes            │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  MASTER NODES (3 minimum)                           │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  │  Master 1    │  │  Master 2    │  │  Master 3    │  │
│  │  │  Slots       │  │  Slots       │  │  Slots       │  │
│  │  │  0-5460      │  │  5461-10922  │  │  10923-16383 │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│  │         │                  │                  │          │
│  │         │ Async replication│                  │          │
│  │         ▼                  ▼                  ▼          │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  │  Replica 1   │  │  Replica 2   │  │  Replica 3   │  │
│  │  │  (Read-only) │  │  (Read-only) │  │  (Read-only) │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │
│  └────────────────────────────────────────────────────────┘│
│                                                              │
│  Failover:                                                   │
│  - Master 1 fails → Replica 1 promoted to master            │
│  - Automatic: Replicas detect master failure (gossip)       │
│  - Voting: Majority of masters vote for promotion           │
│  - Downtime: 1-2 seconds typical                            │
│                                                              │
│  Resharding:                                                 │
│  - Move slots from one master to another                    │
│  - Online operation (no downtime)                           │
│  - Example: Add Master 4 → Redistribute slots               │
│    Master 1: 0-4095    (25% of slots)                       │
│    Master 2: 4096-8191 (25% of slots)                       │
│    Master 3: 8192-12287 (25% of slots)                      │
│    Master 4: 12288-16383 (25% of slots)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Redis Sentinel (High Availability):
═══════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │Sentinel 1│      │Sentinel 2│      │Sentinel 3│          │
│  └────┬─────┘      └────┬─────┘      └────┬─────┘          │
│       │                 │                 │                 │
│       └─────────────────┼─────────────────┘                 │
│                         │ Monitor                           │
│                         ▼                                   │
│       ┌──────────────────────────────────┐                  │
│       │         Master Redis             │                  │
│       └────────────┬─────────────────────┘                  │
│                    │ Replication                            │
│          ┌─────────┴─────────┐                              │
│          ▼                   ▼                              │
│    ┌──────────┐        ┌──────────┐                        │
│    │ Replica 1│        │ Replica 2│                        │
│    └──────────┘        └──────────┘                        │
│                                                              │
│  Sentinel Functions:                                         │
│  1. Monitoring: Check master/replica health (PING)          │
│  2. Notification: Alert when instance fails                 │
│  3. Automatic failover: Promote replica to master           │
│  4. Configuration provider: Clients query Sentinel for      │
│     current master address                                  │
│                                                              │
│  Quorum: Minimum Sentinels to agree on failure (e.g., 2/3)  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Redis Data Structures and Use Cases

```python
# ═══════════════════════════════════════════════════════════
# Redis Advanced Patterns
# ═══════════════════════════════════════════════════════════

import redis
import json
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# ─────────────────────────────────────────────────────────
# 1. Caching with TTL (Time-To-Live)
# ─────────────────────────────────────────────────────────

def get_user_profile(user_id):
    """Cache database query results"""
    cache_key = f"user:{user_id}:profile"
    
    # Try cache first
    cached = r.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Cache miss: Query database
    user = query_database(f"SELECT * FROM users WHERE id={user_id}")
    
    # Store in cache with 1-hour TTL
    r.setex(cache_key, 3600, json.dumps(user))
    
    return user

# Cache-aside pattern:
# ✅ Application controls cache
# ✅ Database is source of truth
# ✅ TTL prevents stale data
# ⚠️ Cache misses hit database (thundering herd risk)

# ─────────────────────────────────────────────────────────
# 2. Session Management
# ─────────────────────────────────────────────────────────

def create_session(user_id):
    """Store user session with auto-expiration"""
    session_id = generate_uuid()
    session_data = {
        'user_id': user_id,
        'created_at': time.time(),
        'last_accessed': time.time()
    }
    
    # Store session with 30-minute TTL
    r.setex(f"session:{session_id}", 1800, json.dumps(session_data))
    
    return session_id

def get_session(session_id):
    """Retrieve and refresh session"""
    cache_key = f"session:{session_id}"
    session_data = r.get(cache_key)
    
    if not session_data:
        return None
    
    # Refresh TTL on access (sliding expiration)
    r.expire(cache_key, 1800)
    
    return json.loads(session_data)

# Benefits:
# ✅ Fast session lookup (no database query)
# ✅ Automatic cleanup (TTL expires old sessions)
# ✅ Horizontal scaling (stateless application servers)
# ✅ Shared sessions across servers

# ─────────────────────────────────────────────────────────
# 3. Rate Limiting (Sliding Window)
# ─────────────────────────────────────────────────────────

def rate_limit(user_id, max_requests=100, window_seconds=60):
    """
    Allow max_requests per window_seconds
    Sliding window counter using sorted set
    """
    key = f"rate_limit:{user_id}"
    now = time.time()
    window_start = now - window_seconds
    
    # Pipeline for atomic operations
    pipe = r.pipeline()
    
    # Remove old entries outside window
    pipe.zremrangebyscore(key, 0, window_start)
    
    # Count requests in current window
    pipe.zcard(key)
    
    # Add current request
    pipe.zadd(key, {str(now): now})
    
    # Set expiration (cleanup)
    pipe.expire(key, window_seconds + 10)
    
    results = pipe.execute()
    request_count = results[1]
    
    if request_count >= max_requests:
        return False, max_requests - request_count  # Rate limited
    
    return True, max_requests - request_count - 1  # Allowed

# Usage:
allowed, remaining = rate_limit('user:1000', max_requests=100, window_seconds=60)
if not allowed:
    return "Rate limit exceeded. Try again later."

# Sliding window benefits:
# ✅ Smooth rate limiting (no burst at window boundary)
# ✅ Accurate request counting
# ✅ Low memory (only stores timestamps in window)

# ─────────────────────────────────────────────────────────
# 4. Distributed Lock (Redlock Algorithm)
# ─────────────────────────────────────────────────────────

def acquire_lock(resource, token, ttl_ms=10000):
    """
    Acquire distributed lock with automatic release
    """
    lock_key = f"lock:{resource}"
    
    # SET with NX (only if not exists) and PX (expiration in ms)
    acquired = r.set(lock_key, token, nx=True, px=ttl_ms)
    
    return acquired

def release_lock(resource, token):
    """
    Release lock only if owned by this token (prevent releasing others' locks)
    """
    lock_key = f"lock:{resource}"
    
    # Lua script for atomic check-and-delete
    lua_script = """
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
    """
    
    return r.eval(lua_script, 1, lock_key, token)

# Usage:
import uuid

token = str(uuid.uuid4())
if acquire_lock('inventory:product:101', token, ttl_ms=5000):
    try:
        # Critical section: Update inventory
        current_stock = get_stock('product:101')
        if current_stock > 0:
            decrement_stock('product:101')
    finally:
        release_lock('inventory:product:101', token)

# Distributed lock properties:
# ✅ Safety: Only one client holds lock at a time
# ✅ Liveness: Lock auto-releases (TTL prevents deadlock)
# ✅ Fault tolerance: Works across Redis cluster
# ⚠️ Clock skew can cause issues (Redlock algorithm addresses this)

# ─────────────────────────────────────────────────────────
# 5. Leaderboard (Sorted Set)
# ─────────────────────────────────────────────────────────

def update_score(leaderboard, player_id, score):
    """Update player score in leaderboard"""
    r.zadd(leaderboard, {player_id: score})

def get_top_players(leaderboard, n=10):
    """Get top N players with scores"""
    # ZREVRANGE: Highest scores first
    return r.zrevrange(leaderboard, 0, n-1, withscores=True)

def get_player_rank(leaderboard, player_id):
    """Get player's rank (0-indexed)"""
    # ZREVRANK: Rank from highest to lowest
    rank = r.zrevrank(leaderboard, player_id)
    return rank + 1 if rank is not None else None

def get_players_around(leaderboard, player_id, context=5):
    """Get players around this player (5 above, 5 below)"""
    rank = r.zrevrank(leaderboard, player_id)
    if rank is None:
        return []
    
    start = max(0, rank - context)
    end = rank + context
    
    return r.zrevrange(leaderboard, start, end, withscores=True)

# Real-time leaderboard update:
update_score('game:leaderboard', 'player:1000', 15000)
update_score('game:leaderboard', 'player:2000', 22000)
update_score('game:leaderboard', 'player:3000', 18000)

# Query leaderboard:
top_10 = get_top_players('game:leaderboard', 10)
# [('player:2000', 22000.0), ('player:3000', 18000.0), ('player:1000', 15000.0)]

my_rank = get_player_rank('game:leaderboard', 'player:1000')
# 3

# Sorted set benefits:
# ✅ O(log N) insert/update
# ✅ O(log N + M) range query (M = result count)
# ✅ Real-time updates (no batch processing)
# ✅ Millions of players supported

# ─────────────────────────────────────────────────────────
# 6. Pub/Sub (Real-Time Messaging)
# ─────────────────────────────────────────────────────────

# Publisher:
def publish_notification(channel, message):
    """Publish message to channel"""
    r.publish(channel, json.dumps(message))

# Subscriber:
def subscribe_notifications(channels):
    """Subscribe to channels and process messages"""
    pubsub = r.pubsub()
    pubsub.subscribe(*channels)
    
    for message in pubsub.listen():
        if message['type'] == 'message':
            data = json.loads(message['data'])
            process_notification(data)

# Usage:
# Server 1 (publisher):
publish_notification('chat:room:123', {
    'user': 'Alice',
    'message': 'Hello everyone!',
    'timestamp': time.time()
})

# Server 2, 3, 4... (subscribers):
subscribe_notifications(['chat:room:123'])

# Pub/Sub characteristics:
# ✅ Real-time message delivery
# ✅ Broadcast to multiple subscribers
# ⚠️ Fire-and-forget (no message persistence)
# ⚠️ Subscribers miss messages while offline
# Use Redis Streams for persistent messaging

# ─────────────────────────────────────────────────────────
# 7. HyperLogLog (Cardinality Estimation)
# ─────────────────────────────────────────────────────────

def count_unique_visitors(page, user_id):
    """Count unique visitors with minimal memory"""
    key = f"unique_visitors:{page}"
    r.pfadd(key, user_id)

def get_unique_visitor_count(page):
    """Get approximate unique visitor count"""
    key = f"unique_visitors:{page}"
    return r.pfcount(key)

# Track visitors:
for user_id in range(1000000):
    count_unique_visitors('/home', f"user:{user_id}")

# Get count:
unique_count = get_unique_visitor_count('/home')
# ~1000000 (0.81% error rate)

# HyperLogLog benefits:
# ✅ Constant memory (12 KB per key)
# ✅ Count billions of unique items
# ✅ 0.81% standard error
# ⚠️ Approximate count (not exact)
# Use case: Unique visitors, unique IPs, unique events

# ─────────────────────────────────────────────────────────
# 8. Bitmap (Compact Boolean Storage)
# ─────────────────────────────────────────────────────────

def mark_user_online(user_id, date):
    """Mark user as active on date"""
    key = f"user:online:{date}"
    r.setbit(key, user_id, 1)

def is_user_online(user_id, date):
    """Check if user was active on date"""
    key = f"user:online:{date}"
    return r.getbit(key, user_id) == 1

def count_daily_active_users(date):
    """Count active users on date"""
    key = f"user:online:{date}"
    return r.bitcount(key)

def users_active_both_days(date1, date2):
    """Count users active on both dates"""
    key1 = f"user:online:{date1}"
    key2 = f"user:online:{date2}"
    result_key = f"user:online:both:{date1}:{date2}"
    
    # BITOP AND: Intersection
    r.bitop('AND', result_key, key1, key2)
    count = r.bitcount(result_key)
    r.delete(result_key)  # Cleanup
    
    return count

# Track 10M users:
for user_id in range(10000000):
    if random.random() > 0.3:  # 70% active
        mark_user_online(user_id, '2024-01-01')

# Count DAU:
dau = count_daily_active_users('2024-01-01')
# ~7,000,000

# Bitmap benefits:
# ✅ Extremely compact (1 bit per user)
# ✅ 10M users = 1.25 MB
# ✅ Fast bitwise operations (AND, OR, XOR)
# ✅ Count active users in milliseconds
```

---

### 💾 DynamoDB Deep Dive

#### Architecture and Data Model

```
┌─────────────────────────────────────────────────────────────┐
│          DYNAMODB ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CLIENT APPLICATION                                 │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  AWS SDK / DynamoDB Client                          │    │
│  │  - Automatic retries                                │    │
│  │  - Exponential backoff                              │    │
│  │  - Connection pooling                               │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  DYNAMODB TABLE                                     │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  Primary Key:                            │      │    │
│  │  │  - Partition Key (required)              │      │    │
│  │  │  - Sort Key (optional)                   │      │    │
│  │  │                                          │      │    │
│  │  │  Attributes:                             │      │    │
│  │  │  - Flexible schema (JSON-like)           │      │    │
│  │  │  - String, Number, Binary, Boolean       │      │    │
│  │  │  - List, Map, Set                        │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  PARTITIONS (Automatic Sharding)                    │    │
│  │  ┌──────────────────────────────────────────┐      │    │
│  │  │  Partition Criteria:                     │      │    │
│  │  │  - 10 GB max size                        │      │    │
│  │  │  - 3,000 RCU (Read Capacity Units) max   │      │    │
│  │  │  - 1,000 WCU (Write Capacity Units) max  │      │    │
│  │  │                                          │      │    │
│  │  │  When limit reached: Auto-split         │      │    │
│  │  └──────────────────────────────────────────┘      │    │
│  │                                                      │    │
│  │  Hash(Partition Key) → Partition Number             │    │
│  │                                                      │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │Partition │  │Partition │  │Partition │          │    │
│  │  │    1     │  │    2     │  │    3     │          │    │
│  │  │ 10 GB    │  │ 10 GB    │  │ 10 GB    │          │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │    │
│  │       │             │             │                 │    │
│  │       └─────────────┴─────────────┘                 │    │
│  │                     │                               │    │
│  │          3-way replication across AZs              │    │
│  │                     │                               │    │
│  │       ┌─────────────┼─────────────┐                 │    │
│  │       ▼             ▼             ▼                 │    │
│  │    [AZ-1]        [AZ-2]        [AZ-3]               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Global Tables (Multi-Region):                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Table in us-east-1 ←→ Table in eu-west-1          │    │
│  │  - Bi-directional replication                       │    │
│  │  - Sub-second replication lag                       │    │
│  │  - Last-writer-wins conflict resolution             │    │
│  │  - Read/write from any region                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

DynamoDB Indexing:
══════════════════

Base Table:
┌───────────┬────────────┬──────────┬──────────┬──────────┐
│ user_id   │ email      │ name     │ city     │ created  │
│ (PK)      │            │          │          │          │
├───────────┼────────────┼──────────┼──────────┼──────────┤
│ 1000      │ a@ex.com   │ Alice    │ SF       │ 2024-01  │
│ 1001      │ b@ex.com   │ Bob      │ NYC      │ 2024-02  │
│ 1002      │ c@ex.com   │ Charlie  │ SF       │ 2024-01  │
└───────────┴────────────┴──────────┴──────────┴──────────┘

Query by user_id (Partition Key): O(1) ✅
Query by email: Full table scan ❌

Global Secondary Index (GSI):
┌────────────┬───────────┬──────────┐
│ email (PK) │ user_id   │ name     │
├────────────┼───────────┼──────────┤
│ a@ex.com   │ 1000      │ Alice    │
│ b@ex.com   │ 1001      │ Bob      │
│ c@ex.com   │ 1002      │ Charlie  │
└────────────┴───────────┴──────────┘

Query by email: O(1) ✅
- Separate partitioning (email is partition key)
- Separate capacity (RCU/WCU)
- Eventually consistent with base table

Local Secondary Index (LSI):
Base table with composite key: user_id (PK), created (SK)
LSI: user_id (PK), city (SK)
- Same partition key as base table
- Different sort key
- Query pattern: All users in SF, sorted by join date
```

#### DynamoDB Examples

```python
# ═══════════════════════════════════════════════════════════
# DynamoDB Advanced Patterns
# ═══════════════════════════════════════════════════════════

import boto3
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal
import uuid
import time

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# ─────────────────────────────────────────────────────────
# 1. Single Table Design Pattern
# ─────────────────────────────────────────────────────────

# All entities in one table with composite keys
table = dynamodb.Table('AppData')

# Entity types:
# USER:     PK="USER#1000"           SK="PROFILE"
# ORDER:    PK="USER#1000"           SK="ORDER#5001"
# PRODUCT:  PK="PRODUCT#101"         SK="METADATA"
# REVIEW:   PK="PRODUCT#101"         SK="REVIEW#USER#1000"

def create_user(user_id, email, name):
    """Create user entity"""
    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': 'PROFILE',
        'entity_type': 'USER',
        'user_id': user_id,
        'email': email,
        'name': name,
        'created_at': int(time.time())
    })

def create_order(user_id, order_id, total):
    """Create order entity under user"""
    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': f'ORDER#{order_id}',
        'entity_type': 'ORDER',
        'order_id': order_id,
        'user_id': user_id,
        'total': Decimal(str(total)),
        'created_at': int(time.time())
    })

def get_user_with_orders(user_id):
    """Get user and all orders in single query"""
    response = table.query(
        KeyConditionExpression=Key('PK').eq(f'USER#{user_id}')
    )
    
    items = response['Items']
    user = next(item for item in items if item['SK'] == 'PROFILE')
    orders = [item for item in items if item['SK'].startswith('ORDER#')]
    
    return {'user': user, 'orders': orders}

# Single table design benefits:
# ✅ Related data in one partition (single query)
# ✅ Atomic operations on related items
# ✅ Fewer tables to manage
# ⚠️ Requires careful access pattern design

# ─────────────────────────────────────────────────────────
# 2. Conditional Writes (Optimistic Locking)
# ─────────────────────────────────────────────────────────

def update_inventory(product_id, quantity_to_deduct):
    """
    Atomically deduct inventory, fail if insufficient stock
    """
    try:
        response = table.update_item(
            Key={
                'PK': f'PRODUCT#{product_id}',
                'SK': 'METADATA'
            },
            UpdateExpression='SET stock = stock - :qty, version = version + :inc',
            ConditionExpression='stock >= :qty',  # Only if enough stock
            ExpressionAttributeValues={
                ':qty': quantity_to_deduct,
                ':inc': 1
            },
            ReturnValues='ALL_NEW'
        )
        return response['Attributes']
    except dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        # Not enough stock
        return None

# Usage:
result = update_inventory('product:101', quantity_to_deduct=5)
if result:
    print(f"New stock: {result['stock']}")
else:
    print("Insufficient inventory")

# Conditional write use cases:
# ✅ Prevent overselling (inventory)
# ✅ Optimistic locking (version check)
# ✅ Idempotency (check already processed)
# ✅ Atomic counters

# ─────────────────────────────────────────────────────────
# 3. Transactions (ACID across multiple items)
# ─────────────────────────────────────────────────────────

def transfer_points(from_user_id, to_user_id, points):
    """
    Atomically transfer points between users
    """
    try:
        dynamodb.meta.client.transact_write_items(
            TransactItems=[
                {
                    'Update': {
                        'TableName': 'AppData',
                        'Key': {
                            'PK': {'S': f'USER#{from_user_id}'},
                            'SK': {'S': 'PROFILE'}
                        },
                        'UpdateExpression': 'SET points = points - :points',
                        'ConditionExpression': 'points >= :points',
                        'ExpressionAttributeValues': {
                            ':points': {'N': str(points)}
                        }
                    }
                },
                {
                    'Update': {
                        'TableName': 'AppData',
                        'Key': {
                            'PK': {'S': f'USER#{to_user_id}'},
                            'SK': {'S': 'PROFILE'}
                        },
                        'UpdateExpression': 'SET points = points + :points',
                        'ExpressionAttributeValues': {
                            ':points': {'N': str(points)}
                        }
                    }
                }
            ]
        )
        return True
    except Exception as e:
        # Transaction failed (all-or-nothing)
        print(f"Transfer failed: {e}")
        return False

# Transaction properties:
# ✅ ACID guarantees (all succeed or all fail)
# ✅ Up to 100 items per transaction
# ✅ Cross-table transactions supported
# ⚠️ Higher latency than single item operations
# ⚠️ Higher cost (2x write capacity per item)

# ─────────────────────────────────────────────────────────
# 4. Time-Series Data with TTL
# ─────────────────────────────────────────────────────────

def log_event(user_id, event_type, data):
    """Log event with 30-day auto-deletion"""
    event_id = str(uuid.uuid4())
    ttl = int(time.time()) + (30 * 24 * 60 * 60)  # 30 days
    
    table.put_item(Item={
        'PK': f'USER#{user_id}',
        'SK': f'EVENT#{int(time.time())}#{event_id}',
        'event_type': event_type,
        'data': data,
        'ttl': ttl  # DynamoDB TTL attribute
    })

def query_recent_events(user_id, last_n_days=7):
    """Query events from last N days"""
    cutoff_timestamp = int(time.time()) - (last_n_days * 24 * 60 * 60)
    
    response = table.query(
        KeyConditionExpression=
            Key('PK').eq(f'USER#{user_id}') &
            Key('SK').gte(f'EVENT#{cutoff_timestamp}')
    )
    
    return response['Items']

# TTL benefits:
# ✅ Automatic cleanup (no manual deletion)
# ✅ No deletion cost (free background process)
# ✅ Reduce storage costs
# ⚠️ Deletion within 48 hours (not immediate)

# ─────────────────────────────────────────────────────────
# 5. Global Secondary Index (GSI) for Different Access Pattern
# ─────────────────────────────────────────────────────────

# Base table: PK=user_id, SK=order_id
# GSI: PK=status, SK=created_at

def query_orders_by_status(status, limit=100):
    """Query all orders with given status (across all users)"""
    response = table.query(
        IndexName='StatusIndex',  # GSI name
        KeyConditionExpression=Key('status').eq(status),
        Limit=limit,
        ScanIndexForward=False  # Descending order (newest first)
    )
    
    return response['Items']

# Query pending orders:
pending_orders = query_orders_by_status('pending')

# GSI use cases:
# ✅ Query by non-primary-key attribute
# ✅ Different sort order
# ✅ Sparse index (index only items with attribute)
# ⚠️ Eventually consistent with base table
# ⚠️ Additional cost (separate RCU/WCU)

# ─────────────────────────────────────────────────────────
# 6. Batch Operations (Reduce API Calls)
# ─────────────────────────────────────────────────────────

def batch_get_users(user_ids):
    """Get multiple users in single API call"""
    response = dynamodb.batch_get_item(
        RequestItems={
            'AppData': {
                'Keys': [
                    {'PK': f'USER#{uid}', 'SK': 'PROFILE'}
                    for uid in user_ids
                ]
            }
        }
    )
    
    return response['Responses']['AppData']

def batch_write_orders(orders):
    """Write multiple orders in single API call (up to 25)"""
    with table.batch_writer() as batch:
        for order in orders:
            batch.put_item(Item={
                'PK': f'USER#{order["user_id"]}',
                'SK': f'ORDER#{order["order_id"]}',
                'total': Decimal(str(order['total'])),
                'created_at': int(time.time())
            })

# Batch benefits:
# ✅ Reduce API calls (lower latency)
# ✅ Lower cost (fewer requests)
# ⚠️ Partial failures possible (handle unprocessed items)
# ⚠️ Max 25 items per batch write, 100 items per batch get
```

---

### ⚡ Memcached Deep Dive

```
┌─────────────────────────────────────────────────────────────┐
│          MEMCACHED ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CLIENT (with Consistent Hashing)                   │    │
│  │  - Hash key to determine server                     │    │
│  │  - Handle server failures (rehash)                  │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  MEMCACHED CLUSTER (Independent Servers)            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ Server 1 │  │ Server 2 │  │ Server 3 │          │    │
│  │  │ Port     │  │ Port     │  │ Port     │          │    │
│  │  │ 11211    │  │ 11211    │  │ 11211    │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  │                                                      │    │
│  │  - No communication between servers                 │    │
│  │  - No replication                                   │    │
│  │  - No persistence                                   │    │
│  │  - Pure cache (ephemeral)                           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Server Internals:                                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Multi-threaded Event Loop                          │    │
│  │  - Worker threads handle requests                   │    │
│  │  - Better CPU utilization than Redis                │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Slab Allocator (Memory Management)                 │    │
│  │  - Fixed-size chunks (slabs)                        │    │
│  │  - Reduce fragmentation                             │    │
│  │  - Slab classes: 64B, 128B, 256B, ..., 1MB          │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  LRU Eviction                                       │    │
│  │  - Evict least recently used when full              │    │
│  │  - Per-slab-class LRU                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Memcached vs Redis:
═══════════════════

Feature           Memcached          Redis
────────────────  ─────────────────  ─────────────────
Threading         Multi-threaded     Single-threaded
Data structures   String only        String, List, Set, etc.
Persistence       None               RDB, AOF
Replication       None               Master-replica
Clustering        Client-side        Server-side
Max value size    1 MB               512 MB
Use case          Simple cache       Cache + data store
```

```python
# ═══════════════════════════════════════════════════════════
# Memcached Example
# ═══════════════════════════════════════════════════════════

from pymemcache.client.base import Client
from pymemcache.client.hash import HashClient
import json

# Single server:
mc = Client(('localhost', 11211))

# Multiple servers (consistent hashing):
mc = HashClient([
    ('server1.example.com', 11211),
    ('server2.example.com', 11211),
    ('server3.example.com', 11211)
])

# ─────────────────────────────────────────────────────────
# Basic operations
# ─────────────────────────────────────────────────────────

# Set (with TTL)
mc.set('user:1000', json.dumps({'name': 'John', 'age': 30}), expire=3600)

# Get
user = json.loads(mc.get('user:1000'))

# Delete
mc.delete('user:1000')

# Get multiple keys
results = mc.get_many(['user:1000', 'user:1001', 'user:1002'])

# Atomic increment
mc.incr('page:views', 1)  # Increment by 1
mc.decr('inventory:product:101', 5)  # Decrement by 5

# Cache-aside pattern with Memcached:
def get_user(user_id):
    cache_key = f'user:{user_id}'
    
    # Try cache
    cached = mc.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Cache miss: Query database
    user = db.query(f"SELECT * FROM users WHERE id={user_id}")
    
    # Store in cache
    mc.set(cache_key, json.dumps(user), expire=3600)
    
    return user

# Memcached best for:
# ✅ Simple key-value caching
# ✅ Multi-threaded workload (better CPU utilization)
# ✅ Large cache cluster (100+ servers)
# ⚠️ No persistence (data lost on restart)
# ⚠️ No complex data structures
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### E-Commerce Session Store (Redis)

**Requirements:**
- 10M daily active users
- 500k peak concurrent users
- Session data: 5 KB per user
- Session TTL: 30 minutes (sliding)
- 100k session creates/second (peak)
- 1M session reads/second (peak)

**Storage Estimation:**

```
Peak concurrent sessions:
= 500k users
= 500k sessions × 5 KB
= 2.5 GB active session data

With 20% overhead (Redis metadata):
= 2.5 GB × 1.2 = 3 GB

Buffer for spikes (2x):
= 3 GB × 2 = 6 GB

Total RAM needed: 8 GB (with headroom)
```

**Throughput Estimation:**

```
Peak writes (session create/update):
= 100k writes/second

Peak reads (session validation):
= 1M reads/second

Redis single-node capacity:
= 100k operations/second typical

Nodes needed (writes):
= 100k writes / 100k per node = 1 node

Nodes needed (reads):
= 1M reads / 100k per node = 10 nodes

Total: 10 read replicas + 1 primary = 11 nodes
```

**Redis Cluster Setup:**

```
Architecture:
- 1 primary (handles writes)
- 10 read replicas (handle reads)
- Redis Sentinel for automatic failover

Replication:
- Async replication (low latency)
- Replica lag: 10-100ms typical
- Acceptable for sessions (eventual consistency OK)

Server specs (AWS ElastiCache):
- cache.r6g.large (2 vCPU, 13.07 GB RAM)
- Cost: $0.151/hour × 11 nodes
- Total: $1.66/hour = $1,196/month

High availability:
- Multi-AZ replication
- Automatic failover (30-60 second RTO)
- Daily backups
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Choosing Redis vs DynamoDB vs Memcached

```
┌─────────────────────────────────────────────────────────────┐
│          KEY-VALUE STORE DECISION MATRIX                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Choose Redis when:                                          │
│  ✅ Need rich data structures (lists, sets, sorted sets)    │
│  ✅ Real-time features (pub/sub, leaderboards)              │
│  ✅ Atomic operations (INCR, ZADD)                          │
│  ✅ Optional persistence (RDB/AOF)                          │
│  ✅ Sub-millisecond latency critical                        │
│  ✅ Willing to manage infrastructure                        │
│  Examples: Cache, session store, rate limiting, leaderboards│
│                                                              │
│  Choose DynamoDB when:                                       │
│  ✅ Need serverless (no infrastructure management)          │
│  ✅ Need durability (persistent storage)                    │
│  ✅ Auto-scaling required                                   │
│  ✅ Global distribution (multi-region)                      │
│  ✅ ACID transactions needed                                │
│  ✅ Pay-per-use pricing preferred                           │
│  Examples: User profiles, product catalog, orders, metadata │
│                                                              │
│  Choose Memcached when:                                      │
│  ✅ Simple caching only (no persistence)                    │
│  ✅ Multi-threaded workload (CPU-bound)                     │
│  ✅ Large distributed cache (100+ nodes)                    │
│  ✅ Minimal memory overhead                                 │
│  ⚠️ No complex data structures needed                       │
│  ⚠️ No persistence needed                                   │
│  Examples: Page cache, query result cache, CDN origin cache │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Feature Comparison:
══════════════════

┌──────────────┬─────────────┬─────────────┬─────────────┐
│ Feature      │ Redis       │ DynamoDB    │ Memcached   │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Persistence  │ Optional    │ Yes         │ No          │
│ Replication  │ Yes         │ Yes (3-way) │ No          │
│ Clustering   │ Yes         │ Automatic   │ Client-side │
│ Data types   │ 10+         │ 8           │ String only │
│ Transactions │ Limited     │ ACID        │ No          │
│ Threading    │ Single      │ N/A         │ Multi       │
│ Max value    │ 512 MB      │ 400 KB      │ 1 MB        │
│ Latency      │ 0.1-1 ms    │ 1-10 ms     │ 0.1-1 ms    │
│ Management   │ Self/managed│ Fully mgd   │ Self/managed│
│ Cost         │ Instance    │ Per request │ Instance    │
└──────────────┴─────────────┴─────────────┴─────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Redis High Availability Patterns

```
Pattern 1: Master-Replica with Sentinel
════════════════════════════════════════

┌───────────────────────────────────────────────┐
│ Application Servers                            │
│ ┌──────┐ ┌──────┐ ┌──────┐                   │
│ │ App1 │ │ App2 │ │ App3 │                   │
│ └───┬──┘ └───┬──┘ └───┬──┘                   │
│     │        │        │                       │
│     └────────┼────────┘                       │
│              │ Query Sentinel for master      │
│              ▼                                 │
│     ┌────────────────┐                        │
│     │ Redis Sentinel │ (3 instances)          │
│     └────────┬───────┘                        │
│              │ Monitor health                 │
│              ▼                                 │
│     ┌────────────────┐                        │
│     │  Redis Master  │ ──replication──>       │
│     └────────────────┘                        │
│              │                                 │
│         ┌────┴────┐                           │
│         ▼         ▼                           │
│   ┌─────────┐ ┌─────────┐                    │
│   │Replica 1│ │Replica 2│                    │
│   └─────────┘ └─────────┘                    │
└───────────────────────────────────────────────┘

Failover process:
1. Sentinel detects master failure (PING timeout)
2. Sentinels vote (quorum: 2/3)
3. Promote replica to master
4. Update clients with new master address
5. Downtime: 1-2 seconds

Pattern 2: Redis Cluster (Horizontal Scaling)
══════════════════════════════════════════════

3 master shards × 1 replica each = 6 total nodes

Shard 1: Master A + Replica A' (slots 0-5460)
Shard 2: Master B + Replica B' (slots 5461-10922)
Shard 3: Master C + Replica C' (slots 10923-16383)

Benefits:
✅ Write scaling (3x throughput)
✅ Storage scaling (3x capacity)
✅ Automatic failover
✅ No single point of failure

Client-side routing:
- Client calculates: CRC16(key) % 16384 = slot
- Client connects to appropriate master
- Redirection if slot moved (MOVED response)
```

### Handling Cache Failures

```python
# ═══════════════════════════════════════════════════════════
# Cache failure strategies
# ═══════════════════════════════════════════════════════════

import redis
from functools import wraps
import time

redis_client = redis.Redis(host='localhost', port=6379, 
                           socket_connect_timeout=0.1,
                           socket_timeout=0.1)

# ─────────────────────────────────────────────────────────
# 1. Circuit Breaker Pattern
# ─────────────────────────────────────────────────────────

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func, *args, **kwargs):
        if self.state == 'OPEN':
            if time.time() - self.last_failure_time > self.timeout:
                self.state = 'HALF_OPEN'
            else:
                raise Exception("Circuit breaker OPEN")
        
        try:
            result = func(*args, **kwargs)
            if self.state == 'HALF_OPEN':
                self.state = 'CLOSED'
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = 'OPEN'
            raise e

cache_circuit_breaker = CircuitBreaker(failure_threshold=5, timeout=60)

def get_from_cache_with_circuit_breaker(key):
    try:
        return cache_circuit_breaker.call(redis_client.get, key)
    except:
        # Circuit open or Redis down → Skip cache, query database
        return None

# ─────────────────────────────────────────────────────────
# 2. Cache-Aside with Fallback
# ─────────────────────────────────────────────────────────

def get_user_with_fallback(user_id):
    """Get user with graceful cache degradation"""
    cache_key = f'user:{user_id}'
    
    # Try cache (with timeout)
    try:
        cached = redis_client.get(cache_key)
        if cached:
            return json.loads(cached)
    except redis.exceptions.RedisError:
        # Cache unavailable → Continue to database
        pass
    
    # Cache miss or cache down: Query database
    user = query_database(f"SELECT * FROM users WHERE id={user_id}")
    
    # Try to cache result (best effort, don't fail if cache down)
    try:
        redis_client.setex(cache_key, 3600, json.dumps(user))
    except redis.exceptions.RedisError:
        pass  # Ignore cache write failure
    
    return user

# Benefits:
# ✅ Service continues working if cache fails
# ✅ Database handles load (may be slower)
# ✅ Cache repairs itself when available

# ─────────────────────────────────────────────────────────
# 3. Thundering Herd Prevention
# ─────────────────────────────────────────────────────────

def get_with_lock(key, ttl=3600, lock_timeout=10):
    """
    Prevent multiple concurrent database queries for same key
    """
    # Try cache
    cached = redis_client.get(key)
    if cached:
        return json.loads(cached)
    
    # Cache miss: Acquire lock
    lock_key = f'lock:{key}'
    lock_acquired = redis_client.set(lock_key, '1', nx=True, ex=lock_timeout)
    
    if lock_acquired:
        try:
            # This thread queries database
            value = expensive_database_query(key)
            redis_client.setex(key, ttl, json.dumps(value))
            return value
        finally:
            redis_client.delete(lock_key)
    else:
        # Another thread is querying: Wait and retry
        time.sleep(0.1)
        return get_with_lock(key, ttl, lock_timeout)

# Prevents:
# ❌ 1000 concurrent requests → 1000 database queries (thundering herd)
# ✅ 1000 concurrent requests → 1 database query + 999 wait

# ─────────────────────────────────────────────────────────
# 4. Stale Cache Serving (Eventual Consistency)
# ─────────────────────────────────────────────────────────

def get_with_stale_on_error(key):
    """
    Serve stale cache if database fails
    """
    cache_key = f'cache:{key}'
    stale_key = f'stale:{key}'
    
    # Try fresh cache
    cached = redis_client.get(cache_key)
    if cached:
        # Update stale cache in background
        redis_client.setex(stale_key, 3600, cached)
        return json.loads(cached)
    
    # Cache miss: Query database
    try:
        value = query_database(key)
        redis_client.setex(cache_key, 300, json.dumps(value))  # 5min TTL
        redis_client.setex(stale_key, 3600, json.dumps(value))  # 1hr backup
        return value
    except DatabaseError:
        # Database down: Serve stale cache
        stale = redis_client.get(stale_key)
        if stale:
            return json.loads(stale)
        raise  # No stale cache available

# Benefits:
# ✅ High availability (serve stale data vs no data)
# ✅ Graceful degradation
# ⚠️ Data may be outdated (trade-off)
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Redis Security Best Practices

```bash
# ═══════════════════════════════════════════════════════════
# redis.conf security configuration
# ═══════════════════════════════════════════════════════════

# 1. Authentication
requirepass your-strong-password-here
# Clients must AUTH before commands

# 2. Bind to specific interface (not public)
bind 127.0.0.1 10.0.1.5
# Only accept connections from localhost and private network

# 3. Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG "CONFIG_abc123xyz"
# Disable or rename commands that can delete all data

# 4. Enable protected mode
protected-mode yes
# Refuse external connections if no password and not bound to localhost

# 5. TLS/SSL encryption (Redis 6.0+)
tls-port 6380
tls-cert-file /path/to/redis.crt
tls-key-file /path/to/redis.key
tls-ca-cert-file /path/to/ca.crt

# 6. ACL (Access Control Lists, Redis 6.0+)
# Create users with specific permissions
user alice on >password123 ~cache:* +get +set
user bob on >password456 ~user:* +@read
# alice: Can GET/SET keys matching "cache:*"
# bob: Can read (any read command) keys matching "user:*"
```

```python
# DynamoDB IAM Security
# ═══════════════════════════════════════════════════════════

import boto3

# Fine-grained access control via IAM policy
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:Query"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/Users",
            "Condition": {
                "ForAllValues:StringEquals": {
                    "dynamodb:LeadingKeys": [
                        "${aws:username}"
                    ]
                }
            }
        }
    ]
}
# User can only access items where partition key = their username

# Encryption at rest (AWS KMS)
# - Enabled by default on new tables
# - No application changes required

# Encryption in transit (TLS)
# - All DynamoDB API calls use HTTPS
# - Enforced by AWS SDK

# VPC Endpoints
# - Private connection from VPC to DynamoDB
# - No internet gateway required
# - Lower latency, better security
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Twitter - Redis for Timeline Caching

**Challenge:**
- 400M tweets/day
- 500M users
- Home timeline: Show tweets from followed users
- Extremely read-heavy (1000:1 read:write ratio)
- Sub-second latency requirement

**Solution: Redis Caching**

**Data Model:**
```python
# User's home timeline (recent 800 tweets)
Key: f"timeline:{user_id}"
Type: List (LPUSH for new tweets, LRANGE for retrieval)
TTL: None (updates on every new tweet from followees)

# Tweet content
Key: f"tweet:{tweet_id}"
Type: Hash (id, text, author_id, created_at, likes, retweets)
TTL: 24 hours (old tweets retrieved from database if needed)
```

**Architecture:**
- Redis Cluster: 1000+ nodes
- Sharding: user_id-based (all user's data on same shard)
- Replication: 2 replicas per shard
- Persistence: AOF for durability

**Timeline Generation:**
```python
def get_timeline(user_id, count=50):
    """Retrieve user's home timeline from cache"""
    cache_key = f"timeline:{user_id}"
    
    # Get tweet IDs from list
    tweet_ids = redis_client.lrange(cache_key, 0, count-1)
    
    # Batch get tweet details
    pipeline = redis_client.pipeline()
    for tweet_id in tweet_ids:
        pipeline.hgetall(f"tweet:{tweet_id}")
    tweets = pipeline.execute()
    
    return tweets

def publish_tweet(user_id, tweet_content):
    """
    Publish tweet and fan-out to followers' timelines
    """
    # Create tweet
    tweet_id = generate_id()
    tweet_key = f"tweet:{tweet_id}"
    redis_client.hset(tweet_key, mapping={
        'id': tweet_id,
        'author_id': user_id,
        'text': tweet_content,
        'created_at': time.time()
    })
    redis_client.expire(tweet_key, 86400)  # 24 hour TTL
    
    # Fan-out to followers (async job)
    followers = get_followers(user_id)
    for follower_id in followers:
        # Add to follower's timeline (left push = prepend)
        redis_client.lpush(f"timeline:{follower_id}", tweet_id)
        # Trim to 800 tweets
        redis_client.ltrim(f"timeline:{follower_id}", 0, 799)
```

**Results:**
- 10ms p99 latency for timeline retrieval
- 99.9% cache hit rate
- Database queries reduced by 95%
- Linear scalability (add nodes = add capacity)

**Key Lessons:**
1. Fan-out on write (eager computation) for read-heavy workloads
2. List data structure perfect for timelines (ordered, efficient range queries)
3. Sharding by user_id ensures locality (all user data together)
4. TTL on tweet details reduces memory (fall back to database for old content)

---

### Example 2: Stack Overflow - DynamoDB for Session Management

**Challenge:**
- 100M monthly visitors
- 5M peak concurrent users
- Session data: User ID, preferences, auth tokens
- Need high availability (99.99%+)
- Global presence (low latency worldwide)

**Solution: DynamoDB Global Tables**

**Data Model:**
```python
# Table: Sessions
# Partition Key: session_id
# Attributes: user_id, auth_token, preferences (JSON), created_at, last_accessed
# TTL: ttl (auto-delete expired sessions)

{
    "session_id": "abc123def456",  # Partition key
    "user_id": "1000",
    "auth_token": "jwt-token-here",
    "preferences": {
        "theme": "dark",
        "language": "en"
    },
    "created_at": 1704067200,
    "last_accessed": 1704153600,
    "ttl": 1704240000  # Expires in 24 hours
}
```

**Architecture:**
- Global Tables: us-east-1, eu-west-1, ap-southeast-1
- On-demand pricing (auto-scales with traffic)
- Point-in-time recovery enabled
- Encryption at rest (AWS KMS)

**Session Operations:**
```python
import boto3
import time
import uuid

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Sessions')

def create_session(user_id, auth_token):
    """Create new session"""
    session_id = str(uuid.uuid4())
    ttl = int(time.time()) + 86400  # 24 hours
    
    table.put_item(Item={
        'session_id': session_id,
        'user_id': str(user_id),
        'auth_token': auth_token,
        'preferences': {},
        'created_at': int(time.time()),
        'last_accessed': int(time.time()),
        'ttl': ttl
    })
    
    return session_id

def get_session(session_id):
    """Retrieve and refresh session"""
    response = table.get_item(Key={'session_id': session_id})
    
    if 'Item' not in response:
        return None
    
    # Refresh TTL and last_accessed
    table.update_item(
        Key={'session_id': session_id},
        UpdateExpression='SET last_accessed = :now, ttl = :ttl',
        ExpressionAttributeValues={
            ':now': int(time.time()),
            ':ttl': int(time.time()) + 86400
        }
    )
    
    return response['Item']

def delete_session(session_id):
    """Logout: Delete session"""
    table.delete_item(Key={'session_id': session_id})
```

**Results:**
- Single-digit millisecond latency worldwide
- 99.99% availability
- Zero session loss during regional failures
- Auto-scaling handles traffic spikes
- $0 management overhead (fully managed)

**Key Lessons:**
1. DynamoDB Global Tables perfect for globally distributed sessions
2. TTL automatic cleanup saves costs (no manual deletion)
3. Serverless auto-scaling handles unpredictable traffic
4. Multi-region replication provides disaster recovery

---

### Example 3: Amazon - Memcached for Product Recommendations

**Challenge:**
- Millions of products
- Personalized recommendations for each user
- Recommendation computation expensive (ML models)
- Need to cache computed recommendations
- High throughput (millions of requests/second)

**Solution: Memcached Cluster**

**Architecture:**
- 200+ Memcached servers
- Client-side consistent hashing
- Pure cache (no persistence)
- LRU eviction when full

**Caching Strategy:**
```python
from pymemcache.client.hash import HashClient
import json

# Memcached cluster
mc = HashClient([
    (f'memcached-{i}.internal', 11211)
    for i in range(1, 201)  # 200 servers
])

def get_recommendations(user_id, category, count=10):
    """
    Get product recommendations for user
    """
    cache_key = f'rec:{user_id}:{category}:{count}'
    
    # Try cache
    cached = mc.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Cache miss: Compute recommendations (expensive ML inference)
    recommendations = ml_model.predict(user_id, category, count)
    
    # Cache for 1 hour
    mc.set(cache_key, json.dumps(recommendations), expire=3600)
    
    return recommendations

def invalidate_recommendations(user_id):
    """
    Invalidate cache when user behavior changes
    (e.g., user purchases product, updates preferences)
    """
    # Delete all recommendation cache entries for user
    # Note: Memcached doesn't support pattern matching,
    # so track keys separately or use short TTL
    categories = ['electronics', 'books', 'clothing', ...]
    for category in categories:
        for count in [10, 20, 50]:
            mc.delete(f'rec:{user_id}:{category}:{count}')
```

**Results:**
- 95%+ cache hit rate
- Latency reduced from 500ms (ML inference) to 1ms (cache)
- ML inference capacity freed for other use cases
- Multi-threaded Memcached utilized all CPU cores

**Key Lessons:**
1. Memcached perfect for simple caching of expensive computations
2. Multi-threading advantage for CPU-bound caching workloads
3. Client-side hashing scales to hundreds of nodes
4. Short TTL acceptable when recomputation fast enough

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Answer: "Explain key-value stores"

**Answer:**
*"Key-value stores are simplest NoSQL databases where data stored as key-value pairs, optimized for high-speed lookups with sub-millisecond latency. Three main categories:*

*First, in-memory caches like Redis and Memcached—data primarily in RAM for extreme speed. Redis supports rich data structures: strings, lists, sets, sorted sets, hashes. Memcached simpler: string values only, but multi-threaded for better CPU utilization. Use for caching database queries, session management, rate limiting, leaderboards.*

*Second, persistent key-value stores like DynamoDB—SSD-backed, durable storage. Auto-scaling, multi-region replication, ACID transactions. Serverless operation. Use for user profiles, product catalogs, metadata.*

*Third, hybrid like Redis with AOF/RDB persistence—in-memory speed with optional durability. Configurable fsync for durability vs performance trade-off.*

*Core operations: GET (retrieve by key), SET (store key-value), DELETE (remove key), EXPIRE (TTL for auto-deletion). All O(1) hash table lookups.*

*Scaling: Horizontal via consistent hashing. Redis Cluster: 16384 hash slots distributed across nodes. DynamoDB: Automatic partitioning at 10GB/3000RCU/1000WCU limits. Add nodes linearly increases capacity.*

*Use when: Need sub-millisecond latency (caching), simple access patterns (primary key lookups), high throughput (millions of ops/second), flexible schema.*

*Avoid when: Need complex queries (JOINs, aggregations), relational data, strong consistency guarantees across items, transactions spanning multiple keys (limited support)."*

---

### Common Follow-Up Questions

**Q: "How does Redis achieve sub-millisecond latency?"**

**A:** *"Five mechanisms enable Redis sub-millisecond latency:*

*First, in-memory storage—all data in RAM, no disk I/O per operation. DRAM access: 100 nanoseconds. Compare to SSD: 100 microseconds (1000x slower), HDD: 10 milliseconds (100,000x slower). Redis data structures directly in memory.*

*Second, single-threaded event loop—no locking overhead, no context switching, no race conditions. Commands execute sequentially. Sounds slow but: Memory operations extremely fast (microseconds), no thread coordination overhead, predictable performance. One thread saturates memory bandwidth before CPU bottleneck.*

*Third, simple data model—hash table lookup O(1). No query planning, no schema validation, no JOIN computation. Key lookup directly returns memory address.*

*Fourth, efficient network protocol—RESP (Redis Serialization Protocol) is minimal binary protocol. Pipeline multiple commands: Batch 100 commands in single network round-trip. Save network latency (biggest overhead in distributed systems).*

*Fifth, optimized data structures—Small objects use compressed representations. Lists: Ziplist for <512 bytes, linked list for larger. Sets: Intset for small integer sets, hash table for larger. Memory locality improves cache hits.*

*Benchmark: Redis single-node on modern server: 100k-1M operations/second. Latency: P99 < 1ms, P50 < 0.2ms.*

*Trade-offs: Single-threaded limits CPU utilization (use Redis Cluster for multi-core scaling). No disk I/O means data loss risk without persistence (use AOF for durability, accept slower writes). Simple model means no complex queries (design access patterns around keys).*

*Real-world optimization: Twitter uses Redis for timeline caching—10ms P99 latency serving millions of requests/second. Key: Careful data structure choice (lists for timelines), aggressive caching, sharding by user_id."*

---

**Q: "When would you choose DynamoDB over Redis?"**

**A:** *"Five decision criteria:*

*First, durability requirements. DynamoDB: Persistent storage, replicated across 3 AZs. Data survives server failures, region outages. Writes committed to disk before acknowledgment. Redis: In-memory, data lost on crash unless persistence enabled. AOF/RDB add latency. Choose DynamoDB when data must survive failures without manual intervention. Example: User accounts, order history, inventory.*

*Second, operational overhead. DynamoDB: Fully managed, serverless, zero infrastructure management. Auto-scaling, automatic backups, multi-region replication. Redis: Self-managed (EC2) or managed (ElastiCache), but still need capacity planning, failover testing, monitoring. Choose DynamoDB when team small, want to focus on application not infrastructure.*

*Third, scalability requirements. DynamoDB: Unlimited auto-scaling, on-demand mode scales to any traffic. Zero capacity planning. Redis: Horizontal scaling requires Redis Cluster setup, hash slot management, client-side routing logic. Choose DynamoDB for unpredictable traffic, startups with uncertain growth.*

*Fourth, access patterns. Redis: Rich queries—range queries on sorted sets, list operations, set operations. Complex atomic operations (INCR, ZADD). DynamoDB: Simple primary key lookups, secondary indexes for alternate access patterns, but limited query flexibility. Choose Redis when need complex in-memory operations (leaderboards, rate limiting, real-time analytics). Choose DynamoDB for simple CRUD on user data, metadata.*

*Fifth, cost model. Redis: Pay for instance hours (fixed cost). Cost-effective for steady high throughput. DynamoDB: Pay per request or provisioned capacity. Cost-effective for low/variable traffic, expensive for sustained high throughput. Break-even: ~1M requests/hour sustained—Redis cheaper. Bursty traffic—DynamoDB cheaper.*

*Real-world combinations: Uber uses both—Redis for session caching (sub-millisecond reads, high throughput), DynamoDB for trip metadata (durability, global replication). Stack Overflow: DynamoDB for sessions (global distribution, zero ops), Redis for page caching (speed, complex operations).*

*Interview answer pattern: 'Depends on requirements'—then list concrete factors with examples."*

---

**Q: "How do you prevent cache stampede / thundering herd?"**

**A:** *"Cache stampede: Popular cache key expires, thousands of concurrent requests query database simultaneously, overloading database. Four solutions:*

*First, request coalescing with distributed locks. When cache miss detected, first request acquires lock, queries database, populates cache. Other concurrent requests wait for cache to populate. Implementation:*

```python
def get_with_lock(key):
    # Try cache
    value = cache.get(key)
    if value:
        return value
    
    # Cache miss: Try to acquire lock
    lock_acquired = cache.set(f'lock:{key}', '1', nx=True, ex=10)
    if lock_acquired:
        # This request queries database
        value = database.query(key)
        cache.set(key, value, ex=3600)
        cache.delete(f'lock:{key}')
        return value
    else:
        # Another request is querying: Wait and retry
        time.sleep(0.1)
        return get_with_lock(key)
```

*Benefits: 1000 concurrent requests → 1 database query. Trade-off: First request slower (acquire lock + query), others wait.*

*Second, probabilistic early expiration. Don't wait for exact TTL expiration—refresh cache early with probability increasing as expiration approaches. Implementation:*

```python
def get_with_early_refresh(key, ttl=3600):
    cached = cache.get_with_ttl(key)  # Returns (value, remaining_ttl)
    if cached:
        value, remaining = cached
        # Probability = 1 - (remaining / total_ttl)
        # As expiration nears, probability increases
        beta = 1.0  # Tuning parameter
        if random.random() < beta * math.log(1 + 1/remaining):
            # Refresh in background
            async_refresh(key)
        return value
    
    # Cache miss
    value = database.query(key)
    cache.set(key, value, ex=ttl)
    return value
```

*Benefits: Smooth cache refreshes, no stampede. Trade-off: Stale data possible for short period.*

*Third, cache warming. For predictable popular keys, refresh before expiration. Background job monitors TTL, refreshes at 90% expiration. Implementation:*

```python
# Background worker
def cache_warmer():
    popular_keys = get_popular_keys()  # From analytics
    for key in popular_keys:
        ttl = cache.ttl(key)
        if ttl < 360:  # Less than 10% remaining (assuming 1hr TTL)
            value = database.query(key)
            cache.set(key, value, ex=3600)
```

*Benefits: Proactive, no user-facing latency. Trade-off: Requires knowing popular keys, extra background work.*

*Fourth, serve stale data with async refresh. Return expired cache value immediately, trigger background refresh. Implementation:*

```python
def get_with_stale(key):
    value = cache.get(key)
    if value:
        return value
    
    # Check stale cache (separate key with longer TTL)
    stale_value = cache.get(f'stale:{key}')
    if stale_value:
        # Trigger async refresh
        background_task(lambda: refresh_cache(key))
        return stale_value
    
    # No stale data: Synchronous query
    value = database.query(key)
    cache.set(key, value, ex=3600)
    cache.set(f'stale:{key}', value, ex=7200)  # 2x TTL for stale
    return value
```

*Benefits: Always fast responses, graceful degradation. Trade-off: Users may see stale data briefly.*

*Production recommendation: Combine approaches—Use probabilistic early expiration (automatic, no code changes needed) + cache warming for top 100 hot keys (predictable, proactive) + distributed locks as fallback (prevents worst-case stampede). Measure cache hit ratio, P99 latency, database load before and after."*

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why Key-Value Stores Matter

**Business Impact:**
- **Performance**: 10-100x faster response times (0.1-1ms vs 10-100ms database queries)
- **Cost**: Reduce database load 90%+ (fewer expensive database servers needed)
- **Scale**: Handle millions of users with sub-second response times
- **Availability**: 99.99%+ uptime with replication and automatic failover
- **User experience**: Instant page loads, real-time updates, responsive applications

**Technical Impact:**
- **Caching**: Reduce database load, enable horizontal scaling
- **Session management**: Stateless application servers, shared sessions
- **Rate limiting**: Protect APIs from abuse, implement quotas
- **Real-time features**: Leaderboards, counters, pub/sub messaging
- **Distributed locks**: Coordinate across application instances

### How Key-Value Stores Work

**Core Architecture:**
1. **Simple data model**: Key (unique identifier) → Value (arbitrary data)
2. **Hash table lookup**: O(1) constant time access
3. **In-memory storage**: Redis/Memcached keep all data in RAM
4. **Distributed**: Consistent hashing distributes keys across nodes
5. **Replication**: Multiple copies for fault tolerance and read scaling

**Three Categories:**
- **Redis**: In-memory, rich data structures, optional persistence, pub/sub
- **DynamoDB**: Persistent, serverless, auto-scaling, global tables
- **Memcached**: Pure cache, multi-threaded, minimal features

### Trade-Offs to Remember

```
Speed ←→ Durability
- In-memory (Redis/Memcached): Sub-millisecond latency, data lost on crash
- Persistent (DynamoDB): Single-digit millisecond latency, durable

Simplicity ←→ Features
- Memcached: Simple strings, fast, minimal overhead
- Redis: Rich data structures, complex operations, more features

Managed ←→ Control
- DynamoDB: Fully managed, zero ops, higher cost per request
- Redis: Self-managed or semi-managed, lower cost at scale, more control

Consistency ←→ Availability
- Strong consistency: Slower, may fail if replicas unavailable
- Eventual consistency: Faster, always available, temporary staleness
```

### Interview Red Flags

🚫 "Key-value stores always faster than databases"
✅ "Key-value stores optimize for simple lookups by primary key. Complex queries (JOINs, aggregations) still need databases."

🚫 "Redis is just a cache"
✅ "Redis is multi-purpose: Cache, session store, message broker (pub/sub), leaderboard (sorted sets), rate limiter, distributed lock."

🚫 "Always use caching"
✅ "Cache when read:write ratio high (10:1+), access patterns predictable, acceptable to serve stale data briefly. Don't cache rapidly changing data."

### Final Sound Bite

*"Key-value stores: Simplest NoSQL databases optimized for high-speed primary key lookups with sub-millisecond latency. Three types: In-memory caches (Redis, Memcached), persistent stores (DynamoDB), hybrid (Redis with AOF/RDB).*

*Core operations: GET/SET/DELETE—all O(1) hash table lookups. No complex queries, no JOINs, no schema.*

*Redis strengths: Rich data structures (lists, sets, sorted sets, hashes), atomic operations (INCR, ZADD), pub/sub messaging, Lua scripting. Single-threaded but 100k-1M ops/second per node. Horizontal scaling via Redis Cluster (16384 hash slots).*

*DynamoDB strengths: Fully managed, serverless, unlimited auto-scaling, global tables (multi-region), ACID transactions. Partition at 10GB/3000RCU/1000WCU limits.*

*Memcached strengths: Multi-threaded (better CPU utilization), minimal memory overhead, massive clusters (100+ nodes). Pure cache, no persistence.*

*Use cases: Caching (reduce database load 90%+), session management (stateless apps), rate limiting (protect APIs), leaderboards (sorted sets), real-time counters, distributed locks.*

*Scaling patterns: Consistent hashing (even distribution, minimal data movement), replication (fault tolerance + read scaling), sharding (horizontal write scaling).*

*Failure handling: Circuit breaker (stop querying failed cache), cache-aside with fallback (graceful degradation), request coalescing (prevent stampede), serve stale data (always fast responses).*

*Real-world: Twitter uses Redis for timeline caching (10ms P99, millions of requests/second). Stack Overflow uses DynamoDB for sessions (global distribution). Amazon uses Memcached for recommendations (95% hit rate, 500ms→1ms)."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
