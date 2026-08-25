# 79. Distributed Caching

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Distributed Caching?

**Distributed caching** is a caching architecture where cache data is spread across multiple servers (nodes) to achieve horizontal scalability, high availability, and fault tolerance beyond what a single cache instance can provide.

**The Problem with Single-Server Caching**:

```
┌────────────────────────────────────────────────────────┐
│         SINGLE REDIS INSTANCE (Limited Scale)          │
└────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│  Single Redis Server     │  Capacity: 100K ops/sec, 16GB RAM
│  - All cache data here   │  
│  - Single point of failure  Problem ❌
│  - Cannot scale beyond  │  ├─ If crashes: 100% cache loss → database overload
│    100K ops/sec         │  ├─ If full (16GB): Evict old data → lower hit ratio
└────────────┬─────────────┘  └─ If overloaded (>100K QPS): High latency, timeouts
             │
             ↓
    All requests (200K QPS) ── Bottleneck! ⚠️
    Redis overloaded: P95 latency 1ms → 50ms (50x slower)
    Database fallback: 200K QPS → DB (200x normal load, crashes)
```

**The Solution: Distributed Cache Cluster**:

```
┌────────────────────────────────────────────────────────┐
│         DISTRIBUTED REDIS CLUSTER (Scalable)           │
└────────────────────────────────────────────────────────┘

Application Servers (100 instances)
         ↓ Load balanced requests (1M QPS total)
┌────────────────────────────────────────────────────────┐
│  Redis Cluster (3 Masters + 3 Replicas)                │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐│
│  │ Master 1        │  │ Master 2        │  │ Master 3││
│  │ Keys: 0-5461    │  │ Keys: 5462-10922│  │ Keys:..│││
│  │ 16GB RAM        │  │ 16GB RAM        │  │ 16GB RAM│││
│  │ 100K ops/sec    │  │ 100K ops/sec    │  │ 100K ops│││
│  └────────┬────────┘  └────────┬────────┘  └────┬────┘│
│           ↓ Replicate          ↓ Replicate      ↓     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────┐│
│  │ Replica 1       │  │ Replica 2       │  │ Replica3││
│  │ (Read-only)     │  │ (Read-only)     │  │ (R/O)  │││
│  └─────────────────┘  └─────────────────┘  └─────────┘│
└────────────────────────────────────────────────────────┘

Total Capacity:
- Write: 300K ops/sec (3 masters × 100K each) ✅ 1.5x headroom
- Read: 600K ops/sec (3 masters + 3 replicas × 100K) ✅ 6x headroom
- Storage: 48GB (3 masters × 16GB) ✅ 3x single instance
- Availability: If 1 master fails, auto-promote replica (10s downtime)

Benefits vs Single Instance:
- Scalability: 3x write throughput (300K vs 100K ops/sec)
- Availability: No single point of failure (auto-failover on crash)
- Capacity: 3x storage (48GB vs 16GB)
- Latency: Same P50 1ms (distributed hashing routes to correct shard)
```

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Sharding Strategies (How to Distribute Data)

**Hash-Based Sharding** (Consistent Hashing):

**Naive hashing** (broken when nodes added/removed):
```python
# ❌ Bad: Simple modulo hashing
def get_shard_naive(key, num_shards):
    return hash(key) % num_shards

# Problem:
# - 3 shards: hash("user:123") % 3 = 1 (shard 1)
# - Add 4th shard: hash("user:123") % 4 = 3 (shard 3, different!)
# - Result: 75% of keys moved to different shards (cache invalidation, massive churn)

# Example:
# - 1M keys cached across 3 shards
# - Add 4th shard: 750K keys (75%) need to move
# - During migration: 750K cache misses (database overload 🔥)
```

**Consistent hashing** (minimal churn when nodes added/removed):
```python
# ✅ Good: Consistent hashing (Redis Cluster uses this)
import hashlib

class ConsistentHashing:
    def __init__(self, nodes, replicas=150):
        """
        nodes: List of cache server addresses ['node1', 'node2', 'node3']
        replicas: Virtual nodes per physical node (150 = good distribution)
        """
        self.replicas = replicas
        self.ring = {}  # Hash ring: {hash_value: node_name}
        self.sorted_keys = []
        
        for node in nodes:
            self.add_node(node)
    
    def add_node(self, node):
        """Add node to hash ring (with virtual nodes for even distribution)"""
        for i in range(self.replicas):
            # Create virtual node: node1-0, node1-1, ..., node1-149
            virtual_node = f"{node}-{i}"
            hash_value = self._hash(virtual_node)
            self.ring[hash_value] = node
            self.sorted_keys.append(hash_value)
        
        self.sorted_keys.sort()
    
    def remove_node(self, node):
        """Remove node from hash ring"""
        for i in range(self.replicas):
            virtual_node = f"{node}-{i}"
            hash_value = self._hash(virtual_node)
            del self.ring[hash_value]
            self.sorted_keys.remove(hash_value)
    
    def get_node(self, key):
        """Get node for given key"""
        if not self.ring:
            return None
        
        hash_value = self._hash(key)
        
        # Find first node clockwise on ring
        for ring_hash in self.sorted_keys:
            if hash_value <= ring_hash:
                return self.ring[ring_hash]
        
        # Wrap around to first node
        return self.ring[self.sorted_keys[0]]
    
    def _hash(self, key):
        """Hash function (CRC32 for speed, MD5 for better distribution)"""
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

# Usage:
ch = ConsistentHashing(['node1', 'node2', 'node3'])

# Get node for key
node = ch.get_node('user:123')  # → 'node2'

# Add 4th node (minimal disruption)
ch.add_node('node4')
node = ch.get_node('user:123')  # → 'node2' (still same node! ✅)

# Impact analysis:
# - 3 nodes → 4 nodes: Only 25% of keys move (1M keys → 250K moved)
# - vs naive hashing: 75% keys move (1M keys → 750K moved)
# - Improvement: 3x less cache churn, 3x less database load during migration
```

**Consistent hashing benefits**:
```
Add 4th node to 3-node cluster:
┌───────────────────────────────────────────────────────┐
│                    HASH RING                          │
│    ┌───────────────────────────────────────┐          │
│    │         node1 (0°-120°)               │          │
│    │         node2 (120°-240°)             │          │
│    │         node3 (240°-360°)             │          │
│    └───────────────────────────────────────┘          │
│                       ↓ Add node4                     │
│    ┌───────────────────────────────────────┐          │
│    │         node1 (0°-90°)                │          │
│    │         node2 (90°-180°)              │          │
│    │         node3 (180°-270°)             │          │
│    │         node4 (270°-360°) ← New       │          │
│    └───────────────────────────────────────┘          │
└───────────────────────────────────────────────────────┘

Keys moved: Only keys in 270°-360° range move from node3 → node4
Percentage: 90° / 360° = 25% of keys moved (vs 75% naive hashing)

Example:
- 1M keys total
- Consistent hashing: 250K keys moved (25%)
- Naive hashing: 750K keys moved (75%)
- Cache misses during migration: 250K vs 750K (3x better)
```

---

