# 137. Rate Limiter

## 📌 Problem Statement

**Design a rate limiter** that limits the number of requests a user can make in a time window.

**Example**:
```
User 123: Limit 100 requests per minute
- Request 1-100: Allowed ✓
- Request 101: Rejected ❌ (429 Too Many Requests)
```

**Why rate limiting?**
- Prevent abuse (DDoS attacks, spam)
- Fair resource allocation (prevent one user hogging all resources)
- Cost control (limit API usage per tier)

---

## 🎯 Step 1: Requirements

### **Functional Requirements**

1. **Limit requests**: Allow N requests per time window (e.g., 100/min)
2. **Reject excess**: Return 429 error if limit exceeded
3. **Per-user limits**: Different limits for different users
4. **Multiple time windows**: Per-second, per-minute, per-hour, per-day

### **Non-Functional Requirements**

1. **Low latency**: < 10ms overhead per request
2. **High availability**: 99.99% uptime
3. **Scalability**: 1 million users, 10k requests/sec
4. **Accuracy**: No false positives (block legitimate users)

---

## 🎯 Step 2: Rate Limiting Algorithms

### **1. Token Bucket** (Recommended ✓)

**Concept**: Bucket holds tokens, each request consumes 1 token

**Algorithm**:
```
Bucket capacity: 100 tokens
Refill rate: 100 tokens per minute (1.67 tokens/sec)

At t=0s:  Bucket has 100 tokens
Request:  Consume 1 token → 99 tokens remaining ✓
...
Request:  Consume 1 token → 0 tokens remaining ✓
Request:  No tokens → Reject ❌ (wait 0.6 sec for refill)

At t=0.6s: Bucket refilled by 1 token → 1 token available
Request:   Consume 1 token → 0 tokens remaining ✓
```

**Implementation**:

```python
import time

class TokenBucket:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity           # Max tokens
        self.tokens = capacity             # Current tokens
        self.refill_rate = refill_rate     # Tokens per second
        self.last_refill = time.time()
    
    def allow_request(self):
        # Refill tokens based on time elapsed
        now = time.time()
        elapsed = now - self.last_refill
        tokens_to_add = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + tokens_to_add)
        self.last_refill = now
        
        # Check if token available
        if self.tokens >= 1:
            self.tokens -= 1
            return True  # Allow
        else:
            return False  # Reject

# Usage
bucket = TokenBucket(capacity=100, refill_rate=100/60)  # 100 tokens/min

if bucket.allow_request():
    # Process request
    print("Request allowed")
else:
    # Reject request
    print("Rate limit exceeded")
```

**Pros**:
- Smooth traffic (allows bursts up to capacity)
- Memory efficient (store capacity + tokens + timestamp)

**Cons**:
- Not precise (refill continuous, not discrete)

---

### **2. Fixed Window Counter**

**Concept**: Count requests in fixed time window (e.g., 10:00-10:01)

**Algorithm**:
```
Limit: 100 requests per minute
Window: 10:00:00 - 10:00:59

10:00:05: Request 1 → Count = 1 ✓
10:00:10: Request 2 → Count = 2 ✓
...
10:00:59: Request 100 → Count = 100 ✓
10:00:59: Request 101 → Count = 101 → Reject ❌

10:01:00: New window → Count reset to 0
10:01:01: Request 1 → Count = 1 ✓
```

**Implementation**:

```python
import time

class FixedWindowCounter:
    def __init__(self, limit, window_size):
        self.limit = limit              # Max requests per window
        self.window_size = window_size  # Window duration (seconds)
        self.count = 0
        self.window_start = time.time()
    
    def allow_request(self):
        now = time.time()
        
        # Check if window expired
        if now - self.window_start >= self.window_size:
            # Reset window
            self.window_start = now
            self.count = 0
        
        # Check if under limit
        if self.count < self.limit:
            self.count += 1
            return True  # Allow
        else:
            return False  # Reject

# Usage
limiter = FixedWindowCounter(limit=100, window_size=60)  # 100 req/min

if limiter.allow_request():
    print("Request allowed")
else:
    print("Rate limit exceeded")
```

**Pros**:
- Simple
- Memory efficient (store count + window_start)

**Cons**:
- **Burst at window boundaries**:
  ```
  10:00:59: 100 requests (allowed) ✓
  10:01:00: 100 requests (allowed) ✓
  Total: 200 requests in 1 second (spike)
  ```

---

### **3. Sliding Window Log**

**Concept**: Store timestamp of each request, count requests in last N seconds

