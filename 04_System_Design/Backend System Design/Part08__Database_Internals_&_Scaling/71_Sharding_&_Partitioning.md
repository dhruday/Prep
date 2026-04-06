# 71. Sharding & Partitioning

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Sharding & Partitioning?

**Sharding** (horizontal partitioning) is splitting a large database into smaller, independent pieces called **shards**, where each shard is stored on a separate server.

**Partitioning** is dividing a table into smaller pieces, either by rows (horizontal) or columns (vertical), often within a single server.

**Key Difference**:
- **Partitioning**: Multiple pieces, same server (or same database cluster)
- **Sharding**: Multiple pieces, different servers (distributed across machines)

### Example: User Table with 100M Rows

**Without Sharding** (Single Server):
```
┌─────────────────────────────┐
│  Single Database Server     │
│  users table (100M rows)    │
│  - 500 GB storage           │
│  - Slow queries (10 sec)    │
│  - Max 1,000 writes/sec     │
└─────────────────────────────┘
```

**With Sharding** (4 Shards):
```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Shard 1  │  │ Shard 2  │  │ Shard 3  │  │ Shard 4  │
│ users    │  │ users    │  │ users    │  │ users    │
│ 0-25M    │  │ 25M-50M  │  │ 50M-75M  │  │ 75M-100M │
│ 125 GB   │  │ 125 GB   │  │ 125 GB   │  │ 125 GB   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

Benefits:
- Faster queries (2 sec, query only 25M rows per shard)
- 4x write capacity (4,000 writes/sec total)
- Horizontal scaling (add more shards for more capacity)
```

### Why Shard?

| Problem | Solution with Sharding |
|---------|----------------------|
| **Table too large** (> 1 TB) | Split into smaller tables (< 250 GB each) |
| **Queries too slow** (full table scan) | Query single shard (1/4 of data) |
| **Write bottleneck** (max 1K writes/sec) | Distribute writes across shards (4K writes/sec) |
| **Single point of failure** | Multiple servers (fault tolerance) |

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Horizontal Partitioning vs Sharding

**Horizontal Partitioning** (same server/cluster):
```sql
-- Partition users table by created_at (PostgreSQL)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

-- Partitions
CREATE TABLE users_2023 PARTITION OF users
    FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE users_2024 PARTITION OF users
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Query optimizer automatically routes to correct partition
SELECT * FROM users WHERE created_at >= '2024-01-01';
-- Only queries users_2024 partition (faster)
```

**Benefits**:
- Faster queries (query only relevant partition)
- Easier maintenance (drop old partitions, e.g., DELETE data from 2020)
- Same server (no distributed system complexity)

**Limitations**:
- Still on single server (no horizontal scaling for writes)
- Server hardware limit (max 96 cores, 1 TB RAM)

---

**Sharding** (different servers):
```python
# Route user to specific shard based on user_id
def get_shard(user_id):
    shard_count = 4
    shard_id = user_id % shard_count  # Hash function
    return shards[shard_id]

# Insert user
def create_user(user_id, name, email):
    shard = get_shard(user_id)
    shard.execute("INSERT INTO users (user_id, name, email) VALUES (%s, %s, %s)", 
                  (user_id, name, email))

# Query user
def get_user(user_id):
    shard = get_shard(user_id)
    return shard.query("SELECT * FROM users WHERE user_id = %s", user_id)
```

**Benefits**:
- Horizontal scaling (add more servers for more capacity)
- 4 shards = 4x write capacity (distributed writes)
- Fault tolerance (1 shard down = 75% still available)

**Limitations**:
- Complex (application must route to correct shard)
- Cross-shard queries expensive (query all shards, merge results)
- Resharding painful (data migration when adding shards)

---

### 2. Vertical Partitioning

**Definition**: Split table by columns (rarely used vs horizontal).

**Example: Users Table (30 columns)**
```sql
-- Original (30 columns, 5 KB per row)
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password_hash CHAR(64),
    bio TEXT,  -- 2 KB
    profile_picture BLOB,  -- 2 KB (rarely accessed)
    settings JSON,
    ... (25 more columns)
);

-- Problem: SELECT user_id, name queries fetch all 5 KB (wasteful)
```

**Vertical Partitioning**:
```sql
-- Frequently accessed columns (hot table)
CREATE TABLE users_core (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    password_hash CHAR(64),
    created_at TIMESTAMP
);  -- 200 bytes per row

-- Rarely accessed columns (cold table)
CREATE TABLE users_profile (
    user_id INT PRIMARY KEY,
    bio TEXT,
    profile_picture BLOB,
    settings JSON,
    FOREIGN KEY (user_id) REFERENCES users_core(user_id)
);  -- 4.8 KB per row

-- Query (only fetch what you need)
SELECT user_id, name FROM users_core;  -- 200 bytes (not 5 KB)
```

