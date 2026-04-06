# 66. Indexing (B-Tree, Hash, Composite)

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is a Database Index?

**Index** = Data structure that improves query speed by avoiding full table scans.

**Analogy**: Book index
- **Without index**: Read entire book to find "System Design" (slow)
- **With index**: Look up "System Design" in index → Page 142 (fast)

**Without Index (Full Table Scan)**:
```sql
SELECT * FROM users WHERE email = 'john@example.com';

-- Database scans all 1M rows
-- Time: O(N) = 1M rows × 0.001ms = 1000ms (1 second)
```

**With Index**:
```sql
CREATE INDEX idx_users_email ON users(email);

SELECT * FROM users WHERE email = 'john@example.com';

-- Database uses index (binary search in B-Tree)
-- Time: O(log N) = log₂(1M) = 20 comparisons × 0.001ms = 0.02ms (50,000x faster!)
```

### Index Types

| Type | Structure | Use Case | Performance |
|------|-----------|----------|-------------|
| **B-Tree** | Balanced tree | Range queries, equality | O(log N) |
| **Hash** | Hash table | Exact match only | O(1) |
| **Composite** | Multi-column | Queries on multiple columns | O(log N) |
| **Full-Text** | Inverted index | Text search | O(log N) |

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. B-Tree Index (Most Common)

**Structure**: Balanced tree with sorted keys

```
B-Tree for users(user_id):

                    [50]
                   /    \
              [25]        [75]
             /   \       /    \
        [10][40] [60]  [80][90]
         ↓   ↓    ↓     ↓   ↓
      Data Data Data  Data Data
```

**How it Works**:
```sql
-- Find user_id = 60
1. Start at root: 60 > 50 → Go right
2. At [75]: 60 < 75 → Go left
3. At [60]: Found! → Retrieve row

-- Comparisons: 3 (log₂(9) ≈ 3)
-- vs Full scan: 9 rows
```

**Characteristics**:
- **Ordered**: Keys stored in sorted order
- **Balanced**: All leaf nodes at same depth (guarantees O(log N))
- **Range queries**: Fast (e.g., `WHERE user_id BETWEEN 50 AND 80`)
- **Disk-friendly**: Optimized for disk I/O (pages loaded together)

**When to Use**:
```sql
-- ✅ Equality queries
WHERE user_id = 123

-- ✅ Range queries
WHERE user_id BETWEEN 100 AND 200
WHERE created_at > '2024-01-01'

-- ✅ Sorting
ORDER BY user_id

-- ✅ Prefix matching
WHERE email LIKE 'john%'  -- Starts with "john"

-- ❌ NOT prefix matching
WHERE email LIKE '%@gmail.com'  -- Ends with (can't use B-Tree index)
```

---

### 2. Hash Index

**Structure**: Hash table (key → hash → bucket → row)

```
Hash Index for users(email):

Hash("john@example.com") = 42
Hash("jane@example.com") = 17
Hash("bob@example.com") = 89

Buckets:
[0]  → Empty
[17] → jane@example.com → Row pointer
[42] → john@example.com → Row pointer
[89] → bob@example.com → Row pointer
...
```

**How it Works**:
```sql
-- Find email = 'john@example.com'
1. Hash("john@example.com") = 42
2. Go to bucket 42
3. Compare: "john@example.com" == "john@example.com" → Found!
4. Retrieve row

-- Comparisons: 1 (O(1), constant time)
```

**Characteristics**:
- **Unordered**: No sort order (hash destroys order)
- **Exact match only**: Can't do range queries
- **Fast equality**: O(1) lookup
- **Memory-intensive**: Usually in-memory (not disk-based)

**When to Use**:
```sql
-- ✅ Exact match queries
WHERE email = 'john@example.com'
WHERE session_token = 'abc123xyz'

-- ❌ Range queries (index not used)
WHERE user_id > 100  -- Can't hash range

-- ❌ Sorting (index not used)
ORDER BY email  -- Hash has no order

-- ❌ Prefix matching (index not used)
WHERE email LIKE 'john%'  -- Can't hash prefix
```

**PostgreSQL Hash Index**:
```sql
CREATE INDEX idx_users_email_hash ON users USING HASH (email);

-- Use case: Exact lookups on large strings (session tokens, UUIDs)
```

