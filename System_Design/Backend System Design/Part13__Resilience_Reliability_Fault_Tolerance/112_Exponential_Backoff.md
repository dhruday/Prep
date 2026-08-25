# 112. Exponential Backoff

## 📌 Overview

**Exponential backoff** is a retry strategy where wait time between retries **doubles** with each attempt.

**Formula**: `delay = base_delay × 2^attempt`

```
Attempt 1: Wait 1s  (2^0 = 1)
Attempt 2: Wait 2s  (2^1 = 2)
Attempt 3: Wait 4s  (2^2 = 4)
Attempt 4: Wait 8s  (2^3 = 8)
Attempt 5: Wait 16s (2^4 = 16)
```

---

## 🎯 Why Exponential Backoff?

### **Problem: Thundering Herd**

```
Scenario: 10,000 clients call API, server overloaded returns 503

Fixed Delay (1 second):
Time 0s:  10,000 requests → Server overloaded (503)
Time 1s:  10,000 retries   → Even worse! ❌
Time 2s:  10,000 retries   → Still overloaded ❌

Exponential Backoff:
Time 0s:  10,000 requests → Server overloaded (503)
Time 1s:  10,000 retries
Time 2s:  5,000 retries    (half gave up)
Time 4s:  2,500 retries    (exponentially fewer)
Time 8s:  1,250 retries    (server recovers) ✓

Result: Server gets breathing room to recover
```

---

## 🛠️ Basic Exponential Backoff

### **Python Implementation**

```python
import time

def exponential_backoff(func, max_retries=5, base_delay=1):
    """
    Retry with exponential backoff
    
    Args:
        func: Function to retry
        max_retries: Maximum retry attempts
        base_delay: Initial delay in seconds
    """
    for attempt in range(max_retries):
        try:
            return func()  # Success ✓
        except Exception as e:
            if attempt == max_retries - 1:
                raise  # Last attempt, give up
            
            # Calculate delay: base_delay × 2^attempt
            delay = base_delay * (2 ** attempt)
            print(f"Attempt {attempt + 1} failed: {e}")
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)

# Usage
def api_call():
    response = requests.get('https://api.example.com/data')
    response.raise_for_status()
    return response.json()

data = exponential_backoff(api_call)
```

**Output:**
```
Attempt 1 failed: Connection timeout
Retrying in 1 seconds...

Attempt 2 failed: 503 Service Unavailable
Retrying in 2 seconds...

Attempt 3 failed: 503 Service Unavailable
Retrying in 4 seconds...

Success!
```

---

## 🎯 Exponential Backoff with Cap

### **Prevent Excessively Long Waits**

```python
def exponential_backoff_with_cap(func, max_retries=10, base_delay=1, max_delay=60):
    """
    Exponential backoff with maximum delay cap
    """
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            
            # Cap delay at max_delay (e.g., 60 seconds)
            delay = min(base_delay * (2 ** attempt), max_delay)
            print(f"Retry after {delay}s")
            time.sleep(delay)

# Example delays with cap:
# Attempt 1: 1s  (2^0 = 1)
# Attempt 2: 2s  (2^1 = 2)
# Attempt 3: 4s  (2^2 = 4)
# Attempt 4: 8s  (2^3 = 8)
# Attempt 5: 16s (2^4 = 16)
# Attempt 6: 32s (2^5 = 32)
# Attempt 7: 60s (2^6 = 64, capped at 60)
# Attempt 8: 60s (2^7 = 128, capped at 60)
```

---

## ⭐ Exponential Backoff with Jitter (Best Practice)

### **Why Jitter?**

```
Problem: Without jitter, all clients retry at same time

1000 clients all retry at exactly 2 seconds → Synchronized spike ❌

Solution: Add random variance (jitter)

Clients retry between 1.5-2.5 seconds → Spread out ✓
```

### **Implementation**

