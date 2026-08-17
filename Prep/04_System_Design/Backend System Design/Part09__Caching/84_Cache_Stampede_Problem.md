# 84. Cache Stampede Problem

---

## 1. High-Level Explanation

**Cache stampede** (also called **thundering herd**) occurs when many clients simultaneously request the same expired cache key, causing all requests to hit the database at once, overwhelming it.

**The Scenario**:
```
t=0: Popular cache key expires (e.g., "trending_videos" TTL reaches 0)
t=0.001: 10,000 concurrent requests for "trending_videos"
t=0.001: All 10,000 requests: Cache MISS ❌
t=0.001: All 10,000 threads query database simultaneously (stampede 🔥)

Result:
- Database overloaded: 10,000 simultaneous queries
- P95 latency: 10ms → 5,000ms (500x slower)
- CPU: 10% → 100% (database at capacity)
- Errors: 0% → 30% (timeouts, connection pool exhausted)
```

**The Impact**: Database crashes, cascading failures, outages (common cause of production incidents).

---

## 2. Deep-Dive Explanation

### Why It Happens

**High-traffic keys** (trending content, popular users, homepage):
- Accessed thousands of times per second
- When TTL expires, all concurrent requests miss cache
- Database unprepared for sudden 1,000x spike

**Example: Netflix Homepage**
```
Normal operation:
- Cache key: "homepage:featured" (featured movies list)
- TTL: 5 minutes (300 seconds)
- Traffic: 100,000 requests/sec (all served from cache)
- Database load: 0 queries/sec (cache hit ratio 100%)

Cache expiration:
- t=300s: TTL expires, cache key deleted
- t=300.001s: 100,000 requests/sec all MISS cache
- t=300.001s: 100,000 threads query database (stampede 🔥)
- Database load: 0 → 100,000 queries/sec (instant 100,000× spike)
- Database overloaded: CPU 10% → 100%, P95 latency 10ms → 10,000ms
- Errors: Connection pool exhausted, timeouts, HTTP 500 errors

Impact:
- Netflix homepage down for 30 seconds (database recovers slowly)
- Millions of users see errors (poor experience)
- Revenue loss: $500K (30s downtime × $1M/minute revenue)
```

---

## 3. Solutions

### Solution 1: Distributed Locking (Only 1 Thread Fetches)

**Concept**: Acquire lock on cache miss; only lock holder queries database, others wait.

```python
import redis
import time

def get_trending_videos_with_lock():
    cache_key = 'trending:videos'
    lock_key = f'lock:{cache_key}'
    
    # Check cache first
    cached = cache.get(cache_key)
    if cached:
        return cached  # Cache hit ✅
    
    # Cache miss: Try to acquire lock
    if cache.set(lock_key, 1, nx=True, ex=10):  # Lock for 10 seconds
        try:
            # This thread won the lock: Fetch from database
            print('🔒 Lock acquired, querying database...')
            videos = db.query('SELECT * FROM trending_videos LIMIT 50')
            
            # Populate cache
            cache.setex(cache_key, 300, json.dumps(videos))
            print('✅ Cache populated')
            
            return videos
        finally:
            cache.delete(lock_key)  # Release lock
    else:
        # Another thread holds lock: Wait and retry
        print('⏳ Lock held by another thread, waiting...')
        time.sleep(0.1)  # Wait 100ms
        return get_trending_videos_with_lock()  # Retry (should be cached now)

# Result:
# - Thread 1: Acquires lock, queries database (10ms query)
# - Threads 2-10,000: Wait 100ms, then get from cache (1ms)
# - Database load: 1 query (vs 10,000 without locking) ✅
# - P95 latency: 100ms (wait time) vs 5,000ms (database overload)
```

**Pros**: Prevents stampede (only 1 database query)  
**Cons**: Increased latency for waiting threads (100ms wait vs 1ms cache hit)

---

### Solution 2: Early Expiration (Refresh Before TTL)

**Concept**: Refresh cache before TTL expires (while still serving stale data).

