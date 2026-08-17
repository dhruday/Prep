# 114. Circuit Breaker Pattern

## 📌 Overview

**Circuit Breaker** prevents repeated calls to a failing service by "opening the circuit" and failing fast.

**Like electrical circuit breaker**: Trips when overloaded, preventing damage.

```
Normal (Closed) → Service working, requests pass through
Failing (Open)  → Service down, block all requests (fail fast)
Testing (Half-Open) → Test if service recovered
```

---

## 🎯 Why Circuit Breaker?

### **Problem: Cascading Failures**

```
Scenario: Payment service down

Without Circuit Breaker:
User 1: Checkout → Call payment (hang 30s) → Timeout ❌
User 2: Checkout → Call payment (hang 30s) → Timeout ❌
User 3: Checkout → Call payment (hang 30s) → Timeout ❌
...
Result:
- All requests wait 30s before failing
- Thread pool exhausted (all threads blocked)
- System becomes unresponsive
- Other services affected (cascading failure)

With Circuit Breaker:
User 1: Checkout → Call payment (hang 30s) → Timeout ❌
User 2: Checkout → Call payment (hang 30s) → Timeout ❌
User 3: Checkout → Call payment (hang 30s) → Timeout ❌
User 4: Checkout → Circuit OPEN → Instant fail (fallback) ✓
User 5-100: Circuit OPEN → Instant fail ✓
Result:
- After 3 failures, circuit opens
- Subsequent requests fail instantly (no waiting)
- Thread pool freed up
- System remains responsive
- After 30s, test recovery (Half-Open)
```

---

## 🎯 Three States

### **State Machine**

```
        ┌─────────────┐
        │   CLOSED    │  Normal operation
        │  (Working)  │  Monitor failures
        └─────┬───────┘
              │ Failure rate > threshold
              ▼
        ┌─────────────┐
        │    OPEN     │  Block all requests
        │  (Failing)  │  Fail fast
        └─────┬───────┘
              │ After timeout (e.g., 30s)
              ▼
        ┌─────────────┐
        │ HALF-OPEN   │  Test recovery
        │  (Testing)  │  Allow limited requests
        └─────┬───────┘
              │ Success rate > threshold
              ▼
        ┌─────────────┐
        │   CLOSED    │  Resume normal
        └─────────────┘
```

### **State Details**

```python
class CircuitBreakerState:
    CLOSED = "CLOSED"      # Normal: Requests pass through
    OPEN = "OPEN"          # Failing: Block all requests
    HALF_OPEN = "HALF_OPEN"  # Testing: Allow test requests
```

**CLOSED** (Normal):
- All requests pass through
- Monitor failures
- If failure rate > threshold → OPEN

**OPEN** (Failing):
- Block all requests immediately
- Return fallback (cached data, error message)
- After timeout (e.g., 30s) → HALF_OPEN

**HALF_OPEN** (Testing):
- Allow limited test requests (e.g., 1-3)
- If succeed → CLOSED
- If fail → OPEN

---

## 🛠️ Simple Circuit Breaker

### **Basic Implementation**

```python
import time
from enum import Enum

class State(Enum):
    CLOSED = "CLOSED"
    OPEN = "OPEN"
    HALF_OPEN = "HALF_OPEN"

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout  # Seconds to wait before Half-Open
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.state = State.CLOSED
    
    def call(self, func, *args, **kwargs):
        """Execute function through circuit breaker"""
        
        # Check if should transition to Half-Open
        if self.state == State.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                print("Circuit Half-Open: Testing recovery")
                self.state = State.HALF_OPEN
                self.success_count = 0
            else:
                raise CircuitOpenError("Circuit breaker is OPEN")
        
        # Execute function
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        """Handle successful call"""
        if self.state == State.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= 3:  # 3 successes → CLOSED
                print("Circuit Closed: Service recovered")
                self.state = State.CLOSED
                self.failure_count = 0
        elif self.state == State.CLOSED:
            # Reset failure count on success
            self.failure_count = 0
    
    def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.state == State.HALF_OPEN:
            # Half-Open failure → back to OPEN
            print("Circuit Open: Service still failing")
            self.state = State.OPEN
        elif self.failure_count >= self.failure_threshold:
            # Threshold exceeded → OPEN
            print(f"Circuit Open: {self.failure_count} failures")
            self.state = State.OPEN

class CircuitOpenError(Exception):
    pass

# Usage
breaker = CircuitBreaker(failure_threshold=5, timeout=60)

def call_payment_service():
    response = requests.post('https://payment-api.com/charge')
    response.raise_for_status()
    return response.json()

# Try calling service
for i in range(10):
    try:
        result = breaker.call(call_payment_service)
        print(f"Request {i}: Success")
    except CircuitOpenError:
        print(f"Request {i}: Circuit OPEN (fast fail)")
    except Exception as e:
        print(f"Request {i}: Failed ({e})")
    
    time.sleep(1)
```