**MySQL Memory Engine**:
```sql
CREATE TABLE sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    user_id INT,
    data TEXT
) ENGINE=MEMORY;

-- Default: Hash index on PRIMARY KEY
-- Fast O(1) lookups for session_id
```

---

### 3. Composite Index (Multi-Column)

**Structure**: B-Tree with multiple keys

```sql
CREATE INDEX idx_users_lastname_firstname ON users(last_name, first_name);

-- Index structure:
("Smith", "Alice")  → Row
("Smith", "Bob")    → Row
("Smith", "Charlie") → Row
("Taylor", "Alice") → Row
("Taylor", "Bob")   → Row
```

**Index Order Matters** (Left-to-Right Rule):

```sql
-- Index: (last_name, first_name)

-- ✅ Uses index (matches left-most column)
WHERE last_name = 'Smith'

-- ✅ Uses index (matches both columns)
WHERE last_name = 'Smith' AND first_name = 'Alice'

-- ❌ Does NOT use index (skips left-most column)
WHERE first_name = 'Alice'

-- ✅ Partially uses index (last_name part only)
WHERE last_name = 'Smith' AND age = 30
```

**Range Queries** (stops at first range):

```sql
-- Index: (status, created_at, user_id)

-- ✅ Fully uses index
WHERE status = 'active' AND created_at > '2024-01-01' AND user_id = 123

-- ⚠️ Partially uses index (status + created_at)
WHERE status = 'active' AND created_at > '2024-01-01' AND user_id > 100
-- Reason: Range on created_at stops index usage for user_id

-- ❌ Only uses first column (status)
WHERE status > 'active' AND created_at > '2024-01-01'
-- Reason: Range on first column stops rest
```

**Covering Index** (includes all query columns):

```sql
-- Query needs: user_id, email, created_at
SELECT user_id, email, created_at 
FROM users 
WHERE email = 'john@example.com';

-- Covering index (includes all columns)
CREATE INDEX idx_users_email_covering ON users(email, user_id, created_at);

-- Benefit: Index-only scan (doesn't touch table)
-- Performance: 5-10x faster (no table lookup)
```

---

### 4. Composite Index Design Patterns

**Pattern 1: Equality First, Range Second**

```sql
-- Query: Active users created in last 30 days
SELECT * FROM users 
WHERE status = 'active' 
  AND created_at > NOW() - INTERVAL '30 days';

-- Good: Equality (status) first, range (created_at) second
CREATE INDEX idx_users_status_created ON users(status, created_at);

-- Bad: Range first (stops index usage)
CREATE INDEX idx_users_created_status ON users(created_at, status);
```

**Pattern 2: High Cardinality First**

```sql
-- Cardinality: Number of distinct values
-- High cardinality: user_id (1M distinct)
-- Low cardinality: status ('active', 'inactive' = 2 distinct)

-- Query: Find user's orders
SELECT * FROM orders 
WHERE user_id = 123 AND status = 'completed';

-- Good: High cardinality first (user_id narrows down more)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Result: user_id=123 → 10 rows, then filter status → 5 rows

-- Bad: Low cardinality first
CREATE INDEX idx_orders_status_user ON orders(status, user_id);
-- Result: status='completed' → 1M rows, then filter user_id → 5 rows (slower)
```

**Pattern 3: Include Columns** (PostgreSQL INCLUDE):

```sql
-- Query needs: email, user_id, name, created_at
SELECT user_id, name, created_at 
FROM users 
WHERE email = 'john@example.com';

-- Option 1: Composite index (all columns in key)
CREATE INDEX idx1 ON users(email, user_id, name, created_at);
-- Problem: Large index (all columns sorted)

-- Option 2: INCLUDE (only email in key, rest as payload)
CREATE INDEX idx2 ON users(email) INCLUDE (user_id, name, created_at);
-- Benefit: Smaller index (only email sorted), still covering

-- PostgreSQL 11+
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Index Size Calculation

**Table**: users (10M rows)
```
user_id: 4 bytes (INTEGER)
email: 50 bytes (VARCHAR)
name: 50 bytes (VARCHAR)
created_at: 8 bytes (TIMESTAMP)

Row size: 112 bytes
Table size: 10M × 112 bytes = 1.12 GB
```

**Index Sizes**:

```
B-Tree Index on user_id:
- Key: 4 bytes
- Pointer: 8 bytes (row location)
- Overhead: ~30% (tree structure)
- Size: 10M × (4 + 8) × 1.3 = 156 MB

