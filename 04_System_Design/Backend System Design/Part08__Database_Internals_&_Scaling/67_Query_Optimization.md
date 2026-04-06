# 67. Query Optimization

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Query Optimization?

**Query Optimization** is the process of improving database query performance by reducing execution time, resource usage, and data retrieval overhead.

**Slow Query Example**:
```sql
-- Query takes 5 seconds (unoptimized)
SELECT u.name, COUNT(o.order_id) AS order_count
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE u.status = 'active'
GROUP BY u.user_id, u.name
ORDER BY order_count DESC;

-- Problems:
❌ Full table scan on users (1M rows)
❌ Full table scan on orders (10M rows)
❌ Inefficient JOIN (no indexes)
❌ Sorting large result set
```

**Optimized Version**:
```sql
-- Query takes 50ms (100x faster)
-- Add indexes
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Rewrite query (use EXISTS instead of LEFT JOIN for filtering)
SELECT u.name, u.order_count
FROM users u
WHERE u.status = 'active'
ORDER BY u.order_count DESC;

-- Pre-aggregate order_count in users table (denormalized)
-- Updated via trigger when orders inserted
```

### Key Optimization Techniques

| Technique | Impact | Use Case |
|-----------|--------|----------|
| **Add Indexes** | 10-1000x faster | WHERE, JOIN, ORDER BY clauses |
| **Avoid SELECT *** | 2-5x faster | Select only needed columns |
| **Use LIMIT** | 10-100x faster | Paginate large result sets |
| **Optimize JOINs** | 2-10x faster | Index JOIN columns, avoid N+1 |
| **Denormalize** | 5-50x faster | Pre-compute aggregates |
| **Partition Tables** | 10-100x faster | Query only relevant partition |

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. EXPLAIN ANALYZE (Query Execution Plan)

**Understanding Query Plans**:

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 123
  AND status = 'completed'
  AND created_at > '2024-01-01';

-- Output (without indexes):
Seq Scan on orders  (cost=0.00..180000.00 rows=50 width=100)
                    (actual time=0.012..850.234 rows=50 loops=1)
  Filter: (user_id = 123) AND (status = 'completed') AND (created_at > '2024-01-01')
  Rows Removed by Filter: 9999950
Planning Time: 0.123 ms
Execution Time: 850.345 ms

-- Analysis:
❌ Seq Scan: Full table scan (reads all 10M rows)
❌ Rows Removed: 99.9995% filtered out (wasteful)
❌ Execution: 850ms (too slow)
```

**After Adding Index**:
```sql
CREATE INDEX idx_orders_user_status_date 
ON orders(user_id, status, created_at);

EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 123
  AND status = 'completed'
  AND created_at > '2024-01-01';

-- Output (with index):
Index Scan using idx_orders_user_status_date on orders
  (cost=0.43..12.45 rows=50 width=100)
  (actual time=0.015..0.025 rows=50 loops=1)
  Index Cond: (user_id = 123) AND (status = 'completed') AND (created_at > '2024-01-01')
Planning Time: 0.098 ms
Execution Time: 0.035 ms

-- Analysis:
✅ Index Scan: Uses index (reads only 50 relevant rows)
✅ No Filter: All rows match (no waste)
✅ Execution: 0.035ms (24,000x faster!)
```

**Key Metrics to Watch**:
- **cost**: Estimated cost (higher = more expensive)
- **rows**: Estimated rows returned
- **actual time**: Real execution time (most important)
- **loops**: Number of times node executed

---

### 2. Avoid SELECT * (Select Only Needed Columns)

**Problem with SELECT ***:
```sql
-- Bad: Fetch all columns (wasteful)
SELECT * FROM users WHERE user_id = 123;

-- Table: users (20 columns, 5 KB per row)
-- Network transfer: 5 KB
-- Result: Slow over network, wastes bandwidth
```

**Optimized**:
```sql
-- Good: Fetch only needed columns
SELECT user_id, name, email FROM users WHERE user_id = 123;

-- Network transfer: 200 bytes (25x smaller)
-- Benefit: Faster network transfer, can use covering index
```

**Covering Index** (index-only scan):
```sql
-- Index includes all queried columns
CREATE INDEX idx_users_id_name_email ON users(user_id, name, email);

