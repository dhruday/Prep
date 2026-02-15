# 20. Read vs Write Ratios

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Read vs Write Ratio** describes the proportion of read operations (fetching data) to write operations (creating/updating data) in your system.

### What It Is
- **Read operations**: GET requests, SELECT queries, cache lookups, data retrieval
- **Write operations**: POST/PUT/DELETE requests, INSERT/UPDATE queries, data modifications
- **Ratio format**: "100:1 read:write" means 100 reads for every 1 write

### Why It Exists
Understanding your read/write ratio determines:
- **Database architecture** (replicas, sharding strategy)
- **Caching strategy** (what to cache, cache invalidation)
- **Consistency requirements** (eventual vs strong)
- **Infrastructure optimization** (read replicas vs write scaling)

### The Problem It Solves
Different ratios require fundamentally different architectures:
- **High read ratio (100:1)**: Focus on caching, read replicas
- **Balanced ratio (10:1)**: Careful trade-offs needed
- **High write ratio (1:10)**: Focus on write throughput, async processing

### Where and When It's Used
- **System design interviews**: First question to ask after requirements
- **Database selection**: SQL vs NoSQL vs time-series
- **Scaling decisions**: When to add read replicas vs sharding
- **Cost optimization**: Where to invest infrastructure budget

### Its Role in Large-Scale Distributed Systems
At FAANG scale, read/write ratio directly influences:
- **Facebook**: 1000:1 (mostly reading feeds) → Heavy caching
- **Twitter**: 300:1 → Fan-out on write vs read trade-offs
- **Uber**: 10:1 → More writes due to constant location updates
- **WhatsApp**: 1:1 → Nearly equal reads and writes for messaging

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### System Types by Read/Write Ratio

