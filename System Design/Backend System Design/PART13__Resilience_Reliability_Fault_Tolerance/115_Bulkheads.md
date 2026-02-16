# 115. Bulkheads

## 📌 Overview

**Bulkhead** isolates resources into separate pools so failure in one doesn't affect others.

**Named after ship compartments**: If one floods, sealed doors prevent water spreading to others.

```
Without Bulkheads:
Service A slow → All threads blocked → Service B can't run ❌

With Bulkheads:
Service A slow → Only Service A threads blocked → Service B unaffected ✓
```

---

## 🎯 Why Bulkheads?

### **Problem: Resource Exhaustion**

```
Scenario: Slow database query blocks all threads

Thread Pool (100 threads total):
Time 0s:  Request 1 (DB query, slow) → Thread 1 blocked
Time 1s:  Request 2 (DB query, slow) → Thread 2 blocked
Time 2s:  Request 3 (DB query, slow) → Thread 3 blocked
...
Time 99s: Request 100 (DB query, slow) → Thread 100 blocked

Result:
- All 100 threads blocked on slow DB
- New requests rejected (no threads available)
- Other services (cache, API) can't run
- SYSTEM DOWN ❌
```

### **Solution: Bulkheads (Isolated Pools)**

```
Thread Pool A (50 threads for DB):
Requests 1-50: Use pool A
Request 51: Rejected (Pool A full)

Thread Pool B (30 threads for Cache):
Cache requests: Use pool B (unaffected by DB issues) ✓

Thread Pool C (20 threads for API):
API requests: Use pool C (unaffected) ✓

Result:
- DB slow only affects Pool A
- Cache and API continue working
- System degraded but ALIVE ✓
```

---

## 🛠️ Thread Pool Bulkheads

### **Python: ThreadPoolExecutor**

```python
from concurrent.futures import ThreadPoolExecutor, TimeoutError
import time

# Create separate thread pools (bulkheads)
db_pool = ThreadPoolExecutor(max_workers=10, thread_name_prefix="DB")
cache_pool = ThreadPoolExecutor(max_workers=5, thread_name_prefix="Cache")
api_pool = ThreadPoolExecutor(max_workers=10, thread_name_prefix="API")

def slow_db_query(query_id):
    """Slow database query (simulated)"""
    print(f"DB Query {query_id} started")
    time.sleep(10)  # Slow query
    return f"DB result {query_id}"

def fast_cache_get(key):
    """Fast cache lookup"""
    print(f"Cache get {key}")
    time.sleep(0.1)
    return f"cached_{key}"

def api_call(url):
    """External API call"""
    print(f"API call {url}")
    time.sleep(2)
    return f"API result {url}"

# Submit tasks to isolated pools
db_futures = []
for i in range(20):  # 20 DB requests (pool size = 10)
    future = db_pool.submit(slow_db_query, i)
    db_futures.append(future)

# Even though DB pool saturated, cache still works
cache_result = cache_pool.submit(fast_cache_get, "user:123").result()
print(f"✓ Cache worked: {cache_result}")  # Works despite DB issues

# API also unaffected
api_result = api_pool.submit(api_call, "https://api.example.com").result()
print(f"✓ API worked: {api_result}")  # Works despite DB issues

# Cleanup
db_pool.shutdown()
cache_pool.shutdown()
api_pool.shutdown()
```

**Output:**
```
DB Query 0 started
DB Query 1 started
...
DB Query 9 started
(10 threads busy, 10 waiting)

✓ Cache worked: cached_user:123  (Cache pool unaffected)
✓ API worked: API result https://api.example.com  (API pool unaffected)
```

---

## 🎯 Connection Pool Bulkheads

### **Database Connection Pools**