SELECT user_id, name, email FROM users WHERE user_id = 123;

-- Database doesn't need to access table (index has everything)
-- Speed: 10x faster (no table lookup)
```

---

### 3. JOIN Optimization

**Problem: N+1 Query**:
```python
# Bad: N+1 queries (1 + N)
users = db.query("SELECT * FROM users LIMIT 100")  # 1 query
for user in users:
    orders = db.query(f"SELECT * FROM orders WHERE user_id = {user.id}")  # N queries (100 times)
    print(f"{user.name}: {len(orders)} orders")

# Total queries: 1 + 100 = 101
# Time: 101 × 10ms = 1010ms (1 second)
```

**Optimized: Single JOIN**:
```python
# Good: Single query with JOIN
result = db.query("""
    SELECT u.name, COUNT(o.order_id) AS order_count
    FROM users u
    LEFT JOIN orders o ON u.user_id = o.user_id
    GROUP BY u.user_id, u.name
    LIMIT 100
""")

for row in result:
    print(f"{row.name}: {row.order_count} orders")

# Total queries: 1
# Time: 50ms (20x faster)
```

**JOIN Order Matters** (smaller table first):
```sql
-- Bad: Large table first
SELECT *
FROM orders o  -- 10M rows
JOIN users u ON o.user_id = u.user_id  -- 1M rows
WHERE u.status = 'active';

-- Good: Small table first (filter reduces size)
SELECT *
FROM users u  -- 1M rows
JOIN orders o ON u.user_id = o.user_id  -- 10M rows
WHERE u.status = 'active';  -- Filters users to 700K

-- Database joins 700K users × orders (not 10M orders)
-- Result: 3x faster
```

**Index JOIN Columns**:
```sql
-- Always index foreign keys
CREATE INDEX idx_orders_user_id ON orders(user_id);

SELECT *
FROM users u
JOIN orders o ON u.user_id = o.user_id;

-- Without index: Full table scan on orders (slow)
-- With index: Index lookup on orders.user_id (fast)
```

---

### 4. Subquery vs JOIN

**Slow: Correlated Subquery** (runs for each row):
```sql
-- Bad: Subquery executed 1M times (once per user)
SELECT u.name,
       (SELECT COUNT(*) FROM orders WHERE user_id = u.user_id) AS order_count
FROM users u
WHERE u.status = 'active';

-- Execution: 1M users × 10ms per subquery = 10,000 seconds (2.7 hours!)
```

**Fast: JOIN with GROUP BY**:
```sql
-- Good: Single JOIN + aggregation
SELECT u.name, COUNT(o.order_id) AS order_count
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE u.status = 'active'
GROUP BY u.user_id, u.name;

-- Execution: 50ms (720,000x faster)
```

**When Subquery is Better** (EXISTS for filtering):
```sql
-- Find users who have placed orders

-- Option 1: JOIN (duplicates users with multiple orders)
SELECT DISTINCT u.*
FROM users u
JOIN orders o ON u.user_id = o.user_id;
-- Problem: JOIN creates duplicates, DISTINCT removes them (wasteful)

-- Option 2: EXISTS (short-circuits after first match)
SELECT u.*
FROM users u
WHERE EXISTS (SELECT 1 FROM orders WHERE user_id = u.user_id);
-- Benefit: Stops at first order found (no need to check all orders)

-- Result: EXISTS is 2-3x faster for filtering
```

---

### 5. LIMIT and Pagination

**Problem: Fetch All Rows**:
```sql
-- Bad: Fetch all 1M users
SELECT * FROM users ORDER BY created_at DESC;

-- Database: Reads 1M rows, sorts, returns all
-- Network: Transfers 1M × 5 KB = 5 GB
-- Time: 10-30 seconds
```

**Optimized: LIMIT**:
```sql
-- Good: Fetch first 20 users
SELECT * FROM users ORDER BY created_at DESC LIMIT 20;

-- Database: Reads top 20 (with index on created_at)
-- Network: Transfers 20 × 5 KB = 100 KB
-- Time: 10ms (3000x faster)
```

**Pagination** (OFFSET is slow for large offsets):
```sql
-- Bad: OFFSET (skips 1M rows)
SELECT * FROM users ORDER BY created_at DESC LIMIT 20 OFFSET 1000000;

