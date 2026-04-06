# 72. Range-Based Sharding

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Range-Based Sharding?

**Range-based sharding** divides data into shards based on ranges of values (e.g., IDs 1-1M on Shard 1, 1M-2M on Shard 2).

**Example: Users Table by User ID Range**

```
┌────────────────┐
│  Shard 1       │
│  user_id:      │
│  1 - 1,000,000 │
│  25M rows      │
└────────────────┘

┌────────────────┐
│  Shard 2       │
│  user_id:      │
│  1,000,001 -   │
│  2,000,000     │
│  25M rows      │
└────────────────┘

┌────────────────┐
│  Shard 3       │
│  user_id:      │
│  2,000,001 -   │
│  3,000,000     │
│  25M rows      │
└────────────────┘

┌────────────────┐
│  Shard 4       │
│  user_id:      │
│  3,000,001 -   │
│  4,000,000     │
│  25M rows      │
└────────────────┘

Routing Logic:
if user_id <= 1,000,000: Shard 1
elif user_id <= 2,000,000: Shard 2
elif user_id <= 3,000,000: Shard 3
else: Shard 4
```

### Range-Based vs Hash-Based

| Aspect | Range-Based | Hash-Based |
|--------|-------------|------------|
| **Range queries** | Fast (single shard) | Slow (all shards) |
| **Distribution** | Uneven (hot shards) | Even |
| **Resharding** | Easy (split range) | Hard (rehash all) |
| **Use case** | Time-series, logs | Users, sessions |

**Range queries example**:
```sql
-- Range-based sharding
SELECT * FROM users WHERE user_id BETWEEN 100,000 AND 200,000;
-- Routes to: Shard 1 only ✅ (fast)

-- Hash-based sharding
SELECT * FROM users WHERE user_id BETWEEN 100,000 AND 200,000;
-- Routes to: All 4 shards ❌ (slow, must query all)
```

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Range-Based Sharding Implementation

**Shard Configuration**:
```python
# Define shard ranges
shard_ranges = [
    {'shard': 'shard1', 'min': 1, 'max': 1_000_000},
    {'shard': 'shard2', 'min': 1_000_001, 'max': 2_000_000},
    {'shard': 'shard3', 'min': 2_000_001, 'max': 3_000_000},
    {'shard': 'shard4', 'min': 3_000_001, 'max': 4_000_000},
]

def get_shard(user_id):
    for shard_range in shard_ranges:
        if shard_range['min'] <= user_id <= shard_range['max']:
            return shard_range['shard']
    raise ValueError(f"user_id {user_id} out of range")

# Examples:
get_shard(500_000)   # → 'shard1'
get_shard(1_500_000) # → 'shard2'
get_shard(3_500_000) # → 'shard4'
```

**Optimized Lookup (Binary Search)**:
```python
import bisect

class RangeShardRouter:
    def __init__(self, shard_ranges):
        # Sort ranges by min value
        self.ranges = sorted(shard_ranges, key=lambda r: r['min'])
        # Extract boundaries for binary search
        self.boundaries = [r['max'] for r in self.ranges]
    
    def get_shard(self, user_id):
        # Binary search: O(log N)
        idx = bisect.bisect_right(self.boundaries, user_id)
        if idx < len(self.ranges):
            shard_range = self.ranges[idx]
            if shard_range['min'] <= user_id <= shard_range['max']:
                return shard_range['shard']
        raise ValueError(f"user_id {user_id} out of range")

# Complexity: O(log N) vs O(N) linear search
```

---

### 2. Range Queries (Fast)

**Benefit: Single-Shard Range Queries**

```sql
-- Query: Find users created in 2023 (user_id 2M-3M)
SELECT * FROM users WHERE user_id BETWEEN 2_000_000 AND 3_000_000;

-- Routing: Shard 3 only (range [2M-3M] entirely within Shard 3)
shard3.query("SELECT * FROM users WHERE user_id BETWEEN 2_000_000 AND 3_000_000")

-- Time: 50ms (single shard query)
```

**Multi-Shard Range Query** (spans multiple shards):
```sql
-- Query: Find users 500K-2.5M (spans Shards 1, 2, 3)
SELECT * FROM users WHERE user_id BETWEEN 500_000 AND 2_500_000;

-- Routing: Shards 1, 2, 3
shard1.query("SELECT * FROM users WHERE user_id BETWEEN 500_000 AND 1_000_000")  # Shard 1: 500K rows
shard2.query("SELECT * FROM users WHERE user_id BETWEEN 1_000_001 AND 2_000_000") # Shard 2: 1M rows
shard3.query("SELECT * FROM users WHERE user_id BETWEEN 2_000_001 AND 2_500_000") # Shard 3: 500K rows

# Merge results (application-level)
# Time: 150ms (3 shards queried in parallel)
```

