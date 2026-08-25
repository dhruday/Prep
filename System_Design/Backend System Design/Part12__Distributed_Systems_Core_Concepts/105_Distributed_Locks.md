# 105. Distributed Locks

## 📌 Overview

A **distributed lock** ensures that only **one process across multiple machines** can access a shared resource at a time. It's like a mutex, but works across the network.

**Problem**: Multiple servers trying to modify the same resource simultaneously leads to race conditions.

---

## 🎯 Why Distributed Locks?

### **Problem: Race Condition**
```
Scenario: Two servers updating same inventory

Time →
Server 1: Read(stock=10) ──→ Decrement ──→ Write(stock=9)
Server 2:      Read(stock=10) ──→ Decrement ──→ Write(stock=9)

Result: stock=9 (should be 8) ❌
Lost update!
```

### **Solution: Distributed Lock**
```
Server 1: Acquire lock ──→ Read ──→ Write ──→ Release lock
Server 2:      Wait for lock ──────────────→ Acquire ──→ Read ──→ Write

Result: stock=8 ✓
```

---

## 🎯 Use Cases

1. **Prevent duplicate work** (scheduled jobs)
2. **Inventory management** (prevent overselling)
3. **Leader election** (only one coordinator)
4. **Rate limiting** (global counters)
5. **Cache warming** (only one server warms cache)

---

## 🛠️ Implementation: Redis-Based Lock

### **Simple Lock (Naive)**
```python
import redis
import time
import uuid

class RedisLock:
    def __init__(self, redis_client, lock_name, timeout=10):
        self.redis = redis_client
        self.lock_name = lock_name
        self.timeout = timeout
        self.identifier = str(uuid.uuid4())  # Unique ID for this lock holder
    
    def acquire(self):
        """Acquire lock, return True if successful"""
        end_time = time.time() + self.timeout
        
        while time.time() < end_time:
            # SET NX: Set if Not eXists (atomic)
            if self.redis.set(self.lock_name, self.identifier, nx=True, ex=10):
                return True  # Lock acquired
            
            time.sleep(0.01)  # Wait 10ms before retry
        
        return False  # Timeout
    
    def release(self):
        """Release lock (only if we own it)"""
        # Lua script ensures atomicity (check + delete)
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        self.redis.eval(lua_script, 1, self.lock_name, self.identifier)

# Usage
redis_client = redis.Redis(host='localhost', port=6379)
lock = RedisLock(redis_client, 'inventory:product-123')

if lock.acquire():
    try:
        # Critical section
        stock = get_stock('product-123')
        stock -= 1
        set_stock('product-123', stock)
    finally:
        lock.release()  # Always release
else:
    print("Could not acquire lock")
```

---

## 🎯 Distributed Lock Properties

### **Safety (Mutual Exclusion)**
```
Only ONE client holds lock at any time

Time →
Client 1: |──── LOCKED ────|
Client 2:           Wait...      |──── LOCKED ────|

Never: Both locked simultaneously ❌
```

### **Liveness (No Deadlock)**
```
Lock must eventually be released

Problem: Client crashes while holding lock
Solution: Lock expiration (TTL)

lock.set('resource', 'client1', ex=10)  # Expires in 10 seconds
# If client crashes → lock auto-releases after 10s
```

### **Fault Tolerance**
```
Lock survives failures

Redis master fails:
├─ Replica promoted to master
└─ Lock state preserved (if replicated)
```

---

## 🛠️ Redlock Algorithm (Multi-Redis)

**Problem**: Single Redis fails → lock lost

**Solution**: Use multiple Redis instances (quorum-based)