```
┌─────────────────────────────────────────────────────────────────────┐
│              READ/WRITE RATIO SPECTRUM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  EXTREMELY READ-HEAVY (1000:1 to 100:1)                             │
│  ───────────────────────────────────────                            │
│  • News websites, blogs                                             │
│  • CDN-served content                                               │
│  • Static content platforms                                         │
│  • API documentation sites                                          │
│                                                                      │
│  READ-HEAVY (100:1 to 10:1)                                         │
│  ──────────────────────────                                         │
│  • Social media feeds (Facebook, Instagram)                        │
│  • E-commerce product catalogs                                     │
│  • Search engines                                                   │
│  • Video streaming metadata                                         │
│                                                                      │
│  BALANCED (10:1 to 1:1)                                             │
│  ──────────────────────                                             │
│  • Messaging apps (WhatsApp, Slack)                                │
│  • Real-time gaming                                                 │
│  • Collaborative editing (Google Docs)                             │
│  • E-commerce transactions                                          │
│                                                                      │
│  WRITE-HEAVY (1:1 to 1:10)                                          │
│  ─────────────────────────                                          │
│  • IoT sensor data                                                  │
│  • Log aggregation systems                                          │
│  • Real-time location tracking                                      │
│  • Analytics event collection                                       │
│                                                                      │
│  EXTREMELY WRITE-HEAVY (1:10 to 1:100)                              │
│  ──────────────────────────────────────                             │
│  • Time-series databases                                            │
│  • Financial tick data                                              │
│  • Telemetry ingestion                                              │
│  • CDC (Change Data Capture) systems                               │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Architecture Patterns by Ratio

```
┌─────────────────────────────────────────────────────────────────────┐
│              READ-HEAVY ARCHITECTURE (100:1)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Clients                                                            │
│      │                                                               │
│      ▼                                                               │
│   ┌─────────────────┐                                               │
│   │       CDN       │  ← Static content (images, JS, CSS)           │
│   └────────┬────────┘                                               │
│            │                                                         │
│            ▼                                                         │
│   ┌─────────────────┐                                               │
│   │  Load Balancer  │                                               │
│   └────────┬────────┘                                               │
│            │                                                         │
│   ┌────────┼────────┬────────┬────────┐                             │
│   ▼        ▼        ▼        ▼        ▼                             │
│ ┌───┐   ┌───┐   ┌───┐   ┌───┐   ┌───┐                              │
│ │API│   │API│   │API│   │API│   │API│  ← Many API servers          │
│ └─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘   └─┬─┘                              │
│   │       │       │       │       │                                 │
│   └───────┴───────┼───────┴───────┘                                │
│                   ▼                                                  │
│   ┌───────────────────────────────────┐                             │
│   │         REDIS CACHE CLUSTER       │  ← 95%+ reads from cache   │
│   │      (10+ nodes, distributed)     │                             │
│   └───────────────┬───────────────────┘                             │
│                   │ Cache miss (5%)                                 │
│                   ▼                                                  │
│   ┌───────────────────────────────────┐                             │
│   │    Primary (writes only)          │                             │
│   └───────────────┬───────────────────┘                             │
│                   │ Replication                                     │
│   ┌───────────────┼───────────────────┐                             │
│   ▼               ▼                   ▼                             │
│ ┌─────┐       ┌─────┐            ┌─────┐                            │
│ │Read │       │Read │            │Read │  ← Many read replicas     │
│ │Repl │       │Repl │            │Repl │                            │
│ └─────┘       └─────┘            └─────┘                            │
│                                                                      │
│   KEY STRATEGIES:                                                    │
│   • Aggressive caching (95%+ hit rate)                              │
│   • Multiple read replicas                                          │
│   • CDN for static assets                                           │
│   • Cache-aside or read-through patterns                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              WRITE-HEAVY ARCHITECTURE (1:10)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Data Sources (IoT, Apps, Services)                                │
│      │                                                               │
│      ▼                                                               │
│   ┌─────────────────────────────────────────┐                       │
│   │           KAFKA / KINESIS               │  ← Buffer writes      │
│   │        (Partitioned by key)             │                       │
│   └─────────────────┬───────────────────────┘                       │
│                     │                                                │
│   ┌─────────────────┼─────────────────┐                             │
│   ▼                 ▼                 ▼                             │
│ ┌───────┐       ┌───────┐       ┌───────┐                          │
│ │Worker │       │Worker │       │Worker │  ← Parallel consumers    │
│ │ Pool  │       │ Pool  │       │ Pool  │                          │
│ └───┬───┘       └───┬───┘       └───┬───┘                          │
│     │               │               │                               │
│     └───────────────┼───────────────┘                               │
│                     │                                                │
│   ┌─────────────────┼─────────────────┐                             │
│   ▼                 ▼                 ▼                             │
│ ┌─────────┐   ┌─────────┐   ┌─────────┐                            │
│ │ Shard 1 │   │ Shard 2 │   │ Shard 3 │  ← Horizontally sharded   │
│ │(Writes) │   │(Writes) │   │(Writes) │                            │
│ └─────────┘   └─────────┘   └─────────┘                            │
│                                                                      │
│   KEY STRATEGIES:                                                    │
│   • Message queues to buffer writes                                 │
│   • Batch writes for efficiency                                     │
│   • Horizontal sharding from day 1                                  │
│   • Eventual consistency acceptable                                 │
│   • Append-only data structures (LSM trees)                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│              BALANCED ARCHITECTURE (5:1 to 1:1)                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────────────────────────────┐               │
│   │              Load Balancer                      │               │
│   └───────────────────────┬─────────────────────────┘               │
│                           │                                          │
│   ┌───────────────────────┼───────────────────────┐                 │
│   ▼                       ▼                       ▼                 │
│ ┌─────┐               ┌─────┐               ┌─────┐                │
│ │ API │               │ API │               │ API │                │
│ └──┬──┘               └──┬──┘               └──┬──┘                │
│    │                     │                     │                    │
│    └──────────┬──────────┴──────────┬──────────┘                   │
│               │                     │                               │
│               ▼                     ▼                               │
│   ┌───────────────────┐   ┌───────────────────┐                    │
│   │   REDIS CACHE     │   │   MESSAGE QUEUE   │                    │
│   │   (Read cache)    │   │   (Write buffer)  │                    │
│   └─────────┬─────────┘   └─────────┬─────────┘                    │
│             │                       │                               │
│             │ Cache miss            │ Async write                  │
│             ▼                       ▼                               │
│   ┌───────────────────────────────────────────────┐                │
│   │              SHARDED DATABASE                  │                │
│   │   (Multiple masters, each handling writes)    │                │
│   └───────────────────────────────────────────────┘                │
│                                                                      │
│   KEY STRATEGIES:                                                    │
│   • Cache for reads, queue for writes                              │
│   • CQRS (Command Query Responsibility Segregation)                │
│   • Eventual consistency with conflict resolution                  │
│   • Smart routing based on operation type                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Database Selection by Ratio