```python
import psycopg2
from psycopg2 import pool

# Separate connection pools for different services
class DatabaseBulkheads:
    def __init__(self):
        # Pool 1: Read queries (20 connections)
        self.read_pool = pool.ThreadedConnectionPool(
            minconn=5,
            maxconn=20,
            database="mydb",
            user="reader",
            password="***"
        )
        
        # Pool 2: Write queries (10 connections)
        self.write_pool = pool.ThreadedConnectionPool(
            minconn=3,
            maxconn=10,
            database="mydb",
            user="writer",
            password="***"
        )
        
        # Pool 3: Analytics queries (5 connections, isolated)
        self.analytics_pool = pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=5,
            database="mydb",
            user="analytics",
            password="***"
        )
    
    def read_query(self, query):
        """Execute read query (from read pool)"""
        conn = self.read_pool.getconn()
        try:
            cursor = conn.cursor()
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            self.read_pool.putconn(conn)
    
    def write_query(self, query):
        """Execute write query (from write pool)"""
        conn = self.write_pool.getconn()
        try:
            cursor = conn.cursor()
            cursor.execute(query)
            conn.commit()
        finally:
            self.write_pool.putconn(conn)
    
    def analytics_query(self, query):
        """Execute analytics query (from analytics pool)"""
        conn = self.analytics_pool.getconn()
        try:
            cursor = conn.cursor()
            cursor.execute(query)
            return cursor.fetchall()
        finally:
            self.analytics_pool.putconn(conn)

# Usage
db = DatabaseBulkheads()

# Slow analytics query doesn't affect reads/writes
analytics_result = db.analytics_query("SELECT COUNT(*) FROM huge_table")

# Read queries continue working
users = db.read_query("SELECT * FROM users WHERE id = 123")

# Write queries unaffected
db.write_query("INSERT INTO orders VALUES (1, 'Order A')")
```

**Benefits:**
- Slow analytics queries isolated (5 connections max)
- Read/write queries unaffected by analytics
- Prevent analytics queries from exhausting connections

---

## 🎯 Semaphore Bulkheads

### **Limit Concurrent Calls**

```python
import asyncio
from asyncio import Semaphore

class SemaphoreBulkhead:
    """Limit concurrent calls per service"""
    
    def __init__(self, service_limits):
        # service_name → max_concurrent_calls
        self.semaphores = {
            service: Semaphore(limit)
            for service, limit in service_limits.items()
        }
    
    async def call(self, service_name, func, *args, **kwargs):
        """Execute call with semaphore limit"""
        if service_name not in self.semaphores:
            raise ValueError(f"Unknown service: {service_name}")
        
        semaphore = self.semaphores[service_name]
        
        async with semaphore:
            # Only N calls can run concurrently
            return await func(*args, **kwargs)

# Configure limits
bulkhead = SemaphoreBulkhead({
    'payment_api': 10,    # Max 10 concurrent payment calls
    'email_service': 5,   # Max 5 concurrent email sends
    'sms_service': 3      # Max 3 concurrent SMS sends
})

# Define service calls
async def call_payment_api(order_id):
    await asyncio.sleep(2)  # Simulate API call
    return f"Payment processed: {order_id}"

async def send_email(user_id):
    await asyncio.sleep(1)
    return f"Email sent: {user_id}"

# Usage
async def main():
    # Submit 20 payment requests
    payment_tasks = [
        bulkhead.call('payment_api', call_payment_api, i)
        for i in range(20)
    ]
    
    # Submit 10 email tasks
    email_tasks = [
        bulkhead.call('email_service', send_email, i)
        for i in range(10)
    ]
    
    # Execute concurrently
    # Max 10 payment calls run simultaneously (others wait)
    # Max 5 email sends run simultaneously (independent of payments)
    results = await asyncio.gather(*payment_tasks, *email_tasks)
    print(f"Completed {len(results)} tasks")

asyncio.run(main())
```

---

## 🎯 Queue Bulkheads

### **Separate Queues Per Service**

```python
import queue
import threading
import time

class QueueBulkhead:
    """Separate queues for different task types"""
    
    def __init__(self):
        # Separate queues (bulkheads)
        self.high_priority_queue = queue.Queue(maxsize=100)
        self.normal_priority_queue = queue.Queue(maxsize=500)
        self.low_priority_queue = queue.Queue(maxsize=1000)
        
        # Separate worker threads for each queue
        self.start_workers()
    
    def start_workers(self):
        """Start worker threads for each queue"""
        # High priority: 5 workers
        for i in range(5):
            t = threading.Thread(
                target=self.process_queue,
                args=(self.high_priority_queue, "HIGH"),
                daemon=True
            )
            t.start()
        
        # Normal priority: 10 workers
        for i in range(10):
            t = threading.Thread(
                target=self.process_queue,
                args=(self.normal_priority_queue, "NORMAL"),
                daemon=True
            )
            t.start()
        
        # Low priority: 3 workers (fewer resources)
        for i in range(3):
            t = threading.Thread(
                target=self.process_queue,
                args=(self.low_priority_queue, "LOW"),
                daemon=True
            )
            t.start()
    
    def process_queue(self, q, priority):
        """Worker thread processes tasks from queue"""
        while True:
            try:
                task = q.get(timeout=1)
                print(f"[{priority}] Processing: {task}")
                time.sleep(0.5)  # Simulate work
                q.task_done()
            except queue.Empty:
                pass
    
    def submit_high_priority(self, task):
        """Submit high priority task"""
        try:
            self.high_priority_queue.put_nowait(task)
        except queue.Full:
            raise Exception("High priority queue full")
    
    def submit_normal_priority(self, task):
        """Submit normal priority task"""
        try:
            self.normal_priority_queue.put_nowait(task)
        except queue.Full:
            raise Exception("Normal priority queue full")
    
    def submit_low_priority(self, task):
        """Submit low priority task"""
        try:
            self.low_priority_queue.put_nowait(task)
        except queue.Full:
            raise Exception("Low priority queue full")

# Usage
bulkhead = QueueBulkhead()

# Submit tasks to different queues
bulkhead.submit_high_priority("Payment processing")
bulkhead.submit_high_priority("User authentication")

bulkhead.submit_normal_priority("Send email")
bulkhead.submit_normal_priority("Update profile")

bulkhead.submit_low_priority("Generate report")
bulkhead.submit_low_priority("Clean up logs")

time.sleep(5)  # Wait for processing
```

