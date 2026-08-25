# 50. Health Checks

---

## 1. High-Level Explanation (Interview-Level Overview)

### What Are Health Checks?

**Health checks** are periodic tests that load balancers (or monitoring systems) perform to determine if backend servers are healthy and able to handle requests.

**Purpose**:
- **Detect failures**: Identify crashed or unresponsive servers
- **Remove unhealthy servers**: Stop sending traffic to failed servers
- **Auto-recovery**: Re-add servers when they become healthy again
- **Prevent cascading failures**: Avoid routing to servers that will fail

**Without Health Checks**:
```
Server2 crashes
Load balancer continues sending traffic to Server2
50% of requests fail (timeout or connection refused)
Poor user experience
```

**With Health Checks**:
```
Server2 crashes
Health check detects failure (3 consecutive failures)
Load balancer removes Server2 from pool
100% of requests succeed (routed to Server1, Server3)
```

### Types of Health Checks

| Type | Layer | What It Checks | Example |
|------|-------|----------------|---------|
| **TCP** | Layer 4 | Can establish TCP connection | Port 80 open? |
| **HTTP** | Layer 7 | HTTP endpoint returns 200 OK | GET /health → 200 |
| **HTTPS** | Layer 7 | HTTPS endpoint + SSL cert valid | GET /health (SSL) |
| **Custom Script** | Layer 7 | Application-level checks | Database connected? |

### Real-World Analogy

Think of health checks like a manager checking if employees are present and able to work:

- **TCP Check**: Knock on office door. Door opens? → Present
- **HTTP Check**: Ask "Are you ready to work?" → "Yes" (200 OK) → Ready
- **Custom Check**: Ask "Can you access the tools you need?" (database, APIs) → "Yes" → Fully functional

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### Health Check Configuration

#### Key Parameters

```yaml
health_check:
  endpoint: /health          # URL to check
  interval: 10s              # Check every 10 seconds
  timeout: 5s                # Wait max 5 seconds for response
  healthy_threshold: 2       # 2 consecutive successes → mark healthy
  unhealthy_threshold: 3     # 3 consecutive failures → mark unhealthy
  expected_status: 200       # Expected HTTP status code
  expected_body: '{"status":"healthy"}'  # Optional: check response body
```

#### State Transitions

```
Initial State: UNKNOWN
   ↓ (2 consecutive successes)
HEALTHY (receiving traffic)
   ↓ (3 consecutive failures)
UNHEALTHY (traffic stopped)
   ↓ (2 consecutive successes)
HEALTHY (traffic resumed)
```

**Example Timeline**:
```
T=0s:   Check 1 → Success (status: UNKNOWN)
T=10s:  Check 2 → Success (status: HEALTHY) ← 2 consecutive successes
T=20s:  Check 3 → Success (status: HEALTHY)
T=30s:  Check 4 → Failure (status: HEALTHY, fail_count=1)
T=40s:  Check 5 → Failure (status: HEALTHY, fail_count=2)
T=50s:  Check 6 → Failure (status: UNHEALTHY) ← 3 consecutive failures
T=60s:  Check 7 → Failure (status: UNHEALTHY)
T=70s:  Check 8 → Success (status: UNHEALTHY, success_count=1)
T=80s:  Check 9 → Success (status: HEALTHY) ← 2 consecutive successes
```

### TCP Health Checks (Layer 4)

**What It Does**: Attempt to establish TCP connection

```python
import socket

def tcp_health_check(host, port, timeout=5):
    """
    Simple TCP connection test
    Returns True if connection succeeds, False otherwise
    """
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()
        
        return result == 0  # 0 = connection succeeded
    except Exception as e:
        print(f"TCP health check failed: {e}")
        return False

# Usage
if tcp_health_check("10.0.1.10", 8080):
    print("✅ Server is healthy (TCP connection successful)")
else:
    print("❌ Server is unhealthy (TCP connection failed)")
```

**NGINX Configuration**:
```nginx
upstream backend {
    server 10.0.1.10:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.11:8080 max_fails=3 fail_timeout=30s;
    server 10.0.1.12:8080 max_fails=3 fail_timeout=30s;
}

# NGINX performs implicit TCP health checks on each request
# If 3 consecutive requests fail, server marked unhealthy for 30s
```

**Pros**:
- ✅ Fast (1-10ms)
- ✅ Simple (just test TCP connection)
- ✅ Works with any TCP service (HTTP, database, message queue)

**Cons**:
- ❌ Shallow check (port open ≠ application working)
- ❌ Can't detect application-level failures (database disconnected, out of memory)

### HTTP Health Checks (Layer 7)

**What It Does**: Send HTTP request to health endpoint, expect 200 OK

```python
import requests

def http_health_check(url, timeout=5, expected_status=200, expected_body=None):
    """
    HTTP health check with status code and optional body validation
    """
    try:
        response = requests.get(url, timeout=timeout)
        
        # Check status code
        if response.status_code != expected_status:
            return False, f"Wrong status: {response.status_code}"
        
        # Check response body (optional)
        if expected_body:
            data = response.json()
            if data.get("status") != expected_body:
                return False, f"Wrong body: {data}"
        
        return True, "OK"
    
    except requests.Timeout:
        return False, "Timeout"
    except requests.ConnectionError:
        return False, "Connection failed"
    except Exception as e:
        return False, f"Error: {e}"

# Usage
healthy, reason = http_health_check("http://10.0.1.10:8080/health")
if healthy:
    print("✅ Server is healthy")
else:
    print(f"❌ Server is unhealthy: {reason}")
```

