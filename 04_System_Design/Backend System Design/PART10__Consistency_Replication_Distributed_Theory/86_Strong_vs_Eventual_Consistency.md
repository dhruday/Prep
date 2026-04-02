# 86. Strong vs Eventual Consistency

## 📌 Overview

**Strong consistency** and **eventual consistency** represent the two ends of the consistency spectrum. This is one of the most fundamental trade-offs in distributed systems design.

---

## 🎯 The Core Trade-off

```
┌─────────────────────────────────────────────────────┐
│         CONSISTENCY vs AVAILABILITY                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Strong Consistency                                 │
│  ✓ Always correct data                             │
│  ✗ Lower availability                              │
│  ✗ Higher latency                                  │
│  ✗ Limited by network                              │
│                                                     │
│  Eventual Consistency                               │
│  ✓ High availability                               │
│  ✓ Low latency                                     │
│  ✓ Partition tolerant                             │
│  ✗ Temporary stale data                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔒 Strong Consistency

### Definition
**Every read receives the most recent write or an error.** No stale data, ever.

### Characteristics
```
Time →
Write(X=100) ────[commit]────→
                      ↓
Read(X) must return 100 ✓
Read(X) must return 100 ✓
Read(X) must return 100 ✓

All reads see the latest write immediately
```

### Implementation Patterns

#### 1️⃣ **Synchronous Replication**
```python
def write_strong_consistency(key, value, replicas):
    """
    Write to all replicas synchronously before ACK
    """
    futures = []
    
    # Write to ALL replicas
    for replica in replicas:
        future = replica.write_async(key, value)
        futures.append(future)
    
    # Wait for ALL to complete
    results = wait_all(futures, timeout=5000)
    
    if all(r.success for r in results):
        return {"status": "success"}
    else:
        # Rollback on failure
        for replica in replicas:
            replica.rollback(key)
        raise WriteFailedException("Quorum not reached")

# Usage
write_strong_consistency('balance', 1000, [db1, db2, db3])
# Returns only after ALL 3 writes succeed
```

**Latency**: 50-200ms (limited by slowest replica)
**Availability**: If any replica down → writes fail

#### 2️⃣ **Quorum Writes (W > N/2)**
```python
def write_with_quorum(key, value, replicas, W=2, N=3):
    """
    Write succeeds if W replicas ACK (W > N/2)
    """
    futures = [r.write_async(key, value) for r in replicas]
    
    # Wait for W successes
    successes = 0
    for future in futures:
        try:
            result = future.get(timeout=1000)
            if result.success:
                successes += 1
                if successes >= W:
                    return {"status": "success"}
        except TimeoutError:
            continue
    
    raise QuorumNotReachedException(f"Only {successes}/{W} succeeded")

# Quorum read
def read_with_quorum(key, replicas, R=2, N=3):
    """
    Read from R replicas, return latest version
    """
    futures = [r.read_async(key) for r in replicas]
    
    values = []
    for future in futures[:R]:  # Wait for R responses
        value, version = future.get(timeout=1000)
        values.append((value, version))
    
    # Return value with highest version (latest)
    return max(values, key=lambda x: x[1])[0]

# Strong consistency: R + W > N
# Example: N=3, R=2, W=2 → 2+2 > 3 ✓
```

**Latency**: 20-100ms (faster than sync to ALL)
**Availability**: Tolerates N-W failures

#### 3️⃣ **Two-Phase Commit (2PC)**
```python
class TwoPhaseCommit:
    """
    Coordinator ensures all-or-nothing across replicas
    """
    def __init__(self, coordinator, participants):
        self.coordinator = coordinator
        self.participants = participants
    
    def execute_transaction(self, transaction):
        # Phase 1: PREPARE
        prepare_results = []
        for participant in self.participants:
            result = participant.prepare(transaction)
            prepare_results.append(result)
        
        # Check if ALL prepared successfully
        if all(r.can_commit for r in prepare_results):
            # Phase 2: COMMIT
            for participant in self.participants:
                participant.commit(transaction)
            return {"status": "committed"}
        else:
            # Phase 2: ABORT
            for participant in self.participants:
                participant.abort(transaction)
            return {"status": "aborted"}