**Benefits:**
- Low priority tasks don't block high priority
- Independent processing rates
- Backpressure per queue (not global)

---

## 🎯 Real-World Examples

### **1. Netflix: Hystrix Thread Pools**

```java
@HystrixCommand(
    threadPoolKey = "PaymentServicePool",
    threadPoolProperties = {
        @HystrixProperty(name = "coreSize", value = "10"),
        @HystrixProperty(name = "maxQueueSize", value = "100")
    }
)
public Payment processPayment(Order order) {
    return paymentService.charge(order);
}

@HystrixCommand(
    threadPoolKey = "EmailServicePool",
    threadPoolProperties = {
        @HystrixProperty(name = "coreSize", value = "5"),
        @HystrixProperty(name = "maxQueueSize", value = "50")
    }
)
public void sendEmail(String to, String message) {
    emailService.send(to, message);
}
```

### **2. AWS: Lambda Concurrency Limits**

```yaml
# Separate concurrency limits (bulkheads)
Functions:
  PaymentProcessor:
    ReservedConcurrentExecutions: 100  # Max 100 concurrent
  
  EmailSender:
    ReservedConcurrentExecutions: 50   # Max 50 concurrent
  
  ReportGenerator:
    ReservedConcurrentExecutions: 10   # Max 10 concurrent (limited)

# Slow report generation doesn't exhaust Lambda capacity
```

### **3. Kubernetes: Resource Limits**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: payment-service
spec:
  containers:
  - name: app
    resources:
      limits:
        memory: "2Gi"    # Max 2GB RAM
        cpu: "1000m"     # Max 1 CPU core
      requests:
        memory: "1Gi"    # Guaranteed 1GB
        cpu: "500m"      # Guaranteed 0.5 CPU

---
apiVersion: v1
kind: Pod
metadata:
  name: analytics-service
spec:
  containers:
  - name: app
    resources:
      limits:
        memory: "4Gi"    # More memory for analytics
        cpu: "2000m"
      requests:
        memory: "2Gi"
        cpu: "1000m"

# Payment service can't consume all resources
# Analytics isolated with separate limits
```

---

## ✅ Best Practices

### **1. Size Bulkheads Appropriately**

```python
# Bad: Equal size for all services
db_pool = ThreadPoolExecutor(max_workers=10)
cache_pool = ThreadPoolExecutor(max_workers=10)  # ❌

# Good: Size based on usage and latency
db_pool = ThreadPoolExecutor(max_workers=20)     # Slow, needs more
cache_pool = ThreadPoolExecutor(max_workers=5)   # Fast, needs fewer ✓
api_pool = ThreadPoolExecutor(max_workers=10)    # Medium
```

### **2. Monitor Pool Utilization**

```python
class MonitoredThreadPool:
    def __init__(self, name, max_workers):
        self.name = name
        self.pool = ThreadPoolExecutor(max_workers=max_workers)
        self.max_workers = max_workers
        self.active_count = 0
    
    def submit(self, func, *args, **kwargs):
        self.active_count += 1
        
        # Check utilization
        utilization = self.active_count / self.max_workers
        if utilization > 0.8:  # >80% utilized
            print(f"⚠️ {self.name} pool 80% full ({self.active_count}/{self.max_workers})")
        
        future = self.pool.submit(func, *args, **kwargs)
        future.add_done_callback(lambda _: self._on_complete())
        return future
    
    def _on_complete(self):
        self.active_count -= 1

