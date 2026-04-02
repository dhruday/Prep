# 135. Production Debugging

## 📌 Overview

**Production debugging**: Diagnosing issues in live production environment

**Challenge**: Can't use local debugger (can't stop execution, affects users)

**Solution**: Use logs, metrics, traces, profiling, and other non-invasive techniques

---

## 🎯 Production Debugging Tools

### **1. Logs** (First line of defense)

**Use case**: Understand what happened

**Example**:

```bash
# Recent errors
grep "ERROR" /var/log/app.log | tail -100

# Specific user request
grep "request_id=abc-123" /var/log/app.log

# Result:
2024-01-15T10:05:23Z ERROR request_id=abc-123 user_id=456 error="database connection timeout"
```

**Best practice**: Structured logging (JSON)

```python
logger.info('order_created', 
    request_id=g.request_id,
    user_id=user.id,
    order_id=order.id,
    total=order.total,
    duration_ms=duration
)
```

**ELK query** (Kibana):

```
request_id: "abc-123"
AND level: "error"
```

---

### **2. Metrics** (Real-time system health)

**Use case**: Identify anomalies

**Example** (Grafana):

```
- Error rate: 0% → 7% (spike at 10:05 AM) ⚠️
- p95 latency: 200ms → 5s (spike at 10:05 AM) ⚠️
- CPU: 50% → 90% (spike at 10:05 AM) ⚠️
- Database connections: 50 → 100 (maxed out) ⚠️
```

**Correlation**: All spiked at 10:05 AM → Deployment at 10:00 AM

---

### **3. Distributed Traces** (Request flow)

**Use case**: Identify bottleneck across services

**Example** (Jaeger):

```
Trace: GET /api/orders/123 (2.5s)
├─ API Gateway (10ms)
├─ Orders Service (2.4s)
│  ├─ Database Query (2s) ← BOTTLENECK
│  └─ Price Calculation (400ms)
└─ Response (10ms)

Insight: Database query slow (missing index)
```

---

### **4. Profiling** (CPU/Memory usage)

**Use case**: Identify performance bottlenecks

**CPU profiling**:

```python
import cProfile

# Profile specific function
cProfile.run('slow_function()')

# Result:
ncalls  tottime  percall  cumtime  percall filename:lineno(function)
    1    0.500    0.500    2.000    2.000 database.py:45(query)  ← SLOW
 1000    1.500    0.001    1.500    0.001 utils.py:10(parse_json)
```

**Memory profiling**:

```python
from memory_profiler import profile

@profile
def process_data():
    data = load_large_file()  # Memory spike here
    result = process(data)
    return result

# Result:
Line #    Mem usage    Increment   Line Contents
     3     50 MB         0 MB       def process_data():
     4    500 MB       450 MB           data = load_large_file()  ← LEAK
     5    550 MB        50 MB           result = process(data)
```

---

### **5. Thread Dumps** (Stuck threads)

**Use case**: Identify deadlocks, hung threads

**Example** (Python):

```bash
# Send signal to dump all thread stacks
kill -SIGUSR1 <pid>

# Result in logs:
Thread 1 (active): Waiting on database lock (line 123)
Thread 2 (active): Waiting on database lock (line 456)

Deadlock detected: Thread 1 holds lock A, waiting for lock B
                   Thread 2 holds lock B, waiting for lock A
```

---

### **6. Heap Dumps** (Memory leaks)

**Use case**: Identify memory leaks

**Example** (Java):

```bash
# Generate heap dump
jmap -dump:live,format=b,file=heap.bin <pid>

# Analyze with Eclipse MAT
# Result:
- 1 GB: User objects (normal)
- 5 GB: Cache entries (not evicted) ← LEAK
```

---

## 🎯 Debugging Techniques

### **1. Log-Based Debugging**

**Example**: User reports "Checkout failed"

**Step 1**: Find user's request