B-Tree Index on email:
- Key: 50 bytes
- Pointer: 8 bytes
- Overhead: 30%
- Size: 10M × (50 + 8) × 1.3 = 754 MB

Composite Index on (email, user_id, name):
- Keys: 50 + 4 + 50 = 104 bytes
- Pointer: 8 bytes
- Overhead: 30%
- Size: 10M × (104 + 8) × 1.3 = 1.46 GB (larger than table!)
```

**Rule of Thumb**: Index size = 10-30% of table size for single column, 30-100% for composite.

---

### Index Impact on Write Performance

**Without Index**:
```
INSERT: Write 1 row to table
Time: ~1ms
```

**With 5 Indexes**:
```
INSERT: 
1. Write row to table (1ms)
2. Update index 1 (B-Tree insert: log N)
3. Update index 2
4. Update index 3
5. Update index 4
6. Update index 5

Time: 1ms + 5 × 0.5ms = 3.5ms (3.5x slower)
```

**Trade-off**:
- ✅ Faster reads (index seeks vs full scans)
- ❌ Slower writes (must update indexes)
- ❌ More storage (indexes take disk space)

**Guideline**: Don't over-index
- **Read-heavy (> 90% reads)**: Index liberally
- **Write-heavy (> 50% writes)**: Index conservatively (only critical queries)

---

## 4. Data & Storage Design

### Index Maintenance

**Fragmentation**:
```
-- Over time, B-Tree becomes fragmented (lots of inserts/deletes)
-- Result: More disk I/O, slower queries

-- PostgreSQL: Rebuild index
REINDEX INDEX idx_users_email;

-- Or rebuild all indexes on table
REINDEX TABLE users;

-- MySQL: Rebuild table (rebuilds all indexes)
OPTIMIZE TABLE users;
```

**Unused Indexes** (PostgreSQL):
```sql
-- Find indexes never used
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE 'pg_%';

-- Drop unused indexes
DROP INDEX idx_users_never_used;

-- Benefit: Faster writes, less storage
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Partial/Filtered Index

```sql
-- Index only active users (not inactive)
CREATE INDEX idx_users_active_email ON users(email) WHERE status = 'active';

-- Benefits:
-- ✅ Smaller index (only 70% of rows if 70% active)
-- ✅ Faster queries on active users
-- ✅ Less storage
-- ✅ Faster writes (index updated only for active users)

-- Query (uses index)
SELECT * FROM users WHERE status = 'active' AND email = 'john@example.com';

-- Query (does NOT use index)
SELECT * FROM users WHERE status = 'inactive' AND email = 'john@example.com';
```

**Use Cases**:
- Soft deletes: `WHERE deleted_at IS NULL`
- Status filters: `WHERE status = 'active'`
- Time-based: `WHERE created_at > NOW() - INTERVAL '30 days'`

---

## 6. Security, APIs & Governance

### Index Hints (Query Optimization)

```sql
-- MySQL: Force index usage
SELECT * FROM users USE INDEX (idx_users_email) 
WHERE email = 'john@example.com';

-- PostgreSQL: Disable sequential scan (force index)
SET enable_seqscan = off;
SELECT * FROM users WHERE email = 'john@example.com';
SET enable_seqscan = on;

-- When to use: Query planner chooses wrong index (rare)
```

---

## 7. Real-World Examples & Case Studies

### Uber: Geospatial Index

**Problem**: Find nearby drivers (lat/lng search)

```sql
-- Bad: B-Tree index on lat + lng
CREATE INDEX idx_drivers_lat_lng ON drivers(latitude, longitude);

-- Query: Drivers within 5km of (37.7749, -122.4194)
SELECT * FROM drivers
WHERE latitude BETWEEN 37.7249 AND 37.8249
  AND longitude BETWEEN -122.4694 AND -122.3694
  AND status = 'available';

-- Problem: Rectangle search includes far corners
-- Result: Returns drivers 7km away (inefficient)
```

**Better: PostGIS (Geospatial Index)**:

