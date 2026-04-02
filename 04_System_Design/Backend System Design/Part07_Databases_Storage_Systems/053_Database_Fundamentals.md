# 53. Database Fundamentals

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Database**: A structured, persistent storage system that organizes, manages, and retrieves data efficiently while ensuring consistency, reliability, and concurrent access.

### Core Concept

**What it is:**
- **Organized storage**: Data stored in structured format (tables, documents, key-value pairs)
- **Persistent**: Data survives process restarts, power failures
- **Efficient access**: Optimized for fast reads/writes via indexing, caching
- **Concurrent access**: Multiple users/processes access simultaneously
- **ACID guarantees**: Atomicity, Consistency, Isolation, Durability (for transactional systems)

**Why databases exist:**
- **File systems insufficient**: No concurrent access control, no querying, no transactions
- **Data integrity**: Enforce constraints (primary keys, foreign keys, unique, not null)
- **Query optimization**: Database engine optimizes queries automatically
- **Concurrent access**: Handle thousands of simultaneous connections
- **Data relationships**: Model complex relationships between entities

**Simple analogy:**
- **File system**: Like storing papers in folders—simple, but no search, no organization
- **Spreadsheet**: Like Excel—tables with rows/columns, but no concurrent access
- **Database**: Like a library—organized, searchable, multiple people access simultaneously, librarian (DB engine) manages everything

### Key Database Concepts

**1. Data Models**
- **Relational**: Tables with rows and columns (SQL databases)
- **Document**: JSON-like documents (MongoDB, Couchbase)
- **Key-Value**: Simple key → value mappings (Redis, DynamoDB)
- **Columnar**: Column-oriented storage (Cassandra, HBase)
- **Graph**: Nodes and edges (Neo4j, Amazon Neptune)
- **Time-Series**: Optimized for time-stamped data (InfluxDB, TimescaleDB)

**2. ACID Properties (Transactional Guarantees)**
- **Atomicity**: All operations in transaction succeed or all fail (no partial commits)
- **Consistency**: Database remains in valid state (constraints enforced)
- **Isolation**: Concurrent transactions don't interfere (serializable execution)
- **Durability**: Committed data persists even after crashes

**3. CAP Theorem**
- **Consistency**: All nodes see same data at same time
- **Availability**: Every request receives response (success or failure)
- **Partition Tolerance**: System continues despite network partitions
- **Trade-off**: Can only guarantee 2 of 3 (CA, CP, or AP)

**4. Database Operations**
- **CRUD**: Create (INSERT), Read (SELECT), Update (UPDATE), Delete (DELETE)
- **Transactions**: Group multiple operations into atomic unit
- **Indexing**: Data structures for fast lookups (B-tree, hash, bitmap)
- **Querying**: Retrieve data matching criteria (SQL, query languages)

**5. Database Architecture**
- **Storage engine**: How data stored on disk (InnoDB, RocksDB)
- **Query optimizer**: Determines best execution plan
- **Transaction manager**: Handles ACID guarantees
- **Buffer pool**: In-memory cache of frequently accessed data
- **Write-ahead log (WAL)**: Ensures durability by logging before writing

### Why Database Fundamentals Matter

**System Design Implications:**
- **Data modeling**: Choose right database for use case
- **Performance**: Indexing strategy impacts query speed 100x-1000x
- **Scalability**: Read replicas, sharding, partitioning strategies
- **Consistency**: Strong vs eventual consistency trade-offs
- **Reliability**: Replication, backups, disaster recovery

**Role in interviews:**
- FAANG asks: "Design a database schema for Twitter"
- Performance questions: "Why is this query slow? How to optimize?"
- Scale questions: "How to handle 1M writes/second?"
- Trade-off questions: "When to use SQL vs NoSQL?"

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🗄️ Relational Database Fundamentals

#### Tables, Rows, and Columns

```sql
-- ═══════════════════════════════════════════════════════════
-- Basic table structure
-- ═══════════════════════════════════════════════════════════

CREATE TABLE users (
    -- Primary key: Uniquely identifies each row
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Columns with data types
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash CHAR(60) NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_username_length CHECK (LENGTH(username) >= 3),
    CONSTRAINT chk_email_format CHECK (email LIKE '%@%.%')
);

CREATE TABLE posts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Foreign key: References users table
    user_id BIGINT NOT NULL,
    
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraint ensures referential integrity
    CONSTRAINT fk_posts_user FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE  -- Delete posts when user deleted
        ON UPDATE CASCADE, -- Update post.user_id when user.id changes
    
    -- Composite index for common query pattern
    INDEX idx_user_created (user_id, created_at DESC)
);

CREATE TABLE comments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    post_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    
    content TEXT NOT NULL,
    parent_comment_id BIGINT NULL, -- Self-referencing for nested comments
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_comments_post FOREIGN KEY (post_id) 
        REFERENCES posts(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent FOREIGN KEY (parent_comment_id) 
        REFERENCES comments(id) ON DELETE CASCADE,
    
    INDEX idx_post_created (post_id, created_at DESC),
    INDEX idx_user_created (user_id, created_at DESC),
    INDEX idx_parent (parent_comment_id)
);

-- ═══════════════════════════════════════════════════════════
-- Data types (PostgreSQL/MySQL)
-- ═══════════════════════════════════════════════════════════

-- Numeric types
SMALLINT          -- 2 bytes: -32,768 to 32,767
INTEGER / INT     -- 4 bytes: -2B to 2B
BIGINT            -- 8 bytes: -9 quintillion to 9 quintillion
DECIMAL(10,2)     -- Exact decimal: 10 digits, 2 after decimal
NUMERIC(10,2)     -- Same as DECIMAL
FLOAT             -- 4 bytes: approximate, fast
DOUBLE            -- 8 bytes: approximate, fast

-- String types
CHAR(10)          -- Fixed length: always 10 bytes (padded)
VARCHAR(255)      -- Variable length: up to 255 bytes
TEXT              -- Variable length: up to 65,535 bytes (MySQL)
MEDIUMTEXT        -- Up to 16MB (MySQL)
LONGTEXT          -- Up to 4GB (MySQL)

-- Date/Time types
DATE              -- YYYY-MM-DD
TIME              -- HH:MM:SS
DATETIME          -- YYYY-MM-DD HH:MM:SS (MySQL)
TIMESTAMP         -- Unix timestamp with timezone (PostgreSQL)
TIMESTAMPTZ       -- Timestamp with timezone (PostgreSQL)

-- Boolean
BOOLEAN / BOOL    -- TRUE/FALSE (PostgreSQL: true/false, MySQL: 1/0)

-- Binary
BLOB              -- Binary large object
BYTEA             -- Binary data (PostgreSQL)

-- JSON
JSON              -- JSON text (validated)
JSONB             -- Binary JSON (PostgreSQL: faster, indexable)

-- Arrays (PostgreSQL)
INTEGER[]         -- Array of integers
TEXT[]            -- Array of text

-- Enum (MySQL/PostgreSQL)
ENUM('pending', 'approved', 'rejected')

-- ═══════════════════════════════════════════════════════════
-- Constraints (Data Integrity)
-- ═══════════════════════════════════════════════════════════

-- PRIMARY KEY: Unique identifier
CREATE TABLE products (
    id BIGINT PRIMARY KEY,           -- Single column
    sku VARCHAR(50) UNIQUE NOT NULL  -- Alternate unique identifier
);

-- Composite primary key
CREATE TABLE order_items (
    order_id BIGINT,
    product_id BIGINT,
    quantity INT NOT NULL,
    PRIMARY KEY (order_id, product_id) -- Combination must be unique
);

-- FOREIGN KEY: Referential integrity
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- UNIQUE: No duplicates
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,     -- Single column
    username VARCHAR(50) UNIQUE NOT NULL
);

-- Composite unique constraint
CREATE TABLE user_roles (
    user_id BIGINT,
    role_id BIGINT,
    UNIQUE (user_id, role_id) -- Each user can have role only once
);

-- NOT NULL: Required field
CREATE TABLE products (
    id BIGINT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,     -- Required
    description TEXT                -- Optional (can be NULL)
);

-- CHECK: Custom validation
CREATE TABLE products (
    id BIGINT PRIMARY KEY,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL,
    
    CHECK (price > 0),                    -- Price must be positive
    CHECK (stock >= 0),                   -- Stock cannot be negative
    CHECK (price < 1000000)               -- Max price
);

-- DEFAULT: Default value
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) DEFAULT 0.00
);
```

