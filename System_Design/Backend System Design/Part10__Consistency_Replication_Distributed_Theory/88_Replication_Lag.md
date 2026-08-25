# 88. Replication Lag

## 📌 Overview

**Replication lag** is the delay between when data is written to the primary/master database and when it appears on replica/slave databases. This lag causes **temporary inconsistencies** and is a fundamental challenge in distributed systems.

---

## 🎯 The Problem

```
Time →
Master: Write(X=100) ────→ [committed]
                           ↓
Replica1:                  [replicating...] → X=100 (after 50ms)
Replica2:                  [replicating...] → X=100 (after 200ms)
Replica3:                  [replicating...] → X=100 (after 500ms)

During lag window: Replicas serve stale data!
```

### Real-World Scenario
```python
# E-commerce: User adds item to cart
POST /cart/add
{
  "product_id": "12345",
  "quantity": 1
}
# Written to master, returns 200 OK

# User immediately views cart (routed to replica)
GET /cart
# Replica lag = 200ms
# Returns: [] (empty cart!) ❌

# User thinks: "Add to cart is broken!"
```

---

## 📊 Typical Replication Lag Values

```
┌───────────────────────────────────────────────┐
│ Scenario                    Typical Lag       │
├───────────────────────────────────────────────┤
│ Same datacenter            10-100ms           │
│ Cross-region (US East/West) 50-150ms          │
│ Cross-continent (US/Europe) 100-300ms         │
│ Satellite/remote           500-2000ms         │
│                                               │
│ Under load (high write QPS) 1-10 seconds      │
│ Network partition          Minutes-Hours      │
│ Replica catching up        Hours-Days         │
└───────────────────────────────────────────────┘
```

---

## 🔍 Causes of Replication Lag

### 1️⃣ **Network Latency**
```python
# Physical distance = higher latency
Master (US-East) → Replica (Europe)
Latency: ~100ms per operation

Master (US-East) → Replica (Asia)
Latency: ~200ms per operation

# Each write incurs network round-trip
```

### 2️⃣ **Write Throughput > Replica Processing**
```python
# Master handles 10,000 writes/sec
# Replica can only apply 5,000 writes/sec
# Lag accumulates: 5,000 writes/sec backlog

Time = 0:   Lag = 0
Time = 1s:  Lag = 5,000 writes (1 second behind)
Time = 10s: Lag = 50,000 writes (10 seconds behind)
```

### 3️⃣ **Expensive Queries on Replica**
```python
# Long-running analytics query on replica
SELECT AVG(price) FROM orders
WHERE date > '2023-01-01'
GROUP BY product_id;
# Takes 30 seconds, blocks replication

# During query execution:
# - Replication pauses
# - Lag accumulates to 30 seconds
```

### 4️⃣ **Network Partitions**
```python
# Network split between master and replica
Master: [writes continue]
Replica: [disconnected, no updates]

# Partition duration = 5 minutes
# Replica is 5 minutes behind

# After partition heals:
# Replica must catch up (may take additional time)
```

---

## 📈 Monitoring Replication Lag

### **MySQL Replication Lag**
```sql
-- Check replication status
SHOW SLAVE STATUS\G

-- Key metrics:
-- Seconds_Behind_Master: 120 (2 minutes lag)
-- Slave_IO_Running: Yes
-- Slave_SQL_Running: Yes
```

```python
import pymysql

def check_replication_lag(replica_host):
    conn = pymysql.connect(host=replica_host, user='monitor')
    cursor = conn.cursor()
    
    cursor.execute("SHOW SLAVE STATUS")
    status = cursor.fetchone()
    
    lag_seconds = status['Seconds_Behind_Master']
    
    if lag_seconds is None:
        return {"status": "not_replicating", "lag": None}
    
    return {
        "status": "replicating",
        "lag_seconds": lag_seconds,
        "io_running": status['Slave_IO_Running'],
        "sql_running": status['Slave_SQL_Running']
    }

# Alert if lag > 10 seconds
lag_info = check_replication_lag('replica1.example.com')
if lag_info['lag_seconds'] > 10:
    alert("Replication lag high", lag_info)
```

### **PostgreSQL Replication Lag**
```sql
-- Check replication lag (in bytes)
SELECT
    client_addr,
    state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) / 1024 / 1024 AS lag_mb
FROM pg_stat_replication;

-- Check lag (in time)
SELECT
    now() - pg_last_xact_replay_timestamp() AS lag_time;
```