-- Database: Reads 1M + 20 rows, skips first 1M (wasteful)
-- Time: 5 seconds (even with index)
```

**Better: Keyset Pagination** (cursor-based):
```sql
-- Page 1
SELECT * FROM users ORDER BY created_at DESC LIMIT 20;
-- Returns: created_at of last row = '2024-01-15 10:00:00'

-- Page 2 (continue from last row)
SELECT * FROM users
WHERE created_at < '2024-01-15 10:00:00'
ORDER BY created_at DESC
LIMIT 20;

-- Database: Uses index, skips no rows
-- Time: 10ms (500x faster than OFFSET)
```

---

### 6. Avoid Functions on Indexed Columns

**Bad: Function on Column** (index not used):
```sql
-- Index on created_at
CREATE INDEX idx_users_created ON users(created_at);

-- Query: Find users created in 2024 (WRONG)
SELECT * FROM users WHERE YEAR(created_at) = 2024;

-- Problem: Function YEAR() on indexed column disables index
-- Result: Full table scan (slow)
```

**Good: Rewrite to Use Index**:
```sql
-- Query: Same result, but index-friendly
SELECT * FROM users
WHERE created_at >= '2024-01-01'
  AND created_at < '2025-01-01';

-- Benefit: Index on created_at used
-- Result: Fast index scan
```

**Other Examples**:
```sql
-- Bad: LOWER() disables index
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';

-- Good: Store lowercase in application, or use case-insensitive collation
SELECT * FROM users WHERE email = 'john@example.com';

-- Or: Functional index (PostgreSQL)
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';
-- Now index is used
```

---

### 7. Batch Operations

**Slow: Individual INSERTs**:
```python
# Bad: 1000 separate INSERT statements
for i in range(1000):
    db.execute("INSERT INTO users (name, email) VALUES (%s, %s)", (f"User{i}", f"user{i}@example.com"))
    db.commit()  # Commit after each insert

# Time: 1000 × 10ms = 10 seconds
```

**Fast: Batch INSERT**:
```python
# Good: Single INSERT with multiple rows
values = [(f"User{i}", f"user{i}@example.com") for i in range(1000)]
db.execute("INSERT INTO users (name, email) VALUES %s", values)
db.commit()

# Time: 50ms (200x faster)
```

**SQL Syntax**:
```sql
-- Single batch INSERT
INSERT INTO users (name, email) VALUES
('User1', 'user1@example.com'),
('User2', 'user2@example.com'),
('User3', 'user3@example.com'),
... (1000 rows);

-- Or: INSERT ... SELECT
INSERT INTO users_archive (user_id, name, email)
SELECT user_id, name, email
FROM users
WHERE created_at < '2023-01-01';

-- Copies millions of rows in single statement (fast)
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Query Performance Targets

**Latency Budgets**:
```
P50 (median): < 10ms
P95: < 50ms
P99: < 100ms
P99.9: < 500ms

If P95 > 50ms: Investigate and optimize
```

**Throughput Targets**:
```
Small queries (< 1ms): 10,000 QPS per server
Medium queries (1-10ms): 1,000 QPS per server
Large queries (10-100ms): 100 QPS per server
```

**Cost of Slow Queries**:
```
Slow query: 1 second
Server capacity: 10 QPS (1 query/second per thread × 10 threads)

Optimized query: 10ms
Server capacity: 1,000 QPS (100 queries/second per thread × 10 threads)

Improvement: 100x throughput (saves 90 servers for same load)
Cost savings: 90 × $100/month = $9,000/month
```

---

## 4. Data & Storage Design

### Materialized Views for Complex Queries

**Slow: Complex Aggregation**:
```sql
-- Dashboard query: Revenue per category (10 seconds)
SELECT c.name AS category,
       SUM(oi.quantity * oi.price) AS revenue
FROM categories c
JOIN products p ON c.category_id = p.category_id
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY c.category_id, c.name
ORDER BY revenue DESC;

-- 4 JOINs, aggregation on 10M+ rows
```