```
┌─────────────────────────────────────────────────────────────────────┐
│              DATABASE CHOICE BY READ/WRITE RATIO                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  RATIO        │ BEST DATABASE CHOICES     │ WHY                     │
│  ─────────────│───────────────────────────│─────────────────────────│
│               │                           │                         │
│  1000:1       │ CDN + Static files        │ No DB needed for most   │
│  (read-only)  │                           │ requests                │
│               │                           │                         │
│  100:1        │ PostgreSQL + Redis        │ Cache handles reads,    │
│  (read-heavy) │ with many read replicas   │ replicas for overflow   │
│               │                           │                         │
│  50:1         │ PostgreSQL/MySQL +        │ Standard RDBMS with     │
│               │ Read replicas + Redis     │ caching layer           │
│               │                           │                         │
│  10:1         │ PostgreSQL sharded or     │ Need write capacity     │
│               │ MongoDB/Cassandra         │ but still cache reads   │
│               │                           │                         │
│  5:1          │ Cassandra / DynamoDB      │ Distributed writes      │
│  (balanced)   │ with caching              │ becoming important      │
│               │                           │                         │
│  1:1          │ Cassandra / ScyllaDB      │ Both read and write     │
│  (equal)      │ or Kafka + KSQL           │ optimization needed     │
│               │                           │                         │
│  1:5          │ Kafka + ClickHouse        │ Optimized for ingestion │
│  (write-heavy)│ or TimescaleDB            │                         │
│               │                           │                         │
│  1:100        │ Kafka + InfluxDB          │ Append-only, time-series│
│  (write-only) │ or QuestDB                │ optimized               │
│               │                           │                         │
└─────────────────────────────────────────────────────────────────────┘
```

### Caching Strategy by Ratio

```
┌─────────────────────────────────────────────────────────────────────┐
│              CACHING PATTERNS BY READ/WRITE RATIO                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  READ-HEAVY (100:1):                                                │
│  ───────────────────                                                │
│  Pattern: Cache-Aside (Lazy Loading)                                │
│                                                                      │
│  Read:                          Write:                              │
│  1. Check cache                 1. Write to DB                      │
│  2. If miss, read DB            2. Invalidate cache                 │
│  3. Populate cache              (or update cache)                   │
│  4. Return data                                                     │
│                                                                      │
│  Cache TTL: Long (hours to days)                                    │
│  Consistency: Eventually consistent (acceptable)                   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BALANCED (10:1):                                                    │
│  ────────────────                                                   │
│  Pattern: Write-Through or Write-Behind                             │
│                                                                      │
│  Write-Through:                 Write-Behind:                       │
│  1. Write to cache              1. Write to cache                   │
│  2. Cache writes to DB          2. Return immediately               │
│  3. Return to client            3. Async write to DB               │
│  (synchronous)                  (asynchronous)                      │
│                                                                      │
│  Cache TTL: Medium (minutes to hours)                               │
│  Consistency: Write-through = strong, Write-behind = eventual     │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WRITE-HEAVY (1:10):                                                │
│  ───────────────────                                                │
│  Pattern: Write Buffer / Queue                                      │
│                                                                      │
│  1. Write to message queue (Kafka)                                 │
│  2. Batch process writes                                           │
│  3. Bulk insert to database                                        │
│  4. Cache only hot data for reads                                  │
│                                                                      │
│  Cache TTL: Short or no caching (data changes constantly)          │
│  Consistency: Eventual (often minutes of lag acceptable)           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### Calculating Infrastructure Needs

**Example: E-commerce Platform**

```
GIVEN:
──────
Total QPS: 100,000
Read/Write Ratio: 50:1

BREAKDOWN:
──────────
Total = Read + Write = 100,000
Read = 50x, Write = 1x
Read + Write = 51x = 100,000
Write QPS = 100,000 / 51 ≈ 1,960
Read QPS = 1,960 × 50 ≈ 98,040

READ PATH SIZING:
─────────────────
Read QPS: 98,000
Cache hit rate: 90%
  - Cache serves: 88,200 QPS
  - DB serves: 9,800 QPS

Cache cluster:
  - Redis capacity: 50,000 QPS per node
  - Nodes needed: 88,200 / 50,000 ≈ 2 nodes
  - With redundancy: 4 nodes (2 primary + 2 replica)

