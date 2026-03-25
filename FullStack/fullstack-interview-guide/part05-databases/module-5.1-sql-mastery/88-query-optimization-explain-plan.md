# Query Optimization — EXPLAIN Plan, Slow Query Analysis
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- EXPLAIN shows the query planner's execution plan — a tree of operations the database will perform to produce your result; EXPLAIN ANALYZE actually runs the query and shows real timing and row counts alongside the estimates
- Seq Scan = full table scan (reads every row); Index Scan = navigates a B-Tree then fetches rows from the heap; Index Only Scan = reads the index without touching the table (fastest); Bitmap Heap Scan = batches index lookups to reduce random I/O
- Key numbers to read: `cost=start..total` (planner estimate in abstract units), `rows=` (planner row estimate — compare to `actual rows=`), `Heap Fetches:` (should be near 0 for Index Only Scans), and `loops=` (how many times the node was executed in a join)
- Slow query causes (most common): missing index on WHERE/JOIN/ORDER BY column, wrong join type chosen by planner, stale statistics (ANALYZE the table), N+1 query from ORM, cardinality estimate is wildly wrong (seen as large gap between `rows=` and `actual rows=`)
- N+1 problem: loading 1 parent entity, then issuing N separate queries to load N child entities — 1 + N queries instead of 1 JOIN query; fix by using JOIN FETCH in JPQL or @EntityGraph in Spring Data JPA
- Gap to bridge: candidates know "add an index and check EXPLAIN" but cannot read an EXPLAIN output, explain why the planner chose a Seq Scan over an existing index, or diagnose whether the problem is N+1, stale statistics, or missing join index

---

## 1. One-Line Definition
Query optimization is the process of understanding WHY a query is slow (using EXPLAIN ANALYZE) and fixing the identified bottleneck — whether that's a missing index, an ORM-generated N+1 loop, stale planner statistics, or a misconfigured join strategy.

---

## 2. The Problem It Solves

```
You push a feature to production. The developers page reports the API timing out.
Logs show: GET /api/orders?userId=12345 → P99 = 15,000ms

Your code:
  List<Order> orders = orderRepository.findByUserId(userId);  // 200 orders returned
  for (Order o : orders) {
      User user = userRepository.findById(o.getUserId()).orElseThrow();
      // use user details...
  }

What the database actually received:
  Query 1:  SELECT * FROM orders WHERE user_id = '12345'  → returns 200 rows
  Query 2:  SELECT * FROM users WHERE id = '12345'
  Query 3:  SELECT * FROM users WHERE id = '12345'
  Query 4:  SELECT * FROM users WHERE id = '12345'
  ... 200 more identical queries (N+1 queries for the same user)

Or:
  List<Order> orders = orderRepo.findByStatus("SHIPPED");   // returns 50,000 rows
  EXPLAIN shows: Seq Scan on orders (cost=0.00..280,000 rows=50000)
  Table has 10,000,000 rows. Missing index on status column.
  
Without knowing HOW to diagnose — whether it's N+1, missing index, or stale stats —
you're guessing at the fix. Diagnosis before solution.
```

---

## 3. How It Works Internally

### Reading a Postgres EXPLAIN ANALYZE Output

```sql
EXPLAIN ANALYZE
SELECT o.order_id, o.status, u.name
FROM orders o
JOIN users u ON o.user_id = u.id
WHERE o.status = 'SHIPPED'
  AND o.created_at > '2026-01-01'
ORDER BY o.created_at DESC
LIMIT 20;
```

```
Output:
Limit  (cost=1.23..1.45 rows=20 width=62)
       (actual time=0.412..0.520 rows=20 loops=1)
  ->  Sort  (cost=1.23..5.27 rows=1678 width=62)
            (actual time=0.410..0.413 rows=20 loops=1)
        Sort Key: o.created_at DESC
        Sort Method: top-N heapsort  Memory: 27kB
        ->  Hash Join  (cost=15.32..85.40 rows=1678 width=62)
                       (actual time=0.205..0.380 rows=1692 loops=1)
              Hash Cond: (o.user_id = u.id)
              ->  Index Scan using idx_orders_status_date on orders o
                         (cost=0.56..45.22 rows=1678 width=42)
                         (actual time=0.050..0.200 rows=1692 loops=1)
                    Index Cond: ((status = 'SHIPPED') AND (created_at > '2026-01-01'))
              ->  Hash  (cost=8.70..8.70 rows=370 width=28)
                        (actual time=0.120..0.121 rows=370 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 29kB
                    ->  Seq Scan on users u
                               (cost=0.00..8.70 rows=370 width=28)
                               (actual time=0.015..0.080 rows=370 loops=1)
Planning Time: 0.312 ms
Execution Time: 0.625 ms
```

