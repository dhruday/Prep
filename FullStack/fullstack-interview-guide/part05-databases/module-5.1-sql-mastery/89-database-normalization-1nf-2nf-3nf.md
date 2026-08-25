# Database Normalization — 1NF, 2NF, 3NF
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Normalization = organizing a database schema to eliminate data redundancy (storing the same data in multiple places) and prevent update anomalies (updating one copy of duplicated data but forgetting the other)
- 1NF (First Normal Form): every cell holds ONE atomic value (no lists, no comma-separated strings, no arrays in a column), and there is a primary key — "no repeating groups"
- 2NF (Second Normal Form): must already be 1NF, PLUS no partial dependency — in a composite PK table, every non-key column must depend on the WHOLE primary key, not just part of it
- 3NF (Third Normal Form): must already be 2NF, PLUS no transitive dependency — non-key columns must depend ONLY on the primary key, not on another non-key column
- Denormalization = intentionally adding redundancy (duplicating data) back to improve read performance — the correct approach for read-heavy analytics tables, reporting, or caching layers — but requires a clear strategy for keeping copies in sync
- Gap to bridge: candidates can recite "1NF = no repeating groups, 2NF = no partial dependency, 3NF = no transitive dependency" but cannot apply these rules to a real schema, explain what anomaly each normal form prevents, or justify WHEN to denormalize

---

## 1. One-Line Definition
Database normalization is a design process that structures tables so that each fact is stored in exactly one place, eliminating the insertion/update/deletion anomalies that arise when the same data lives in multiple locations.

---

## 2. The Problem It Solves

```
Imagine a table that stores customer orders before normalization:

orders_denormalized:
| order_id | customer_id | customer_name | customer_email          | product_id | product_name | product_category | qty | unit_price |
|----------|-------------|---------------|-------------------------|------------|--------------|------------------|-----|------------|
| O-001    | C-1         | Alice Kumar   | alice@example.com       | P-10       | iPhone 15    | Electronics      | 1   | 79900      |
| O-002    | C-1         | Alice Kumar   | alice@example.com       | P-20       | AirPods      | Electronics      | 2   | 19900      |
| O-003    | C-2         | Bob Dev       | bob@example.com         | P-10       | iPhone 15    | Electronics      | 1   | 79900      |

PROBLEM 1 — Update Anomaly:
  Alice's email changes. You must UPDATE every row where customer_id = C-1.
  If you miss one row: the database contains two different emails for Alice. Corrupt data.

PROBLEM 2 — Insertion Anomaly:
  A new customer signs up but hasn't placed an order yet.
  You CANNOT insert them — the table requires an order_id.

PROBLEM 3 — Deletion Anomaly:
  Bob's only order O-003 is cancelled and deleted.
  Bob (C-2) and all his details are deleted too. Customer lost.

PROBLEM 4 — Storage Waste:
  customer_name, customer_email repeated for every order.
  product_name, product_category repeated for every order containing that product.
  10 million orders for one popular product = product_name stored 10 million times.

Normalization solves all four by separating the data into focused tables.
```

---

## 3. How It Works Internally

### First Normal Form (1NF) — Atomic Values, No Repeating Groups

```
VIOLATES 1NF:
  orders:
  | order_id | customer_id | products           |
  |----------|-------------|---------------------|
  | O-001    | C-1         | iPhone,AirPods,iPad |   ← NOT atomic: comma-separated list
  | O-002    | C-2         | Laptop              |

  Also violates 1NF (repeating groups as separate columns):
  | order_id | product_1  | product_2 | product_3 |
  |----------|------------|-----------|-----------|
  | O-001    | iPhone     | AirPods   |   NULL    |
  
  Why bad: You can't efficiently query "all orders containing AirPods."
  LIKE '%AirPods%' on a comma-separated column is a full table scan.
  No referential integrity. Can't join.

SATISFIES 1NF:
  Turn multi-value cells into separate rows with a proper primary key:
  
  orders:
  | order_id | customer_id |   ← each row has one meaning
  |----------|-------------|
  | O-001    | C-1         |
  | O-002    | C-2         |

  order_items:
  | order_id | product_id | qty | unit_price |   ← one row per product per order
  |----------|------------|-----|------------|
  | O-001    | P-10       | 1   | 79900      |
  | O-001    | P-20       | 2   | 19900      |
  | O-002    | P-30       | 1   | 59900      |
  
  PK of order_items is (order_id, product_id) — composite primary key.
```