```python
def get_trending_videos_early_refresh():
    cache_key = 'trending:videos'
    cached = cache.get(cache_key)
    
    if cached:
        # Check TTL remaining
        ttl = cache.ttl(cache_key)
        
        # If TTL < 30 seconds, refresh asynchronously (while serving stale)
        if ttl < 30:
            print(f'⏰ TTL low ({ttl}s), refreshing cache in background...')
            threading.Thread(target=refresh_cache_background).start()
        
        return cached  # Return cached value (still valid, even if stale soon)
    
    # Cache miss (rare, only if refresh failed)
    return refresh_cache_foreground()

def refresh_cache_background():
    """Background refresh (non-blocking, before TTL expires)"""
    videos = db.query('SELECT * FROM trending_videos LIMIT 50')
    cache.setex('trending:videos', 300, json.dumps(videos))
    print('✅ Cache refreshed in background')

def refresh_cache_foreground():
    """Foreground refresh (blocking, for cache miss)"""
    videos = db.query('SELECT * FROM trending_videos LIMIT 50')
    cache.setex('trending:videos', 300, json.dumps(videos))
    return videos

# Timeline:
# t=270s: TTL = 30s remaining, trigger background refresh
# t=270s: Background thread queries database (async, non-blocking)
# t=270s: User requests served from cache (stale, but valid for 30s)
# t=271s: Background refresh completes, cache updated
# t=300s: TTL expires, but cache already refreshed (no stampede ✅)

# Result:
# - Cache never empty (refreshed before expiration)
# - No stampede (database load predictable: 1 query every 5 min)
# - P95 latency: 1ms (cache hit, no waiting)
```

**Pros**: No stampede, low latency (no waiting)  
**Cons**: Complexity (background refresh logic), may serve stale data for 30s

---

### Solution 3: Probabilistic Early Expiration

**Concept**: Randomly trigger refresh before TTL expires (probability increases as TTL approaches 0).

```python
import random
import time

def get_trending_videos_probabilistic():
    cache_key = 'trending:videos'
    cached = cache.get(cache_key)
    
    if cached:
        # Check TTL remaining
        ttl = cache.ttl(cache_key)
        ttl_total = 300  # Original TTL (5 minutes)
        
        # Probability of refresh increases as TTL decreases
        # P(refresh) = (ttl_total - ttl) / ttl_total
        # Example: ttl=270s → P=10%, ttl=30s → P=90%
        refresh_probability = (ttl_total - ttl) / ttl_total
        
        if random.random() < refresh_probability:
            print(f'🎲 Random refresh triggered (P={refresh_probability:.0%})')
            threading.Thread(target=refresh_cache_background).start()
        
        return cached  # Return cached value
    
    # Cache miss
    return refresh_cache_foreground()

# Timeline:
# t=270s: TTL=30s, P(refresh)=10%, 10% of requests trigger refresh
# t=285s: TTL=15s, P(refresh)=50%, 50% of requests trigger refresh
# t=295s: TTL=5s, P(refresh)=98%, 98% of requests trigger refresh
# t=300s: TTL=0s, cache likely refreshed (no stampede ✅)

# Result:
# - Distributed refresh (multiple threads may refresh, but staggered)
# - No stampede (cache refreshed probabilistically before expiration)
# - Simple implementation (no locking, no background workers)
```

**Pros**: Simple, distributed refresh, no locking complexity  
**Cons**: Redundant database queries (multiple threads may refresh), less predictable

---

### Solution 4: Jittered TTL (Random Expiration Times)

**Concept**: Add random jitter to TTL (avoid all keys expiring simultaneously).

```python
def cache_with_jitter(key, value, base_ttl=300):
    """Cache with randomized TTL (avoid synchronized expiration)"""
    # Add ±20% jitter to TTL
    # Example: base_ttl=300s → actual_ttl=240-360s (random)
    jitter = random.uniform(0.8, 1.2)  # 80%-120% of base_ttl
    actual_ttl = int(base_ttl * jitter)
    
    cache.setex(key, actual_ttl, value)
    print(f'✅ Cached with TTL={actual_ttl}s (base={base_ttl}s, jitter={jitter:.2f})')

# Example: Cache 1,000 trending videos
for i in range(1000):
    video_id = i
    video_data = get_video_data(video_id)
    cache_with_jitter(f'video:{video_id}', video_data, base_ttl=300)

# Result:
# - Video 1: TTL=240s (expires at t=240s)
# - Video 2: TTL=315s (expires at t=315s)
# - Video 3: TTL=288s (expires at t=288s)
# - ...
# - Expiration times spread over 240-360s (120s window)
# - No synchronized expiration (no stampede ✅)
```

