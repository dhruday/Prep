# 150. One-Page Scalability Cheats (Quick Reference for Interviews)

## 📌 Purpose

**Lightning-fast reference** for system design interviews. Memorize these patterns to answer confidently in <5 seconds.

---

## 🚀 Scaling Patterns (The Big 6)

### **1. Horizontal Scaling (Add More Servers)**

```
Problem: Single server overloaded
Solution: Add more servers + Load balancer

Before: 1 server @ 100% CPU
After: 10 servers @ 10% CPU

Tools: AWS Auto Scaling, Kubernetes HPA
Cost: Linear (2x servers = 2x cost)
Limit: Stateless services only (no sticky sessions)
```

**Interview phrase:** *"I'd horizontally scale by adding more instances behind a load balancer."*

---

### **2. Database Sharding (Partition Data)**

```
Problem: Database too large for one server
Solution: Split data across multiple databases

Sharding key: user_id % 4
  - Shard 0: Users 0, 4, 8, 12...
  - Shard 1: Users 1, 5, 9, 13...
  - Shard 2: Users 2, 6, 10, 14...
  - Shard 3: Users 3, 7, 11, 15...

Benefit: 4x capacity (4 shards)
Drawback: Can't query across shards (no global JOINs)
```

**Interview phrase:** *"I'd shard by user_id to distribute data evenly across databases."*

---

### **3. Caching (Redis/Memcached)**

```
Problem: Database slow (100ms queries)
Solution: Cache hot data in memory (1ms)

Cache-aside pattern:
  1. Check cache → If hit, return (1ms)
  2. If miss → Query DB (100ms)
  3. Store in cache (TTL = 5 min)
  4. Return result

Benefit: 90%+ cache hit rate = 10x faster
Drawback: Cache invalidation (stale data)
```

**Interview phrase:** *"I'd add Redis caching with a 5-minute TTL to reduce database load by 90%."*

---

### **4. Asynchronous Processing (Message Queues)**

```
Problem: Slow API response (2 seconds)
Solution: Queue work, return immediately

Sync:  User → API → Process (2s) → Response
Async: User → API → Queue → Response (50ms)
                        ↓
                     Worker → Process (2s)

Tools: Kafka, RabbitMQ, SQS
Benefit: Low latency (50ms vs 2s)
Drawback: Eventual completion (not immediate)
```

**Interview phrase:** *"I'd use Kafka to queue tasks asynchronously, reducing API latency from 2s to 50ms."*

---

### **5. Read Replicas (Scale Reads)**

```
Problem: Too many reads, database overloaded
Solution: Add read replicas (eventual consistency)

Architecture:
  Primary (writes) → Read Replica 1 (reads)
                  → Read Replica 2 (reads)
                  → Read Replica 3 (reads)

Benefit: 3x read capacity
Drawback: Replication lag (<1s stale data)
```

**Interview phrase:** *"I'd add read replicas to scale reads while keeping writes on the primary."*

---

### **6. CDN (Content Delivery Network)**

```
Problem: Users far from server (high latency)
Solution: Cache static assets at edge locations

Without CDN: User (Japan) → US Server (200ms)
With CDN:    User (Japan) → Tokyo Edge (20ms)

Tools: CloudFront, Cloudflare, Fastly
Benefit: 10x lower latency, reduced origin load
Use case: Images, videos, CSS, JS
```

**Interview phrase:** *"I'd use a CDN like CloudFront to serve static assets from edge locations."*

---

## ⚡ Latency Numbers Every Engineer Should Know

| Operation | Latency | Real-World Example |
|-----------|---------|-------------------|
| L1 cache | 0.5 ns | Reading CPU register |
| L2 cache | 7 ns | Reading L2 cache |
| RAM | 100 ns | Reading from RAM |
| Send 2KB over network | 20 μs | Local network packet |
| SSD random read | 150 μs | Reading from SSD |
| Round trip within datacenter | 500 μs | Server-to-server call |
| Disk seek | 10 ms | Reading from HDD |
| Network round trip (US-Europe) | 150 ms | Transatlantic request |

