# 70. Replication (Master-Slave, Master-Master)

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is Database Replication?

**Database replication** is copying data from one database server (master/primary) to one or more database servers (slaves/replicas) to improve availability, scalability, and fault tolerance.

### Two Main Replication Architectures

**Master-Slave (Primary-Replica)**:
```
┌─────────┐
│ Master  │ (Read + Write)
└────┬────┘
     │ Replication
  ┌──┴──────┬──────┐
  ↓         ↓      ↓
┌────┐   ┌────┐ ┌────┐
│S1  │   │S2  │ │S3  │ (Read only)
└────┘   └────┘ └────┘

Writes: Master only
Reads: Master + Slaves (distributed)
Use case: Read-heavy workload (90% reads)
```

**Master-Master (Multi-Master)**:
```
┌─────────┐ ←──────→ ┌─────────┐
│Master 1 │  Repli   │Master 2 │
│(R+W)    │  cation  │(R+W)    │
└─────────┘          └─────────┘

Writes: Both masters accept writes
Reads: Both masters
Use case: Multi-region, high availability
Challenge: Conflict resolution (concurrent writes)
```

### Quick Comparison

| Aspect | Master-Slave | Master-Master |
|--------|--------------|---------------|
| **Write Servers** | 1 (Master only) | 2+ (All masters) |
| **Read Servers** | Master + Slaves | All masters |
| **Write Scaling** | No (single master) | Yes (multiple masters) |
| **Read Scaling** | Yes (add slaves) | Yes (add masters) |
| **Complexity** | Simple | Complex (conflicts) |
| **Failover** | Manual/Auto promote slave | Automatic (other master) |
| **Conflicts** | None (single write source) | Possible (need resolution) |

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Master-Slave Replication (Primary-Replica)

**How It Works**:

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: Client writes to Master                        │
└─────────────────────────────────────────────────────────┘

Client: INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');

Master:
1. Execute write (insert row)
2. Write to binlog (binary log):
   - Timestamp: 2024-01-15 10:30:00.123
   - Event: INSERT INTO users ...
   - Transaction ID: 12345

┌─────────────────────────────────────────────────────────┐
│  Step 2: Master sends binlog to Slaves                  │
└─────────────────────────────────────────────────────────┘

