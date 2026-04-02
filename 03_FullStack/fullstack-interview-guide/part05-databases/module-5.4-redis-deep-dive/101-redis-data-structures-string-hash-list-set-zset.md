# Redis Data Structures — String, Hash, List, Set, ZSet
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Redis is not just a cache — it is a data structure server. Each data structure is a distinct tool. The right structure for a job determines whether your solution is elegant or a hack.
- Five core structures: **String** (any binary blob — most common, simplest), **Hash** (field→value map, like a row in a table), **List** (ordered, duplicates allowed — queues and feeds), **Set** (unordered, unique members — tags, membership checks), **ZSet** (Set + float score — sorting, leaderboards, range queries).
- Every structure has O(1) lookups. Sets and ZSets give you membership checks in O(1). ZSet range queries are O(log N + K). These complexities matter in interviews — know them.
- Strings aren't just text — INCR/DECR are atomic operations that make them safe for counters and rate limiting without locks. SETNX (Set if Not eXists) is the foundation of distributed locks.
- ZSet is the most interview-relevant structure: leaderboards, delayed job queues (score = Unix timestamp for future execution), sliding window rate limiters, and priority queues. If asked to design any of these, reach for ZSet first.
- Gap to bridge: many candidates know "Redis = cache" and stop there. Interviewers at Razorpay and Swiggy look for specific structure choices and the reason behind them, not just "store it in Redis."

---

## 1. One-Line Definition
Redis data structures are purpose-built in-memory containers — each with its own commands, semantics, and time complexity — that let you solve problems like leaderboards, queues, session storage, and rate limiting without writing complex application logic.

---

## 2. The Problem It Solves

Imagine you are building a leaderboard for a gaming app. You need to: store 1 million user scores, find the rank of any user in O(log N), and get the top 100 players in order. You look at your options.  

Option 1 — PostgreSQL ORDER BY score DESC with an index. At 1 million rows, this works. At 100 million rows with 10,000 score updates per second, the index write overhead becomes a problem. And it requires a round-trip to the database even for the simplest read.

Option 2 — Redis ZSet. You store user_id → score pairs in a sorted set. ZADD leaderboard 98.5 "user:42" updates or inserts the score. ZREVRANK leaderboard "user:42" returns rank in O(log N). ZREVRANGE leaderboard 0 99 WITHSCORES returns the top 100 in order. All commands run in sub-millisecond. No joins, no disk I/O, no SQL planning.

The deeper insight: Redis data structures are pre-built solutions to common problems. String + INCR = atomic counter. Hash = row without schema. List + LPUSH/RPOP = job queue. Set + SADD/SISMEMBER = membership check. ZSet + ZADD/ZRANGEBYSCORE = sorted lookup. Knowing which structure fits what problem is the whole skill.

---

## 3. How It Works Internally

### The Mental Model
Think of each Redis data structure as a Swiss Army knife blade — each shaped for a specific job. A String is a general-purpose blade (one value per key). A Hash is a small drawer with named slots inside a box (one key, many named fields). A List is a linked chain you can push to from either end. A Set is a bag where adding the same item twice just leaves one copy. A ZSet is a Set where every item also has a number (score) and Redis keeps them sorted by that number automatically.

The key insight: Redis stores these structures **entirely in RAM** with carefully chosen internal encoding formats that switch based on size. Small datasets use compact representations (ziplist, listpack). Large datasets use full tree or hash table structures. This automatic switching keeps memory low without you doing anything.

### The Five Structures — Mechanism + Commands