---

### 🔍 Indexes (Performance Critical)

```sql
-- ═══════════════════════════════════════════════════════════
-- Index fundamentals
-- ═══════════════════════════════════════════════════════════

-- B-Tree index (default, most common)
CREATE INDEX idx_users_email ON users(email);

-- How it works:
-- - Stores email values in sorted B-tree structure
-- - SELECT * FROM users WHERE email = 'user@example.com'
--   → Index lookup: O(log n) instead of full table scan: O(n)
-- - For 1M users: 20 disk reads instead of 1M reads

-- ═══════════════════════════════════════════════════════════
-- Single-column indexes
-- ═══════════════════════════════════════════════════════════

-- Index on frequently queried column
CREATE INDEX idx_posts_user_id ON posts(user_id);
-- Optimizes: SELECT * FROM posts WHERE user_id = 123

CREATE INDEX idx_orders_created_at ON orders(created_at);
-- Optimizes: SELECT * FROM orders WHERE created_at > '2024-01-01'

-- ═══════════════════════════════════════════════════════════
-- Composite indexes (Multi-column)
-- ═══════════════════════════════════════════════════════════

-- Order matters! Left-to-right prefix matching
CREATE INDEX idx_posts_user_status_created 
ON posts(user_id, status, created_at DESC);

-- This index optimizes:
-- ✅ WHERE user_id = 123
-- ✅ WHERE user_id = 123 AND status = 'published'
-- ✅ WHERE user_id = 123 AND status = 'published' ORDER BY created_at DESC
-- ✅ WHERE user_id = 123 ORDER BY created_at DESC

-- This index DOES NOT optimize:
-- ❌ WHERE status = 'published' (doesn't start with user_id)
-- ❌ WHERE created_at > '2024-01-01' (doesn't start with user_id)
-- ⚠️ WHERE user_id = 123 ORDER BY status (wrong order)

-- Index cardinality matters:
-- High cardinality first: user_id (1M values) → status (3 values)
-- This filters most effectively

-- ═══════════════════════════════════════════════════════════
-- Unique indexes
-- ═══════════════════════════════════════════════════════════

CREATE UNIQUE INDEX idx_users_email ON users(email);
-- Enforces uniqueness + provides fast lookup
-- Equivalent to: UNIQUE constraint

CREATE UNIQUE INDEX idx_users_username_lower 
ON users(LOWER(username));
-- Case-insensitive uniqueness

-- ═══════════════════════════════════════════════════════════
-- Partial indexes (PostgreSQL)
-- ═══════════════════════════════════════════════════════════

-- Index only active orders (smaller, faster)
CREATE INDEX idx_orders_active 
ON orders(customer_id, created_at) 
WHERE status = 'active';

-- Optimizes: SELECT * FROM orders 
--            WHERE customer_id = 123 AND status = 'active'
-- Smaller index → faster queries, less disk space

-- Index only recent data
CREATE INDEX idx_orders_recent 
ON orders(customer_id) 
WHERE created_at > '2024-01-01';

-- ═══════════════════════════════════════════════════════════
-- Covering indexes (Index-only scans)
-- ═══════════════════════════════════════════════════════════

-- Include all columns needed in query
CREATE INDEX idx_posts_covering 
ON posts(user_id, created_at) 
INCLUDE (title, status);
-- PostgreSQL syntax

-- MySQL equivalent: Add columns to index
CREATE INDEX idx_posts_covering 
ON posts(user_id, created_at, title, status);

-- Query doesn't need to access table!
SELECT user_id, created_at, title, status 
FROM posts 
WHERE user_id = 123;
-- Index contains all needed data → Index-only scan

-- ═══════════════════════════════════════════════════════════
-- Full-text indexes
-- ═══════════════════════════════════════════════════════════

-- MySQL full-text index
CREATE FULLTEXT INDEX idx_posts_content ON posts(title, content);

-- Search
SELECT * FROM posts 
WHERE MATCH(title, content) AGAINST('database optimization' IN NATURAL LANGUAGE MODE);

-- PostgreSQL full-text search
CREATE INDEX idx_posts_fts ON posts 
USING GIN(to_tsvector('english', title || ' ' || content));

SELECT * FROM posts 
WHERE to_tsvector('english', title || ' ' || content) 
      @@ to_tsquery('english', 'database & optimization');

-- ═══════════════════════════════════════════════════════════
-- Hash indexes (PostgreSQL)
-- ═══════════════════════════════════════════════════════════

CREATE INDEX idx_users_email_hash ON users USING HASH(email);
-- Only equality comparisons: WHERE email = 'user@example.com'
-- NOT for ranges: WHERE email > 'a' (use B-tree)

-- ═══════════════════════════════════════════════════════════
-- Index cost/benefit analysis
-- ═══════════════════════════════════════════════════════════

-- Benefits:
-- ✅ Fast lookups: O(log n) instead of O(n)
-- ✅ Fast sorting: Index already sorted
-- ✅ Covering scans: No table access needed

-- Costs:
-- ❌ Disk space: Each index = copy of columns
-- ❌ Write overhead: Every INSERT/UPDATE/DELETE updates indexes
-- ❌ Memory usage: Indexes cached in buffer pool

-- Example: 1M row table, 10 indexes
-- - Each index ~100MB → 1GB total index size
-- - INSERT: 1 table write + 10 index writes = 11x slower
-- - Trade-off: Faster reads, slower writes

-- Best practices:
-- 1. Index foreign keys (JOIN columns)
-- 2. Index WHERE clause columns
-- 3. Index ORDER BY columns
-- 4. Composite indexes for common query patterns
-- 5. Avoid over-indexing (diminishing returns)
-- 6. Monitor index usage: DROP unused indexes
```

