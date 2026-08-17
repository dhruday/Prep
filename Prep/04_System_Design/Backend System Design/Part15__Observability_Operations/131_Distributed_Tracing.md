# 131. Distributed Tracing

## 📌 Overview

**Distributed tracing** tracks a request as it flows through multiple services.

**Problem**: Microservices make debugging hard

```
User request → API Gateway → Auth Service → Order Service → Payment Service → Database

# Where is the bottleneck? ❌
# Which service failed? ❌
```

**Solution**: Trace request across all services

```
Trace ID: abc-123

API Gateway:     50ms  ✓
  → Auth Service:  20ms  ✓
  → Order Service: 500ms ⚠️ (BOTTLENECK!)
    → Payment:     400ms ⚠️ (Stripe API slow)
    → Database:    100ms  ✓
```

---

## 🎯 Core Concepts

### **1. Trace**

**Definition**: End-to-end journey of a request

**Example**:
```
Trace ID: abc-123-def-456
Total duration: 500ms
Services: API Gateway → Auth → Orders → Payment
Status: Success
```

### **2. Span**

**Definition**: Single operation within a trace

**Example**:
```
Span ID: span-1
Trace ID: abc-123
Operation: GET /api/orders/123
Duration: 500ms
Service: orders-service
Status: 200
```

**Span tree** (parent-child relationship):

```
Trace: abc-123 (500ms)
├── Span 1: API Gateway (50ms)
│   └── Span 2: Auth Service (20ms)
│       └── Span 3: Order Service (500ms)
│           ├── Span 4: Payment Service (400ms)
│           │   └── Span 5: Stripe API (380ms)  ← BOTTLENECK
│           └── Span 6: Database Query (100ms)
```

### **3. Tags & Logs**

**Tags**: Key-value metadata

```python
span.set_tag('http.method', 'GET')
span.set_tag('http.url', '/api/orders/123')
span.set_tag('http.status_code', 200)
span.set_tag('user.id', 456)
```

**Logs**: Timestamped events within span

```python
span.log_kv({'event': 'cache_miss', 'key': 'order:123'})
span.log_kv({'event': 'database_query', 'query': 'SELECT * FROM orders WHERE id=123'})
```

---

## 🎯 How Distributed Tracing Works

### **1. Generate Trace ID**

```python
# First service (API Gateway) generates trace ID
import uuid

trace_id = str(uuid.uuid4())  # abc-123-def-456
span_id = str(uuid.uuid4())    # span-1
```

### **2. Propagate Context** (Pass trace ID downstream)

**HTTP Headers**:

```python
# API Gateway sends request to Auth Service
headers = {
    'X-Trace-Id': 'abc-123-def-456',
    'X-Span-Id': 'span-1',
    'X-Parent-Span-Id': None
}
response = requests.get('http://auth-service/verify', headers=headers)
```

**Auth Service receives and creates child span**:

```python
# Extract trace context from headers
trace_id = request.headers.get('X-Trace-Id')
parent_span_id = request.headers.get('X-Span-Id')

# Create child span
span_id = str(uuid.uuid4())  # span-2
span = create_span(trace_id, span_id, parent_span_id)

# Continue request...
```

### **3. Record Span Data**

```python
span = tracer.start_span('process_order')
span.set_tag('order.id', 123)
span.set_tag('user.id', 456)

try:
    result = process_order(123)
    span.set_tag('status', 'success')
except Exception as e:
    span.set_tag('error', True)
    span.log_kv({'event': 'error', 'message': str(e)})
finally:
    span.finish()  # Records duration
```

### **4. Send to Backend**

```python
# Spans sent to tracing backend (Jaeger, Zipkin)
# Backend assembles spans into complete trace
# Visualizes trace timeline
```

---

## 🎯 OpenTelemetry (Standard)

**OpenTelemetry**: Open standard for traces, metrics, logs

**Python implementation**:

```python
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configure tracer
trace.set_tracer_provider(TracerProvider())
tracer = trace.get_tracer(__name__)

# Configure exporter (Jaeger)
jaeger_exporter = JaegerExporter(
    agent_host_name='localhost',
    agent_port=6831
)

trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# Create span
with tracer.start_as_current_span('process_order') as span:
    span.set_attribute('order.id', 123)
    span.set_attribute('user.id', 456)
    
    result = process_order(123)
    
    span.set_attribute('order.total', result['total'])
```