```
1. STRING
   ─────────────────────────────────────────────────────────
   STORES:    Any binary-safe value (text, number, JSON, binary)
   MAX SIZE:  512 MB per value
   KEY OPS:
     SET key value [EX seconds]   → store with optional TTL
     GET key                      → retrieve
     INCR / DECR key              → atomic increment / decrement
     INCRBY key N                 → increment by N atomically
     SETNX key value              → set ONLY if key does not exist
     GETSET key newvalue          → get old value, set new
     MSET k1 v1 k2 v2             → multi-set
     MGET k1 k2                   → multi-get
   COMPLEXITY: O(1) for all above
   USE FOR:  Sessions, OTP, counters, locks, JSON blobs, page cache

2. HASH
   ─────────────────────────────────────────────────────────
   STORES:    Field→value pairs (string→string map) under one key
   KEY OPS:
     HSET key field value         → set one field
     HGET key field               → get one field
     HMSET key f1 v1 f2 v2        → set multiple fields
     HMGET key f1 f2              → get multiple fields
     HGETALL key                  → all fields and values
     HDEL key field               → delete a field
     HINCRBY key field N          → atomic increment field value
     HEXISTS key field            → check if field exists
   COMPLEXITY: O(1) per field operation
   USE FOR:  User sessions (each attribute = a field), object cache
             "user:1001" → {name:"Hruday", role:"admin", last_login:"..."}

3. LIST
   ─────────────────────────────────────────────────────────
   STORES:    Ordered sequence of strings. Duplicates allowed.
              Internally: linked list for large, ziplist for small.
   KEY OPS:
     LPUSH key val …              → push to LEFT (head) — O(1)
     RPUSH key val …              → push to RIGHT (tail) — O(1)
     LPOP key                     → pop from left — O(1)
     RPOP key                     → pop from right — O(1)
     LRANGE key start stop        → get range by index — O(N)
     LLEN key                     → count — O(1)
     BRPOP key timeout            → blocking pop (waits for data)
   USE FOR:
     - Producer/consumer queue: RPUSH (enqueue) + LPOP (dequeue)
     - Activity feed (latest 100 items): LPUSH + LTRIM to cap size
     - Task queues: BRPOP for workers that sleep until a job arrives

4. SET
   ─────────────────────────────────────────────────────────
   STORES:    Unique string members. Order NOT guaranteed.
   KEY OPS:
     SADD key member …            → add member(s) — O(1)
     SREM key member              → remove member — O(1)
     SISMEMBER key member         → is member in set? — O(1)
     SMEMBERS key                 → all members — O(N)
     SUNION k1 k2                 → union of two sets
     SINTER k1 k2                 → intersection of two sets
     SDIFF k1 k2                  → difference
     SCARD key                    → count members — O(1)
   USE FOR:
     - Tags: "article:42:tags" → {java, spring, interview}
     - Online users: SADD online_users "user:1001"
     - Friendship check: SISMEMBER "user:1001:friends" "user:2002"
     - Set operations: "users who bought A AND NOT B" → SDIFF

5. SORTED SET (ZSet)
   ─────────────────────────────────────────────────────────
   STORES:    Unique string members, each with a float score.
              Members are always ordered by score (lowest first).
              Internally: skip list + hash table (O(log N) insert).
   KEY OPS:
     ZADD key score member        → add/update member — O(log N)
     ZRANK key member             → rank (lowest score = rank 0)
     ZREVRANK key member          → rank (highest score = rank 0)
     ZSCORE key member            → get score
     ZRANGE key 0 9               → members by rank range (10 items)
     ZREVRANGE key 0 9            → reverse rank range (top 10)
     ZRANGEBYSCORE key min max    → members by score range
     ZREM key member              → remove member
     ZINCRBY key delta member     → increment score atomically
     ZCARD key                    → count — O(1)
   USE FOR:
     - Leaderboard: score = points, member = user_id
     - Delayed queue: score = Unix timestamp for "run at" time
     - Rate limiter: score = timestamp, member = request_id
       ZRANGEBYSCORE to count requests in last 60 seconds
```

### ASCII Diagram — Structure Summary

```
KEY                  STRUCTURE      INTERNAL IMPL
──────────────────────────────────────────────────
session:abc          STRING         SDS (Simple Dynamic String)
user:1001            HASH           ziplist → hashtable
"name" → "Hruday"
"role" → "admin"

feed:user:42         LIST           ziplist → quicklist (linked chunks)
[post5, post3, post1, ...]           LPUSH adds to head

article:1:tags       SET            listpack → hashtable
{java, spring, kafka}                SADD always unique

leaderboard          ZSET           listpack → skiplist + hashtable
user:42  → 98.5                     ZADD O(log N)
user:77  → 87.2                     ZREVRANK O(log N)
user:12  → 81.0
```

---

## 4. The Code

### Wrong Way — Using Strings Where Hash Fits Better

