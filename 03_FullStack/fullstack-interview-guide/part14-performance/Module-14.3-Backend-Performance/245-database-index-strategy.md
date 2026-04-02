# Database Index Strategy for High-Traffic Queries
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why indexes matter**: without an index on a column used in `WHERE`, the database reads every row (seq scan); with an index, it jumps directly to matching rows; on a 10M-row table, seq scan = seconds, index scan = milliseconds
- **B-Tree index (default)**: `CREATE INDEX idx_orders_status ON orders(status)`; works for `=`, `<`, `>`, `BETWEEN`, `LIKE 'abc%'`; stored as a balanced tree, O(log N) lookup; covers ~90% of use cases
- **Composite index**: multi-column index; **leftmost prefix rule** is critical — `(status, created_at)` can be used by queries filtering on `status` alone, or `status + created_at`, but NOT on `created_at` alone; column order matters — put the most selective and most frequently filtered column first
- **Covering index**: all columns needed by the query are in the index (including SELECTed columns); database does an **index-only scan** — never touches the actual table rows; fastest possible read path; Postgres `INCLUDE` keyword adds non-key columns
- **When NOT to index**: high-write/low-read tables (indexes slow down INSERT/UPDATE/DELETE); low-cardinality columns (boolean `is_active` has only 2 values — a seq scan with bitmap scan is often faster); rarely-used columns; columns where all queries need to scan everything anyway
- **EXPLAIN ANALYZE**: `Seq Scan` = no index used (fix needed); `Index Scan` = index used, good; `Index Only Scan` = covering index, best; `Bitmap Heap Scan` = multiple index results combined; check `actual rows` vs `rows estimated` — a large gap means stale statistics, run `ANALYZE`
- ✅ **Hruday's anchor**: SAP Commerce Cloud product listing endpoint — query `WHERE category_id = ? AND active = true ORDER BY price ASC` had no composite index; full seq scan on 2.1M product rows = 2.3s API response; added composite covering index `(category_id, active, price)` + INCLUDE (name, image_url, final_price); query dropped to 8ms; flagship product listing page went from 2.3s → 180ms total (index + query plan fix)

---

## 1. One-Line Definition
A database index is a data structure (typically a B-Tree) separate from the table that maps column values to physical row locations, enabling the database engine to find rows without scanning the entire table.

---

## 2. The Problem It Solves

Every database query without an index performs a **sequential scan** — reading every row from disk in order to find the ones matching the `WHERE` clause. For small tables (thousands of rows), this is fine. For production tables with millions of rows, even a simple `SELECT * FROM orders WHERE customer_id = 12345` reads 10 million rows to find 50.

Indexes trade write overhead for read speed. When you insert, update, or delete a row, every index on that table must be updated. This is why you don't index everything — the write slowdown is real.

The strategic exercise: identify the queries that run most frequently with large rows counts, analyze their `WHERE` / `ORDER BY` / `JOIN` clauses, and build the minimum set of indexes that covers those access patterns without over-indexing the write path.

---

## 3. How It Works Internally

### B-Tree Index Structure

```
Table: products (2.1M rows)

CREATE INDEX idx_products_category ON products(category_id);

B-Tree structure:
                    [5000]
                   /       \
             [2500]        [7500]
            /     \        /     \
        [1250]  [3750]  [6250]  [8750]
        ...

Each leaf node contains:
  (category_id value, pointer to table row)
  
Query: WHERE category_id = 3750
  → B-Tree traversal: 3 comparisons to find first match
  → Follow pointer to actual table row (heap access)
  → Scan adjacent leaf nodes for more matches (range scan)
  Total: O(log N) instead of O(N) sequential scan

B-Tree supports:
  WHERE category_id = 3750        → exact match ✓
  WHERE category_id > 3000        → range scan ✓
  WHERE category_id BETWEEN ...   → range scan ✓
  WHERE category_id IS NULL       → separate null list ✓
  WHERE category_id != 3750       → NOT efficient (inverted — use seq scan) ✗
  WHERE UPPER(name) = 'LAPTOP'    → function applied to column — index NOT used ✗
  (unless function-based index: CREATE INDEX ON products(UPPER(name)))
```