**Compare to Hash-Based** (must query all shards):
```sql
-- Hash-based sharding
SELECT * FROM users WHERE user_id BETWEEN 500_000 AND 2_500_000;

-- Routing: All 4 shards (hash distributes IDs across all shards)
for shard in [shard1, shard2, shard3, shard4]:
    shard.query("SELECT * FROM users WHERE user_id BETWEEN 500_000 AND 2_500_000")

# Time: 200ms (4 shards queried, even though Shard 4 has no matching rows)
```

---

### 3. Hot Shard Problem (Uneven Distribution)

**Problem: Growing Data Creates Hot Shards**

```
Initial (2020):
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  Shard 1       │ │  Shard 2       │ │  Shard 3       │ │  Shard 4       │
│  user_id 1-1M  │ │  1M-2M         │ │  2M-3M         │ │  3M-4M         │
│  1M users      │ │  1M users      │ │  1M users      │ │  1M users      │
│  100 w/sec     │ │  100 w/sec     │ │  100 w/sec     │ │  100 w/sec     │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
Balanced ✅

2024 (after 4 years of growth):
┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  Shard 1       │ │  Shard 2       │ │  Shard 3       │ │  Shard 4       │
│  1-1M (old)    │ │  1M-2M         │ │  2M-3M         │ │  3M-4M         │
│  1M users      │ │  1M users      │ │  1M users      │ │  4M users (new)│
│  10 w/sec      │ │  50 w/sec      │ │  100 w/sec     │ │  500 w/sec 🔥  │
│  (inactive)    │ │                │ │                │ │  (HOT SHARD)   │
└────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘
Unbalanced ❌

All new users → Shard 4 (user_id 3M+)
Shard 4 overloaded: 500 writes/sec vs 10 writes/sec on Shard 1
```

**Why This Happens**:
- Auto-increment IDs: New users get higher IDs (3M, 3M+1, 3M+2, ...)
- All new writes concentrated on highest-range shard
- Old shards (Shard 1, 2) become idle (users from 2020 inactive)

**Solution 1: Re-shard (Split Hot Shard)**:
```
Before:
┌────────────────────────────────────┐
│  Shard 4                           │
│  user_id 3M-7M                     │
│  4M users                          │
│  500 writes/sec (overloaded) 🔥    │
└────────────────────────────────────┘

After (split):
┌────────────────┐ ┌────────────────┐
│  Shard 4A      │ │  Shard 4B      │
│  3M-5M         │ │  5M-7M         │
│  2M users      │ │  2M users      │
│  250 w/sec     │ │  250 w/sec     │
└────────────────┘ └────────────────┘
Balanced ✅

Process:
1. Create Shard 4B (new server)
2. Copy user_id 5M-7M from Shard 4 to Shard 4B
3. Update shard_ranges configuration
4. Delete user_id 5M-7M from Shard 4 (now Shard 4A)

Downtime: None (online migration, double-write during copy)
```

**Solution 2: Add New Range Shard** (without resharding):
```python
# Add Shard 5 for new users (7M+)
shard_ranges.append({'shard': 'shard5', 'min': 7_000_001, 'max': 10_000_000})

# New users (user_id 7M+) → Shard 5
# Shard 4 (3M-7M) no longer grows (fixed range)

# Result: Load balanced again
```

---

### 4. Range-Based Sharding for Time-Series Data

**Use Case: Logs, Events, Metrics (Ordered by Timestamp)**

**Sharding by Date Range**:
```python
# Shard logs by month
shard_ranges = [
    {'shard': 'shard_2023_01', 'start_date': '2023-01-01', 'end_date': '2023-01-31'},
    {'shard': 'shard_2023_02', 'start_date': '2023-02-01', 'end_date': '2023-02-28'},
    {'shard': 'shard_2023_03', 'start_date': '2023-03-01', 'end_date': '2023-03-31'},
    ...
]

def get_shard_for_log(timestamp):
    for shard_range in shard_ranges:
        if shard_range['start_date'] <= timestamp.date() <= shard_range['end_date']:
            return shard_range['shard']
    raise ValueError(f"No shard for timestamp {timestamp}")

# Example:
get_shard_for_log(datetime(2023, 2, 15))  # → 'shard_2023_02'
```

**Benefits**:
- **Fast time-range queries**: "Logs from February 2023" → Query shard_2023_02 only
- **Easy archival**: Drop old shards (DELETE shard_2023_01 after 1 year retention)
- **Predictable growth**: New month → new shard (auto-scaling)

**Query Example**:
```sql
-- Query: Logs from Feb 1-15, 2023
SELECT * FROM logs WHERE timestamp BETWEEN '2023-02-01' AND '2023-02-15';

-- Routing: shard_2023_02 only (entire range in one shard)
-- Time: 100ms (single shard, indexed by timestamp)
```