```bash
# Search by user_id
grep "user_id=456" /var/log/app.log | grep "checkout"

# Result:
2024-01-15T10:05:23Z INFO request_id=abc-123 user_id=456 event=checkout_started order_id=789
2024-01-15T10:05:25Z ERROR request_id=abc-123 user_id=456 event=payment_failed error="stripe timeout"
```

**Step 2**: Trace request flow

```bash
# All logs for this request
grep "request_id=abc-123" /var/log/app.log

# Result:
10:05:23Z INFO  checkout_started
10:05:24Z INFO  cart_validated
10:05:24Z INFO  inventory_reserved
10:05:25Z INFO  calling_stripe_api
10:05:55Z ERROR stripe_api_timeout (30s timeout) ← ROOT CAUSE
10:05:55Z ERROR payment_failed
10:05:55Z INFO  inventory_released (rollback)
```

**Root cause**: Stripe API timed out after 30 seconds

**Fix**: Increase timeout or add retry logic

---

### **2. Metric-Based Debugging**

**Example**: p95 latency spiked at 3 PM

**Step 1**: Check dashboard (Grafana)

```
3:00 PM:
- p95 latency: 200ms → 5s (25x increase) ⚠️
- Error rate: 0% (no errors, just slow)
- CPU: 60% (normal)
- Memory: 70% (normal)
- Database connections: 80 (normal)
```

**Step 2**: Drill down by endpoint

```
Latency by endpoint:
- GET /api/users:    200ms (normal)
- GET /api/orders:   5s    (SLOW) ⚠️
- POST /api/checkout: 300ms (normal)
```

**Step 3**: Check database metrics

```
Database query duration (orders table):
- SELECT * FROM orders WHERE user_id=?: 5s ⚠️

Queries per second: 100 (normal)
```

**Root cause**: Missing database index on `user_id`

**Fix**: Add index

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

**Result**: Latency drops 5s → 50ms ✓

---

### **3. Trace-Based Debugging**

**Example**: Slow API request (user complaint)

**Step 1**: Find trace in Jaeger

```
Search: http.url="/api/orders/123" AND duration > 1s
Result: Trace abc-123 (2.5s)
```

**Step 2**: View trace timeline

```
Trace: GET /api/orders/123 (2.5s)
├─ API Gateway (10ms)
├─ Auth Service (20ms)
├─ Orders Service (2.4s)
│  ├─ Database: Get Order (50ms)
│  ├─ Database: Get Items (2s) ← BOTTLENECK (N+1 query)
│  └─ Price Calculation (400ms)
└─ Response (10ms)
```

**Root cause**: N+1 query (100 items = 100 separate queries)

**Fix**: Batch query (fetch all items in one query)

```python
# Before (N+1 query) ❌
order = db.query('SELECT * FROM orders WHERE id=?', order_id)
items = []
for item_id in order.item_ids:
    item = db.query('SELECT * FROM items WHERE id=?', item_id)  # 100 queries
    items.append(item)

# After (batch query) ✓
order = db.query('SELECT * FROM orders WHERE id=?', order_id)
items = db.query('SELECT * FROM items WHERE id IN (?)', order.item_ids)  # 1 query
```

**Result**: 2s → 50ms ✓

---

### **4. Profiling in Production**

**Use case**: Identify CPU hotspots

**Example**: High CPU usage (80%), but unclear why

**Step 1**: Enable profiling (Python)

```python
import cProfile
import pstats
from pstats import SortKey

# Profile for 60 seconds
profiler = cProfile.Profile()
profiler.enable()

# Wait 60 seconds...
time.sleep(60)

profiler.disable()

# Save to file
profiler.dump_stats('profile.prof')
```

**Step 2**: Analyze profile

```python
stats = pstats.Stats('profile.prof')
stats.sort_stats(SortKey.CUMULATIVE)
stats.print_stats(10)  # Top 10 functions

# Result:
ncalls  tottime  percall  cumtime  percall filename:lineno(function)
  1000   30.0     0.030    45.0     0.045  utils.py:10(compute_recommendations) ← SLOW
 10000   10.0     0.001    10.0     0.001  json.py:45(dumps)
  5000    5.0     0.001     5.0     0.001  database.py:20(query)
```

