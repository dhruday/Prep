# 73. Hash-Based Sharding

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Hash-Based Sharding?

**Hash-based sharding** distributes data evenly across shards using a hash function on the shard key (e.g., `hash(user_id) % num_shards`).

**Example: Users Table by User ID Hash**

```
┌────────────────┐
│  Shard 0       │
│  hash(user_id) │
│  % 4 == 0      │
│  user_id:      │
│  4, 8, 12, ... │
│  25M rows      │
└────────────────┘

┌────────────────┐
│  Shard 1       │
│  hash(user_id) │
│  % 4 == 1      │
│  user_id:      │
│  1, 5, 9, ...  │
│  25M rows      │
└────────────────┘

┌────────────────┐
│  Shard 2       │
│  hash(user_id) │
│  % 4 == 2      │
│  user_id:      │
│  2, 6, 10, ... │
│  25M rows      │
└────────────────┘

┌────────────────┐
│  Shard 3       │
│  hash(user_id) │
│  % 4 == 3      │
│  user_id:      │
│  3, 7, 11, ... │
│  25M rows      │
└────────────────┘

Routing Logic:
shard_id = hash(user_id) % 4
```

### Hash-Based vs Range-Based

| Aspect | Hash-Based | Range-Based |
|--------|------------|-------------|
| **Distribution** | ✅ Even | ❌ Uneven (hot shard) |
| **Point queries** | ✅ Fast | ✅ Fast |
| **Range queries** | ❌ Slow (all shards) | ✅ Fast (single shard) |
| **Resharding** | ❌ Hard (rehash 50%) | ✅ Easy (split range) |
| **Use case** | Users, sessions | Logs, time-series |

**Point query example**:
```sql
-- Hash-based sharding
SELECT * FROM users WHERE user_id = 123456;
shard_id = hash(123456) % 4 = 2
-- Routes to: Shard 2 only ✅ (fast, 10ms)

-- Range query (slow)
SELECT * FROM users WHERE user_id BETWEEN 100000 AND 200000;
-- Routes to: All 4 shards ❌ (100K-200K scattered across all shards)
-- Time: 40ms (query all 4 shards in parallel)
```

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Hash Function Selection

**Requirements for Good Hash Function**:
1. **Uniform distribution**: Each shard gets roughly equal data
2. **Deterministic**: Same key always hashes to same shard
3. **Fast**: Hash computation < 1µs
4. **Low collision**: Minimize keys hashing to same value

**Common Hash Functions**:

```python
# 1. Simple Modulo (fast but poor distribution for sequential IDs)
def simple_hash(user_id, num_shards):
    return user_id % num_shards

# Example:
user_id = 100, num_shards = 4
shard = 100 % 4 = 0

# Problem: Sequential IDs cluster
user_id 1, 5, 9, 13 → Shard 1
user_id 2, 6, 10, 14 → Shard 2
# If IDs generated in batches (1-100, then 101-200), poor distribution


# 2. CRC32 (better distribution, fast)
import zlib

def crc32_hash(user_id, num_shards):
    # Convert to bytes
    key_bytes = str(user_id).encode('utf-8')
    # CRC32 hash
    hash_value = zlib.crc32(key_bytes) & 0xffffffff  # Ensure unsigned 32-bit
    return hash_value % num_shards

# Example:
crc32_hash(123456, 4)  # → 2
crc32_hash(123457, 4)  # → 0 (adjacent IDs hash to different shards)


# 3. MD5 (strong distribution, slower)
import hashlib

def md5_hash(user_id, num_shards):
    key_bytes = str(user_id).encode('utf-8')
    hash_value = hashlib.md5(key_bytes).hexdigest()
    # Take first 8 characters, convert to int
    hash_int = int(hash_value[:8], 16)
    return hash_int % num_shards

# Example:
md5_hash(123456, 4)  # → 1
# Strong distribution but 10x slower than CRC32


# 4. MurmurHash3 (industry standard: fast + good distribution)
import mmh3

def murmur_hash(user_id, num_shards):
    key_bytes = str(user_id).encode('utf-8')
    hash_value = mmh3.hash(key_bytes, signed=False)  # Unsigned 32-bit
    return hash_value % num_shards

# Example:
murmur_hash(123456, 4)  # → 3
# Used by: Redis, Cassandra, Memcached (fast + uniform)
```

**Performance Comparison**:
```
Hash Function      | Speed (ns/op) | Distribution Quality
-------------------|---------------|--------------------
Simple Modulo      | 5 ns          | Poor (sequential IDs cluster)
CRC32              | 50 ns         | Good
MurmurHash3        | 20 ns         | Excellent ⭐ (industry standard)
MD5                | 200 ns        | Excellent (overkill, too slow)

Recommendation: MurmurHash3 (best balance)
```

---

### 2. Even Distribution (No Hot Shards)

**Benefit: Balanced Load Across All Shards**

```python
# Simulate 10M users, hash to 4 shards
import mmh3

num_users = 10_000_000
num_shards = 4
shard_counts = [0] * num_shards

for user_id in range(1, num_users + 1):
    shard_id = mmh3.hash(str(user_id).encode(), signed=False) % num_shards
    shard_counts[shard_id] += 1

# Results:
# Shard 0: 2,500,123 users (25.00%)
# Shard 1: 2,499,876 users (25.00%)
# Shard 2: 2,500,034 users (25.00%)
# Shard 3: 2,499,967 users (25.00%)

# Near-perfect distribution (< 0.01% variance)
```