**Compare to Hash-Based** (time-range queries expensive):
```sql
-- Hash-based: Must query all 12 monthly shards (Feb logs scattered)
-- Time: 1200ms (12 shards × 100ms each)
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Shard Size Planning

**Example: E-commerce Orders Table**

```
Assumptions:
- 10M orders/year
- 1 KB per order
- 5-year retention

Total size: 10M × 5 years × 1 KB = 50 GB

Range-based sharding by order_id (yearly ranges):
- Shard 2020: order_id 1-10M (10 GB)
- Shard 2021: order_id 10M-20M (10 GB)
- Shard 2022: order_id 20M-30M (10 GB)
- Shard 2023: order_id 30M-40M (10 GB)
- Shard 2024: order_id 40M-50M (10 GB)

Each shard: 10 GB (within single-server limit)
Query performance: P95 < 100ms (10M rows per shard, indexed)
```

**Hot Shard Risk**:
```
Write load:
- Shard 2020 (old): 10 writes/sec (old order updates)
- Shard 2021: 50 writes/sec
- Shard 2022: 100 writes/sec
- Shard 2023: 200 writes/sec
- Shard 2024 (current): 500 writes/sec 🔥 (HOT)

All new orders → Shard 2024 (hot shard)

Mitigation:
- Shard 2024 uses faster hardware (16 cores vs 8 cores for old shards)
- Or: Split Shard 2024 into quarters (Q1, Q2, Q3, Q4)
```

---

## 4. Data & Storage Design

### Range Shard Configuration Management

**Configuration Store** (centralized):
```python
# Store shard ranges in database (not hardcoded)
CREATE TABLE shard_config (
    shard_id VARCHAR(50) PRIMARY KEY,
    table_name VARCHAR(100),
    min_value BIGINT,
    max_value BIGINT,
    server_host VARCHAR(255),
    server_port INT,
    status ENUM('active', 'migrating', 'read_only', 'archived'),
    created_at TIMESTAMP
);

INSERT INTO shard_config VALUES
('shard1', 'users', 1, 1000000, 'db1.example.com', 5432, 'active', NOW()),
('shard2', 'users', 1000001, 2000000, 'db2.example.com', 5432, 'active', NOW()),
('shard3', 'users', 2000001, 3000000, 'db3.example.com', 5432, 'active', NOW()),
('shard4', 'users', 3000001, 4000000, 'db4.example.com', 5432, 'active', NOW());

# Application loads shard config at startup
class ShardRouter:
    def __init__(self):
        self.shard_config = self.load_config_from_db()
    
    def load_config_from_db(self):
        config_db = connect('config.db.example.com')
        return config_db.query("SELECT * FROM shard_config WHERE status = 'active'")
    
    def get_shard(self, user_id):
        for shard in self.shard_config:
            if shard['min_value'] <= user_id <= shard['max_value']:
                return connect(shard['server_host'], shard['server_port'])
        raise ValueError(f"No shard for user_id {user_id}")
```

**Benefits**:
- Dynamic reconfiguration (add/remove shards without code deploy)
- Centralized management (single source of truth)
- Migration support (status: 'migrating', route to old + new shards)

---

## 5. Scalability, Reliability & Fault Tolerance

### Adding New Range Shard (Online)

**Scenario**: Shard 4 (3M-4M) full, need Shard 5 for new users (4M+)

**Process**:
```python
# Step 1: Add new shard to config (status: 'active')
INSERT INTO shard_config VALUES
('shard5', 'users', 4000001, 5000000, 'db5.example.com', 5432, 'active', NOW());

# Step 2: Application reloads config (hot reload, no restart)
shard_router.reload_config()

# Step 3: New users automatically routed to Shard 5
create_user(user_id=4000001, name='Alice')  # → Shard 5

# Downtime: 0 seconds (online addition)
```

**Splitting Existing Shard** (Hot Shard Mitigation):
```python
# Shard 4 (3M-4M) is hot (500 writes/sec)
# Split into Shard 4A (3M-3.5M) and Shard 4B (3.5M-4M)

# Step 1: Create Shard 4B (new server)
INSERT INTO shard_config VALUES
('shard4b', 'users', 3500001, 4000000, 'db4b.example.com', 5432, 'migrating', NOW());

# Step 2: Copy data (user_id 3.5M-4M) from Shard 4 to Shard 4B
# Background process (takes hours, no impact on queries)
pg_dump --table users --where "user_id > 3500000" | psql -h db4b.example.com

# Step 3: Double-write (write to both Shard 4 and Shard 4B during migration)
def update_user(user_id, data):
    if 3_500_001 <= user_id <= 4_000_000:
        shard4.execute("UPDATE users SET ... WHERE user_id = %s", user_id)  # Old
        shard4b.execute("UPDATE users SET ... WHERE user_id = %s", user_id) # New
    else:
        # Normal routing
        shard = get_shard(user_id)
        shard.execute("UPDATE users SET ... WHERE user_id = %s", user_id)