**NGINX Plus Configuration** (commercial):
```nginx
upstream backend {
    zone backend 64k;
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
    server 10.0.1.12:8080;
}

# Active health checks (NGINX Plus only)
match health_check {
    status 200;
    header Content-Type = application/json;
    body ~ '"status":"healthy"';
}

server {
    location / {
        proxy_pass http://backend;
        health_check interval=10s fails=3 passes=2 uri=/health match=health_check;
    }
}
```

**HAProxy Configuration**:
```haproxy
backend backend_servers
    option httpchk GET /health HTTP/1.1\r\nHost:\ api.example.com
    http-check expect status 200
    http-check expect string "healthy"
    
    server server1 10.0.1.10:8080 check inter 10s fall 3 rise 2
    server server2 10.0.1.11:8080 check inter 10s fall 3 rise 2
    server server3 10.0.1.12:8080 check inter 10s fall 3 rise 2
```

**Pros**:
- ✅ Application-level check (validates HTTP stack working)
- ✅ Can check response body (detailed health status)
- ✅ Detects more failures than TCP (e.g., 500 Internal Server Error)

**Cons**:
- ❌ Slower than TCP (10-50ms)
- ❌ Only works with HTTP services

### Health Check Endpoints

**Basic Implementation** (Flask/Python):
```python
from flask import Flask, jsonify
import time

app = Flask(__name__)
startup_time = time.time()

@app.route('/health')
def health():
    """
    Simple health check endpoint
    Returns 200 OK if server is healthy
    """
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "uptime_seconds": time.time() - startup_time
    }), 200

@app.route('/readiness')
def readiness():
    """
    Readiness check: Is server ready to receive traffic?
    Checks dependencies (database, Redis, etc.)
    """
    try:
        # Check database connection
        if not db.ping():
            return jsonify({"status": "unhealthy", "reason": "database disconnected"}), 503
        
        # Check Redis connection
        if not redis.ping():
            return jsonify({"status": "unhealthy", "reason": "redis disconnected"}), 503
        
        # All dependencies healthy
        return jsonify({"status": "ready"}), 200
    
    except Exception as e:
        return jsonify({"status": "unhealthy", "reason": str(e)}), 503

@app.route('/liveness')
def liveness():
    """
    Liveness check: Is server alive (not deadlocked, not crashed)?
    Simple check that doesn't depend on external services
    """
    return jsonify({"status": "alive"}), 200
```

**Advanced Implementation** (Express/Node.js):
```javascript
const express = require('express');
const app = express();

// Health check state
let healthy = true;
let dependencies = {
    database: true,
    redis: true,
    kafka: true
};

// Basic health check
app.get('/health', (req, res) => {
    if (healthy) {
        res.status(200).json({
            status: 'healthy',
            timestamp: Date.now(),
            uptime: process.uptime()
        });
    } else {
        res.status(503).json({
            status: 'unhealthy',
            timestamp: Date.now()
        });
    }
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
    const checks = {
        database: await checkDatabase(),
        redis: await checkRedis(),
        kafka: await checkKafka(),
        memory: checkMemory(),
        cpu: checkCPU()
    };
    
    const allHealthy = Object.values(checks).every(check => check.healthy);
    
    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: Date.now(),
        checks: checks
    });
});

// Dependency checks
async function checkDatabase() {
    try {
        await db.query('SELECT 1');
        return { healthy: true };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}

async function checkRedis() {
    try {
        await redis.ping();
        return { healthy: true };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}

async function checkKafka() {
    try {
        await kafka.admin().listTopics();
        return { healthy: true };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}

function checkMemory() {
    const used = process.memoryUsage();
    const limit = 1024 * 1024 * 1024; // 1 GB
    const healthy = used.heapUsed < limit * 0.9; // < 90% of limit
    
    return {
        healthy: healthy,
        heap_used_mb: Math.round(used.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(used.heapTotal / 1024 / 1024)
    };
}

function checkCPU() {
    const load = os.loadavg()[0]; // 1-minute load average
    const cores = os.cpus().length;
    const healthy = load < cores * 0.8; // < 80% of cores
    
    return {
        healthy: healthy,
        load_average: load,
        cores: cores
    };
}
```

### Liveness vs Readiness vs Startup Checks (Kubernetes)

**Kubernetes uses 3 types of health checks**:

#### 1. Liveness Probe
**Question**: Is container alive (not deadlocked, not crashed)?

**Action if fails**: Restart container

**Example**:
```yaml
livenessProbe:
  httpGet:
    path: /liveness
    port: 8080
  initialDelaySeconds: 30  # Wait 30s after startup
  periodSeconds: 10        # Check every 10s
  failureThreshold: 3      # Restart after 3 failures
```

**Implementation**:
```python
@app.route('/liveness')
def liveness():
    """Simple check: Is process responsive?"""
    return jsonify({"status": "alive"}), 200
```