**Compare to Range-Based** (uneven distribution):
```
Range-based (user_id ranges):
Shard 1 (1-2.5M):    2.5M users (old, inactive, 10 writes/sec)
Shard 2 (2.5M-5M):   2.5M users (100 writes/sec)
Shard 3 (5M-7.5M):   2.5M users (300 writes/sec)
Shard 4 (7.5M-10M):  2.5M users (new, active, 500 writes/sec 🔥)

Imbalanced: 50x difference in load
```

**Hash-based load distribution**:
```
Shard 0: 2.5M users (200 writes/sec)
Shard 1: 2.5M users (200 writes/sec)
Shard 2: 2.5M users (200 writes/sec)
Shard 3: 2.5M users (200 writes/sec)

Balanced: All shards equal load ✅
```

---

### 3. Resharding Problem (Expensive)

**Problem: Adding/Removing Shards Requires Rehashing**

```python
# Initial: 4 shards
def get_shard_old(user_id):
    return hash(user_id) % 4

# After growth: Add 5th shard (now 5 shards total)
def get_shard_new(user_id):
    return hash(user_id) % 5

# Example: Where does user_id 123456 go?
old_shard = hash(123456) % 4 = 2  # Shard 2
new_shard = hash(123456) % 5 = 1  # Shard 1 (MOVED!)

# Impact: 80% of keys move to different shards!
```

**Why 80% Move**:
```
Old (4 shards):
user_id % 4:
  0 → Shard 0
  1 → Shard 1
  2 → Shard 2
  3 → Shard 3

New (5 shards):
user_id % 5:
  0 → Shard 0 (20% stay)
  1 → Shard 1 (20% stay)
  2 → Shard 2 (20% stay)
  3 → Shard 3 (20% stay)
  4 → Shard 4 (20% move from all shards)

Result: 80% of data moves to different shards
```

**Cost of Resharding**:
```
10M users, 1KB per user = 10 GB total
Resharding 4 → 5 shards:
  - 8 GB data moves (80%)
  - Network transfer: 8 GB × 2 (read + write) = 16 GB
  - Time: 16 GB ÷ 100 MB/s = 160 seconds = 2.7 minutes (minimum)
  - Actual: 10-30 minutes (with downtime or double-writes)

For 1 TB database: 800 GB moves = 2-8 hours downtime
```

**Solution: Consistent Hashing** (minimizes data movement)

---

### 4. Consistent Hashing (Industry Standard)

**Problem with Modulo Hashing**: Changing `N` shards causes 80-90% data movement.

**Consistent Hashing Solution**: Only `K/N` keys move when adding Nth shard (e.g., 1/5 = 20% move when adding 5th shard).

**Hash Ring Visualization**:
```
          0
          │
    7 ────┼──── 1
          │
    6 ────┼──── 2
          │
    5 ────┼──── 3
          │
          4

Hash ring: 0 to 2^32-1 (wrap around)

Shard placement (hash shard names):
hash("shard0") = 1000000  → Position 1000000
hash("shard1") = 2500000  → Position 2500000
hash("shard2") = 3200000  → Position 3200000
hash("shard3") = 4000000  → Position 4000000

Key placement (hash keys, walk clockwise to next shard):
hash(user_id 123456) = 1500000
  → Walk clockwise from 1500000
  → Next shard: "shard1" at 2500000
  → Route to: Shard 1

hash(user_id 789012) = 3500000
  → Walk clockwise from 3500000
  → Next shard: "shard3" at 4000000
  → Route to: Shard 3
```

**Adding Shard (Minimal Data Movement)**:
```
Before (4 shards):
Shard 0: Keys 0 - 1000000
Shard 1: Keys 1000001 - 2500000
Shard 2: Keys 2500001 - 3200000
Shard 3: Keys 3200001 - 4294967295 (wrap to 0)

Add Shard 4 at position 3000000:
Shard 0: Keys 0 - 1000000 (no change)
Shard 1: Keys 1000001 - 2500000 (no change)
Shard 4: Keys 2500001 - 3000000 (NEW, moved from Shard 2)
Shard 2: Keys 3000001 - 3200000 (partial, rest moved to Shard 4)
Shard 3: Keys 3200001 - 4294967295 (no change)

Result: Only 11.7% of keys moved (500K keys from Shard 2 to Shard 4)
        vs 80% with modulo hashing
```

**Implementation**:
```python
import bisect
import mmh3

class ConsistentHashRing:
    def __init__(self, shards, virtual_nodes=150):
        """
        shards: List of shard names ['shard0', 'shard1', ...]
        virtual_nodes: Replicas per shard (improves distribution)
        """
        self.virtual_nodes = virtual_nodes
        self.ring = {}  # hash_value → shard_name
        self.sorted_keys = []
        
        for shard in shards:
            self.add_shard(shard)
    
    def add_shard(self, shard):
        """Add shard with virtual nodes"""
        for i in range(self.virtual_nodes):
            # Create virtual node names: shard0:0, shard0:1, ..., shard0:149
            virtual_key = f"{shard}:{i}"
            hash_value = mmh3.hash(virtual_key.encode(), signed=False)
            self.ring[hash_value] = shard
        
        # Re-sort keys after adding shard
        self.sorted_keys = sorted(self.ring.keys())
    
    def remove_shard(self, shard):
        """Remove shard (rehash keys to other shards)"""
        for i in range(self.virtual_nodes):
            virtual_key = f"{shard}:{i}"
            hash_value = mmh3.hash(virtual_key.encode(), signed=False)
            del self.ring[hash_value]
        
        self.sorted_keys = sorted(self.ring.keys())
    
    def get_shard(self, key):
        """Find shard for key"""
        if not self.ring:
            return None
        
        # Hash the key
        hash_value = mmh3.hash(str(key).encode(), signed=False)
        
        # Binary search for next shard (clockwise on ring)
        idx = bisect.bisect_right(self.sorted_keys, hash_value)
        
        # Wrap around if beyond last shard
        if idx == len(self.sorted_keys):
            idx = 0
        
        return self.ring[self.sorted_keys[idx]]

# Usage:
hash_ring = ConsistentHashRing(['shard0', 'shard1', 'shard2', 'shard3'])

# Route keys
hash_ring.get_shard(123456)  # → 'shard2'
hash_ring.get_shard(789012)  # → 'shard1'

# Add shard (only 20% of keys move)
hash_ring.add_shard('shard4')
hash_ring.get_shard(123456)  # → 'shard2' (no change, same shard)
hash_ring.get_shard(789012)  # → 'shard4' (moved, was shard1)

# Remove shard (keys redistributed to remaining shards)
hash_ring.remove_shard('shard1')
```

