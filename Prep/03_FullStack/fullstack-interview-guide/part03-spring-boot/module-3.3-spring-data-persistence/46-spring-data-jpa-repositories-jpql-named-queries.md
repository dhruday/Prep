# Spring Data JPA — Repositories, JPQL, Named Queries
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Spring Data JPA generates repository implementations at startup — you define an interface, Spring creates the implementation
- `JpaRepository<Entity, ID>` gives you `save()`, `findById()`, `findAll()`, `delete()`, pagination, sorting — for free
- **Derived query methods**: method names like `findByEmailAndStatus(email, status)` are parsed by Spring Data and converted to JPQL automatically
- **@Query** with JPQL: write your own queries when derived methods aren't flexible enough — uses entity field names, NOT SQL column names
- **@Query(nativeQuery=true)**: raw SQL — use when JPQL can't express what you need (e.g., DB-specific functions)
- Gap to bridge: understanding when to use derived queries vs `@Query` vs native SQL, and the N+1 problem that comes with lazy loading

---

## 1. One-Line Definition
Spring Data JPA eliminates boilerplate DAO code by generating `JpaRepository` implementations at startup from your interface definition, query method names, and `@Query` annotations.

---

## 2. The Problem It Solves

Before Spring Data, writing a repository for `Order` meant: write an interface, write a class that implements it, inject `EntityManager`, write `em.persist()` for save, `em.find()` for find by ID, `em.createQuery("SELECT o FROM Order o WHERE o.status = :status")` for custom queries, and handle the transaction boundary manually.

For every entity — `Order`, `Product`, `User`, `Payment` — you wrote the same boilerplate 50-100 times.

Spring Data JPA asks: what is the minimum you need to define? Just the data shape (the entity class) and the query contract (the interface method signature). Spring generates the implementation at startup. Instead of 80 lines of boilerplate, you write 5 lines:

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByCustomerEmailAndStatus(String email, OrderStatus status);
}
```

Spring reads this method name, parses it as "find Order records where customerEmail = ? AND status = ?", generates the JPQL, and creates the implementation. Zero SQL written, zero class files to maintain.

---

## 3. How It Works Internally

### The Mental Model
Think of Spring Data as a translator. You write your query in English — `findByEmailAndCreatedDateAfter(email, date)`. Spring Data is the translator who reads your English, understands your intent, and writes the JPQL (database English) for you. When the query is complex English, you write your own JPQL using `@Query` and Spring just runs it for you.

### The Mechanism — Step by Step

1. **Interface detection** — At startup, Spring Data's `JpaRepositoriesAutoConfiguration` scans for interfaces that extend `Repository` or `JpaRepository`. It finds all your repository interfaces.

2. **Repository factory creates proxy** — For each interface, Spring Data creates a JDK dynamic proxy (since your interface is, well, an interface). The proxy is the implementation. It is registered as a Spring bean.

3. **Query method parsing** — For each method on the interface, Spring Data parses the name. It reads the `find...By` prefix, then parses the criteria from the remaining words using a keyword mapping: `And`, `Or`, `Between`, `Like`, `In`, `GreaterThan`, `OrderBy`, `IgnoreCase`, etc. It generates JPQL from the parse tree.

4. **@Query methods** — Methods annotated with `@Query` use the provided JPQL (or native SQL) directly. Spring Data still wraps them in the same proxy — no special handling needed.

5. **Execution** — When a method is called, the proxy invokes the generated or provided query via JPA's `EntityManager`. It handles parameter binding, result mapping, pagination, sorting, and optional wrapping (`Optional<T>`).

6. **Pagination and sorting** — Pass `Pageable` or `Sort` as a parameter and Spring Data builds the appropriate SQL with `LIMIT`/`OFFSET` or `ORDER BY`. The `Page<T>` return type includes the total count query automatically.

### Query Method Keyword Reference

```
findBy / readBy / getBy / queryBy      → SELECT
countBy                                → SELECT COUNT
existsBy                               → EXISTS
deleteBy / removeBy                    → DELETE

