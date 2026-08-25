# 75. Hot Partition / Hot Key Problem

---

## 1. High-Level Explanation (Interview-Level Overview)

### What is the Hot Partition Problem?

**Hot partition** (hot key/hot shard) occurs when disproportionate traffic concentrates on a single partition/shard, causing overload while other shards remain idle.

**Example: Celebrity User on Instagram**

```
┌────────────────────────────────────────────────────┐
│        UNBALANCED LOAD (Hot Partition)             │
└────────────────────────────────────────────────────┘

┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  ┌─────────────┐
│ Shard 0     │  │ Shard 1     │  │ Shard 2 (HOT 🔥) │  │ Shard 3     │
│ 10M users   │  │ 10M users   │  │ 10M users        │  │ 10M users   │
│ 100 req/s   │  │ 100 req/s   │  │ 5000 req/s       │  │ 100 req/s   │
│ CPU: 10%    │  │ CPU: 10%    │  │ CPU: 95% 🔥      │  │ CPU: 10%    │
│ IDLE        │  │ IDLE        │  │ OVERLOADED       │  │ IDLE        │
└─────────────┘  └─────────────┘  └──────────────────┘  └─────────────┘
                                         ↑
                                  Celebrity user
                                  (10M followers)
                                  Each post: 10M reads

Problem:
- Shard 2 overloaded (95% CPU, 200ms P95 latency)
- Other shards idle (10% CPU, 10ms P95 latency)
- Poor resource utilization (50x imbalance)
```

### Common Causes

| Cause | Example | Impact |
|-------|---------|--------|
| **Celebrity users** | Taylor Swift (280M followers) | 10M+ reads per post |
| **Trending topics** | Twitter "#BreakingNews" | 100K tweets/min |
| **Popular products** | Black Friday iPhone sale | 1M views in 1 hour |
| **Geographic hotspots** | NYC on New Year's Eve | 10x normal traffic |
| **Time-based spikes** | Stock market at 9:30am | 100K orders/min |

---

## 2. Deep-Dive Explanation (Senior/Staff Engineer Level)

### 1. Detecting Hot Partitions

**Metrics to Monitor**:

```python
# Monitor per-shard metrics
class ShardMonitor:
    def monitor_shard_health(self, shard_id):
        metrics = {
            'requests_per_sec': self.get_qps(shard_id),
            'cpu_usage': self.get_cpu(shard_id),
            'memory_usage': self.get_memory(shard_id),
            'p50_latency': self.get_latency(shard_id, percentile=50),
            'p95_latency': self.get_latency(shard_id, percentile=95),
            'p99_latency': self.get_latency(shard_id, percentile=99),
            'error_rate': self.get_errors(shard_id)
        }
        
        # Detect hot shard
        if self.is_hot_shard(metrics):
            self.alert(f"Hot shard detected: {shard_id}", metrics)
        
        return metrics
    
    def is_hot_shard(self, metrics):
        """Detect if shard is hot (overloaded)"""
        # Average metrics across all shards
        avg_qps = self.get_avg_qps_all_shards()
        avg_cpu = self.get_avg_cpu_all_shards()
        
        # Hot shard thresholds
        qps_threshold = 3  # 3x average QPS
        cpu_threshold = 2  # 2x average CPU
        latency_threshold = 100  # P95 > 100ms
        
        return (
            metrics['requests_per_sec'] > avg_qps * qps_threshold or
            metrics['cpu_usage'] > avg_cpu * cpu_threshold or
            metrics['p95_latency'] > latency_threshold
        )

# Example detection:
shard_2_metrics = {
    'requests_per_sec': 5000,  # vs avg 100 across all shards = 50x
    'cpu_usage': 95,           # vs avg 10% = 9.5x
    'p95_latency': 250,        # vs avg 10ms = 25x
}
# Alert: "Hot shard detected: shard_2"
```

**CloudWatch/Datadog Dashboard**:

```
Shard Metrics (Last 1 Hour):
┌────────────────────────────────────────────────┐
│ Shard  │ QPS   │ CPU  │ P95 Latency │ Status  │
├────────┼───────┼──────┼─────────────┼─────────┤
│ shard0 │ 100   │ 10%  │ 10ms        │ ✅ OK   │
│ shard1 │ 120   │ 12%  │ 12ms        │ ✅ OK   │
│ shard2 │ 5000  │ 95%  │ 250ms       │ 🔥 HOT  │
│ shard3 │ 90    │ 9%   │ 9ms         │ ✅ OK   │
└────────┴───────┴──────┴─────────────┴─────────┘

Alert: Shard 2 is 50x higher QPS than average
Action: Investigate hot keys, consider mitigation
```

---

### 2. Identifying Hot Keys

**Query Analysis** (find which keys are hot):

```python
# Track access frequency per key
import collections
from datetime import datetime, timedelta

class HotKeyDetector:
    def __init__(self, window_seconds=60):
        self.window = window_seconds
        self.key_access = collections.defaultdict(list)  # key → [timestamps]
    
    def record_access(self, key):
        """Record key access"""
        now = datetime.now()
        self.key_access[key].append(now)
        
        # Cleanup old accesses (outside window)
        cutoff = now - timedelta(seconds=self.window)
        self.key_access[key] = [ts for ts in self.key_access[key] if ts > cutoff]
    
    def get_hot_keys(self, threshold_qps=100):
        """Find keys with QPS > threshold"""
        hot_keys = []
        
        for key, timestamps in self.key_access.items():
            qps = len(timestamps) / self.window
            if qps > threshold_qps:
                hot_keys.append({
                    'key': key,
                    'qps': qps,
                    'total_accesses': len(timestamps)
                })
        
        # Sort by QPS descending
        return sorted(hot_keys, key=lambda x: x['qps'], reverse=True)

# Usage:
detector = HotKeyDetector(window_seconds=60)

# Record accesses
for _ in range(10000):
    detector.record_access('user:celebrity_123')  # 10K accesses in 60s
for _ in range(100):
    detector.record_access('user:normal_456')     # 100 accesses in 60s

# Find hot keys
hot_keys = detector.get_hot_keys(threshold_qps=100)
# Result:
# [
#   {'key': 'user:celebrity_123', 'qps': 166.7, 'total_accesses': 10000},
#   # 'user:normal_456' not returned (QPS=1.67 < threshold)
# ]
```

**Redis MONITOR** (real-time key tracking):

```bash
# Connect to Redis, monitor commands
redis-cli MONITOR

# Output (sample):
1234567890.123456 [0 127.0.0.1:54321] "GET" "user:celebrity_123"
1234567890.123789 [0 127.0.0.1:54322] "GET" "user:celebrity_123"
1234567890.124012 [0 127.0.0.1:54323] "GET" "user:celebrity_123"
... (10,000 GET commands for same key in 1 minute = hot key)

# Analyze with script:
redis-cli MONITOR | awk '{print $4}' | sort | uniq -c | sort -nr | head -10
# Output:
# 10000 "user:celebrity_123"  (HOT KEY 🔥)
# 5000 "user:celebrity_456"
# 100 "user:normal_789"
```

