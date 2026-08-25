# 103. Distributed Systems Fundamentals

## 📌 Overview

A **distributed system** is a collection of independent computers (nodes) that appear to users as a single coherent system. Nodes communicate over a network to coordinate actions and share resources.

**Key characteristic**: No single node has complete knowledge of the entire system state.

---

## 🎯 Why Distributed Systems?

### **Single Machine Limits**
```
Single Server:
├─ Limited CPU (vertical scaling ceiling)
├─ Limited RAM (expensive beyond 1TB)
├─ Limited Storage (expensive beyond tens of TB)
├─ Single Point of Failure (no redundancy)
└─ Geographic limitations (users far away = high latency)

Solution: Distribute across multiple machines
```

### **Benefits**
1. **Scalability**: Add more nodes for more capacity
2. **Availability**: One node fails → others continue
3. **Performance**: Parallel processing, data locality
4. **Geographic distribution**: Serve users from nearby nodes

---

## 🏗️ Distributed System Architecture

### **Basic Topology**
```
                    ┌──────────┐
                    │  Client  │
                    └─────┬────┘
                          │
                    ┌─────▼─────┐
                    │Load Balance│
                    └──┬─────┬──┘
                       │     │
            ┌──────────┴┐   └┐─────────┐
            ▼           ▼     ▼         ▼
        ┌──────┐    ┌──────┐ ┌──────┐ ┌──────┐
        │Node 1│────│Node 2│ │Node 3│ │Node 4│
        └──────┘    └──────┘ └──────┘ └──────┘
            │           │        │        │
            └───────────┴────────┴────────┘
                    Network
```

---

## 🎯 Challenges of Distributed Systems

### **1. Network Failures**
```
Node A ────X──── Node B
       (Network partition)

- Packets lost
- Delays unpredictable
- Partitions split system
```

**Example**:
```python
# Network call may fail at any time
try:
    response = requests.post('http://node2:8080/data', json=data, timeout=5)
except requests.Timeout:
    # Network too slow
    handle_timeout()
except requests.ConnectionError:
    # Node unreachable
    handle_failure()
```

### **2. Partial Failures**
```
System State:
├─ Node 1: Running ✓
├─ Node 2: Crashed ❌
├─ Node 3: Running but slow 🐢
└─ Node 4: Network partition ⚠️

Some nodes work, some fail → complex state
```

### **3. Concurrency**
```
Time →
Node 1: Read(X=10) ────────→ Write(X=20)
Node 2:        Read(X=10) ────────→ Write(X=15)

Result: X = ??? (Lost update problem)
```

### **4. No Global Clock**
```
Node 1 clock: 10:00:00.000
Node 2 clock: 10:00:00.050  (50ms ahead)
Node 3 clock: 09:59:59.980  (20ms behind)

Can't rely on timestamps for ordering!
```

---

## 📊 Fallacies of Distributed Computing

Eight false assumptions developers make:

1. **The network is reliable** ❌
   - Packets drop, connections fail
   
2. **Latency is zero** ❌
   - Network calls: 1-100ms+
   
3. **Bandwidth is infinite** ❌
   - Large payloads = slow transfers
   
4. **The network is secure** ❌
   - Man-in-the-middle attacks
   
5. **Topology doesn't change** ❌
   - Nodes added/removed dynamically
   
6. **There is one administrator** ❌
   - Multiple teams manage different nodes
   
7. **Transport cost is zero** ❌
   - Network bandwidth costs money
   
8. **The network is homogeneous** ❌
   - Different protocols, versions

---

## 🛠️ Building Blocks

### **1. Communication**
```python
# RPC (Remote Procedure Call)
def get_user_balance(user_id):
    # Looks like local call, actually remote
    return rpc_client.call('UserService.getBalance', user_id)

# Message Passing
def send_order(order):
    # Asynchronous communication
    queue.send('orders', order)
```

### **2. Coordination**
```python
# Distributed Lock
with distributed_lock('resource-123'):
    # Only one node executes this at a time
    critical_section()

# Leader Election
if am_i_leader():
    # Only leader performs this action
    coordinate_work()
```

### **3. Consensus**
```python
# Multiple nodes agree on a value
def propose_value(value):
    # Paxos/Raft consensus
    votes = []
    for node in cluster:
        vote = node.vote(value)
        votes.append(vote)
    
    if majority_agreed(votes):
        commit(value)
```

---

## 🎯 Real-World Examples

### **1. Google Search**
```
Distributed System:
├─ Frontend servers (thousands globally)
├─ Index servers (distributed index)
├─ Document servers (distributed storage)
└─ Crawlers (distributed web crawling)

Search query:
1. User → Nearest frontend
2. Frontend → Multiple index servers (parallel)
3. Index servers → Document servers
4. Aggregate results
5. Return to user (< 200ms)
```

