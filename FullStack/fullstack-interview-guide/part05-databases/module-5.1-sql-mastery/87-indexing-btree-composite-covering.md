# Indexing — B-Tree, Composite, Covering Indexes
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Index = a separate data structure that the database maintains alongside your table; it lets the database find rows matching a WHERE condition WITHOUT scanning every row — like the index in a book
- B-Tree index (default for Postgres/MySQL) = a balanced tree where each leaf node points to a table row; searching is O(log n) instead of O(n); great for equality (=) and range queries (>, <, BETWEEN, LIKE 'prefix%')
- Composite index = an index on MULTIPLE columns: `CREATE INDEX idx ON orders(status, created_at)`; the order of columns matters — this index helps `WHERE status = 'PLACED' AND created_at > ?` but NOT `WHERE created_at > ?` alone (leftmost prefix rule)
- Covering index = an index that contains ALL columns needed by a query, so the database never touches the actual table — the query is answered entirely from the index; achieved by adding extra columns to the index with INCLUDE (Postgres) or by including them in the index key
- Index write penalty: every INSERT, UPDATE, DELETE also updates all indexes on that table — heavy indexing slows writes; index only what you query
- Gap to bridge: candidates know "add an index to WHERE columns" but cannot explain WHY composite column order matters, what a covering index is, or what happens to index performance after data distribution changes (index selectivity)

---

## 1. One-Line Definition
A database index is a data structure (typically a B-Tree) maintained alongside a table that allows the database to locate rows matching a condition in O(log n) time instead of scanning every row in the table.

---

## 2. The Problem It Solves

```
Imagine the orders table has 10,000,000 rows.

Query: SELECT * FROM orders WHERE status = 'SHIPPED' AND created_at > '2026-01-01'

WITHOUT an index:
  Database reads EVERY row in the table one by one: 10,000,000 row reads
  Checks: does this row have status='SHIPPED' and created_at after 2026-01-01?
  Collects the matching rows.
  This is called a FULL TABLE SCAN (or Seq Scan in Postgres EXPLAIN output)
  
  At 1 millisecond per 1,000 rows: 10,000,000 / 1,000 × 1ms = 10,000ms = 10 seconds
  Under concurrent load with 100 users searching simultaneously: catastrophic

WITH index on (status, created_at):
  Database descends the B-Tree in ~log2(10,000,000) ≈ 23 steps
  Finds the first matching entry at the leaf level
  Reads forward along the leaf level (range scan) collecting matches
  Stops when outside the range
  
  At 1ms per B-Tree level + 1ms per matched row found:
  23ms navigation + few ms for matched rows = < 50ms total
  200x faster than a full scan for a selective query
```

---

## 3. How It Works Internally

### B-Tree Structure

```
B-Tree Index on orders.status:

Root:
  ┌──────────────────────────────────┐
  │  'CANCELLED' | 'PENDING' | 'SHIPPED' │
  └────┬──────────────┬───────────────┘
       │             │
  Internal node:    Internal node:
  │'C..E'│'E..M'│   │'S..T'│'T..Z'│
       │
  Leaf nodes (SORTED, doubly linked):
  ┌────────────────────────────────────────────┐
  │ CANCELLED→row5 │ CANCELLED→row12 │ PENDING→row2 │ PENDING→row7 │ SHIPPED→row1 │...
  └────────────────────────────────────────────┘
       ↑________________________________↑
       Leaf nodes are linked in order (enabled range scans)

For query WHERE status = 'SHIPPED':
  1. Start at root, follow 'SHIPPED' pointer
  2. Descend through internal nodes in ~3-4 steps (log of the tree height)
  3. Reach the first 'SHIPPED' leaf entry
  4. Scan forward along the linked leaf level until no more 'SHIPPED' entries
  5. For each leaf entry: fetch the actual row from the table (heap)
  
  This final step — fetching the actual table row from a leaf entry — is called
  a HEAP FETCH or table access. Covering indexes eliminate this step.
```