**Range-Based Sharding** (manual partitioning):
```python
# Partition by key range (e.g., user ID)
def get_shard_by_range(user_id):
    if 0 <= user_id < 1_000_000:
        return 'shard1'  # Users 0-1M
    elif 1_000_000 <= user_id < 2_000_000:
        return 'shard2'  # Users 1M-2M
    elif 2_000_000 <= user_id < 3_000_000:
        return 'shard3'  # Users 2M-3M
    else:
        return 'shard4'  # Users 3M+

# Pros:
# - Predictable (know exactly which shard has which users)
# - Range queries efficient (all user IDs 1M-2M on same shard)

# Cons:
# - Uneven distribution (if user growth uneven, shard1 overloaded)
# - Hotspots (popular users 0-1M on shard1 = hot shard)
# - Manual rebalancing (need to move ranges when adding shards)
```

---

### 2. Redis Cluster Architecture

**Redis Cluster** (official sharding solution):

```
┌────────────────────────────────────────────────────────┐
│         REDIS CLUSTER (16,384 Hash Slots)              │
└────────────────────────────────────────────────────────┘

Hash Slot Assignment:
- Total slots: 16,384 (fixed, predetermined)
- Hash function: CRC16(key) % 16384 → slot number
- Slot distribution:
  * Master 1: Slots 0-5460 (5,461 slots, 33.3%)
  * Master 2: Slots 5461-10922 (5,462 slots, 33.3%)
  * Master 3: Slots 10923-16383 (5,461 slots, 33.3%)

Example:
key = "user:123"
slot = CRC16("user:123") % 16384 = 7890
7890 is in range [5461-10922] → Route to Master 2 ✅


Cluster Topology:
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Master 1        │      │ Master 2        │      │ Master 3        │
│ IP: 10.0.1.1    │      │ IP: 10.0.1.2    │      │ IP: 10.0.1.3    │
│ Slots: 0-5460   │      │ Slots: 5461-10922│     │ Slots: 10923-16383│
│ Role: Master    │      │ Role: Master    │      │ Role: Master    │
│ 16GB RAM        │      │ 16GB RAM        │      │ 16GB RAM        │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         ↓ Replicate (async)      ↓ Replicate             ↓ Replicate
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Replica 1       │      │ Replica 2       │      │ Replica 3       │
│ IP: 10.0.2.1    │      │ IP: 10.0.2.2    │      │ IP: 10.0.2.3    │
│ Slots: 0-5460   │      │ Slots: 5461-10922│     │ Slots: 10923-16383│
│ Role: Replica   │      │ Role: Replica   │      │ Role: Replica   │
│ 16GB RAM        │      │ 16GB RAM        │      │ 16GB RAM        │
└─────────────────┘      └─────────────────┘      └─────────────────┘


Client Routing (MOVED Redirection):
1. Client: GET user:123 (connects to Master 1)
2. Master 1: Calculate slot: CRC16("user:123") % 16384 = 7890
3. Master 1: Check ownership: Slot 7890 not owned (I own 0-5460)
4. Master 1: Return MOVED error: "MOVED 7890 10.0.1.2:6379" (redirect to Master 2)
5. Client: Reconnect to Master 2 (10.0.1.2:6379)
6. Client: GET user:123 (retry on Master 2)
7. Master 2: Slot 7890 owned (5461-10922), return value ✅

Optimization: Smart clients cache slot→node mapping (avoid MOVED redirects)
- redis-py-cluster library maintains slot map
- On MOVED error: Update cache, retry automatically
- Next request: Route directly to correct node (no redirect)
```

**Replication & Failover**:
```
Normal Operation:
Master 1 (10.0.1.1) ──replicate──→ Replica 1 (10.0.2.1)
    ↓ Write: SET user:123 "Alice"
Master 1: OK (write to master, replicate to replica)
    ↓ Async replication (<1ms lag)
Replica 1: Receives SET user:123 "Alice" (eventually consistent)


Master Failure:
1. Master 1 crashes at t=0
2. Cluster detects failure (gossip protocol, 3-5 seconds)
3. Quorum vote: Majority of masters agree Master 1 is down
4. Promote Replica 1 → Master (5 seconds)
5. Update cluster topology (Replica 1 now Master, owns slots 0-5460)
6. Notify clients (slot map updated, route to 10.0.2.1)

Downtime: ~10 seconds (during failover, writes to slots 0-5460 fail)
Impact: Writes fail for 10s, reads served by other masters (slots 5461-16383 unaffected)
Recovery: After 10s, new master operational (Replica 1 promoted)


Partition Tolerance (Split-Brain):
Problem: Network partition splits cluster into 2 groups
    Group A: Master 1, Master 2 (minority, 2/3 masters)
    Group B: Master 3, Replica 1, Replica 2 (majority, 1/3 masters + 2 replicas)

Solution: Quorum voting (majority required for failover)
- Group A: Cannot promote replicas (no quorum, 2/3 needed)
- Group B: Can promote replicas (majority, 3/5 nodes agree)
- Result: Only Group B accepts writes (Group A read-only mode)
- When partition heals: Group A syncs from Group B (consistency restored)
```

---

### 3. Memcached vs Redis Cluster

| Feature | Memcached | Redis Cluster |
|---------|-----------|---------------|
| **Sharding** | Client-side (hash ring in client library) | Server-side (automatic, 16,384 slots) |
| **Replication** | None (single copy per key) | Master-replica (async replication) |
| **Failover** | Manual (client reconnects to other nodes) | Automatic (promote replica, 10s downtime) |
| **Data structures** | Key-value only (strings) | Rich (strings, hashes, lists, sets, sorted sets) |
| **Persistence** | None (in-memory only) | Optional (RDB snapshots, AOF log) |
| **Scalability** | Excellent (add nodes, client rehashes) | Excellent (add nodes, slot migration) |
| **Consistency** | None (no replication) | Eventual (async replication, <1ms lag) |
| **Use case** | Simple key-value cache, session store | Complex data structures, pub/sub, Lua scripting |

**Memcached architecture** (client-side sharding):
```python
import memcache

# Client maintains shard list
mc = memcache.Client([
    '10.0.1.1:11211',  # Shard 1
    '10.0.1.2:11211',  # Shard 2
    '10.0.1.3:11211'   # Shard 3
], debug=0)

# Client hashes key, routes to shard
mc.set('user:123', 'Alice')  # Client: hash('user:123') → shard 2
# Internally: Connects to 10.0.1.2:11211, sends SET command

# Get value
value = mc.get('user:123')  # Client: hash('user:123') → shard 2 (same)

# Add 4th shard (client-side rehashing)
mc = memcache.Client([
    '10.0.1.1:11211',
    '10.0.1.2:11211',
    '10.0.1.3:11211',
    '10.0.1.4:11211'  # New shard
])
# Problem: hash('user:123') now maps to different shard (cache miss)
# Solution: Gradual migration, or consistent hashing in client
```

**Redis Cluster** (server-side sharding):
```python
from rediscluster import RedisCluster

# Client connects to cluster (discovers topology automatically)
rc = RedisCluster(
    startup_nodes=[
        {'host': '10.0.1.1', 'port': 6379},  # Master 1
        {'host': '10.0.1.2', 'port': 6379},  # Master 2
        {'host': '10.0.1.3', 'port': 6379}   # Master 3
    ],
    decode_responses=True
)

# Client: SET user:123 (cluster routes to correct master automatically)
rc.set('user:123', 'Alice')
# Internally:
# 1. Calculate slot: CRC16('user:123') % 16384 = 7890
# 2. Lookup slot 7890 → Master 2 (10.0.1.2)
# 3. Connect to Master 2, send SET command
# 4. Cache mapping (user:123 → Master 2) for future requests

# Get value (client routes directly, no server redirect)
value = rc.get('user:123')  # → 'Alice' (1ms, direct routing ✅)

# Add 4th master (server-side slot migration, transparent to client)
# 1. Add new master (10.0.1.4)
# 2. Redis Cluster migrates slots 10923-12000 from Master 3 → Master 4
# 3. Client receives topology update (slot map refreshed)
# 4. Next request: Client routes to correct master (transparent)
```