---

### **Auto-instrumentation** (Flask)

```python
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

app = Flask(__name__)

# Auto-instrument Flask (traces all requests)
FlaskInstrumentor().instrument_app(app)

# Auto-instrument requests library (traces HTTP calls)
RequestsInstrumentor().instrument()

@app.route('/api/orders/<int:order_id>')
def get_order(order_id):
    # Automatically traced ✓
    # Span includes: HTTP method, URL, status code, duration
    
    # Call another service (automatically traced)
    response = requests.get(f'http://payment-service/charge/{order_id}')
    
    return jsonify({'order': order_id})
```

---

## 🎯 Jaeger (Tracing Backend)

**Architecture**:

```
Application → Jaeger Agent → Jaeger Collector → Database → Jaeger UI
```

**Jaeger Agent**: Runs on each host, buffers spans

**Jaeger Collector**: Receives spans, writes to storage

**Storage**: Cassandra, Elasticsearch, or in-memory

**Jaeger UI**: Visualize traces

---

### **Example Trace in Jaeger UI**

**Trace view**:

```
Trace: abc-123-def-456
Duration: 500ms
Services: 4 (api-gateway, auth, orders, payment)
Spans: 6

Timeline:
|─────────────────────────────────────────────────| 500ms
├─ api-gateway (50ms)
│  ├─ auth (20ms)
│  └─ orders (480ms)
│     ├─ payment (400ms) ← SLOW
│     │  └─ stripe-api (380ms)
│     └─ database (80ms)
```

**Span details**:

```
Span: payment-service
Duration: 400ms
Tags:
  - http.method: POST
  - http.url: /charge/123
  - order.id: 123
  - user.id: 456
  - error: false

Logs:
  - 0ms: payment_started
  - 50ms: stripe_api_called
  - 430ms: payment_succeeded
```

---

## 🎯 Context Propagation

### **W3C Trace Context** (Standard)

**HTTP Headers**:

```
traceparent: 00-abc123def456-span789-01
             ^  ^            ^        ^
             |  |            |        |
version ─────┘  |            |        |
trace-id ───────┘            |        |
parent-span-id ──────────────┘        |
trace-flags ──────────────────────────┘
```

**Example**:

```python
# API Gateway (creates trace)
traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'

# Send to Auth Service
headers = {'traceparent': traceparent}
response = requests.get('http://auth/verify', headers=headers)

# Auth Service extracts trace context
trace_context = parse_traceparent(request.headers['traceparent'])
trace_id = trace_context['trace_id']  # 4bf92f3577b34da6a3ce929d0e0e4736
parent_span_id = trace_context['span_id']  # 00f067aa0ba902b7

# Create child span
span_id = generate_span_id()
child_traceparent = f'00-{trace_id}-{span_id}-01'

# Pass to next service
headers = {'traceparent': child_traceparent}
requests.get('http://orders/list', headers=headers)
```

---

## 🎯 Sampling

**Problem**: Tracing every request is expensive (high traffic)

**Solution**: Sample traces (trace 1% of requests)

### **Sampling Strategies**

**1. Probabilistic** (random):

```python
import random

def should_trace():
    return random.random() < 0.01  # 1% sample rate

@app.before_request
def start_trace():
    if should_trace():
        tracer.start_span(request.path)
```

**2. Rate-limiting** (N traces per second):

```python
# Trace 100 requests/second (regardless of total traffic)
rate_limiter = RateLimiter(rate=100)

@app.before_request
def start_trace():
    if rate_limiter.allow():
        tracer.start_span(request.path)
```

**3. Adaptive** (sample more when errors occur):

```python
# Normal: 1% sample rate
# Errors: 100% sample rate

@app.route('/api/data')
def get_data():
    try:
        result = fetch_data()
        if should_trace_success():  # 1% sample rate
            tracer.start_span(request.path)
        return result
    except Exception as e:
        # Always trace errors ✓
        tracer.start_span(request.path)
        span.set_tag('error', True)
        raise
```

**4. Head-based** (decide at start):