Read replicas:
  - PostgreSQL: 5,000 QPS per replica
  - Replicas needed: 9,800 / 5,000 ≈ 2 replicas
  - With redundancy: 4 replicas

WRITE PATH SIZING:
──────────────────
Write QPS: 1,960
Single PostgreSQL master: handles up to 10,000 write QPS
  → 1 master is sufficient
  
Replication:
  - Synchronous: 1 standby for HA
  - Async: 4 read replicas (already counted above)

TOTAL DATABASE INSTANCES:
─────────────────────────
1 primary + 1 sync standby + 4 read replicas = 6 instances
```

### Cost Impact of Read/Write Ratio

```
┌─────────────────────────────────────────────────────────────────────┐
│              COST OPTIMIZATION BY RATIO                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  READ-HEAVY SYSTEM (100:1):                                         │
│  ──────────────────────────                                         │
│  Where money goes:                                                  │
│    • CDN bandwidth (40%)                                            │
│    • Cache infrastructure (30%)                                     │
│    • Read replicas (20%)                                            │
│    • Primary DB (10%)                                               │
│                                                                      │
│  Optimization strategy:                                             │
│    • Maximize cache hit rate (save DB costs)                       │
│    • Use cheaper storage for read replicas                         │
│    • CDN for static content                                        │
│                                                                      │
│  WRITE-HEAVY SYSTEM (1:10):                                         │
│  ──────────────────────────                                         │
│  Where money goes:                                                  │
│    • Write-optimized storage (40%)                                 │
│    • Kafka/queue infrastructure (25%)                              │
│    • Compute for processing (25%)                                  │
│    • Read caching (10%)                                            │
│                                                                      │
│  Optimization strategy:                                             │
│    • Batch writes (reduce IOPS)                                    │
│    • Use append-only storage (cheaper)                             │
│    • Cold storage for old data                                     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Schema Design by Ratio

```
┌─────────────────────────────────────────────────────────────────────┐
│              SCHEMA OPTIMIZATION BY RATIO                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  READ-HEAVY:                                                         │
│  ───────────                                                        │
│  • Denormalize for faster reads                                    │
│  • Pre-compute aggregations                                        │
│  • Materialized views                                               │
│  • Compound indexes for common queries                             │
│                                                                      │
│  Example - Social Media Post:                                       │
│  ┌────────────────────────────────────────┐                        │
│  │ posts (denormalized)                   │                        │
│  │ - id                                   │                        │
│  │ - content                              │                        │
│  │ - author_id                            │                        │
│  │ - author_name ← denormalized          │                        │
│  │ - author_avatar_url ← denormalized    │                        │
│  │ - like_count ← pre-computed           │                        │
│  │ - comment_count ← pre-computed        │                        │
│  └────────────────────────────────────────┘                        │
│  Reads: 1 query fetches everything                                 │
│  Writes: Must update multiple places (acceptable trade-off)        │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WRITE-HEAVY:                                                        │
│  ────────────                                                       │
│  • Normalize to minimize write amplification                       │
│  • Minimal indexes (each index = write overhead)                   │
│  • Append-only patterns                                            │
│  • Partition by time for easy archival                             │
│                                                                      │
│  Example - Event Logging:                                           │
│  ┌────────────────────────────────────────┐                        │
│  │ events (normalized, append-only)       │                        │
│  │ - id (UUID, no auto-increment)         │                        │
│  │ - timestamp                            │                        │
│  │ - event_type                           │                        │
│  │ - user_id                              │                        │
│  │ - payload (JSON)                       │                        │
│  │ PARTITION BY RANGE (timestamp)         │                        │
│  └────────────────────────────────────────┘                        │
│  Writes: Fast appends, no locking                                  │
│  Reads: May require joins (acceptable trade-off)                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Indexing Strategy by Ratio

```
READ-HEAVY (100:1):
───────────────────
• Many indexes are acceptable (reads benefit, writes are rare)
• Covering indexes for common queries
• Partial indexes for filtered queries
• Full-text indexes for search

Example:
  CREATE INDEX idx_posts_user ON posts(user_id);
  CREATE INDEX idx_posts_created ON posts(created_at DESC);
  CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
  CREATE INDEX idx_posts_popular ON posts(like_count DESC) WHERE like_count > 100;