```sql
-- PostGIS extension
CREATE EXTENSION postgis;

-- Add geometry column
ALTER TABLE drivers ADD COLUMN location GEOGRAPHY(Point, 4326);
UPDATE drivers SET location = ST_MakePoint(longitude, latitude);

-- Create GiST index (Generalized Search Tree for 2D data)
CREATE INDEX idx_drivers_location ON drivers USING GIST (location);

-- Query: Drivers within 5km (exact circle)
SELECT * FROM drivers
WHERE ST_DWithin(
    location,
    ST_MakePoint(-122.4194, 37.7749)::geography,
    5000  -- 5000 meters = 5km
) AND status = 'available';

-- Performance: O(log N) with spatial indexing
-- Result: Only drivers within exact 5km radius
```

---

### Facebook: Composite Index for Newsfeed

**Schema**:
```sql
CREATE TABLE posts (
    post_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    content TEXT,
    visibility VARCHAR(20) DEFAULT 'public',  -- 'public', 'friends', 'private'
    created_at TIMESTAMP NOT NULL
);
```

**Query**: Get public posts from user's friends (newsfeed)

```sql
-- 100M rows
SELECT post_id, content, created_at
FROM posts
WHERE user_id IN (123, 456, 789, ...)  -- 500 friends
  AND visibility = 'public'
ORDER BY created_at DESC
LIMIT 20;
```

**Index Strategy**:
```sql
-- Composite index: (user_id, visibility, created_at)
CREATE INDEX idx_posts_user_vis_time ON posts(user_id, visibility, created_at DESC);

-- Why this order?
-- 1. user_id: Equality (narrows to specific users)
-- 2. visibility: Equality (filter public only)
-- 3. created_at DESC: Range + sort (recent posts first)

-- Performance:
-- Without index: Full scan (100M rows) → 5-10 seconds
-- With index: Index seek + range scan → 10-50ms (100-1000x faster)
```

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Explain different types of database indexes"

**Structured Answer**:

**"Three main types: B-Tree (most common), Hash (exact match), Composite (multiple columns)."**

**1. B-Tree Index**:
```
Structure: Balanced tree, sorted keys
Use case: Range queries, equality, sorting
Performance: O(log N)
Example: WHERE user_id BETWEEN 100 AND 200

CREATE INDEX idx_users_id ON users(user_id);
```

**2. Hash Index**:
```
Structure: Hash table
Use case: Exact match only (no ranges)
Performance: O(1)
Example: WHERE session_token = 'abc123'

CREATE INDEX idx_sessions_token USING HASH (session_token);
-- PostgreSQL syntax
```

**3. Composite Index**:
```
Structure: B-Tree with multiple columns
Use case: Queries filtering on multiple columns
Left-to-right rule: Index (A, B, C) works for WHERE A, WHERE A AND B, WHERE A AND B AND C
Does NOT work for WHERE B or WHERE C alone

CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Works: WHERE user_id = 123
-- Works: WHERE user_id = 123 AND status = 'completed'
-- Doesn't work: WHERE status = 'completed'
```

**When to use each**:
- **B-Tree**: Default choice (handles 95% of cases)
- **Hash**: Only if exact match + never sort/range (rare)
- **Composite**: Queries filter on multiple columns frequently

**Real-world: Amazon uses composite index (customer_id, order_date DESC) for order history—allows efficient queries for user's recent orders."**

---

### Follow-Up 1: "How do you decide which columns to index?"

**Answer**:

**"Index columns in WHERE, JOIN, ORDER BY clauses. Prioritize by query frequency and slowness."**

**Step 1: Identify Slow Queries**:
```sql
-- PostgreSQL: Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- > 100ms
ORDER BY mean_exec_time DESC
LIMIT 10;

-- MySQL: Enable slow query log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.1;  -- Log queries > 100ms
```

**Step 2: Analyze Query Plan**:
```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 123 AND status = 'completed';

-- Output (without index):
-- Seq Scan on orders  (cost=0.00..10000.00 rows=50 width=100) (actual time=0.012..50.234 rows=50 loops=1)
--   Filter: (user_id = 123) AND (status = 'completed')
--   Rows Removed by Filter: 999950
-- Planning Time: 0.123 ms
-- Execution Time: 50.345 ms

-- ❌ Sequential scan (scans all rows)
```

