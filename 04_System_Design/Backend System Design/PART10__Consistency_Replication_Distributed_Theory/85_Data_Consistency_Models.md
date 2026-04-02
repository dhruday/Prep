# 85. Data Consistency Models

## 📌 Overview

**Data consistency models** define the rules for how and when updates to distributed data become visible to different parts of the system. They represent a fundamental trade-off between **consistency**, **availability**, and **performance**.

### The Core Question
```
User A writes: X = 5
User B reads: X = ???

┌─────────────────────────────────────────┐
│ What value should User B see?          │
├─────────────────────────────────────────┤
│ • Always 5? (Strong Consistency)        │
│ • Maybe old value? (Eventual)           │
│ • Own writes? (Read-Your-Writes)        │
│ • Depends on location? (Causal)         │
└─────────────────────────────────────────┘
```

---

## 🎯 Consistency Spectrum

### From Strongest to Weakest
```
Stronger Consistency ←──────────────────→ Weaker Consistency
(Slower, Less Available)        (Faster, More Available)

├────────┼────────┼────────┼────────┼────────┤
Linearizable  Sequential  Causal  Eventual  No Guarantee
(Strictest)                               (Fastest)
```

---

## 📊 Major Consistency Models

### 1️⃣ **Linearizability (Strict Consistency)**

**Definition**: Operations appear to execute atomically and instantaneously at some point between invocation and response.

#### Characteristics
```
Time →
Node A: Write(X=1) ─────────────[commit]──→
Node B:                  Read(X) must see 1 ──→
Node C:                       Read(X) must see 1 ──→

All nodes see the same order of operations
```

**Properties**:
- Strongest consistency guarantee
- Operations have a total order
- Real-time ordering preserved
- Behaves like a single copy

**Example**:
```python
# Linearizable system
client1.write('balance', 100)  # T1: 10:00:00.000
# After this completes, ALL reads MUST see 100

client2.read('balance')  # T2: 10:00:00.001 → 100 ✓
client3.read('balance')  # T3: 10:00:00.002 → 100 ✓
# No client can see old value after write completes
```

**Use Cases**:
- Banking systems
- Inventory management
- Distributed locks
- Leader election

**Systems**: etcd, Zookeeper, Google Spanner

---

### 2️⃣ **Sequential Consistency**

**Definition**: All operations appear to execute in some sequential order, and operations of each process appear in program order.

#### Difference from Linearizability
```
Linearizable: Must respect real-time order
Sequential: Only respect program order per process

Time →
Process A: W(X=1) ────→ W(X=2) ────→
Process B:     R(X=0) ──→   R(X=2) ──→

Sequential ✓: B can see 0 then 2 (skipped 1)
Linearizable ✗: B must see 1 before 2
```

**Example**:
```python
# Sequential consistency allows:
client1.write('x', 1)  # T1
client1.write('x', 2)  # T2

client2.read('x') → 1  # Saw intermediate state ✓
client2.read('x') → 2  # Progressed forward ✓

# But NOT:
client2.read('x') → 2
client2.read('x') → 1  # Going backward ✗
```

**Use Cases**:
- Multi-core CPU caches
- Distributed caches
- Less critical distributed state

---

### 3️⃣ **Causal Consistency**

**Definition**: Operations that are causally related must be seen in the same order by all processes. Concurrent operations can be seen in different orders.

#### Causality
```
Event A → Event B (A causes B)
All nodes must see A before B

Event X || Event Y (X and Y are concurrent)
Nodes can see X→Y or Y→X
```

**Example**:
```python
# Causal relationships
alice.post("Going to Paris!")  # Event A
bob.reply("Have fun!")         # Event B (caused by A)

# All users MUST see A before B
# (Can't see reply before original post)

charlie.post("Nice weather")   # Event C (concurrent with A)
# C can appear before or after A (independent)
```

**Vector Clocks Implementation**:
```python
class VectorClock:
    def __init__(self, node_id, num_nodes):
        self.node_id = node_id
        self.clock = [0] * num_nodes
    
    def increment(self):
        self.clock[self.node_id] += 1
    
    def update(self, other_clock):
        for i in range(len(self.clock)):
            self.clock[i] = max(self.clock[i], other_clock[i])
        self.increment()
    
    def happens_before(self, other):
        """Check if self → other (causally before)"""
        less = False
        for i in range(len(self.clock)):
            if self.clock[i] > other.clock[i]:
                return False  # Not causally before
            if self.clock[i] < other.clock[i]:
                less = True
        return less

# Usage
node1 = VectorClock(0, 3)
node1.increment()  # [1, 0, 0]

node2 = VectorClock(1, 3)
node2.update(node1.clock)  # [1, 1, 0]
# node2 event causally depends on node1 event
```