# Step 4: Switch reads to new shard (update config)
UPDATE shard_config SET min_value = 1, max_value = 3500000 WHERE shard_id = 'shard4'; # Shard 4 → 3M-3.5M
UPDATE shard_config SET status = 'active' WHERE shard_id = 'shard4b';  # Shard 4B active

# Step 5: Stop double-writing, delete data from Shard 4 (user_id 3.5M-4M)
DELETE FROM users WHERE user_id > 3500000;  -- On Shard 4

# Result: Load balanced (250 writes/sec per shard)
```

---

## 6. Security, APIs & Governance

### Access Control by Shard

**Use Case**: GDPR/CCPA compliance (data residency)

```python
# Shard by user's region (range-based on user_id prefix)
# US users: user_id 1M-2M → Shard US
# EU users: user_id 2M-3M → Shard EU
# Asia users: user_id 3M-4M → Shard Asia

shard_ranges = [
    {'shard': 'shard_us', 'region': 'US', 'min': 1_000_000, 'max': 2_000_000},
    {'shard': 'shard_eu', 'region': 'EU', 'min': 2_000_000, 'max': 3_000_000},
    {'shard': 'shard_asia', 'region': 'Asia', 'min': 3_000_000, 'max': 4_000_000},
]

# EU shard hosted in EU (compliance)
# US shard hosted in US
# Asia shard hosted in Singapore
```

**Benefits**:
- Data residency (EU data stays in EU)
- Compliance (GDPR right to deletion: DELETE from shard_eu only)
- Low latency (data close to users)

---

## 7. Real-World Examples & Case Studies

### Twitter: Snowflake IDs + Range-Based Sharding

**Problem**: Tweet IDs must be sortable by time (chronological timeline)

**Solution**: Snowflake ID (64-bit ID with embedded timestamp)

```
Snowflake ID structure (64 bits):
┌───────────────────┬───────────┬──────────┬──────────────┐
│ Timestamp (41)    │ Datacenter│ Worker   │ Sequence (12)│
│ (milliseconds)    │ ID (5)    │ ID (5)   │              │
└───────────────────┴───────────┴──────────┴──────────────┘

Example:
Tweet ID: 1234567890123456789
Timestamp: 1234567890123 (Jan 15, 2024 10:30:15.123)
Datacenter: 2
Worker: 5
Sequence: 789

# IDs sorted by time (older tweets have lower IDs)
```

**Range-Based Sharding by Tweet ID**:
```python
# Shard by tweet_id (which embeds timestamp)
# Effectively sharding by time range

shard_ranges = [
    {'shard': 'tweets_2023_q1', 'min': 1000000000000000000, 'max': 1100000000000000000},
    {'shard': 'tweets_2023_q2', 'min': 1100000000000000001, 'max': 1200000000000000000},
    {'shard': 'tweets_2023_q3', 'min': 1200000000000000001, 'max': 1300000000000000000},
    {'shard': 'tweets_2023_q4', 'min': 1300000000000000001, 'max': 1400000000000000000},
]

# Query: Tweets from Q2 2023
SELECT * FROM tweets WHERE tweet_id BETWEEN 1100000000000000001 AND 1200000000000000000;
# Routes to: tweets_2023_q2 shard only ✅
```

**Benefits**:
- Time-range queries fast (single shard)
- Chronological order maintained (sortable IDs)
- Old shards archived easily (DROP tweets_2020_q1 after 3 years)

---

### Amazon DynamoDB: Range Key in Composite Primary Key

**Composite Primary Key**: (Partition Key, Sort Key)

```
Orders table:
Primary Key: (customer_id, order_date)
- customer_id: Partition key (hash-based sharding across nodes)
- order_date: Sort key (range-based within partition)

Storage:
Node 1: customer_id 1, 5, 9, ... (hash(customer_id) % nodes == 1)
  - customer_id=1: [order_date='2023-01-01', '2023-02-15', '2023-03-20']
  - customer_id=5: [order_date='2023-01-10', '2023-04-05']

Node 2: customer_id 2, 6, 10, ... (hash(customer_id) % nodes == 2)
  - customer_id=2: [order_date='2023-01-05', '2023-02-10']
```

**Query**:
```python
# Get customer's orders in date range (single partition, range query)
query = {
    'KeyConditionExpression': 'customer_id = :cid AND order_date BETWEEN :start AND :end',
    'ExpressionAttributeValues': {
        ':cid': 123,
        ':start': '2023-01-01',
        ':end': '2023-03-31'
    }
}

# Routes to: Single node (customer_id hashed to node)
# Within node: Range query on order_date (sorted within partition)
# Time: 10ms (single node, range scan)
```

**Hybrid**: Hash-based (partition key) + Range-based (sort key)

---

### GitHub: Issue IDs by Repository Range

**Problem**: Issue IDs sequential within repository (Issue #1, #2, #3, ...)

**Sharding Strategy**: Range-based by repository ID

```python
# Shard by repository_id range
shard_ranges = [
    {'shard': 'shard1', 'min_repo': 1, 'max_repo': 1_000_000},
    {'shard': 'shard2', 'min_repo': 1_000_001, 'max_repo': 2_000_000},
    ...
]

