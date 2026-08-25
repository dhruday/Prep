# 69. Vertical vs Horizontal Database Scaling

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Database Scaling?

**Database scaling** is the process of increasing database capacity to handle more load (queries per second, data volume, concurrent users).

### Two Scaling Approaches

**Vertical Scaling (Scale Up)**: Make single server more powerful
```
Before: 1 server (4 cores, 16 GB RAM, 500 GB SSD)
After:  1 server (16 cores, 128 GB RAM, 2 TB SSD)

Capacity: 1,000 QPS → 4,000 QPS
Cost: $100/month → $800/month
```

**Horizontal Scaling (Scale Out)**: Add more servers
```
Before: 1 server (4 cores, 16 GB RAM, 500 GB SSD)
After:  4 servers (4 cores, 16 GB RAM, 500 GB SSD each)

Capacity: 1,000 QPS → 4,000 QPS
Cost: $100/month → $400/month
```

### Quick Comparison

| Aspect | Vertical Scaling | Horizontal Scaling |
|--------|-----------------|-------------------|
| **Method** | Bigger server | More servers |
| **Limit** | Hardware max (96 cores) | Nearly unlimited |
| **Cost** | Exponential ($$$) | Linear ($$) |
| **Downtime** | Yes (reboot required) | No (add servers online) |
| **Complexity** | Simple (no code changes) | Complex (sharding, replication) |
| **Fault Tolerance** | Single point of failure | High (multiple servers) |

**When to Use**:
- **Vertical**: < 10K QPS, simple setup, small team
- **Horizontal**: > 10K QPS, high availability required, large scale

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Vertical Scaling (Scale Up)

**Definition**: Increase resources of a single database server.

**What You Can Scale**:
```
CPU:     4 cores → 16 cores → 96 cores
RAM:     16 GB → 128 GB → 1 TB
Storage: 500 GB SSD → 2 TB SSD → 10 TB NVMe
Network: 1 Gbps → 10 Gbps → 100 Gbps
```

**Performance Gains**:
```
4 cores → 16 cores: 4x CPU-bound queries (aggregations, JOINs)
16 GB → 128 GB RAM: 8x cache hit rate (more data in memory)
500 GB SSD → 2 TB NVMe: 3x read/write throughput
1 Gbps → 10 Gbps: 10x network bandwidth (large result sets)
```

**Example: E-commerce Database**
```
Initial: 4 cores, 16 GB RAM, 500 GB SSD
Load: 1,000 QPS (queries per second)
Response time: 10ms (P95)

After vertical scaling: 16 cores, 128 GB RAM, 2 TB NVMe
Load: 4,000 QPS
Response time: 10ms (P95) maintained

Cost:
Before: $100/month
After: $800/month (8x cost for 4x capacity)
```

**Limitations**:

**1. Hardware Ceiling**:
```
Maximum single server (AWS RDS db.r6g.16xlarge):
- 64 vCPUs
- 512 GB RAM
- 64,000 IOPS (I/O operations per second)
- Cost: ~$5,000/month

Cannot scale beyond this without horizontal scaling
```

**2. Exponential Cost**:
```
4 cores, 16 GB:    $100/month  (baseline)
8 cores, 32 GB:    $250/month  (2.5x cost for 2x resources)
16 cores, 64 GB:   $600/month  (6x cost for 4x resources)
32 cores, 128 GB:  $1,500/month (15x cost for 8x resources)

Cost grows faster than capacity (diminishing returns)
```

**3. Downtime**:
```
Scaling process:
1. Schedule maintenance window (2 AM - 4 AM)
2. Stop database server
3. Upgrade hardware / change instance type
4. Restart database server
5. Warm up caches (first queries slow)

Downtime: 15-30 minutes (unacceptable for 24/7 services)
```

**4. Single Point of Failure**:
```
If server crashes:
- Entire database down
- All queries fail
- Application unavailable

Recovery: Restore from backup (RTO: 1-4 hours)
```

---

### 2. Horizontal Scaling (Scale Out)

**Definition**: Add more database servers and distribute load.

**Strategies**:

#### A. Read Replicas (Read Scaling)

**Architecture**:
```
┌────────────────┐
│  Application   │
└────────┬───────┘
         │
         ↓
    Load Balancer
         │
    ┌────┴──────────┬──────────┐
    ↓               ↓          ↓
┌─────────┐   ┌─────────┐  ┌─────────┐
│ Primary │──→│Replica 1│  │Replica 2│
│ (Write) │   │ (Read)  │  │ (Read)  │
└─────────┘   └─────────┘  └─────────┘
    │
    └──→ Replication (async)

Write: Primary only (1 server)
Read: Primary + 2 Replicas (3 servers)

Capacity: 1,000 QPS → 3,000 QPS (3x read scaling)
```