**Key difference**: Memcached requires client to handle sharding (hash ring logic in client library), Redis Cluster handles sharding server-side (client just connects to cluster, routing automatic).

---

## 3. Capacity Planning & Estimation (When Applicable)

### Distributed Cache Sizing

**Example: Social media app** (100M users, 1M ops/sec)

**Single Redis instance capacity**:
```
Max throughput: 100K ops/sec (single instance limit)
Max storage: 16GB RAM
Cost: $10/month (AWS ElastiCache r6g.large)

To handle 1M ops/sec:
- Need: 1M / 100K = 10 instances (minimum)
- With 2x headroom: 20 instances (handle spikes)
```

**Redis Cluster sizing**:
```
Target throughput: 1M ops/sec (read-heavy, 90% reads, 10% writes)
Read capacity: 1M × 90% = 900K reads/sec
Write capacity: 1M × 10% = 100K writes/sec

Cluster design:
- Masters: 100K writes/sec / 100K per master = 1 master (minimum)
  * With 2x headroom: 2 masters (200K writes/sec capacity)
- Replicas: 900K reads/sec / 100K per replica = 9 replicas (minimum)
  * With 2 replicas per master: 2 masters × 2 replicas = 4 replicas
  * Total read capacity: (2 masters + 4 replicas) × 100K = 600K reads/sec
  * Need more: 900K / 100K = 9 nodes total for reads
  * Final: 3 masters + 6 replicas = 9 nodes (900K reads/sec capacity ✅)

Storage:
- Hot data: 100M users × 5KB profile = 500GB
- Per master: 500GB / 3 masters = 167GB per master
- Instance size: 256GB RAM (1.5x buffer for growth)
- Instance type: r6g.2xlarge (256GB RAM, $160/month)

Total cluster:
- 3 masters × $160/month = $480/month
- 6 replicas × $160/month = $960/month
- Total: $1,440/month (handles 1M ops/sec ✅)

vs Single instance (would need 10 instances × $10 = $100/month, but NO HA, NO auto-failover)
Redis Cluster: $1,440/month (HA, auto-failover, scalable) ✅ Better
```

---

## 4. Data & Storage Design

### Data Partitioning Strategies

**Hash Tags** (co-locate related keys on same shard):

```python
# Problem: Related keys on different shards (inefficient multi-key operations)
keys = ['user:123:profile', 'user:123:posts', 'user:123:followers']

# Without hash tags:
CRC16('user:123:profile') % 16384 = 1234 → Master 1
CRC16('user:123:posts') % 16384 = 7890 → Master 2
CRC16('user:123:followers') % 16384 = 15000 → Master 3

# Multi-key operation (MGET all user:123 keys):
# - Client must query 3 different masters (3 network calls)
# - Slow: 3 × 2ms = 6ms (vs 2ms single call)


# Solution: Hash tags (force same shard for related keys)
keys = ['user:{123}:profile', 'user:{123}:posts', 'user:{123}:followers']
# Redis uses content between {} for hashing (ignores rest)

# With hash tags:
CRC16('123') % 16384 = 7890 → Master 2 (all keys on same shard ✅)

# Multi-key operation (MGET all user:123 keys):
# - Single query to Master 2 (1 network call)
# - Fast: 1 × 2ms = 2ms (3x faster ✅)

# Usage:
import redis
rc = redis.RedisCluster(startup_nodes=[...])

# Store related keys with hash tag
rc.set('user:{123}:profile', '{"name":"Alice"}')
rc.set('user:{123}:posts', '[1,2,3]')
rc.set('user:{123}:followers', '[456,789]')

# Efficient multi-get (single shard, single network call)
values = rc.mget('user:{123}:profile', 'user:{123}:posts', 'user:{123}:followers')
# → [b'{"name":"Alice"}', b'[1,2,3]', b'[456,789]'] (2ms, fast ✅)
```

**Trade-offs of hash tags**:
```
Pros:
- Multi-key operations efficient (MGET, MSET, transactions)
- Co-located data (all user data on same shard, good for related queries)

Cons:
- Hotspots (popular user's keys all on same shard = hot shard)
- Uneven distribution (if many users in same tag, shard overloaded)

Example: Celebrity user (user:celebrity:*)
- All celebrity's data on same shard (millions of followers, hot key)
- Shard overloaded: P95 latency 2ms → 50ms (slow)
- Other shards idle (uneven load distribution)

Solution:
- Use hash tags sparingly (only for small, related datasets)
- Avoid for high-traffic users (distribute across shards instead)
- Monitor shard CPU/memory (detect hotspots early)
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Cluster Scaling (Add/Remove Nodes)

**Add node to Redis Cluster**:

```bash
# Step 1: Start new Redis instance (Master 4)
redis-server --cluster-enabled yes --port 6379 --cluster-config-file nodes.conf

# Step 2: Add node to cluster
redis-cli --cluster add-node 10.0.1.4:6379 10.0.1.1:6379
# → New node added, but owns 0 slots (no data yet)

# Step 3: Rebalance slots (migrate slots from existing masters)
redis-cli --cluster rebalance 10.0.1.1:6379 --cluster-use-empty-masters
# → Migrates slots from Masters 1-3 to Master 4
# Example: Master 3 (slots 10923-16383) → Master 4 (slots 13152-16383)

# Step 4: Add replicas for new master
redis-cli --cluster add-node 10.0.2.4:6379 10.0.1.4:6379 --cluster-slave
# → Replica 4 added, replicates Master 4

# Total time: 5-10 minutes (slot migration, data transfer)
# Impact: Zero downtime (slots migrated one by one, transparent to clients)
```

**Slot migration process** (zero downtime):

```
Before migration:
Master 3 owns slots 10923-16383 (5,461 slots)
Master 4 owns 0 slots (new, empty)

Migration (slot by slot):
1. Redis Cluster: Mark slot 10923 as MIGRATING on Master 3
2. Master 3: Stop accepting new writes to slot 10923
3. Master 3: Transfer all keys in slot 10923 to Master 4 (async, 1-100 keys)
4. Master 4: Mark slot 10923 as IMPORTING
5. Master 4: Receives keys, stores in memory
6. Redis Cluster: Mark slot 10923 as owned by Master 4 (complete)
7. Clients: Receive topology update (slot 10923 now on Master 4)
8. Repeat for slots 10924-13151 (total 2,229 slots migrated)

Timeline:
- Migrate 1 slot: ~10-100ms (depends on keys in slot)
- Migrate 2,229 slots: ~5 minutes (parallel migration, multiple slots at once)
- Impact: 0 downtime (clients route to old master until migration complete)

