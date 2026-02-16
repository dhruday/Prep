# 107. Clock Skew & Time Synchronization

## 📌 Overview

**Clock skew** is the difference in time between clocks on different machines. In distributed systems, clocks are **never perfectly synchronized**, causing ordering and consistency issues.

**Key insight**: You cannot rely on timestamps for ordering in distributed systems.

---

## 🎯 The Problem: Clocks Drift

### **Clock Drift**
```
Real Time:  0s ─────→ 1s ─────→ 2s ─────→ 3s

Server 1:   0s ─────→ 1.001s ──→ 2.002s ──→ 3.003s (fast)
Server 2:   0s ─────→ 0.999s ──→ 1.998s ──→ 2.997s (slow)

Clock skew at 3s:
- Server 1: +3ms (fast)
- Server 2: -3ms (slow)
- Difference: 6ms

Over 1 day: ~250ms skew (typical)
Over 1 month: Several seconds skew
```

**Causes of Clock Drift**:
- Hardware imperfections (crystal oscillator variance)
- Temperature changes
- Voltage fluctuations
- Aging hardware

---

## 🎯 Why Clock Skew Matters

### **1. Incorrect Event Ordering**
```
Scenario: Distributed log

Server 1 (clock: 10:00:00.000):
  Event A: "User logged in" → timestamp: 10:00:00.000

Server 2 (clock: 09:59:59.900):
  Event B: "User logged out" → timestamp: 09:59:59.900

Merged log (sorted by timestamp):
  09:59:59.900: User logged out   ← BEFORE
  10:00:00.000: User logged in    ← AFTER

Logical order: Login should come before logout ❌
```

### **2. Stale Cache Reads**
```
Time:  10:00:00.000

Database (clock: 10:00:00.000):
  Write: balance = $1000, updated_at = 10:00:00.000

Cache (clock: 09:59:59.900):
  Old value: balance = $500, updated_at = 09:59:59.800
  
Cache checks: "Is my value fresh?"
  cache_time (09:59:59.800) < db_time (10:00:00.000)?
  But cache clock is 100ms behind!
  Cache thinks: 09:59:59.800 < 09:59:59.900 → stale ✓
  
Wrong! Should read from DB, but cache returns $500 ❌
```

### **3. Distributed Lock Issues**
```
Lock with TTL (Time-To-Live)

Server 1 (clock: 10:00:00.000):
  Acquire lock, expires at 10:00:10.000 (10 seconds)

Server 2 (clock: 10:00:00.500):
  Tries to acquire lock
  Checks: current_time (10:00:00.500) < expiry (10:00:10.000)?
  But Server 2 clock is 500ms ahead!
  Server 2 thinks: 10:00:00.500 < 10:00:09.500 → lock still valid ✓
  
Server 1 thinks lock expires at 10:00:10.000
Server 2 thinks lock expires at 10:00:09.500
→ Both acquire lock! ❌
```

---

## 🛠️ Time Synchronization: NTP

### **Network Time Protocol (NTP)**

```
Client                      NTP Server (accurate clock)
  │                              │
  │──────t1: Request────────────>│
  │                              │ t2: Receive
  │                              │ t3: Send
  │<─────t4: Response────────────│
  │
  ▼
Calculate offset and adjust local clock
```

**NTP Calculation**:
```python
def calculate_ntp_offset(t1, t2, t3, t4):
    """
    t1: Client sends request
    t2: Server receives request
    t3: Server sends response
    t4: Client receives response
    """
    # Round-trip time
    rtt = (t4 - t1) - (t3 - t2)
    
    # Clock offset (how much client is ahead/behind)
    offset = ((t2 - t1) + (t3 - t4)) / 2
    
    return offset

# Example
t1 = 100.000  # Client sends at 100.000s
t2 = 100.050  # Server receives at 100.050s (server clock)
t3 = 100.051  # Server responds at 100.051s
t4 = 100.101  # Client receives at 100.101s

offset = ((100.050 - 100.000) + (100.051 - 100.101)) / 2
       = (0.050 - 0.050) / 2
       = 0.0  # Clocks in sync ✓

# If client clock is 10ms fast:
t1 = 100.010  # Client thinks it's 100.010s
t2 = 100.000  # Server receives (actual time)
t3 = 100.001  # Server responds
t4 = 100.011  # Client receives (thinks it's 100.011s)

offset = ((100.000 - 100.010) + (100.001 - 100.011)) / 2
       = (-0.010 - 0.010) / 2
       = -0.010  # Client is 10ms fast, adjust -10ms
```