**How It Works**:
```python
# Application code (read-write splitting)
def get_user(user_id):
    # Read from replica
    return replica_db.query("SELECT * FROM users WHERE user_id = %s", user_id)

def update_user(user_id, data):
    # Write to primary
    primary_db.execute("UPDATE users SET name = %s WHERE user_id = %s", (data.name, user_id))
    primary_db.commit()
```

**Replication Process**:
```
1. Write to Primary:
   INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');
   
2. Primary logs change to binary log (binlog)
   
3. Primary sends binlog to replicas (asynchronous)
   
4. Replicas apply changes to their local data
   
5. Replication lag: 10-500ms (replicas slightly behind primary)
```

**Use Case**: Read-heavy workload (90% reads, 10% writes)
```
Primary: 100 writes/sec
Replica 1: 500 reads/sec
Replica 2: 500 reads/sec

Total: 100 writes/sec + 1,000 reads/sec
```

---

#### B. Sharding (Write Scaling)

**Architecture**:
```
┌────────────────┐
│  Application   │
└────────┬───────┘
         │
         ↓
   Sharding Logic
         │
    ┌────┴────┬────────┐
    ↓         ↓        ↓
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Shard 1 │ │ Shard 2 │ │ Shard 3 │
│ users   │ │ users   │ │ users   │
│ 1-1M    │ │ 1M-2M   │ │ 2M-3M   │
└─────────┘ └─────────┘ └─────────┘

Data partitioned across servers (each has subset)
Capacity: 1,000 writes/sec × 3 = 3,000 writes/sec
```

**Sharding by User ID** (hash-based):
```python
def get_shard(user_id):
    shard_count = 3
    shard_id = user_id % shard_count  # Hash function
    return shards[shard_id]

# Examples:
user_id = 123 → shard 0 (123 % 3 = 0)
user_id = 456 → shard 0 (456 % 3 = 0)
user_id = 789 → shard 0 (789 % 3 = 0)
user_id = 124 → shard 1 (124 % 3 = 1)
user_id = 125 → shard 2 (125 % 3 = 2)

# Query user
def get_user(user_id):
    shard = get_shard(user_id)
    return shard.query("SELECT * FROM users WHERE user_id = %s", user_id)
```

**Challenges**:
- **Cross-shard queries** (JOINs across shards expensive)
- **Resharding** (adding shards requires data migration)
- **Uneven distribution** (some shards hotter than others)

---

#### C. Connection Pooling

**Problem: Too Many Connections**:
```
Web server: 100 servers × 100 threads = 10,000 connections to database

Database limit: 500 max connections (PostgreSQL default)
Result: Connection exhaustion, queries rejected
```

**Solution: Connection Pool** (pgBouncer, RDS Proxy):
```
┌──────────────────────────────────────────┐
│  100 Web Servers (1000 threads each)     │
└───────────┬──────────────────────────────┘
            │ 100,000 client connections
            ↓
    ┌───────────────┐
    │ Connection    │
    │ Pool          │  Multiplexes connections
    │ (PgBouncer)   │
    └───────┬───────┘
            │ 100 database connections (reused)
            ↓
    ┌───────────────┐
    │   Database    │
    └───────────────┘

Benefit: 100,000 clients → 100 DB connections (100x reduction)
```

**How It Works**:
```python
# Without pooling (each request opens new connection)
def handle_request():
    conn = psycopg2.connect(...)  # 100ms to establish
    result = conn.execute("SELECT * FROM users")
    conn.close()
    return result
# Total time: 100ms (connection) + 10ms (query) = 110ms

# With pooling (reuse existing connections)
pool = ConnectionPool(min=10, max=100)
def handle_request():
    conn = pool.get_connection()  # 0ms (reuse existing)
    result = conn.execute("SELECT * FROM users")
    pool.release(conn)
    return result
# Total time: 0ms (connection) + 10ms (query) = 10ms (11x faster)
```

---

### 3. Hybrid Approach (Vertical + Horizontal)

