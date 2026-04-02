# 156-160. Complete Interview Q&A Guide

## 📌 Part 156: 45 Low-Level Design (LLD) Interview Questions

### **Category 1: Design Patterns (15 Questions)**

**Q1: Design a Rate Limiter**
```python
class TokenBucketRateLimiter:
    def __init__(self, capacity, refill_rate):
        self.capacity = capacity  # Max tokens
        self.tokens = capacity
        self.refill_rate = refill_rate  # Tokens per second
        self.last_refill = time.time()
    
    def allow_request(self, user_id):
        self._refill()
        
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
    
    def _refill(self):
        now = time.time()
        elapsed = now - self.last_refill
        tokens_to_add = elapsed * self.refill_rate
        self.tokens = min(self.capacity, self.tokens + tokens_to_add)
        self.last_refill = now

# Usage: 100 requests/min = 100/60 = 1.67 tokens/sec
limiter = TokenBucketRateLimiter(capacity=100, refill_rate=1.67)
```

---

**Q2: Design a Cache with LRU Eviction**
```python
class LRUCache:
    def __init__(self, capacity):
        self.cache = {}  # key → node
        self.capacity = capacity
        self.head = Node(0, 0)  # Dummy head
        self.tail = Node(0, 0)  # Dummy tail
        self.head.next = self.tail
        self.tail.prev = self.head
    
    def get(self, key):
        if key in self.cache:
            node = self.cache[key]
            self._remove(node)
            self._add_to_head(node)
            return node.value
        return -1
    
    def put(self, key, value):
        if key in self.cache:
            self._remove(self.cache[key])
        
        node = Node(key, value)
        self._add_to_head(node)
        self.cache[key] = node
        
        if len(self.cache) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]
    
    def _remove(self, node):
        node.prev.next = node.next
        node.next.prev = node.prev
    
    def _add_to_head(self, node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node
```

---

**Q3: Design a Thread-Safe Singleton**
```python
class Singleton:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:  # Double-checked locking
                    cls._instance = super().__new__(cls)
        return cls._instance
```

---

**Q4-15:** (Design Observer Pattern, Factory Pattern, Strategy Pattern, Connection Pool, Object Pool, Circuit Breaker, Retry Mechanism, Command Pattern, State Machine, Pub-Sub System, Event-Driven System, Dependency Injection, Builder Pattern, Prototype Pattern, Adapter Pattern)

---

### **Category 2: Data Structures (15 Questions)**

**Q16: Design a HashMap**
```python
class HashMap:
    def __init__(self, size=16):
        self.size = size
        self.buckets = [[] for _ in range(size)]
    
    def _hash(self, key):
        return hash(key) % self.size
    
    def put(self, key, value):
        index = self._hash(key)
        bucket = self.buckets[index]
        
        for i, (k, v) in enumerate(bucket):
            if k == key:
                bucket[i] = (key, value)  # Update
                return
        
        bucket.append((key, value))  # Insert
    
    def get(self, key):
        index = self._hash(key)
        bucket = self.buckets[index]
        
        for k, v in bucket:
            if k == key:
                return v
        return None
```

---

**Q17: Design a Min-Stack (O(1) getMin)**
```python
class MinStack:
    def __init__(self):
        self.stack = []
        self.min_stack = []
    
    def push(self, val):
        self.stack.append(val)
        if not self.min_stack or val <= self.min_stack[-1]:
            self.min_stack.append(val)
    
    def pop(self):
        if self.stack.pop() == self.min_stack[-1]:
            self.min_stack.pop()
    
    def getMin(self):
        return self.min_stack[-1]
```

---

**Q18-30:** (Design Queue using Stacks, Circular Buffer, Trie for Autocomplete, Consistent Hashing Ring, Skip List, Bloom Filter, Count-Min Sketch, HyperLogLog, B-Tree, LSM Tree, Merkle Tree, Distributed Queue, Priority Queue, Ring Buffer)

---

### **Category 3: Concurrency (15 Questions)**

