# 111. Retry Strategies

## 📌 Overview

**Retry strategies** are mechanisms to automatically retry failed operations, handling transient failures without human intervention.

**Key principle**: Many failures are temporary (network blips, server overload). Retrying often succeeds.

---

## 🎯 Why Retries?

### **Transient vs Permanent Failures**

```
Transient Failures (Retry Can Help):
├─ Network timeout (packet lost)
├─ Server temporarily overloaded (503)
├─ Database connection pool exhausted
├─ Temporary DNS resolution failure
└─ Brief service degradation

Permanent Failures (Retry Won't Help):
├─ 404 Not Found (resource doesn't exist)
├─ 401 Unauthorized (invalid credentials)
├─ 400 Bad Request (malformed input)
├─ Database constraint violation
└─ Out of disk space
```

---

## 🛠️ Basic Retry Pattern

### **Simple Retry**

```python
def call_api_with_retry(url, max_retries=3):
    """Retry on failure, up to max_retries"""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return response.json()  # Success ✓
        except requests.RequestException as e:
            if attempt == max_retries - 1:
                # Last attempt failed
                raise Exception(f"Failed after {max_retries} attempts: {e}")
            
            print(f"Attempt {attempt + 1} failed: {e}. Retrying...")
            time.sleep(1)  # Wait before retry

# Usage
try:
    data = call_api_with_retry('https://api.example.com/data')
    print(f"Success: {data}")
except Exception as e:
    print(f"All retries failed: {e}")
```

---

## 🎯 Retry Strategies

### **1. Immediate Retry**

```python
# Retry immediately without delay
for attempt in range(3):
    try:
        return api_call()
    except Exception:
        if attempt == 2:
            raise
        continue  # Retry immediately

Pros: Fastest recovery (if transient failure)
Cons: Can overwhelm already-struggling server
```

### **2. Fixed Delay Retry**

```python
# Wait fixed time between retries
def retry_fixed_delay(func, max_retries=3, delay=1):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(delay)  # Fixed 1-second delay

Pros: Gives server time to recover
Cons: Doesn't adapt to severity
```

### **3. Exponential Backoff** ⭐ (Recommended)

```python
# Double delay each retry: 1s, 2s, 4s, 8s...
def retry_exponential_backoff(func, max_retries=5, base_delay=1):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            
            # Exponential backoff: 2^attempt * base_delay
            delay = (2 ** attempt) * base_delay
            print(f"Retry {attempt + 1} after {delay}s")
            time.sleep(delay)

# Example timing:
# Attempt 1: Immediate
# Attempt 2: Wait 1s (2^0 * 1)
# Attempt 3: Wait 2s (2^1 * 1)
# Attempt 4: Wait 4s (2^2 * 1)
# Attempt 5: Wait 8s (2^3 * 1)

Pros: Backs off gracefully, reduces load on struggling server
Cons: Slower recovery for quick transients
```

### **4. Exponential Backoff with Jitter** ⭐⭐ (Best Practice)

```python
import random

def retry_with_jitter(func, max_retries=5, base_delay=1, max_delay=60):
    """
    Exponential backoff with random jitter
    Prevents thundering herd (many clients retrying simultaneously)
    """
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            
            # Exponential backoff with jitter
            exponential_delay = min((2 ** attempt) * base_delay, max_delay)
            jitter = random.uniform(0, exponential_delay)
            delay = exponential_delay + jitter
            
            print(f"Retry {attempt + 1} after {delay:.2f}s")
            time.sleep(delay)

# Example timing (with jitter):
# Attempt 1: Immediate
# Attempt 2: Wait 0.5-1.5s (1s ± jitter)
# Attempt 3: Wait 1.8-2.2s (2s ± jitter)
# Attempt 4: Wait 3.5-4.5s (4s ± jitter)
# Attempt 5: Wait 7-9s (8s ± jitter)

Pros: Avoids thundering herd, spreads retries over time
Cons: Slightly more complex
```

---

## 🎯 Intelligent Retry Decisions

### **Retry Only Idempotent Operations**