**Virtual Nodes** (improve distribution):
```
Without virtual nodes (1 node per shard):
Shard 0: 30% of keys (unlucky hash placement)
Shard 1: 20%
Shard 2: 25%
Shard 3: 25%

With virtual nodes (150 per shard):
Shard 0: 25.1% of keys
Shard 1: 24.9%
Shard 2: 25.0%
Shard 3: 25.0%

More virtual nodes → Better distribution (but slower lookup)
Typical: 100-200 virtual nodes per shard
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Even Load Distribution Capacity

**Example: 100M Users Sharded Across 10 Shards**

```
Assumptions:
- 100M users
- 1 KB per user record
- 10 shards (hash-based)

Capacity per shard:
- Users: 100M ÷ 10 = 10M users/shard
- Storage: 10M × 1 KB = 10 GB/shard
- Write QPS: 10K writes/sec ÷ 10 = 1K writes/sec per shard
- Read QPS: 50K reads/sec ÷ 10 = 5K reads/sec per shard

Even distribution (all shards balanced):
Shard 0: 10.01M users, 1000 w/s, 5000 r/s
Shard 1: 9.99M users,  1000 w/s, 5000 r/s
Shard 2: 10.02M users, 1000 w/s, 5000 r/s
...
Shard 9: 9.98M users,  1000 w/s, 5000 r/s

Variance: < 1% (excellent balance)
```

**Compare to Range-Based** (uneven):
```
Range-based (10M users per shard by ID range):
Shard 0 (1-10M):    10M users (old, 100 w/s, 500 r/s)
Shard 1 (10-20M):   10M users (500 w/s, 2K r/s)
...
Shard 9 (90-100M):  10M users (new, 5K w/s, 20K r/s 🔥)

Variance: 50x difference in load
```

---

## 4. Data & Storage Design

### Shard Key Selection

**Good Shard Key Characteristics**:
1. **High cardinality**: Many unique values (user_id millions, not status 10 values)
2. **Immutable**: Never changes (user_id ✅, email ❌ can change)
3. **Query-aligned**: Most queries filter by shard key (WHERE user_id = ?)
4. **Even access pattern**: No celebrity users (if user_id 123 is celebrity with 100x traffic, hash distributes load)

**Examples**:

```python
# Good shard keys:
shard_key = user_id       # Immutable, high cardinality, even access
shard_key = order_id      # Immutable, high cardinality
shard_key = session_id    # Immutable, high cardinality

# Bad shard keys:
shard_key = country       # Low cardinality (200 countries, uneven: US 50%, others 0.1%)
shard_key = status        # Low cardinality (active/inactive/banned, uneven: 90% active)
shard_key = email         # Can change (user updates email → requires moving data)
shard_key = created_at    # Time-based (all new records go to same shard, hot shard problem)
```

**Composite Shard Key** (tenant + user):
```python
# Multi-tenant application (SaaS)
shard_key = f"{tenant_id}:{user_id}"

# Hash composite key
shard_id = hash(f"{tenant_id}:{user_id}") % num_shards

# Example:
tenant_id = 'company_A'
user_id = 123456
shard_key = "company_A:123456"
shard_id = hash(shard_key) % 10 = 3 → Shard 3

# Benefits:
# - Tenant data co-located (all company_A users on same shard, fast queries)
# - Even distribution (hash spreads tenants across shards)
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Adding Shards (Online, Consistent Hashing)

**Scenario**: 10 shards → 12 shards (20% growth)

**With Consistent Hashing**:
```python
# Step 1: Add new shards to hash ring
hash_ring.add_shard('shard10')
hash_ring.add_shard('shard11')

# Step 2: Identify keys to move (only ~16.7% move to new shards)
# 10 shards → 12 shards = 2/12 = 16.7% of keys move

# Step 3: Background migration (no downtime)
def migrate_keys():
    for user_id in all_users:
        old_shard = get_shard_old(user_id)  # Old hash ring (10 shards)
        new_shard = get_shard_new(user_id)  # New hash ring (12 shards)
        
        if old_shard != new_shard:
            # Move key from old_shard to new_shard
            data = old_shard.read(user_id)
            new_shard.write(user_id, data)
            old_shard.delete(user_id)

# Step 4: Double-read during migration (handle keys not yet moved)
def read_user(user_id):
    new_shard = get_shard_new(user_id)
    data = new_shard.read(user_id)
    
    if data is None:
        # Key not yet migrated, read from old shard
        old_shard = get_shard_old(user_id)
        data = old_shard.read(user_id)
    
    return data

# Downtime: 0 seconds (online migration)
# Duration: 2-8 hours for 1TB database (background process)
```