```python
# Decide at API Gateway (first service)
# All downstream services honor decision

if should_trace():
    # Set trace flag in traceparent header
    traceparent = f'00-{trace_id}-{span_id}-01'  # 01 = sampled
else:
    traceparent = f'00-{trace_id}-{span_id}-00'  # 00 = not sampled

# Downstream services check flag
trace_flags = parse_traceparent(request.headers['traceparent'])['flags']
if trace_flags == '01':
    # Trace this request ✓
```

---

## 🎯 Real-World Examples

### **1. Uber (Jaeger)**

**Use case**: Trace ride requests across 2000+ microservices

**Example trace**:

```
Trace: Ride Request (3 seconds)
├─ API Gateway (50ms)
├─ Auth Service (20ms)
├─ Pricing Service (200ms)
│  ├─ Surge Pricing (150ms)
│  └─ Distance Calculation (50ms)
├─ Driver Matching (2.5s) ← SLOW
│  ├─ Find Nearby Drivers (2s)
│  └─ Ranking Algorithm (500ms)
└─ Notification Service (200ms)
   └─ Send Push Notification (180ms)
```

**Insight**: Driver matching is bottleneck → Optimize algorithm

---

### **2. Netflix**

**Use case**: Trace video stream requests

**Example trace**:

```
Trace: Play Video (500ms)
├─ API Gateway (20ms)
├─ Auth Service (10ms)
├─ Recommendations (100ms)
├─ Content Metadata (50ms)
├─ CDN Selection (200ms) ← SLOW (network latency)
│  ├─ Geolocation (50ms)
│  ├─ Server Load Check (100ms)
│  └─ Route Optimization (50ms)
└─ Playback Token (20ms)
```

**Insight**: CDN selection slow → Pre-compute optimal CDN

---

### **3. AWS X-Ray**

**Use case**: Trace serverless applications (Lambda)

**Example trace**:

```
Trace: API Request (1.2s)
├─ API Gateway (20ms)
├─ Lambda: Auth (100ms)
│  └─ DynamoDB: GetItem (50ms)
├─ Lambda: Process (1s) ← COLD START
│  ├─ Initialization (800ms) ← SLOW
│  └─ Execution (200ms)
└─ Lambda: Response (50ms)
```

**Insight**: Cold start slow → Pre-warm Lambda or switch to containers

---

## 🎯 Use Cases

### **1. Performance Debugging**

**Problem**: API slow, don't know why

**Solution**: View trace, identify bottleneck

```
Trace: GET /api/orders/123 (2.5s)
├─ API Gateway (10ms)
├─ Orders Service (2.4s)
│  ├─ Database Query (2s) ← BOTTLENECK (missing index)
│  └─ Price Calculation (400ms)
└─ Response (10ms)

Fix: Add database index → 2s → 50ms ✓
```

---

### **2. Error Root Cause**

**Problem**: Request failed, which service caused it?

**Solution**: View trace with error spans

```
Trace: POST /api/checkout (FAILED)
├─ API Gateway (✓)
├─ Cart Service (✓)
├─ Payment Service (✓)
├─ Inventory Service (✓)
├─ Email Service (❌ FAILED)
│  └─ SendGrid API (503 Service Unavailable)
└─ Order Confirmation (not executed)

Root cause: SendGrid API down
```

---

### **3. Latency Analysis**

**Problem**: p99 latency high (1s), but median low (50ms)

**Solution**: Trace slow requests (>1s), find common pattern

```
Slow traces (>1s):
1. Trace abc (1.2s): Database query slow (missing index on user_id)
2. Trace def (1.5s): Database query slow (same query)
3. Trace ghi (1.1s): Database query slow (same query)

Pattern: All slow traces have same query
Fix: Add index on user_id → p99 latency 1s → 100ms ✓
```

---

### **4. Dependency Analysis**

**Problem**: Which services does my service depend on?

**Solution**: Analyze traces, build dependency graph

```
Orders Service depends on:
├─ Payment Service (critical)
├─ Inventory Service (critical)
├─ Email Service (non-critical)
└─ Recommendations Service (non-critical)

Strategy: Circuit breaker for non-critical services
```

---

## ✅ Best Practices