**How to read this output (top to bottom = from outer to inner operation):**

```
Node format: Node-Type  (cost=startup..total rows=estimate width=bytes)
                        (actual time=startup..total rows=real-count loops=n)

KEY THINGS TO LOOK AT:

1. INDEX SCAN vs SEQ SCAN
   "Index Scan using idx_orders_status_date on orders" ← GOOD: using an index
   "Seq Scan on orders"                               ← BAD if table is large

2. rows=estimate vs actual rows=real
   rows=1678 estimated, actual rows=1692 ← close enough, planner is well-calibrated
   rows=5 estimated, actual rows=50000  ← BADLY WRONG. Planner will choose wrong strategy.
   Fix: run ANALYZE orders; to update statistics

3. Sort Method and Memory
   "Sort Method: top-N heapsort Memory: 27kB" ← small, in-memory sort: fine
   "Sort Method: external merge Disk: 45MB"   ← sorting on disk: need better index or work_mem

4. Hash Join vs Nested Loop vs Merge Join
   Hash Join: good for medium→large tables when no useful index on join column
   Nested Loop: good for small inner table or when index exists on join column
   Merge Join: good for large, pre-sorted result sets
   
   If Nested Loop with loops=50000: planner chose wrong join type → usually means
   bad row estimate forced it to think inner side was tiny

5. Heap Fetches: 0   ← ideal (Index Only Scan serving all columns from index)
   Heap Fetches: 50000 ← each index match also required a table row read (random I/O)
```

### N+1 Query Problem Diagnosis

```
In application logs (with spring.jpa.show-sql=true):

GOOD — 1 query with JOIN:
  Hibernate: select o.id, o.status, u.name from orders o join users u on o.user_id=u.id
             where o.user_id='12345'

BAD — N+1 problem:
  Hibernate: select * from orders where user_id='12345'
  Hibernate: select * from users where id='12345'
  Hibernate: select * from users where id='12345'
  ... (200 more times for the same user)
  
  OR for a parent-child relationship:
  Hibernate: select * from customers where id in (1,2,3,...20)   ← 1 query
  Hibernate: select * from orders where customer_id=1             ← N queries
  Hibernate: select * from orders where customer_id=2
  ... (20 more)

The 1+N comes from:
  1 query for the parent entities
  N queries for each parent's children fetched lazily as @OneToMany is accessed
```

### Planner Statistics and Why They Go Stale

```
Postgres collects statistics about tables (column value distribution, row counts)
in a structure called pg_statistics. The query planner uses these statistics to
estimate: "how many rows will this WHERE clause return?"

If statistics are stale (table grew 10x since last ANALYZE):
  Table actually has 10,000,000 rows
  Planner thinks it has 100,000 rows (from old statistics)
  
  Planner calculates: "I'll join this 100,000 row table using a Nested Loop"
  Actually: Nested Loop on 10,000,000 rows = catastrophic
  
  A Hash Join or Merge Join would have been correct for 10M rows.
  But the planner chose wrong because of stale statistics.
  
  Fix: ANALYZE orders;   (updates statistics without locking, ~1 second for most tables)
  Or:  VACUUM ANALYZE;   (also reclaims dead tuple space from past updates/deletes)
```

---

## 4. The Code

### Wrong Way — Ignoring N+1 in Spring Data JPA
```java
// WRONG: causes N+1 queries for a customer order summary
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerRepository customerRepo;
    private final OrderRepository orderRepo;

    @GetMapping("/{id}/summary")
    public CustomerSummaryDto getSummary(@PathVariable String id) {
        Customer customer = customerRepo.findById(id).orElseThrow();

        // WRONG: orders is a @OneToMany with FetchType.LAZY (the JPA default)
        // Accessing customer.getOrders() triggers a separate SELECT per customer
        List<Order> orders = customer.getOrders();  // ← N+1 trigger

        // Worse: iterating to compute totals issues N queries for N orders
        BigDecimal total = orders.stream()
            .map(Order::getTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // If this endpoint is called for a customer list of 100: 100 + 100 = 200 queries
        return new CustomerSummaryDto(customer.getName(), orders.size(), total);
    }
}
```
> **Why this fails:** Each access to `customer.getOrders()` on a LAZY collection fires a new SELECT. Even one customer causes 2 queries (1 for customer, 1 for orders). For a list of 100 customers: 101 queries where 1 JOIN query would do.