```java
// Wrong: storing user object as a single JSON string
String userJson = objectMapper.writeValueAsString(user);
redisTemplate.opsForValue().set("user:" + userId, userJson);

// Later: to update just the last_login field, you must:
// 1. GET the entire JSON string
// 2. Deserialize it
// 3. Modify one field
// 4. Re-serialize
// 5. SET the whole thing back
// This is expensive, error-prone, and has race conditions on concurrent updates.
```
> **Why this fails in production:** Two concurrent requests that each read, modify, and write back the JSON will overwrite each other's changes (last write wins). Deserializing a large JSON for a tiny field update wastes CPU and bandwidth.

### Right Way — Hash for Object Fields

```java
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class UserSessionService {

    private final RedisTemplate<String, String> redisTemplate;

    public UserSessionService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // Store user attributes as individual hash fields
    // Atomic partial update without touching other fields
    public void saveSession(String userId, String name, String role) {
        String key = "user:" + userId;
        redisTemplate.opsForHash().put(key, "name", name);
        redisTemplate.opsForHash().put(key, "role", role);
        redisTemplate.expire(key, Duration.ofHours(24)); // session TTL
    }

    // Read one field — no deserialization, no full fetch
    public String getRole(String userId) {
        return (String) redisTemplate.opsForHash()
            .get("user:" + userId, "role");
    }

    // Update just last_login — no read-modify-write cycle
    public void touchLogin(String userId) {
        redisTemplate.opsForHash().put(
            "user:" + userId,
            "last_login",
            Instant.now().toString()
        );
    }
}
```

### Right Way — ZSet for Leaderboard

```java
@Service
public class LeaderboardService {

    private static final String KEY = "leaderboard:global";
    private final RedisTemplate<String, String> redisTemplate;

    public LeaderboardService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    // ZINCRBY — atomically add points, no race condition
    public void addPoints(String userId, double points) {
        redisTemplate.opsForZSet().incrementScore(KEY, userId, points);
    }

    // Top N players — ZREVRANGE returns in descending score order
    public Set<ZSetOperations.TypedTuple<String>> getTopN(int n) {
        return redisTemplate.opsForZSet()
            .reverseRangeWithScores(KEY, 0, n - 1);
    }

    // Get rank of a specific user — 0-indexed, ZREVRANK = descending
    public Long getUserRank(String userId) {
        Long rank = redisTemplate.opsForZSet().reverseRank(KEY, userId);
        return rank != null ? rank + 1 : null; // convert to 1-indexed for UI
    }
}
```

### Right Way — List as a Bounded Activity Feed

```java
@Service
public class ActivityFeedService {

    private final RedisTemplate<String, String> redisTemplate;
    private static final int MAX_FEED_SIZE = 100;

    public ActivityFeedService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public void addActivity(String userId, String activityJson) {
        String key = "feed:" + userId;
        // Push to head of list (most recent first)
        redisTemplate.opsForList().leftPush(key, activityJson);
        // Trim to keep only last MAX_FEED_SIZE items
        // Without this trim, the list grows unbounded — memory leak
        redisTemplate.opsForList().trim(key, 0, MAX_FEED_SIZE - 1);
    }

    public List<String> getRecentFeed(String userId, int count) {
        return redisTemplate.opsForList()
            .range("feed:" + userId, 0, count - 1);
    }
}
```

> **Key decisions here:**
> - Hash over String for object updates: atomic field-level write, no read-modify-write cycle
> - ZSet ZINCRBY over ZADD for scores: ZINCRBY adds to existing score atomically; ZADD would require GET + ADD in application code (race condition)
> - LTRIM after LPUSH on feeds: prevents unbounded list growth — always pair these two operations
> - ZSet rank is 0-indexed: add 1 before showing to users

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What Redis data structure would you use to build a rate limiter that allows 100 requests per user per minute?"

**Hruday's answer:**
> I'd use a Sorted Set. The key is `rate:user:{userId}`, and each request is a member with the current Unix timestamp in milliseconds as its score. On each incoming request, I run three operations: ZADD to record the new request, ZREMRANGEBYSCORE to drop all members older than one minute (score < currentTime - 60000), and ZCARD to count the remaining members. If ZCARD exceeds 100, I reject the request.
>
> Why ZSet over a simple counter? A plain String with INCR and a 60-second TTL has a fixed-window problem — you can make 100 requests in the last second of the window and 100 more in the first second of the next window, slipping 200 past the limit. ZSet with timestamp scores implements a rolling window — every check looks at exactly the last 60 seconds of real time, regardless of minute boundaries.
>
> The entire three-command sequence must run in a Lua script on the Redis server to keep it atomic. Otherwise a race condition between ZCARD and ZADD lets two concurrent requests both read count=99 and both pass.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does a Redis Sorted Set work internally? Why is insertion O(log N) and not O(1)?"