1. **Propagate context** (pass trace ID to all downstream services)
2. **Sample intelligently** (1% success, 100% errors)
3. **Tag appropriately** (user_id, order_id, error status)
4. **Trace external calls** (databases, APIs, message queues)
5. **Don't log sensitive data** (passwords, credit cards in span tags)
6. **Set up alerts** (alert if p99 latency > 1s)
7. **Root cause analysis** (use traces to debug production issues)
8. **Correlate with logs** (include trace_id in logs)
9. **Monitor sampling rate** (adjust based on traffic)
10. **Retention policy** (keep traces for 7-30 days)

---

## 🎓 Interview Tips

**Q: "What is distributed tracing and why is it needed?"**

A: "Distributed tracing tracks a request across multiple services in a microservices architecture.

**Problem**: Debugging microservices is hard
- Request flows through 10 services
- Which service is slow? ❌
- Which service failed? ❌

**Solution**: Distributed tracing
- Assign unique **trace ID** to each request
- Each service creates a **span** (operation + duration)
- Pass trace ID to downstream services (**context propagation**)
- Visualize complete request flow

**Example**:
```
Trace ID: abc-123 (500ms)
├─ API Gateway: 50ms ✓
├─ Auth: 20ms ✓
├─ Orders: 400ms ⚠️ SLOW
│  ├─ Payment: 350ms ⚠️ (Stripe API slow)
│  └─ Database: 50ms ✓
```

**Benefits**:
- Identify bottlenecks (Payment service slow)
- Root cause errors (Email service failed)
- Understand dependencies (Orders depends on Payment)

**Tools**: Jaeger, Zipkin, AWS X-Ray, OpenTelemetry

Real-world: Uber traces requests across 2000+ microservices with Jaeger"

**Q: "How does context propagation work?"**

A: "Context propagation passes trace information between services:

**1. Generate trace ID** (API Gateway):
```python
trace_id = uuid.uuid4()  # abc-123
span_id = uuid.uuid4()   # span-1
```

**2. Send to downstream service** (HTTP headers):
```python
headers = {
    'traceparent': '00-abc123-span1-01'
}
requests.get('http://auth/verify', headers=headers)
```

**3. Extract trace context** (Auth Service):
```python
traceparent = request.headers['traceparent']
trace_id = parse_trace_id(traceparent)  # abc-123
parent_span_id = parse_span_id(traceparent)  # span-1
```

**4. Create child span**:
```python
span_id = uuid.uuid4()  # span-2
child_span = Span(trace_id, span_id, parent_span_id)
```

**5. Repeat for all services**:
```
API Gateway (span-1)
  → Auth (span-2, parent=span-1)
    → Orders (span-3, parent=span-2)
      → Payment (span-4, parent=span-3)
```

**Standard**: W3C Trace Context (traceparent header)

Real-world: All services must propagate context, or trace breaks"

**Q: "How do you handle sampling in distributed tracing?"**

A: "Sampling reduces overhead (tracing all requests expensive):

**Strategies**:

1. **Probabilistic** (random 1%):
```python
if random.random() < 0.01:
    trace_request()
```

2. **Always trace errors** (critical):
```python
try:
    process()
    if should_sample():  # 1%
        trace()
except:
    trace()  # 100% errors ✓
```

3. **Head-based sampling** (decide at entry):
```python
# API Gateway decides (first service)
if should_sample():
    traceparent = '00-abc123-span1-01'  # 01 = sampled
else:
    traceparent = '00-abc123-span1-00'  # 00 = not sampled

# All downstream services honor decision
```

4. **Adaptive sampling** (adjust dynamically):
```python
# Normal: 1% sample rate
# High error rate: 10% sample rate
# Alerts firing: 100% sample rate
```

**Trade-offs**:
- Higher sample rate = more visibility, higher cost
- Lower sample rate = less visibility, lower cost

**Real-world**: Google traces 0.01% of requests (billions/day), always traces errors"

---

## 📚 Summary

**Distributed Tracing**: Track request across multiple services

**Core Concepts**: Trace (end-to-end journey), Span (single operation), Tags/Logs (metadata)

**Context Propagation**: Pass trace ID via HTTP headers (W3C Trace Context standard)

**Sampling**: Trace 1% success, 100% errors (reduce overhead)

**Tools**: Jaeger, Zipkin, AWS X-Ray, OpenTelemetry

**Benefits**: Identify bottlenecks, root cause errors, understand dependencies 🚀

