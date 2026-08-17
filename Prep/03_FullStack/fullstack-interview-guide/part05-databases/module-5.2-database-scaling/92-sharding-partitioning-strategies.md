# Sharding and Partitioning Strategies
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Partitioning = splitting a single large table into smaller pieces (called partitions) within the SAME database server. Data lives on one machine; partitions help the planner skip irrelevant data and manage large tables. Types: range (by date), list (by region/status), hash (by ID).
- Sharding = distributing partitions across MULTIPLE separate database servers (called shards). Each shard is an independent database. A shard key determines which server a given row lives on. Fundamentally different from partitioning — data lives on different machines.
- Range sharding: shard key is a value range (e.g., user IDs 1-1M → shard 1, 1M-2M → shard 2). Simple. Risk: hot shard if a range is disproportionately popular (all active users happen to have IDs in a specific range).
- Hash sharding: compute hash(shard_key) % num_shards → shard number. Even distribution by design. Trade-off: range queries (ALL orders between Jan and Feb) must hit ALL shards — no single shard has contiguous date ranges.
- Resharding problem: when you add a new shard, data must be redistributed — rows move from existing shards to the new shard. Resharding is expensive, requires coordination, and risks downtime. Consistent hashing reduces the data movement required.
- Cross-shard queries (queries that require data from multiple shards) are the main application complexity introduced by sharding: JOINs, aggregations, and transactions across shards are not natively supported in most databases — must be implemented in application code.
- Gap to bridge: candidates say "use sharding for large databases" but cannot explain the hot-shard problem, cross-shard query limitations, or why resharding adds new shards without moving ALL the data (consistent hashing)

---

## 1. One-Line Definition
Sharding is a horizontal scaling technique that distributes database rows across multiple separate database servers using a shard key, while partitioning splits a single table into sub-tables within one server to improve query performance and manageability.

---

## 2. The Problem It Solves

```
PARTITIONING solves:
  Table: order_events — 10 billion rows, all in one physical table
  Situation:
    99% of queries filter by date: WHERE created_at BETWEEN '2026-01-01' AND '2026-01-31'
    The planner still considers all 10 billion rows even though January data is < 1 billion
    
  Partition by RANGE on created_at — one partition per month:
    order_events_2025_01  (Jan 2025 data)
    order_events_2025_02  (Feb 2025 data)
    ...
    order_events_2026_01  (Jan 2026 data)
    
  Query for January 2026: planner skips ALL other partitions — "partition pruning"
  Only scans the ~1% of data that's in the relevant partition
  10 billion → 80 million rows examined. Still one database server.

SHARDING solves:
  Payment platform: 500M users. transactions table has 100 billion rows.
  Even with partitioning, a single server cannot hold this data.
  
  The problem: not just query performance — the DATA DOES NOT FIT on one server.
  A single Postgres instance handles ~20TB on commodity hardware.
  100 billion payment transactions might be 50TB.
  
  Sharding — split by user_id hash across 8 shards:
    Shard 1: users with hash(user_id) % 8 == 0  (12.5% of data = ~6TB)
    Shard 2: users with hash(user_id) % 8 == 1
    ...
    Shard 8: users with hash(user_id) % 8 == 7
    
  8 servers × 6TB each = 48TB total storage spread across 8 machines.
  Write throughput: 8× capacity (each write goes to exactly one shard).
```

---

## 3. How It Works Internally

### Partitioning Types (Single Server)

```
RANGE PARTITION — by date (most common for time-series data):
  CREATE TABLE orders (
    id          BIGSERIAL,
    user_id     BIGINT NOT NULL,
    total       NUMERIC(10,2),
    created_at  TIMESTAMPTZ NOT NULL,
    ...
  ) PARTITION BY RANGE (created_at);
  
  CREATE TABLE orders_2026_q1 PARTITION OF orders
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
  CREATE TABLE orders_2026_q2 PARTITION OF orders
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
  
  Query: WHERE created_at >= '2026-01-01' AND created_at < '2026-04-01'
  → Postgres ONLY reads orders_2026_q1. Other partitions not touched.
  
  Benefit: old partitions can be dropped (archiving) or moved to cheaper storage.
  Management: new partition must exist before data arrives — automate creation.

LIST PARTITION — by discrete values:
  CREATE TABLE products (...) PARTITION BY LIST (region);
  CREATE TABLE products_asia   PARTITION OF products FOR VALUES IN ('APAC', 'IN', 'SG');
  CREATE TABLE products_europe PARTITION OF products FOR VALUES IN ('EU', 'UK', 'DE');
  CREATE TABLE products_us     PARTITION OF products FOR VALUES IN ('US', 'CA');
  
  Query: WHERE region = 'IN' → only reads products_asia partition

HASH PARTITION — even distribution when no logical range/list ordering:
  CREATE TABLE sessions (...) PARTITION BY HASH (user_id);
  CREATE TABLE sessions_0 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 0);
  CREATE TABLE sessions_1 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 1);
  CREATE TABLE sessions_2 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 2);
  CREATE TABLE sessions_3 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 3);
  
  user_id=12345 → hash(12345) % 4 = 1 → sessions_1 partition
  Even distribution. No "hot" partition risk for balanced key distributions.
```

