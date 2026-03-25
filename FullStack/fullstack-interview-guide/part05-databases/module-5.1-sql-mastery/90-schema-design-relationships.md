# Schema Design — One-to-Many, Many-to-Many, Self-Referential
> Part 5 — Databases & Storage
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- One-to-many: one parent row → many child rows. Model with a foreign key (FK) on the CHILD table pointing to the parent. Example: one customer → many orders. The FK `orders.customer_id` references `customers.id`. Always index the FK column on the child table.
- Many-to-many: one row on side A can relate to many on side B and vice versa. Model with a JUNCTION TABLE (also called: join table, bridge table, association table) that holds (a_id, b_id) as a composite primary key. Example: users ↔ roles → `user_roles(user_id, role_id)`. Add extra columns to the junction table if the relationship itself has attributes (e.g., granted_at, granted_by).
- Self-referential: rows in a table can reference other rows in the SAME table. Used for hierarchies: categories (parent_id → id), org charts (employee → manager), comment threads (reply → parent comment). Column convention: `parent_id BIGINT REFERENCES same_table(id)`. Root nodes have NULL parent_id.
- Querying hierarchies: simple parent→children: one level with WHERE parent_id = ?. Full tree: recursive CTE (WITH RECURSIVE) in SQL. JPA: model as @ManyToOne + @OneToMany on the same entity; load subtree via recursive JPQL or native SQL.
- Gap to bridge: candidates can name the patterns but cannot choose the correct FK placement for one-to-many, cannot add attributes to a many-to-many junction table, and cannot write a recursive CTE to query a self-referential tree

---

## 1. One-Line Definition
Schema design is the process of deciding which tables to create, how to distribute columns across those tables, and which foreign keys to place on which side of each relationship — ensuring data integrity, query efficiency, and the ability to evolve the schema as requirements change.

---

## 2. The Problem It Solves

```
Without a schema pattern:

Developer A models customer-orders with orders inside customer:
  customers: { id, name, email, orders: [{id, total, ...}] }  ← violates 1NF
  → Can't query "all orders above ₹10,000" without scanning all customers

Developer B models users-roles with an array:
  users: { id, name, roles: ["ADMIN", "USER"] }  ← comma-separated or array column
  → Can't efficiently query "all ADMIN users"
  → No referential integrity: ADMINN typo passes silently

Developer C stores a product category tree:
  categories: { id, name, path: "Electronics/Phones/Flagship" }  ← encoded path as string
  → Renaming a parent category requires updating all descendant paths
  → Querying all descendants is LIKE 'Electronics/%' → Seq Scan every time

All three create problems at scale. Schema patterns solve this upfront.
```

---

## 3. How It Works Internally

### Pattern 1: One-to-Many

```
RELATIONSHIP: One customer can have many orders.
              Each order belongs to exactly one customer.

WRONG placement — FK on the parent side:
  customers: | id | name | order_ids |  ← array/CSV of order IDs in customer row
  → Violates 1NF. Breaks when a customer has 1,000+ orders.

CORRECT placement — FK on the CHILD side:
  customers:
  | id    | name          | email              |
  |-------|---------------|--------------------|
  | C-001 | Hruday Dev    | hruday@example.com |
  | C-002 | Alice Kumar   | alice@example.com  |

  orders:                      ↓ FK points to customers(id)
  | id    | customer_id | total    | status  | created_at |
  |-------|-------------|----------|---------|------------|
  | O-001 | C-001       | 5999.00  | SHIPPED | 2026-01-10 |
  | O-002 | C-001       | 1299.00  | PLACED  | 2026-01-12 |
  | O-003 | C-002       | 8999.00  | SHIPPED | 2026-01-11 |

QUERIES:
  All orders for customer C-001:
    SELECT * FROM orders WHERE customer_id = 'C-001'
    → Needs INDEX ON orders(customer_id)  ← MUST ADD MANUALLY (JPA does not auto-add)
    
  Customer with their order count:
    SELECT c.name, COUNT(o.id) AS order_count
    FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id, c.name

JPA MAPPING:
  Customer:
    @OneToMany(mappedBy = "customer", fetch = FetchType.LAZY)
    private List<Order> orders;
    
  Order:
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;
    
  The "owning side" (controls the FK in the DB) is the @ManyToOne side — Order.
```

### Pattern 2: Many-to-Many

