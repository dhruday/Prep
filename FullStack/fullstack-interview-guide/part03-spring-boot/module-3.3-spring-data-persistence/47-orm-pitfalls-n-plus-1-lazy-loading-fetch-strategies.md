# ORM Pitfalls — N+1 Problem, Lazy Loading, Fetch Strategies
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **N+1 problem**: loading 100 entities triggers 100 EXTRA queries for their lazy associations — 101 queries instead of 1
- **Lazy loading** (default) = association not loaded until accessed. Fine for single-entity fetches. Deadly in loops.
- **Eager loading** (EAGER) = association always loaded. Convenient but causes data overloading on every query, even when you don't need the association
- **Fix**: `JOIN FETCH` in JPQL — loads entity + association in ONE SQL statement
- **Second fix**: `@EntityGraph` — declares which associations to load eagerly for a specific query without changing the entity's default fetch type
- Gap to bridge: understanding that N+1 is SILENT (no error, no warning) — it only shows up as slow queries in production. You MUST use SQL logging in dev to detect it early

---

## 1. One-Line Definition
ORM pitfalls are performance and correctness problems that come from how JPA lazily loads associations — most critically the N+1 query problem where one list fetch silently triggers N additional database round-trips.

---

## 2. The Problem It Solves (and The Problem It Creates)

JPA's lazy loading was designed to solve a real problem: you should not load an entire object graph when you only need the root entity. If you load 1000 orders for a monthly report, you do not want: each order loading its customer, each customer loading their address, each address loading the country. That would be enormous.

But lazy loading creates its own trap: the N+1 problem.

You load 1000 orders. Then in a loop, your code calls `order.getCustomer().getName()` for a display. JPA has been lazy — `customer` was never loaded. So for EACH order, JPA runs a separate SQL query: `SELECT * FROM customers WHERE id = ?`. That is 1000 extra queries. With 10,000 orders, it is 10,000 queries. With a 5ms network round-trip per query, that is 50 seconds of pure network time — before any computation.

The insidious part: no exception is thrown. No warning is logged. The application returns the correct answer — just 50 seconds late. In development with 20 rows of test data, it takes milliseconds and you never notice. In production with 10,000 rows, it brings the service to a crawl.

---

## 3. How It Works Internally

### The Mental Model
Think of JPA entity loading like a shopping trip. When you buy an order entity, JPA gives you the order box. The customer field is a "IOU" slip inside the box — "I'll get the customer data when you open this compartment." Every time you open that compartment (call `getCustomer()`), JPA makes a separate trip to the store. If you have 100 orders and open each customer compartment, that is 100 separate store trips — when one big trip with a list of all 100 customer IDs would have been far more efficient.

### Fetch Types

**LAZY** (default for `@OneToMany` and `@ManyToMany`): The associated data is NOT loaded when the parent entity is loaded. A proxy placeholder is created. When you first access the association (`order.getItems()`), Hibernate runs a SQL query to load it. This is called "on-demand" loading.

**EAGER** (default for `@ManyToOne` and `@OneToOne`): The associated data IS loaded immediately when the parent entity is loaded. Hibernate adds a JOIN to the SQL. Every query that loads the parent also loads the association.

### Why EAGER is Often Worse

Counter-intuitively, changing `@OneToMany` to `EAGER` does NOT fix N+1 — it makes it worse in a different way. With EAGER, every query that loads orders ALSO loads all items for those orders — even when you only need order IDs. The data overloading is constant, not per-access.

Hibernate also has EAGER collection loading behaviour: if you load multiple orders and each has EAGER items, Hibernate uses the "IN" clause with a large item collection query. This can cause `MultipleBagFetchException` when you try to eagerly fetch multiple collections at once.

### The N+1 Problem in Detail