### **MongoDB Replication Lag**
```javascript
// MongoDB replica set lag
rs.printSlaveReplicationInfo()

// Output:
// source: replica1:27017
//   syncedTo: Thu Jan 01 2024 10:30:45 GMT-0800 (PST)
//   0 secs (0 hrs) behind the primary
```

---

## 🛠️ Handling Replication Lag

### 1️⃣ **Read from Master for Critical Data**
```python
class SmartRouter:
    def __init__(self, master, replicas):
        self.master = master
        self.replicas = replicas
        self.user_last_write = {}
    
    def write(self, user_id, key, value):
        # Write to master
        self.master.write(key, value)
        
        # Track write timestamp
        self.user_last_write[user_id] = time.time()
    
    def read(self, user_id, key, critical=False):
        # Critical reads go to master
        if critical:
            return self.master.read(key)
        
        # Recent writes go to master
        last_write = self.user_last_write.get(user_id, 0)
        if time.time() - last_write < 5:  # 5-second window
            return self.master.read(key)
        
        # Otherwise read from replica
        return random.choice(self.replicas).read(key)

# Usage
router = SmartRouter(master_db, [replica1, replica2, replica3])

# Write balance
router.write('alice', 'balance', 1000)

# Critical read: Check balance before transfer
balance = router.read('alice', 'balance', critical=True)  # Reads from master ✓

# Non-critical read: View profile
profile = router.read('alice', 'profile', critical=False)  # Reads from replica (faster)
```

---

### 2️⃣ **Lag-Aware Load Balancing**
```python
class LagAwareLoadBalancer:
    def __init__(self, master, replicas):
        self.master = master
        self.replicas = replicas
        self.replica_lag = {}  # replica → lag_seconds
    
    def update_lag(self):
        """Periodically check replica lag"""
        for replica in self.replicas:
            lag = replica.check_replication_lag()
            self.replica_lag[replica] = lag
    
    def get_best_replica(self, max_lag_tolerance=10):
        """Return replica with lowest lag below tolerance"""
        eligible = [
            r for r in self.replicas
            if self.replica_lag.get(r, float('inf')) <= max_lag_tolerance
        ]
        
        if not eligible:
            # No replica within tolerance, read from master
            return self.master
        
        # Return replica with lowest lag
        return min(eligible, key=lambda r: self.replica_lag[r])
    
    def read(self, key, max_lag_tolerance=10):
        replica = self.get_best_replica(max_lag_tolerance)
        return replica.read(key)

# Usage
lb = LagAwareLoadBalancer(master, [replica1, replica2, replica3])
lb.update_lag()  # Update every 10 seconds

# Read with max 10-second lag tolerance
data = lb.read('key', max_lag_tolerance=10)
# Routes to replica with lag < 10 seconds, or master if all lagging
```

---

### 3️⃣ **Async/Sync Replication Trade-off**

#### **Asynchronous Replication** (Default)
```python
# Master writes and ACKs immediately
# Replicas receive updates asynchronously

def async_replication_write(master, replicas, key, value):
    # Write to master
    master.write(key, value)
    
    # Asynchronously replicate to replicas
    for replica in replicas:
        threading.Thread(target=replica.replicate_async, args=(key, value)).start()
    
    # Return immediately (don't wait for replicas)
    return {"status": "success", "latency_ms": 5}

# Pros: Low latency (5-10ms)
# Cons: Replication lag (10-500ms)
```

#### **Semi-Synchronous Replication**
```python
# Master waits for at least 1 replica before ACK

def semi_sync_replication_write(master, replicas, key, value):
    # Write to master
    master.write(key, value)
    
    # Wait for at least 1 replica to ACK
    futures = [replica.replicate_async(key, value) for replica in replicas]
    
    # Wait for first replica (or timeout)
    done, pending = concurrent.futures.wait(futures, timeout=1, return_when=FIRST_COMPLETED)
    
    if done:
        return {"status": "success", "latency_ms": 50}
    else:
        # Timeout: Continue anyway (degrade to async)
        return {"status": "success_with_warning", "latency_ms": 1000}

# Pros: Reduced data loss risk (at least 1 replica has data)
# Cons: Higher latency (50-100ms)
```

#### **Synchronous Replication** (Strict)
```python
# Master waits for ALL replicas before ACK

def sync_replication_write(master, replicas, key, value):
    # Write to master
    master.write(key, value)
    
    # Wait for ALL replicas
    futures = [replica.replicate(key, value) for replica in replicas]
    results = [f.result(timeout=5) for f in futures]
    
    if all(r.success for r in results):
        return {"status": "success", "latency_ms": 200}
    else:
        # Rollback if any replica fails
        master.rollback(key)
        raise ReplicationFailedException()

# Pros: No replication lag (strong consistency)
# Cons: High latency (100-500ms), low availability (fails if any replica down)
```

