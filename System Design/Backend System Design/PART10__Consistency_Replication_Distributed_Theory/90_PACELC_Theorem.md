# 90. PACELC Theorem

## 📌 Overview

**PACELC** extends the CAP theorem by adding **latency** considerations:

- **If Partition** (P): Choose between Availability (A) and Consistency (C)
- **Else** (E): Choose between Latency (L) and Consistency (C)

**Formula**: **PA/EL** vs **PC/EC**

---

## 🎯 The Complete Trade-off

### CAP Theorem (Incomplete)
```
CAP only addresses partition scenarios
What about normal operation (no partition)?
```

### PACELC Theorem (Complete)
```
┌────────────────────────────────────────┐
│ DURING PARTITION:  Choose A or C      │
│ NORMAL OPERATION:  Choose L or C      │
└────────────────────────────────────────┘

If Partition → Availability vs Consistency
Else (no partition) → Latency vs Consistency
```

---

## 📊 System Classification

### **PA/EL Systems** (Favor Availability & Latency)
```
Partition: Choose Availability (A)
Normal: Choose Latency (L)

Trade-off: Fast and available, but eventually consistent
```

**Examples**:
- **Cassandra**: Always available, low latency, eventual consistency
- **DynamoDB**: Fast reads/writes, eventual consistency by default
- **Riak**: Multi-master, always available

```python
# Cassandra (PA/EL)
# During partition: Continue serving requests (A)
# Normal operation: Fast responses (L), eventual consistency

session.execute(
    "SELECT * FROM users WHERE id = ?",
    [user_id],
    consistency_level=ConsistencyLevel.ONE  # Fast but eventually consistent
)

# Latency: 1-5ms (low latency)
# Consistency: Eventual
```

---

### **PC/EC Systems** (Favor Consistency)
```
Partition: Choose Consistency (C)
Normal: Choose Consistency (C)

Trade-off: Slower and less available, but strongly consistent
```

**Examples**:
- **Zookeeper**: Strong consistency always, reject during partition
- **etcd**: Raft consensus, strong consistency
- **HBase**: Single master, strong consistency

```python
# Zookeeper (PC/EC)
# During partition: Reject requests if no quorum (C over A)
# Normal operation: Wait for consensus (C over L)

zk.create('/config', b'value')  # Waits for majority

# Latency: 20-100ms (higher latency for consistency)
# Consistency: Strong
```

---

### **PA/EC Systems** (Availability during partition, Consistency normally)
```
Partition: Choose Availability (A)
Normal: Choose Consistency (C)

Hybrid: Available during partition but consistent when possible
```

**Examples**:
- **MongoDB**: Strong consistency normally, eventual during partition

```python
# MongoDB (PA/EC)
# Normal operation: Strong consistency (majority writes)
collection.insert_one(
    {'name': 'Alice'},
    write_concern={'w': 'majority'}  # EC: Strong consistency
)

# During partition: Degrade to eventual consistency (availability)
```

---

### **PC/EL Systems** (Consistency during partition, Latency normally)
```
Partition: Choose Consistency (C)
Normal: Choose Latency (L)

Rare: Strong during partition, fast normally
```

**Example**: **BigTable** with conditional strong consistency

---

## 🔍 Detailed Comparison

| System | Classification | Partition Behavior | Normal Latency | Use Case |
|--------|----------------|-------------------|----------------|----------|
| **Cassandra** | PA/EL | Available | 1-5ms | Social media, IoT |
| **DynamoDB** | PA/EL (tunable to PC/EC) | Available | 1-10ms | Cloud apps |
| **Riak** | PA/EL | Available | 1-5ms | High availability |
| **MongoDB** | PA/EC | Degrade to available | 10-50ms | General purpose |
| **Zookeeper** | PC/EC | Reject | 20-100ms | Config, locks |
| **etcd** | PC/EC | Reject | 20-100ms | Kubernetes |
| **HBase** | PC/EC | Reject | 20-100ms | Analytics |
| **Spanner** | PC/EC | Reject | 50-200ms | Global SQL |

---

## 🛠️ Real-World Trade-offs

### **Social Media (PA/EL)**
```python
# Facebook likes counter
# Partition: Continue serving (availability)
# Normal: Fast response (latency)

def like_post(post_id):
    local_db.increment(f'likes:{post_id}')  # 1ms latency
    replicate_async(other_dcs)  # Eventual consistency
    
    return {"status": "liked", "latency": "1ms"}

# Trade-off: Like count may be stale (1,234 vs 1,240)
# Benefit: 99.99% availability, <5ms latency
```

### **Banking (PC/EC)**
```python
# Bank transfer
# Partition: Reject (consistency critical)
# Normal: Wait for consensus (strong consistency)

def transfer(from_account, to_account, amount):
    with transaction(isolation='SERIALIZABLE'):
        db.write_with_quorum(from_account, -amount)  # 50ms latency
        db.write_with_quorum(to_account, +amount)
        
        return {"status": "transferred", "latency": "50ms"}

# Trade-off: Higher latency (50ms), lower availability (99.9%)
# Benefit: No double-spend, always correct balance
```

---

## 📈 Latency Comparison

```
┌──────────────────────────────────────────┐
│ System Type    Partition  Normal         │
├──────────────────────────────────────────┤
│ PA/EL          Available  1-5ms          │
│ PC/EC          Reject     20-100ms       │
│ PA/EC          Available  10-50ms        │
│ PC/EL          Reject     1-5ms (rare)   │
└──────────────────────────────────────────┘
```

---

## 🎯 Choosing PA/EL vs PC/EC

### Choose PA/EL When:
✅ Low latency critical (<10ms)
✅ High availability needed (99.99%+)
✅ Stale data acceptable
✅ Global distribution

**Examples**: Social media, caching, analytics, IoT

### Choose PC/EC When:
✅ Correctness critical
✅ Strong consistency required
✅ Can tolerate higher latency (50-200ms)
✅ ACID transactions needed

**Examples**: Banking, inventory, payments, bookings

---

## 🎓 Interview Tips

**Q: "What is PACELC theorem?"**

A: "PACELC extends CAP by adding latency:
- **If Partition**: Choose Availability (A) or Consistency (C)
- **Else (normal)**: Choose Latency (L) or Consistency (C)

CAP only covers partition scenarios. PACELC covers both partition and normal operation."

**Q: "Is Cassandra PA/EL or PC/EC?"**

A: "Cassandra is **PA/EL**:
- **Partition**: Continues serving (Availability)
- **Normal**: Fast responses 1-5ms (Latency) with eventual consistency

Can be tuned to PC/EC with QUORUM/ALL consistency levels."

---

## 🔗 Related Topics
- **89. CAP Theorem** - Foundation
- **86. Strong vs Eventual Consistency** - Consistency models
- **91. Quorum-Based Systems** - PC/EC implementation
- **88. Replication Lag** - EL trade-off

---

## 📚 Summary

**PACELC** = **P**(artition) **A**/**C** + **E**(lse) **L**/**C**

**PA/EL**: Fast and available (Cassandra, DynamoDB)
**PC/EC**: Consistent always (Zookeeper, etcd)
**PA/EC**: Hybrid (MongoDB)

**Key Insight**: Even without partitions, you trade **latency** for **consistency**! 🎯