#### 2. Readiness Probe
**Question**: Is container ready to receive traffic?

**Action if fails**: Remove from service (stop sending traffic)

**Example**:
```yaml
readinessProbe:
  httpGet:
    path: /readiness
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

**Implementation**:
```python
@app.route('/readiness')
def readiness():
    """Check if dependencies are ready"""
    if not db.is_connected():
        return jsonify({"status": "not ready", "reason": "database"}), 503
    if not redis.is_connected():
        return jsonify({"status": "not ready", "reason": "redis"}), 503
    return jsonify({"status": "ready"}), 200
```

#### 3. Startup Probe
**Question**: Has container finished starting up?

**Action if fails**: Restart container (but wait longer than liveness)

**Example**:
```yaml
startupProbe:
  httpGet:
    path: /startup
    port: 8080
  initialDelaySeconds: 0
  periodSeconds: 10
  failureThreshold: 30  # Allow 5 minutes for startup (30 × 10s)
```

**When to Use**:
- **Liveness**: Always (detect deadlocks, crashes)
- **Readiness**: When dependencies required (database, cache)
- **Startup**: Slow-starting apps (ML model loading, large data load)

---

## 3. Capacity Planning & Estimation (When Applicable)

### Health Check Overhead

**Scenario**: E-commerce platform with 100 backend servers

**Setup**:
- 100 servers behind load balancer
- Health check interval: 10 seconds
- Health check latency: 10ms
- Health check response size: 200 bytes

### Network Overhead

**Health Check Rate**:
```
100 servers × (60 seconds / 10 second interval) = 600 health checks/minute
                                                 = 10 health checks/second
```

**Bandwidth**:
```
Request size: 100 bytes (HTTP GET /health)
Response size: 200 bytes (JSON response)
Total per check: 300 bytes

Bandwidth = 10 checks/sec × 300 bytes = 3 KB/s = 0.024 Mbps
```

**Conclusion**: Negligible network overhead (< 0.1% of 1 Gbps link)

### CPU Overhead

**Per Server**:
```
Health check every 10 seconds
Processing time: 1ms (read status, format JSON)
CPU usage: 1ms / 10,000ms = 0.01% per server
```

**Conclusion**: Negligible CPU overhead

### When Health Checks Matter

**Large-Scale Deployment** (10,000 servers):
```
10,000 servers × 6 checks/minute = 60,000 checks/minute = 1,000 checks/second

With 3 load balancers (HA):
3 LBs × 1,000 checks/sec = 3,000 health checks/second total

Impact:
- Network: 3,000 checks/sec × 300 bytes = 900 KB/s = 7.2 Mbps (acceptable)
- CPU: Minimal (each server receives 0.1 check/sec)

But: Consider staggering checks (not all 3 LBs at same time)
```

---

## 4. Data & Storage Design

### Health Check State Storage

**Load Balancer State**:
```python
health_state = {
    "10.0.1.10:8080": {
        "status": "healthy",  # "healthy", "unhealthy", "unknown"
        "consecutive_failures": 0,
        "consecutive_successes": 2,
        "last_check_time": 1739800000,
        "last_check_result": "success",
        "response_time_ms": 12,
        "total_checks": 1500,
        "total_failures": 15
    },
    "10.0.1.11:8080": {
        "status": "unhealthy",
        "consecutive_failures": 3,
        "consecutive_successes": 0,
        "last_check_time": 1739800010,
        "last_check_result": "timeout",
        "response_time_ms": None,
        "total_checks": 1500,
        "total_failures": 25
    }
}
```

**Metrics Storage** (Prometheus format):
```
# HELP backend_health_check_total Total number of health checks performed
# TYPE backend_health_check_total counter
backend_health_check_total{server="10.0.1.10:8080",result="success"} 1485
backend_health_check_total{server="10.0.1.10:8080",result="failure"} 15
backend_health_check_total{server="10.0.1.11:8080",result="success"} 1475
backend_health_check_total{server="10.0.1.11:8080",result="failure"} 25

# HELP backend_health_check_duration_seconds Health check response time
# TYPE backend_health_check_duration_seconds histogram
backend_health_check_duration_seconds_bucket{server="10.0.1.10:8080",le="0.01"} 1200
backend_health_check_duration_seconds_bucket{server="10.0.1.10:8080",le="0.05"} 1480
backend_health_check_duration_seconds_bucket{server="10.0.1.10:8080",le="0.1"} 1500

# HELP backend_healthy Status of backend servers (1=healthy, 0=unhealthy)
# TYPE backend_healthy gauge
backend_healthy{server="10.0.1.10:8080"} 1
backend_healthy{server="10.0.1.11:8080"} 0
backend_healthy{server="10.0.1.12:8080"} 1
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Prevent False Positives

**Problem**: Network hiccup causes healthy server to be marked unhealthy

**Solution**: Require multiple consecutive failures
```yaml
unhealthy_threshold: 3  # Require 3 consecutive failures
```

**Trade-off**:
- Too low (1-2): False positives (temporary network issues trigger removal)
- Too high (5+): Slow detection (failed server receives traffic longer)
- **Recommended**: 3 (balances false positives vs detection speed)

