# 106. Heartbeats

## 📌 Overview

A **heartbeat** is a periodic signal sent by a process to indicate "I'm alive". Other processes monitor heartbeats to detect failures.

**Analogy**: Like a pulse in medicine — if no pulse detected, assume dead.

---

## 🎯 Why Heartbeats?

### **Problem: Detecting Failures**
```
Question: Is Node 2 alive or dead?

Without Heartbeat:
├─ No way to know
├─ Wait indefinitely?
└─ Timeout? (How long?)

With Heartbeat:
├─ Node 2 sends "I'm alive" every 1 second
├─ If no heartbeat for 3 seconds → assume dead
└─ Take action (failover, re-election)
```

### **Use Cases**
1. **Leader election** (detect leader failure)
2. **Load balancer health checks** (remove dead servers)
3. **Master-slave replication** (promote slave if master dies)
4. **Distributed locks** (release lock if holder dies)
5. **Cluster membership** (track which nodes are active)

---

## 🏗️ Heartbeat Architecture

```
Sender (Heartbeat)                Receiver (Monitor)
┌──────────┐                      ┌──────────┐
│  Node 1  │──"Heartbeat"────────>│  Node 2  │
│          │  (every 1 sec)       │          │
│          │                      │Last seen: │
│          │                      │  t=1.0s  │
│          │                      │          │
│          │──"Heartbeat"────────>│Last seen: │
│          │  (1 sec later)       │  t=2.0s  │
│          │                      │          │
│  [CRASH] │                      │          │
│          │                      │Last seen: │
│          │                      │  t=2.0s  │
│          │                      │          │
│          │                      │Check:     │
│          │                      │t=5.0s     │
│          │                      │5.0-2.0>3s │
│          │                      │→ DEAD ❌  │
└──────────┘                      └──────────┘
```

---

## 🛠️ Basic Implementation

### **Simple Heartbeat (Python)**
```python
import time
import threading

class HeartbeatSender:
    def __init__(self, node_id, receiver_url, interval=1):
        self.node_id = node_id
        self.receiver_url = receiver_url
        self.interval = interval
        self.running = True
    
    def start(self):
        """Send heartbeat periodically"""
        def send_loop():
            while self.running:
                try:
                    requests.post(
                        f'{self.receiver_url}/heartbeat',
                        json={'node_id': self.node_id, 'timestamp': time.time()}
                    )
                except Exception as e:
                    print(f"Failed to send heartbeat: {e}")
                
                time.sleep(self.interval)
        
        thread = threading.Thread(target=send_loop, daemon=True)
        thread.start()
    
    def stop(self):
        self.running = False

class HeartbeatReceiver:
    def __init__(self, timeout=3):
        self.last_heartbeat = {}  # {node_id: timestamp}
        self.timeout = timeout
    
    def receive_heartbeat(self, node_id, timestamp):
        """Update last seen time"""
        self.last_heartbeat[node_id] = timestamp
        print(f"Received heartbeat from {node_id}")
    
    def check_health(self):
        """Check for dead nodes"""
        now = time.time()
        dead_nodes = []
        
        for node_id, last_seen in self.last_heartbeat.items():
            if now - last_seen > self.timeout:
                dead_nodes.append(node_id)
                print(f"Node {node_id} is DEAD (last seen: {now - last_seen:.1f}s ago)")
        
        return dead_nodes
    
    def monitor(self):
        """Continuously monitor health"""
        while True:
            dead_nodes = self.check_health()
            if dead_nodes:
                self.handle_failures(dead_nodes)
            time.sleep(1)
    
    def handle_failures(self, dead_nodes):
        """Take action for failed nodes"""
        for node_id in dead_nodes:
            # Remove from cluster
            del self.last_heartbeat[node_id]
            # Trigger failover, re-election, etc.

# Usage
sender = HeartbeatSender('node-1', 'http://monitor:8080', interval=1)
sender.start()

receiver = HeartbeatReceiver(timeout=3)
receiver.receive_heartbeat('node-1', time.time())
receiver.check_health()  # Returns [] (alive)

time.sleep(5)
receiver.check_health()  # Returns ['node-1'] (dead)
```

---

## 🎯 Heartbeat Patterns

### **1. Push-Based (Active Heartbeat)**
```
Node sends "I'm alive" periodically

Node 1 ─────"Heartbeat"────→ Monitor
         (every 1 second)

Pros: Simple
Cons: Network overhead (N nodes × M monitors)
```