**Root cause**: `compute_recommendations()` called 1000x, each takes 45ms

**Fix**: Cache recommendations (reduce calls)

```python
# Before ❌
for user in users:
    recommendations = compute_recommendations(user)  # 1000 calls

# After ✓
recommendations_cache = {}
for user in users:
    if user.id not in recommendations_cache:
        recommendations_cache[user.id] = compute_recommendations(user)
    recommendations = recommendations_cache[user.id]
```

**Result**: CPU drops 80% → 30% ✓

---

## 🎯 Common Production Issues

### **1. Memory Leak**

**Symptoms**:
- Memory usage increases over time
- Eventually crashes (OOM)

**Debugging**:

```python
# Check memory usage
import psutil
process = psutil.Process()
print(f"Memory: {process.memory_info().rss / 1024 / 1024} MB")

# Profile memory
from memory_profiler import profile

@profile
def leaky_function():
    cache = {}
    for i in range(1000000):
        cache[i] = {'data': 'x' * 1000}  # Never evicted ← LEAK
    return cache

# Result:
Line #    Mem usage    Increment
     3     50 MB         0 MB       cache = {}
     5   1000 MB       950 MB       cache[i] = ... ← LEAK
```

**Fix**: Evict old entries

```python
from functools import lru_cache

@lru_cache(maxsize=1000)  # Max 1000 entries
def get_data(key):
    return compute_expensive_data(key)
```

---

### **2. Deadlock**

**Symptoms**:
- Requests hang indefinitely
- Thread dump shows circular wait

**Debugging**:

```bash
# Python: Send signal to dump threads
kill -SIGUSR1 <pid>

# Result:
Thread 1: Waiting for lock B (held by Thread 2)
  File "app.py", line 123, in process_order
    with lock_b:  # Waiting...

Thread 2: Waiting for lock A (held by Thread 1)
  File "app.py", line 456, in update_inventory
    with lock_a:  # Waiting...

Deadlock: Thread 1 holds A, wants B
          Thread 2 holds B, wants A
```

**Fix**: Acquire locks in consistent order

```python
# Before (deadlock) ❌
# Thread 1
with lock_a:
    with lock_b:
        process()

# Thread 2
with lock_b:
    with lock_a:
        process()

# After (no deadlock) ✓
# Always acquire locks in same order
with lock_a:
    with lock_b:
        process()
```

---

### **3. Database Connection Pool Exhausted**

**Symptoms**:
- Errors: "Could not acquire connection"
- All database connections in use

**Debugging**:

```python
# Check pool status
print(f"Active connections: {db.pool.active_connections}")
print(f"Max connections: {db.pool.max_connections}")

# Result:
Active: 100
Max: 100  ← Pool exhausted
```

**Root cause**: Connections not released

```python
# Before (leak) ❌
def query_database():
    conn = db.get_connection()
    result = conn.execute('SELECT * FROM users')
    return result
    # Connection not released! ← LEAK

# After (fixed) ✓
def query_database():
    with db.get_connection() as conn:  # Auto-release
        result = conn.execute('SELECT * FROM users')
        return result
```

**Temporary fix**: Increase pool size

```python
db = Database(pool_size=200)  # Was 100
```

---

### **4. N+1 Query**

**Symptoms**:
- Slow database queries
- Many individual queries instead of batch

**Debugging**:

```python
# Enable SQL logging
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Result:
SELECT * FROM orders WHERE id=123
SELECT * FROM items WHERE id=1    # N+1 ❌
SELECT * FROM items WHERE id=2
SELECT * FROM items WHERE id=3
...
SELECT * FROM items WHERE id=100  # 100 queries!
```

**Fix**: Batch query

```python
# Before (N+1) ❌
order = db.query('SELECT * FROM orders WHERE id=?', order_id)
items = [db.query('SELECT * FROM items WHERE id=?', item_id) for item_id in order.item_ids]

# After (batch) ✓
order = db.query('SELECT * FROM orders WHERE id=?', order_id)
items = db.query('SELECT * FROM items WHERE id IN (?)', order.item_ids)
```