# Issue table
CREATE TABLE issues (
    repo_id INT,
    issue_number INT,
    title VARCHAR(255),
    PRIMARY KEY (repo_id, issue_number)
);

# Query: Issues in repo 123456
SELECT * FROM issues WHERE repo_id = 123456;
# Routes to: Shard 1 (repo_id in range 1-1M)

# Query: Issue #42 in repo 123456
SELECT * FROM issues WHERE repo_id = 123456 AND issue_number = 42;
# Routes to: Shard 1 (single shard, indexed query)
```

**Benefits**:
- Repository data co-located (repo + issues on same shard)
- Sequential issue numbers maintained (within repo)
- Range queries fast (get issues 1-100 in repo)

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "What is range-based sharding and when would you use it?"

**Structured Answer**:

**"Range-based sharding divides data into shards by value ranges (e.g., IDs 1-1M on Shard 1, 1M-2M on Shard 2). Use it when range queries are common (time-series, logs) or when data has natural ordering (chronological events)."**

**Definition**:
```python
# Shard by user_id range
if user_id <= 1_000_000:
    shard = 'shard1'
elif user_id <= 2_000_000:
    shard = 'shard2'
elif user_id <= 3_000_000:
    shard = 'shard3'
else:
    shard = 'shard4'
```

**When to Use**:
```
1. Time-series data (logs, events, metrics)
   - Shard by date range (Jan 2023, Feb 2023, ...)
   - Query: "Logs from February" → Single shard ✅

2. Sequential IDs (auto-increment, Snowflake IDs)
   - Natural ordering maintained
   - Range queries fast (user_id 100K-200K → Single shard)

3. Data with lifecycle (old data archived)
   - Drop old shards easily (DELETE shard_2020 after retention period)
```

**Benefits**:
- Fast range queries (single-shard queries for ranges)
- Easy resharding (split range, no rehashing)
- Predictable growth (add new range shard for new data)

**Drawbacks**:
- Hot shard problem (new data concentrates on highest range)
- Uneven distribution (old shards idle, new shards overloaded)

**Mitigation**:
```
1. Split hot shard (Shard 4 → Shard 4A + Shard 4B)
2. Auto-scale (add new shard when current shard reaches threshold)
3. Hybrid approach (hash + range: hash by user region, range by timestamp)
```

**Real-world example: Twitter uses Snowflake IDs with range-based sharding by quarter (Q1 2023, Q2 2023, ...). Time-range queries fast (tweets from Q2 → single shard). Old shards archived after 3 years (retention policy)."**

---

### Follow-Up 1: "What's the hot shard problem and how do you solve it?"

**Answer**:

**"Hot shard problem: With auto-increment IDs or time-based sharding, all new writes go to the highest range shard (hot shard), causing overload. Solve by splitting hot shard, adding new range shard, or using hybrid sharding."**

**Example**:
```
Shard 1: user_id 1-1M (2020 users, 10 writes/sec, idle)
Shard 2: user_id 1M-2M (2021 users, 50 writes/sec)
Shard 3: user_id 2M-3M (2022 users, 100 writes/sec)
Shard 4: user_id 3M-∞ (2023+ users, 500 writes/sec 🔥 HOT)

All new users (user_id 3M, 3M+1, 3M+2, ...) → Shard 4 (overloaded)
```

**Solution 1: Split Hot Shard**:
```
Before:
Shard 4: user_id 3M-7M (4M users, 500 writes/sec)

After split:
Shard 4A: user_id 3M-5M (2M users, 250 writes/sec)
Shard 4B: user_id 5M-7M (2M users, 250 writes/sec)

Process:
1. Create Shard 4B (new server)
2. Copy user_id 5M-7M from Shard 4 to Shard 4B
3. Update routing (user_id 5M+ → Shard 4B)
4. Delete user_id 5M-7M from Shard 4

Result: Load balanced ✅
```

**Solution 2: Add New Range Shard** (for growing data):
```python
# Add Shard 5 for future users (7M+)
shard_ranges.append({'shard': 'shard5', 'min': 7_000_001, 'max': 10_000_000})

# New users (user_id 7M+) → Shard 5
# Shard 4 (3M-7M) no longer grows (fixed range)

# Result: Hot shard capped, new shard handles growth
```

**Solution 3: Hybrid Sharding** (hash + range):
```python
# Combine hash-based and range-based
# Step 1: Hash by user_id prefix (even distribution)
prefix = user_id // 1_000_000  # First digit (0-9)
shard_group = prefix % 4  # 4 shard groups

# Step 2: Within group, range-based (time-ordering)
shard = f"shard_{shard_group}_{prefix}"

