# 130. Monitoring

## 📌 Overview

**Monitoring** is observing system health and performance over time.

**Difference from logging/metrics**:
- **Logging**: Individual events ("User logged in")
- **Metrics**: Numerical data (CPU = 75%)
- **Monitoring**: Continuous observation + alerting + visualization

**Why needed**:
- Detect issues before users notice
- Understand system behavior
- Capacity planning
- Debugging production problems

---

## 🎯 What to Monitor

### **1. Infrastructure Monitoring**

**Compute Resources**:
```python
# CPU usage
cpu_usage_percent = 75.3

# Memory usage
memory_used_bytes = 8_589_934_592  # 8GB
memory_total_bytes = 16_000_000_000  # 16GB
memory_usage_percent = (memory_used / memory_total) * 100

# Disk usage
disk_used_percent = 85.0

# Network I/O
network_sent_bytes_per_sec = 1_048_576  # 1MB/s
network_received_bytes_per_sec = 2_097_152  # 2MB/s
```

**Load Average**:
```bash
# Linux
uptime
# 15:23:42 up 42 days,  3:12,  2 users,  load average: 2.15, 1.98, 1.87
#                                                        1min  5min  15min

# Load > CPU cores = system overloaded
# Example: 4 cores, load 8.0 = 2x overloaded
```

**Disk I/O**:
```python
# IOPS (I/O operations per second)
disk_read_iops = 1000
disk_write_iops = 500

# Throughput
disk_read_mb_per_sec = 50.0
disk_write_mb_per_sec = 25.0
```

---

### **2. Application Monitoring**

**Request Rate**:
```python
requests_per_second = 1000

# By endpoint
GET_users_per_second = 500
POST_orders_per_second = 200
GET_search_per_second = 300
```

**Response Time** (Latency):
```python
# Percentiles
latency_p50 = 50  # ms (median)
latency_p95 = 200  # ms (95th percentile)
latency_p99 = 500  # ms (99th percentile)
latency_p999 = 1000  # ms (99.9th percentile)

# By endpoint
GET_users_p95 = 50  # ms (fast, database index)
POST_search_p95 = 500  # ms (slow, full-text search)
```

**Error Rate**:
```python
# Overall error rate
error_rate_percent = (errors / total_requests) * 100

# By status code
rate_4xx = 0.5%  # Client errors
rate_5xx = 0.1%  # Server errors

# By endpoint
GET_users_error_rate = 0.01%  # Very low
POST_payment_error_rate = 2.0%  # Higher (external API failures)
```

**Throughput**:
```python
# Data processed
bytes_sent_per_second = 10_485_760  # 10MB/s
bytes_received_per_second = 5_242_880  # 5MB/s

# Business metrics
orders_per_minute = 500
signups_per_hour = 1000
```

---

### **3. Database Monitoring**

**Query Performance**:
```python
# Query latency
query_latency_p95 = 10  # ms
slow_query_latency_p95 = 1000  # ms (needs optimization)

# Query rate
queries_per_second = 5000

# Slow queries
slow_queries_per_minute = 5  # Queries taking >1s
```

**Connections**:
```python
# Connection pool
max_connections = 100
active_connections = 85  # 85% utilization (warning)
idle_connections = 10
waiting_connections = 5  # Queue depth (bad)

# Alert if active_connections / max_connections > 0.8
```

**Replication Lag** (Master-Slave):
```python
# Lag in seconds
replication_lag_seconds = 2.5

# Alert if lag > 5 seconds (data inconsistency)
```

**Cache Hit Rate**:
```python
cache_hits = 9500
cache_misses = 500
cache_hit_rate = cache_hits / (cache_hits + cache_misses)  # 95%

# Alert if hit_rate < 90% (cache ineffective)
```

---

### **4. External Dependencies**

**Third-Party APIs**:
```python
# Stripe API
stripe_api_latency_p95 = 150  # ms
stripe_api_error_rate = 0.2%

# SendGrid (email)
sendgrid_api_latency_p95 = 300  # ms
sendgrid_api_error_rate = 1.0%

# Alert if error_rate > 5% or latency_p95 > 1000ms
```

**Message Queues**:
```python
# Kafka
kafka_lag = 1000  # Messages behind
kafka_consumer_rate = 500  # Messages/sec
kafka_producer_rate = 600  # Messages/sec

# Alert if lag > 10000 (consumers falling behind)
```

---

### **5. Business Metrics**

**User Activity**:
```python
active_users_per_minute = 5000
signups_per_hour = 200
daily_active_users = 100_000
monthly_active_users = 500_000
```