```python
# Safe to retry (idempotent)
def get_user(user_id):
    return requests.get(f'/users/{user_id}')  # GET is idempotent ✓

# Unsafe to retry (not idempotent)
def create_order(order_data):
    return requests.post('/orders', json=order_data)  # POST creates duplicate ❌

# Make POST idempotent with idempotency key
def create_order_idempotent(order_data, idempotency_key):
    headers = {'Idempotency-Key': idempotency_key}
    return requests.post('/orders', json=order_data, headers=headers)  # ✓
```

### **Retry Based on Error Type**

```python
def should_retry(exception):
    """Decide if error is retryable"""
    # Retry on transient errors
    if isinstance(exception, requests.Timeout):
        return True  # Network timeout
    if isinstance(exception, requests.ConnectionError):
        return True  # Connection failed
    if hasattr(exception, 'response'):
        status_code = exception.response.status_code
        if status_code == 429:  # Rate limit
            return True
        if status_code in [500, 502, 503, 504]:  # Server errors
            return True
        if status_code in [400, 401, 403, 404]:  # Client errors
            return False  # Don't retry (permanent failure)
    return False

def smart_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if not should_retry(e) or attempt == max_retries - 1:
                raise  # Don't retry or last attempt
            
            delay = 2 ** attempt
            print(f"Retrying after {delay}s due to: {e}")
            time.sleep(delay)
```

### **Retry with Circuit Breaker**

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure_time = None
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func):
        if self.state == 'OPEN':
            # Circuit open, check if timeout passed
            if time.time() - self.last_failure_time > self.timeout:
                self.state = 'HALF_OPEN'
            else:
                raise CircuitOpenError("Circuit breaker is open")
        
        try:
            result = func()
            # Success → reset
            self.failure_count = 0
            if self.state == 'HALF_OPEN':
                self.state = 'CLOSED'
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = 'OPEN'
                print(f"Circuit breaker opened after {self.failure_count} failures")
            
            raise

# Usage
breaker = CircuitBreaker(failure_threshold=5, timeout=60)

def call_with_circuit_breaker():
    try:
        return breaker.call(lambda: requests.get('https://api.example.com'))
    except CircuitOpenError:
        return cached_response()  # Fallback
```

---

## 🎯 Real-World Examples

### **1. AWS SDK Retry**

```python
import boto3
from botocore.config import Config

# AWS SDK built-in retry (exponential backoff with jitter)
config = Config(
    retries={
        'max_attempts': 5,
        'mode': 'adaptive'  # Adaptive retry mode
    }
)

s3 = boto3.client('s3', config=config)

# Automatically retries on:
# - Connection errors
# - 5xx server errors
# - Throttling errors (429)
s3.put_object(Bucket='my-bucket', Key='file.txt', Body=data)
```

### **2. Stripe API Retry**

```python
import stripe

stripe.api_key = 'sk_test_...'
stripe.max_network_retries = 2  # Retry twice on network error

# Stripe automatically retries on:
# - Network failures
# - 409 Conflict (idempotent request)
# - 5xx server errors

charge = stripe.Charge.create(
    amount=2000,
    currency='usd',
    source='tok_visa',
    idempotency_key='unique-key-123'  # Prevents duplicate charges
)
```

### **3. Kubernetes Pod Restart**

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    restartPolicy: OnFailure  # Retry on crash
    
    # Exponential backoff: 10s, 20s, 40s, 80s, 160s (max 5 min)
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 10
      failureThreshold: 3  # Retry 3 times before restart
```

---

## ✅ Retry Best Practices

### **1. Set Maximum Retry Limit**

```python
# Bad: Infinite retries
while True:
    try:
        return api_call()
    except Exception:
        time.sleep(1)  # Retry forever ❌

# Good: Limited retries
max_retries = 5
for attempt in range(max_retries):
    try:
        return api_call()
    except Exception:
        if attempt == max_retries - 1:
            raise  # Give up after 5 attempts ✓
```

### **2. Log Retry Attempts**

```python
def retry_with_logging(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = func()
            if attempt > 0:
                logger.info(f"Succeeded on attempt {attempt + 1}")
            return result
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                logger.error(f"All {max_retries} attempts failed")
                raise
            time.sleep(2 ** attempt)
```

### **3. Add Timeout to Prevent Hanging**