**Key takeaways:**
- **RAM is 100,000x faster than disk**
- **Network within datacenter: 0.5ms (acceptable)**
- **Cross-continent: 150ms (use CDN)**

---

## 🔥 Scalability Principles (The Rule of 10x)

### **Rule 1: Vertical Scaling (10x Capacity)**

```
Problem: Server maxed out (10k QPS)
Solution: Upgrade to larger instance

Before: 4 vCPU, 16 GB RAM → 10k QPS
After:  16 vCPU, 64 GB RAM → 40k QPS (4x capacity)

Cost: 4x price
Limit: 10-100x (then hit hardware limits)
```

---

### **Rule 2: Horizontal Scaling (100x+ Capacity)**

```
Problem: Vertical scaling too expensive/impossible
Solution: Add more servers

Before: 1 server → 10k QPS
After:  100 servers → 1M QPS (100x capacity)

Cost: 100x price (but unlimited scaling)
Limit: Stateless services only
```

---

### **Rule 3: Caching (10x Faster)**

```
Problem: Database slow (100ms queries)
Solution: Cache hot data in Redis

Before: 100ms per query (10 QPS per server)
After:  10ms per query (100 QPS per server)

Benefit: 10x throughput, 10x lower DB load
```

---

### **Rule 4: Denormalization (10x Faster Reads)**

```
Problem: Complex JOINs slow (500ms)
Solution: Denormalize data (duplicate fields)

Before: SELECT * FROM orders JOIN users JOIN products (500ms)
After:  SELECT * FROM orders (all fields duplicated, 50ms)

Benefit: 10x faster reads
Drawback: Harder to update (duplicate data)
```

---

### **Rule 5: Asynchronous Processing (10x Lower Latency)**

```
Problem: Slow API (2s response time)
Solution: Queue work asynchronously

Before: Process inline (2s latency)
After:  Queue to worker (200ms latency)

Benefit: 10x lower latency
Drawback: Eventual completion (not immediate)
```

---

## 📊 Quick Decision Trees

### **Decision 1: Database Selection**

```
Do you need ACID transactions? (payments, inventory)
  YES → SQL (PostgreSQL, MySQL)
  NO  ↓

Is data highly relational? (users → orders → products)
  YES → SQL (PostgreSQL)
  NO  ↓

Is data schema-less? (user profiles with dynamic fields)
  YES → Document DB (MongoDB, DynamoDB)
  NO  ↓

Is data time-series? (metrics, logs)
  YES → Time-series DB (InfluxDB, TimescaleDB)
  NO  ↓

Is data key-value? (sessions, caching)
  YES → KV store (Redis, Memcached)
  NO  ↓

Is data graph? (social network, friends)
  YES → Graph DB (Neo4j)
```

---

### **Decision 2: Consistency Model**

```
Is data financial? (money, inventory, reservations)
  YES → Strong consistency (PostgreSQL, ACID)
  NO  ↓

Is data user-facing? (social feeds, notifications)
  YES → Eventual consistency (Cassandra, DynamoDB)
```

---

### **Decision 3: Sync vs Async**

```
Does user need immediate confirmation? (payments, auth)
  YES → Synchronous (wait for completion)
  NO  ↓

Is operation >100ms? (emails, image processing)
  YES → Asynchronous (queue to worker)
```

---

## 🎯 Capacity Estimation (Back-of-Envelope)

### **Formula 1: Storage**

```
Total users: 100M
Data per user: 10 KB
Total storage: 100M × 10 KB = 1 TB
Growth per year: 1 TB
Total over 5 years: 5 TB
```

---

### **Formula 2: Bandwidth**

```
Daily writes: 10M requests
Request size: 1 KB
Daily write bandwidth: 10M × 1 KB = 10 GB/day
Write QPS: 10M / 86400 = 115 writes/sec

Daily reads: 100M requests
Read QPS: 100M / 86400 = 1,157 reads/sec
Peak QPS: 5x = 5,785 reads/sec
```

