# 59. Columnar Databases

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Columnar Databases**: NoSQL databases storing data by columns rather than rows—optimized for write-heavy workloads, time-series data, and analytical queries on specific columns at massive scale with linear scalability.

### Core Concept

**What it is:**
- **Column-oriented storage**: Data stored by column, not by row
- **Wide-column store**: Rows can have millions of columns (sparse, flexible schema)
- **Distributed architecture**: Peer-to-peer (no master), linear horizontal scaling
- **Write-optimized**: Append-only writes (LSM trees), no read-before-write
- **Tunable consistency**: Choose between consistency and availability per query

**Why it exists:**
- **Write-heavy workloads**: Handle millions of writes/second (time-series, logs, events)
- **Linear scalability**: Add nodes = add capacity (no bottleneck)
- **High availability**: No single point of failure, survive data center outages
- **Time-series data**: Store sensor readings, metrics, user activity with timestamps
- **Sparse data**: Efficient storage when rows have different columns

**Simple analogy:**
- **Row-oriented database** (traditional): Like reading a book page by page
  - Retrieve entire row: `[ID=1, Name=John, Age=30, City=SF, Email=john@ex.com]`
  - Read full record even if only need one field
  - Good for OLTP (retrieve entire user profile)
  
- **Columnar database**: Like reading a book column by column
  - Retrieve specific column across all rows: `[Age: 30, 25, 35, 28, ...]`
  - Skip unneeded columns
  - Good for analytics (average age of all users)
  - Also good for writes (append to column, no read-before-write)

### Key Components

**1. Data Model (Cassandra Example)**

```
Keyspace (like database)
  └── Table
      ├── Partition Key (determines node placement)
      ├── Clustering Key (sorting within partition)
      └── Columns (flexible, sparse)

Example:
CREATE TABLE user_events (
    user_id uuid,           -- Partition key
    event_time timestamp,   -- Clustering key (sort by time)
    event_type text,
    metadata map<text, text>,
    PRIMARY KEY (user_id, event_time)
);

Data layout on disk:
user_id=123 → [
    (event_time=2024-01-01 10:00, event_type=login, metadata={...}),
    (event_time=2024-01-01 11:00, event_type=purchase, metadata={...}),
    (event_time=2024-01-01 12:00, event_type=logout, metadata={...})
]
// All events for user_id=123 stored together, sorted by event_time
```

**2. Storage Engine (LSM Tree)**

```
Write Path:
1. Write to CommitLog (append-only, durability)
2. Write to MemTable (in-memory, sorted)
3. MemTable full → Flush to SSTable (immutable file on disk)
4. Multiple SSTables → Compaction (merge, remove tombstones)

Read Path:
1. Check MemTable (in-memory)
2. Check Bloom filters (avoid disk reads for missing keys)
3. Read SSTables (newest first)
4. Merge results from multiple SSTables
```

**3. Distribution (Consistent Hashing)**

```
Token Ring:
- Hash(partition key) → Token (0 to 2^63-1)
- Nodes arranged in ring by token ranges
- Each node owns token range
- Replication: Copy to N next nodes (clockwise)

Example (3 nodes, RF=3):
Node A: Tokens 0 - 5000
Node B: Tokens 5001 - 10000
Node C: Tokens 10001 - 15000

user_id=123 → Hash(123) = 7500 → Node B (primary) + Node C + Node A (replicas)
```

### Popular Columnar Databases

**Apache Cassandra:**
- Peer-to-peer (no master)
- Linear scalability (Netflix: 30k+ nodes)
- Tunable consistency (CL: ONE, QUORUM, ALL)
- CQL query language (SQL-like)
- Use cases: Time-series, messaging, IoT, user activity

**Apache HBase:**
- Built on Hadoop HDFS
- Master-slave architecture
- Strong consistency
- Complex queries via MapReduce/Spark
- Use cases: Facebook Messages, storing billions of rows

**Amazon Keyspaces:**
- Managed Cassandra (AWS)
- Serverless, auto-scaling
- Compatible with Cassandra CQL
- Use cases: Same as Cassandra but managed

**ScyllaDB:**
- Cassandra-compatible (C++ rewrite)
- 10x faster than Cassandra (per-core efficiency)
- Drop-in replacement
- Use cases: Ultra-low latency time-series

### Why Columnar Databases Matter

**Business Impact:**
- **Scale**: Handle billions of events/day (IoT, analytics, user activity)
- **Availability**: 99.99%+ uptime (no single point of failure)
- **Cost**: Linear scaling = predictable costs
- **Performance**: Sub-10ms writes, millions of ops/second
- **Global**: Multi-datacenter replication (low latency worldwide)

**Role in interviews:**
- FAANG asks: "Design a time-series database for IoT sensors"
- Scale questions: "Store 1 billion events/day with sub-10ms writes"
- Availability: "Design system that survives datacenter failure"
- Trade-off questions: "CAP theorem: Choose consistency or availability?"

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔶 Apache Cassandra Deep Dive

#### Architecture and Ring Topology

```
┌─────────────────────────────────────────────────────────────┐
│          CASSANDRA CLUSTER ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CLIENT APPLICATION                                 │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CASSANDRA DRIVER (Client Library)                  │    │
│  │  - Token-aware routing                              │    │
│  │  - Load balancing                                   │    │
│  │  - Retry logic                                      │    │
│  │  - Connection pooling                               │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CASSANDRA RING (Peer-to-Peer)                      │    │
│  │                                                      │    │
│  │         Node A                                       │    │
│  │    Tokens: 0-5000                                    │    │
│  │           ↑ ↓                                        │    │
│  │          ╱   ╲                                       │    │
│  │         ╱     ╲                                      │    │
│  │    Node F ←→ Node B                                 │    │
│  │    15001-     5001-                                  │    │
│  │    20000      10000                                  │    │
│  │      ↑ ╲       ╱ ↑                                   │    │
│  │      │   ╲   ╱   │                                   │    │
│  │      │     ╳     │                                   │    │
│  │      │   ╱   ╲   │                                   │    │
│  │      ↓ ╱       ╲ ↓                                   │    │
│  │    Node E ←→ Node C                                 │    │
│  │    12501-     10001-                                 │    │
│  │    15000      12500                                  │    │
│  │         ╲     ╱                                       │    │
│  │          ╲   ╱                                        │    │
│  │           ↓ ↑                                        │    │
│  │         Node D                                       │    │
│  │    Tokens: 7501-10000                                │    │
│  │                                                      │    │
│  │  Properties:                                         │    │
│  │  - No master (all nodes equal)                      │    │
│  │  - Gossip protocol (peer discovery)                 │    │
│  │  - Virtual nodes (256 per physical node)            │    │
│  │  - Replication Factor (RF=3 typical)                │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

CASSANDRA NODE INTERNALS:
════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  CLIENT WRITE REQUEST                                        │
│       ↓                                                      │
│  ┌─────────────────────────────────────┐                    │
│  │  COORDINATOR NODE                   │                    │
│  │  - Receives request                 │                    │
│  │  - Hash partition key → Token       │                    │
│  │  - Identify replicas                │                    │
│  │  - Send to RF nodes                 │                    │
│  └─────────────┬───────────────────────┘                    │
│                ↓                                             │
│  ┌─────────────────────────────────────┐                    │
│  │  REPLICA NODES (RF=3)               │                    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │  │ Node 1   │ │ Node 2   │ │ Node 3   │                │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘                │
│  │       │            │            │                        │
│  │       ↓            ↓            ↓                        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │  │CommitLog │ │CommitLog │ │CommitLog │                │
│  │  │(Disk)    │ │(Disk)    │ │(Disk)    │                │
│  │  │Append    │ │Append    │ │Append    │                │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘                │
│  │       ↓            ↓            ↓                        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │  │MemTable  │ │MemTable  │ │MemTable  │                │
│  │  │(RAM)     │ │(RAM)     │ │(RAM)     │                │
│  │  │Sorted    │ │Sorted    │ │Sorted    │                │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘                │
│  │       │            │            │                        │
│  │       │ When full  │            │                        │
│  │       ↓            ↓            ↓                        │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │  │SSTable   │ │SSTable   │ │SSTable   │                │
│  │  │(Disk)    │ │(Disk)    │ │(Disk)    │                │
│  │  │Immutable │ │Immutable │ │Immutable │                │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘                │
│  │       │            │            │                        │
│  │       ↓            ↓            ↓                        │
│  │   Compaction   Compaction   Compaction                  │
│  │   (Background) (Background) (Background)                │
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Write Acknowledgment:                                       │
│  - Consistency Level ONE: 1 replica ACK → Return            │
│  - Consistency Level QUORUM: 2/3 replicas ACK → Return      │
│  - Consistency Level ALL: 3/3 replicas ACK → Return         │
│                                                              │
└─────────────────────────────────────────────────────────────┘

READ PATH:
═════════

┌─────────────────────────────────────────────────────────────┐
│  CLIENT READ REQUEST (Consistency Level = QUORUM)            │
│       ↓                                                      │
│  ┌─────────────────────────────────────┐                    │
│  │  COORDINATOR                        │                    │
│  │  - Query RF replicas                │                    │
│  │  - Wait for QUORUM responses        │                    │
│  └─────────────┬───────────────────────┘                    │
│                ↓                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  REPLICA READ (Each Node)                        │      │
│  │  ┌──────────────────────────────────────┐        │      │
│  │  │  1. Check MemTable (RAM)             │        │      │
│  │  │     - Sorted structure               │        │      │
│  │  │     - O(log n) lookup                │        │      │
│  │  └──────────────┬───────────────────────┘        │      │
│  │                 ↓                                 │      │
│  │  ┌──────────────────────────────────────┐        │      │
│  │  │  2. Check Bloom Filters              │        │      │
│  │  │     - Probabilistic: "Key NOT in SSTable"│     │      │
│  │  │     - Avoid unnecessary disk reads   │        │      │
│  │  │     - False positives OK, no false negatives│  │      │
│  │  └──────────────┬───────────────────────┘        │      │
│  │                 ↓                                 │      │
│  │  ┌──────────────────────────────────────┐        │      │
│  │  │  3. Check Partition Key Cache        │        │      │
│  │  │     - Cache of partition key → SSTable offset││      │
│  │  │     - Skip index lookup              │        │      │
│  │  └──────────────┬───────────────────────┘        │      │
│  │                 ↓                                 │      │
│  │  ┌──────────────────────────────────────┐        │      │
│  │  │  4. Read SSTables (Disk)             │        │      │
│  │  │     - Newest SSTable first           │        │      │
│  │  │     - Merge results (reconcile versions)│     │      │
│  │  │     - Apply tombstones (deletions)   │        │      │
│  │  └──────────────────────────────────────┘        │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │  COORDINATOR MERGE                               │      │
│  │  - Compare timestamps from replicas              │      │
│  │  - Return latest version                         │      │
│  │  - Read repair if inconsistent (async)           │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
└─────────────────────────────────────────────────────────────┘

COMPACTION STRATEGIES:
═══════════════════════

1. Size-Tiered Compaction (STCS)
   - Default strategy
   - Similar-sized SSTables merged
   - Write-optimized (minimal compaction overhead)
   - Issue: Read amplification (many SSTables)
   - Use case: Write-heavy, time-series (append-only)

2. Leveled Compaction (LCS)
   - SSTables organized in levels
   - Level 0: New SSTables, Level 1-N: Progressively larger
   - Non-overlapping key ranges per level
   - Read-optimized (predictable reads)
   - Issue: Write amplification (more compactions)
   - Use case: Read-heavy, point queries

3. Time-Window Compaction (TWCS)
   - SSTables grouped by time window (hour, day)
   - Old windows not compacted (immutable)
   - Efficient TTL (drop entire SSTable)
   - Use case: Time-series with TTL

┌─────────────────────────────────────────────────────────────┐
│  STCS (Size-Tiered)                                          │
│  MemTable → SSTable1 (10 MB)                                 │
│           → SSTable2 (10 MB)                                 │
│           → SSTable3 (10 MB)                                 │
│           → SSTable4 (10 MB)                                 │
│  When 4 SSTables same size:                                  │
│  Merge → SSTable5 (40 MB)                                    │
│  Repeat...                                                   │
│                                                              │
│  TWCS (Time-Window)                                          │
│  Window: 2024-01-01 00:00 - 01:00                            │
│    SSTable1, SSTable2 → Merge once window closed             │
│  Window: 2024-01-01 01:00 - 02:00                            │
│    SSTable3, SSTable4 → Merge once window closed             │
│  TTL: Drop entire SSTable when window expires                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Data Modeling and CQL

```sql
-- ═══════════════════════════════════════════════════════════
-- Cassandra Data Modeling Best Practices
-- ═══════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────
-- 1. Query-Driven Design (Model Around Queries)
-- ─────────────────────────────────────────────────────────

