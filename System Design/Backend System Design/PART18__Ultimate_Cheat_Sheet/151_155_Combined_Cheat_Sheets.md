# 151-155. Ultimate Interview Cheat Sheets (Combined)

## 📌 Database Selection Cheat Sheet

### **Quick Decision Matrix**

| Use Case | Database | Reason |
|----------|----------|--------|
| **Transactions** (payments, orders) | PostgreSQL | ACID, strong consistency |
| **User profiles** (flexible schema) | MongoDB | Document store, schema-less |
| **Social graph** (friends, followers) | Neo4j | Graph queries (shortest path) |
| **Time-series** (metrics, logs) | InfluxDB | Compression, time-based queries |
| **Full-text search** (products) | Elasticsearch | Inverted index, ranking |
| **High writes** (activity feeds) | Cassandra | Write-optimized, distributed |
| **Caching** (sessions, tokens) | Redis | In-memory, <1ms latency |
| **Blob storage** (images, videos) | S3 | Durable (11 9s), scalable |

---

## 📌 Caching Strategies Cheat Sheet

### **Cache-Aside (Lazy Loading)** ← Most Common

```python
def get_user(user_id):
    # 1. Check cache
    user = cache.get(f"user:{user_id}")
    if user:
        return user  # Cache hit
    
    # 2. Cache miss → Query DB
    user = db.query("SELECT * FROM users WHERE id = ?", user_id)
    
    # 3. Store in cache
    cache.set(f"user:{user_id}", user, ttl=300)  # 5 min TTL
    return user
```

**Pros:** Simple, only cache requested data  
**Cons:** Cache miss = 2x latency (cache + DB)

---

### **Write-Through (Always Consistent)**

```python
def update_user(user_id, data):
    # 1. Update DB
    db.update("UPDATE users SET name = ? WHERE id = ?", data['name'], user_id)
    
    # 2. Update cache
    cache.set(f"user:{user_id}", data, ttl=300)
```

**Pros:** Cache always consistent with DB  
**Cons:** Every write hits cache (slower writes)

---

### **Write-Behind (Eventual Consistency)**

```python
def update_user(user_id, data):
    # 1. Update cache immediately
    cache.set(f"user:{user_id}", data, ttl=300)
    
    # 2. Queue DB write (async)
    queue.publish('user-updates', {'user_id': user_id, 'data': data})
```

**Pros:** Fast writes (cache only)  
**Cons:** Data loss if cache fails before DB write

---

### **Cache Invalidation Strategies**

| Strategy | When to Use | Example |
|----------|-------------|---------|
| **TTL (Time-To-Live)** | Data changes infrequently | `cache.set(key, value, ttl=300)` # 5 min |
| **Explicit invalidation** | Data changes, need instant update | `cache.delete(f"user:{user_id}")` after update |
| **Write-through** | Must stay consistent | Update cache on every DB write |

---

## 📌 CAP / PACELC Theorem Cheat Sheet

### **CAP Theorem**

**You can have AT MOST 2 of 3:**
- **C**onsistency: All nodes see same data
- **A**vailability: System always responds
- **P**artition tolerance: Works despite network failures

**In practice (Partition tolerance mandatory):**
- **CP:** Consistency + Partition tolerance (sacrifice availability)
  - Example: PostgreSQL, MongoDB
  - Use case: Banking, inventory
  
- **AP:** Availability + Partition tolerance (sacrifice consistency)
  - Example: Cassandra, DynamoDB
  - Use case: Social feeds, notifications

---

### **PACELC Theorem (Extended CAP)**

**During Partition (P):**
- Choose: Availability (A) or Consistency (C)

**Else (no partition):**
- Choose: Latency (L) or Consistency (C)

**Examples:**

| System | Partition | Normal | Use Case |
|--------|-----------|--------|----------|
| PostgreSQL | PC | EC | Banking (always consistent) |
| Cassandra | PA | EL | Social feeds (low latency) |
| DynamoDB | PA | EL | Shopping cart (available, fast) |

**Interview phrase:**  
> *"For payments, I'd choose PC/EC (strong consistency always). For social feeds, I'd choose PA/EL (low latency, eventual consistency acceptable)."*

---

## 📌 Messaging Guarantees Cheat Sheet

### **At-Most-Once (Fire and Forget)**

```
Producer → Message Queue → Consumer (processes once OR drops)

Guarantee: Message delivered 0 or 1 times
Risk: Message loss if consumer crashes
Use case: Metrics (losing 1 data point OK)
```

---

### **At-Least-Once (Retry Until Success)** ← Most Common

```
Producer → Message Queue → Consumer (ACK after processing)
                              ↓
                           Retry if no ACK

Guarantee: Message delivered ≥1 times (duplicates possible)
Risk: Duplicate processing (must be idempotent)
Use case: Orders, emails (OK to receive twice if idempotent)
```

**Idempotency pattern:**
```python
def process_order(order_id):
    # Check if already processed
    if db.exists(f"processed:{order_id}"):
        return "Already processed"
    
    # Process order
    create_order(order_id)
    
    # Mark as processed
    db.set(f"processed:{order_id}", True)
```

---

### **Exactly-Once (Guaranteed Once)**

```
Producer → Message Queue → Consumer (transactional processing)

Guarantee: Message delivered exactly 1 time
Implementation: Distributed transactions (2PC, SAGA)
Use case: Payments (critical, no duplicates)
Trade-off: Complex, slower
```

**Comparison:**

| Guarantee | Delivery | Duplicates | Speed | Use Case |
|-----------|----------|------------|-------|----------|
| At-most-once | 0-1x | No | Fastest | Metrics, logs |
| At-least-once | ≥1x | Yes | Fast | Orders, emails |
| Exactly-once | 1x | No | Slow | Payments |

