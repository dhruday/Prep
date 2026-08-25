# 65. Normalization vs Denormalization

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Normalization?

**Normalization** is the process of organizing database schema to **minimize data redundancy** and **ensure data integrity** by dividing data into related tables.

**Without Normalization (Redundant Data)**:
```
Orders Table:
order_id | customer_name | customer_email | customer_phone | product_name | product_price
---------|---------------|----------------|----------------|--------------|---------------
1        | John Doe      | john@email.com | 555-1234       | Laptop       | $1000
2        | John Doe      | john@email.com | 555-1234       | Mouse        | $20
3        | Jane Smith    | jane@email.com | 555-5678       | Keyboard     | $50

Problems:
❌ Customer info repeated (John Doe appears twice)
❌ Update anomaly: If John changes email, must update ALL his orders
❌ Wasted storage (duplicate data)
❌ Inconsistency risk: Update email in row 1 but forget row 2
```

**With Normalization (No Redundancy)**:
```
Customers Table:
customer_id | name       | email          | phone
------------|------------|----------------|----------
1           | John Doe   | john@email.com | 555-1234
2           | Jane Smith | jane@email.com | 555-5678

Products Table:
product_id | name     | price
-----------|----------|-------
101        | Laptop   | $1000
102        | Mouse    | $20
103        | Keyboard | $50

Orders Table:
order_id | customer_id (FK) | product_id (FK)
---------|------------------|----------------
1        | 1                | 101
2        | 1                | 102
3        | 2                | 103

Benefits:
✅ No duplicate data
✅ Update email once in customers table
✅ Less storage
✅ Data consistency guaranteed
```

### What is Denormalization?

**Denormalization** is the deliberate introduction of redundancy to **improve query performance** by reducing JOINs.

**Normalized (Requires JOIN)**:
```sql
-- Get order with customer and product details
SELECT o.order_id, c.name, c.email, p.name, p.price
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN products p ON o.product_id = p.product_id
WHERE o.order_id = 1;

-- Performance: 3 tables, 2 JOINs, ~10-20ms
```

**Denormalized (No JOIN)**:
```sql
-- Orders table with duplicated data
CREATE TABLE orders_denorm (
    order_id INT PRIMARY KEY,
    customer_id INT,
    customer_name VARCHAR(100),  -- Denormalized from customers
    customer_email VARCHAR(100), -- Denormalized from customers
    product_id INT,
    product_name VARCHAR(100),   -- Denormalized from products
    product_price DECIMAL(10,2)  -- Denormalized from products
);

-- Query without JOIN
SELECT order_id, customer_name, customer_email, product_name, product_price
FROM orders_denorm
WHERE order_id = 1;

-- Performance: 1 table, 0 JOINs, ~2-5ms (2-4x faster)
```

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### Normal Forms (1NF → 3NF → BCNF)

**First Normal Form (1NF)**: Atomic values, no repeating groups

**Violates 1NF**:
```
Orders Table:
order_id | customer | products
---------|----------|----------------------------------
1        | John     | "Laptop, Mouse, Keyboard"  ← Multiple values in one column
```

**1NF Compliant**:
```
Orders Table:
order_id | customer | product
---------|----------|----------
1        | John     | Laptop
1        | John     | Mouse
1        | John     | Keyboard
```

---

**Second Normal Form (2NF)**: 1NF + No partial dependencies (all non-key columns depend on entire primary key)

**Violates 2NF**:
```
Order_Items Table:
order_id | product_id | product_name | product_price | quantity
---------|------------|--------------|---------------|----------
1        | 101        | Laptop       | $1000         | 1
1        | 102        | Mouse        | $20           | 2

Problem: product_name and product_price depend only on product_id (partial dependency)
Composite PK: (order_id, product_id)
```

**2NF Compliant**:
```
Products Table:
product_id | product_name | product_price
-----------|--------------|---------------
101        | Laptop       | $1000
102        | Mouse        | $20

Order_Items Table:
order_id | product_id (FK) | quantity
---------|-----------------|----------
1        | 101             | 1
1        | 102             | 2

Now: All non-key columns (quantity) depend on entire PK (order_id, product_id)
```

---