**Data Movement**:
```
10 shards → 12 shards:
- Consistent hashing: 16.7% data moves (2/12 of total)
- Modulo hashing: 80% data moves (rehash all keys)

1 TB database:
- Consistent hashing: 167 GB moves (2 hours at 25 MB/s)
- Modulo hashing: 800 GB moves (9 hours at 25 MB/s)

5x faster with consistent hashing
```

---

## 6. Security, APIs & Governance

### Data Isolation (Multi-Tenant Sharding)

**Use Case**: SaaS application (each tenant = separate company)

**Composite Shard Key** (tenant_id + resource_id):
```python
# Shard by tenant_id (all tenant data on same shard for isolation)
shard_id = hash(tenant_id) % num_shards

# Example:
tenant_id = 'company_A'
shard_id = hash('company_A') % 10 = 3 → Shard 3

# All company_A data on Shard 3:
- Users: company_A:user_1, company_A:user_2, ...
- Orders: company_A:order_1, company_A:order_2, ...
- Invoices: company_A:invoice_1, ...

# Benefits:
# - Data isolation (company_A can't access company_B data, different shards)
# - Fast queries (all related data on same shard, no cross-shard joins)
# - Easy deletion (delete all company_A data from Shard 3 only)
```

---

## 7. Real-World Examples & Case Studies

### Instagram: Hash-Based Sharding by User ID

**Problem**: 1 billion users, need even distribution (no hot shards)

**Solution**: Hash-based sharding by user_id

```python
# Instagram shard routing (simplified)
def get_shard(user_id):
    # Hash user_id
    hash_value = hash(user_id)
    # Modulo number of shards (1000s of shards)
    shard_id = hash_value % num_shards
    return f"shard_{shard_id}"

# Example:
user_id = 123456789
shard_id = hash(123456789) % 1000 = 457
shard = "shard_457"

# Query:
SELECT * FROM users WHERE user_id = 123456789;
# Routes to: shard_457 only (10ms)

# Feed query (followers):
SELECT * FROM follows WHERE follower_id = 123456789;
# Routes to: shard_457 (all follower data on same shard)
```

**Architecture**:
```
1000+ shards (PostgreSQL)
Each shard:
- 1 master (writes)
- 5 replicas (reads)
- 10M users per shard
- 100 GB per shard

Routing layer:
- Python service (hash user_id → shard_id)
- Connection pooling (PgBouncer per shard)
- Failover (automatic replica promotion)

Even distribution:
- Each shard ~10M users (< 1% variance)
- Each shard ~1K writes/sec (balanced load)
```

**Benefits**:
- Even load (no hot shards, unlike range-based with newest users)
- Point queries fast (single shard lookup)
- Scalable (add shards as users grow)

**Challenges**:
- Range queries slow (get users 1M-2M requires all shards)
- Resharding expensive (added shards using consistent hashing)

---

### Memcached: Consistent Hashing for Cache Distribution

**Problem**: 100 Memcached servers, clients need to route keys evenly

**Solution**: Consistent hashing (client-side routing)

```python
# Client library (e.g., pylibmc, python-memcached)
import memcache

# Initialize with server list
mc = memcache.Client([
    'memcache1.example.com:11211',
    'memcache2.example.com:11211',
    ...
    'memcache100.example.com:11211'
], hash_fn=memcache.hash_fn['murmur3'])  # Consistent hashing

# Set key (client routes to server via consistent hashing)
mc.set('user:123456', user_data)
# Hash 'user:123456' → Server memcache57

# Get key (same server)
data = mc.get('user:123456')
# Hash 'user:123456' → Server memcache57 (deterministic)

# Add server (only 1% of keys move)
mc.add_server('memcache101.example.com:11211')
# Consistent hashing: 1/101 keys move to new server
# Modulo hashing: 50% of keys would move (cache invalidation storm)
```

**Benefits**:
- Minimal cache invalidation when adding/removing servers
- Even distribution (virtual nodes)
- No central routing (client decides, low latency)

---

### Discord: Hash-Based Guild Sharding

**Problem**: 100M+ guilds (servers/channels), need even distribution

**Solution**: Hash-based sharding by guild_id

```python
# Discord shard routing
def get_shard(guild_id):
    # Guild ID is Snowflake (64-bit)
    # Hash and route to shard
    shard_id = (guild_id >> 22) % num_shards  # Use timestamp bits for distribution
    return shard_id

# Example:
guild_id = 123456789012345678
shard_id = (123456789012345678 >> 22) % 256 = 157
# Routes to: Shard 157

# All guild data on same shard:
- Channels: guild 123...678 → Shard 157
- Messages: channel in guild 123...678 → Shard 157
- Members: guild 123...678 → Shard 157

# Query: Get guild messages
SELECT * FROM messages WHERE guild_id = 123456789012345678;
# Routes to: Shard 157 only (fast, no cross-shard joins)
```

**Architecture**:
```
256 shards (Cassandra)
Each shard:
- 400K guilds
- 1 TB messages
- 10K writes/sec (balanced)

Consistent hashing:
- Virtual nodes (150 per shard)
- Add shards dynamically (minimal data movement)
```

---

### Amazon DynamoDB: Hash Key Partitioning

**Partition Key** = Hash key (determines partition/shard)

```python
# DynamoDB table: Users
Primary key: user_id (partition key)

# Write item (hash user_id to determine partition)
dynamodb.put_item(
    TableName='Users',
    Item={'user_id': '123456', 'name': 'Alice', 'email': 'alice@example.com'}
)
# Hash(user_id='123456') % num_partitions → Partition 42

# Read item (same partition)
dynamodb.get_item(
    TableName='Users',
    Key={'user_id': '123456'}
)
# Hash(user_id='123456') % num_partitions → Partition 42 (10ms)

# Scan (slow, queries all partitions)
dynamodb.scan(TableName='Users')
# Queries all partitions (1000+ partitions, 5 seconds)
```