**Fast: Materialized View**:
```sql
-- Pre-compute and store results
CREATE MATERIALIZED VIEW revenue_by_category AS
SELECT c.category_id,
       c.name AS category,
       SUM(oi.quantity * oi.price) AS revenue
FROM categories c
JOIN products p ON c.category_id = p.category_id
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'completed'
GROUP BY c.category_id, c.name;

-- Query materialized view (instant)
SELECT * FROM revenue_by_category ORDER BY revenue DESC;

-- Time: 5ms (2000x faster)

-- Refresh strategy (daily at midnight)
REFRESH MATERIALIZED VIEW CONCURRENTLY revenue_by_category;
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Query Caching

**Application-Level Cache** (Redis):
```python
def get_user_orders(user_id):
    cache_key = f"user:{user_id}:orders"
    
    # Check cache
    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)  # Cache hit (1ms)
    
    # Cache miss: Query database
    orders = db.query("""
        SELECT * FROM orders
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 20
    """, (user_id,))
    
    # Store in cache (TTL: 5 minutes)
    redis.setex(cache_key, 300, json.dumps(orders))
    
    return orders

# First call: 10ms (database)
# Subsequent calls: 1ms (cache) → 10x faster
```

**Database Query Cache** (MySQL):
```sql
-- MySQL automatically caches SELECT results
SELECT SQL_CACHE * FROM users WHERE user_id = 123;

-- First execution: 10ms (query database)
-- Second execution: 0.5ms (cache hit)

-- Cache invalidated when table modified
```

---

## 6. Security, APIs & Governance

### Prevent SQL Injection (Parameterized Queries)

**Vulnerable** (SQL Injection):
```python
# NEVER DO THIS (vulnerable)
user_id = request.GET['user_id']
query = f"SELECT * FROM users WHERE user_id = {user_id}"
db.execute(query)

# Attack: ?user_id=1 OR 1=1
# Executes: SELECT * FROM users WHERE user_id = 1 OR 1=1
# Result: Returns ALL users (data breach)
```

**Safe** (Parameterized):
```python
# Always use parameterized queries
user_id = request.GET['user_id']
db.execute("SELECT * FROM users WHERE user_id = %s", (user_id,))

# Database escapes parameters (safe)
# Attack: ?user_id=1 OR 1=1
# Executes: SELECT * FROM users WHERE user_id = '1 OR 1=1'
# Result: No match (attack fails)
```

---

## 7. Real-World Examples & Case Studies

### Airbnb: Pagination Optimization

**Problem**: Slow pagination on listings (10M+ listings)

**Before**:
```sql
-- Page 50,000 (offset 1M rows)
SELECT * FROM listings
WHERE city = 'San Francisco'
ORDER BY price
LIMIT 20 OFFSET 1000000;

-- Time: 5 seconds (reads and skips 1M rows)
```

**After (Keyset Pagination)**:
```sql
-- Store last_id from previous page
SELECT * FROM listings
WHERE city = 'San Francisco'
  AND (price, listing_id) > (150.00, 12345)  -- Last row from previous page
ORDER BY price, listing_id
LIMIT 20;

-- Time: 10ms (uses index, no skipping)
-- Result: 500x faster
```

---

### Slack: Denormalized Message Counts

**Problem**: Count unread messages per channel (slow)

**Before**:
```sql
-- Query: Unread count for user in channel
SELECT COUNT(*) FROM messages
WHERE channel_id = 123
  AND created_at > (SELECT last_read_at FROM channel_members WHERE user_id = 456 AND channel_id = 123);

-- Subquery + COUNT on 10M messages
-- Time: 200ms per channel × 100 channels = 20 seconds
```

**After (Denormalized Counter)**:
```sql
-- Add unread_count to channel_members table
CREATE TABLE channel_members (
    user_id INT,
    channel_id INT,
    last_read_at TIMESTAMP,
    unread_count INT DEFAULT 0  -- Denormalized
);

-- Trigger: Increment unread_count when message posted
CREATE TRIGGER update_unread_count
AFTER INSERT ON messages
FOR EACH ROW
BEGIN
    UPDATE channel_members
    SET unread_count = unread_count + 1
    WHERE channel_id = NEW.channel_id
      AND last_read_at < NEW.created_at;
END;

-- Query: Instant
SELECT unread_count FROM channel_members
WHERE user_id = 456 AND channel_id = 123;