---

### **5. Third-Party API Timeout**

**Symptoms**:
- Requests hang for 30s (default timeout)
- Error: "Connection timeout"

**Debugging**:

```python
# Check trace
Trace: POST /api/checkout (35s)
├─ Validate Cart (100ms)
├─ Reserve Inventory (200ms)
├─ Stripe API (30s) ← TIMEOUT
└─ Rollback (100ms)
```

**Fix**: Add timeout, retry, circuit breaker

```python
# Before (hangs forever) ❌
response = requests.post('https://api.stripe.com/charge', data=data)

# After (timeout) ✓
response = requests.post('https://api.stripe.com/charge', data=data, timeout=5)

# Better (retry + circuit breaker) ✓
from tenacity import retry, stop_after_attempt, wait_exponential
from pybreaker import CircuitBreaker

breaker = CircuitBreaker(fail_max=5, timeout_duration=60)

@breaker
@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
def charge_stripe(data):
    return requests.post('https://api.stripe.com/charge', data=data, timeout=5)
```

---

## 🎯 Feature Flags (Safe Rollout)

**Use case**: Deploy new feature, disable if issues

**Example**:

```python
from flask import Flask, jsonify

app = Flask(__name__)

# Feature flag (controlled externally)
FEATURE_FLAGS = {
    'recommendations_enabled': True
}

@app.route('/api/recommendations')
def recommendations():
    if not FEATURE_FLAGS['recommendations_enabled']:
        # Feature disabled → Graceful degradation
        return jsonify([])
    
    try:
        return jsonify(get_recommendations())
    except Exception as e:
        # Error → Disable feature automatically
        FEATURE_FLAGS['recommendations_enabled'] = False
        logger.error('recommendations_failed', error=str(e))
        return jsonify([])
```

**Remote configuration** (LaunchDarkly, Unleash):

```python
import launchdarkly

client = launchdarkly.Client('YOUR_SDK_KEY')

@app.route('/api/recommendations')
def recommendations():
    # Check feature flag (can be toggled in LaunchDarkly dashboard)
    if not client.variation('recommendations-enabled', user, False):
        return jsonify([])
    
    return jsonify(get_recommendations())
```

**Benefits**:
- Deploy feature (disabled)
- Enable for 1% of users (canary)
- If issues: Disable instantly (no redeployment)
- If success: Enable for 100%

---

## 🎯 Canary Deployment

**Use case**: Deploy to small percentage of users, monitor, gradually roll out

**Example**:

```
Version v1.2.2 (old): 99% of traffic
Version v1.2.3 (new):  1% of traffic (canary)

Monitor for 1 hour:
- Error rate: 0.5% (v1.2.2) vs 0.6% (v1.2.3) ✓ Similar
- Latency: 200ms (v1.2.2) vs 210ms (v1.2.3) ✓ Similar

Result: No issues, increase to 10%

Version v1.2.2: 90% of traffic
Version v1.2.3: 10% of traffic

Monitor for 1 hour: No issues ✓

Gradually roll out: 10% → 25% → 50% → 100%
```

**Kubernetes example**:

```yaml
# Deployment: v1.2.3 (canary)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-service-canary
spec:
  replicas: 1  # 1 pod (1% of traffic)
  template:
    metadata:
      labels:
        app: orders-service
        version: v1.2.3
    spec:
      containers:
      - name: orders-service
        image: orders-service:v1.2.3

---
# Deployment: v1.2.2 (stable)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-service-stable
spec:
  replicas: 99  # 99 pods (99% of traffic)
  template:
    metadata:
      labels:
        app: orders-service
        version: v1.2.2
    spec:
      containers:
      - name: orders-service
        image: orders-service:v1.2.2
```

---

## 🎯 AWS X-Ray (Distributed Tracing)

**Use case**: Trace serverless applications (Lambda)