# Usage
coordinator = TwoPhaseCommit(master, [replica1, replica2, replica3])
coordinator.execute_transaction({
    'operation': 'transfer',
    'from': 'alice',
    'to': 'bob',
    'amount': 100
})
# Either ALL commit or ALL abort
```

**Pros**: True ACID guarantees
**Cons**: Blocking (if coordinator fails, system stuck)

---

## 🌊 Eventual Consistency

### Definition
**If no new updates, all replicas eventually converge to the same value.** Temporary stale data allowed.

### Characteristics
```
Time →
Write(X=100) ────→
                  ↓
Read(X) → 50 (stale) ✗
Read(X) → 50 (stale) ✗
Read(X) → 100 ✓ (converged after 5 seconds)

Reads may return stale data temporarily
```

### Implementation Patterns

#### 1️⃣ **Asynchronous Replication**
```python
def write_eventual_consistency(key, value, master, replicas):
    """
    Write to master, replicate asynchronously
    """
    # Write to master
    master.write(key, value)
    
    # Asynchronously replicate to slaves
    for replica in replicas:
        asyncio.create_task(replica.replicate_async(key, value))
    
    # Return immediately (don't wait for replicas)
    return {"status": "accepted", "latency_ms": 5}

# Replication happens in background
async def replicate_async(replica, key, value):
    await asyncio.sleep(random.uniform(0.1, 2))  # Network delay
    replica.write(key, value)
```

**Latency**: 1-10ms (only master write)
**Availability**: 99.99%+ (replicas can lag/fail)

#### 2️⃣ **Last-Write-Wins (LWW)**
```python
class LastWriteWins:
    """
    Conflict resolution: Latest timestamp wins
    """
    def merge(self, replica1_value, replica2_value):
        v1, t1 = replica1_value['value'], replica1_value['timestamp']
        v2, t2 = replica2_value['value'], replica2_value['timestamp']
        
        if t1 > t2:
            return v1
        elif t2 > t1:
            return v2
        else:
            # Tie-breaker: Use node ID
            return v1 if replica1_value['node_id'] > replica2_value['node_id'] else v2

# Usage
lww = LastWriteWins()

# Concurrent writes
r1 = {'value': 100, 'timestamp': 1000, 'node_id': 'A'}
r2 = {'value': 200, 'timestamp': 1005, 'node_id': 'B'}

result = lww.merge(r1, r2)  # 200 (newer timestamp)
```

#### 3️⃣ **CRDT (Conflict-Free Replicated Data Types)**
```python
class GCounter:
    """
    Grow-only counter (CRDT)
    Eventually consistent without coordination
    """
    def __init__(self, node_id, num_nodes):
        self.node_id = node_id
        self.counts = [0] * num_nodes
    
    def increment(self):
        self.counts[self.node_id] += 1
    
    def value(self):
        return sum(self.counts)
    
    def merge(self, other):
        """Merge with another replica"""
        for i in range(len(self.counts)):
            self.counts[i] = max(self.counts[i], other.counts[i])

# Usage
node1 = GCounter(0, 3)
node1.increment()  # [1, 0, 0]

node2 = GCounter(1, 3)
node2.increment()  # [0, 1, 0]
node2.increment()  # [0, 2, 0]