-- Anti-pattern: Normalize like relational database
-- ❌ Bad: Separate users and orders tables, JOIN on query

-- ✅ Good: Denormalize, one table per query pattern

-- Query 1: Get user profile by user_id
CREATE TABLE users_by_id (
    user_id uuid PRIMARY KEY,
    username text,
    email text,
    created_at timestamp
);

-- Query 2: Get user by email (different access pattern)
CREATE TABLE users_by_email (
    email text PRIMARY KEY,
    user_id uuid,
    username text,
    created_at timestamp
);

-- Data duplication acceptable (consistency via application logic)

-- ─────────────────────────────────────────────────────────
-- 2. Partition Key Selection (Most Critical)
-- ─────────────────────────────────────────────────────────

/*
Good Partition Key:
✅ High cardinality (many unique values)
✅ Even distribution (no hot partitions)
✅ Query-aligned (queries include partition key)
✅ Bounded size (<100 MB per partition recommended)

Bad Partition Key:
❌ Low cardinality (e.g., country - creates hot partitions)
❌ Unbounded growth (e.g., all events for all time)
❌ Timestamp alone (monotonically increasing - hot writes)
*/

-- Example: User activity events

-- ❌ Bad: Single partition for all users
CREATE TABLE user_events_bad (
    partition_id int,        -- Always 1 (all data in one partition!)
    user_id uuid,
    event_time timestamp,
    event_type text,
    PRIMARY KEY (partition_id, user_id, event_time)
);
-- Problem: All data on one node, no scalability

-- ❌ Bad: Unbounded partition (all events for user)
CREATE TABLE user_events_bad2 (
    user_id uuid,
    event_time timestamp,
    event_type text,
    PRIMARY KEY (user_id, event_time)
);
-- Problem: User with millions of events → huge partition (>100 MB)

-- ✅ Good: Partition by user + time bucket
CREATE TABLE user_events_good (
    user_id uuid,
    year_month text,         -- "2024-01" (partition by month)
    event_time timestamp,
    event_type text,
    metadata map<text, text>,
    PRIMARY KEY ((user_id, year_month), event_time)
);
-- Partition key: (user_id, year_month) - composite
-- Clustering key: event_time - sort within partition
-- Benefits:
-- - Bounded partition size (max 1 month of events per partition)
-- - Even distribution (users × months)
-- - Query-aligned (get events for user in month)

-- Query pattern:
SELECT * FROM user_events_good
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000
  AND year_month = '2024-01'
  AND event_time >= '2024-01-15'
  AND event_time < '2024-01-16';
-- Single partition read (fast!)

-- ─────────────────────────────────────────────────────────
-- 3. Clustering Key (Sorting Within Partition)
-- ─────────────────────────────────────────────────────────

-- Data stored sorted by clustering key (on disk)
-- Free sorting, efficient range queries

CREATE TABLE sensor_data (
    sensor_id uuid,
    reading_time timestamp,
    temperature decimal,
    humidity decimal,
    PRIMARY KEY (sensor_id, reading_time)
) WITH CLUSTERING ORDER BY (reading_time DESC);
-- Newest readings first (reversed sort)

-- Query recent readings (no sorting needed)
SELECT * FROM sensor_data
WHERE sensor_id = 123e4567-e89b-12d3-a456-426614174000
LIMIT 100;
-- Returns 100 most recent readings (already sorted)

-- ─────────────────────────────────────────────────────────
-- 4. Collections (Lists, Sets, Maps)
-- ─────────────────────────────────────────────────────────

CREATE TABLE user_profiles (
    user_id uuid PRIMARY KEY,
    username text,
    email text,
    phone_numbers set<text>,         -- Set (unique phone numbers)
    addresses list<frozen<address>>, -- List (ordered addresses)
    preferences map<text, text>      -- Map (key-value preferences)
);

-- User-defined type (UDT) for structured data
CREATE TYPE address (
    street text,
    city text,
    state text,
    zip text
);

-- Insert with collections
INSERT INTO user_profiles (user_id, username, email, phone_numbers, preferences)
VALUES (
    123e4567-e89b-12d3-a456-426614174000,
    'john_doe',
    'john@example.com',
    {'+1234567890', '+0987654321'},
    {'theme': 'dark', 'language': 'en', 'timezone': 'PST'}
);

-- Update collection (add element)
UPDATE user_profiles
SET phone_numbers = phone_numbers + {'+1111111111'}
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;

-- Update map (set key)
UPDATE user_profiles
SET preferences['notifications'] = 'enabled'
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;

-- ⚠️ Collections limitation: Entire collection read/written as unit
-- Avoid large collections (>10k elements) - use separate table instead

-- ─────────────────────────────────────────────────────────
-- 5. Counters
-- ─────────────────────────────────────────────────────────

CREATE TABLE page_views (
    page_url text PRIMARY KEY,
    view_count counter
);

-- Increment counter
UPDATE page_views
SET view_count = view_count + 1
WHERE page_url = '/home';

-- Decrement counter
UPDATE page_views
SET view_count = view_count - 5
WHERE page_url = '/home';

-- Read counter
SELECT view_count FROM page_views WHERE page_url = '/home';

-- ⚠️ Counters are eventually consistent (no read-before-write)
-- Use case: Analytics, metrics (exact precision not critical)

-- ─────────────────────────────────────────────────────────
-- 6. Time-To-Live (TTL)
-- ─────────────────────────────────────────────────────────

-- Set TTL on insert (data auto-deleted after TTL)
INSERT INTO user_sessions (session_id, user_id, data)
VALUES (uuid(), 1000, 'session_data')
USING TTL 1800;  -- 30 minutes (seconds)

-- Set TTL on specific column
UPDATE user_profiles
USING TTL 86400  -- 24 hours
SET temporary_token = 'abc123'
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;

-- Check remaining TTL
SELECT TTL(temporary_token) FROM user_profiles
WHERE user_id = 123e4567-e89b-12d3-a456-426614174000;
-- Returns seconds remaining (NULL if no TTL)

-- Use case: Sessions, temporary caches, time-series with retention

-- ─────────────────────────────────────────────────────────
-- 7. Secondary Indexes (Use Sparingly)
-- ─────────────────────────────────────────────────────────

CREATE TABLE users (
    user_id uuid PRIMARY KEY,
    email text,
    username text,
    age int
);

-- Create secondary index
CREATE INDEX ON users (email);

-- Query by secondary index
SELECT * FROM users WHERE email = 'john@example.com';