```python
def push_heartbeat():
    while True:
        send_heartbeat_to_monitor()
        time.sleep(1)
```

### **2. Pull-Based (Health Check)**
```
Monitor asks "Are you alive?"

Monitor ─────"Health check?"────→ Node 1
        ←────"Yes, I'm alive"────

Pros: Monitor controls check frequency
Cons: Monitor must know all nodes
```

```python
def pull_health_check():
    for node in cluster:
        try:
            response = requests.get(f'{node}/health', timeout=1)
            if response.status_code == 200:
                mark_alive(node)
        except Exception:
            mark_dead(node)
```

### **3. Gossip Protocol**
```
Nodes exchange heartbeat info with peers

Node 1 ←→ Node 2
  ↕         ↕
Node 3 ←→ Node 4

Each node shares: "I've seen Node 1 at t=5s, Node 2 at t=3s..."

Pros: Scalable, no single monitor
Cons: Eventual consistency (lag in failure detection)
```

```python
def gossip_heartbeat():
    my_heartbeat = {'node_id': self.node_id, 'timestamp': time.time()}
    
    # Update my own heartbeat
    self.cluster_heartbeats[self.node_id] = my_heartbeat
    
    # Send to random peers
    peers = random.sample(self.cluster, k=3)
    for peer in peers:
        peer.share_heartbeats(self.cluster_heartbeats)
```

---

## 🎯 Tuning Heartbeat Parameters

### **Trade-offs**

```python
# Fast heartbeat = quick detection, high overhead
interval = 0.1  # 100ms
timeout = 0.3   # 300ms
# Detection time: 300ms ✓
# Network calls: 10/sec per node ❌

# Slow heartbeat = slow detection, low overhead
interval = 10   # 10 seconds
timeout = 30    # 30 seconds
# Detection time: 30 seconds ❌
# Network calls: 0.1/sec per node ✓

# Balanced (typical)
interval = 1    # 1 second
timeout = 3     # 3 seconds (3 missed heartbeats)
# Detection time: 3 seconds ✓
# Network calls: 1/sec per node ✓
```

### **Formula**
```
timeout = interval × missed_heartbeats

Example:
- interval = 1 second
- missed_heartbeats = 3
- timeout = 3 seconds

If no heartbeat for 3 seconds → declare dead
```

---

## 🎯 Real-World Examples

### **1. Kafka Broker Heartbeat**
```python
# Kafka broker sends heartbeat to ZooKeeper
session_timeout_ms = 10000  # 10 seconds
heartbeat_interval_ms = 3000  # 3 seconds

# Broker sends heartbeat every 3 seconds
# If ZooKeeper doesn't receive heartbeat for 10 seconds → broker dead
# Controller triggers re-election for partition leaders

# Configuration
broker.properties:
  zookeeper.session.timeout.ms=10000
  heartbeat.interval.ms=3000
```

### **2. Kubernetes Liveness Probe**
```yaml
# Pod sends heartbeat via HTTP endpoint
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: my-app
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5      # Check every 5 seconds
      timeoutSeconds: 1     # Response within 1 second
      failureThreshold: 3   # 3 consecutive failures = unhealthy

# If 3 consecutive health checks fail → restart pod
```

```python
# Application exposes health endpoint
@app.route('/healthz')
def healthz():
    # Check dependencies (database, cache, etc.)
    if database.is_connected() and cache.is_connected():
        return 'OK', 200
    else:
        return 'Unhealthy', 503
```

### **3. AWS Load Balancer Health Check**
```python
# ELB sends health check to instances
health_check = {
    'Target': 'HTTP:80/health',
    'Interval': 30,          # Check every 30 seconds
    'Timeout': 5,            # Wait 5 seconds for response
    'HealthyThreshold': 2,   # 2 successful checks → healthy
    'UnhealthyThreshold': 2  # 2 failed checks → unhealthy
}

# If instance fails 2 consecutive checks → removed from load balancer
```

### **4. MongoDB Replica Set Heartbeat**
```javascript
// MongoDB replica set configuration
rs.conf() = {
  settings: {
    heartbeatTimeoutSecs: 10,      // Timeout after 10 seconds
    electionTimeoutMillis: 10000    // Election timeout 10 seconds
  }
}

// Primary sends heartbeat to secondaries every 2 seconds
// If secondary doesn't respond for 10 seconds → marked as DOWN
// If primary doesn't send heartbeat → secondaries elect new primary
```