After migration:
Master 3 owns slots 10923-13151 (2,229 slots, 40%)
Master 4 owns slots 13152-16383 (3,232 slots, 60%)
```

**Remove node from Redis Cluster**:

```bash
# Step 1: Rebalance slots (move slots from Master 4 to others)
redis-cli --cluster rebalance 10.0.1.1:6379 --cluster-weight 10.0.1.4:0
# → Migrates all slots from Master 4 to Masters 1-3 (Master 4 owns 0 slots)

# Step 2: Remove replicas first
redis-cli --cluster del-node 10.0.1.1:6379 <replica-4-node-id>

# Step 3: Remove master (must own 0 slots)
redis-cli --cluster del-node 10.0.1.1:6379 <master-4-node-id>
# → Master 4 removed from cluster ✅

# Total time: 5-10 minutes (slot migration)
# Impact: Zero downtime (slots migrated one by one)
```

---

### Handling Node Failures

**Master failure** (automatic failover):

```
Cluster: 3 masters + 3 replicas (normal operation)

Master 2 crashes at t=0:
    ↓
t=0s: Master 2 stops responding (network timeout, crash, hardware failure)
    ↓
t=3s: Cluster detects failure (gossip protocol, 3 missed pings)
    ↓
t=5s: Quorum vote (Masters 1, 3 agree Master 2 is down, 2/3 majority ✅)
    ↓
t=8s: Promote Replica 2 → Master (now owns slots 5461-10922)
    ↓
t=10s: Update cluster topology (notify clients, slot map refreshed)
    ↓
t=10s+: Cluster operational (new Master 2 accepts reads/writes ✅)

Downtime:
- Writes to slots 5461-10922: 10 seconds (failed during failover)
- Reads to slots 5461-10922: 5 seconds (served by replica after detection)
- Other slots (0-5460, 10923-16383): 0 seconds (unaffected)

Data loss:
- Async replication: Up to 1 second of writes lost (lag between master and replica)
- Example: Master 2 receives SET user:456 "Bob" at t=0
  * Replication lag: 500ms (replica receives at t=0.5s)
  * Master 2 crashes at t=0.2s (before replication completes)
  * Result: SET user:456 "Bob" lost (not replicated to replica)
- Mitigation: Use WAIT command (synchronous replication, wait for N replicas)
```

**Replica failure** (no failover, read capacity reduced):

```
Replica 2 crashes at t=0:
    ↓
t=3s: Cluster detects failure (replica offline)
    ↓
Impact:
- Master 2 continues serving writes (no impact ✅)
- Read capacity reduced: (3 masters + 2 replicas) × 100K = 500K reads/sec
  * vs normal: (3 masters + 3 replicas) × 100K = 600K reads/sec
  * Reduction: 100K reads/sec (16% capacity loss)
- If read load >500K QPS: P95 latency increases (overload)

Recovery:
- Manually start new replica (or auto-recovery if using orchestration)
- New replica syncs from Master 2 (full resync, 1-5 minutes)
- After sync: Read capacity restored (600K reads/sec ✅)
```

**Network partition** (split-brain scenario):

```
Cluster: 3 masters + 3 replicas (6 nodes total)

Network partition splits cluster:
    Group A: Master 1, Master 2 (2 masters, minority)
    Group B: Master 3, Replica 1, Replica 2, Replica 3 (1 master + 3 replicas, majority)

Quorum voting:
- Group A: 2/3 masters (no quorum, cannot promote replicas) → READ-ONLY MODE
- Group B: 1/3 masters + 3 replicas (majority, 4/6 nodes) → ACTIVE (accepts writes ✅)

Result:
- Group A: Rejects writes (quorum lost, prevent split-brain)
- Group B: Accepts writes (majority, consistent)

When partition heals (network restored):
- Group A syncs from Group B (catch up on missed writes)
- Cluster converges to consistent state (Group B data wins)
- Result: No data loss (only Group B accepted writes, Group A read-only)
```

---

## 6. Security, APIs & Governance

### Cluster Security

```yaml
# Redis Cluster security config
redis_cluster:
  # 1. Authentication (require password)
  requirepass: "strong-password-here"
  masterauth: "strong-password-here"  # Replicas authenticate to master
  
  # 2. TLS encryption (in-transit encryption)
  tls_enabled: yes
  tls_cert_file: /etc/redis/redis.crt
  tls_key_file: /etc/redis/redis.key
  tls_ca_cert_file: /etc/redis/ca.crt
  
  # 3. Network isolation (private subnet)
  bind: 10.0.1.1  # Only listen on private IP (no public access)
  protected_mode: yes  # Reject connections from non-whitelisted IPs
  
  # 4. ACL (Access Control Lists, Redis 6+)
  acl:
    - user: app_readonly
      password: "readonly-password"
      commands: [GET, MGET, HGETALL]  # Read-only commands
    
    - user: app_readwrite
      password: "readwrite-password"
      commands: [GET, SET, HSET, DEL, EXPIRE]  # Read-write commands
    
    - user: admin
      password: "admin-password"
      commands: ["*"]  # All commands (including FLUSHALL, CONFIG)
```

**Client authentication**:
```python
from rediscluster import RedisCluster

# Connect to Redis Cluster with TLS and authentication
rc = RedisCluster(
    startup_nodes=[
        {'host': '10.0.1.1', 'port': 6379},
        {'host': '10.0.1.2', 'port': 6379},
        {'host': '10.0.1.3', 'port': 6379}
    ],
    decode_responses=True,
    password='strong-password-here',  # Authenticate with password
    ssl=True,  # Enable TLS (encrypt in transit)
    ssl_cert_reqs='required',
    ssl_ca_certs='/etc/redis/ca.crt'
)

# Use authenticated connection
rc.set('user:123', 'Alice')  # Authenticated request ✅
```

---

## 7. Real-World Examples & Case Studies

### Instagram: Distributed Memcached

**Problem**: 1B+ users, 100M+ posts/day. Single Memcached instance insufficient (100K ops/sec limit). Need distributed caching (10M+ ops/sec).

**Architecture**:

```
Instagram Distributed Memcached Cluster:
┌────────────────────────────────────────────────────────┐
│  1,000 Memcached instances (client-side sharding)      │
│  - 1,000 instances × 100K ops/sec = 100M ops/sec total │
│  - Consistent hashing (minimal churn on node add/remove)│
│  - 1,000 instances × 64GB RAM = 64TB cache capacity    │
└────────────────────────────────────────────────────────┘

Client-side consistent hashing:
from pymemcache.client.hash import HashClient

# List of 1,000 Memcached servers
servers = [
    '10.0.1.1:11211',
    '10.0.1.2:11211',
    # ... 1,000 servers
]

client = HashClient(servers, use_pooling=True)

# Client hashes key, routes to correct server
client.set('user:123:profile', '{"name":"Alice"}')
# Internally: Consistent hash('user:123:profile') → server 456

# Get value (client routes to same server)
value = client.get('user:123:profile')  # → '{"name":"Alice"}'

Data cached:
- User profiles: 1B users × 5KB = 5TB
- Posts: 100M posts × 10KB = 1TB
- Followers: 1B users × 1KB = 1TB
- Total: 7TB (fits in 64TB capacity ✅)