**Hruday's answer:**
> Redis ZSet uses a skip list as its primary data structure, alongside a hash table. The hash table maps member → score in O(1). The skip list stores members sorted by score and is what enables the ordered operations — ZRANGE, ZREVRANGE, ZRANGEBYSCORE — in O(log N + K) time, where K is the number of elements returned.
>
> A skip list is a probabilistic data structure made of multiple layers. The bottom layer is a linked list of all elements in sorted order. Each layer above is a subset of the layer below, skipping over elements with roughly half the density each time. To insert a new element, Redis generates a random level for it and links it into the skip list at each level it belongs to. This is why insertion is O(log N) average — you skip through the levels like a binary search, updating pointers as you descend.
>
> For small ZSets (under 128 members with small values), Redis automatically uses a listpack (previously ziplist) — a compact memory-efficient encoding without the skip list overhead. Once the set grows past the threshold, Redis rebuilds it as a skip list. This is entirely automatic — you don't need to configure it. The trade-off is that listpack has O(N) operations because it lacks the skip list's fast search structure; but at small sizes, N is small enough that this is faster due to CPU cache locality.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT use Redis for data storage?"

**Hruday's answer:**
> Redis is wrong for data that must survive system failures with strong durability guarantees. Redis is primarily memory — even with AOF persistence, there's a window of data loss between the last write and the next sync to disk. For financial transactions, order records, or anything where loss of a single write has real-world consequences — use PostgreSQL, which writes to the WAL synchronously before acknowledging a commit.
>
> Redis is also wrong for large data volumes. If your dataset exceeds available RAM, Redis either fails (out of memory) or starts evicting data you didn't want evicted. PostgreSQL handles terabytes with disk-level storage. Redis makes sense for the hot working set — the 20% of data handling 80% of reads — not the full corpus.
>
> Redis is wrong for complex queries. You can't do: "find all users in the leaderboard whose score is above the average of their region, grouped by city." That requires a database. Redis structures are fast precisely because they are narrow — each structure serves a specific access pattern. Ad-hoc queries with multiple filters need a real relational or document database.
>
> The right architecture uses Redis as a complement to a primary database: Redis handles speed-layer access patterns, the database handles durability and complex queries.

---

### Q4 — Scenario
**Interviewer asks:** "Design the data model in Redis for a job queue where workers process tasks and some tasks should only run after a delay."

**Hruday's answer:**
> This requires two structures. For immediate tasks, a List is the right tool. Producers call RPUSH on a `queue:tasks` key. Workers call BLPOP — the blocking version of LPOP — which causes the worker to sleep until a task arrives and then wakes up and claims it atomically. BLPOP is exactly a blocking dequeue operation, safe for multiple concurrent workers because each BLPOP claims exactly one item.
>
> For delayed tasks, a ZSet is the right tool. The key is `queue:delayed`. When a task is scheduled for future execution, I ZADD it with the score set to the Unix timestamp when it should run. Example: ZADD queue:delayed 1720000000 "task:order_reminder:42" — this task should run at Unix time 1720000000.
>
> A separate scheduler process runs every second and checks: ZRANGEBYSCORE queue:delayed 0 {now} — this returns all tasks whose execution time has passed. For each result, the scheduler moves it from the ZSet to the List queue using a Lua script (keeping the transfer atomic). Workers then pick it up normally from the List.
>
> This is essentially how Sidekiq (Ruby) and Spring Batch delayed jobs work in Redis. The ZSet becomes a time-ordered priority queue where priority = execution time.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use a String and serialize to JSON" | "I'd store the user object as JSON in a String key" | "Fine for read-only caching. Not fine when individual fields need updating. A Hash lets you update a single field atomically without fetching the entire object. HSET user:1001 role admin touches only that field. With JSON you must GET, deserialize, modify, re-serialize, SET — and now you have a race condition between concurrent updaters." |
| "SMEMBERS to check membership" | "I'll call SMEMBERS to get all members and then check in code" | "SMEMBERS is O(N) — it returns every member. For membership check, SISMEMBER is O(1). This is the most common Redis Set mistake. If a set has 500K members and you call SMEMBERS to check if one user is in it, you're fetching 500K items for a single yes/no answer. Always use SISMEMBER for membership checks, SMEMBERS only when you genuinely need all members." |
| "ZSet rank is meaningful on its own" | "ZRANK returns the position, so rank 0 is the top player" | "ZRANK returns rank in ASCENDING order — rank 0 is the LOWEST score. ZREVRANK returns rank in DESCENDING order — rank 0 is the HIGHEST score. For a leaderboard where #1 = highest score, you want ZREVRANK. Mixing these up gives you an inverted leaderboard." |
| "Lists for unique event streams" | "I'll use a List as an event log per user" | "Lists allow duplicates. If a task is pushed twice (e.g., at-least-once delivery), it gets processed twice. A Set gives you uniqueness — but loses ordering. A ZSet with timestamp-as-score gives you both uniqueness and ordering. Choose based on whether duplicates are a real concern for your use case — and be explicit about your reasoning." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, we needed a way to show recently viewed items per user. The obvious approach was a database query with ORDER BY and LIMIT. I looked at Redis List — LPUSH the item ID when a user views it, LTRIM to keep only the last 20, LRANGE to read them back. The entire recent-items feature moved from a 50ms database round-trip to a 0.5ms Redis call. The most important thing I learned: you don't reach for Redis just for caching — you reach for it when the data structure itself does the work. The List with LTRIM IS the bounded sliding window. I didn't implement that logic — I just picked the right structure."