-- Time: 1ms (100x faster per channel, 2000x faster total)
```

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "How do you optimize a slow database query?"

**Structured Answer**:

**"I follow a systematic approach: Measure → Analyze → Optimize → Verify."**

**Step 1: Measure (Identify Slow Queries)**:
```sql
-- PostgreSQL: Log slow queries
SET log_min_duration_statement = 100;  -- Log queries > 100ms

-- Or: Query slow query log
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

**Step 2: Analyze (EXPLAIN ANALYZE)**:
```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 123 AND status = 'completed';

-- Look for:
❌ Seq Scan (full table scan)
❌ High cost (> 10000)
❌ Rows removed by filter (inefficient filtering)
```

**Step 3: Optimize (Apply Techniques)**:
```
1. Add indexes (WHERE, JOIN, ORDER BY columns)
2. Rewrite query (avoid subqueries, use EXISTS)
3. Limit result set (LIMIT, pagination)
4. Select only needed columns (avoid SELECT *)
5. Denormalize (pre-compute aggregates if read-heavy)
```

**Step 4: Verify (Re-measure)**:
```sql
EXPLAIN ANALYZE [optimized query];

-- Ensure:
✅ Index Scan (not Seq Scan)
✅ Low cost (< 100)
✅ Execution time < 50ms (P95)
```

**Real-world example: At Uber, we optimized driver location query from 500ms to 10ms by adding PostGIS spatial index on (lat, lng). Changed from full table scan to index scan. 50x improvement enabled real-time matching."**

---

### Follow-Up 1: "What's the difference between WHERE and HAVING?"

**Answer**:

**"WHERE filters rows BEFORE aggregation. HAVING filters groups AFTER aggregation."**

**WHERE** (filters individual rows):
```sql
-- Find active users with orders
SELECT u.user_id, u.name, COUNT(o.order_id) AS order_count
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE u.status = 'active'  -- Filter users before COUNT
GROUP BY u.user_id, u.name;

-- Execution:
1. Filter users (WHERE status = 'active') → 700K users
2. Join orders → 5M rows
3. Group and COUNT → 700K groups

-- Performance: Fast (filters before heavy operations)
```

**HAVING** (filters aggregated results):
```sql
-- Find users with > 10 orders
SELECT u.user_id, u.name, COUNT(o.order_id) AS order_count
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
GROUP BY u.user_id, u.name
HAVING COUNT(o.order_id) > 10;  -- Filter after COUNT

-- Execution:
1. Join all users + orders → 10M rows
2. Group and COUNT → 1M groups
3. Filter groups (HAVING > 10) → 100K groups

-- Performance: Slower (processes all data first)
```

**Combination**:
```sql
-- Best: Use both (filter early with WHERE, refine with HAVING)
SELECT u.user_id, u.name, COUNT(o.order_id) AS order_count
FROM users u
LEFT JOIN orders o ON u.user_id = o.user_id
WHERE u.status = 'active'           -- Filter early
GROUP BY u.user_id, u.name
HAVING COUNT(o.order_id) > 10;      -- Refine aggregates

-- Execution:
1. Filter users (WHERE) → 700K users
2. Join orders → 5M rows (not 10M)
3. Group and COUNT → 700K groups
4. Filter groups (HAVING) → 100K groups

-- Result: 2x faster (WHERE reduces data before aggregation)
```

**Rule: Use WHERE for row-level filtering (status, created_at). Use HAVING for aggregate filtering (COUNT, SUM, AVG)."**

---

### Follow-Up 2: "How do you handle large result sets?"

**Answer**:

**"Use pagination (LIMIT + keyset cursor), streaming, or pre-aggregation."**

**1. Keyset Pagination** (cursor-based, scalable):
```python
# Page 1
def get_users_page1():
    return db.query("""
        SELECT user_id, name, created_at
        FROM users
        ORDER BY created_at DESC, user_id DESC
        LIMIT 20
    """)
    # Returns: last_created_at='2024-01-15', last_user_id=12345

# Page 2 (continue from cursor)
def get_users_page2(last_created_at, last_user_id):
    return db.query("""
        SELECT user_id, name, created_at
        FROM users
        WHERE (created_at, user_id) < (%s, %s)
        ORDER BY created_at DESC, user_id DESC
        LIMIT 20
    """, (last_created_at, last_user_id))

# Benefit: Constant time per page (no OFFSET)
# Works for 1M pages (OFFSET would take minutes)
```