---

## 📌 Interview Last-Minute Revision

### **30 Seconds Before Interview**

**Repeat these 5 times:**

1. **Horizontal scaling:** Add more servers + load balancer
2. **Database sharding:** user_id % N shards
3. **Redis caching:** 90%+ hit rate, 5-min TTL
4. **Kafka async:** Queue tasks >100ms
5. **Read replicas:** Scale reads, eventual consistency

---

### **First 5 Minutes of Interview**

**Ask clarifying questions:**

```
1. Users: "How many users? Daily active users?"
2. Scale: "What's the expected QPS? Peak vs average?"
3. Data: "How much data? Growth rate?"
4. Latency: "What's acceptable latency? P50 vs P99?"
5. Consistency: "Can data be eventually consistent?"
```

**Calculate capacity:**

```
Users: 100M
Daily writes: 10M → 115 writes/sec
Daily reads: 100M → 1,157 reads/sec
Storage: 100M × 10 KB = 1 TB
```

---

### **Drawing the Architecture**

**Always draw this structure:**

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│Load Balancer│
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ API Servers │ ←→  │   Redis     │
└──────┬──────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Database   │ ←→  │    Kafka    │
└─────────────┘     └─────────────┘
```

**Explain each component:**
- **Load Balancer:** Distribute traffic (Round-robin, Least connections)
- **API Servers:** Stateless (auto-scale based on CPU)
- **Redis:** Cache hot data (90%+ hit rate)
- **Database:** Sharded by user_id (PostgreSQL for transactions)
- **Kafka:** Async processing (emails, notifications)

---

### **Common Follow-Up Questions**

**Q1: "What if database is the bottleneck?"**

> *"I'd add read replicas for reads (3x capacity), cache with Redis (90% hit rate), and shard by user_id for writes (4x capacity)."*

---

**Q2: "How do you handle cache invalidation?"**

> *"I'd use TTL (5-minute expiry) for most data and explicit invalidation (delete cache key) for critical updates like user profiles."*

---

**Q3: "What if one service goes down?"**

> *"I'd implement circuit breakers (stop calling failing service), fallback to cached data, and retry with exponential backoff (1s, 2s, 4s)."*

---

**Q4: "How do you ensure data consistency?"**

> *"For financial data, I'd use strong consistency (PostgreSQL with ACID). For social feeds, eventual consistency is acceptable (Cassandra)."*

---

**Q5: "How do you deploy without downtime?"**

> *"I'd use blue-green deployment (deploy to new servers, switch traffic atomically) or rolling deployment (update 10% of servers at a time)."*

---

### **The Ultimate One-Pager**

```
┌─────────────────────────────────────────────┐
│ SYSTEM DESIGN INTERVIEW CHEAT SHEET         │
├─────────────────────────────────────────────┤
│                                             │
│ 1. SCALING                                  │
│   • Horizontal (add servers) > Vertical     │
│   • Database: Shard by user_id              │
│   • Reads: Read replicas (3x capacity)      │
│   • Cache: Redis (90% hit, 5-min TTL)       │
│   • Async: Kafka (tasks >100ms)             │
│                                             │
│ 2. DATABASES                                │
│   • Transactions → PostgreSQL (ACID)        │
│   • Feeds → Cassandra (eventual)            │
│   • Search → Elasticsearch (full-text)      │
│   • Cache → Redis (in-memory)               │
│   • Blob → S3 (11 9s durability)            │
│                                             │
│ 3. CONSISTENCY                              │
│   • Money/Inventory → Strong (CP)           │
│   • Feeds/Notifications → Eventual (AP)     │
│                                             │
│ 4. CAPACITY                                 │
│   • Storage: Users × Data/User             │
│   • QPS: Daily Requests ÷ 86400            │
│   • Servers: Target QPS ÷ QPS/Server × 1.5 │
│                                             │
│ 5. BOTTLENECKS                              │
│   • Database → Read replicas + Cache        │
│   • API → Horizontal scaling + CDN          │
│   • Network → CDN + Compression             │
│                                             │
│ 6. FAILURE HANDLING                         │
│   • Circuit breaker (stop calling failures) │
│   • Retry (exponential backoff: 1s, 2s, 4s)│
│   • Fallback (cached data, degraded mode)   │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 🎯 Final Interview Tips

### **Do's:**
✅ Ask clarifying questions (users, scale, latency)  
✅ Calculate capacity (storage, QPS, servers)  
✅ Draw architecture diagram (load balancer → API → DB)  
✅ Explain trade-offs (consistency vs availability)  
✅ Mention real-world examples (Netflix, Uber, Twitter)  
✅ Discuss failure scenarios (circuit breakers, retries)

### **Don'ts:**
❌ Jump to solution without requirements  
❌ Over-engineer (microservices for 1k users)  
❌ Ignore scalability (single server forever)  
❌ Forget monitoring (metrics, logs, alerts)  
❌ Skip trade-offs (every decision has trade-offs)  
❌ Use buzzwords without explanation

---

## 🚀 The 60-Second Pitch

**Memorize this template:**

> "I'd design this system with a **load balancer** distributing traffic to **stateless API servers** that can auto-scale. For data storage, I'd use **PostgreSQL sharded by user_id** for transactional data and **Cassandra** for high-volume feeds. I'd add **Redis caching** for hot data (90%+ hit rate) and use **Kafka** for asynchronous processing like emails and notifications. To handle failures, I'd implement **circuit breakers** and **retry logic**. The system would scale horizontally to handle millions of users and thousands of QPS."

**Practice saying this in 60 seconds until it's natural!**

🎓 **You're now ready to ace any system design interview!** 🚀

