# N+1 Query Problem — Detection and Fix
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **The N+1 problem**: load a list of N entities (1 query), then for each entity execute a separate query to fetch related data (N queries) = 1 + N = N+1 total queries; for 100 orders each with lazy-loaded customers: 101 queries instead of 1 or 2 JOINs — API responds in 800ms instead of 45ms
- **JPA/Hibernate root cause**: `@OneToMany` and `@ManyToOne` default to `FetchType.LAZY`; accessing the lazy collection in a loop triggers a new SQL query PER ITEM; Hibernate executes these silently — no warning, no log noise, just slow SQL
- **Detect it**: `spring.jpa.show-sql=true` + `spring.jpa.properties.hibernate.format_sql=true` in dev; count the number of SQL statements logged per API request; datasource-proxy in integration tests to assert `SELECT` count per request
- **Fix 1 — JOIN FETCH**: `@Query("SELECT o FROM Order o JOIN FETCH o.customer WHERE o.id IN :ids")` — one query fetches everything; most efficient for known collections; CANNOT use with `LIMIT/Offset` pagination (Hibernate throws `HHH90003004` warning — use 2 queries instead)
- **Fix 2 — @EntityGraph**: `@EntityGraph(attributePaths = {"customer", "items"})` on repository method — declarative alternative to JPQL JOIN FETCH; works with Spring Data JPA derived queries; easier to read than custom JPQL
- **Fix 3 — @BatchSize**: `@BatchSize(size = 50)` on entity relationship — Hibernate groups lazy loads into batches (`IN (:id1, :id2, ...)`) reducing N queries to `ceil(N/50)`; good incremental fix when JOIN FETCH isn't possible
- ✅ **Hruday's anchor**: Oracle (Capgemini client engagement) — order management API had a 47-query path to load one order page (order + items + each item's product + each item's category + customer + customer's address); JOIN FETCH with @EntityGraph reduced to 2 queries; API response 800ms → 45ms; logged as critical optimization in client performance review

---

## 1. One-Line Definition
The N+1 query problem occurs when code loads N parent records with one query, then executes a separate database query for each of the N records to fetch a related entity — resulting in N+1 total queries where 1-2 queries with a JOIN should suffice.

---

## 2. The Problem It Solves

ORM frameworks like Hibernate/JPA make it easy to write Java code that navigates object relationships naturally. `order.getItems()` looks like a simple getter call — but it's a database query. In a loop over 100 orders, it's 100 database queries.

Each query has overhead:
- Network round-trip to the database (even 1ms × 100 = 100ms)
- Database query parsing and execution
- Connection pool checkout and return
- Result set serialization

For 100 orders: 1 (load orders) + 100 (load each order's items) + 100 (load each item's product) = 201 queries. At 4ms average per query: 800ms. With a JOIN FETCH that loads everything in 2 queries: 8ms.

The insidious part: this code works correctly. The API returns the right data. The test passes. The developer who wrote it didn't notice because they only tested with 10 orders (50ms — acceptable) not 100 orders (800ms — broken in production).

N+1 is the most common backend performance bug in Spring Boot / Hibernate applications. Every senior Java developer has both written N+1 code and fixed it.

---

## 3. How It Works Internally

### Hibernate Lazy Loading Mechanics

```
Order entity:
@Entity
class Order {
  @Id Long id;
  LocalDateTime createdAt;
  String status;
  
  @ManyToOne(fetch = FetchType.LAZY)   // ← Default for @ManyToOne is EAGER, but best practice is LAZY
  Customer customer;
  
  @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)  // ← Default for @OneToMany
  List<OrderItem> items;
}

When you call:  orderRepository.findAll()

Hibernate executes:  SELECT * FROM orders             -- Query 1

Result: List<Order> with customer and items as PROXIES (not loaded yet)
  - order.customer = Hibernate$ProxyCustomer@1a2b3c  (NOT real Customer yet)
  - order.items    = PersistentBag@4d5e6f             (NOT loaded yet)

When you then call in a loop:  order.getCustomer().getName()

Hibernate detects "proxy accessed" → executes:
  SELECT * FROM customers WHERE id = 42   -- Query 2 (for order #1)
  SELECT * FROM customers WHERE id = 17   -- Query 3 (for order #2)
  SELECT * FROM customers WHERE id = 99   -- Query 4 (for order #3)
  ... 100 more queries for 100 orders ...

Total: 1 + 100 = 101 queries for what should be a 1-query JOIN
```