```python
import redis
import time
import uuid

class Redlock:
    def __init__(self, redis_instances):
        self.redis_instances = redis_instances  # [redis1, redis2, redis3, redis4, redis5]
        self.quorum = len(redis_instances) // 2 + 1  # Majority (3 out of 5)
    
    def acquire(self, resource, ttl=10000):
        """Acquire lock on majority of instances"""
        identifier = str(uuid.uuid4())
        start_time = int(time.time() * 1000)  # Milliseconds
        
        # Try to acquire lock on all instances
        acquired = 0
        for redis_instance in self.redis_instances:
            try:
                if redis_instance.set(resource, identifier, nx=True, px=ttl):
                    acquired += 1
            except Exception:
                pass  # Instance down, continue
        
        # Calculate elapsed time
        elapsed_time = int(time.time() * 1000) - start_time
        
        # Check if we have quorum and lock is still valid
        if acquired >= self.quorum and elapsed_time < ttl:
            return identifier  # Lock acquired ✓
        else:
            # Failed to acquire quorum → release acquired locks
            self.release(resource, identifier)
            return None
    
    def release(self, resource, identifier):
        """Release lock on all instances"""
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """
        for redis_instance in self.redis_instances:
            try:
                redis_instance.eval(lua_script, 1, resource, identifier)
            except Exception:
                pass  # Instance down, continue

# Usage
redis1 = redis.Redis(host='redis1', port=6379)
redis2 = redis.Redis(host='redis2', port=6379)
redis3 = redis.Redis(host='redis3', port=6379)
redis4 = redis.Redis(host='redis4', port=6379)
redis5 = redis.Redis(host='redis5', port=6379)

redlock = Redlock([redis1, redis2, redis3, redis4, redis5])

lock_id = redlock.acquire('inventory:product-123', ttl=10000)
if lock_id:
    try:
        # Critical section
        process_order()
    finally:
        redlock.release('inventory:product-123', lock_id)
```

**How Redlock Works**:
```
5 Redis instances: [R1, R2, R3, R4, R5]

Client tries to acquire lock:
1. Set lock on R1: Success ✓
2. Set lock on R2: Success ✓
3. Set lock on R3: Fail (down) ✗
4. Set lock on R4: Success ✓
5. Set lock on R5: Fail (slow) ✗

Result: 3/5 acquired (quorum) → Lock acquired ✓
```

---

## 🎯 ZooKeeper-Based Lock

**Advantage**: Strongly consistent (CP system)

```python
from kazoo.client import KazooClient
from kazoo.recipe.lock import Lock

zk = KazooClient(hosts='localhost:2181')
zk.start()

# Create distributed lock
lock = Lock(zk, "/locks/inventory-product-123")

with lock:  # Context manager handles acquire/release
    # Critical section
    stock = get_stock('product-123')
    stock -= 1
    set_stock('product-123', stock)
    # Lock automatically released

zk.stop()
```

**How ZooKeeper Lock Works**:
```
Lock path: /locks/inventory-product-123

Client 1 creates: /locks/inventory-product-123/lock-0000000001
Client 2 creates: /locks/inventory-product-123/lock-0000000002
Client 3 creates: /locks/inventory-product-123/lock-0000000003

Sequence number determines order
├─ Lowest number holds lock (Client 1)
├─ Client 2 watches Client 1's node
└─ When Client 1 releases → Client 2 gets lock
```

---

## 🎯 etcd-Based Lock

```python
import etcd3

etcd = etcd3.client(host='localhost', port=2379)

# Acquire lock with lease
lease = etcd.lease(ttl=10)  # 10-second TTL
lock = etcd.lock('inventory-product-123', lease=lease)

lock.acquire()
try:
    # Critical section
    process_order()
finally:
    lock.release()
```

---

## ⚠️ Common Pitfalls

### **1. Lock Timeout Too Short**
```python
# Bad: Lock expires before task completes
lock.acquire(timeout=1)  # 1 second
expensive_operation()  # Takes 5 seconds
# Lock released while still processing ❌

# Good: Timeout > task duration
lock.acquire(timeout=10)  # 10 seconds
expensive_operation()  # Takes 5 seconds ✓
```

### **2. Forgetting to Release**
```python
# Bad: Lock never released (deadlock)
lock.acquire()
process()
# No release → deadlock ❌

# Good: Always release in finally
lock.acquire()
try:
    process()
finally:
    lock.release()  # Always executes ✓
```

### **3. Lock Extension**
```python
# Problem: Long-running task, lock expires mid-execution
lock.acquire(timeout=10)
long_task()  # Takes 30 seconds
# Lock expires after 10 seconds ❌

# Solution: Extend lock periodically
lock.acquire(timeout=10)
while not task_done:
    process_chunk()
    lock.extend(timeout=10)  # Reset TTL ✓
```

