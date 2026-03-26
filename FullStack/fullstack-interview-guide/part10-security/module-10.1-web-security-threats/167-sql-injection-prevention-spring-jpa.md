# SQL Injection — Prevention in Spring / JPA
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **SQL injection**: attacker inserts SQL syntax into user input that your application concatenates directly into a SQL query — the database executes the attacker's SQL with your application's database privileges
- **Why it's catastrophic**: the attacker can read all tables, bypass login, delete your entire database, or — in some configs — execute OS commands on the DB server
- **JPQL is parameterised by default**: Spring Data JPA with `@Query("SELECT u FROM User u WHERE u.email = :email")` and `@Param("email") String email` — JPA sends the email as a separate parameter, never interpolated into the query string
- **`findByEmail(String email)` is automatically safe**: Spring Data derived query methods use parameterised queries internally — you can't accidentally inject through these
- **The danger zone**: `@Query(value = "...", nativeQuery = true)` with string concatenation, or using `EntityManager.createNativeQuery("..." + input)` — these are the only real injection risks in modern Spring apps
- **Spring Boot completely blocks SQLi by default** — if you write standard JPA, you are protected; the risk only appears if you hand-build native SQL strings with user input

---

## 1. One-Line Definition
SQL injection is an attack where untrusted user input is incorporated into a database query as SQL syntax rather than as data — allowing the attacker to alter the query's logic and read, modify, or delete data they should never have access to.

---

## 2. The Problem It Solves

Consider a login endpoint that checks username and password:

```java
// Vulnerable code — not how Spring apps look, but explains the concept
String query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
```

An attacker enters `username=admin'--` and `password=anything`.

The resulting SQL becomes:
```sql
SELECT * FROM users WHERE username = 'admin'--' AND password = 'anything'
```

`--` is a SQL comment. Everything after it is ignored. The query becomes:
```sql
SELECT * FROM users WHERE username = 'admin'
```

The password check is gone. The attacker logs in as admin with any password.

More destructively: `username=' OR '1'='1'--` makes the query:
```sql
SELECT * FROM users WHERE username = '' OR '1'='1'-- ...
```

`'1'='1'` is always true — this returns all rows in the users table.

The most dangerous form — if the DB user has FILE privileges — can read files from the server:
```sql
' UNION SELECT load_file('/etc/passwd') -- 
```

The reason this matters for Spring developers: while JPA protects you by default, native queries with string concatenation are written in production codebases. The risk is in the code you write when you think JPA's standard API isn't flexible enough.

---

## 3. How It Works Internally

### The Mental Model
Think of a restaurant order form. Normally customers write "One burger" and the kitchen makes one burger. SQL injection is like a customer writing "One burger; also, clear the entire freezer and send me the owner's recipe book." A good kitchen would only execute the order part — separating the customer's words from the actual instruction. String concatenation is like reading the customer's words aloud directly to the kitchen staff, who then follow every instruction including the malicious ones.

Parameterised queries separate the command structure (which the developer controls) from the data (which the user provides). The database receives the template and the data separately — the data can never become part of the command structure.

### The Mechanism — Step by Step

**String concatenation (vulnerable):**
1. Developer writes: `"SELECT * FROM users WHERE email = '" + email + "'"`
2. User provides: `email = "' OR 1=1; DROP TABLE users; --"`
3. Application concatenates: `"SELECT * FROM users WHERE email = '' OR 1=1; DROP TABLE users; --'"`
4. Database parses and executes: First query returns all rows. Second drops the users table.
5. Complete data loss — all user accounts gone.

**Parameterised query (safe):**
1. Developer writes: `"SELECT * FROM users WHERE email = :email"`
2. Application sends to DB: template = `"SELECT * FROM users WHERE email = ?"` and parameter = `"' OR 1=1; DROP TABLE users; --"` as a plain string value
3. Database treats the parameter as a *literal string value* inside the WHERE clause — it never parses it as SQL
4. The query literally looks for a user whose email address is exactly `' OR 1=1; DROP TABLE users; --` — finds nobody, returns empty result
5. Attacker's SQL never executes. Attack fails.

**Why JPQL is safe:**
Spring Data JPA creates a parameterised query for every JPQL expression. The JPA provider (Hibernate) compiles the JPQL to SQL using bind parameters at the JDBC level. User-provided values are always parameters, never query fragments.