**Third Normal Form (3NF)**: 2NF + No transitive dependencies (non-key columns depend only on PK, not on other non-key columns)

**Violates 3NF**:
```
Employees Table:
employee_id | name       | department_id | department_name | department_head
------------|------------|---------------|-----------------|------------------
1           | John Doe   | 10            | Engineering     | Jane Smith
2           | Bob Lee    | 10            | Engineering     | Jane Smith

Problem: department_name depends on department_id (transitive dependency)
employee_id → department_id → department_name
```

**3NF Compliant**:
```
Departments Table:
department_id | department_name | department_head
--------------|-----------------|------------------
10            | Engineering     | Jane Smith
20            | Sales           | Tom Brown

Employees Table:
employee_id | name       | department_id (FK)
------------|------------|--------------------
1           | John Doe   | 10
2           | Bob Lee    | 10

Now: All non-key columns depend directly on PK (no transitive dependencies)
```

---

**Boyce-Codd Normal Form (BCNF)**: Stricter 3NF (every determinant is a candidate key)

**Violates BCNF** (but satisfies 3NF):
```
Class_Schedule Table:
student_id | course | instructor
-----------|--------|-------------
1          | Math   | Dr. Smith
1          | CS     | Dr. Jones
2          | Math   | Dr. Smith

Functional dependencies:
- (student_id, course) → instructor (normal)
- instructor → course (unusual: each instructor teaches only one course)

Problem: instructor → course, but instructor is not a candidate key
```

**BCNF Compliant**:
```
Instructor_Courses Table:
instructor | course
-----------|--------
Dr. Smith  | Math
Dr. Jones  | CS

Student_Classes Table:
student_id | instructor (FK)
-----------|----------------
1          | Dr. Smith
1          | Dr. Jones
2          | Dr. Smith

Now: Every determinant is a candidate key
```

---

### When to Denormalize

**Scenario 1: Read-Heavy Workloads**

```sql
-- Normalized (e-commerce)
-- 99% reads (view order), 1% writes (create order)

-- Query: Get order details
SELECT o.order_id, 
       c.name AS customer_name,
       c.email AS customer_email,
       p.name AS product_name,
       p.price AS product_price,
       oi.quantity
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.order_id = 12345;

-- Performance: 4 tables, 3 JOINs, ~15-30ms (at scale)
-- With 1M orders/day: 15ms × 99% reads = significant overhead

-- Denormalized approach
CREATE TABLE orders_denorm (
    order_id INT PRIMARY KEY,
    customer_id INT,
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    product_id INT,
    product_name VARCHAR(100),
    product_price DECIMAL(10,2),
    quantity INT,
    
    -- Still keep FKs for referential integrity
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Query without JOINs
SELECT order_id, customer_name, customer_email, product_name, product_price, quantity
FROM orders_denorm
WHERE order_id = 12345;

-- Performance: 1 table, 0 JOINs, ~3-5ms (3-10x faster)
```

**Trade-off**:
- ✅ Read performance: 3-10x faster (no JOINs)
- ❌ Write complexity: Update customer email in 2 places (customers + all their orders)
- ❌ Storage: Duplicate data (~30% more storage)

**When worth it**:
- Read:Write ratio > 100:1 (e.g., order history viewed often, rarely updated)
- JOINs cause performance issues (> 20ms queries)
- Storage cost < developer time cost

---

**Scenario 2: Aggregated Data**

```sql
-- Normalized: Count orders per user (slow on large tables)
SELECT user_id, COUNT(*) AS order_count
FROM orders
WHERE user_id = 123;
-- Performance: COUNT(*) on 100M rows, ~50-200ms

-- Denormalized: Store count in users table
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    order_count INT DEFAULT 0  -- Denormalized aggregate
);

-- Trigger to maintain count
CREATE TRIGGER update_order_count
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    UPDATE users SET order_count = order_count + 1
    WHERE user_id = NEW.user_id;
END;

-- Query is now instant
SELECT order_count FROM users WHERE user_id = 123;
-- Performance: Simple lookup, ~1-2ms (50-200x faster)
```

---

**Scenario 3: Snapshot/Historical Data**