---

## 8. Scale Evolution

**1,000 users →** Single Redis instance, all five structures work fine. No tuning needed. Default maxmemory policy (noeviction) is acceptable. You'll likely be using String for most things.

**100,000 users →** ZSet leaderboards, List feeds, and Set membership checks become the dominant use cases. Start monitoring memory usage per key type with `redis-cli --bigkeys`. Set TTLs on temporary data. Move to Hash for user objects to reduce memory (Hash with small field counts uses compact ziplist encoding that is denser than separate String keys).

**10 million users →** Memory becomes the primary constraint. Redis Cluster (horizontally distributes keys across multiple nodes). Key design becomes critical: keys for the same user hash to the same slot using hash tags `{user:1001}:session`. ZSet leaderboards may be partitioned (top 10K users per shard, global top-N merged at application layer). Separate Redis instances per use case (sessions instance vs. leaderboard instance vs. feed instance) to isolate eviction and TTL policies.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Rate limiting, OTP storage, idempotency keys, merchant dashboard counters — all real Redis use cases at fintech. ZSet for rate limiting and Set for idempotency key deduplication come up in every systems design round. | "Design a rate limiter for our payment APIs. What Redis structure and what algorithm?" |
| Swiggy / Meesho | Real-time order tracking, driver location (Redis Geo), live feed of order events, active user counts — all use Redis structures beyond simple caching. ZSet for sorted leaderboards of top restaurants. | "How do you store and query active driver locations in Redis? What structure and commands?" |
| Adobe / Microsoft | Collaborative tools need shared state across users — ZSet for document event ordering, Set for active user presence, Hash for per-document metadata. | "Design the real-time presence indicator in a collaborative editor. Which Redis structure?" |
| SAP Labs (current) | Session management and dashboard state caching. Redis Hash for user session objects — faster partial updates than JSON String. | "How would you redesign session storage to avoid full-object reads on every session touch?" |

---

## 10. Related Topics — What to Study Next

- **Topic 102 — Redis as Cache (TTL, eviction policies)** — now that you know the structures, the next layer is how Redis manages memory when keys expire or the instance runs out of space
- **Topic 104 — Redis Distributed Lock (Redlock)** — builds directly on the SETNX String command shown here; understanding SETNX is prerequisite knowledge for the distributed lock algorithm
- **Topic 135 — Rate Limiting (token bucket, leaky bucket)** — rate limiting with ZSet is shown in Q1 above; this topic covers the mathematical algorithms behind it in more depth
- **Topic 160 — Redis as Distributed Cache** — covers cache-aside, read-through, write-through patterns that all rely on the String structure as their base

---

*Part 5 · Redis Data Structures — String, Hash, List, Set, ZSet · Full Stack Interview Guide · Hruday D · 2026*