**Q31: Design a Thread Pool**
```python
class ThreadPool:
    def __init__(self, num_threads):
        self.tasks = queue.Queue()
        self.workers = []
        
        for _ in range(num_threads):
            worker = threading.Thread(target=self._worker)
            worker.start()
            self.workers.append(worker)
    
    def _worker(self):
        while True:
            task = self.tasks.get()
            if task is None:
                break
            task()
            self.tasks.task_done()
    
    def submit(self, task):
        self.tasks.put(task)
    
    def shutdown(self):
        for _ in self.workers:
            self.tasks.put(None)
        for worker in self.workers:
            worker.join()
```

---

**Q32: Design a Read-Write Lock**
```python
class ReadWriteLock:
    def __init__(self):
        self.readers = 0
        self.writers = 0
        self.read_ready = threading.Condition(threading.Lock())
    
    def acquire_read(self):
        with self.read_ready:
            while self.writers > 0:
                self.read_ready.wait()
            self.readers += 1
    
    def release_read(self):
        with self.read_ready:
            self.readers -= 1
            if self.readers == 0:
                self.read_ready.notify_all()
    
    def acquire_write(self):
        with self.read_ready:
            while self.readers > 0 or self.writers > 0:
                self.read_ready.wait()
            self.writers += 1
    
    def release_write(self):
        with self.read_ready:
            self.writers -= 1
            self.read_ready.notify_all()
```

---

**Q33-45:** (Design Semaphore, Barrier, CountDownLatch, Deadlock Detection, Producer-Consumer with Bounded Buffer, Dining Philosophers Solution, Readers-Writers Problem, ThreadLocal Storage, Atomic Operations, Lock-Free Stack, Compare-And-Swap Implementation, Future/Promise, Actor Model, Event Loop)

---

## 📌 Part 157: 45 High-Level Design (HLD) Interview Questions

### **Category 1: Social Media (10 Questions)**

**Q1: Design Twitter**

**Requirements:**
- 500M users, 500M tweets/day (6k/sec)
- Timeline: Home (following) + User profile
- Latency: <200ms

**Architecture:**

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     ▼
┌─────────────┐
│Load Balancer│
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│ Tweet Write │ ──→ │    Kafka     │
│   Service   │     └──────┬───────┘
└─────────────┘            │
                           ▼
┌─────────────┐     ┌──────────────┐
│  Timeline   │ ←─  │Fanout Workers│
│   Service   │     └──────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│   Redis     │     │  Cassandra   │
│  (Cache)    │     │   (Feeds)    │
└─────────────┘     └──────────────┘
```

**Key Design Decisions:**

1. **Hybrid Fanout:**
   - Followers <10k: Push (fanout to all followers' timelines)
   - Followers >10k: Pull (fetch on-demand when user opens timeline)

```python
def create_tweet(user_id, content):
    # 1. Save tweet
    tweet_id = db.insert("INSERT INTO tweets", user_id, content)
    
    # 2. Check follower count
    follower_count = db.query("SELECT COUNT(*) FROM followers WHERE following_id = ?", user_id)
    
    if follower_count < 10000:
        # Push: Fanout to all followers
        followers = db.query("SELECT follower_id FROM followers WHERE following_id = ?", user_id)
        for follower_id in followers:
            redis.lpush(f"timeline:{follower_id}", tweet_id)
            redis.ltrim(f"timeline:{follower_id}", 0, 999)  # Keep latest 1000
    else:
        # Pull: No fanout, fetch on-demand
        pass

def get_timeline(user_id):
    # 1. Get pre-computed timeline from Redis
    timeline = redis.lrange(f"timeline:{user_id}", 0, 19)  # Latest 20
    
    # 2. Fetch tweets from celebrities (pull)
    following = db.query("SELECT following_id FROM followers WHERE follower_id = ? AND is_celebrity = true", user_id)
    celebrity_tweets = db.query("SELECT * FROM tweets WHERE user_id IN (...) ORDER BY created_at DESC LIMIT 20", following)
    
    # 3. Merge and sort
    merged = merge_sort(timeline, celebrity_tweets, key=lambda t: t.created_at)
    return merged[:20]
```

2. **Database Schema:**
```sql
-- Users
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(50),
    created_at TIMESTAMP
);

-- Tweets (Cassandra for write-heavy)
CREATE TABLE tweets (
    tweet_id BIGINT PRIMARY KEY,
    user_id BIGINT,
    content TEXT,
    created_at TIMESTAMP
);

