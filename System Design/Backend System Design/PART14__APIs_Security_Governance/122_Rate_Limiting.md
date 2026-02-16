# 122. Rate Limiting

## 📌 Overview

**Rate limiting** restricts the number of requests a client can make in a time window.

**Why needed**:
- Prevent abuse (DoS attacks)
- Ensure fair usage (no single client monopolizes)
- Protect infrastructure (CPU, memory, database)
- Monetization (free tier = 100 req/hour, pro = 1000)

```
Without rate limiting:
Client sends 1M requests → Server crashes ❌

With rate limiting:
Client sends 1001st request → 429 Too Many Requests ✓
```

---

## 🎯 Rate Limiting Algorithms

### **1. Fixed Window Counter**

**Concept**: Count requests in fixed time windows (reset at boundary)

```python
# Window: 1 minute
# Limit: 100 requests

Time     | Requests | Allow?
---------|----------|-------
10:00:00 | 1        | ✓
10:00:30 | 50       | ✓
10:00:59 | 100      | ✓ (reached limit)
10:01:00 | 1        | ✓ (new window, counter reset)
```

**Implementation (Redis)**:

```python
import redis
import time

redis_client = redis.Redis()

def fixed_window_rate_limit(user_id, limit=100, window=60):
    """
    Args:
        user_id: User identifier
        limit: Max requests per window
        window: Time window in seconds (60 = 1 minute)
    Returns:
        (allowed, remaining, reset_time)
    """
    # Key: user:<id>:minute:<current_minute>
    current_minute = int(time.time() // window)
    key = f'rate_limit:{user_id}:{current_minute}'
    
    # Increment counter
    count = redis_client.incr(key)
    
    # Set expiration on first request
    if count == 1:
        redis_client.expire(key, window)
    
    # Check limit
    if count <= limit:
        remaining = limit - count
        reset_time = (current_minute + 1) * window
        return True, remaining, reset_time
    else:
        remaining = 0
        reset_time = (current_minute + 1) * window
        return False, remaining, reset_time
```

**Flask decorator**:

```python
from functools import wraps
from flask import request, jsonify

def rate_limit(limit=100, window=60):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user_id = request.headers.get('X-User-Id', request.remote_addr)
            
            allowed, remaining, reset_time = fixed_window_rate_limit(
                user_id, limit, window
            )
            
            # Set response headers
            response = f(*args, **kwargs) if allowed else jsonify({
                'error': 'RATE_LIMIT_EXCEEDED',
                'message': f'Rate limit of {limit} requests per {window}s exceeded'
            })
            
            if isinstance(response, tuple):
                response = response[0]
            
            response.headers['X-RateLimit-Limit'] = str(limit)
            response.headers['X-RateLimit-Remaining'] = str(remaining)
            response.headers['X-RateLimit-Reset'] = str(int(reset_time))
            
            if not allowed:
                response.headers['Retry-After'] = str(int(reset_time - time.time()))
                response.status_code = 429
            
            return response
        return wrapped
    return decorator

# Usage
@app.route('/api/data')
@rate_limit(limit=100, window=60)
def get_data():
    return jsonify({'data': 'value'})
```

**Pros**:
- Simple to implement
- Low memory (one counter per window)

**Cons**:
- **Burst at boundary**: 200 requests possible (100 at 10:00:59, 100 at 10:01:00)
- Not smooth (sudden reset)

---

### **2. Sliding Window Log**

**Concept**: Track timestamp of each request, count requests in rolling window

```python
# Window: 1 minute
# Limit: 100 requests

Current time: 10:00:30
Window: 09:59:30 - 10:00:30 (last 60 seconds)

# Redis sorted set:
ZADD user:123:requests 1704460830 "req1"
ZADD user:123:requests 1704460831 "req2"
...

# Count requests in window:
ZCOUNT user:123:requests 1704460770 1704460830  # Last 60 seconds
```

**Implementation**:

```python
def sliding_window_log_rate_limit(user_id, limit=100, window=60):
    key = f'rate_limit:{user_id}:log'
    now = time.time()
    window_start = now - window
    
    # Remove old entries (outside window)
    redis_client.zremrangebyscore(key, 0, window_start)
    
    # Count requests in current window
    count = redis_client.zcard(key)
    
    if count < limit:
        # Add current request
        redis_client.zadd(key, {str(now): now})
        redis_client.expire(key, window)
        return True, limit - count - 1, int(now + window)
    else:
        return False, 0, int(now + window)
```