### Composite Index and the Leftmost Prefix Rule

```
CREATE INDEX idx_products_cat_active_price 
ON products(category_id, active, price);

-- This SINGLE index supports ALL these queries:

-- ✅ Uses index (leftmost prefix: category_id)
SELECT * FROM products WHERE category_id = 42;

-- ✅ Uses index (prefix: category_id + active)
SELECT * FROM products WHERE category_id = 42 AND active = true;

-- ✅ Uses index fully (all three columns)
SELECT * FROM products WHERE category_id = 42 AND active = true ORDER BY price;
-- INDEX RANGE SCAN on (42, true, *) → already sorted by price → no sort step needed

-- ✅ Uses index partially (optimizer can skip active with some DBMS)
SELECT * FROM products WHERE category_id = 42 ORDER BY price;
-- Depends on cardinality — PostgreSQL optimizer may use index scan + filter

-- ❌ Does NOT effectively use this index:
SELECT * FROM products WHERE active = true;
-- active is 2nd column — can't jump to it without first column
-- Full table scan performed

-- ❌ Does NOT use this index:
SELECT * FROM products WHERE price < 100;
-- price is 3rd column — leftmost prefix (category_id) NOT in WHERE clause
-- Can't start B-Tree traversal without leftmost prefix

-- KEY INSIGHT: Column ORDER in composite index = column ORDER in WHERE clause priority
-- Most selective (high cardinality, frequently filtered) + most commonly filtered → go first
```

### Covering Index — Index-Only Scan

```sql
-- Query for product listing page:
SELECT name, image_url, final_price
FROM products
WHERE category_id = 42 AND active = true
ORDER BY price ASC
LIMIT 20;

-- Standard composite index: (category_id, active, price)
-- Index scan finds matching rows → Heap access for name, image_url, final_price
-- Still requires going back to the table for every row (Heap Fetch)

-- Covering index: add the SELECT columns as INCLUDE (non-key columns)
CREATE INDEX idx_products_listing_covering
ON products(category_id, active, price)
INCLUDE (name, image_url, final_price);

-- Now: Index Only Scan
-- All data needed (name, image_url, final_price) is IN the index leaf nodes
-- Database never touches the heap (table rows) = MUCH faster
-- Especially beneficial for: wide rows, TOAST columns, cold data pages

-- EXPLAIN ANALYZE output with covering index:
-- Index Only Scan using idx_products_listing_covering on products
--   (cost=0.43..45.23 rows=20 width=89) (actual time=0.018..0.041 rows=20 loops=1)
--   Index Cond: ((category_id = 42) AND (active = true))
--   Order By: price
--   Heap Fetches: 0  ← the magic: ZERO heap accesses
```

---

## 4. The Code

### Wrong Way — Missing and Wrong Index Choices

```sql
-- ❌ WRONG — applying indexes after the fact without analysis

-- What developers often do: add an index to every WHERE column individually
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_created ON orders(created_at);

-- But the actual slow query is:
SELECT id, total, status FROM orders
WHERE customer_id = 12345 AND status = 'ACTIVE'
ORDER BY created_at DESC LIMIT 10;

-- With three separate indexes, PostgreSQL might:
-- 1. Use idx_orders_customer → get ~500 rows for customer 12345
-- 2. Use idx_orders_status → get ~100K 'ACTIVE' rows
-- 3. Bitmap scan combining both → 12 rows
-- 4. Sort those 12 rows by created_at (no index for sort)
-- This is still much better than a seq scan, but NOT optimal
-- Three single-column indexes are LESS useful than one composite index

-- ❌ WORSE — indexing a boolean column alone
CREATE INDEX idx_products_active ON products(active);
-- active is either true or false — only 2 distinct values across 2M rows
-- Half the table will match 'active = true': 1M rows
-- PostgreSQL optimizer will SKIP this index — seq scan is faster for > ~5% of rows
-- This index wastes space and slows writes without being used

-- ❌ WORST — function applied to indexed column (breaks index)
-- Index exists: CREATE INDEX idx_users_email ON users(email);
SELECT * FROM users WHERE LOWER(email) = LOWER('HRUDAY@SAP.COM');
-- LOWER() on the column = index NOT used → seq scan
-- FIX: store email in lowercase in application layer, or use function-based index:
-- CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- ❌ WRONG — forgetting the ORDER BY column in composite index
CREATE INDEX idx_orders_customer_status ON orders(customer_id, status);
-- Query: WHERE customer_id = ? AND status = ? ORDER BY created_at DESC
-- Index helps the WHERE clause but NOT the sort → Postgres still sorts in memory
-- If the table has been heavily queried by this pattern, this sort is expensive
-- FIX: include created_at in the composite index:
-- CREATE INDEX ON orders(customer_id, status, created_at DESC)
```