**The real risk in Spring apps:**
- `@Query(nativeQuery = true)` with string concatenation
- `EntityManager.createNativeQuery("..." + input)`
- `JdbcTemplate.query("..." + input, ...)`
- `@Query` with SpEL expressions that interpolate user values directly

### ASCII Diagram

```
VULNERABLE: String concatenation

User input:   "' OR 1=1--"
                    │
                    ▼
Java code:  "SELECT * FROM users WHERE id = '" + input + "'"
                    │
         String concatenation produces:
         "SELECT * FROM users WHERE id = '' OR 1=1--'"
                    │
                    ▼
         Database parses this as SQL syntax
         OR 1=1 is always true → returns ALL rows
                    ▼
         All user data leaked ← ATTACK SUCCEEDS


SAFE: Parameterised query

User input:   "' OR 1=1--"
                    │
                    ▼
Java code:  query template = "SELECT * FROM users WHERE id = ?"
            parameter value = "' OR 1=1--"
                    │
                    ▼
         Database receives template + parameter SEPARATELY
         Parameter is bound as literal string data
         Query: find user where id equals exactly "' OR 1=1--"
         → no such user → empty result
                    ▼
         Attack data treated as text, not SQL ← ATTACK FAILS
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Repository layer — string concatenation in native query (the most common real-world mistake)
@Repository
public class UserRepositoryCustom {

    @PersistenceContext
    private EntityManager em;

    // DANGER: String concatenation in native SQL query
    // If searchTerm = "'; DROP TABLE users; --"  → executes arbitrary SQL
    public List<User> searchUsers(String searchTerm) {
        // This is the real-world SQL injection risk in Spring apps
        String sql = "SELECT * FROM users WHERE username LIKE '%" + searchTerm + "%'";
        return em.createNativeQuery(sql, User.class).getResultList();
    }

    // Also dangerous: native query that builds the ORDER BY clause from user input
    // ORDER BY cannot be parameterised — see right way for how to handle this safely
    public List<Product> getProducts(String sortColumn) {
        // sortColumn = "price; DROP TABLE products" — catastrophic
        String sql = "SELECT * FROM products ORDER BY " + sortColumn;
        return em.createNativeQuery(sql, Product.class).getResultList();
    }
}
```

```java
// Service layer mistake — concatenating directly in JPQL
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // DANGER: SpEL interpolation #{#email} is interpolated, not parameterised
    // Use :email (named parameter) not #{#email} for user-supplied values
    @Query("SELECT u FROM User u WHERE u.email = '#{#email}'")  // WRONG
    Optional<User> findByEmailUnsafe(String email);
}
```

> **Why this fails in production:** Native queries bypass JPA's parameterisation. The string is sent directly to the database driver as raw SQL. The database has no way to know which parts are developer-written SQL and which parts are user input — it executes everything. At e-commerce scale, a search field that accepts user input and passes it to a native query without parameterisation is a direct path to dumping the entire product catalogue, user table, and payment records.

### Right Way — Production Quality

**Spring Data JPA — derived queries (automatically safe):**
```java
// Spring Data generates parameterised SQL for ALL derived method names
// findByEmail, findByNameContaining, findByAgeGreaterThan — all safe
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Automatically generates: SELECT u FROM User u WHERE u.email = ?1
    // The email value is always a JDBC bind parameter — never SQL
    Optional<User> findByEmail(String email);

    // Automatically parameterised: WHERE u.username LIKE ?1
    List<User> findByUsernameContaining(String searchTerm);

    // Multiple parameters — all parameterised
    List<User> findByFirstNameAndLastName(String firstName, String lastName);
}
```

**JPQL with named parameters — safe:**
```java
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    // Named parameters with @Param — safe
    // :category is a bind parameter; Hibernate never interpolates it into the SQL string
    @Query("SELECT p FROM Product p WHERE p.category = :category AND p.price <= :maxPrice")
    List<Product> findByCategoryAndMaxPrice(
        @Param("category") String category,
        @Param("maxPrice") BigDecimal maxPrice
    );

    // LIKE queries — parameterised with % in the value, not in the query template
    // The % is part of the string value, not SQL syntax
    @Query("SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :searchTerm, '%'))")
    List<Product> searchByName(@Param("searchTerm") String searchTerm);
}
```

**Native queries — always use parameterised form:**
```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Native query — safe because :email is a bind parameter, not concatenation
    // Use native queries only when JPQL cannot express the query (window functions, CTEs)
    @Query(value = "SELECT * FROM users WHERE email = :email AND status = :status",
           nativeQuery = true)
    List<User> findByEmailNative(
        @Param("email") String email,
        @Param("status") String status
    );
}
```

