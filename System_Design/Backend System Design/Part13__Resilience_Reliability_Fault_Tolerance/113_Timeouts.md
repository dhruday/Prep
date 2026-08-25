# 113. Timeouts

## 📌 Overview

**Timeout** is the maximum time to wait for an operation to complete before giving up.

**Why critical**: Without timeouts, slow operations can **hang forever**, exhausting resources and causing cascading failures.

```python
# Without timeout (DANGEROUS)
response = requests.get('https://slow-api.com')  # Waits forever ❌

# With timeout (SAFE)
response = requests.get('https://slow-api.com', timeout=5)  # Max 5s ✓
```

---

## 🎯 Why Timeouts?

### **Problem: Hanging Requests**

```
Scenario: Database query slow (network issue)

Without Timeout:
Request 1: Waits forever (blocks thread)
Request 2: Waits forever (blocks thread)
Request 3: Waits forever (blocks thread)
...
Thread pool: All 100 threads blocked ❌
New requests: Rejected (no available threads)
Result: SYSTEM DOWN

With Timeout (5 seconds):
Request 1: Times out after 5s (releases thread)
Request 2: Times out after 5s (releases thread)
Thread pool: Threads recycled ✓
New requests: Served (some fail fast, but system alive)
Result: GRACEFUL DEGRADATION
```

---

## 🎯 Types of Timeouts

### **1. Connection Timeout**

**Definition**: Max time to **establish connection** (TCP handshake).

```python
import requests

# Connection timeout: 3 seconds
# If can't connect in 3s, give up
response = requests.get(
    'https://api.example.com',
    timeout=(3, 30)  # (connect_timeout, read_timeout)
)

# Typical values:
# - Fast network (LAN): 1-2s
# - Internet: 3-5s
# - Slow network: 10s
```

**When it triggers**:
- Server unreachable
- DNS resolution slow
- Network routing issue
- Firewall blocking

### **2. Read Timeout (Socket Timeout)**

**Definition**: Max time to **wait for data** after connection established.

```python
# Read timeout: 30 seconds
# After connected, wait max 30s for response
response = requests.get(
    'https://api.example.com',
    timeout=(3, 30)
)

# Typical values:
# - Fast API: 5-10s
# - Slow API (complex query): 30-60s
# - Background job: 300s (5 min)
```

**When it triggers**:
- Server processing slow
- Large response downloading
- Server hung/deadlocked
- Network congestion

### **3. Total Timeout (End-to-End)**

**Definition**: Max time for **entire request** (connection + read + processing).

```python
import requests
from requests.adapters import HTTPAdapter, Retry
from requests.packages.urllib3.util.retry import Retry

session = requests.Session()
adapter = HTTPAdapter(
    max_retries=Retry(
        total=3,
        backoff_factor=0.5
    )
)
session.mount('http://', adapter)
session.mount('https://', adapter)

# Total timeout: 60 seconds (including retries)
start = time.time()
try:
    response = session.get('https://api.example.com', timeout=10)
    elapsed = time.time() - start
    if elapsed > 60:
        raise TimeoutError("Total timeout exceeded")
except Exception as e:
    print(f"Failed after {time.time() - start}s: {e}")
```

### **4. Idle Timeout (Keep-Alive)**

**Definition**: Max time connection can stay **idle** (no data sent/received).

```python
# HTTP Keep-Alive timeout
# Close connection if idle for 300s (5 min)
response = requests.get(
    'https://api.example.com',
    headers={'Keep-Alive': 'timeout=300'}
)

# Typical values:
# - Nginx: 75s
# - Apache: 5s
# - AWS ALB: 60s
```

---

## 🛠️ Timeout Implementation

### **Python: requests Library**

```python
import requests
from requests.exceptions import Timeout, ConnectTimeout, ReadTimeout

try:
    # Tuple: (connect_timeout, read_timeout)
    response = requests.get(
        'https://api.example.com/data',
        timeout=(5, 30)  # 5s connect, 30s read
    )
    print(response.json())
    
except ConnectTimeout:
    print("Connection timeout: Could not connect within 5s")
    
except ReadTimeout:
    print("Read timeout: No response within 30s")
    
except Timeout:
    print("Generic timeout")
```