### Second Normal Form (2NF) — No Partial Dependencies

```
CONTEXT: 2NF only matters when the primary key is COMPOSITE (has multiple columns).
If PK is a single column, table is automatically in 2NF if it's in 1NF.

VIOLATES 2NF:
  order_items:
  | order_id | product_id | qty | product_name | product_category |
  |----------|------------|-----|--------------|------------------|
  | O-001    | P-10       | 1   | iPhone 15    | Electronics      |
  | O-001    | P-20       | 2   | AirPods      | Electronics      |
  
  PK = (order_id, product_id)
  
  qty → depends on the WHOLE PK (this specific product in this specific order): OK
  product_name → depends ONLY on product_id, NOT on order_id: PARTIAL DEPENDENCY
  product_category → depends ONLY on product_id: PARTIAL DEPENDENCY
  
  This causes the update anomaly: rename iPhone 15 → iPhone 16.
  Must UPDATE every order_items row containing P-10. Miss one → inconsistency.

SATISFIES 2NF:
  Remove the columns that depend only on part of the PK into their own table:
  
  order_items:
  | order_id | product_id | qty |   ← only columns depending on BOTH keys
  |----------|------------|-----|
  | O-001    | P-10       | 1   |
  | O-001    | P-20       | 2   |
  
  products:
  | product_id | product_name | product_category |   ← product facts in one place
  |------------|--------------|-----------------|
  | P-10       | iPhone 15    | Electronics     |
  | P-20       | AirPods      | Electronics     |
  
  Now: rename iPhone 15 → just UPDATE one row in products. Done.
```

### Third Normal Form (3NF) — No Transitive Dependencies

```
CONTEXT: 3NF removes indirect dependencies — non-key column A → non-key column B.
i.e., B depends on A, but A is not the primary key.

VIOLATES 3NF:
  customers:
  | customer_id | name   | city      | state      | country |
  |-------------|--------|-----------|------------|---------|
  | C-1         | Alice  | Bangalore | Karnataka  | India   |
  | C-2         | Bob    | Mumbai    | Maharashtra| India   |
  
  PK = customer_id
  
  name → depends on customer_id: OK
  city → depends on customer_id: OK
  state → depends on CITY, not on customer_id (Bangalore → Karnataka always)
  country → depends on STATE: TRANSITIVE DEPENDENCY (customer_id → city → state → country)
  
  Update anomaly: Bangalore moves to a different administrative division?
  Must update every customer row with city=Bangalore. Miss one → inconsistency.

SATISFIES 3NF:
  Put the transitively dependent columns into their own table:
  
  customers:
  | customer_id | name  | city_id |   ← foreign key to cities
  |-------------|-------|---------|
  | C-1         | Alice | CITY-1  |
  | C-2         | Bob   | CITY-2  |
  
  cities:
  | city_id | city_name | state      | country |
  |---------|-----------|------------|---------|
  | CITY-1  | Bangalore | Karnataka  | India   |
  | CITY-2  | Mumbai    | Maharashtra| India   |
  
  Now state and country exist exactly once per city. One UPDATE if needed.
```

### When to Denormalize — The Trade-off

```
FULLY NORMALIZED SCHEMA:
  To show a product listing with name, category, and review stats:
  
  SELECT p.name, c.category_name, r.avg_rating, r.review_count
  FROM products p
  JOIN categories c ON p.category_id = c.id
  JOIN (SELECT product_id, AVG(rating) AS avg_rating, COUNT(*) AS review_count
        FROM reviews GROUP BY product_id) r ON r.product_id = p.id
  WHERE p.is_active = true
  LIMIT 50;
  
  4-table join with an aggregation subquery for every page load.
  At 10,000 concurrent users: expensive.

DENORMALIZED for read performance:
  Add pre-computed columns to the products table:
  
  products:
  | product_id | name | avg_rating | review_count | category_name |
  
  Now the listing query is:
  SELECT name, avg_rating, review_count, category_name
  FROM products
  WHERE is_active = true
  LIMIT 50;
  
  One table. No joins. Much faster.
  
  The trade-off: avg_rating is now a COPY that must be updated whenever a review
  changes. Strategies:
  1. Synchronous trigger (UPDATE products SET avg_rating=... after each review)
  2. Event-driven: Kafka message → consumer recalculates and updates
  3. Scheduled refresh: recalculate every 5 minutes (acceptable staleness)

WHEN TO DENORMALIZE:
  ✅ Analytics / reporting tables (read many times, written once)
  ✅ Cached aggregates that are expensive to recompute
  ✅ Flat document stores where joins aren't available (Elasticsearch, MongoDB)
  ✅ Event sourcing projections (read model is explicitly denormalized)
  
  ❌ Core transactional data (orders, payments, users) — keep 3NF
  ❌ When writes and reads are balanced — normalization is correct
  ❌ When you lack a sync strategy — denormalized data drifts out of sync
```