```sql
-- ✅ RIGHT — strategic composite and covering index for the actual query

-- Step 1: identify the query (from slow query log or explain plan in production)
-- ACTUAL SLOW QUERY from SAP Commerce Cloud:
SELECT p.name, p.image_url, p.final_price
FROM products p
WHERE p.category_id = 42 
  AND p.active = true
ORDER BY p.final_price ASC
LIMIT 20 OFFSET 0;

-- Step 2: run EXPLAIN ANALYZE on the actual query (before index)
EXPLAIN ANALYZE
SELECT p.name, p.image_url, p.final_price
FROM products p
WHERE p.category_id = 42 AND p.active = true
ORDER BY p.final_price ASC LIMIT 20;

-- Output before index:
-- Seq Scan on products  (cost=0.00..89234.56 rows=1420 width=89)
--   (actual time=0.023..2127.456 rows=1420 loops=1)  ← 2.1 SECONDS
-- Filter: ((active = true) AND (category_id = 42))
-- Rows Removed by Filter: 2098340                   ← reading 2.1M rows to find 1420
-- Sort: final_price ASC
-- Planning Time: 0.8ms
-- Execution Time: 2127.9ms                          ← this is what the API user feels

-- Step 3: create targeted composite + covering index
CREATE INDEX idx_products_listing_covering
ON products(category_id, active, final_price ASC)    -- key columns: filter + sort
INCLUDE (name, image_url);                           -- non-key: needed in SELECT, stored in leaf

-- Step 4: run EXPLAIN ANALYZE after index
EXPLAIN ANALYZE
SELECT p.name, p.image_url, p.final_price
FROM products p
WHERE p.category_id = 42 AND p.active = true
ORDER BY p.final_price ASC LIMIT 20;

-- Output after index:
-- Limit  (cost=0.43..5.21 rows=20 width=89) (actual time=0.012..0.036 rows=20 loops=1)
--   -> Index Only Scan using idx_products_listing_covering on products
--      (cost=0.43..339.56 rows=1420 width=89) (actual time=0.011..0.021 rows=20 loops=1)
--      Index Cond: ((category_id = 42) AND (active = true))
--      Order By: final_price  ← ORDER BY comes from index — no sort step!
--      Heap Fetches: 0        ← covering index: never touches the table
-- Planning Time: 0.1ms
-- Execution Time: 0.048ms    ← 8ms at P95 in production (vs 2300ms before)
```

### Spring Boot — When to Run ANALYZE and Multi-Tenant Considerations