```python
import random

def exponential_backoff_with_jitter(
    func, 
    max_retries=5, 
    base_delay=1, 
    max_delay=60
):
    """
    Exponential backoff with jitter (random variance)
    
    Formula: delay = min(base × 2^attempt, max) × (0.5 + random(0, 0.5))
    """
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            
            # Exponential backoff
            exponential_delay = min(
                base_delay * (2 ** attempt), 
                max_delay
            )
            
            # Add jitter: ±50% random variance
            jitter = random.uniform(0.5, 1.5)
            delay = exponential_delay * jitter
            
            print(f"Retry {attempt + 1} after {delay:.2f}s")
            time.sleep(delay)

# Example delays with jitter:
# Attempt 1: 0.7s  (1 × random(0.5-1.5))
# Attempt 2: 2.3s  (2 × random(0.5-1.5))
# Attempt 3: 3.1s  (4 × random(0.5-1.5))
# Attempt 4: 10.5s (8 × random(0.5-1.5))
```

### **Full Jitter vs Equal Jitter**

```python
# Full Jitter (AWS recommendation)
def full_jitter(base_delay, attempt, max_delay):
    """Random between 0 and exponential delay"""
    cap = min(base_delay * (2 ** attempt), max_delay)
    return random.uniform(0, cap)

# Example: Attempt 3 (cap = 4s)
# Delay: random(0, 4) = anywhere from 0-4 seconds

# Equal Jitter
def equal_jitter(base_delay, attempt, max_delay):
    """Half exponential + half random"""
    cap = min(base_delay * (2 ** attempt), max_delay)
    return cap / 2 + random.uniform(0, cap / 2)

# Example: Attempt 3 (cap = 4s)
# Delay: 2 + random(0, 2) = 2-4 seconds

# Decorrelated Jitter
def decorrelated_jitter(base_delay, previous_delay, max_delay):
    """Based on previous delay, not attempt count"""
    return min(max_delay, random.uniform(base_delay, previous_delay * 3))

# Example: Previous delay = 5s
# Delay: random(1, 15) = 1-15 seconds
```

---

## 🎯 Real-World Implementations

### **1. AWS SDK (Boto3)**

```python
import boto3
from botocore.config import Config

# AWS SDK uses exponential backoff with jitter
config = Config(
    retries={
        'max_attempts': 5,
        'mode': 'adaptive'  # Adaptive retry mode
    }
)

s3 = boto3.client('s3', config=config)

# Automatically retries with exponential backoff on:
# - Connection errors
# - Throttling (429)
# - 5xx server errors

# Retry delays (approximate):
# Attempt 1: ~0.5s
# Attempt 2: ~1s
# Attempt 3: ~2s
# Attempt 4: ~4s
# Attempt 5: ~8s (then give up)

s3.put_object(Bucket='my-bucket', Key='file.txt', Body=data)
```

### **2. Google Cloud SDK**

```python
from google.cloud import storage
from google.api_core import retry

# Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 32s)
@retry.Retry(
    initial=1.0,
    maximum=32.0,
    multiplier=2.0,
    deadline=60.0  # Total timeout
)
def upload_file():
    client = storage.Client()
    bucket = client.bucket('my-bucket')
    blob = bucket.blob('file.txt')
    blob.upload_from_filename('local_file.txt')

upload_file()
```

### **3. Stripe API**

```python
import stripe

stripe.api_key = 'sk_test_...'
stripe.max_network_retries = 2  # Retry twice

# Stripe uses exponential backoff internally:
# Attempt 1: Immediate
# Attempt 2: ~1s delay
# Attempt 3: ~2s delay

charge = stripe.Charge.create(
    amount=2000,
    currency='usd',
    source='tok_visa',
    idempotency_key='abc-123'
)
```

### **4. Kubernetes Backoff**

```yaml
apiVersion: batch/v1
kind: Job
spec:
  backoffLimit: 6  # Max 6 retries
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: job
        image: myapp:1.0

# Kubernetes exponential backoff:
# Retry 1: 10s
# Retry 2: 20s
# Retry 3: 40s
# Retry 4: 80s (capped at 6 minutes)
# Retry 5: 160s
# Retry 6: 320s
```

---

