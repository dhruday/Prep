# 129. Metrics

## 📌 Overview

**Metrics** are numerical measurements of system behavior over time.

**Difference from logs**:
- **Logs**: Discrete events ("User logged in at 10:00:00")
- **Metrics**: Aggregated numbers ("CPU = 75%", "Request rate = 1000/s")

**Why needed**:
- Performance monitoring (CPU, memory, latency)
- Capacity planning (when to scale)
- Alerting (trigger alerts when threshold breached)
- Business insights (revenue, signups, engagement)

---

## 🎯 Types of Metrics

### **1. Counter** (Always increasing)

**Definition**: Cumulative value that only increases (or resets to zero)

**Examples**:
```python
# Total requests served
requests_total = 1,234,567

# Total bytes sent
bytes_sent_total = 5,123,456,789

# Total errors
errors_total = 42
```

**Use case**: Count events

**Visualization**: Rate of change (requests/second)

```python
# Prometheus counter
from prometheus_client import Counter

requests_total = Counter('requests_total', 'Total HTTP requests')

@app.route('/api/data')
def get_data():
    requests_total.inc()  # Increment counter
    return jsonify({'data': 'value'})

# Query: rate(requests_total[1m])
# Shows requests per second over last 1 minute
```

---

### **2. Gauge** (Can increase or decrease)

**Definition**: Current value that can go up or down

**Examples**:
```python
# Current CPU usage
cpu_usage = 75.3  # %

# Current memory usage
memory_usage_bytes = 8,589,934,592  # 8GB

# Active connections
active_connections = 1,234

# Queue size
queue_size = 567
```

**Use case**: Measure current state

**Visualization**: Value over time

```python
# Prometheus gauge
from prometheus_client import Gauge

active_connections = Gauge('active_connections', 'Number of active connections')

@app.before_request
def increment_connections():
    active_connections.inc()

@app.after_request
def decrement_connections(response):
    active_connections.dec()
    return response
```

---

### **3. Histogram** (Distribution of values)

**Definition**: Tracks distribution of values (latency, request size)

**Examples**:
```python
# Request latency distribution
# Buckets: <10ms, <50ms, <100ms, <500ms, <1000ms, <5000ms
{
  "le_10": 1000,   # 1000 requests < 10ms
  "le_50": 5000,   # 5000 requests < 50ms
  "le_100": 8000,  # 8000 requests < 100ms
  "le_500": 9500,  # 9500 requests < 500ms
  "le_1000": 9900, # 9900 requests < 1000ms
  "le_inf": 10000  # 10000 requests total
}

# Can calculate:
# - Median (p50): 50th percentile
# - p95: 95th percentile
# - p99: 99th percentile
```

**Use case**: Latency, request size, response time

**Visualization**: Percentiles (p50, p95, p99)

```python
# Prometheus histogram
from prometheus_client import Histogram

request_duration = Histogram(
    'request_duration_seconds',
    'HTTP request duration in seconds',
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]  # Define buckets
)

@app.route('/api/data')
def get_data():
    with request_duration.time():  # Measures duration automatically
        result = expensive_operation()
    return jsonify(result)

# Query: histogram_quantile(0.95, request_duration_seconds)
# Shows p95 latency (95% of requests faster than this)
```

---

### **4. Summary** (Similar to histogram, pre-calculated percentiles)

**Definition**: Tracks distribution with sliding time window

**Use case**: When you know which percentiles you need (p50, p95, p99)

```python
from prometheus_client import Summary

request_duration = Summary(
    'request_duration_seconds',
    'HTTP request duration in seconds'
)

@app.route('/api/data')
def get_data():
    with request_duration.time():
        result = expensive_operation()
    return jsonify(result)
```

**Histogram vs Summary**:
- **Histogram**: Server-side aggregation (flexible, can calculate any percentile later)
- **Summary**: Client-side aggregation (less flexible, lower storage cost)

---

## 🎯 Key Metrics to Track

### **1. Application Metrics**

**Request Rate** (QPS):
```python
# Counter
requests_total = Counter('requests_total', 'Total requests', ['method', 'endpoint'])

@app.route('/api/users')
def get_users():
    requests_total.labels(method='GET', endpoint='/api/users').inc()
    return jsonify(users)

# Query: rate(requests_total[1m])
# Shows requests per second
```

