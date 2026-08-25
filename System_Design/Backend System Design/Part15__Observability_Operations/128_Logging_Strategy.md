# 128. Logging Strategy

## 📌 Overview

**Logging** records events, errors, and information for debugging, monitoring, and auditing.

**Why needed**:
- Debugging (understand what went wrong)
- Monitoring (track system health)
- Auditing (compliance, security)
- Analytics (user behavior, performance)

**Three Pillars of Observability**:
1. **Logs** (discrete events: "User logged in")
2. **Metrics** (aggregated numbers: "CPU = 80%")
3. **Traces** (request flow across services)

---

## 🎯 Log Levels

### **Standard Levels** (Severity)

```python
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Log levels (lowest to highest severity)
logger.debug('Detailed information for debugging')      # DEBUG
logger.info('General informational messages')           # INFO
logger.warning('Warning: something unexpected')         # WARNING
logger.error('Error: operation failed')                 # ERROR
logger.critical('Critical: system unusable')            # CRITICAL
```

**When to use**:

| Level | Use Case | Example | Production? |
|-------|----------|---------|-------------|
| **DEBUG** | Detailed diagnostics | `"SQL query: SELECT * FROM users WHERE id=123"` | ❌ Off (performance) |
| **INFO** | Normal operations | `"User 123 logged in"` | ✓ On |
| **WARNING** | Potential issues | `"API response slow (500ms)"` | ✓ On |
| **ERROR** | Operation failed | `"Failed to connect to database"` | ✓ On |
| **CRITICAL** | System down | `"Out of memory, service crashing"` | ✓ On |

---

## 🎯 Structured Logging ⭐

**Problem**: Unstructured logs hard to parse

```python
# ❌ Unstructured (hard to query)
logger.info('User john logged in from 192.168.1.1')

# Hard to answer: "Show all logins from this IP"
```

**Solution**: Structured (JSON format)

```python
# ✓ Structured (easy to query)
logger.info('User login', extra={
    'event': 'user_login',
    'user_id': 123,
    'username': 'john',
    'ip_address': '192.168.1.1',
    'timestamp': '2024-01-15T10:00:00Z'
})

# Output (JSON):
{
  "level": "info",
  "event": "user_login",
  "user_id": 123,
  "username": "john",
  "ip_address": "192.168.1.1",
  "timestamp": "2024-01-15T10:00:00Z",
  "message": "User login"
}

# Easy to query: "Show all user_id=123 events"
```

**Python implementation** (structlog):

```python
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Log with context
logger.info('user_login', user_id=123, username='john', ip='192.168.1.1')

# Output:
# {"event": "user_login", "user_id": 123, "username": "john", "ip": "192.168.1.1", "timestamp": "2024-01-15T10:00:00Z", "level": "info"}
```

**Benefits**:
- **Searchable**: Query by fields (`user_id=123`)
- **Aggregatable**: Count events, group by user
- **Machine-readable**: Parse with tools (ELK, Splunk)

---

## 🎯 What to Log

### **✓ Do Log**:

**1. Application Events**:
```python
logger.info('user_registered', user_id=123, email='user@example.com')
logger.info('order_placed', order_id=456, total=99.99)
logger.info('payment_succeeded', payment_id=789)
```

**2. Errors & Exceptions**:
```python
try:
    result = call_external_api()
except Exception as e:
    logger.error('external_api_failed', error=str(e), traceback=traceback.format_exc())
```

**3. Performance Metrics**:
```python
start_time = time.time()
result = expensive_operation()
duration = time.time() - start_time
logger.info('operation_completed', operation='expensive_operation', duration_ms=duration*1000)
```

**4. Security Events**:
```python
logger.warning('failed_login_attempt', username='admin', ip='203.0.113.1', attempt_count=5)
logger.info('permission_denied', user_id=123, resource='admin_panel')
```

**5. External Dependencies**:
```python
logger.info('database_query', query='SELECT * FROM users', duration_ms=45)
logger.warning('cache_miss', key='user:123', fallback='database')
logger.error('third_party_api_error', service='stripe', status_code=500)
```