## 🎯 Tuning Exponential Backoff

### **Parameters to Tune**

```python
class ExponentialBackoffConfig:
    def __init__(self):
        self.base_delay = 1        # Initial delay (seconds)
        self.max_retries = 5       # Maximum attempts
        self.max_delay = 60        # Cap delay at 60s
        self.multiplier = 2        # Double each time
        self.jitter = True         # Add randomness

# Example configurations:

# Fast Recovery (for transient failures)
fast_config = ExponentialBackoffConfig()
fast_config.base_delay = 0.1     # 100ms
fast_config.max_delay = 5        # Max 5s
fast_config.max_retries = 5

# Delays: 0.1s, 0.2s, 0.4s, 0.8s, 1.6s

# Slow Recovery (for overloaded servers)
slow_config = ExponentialBackoffConfig()
slow_config.base_delay = 2       # 2s
slow_config.max_delay = 300      # Max 5 minutes
slow_config.max_retries = 10

# Delays: 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s (capped at 300s)

# Aggressive (for critical operations)
aggressive_config = ExponentialBackoffConfig()
aggressive_config.base_delay = 0.01  # 10ms
aggressive_config.max_delay = 1      # Max 1s
aggressive_config.max_retries = 20

# Delays: 0.01s, 0.02s, 0.04s, 0.08s, ..., 1s (capped)
```

---

## 🎯 Comparison: Backoff Strategies

### **Visual Comparison**

```
Time →

Immediate Retry:
|||||||||||||||||   ← All retries in 1 second (overwhelming) ❌

Fixed Delay (1s):
| | | | | | | | |   ← Predictable, but can create spikes ⚠️

Linear Backoff (1s, 2s, 3s, 4s):
| . | . . | . . . | . . . . |   ← Better, but still grows slowly ⚠️

Exponential Backoff (1s, 2s, 4s, 8s):
| . | . . | . . . . | . . . . . . . . |   ← Fast back-off, reduces load ✓

Exponential + Jitter:
| . |. .  | . .  . . |. . . . .  . . . |   ← Spread out, no spikes ✓✓
```

### **Comparison Table**

| Strategy | Total Retries in 1 Min | Load on Server | Recovery Time |
|----------|------------------------|----------------|---------------|
| Immediate | 1000+ | Very High ❌ | Instant ✓ |
| Fixed (1s) | ~60 | High ⚠️ | Fast ✓ |
| Linear | ~15 | Medium ⚠️ | Medium |
| Exponential | ~5 | Low ✓ | Slow ⚠️ |
| Exponential + Jitter | ~5 | Very Low ✓✓ | Slow ⚠️ |

**Best choice: Exponential + Jitter** (low load, no spikes)

---

## ✅ Best Practices

### **1. Always Add Jitter**

```python
# Bad: No jitter
delay = 2 ** attempt  # All clients retry at same time ❌

# Good: With jitter
delay = (2 ** attempt) * random.uniform(0.5, 1.5)  # Spread out ✓
```

### **2. Cap Maximum Delay**

```python
# Bad: Unbounded delay
delay = 2 ** attempt  # 2^20 = 1,048,576 seconds (12 days!) ❌

# Good: Cap at reasonable maximum
delay = min(2 ** attempt, 60)  # Max 60 seconds ✓
```

### **3. Limit Total Retry Time**

```python
import time

def retry_with_deadline(func, max_retries=10, base_delay=1, deadline=60):
    """Stop retrying after deadline (total time)"""
    start_time = time.time()
    
    for attempt in range(max_retries):
        # Check if exceeded deadline
        if time.time() - start_time > deadline:
            raise TimeoutError(f"Exceeded deadline of {deadline}s")
        
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            
            delay = min(base_delay * (2 ** attempt), 60)
            time.sleep(delay)
```

### **4. Log Retry Attempts**