### **Python: httpx (Modern Alternative)**

```python
import httpx

# Per-request timeout
with httpx.Client() as client:
    response = client.get(
        'https://api.example.com',
        timeout=10.0  # Total timeout: 10s
    )

# Detailed timeout configuration
timeout = httpx.Timeout(
    connect=5.0,    # Connection timeout
    read=30.0,      # Read timeout
    write=10.0,     # Write timeout
    pool=5.0        # Pool timeout
)

with httpx.Client(timeout=timeout) as client:
    response = client.get('https://api.example.com')
```

### **JavaScript: fetch with AbortController**

```javascript
// Fetch with timeout
async function fetchWithTimeout(url, timeout = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error(`Timeout after ${timeout}ms`);
        }
        throw error;
    }
}

// Usage
try {
    const data = await fetchWithTimeout('https://api.example.com', 5000);
    console.log(data);
} catch (error) {
    console.error('Request failed:', error.message);
}
```

### **Java: OkHttp**

```java
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import java.util.concurrent.TimeUnit;

// Configure timeouts
OkHttpClient client = new OkHttpClient.Builder()
    .connectTimeout(5, TimeUnit.SECONDS)   // Connection timeout
    .readTimeout(30, TimeUnit.SECONDS)     // Read timeout
    .writeTimeout(10, TimeUnit.SECONDS)    // Write timeout
    .callTimeout(60, TimeUnit.SECONDS)     // Total timeout
    .build();

// Make request
Request request = new Request.Builder()
    .url("https://api.example.com/data")
    .build();

try (Response response = client.newCall(request).execute()) {
    System.out.println(response.body().string());
} catch (SocketTimeoutException e) {
    System.err.println("Timeout: " + e.getMessage());
}
```

---

## 🎯 Tuning Timeouts

### **Based on Latency (p99)**

```python
# Step 1: Measure latency
latencies = [0.1, 0.2, 0.15, 0.3, 0.5, 1.2, 0.8, ...]  # seconds

# Step 2: Calculate p99 (99th percentile)
p99 = sorted(latencies)[int(len(latencies) * 0.99)]
print(f"p99 latency: {p99}s")

# Step 3: Set timeout = p99 × safety factor
timeout = p99 * 1.5  # 1.5x safety margin
print(f"Recommended timeout: {timeout}s")

# Example:
# p99 = 2s
# timeout = 2 × 1.5 = 3s

# This ensures 99% of requests complete, 1% timeout
```

### **Too Short vs Too Long**

```python
# Timeout Too Short (1s, but p99 = 2s)
timeout = 1  # ❌

Result:
- Many healthy requests timeout (false failures)
- Users see errors even when server working
- Poor user experience

# Timeout Too Long (60s, but p99 = 2s)
timeout = 60  # ❌

Result:
- Slow failure detection (hang for 60s)
- Thread pool exhaustion (threads blocked long)
- Cascading failures

# Timeout Just Right (3s, p99 = 2s)
timeout = p99 * 1.5  # ✓

Result:
- 99% of requests complete
- 1% timeout quickly (3s)
- Fast failure recovery
```

### **Adaptive Timeouts**

```python
class AdaptiveTimeout:
    """Adjust timeout based on observed latency"""
    
    def __init__(self, initial_timeout=5, window_size=100):
        self.latencies = []
        self.window_size = window_size
        self.timeout = initial_timeout
    
    def record_latency(self, latency):
        """Record request latency"""
        self.latencies.append(latency)
        if len(self.latencies) > self.window_size:
            self.latencies.pop(0)  # Keep last N
        
        # Recalculate timeout
        if len(self.latencies) >= 10:
            p99 = sorted(self.latencies)[int(len(self.latencies) * 0.99)]
            self.timeout = p99 * 1.5  # 1.5x safety margin
    
    def get_timeout(self):
        """Get current timeout"""
        return self.timeout

# Usage
adaptive = AdaptiveTimeout()

for _ in range(1000):
    start = time.time()
    try:
        response = requests.get(
            'https://api.example.com',
            timeout=adaptive.get_timeout()
        )
        latency = time.time() - start
        adaptive.record_latency(latency)
    except Timeout:
        print(f"Timeout after {adaptive.get_timeout()}s")
```