**Auto-Scaling**:
```
DynamoDB automatically splits partitions:
- Partition size > 10 GB → Split into 2 partitions
- Partition throughput > 1K writes/sec → Split

Example:
Partition 42: 12 GB (exceeds 10 GB limit)
→ Split: Partition 42A (6 GB) + Partition 42B (6 GB)
→ Rehash keys using consistent hashing (minimal data movement)

Automatic, no downtime
```

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "What is hash-based sharding and when would you use it?"

**Structured Answer**:

**"Hash-based sharding distributes data evenly across shards using a hash function on the shard key (e.g., `hash(user_id) % num_shards`). Use it for user data, sessions, or any workload needing even distribution with primarily point queries (WHERE user_id = ?)."**

**Definition**:
```python
# Hash user_id to determine shard
shard_id = hash(user_id) % num_shards

# Example:
hash(123456) % 4 = 2 → Shard 2
```

**When to Use**:
```
1. User data (profiles, preferences, sessions)
   - Even distribution (no hot users)
   - Point queries: WHERE user_id = ? → Single shard

2. High write volume (need balanced load)
   - All shards equally loaded

3. No range queries (don't need WHERE user_id BETWEEN)
   - Range queries require querying all shards (slow)
```

**Benefits**:
- Even distribution (all shards balanced, < 1% variance)
- No hot shards (unlike range-based with newest data)
- Predictable performance (all shards same load)

**Drawbacks**:
- Range queries slow (must query all shards)
- Resharding expensive (changing num_shards rehashes 80% of keys)
  - Solution: Consistent hashing (only 1/N keys move)

**Consistent Hashing**:
```python
# Problem: Modulo hashing
shard_id = hash(user_id) % 4  # 4 shards
# Add 5th shard: hash(user_id) % 5 → 80% of keys move ❌

# Solution: Consistent hashing (hash ring)
# Add 5th shard: Only 20% of keys move ✅

hash_ring.add_shard('shard4')  # Only 1/5 of keys move to new shard
```

**Real-world example: Instagram uses hash-based sharding by user_id. 1 billion users across 1000+ PostgreSQL shards. Even distribution (each shard ~10M users, < 1% variance). Point queries fast (get user profile → single shard, 10ms). Feed queries co-located (user + followers on same shard, no cross-shard joins). Resharding uses consistent hashing (added 200 shards in 2018, only 16.7% data moved, minimal downtime)."**

---

### Follow-Up 1: "What's consistent hashing and why is it better than modulo hashing?"

**Answer**:

**"Consistent hashing minimizes data movement when adding/removing shards. Modulo hashing (hash % N) causes 80% of keys to move when changing N shards. Consistent hashing uses a hash ring where only K/N keys move when adding Nth shard (e.g., 1/5 = 20% move when adding 5th shard)."**

**Modulo Hashing Problem**:
```python
# Initial: 4 shards
shard_id = hash(user_id) % 4

user_id 100: hash(100) % 4 = 0 → Shard 0
user_id 200: hash(200) % 4 = 2 → Shard 2

# Add 5th shard (now 5 shards)
shard_id = hash(user_id) % 5

user_id 100: hash(100) % 5 = 0 → Shard 0 (no change)
user_id 200: hash(200) % 5 = 3 → Shard 3 (MOVED from Shard 2!)

# Result: 80% of keys move to different shards
# For 1 TB database: 800 GB moves (hours of downtime)
```

**Consistent Hashing Solution**:
```
Hash Ring:
        0°
        │
  270° ─┼─ 90°
        │
       180°

Shard placement (hash shard names, place on ring):
hash("shard0") = 45° → Place Shard 0 at 45°
hash("shard1") = 135° → Place Shard 1 at 135°
hash("shard2") = 225° → Place Shard 2 at 225°
hash("shard3") = 315° → Place Shard 3 at 315°

Key routing (hash key, walk clockwise to next shard):
hash(user_id 100) = 50°
  → Walk clockwise from 50°
  → Next shard: Shard 1 at 135°
  → Route to: Shard 1

hash(user_id 200) = 200°
  → Walk clockwise from 200°
  → Next shard: Shard 2 at 225°
  → Route to: Shard 2

Add Shard 4 at 180°:
hash("shard4") = 180° → Place Shard 4 at 180°

Re-route affected keys:
hash(user_id 100) = 50° → Shard 1 (no change, still 135°)
hash(user_id 200) = 200°
  → Walk clockwise from 200°
  → Next shard: Shard 4 at 180° (NEW, moved from Shard 2)

Result: Only 20-25% of keys move (those between 135° and 180°)
        vs 80% with modulo hashing
```

**Implementation**:
```python
class ConsistentHashRing:
    def __init__(self, shards):
        self.ring = {}  # hash_value → shard
        for shard in shards:
            self.add_shard(shard)
    
    def add_shard(self, shard):
        # Add 150 virtual nodes per shard (better distribution)
        for i in range(150):
            hash_val = hash(f"{shard}:{i}")
            self.ring[hash_val] = shard
        self.sorted_keys = sorted(self.ring.keys())
    
    def get_shard(self, key):
        hash_val = hash(key)
        # Binary search for next shard (clockwise)
        idx = bisect.bisect_right(self.sorted_keys, hash_val)
        if idx == len(self.sorted_keys):
            idx = 0
        return self.ring[self.sorted_keys[idx]]

# Usage:
ring = ConsistentHashRing(['shard0', 'shard1', 'shard2', 'shard3'])
ring.get_shard(100)  # → 'shard1'

# Add shard (only 20% keys move)
ring.add_shard('shard4')
ring.get_shard(100)  # → 'shard1' (no change, not affected)
```