---

### 💾 ACID Transactions

```sql
-- ═══════════════════════════════════════════════════════════
-- Atomicity: All or nothing
-- ═══════════════════════════════════════════════════════════

-- Bank transfer example
START TRANSACTION;

-- Deduct from sender
UPDATE accounts 
SET balance = balance - 100 
WHERE account_id = 'sender123';

-- Check sender has sufficient funds
SELECT balance FROM accounts WHERE account_id = 'sender123';
-- If balance < 0, ROLLBACK

-- Credit to receiver
UPDATE accounts 
SET balance = balance + 100 
WHERE account_id = 'receiver456';

-- Both succeed or both fail (atomic)
COMMIT; -- Success: Both updates persisted
-- OR
ROLLBACK; -- Failure: Neither update persisted

-- ═══════════════════════════════════════════════════════════
-- Consistency: Database remains in valid state
-- ═══════════════════════════════════════════════════════════

START TRANSACTION;

-- Insert order
INSERT INTO orders (customer_id, total) 
VALUES (123, 150.00);

SET @order_id = LAST_INSERT_ID();

-- Insert order items
INSERT INTO order_items (order_id, product_id, quantity, price) 
VALUES 
    (@order_id, 1, 2, 50.00),
    (@order_id, 2, 1, 50.00);

-- Deduct inventory
UPDATE products SET stock = stock - 2 WHERE id = 1;
UPDATE products SET stock = stock - 1 WHERE id = 2;

-- Check invariant: Order total = sum of items
SELECT SUM(quantity * price) AS items_total 
FROM order_items 
WHERE order_id = @order_id;
-- If items_total != 150.00, ROLLBACK

COMMIT; -- Database remains consistent

-- ═══════════════════════════════════════════════════════════
-- Isolation: Concurrent transactions don't interfere
-- ═══════════════════════════════════════════════════════════

-- Transaction 1 (User A)
START TRANSACTION;
SELECT balance FROM accounts WHERE account_id = 'acct123'; -- Balance: $100
-- ... processing ...
UPDATE accounts SET balance = 90 WHERE account_id = 'acct123';
COMMIT;

-- Transaction 2 (User B) - runs concurrently
START TRANSACTION;
SELECT balance FROM accounts WHERE account_id = 'acct123'; -- Balance: $100 or $90?
UPDATE accounts SET balance = 80 WHERE account_id = 'acct123';
COMMIT;

-- Isolation level determines what Transaction 2 sees

-- Isolation levels (from weakest to strongest):

-- 1. READ UNCOMMITTED (dirty reads possible)
SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
-- T2 can see T1's uncommitted changes
-- Problem: T1 might rollback, T2 read invalid data

-- 2. READ COMMITTED (default in PostgreSQL)
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
-- T2 sees only committed data
-- Problem: Non-repeatable reads (data changes between reads)

START TRANSACTION;
SELECT balance FROM accounts WHERE id = 123; -- $100
-- ... another transaction commits change to $90 ...
SELECT balance FROM accounts WHERE id = 123; -- $90 (changed!)
COMMIT;

-- 3. REPEATABLE READ (default in MySQL)
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
-- T2 sees snapshot of data when transaction started
-- Same query returns same results throughout transaction
-- Problem: Phantom reads (new rows can appear)

START TRANSACTION;
SELECT COUNT(*) FROM orders WHERE status = 'pending'; -- 10 rows
-- ... another transaction inserts pending order ...
SELECT COUNT(*) FROM orders WHERE status = 'pending'; -- 10 rows (snapshot)
COMMIT;

-- 4. SERIALIZABLE (strictest)
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
-- Transactions execute as if serial (one at a time)
-- No dirty reads, non-repeatable reads, or phantom reads
-- Performance cost: Locks, potential deadlocks

-- ═══════════════════════════════════════════════════════════
-- Durability: Committed data persists
-- ═══════════════════════════════════════════════════════════

START TRANSACTION;
INSERT INTO orders (customer_id, total) VALUES (123, 100.00);
COMMIT; -- Data written to write-ahead log (WAL)

-- Even if database crashes immediately after COMMIT:
-- - Data recoverable from WAL
-- - Database replays WAL on restart
-- - INSERT guaranteed to persist

-- Write-ahead logging (WAL):
-- 1. Write change to log (sequential, fast)
-- 2. Return success to client
-- 3. Write to data files (asynchronous, slower)
-- 4. Checkpoint: Sync data files with WAL

-- ═══════════════════════════════════════════════════════════
-- Deadlock example and handling
-- ═══════════════════════════════════════════════════════════

-- Transaction 1
START TRANSACTION;
UPDATE accounts SET balance = 90 WHERE id = 1; -- Locks row 1
-- ... processing ...
UPDATE accounts SET balance = 110 WHERE id = 2; -- Waits for row 2 lock

-- Transaction 2 (concurrent)
START TRANSACTION;
UPDATE accounts SET balance = 120 WHERE id = 2; -- Locks row 2
-- ... processing ...
UPDATE accounts SET balance = 80 WHERE id = 1; -- Waits for row 1 lock

-- DEADLOCK: T1 waits for T2, T2 waits for T1
-- Database detects deadlock, aborts one transaction
-- Error: Deadlock found when trying to get lock; try restarting transaction

-- Deadlock prevention strategies:
-- 1. Lock rows in same order (always lock lower ID first)
-- 2. Use shorter transactions
-- 3. Use SELECT ... FOR UPDATE to lock explicitly
-- 4. Retry on deadlock error
```