WRITE-HEAVY (1:10):
───────────────────
• Minimal indexes (each index slows writes)
• Only essential indexes for constraints
• Consider no secondary indexes at all
• Build indexes async during off-peak

Example:
  -- Only primary key, no secondary indexes
  CREATE TABLE events (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ,
    data JSONB
  );
  -- Queries use time-based partitioning instead of indexes
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Consistency Trade-offs by Ratio

```
┌─────────────────────────────────────────────────────────────────────┐
│              CONSISTENCY MODELS BY RATIO                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  READ-HEAVY (100:1):                                                │
│  ───────────────────                                                │
│  • Eventual consistency usually acceptable                          │
│  • Stale reads OK (cached data might be seconds old)               │
│  • Replication lag tolerable                                        │
│                                                                      │
│  Consistency settings:                                               │
│    Reads: From any replica (eventually consistent)                  │
│    Writes: To primary with async replication                       │
│    Cache: TTL-based invalidation (not real-time)                   │
│                                                                      │
│  WRITE-HEAVY (1:10):                                                │
│  ───────────────────                                                │
│  • Often needs stronger consistency                                │
│  • Order matters (event sourcing)                                  │
│  • Idempotency critical                                            │
│                                                                      │
│  Consistency settings:                                               │
│    Writes: Acknowledged before returning                           │
│    Ordering: Kafka partitions by key                               │
│    Deduplication: Built into processing                            │
│                                                                      │
│  BALANCED (10:1):                                                    │
│  ────────────────                                                   │
│  • Read-your-writes consistency important                          │
│  • Session stickiness may be needed                                │
│  • Careful cache invalidation                                       │
│                                                                      │
│  Consistency settings:                                               │
│    Reads: From primary or sync replica for own data                │
│    Reads: From any replica for others' data                        │
│    Writes: Synchronous to primary + 1 replica                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Failure Handling by Ratio

```
┌─────────────────────────────────────────────────────────────────────┐
│              FAILURE SCENARIOS BY RATIO                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  READ-HEAVY SYSTEM - PRIMARY DB FAILS:                              │
│  ─────────────────────────────────────                              │
│  Impact: Writes blocked, but reads continue from replicas/cache    │
│  Response:                                                           │
│    1. Promote replica to primary                                   │
│    2. Reads: 0% degradation (cache + replicas)                     │
│    3. Writes: Queue in memory/Kafka, replay after recovery         │
│  Recovery time: Can be slow (writes are 1% of traffic)             │
│                                                                      │
│  WRITE-HEAVY SYSTEM - PRIMARY DB FAILS:                             │
│  ──────────────────────────────────────                             │
│  Impact: Critical - majority of operations fail                    │
│  Response:                                                           │
│    1. IMMEDIATE failover (automated)                               │
│    2. Kafka buffers writes during failover                         │
│    3. Process backlog after recovery                               │
│  Recovery time: Must be fast (<30 seconds)                         │
│                                                                      │
│  READ-HEAVY SYSTEM - CACHE FAILS:                                   │
│  ────────────────────────────────                                   │
│  Impact: Critical - DB gets 10-100x normal load                    │
│  Response:                                                           │
│    1. Rate limit requests to protect DB                            │
│    2. Serve degraded responses                                     │
│    3. Rebuild cache gradually (thundering herd prevention)         │
│  Prevention: Cache clustering, replication                          │
│                                                                      │
│  WRITE-HEAVY SYSTEM - QUEUE FAILS:                                  │
│  ─────────────────────────────────                                  │
│  Impact: Critical - writes buffer in memory, risk of data loss    │
│  Response:                                                           │
│    1. Spill to disk or secondary queue                             │
│    2. Backpressure to slow incoming writes                         │
│    3. Alert immediately                                            │
│  Prevention: Queue replication (Kafka RF=3)                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### Rate Limiting by Operation Type