# Example:
user_id = 3_456_789
prefix = 3
shard_group = 3 % 4 = 3
shard = "shard_3_3"  # Shard group 3, prefix 3

# Benefits:
# - Even distribution (hash ensures balance)
# - Time-ordering within group (range queries fast)
```

**Solution 4: Cap Shard Size** (auto-split):
```python
# Monitor shard size, auto-split when threshold reached
MAX_SHARD_SIZE = 10_000_000  # 10M rows

if shard.row_count > MAX_SHARD_SIZE:
    split_shard(shard)  # Automatically create new shard

# Example:
Shard 4: 10M rows (threshold reached)
→ Auto-split: Shard 4A (5M rows) + Shard 4B (5M rows)
```

**Real-world: Instagram monitors shard load (writes/sec, query latency). When Shard N exceeds 80% capacity, auto-creates Shard N+1 and shifts new user_id range. Keeps hot shard load under 1K writes/sec (within server capacity)."**

---

### Follow-Up 2: "How do you handle range queries that span multiple shards?"

**Answer**:

**"Scatter-gather: Query all relevant shards in parallel, merge results at application layer. Optimize by pruning shards (only query shards within range) and using indexes within shards."**

**Example: Range Query Spanning 3 Shards**
```sql
-- Query: Users with user_id 500K-2.5M
SELECT * FROM users WHERE user_id BETWEEN 500_000 AND 2_500_000 ORDER BY user_id;

-- Spans 3 shards:
Shard 1 (1-1M):      user_id 500K-1M     (500K rows)
Shard 2 (1M-2M):     user_id 1M-2M       (1M rows)
Shard 3 (2M-3M):     user_id 2M-2.5M     (500K rows)
```

**Scatter-Gather Implementation**:
```python
def range_query(min_id, max_id):
    # Step 1: Determine relevant shards (prune unnecessary shards)
    relevant_shards = []
    for shard in shard_ranges:
        if shard['max'] >= min_id and shard['min'] <= max_id:
            relevant_shards.append(shard)
    
    # Step 2: Query relevant shards in parallel
    futures = []
    for shard in relevant_shards:
        # Adjust range for each shard
        shard_min = max(min_id, shard['min'])
        shard_max = min(max_id, shard['max'])
        
        future = shard.query_async(f"""
            SELECT * FROM users
            WHERE user_id BETWEEN {shard_min} AND {shard_max}
            ORDER BY user_id
        """)
        futures.append(future)
    
    # Step 3: Merge results (k-way merge, already sorted within shards)
    results = []
    for future in futures:
        results.extend(future.result())
    
    # Results already sorted (each shard returns sorted results)
    # No need for global sort
    return results[:LIMIT]  # Apply limit

# Parallelization:
# 3 shards × 50ms per query = 50ms total (not 150ms sequential)

# Pruning:
# Only query 3 relevant shards (not all 4 shards)
```

**Optimization: Indexed Range Scans**:
```sql
-- Within each shard, use index on user_id
CREATE INDEX idx_users_id ON users(user_id);

-- Range scan on index (fast)
SELECT * FROM users WHERE user_id BETWEEN 500_000 AND 1_000_000;

-- Index scan: O(log N + K) where K = result rows
-- Full scan: O(N) where N = total rows
```

**Pagination** (cursor-based):
```python
# Page 1: Get first 100 users
results = range_query(500_000, 2_500_000, limit=100)
last_user_id = results[-1].user_id  # e.g., 550_000

# Page 2: Continue from last_user_id
results = range_query(550_001, 2_500_000, limit=100)

# No OFFSET (efficient, cursor-based pagination)
```

**Real-world: Twitter's timeline queries span multiple shards (user follows 500 people across shards). Scatter-gather to 500 shards, k-way merge by timestamp, return top 20 tweets. Optimization: Denormalized feed table (pre-computed, single-shard query)."**

---

### Follow-Up 3: "When would you choose range-based sharding over hash-based sharding?"

**Answer**:

**"Choose range-based when range queries are common (time-series, logs, analytics) or when data has natural ordering (sequential IDs, timestamps). Choose hash-based for even distribution and point lookups (user profiles, sessions)."**

**Range-Based Sharding**:

**When to Use**:
```
1. Time-series data (logs, events, metrics, IoT sensors)
   - Query: "Logs from February 2023" → Single shard
   - Retention: Drop old shards after 1 year

2. Sequential IDs (auto-increment, Snowflake IDs)
   - Natural ordering (user_id 1, 2, 3, ...)
   - Range queries: user_id 100K-200K → Single shard

3. Data lifecycle (old data archived/deleted)
   - Easy archival: DROP shard_2020 (not DELETE WHERE year=2020 from all shards)

4. Analytics workloads (time-range aggregations)
   - Query: SUM(sales) WHERE date BETWEEN '2023-01-01' AND '2023-12-31'
   - Single shard per month/quarter