```sql
-- Problem: Product price changes, but order should show price at purchase time

-- Normalized (wrong approach)
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    product_id INT REFERENCES products(product_id),
    quantity INT
    -- Missing: price at purchase time
);

-- Query price
SELECT o.order_id, p.price * o.quantity AS total
FROM orders o
JOIN products p ON o.product_id = p.product_id;

-- Problem: If product price changes, historical orders show wrong price!

-- Denormalized (correct approach)
CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    product_id INT REFERENCES products(product_id),
    quantity INT,
    price_at_purchase DECIMAL(10,2)  -- Denormalized: snapshot of price
);

-- On insert, copy current price
INSERT INTO orders (product_id, quantity, price_at_purchase)
VALUES (101, 2, (SELECT price FROM products WHERE product_id = 101));

-- Query always shows correct historical price
SELECT order_id, price_at_purchase * quantity AS total
FROM orders;
```

---

### Materialized Views (Denormalization Alternative)

```sql
-- Instead of denormalizing tables, use materialized views

-- Normalized tables (unchanged)
CREATE TABLE orders (...);
CREATE TABLE customers (...);
CREATE TABLE products (...);

-- Materialized view (pre-computed JOINs)
CREATE MATERIALIZED VIEW order_details AS
SELECT o.order_id,
       c.customer_id,
       c.name AS customer_name,
       c.email AS customer_email,
       p.product_id,
       p.name AS product_name,
       p.price AS product_price,
       oi.quantity
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id;

-- Query materialized view (fast, no JOINs)
SELECT * FROM order_details WHERE order_id = 12345;
-- Performance: ~3-5ms (same as denormalized table)

-- Refresh strategy
-- Option 1: Manual refresh (control when)
REFRESH MATERIALIZED VIEW order_details;

-- Option 2: Automatic refresh (PostgreSQL)
REFRESH MATERIALIZED VIEW CONCURRENTLY order_details;  -- No locks

-- Option 3: Scheduled refresh (cron job)
-- Refresh every hour
0 * * * * psql -c "REFRESH MATERIALIZED VIEW order_details"
```

**Advantages over denormalization**:
- ✅ Base tables remain normalized (data integrity)
- ✅ Refresh control (refresh when needed, not on every write)
- ✅ Multiple views (different denormalized views for different queries)

**Disadvantages**:
- ❌ Stale data (view not real-time unless refreshed frequently)
- ❌ Refresh cost (full recompute on each refresh)

---

## 3. Capacity Planning & Estimation (When Applicable)

### Storage Comparison: Normalized vs Denormalized

**Scenario**: E-commerce with 1M customers, 10M orders

**Normalized Schema**:
```
Customers: 1M rows × 200 bytes = 200 MB
Products: 100K rows × 300 bytes = 30 MB
Orders: 10M rows × 100 bytes = 1 GB
Order_Items: 30M rows × 50 bytes = 1.5 GB

Total: 200 MB + 30 MB + 1 GB + 1.5 GB = 2.73 GB
```

**Denormalized Schema** (customer + product info in orders):
```
Orders_Denorm: 30M rows × 150 bytes = 4.5 GB
  (includes customer_name, customer_email, product_name, product_price)

Customers: 1M rows × 200 bytes = 200 MB (still need for updates)
Products: 100K rows × 300 bytes = 30 MB (still need for updates)

Total: 4.5 GB + 200 MB + 30 MB = 4.73 GB
```

**Difference**: 4.73 GB - 2.73 GB = **2 GB more (73% increase)**

**Cost**:
- Storage (AWS RDS): $0.115/GB/month
- Additional cost: 2 GB × $0.115 = $0.23/month (negligible)

**Performance Gain**:
- Normalized query: 15ms (with JOINs)
- Denormalized query: 3ms (no JOINs)
- Speedup: 5x faster

**ROI**:
- 10M orders viewed per day
- Time saved: 10M × (15ms - 3ms) = 120M ms = 33 hours/day (server CPU time)
- Server cost: $100/month (t3.medium)
- Time saved worth: ~$50/month (half a server)

**Conclusion**: $0.23/month storage cost to save $50/month server cost → **Worth it!**

---

## 4. Data & Storage Design