**Use Cases**:
- Social media feeds
- Collaborative editing
- Chat systems
- Version control

**Systems**: Apache Cassandra, DynamoDB, Riak

---

### 4️⃣ **Eventual Consistency**

**Definition**: If no new updates are made, eventually all replicas will converge to the same value.

#### Key Properties
```
Time →
Node A: Write(X=1) ──→
Node B:            Read(X=0) → Read(X=0) → Read(X=1) ✓
                   (stale)     (stale)      (converged)

Lag time: Seconds to minutes
```

**Example**:
```python
# DNS is eventually consistent
# Update DNS record
update_dns('example.com', '1.2.3.4')

# Different DNS servers see update at different times
dns1.resolve('example.com') → '1.2.3.3' (old)
dns2.resolve('example.com') → '1.2.3.4' (new)
dns3.resolve('example.com') → '1.2.3.3' (old)

# After TTL expires (e.g., 5 minutes)
# All servers eventually see '1.2.3.4'
```

**Conflict Resolution**:
```python
# Last-Write-Wins (LWW)
def merge_eventual(replica1, replica2):
    if replica1.timestamp > replica2.timestamp:
        return replica1.value
    else:
        return replica2.value

# Usage
r1 = {'value': 100, 'timestamp': 1000}
r2 = {'value': 200, 'timestamp': 2000}
result = merge_eventual(r1, r2)  # 200 wins
```

**Use Cases**:
- Social media likes/views
- DNS
- CDN caches
- Shopping cart (non-critical)

**Systems**: DynamoDB, Cassandra, Riak, DNS

---

### 5️⃣ **Read-Your-Writes Consistency**

**Definition**: A process always sees its own writes. Other processes may not see them immediately.

```python
# Session-based consistency
class SessionConsistency:
    def __init__(self):
        self.session_versions = {}  # session_id → last_version
    
    def write(self, session_id, key, value, db):
        version = db.write_with_version(key, value)
        self.session_versions[session_id] = version
        return version
    
    def read(self, session_id, key, db):
        required_version = self.session_versions.get(session_id, 0)
        return db.read_at_version(key, required_version)

# Usage
session = SessionConsistency()

# User's session
session.write('alice_session', 'profile', 'updated', db)
# Alice immediately sees her update
session.read('alice_session', 'profile', db)  # 'updated' ✓

# Bob's session (different user)
session.read('bob_session', 'profile', db)  # May see old value
```

**Use Cases**:
- User profile updates
- Shopping cart
- User preferences

---

### 6️⃣ **Monotonic Reads**

**Definition**: If a process reads a value, it will never see an older value in subsequent reads.

```python
# Monotonic reads guarantee
# User reads version 5, will never see version 4 or earlier

Time →
Read(X) → version 5
Read(X) → version 5 ✓ (same or newer)
Read(X) → version 7 ✓ (newer)
Read(X) → version 4 ✗ (going backward - NOT allowed)
```

**Implementation**:
```python
class MonotonicReadCache:
    def __init__(self):
        self.last_seen_version = {}  # key → version
    
    def read(self, key, replicas):
        last_version = self.last_seen_version.get(key, 0)
        
        # Only accept reads >= last seen version
        for replica in replicas:
            value, version = replica.read(key)
            if version >= last_version:
                self.last_seen_version[key] = version
                return value
        
        # If no replica has new enough data, wait or error
        raise StaleDataException()
```

**Use Cases**:
- Social media timelines
- Comments/notifications
- Activity logs

---

### 7️⃣ **Monotonic Writes**

**Definition**: Writes by a single process are applied in order.

```python
# Guarantee: Writes appear in order
Process A:
  Write(X=1)
  Write(X=2)
  Write(X=3)

All replicas see: 1 → 2 → 3
NOT: 1 → 3 → 2 (out of order)
```

---

## 🏗️ Real-World Systems Examples

