# Columnar Databases — Cassandra Basics 🆕
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Cassandra = a wide-column, distributed database designed for extremely high write throughput and linear horizontal scaling. Originally built by Facebook for the inbox. Used by Netflix, Instagram, Apple for time-series and write-heavy workloads.
- Data model: partition key → a set of rows (cluster) sorted by clustering key. Not tables in the SQL sense. Think of it as a distributed sorted map: `partition_key → { clustering_key → column_values }`.
- Design rule: define your table by your query. EVERY Cassandra table is designed for ONE specific query pattern. There is no ad-hoc querying — running a query that doesn't match the primary key structure requires ALLOW FILTERING (dangerous — full cluster scan).
- Primary key anatomy: `PRIMARY KEY (partition_key, clustering_key1, clustering_key2)`. Partition key determines which node stores the data (hash-distributed across the cluster). Clustering keys sort rows within a partition.
- Writes: Cassandra writes are appends to an in-memory MemTable, flushed to SSTables (Sorted String Tables). No locks, no reads needed on write. This makes Cassandra writes extremely fast — orders of magnitude faster than relational DBs at scale.
- Reads: efficient ONLY when the partition key is known. Point lookups and range scans within a partition are fast. Cross-partition queries are expensive (must hit all nodes).
- Denormalization is expected and required: you will have the SAME data in multiple tables, each designed for a different query. "One table per query" is the Cassandra design philosophy.
- Gap to bridge: candidates say "use Cassandra for high write throughput" but cannot explain PRIMARY KEY anatomy, why ALLOW FILTERING is dangerous, or why Cassandra is unsuitable for multi-row transaction workloads

---

## 1. One-Line Definition
Cassandra is a wide-column, masterless distributed database optimised for high-volume write throughput and time-series data, where every table is explicitly designed for a single known query pattern rather than supporting ad-hoc SQL-style queries.

---

## 2. The Problem It Solves

```
USE CASE: IoT sensor telemetry system.
  10,000 sensors sending temperature readings every 5 seconds.
  10,000 × 12 readings/minute × 60 min × 24 hours = 172,800,000 rows/day.
  Queries: always by sensor_id within a time range.

PostgreSQL:
  Table: sensor_readings(sensor_id, reading_ts, value)
  172M new rows/day → 5TB/year
  Single write-master: INSERT throughput limited to ~50K/sec on one server.
  At 33K inserts/sec peak: primary saturates. No easy write scaling without sharding.
  Cross-shard queries: complex application code.

Cassandra:
  CREATE TABLE sensor_readings (
    sensor_id UUID,
    reading_ts TIMESTAMP,
    value DOUBLE,
    PRIMARY KEY (sensor_id, reading_ts)
  ) WITH CLUSTERING ORDER BY (reading_ts DESC);
  
  Writes distributed across all Cassandra nodes — each node accepts writes.
  Zero write masters. 20-node cluster: ~20× write throughput capacity.
  172M inserts/day across 20 nodes = 8.6M inserts per node per day: trivial.
  
  Query: SELECT * FROM sensor_readings WHERE sensor_id=? AND reading_ts > ?
  → Hits exactly ONE partition (the sensor's node). Sub-millisecond.
```

---

## 3. How It Works Internally

### Primary Key Anatomy

```
CREATE TABLE user_activity (
  user_id    UUID,           ← PARTITION KEY: hash(user_id) → node assignment
  event_ts   TIMESTAMP,     ← CLUSTERING KEY 1: sort order within partition
  event_type TEXT,           ← CLUSTERING KEY 2: sub-sort within timestamp
  payload    TEXT,
  PRIMARY KEY (user_id, event_ts, event_type)
) WITH CLUSTERING ORDER BY (event_ts DESC, event_type ASC);

PARTITION KEY (user_id):
  Cassandra computes: hash(user_id) % num_tokens → assigns to specific node.
  ALL rows for a given user_id are on the SAME node.
  This enables: WHERE user_id=? → single node lookup.
  
  If you query WITHOUT user_id in WHERE clause:
    Cassandra must scan ALL nodes — ALLOW FILTERING required (dangerous in production).

CLUSTERING KEYS (event_ts DESC, event_type ASC):
  Within the partition for user_id X, rows are stored sorted by event_ts DESC.
  "Most recent events first" in storage — efficient for "latest N events" queries.
  
  Fast queries:
  SELECT * FROM user_activity WHERE user_id=? LIMIT 20
    → recent 20 events for user — reads first 20 entries at start of partition
  SELECT * FROM user_activity WHERE user_id=? AND event_ts > '2026-01-01'
    → time range for user — seeks within partition efficiently
  
  Slow / forbidden:
  SELECT * FROM user_activity WHERE event_ts > '2026-01-01' (no user_id filter)
    → No partition filter — must scan all partitions across all nodes
    → ALLOW FILTERING required → DO NOT USE IN PRODUCTION

MULTIPLE QUERIES = MULTIPLE TABLES:
  "All activity for user X" → table: user_activity (partition by user_id)
  "All 'purchase' events in the last hour" → DIFFERENT table:
    CREATE TABLE activity_by_type_and_time (
      event_type TEXT,
      event_ts   TIMESTAMP,
      user_id    UUID,
      payload    TEXT,
      PRIMARY KEY (event_type, event_ts)  ← partition by event_type, sort by time
    )
```