### **❌ Don't Log**:

**1. Sensitive Data**:
```python
# ❌ Don't log passwords, credit cards, SSN
logger.info('user_login', password='secret123')  # ❌
logger.info('payment', credit_card='4111111111111111')  # ❌

# ✓ Log hashed/masked values
logger.info('user_login', user_id=123)  # ✓
logger.info('payment', last4='1111')  # ✓
```

**2. PII (Personally Identifiable Information)**:
```python
# ❌ Don't log full email, phone, address (GDPR)
logger.info('user_registered', email='user@example.com')  # ❌

# ✓ Log user_id instead
logger.info('user_registered', user_id=123)  # ✓
```

**3. Excessive Logs**:
```python
# ❌ Don't log every loop iteration (performance)
for i in range(1000000):
    logger.debug(f'Processing item {i}')  # ❌ 1M logs!

# ✓ Log batches or milestones
if i % 10000 == 0:
    logger.info('processing_progress', processed=i, total=1000000)  # ✓
```

---

## 🎯 Log Context (Request ID)

**Problem**: Tracking request across logs

```python
# Multiple logs for same request, hard to correlate
logger.info('User login')
logger.info('Fetch user profile')
logger.info('Update last login time')
```

**Solution**: Request ID (trace every log entry)

```python
import uuid
from flask import g, request

@app.before_request
def set_request_id():
    # Generate unique request ID
    g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))

# Add request_id to all logs
logger = structlog.get_logger()
logger = logger.bind(request_id=g.request_id)

# Logs
logger.info('user_login', user_id=123)
# {"event": "user_login", "user_id": 123, "request_id": "abc-123"}

logger.info('fetch_profile', user_id=123)
# {"event": "fetch_profile", "user_id": 123, "request_id": "abc-123"}

# Search logs: request_id="abc-123" → Shows all logs for this request
```

**Middleware** (Flask):

```python
from flask import Flask, g, request
import uuid
import structlog

app = Flask(__name__)

@app.before_request
def before_request():
    g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
    g.logger = structlog.get_logger().bind(
        request_id=g.request_id,
        method=request.method,
        path=request.path,
        ip=request.remote_addr
    )

@app.after_request
def after_request(response):
    response.headers['X-Request-ID'] = g.request_id
    g.logger.info('request_completed', status_code=response.status_code)
    return response

@app.route('/api/users/<int:user_id>')
def get_user(user_id):
    g.logger.info('fetch_user', user_id=user_id)
    user = User.query.get(user_id)
    return jsonify(user.to_dict())
```

---

## 🎯 Centralized Logging

### **Problem**: Logs scattered across multiple servers

```
Server 1: /var/log/app.log
Server 2: /var/log/app.log
Server 3: /var/log/app.log

# How to search across all servers? ❌
```

### **Solution**: Centralized logging (ELK, Splunk, CloudWatch)

**Architecture**:

```
Application → Log Agent → Central Log Storage → Visualization

Example (ELK Stack):
Application → Filebeat → Logstash → Elasticsearch → Kibana
```

---

### **1. ELK Stack** (Elasticsearch, Logstash, Kibana)