```

**Pros**:
- Fast range queries (single-shard or few shards)
- Easy resharding (split range, no data movement)
- Predictable growth (add new shard for new time range)

**Cons**:
- Hot shard problem (new data concentrates on latest shard)
- Uneven distribution (old shards idle, new shards busy)

---

**Hash-Based Sharding**:

**When to Use**:
```
1. User data (profiles, preferences, sessions)
   - Even distribution (no hot shards)
   - Point queries: WHERE user_id = 123 → Single shard

2. High write volume (need even distribution)
   - All shards equally loaded

3. No range queries (don't need sequential access)
   - Query: WHERE user_id = 123 (not user_id BETWEEN 100 AND 200)
```

**Pros**:
- Even distribution (balanced load across shards)
- No hot shard problem (writes distributed uniformly)

**Cons**:
- Range queries slow (must query all shards)
- Resharding painful (rehash all data, 50% moves)

---

**Decision Matrix**:

| Aspect | Range-Based | Hash-Based |
|--------|-------------|------------|
| **Range queries** | ✅ Fast | ❌ Slow (all shards) |
| **Point queries** | ✅ Fast | ✅ Fast |
| **Distribution** | ❌ Uneven (hot shard) | ✅ Even |
| **Resharding** | ✅ Easy (split range) | ❌ Hard (rehash) |
| **Time-series** | ✅ Perfect | ❌ Poor |
| **User data** | ❌ Poor (hot shard) | ✅ Perfect |

**Hybrid Approach**:
```python
# Combine both: Hash by user region, range by timestamp
shard_key = (hash(user_region) % 4, timestamp.year)

# Example:
user_region = 'US'
timestamp = '2023-05-15'
shard_group = hash('US') % 4 = 2
shard = f"shard_{shard_group}_2023"  # Shard group 2, year 2023

# Benefits:
# - Even distribution (hash ensures balance across regions)
# - Fast time-range queries (range within shard group)
```

**Real-world: Amazon DynamoDB uses hybrid (partition key hashed, sort key range). Discord shards by guild_id (hash) but within guild, messages ordered by timestamp (range). Best of both worlds."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Range-Based Sharding Architecture

```
┌────────────────────────────────────────────────────────────┐
│          RANGE-BASED SHARDING ARCHITECTURE                 │
└────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Application    │
│  (Range Router)  │
└────────┬─────────┘
         │
    if user_id <= 1M: Shard 1
    elif user_id <= 2M: Shard 2
    elif user_id <= 3M: Shard 3
    else: Shard 4
         │
    ┌────┴────────┬────────┬────────┐
    ↓             ↓        ↓        ↓
┌─────────┐  ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Shard 1 │  │ Shard 2 │ │ Shard 3 │ │ Shard 4 │
│ 1-1M    │  │ 1M-2M   │ │ 2M-3M   │ │ 3M+     │
│ 1M rows │  │ 1M rows │ │ 1M rows │ │ 4M rows │
│ 10 w/s  │  │ 50 w/s  │ │ 100 w/s │ │ 500 w/s │
│ (old)   │  │         │ │         │ │ (HOT 🔥)│
└─────────┘  └─────────┘ └─────────┘ └─────────┘

Single-Shard Query (fast):
  WHERE user_id = 1,500,000
  → Shard 2 only (50ms)

Range Query (spans 3 shards):
  WHERE user_id BETWEEN 500,000 AND 2,500,000
  → Shard 1 (500K-1M)
  → Shard 2 (1M-2M)
  → Shard 3 (2M-2.5M)
  → Merge results (150ms)


HOT SHARD PROBLEM:
═══════════════════════════════════════════════════════════

Initial (balanced):
[1M rows]  [1M rows]  [1M rows]  [1M rows]
 Shard 1    Shard 2    Shard 3    Shard 4
 100 w/s    100 w/s    100 w/s    100 w/s
    ✅          ✅          ✅          ✅

After 2 years (imbalanced):
[1M rows]  [1M rows]  [1M rows]  [5M rows]
 Shard 1    Shard 2    Shard 3    Shard 4
 10 w/s     50 w/s     100 w/s    500 w/s 🔥
 (idle)                           (HOT)
    ⚠️          ⚠️          ⚠️          ❌

Solution: Split Shard 4
[1M rows]  [1M rows]  [1M rows]  [2.5M]   [2.5M]
 Shard 1    Shard 2    Shard 3    S4A      S4B
 10 w/s     50 w/s     100 w/s    250 w/s  250 w/s
    ⚠️          ⚠️          ⚠️          ✅       ✅


TIME-SERIES SHARDING (Logs):
═══════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────┐
│         Logs Sharded by Month                    │
└──────────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Shard 2023-01│  │ Shard 2023-02│  │ Shard 2023-03│
│ Jan logs     │  │ Feb logs     │  │ Mar logs     │
│ 50M rows     │  │ 55M rows     │  │ 60M rows     │
│ 10 GB        │  │ 11 GB        │  │ 12 GB        │
│ (archived)   │  │ (read-only)  │  │ (active)     │
└──────────────┘  └──────────────┘  └──────────────┘

Query: Logs from Feb 1-28
→ Shard 2023-02 only (100ms)

Retention: Drop Jan shard after 3 months
→ DELETE shard_2023_01 (instant, no WHERE clause)


RANGE QUERY ROUTING:
═══════════════════════════════════════════════════════════

Query: WHERE user_id BETWEEN 500,000 AND 2,500,000

Step 1: Identify relevant shards
─────────────────────────────────────────────────────────→
Shard 1 (1-1M):     INTERSECTS [500K-1M] ✅
Shard 2 (1M-2M):    INTERSECTS [1M-2M] ✅
Shard 3 (2M-3M):    INTERSECTS [2M-2.5M] ✅
Shard 4 (3M+):      NO INTERSECTION ❌

Step 2: Scatter (query 3 shards in parallel)
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Shard 1 Query   │  │ Shard 2 Query   │  │ Shard 3 Query   │
│ WHERE user_id   │  │ WHERE user_id   │  │ WHERE user_id   │
│ BETWEEN 500K    │  │ BETWEEN 1M      │  │ BETWEEN 2M      │
│ AND 1M          │  │ AND 2M          │  │ AND 2.5M        │
│ (500K rows)     │  │ (1M rows)       │  │ (500K rows)     │
│ 50ms            │  │ 50ms            │  │ 50ms            │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Step 3: Gather (merge results)
┌─────────────────────────────────────────────────────┐
│ Merge sorted results (k-way merge)                  │
│ Total: 2M rows in 50ms (parallel, not 150ms seq)   │
└─────────────────────────────────────────────────────┘
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Range-Based Sharding Matters

**Use Cases**:
- Time-series data (logs, events, metrics): 80% of sharded systems
- Sequential data (auto-increment IDs, Snowflake IDs)
- Analytics (time-range aggregations, reporting)
- Data lifecycle (archival, retention policies)

**Without Range-Based Sharding**:
- Slow range queries (must scan all shards)
- Expensive archival (DELETE WHERE year=2020 from all shards)
- Complex time-range queries (scatter-gather across all shards)

**With Range-Based Sharding**:
- Fast range queries (single-shard for time ranges)
- Easy archival (DROP old shard, instant)
- Efficient time-range analytics (query only relevant shards)

### Key Strategies

**1. Shard by Time Range** (logs, events):
```
Shard by month: shard_2023_01, shard_2023_02, ...
Query "February logs" → Single shard (fast)
Retention: Drop shard_2023_01 after 3 months (instant DELETE)
```

**2. Handle Hot Shard Problem**:
```
Monitor shard load (writes/sec, storage size)
When threshold reached (> 10M rows or > 1K writes/sec):
  - Split hot shard (Shard 4 → Shard 4A + Shard 4B)
  - Or add new range shard (Shard 5 for user_id 7M+)
```

**3. Optimize Range Queries**:
```
Prune shards (only query shards within range)
Parallelize (scatter-gather in parallel, not sequential)
Index within shards (CREATE INDEX ON user_id for fast range scans)
```

**4. Hybrid Approach** (hash + range):
```
Hash by user region (even distribution)
Range by timestamp (fast time queries)
Example: Discord (hash by guild_id, range by message timestamp)
```

### Production Checklist

- [ ] **Identify use case**: Time-series, sequential IDs, or analytics workload
- [ ] **Define range boundaries**: Monthly, quarterly, or by ID range (1M per shard)
- [ ] **Monitor hot shards**: Alert if writes/sec > 1K or storage > 100 GB
- [ ] **Auto-split hot shards**: Trigger when threshold reached (< 10M rows/shard)
- [ ] **Optimize range queries**: Shard pruning, parallel scatter-gather, indexes
- [ ] **Plan retention policy**: Auto-archive old shards (DROP after 1 year)
- [ ] **Document shard ranges**: Centralized config (shard_config table)
- [ ] **Test range queries**: Verify single-shard routing for time ranges
- [ ] **Benchmark**: Range-based vs hash-based for your workload
- [ ] **Migrate gradually**: Start with partitioning (same server), then shard (multiple servers)

### Bottom Line

**Range-based sharding is ideal for time-series and sequential data (logs, events, analytics). For FAANG interviews: Explain range-based (shard by value ranges like date or ID), when to use (time-range queries common), hot shard problem (new data concentrates on latest shard), and solutions (split shard, add new range, hybrid hash+range). Real-world example from Twitter: Snowflake IDs with range-based sharding by quarter. Time-range queries fast (tweets from Q2 → single shard), old shards archived after 3 years. Trade-off: Hot shard problem (mitigated by auto-splitting when threshold reached) vs fast range queries (10x faster than hash-based for time ranges).**