---

### 3. Solution 1: Caching (Most Common)

**Cache Hot Keys** (reduce database load):

```python
import redis

class CacheLayer:
    def __init__(self):
        self.cache = redis.StrictRedis()
        self.db = DatabaseConnection()
        self.hot_key_ttl = 60  # Cache hot keys for 60 seconds
    
    def get_user(self, user_id):
        # Try cache first
        cache_key = f"user:{user_id}"
        cached = self.cache.get(cache_key)
        
        if cached:
            # Cache hit (no database query)
            return json.loads(cached)
        
        # Cache miss: Query database
        user = self.db.query("SELECT * FROM users WHERE user_id = ?", user_id)
        
        # Cache result
        self.cache.setex(cache_key, self.hot_key_ttl, json.dumps(user))
        
        return user

# Without cache (hot key problem):
# Celebrity user profile: 10,000 QPS to database shard
# Database: 95% CPU, 250ms P95 latency

# With cache:
# Celebrity user profile: 10,000 QPS to Redis (cache hit)
# Database: 10 QPS (cache misses only), 10% CPU, 10ms P95 latency
# Result: 99.9% cache hit rate, 1000x database load reduction
```

**Multi-Tier Caching** (local memory + Redis):

```python
class MultiTierCache:
    def __init__(self):
        self.local_cache = {}  # In-memory LRU cache (10K entries)
        self.redis = redis.StrictRedis()
        self.db = DatabaseConnection()
    
    def get_user(self, user_id):
        # Tier 1: Local memory (0.1ms, no network)
        if user_id in self.local_cache:
            return self.local_cache[user_id]
        
        # Tier 2: Redis (1ms, network call)
        cache_key = f"user:{user_id}"
        cached = self.redis.get(cache_key)
        if cached:
            user = json.loads(cached)
            self.local_cache[user_id] = user  # Populate local cache
            return user
        
        # Tier 3: Database (10ms, expensive)
        user = self.db.query("SELECT * FROM users WHERE user_id = ?", user_id)
        
        # Cache in both tiers
        self.redis.setex(cache_key, 60, json.dumps(user))
        self.local_cache[user_id] = user
        
        return user

# Performance:
# Local cache hit (80%): 0.1ms
# Redis hit (19%): 1ms
# Database miss (1%): 10ms
# Weighted average: 0.8×0.1 + 0.19×1 + 0.01×10 = 0.37ms
# 27x faster than database-only (10ms)
```

---

### 4. Solution 2: Read Replicas (Scale Reads)

**Add Read Replicas for Hot Shard**:

```python
class ShardWithReplicas:
    def __init__(self, shard_id):
        self.master = connect(f'shard_{shard_id}_master')
        self.replicas = [
            connect(f'shard_{shard_id}_replica1'),
            connect(f'shard_{shard_id}_replica2'),
            connect(f'shard_{shard_id}_replica3'),
            connect(f'shard_{shard_id}_replica4'),
            connect(f'shard_{shard_id}_replica5')
        ]
    
    def read(self, query):
        """Route reads to replicas (round-robin)"""
        replica = random.choice(self.replicas)
        return replica.query(query)
    
    def write(self, query):
        """Route writes to master"""
        return self.master.execute(query)

# Without replicas (hot shard):
# Shard 2 master: 5000 reads/sec + 100 writes/sec = 5100 QPS
# CPU: 95% (overloaded)

# With 5 read replicas:
# Shard 2 master: 100 writes/sec
# Each replica: 5000 / 5 = 1000 reads/sec
# Master CPU: 10% (writes only)
# Replica CPU: 15% each (well within capacity)
# Result: 5x read capacity, hot shard resolved
```

**Auto-Scaling Read Replicas** (dynamic):

```python
class AutoScalingShardManager:
    def monitor_and_scale(self, shard_id):
        metrics = self.get_shard_metrics(shard_id)
        
        # Hot shard detection
        if metrics['read_qps'] > 1000 and metrics['cpu'] > 80:
            # Add read replica
            self.add_read_replica(shard_id)
            print(f"Added read replica to {shard_id} (QPS={metrics['read_qps']})")
        
        # Cool shard detection
        elif metrics['read_qps'] < 200 and len(self.get_replicas(shard_id)) > 2:
            # Remove excess replica
            self.remove_read_replica(shard_id)
            print(f"Removed read replica from {shard_id} (QPS={metrics['read_qps']})")

# Example timeline:
# 10:00am: Celebrity posts photo → Shard 2 read QPS: 100 → 5000 in 5 minutes
# 10:05am: Auto-scaler detects hot shard → Add 4 read replicas
# 10:10am: Read QPS distributed: 1000 QPS per replica (5 replicas)
# 12:00pm: Traffic subsides → Read QPS: 5000 → 200
# 12:05pm: Auto-scaler removes 3 replicas (keep 2 for baseline)
```

---

### 5. Solution 3: Sub-Sharding (Split Hot Shard)

**Split Celebrity User's Data**:

```python
# Problem: Celebrity user (user_id=123) causes hot shard
# Original routing: hash(123) % 4 = 3 → Shard 3 (overloaded)

# Solution: Sub-shard celebrity user's data by content type
def get_shard_for_celebrity(user_id, resource_type):
    if not is_celebrity(user_id):
        # Normal user: Standard sharding
        return f"shard_{hash(user_id) % 4}"
    
    # Celebrity user: Sub-shard by resource type
    if resource_type == 'profile':
        return f"shard_celebrity_{user_id}_profile"
    elif resource_type == 'posts':
        return f"shard_celebrity_{user_id}_posts"
    elif resource_type == 'followers':
        return f"shard_celebrity_{user_id}_followers"
    elif resource_type == 'comments':
        return f"shard_celebrity_{user_id}_comments"

# Example:
get_shard_for_celebrity(123, 'profile')   # → shard_celebrity_123_profile
get_shard_for_celebrity(123, 'posts')     # → shard_celebrity_123_posts
get_shard_for_celebrity(123, 'followers') # → shard_celebrity_123_followers

# Result:
# - Celebrity profile reads: Dedicated shard (not mixed with normal users)
# - Celebrity posts: Separate shard (100M posts don't impact profile queries)
# - Celebrity followers: Separate shard (10M followers don't slow down posts)
# - Load distributed across 4 dedicated shards instead of 1 shared shard
```

**Geographic Sub-Sharding** (location-based hot keys):