### Composite Index: Column Order is Everything

```
Index: CREATE INDEX idx_orders_status_date ON orders(status, created_at)

B-Tree sorts by STATUS first, then CREATED_AT within each status group.

QUERIES THIS INDEX HELPS:
  ✅ WHERE status = 'SHIPPED'
     → Navigate to 'SHIPPED' section — O(log n)
  ✅ WHERE status = 'SHIPPED' AND created_at > '2026-01-01'
     → Navigate to 'SHIPPED' section, then scan forward from '2026-01-01' — O(log n + k)
  ✅ WHERE status IN ('SHIPPED', 'DELIVERED')
     → Two range lookups — O(log n + k)
  ✅ ORDER BY status, created_at
     → Data already in this order in the index — no sort needed

QUERIES THIS INDEX DOES NOT HELP:
  ❌ WHERE created_at > '2026-01-01'    ← skipped the leftmost column 'status'
     → Still requires full index scan (or table scan)
     → To help this: create a SEPARATE index on just (created_at)
  ❌ WHERE created_at > '2026-01-01' AND status = 'SHIPPED'
     → Same problem! SQL is set-based, but the index is ordered by status first.
     → The query planner might still use this index if it can apply status filter first,
       but you can't skip the leftmost column for a range scan on created_at.

LEFTMOST PREFIX RULE:
  Index (A, B, C) helps queries filtering on:
  A                   ✅
  A, B                ✅
  A, B, C             ✅
  A, C                ✅ (partially — uses A, then re-filters on C)
  B                   ❌ (skips A)
  C                   ❌ (skips A)
  B, C                ❌ (skips A)
```

### Covering Index — Eliminating the Heap Fetch

```
Query: SELECT order_id, status, total FROM orders WHERE status = 'SHIPPED'

WITH regular index on (status):
  Step 1: B-Tree lookup → find leaf entries for status = 'SHIPPED'
  Step 2: For each match: HEAP FETCH → go to the actual table page to get order_id and total
  
  If 10,000 orders have status='SHIPPED': 10,000 separate heap fetches
  Each fetch may be from a different disk page → random I/O → SLOW

WITH covering index on (status) INCLUDE (order_id, total) [Postgres syntax]:
  The index leaf entries now contain: status + pointer + order_id + total
  (The INCLUDE columns are stored at the leaf level, not in the tree structure)
  
  Step 1: B-Tree lookup → find leaf entries for status = 'SHIPPED'
  Step 2: Read order_id and total DIRECTLY from the index leaf — NO heap fetch needed
  
  This is a "Index Only Scan" in Postgres EXPLAIN output
  Random I/O eliminated. The index pages are sequentially scanned.
  Can be 5-10x faster than a regular index for read-heavy queries.

Postgres syntax:
  CREATE INDEX idx_covering ON orders(status) INCLUDE (order_id, total, amount);

MySQL/InnoDB syntax (all index columns ARE included in the sense that they are in the B-Tree):
  CREATE INDEX idx_covering ON orders(status, order_id, total, amount);
  (add the extra columns to the index key itself — slightly different semantics but same effect)
```

---

## 4. The Code

### Wrong Way — Indexing the High Cardinality Column Last
```sql
-- Table: user_events with 500M rows
-- Columns: user_id (10M distinct values, HIGH cardinality)
--           event_type ('click', 'view', 'purchase' — 3 distinct values, LOW cardinality)
--           occurred_at (timestamp)

-- Wrong: index on event_type first
-- Because event_type has only 3 values, the first index level barely narrows the search
CREATE INDEX idx_wrong ON user_events(event_type, user_id);

-- Query: find all events for user_id = 12345
-- The planner may AVOID this index entirely because event_type first → too many matches
-- Worse: even when used, it finds all events of each type before filtering user_id

-- Better: high-cardinality column first
CREATE INDEX idx_correct ON user_events(user_id, event_type);
-- Now: user_id=12345 immediately narrows to ~50 rows, then event_type filters within those
```
> **Why this fails:** Putting a low-cardinality column first in a composite index creates a wide, useless first level — the index is barely better than a full scan for queries filtering on the high-cardinality second column.

