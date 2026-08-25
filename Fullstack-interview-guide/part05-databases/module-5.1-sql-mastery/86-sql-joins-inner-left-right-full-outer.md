# SQL Joins — INNER, LEFT, RIGHT, FULL OUTER
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- INNER JOIN = only rows where the join condition matches in BOTH tables — non-matching rows are excluded from the result
- LEFT JOIN (LEFT OUTER JOIN) = ALL rows from the left table, plus matched rows from the right — unmatched right side is NULL; you use this when "show me all orders, even those with no matching customer record"
- RIGHT JOIN = opposite of LEFT JOIN — all rows from the right table; rarely used (just swap the tables and use LEFT JOIN instead — easier to reason about)
- FULL OUTER JOIN = ALL rows from BOTH tables — NULL on whichever side has no match; use this to find "show me all orders AND all customers, including those with no counterpart"
- CROSS JOIN = every row in table A combined with every row in table B (Cartesian product); use deliberately for configuration expansion; never accidentally
- The interview trap: candidates use LEFT JOIN everywhere and never explain WHY; the right answer shows you knew INNER JOIN was wrong (it would exclude legitimate records) or that you needed a FULL OUTER to find orphans on both sides
- Connect to experience: Spring Data JPA JPQL and native queries both use these; N+1 queries are often fixed by replacing lazy loading with a JOIN FETCH

---

## 1. One-Line Definition
SQL joins combine rows from two or more tables based on a related column — the join type determines what happens to rows that don't find a match on one or both sides.

---

## 2. The Problem It Solves

In a relational database, data is split across tables to avoid repetition. An e-commerce schema has an `orders` table and a `customers` table. Orders reference customers by `customer_id`. To answer "show me all orders with the customer's name," you need to JOIN those two tables.

**Why the join type matters — a real example:**

```sql
-- Scenario: Generate a report of "all orders and who placed them"
-- orders table has some rows where the customer was deleted (GDPR deletion)
-- customer_id FK exists but the customer row is gone

-- INNER JOIN — will SILENTLY DROP the orders with deleted customers
SELECT o.order_id, o.amount, c.name
FROM orders o
INNER JOIN customers c ON o.customer_id = c.id;
-- Orders placed by deleted customers disappear from the report.
-- Finance auditor asks: "Why are your reported totals $50,000 lower than the DB total?"
-- Nobody knows. This is a silent data quality bug.

-- LEFT JOIN — correct for this report
SELECT o.order_id, o.amount, c.name  -- c.name will be NULL for deleted customers
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id;
-- ALL orders appear. Deleted customer orders show NULL in the name column.
-- Finance audit passes. Clear signal: "10 orders placed by customers since deleted."
```

Choosing the wrong join type causes real bugs in reports, dashboards, and API responses — often silent bugs that take weeks to notice.

---

## 3. How It Works Internally

### Visual Model — What Each Join Returns

```
tables:
  customers:               orders:
  id | name                id | customer_id | amount
  ---+-------              ---+-------------+-------
  1  | Alice               A  | 1           | 100
  2  | Bob                 B  | 1           | 200
  3  | Carol               C  | 2           | 150
  4  | Dave (no orders)    D  | 99          | 50  ← customer_id 99 doesn't exist

INNER JOIN (customers.id = orders.customer_id):
  → Only rows that MATCH on both sides
  Alice  | A | 100   ✅ (match)
  Alice  | B | 200   ✅ (match)
  Bob    | C | 150   ✅ (match)
  Carol  EXCLUDED  ← no orders
  Dave   EXCLUDED  ← no orders
  D/99   EXCLUDED  ← customer 99 doesn't exist

LEFT JOIN (keep ALL customers):
  → All from left (customers), matched from right (orders)
  Alice  | A | 100
  Alice  | B | 200
  Bob    | C | 150
  Carol  | NULL | NULL  ← Carol has no orders — NULLs on right side
  Dave   | NULL | NULL  ← Dave has no orders
  D/99 still EXCLUDED   ← orders is right side, orphan order not shown

RIGHT JOIN (keep ALL orders):
  → All from right (orders), matched from left (customers)
  Alice  | A | 100
  Alice  | B | 200
  Bob    | C | 150
  NULL   | D | 50   ← order placed by non-existent customer_id 99
  Carol  EXCLUDED   ← no orders (orders is right side)
  Dave   EXCLUDED   ← no orders

FULL OUTER JOIN (keep EVERYTHING):
  → All rows from BOTH tables, NULLs where no match
  Alice  | A | 100
  Alice  | B | 200
  Bob    | C | 150
  Carol  | NULL | NULL  ← customer with no orders
  Dave   | NULL | NULL  ← customer with no orders
  NULL   | D | 50      ← order with no matching customer
```