**Benefits**:
- Faster queries (less data transferred)
- Better cache utilization (more rows fit in memory)

**Use Case**:
- Wide tables (> 50 columns) with columns accessed at different frequencies
- Large BLOB columns (profile pictures, documents) rarely accessed

---

### 3. Sharding Strategies (Covered in Next Files)

**Preview** (detailed in files 72-74):

**Range-Based Sharding**:
```
Shard 1: user_id 1 - 1,000,000
Shard 2: user_id 1,000,001 - 2,000,000
Shard 3: user_id 2,000,001 - 3,000,000
```

**Hash-Based Sharding**:
```
shard_id = hash(user_id) % shard_count
```

**Directory-Based Sharding**:
```
Lookup table: {user_id → shard_id}
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### When to Shard?

**Decision Criteria**:

```
Database Size:
- < 500 GB:      Don't shard (single server sufficient)
- 500 GB - 2 TB: Consider partitioning (monthly partitions)
- > 2 TB:        Shard (multiple servers required)

Write Load:
- < 5K writes/sec:  Don't shard (vertical scaling sufficient)
- 5K - 20K:         Consider read replicas first (cheaper)
- > 20K:            Shard (distribute writes)

Query Performance:
- P95 < 100ms:  Don't shard (queries fast enough)
- P95 > 1 sec:  Shard or partition (reduce data scanned per query)
```

**Example: E-commerce Platform**

```
Users table:
- 100M rows
- 500 bytes per row
- 50 GB total
- 10K writes/sec (user signups, profile updates)
- 100K reads/sec (login, profile views)

Single server limits:
- Storage: 1 TB max (50 GB OK)
- Writes: 5K writes/sec max (10K exceeds limit) ❌
- Reads: 50K reads/sec max (100K exceeds limit) ❌

Solution: Shard into 4 shards
- Shard 1-4: 25M rows each (12.5 GB)
- Writes: 2.5K writes/sec per shard (within limit) ✅
- Reads: 25K reads/sec per shard (within limit) ✅
```

**Cost Comparison**:

```
Option 1: Single powerful server
- 96 cores, 512 GB RAM, 2 TB SSD
- Cost: $5,000/month
- Limit: Cannot scale beyond 20K writes/sec

Option 2: 4 shards (medium servers)
- Each: 16 cores, 64 GB RAM, 500 GB SSD
- Cost: 4 × $600 = $2,400/month
- Scalable: Can add more shards (40K, 60K writes/sec)

Conclusion: Sharding cheaper and more scalable
```

---

## 4. Data & Storage Design

### Choosing Shard Key

**Shard Key** = Column used to determine which shard a row belongs to.

**Good Shard Key Properties**:
1. **High cardinality**: Many unique values (e.g., user_id with 100M users)
2. **Even distribution**: Balanced load across shards (no hot shards)
3. **Query-friendly**: Most queries filter by shard key (single-shard queries)

**Examples**:

**Good: user_id**
```python
shard_id = user_id % 4

user_id = 1 → Shard 1
user_id = 2 → Shard 2
user_id = 3 → Shard 3
user_id = 4 → Shard 0
user_id = 5 → Shard 1

Distribution: Even (25% per shard)
Queries: SELECT * FROM users WHERE user_id = 123 (single shard)
```

**Bad: country**
```python
shard_id = hash(country) % 4

country = 'US' → Shard 1 (50% of users)
country = 'India' → Shard 2 (30%)
country = 'UK' → Shard 3 (10%)
country = 'Canada' → Shard 0 (10%)

Distribution: Uneven (hot shard: Shard 1 with 50%)
Problem: Shard 1 overloaded, others underutilized
```

**Bad: timestamp** (for growing data)
```python
shard_id = (created_at.year - 2020) % 4

2020 → Shard 0 (old users, inactive)
2021 → Shard 1
2022 → Shard 2
2023 → Shard 3 (all new users, hot shard)

Distribution: All new writes to Shard 3 (hot shard problem)
```

---

### Shard Key vs Partition Key

**Partition Key** (single server):
```sql
-- Partition by created_at (time-based)
CREATE TABLE orders PARTITION BY RANGE (created_at);

CREATE TABLE orders_2023 PARTITION OF orders FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE orders_2024 PARTITION OF orders FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Query automatically routed to correct partition
SELECT * FROM orders WHERE created_at >= '2024-01-01';  -- Only queries orders_2024
```

**Shard Key** (multiple servers):
```python
# Shard by user_id (application-level routing)
def get_shard(user_id):
    return shards[user_id % 4]