**Real-world: Memcached uses consistent hashing. 100 cache servers, add 101st server → only 1% of keys move (vs 50% with modulo). Minimal cache invalidation, no thundering herd."**

---

### Follow-Up 2: "How do you handle range queries with hash-based sharding?"

**Answer**:

**"Range queries with hash-based sharding are slow because keys are scattered across all shards. Solution: Scatter-gather (query all shards in parallel) or avoid range queries (redesign schema, use secondary index, or switch to range-based sharding for that table)."**

**Problem**:
```sql
-- Query: Users with user_id between 100K and 200K
SELECT * FROM users WHERE user_id BETWEEN 100000 AND 200000;

-- Hash-based sharding: IDs scattered across all shards
hash(100000) % 4 = 0 → Shard 0 has user 100000
hash(100001) % 4 = 1 → Shard 1 has user 100001
hash(100002) % 4 = 2 → Shard 2 has user 100002
...

-- Must query all 4 shards:
for shard in [shard0, shard1, shard2, shard3]:
    shard.query("SELECT * FROM users WHERE user_id BETWEEN 100000 AND 200000")

# Time: 4 shards × 50ms = 200ms (parallel)
#       vs 50ms for range-based (single shard)
```

**Solution 1: Scatter-Gather** (parallel queries):
```python
def range_query(min_id, max_id):
    # Query all shards in parallel
    futures = []
    for shard in all_shards:
        future = shard.query_async(f"""
            SELECT * FROM users
            WHERE user_id BETWEEN {min_id} AND {max_id}
        """)
        futures.append(future)
    
    # Merge results
    results = []
    for future in futures:
        results.extend(future.result())
    
    # Sort and return (each shard returns unsorted results)
    return sorted(results, key=lambda u: u.user_id)

# Optimization: Query shards in parallel (200ms vs 800ms sequential)
# But still 4x slower than range-based sharding (50ms single shard)
```

**Solution 2: Secondary Index** (range query on non-shard-key):
```sql
-- Query: Users created in 2023
SELECT * FROM users WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31';

-- Hash-based sharding by user_id (can't route by created_at)
-- Must query all shards ❌

-- Solution: Secondary index table (range-based sharding on created_at)
CREATE TABLE users_by_date (
    created_at DATE,
    user_id INT,
    PRIMARY KEY (created_at, user_id)
) PARTITION BY RANGE (created_at);

-- Query secondary index (fast)
SELECT user_id FROM users_by_date
WHERE created_at BETWEEN '2023-01-01' AND '2023-12-31';
-- Routes to: Single partition (fast, 50ms)

-- Fetch full user details (point queries)
for user_id in user_ids:
    shard = hash(user_id) % 4
    user = shard.query("SELECT * FROM users WHERE user_id = ?", user_id)

# Hybrid: Range index + hash primary (best of both)
```

**Solution 3: Avoid Range Queries** (redesign):
```
Instead of: SELECT * FROM users WHERE user_id BETWEEN 100K AND 200K
Ask: Why do we need range queries on user_id?

Common cases:
1. Pagination: Use cursor-based (WHERE user_id > last_id LIMIT 100)
   - Works with hash-based (still queries all shards but efficient)
   
2. Time-range analytics: Use created_at, not user_id
   - Secondary index or separate analytics DB (ClickHouse, BigQuery)
   
3. Admin tools: Acceptable to be slow (query all shards, admins only)
   - Optimize for 99% of user traffic, not admin edge cases
```

**Solution 4: Hybrid Sharding** (hash + range):
```python
# Shard by user region (hash), within region by user_id (range)
region = get_user_region(user_id)
shard_group = hash(region) % 4  # 4 regions
shard = f"shard_{shard_group}_{user_id // 1_000_000}"  # Range within region

# Range query within region (fast)
SELECT * FROM users WHERE region = 'US' AND user_id BETWEEN 100K AND 200K;
# Routes to: Single shard (US region, user_id 100K-200K range)

# Cross-region range query (slow, queries all regions)
SELECT * FROM users WHERE user_id BETWEEN 100K AND 200K;
# Routes to: 4 shards (one per region)
```

**Real-world: Twitter uses hash-based sharding for users (by user_id) but range-based for tweets (by tweet_id with timestamp). User queries point-based (WHERE user_id = ?), tweet queries time-based (tweets from Q1 2024). Right tool for each workload."**

---

### Follow-Up 3: "When would you choose hash-based over range-based sharding?"

**Answer**:

**"Choose hash-based when even distribution is critical (high write volume, no hot shards) and queries are primarily point queries (WHERE user_id = ?). Choose range-based when range queries are common (time-series, logs, analytics) and hot shard problem is acceptable (mitigated with split/archival)."**

**Hash-Based Sharding**:

**When to Use**:
```
1. User data (profiles, preferences, sessions)
   - Even distribution (no celebrity hot shards)
   - Point queries: WHERE user_id = 123456 → Single shard

2. High write volume (need balanced load across all shards)
   - All shards equally loaded (1K writes/sec per shard)
   - No hot shard bottleneck

3. Immutable keys (user_id, order_id never change)
   - Hash once, route forever

4. No range queries (queries don't use BETWEEN or >= operators)
   - Or range queries are rare and can be slow (scatter-gather acceptable)
```

**Pros**:
- Even distribution (< 1% variance across shards)
- No hot shard problem (all shards balanced)
- Predictable performance (every shard same load)

**Cons**:
- Range queries slow (must query all shards, 4x slower)
- Resharding expensive (modulo: 80% moves; consistent hashing: 20% moves)

---

**Range-Based Sharding**:

