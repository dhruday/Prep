# 81. Cache Invalidation Strategies

---

## 1. High-Level Explanation

**Cache invalidation** is the process of removing or updating stale data in the cache when the source data changes. Phil Karlton's famous quote: **"There are only two hard things in Computer Science: cache invalidation and naming things."**

**Common Strategies**:
1. **TTL (Time To Live)**: Passive expiration after fixed time
2. **Write-Through**: Update cache on every write
3. **Write-Behind**: Async cache update (eventual consistency)
4. **Event-Driven**: Invalidate on data change events
5. **Manual Purge**: Explicit cache deletion (API calls)

---

## 2. Deep-Dive Explanation

### 1. TTL (Time To Live) - Passive Expiration

**How it works**: Set expiration time on cached data, automatically removed after TTL expires.

```python
import redis
r = redis.StrictRedis()

# Cache with 5-minute TTL
r.setex('product:123', 300, '{"name":"iPhone","price":999}')
# After 300 seconds, key automatically deleted

# Get with TTL check
value = r.get('product:123')
if value is None:
    # Cache expired or miss, fetch from DB
    value = db.query('SELECT * FROM products WHERE id = 123')
    r.setex('product:123', 300, json.dumps(value))
```

**Pros**: Simple, no manual invalidation, works for most use cases  
**Cons**: Stale data until TTL expires (up to 5 minutes old)

**Best for**: Semi-static data (product catalog, user profiles)  
**TTL guidelines**:
- Frequently changing: 1-5 minutes (prices, inventory)
- Semi-static: 30 minutes - 1 hour (user profiles)
- Static: 24 hours - 7 days (images, CSS)

---

### 2. Write-Through - Immediate Update

**How it works**: Update cache immediately on every database write.

```python
def update_product(product_id, new_data):
    # Write to database first (source of truth)
    db.execute('UPDATE products SET name = ?, price = ? WHERE id = ?',
               new_data['name'], new_data['price'], product_id)
    
    # Immediately update cache (write-through)
    cache_key = f'product:{product_id}'
    r.setex(cache_key, 300, json.dumps(new_data))
    
    # Cache now consistent with database ✅
```

**Pros**: Cache always fresh (no staleness), consistency guaranteed  
**Cons**: Write latency (2 writes: DB + cache), complexity (must update all caches)

**Best for**: Critical data (bank balance, inventory counts)

---

### 3. Write-Behind (Write-Back) - Async Update

**How it works**: Update cache immediately, queue database write for later.

```python
from queue import Queue
import threading

write_queue = Queue()

def update_product_async(product_id, new_data):
    # Update cache immediately (fast write)
    cache_key = f'product:{product_id}'
    r.setex(cache_key, 300, json.dumps(new_data))
    
    # Queue database write (async, background)
    write_queue.put((product_id, new_data))

# Background worker processes queue
def db_writer_worker():
    while True:
        product_id, new_data = write_queue.get()
        db.execute('UPDATE products SET name = ?, price = ? WHERE id = ?',
                   new_data['name'], new_data['price'], product_id)
        write_queue.task_done()

# Start worker thread
threading.Thread(target=db_writer_worker, daemon=True).start()
```

**Pros**: Fast writes (no database wait), reduces database load  
**Cons**: Data loss risk (cache crashes before DB write), eventual consistency

**Best for**: High-write workloads (analytics, logging)

---

### 4. Event-Driven Invalidation - Pub/Sub

**How it works**: Publish event on data change, subscribers invalidate caches.

```python
import redis

# Publisher: Emit event on product update
def update_product_event(product_id, new_data):
    # Update database
    db.execute('UPDATE products SET name = ?, price = ? WHERE id = ?',
               new_data['name'], new_data['price'], product_id)
    
    # Publish invalidation event
    r.publish('product-updates', json.dumps({
        'product_id': product_id,
        'action': 'update',
        'timestamp': time.time()
    }))

# Subscriber: Invalidate cache on event
pubsub = r.pubsub()
pubsub.subscribe('product-updates')

for message in pubsub.listen():
    event = json.loads(message['data'])
    product_id = event['product_id']
    
    # Invalidate cache (delete key, next read fetches fresh data)
    r.delete(f'product:{product_id}')
    print(f'♻️ Cache invalidated: product:{product_id}')
```

**Pros**: Decoupled (multiple subscribers), scalable, real-time invalidation  
**Cons**: Requires pub/sub infrastructure (Kafka, RabbitMQ, Redis Pub/Sub)

**Best for**: Distributed systems (multi-tier caching, microservices)

---

### 5. Manual Purge - Explicit Deletion

**How it works**: Manually delete cache keys via API (CDN purge, Redis DEL).

```bash
# Redis: Delete specific keys
redis-cli DEL product:123 product:456

# CDN: Purge cache (CloudFront)
aws cloudfront create-invalidation \
    --distribution-id E1234567890 \
    --paths "/products/123" "/products/456"

# Cost: $0.005 per invalidation request
# Time: 5-30 seconds to propagate globally
```

**Pros**: Immediate control, can invalidate any key anytime  
**Cons**: Manual effort, expensive for CDN ($0.005 per purge), error-prone

**Best for**: One-time fixes (incorrect data cached), emergency invalidations

---

## 3. Comparison Table