### How JOIN FETCH Solves It

```
With JOIN FETCH:
SELECT o, c FROM Order o 
JOIN FETCH o.customer c
WHERE o.id IN :ids

Generated SQL:
SELECT o.*, c.*
FROM orders o
INNER JOIN customers c ON c.id = o.customer_id
WHERE o.id IN (1, 2, 3, ...)

Result: all orders AND their customers in ONE query
  - order.customer = real Customer object (loaded, no proxy)
  - No lazy loading needed → no extra queries on access

For multiple associations: JOIN FETCH both
  "SELECT o FROM Order o JOIN FETCH o.customer JOIN FETCH o.items WHERE ..."
  → 1 query with 2 JOINs = all data loaded

⚠️ Pagination + JOIN FETCH problem:
  SELECT ... JOIN FETCH o.items LIMIT 10 OFFSET 0
  Hibernate WARNING: HHH90003004 — "firstResult/maxResults specified with collection fetch"
  Hibernate fetches ALL rows in memory and paginates in application memory
  → On large datasets: out of memory risk
  FIX: 2-step query (ids first, then fetch by ids):
    Step 1: SELECT o.id FROM Order o WHERE ... LIMIT 10  -- gets the IDs with pagination
    Step 2: SELECT o FROM Order o JOIN FETCH o.items WHERE o.id IN :ids  -- fetches by ID list
```

---

## 4. The Code

### Wrong Way — the Classic N+1 Pattern

```java
// ❌ WRONG — N+1 queries in the service layer

// OrderSummaryService.java
@Service
@Transactional
public class OrderSummaryService {
    
    @Autowired OrderRepository orderRepository;
    
    public List<OrderSummaryDto> getOrdersForUser(Long userId) {
        // ❌ Query 1: load orders (just order data, items are LAZY—not loaded)
        List<Order> orders = orderRepository.findByUserId(userId);  
        
        return orders.stream()
            .map(order -> {
                // ❌ Query 2..N+1: for EACH order, accessing items triggers a new SQL query
                // Hibernate loads items lazily — this is a SEPARATE SELECT per order
                int itemCount = order.getItems().size();  // ← triggers SELECT * FROM order_items WHERE order_id = ?
                
                // ❌ Query N+1..2N+1: also accessing the lazy customer per order
                String customerName = order.getCustomer().getName();  // ← another SELECT per order
                
                return new OrderSummaryDto(
                    order.getId(),
                    customerName,
                    itemCount,
                    order.getTotalAmount()
                );
            })
            .toList();
        // For 100 orders: 1 (orders) + 100 (items) + 100 (customers) = 201 queries
    }
}
```

```java
// ❌ WRONG — The "works fine in tests" trap

// OrderRepositoryTest.java
@SpringBootTest
class OrderRepositoryTest {
    
    @Test
    void test_getOrdersForUser() {
        // ❌ Test with 3 orders: 1 + 3 + 3 = 7 queries in 15ms → test passes!
        // But in production with 500 orders: 1 + 500 + 500 = 1001 queries → 4 seconds!
        // The test never catches the N+1 because dataset is too small
        List<OrderSummaryDto> result = orderSummaryService.getOrdersForUser(testUserId);
        assertThat(result).hasSize(3);
        // ← No assertion on query count! This is the gap.
    }
}
```

### Right Way — All Four Fixing Strategies