### How the Database Engine Executes a Join

```
Three join strategies — the query planner chooses based on table sizes and indexes:

1. NESTED LOOP JOIN:
   → For each row in table A, scan table B for matching rows
   → Fast when table B is small OR table B has an index on the join column
   → Very slow for large-large joins (O(n × m) in the worst case)
   
   Orders → for each order, look up customer by customer_id
   If customer_id has an index: O(n log m) — fast
   If no index: O(n × m) — for 1M orders × 100K customers = 100 billion comparisons

2. HASH JOIN:
   → Build a hash table from the smaller table using the join key
   → Scan the larger table and probe the hash table for matches
   → Efficient for large-large joins when no useful index exists
   → More memory usage (hash table held in memory)

3. SORT-MERGE JOIN:
   → Sort both tables by the join key
   → Walk through both sorted lists simultaneously, merging matches
   → Efficient when both tables are already sorted on the join key
   → Used when both join columns are indexed (already sorted in the B-Tree index)

EXPLAIN ANALYZE in Postgres shows which strategy the planner chose and why.
If you see "Nested Loop" on large tables → missing index. Add one.
```

---

## 4. The Code

### Wrong Way — Using INNER JOIN When Business Requires ALL Records
```sql
-- Wrong: report for "all products and their total sales"
-- Products with zero sales will be MISSING from this report
SELECT
    p.name AS product_name,
    SUM(oi.quantity * oi.price) AS total_revenue
FROM products p
INNER JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY total_revenue DESC;

-- Bug: brand new products with no sales history don't appear.
-- Marketing asks: "Why aren't the 15 new products in the sales report?"
-- The query silently excludes them.
```
> **Why this fails in production:** INNER JOIN silently drops rows from the left table when no match exists. For reporting, dashboards, or reconciliation queries, this produces wrong totals and missing records — often undetected until an audit.

### Right Way — LEFT JOIN for Inclusive Reports
```sql
-- Correct: ALL products appear, even those with zero sales
SELECT
    p.id,
    p.name AS product_name,
    COALESCE(SUM(oi.quantity * oi.price), 0) AS total_revenue,
    COALESCE(COUNT(oi.id), 0) AS order_count
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.name
ORDER BY total_revenue DESC;

-- COALESCE(SUM(...), 0): when no order_items row matches, SUM returns NULL — COALESCE turns it to 0
-- All 15 new products appear with revenue = 0 and order_count = 0
```

### FULL OUTER JOIN — Finding Orphan Records on Both Sides
```sql
-- Find data integrity problems:
-- customers with no orders AND orders with no valid customer (orphan FK)
SELECT
    c.id         AS customer_id,
    c.name       AS customer_name,
    o.id         AS order_id,
    o.amount,
    CASE
        WHEN c.id IS NULL  THEN 'ORPHAN ORDER — no customer'
        WHEN o.id IS NULL  THEN 'NO ORDERS — new or inactive customer'
        ELSE 'matched'
    END AS status
FROM customers c
FULL OUTER JOIN orders o ON c.id = o.customer_id
WHERE c.id IS NULL OR o.id IS NULL  -- Only show the problem rows
ORDER BY status;

-- Result immediately shows:
-- Orphan orders: placed by customer IDs that no longer exist (data integrity issue)
-- Customers with no orders: legitimate (new customers) or concerning (churned)
```

### Spring Data JPA — JOIN FETCH to Prevent N+1
```java
// Without JOIN FETCH — causes N+1: 1 query for orders + N queries for items
@Query("SELECT o FROM Order o")
List<Order> findAll(); // N+1: each Order.getItems() fires a separate DB query

// With JOIN FETCH — single query with INNER JOIN (loads all orders + items in one go)
@Query("SELECT o FROM Order o JOIN FETCH o.items")
List<Order> findAllWithItems();
// Generates: SELECT o.*, i.* FROM orders o INNER JOIN order_items i ON o.id = i.order_id

// With LEFT JOIN FETCH — includes orders that have NO items (important for correct results)
@Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items")
List<Order> findAllWithItemsIncludingEmpty();
// DISTINCT is required: without it, an order with 3 items produces 3 duplicate Order objects
```