**Example**:

```python
from aws_xray_sdk.core import xray_recorder

@xray_recorder.capture('process_order')
def lambda_handler(event, context):
    order_id = event['order_id']
    
    # Trace DynamoDB call
    with xray_recorder.in_subsegment('get_order') as subsegment:
        order = dynamodb.get_item(Key={'id': order_id})
        subsegment.put_metadata('order_id', order_id)
    
    # Trace external API call
    with xray_recorder.in_subsegment('charge_stripe') as subsegment:
        response = requests.post('https://api.stripe.com/charge', data=data)
        subsegment.put_metadata('charge_id', response.json()['id'])
    
    return {'status': 'success'}
```

**X-Ray trace view**:

```
Lambda: process_order (1.2s)
├─ Initialization (800ms) ← Cold start
├─ get_order (200ms)
│  └─ DynamoDB: GetItem (150ms)
├─ charge_stripe (400ms)
│  └─ Stripe API (380ms)
└─ Response (50ms)
```

---

## 🎯 Real-World Examples

### **1. Netflix (Chaos Engineering)**

**Use case**: Test resilience by intentionally breaking production

**Example**: Chaos Monkey (randomly kills servers)

```
Random server killed → Traffic routed to healthy servers → No user impact ✓

Result: Confidence that system handles failures
```

**Other tools**:
- **Latency Monkey**: Inject latency to dependencies
- **Chaos Kong**: Kill entire AWS region

---

### **2. Uber (Live Debugging)**

**Use case**: Debug production issues without redeployment

**Tool**: **Go runtime** inspection

```bash
# Connect to running process
curl http://localhost:6060/debug/pprof/goroutine?debug=1

# Result: All goroutines, stack traces
goroutine 1 [running]:
main.processRide()
    /app/main.go:123

goroutine 2 [waiting]:
database.query()
    /app/db.go:45
```

**CPU profiling**:

```bash
# 30-second CPU profile
curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu.prof

# Analyze
go tool pprof cpu.prof
```

---

### **3. AWS (X-Ray Tracing)**

**Use case**: Trace Lambda invocations

**Example**:

```
API Gateway → Lambda (Auth) → Lambda (Process) → DynamoDB

Trace shows:
- Lambda cold start: 800ms ← SLOW
- DynamoDB query: 50ms
- Total: 1.2s

Optimization: Pre-warm Lambda → Cold start eliminated
Result: 1.2s → 250ms ✓
```

---

## ✅ Best Practices