---

## 4. The Code

### Wrong Way — Violating 1NF in JPA (Arrays in Column)
```java
// WRONG: Storing a list of tags as a comma-separated string in a single column
@Entity
@Table(name = "articles")
public class Article {
    @Id
    private String id;
    private String title;

    // VIOLATES 1NF: comma-separated list in one column
    @Column(name = "tags")  // stored as "spring,java,backend,microservices"
    private String tags;  

    // Problems:
    // 1. Can't query: WHERE 'spring' = ANY(tags) → must use LIKE '%spring%' → Seq Scan
    // 2. No referential integrity: typo in a tag is undetectable
    // 3. Reading: must split in Java on every read — error-prone
}
```
> **Why this fails:** Comma-separated strings in a column cannot be indexed, cannot be joined to a tags reference table, cannot maintain uniqueness, and require string parsing in application code that inevitably has edge cases.

### Right Way — 3NF Entity Design with Proper Relationships
```java
// Core entities following normalization rules:

@Entity
@Table(name = "articles",
       indexes = {
           @Index(name = "idx_articles_author", columnList = "author_id"),
           @Index(name = "idx_articles_status_created", columnList = "status, created_at")
       })
@Data
@NoArgsConstructor
public class Article {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String status;  // DRAFT, PUBLISHED, ARCHIVED

    // FK to authors — NOT storing author_name here (would be denormalization)
    @Column(name = "author_id", nullable = false)
    private String authorId;

    // Many-to-many with tags — proper junction table, satisfies 1NF
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "article_tags",
        joinColumns = @JoinColumn(name = "article_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

@Entity
@Table(name = "tags",
       indexes = {@Index(name = "idx_tags_name", columnList = "name", unique = true)})
@Data
@NoArgsConstructor
public class Tag {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String name;  // single source of truth for tag name

    // Updating a tag name: update one row in tags table. Done.
    // No article rows need updating.
}

// Junction table handled by JPA as article_tags(article_id, tag_id)
// Can query: SELECT a FROM Article a JOIN a.tags t WHERE t.name = 'spring'
// Uses indexes, referential integrity enforced
```