### Prevent Cascading Failures

**Scenario**: One server slow, health check times out, server removed, load increases on remaining servers, they become slow, cascade...

**Solution 1: Circuit Breaker Health Checks**
```python
def adaptive_health_check(server, baseline_latency=50):
    """
    Adjust health check timeout based on current load
    """
    current_load = get_server_load(server)
    
    # If load high, allow longer timeout
    if current_load > 0.8:
        timeout = baseline_latency * 2  # 100ms
    else:
        timeout = baseline_latency  # 50ms
    
    return http_health_check(server, timeout=timeout)
```

**Solution 2: Graceful Degradation**
```python
def remove_server_gradually(server):
    """
    Reduce traffic to server before removing completely
    """
    # Step 1: Reduce to 50% traffic (mark as "degraded")
    set_server_weight(server, weight=0.5)
    time.sleep(30)  # Observe for 30 seconds
    
    # Step 2: If still unhealthy, reduce to 25%
    if not is_healthy(server):
        set_server_weight(server, weight=0.25)
        time.sleep(30)
    
    # Step 3: Remove completely
    if not is_healthy(server):
        set_server_weight(server, weight=0)
```

### Distributed Health Checks

**Problem**: Single load balancer performs all health checks → single point of failure

**Solution**: Multiple load balancers, distributed health checks
```
LB1 checks: Server1, Server4, Server7, ...
LB2 checks: Server2, Server5, Server8, ...
LB3 checks: Server3, Server6, Server9, ...

Each LB shares health status via gossip protocol (Serf, Consul)
```

**Consensus**:
```
LB1 says Server5 is unhealthy
LB2 says Server5 is healthy
LB3 says Server5 is healthy

Majority vote: 2/3 say healthy → Server5 remains in pool
```

---

## 6. Security, APIs & Governance

### Securing Health Check Endpoints

**Problem**: Publicly accessible health endpoint reveals system information

```http
GET /health HTTP/1.1

HTTP/1.1 200 OK
{
    "status": "healthy",
    "database": "PostgreSQL 14.5",
    "redis_version": "7.0.5",
    "internal_ip": "10.0.1.10",
    "memory_usage_mb": 450,
    "cpu_usage_percent": 65
}

# Attacker now knows:
# - Database type and version (for exploit research)
# - Internal IP (for network mapping)
# - Resource usage (for timing attacks)
```

**Solution 1: Minimal Information**
```python
@app.route('/health')
def health():
    """Public health endpoint - minimal info"""
    if is_healthy():
        return jsonify({"status": "healthy"}), 200
    else:
        return jsonify({"status": "unhealthy"}), 503

@app.route('/health/detailed')
@require_auth  # Requires authentication
def health_detailed():
    """Detailed health check - authenticated only"""
    return jsonify({
        "status": "healthy",
        "database": check_database(),
        "redis": check_redis(),
        "kafka": check_kafka(),
        "memory_mb": get_memory_usage(),
        "cpu_percent": get_cpu_usage()
    }), 200
```

**Solution 2: Internal Network Only**
```nginx
# NGINX: Allow health checks only from load balancer IPs
location /health {
    allow 10.0.0.0/8;      # Internal network
    allow 172.16.0.0/12;   # Load balancer subnet
    deny all;              # Block all others
    
    proxy_pass http://backend;
}
```

**Solution 3: Secret Token**
```python
HEALTH_CHECK_TOKEN = os.getenv('HEALTH_CHECK_TOKEN')

@app.route('/health')
def health():
    token = request.headers.get('X-Health-Check-Token')
    
    if token != HEALTH_CHECK_TOKEN:
        return jsonify({"error": "Unauthorized"}), 401
    
    # Perform health check
    return jsonify({"status": "healthy"}), 200
```

### Rate Limiting Health Checks

**Problem**: Attacker spams health endpoint (DoS)

**Solution**:
```nginx
# Rate limit health checks to 10/second per IP
limit_req_zone $binary_remote_addr zone=health_limit:10m rate=10r/s;

location /health {
    limit_req zone=health_limit burst=5 nodelay;
    proxy_pass http://backend;
}
```

---

## 7. Real-World Examples & Case Studies

### Netflix: Circuit Breaker Health Checks

**Hystrix Circuit Breaker** (now archived, but widely used):
```java
@HystrixCommand(
    commandProperties = {
        @HystrixProperty(name = "circuitBreaker.requestVolumeThreshold", value = "20"),
        @HystrixProperty(name = "circuitBreaker.errorThresholdPercentage", value = "50"),
        @HystrixProperty(name = "circuitBreaker.sleepWindowInMilliseconds", value = "5000")
    }
)
public User getUser(Long userId) {
    return userService.getUser(userId);
}

// If 50% of 20+ requests fail → circuit opens for 5 seconds
// During open circuit: fast-fail (don't call service, return fallback)
// After 5 seconds: try one request (half-open state)
// If success → close circuit, if failure → open for another 5 seconds
```

### AWS ELB: Configurable Health Checks