**Pros**:
- Accurate (no burst at boundary)
- Smooth rolling window

**Cons**:
- Memory intensive (store every request timestamp)
- Expensive for high traffic (100k req/sec = 100k entries)

---

### **3. Sliding Window Counter** ⭐ (Best Balance)

**Concept**: Hybrid of fixed window + sliding window (weighted count)

```python
# Estimate current window count using previous + current window

Current time: 10:00:30 (halfway through minute)

Previous window (10:00:00-10:01:00): 80 requests
Current window  (10:01:00-10:02:00): 40 requests

# Weighted count:
overlap_percentage = (60 - 30) / 60 = 0.5  # 30 seconds into current minute
estimated_count = (80 * 0.5) + 40 = 40 + 40 = 80
```

**Implementation**:

```python
def sliding_window_counter_rate_limit(user_id, limit=100, window=60):
    now = time.time()
    current_window = int(now // window)
    previous_window = current_window - 1
    
    # Keys for current and previous windows
    current_key = f'rate_limit:{user_id}:{current_window}'
    previous_key = f'rate_limit:{user_id}:{previous_window}'
    
    # Get counts
    current_count = int(redis_client.get(current_key) or 0)
    previous_count = int(redis_client.get(previous_key) or 0)
    
    # Calculate overlap
    elapsed_time_in_window = now - (current_window * window)
    overlap_percentage = (window - elapsed_time_in_window) / window
    
    # Estimated count in sliding window
    estimated_count = (previous_count * overlap_percentage) + current_count
    
    if estimated_count < limit:
        # Increment current window
        redis_client.incr(current_key)
        redis_client.expire(current_key, window * 2)  # Keep 2 windows
        
        remaining = limit - int(estimated_count) - 1
        return True, remaining, (current_window + 1) * window
    else:
        return False, 0, (current_window + 1) * window
```

**Pros**:
- Memory efficient (2 counters)
- Smooth (considers previous window)
- Prevents burst at boundary

**Cons**:
- Approximate (not exact like log)

---

### **4. Token Bucket** ⭐ (Industry Standard)

**Concept**: Bucket holds tokens (refilled at fixed rate), request consumes token

```python
# Bucket capacity: 100 tokens
# Refill rate: 10 tokens/second

Time  | Tokens | Request | Result
------|--------|---------|-------
0s    | 100    | 1 req   | ✓ (99 tokens left)
1s    | 109    | -       | (refilled +10)
10s   | 100    | 50 req  | ✓ (50 tokens left, capped at 100)
11s   | 60     | 100 req | ❌ (only 60 tokens available)
```

**Implementation**:

```python
def token_bucket_rate_limit(user_id, capacity=100, refill_rate=10):
    """
    Args:
        capacity: Max tokens in bucket
        refill_rate: Tokens added per second
    """
    key = f'rate_limit:{user_id}:bucket'
    now = time.time()
    
    # Get bucket state
    bucket = redis_client.hgetall(key)
    
    if bucket:
        tokens = float(bucket[b'tokens'])
        last_refill = float(bucket[b'last_refill'])
    else:
        tokens = capacity
        last_refill = now
    
    # Refill tokens based on elapsed time
    elapsed = now - last_refill
    tokens = min(capacity, tokens + (elapsed * refill_rate))
    
    if tokens >= 1:
        # Consume 1 token
        tokens -= 1
        
        # Update bucket
        redis_client.hset(key, mapping={
            'tokens': tokens,
            'last_refill': now
        })
        redis_client.expire(key, 3600)  # 1 hour TTL
        
        return True, int(tokens), None
    else:
        # Not enough tokens
        time_until_token = (1 - tokens) / refill_rate
        return False, 0, now + time_until_token
```

**Pros**:
- Smooth (allows bursts if bucket full)
- Flexible (configure capacity + refill rate independently)
- Widely used (AWS API Gateway, Stripe)

**Cons**:
- More complex implementation

---

### **5. Leaky Bucket**

**Concept**: Requests enter queue, processed at fixed rate (smooths bursts)