---

### 🎯 Query Execution and Optimization

```sql
-- ═══════════════════════════════════════════════════════════
-- Query execution phases
-- ═══════════════════════════════════════════════════════════

-- Phase 1: Parsing
-- SQL → Abstract Syntax Tree (AST)
-- Validates syntax, table/column existence

-- Phase 2: Query optimization
-- Generate execution plans
-- Estimate cost of each plan
-- Choose cheapest plan

-- Phase 3: Execution
-- Execute plan steps
-- Return results

-- ═══════════════════════════════════════════════════════════
-- EXPLAIN: See execution plan
-- ═══════════════════════════════════════════════════════════

EXPLAIN SELECT * FROM posts WHERE user_id = 123;

-- Example output:
-- +----+-------------+-------+------+----------------+------+---------+-------+------+-------+
-- | id | select_type | table | type | possible_keys  | key  | key_len | ref   | rows | Extra |
-- +----+-------------+-------+------+----------------+------+---------+-------+------+-------+
-- |  1 | SIMPLE      | posts | ref  | idx_posts_user | idx  | 8       | const |  50  | NULL  |
-- +----+-------------+-------+------+----------------+------+---------+-------+------+-------+

-- Key fields:
-- - type: Access method (const, ref, range, index, ALL)
--   - const: Primary key/unique lookup (fastest)
--   - ref: Non-unique index lookup
--   - range: Index range scan
--   - index: Full index scan
--   - ALL: Full table scan (slowest)
-- - key: Which index used
-- - rows: Estimated rows scanned
-- - Extra: Additional info (Using where, Using index, Using filesort)

-- ═══════════════════════════════════════════════════════════
-- Query optimization examples
-- ═══════════════════════════════════════════════════════════

-- SLOW: Full table scan
EXPLAIN SELECT * FROM posts WHERE status = 'published';
-- type: ALL, rows: 1000000 (scans entire table)

-- FAST: Index scan
CREATE INDEX idx_posts_status ON posts(status);
EXPLAIN SELECT * FROM posts WHERE status = 'published';
-- type: ref, rows: 500000 (uses index)

-- ═══════════════════════════════════════════════════════════

-- SLOW: Function on indexed column
EXPLAIN SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- Cannot use index on email (function applied)
-- type: ALL (full table scan)

-- FAST: No function on indexed column
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
-- type: ref (uses index)

-- OR: Functional index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));
EXPLAIN SELECT * FROM users WHERE LOWER(email) = 'user@example.com';
-- type: ref (uses functional index)

-- ═══════════════════════════════════════════════════════════

-- SLOW: SELECT *
SELECT * FROM posts WHERE user_id = 123;
-- Fetches all columns (including large TEXT fields)

-- FAST: Select only needed columns
SELECT id, title, created_at FROM posts WHERE user_id = 123;
-- Less data transferred, potentially index-only scan

-- ═══════════════════════════════════════════════════════════

-- SLOW: OR conditions (difficult to optimize)
EXPLAIN SELECT * FROM posts 
WHERE user_id = 123 OR status = 'published';
-- May not use indexes efficiently

-- FAST: UNION (separate index scans)
EXPLAIN 
SELECT * FROM posts WHERE user_id = 123
UNION
SELECT * FROM posts WHERE status = 'published';
-- Each query uses its own index

-- ═══════════════════════════════════════════════════════════

-- SLOW: NOT IN subquery
SELECT * FROM users 
WHERE id NOT IN (SELECT user_id FROM banned_users);
-- Subquery executed for each row

-- FAST: LEFT JOIN with NULL check
SELECT u.* FROM users u
LEFT JOIN banned_users b ON u.id = b.user_id
WHERE b.user_id IS NULL;
-- Single join operation

-- ═══════════════════════════════════════════════════════════

-- SLOW: Sorting without index
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;
-- If no index: Full table scan + sort (filesort)
-- EXPLAIN shows: Extra = Using filesort

-- FAST: Index on ORDER BY column
CREATE INDEX idx_posts_created ON posts(created_at DESC);
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10;
-- Index already sorted, read first 10 entries
-- EXPLAIN shows: Extra = Using index

-- ═══════════════════════════════════════════════════════════
-- JOIN optimization
-- ═══════════════════════════════════════════════════════════

-- Ensure foreign key columns are indexed
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- Efficient JOIN
SELECT 
    u.username,
    p.title,
    COUNT(c.id) AS comment_count
FROM users u
INNER JOIN posts p ON u.id = p.user_id
LEFT JOIN comments c ON p.id = c.post_id
WHERE u.status = 'active'
GROUP BY u.id, p.id;

-- EXPLAIN shows:
-- 1. users: type=ref, key=idx_users_status
-- 2. posts: type=ref, key=idx_posts_user_id (JOIN key)
-- 3. comments: type=ref, key=idx_comments_post_id (JOIN key)

-- JOIN order matters:
-- - Database optimizes JOIN order
-- - Smallest result set first
-- - Index lookups preferred over table scans
```

---

### 🔐 Database Storage Engine Internals

