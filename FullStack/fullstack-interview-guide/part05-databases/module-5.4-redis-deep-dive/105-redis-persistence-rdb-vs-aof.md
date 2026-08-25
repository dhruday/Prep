# Redis Persistence — RDB vs AOF
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Redis is in-memory by default — if the process dies, all data is gone. Persistence is how Redis saves its data to disk so it can recover after a restart or crash.
- Two persistence modes: **RDB** (Redis DataBase) — a periodic snapshot of all data saved as a binary dump file; **AOF** (Append-Only File) — a log of every write command appended to a file, replayed on restart to rebuild the dataset.
- RDB trade-off: compact, fast to restore, but you lose all writes since the last snapshot (up to minutes of data loss on crash). AOF trade-off: very small data loss window (milliseconds with `fsync=everysec`), but larger file, slower recovery, slower write throughput.
- Production recommendation: **use both together** — RDB for fast recovery (load a snapshot, then replay only the small AOF diff since the snapshot) + AOF `fsync everysec` for durability with minimal write performance impact.
- For a pure cache where data loss is acceptable: **disable both** — no disk I/O, fastest possible performance. For any data you must keep (session tokens, distributed locks, leaderboards): enable persistence.
- Gap to bridge: candidates say "Redis has persistence" without knowing whether it's RDB or AOF, what the data loss window is for each, or how to configure them. Interviewers at fintech companies (Razorpay, PhonePe) specifically ask about persistence modes when you propose Redis for critical data.

---

## 1. One-Line Definition
Redis persistence is the mechanism by which Redis saves its in-memory dataset to disk — either as periodic full snapshots (RDB) or as a continuous log of every write operation (AOF) — so that data can be recovered after a Redis restart or machine failure.

---

## 2. The Problem It Solves

Redis runs entirely in RAM. This is why it's fast — no disk I/O on reads or writes. But RAM is volatile. Power goes out, process crashes, OS reboots — all your data is gone.

For a pure cache, this is fine. The cache was just a copy of database data anyway. On restart, the cache is empty (cold start) and re-warms as requests arrive. Acceptable inconvenience.

But now imagine you've stored distributed locks in Redis: all locks are gone on Redis restart, and processes that held locks when Redis died now continue executing the "locked" code without a lock — potential double execution. Imagine session tokens — all users are logged out on Redis restart. Imagine a leaderboard with 1 million updates since last night's backup — gone.

Persistence solves this by periodically (RDB) or continuously (AOF) writing data to disk. On restart, Redis reads the disk file and reconstructs the in-memory dataset. The difference between the two modes is: how much data can you lose, and how does it affect performance?

---

## 3. How It Works Internally

### The Mental Model
Imagine you're working on a long document. **RDB** is like saving the document every 15 minutes. If the computer crashes, you lose up to 15 minutes of work. But the save is fast (just writes the current state) and the file is compact.

**AOF** is like having Word record every keystroke and save it to a log file. If the computer crashes, you replay the keystrokes from the log and recover almost everything. The log file is larger than the document itself, but you lose at most the last 1 second of keystrokes (with fsync every second).

The best setup: use both. Load the compact RDB snapshot on startup (fast), then replay only the small AOF log of changes since the snapshot (fewer commands to replay → faster recovery).

### RDB — How It Works

```
TRIGGER: Time-based or manual BGSAVE / SAVE command
  save 900 1    → If at least 1 key changed in 900 seconds (15 min) → save
  save 300 10   → If at least 10 keys changed in 5 min → save
  save 60 10000 → If at least 10,000 keys changed in 1 min → save

MECHANISM:
1. BGSAVE command issued (background save)
2. Redis calls fork() — creates a child process that is a copy of the parent
   fork() uses copy-on-write: no actual data is duplicated at fork time
   Child process shares parent's memory pages until a write happens
3. Child process writes the entire dataset to a TEMP file (dump.rdb)
   Parent process continues serving requests normally
4. On writes during the save: the OS copies that page for the parent
   This is "copy-on-write" — only modified pages are duplicated
5. When child finishes: atomically replaces old dump.rdb with the new one
6. On restart: Redis loads dump.rdb into memory (full dataset in one go)

PROPERTIES:
+ Compact binary file (much smaller than AOF)
+ Very fast to load on startup (single pass over binary data)
+ No overhead during normal operation
- Data loss window = time since last snapshot (minutes)
- fork() can be slow on very large datasets (some milliseconds of latency spike)
```

