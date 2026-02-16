# 83. Cache Consistency

---

## 1. High-Level Explanation

**Cache consistency** ensures that cached data matches the source of truth (database) across distributed systems. Inconsistency leads to stale reads, data conflicts, and poor user experience.

**The Challenge**: Multiple cache layers (client, CDN, server, database) + distributed systems = complex consistency management.

**Common Issues**:
- **Stale data**: Cache has old value while database has new value
- **Cache-database drift**: Cache and database diverge over time
- **Thundering herd**: Many clients simultaneously fetch same expired key (database overload)

---

## 2. Deep-Dive Explanation

### 1. Consistency Models

**Strong Consistency** (cache always matches database):
```python
def update_user(user_id, new_data):
    # Write to database first (source of truth)
    db.execute('UPDATE users SET name = ? WHERE id = ?', new_data['name'], user_id)
    
    # Immediately update cache (synchronous)
    cache.setex(f'user:{user_id}', 300, json.dumps(new_data))
    
    # Cache now consistent with database ✅

# Pros: No stale reads, always fresh data
# Cons: Write latency (2 writes: DB + cache), complexity (must update all caches)
# Best for: Critical data (bank balance, inventory)
```

**Eventual Consistency** (cache eventually matches database, TTL-based):
```python
def update_user(user_id, new_data):
    # Write to database only
    db.execute('UPDATE users SET name = ? WHERE id = ?', new_data['name'], user_id)
    
    # Cache invalidation (delete key, next read fetches fresh)
    cache.delete(f'user:{user_id}')
    
    # OR: Wait for TTL to expire (passive invalidation)
    # Cache stale for up to TTL (5 minutes) ⚠️

# Pros: Simple, low write latency
# Cons: Stale reads (up to TTL), cache-database drift possible
# Best for: Non-critical data (user profiles, product descriptions)
```

---

### 2. Common Consistency Problems

**Problem 1: Race Condition (Stale Data Reintroduced)**

```python
# Timeline:
# t=0: Thread 1 reads old data from DB (price=999)
# t=1: Thread 2 updates DB (price=899), invalidates cache
# t=2: Thread 1 caches old data (price=999) ❌ Stale data!

# Thread 1:
old_data = db.query('SELECT * FROM products WHERE id = 123')  # price=999
time.sleep(2)  # Simulate slow operation
cache.set('product:123', old_data)  # ❌ Caches stale data (price=999)

# Thread 2:
db.execute('UPDATE products SET price = 899 WHERE id = 123')
cache.delete('product:123')  # Invalidate cache

# Result: Cache has price=999 (stale), DB has price=899 (fresh)
```

**Solution: Versioning / CAS (Check-And-Set)**
```python
def cache_with_version(key, value):
    # Get current version from cache
    version_key = f'{key}:version'
    current_version = cache.get(version_key) or 0
    
    # Only cache if version matches (prevent stale data)
    if cache.setnx(f'{key}:{current_version}', value):
        cache.incr(version_key)  # Increment version
        return True
    return False  # Version mismatch, don't cache

# Thread 1: Tries to cache old data (version=1)
cache_with_version('product:123', old_data)  # Fails (version=2 now) ✅

# Thread 2: Updates DB, invalidates cache, increments version
db.execute('UPDATE products SET price = 899 WHERE id = 123')
cache.delete('product:123')
cache.incr('product:123:version')  # version=2

# Result: Stale data prevented, version mismatch detected
```

---

**Problem 2: Thundering Herd (Cache Miss Storm)**

```python
# Timeline:
# t=0: Cache key expires (TTL reached)
# t=0.001: 1,000 concurrent requests for same key
# t=0.001: All 1,000 requests: Cache miss! ❌
# t=0.001: All 1,000 threads query database simultaneously (thundering herd 🔥)

# Result: Database overloaded (1,000 simultaneous queries), P95 latency spikes

# ❌ Bad: No protection
def get_product(product_id):
    cached = cache.get(f'product:{product_id}')
    if cached:
        return cached
    
    # Cache miss: All threads query DB simultaneously
    product = db.query('SELECT * FROM products WHERE id = ?', product_id)
    cache.setex(f'product:{product_id}', 300, json.dumps(product))
    return product
```

**Solution 1: Distributed Locking (Only 1 Thread Fetches)**
```python
import redis

def get_product_with_lock(product_id):
    cache_key = f'product:{product_id}'
    lock_key = f'lock:{product_id}'
    
    # Check cache
    cached = cache.get(cache_key)
    if cached:
        return cached  # Cache hit ✅
    
    # Cache miss: Acquire lock (only 1 thread fetches from DB)
    if cache.set(lock_key, 1, nx=True, ex=10):  # Lock for 10 seconds
        try:
            # This thread won the lock: Fetch from DB
            product = db.query('SELECT * FROM products WHERE id = ?', product_id)
            cache.setex(cache_key, 300, json.dumps(product))
            return product
        finally:
            cache.delete(lock_key)  # Release lock
    else:
        # Another thread holds lock: Wait and retry
        time.sleep(0.1)  # Wait 100ms
        return get_product_with_lock(product_id)  # Retry (should be cached now)

# Result:
# - 1 thread fetches from DB (lock holder)
# - 999 threads wait 100ms, then get from cache
# - Database: 1 query (vs 1,000 without locking) ✅
```

