# Foundation 04 — Database Design

> Choosing the wrong database is one of the most expensive architectural mistakes.
> Know when to use SQL, NoSQL, NewSQL, and every variant.

---

## SQL vs NoSQL Decision Framework

```
Ask these questions in order:

1. Do I need ACID transactions?
   Yes → Lean SQL
   No  → Consider NoSQL

2. Is my schema well-defined and stable?
   Yes → SQL
   No  → Document DB (MongoDB)

3. Is my data highly relational? Complex joins?
   Yes → SQL
   No  → Continue

4. What's my scale? >100K writes/sec?
   Yes → NoSQL (Cassandra, DynamoDB)
   No  → SQL can handle it

5. Is it time-series / append-only?
   Yes → TimescaleDB, InfluxDB, Cassandra
   No  → Continue

6. Do I need full-text search?
   Yes → Elasticsearch (alongside primary DB)
   No  → Continue

7. Is it a graph problem?
   Yes → Neo4j, Amazon Neptune
   No  → Default: PostgreSQL
```

---

## Database Categories

### Relational (SQL)

**PostgreSQL**
- Best general-purpose relational DB
- JSONB for semi-structured data
- Rich indexing (B-tree, GiST, GIN, BRIN)
- Native full-text search (limited)
- PostGIS for geospatial
- Max: ~10K QPS writes, ~50K QPS reads (single node)

**MySQL/MariaDB**
- Extremely mature, widely supported
- InnoDB engine: ACID compliant
- Superior replication ecosystem
- Common in LAMP stack
- Amazon Aurora (MySQL-compatible) for managed scale

**Amazon Aurora**
- MySQL/PostgreSQL compatible
- 5x faster than MySQL for same hardware
- 6-way replication across 3 AZs
- Serverless variant for variable workloads
- Max: ~200K QPS reads (read replicas), ~100K writes

---

### Wide-Column Stores

**Cassandra**
```
Best for:  Time-series, write-heavy, massive scale
Avoid for: Complex queries, heavy reads, ACID needs

Key features:
- Masterless (every node equal)
- Linear write scalability
- Tunable consistency (ONE, QUORUM, ALL)
- No joins, no secondary indexes (avoid them)
- Partition key → Row key → Columns

Data model: Design for query, not normalization
```

**HBase**
- Hadoop ecosystem, built on HDFS
- Strong consistency (ZooKeeper-based)
- Good for analytical + operational (HTAP)
- Used by: Facebook (historical)

---

### Document Stores

**MongoDB**
```
Best for:  Flexible schema, catalogs, CMS, user profiles
Avoid for: Multi-document transactions (improving), heavy analytics

Key features:
- BSON documents (binary JSON)
- Powerful aggregation pipeline
- Atlas Search (Lucene-based)
- Transactions (v4.0+, but expensive)
- Sharding built-in

Index types: Single, Compound, Multikey, Text, Geospatial, Wildcard
```

---

### Key-Value Stores

**Redis**
```
Best for:  Cache, sessions, leaderboards, pub/sub, rate limiting
Avoid for: Primary data store for critical data (unless Redis Cluster)

Data structures:
- String:  Simple key-value, counters
- List:    Message queues, activity feeds
- Set:     Unique members, tags
- Sorted Set: Leaderboards, timelines
- Hash:    Object storage, user profiles
- Stream:  Event log (Kafka-lite)
- Bitmap:  Feature flags, analytics
- HyperLogLog: Unique count estimation

Persistence:
- RDB (snapshots): Fast startup, may lose recent writes
- AOF (append-only file): Slower but more durable
- AOF + RDB: Best of both
```

**DynamoDB**
```
Best for:  AWS-native, serverless, key-value at massive scale
Avoid for: Complex queries, heavy analytics

Key features:
- Single-digit millisecond latency at any scale
- Serverless (no capacity planning needed with on-demand)
- DynamoDB Streams for CDC
- Global Tables for multi-region
- DAX (DynamoDB Accelerator) for microsecond cache

Access patterns must be known upfront!
```

---

### Search Engines

**Elasticsearch**
```
Best for:  Full-text search, log analytics, complex queries
Avoid for: Primary data store, transactional workloads

Architecture:
- Index → Shards → Replicas
- Inverted index for text search
- Near real-time (1 second refresh interval)

Uses:
- Log aggregation (ELK stack)
- Product search
- Autocomplete
- Geospatial search
```

---

### Time-Series

**InfluxDB**
```
Best for: Metrics, IoT, monitoring
Write rate: 1M+ points/second

Query: InfluxQL or Flux
Retention policies: Auto-expire old data
Continuous queries: Pre-compute aggregations
```

**TimescaleDB**
```
PostgreSQL extension for time-series
Best when you already use PostgreSQL
Automatic hypertable partitioning by time
Continuous aggregates for rollups
```