**Algorithm**:
```
Limit: 100 requests per minute
Current time: 10:05:30

Requests: [10:04:35, 10:04:40, ..., 10:05:25, 10:05:30]
Count requests in [10:04:30, 10:05:30] (last 60 seconds)

If count <= 100: Allow ✓
Else: Reject ❌
```

**Implementation**:

```python
import time
from collections import deque

class SlidingWindowLog:
    def __init__(self, limit, window_size):
        self.limit = limit
        self.window_size = window_size
        self.requests = deque()  # Timestamps
    
    def allow_request(self):
        now = time.time()
        
        # Remove requests outside window
        while self.requests and self.requests[0] < now - self.window_size:
            self.requests.popleft()
        
        # Check if under limit
        if len(self.requests) < self.limit:
            self.requests.append(now)
            return True  # Allow
        else:
            return False  # Reject

# Usage
limiter = SlidingWindowLog(limit=100, window_size=60)

if limiter.allow_request():
    print("Request allowed")
else:
    print("Rate limit exceeded")
```

**Pros**:
- Precise (no boundary issues)

**Cons**:
- Memory intensive (store all timestamps)
- Example: 100 req/min = 100 timestamps per user

---

### **4. Sliding Window Counter** (Hybrid ✓)

**Concept**: Weighted count from previous + current window

**Algorithm**:
```
Limit: 100 requests per minute
Current time: 10:00:30 (middle of current window)

Previous window (10:00:00 - 10:00:59): 80 requests
Current window  (10:01:00 - 10:01:59): 40 requests

Estimate for last 60 seconds:
Weight of previous window: 50% (30 seconds overlap)
Estimated count: 80 × 0.5 + 40 = 40 + 40 = 80 requests ✓

If 80 <= 100: Allow ✓
```

**Implementation**:

```python
import time

class SlidingWindowCounter:
    def __init__(self, limit, window_size):
        self.limit = limit
        self.window_size = window_size
        self.prev_count = 0
        self.curr_count = 0
        self.curr_window_start = time.time()
    
    def allow_request(self):
        now = time.time()
        
        # Check if window expired
        if now - self.curr_window_start >= self.window_size:
            # Shift window
            self.prev_count = self.curr_count
            self.curr_count = 0
            self.curr_window_start = now
        
        # Calculate weighted count
        elapsed = now - self.curr_window_start
        weight = 1 - (elapsed / self.window_size)  # Weight of previous window
        estimated_count = self.prev_count * weight + self.curr_count
        
        # Check if under limit
        if estimated_count < self.limit:
            self.curr_count += 1
            return True  # Allow
        else:
            return False  # Reject

# Usage
limiter = SlidingWindowCounter(limit=100, window_size=60)

if limiter.allow_request():
    print("Request allowed")
else:
    print("Rate limit exceeded")
```

**Pros**:
- Smooth (no boundary issues)
- Memory efficient (only 2 counters)

**Cons**:
- Approximate (not exact)

---

## 🎯 Step 3: Distributed Rate Limiting (Redis)

**Problem**: Multiple API servers → Need centralized rate limiter

**Solution**: Store rate limit data in Redis

### **Redis Implementation (Token Bucket)**

```python
import redis
import time

class DistributedTokenBucket:
    def __init__(self, redis_client, capacity, refill_rate):
        self.redis = redis_client
        self.capacity = capacity
        self.refill_rate = refill_rate
    
    def allow_request(self, user_id):
        key = f"rate_limit:{user_id}"
        now = time.time()
        
        # Lua script (atomic operation)
        script = """
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])
        
        local tokens = tonumber(redis.call('HGET', key, 'tokens') or capacity)
        local last_refill = tonumber(redis.call('HGET', key, 'last_refill') or now)
        
        -- Refill tokens
        local elapsed = now - last_refill
        local tokens_to_add = elapsed * refill_rate
        tokens = math.min(capacity, tokens + tokens_to_add)
        
        -- Check if token available
        if tokens >= 1 then
            tokens = tokens - 1
            redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
            redis.call('EXPIRE', key, 3600)  -- Expire after 1 hour
            return 1  -- Allow
        else
            return 0  -- Reject
        end
        """
        
        result = self.redis.eval(script, 1, key, self.capacity, self.refill_rate, now)
        return result == 1

# Usage
redis_client = redis.Redis(host='localhost', port=6379)
limiter = DistributedTokenBucket(redis_client, capacity=100, refill_rate=100/60)

if limiter.allow_request(user_id=123):
    print("Request allowed")
else:
    print("Rate limit exceeded")
```