### Sharding Strategies (Multiple Servers)

```
RANGE SHARDING:
  Shard 1: user_id 1 — 1,000,000
  Shard 2: user_id 1,000,001 — 2,000,000
  Shard 3: user_id 2,000,001 — 3,000,000
  
  Routing: if user_id <= 1,000,000 → Shard 1; if user_id <= 2,000,000 → Shard 2; etc.
  
  Advantage: range queries on user_id (give me all users from 500K to 800K) hit ONE shard.
  Hot shard risk: new users (highest IDs) all go to the latest shard.
  If you're growing by signups, Shard 3 always gets the most writes. Shard 1 is idle.

HASH SHARDING:
  shard_number = hash(user_id) % total_shards
  
  All writes for user 12345: hash(12345) % 4 = 1 → always Shard 1
  user 12346: hash(12346) % 4 = 2 → Shard 2
  
  Even write distribution — no hot shard for uniform key distributions.
  Cross-shard range query problem:
    "All users who signed up in January 2026" — sign-up date is on different shards;
    this query must be sent to ALL shards and results merged in application.

CONSISTENT HASHING (for dynamic shard addition):
  Standard hash: adding a 5th shard → almost ALL rows change shards (hash % 5 ≠ hash % 4)
  → Move ~80% of data to rebalance. Catastrophic downtime.
  
  Consistent hash ring:
    Place shards on a circle (virtual ring from 0 to 360°).
    A key maps to a point on the ring; it belongs to the first shard clockwise from that point.
    
    Adding one new shard: only the keys between the new shard and its predecessor move.
    On average: only 1/n keys move when adding the nth shard.
    
    Redis Cluster, Cassandra, Dynamo — all use consistent hashing for this reason.
                                                                   
    [Shard A]───────[Shard B]──────[Shard C]──────[Shard A]  ← ring wraps
               ^key1       ^key2          ^new shard D
    Adding D: key2 (between C and old A) now routes to D instead of A.
    Only those keys move. Everything else stays.
```

### Cross-Shard Query Problem

```
Query: "Total revenue across ALL customers in Q1 2026"
  SELECT SUM(total) FROM orders WHERE created_at BETWEEN '2026-01-01' AND '2026-04-01'
  
  In a sharded system with user_id as shard key:
  This query requires data from ALL shards.
  
  Application must:
    1. Send the query to each of the N shards in parallel
    2. Collect the partial SUM from each shard  
    3. Sum the partial results in application memory
    
    In Java:
    List<CompletableFuture<BigDecimal>> futures = shards.stream()
        .map(shard -> CompletableFuture.supplyAsync(() -> shard.getRevenueQ1()))
        .toList();
    BigDecimal total = futures.stream()
        .map(CompletableFuture::join)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

JOINs across shards:
  "All orders for users in Bangalore"
  users table is sharded by user_id. addresses are on the same shard as users.
  But you can't do: SELECT u.name, o.total FROM users u JOIN orders o WHERE u.city='Bangalore'
  — they're on different logical servers.
  
  Solution: denormalize city into the orders table (add orders.user_city column)
  OR: run the query in two steps (get user_ids for Bangalore users first, then query orders)
  OR: use a distributed database that handles cross-shard joins (CockroachDB, YugabyteDB)
  
Distributed transactions:
  "Transfer funds: debit userA (Shard 1) and credit userB (Shard 3) atomically"
  Standard database transactions don't span servers.
  Solution: 2-Phase Commit (2PC) — slow and complex, or Saga pattern (async compensation)
```

---

## 4. The Code