### Denormalized Aggregate for Read Performance
```java
// Scenario: Product listing needs avg_rating and review_count without a JOIN
// Strategy: maintain pre-computed columns updated via event

@Entity
@Table(name = "products")
public class Product {
    @Id
    private String id;
    private String name;

    // Denormalized aggregate — intentional, documented
    @Column(name = "avg_rating")
    private Double avgRating = 0.0;  // maintained by ReviewService

    @Column(name = "review_count")
    private Integer reviewCount = 0;  // maintained by ReviewService
}

@Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepo;
    private final ProductRepository productRepo;

    public void addReview(String productId, int rating, String comment) {
        Review review = Review.builder()
            .productId(productId)
            .rating(rating)
            .comment(comment)
            .createdAt(Instant.now())
            .build();
        reviewRepo.save(review);

        // Keep the denormalized aggregate in sync synchronously
        // For high-traffic: move this to an event/queue
        updateProductAggregates(productId);
    }

    private void updateProductAggregates(String productId) {
        // Single aggregation query — runs once per review submission
        ReviewAggregates agg = reviewRepo.getAggregatesForProduct(productId);

        Product product = productRepo.findById(productId)
            .orElseThrow(() -> new ResourceNotFoundException("Product: " + productId));
        product.setAvgRating(agg.getAvgRating());
        product.setReviewCount(agg.getReviewCount());
        productRepo.save(product);
        // Now product listing queries don't need a JOIN to reviews
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What problem does database normalization solve?"

**Hruday's answer:**
> Normalization solves the problem of duplicated data and the anomalies that duplication creates.
>
> When the same fact is stored in multiple rows — say, a customer's email stored in every order row — three bad things can happen. Update anomaly: you update the email in some rows but miss others, and now the database contains contradictory information. Insertion anomaly: you can't record a new customer without creating a fake order entry. Deletion anomaly: deleting the last order entry for a customer loses the customer's record entirely.
>
> Normalization solves this by ensuring each fact lives in exactly one place. Customer email lives in the customers table — one row per customer. Orders reference the customer by ID. The email appears exactly once. Change it once, it's correct everywhere.
>
> The practical consequence is also storage efficiency and query clarity — but the core goal is data integrity.

---

### Q2 — 2NF Explanation
**Interviewer asks:** "Explain second normal form with a practical example."

**Hruday's answer:**
> Second normal form is relevant when a table has a composite primary key — a primary key made of two or more columns. The rule says: every non-key column must depend on the ENTIRE composite key, not just part of it.
>
> A practical example: an order_items table with primary key (order_id, product_id). The quantity column depends on both — it's "how many of THIS product in THIS order." That's fine. But if I also store product_name in order_items, product_name depends ONLY on product_id — it doesn't change based on which order it appears in. That's a partial dependency, which violates 2NF.
>
> The consequence: rename "iPhone 14" to "iPhone 15" and you must update every order_items row containing that product. Miss one, and you have two different names for the same product in your database.
>
> The fix: move product_name to a products table where product_id is the primary key. order_items keeps only the FK (product_id) and the genuinely order-specific data (qty, unit_price at time of purchase).

---

### Q3 — Denormalization Trade-offs
**Interviewer asks:** "Would you ever denormalize a production database? When and why?"

**Hruday's answer:**
> Yes, deliberately — but only with a clear strategy for keeping the duplicated data in sync.
>
> A typical scenario: a product listing API is called 50,000 times per second. Each product needs its average rating and total review count. Computing this with a JOIN + GROUP BY on a 500-million-row reviews table on every listing request is not feasible.
>
> The solution: add avg_rating and review_count columns to the products table. These are intentionally denormalized — they are copies of a computation that lives "really" in the reviews table. The listing query becomes a single-table SELECT with no aggregation.
>
> The sync strategy matters though. Options: synchronous update in the same transaction as the new review (simple, but adds latency to review submission), event-driven update via a Kafka consumer (async, eventually consistent, better for high write volume), or scheduled recalculation every N minutes (acceptable staleness, simplest implementation).
>
> The rule: denormalize read models, cache layers, search indexes, and analytics tables. Keep the core transactional data — orders, payments, users — in 3NF. The two coexist: normalized source of truth, denormalized projections optimized for reads.

---

### Q4 — Scenario
**Interviewer asks:** "A developer proposes storing user permissions as a comma-separated list in a single column. What do you say?"

**Hruday's answer:**
> I'd say this violates First Normal Form and will cause problems as the system grows.
>
> The immediate problems: you cannot efficiently query "all users with ADMIN permission" — you'd need a LIKE '%ADMIN%' which is a full table scan. You cannot add a foreign key constraint from this column to a permissions table, so a typo like 'ADIMN' passes silently. When the permissions column contains 5 items and you need 6, you change the column — fragile.
>
> The correct model: a separate user_permissions junction table with (user_id, permission_id) as the composite primary key. Add a permissions reference table with all valid permission values. Now: querying all users with a permission is a simple JOIN, referential integrity prevents typos, and adding new permissions requires no schema change.
>
> If performance is a concern for frequent permission checks — like "does this user have X permission?" on every API request — add an index on (user_id, permission_id). Permission lookup is O(log n) on the junction table. At extreme scale, cache the permissions per userId in Redis with a short TTL.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Normalize everything" | "Always use 3NF for best database design" | "3NF is correct for transactional systems. For read-heavy analytics, search, or caching layers, denormalization is the right choice. Elasticsearch doesn't support joins — your document structure must be denormalized. A Spark analytics pipeline writes to a single wide table specifically to avoid joins at query time. The question isn't '3NF or not' — it's 'what are the read/write patterns and what consistency guarantees do I need?'" |
| "N+1 is caused by JOINs" | "Normalization causes more JOINs, which cause N+1 problems" | "N+1 is caused by accessing lazy-loaded ORM collections in a loop — not by normalization itself. A well-written JOIN FETCH or EntityGraph query loads normalized data in 1 JOIN query. The problem is ORM misuse, not schema design. If you denormalize to avoid joins in the ORM, you've made the schema worse while solving an ORM configuration problem — the wrong fix." |
| "BCNF is the goal" | "You should always aim for BCNF (Boyce-Codd Normal Form)" | "In practice, 3NF is the target for production systems. BCNF is a stricter form that handles edge cases with overlapping candidate keys — almost never relevant in standard application schemas. Time spent beyond 3NF is usually better invested in index design and query optimization. Know BCNF exists and what it solves, but don't normalize for normalization's sake beyond what your query patterns and integrity requirements actually need." |
| "Denormalization means no joins" | "If I denormalize, I don't need foreign keys or indexes" | "Denormalization reduces the number of joins needed — it doesn't mean abandoning indexes or referential integrity on the remaining joins. A denormalized products table still has a FK to categories. The category_id column still needs an index. Denormalization and proper indexing are complementary, not alternatives. Denormalize the right data; index everything that's joined or filtered." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, the ERP module had an orders table where early reports were written with a product_name column copied into the order header — a clear 2NF violation. It seemed harmless until a product catalogue migration changed 3,000 product names. The script updating the orders table ran for 2 hours and still missed rows due to a WHERE clause bug. The fix was a schema migration to remove the redundant column and always JOIN to the products table. After that: product name changes take 1 millisecond, and every report shows the correct current name automatically."

---

## 8. Scale Evolution

**Startup / monolith (< 1M rows):** Apply 3NF strictly. The performance cost of joins is negligible at this scale. Clean normalized schemas are easy to change as requirements evolve.

**Growth phase (1M-50M rows):** Identify the top 5 read-heavy endpoints. Evaluate where pre-computed aggregates (review counts, order totals per customer) would eliminate expensive GROUP BY joins. Add denormalized columns with synchronous sync strategy.

**Scale (> 100M rows / high traffic):** Separate the write model (fully normalized OLTP) from the read model (denormalized projections). Event-driven sync via Kafka: normalized writes → events → consumer refreshes read model. Read model may live in Elasticsearch or Redis for fastest access. Classic CQRS pattern.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment transaction data is highly normalized for integrity. Analytics (merchant dashboards, settlement reports) uses denormalized projections. Schema design decisions directly affect audit trail integrity. | "Design the schema for a payment system ensuring 3NF for transactions with denormalized merchant analytics." |
| Swiggy / Meesho | Order schema normalization determines how easily new product types, delivery options, and offer structures can be added. Poorly normalized schemas require migrations that interrupt service. | "How would you design the order and order_items schema to support both product and subscription orders?" |
| Adobe / Microsoft | Metadata and permission systems at scale — normalizing user permissions correctly enables audit logs, role changes, and access control queries to work correctly. | "Design a permissions system for 10M users with 50 permission types that supports real-time permission checks." |
| SAP Labs (current) | SAP ERP schema is extensively normalized across hundreds of tables. Understanding normalization helps in writing correct custom SQL queries against the SAP schema without unintentional Cartesian products or missing join conditions. | "This ABAP report is producing duplicate rows in the output. Walk me through diagnosing the join structure." |

---

## 10. Related Topics — What to Study Next

- **Topic 90 — Schema Design** — normalization principles are the foundation; Topic 90 applies them to common real-world patterns (one-to-many, many-to-many, self-referential trees)
- **Topic 86 — SQL Joins** — understanding normalized schemas makes JOIN logic clearer; every foreign key in a 3NF schema becomes a JOIN condition in queries
- **Topic 96 — When to Choose NoSQL** — normalization is a relational database concept; NoSQL document stores intentionally denormalize — understanding WHEN normalization is inappropriate motivates the NoSQL choice

---

*Part 5 · Database Normalization — 1NF, 2NF, 3NF · Full Stack Interview Guide · Hruday D · 2026*