---

### 4️⃣ **Stale Read Warnings**
```python
# Warn users when serving stale data

class StaleReadDetector:
    def read(self, replica, key):
        lag = replica.check_replication_lag()
        value = replica.read(key)
        
        if lag > 10:
            return {
                "value": value,
                "warning": f"Data may be {lag} seconds old",
                "stale": True
            }
        
        return {"value": value, "stale": False}

# Usage
detector = StaleReadDetector()
result = detector.read(replica1, 'balance')

if result['stale']:
    # Show warning to user: "Data may be 15 seconds old"
    print(f"Warning: {result['warning']}")
```

---

## 🏗️ Real-World Examples

### **Amazon Aurora - Zero-Lag Reads**
```
Aurora uses shared storage architecture:
- Master and replicas share same storage layer
- Replicas read from same storage (not replicated data)
- Replication lag: <10ms (near-zero)

Traditional MySQL replication: 50-200ms lag
Aurora: <10ms lag
```

### **Read Replicas in AWS RDS**
```python
# AWS RDS replication lag monitoring
cloudwatch = boto3.client('cloudwatch')

# Check replication lag metric
response = cloudwatch.get_metric_statistics(
    Namespace='AWS/RDS',
    MetricName='ReplicaLag',
    Dimensions=[{'Name': 'DBInstanceIdentifier', 'Value': 'my-replica'}],
    StartTime=datetime.now() - timedelta(minutes=5),
    EndTime=datetime.now(),
    Period=60,
    Statistics=['Average']
)

avg_lag = response['Datapoints'][0]['Average']
if avg_lag > 30:  # 30 seconds
    alert("RDS replica lag high", avg_lag)
```

### **GitHub - Master Down, Replica Promoted**
```
GitHub incident (Oct 2018):
1. Network partition split master from replicas
2. Master continued accepting writes
3. Replicas promoted to master (without latest data)
4. Writes to new master conflicted with old master
5. Result: Data loss and inconsistency

Lesson: Replication lag + failover = data loss risk
Solution: Use consensus protocols (Raft, Paxos) instead of simple replication
```

---

## ✅ Best Practices

1. **Monitor lag continuously** - Alert if lag > 10 seconds
2. **Read from master for critical paths** - Balance, inventory, payments
3. **Set lag tolerance** - Define max acceptable lag per endpoint
4. **Use semi-sync replication** - Protects against data loss
5. **Failover carefully** - Ensure replica is caught up before promoting
6. **Test partition scenarios** - Verify behavior during network splits

---

## 🎓 Interview Tips

**Q: "How would you handle replication lag in a system?"**

A: "Strategies:
1. **Read-your-writes consistency**: Route user to master for recent writes (5-10 sec window)
2. **Lag-aware load balancing**: Route to replicas with lag < 10 seconds, fallback to master
3. **Critical path to master**: Read balance/inventory from master, non-critical from replica
4. **Semi-sync replication**: Wait for at least 1 replica to ACK before responding
5. **Stale read warnings**: Show "Data may be 15 seconds old" if serving stale data"

**Q: "What causes replication lag to spike?"**

A: "Common causes:
1. **Write spike**: Master 10K writes/sec, replica can only apply 5K/sec
2. **Slow query on replica**: Long analytics query blocks replication thread
3. **Network partition**: Replica disconnected for 5 minutes
4. **Schema migration**: ALTER TABLE blocks replication until complete
5. **Replica catching up**: After downtime, replica replays 1 hour of writes"

---

## 🔗 Related Topics
- **70. Replication (Master-Slave, Master-Master)** - Replication architectures
- **86. Strong vs Eventual Consistency** - Consistency models
- **87. Read-After-Write Consistency** - Handling lag for user writes
- **89. CAP Theorem** - Consistency vs availability

---

## 📚 Summary

**Replication Lag** = Delay between master write and replica visibility

**Typical Lag**:
- Same DC: 10-100ms
- Cross-region: 50-300ms
- Under load: 1-10 seconds

**Solutions**:
- Read from master for critical data
- Lag-aware load balancing
- Semi-sync replication
- Stale read warnings

**Monitoring**: `SHOW SLAVE STATUS` (MySQL), `pg_stat_replication` (PostgreSQL), CloudWatch (AWS)

**Trade-off**: Low lag = higher latency/lower availability 🎯