**Real-World Strategy**:
```
Phase 1: Start with single server (< 1K QPS)
- Cost: $100/month
- Simple, no replication

Phase 2: Vertical scaling (1K - 5K QPS)
- Upgrade to 16 cores, 64 GB RAM
- Cost: $600/month
- Still simple, no code changes

Phase 3: Add read replicas (5K - 20K QPS)
- Primary (16 cores) + 3 Replicas (8 cores each)
- Cost: $600 + 3×$300 = $1,500/month
- Code change: Read-write splitting

Phase 4: Shard database (> 20K QPS)
- 4 shards (16 cores each) + replicas
- Cost: 4×$600 + 12×$300 = $6,000/month
- Code change: Sharding logic

Result: 1K → 50K QPS (50x scaling)
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Scaling Decision Calculator

**Workload**: 10,000 queries per second (QPS)

**Option 1: Vertical Scaling**
```
Single server requirements:
- CPU: 32 cores (to handle 10K QPS)
- RAM: 256 GB (cache frequently accessed data)
- Storage: 2 TB SSD

Cost: $2,000/month (AWS db.r6g.8xlarge)

Pros: Simple (no replication)
Cons: Single point of failure, limited to 20K QPS max
```

**Option 2: Horizontal Scaling (Read Replicas)**
```
Architecture: 1 Primary + 4 Replicas

Assuming 80% reads, 20% writes:
- Primary: 2,000 writes/sec
- 4 Replicas: 8,000 reads/sec (2,000 each)

Each server: 8 cores, 32 GB RAM, 500 GB SSD
Cost: 5 × $400/month = $2,000/month

Pros: High availability (5 servers), can scale to 50K+ QPS
Cons: Replication lag (10-500ms), read-write splitting
```

**Option 3: Horizontal Scaling (Sharding)**
```
Architecture: 4 Shards (each with 1 Primary + 1 Replica)

Each shard handles: 10K QPS / 4 = 2,500 QPS

Each server: 8 cores, 32 GB RAM, 500 GB SSD
Cost: 8 × $400/month = $3,200/month

Pros: Unlimited write scaling, high availability
Cons: Complex (sharding logic, cross-shard queries), higher cost
```

**Recommendation**:
```
< 5K QPS:     Vertical scaling (simple, cost-effective)
5K - 20K QPS: Vertical + Read replicas (balance simplicity and scale)
> 20K QPS:    Sharding + Replicas (necessary for scale)
```

---

## 4. Data & Storage Design

### Data Distribution Strategies

#### 1. Range-Based Sharding
```sql
-- Shard by user ID range
Shard 1: user_id 1 - 1,000,000
Shard 2: user_id 1,000,001 - 2,000,000
Shard 3: user_id 2,000,001 - 3,000,000

-- Query user
def get_user(user_id):
    if user_id <= 1_000_000:
        return shard1.query("SELECT * FROM users WHERE user_id = %s", user_id)
    elif user_id <= 2_000_000:
        return shard2.query("SELECT * FROM users WHERE user_id = %s", user_id)
    else:
        return shard3.query("SELECT * FROM users WHERE user_id = %s", user_id)

# Pros: Range queries easy (all users 1-1M on one shard)
# Cons: Uneven distribution (new users all on shard 3, "hot" shard)
```

#### 2. Hash-Based Sharding
```python
def get_shard(user_id):
    shard_count = 3
    shard_id = hash(user_id) % shard_count
    return shards[shard_id]

# Pros: Even distribution (uniform hash)
# Cons: Range queries require querying all shards
```

#### 3. Geographic Sharding
```
Shard 1 (US East): users.region = 'us-east'
Shard 2 (US West): users.region = 'us-west'
Shard 3 (EU): users.region = 'eu'

# Pros: Low latency (data close to users), compliance (data residency)
# Cons: Uneven load (US East 50%, US West 30%, EU 20%)
```

---

## 5. Scalability, Reliability & Fault Tolerance

### High Availability Setup

**Multi-AZ Deployment** (AWS RDS):
```
┌─────────────┐
│ Primary DB  │  (Availability Zone A)
└──────┬──────┘
       │ Synchronous replication
       ↓
┌─────────────┐
│ Standby DB  │  (Availability Zone B)
└─────────────┘

Failover:
1. Primary fails (hardware issue, AZ outage)
2. Standby promoted to Primary (automatic, 60-120 seconds)
3. Application reconnects to new Primary (via DNS update)

RTO (Recovery Time Objective): 2 minutes
RPO (Recovery Point Objective): 0 (synchronous replication, no data loss)
```

**Read Replica Failover**:
```
┌─────────────┐
│ Primary DB  │
└──────┬──────┘
       │
   ┌───┴────────────┬────────────┐
   ↓                ↓            ↓