-- ⚠️ Secondary indexes limitations:
-- - High cardinality only (many unique values)
-- - Low-cardinality = scatter to all nodes (slow)
-- - No range queries on indexed column
-- - Performance degrades with cluster size

-- ✅ Better: Create separate table (materialized view pattern)
CREATE TABLE users_by_email (
    email text PRIMARY KEY,
    user_id uuid,
    username text
);
-- Application maintains both tables (denormalization)

-- ─────────────────────────────────────────────────────────
-- 8. Materialized Views (Automated Denormalization)
-- ─────────────────────────────────────────────────────────

-- Base table
CREATE TABLE user_events (
    user_id uuid,
    event_time timestamp,
    event_type text,
    PRIMARY KEY (user_id, event_time)
);

-- Materialized view (different primary key)
CREATE MATERIALIZED VIEW events_by_type AS
    SELECT * FROM user_events
    WHERE event_type IS NOT NULL
        AND user_id IS NOT NULL
        AND event_time IS NOT NULL
    PRIMARY KEY (event_type, event_time, user_id);

-- Cassandra automatically maintains materialized view
-- Write to user_events → Async update to events_by_type

-- Query by event type (not possible on base table)
SELECT * FROM events_by_type
WHERE event_type = 'purchase'
  AND event_time >= '2024-01-01'
  AND event_time < '2024-02-01';

-- ⚠️ Materialized views overhead:
-- - Double write cost (base + view)
-- - Eventually consistent
-- - Use only for critical queries
```

#### Consistency Levels and Tuning

```sql
-- ═══════════════════════════════════════════════════════════
-- Cassandra Consistency Levels
-- ═══════════════════════════════════════════════════════════

/*
Consistency Level (CL): Number of replicas that must respond

Write Consistency Levels:
- ANY: Coordinator stores hint, fastest (not durable)
- ONE: 1 replica acknowledges
- TWO: 2 replicas acknowledge
- THREE: 3 replicas acknowledge
- QUORUM: Majority (RF/2 + 1) acknowledge
- LOCAL_QUORUM: Majority in local datacenter
- EACH_QUORUM: Majority in each datacenter
- ALL: All replicas acknowledge (slowest, most consistent)

Read Consistency Levels:
- ONE: Return from 1 replica (fastest, may be stale)
- TWO: Return from 2 replicas (compare timestamps)
- THREE: Return from 3 replicas
- QUORUM: Return from majority (most common)
- LOCAL_QUORUM: Majority in local datacenter
- ALL: Return from all replicas (slowest, most consistent)

Replication Factor (RF): Number of replicas per partition
- RF=3 typical (survive 2 node failures)
- RF=5 for critical data

Strong Consistency Formula:
R + W > RF
Where R = read CL, W = write CL, RF = replication factor

Example: RF=3, W=QUORUM (2), R=QUORUM (2)
2 + 2 > 3 → Strong consistency (always read latest write)

Eventual Consistency:
R + W ≤ RF
Example: RF=3, W=ONE (1), R=ONE (1)
1 + 1 ≤ 3 → Eventual consistency (may read stale data)
*/

-- ─────────────────────────────────────────────────────────
-- Setting Consistency Levels (CQL)
-- ─────────────────────────────────────────────────────────

-- Session-level (all queries)
CONSISTENCY QUORUM;

-- Query-level (Java driver example)
import com.datastax.oss.driver.api.core.ConsistencyLevel;

// Write with LOCAL_QUORUM (majority in local DC)
PreparedStatement stmt = session.prepare(
    "INSERT INTO users (user_id, username, email) VALUES (?, ?, ?)"
);
BoundStatement bound = stmt.bind(userId, username, email)
    .setConsistencyLevel(ConsistencyLevel.LOCAL_QUORUM);
session.execute(bound);

// Read with ONE (fast, may be stale - cache-like behavior)
PreparedStatement readStmt = session.prepare(
    "SELECT * FROM users WHERE user_id = ?"
);
BoundStatement boundRead = readStmt.bind(userId)
    .setConsistencyLevel(ConsistencyLevel.ONE);
ResultSet rs = session.execute(boundRead);

// ─────────────────────────────────────────────────────────
-- Tuning for Different Use Cases
// ─────────────────────────────────────────────────────────

/*
1. Strong Consistency (Banking, Inventory)
   Write: QUORUM or ALL
   Read: QUORUM or ALL
   Trade-off: Lower throughput, higher latency
   
2. High Availability (Social Media, Analytics)
   Write: ONE or LOCAL_QUORUM
   Read: ONE or LOCAL_QUORUM
   Trade-off: Eventual consistency, stale reads possible
   
3. Multi-Datacenter (Global Apps)
   Write: LOCAL_QUORUM (fast, doesn't wait for remote DC)
   Read: LOCAL_QUORUM (low latency from local DC)
   Async replication to other DCs
   
4. Time-Series (IoT, Logs)
   Write: ONE (maximize write throughput)
   Read: ONE or QUORUM (depending on staleness tolerance)
   Use TWCS compaction + TTL
*/

-- ─────────────────────────────────────────────────────────
-- Read Repair
-- ─────────────────────────────────────────────────────────

/*
Read Repair: Fix inconsistencies during reads

Process:
1. Coordinator reads from CL replicas
2. If inconsistent (different timestamps), return latest
3. Async: Send latest version to stale replicas (repair)

Read repair chance:
- dclocal_read_repair_chance: 0.1 (10% of reads trigger repair in local DC)
- read_repair_chance: 0.0 (cross-DC repair disabled by default)

Alternative: Manual repair
$ nodetool repair -pr
- Full repair of node's primary range
- Resource-intensive, run during low traffic
*/
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### IoT Sensor Data Platform (Cassandra)

**Requirements:**
- 10M IoT sensors (temperature, humidity, pressure)
- 1 reading/minute per sensor
- Reading size: 100 bytes (sensor_id, timestamp, 3 metrics)
- Retention: 1 year
- Query patterns:
  - Recent readings for sensor (last 24 hours)
  - Aggregate metrics (hourly averages)
- Peak writes: 2x average (during morning hours)

**Capacity Estimation:**

```
Daily writes:
= 10M sensors × 1 reading/minute × 60 minutes × 24 hours
= 10M × 1,440 readings/day
= 14.4 billion readings/day

Write throughput (average):
= 14.4B / 86,400 seconds
= 166,667 writes/second

Peak write throughput (2x average):
= 166,667 × 2 = 333,334 writes/second

Storage per day:
= 14.4B readings × 100 bytes
= 1.44 TB/day raw data

Storage for 1 year:
= 1.44 TB × 365 days = 525.6 TB

With Replication Factor (RF=3):
= 525.6 TB × 3 = 1,576.8 TB = 1.54 PB

With compression (2:1 typical for time-series):
= 1.54 PB / 2 = 770 TB

With compaction overhead (1.5x during compaction):
= 770 TB × 1.5 = 1,155 TB = 1.13 PB

Storage per node (using 2 TB SSD):
= 1.13 PB / 2 TB per node = 565 nodes (storage bound)

Write capacity per node:
= 5,000 writes/second typical (SSD, optimized for writes)

Nodes needed (write throughput):
= 333,334 writes/second / 5,000 per node = 67 nodes

Bottleneck: Storage (565 nodes) > Write throughput (67 nodes)
Cluster size: 600 nodes (rounded up, storage-bound)

Actual configuration:
- Use larger disks or more efficient storage
- Optimize: TWCS compaction, aggressive TTL, less retention
```

**Optimized Configuration:**

```
Strategy 1: Reduce retention to 90 days (not 365)
= 1.13 PB × (90 / 365) = 279 GB
= 279 GB / 2 TB per node = 140 nodes

Strategy 2: Use downsampling (keep raw data 7 days, hourly aggregates after)
Raw data (7 days):
= 1.44 TB/day × 7 days × 3 RF / 2 compression = 15 TB

Aggregated data (83 days at hourly resolution):
= 10M sensors × 24 hours/day × 83 days × 100 bytes
= 199.2 GB/day × 83 = 16.5 TB × 3 RF / 2 = 24.75 TB

Total: 15 TB + 24.75 TB = 39.75 TB
Nodes: 39.75 TB / 2 TB = 20 nodes (storage)

Write throughput (with downsampling):
= 333,334 writes/second (raw) + 278 writes/second (hourly aggregates)
= ~333,600 writes/second
= 67 nodes (write throughput)

Final cluster size: 70 nodes (rounded up)

Cost (AWS):
- Instance: i3.2xlarge (8 vCPU, 61 GB RAM, 1.9 TB NVMe SSD)
- Cost: $0.624/hour × 70 nodes = $43.68/hour
- Monthly: $43.68 × 730 hours = $31,886/month

Alternative: i3.4xlarge (2x storage per node = 35 nodes)
- Cost: $1.248/hour × 35 = $43.68/hour = $31,886/month (same cost!)
```

**Data Model:**