**Step 3: Create Index**:
```sql
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

EXPLAIN ANALYZE
SELECT * FROM orders WHERE user_id = 123 AND status = 'completed';

-- Output (with index):
-- Index Scan using idx_orders_user_status on orders  (cost=0.29..12.31 rows=50 width=100) (actual time=0.015..0.025 rows=50 loops=1)
--   Index Cond: (user_id = 123) AND (status = 'completed')
-- Planning Time: 0.098 ms
-- Execution Time: 0.035 ms

-- ✅ Index scan (50.345ms → 0.035ms = 1400x faster!)
```

**Columns to Index**:
- ✅ Foreign keys: `JOIN users ON orders.user_id = users.user_id`
- ✅ WHERE filters: `WHERE status = 'active'`
- ✅ ORDER BY: `ORDER BY created_at DESC`
- ✅ GROUP BY: `GROUP BY category_id`
- ❌ Low cardinality: `WHERE gender IN ('M', 'F')` (only 2 values, index not helpful)
- ❌ Frequently updated: `balance` (updated often, index overhead > benefit)

**Rule of thumb: Index if query appears in top 10 slow queries AND would benefit from index (cardinality > 100)."**

---

### Follow-Up 2: "What's the downside of too many indexes?"

**Answer**:

**"Indexes slow down writes and consume storage. Balance read performance vs write overhead."**

**Write Overhead**:
```
Table with 10 indexes:

INSERT INTO users VALUES (...);
-- Steps:
1. Write row to table (1ms)
2. Update index_1 (B-Tree insert: 0.5ms)
3. Update index_2 (0.5ms)
4. Update index_3 (0.5ms)
...
10. Update index_10 (0.5ms)

Total: 1ms + 10 × 0.5ms = 6ms (6x slower than no indexes)

For 10,000 INSERTs/sec:
- No indexes: 10ms/sec (1%)
- 10 indexes: 60ms/sec (6%)
- Impact: 5% CPU overhead
```

**Storage Overhead**:
```
Table: 10M rows, 100 bytes/row = 1 GB
Index 1: 50 MB
Index 2: 100 MB
Index 3: 75 MB
...
Index 10: 80 MB

Total indexes: 600 MB (60% of table size)
Total storage: 1 GB + 600 MB = 1.6 GB
```

**Cache Pollution**:
```
Database cache: 8 GB RAM
Without indexes: Cache 8 GB of table data (80M rows)
With 10 indexes: Cache 1.6 GB table + 600 MB indexes = 2.2 GB
Result: Only cache 22M rows (vs 80M without indexes)

Impact: More cache misses → slower queries
```

**How to Avoid**:
1. **Audit unused indexes**:
```sql
-- PostgreSQL: Find indexes with 0 scans
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

DROP INDEX unused_index;
```

2. **Combine indexes** (composite instead of multiple single-column):
```sql
-- Bad: 2 indexes
CREATE INDEX idx1 ON orders(user_id);
CREATE INDEX idx2 ON orders(status);

-- Good: 1 composite index (covers both queries)
CREATE INDEX idx ON orders(user_id, status);
```

3. **Use partial indexes** (filter less common cases):
```sql
-- Instead of full index
CREATE INDEX idx1 ON users(email);

-- Partial index (only active users)
CREATE INDEX idx2 ON users(email) WHERE status = 'active';
-- 70% smaller if 70% active
```

**Rule: Aim for < 5 indexes per table (unless read:write > 1000:1)."**

---

### Follow-Up 3: "Explain the difference between clustered and non-clustered index"

**Answer**:

**"Clustered index determines physical row order (table sorted by index key). Non-clustered is separate data structure pointing to rows."**

**Clustered Index** (MySQL InnoDB PRIMARY KEY):
```
Table physically sorted by clustered index key:

user_id (PK) | name    | email
-------------|---------|------------------
1            | Alice   | alice@example.com
2            | Bob     | bob@example.com
3            | Charlie | charlie@example.com

Rows stored in order of user_id (clustered index)

Characteristics:
- Only ONE clustered index per table (table can't be sorted 2 ways)
- Faster range queries (rows contiguous on disk)
- PRIMARY KEY is clustered index (MySQL InnoDB)
```

**Non-Clustered Index** (Secondary indexes):
```
Index structure (separate from table):

email                | → row pointer
---------------------|---------------
alice@example.com    | → Row 1
bob@example.com      | → Row 2
charlie@example.com  | → Row 3

Table stored separately (not sorted by email):

user_id | name    | email
--------|---------|------------------
2       | Bob     | bob@example.com
1       | Alice   | alice@example.com
3       | Charlie | charlie@example.com

Characteristics:
- Multiple non-clustered indexes allowed
- Extra lookup: Index → row pointer → table row (slower than clustered)
```

