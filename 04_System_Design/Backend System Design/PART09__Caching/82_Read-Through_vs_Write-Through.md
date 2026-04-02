# 82. Read-Through vs Write-Through

---

## 1. High-Level Explanation

**Read-Through** and **Write-Through** are caching patterns that define how the cache interacts with the database (data source).

- **Read-Through**: Application reads from cache; on miss, cache fetches from database
- **Write-Through**: Application writes to cache; cache immediately writes to database

Both patterns make the cache responsible for database interaction (vs cache-aside where application handles it).

---

## 2. Deep-Dive Explanation

### Read-Through Cache

**How it works**: Cache sits between application and database. On cache miss, cache (not application) fetches from database.

```python
# Application code (simplified, cache handles DB fetching)
def get_user(user_id):
    # Application just asks cache (no DB logic)
    return cache.get(f'user:{user_id}')

# Cache library (implements read-through logic)
class ReadThroughCache:
    def __init__(self, db, ttl=300):
        self.cache = {}
        self.db = db
        self.ttl = ttl
    
    def get(self, key):
        # Check cache first
        if key in self.cache:
            print(f'✅ Cache hit: {key}')
            return self.cache[key]
        
        # Cache miss: Fetch from database (cache responsibility)
        print(f'❌ Cache miss: {key}, fetching from DB...')
        value = self.db.query(key)  # Cache fetches from DB
        
        # Store in cache (populate for next request)
        self.cache[key] = value
        
        return value

# Usage
cache = ReadThroughCache(db=database)
user = cache.get('user:123')  # Application doesn't know about DB
```

**Pros**:
- Simple application code (no DB logic, just cache.get())
- Consistent caching logic (centralized in cache layer)
- Lazy loading (only cache requested data)

**Cons**:
- Cache miss latency (first request slow: fetch DB + populate cache)
- Tight coupling (cache must know database schema)

**Best for**: Read-heavy workloads (user profiles, product catalog)

---

### Write-Through Cache

**How it works**: Application writes to cache; cache immediately writes to database (synchronous).

```python
# Application code (simplified, cache handles DB writes)
def update_user(user_id, new_data):
    # Application writes to cache (no DB logic)
    cache.set(f'user:{user_id}', new_data)

# Cache library (implements write-through logic)
class WriteThroughCache:
    def __init__(self, db, ttl=300):
        self.cache = {}
        self.db = db
        self.ttl = ttl
    
    def set(self, key, value):
        # Write to database first (source of truth)
        print(f'💾 Writing to DB: {key}')
        self.db.update(key, value)  # Cache writes to DB
        
        # Then update cache (write-through)
        print(f'📝 Updating cache: {key}')
        self.cache[key] = value
        
        print(f'✅ Write-through complete: {key}')
    
    def get(self, key):
        if key in self.cache:
            return self.cache[key]
        
        # Cache miss: Fetch from DB
        value = self.db.query(key)
        self.cache[key] = value
        return value

# Usage
cache = WriteThroughCache(db=database)
cache.set('user:123', {'name': 'Alice'})  # Writes to DB + cache
```

**Pros**:
- Strong consistency (cache always matches database)
- Simple application code (no DB logic, just cache.set())
- No cache-database drift (cache never stale)

**Cons**:
- Write latency (2 writes: database + cache)
- Wasted writes (cache rarely-used data that may never be read)

**Best for**: Write-moderate, read-heavy workloads with strong consistency needs (bank balance, inventory)

---

### Cache-Aside (Comparison)

**How it works**: Application manages both cache and database (manual control).

```python
# Application code (handles cache + DB logic)
def get_user(user_id):
    cache_key = f'user:{user_id}'
    
    # Check cache
    user = cache.get(cache_key)
    if user:
        return user  # Cache hit
    
    # Cache miss: Fetch from database (application responsibility)
    user = db.query('SELECT * FROM users WHERE id = ?', user_id)
    
    # Populate cache (application responsibility)
    cache.setex(cache_key, 300, json.dumps(user))
    
    return user

def update_user(user_id, new_data):
    # Write to database
    db.execute('UPDATE users SET name = ? WHERE id = ?', new_data['name'], user_id)
    
    # Invalidate cache (application responsibility)
    cache.delete(f'user:{user_id}')
```