```java
// ✅ Programmatically check table statistics staleness and trigger ANALYZE

@Component
@Slf4j
public class DatabaseStatisticsMonitor {
    
    @Autowired JdbcTemplate jdbcTemplate;
    
    // Run weekly or after large batch inserts
    @Scheduled(cron = "0 0 2 * * SUN")  // Every Sunday 2am
    public void checkAndAnalyzeStaleStatistics() {
        // Query pg_stat_user_tables for tables with >10% dead tuples or stale analyze
        String sql = """
            SELECT schemaname, tablename, 
                   n_live_tup, n_dead_tup, last_analyze
            FROM pg_stat_user_tables
            WHERE (n_dead_tup > 0.1 * n_live_tup)   -- >10% dead tuples
               OR last_analyze < NOW() - INTERVAL '7 days'
            ORDER BY n_live_tup DESC
            LIMIT 20
            """;
        
        List<Map<String, Object>> staleTables = jdbcTemplate.queryForList(sql);
        
        for (Map<String, Object> table : staleTables) {
            String tableName = table.get("schemaname") + "." + table.get("tablename");
            log.info("Stale statistics on {}: live={}, dead={}, lastAnalyze={}",
                tableName, table.get("n_live_tup"), 
                table.get("n_dead_tup"), table.get("last_analyze"));
            // ✅ ANALYZE updates statistics without locking writes
            jdbcTemplate.execute("ANALYZE " + tableName);
        }
    }
}
```

```sql
-- ✅ Identifying unused indexes (indexes that exist but are NEVER used)
-- Run this query on production (read replica) weekly and drop unused indexes

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,                    -- number of times this index was used for scans
    idx_tup_read,                -- rows read via this index
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0               -- never used in queries
  AND indexname NOT LIKE '%_pkey'  -- skip primary keys (always needed)
ORDER BY pg_relation_size(indexrelid) DESC;

-- Example output showing a waste:
-- tablename=products | indexname=idx_products_active | idx_scan=0 | index_size=45 MB
-- → This index takes 45MB of disk, slows every INSERT/UPDATE/DELETE on products,
--   but has been used ZERO times in queries → safe to drop

-- ✅ Identifying missing indexes (high seq scan tables)
SELECT
    schemaname,
    tablename,
    seq_scan,            -- number of sequential scans
    idx_scan,            -- number of index scans
    n_live_tup,          -- row count
    ROUND(seq_scan::NUMERIC / NULLIF(seq_scan + idx_scan, 0) * 100, 1) AS seq_pct
FROM pg_stat_user_tables
WHERE n_live_tup > 100000      -- only tables with significant data
  AND seq_scan > idx_scan      -- more seq scans than index scans
ORDER BY seq_scan DESC;
-- Tables where seq_pct is high (>70-80%) likely need new or better indexes
```

### Liquibase Migration — Adding Production-Safe Concurrent Index

```xml
<!-- ✅ CONCURRENTLY: creates index without locking writes (production-safe) -->
<!-- Without CONCURRENTLY: CREATE INDEX locks the table for the entire build duration -->
<!-- On a 2M row table, non-concurrent index creation: 10-30 second write lock -->
<!-- With CONCURRENTLY: zero write lock, 2-3x longer to build but safe in production -->

<changeSet id="2024-006-add-product-listing-index" author="hruday">
    <!-- CONCURRENTLY cannot run in a transaction — set runInTransaction="false" -->
    <sqlFile path="sql/create_product_listing_index.sql"
             runInTransaction="false" />
    
    <!-- Rollback: drop the index concurrently -->
    <rollback>
        <sqlFile path="sql/drop_product_listing_index.sql"
                 runInTransaction="false" />
    </rollback>
</changeSet>
```