```
Order entity: @OneToMany(fetch=LAZY) to List<OrderItem>

Code:
  List<Order> orders = orderRepository.findAll();  // Query 1: SELECT * FROM orders
  for (Order order : orders) {
    int count = order.getItems().size(); // Query 2...N+1: SELECT * FROM order_items WHERE order_id = ?
  }

SQL executed:
  Query 1: SELECT * FROM orders   (1 query)
  Query 2: SELECT * FROM order_items WHERE order_id = 1  (1 for order #1)
  Query 3: SELECT * FROM order_items WHERE order_id = 2  (1 for order #2)
  ...
  Query N+1: SELECT * FROM order_items WHERE order_id = N  (1 for last order)

Total: 1 + N queries for N orders.
```

### Fix 1 — JOIN FETCH

```sql
-- JPQL: JOIN FETCH loads order and items in ONE query
SELECT DISTINCT o FROM Order o JOIN FETCH o.items WHERE ...

-- Translates to SQL:
SELECT DISTINCT o.*, oi.* FROM orders o
INNER JOIN order_items oi ON oi.order_id = o.id
WHERE ...
-- ONE query loads all orders and all their items
```

### Fix 2 — EntityGraph

`@EntityGraph` tells Spring Data which associations to eagerly load FOR THIS SPECIFIC QUERY METHOD, without changing the entity's default fetch type. Other queries are unaffected.

### Fix 3 — Batch Fetching (Hibernate-specific)
`@BatchSize(size=50)` on a collection tells Hibernate: when lazy loading this collection, load it in batches of 50 using `SELECT ... WHERE order_id IN (...)`. Reduces N queries to N/50 queries while keeping lazy loading behaviour.

### ASCII Diagram

```
WITHOUT JOIN FETCH — N+1 Problem
──────────────────────────────────────────────────────────────────────
  findAll() → SELECT * FROM orders               [1 query — 100 rows]
  loop:
    order[1].getItems() → SELECT * FROM order_items WHERE order_id=1  [query 2]
    order[2].getItems() → SELECT * FROM order_items WHERE order_id=2  [query 3]
    ...
    order[100].getItems() → ...                                       [query 101]

  Total: 101 queries for 100 orders.

WITH JOIN FETCH — 1 query total
──────────────────────────────────────────────────────────────────────
  findAllWithItems() →
    SELECT DISTINCT o.*, oi.*
    FROM orders o
    INNER JOIN order_items oi ON oi.order_id = o.id
                                                    [1 query — all data in one pass]
  Java in-memory: Hibernate assembles Order objects with their List<OrderItem>

  Total: 1 query for 100 orders with all their items.
──────────────────────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// This code has a N+1 problem — invisible in dev, catastrophic in prod
@Service
public class OrderReportService {

    @Transactional(readOnly = true)
    public List<OrderSummaryDto> generateReport() {
        List<Order> orders = orderRepository.findAll(); // 1 query loads N orders

        return orders.stream()
            .map(order -> {
                // DANGER: order.getItems() triggers a lazy load query for EACH order
                // 100 orders = 100 extra queries here
                int itemCount = order.getItems().size(); // N+1 QUERY HERE
                BigDecimal total = order.getItems().stream()
                    .map(OrderItem::getPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add); // uses same lazy-loaded data
                return new OrderSummaryDto(order.getId(), itemCount, total);
            })
            .collect(Collectors.toList());
    }
}
```
> **Why this fails in production:** With 10,000 orders, this generates 10,001 SQL queries. If each round-trip is 2ms, that is 20 seconds of query time for a report. No error is thrown — the code "works" correctly, just impossibly slowly.

### Right Way — Production Quality
```java
// Entity — always use LAZY by default, use JOIN FETCH where needed
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(
        fetch = FetchType.LAZY,  // LAZY is the correct default — always start here
        mappedBy = "order",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<OrderItem> items = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)  // even @ManyToOne should be LAZY
    @JoinColumn(name = "customer_id")
    private Customer customer;
}
```