shard = get_shard(user_id)
shard.query("SELECT * FROM orders WHERE user_id = %s", user_id)
```

**Key Difference**:
- **Partition key**: Database handles routing (transparent to application)
- **Shard key**: Application handles routing (explicit in code)

---

## 5. Scalability, Reliability & Fault Tolerance

### Challenges with Sharding

#### 1. Cross-Shard Queries

**Problem**: Query data across multiple shards (expensive)

**Example: Follower Feed**
```python
# Get user's feed (posts from followed users)
def get_feed(user_id):
    # User follows 500 people across all 4 shards
    following = get_following(user_id)  # [1, 5, 7, 123, 456, ...]
    
    # Must query all 4 shards (following distributed)
    posts = []
    for shard in [shard1, shard2, shard3, shard4]:
        shard_posts = shard.query("""
            SELECT * FROM posts
            WHERE user_id IN (%s)
            ORDER BY created_at DESC
            LIMIT 20
        """, following)
        posts.extend(shard_posts)
    
    # Merge results from all shards (application-level sort)
    posts.sort(key=lambda p: p.created_at, reverse=True)
    return posts[:20]

# Complexity: Query 4 shards + merge results (slow)
# Time: 4 × 50ms = 200ms (vs 50ms single-shard query)
```

**Solution: Denormalize**
```sql
-- Denormalized feed table (sharded by user_id)
CREATE TABLE user_feeds (
    user_id INT,
    post_id INT,
    post_content TEXT,
    posted_by INT,
    created_at TIMESTAMP
);

-- When user posts, insert into all followers' feeds
def create_post(user_id, content):
    post_id = insert_post(user_id, content)
    
    followers = get_followers(user_id)  # 1000 followers
    for follower_id in followers:
        shard = get_shard(follower_id)
        shard.execute("""
            INSERT INTO user_feeds (user_id, post_id, post_content, posted_by, created_at)
            VALUES (%s, %s, %s, %s, NOW())
        """, (follower_id, post_id, content, user_id))

# Query feed (single shard)
def get_feed(user_id):
    shard = get_shard(user_id)
    return shard.query("""
        SELECT * FROM user_feeds
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 20
    """, user_id)

# Time: 10ms (single shard, no merge)
# Trade-off: Write amplification (1 post → 1000 inserts)
```

---

#### 2. Distributed Transactions

**Problem**: Transaction spans multiple shards (complex)

**Example: Money Transfer Between Users on Different Shards**
```python
# User 1 (Shard 1) transfers $100 to User 2 (Shard 2)
def transfer_money(from_user, to_user, amount):
    shard1 = get_shard(from_user)
    shard2 = get_shard(to_user)
    
    # Two-Phase Commit (2PC)
    try:
        # Phase 1: Prepare (lock resources)
        shard1.execute("BEGIN")
        shard1.execute("UPDATE users SET balance = balance - %s WHERE user_id = %s", (amount, from_user))
        shard1.execute("PREPARE TRANSACTION 'txn_123'")
        
        shard2.execute("BEGIN")
        shard2.execute("UPDATE users SET balance = balance + %s WHERE user_id = %s", (amount, to_user))
        shard2.execute("PREPARE TRANSACTION 'txn_123'")
        
        # Phase 2: Commit (if both prepared successfully)
        shard1.execute("COMMIT PREPARED 'txn_123'")
        shard2.execute("COMMIT PREPARED 'txn_123'")
        
    except Exception as e:
        # Rollback on either shard
        shard1.execute("ROLLBACK PREPARED 'txn_123'")
        shard2.execute("ROLLBACK PREPARED 'txn_123'")
        raise

# Complexity: Coordinator (tracks transaction state), timeouts (what if shard1 commits but shard2 times out?)
# Performance: Slow (2 round trips: prepare + commit)
```

**Better Solution: Avoid Cross-Shard Transactions**
```python
# Keep related data on same shard (co-locate)
# Shard transfers table by from_user (not to_user)
def transfer_money(from_user, to_user, amount):
    shard = get_shard(from_user)
    
    # Single-shard transaction (fast, ACID guaranteed)
    shard.execute("BEGIN")
    shard.execute("UPDATE users SET balance = balance - %s WHERE user_id = %s", (amount, from_user))
    shard.execute("INSERT INTO transfers (from_user, to_user, amount) VALUES (%s, %s, %s)", 
                  (from_user, to_user, amount))
    shard.execute("COMMIT")
    
    # Asynchronous: Process transfer (credit to_user on Shard 2)
    queue.enqueue('process_transfer', {'to_user': to_user, 'amount': amount})