```python
# Problem: NYC on New Year's Eve (1M users in small area = hot partition)
# Original: hash(lat, lng) % 100 → Shard 42 (NYC overloaded)

# Solution: Sub-shard NYC into smaller areas
def get_shard_for_location(lat, lng):
    # Determine region
    region = get_region(lat, lng)
    
    if region == 'NYC':
        # NYC: Sub-shard by borough
        borough = get_nyc_borough(lat, lng)  # Manhattan, Brooklyn, Queens, ...
        return f"shard_nyc_{borough}"
    else:
        # Other regions: Standard geo-sharding
        return f"shard_{hash((lat, lng)) % 100}"

# Example (New Year's Eve):
get_shard_for_location(40.7580, -73.9855)  # Times Square → shard_nyc_manhattan
get_shard_for_location(40.6782, -73.9442)  # Brooklyn → shard_nyc_brooklyn

# Result:
# - NYC load distributed across 5 borough shards (200K users each)
# - vs 1 NYC shard (1M users, overloaded)
# - 5x capacity increase for hot region
```

---

### 6. Solution 4: Rate Limiting (Throttle Hot Keys)

**Per-Key Rate Limiting**:

```python
import time
from collections import defaultdict

class RateLimiter:
    def __init__(self, max_qps_per_key=100):
        self.max_qps = max_qps_per_key
        self.key_requests = defaultdict(list)  # key → [timestamps]
    
    def allow_request(self, key):
        """Check if request allowed (token bucket algorithm)"""
        now = time.time()
        
        # Remove requests older than 1 second
        cutoff = now - 1.0
        self.key_requests[key] = [ts for ts in self.key_requests[key] if ts > cutoff]
        
        # Check if under limit
        if len(self.key_requests[key]) < self.max_qps:
            self.key_requests[key].append(now)
            return True
        else:
            # Rate limit exceeded
            return False

# Usage:
limiter = RateLimiter(max_qps_per_key=100)

def get_user(user_id):
    key = f"user:{user_id}"
    
    if not limiter.allow_request(key):
        # Rate limited
        return {"error": "Rate limit exceeded", "retry_after": 1}, 429
    
    # Proceed with request
    return get_user_from_db(user_id), 200

# Example:
# Celebrity user (user_id=123): 10,000 requests/sec
# Rate limiter allows: 100 requests/sec (10% pass)
# Rejected: 9,900 requests/sec (90% return 429 error)
# Result: Database protected from overload (100 QPS vs 10,000 QPS)
```

**Adaptive Rate Limiting** (based on shard load):

```python
class AdaptiveRateLimiter:
    def __init__(self):
        self.base_qps_per_key = 100
    
    def get_max_qps(self, shard_id):
        """Adjust rate limit based on shard load"""
        shard_cpu = get_shard_cpu(shard_id)
        
        if shard_cpu > 80:
            # Shard overloaded: Reduce rate limit
            return self.base_qps_per_key * 0.5  # 50 QPS
        elif shard_cpu > 60:
            # Shard under pressure: Normal rate limit
            return self.base_qps_per_key  # 100 QPS
        else:
            # Shard healthy: Allow higher rate
            return self.base_qps_per_key * 2  # 200 QPS
    
    def allow_request(self, key, shard_id):
        max_qps = self.get_max_qps(shard_id)
        # Check rate limit with dynamic max_qps
        return self.check_limit(key, max_qps)

# Example:
# Shard 2 CPU: 90% (overloaded) → max_qps = 50
# Shard 0 CPU: 20% (healthy) → max_qps = 200
# Result: Rate limits adapt to shard health automatically
```

---

## 3. Capacity Planning & Estimation (When Applicable)

### Hot Key Impact Calculation

**Example: Celebrity User on Instagram**

```
Assumptions:
- Celebrity: 10M followers
- Celebrity posts photo
- Each follower views photo once → 10M read requests
- Time window: 1 hour (sustained load)
- Request rate: 10M / 3600 seconds = 2,778 QPS

Without mitigation:
- All 2,778 QPS hit single shard (celebrity's home shard)
- Shard capacity: 1,000 QPS (before overload)
- Overload: 2.78x capacity (CPU 95%, P95 latency 250ms)
- Other shards: 100 QPS each (10% CPU, idle)
- Resource waste: 75% of infrastructure idle

With caching:
- Cache TTL: 60 seconds
- Cache hit rate: 99% (photo rarely changes)
- Database QPS: 2,778 × 0.01 = 28 QPS
- Shard load: 28 QPS (vs 2,778 QPS) = 100x reduction
- Shard CPU: 10% (healthy), P95 latency: 10ms
- Cost: Redis cache (~$100/month vs $10K for 10x shards)

ROI:
- Without cache: Need 10x shards ($10K/month infrastructure)
- With cache: Keep 1x shards ($1K/month) + Redis ($100/month) = $1.1K
- Savings: $8.9K/month (81% cost reduction)
```

---

## 4. Data & Storage Design

### Hot Key Tracking Table

```sql
-- Track hot keys for analysis
CREATE TABLE hot_key_metrics (
    key_name VARCHAR(255),
    shard_id VARCHAR(50),
    access_count BIGINT,
    qps DECIMAL(10,2),
    p95_latency_ms INT,
    recorded_at TIMESTAMP,
    PRIMARY KEY (key_name, recorded_at)
);

-- Index for queries
CREATE INDEX idx_qps ON hot_key_metrics(qps DESC, recorded_at);
CREATE INDEX idx_shard ON hot_key_metrics(shard_id, recorded_at);

-- Example data:
INSERT INTO hot_key_metrics VALUES
('user:celebrity_123', 'shard_2', 1000000, 2778, 250, NOW()),
('post:viral_456', 'shard_1', 500000, 1389, 120, NOW()),
('product:iphone', 'shard_3', 300000, 833, 80, NOW());

-- Query: Top 10 hot keys in last hour
SELECT key_name, shard_id, qps, p95_latency_ms
FROM hot_key_metrics
WHERE recorded_at > NOW() - INTERVAL '1 hour'
ORDER BY qps DESC
LIMIT 10;
```

---

## 5. Scalability, Reliability & Fault Tolerance

### Circuit Breaker for Hot Keys

**Prevent Cascade Failures**:

```python
import time

class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failures = {}  # key → failure count
        self.open_until = {}  # key → timestamp when circuit closes
        self.state = {}  # key → 'closed', 'open', 'half_open'
    
    def call(self, key, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        state = self.state.get(key, 'closed')
        
        if state == 'open':
            # Circuit open: Check if timeout expired
            if time.time() >= self.open_until.get(key, 0):
                self.state[key] = 'half_open'  # Try again
            else:
                # Still open: Fail fast
                raise CircuitBreakerOpen(f"Circuit open for key: {key}")
        
        try:
            # Execute function
            result = func(*args, **kwargs)
            
            # Success: Reset failures
            self.failures[key] = 0
            if state == 'half_open':
                self.state[key] = 'closed'  # Close circuit
            
            return result
        
        except Exception as e:
            # Failure: Increment counter
            self.failures[key] = self.failures.get(key, 0) + 1
            
            if self.failures[key] >= self.failure_threshold:
                # Open circuit
                self.state[key] = 'open'
                self.open_until[key] = time.time() + self.timeout
                print(f"Circuit opened for key: {key}")
            
            raise e

# Usage:
breaker = CircuitBreaker(failure_threshold=5, timeout=60)

def get_hot_key(key):
    try:
        return breaker.call(key, lambda: expensive_db_query(key))
    except CircuitBreakerOpen:
        # Circuit open: Return cached/default value
        return get_from_cache(key) or {"error": "Service temporarily unavailable"}

# Example:
# Hot key causes 5 consecutive failures (database overloaded)
# → Circuit opens (stop hitting database)
# → Return cached value or error (fail fast, protect database)
# → After 60 seconds, try again (half-open state)
```