**Solution 2: Early Expiration (Refresh Before TTL)**
```python
def get_product_early_refresh(product_id):
    cache_key = f'product:{product_id}'
    cached = cache.get(cache_key)
    
    if cached:
        # Check TTL remaining
        ttl = cache.ttl(cache_key)
        
        # If TTL < 30 seconds, refresh asynchronously (before expiration)
        if ttl < 30:
            threading.Thread(target=refresh_cache, args=(product_id,)).start()
        
        return cached  # Return cached value (still valid)
    
    # Cache miss (rare, only if not refreshed in time)
    product = db.query('SELECT * FROM products WHERE id = ?', product_id)
    cache.setex(cache_key, 300, json.dumps(product))
    return product

def refresh_cache(product_id):
    """Background refresh (before TTL expires)"""
    product = db.query('SELECT * FROM products WHERE id = ?', product_id)
    cache.setex(f'product:{product_id}', 300, json.dumps(product))

# Result:
# - Cache refreshed before expiration (TTL < 30s)
# - No thundering herd (cache always has valid data)
# - Database: Predictable load (1 refresh every 5 min per key)
```

---

**Problem 3: Multi-Layer Inconsistency (Client, CDN, Server Caches)**

```python
# Scenario: Update product price (999 → 899)
# Problem: 3 cache layers, each with different TTL

# Layer 1: Client cache (browser, 30-min TTL)
# - User's browser has price=999 (cached 10 min ago)
# - Stale for 20 more minutes ⚠️

# Layer 2: CDN cache (CloudFront, 1-hour TTL)
# - Edge server has price=999 (cached 30 min ago)
# - Stale for 30 more minutes ⚠️

# Layer 3: Server cache (Redis, 5-min TTL)
# - Redis has price=899 (updated 1 min ago)
# - Fresh ✅

# Layer 4: Database
# - Database has price=899 (source of truth)
# - Fresh ✅

# Result: User sees price=999 (client cache), while database has price=899
# Maximum staleness: 30 minutes (client TTL)
```

**Solution: Waterfall Invalidation**
```python
def update_product_price(product_id, new_price):
    # Step 1: Update database (source of truth)
    db.execute('UPDATE products SET price = ? WHERE id = ?', new_price, product_id)
    
    # Step 2: Invalidate server cache (Redis)
    cache.delete(f'product:{product_id}')  # Immediate (1ms)
    
    # Step 3: Purge CDN cache (CloudFront)
    cloudfront.create_invalidation(paths=[f'/products/{product_id}'])  # 5-30 seconds
    
    # Step 4: Client cache (cannot invalidate directly)
    # Option A: Wait for TTL to expire (up to 30 min stale)
    # Option B: Use versioned URLs (force refresh)
    #   Old: /products/123?v=1 (cached)
    #   New: /products/123?v=2 (fresh, new cache entry)
    
    # Step 5: Publish event (notify all caches)
    pubsub.publish('product-updates', {
        'product_id': product_id,
        'action': 'price_update',
        'version': 2
    })

# Result:
# - Server cache: Fresh immediately (1ms invalidation)
# - CDN cache: Fresh in 5-30 seconds (purge propagation)
# - Client cache: Fresh in 30 minutes (TTL expiration) OR immediate (versioned URLs)
```

---

## 3. Consistency Strategies

| Strategy | Consistency | Complexity | Latency | Best For |
|----------|-------------|------------|---------|----------|
| **TTL-based** | Eventual (TTL delay) | Low (simple) | Low (no invalidation) | Non-critical data (profiles) |
| **Write-through** | Strong (immediate) | Medium | High (2 writes) | Critical data (balance) |
| **Event-driven** | Near real-time (ms lag) | High (pub/sub) | Low (async) | Distributed systems |
| **Versioning** | Strong (prevents stale) | Medium (version tracking) | Low (check version) | Concurrent writes |
| **Distributed locks** | Strong (single writer) | High (lock contention) | Medium (lock wait) | High contention keys |

---

## 4. Real-World Examples

**Facebook Timeline Consistency**:
- **Strategy**: Event-driven invalidation + TTL fallback
- **Flow**: User posts → DB write → Kafka event → Cache invalidator → Invalidate feed cache
- **TTL**: 5 minutes (safety net if event missed)
- **Result**: Feed fresh within 1-2 seconds (event-driven), 5 min max staleness (TTL)
- **Thundering herd**: Distributed locking (only 1 thread fetches feed per user)

**Amazon Product Prices**:
- **Strategy**: Write-through + CDN purge + Versioned URLs
- **Flow**: Price update → DB write → Cache update (write-through) → CDN purge → Versioned URL (v2)
- **Result**: Server cache fresh immediately, CDN fresh in 10s, client fresh immediately (versioned URL)
- **Consistency**: Strong (write-through ensures cache matches DB)