┌──────────┐  ┌──────────┐  ┌──────────┐
│Replica 1 │  │Replica 2 │  │Replica 3 │
└──────────┘  └──────────┘  └──────────┘

If Primary fails:
1. Promote Replica 1 to Primary (manual or automatic)
2. Replica 2 and 3 replicate from new Primary
3. Application writes directed to new Primary

RTO: 5-10 minutes (manual promotion, DNS update)
RPO: 10-500ms (replication lag, small data loss possible)
```

---

## 6. Security, APIs & Governance

### Read-Write Splitting (Application Layer)

**Manual Routing**:
```python
# Database connections
primary_db = connect("primary.db.example.com")
replica_db = connect("replica.db.example.com")

# Read queries → Replica
def get_user(user_id):
    return replica_db.query("SELECT * FROM users WHERE user_id = %s", user_id)

# Write queries → Primary
def create_user(name, email):
    primary_db.execute("INSERT INTO users (name, email) VALUES (%s, %s)", (name, email))
    primary_db.commit()
```

**Automatic Routing (ProxySQL, RDS Proxy)**:
```python
# Single connection (proxy routes automatically)
db = connect("proxy.db.example.com")

# Proxy routes SELECTs to replicas
user = db.query("SELECT * FROM users WHERE user_id = 123")

# Proxy routes INSERTs/UPDATEs/DELETEs to primary
db.execute("UPDATE users SET name = 'Alice' WHERE user_id = 123")
db.commit()
```

**Handling Replication Lag**:
```python
def create_order(user_id, product_id):
    # Write to primary
    primary_db.execute("INSERT INTO orders (user_id, product_id) VALUES (%s, %s)", (user_id, product_id))
    primary_db.commit()
    
    # Read-your-writes: Force read from primary (not replica)
    order = primary_db.query("SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC LIMIT 1", user_id)
    return order

# Alternative: Read from replica with retry
def get_recent_order(user_id, order_id):
    for attempt in range(3):
        order = replica_db.query("SELECT * FROM orders WHERE order_id = %s", order_id)
        if order:
            return order
        time.sleep(0.1)  # Wait for replication lag (100ms)
    
    # Fallback: Read from primary
    return primary_db.query("SELECT * FROM orders WHERE order_id = %s", order_id)
```

---

## 7. Real-World Examples & Case Studies

### Instagram: Sharding by User ID

**Problem**: 1 billion users, 95 million photos/day, single database overwhelmed.

**Solution**: Shard by user ID (hash-based sharding)

**Implementation**:
```python
SHARD_COUNT = 4096  # 4096 shards

def get_shard(user_id):
    shard_id = user_id % SHARD_COUNT
    return shards[shard_id]

# Example:
user_id = 123456789
shard_id = 123456789 % 4096 = 3157
# Query shard 3157 for this user's data
```

**Benefits**:
- **Write scaling**: 1 server → 4096 servers (4096x writes/sec)
- **Data isolation**: User data never spans shards (no cross-shard queries)
- **Fault tolerance**: 1 shard down = 0.02% of users affected (not entire site)

**Challenges**:
- **Cross-user queries**: Follower feed requires querying multiple shards (user follows 500 people across 500 shards)
- **Resharding**: Adding shards requires rebalancing (migrate 25% of data when going from 4096 → 5096 shards)

---

### Pinterest: Read Replicas for Discovery Feed

**Problem**: Discovery feed queries complex (JOINs, aggregations), slow primary.

**Solution**: 1 Primary + 15 Read Replicas

**Architecture**:
```
Primary (16 cores): 5,000 writes/sec
Replica 1-15 (8 cores each): 2,000 reads/sec each = 30,000 reads/sec total

Total capacity: 5,000 writes + 30,000 reads = 35,000 QPS
```

**Result**:
- **Cost**: $800 (primary) + 15×$400 (replicas) = $6,800/month
- **Scaling**: 2,000 QPS → 35,000 QPS (17.5x)
- **High availability**: 15 replicas (if 1 fails, 14 remain)

---

### Shopify: Vertical Scaling for Simplicity

**Problem**: Black Friday traffic spike (10x normal load).

**Solution**: Vertical scaling (temporary upgrade)

**Implementation**:
```
Normal: 32 cores, 256 GB RAM ($2,000/month)
Black Friday: 96 cores, 768 GB RAM ($8,000/month)