### Cassandra Write Path (Why Writes are Fast)

```
Write arrives at any node (Coordinator):
  1. Coordinator routes to the correct replica nodes based on the partition key.
  2. Each replica:
     a. Writes to COMMIT LOG (sequential disk write — very fast)
     b. Writes to MEMTABLE (in-memory sorted structure)
     c. Returns ACK to coordinator
  3. Coordinator returns success to client (based on consistency level).

No locking, no read before write, no index maintenance during write.
Writes are pure appends. This is why Cassandra write throughput is extraordinary.

Later (async background process):
  MemTable fills up → flushed to SSTable (Sorted String Table on disk).
  SSTables are immutable — never updated in-place.
  Compaction runs periodically: merges SSTables, removes tombstones (deleted rows).

Consistency levels:
  Write:
    ONE → only 1 replica confirms: fastest, may lose data if that node dies
    QUORUM → majority of replicas confirm: replication_factor/2 + 1 nodes
    ALL → all replicas confirm: slowest, highest durability
  
  Read:
    ONE → read from 1 replica: may return stale data
    QUORUM → read from majority, return most recent: strong consistency
    LOCAL_QUORUM → quorum within the local datacenter (geo-distributed setup)
```

---

## 4. The Code

### Cassandra Table Design and Spring Data
```java
// Spring Boot + Spring Data Cassandra

// Entity: define the table structure
@Table("orders_by_customer")   // CQL table name
@Data
@NoArgsConstructor
public class CustomerOrder {

    // Partition key: all orders for a customer on the same node
    @PartitionKey
    @Column("customer_id")
    private UUID customerId;

    // Clustering key 1: orders sorted by date (newest first)
    @ClusteringColumn(0)
    @Column("order_date")
    private LocalDate orderDate;

    // Clustering key 2: tiebreaker within the same date
    @ClusteringColumn(1)
    @Column("order_id")
    private UUID orderId;

    private String status;
    private BigDecimal total;

    @Column("item_count")
    private int itemCount;
}

// Repository: queries are restricted to primary key patterns
public interface CustomerOrderRepository
        extends CassandraRepository<CustomerOrder, CustomerOrderId> {

    // GOOD: partition key is in the filter → single node lookup
    List<CustomerOrder> findByCustomerId(UUID customerId);

    // GOOD: partition + clustering key range → range scan within partition
    List<CustomerOrder> findByCustomerIdAndOrderDateGreaterThanEqual(
        UUID customerId, LocalDate fromDate
    );

    // Paginated: Cassandra supports LIMIT and paging via Pageable
    Slice<CustomerOrder> findByCustomerId(UUID customerId, Pageable pageable);
}

// Service: using the repository
@Service
@RequiredArgsConstructor
public class OrderHistoryService {

    private final CustomerOrderRepository orderRepo;

    // Get customer's recent orders (last 30 days, page 1)
    public List<CustomerOrderDto> getRecentOrders(UUID customerId) {
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);

        return orderRepo
            .findByCustomerIdAndOrderDateGreaterThanEqual(customerId, thirtyDaysAgo)
            .stream()
            .map(CustomerOrderDto::from)
            .toList();
    }
}
```