**Revenue**:
```python
revenue_per_hour = 10_000  # $10k/hour
revenue_per_day = 240_000  # $240k/day
average_order_value = 50  # $50
```

**Conversion Rate**:
```python
visitors = 100_000
signups = 5_000
signup_conversion_rate = (signups / visitors) * 100  # 5%

visitors_to_checkout = 10_000
completed_purchases = 3_000
purchase_conversion_rate = 30%
```

---

## 🎯 Monitoring Tools

### **1. Prometheus + Grafana** ⭐

**Prometheus**: Metrics collection + storage + alerting

**Grafana**: Visualization dashboards

**Architecture**:
```
Application exposes /metrics
         ↓
Prometheus scrapes metrics (pull-based)
         ↓
Stores time-series data
         ↓
Grafana queries Prometheus
         ↓
Displays dashboards + graphs
```

**Example dashboard**:

```yaml
# Grafana dashboard (JSON)
{
  "panels": [
    {
      "title": "Request Rate",
      "targets": [{
        "expr": "rate(requests_total[1m])"
      }],
      "type": "graph"
    },
    {
      "title": "Error Rate",
      "targets": [{
        "expr": "rate(requests_total{status=~'5..'}[1m]) / rate(requests_total[1m]) * 100"
      }],
      "type": "graph"
    },
    {
      "title": "p95 Latency",
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))"
      }],
      "type": "graph"
    },
    {
      "title": "CPU Usage",
      "targets": [{
        "expr": "cpu_usage_percent"
      }],
      "type": "graph"
    }
  ]
}
```

---

### **2. Datadog**

**Features**:
- Infrastructure monitoring (CPU, memory, disk, network)
- APM (Application Performance Monitoring)
- Log aggregation
- Distributed tracing
- Custom metrics
- Alerts

**Agent-based**: Datadog agent runs on each server

```python
from datadog import initialize, statsd

initialize(api_key='YOUR_API_KEY', app_key='YOUR_APP_KEY')

# Send metric
statsd.increment('page.views')
statsd.histogram('request.duration', 0.123)
statsd.gauge('active_users', 1234)

# With tags
statsd.increment('request.count', tags=['endpoint:/api/users', 'method:GET'])
```

---

### **3. New Relic**

**Features**:
- APM (automatic instrumentation)
- Infrastructure monitoring
- Browser monitoring (RUM - Real User Monitoring)
- Synthetic monitoring (uptime checks)

**Automatic instrumentation** (Python):

```python
import newrelic.agent
newrelic.agent.initialize('newrelic.ini')

# Automatically tracks:
# - Request rate, latency, errors
# - Database queries
# - External API calls
# - Transaction traces
```

---

### **4. AWS CloudWatch**

**Features**:
- Metrics (EC2, RDS, Lambda, ALB, etc.)
- Logs (centralized logging)
- Alarms (trigger on thresholds)
- Dashboards

**Example metrics**:

```python
import boto3

cloudwatch = boto3.client('cloudwatch')

# Put custom metric
cloudwatch.put_metric_data(
    Namespace='MyApp',
    MetricData=[{
        'MetricName': 'OrdersProcessed',
        'Value': 123,
        'Unit': 'Count',
        'Timestamp': datetime.utcnow()
    }]
)

# Create alarm
cloudwatch.put_metric_alarm(
    AlarmName='HighCPU',
    ComparisonOperator='GreaterThanThreshold',
    EvaluationPeriods=2,
    MetricName='CPUUtilization',
    Namespace='AWS/EC2',
    Period=300,
    Statistic='Average',
    Threshold=80.0,
    ActionsEnabled=True,
    AlarmActions=['arn:aws:sns:us-east-1:123456789012:my-topic']
)
```

---

### **5. ELK Stack** (Logging + Monitoring)

**Elasticsearch**: Store logs + metrics

**Logstash**: Process logs

**Kibana**: Visualize logs + metrics

**Example**: Monitor error logs

```json
# Kibana query
{
  "query": {
    "bool": {
      "must": [
        {"match": {"level": "error"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  }
}

# Visualize: Error count over time
```

---

## 🎯 Health Checks

### **Purpose**: Verify service is alive and healthy

**Liveness** (is service running?):
```python
@app.route('/health/live')
def liveness():
    return {'status': 'alive'}, 200

# Kubernetes liveness probe
# If fails → Restart pod
```