```
┌─────────────────────────────────────────────────────────────┐
│              DATABASE ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CLIENT APPLICATIONS                                │    │
│  │  (SQL queries, transactions)                        │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  CONNECTION POOL                                    │    │
│  │  - Thread per connection                            │    │
│  │  - Authentication                                   │    │
│  │  - Session management                               │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SQL PARSER & OPTIMIZER                             │    │
│  │  - Parse SQL → AST                                  │    │
│  │  - Validate syntax & permissions                    │    │
│  │  - Generate execution plans                         │    │
│  │  - Choose optimal plan (cost-based)                 │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  TRANSACTION MANAGER                                │    │
│  │  - ACID guarantees                                  │    │
│  │  - Lock management (row, table, page)               │    │
│  │  - Deadlock detection                               │    │
│  │  - MVCC (Multi-Version Concurrency Control)         │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  BUFFER POOL (In-Memory Cache)                      │    │
│  │  - Caches frequently accessed pages                 │    │
│  │  - LRU eviction policy                              │    │
│  │  - Dirty page tracking                              │    │
│  │  Typical size: 50-80% of RAM                        │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│             ┌─────────┴─────────┐                           │
│             ▼                   ▼                           │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  INDEX PAGES     │  │  DATA PAGES      │               │
│  │  (B-tree nodes)  │  │  (Table rows)    │               │
│  └──────────────────┘  └──────────────────┘               │
│             │                   │                           │
│             └─────────┬─────────┘                           │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  WRITE-AHEAD LOG (WAL)                              │    │
│  │  - Sequential writes (fast)                         │    │
│  │  - Durability guarantee                             │    │
│  │  - Crash recovery                                   │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  STORAGE ENGINE                                     │    │
│  │  - InnoDB (MySQL): ACID, row-level locking          │    │
│  │  - RocksDB: LSM-tree, write-optimized               │    │
│  │  - WiredTiger (MongoDB): Document storage           │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                      │
│                       ▼                                      │
│  ┌────────────────────────────────────────────────────┐    │
│  │  DISK STORAGE                                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐         │    │
│  │  │ Data     │  │ Indexes  │  │ WAL/Logs │         │    │
│  │  │ Files    │  │          │  │          │         │    │
│  │  └──────────┘  └──────────┘  └──────────┘         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Key concepts:

1. BUFFER POOL
   - In-memory cache of disk pages
   - Page = Fixed-size block (typically 16KB)
   - LRU eviction: Least recently used pages evicted
   - Dirty pages: Modified but not yet written to disk
   - Hit ratio: % of reads served from buffer pool
   - Target: 90%+ hit ratio

2. WRITE-AHEAD LOG (WAL)
   - Log changes before writing to data files
   - Sequential writes (fast)
   - Durability: Committed data in log → survives crashes
   - Checkpointing: Periodically sync data files with WAL
   - Recovery: Replay WAL after crash

3. MVCC (Multi-Version Concurrency Control)
   - Multiple versions of same row
   - Readers don't block writers
   - Writers don't block readers
   - Each transaction sees snapshot of data
   - Old versions garbage collected

4. B-TREE STRUCTURE (Indexes)
   - Balanced tree: All leaf nodes same depth
   - Root → Internal nodes → Leaf nodes
   - Leaf nodes: Actual data or pointers to data
   - Logarithmic lookup: O(log n)
   - Example: 1M rows, depth 3-4 → 3-4 disk reads

5. LSM-TREE (Log-Structured Merge Tree)
   - Write-optimized: RocksDB, Cassandra
   - Writes go to memtable (in-memory)
   - Memtable flushed to SSTables (disk)
   - SSTables compacted periodically
   - Trade-off: Fast writes, slower reads (read amplification)
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Social Media Platform Database Sizing

**Requirements:**
- 100M daily active users (DAU)
- Each user creates 2 posts/day
- Each user reads 50 posts/day (feed)
- Each post: 500 bytes average
- Retention: 5 years

**Write Load Estimation:**
```
Posts created per day:
= 100M users × 2 posts/day
= 200M posts/day

Posts per second (peak):
= 200M / 86,400 seconds
= 2,315 writes/second
= Peak: 2,315 × 3 (3x average)
= ~7,000 writes/second
```

**Read Load Estimation:**
```
Post reads per day:
= 100M users × 50 posts/day
= 5B reads/day

Reads per second (peak):
= 5B / 86,400 seconds
= 57,870 reads/second
= Peak: 57,870 × 3
= ~174,000 reads/second

Read/write ratio: 174k/7k ≈ 25:1 (read-heavy)
```

**Storage Estimation:**
```
Storage per day:
= 200M posts/day × 500 bytes
= 100GB/day
= 3TB/month
= 36TB/year

Storage for 5 years:
= 36TB × 5
= 180TB raw data

With indexes, replication, backups:
= 180TB × 4 (2 indexes + 2 replicas)
= 720TB total storage
```

**Database Sizing:**
```
Memory (Buffer Pool):
= Target: 80% hit ratio
= Working set: Recent 30 days of posts
= 30 days × 100GB/day = 3TB working set
= Buffer pool: 300GB (10% of working set in RAM)

Disk I/O:
= 20% cache miss rate × 174k reads/sec
= 34,800 disk reads/second
= Each read: 1-2ms latency
= Need: Fast SSDs, read replicas

Sharding:
= 180TB / 2TB per shard
= ~90 shards (2TB limit per database)
= Shard by user_id (hash-based sharding)

Replication:
= 1 primary (writes)
= 5 read replicas (reads)
= Load per replica: 174k / 5 = 34,800 reads/second
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Schema Design for E-Commerce Platform