```sql
-- CQL: Create table + index considerations
-- Cassandra does not support arbitrary secondary indexes efficiently.
-- Design separate tables for each query pattern.

-- Table 1: orders by customer (query: all orders for customer X)
CREATE TABLE IF NOT EXISTS orders_by_customer (
    customer_id  UUID,
    order_date   DATE,
    order_id     UUID,
    status       TEXT,
    total        DECIMAL,
    item_count   INT,
    PRIMARY KEY (customer_id, order_date, order_id)
) WITH CLUSTERING ORDER BY (order_date DESC, order_id ASC);

-- Table 2: orders by merchant (query: all orders for merchant Y in a date range)
-- SAME underlying order data, DIFFERENT table, DIFFERENT partition key
CREATE TABLE IF NOT EXISTS orders_by_merchant (
    merchant_id  UUID,
    order_date   DATE,
    order_id     UUID,
    customer_id  UUID,
    status       TEXT,
    total        DECIMAL,
    PRIMARY KEY (merchant_id, order_date, order_id)
) WITH CLUSTERING ORDER BY (order_date DESC, order_id ASC);

-- Table 3: orders by status (query: all PENDING orders — for processing jobs)
CREATE TABLE IF NOT EXISTS orders_by_status (
    status       TEXT,
    order_date   DATE,
    order_id     UUID,
    customer_id  UUID,
    total        DECIMAL,
    PRIMARY KEY (status, order_date, order_id)
) WITH CLUSTERING ORDER BY (order_date ASC, order_id ASC);
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "When would you choose Cassandra over PostgreSQL?"

**Hruday's answer:**
> I'd choose Cassandra when two conditions are both true: extremely high write throughput requirements (hundreds of thousands of writes per second) AND the access patterns are always by a known partition key.
>
> The canonical use cases: IoT time-series data (sensor readings, device telemetry), user activity event streams, audit logs, social media feed events. Common characteristic: append-heavy, ordered by time, always queried by entity ID plus time range.
>
> I'd keep PostgreSQL for: anything requiring multi-row transactions (financial operations), ad-hoc queries where you don't know the access pattern at design time, complex JOINs, and aggregations across different partition keys.
>
> The warning: Cassandra is not a drop-in replacement for SQL. It requires fundamentally different schema design — if you don't know your queries upfront, you cannot design the tables correctly. Migrating to Cassandra without understanding this leads to ALLOW FILTERING everywhere, which performs worse than PostgreSQL.

---

### Q2 — PRIMARY KEY Design
**Interviewer asks:** "Design a Cassandra table for a chat application's message history."

**Hruday's answer:**
> Access pattern: "Give me the last N messages in conversation X, paginated."
>
> Primary key: `(conversation_id, sent_at, message_id)`. The partition key is conversation_id — all messages in one conversation live on the same node, enabling single-node lookups. The clustering key is sent_at in descending order — messages are stored newest-first, so a LIMIT 20 query efficiently reads the 20 most recent messages without scanning older ones. message_id breaks ties if two messages arrive at the same millisecond.
>
> Secondary access pattern: "Get all messages from user X" — this is a DIFFERENT query and requires a DIFFERENT table with user_id as the partition key. Cassandra requires one table per access pattern. You'd write to both tables on every message insert — this denormalization is expected and normal in Cassandra design.
>
> TTL: messages older than 7 years can be auto-deleted — set a TTL on each row at insert time: `INSERT INTO messages ... USING TTL 220752000` (7 years in seconds). Cassandra automatically handles tombstones and cleanup via compaction.

---

### Q3 — ALLOW FILTERING
**Interviewer asks:** "A colleague wrote `SELECT * FROM orders WHERE total > 1000 ALLOW FILTERING`. What's the problem?"

**Hruday's answer:**
> ALLOW FILTERING tells Cassandra to run the query even though it can't use the primary key structure to route or prune the scan. Effectively: it sends the query to ALL nodes, each node scans ALL its partitions, and filters rows where total > 1000. On a 10-node cluster with 1 billion rows: all 1 billion rows are scanned, just to return a few thousand results.
>
> It's catastrophic in production. Response time: seconds to minutes. During execution: significant CPU and disk I/O on every node, impacting every other query running concurrently. Under load: timeouts and cascading failures.
>
> The correct fix: design a table for this query. If "filter by total amount" is a real access pattern, create a table partitioned by an amount bucket: `(amount_range, order_date, order_id)` where amount_range is '1000-5000', '5000+' etc. Queries by amount range use the partition key and hit specific partitions only.
>
> ALLOW FILTERING should only appear in: admin scripts run manually, one-off data exports, or very low-frequency internal tooling queries on small tables. Never in production API code.

---

### Q4 — Cassandra vs Redis
**Interviewer asks:** "Both Cassandra and Redis are NoSQL. How do you choose between them?"

**Hruday's answer:**
> Very different tools for different problems, despite both being called NoSQL.
>
> Redis is in-memory: sub-millisecond, volatile by default, dataset bounded by RAM. Use it for: cache, sessions, rate limiting, pub/sub, distributed locks, real-time leaderboards. The entire dataset must fit in memory — typically gigabytes, not petabytes.
>
> Cassandra is disk-backed: milliseconds, designed for durability across multiple data centres, scales to petabytes. Use it for: high-volume persistent event streams, time-series data, audit logs. Data survives server restarts, doesn't depend on RAM size.
>
> Practical example: user sessions → Redis (temporary, fast, fits in RAM easily). User activity history for analytics → Cassandra (persistent, append-only, grows without bound, always queried by user_id + time range).
>
> They're sometimes used together: Cassandra for the persistent store, Redis for a hot cache in front of Cassandra for frequently-accessed recent events.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Cassandra supports JOINs" | "I can do joins in Cassandra for relational queries" | "Cassandra does NOT support JOINs. This is not a limitation to work around — it's a fundamental design choice. Cassandra is optimised for single-partition reads and high-write throughput. Join logic must be in application code (fetch from partition A, fetch from partition B, combine). If your use case requires frequent JOINs across different entities — go with PostgreSQL. Cassandra is for use cases where JOINs are simply not needed because each query hits one partition." |
| "Use secondary indexes freely" | "I'll add secondary indexes to make Cassandra more flexible" | "Cassandra's secondary indexes are implemented as distributed indexes — a query using a secondary index must hit ALL nodes (similar to ALLOW FILTERING). They're useful for low-cardinality columns on small tables or as a scoped index with the partition key. For high-cardinality filtering (like filtering by email across millions of partitions): a secondary index will be as slow as ALLOW FILTERING. The correct pattern: materialised views (Cassandra 3.0+) or a separate table designed for that query." |
| "Cassandra = eventual consistency everywhere" | "Cassandra is eventually consistent and unreliable for important data" | "Cassandra's consistency is configurable per operation via consistency levels. QUORUM reads + QUORUM writes gives you strong consistency (majority of replicas must agree). LOCAL_QUORUM is common for geo-distributed setups. You trade some performance for strong consistency. For audit logs or financial event streams where every write must be durable and reads must be fresh: QUORUM is the correct choice. Eventual consistency (ONE) is for cases where a brief stale read is acceptable — like showing a user's recent post count." |

---

## 7. Hruday's Real Experience Hook

> "While studying for cloud architecture certifications, I worked through the Netflix tech blog's engineering decisions around Cassandra. Netflix uses Cassandra for its viewing history product — every video play event written by millions of users globally at high frequency, queried by user_id for personalisation. The design decisions they documented match the theory exactly: partition by user_id, cluster by event_timestamp, accept eventual consistency for counters, and run multiple data centres with LOCAL_QUORUM. Understanding their real engineering rationale for PRIMARY KEY design — why user_id as partition is non-negotiable for their query pattern — made the theory concrete."

---

## 8. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment event streams (each payment lifecycle event written to Cassandra as a time-series audit log). High write throughput, queries by payment_id + time. | "Design a transaction audit log for 10 million payment events per day using Cassandra." |
| Swiggy / Meesho | Delivery partner location updates (GPS ping every 5 seconds × 50K active partners = 250K writes/sec peak). Time-series per partner. | "How would you store and query real-time location updates for 50,000 delivery partners?" |
| Adobe / Microsoft | User activity telemetry for product analytics. Millions of events per second from the Creative Cloud desktop apps. | "Design the telemetry storage for a desktop application used by 10 million users." |
| SAP Labs (current) | SAP IoT platform uses columnar stores for device telemetry. HANA's column store tables conceptually share column-oriented optimisation ideas with Cassandra. | "What data model differences between SAP HANA column store and Cassandra wide-column should you consider for IoT use cases?" |

---

## 9. Related Topics — What to Study Next

- **Topic 96 — When to Choose NoSQL** — the decision framework that determines when Cassandra is appropriate; read together
- **Topic 92 — Sharding** — Cassandra's consistent-hashing-based partitioning is a built-in form of sharding; understanding sharding concepts deepens Cassandra internals knowledge
- **Topic 100 — Choosing the Right Database** — the synthesis topic that places Cassandra alongside other database options for system design interviews

---

*Part 5 · Columnar Databases — Cassandra Basics · Full Stack Interview Guide · Hruday D · 2026*