Scaling:
- Add 100 servers (1,000 → 1,100, 10% increase)
- Consistent hashing: Only 10% keys rehash (7TB × 10% = 700GB moved)
- Migration: Gradual (700GB / 100 servers = 7GB per server, 5-10 minutes)
- Impact: 10% cache miss during migration (acceptable)
```

**Outcome**:
- Throughput: 100M ops/sec (1,000× single instance)
- Latency: P50 = 1ms, P95 = 5ms, P99 = 20ms (acceptable)
- Availability: 99.9% (if 1 server fails, only 0.1% keys affected, 999/1000 servers healthy)

---

### Twitter: Redis Cluster (Timeline Cache)

**Problem**: 400M+ users, 500M+ tweets/day. User timeline query expensive (join 10+ tables, 500ms). Need distributed caching (5M+ ops/sec).

**Architecture**:

```
Twitter Redis Cluster:
┌────────────────────────────────────────────────────────┐
│  50 masters + 100 replicas (150 nodes total)           │
│  - 50 masters × 100K writes/sec = 5M writes/sec total  │
│  - 150 nodes × 100K reads/sec = 15M reads/sec total    │
│  - 50 masters × 256GB RAM = 12.8TB cache capacity      │
└────────────────────────────────────────────────────────┘

Data cached:
- User timelines: 400M users × 20KB (50 tweets) = 8TB
- Tweet metadata: 500M tweets × 5KB = 2.5TB
- Total: 10.5TB (fits in 12.8TB capacity ✅)

Sharding:
- Hash slots: 16,384 (Redis Cluster default)
- Slots per master: 16,384 / 50 = 328 slots per master
- Key distribution: CRC16(key) % 16384 → slot → master

Example:
key = "timeline:user:123"
slot = CRC16("timeline:user:123") % 16384 = 7890
7890 / 328 = Master 24 (routes to Master 24 ✅)

Replication:
- 2 replicas per master (2× redundancy)
- Async replication (<1ms lag, acceptable for timelines)
- Auto-failover: If master fails, promote replica (10s downtime)

Scaling (add 10 masters):
- New cluster: 60 masters + 120 replicas (180 nodes)
- Slot rebalance: 16,384 / 60 = 273 slots per master
  * Migrate slots from old masters (328 → 273 = 55 slots per master)
  * Total slots migrated: 50 masters × 55 = 2,750 slots
- Migration time: 2,750 slots × 100ms per slot = 275 seconds (4.5 minutes)
- Impact: 0 downtime (slots migrated one by one, transparent)
```

**Outcome**:
- Timeline load time: 500ms (database) → 5ms (Redis Cluster) = **100x faster**
- Cache hit ratio: 99% (99% timelines served from cache, 1% database fallback)
- Availability: 99.99% (auto-failover on master failure, 10s downtime)
- Cost: $15K/month (150 nodes × $100) vs $150K/month (database scaling to handle 5M QPS without cache) = **10x cheaper**

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Explain distributed caching and how it scales."

**Structured Answer**:

**"Distributed caching spreads cache data across multiple nodes (servers) to achieve horizontal scalability, high availability, and fault tolerance beyond single-instance limits. Single Redis instance limited to 100K ops/sec, 16GB RAM; distributed cluster scales to millions ops/sec, terabytes capacity by adding nodes. Two main strategies: (1) Client-side sharding (Memcached: client hashes key, routes to node, simple but manual failover), (2) Server-side sharding (Redis Cluster: 16,384 hash slots distributed across masters, automatic failover replica→master 10s downtime, transparent to client). Consistent hashing minimizes churn when adding nodes (25% keys move vs 75% naive hashing = 3x less cache misses during migration). Real-world: Instagram uses 1,000 Memcached instances (client-side sharding, 100M ops/sec, 64TB capacity, add 100 servers only 10% keys rehash), Twitter uses 50 Redis masters + 100 replicas (server-side sharding, 5M writes/sec 15M reads/sec, 12.8TB capacity, auto-failover 99.99% availability, timeline 500ms→5ms = 100x faster). Choose client-side for simplicity (Memcached, session store, simple key-value), server-side for HA/automatic failover (Redis Cluster, complex data structures, pub/sub)."**

**Key Concepts**:

```
┌────────────────────────────────────────────────────────┐
│ SINGLE INSTANCE vs DISTRIBUTED CLUSTER                │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Single Redis Instance:                                │
│ - Throughput: 100K ops/sec (hard limit)               │
│ - Storage: 16GB RAM (limited capacity)                │
│ - Availability: Single point of failure (SPOF)        │
│ - Failover: Manual (promote replica, 30-60s downtime) │
│ - Cost: $10/month (cheap, but no HA)                  │
│                                                        │
│ Distributed Redis Cluster (3 masters + 3 replicas):   │
│ - Throughput: 300K writes/sec, 600K reads/sec         │
│ - Storage: 48GB RAM (3× single instance)              │
│ - Availability: Auto-failover (10s downtime, 99.99%)  │
│ - Failover: Automatic (promote replica, transparent)  │
│ - Cost: $1,440/month (expensive, but HA + scalable)   │
│                                                        │
│ When to use distributed:                              │
│ ✅ Throughput >100K ops/sec (need horizontal scale)   │
│ ✅ Storage >16GB (need more capacity)                 │
│ ✅ High availability required (auto-failover critical)│
│ ✅ Read-heavy workload (replicas increase read capacity)│
│                                                        │
│ When single instance OK:                              │
│ ⚠️ Low traffic <50K ops/sec (single instance enough)  │
│ ⚠️ Small dataset <10GB (fits in single instance)      │
│ ⚠️ Development/staging (HA not critical)              │
└────────────────────────────────────────────────────────┘
```

**Sharding Strategies**:

| Strategy | How It Works | Pros | Cons | Use Case |
|----------|--------------|------|------|----------|
| **Client-side (Memcached)** | Client hashes key, routes to node | Simple, flexible, cheap | Manual failover, no replication | Session store, simple cache |
| **Server-side (Redis Cluster)** | Server manages shards (16,384 slots) | Auto-failover, replication, transparent | Complex setup, more expensive | Timeline cache, user profiles |
| **Consistent hashing** | Hash ring, minimal churn on node add/remove | 25% keys move (vs 75% naive) | Slightly more complex | Both (minimize cache misses during migration) |

**Scaling Example** (add node to 3-node cluster):

```
Before (3 nodes):
- Node 1: Slots 0-5460 (33.3%, 5.3GB data)
- Node 2: Slots 5461-10922 (33.3%, 5.3GB data)
- Node 3: Slots 10923-16383 (33.3%, 5.3GB data)
Total: 16GB data, 300K ops/sec capacity

After (4 nodes):
- Node 1: Slots 0-4095 (25%, 4GB data) ← Migrate 1.3GB to Node 4
- Node 2: Slots 4096-8191 (25%, 4GB data) ← Migrate 1.3GB to Node 4
- Node 3: Slots 8192-12287 (25%, 4GB data) ← Migrate 1.3GB to Node 4
- Node 4: Slots 12288-16383 (25%, 4GB data) ← New node (receives 4GB)
Total: 16GB data (same), 400K ops/sec capacity (33% increase ✅)