### Right Way — Diagnose with EXPLAIN, Fix N+1 with JOIN FETCH
```java
// --- Step 1: Enable JPA SQL logging in development (application.yml) ---
// spring:
//   jpa:
//     show-sql: true
//     properties:
//       hibernate:
//         format_sql: true
//         generate_statistics: true  ← shows query count in logs
// logging:
//   level:
//     org.hibernate.stat: DEBUG       ← shows "N queries" at end of request

// --- Step 2: Write a JPQL query that does the JOIN eagerly ---
public interface CustomerRepository extends JpaRepository<Customer, String> {

    // JOIN FETCH eliminates N+1: one SQL JOIN loads customer + orders together
    @Query("SELECT c FROM Customer c LEFT JOIN FETCH c.orders WHERE c.id = :id")
    Optional<Customer> findByIdWithOrders(@Param("id") String id);

    // For collections: @EntityGraph is cleaner than JOIN FETCH on repository methods
    @EntityGraph(attributePaths = {"orders", "orders.items"})
    @Query("SELECT c FROM Customer c WHERE c.id IN :ids")
    List<Customer> findAllWithOrdersByIds(@Param("ids") List<String> ids);
}

// --- Step 3: Use the repository method ---
@GetMapping("/{id}/summary")
public CustomerSummaryDto getSummary(@PathVariable String id) {
    Customer customer = customerRepo.findByIdWithOrders(id)
        .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));

    // Now customer.getOrders() is already loaded — no additional query fired
    BigDecimal total = customer.getOrders().stream()
        .map(Order::getTotal)
        .reduce(BigDecimal.ZERO, BigDecimal::add);

    return new CustomerSummaryDto(customer.getName(), customer.getOrders().size(), total);
    // Result: 1 SQL query with JOIN, regardless of how many orders
}

// --- Step 4: Verify with EXPLAIN ANALYZE (paste into psql or DBeaver) ---
// EXPLAIN ANALYZE
// SELECT c.*, o.* FROM customers c
// LEFT JOIN orders o ON o.customer_id = c.id
// WHERE c.id = 'cust-123';
// 
// Look for:
// ✅ "Hash Join" or "Nested Loop" (a join is happening — not separate queries)
// ✅ "Index Scan using idx_orders_customer_id on orders" (FK index exists)
// ❌ "Seq Scan on orders" → add index: CREATE INDEX idx_orders_customer_id ON orders(customer_id);
```