### **NTP Accuracy**
```
Internet: 1-50ms accuracy
LAN: 1-5ms accuracy
GPS-based: <1ms accuracy

Sync frequency: Every 64-1024 seconds (adaptive)
```

---

## 🎯 Handling Clock Skew in Code

### **1. Avoid Absolute Timestamps for Ordering**

```python
# Bad: Use timestamps for ordering
def compare_events(event1, event2):
    return event1['timestamp'] < event2['timestamp']  ❌
    # Clock skew → wrong order

# Good: Use logical clocks (Lamport timestamps)
def compare_events(event1, event2):
    return event1['lamport_clock'] < event2['lamport_clock']  ✓
```

### **2. Use Monotonic Clocks for Timeouts**

```python
import time

# Bad: Wall clock (affected by NTP adjustments)
start = time.time()
expensive_operation()
elapsed = time.time() - start  # ❌ May be negative if clock adjusted!

# Good: Monotonic clock (always increases)
start = time.monotonic()
expensive_operation()
elapsed = time.monotonic() - start  # ✓ Always positive
```

### **3. Add Clock Skew Tolerance**

```python
# Cache freshness check with tolerance
def is_cache_fresh(cache_time, db_time, tolerance=1.0):
    """
    tolerance: Allow 1 second clock skew
    """
    if db_time - cache_time > tolerance:
        return False  # Definitely stale
    else:
        return True  # Fresh enough (within tolerance)

# Example
cache_time = 100.000
db_time = 100.500
is_cache_fresh(cache_time, db_time, tolerance=1.0)  # True (within 1s)

cache_time = 100.000
db_time = 101.500
is_cache_fresh(cache_time, db_time, tolerance=1.0)  # False (>1s stale)
```

### **4. Use Server-Side Timestamps**

```python
# Bad: Client sends timestamp
@app.route('/create_order', methods=['POST'])
def create_order():
    order_time = request.json['timestamp']  # ❌ Client clock may be wrong
    db.insert('orders', order_time)

# Good: Server generates timestamp
@app.route('/create_order', methods=['POST'])
def create_order():
    order_time = time.time()  # ✓ Server clock (consistent)
    db.insert('orders', order_time)
```

---

## 🎯 Logical Clocks

### **Lamport Timestamps**

**Idea**: Track event ordering without relying on physical clocks.

```python
class LamportClock:
    def __init__(self):
        self.clock = 0
    
    def tick(self):
        """Increment on local event"""
        self.clock += 1
        return self.clock
    
    def update(self, received_time):
        """Update on receiving message"""
        self.clock = max(self.clock, received_time) + 1
        return self.clock

# Example
node1 = LamportClock()
node2 = LamportClock()

# Node 1 events
t1 = node1.tick()  # t1 = 1 (local event)
t2 = node1.tick()  # t2 = 2 (local event)

# Node 1 sends message to Node 2 with t2 = 2
# Node 2 receives message
t3 = node2.update(t2)  # t3 = max(0, 2) + 1 = 3

# Node 2 local event
t4 = node2.tick()  # t4 = 4

# Ordering: t1 < t2 < t3 < t4 ✓
```

**Property**: If A → B (A happens before B), then clock(A) < clock(B)

---

### **Vector Clocks**

**Idea**: Track causality across all nodes.

```python
class VectorClock:
    def __init__(self, node_id, num_nodes):
        self.node_id = node_id
        self.clock = [0] * num_nodes  # [0, 0, 0] for 3 nodes
    
    def tick(self):
        """Increment own position"""
        self.clock[self.node_id] += 1
        return self.clock.copy()
    
    def update(self, received_clock):
        """Merge with received clock"""
        for i in range(len(self.clock)):
            self.clock[i] = max(self.clock[i], received_clock[i])
        self.clock[self.node_id] += 1
        return self.clock.copy()
    
    def happens_before(self, other):
        """Check if this happened before other"""
        less = False
        for i in range(len(self.clock)):
            if self.clock[i] > other[i]:
                return False  # Not happens-before
            if self.clock[i] < other[i]:
                less = True
        return less

# Example: 3 nodes
node0 = VectorClock(0, 3)
node1 = VectorClock(1, 3)
node2 = VectorClock(2, 3)

# Node 0 event
c1 = node0.tick()  # [1, 0, 0]

# Node 0 sends to Node 1
c2 = node1.update(c1)  # [1, 1, 0] = max([1,0,0], [0,0,0]) + tick

# Node 1 sends to Node 2
c3 = node2.update(c2)  # [1, 1, 1] = max([1,1,0], [0,0,0]) + tick

# Check causality
node0.happens_before(c2)  # True: [1,0,0] < [1,1,0]
node1.happens_before(c3)  # True: [1,1,0] < [1,1,1]
```