### **Amazon DynamoDB**
```python
# Eventual consistency (default)
response = table.get_item(Key={'id': '123'})
# May return stale data

# Strong consistency (opt-in)
response = table.get_item(
    Key={'id': '123'},
    ConsistentRead=True  # ← Force strong consistency
)
# Returns latest data (but slower, less available)
```

### **MongoDB**
```python
# Read concern levels
collection.find().read_concern('local')        # Eventual
collection.find().read_concern('majority')     # Strong
collection.find().read_concern('linearizable') # Strictest

# Write concern
collection.insert_one(doc, write_concern={'w': 'majority'})
```

### **Apache Cassandra**
```python
# Tunable consistency
session.execute(
    "SELECT * FROM users WHERE id = ?",
    [user_id],
    consistency_level=ConsistencyLevel.QUORUM  # R+W > N
)

# Levels:
# ONE: Eventual consistency
# QUORUM: Strong consistency (R+W > N)
# ALL: Strictest (but least available)
```

### **Redis**
```python
# Redis is eventually consistent across replicas
# Master-slave replication is asynchronous

# Can force strong consistency:
redis.set('key', 'value')
redis.wait(num_replicas=2, timeout=1000)  # Wait for 2 replicas
```

---

## 📈 Performance vs Consistency Trade-off

```
┌─────────────────────────────────────────┐
│ Consistency   Latency   Availability    │
├─────────────────────────────────────────┤
│ Linearizable  50-200ms  99.9% (3 nines)│
│ Sequential    20-50ms   99.95%          │
│ Causal        10-20ms   99.99%          │
│ Eventual      1-5ms     99.999% (5 9s)  │
└─────────────────────────────────────────┘
```

---

## 🎓 Interview Tips

### Common Questions

**Q: "When would you choose eventual consistency over strong consistency?"**

A: "Eventual consistency when:
- **Use case tolerates stale data**: Social media likes, view counts
- **High availability needed**: 99.999% uptime (5 nines)
- **Low latency critical**: <10ms response time
- **Geographic distribution**: Multi-region with high network latency

Strong consistency when:
- **Correctness critical**: Banking, inventory, payments
- **Conflict-free required**: Can't have duplicate bookings
- **Audit trails needed**: Compliance, regulatory requirements"

**Q: "How do you implement read-your-writes consistency?"**

A: "Strategies:
1. **Sticky sessions**: Route user to same replica
2. **Version tracking**: Track user's last seen version, only read from replicas with >= version
3. **Write to master, read from master**: Always consistent but sacrifices read scalability
4. **Client-side caching**: Cache own writes, serve from cache until replicated"

**Q: "What's the difference between linearizability and sequential consistency?"**

A: "Linearizability respects **real-time ordering** (if write completes before read starts, read must see it). Sequential consistency only respects **program order per process** (writes from same process appear in order, but different processes can see different interleaving)."

---

## ✅ Best Practices

1. **Choose weakest consistency needed** - Don't pay for stronger guarantees unnecessarily
2. **Use strong consistency for critical paths** - Payments, bookings, inventory
3. **Document consistency guarantees** - Make it explicit in API contracts
4. **Test consistency violations** - Use chaos testing to verify behavior
5. **Monitor lag** - Track replication lag, stale reads
6. **Provide escape hatches** - Allow force-refresh or strong-read options

---

## 🔗 Related Topics
- **86. Strong vs Eventual Consistency** - Deep dive comparison
- **87. Read-After-Write Consistency** - Session consistency patterns
- **89. CAP Theorem** - Consistency vs availability trade-offs
- **92. Conflict Resolution Strategies** - Handling divergent replicas

---

## 📚 Summary

| Model | Guarantee | Use Case | Latency | Availability |
|-------|-----------|----------|---------|--------------|
| **Linearizable** | Strongest, real-time order | Banking | Highest | Lowest |
| **Sequential** | Program order per process | Caches | High | Low |
| **Causal** | Causality preserved | Social media | Medium | Medium |
| **Eventual** | Converges eventually | CDN, DNS | Lowest | Highest |
| **Read-Your-Writes** | See own updates | User profiles | Low | High |
| **Monotonic Reads** | No going backward | Timelines | Low | High |

Choose consistency model based on **business requirements**, not technical preference! 🎯