# Usage
db_pool = MonitoredThreadPool("DB", 20)
db_pool.submit(slow_query, "SELECT * FROM orders")
```

### **3. Handle Pool Exhaustion Gracefully**

```python
from concurrent.futures import ThreadPoolExecutor, TimeoutError

def call_with_bulkhead(pool, func, timeout=5):
    """Submit to pool with timeout"""
    try:
        future = pool.submit(func)
        return future.result(timeout=timeout)
    except TimeoutError:
        # Pool saturated, timeout
        print("⚠️ Pool saturated, falling back")
        return fallback_response()
    except Exception as e:
        print(f"✗ Error: {e}")
        raise
```

### **4. Use Circuit Breaker with Bulkheads**

```python
class BulkheadWithCircuitBreaker:
    """Combine bulkhead and circuit breaker"""
    
    def __init__(self, name, max_workers, failure_threshold=5):
        self.name = name
        self.pool = ThreadPoolExecutor(max_workers=max_workers)
        self.breaker = CircuitBreaker(failure_threshold=failure_threshold)
    
    def call(self, func, *args, **kwargs):
        # Check circuit breaker first
        if self.breaker.state == State.OPEN:
            raise CircuitOpenError(f"{self.name} circuit open")
        
        # Submit to bulkhead
        try:
            future = self.pool.submit(func, *args, **kwargs)
            result = future.result(timeout=10)
            self.breaker._on_success()
            return result
        except Exception as e:
            self.breaker._on_failure()
            raise

# Usage
payment_bulkhead = BulkheadWithCircuitBreaker("Payment", max_workers=10)
result = payment_bulkhead.call(process_payment, order_id=123)
```

---

## 🎓 Interview Tips

**Q: "What is bulkhead pattern?"**

A: "Bulkhead isolates resources into separate pools so failure in one doesn't affect others.

Named after ship compartments: If one compartment floods, sealed bulkheads prevent water spreading to others.

Example:
- Without bulkheads: 100 threads shared by all services. Slow DB exhausts all threads → other services starve ❌
- With bulkheads: 50 threads for DB, 30 for API, 20 for cache. DB slow only affects DB pool → API/cache work ✓

Types:
1. **Thread pool bulkheads**: Separate ThreadPoolExecutors per service
2. **Connection pool bulkheads**: Separate DB connection pools (read/write/analytics)
3. **Semaphore bulkheads**: Limit concurrent calls per service
4. **Queue bulkheads**: Separate queues for different task types

Real-world: Netflix Hystrix, AWS Lambda concurrency limits, Kubernetes resource limits"

**Q: "How do you size bulkheads?"**

A: "Based on:

1. **Service latency**:
   - Fast service (cache, 10ms): Small pool (5 threads)
   - Medium service (API, 100ms): Medium pool (10 threads)
   - Slow service (DB, 1s): Large pool (20 threads)

2. **Request rate**:
   - High rate: Larger pool
   - Low rate: Smaller pool

3. **Criticality**:
   - Critical (payment): Larger pool, high priority
   - Non-critical (analytics): Smaller pool, low priority

Formula: `pool_size = (request_rate × latency) / utilization`

Example:
- Request rate: 100 req/s
- Latency: 0.5s (500ms)
- Target utilization: 80%
- Pool size: (100 × 0.5) / 0.8 = 62 threads

Monitor utilization, alert if >80% (risk of saturation)"

**Q: "What are trade-offs of bulkheads?"**

A: "Pros:
- Fault isolation: Failure in one service doesn't affect others
- Performance isolation: Slow service doesn't slow others
- Resource guarantees: Each service guaranteed minimum resources

Cons:
- **Resource overhead**: Multiple pools = more total resources
  - Example: 3 pools × 20 threads = 60 threads (vs 40 shared)
- **Complexity**: Manage multiple pools, tune each separately
- **Underutilization**: If service idle, its resources wasted
  - Pool A: 5/20 threads used (75% wasted)
  - Pool B: 20/20 threads (fully utilized)
  - Can't share unused Pool A threads with Pool B

When to use:
- Services with different latency characteristics
- Critical services that must stay available
- Prevent cascading failures

When not to use:
- Low resource environments (overhead too high)
- Highly variable load (hard to size pools)"

---

## 📚 Summary

**Bulkhead**: Isolate resources into separate pools

**Why**: Prevent failure in one service from affecting others

**Types**: Thread pools, connection pools, semaphores, queues

**Sizing**: Based on latency, request rate, criticality

**Best Practice**: Monitor utilization, handle exhaustion, combine with circuit breaker 🚀