---

## 🎯 Cascading Timeouts

### **Problem: Equal Timeouts**

```
Client (timeout: 10s)
  → Service A (timeout: 10s)
    → Service B (timeout: 10s)

Problem: Race condition

Time 0s:  Client calls Service A
Time 0s:  Service A calls Service B
Time 10s: Service B times out
Time 10s: Service A times out (simultaneously!)
Time 10s: Client times out (simultaneously!)

Result: Unclear which timed out first ❌
```

### **Solution: Decreasing Timeouts**

```
Client (timeout: 10s)
  → Service A (timeout: 8s)
    → Service B (timeout: 6s)

Correct behavior:

Time 0s:  Client calls Service A
Time 0s:  Service A calls Service B
Time 6s:  Service B times out ✓
Time 6.1s: Service A returns error to Client ✓
Time 6.2s: Client receives error ✓

Result: Clear timeout order, graceful error propagation
```

### **Implementation**

```python
def call_with_timeout_budget(url, timeout_budget):
    """
    Pass remaining timeout to downstream service
    """
    start = time.time()
    
    # Reserve some time for overhead (e.g., 10%)
    overhead = timeout_budget * 0.1
    downstream_timeout = timeout_budget - overhead
    
    try:
        response = requests.get(
            url,
            timeout=downstream_timeout,
            headers={
                'X-Timeout-Budget': str(downstream_timeout)
            }
        )
        elapsed = time.time() - start
        remaining = timeout_budget - elapsed
        
        if remaining < 0:
            raise TimeoutError("Timeout budget exceeded")
        
        return response.json(), remaining
        
    except Timeout:
        raise TimeoutError(f"Service timeout ({downstream_timeout}s)")

# Client
def client_request():
    timeout_budget = 10  # Client has 10s total
    
    # Call Service A (8s budget)
    data_a, remaining = call_with_timeout_budget(
        'https://service-a.com',
        timeout_budget * 0.8
    )
    
    # Call Service B with remaining budget
    data_b, _ = call_with_timeout_budget(
        'https://service-b.com',
        remaining
    )
    
    return {'a': data_a, 'b': data_b}
```

---

## 🎯 Real-World Examples

### **1. Netflix: Hystrix Timeout**

```java
@HystrixCommand(
    commandProperties = {
        @HystrixProperty(
            name = "execution.isolation.thread.timeoutInMilliseconds",
            value = "3000"  // 3 second timeout
        )
    },
    fallbackMethod = "fallback"
)
public String callService() {
    // Call external service
    return restTemplate.getForObject("https://api.example.com", String.class);
}

public String fallback() {
    return "Service unavailable (timeout)";
}
```

### **2. AWS: ALB Timeout**

```yaml
# Application Load Balancer
Timeout Settings:
  idle_timeout: 60s          # Connection idle timeout
  target_response_timeout: 30s  # Backend response timeout

# If backend doesn't respond in 30s:
# → ALB returns 504 Gateway Timeout
```

### **3. Kubernetes: Liveness Probe**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
      timeoutSeconds: 3      # Timeout for health check
      failureThreshold: 3    # Restart after 3 timeouts
```

### **4. Database: Query Timeout**

```python
import psycopg2

# PostgreSQL query timeout
conn = psycopg2.connect(
    "dbname=mydb user=postgres",
    connect_timeout=5,  # Connection timeout
    options="-c statement_timeout=30000"  # Query timeout: 30s
)

try:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM large_table WHERE expensive_condition")
except psycopg2.extensions.QueryCanceledError:
    print("Query timeout: exceeded 30s")
```

---

## ✅ Best Practices

### **1. Always Set Timeouts**

```python
# Bad: No timeout
response = requests.get('https://api.example.com')  # Hangs forever ❌