```sql
-- ═══════════════════════════════════════════════════════════
-- Normalized schema (3NF)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE customers (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash CHAR(60) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email)
);

CREATE TABLE addresses (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    address_type ENUM('shipping', 'billing'),
    street_address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    postal_code VARCHAR(20),
    country VARCHAR(50) NOT NULL,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id)
);

CREATE TABLE products (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    category_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CHECK (price > 0),
    CHECK (stock >= 0),
    
    INDEX idx_category (category_id),
    INDEX idx_sku (sku),
    FULLTEXT INDEX idx_name_desc (name, description)
);

CREATE TABLE categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    parent_category_id BIGINT,
    
    FOREIGN KEY (parent_category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_category_id)
);

CREATE TABLE orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    status ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    shipping DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    shipping_address_id BIGINT,
    billing_address_id BIGINT,
    payment_method VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CHECK (subtotal >= 0),
    CHECK (tax >= 0),
    CHECK (total = subtotal + tax + shipping),
    
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (shipping_address_id) REFERENCES addresses(id),
    FOREIGN KEY (billing_address_id) REFERENCES addresses(id),
    
    INDEX idx_customer_created (customer_id, created_at DESC),
    INDEX idx_status_created (status, created_at DESC)
);

CREATE TABLE order_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    
    CHECK (quantity > 0),
    CHECK (price_at_purchase >= 0),
    
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
);

-- ═══════════════════════════════════════════════════════════
-- Denormalized table for analytics (read-optimized)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE order_analytics (
    id BIGINT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    customer_email VARCHAR(255),
    order_date DATE NOT NULL,
    order_total DECIMAL(10, 2),
    product_count INT,
    status VARCHAR(20),
    
    -- Denormalized for fast aggregations
    customer_lifetime_value DECIMAL(10, 2),
    customer_order_count INT,
    
    INDEX idx_order_date (order_date),
    INDEX idx_customer (customer_id),
    INDEX idx_status (status)
);

-- Updated via trigger or batch job
-- Trade-off: Data duplication vs query performance
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Database Scalability Strategies

```
┌─────────────────────────────────────────────────────────────┐
│                  READ SCALING                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │   CLIENT     │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────┐                                       │
│  │  LOAD BALANCER   │                                       │
│  └──────┬───────────┘                                       │
│         │                                                    │
│         ├─────── Writes ──────┐                             │
│         │                     ▼                             │
│         │              ┌──────────────┐                     │
│         │              │   PRIMARY    │                     │
│         │              │  (Read/Write)│                     │
│         │              └──────┬───────┘                     │
│         │                     │                             │
│         │                     │ Replication                 │
│         │        ┌────────────┼────────────┐               │
│         │        ▼            ▼            ▼               │
│         │   ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│         └──▶│REPLICA 1│  │REPLICA 2│  │REPLICA 3│         │
│    Reads    │ (Read)  │  │ (Read)  │  │ (Read)  │         │
│             └─────────┘  └─────────┘  └─────────┘         │
│                                                              │
│  Benefits:                                                   │
│  ✅ Horizontal read scaling (add more replicas)             │
│  ✅ High availability (failover to replica)                 │
│  ✅ Geographic distribution (low latency)                   │
│                                                              │
│  Limitations:                                                │
│  ⚠️ Replication lag (eventual consistency)                  │
│  ⚠️ Write bottleneck (single primary)                       │
│  ⚠️ Storage limit (all replicas have full dataset)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  WRITE SCALING                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SHARDING (Horizontal Partitioning)                          │
│                                                              │
│  ┌──────────────┐                                           │
│  │   CLIENT     │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────┐                                       │
│  │  SHARD ROUTER    │                                       │
│  │  (Determines     │                                       │
│  │   which shard)   │                                       │
│  └──────┬───────────┘                                       │
│         │                                                    │
│    ┌────┴──────┬──────────┬──────────┐                     │
│    ▼           ▼          ▼          ▼                     │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│ │SHARD 1 │ │SHARD 2 │ │SHARD 3 │ │SHARD 4 │               │
│ │user_id │ │user_id │ │user_id │ │user_id │               │
│ │ 0-25M  │ │25M-50M │ │50M-75M │ │75M-100M│               │
│ └────────┘ └────────┘ └────────┘ └────────┘               │
│                                                              │
│  Shard Key Selection:                                        │
│  - Hash-based: hash(user_id) % num_shards                   │
│  - Range-based: user_id ranges                              │
│  - Geographic: by region                                     │
│                                                              │
│  Benefits:                                                   │
│  ✅ Horizontal write scaling                                 │
│  ✅ Distributed storage (no single DB limit)                │
│  ✅ Parallel processing                                      │
│                                                              │
│  Challenges:                                                 │
│  ⚠️ Cross-shard queries expensive                           │
│  ⚠️ Hot shard problem (uneven distribution)                 │
│  ⚠️ Resharding difficult (adding/removing shards)           │
│  ⚠️ Distributed transactions complex                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### High Availability Setup

```sql
-- ═══════════════════════════════════════════════════════════
-- Primary-Replica configuration (MySQL)
-- ═══════════════════════════════════════════════════════════

-- PRIMARY server:
-- my.cnf
[mysqld]
server-id = 1
log-bin = mysql-bin
binlog-format = ROW
sync-binlog = 1
innodb-flush-log-at-trx-commit = 1

-- REPLICA server:
-- my.cnf
[mysqld]
server-id = 2
relay-log = relay-bin
read-only = 1

-- Setup replication:
-- On primary:
CREATE USER 'replicator'@'replica-host' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'replicator'@'replica-host';
SHOW MASTER STATUS; -- Note File and Position

-- On replica:
CHANGE MASTER TO
    MASTER_HOST='primary-host',
    MASTER_USER='replicator',
    MASTER_PASSWORD='password',
    MASTER_LOG_FILE='mysql-bin.000001',
    MASTER_LOG_POS=12345;

START SLAVE;
SHOW SLAVE STATUS\G -- Check replication status

-- ═══════════════════════════════════════════════════════════
-- Automatic failover with ProxySQL
-- ═══════════════════════════════════════════════════════════

-- ProxySQL configuration:
-- Monitors primary health
-- Routes writes to primary
-- Routes reads to replicas
-- Automatic failover on primary failure
-- Promotes replica to primary

-- Application sees single endpoint:
-- jdbc:mysql://proxysql-host:6033/database

-- ProxySQL handles:
-- - Connection pooling
-- - Query routing
-- - Load balancing
-- - Failover
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Database Security Best Practices

```sql
-- ═══════════════════════════════════════════════════════════
-- User management and least privilege
-- ═══════════════════════════════════════════════════════════

-- Application user (limited privileges)
CREATE USER 'app_user'@'app-server-host' IDENTIFIED BY 'strong-password';

-- Grant only necessary privileges
GRANT SELECT, INSERT, UPDATE, DELETE 
ON ecommerce.orders, ecommerce.order_items, ecommerce.customers
TO 'app_user'@'app-server-host';

-- Read-only user for analytics
CREATE USER 'analytics_user'@'analytics-host' IDENTIFIED BY 'password';
GRANT SELECT ON ecommerce.* TO 'analytics_user'@'analytics-host';

-- Backup user
CREATE USER 'backup_user'@'backup-host' IDENTIFIED BY 'password';
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER 
ON *.* TO 'backup_user'@'backup-host';

-- ═══════════════════════════════════════════════════════════
-- Password hashing (never store plaintext!)
-- ═══════════════════════════════════════════════════════════

-- WRONG ❌
INSERT INTO users (username, password) 
VALUES ('john', 'mypassword123');

-- CORRECT ✓ (application layer hashing)
-- Use bcrypt, scrypt, or Argon2
-- Java example:
String hashedPassword = BCrypt.hashpw(plainPassword, BCrypt.gensalt(12));

INSERT INTO users (username, password_hash) 
VALUES ('john', '$2a$12$...');

-- Verification:
SELECT password_hash FROM users WHERE username = 'john';
-- Then: BCrypt.checkpw(inputPassword, storedHash)

-- ═══════════════════════════════════════════════════════════
-- SQL injection prevention
-- ═══════════════════════════════════════════════════════════