Criteria keywords:
  And, Or                              → AND / OR
  Between                              → BETWEEN x AND y
  LessThan, GreaterThan               → < / >
  Like, NotLike                        → LIKE %value%
  In, NotIn                            → IN (...)
  IsNull, IsNotNull                    → IS NULL / IS NOT NULL
  OrderBy[column]Asc/Desc             → ORDER BY
  IgnoreCase                           → LOWER(column) = LOWER(value)
  True, False                          → = true / = false
  Top3, First5                         → LIMIT 3 / LIMIT 5
```

### ASCII Diagram

```
Spring Data JPA — Repository Generation at Startup
───────────────────────────────────────────────────────────────────────
  Your Code
  ┌─────────────────────────────────────────────────────────────────┐
  │  public interface OrderRepository extends JpaRepository<Order, Long> {
  │      List<Order> findByCustomerEmailAndStatus(String, OrderStatus);
  │      @Query("SELECT o FROM Order o WHERE o.amount > :min")
  │      List<Order> findHighValueOrders(@Param("min") BigDecimal min);
  │  }
  └─────────────────────────────────────────────────────────────────┘
                          |
                          v
  Spring Data JPA Factory (at startup)
  ┌─────────────────────────────────────────────────────────────────┐
  │  1. Parse method name: "findByCustomerEmailAndStatus"           │
  │     → "find" + "By" + "CustomerEmail" (field) + "And"          │
  │       + "Status" (field)                                        │
  │     → generates JPQL:                                           │
  │       "SELECT o FROM Order o WHERE o.customerEmail = ?1         │
  │        AND o.status = ?2"                                       │
  │                                                                 │
  │  2. @Query method: use provided JPQL as-is                      │
  │     → "SELECT o FROM Order o WHERE o.amount > :min"             │
  │                                                                 │
  │  3. Create JDK proxy implementing OrderRepository               │
  │  4. Register proxy as a Spring bean                             │
  └─────────────────────────────────────────────────────────────────┘
                          |
                          v
  Runtime — OrderService calls orderRepository.findByCustomerEmailAndStatus(...)
  ┌─────────────────────────────────────────────────────────────────┐
  │  Proxy intercepts call → binds parameters → executes via        │
  │  EntityManager.createQuery(jpql).setParameter(...).getResultList│
  │  → maps ResultSet to List<Order>                                │
  └─────────────────────────────────────────────────────────────────┘
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Writing JPQL that accesses database column names instead of entity field names
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // WRONG: JPQL uses entity class field names, NOT database column names
    // The entity field is named "customerEmail" (camelCase)
    // The DB column might be "customer_email" (snake_case)
    // Using the DB column name in JPQL throws: "could not resolve property: customer_email"
    @Query("SELECT o FROM Order o WHERE o.customer_email = :email") // WRONG
    List<Order> findByEmail(@Param("email") String email);
}
```
> **Why this fails in production:** JPQL operates on JPA entity objects and their field names. It does not know about database column names — that mapping is handled by `@Column(name="customer_email")` on the entity. Always use entity field names in JPQL, not column names.

### Right Way — Production Quality
```java
// Entity — defines the structure and mapping
@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "customer_email", nullable = false)
    private String customerEmail; // JPQL uses "customerEmail" — this field name

    @Enumerated(EnumType.STRING) // store the enum name as string, not ordinal (position)
    @Column(nullable = false)
    private OrderStatus status;

    @ManyToOne(fetch = FetchType.LAZY) // lazy loading — DO NOT change to EAGER without reason
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // constructors, getters, setters...
}
```

```java
// Repository — clean, readable, with appropriate methods for each use case
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Derived query — simple, readable, auto-generated JPQL
    // Use when the query is simple and the method name expresses it clearly
    List<Order> findByCustomerEmail(String customerEmail);

    // Multi-criteria derived query
    List<Order> findByCustomerEmailAndStatus(String customerEmail, OrderStatus status);

    // With sorting
    List<Order> findByStatusOrderByCreatedAtDesc(OrderStatus status);

    // Pagination — essential for any list endpoint that can return many results
    // Returns: Page<Order> which includes the results AND total count AND page info
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    // Custom JPQL — when derived method name would be too long or unclear
    // Use entity field names (customerEmail, NOT customer_email)
    @Query("SELECT o FROM Order o WHERE o.amount > :minAmount AND o.status = :status")
    List<Order> findHighValueOrders(
        @Param("minAmount") BigDecimal minAmount,
        @Param("status") OrderStatus status
    );

    // JPQL with JOIN FETCH — the fix for the N+1 problem
    // Without JOIN FETCH: fetching 100 orders → 100 separate queries for products
    // With JOIN FETCH: fetching 100 orders + products in ONE query
    @Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.product WHERE o.customerEmail = :email")
    List<Order> findByCustomerEmailWithProducts(@Param("email") String email);

    // Native SQL — only when JPQL cannot express what you need
    // Example: calling a DB-specific function, using window functions (ROW_NUMBER)
    @Query(
        value = "SELECT * FROM orders WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())",
        nativeQuery = true  // raw SQL — NOT JPQL
    )
    List<Order> findCurrentMonthOrders();

    // Check existence without loading the entity
    boolean existsByCustomerEmailAndStatus(String customerEmail, OrderStatus status);

    // Count without loading entities
    long countByStatus(OrderStatus status);

    // Custom delete with a condition
    @Modifying  // REQUIRED for UPDATE/DELETE JPQL queries
    @Transactional // REQUIRED for @Modifying queries
    @Query("DELETE FROM Order o WHERE o.status = :status AND o.createdAt < :before")
    int deleteOldCompletedOrders(@Param("status") OrderStatus status,
                                 @Param("before") LocalDateTime before);
}
```

```java
// Service using the repository correctly
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    // Always paginate list endpoints — never return unbounded lists
    public Page<Order> getOrdersByStatus(OrderStatus status, int page, int size) {
        // Pageable: page number (0-indexed) + size + optional sort
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return orderRepository.findByStatus(status, pageable);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does Spring Data JPA's derived query mechanism work? How does it generate SQL?"

**Hruday's answer:**
> Spring Data JPA reads the method name and parses it following a well-defined convention. The method name encodes both the intent (find, count, delete, exists) and the criteria (the fields and conditions).
>
> Take `findByCustomerEmailAndStatusOrderByCreatedAtDesc`. Spring Data parses: `find` → SELECT, `By` → WHERE clause starts, `CustomerEmail` → entity field `customerEmail`, `And` → AND, `Status` → entity field `status`, `OrderBy` → ORDER BY, `CreatedAt` → field `createdAt`, `Desc` → descending.
>
> It generates JPQL: `SELECT o FROM Order o WHERE o.customerEmail = ?1 AND o.status = ?2 ORDER BY o.createdAt DESC`.
>
> At startup, Spring Data reads all method names on your repository interfaces, parses them, validates that the referenced fields exist on the entity (throws at startup if not — which is good, catches typos early), generates JPQL strings, and keeps them ready. At runtime, it just binds parameters and executes.
>
> When a derived method name would be too long or unclear — like 4+ criteria joined with And/Or — switch to `@Query` with explicit JPQL. The readability benefit of derived methods disappears past 2-3 criteria.

---

### Q2 — Deep Dive  
**Interviewer asks:** "What is the N+1 problem in Spring Data JPA and how do you fix it?"

**Hruday's answer:**
> The N+1 problem is one of the most common performance issues in JPA applications. It happens with lazy-loaded associations.
>
> Say `Order` has a `@ManyToOne(fetch=LAZY)` relationship to `Product`. When you call `orderRepository.findAll()` and get 100 orders, Hibernate runs ONE query for the orders. Then, when your code accesses `order.getProduct()` for each order, Hibernate lazily runs ANOTHER query for each product. 100 orders = 1 + 100 = 101 SQL queries. At 1000 orders, it is 1001 queries. This is invisible in dev but catastrophic in production.
>
> There are two fixes. First and most targeted: JOIN FETCH in JPQL. Add a `@Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.product WHERE ...")` method. JOIN FETCH tells Hibernate to load orders and their products in a single SQL JOIN — one query total.
>
> Second: EntityGraph. Use `@EntityGraph(attributePaths = {"product"})` on a repository method to declare which associations to eagerly fetch for that specific query method.
>
> What NOT to do: do not change the entity's `fetch=LAZY` to `fetch=EAGER`. This makes the association ALWAYS eagerly loaded — even when you don't need the product. You trade N+1 for unnecessary data in every query. EAGER is almost always wrong for `@ManyToOne`.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use native SQL (@Query(nativeQuery=true)) instead of JPQL?"

**Hruday's answer:**
> JPQL is the right default because it is database-agnostic — the same JPQL runs on PostgreSQL, MySQL, and H2. Hibernate translates it to the right dialect.
>
> Use native SQL when JPQL cannot express what you need. Three real cases.
>
> First: database-specific functions. PostgreSQL's `to_tsvector()` for full-text search, or `pg_trgm` for fuzzy matching — JPQL has no equivalent. Native SQL is the only option.
>
> Second: window functions. `ROW_NUMBER() OVER (PARTITION BY...)`, `RANK()`, `LAG()` — JPQL does not support window functions. Native SQL does.
>
> Third: extreme performance optimization. The JPQL-to-SQL translation can sometimes produce inefficient SQL for complex queries. In a critical path query, a hand-written SQL with specific index hints is sometimes necessary.
>
> The trade-off: native SQL ties your code to a specific database. If you ever change databases (rare but it happens), native queries break. Also, native queries cannot use entity field names — you use actual column names. This can cause silent bugs if you rename database columns.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the data access layer for an order management system where orders can have multiple products. Performance is critical — the system processes 50,000 orders per day."

**Hruday's answer:**
> With this volume, the N+1 problem would kill us immediately, so every association must be carefully designed.
>
> For the entity model: `Order` has `@OneToMany(fetch=LAZY)` to `List<OrderItem>`. `OrderItem` has `@ManyToOne(fetch=LAZY)` to `Product`. All lazy — we never accidentally load a full product catalog when we just want order summaries.
>
> For the repository, I write purpose-specific query methods for different use cases. For the order list API (shows order summaries — no products), use a plain `findByStatus(status, pageable)`. For the order detail API (shows full product list), use `@Query("SELECT DISTINCT o FROM Order o JOIN FETCH o.items i JOIN FETCH i.product WHERE o.id = :id")` — one query for the full detail.
>
> For reporting (daily order totals), use a native SQL query with `DATE_TRUNC` aggregation rather than loading 50,000 order entities into memory and computing in Java.
>
> For writes, `@Transactional` on the service method. `orderRepository.save()` for the order. `orderItemRepository.saveAll()` for the items in batch — avoid saving items one at a time in a loop (that is another N+1 variant, this time for INSERT).
>
> For the most queried patterns (orders by customer, orders by status), I add database indexes on those columns. Spring Data repository method names drive the index decisions.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "JPQL uses table/column names" | "My @Query uses customer_email (column name)" | "JPQL uses entity field names. customer_email is the DB column. The entity field is customerEmail. Using customer_email in JPQL throws 'could not resolve property' at startup. Always use entity field names in JPQL." |
| "fetchType=EAGER prevents N+1" | "Set EAGER and the problem goes away" | "EAGER makes it worse in many cases — every query that loads the entity also loads the association, even when you don't need it. 1000 orders × 5 EAGER associations = massive data loading. Use LAZY everywhere and JOIN FETCH where you need related data." |
| "@Modifying without @Transactional" | "It works without @Transactional" | "No. @Modifying queries (UPDATE/DELETE) require an active transaction to execute. Without @Transactional on the method or its caller, JPA throws 'javax.persistence.TransactionRequiredException'. Always add @Transactional to @Modifying repository methods." |
| "Returning List from a paginated endpoint" | "List is fine for small datasets" | "If 'small' can grow, paginate from day one. A List<Order> endpoint returns ALL orders. If there are 100,000 orders in the table, you load all of them into memory. A Pageable parameter + Page<T> return is always the right choice for list endpoints." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we had an order list API that performed fine at launch with 5,000 orders but became increasingly slow over 6 months as orders grew to 80,000. The `findAll()` call was loading all 80,000 entities plus their lazy associations triggered in the loop — resulting in 80,000 + N additional queries. We converted it to a paginated `findAll(Pageable)` call, added JOIN FETCH for the associations we needed, and added a database index on the `status` and `created_at` columns. The query went from 18 seconds to under 200ms for any page size. That fix taught me: design for scale from the first line of repository code."

---

## 8. Scale Evolution

**1,000 users →** Default Spring Data JPA with no pagination improvements. findAll() returns manageable result sets. N+1 might be present but with small data, it is invisible. No immediate problem.

**100,000 users →** Pagination is now critical — list endpoints must use `Pageable`. N+1 starts causing slow queries visible in APM tools. Add `JOIN FETCH` queries for the hot paths. Add database indexes on frequently queried columns. Enable Hibernate's `show-sql: true` in staging to catch N+1 queries before they reach production.

**10 million users →** At this scale, JPA's write-through cache (first-level cache, the Hibernate Session) becomes a concern for batch operations — loading millions of rows into the JPA session causes memory pressure. Use projection interfaces (`interface OrderSummary { Long getId(); String getStatus(); }`) to load only the fields you need, not full entities. For bulk inserts, bypass JPA entirely and use `JdbcTemplate.batchUpdate()` — JPA's insert overhead (dirty tracking, event firing) adds up in bulk scenarios.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction and payment record queries must be fast and correct. N+1 on payment records could stall financial reporting. | "Show me the repository layer for a payment service — how do you fetch payments with their associated orders without N+1?" |
| Swiggy / Meesho | High-volume order data. They care about paginated queries, efficient aggregations, and correct indexing strategies. | "An order list endpoint is slow with 1M orders. Walk me through diagnosing and fixing it." |
| Adobe / Microsoft | Complex enterprise data models with deep entity graphs. They care about lazy loading correctness and projection usage. | "You have a @OneToMany with 500 child records. How would you efficiently load them for a detail API vs a list API?" |
| Remote / Global roles | Spring Data JPA is in every Spring Boot backend. N+1 and pagination are near-universal interview topics. | "What is the difference between @Query with JPQL and nativeQuery=true? When would you use each?" |

---

## 10. Related Topics — What to Study Next

- **Topic 47 — ORM Pitfalls (N+1 Problem, Lazy Loading, Fetch Strategies)** — this topic is the deep dive into the N+1 problem that Spring Data JPA's default lazy loading causes
- **Topic 44 — @Transactional Internals** — Spring Data repositories work within the transaction context — understanding transaction propagation is essential for correct multi-repository operations
- **Topic 48 — HikariCP Connection Pooling** — every database query uses a connection from HikariCP — know how pool exhaustion happens and how to size it
- **Topic 88 — Query Optimization (EXPLAIN plan)** — the SQL that JPQL generates can be inefficient — understanding EXPLAIN plan lets you verify what your repository methods actually do at the DB level
- **Topic 50 — Optimistic vs Pessimistic Locking** — Spring Data JPA entities support both locking strategies to handle concurrent modifications

---

*Part 3 · Spring Data JPA · Full Stack Interview Guide · Hruday D · 2026*