Migration:
- Time: 4GB / 100MB/sec = 40 seconds (data transfer)
- Impact: 25% cache misses during migration (keys moved to Node 4)
- Downtime: 0 seconds (slots migrated one by one, transparent)
```

**Real-world: Twitter timeline cache uses Redis Cluster (50 masters + 100 replicas, 5M writes/sec 15M reads/sec, 12.8TB capacity, auto-failover 10s downtime 99.99% availability). Timeline query 500ms (database join 10+ tables) → 5ms (Redis Cluster) = 100x faster, 99% cache hit ratio (only 1% queries hit database = 100x database load reduction). Scaling example: Add 10 masters (50→60), slot rebalance migrates 2,750 slots in 4.5 minutes, 0 downtime (transparent to clients), 20% capacity increase (5M→6M writes/sec). Cost: $15K/month Redis Cluster vs $150K/month database scaling to handle 5M QPS without cache = 10x cheaper."**

---

### Follow-Up 1: "What are the trade-offs of consistent hashing?"

**Answer**:

**"Consistent hashing minimizes key redistribution when nodes added/removed (25% keys move vs 75% naive modulo hashing = 3x less cache churn), but trades perfect uniformity for stability. Pros: (1) Minimal disruption (add 4th node to 3-node cluster only 25% keys move), (2) Gradual migration (keys move incrementally, not all at once), (3) Fault tolerance (node failure affects only neighboring keys, 33% of data vs 100%). Cons: (1) Uneven distribution (without virtual nodes, keys may cluster on few nodes = hotspots), (2) Complexity (client must maintain hash ring, handle node add/remove), (3) Virtual nodes overhead (150 virtual nodes per physical node = good distribution but more memory for ring structure). Mitigate with virtual nodes (150 replicas per node = even distribution, standard in most implementations like HashRing library). Alternative: Redis Cluster uses 16,384 pre-determined slots (not consistent hashing) = perfect uniformity but slot migration required when scaling."**

**Consistent Hashing Breakdown**:

```
┌────────────────────────────────────────────────────────┐
│ NAIVE HASHING vs CONSISTENT HASHING                    │
└────────────────────────────────────────────────────────┘

NAIVE MODULO HASHING:
hash(key) % num_nodes → node_id

Example (3 nodes):
- key="user:123": hash("user:123") % 3 = 1 → Node 1
- key="user:456": hash("user:456") % 3 = 2 → Node 2
- key="user:789": hash("user:789") % 3 = 0 → Node 0

Add 4th node (3 → 4 nodes):
- key="user:123": hash("user:123") % 4 = 3 → Node 3 (moved! ❌)
- key="user:456": hash("user:456") % 4 = 0 → Node 0 (moved! ❌)
- key="user:789": hash("user:789") % 4 = 1 → Node 1 (moved! ❌)

Result: 75% keys moved (3/4 keys changed node)
Impact: 750K cache misses (1M keys × 75% = massive churn 🔥)


CONSISTENT HASHING:
Hash ring (0° to 360°), nodes placed on ring at hash(node_id)

Example (3 nodes):
- Node 0: 0° (hash("node0"))
- Node 1: 120° (hash("node1"))
- Node 2: 240° (hash("node2"))

Key placement (clockwise to next node):
- key="user:123": hash("user:123") = 45° → Node 1 (next clockwise)
- key="user:456": hash("user:456") = 150° → Node 2
- key="user:789": hash("user:789") = 300° → Node 0

Add 4th node (3 → 4 nodes):
- Node 3: 180° (hash("node3"))

Key placement after adding Node 3:
- key="user:123": 45° → Node 1 (same! ✅)
- key="user:456": 150° → Node 3 (moved! new node between 120° and 240°)
- key="user:789": 300° → Node 0 (same! ✅)

Result: 25% keys moved (1/4 keys changed node, only keys in 120°-180° range)
Impact: 250K cache misses (1M keys × 25% = 3x less churn ✅)
```

**Virtual Nodes** (solve uneven distribution):

```
Problem: Without virtual nodes, keys cluster on few nodes (hotspots)

Example (3 physical nodes, no virtual nodes):
- Node 0: 0° (owns 0°-120° = 120° range, 33.3% of keys)
- Node 1: 120° (owns 120°-240° = 120° range, 33.3% of keys)
- Node 2: 240° (owns 240°-360° = 120° range, 33.3% of keys)

Looks even, but:
- If hash(Node 0) = 10°, hash(Node 1) = 20°, hash(Node 2) = 300°:
  * Node 0: 10°-20° = 10° range (2.8% of keys) ← Underutilized ⚠️
  * Node 1: 20°-300° = 280° range (77.8% of keys) ← Overloaded 🔥
  * Node 2: 300°-10° = 70° range (19.4% of keys) ← Underutilized ⚠️

Solution: Virtual nodes (replicate each physical node multiple times on ring)

Example (3 physical nodes, 150 virtual nodes each = 450 virtual nodes total):
- Node 0: node0-0 (10°), node0-1 (45°), node0-2 (78°), ..., node0-149 (350°)
- Node 1: node1-0 (15°), node1-1 (52°), node1-2 (91°), ..., node1-149 (355°)
- Node 2: node2-0 (7°), node2-1 (39°), node2-2 (88°), ..., node2-149 (358°)

Result: Each physical node owns ~150 small ranges (evenly distributed)
- Node 0: 33.2% of keys (close to ideal 33.3% ✅)
- Node 1: 33.4% of keys (close to ideal 33.3% ✅)
- Node 2: 33.4% of keys (close to ideal 33.3% ✅)

Trade-off: More memory (450 virtual nodes vs 3 physical nodes in hash ring)
- Memory overhead: 450 × 64 bytes (hash + pointer) = 28.8KB (negligible)
```

**Real-world: Cassandra uses 256 virtual nodes per physical node (vnodes) for even distribution. Dynamo uses consistent hashing with 100-200 virtual nodes per node. Memcached client libraries (python-memcached, pylibmc) use 150 virtual nodes by default (good balance between distribution and overhead). Instagram uses consistent hashing for 1,000 Memcached instances (add 100 servers only 10% keys move vs 50% without consistent hashing = 5x less cache misses during scaling)."**

---

### Follow-Up 2: "How do you handle hotspots in a distributed cache?"

**Answer**:

**"Hotspots occur when popular keys concentrated on single shard (e.g., celebrity user profile cached on one node, millions of requests hit that node = overloaded). Detect with monitoring (per-shard CPU/QPS metrics, if >2× average = hotspot). Mitigate: (1) Replicate hot keys across multiple shards (read from random replica, distribute load), (2) Local cache hot keys in application memory (avoid network call to Redis, 0ms latency), (3) Shard by secondary attribute (e.g., shard celebrity posts by post_id not user_id, distribute across shards), (4) Rate limiting (throttle requests to hot keys, prevent overload). Example: Facebook caches celebrity profiles in local memory (application-level cache, 0ms latency, bypass Redis), falling back to Redis only if local cache expired. Real-world: Twitter hotspot issue during World Cup (trending hashtag #WorldCup cached on single shard, 1M QPS overwhelmed that shard P95 latency 2ms→500ms). Fix: Replicate #WorldCup timeline to 10 shards (100K QPS each), clients randomly select replica (distribute load), P95 latency back to 5ms."**

**Hotspot Detection**:

```python
# Monitor per-shard metrics (detect hotspots)
def monitor_shard_metrics():
    shards = ['master1', 'master2', 'master3']
    for shard in shards:
        metrics = redis_monitor.get_metrics(shard)
        
        print(f"Shard: {shard}")
        print(f"  QPS: {metrics['qps']}")  # Queries per second
        print(f"  CPU: {metrics['cpu']}%")  # CPU utilization
        print(f"  Memory: {metrics['memory']}%")  # Memory usage
        print(f"  P95 latency: {metrics['p95_latency']}ms")