**When to Use**:
```
1. Time-series data (logs, events, metrics, IoT)
   - Query: "Logs from February" → Single shard
   - Archival: Drop old shards after retention (instant DELETE)

2. Sequential IDs (auto-increment, Snowflake IDs)
   - Natural ordering (user_id 1, 2, 3, ...)
   - Range queries: user_id 100K-200K → Single shard (fast)

3. Data lifecycle (old data archived/deleted)
   - Easy archival: DROP shard_2020 (vs DELETE WHERE year=2020 across all shards)

4. Analytics workloads (time-range aggregations)
   - Query: SUM(sales) WHERE date BETWEEN '2023-01-01' AND '2023-12-31'
   - Single shard or few shards (vs all shards in hash-based)
```

**Pros**:
- Fast range queries (single shard, 50ms vs 200ms hash-based)
- Easy resharding (split range, no data movement needed)
- Predictable growth (add new shard for new time range)

**Cons**:
- Hot shard problem (new data concentrates on latest shard)
- Uneven distribution (old shards idle, new shards overloaded)
  - Mitigation: Split hot shard, add new shard, auto-scale

---

**Decision Matrix**:

| Aspect | Hash-Based | Range-Based |
|--------|------------|-------------|
| **Point queries** | ✅ Fast | ✅ Fast |
| **Range queries** | ❌ Slow (all shards) | ✅ Fast (single shard) |
| **Distribution** | ✅ Even | ❌ Uneven (hot shard) |
| **Resharding** | ❌ Hard (20-80% moves) | ✅ Easy (split range) |
| **Use case** | Users, sessions | Logs, time-series |
| **Write volume** | ✅ High (balanced) | ⚠️ Medium (hot shard) |

**Hybrid Approach** (combine both):
```python
# Example: Amazon DynamoDB
Primary key: (partition_key, sort_key)
- partition_key: Hash-based (even distribution)
- sort_key: Range-based (fast range queries within partition)

# Query:
SELECT * FROM orders
WHERE customer_id = 123  -- Hash: routes to partition
  AND order_date BETWEEN '2023-01-01' AND '2023-12-31'  -- Range: within partition

# Benefits:
# - Even distribution (hash partition key)
# - Fast range queries (range sort key within partition)
# - Best of both worlds
```

**Real-world: Instagram uses hash-based for users (user_id hashed, even distribution, point queries). Twitter uses range-based for tweets (tweet_id = Snowflake ID with timestamp, range queries by time). Discord uses hash-based for guilds (guild_id hashed, even distribution) but range-based for messages within guild (by timestamp). Choose based on query patterns."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Hash-Based Sharding Architecture