### Slow Query Detection in Spring Boot (Production)
```java
// application.yml — log queries over 100ms in production
spring:
  jpa:
    properties:
      hibernate:
        session:
          events:
            log:
              LOG_QUERIES_SLOWER_THAN_MS: 100  # Hibernate 6 / Spring Boot 3.x

# Alternative: Postgres slow query log (postgresql.conf)
# log_min_duration_statement = 100   # log queries > 100ms
# log_statement = 'none'

// Programmatic way: count queries per HTTP request to detect N+1 in tests
@Component
@RequiredArgsConstructor
public class QueryCountInterceptor implements HandlerInterceptor {

    private final SessionFactory sessionFactory;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response, Object handler) {
        // Enable Hibernate statistics
        sessionFactory.getStatistics().setStatisticsEnabled(true);
        sessionFactory.getStatistics().clear();
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler, Exception ex) {
        long count = sessionFactory.getStatistics().getQueryExecutionCount();
        if (count > 10) {
            log.warn("Suspicious query count for {} {}: {} queries",
                     request.getMethod(), request.getRequestURI(), count);
        }
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the first thing you do when a database query is slow?"

**Hruday's answer:**
> First, I measure — I need to know if the query is consistently slow or only under concurrent load. I check slow query logs to get the actual execution time and how often it fires.
>
> Next, I run `EXPLAIN ANALYZE` on the exact query with representative parameter values. I look for: is it doing a Seq Scan on a large table? Are the row estimates dramatically off (suggesting stale statistics)? Is there a Sort on disk? How many loops is a Nested Loop doing?
>
> Before jumping to "add an index," I also check whether it's actually an N+1 problem — one query is fine, but the API fires it 500 times for a list page. If `show-sql` is on, it's immediately visible. If not, Hibernate statistics gives query counts per request.
>
> The diagnosis determines the fix: N+1 → JOIN FETCH or EntityGraph. Missing index → add the right composite index. Stale statistics → ANALYZE. Bad row estimates → pg_stats investigation. Each has a different solution.

---

### Q2 — EXPLAIN Output Reading
**Interviewer asks:** "EXPLAIN ANALYZE shows `rows=5 estimated, actual rows=50000` for a filter condition. What does this tell you and what do you do?"

**Hruday's answer:**
> That 10,000x cardinality estimate error is a major red flag. The query planner decided how to execute the plan based on an estimate of 5 rows, but actually received 50,000 rows. This means the planner likely chose a Nested Loop join (efficient when inner side is small, terrible when it's not) or skipped an index that would have been beneficial if it had known the real row count.
>
> The cause is almost always stale statistics. The table has grown significantly since the last `ANALYZE` run. Postgres's autovacuum runs ANALYZE automatically, but for tables that grow very fast — millions of inserts per day — autovacuum may not keep up.
>
> Immediate fix: `ANALYZE orders;` — this updates pg_statistics with the current data distribution. Takes seconds. Then re-run EXPLAIN ANALYZE and the planner should choose a better execution path.
>
> Longer-term fix: consider increasing autovacuum frequency for high-growth tables via their storage parameters, or adding explicit `ANALYZE` to deployment pipelines after large data loads.

---

### Q3 — Index vs Seq Scan
**Interviewer asks:** "You added an index on the status column but EXPLAIN still shows Seq Scan. Why?"

**Hruday's answer:**
> The planner deliberately chose the Seq Scan. This happens in one of two scenarios.
>
> First: the query is not selective enough. If `WHERE status = 'SHIPPED'` matches 40% of the rows in the table, it's actually faster to do a sequential scan than to randomly jump around the index for 40% of a 10-million-row table — sequential reads from disk are much faster than random reads. The planner calculates the cost of both plans and chooses the cheaper one.
>
> Second: the index is on a column with very low cardinality — a boolean column or a status column with only 3 values. If your WHERE clause matches a large fraction of the data, the index provides no benefit. The rule is: an index is only useful when it's selective, meaning it filters down to a small percentage of rows.
>
> If the query IS selective (filtering to < 5% of rows) but still shows Seq Scan, the statistics may be stale — the planner underestimates how many rows match and mistakenly thinks the filter is not selective. Run `ANALYZE` and check again. If it still picks Seq Scan with fresh statistics, the planner is probably right.

---

### Q4 — System Design Scenario
**Interviewer asks:** "A payment dashboard query runs in 50ms in dev, 45 seconds in production. Walk me through diagnosing this."

**Hruday's answer:**
> The 900x gap between dev and prod almost always points to one of three things: data scale difference, missing index, or N+1.
>
> Step one: confirm the scale difference. Dev has 10,000 rows; prod has 100 million. A query that does a Seq Scan takes 1ms on 10K rows and 10 seconds on 100M rows. This alone can explain the gap.
>
> Step two: run EXPLAIN ANALYZE in prod with a representative query parameter. Check immediately: Seq Scan or Index Scan? If Seq Scan on a 100M row table — find the WHERE and JOIN columns and add the missing composite index.
>
> Step three: check for N+1. Look at the application logs — is this one query or is the framework issuing 50,000 queries for a merchant's transactions? If 45 seconds comes from 10,000 queries each taking 4.5ms, adding an index to one query won't help — you need JOIN FETCH or a rewritten query.
>
> Step four: look at the WHERE clause for range conditions. `WHERE created_at > '2026-01-01'` on a column with no index does a full scan. The fix is a composite index on (merchant_id, created_at) for this query.
>
> In my experience at Oracle, the fix was almost always a composite index on the FK column + date range column. The most important lesson: never test performance queries only against small dev datasets.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "EXPLAIN is enough" | "Run EXPLAIN to see if it uses the index" | "EXPLAIN without ANALYZE shows the planner's ESTIMATE — it might say 'rows=5' but actually return 5,000. EXPLAIN ANALYZE actually runs the query and shows real timing and real row counts. Always use EXPLAIN ANALYZE in development and on a read replica in production. EXPLAIN alone is a starting point, not a diagnosis." |
| "Seq Scan is always bad" | "Any Seq Scan means I need to add an index" | "Seq Scan on a 500-row table is the CORRECT plan — a B-Tree lookup on a tiny table is slower than just reading all 500 rows. Seq Scan is a problem only when the table is large AND the query is selective. The planner knows this. Trust it — but verify with actual row count vs estimate. A Seq Scan on 10M rows for a query that should return 50 rows IS a problem. On a 1,000-row config table it is not." |
| "Join always causes N+1" | "JPA lazy loading causes N+1 on every join" | "N+1 is caused by ACCESSING a lazy collection in a loop, not by lazy loading itself. If you only access the parent entity and never iterate its lazy collections, no N+1 occurs. The fix is not to make everything EAGER (that causes SELECT * with all relationships on every query) but to use JOIN FETCH or @EntityGraph ONLY for the specific query where you know you'll need the children. Blanket EAGER fetching is often worse than N+1 for entities with many relationships." |
| "Always use query hints" | "I force the database to use an index with a hint" | "Query hints that force index use can work short-term but backfire as data distribution changes. Prefer giving the planner correct statistics (ANALYZE), correct index design, and correct query structure. Reserve hints for edge cases where you've proven the planner consistently makes the wrong choice even with fresh statistics — and document why. Forcing an index on a column that's no longer selective after 6 months of data growth will make the query SLOWER than a Seq Scan." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, a financial line-item report started timing out in production after we added a new fiscal year's data. I ran EXPLAIN ANALYZE and saw `Seq Scan on gl_entries (rows=80000000 width=...)` — the entire general ledger table for the year, no index. The query filtered by company_code and fiscal_year. I added a composite index on (company_code, fiscal_year, account_code) and the plan changed to an Index Scan immediately — from 40 seconds to 200ms. The lesson stuck: always run EXPLAIN ANALYZE before release, and always test queries against a data snapshot at production scale."

---

## 8. Scale Evolution

**Single service, < 1M rows:** EXPLAIN ANALYZE is a development practice. Slow queries in dev are caught and fixed before deployment. N+1 caught by `show-sql: true`.

**Multiple services, 10M-100M rows:** Slow query logging enabled in production (log_min_duration_statement = 50ms). DBA or developer monitors pg_stat_statements view to find expensive queries across the fleet. Covering indexes for top-10 queries.

**High-traffic production, billions of rows:** Dedicated query performance review process: every new query must be reviewed with EXPLAIN output against a staging copy of production data before deployment. pg_stat_statements integrated with monitoring dashboards. Planned autovacuum strategies for hot tables. Read replicas (secondary) used for EXPLAIN ANALYZE runs to avoid impact on primary.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Slow query logs on payment transaction tables directly impact settlement latency. Query optimization is a first-principles skill for database engineers. | "Given this EXPLAIN output with a Seq Scan, what's your diagnosis and fix?" |
| Swiggy / Meesho | ORM-generated N+1 queries on order listing APIs are a real production issue. Catching N+1 before production is a standard expectation. | "How would you catch and prevent N+1 query issues in a Spring Boot application?" |
| Adobe / Microsoft | Analytics dashboards on billions of events require validated query plans. EXPLAIN ANALYZE is standard practice in design review. | "How do you ensure a new analytics query will perform at production data scale?" |
| SAP Labs (current) | SAP ERP Oracle queries are complex multi-table joins. Understanding EXPLAIN PLAN (Oracle syntax) and identifying missing indexes in custom developments is a core skill for Oracle database module work. | "Why is this Oracle query doing a FULL TABLE ACCESS despite an index existing on the filter column?" |

---

## 10. Related Topics — What to Study Next

- **Topic 87 — Indexing** — EXPLAIN is useless without knowing what indexes to add; read together to go from diagnosis to solution
- **Topic 89 — Database Normalization** — poorly normalised schemas force multi-table joins that are harder to optimize; understanding schema design informs query design
- **Topic 95 — Isolation Levels** — long-running queries and lock contention show up in EXPLAIN as long wait times; isolation level affects this
- **Topic 91 — Replication** — running EXPLAIN ANALYZE on a read replica mirrors production load without impacting the primary; an operational best practice at scale

---

*Part 5 · Query Optimization — EXPLAIN Plan, Slow Query Analysis · Full Stack Interview Guide · Hruday D · 2026*