### AOF — How It Works

```
MECHANISM:
Every write command (SET, HSET, ZADD, DEL, INCR…) is written to the AOF file.
Three fsync strategies control durability vs. performance:

  appendfsync always      → fsync after EVERY write
                            Zero data loss, but very slow (disk I/O on every write)
                            Use only for absolute maximum durability requirements

  appendfsync everysec    → fsync once per second (background)
                            At most 1 second of data loss on crash
                            Good throughput. Recommended for most cases.

  appendfsync no          → let the OS decide when to flush (usually every 30s)
                            Best performance, up to 30s data loss
                            Not recommended unless you're treating Redis as pure cache

AOF REWRITE (compaction):
Over time, the AOF file grows large. Example:
  INCR counter → writes "INCR counter" 1 million times
  The final state is just counter=1000000, but the AOF records all 1M commands.
  AOF rewrite compacts this: replaces the 1M commands with "SET counter 1000000"
  Triggered by: auto-aof-rewrite-percentage 100 (file doubled since last rewrite)
              OR manual: BGREWRITEAOF
  Same copy-on-write mechanism as RDB: child process does the rewrite,
  parent continues writing commands to the old AOF file
  When child finishes: the new compact AOF + the commands written during rewrite are merged

RECOVERY:
On restart: Redis replays ALL commands in the AOF file from the beginning.
If AOF is large (millions of commands), this takes seconds to minutes.
Hybrid mode (see below) solves this.

PROPERTIES:
+ Very small data loss window (1 second with everysec)
+ Human-readable commands file (can be inspected and even manually fixed)
- Larger file than RDB
- Slower recovery than RDB (must replay all commands)
- Slightly lower write throughput than no-persistence mode
```

### Hybrid RDB+AOF Mode (Best of Both Worlds)

```
aof-use-rdb-preamble yes   (default in Redis 7+)

STARTUP RECOVERY with hybrid mode:
1. AOF file starts with an RDB snapshot (fast binary load)
2. After the embedded RDB section, the AOF contains only the write commands
   that happened AFTER the snapshot
3. Redis loads the RDB portion first (fast binary deserialisation)
4. Then replays only the smaller set of AOF commands since the snapshot
5. Full dataset restored with minimal data loss

This is the recommended production configuration:
  save 3600 1        → RDB snapshot every hour (for fast cold recovery)
  appendonly yes     → AOF enabled
  appendfsync everysec  → 1-second data loss window max
  aof-use-rdb-preamble yes  → hybrid mode
```

### ASCII Diagram — Comparison

```
RDB (Snapshots):

Time ─────────────────────────────────────────────────────►
T=0:00  T=0:15  T=0:30  T=0:45  T=1:00  T=1:15
  │       │       │       │       │       │
  ▼       ▼       ▼       ▼       ▼       ▼
 [SNAP]  [SNAP]  [SNAP]  [SNAP]  [SNAP]  CRASH
                           │←──────────────┤
                                  Lost: 15 minutes of writes

AOF (appendfsync everysec):

Every second: writes are flushed to disk
T=1:14:59   T=1:15:00
    │             │
    ▼             ▼
  [fsync]      CRASH
                │←───┤ Lost: at most 1 second of writes

HYBRID MODE:

On restart:
AOF file = [RDB_SNAPSHOT_1H_AGO][commands since snapshot]
             fast binary load    fast replay of small diff
```

---

## 4. The Code

### Configuration — application.yml and redis.conf

```yaml
# Spring Boot application.yml
spring:
  data:
    redis:
      host: redis-host
      port: 6379
      # Redis persistence is configured on the Redis server, not the client.
      # These are Spring Boot connection settings only.
```