**Performance Difference**:
```sql
-- Clustered index query (PRIMARY KEY)
SELECT * FROM users WHERE user_id = 2;
-- 1 lookup: Find user_id=2 in index → row data right there (0.1ms)

-- Non-clustered index query (email)
SELECT * FROM users WHERE email = 'bob@example.com';
-- 2 lookups: Find email in index (0.1ms) → Follow pointer → Fetch row (0.1ms)
-- Total: 0.2ms (2x slower than clustered)
```

**Clustered Index Choice**:
```sql
-- Good: Incremental ID (sequential inserts)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,  -- Clustered
    ...
);
-- Inserts always at end (no page splits, fast)

-- Bad: UUID (random inserts)
CREATE TABLE users (
    user_id UUID PRIMARY KEY,  -- Clustered
    ...
);
-- Inserts random (many page splits, slow)

-- Better: UUID non-clustered, separate incremental clustered
CREATE TABLE users (
    id SERIAL PRIMARY KEY,  -- Clustered (incremental)
    user_id UUID UNIQUE,    -- Non-clustered (random lookups)
    ...
);
```

**Real-world: MySQL InnoDB always has clustered index (PRIMARY KEY). If no PRIMARY KEY defined, InnoDB creates hidden internal clustered index (slower). Always define PRIMARY KEY!"**

---

## 9. Pseudocode / Diagrams (When Applicable)

### B-Tree Index Structure

```
┌────────────────────────────────────────────────────────────┐
│                    B-TREE INDEX (HEIGHT = 3)               │
└────────────────────────────────────────────────────────────┘

                       ROOT NODE (Level 0)
                       ┌────────────┐
                       │  [50,100]  │
                       └─────┬──────┘
                 ┌───────────┼───────────┐
                 │           │           │
         ┌───────▼──┐   ┌───▼────┐  ┌──▼──────┐
LEVEL 1: │ [25]     │   │ [75]   │  │ [125]   │
         └────┬─────┘   └────┬───┘  └────┬────┘
              │              │            │
      ┌───────┼──────┐       │       ┌────┼─────┐
      │       │      │       │       │    │     │
  ┌───▼──┐┌──▼──┐┌──▼──┐ ┌──▼──┐┌───▼─┐┌─▼───┐┌─▼───┐
L2│[10,20││30,40││45,48││60,70││80,90││110  ││130  │
  └───┬──┘└──┬──┘└──┬──┘ └──┬──┘└──┬──┘└─┬───┘└─┬───┘
      ↓      ↓      ↓       ↓      ↓     ↓      ↓
    Rows   Rows   Rows    Rows   Rows  Rows   Rows
   (10-20)(30-40)(45-48) (60-70)(80-90)(110)(130)


QUERY: SELECT * FROM users WHERE user_id = 75

Step 1: Root node [50, 100]
   - 75 > 50 and 75 < 100
   - Go to middle child → [75]

Step 2: Node [75]
   - 75 == 75
   - Go to child containing 75

Step 3: Leaf node
   - Find exact row with user_id = 75
   - Return row pointer

Total comparisons: 3 (log₈(64) = 2, but practical 3 levels)
vs Full scan: 64 comparisons


CHARACTERISTICS:
═══════════════════
✓ Balanced: All leaves at same depth
✓ Ordered: Keys sorted left-to-right
✓ Range queries: Fast (walk tree left-to-right)
✓ Disk-friendly: Nodes = disk pages (minimize I/O)
```

### Composite Index Left-to-Right Rule