# Merge replicas
node1.merge(node2)
print(node1.value())  # 3 (1 + 2)
```

**Popular CRDTs**:
- **G-Counter**: Grow-only counter
- **PN-Counter**: Increment/decrement counter
- **G-Set**: Grow-only set
- **OR-Set**: Add/remove set
- **LWW-Register**: Last-write-wins register

---

## 📊 Comparison Table

| Aspect | Strong Consistency | Eventual Consistency |
|--------|-------------------|----------------------|
| **Read Guarantee** | Always latest value | May return stale data |
| **Write Latency** | 50-200ms (wait for replicas) | 1-10ms (only master) |
| **Read Latency** | 20-100ms (quorum read) | 1-5ms (local read) |
| **Availability** | 99.9% (3 nines) | 99.99%+ (4+ nines) |
| **Network Failures** | Blocks writes | Continues serving |
| **Partition Tolerance** | Limited (CP system) | High (AP system) |
| **Complexity** | High (2PC, quorum) | Low (async replication) |
| **Conflicts** | Prevented | Resolved post-hoc |

---

## 🏗️ Real-World Examples

### **Banking - Strong Consistency** 🏦
```python
# Account transfer requires strong consistency
def transfer_money(from_account, to_account, amount):
    with transaction(isolation='SERIALIZABLE'):
        # Read latest balances (strong consistency)
        from_balance = db.read_strong(from_account)
        to_balance = db.read_strong(to_account)
        
        if from_balance < amount:
            raise InsufficientFundsException()
        
        # Update both accounts atomically
        db.write_strong(from_account, from_balance - amount)
        db.write_strong(to_account, to_balance + amount)
        
        db.commit()

# Strong consistency prevents:
# - Negative balances
# - Double-spending
# - Lost updates
```

**Why Strong?**: Money can't be "eventually consistent" (unacceptable to lose $100 temporarily)

### **Social Media Likes - Eventual Consistency** ❤️
```python
# Like counter uses eventual consistency
def like_post(user_id, post_id):
    # Write to local region (fast!)
    local_db.increment_counter(f"likes:{post_id}")
    
    # Asynchronously propagate to other regions
    replicate_async(other_regions, f"likes:{post_id}", increment=1)
    
    return {"status": "liked", "latency_ms": 5}

# Reading likes
def get_like_count(post_id):
    # Read from nearest replica
    return local_db.read(f"likes:{post_id}")
    # May return 1,234 while actual is 1,240 (6 like lag)
    # User doesn't notice/care!
```

**Why Eventual?**: Exact like count not critical, low latency > perfect accuracy

### **E-commerce Inventory - Strong Consistency** 📦
```python
# Product inventory requires strong consistency
def purchase_item(product_id, quantity):
    with transaction():
        # Strong read (latest inventory)
        available = db.read_strong(f"inventory:{product_id}")
        
        if available < quantity:
            return {"error": "Out of stock"}
        
        # Decrement inventory
        db.write_strong(f"inventory:{product_id}", available - quantity)
        
        db.commit()
        return {"status": "purchased"}

# Strong consistency prevents:
# - Overselling (selling 10 items when only 5 available)
# - Angry customers
```

### **CDN Caching - Eventual Consistency** 🌐
```python
# CDN content is eventually consistent
def update_website_content(file_path, content):
    # Update origin server
    origin.write(file_path, content)
    
    # Asynchronously invalidate CDN caches
    for edge_location in cdn_edges:
        edge_location.invalidate_async(file_path)
    
    # CDN caches converge over 5-60 minutes
    return {"status": "updated", "propagation": "5-60 minutes"}