```
┌─────────────────────────────────────────────────────────────────────┐
│              RATE LIMITING STRATEGY                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  PRINCIPLE: Limit writes more aggressively than reads               │
│                                                                      │
│  READ-HEAVY API (Social Media):                                     │
│  ──────────────────────────────                                     │
│  GET /feed          │ 100 requests/minute │ High limit             │
│  GET /posts/{id}    │ 200 requests/minute │ Very high (cacheable)  │
│  GET /search        │ 30 requests/minute  │ Expensive operation    │
│  POST /posts        │ 10 requests/minute  │ Writes are costly      │
│  POST /comments     │ 20 requests/minute  │ Moderate writes        │
│                                                                      │
│  WRITE-HEAVY API (Analytics):                                        │
│  ─────────────────────────────                                      │
│  POST /events       │ 1000 requests/sec   │ High (ingestion)       │
│  POST /batch-events │ 10 requests/sec     │ Batched is preferred   │
│  GET /reports       │ 10 requests/minute  │ Expensive aggregations │
│                                                                      │
│  COST WEIGHTING:                                                     │
│  ───────────────                                                    │
│  Some systems use "cost" instead of raw counts:                    │
│    GET /feed = 1 credit                                            │
│    POST /post = 10 credits                                         │
│    POST /upload = 100 credits                                      │
│  User has 1000 credits/minute                                      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Case Study: Twitter's Fan-Out Decision

```
┌─────────────────────────────────────────────────────────────────────┐
│              TWITTER: FAN-OUT ON WRITE VS READ                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THE PROBLEM:                                                        │
│  ────────────                                                       │
│  User tweets → Followers see it in timeline                        │
│  Average user: 200 followers                                        │
│  Celebrity: 50 million followers                                    │
│                                                                      │
│  OPTION 1: FAN-OUT ON WRITE (Write-Heavy)                          │
│  ─────────────────────────────────────────                          │
│  When user tweets:                                                  │
│    1. Write tweet to tweets table                                  │
│    2. Look up all followers                                        │
│    3. Write tweet ID to each follower's timeline cache            │
│                                                                      │
│  Write cost: 1 tweet = 200 writes (average user)                   │
│              1 tweet = 50 million writes (celebrity)               │
│                                                                      │
│  Read cost: 1 query to get timeline (fast!)                        │
│                                                                      │
│  OPTION 2: FAN-OUT ON READ (Read-Heavy)                            │
│  ──────────────────────────────────────                            │
│  When user reads timeline:                                          │
│    1. Look up all followed users                                   │
│    2. Fetch recent tweets from each                                │
│    3. Merge and sort                                               │
│                                                                      │
│  Write cost: 1 tweet = 1 write (simple!)                           │
│  Read cost: 1 read = 200 queries (following 200 people)            │
│                                                                      │
│  TWITTER'S SOLUTION: HYBRID                                         │
│  ──────────────────────────                                        │
│  • Regular users: Fan-out on write (pre-compute timelines)        │
│  • Celebrities (>10K followers): Fan-out on read                  │
│  • Mixed: Timeline = cached posts + merged celebrity posts        │
│                                                                      │
│  WHY?                                                                │
│  • Celebrities tweet rarely but have millions of followers         │
│  • 50M writes for one tweet is too expensive                       │
│  • But celebrities are followed by many → cache merging works     │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Case Study: Uber's Write-Heavy System