| Strategy | Consistency | Complexity | Staleness | Best For |
|----------|-------------|------------|-----------|----------|
| **TTL** | Eventual (TTL delay) | Low (simple) | Up to TTL (5 min) | Semi-static data (profiles) |
| **Write-Through** | Strong (immediate) | Medium | 0 (always fresh) | Critical data (balance) |
| **Write-Behind** | Eventual (queue lag) | High | 1-5 seconds | High-write workloads |
| **Event-Driven** | Near real-time (ms lag) | High (pub/sub) | <1 second | Distributed systems |
| **Manual Purge** | Immediate | Low (API call) | 0 (on-demand) | Emergency fixes |

---

## 4. Real-World Examples

**Facebook Posts**:
- Strategy: Event-driven + TTL
- Flow: User posts → DB write → Kafka event → Cache invalidator deletes feed cache → Next read fetches fresh feed
- TTL: 5 minutes (safety net if event missed)
- Result: Feed fresh within 1-2 seconds (event-driven), 5 min max staleness (TTL fallback)

**Amazon Product Prices**:
- Strategy: Write-through + TTL
- Flow: Price update → DB write → Cache update (write-through) → TTL 5 min (refresh periodically)
- Result: Price always fresh (write-through), TTL ensures consistency if cache missed update

**Twitter Trending Hashtags**:
- Strategy: TTL only (1 minute)
- Flow: Trending calculation every 1 minute → Cache results → TTL expires → Recalculate
- Result: Trending list up to 1 min stale (acceptable, not critical)

---

## 5. Interview Answer

**"Cache invalidation removes stale data when source changes. Five strategies: (1) TTL (passive expiration after time, simple but up to 5-min stale, good for semi-static data like profiles), (2) Write-through (update cache on every write, strong consistency no staleness, but write latency 2× slower, good for critical data like bank balance), (3) Write-behind (async cache update eventual consistency 1-5s lag, fast writes but data loss risk if cache crashes, good for high-write workloads like analytics), (4) Event-driven (pub/sub invalidate on change near real-time <1s lag, scalable but requires infrastructure Kafka/Redis, good for distributed systems multi-tier caching), (5) Manual purge (explicit delete immediate control, expensive for CDN $0.005 per purge, good for emergency fixes). Choose based on consistency needs: Strong consistency → write-through (bank balance), eventual consistency OK → TTL (product catalog), distributed → event-driven (microservices). Real-world: Facebook posts use event-driven + TTL (feed fresh 1-2s event-driven, 5-min TTL safety net), Amazon prices use write-through + TTL (always fresh write-through, 5-min TTL refresh), Twitter trending uses TTL only (1-min recalculation, stale acceptable)."**

---

## 6. Common Pitfalls

**Pitfall 1: Forgetting to Invalidate** (stale data persists)
```python
# ❌ Bad: Update DB but forget cache
def update_product(product_id, new_price):
    db.execute('UPDATE products SET price = ? WHERE id = ?', new_price, product_id)
    # Cache still has old price! Stale data ❌

# ✅ Good: Invalidate cache after DB update
def update_product(product_id, new_price):
    db.execute('UPDATE products SET price = ? WHERE id = ?', new_price, product_id)
    r.delete(f'product:{product_id}')  # Invalidate cache ✅
```

**Pitfall 2: Invalidating Too Aggressively** (low hit ratio)
```python
# ❌ Bad: Invalidate on every tiny change (over-invalidation)
def track_product_view(product_id):
    db.execute('UPDATE products SET view_count = view_count + 1 WHERE id = ?', product_id)
    r.delete(f'product:{product_id}')  # Invalidate on every view ❌
    # Result: Cache hit ratio drops to 50% (too many invalidations)

# ✅ Good: Only invalidate on meaningful changes
def update_product_price(product_id, new_price):
    db.execute('UPDATE products SET price = ? WHERE id = ?', new_price, product_id)
    r.delete(f'product:{product_id}')  # Invalidate only on price change ✅
```

**Pitfall 3: Race Conditions** (stale data reintroduced)
```python
# ❌ Bad: Race condition (old data overwrites new)
# Thread 1: Read old data (price=999)
old_data = db.query('SELECT * FROM products WHERE id = 123')  # price=999

# Thread 2: Update price to 899
db.execute('UPDATE products SET price = 899 WHERE id = 123')
r.delete('product:123')  # Invalidate cache

# Thread 1: Cache old data (price=999) ❌
r.setex('product:123', 300, json.dumps(old_data))  # Stale data reintroduced!

# ✅ Good: Use versioning or check-and-set (CAS)
def cache_with_version(key, value, version):
    # Only cache if version matches (prevent stale data)
    current_version = r.get(f'{key}:version')
    if current_version is None or int(current_version) == version:
        r.setex(key, 300, json.dumps(value))
        r.setex(f'{key}:version', 300, version + 1)
```

---

## 7. Bottom Line

**Cache invalidation is one of the hardest problems in computer science because it requires coordinating cache updates across distributed systems while balancing freshness, consistency, and performance. Choose strategy based on consistency needs: TTL for simple (5-min stale OK, 95% hit ratio product catalog), write-through for strong consistency (0 staleness bank balance), write-behind for high writes (1-5s lag analytics), event-driven for distributed (near real-time <1s lag microservices), manual purge for emergency (immediate but expensive $0.005 CDN purge). Real-world: Facebook event-driven + TTL (feed fresh 1-2s, 5-min safety net), Amazon write-through + TTL (price always fresh), Twitter TTL only (1-min trending stale acceptable). Monitor staleness metrics (% of stale reads target <1%), invalidation latency (P95 <100ms event-driven), cache hit ratio (target 95%+, aggressive invalidation drops to 70% = 30x database load). Critical trade-off: Strong consistency (write-through) vs performance (TTL eventual consistency) vs complexity (event-driven infrastructure).**

