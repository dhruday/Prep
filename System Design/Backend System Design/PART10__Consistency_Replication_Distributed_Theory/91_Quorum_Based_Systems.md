# 91. Quorum-Based Systems

## 📌 Overview

**Quorum-based replication** ensures consistency by requiring a **minimum number of replicas** to agree before accepting a read or write operation.

**Formula**: **R + W > N** (ensures strong consistency)

Where:
- **N** = Total replicas
- **R** = Read quorum (replicas that must respond to read)
- **W** = Write quorum (replicas that must ACK write)

---

## 🎯 The Core Idea

```
┌────────────────────────────────────────┐
│ N = 3 replicas total                   │
│ W = 2 (write to 2 replicas)           │
│ R = 2 (read from 2 replicas)          │
│                                        │
│ R + W = 4 > N = 3 ✓                   │
│                                        │
│ Guarantee: Read always sees latest    │
│ (read set overlaps write set)         │
└────────────────────────────────────────┘
```

### Why R + W > N Works
```
Write to W=2 replicas: [A, B]
Read from R=2 replicas: [B, C]

Overlap: Replica B ← Contains latest value!
```

---

## 📊 Common Quorum Configurations

### **1. Majority Quorum (R=W=2, N=3)**
```python
# Classic configuration
N = 3  # Total replicas
R = 2  # Read from 2
W = 2  # Write to 2

# R + W = 4 > N = 3 ✓ (strong consistency)

def write(key, value, replicas):
    futures = [r.write_async(key, value) for r in replicas]
    
    # Wait for W=2 ACKs
    successes = wait_for_n_successes(futures, n=2, timeout=1000)
    
    if successes >= 2:
        return {"status": "success"}
    else:
        raise QuorumNotReachedException()

def read(key, replicas):
    futures = [r.read_async(key) for r in replicas]
    
    # Wait for R=2 responses
    responses = wait_for_n_responses(futures, n=2, timeout=1000)
    
    # Return value with highest version
    return max(responses, key=lambda r: r.version).value
```

**Properties**:
- ✅ Strong consistency
- ✅ Tolerates 1 replica failure
- ⚠️ Requires 2/3 replicas available

---

### **2. Read-Heavy Optimization (R=1, W=3, N=3)**
```python
# Optimize for fast reads
N = 3
R = 1  # Read from ANY 1 replica (fast!)
W = 3  # Write to ALL replicas (slow)

# R + W = 4 > N = 3 ✓ (still strong consistency)

def write(key, value, replicas):
    # Write to ALL replicas
    futures = [r.write_async(key, value) for r in replicas]
    results = wait_all(futures, timeout=1000)
    
    if all(r.success for r in results):
        return {"status": "success"}  # Slow write (100ms)
    else:
        raise WriteFailedException()

def read(key, replicas):
    # Read from ANY 1 replica
    return replicas[0].read(key)  # Fast read (1ms)
```

**Use Case**: Read-heavy workloads (90% reads, 10% writes)
**Examples**: Configuration systems, DNS

---

### **3. Write-Heavy Optimization (R=3, W=1, N=3)**
```python
# Optimize for fast writes
N = 3
R = 3  # Read from ALL replicas (slow)
W = 1  # Write to ANY 1 replica (fast!)

# R + W = 4 > N = 3 ✓ (strong consistency)

def write(key, value, replicas):
    # Write to ANY 1 replica
    replicas[0].write(key, value)  # Fast write (1ms)
    
    # Asynchronously replicate to others
    for r in replicas[1:]:
        asyncio.create_task(r.replicate_async(key, value))
    
    return {"status": "success"}

def read(key, replicas):
    # Read from ALL replicas
    futures = [r.read_async(key) for r in replicas]
    responses = wait_all(futures, timeout=1000)
    
    # Return latest version (slow read 100ms)
    return max(responses, key=lambda r: r.version).value
```

**Use Case**: Write-heavy workloads (logging, metrics)

---

### **4. Eventual Consistency (R=1, W=1, N=3)**
```python
# Maximum availability, no consistency
N = 3
R = 1  # Read from ANY 1
W = 1  # Write to ANY 1

# R + W = 2 ≯ N = 3 ✗ (eventual consistency only)

# Fast but no consistency guarantee
# Use for: Caching, non-critical data
```

---

## 🏗️ Real-World Implementations