```java
// ✅ FIX 1 — JOIN FETCH in custom JPQL query

// OrderRepository.java
public interface OrderRepository extends JpaRepository<Order, Long> {

    // ✅ JOIN FETCH: loads orders WITH their items and customer in one query
    // DISTINCT because JOIN FETCH on a collection creates duplicate rows from SQL JOIN
    @Query("""
        SELECT DISTINCT o FROM Order o
        JOIN FETCH o.customer c
        JOIN FETCH o.items i
        WHERE o.userId = :userId
        ORDER BY o.createdAt DESC
        """)
    List<Order> findByUserIdWithDetails(@Param("userId") Long userId);
    
    // ✅ Two-step pagination (avoid Hibernate HHH90003004 warning):
    // Step 1: get IDs with pagination
    @Query("SELECT o.id FROM Order o WHERE o.userId = :userId ORDER BY o.createdAt DESC")
    List<Long> findOrderIdsByUserId(@Param("userId") Long userId, Pageable pageable);
    
    // Step 2: fetch by IDs with JOIN FETCH (no pagination here)
    @Query("""
        SELECT DISTINCT o FROM Order o
        JOIN FETCH o.items
        JOIN FETCH o.customer
        WHERE o.id IN :ids
        """)
    List<Order> findByIdsWithDetails(@Param("ids") List<Long> ids);
}

// Service using two-step pagination:
@Service
@Transactional(readOnly = true)
public class OrderService {
    
    public Page<OrderSummaryDto> getOrdersForUser(Long userId, Pageable pageable) {
        // Step 1: paginated ID query (no JOIN FETCH — safe with LIMIT/OFFSET)
        List<Long> orderIds = orderRepository.findOrderIdsByUserId(userId, pageable);
        
        if (orderIds.isEmpty()) return Page.empty(pageable);
        
        // Step 2: fetch full data for those IDs (no pagination needed — small, bounded set)
        List<Order> orders = orderRepository.findByIdsWithDetails(orderIds);
        
        // Map to DTO
        List<OrderSummaryDto> dtos = orders.stream()
            .map(this::toSummaryDto)
            .toList();
        
        long totalCount = orderRepository.countByUserId(userId);  // for pagination metadata
        return new PageImpl<>(dtos, pageable, totalCount);
    }
    
    private OrderSummaryDto toSummaryDto(Order order) {
        // ✅ No lazy loading here — items and customer already loaded by JOIN FETCH
        return new OrderSummaryDto(
            order.getId(),
            order.getCustomer().getName(),     // ← customer already loaded, NO query
            order.getItems().size(),           // ← items already loaded, NO query
            order.getTotalAmount()
        );
    }
}
```

```java
// ✅ FIX 2 — @EntityGraph: declarative attribute path specification

// OrderRepository.java
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    // ✅ @EntityGraph: loads specified associations eagerly FOR THIS QUERY ONLY
    // Does not change the global FetchType (entity class stays LAZY)
    @EntityGraph(attributePaths = {"customer", "items", "items.product"})
    List<Order> findByUserId(Long userId);
    // ← Spring Data JPA generates JOIN FETCH SQL for customer, items, AND items.product
    
    // ✅ Also works with derived query methods:
    @EntityGraph(attributePaths = {"customer", "items"})
    Optional<Order> findById(Long id);  // Override the default findById with entity graph
    
    // ✅ Named entity graph (defined on the entity class):
    // @EntityGraph(value = "Order.withCustomerAndItems", type = EntityGraph.EntityGraphType.LOAD)
    // List<Order> findByStatus(String status);
}

// Order.java — entity with named graph:
@Entity
@NamedEntityGraph(
    name = "Order.withCustomerAndItems",
    attributeNodes = {
        @NamedAttributeNode("customer"),
        @NamedAttributeNode(value = "items", subgraph = "items-subgraph")
    },
    subgraphs = {
        @NamedSubgraph(
            name = "items-subgraph",
            attributeNodes = @NamedAttributeNode("product")  // nested: items → product
        )
    }
)
public class Order { ... }
```