**2. Streaming** (process rows one-by-one):
```python
# Bad: Load all rows into memory (OOM for large results)
users = db.query("SELECT * FROM users")  # 1M rows × 5 KB = 5 GB RAM
for user in users:
    process(user)

# Good: Stream rows (constant memory)
cursor = db.cursor()
cursor.execute("SELECT * FROM users")
for user in cursor.fetchone():  # Fetch one row at a time
    process(user)
cursor.close()

# Memory: 5 KB (single row), not 5 GB (all rows)
```

**3. Pre-Aggregation** (materialized view):
```sql
-- Instead of querying 10M rows
SELECT category, SUM(revenue) FROM orders GROUP BY category;

-- Pre-compute daily
CREATE MATERIALIZED VIEW revenue_by_category AS ...;
REFRESH MATERIALIZED VIEW revenue_by_category;  -- Nightly job

-- Query instant
SELECT * FROM revenue_by_category;
```

**Real-world: Instagram doesn't fetch all 1B users. Keyset pagination on (created_at, user_id) allows scrolling infinitely without slowdown. Each page: 10ms (constant time)."**

---

### Follow-Up 3: "What's query plan cache and when does it help?"

**Answer**:

**"Query plan cache stores execution plans to avoid re-planning. Helps for frequently executed queries with same structure."**

**How it Works**:
```sql
-- First execution: Parse → Plan → Execute
SELECT * FROM users WHERE user_id = 123;
-- Time: 1ms parse + 2ms plan + 10ms execute = 13ms

-- Second execution (same query): Use cached plan → Execute
SELECT * FROM users WHERE user_id = 456;  -- Different value, same structure
-- Time: 0ms parse + 0ms plan + 10ms execute = 10ms (23% faster)

-- Cached plan includes:
- Index selection (use idx_users_id)
- JOIN order
- Optimization decisions
```

**When Cache Helps**:
```python
# Prepared statement (reuses plan)
stmt = db.prepare("SELECT * FROM users WHERE user_id = ?")
stmt.execute(123)  # First: Parse + plan + execute (13ms)
stmt.execute(456)  # Second: Execute only (10ms)
stmt.execute(789)  # Third: Execute only (10ms)

# Benefit: Saves 3ms per query (23% faster)
# At 1000 QPS: Saves 3 seconds of CPU per second
```

**When Cache Doesn't Help**:
```sql
-- Different queries (can't reuse plan)
SELECT * FROM users WHERE user_id = 123;
SELECT * FROM users WHERE email = 'john@example.com';  -- Different WHERE
SELECT * FROM orders WHERE user_id = 123;  -- Different table

-- Each needs separate plan
```

**Cache Invalidation**:
```
Plan cache invalidated when:
- Table schema changes (ALTER TABLE)
- Indexes added/dropped
- Statistics updated (ANALYZE)
- Server restart

Database re-plans queries after invalidation
```

**PostgreSQL**:
```python
# Prepared statement (cached plan)
import psycopg2
conn = psycopg2.connect(...)
cursor = conn.cursor()

# Prepare once
cursor.execute("PREPARE get_user AS SELECT * FROM users WHERE user_id = $1")

# Execute many times (reuses plan)
cursor.execute("EXECUTE get_user(123)")
cursor.execute("EXECUTE get_user(456)")
```

**Real-world: At scale (10K QPS), prepared statements save 30 seconds of CPU per second (3 cores). Worth it for high-frequency queries (> 100 QPS). Not worth it for ad-hoc analytics queries (run once)."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Query Optimization Decision Tree