**EntityManager with parameterised queries — safe:**
```java
@Repository
@RequiredArgsConstructor
public class UserSearchRepository {

    private final EntityManager em;

    // Safe: query template separate from parameters, using setParameter
    public List<User> searchUsers(String searchTerm) {
        // Query template is a fixed string — only the parameter value comes from user input
        TypedQuery<User> query = em.createQuery(
            "SELECT u FROM User u WHERE u.username LIKE :searchPattern",
            User.class
        );
        // setParameter binds the value as a parameter — never as SQL
        query.setParameter("searchPattern", "%" + searchTerm.replace("%", "\\%") + "%");
        return query.getResultList();
    }

    // Safe pattern for dynamic ORDER BY — use allowlist approach, never user input directly
    public List<Product> getProducts(String sortColumn) {
        // Allowlist: only accept known safe column names
        // Everything not in this set is rejected — no user input ever reaches the SQL string
        Set<String> allowedColumns = Set.of("price", "name", "created_at", "rating");
        if (!allowedColumns.contains(sortColumn)) {
            throw new IllegalArgumentException("Invalid sort column: " + sortColumn);
        }
        // sortColumn is now guaranteed to be one of our known safe column names
        // Still not ideal to concatenate — use Criteria API for truly dynamic queries
        TypedQuery<Product> query = em.createQuery(
            "SELECT p FROM Product p ORDER BY p." + sortColumn,  // safe: value is from allowlist
            Product.class
        );
        return query.getResultList();
    }
}
```

**JdbcTemplate — safe parameterised form:**
```java
@Repository
@RequiredArgsConstructor
public class ReportRepository {

    private final JdbcTemplate jdbcTemplate;

    // Safe: ? placeholder, values array — JDBC bind parameters
    public List<Map<String, Object>> getOrdersByDateRange(LocalDate from, LocalDate to) {
        String sql = "SELECT order_id, total, created_at FROM orders " +
                     "WHERE created_at BETWEEN ? AND ?";
        // jdbcTemplate.query binds from and to as parameters — never as SQL fragments
        return jdbcTemplate.queryForList(sql, from, to);
    }

    // Safe: named parameters with NamedParameterJdbcTemplate
    public List<Map<String, Object>> getProductsByCategory(String category) {
        String sql = "SELECT * FROM products WHERE category = :category";
        MapSqlParameterSource params = new MapSqlParameterSource();
        params.addValue("category", category);  // bound as parameter
        NamedParameterJdbcTemplate namedJdbc = new NamedParameterJdbcTemplate(jdbcTemplate);
        return namedJdbc.queryForList(sql, params);
    }
}
```

**Criteria API — truly dynamic queries without any SQL string building:**
```java
@Repository
@RequiredArgsConstructor
public class ProductSearchRepository {

    private final EntityManager em;

    // Safe: Criteria API builds queries programmatically — no SQL strings, no injection risk
    // Use this for truly dynamic queries where the predicates depend on user-provided filters
    public List<Product> search(ProductFilter filter) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        CriteriaQuery<Product> query = cb.createQuery(Product.class);
        Root<Product> product = query.from(Product.class);

        List<Predicate> predicates = new ArrayList<>();

        // Each filter is added as a type-safe Criteria predicate — never SQL concatenation
        if (filter.getCategory() != null) {
            // cb.equal creates a parameterised predicate: WHERE category = ?
            predicates.add(cb.equal(product.get("category"), filter.getCategory()));
        }
        if (filter.getMaxPrice() != null) {
            predicates.add(cb.lessThanOrEqualTo(product.get("price"), filter.getMaxPrice()));
        }
        if (filter.getSearchTerm() != null) {
            predicates.add(cb.like(
                cb.lower(product.get("name")),
                "%" + filter.getSearchTerm().toLowerCase().replace("%", "\\%") + "%"
            ));
        }

        query.where(predicates.toArray(new Predicate[0]));

        // Dynamic ORDER BY — safe: using metamodel or allowlisted field names
        if (filter.getSortField() != null) {
            query.orderBy(filter.getSortAscending()
                ? cb.asc(product.get(filter.getSortField()))
                : cb.desc(product.get(filter.getSortField()))
            );
        }

        return em.createQuery(query).getResultList();
    }
}
```