**Application Load Balancer**:
```python
import boto3

elbv2 = boto3.client('elbv2')

# Configure health check
elbv2.modify_target_group(
    TargetGroupArn='arn:aws:elasticloadbalancing:...',
    HealthCheckProtocol='HTTP',
    HealthCheckPath='/health',
    HealthCheckIntervalSeconds=30,
    HealthCheckTimeoutSeconds=5,
    HealthyThresholdCount=2,
    UnhealthyThresholdCount=2,
    Matcher={
        'HttpCode': '200'  # Expect 200 OK
    }
)
```

**Cross-Zone Health Checks**:
```
Load Balancer in us-east-1a checks:
- Targets in us-east-1a (same AZ)
- Targets in us-east-1b (different AZ)
- Targets in us-east-1c (different AZ)

Benefit: Detects entire AZ failures
```

### Google Cloud: Advanced Health Checks

**HTTP/2 Health Checks**:
```yaml
healthCheck:
  checkIntervalSec: 10
  timeoutSec: 5
  healthyThreshold: 2
  unhealthyThreshold: 3
  type: HTTP2
  http2HealthCheck:
    portSpecification: USE_SERVING_PORT
    requestPath: /health
    proxyHeader: NONE
```

**gRPC Health Checks**:
```protobuf
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
}

message HealthCheckRequest {
  string service = 1;
}

message HealthCheckResponse {
  enum ServingStatus {
    UNKNOWN = 0;
    SERVING = 1;
    NOT_SERVING = 2;
  }
  ServingStatus status = 1;
}
```

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "Explain health checks in load balancing"

**Structured Answer**:

**"Health checks are periodic tests to determine if backend servers are healthy and able to handle requests.**

**How they work:**
1. Load balancer sends request to health endpoint (e.g., GET /health)
2. Server responds with status (200 OK = healthy, 503 = unhealthy)
3. LB tracks consecutive failures/successes
4. After N consecutive failures → mark unhealthy, stop sending traffic
5. After M consecutive successes → mark healthy, resume traffic

**Types:**
- **TCP (Layer 4)**: Test if port open (fast but shallow)
- **HTTP (Layer 7)**: Test if endpoint returns 200 OK (application-level)
- **Custom**: Check dependencies (database, cache) → comprehensive

**Configuration:**
```yaml
interval: 10s              # Check every 10 seconds
timeout: 5s                # Wait max 5 seconds
unhealthy_threshold: 3     # 3 failures → mark unhealthy
healthy_threshold: 2       # 2 successes → mark healthy
```

**Real-world: AWS ELB performs health checks every 30 seconds by default. If 2 consecutive failures, server removed from pool. If 2 consecutive successes, server re-added. This prevents false positives (temporary network issues) while detecting real failures quickly."**

---

### Follow-Up 1: "What's the difference between TCP and HTTP health checks?"

**Answer**:

**"TCP and HTTP health checks differ in depth:**

**TCP Health Check (Layer 4):**
- **How**: Try to establish TCP connection on port (e.g., port 8080)
- **Speed**: Fast (1-10ms)
- **What it checks**: Port is open, process listening
- **What it misses**: Application-level failures (database disconnected, out of memory, 500 errors)

**Example:**
```python
socket.connect(("10.0.1.10", 8080))  # Success
# But application might be returning 500 errors!
```

**HTTP Health Check (Layer 7):**
- **How**: Send HTTP GET /health, expect 200 OK
- **Speed**: Slower (10-50ms)
- **What it checks**: HTTP stack working, application responding correctly
- **What it can check**: Dependencies (database, cache), resource usage

**Example:**
```python
GET /health → 200 OK {"status": "healthy", "database": "connected"}
# Confirms application and dependencies working
```

**When to use:**
- **TCP**: Non-HTTP services (databases, message queues), need minimal overhead
- **HTTP**: Web services, APIs, need application-level validation

**Best practice: Use HTTP health checks for web services. Include dependency checks (database, Redis) in /health endpoint to catch application-level failures."**

---

### Follow-Up 2: "How do you prevent false positives in health checks?"

**Answer**:

**"False positives (healthy server marked unhealthy) cause unnecessary failovers. Prevent with:**

**1. Multiple Consecutive Failures** (most important):
```yaml
unhealthy_threshold: 3  # Require 3 consecutive failures
```
- Single network hiccup doesn't trigger removal
- Trade-off: Detection takes 30 seconds (3 × 10s interval) vs 10 seconds (1 × 10s)

**2. Appropriate Timeouts**:
```yaml
timeout: 5s  # Not too aggressive (1s would cause false positives under load)
```
- Too short: Server slow under load → timeout → false positive
- Too long: Real failures take longer to detect
- **Recommended**: 5 seconds (balances detection vs false positives)

**3. Distributed Health Checks** (multiple LBs):
```
LB1 says Server unhealthy
LB2 says Server healthy
LB3 says Server healthy

Consensus: 2/3 say healthy → Don't remove
```

**4. Adaptive Timeouts** (adjust based on load):
```python
if server_load > 80%:
    timeout = 10s  # Allow more time when loaded
else:
    timeout = 5s   # Normal timeout
```

**5. Health Check Separate from Request Path**:
```
Health check: /health (lightweight, no database queries)
User requests: /api/users (may be slow under load)

If user requests slow → doesn't affect health checks
```