```
┌────────────────────────────────────────────────────────────┐
│          HASH-BASED SHARDING ARCHITECTURE                  │
└────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   Application    │
│  (Hash Router)   │
└────────┬─────────┘
         │
    shard_id = hash(user_id) % 4
         │
    ┌────┴────────┬────────┬────────┐
    ↓             ↓        ↓        ↓
┌─────────┐  ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Shard 0 │  │ Shard 1 │ │ Shard 2 │ │ Shard 3 │
│ hash%4=0│  │ hash%4=1│ │ hash%4=2│ │ hash%4=3│
│ 2.5M    │  │ 2.5M    │ │ 2.5M    │ │ 2.5M    │
│ 200 w/s │  │ 200 w/s │ │ 200 w/s │ │ 200 w/s │
│ BALANCED│  │ BALANCED│ │ BALANCED│ │ BALANCED│
└─────────┘  └─────────┘ └─────────┘ └─────────┘
     ✅            ✅            ✅            ✅

Point Query (fast):
  WHERE user_id = 123456
  hash(123456) % 4 = 2
  → Shard 2 only (10ms)

Range Query (slow):
  WHERE user_id BETWEEN 100K AND 200K
  → Must query all 4 shards (IDs scattered)
  → 4 × 50ms = 200ms (parallel)


EVEN DISTRIBUTION:
═══════════════════════════════════════════════════════════

Hash function distributes evenly:
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Shard 0  │ │ Shard 1  │ │ Shard 2  │ │ Shard 3  │
│ 25.01%   │ │ 24.99%   │ │ 25.00%   │ │ 25.00%   │
│ 2.501M   │ │ 2.499M   │ │ 2.500M   │ │ 2.500M   │
│ users    │ │ users    │ │ users    │ │ users    │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Variance: < 0.1% (excellent balance)

Key distribution example:
user_id 1  → hash % 4 = 1 → Shard 1
user_id 2  → hash % 4 = 2 → Shard 2
user_id 3  → hash % 4 = 3 → Shard 3
user_id 4  → hash % 4 = 0 → Shard 0
user_id 5  → hash % 4 = 1 → Shard 1
...
(IDs scattered across all shards, not sequential)


CONSISTENT HASHING:
═══════════════════════════════════════════════════════════

Hash Ring (0 to 2^32-1):
                   0
                   │
    Shard3 ───────┼─────── Shard0
   (270°)          │        (45°)
                   │
    Shard2 ───────┼─────── Shard1
   (180°)          │        (135°)
                   │

Key routing (clockwise to next shard):
hash(user_id 100) = 50° → Next: Shard1 (135°)
hash(user_id 200) = 200° → Next: Shard2 (180°)
hash(user_id 300) = 320° → Next: Shard3 (270°)

Add Shard4 at 90°:
                   0
                   │
    Shard3 ───────┼─────── Shard0
   (270°)          │        (45°)
             Shard4 (90°)
    Shard2 ───────┼─────── Shard1
   (180°)          │        (135°)
                   │

Key re-routing (only affected range 45° to 90°):
hash(user_id 100) = 50° → New: Shard4 (90°) MOVED ✅
hash(user_id 200) = 200° → Shard2 (no change) ✅
hash(user_id 300) = 320° → Shard3 (no change) ✅

Result: Only 12.5% of keys move (45° to 90° range = 45°/360° = 12.5%)
        vs 80% with modulo hashing


RESHARDING COMPARISON:
═══════════════════════════════════════════════════════════

Modulo Hashing (4 → 5 shards):
Before: hash(key) % 4
  Key A: hash % 4 = 0 → Shard 0
  Key B: hash % 4 = 2 → Shard 2

After: hash(key) % 5
  Key A: hash % 5 = 0 → Shard 0 (no change)
  Key B: hash % 5 = 3 → Shard 3 (MOVED from 2)

Data movement: 80% of keys move ❌

Consistent Hashing (4 → 5 shards):
Before: 4 shards on ring
After: Add Shard4 at position 100°
  Only keys between 45° (Shard0) and 100° (new Shard4) move
  
Data movement: ~20% of keys move ✅

┌─────────────────────────────────────────────────────┐
│ 1 TB database resharding:                           │
│ - Modulo: 800 GB moves (9 hours at 25 MB/s) ❌      │
│ - Consistent: 200 GB moves (2 hours at 25 MB/s) ✅  │
│ 4.5x faster with consistent hashing                 │
└─────────────────────────────────────────────────────┘


SCATTER-GATHER QUERY (Range Query):
═══════════════════════════════════════════════════════════

Query: WHERE user_id BETWEEN 100000 AND 200000

Step 1: Scatter (query all shards in parallel)
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Shard 0      │  │ Shard 1      │  │ Shard 2      │  │ Shard 3      │
│ Find users   │  │ Find users   │  │ Find users   │  │ Find users   │
│ hash%4=0     │  │ hash%4=1     │  │ hash%4=2     │  │ hash%4=3     │
│ in range     │  │ in range     │  │ in range     │  │ in range     │
│ 25K results  │  │ 25K results  │  │ 25K results  │  │ 25K results  │
│ 50ms         │  │ 50ms         │  │ 50ms         │  │ 50ms         │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

Step 2: Gather (merge results in application)
┌─────────────────────────────────────────────────────┐
│ Merge 100K results from 4 shards                    │
│ Sort by user_id (each shard returns unsorted)       │
│ Total time: 50ms (parallel) + 20ms (merge/sort)     │
│ = 70ms                                              │
└─────────────────────────────────────────────────────┘

Compare to Range-Based (single shard):
┌──────────────┐
│ Shard 1      │
│ user_id      │
│ 100K-200K    │
│ 100K results │
│ 50ms         │
└──────────────┘
Total: 50ms (no merge needed, already sorted)
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Hash-Based Sharding Matters

**Use Cases**:
- User data (profiles, sessions): 90% of web applications
- High write volume (need balanced load)
- No range queries (point lookups only)

**Without Hash-Based Sharding**:
- Hot shards (newest users overload latest shard)
- Uneven distribution (some shards idle, others overloaded)
- Poor resource utilization (50% of capacity wasted on idle shards)

**With Hash-Based Sharding**:
- Even distribution (all shards balanced, < 1% variance)
- Predictable performance (every shard same load)
- Efficient resource utilization (all shards at 70-80% capacity)

### Key Strategies

**1. Choose Good Hash Function** (MurmurHash3):
```python
shard_id = murmur_hash(user_id) % num_shards
# Fast (20ns), uniform distribution, industry standard
```

**2. Use Consistent Hashing** (minimize resharding cost):
```python
# Modulo: 80% data moves when adding shard ❌
# Consistent hashing: 20% data moves ✅

hash_ring.add_shard('shard4')  # Only 1/N keys move
```

**3. Handle Range Queries** (scatter-gather or avoid):
```python
# Scatter-gather: Query all shards in parallel
# Or: Redesign schema (secondary index, cursor pagination)
```

**4. Virtual Nodes** (improve distribution):
```python
# 150 virtual nodes per physical shard
# Reduces variance from 5% to < 0.1%
```

### Production Checklist

- [ ] **Select hash function**: MurmurHash3 recommended (fast + uniform)
- [ ] **Implement consistent hashing**: Minimize resharding cost (20% vs 80% data movement)
- [ ] **Virtual nodes**: 100-200 per shard for even distribution
- [ ] **Monitor distribution**: Alert if shard variance > 5% (rebalance needed)
- [ ] **Handle range queries**: Scatter-gather or secondary index
- [ ] **Test resharding**: Verify only 1/N keys move when adding shard
- [ ] **Document shard key**: Ensure immutable (user_id ✅, email ❌)
- [ ] **Connection pooling**: One pool per shard (PgBouncer, ProxySQL)
- [ ] **Benchmark**: Compare to range-based for your workload
- [ ] **Plan growth**: Auto-add shards when capacity reaches 80%

### Bottom Line

**Hash-based sharding provides even distribution for user data and high write volumes. For FAANG interviews: Explain hash-based (hash shard key modulo num_shards), when to use (point queries, even distribution needed), consistent hashing (minimize resharding data movement from 80% to 20%), and range query challenges (scatter-gather across all shards). Real-world example from Instagram: 1 billion users hash-sharded by user_id across 1000+ PostgreSQL shards. Even distribution (each shard ~10M users, < 1% variance), no hot shards. Point queries fast (single shard, 10ms). Resharding uses consistent hashing (added 200 shards with only 16.7% data moved). Trade-off: Range queries slow (must query all shards) but acceptable since 99% of queries are point lookups (WHERE user_id = ?).**