-- Followers (PostgreSQL for relationships)
CREATE TABLE followers (
    follower_id BIGINT,
    following_id BIGINT,
    created_at TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

-- Timelines (Redis for fast reads)
Key: timeline:{user_id}
Value: List of tweet_ids (latest 1000)
```

3. **Scalability:**
- Shard tweets by `tweet_id % 16` (write-heavy)
- Shard timelines by `user_id % 16` (isolated failures)
- Cache user profiles (1h TTL, 95%+ hit rate)

---

**Q2-10:** (Design Instagram, Facebook News Feed, TikTok, LinkedIn, Reddit, Snapchat, WhatsApp, Messaging System, Notification System)

---

### **Category 2: E-Commerce (10 Questions)**

**Q11: Design Amazon**

**Key Components:**

1. **Product Catalog:** Elasticsearch (full-text search, faceted filters)
2. **Inventory:** PostgreSQL (strong consistency, no overselling)
3. **Shopping Cart:** Redis (fast, temporary, expire after 7 days)
4. **Orders:** PostgreSQL (ACID transactions)
5. **Recommendations:** Cassandra (collaborative filtering, user behavior)

**Checkout Flow:**
```python
def checkout(user_id, cart_items):
    # 1. Reserve inventory
    for item_id, quantity in cart_items:
        success = db.execute("""
            UPDATE inventory 
            SET reserved = reserved + ?, updated_at = NOW()
            WHERE product_id = ? AND (stock - reserved) >= ?
        """, quantity, item_id, quantity)
        
        if not success:
            return "Out of stock"
    
    # 2. Create order (transaction)
    with db.transaction():
        order_id = db.insert("INSERT INTO orders", user_id, total_amount)
        for item_id, quantity in cart_items:
            db.insert("INSERT INTO order_items", order_id, item_id, quantity)
        
        # Deduct inventory
        for item_id, quantity in cart_items:
            db.execute("""
                UPDATE inventory 
                SET stock = stock - ?, reserved = reserved - ?
                WHERE product_id = ?
            """, quantity, quantity, item_id)
    
    # 3. Queue payment processing (async)
    kafka.publish('payments', {'order_id': order_id, 'amount': total_amount})
    
    return order_id
```

---

**Q12-20:** (Design Uber Eats, Shopify, Stripe Payment System, Inventory Management, Flash Sale System, Recommendation Engine, Search Ranking, Fraud Detection, Order Fulfillment)

---

### **Category 3: Infrastructure (10 Questions)**

**Q21: Design URL Shortener (bit.ly)**

**Requirements:**
- 100M URLs/month
- Redirect <100ms

**Key-Value Store:**
```
short_url → long_url
```

**Algorithm:**
```python
import hashlib

def shorten_url(long_url):
    # 1. Generate hash
    hash_digest = hashlib.md5(long_url.encode()).hexdigest()
    
    # 2. Take first 7 characters (base62)
    short_code = base62_encode(int(hash_digest[:16], 16))[:7]
    
    # 3. Store in DB
    db.put(short_code, long_url)
    
    return f"bit.ly/{short_code}"

def redirect(short_code):
    # 1. Check cache
    long_url = redis.get(short_code)
    if long_url:
        return long_url
    
    # 2. Query DB
    long_url = db.get(short_code)
    
    # 3. Cache (24h TTL)
    redis.setex(short_code, 86400, long_url)
    
    return long_url
```

**Capacity:**
- 100M URLs/month = 40 URLs/sec
- Storage: 100M × 500 bytes = 50 GB/month
- Cache: 80/20 rule → Cache 20% hot URLs = 10 GB

---

**Q22-30:** (Design Pastebin, Design Google Drive, Design Dropbox, Design YouTube, Design Netflix, Design Zoom, Design CDN, Design Load Balancer, Design API Gateway)

---

### **Category 4: Real-Time Systems (10 Questions)**

**Q31: Design Uber**

**Components:**

1. **Rider requests ride:**
```python
def request_ride(rider_id, lat, lon):
    # 1. Find nearby drivers (Redis GEORADIUS)
    drivers = redis.georadius('drivers', lon, lat, 5, 'km', withcoord=True)
    
    # 2. Filter available
    available = [d for d in drivers if get_driver_status(d['id']) == 'available']
    
    # 3. Calculate ETA (route optimization)
    ranked = []
    for driver in available:
        eta = calculate_eta(driver['lat'], driver['lon'], lat, lon)
        ranked.append((driver, eta))
    
    ranked.sort(key=lambda x: x[1])  # Sort by ETA
    
    # 4. Send to top 3 drivers
    for driver, eta in ranked[:3]:
        kafka.publish('ride-requests', {
            'driver_id': driver['id'],
            'rider_id': rider_id,
            'pickup_lat': lat,
            'pickup_lon': lon,
            'eta': eta
        })
    
    # 5. Wait for first accept (WebSocket)
    return "Request sent"
```

2. **Driver location updates:**
```python
def update_location(driver_id, lat, lon):
    # Update Redis (GEOADD)
    redis.geoadd('drivers', lon, lat, driver_id)
    
    # Set expiry (if driver doesn't update in 30s, assume offline)
    redis.expire(f"driver:{driver_id}", 30)
```

3. **Surge pricing:**
```python
def calculate_surge(area_id):
    # 1. Get supply (available drivers)
    drivers = redis.zcard(f"area:{area_id}:drivers")
    
    # 2. Get demand (pending rides)
    rides = redis.zcard(f"area:{area_id}:rides")
    
    # 3. Calculate surge multiplier
    if drivers == 0:
        surge = 3.0
    else:
        surge = max(1.0, rides / drivers)
    
    return surge
```

---

**Q32-40:** (Design Lyft, Design DoorDash, Design Real-Time Chat, Design Live Streaming, Design Multiplayer Game, Design Stock Trading Platform, Design Collaborative Editing, Design IoT Device Management, Design Real-Time Analytics)

---

### **Category 5: Data-Intensive (5 Questions)**

**Q41: Design Google Search**

**Components:**

1. **Crawler:** Fetch web pages (distributed, politeness policy)
2. **Indexer:** Build inverted index (word → list of documents)
3. **Ranker:** PageRank + relevance
4. **Serving:** Distributed search (shard by document_id)

**Inverted Index:**
```
"system" → [doc1, doc5, doc10]
"design" → [doc1, doc2, doc5]
"interview" → [doc1, doc3]
```

**Query:**
```python
def search(query):
    # 1. Tokenize
    tokens = query.lower().split()
    
    # 2. Fetch posting lists
    results = []
    for token in tokens:
        docs = index.get(token, [])
        results.append(set(docs))
    
    # 3. Intersect (AND operation)
    common = set.intersection(*results)
    
    # 4. Rank (PageRank × relevance)
    ranked = []
    for doc_id in common:
        score = pagerank[doc_id] * relevance(query, doc_id)
        ranked.append((doc_id, score))
    
    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked[:10]
```

---

**Q42-45:** (Design Data Warehouse, Design ETL Pipeline, Design Real-Time Analytics Dashboard, Design Log Aggregation System)

---

## 📌 Part 158: Diagram-Driven Explanations

### **How to Draw System Design Diagrams**

**1. Start with Components (Top to Bottom):**

```
User/Client
    ↓
CDN (if static assets)
    ↓
Load Balancer
    ↓
API Servers (horizontally scalable)
    ↓
Cache (Redis)
    ↓
Database (primary + replicas)
    ↓
Message Queue (Kafka)
    ↓
Background Workers
```

---

**2. Add Arrows to Show Data Flow:**

```
    POST /tweet
       ↓
┌─────────────┐
│Tweet Service│
└──────┬──────┘
       │ (write)
       ▼
┌─────────────┐
│  Cassandra  │
└──────┬──────┘
       │ (publish)
       ▼
┌─────────────┐
│    Kafka    │
└──────┬──────┘
       │ (consume)
       ▼
┌─────────────┐
│Fanout Worker│ ───→ Redis (timelines)
└─────────────┘
```

---

**3. Label with Numbers/Scale:**

```
┌────────────┐
│100M users  │
└─────┬──────┘
      │ 10k QPS
      ▼
┌────────────┐
│50 servers  │ ←─ Auto-scale (CPU=60%)
└─────┬──────┘
      │
      ▼
┌────────────┐
│1 TB cache  │ ←─ 90% hit rate
└────────────┘
```

---

**4. Show Failure Scenarios:**

```
┌────────────┐
│ Primary DB │ ✗ (fails)
└────────────┘
      │
      ↓ (auto-failover in 5s)
┌────────────┐
│ Replica 1  │ ✓ (promoted to primary)
└────────────┘
```

---

## 📌 Part 159: Real-World Examples per Question

### **Example 1: Netflix Recommendation System**

**Problem:** Recommend movies to 230M users

**Solution:**

1. **Collaborative Filtering:**
   - User A watched: [Movie 1, Movie 2, Movie 3]
   - User B watched: [Movie 1, Movie 2, Movie 4]
   - Recommend Movie 3 to User B (similar taste)

2. **Content-Based Filtering:**
   - User watched: Action movies
   - Recommend: More action movies

3. **Hybrid Approach:**
   - 80% collaborative filtering
   - 20% content-based

**Architecture:**

```
┌──────────────┐
│ View History │ (Kafka)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Spark Job   │ (batch processing, daily)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  ML Models   │ (TensorFlow)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Cassandra DB │ (pre-computed recommendations)
└──────────────┘
```

**Interview Answer:**
> "I'd use collaborative filtering to find similar users, store pre-computed recommendations in Cassandra for fast reads, and update daily with Spark batch jobs. For cold-start (new users), I'd use content-based filtering (genre preferences)."

---

### **Example 2: Uber Surge Pricing**

**Problem:** Balance supply and demand dynamically

**Algorithm:**

```python
def calculate_surge(area_id):
    # Divide city into hexagonal grid (H3)
    # Each hex = 0.5 km²
    
    # Count supply (available drivers)
    supply = redis.zcount(f"hex:{area_id}:drivers", '-inf', '+inf')
    
    # Count demand (pending rides)
    demand = redis.zcount(f"hex:{area_id}:rides", '-inf', '+inf')
    
    # Calculate surge
    if supply == 0:
        surge = 3.0  # Max surge
    elif demand / supply > 2:
        surge = 2.5
    elif demand / supply > 1.5:
        surge = 2.0
    elif demand / supply > 1.2:
        surge = 1.5
    else:
        surge = 1.0  # No surge
    
    # Store in Redis (5-min TTL)
    redis.setex(f"surge:{area_id}", 300, surge)
    
    return surge
```

**Interview Answer:**
> "I'd divide the city into hexagonal grids using H3, count available drivers and pending rides per hex, calculate surge = demand/supply, and cache in Redis for 5 minutes to avoid recalculating every request."

---

### **Example 3: Instagram Stories**

**Problem:** 1B users, stories expire in 24h

**Architecture:**

```
┌───────────┐
│Upload Story│
└─────┬─────┘
      │
      ▼
┌───────────┐
│  S3 (video)│ ←─ Pre-signed URL (direct upload)
└─────┬─────┘
      │
      ▼
┌───────────┐
│Redis (TTL)│ ←─ story:{user_id} = [s3_urls], expire=24h
└─────┬─────┘
      │ (fanout to followers)
      ▼
┌───────────┐
│   Kafka   │
└─────┬─────┘
      │
      ▼
┌───────────┐
│  Workers  │ ───→ Push notification
└───────────┘
```

**Key Design:**
- **Redis TTL:** Automatically delete stories after 24h
- **No DB storage:** Stories are temporary
- **Pre-signed S3 URLs:** Direct upload from client (avoid server load)

**Interview Answer:**
> "I'd store stories in Redis with 24h TTL for auto-expiry, use pre-signed S3 URLs for direct client uploads to avoid server load, and fanout story notifications to followers via Kafka."

---

## 📌 Part 160: Common Interview Traps & Fixes

### **Trap 1: Not Asking Clarifying Questions**

❌ **Bad:**
> "I'll design Twitter with a load balancer, API servers, and a database."

✅ **Good:**
> "Before I start, can you clarify: How many users? Daily active? Write vs read ratio? Is real-time required? What's acceptable latency?"

**Why:** Shows you don't jump to conclusions and understand that requirements drive design.

---

### **Trap 2: Over-Engineering**

❌ **Bad:**
> "For 1,000 users, I'll use microservices, Kubernetes, Kafka, Cassandra, Redis, and Elasticsearch."

✅ **Good:**
> "For 1,000 users, I'd start with a monolith, PostgreSQL, and a single server. As we scale past 10k users, I'd add Redis caching and scale horizontally."

**Why:** Interviewers test if you understand when to use complex systems vs keeping it simple.

---

### **Trap 3: Ignoring Failure Scenarios**

❌ **Bad:**
> "The database stores all data."

✅ **Good:**
> "The database has a primary for writes and 3 replicas for reads. If the primary fails, we auto-failover to a replica in <5 seconds using health checks."

**Why:** Production systems fail. You must show you've thought about resilience.

---

### **Trap 4: No Capacity Estimation**

❌ **Bad:**
> "We'll use multiple servers."

✅ **Good:**
> "With 100M users and 10M tweets/day, that's 115 tweets/sec. If each server handles 1k QPS, we need 115/1000 = 1 server minimum, but with 2x buffer, 2 servers. For storage, 10M tweets × 1 KB = 10 GB/day × 365 = 3.6 TB/year."

**Why:** Shows you can quantify and make data-driven decisions.

---

### **Trap 5: Forgetting to Discuss Trade-Offs**

❌ **Bad:**
> "I'll use Cassandra for the database."

✅ **Good:**
> "I'll use Cassandra for high-volume feeds because it's write-optimized and eventually consistent, which is acceptable for social feeds. For financial transactions, I'd use PostgreSQL because we need strong consistency (ACID)."

**Why:** Every decision has trade-offs. Discussing them shows depth.

---

### **Trap 6: Not Mentioning Monitoring**

❌ **Bad:**
> "The system is complete."

✅ **Good:**
> "I'd add monitoring with Datadog for metrics (CPU, memory, QPS), CloudWatch for logs, and PagerDuty for on-call alerts. I'd track P50/P95/P99 latency and set alerts for >200ms."

**Why:** You can't fix what you can't measure.

---

### **Trap 7: Using Buzzwords Without Explanation**

❌ **Bad:**
> "We'll use microservices and event-driven architecture."

✅ **Good:**
> "We'll use microservices so that the payment service can scale independently from the user service. If payments spike during Black Friday, we scale only that service, not the entire monolith. The trade-off is increased complexity (distributed tracing, service mesh)."

**Why:** Interviewers will drill down. You must explain WHY and WHAT trade-offs.

---

## 🎯 Final Checklist Before Interview

### **5 Minutes Before:**

✅ Review scaling patterns (horizontal, caching, sharding)  
✅ Review database choices (SQL vs NoSQL)  
✅ Review consistency models (CP vs AP)  
✅ Review capacity estimation formulas  
✅ Review common failures (circuit breakers, retries)

### **During Interview:**

✅ Ask clarifying questions (5 minutes)  
✅ Calculate capacity (5 minutes)  
✅ Draw high-level architecture (10 minutes)  
✅ Deep-dive into 2-3 components (15 minutes)  
✅ Discuss trade-offs (5 minutes)  
✅ Discuss failure scenarios (5 minutes)

### **Red Flags to Avoid:**

❌ Silence (think out loud)  
❌ Single point of failure (always replicate)  
❌ No monitoring (you can't improve what you don't measure)  
❌ No trade-offs (every decision has pros/cons)  
❌ Over-confidence ("This is the only way")

---

## 🚀 You're Interview-Ready!

**Practice these 3 systems until you can design them in 30 minutes:**

1. **Twitter** (feed fanout, caching, sharding)
2. **Uber** (geo-location, real-time matching)
3. **URL Shortener** (key-value store, capacity estimation)

**Final tip:** In every interview, say this at the end:

> "If we had more time, I'd also discuss: [choose 2-3]  
> • Auto-scaling strategies (K8s HPA, AWS Auto Scaling)  
> • Cost optimization (spot instances, reserved capacity)  
> • Multi-region deployment (latency, disaster recovery)  
> • Security (rate limiting, DDoS protection, encryption)  
> • Observability (distributed tracing, metrics, logs)"

This shows breadth beyond the 45-minute scope and leaves a strong impression! 💪

---

🎓 **Congratulations! You've completed all 160 files of the most comprehensive System Design guide!** 🚀