### **2. Netflix Streaming**
```
Distributed Components:
├─ CDN (Edge caches worldwide)
├─ Origin servers (Master video storage)
├─ Encoding pipeline (Distributed transcoding)
├─ Recommendation engine (Distributed ML)
└─ Billing (Distributed database)

Video playback:
1. User requests video
2. Nearest CDN edge serves chunks
3. If cache miss → Origin server
4. Stream adapts to bandwidth
```

### **3. Amazon E-commerce**
```
Microservices (Distributed System):
├─ Product catalog service
├─ Inventory service
├─ Shopping cart service
├─ Payment service
├─ Shipping service
├─ Recommendation service
└─ Review service

Each service:
- Multiple instances (redundancy)
- Independent database (decoupling)
- Load balanced (scalability)
```

---

## 📊 Distributed System Models

### **1. Client-Server**
```
Client → Request → Server
       ← Response ←
       
Simple but server is bottleneck
```

### **2. Peer-to-Peer**
```
Node A ←→ Node B
  ↕         ↕
Node C ←→ Node D

No central server, nodes equal
```

### **3. Master-Slave**
```
Master (Read/Write)
  ├─→ Slave 1 (Read-only)
  ├─→ Slave 2 (Read-only)
  └─→ Slave 3 (Read-only)

Master coordinates, slaves replicate
```

### **4. Multi-Master**
```
Master 1 ←→ Master 2
    ↕           ↕
Master 3 ←→ Master 4

All nodes accept writes (complex consistency)
```

---

## 🔧 Designing for Distribution

### **Principles**

1. **Design for Failure**
```python
# Assume everything fails
def call_service(url, data, max_retries=3):
    for attempt in range(max_retries):
        try:
            return requests.post(url, json=data, timeout=5)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
```

2. **Avoid Distributed Transactions**
```python
# Bad: Two-phase commit across services
@transaction
def place_order():
    inventory_service.reserve(item)  # Network call
    payment_service.charge(amount)   # Network call
    # If payment fails, inventory rollback = complex

# Good: Eventual consistency with saga pattern
def place_order():
    order_id = create_order()  # Local
    queue.send('reserve-inventory', order_id)  # Async
    queue.send('process-payment', order_id)    # Async
    # Each service handles its own failures
```

3. **Idempotency**
```python
# Network retries may duplicate requests
def process_payment(payment_id, amount):
    # Check if already processed
    if db.exists('payments', payment_id):
        return db.get('payments', payment_id)
    
    # Process only once
    result = charge_card(amount)
    db.insert('payments', payment_id, result)
    return result
```

4. **Eventual Consistency**
```python
# Don't require immediate consistency
def update_user_profile(user_id, data):
    # Write to master
    master_db.update(user_id, data)
    
    # Replicas update asynchronously
    # Reads may see stale data briefly (acceptable)
```

---

## ✅ Benefits vs Complexity

| Aspect | Benefit | Complexity |
|--------|---------|------------|
| **Scalability** | Add nodes = more capacity | Coordination overhead |
| **Availability** | Node failure = others continue | Consensus protocols |
| **Performance** | Parallel processing | Network latency |
| **Geography** | Data locality | Clock synchronization |

---

## 🎓 Interview Tips

**Q: "What is a distributed system?"**

A: "A distributed system is multiple independent computers working together as one system. Examples: Google Search (thousands of servers), Netflix (CDN + origin), Amazon (microservices).

Key challenges:
- **Network failures** (unreliable communication)
- **Partial failures** (some nodes fail)
- **No global clock** (time synchronization)
- **Concurrency** (multiple nodes update same data)

Why use: Scalability (handle more load), Availability (redundancy), Performance (parallel processing)."

**Q: "What are the main challenges in distributed systems?"**

A: "Top challenges:
1. **Network is unreliable**: Packets lost, delays unpredictable
2. **Partial failures**: Some nodes work, some fail (complex state)
3. **Consistency**: Multiple nodes updating data (race conditions)
4. **Time**: No global clock (can't rely on timestamps)

Mitigation:
- Retries + timeouts (network)
- Health checks + redundancy (failures)
- Consensus protocols (consistency)
- Logical clocks (ordering)"

---

## 🔗 Related Topics
- **104. Leader Election** - Coordination
- **105. Distributed Locks** - Synchronization
- **89. CAP Theorem** - Consistency trade-offs
- **108. Consensus Basics** - Agreement protocols

---

## 📚 Summary

**Distributed System**: Multiple nodes appearing as one system

**Why**: Scalability, Availability, Performance, Geography

**Challenges**: Network failures, Partial failures, Concurrency, No global clock

**Principles**: Design for failure, Avoid distributed transactions, Idempotency, Eventual consistency

**Examples**: Google Search, Netflix, Amazon (all distributed) 🚀