```
┌─────────────────────────────────────────────────────────────────────┐
│              UBER: REAL-TIME LOCATION TRACKING                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  THE CHALLENGE:                                                      │
│  ───────────────                                                    │
│  5 million active drivers                                           │
│  Location update every 4 seconds                                   │
│  = 1.25 million writes/second                                       │
│                                                                      │
│  Plus rider reads:                                                  │
│  20 million riders × checking app × queries nearby drivers        │
│  = ~500K reads/second                                               │
│                                                                      │
│  RATIO: 1.25M writes : 500K reads = 2.5:1 (write-heavy)            │
│                                                                      │
│  ARCHITECTURE:                                                       │
│  ─────────────                                                      │
│  1. RINGPOP: Consistent hashing for driver → server mapping       │
│  2. In-memory: Driver locations stored in RAM                      │
│  3. Geo-sharding: City/region based partitioning                   │
│  4. No persistent storage for real-time location                   │
│                                                                      │
│  KEY INSIGHT:                                                        │
│  ────────────                                                       │
│  • Location data is ephemeral (only current location matters)      │
│  • RAM is fast enough for write QPS                                │
│  • Geo-queries only check nearby cells                             │
│  • Historical data flows to separate analytics system              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

**Q: "How does read/write ratio affect your database choice?"**

> "Read/write ratio is one of the first things I determine because it fundamentally shapes the architecture.
>
> For a **read-heavy system** like a social media feed (100:1 ratio):
> - I'd use PostgreSQL with aggressive caching in Redis
> - Multiple read replicas to distribute load
> - The cache handles 95%+ of reads, so the primary DB mostly handles writes
> - I can denormalize data because write overhead is acceptable
>
> For a **write-heavy system** like IoT sensor data (1:10 ratio):
> - I'd choose a write-optimized database like Cassandra or TimescaleDB
> - Use Kafka to buffer and batch writes
> - Minimal indexing to avoid write amplification
> - Accept eventual consistency for reads
>
> For a **balanced system** like messaging (5:1 ratio):
> - Consider CQRS: separate read and write paths
> - Use a queue for write operations
> - Cache for reads but with shorter TTLs
> - Read-your-writes consistency for user's own data
>
> The key is matching the architecture to the access pattern, not fighting against it."

### Common Follow-Up Questions

1. **"What if the ratio changes over time?"**
   - Design for flexibility (CQRS allows independent scaling)
   - Monitor actual ratio vs assumptions
   - Plan migration path if ratio shifts significantly

2. **"How do you measure read/write ratio in production?"**
   - Application metrics (count by endpoint type)
   - Database metrics (SELECT vs INSERT/UPDATE counts)
   - Load balancer logs
   - APM tools (Datadog, New Relic)

3. **"Can a single system have different ratios for different features?"**
   - Absolutely! User profiles (read-heavy) vs activity logs (write-heavy)
   - Use different databases for different access patterns
   - Example: Redis for sessions, PostgreSQL for users, Kafka for events

4. **"How does caching affect the effective ratio?"**
   - Cache converts reads away from DB
   - 95% cache hit = DB sees 20:1 instead of 100:1
   - Makes read-heavy systems act more balanced at DB level

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### Read/Write Ratio Calculator

```python
from dataclasses import dataclass
from enum import Enum

class SystemType(Enum):
    READ_HEAVY = "read_heavy"      # > 50:1
    MODERATELY_READ = "moderate"   # 10:1 to 50:1
    BALANCED = "balanced"          # 2:1 to 10:1
    WRITE_HEAVY = "write_heavy"    # < 2:1

@dataclass
class RatioAnalysis:
    read_qps: int
    write_qps: int
    ratio: float
    system_type: SystemType
    recommendations: list

def analyze_read_write_ratio(read_qps: int, write_qps: int) -> RatioAnalysis:
    """
    Analyze read/write ratio and provide architecture recommendations.
    """
    ratio = read_qps / write_qps if write_qps > 0 else float('inf')
    
    if ratio > 50:
        system_type = SystemType.READ_HEAVY
        recommendations = [
            "Use aggressive caching (Redis/Memcached)",
            "Deploy multiple read replicas",
            "Consider CDN for static content",
            "Denormalize data for faster reads",
            "Use long cache TTLs",
            "Single primary DB is likely sufficient for writes"
        ]
    elif ratio > 10:
        system_type = SystemType.MODERATELY_READ
        recommendations = [
            "Implement caching layer (90%+ hit rate target)",
            "Use 2-4 read replicas",
            "Consider write-through cache for consistency",
            "Balance denormalization vs write overhead",
            "Monitor cache hit rates closely"
        ]
    elif ratio > 2:
        system_type = SystemType.BALANCED
        recommendations = [
            "Consider CQRS (separate read/write paths)",
            "Use message queues for write operations",
            "Cache with shorter TTLs",
            "May need database sharding",
            "Implement read-your-writes consistency"
        ]
    else:
        system_type = SystemType.WRITE_HEAVY
        recommendations = [
            "Use write-optimized database (Cassandra, TimescaleDB)",
            "Implement write buffering (Kafka)",
            "Batch writes when possible",
            "Minimize indexes",
            "Accept eventual consistency",
            "Consider append-only data structures"
        ]
    
    return RatioAnalysis(
        read_qps=read_qps,
        write_qps=write_qps,
        ratio=round(ratio, 1),
        system_type=system_type,
        recommendations=recommendations
    )