---

### Graph Databases

**Neo4j**
```
Best for: Social networks, fraud detection, recommendations
Query language: Cypher

When relationships ARE the data:
(Alice)-[:FOLLOWS]->(Bob)-[:FOLLOWS]->(Carol)

Find all friends-of-friends in 1 query vs dozens of SQL joins
```

---

## Sharding Strategies

### What is Sharding?
Horizontal partitioning of data across multiple database servers (shards).

```
Without sharding:
  All data → Single DB → Bottleneck at write scale

With sharding:
  Data partitioned → Multiple DBs → Linear write scale
```

### Sharding Strategies

**1. Range-Based Sharding**
```
Shard 1: user_id 1 - 1,000,000
Shard 2: user_id 1,000,001 - 2,000,000
Shard 3: user_id 2,000,001 - 3,000,000

Pros: Range queries efficient, easy to add shards
Cons: Hot spots (new users all go to last shard)
```

**2. Hash-Based Sharding**
```
shard = hash(user_id) % num_shards

Pros: Even distribution
Cons: Range queries require all shards, resharding is painful
```

**3. Consistent Hash Sharding**
```
hash(user_id) → position on ring → nearest shard
Virtual nodes for even distribution

Pros: Minimal resharding on topology change
Cons: More complex implementation
Used by: Cassandra, DynamoDB
```

**4. Directory-Based Sharding**
```
Lookup table: {user_id → shard_id}

Pros: Full flexibility, easy to move data
Cons: Lookup table is a bottleneck and SPOF
```

**5. Geographic Sharding**
```
US users → US shard (us-east, us-west)
EU users → EU shard (eu-west, eu-central)

Pros: Data residency compliance, lower latency
Cons: Cross-region queries, hotspots by region
```

### Resharding Strategies

```
Problem: Adding a shard means moving data

Approaches:
1. Double the shard count (only move 50% of data)
2. Consistent hashing (only adjacent keys move)
3. Logical sharding (more logical shards than physical,
   map multiple logical to one physical, then split)
```

---

## Replication

### Master-Replica (Single Leader)

```
Write → Master → replication → Replicas (read)
                              → Replicas (read)
                              → Replicas (read)

Pros:  Simple, easy to implement, reads scale horizontally
Cons:  Master is write bottleneck, replica lag, failover complexity
```

**Replication Lag Problem:**
```
User updates profile → writes to Master
User immediately reads → may hit Replica with stale data

Solution: "Read-your-own-writes"
- Route writes AND subsequent reads to Master for a short window
- Or use Redis to cache the fact "user X just wrote" for 5 seconds
```

### Multi-Master (Multi-Leader)

```
Master 1 ←→ Master 2
   ↓              ↓
Replicas      Replicas

Pros:  Both masters accept writes, geographic distribution
Cons:  Write conflict resolution complex, "last write wins" issues
Used by: CouchDB, MySQL Group Replication
```

**Conflict Resolution:**
```
1. Last Write Wins (LWW): Use timestamp, latest wins (risk: data loss)
2. Merge:                 Merge both versions (good for sets/lists)
3. Operational Transform: Google Docs approach for text
4. CRDTs:                 Data structures that merge without conflict
```

### Leaderless Replication

```
Client → sends to all N replicas (or a quorum)
Read  → reads from R replicas, takes most recent
Write → writes to W replicas

W + R > N → strong consistency
W + R ≤ N → eventual consistency

Used by: DynamoDB, Cassandra, Riak
```

---

## CQRS (Command Query Responsibility Segregation)

**Concept:** Separate the read model from the write model.

```
               ┌─────────────┐
Writes ──────▶ │ Write Model │──▶ Event Store / Master DB
               │ (Commands)  │         │
               └─────────────┘         │ events/CDC
                                        ▼
               ┌─────────────┐  ┌─────────────────┐
Reads  ──────▶ │ Read Model  │◀─│ Read DB          │
               │ (Queries)   │  │ (Elasticsearch,  │
               └─────────────┘  │  Redis, Replica) │
                                 └─────────────────┘
```

**Why use CQRS:**
- Read model optimized for queries (denormalized, fast)
- Write model optimized for consistency (normalized, ACID)
- Scale reads and writes independently
- Different persistence technologies per side

**Use cases:**
- Twitter timeline (write to user table, read from precomputed feed)
- E-commerce (write orders normalized, read catalog denormalized)
- Financial reporting (write transactions, read aggregated reports)

---

## Event Sourcing

**Concept:** Store events (facts), not current state. Derive state by replaying events.