```sql
-- ═══════════════════════════════════════════════════════════
-- IoT Sensor Data Model
-- ═══════════════════════════════════════════════════════════

-- Raw readings (7-day retention)
CREATE TABLE sensor_readings (
    sensor_id uuid,
    reading_date date,       -- Partition by sensor + date
    reading_time timestamp,
    temperature decimal,
    humidity decimal,
    pressure decimal,
    PRIMARY KEY ((sensor_id, reading_date), reading_time)
) WITH CLUSTERING ORDER BY (reading_time DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': 1, 'compaction_window_unit': 'DAYS'}
  AND default_time_to_live = 604800;  -- 7 days TTL

-- Hourly aggregates (90-day retention)
CREATE TABLE sensor_readings_hourly (
    sensor_id uuid,
    reading_date date,
    reading_hour int,        -- Hour (0-23)
    avg_temperature decimal,
    max_temperature decimal,
    min_temperature decimal,
    avg_humidity decimal,
    avg_pressure decimal,
    reading_count int,
    PRIMARY KEY ((sensor_id, reading_date), reading_hour)
) WITH CLUSTERING ORDER BY (reading_hour DESC)
  AND default_time_to_live = 7776000;  -- 90 days TTL

-- Daily aggregates (1-year retention)
CREATE TABLE sensor_readings_daily (
    sensor_id uuid,
    reading_date date,
    avg_temperature decimal,
    max_temperature decimal,
    min_temperature decimal,
    avg_humidity decimal,
    avg_pressure decimal,
    reading_count int,
    PRIMARY KEY (sensor_id, reading_date)
) WITH CLUSTERING ORDER BY (reading_date DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy'}
  AND default_time_to_live = 31536000;  -- 365 days TTL
```

**Queries:**

```sql
-- Recent readings (last 24 hours)
SELECT * FROM sensor_readings
WHERE sensor_id = 550e8400-e29b-41d4-a716-446655440000
  AND reading_date IN ('2024-01-15', '2024-01-16')  -- Yesterday + today
  AND reading_time >= '2024-01-15 12:00:00';
-- Single partition read (very fast)

-- Hourly averages (last 7 days)
SELECT * FROM sensor_readings_hourly
WHERE sensor_id = 550e8400-e29b-41d4-a716-446655440000
  AND reading_date >= '2024-01-10'
  AND reading_date <= '2024-01-16';
-- Few partitions (7 days), fast

-- Daily averages (last year)
SELECT * FROM sensor_readings_daily
WHERE sensor_id = 550e8400-e29b-41d4-a716-446655440000
  AND reading_date >= '2023-01-16'
  AND reading_date <= '2024-01-16';
-- Multiple partitions (365), but small data volume
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Cassandra vs HBase vs Traditional RDBMS

```
┌─────────────────────────────────────────────────────────────┐
│          STORAGE MODEL COMPARISON                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ROW-ORIENTED (Traditional RDBMS: MySQL, PostgreSQL)         │
│  ════════════════════════════════════════════════           │
│  Data stored row by row on disk:                             │
│                                                              │
│  Row 1: [ID=1, Name=John, Age=30, City=SF]                  │
│  Row 2: [ID=2, Name=Jane, Age=25, City=NYC]                 │
│  Row 3: [ID=3, Name=Bob, Age=35, City=LA]                   │
│                                                              │
│  Query: SELECT Name FROM users WHERE Age > 30                │
│  Must read entire rows, discard unneeded columns            │
│                                                              │
│  Benefits:                                                   │
│  ✅ Fast full-row retrieval (OLTP: get user profile)        │
│  ✅ Good for writes (append full row)                       │
│                                                              │
│  Drawbacks:                                                  │
│  ❌ Slow column-specific queries (read all columns)         │
│  ❌ Poor compression (different data types mixed)           │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  COLUMN-ORIENTED (Analytical: Redshift, BigQuery)            │
│  ════════════════════════════════════════════════           │
│  Data stored column by column:                               │
│                                                              │
│  ID column:   [1, 2, 3, ...]                                 │
│  Name column: [John, Jane, Bob, ...]                         │
│  Age column:  [30, 25, 35, ...]                              │
│  City column: [SF, NYC, LA, ...]                             │
│                                                              │
│  Query: SELECT Name FROM users WHERE Age > 30                │
│  Read only Age + Name columns (skip others)                 │
│                                                              │
│  Benefits:                                                   │
│  ✅ Fast column-specific queries (analytics)                │
│  ✅ Excellent compression (same data type per column)       │
│  ✅ Efficient aggregations (SUM, AVG on column)             │
│                                                              │
│  Drawbacks:                                                  │
│  ❌ Slow full-row retrieval (reconstruct from columns)      │
│  ❌ Write overhead (write to multiple column files)         │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  WIDE-COLUMN (Cassandra, HBase, Bigtable)                    │
│  ════════════════════════════════════════════════           │
│  Hybrid: Rows stored together, but flexible columns          │
│                                                              │
│  Row key: user_id=1                                          │
│    ├─ column: name=John                                      │
│    ├─ column: age=30                                         │
│    └─ column: city=SF                                        │
│                                                              │
│  Row key: user_id=2                                          │
│    ├─ column: name=Jane                                      │
│    ├─ column: age=25                                         │
│    ├─ column: city=NYC                                       │
│    └─ column: phone=+123456789  (extra column!)              │
│                                                              │
│  Different rows can have different columns (sparse schema)   │
│                                                              │
│  Benefits:                                                   │
│  ✅ Write-optimized (LSM tree, no read-before-write)        │
│  ✅ Flexible schema (add columns without migration)         │
│  ✅ Horizontal scaling (sharding by row key)                │
│  ✅ Time-series optimized (clustering key sorts data)       │
│                                                              │
│  Drawbacks:                                                  │
│  ❌ No complex queries (JOINs, aggregations)                │
│  ❌ Must model per query pattern (denormalization)          │
│  ❌ Read amplification (multiple SSTables)                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

COMPARISON TABLE:
═════════════════

┌───────────────┬──────────┬──────────┬──────────┬──────────┐
│ Feature       │ RDBMS    │ Column   │ Cassandra│ HBase    │
├───────────────┼──────────┼──────────┼──────────┼──────────┤
│ Data Model    │ Row      │ Column   │ Wide-col │ Wide-col │
│ Schema        │ Rigid    │ Rigid    │ Flexible │ Flexible │
│ Transactions  │ ACID     │ Limited  │ Limited  │ Limited  │
│ Queries       │ Complex  │ Analytical│ Simple  │ Simple   │
│ Scaling       │ Vertical │ MPP      │ Horizontal│Horizontal│
│ Consistency   │ Strong   │ Strong   │ Tunable  │ Strong   │
│ Write Speed   │ Moderate │ Slow     │ Very Fast│ Fast     │
│ Read Speed    │ Fast     │ Moderate │ Fast*    │ Moderate │
│ Use Case      │ OLTP     │ OLAP     │ Time-series│Big Data │
└───────────────┴──────────┴──────────┴──────────┴──────────┘

* Cassandra read speed depends on compaction strategy
  STCS: Slower reads (many SSTables)
  LCS: Faster reads (predictable lookups)
```

### Cassandra vs HBase Architecture Differences

```
┌─────────────────────────────────────────────────────────────┐
│          CASSANDRA (Peer-to-Peer)                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                       │
│  │Node A│ │Node B│ │Node C│ │Node D│                       │
│  └───┬──┘ └───┬──┘ └───┬──┘ └───┬──┘                       │
│      │        │        │        │                           │
│      └────────┴────────┴────────┘                           │
│             All nodes equal                                  │
│                                                              │
│  Benefits:                                                   │
│  ✅ No single point of failure                              │
│  ✅ Simple operations (any node can be coordinator)         │
│  ✅ Linear scalability (add node = add capacity)            │
│  ✅ Multi-datacenter replication (built-in)                 │
│                                                              │
│  Drawbacks:                                                  │
│  ⚠️ Eventual consistency (tunable)                          │
│  ⚠️ Limited query flexibility (model per query)             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          HBASE (Master-Slave)                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│              ┌──────────────┐                                │
│              │ HBase Master │                                │
│              │ - Region assignment                            │
│              │ - Load balancing                              │
│              │ - DDL operations                              │
│              └───────┬──────┘                                │
│                      │                                       │
│          ┌───────────┼───────────┐                          │
│          ↓           ↓           ↓                          │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│    │Region   │ │Region   │ │Region   │                     │
│    │Server 1 │ │Server 2 │ │Server 3 │                     │
│    └────┬────┘ └────┬────┘ └────┬────┘                     │
│         │           │           │                           │
│         └───────────┴───────────┘                           │
│                     ↓                                        │
│              ┌──────────────┐                                │
│              │ HDFS (Storage)│                               │
│              └──────────────┘                                │
│                                                              │
│  Benefits:                                                   │
│  ✅ Strong consistency (region-level)                       │
│  ✅ HDFS integration (Hadoop ecosystem)                     │
│  ✅ Better for MapReduce/Spark analytics                    │
│                                                              │
│  Drawbacks:                                                  │
│  ❌ Master is single point of failure (mitigated by standby)│
│  ❌ More complex operations (region splits, balancing)      │
│  ❌ Slower writes (HDFS overhead)                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Linear Scalability Proof

```
Cassandra Linear Scalability:
═══════════════════════════════

Scenario: E-commerce order tracking system

Initial Setup (3 nodes, RF=3):
- 3 nodes × 5,000 writes/sec = 15,000 writes/sec total
- Each partition replicated to all 3 nodes
- Storage: 100 GB per node × 3 nodes = 300 GB (before replication)
- With RF=3: Each node stores 100 GB

Add 3 nodes (6 total):
- 6 nodes × 5,000 writes/sec = 30,000 writes/sec (2x throughput ✅)
- Token ranges redistributed (each node owns 1/6 of token space)
- Storage per node: ~50 GB (data redistributed)
- Rebalancing: Automatic via gossip protocol

Add 3 more nodes (9 total):
- 9 nodes × 5,000 writes/sec = 45,000 writes/sec (3x throughput ✅)
- Storage per node: ~33 GB
- No downtime during expansion

Key to linear scaling:
1. No master bottleneck (peer-to-peer)
2. Consistent hashing (minimal data movement)
3. Virtual nodes (vnodes) for even distribution
4. Replication maintains availability during rebalancing
```