### Hybrid Approach: Partially Denormalized

```sql
-- Best practice: Denormalize frequently accessed data, keep rarely changed data normalized

CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    
    -- Foreign keys (normalized)
    customer_id INTEGER REFERENCES customers(customer_id),
    
    -- Denormalized (frequently accessed, rarely changed)
    customer_name VARCHAR(100),  -- Denormalized for fast display
    customer_email VARCHAR(100), -- Denormalized for fast display
    
    -- Normalized (rarely accessed)
    -- customer_phone, customer_address stored only in customers table
    
    -- Foreign key (normalized)
    product_id INTEGER REFERENCES products(product_id),
    
    -- Denormalized (snapshot, must not change)
    product_name VARCHAR(200),
    product_price DECIMAL(10,2),  -- Price at purchase time
    
    quantity INTEGER,
    total_amount DECIMAL(10,2),
    created_at TIMESTAMP
);

-- Triggers to keep denormalized data in sync
CREATE TRIGGER sync_customer_name
AFTER UPDATE OF name ON customers
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET customer_name = NEW.name 
    WHERE customer_id = NEW.customer_id;
END;

-- But: Don't sync product_price (historical snapshot, should NOT change)
```

**Guidelines**:
1. **Denormalize** frequently read, rarely updated (e.g., customer name)
2. **Keep normalized** frequently updated (e.g., customer balance)
3. **Snapshot** historical data (e.g., price at purchase)
4. **Never denormalize** sensitive data (e.g., passwords, SSN)

---

## 5. Scalability, Reliability & Fault Tolerance

### Maintaining Consistency in Denormalized Systems

**Problem**: Customer changes email → Must update customers + all orders tables

**Solution 1: Application-Level Update**:
```python
def update_customer_email(customer_id, new_email):
    # Start transaction
    with db.begin():
        # Update customers table
        db.execute(
            "UPDATE customers SET email = %s WHERE customer_id = %s",
            (new_email, customer_id)
        )
        
        # Update denormalized orders table
        db.execute(
            "UPDATE orders SET customer_email = %s WHERE customer_id = %s",
            (new_email, customer_id)
        )
        
        # If either fails, both rollback (transaction atomicity)
```

**Solution 2: Database Triggers**:
```sql
CREATE TRIGGER sync_customer_email
AFTER UPDATE OF email ON customers
FOR EACH ROW
BEGIN
    UPDATE orders 
    SET customer_email = NEW.email 
    WHERE customer_id = NEW.customer_id;
END;

-- Automatically syncs denormalized data
-- But: Triggers can slow down updates, hard to debug
```

**Solution 3: Event-Driven Sync** (for high-scale):
```python
# Producer (when customer updates)
def update_customer_email(customer_id, new_email):
    db.execute("UPDATE customers SET email = %s WHERE customer_id = %s",
               (new_email, customer_id))
    
    # Publish event
    kafka.produce('customer_updated', {
        'customer_id': customer_id,
        'email': new_email
    })

# Consumer (async worker)
@kafka.consumer('customer_updated')
def sync_orders(event):
    db.execute("UPDATE orders SET customer_email = %s WHERE customer_id = %s",
               (event['email'], event['customer_id']))

# Pros: Non-blocking, scales horizontally
# Cons: Eventual consistency (orders updated after delay)
```

---

## 6. Security, APIs & Governance

### Denormalization Risks

**Risk 1: Data Leakage**:
```sql
-- Normalized: Permission check on customers table
SELECT * FROM customers WHERE customer_id = 123 AND user_has_permission(123);

-- Denormalized: Customer data in orders table
SELECT customer_email FROM orders WHERE order_id = 456;
-- Problem: User might not have permission to view customer 123's email,
-- but can access via orders table (permission bypass!)

-- Solution: Apply same permission checks to denormalized tables
SELECT customer_email FROM orders 
WHERE order_id = 456 
  AND user_has_permission(customer_id);
```