# Good: With timeout
response = requests.get('https://api.example.com', timeout=10)  # ✓
```

### **2. Separate Connect and Read Timeouts**

```python
# Good: Different timeouts for connect and read
response = requests.get(
    'https://api.example.com',
    timeout=(5, 30)  # 5s connect, 30s read ✓
)
```

### **3. Use Retry with Timeout**

```python
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10)
)
def call_api():
    return requests.get(
        'https://api.example.com',
        timeout=(5, 30)  # Timeout on each attempt
    )
```

### **4. Log Timeouts**

```python
import logging

try:
    response = requests.get('https://api.example.com', timeout=10)
except Timeout as e:
    logging.error(f"Timeout after 10s: {e}")
    # Fallback or retry
```

### **5. Monitor Timeout Rate**

```python
# Metrics
timeout_count = 0
total_requests = 0

def call_with_metrics(url, timeout=10):
    global timeout_count, total_requests
    total_requests += 1
    
    try:
        return requests.get(url, timeout=timeout)
    except Timeout:
        timeout_count += 1
        timeout_rate = timeout_count / total_requests
        
        if timeout_rate > 0.05:  # >5% timeout rate
            logging.warning(f"High timeout rate: {timeout_rate:.1%}")
        
        raise
```

---

## ⚠️ Common Mistakes

### **1. No Timeout (Hangs Forever)**

```python
# ❌ Dangerous: No timeout
response = requests.get('https://api.example.com')
```

### **2. Timeout Too Long**

```python
# ❌ Timeout 5 minutes (blocks thread too long)
response = requests.get('https://api.example.com', timeout=300)
```

### **3. Ignoring Timeout Errors**

```python
# ❌ Swallow timeout errors
try:
    response = requests.get('https://api.example.com', timeout=5)
except:
    pass  # Silent failure

# ✓ Handle timeout properly
try:
    response = requests.get('https://api.example.com', timeout=5)
except Timeout:
    return cached_response()  # Fallback
```

---

## 🎓 Interview Tips

**Q: "What is a timeout and why is it important?"**

A: "Timeout is maximum wait time for operation. Critical for:

1. **Prevent hanging**: Without timeout, slow operations hang forever
2. **Resource exhaustion**: Hanging requests block threads → thread pool exhausted
3. **Cascading failures**: Slow downstream service blocks upstream

Types:
- **Connection timeout**: Max time to establish connection (5s typical)
- **Read timeout**: Max time to receive data (30s typical)
- **Total timeout**: Max time for entire request

Example: Database query slow. With 30s timeout, release thread after 30s. Without timeout, thread blocked forever → system down.

Always set timeouts! `requests.get(url, timeout=10)`"

**Q: "How do you tune timeout values?"**

A: "Based on latency percentiles:

1. **Measure latency**: Track request times
2. **Calculate p99**: 99th percentile (99% complete below this)
3. **Set timeout**: p99 × 1.5 (safety margin)

Example:
- p99 latency = 2s
- Timeout = 2 × 1.5 = 3s
- Result: 99% succeed, 1% timeout (fast failure)

Too short: False failures (healthy requests timeout)
Too long: Slow detection (hang too long)

Adaptive: Adjust based on recent latency (recalculate p99 periodically)"

**Q: "What are cascading timeouts?"**

A: "Timeouts across multiple services should **decrease** downstream:

Client (10s) → Service A (8s) → Service B (6s)

Why:
- Prevent race conditions (who timed out?)
- Allow error propagation (downstream timeout first)
- Reserve time for overhead (processing, network)

Formula: `downstream_timeout = upstream_timeout × 0.8`

Bad example (equal timeouts):
Client (10s) → Service A (10s) → Service B (10s)
All timeout simultaneously → unclear who failed ❌

Good example (decreasing):
Client (10s) → Service A (8s) → Service B (6s)
Service B times out → A returns error → Client receives error ✓"

---

## 📚 Summary

**Timeout**: Max wait time before giving up

**Types**: Connection (5s), Read (30s), Total (60s), Idle (300s)

**Why Critical**: Prevent hanging, resource exhaustion, cascading failures

**Tuning**: timeout = p99_latency × 1.5 (safety margin)

**Cascading**: Decrease downstream (Client 10s → Service A 8s → Service B 6s)

**Best Practice**: Always set timeouts, monitor timeout rate, use fallback 🚀