**Readiness** (is service ready to serve traffic?):
```python
@app.route('/health/ready')
def readiness():
    # Check dependencies
    if not db.is_connected():
        return {'status': 'not ready', 'reason': 'database down'}, 503
    
    if not redis.ping():
        return {'status': 'not ready', 'reason': 'redis down'}, 503
    
    return {'status': 'ready'}, 200

# Kubernetes readiness probe
# If fails → Remove from load balancer
```

**Deep health check** (check all dependencies):
```python
@app.route('/health')
def health_check():
    checks = {
        'database': check_database(),
        'redis': check_redis(),
        'kafka': check_kafka(),
        'external_api': check_external_api()
    }
    
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503
    
    return {
        'status': 'healthy' if all_healthy else 'unhealthy',
        'checks': checks
    }, status_code

def check_database():
    try:
        db.execute('SELECT 1')
        return True
    except:
        return False

def check_redis():
    try:
        return redis.ping()
    except:
        return False
```

---

## 🎯 Uptime Monitoring (Synthetic Monitoring)

**Purpose**: External monitoring (simulates user)

**Tools**: Pingdom, UptimeRobot, StatusCake, DataDog Synthetics

**Example**:

```python
# Check endpoint every 1 minute
GET https://api.example.com/health

# If response != 200 or timeout > 5s:
#   - Send alert (email, Slack, PagerDuty)
#   - Mark as down on status page
```

**Multi-region checks**:
```
Check from:
- US East
- US West
- Europe
- Asia

# Detect regional outages
```

---

## 🎯 Status Pages

**Purpose**: Public-facing system status

**Examples**:
- https://status.github.com
- https://status.stripe.com
- https://status.slack.com

**Components**:
```yaml
Components:
  - API: Operational
  - Website: Operational
  - Database: Degraded Performance
  - Payment Processing: Major Outage

Incidents:
  - "Payment processing issues" (Investigating...)
  - Updated: 2024-01-15 10:30 UTC
```

**Tools**: Statuspage.io, Atlassian Statuspage

---

## 🎯 Real-World Examples

### **1. Netflix**

**Monitoring approach**:
- **Atlas**: Custom metrics platform (1000+ microservices)
- **Kayenta**: Automated canary analysis (compares new vs old deployment)
- **Alerts**: Thousands of alerts, prioritized by severity

**Example dashboard**:
- Stream starts per second (by region)
- Buffering events per million plays
- API error rate (by service)
- p99 latency (by endpoint)

**Incident detection**: Automated (alerts trigger within seconds)

---

### **2. Uber**

**Monitoring approach**:
- **M3**: Custom metrics platform (millions of metrics)
- **Jaeger**: Distributed tracing
- **Real-time dashboards**: City-level metrics (rides, drivers, ETAs)

**Example metrics**:
- Rides per second (global)
- Driver availability (per city)
- ETA accuracy (actual vs predicted)
- Payment success rate

**Alerts**: Tiered (critical → pages on-call, warning → Slack notification)

---

### **3. AWS**

**CloudWatch dashboards**:
- **EC2**: CPU, disk I/O, network, status checks
- **RDS**: Connections, CPU, storage, replication lag
- **Lambda**: Invocations, duration, errors, throttles
- **ALB**: Request count, target response time, 5xx errors

**Alarms**: Auto-scaling (if CPU > 80% → add instances)

---

## 🎯 Monitoring Best Practices

### **1. The Four Golden Signals** (Google SRE)

**Latency**: Time to serve request
```promql
histogram_quantile(0.95, rate(request_duration_seconds_bucket[5m]))
```

**Traffic**: Request volume
```promql
rate(requests_total[1m])
```

**Errors**: Rate of failed requests
```promql
rate(requests_total{status=~"5.."}[1m]) / rate(requests_total[1m])
```

**Saturation**: How "full" the service is
```promql
cpu_usage_percent
memory_usage_percent
disk_usage_percent
```

---

### **2. USE Method** (Utilization, Saturation, Errors)

**For every resource**:
- **Utilization**: % time resource is busy (CPU usage)
- **Saturation**: Queue depth (load average, connection pool waiting)
- **Errors**: Error count (disk errors, network errors)

**Example (CPU)**:
- Utilization: 75% (CPU usage)
- Saturation: Load average 8.0 (on 4-core system = 2x saturated)
- Errors: 0 (no CPU errors)

---

### **3. RED Method** (Rate, Errors, Duration)

**For every service**:
- **Rate**: Requests per second
- **Errors**: Error rate (%)
- **Duration**: Latency (p50, p95, p99)

**Example (API service)**:
- Rate: 1000 requests/sec
- Errors: 0.5%
- Duration: p95 = 200ms