**Risk 2: Inconsistency**:
```sql
-- If sync fails, denormalized data becomes stale
customers.email = "new@email.com"
orders.customer_email = "old@email.com"  -- Out of sync!

-- Solution: Periodic reconciliation job
SELECT o.order_id, o.customer_email, c.email
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.customer_email != c.email;
-- Alerts: Fix inconsistencies

-- Auto-fix (run weekly)
UPDATE orders o
SET customer_email = (SELECT email FROM customers WHERE customer_id = o.customer_id)
WHERE customer_email != (SELECT email FROM customers WHERE customer_id = o.customer_id);
```

---

## 7. Real-World Examples & Case Studies

### Facebook: Denormalized for Speed

**Problem**: Newsfeed query too slow with normalized schema

**Normalized (slow)**:
```sql
-- Get posts from friends
SELECT p.post_id, p.content, u.name, u.profile_pic
FROM posts p
JOIN friendships f ON p.user_id = f.friend_id
JOIN users u ON p.user_id = u.user_id
WHERE f.user_id = 123
ORDER BY p.created_at DESC
LIMIT 20;

-- Performance: 3 JOINs on 1B+ posts, 500M+ friendships, 2B+ users
-- Result: 500-1000ms (too slow)
```

**Denormalized (fast)**:
```
Newsfeed Table (pre-computed):
user_id | post_id | author_name | author_pic | content | created_at
--------|---------|-------------|------------|---------|------------
123     | 999     | John Doe    | pic.jpg    | Hello!  | 2024-01-01
123     | 998     | Jane Smith  | pic2.jpg   | Hi!     | 2024-01-01

-- Query: Simple lookup (no JOINs)
SELECT * FROM newsfeed WHERE user_id = 123 ORDER BY created_at DESC LIMIT 20;

-- Performance: ~5-10ms (50-100x faster)

-- Maintenance: When friend posts, insert into newsfeed table for all their friends
-- Write amplification: 1 post → 1000 friends → 1000 inserts
-- But: Writes are async (background workers), reads are instant
```

---

### Amazon: Price Snapshot in Orders

**Problem**: Product price changes, but orders must show historical price

**Wrong (normalized)**:
```sql
-- Orders table
order_id | product_id | quantity
---------|------------|----------
1        | 101        | 2

-- Products table
product_id | name   | price
-----------|--------|-------
101        | Laptop | $1200  -- Price changed from $1000 to $1200

-- Query order total
SELECT o.order_id, p.price * o.quantity AS total
FROM orders o
JOIN products p ON o.product_id = p.product_id
WHERE o.order_id = 1;

-- Result: 2 × $1200 = $2400
-- Problem: Customer paid $2000, but query shows $2400 (wrong!)
```

**Correct (denormalized snapshot)**:
```sql
-- Orders table
order_id | product_id | quantity | price_at_purchase
---------|------------|----------|-------------------
1        | 101        | 2        | $1000  -- Snapshot

-- Query order total (no JOIN needed)
SELECT order_id, price_at_purchase * quantity AS total
FROM orders
WHERE order_id = 1;

-- Result: 2 × $1000 = $2000 (correct!)
```

**Key lesson**: Historical/snapshot data must be denormalized (never JOIN to get current price for past order).

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Explain normalization vs denormalization"

**Structured Answer**:

**"Normalization organizes data to minimize redundancy and ensure integrity. Denormalization intentionally adds redundancy to improve read performance."**

**Normalization (3NF)**:
```
Customers table: customer_id, name, email
Orders table: order_id, customer_id (FK), total
Order_Items table: order_id, product_id (FK), quantity

Benefits:
✅ No duplicate data (customer email stored once)
✅ Update once (change email in one place)
✅ Data integrity (foreign keys enforce relationships)

Drawbacks:
❌ Slow reads (requires JOINs to get order with customer name)
❌ Complex queries (3-4 table JOINs common)
```

**Denormalization**:
```
Orders table: order_id, customer_id, customer_name, customer_email, product_name, price, quantity

Benefits:
✅ Fast reads (no JOINs, 5-10x faster)
✅ Simple queries (SELECT * FROM orders)

Drawbacks:
❌ Duplicate data (customer email in every order)
❌ Update complexity (change email in customers + all orders)
❌ Inconsistency risk (if sync fails)
```