### Fault Tolerance and Recovery

```javascript
// ═══════════════════════════════════════════════════════════
// Cassandra Fault Tolerance Scenarios
// ═══════════════════════════════════════════════════════════

// Scenario 1: Single Node Failure
// ─────────────────────────────────────────────────────────

/*
Setup: 6 nodes, RF=3

Node 2 fails:
- Gossip protocol detects failure (heartbeat timeout)
- Coordinator routes requests to other replicas (Node 3, Node 4)
- No data loss (RF=3, still have 2 copies)
- Writes continue: Hinted handoff stores writes for Node 2
- When Node 2 recovers: Replay hinted handoffs

Read behavior (CL=QUORUM):
- Before failure: Read from any 2 of [Node 2, Node 3, Node 4]
- After failure: Read from [Node 3, Node 4] (still QUORUM)
- No application errors ✅

Write behavior (CL=QUORUM):
- Before failure: Write to any 2 of [Node 2, Node 3, Node 4]
- After failure: Write to [Node 3, Node 4] + hinted handoff for Node 2
- No application errors ✅
*/

// Scenario 2: Multiple Node Failures
// ─────────────────────────────────────────────────────────

/*
Setup: 6 nodes, RF=3

Nodes 2 and 3 fail simultaneously:
- Partition X replicas: [Node 2, Node 3, Node 4]
- Available replicas: [Node 4] (only 1 of 3)

Read behavior (CL=QUORUM):
- Cannot satisfy QUORUM (need 2, have 1)
- Read fails with UnavailableException ❌
- Application must handle (retry, fallback, degrade)

Write behavior (CL=QUORUM):
- Cannot satisfy QUORUM
- Write fails with UnavailableException ❌

Solution: Lower consistency level temporarily
- CL=ONE: Read/write from Node 4 ✅
- Accept stale reads (eventual consistency)
- When Nodes 2 and 3 recover: Run repair to sync
*/

// Scenario 3: Datacenter Failure
// ─────────────────────────────────────────────────────────

/*
Setup: 2 datacenters (DC1, DC2), RF=3 per DC

DC1 fails completely:
- Application routes to DC2
- LOCAL_QUORUM still satisfied in DC2
- No downtime for application ✅

Recovery:
- DC1 comes back online
- Async replication catches up
- Manual repair recommended for consistency
*/

// Scenario 4: Split Brain (Network Partition)
// ─────────────────────────────────────────────────────────

/*
Setup: 6 nodes split into 2 groups (Network partition)
Group A: Nodes 1, 2, 3 (3 nodes)
Group B: Nodes 4, 5, 6 (3 nodes)

Partition X replicas: [Node 1, Node 2, Node 4]
- Group A has 2 replicas (can satisfy QUORUM)
- Group B has 1 replica (cannot satisfy QUORUM)

Write behavior (CL=QUORUM):
- Group A: Write succeeds (2/3 replicas) ✅
- Group B: Write fails (1/3 replicas) ❌

Cassandra avoids split-brain writes:
- QUORUM prevents both sides from accepting writes independently
- When partition heals: Last-write-wins (timestamp-based)

This is CAP theorem in action:
- Cassandra chooses Availability + Partition tolerance
- Consistency tunable (QUORUM provides consistency)
*/

// ─────────────────────────────────────────────────────────
// Hinted Handoff (Write Durability During Failures)
// ─────────────────────────────────────────────────────────

const cassandra = require('cassandra-driver');

const client = new cassandra.Client({
  contactPoints: ['node1.example.com', 'node2.example.com'],
  localDataCenter: 'datacenter1',
  policies: {
    retry: new cassandra.policies.retry.RetryPolicy()
  }
});

// Write when replica unavailable
async function writeWithHintedHandoff() {
  /*
  Normal write flow (all replicas available):
  1. Coordinator receives write
  2. Sends to RF replicas (e.g., Node 1, Node 2, Node 3)
  3. Waits for CL responses (e.g., QUORUM = 2)
  4. Returns success to client
  
  Write flow with failed replica (Node 2 down):
  1. Coordinator receives write
  2. Sends to available replicas (Node 1, Node 3)
  3. Stores "hint" for Node 2 (write buffered on coordinator)
  4. Waits for CL responses (Node 1, Node 3 = QUORUM) ✅
  5. Returns success to client
  6. When Node 2 recovers: Replay hints
  
  Hinted handoff limitations:
  - Hints stored for max 3 hours (default, configurable)
  - If node down > 3 hours: Must run manual repair
  - Hints stored on coordinator (not replicated)
  */
  
  const query = 'INSERT INTO users (user_id, username, email) VALUES (?, ?, ?)';
  const params = [cassandra.types.Uuid.random(), 'john_doe', 'john@example.com'];
  
  await client.execute(query, params, { 
    consistency: cassandra.types.consistencies.quorum 
  });
  // Succeeds even if 1 of 3 replicas down (hinted handoff)
}

// ─────────────────────────────────────────────────────────
// Read Repair (Fix Inconsistencies During Reads)
// ─────────────────────────────────────────────────────────

async function readWithRepair() {
  /*
  Read repair process:
  1. Coordinator reads from CL replicas
  2. Compares timestamps
  3. If inconsistent:
     - Return latest version to client
     - Async: Send latest version to stale replicas (repair)
  
  Example (CL=QUORUM, RF=3):
  - Query user_id=123
  - Node 1: {name: "John", age: 30, timestamp: 1000}
  - Node 2: {name: "John", age: 31, timestamp: 1500} ← Latest
  - Node 3: {name: "John", age: 30, timestamp: 1000}
  
  Result:
  - Return {name: "John", age: 31} to client
  - Async: Update Node 1 and Node 3 with latest data
  */
  
  const query = 'SELECT * FROM users WHERE user_id = ?';
  const params = [cassandra.types.Uuid.fromString('550e8400-e29b-41d4-a716-446655440000')];
  
  const result = await client.execute(query, params, {
    consistency: cassandra.types.consistencies.quorum
  });
  // Automatic read repair if replicas inconsistent
  
  return result.rows[0];
}

// ─────────────────────────────────────────────────────────
// Manual Repair (Full Consistency Restoration)
// ─────────────────────────────────────────────────────────

/*
When to run manual repair:
1. After prolonged node outage (>3 hours, hints expired)
2. Periodic maintenance (weekly/monthly)
3. After network partition heals
4. Before decommissioning node

Repair process:
- Merkle tree comparison across replicas
- Stream missing data to sync replicas
- Resource-intensive (I/O, network)

Commands:
$ nodetool repair -pr          # Repair primary range only (recommended)
$ nodetool repair keyspace     # Repair entire keyspace
$ nodetool repair -full        # Full repair (all ranges)
*/
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Cassandra Security Configuration

```yaml
# ═══════════════════════════════════════════════════════════
# cassandra.yaml Security Configuration
# ═══════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────
# 1. Authentication (Username/Password)
# ─────────────────────────────────────────────────────────

authenticator: PasswordAuthenticator
# Default: AllowAllAuthenticator (no auth)

# Create users
# $ cqlsh -u cassandra -p cassandra
# cqlsh> CREATE ROLE admin WITH PASSWORD = 'admin_password' AND SUPERUSER = true AND LOGIN = true;
# cqlsh> CREATE ROLE app_user WITH PASSWORD = 'app_password' AND LOGIN = true;

# ─────────────────────────────────────────────────────────
# 2. Authorization (Role-Based Access Control)
# ─────────────────────────────────────────────────────────

authorizer: CassandraAuthorizer
# Default: AllowAllAuthorizer (no access control)

# Grant permissions
# cqlsh> GRANT SELECT ON KEYSPACE production TO app_user;
# cqlsh> GRANT MODIFY ON TABLE production.users TO app_user;
# cqlsh> GRANT ALL ON KEYSPACE analytics TO admin;

# ─────────────────────────────────────────────────────────
# 3. Encryption in Transit (TLS/SSL)
# ─────────────────────────────────────────────────────────

# Client-to-node encryption
client_encryption_options:
  enabled: true
  optional: false  # Require TLS (reject unencrypted)
  keystore: /path/to/keystore.jks
  keystore_password: keystore_password
  require_client_auth: true  # Mutual TLS
  truststore: /path/to/truststore.jks
  truststore_password: truststore_password

# Node-to-node encryption (inter-node communication)
server_encryption_options:
  internode_encryption: all  # all, none, dc, rack
  keystore: /path/to/keystore.jks
  keystore_password: keystore_password
  truststore: /path/to/truststore.jks
  truststore_password: truststore_password

# ─────────────────────────────────────────────────────────
# 4. Encryption at Rest (Transparent Data Encryption)
# ─────────────────────────────────────────────────────────

# Requires DataStax Enterprise or third-party tools
# Encrypt SSTables, CommitLog on disk

# Option 1: File system encryption (LUKS, dm-crypt on Linux)
# Option 2: Disk/volume encryption (AWS EBS encryption, Azure Disk Encryption)
# Option 3: DSE Transparent Data Encryption (commercial)

# ─────────────────────────────────────────────────────────
# 5. Audit Logging (DataStax Enterprise)
# ─────────────────────────────────────────────────────────

# Track user activity, DDL/DML operations
# audit_logging_options:
#   enabled: true
#   logger: BinAuditLogger
#   included_keyspaces: production, analytics
#   included_categories: AUTH, DDL, DML

# ─────────────────────────────────────────────────────────
# 6. Network Security
# ─────────────────────────────────────────────────────────

# Bind to private IP only
rpc_address: 10.0.1.5    # Client connections
listen_address: 10.0.1.5  # Inter-node communication