### Performance: Always Index Join Columns
```sql
-- After profiling a slow join, EXPLAIN ANALYZE shows:
-- "Nested Loop  (cost=0.00..145234.23 rows=1000000)"
-- This means: no index, full scan on the right table for each left row

-- Fix: add index on the FK column used in the join condition
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- After index creation, EXPLAIN ANALYZE shows:
-- "Index Scan using idx_orders_customer_id"  ← uses index, much cheaper
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between INNER JOIN and LEFT JOIN?"

**Hruday's answer:**
> INNER JOIN only returns rows where the join condition finds a match in BOTH tables. If a row in the left table has no matching row in the right table, that row is completely excluded from the result.
>
> LEFT JOIN returns ALL rows from the left table, whether or not a match exists in the right table. For rows where no match is found, the right table's columns are filled with NULL.
>
> The practical difference: if I query orders LEFT JOIN customers, I get every order — even those placed by customers who have since been deleted. If I use INNER JOIN, those orders silently disappear from the result. For financial reports and audit queries, that silent exclusion is a real bug.
>
> My default approach: use INNER JOIN only when I'm certain every left-side row MUST have a matching right-side row AND I want to exclude those that don't. Otherwise, LEFT JOIN with COALESCE for NULL handling gives inclusive results that accurately reflect the data in the system.

---

### Q2 — Execution Internals
**Interviewer asks:** "How does the database engine actually execute a JOIN? What happens under the hood?"

**Hruday's answer:**
> The database query planner chooses between three join strategies based on table sizes and available indexes.
>
> Nested Loop Join: for each row in the outer table, it looks up matching rows in the inner table. This is fast when the inner table has an index on the join column — the lookup is O(log n) per outer row. Without an index, it scans the entire inner table for each outer row — O(n × m) for large tables, which can be extremely slow.
>
> Hash Join: builds a hash table from the smaller table in memory using the join key, then scans the larger table and probes the hash table for matches. Very efficient for large unindexed joins — O(n + m) — but uses memory proportional to the smaller table's size.
>
> Sort-Merge Join: sorts both tables by the join key, then merges them in a single pass. Effective when both sides are already sorted — for example, when both join columns are the primary key or have an index.
>
> You can see which strategy Postgres chose with EXPLAIN ANALYZE. If I see a Nested Loop on a large table join and no index on the join column, that's the first thing I add. I've fixed queries going from 15 seconds to 50ms just by adding the missing FK index.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use a FULL OUTER JOIN versus two separate LEFT JOINs?"

**Hruday's answer:**
> FULL OUTER JOIN is the right choice when I need to see orphan records from BOTH sides in a single query — for example, a data integrity audit that finds orders with non-existent customers (right orphans) AND customers who have never ordered (left orphans).
>
> Two separate LEFT JOINs (one in each direction) would require a UNION of the results, which is more verbose and does two full scans instead of one. The FULL OUTER JOIN is cleaner and performs the logic in one pass.
>
> That said, FULL OUTER JOIN is not universally supported — MySQL doesn't support it natively and requires a LEFT JOIN UNION RIGHT JOIN workaround. Postgres, SQL Server, and Oracle support it. So if portability across database vendors matters for a project, I'd use the UNION workaround for safety.
>
> For business reporting where I want ALL records from one main table, LEFT JOIN is always my first choice — it's cleaner, universally supported, and covers most real business logic correctly.

---

### Q4 — Spring JPA Application
**Interviewer asks:** "How does understanding SQL joins help you fix N+1 problems in JPA?"

**Hruday's answer:**
> The N+1 problem in JPA happens when you query a parent entity and then JPA fires a separate query for each parent's collection of children. For example: fetch 100 orders, and JPA fires 100 separate "SELECT items WHERE order_id = ?" queries — 101 queries total instead of 1.
>
> Understanding SQL joins makes the fix obvious: instead of 101 queries, write one query that JOINs orders to order_items. In Spring Data JPA, you do this with JOIN FETCH in JPQL. The generated SQL is a single INNER JOIN or LEFT JOIN query that fetches all parents and their children in one database round-trip.
>
> The subtlety: you need LEFT JOIN FETCH when some orders might have no items — INNER JOIN FETCH would exclude those orders silently, which is the same bug as using the wrong join type in plain SQL. And you need DISTINCT in the JPQL when using LEFT JOIN FETCH with a one-to-many relationship, because the JOIN multiplies the parent rows by the number of children — without DISTINCT, you get duplicate parent objects in the result list, one for each child.
>
> Understanding these join semantics is what separates a developer who knows JPA annotations from one who can debug why their JPA query returns wrong results.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "INNER and INNER are the same as LEFT JOIN usually" | "For most queries it doesn't matter which JOIN you use" | "It matters critically for any query where source data might have missing references — GDPR-deleted users, soft-deleted records, new records not yet linked to a counterpart. INNER JOIN silently drops those rows, producing wrong counts and totals in reports. Choosing the join type is a business requirement decision: 'do I want ALL records from this side, or only matched records?'" |
| "FULL OUTER JOIN isn't important" | "I've never used FULL OUTER JOIN in real projects" | "FULL OUTER JOIN is the correct tool for data reconciliation, migration validation, and finding integrity violations across tables. 'Show me every payment and every order, and highlight where they don't match' — that's a FULL OUTER JOIN. Not knowing it forces awkward workarounds. PostgreSQL supports it natively; MySQL requires UNION of LEFT and RIGHT JOIN." |
| "INDEX on Join Columns is automatic" | "JPA/ORM adds indexes automatically for FK columns" | "JPA does NOT automatically create indexes on FK columns. @JoinColumn creates the foreign key constraint, but not the index. You must explicitly add @Index annotations or migration scripts to create the index. An unindexed FK join column causes full table scans on every join for that column — the #1 hidden performance killer in Spring Data JPA applications. Always check EXPLAIN output for 'Seq Scan' on join columns." |
| "JOIN FETCH works for all collections" | "Just add FETCH to all relationships and N+1 is solved" | "Multiple JOIN FETCH on collections in one JPQL query throws a HibernateException: 'cannot simultaneously fetch multiple bags'. You can join-fetch one collection per query per entity. For multiple collections, either split into separate queries (@EntityGraph per query), use Hibernate's @Fetch(FetchMode.SUBSELECT), or fetch each collection separately with secondary queries after the main load." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, the Spring Boot services I worked on queried Oracle ERP tables that had significant amounts of soft-deleted and GDPR-anonymised records. We had a reporting query that used INNER JOIN and had been silently under-counting financial totals for months — the delta was only visible during a quarterly audit. Switching to LEFT JOIN with COALESCE for the count columns fixed the discrepancy. That experience permanently changed how I approach join type selection: I start by asking 'are there records on the left side that might have no match on the right — and do I want to see them?' The answer determines the join type, not habit or convention."

---

## 8. Scale Evolution

**Small dataset (< 100K rows per table):** Join types produce correct results even without perfect indexes. Full scans on small tables are fast enough. Development and testing may not reveal index-related performance issues.

**Medium dataset (100K - 10M rows):** Join column indexes become critical. EXPLAIN ANALYZE on slow queries reveals missing indexes. N+1 in JPA starts noticeably degrading API response times. JOIN FETCH and batch fetching strategies become necessary.

**Large dataset (> 10M rows):** Join strategies chosen by the query planner matter significantly. Consider denormalisation for read-heavy reports — pre-materialise the join result in a summary table or CQRS read model updated by events. Avoid runtime JOINs across billion-row tables in user-facing latency-sensitive paths.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial reconciliation queries join transactions, settlements, and merchant accounts. Wrong join type = wrong totals = compliance failure. Understanding join semantics is non-negotiable for fintech. | Live SQL coding: "Write a query to find all merchants who received payments but have no settlement record." |
| Swiggy / Meesho | Order analytics joining orders, users, restaurants, delivery partners. Reporting queries must handle soft-deleted restaurants and churned users without dropping data. | "Write a query to show daily order counts including restaurants that had no orders that day." |
| Adobe / Microsoft | Product analytics — user behaviour events joined to account records. Many-to-many joins through junction tables, covering index design, and JOIN performance at scale are standard senior questions. | "How would you optimise a JOIN across 500M event rows?" |
| SAP Labs (current) | SAP's ABAP/CDS views are essentially parameterised SQL JOINs across ERP tables. Understanding join semantics explains SAP's LEFT OUTER JOIN vs INNER JOIN in CDS view definitions. | "Why does this SAP report show fewer line items than expected after a JOIN to the customer master?" |

---

## 10. Related Topics — What to Study Next

- **Topic 87 — Indexing (B-Tree, composite, covering)** — without indexes on join columns, every join degrades to a full table scan; indexes are the prerequisite for join performance
- **Topic 47 — ORM Pitfalls (N+1, lazy loading, fetch strategies)** — the JPA layer abstracts SQL joins, but knowing the underlying SQL is what lets you understand JOIN FETCH, DISTINCT, and why the wrong fetch type causes wrong results
- **Topic 88 — Query Optimization (EXPLAIN plan)** — EXPLAIN ANALYZE reveals which join strategy the planner chose and whether indexes are being used; connects directly to join performance understanding
- **Topic 90 — Schema Design** — join types become intuitive when you understand why data is split across tables in the first place; the schema design determines which joins are needed and which side is optional

---

*Part 5 · SQL Joins — INNER, LEFT, RIGHT, FULL OUTER · Full Stack Interview Guide · Hruday D · 2026*