---

## ⚠️ Heartbeat Failure Scenarios

### **1. Network Partition**
```
False positive: Node alive but network partition

Cluster A:                  Cluster B:
├─ Node 1 (no heartbeat)   ├─ Node 1 (alive, sending heartbeat)
└─ Declares Node 1 dead ❌  └─ Can't reach Cluster A

Solution: Quorum-based detection (majority agrees node is dead)
```

### **2. Slow Process**
```
False positive: Process alive but slow (GC pause)

Node 1: [Long GC pause 5 seconds]
Monitor: "No heartbeat for 5s → dead" ❌
Node 1: [GC finishes] "I'm still alive!"

Solution: Longer timeout, adaptive timeout based on historical latency
```

### **3. Clock Skew**
```
Problem: Timestamp-based heartbeat with clock skew

Node 1 clock: 10:00:00
Node 2 clock: 10:05:00 (5 minutes ahead)

Node 1 sends: heartbeat(timestamp=10:00:00)
Node 2 receives: "timestamp 5 minutes old → dead?" ❌

Solution: Use monotonic time (elapsed time, not wall clock)
```

---

## ✅ Best Practices

1. **Use Monotonic Time**
```python
# Bad: Wall clock (affected by NTP adjustments)
last_heartbeat = time.time()

# Good: Monotonic clock (always increases)
last_heartbeat = time.monotonic()
```

2. **Adaptive Timeout**
```python
class AdaptiveHeartbeat:
    def __init__(self):
        self.latencies = []
    
    def calculate_timeout(self):
        if not self.latencies:
            return 3.0  # Default 3 seconds
        
        # Timeout = p99 latency × 3
        p99 = sorted(self.latencies)[int(len(self.latencies) * 0.99)]
        return p99 * 3
```

3. **Exponential Backoff for Re-checks**
```python
def check_with_backoff(node):
    retries = 0
    while retries < 3:
        if ping(node):
            return True
        time.sleep(2 ** retries)  # 1s, 2s, 4s
        retries += 1
    return False  # Definitely dead
```

4. **Monitor Heartbeat Lag**
```python
# Alert if heartbeat delay exceeds threshold
def monitor_heartbeat_lag():
    now = time.time()
    for node, last_seen in heartbeats.items():
        lag = now - last_seen
        if lag > 5:  # 5 seconds lag
            alert(f"Heartbeat lag: {node} ({lag:.1f}s)")
```

---

## 🎓 Interview Tips

**Q: "What is a heartbeat and why is it used?"**

A: "A heartbeat is a periodic signal (e.g., every 1 second) sent by a process to indicate it's alive. Used for failure detection in distributed systems.

Example: Kafka broker sends heartbeat to ZooKeeper every 3 seconds. If ZooKeeper doesn't receive heartbeat for 10 seconds (timeout), it declares broker dead and triggers re-election.

Benefits:
- **Fast failure detection** (3-10 second latency)
- **Automatic recovery** (trigger failover immediately)
- **No manual intervention** (system self-heals)"

**Q: "How do you tune heartbeat parameters?"**

A: "Key parameters:
- **Interval**: How often to send heartbeat (e.g., 1 second)
- **Timeout**: How long to wait before declaring dead (e.g., 3 seconds = 3 missed heartbeats)

Trade-offs:
- **Fast** (100ms interval, 300ms timeout): Quick detection but high network overhead
- **Slow** (10s interval, 30s timeout): Low overhead but slow detection
- **Balanced** (1s interval, 3s timeout): Typical production setting

Formula: timeout = interval × missed_heartbeats (e.g., 1s × 3 = 3s)

Also consider: Adaptive timeout (adjust based on network latency), exponential backoff (re-check before declaring dead)."

---

## 🔗 Related Topics
- **104. Leader Election** - Detect leader failure
- **105. Distributed Locks** - Release lock on failure
- **109. Single Point of Failure** - Redundancy
- **107. Clock Skew** - Time synchronization

---

## 📚 Summary

**Heartbeat**: Periodic "I'm alive" signal for failure detection

**Why**: Detect dead nodes, trigger failover, automatic recovery

**Patterns**: Push (active), Pull (health check), Gossip (peer-to-peer)

**Tuning**: interval=1s, timeout=3s (typical), adaptive for latency

**Best Practice**: Monotonic time, adaptive timeout, alert on lag 🚀