-- VULNERABLE ❌
String query = "SELECT * FROM users WHERE username = '" + userInput + "'";
// If userInput = "admin' OR '1'='1"
// Query becomes: SELECT * FROM users WHERE username = 'admin' OR '1'='1'
// Returns all users!

-- SAFE ✓ Prepared statements (parameterized queries)
String query = "SELECT * FROM users WHERE username = ?";
PreparedStatement stmt = connection.prepareStatement(query);
stmt.setString(1, userInput); // Properly escaped

-- ═══════════════════════════════════════════════════════════
-- Encryption
-- ═══════════════════════════════════════════════════════════

-- Encryption at rest (MySQL)
[mysqld]
innodb-encryption = ON
innodb-encryption-threads = 4

-- Transparent Data Encryption (TDE)
-- Encrypts tablespaces on disk
-- Decrypts in memory
-- No application changes needed

-- Encryption in transit (SSL/TLS)
-- Require SSL for connections
CREATE USER 'secure_user'@'%' 
IDENTIFIED BY 'password' 
REQUIRE SSL;

-- ═══════════════════════════════════════════════════════════
-- Auditing
-- ═══════════════════════════════════════════════════════════

-- Enable audit log (MySQL Enterprise)
[mysqld]
plugin-load = audit_log.so
audit-log-format = JSON
audit-log-policy = ALL

-- Logs all queries with:
-- - Username
-- - Timestamp
-- - Query text
-- - Success/failure
-- - Source IP

-- ═══════════════════════════════════════════════════════════
-- Data masking (hide sensitive data)
-- ═══════════════════════════════════════════════════════════

-- Production database:
SELECT id, name, email, credit_card FROM customers;
-- 1, 'John Doe', 'john@example.com', '4532-1234-5678-9010'

-- Non-production (masked):
SELECT 
    id, 
    name, 
    CONCAT(LEFT(email, 3), '***@***', RIGHT(email, 4)) AS email,
    CONCAT('****-****-****-', RIGHT(credit_card, 4)) AS credit_card
FROM customers;
-- 1, 'John Doe', 'joh***@***.com', '****-****-****-9010'
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Instagram's Database Evolution

**Initial Architecture (2010):**
- Single PostgreSQL database
- ~10,000 users
- Simple schema: users, photos, likes, comments

**Problem at 1M users:**
- Single database overloaded
- Slow queries on feed generation
- Disk I/O bottleneck

**Solution: Read Replicas**
- 1 primary (writes)
- 5 read replicas (reads)
- Load balancer routes reads to replicas
- Result: 5x read capacity

**Problem at 10M users:**
- Primary database overloaded with writes
- Single table too large (photos table: 100M rows)
- Slow queries even with indexes

**Solution: Sharding**
- Shard by user_id (hash-based)
- 100 shards (1M users each)
- Each shard: 1 primary + 2 replicas
- Result: 100x write capacity

**Problem: Hot shard (celebrity users):**
- User with 50M followers
- All follower queries hit same shard
- Shard overloaded

**Solution: Further optimization**
- Separate follower graph to graph database (Cassandra)
- Cache celebrity feeds in Redis
- Async fan-out for celebrity posts
- Result: Even distribution

**Key Lessons:**
1. Start simple (single database)
2. Add read replicas when read-bound
3. Shard when write-bound
4. Handle hot shards with caching/special handling
5. Different data structures for different access patterns

---

### Example 2: Uber's Schemaless (MySQL on Top)

**Challenge:**
- 1000s of microservices
- Each needs database
- Traditional: 1 MySQL database per service
- Problem: Managing 1000s of MySQL instances

**Schemaless Architecture:**
- Logical databases mapped to physical MySQL shards
- Thousands of logical databases
- Hundreds of physical MySQL shards
- Many logical databases per physical shard

**Benefits:**
- Resource efficiency (shared infrastructure)
- Simplified operations
- Automatic sharding and rebalancing
- Consistent tooling

**Schema:**
```json
{
  "id": "uuid",
  "data": {
    // Application-specific data (JSON blob)
    "driver_id": "12345",
    "status": "active",
    "location": {"lat": 37.7749, "lon": -122.4194}
  },
  "created_at": 1609459200,
  "updated_at": 1609459200
}
```

**Key Features:**
- Append-only (no updates, only inserts)
- Versioning built-in
- Eventually consistent
- High write throughput

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Answer: "Explain database fundamentals"

**Crisp Answer:**
*"Database is persistent storage system that organizes, manages, and retrieves data efficiently. Core concepts: data models (relational, document, key-value), ACID properties (atomicity, consistency, isolation, durability), and CAP theorem (consistency, availability, partition tolerance—pick 2 of 3).*

*Relational databases use tables with rows and columns. Each table has primary key (unique identifier) and foreign keys (relationships). Indexes enable fast lookups—B-tree index converts O(n) table scan to O(log n) lookup.*