**Latency** (p50, p95, p99):
```python
# Histogram
request_duration = Histogram('request_duration_seconds', 'Request duration')

@app.route('/api/data')
def get_data():
    start = time.time()
    result = fetch_data()
    duration = time.time() - start
    request_duration.observe(duration)
    return jsonify(result)

# Query: histogram_quantile(0.95, request_duration_seconds)
# Shows p95 latency
```

**Error Rate**:
```python
# Counter with labels
requests_total = Counter('requests_total', 'Total requests', ['status'])

@app.route('/api/data')
def get_data():
    try:
        result = fetch_data()
        requests_total.labels(status='success').inc()
        return jsonify(result), 200
    except Exception as e:
        requests_total.labels(status='error').inc()
        return jsonify({'error': str(e)}), 500

# Query: rate(requests_total{status="error"}[1m]) / rate(requests_total[1m])
# Shows error rate as percentage
```

---

### **2. Infrastructure Metrics**

**CPU Usage**:
```python
import psutil
from prometheus_client import Gauge

cpu_usage = Gauge('cpu_usage_percent', 'CPU usage percentage')

def update_cpu_usage():
    cpu_usage.set(psutil.cpu_percent())

# Update every 10 seconds
```

**Memory Usage**:
```python
memory_usage = Gauge('memory_usage_bytes', 'Memory usage in bytes')

def update_memory_usage():
    memory = psutil.virtual_memory()
    memory_usage.set(memory.used)
```

**Disk I/O**:
```python
disk_read_bytes = Counter('disk_read_bytes_total', 'Total disk bytes read')
disk_write_bytes = Counter('disk_write_bytes_total', 'Total disk bytes written')
```

**Network I/O**:
```python
network_sent_bytes = Counter('network_sent_bytes_total', 'Total bytes sent')
network_received_bytes = Counter('network_received_bytes_total', 'Total bytes received')
```

---

### **3. Database Metrics**

**Query Duration**:
```python
db_query_duration = Histogram('db_query_duration_seconds', 'Database query duration', ['query_type'])

def execute_query(query):
    start = time.time()
    result = db.execute(query)
    duration = time.time() - start
    db_query_duration.labels(query_type='select').observe(duration)
    return result
```

**Connection Pool**:
```python
db_connections_active = Gauge('db_connections_active', 'Active database connections')
db_connections_idle = Gauge('db_connections_idle', 'Idle database connections')

def update_db_metrics():
    pool_status = db.get_pool_status()
    db_connections_active.set(pool_status['active'])
    db_connections_idle.set(pool_status['idle'])
```

**Query Rate**:
```python
db_queries_total = Counter('db_queries_total', 'Total database queries', ['operation'])

def execute_query(query, operation='select'):
    db_queries_total.labels(operation=operation).inc()
    return db.execute(query)
```

---

### **4. External Dependencies**

**Third-Party API Latency**:
```python
external_api_duration = Histogram('external_api_duration_seconds', 'External API duration', ['service'])

def call_stripe_api():
    start = time.time()
    response = requests.post('https://api.stripe.com/v1/charges', ...)
    duration = time.time() - start
    external_api_duration.labels(service='stripe').observe(duration)
    return response
```

**Cache Hit Rate**:
```python
cache_hits = Counter('cache_hits_total', 'Cache hits')
cache_misses = Counter('cache_misses_total', 'Cache misses')

def get_from_cache(key):
    value = redis.get(key)
    if value:
        cache_hits.inc()
        return value
    else:
        cache_misses.inc()
        value = fetch_from_database(key)
        redis.set(key, value)
        return value

# Cache hit rate = cache_hits / (cache_hits + cache_misses)
```

---

### **5. Business Metrics**

**User Signups**:
```python
signups_total = Counter('signups_total', 'Total user signups')

@app.route('/signup', methods=['POST'])
def signup():
    user = create_user(request.json)
    signups_total.inc()
    return jsonify(user.to_dict())
```

**Revenue**:
```python
revenue_total = Counter('revenue_total_cents', 'Total revenue in cents')

def process_payment(amount):
    # Amount in cents
    revenue_total.inc(amount)
    # Process payment...
```

**Active Users**:
```python
active_users = Gauge('active_users', 'Number of active users')

# Update periodically
def update_active_users():
    count = db.execute('SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL 5 MINUTE')
    active_users.set(count)
```