Duration: 1 week
Extra cost: $6,000 × 0.25 (1 week) = $1,500
```

**Why Not Horizontal**:
- **Simplicity**: No code changes, no sharding logic
- **Short duration**: 1 week spike, not permanent
- **Cost**: $1,500 temporary vs $50K to implement sharding

**Downside**:
- **Downtime**: 15 minutes to upgrade (scheduled at 2 AM)
- **Limit**: 96 cores maximum (cannot scale beyond)

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "What's the difference between vertical and horizontal database scaling?"

**Structured Answer**:

**"Vertical scaling means making a single server more powerful (more CPU, RAM, storage). Horizontal scaling means adding more servers and distributing load across them."**

**Vertical Scaling** (Scale Up):
- Increase server resources: 4 cores → 16 cores, 16 GB → 128 GB RAM
- Pros: Simple (no code changes), no replication complexity
- Cons: Hardware limit (can't exceed 96 cores), expensive (exponential cost), single point of failure, downtime during upgrade
- Use case: < 10K QPS, small team, simple application

**Horizontal Scaling** (Scale Out):
- Add more servers: 1 server → 4 servers (each 4 cores, 16 GB)
- Strategies: Read replicas (read scaling), Sharding (write scaling), Connection pooling
- Pros: Nearly unlimited scale, high availability (multiple servers), linear cost
- Cons: Complex (replication lag, sharding logic, cross-shard queries), code changes required
- Use case: > 10K QPS, high availability needed, large scale

**Real-World Pattern**:
```
Phase 1 (< 5K QPS): Vertical scaling (simple, upgrade server)
Phase 2 (5K - 20K QPS): Vertical + Read replicas (balance simplicity and scale)
Phase 3 (> 20K QPS): Sharding + Replicas (necessary for write scaling)
```

**Real-world example: Instagram shards by user ID (4096 shards). Enables 1B users, 500K writes/sec. Each user's data on single shard (no cross-shard queries for user timeline). Trade-off: Complex follower feed (must query 500 shards for 500 followed users)."**

---

### Follow-Up 1: "How do you handle read-write splitting with replicas?"

**Answer**:

**"Route write queries to primary, read queries to replicas. Handle replication lag (10-500ms) for read-your-writes consistency."**

**Implementation Options**:

**1. Application-level routing** (explicit):
```python
primary_db = connect("primary.db.example.com")
replica_db = connect("replica.db.example.com")

# Writes → Primary
def update_user(user_id, name):
    primary_db.execute("UPDATE users SET name = %s WHERE user_id = %s", (name, user_id))
    primary_db.commit()

# Reads → Replica
def get_user(user_id):
    return replica_db.query("SELECT * FROM users WHERE user_id = %s", user_id)
```

**2. Proxy-based routing** (automatic):
```python
# ProxySQL, RDS Proxy, pgBouncer
db = connect("proxy.db.example.com")

# Proxy routes automatically:
# - SELECT → Replica
# - INSERT/UPDATE/DELETE → Primary
user = db.query("SELECT * FROM users WHERE user_id = 123")  # → Replica
db.execute("UPDATE users SET name = 'Alice'")  # → Primary
```

**Handling Replication Lag** (read-your-writes):

**Problem**:
```python
# User updates profile
primary_db.execute("UPDATE users SET name = 'Alice' WHERE user_id = 123")
primary_db.commit()

# Immediately read profile
user = replica_db.query("SELECT * FROM users WHERE user_id = 123")
# Returns: name = 'Bob' (old value, replication lag 100ms)

# User sees old name (confusing!)
```

**Solution 1: Force read from primary** (after write):
```python
def update_profile(user_id, name):
    # Write to primary
    primary_db.execute("UPDATE users SET name = %s WHERE user_id = %s", (name, user_id))
    primary_db.commit()
    
    # Read from primary (consistent)
    return primary_db.query("SELECT * FROM users WHERE user_id = %s", user_id)
```

**Solution 2: Session-based routing** (sticky session):
```python
# After write, route all reads for this session to primary (for 5 seconds)
session['use_primary_until'] = time.time() + 5

def get_user(user_id):
    if time.time() < session.get('use_primary_until', 0):
        return primary_db.query(...)  # Read from primary
    else:
        return replica_db.query(...)  # Read from replica
```

**Solution 3: Retry with exponential backoff**:
```python
def get_user_after_update(user_id, expected_name):
    for attempt in range(3):
        user = replica_db.query("SELECT * FROM users WHERE user_id = %s", user_id)
        if user.name == expected_name:
            return user  # Replication caught up
        time.sleep(0.1 * (2 ** attempt))  # 100ms, 200ms, 400ms
    
    # Fallback: Read from primary
    return primary_db.query("SELECT * FROM users WHERE user_id = %s", user_id)