**Pros**: Simple, prevents synchronized expiration  
**Cons**: Doesn't prevent stampede for single high-traffic key (only helps if many keys expire at once)

---

### Solution 5: Request Coalescing (Deduplicate Inflight Requests)

**Concept**: Merge duplicate concurrent requests into single database query.

```python
from threading import Lock

class RequestCoalescer:
    def __init__(self):
        self.inflight = {}  # key → Future (pending result)
        self.locks = {}  # key → Lock
    
    def get(self, key, fetch_func):
        """Get value, coalescing duplicate concurrent requests"""
        # Check if request already in flight
        if key in self.inflight:
            print(f'🔗 Request in flight, waiting for result: {key}')
            return self.inflight[key].result()  # Wait for pending result
        
        # No inflight request: Fetch from database
        lock = self.locks.setdefault(key, Lock())
        with lock:
            # Double-check (another thread may have fetched while we waited for lock)
            if key in self.inflight:
                return self.inflight[key].result()
            
            # Mark request as inflight
            future = Future()
            self.inflight[key] = future
            
            try:
                print(f'🚀 Fetching from database: {key}')
                result = fetch_func()  # Fetch from database
                future.set_result(result)
                return result
            finally:
                del self.inflight[key]  # Remove from inflight

# Usage
coalescer = RequestCoalescer()

def get_trending_videos():
    return coalescer.get('trending:videos', lambda: db.query('SELECT * FROM trending_videos'))

# Result:
# - 10,000 concurrent requests for "trending:videos"
# - Thread 1: Fetches from database (marks as inflight)
# - Threads 2-10,000: Wait for Thread 1 result (coalesced)
# - Database load: 1 query (vs 10,000 without coalescing) ✅
```

**Pros**: Prevents stampede, no locking complexity (coalescing automatic)  
**Cons**: Increased latency for waiting threads (wait for database query to complete)

---

## 4. Comparison Table

| Solution | Prevents Stampede? | Latency | Complexity | Best For |
|----------|-------------------|---------|------------|----------|
| **Distributed Locking** | ✅ Yes (1 query) | Medium (100ms wait) | Medium (lock logic) | General purpose |
| **Early Expiration** | ✅ Yes (refresh before TTL) | Low (1ms cache) | Medium (background refresh) | High-traffic keys |
| **Probabilistic Expiration** | ✅ Yes (distributed refresh) | Low (1ms cache) | Low (simple) | General purpose |
| **Jittered TTL** | ⚠️ Partial (spreads expiration) | Low (1ms cache) | Low (simple) | Many keys expire together |
| **Request Coalescing** | ✅ Yes (deduplicate requests) | Medium (wait for query) | High (track inflight) | Extremely high concurrency |

---

## 5. Real-World Examples

**Twitter Trending Hashtags** (Early Expiration):
- Trending list cached for 1 minute (TTL=60s)
- Background refresh at TTL=30s (before expiration)
- 1M requests/sec, all served from cache (no stampede)
- Database load: 1 query/min (predictable)

**Reddit r/all Homepage** (Distributed Locking):
- Homepage cached for 5 minutes (TTL=300s)
- 500K requests/sec on cache miss (after expiration)
- Distributed lock: Only 1 thread queries database, 499,999 wait
- Database load: 1 query per expiration (vs 500K stampede)

**Netflix Featured Content** (Request Coalescing):
- Featured movies cached for 10 minutes (TTL=600s)
- 1M requests/sec globally, cache expires simultaneously
- Request coalescing: 1M concurrent requests merged into 1 database query
- Database load: 1 query per expiration (vs 1M stampede)

---

## 6. Interview Answer