```java
// ✅ FIX 3 — @BatchSize: incremental fix without rewriting queries

// Order.java entity — batch loading for the collection
@Entity
public class Order {
    // ✅ @BatchSize: when any order.getItems() triggers lazy loading,
    // Hibernate loads items for 50 orders at once (using IN clause)
    // instead of one query per order
    // 100 orders: ceil(100/50) = 2 queries instead of 100
    @OneToMany(mappedBy = "order", fetch = FetchType.LAZY)
    @BatchSize(size = 50)
    List<OrderItem> items;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @BatchSize(size = 50)  // Can also apply to @ManyToOne proxies
    Customer customer;
}

// Generated SQL (when iterating 100 orders):
// SELECT * FROM order_items WHERE order_id IN (1, 2, 3, ..., 50)  -- batch 1
// SELECT * FROM order_items WHERE order_id IN (51, 52, ..., 100)  -- batch 2
// Total: 2 queries instead of 100

// Note: @BatchSize is an improvement but JOIN FETCH is still better
// when you know you always need the collection
```

```java
// ✅ FIX 4 — DTO Projection with JPQL constructor expression

// OrderSummaryDto.java
@Value  // Lombok @Value = immutable class with constructor
public class OrderSummaryDto {
    Long orderId;
    String customerName;
    int itemCount;
    BigDecimal totalAmount;
    LocalDateTime createdAt;
}

// OrderRepository.java
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    // ✅ JPQL constructor expression: builds DTO directly in SQL
    // Only fetches the columns we need (no entity tracking, no lazy proxies)
    // COUNT(i) in the query aggregates item count in the database — no Java loop
    @Query("""
        SELECT new com.sap.ecommerce.dto.OrderSummaryDto(
            o.id,
            c.name,
            COUNT(i),
            o.totalAmount,
            o.createdAt
        )
        FROM Order o
        JOIN o.customer c
        LEFT JOIN o.items i
        WHERE o.userId = :userId
        GROUP BY o.id, c.name, o.totalAmount, o.createdAt
        ORDER BY o.createdAt DESC
        """)
    List<OrderSummaryDto> findOrderSummariesByUserId(@Param("userId") Long userId);
    // ← ONE query, builds DTO directly, no entity loading, no lazy proxy risk
    // No N+1 possible because there's nothing to lazily load
}
```

### Detection with datasource-proxy in Tests