```java
// Repository — FIX 1: JOIN FETCH — explicit association loading
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Use when you NEED items for all orders — eliminates N+1
    // DISTINCT is required with JOIN FETCH for @OneToMany to avoid duplicate orders in result
    @Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.items WHERE o.status = :status")
    List<Order> findByStatusWithItems(@Param("status") OrderStatus status);

    // Use when you ONLY need order summary data — no items loaded at all
    // Faster because it never touches order_items table
    @Query("SELECT o FROM Order o WHERE o.status = :status")
    Page<Order> findByStatus(@Param("status") OrderStatus status, Pageable pageable);

    // FIX 2: EntityGraph — declarative fetch plan attached to a method
    // Loads 'items' eagerly for THIS method only — entity default (LAZY) is unchanged
    @EntityGraph(attributePaths = {"items", "customer"}) // load items AND customer in one query
    Optional<Order> findWithDetailsById(Long id);
}
```

```java
// FIX 3: Projections — when you only need SOME fields, not the entire entity
// This avoids loading full entity objects into JPA session (saves memory + GC pressure)
public interface OrderSummary {
    Long getId();
    OrderStatus getStatus();
    // Spring Data generates a SELECT id, status FROM orders query — no other columns loaded

    // Derived properties using @Value and SpEL — computed from multiple fields
    @Value("#{target.firstName + ' ' + target.lastName}")
    String getFullName();
}

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Returns only id + status — not full Order entities
    List<OrderSummary> findProjectedByCustomerEmail(String email, Class<OrderSummary> type);
}
```

```java
// The report service — now with JOIN FETCH
@Service
public class OrderReportService {

    private final OrderRepository orderRepository;

    public OrderReportService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public List<OrderSummaryDto> generateReport(OrderStatus status) {
        // ONE query loads all orders + items together
        List<Order> orders = orderRepository.findByStatusWithItems(status);

        return orders.stream()
            .map(order -> {
                // order.getItems() uses already-loaded data — NO extra queries
                int itemCount = order.getItems().size();
                BigDecimal total = order.getItems().stream()
                    .map(OrderItem::getPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                return new OrderSummaryDto(order.getId(), itemCount, total);
            })
            .collect(Collectors.toList());
        // Total: 1 query for any number of orders
    }
}
```