**Pros**:
- Flexible (application controls cache + DB separately)
- No wasted writes (only cache what's read)
- Loose coupling (cache failure doesn't block DB access)

**Cons**:
- Complex application code (manual cache + DB management)
- Inconsistent logic (every developer implements differently)
- Easy to forget invalidation (stale data bug risk)

**Best for**: Most common pattern (Redis, Memcached default)

---

## 3. Comparison Table

| Pattern | Who Manages DB | Consistency | Write Latency | Best For |
|---------|----------------|-------------|---------------|----------|
| **Read-Through** | Cache | Eventual (TTL lag) | Low (cache only) | Read-heavy (profiles) |
| **Write-Through** | Cache | Strong (immediate) | High (DB + cache) | Strong consistency (balance) |
| **Cache-Aside** | Application | Manual (app controls) | Low (cache only) | General purpose (most common) |
| **Write-Behind** | Cache (async queue) | Eventual (queue lag) | Low (cache only, async DB) | High-write (analytics) |

---

## 4. Real-World Examples

**AWS DAX (DynamoDB Accelerator)** - Read-Through + Write-Through:
```python
import boto3

# DAX cluster (read-through + write-through cache for DynamoDB)
dax_client = boto3.client('dax', endpoint_url='dax://my-cluster.abc123.dax-clusters.us-east-1.amazonaws.com')

# Read-through: DAX fetches from DynamoDB on miss
response = dax_client.get_item(
    TableName='Users',
    Key={'UserId': {'N': '123'}}
)
# First request: Cache miss, DAX fetches from DynamoDB (20ms)
# Next requests: Cache hit, DAX returns from cache (1ms)

# Write-through: DAX writes to DynamoDB + cache
dax_client.put_item(
    TableName='Users',
    Item={'UserId': {'N': '123'}, 'Name': {'S': 'Alice'}}
)
# DAX writes to DynamoDB (10ms) + updates cache (1ms) = 11ms total
```

**Azure Cache for Redis with Cache-Aside**:
```python
import redis

r = redis.StrictRedis(host='mycache.redis.cache.windows.net')

# Cache-aside (manual application code)
def get_user(user_id):
    # Check cache
    user = r.get(f'user:{user_id}')
    if user:
        return json.loads(user)  # Cache hit
    
    # Cache miss: Fetch from SQL
    user = sql_db.query('SELECT * FROM users WHERE id = ?', user_id)
    
    # Populate cache
    r.setex(f'user:{user_id}', 300, json.dumps(user))
    
    return user
```

---

## 5. Interview Answer

**"Read-Through: Cache fetches from database on miss (cache manages DB interaction, application just calls cache.get(), simple app code but tight coupling, best for read-heavy like user profiles). Write-Through: Cache writes to database immediately (strong consistency cache always fresh, but write latency 2× slower DB + cache, best for critical data like bank balance). Cache-Aside: Application manages both (flexible manual control, most common pattern Redis/Memcached, but complex app code and easy to forget invalidation). Choose based on: Read-heavy + simple code → Read-Through, Strong consistency needed → Write-Through, General purpose + flexible → Cache-Aside (most common). Real-world: AWS DAX uses Read-Through + Write-Through for DynamoDB (1ms cache hit vs 20ms DynamoDB direct, strong consistency for banking apps), most companies use Cache-Aside with Redis (flexible, manual control, 99% cache hit ratio)."**

---

## 6. When to Use Each

**Use Read-Through when**:
- ✅ Read-heavy workload (90%+ reads)
- ✅ Want simple application code (no DB logic)
- ✅ Centralized caching logic (consistency across teams)
- ✅ Lazy loading acceptable (cache miss on first request OK)

**Use Write-Through when**:
- ✅ Strong consistency required (cache must match DB always)
- ✅ Write-moderate workload (<50% writes)
- ✅ Critical data (bank balance, inventory counts)
- ✅ Can tolerate write latency (2× slower writes OK)

**Use Cache-Aside when**:
- ✅ Most general use cases (default pattern)
- ✅ Flexible control needed (manual cache + DB management)
- ✅ High-write workload (avoid wasted cache writes)
- ✅ Loose coupling desired (cache failure doesn't block DB)

---

## 7. Common Patterns Combination

**Read-Through + Write-Through** (AWS DAX, strong consistency):
```python
# Application code (simple, no DB logic)
user = cache.get('user:123')  # Read-through (cache fetches from DB on miss)
cache.set('user:123', new_data)  # Write-through (cache writes to DB immediately)

# Pros: Strong consistency, simple app code
# Cons: Write latency (2× slower)
# Best for: Banking, inventory management
```

**Cache-Aside + Write-Behind** (high-write workloads):
```python
# Read: Cache-aside (manual)
user = cache.get('user:123') or db.query('...')

# Write: Write-behind (async queue)
cache.set('user:123', new_data)  # Update cache immediately (fast)
queue.enqueue(('UPDATE users', new_data))  # Async DB write (background)

# Pros: Fast writes (no DB wait), flexible
# Cons: Eventual consistency (queue lag 1-5s), data loss risk (cache crash)
# Best for: Analytics, logging, high-throughput writes
```

---

## 8. Bottom Line

**Read-Through and Write-Through are caching patterns where cache manages database interaction (vs Cache-Aside where application manages both). Read-Through: Cache fetches from DB on miss (lazy loading, simple app code no DB logic, read-heavy workloads like user profiles 99% cache hit ratio). Write-Through: Cache writes to DB immediately (strong consistency cache always fresh, write latency 2× slower DB + cache, critical data like bank balance inventory counts). Cache-Aside (most common): Application manages both (flexible manual control Redis default, complex app code easy to forget invalidation, general purpose 95% hit ratio). Choose based on workload: Read-heavy simple code → Read-Through (AWS DAX DynamoDB accelerator 1ms cache vs 20ms DB), Strong consistency → Write-Through (banking apps cache + DB always in sync), General purpose flexible → Cache-Aside (Redis/Memcached 99% of use cases). Real-world: AWS DAX Read-Through + Write-Through for DynamoDB (strong consistency banking), Netflix Cache-Aside with Redis (flexible control user profiles 99% hit), Facebook Cache-Aside + Write-Behind (high writes analytics eventual consistency acceptable 1-5s lag). Critical trade-off: Simplicity (Read/Write-Through centralized logic) vs Flexibility (Cache-Aside manual control), Strong consistency (Write-Through slow writes) vs Performance (Cache-Aside/Write-Behind fast writes eventual consistency).**