---

## 6. Security, APIs & Governance

### Hot Key Attack Prevention (DDoS)

**Detect and Block Malicious Hot Key Creation**:

```python
class HotKeyDefender:
    def __init__(self):
        self.rate_limiter = RateLimiter()
        self.ip_blocklist = set()
    
    def is_attack(self, key, source_ip):
        """Detect if hot key is caused by attack"""
        # Check if single IP is generating excessive requests
        ip_qps = self.get_ip_qps(source_ip)
        
        if ip_qps > 1000:  # Single IP > 1000 QPS
            # Likely DDoS attack
            self.block_ip(source_ip)
            return True
        
        # Check if key access pattern is abnormal
        key_qps = self.get_key_qps(key)
        key_age = self.get_key_age(key)
        
        if key_qps > 10000 and key_age < 60:  # 10K QPS for new key
            # Likely targeted attack on new key
            self.rate_limit_key(key, max_qps=100)
            return True
        
        return False
    
    def block_ip(self, ip):
        """Add IP to blocklist"""
        self.ip_blocklist.add(ip)
        print(f"Blocked malicious IP: {ip}")
    
    def rate_limit_key(self, key, max_qps):
        """Apply aggressive rate limit to suspicious key"""
        self.rate_limiter.set_limit(key, max_qps)
        print(f"Rate limited suspicious key: {key} (max {max_qps} QPS)")

# Example:
# Attacker sends 100K requests to key "admin:delete_all" from IP 1.2.3.4
# → Defender detects: IP 1.2.3.4 generating 10K+ QPS
# → Action: Block IP, rate limit key (protect system)
```

---

## 7. Real-World Examples & Case Studies

### Twitter: Celebrity Tweets (Hot Key Problem)

**Problem**: Celebrity tweets (Justin Bieber, 113M followers) create hot partition

**Architecture Before**:
```
User timeline shard: hash(user_id) % 1000
Celebrity user_id=123 → Shard 456

When celebrity tweets:
- Fan-out: Write to 113M followers' timelines (on different shards)
- Each follower reads timeline → 113M reads to shard 456 (HOT 🔥)
- Shard 456: 100K QPS (overloaded)
- Other shards: 100 QPS (idle)
```

**Solution: Hybrid Fan-Out + Caching**

```python
def post_celebrity_tweet(user_id, tweet):
    if is_celebrity(user_id):
        # Celebrity: No fan-out (too expensive)
        # Just write to celebrity's timeline
        write_to_timeline(user_id, tweet)
        
        # Cache tweet (high read traffic expected)
        cache.set(f"tweet:{tweet.id}", tweet, ttl=3600)
        
        print(f"Celebrity tweet {tweet.id} cached (no fan-out)")
    else:
        # Normal user: Fan-out to followers
        followers = get_followers(user_id)
        for follower in followers:
            write_to_timeline(follower, tweet)

def get_user_timeline(user_id):
    # Get timeline from cache or database
    timeline = get_timeline_from_shard(user_id)
    
    # Fetch followed celebrities' tweets separately (not in timeline)
    celebrity_follows = get_celebrity_follows(user_id)
    celebrity_tweets = []
    
    for celebrity_id in celebrity_follows:
        # Fetch from cache (hot key cached)
        recent_tweets = cache.get(f"celebrity_timeline:{celebrity_id}")
        if not recent_tweets:
            recent_tweets = get_timeline_from_shard(celebrity_id)
            cache.set(f"celebrity_timeline:{celebrity_id}", recent_tweets, ttl=60)
        celebrity_tweets.extend(recent_tweets)
    
    # Merge and sort by timestamp
    merged_timeline = merge_sort(timeline, celebrity_tweets)
    return merged_timeline[:100]  # Top 100 tweets

# Result:
# - Celebrity tweets cached (99% cache hit rate)
# - Shard load: 100K QPS → 100 QPS (1000x reduction)
# - User timeline fetch: 10ms (vs 250ms before)
```

**Outcome**: Twitter handles billions of celebrity tweet reads/day with minimal database load

---

### Amazon: Black Friday Product Hot Keys

**Problem**: iPhone 15 on Black Friday (1M views/hour = 278 QPS)

**Solution: Multi-Layer Caching + CDN**

```python
def get_product(product_id):
    # Layer 1: CDN (CloudFront) - Static product page HTML
    # Cached at edge locations worldwide
    # Cache hit: 95% (200ms for US users, 50ms for local CDN)
    
    # Layer 2: Application cache (Redis) - Product data JSON
    cache_key = f"product:{product_id}"
    cached = redis.get(cache_key)
    if cached:
        return json.loads(cached)  # Cache hit (1ms)
    
    # Layer 3: Database - Fresh product data
    product = db.query("SELECT * FROM products WHERE product_id = ?", product_id)
    
    # Cache for 5 minutes (short TTL for price/inventory updates)
    redis.setex(cache_key, 300, json.dumps(product))
    
    return product

# Cache effectiveness:
# CDN: 95% hit (edge caching) → 0 application load
# Redis: 4% hit (CDN miss) → 11 QPS to Redis
# Database: 1% miss (cold cache) → 3 QPS to database

# Black Friday traffic:
# 1M views/hour = 278 QPS
# CDN: 264 QPS (95%) served from edge (no origin load)
# Redis: 11 QPS (4%) served from cache (1ms latency)
# Database: 3 QPS (1%) served from DB (10ms latency)

# Database load: 3 QPS (vs 278 QPS without caching = 93x reduction)
```

**Outcome**: Amazon handled Black Friday 2023 with 99.99% uptime, < 100ms P95 latency

---

### Discord: Viral Server Hot Partition

**Problem**: Viral Discord server (1M members) causes hot partition for message routing

**Solution: Read Replicas + Message Caching**

```python
def get_messages(guild_id, channel_id):
    # Determine shard
    shard_id = hash(guild_id) % num_shards
    
    # Check if guild is "hot" (> 100K members)
    if is_hot_guild(guild_id):
        # Hot guild: Use dedicated read replicas (5 replicas)
        replica = get_guild_replica(guild_id)
    else:
        # Normal guild: Use standard shard
        replica = get_shard_replica(shard_id)
    
    # Query messages
    messages = replica.query("""
        SELECT * FROM messages
        WHERE guild_id = ? AND channel_id = ?
        ORDER BY timestamp DESC
        LIMIT 100
    """, guild_id, channel_id)
    
    return messages

# Hot guild handling:
# - Dedicated 5 read replicas (vs 2 for normal guilds)
# - Each replica: 1M messages, 10K QPS capacity
# - Load distributed: 50K QPS / 5 replicas = 10K QPS each
# - vs shared shard: 50K QPS on single replica (overloaded)

# Result:
# - Hot guild: P95 latency 50ms (vs 500ms before)
# - Normal guilds: Unaffected (separate replicas)
```