---

### **4. Monitor What Matters**

**✓ Do monitor**:
- User-facing metrics (latency, errors)
- Business metrics (revenue, signups)
- Resource saturation (CPU, memory, disk)

**❌ Don't monitor**:
- Vanity metrics (uptime 99.999% but users experiencing errors)
- Too many metrics (alert fatigue)

---

## ✅ Best Practices Summary

1. **Four Golden Signals**: Latency, Traffic, Errors, Saturation
2. **Monitor end-to-end**: User experience, not just infrastructure
3. **Percentiles over averages**: p95/p99 reveals tail latency
4. **Health checks**: Liveness (is alive?) + Readiness (can serve traffic?)
5. **External monitoring**: Synthetic checks (simulate user)
6. **Tiered alerts**: Critical → Page, Warning → Slack
7. **Dashboard**: One screen, key metrics at a glance
8. **Status page**: Public-facing (transparency)
9. **On-call rotation**: Distribute alert burden
10. **Runbooks**: Document how to fix common issues

---

## 🎓 Interview Tips

**Q: "How do you monitor a distributed system?"**

A: "**Multi-layered monitoring**:

1. **Infrastructure** (Prometheus):
   - CPU, memory, disk, network per instance
   - Alert if CPU > 80% or disk > 90%

2. **Application** (APM):
   - Request rate, latency (p95/p99), error rate
   - Track per endpoint (identify slow endpoints)

3. **Database**:
   - Query latency, connection pool, replication lag
   - Slow query log (queries >100ms)

4. **External dependencies**:
   - Third-party API latency, error rate
   - Circuit breaker state (open → API down)

5. **Business metrics**:
   - Orders per minute, revenue per hour
   - Conversion rate (visitors → signups → purchases)

6. **Distributed tracing** (Jaeger):
   - Trace request across services
   - Identify bottleneck service

**Tools**: Prometheus/Grafana (metrics), ELK (logs), Jaeger (tracing), PagerDuty (alerts)

Real-world: Netflix monitors 1000+ microservices with Atlas + Grafana"

**Q: "What are the Four Golden Signals?"**

A: "Google SRE's Four Golden Signals:

1. **Latency**: Time to serve request
   - Track p50, p95, p99 (not average)
   - Example: p95 = 200ms (95% of requests < 200ms)

2. **Traffic**: Request volume
   - Requests/second, bytes/second
   - Example: 10,000 requests/sec

3. **Errors**: Failed requests
   - Error rate (%)
   - Example: 0.5% (5 errors per 1000 requests)

4. **Saturation**: How full the system is
   - CPU, memory, disk, queue depth
   - Example: CPU = 80% (high saturation)

**Why**: If all four are healthy, system is healthy. Cover all aspects of system behavior.

**Alerts**:
- Latency p99 > 1s for 5 min → Warning
- Error rate > 1% for 5 min → Critical
- CPU > 90% for 10 min → Warning
- Traffic drops 50% → Critical (potential outage)"

**Q: "How do you detect issues before users notice?"**

A: "**Proactive monitoring**:

1. **Synthetic monitoring** (external checks):
   - Pingdom checks /health every 1 min
   - If down → Alert immediately (before users affected)

2. **Anomaly detection**:
   - Machine learning detects unusual patterns
   - Example: Traffic drops 30% (normally flat) → Investigate

3. **Canary deployments**:
   - Deploy to 5% of servers first
   - Monitor error rate, latency
   - If metrics spike → Rollback automatically

4. **Alerts on leading indicators**:
   - Database connection pool 90% full → Add connections (before exhaustion)
   - Disk 85% full → Alert (before 100%)
   - Replication lag 5s → Warning (before 30s)

5. **Distributed tracing**:
   - Trace slow requests
   - Identify bottleneck service before users complain

Real-world: Netflix uses automated canary analysis (compares new vs old deployment metrics), rolls back if error rate spikes"

---

## 📚 Summary

**Monitoring**: Continuous observation of system health

**Four Golden Signals**: Latency (p95/p99), Traffic (QPS), Errors (rate), Saturation (CPU/memory)

**Tools**: Prometheus + Grafana (metrics), Datadog/New Relic (APM), CloudWatch (AWS)

**Health Checks**: Liveness (is alive?), Readiness (can serve traffic?)

**Synthetic Monitoring**: External uptime checks (Pingdom, UptimeRobot)

**Best Practices**: Monitor end-to-end, percentiles over averages, tiered alerts, status page 🚀