**When to denormalize**:
1. Read:Write ratio > 100:1 (read-heavy workload)
2. JOINs cause performance issues (> 20ms queries)
3. Frequently accessed, rarely updated data (e.g., customer name)
4. Historical data (price at purchase must not change)

**Real-world: Amazon denormalizes price in orders (snapshot at purchase). Facebook denormalizes newsfeed (pre-computed, no JOINs)."**

---

### Follow-Up 1: "How do you maintain consistency in denormalized systems?"

**Answer**:

**"Three strategies: Application-level updates, database triggers, event-driven sync."**

**1. Application-Level (Most Control)**:
```python
# Update in transaction (atomic)
with db.begin():
    db.execute("UPDATE customers SET email = %s WHERE id = %s", (email, id))
    db.execute("UPDATE orders SET customer_email = %s WHERE customer_id = %s", (email, id))

# If either fails, both rollback
# Pros: Full control, explicit
# Cons: Must remember to update all places (error-prone)
```

**2. Database Triggers (Automatic)**:
```sql
CREATE TRIGGER sync_email
AFTER UPDATE ON customers
FOR EACH ROW
UPDATE orders SET customer_email = NEW.email WHERE customer_id = NEW.customer_id;

# Pros: Automatic, can't forget
# Cons: Hidden logic (hard to debug), slows down writes, cascading triggers risky
```

**3. Event-Driven (High Scale)**:
```python
# Update customers, publish event
db.execute("UPDATE customers SET email = %s", email)
kafka.publish('customer_updated', {'customer_id': id, 'email': email})

# Background worker syncs orders
@consumer('customer_updated')
def sync_orders(event):
    db.execute("UPDATE orders SET customer_email = %s WHERE customer_id = %s")

# Pros: Non-blocking, scales horizontally, eventual consistency acceptable
# Cons: Delay between update and sync (eventual consistency, not immediate)
```

**Recommendation**: Start with application-level (simple, explicit). Use event-driven at scale (millions of updates/day).

**Reconciliation**: Run periodic job to detect inconsistencies:
```sql
SELECT * FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.customer_email != c.email;
-- Alerts: Fix inconsistencies
```

---

### Follow-Up 2: "When would you NOT denormalize?"

**Answer**:

**"Don't denormalize if:**

**1. Write-Heavy Workload**:
```
If write:read ratio > 1:10, denormalization costs more than it saves

Example: Real-time analytics (millions of writes/sec)
- Normalized: 1 write updates 1 row
- Denormalized: 1 write updates 10 rows (write amplification)
- Result: 10x slower writes, not worth it
```

**2. Frequently Updated Data**:
```
Example: User balance (changes often)
- Normalized: Update balance in users table
- Denormalized: Update balance in users + all transactions (thousands of rows)
- Result: Slow updates, high risk of inconsistency

Rule: Only denormalize rarely updated data (name, email OK; balance, status NO)
```

**3. Strong Consistency Required**:
```
Example: Financial transactions (must be immediately consistent)
- Denormalized: Eventual consistency (lag between sync)
- Risk: Transfer $100 from Account A to B, denormalized balance shows $200 (both have $100) temporarily
- Solution: Keep normalized (ACID transactions)
```

**4. Storage Cost > Query Cost**:
```
Example: Large BLOB data (images, videos)
- Denormalized: Copy 10 MB image to every row → 1M rows = 10 TB (expensive)
- Normalized: Store image once, reference via FK → 10 MB (cheap)

Rule: Don't denormalize large data (> 1 KB per column)
```

**5. Complex Relationships (Many-to-Many)**:
```
Example: Students ←→ Courses
- Denormalized: Store list of courses in students table (array/JSON)
- Problem: Hard to query "all students in Math 101" (can't index JSON efficiently)
- Solution: Keep normalized (join table: enrollments)
```

**Best practice: Normalize first (3NF). Denormalize only if performance metrics show JOINs are bottleneck (> 20ms queries) AND read:write > 100:1."**

---

### Follow-Up 3: "What's the difference between denormalization and materialized views?"

**Answer**:

**"Both improve read performance, but materialized views keep base tables normalized."**