**Real-world: At Netflix, they use 3 consecutive failures with 30-second intervals. This gives 90 seconds to recover from transient issues before removal. Combined with circuit breakers (Hystrix), false positives rare."**

---

### Follow-Up 3: "What should a health check endpoint check?"

**Answer**:

**"Health check endpoint should balance comprehensiveness vs performance. Three levels:**

**1. Liveness Check** (Is process alive?):
```python
@app.route('/liveness')
def liveness():
    return {"status": "alive"}, 200
```
- **Checks**: Process responding
- **Use**: Kubernetes liveness probe (restart if fails)
- **Speed**: < 1ms

**2. Readiness Check** (Ready to receive traffic?):
```python
@app.route('/readiness')
def readiness():
    if not db.ping():
        return {"status": "not ready", "reason": "database"}, 503
    if not redis.ping():
        return {"status": "not ready", "reason": "redis"}, 503
    return {"status": "ready"}, 200
```
- **Checks**: Critical dependencies (database, cache)
- **Use**: Load balancer health check
- **Speed**: 10-50ms

**3. Detailed Health Check** (Full system status):
```python
@app.route('/health/detailed')
@require_auth  # Don't expose publicly
def health_detailed():
    return {
        "database": check_database(),      # Connection + query test
        "redis": check_redis(),            # Connection + ping
        "kafka": check_kafka(),            # Connection + topic list
        "disk_space_gb": check_disk(),
        "memory_usage_percent": check_memory(),
        "cpu_usage_percent": check_cpu()
    }, 200
```
- **Checks**: All dependencies + resource usage
- **Use**: Monitoring dashboards, debugging
- **Speed**: 50-200ms

**What NOT to check:**
- ❌ Don't make slow queries (e.g., SELECT COUNT(*) from large table)
- ❌ Don't check non-critical dependencies (analytics, logging)
- ❌ Don't perform expensive computations

**Best practice:**
```
/liveness    → Just return 200 OK (< 1ms)
/readiness   → Check critical deps: DB, cache (< 50ms)
/health/detailed → Full check, require auth (< 200ms)
```

**Real-world: AWS recommends health check complete in < 1 second. They've seen health checks that query database for 10+ seconds → timeouts → false positives → cascading failures. Keep it simple!"**

---

### Follow-Up 4: "How do health checks relate to circuit breakers?"

**Answer**:

**"Health checks (load balancer) and circuit breakers (application) complement each other:**

**Health Checks (LB-level)**:
- **Who**: Load balancer checks backend servers
- **When**: Every 10-30 seconds (periodic)
- **Action**: Remove unhealthy servers from pool
- **Scope**: Server-level (entire server down → remove)