**Filebeat** (ships logs):

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/app/*.log
    json.keys_under_root: true  # Parse JSON logs

output.logstash:
  hosts: ["logstash:5044"]
```

**Logstash** (processes logs):

```ruby
# logstash.conf
input {
  beats {
    port => 5044
  }
}

filter {
  json {
    source => "message"
  }
  date {
    match => ["timestamp", "ISO8601"]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "app-logs-%{+YYYY.MM.dd}"
  }
}
```

**Kibana** (visualizes logs):
- Search: `event:user_login AND user_id:123`
- Dashboard: Show login rate over time
- Alerts: Notify if error rate > 5%

---

### **2. AWS CloudWatch Logs**

```python
import watchtower
import logging

# Configure CloudWatch handler
logger = logging.getLogger(__name__)
logger.addHandler(watchtower.CloudWatchLogHandler(
    log_group='/aws/lambda/my-app',
    stream_name='production'
))

logger.info('User login', extra={'user_id': 123})

# Logs sent to CloudWatch
# Query: fields @timestamp, user_id | filter user_id = 123
```

---

### **3. Fluentd** (Unified logging layer)

```yaml
# fluent.conf
<source>
  @type tail
  path /var/log/app/*.log
  pos_file /var/log/td-agent/app.log.pos
  tag app.logs
  format json
</source>

<match app.logs>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name app-logs
  type_name log
</match>
```

---

## 🎯 Log Rotation

**Problem**: Logs fill disk space

```bash
# app.log grows indefinitely
-rw-r--r-- 1 root root 50G Jan 15 10:00 app.log  # 50GB! ❌
```

**Solution**: Log rotation (compress old logs, delete old files)

**Logrotate** (Linux):

```bash
# /etc/logrotate.d/app
/var/log/app/*.log {
    daily                # Rotate daily
    rotate 7             # Keep 7 days
    compress             # Gzip old logs
    delaycompress        # Don't compress latest rotation
    missingok            # OK if file missing
    notifempty           # Don't rotate if empty
    create 0640 root root
    postrotate
        # Reload app to reopen log file
        systemctl reload app
    endscript
}
```

**Result**:
```bash
app.log           # Current log
app.log.1.gz      # Yesterday (compressed)
app.log.2.gz      # 2 days ago
...
app.log.7.gz      # 7 days ago (deleted after rotation)
```

**Python RotatingFileHandler**:

```python
import logging
from logging.handlers import RotatingFileHandler

handler = RotatingFileHandler(
    'app.log',
    maxBytes=100*1024*1024,  # 100MB
    backupCount=5             # Keep 5 files
)

logger = logging.getLogger()
logger.addHandler(handler)
```

---

## 🎯 Log Sampling (High Traffic)

**Problem**: 10,000 requests/sec = 10,000 logs/sec (expensive)

**Solution**: Sample logs (log 1% of requests)

```python
import random

def should_log_request():
    return random.random() < 0.01  # 1% sample rate

@app.before_request
def log_request():
    if should_log_request():
        logger.info('request_received', path=request.path)

# Logs 100 requests/sec instead of 10,000 ✓
```

**Always log errors** (don't sample):

```python
try:
    result = operation()
    if should_log_request():
        logger.info('operation_success')  # Sample success logs
except Exception as e:
    logger.error('operation_failed', error=str(e))  # Always log errors ✓
```

---

## 🎯 Real-World Examples

### **1. Netflix**

**Approach**:
- Centralized logging (ELK + Splunk)
- Structured logs (JSON)
- Request tracing (trace ID across microservices)
- Log sampling (high traffic endpoints)

**Example log**:
```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "level": "info",
  "service": "recommendations",
  "event": "fetch_recommendations",
  "user_id": 123456,
  "trace_id": "abc-123-def-456",
  "duration_ms": 45,
  "recommendations_count": 20
}
```

### **2. Uber**

**Approach**:
- Log aggregation (custom pipeline)
- Real-time anomaly detection (log spikes)
- Dashboards (Kibana) for each service

**Example**:
```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "level": "error",
  "service": "payment",
  "event": "payment_failed",
  "trip_id": "trip-123",
  "rider_id": 456,
  "error": "Insufficient funds",
  "payment_method": "credit_card_****1234"
}
```

### **3. AWS Lambda**

**Approach**:
- CloudWatch Logs (automatic)
- Log Insights (query logs)
- Structured logging (JSON)

```python
import json

def lambda_handler(event, context):
    print(json.dumps({
        'event': 'lambda_invoked',
        'request_id': context.request_id,
        'function_name': context.function_name,
        'input': event
    }))
    
    # Process
    result = process(event)
    
    print(json.dumps({
        'event': 'lambda_completed',
        'request_id': context.request_id,
        'duration_ms': context.get_remaining_time_in_millis()
    }))
    
    return result

# Query in CloudWatch:
# fields @timestamp, request_id, duration_ms | filter duration_ms > 1000
```

---

## ✅ Best Practices

1. **Structured logging** (JSON format, key-value pairs)
2. **Request ID** (trace logs across services)
3. **Appropriate levels** (INFO for normal, ERROR for failures)
4. **Don't log sensitive data** (passwords, credit cards, PII)
5. **Centralized logging** (ELK, Splunk, CloudWatch)
6. **Log rotation** (prevent disk full)
7. **Sample high-traffic logs** (reduce volume)
8. **Always log errors** (don't sample)
9. **Include context** (user_id, operation, duration)
10. **Performance** (async logging, batch writes)

---

## 🎓 Interview Tips

**Q: "How do you design a logging strategy for a distributed system?"**

A: "**Key principles**:

1. **Structured logging** (JSON):
```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "level": "info",
  "service": "orders",
  "event": "order_placed",
  "order_id": 123,
  "user_id": 456,
  "trace_id": "abc-123"
}
```

2. **Request tracing** (trace_id):
- Generate unique ID per request
- Pass through all services (HTTP header)
- Include in all logs
- Query: `trace_id=abc-123` shows entire request flow

3. **Centralized storage** (ELK stack):
- Application → Filebeat → Logstash → Elasticsearch
- Query/visualize in Kibana
- Alerts on error rate

4. **Log levels**:
- INFO: Normal operations
- WARNING: Potential issues
- ERROR: Failures (always log, don't sample)

5. **Performance**:
- Async logging (non-blocking)
- Sample high-traffic logs (1% of success, 100% of errors)
- Log rotation (prevent disk full)

Real-world: Netflix uses ELK + Splunk with request tracing across 1000+ microservices"

**Q: "What shouldn't you log and why?"**

A: "**Never log**:

1. **Passwords/secrets**:
```python
logger.info('login', password='secret')  # ❌ Security breach
logger.info('login', user_id=123)  # ✓
```

2. **Credit card numbers** (PCI DSS violation):
```python
logger.info('payment', card='4111-1111-1111-1111')  # ❌ Compliance violation
logger.info('payment', last4='1111')  # ✓
```

3. **PII** (GDPR):
- Full email, phone, address
- Log user_id instead

4. **Excessive logs** (performance):
```python
for i in range(1000000):
    logger.debug(f'Item {i}')  # ❌ 1M logs
# Sample or log milestones ✓
```

**Why**: Security (leaks), compliance (GDPR, PCI DSS), performance (disk/network), cost (log storage expensive)

**Best practice**: Sanitize logs before writing, use user_id not email, mask sensitive data (****1234)"

**Q: "How do you handle high log volume?"**

A: "**Strategies**:

1. **Sampling** (1% of requests):
```python
if random.random() < 0.01:
    logger.info('request_success')  # Sample
# Always log errors (don't sample) ✓
```

2. **Appropriate log levels**:
- Production: INFO and above (not DEBUG)
- DEBUG only in development (too verbose)

3. **Async logging** (non-blocking):
```python
# Use queue, write logs in background thread
# App doesn't wait for log write ✓
```

4. **Log aggregation** (batch writes):
```python
# Buffer 100 logs, write once (reduce I/O)
```

5. **Storage optimization**:
- Compress old logs (gzip)
- Delete old logs (retention policy: 30 days)
- Tiered storage (hot: SSD, cold: S3)

6. **Smart logging**:
- Log errors always
- Log successful operations at milestones (every 1000 requests)
- Log slow operations (>1s)

Real-world: Twitter samples 1% of tweet logs (1 billion tweets/day), always logs errors/slow operations"

---

## 📚 Summary

**Logging**: Record events for debugging, monitoring, auditing

**Structured Logging**: JSON format (key-value pairs, easy to query)

**Request ID**: Trace logs across services (correlate related logs)

**Log Levels**: DEBUG (dev), INFO (normal), WARNING (potential issue), ERROR (failure), CRITICAL (system down)

**Centralized**: ELK stack (Elasticsearch, Logstash, Kibana), CloudWatch, Splunk

**Best Practices**: Don't log secrets/PII, sample high-traffic logs, rotate logs, async logging 🚀