### Right Way — Covering Index for a High-Traffic Query
```sql
-- High-traffic query: user's order history page
-- Runs 10,000 times/second, must be under 5ms

SELECT order_id, status, total_amount, created_at
FROM orders
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 20;

-- Analysis: filters on user_id, needs status + total_amount + created_at in result

-- Step 1: composite index for filtering + sorting
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
-- user_id for the WHERE, created_at DESC matches the ORDER BY → no sort step

-- Step 2: covering index to eliminate heap fetches
CREATE INDEX idx_orders_user_history ON orders(user_id, created_at DESC)
INCLUDE (order_id, status, total_amount);
-- All 4 SELECT columns are in the index. No heap fetches needed.
-- EXPLAIN shows "Index Only Scan" — fastest possible execution.
```

### Spring Data JPA — Adding Indexes via Annotations
```java
@Entity
@Table(
    name = "orders",
    indexes = {
        // Composite index for order history queries
        @Index(name = "idx_orders_user_created",
               columnList = "user_id, created_at DESC"),

        // Index for saga/event processing queries
        @Index(name = "idx_orders_status_created",
               columnList = "status, created_at"),

        // Unique index — prevents duplicate order references
        @Index(name = "idx_orders_reference",
               columnList = "external_reference",
               unique = true)
    }
)
@Data
@NoArgsConstructor
public class Order {
    @Id
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private String status;

    @Column(name = "total_amount")
    private BigDecimal totalAmount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    // These annotations only generate the CREATE INDEX in Flyway/schema.sql when
    // spring.jpa.hibernate.ddl-auto=create or update.
    // In production: use Flyway migration scripts directly; don't rely on DDL auto.
}
```