---

## 🎯 Metrics Collection (Prometheus)

### **Instrumentation** (Application exposes metrics)

```python
from flask import Flask
from prometheus_client import Counter, Histogram, Gauge, make_wsgi_app
from werkzeug.middleware.dispatcher import DispatcherMiddleware

app = Flask(__name__)

# Metrics
requests_total = Counter('requests_total', 'Total requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('request_duration_seconds', 'Request duration')
active_requests = Gauge('active_requests', 'Active requests')

@app.before_request
def before_request():
    active_requests.inc()
    g.start_time = time.time()

@app.after_request
def after_request(response):
    active_requests.dec()
    duration = time.time() - g.start_time
    
    requests_total.labels(
        method=request.method,
        endpoint=request.endpoint or 'unknown',
        status=response.status_code
    ).inc()
    
    request_duration.observe(duration)
    
    return response

# Expose /metrics endpoint
app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
    '/metrics': make_wsgi_app()
})

if __name__ == '__main__':
    app.run()

# Access metrics: http://localhost:5000/metrics
```

**Metrics output** (Prometheus format):

```
# HELP requests_total Total requests
# TYPE requests_total counter
requests_total{method="GET",endpoint="/api/users",status="200"} 1234

# HELP request_duration_seconds Request duration
# TYPE request_duration_seconds histogram
request_duration_seconds_bucket{le="0.01"} 100
request_duration_seconds_bucket{le="0.05"} 500
request_duration_seconds_bucket{le="0.1"} 800
request_duration_seconds_bucket{le="0.5"} 950
request_duration_seconds_bucket{le="1.0"} 990
request_duration_seconds_bucket{le="+Inf"} 1000
request_duration_seconds_sum 234.56
request_duration_seconds_count 1000

# HELP active_requests Active requests
# TYPE active_requests gauge
active_requests 42
```

---

### **Prometheus Scrapes Metrics**

**prometheus.yml**:

```yaml
global:
  scrape_interval: 15s  # Scrape every 15 seconds

scrape_configs:
  - job_name: 'flask-app'
    static_configs:
      - targets: ['localhost:5000']
```

**Prometheus queries** (PromQL):

```promql
# Request rate (requests per second)
rate(requests_total[1m])

# Error rate
rate(requests_total{status=~"5.."}[1m]) / rate(requests_total[1m])

# p95 latency
histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))

# Average request duration
rate(request_duration_seconds_sum[1m]) / rate(request_duration_seconds_count[1m])
```

---

## 🎯 Visualization (Grafana)

**Grafana dashboards** query Prometheus and visualize metrics

**Example dashboard panels**:

1. **Request Rate**:
   - Query: `rate(requests_total[1m])`
   - Visualization: Graph (line chart)

2. **Error Rate**:
   - Query: `rate(requests_total{status=~"5.."}[1m]) / rate(requests_total[1m]) * 100`
   - Visualization: Gauge (percentage)

3. **Latency (p50, p95, p99)**:
   - Query: `histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))`
   - Visualization: Graph (multiple lines for p50, p95, p99)

4. **Active Requests**:
   - Query: `active_requests`
   - Visualization: Single Stat

5. **CPU Usage**:
   - Query: `cpu_usage_percent`
   - Visualization: Graph

---

## 🎯 Push-Based Metrics (StatsD)

**Problem**: Prometheus pull-based (requires exposing /metrics endpoint)

**Solution**: StatsD push-based (send metrics to StatsD server)

```python
import statsd

# Connect to StatsD
client = statsd.StatsClient('localhost', 8125)

@app.route('/api/data')
def get_data():
    # Increment counter
    client.incr('requests.total')
    
    # Record timing
    start = time.time()
    result = fetch_data()
    duration = (time.time() - start) * 1000  # ms
    client.timing('request.duration', duration)
    
    # Set gauge
    client.gauge('active_users', 1234)
    
    return jsonify(result)
```

**StatsD → Graphite → Grafana pipeline**:
```
Application → StatsD → Graphite → Grafana
```

---

## 🎯 Real-World Examples

### **1. Netflix**

**Metrics tracked**:
- Stream starts per second
- Buffering events
- Video quality (bitrate)
- API latency (p99)
- Error rate per service

**Tools**: Atlas (custom metrics platform), Grafana