*ACID guarantees: Atomicity (all or nothing), Consistency (valid state), Isolation (concurrent transactions don't interfere), Durability (committed data persists). Achieved via write-ahead logging, transaction manager, and MVCC.*

*Scalability: Read replicas for read-heavy workloads, sharding for write-heavy workloads. Trade-off: Eventual consistency with replicas, cross-shard query complexity with sharding.*

*Real-world: Instagram started with single PostgreSQL, added read replicas at 1M users, sharded at 10M users. Each scaling stage addresses specific bottleneck."*

### Common Follow-Up Questions

**Q: "How do you choose between SQL and NoSQL?"**

**A:** *"Choose SQL when: Need ACID transactions (financial systems), complex queries with JOINs (reporting), structured data with relationships (e-commerce orders). Examples: PostgreSQL, MySQL.*

*Choose NoSQL when: Horizontal scalability critical (social media), flexible schema (rapid iteration), specific data model fits (key-value for caching, document for catalogs, graph for social). Examples: MongoDB, Cassandra, Redis.*

*Many systems use both: SQL for transactional data (orders, payments), NoSQL for high-volume data (logs, metrics, session data). Polyglot persistence."*

---

**Q: "How does indexing work and when to use it?"**

**A:** *"Index is data structure (B-tree, hash) enabling fast lookups. Without index: Full table scan O(n). With index: Tree lookup O(log n). For 1M rows: 1M reads vs 20 reads.*

*Create index on: WHERE clause columns, JOIN columns, ORDER BY columns, Foreign keys. Example: users table with email lookups—index on email column.*

*Composite index for multi-column queries. Order matters: High cardinality first. Example: index on (user_id, status, created_at) optimizes 'WHERE user_id = 123 AND status = active ORDER BY created_at'.*

*Index cost: Disk space (duplicate column data), write overhead (every INSERT/UPDATE/DELETE updates indexes). Balance: Too few indexes—slow reads. Too many indexes—slow writes. Monitor index usage, drop unused indexes."*

---

**Q: "Explain replication lag and how to handle it"**

**A:** *"Replication lag is delay between write on primary and visibility on replica. Primary commits transaction, replica applies change 100ms later. During lag, replica shows stale data.*

*Causes: Network latency, replica slower hardware, high write volume, large transactions, replica busy with queries.*

*Handling strategies:*

*1. Read-after-write consistency: Route read to primary for user's own writes. Read replicas for other users' data. Example: After posting comment, read from primary to show immediately.*

*2. Session consistency: Stick user to same replica for session duration. Replica eventually catches up, user sees consistent view.*

*3. Causal consistency: Track version numbers, wait for replica to reach version before reading.*

*4. Expose lag in UI: Show 'Updated 2 seconds ago' instead of hiding lag.*

*5. Critical reads from primary: Payment confirmations, inventory checks read from primary. Feed, search read from replicas (eventual consistency acceptable).*

*Real-world: Twitter shows follower count with ~5 second lag acceptable. Bank balance must be real-time from primary."*

---

**Q: "How do you handle database schema migrations in production?"**

**A:** *"Schema migration changes database structure without downtime. Challenges: Large tables (ALTER TABLE locks table), production traffic (can't take downtime), data consistency.*

*Strategy:*

*1. Online schema change: Use tools like pt-online-schema-change (Percona) or gh-ost (GitHub). Creates shadow table, copies data in chunks, swaps tables atomically. No downtime.*

*2. Backward-compatible changes: Add column as nullable, deploy application code, backfill data, make not null. Each step safe to rollback.*

*3. Blue-green deployment: Run old and new schema simultaneously. Use application logic to write both formats. Cutover when confident. Example: Renaming column—write to both old_name and new_name, read from new_name, drop old_name later.*

*4. Feature flags: Deploy schema change behind flag. Enable gradually. Rollback by disabling flag.*

*Example: Adding email column to users table (100M rows):*
*- Day 1: ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL (fast, no data)*
*- Day 2-7: Backfill email for active users (batch job, 10k rows/minute)*
*- Day 8: Deploy code to validate email on registration*
*- Day 14: ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL (risky—ensure all rows have email)*

*Avoid: Dropping columns/tables immediately (deploy code first, drop schema months later). Changing column types (requires rewrite). Large transactions (chunk into smaller transactions)."*

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why Database Fundamentals Matter

**Business Impact:**
- **Data integrity**: Prevent data corruption, lost transactions
- **Performance**: Fast queries = responsive application = happy users
- **Scalability**: Handle growth from 1k to 100M users
- **Reliability**: 99.99% uptime = $10k/hour downtime cost avoided
- **Cost**: Proper indexing = 10x fewer servers needed

**Technical Impact:**
- **ACID guarantees**: Financial correctness (no lost money)
- **Concurrent access**: Thousands of simultaneous users
- **Query optimization**: 100ms queries instead of 10s queries
- **Data modeling**: Efficient storage and retrieval
- **Disaster recovery**: Backups, replicas, point-in-time recovery

### How Databases Work

**Core Mechanisms:**
1. **Storage Engine**: Organizes data on disk (B-trees, LSM-trees)
2. **Buffer Pool**: Caches frequently accessed data in memory
3. **Transaction Manager**: Ensures ACID properties
4. **Query Optimizer**: Chooses fastest execution plan
5. **Write-Ahead Log**: Durability guarantee (crash recovery)

**Key Concepts:**
- **Indexing**: O(log n) lookup instead of O(n) scan
- **Replication**: Primary + replicas for high availability
- **Sharding**: Horizontal partitioning for write scalability
- **MVCC**: Multiple versions enable concurrent reads/writes
- **Isolation levels**: Trade-off between consistency and performance

### Trade-Offs to Remember

```
Strong Consistency ←→ High Availability
- Strong: All nodes see same data (slow, single primary)
- Eventual: Nodes eventually consistent (fast, distributed)

Normalized ←→ Denormalized
- Normalized: No duplication (complex queries, JOINs)
- Denormalized: Duplicated data (fast queries, simple)

Many Indexes ←→ Few Indexes
- Many: Fast reads (slow writes, more storage)
- Few: Fast writes (slow reads, less storage)

SQL ←→ NoSQL
- SQL: ACID, relations, JOINs (limited scale)
- NoSQL: Scale, flexibility (eventual consistency)
```

### Interview Red Flags

🚫 "I'll just use NoSQL, it's faster"
✅ "SQL for transactions, NoSQL for scale—depends on use case"

🚫 "Add indexes on all columns for fast queries"
✅ "Index WHERE/JOIN/ORDER BY columns, monitor usage, balance read/write performance"

🚫 "Databases handle consistency automatically"
✅ "ACID in SQL, eventual consistency in distributed NoSQL—understand trade-offs"

### Final Sound Bite

*"Database fundamentals: Persistent storage with structure, indexes, transactions, and concurrent access. Core concepts: ACID properties (atomicity, consistency, isolation, durability), CAP theorem (consistency, availability, partition tolerance—pick 2), data models (relational, document, key-value), and scalability patterns (replication, sharding).*

*Relational databases use tables, rows, columns. Primary keys uniquely identify rows. Foreign keys model relationships. Indexes enable O(log n) lookups via B-trees—1M rows: 20 reads instead of 1M. ACID via write-ahead log and transaction manager.*

*Scalability: Read replicas (5x read capacity, eventual consistency). Sharding (100x write capacity, cross-shard complexity). Instagram: single PostgreSQL → read replicas at 1M users → 100 shards at 10M users.*

*Trade-offs: Strong consistency vs availability. Normalized (no duplication) vs denormalized (fast queries). Many indexes (fast reads, slow writes) vs few indexes. SQL (ACID, relations) vs NoSQL (scale, flexibility).*

*Real-world: Choose right database for use case. Monitor query performance. Index strategically. Plan for growth. Understand consistency guarantees. Test failure scenarios. Databases are foundation of every system—master fundamentals."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