### Checking Index Usage with EXPLAIN
```sql
-- Check if your query uses the index you expect:
EXPLAIN ANALYZE
SELECT order_id, status, total_amount, created_at
FROM orders
WHERE user_id = 'usr-123'
ORDER BY created_at DESC
LIMIT 20;

-- GOOD output shows:
-- "Index Only Scan using idx_orders_user_history on orders"
-- "Heap Fetches: 0"  ← covering index working perfectly

-- BAD output shows:
-- "Seq Scan on orders"             ← full table scan, no index used
-- "Sort Method: quicksort"         ← had to sort in memory, no sorted index
-- "Heap Fetches: 25000"            ← regular index, not covering
-- "Nested Loop (cost=... rows=9999999)" ← join without index on join column
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does a B-Tree index speed up a query?"

**Hruday's answer:**
> A B-Tree index is a sorted tree structure that lives alongside the table. Instead of reading every row to find matches, the database navigates the tree — starting at the root, following the correct branch at each level based on comparisons — and reaches the matching leaf entries in O(log n) steps. For 10 million rows, that's about 23 steps instead of 10 million reads.
>
> The leaf level of the B-Tree is key — the leaves are sorted and linked together. This means once you find the start of a range, you can scan forward along the linked leaf pages to collect all matching rows without going back through the tree. This makes range queries like `WHERE created_at BETWEEN '2026-01-01' AND '2026-02-01'` very efficient too — not just exact lookups.
>
> For each matching leaf entry, the database fetches the actual row from the table (the heap). A covering index eliminates this step by storing the queried columns directly in the index — the query can be answered entirely from the index pages, which are usually much smaller, sequentially ordered, and cached in memory.

---

### Q2 — Composite Index Column Order
**Interviewer asks:** "You have a composite index on (status, created_at). A colleague asks why their query WHERE created_at > '2026-01-01' is still slow. What do you tell them?"

**Hruday's answer:**
> The composite index `(status, created_at)` sorts entries by status first, then by created_at within each status group. When a query filters ONLY on created_at without filtering on status, the database cannot navigate to a useful starting point in the index — it would need to check every status group to find entries where created_at exceeds the threshold. The database planner often decides a full table scan is cheaper than scanning the entire index.
>
> The fix: add a separate index on just `(created_at)` for queries that filter by date without a status filter. The original composite index stays for queries that filter on both.
>
> This is the leftmost prefix rule: a composite index on (A, B) helps queries that filter on A alone or A+B together, but not B alone. Think of it like a phone book sorted by last name then first name — useful for finding everyone named "Smith" or "Smith, John," but useless for finding everyone named "John" because Johns are scattered throughout every last name group.

---

### Q3 — Index Write Cost
**Interviewer asks:** "If indexes speed up reads, why not add an index on every column?"

**Hruday's answer:**
> Every index you create is a data structure that must be maintained. On every INSERT, the database adds a new entry to every index. On every UPDATE of an indexed column, it removes the old index entry and inserts the new one. On every DELETE, it removes the entry from every index. The more indexes you have, the more work each write operation does.
>
> For a table that receives 10,000 writes per second with 10 indexes — each write does 10 index updates. That's 100,000 index update operations per second. Under write-heavy load, over-indexing is a serious performance problem. It can also increase storage by 2-3x if every column is indexed.
>
> The right approach: index specific, measured query patterns. Look at slow query logs and EXPLAIN output to find missing indexes. Don't index columns used only in SELECT lists — only columns in WHERE clauses, JOIN conditions, and ORDER BY. Periodically audit unused indexes (Postgres has `pg_stat_user_indexes` showing times each index was used) and drop indexes that are never accessed.

---

### Q4 — Covering Index Design
**Interviewer asks:** "Design the indexes for a high-traffic order history API endpoint."

**Hruday's answer:**
> The order history endpoint typically runs: `SELECT order_id, status, total, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`.
>
> First I'd add a composite index on `(user_id, created_at DESC)`. The user_id filters the rows for one user. The DESC matches the ORDER BY — the database can use the index to retrieve rows in the right order without a separate sort step.
>
> But this still requires heap fetches: for each matching leaf entry in the index, the database reads the actual table row to get status and total. For a query running 10,000 times per second, those heap fetches are random I/O across potentially millions of table pages.
>
> The optimisation: make it a covering index. In Postgres: `CREATE INDEX idx_order_history ON orders(user_id, created_at DESC) INCLUDE (order_id, status, total)`. Now all four columns the SELECT needs are stored in the index itself. EXPLAIN shows "Index Only Scan with Heap Fetches: 0" — the query never touches the main table. Response time drops from 20ms to under 2ms at scale.
>
> I'd also check with EXPLAIN periodically after data growth — index selectivity changes as data distribution changes, and the query planner occasionally surprises you.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Add index on every WHERE column" | "Just index all filter columns and queries will be fast" | "Composite indexes on the RIGHT combination of columns are far more powerful than one index per column. An index on (user_id, created_at) is better than two separate indexes on user_id and created_at for a query filtering both — the composite gives filtered+sorted result in one index scan. One index per column requires an index merge or two range scans plus a sort. Design indexes around query patterns, not individual columns." |
| "Index on LIKE queries doesn't work" | "You can't use indexes with LIKE queries" | "B-Tree indexes DO support LIKE with a prefix pattern: `WHERE name LIKE 'Smith%'` uses the index (prefix matches the sorted order). What does NOT use a B-Tree index: `WHERE name LIKE '%Smith'` (leading wildcard — the sorted order doesn't help) or `WHERE name LIKE '%Smith%'` (middle wildcard). For full-text search, use a dedicated full-text index (Postgres GIN index with tsvector) or Elasticsearch." |
| "Primary key is enough" | "Postgres creates an index on the PK automatically — that's sufficient" | "Postgres auto-creates a unique B-Tree index for the PRIMARY KEY. But queries never filter on PK alone in a real application — they filter on user_id, status, created_at, email. Your FK columns used in JOINs also don't get indexes automatically. A missing index on customer_id in the orders table means every orders JOIN customers query does a full table scan on orders — often the single biggest performance issue in Spring Data JPA applications." |
| "Unique constraint = unique index" | "Adding a UNIQUE constraint automatically optimises queries" | "True — a UNIQUE constraint does create an index. But a regular UNIQUE constraint index serves integrity AND query performance. For performance alone on a non-unique column, you need a regular index. More importantly: a unique constraint on (user_id, product_id) in a favourites table prevents duplicate entries AND creates the composite index that makes 'get all favourites for user_id X' fast. Unique constraints often serve double duty and are underutilised." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, the Spring Boot APIs queried Oracle Database tables that in some cases had hundreds of millions of rows — order history, financial line items, audit events. The first time I ran `EXPLAIN PLAN FOR` on a slow query and saw 'TABLE ACCESS FULL' next to an 80-million-row table, I understood why production was 40× slower than our test environment with 1,000 rows. Adding a composite index on the filterable and sortable columns dropped that specific query from 8 seconds to 120ms. I now treat every new query I write against a table with real production-scale data as: first draft the query, then immediately run EXPLAIN, find the access method, and add the right index if it's not there."

---

## 8. Scale Evolution

**Small dataset (< 100K rows):** Indexes speed up queries but the improvement isn't dramatic — full scans on 100K rows are fast. Development and early production work fine without careful index design.

**Medium dataset (1M-50M rows):** Missing indexes become visible as slow queries. FK join columns must be indexed. Composite indexes for high-traffic query patterns are necessary. EXPLAIN ANALYZE becomes a routine tool.

**Large dataset (> 100M rows):** Covering indexes eliminate random heap I/O — the difference between 50ms and 5ms for a high-traffic endpoint. Partial indexes (index only rows where status != 'ARCHIVED') reduce index size. Index bloat monitoring (dead tuples after heavy updates) becomes an operational concern requiring periodic `VACUUM ANALYZE`.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction history tables grow at 10M+ rows/day. Index design for payment lookup by user, by merchant, by status is core infrastructure. Missing FK indexes cause visible latency. | "Design the indexes for a transactions table at 500M rows/day insert rate." |
| Swiggy / Meesho | Order tracking queries by user + time range + status. Covering indexes on the order history endpoint directly impact app responsiveness during peak ordering hours. | "This query runs 50,000 times/second. Walk me through optimising it." |
| Adobe / Microsoft | User event and telemetry tables at billions of rows. Index strategy determines whether analytics dashboards load in 1 second or 30 seconds. Partial indexes on active/recent data are standard. | "How would you index a 10-billion-row events table for real-time dashboard queries?" |
| SAP Labs (current) | Oracle database tables in SAP ERP have highly tuned indexes maintained by SAP. Understanding why specific composite and function-based indexes exist in the SAP schema helps when debugging performance of custom reports and extensions. | "Why does this SAP query use a full table scan despite having an index on the filter column?" |

---

## 10. Related Topics — What to Study Next

- **Topic 88 — Query Optimization (EXPLAIN plan, slow query analysis)** — indexes are designed based on EXPLAIN output; knowing how to read and act on an execution plan makes index design targeted rather than guesswork
- **Topic 86 — SQL Joins** — join columns are the most critical indexes to have; understanding join internals explains why missing FK indexes cause such dramatic slowdowns
- **Topic 87 covered here** — composite index ordering connects directly to how B-Tree structure works; the two topics reinforce each other
- **Topic 91 — Replication** — indexes exist per replica; read replica index design can differ from primary to serve analytical queries differently from transactional queries

---

*Part 5 · Indexing — B-Tree, Composite, Covering Indexes · Full Stack Interview Guide · Hruday D · 2026*