**Denormalization**:
```sql
-- Physically store redundant data
CREATE TABLE orders (
    order_id INT,
    customer_id INT,
    customer_name VARCHAR(100),  -- Redundant
    customer_email VARCHAR(100)  -- Redundant
);

-- Base tables (customers) also have this data
-- Must sync on every write
UPDATE customers SET name = 'John Smith' WHERE id = 123;
UPDATE orders SET customer_name = 'John Smith' WHERE customer_id = 123;  -- Sync
```

**Materialized Views**:
```sql
-- Base tables remain normalized
CREATE TABLE orders (order_id, customer_id);  -- No redundancy
CREATE TABLE customers (customer_id, name, email);

-- Materialized view (pre-computed JOIN)
CREATE MATERIALIZED VIEW order_details AS
SELECT o.order_id, o.customer_id, c.name, c.email
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id;

-- Refresh on schedule (not on every write)
REFRESH MATERIALIZED VIEW order_details;  -- Run every hour
```

**Comparison**:

| Aspect | Denormalization | Materialized Views |
|--------|-----------------|---------------------|
| **Base tables** | Modified (redundant data) | Unchanged (normalized) |
| **Sync timing** | On every write (immediate) | On refresh (scheduled/manual) |
| **Consistency** | Strongly consistent (if synced correctly) | Eventually consistent (stale until refresh) |
| **Flexibility** | Hard to change (schema modification) | Easy (drop/recreate view) |
| **Query performance** | Fast (pre-joined) | Fast (pre-joined) |
| **Write performance** | Slower (multiple updates) | Faster (base tables only) |
| **Use case** | Strong consistency needed | Eventual consistency acceptable |

**Real-world**:
- **Amazon**: Uses denormalization for order history (price_at_purchase must be immediately correct)
- **Analytics dashboards**: Use materialized views (30-minute stale data acceptable, refresh every 30 min)

**Recommendation**: Use materialized views if eventual consistency acceptable (reporting, dashboards). Use denormalization if strong consistency required (transactions, order history)."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Normalization Levels Diagram

```
┌────────────────────────────────────────────────────────────┐
│           NORMALIZATION PROGRESSION (1NF → 3NF)            │
└────────────────────────────────────────────────────────────┘

UNNORMALIZED (Spreadsheet-Style)
═════════════════════════════════════
order_id | customer      | products
---------|---------------|-----------------------------
1        | John, john@x  | Laptop:$1000, Mouse:$20
2        | Jane, jane@y  | Keyboard:$50

Problems:
❌ Multiple values in single column (products)
❌ Composite values (customer name + email together)


1NF (Atomic Values)
═══════════════════════════
order_id | customer_name | customer_email | product   | price
---------|---------------|----------------|-----------|-------
1        | John          | john@x         | Laptop    | $1000
1        | John          | john@x         | Mouse     | $20
2        | Jane          | jane@y         | Keyboard  | $50

Problems Fixed:
✅ Atomic values (each column has single value)

Problems Remaining:
❌ Redundancy (John's email repeated)
❌ Update anomaly (change John's email in 2 places)


2NF (No Partial Dependencies)
═══════════════════════════════════
Customers:
customer_id | name | email
------------|------|--------
1           | John | john@x
2           | Jane | jane@y

Products:
product_id | name     | price
-----------|----------|-------
101        | Laptop   | $1000
102        | Mouse    | $20
103        | Keyboard | $50

Orders:
order_id | customer_id | product_id
---------|-------------|------------
1        | 1           | 101
1        | 1           | 102
2        | 2           | 103

Problems Fixed:
✅ No partial dependencies (all non-key columns depend on entire PK)

Problems Remaining:
❌ Still some redundancy if product info changes


3NF (No Transitive Dependencies)
═════════════════════════════════════
Customers:
customer_id | name | email
------------|------|--------
1           | John | john@x
2           | Jane | jane@y

Products:
product_id | name     | price | category_id
-----------|----------|-------|-------------
101        | Laptop   | $1000 | 1
102        | Mouse    | $20   | 2
103        | Keyboard | $50   | 2

Categories:
category_id | name
------------|-------------
1           | Computers
2           | Accessories

Orders:
order_id | customer_id | product_id
---------|-------------|------------
1        | 1           | 101
1        | 1           | 102
2        | 2           | 103

Problems Fixed:
✅ No transitive dependencies (category_id → category_name removed)
✅ Minimal redundancy
✅ Data integrity enforced
```