# Example output (hotspot detected):
# Shard: master1
#   QPS: 50K  # Normal (expected ~33K QPS per shard for 100K total)
#   CPU: 40%
#   Memory: 50%
#   P95 latency: 5ms
#
# Shard: master2
#   QPS: 200K  # Hotspot! 🔥 (4× normal)
#   CPU: 95%  # Overloaded
#   Memory: 60%
#   P95 latency: 50ms  # 10× slower (congestion)
#
# Shard: master3
#   QPS: 50K  # Normal
#   CPU: 42%
#   Memory: 48%
#   P95 latency: 5ms

# Alert: Shard master2 hotspot detected (QPS 200K, 4× average)
```

**Mitigation Strategies**:

**1. Replicate Hot Keys** (distribute reads):

```python
# Problem: Celebrity user:celebrity:profile on single shard (master2)
# - 1M reads/sec → master2 overloaded 🔥

# Solution: Replicate hot key to multiple shards
def replicate_hot_key(key, value, num_replicas=10):
    """Replicate hot key to N shards (distribute reads)"""
    for i in range(num_replicas):
        replica_key = f"{key}:replica:{i}"
        # Store on different shard (hash tag forces different shard)
        shard_id = i % 3  # 3 shards total
        redis_cluster.set(replica_key, value)  # Routes to shard i % 3

# Write to hot key (update all replicas)
def update_hot_key(key, value):
    # Update original
    redis_cluster.set(key, value)
    
    # Update all replicas
    for i in range(10):
        replica_key = f"{key}:replica:{i}"
        redis_cluster.set(replica_key, value)

# Read from hot key (random replica, distribute load)
def read_hot_key(key):
    import random
    replica_id = random.randint(0, 9)  # Random replica (0-9)
    replica_key = f"{key}:replica:{replica_id}"
    return redis_cluster.get(replica_key)

# Result:
# - 1M reads/sec distributed across 10 replicas = 100K reads/sec per replica ✅
# - No single shard overloaded (load balanced)
# - Trade-off: Write amplification (1 write → 10 writes to replicas, 10× write cost)
```

**2. Local Cache** (application-level caching):

```python
# Cache hot keys in application memory (avoid Redis network call)
from cachetools import TTLCache
import time

# Local in-memory cache (per application server)
local_cache = TTLCache(maxsize=1000, ttl=60)  # 1000 keys, 60s TTL

def get_with_local_cache(key):
    """Get from local cache first, fallback to Redis"""
    # Check local cache (0ms, no network call)
    if key in local_cache:
        print(f"✅ Local cache hit: {key} (0ms)")
        return local_cache[key]
    
    # Local cache miss: Fetch from Redis (2ms network call)
    value = redis_cluster.get(key)
    
    # Populate local cache (for next request)
    local_cache[key] = value
    print(f"❌ Local cache miss, fetched from Redis: {key} (2ms)")
    
    return value

# Usage:
# - First request: Local cache miss, Redis fetch (2ms)
# - Next 1000 requests (60 seconds): Local cache hit (0ms) ← Fast! ✅
# - After 60s: TTL expires, refetch from Redis (2ms)

# Benefits:
# - 0ms latency (no network call)
# - Reduce Redis load (1,000 requests served from local cache, only 1 Redis call)
# - Trade-off: Stale data (up to 60s old, acceptable for hot keys like celebrity profiles)
```

**3. Shard by Secondary Attribute** (distribute popular user's data):

```python
# Problem: Celebrity user:celebrity:* all on same shard (hotspot)
# - user:celebrity:profile
# - user:celebrity:posts
# - user:celebrity:followers
# All hash to same shard (using hash tag {celebrity})

# Solution: Shard posts by post_id (not user_id)
# - user:celebrity:profile → Shard 1 (user-based)
# - post:12345:content → Shard 2 (post-based, different shard ✅)
# - post:67890:content → Shard 3 (post-based, different shard ✅)

def get_user_posts(user_id):
    """Get user posts (distributed across shards by post_id)"""
    # Get post IDs for user (lightweight, cached separately)
    post_ids = redis_cluster.lrange(f"user:{user_id}:post_ids", 0, 50)
    
    # Fetch post content (each post on different shard)
    posts = []
    for post_id in post_ids:
        post = redis_cluster.get(f"post:{post_id}:content")  # Sharded by post_id
        posts.append(post)
    
    return posts

# Result:
# - Celebrity's 1M posts distributed across 3 shards (333K posts per shard)
# - No single shard overloaded (load balanced ✅)
# - Trade-off: Multiple Redis calls (1 call per post, 50 posts = 50 calls, but parallelizable)
```

**4. Rate Limiting** (throttle hot keys):

```python
from ratelimit import limits, sleep_and_retry

@sleep_and_retry
@limits(calls=100, period=1)  # Max 100 requests/second per key
def get_with_rate_limit(key):
    """Rate limit access to hot keys (prevent overload)"""
    return redis_cluster.get(key)

# Usage:
# - Request 1-100: Served (100 QPS allowed)
# - Request 101: Blocked for 1 second (wait for rate limit reset)
# - Result: Hot key limited to 100 QPS (prevent overload)

# Trade-off: Increased latency for >100 requests/sec (users wait)
```

**Real-world: Facebook celebrity profile hotspot. Lady Gaga profile cached on single shard, 5M fans refresh profile simultaneously (5M QPS → one shard 🔥). Fix: (1) Replicate profile to 50 shards (100K QPS each), (2) Local cache in application servers (60s TTL, 0ms latency), (3) CDN cache profile HTML (5 min TTL, 20ms edge latency). Result: Shard load 5M QPS → 100K QPS (50x reduction), P95 latency 500ms → 2ms (250x faster). Twitter World Cup trending hashtag similar issue: #WorldCup timeline on single shard (1M QPS), fixed with replication (10 shards, 100K QPS each), P95 latency 500ms → 5ms (100x faster)."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Distributed Cache Request Flow

```
┌────────────────────────────────────────────────────────┐
│         REDIS CLUSTER REQUEST FLOW (3 Masters)         │
└────────────────────────────────────────────────────────┘

Client Request: GET user:12345:profile
         ↓
[Step 1: Calculate Hash Slot]
    CRC16("user:12345:profile") % 16384 = 7890
    Slot 7890 → Master 2 (owns slots 5461-10922)
         ↓
[Step 2: Route to Master 2]
    Client: Connect to Master 2 (10.0.1.2:6379)
    Client: Send GET user:12345:profile
         ↓
┌─────────────────────────────────────────┐
│  Master 2 (10.0.1.2)                    │
│  - Check if owns slot 7890 ✅          │
│  - Lookup key in memory (1ms)           │
│  - Return value to client               │
└─────────────────────────────────────────┘
         ↓
[Step 3: Return to Client]
    Client receives: '{"name":"Alice","email":"alice@example.com"}'
    Latency: 2ms (network + lookup)


CACHE MISS (Key Not in Master 2):
Client Request: GET user:99999:profile
         ↓