> **Key decisions here:**
> - Use Spring Data derived query methods as the default — they are automatically safe and eliminate the boilerplate of writing JPQL manually
> - When JPQL is necessary, always use named parameters (`@Param` + `:name`), never string concatenation or SpEL interpolation
> - For dynamic ORDER BY (which cannot be parameterised even in standard SQL), use an allowlist — reject any value not in a known-safe set
> - Criteria API is the correct approach for truly dynamic queries with optional filter combinations; it generates parameterised SQL and can handle any combination of filters without string building
> - `%` in LIKE patterns must be escaped in user input: replace `%` with `\%` in the search term to prevent users from broadening queries beyond their intended scope (though this is a correctness concern as much as a security one)

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is SQL injection and why does Spring Data JPA protect against it by default?"

**Hruday's answer:**
> SQL injection is when user-supplied input is concatenated into a SQL query string and the database executes the attacker's SQL fragments as real commands. The classic example is a login form where the attacker puts `' OR 1=1--` into the username field — if the app concatenates this directly into the query, the `OR 1=1` makes the password check irrelevant and returns all users.
>
> Spring Data JPA protects against this by default because it never builds SQL through string concatenation. When you write `findByEmail(String email)`, Spring Data generates a JPQL query with a bind parameter: `WHERE u.email = ?1`. This template goes to the database separately from the email value. The database treats the email as a literal string value — it never parses it as SQL syntax. `' OR 1=1--` becomes a search for a user whose email is literally that string, which finds nothing.
>
> The risk in Spring apps is not derived queries or standard JPQL — it's when engineers use `EntityManager.createNativeQuery()` or `JdbcTemplate.query()` with string concatenation because they think "I need to optimise this query." That's where proper parameterisation habits matter.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do you safely implement a dynamic search that can filter by any combination of optional fields?"

**Hruday's answer:**
> The Criteria API is the right tool here. I build a list of predicates conditionally based on which filters are provided, then combine them into a single `WHERE` clause. Every predicate is created via `CriteriaBuilder` methods like `cb.equal()`, `cb.like()`, `cb.between()` — these generate parameterised SQL internally. At no point is user input concatenated into a SQL string.
>
> For example, a product search with optional category, max price, and keyword: I start with an empty predicates list, add a category predicate only if category is provided, add a price predicate only if maxPrice is provided, and so on. The Criteria API handles the parameter binding automatically.
>
> The one edge case is dynamic ORDER BY. SQL parameter binding doesn't support column names as parameters — only values. So for dynamic sort columns, I use an allowlist: a `Set<String>` of permitted field names. If the requested sort column isn't in the set, I reject the request. Only values that match a developer-defined name reach the query. This combines type safety with injection prevention.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use a native query over JPQL, and what extra care is required?"

**Hruday's answer:**
> I'd use a native query when the database feature I need isn't expressible in JPQL. Window functions like `ROW_NUMBER() OVER (PARTITION BY ...)`, CTEs (`WITH ... AS`), database-specific JSON operators, or performance hints like `FORCE INDEX` — none of these are available in JPQL. When the query optimiser needs to use a specific index for a time-critical report, native SQL gives me that control.
>
> The extra care required is: always use named parameters. Never concatenate user input at any point. The Spring Data `@Query(nativeQuery = true, value = "SELECT ... WHERE x = :param")` with `@Param("param")` is safe. The `:param` placeholder is handled by Hibernate as a JDBC bind parameter, same as in JPQL.
>
> For dynamic elements like ORDER BY in native queries — same allowlist approach. I'd also add a unit test for each native query that verifies a SQL injection attempt returns zero results and no exception — that test failing in CI would catch any accidental regression.

---

### Q4 — Scenario
**Interviewer asks:** "An engineer on your team submits a PR with a search endpoint using `em.createNativeQuery("SELECT * FROM products WHERE name LIKE '%" + searchTerm + "%'")`. How do you respond?"