### Wrong Way — Ignoring the Hot Shard Problem
```java
// WRONG: Range sharding by sequential ID → new users accumulate on the last shard

public class ShardRouter {

    private static final int NUM_SHARDS = 4;

    // WRONG: Range sharding by ID — all new users hash to shard 3 as IDs grow
    // Shard 0: IDs 1–10M    (old, inactive users → low traffic)
    // Shard 1: IDs 10M–20M  (medium activity)
    // Shard 2: IDs 20M–30M  (active)
    // Shard 3: IDs 30M+     (ALL new signups here → shard is HOT)
    public int getShardForUser(long userId) {
        if (userId <= 10_000_000) return 0;
        if (userId <= 20_000_000) return 1;
        if (userId <= 30_000_000) return 2;
        return 3;  // All new users flood this shard — CPU at 90%, others idle
    }
}
```
> **Why this fails:** All new user sign-ups, the busiest activity, concentrate on the last shard. The newest shard handles the most writes and reads while older shards are underutilised. Classic hot shard anti-pattern.

### Right Way — Hash Sharding with Consistent Routing
```java
// Shard routing based on hash for even distribution
@Component
public class ShardRouter {

    private final List<DataSource> shards;
    private final int numShards;

    public ShardRouter(List<DataSource> shards) {
        this.shards = Collections.unmodifiableList(shards);
        this.numShards = shards.size();
    }

    public DataSource getShardForUser(String userId) {
        // Consistent hash: MurmurHash or similar — avoids clustering that MD5/SHA has
        // Using Java's built-in hashCode is sufficient for non-cryptographic sharding
        int shardIndex = Math.abs(userId.hashCode()) % numShards;
        return shards.get(shardIndex);
    }

    // Cross-shard queries: run on ALL shards and aggregate
    public <T> List<T> queryAllShards(Function<DataSource, List<T>> queryFn) {
        // Execute in parallel across all shards
        List<CompletableFuture<List<T>>> futures = shards.stream()
            .map(shard -> CompletableFuture.supplyAsync(() -> queryFn.apply(shard)))
            .toList();

        return futures.stream()
            .map(CompletableFuture::join)
            .flatMap(Collection::stream)
            .toList();
    }

    // Aggregations across shards — sum revenues from all shards
    public BigDecimal sumAcrossShards(Function<DataSource, BigDecimal> sumFn) {
        return shards.parallelStream()
            .map(sumFn)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

// Repository with shard awareness
@Repository
@RequiredArgsConstructor
public class ShardedOrderRepository {

    private final ShardRouter router;

    public Order findByIdForUser(String orderId, String userId) {
        DataSource shard = router.getShardForUser(userId);
        // Execute against the specific shard
        return new JdbcTemplate(shard)
            .queryForObject(
                "SELECT * FROM orders WHERE id = ? AND user_id = ?",
                ORDER_ROW_MAPPER,
                orderId, userId
            );
    }

    // Cross-shard: total revenue for a date range (hits all shards)
    public BigDecimal getTotalRevenueForPeriod(LocalDate from, LocalDate to) {
        return router.sumAcrossShards(shard ->
            new JdbcTemplate(shard)
                .queryForObject(
                    "SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at BETWEEN ? AND ?",
                    BigDecimal.class,
                    from, to
                )
        );
    }
}
```