1. **Structured logging** (JSON format, request_id)
2. **Distributed tracing** (trace across services)
3. **Metrics-driven** (monitor key metrics, alert on anomalies)
4. **Feature flags** (disable broken features instantly)
5. **Canary deployments** (roll out gradually, monitor)
6. **Profiling** (identify CPU/memory hotspots)
7. **Graceful degradation** (fallback if dependency fails)
8. **Timeouts** (don't hang forever, fail fast)
9. **Circuit breakers** (stop calling failing services)
10. **Correlation IDs** (trace request across logs/metrics/traces)

---

## 🎓 Interview Tips

**Q: "How do you debug a production issue?"**

A: "I use a systematic approach:

**1. Gather context**:
- What's the symptom? (error rate spike, latency high, users reporting errors)
- When did it start? (3 PM today)
- What changed recently? (deployment, config change, traffic spike)

**2. Check logs** (recent errors):
```bash
grep 'ERROR' /var/log/app.log | tail -100
grep 'request_id=abc-123' /var/log/app.log  # Specific request
```

**3. Check metrics** (Grafana):
- Error rate: 0% → 7% (spiked at 3 PM) ⚠️
- p95 latency: 200ms → 5s
- CPU: 60% (normal)
- Database connections: 100/100 (maxed out) ⚠️

**4. Check traces** (Jaeger):
```
Trace: GET /api/orders (2.5s)
├─ Database Query (2s) ← BOTTLENECK (missing index)
```

**5. Correlate**:
- Deployment at 3 PM → Spike at 3 PM
- New feature creates 10x database queries → Connection pool exhausted

**6. Mitigate** (stop the bleeding):
- Rollback deployment (fastest)
- Increase connection pool (temporary)

**7. Fix permanently**:
- Optimize feature (reduce queries)
- Add index (speed up queries)
- Test thoroughly (load testing)

Real-world example: Orders API outage
- Symptom: 500 errors
- Root cause: Database connection pool exhausted
- Mitigation: Rolled back deployment (45 min)
- Permanent fix: Optimized queries, increased pool size"

**Q: "What tools do you use for production debugging?"**

A: "
**1. Logs** (structured logging, ELK stack):
- Search by request_id, user_id, error
- Example: `grep 'request_id=abc-123' /var/log/app.log`

**2. Metrics** (Prometheus, Grafana):
- Real-time dashboards (error rate, latency, CPU)
- Identify anomalies (spike at 3 PM)

**3. Distributed tracing** (Jaeger, Zipkin):
- Trace request across services
- Identify bottlenecks (database query 2s)

**4. Profiling** (cProfile, pprof):
- CPU profiling (which functions are slow)
- Memory profiling (memory leaks)

**5. Application monitoring** (Datadog, New Relic):
- APM (automatic instrumentation)
- Database query analysis
- External API latency

**6. Feature flags** (LaunchDarkly):
- Disable broken features instantly (no redeployment)

**7. Canary deployments** (Kubernetes, Spinnaker):
- Roll out to 1% → Monitor → Gradually increase

Real-world: Netflix uses custom tools (Atlas for metrics, Kayenta for canary analysis), Uber uses custom profiling tools"

**Q: "How do you handle memory leaks in production?"**

A: "
**Detection**:
1. **Metrics**: Memory usage increases over time (never decreases)
2. **Alerts**: Memory > 80% for 10 minutes
3. **Crashes**: OOM (Out Of Memory) errors

**Debugging**:
1. **Heap dump** (capture memory snapshot):
```bash
# Python
import tracemalloc
tracemalloc.start()
# ... run for a while ...
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
for stat in top_stats[:10]:
    print(stat)
```

2. **Analyze**: Which objects consuming most memory?
```
Result:
- 1 GB: User objects (normal)
- 5 GB: Cache entries (never evicted) ← LEAK
```

**Mitigation** (temporary):
1. **Restart service** (clears memory)
2. **Scale out** (add more instances)

**Fix** (permanent):
1. **Evict old entries** (LRU cache with max size):
```python
from functools import lru_cache

@lru_cache(maxsize=1000)  # Max 1000 entries
def get_data(key):
    return compute(key)
```

2. **Reference counting** (delete unused objects):
```python
# Before ❌
cache = {}
cache[key] = large_object  # Never deleted

# After ✓
cache = {}
cache[key] = {'data': large_object, 'timestamp': time.time()}

# Evict old entries (>1 hour old)
for key in list(cache.keys()):
    if time.time() - cache[key]['timestamp'] > 3600:
        del cache[key]
```

**Prevention**:
1. **Memory profiling** (test for leaks before deployment)
2. **Monitoring** (alert if memory >80%)
3. **Auto-restart** (restart if memory >90%, temporary workaround)

Real-world: Netflix monitors memory per instance, auto-restarts if >90%"

---

## 📚 Summary

**Production debugging**: Diagnose issues without stopping service

**Tools**: Logs (structured JSON), Metrics (Grafana), Traces (Jaeger), Profiling (cProfile), APM (Datadog)

**Techniques**: Log-based (search by request_id), Metric-based (identify spikes), Trace-based (find bottlenecks)

**Common issues**: Memory leak (cache not evicted), Deadlock (circular wait), N+1 query (batch queries), Timeouts (add retry/circuit breaker)

**Safe rollout**: Feature flags (disable instantly), Canary deployment (1% → 100%)

**Real-world**: Netflix (Chaos Monkey), Uber (live debugging), AWS X-Ray (Lambda tracing) 🚀