# Eventually consistent (to_user credited within 1 second)
```

---

#### 3. Resharding (Adding/Removing Shards)

**Problem**: When load increases, need more shards (painful data migration)

**Example: 4 Shards → 8 Shards**
```
Before (4 shards):
shard_id = user_id % 4

Shard 0: user_id = 0, 4, 8, 12, ...
Shard 1: user_id = 1, 5, 9, 13, ...
Shard 2: user_id = 2, 6, 10, 14, ...
Shard 3: user_id = 3, 7, 11, 15, ...

After (8 shards):
shard_id = user_id % 8

Shard 0: user_id = 0, 8, 16, ...   (keep 0, move 4→4, move 8→0)
Shard 1: user_id = 1, 9, 17, ...
Shard 2: user_id = 2, 10, 18, ...
Shard 3: user_id = 3, 11, 19, ...
Shard 4: user_id = 4, 12, 20, ...  (new shard)
Shard 5: user_id = 5, 13, 21, ...  (new shard)
Shard 6: user_id = 6, 14, 22, ...  (new shard)
Shard 7: user_id = 7, 15, 23, ...  (new shard)

Migration: 50% of data moves to new shards
Time: Days to weeks (100 GB at 10 MB/sec = 3 hours per shard)
```

**Resharding Strategies**:

**1. Consistent Hashing** (minimize data movement):
```python
# Instead of: shard_id = user_id % shard_count
# Use: Consistent hashing (only K/N keys move when adding servers)

import hashlib

class ConsistentHash:
    def __init__(self, nodes):
        self.nodes = nodes
        self.ring = {}
        for node in nodes:
            for i in range(150):  # Virtual nodes (better distribution)
                hash_key = hashlib.md5(f"{node}:{i}".encode()).hexdigest()
                self.ring[int(hash_key, 16)] = node
        self.sorted_keys = sorted(self.ring.keys())
    
    def get_node(self, key):
        hash_key = int(hashlib.md5(str(key).encode()).hexdigest(), 16)
        for ring_key in self.sorted_keys:
            if hash_key <= ring_key:
                return self.ring[ring_key]
        return self.ring[self.sorted_keys[0]]  # Wrap around

# Adding node: Only ~1/N data moves (not 50%)
ch = ConsistentHash(['shard1', 'shard2', 'shard3', 'shard4'])
ch.add_node('shard5')  # Only ~20% of data moves (1/5)
```

**2. Double-Writing** (online migration):
```python
# Phase 1: Write to old + new shards (reads from old)
def create_user(user_id, data):
    old_shard = get_shard_old(user_id)  # user_id % 4
    new_shard = get_shard_new(user_id)  # user_id % 8
    
    old_shard.execute("INSERT INTO users ...")
    new_shard.execute("INSERT INTO users ...")  # Async

# Phase 2: Backfill (copy old data to new shards)
for user_id in all_users:
    data = old_shard.query("SELECT * FROM users WHERE user_id = %s", user_id)
    new_shard.execute("INSERT INTO users ...", data)

# Phase 3: Switch reads to new shards
def get_user(user_id):
    new_shard = get_shard_new(user_id)
    return new_shard.query("SELECT * FROM users WHERE user_id = %s", user_id)

# Phase 4: Stop writing to old shards, decommission
```

---

## 6. Security, APIs & Governance

### Shard-Aware Connection Pooling

**Problem**: Opening connections to every shard expensive

```python
# Naive: Open 100 connections to each of 10 shards
shards = [
    connect_pool('shard1', pool_size=100),
    connect_pool('shard2', pool_size=100),
    ...
    connect_pool('shard10', pool_size=100),
]

# Total: 1000 connections (wasteful, each shard only uses 10-20)
```

**Solution: Dynamic connection pooling**
```python
from threading import Lock

class ShardConnectionManager:
    def __init__(self, shard_configs):
        self.pools = {}
        self.lock = Lock()
        self.shard_configs = shard_configs
    
    def get_connection(self, shard_id):
        with self.lock:
            if shard_id not in self.pools:
                # Lazy initialization (create pool when first accessed)
                config = self.shard_configs[shard_id]
                self.pools[shard_id] = connect_pool(config['host'], pool_size=20)
        
        return self.pools[shard_id].get_connection()