Master → Slave 1, Slave 2, Slave 3:
- Sends binlog event (INSERT ...)
- Asynchronous (doesn't wait for slaves to apply)

┌─────────────────────────────────────────────────────────┐
│  Step 3: Slaves apply binlog events                     │
└─────────────────────────────────────────────────────────┘

Slave 1:
1. Receive binlog event
2. Execute: INSERT INTO users ...
3. Update replication position (transaction ID 12345)

Replication lag: 10-500ms (time from master write to slave apply)
```

**MySQL Master-Slave Setup**:

```sql
-- On Master
-- Enable binary logging
[mysqld]
server-id=1
log-bin=/var/log/mysql/mysql-bin.log
binlog-format=ROW  -- Row-based replication (safer)

-- Create replication user
CREATE USER 'repl'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';
FLUSH PRIVILEGES;

-- Get master status (note file and position)
SHOW MASTER STATUS;
-- File: mysql-bin.000001, Position: 154
```

```sql
-- On Slave
-- Configure slave
[mysqld]
server-id=2
relay-log=/var/log/mysql/relay-bin
read-only=1  -- Prevent writes to slave

-- Connect to master
CHANGE MASTER TO
    MASTER_HOST='master.db.example.com',
    MASTER_USER='repl',
    MASTER_PASSWORD='password',
    MASTER_LOG_FILE='mysql-bin.000001',
    MASTER_LOG_POS=154;

-- Start replication
START SLAVE;

-- Check status
SHOW SLAVE STATUS\G
-- Slave_IO_Running: Yes (receiving binlog)
-- Slave_SQL_Running: Yes (applying binlog)
-- Seconds_Behind_Master: 0 (replication lag)
```

**PostgreSQL Master-Slave (Streaming Replication)**:

```sql
-- On Master (postgresql.conf)
wal_level = replica
max_wal_senders = 10  -- Max slaves
wal_keep_segments = 64  -- Keep 64 WAL files for slaves

-- Create replication user
CREATE USER repl WITH REPLICATION ENCRYPTED PASSWORD 'password';

-- Allow replication connections (pg_hba.conf)
host replication repl 10.0.0.0/8 md5
```

```bash
# On Slave (initial setup)
# Stop PostgreSQL
systemctl stop postgresql

# Remove old data
rm -rf /var/lib/postgresql/data/*

# Copy data from master (base backup)
pg_basebackup -h master.db.example.com -D /var/lib/postgresql/data -U repl -P

# Configure recovery (recovery.conf or postgresql.auto.conf)
standby_mode = 'on'
primary_conninfo = 'host=master.db.example.com port=5432 user=repl password=password'
trigger_file = '/tmp/postgresql.trigger.5432'  -- For promotion

# Start PostgreSQL (slave mode)
systemctl start postgresql

# Check replication lag
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;
-- Returns: 0.123 (123ms lag)
```

---

### 2. Synchronous vs Asynchronous Replication

**Asynchronous Replication** (default, faster):

```
Client → Master: INSERT ...
Master:
  1. Write to disk
  2. Return success to client (immediately)
  3. Send binlog to slaves (asynchronously, in background)

Timeline:
t=0:    Client sends INSERT
t=1ms:  Master writes to disk
t=2ms:  Master returns success ✅
t=12ms: Slave 1 receives binlog
t=15ms: Slave 1 applies change

Replication lag: 13ms (15ms - 2ms)

Pros: Fast (2ms latency), master not blocked by slow slaves
Cons: Data loss if master crashes (slaves haven't received latest changes)
```

**Data Loss Scenario**:
```
t=0:   Client writes to master (balance = $1000)
t=1ms: Master writes to disk
t=2ms: Master returns success to client ✅
t=3ms: Master crashes 💥 (before sending binlog to slaves)

Slaves: Still have balance = $900 (old value)
Result: $100 lost (latest write not replicated)

RPO (Recovery Point Objective): 10-500ms (replication lag)
```

**Synchronous Replication** (slower, no data loss):

```
Client → Master: INSERT ...
Master:
  1. Write to disk
  2. Send binlog to slaves
  3. Wait for at least 1 slave to confirm
  4. Return success to client

Timeline:
t=0:    Client sends INSERT
t=1ms:  Master writes to disk
t=2ms:  Master sends binlog to Slave 1
t=12ms: Slave 1 writes to disk
t=13ms: Slave 1 confirms to Master
t=14ms: Master returns success to client ✅

Latency: 14ms (vs 2ms asynchronous, 7x slower)

Pros: No data loss (at least 1 slave has data before success)
Cons: Slow (7x latency), master blocked if slave slow
```

**MySQL Semisynchronous Replication** (hybrid):
```sql
-- On Master
INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';
SET GLOBAL rpl_semi_sync_master_enabled = 1;
SET GLOBAL rpl_semi_sync_master_timeout = 1000;  -- Wait 1 second

-- On Slave
INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';
SET GLOBAL rpl_semi_sync_slave_enabled = 1;

-- Behavior:
-- Master waits for 1 slave to confirm (within 1 second)
-- If timeout: Fall back to asynchronous (don't block writes)

-- Best of both worlds: No data loss + acceptable latency
```

**PostgreSQL Synchronous Replication**:
```sql
-- On Master (postgresql.conf)
synchronous_commit = on
synchronous_standby_names = 'slave1'  -- Wait for this slave

-- Master waits for slave1 to confirm before returning success
-- If slave1 down: Master blocks writes (strict consistency)

-- Alternative: ANY 1 (slave1, slave2)
synchronous_standby_names = 'ANY 1 (slave1, slave2)'
-- Wait for any 1 of 2 slaves (higher availability)
```

---

### 3. Master-Master Replication (Multi-Master)

**How It Works**:

```
┌────────────┐           ┌────────────┐
│  Master 1  │ ←────────→│  Master 2  │
│  (US East) │  Bidirect │  (US West) │
└────────────┘  Replica  └────────────┘

Client A (US East) → Master 1: INSERT INTO users (id=1, name='Alice')
Client B (US West) → Master 2: INSERT INTO users (id=2, name='Bob')

Replication:
- Master 1 sends INSERT id=1 to Master 2
- Master 2 sends INSERT id=2 to Master 1

Result: Both masters have both rows (eventually consistent)
```

**Conflict: Concurrent Writes to Same Row**:

```
┌────────────────────────────────────────────────────────────┐
│  t=0: Both masters have user_id=1, balance=$1000          │
└────────────────────────────────────────────────────────────┘

Master 1 (US East):
t=1ms: Client A withdraws $100
       UPDATE users SET balance = 900 WHERE user_id = 1;

Master 2 (US West):
t=1ms: Client B withdraws $50 (concurrent!)
       UPDATE users SET balance = 950 WHERE user_id = 1;

┌────────────────────────────────────────────────────────────┐
│  t=10ms: Replication propagates changes                    │
└────────────────────────────────────────────────────────────┘

Master 1 receives: UPDATE balance = 950 (from Master 2)
Master 2 receives: UPDATE balance = 900 (from Master 1)

CONFLICT: Both masters now have different values!
- Master 1: balance = 950 (overwrote its own 900)
- Master 2: balance = 900 (overwrote its own 950)

Expected: balance = 850 (two withdrawals: $100 + $50)
Actual: balance = 900 or 950 (last-write-wins, one withdrawal lost!)
```

**Conflict Resolution Strategies**:

**1. Last-Write-Wins (LWW)** (timestamp-based):
```sql
-- Add timestamp column
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP;

-- On conflict, keep row with latest timestamp
Master 1: balance=900, updated_at='2024-01-15 10:00:00.001'
Master 2: balance=950, updated_at='2024-01-15 10:00:00.002'

Result: Keep balance=950 (newer timestamp)

Problem: Clocks may not be synchronized (clock skew)
```

**2. Version Vectors** (track causality):
```sql
-- Add version column per master
ALTER TABLE users ADD COLUMN version_m1 INT, version_m2 INT;

Initial: balance=1000, version_m1=0, version_m2=0

Master 1 update:
UPDATE users SET balance=900, version_m1=1 WHERE user_id=1;

Master 2 update (concurrent):
UPDATE users SET balance=950, version_m2=1 WHERE user_id=1;

After replication:
Master 1: balance=900, version_m1=1, version_m2=1 (merged)
Master 2: balance=950, version_m1=1, version_m2=1 (merged)

Detect conflict: Both versions incremented (concurrent writes)
Resolution: Manual or application-specific (e.g., sum changes)
```

**3. Application-Level Conflict Avoidance**:
```python
# Strategy: Route user to same master (sticky session)
def get_master_for_user(user_id):
    if user_id % 2 == 0:
        return master1  # Even user IDs → Master 1
    else:
        return master2  # Odd user IDs → Master 2

# User 1 always writes to Master 1 (no conflicts)
# User 2 always writes to Master 2 (no conflicts)
```

**4. CRDT (Conflict-free Replicated Data Types)**:
```python
# Counter CRDT (always converges to correct value)
class CounterCRDT:
    def __init__(self):
        self.increments = {}  # {master_id: count}
    
    def increment(self, master_id, amount):
        self.increments[master_id] = self.increments.get(master_id, 0) + amount
    
    def value(self):
        return sum(self.increments.values())

# Master 1: Withdraw $100
counter.increment('master1', -100)  # {master1: -100}

# Master 2: Withdraw $50 (concurrent)
counter.increment('master2', -50)   # {master2: -50}

# After replication (merge):
# {master1: -100, master2: -50}
balance = 1000 + counter.value()  # 1000 - 100 - 50 = 850 ✅

# No conflict, correct result!
```

**MySQL Multi-Master (Galera Cluster)**:
```sql
-- Node 1 (Master 1)
wsrep_cluster_name="my_cluster"
wsrep_cluster_address="gcomm://node1,node2,node3"
wsrep_node_address="node1"

-- Node 2 (Master 2)
wsrep_cluster_name="my_cluster"
wsrep_cluster_address="gcomm://node1,node2,node3"
wsrep_node_address="node2"

-- Conflict detection: Certification-based replication
-- If concurrent writes to same row:
-- - One commit succeeds
-- - Other rollback with deadlock error (client must retry)

-- Example:
-- Node 1: UPDATE users SET balance=900 WHERE id=1;  ✅ Commit
-- Node 2: UPDATE users SET balance=950 WHERE id=1;  ❌ Rollback (deadlock)
```

**PostgreSQL Multi-Master (BDR - Bi-Directional Replication)**:
```sql
-- Create BDR group
SELECT bdr.create_node_group(
    node_group_name := 'my_group',
    parent_group_name := NULL
);

-- Join nodes to group
-- Node 1:
SELECT bdr.join_node_group(
    node_group_name := 'my_group',
    node_name := 'node1',
    node_local_dsn := 'host=node1 dbname=mydb'
);

-- Node 2:
SELECT bdr.join_node_group(
    node_group_name := 'my_group',
    node_name := 'node2',
    node_local_dsn := 'host=node2 dbname=mydb'
);

-- Conflict resolution: Configurable
bdr.alter_node_group_config('my_group', 
    conflict_resolution := 'last_update_wins'  -- LWW
);
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Replication Lag Calculation

**Scenario**: 10,000 writes/sec on master

```
Binlog generation rate:
- 10,000 writes/sec × 200 bytes/write = 2 MB/sec

Network bandwidth (master → slave):
- 1 Gbps = 125 MB/sec
- Theoretical max: 125 MB/sec / 2 MB/sec = 62 slaves

Practical max (50% network utilization):
- 125 MB/sec × 0.5 = 62.5 MB/sec
- Max slaves: 62.5 / 2 = 31 slaves

Replication lag (with 1 slave):
- Network latency: 10ms (same region)
- Slave apply time: 5ms (write to disk)
- Total lag: 15ms

Replication lag (with 31 slaves):
- Network bandwidth saturated (congestion)
- Lag: 15ms (network) + 50ms (queuing) = 65ms

Recommendation: < 10 slaves per master (keep lag < 50ms)
```

**Multi-Master Capacity**:
```
2 Masters:
- Write capacity: 2 × 5,000 writes/sec = 10,000 writes/sec
- Read capacity: 2 × 10,000 reads/sec = 20,000 reads/sec

Trade-off: Conflict rate
- 10,000 writes/sec across 1M users
- Conflict probability: 1% (100 conflicts/sec)
- Requires retry logic (3x attempts) = 300 extra writes/sec (3% overhead)

3 Masters (too complex):
- Conflict rate: 5% (mesh replication, more conflicts)
- Overhead: 15% (retries)
- Recommendation: Use 2 masters max (avoid complexity)
```

---

## 4. Data & Storage Design

### Choosing Replication Strategy

**Master-Slave Use Cases**:
```
1. Read-heavy workload (90% reads, 10% writes)
   - 1 Master (writes) + 5 Slaves (reads)
   - Scale reads indefinitely (add more slaves)

2. Reporting / Analytics
   - Slave dedicated to analytics queries (doesn't impact master)
   - Long-running queries (10+ seconds) isolated

3. Backup
   - Slave for continuous backup (hot standby)
   - No impact on master performance

4. Geographic read distribution
   - Master (US East)
   - Slave 1 (US West), Slave 2 (EU), Slave 3 (Asia)
   - Low latency reads worldwide
```

**Master-Master Use Cases**:
```
1. Multi-region writes
   - Master 1 (US East), Master 2 (US West)
   - Users write to nearest master (low latency)
   - Trade-off: Conflict resolution required

2. High availability (failover)
   - Both masters accept writes (no downtime during failover)
   - If Master 1 fails, Master 2 continues (transparent to users)

3. Active-Active (both masters used)
   - Load balancing across both masters
   - 2× write capacity

NOT recommended for:
   - Financial transactions (conflicts = lost money)
   - Inventory (conflicts = overselling)
   - Anything requiring strong consistency
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Failover Strategies

**Master-Slave Failover (Promote Slave to Master)**:

```
Initial state:
┌────────┐
│ Master │ (writes)
└───┬────┘
 ┌──┴───┬────┐
 ↓      ↓    ↓
┌───┐ ┌───┐┌───┐
│S1 │ │S2 ││S3 │ (reads)
└───┘ └───┘└───┘

Master fails:
┌────────┐
│ Master │ 💥 (dead)
└───┬────┘
 ┌──┴───┬────┐
 ↓      ↓    ↓
┌───┐ ┌───┐┌───┐
│S1 │ │S2 ││S3 │
└───┘ └───┘└───┘

Failover (promote S1):
┌───────────┐
│ S1 (new   │ (writes + reads)
│  Master)  │
└─────┬─────┘
   ┌──┴────┐
   ↓       ↓
 ┌───┐   ┌───┐
 │S2 │   │S3 │ (reads)
 └───┘   └───┘
```

**Automated Failover Process**:
```python
# Using MHA (Master High Availability) for MySQL
# Or Patroni for PostgreSQL

1. Monitor master health (every 1 second)
   - Send: SELECT 1
   - If no response for 3 seconds: Master down

2. Determine most up-to-date slave
   - Check replication position on all slaves
   - Slave with highest position (least lag) selected

3. Promote selected slave to master
   - Stop replication: STOP SLAVE
   - Make writable: SET GLOBAL read_only = 0
   
4. Reconfigure other slaves to replicate from new master
   - CHANGE MASTER TO MASTER_HOST='new_master'
   
5. Update application DNS/config
   - master.db.example.com → new_master_ip
   - TTL: 30 seconds (fast propagation)

Total time: 30-120 seconds (RTO = 1-2 minutes)
Data loss: 0-500ms of writes (replication lag, RPO = 500ms)
```

**Master-Master Failover (Simpler)**:
```
┌──────────┐ ←────→ ┌──────────┐
│ Master 1 │  Sync  │ Master 2 │
└──────────┘        └──────────┘
Both active (writes go to both)

Master 1 fails:
┌──────────┐         ┌──────────┐
│ Master 1 │ 💥 Dead │ Master 2 │
└──────────┘         └──────────┘
                     Continues (no promotion needed)

Failover: 0 seconds (Master 2 already accepting writes)
Data loss: 0 (synchronous replication)

Recovery:
1. Fix Master 1
2. Rejoin cluster (resync data from Master 2)
3. Both active again
```

---

## 6. Security, APIs & Governance

### Replication Security

**Encrypt Replication Traffic**:

```sql
-- MySQL: SSL for replication
-- On Master
CREATE USER 'repl'@'%' IDENTIFIED BY 'password' REQUIRE SSL;

-- On Slave
CHANGE MASTER TO
    MASTER_HOST='master.db.example.com',
    MASTER_USER='repl',
    MASTER_PASSWORD='password',
    MASTER_SSL=1,
    MASTER_SSL_CA='/path/to/ca.pem',
    MASTER_SSL_CERT='/path/to/client-cert.pem',
    MASTER_SSL_KEY='/path/to/client-key.pem';

-- All replication traffic encrypted
```

```sql
-- PostgreSQL: SSL for replication
-- On Master (pg_hba.conf)
hostssl replication repl 10.0.0.0/8 md5

-- On Slave (recovery.conf)
primary_conninfo = 'host=master port=5432 user=repl sslmode=require sslcert=/path/to/client.crt sslkey=/path/to/client.key'
```

**Row-Level Security (Replicate Subset of Data)**:
```sql
-- PostgreSQL logical replication (selective)
-- Replicate only active users
CREATE PUBLICATION active_users FOR TABLE users WHERE (status = 'active');

-- On Slave
CREATE SUBSCRIPTION active_users_sub
CONNECTION 'host=master dbname=mydb user=repl'
PUBLICATION active_users;

-- Slave only receives rows WHERE status = 'active'
```

---

## 7. Real-World Examples & Case Studies

### GitHub: Master-Slave with Orchestrator

**Architecture**:
```
1 Master (writes) + 5 Slaves (reads) per cluster
3 clusters (total 18 servers)

Orchestrator: Automatic failover tool
- Monitors master health (every 1 second)
- Promotes slave if master down (30 seconds)
- Reconfigures topology automatically
```

**Failover Scenario** (2018 incident):
```
Master fails (network partition)
Orchestrator promotes Slave 1 to Master
Old master rejoins (split-brain scenario)
Result: Two masters (data divergence)

Fix:
1. Identify correct master (Slave 1, has latest writes)
2. Demote old master to slave
3. Resync data from Slave 1
4. Resume normal operation

Downtime: 24 minutes (unusual, typically < 2 minutes)
Lesson: Add checks for split-brain (quorum required)
```

---

### Netflix: Multi-Region Master-Slave

**Architecture**:
```
US East: Master + 3 Slaves
US West: Slave (cross-region replication)
EU: Slave (cross-region replication)

Writes: US East Master only
Reads: Local slaves (low latency worldwide)
```

**Latency**:
```
User in US East → Slave (US East) → 5ms
User in US West → Slave (US West) → 8ms (not 50ms cross-region)
User in EU → Slave (EU) → 10ms

Replication lag (cross-region):
US East → US West: 50ms
US East → EU: 100ms

Trade-off: Stale reads (100ms lag) vs fast queries (10ms vs 100ms)
```

---

### Google Spanner: Multi-Master with TrueTime

**Challenge**: Multi-master replication with strong consistency (no conflicts)

**Solution**: TrueTime (synchronized clocks with uncertainty bounds)

```
Every server has GPS + atomic clock
TrueTime API: Returns time interval [earliest, latest]
Uncertainty: ±7ms (worst case)

Write to Master 1:
t=0: Start transaction
t=5ms: Commit prepared
Wait: TrueTime.Now().latest - t=5ms = 7ms (wait out uncertainty)
t=12ms: Commit confirmed (after uncertainty window)

Write to Master 2 (concurrent):
t=3ms: Start transaction
t=8ms: Commit prepared
Wait: 7ms
t=15ms: Commit confirmed

Replication order: Master 1 (t=12ms) → Master 2 (t=15ms)
No conflict! Timestamps globally ordered (within uncertainty)
```

**Result**: Multi-master without conflicts (strong consistency)

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Explain Master-Slave vs Master-Master replication."

**Structured Answer**:

**"Master-Slave has one master (writes) and multiple slaves (reads). Master-Master has multiple masters (both accept writes)."**

**Master-Slave** (Primary-Replica):
- **Architecture**: 1 master + N slaves, master replicates to slaves (one direction)
- **Writes**: Master only (single source of truth)
- **Reads**: Master + slaves (distribute read load)
- **Pros**: Simple (no conflicts), read scaling (add slaves), slaves for analytics/backup
- **Cons**: No write scaling (single master bottleneck), failover required (promote slave)
- **Use case**: Read-heavy workload (90% reads, 10% writes), most applications

**Master-Master** (Multi-Master):
- **Architecture**: 2+ masters, bi-directional replication
- **Writes**: All masters (write scaling)
- **Reads**: All masters
- **Pros**: Write scaling (multiple masters), high availability (failover instant), multi-region writes (low latency)
- **Cons**: Conflict resolution (concurrent writes to same row), complex (harder to debug), eventual consistency
- **Use case**: Multi-region, high write volume, high availability critical

**Trade-offs**:
```
Master-Slave: Simple but limited write capacity
Master-Master: Scales writes but requires conflict resolution

Replication lag:
- Asynchronous: 10-500ms (fast, risk data loss)
- Synchronous: 50-200ms (slow, no data loss)
```

**Real-world example: GitHub uses Master-Slave with Orchestrator for automatic failover (30-second RTO). Netflix uses cross-region Master-Slave (US, EU slaves) for low-latency reads worldwide (10ms vs 100ms). Google Spanner uses Multi-Master with TrueTime for globally consistent writes across regions."**

---

### Follow-Up 1: "What is replication lag and how do you handle it?"

**Answer**:

**"Replication lag is the delay between a write on master and when it appears on slaves. Typically 10-500ms with asynchronous replication."**

**Causes of Replication Lag**:
```
1. Network latency: 10-100ms (cross-region = 50-200ms)
2. Slave apply time: 5-50ms (disk write slower than master)
3. High write volume: Master generates binlog faster than slave can apply
4. Slow queries on slave: Long-running SELECT blocks replication thread

Example:
Master: 10,000 writes/sec
Slave: Can apply 8,000 writes/sec (slower disk)
Lag accumulates: 2,000 writes/sec behind
After 10 seconds: 20,000 writes behind = 2.5 seconds lag
```

**Measuring Replication Lag**:

```sql
-- MySQL
SHOW SLAVE STATUS\G
-- Seconds_Behind_Master: 0 (no lag)
-- Seconds_Behind_Master: 15 (15 seconds behind)

-- PostgreSQL
SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) AS lag_seconds;
-- Returns: 0.123 (123ms lag)
```

**Handling Replication Lag**:

**1. Read-Your-Writes Consistency** (force read from master after write):
```python
def update_user_profile(user_id, data):
    # Write to master
    master_db.execute("UPDATE users SET name=%s WHERE id=%s", (data.name, user_id))
    master_db.commit()
    
    # Read from master (not slave, consistent)
    user = master_db.query("SELECT * FROM users WHERE id=%s", user_id)
    return user

# User sees their own update immediately (no stale data)
```

**2. Session Stickiness** (route to master for N seconds after write):
```python
def update_user_profile(user_id, data):
    master_db.execute("UPDATE users SET name=%s WHERE id=%s", (data.name, user_id))
    master_db.commit()
    
    # Mark session to use master for 5 seconds
    session['use_master_until'] = time.time() + 5

def get_user_profile(user_id):
    if time.time() < session.get('use_master_until', 0):
        return master_db.query("SELECT * FROM users WHERE id=%s", user_id)  # Master
    else:
        return slave_db.query("SELECT * FROM users WHERE id=%s", user_id)  # Slave
```

**3. Check Replication Position** (ensure slave caught up):
```python
def wait_for_replication(master_pos, max_wait=1.0):
    start = time.time()
    while time.time() - start < max_wait:
        slave_pos = slave_db.query("SELECT @@gtid_executed")  # MySQL GTID
        if slave_pos >= master_pos:
            return True  # Caught up
        time.sleep(0.01)  # 10ms
    return False  # Timeout

def update_and_read(user_id, data):
    # Write to master
    master_db.execute("UPDATE users SET name=%s WHERE id=%s", (data.name, user_id))
    master_db.commit()
    master_pos = master_db.query("SELECT @@gtid_executed")
    
    # Wait for slave to catch up (max 1 second)
    if wait_for_replication(master_pos, max_wait=1.0):
        # Slave caught up, read from slave
        return slave_db.query("SELECT * FROM users WHERE id=%s", user_id)
    else:
        # Slave too slow, read from master
        return master_db.query("SELECT * FROM users WHERE id=%s", user_id)
```

**4. Reduce Lag** (optimize slave performance):
```sql
-- Increase slave apply threads (parallel replication)
-- MySQL
SET GLOBAL slave_parallel_workers = 8;  -- 8 threads

-- PostgreSQL
max_wal_senders = 10
max_worker_processes = 8

-- Upgrade slave hardware (faster disks, more CPU)
-- Use SSD instead of HDD (10x faster writes)

-- Monitor and alert on lag
-- If lag > 1 second: Alert ops team
```

**Real-world: Twitter allows 500ms replication lag for timeline queries (stale tweets acceptable). But user's own tweets read from master (read-your-writes). Saves 90% of load on master."**

---

### Follow-Up 2: "How do you handle conflicts in Master-Master replication?"

**Answer**:

**"Conflicts occur when two masters update the same row concurrently. Resolution strategies: Last-Write-Wins (timestamp), application-level avoidance (route users to same master), or CRDTs (conflict-free data types)."**

**Conflict Example**:
```sql
-- Initial state: user_id=1, balance=$1000

Master 1 (US East):
t=0: UPDATE users SET balance=900 WHERE id=1;  -- Withdraw $100

Master 2 (US West):
t=0: UPDATE users SET balance=950 WHERE id=1;  -- Withdraw $50 (concurrent)

-- After replication (t=10ms):
Master 1: balance=950 (received update from Master 2, overwrites 900)
Master 2: balance=900 (received update from Master 1, overwrites 950)

-- Conflict! One withdrawal lost (expected: $850, actual: $900)
```

**Resolution Strategy 1: Last-Write-Wins (LWW)**:
```sql
-- Add timestamp column
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

Master 1:
t=0.001: UPDATE users SET balance=900, updated_at='2024-01-15 10:00:00.001' WHERE id=1;

Master 2:
t=0.002: UPDATE users SET balance=950, updated_at='2024-01-15 10:00:00.002' WHERE id=1;

-- After replication:
-- Both masters: balance=950 (latest timestamp wins)

Problem: One update lost ($100 withdrawal ignored)
Use case: Comments, likes (losing one update acceptable)
```

**Resolution Strategy 2: Application-Level Avoidance**:
```python
# Route each user to specific master (sticky routing)
def get_master_for_user(user_id):
    if user_id % 2 == 0:
        return master1  # Even user IDs
    else:
        return master2  # Odd user IDs

# User 1 always writes to Master 1 (no concurrent writes)
db = get_master_for_user(user_id)
db.execute("UPDATE users SET balance=900 WHERE id=%s", user_id)

# Benefit: Zero conflicts (users partitioned across masters)
# Trade-off: If Master 1 down, even-ID users can't write (lower availability)
```

**Resolution Strategy 3: Version Vectors** (detect conflicts, resolve manually):
```sql
-- Track version per master
ALTER TABLE users ADD COLUMN version_m1 INT DEFAULT 0, version_m2 INT DEFAULT 0;

Master 1:
UPDATE users SET balance=900, version_m1=version_m1+1 WHERE id=1;
-- balance=900, version_m1=1, version_m2=0

Master 2 (concurrent):
UPDATE users SET balance=950, version_m2=version_m2+1 WHERE id=1;
-- balance=950, version_m1=0, version_m2=1

-- After replication:
Master 1: version_m1=1, version_m2=1 (conflict detected!)
Master 2: version_m1=1, version_m2=1 (conflict detected!)

-- Resolution: Application-specific
-- Example: Sum changes (balance = 1000 - 100 - 50 = 850)
if version_m1 > 0 and version_m2 > 0:
    # Conflict: Merge changes
    balance = 1000 - (1000 - 900) - (1000 - 950) = 850
```

**Resolution Strategy 4: CRDTs (Conflict-Free Replicated Data Types)**:
```python
# G-Counter (grow-only counter, always converges)
class GCounter:
    def __init__(self, master_id):
        self.master_id = master_id
        self.counts = {}  # {master_id: count}
    
    def increment(self, amount):
        self.counts[self.master_id] = self.counts.get(self.master_id, 0) + amount
    
    def value(self):
        return sum(self.counts.values())
    
    def merge(self, other):
        for mid, count in other.counts.items():
            self.counts[mid] = max(self.counts.get(mid, 0), count)

# Master 1: Increment $100
counter_m1 = GCounter('master1')
counter_m1.increment(100)  # {master1: 100}

# Master 2: Increment $50 (concurrent)
counter_m2 = GCounter('master2')
counter_m2.increment(50)   # {master2: 50}

# After replication (merge):
counter_m1.merge(counter_m2)  # {master1: 100, master2: 50}
counter_m1.value()  # 150 ✅ Correct!

# No conflict, automatic convergence
```

**Avoiding Conflicts** (best approach):
```
1. Partition data: Each master handles disjoint subset (user_id % N)
2. Commutative operations: Use CRDTs (order-independent)
3. Pessimistic locking: Distributed lock (Redis, ZooKeeper) before write
4. Single master: Use Master-Slave if strong consistency required
```

**Real-world: Instagram avoids conflicts by sharding users across masters (user_id % 4096). Each user's data on single master (no cross-master updates). Cassandra uses LWW for conflicts (timestamp-based). Riak uses vector clocks (application resolves conflicts)."**

---

### Follow-Up 3: "What's the difference between synchronous and asynchronous replication?"

**Answer**:

**"Synchronous replication waits for slaves to confirm writes before returning success (slow, no data loss). Asynchronous replication returns success immediately without waiting (fast, possible data loss)."**

**Asynchronous Replication** (default):
```
Client → Master: INSERT INTO users ...
Master:
  1. Write to disk (1ms)
  2. Return success to client ✅ (2ms total)
  3. Send binlog to slaves (background, doesn't wait)

Slave (10ms later):
  1. Receive binlog
  2. Apply change

Replication lag: 10ms
Pros: Fast (2ms latency), master not blocked
Cons: Data loss if master crashes before replication (10ms window)
```

**Data Loss Scenario**:
```
t=0:   Client writes to master
t=1ms: Master writes to disk
t=2ms: Master returns success ✅
t=3ms: Master crashes 💥 (before sending to slaves)

Slaves: Don't have latest write
Recovery: Promote slave (missing 3ms of writes)
RPO (Recovery Point Objective): 10-500ms

Example: $100 transaction committed but lost (unacceptable for payments)
```

**Synchronous Replication** (no data loss):
```
Client → Master: INSERT INTO users ...
Master:
  1. Write to disk (1ms)
  2. Send binlog to Slave 1 (2ms)
  3. Wait for Slave 1 ACK (10ms)
  4. Return success to client ✅ (13ms total)

Slave 1 (3ms):
  1. Receive binlog (2ms)
  2. Write to disk (1ms)
  3. Send ACK to master

Replication lag: 0ms (slave already has data)
Pros: No data loss (at least 1 slave confirmed)
Cons: Slow (13ms vs 2ms, 6.5x slower), master blocked if slave slow
```

**Master Crash (no data loss)**:
```
t=0:   Client writes to master
t=1ms: Master writes to disk
t=2ms: Master sends to Slave 1
t=3ms: Slave 1 writes to disk
t=4ms: Slave 1 ACKs to master
t=5ms: Master returns success ✅
t=6ms: Master crashes 💥

Slaves: Slave 1 has latest write (confirmed before success returned)
Recovery: Promote Slave 1 (zero data loss)
RPO: 0ms
```

**Semisynchronous Replication** (hybrid):
```
MySQL semisync:
- Wait for 1 slave to ACK (within timeout, e.g., 1 second)
- If timeout: Fall back to asynchronous (don't block writes)

Normal case:
  1. Master writes to disk (1ms)
  2. Send to Slave 1 (2ms)
  3. Slave 1 ACK (3ms)
  4. Return success (6ms, slower but acceptable)

Slave slow case:
  1. Master writes to disk (1ms)
  2. Send to Slave 1 (2ms)
  3. Wait for ACK... (1 second timeout)
  4. Timeout! Fall back to async
  5. Return success (2ms, fast)

Result: Best of both worlds (no data loss normally, but doesn't block on slow slave)
```

**PostgreSQL Synchronous Modes**:
```sql
-- Strict synchronous (blocks if slave down)
synchronous_commit = on
synchronous_standby_names = 'slave1'

-- Wait for any 1 slave (higher availability)
synchronous_standby_names = 'ANY 1 (slave1, slave2, slave3)'

-- If all 3 slaves down: Master blocks writes (safety over availability)
```

**Trade-offs**:
```
Asynchronous:
- Latency: 2ms (fast)
- Throughput: 10,000 writes/sec
- Data loss: 10-500ms window
- Use case: Social media posts, logs, analytics

Synchronous:
- Latency: 13ms (6.5x slower)
- Throughput: 1,500 writes/sec (6.5x slower)
- Data loss: 0ms (guaranteed)
- Use case: Financial transactions, inventory, critical data

Semisynchronous:
- Latency: 6ms (3x slower, acceptable)
- Throughput: 3,000 writes/sec
- Data loss: 0ms normally, 500ms if slave down
- Use case: Most applications (balance consistency and performance)
```

**Real-world: Stripe uses synchronous replication for payment processing (zero data loss). Facebook uses asynchronous replication for newsfeed (500ms lag acceptable, high throughput required). Most databases default to asynchronous (faster), use semisync for critical data."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Replication Architecture Comparison

```
┌────────────────────────────────────────────────────────────┐
│          MASTER-SLAVE REPLICATION                          │
└────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Master     │  Writes: 5,000/sec
│ (16 cores,   │  Reads:  2,000/sec
│  64 GB RAM)  │
└──────┬───────┘
       │ Binlog (async, 10ms lag)
   ┌───┴────────┬────────┬────────┐
   ↓            ↓        ↓        ↓
┌──────┐    ┌──────┐ ┌──────┐ ┌──────┐
│Slave │    │Slave │ │Slave │ │Slave │
│  1   │    │  2   │ │  3   │ │  4   │
│(read)│    │(read)│ │(read)│ │(anal)│
└──────┘    └──────┘ └──────┘ └──────┘
2,000/sec   2,000/   2,000/   Long
reads       sec      sec      queries

Total capacity:
- Writes: 5,000/sec (master only)
- Reads:  10,000/sec (master + 4 slaves)

Pros: ✅ Simple, ✅ Read scaling, ✅ No conflicts
Cons: ❌ Single write point, ❌ Failover required


┌────────────────────────────────────────────────────────────┐
│          MASTER-MASTER REPLICATION                         │
└────────────────────────────────────────────────────────────┘

┌──────────────┐ ←──────────────→ ┌──────────────┐
│   Master 1   │  Bi-directional  │   Master 2   │
│   (US East)  │   Replication    │   (US West)  │
│              │   (50ms lag)     │              │
│ Writes: 3K/s │                  │ Writes: 2K/s │
│ Reads:  5K/s │                  │ Reads:  4K/s │
└──────────────┘                  └──────────────┘

Total capacity:
- Writes: 5,000/sec (3K + 2K, distributed)
- Reads:  9,000/sec (5K + 4K)

Pros: ✅ Write scaling, ✅ Multi-region, ✅ Instant failover
Cons: ❌ Conflicts, ❌ Complex, ❌ Eventual consistency


REPLICATION LAG TIMELINE:
═══════════════════════════════════════════════════════════

Asynchronous Replication:
─────────────────────────────────────────────────────────→
t=0ms   t=1ms   t=2ms   t=10ms  t=11ms
│       │       │       │       │
Client  Master  Success Slave   Slave
writes  writes  return  receive apply
        to disk to client binlog change

Master returns success at t=2ms (fast)
Slave applies at t=11ms (10ms lag)
Data loss window: 2ms-11ms (if master crashes)


Synchronous Replication:
─────────────────────────────────────────────────────────→
t=0ms   t=1ms   t=2ms   t=3ms   t=4ms   t=5ms
│       │       │       │       │       │
Client  Master  Send    Slave   Slave   Success
writes  writes  binlog  receive confirm return
        to disk         +apply  to      to
                                master  client

Master waits for slave confirmation (t=4ms)
Success returned at t=5ms (slower)
Data loss window: 0ms (slave confirmed before success)


CONFLICT RESOLUTION:
═══════════════════════════════════════════════════════════

Concurrent Writes (Master-Master):

t=0ms: Initial state
┌──────────────┐          ┌──────────────┐
│  Master 1    │          │  Master 2    │
│ balance=$100 │          │ balance=$100 │
└──────────────┘          └──────────────┘

t=1ms: Concurrent writes
┌──────────────┐          ┌──────────────┐
│  Master 1    │          │  Master 2    │
│ balance=$900 │          │ balance=$950 │
│ (withdraw    │          │ (withdraw    │
│  $100)       │          │  $50)        │
└──────────────┘          └──────────────┘

t=10ms: Replication propagates
┌──────────────┐ ────────→┌──────────────┐
│  Master 1    │ $950     │  Master 2    │
│ balance=$950 │ ←──────  │ balance=$900 │
│              │ $900     │              │
└──────────────┘          └──────────────┘

CONFLICT! Both have different values
Expected: $850 (two withdrawals)
Actual: $950 on M1, $900 on M2

Resolution strategies:
1. Last-Write-Wins: Keep $950 (later timestamp) ❌ Lost $100
2. Merge changes: $1000 - $100 - $50 = $850 ✅ Correct
3. Application avoidance: Route user to one master ✅ No conflict
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Replication Matters

**Without Replication**:
- Single point of failure (server crash = downtime)
- Limited read capacity (one server handles all queries)
- No geographic distribution (high latency for distant users)
- Long recovery time (restore from backup = hours)

**With Replication**:
- High availability (failover to replica in minutes)
- Read scaling (10x capacity with 10 replicas)
- Low latency worldwide (local replicas in each region)
- Fast recovery (promote replica = seconds)

### Key Strategies

**Master-Slave** (90% of use cases):
- **Architecture**: 1 master (writes) + N slaves (reads)
- **When**: Read-heavy (90% reads, 10% writes), most applications
- **Pros**: Simple, no conflicts, read scaling, slaves for analytics/backup
- **Cons**: No write scaling, failover required (30-120 seconds)
- **Example**: GitHub (1 master + 5 slaves per cluster, Orchestrator for auto-failover)

**Master-Master** (10% of use cases):
- **Architecture**: 2+ masters, bi-directional replication
- **When**: Multi-region writes, high availability critical, write scaling needed
- **Pros**: Write scaling, instant failover (0 seconds), low latency worldwide
- **Cons**: Conflict resolution, eventual consistency, complex
- **Example**: Google Spanner (multi-master with TrueTime, strong consistency)

### Replication Modes

**Asynchronous** (default):
- **Latency**: 2ms (fast)
- **Data loss**: 10-500ms window (if master crashes)
- **Use case**: Social media, logs, analytics (high throughput, some data loss acceptable)

**Synchronous** (strong consistency):
- **Latency**: 13ms (6.5x slower)
- **Data loss**: 0ms (slave confirms before success)
- **Use case**: Financial transactions, inventory (no data loss tolerated)

**Semisynchronous** (best of both):
- **Latency**: 6ms (3x slower, acceptable)
- **Data loss**: 0ms normally, 500ms if slave down (timeout fallback)
- **Use case**: Most critical applications (balance consistency and performance)

### Production Checklist

- [ ] **Choose replication type**: Master-Slave for read-heavy, Master-Master for multi-region writes
- [ ] **Set up monitoring**: Replication lag (alert if > 1 second), master health checks (every 1 second)
- [ ] **Configure failover**: Automated (Orchestrator, MHA, Patroni) for < 2-minute RTO
- [ ] **Handle replication lag**: Read-your-writes (force master read after write), session stickiness (5 seconds)
- [ ] **Choose replication mode**: Async for speed, Sync for zero data loss, Semisync for balance
- [ ] **Encrypt replication**: SSL/TLS for master-slave traffic (prevent eavesdropping)
- [ ] **Test failover**: Monthly drills (simulate master failure, verify promotion works)
- [ ] **Monitor conflicts**: Master-Master only (alert on conflicts, verify resolution logic)
- [ ] **Optimize slaves**: Parallel replication (8 threads), faster disks (SSD), sufficient RAM (cache)
- [ ] **Document topology**: Diagram master/slave layout, failover procedures, conflict resolution strategy

### Bottom Line

**Master-Slave replication is the foundation of database scalability (read scaling) and high availability (failover). For FAANG interviews: Explain Master-Slave (1 write source, N read replicas, 10-500ms lag) vs Master-Master (multiple write sources, conflict resolution required). Discuss async (fast, data loss) vs sync (slow, no data loss). Real-world example from GitHub: Master-Slave with Orchestrator auto-failover (30-second RTO, 99.99% uptime). Rule: Start with Master-Slave async (simple, scales reads), use Master-Master only if multi-region writes required (complexity justified).**