### Configuration — Detecting N+1 in Development
```yaml
# application.yml — always enable SQL logging in dev/staging
spring:
  jpa:
    show-sql: true  # logs every SQL statement
    properties:
      hibernate:
        format_sql: true       # readable formatted SQL
        generate_statistics: true  # logs stats including query count per session

logging:
  level:
    org.hibernate.SQL: DEBUG         # shows each SQL query
    org.hibernate.type: TRACE        # shows parameter bindings
    org.hibernate.stat: DEBUG        # shows statistics including query count
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the N+1 problem? Have you seen it in production?"

**Hruday's answer:**
> The N+1 problem is when JPA's lazy loading turns one database query into N+1 queries — one for the main entity and then one for each associated entity in a loop.
>
> A typical example: loading 100 orders and then accessing each order's customer in a loop. Each `order.getCustomer()` call is a lazy load — Hibernate runs `SELECT * FROM customers WHERE id = ?` for every order. 100 orders = 101 queries instead of 1.
>
> What makes it dangerous is the silence — no error, no warning. The code returns correct results, just slowly. In development with 10 rows of test data it takes milliseconds. In production with 10,000 rows it takes 20+ seconds.
>
> At Oracle, we had a monthly report that loaded orders and accessed their items in a loop. Fine with 200 orders during testing. A disaster at month-end with 8,000 orders — the report timed out. We fixed it with a JOIN FETCH query and the report went from timeout to 150ms.

---

### Q2 — Deep Dive
**Interviewer asks:** "What are all the ways to solve the N+1 problem in JPA? Compare them."

**Hruday's answer:**
> There are four main approaches, each with different trade-offs.
>
> First: JOIN FETCH. Write a JPQL query with `JOIN FETCH o.items`. This loads the entity and its association in one SQL JOIN. It is the most efficient, but it is query-specific — you write a dedicated query method in your repository for each use case that needs the join. Best for targeted hot-path queries.
>
> Second: EntityGraph. Declare `@EntityGraph(attributePaths={"items"})` on a repository method. Spring Data adds the JOIN at the JPA metadata level for that method. Cleaner than modifying JPQL — reads like configuration — and keeps the entity's default fetch type unchanged. Best when multiple repository methods need the same association loaded.
>
> Third: Batch fetching. Add `@BatchSize(size=50)` on the collection in the entity. Instead of N individual queries, Hibernate groups lazy loads into batches of 50 using IN clauses. Reduces 1000 queries to 20. Does not require changing repository code — just entity configuration. Best as a safety net when you cannot refactor queries immediately.
>
> Fourth: DTO projection. Use a JPQL constructor expression or Spring Data projection interface that selects only the scalar values you need. If you only need counts or totals, skip loading the collection entirely. Best for reporting and aggregation use cases.
>
> My recommendation: use LAZY everywhere by default, then add JOIN FETCH or EntityGraph on the specific repository methods where you know you need the association. Batch size as a fallback. Projection when you only need summary data.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When is it acceptable to use FetchType.EAGER? Give examples."

**Hruday's answer:**
> EAGER is acceptable on small, stable, always-needed associations.
>
> A good example is `@ManyToOne` to a lookup/reference entity. Consider `Order` having a `@ManyToOne` to `OrderType` — an enum-like entity with 5 fixed values (STANDARD, EXPRESS, INTERNATIONAL...). EAGER is acceptable because: the `OrderType` table is tiny (5 rows), you always need the type when you load an order, and there is no meaningful performance cost.
>
> Another acceptable case: `@OneToOne` where the related entity is tiny and always needed together with the parent. A `UserProfile` always loaded with `User` — if the profile row is small, EAGER simplifies the code with minimal cost.
>
> What you should NEVER do: EAGER on `@OneToMany` or `@ManyToMany`. These are collections. EAGER on a collection means every single query that loads the parent also loads the entire collection, joins the result, and builds the collection in memory — regardless of whether you need it. This is the path to `OutOfMemoryError` in production as data grows.
>
> The rule: EAGER for small, finite, always-needed `@ManyToOne` / `@OneToOne` associations. LAZY for everything else — especially collections.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You have a REST endpoint GET /orders that currently runs a findAll() and is now timing out. The table has 500,000 rows. How do you fix it completely?"

**Hruday's answer:**
> This is a multi-layer problem. Let me fix it layer by layer.
>
> First layer: pagination. NEVER return all 500,000 rows in one API call. Add `Pageable` to the repository method — `findAll(Pageable pageable)`. The API now returns one page (e.g., 20 rows) with links to next/previous. This is the biggest win — from loading 500K rows to loading 20.
>
> Second layer: N+1 check. After pagination, check what queries the page of 20 triggers. Enable `show-sql: true`. If each of the 20 orders triggers additional queries for lazy associations, fix with JOIN FETCH or EntityGraph.
>
> Third layer: projection. If the list view only shows order ID, date, status, and total — not the full entity graph — use a projection interface. This makes the SELECT query pull only those 4 columns instead of all 20 columns on the orders table.
>
> Fourth layer: database index. Add an index on the columns used in the WHERE clause and ORDER BY. For orders by status and date: `CREATE INDEX idx_orders_status_created_at ON orders(status, created_at DESC)`.
>
> Fifth layer: caching (if applicable). If the list of orders changes infrequently for certain statuses, cache the first few pages with a short TTL using Spring Cache + Redis.
>
> After all five layers: 500K rows that timed out at 30 seconds should now respond in under 50ms for any page.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "LazyInitializationException cause?" | "Hibernate is buggy" | "LazyInitializationException means you accessed a lazy association AFTER the transaction/session closed. Either open the session again with @Transactional, load the data before the session closes with JOIN FETCH, or use DTOs to project needed data before returning from the transactional method." |
| "DISTINCT in JOIN FETCH" | "It's just for removing duplicates" | "JOIN FETCH with @OneToMany creates a CROSS JOIN in SQL — each order appears once for EACH matching item. 1 order with 3 items = 3 duplicate rows in the result set. DISTINCT in JPQL tells Hibernate to deduplicate in memory after loading, returning 1 Order with 3 items. Without DISTINCT, you get 3 Order objects." |
| "FetchType.EAGER prevents LazyInitializationException" | "Yes, always use EAGER to be safe" | "EAGER on collections adds permanent performance overhead on every query. LazyInitializationException is a design signal: you are accessing data outside a transaction. Fix the transaction boundary — extend the @Transactional scope to cover the access — rather than switching to EAGER." |
| "MultipleBagFetchException" | "Just add JPA annotations differently" | "Hibernate throws this when you JOIN FETCH two separate @OneToMany collections simultaneously. Each collection is a 'bag' (unordered list). Fix: change one List to a Set OR load them sequentially (two separate queries via @EntityGraph) OR use @BatchSize on one collection." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we had a customer support dashboard that loaded support tickets and displayed the associated product name for each. The endpoint was fine at 200 tickets. At 2,000 tickets it was slow. A quick check with `show-sql: true` showed 2001 SQL queries per page load — classic N+1. The fix: one `@Query` with `JOIN FETCH o.product` took the query count from 2001 to 1. That experience changed how I read entity relationship annotations — every `@OneToMany` and `@ManyToOne` I see now, I think about which queries will access it and where I need JOIN FETCH."

---

## 8. Scale Evolution

**1,000 users →** N+1 with small data is invisible — 50 test orders take milliseconds even with 50 extra queries. But the bug IS there. Enable SQL logging in staging and fix N+1 before it reaches production.

**100,000 users →** N+1 causes timeouts on list endpoints under load. Pagination is now a hard requirement — no unbounded list queries. JOIN FETCH becomes mission-critical for any endpoint that accesses associations. Projection interfaces reduce memory usage and improve throughput on summary queries.

**10 million users →** JPA itself becomes a bottleneck for bulk operations. For high-write scenarios (insert 100,000 orders per day), JPA's write overhead (dirty checking, entity lifecycle events, cache invalidation) is measurable. Teams move bulk writes to `JdbcTemplate.batchUpdate()` or Spring Batch. Read-heavy query endpoints use `JdbcTemplate` with manual mapping for maximum performance — no JPA overhead.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial transaction records have deep associations (payment → user → account → bank). N+1 on transaction history queries is a real production risk. | "How would you design the repository layer to load transaction history with associated bank account data efficiently?" |
| Swiggy / Meesho | Order data with items, restaurants, delivery agents — multi-level associations. N+1 can turn a 10ms query into a 10-second timeout. | "A GET /orders endpoint is timing out. Walk me through your complete diagnosis and fix." |
| Adobe / Microsoft | Enterprise apps with complex entity graphs. LazyInitializationException is a very common bug in enterprise JPA code. | "When and why does LazyInitializationException occur? How do you prevent it without switching to EAGER?" |
| Remote / Global roles | N+1 and lazy loading are universal JPA interview topics. Almost every Spring Boot interview includes at least one question on this. | "Explain the N+1 problem and give me three ways to fix it." |

---

## 10. Related Topics — What to Study Next

- **Topic 46 — Spring Data JPA** — repository query methods are where you apply JOIN FETCH and EntityGraph fixes
- **Topic 88 — Query Optimization (EXPLAIN plan)** — after fixing N+1, verify the generated SQL's execution plan — is it using your indexes?
- **Topic 44 — @Transactional Internals** — LazyInitializationException is caused by accessing lazy data after the transaction closes — understanding @Transactional scope prevents it
- **Topic 50 — Optimistic vs Pessimistic Locking** — concurrent access to the same entities can cause both performance problems and correctness issues
- **Topic 48 — HikariCP Connection Pooling** — N+1 means more queries = more connection usage = connection pool pressure — they are deeply connected

---

*Part 3 · ORM Pitfalls — N+1 Problem · Full Stack Interview Guide · Hruday D · 2026*