**Output:**
```
Request 0: Success
Request 1: Failed (Connection timeout)
Request 2: Failed (Connection timeout)
Request 3: Failed (Connection timeout)
Request 4: Failed (Connection timeout)
Request 5: Failed (Connection timeout)
Circuit Open: 5 failures
Request 6: Circuit OPEN (fast fail)
Request 7: Circuit OPEN (fast fail)
...
(60 seconds later)
Circuit Half-Open: Testing recovery
Request 8: Success
Request 9: Success
Circuit Closed: Service recovered
Request 10: Success
```

---

## 🎯 Advanced Circuit Breaker

### **Sliding Window (Resilience4j Style)**

```python
from collections import deque
import time

class SlidingWindowCircuitBreaker:
    """
    Circuit breaker with sliding window
    Tracks recent N requests (not time-based)
    """
    
    def __init__(
        self,
        window_size=10,           # Track last 10 requests
        failure_threshold=0.5,    # Open if >50% fail
        timeout=30,               # Wait 30s before Half-Open
        half_open_attempts=3      # Test with 3 requests
    ):
        self.window_size = window_size
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.half_open_attempts = half_open_attempts
        
        self.requests = deque(maxlen=window_size)  # Sliding window
        self.state = State.CLOSED
        self.last_failure_time = None
        self.half_open_count = 0
    
    def call(self, func, *args, **kwargs):
        # Check state transition
        if self.state == State.OPEN:
            if time.time() - self.last_failure_time > self.timeout:
                self.state = State.HALF_OPEN
                self.half_open_count = 0
            else:
                raise CircuitOpenError("Circuit OPEN")
        
        # Execute
        try:
            result = func(*args, **kwargs)
            self._record_success()
            return result
        except Exception as e:
            self._record_failure()
            raise
    
    def _record_success(self):
        """Record successful request"""
        self.requests.append(True)  # True = success
        
        if self.state == State.HALF_OPEN:
            self.half_open_count += 1
            if self.half_open_count >= self.half_open_attempts:
                # Enough successes → CLOSED
                self.state = State.CLOSED
                print("Circuit CLOSED")
    
    def _record_failure(self):
        """Record failed request"""
        self.requests.append(False)  # False = failure
        self.last_failure_time = time.time()
        
        if self.state == State.HALF_OPEN:
            # Half-Open failure → back to OPEN
            self.state = State.OPEN
            print("Circuit OPEN (Half-Open test failed)")
        elif len(self.requests) >= self.window_size:
            # Check failure rate in sliding window
            failure_rate = sum(1 for r in self.requests if not r) / len(self.requests)
            
            if failure_rate > self.failure_threshold:
                self.state = State.OPEN
                print(f"Circuit OPEN (failure rate: {failure_rate:.1%})")
    
    def get_metrics(self):
        """Get current metrics"""
        if not self.requests:
            return {"state": self.state.value, "failure_rate": 0}
        
        failures = sum(1 for r in self.requests if not r)
        failure_rate = failures / len(self.requests)
        
        return {
            "state": self.state.value,
            "requests": len(self.requests),
            "failures": failures,
            "failure_rate": failure_rate
        }

# Usage
breaker = SlidingWindowCircuitBreaker(
    window_size=10,
    failure_threshold=0.5,
    timeout=30
)

for i in range(20):
    try:
        result = breaker.call(call_payment_service)
        print(f"✓ Request {i}: Success")
    except CircuitOpenError:
        print(f"✗ Request {i}: Circuit OPEN (fast fail)")
    except Exception as e:
        print(f"✗ Request {i}: Failed")
    
    # Print metrics every 5 requests
    if i % 5 == 0:
        print(f"  Metrics: {breaker.get_metrics()}")
```