# Only creates pools for accessed shards (saves 80% of connections)
```

---

## 7. Real-World Examples & Case Studies

### Instagram: Sharding by User ID

**Scale**: 1 billion users, 50 billion photos

**Sharding Strategy**:
```python
# 4096 shards (physical: 1000 servers, 4 shards per server)
shard_id = user_id % 4096

# Example:
user_id = 123456789
shard_id = 123456789 % 4096 = 3157

# Query: Route to shard 3157 (single server)
```

**Benefits**:
- User data co-located (user's photos on same shard)
- Fast queries (single-shard queries for user profile, user photos)
- Scalable (add more shards for more users)

**Challenges**:
- Follower feed (cross-shard query, 500 followed users on 500 shards)
- Solution: Denormalized feed table (pre-computed feed for each user)

---

### Discord: Sharding by Guild (Server) ID

**Scale**: 19 million guilds, 150 million monthly active users

**Sharding Strategy**:
```python
# Shard by guild_id (not user_id)
shard_id = guild_id % 128

# Rationale: Messages within guild co-located (fast queries)
# Users can be in multiple guilds (join different shards)
```

**Benefits**:
- Guild messages on single shard (fast message history queries)
- Write scaling (different guilds write to different shards)

**Trade-off**:
- User can be in 100 guilds (data replicated across shards)
- User profile queries require querying multiple shards (rare)

---

### Pinterest: Sharding by User ID + Board ID

**Scale**: 450 million users, billions of pins

**Sharding Strategy**:
```python
# Shard by user_id (user's boards and pins co-located)
shard_id = user_id % 4096

# Board table: (board_id, user_id, name)
# Pin table: (pin_id, board_id, user_id, image_url)

# Query user's boards: Single shard (WHERE user_id = ?)
# Query pins in board: Single shard (WHERE user_id = ? AND board_id = ?)
```

**Challenge**:
- Discovery feed (pins from all users)
- Solution: Separate "hot pins" table (top 1M pins, replicated to all shards for fast discovery)

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "What is database sharding and when would you use it?"

**Structured Answer**:

**"Sharding is splitting a large database into smaller pieces (shards) distributed across multiple servers. Use it when a single server can't handle the load (> 2 TB data or > 20K writes/sec)."**

**Definition**:
- **Sharding**: Horizontal partitioning across multiple servers
- Each shard is independent database (subset of data)
- Application routes queries to correct shard (based on shard key)

**When to Shard**:
```
Data size: > 2 TB (single server storage limit)
Write load: > 20K writes/sec (single server CPU limit)
Query performance: P95 > 1 sec (too much data to scan)
```

**Sharding Strategy**:
```python
# Hash-based (most common)
shard_id = user_id % shard_count

# Benefits: Even distribution, simple logic
# Drawback: Resharding difficult (data migration)
```

**Benefits**:
- Horizontal scaling (add more shards = more capacity)
- Write scaling (4 shards = 4x writes/sec)
- Faster queries (query 1/4 of data per shard)
- Fault tolerance (1 shard down = 75% still available)

**Challenges**:
- Cross-shard queries (slow, must query all shards)
- Distributed transactions (2PC complexity)
- Resharding (adding shards requires data migration)

**Real-world example: Instagram shards by user_id (4096 shards). Enables 1B users, 500K writes/sec. User's photos on single shard (fast queries). Follower feed requires denormalized feed table (pre-computed)."**

---

### Follow-Up 1: "How do you choose a good shard key?"

**Answer**:

**"Choose a shard key with high cardinality (many unique values), even distribution (balanced load), and query-friendly (most queries filter by shard key)."**

**Good Shard Key Properties**:

**1. High Cardinality** (many unique values):
```
Good: user_id (100M unique values)
Bad:  country (200 unique values, only 200 shards max)
Bad:  status (2 values: 'active', 'inactive')
```

**2. Even Distribution** (balanced load):
```
Good: user_id (hash distributes evenly)
Bad:  country (US = 50%, India = 30%, UK = 10%, others = 10%)
      → US shard overloaded (hot shard)
```

**3. Query-Friendly** (single-shard queries):
```
Good: Shard by user_id, query: WHERE user_id = 123 (single shard)
Bad:  Shard by user_id, query: WHERE country = 'US' (all shards)
```

**Examples**:

**Good: user_id (e-commerce)**
```python
shard_id = user_id % 16

# Queries:
SELECT * FROM orders WHERE user_id = 123  # Single shard ✅
SELECT * FROM users WHERE user_id = 456   # Single shard ✅

# Distribution: Even (1/16 per shard)
```

**Bad: created_at (time-series)**
```python
shard_id = (created_at.year - 2020) % 4