[Step 1: Calculate Hash Slot]
    CRC16("user:99999:profile") % 16384 = 7890
    Slot 7890 → Master 2
         ↓
[Step 2: Route to Master 2]
    Master 2: Key not found (cache miss ❌)
         ↓
[Step 3: Fallback to Database]
    Client: Query database (30ms)
    Client: Populate cache (SET user:99999:profile, TTL 300s)
    Master 2: Store key (slot 7890)
         ↓
[Step 4: Return to Client]
    Client receives: '{"name":"Bob",...}' (32ms total)
    Next request: Cache hit (2ms) ✅


MASTER FAILURE (Auto-Failover):
Master 2 crashes at t=0
         ↓
[t=3s: Cluster Detects Failure]
    Gossip protocol: Masters 1, 3 ping Master 2 (3 missed pings)
    Cluster: Master 2 DOWN ❌
         ↓
[t=5s: Quorum Vote]
    Masters 1, 3 agree: Master 2 is down (2/3 majority ✅)
    Decision: Promote Replica 2 → Master
         ↓
[t=8s: Promote Replica 2]
    Replica 2: Promoted to Master (now owns slots 5461-10922)
    Cluster topology updated (Replica 2 is new Master 2)
         ↓
[t=10s: Notify Clients]
    Cluster: Broadcast topology update
    Clients: Update slot map (slot 7890 → new Master 2 at 10.0.2.2)
         ↓
[t=10s+: Cluster Operational]
    Client Request: GET user:12345:profile
    Client: Route to new Master 2 (10.0.2.2)
    Master 2: Return value ✅ (cluster recovered)

Downtime: 10 seconds (writes failed during failover)
Data loss: Up to 1 second of writes (async replication lag)
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Distributed Caching Matters

**Impact**:
- Scalability: 3x-100x throughput (300K vs 100K ops/sec single instance)
- Availability: 99.99% uptime (auto-failover 10s downtime vs manual 30-60s)
- Capacity: 3x-100x storage (48GB-64TB vs 16GB single instance)
- Cost-effective: $1,440/month (Redis Cluster) vs $15K/month (database scaling) = 10x cheaper

**Common Use Cases**:
- High-traffic caching (>100K ops/sec): User profiles, session data, product catalog
- Multi-region applications: Geo-distributed cache (reduce latency globally)
- Real-time applications: Timeline caching, messaging, notifications

### Key Strategies

**1. Choose Sharding Strategy**:
```
Client-side (Memcached): Simple, flexible, manual failover (good for session store)
Server-side (Redis Cluster): Auto-failover, replication, transparent (good for mission-critical)
Consistent hashing: Minimize churn (add node: 25% keys move vs 75% naive hashing)
```

**2. Design for Fault Tolerance**:
```
Master-replica: 2-3 replicas per master (auto-failover 10s downtime)
Quorum voting: Majority required for failover (prevent split-brain)
Async replication: <1ms lag (acceptable for most use cases, use WAIT for sync replication if needed)
```

**3. Handle Hotspots**:
```
Replicate hot keys: Distribute reads across multiple shards (celebrity profile on 10 shards)
Local cache: Application-level caching (0ms latency, bypass Redis for hot keys)
Shard by secondary attribute: Distribute celebrity posts by post_id (not user_id)
```

**4. Scale Horizontally**:
```
Add nodes: Slot migration (zero downtime, 4-10 minutes per node)
Remove nodes: Rebalance slots (move to remaining nodes)
Monitor: Per-shard CPU/QPS (detect hotspots early, >2× average = hotspot)
```

### Production Checklist

- [ ] **Choose architecture**: Client-side sharding (Memcached, simple) vs server-side (Redis Cluster, HA)
- [ ] **Size cluster**: Calculate throughput (target QPS / 100K per node), storage (dataset size / 16GB per node), add 2x headroom
- [ ] **Configure replication**: 2-3 replicas per master (read capacity + auto-failover)
- [ ] **Enable security**: Authentication (Redis AUTH), TLS (in-transit encryption), ACL (access control)
- [ ] **Monitor metrics**: Per-shard QPS, CPU, memory, P95 latency (detect hotspots)
- [ ] **Handle failures**: Auto-failover (Redis Sentinel/Cluster), quorum voting (prevent split-brain)
- [ ] **Optimize hotspots**: Replicate hot keys, local cache, shard by secondary attribute
- [ ] **Plan scaling**: Add nodes (slot migration 4-10 min), remove nodes (rebalance slots)
- [ ] **Test failover**: Kill master (verify auto-failover <10s downtime), network partition (verify quorum voting)
- [ ] **Backup data**: RDB snapshots (hourly), AOF log (every second), test restore

### Bottom Line

**Distributed caching is critical for systems exceeding single-instance limits (>100K ops/sec, >16GB storage) by spreading cache data across multiple nodes for horizontal scalability, high availability, and fault tolerance. For FAANG interviews: Explain two main strategies: (1) Client-side sharding (Memcached: client hashes key, routes to node using consistent hashing minimizes churn when nodes added 25% keys move vs 75% naive, simple but manual failover, good for session store), (2) Server-side sharding (Redis Cluster: 16,384 hash slots distributed across masters, automatic failover replica→master 10s downtime transparent to client, complex but HA, good for mission-critical). Consistent hashing critical for minimal disruption (add 4th node to 3-node cluster only 25% keys rehash vs 75% naive modulo = 3x less cache misses during migration), uses virtual nodes (150 replicas per physical node) for even distribution (prevent hotspots 77.8% keys on one node). Real-world examples: Instagram 1,000 Memcached instances (client-side sharding, 100M ops/sec 1,000× single instance, 64TB capacity, add 100 servers only 10% keys rehash minimal churn), Twitter 50 Redis masters + 100 replicas (server-side sharding, 5M writes/sec 15M reads/sec, 12.8TB capacity, auto-failover 99.99% availability, timeline 500ms database → 5ms cache = 100x faster, add 10 masters migrates 2,750 slots in 4.5 min 0 downtime). Handle hotspots (celebrity profile on single shard 5M QPS overload) with: (1) Replicate hot keys to multiple shards (distribute 5M QPS across 50 shards = 100K QPS each manageable), (2) Local cache in application memory (0ms latency 60s TTL bypass Redis), (3) Shard by secondary attribute (celebrity posts by post_id not user_id distribute across shards), (4) Rate limiting (throttle to 100 QPS prevent overload). Scaling: Add nodes with slot migration (zero downtime transparent to clients, 25% keys move to new node 4-10 min data transfer), remove nodes rebalance slots to remaining nodes. Monitor per-shard metrics (CPU, QPS, P95 latency), detect hotspots (>2× average QPS = hotspot), alert and mitigate. Failover: Master crashes, cluster detects 3s (gossip protocol 3 missed pings), quorum vote 5s (2/3 masters agree), promote replica 8s, notify clients 10s (update slot map), total downtime 10s (acceptable), data loss up to 1s (async replication lag, use WAIT command for sync replication if zero data loss required). Cost: Redis Cluster $1,440/month (9 nodes × $160) vs database scaling $15K/month (handle 5M QPS without cache) = 10x cheaper. Critical for scale: Distributed caching enables horizontal scaling (add nodes linearly increase capacity, vs vertical scaling single instance limited by hardware), high availability (auto-failover no single point of failure), fault tolerance (replica promoted on master failure transparent to clients).**