```bash
# redis.conf — server-side persistence configuration

# ─── RDB SNAPSHOTS ────────────────────────────────────────────────────────────
# Save if at least N keys changed in M seconds
save 3600 1     # at least 1 key changed in 1 hour
save 300 100    # at least 100 keys changed in 5 minutes
save 60 10000   # at least 10,000 keys changed in 1 minute

# To disable RDB: comment out all save lines or use: save ""
# save ""

# RDB file location
dbfilename dump.rdb
dir /var/lib/redis

# If RDB save fails: should Redis stop accepting writes?
# yes = safer (you hear about the problem). no = silently lose data.
stop-writes-on-bgsave-error yes

# ─── AOF ──────────────────────────────────────────────────────────────────────
appendonly yes
appendfilename "appendonly.aof"

# fsync strategy:
# always   = maximum durability, slowest
# everysec = recommended: 1-second data loss window, good performance
# no       = fastest, OS decides when to flush (risky)
appendfsync everysec

# AOF rewrite: compact the AOF when it grows by 100% since last rewrite
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb  # but only if AOF is at least 64MB

# ─── HYBRID MODE (Redis 7+, recommended) ─────────────────────────────────────
# AOF file starts with an RDB snapshot for fast startup
aof-use-rdb-preamble yes

# ─── MEMORY ───────────────────────────────────────────────────────────────────
# Always set a memory limit to prevent Redis consuming all server RAM
maxmemory 2gb

# For a primary data store (sessions, locks): never evict
maxmemory-policy noeviction

# For a pure cache: evict LRU keys
# maxmemory-policy allkeys-lru
```

### Wrong Way — Persistence Mismatch by Use Case

```bash
# Wrong: enabling both RDB and AOF for a pure session cache
# A session cache can be rebuilt from auth tokens after a restart.
# But now every write pays AOF disk flush cost — unnecessary overhead.
appendonly yes          # unneeded — sessions can be rebuilt
appendfsync always      # extreme overhead for a cache

# Also wrong: disabling persistence for Redis storing distributed locks
# Locks stored in Redis are gone after restart.
# Processes that held locks continue executing without holding them.
appendonly no           # dangerous if storing locks
save ""                 # dangerous if storing locks
```

### Right Way — Choose Configuration Based on Use Case

```bash
# SCENARIO A: Pure cache (product details, page content)
# Persistence OFF — cache can rebuild itself from the database
save ""                         # no RDB snapshots
appendonly no                   # no AOF
maxmemory 4gb
maxmemory-policy allkeys-lru    # evict LRU on memory pressure

# SCENARIO B: Session store + distributed locks (data must survive restart)
# Hybrid persistence for durability with fast restart
save 3600 1                     # hourly RDB backup for cold recovery
appendonly yes
appendfsync everysec            # 1-second data loss maximum
aof-use-rdb-preamble yes        # hybrid: fast RDB load + small AOF replay
maxmemory 2gb
maxmemory-policy noeviction     # never silently evict sessions or locks

# SCENARIO C: Rate counter store (e.g., INCR per user per minute)
# Counters reset on restart is acceptable. Pure cache semantics.
save ""
appendonly no
maxmemory 1gb
maxmemory-policy allkeys-lru
```

> **Key decisions here:**
> - Persistence mode must match the data's criticality — there is no one-size-fits-all
> - `noeviction` for session/lock stores — silent eviction of a session means random user logouts
> - `dir /var/lib/redis` must be a fast disk (SSD) — AOF fsync on a spinning disk can become a bottleneck
> - Monitor `bgsave_last_bgsave_status` and `aof_last_write_status` metrics — persistence failures in production are silent without monitoring

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are RDB and AOF in Redis? What's the main difference?"

**Hruday's answer:**
> RDB is a point-in-time snapshot of the entire Redis dataset. Redis forks a child process that writes the full in-memory state to a binary file called dump.rdb. The main process continues serving requests while this happens. The snapshot happens periodically — every few minutes, typically. On restart, Redis loads this file and the dataset is back in seconds.
>
> AOF is an append-only log of every write command. Every SET, HSET, ZADD, and DELETE gets appended to the AOF file. On restart, Redis replays all these commands from the beginning to rebuild the dataset.
>
> The main difference is the data loss window. With RDB, you lose all writes since the last snapshot — potentially up to 15 minutes. With AOF and `appendfsync everysec`, you lose at most 1 second of writes because the AOF is flushed to disk every second.
>
> The trade-off is startup speed and file size. RDB loads very fast — it's a compact binary format. AOF replay is slower, especially if the file has millions of commands. The recommended production setup is to use BOTH: RDB for fast recovery from a clean snapshot, AOF for minimising data loss. Redis 7's hybrid mode embeds an RDB snapshot at the start of the AOF file, giving you fast startup AND small data loss in one configuration.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Redis avoid blocking the main thread while saving an RDB snapshot? Explain the fork mechanism."