# All new users → Shard 3 (2023)
# Shards 0-2 (2020-2022) idle (uneven distribution)
```

**Bad: country (geographic)**
```python
shard_id = hash(country) % 4

# 'US' → Shard 1 (50% of users, hot shard)
# 'UK' → Shard 2 (10% of users, underutilized)
```

**Composite Shard Key** (when single key insufficient):
```python
# Shard by (user_id, timestamp)
shard_id = (user_id + timestamp.day) % 16

# Spreads single user's data across multiple shards over time
# Use case: Time-series data (IoT sensors, logs)
```

**Testing Shard Key**:
```python
# Before sharding, analyze distribution
from collections import Counter

users = db.query("SELECT user_id FROM users")
shard_distribution = Counter(user_id % 16 for user_id in users)

print(shard_distribution)
# {0: 6250000, 1: 6250000, 2: 6250000, ..., 15: 6250000}
# Even distribution (each shard ~6.25M users) ✅
```

**Real-world: Discord shards by guild_id (not user_id) because guild messages queried together (co-location). Users can be in multiple guilds (tolerated data duplication)."**

---

### Follow-Up 2: "What are the challenges with sharding and how do you handle them?"

**Answer**:

**"Main challenges: cross-shard queries (scatter-gather), distributed transactions (2PC), and resharding (data migration). Handle with denormalization, avoiding cross-shard transactions, and consistent hashing."**

**Challenge 1: Cross-Shard Queries** (slow scatter-gather):

**Problem**:
```python
# Query: Find all orders for products in category 'electronics'
# Products distributed across 16 shards

results = []
for shard in shards:
    shard_results = shard.query("""
        SELECT * FROM orders WHERE product_id IN (
            SELECT product_id FROM products WHERE category = 'electronics'
        )
    """)
    results.extend(shard_results)

# Must query all 16 shards (200ms latency)
# Merge results at application layer
```

**Solution: Denormalize**:
```sql
-- Add category column to orders table (denormalized)
ALTER TABLE orders ADD COLUMN product_category VARCHAR(50);

-- Query single shard (if orders sharded by user_id)
SELECT * FROM orders WHERE user_id = 123 AND product_category = 'electronics';

# Only queries 1 shard (10ms latency, 20x faster)
# Trade-off: Category duplicated (more storage, update complexity)
```

---

**Challenge 2: Distributed Transactions** (2PC complexity):

**Problem**:
```python
# Transfer money between users on different shards (atomic operation)
# Must use Two-Phase Commit (slow, complex)

coordinator.begin()
shard1.prepare("UPDATE users SET balance = balance - 100 WHERE user_id = 1")
shard2.prepare("UPDATE users SET balance = balance + 100 WHERE user_id = 2")

if shard1.prepared and shard2.prepared:
    shard1.commit()
    shard2.commit()
else:
    shard1.rollback()
    shard2.rollback()

# Complexity: Coordinator tracks state, handles timeouts, partial failures
```

**Solution: Avoid Cross-Shard Transactions**:
```python
# Co-locate related data (transfers sharded by from_user)
shard = get_shard(from_user)

# Single-shard transaction (ACID guaranteed)
shard.execute("BEGIN")
shard.execute("UPDATE users SET balance = balance - 100 WHERE user_id = %s", from_user)
shard.execute("INSERT INTO pending_transfers (to_user, amount) VALUES (%s, %s)", (to_user, 100))
shard.execute("COMMIT")

# Async: Process transfer (eventually consistent)
worker.process_pending_transfers()  # Credits to_user on Shard 2
```

---

**Challenge 3: Resharding** (data migration):

**Problem**:
```
4 shards → 8 shards: 50% of data moves
Migration time: Days (100 GB per shard at 10 MB/sec = 3 hours × 4 shards = 12 hours minimum)
Downtime risk: Inconsistent data during migration
```

**Solution 1: Consistent Hashing** (minimize data movement):
```python
# Instead of: shard_id = user_id % 4
# Use consistent hashing: Only ~1/N keys move

ch = ConsistentHash(['shard1', 'shard2', 'shard3', 'shard4'])
ch.add_node('shard5')  # Only ~20% of data moves (1/5, not 50%)
```

**Solution 2: Virtual Shards** (logical → physical mapping):
```python
# Create 256 logical shards, map to 4 physical servers
virtual_shard = user_id % 256
physical_shard = virtual_to_physical[virtual_shard]  # Lookup table

# Example:
virtual_to_physical = {
    0-63: 'server1',
    64-127: 'server2',
    128-191: 'server3',
    192-255: 'server4'
}