### Denormalization Decision Tree

```
┌────────────────────────────────────────────────────────────┐
│          SHOULD YOU DENORMALIZE? (Decision Tree)           │
└────────────────────────────────────────────────────────────┘

                    Start: Schema in 3NF
                            │
                            ↓
                 Are queries slow (> 20ms)?
                    ┌───────┴───────┐
                   No              Yes
                    │               │
                    ↓               ↓
              Keep Normalized   Read:Write ratio?
              (No action)       ┌───────┴───────┐
                               < 10:1         > 100:1
                                │               │
                                ↓               ↓
                          Keep Normalized  Is data frequently updated?
                          (Not worth it)    ┌───────┴───────┐
                                           Yes              No
                                            │               │
                                            ↓               ↓
                                    Keep Normalized   Storage cost acceptable?
                                    (Sync overhead)    ┌───────┴───────┐
                                                      No              Yes
                                                       │               │
                                                       ↓               ↓
                                                Keep Normalized  DENORMALIZE ✅
                                                (Too expensive)
                                                
                                                       │
                                                       ↓
                                            Choose sync strategy:
                                            ┌───────┬────────┬────────┐
                                            │       │        │        │
                                         Trigger  App    Event-  Materialized
                                         (auto) (control) Driven    View
                                                           (scale) (eventual)


EVALUATION CRITERIA:
═══════════════════════

✅ Denormalize if:
   - Query time > 20ms (JOINs bottleneck)
   - Read:Write > 100:1 (read-heavy)
   - Data rarely updated (name, email)
   - Storage cost < 2x (acceptable overhead)
   - Historical snapshot needed (price at purchase)

❌ Don't denormalize if:
   - Query time < 20ms (already fast)
   - Write-heavy workload (updates > reads)
   - Frequently updated data (balance, status)
   - Storage cost > 5x (too expensive)
   - Strong consistency required (transactions)
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why It Matters

**Normalization**:
- ✅ Ensures data integrity (no duplicate data)
- ✅ Easier to update (change once, reflects everywhere)
- ✅ Less storage (no redundancy)
- ❌ Slower reads (JOINs required)

**Denormalization**:
- ✅ Faster reads (5-10x, no JOINs)
- ✅ Simpler queries (SELECT * FROM single table)
- ❌ Duplicate data (30-100% more storage)
- ❌ Update complexity (must sync multiple tables)
- ❌ Inconsistency risk (if sync fails)

### When to Use Each

**Start Normalized (3NF)**:
- Default approach for new systems
- Ensures data integrity
- Easy to maintain

**Denormalize Selectively**:
- Only if performance metrics show slow queries (> 20ms)
- Only for read-heavy workloads (read:write > 100:1)
- Only for rarely updated data (name, email; NOT balance, status)

### Decision Checklist

- [ ] **Measure first**: Profile queries, identify slow JOINs (> 20ms)
- [ ] **Calculate read:write ratio**: If > 100:1, denormalization may help
- [ ] **Assess update frequency**: Only denormalize rarely updated columns
- [ ] **Estimate storage cost**: Ensure < 2x increase acceptable
- [ ] **Choose sync strategy**: Triggers (auto), Application (control), Event-driven (scale)
- [ ] **Implement reconciliation**: Periodic job to detect inconsistencies
- [ ] **Monitor performance**: Verify denormalization improved query time

### Bottom Line

**Normalize by default. Denormalize only when performance metrics prove JOINs are bottleneck (> 20ms queries) AND workload is read-heavy (> 100:1 read:write ratio). For FAANG interviews: Explain trade-offs clearly—denormalization trades write complexity and storage for read performance. Show awareness of sync strategies (triggers, application-level, event-driven) and consistency challenges (reconciliation jobs).**

**Real-world lesson from Netflix**: "We denormalize movie metadata (title, poster) into viewing_history table for fast homepage load (no JOINs). But we keep normalized ratings table (updated frequently). Rule: Denormalize read-heavy, rarely updated data. Never denormalize write-heavy data."