**Why Lua script?**
- **Atomic**: All operations in one transaction (no race conditions)
- **Efficient**: Single round-trip to Redis

---

### **Redis Implementation (Fixed Window)**

```python
def allow_request(user_id):
    key = f"rate_limit:{user_id}:{int(time.time() / 60)}"  # Key per minute
    
    count = redis.incr(key)
    
    if count == 1:
        # First request in window → Set expiry
        redis.expire(key, 60)
    
    if count <= 100:
        return True  # Allow
    else:
        return False  # Reject
```

---

## 🎯 Step 4: High-Level Design

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. Request
       ▼
┌─────────────────────────────────────┐
│       Load Balancer (NGINX)         │
└──────────────┬──────────────────────┘
               │
               │ 2. Forward to API Server
               ▼
┌─────────────────────────────────────┐
│         API Server (Flask)          │
│  - Extract user_id                  │
│  - Check rate limit (Redis)         │
└──────────────┬──────────────────────┘
               │
               │ 3. Check rate limit
               ▼
┌─────────────────────────────────────┐
│         Redis (Rate Limiter)        │
│  - Key: rate_limit:user_id          │
│  - Value: {tokens, last_refill}     │
└─────────────────────────────────────┘
               │
               │ 4. If allowed → Process request
               │    If rejected → Return 429
               ▼
┌─────────────────────────────────────┐
│        Backend Services             │
└─────────────────────────────────────┘
```

---

## 🎯 Step 5: Flask Implementation

```python
from flask import Flask, jsonify, request
import redis
import time

app = Flask(__name__)
redis_client = redis.Redis(host='localhost', port=6379)

# Rate limit: 100 requests per minute
RATE_LIMIT = 100
WINDOW_SIZE = 60  # seconds

def check_rate_limit(user_id):
    key = f"rate_limit:{user_id}"
    now = time.time()
    window_start = now - WINDOW_SIZE
    
    # Remove old requests (outside window)
    redis_client.zremrangebyscore(key, 0, window_start)
    
    # Count requests in window
    count = redis_client.zcard(key)
    
    if count < RATE_LIMIT:
        # Add current request
        redis_client.zadd(key, {now: now})
        redis_client.expire(key, WINDOW_SIZE)
        return True  # Allow
    else:
        return False  # Reject

@app.before_request
def rate_limit_middleware():
    user_id = request.headers.get('X-User-ID', 'anonymous')
    
    if not check_rate_limit(user_id):
        # Rate limit exceeded
        retry_after = WINDOW_SIZE  # Seconds
        return jsonify({
            'error': 'Rate limit exceeded',
            'retry_after': retry_after
        }), 429

@app.route('/api/data')
def get_data():
    return jsonify({'message': 'Success'})

if __name__ == '__main__':
    app.run()
```

**Response** (rate limit exceeded):
```json
HTTP/1.1 429 Too Many Requests
Retry-After: 60

