# 92. Conflict Resolution Strategies

## 📌 Overview

In **eventually consistent** systems, concurrent writes to different replicas can create **conflicts**. **Conflict resolution** determines which value to keep.

---

## 🎯 The Problem

```
Time →
┌──────────────────────────────────────────────┐
│ Replica A: User writes balance = 1000       │
│ Replica B: User writes balance = 1500       │
│ (Concurrent writes, network partition)      │
│                                              │
│ Later: Replicas sync                         │
│ ❓ Which value to keep? 1000 or 1500?      │
└──────────────────────────────────────────────┘
```

---

## 🛠️ Common Strategies

### **1. Last-Write-Wins (LWW)**

**Rule**: Keep value with **latest timestamp**.

```python
class LastWriteWins:
    def resolve(self, value1, value2):
        if value1['timestamp'] > value2['timestamp']:
            return value1
        elif value2['timestamp'] > value1['timestamp']:
            return value2
        else:
            # Tie-breaker: Use node ID
            return value1 if value1['node_id'] > value2['node_id'] else value2

# Example
lww = LastWriteWins()

v1 = {'value': 1000, 'timestamp': 1000, 'node_id': 'A'}
v2 = {'value': 1500, 'timestamp': 1005, 'node_id': 'B'}

result = lww.resolve(v1, v2)  # Returns v2 (newer timestamp)
```

**Pros**: Simple, deterministic
**Cons**: **Data loss** (earlier write discarded)

**Use Case**: Cassandra, Riak, DynamoDB

---

### **2. Version Vectors (Vector Clocks)**

**Rule**: Track **causality**, keep both if concurrent.

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
                return False
            if self.clock[i] < other.clock[i]:
                less = True
        return less
    
    def concurrent(self, other):
        """Check if concurrent (neither happens-before)"""
        return not self.happens_before(other) and not other.happens_before(self)

# Example
vc1 = VectorClock(0, 3)
vc1.increment()  # [1, 0, 0]

vc2 = VectorClock(1, 3)
vc2.increment()  # [0, 1, 0]

if vc1.concurrent(vc2):
    print("Conflict! Keep both values")
    # Application must resolve (e.g., merge shopping cart)
```

**Pros**: Preserves causality, no data loss
**Cons**: Complex, requires application logic to merge

**Use Case**: Riak, Voldemort, shopping carts

---

### **3. CRDTs (Conflict-Free Replicated Data Types)**

**Rule**: Data structure **automatically merges** conflicts.

#### **G-Counter (Grow-Only Counter)**
```python
class GCounter:
    """Increment-only counter (no decrement)"""
    def __init__(self, node_id, num_nodes):
        self.node_id = node_id
        self.counts = [0] * num_nodes
    
    def increment(self, amount=1):
        self.counts[self.node_id] += amount
    
    def value(self):
        return sum(self.counts)
    
    def merge(self, other):
        """Merge with another replica (conflict-free!)"""
        for i in range(len(self.counts)):
            self.counts[i] = max(self.counts[i], other.counts[i])

# Example
node1 = GCounter(0, 2)
node1.increment()  # [1, 0]

node2 = GCounter(1, 2)
node2.increment()
node2.increment()  # [0, 2]

# Merge replicas (no conflict!)
node1.merge(node2)
print(node1.value())  # 3 = 1 + 2
```

#### **PN-Counter (Positive-Negative Counter)**
```python
class PNCounter:
    """Increment + Decrement counter"""
    def __init__(self, node_id, num_nodes):
        self.node_id = node_id
        self.increments = [0] * num_nodes
        self.decrements = [0] * num_nodes
    
    def increment(self, amount=1):
        self.increments[self.node_id] += amount
    
    def decrement(self, amount=1):
        self.decrements[self.node_id] += amount
    
    def value(self):
        return sum(self.increments) - sum(self.decrements)
    
    def merge(self, other):
        for i in range(len(self.increments)):
            self.increments[i] = max(self.increments[i], other.increments[i])
            self.decrements[i] = max(self.decrements[i], other.decrements[i])
```

#### **LWW-Register (Last-Write-Wins Register)**
```python
class LWWRegister:
    """Single value with timestamp"""
    def __init__(self):
        self.value = None
        self.timestamp = 0
    
    def set(self, value, timestamp):
        if timestamp > self.timestamp:
            self.value = value
            self.timestamp = timestamp
    
    def merge(self, other):
        if other.timestamp > self.timestamp:
            self.value = other.value
            self.timestamp = other.timestamp
```

#### **OR-Set (Add-Remove Set)**
```python
class ORSet:
    """Set with add/remove operations"""
    def __init__(self):
        self.elements = {}  # element → set of unique tags
        self.next_tag = 0
    
    def add(self, element):
        tag = (id(self), self.next_tag)
        self.next_tag += 1
        
        if element not in self.elements:
            self.elements[element] = set()
        self.elements[element].add(tag)
    
    def remove(self, element):
        if element in self.elements:
            self.elements[element].clear()
    
    def contains(self, element):
        return element in self.elements and len(self.elements[element]) > 0
    
    def merge(self, other):
        for element, tags in other.elements.items():
            if element not in self.elements:
                self.elements[element] = set()
            self.elements[element].update(tags)