**Outcome**: Discord handles 1M+ member servers with consistent low latency

---

## 8. Interview-Oriented Answer & Follow-Ups

### Core Question: "What is the hot partition problem and how do you solve it?"

**Structured Answer**:

**"Hot partition occurs when disproportionate traffic concentrates on a single shard, causing overload (95% CPU, high latency) while other shards remain idle. Solve with: (1) Caching (reduce database load 100-1000x), (2) Read replicas (scale reads 5-10x), (3) Sub-sharding (split hot key's data), (4) Rate limiting (protect from overload)."**

**Definition**:
```
Hot Partition:
Shard 2: 5000 QPS (95% CPU, 250ms P95 latency) 🔥 OVERLOADED
Other shards: 100 QPS (10% CPU, 10ms P95 latency) ⚠️ IDLE

Cause: Celebrity user (10M followers) on Shard 2
Impact: Poor user experience, wasted resources (75% idle)
```

**Common Causes**:
- Celebrity users (Taylor Swift 280M followers, each post = 10M+ reads)
- Trending topics (Twitter "#BreakingNews", 100K tweets/min)
- Popular products (Black Friday iPhone, 1M views/hour)
- Geographic hotspots (NYC New Year's Eve, 10x traffic)

**Solutions**:

**1. Caching (Most Effective)**:
```python
# Cache hot keys in Redis
cache.setex('user:celebrity', 60, user_data)

# Result:
# 99% cache hit rate → Database load: 5000 QPS → 50 QPS (100x reduction)
# Shard CPU: 95% → 10% (healthy)
```

**2. Read Replicas (Scale Reads)**:
```python
# Add 5 read replicas to hot shard
# Distribute 5000 reads/sec across 5 replicas = 1000 reads/sec each
# Master: Writes only (100 writes/sec)

# Result: 5x read capacity, hot shard resolved
```

**3. Sub-Sharding (Split Hot Data)**:
```python
# Celebrity user: Split data by type
if is_celebrity(user_id):
    shard = f"celebrity_{user_id}_{resource_type}"  # profile, posts, followers
else:
    shard = f"shard_{hash(user_id) % 10}"

# Result: Celebrity load distributed across 4 dedicated shards (vs 1 shared)
```

**4. Rate Limiting (Protect from Overload)**:
```python
# Limit requests per key
if key_qps > 100:
    return 429  # Too Many Requests

# Result: Database protected (100 QPS vs 5000 QPS without limit)
```

**Real-world: Twitter celebrity tweets create hot partitions. Solution: Hybrid fan-out (no fan-out for celebrities, save to cache only). When followers read timeline, fetch celebrity tweets from cache (99% hit rate). Result: Database load reduced 1000x (from 100K QPS to 100 QPS). Latency improved 25x (from 250ms to 10ms P95)."**

---

### Follow-Up 1: "How do you detect hot partitions in production?"

**Answer**:

**"Monitor per-shard metrics (QPS, CPU, latency) and alert when a shard exceeds thresholds (e.g., 3x average QPS, 2x average CPU, or P95 latency > 100ms). Use tools like CloudWatch/Datadog for dashboards, and track key-level access patterns to identify specific hot keys causing the imbalance."**

**Metrics to Monitor**:
```python
# Per-shard metrics
shard_metrics = {
    'qps': 5000,           # Requests per second
    'cpu': 95,             # CPU usage (%)
    'memory': 80,          # Memory usage (%)
    'p50_latency': 50,     # Median latency (ms)
    'p95_latency': 250,    # 95th percentile latency (ms)
    'p99_latency': 500,    # 99th percentile latency (ms)
    'error_rate': 0.1      # Error rate (%)
}

# Compare to cluster averages
avg_qps = 100  # Average across all shards
avg_cpu = 10   # Average CPU usage

# Hot shard detection
if qps > avg_qps * 3:  # 3x average
    alert("Hot shard detected: QPS 50x higher than average")
if cpu > avg_cpu * 2:  # 2x average
    alert("Hot shard detected: CPU 9.5x higher than average")
if p95_latency > 100:  # Absolute threshold
    alert("Hot shard detected: High latency (250ms P95)")
```

**Dashboard Example** (CloudWatch/Datadog):
```
Shard Health Dashboard:
┌────────────────────────────────────────────────┐
│ Metric         │ Shard 0 │ Shard 1 │ Shard 2  │
├────────────────┼─────────┼─────────┼──────────┤
│ QPS            │ 100 ✅  │ 120 ✅  │ 5000 🔥  │
│ CPU %          │ 10% ✅  │ 12% ✅  │ 95% 🔥   │
│ P95 Latency    │ 10ms ✅ │ 12ms ✅ │ 250ms 🔥 │
│ Status         │ Healthy │ Healthy │ HOT      │
└────────────────┴─────────┴─────────┴──────────┘

Alert: Shard 2 is 50x higher QPS than cluster average
Action: Investigate hot keys, add read replicas, enable caching
```

**Key-Level Tracking**:
```python
# Track access frequency per key
class HotKeyDetector:
    def record_access(self, key):
        # Increment counter
        self.key_counters[key] += 1
    
    def get_hot_keys(self, threshold=1000):
        # Find keys with > threshold accesses per minute
        hot_keys = []
        for key, count in self.key_counters.items():
            if count > threshold:
                hot_keys.append({'key': key, 'qps': count / 60})
        return sorted(hot_keys, key=lambda x: x['qps'], reverse=True)

# Example output:
# [
#   {'key': 'user:celebrity_123', 'qps': 2778},  # HOT KEY
#   {'key': 'product:iphone', 'qps': 833},
#   {'key': 'post:viral_456', 'qps': 500}
# ]
```

**Real-world: Netflix monitors shard CPU, QPS, and latency in real-time (1-minute granularity). Alert triggers when shard exceeds 80% CPU or 3x average QPS. On-call engineer investigates (check hot keys with Redis MONITOR or application logs), applies mitigation (enable caching, add replicas, or rate limit suspicious keys). Resolution time: 5-15 minutes."**

---

### Follow-Up 2: "What's the trade-off between caching and read replicas for hot keys?"

**Answer**:

**"Caching is faster and cheaper (99% hit rate, 1ms latency, $100/month Redis) but introduces stale data risk and cache invalidation complexity. Read replicas are slower and more expensive (10ms latency, $1K/month per replica) but always return fresh data and scale writes too (replicas can be promoted). Choose caching for read-heavy immutable data (profiles, posts). Choose replicas for frequently updated data (real-time scores, inventory)."**

**Caching**:

**Pros**:
- Fast: 1ms Redis vs 10ms database (10x faster)
- Cheap: $100/month Redis vs $1K/month replica (10x cheaper)
- Scales reads: 100K QPS Redis (single instance)
- Reduces database load: 99% cache hit = 100x load reduction

**Cons**:
- Stale data: Cache TTL 60s = up to 60s stale
- Invalidation complexity: Must invalidate on writes (cache stampede risk)
- Limited use case: Only helps reads (not writes)
- Memory constraint: Redis RAM limited (vs database disk storage)

**When to Use**:
- Read-heavy workload (read:write > 100:1)
- Immutable data (user profiles, posts rarely change)
- Acceptable staleness (60s stale OK for social media profiles)

---

**Read Replicas**:

**Pros**:
- Fresh data: Always up-to-date (replication lag < 1s)
- Scales reads: Add replicas (linear scaling)
- Can be promoted: Replica becomes master on failure (HA)
- No invalidation: Automatic updates via replication

**Cons**:
- Slower: 10ms database vs 1ms cache (10x slower)
- Expensive: $1K/month per replica vs $100/month cache (10x more expensive)
- Limited scale: Max ~10 replicas (vs unlimited cache instances)
- Doesn't reduce master load: Master still handles writes

**When to Use**:
- Need fresh data (real-time inventory, stock prices)
- Write-heavy workload (caching doesn't help)
- High availability required (replica promotion on master failure)

---

**Comparison Table**:

| Aspect | Caching | Read Replicas |
|--------|---------|---------------|
| **Latency** | 1ms (Redis) ✅ | 10ms (DB) ⚠️ |
| **Cost** | $100/month ✅ | $1K/month ❌ |
| **Scale** | 100K QPS ✅ | 10K QPS ⚠️ |
| **Freshness** | Stale (60s) ❌ | Fresh (<1s) ✅ |
| **Invalidation** | Complex ❌ | Automatic ✅ |
| **HA** | No failover ❌ | Promotion ✅ |
| **Use case** | Immutable reads ✅ | Fresh/HA ✅ |

**Hybrid Approach** (best of both):
```python
def get_user(user_id):
    # Layer 1: Cache (fast, handles 99% of traffic)
    cached = redis.get(f"user:{user_id}")
    if cached:
        return cached
    
    # Layer 2: Read replica (fresh data, handles 1% cache misses)
    replica = random.choice(read_replicas)
    user = replica.query("SELECT * FROM users WHERE user_id = ?", user_id)
    
    # Cache result
    redis.setex(f"user:{user_id}", 60, user)
    
    return user

# Benefits:
# - 99% requests: Cache (1ms, cheap)
# - 1% requests: Replica (10ms, fresh data)
# - Best of both worlds
```

**Real-world: Instagram uses both. User profiles cached (immutable, 99% hit rate, 1ms latency). Follower counts not cached (real-time, 100ms acceptable). Feed cached with short TTL (30s, balance freshness vs performance). Result: 90% cost savings vs replicas-only, acceptable freshness for most use cases."**

---

### Follow-Up 3: "How do you handle hot keys during traffic spikes (e.g., celebrity event)?"

**Answer**:

**"Use auto-scaling (add read replicas when CPU > 80%), pre-warming caches (cache celebrity content before event), and graceful degradation (serve stale cache or rate limit if database overloaded). Monitor in real-time and have runbooks for common scenarios (celebrity posts, breaking news, product launches)."**

**Strategy 1: Auto-Scaling Read Replicas**:
```python
def auto_scale_replicas(shard_id):
    metrics = get_shard_metrics(shard_id)
    
    if metrics['cpu'] > 80 and metrics['qps'] > 1000:
        # Hot shard detected: Add replicas
        num_replicas_to_add = min(5, int(metrics['qps'] / 1000))
        add_read_replicas(shard_id, num_replicas_to_add)
        print(f"Added {num_replicas_to_add} replicas to {shard_id}")
        
        # Wait 5 minutes for replicas to sync
        time.sleep(300)
    
    elif metrics['cpu'] < 40 and len(get_replicas(shard_id)) > 2:
        # Traffic subsided: Remove excess replicas
        remove_read_replica(shard_id)
        print(f"Removed excess replica from {shard_id}")

# Example timeline:
# 10:00am: Celebrity posts photo
# 10:01am: Shard 2 QPS: 100 → 5000 (50x spike)
# 10:02am: Auto-scaler detects hot shard (CPU 95%)
# 10:03am: Adds 5 read replicas (takes 3 minutes to provision)
# 10:06am: Replicas online, load distributed (1000 QPS per replica)
# 10:10am: Shard 2 CPU: 95% → 15% (healthy)
# 2:00pm: Traffic subsides (QPS: 5000 → 200)
# 2:05pm: Auto-scaler removes 3 replicas (keep 2 baseline)
```

**Strategy 2: Pre-Warming Caches**:
```python
def pre_warm_celebrity_content(celebrity_id):
    """Cache celebrity content before expected traffic spike"""
    # Fetch celebrity data
    user = db.query("SELECT * FROM users WHERE user_id = ?", celebrity_id)
    posts = db.query("SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100", celebrity_id)
    
    # Cache for 1 hour
    redis.setex(f"user:{celebrity_id}", 3600, json.dumps(user))
    redis.setex(f"posts:{celebrity_id}", 3600, json.dumps(posts))
    
    print(f"Pre-warmed cache for celebrity {celebrity_id}")

# Example: Grammy Awards at 8pm
# 7:30pm: Pre-warm top 100 celebrity profiles (before event)
# 8:00pm: Awards start, users browse celebrity profiles
# Cache hit: 99% (all celebrities already cached)
# Database load: Minimal (only cache misses)
```

**Strategy 3: Graceful Degradation**:
```python
def get_user_with_fallback(user_id):
    try:
        # Try fresh data from database
        replica = get_read_replica(user_id)
        return replica.query("SELECT * FROM users WHERE user_id = ?", user_id)
    
    except DatabaseOverloaded:
        # Database overloaded: Serve stale cache
        stale_cached = redis.get(f"user:{user_id}_stale")
        if stale_cached:
            print("Database overloaded, serving stale cache")
            return json.loads(stale_cached)
        
        # No stale cache: Rate limit
        raise RateLimitExceeded("Service temporarily unavailable", retry_after=60)

# Degradation levels:
# 1. Normal: Fresh data from database (10ms)
# 2. Degraded: Stale cache (1ms, may be outdated)
# 3. Critical: Rate limit (protect database from collapse)
```

**Strategy 4: Runbooks for Common Scenarios**:
```yaml
# Runbook: Celebrity Event (Concert, Awards Show)
Event: Celebrity posts photo/video
Expected Impact: 10M followers × 10% engagement = 1M views in 1 hour = 278 QPS spike

Pre-Event (30 min before):
  1. Pre-warm celebrity profile cache (TTL 2 hours)
  2. Increase read replica count (2 → 5 replicas)
  3. Alert on-call engineer (monitoring Slack channel)
  4. Set rate limit: 500 QPS per celebrity key (prevent overload)

During Event:
  1. Monitor shard metrics (CPU, QPS, latency) every 1 minute
  2. If CPU > 90%: Add read replicas (auto-scaler triggers)
  3. If P95 latency > 200ms: Enable aggressive caching (TTL 5min)
  4. If database unavailable: Serve stale cache (graceful degradation)

Post-Event (2 hours after):
  1. Remove excess read replicas (scale down to baseline)
  2. Analyze hot keys (identify top 10 for future optimization)
  3. Update cache TTLs (extend for popular content)
  4. Post-mortem: Document incidents, improve runbooks
```

**Real-world: Twitter Grammy Awards 2024. Expected: 10M tweets during show (100K TPS spike). Preparation: Pre-warmed top 500 celebrity caches, added 200 read replicas, enabled aggressive rate limiting (1K QPS per celebrity). Result: 99.95% availability, P95 latency < 50ms (vs 500ms in 2019 without preparation). Lessons: Pre-warming reduces database load 90%, auto-scaling replicas provides buffer capacity, graceful degradation prevents total outage."**

---

## 9. Pseudocode / Diagrams (When Applicable)

### Hot Partition Architecture

```
┌────────────────────────────────────────────────────────────┐
│           HOT PARTITION PROBLEM & SOLUTIONS                │
└────────────────────────────────────────────────────────────┘

BEFORE (Hot Partition):
═══════════════════════════════════════════════════════════
┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  ┌─────────────┐
│ Shard 0     │  │ Shard 1     │  │ Shard 2 (HOT 🔥) │  │ Shard 3     │
│ 10M users   │  │ 10M users   │  │ 10M users + 1    │  │ 10M users   │
│ 100 req/s   │  │ 100 req/s   │  │ celebrity        │  │ 100 req/s   │
│ CPU: 10%    │  │ CPU: 10%    │  │ 5000 req/s       │  │ CPU: 10%    │
│ Latency:10ms│  │ Latency:10ms│  │ CPU: 95% 🔥      │  │ Latency:10ms│
│ ✅ HEALTHY  │  │ ✅ HEALTHY  │  │ Latency: 250ms 🔥│  │ ✅ HEALTHY  │
└─────────────┘  └─────────────┘  └──────────────────┘  └─────────────┘
                                         ↑
                                  Celebrity user
                                  (10M followers)
                                  Each post: 10M reads
                                  = 2778 QPS sustained

Problem: 50x imbalance, poor resource utilization, bad UX


SOLUTION 1: CACHING (Most Effective)
═══════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│           Application                │
└────────────────┬─────────────────────┘
                 │
        Check cache first
                 ↓
┌────────────────────────────────────────┐
│         Redis Cache (Hot Keys)         │
│  ┌──────────────────────────────────┐ │
│  │ user:celebrity_123 (cached)       │ │
│  │ post:viral_456 (cached)           │ │
│  │ product:iphone (cached)           │ │
│  │ Cache hit: 99%                    │ │
│  │ Latency: 1ms                      │ │
│  └──────────────────────────────────┘ │
└────────────────┬───────────────────────┘
                 │ Cache miss (1%)
                 ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Shard 0     │  │ Shard 1     │  │ Shard 2     │  │ Shard 3     │
│ 100 req/s   │  │ 100 req/s   │  │ 50 req/s ✅ │  │ 100 req/s   │
│ CPU: 10%    │  │ CPU: 10%    │  │ CPU: 10% ✅ │  │ CPU: 10%    │
│ ✅ HEALTHY  │  │ ✅ HEALTHY  │  │ ✅ HEALTHY  │  │ ✅ HEALTHY  │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

Result:
- Celebrity reads: 5000 QPS → 50 QPS to database (100x reduction)
- Cache hit: 99% (4950 QPS served from cache, 1ms latency)
- Database load: Balanced (50 QPS per shard, 10% CPU)
- Cost: $100/month Redis (vs $10K for 10x shards)


SOLUTION 2: READ REPLICAS (Scale Reads)
═══════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│           Application                │
│       (Load Balancer)                │
└────────────────┬─────────────────────┘
                 │
      Distribute reads across replicas
                 │
    ┌────────────┼────────────┬────────────┬────────────┐
    ↓            ↓            ↓            ↓            ↓
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Master  │  │ Replica1│  │ Replica2│  │ Replica3│  │ Replica4│
│ Shard 2 │  │ Shard 2 │  │ Shard 2 │  │ Shard 2 │  │ Shard 2 │
│ WRITES  │  │ READS   │  │ READS   │  │ READS   │  │ READS   │
│ 100 w/s │  │ 1000 r/s│  │ 1000 r/s│  │ 1000 r/s│  │ 1000 r/s│
│ CPU: 10%│  │ CPU: 15%│  │ CPU: 15%│  │ CPU: 15%│  │ CPU: 15%│
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
     ↑            ↓            ↓            ↓            ↓
   Writes    Replication  Replication  Replication  Replication
             (async)      (async)      (async)      (async)

Result:
- Read capacity: 5000 QPS / 5 replicas = 1000 QPS per replica
- Master: Writes only (100 writes/sec, 10% CPU)
- Replicas: Reads only (1000 reads/sec each, 15% CPU)
- Cost: $1K/month per replica × 4 = $4K/month (vs caching $100/month)


SOLUTION 3: SUB-SHARDING (Split Hot Data)
═══════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│           Application                │
│  (Smart Routing: Detect Celebrity)   │
└────────────────┬─────────────────────┘
                 │
    if is_celebrity(user_id):
        Route to dedicated sub-shards
    else:
        Route to standard shards
                 │
    ┌────────────┴────────────┬────────────┬────────────┐
    ↓                         ↓            ↓            ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Celebrity    │  │ Celebrity    │  │ Celebrity    │  │ Celebrity    │
│ Sub-Shard 1  │  │ Sub-Shard 2  │  │ Sub-Shard 3  │  │ Sub-Shard 4  │
│ Profile      │  │ Posts        │  │ Followers    │  │ Comments     │
│ 1K QPS       │  │ 1.5K QPS     │  │ 1.5K QPS     │  │ 1K QPS       │
│ CPU: 20%     │  │ CPU: 25%     │  │ CPU: 25%     │  │ CPU: 20%     │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘

Result:
- Celebrity load: 5000 QPS split across 4 sub-shards (1250 QPS each)
- vs 5000 QPS on single shard (overloaded)
- Standard shards: Unaffected (normal users unchanged)


SOLUTION 4: RATE LIMITING (Protect from Overload)
═══════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│           Application                │
│        (Rate Limiter)                │
└────────────────┬─────────────────────┘
                 │
      Check rate limit before query
                 │
                 ↓
┌────────────────────────────────────────┐
│         Rate Limiter                   │
│  ┌──────────────────────────────────┐ │
│  │ Key: user:celebrity_123           │ │
│  │ Limit: 100 QPS                    │ │
│  │ Current: 95 QPS → Allow ✅        │ │
│  │                                   │ │
│  │ Key: user:celebrity_456           │ │
│  │ Limit: 100 QPS                    │ │
│  │ Current: 5000 QPS → Reject ❌     │ │
│  │ Return: 429 Too Many Requests     │ │
│  └──────────────────────────────────┘ │
└────────────────┬───────────────────────┘
                 │ Allowed requests only
                 ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Shard 0     │  │ Shard 1     │  │ Shard 2     │  │ Shard 3     │
│ 100 QPS     │  │ 100 QPS     │  │ 100 QPS ✅  │  │ 100 QPS     │
│ CPU: 10%    │  │ CPU: 10%    │  │ CPU: 10% ✅ │  │ CPU: 10%    │
│ ✅ PROTECTED│  │ ✅ PROTECTED│  │ ✅ PROTECTED│  │ ✅ PROTECTED│
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

Result:
- Celebrity requests: 5000 QPS → 100 QPS allowed (protect database)
- Rejected: 4900 QPS (98% return 429 error)
- Database: Protected from overload (100 QPS max per key)
- Trade-off: Degraded UX for 98% of celebrity requests


HYBRID APPROACH (Combine Multiple Solutions):
═══════════════════════════════════════════════════════════
┌──────────────────────────────────────┐
│           Application                │
└────────────────┬─────────────────────┘
                 │
                 ↓
┌────────────────────────────────────────┐
│  Layer 1: Rate Limiter (Protect)       │
│  Allow 1000 QPS per key (reject rest)  │
└────────────────┬───────────────────────┘
                 │ 1000 QPS allowed
                 ↓
┌────────────────────────────────────────┐
│  Layer 2: Cache (Reduce DB Load)       │
│  99% cache hit → 10 QPS to database    │
└────────────────┬───────────────────────┘
                 │ 10 QPS cache miss
                 ↓
┌────────────────────────────────────────┐
│  Layer 3: Read Replicas (Scale DB)     │
│  3 replicas × 3 QPS each = 9 QPS total│
└────────────────┬───────────────────────┘
                 │ 3 QPS per replica
                 ↓
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Replica 1   │  │ Replica 2   │  │ Replica 3   │
│ 3 QPS       │  │ 3 QPS       │  │ 3 QPS       │
│ CPU: 5%     │  │ CPU: 5%     │  │ CPU: 5%     │
│ ✅ HEALTHY  │  │ ✅ HEALTHY  │  │ ✅ HEALTHY  │
└─────────────┘  └─────────────┘  └─────────────┘

Result:
- Traffic: 5000 QPS (hot key)
- Rate limiter: 5000 → 1000 QPS (80% rejected, protect system)
- Cache: 1000 → 10 QPS (99% hit rate, reduce DB load 100x)
- Read replicas: 10 QPS / 3 = 3 QPS per replica (scale DB)
- Final DB load: 3 QPS (vs 5000 QPS without mitigation = 1667x reduction)
- Latency: 1ms (cache) vs 250ms (overloaded DB) = 250x faster
```

---

## 10. Why & How Summary (Executive-Level Wrap-Up)

### Why Hot Partition Matters

**Impact**:
- Performance degradation (250ms P95 latency vs 10ms normal)
- Resource waste (75% of infrastructure idle while 25% overloaded)
- Poor user experience (slow loads, timeouts, errors)
- Cascading failures (hot shard failure impacts all users on that shard)

**Common Scenarios**:
- Celebrity social media (10M+ followers, each post = 10M reads)
- E-commerce flash sales (Black Friday, 1M views/hour)
- Breaking news (Twitter trending topics, 100K tweets/min)
- Geographic events (NYC New Year's Eve, 10x traffic spike)

### Key Strategies

**1. Caching** (Most cost-effective):
```python
# Cache hot keys in Redis (99% hit rate)
# Cost: $100/month Redis vs $10K for 10x shards
# Latency: 1ms cache vs 10ms database (10x faster)
redis.setex('user:celebrity', 60, user_data)
```

**2. Read Replicas** (Scale database reads):
```python
# Add 5 read replicas to hot shard
# Capacity: 5000 QPS / 5 = 1000 QPS per replica
# Cost: $1K/month per replica (more expensive than caching)
```

**3. Sub-Sharding** (Split hot data):
```python
# Celebrity: Dedicated shards by resource type
# profile, posts, followers, comments = 4 shards
# Load: 5000 QPS / 4 = 1250 QPS per shard (balanced)
```

**4. Rate Limiting** (Protect from overload):
```python
# Limit 100 QPS per key (protect database)
# Rejected: 4900 / 5000 requests (98%)
# Trade-off: Degraded UX but system stability
```

### Production Checklist

- [ ] **Monitor per-shard metrics**: QPS, CPU, latency (1-min granularity)
- [ ] **Alert on hot shards**: CPU > 80%, QPS > 3x average, P95 latency > 100ms
- [ ] **Implement caching**: Redis for hot keys (99% hit rate target)
- [ ] **Auto-scale read replicas**: Add replicas when CPU > 80%
- [ ] **Track hot keys**: Log access patterns, identify top 10 hot keys
- [ ] **Rate limiting**: Per-key limits (100-1000 QPS based on capacity)
- [ ] **Pre-warm caches**: Before predictable events (celebrity concerts, product launches)
- [ ] **Graceful degradation**: Serve stale cache if database overloaded
- [ ] **Runbooks**: Document mitigation steps for common scenarios
- [ ] **Post-mortems**: Analyze hot partition incidents, improve detection/mitigation

### Bottom Line

**Hot partition is a critical scaling challenge where disproportionate traffic (celebrity users, trending topics, flash sales) concentrates on a single shard, causing overload while other shards remain idle. For FAANG interviews: Explain detection (monitor per-shard QPS/CPU/latency, alert on 3x average or 80% CPU), causes (celebrity users 10M followers, trending topics 100K TPS, geographic hotspots 10x traffic), and solutions with trade-offs: (1) Caching most cost-effective (99% hit rate, 1ms latency, $100/month, reduces DB load 100-1000x) but introduces staleness, (2) Read replicas scale database (5x capacity, $1K/month per replica, fresh data) but expensive, (3) Sub-sharding splits hot data (celebrity profile/posts/followers on separate shards) but complex routing, (4) Rate limiting protects database (100 QPS cap) but degrades UX. Real-world example: Twitter celebrity tweets create hot partitions (Justin Bieber 113M followers, each tweet = 113M reads = 31K QPS). Solution: Hybrid fan-out (no fan-out for celebrities, cache only) + multi-tier caching (99% hit rate) + read replicas (5x capacity). Result: Database load reduced 1000x (from 100K QPS to 100 QPS), latency improved 25x (from 250ms to 10ms P95), handles billions of celebrity reads/day.**