# Adding server5: Move virtual shards 200-255 → server5
# Migration: 55/256 = 21% of data (not 50%)
```

**Solution 3: Online Migration** (zero downtime):
```python
# Phase 1: Double-write (write to old + new shards, read from old)
# Phase 2: Backfill (copy old data to new shards)
# Phase 3: Switch reads to new shards
# Phase 4: Stop writing to old shards

# Takes weeks, but no downtime
```

**Real-world: Facebook uses virtual shards (1000 logical shards on 100 physical servers). Adding server requires moving only 10 virtual shards (1% of data). Migration takes hours, not days."**

---

### Follow-Up 3: "What's the difference between sharding and partitioning?"

**Answer**:

**"Partitioning divides table within single database (same server). Sharding divides across multiple databases (different servers)."**

**Partitioning** (single server):
```sql
-- PostgreSQL range partitioning
CREATE TABLE orders PARTITION BY RANGE (created_at);

CREATE TABLE orders_2023 PARTITION OF orders FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE orders_2024 PARTITION OF orders FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

-- Query automatically routes to correct partition
SELECT * FROM orders WHERE created_at >= '2024-01-01';  -- Only queries orders_2024

-- Benefit: Faster queries (scan less data), easier maintenance (drop old partitions)
-- Limitation: Single server (can't scale writes beyond server capacity)
```

**Sharding** (multiple servers):
```python
# Application-level routing to different servers
def get_shard(user_id):
    return shards[user_id % 4]

shard = get_shard(user_id)
shard.query("SELECT * FROM orders WHERE user_id = %s", user_id)

# Benefit: Horizontal scaling (add servers for more capacity)
# Limitation: Complex (application must handle routing, cross-shard queries)
```

**Comparison**:

| Aspect | Partitioning | Sharding |
|--------|--------------|----------|
| **Location** | Same server | Multiple servers |
| **Routing** | Database (transparent) | Application (explicit) |
| **Scaling** | Vertical (upgrade server) | Horizontal (add servers) |
| **Complexity** | Simple | Complex |
| **Use Case** | < 2 TB, single server | > 2 TB, distributed |

**Hybrid Approach** (partitioning + sharding):
```
Shard 1: users_2023, users_2024 (partitioned by year)
Shard 2: users_2023, users_2024
Shard 3: users_2023, users_2024
Shard 4: users_2023, users_2024

# Each shard partitioned (time-based queries fast)
# Sharded for horizontal scaling (distributed writes)
```

**Real-world: Twitter uses partitioning (by month) within each shard. Shard by user_id (distributed across servers), partition by created_at (fast time-range queries). Best of both worlds."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Sharding Architecture

```
┌────────────────────────────────────────────────────────────┐
│              SHARDING ARCHITECTURE                         │
└────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Application    │
│   (Shard Router) │
└────────┬─────────┘
         │
    Shard Key: user_id
    Function: shard_id = user_id % 4
         │
    ┌────┴────────┬────────┬────────┐
    ↓             ↓        ↓        ↓
┌─────────┐  ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Shard 1 │  │ Shard 2 │ │ Shard 3 │ │ Shard 4 │
│ user_id │  │ user_id │ │ user_id │ │ user_id │
│ %4 = 0  │  │ %4 = 1  │ │ %4 = 2  │ │ %4 = 3  │
│         │  │         │ │         │ │         │
│ 25M rows│  │ 25M rows│ │ 25M rows│ │ 25M rows│
│ 125 GB  │  │ 125 GB  │ │ 125 GB  │ │ 125 GB  │
└─────────┘  └─────────┘ └─────────┘ └─────────┘

Single-Shard Query:
  SELECT * FROM users WHERE user_id = 123
  → Route to Shard 3 (123 % 4 = 3)
  → Fast (query 25M rows, not 100M)

Cross-Shard Query:
  SELECT * FROM users WHERE country = 'US'
  → Route to all 4 shards (country not shard key)
  → Slow (query 100M rows, merge results)


PARTITIONING (Same Server):
═══════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────┐
│           Single Database Server                 │
│                                                  │
│  ┌────────────────────────────────────┐         │
│  │ users table (100M rows, 500 GB)    │         │
│  │ Partitioned by created_at          │         │
│  │                                    │         │
│  │  ┌──────────────────┐              │         │
│  │  │ users_2020       │ 20M rows     │         │
│  │  │ (Jan-Dec 2020)   │ 100 GB       │         │
│  │  └──────────────────┘              │         │
│  │  ┌──────────────────┐              │         │
│  │  │ users_2021       │ 22M rows     │         │
│  │  │ (Jan-Dec 2021)   │ 110 GB       │         │
│  │  └──────────────────┘              │         │
│  │  ┌──────────────────┐              │         │
│  │  │ users_2022       │ 28M rows     │         │
│  │  │ (Jan-Dec 2022)   │ 140 GB       │         │
│  │  └──────────────────┘              │         │
│  │  ┌──────────────────┐              │         │
│  │  │ users_2023       │ 30M rows     │         │
│  │  │ (Jan-Dec 2023)   │ 150 GB       │         │
│  │  └──────────────────┘              │         │
│  └────────────────────────────────────┘         │
└──────────────────────────────────────────────────┘

Query: WHERE created_at >= '2023-01-01'
→ Database routes to users_2023 partition only (30M rows)
→ Fast (skip 70M rows from 2020-2022)


SHARD KEY SELECTION:
═══════════════════════════════════════════════════════════

Good Shard Key: user_id
─────────────────────────────────────────────────────────→
Distribution: [25M] [25M] [25M] [25M]  Even ✅
              Shard1 Shard2 Shard3 Shard4

Queries by user_id: Single shard ✅


Bad Shard Key: country
─────────────────────────────────────────────────────────→
Distribution: [50M] [30M] [10M] [10M]  Uneven ❌
              US    India  UK   Others
              
Shard 1 (US) overloaded (hot shard) ❌


Bad Shard Key: timestamp (for growing data)
─────────────────────────────────────────────────────────→
Distribution: [10M] [15M] [20M] [55M]  Uneven ❌
              2020  2021  2022  2023
              
All new writes → Shard 4 (2023) Hot shard ❌
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Sharding Matters

**Single Server Limits**:
- Storage: 1-2 TB max (SSD cost $1000/TB)
- CPU: 96 cores max (single server hardware limit)
- Writes: 5-20K writes/sec max (disk I/O bottleneck)
- Availability: Single point of failure (downtime if server crashes)

**With Sharding**:
- Storage: Unlimited (add more servers)
- CPU: Unlimited (distributed across servers)
- Writes: 100K+ writes/sec (4 shards = 4x capacity)
- Availability: High (1 shard down = 75% still available)

**When to Shard**:
```
Data size: > 2 TB
Write load: > 20K writes/sec
Query time: P95 > 1 second
Budget: Sharding cheaper than single powerful server at scale
```

### Key Strategies

**1. Choose Good Shard Key**:
- High cardinality (many unique values)
- Even distribution (balanced load across shards)
- Query-friendly (most queries filter by shard key)
- Examples: user_id ✅, session_id ✅, country ❌, timestamp ❌

**2. Handle Cross-Shard Queries**:
- Denormalize data (pre-compute aggregates)
- Scatter-gather (query all shards, merge results)
- Trade-off: Faster queries vs storage/complexity

**3. Avoid Distributed Transactions**:
- Co-locate related data (single-shard transactions)
- Eventual consistency (async processing)
- 2PC only if absolutely necessary (slow, complex)

**4. Plan for Resharding**:
- Consistent hashing (minimize data movement)
- Virtual shards (logical → physical mapping)
- Online migration (zero downtime, takes weeks)

### Production Checklist

- [ ] **Measure before sharding**: Verify single server insufficient (> 2 TB or > 20K writes/sec)
- [ ] **Choose shard key**: High cardinality, even distribution, query-friendly
- [ ] **Test distribution**: Analyze shard key (ensure even distribution before production)
- [ ] **Co-locate related data**: Minimize cross-shard queries (users + orders on same shard)
- [ ] **Denormalize for reads**: Pre-compute cross-shard aggregates (feed table)
- [ ] **Avoid distributed transactions**: Single-shard transactions (eventual consistency acceptable)
- [ ] **Plan resharding strategy**: Consistent hashing or virtual shards (minimize data movement)
- [ ] **Monitor shard balance**: Alert if hot shard (> 2x average load)
- [ ] **Implement shard routing**: Application-level or proxy (transparent to application)
- [ ] **Document shard topology**: Which shards on which servers, shard key logic

### Bottom Line

**Sharding enables horizontal scaling for databases (storage, writes, queries). For FAANG interviews: Explain sharding (split data across servers by shard key), when to shard (> 2 TB or > 20K writes/sec), challenges (cross-shard queries, distributed transactions, resharding), and solutions (denormalization, consistent hashing, co-location). Real-world example from Instagram: 4096 shards by user_id, enables 1B users and 500K writes/sec. User's photos on single shard (fast), but follower feed requires denormalized feed table (pre-computed). Rule: Shard when single server insufficient, choose shard key carefully (user_id, session_id), avoid cross-shard operations (co-locate related data).**