---

## 🎯 Circuit Breaker with Fallback

### **Graceful Degradation**

```python
class CircuitBreakerWithFallback:
    def __init__(self, breaker, fallback_func):
        self.breaker = breaker
        self.fallback_func = fallback_func
    
    def call(self, func, *args, **kwargs):
        """Try primary, fallback on failure"""
        try:
            return self.breaker.call(func, *args, **kwargs)
        except CircuitOpenError:
            print("Circuit OPEN: Using fallback")
            return self.fallback_func(*args, **kwargs)
        except Exception as e:
            print(f"Primary failed: Using fallback")
            return self.fallback_func(*args, **kwargs)

# Example: Product recommendations
def get_recommendations(user_id):
    """Primary: ML-based recommendations"""
    response = requests.get(f'https://ml-api.com/recommend/{user_id}')
    response.raise_for_status()
    return response.json()['products']

def fallback_recommendations(user_id):
    """Fallback: Popular products"""
    return [
        {"id": 1, "name": "Popular Product 1"},
        {"id": 2, "name": "Popular Product 2"},
        {"id": 3, "name": "Popular Product 3"}
    ]

# Circuit breaker with fallback
breaker = CircuitBreaker(failure_threshold=3, timeout=60)
protected_call = CircuitBreakerWithFallback(breaker, fallback_recommendations)

# Call with automatic fallback
recommendations = protected_call.call(get_recommendations, user_id=123)
print(recommendations)
```

---

## 🎯 Real-World Examples

### **1. Netflix Hystrix**

```java
import com.netflix.hystrix.HystrixCommand;
import com.netflix.hystrix.HystrixCommandGroupKey;

public class GetUserCommand extends HystrixCommand<User> {
    private final Long userId;
    
    public GetUserCommand(Long userId) {
        super(HystrixCommandGroupKey.Factory.asKey("UserService"));
        this.userId = userId;
    }
    
    @Override
    protected User run() throws Exception {
        // Primary: Call user service
        return userService.getUser(userId);
    }
    
    @Override
    protected User getFallback() {
        // Fallback: Return default user
        return new User(userId, "Guest");
    }
}

// Usage
User user = new GetUserCommand(123).execute();
```

**Configuration:**
```yaml
hystrix:
  command:
    default:
      circuitBreaker:
        requestVolumeThreshold: 20      # Min requests before opening
        errorThresholdPercentage: 50    # Open if >50% fail
        sleepWindowInMilliseconds: 5000 # Wait 5s before Half-Open
      execution:
        isolation:
          thread:
            timeoutInMilliseconds: 3000  # 3s timeout
```

### **2. Resilience4j (Modern Alternative)**

```java
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import java.time.Duration;

// Create circuit breaker
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .slidingWindowSize(10)                    // Track last 10 requests
    .failureRateThreshold(50)                 // Open if >50% fail
    .waitDurationInOpenState(Duration.ofSeconds(30))  // Wait 30s
    .permittedNumberOfCallsInHalfOpenState(3) // Test with 3 requests
    .build();

CircuitBreaker breaker = CircuitBreaker.of("paymentService", config);

// Use circuit breaker
Supplier<String> decorated = CircuitBreaker.decorateSupplier(
    breaker,
    () -> paymentService.charge(amount)
);

// Call with automatic circuit breaking
try {
    String result = decorated.get();
} catch (Exception e) {
    // Fallback
    return "Payment temporarily unavailable";
}
```

### **3. AWS: Step Functions Circuit Breaker**

```json
{
  "States": {
    "CallAPI": {
      "Type": "Task",
      "Resource": "arn:aws:lambda:us-east-1:123:function:ApiCall",
      "Retry": [
        {
          "ErrorEquals": ["States.Timeout", "ServiceException"],
          "MaxAttempts": 3,
          "BackoffRate": 2
        }
      ],
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "CircuitOpen"
        }
      ]
    },
    "CircuitOpen": {
      "Type": "Fail",
      "Error": "CircuitBreakerOpen",
      "Cause": "Service unavailable"
    }
  }
}
```