**Twitter Trending Hashtags**:
- **Strategy**: TTL only (1-minute refresh)
- **Flow**: Trending calculation every 1 minute → Cache results → TTL expires → Recalculate
- **Result**: Trending list up to 1 min stale (acceptable, not critical)
- **Thundering herd**: Early expiration (refresh at TTL-30s, before actual expiration)

---

## 5. Interview Answer

**"Cache consistency ensures cached data matches database across distributed systems. Three consistency models: (1) Strong consistency (cache always matches DB write-through immediate update, no stale reads but 2× write latency, bank balance critical data), (2) Eventual consistency (cache eventually matches DB TTL-based up to 5-min stale, simple low latency, user profiles non-critical), (3) Near real-time (event-driven invalidation 1-2s lag, complex pub/sub infrastructure, distributed systems). Common problems: (1) Race condition (Thread 1 caches old data after Thread 2 updates DB, fix with versioning/CAS check-and-set prevent stale), (2) Thundering herd (1,000 threads simultaneously query DB on cache expiration, fix with distributed locking only 1 thread fetches DB or early expiration refresh before TTL 30s), (3) Multi-layer inconsistency (client 30-min CDN 1-hour server 5-min TTL different staleness, fix with waterfall invalidation DB → server 1ms → CDN 10s → client versioned URLs immediate). Real-world: Facebook event-driven + TTL (feed fresh 1-2s event 5-min TTL fallback, distributed locking prevent thundering herd), Amazon write-through + CDN purge + versioned URLs (strong consistency price always fresh), Twitter TTL only (1-min trending recalculation stale acceptable non-critical)."**

---

## 6. Monitoring Cache Consistency

**Metrics to Track**:
```python
# 1. Staleness rate (% of stale reads)
staleness_rate = stale_reads / total_reads
# Target: <1% (99% fresh reads)

# 2. Cache-database drift (% of keys with different values)
drift_rate = mismatched_keys / total_keys
# Target: <0.1% (99.9% consistent)

# 3. Invalidation latency (time from DB write to cache refresh)
invalidation_latency_p95 = measure_latency(db_write, cache_invalidation)
# Target: <100ms (near real-time)

# 4. Thundering herd events (multiple threads query DB for same key)
thundering_herd_count = concurrent_db_queries_per_key
# Target: 0 events (perfect locking)
```

**Alerting**:
```python
# Alert if staleness rate exceeds 5%
if staleness_rate > 0.05:
    alert('High staleness rate: {}%'.format(staleness_rate * 100))

# Alert if cache-database drift exceeds 1%
if drift_rate > 0.01:
    alert('Cache-database drift detected: {}%'.format(drift_rate * 100))

# Alert if thundering herd detected (>10 concurrent queries for same key)
if concurrent_queries > 10:
    alert('Thundering herd detected: {} concurrent queries'.format(concurrent_queries))
```

---

## 7. Bottom Line

**Cache consistency is critical for ensuring cached data matches database across distributed systems to prevent stale reads, data conflicts, and poor user experience. Three consistency models: Strong consistency (write-through cache always matches DB immediate update no staleness, 2× write latency DB + cache, critical data bank balance inventory), Eventual consistency (TTL-based cache eventually matches DB up to 5-min stale, simple low latency, non-critical user profiles product catalog), Near real-time (event-driven invalidation 1-2s lag, complex pub/sub Kafka/Redis, distributed systems microservices). Common problems: Race condition (Thread 1 caches old data after Thread 2 updates DB, fix with versioning/CAS check version before caching prevent stale data), Thundering herd (1,000 threads simultaneously query DB on cache expiration database overload P95 latency spikes, fix with distributed locking only 1 thread fetches DB 999 wait or early expiration refresh before TTL-30s), Multi-layer inconsistency (client 30-min CDN 1-hour server 5-min TTL different staleness layers, fix with waterfall invalidation DB → server 1ms → CDN purge 10s → client versioned URLs immediate fresh). Real-world: Facebook event-driven + TTL (user posts feed fresh 1-2s event-driven 5-min TTL fallback safety net, distributed locking prevent thundering herd 1 thread fetches feed 999 wait), Amazon write-through + CDN purge + versioned URLs (price update strong consistency cache matches DB immediately, CDN purge 10s propagation, versioned URLs v2 force client refresh), Twitter TTL only (1-min trending recalculation up to 1-min stale acceptable non-critical data, early expiration refresh at TTL-30s before actual expiration prevent thundering herd). Monitor staleness rate (target <1% fresh reads 99%+), cache-database drift (target <0.1% consistent 99.9%+), invalidation latency (target <100ms P95 near real-time), thundering herd events (target 0 perfect locking). Critical trade-off: Strong consistency (write-through slow writes 2× latency) vs Performance (eventual consistency TTL fast writes stale reads), Complexity (event-driven pub/sub infrastructure) vs Simplicity (TTL passive expiration).**