**Hruday's answer:**
> Redis calls `fork()` — a Unix system call that creates a child process that is initially a copy of the parent. The key efficiency is copy-on-write memory. At the moment of fork, no memory is actually copied. The parent and child share the same physical memory pages.
>
> The child process then iterates through the shared memory and writes all keys to the dump.rdb file. The parent process continues serving client requests as normal.
>
> When the parent needs to modify any memory page — because a client sent a write command — the OS copies that specific page and gives the parent its own fresh copy to modify. The child continues reading the original page. Only the pages that are written to by the parent during the snapshot get duplicated.
>
> For a read-heavy workload (which most caches are), very few pages get modified during the snapshot window, so the extra memory usage is minimal. For a write-heavy workload, a large fraction of pages get copied during the snapshot — the worst case is nearly doubling the memory usage during a fork. This is why very write-heavy Redis instances need to provision extra RAM headroom for the bgsave fork to avoid OOM.
>
> The fork itself can cause a brief pause on the main thread — typically a few milliseconds for each gigabyte of data. For a 10GB Redis instance, fork might pause the main thread for 10-50ms depending on the OS and hardware. This is worth monitoring on large Redis instances.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Would you use Redis as a primary database with AOF enabled? Why or why not?"

**Hruday's answer:**
> For some use cases, yes — with careful consideration. Redis with AOF `everysec` gives you at most 1 second of data loss, which is acceptable for many types of data: session tokens, feature flags, rate limit counters, leaderboards. These can tolerate brief staleness or loss of the last second's changes.
>
> But Redis is not a suitable primary database for financial or transactional data. Even with AOF `always` (fsync after every write — maximum durability), Redis is single-threaded for writes, runs entirely in RAM, and lacks PostgreSQL's multi-version concurrency control, strong transactional atomicity, and battle-tested durability mechanisms. You also lose ad-hoc query capability — no JOINs, no WHERE clauses with multiple conditions, no aggregations over the dataset.
>
> The right mental model: Redis is excellent as a primary store for data that fits its data structures (simple key-value, sorted sets, lists) AND where the data can be recreated from another source if Redis fails (cache data), OR where small data loss is acceptable AND the data doesn't need relational queries.
>
> For anything requiring joins, complex queries, multi-row ACID transactions, or zero tolerance for data loss — use PostgreSQL as the primary database. Redis excels as the speed layer adjacent to that primary database, not as a replacement for it.

---

### Q4 — Scenario
**Interviewer asks:** "You're building a ride-sharing app. How would you configure Redis persistence for the driver location store vs. the session token store?"

**Hruday's answer:**
> These two use cases have completely different persistence requirements.
>
> Driver locations: GPS coordinates update every 5-10 seconds per driver. If Redis restarts, the driver apps immediately push their current location and the store re-populates within seconds. Data is also redundant — the source of truth is the driver's device. So this is perfect for **no persistence**: `save ""` and `appendonly no`. Maximum write performance, zero disk I/O overhead, fast restart (empty store that fills itself quickly from live drivers).
>
> Session tokens: if Redis restarts and I lose all session tokens, every logged-in user is immediately logged out. At scale — say 500K active sessions — that's 500K users seeing a logout screen simultaneously. Trust damage, support tickets, bad user experience. Session tokens should use **hybrid persistence**: `appendonly yes`, `appendfsync everysec`, `aof-use-rdb-preamble yes`. At most 1 second of sessions lost on crash. Fast startup: load the RDB preamble, then replay the small AOF delta. Most sessions survive a restart.
>
> I would run these as separate Redis instances — or at minimum separate logical databases within the same instance — with different configurations. If the session store and location store share an instance with location writes at 100K/second, the I/O overhead of AOF `everysec` affects the location store unnecessarily.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Redis is in-memory so it loses all data on restart" | "Redis doesn't persist so you can only use it as a cache" | "Redis has two persistence mechanisms — RDB and AOF — that can keep data through restarts. With AOF `everysec`, you lose at most 1 second of data on a crash. Redis is used as a primary store for session tokens, distributed locks, leaderboards, and rate limit counters by companies at massive scale. The choice of whether to enable persistence depends on what that data is and how much loss you can tolerate." |
| "RDB is slow because of snapshotting" | "RDB blocks Redis while saving" | "RDB uses fork() to create a child process that does the saving. The main Redis process continues serving requests. The only blocking moment is the fork() call itself, which takes a few milliseconds per GB of data. The snapshot itself — which takes seconds to minutes — happens entirely in the background. The performance impact on read/write throughput during a snapshot is typically minimal for read-heavy workloads." |
| "AOF always causes a performance hit" | "Don't use AOF because it slows down writes" | "The performance impact depends entirely on the fsync strategy. AOF with `appendfsync no` (let the OS decide) has essentially zero overhead. AOF with `appendfsync everysec` has a very small overhead — one background fsync per second — that is undetectable in most workloads. AOF with `appendfsync always` is slow — a disk flush after every command. Use `everysec` and the overhead is negligible for the durability you gain." |
| "Just max out memory and don't think about eviction" | "I'll set maxmemory to 64GB and won't need eviction" | "Without a meaningful maxmemory limit, Redis competes with other processes for system memory. At 95% system memory usage, the OS starts swapping to disk — and a Redis process that starts swapping is catastrophically slow (milliseconds become seconds). Always set maxmemory to leave at least 20% headroom for the OS, fork() copy-on-write overhead, and other processes. For session/lock stores with noeviction: monitor memory and provision capacity before it fills up." |