# Firewall rules (AWS Security Groups, iptables)
# - Port 9042: CQL clients (restrict to application servers)
# - Port 7000: Inter-node communication (cluster only)
# - Port 7199: JMX (monitoring only, localhost or VPN)
```

```java
// ═══════════════════════════════════════════════════════════
// Java Client with TLS and Authentication
// ═══════════════════════════════════════════════════════════

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.config.DriverConfigLoader;
import javax.net.ssl.SSLContext;
import java.nio.file.Paths;

public class SecureCassandraClient {
    
    public static CqlSession createSecureSession() {
        // Load SSL context
        SSLContext sslContext = SSLContext.getInstance("TLS");
        // ... configure with keystore/truststore
        
        // Create session with authentication + TLS
        CqlSession session = CqlSession.builder()
            .addContactPoint(new InetSocketAddress("cassandra-node.example.com", 9042))
            .withLocalDatacenter("datacenter1")
            .withAuthCredentials("app_user", "app_password")  // Authentication
            .withSslContext(sslContext)                        // TLS encryption
            .withConfigLoader(DriverConfigLoader.fromFile(
                Paths.get("application.conf")
            ))
            .build();
        
        return session;
    }
    
    public static void main(String[] args) {
        CqlSession session = createSecureSession();
        
        // Execute queries with least-privilege credentials
        PreparedStatement stmt = session.prepare(
            "SELECT * FROM production.users WHERE user_id = ?"
        );
        BoundStatement bound = stmt.bind(UUID.fromString("..."));
        ResultSet rs = session.execute(bound);
        
        // app_user only has SELECT permission on production.users
        // Attempting to DELETE would fail with UnauthorizedException
        
        session.close();
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Netflix - Cassandra for Viewing History

**Challenge:**
- 200M+ subscribers worldwide
- Billions of viewing events/day
- Store viewing history (resume position, recommendations)
- Global availability (multi-region)
- Sub-10ms latency
- Survive datacenter failures

**Solution: Multi-Region Cassandra Cluster**

**Architecture:**
- 30,000+ Cassandra nodes (largest known deployment)
- 3 AWS regions (us-east-1, eu-west-1, ap-southeast-1)
- Replication Factor: 3 per region (9 total copies)
- Keyspace replication strategy: NetworkTopologyStrategy

```sql
CREATE KEYSPACE netflix
WITH REPLICATION = {
    'class': 'NetworkTopologyStrategy',
    'us-east-1': 3,
    'eu-west-1': 3,
    'ap-southeast-1': 3
};
```

**Data Model:**

```sql
CREATE TABLE viewing_history (
    user_id uuid,
    title_id int,
    viewing_date date,
    viewing_time timestamp,
    position_seconds int,      -- Resume position
    device_type text,
    completed boolean,
    PRIMARY KEY ((user_id, viewing_date), viewing_time)
) WITH CLUSTERING ORDER BY (viewing_time DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy', 'compaction_window_size': 1, 'compaction_window_unit': 'DAYS'}
  AND default_time_to_live = 31536000;  -- 1 year retention

-- Materialized view for title-based queries (recommendations)
CREATE MATERIALIZED VIEW viewing_by_title AS
    SELECT * FROM viewing_history
    WHERE title_id IS NOT NULL
        AND user_id IS NOT NULL
        AND viewing_date IS NOT NULL
        AND viewing_time IS NOT NULL
    PRIMARY KEY ((title_id, viewing_date), viewing_time, user_id);
```

**Consistency Levels:**
- Writes: LOCAL_QUORUM (fast, don't wait for other regions)
- Reads: LOCAL_QUORUM (low latency from nearest region)
- Cross-region replication: Asynchronous

**Operations:**

```java
// Write viewing event (user presses play)
PreparedStatement writeStmt = session.prepare(
    "INSERT INTO viewing_history (user_id, title_id, viewing_date, viewing_time, position_seconds, device_type, completed) " +
    "VALUES (?, ?, ?, ?, ?, ?, ?)"
);

BoundStatement bound = writeStmt.bind(
    userId, titleId, LocalDate.now(), Instant.now(), 0, "SmartTV", false
)
.setConsistencyLevel(ConsistencyLevel.LOCAL_QUORUM);

session.execute(bound);
// Sub-10ms latency (local region only)

// Update resume position (user pauses)
PreparedStatement updateStmt = session.prepare(
    "UPDATE viewing_history SET position_seconds = ? " +
    "WHERE user_id = ? AND viewing_date = ? AND viewing_time = ?"
);

BoundStatement updateBound = updateStmt.bind(
    positionSeconds, userId, viewingDate, viewingTime
)
.setConsistencyLevel(ConsistencyLevel.LOCAL_QUORUM);

session.execute(updateBound);

// Read viewing history (user opens profile)
PreparedStatement readStmt = session.prepare(
    "SELECT * FROM viewing_history " +
    "WHERE user_id = ? AND viewing_date >= ?"
);

BoundStatement readBound = readStmt.bind(userId, LocalDate.now().minusDays(30))
    .setConsistencyLevel(ConsistencyLevel.LOCAL_QUORUM);

ResultSet rs = session.execute(readBound);
// Returns viewing history from last 30 days
```

**Results:**
- 99.99% availability
- Sub-10ms P99 latency globally
- Survived multiple AWS region outages (DR tested)
- Linear scalability (add nodes = add capacity)
- Zero downtime deployments (rolling restarts)

**Key Lessons:**
1. LOCAL_QUORUM balances consistency and latency (don't wait for other regions)
2. Time-bucketed partition keys prevent unbounded partitions (viewing_date)
3. TWCS compaction + TTL optimize storage (old data auto-deleted)
4. Peer-to-peer architecture eliminates single point of failure
5. Multi-region replication provides global availability

---

### Example 2: Apple - Cassandra for iMessage

**Challenge:**
- 1 billion+ iMessage users
- 200k+ messages/second peak
- Message delivery and storage
- End-to-end encryption
- Offline message queue (deliver when user online)

**Solution: Cassandra for Message Storage and Queuing**

**Data Model:**

```sql
-- Messages table (store sent messages)
CREATE TABLE messages (
    user_id uuid,
    conversation_id uuid,
    message_date date,
    message_time timestamp,
    message_id uuid,
    sender_id uuid,
    content blob,              -- Encrypted message
    delivered boolean,
    read boolean,
    PRIMARY KEY ((user_id, conversation_id, message_date), message_time)
) WITH CLUSTERING ORDER BY (message_time DESC)
  AND compaction = {'class': 'TimeWindowCompactionStrategy'}
  AND default_time_to_live = 2592000;  -- 30 days

-- Message queue (undelivered messages)
CREATE TABLE message_queue (
    recipient_id uuid,
    message_id uuid,
    sender_id uuid,
    conversation_id uuid,
    content blob,
    created_at timestamp,
    ttl_seconds int,
    PRIMARY KEY (recipient_id, message_id)
) WITH default_time_to_live = 604800;  -- 7 days max in queue

-- Device registration (push notification tokens)
CREATE TABLE user_devices (
    user_id uuid,
    device_id uuid,
    push_token text,
    last_seen timestamp,
    PRIMARY KEY (user_id, device_id)
);
```

**Message Flow:**

```javascript
// Send message
async function sendMessage(senderId, recipientId, conversationId, content) {
  const messageId = Uuid.random();
  const now = new Date();
  const messageDate = now.toISOString().split('T')[0];  // YYYY-MM-DD
  
  // 1. Store message for sender (sent items)
  await session.execute(
    `INSERT INTO messages (user_id, conversation_id, message_date, message_time, message_id, sender_id, content, delivered, read)
     VALUES (?, ?, ?, ?, ?, ?, ?, false, false)`,
    [senderId, conversationId, messageDate, now, messageId, senderId, content],
    { consistency: cassandra.types.consistencies.localQuorum }
  );
  
  // 2. Check if recipient online
  const recipientDevices = await session.execute(
    `SELECT device_id, push_token, last_seen FROM user_devices WHERE user_id = ?`,
    [recipientId],
    { consistency: cassandra.types.consistencies.one }
  );
  
  const recentDevices = recipientDevices.rows.filter(
    device => (Date.now() - device.last_seen.getTime()) < 60000  // Online in last 60 sec
  );
  
  if (recentDevices.length > 0) {
    // 3a. Recipient online: Deliver immediately via WebSocket
    for (const device of recentDevices) {
      await sendWebSocketMessage(device.device_id, {
        messageId,
        senderId,
        conversationId,
        content,
        timestamp: now
      });
    }
    
    // Store in recipient's messages
    await session.execute(
      `INSERT INTO messages (user_id, conversation_id, message_date, message_time, message_id, sender_id, content, delivered, read)
       VALUES (?, ?, ?, ?, ?, ?, ?, true, false)`,
      [recipientId, conversationId, messageDate, now, messageId, senderId, content],
      { consistency: cassandra.types.consistencies.localQuorum }
    );
  } else {
    // 3b. Recipient offline: Queue message
    await session.execute(
      `INSERT INTO message_queue (recipient_id, message_id, sender_id, conversation_id, content, created_at, ttl_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [recipientId, messageId, senderId, conversationId, content, now, 604800],  // 7 days TTL
      { consistency: cassandra.types.consistencies.localQuorum }
    );
    
    // Send push notification
    for (const device of recipientDevices.rows) {
      await sendPushNotification(device.push_token, {
        alert: 'New message',
        badge: 1
      });
    }
  }
}

// User comes online (deliver queued messages)
async function deliverQueuedMessages(userId) {
  // Fetch queued messages
  const queuedMessages = await session.execute(
    `SELECT * FROM message_queue WHERE recipient_id = ?`,
    [userId],
    { consistency: cassandra.types.consistencies.localQuorum }
  );
  
  for (const msg of queuedMessages.rows) {
    // Deliver via WebSocket
    await sendWebSocketMessage(userId, {
      messageId: msg.message_id,
      senderId: msg.sender_id,
      conversationId: msg.conversation_id,
      content: msg.content,
      timestamp: msg.created_at
    });
    
    // Store in recipient's messages
    const messageDate = msg.created_at.toISOString().split('T')[0];
    await session.execute(
      `INSERT INTO messages (user_id, conversation_id, message_date, message_time, message_id, sender_id, content, delivered, read)
       VALUES (?, ?, ?, ?, ?, ?, ?, true, false)`,
      [userId, msg.conversation_id, messageDate, msg.created_at, msg.message_id, msg.sender_id, msg.content],
      { consistency: cassandra.types.consistencies.localQuorum }
    );
    
    // Delete from queue
    await session.execute(
      `DELETE FROM message_queue WHERE recipient_id = ? AND message_id = ?`,
      [userId, msg.message_id],
      { consistency: cassandra.types.consistencies.localQuorum }
    );
  }
}
```

**Results:**
- Handle 200k+ messages/second
- Sub-50ms message delivery (when online)
- Reliable offline queuing (messages delivered when user comes online)
- 30-day message history storage
- Horizontal scalability (add nodes for more users)

**Key Lessons:**
1. Partition by (user_id, conversation_id, date) prevents unbounded growth
2. Separate queue table for offline messages (different access pattern)
3. TTL auto-deletes old messages (reduce storage costs)
4. LOCAL_QUORUM balances consistency and performance
5. Time-window compaction optimizes time-series data

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Answer: "Explain columnar databases"

**Answer:**
*"Columnar databases, specifically wide-column stores like Cassandra and HBase, store data by columns with flexible schema—optimized for write-heavy workloads, time-series data, and linear horizontal scalability.*

*Core architecture: Data stored using LSM trees (Log-Structured Merge Trees). Write path: Append to CommitLog (durability), write to MemTable (in-memory sorted structure), flush to SSTable (immutable file on disk). Read path: Check MemTable, Bloom filters, then SSTables—merge results. Background compaction merges SSTables, removes tombstones.*

*Data model: Partition key determines node placement via consistent hashing. Clustering key sorts data within partition. Example: sensor_id (partition key) + timestamp (clustering key) stores all sensor readings together, sorted by time. Single-partition queries extremely fast (no scatter-gather).*

*Distribution: Peer-to-peer ring (Cassandra) or master-slave (HBase). Cassandra: No master, no single point of failure. Token ring with consistent hashing—each node owns token range. Replication: Copy to N next nodes clockwise. Example: RF=3 means 3 copies of each partition.*

*Consistency: Tunable via consistency levels. Write CL + Read CL > RF = strong consistency. Example: RF=3, Write QUORUM (2), Read QUORUM (2) → 2+2 > 3 → Always read latest write. LOCAL_QUORUM common: Majority in local datacenter (low latency, doesn't wait for remote regions).*

*Linear scalability: Add nodes increases capacity proportionally. 3 nodes = 15k writes/sec, 6 nodes = 30k writes/sec, 9 nodes = 45k writes/sec. No master bottleneck, consistent hashing minimizes data movement.*

*Use cases: Time-series data (IoT sensors, metrics, logs), messaging (chat history, notifications), user activity (viewing history, clicks), write-heavy workloads (millions of writes/second), high availability (survive datacenter failures).*

*Trade-offs: No complex queries (JOINs, aggregations)—must model per query pattern. Eventual consistency by default (tunable). Read amplification (multiple SSTables). Denormalization required (storage overhead).*

*Real-world: Netflix uses Cassandra—30k+ nodes, billions of events/day, 99.99% availability. Apple iMessage uses Cassandra—200k messages/second, offline queuing. Instagram uses Cassandra—user feeds, direct messages."*

---

### Common Follow-Up Questions

**Q: "How does Cassandra achieve linear scalability?"**

**A:** *"Cassandra's linear scalability comes from five architectural choices:*

*First, peer-to-peer architecture—no master node bottleneck. All nodes equal, any node can coordinate requests. Compare to master-slave (HBase): Master becomes bottleneck at scale. Cassandra: Add node, immediately contributes to throughput.*

*Second, consistent hashing distributes data evenly. Hash(partition key) → Token (0 to 2^63-1). Nodes arranged in ring by token ranges. Example: Node A owns tokens 0-5000, Node B owns 5001-10000. Add Node C: Takes tokens 0-2500 from A, 5001-7500 from B. Only 25% of data moves (compared to 50% with naive hashing).*

*Third, virtual nodes (vnodes) improve balance. Each physical node owns 256 virtual nodes (tokens). Better distribution, especially with heterogeneous hardware (powerful node gets more vnodes). Adding/removing nodes smoother—many small token ranges moved vs few large ranges.*

*Fourth, replication maintains availability during rebalancing. RF=3 means 3 copies. Add node: Data migrates gradually (streaming). Reads/writes continue using existing replicas—zero downtime. Once migration complete, new node serves traffic.*

*Fifth, no shared state. Nodes don't coordinate writes (no consensus protocol). Each node independently writes to disk. No global locking, no coordination overhead. Write to Node A and Node B simultaneously—both accept writes, gossip eventually syncs metadata.*

*Measurement proves linearity: Netflix 30k+ nodes—roughly linear scaling from 1 node to 30k. Each node contributes 5k-10k writes/second. Total capacity: 150M-300M writes/second. No degradation as cluster grows.*

*Compare to sharded MySQL: Need external coordinator (ProxySQL, Vitess), manual shard management, cross-shard queries slow, resharding complex. Cassandra: Add node, automatic rebalancing, no external coordinator.*

*Limitations: Linear scalability assumes well-chosen partition key. Bad partition key (low cardinality, hot partitions) breaks linearity. Example: Partition by country—USA partition gets 50% of traffic, adding nodes doesn't help. Solution: Compound partition key (country + user_id) or hash-based.*

*Interview pattern: Explain architecture first (peer-to-peer, consistent hashing), then prove with numbers (3→6→9 nodes = 2x→3x throughput), finally mention prerequisites (good partition key, even distribution)."*

---

**Q: "Explain CAP theorem with Cassandra example"**

**A:** *"CAP theorem: Distributed system can provide only 2 of 3—Consistency, Availability, Partition tolerance. Network partitions inevitable in distributed systems, so real choice: CP (Consistency + Partition tolerance) or AP (Availability + Partition tolerance).*

*Cassandra is AP (Availability + Partition tolerance) with tunable consistency.*

*Scenario: 6-node Cassandra cluster, RF=3. Partition X replicas: [Node 1, Node 2, Node 3]. Network partition splits cluster: Group A (Nodes 1, 2, 3) isolated from Group B (Nodes 4, 5, 6).*

*Write to Partition X with CL=QUORUM:*
*- Group A has 2 of 3 replicas (Node 1, Node 2) → QUORUM satisfied → Write succeeds ✅*
*- Group B has 1 of 3 replicas (Node 3) → QUORUM not satisfied → Write fails ❌*

*This prevents split-brain: Both sides can't accept writes independently. Partition heals: Cassandra uses last-write-wins (timestamp comparison) to reconcile.*

*Cassandra's tunable consistency:*

*1. Strong consistency (CP-like):*
*   Write CL=QUORUM, Read CL=QUORUM*
*   Formula: R + W > RF → 2 + 2 > 3 ✅*
*   Always read latest write (no stale reads)*
*   Trade-off: Lower availability (fails if can't reach QUORUM)*

*2. Eventual consistency (AP):*
*   Write CL=ONE, Read CL=ONE*
*   Formula: R + W ≤ RF → 1 + 1 ≤ 3*
*   May read stale data temporarily*
*   Trade-off: Higher availability (succeeds even if only 1 replica available)*

*3. Multi-datacenter (common production):*
*   Write CL=LOCAL_QUORUM (majority in local DC)*
*   Read CL=LOCAL_QUORUM*
*   Benefit: Low latency (don't wait for remote DCs)*
*   Trade-off: Remote DC sees stale data briefly (async replication)*

*Real-world example: Netflix viewing history*
*- Write CL=LOCAL_QUORUM (fast writes, don't wait for EU/Asia)*
*- Read CL=LOCAL_QUORUM (low latency from nearest region)*
*- User pauses video in USA → Writes to us-east-1 (LOCAL_QUORUM)*
*- User resumes in USA 5 min later → Reads from us-east-1 (consistent)*
*- User flies to EU next day → May see stale resume position for ~1 second (async replication lag), then corrects*

*Acceptable trade-off: 99.9% of time, user in same region (consistent). 0.1% of time (travel), brief inconsistency tolerable for viewing history.*

*Compare to CP system (traditional RDBMS): Master-slave replication. Network partition: Writes to master succeed, reads from slave may be stale. But if master fails, entire system unavailable until failover (30-60 seconds). Cassandra: No master, survives multiple node failures with no downtime.*

*Interview pattern: Explain CAP theorem, show Cassandra's AP default, demonstrate tunable consistency (QUORUM for CP-like), give real-world example with acceptable trade-offs."*

---

**Q: "When would you choose Cassandra over MongoDB?"**

**A:** *"Five decision criteria:*

*First, write throughput requirements. Cassandra: Write-optimized (LSM trees, append-only, no read-before-write). Handle millions of writes/second. Example: 1M sensor readings/minute = 16,667 writes/sec—Cassandra handles easily on 3-5 nodes. MongoDB: Update-heavy workloads slower (read-modify-write for in-place updates). If >10k writes/second sustained—Cassandra advantage.*

*Second, data model and queries. MongoDB: Flexible documents, rich queries (nested fields, arrays, aggregation pipelines), $lookup for JOINs. Cassandra: Fixed schema (CQL tables), simple queries (partition key + optional clustering key filters), no JOINs. If need: Complex nested data, ad-hoc queries, aggregations—MongoDB wins. If need: Simple time-series, known query patterns—Cassandra wins.*

*Third, consistency requirements. MongoDB: Strong consistency by default (primary read/write). Replica lag minimal (<10ms typical). Cassandra: Tunable consistency, eventual by default. Read QUORUM + Write QUORUM for strong consistency, but higher latency. If need: Banking, inventory (strong consistency critical)—MongoDB safer. If need: Analytics, social media (eventual consistency OK)—Cassandra fine.*

*Fourth, scalability and operations. Cassandra: Built-in sharding, peer-to-peer, true linear scalability to thousands of nodes. Add node = add capacity (zero coordination). MongoDB: Sharding via mongos routers, more operational complexity, practical limit ~100 shards. If need: Massive scale (>100 nodes), operational simplicity—Cassandra wins. If need: <20 nodes, rich queries—MongoDB simpler.*

*Fifth, multi-datacenter replication. Cassandra: Native multi-DC support, LOCAL_QUORUM (fast local writes/reads), async cross-DC replication. Netflix: 3 AWS regions, sub-10ms latency globally. MongoDB: Replica sets span DCs, but higher cross-DC latency (primary waits for majority including remote replicas). If need: Global presence, low latency—Cassandra better.*

*Real-world examples:*

*Cassandra use cases:*
*- Netflix viewing history: Billions of writes/day, time-series, eventual consistency OK, multi-region*
*- Apple iMessage: 200k messages/second, write-heavy, simple queries (user + timestamp)*
*- Instagram user feeds: Millions of users, write-heavy (posts, likes), simple timeline queries*

*MongoDB use cases:*
*- Uber trip data: Complex nested documents (pickup, dropoff, waypoints, fare breakdown), flexible schema (new trip types), rich queries (geospatial, aggregation)*
*- eBay product catalog: Variable product attributes, full-text search, complex filters*
*- Healthcare records: Complex nested data, HIPAA compliance (ACID transactions), ad-hoc queries*

*Hybrid approach common: Cassandra for time-series writes (events, logs, metrics), MongoDB for metadata (user profiles, product catalog), RDBMS for transactions (orders, payments). Each database optimized for use case.*

*Interview decision tree:*
*1. Write throughput >10k/sec sustained? → Cassandra*
*2. Complex nested data, flexible queries? → MongoDB*
*3. Strong consistency critical (money, inventory)? → MongoDB or RDBMS*
*4. Need >100 nodes or multi-region? → Cassandra*
*5. Team expertise SQL-like (CQL)? → Cassandra. Team expertise JSON/aggregations? → MongoDB*

*Avoid: Choosing based on hype. Choose based on: Access patterns, scale, consistency needs, operational complexity."*

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why Columnar Databases Matter

**Business Impact:**
- **Scale**: Handle billions of events/day (IoT, analytics, user activity)
- **Availability**: 99.99%+ uptime (no single point of failure, survive datacenter outages)
- **Cost**: Linear scaling = predictable costs (add nodes proportionally)
- **Performance**: Sub-10ms writes, millions of operations/second
- **Global**: Multi-datacenter replication (low latency worldwide)

**Technical Impact:**
- **Write throughput**: 10-100x faster than RDBMS for time-series data
- **Horizontal scaling**: Add nodes = add capacity (no resharding complexity)
- **Fault tolerance**: Replicated data, automatic failover, hinted handoff
- **Operational simplicity**: Peer-to-peer (no master to manage), auto-rebalancing
- **Schema flexibility**: Add columns without migrations

### How Columnar Databases Work

**Core Architecture (Cassandra):**
1. **LSM Tree storage**: CommitLog (durability) → MemTable (in-memory) → SSTable (immutable disk files) → Compaction (merge, optimize)
2. **Consistent hashing**: Hash(partition key) → Token → Node in ring. Even distribution, minimal data movement on scaling
3. **Replication**: Copy partition to N next nodes (clockwise in ring). RF=3 typical
4. **Peer-to-peer**: No master, all nodes equal. Gossip protocol for cluster metadata
5. **Tunable consistency**: CL (consistency level) per query. QUORUM, ONE, ALL, LOCAL_QUORUM

**Data Model:**
- **Partition key**: Determines node placement (must be in WHERE clause)
- **Clustering key**: Sorts data within partition (enables range queries)
- **Columns**: Flexible, sparse (different rows can have different columns)
- **Query-driven design**: One table per query pattern (denormalization)

**Write Path:**
1. Client → Coordinator node (any node)
2. Coordinator hashes partition key → Identifies replicas
3. Sends write to RF replicas
4. Each replica: Append to CommitLog → Write to MemTable → ACK
5. Coordinator waits for CL responses (e.g., QUORUM = 2 of 3)
6. Return success to client
7. Background: MemTable full → Flush to SSTable, Compaction merges SSTables

**Read Path:**
1. Client → Coordinator
2. Coordinator queries RF replicas
3. Each replica: Check MemTable → Bloom filters → SSTables
4. Merge results, return latest version (by timestamp)
5. Read repair: Async fix inconsistencies

### Key Design Patterns

**1. Time-Series Pattern:**
- Partition by entity + time bucket (sensor_id, date)
- Clustering by timestamp
- TWCS compaction + TTL for auto-cleanup

**2. Multi-Tenant Pattern:**
- Partition by tenant_id
- Isolation (each tenant on own partitions)
- Fair resource allocation

**3. Queue Pattern:**
- Partition by user_id
- Clustering by timestamp
- TTL for auto-expiration (message queues, notifications)

**4. Counter Pattern:**
- Counter data type (no read-before-write)
- Eventually consistent
- Use case: Page views, likes, metrics

### Trade-Offs to Remember

```
Write Speed ←→ Read Speed
- STCS: Fast writes, slower reads (many SSTables)
- LCS: Slower writes, fast reads (predictable SSTables)
- TWCS: Optimized for time-series with TTL

Consistency ←→ Availability
- QUORUM: Strong consistency, lower availability (fails if can't reach majority)
- ONE: Eventual consistency, high availability (succeeds with any replica)
- LOCAL_QUORUM: Balance (fast local ops, eventual cross-DC consistency)

Flexibility ←→ Performance
- Denormalization: Fast queries, storage overhead, consistency complexity
- Normalization: Storage efficient, multiple queries, slower (no JOINs)

Scalability ←→ Query Flexibility
- Cassandra: Massive scale, simple queries (partition key required)
- MongoDB: Moderate scale, rich queries (aggregations, JOINs)
```

### Interview Red Flags

🚫 "Columnar databases always faster than relational"
✅ "Columnar databases optimize for write-heavy time-series workloads. Relational databases better for complex queries, transactions, JOINs."

🚫 "Cassandra provides strong consistency"
✅ "Cassandra provides tunable consistency. Strong consistency possible (QUORUM read + write) but eventual consistency default. Choose based on use case."

🚫 "No need to model schema in Cassandra"
✅ "Cassandra requires careful schema design. Query-driven design: Model per query pattern. Partition key selection critical (high cardinality, even distribution, query-aligned)."

### Final Sound Bite

*"Columnar databases (wide-column stores): NoSQL databases storing data by columns with flexible schema—optimized for write-heavy workloads, time-series data, and linear horizontal scalability.*

*Cassandra architecture: Peer-to-peer ring (no master, no SPOF), consistent hashing (even distribution), LSM tree storage (write-optimized: CommitLog → MemTable → SSTable → Compaction). Replication: Copy to N next nodes (RF=3 typical). Tunable consistency: CL per query (QUORUM, ONE, ALL, LOCAL_QUORUM).*

*Data model: Partition key (node placement, must be in WHERE), clustering key (sort within partition), flexible columns (sparse). Query-driven design: One table per query pattern (denormalization). Example: sensor_id + date (partition) + timestamp (clustering) → All sensor readings together, sorted by time.*

*Write path: Client → Coordinator → Hash partition key → Send to RF replicas → Each appends CommitLog, writes MemTable → Wait CL responses → Return success. Sub-10ms typical. Read path: Query replicas → Check MemTable, Bloom filters, SSTables → Merge results → Return latest (by timestamp) → Async read repair.*

*Linear scalability: Peer-to-peer (no master bottleneck), consistent hashing (minimal data movement), replication (availability during rebalance), no shared state. 3 nodes = 15k writes/sec, 6 nodes = 30k, 9 nodes = 45k (linear). Netflix: 30k+ nodes.*

*Consistency levels: Strong consistency: R + W > RF (QUORUM + QUORUM). Eventual consistency: R + W ≤ RF (ONE + ONE). Multi-DC: LOCAL_QUORUM (fast local ops, async cross-DC). CAP theorem: Cassandra is AP (Availability + Partition tolerance) with tunable consistency.*

*Use cases: Time-series (IoT sensors, metrics, logs), messaging (chat history, notifications), user activity (viewing history, feeds), write-heavy (millions writes/second), high availability (survive DC failures). Real-world: Netflix viewing history (30k nodes, billions events/day), Apple iMessage (200k messages/sec), Instagram feeds.*

*Trade-offs: No complex queries (JOINs, aggregations). Must model per query pattern (denormalization). Read amplification (multiple SSTables, fixed by compaction). Eventual consistency default (tunable to QUORUM). Compare MongoDB: Flexible queries, complex aggregations, but harder to scale >100 nodes."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