---

## ✅ Best Practices

### **1. Set Appropriate Thresholds**

```python
# Bad: Too sensitive (opens too easily)
breaker = CircuitBreaker(failure_threshold=1, timeout=300)  # ❌
# Opens after 1 failure, waits 5 minutes

# Good: Reasonable thresholds
breaker = CircuitBreaker(failure_threshold=5, timeout=30)  # ✓
# Opens after 5 failures, tests recovery after 30s
```

### **2. Always Provide Fallback**

```python
# Bad: No fallback
try:
    result = breaker.call(api_call)
except CircuitOpenError:
    raise  # User sees error ❌

# Good: Graceful fallback
try:
    result = breaker.call(api_call)
except CircuitOpenError:
    result = cached_result()  # Fallback ✓
```

### **3. Monitor Circuit State**

```python
# Expose metrics
@app.get("/metrics/circuit-breaker")
def get_metrics():
    return {
        "state": breaker.state.value,
        "failure_count": breaker.failure_count,
        "last_failure": breaker.last_failure_time
    }

# Alert if circuit open for too long
if breaker.state == State.OPEN:
    if time.time() - breaker.last_failure_time > 300:  # 5 minutes
        send_alert("Circuit breaker open for >5 minutes")
```

### **4. Use Per-Service Circuit Breakers**

```python
# Bad: Single circuit breaker for all services
global_breaker = CircuitBreaker()  # ❌

payment_service(global_breaker)
user_service(global_breaker)
# Payment failure affects user service

# Good: Per-service circuit breakers
payment_breaker = CircuitBreaker()  # ✓
user_breaker = CircuitBreaker()

# Independent failure handling
```

---

## 🎓 Interview Tips

**Q: "What is circuit breaker pattern?"**

A: "Circuit breaker prevents repeated calls to failing service by blocking requests after threshold.

Three states:
1. **CLOSED** (Normal): Requests pass through, monitor failures
2. **OPEN** (Failing): Block all requests, fail fast (no waiting)
3. **HALF-OPEN** (Testing): Allow test requests, check recovery

Example:
- Service times out 5 times → Circuit OPEN
- Block all requests for 30s (fast fail)
- After 30s → HALF_OPEN, try 3 test requests
- If succeed → CLOSED (resume normal)
- If fail → OPEN (wait another 30s)

Benefits:
- Fast failure (no waiting for timeout)
- Prevent cascading failures
- Give service time to recover
- Reduce load on failing service

Real-world: Netflix Hystrix, AWS Step Functions, Kubernetes"

**Q: "How does circuit breaker prevent cascading failures?"**

A: "Without circuit breaker:
- Service A calls failing Service B
- Each request waits 30s (timeout)
- Threads blocked → thread pool exhausted
- Service A becomes unresponsive
- Cascade to services calling Service A

With circuit breaker:
- First 5 requests timeout (30s each)
- Circuit opens after 5 failures
- Subsequent requests fail instantly (no wait)
- Threads freed immediately
- Service A remains responsive
- Fallback response returned

Key benefit: **Fast failure** (instant vs 30s timeout)"

**Q: "When should circuit breaker open?"**

A: "Thresholds to consider:

1. **Failure count**: After N consecutive failures (e.g., 5)
2. **Failure rate**: If >X% fail in window (e.g., >50% in last 10 requests)
3. **Time window**: X failures in Y seconds (e.g., 10 in 60s)

Typical values:
- Threshold: 5-10 failures or 50% rate
- Timeout: 30-60s (wait before Half-Open)
- Half-Open attempts: 1-3 test requests

Trade-offs:
- Low threshold: Opens quickly (less damage) but may open unnecessarily
- High threshold: More damage before opening but fewer false positives

Monitor and tune based on service characteristics."

---

## 📚 Summary

**Circuit Breaker**: Stops calling failing service, fails fast

**States**: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing) → CLOSED

**Why**: Prevent cascading failures, fast failure, give service time to recover

**Thresholds**: 5-10 failures, 50% rate, 30-60s timeout

**Best Practice**: Per-service breakers, fallback, monitor state, tune thresholds 🚀