### **4. Fencing Tokens**
```python
# Problem: Process thinks it has lock, but it expired
lock_id = acquire_lock('resource')
time.sleep(15)  # Lock expired (TTL=10s)
# Process doesn't know lock is lost
write_to_database('resource', data)  # ❌ Two processes writing!

# Solution: Use fencing tokens (monotonically increasing)
lock_id, fence_token = acquire_lock('resource')  # fence_token = 123
write_to_database('resource', data, fence_token=fence_token)
# Database rejects if token < last_seen_token
```

---

## 🎯 Real-World Examples

### **1. Stripe Payment Processing**
```python
# Prevent duplicate charge
payment_id = 'payment-abc-123'
lock_key = f'lock:payment:{payment_id}'

lock = RedisLock(redis_client, lock_key, timeout=30)
if lock.acquire():
    try:
        if not payment_already_processed(payment_id):
            charge_credit_card(payment_id)
            mark_payment_processed(payment_id)
    finally:
        lock.release()
```

### **2. Airbnb Booking System**
```python
# Prevent double-booking
listing_id = 'listing-456'
date = '2024-03-15'
lock_key = f'lock:booking:{listing_id}:{date}'

lock = RedisLock(redis_client, lock_key, timeout=10)
if lock.acquire():
    try:
        if is_available(listing_id, date):
            create_booking(listing_id, date, guest_id)
            mark_unavailable(listing_id, date)
    finally:
        lock.release()
```

### **3. Scheduled Jobs (Kubernetes CronJob)**
```python
# Ensure only one pod runs scheduled task
job_name = 'daily-report'
lock_key = f'lock:cronjob:{job_name}'

lock = RedisLock(redis_client, lock_key, timeout=3600)  # 1 hour
if lock.acquire():
    try:
        generate_daily_report()
        send_email_report()
    finally:
        lock.release()
# Other pods fail to acquire lock → skip
```

---

## ✅ Best Practices

1. **Always use timeouts** (prevent deadlocks)
2. **Release in finally block** (ensure cleanup)
3. **Use unique identifiers** (only owner can release)
4. **Monitor lock contention** (alert if too many failures)
5. **Prefer ZooKeeper/etcd for critical systems** (CP guarantees)

---

## 🎓 Interview Tips

**Q: "What is a distributed lock and why is it needed?"**

A: "A distributed lock ensures only one process across multiple servers accesses a shared resource. Needed for:
- **Prevent race conditions** (two servers updating inventory simultaneously)
- **Avoid duplicate work** (scheduled job runs only once)
- **Coordination** (only one leader performs action)

Example: E-commerce inventory. Without lock: Two customers buy last item → oversell. With lock: First customer acquires lock → checks stock → purchases → releases lock. Second customer waits → checks stock → out of stock."

**Q: "How does a Redis-based distributed lock work?"**

A: "Redis lock using SET NX (Set if Not eXists):
1. Client: `SET lock:resource client-uuid NX EX 10` (atomic set if not exists, 10s expiry)
2. If returns OK → lock acquired
3. If returns nil → another client holds lock, retry
4. Release: Lua script checks owner (client-uuid) then deletes

Key features:
- **TTL prevents deadlock** (auto-release if client crashes)
- **Unique ID ensures only owner releases** (prevent releasing others' locks)
- **Atomic operations** (SET NX + Lua script for check-and-delete)"

---

## 🔗 Related Topics
- **104. Leader Election** - Single coordinator
- **108. Consensus Basics** - Agreement protocols
- **89. CAP Theorem** - Consistency trade-offs
- **101. Idempotency** - Safe retries

---

## 📚 Summary

**Distributed Lock**: Mutual exclusion across multiple machines

**Why**: Prevent race conditions, avoid duplicate work

**Implementations**: Redis (SET NX), Redlock (quorum), ZooKeeper, etcd

**Key Properties**: Safety (mutual exclusion), Liveness (no deadlock with TTL), Fault tolerance

**Best Practice**: Use ZooKeeper/etcd for critical systems 🚀