```
┌────────────────────────────────────────────────────────────┐
│            QUERY OPTIMIZATION FLOWCHART                    │
└────────────────────────────────────────────────────────────┘

                    Query is slow (> 100ms)
                            │
                            ↓
                   Run EXPLAIN ANALYZE
                            │
                ┌───────────┴───────────┐
                │                       │
           Seq Scan?                High cost?
                │                       │
                ↓                       ↓
         Add Index                 Too many JOINs?
         on WHERE/JOIN              ┌──────┴──────┐
         columns                   Yes           No
                                    │             │
                                    ↓             ↓
                              Denormalize    Large result?
                              (pre-join)     ┌──────┴──────┐
                                            Yes           No
                                             │             │
                                             ↓             ↓
                                        Add LIMIT      Check for
                                        Paginate      Functions
                                                      on indexed
                                                      columns
                                                            │
                                                            ↓
                                                      Rewrite to
                                                      avoid functions


OPTIMIZATION CHECKLIST:
═══════════════════════════════════════════════════════════

✅ 1. Add Indexes
   WHERE user_id = 123           → Index on user_id
   ORDER BY created_at           → Index on created_at
   JOIN orders ON user_id        → Index on orders.user_id

✅ 2. Avoid SELECT *
   SELECT *                      → SELECT id, name, email

✅ 3. Use LIMIT
   SELECT * FROM users           → SELECT * LIMIT 100

✅ 4. Optimize JOINs
   LEFT JOIN (all rows)          → INNER JOIN (matching only)
   Subquery in SELECT            → JOIN with GROUP BY

✅ 5. Avoid Functions on Indexed Columns
   WHERE YEAR(created_at) = 2024 → WHERE created_at >= '2024-01-01'

✅ 6. Use EXISTS for Filtering
   SELECT DISTINCT FROM JOIN     → SELECT WHERE EXISTS

✅ 7. Batch Operations
   1000 × INSERT                 → INSERT VALUES (…), (…), (…)

✅ 8. Cache Results
   Query every request           → Cache for 5 minutes (Redis)

✅ 9. Keyset Pagination
   LIMIT 20 OFFSET 1000000       → WHERE id > last_id LIMIT 20

✅ 10. Materialized Views
   Complex aggregation           → Pre-compute nightly
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Query Optimization Matters

**Slow Queries Impact**:
- Poor user experience (page load > 1 second)
- High server costs (need 10x servers to handle load)
- Database bottleneck (blocks other queries)
- Revenue loss (users abandon slow sites)

**Optimized Queries Impact**:
- Fast user experience (page load < 100ms)
- Low server costs (1 server handles 10x load)
- Efficient database (more queries per second)
- Happy users (higher conversion rates)

### Key Optimization Techniques

**Always Apply**:
1. **Add indexes**: WHERE, JOIN, ORDER BY columns (10-1000x faster)
2. **Avoid SELECT ***: Select only needed columns (2-5x faster)
3. **Use LIMIT**: Don't fetch all rows (10-100x faster)
4. **Index foreign keys**: JOIN performance critical

**Conditionally Apply**:
5. **Denormalize**: Pre-compute aggregates if read:write > 100:1
6. **Materialized views**: Complex queries (dashboards, reports)
7. **Keyset pagination**: Large result sets (> 10K rows)
8. **Caching**: Frequently accessed data (> 100 requests/min)

### Production Checklist

- [ ] **Enable slow query log**: Log queries > 100ms
- [ ] **Monitor P95 latency**: Alert if > 50ms
- [ ] **Add indexes on foreign keys**: All JOIN columns
- [ ] **Use EXPLAIN ANALYZE**: Understand query plans
- [ ] **Avoid SELECT ***: Select only needed columns
- [ ] **Implement pagination**: LIMIT + keyset cursor
- [ ] **Cache hot data**: Redis for frequent queries
- [ ] **Batch operations**: INSERT/UPDATE in batches
- [ ] **Use prepared statements**: High-frequency queries (> 100 QPS)
- [ ] **Regular index maintenance**: REINDEX monthly

### Bottom Line

**Query optimization is 80% of database performance. A single missing index can make queries 1000x slower (1 second vs 1ms). For FAANG interviews: Show systematic approach (EXPLAIN ANALYZE → identify bottleneck → apply technique → verify). Explain index selection (WHERE/JOIN columns), JOIN optimization (smaller table first, avoid N+1), and pagination (keyset cursor for large offsets). Demonstrate awareness of trade-offs (indexes speed reads but slow writes, denormalization improves performance but increases complexity).**

**Real-world lesson from Uber**: "We optimized driver matching query from 500ms to 10ms by adding spatial index (PostGIS) on (lat, lng). Single index change enabled real-time matching at scale. Rule: Profile first (EXPLAIN ANALYZE), optimize second (add index), measure third (verify improvement)."