### **Apache Cassandra**
```python
from cassandra.cluster import Cluster
from cassandra.query import ConsistencyLevel

cluster = Cluster(['127.0.0.1'])
session = cluster.connect('my_keyspace')

# Quorum configurations
session.execute(
    "INSERT INTO users (id, name) VALUES (?, ?)",
    (uuid.uuid4(), 'Alice'),
    consistency_level=ConsistencyLevel.QUORUM  # R+W>N
)

# Read with quorum
session.execute(
    "SELECT * FROM users WHERE id = ?",
    [user_id],
    consistency_level=ConsistencyLevel.QUORUM
)

# Available consistency levels:
# ONE: R=1 or W=1 (fast, eventual consistency)
# QUORUM: R=W=(N/2)+1 (strong consistency)
# ALL: R=N or W=N (strictest, least available)
```

---

### **Amazon DynamoDB**
```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Users')

# Eventual consistency (default)
table.get_item(Key={'id': '123'})

# Strong consistency (quorum read)
table.get_item(
    Key={'id': '123'},
    ConsistentRead=True  # ← Quorum read
)

# Writes always use quorum (strong consistency)
table.put_item(Item={'id': '123', 'name': 'Alice'})
```

---

### **Riak**
```python
from riak import RiakClient

client = RiakClient(protocol='pbc', host='127.0.0.1')
bucket = client.bucket('users')

# Explicit quorum configuration
obj = bucket.new('alice', data={'balance': 1000})
obj.store(w=2, pw=2)  # Write quorum: 2 primary, 2 total

# Read quorum
obj = bucket.get('alice', r=2, pr=2)  # Read from 2 replicas
```

---

## 📈 Performance vs Consistency

```
┌────────────────────────────────────────────────┐
│ Config    Write Latency  Read Latency  Consistency │
├────────────────────────────────────────────────┤
│ R=1,W=1   1ms           1ms           Eventual  │
│ R=1,W=3   50ms          1ms           Strong    │
│ R=2,W=2   20ms          20ms          Strong    │
│ R=3,W=1   1ms           50ms          Strong    │
│ R=3,W=3   50ms          50ms          Strictest│
└────────────────────────────────────────────────┘
```

---

## 🔧 Sloppy Quorum (Hinted Handoff)

When primary replicas unavailable, use **temporary replicas**:

```python
class SloppyQuorum:
    def write(self, key, value, primary_replicas, backup_replicas):
        # Try primary replicas first
        futures = [r.write_async(key, value) for r in primary_replicas]
        successes = wait_for_n_successes(futures, n=2, timeout=500)
        
        if successes >= 2:
            return {"status": "success"}
        
        # If insufficient, use backup replicas (sloppy quorum)
        backup_futures = [r.write_async(key, value) for r in backup_replicas]
        backup_successes = wait_for_n_successes(backup_futures, n=2, timeout=500)
        
        if successes + backup_successes >= 2:
            # Store hint: "This data belongs to primary replica X"
            return {"status": "success_sloppy", "hint": "handoff needed"}
        
        raise QuorumNotReachedException()

# When primary replica recovers:
# Backup replica hands off data back to primary
```

**Use Case**: High availability (Cassandra, Riak)

---

## ✅ Best Practices

1. **Use R=W=Majority for balanced workloads** (N=3, R=2, W=2)
2. **Optimize for workload**: Read-heavy → lower R, Write-heavy → lower W
3. **Monitor quorum failures**: Alert if quorum not reachable
4. **Set appropriate timeout**: 100-1000ms typical
5. **Use sloppy quorum for HA**: Temporary replicas during failures

---

## 🎓 Interview Tips

**Q: "Explain how quorum ensures strong consistency."**

A: "Quorum ensures R + W > N, meaning read and write sets overlap. Example: N=3, R=2, W=2.
- Write goes to 2 replicas (say A, B)
- Read from 2 replicas (say B, C)
- Overlap: Replica B contains latest value
- Result: Read always sees latest write"

**Q: "What's the difference between R=2,W=2,N=3 and R=1,W=3,N=3?"**

A: "Both provide strong consistency (R+W>N), but:
- R=2,W=2: Balanced (20ms reads, 20ms writes)
- R=1,W=3: Read-optimized (1ms reads, 50ms writes)

Choose based on workload: Read-heavy → R=1,W=3; Balanced → R=2,W=2"

---

## 🔗 Related Topics
- **89. CAP Theorem** - CP systems use quorums
- **86. Strong vs Eventual Consistency** - Quorum provides strong
- **92. Conflict Resolution** - Handling version conflicts
- **70. Replication** - Replica management

---

## 📚 Summary

**Quorum Formula**: **R + W > N** (strong consistency)

**Common Configs**:
- **R=2, W=2, N=3**: Balanced (most common)
- **R=1, W=3, N=3**: Read-optimized
- **R=3, W=1, N=3**: Write-optimized

**Systems**: Cassandra, DynamoDB, Riak, MongoDB

**Key Insight**: Trade latency for consistency by adjusting R, W! 🎯