```sql
-- create_product_listing_index.sql
-- ✅ Production-safe: CONCURRENTLY prevents ANY write lock
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_listing_covering
ON products(category_id, active, final_price ASC)
INCLUDE (name, image_url);

-- NOTE: IF NOT EXISTS prevents error if migration runs twice (e.g., in multi-node deploy)
-- NOTE: CONCURRENTLY requires table lock briefly at start and end, but NOT during build
-- The build itself takes longer (2-3x) but zero downtime impact
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What types of indexes does PostgreSQL support and when would you use each?"

**Hruday's answer:**
> PostgreSQL has several index types, but B-Tree covers 90% of real-world use cases.
>
> **B-Tree** is the default. It supports equality (`=`), range (`<`, `>`, `BETWEEN`), sorting (`ORDER BY`), and prefix patterns (`LIKE 'abc%'`). Almost every customer-facing query should have its `WHERE` and `ORDER BY` columns covered by a B-Tree index.
>
> **Hash indexes** are for pure equality only — faster than B-Tree for exact matches but useless for range queries. PostgreSQL's B-Tree equality is nearly as fast as Hash in practice, so Hash is rarely worth the tradeoff. I've never deployed a Hash index in production.
>
> **GiST (Generalized Search Tree)** and **GIN (Generalized Inverted Index)** are for text search and JSONB. Full-text search with `tsvector`/`tsquery` uses GIN indexes. If you have a `JSONB` column with queries like `WHERE metadata @> '{"status": "active"}'`, GIN is what makes that fast. We used GIN at SAP for product attribute search (products with arbitrary attributes stored as JSONB).
>
> **Partial index**: a regular B-Tree but with a `WHERE` clause that limits which rows are indexed. `CREATE INDEX ON orders(customer_id) WHERE status = 'ACTIVE'` only indexes active orders. The index is smaller, builds faster, and queries that filter `WHERE status = 'ACTIVE' AND customer_id = ?` use it efficiently. Highly useful when most query patterns are for a specific subset (like active records).
>
> In practice: B-Tree for standard query patterns, GIN for JSONB/full-text, Partial indexes when only a subset of rows is queried.

---

### Q2 — SAP Experience Deep Dive
**Interviewer asks:** "Walk me through the SAP Commerce index optimization you mentioned."

**Hruday's answer:**
> On SAP Commerce Cloud, the product listing endpoint was the most critical page — it drove 70% of all traffic because every customer session started there. It was loading the product grid for a category (say, all laptops). The query: `SELECT name, image_url, final_price FROM products WHERE category_id = ? AND active = true ORDER BY final_price ASC LIMIT 20`.
>
> I ran `EXPLAIN ANALYZE` on this query against the production replica. The output showed a `Seq Scan` — reading all 2.1 million rows, filtering down to ~1,400 for the category, then sorting those 1,400 by price, then applying LIMIT 20. Total execution: 2,127ms. With Nginx caching, that 2.1 seconds only hit the database on cache miss, but our cache miss rate was 35% (many categories, short TTL) — so users felt it frequently.
>
> I created a composite covering index: `(category_id, active, final_price ASC)` with `INCLUDE (name, image_url)`. The key columns handle the WHERE filter and the ORDER BY, so Postgres doesn't need a sort step — the rows come out of the index already sorted. The INCLUDE columns mean the SELECT doesn't need to touch the table at all — everything the query needs is in the index leaf nodes. This produces an `Index Only Scan` with `Heap Fetches: 0`.
>
> Index creation was done with `CONCURRENTLY` in a Liquibase migration with `runInTransaction=false` — so it built without any write locks on a live production table. Query time: 2,127ms → 7ms. The product listing page end-to-end went from 2.3s to 180ms. Cache hit rate improved too because responses were faster — the cache TTL covered more of the traffic before expiring.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When should you NOT add an index?"

**Hruday's answer:**
> Three clear scenarios where I deliberately avoid adding an index.
>
> **Low-cardinality columns.** If a column has only 2-3 distinct values across millions of rows — like `is_active` (true/false) or `status` with values 'ACTIVE'/'INACTIVE' — an index on that column alone is rarely used. If a query for `WHERE is_active = true` matches 40% of the table, the query optimizer calculates that reading 40% of the rows is faster with a sequential scan + bitmap than an index lookup followed by 800,000 heap fetches. The optimizer will skip the index. The index takes storage space and slows writes for zero query benefit. These low-cardinality columns belong as secondary columns in composite indexes where the primary column is high-cardinality.
>
> **High-write, low-read tables.** Every index on a table must be updated on every INSERT, UPDATE, and DELETE. For tables that receive thousands of inserts per second — like an audit log, an event stream, or a metrics table — adding indexes significantly reduces write throughput. If this table is only read infrequently (like a monthly report export), the tradeoff doesn't make sense. I'd rather let the monthly report be slow than slow down the 1,000 writes/second critical path.
>
> **Never-queried columns or outdated query patterns.** Indexes accumulate over time. A column that was queried frequently 18 months ago might not be queried anymore because the feature was removed or reimplemented. These are "zombie indexes" — they slow every write, consume disk space, and are never used. I run `pg_stat_user_indexes` queries to find indexes with `idx_scan = 0` over the past 30 days and drop them. At SAP, we removed 11 zombie indexes from the products table that had accumulated since the initial schema design — reclaimed 380MB of disk and measurably improved write throughput.

---

### Q4 — System Design Angle
**Interviewer asks:** "How do you approach database indexing for a new microservice that will eventually handle high traffic?"

**Hruday's answer:**
> I think about this in three stages: design-time foundations, early-stage validation, and production profiling.
>
> At design time, I add indexes based on the domain queries I know will exist: primary keys (automatic), foreign keys used in JOINs (not automatic — Postgres doesn't auto-index foreign keys, only MySQL does for InnoDB), and the main filterable columns for list endpoints. Composite indexes for the multi-column `WHERE` clauses I already know about. These go into Liquibase migrations from day one.
>
> In early-stage development (before production traffic), I use `EXPLAIN ANALYZE` on every endpoint that touches the database as part of the review checklist. Any `Seq Scan` above 10,000 rows needs justification — either it's on a small table where seq scan is fine, or it needs an index. This checklist catches the obvious misses before any real load.
>
> In production, I enable the slow query log (`log_min_duration_statement = 100ms` in Postgres) and feed it to a monitoring dashboard. Any query appearing repeatedly in the slow log with consistent patterns is a candidate for index analysis. I also monitor `pg_stat_user_tables` for high sequential scan ratios and `pg_stat_user_indexes` for unused indexes weekly. The schema evolves with traffic patterns — indexes added when needed, dropped when proven unused.
>
> The key constraint: I never add an index speculatively ("this column MIGHT be queried"). I add indexes in response to observed access patterns. Speculative indexes slow writes for hypothetical read benefits that may never materialize.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Add an index on every WHERE column" | "I'll index status, customer_id, and created_at separately" | Three separate single-column indexes on a table are almost always worse than one well-designed composite index; the optimizer MIGHT combine them using Bitmap Heap Scan but that adds merge overhead; a single `(customer_id, status, created_at DESC)` composite index perfectly serves `WHERE customer_id = ? AND status = ? ORDER BY created_at DESC` queries; separate indexes also triple the write overhead vs one composite; analyze the actual queries first, then build the minimum set of composite indexes that covers them — don't index-by-intuition |
| "More indexes = better performance" | "I'll add indexes to all columns the business might ever query" | Every index added to a table increases INSERT/UPDATE/DELETE time — the database must maintain every index entry for every write; a high-write table (audit logs, event streams, payments) with 10 indexes can have 50-80% slower write throughput than the same table with 2 indexes; index count must be constrained by measured query patterns; over-indexing is a real performance problem on write-heavy tables, and zombie indexes (never used but never removed) accumulate silently in every production database |
| "EXPLAIN output is enough for analysis" | "I ran EXPLAIN on the query and the cost looked OK" | `EXPLAIN` without `ANALYZE` shows the **estimated** query plan based on statistics — not the actual execution; the estimate can be wildly wrong if table statistics are stale (last ANALYZE was days/weeks ago); `EXPLAIN ANALYZE` runs the query for real and shows actual row counts and actual execution times; the gap between `rows` (estimated) and `actual rows` tells you whether statistics are accurate; if `rows=1` but `actual rows=150000`, the planner made a terrible plan based on stale data; always use `EXPLAIN ANALYZE` (on a read replica to avoid production impact), and always check whether statistics are current (`last_analyze` in `pg_stat_user_tables`) |

---

## 7. Hruday's Real Experience Hook
> "The SAP Commerce product listing optimization changed my approach to database indexing permanently. What struck me was how obvious the problem was in hindsight — a flagship endpoint reading 2.1 million rows to display 20 products — but nobody had looked at the query plan because the feature was 'working' (returning correct data) and the team had been focused on feature development, not performance.
>
> The covering index pattern was the bigger insight. I'd used composite indexes before but hadn't internalized the `INCLUDE` clause for truly covering a SELECT. The moment I saw `Heap Fetches: 0` in the EXPLAIN ANALYZE output for the first time, I understood why Index Only Scans are so much faster — they're essentially a sorted data structure lookup with no disk I/O to the heap. For a read-heavy product catalog, this is transformative.
>
> The culture change that mattered: after this, I added `EXPLAIN ANALYZE` review to the PR checklist for any new database queries. Any new query touching a table >100K rows has to show its query plan in the PR description. A `Seq Scan` on a large table doesn't get merged without either (a) a new index migration or (b) written justification for why seq scan is acceptable. This caught 3 potential slow queries before they shipped in the following quarter."

---

## 8. Scale Evolution

**Small app (< 100K rows) →** seq scan is fast enough for most queries (milliseconds); add primary key and foreign key indexes; skip composite indexes unless a specific query is already slow; `EXPLAIN` without `ANALYZE` is sufficient for development.

**Medium app (1M–10M rows) →** composite indexes for the main read paths are essential; measure slow query log; `EXPLAIN ANALYZE` in PR checklist; weekly check of `pg_stat_user_indexes` for unused indexes; `CONCURRENTLY` for any new index in production; partial indexes for status-filtered queries.

**Large scale (SAP Commerce, 50M+ rows) →** index-only scans via covering indexes for all high-frequency read paths; index maintenance schedules; weekly pg_stat reports; table partitioning considered alongside indexes (partitioning by date reduces scan scope independent of indexes); multiple read replicas with dedicated indexes for read vs write workloads; PgBouncer connection pooling plus read replica routing at application level.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment transactions table: `WHERE merchant_id = ? AND created_at BETWEEN ? AND ?` — composite index + time-range query; financial reporting queries on large tables; high-write payment tables need careful indexing balance | Composite index design; partial indexes for active/recent records; write throughput vs read speed tradeoff |
| Swiggy / Meesho | Product catalog: millions of products filtered by multiple facets (category, price, rating, seller); order history queries; restaurant/seller lookup with geo-spatial indexes (PostGIS GiST) | Composite + covering indexes; partial indexes for in-stock products; GiST for location queries |
| Adobe / Microsoft | Documents/file metadata: WHERE owner_id + last_modified + type; enterprise RBAC — permissions lookup for every API call; these must be microsecond-fast at scale | Composite indexes for ACL queries; partial indexes for active documents; index-only scans for permission checks |
| SAP Labs | Direct experience: product listing index (category_id, active, price) INCLUDE (name, image_url); 2.3s→8ms; Index Only Scan with Heap Fetches: 0; Liquibase CONCURRENTLY migration; pg_stat_user_indexes for zombie index cleanup; 11 unused indexes removed | Covering index with INCLUDE; CONCURRENTLY migration; production statistics monitoring; quantified outcome |

---

## 10. Related Topics — What to Study Next

- **Topic 244 — N+1 Query Problem** — indexes make individual queries faster; N+1 means you're running the wrong number of queries; these are complementary — first eliminate N+1 (query count), then index the remaining queries (query speed); both are required for a fast backend
- **Topic 246 — Connection Pool Sizing** — slow queries (from missing indexes) hold database connections open longer; a 2-second query holds a connection for 2 seconds; fixing indexes reduces connection hold time and allows the same pool to serve more concurrent requests
- **Topic 248 — Spring Cache Abstraction** — for the most expensive read queries that can't be further optimized by indexes alone (complex multi-table aggregations), caching eliminates the database hit entirely; indexes and caching are complementary layers
- **Topic 03 in System Design — Database Sharding** — once a single-node PostgreSQL instance hits its limits, sharding distributes data across nodes; index strategy changes with sharding because each shard holds a subset of rows and queries may touch multiple shards; indexes within shards follow the same rules, but cross-shard queries require different access patterns

---

*Part 14 · Database Index Strategy for High-Traffic Queries · Full Stack Interview Guide · Hruday D · 2026*