```

**Real-world: Twitter routes timeline queries to replicas (500ms lag acceptable). But after posting tweet, reads from primary for 1 second (user expects to see own tweet immediately). After 1 second, switches back to replicas."**

---

### Follow-Up 2: "When would you choose vertical scaling over horizontal scaling?"

**Answer**:

**"Choose vertical scaling when simplicity is more important than scale. Good for < 10K QPS, small team, or early-stage startups."**

**Vertical Scaling Preferred When**:

**1. Load < 10K QPS**:
```
Single powerful server handles 10K QPS easily:
- 32 cores, 128 GB RAM
- Cost: $1,500/month
- Simple: No replication, no sharding

Horizontal alternative (4 servers):
- 4 × (8 cores, 32 GB RAM)
- Cost: 4 × $400 = $1,600/month (similar cost)
- Complex: Replication lag, read-write splitting, monitoring 4 servers

Conclusion: Vertical scaling simpler, same cost
```

**2. Small Team** (< 5 engineers):
```
Horizontal scaling requires:
- Sharding logic (1-2 weeks to implement)
- Monitoring multiple servers (alerting, logging)
- Replication lag handling (read-your-writes logic)
- Cross-shard queries (complex JOINs)

Vertical scaling:
- Zero code changes (just upgrade server)
- Single server to monitor
- No replication complexity

Conclusion: Team velocity higher with vertical scaling
```

**3. Database-Heavy Operations** (CPU/RAM bound):
```
Workload: Complex aggregations, analytics queries

Vertical scaling:
- 64 cores process query in parallel (intra-query parallelism)
- 512 GB RAM caches entire dataset

Horizontal scaling:
- Each server has 8 cores (slower query processing)
- Must scatter-gather across shards (network overhead)

Conclusion: Single powerful server faster for analytics
```

**4. Temporary Load Spike**:
```
Black Friday: 10x normal load for 1 week

Vertical scaling:
- Temporarily upgrade: 32 → 96 cores
- Cost: $6,000 extra for 1 week = $1,500
- Downgrade after Black Friday

Horizontal scaling:
- Add 9 servers (10x capacity)
- Cost: $50K to implement sharding + $3,600/week servers
- Cannot easily downgrade (sharding code remains)

Conclusion: Vertical scaling cheaper for temporary spikes
```

**Horizontal Scaling Preferred When**:
- Load > 20K QPS (vertical limit reached)
- High availability critical (multiple servers = redundancy)
- Write-heavy workload (sharding enables write scaling)
- Geographic distribution (data close to users)

**Real-world: Shopify uses vertical scaling for most merchants (< 10K QPS). Only top 1% of merchants (Kylie Cosmetics, etc.) need horizontal scaling (dedicated shards). Saves engineering complexity for 99% of use cases."**

---

### Follow-Up 3: "How do you handle failover with read replicas?"

**Answer**:

**"If primary fails, promote replica to new primary. Update DNS to redirect writes. Takes 2-10 minutes depending on automation."**

**Failover Process**:

**1. Detect Primary Failure**:
```python
# Health check every 5 seconds
def check_primary_health():
    try:
        primary_db.query("SELECT 1")
        return True
    except ConnectionError:
        return False

# If 3 consecutive failures (15 seconds), trigger failover
consecutive_failures = 0
if not check_primary_health():
    consecutive_failures += 1
    if consecutive_failures >= 3:
        trigger_failover()
```

**2. Promote Replica to Primary**:
```sql
-- On replica server
-- Stop replication
STOP SLAVE;

-- Promote to primary (remove read-only mode)
SET GLOBAL read_only = 0;

-- Replica is now primary (accepts writes)
```

**3. Update DNS** (route writes to new primary):
```
Before:
primary.db.example.com → 10.0.1.100 (old primary, dead)
replica1.db.example.com → 10.0.1.101

After failover:
primary.db.example.com → 10.0.1.101 (promoted replica)
replica1.db.example.com → 10.0.1.101

TTL: 60 seconds (DNS propagation)
```

**4. Reconfigure Other Replicas** (replicate from new primary):
```sql
-- On replica2, replica3
-- Stop replication from old primary
STOP SLAVE;

-- Change master to new primary (promoted replica1)
CHANGE MASTER TO MASTER_HOST='10.0.1.101';