```

**Pros**: Automatic conflict resolution, no coordination
**Cons**: Limited data types, more memory

**Use Case**: Redis, Riak, collaborative editing

---

### **4. Application-Level Merge**

**Rule**: Let **application** decide how to merge.

```python
# Shopping cart example
class ShoppingCartMerge:
    def merge(self, cart1, cart2):
        """Merge two shopping carts"""
        merged = {}
        
        # Union of items
        all_items = set(cart1.keys()) | set(cart2.keys())
        
        for item in all_items:
            qty1 = cart1.get(item, 0)
            qty2 = cart2.get(item, 0)
            
            # Max quantity (user added item multiple times)
            merged[item] = max(qty1, qty2)
        
        return merged

# Example
cart_replica1 = {'apple': 2, 'banana': 1}
cart_replica2 = {'apple': 1, 'orange': 3}

merger = ShoppingCartMerge()
result = merger.merge(cart_replica1, cart_replica2)
# {'apple': 2, 'banana': 1, 'orange': 3}
```

**Use Case**: Amazon shopping cart, Google Docs

---

## 📊 Comparison

| Strategy | Data Loss | Complexity | Use Case |
|----------|-----------|------------|----------|
| **Last-Write-Wins** | Yes (discards earlier) | Low | Simple data (settings, config) |
| **Version Vectors** | No (keeps both) | High | Shopping cart, collaborative |
| **CRDTs** | No (automatic merge) | Medium | Counters, sets, registers |
| **Application Merge** | Depends | High | Complex business logic |

---

## 🏗️ Real-World Examples

### **Amazon DynamoDB - LWW**
```python
# DynamoDB uses Last-Write-Wins
table.put_item(Item={'id': '123', 'balance': 1000})
# Timestamp automatically added

# Later concurrent writes:
# Write 1: balance = 1000 (timestamp: 1000)
# Write 2: balance = 1500 (timestamp: 1005)
# Result: 1500 (newer timestamp wins)
```

### **Riak - Vector Clocks**
```python
# Riak tracks causality with vector clocks
obj = bucket.new('cart', data={'items': ['apple']})
obj.store()

# Concurrent updates create siblings
obj1 = bucket.get('cart')
obj1.data = {'items': ['apple', 'banana']}
obj1.store()

obj2 = bucket.get('cart')
obj2.data = {'items': ['apple', 'orange']}
obj2.store()

# Riak detects conflict, returns both siblings
obj = bucket.get('cart')
if obj.siblings:
    # Application must resolve
    merged = merge_shopping_carts(obj.siblings)
    bucket.new('cart', data=merged).store()
```

### **Redis - CRDTs**
```python
# Redis CRDT modules (Redis Enterprise)
r.execute_command('CRDT.COUNTER', 'likes', 'INCRBY', 1)

# Concurrent increments merge automatically
# Node 1: INCRBY 1
# Node 2: INCRBY 2
# Merge: 1 + 2 = 3 (no conflict)
```

---

## ✅ Best Practices

1. **Choose strategy based on data**:
   - Settings → LWW
   - Shopping cart → Vector clocks or app merge
   - Counters → CRDTs

2. **Minimize conflicts**:
   - Use unique keys (user-specific carts)
   - Route user to same replica (sticky sessions)

3. **Provide UI for conflicts**:
   - Show "Multiple versions found, pick one"
   - Google Docs conflict markers

4. **Test conflict scenarios**:
   - Simulate network partitions
   - Verify merge correctness

---

## 🎓 Interview Tips

**Q: "How do you resolve conflicts in eventually consistent systems?"**

A: "4 main strategies:
1. **Last-Write-Wins**: Keep newest timestamp (simple, data loss)
2. **Version Vectors**: Track causality, keep both if concurrent (complex)
3. **CRDTs**: Automatic merge (limited to specific data types)
4. **Application Merge**: Custom logic (e.g., union shopping carts)

Choice depends on data type and business requirements."

**Q: "What's the difference between LWW and vector clocks?"**

A: "LWW discards one value (data loss), vector clocks keep both concurrent values (application resolves). Example:
- LWW: balance=1000 vs balance=1500 → keep 1500 (newer)
- Vector clock: cart={apple} vs cart={orange} → keep both, merge to {apple,orange}"

---

## 🔗 Related Topics
- **85. Data Consistency Models** - Eventual consistency
- **86. Strong vs Eventual Consistency** - When conflicts occur
- **91. Quorum-Based Systems** - Preventing conflicts with quorums

---

## 📚 Summary

**Conflict Resolution Strategies**:
1. **LWW**: Simple, data loss (Cassandra, DynamoDB)
2. **Vector Clocks**: No data loss, complex (Riak, Voldemort)
3. **CRDTs**: Automatic, limited types (Redis, collaborative tools)
4. **Application Merge**: Custom logic (Amazon cart, Google Docs)

**Choose based on**: Data type, business requirements, complexity tolerance! 🎯