**Hruday's answer:**
> I'd reject the PR and explain why with a specific code example showing the safe alternative.
>
> The problem: `searchTerm` coming from `@RequestParam` or `@RequestBody` is user input. If it contains `%'; DROP TABLE products; --`, the string becomes:
> `SELECT * FROM products WHERE name LIKE '%'; DROP TABLE products; --%'`
> Which drops the products table.
>
> The fix is parameterisation. For native queries: `em.createNativeQuery("SELECT * FROM products WHERE name LIKE :pattern").setParameter("pattern", "%" + searchTerm.replace("%", "\\%") + "%")`. Or better, switch to a JPQL derived query with `findByNameContainingIgnoreCase()` which is generated automatically and is safe by construction.
>
> I'd also ask in the PR: is native SQL necessary here? If JPQL covers this use case, there's no reason to use native SQL. The derived query approach eliminates the class of error entirely rather than requiring the developer to remember to use parameters correctly.
>
> This is exactly the code review process we followed at SAP — every native query required a reviewer to check for parameterisation; we added it to the code review checklist.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "JPA prevents SQL injection" | "JPA is safe, nothing to worry about" | JPA derived queries and JPQL are safe; native queries with string concatenation are not — and this is common in production codebases |
| Dynamic ORDER BY | "Use parameters for ORDER BY too" | ORDER BY column names cannot be parameterised — use an allowlist of known safe column names; parameters only work for values, not identifiers |
| LIKE injection | "String concatenation in LIKE patterns is fine, % is not dangerous" | `%` in user input can broaden the query beyond intent; `'; DROP TABLE` after a quote can still inject; always use parameterised patterns |
| SpEL in JPQL | "SpEL #{} in @Query gives flexibility" | SpEL interpolation in @Query is NOT the same as parameterised queries — it interpolates before query compilation; use :named parameters, not SpEL for values |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I reviewed a data export service that built native SQL queries for complex reporting — filtering by date ranges, product categories, and user segments. The initial implementation used string concatenation for all three filters. During a security code review, I flagged this and rewrote the queries using `NamedParameterJdbcTemplate` with proper bind parameters. For the dynamic ORDER BY requirement, I implemented an allowlist `EnumSet` of permitted sort columns. I also added parameterised query tests that verified SQL injection payloads in every parameter returned empty results rather than executing. This change was incorporated into our team's security code review checklist for all future native query PRs."

---

## 8. Scale Evolution

**1,000 users/day →** SQL injection risk is the same regardless of scale — one successful injection can exfiltrate the entire database in seconds. Parameterised queries everywhere, always. Use Spring Data derived methods as the default; native queries only when genuinely needed.

**100,000 users/day →** Add SAST scanning to CI/CD (SonarQube, Snyk) that flags any use of string concatenation in SQL queries, `EntityManager.createNativeQuery` with non-literal strings, or `JdbcTemplate.query` with concatenated arguments. Make failing the SAST check a build blocker, not just a warning.

**10 million users/day →** Database account has minimum privileges — your application DB user can only SELECT/INSERT/UPDATE/DELETE on the tables it owns; no DROP, no TRUNCATE, no FILE access. Even if injection succeeds, the damage is bounded by the DB account's privileges. Web Application Firewall (WAF) with SQL injection detection catches and blocks obvious injection attempts at the network layer before they reach your application.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payments, KYC, transaction history — these are high-value tables that SQL injection directly targets; financial data regulations require injection prevention explicitly | Know Criteria API for dynamic queries and JPQL named parameters cold |
| Swiggy / Meesho | Product search, order history, user profiles — search endpoints with user input are the main injection surface | Understand how LIKE queries with user input are safely parameterised |
| Adobe / Microsoft | Enterprise data services handling customer data at massive scale — SQL injection is a compliance violation (SOC 2, GDPR) in addition to a technical vulnerability | Know the entire chain: derived queries → JPQL → JdbcTemplate → Criteria API, each safer approach for each use case |
| SAP Labs | Enterprise database applications often have complex native queries for reporting — this is where the injection risk actually lives | Demonstrate awareness that the risk is in native queries, not JPQL, and know the allowlist pattern for dynamic ORDER BY |

---

## 10. Related Topics — What to Study Next

- **Topic 169 — OWASP Top 10** — SQL injection is OWASP A03: Injection; seeing it in the full OWASP context explains the complete injection threat landscape including OS command injection and LDAP injection
- **Topic 165 — XSS** — XSS and SQLi are the two most common injection attacks; OWASP A03 covers both; comparing them in a single answer is a strong interview move
- **Topic 176 — Secrets management** — database credentials that the injected SQL might itself expose (SELECT @@hostname, reading connection strings from config tables) — part of the same threat model
- **Topic 103 — Spring Data JPA** (if created) — full coverage of derived queries, projections, and specifications that eliminate native SQL needs for most use cases
- **Topic 168 — CORS** — the next module-10.1 topic covering cross-origin request control, completing the web security threats module

---

*Part 10 · SQL Injection — Prevention in Spring/JPA · Full Stack Interview Guide · Hruday D · 2026*
