# 89. CAP Theorem

## 📌 Overview

The **CAP Theorem** (also called **Brewer's Theorem**) states that in a distributed system, you can only guarantee **2 out of 3** properties:

- **C**onsistency
- **A**vailability  
- **P**artition Tolerance

---

## 🎯 The Three Properties

### **C = Consistency**
Every read receives the **most recent write** or an error. All nodes see the same data at the same time.

```
User writes: X = 100
All nodes see: X = 100 (immediately)
No stale data allowed
```

### **A = Availability**
Every request receives a **non-error response**, without guarantee that it contains the most recent write.

```
System always responds (even if data is stale)
No timeouts, no errors
```

### **P = Partition Tolerance**
The system continues to operate despite **network partitions** (nodes can't communicate).

```
Network split: Node A ↮ Node B
System continues functioning
```

---

## 🔺 The CAP Triangle

```
         Consistency (C)
              △
             ╱ ╲
            ╱   ╲
           ╱  CA ╲ (Impossible in distributed systems)
          ╱       ╲
         ╱    ●    ╲
        ╱    CP     ╲
       ╱   or  AP    ╲
      ╱               ╲
     ╱_________________╲
   Availability      Partition
       (A)          Tolerance (P)

Pick 2: CP or AP (CA impossible with network partitions)
```

---

## 🚫 Why You Can't Have All Three

### Scenario: Network Partition
```
Time →
┌────────────────────┐     ┌────────────────────┐
│   Node A (US-East) │ ✗✗✗ │ Node B (US-West)   │
└────────────────────┘     └────────────────────┘
      Network partition (nodes can't communicate)

User1 writes to Node A: X = 100
User2 reads from Node B: X = ???

Choice 1 (CP): Reject read from B (maintain consistency, sacrifice availability)
Choice 2 (AP): Return stale value from B (maintain availability, sacrifice consistency)

You CANNOT: Return latest value from B (no network communication = impossible)
```

---

## 🔒 CP Systems (Consistency + Partition Tolerance)

**Trade-off**: Sacrifice **availability** to maintain consistency.

### Characteristics
- Reject requests during partition
- All nodes see same data (or error)
- Used for critical data (banking, inventory)

### Examples

#### **MongoDB (with majority write concern)**
```python
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017',
                     replicaSet='rs0')

db = client.test_db

# CP mode: Majority write concern
db.users.insert_one(
    {'name': 'Alice', 'balance': 1000},
    write_concern={'w': 'majority'}  # ← CP: Wait for majority
)

# If majority unreachable → WriteError (no availability)
# But guarantees consistency (majority has data)
```

#### **HBase**
```java
// HBase is CP
// Single master coordinates all writes
// If master down → writes fail (no availability)
// But reads always see consistent data
```

#### **Redis Cluster (with WAIT)**
```python
import redis

r = redis.Redis(host='localhost', port=6379)

# Write with WAIT for replication
r.set('balance', 1000)
r.wait(num_replicas=2, timeout=1000)  # ← CP: Wait for 2 replicas

# If replicas unavailable → timeout (no availability)
# But guarantees data on multiple nodes
```

#### **Apache Zookeeper**
```python
from kazoo.client import KazooClient

zk = KazooClient(hosts='127.0.0.1:2181')
zk.start()

# Write requires majority consensus
zk.create('/config/app', b'value', makepath=True)

# If majority unreachable → exception
# But all nodes see consistent state
```

---

## 🌐 AP Systems (Availability + Partition Tolerance)

**Trade-off**: Sacrifice **consistency** to maintain availability.

### Characteristics
- Always respond (even with stale data)
- Eventual consistency
- Used for non-critical data (social media, caching)

### Examples

#### **Apache Cassandra**
```python
from cassandra.cluster import Cluster

cluster = Cluster(['127.0.0.1'])
session = cluster.connect('my_keyspace')

# AP mode: Consistency level ONE
session.execute(
    "INSERT INTO users (id, name) VALUES (%s, %s)",
    (uuid.uuid4(), 'Alice'),
    consistency_level=ConsistencyLevel.ONE  # ← AP: Write to any node
)

# Always available (even during partition)
# But may serve stale data
```

#### **Amazon DynamoDB (default)**
```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Users')

# AP mode: Eventual consistency (default)
table.put_item(Item={'user_id': '123', 'name': 'Alice'})

# Get with eventual consistency
response = table.get_item(Key={'user_id': '123'})
# Always responds (even if stale)
```

#### **Riak**
```python
from riak import RiakClient

client = RiakClient(protocol='pbc', host='127.0.0.1')
bucket = client.bucket('users')

# AP system: Always available
obj = bucket.new('alice', data={'balance': 1000})
obj.store(w=1)  # Write to any 1 node (always succeeds)

# Read may return stale data (AP trade-off)
obj = bucket.get('alice')
```

#### **CouchDB**
```python
import couchdb

server = couchdb.Server('http://127.0.0.1:5984/')
db = server['users']

# AP system: Multi-master replication
db['alice'] = {'name': 'Alice', 'balance': 1000}

# Conflicts resolved with version vectors
# Always available during partitions
```

---

## ⚖️ CA Systems (Consistency + Availability)

**Reality**: CA is **impossible** in distributed systems with network partitions.

### Why CA is Impossible
```
For CA to work:
- C: All nodes must agree (requires communication)
- A: Must respond to all requests
- No P: Assumes network never fails

But networks DO fail!
→ CA only works in single-node systems (not distributed)
```

### "CA" Systems (Single Datacenter)
```python
# Traditional RDBMS (single master, no partitions)
# PostgreSQL, MySQL (single instance)

# If network never partitions → CA possible
# But unrealistic in production (networks fail!)
```

---

## 📊 System Classification

| System | Type | Availability | Consistency | Use Case |
|--------|------|--------------|-------------|----------|
| **Zookeeper** | CP | 99.9% | Strong | Configuration, locks |
| **etcd** | CP | 99.9% | Strong | Kubernetes config |
| **HBase** | CP | 99.9% | Strong | Analytics |
| **MongoDB** | CP (tunable) | 99.9%-99.99% | Strong/Eventual | General purpose |
| **Cassandra** | AP | 99.99% | Eventual | High availability |
| **DynamoDB** | AP (tunable) | 99.99% | Eventual/Strong | Cloud-native |
| **Riak** | AP | 99.99% | Eventual | Key-value store |
| **CouchDB** | AP | 99.99% | Eventual | Mobile sync |

---

## 🎯 Choosing CP vs AP

### Choose CP When:
✅ **Correctness is critical**: Banking, payments, inventory
✅ **Can't tolerate stale data**: Account balances, stock prices
✅ **ACID required**: Transactions, financial records
✅ **Data loss unacceptable**: Legal, compliance data

**Example**: Bank transfer
```python
# CP system required
# Can't have: Alice balance = -$100 (overdraft)
# Can't have: Double-spend (transfer same $100 twice)

def transfer(from_account, to_account, amount):
    with transaction(isolation='SERIALIZABLE'):  # CP
        if from_balance < amount:
            raise InsufficientFundsError()  # Reject (no availability)
        
        db.update(from_account, -amount)
        db.update(to_account, +amount)
        db.commit()  # Waits for majority (consistency)
```

### Choose AP When:
✅ **Availability is critical**: Social media, messaging
✅ **Stale data acceptable**: Like counts, view counts
✅ **Eventually consistent OK**: DNS, caching
✅ **High-scale reads**: Global distribution needed

**Example**: Social media likes
```python
# AP system preferred
# Stale likes OK: 1,234 vs 1,240 (user doesn't notice)
# Low latency matters: <10ms response

def like_post(user_id, post_id):
    # Write to nearest datacenter (AP)
    local_db.increment(f'likes:{post_id}')
    
    # Asynchronously replicate
    replicate_async(other_datacenters, post_id)
    
    return {"status": "liked", "latency_ms": 5}  # Always available
```

---

## 🔧 Tunable Consistency (Hybrid Approach)

Many modern databases allow **tuning** the CP vs AP trade-off:

### **Cassandra Tunable Consistency**
```python
# AP mode (availability)
session.execute(query, consistency_level=ConsistencyLevel.ONE)

# CP mode (consistency)
session.execute(query, consistency_level=ConsistencyLevel.QUORUM)

# Strictest CP mode
session.execute(query, consistency_level=ConsistencyLevel.ALL)
```

### **DynamoDB Tunable Consistency**
```python
# AP mode (default)
table.get_item(Key={'id': '123'})

# CP mode (strong consistency)
table.get_item(Key={'id': '123'}, ConsistentRead=True)
```

### **MongoDB Tunable Consistency**
```python
# AP mode
collection.find().read_concern('local')

# CP mode
collection.find().read_concern('majority')
```

---

## 🎓 Interview Tips

**Q: "Explain CAP theorem."**

A: "CAP theorem: In a distributed system with network partitions, you can only guarantee 2 out of 3:
- **C**onsistency (all nodes see same data)
- **A**vailability (always respond)
- **P**artition tolerance (work during network failures)

In practice, networks DO partition, so choice is **CP** (reject requests during partition to stay consistent) vs **AP** (respond with potentially stale data)."

**Q: "Is [database X] CP or AP?"**

A: "Depends on configuration:
- **Cassandra**: AP by default (ONE), CP with QUORUM/ALL
- **MongoDB**: CP with majority writes, AP with local reads
- **DynamoDB**: AP by default, CP with ConsistentRead=True

Modern databases are **tunable** - you choose CP or AP per operation!"

**Q: "When would you choose CP over AP?"**

A: "Choose CP when:
- **Critical data**: Banking, inventory, payments
- **Can't serve stale**: Account balances must be accurate
- **Outage acceptable**: Better to show error than wrong data

Choose AP when:
- **High availability needed**: 99.99%+ uptime
- **Stale data OK**: Like counts, view counts
- **Low latency critical**: <10ms response time"

---

## 🔗 Related Topics
- **90. PACELC Theorem** - Extended CAP with latency
- **86. Strong vs Eventual Consistency** - Consistency models
- **91. Quorum-Based Systems** - CP implementation
- **92. Conflict Resolution** - AP implementation

---

## 📚 Summary

**CAP Theorem**: Pick 2 of 3 (C, A, P)

**In practice**: Networks partition → Choose CP or AP

**CP Systems** (Consistency + Partition Tolerance):
- Reject requests during partition
- Examples: Zookeeper, etcd, HBase

**AP Systems** (Availability + Partition Tolerance):
- Always respond (may be stale)
- Examples: Cassandra, DynamoDB, Riak

**Modern databases**: Tunable consistency (choose CP or AP per operation)

**Golden rule**: Use **weakest consistency** that meets business needs! 🎯