```python
# Queue capacity: 100 requests
# Process rate: 10 requests/second

Requests come in bursts → Queue buffers → Steady output

Time  | Queue | In  | Out | Result
------|-------|-----|-----|-------
0s    | 0     | 50  | 0   | ✓ (queue = 50)
1s    | 40    | 0   | 10  | (processed 10, queue = 40)
5s    | 0     | 0   | 10  | (processed 10/s, queue empty)
6s    | 0     | 150 | 10  | ❌ (queue capacity 100, reject 50)
```

**Use case**: Smooth traffic spikes (less common than token bucket)

---

## 🎯 Rate Limit Response

### **HTTP Status Code**

```
429 Too Many Requests
```

### **Response Headers**

```
X-RateLimit-Limit: 100        # Max requests in window
X-RateLimit-Remaining: 0      # Requests left
X-RateLimit-Reset: 1704460800 # Unix timestamp when resets
Retry-After: 60               # Seconds until retry allowed
```

### **Response Body**

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit of 100 requests per minute exceeded",
  "limit": 100,
  "window": "1 minute",
  "retry_after": 60
}
```

---

## 🎯 Distributed Rate Limiting

### **Problem**: Multiple servers need shared state

```
Server 1: Tracks 50 requests from User A
Server 2: Tracks 50 requests from User A
Total: 100 requests (but limit is 60) ❌
```

### **Solution: Centralized State (Redis)**

```python
# All servers share Redis
Server 1 → Redis.incr('user:A')  # Count = 50
Server 2 → Redis.incr('user:A')  # Count = 100

# Consistent count across servers ✓
```

**Redis Lua script (atomic)**:

```python
RATE_LIMIT_SCRIPT = """
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('incr', key)
if current == 1 then
    redis.call('expire', key, window)
end
if current > limit then
    return 0
else
    return limit - current
end
"""

def rate_limit_lua(user_id, limit=100, window=60):
    key = f'rate_limit:{user_id}:{int(time.time() // window)}'
    
    # Execute atomic Lua script
    remaining = redis_client.eval(
        RATE_LIMIT_SCRIPT,
        1,  # Number of keys
        key, limit, window
    )
    
    return remaining > 0, remaining
```

---

## 🎯 Rate Limiting Strategies

### **1. Per-User Limit** (Authenticated)

```python
# Identify by user ID (from JWT token)
user_id = request.headers.get('X-User-Id')
rate_limit_key = f'rate_limit:{user_id}'
```

### **2. Per-IP Limit** (Anonymous)

```python
# Identify by IP address
ip = request.remote_addr
rate_limit_key = f'rate_limit:ip:{ip}'
```

### **3. Per-Endpoint Limit**

```python
# Different limits for different endpoints
@app.route('/api/search')
@rate_limit(limit=10, window=60)  # Expensive: 10/min
def search():
    pass

@app.route('/api/users')
@rate_limit(limit=100, window=60)  # Cheap: 100/min
def list_users():
    pass
```

### **4. Tiered Limits**

```python
# Different limits based on user tier
def get_rate_limit(user):
    if user.tier == 'free':
        return 100, 3600  # 100 requests/hour
    elif user.tier == 'pro':
        return 1000, 3600  # 1000 requests/hour
    elif user.tier == 'enterprise':
        return float('inf'), 0  # Unlimited
```

---

## 🎯 Real-World Examples

### **1. GitHub API**

```
# Authenticated requests
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4999
X-RateLimit-Reset: 1704460800

# Unauthenticated requests (per IP)
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
```

**Rate limits**:
- Authenticated: 5,000 requests/hour
- Unauthenticated: 60 requests/hour
- Search API: 30 requests/minute

### **2. Stripe API**

```
# Rate limiting (per account)
Stripe-RateLimit-Limit: 100
Stripe-RateLimit-Remaining: 99
Stripe-RateLimit-Reset: 1704460800

# Limit: 100 requests/second
```

**Algorithm**: Token bucket

### **3. Twitter API**

```
# Different limits per endpoint

GET /statuses/home_timeline:
- 15 requests / 15 minutes

GET /search/tweets:
- 180 requests / 15 minutes