---

## 7. Hruday's Real Experience Hook

> "This is a topic I've studied specifically after identifying it as a gap. At SAP Labs, Redis was used for session management but I never looked closely at whether persistence was configured. In hindsight: if we were using default Redis settings without AOF, a Redis restart would have logged out all active users. The production Redis instances almost certainly had AOF configured by the infrastructure team, but I couldn't tell you for certain that day. I now know: any Redis instance storing sessions or locks needs AOF `everysec` at minimum. Pure cache instances should have persistence disabled for maximum write performance. Running SESSION and CACHE data on the same Redis instance with the wrong persistence setting would compromise one or the other — they should be on separate instances."

---

## 8. Scale Evolution

**1,000 users →** Single Redis instance, default settings with AOF `everysec` are fine. RDB daily backup to S3 for disaster recovery. No tuning needed.

**100,000 users →** Monitor `rdb_last_bgsave_time_sec` and `aof_current_size`. If fork() takes > 100ms, instrument memory pressure. Separate instances for cache (no persistence) vs. durable data (AOF). Regular backup of RDB files to object storage (S3/GCS) for point-in-time recovery.

**10 million users →** Redis Cluster with persistence configured per node. Asynchronous replication: replica follows primary's AOF. Automated RDB backup pipeline on each node. Benchmark fork() latency — very large instances (100GB+) may need persistence offloaded to a dedicated replica where the primary serves reads/writes without fork() overhead. Consider Redis Enterprise or ElastiCache for managed persistence and automatic failover.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Idempotency keys and rate limit counters in Redis must survive restarts. Loss of idempotency keys means risk of duplicate payment processing. AOF persistence is critical. | "If your Redis holding idempotency keys restarts mid-night, what data is lost and how does that affect payment processing?" |
| Swiggy / Meesho | Session tokens for millions of logged-in users. A Redis restart without persistence = mass logout event. Must be AOF-enabled. Driver location data is fine without persistence. | "How would you configure persistence differently for your session Redis vs. your real-time location Redis?" |
| Adobe / Microsoft | Creative cloud session and auth token storage. Enterprise customers expect zero unexpected logouts. AOF with everysec plus snapshots to cloud storage. | "What is your Redis disaster recovery strategy for the session store that keeps 10M enterprise users authenticated?" |
| SAP Labs (current) | Reference data and user session caching. Whether persistence is enabled or not has direct impact on user experience on restart. | "How do you ensure a Redis pod restart in Kubernetes doesn't log out all active users?" |

---

## 10. Related Topics — What to Study Next

- **Topic 102 — Redis as Cache (TTL, Eviction)** — covers the memory management side; persistence and eviction are complementary concerns for production Redis configuration
- **Topic 104 — Redis Distributed Lock** — distributed locks stored in Redis are particularly sensitive to persistence settings; a Redis restart that loses lock state can break the mutual exclusion guarantee
- **Topic 152 — Disaster Recovery (RPO vs RTO)** — Redis persistence choices directly set your RPO (Recovery Point Objective — how much data you can lose) and RTO (Recovery Time Objective — how quickly you can be back up); these terms come up when justifying persistence to stakeholders
- **Topic 186 — Kubernetes Deployments** — Redis in Kubernetes with persistent volumes (PVC) ensures the AOF/RDB files survive pod restarts; understanding persistence is prerequisite for correctly configuring Redis in K8s

---

*Part 5 · Redis Persistence — RDB vs AOF · Full Stack Interview Guide · Hruday D · 2026*