# Users may see old content briefly
# Acceptable trade-off for 10x faster load times
```

---

## 🎓 When to Choose What?

### Choose Strong Consistency When:
✅ **Financial transactions**: Banking, payments, billing
✅ **Inventory management**: E-commerce stock, bookings
✅ **Critical state**: Distributed locks, leader election
✅ **Audit trails**: Compliance, legal requirements
✅ **User expects real-time**: Chat, collaborative editing

### Choose Eventual Consistency When:
✅ **Metrics/Analytics**: View counts, likes, page views
✅ **Social features**: Followers, notifications, feeds
✅ **Caching**: CDN, application cache
✅ **High-scale reads**: Multi-region, global distribution
✅ **Availability > Correctness**: Service uptime critical

---

## 🔧 Hybrid Approach (Best of Both Worlds)

```python
class HybridConsistency:
    """
    Strong consistency for critical paths
    Eventual consistency for non-critical
    """
    def write(self, key, value, consistency='eventual'):
        if consistency == 'strong':
            return self._write_strong(key, value)
        else:
            return self._write_eventual(key, value)
    
    def _write_strong(self, key, value):
        # Synchronous replication (slower)
        return self.db.write_with_quorum(key, value, W=2, N=3)
    
    def _write_eventual(self, key, value):
        # Async replication (faster)
        return self.db.write_async(key, value)

# Usage
hybrid = HybridConsistency()

# Critical: Account balance
hybrid.write('balance:alice', 1000, consistency='strong')

# Non-critical: Profile views
hybrid.write('views:alice', 1234, consistency='eventual')
```

### Example: Amazon DynamoDB
```python
# DynamoDB supports both models
table = dynamodb.Table('Users')

# Eventual consistency (default, faster)
response = table.get_item(Key={'id': '123'})

# Strong consistency (slower, more expensive)
response = table.get_item(
    Key={'id': '123'},
    ConsistentRead=True  # ← Force strong consistency
)
```

---

## 📈 Performance Impact

### Latency Comparison
```
┌─────────────────────────────────────────┐
│ Operation        Strong    Eventual     │
├─────────────────────────────────────────┤
│ Write (local)    50ms      5ms          │
│ Write (global)   200ms     10ms         │
│ Read (local)     20ms      1ms          │
│ Read (global)    100ms     5ms          │
└─────────────────────────────────────────┘
```

### Availability Comparison
```
Strong Consistency:
├─ Single region: 99.9% (3 nines)
└─ Multi-region: 99.95%

Eventual Consistency:
├─ Single region: 99.99% (4 nines)
└─ Multi-region: 99.999% (5 nines)
```

---

## ✅ Best Practices

1. **Default to eventual** - Use strong only when necessary
2. **Measure lag** - Monitor replication lag (should be <1 second)
3. **Provide strong-read option** - Let clients choose when needed
4. **Document guarantees** - Make consistency model explicit
5. **Test both modes** - Verify behavior under network partitions
6. **Use TTL as safety net** - Eventual consistency + TTL prevents infinite staleness

---

## 🎓 Interview Tips

**Q: "How do you handle strong consistency in multi-region deployments?"**

A: "Options:
1. **Single-master region**: All writes to one region (leader), read from nearest replica
2. **Quorum across regions**: W + R > N with replicas in multiple regions (high latency 200ms+)
3. **Conflict-free datatypes (CRDTs)**: Merge concurrent writes deterministically
4. **Operational transformation**: Used in Google Docs for collaborative editing"

**Q: "What's the latency cost of strong consistency?"**

A: "Strong consistency adds 5-20x latency:
- **Eventual**: 1-5ms (single write)
- **Strong**: 50-200ms (wait for quorum/sync replication)
- **Multi-region strong**: 200-500ms (cross-datacenter coordination)

Trade-off: Correctness vs speed. Banking chooses correctness, social media chooses speed."

---

## 🔗 Related Topics
- **85. Data Consistency Models** - Full spectrum
- **89. CAP Theorem** - Consistency vs availability
- **90. PACELC Theorem** - Extended trade-offs
- **92. Conflict Resolution** - Handling divergence

---

## 📚 Summary

| Model | Latency | Availability | Use Case |
|-------|---------|--------------|----------|
| **Strong** | High (50-200ms) | Medium (99.9%) | Banking, inventory |
| **Eventual** | Low (1-10ms) | High (99.99%) | Social media, CDN |
| **Hybrid** | Variable | Variable | Amazon, Google |

**Golden Rule**: Use the **weakest consistency model** that meets business requirements! 🎯