POST /statuses/update:
- 300 requests / 3 hours
```

---

## ✅ Best Practices

### **1. Return Informative Headers**

```python
# Always include rate limit info
response.headers['X-RateLimit-Limit'] = '100'
response.headers['X-RateLimit-Remaining'] = '45'
response.headers['X-RateLimit-Reset'] = '1704460800'
response.headers['Retry-After'] = '60'  # 429 responses
```

### **2. Use Redis for Distributed Systems**

```python
# Centralized state across servers
redis_client = redis.Redis(host='redis.example.com')

# NOT:
in_memory_counter = {}  # Each server has separate state ❌
```

### **3. Graceful Degradation**

```python
try:
    allowed, remaining, reset = rate_limit_check(user_id)
except redis.ConnectionError:
    # Redis down → Allow request (fail open)
    logger.error('Redis connection failed, allowing request')
    allowed = True
```

### **4. Rate Limit by Cost**

```python
# Expensive endpoints = lower limit
@rate_limit(limit=10, window=60)  # 10/min
def search_all_data():
    pass

# Cheap endpoints = higher limit
@rate_limit(limit=1000, window=60)  # 1000/min
def get_cached_data():
    pass
```

### **5. Whitelist Critical Clients**

```python
# Skip rate limiting for internal services
if request.headers.get('X-Internal-Service') == 'true':
    # Bypass rate limit
    pass
```

---

## 🎓 Interview Tips

**Q: "How does rate limiting work?"**

A: "Rate limiting restricts requests from a client in a time window.

**Algorithms**:

1. **Token Bucket** (most common):
   - Bucket holds tokens (capacity 100)
   - Refills at rate (10 tokens/sec)
   - Request consumes 1 token
   - If no tokens → 429 Too Many Requests
   - Used by: AWS API Gateway, Stripe

2. **Sliding Window Counter**:
   - Tracks current + previous window
   - Weighted count prevents boundary bursts
   - Memory efficient (2 counters)

3. **Fixed Window**:
   - Simple counter per window
   - Resets at boundary (e.g., every minute)
   - Con: Burst at boundary (200 req possible)

**Implementation** (Redis distributed):
```python
key = f'user:{user_id}:{current_minute}'
count = redis.incr(key)
redis.expire(key, 60)
if count > limit:
    return 429
```

**Response**: 429 with headers X-RateLimit-Limit/Remaining/Reset + Retry-After"

**Q: "How do you implement rate limiting in a distributed system?"**

A: "Challenge: Multiple servers tracking same user

**Solution: Centralized state (Redis)**

```python
# All servers share Redis cluster
Server 1: redis.incr('user:123')  # Count = 50
Server 2: redis.incr('user:123')  # Count = 51
# Consistent across servers ✓
```

**Atomic operations** (Lua script):
```lua
local count = redis.call('incr', key)
if count == 1 then
    redis.call('expire', key, 60)
end
return count
```

**Scaling Redis**:
- Redis Cluster (sharding by key)
- Redis Sentinel (high availability)
- Backup: If Redis down, fail open (allow requests) to avoid outage"

**Q: "What are different rate limiting strategies?"**

A: "Strategies:

1. **Per-user** (authenticated):
   - Identify by user ID (JWT token)
   - Fair per-user limits

2. **Per-IP** (anonymous):
   - Identify by IP address
   - Prevent abuse from unauthenticated

3. **Per-endpoint**:
   - Expensive endpoints (search) = low limit
   - Cheap endpoints (get by ID) = high limit

4. **Tiered**:
   - Free tier: 100 req/hour
   - Pro tier: 1,000 req/hour
   - Enterprise: Unlimited

5. **Per-resource**:
   - Each user's own resources = high limit
   - Other users' resources = low limit

Real-world: GitHub 5,000 req/hour authenticated, 60 req/hour IP"

---

## 📚 Summary

**Rate Limiting**: Restrict requests per time window (prevent abuse, ensure fairness)

**Algorithms**: Token Bucket (industry standard), Sliding Window Counter (balance), Fixed Window (simple)

**Implementation**: Redis for distributed state, Lua scripts for atomicity

**Response**: 429 Too Many Requests + headers (Limit/Remaining/Reset/Retry-After)

**Strategies**: Per-user, per-IP, per-endpoint, tiered (free vs pro) 🚀