def estimate_infrastructure(analysis: RatioAnalysis, cache_hit_rate: float = 0.95) -> dict:
    """
    Estimate infrastructure needs based on ratio analysis.
    """
    # Calculate DB load after caching
    db_read_qps = analysis.read_qps * (1 - cache_hit_rate)
    db_write_qps = analysis.write_qps
    
    # Estimate instance counts
    redis_qps_per_node = 50000
    db_read_qps_per_replica = 5000
    db_write_qps_per_primary = 10000
    
    cache_nodes = max(2, int(analysis.read_qps * cache_hit_rate / redis_qps_per_node) + 1)
    read_replicas = max(1, int(db_read_qps / db_read_qps_per_replica) + 1)
    write_primaries = max(1, int(db_write_qps / db_write_qps_per_primary))
    
    return {
        'cache_nodes': cache_nodes * 2,  # With redundancy
        'read_replicas': read_replicas * 2,  # With redundancy
        'write_primaries': write_primaries,
        'db_read_qps': int(db_read_qps),
        'db_write_qps': db_write_qps,
        'effective_db_ratio': round(db_read_qps / db_write_qps, 1) if db_write_qps > 0 else 'inf'
    }


# Example usage
analysis = analyze_read_write_ratio(read_qps=100000, write_qps=2000)
print(f"Ratio: {analysis.ratio}:1")
print(f"System Type: {analysis.system_type.value}")
print(f"Recommendations:")
for rec in analysis.recommendations:
    print(f"  • {rec}")

infra = estimate_infrastructure(analysis)
print(f"\nInfrastructure Estimate:")
print(f"  Cache nodes: {infra['cache_nodes']}")
print(f"  Read replicas: {infra['read_replicas']}")
print(f"  DB effective ratio: {infra['effective_db_ratio']}:1")
```

### Architecture Decision Flowchart

```
                    ┌─────────────────────┐
                    │ Calculate R:W Ratio │
                    └──────────┬──────────┘
                               │
                               ▼
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐    ┌──────────┐    ┌──────────┐
        │  > 50:1  │    │ 10:1-50:1│    │  < 10:1  │
        │Read-Heavy│    │ Moderate │    │Write-Hvy │
        └────┬─────┘    └────┬─────┘    └────┬─────┘
             │               │               │
             ▼               ▼               ▼
    ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
    │• CDN            │ │• Redis cache│ │• Kafka buffer   │
    │• Redis cluster  │ │• Read repls │ │• Batch writes   │
    │• Many replicas  │ │• Consider   │ │• Write-optimized│
    │• Denormalize    │ │  CQRS       │ │  DB (Cassandra) │
    │• Long TTL cache │ │• Moderate   │ │• Min indexes    │
    │• Single primary │ │  caching    │ │• Shard early    │
    └─────────────────┘ └─────────────┘ └─────────────────┘
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### Why Read/Write Ratio Matters

| Decision | Impact of Ratio |
|----------|-----------------|
| **Database choice** | Read-heavy → replicas; Write-heavy → sharding |
| **Caching strategy** | Read-heavy → aggressive; Write-heavy → minimal |
| **Consistency model** | Read-heavy → eventual OK; Write-heavy → ordering matters |
| **Cost structure** | Read-heavy → CDN costs; Write-heavy → storage costs |
| **Failure handling** | Read-heavy → cache is critical; Write-heavy → queue is critical |

### How to Determine Ratio

1. **Count operations by type**
   - GET requests vs POST/PUT/DELETE
   - SELECT queries vs INSERT/UPDATE

2. **Categorize each endpoint**
   - `/feed` → read
   - `/posts` (POST) → write
   - `/likes` (POST) → write

3. **Calculate weighted ratio**
   - Sum all reads, sum all writes
   - Ratio = Total Reads / Total Writes

4. **Validate with production data**
   - Monitor actual database metrics
   - Adjust architecture if assumptions were wrong

### Quick Reference

| Ratio | System Type | Key Architecture |
|-------|-------------|------------------|
| >100:1 | Extremely read-heavy | CDN + Cache + Many replicas |
| 50:1 | Read-heavy | Cache + Read replicas |
| 10:1 | Moderately read | Cache + Few replicas + Consider CQRS |
| 5:1 | Balanced | CQRS + Queue for writes |
| 1:1 | Equal | Sharded database + Kafka |
| 1:10 | Write-heavy | Kafka + Batch writes + NoSQL |
| 1:100 | Extremely write-heavy | Time-series DB + Append-only |

---

**Next**: `21_Peak_vs_Average_Load.md` - Understanding traffic spikes and capacity planning