### Postgres Native Partitioning
```sql
-- Time-based range partitioning for orders (same database, different partitions)
-- Flyway migration: V20__add_orders_partitioning.sql

CREATE TABLE orders (
    id          UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL,
    status      VARCHAR(50) NOT NULL,
    total       NUMERIC(12, 2) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create partitions per quarter — automate this in a scheduled job
CREATE TABLE orders_2026_q1 PARTITION OF orders
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE orders_2026_q2 PARTITION OF orders
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE orders_2026_q3 PARTITION OF orders
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE orders_2026_q4 PARTITION OF orders
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- Indexes on each partition — must be created per partition or use CREATE INDEX ... ON ONLY
CREATE INDEX idx_orders_2026_q1_user ON orders_2026_q1(user_id);
CREATE INDEX idx_orders_2026_q2_user ON orders_2026_q2(user_id);
-- Or: create index on parent table and enable partition indexes globally:
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at) PARTITION BY RANGE (created_at);

-- Archive: detach old partition (fast, no data movement)
ALTER TABLE orders DETACH PARTITION orders_2026_q1;
-- Now orders_2026_q1 is an independent table. Move to archive database or cold storage.
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between partitioning and sharding?"

**Hruday's answer:**
> Partitioning splits a single large table into smaller sub-tables within the same database server. The data still lives on one machine, and the application still connects to one database. The database engine uses the partition structure to prune irrelevant data — a query filtered to January 2026 only reads the January partition, not the entire 10-billion-row table. Partitioning is primarily a performance and manageability technique.
>
> Sharding distributes data across multiple completely separate database servers. Each shard is an independent database. The application must determine which shard a given row lives on — based on the shard key — and connect to that specific server for queries and writes. Sharding is a scaling technique: you're splitting the data across multiple machines because it doesn't fit or perform adequately on one.
>
> You can partition within a shard: each shard holds partitioned tables, combining both techniques. Practically: start with partitioning on a single server. Add read replicas for read scaling. Consider sharding only when the write volume or data volume genuinely requires multiple independent servers.

---

### Q2 — Hot Shard
**Interviewer asks:** "What is the hot shard problem and how do you avoid it?"

**Hruday's answer:**
> A hot shard is when one shard in a sharded system receives a disproportionate share of traffic — it's overwhelmed while other shards sit idle.
>
> It happens most often with range sharding on a sequential key like auto-increment IDs or timestamps. New users get the highest IDs, so all new signups — which generate the most activity — land on the last shard. Or range sharding by date means "today's shard" receives 100% of today's writes while yesterday's shard has almost none.
>
> The primary prevention: hash sharding on a high-cardinality key. `hash(user_id) % num_shards` distributes keys evenly regardless of when they were created. No single shard is "newer" or "busier" by design.
>
> A subtler hot shard risk: a single extremely large tenant. If one enterprise customer represents 30% of your traffic and all their data hashes to shard 2, shard 2 is permanently hot. The solution: overshard for large tenants by using a compound shard key (tenant_id + sub_shard_number) or by giving large tenants their own dedicated shard.

---

### Q3 — Resharding
**Interviewer asks:** "You currently have 4 shards and need to add a 4th. What happens?"

**Hruday's answer:**
> If you're using simple modulo hashing: `hash(key) % 4` for 4 shards, and you add a 5th shard: `hash(key) % 5` produces different results for almost every key. Effectively every row needs to move to a different shard. This is a near-total data migration — expensive, slow, disruptive.
>
> The solution to this problem is consistent hashing. Instead of modulo arithmetic, keys and shards are placed on a virtual ring. A key maps to the shard clockwise from its position on the ring. Adding a new shard inserts it at one point on the ring — only the keys between the new shard and its predecessor need to move. On average, only 1/n of existing keys relocate when adding the nth shard.
>
> Databases like Redis Cluster and Cassandra use consistent hashing for this reason. For custom sharding in application code, libraries like Guava's Hashing.consistentHash() implement this.
>
> Practically: if you're building a new system and expect growth, design with more shards than you initially need. With 32 shards behind 4 physical servers, adding a 5th server means remapping about 1/5 of the virtual shards — manageable. This is "virtual shards" or "virtual nodes" — another name for consistent hashing with multiple virtual positions per physical server.

---

### Q4 — System Design
**Interviewer asks:** "Design the data storage layer for a payment platform handling 10M transactions per day with 200M users."

**Hruday's answer:**
> 10M transactions per day is about 115 transactions per second on average, with likely 5-10× bursts at peak: ~1000 TPS peak. 200M users is the data size problem.
>
> For transactions — sharding strategy: hash on user_id across 8 shards. Each shard handles ~25M users and ~125 TPS peak write load. Each shard has one primary and two read replicas. Transaction lookups by user are single-shard. Merchant-level aggregations (all transactions for merchant X) are cross-shard — computed asynchronously via a reporting pipeline rather than real-time queries.
>
> Partitioning within each shard: transactions table partitioned by month. Queries filtered by date only read the relevant partition. Old partitions (> 7 years for regulatory compliance) moved to cold storage in archived detached partitions.
>
> Shard key choice debate: user_id works for payer-centric queries. Merchant-centric queries require cross-shard. Alternative: range-shard by merchant_id if merchant analytics are the primary read pattern. Choice depends on the dominant query pattern.
>
> Cross-shard analytics: a Kafka consumer reads the transaction event stream and materializes it into a separate analytics database (PostgreSQL with partitioning, or ClickHouse for aggregations). Merchant dashboards and settlement reports read from the analytics database — not the transactional shards.
>
> Write latency SLA: each write goes to one shard's primary, gets confirmed within 5ms via async replication to replicas. Synchronous replication to one replica for durability.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Shard early just in case" | "Always design for sharding from day one" | "Sharding adds enormous complexity: no cross-shard JOINs, no distributed transactions, complex routing code, resharding risk. Most applications never need it. A properly indexed Postgres instance on commodity hardware handles hundreds of thousands of rows per second and terabytes of data. Start with a single well-configured primary + read replicas + partitioning, which solves 95% of scale problems. Add sharding only when you have concrete data proving a single server cannot keep up." |
| "Use user_id as shard key always" | "Hash on user_id — it's always even distribution" | "user_id is a good default shard key for user-centric workloads. But if 10% of your users are enterprise accounts driving 60% of traffic, user_id sharding creates hot shards for those accounts. The right shard key depends on query patterns. For a multi-tenant SaaS: tenant_id. For social media: user_id but with sharding of very popular users onto dedicated 'celebrity shards.' There is no universal correct shard key — it's always a trade-off." |
| "Partitioning = sharding" | "Table partitioning is how databases handle large-scale distribution" | "Partitioning is single-server: all partitions live on one database instance. It helps with query performance (partition pruning) and data management (archiving old partitions). Sharding is multi-server: data is split across independent database instances. Sharding provides horizontal write scaling and solves the single-machine data capacity limit — partitioning does not. Conflating these two leads to believing you've solved the scaling problem with partitioning alone when you haven't." |
| "JOINs work across shards" | "Microservices with sharded DBs can still do JOINs across them" | "Standard SQL JOINs cannot span separate database servers. Once you shard, you lose the ability to run JOIN queries across the shard boundary in the database. Application-level joins (query shard 1 and shard 2, join the results in memory) are possible but expensive and complex. Distributed databases like CockroachDB, YugabyteDB, or Google Spanner implement cross-shard joins in the database layer, but they still have performance implications. Sharding forces you to redesign queries to be shard-local where possible." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we were working with tables that had hundreds of millions of procurement line items — the kind of data volume where even WITH indexes, certain date-range analytical queries were slow. We implemented Postgres range partitioning by fiscal period: one partition per fiscal quarter. After partitioning, the same analytical query that scanned 600 million rows now only read 80 million rows in the relevant partition — a 7× reduction in rows examined. The query cut from 45 seconds to 6 seconds without any application code change. The planner simply pruned the irrelevant partitions automatically based on the WHERE clause date range."

---

## 8. Scale Evolution

**Startup / early product:** Single Postgres instance. Apply range partitioning on large time-series tables proactively — it's easy to add early and hard to retrofit on a 10-billion-row table.

**Growth phase:** Read replicas for read scaling + partitioning for query performance. No sharding needed yet.

**Scale:** Sharding when writes exceed 10,000 TPS on a single server OR data exceeds the practical storage limit of one server. Choose shard key based on dominant query pattern. Use consistent hashing or overshard with virtual nodes.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction tables grow by hundreds of millions of rows per month. Partition-by-date for query efficiency + sharding by user/merchant for write scale at hundreds of TPS. | "How would you partition and potentially shard a 500-billion-row transactions table?" |
| Swiggy / Meesho | Order events and delivery tracking are high-write time-series data. Range partitioning by date enables efficient recent-order queries and old-data archiving. | "Design the storage for 50 million orders per month with 7-year retention." |
| Adobe / Microsoft | Asset metadata tables, user event logs at billions of rows. Partition for analytics query pruning + archive old partitions to cold storage. | "How would you manage a 10-trillion-row user events table?" |
| SAP Labs (current) | Oracle supports table partitioning natively (Oracle Partitioning feature). Understanding range and hash partitioning helps in designing and writing correct SQL for partitioned Oracle tables in SAP ERP customisations. | "Why does this Oracle query not benefit from the date-range partition even though the WHERE clause has a date filter?" |

---

## 10. Related Topics — What to Study Next

- **Topic 91 — Replication** — sharding and replication are complementary: each shard also has its own read replicas; understand both to design complete database scaling architecture
- **Topic 94 — Connection Pooling** — sharded systems have N pools (one per shard) and routing adds complexity; connection pooling strategy changes with sharding
- **Topic 76 — Saga Pattern** — distributed transactions across shards require the Saga pattern instead of ACID transactions; the two topics are directly linked

---

*Part 5 · Sharding and Partitioning Strategies · Full Stack Interview Guide · Hruday D · 2026*