```python
def retry_with_timeout(func, max_retries=3, timeout=5):
    for attempt in range(max_retries):
        try:
            # Set timeout for each attempt
            response = requests.get(url, timeout=timeout)
            return response.json()
        except requests.Timeout:
            if attempt == max_retries - 1:
                raise TimeoutError(f"Timeout after {max_retries} attempts")
            time.sleep(2 ** attempt)
```

### **4. Use Libraries**

```python
# tenacity library (recommended)
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=60)
)
def api_call():
    response = requests.get('https://api.example.com')
    response.raise_for_status()
    return response.json()

# Automatically retries with exponential backoff
data = api_call()
```

---

## ⚠️ Retry Pitfalls

### **1. Thundering Herd**

```
Problem: 1000 clients retry at same time

Time 0s: Server overloaded, returns 503
Time 1s: All 1000 clients retry simultaneously
       → Server even more overloaded ❌

Solution: Jitter (randomize retry timing)
Time 1s: Clients retry between 0.5-1.5s (spread out) ✓
```

### **2. Retry Amplification**

```
Client → Service A → Service B → Service C

Client retries 3x:
Service A calls Service B (3x)
Service B calls Service C (3x per A call = 9x)

Total: 3 × 3 × 3 = 27 calls to Service C ❌

Solution: Set global retry budget, don't retry internal calls
```

### **3. Non-Idempotent Operations**

```
POST /orders (create order)
Retry 1: Order created (order_id = 123)
Retry 2: Duplicate order created (order_id = 124) ❌

Solution: Use idempotency key
POST /orders (Idempotency-Key: abc-123)
Retry 1: Order created (order_id = 123)
Retry 2: Returns existing order (order_id = 123) ✓
```

---

## 🎓 Interview Tips

**Q: "What is a retry strategy and when should you use it?"**

A: "Retry strategy automatically retries failed operations. Use for transient failures (network timeout, server overload).

When to retry:
- **Transient errors**: Timeout, connection error, 5xx server errors, rate limit (429)
- **Idempotent operations**: GET, PUT, DELETE (safe to repeat)

When NOT to retry:
- **Permanent errors**: 404 Not Found, 401 Unauthorized, 400 Bad Request
- **Non-idempotent**: POST (creates duplicate) unless using idempotency key

Example: API call times out. Retry with exponential backoff: 1s, 2s, 4s. If all fail, give up and alert."

**Q: "What is exponential backoff and why use it?"**

A: "Exponential backoff doubles delay between retries: 1s, 2s, 4s, 8s...

Why:
- Gives server time to recover (don't overwhelm struggling server)
- Reduces load during outages (spread retries over time)
- Industry standard (AWS, Google, Stripe all use it)

With jitter (random delay) prevents thundering herd:
- Without jitter: 1000 clients retry at exactly 1s → spike
- With jitter: Retry between 0.5-1.5s → spread out

Implementation: `delay = (2 ** attempt) * base_delay + random(0, jitter)`"

**Q: "How do you prevent retry amplification in microservices?"**

A: "Problem: Client retries 3x → ServiceA retries 3x → ServiceB retries 3x = 27x amplification

Solutions:
1. **Retry budget**: Total retries across all services ≤ N (e.g., 5 total)
2. **Header propagation**: Pass `X-Retry-Count` header, limit total retries
3. **No internal retries**: Only client/entry point retries, internal calls fail fast
4. **Circuit breaker**: Stop retrying after threshold (don't spam failing service)

Best practice: Client retries + circuit breaker, internal services fail fast."

---

## 🔗 Related Topics
- **112. Exponential Backoff** - Retry timing
- **113. Timeouts** - Prevent hanging retries
- **114. Circuit Breaker** - Stop retrying failing service
- **101. Idempotency** - Safe retries

---

## 📚 Summary

**Retry Strategies**: Automatically retry failed operations

**When**: Transient errors (timeout, 5xx), idempotent operations

**Best Strategy**: Exponential backoff with jitter (prevents thundering herd)

**Pitfalls**: Non-idempotent operations, retry amplification, infinite retries

**Best Practice**: Use library (tenacity), log retries, set max attempts 🚀