```
┌────────────────────────────────────────────────────────────┐
│         COMPOSITE INDEX: (status, created_at, user_id)     │
└────────────────────────────────────────────────────────────┘

INDEX STRUCTURE (Sorted):
════════════════════════════
status    | created_at  | user_id
----------|-------------|----------
'active'  | 2024-01-01  | 10
'active'  | 2024-01-01  | 20
'active'  | 2024-01-02  | 15
'active'  | 2024-01-03  | 30
'inactive'| 2024-01-01  | 5
'inactive'| 2024-01-02  | 25


QUERY PATTERNS:
═══════════════════════════════════════════════════════════

✅ USES INDEX (Full or Partial)
─────────────────────────────────
WHERE status = 'active'
   → Uses index (first column)

WHERE status = 'active' AND created_at > '2024-01-01'
   → Uses index (first + second column)

WHERE status = 'active' AND created_at > '2024-01-01' AND user_id = 10
   → Uses index (all three columns)

WHERE status = 'active' AND user_id = 10
   → Partially uses index (first column only)
   → Can't use user_id (skipped created_at)


❌ DOES NOT USE INDEX
─────────────────────────────────
WHERE created_at > '2024-01-01'
   → No index (skipped first column)

WHERE user_id = 10
   → No index (skipped first two columns)

WHERE created_at > '2024-01-01' AND user_id = 10
   → No index (skipped first column)


LEFT-TO-RIGHT RULE:
═══════════════════════════════════════════════════════════

Index (A, B, C) works for:
✅ WHERE A
✅ WHERE A AND B
✅ WHERE A AND B AND C
✅ WHERE A AND C (only A part used)

Does NOT work for:
❌ WHERE B
❌ WHERE C
❌ WHERE B AND C


PRACTICAL EXAMPLE (E-Commerce):
═══════════════════════════════════════════════════════════

Index: (customer_id, order_date DESC, order_id)

Fast queries:
✅ User's orders:
   WHERE customer_id = 123

✅ User's recent orders:
   WHERE customer_id = 123 AND order_date > '2024-01-01'

✅ Specific order:
   WHERE customer_id = 123 AND order_date = '2024-01-15' AND order_id = 999

Slow queries:
❌ Orders by date (skips customer_id):
   WHERE order_date > '2024-01-01'

❌ Specific order (skips customer_id):
   WHERE order_id = 999
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Indexes Matter

**Without Indexes**:
- Full table scans (read all rows)
- Query time: O(N) = 1M rows = 1 second
- Poor user experience

**With Indexes**:
- Direct lookups (binary search in B-Tree)
- Query time: O(log N) = log₂(1M) = 20 comparisons = 0.02ms (50,000x faster)
- Excellent user experience

### Key Principles

1. **B-Tree (default)**: Works for 95% of cases (equality, range, sort)
2. **Hash**: Only for exact match (session tokens, UUIDs)
3. **Composite**: For queries filtering multiple columns (order matters!)
4. **Don't over-index**: < 5 indexes per table (balance read vs write)
5. **Index foreign keys**: Always index columns in JOIN clauses

### When to Apply

**Always Index**:
- Primary keys (automatic in most databases)
- Foreign keys (JOIN performance)
- Columns in WHERE frequently (> 100 queries/min)

**Conditionally Index**:
- ORDER BY columns (if query slow)
- GROUP BY columns (if aggregation slow)
- Composite for multi-column filters (if query common)

**Never Index**:
- Low cardinality (< 100 distinct values, e.g., gender, status)
- Frequently updated columns (write overhead > read benefit)
- Large TEXT/BLOB columns (impractical)

### Production Checklist

- [ ] **Identify slow queries**: > 100ms (EXPLAIN ANALYZE)
- [ ] **Index foreign keys**: All JOIN columns
- [ ] **Create composite indexes**: For multi-column WHERE clauses
- [ ] **Follow left-to-right rule**: Order columns by specificity (equality first, range last)
- [ ] **Limit indexes**: < 5 per table (audit unused indexes)
- [ ] **Monitor write performance**: Ensure indexes don't slow inserts > 2x
- [ ] **Use covering indexes**: Include columns for index-only scans (10x faster)
- [ ] **Rebuild fragmented indexes**: Monthly (REINDEX)
- [ ] **Analyze statistics**: Keep query planner up-to-date (ANALYZE)

### Bottom Line

**Indexes are the #1 database performance optimization. A well-chosen index can make queries 100-1000x faster (1 second → 1ms). For FAANG interviews: Explain B-Tree structure (balanced tree, O(log N)), composite index left-to-right rule, and trade-offs (faster reads, slower writes). Show awareness of covering indexes (include columns), partial indexes (filtered), and geospatial indexes (PostGIS for lat/lng).**

**Real-world lesson from Twitter**: "We index (user_id, created_at DESC) for timeline queries. Single index handles 'user's tweets' + 'user's recent tweets' + sorted by time. Without this composite index, timeline queries took 500ms. With index: 5ms (100x faster)."