-- Start replication from new primary
START SLAVE;
```

**5. Application Reconnects**:
```python
# Application uses connection pool with retry
def execute_write(query):
    for attempt in range(3):
        try:
            primary_db.execute(query)
            return
        except ConnectionError:
            # Primary unreachable, retry after DNS update
            time.sleep(30)  # Wait for DNS propagation
            primary_db.reconnect()
```

**Failover Timing**:
```
Detection: 15 seconds (3 × 5-second health checks)
Promotion: 30 seconds (stop replication, set read-write)
DNS update: 60 seconds (TTL propagation)
Total: ~2 minutes (RTO = 2 minutes)

Data loss: 0-500ms (replication lag at time of failure)
RPO = 500ms (acceptable for most applications)
```

**Automated Failover** (AWS RDS, Google Cloud SQL):
```
1. Multi-AZ deployment (standby replica in different AZ)
2. Synchronous replication (no data loss, RPO = 0)
3. Automatic failover (60-120 seconds, no manual intervention)
4. DNS updated automatically

Result: RTO = 2 minutes, RPO = 0 (zero data loss)
```

**Manual vs Automated**:
```
Manual failover:
- Pros: Full control, can verify replica health before promotion
- Cons: Slow (5-10 minutes), requires on-call engineer, human error

Automated failover:
- Pros: Fast (2 minutes), no human intervention, reliable
- Cons: Can promote unhealthy replica (if misconfigured), costs more

Recommendation: Use automated for production, manual for staging
```

**Real-world: GitHub uses automated failover with MySQL read replicas. Primary failure detected in 10 seconds, replica promoted in 60 seconds, DNS updated in 30 seconds. Total RTO: 100 seconds (< 2 minutes). Happens ~2 times per year (99.99% uptime)."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Scaling Decision Tree

```
┌────────────────────────────────────────────────────────────┐
│          DATABASE SCALING DECISION FLOWCHART               │
└────────────────────────────────────────────────────────────┘

                 Current Load (QPS)
                        │
            ┌───────────┴───────────┐
            │                       │
        < 5K QPS               > 5K QPS
            │                       │
            ↓                       ↓
    VERTICAL SCALING        Read-heavy or Write-heavy?
    (Upgrade server)                │
    - 4 → 16 cores          ┌───────┴───────┐
    - Simple                │               │
    - $100 → $600       Read-heavy     Write-heavy
                        (90% reads)    (> 30% writes)
                            │               │
                            ↓               ↓
                    READ REPLICAS      SHARDING
                    + Vertical         + Read Replicas
                    - 1 Primary        - 4+ Shards
                    - 3-5 Replicas     - Complex
                    - 5K-50K QPS       - 50K+ QPS


VERTICAL SCALING (Scale Up):
═══════════════════════════════════════════════════════════

  Before                    After
┌──────────┐             ┌──────────┐
│ 4 cores  │             │ 16 cores │
│ 16 GB    │  ────────>  │ 64 GB    │
│ 500 GB   │             │ 2 TB     │
└──────────┘             └──────────┘
1,000 QPS                4,000 QPS

Cost: $100/month → $600/month (6x)
Capacity: 1K → 4K QPS (4x)
Complexity: No change (same architecture)


HORIZONTAL SCALING - READ REPLICAS:
═══════════════════════════════════════════════════════════

┌────────────────┐
│  Application   │
└────────┬───────┘
         │
    ┌────┴──────────────┬──────────┐
    ↓                   ↓          ↓
┌─────────┐       ┌─────────┐  ┌─────────┐
│ Primary │──────>│Replica 1│  │Replica 2│
│ (Write) │ Repli │ (Read)  │  │ (Read)  │
│ 16 core │ cate  │ 8 core  │  │ 8 core  │
└─────────┘       └─────────┘  └─────────┘

Write: 2,000 QPS (Primary only)
Read:  8,000 QPS (4,000 × 2 replicas)
Total: 10,000 QPS

Cost: $600 (Primary) + 2×$300 (Replicas) = $1,200/month
Replication lag: 10-500ms (eventual consistency)


HORIZONTAL SCALING - SHARDING:
═══════════════════════════════════════════════════════════

┌────────────────┐
│  Application   │
└────────┬───────┘
         │
   Shard Router
   (Hash user_id)
         │
    ┌────┴────────┬──────────┐
    ↓             ↓          ↓
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Shard 1 │  │ Shard 2 │  │ Shard 3 │
│ users   │  │ users   │  │ users   │
│ 1-1M    │  │ 1M-2M   │  │ 2M-3M   │
└─────────┘  └─────────┘  └─────────┘