**Example alert**:
- If `stream_start_errors > 1%` for 5 minutes → Page on-call engineer

---

### **2. Uber**

**Metrics tracked**:
- Rides per second
- Driver availability
- ETA accuracy
- Payment success rate
- Surge pricing multiplier

**Tools**: M3 (custom metrics platform), Grafana

**Example dashboard**:
- Real-time map of active rides
- City-level metrics (rides, drivers, ETAs)

---

### **3. AWS CloudWatch**

**Metrics tracked**:
- EC2: CPU, memory, disk I/O, network I/O
- RDS: Connections, queries, replication lag
- Lambda: Invocations, duration, errors, throttles
- ALB: Request count, latency, 5xx errors

**Example alert**:
- If `RDS CPU > 80%` for 5 minutes → Auto-scale RDS instance

---

## ✅ Best Practices

1. **Use appropriate metric types** (Counter for cumulative, Gauge for current value, Histogram for latency)
2. **Track the Four Golden Signals** (Latency, Traffic, Errors, Saturation)
3. **Use labels wisely** (Don't create too many label combinations - "cardinality explosion")
4. **Calculate rates** (rate(counter[1m]) for per-second rate)
5. **Monitor p95/p99** (not just average latency)
6. **Set up alerts** (proactive, not reactive)
7. **Business metrics** (track revenue, signups, not just infrastructure)
8. **Retention policy** (keep high-resolution for 15 days, downsampled for 90 days)

---

## 🎓 Interview Tips

**Q: "What are the Four Golden Signals for monitoring?"**

A: "Google SRE's Four Golden Signals:

1. **Latency**: Time to serve request (p50, p95, p99)
   - Track separately for success vs errors
   - Example: p99 latency = 500ms

2. **Traffic**: Request volume (requests/second, bytes/second)
   - Example: 10,000 requests/second

3. **Errors**: Rate of failed requests (4xx, 5xx errors)
   - Example: Error rate = 0.5%

4. **Saturation**: How "full" the service is (CPU, memory, disk, queue depth)
   - Example: CPU = 80%, Memory = 70%

**Why important**: Cover all aspects of system health. If all four are healthy, system is healthy.

**Real-world**: Netflix monitors these for every microservice, alerts if any signal breaches threshold"

**Q: "How do you measure latency?"**

A: "Use **Histogram** (track distribution):

```python
request_duration = Histogram('request_duration_seconds', 'Request duration')

@app.route('/api/data')
def get_data():
    start = time.time()
    result = fetch_data()
    duration = time.time() - start
    request_duration.observe(duration)
    return jsonify(result)
```

**Key percentiles**:
- **p50** (median): 50% of requests faster than this
- **p95**: 95% of requests faster than this
- **p99**: 99% of requests faster than this

**Why p99?**: Average hides outliers. p99 shows tail latency (worst 1% of requests).

**Example**: Average = 50ms, p99 = 2000ms → 1% of users see 2s latency (bad UX)

**Real-world**: Amazon uses p99.9 for critical services (worst 0.1% of requests)"

**Q: "What's the difference between Counter and Gauge?"**

A: "**Counter**: Always increasing (cumulative)
- Examples: Total requests, total errors, total bytes sent
- Resets on restart
- Query rate: `rate(requests_total[1m])` (requests per second)

**Gauge**: Can increase or decrease (current value)
- Examples: CPU usage, memory usage, active connections, queue size
- Current snapshot
- Query directly: `cpu_usage_percent`

**When to use**:
- Counting events → Counter
- Measuring current state → Gauge

**Example**:
```python
requests_total = Counter('requests_total')  # Total requests served
active_requests = Gauge('active_requests')   # Currently active requests

@app.before_request:
    active_requests.inc()  # +1
    
@app.after_request:
    active_requests.dec()  # -1
    requests_total.inc()   # +1 (never decreases)
```"

---

## 📚 Summary

**Metrics**: Numerical measurements (CPU, latency, error rate)

**Types**: Counter (cumulative), Gauge (current value), Histogram (distribution), Summary (percentiles)

**Four Golden Signals**: Latency (p95/p99), Traffic (QPS), Errors (rate), Saturation (CPU/memory)

**Tools**: Prometheus (pull-based), StatsD (push-based), Grafana (visualization)

**Best Practices**: Track p95/p99 (not just average), use labels wisely, monitor business metrics 🚀