```
Traditional:
  orders table: {id: 123, status: "shipped", total: 99.99}
  ↓ When order cancelled, update the row
  orders table: {id: 123, status: "cancelled", total: 99.99}
  (What happened? When? History lost)

Event Sourcing:
  events: [
    {order_id: 123, event: "ORDER_CREATED",   amount: 99.99, ts: T1}
    {order_id: 123, event: "PAYMENT_RECEIVED", amount: 99.99, ts: T2}
    {order_id: 123, event: "ORDER_SHIPPED",    carrier: "FedEx", ts: T3}
    {order_id: 123, event: "ORDER_CANCELLED",  reason: "lost", ts: T4}
  ]
  Current state = replay all events for order 123
```

**Benefits:**
- Complete audit trail
- Time travel (reconstruct state at any point)
- Event-driven integration
- Debugging / root cause analysis

**Drawbacks:**
- Complex to query (need read models / snapshots)
- Event schema evolution is hard
- Replay can be slow for old aggregates (use snapshots)

**Snapshot Pattern:**
```
Every 100 events → take snapshot of current state
On read: load latest snapshot + replay events after snapshot
```

---

## Indexing Strategies

### B-Tree Index (Default)
```
Best for: Equality and range queries
SELECT * WHERE id = 123
SELECT * WHERE created_at BETWEEN t1 AND t2
SELECT * WHERE user_id = 5 ORDER BY created_at DESC
```

### Composite Index
```sql
-- Index on (user_id, created_at)
-- Supports: WHERE user_id = 5
-- Supports: WHERE user_id = 5 AND created_at > t1
-- Does NOT support: WHERE created_at > t1 (left prefix rule)

-- Rule: Put equality columns first, range columns last
CREATE INDEX idx_user_posts ON posts(user_id, created_at DESC);
```

### Covering Index
```sql
-- Index contains all columns needed by query → no table lookup
CREATE INDEX idx_cover ON posts(user_id, created_at, title);
-- Query can be answered entirely from index
SELECT title FROM posts WHERE user_id = 5 ORDER BY created_at;
```

### Partial Index
```sql
-- Index only a subset of rows
CREATE INDEX idx_active ON users(email) WHERE status = 'active';
-- Much smaller than full index, faster for filtered queries
```

### Full-Text Index
```sql
-- PostgreSQL
CREATE INDEX idx_fts ON posts USING GIN(to_tsvector('english', content));
-- Query
SELECT * FROM posts WHERE to_tsvector('english', content) @@ 'typescript';
```

### Geospatial Index
```sql
-- PostGIS
CREATE INDEX idx_geo ON locations USING GIST(geom);
-- Query: find all restaurants within 5km
SELECT * FROM locations 
WHERE ST_DWithin(geom, ST_MakePoint(-73.9857, 40.7484)::geography, 5000);
```

---

## Connection Pooling

```
Problem: Each DB connection is expensive (~1-5MB memory, ~5ms setup)
         10K concurrent users → 10K DB connections → DB crashes

Solution: Connection pool

Application servers ──┐
                      ├──▶ PgBouncer / ProxySQL ──▶ PostgreSQL
Application servers ──┘    (pool: 100 connections)   (accepts 100)

Benefits:
- Reuse connections (don't create/destroy per request)
- Queue excess requests (don't reject)
- Multiplex: 1000 app connections → 100 DB connections
```

**Tools:** PgBouncer (PostgreSQL), ProxySQL (MySQL), RDS Proxy (AWS)

---

## Database Anti-Patterns to Know

| Anti-Pattern | Problem | Solution |
|-------------|---------|---------|
| N+1 queries | N queries for N records | JOIN or batch fetch |
| SELECT * | Over-fetching, breaks schema changes | SELECT specific columns |
| No indexes | Full table scans | Index on query predicates |
| Fat transactions | Lock held too long | Break into smaller txns |
| GUID as primary key | Random I/O, fragmentation | Sequential UUID (ULIDv7) |
| ORM lazy loading | Generates N+1 queries | Eager loading |
| Store JSON blobs | Can't query/index | Normalize or use JSONB |
| Premature sharding | Added complexity without benefit | Optimize single DB first |

---

## Database Decision Tree (Interview Summary)

```
Need ACID + joins + complex queries?
  → PostgreSQL / MySQL / Aurora

Need massive write throughput + no joins?
  → Cassandra / DynamoDB

Need flexible schema + document model?
  → MongoDB

Need fast cache + simple data structures?
  → Redis

Need full-text search?
  → Elasticsearch (alongside primary DB)

Need time-series?
  → InfluxDB / TimescaleDB / Cassandra

Need graph traversal?
  → Neo4j / Amazon Neptune

Need data warehouse + analytics?
  → BigQuery / Redshift / Snowflake

Need object storage?
  → S3 / GCS / Azure Blob
```

---

*Next: `05_caching.md`*