Each shard: 2,000 writes/sec
Total: 6,000 writes/sec (3× write scaling)

Cost: 3 × $400 = $1,200/month
Challenge: Cross-shard queries (expensive)


CONNECTION POOLING:
═══════════════════════════════════════════════════════════

Without pooling:
100 servers × 100 threads = 10,000 connections to DB
Database limit: 500 max connections
Result: CONNECTION EXHAUSTED ❌

With pooling (PgBouncer):
┌─────────────────────────────────────────┐
│  100 servers × 100 threads              │
│  = 10,000 client connections            │
└─────────────┬───────────────────────────┘
              │
              ↓
       ┌─────────────┐
       │ PgBouncer   │  Multiplexes
       │ Connection  │  (session pooling)
       │ Pool        │
       └──────┬──────┘
              │ 100 DB connections (reused)
              ↓
       ┌─────────────┐
       │  Database   │
       └─────────────┘

Result: 10,000 clients → 100 DB connections (100× reduction)
Benefit: No connection exhaustion, 100ms saved per query
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Database Scaling Matters

**Growth Trajectory**:
```
Day 1: 100 QPS (single server handles easily)
Year 1: 5,000 QPS (vertical scaling sufficient)
Year 3: 50,000 QPS (horizontal scaling required)
Year 5: 500,000 QPS (sharding mandatory)
```

**Without Scaling**:
- Slow queries (> 1 second response time)
- Timeouts (connection exhausted)
- Downtime (single point of failure)
- Lost revenue (users abandon slow site)

**With Scaling**:
- Fast queries (< 100ms response time)
- High availability (multiple servers)
- Cost-efficient (linear scaling cost)
- Happy users (smooth experience)

### Key Strategies

**Vertical Scaling** (Scale Up):
- **When**: < 10K QPS, small team, simplicity critical
- **How**: Upgrade CPU, RAM, storage (4 cores → 16 cores)
- **Limit**: Hardware maximum (96 cores, 1 TB RAM)
- **Cost**: Exponential (2x resources ≠ 2x cost)

**Horizontal Scaling** (Scale Out):
- **When**: > 10K QPS, high availability, write scaling
- **How**: Add servers (read replicas, sharding, connection pooling)
- **Limit**: Nearly unlimited (add more servers)
- **Cost**: Linear (2x servers = 2x cost)

### Real-World Pattern

**Phase 1** (< 5K QPS): Vertical scaling
```
Single server: 16 cores, 64 GB RAM
Cost: $600/month
Complexity: Simple
```

**Phase 2** (5K - 20K QPS): Vertical + Read Replicas
```
Primary (16 cores) + 3 Replicas (8 cores)
Cost: $600 + 3×$300 = $1,500/month
Complexity: Medium (read-write splitting)
```

**Phase 3** (> 20K QPS): Sharding + Replicas
```
4 Shards (16 cores each) + 2 Replicas per shard
Cost: 12 × $400 = $4,800/month
Complexity: High (sharding logic, cross-shard queries)
```

### Production Checklist

- [ ] **Monitor QPS and latency**: Alert if P95 > 100ms
- [ ] **Start with vertical scaling**: Simple until 5K QPS
- [ ] **Add read replicas**: When read:write > 10:1
- [ ] **Implement connection pooling**: PgBouncer, RDS Proxy (prevent connection exhaustion)
- [ ] **Handle replication lag**: Read-your-writes consistency (route to primary after write)
- [ ] **Set up automated failover**: Multi-AZ for high availability (RTO < 2 minutes)
- [ ] **Plan for sharding**: When vertical scaling reaches limit (> 20K QPS)
- [ ] **Monitor replication lag**: Alert if > 1 second
- [ ] **Load test before scaling**: Verify capacity before production
- [ ] **Document sharding strategy**: Hash vs range vs geographic

### Bottom Line

**Vertical scaling = simple, horizontal scaling = scalable. For FAANG interviews: Start with vertical (< 10K QPS), add read replicas (10K - 20K QPS, read-heavy), shard database (> 20K QPS, write-heavy). Explain trade-offs (vertical: simple but limited; horizontal: complex but unlimited). Real-world example from Instagram: 4096 shards by user ID enables 500K writes/sec, 1B users. Shard by user ID ensures user data never spans shards (fast queries). Rule: Choose simplest solution that meets scale requirements (don't over-engineer).**