{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

---

## 🎯 Step 6: Advanced Features

### **1. Per-Tier Limits**

```python
RATE_LIMITS = {
    'free': 100,      # 100 requests/min
    'pro': 1000,      # 1000 requests/min
    'enterprise': 10000  # 10k requests/min
}

def check_rate_limit(user_id, tier):
    limit = RATE_LIMITS[tier]
    # Check against limit...
```

---

### **2. Multiple Time Windows**

```python
# Per-second, per-minute, per-hour limits
def check_rate_limits(user_id):
    checks = [
        check_rate_limit(user_id, window=1, limit=10),      # 10/sec
        check_rate_limit(user_id, window=60, limit=100),    # 100/min
        check_rate_limit(user_id, window=3600, limit=1000)  # 1000/hour
    ]
    return all(checks)  # All must pass
```

---

### **3. Rate Limit by IP**

```python
@app.before_request
def rate_limit_by_ip():
    ip = request.remote_addr
    
    if not check_rate_limit(ip):
        return jsonify({'error': 'Rate limit exceeded'}), 429
```

---

### **4. Rate Limit Headers**

```python
@app.after_request
def add_rate_limit_headers(response):
    user_id = request.headers.get('X-User-ID')
    
    remaining = get_remaining_requests(user_id)
    reset_time = get_reset_time(user_id)
    
    response.headers['X-RateLimit-Limit'] = RATE_LIMIT
    response.headers['X-RateLimit-Remaining'] = remaining
    response.headers['X-RateLimit-Reset'] = reset_time
    
    return response

# Response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 50
# X-RateLimit-Reset: 1610000000 (Unix timestamp)
```

---

## 🎯 Step 7: Optimizations

### **1. Local Cache + Redis**

**Problem**: Every request queries Redis (latency)

**Solution**: Local cache (in-memory) for rate limit data

```python
from functools import lru_cache
import time

# Local cache (expires every 1 second)
@lru_cache(maxsize=10000)
def get_rate_limit_cached(user_id, window_start):
    # Query Redis
    return check_rate_limit_redis(user_id)

def check_rate_limit(user_id):
    window_start = int(time.time())  # Current second
    return get_rate_limit_cached(user_id, window_start)
```

**Trade-off**: Less accurate (cache delay), but faster

---

### **2. Async Rate Limit Check**

**Problem**: Rate limit check blocks request processing

**Solution**: Check rate limit asynchronously (allow request, reject later)

```python
@app.before_request
async def rate_limit_async():
    user_id = request.headers.get('X-User-ID')
    
    # Check rate limit asynchronously (non-blocking)
    allowed = await check_rate_limit_async(user_id)
    
    if not allowed:
        return jsonify({'error': 'Rate limit exceeded'}), 429
```

---

## 🎯 Step 8: Real-World Examples

### **1. GitHub API**

**Rate limits**:
```
Authenticated:   5000 requests/hour
Unauthenticated: 60 requests/hour
```

**Response headers**:
```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1372700873
```

---

### **2. Twitter API**

**Rate limits**:
```
Standard: 900 requests per 15 min window (per user, per endpoint)
Example:
- GET /statuses/home_timeline: 15 requests/15min
- POST /statuses/update: 300 requests/3hours
```

**Algorithm**: Sliding window

---

### **3. Stripe API**

**Rate limits**:
```
Default: 100 requests/second (burst)
Enforced per API key
```

**Algorithm**: Token bucket (allows bursts)

---

## 🎯 Step 9: Trade-offs

| Algorithm | Pros | Cons |
|-----------|------|------|
| **Token Bucket** | Smooth traffic, allows bursts | Not precise |
| **Fixed Window** | Simple, memory efficient | Burst at boundaries |
| **Sliding Window Log** | Precise | Memory intensive |
| **Sliding Window Counter** | Balanced (smooth + efficient) | Approximate |

**Recommendation**: **Token Bucket** or **Sliding Window Counter**

---

## 🎓 Interview Tips

**Q: "How do you implement a rate limiter?"**

A: "I use **Token Bucket** algorithm with **Redis** for distributed rate limiting:

**Algorithm**:
1. Each user has a bucket with N tokens (e.g., 100)
2. Each request consumes 1 token
3. Tokens refill at rate R (e.g., 100/minute)
4. If no tokens → Reject (429 error)

**Implementation** (Redis):
```python
# Redis stores: {tokens, last_refill}
# Lua script (atomic):
# 1. Calculate elapsed time since last refill
# 2. Add tokens = elapsed × refill_rate
# 3. If tokens >= 1: Allow, decrement
# 4. Else: Reject
```

**Benefits**:
- Distributed (multiple API servers)
- Low latency (<10ms overhead)
- Allows bursts (up to capacity)

**Alternative**: Sliding Window Counter (more precise, but same complexity)

Real-world: Stripe uses Token Bucket, GitHub uses Sliding Window"

---

**Q: "How do you handle rate limiting across multiple servers?"**

A: "Use **centralized rate limiter** (Redis):

**Challenge**: Multiple API servers → Each server has own counter → Inaccurate

**Solution**: Store rate limit data in Redis (shared state)

**Implementation**:
1. Request arrives at API server
2. Server queries Redis: `check_rate_limit(user_id)`
3. Redis runs Lua script (atomic):
   - Check current count
   - If under limit: Increment count, allow
   - If over limit: Reject
4. Server returns response (200 or 429)

**Optimization**: Local cache (reduce Redis queries)
```python
# Cache rate limit data for 1 second (local)
# Only query Redis every 1 second
# Trade-off: Less accurate, but faster
```

**Backup**: If Redis down → Allow all requests (fail-open) or reject all (fail-closed)

Real-world: Twitter uses centralized rate limiter (Redis)"

---

## 📚 Summary

**Algorithms**: Token Bucket (smooth, allows bursts), Fixed Window (simple, boundary issues), Sliding Window Log (precise, memory intensive), Sliding Window Counter (balanced)

**Distributed**: Redis + Lua script (atomic operations)

**API**: 429 error, Retry-After header, X-RateLimit-* headers

**Optimizations**: Local cache, async checks

**Real-world**: GitHub (5000/hour), Twitter (sliding window), Stripe (token bucket) 🚀