---

### **Formula 3: Servers Required**

```
Target QPS: 10,000 reads/sec
QPS per server: 1,000 (measured)
Servers required: 10,000 / 1,000 = 10 servers
Add 50% buffer: 10 × 1.5 = 15 servers
```

---

## 🚨 Anti-Patterns (What NOT to Do)

| Anti-Pattern | Why Bad | Correct Approach |
|--------------|---------|------------------|
| **Over-engineering** (microservices for 1k users) | Complexity without benefit | Start with monolith, split later |
| **Premature optimization** (caching everything) | Adds complexity, hard to debug | Profile first, optimize bottlenecks |
| **No monitoring** (can't see issues) | Blind to production problems | Metrics, logs, alerts (Datadog, CloudWatch) |
| **Shared database** (all services use one DB) | Single point of failure, tight coupling | Each service has own database |
| **No rate limiting** (DDoS vulnerable) | System can be overwhelmed | Token bucket (1000 req/min per user) |
| **Storing passwords in plaintext** (security risk) | Data breach = exposed passwords | bcrypt (hash + salt) |
| **No backups** (data loss risk) | Disaster recovery impossible | Daily backups, 30-day retention |
| **Hard-coded secrets** (security risk) | Credentials in code = exposed | Environment variables, Secrets Manager |

---

## 💡 Interview One-Liners (Memorize These)

| Scenario | One-Liner Response |
|----------|-------------------|
| Scale reads | *"Add read replicas to distribute read traffic while keeping writes on primary."* |
| Scale writes | *"Shard database by user_id to distribute writes across multiple databases."* |
| Reduce latency | *"Add Redis caching with 5-minute TTL to achieve 90%+ cache hit rate."* |
| Handle spikes | *"Use auto-scaling with target CPU=60% to handle traffic spikes dynamically."* |
| Global latency | *"Deploy to multiple regions (US, EU, Asia) with GeoDNS routing to nearest datacenter."* |
| Async processing | *"Queue tasks to Kafka and process with workers to reduce API latency from 2s to 50ms."* |
| Data durability | *"Use S3 (99.999999999% durability) with cross-region replication for disaster recovery."* |
| Consistency | *"For payments, I'd use PostgreSQL with ACID; for feeds, Cassandra with eventual consistency."* |

---

## 📝 The 30-Second System Design Template

**Use this structure for ANY system design question:**

```
1. Requirements (30 sec)
   "We need to support 100M users, 10k writes/sec, <100ms latency."

2. High-Level Design (1 min)
   "I'd use: Load Balancer → API Servers → Database (sharded) + Redis cache + Kafka queue."

3. Database (1 min)
   "PostgreSQL for transactional data (strong consistency), Cassandra for feeds (eventual consistency)."

4. Scalability (1 min)
   "Horizontal scaling with auto-scaling (target CPU=60%), database sharding by user_id."

5. Bottlenecks (1 min)
   "Database would be the bottleneck. I'd add read replicas and Redis caching."

6. Trade-offs (30 sec)
   "I prioritized consistency for payments (CP) and availability for feeds (AP)."
```

---

## 🎓 Cheat Sheet Summary

**Scaling:** Horizontal (add servers) > Vertical (bigger server)  
**Database:** Shard by user_id, read replicas for reads  
**Caching:** Redis (90%+ hit rate, 5-min TTL)  
**Async:** Kafka for tasks >100ms  
**CDN:** Static assets (images, videos)  
**Consistency:** Strong (money) vs Eventual (feeds)  

**Capacity:** 10M users × 10 KB = 100 GB  
**QPS:** 10M/day ÷ 86400 = 115 QPS  
**Servers:** Target QPS ÷ QPS per server × 1.5 buffer  

**Interview:** Requirements → High-level → Database → Scalability → Bottlenecks → Trade-offs

🚀 **Memorize these patterns to ace any system design interview!**