**Circuit Breakers (App-level)**:
- **Who**: Application checks downstream dependencies
- **When**: On every request (inline)
- **Action**: Fast-fail if dependency unavailable (don't wait for timeout)
- **Scope**: Endpoint-level (one endpoint failing → open circuit for that endpoint)

**Example scenario:**
```
User Service → Order Service → Database

1. Database becomes slow (response time: 5 seconds)

Circuit Breaker (Order Service):
- Detects 50% of requests timing out
- Opens circuit after 10 failures in 30 seconds
- Fast-fails new requests (returns cached data or error)
- Tries one request every 5 seconds (half-open state)

Health Check (Load Balancer):
- Checks Order Service every 10 seconds
- GET /health endpoint still returns 200 OK (Order Service alive)
- Doesn't detect database issue (health check doesn't query database)
- Order Service remains in pool

Result:
- Circuit breaker prevents cascading failures (don't overload database)
- Health check doesn't remove Order Service (it's alive, just dependency failing)
- Users get fast failures (circuit breaker) instead of timeouts
```

**When to use both:**
```
Health Check: Detect server crashes, network failures, out of memory
Circuit Breaker: Detect slow dependencies, partial failures, cascading overload

Together: Comprehensive failure detection and recovery
```

**Real-world: Netflix uses health checks (ELB) for server-level failures + Hystrix circuit breakers for endpoint-level failures. Health checks detect crashed servers (remove from LB). Circuit breakers detect slow APIs (fast-fail, don't wait for timeout)."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Complete Health Check System

```python
import time
import requests
from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Optional

class HealthStatus(Enum):
    UNKNOWN = "unknown"
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DRAINING = "draining"

@dataclass
class ServerHealth:
    server_id: str
    status: HealthStatus
    consecutive_failures: int
    consecutive_successes: int
    last_check_time: float
    last_check_result: str
    response_time_ms: Optional[float]
    total_checks: int
    total_failures: int

class HealthChecker:
    def __init__(self, config):
        self.interval = config['interval']  # 10 seconds
        self.timeout = config['timeout']    # 5 seconds
        self.unhealthy_threshold = config['unhealthy_threshold']  # 3
        self.healthy_threshold = config['healthy_threshold']      # 2
        self.endpoint = config['endpoint']  # /health
        
        self.servers = {}  # server_id → ServerHealth
    
    def start(self, servers: List[str]):
        """Start health check worker for all servers"""
        for server_id in servers:
            self.servers[server_id] = ServerHealth(
                server_id=server_id,
                status=HealthStatus.UNKNOWN,
                consecutive_failures=0,
                consecutive_successes=0,
                last_check_time=0,
                last_check_result="",
                response_time_ms=None,
                total_checks=0,
                total_failures=0
            )
        
        # Start health check loop
        while True:
            self.check_all_servers()
            time.sleep(self.interval)
    
    def check_all_servers(self):
        """Check health of all servers"""
        for server_id, health in self.servers.items():
            if health.status == HealthStatus.DRAINING:
                # Skip health checks for draining servers
                continue
            
            self.check_server(server_id)
    
    def check_server(self, server_id: str):
        """Perform health check on single server"""
        health = self.servers[server_id]
        url = f"http://{server_id}{self.endpoint}"
        
        start_time = time.time()
        
        try:
            # Send health check request
            response = requests.get(url, timeout=self.timeout)
            response_time_ms = (time.time() - start_time) * 1000
            
            if response.status_code == 200:
                # Success
                self.on_check_success(server_id, response_time_ms)
            else:
                # Failure (wrong status code)
                self.on_check_failure(server_id, f"HTTP {response.status_code}")
        
        except requests.Timeout:
            # Timeout
            self.on_check_failure(server_id, "timeout")
        
        except requests.ConnectionError:
            # Connection refused
            self.on_check_failure(server_id, "connection refused")
        
        except Exception as e:
            # Other error
            self.on_check_failure(server_id, str(e))
        
        finally:
            health.total_checks += 1
            health.last_check_time = time.time()
    
    def on_check_success(self, server_id: str, response_time_ms: float):
        """Handle successful health check"""
        health = self.servers[server_id]
        
        health.consecutive_failures = 0
        health.consecutive_successes += 1
        health.last_check_result = "success"
        health.response_time_ms = response_time_ms
        
        # Check if should mark healthy
        if health.status != HealthStatus.HEALTHY:
            if health.consecutive_successes >= self.healthy_threshold:
                self.mark_healthy(server_id)
    
    def on_check_failure(self, server_id: str, reason: str):
        """Handle failed health check"""
        health = self.servers[server_id]
        
        health.consecutive_successes = 0
        health.consecutive_failures += 1
        health.last_check_result = reason
        health.response_time_ms = None
        health.total_failures += 1
        
        # Check if should mark unhealthy
        if health.status != HealthStatus.UNHEALTHY:
            if health.consecutive_failures >= self.unhealthy_threshold:
                self.mark_unhealthy(server_id)
    
    def mark_healthy(self, server_id: str):
        """Mark server as healthy"""
        health = self.servers[server_id]
        health.status = HealthStatus.HEALTHY
        
        print(f"✅ Server {server_id} marked HEALTHY "
              f"(after {health.consecutive_successes} consecutive successes)")
        
        # Notify load balancer to add server to pool
        self.notify_lb_add_server(server_id)
    
    def mark_unhealthy(self, server_id: str):
        """Mark server as unhealthy"""
        health = self.servers[server_id]
        health.status = HealthStatus.UNHEALTHY
        
        print(f"❌ Server {server_id} marked UNHEALTHY "
              f"(after {health.consecutive_failures} consecutive failures, "
              f"reason: {health.last_check_result})")
        
        # Notify load balancer to remove server from pool
        self.notify_lb_remove_server(server_id)
    
    def mark_draining(self, server_id: str):
        """Mark server as draining (graceful shutdown)"""
        health = self.servers[server_id]
        health.status = HealthStatus.DRAINING
        
        print(f"⚠️ Server {server_id} marked DRAINING "
              f"(will not receive new connections)")
        
        # Notify load balancer to stop new connections
        self.notify_lb_drain_server(server_id)
    
    def get_healthy_servers(self) -> List[str]:
        """Get list of healthy servers"""
        return [
            server_id for server_id, health in self.servers.items()
            if health.status == HealthStatus.HEALTHY
        ]
    
    def get_server_health(self, server_id: str) -> ServerHealth:
        """Get health status of server"""
        return self.servers.get(server_id)
    
    def notify_lb_add_server(self, server_id: str):
        """Notify load balancer to add server to pool"""
        # Implementation depends on LB (API call, file update, etc.)
        pass
    
    def notify_lb_remove_server(self, server_id: str):
        """Notify load balancer to remove server from pool"""
        pass
    
    def notify_lb_drain_server(self, server_id: str):
        """Notify load balancer to drain server"""
        pass

# Usage
config = {
    'interval': 10,          # Check every 10 seconds
    'timeout': 5,            # Wait max 5 seconds
    'unhealthy_threshold': 3,  # 3 failures → unhealthy
    'healthy_threshold': 2,    # 2 successes → healthy
    'endpoint': '/health'
}

checker = HealthChecker(config)
checker.start(servers=[
    "10.0.1.10:8080",
    "10.0.1.11:8080",
    "10.0.1.12:8080"
])
```

### Health Check State Machine Diagram

```
┌────────────────────────────────────────────────────────────┐
│              HEALTH CHECK STATE MACHINE                     │
└────────────────────────────────────────────────────────────┘

                    Initial State
                         │
                         ↓
                   ┌───────────┐
                   │  UNKNOWN  │
                   └─────┬─────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
     Success                           Failure
        │                                 │
        ↓                                 ↓
  (1 success)                      (1 failure)
        │                                 │
        ↓                                 ↓
    Success                           Failure
        │                                 │
        ↓                                 ↓
  (2 consecutive successes)        (2 consecutive failures)
        │                                 │
        ↓                                 │
  ┌───────────┐                          │
  │  HEALTHY  │◄─────────────────────────┘
  │ (traffic) │                    (not enough failures yet)
  └─────┬─────┘
        │
        │ Failure
        ↓
  (1 failure, but still HEALTHY)
        │
        │ Failure
        ↓
  (2 consecutive failures, but still HEALTHY)
        │
        │ Failure
        ↓
  (3 consecutive failures)
        │
        ↓
  ┌────────────┐
  │ UNHEALTHY  │
  │ (no traffic)│
  └──────┬─────┘
         │
         │ Success
         ↓
  (1 success, but still UNHEALTHY)
         │
         │ Success
         ↓
  (2 consecutive successes)
         │
         ↓
  ┌───────────┐
  │  HEALTHY  │
  │ (traffic) │
  └───────────┘


TRANSITIONS:
UNKNOWN → HEALTHY: 2 consecutive successes
UNKNOWN → UNHEALTHY: 3 consecutive failures
HEALTHY → UNHEALTHY: 3 consecutive failures
UNHEALTHY → HEALTHY: 2 consecutive successes

TRAFFIC ROUTING:
HEALTHY: Receives traffic ✅
UNHEALTHY: No traffic ❌
DRAINING: No NEW traffic, existing connections complete ⚠️
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Health Checks Are Critical

**Without Health Checks**:
```
Server crashes → Load balancer continues routing traffic → 50% requests fail
Poor user experience, potential revenue loss
```

**With Health Checks**:
```
Server crashes → Health check detects → LB removes server → 100% requests succeed
Automatic failover, transparent to users
```

### How Health Checks Work

**3-Step Process**:

1. **Periodic Checks**: LB sends request to /health endpoint every 10-30 seconds
2. **State Tracking**: Count consecutive failures/successes
3. **Action**: After N failures → remove server, after M successes → re-add server

**Configuration**:
```yaml
interval: 10s              # Check every 10 seconds
timeout: 5s                # Wait max 5 seconds
unhealthy_threshold: 3     # 3 consecutive failures → unhealthy
healthy_threshold: 2       # 2 consecutive successes → healthy
```

### When to Implement

**Always use health checks for**:
- Load-balanced applications (multiple servers)
- High availability requirements (99.9%+ uptime)
- Autoscaling environments (servers come and go)

**Health check types by use case**:
- **TCP**: Databases, message queues (non-HTTP services)
- **HTTP**: Web services, REST APIs (application-level validation)
- **Custom**: Mission-critical systems (check all dependencies)

### Trade-offs

| Aspect | TCP Check | HTTP Check | Custom Check |
|--------|-----------|------------|--------------|
| **Speed** | ⭐⭐⭐⭐⭐ Fast (1-10ms) | ⭐⭐⭐⭐ Good (10-50ms) | ⭐⭐ Slow (50-200ms) |
| **Depth** | ⭐ Shallow (port open) | ⭐⭐⭐ Medium (HTTP working) | ⭐⭐⭐⭐⭐ Comprehensive (all deps) |
| **Complexity** | ⭐ Simple | ⭐⭐ Medium | ⭐⭐⭐⭐ Complex |
| **Use For** | Databases, internal | Web services, APIs | Critical systems |

### Production Checklist

- [ ] **Configure health checks**:
  - Interval: 10-30 seconds (balance detection vs overhead)
  - Timeout: 5 seconds (long enough to avoid false positives)
  - Unhealthy threshold: 3 (avoid false positives from network hiccups)
  - Healthy threshold: 2 (recover quickly when server back online)

- [ ] **Implement /health endpoint**:
  ```python
  @app.route('/health')
  def health():
      if db.ping() and redis.ping():
          return {"status": "healthy"}, 200
      else:
          return {"status": "unhealthy"}, 503
  ```

- [ ] **Monitor health check metrics**:
  - Track success/failure rate per server
  - Alert on frequent flapping (healthy → unhealthy → healthy rapidly)
  - Monitor health check latency (increasing latency = server degrading)

- [ ] **Security**:
  - Minimal information in public /health endpoint
  - Detailed /health/detailed with authentication
  - Rate limit health endpoint (prevent DoS)

- [ ] **Handle failures gracefully**:
  - Multiple consecutive failures before marking unhealthy (avoid false positives)
  - Connection draining when removing servers (graceful shutdown)
  - Auto-recovery when servers become healthy again

### Bottom Line

**Health checks are essential for high availability. Always configure them for load-balanced applications. Use HTTP health checks (not just TCP) to validate application-level health.**

**The cost is minimal** (< 0.1% overhead), **but the benefit is enormous** (automatic failover, no manual intervention when servers crash).

**Real-world lesson from AWS**: "Misconfigured health checks are the #1 cause of self-inflicted outages. Too aggressive (1-second timeout, 1-failure threshold) → false positives → all servers removed → complete outage. Start with conservative settings (5-second timeout, 3-failure threshold) and tune based on metrics."