```python
import logging

def retry_with_logging(func, max_retries=5):
    for attempt in range(max_retries):
        try:
            result = func()
            if attempt > 0:
                logging.info(f"✓ Succeeded after {attempt + 1} attempts")
            return result
        except Exception as e:
            delay = 2 ** attempt
            logging.warning(f"✗ Attempt {attempt + 1} failed: {e}. Retry in {delay}s")
            
            if attempt == max_retries - 1:
                logging.error(f"✗ All {max_retries} attempts failed")
                raise
            
            time.sleep(delay)
```

---

## ⚠️ Common Mistakes

### **1. No Jitter → Thundering Herd**

```python
# Bad: Synchronized retries
for i in range(5):
    delay = 2 ** i  # All clients wait exact same time ❌
    time.sleep(delay)

# Good: Jittered retries
for i in range(5):
    delay = (2 ** i) * random.uniform(0.5, 1.5)  # Spread out ✓
    time.sleep(delay)
```

### **2. Unbounded Growth**

```python
# Bad: Delay grows forever
delay = 2 ** attempt  # 2^30 = 1 billion seconds! ❌

# Good: Cap at maximum
delay = min(2 ** attempt, 60)  # Max 60s ✓
```

### **3. Retrying Non-Transient Errors**

```python
# Bad: Retry 404 (permanent error)
for i in range(5):
    try:
        response = requests.get('/user/999999')
        if response.status_code == 404:
            time.sleep(2 ** i)  # Pointless retry ❌
    except Exception:
        pass

# Good: Only retry transient errors
for i in range(5):
    try:
        response = requests.get('/user/999999')
        if response.status_code in [500, 502, 503, 504, 429]:
            time.sleep(2 ** i)  # Retry transient errors ✓
        else:
            break  # Don't retry permanent errors
    except Exception:
        time.sleep(2 ** i)
```

---

## 🎓 Interview Tips

**Q: "What is exponential backoff and why use it?"**

A: "Exponential backoff doubles wait time between retries: 1s, 2s, 4s, 8s...

Why:
1. **Reduces load**: Fewer retries over time (gives server breathing room)
2. **Prevents thundering herd**: Not all clients retry at once
3. **Fast recovery**: Early retries happen quickly
4. **Graceful degradation**: Backs off if server still struggling

Formula: `delay = base_delay × 2^attempt`

Always add **jitter** (random variance) to prevent synchronized retries.

Real-world: AWS, Google, Stripe all use exponential backoff with jitter."

**Q: "What is jitter and why is it important?"**

A: "Jitter adds randomness to retry delays.

Without jitter:
- 10,000 clients all retry at exactly 2 seconds → Synchronized spike → Overwhelms server ❌

With jitter:
- Clients retry between 1-3 seconds → Spread out → Reduced load ✓

Implementation: `delay = exponential_delay × random(0.5, 1.5)`

AWS recommends **full jitter**: `delay = random(0, exponential_delay)`

Result: Prevents thundering herd, smoother load distribution."

**Q: "How do you tune exponential backoff parameters?"**

A: "Key parameters:
1. **base_delay**: Initial wait time
   - Fast transients: 100ms
   - Slow recovery: 2s

2. **max_delay**: Cap delay
   - Interactive (user waiting): 5-10s
   - Background job: 60-300s

3. **max_retries**: Limit attempts
   - Critical operation: 5-10
   - Best-effort: 3

4. **multiplier**: Growth rate
   - Standard: 2 (double each time)
   - Aggressive: 1.5
   - Conservative: 3

Trade-offs:
- Fast recovery vs server load
- User experience vs reliability
- Cost (retries use resources) vs success rate

Monitor: Retry rate, success rate, total latency. Adjust based on metrics."

---

## 📚 Summary

**Exponential Backoff**: Double delay between retries (1s, 2s, 4s, 8s...)

**Why**: Reduces load on struggling server, prevents thundering herd

**Jitter**: Add randomness to spread retries (prevent synchronized spikes)

**Formula**: `delay = min(base × 2^attempt, max) × random(0.5, 1.5)`

**Best Practice**: Exponential backoff + full jitter (AWS recommendation)

**Tuning**: base_delay, max_delay, max_retries based on use case 🚀