```
RELATIONSHIP: A user can have many roles.
              A role can be assigned to many users.

WRONG — FK on either side (impossible cleanly):
  users: | id | name | role_id |  ← only one role per user: forces SINGLE role
  OR
  users: | id | name | role_ids |  ← array/CSV: violates 1NF

CORRECT — Junction table:
  users:
  | id    | name          |
  |-------|---------------|
  | U-001 | Hruday Dev    |
  | U-002 | Alice Kumar   |

  roles:
  | id     | name        |
  |--------|-------------|
  | R-ADMN | ADMIN       |
  | R-USER | USER        |
  | R-MGMT | MANAGER     |

  user_roles:   ← junction table; PK = (user_id, role_id)
  | user_id | role_id | granted_at | granted_by |
  |---------|---------|------------|------------|
  | U-001   | R-ADMN  | 2026-01-01 | system     |
  | U-001   | R-USER  | 2026-01-01 | system     |
  | U-002   | R-USER  | 2026-01-05 | U-001      |
  
  IMPORTANT: The junction table CAN have extra columns (granted_at, granted_by).
  This is why you sometimes need an Entity class for the junction, not just @ManyToMany.

JPA MAPPING (simple — no extra junction columns):
  @ManyToMany
  @JoinTable(
    name = "user_roles",
    joinColumns = @JoinColumn(name = "user_id"),
    inverseJoinColumns = @JoinColumn(name = "role_id")
  )
  private Set<Role> roles;

JPA MAPPING (with junction table attributes — grants):
  // Create a separate entity for the junction:
  @Entity @Table(name = "user_roles")
  public class UserRole {
    @EmbeddedId
    private UserRoleId id;                // composite PK
    
    @ManyToOne @MapsId("userId")
    private User user;
    
    @ManyToOne @MapsId("roleId")
    private Role role;
    
    private Instant grantedAt;            // extra column
    private String grantedBy;            // extra column
  }
  
  @Embeddable
  public class UserRoleId implements Serializable {
    private String userId;
    private String roleId;
  }
```

### Pattern 3: Self-Referential (Hierarchy)

```
RELATIONSHIP: A category can have a parent category.
              A parent category can have many child categories.
              Root categories have no parent.

SCHEMA:
  categories:
  | id  | name               | parent_id |
  |-----|--------------------|-----------|
  | 1   | Electronics        | NULL      |  ← root
  | 2   | Phones             | 1         |  ← child of Electronics
  | 3   | Flagship Phones    | 2         |  ← child of Phones
  | 4   | Mid-range Phones   | 2         |  ← child of Phones
  | 5   | Laptops            | 1         |  ← child of Electronics
  | 6   | Clothing           | NULL      |  ← root

QUERIES:
  Direct children of Electronics (id=1):
    SELECT * FROM categories WHERE parent_id = 1
    → Returns: Phones, Laptops
    
  Full tree (all descendants of Electronics):
    WITH RECURSIVE category_tree AS (
      -- Base case: the starting node
      SELECT id, name, parent_id, 1 AS depth
      FROM categories WHERE id = 1
      
      UNION ALL
      
      -- Recursive case: join children to the current level
      SELECT c.id, c.name, c.parent_id, ct.depth + 1
      FROM categories c
      INNER JOIN category_tree ct ON c.parent_id = ct.id
    )
    SELECT * FROM category_tree ORDER BY depth, name;
    
    → Returns: Electronics (depth 1)
               Laptops (depth 2), Phones (depth 2)
               Flagship Phones (depth 3), Mid-range Phones (depth 3)
    
  Breadcrumb path for Flagship Phones (id=3):
    WITH RECURSIVE breadcrumb AS (
      SELECT id, name, parent_id FROM categories WHERE id = 3
      UNION ALL
      SELECT c.id, c.name, c.parent_id
      FROM categories c
      INNER JOIN breadcrumb b ON c.id = b.parent_id
    )
    SELECT name FROM breadcrumb ORDER BY id;
    → Returns: Flagship Phones → Phones → Electronics (bottom-up, then reverse)

JPA MAPPING:
  @Entity
  public class Category {
    @Id private Long id;
    private String name;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;            // null for root nodes
    
    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    private List<Category> children;    // empty list for leaf nodes
  }
```

---

## 4. The Code