**"Cache stampede (thundering herd) occurs when many clients simultaneously request same expired cache key, all hit database at once, overwhelming it (10,000 concurrent requests 10,000× database load P95 latency 10ms → 5,000ms database crashes). Common for high-traffic keys (trending videos, homepage, popular users) with synchronized TTL expiration. Five solutions: (1) Distributed locking (acquire lock on miss only 1 thread queries DB 9,999 wait, prevents stampede but 100ms wait latency), (2) Early expiration (refresh before TTL-30s background async while serving stale, no stampede 1 query every 5 min predictable, low latency 1ms cache hit but may serve stale 30s), (3) Probabilistic expiration (random refresh trigger P(refresh) increases as TTL decreases, simple no locking but redundant queries multiple threads refresh), (4) Jittered TTL (add ±20% randomness 300s → 240-360s spread expiration, simple but doesn't help single high-traffic key), (5) Request coalescing (merge duplicate concurrent requests 1 DB query 9,999 wait, prevents stampede but high complexity track inflight). Choose based on workload: General purpose → distributed locking (simple medium latency), High-traffic → early expiration (low latency no waiting), Extremely high concurrency → request coalescing (deduplicate 1M requests). Real-world: Twitter trending early expiration (1M requests/sec refresh at TTL-30s 1 query/min predictable), Reddit r/all distributed locking (500K requests/sec only 1 queries DB 499,999 wait), Netflix featured request coalescing (1M concurrent requests merged 1 DB query)."**

---

## 7. Monitoring & Alerting

**Metrics to Track**:
```python
# 1. Concurrent cache misses (detect stampede)
concurrent_misses = count_concurrent_requests_for_same_key()
# Alert if >100 concurrent misses for same key (potential stampede)

# 2. Database query spikes (sudden load increase)
db_query_rate_spike = (current_qps - baseline_qps) / baseline_qps
# Alert if spike >10× (10,000% increase = stampede)

# 3. Cache hit ratio drop (synchronized expiration)
hit_ratio_drop = baseline_hit_ratio - current_hit_ratio
# Alert if drop >20% (99% → 79% = many keys expired)

# 4. P95 latency spike (database overload)
latency_spike = (current_p95 - baseline_p95) / baseline_p95
# Alert if spike >10× (10ms → 100ms = database struggling)
```

**Alerting**:
```python
# Alert if stampede detected
if concurrent_misses > 100:
    alert('Cache stampede detected: {} concurrent misses for key={}'.format(
        concurrent_misses, cache_key
    ))

# Alert if database overloaded (P95 latency spike)
if latency_spike > 10:
    alert('Database overload: P95 latency {}ms → {}ms ({}× spike)'.format(
        baseline_p95, current_p95, latency_spike
    ))
```

---

## 8. Bottom Line

**Cache stampede (thundering herd) is critical problem where many clients simultaneously request expired cache key causing all to hit database at once overwhelming it (10,000 concurrent requests 10,000× database load instant spike P95 latency 10ms → 5,000ms CPU 10% → 100% database crashes errors 30% timeouts). Common for high-traffic keys (trending videos homepage popular users) with synchronized TTL expiration (300s TTL all 10,000 requests miss cache at exactly 300s). Five solutions: Distributed locking (acquire lock only 1 thread queries DB 9,999 wait, prevents stampede 1 DB query vs 10,000, medium latency 100ms wait), Early expiration (refresh before TTL-30s background async serve stale, no stampede 1 query/5min predictable, low latency 1ms cache but stale 30s), Probabilistic expiration (random refresh P(refresh) increases as TTL decreases P=10% at TTL-30s P=90% at TTL-5s, simple no locking but redundant queries), Jittered TTL (add ±20% randomness 300s → 240-360s spread expiration, simple but doesn't help single high-traffic key only many keys), Request coalescing (merge duplicate concurrent requests 1M requests → 1 DB query, prevents stampede but high complexity track inflight). Choose: General purpose → distributed locking (simple medium latency 100ms), High-traffic keys → early expiration (low latency 1ms no waiting refresh before expiration), Extremely high concurrency → request coalescing (1M requests deduplicated 1 query). Real-world: Twitter trending early expiration (1M requests/sec refresh at TTL-30s 1 query/min predictable database load), Reddit r/all distributed locking (500K requests/sec cache expires only 1 thread queries DB 499,999 wait prevents stampede), Netflix featured request coalescing (1M concurrent requests globally merged 1 DB query vs 1M stampede). Monitor: Concurrent cache misses (>100 for same key alert stampede), database query spikes (>10× baseline alert overload), cache hit ratio drop (>20% drop alert synchronized expiration), P95 latency spike (>10× baseline alert database struggling). Critical for production: Wrong handling causes outages (database crashes cascading failures Netflix homepage down 30s $500K revenue loss 30s × $1M/min).**