**Property**: Captures causality (if A → B, vector_clock(A) < vector_clock(B))

---

## 🎯 Real-World Examples

### **1. Google Spanner TrueTime**

```
TrueTime API:
- TT.now() returns [earliest, latest] interval
- Uncertainty: ±7ms (GPS + atomic clocks)

Example:
TT.now() = [10.000s, 10.014s]
         = "Real time is between 10.000s and 10.014s"

Transaction commit:
1. Start commit at t_start = TT.now().earliest
2. Wait until t_start < TT.now().latest (commit wait)
3. Guaranteed all earlier transactions committed

Result: Globally consistent reads without coordination
```

### **2. AWS Time Sync Service**

```bash
# Amazon Time Sync Service (NTP)
# Available at 169.254.169.123

# Configure NTP client
server 169.254.169.123 prefer iburst minpoll 4 maxpoll 4

# Accuracy: Sub-millisecond within AWS region
# Uses GPS + atomic clocks
```

### **3. Cassandra Write Timestamps**

```python
# Cassandra uses timestamps for conflict resolution
INSERT INTO users (id, name) VALUES (1, 'Alice')
  USING TIMESTAMP 1609459200000000;  # Microseconds

# If two writes conflict, highest timestamp wins (LWW)

# Problem: Clock skew can cause data loss
Server 1 (clock ahead): timestamp = 1609459200000000
Server 2 (clock behind): timestamp = 1609459100000000

Server 2 writes after Server 1, but lower timestamp → overwritten ❌

# Solution: Use NTP, monitor clock skew
```

---

## ✅ Best Practices

1. **Use NTP for Time Sync**
```bash
# Install NTP daemon
sudo apt-get install ntp

# Configure NTP servers (use multiple for redundancy)
server 0.pool.ntp.org
server 1.pool.ntp.org
server 2.pool.ntp.org
```

2. **Monitor Clock Skew**
```python
def check_clock_skew(servers):
    times = []
    for server in servers:
        server_time = requests.get(f'{server}/time').json()['time']
        times.append(server_time)
    
    max_skew = max(times) - min(times)
    if max_skew > 1.0:  # 1 second
        alert(f"Clock skew detected: {max_skew}s")
```

3. **Use Logical Clocks for Ordering**
```python
# Don't rely on physical timestamps
# Use Lamport or Vector clocks for causality
```

4. **Add Tolerance for Comparisons**
```python
# When comparing timestamps, allow tolerance
if abs(time1 - time2) < tolerance:
    # Treat as "same time"
```

---

## 🎓 Interview Tips

**Q: "What is clock skew and why is it a problem?"**

A: "Clock skew is the time difference between clocks on different machines. Clocks drift due to hardware imperfections (typical: 250ms/day).

Problems:
- **Wrong ordering**: Event A (timestamp 10:00:00.000) vs Event B (09:59:59.900) → sorted incorrectly
- **Stale reads**: Cache thinks data is fresh due to clock behind
- **Lock issues**: Two servers think they own lock simultaneously

Solutions:
- **NTP**: Synchronize clocks (1-50ms accuracy)
- **Logical clocks**: Lamport/Vector clocks for ordering without physical time
- **Tolerance**: Allow ±1s tolerance in comparisons"

**Q: "How do logical clocks solve the clock skew problem?"**

A: "Logical clocks track event ordering without physical time:

**Lamport Clock**:
- Counter increments on local event
- On message receive: clock = max(local, received) + 1
- Guarantees: if A → B, then clock(A) < clock(B)

**Vector Clock**:
- Array of counters [Node0, Node1, Node2]
- Tracks causality across all nodes
- Detects concurrent events (conflicts)

Example: Cassandra uses timestamps for conflict resolution. With clock skew, wrong data may win. Solution: Monitor clock skew, use NTP, or use logical clocks (CRDTs)."

---

## 🔗 Related Topics
- **106. Heartbeats** - Use monotonic clocks
- **108. Consensus Basics** - Agreement without clocks
- **92. Conflict Resolution** - LWW timestamp issues
- **85. Consistency Models** - Ordering guarantees

---

## 📚 Summary

**Clock Skew**: Time difference between machines (typical: 250ms/day)

**Problems**: Wrong ordering, stale reads, lock conflicts

**Solutions**:
- **NTP**: Sync clocks (1-50ms accuracy)
- **Logical clocks**: Lamport/Vector for ordering
- **Monotonic clocks**: For timeouts/durations
- **Tolerance**: Allow ±1s in comparisons

**Best Practice**: Don't trust timestamps for ordering in distributed systems 🚀