### Wrong Way — Missing FK Index and Nullable Junction Keys
```java
// WRONG: No index on the FK column in the child table
@Entity
@Table(name = "orders")
// No indexes annotation — JPA DOES NOT auto-create index on customer_id
public class Order {
    @Id private String id;

    @Column(name = "customer_id")
    private String customerId;  // FK without @ManyToOne — no index warned → full scan joins
}

// WRONG: Junction table allows NULL which undermines integrity
@Entity
@Table(name = "user_roles")
public class UserRole {
    @Id private String id;        // surrogate PK — don't need this

    @Column(name = "user_id")     // missing: nullable = false
    private String userId;        // allows NULL user_id: meaningless assignment

    @Column(name = "role_id")     // missing: nullable = false
    private String roleId;        // allows NULL role_id: role unknown
    // A row (userId=NULL, roleId='ADMIN') would pass — corrupt data
}
```
> **Why this fails:** Missing indexes on FK columns cause full table scans on every JOIN. Junction tables with nullable FK columns allow orphaned or incomplete relationship rows that corrupt security-sensitive data like permissions.

### Right Way — Proper One-to-Many, Many-to-Many, and Self-Referential
```java
// ONE-TO-MANY: Customer → Orders (correct FK on Orders side)
@Entity
@Table(name = "orders",
       indexes = {
           // CRITICAL: index on FK column — JPA does not auto-add this
           @Index(name = "idx_orders_customer_id", columnList = "customer_id"),
           @Index(name = "idx_orders_status_created", columnList = "status, created_at")
       })
@Data @NoArgsConstructor
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // Owning side of the relationship: controls the FK in the DB
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(nullable = false)
    private String status;

    @Column(name = "total_amount", nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}

@Entity
@Table(name = "customers")
@Data @NoArgsConstructor
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    // Inverse side: mappedBy = the field name in Order that holds Customer
    @OneToMany(mappedBy = "customer", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Order> orders = new ArrayList<>();
}

// MANY-TO-MANY with junction attributes: User ↔ Role via UserRole
@Embeddable
@Data @NoArgsConstructor @AllArgsConstructor
public class UserRoleId implements Serializable {
    @Column(name = "user_id", nullable = false)
    private String userId;
    @Column(name = "role_id", nullable = false)
    private String roleId;
}

@Entity
@Table(name = "user_roles",
       indexes = {
           @Index(name = "idx_user_roles_user", columnList = "user_id"),
           @Index(name = "idx_user_roles_role", columnList = "role_id")
       })
@Data @NoArgsConstructor
public class UserRole {
    @EmbeddedId
    private UserRoleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId")
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("roleId")
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "granted_at", nullable = false)
    private Instant grantedAt;

    @Column(name = "granted_by")
    private String grantedBy;
}

// SELF-REFERENTIAL: Category tree
@Entity
@Table(name = "categories",
       indexes = {@Index(name = "idx_categories_parent", columnList = "parent_id")})
@Data @NoArgsConstructor
public class Category {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")  // nullable: roots have no parent
    private Category parent;

    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    @OrderBy("name ASC")
    private List<Category> children = new ArrayList<>();

    // Utility: is this a root category?
    public boolean isRoot() {
        return parent == null;
    }
}

// Recursive CTE via native query for full subtree
public interface CategoryRepository extends JpaRepository<Category, Long> {

    // Direct children: simple JPQL
    List<Category> findByParentId(Long parentId);

    // Root categories
    List<Category> findByParentIsNull();

    // Full subtree using recursive CTE — native Postgres SQL
    @Query(value = """
        WITH RECURSIVE subtree AS (
            SELECT id, name, parent_id, 1 as depth
            FROM categories
            WHERE id = :rootId
            UNION ALL
            SELECT c.id, c.name, c.parent_id, s.depth + 1
            FROM categories c
            JOIN subtree s ON c.parent_id = s.id
        )
        SELECT * FROM subtree ORDER BY depth, name
        """, nativeQuery = true)
    List<Object[]> findSubtree(@Param("rootId") Long rootId);
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What's the difference between one-to-many and many-to-many relationships in a database?"

**Hruday's answer:**
> In a one-to-many relationship, one row in the parent table can be referenced by many rows in the child table — one customer can have many orders. You model this by putting a foreign key in the child table. The orders table has a customer_id column pointing to the customers table. One customer ID appears in many order rows.
>
> In a many-to-many relationship, both sides can reference multiple rows on the other side — a user can have many roles, and a role can be assigned to many users. You cannot model this with a single foreign key on either side. You use a junction table: user_roles with (user_id, role_id). The primary key of the junction is the combination of both foreign keys, which naturally prevents duplicate assignments.
>
> The junction table is often richer than just the two FK columns. In a course enrollment system, students ↔ courses — the enrollment itself has attributes: enrollment_date, grade, status. The junction table becomes an Enrollment entity in JPA with @EmbeddedId.

---

### Q2 — Self-Referential Design
**Interviewer asks:** "How would you model a product category hierarchy in SQL?"

**Hruday's answer:**
> I'd use a self-referential table: a single categories table where each row has a parent_id column that references the id column of the same table. Root categories — the top level with no parent — have parent_id = NULL.
>
> This is clean and simple for most operations: finding the direct children of a category is `SELECT * FROM categories WHERE parent_id = ?` — one query, uses the index on parent_id. Moving a category to a different parent is a single UPDATE of the parent_id column.
>
> For tree traversal — "give me all descendants of Electronics" — I use a recursive CTE. The WITH RECURSIVE query starts with the root node as the base case, then repeatedly JOINs the categories table to the result so far to collect children, children's children, and so on until no new rows are added.
>
> The alternative for very deep trees or frequent full-tree queries is a nested sets or closure table model — these pre-compute ancestor/descendant relationships, making subtree queries a single non-recursive JOIN at the cost of more complex insert/move operations. For a product catalogue that's rarely restructured, the self-referential model with recursive CTE is the right starting point.

---

### Q3 — Adding Attributes to Many-to-Many
**Interviewer asks:** "You have a users-courses enrollment system. A student can enroll in many courses, a course can have many students. How do you handle the enrollment date and grade?"

**Hruday's answer:**
> When the many-to-many relationship itself has attributes — enrollment date, grade, status — the junction table is no longer just a pair of FK columns. It needs to be a full entity with its own data.
>
> I'd create an Enrollment table: (student_id, course_id, enrolled_at, grade, status). The primary key is the composite (student_id, course_id) — a student can only enroll in a specific course once. The enrolled_at, grade, and status columns belong to the enrollment relationship itself, not to either student or course.
>
> In JPA, I model this as an Enrollment entity with @EmbeddedId containing both FK columns. The Student and Course entities each have a @OneToMany relationship to Enrollment, not a @ManyToMany directly. This gives me full control over the relationship's attributes — I can query "all courses a student is currently enrolled in," "all students who failed a course," or "enrollments sorted by enrollment date" without awkward workarounds.

---

### Q4 — Schema Evolution
**Interviewer asks:** "You designed a product schema with a single category per product. Now the business wants products to belong to multiple categories. How do you migrate this?"

**Hruday's answer:**
> This is a one-to-many → many-to-many migration. The original products table has a single category_id FK column. The new model needs a junction table.
>
> The migration steps, done carefully to avoid downtime:
>
> Step one: add the junction table in Flyway migration. Create product_categories (product_id, category_id) with a composite PK and FK constraints. Both FKs with NOT NULL and proper indexes.
>
> Step two: backfill data. In the same migration or a follow-up data migration script, insert rows into product_categories from the existing products.category_id: `INSERT INTO product_categories SELECT id, category_id FROM products WHERE category_id IS NOT NULL`.
>
> Step three: deploy the application code that uses the new product_categories junction table for reads and writes. Keep the old category_id column in place — don't drop it yet.
>
> Step four: run dual writes in the code for one deployment cycle — write to both the old column and the Junction table. Validate that data is consistent.
>
> Step five: in a subsequent deployment, switch all reads to use product_categories only. Then drop the old category_id column in a final migration.
>
> This phased approach ensures zero-downtime migration and safe rollback at each step.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "JPA auto-creates FK indexes" | "@ManyToOne automatically creates an index on the FK column" | "JPA creates the FK CONSTRAINT, but NOT an index by default (at least in Postgres and MySQL). A FK constraint ensures data integrity — it ensures the referenced row exists. An index on the FK column speeds up queries and JOINs. They are separate database objects. You must explicitly add `@Index(columnList = 'customer_id')` to the @Table annotation or create the index via Flyway SQL. Missing FK indexes are the #1 cause of unexpectedly slow JOIN queries in Spring Data JPA applications." |
| "Use @ManyToMany for everything" | "I'll use @ManyToMany and let JPA manage the junction table" | "@ManyToMany with @JoinTable works only when the junction table has ZERO extra columns. The moment you need created_at, status, or any attribute on the relationship, you must model the junction as a separate entity with @EmbeddedId. Also, @ManyToMany with CascadeType.ALL is dangerous — cascading a remove from one side can delete the other side's rows if misconfigured. Start with an explicit Enrollment/UserRole entity for any relationship that could evolve — it's easier to add a simple @ManyToMany later than to migrate an existing one to an entity." |
| "NULL parent_id needs special handling" | "I need to handle NULL parent_id with application code to detect roots" | "NULL parent_id is the correct and idiomatic way to represent root nodes in a self-referential hierarchy. `WHERE parent_id IS NULL` correctly returns only root nodes. `WHERE parent_id = :id` never matches root nodes (NULL != anything). This is correct SQL behaviour. You don't need a sentinel value like parent_id = 0 or parent_id = -1 — those are anti-patterns inherited from languages without proper NULL support. JPA @ManyToOne with optional = true handles NULL parent correctly." |
| "Always use recursive CTE" | "For any tree query, use WITH RECURSIVE" | "Recursive CTEs are powerful and correct, but have a performance ceiling. For very deep trees (hundreds of levels) or very wide trees (millions of nodes), recursive CTEs can be slow. For a category tree that's queried millions of times per second, consider a closure table (pre-computed ancestor-descendant pairs) or a materialized path (storing the full path like '/1/2/3/' in a column). These trade write complexity for read performance. Use recursive CTE for category trees and org charts that are read infrequently and updated rarely — it's the right default until scale proves otherwise." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, the product configurator module had a self-referential table for configuration option groups — each group could be a sub-group of another. The first version used a depth column to limit API traversal to two levels. When the business expanded to five-level product configurations, the application code had five nested loops that made five separate database calls per level. I rewrote it with a single recursive CTE that returns the full subtree in one query — regardless of depth. The API response time for the configuration tree dropped from 800ms to 40ms, and the code shrank from 60 lines to 12."

---

## 8. Scale Evolution

**Small system:** Model correctly from the start — use FK columns for one-to-many, junction tables for many-to-many, parent_id for self-referential. Correctness matters more than performance at this stage.

**Growth phase:** Add indexes to all FK columns (if not already done). For many-to-many junction tables: index both FK columns (individually, not just the composite PK). For hierarchy tables: if recursive CTEs start showing plan costs > 1 second, consider a closure table.

**Scale:** Denormalize specific read paths: pre-compute category breadcrumbs in a breadcrumbs column for listing pages. For user permissions: cache the permissions set in Redis per user with 5-minute TTL so the database isn't hit on every API call. Closure tables for trees that are traversed millions of times per minute.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Product schema: one merchant → many payment links, many webhooks. User ↔ roles for access control. Correct FK design for financial audit trails. | "Design the schema for a payment gateway's merchant-account-transaction hierarchy." |
| Swiggy / Meesho | Product category hierarchy for catalogue browsing. Restaurant → menu items (one-to-many). Cart items as junction between cart and product. | "How would you model a restaurant menu with categories, sub-categories, and items?" |
| Adobe / Microsoft | Asset management: one project → many assets. Users ↔ teams → many-to-many. Document versions as self-referential (version → parent version). | "Design the schema for a document management system with version history and collaborative access." |
| SAP Labs (current) | SAP ERP uses heavily normalized multi-table schemas. Understanding one-to-many and many-to-many patterns explains the JOIN patterns required in custom ABAP and SQL-based reports. | "This SAP ABAP report produces duplicate rows when joining these two tables. What's wrong with the join?" |

---

## 10. Related Topics — What to Study Next

- **Topic 89 — Database Normalization** — schema design patterns are the practical application of normalization rules; the two topics are a single conceptual unit
- **Topic 88 — Query Optimization** — correctly designed schemas with proper FK indexes and junction tables determine whether JOIN queries use Index Scans or Seq Scans
- **Topic 86 — SQL Joins** — every FK relationship in a schema becomes a JOIN condition in a query; Topic 86 covers the join types that connect the schema patterns in this topic
- **Topic 96 — NoSQL** — understanding relational schema patterns makes the contrast with document design clear: MongoDB embeds what SQL normalizes into separate tables

---

*Part 5 · Schema Design — One-to-Many, Many-to-Many, Self-Referential · Full Stack Interview Guide · Hruday D · 2026*