```java
// ✅ Asserting SQL query count in integration tests

@SpringBootTest
@Transactional
class OrderServiceTest {
    
    @Autowired OrderSummaryService orderSummaryService;
    
    // ✅ datasource-proxy: proxies the DataSource to count/log actual SQL queries
    // Add dependency: net.ttddyy:datasource-proxy:1.9
    @Autowired DataSource dataSource;
    
    private ProxyTestDataSource proxyDataSource;
    
    @BeforeEach
    void setup() {
        proxyDataSource = ProxyDataSourceBuilder.create(dataSource)
            .countQuery()     // Enables query counting
            .build();
    }
    
    @Test
    void getOrdersForUser_shouldExecuteMaxThreeQueries() {
        // Given: 20 orders in database for the test user
        setupTestData(20);
        
        // When
        proxyDataSource.reset();       // Reset query counter
        orderSummaryService.getOrdersForUser(TEST_USER_ID);
        
        // Then: should be 1-3 queries (1 for orders, 1 for items, 1 for customers)
        // NOT 1 + 20 + 20 = 41 queries (N+1)
        int queryCount = proxyDataSource.getQueryExecutionCount();
        assertThat(queryCount)
            .as("Expected max 3 queries but got %d — N+1 query problem?", queryCount)
            .isLessThanOrEqualTo(3);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the N+1 query problem in JPA?"

**Hruday's answer:**
> The N+1 problem happens when code loads a collection of N entities and then, for each one, executes an additional database query to fetch a related entity — resulting in N+1 total queries instead of the 1-2 JOINs that would be optimal.
>
> In JPA/Hibernate, the root cause is lazy loading. When you annotate a relationship with `@OneToMany` (which defaults to `LAZY`), Hibernate doesn't load the related collection when you first query the parent. Instead, it creates a proxy that looks like the collection. When your code actually accesses the collection — like calling `order.getItems().size()` — Hibernate fires a SQL query at that point to fetch the items.
>
> If this access happens inside a loop over 100 orders, that's 100 separate SQL queries, one per order. Each query has network overhead, connection checkout time, and execution overhead. At 4ms per query, 100 queries is 400ms of extra latency for work a single JOIN could do in under 10ms.
>
> The tricky part: the code appears correct and the tests pass — the API returns the right data. The problem only manifests at scale, when N is large enough that the cumulative query overhead becomes noticeable. The detection tool is `spring.jpa.show-sql=true` — count the SELECT statements per request. If you see the same query repeated with different ID parameters, that's N+1.

---

### Q2 — Oracle Experience Deep Dive
**Interviewer asks:** "You mentioned a 47-query path at Oracle. Walk me through what happened and how you fixed it."

**Hruday's answer:**
> At the Oracle client engagement through Capgemini, we were building an order management system. The order detail API was slow — P95 response time was 850ms for a page that should have been fast. The page showed: order header, order items, each item's product details, the customer's profile, and the customer's delivery address.
>
> I enabled `spring.jpa.show-sql=true` and made one API call while watching the console. I counted the SQL queries: 1 (order) + 1 (order items collection) + 8 (one per order item, loading the product for each item) + 8 (one per product, loading the category) + 1 (customer) + 1 (customer address) = 20 queries. For a page that showed ONE order.
>
> But that was for a test API call with data I controlled. In production, some orders had up to 24 items. For those: 1 + 1 + 24 (products) + 24 (categories) + 1 (customer) + 1 (address) = 52 queries. Our largest orders had 44 items — 92 queries. The 47-query average was across all order sizes.
>
> The fix was a named entity graph on the Order entity that specified `items` → `product` → `category` as nested subgraphs. The repository method used `@EntityGraph(value = "Order.withFullDetails")`. Spring Data JPA generated one SQL query with all the JOINs. Where we previously had 47 queries, we now had 2 (the order with everything, plus a separate product inventory check that legitimately needed to be separate).
>
> API response: 850ms → 45ms. P95 dropped from 850ms to 48ms. The client noticed without being told — they just said the order page "suddenly felt much faster" after that release.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use @BatchSize instead of JOIN FETCH?"

**Hruday's answer:**
> `JOIN FETCH` is the best solution when you know you always need the related data and you're writing a custom query for that purpose. It fetches everything in one SQL JOIN. Use it as your first choice.
>
> `@BatchSize` is the right tool in three situations.
>
> First: when you cannot use JOIN FETCH — typically when you're using the default Spring Data derived query methods (`findAll()`, `findByStatus()`) with Criteria API or Specifications, and adding `@EntityGraph` or custom JPQL would require significant refactoring. `@BatchSize` is an annotation on the entity relationship; it applies automatically without changing any query code.
>
> Second: when the relationship isn't always accessed. If you have an `Order` entity where some code paths need `order.getItems()` and other code paths only need `order.status` and `order.total`, eager loading (JOIN FETCH) in all queries means you always pay the JOIN cost even when you don't need items. `@BatchSize` keeps the loading lazy (only fires when accessed) but at least reduces the query count from N to `ceil(N/50)` when it does fire.
>
> Third: as an incremental safety net. If you have a large codebase with many places accessing lazy relations and you can't rewrite all queries at once, adding `@BatchSize(size=50)` to relationships reduces N+1 from 100-query situations to 2-query situations without any query refactoring. It's not as good as JOIN FETCH but it's dramatically better than default lazy loading — and it's a one-annotation change.
>
> In practice: I use JOIN FETCH or `@EntityGraph` for the main API endpoints where performance matters most, and `@BatchSize` as a safety net on frequently-accessed relationships throughout the codebase.

---

### Q4 — System Design Angle
**Interviewer asks:** "How would you design a monitoring system to catch N+1 queries before they reach production?"

**Hruday's answer:**
> Four layers: test assertions, development tooling, staging checks, and production monitoring.
>
> Test assertions with datasource-proxy: in integration tests for service-layer methods, use `net.ttddyy:datasource-proxy` to wrap the DataSource and assert the number of SQL queries per method call. A test that loads 20 orders should assert `queryCount <= 3` — not just that the result is correct. This catches N+1 before code review.
>
> Development tooling: `spring.jpa.show-sql=true` and `spring.jpa.properties.hibernate.format_sql=true` in the dev profile. Every developer runs with SQL logging on. When you see the same `SELECT... WHERE id = ?` query repeated with different IDs, that's N+1. P6Spy is another option — it logs all SQL with timing and can highlight slow queries.
>
> Staging validation: add a custom `@DataJpaTest` or integration test suite that runs against seed data with realistic sizes (1,000 orders, 20 items per order). These tests are slower but catch issues the unit tests miss. Run in the CI pipeline but in a separate slower job.
>
> Production monitoring: Micrometer metrics for database query count per request (Spring Boot Actuator + Prometheus). Set an alert if any endpoint makes more than 20 SQL queries per request. This is a safety net — if the previous layers missed something, production metrics catch it before it becomes a customer-visible issue. Also, APM tools (Datadog, Dynatrace) show SQL query flame charts per request trace — the N+1 pattern is visually obvious in a trace where you see 50 identical SELECT statements.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "FetchType.EAGER solves N+1" | "Just set `@OneToMany(fetch = FetchType.EAGER)` to fix lazy loading" | `EAGER` on `@OneToMany` is WORSE — it loads all children for EVERY query, even when you don't need them; `findAll()` with 1,000 orders and `EAGER` items loads all items for all 1,000 orders even if you only need order IDs; this causes memory bloat (loading gigabytes of data you don't use), slow queries (always JOINing), and a different form of N+1 where even counting orders loads all their items; `EAGER` should NEVER be used on `@OneToMany` in production; keep it `LAZY` and use JOIN FETCH / EntityGraph only when you actually need the association |
| "JOIN FETCH always works with pagination" | "I'll use JOIN FETCH with `Pageable` to get paginated orders with their items" | Hibernate's JOIN FETCH with collection associations and pagination (`LIMIT`/`OFFSET`) produces a correct but potentially dangerous warning: `HHH90003004 — firstResult/maxResults specified with collection fetch; applying in memory!`; this means Hibernate fetches ALL rows from the database (bypassing the DB-level LIMIT) and paginates in Java heap memory; for thousands of orders, this blows up memory and is slower than the N+1 it was meant to fix; the correct approach is the 2-step query: paginated ID query first, then JOIN FETCH by the bounded ID list — never combine collection JOIN FETCH with pagination |
| "@EntityGraph solves all cases" | "I'll put @EntityGraph on every repository method to prevent N+1" | `@EntityGraph` loads specified associations for every call to that method — even calls where you don't need those associations; if `findByUserId()` with EntityGraph always loads `items` and `customer`, but 60% of callers only need the order status, you're adding JOIN overhead and data transfer for every call; over-fetching with EntityGraph is wasteful; the right approach: have multiple repository methods — `findByUserId()` for lean queries (no entity graph), `findByUserIdWithDetails(userId)` with EntityGraph for the endpoints that need full data; choose per use case, don't apply globally |

---

## 7. Hruday's Real Experience Hook
> "The 47-query path at the Oracle engagement was genuinely surprising to find. The developer who wrote the original order detail API was experienced with Spring Boot and JPA — not a junior mistake. The issue was that the domain model was a natural object graph: Order has Items, Items have Products, Products have Categories. Navigating this graph in Java feels natural: `order.getItems().forEach(item -> item.getProduct().getCategory())`. It reads like a reasonable business logic traversal.
>
> But each `.getProduct()` call was a database query. With 24 items, that's 24 queries just for product loading. Then 24 more for categories. The developer had written tests — they all passed because the test data had 3-5 items per order.
>
> After the fix, I established a rule for that project: any endpoint returning a list or a deep object graph gets a query count assertion in its integration test. We set the threshold at `queryCount <= (2 × numberOfEntitiesLoaded) + 3` — you're allowed 2 queries per entity type involved plus 3 for metadata/counts. This formula caught two other N+1 issues in code review before they shipped.
>
> The permanent fix: `datasource-proxy` added to the test configuration by default, assertion helper methods in the test utilities: `assertThat(queryCount).isLessThan(MAX_QUERIES)`."

---

## 8. Scale Evolution

**Small app (< 10K records) →** N+1 might not be noticeable in production (low latency, small data); still good practice to add `show-sql` in development and scan for repeated queries; the habits you build here matter at scale.

**Medium app (100K records) →** N+1 is noticeable (500ms+ API responses); `@BatchSize` as a quick safety net; explicit JOIN FETCH on the 5-10 most important read paths; `datasource-proxy` in integration tests for those paths; Spring Actuator metrics for query count per endpoint.

**Large scale (Oracle/SAP Commerce, millions of records) →** No tolerance for N+1 on any API endpoint; `datasource-proxy` assertions on 100% of service-layer integration tests; 2-step pagination everywhere; DTO projections for read-only endpoints (no entity loading at all — JPQL constructor expressions); read replicas for heavy read paths; Redis cache in front of frequently-read product/category data to avoid hitting the DB at all.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Transaction API loading merchant + transaction + payment method + account details; merchant dashboard aggregating many orders; high-throughput environment where N+1 shows up under load | JPA N+1 detection in high-throughput payment APIs; datasource-proxy testing; DTO projections for read paths |
| Swiggy / Meesho | Order API: order + items + restaurant/seller + delivery partner; product catalog: product + category + variants; high order volume makes N+1 directly impact P95 latency SLAs | Multi-level entity graph optimization; DTO projections; pagination with JOIN FETCH limitation |
| Adobe / Microsoft | Azure DevOps work items with nested relationships; Microsoft 365 calendar events with attendees; enterprise complexity with deeply nested domain models | Named entity graphs; complex subgraph definitions; multi-level N+1 chains |
| SAP Labs / Oracle | Direct: 47-query order detail path reduced to 2; 800ms → 45ms; @EntityGraph with subgraphs for Order→Items→Product→Category; datasource-proxy testing added; client performance review improvement noted | Specific query count before/after; named entity graph subgraphs; datasource-proxy in CI; client impact story |

---

## 10. Related Topics — What to Study Next

- **Topic 245 — Database Index Strategy** — after fixing N+1 (query COUNT reduction), the next optimization is query SPEED; even with 2 queries instead of 47, those 2 queries need indexes to run in milliseconds instead of seconds on large tables; N+1 fix + proper indexes = fast backend
- **Topic 248 — Spring Cache Abstraction** — for read-heavy APIs where the same data is requested frequently (product catalog, category list), caching the results of the fixed queries eliminates hitting the database on repeat requests; caching amplifies the N+1 fix
- **Topic 246 — Connection Pool Sizing** — N+1 queries consume database connections; at scale, 47 queries per request × 100 concurrent users = 4,700 connections needed; fixing N+1 reduces connection pool pressure significantly and enables the system to handle more concurrent load with fewer connections
- **Topic 243 — Main Thread Scheduling (Long Tasks)** — the frontend analog of N+1; just as N+1 creates excessive sequential database queries that block the backend, excessive synchronous computation creates long tasks that block the frontend main thread; both stem from sequential work that should be batched

---

*Part 14 · N+1 Query Problem — Detection and Fix · Full Stack Interview Guide · Hruday D · 2026*
