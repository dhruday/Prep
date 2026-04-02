# 10. Vertical vs Horizontal Scaling

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Scaling** is the process of increasing a system's capacity to handle more load. There are two fundamental approaches: **Vertical Scaling (Scale Up)** and **Horizontal Scaling (Scale Out)**.

### What They Are

#### **Vertical Scaling (Scale Up)**
Adding more resources (CPU, RAM, disk, network) to a **single machine**.
- Example: Upgrading from a 4-core, 16GB server to a 32-core, 256GB server

#### **Horizontal Scaling (Scale Out)**
Adding more **machines** to distribute the load across multiple nodes.
- Example: Going from 1 server to 10 servers behind a load balancer

### Why This Matters
The choice between vertical and horizontal scaling fundamentally shapes your architecture:
- **Vertical scaling** is simple but has hard limits
- **Horizontal scaling** is complex but offers unlimited growth
- **Real systems** use a hybrid approach

### The Problem They Solve
As your application grows:
- **More users** → More concurrent requests
- **More data** → Larger databases
- **More features** → Higher compute requirements

Both approaches solve the capacity problem, but with **completely different trade-offs**.

### Where and When They're Used

**Vertical Scaling is used when:**
- You're in the early stages (MVP, product-market fit)
- You need strong consistency (single-node ACID transactions)
- Your database requires complex queries and joins
- Your application is not yet designed for distribution

**Horizontal Scaling is used when:**
- You've outgrown a single machine
- You need fault tolerance and high availability
- You're building cloud-native, distributed systems
- Cost efficiency matters at scale

### Role in Large-Scale Distributed Systems
At FAANG scale:
- **Netflix:** Horizontally scales thousands of microservices
- **Amazon:** Uses horizontal scaling for web tier, vertical for certain databases
- **Facebook:** Shards databases horizontally, caches horizontally (millions of cache servers)
- **Google:** Horizontally scales everything (Spanner, BigTable, GFS)

The ability to scale horizontally is what enables **internet-scale systems**.

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Vertical Scaling: The Deep Dive

#### **What Changes When You Scale Vertically**

**Hardware Upgrades:**
```
Before: AWS EC2 t3.medium (2 vCPU, 4GB RAM, $30/month)
After:  AWS EC2 m5.24xlarge (96 vCPU, 384GB RAM, $4,608/month)
```

**Resource Improvements:**
- **CPU:** More cores → Handle more concurrent threads
- **RAM:** More memory → Larger in-memory datasets, bigger caches
- **Disk:** Faster SSDs → Lower I/O latency
- **Network:** Higher bandwidth NICs → More throughput

#### **The Math Behind Vertical Scaling**

**Single-Threaded Workload:**
- 2x CPU speed → ~2x performance
- But modern CPUs are hitting physical limits (Moore's Law slowing)

**Multi-Threaded Workload:**
- 2x cores → Potentially 2x throughput
- But: Diminishing returns due to thread synchronization overhead
- Amdahl's Law: Speedup limited by serial portions of code

**Database Example:**
```
4-core, 16GB RAM → Handles 5,000 QPS
16-core, 64GB RAM → Handles 15,000 QPS (not 20,000 due to locking contention)
```

#### **Vertical Scaling Limits**

**Physical Limits:**
- Largest AWS EC2 instance: ~448 vCPUs, 24TB RAM (u-24tb1.metal)
- Cost: ~$300,000/year
- Still has an upper bound

**Software Limits:**
- **Global locks** become bottlenecks (database row locks, JVM GC pauses)
- **Memory bandwidth** saturates (RAM speed < CPU speed)
- **NUMA effects** (Non-Uniform Memory Access on multi-socket servers)

**Cost Curve:**
- **Linear resources** → **Exponential cost**
- 2x capacity ≠ 2x cost (often 3-4x cost)

#### **When Vertical Scaling Makes Sense**

✅ **Databases requiring ACID transactions**
- PostgreSQL, MySQL handling complex joins
- Vertical scaling maintains single-machine consistency

✅ **Stateful applications**
- In-memory caches, session stores
- Avoid distributed state complexity

✅ **Legacy applications**
- Not designed for horizontal scaling
- Easier to upgrade hardware than rewrite code

✅ **Development environments**
- Simplicity over scalability

---

### Horizontal Scaling: The Deep Dive

#### **What Changes When You Scale Horizontally**

**Infrastructure Changes:**
```
Before: 1 server (100% of traffic)
After:  10 servers (10% of traffic each)
```

**Architectural Requirements:**
1. **Load Balancer** → Distribute traffic
2. **Stateless Services** → Any server can handle any request
3. **Shared Data Store** → Database, cache, or distributed storage
4. **Service Discovery** → Servers must find each other
5. **Health Checks** → Detect and remove failed nodes

#### **The Math Behind Horizontal Scaling**

**Linear Scalability (Ideal):**
- 1 server → 1,000 QPS
- 10 servers → 10,000 QPS
- 100 servers → 100,000 QPS

**Real-World Scalability (Accounting for Overhead):**
```
Efficiency = (Actual Throughput) / (Theoretical Max Throughput)

Example:
- 1 server: 1,000 QPS (baseline)
- 10 servers: 9,500 QPS (95% efficiency)
  - Lost 5% to network overhead, load balancer latency, cross-server coordination
```

**Scalability Efficiency Factors:**
- **Network latency** (cross-node communication)
- **Load balancer overhead** (~1-5ms per request)
- **Uneven load distribution** (hot spots, sticky sessions)
- **Shared resource contention** (database, cache)

#### **Horizontal Scaling Patterns**

##### **1. Stateless Application Servers**
```
[Load Balancer]
     |
     +---> [App Server 1] --\
     +---> [App Server 2] ---+---> [Redis] ---> [Database]
     +---> [App Server 3] --/

Key: Session data in Redis, not in server memory
```

**Benefits:**
- Any server can handle any request
- Easy to add/remove servers
- No session loss on server failure

**Implementation (Java/Spring Boot):**
```java
// Store session in Redis, not in-memory
@Configuration
public class SessionConfig {
    @Bean
    public RedisConnectionFactory connectionFactory() {
        return new LettuceConnectionFactory();
    }
}

// Spring Session automatically handles distributed sessions
@EnableRedisHttpSession
public class HttpSessionConfig {
}
```

##### **2. Database Read Replicas**
```
      [App Servers]
         /       \
        /         \
   [Master DB]   [Read Replicas]
   (Writes)      (Reads)
```

**Read/Write Split:**
- Master handles all writes
- Replicas handle reads (5-10 replicas typical)
- Replication lag: 0-500ms (eventually consistent)

**Code Example (Spring Boot):**
```java
@Configuration
public class DataSourceConfig {
    @Bean
    @Primary
    public DataSource dataSource() {
        ReplicationRoutingDataSource routingDataSource = 
            new ReplicationRoutingDataSource();
        
        Map<Object, Object> dataSources = new HashMap<>();
        dataSources.put("write", masterDataSource());
        dataSources.put("read", readReplicaDataSource());
        
        routingDataSource.setTargetDataSources(dataSources);
        return routingDataSource;
    }
}

// Usage in service
@Transactional(readOnly = true) // Routes to read replica
public User getUserById(Long id) {
    return userRepository.findById(id);
}

@Transactional // Routes to master
public void updateUser(User user) {
    userRepository.save(user);
}
```

##### **3. Database Sharding (Horizontal Partitioning)**
```
User ID 1-1M    → Shard 1 (DB1)
User ID 1M-2M   → Shard 2 (DB2)
User ID 2M-3M   → Shard 3 (DB3)
```

**Sharding Strategies:**

**a) Hash-Based Sharding:**
```java
public class ShardResolver {
    private static final int NUM_SHARDS = 4;
    
    public int getShardId(Long userId) {
        return (int) (userId % NUM_SHARDS);
    }
    
    public DataSource getShardDataSource(Long userId) {
        int shardId = getShardId(userId);
        return dataSourceMap.get(shardId);
    }
}
```

**b) Range-Based Sharding:**
```java
public class RangeShardResolver {
    // Shard 0: 1-1M, Shard 1: 1M-2M, etc.
    public int getShardId(Long userId) {
        return (int) ((userId - 1) / 1_000_000);
    }
}
```

**c) Geographic Sharding:**
```java
public class GeoShardResolver {
    public String getShardRegion(String country) {
        switch(country) {
            case "US": return "us-west-2";
            case "EU": return "eu-west-1";
            case "ASIA": return "ap-southeast-1";
            default: return "us-west-2";
        }
    }
}
```

##### **4. Caching Layer (Horizontal)**
```
[App Servers]
      |
 [Cache Cluster: Redis/Memcached]
  Node1, Node2, ..., Node10
      |
  [Databases]
```

**Consistent Hashing for Cache Distribution:**
```java
public class ConsistentHashCache {
    private TreeMap<Integer, CacheNode> ring = new TreeMap<>();
    
    public CacheNode getCacheNode(String key) {
        int hash = hash(key);
        Map.Entry<Integer, CacheNode> entry = ring.ceilingEntry(hash);
        return (entry != null) ? entry.getValue() : ring.firstEntry().getValue();
    }
}
```

##### **5. Message Queues (Horizontal)**
```
[Producers] --> [Kafka/RabbitMQ Cluster] --> [Consumers]
                   Partition 0, 1, 2, ...     (Auto-scaled)
```

**Kafka Horizontal Scaling:**
- Topics split into partitions
- Each partition assigned to different brokers
- Consumers scale independently (consumer groups)

```java
// Kafka consumer auto-scales
@KafkaListener(topics = "orders", groupId = "order-processor")
public void processOrder(Order order) {
    // Each consumer instance processes different partitions
    orderService.process(order);
}
```

---

### The Critical Trade-Offs

| **Dimension**              | **Vertical Scaling**                          | **Horizontal Scaling**                           |
|----------------------------|-----------------------------------------------|--------------------------------------------------|
| **Complexity**             | ✅ Simple (no code changes)                   | ❌ Complex (distributed systems)                 |
| **Scalability Limit**      | ❌ Hard limits (~100TB RAM, 448 cores)        | ✅ Unlimited (add more nodes)                    |
| **Cost**                   | ❌ Exponential (2x capacity = 4x cost)        | ✅ Linear (2x capacity ≈ 2x cost)                |
| **Fault Tolerance**        | ❌ Single Point of Failure                    | ✅ Redundant (no single point of failure)        |
| **Consistency**            | ✅ Strong (single machine, ACID)              | ⚠️ Eventual consistency (CAP theorem)            |
| **Latency**                | ✅ No network hops                            | ⚠️ Network latency (cross-node calls)            |
| **Downtime**               | ❌ Required for upgrades                      | ✅ Rolling deployments (zero downtime)           |
| **Data Locality**          | ✅ All data in one place (fast joins)         | ❌ Data distributed (cross-shard queries hard)   |
| **Operational Overhead**   | ✅ Low (single server to monitor)             | ❌ High (many servers, load balancers, etc.)     |
| **Development Speed**      | ✅ Fast (no distributed concerns)             | ❌ Slower (handle failures, retries, etc.)       |

---

### Hybrid Approach (Real-World FAANG Pattern)

**Most FAANG systems use BOTH:**

```
┌─────────────────────────────────────────────┐
│  Application Tier (Horizontal)              │
│  [LB] -> [App1, App2, ..., App100]          │
│  - Stateless microservices                  │
│  - Auto-scaling (CPU > 70% → add servers)   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Cache Tier (Horizontal)                    │
│  [Redis Cluster: 20 nodes]                  │
│  - Distributed caching                      │
│  - Consistent hashing                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Database Tier (Hybrid)                     │
│  Master (Vertical: 64 cores, 512GB RAM)     │
│  + Read Replicas (Horizontal: 10 nodes)     │
│  + Sharding (Horizontal: 4 shards)          │
└─────────────────────────────────────────────┘
```

**Strategy:**
1. **Web/App Tier:** Horizontal (easy, stateless)
2. **Cache Tier:** Horizontal (easy, key-value)
3. **Database Tier:** Vertical first, then horizontal (sharding)

---

### Detailed Scaling Scenarios

#### **Scenario 1: E-Commerce Site (0 → 1M Users)**

**Phase 1: Single Server (0-10K users)**
```
[Monolith App + DB on 1 server]
Cost: $100/month
Architecture: Simple, fast to build
```

**Phase 2: Separate DB (10K-100K users)**
```
[App Server] -> [DB Server (Vertical: 8 cores, 64GB)]
Cost: $500/month
Change: Vertical scale DB, keep app simple
```

**Phase 3: Horizontal App Tier (100K-500K users)**
```
[LB] -> [App1, App2, App3] -> [DB (Vertical: 16 cores, 128GB)]
                               [Redis Cache]
Cost: $2,000/month
Change: Horizontal app servers, vertical DB
```

**Phase 4: Horizontal DB + Sharding (500K-1M users)**
```
[LB] -> [App Cluster: 10 nodes]
         |
    [Cache Cluster: 5 nodes]
         |
    [DB Shards: 4 shards, each with replicas]
Cost: $10,000/month
Change: Shard DB horizontally by user_id
```

---

#### **Scenario 2: Analytics Platform (High Write Throughput)**

**Challenge:** 100K writes/sec, 1M reads/sec

**Vertical Approach (Fails):**
```
Single PostgreSQL: Max ~10K writes/sec
❌ Cannot handle 100K writes/sec
```

**Horizontal Approach (Succeeds):**
```
[Write Traffic] -> [Kafka: 10 partitions] -> [10 Consumer Workers]
                                               |
                                        [Cassandra: 20 nodes]
                                        (Distributed writes)
```

**Why Horizontal Wins:**
- Cassandra scales writes linearly (20 nodes = 100K writes/sec)
- Kafka partitions parallelize ingestion
- No single bottleneck

---

### When Vertical Scaling Breaks

**Real-World Example: Database Overload**

**Symptoms:**
- High CPU (>90%)
- Query latency spikes (10ms → 5000ms)
- Connection pool exhaustion
- Lock contention

**Vertical Scaling Attempt:**
```
Before: 16 cores, 128GB RAM → 2000 QPS
After:  32 cores, 256GB RAM → 3000 QPS (only 1.5x improvement)

Cost doubled, performance didn't
```

**Root Cause:**
- Not CPU-bound, but **lock-bound**
- Single-threaded writes create bottleneck
- More cores don't help

**Horizontal Scaling Solution:**
```
Shard DB into 4 shards:
Each shard handles 500 QPS
Total: 2000 QPS → 8000 QPS (4x improvement)
```

---

### Advanced Patterns

#### **1. Vertical Scaling with Read Replicas (Hybrid)**
```
Master (Vertical: 32 cores) ──┐
                              ├─→ Replica 1 (Horizontal)
                              ├─→ Replica 2 (Horizontal)
                              └─→ Replica 3 (Horizontal)

Strategy:
- Scale master vertically (handle write complexity)
- Scale reads horizontally (easy to distribute)
```

#### **2. Auto-Scaling (Horizontal)**
```java
// AWS Auto Scaling Policy
{
  "TargetValue": 70.0,  // Target CPU %
  "MetricType": "ASGAverageCPUUtilization",
  "ScaleOutCooldown": 300,  // Wait 5min before adding more
  "ScaleInCooldown": 600     // Wait 10min before removing
}
```

**Triggers:**
- CPU > 70% for 5 minutes → Add 2 servers
- CPU < 30% for 10 minutes → Remove 1 server

#### **3. Database Connection Pooling (Vertical Optimization)**
```java
@Configuration
public class DatabaseConfig {
    @Bean
    public HikariDataSource dataSource() {
        HikariConfig config = new HikariConfig();
        
        // Optimize for vertical scaling
        config.setMaximumPoolSize(50);  // Match CPU cores * 2
        config.setMinimumIdle(10);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        
        return new HikariDataSource(config);
    }
}
```

**Rule of Thumb:**
- Max connections = (Number of CPU cores) × 2
- 16 cores → 32 connections

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Example: When to Scale Vertically vs Horizontally

**Scenario: Video Streaming Platform**

**Given:**
- 1M daily active users
- Each user streams 2 hours/day
- Peak hour: 30% of daily traffic
- Video bitrate: 5 Mbps (HD)

---

**Calculation: Bandwidth Requirements**

**Total daily hours:**
```
1M users × 2 hours = 2M hours/day
```

**Peak concurrent users:**
```
2M hours / 24 hours = 83,333 hours/hour (average)
Peak = 83,333 × 1.5 = 125,000 concurrent streams
```

**Bandwidth required:**
```
125,000 streams × 5 Mbps = 625,000 Mbps = 625 Gbps
```

---

**Decision: Vertical vs Horizontal?**

**Vertical Approach (Impossible):**
- No single server can handle 625 Gbps
- Max network card: ~100 Gbps

**Horizontal Approach (Required):**
```
625 Gbps / 10 Gbps per server = 63 servers minimum
With 30% buffer: 90 servers
Across 3 regions: 270 servers total
```

**Architecture:**
```
[CDN] (Horizontal: 1000s of edge nodes)
  |
[Origin Servers] (Horizontal: 270 servers)
  |
[Storage] (Horizontal: S3/GCS)
```

---

### Cost Comparison

**Vertical Scaling (Database):**
```
4 cores, 16GB RAM:  $200/month
8 cores, 32GB RAM:  $400/month (2x cost, 2x capacity)
16 cores, 64GB RAM: $800/month (4x cost, 4x capacity)
32 cores, 128GB RAM: $1,600/month (8x cost, 8x capacity)
```

**Horizontal Scaling (Web Servers):**
```
1 server:  $50/month
10 servers: $500/month (10x cost, 10x capacity)
100 servers: $5,000/month (100x cost, 100x capacity)
```

**Observation:**
- Horizontal scaling has **linear cost growth**
- Vertical scaling has **exponential cost growth**

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Vertical vs Horizontal for Different Data Systems

#### **Relational Databases (PostgreSQL, MySQL)**

**Vertical Scaling:**
```
PostgreSQL on m5.24xlarge (96 cores, 384GB RAM)
- Handles: ~50,000 QPS
- Cost: ~$4,600/month
- Use Case: Complex joins, ACID transactions
```

**Horizontal Scaling (Sharding):**
```
4 PostgreSQL shards (each m5.4xlarge: 16 cores, 64GB)
- Handles: 4 × 20,000 = 80,000 QPS
- Cost: 4 × $600 = $2,400/month
- Use Case: Simple queries, no cross-shard joins
```

**Trade-Off:**
- Vertical: Complex queries work, but expensive
- Horizontal: Cheaper and faster, but cross-shard joins are hard

---

#### **NoSQL Databases (Cassandra, DynamoDB)**

**Built for Horizontal Scaling:**
```
Cassandra Cluster:
- 10 nodes → 50,000 writes/sec
- 20 nodes → 100,000 writes/sec
- 100 nodes → 500,000 writes/sec

Cost: Linear scaling
```

**Why NoSQL Scales Horizontally:**
- No joins (denormalized data)
- Eventual consistency (no strong ACID)
- Partition key distributes data evenly

---

#### **Caching (Redis, Memcached)**

**Vertical Scaling (Single Redis):**
```
Redis on r5.12xlarge (48 cores, 384GB RAM)
- Handles: ~500,000 ops/sec
- Cost: ~$3,000/month
- Limitation: Single point of failure
```

**Horizontal Scaling (Redis Cluster):**
```
10 Redis nodes (each r5.2xlarge: 8 cores, 64GB)
- Handles: ~1,000,000 ops/sec
- Cost: 10 × $400 = $4,000/month
- Benefit: Fault-tolerant (no single point of failure)
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Fault Tolerance Comparison

#### **Vertical Scaling: Single Point of Failure**

**Problem:**
```
[Single Large Server]
  ↓ (Server crashes)
❌ Entire system down
```

**Mitigation:**
- Database replication (master-standby)
- Automatic failover (5-60 seconds downtime)
- But: Still has brief outage

---

#### **Horizontal Scaling: Built-In Redundancy**

**Solution:**
```
[Load Balancer]
     |
  [Server 1] ✅
  [Server 2] ❌ (crashes)
  [Server 3] ✅
  [Server 4] ✅

Result: System continues running
Load redistributed to healthy servers
```

**Fault Tolerance Patterns:**

1. **Health Checks**
```java
@RestController
public class HealthController {
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        // Load balancer pings every 5 seconds
        return ResponseEntity.ok("healthy");
    }
}
```

2. **Graceful Shutdown**
```java
@PreDestroy
public void onShutdown() {
    // Stop accepting new requests
    // Wait for in-flight requests to complete
    log.info("Server shutting down gracefully...");
    Thread.sleep(10000); // 10 second drain period
}
```

3. **Circuit Breaker (Horizontal Systems)**
```java
@Service
public class OrderService {
    
    @CircuitBreaker(name = "paymentService", 
                    fallbackMethod = "paymentFallback")
    public Payment processPayment(Order order) {
        // Call payment service
        return paymentClient.charge(order);
    }
    
    public Payment paymentFallback(Order order, Exception e) {
        // Fallback: Queue for later processing
        paymentQueue.enqueue(order);
        return Payment.pending();
    }
}
```

---

### Reliability Metrics

| **Metric**                 | **Vertical Scaling**          | **Horizontal Scaling**         |
|----------------------------|-------------------------------|--------------------------------|
| **Availability**           | 99.9% (8.76 hours down/year)  | 99.99% (52 min down/year)      |
| **Recovery Time (MTTR)**   | 5-60 minutes (failover)       | 0 seconds (automatic)          |
| **Data Loss Risk**         | Medium (if no replication)    | Low (replicated)               |
| **Blast Radius**           | High (entire system)          | Low (single node)              |

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Security Implications

#### **Vertical Scaling: Smaller Attack Surface**
- Fewer servers to patch
- Simpler firewall rules
- But: Single compromise = full breach

#### **Horizontal Scaling: Distributed Security**
- More servers to patch (automation required)
- Service mesh for secure inter-service communication
- Defense in depth (compromising one server ≠ full breach)

**Example: mTLS in Kubernetes**
```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: secure-service
spec:
  host: payment-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL  # Mutual TLS between services
```

---

### API Rate Limiting

**Vertical Scaling:**
- Rate limit per server (10,000 req/min)
- Simple in-memory counter

**Horizontal Scaling:**
- Distributed rate limiting (Redis-based)
- Aggregate across all servers

```java
@Service
public class RateLimiter {
    @Autowired
    private RedisTemplate<String, Integer> redis;
    
    public boolean allowRequest(String userId) {
        String key = "rate_limit:" + userId;
        Integer count = redis.opsForValue().increment(key);
        
        if (count == 1) {
            redis.expire(key, 60, TimeUnit.SECONDS);
        }
        
        return count <= 1000; // 1000 requests per minute
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: Stack Overflow (Vertical Scaling)**

**Architecture (As of 2023):**
- 9 web servers
- 4 SQL Server databases (vertically scaled)
- Serves 1.3 billion page views/month

**Why Vertical for Database:**
- Complex SQL queries with joins
- Strong consistency required
- Single-machine performance sufficient
- SQL Server scales vertically well

**Key Stats:**
- Primary DB: 1.5TB RAM, 2x Intel Xeon E5-2699 v4 (44 cores)
- Handles ~2,000 queries/second
- No sharding needed

**Lesson:** Not every system needs horizontal scaling. Vertical scaling works if:
- You can afford it
- Your data model is relational
- Your traffic doesn't exceed single-machine limits

---

### **Case Study 2: Twitter (Horizontal Scaling)**

**The Challenge (2008-2010):**
- Monolithic Ruby on Rails app
- Single MySQL database
- "Fail Whale" during high traffic

**The Solution (2010+):**
- Migrated to microservices (horizontally scaled)
- Sharded MySQL by user_id
- Added Cassandra for timelines
- Redis for caching

**Architecture Evolution:**
```
Before: [Monolith] → [Single MySQL]

After:  [LB] → [1000s of microservices]
              → [Redis: 100+ nodes]
              → [MySQL: 100+ shards]
              → [Cassandra: 1000+ nodes]
```

**Results:**
- 500M users (vs 10M before)
- 6,000 tweets/sec → 400,000 tweets/sec
- High availability during spikes

---

### **Case Study 3: Discord (Hybrid Approach)**

**Challenge:** Real-time messaging at scale
- 150M monthly active users
- 19M concurrent users
- Billions of messages

**Strategy:**

**Horizontal Scaling:**
- Gateway servers (WebSocket): 100+ nodes
- Message processing: 1000+ workers
- Cassandra for message storage

**Vertical Scaling:**
- Redis cache: Large instances for hot data
- Some stateful services on big machines

**Interesting Pattern: Sharding by Guild (Server)**
```
Each Discord server → Assigned to a specific node
Users in same server → Always routed to same node
Benefit: No cross-shard coordination for messages
```

**Result:**
- Scales to millions of servers
- Low latency (<50ms)
- High availability

---

### **Case Study 4: Stripe (Payment Processing)**

**Requirements:**
- Strong consistency (money is involved)
- ACID transactions
- Low latency (<100ms)

**Approach:**
- **Vertical scaling for databases** (PostgreSQL)
- Large instances for consistency guarantees
- Horizontal scaling for API servers

**Why Vertical for Payments:**
- Transactions require ACID
- Sharding payments is complex (double-spending risk)
- Better to scale vertically and use read replicas

**Architecture:**
```
[API Servers: Horizontal, 100+ nodes]
         |
[Primary DB: Vertical, 96 cores, 768GB RAM]
         |
[Read Replicas: Horizontal, 20+ nodes]
```

---

### **Case Study 5: Airbnb (Sharding Migration)**

**Problem (2017):**
- Single monolithic MySQL database
- Approaching vertical scaling limits
- $1M+/year on DB infrastructure

**Solution: Horizontal Sharding**
```
Shard 1: User IDs 1 - 10M
Shard 2: User IDs 10M - 20M
...
Shard 100: User IDs 990M - 1B
```

**Migration Strategy:**
1. **Dual writes** (write to both old and new DBs)
2. **Backfill** old data into shards
3. **Switch reads** to shards
4. **Retire** monolithic DB

**Results:**
- Reduced DB costs by 60%
- Improved write throughput 10x
- But: Added complexity (cross-shard queries)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "When choosing between vertical and horizontal scaling, I think about the nature of the workload and the stage of the system.
>
> **Vertical scaling** means adding more resources to a single machine—more CPU, RAM, or faster disks. It's simple because you don't need to change your architecture, and it works great for databases that require strong consistency or complex queries. For example, Stack Overflow runs on a few large SQL Server instances because their complex queries benefit from single-machine performance.
>
> **Horizontal scaling** means adding more machines and distributing the load. This is more complex—you need stateless services, load balancers, and often sharding—but it gives you unlimited scalability and fault tolerance. Twitter moved to horizontal scaling with thousands of microservices and sharded databases to handle 400,000 tweets per second.
>
> In practice, most FAANG systems use **both**. The web tier scales horizontally because it's stateless, but databases often scale vertically first, then add read replicas horizontally, and finally shard if write traffic demands it. The key trade-offs are simplicity versus scalability, cost versus consistency, and single-point-of-failure risk."

---

### **Common Follow-Up Questions**

#### **Q1: How do you decide when to stop scaling vertically and start horizontally?**

> "I look at three signals:
>
> 1. **Cost efficiency**: When doubling capacity costs 4x instead of 2x, it's time to go horizontal.
> 2. **Physical limits**: If I'm already on the largest instance (e.g., AWS u-24tb1.metal), I have no choice.
> 3. **Fault tolerance**: If a single server failure takes down the whole system, I need horizontal redundancy.
>
> For example, I'd scale a database vertically first up to maybe 32-64 cores. Beyond that, I'd add read replicas for reads and consider sharding for writes. But for stateless app servers, I go horizontal from day one because it's straightforward."

---

#### **Q2: What happens to consistency when you scale horizontally?**

> "Horizontal scaling often forces trade-offs with consistency because of the CAP theorem. When you have multiple nodes, network partitions can occur, and you have to choose between:
>
> - **Strong consistency** (CP): Wait for all nodes to agree, accept higher latency or unavailability
> - **Eventual consistency** (AP): Accept stale reads, prioritize availability
>
> For example, Cassandra scales horizontally but uses eventual consistency by default. For payments or inventory, I'd use strong consistency even if it means vertical scaling or using techniques like distributed transactions (2PC, Saga pattern).
>
> In practice, I use **read-after-write consistency** for user-facing data (users see their own writes immediately) and **eventual consistency** for aggregates like counters."

---

#### **Q3: How do you handle database sharding without breaking existing queries?**

> "Sharding is tricky because it breaks cross-shard operations. Here's my approach:
>
> 1. **Choose the right shard key**: Typically `user_id` or `tenant_id`. This keeps related data together.
> 2. **Avoid cross-shard joins**: Denormalize data or use a separate service for aggregations.
> 3. **Dual-write migration**: Write to both old and new systems during migration, then cut over reads.
> 4. **Shard-aware routing layer**: Abstract sharding logic into a middleware so application code doesn't know about shards.
>
> For example, at Instagram, they shard by `user_id`, so a user's photos, posts, and followers live on the same shard. This avoids cross-shard queries for 99% of operations."

---

#### **Q4: What's your experience with auto-scaling?**

> "I've implemented auto-scaling for stateless services like web servers and background workers. The key is choosing the right metric:
>
> - **CPU utilization**: Works for compute-bound workloads
> - **Request rate**: Better for API servers
> - **Queue depth**: Best for async workers (scale up if queue > 1000)
>
> I set conservative thresholds: scale out at 70% CPU, scale in at 30% CPU, with cooldown periods (5-10 minutes) to avoid thrashing. I also set min/max bounds to prevent runaway costs.
>
> For databases, auto-scaling is harder because of stateful connections, so I prefer read replicas that can be added manually during known traffic spikes."

---

#### **Q5: Have you ever regretted a scaling decision?**

> "Yes, at a previous company, we sharded our database too early—when we only had 100K users—because we anticipated growth. The added complexity (cross-shard queries, data consistency) slowed down feature development for months, and we never hit the scale we expected.
>
> The lesson: **Don't prematurely optimize**. Start with vertical scaling and a simple architecture. Add horizontal scaling incrementally when you measure actual bottlenecks. It's easier to scale later than to de-scale an over-engineered system."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Vertical vs Horizontal: Visual Comparison**

```
VERTICAL SCALING (Scale Up)
═══════════════════════════════════════

Before:          After:
┌────────┐      ┌─────────────┐
│ 4 CPU  │  →   │   32 CPU    │
│ 16GB   │      │   256GB     │
│        │      │             │
└────────┘      └─────────────┘

Pros: Simple, no code changes
Cons: Expensive, single point of failure


HORIZONTAL SCALING (Scale Out)
═══════════════════════════════════════

Before:          After:
┌────────┐      ┌────────┐ ┌────────┐ ┌────────┐
│ Server │  →   │Server 1│ │Server 2│ │Server 3│
│        │      │        │ │        │ │        │
└────────┘      └────────┘ └────────┘ └────────┘
                         ↑
                  [Load Balancer]

Pros: Unlimited scale, fault-tolerant
Cons: Complex, distributed systems issues
```

---

### **Database Scaling Decision Tree**

```
START: Is your database slow?
         |
         ├─ YES → What's the bottleneck?
         │         |
         │         ├─ CPU → Scale vertically (bigger instance)
         │         │
         │         ├─ Reads → Add read replicas (horizontal)
         │         │
         │         ├─ Writes → Shard database (horizontal)
         │         │
         │         └─ Storage → Partition/Archive old data
         │
         └─ NO → Don't scale yet (measure first!)
```

---

### **Sharding Implementation (Pseudocode)**

```java
// Shard resolver
public class UserShardResolver {
    private static final int NUM_SHARDS = 4;
    private Map<Integer, DataSource> shardMap;
    
    public DataSource getShardForUser(Long userId) {
        int shardId = (int) (userId % NUM_SHARDS);
        return shardMap.get(shardId);
    }
    
    public List<DataSource> getAllShards() {
        return new ArrayList<>(shardMap.values());
    }
}

// Usage in repository
@Repository
public class UserRepository {
    @Autowired
    private UserShardResolver shardResolver;
    
    public User findById(Long userId) {
        DataSource shard = shardResolver.getShardForUser(userId);
        JdbcTemplate jdbc = new JdbcTemplate(shard);
        return jdbc.queryForObject(
            "SELECT * FROM users WHERE id = ?",
            new Object[]{userId},
            User.class
        );
    }
    
    // Cross-shard query (expensive!)
    public List<User> findAllActiveUsers() {
        List<User> allUsers = new ArrayList<>();
        
        // Query each shard in parallel
        List<CompletableFuture<List<User>>> futures = 
            shardResolver.getAllShards().stream()
                .map(shard -> CompletableFuture.supplyAsync(() -> 
                    new JdbcTemplate(shard).query(
                        "SELECT * FROM users WHERE active = true",
                        User.class
                    )
                ))
                .collect(Collectors.toList());
        
        // Combine results
        futures.forEach(future -> 
            allUsers.addAll(future.join())
        );
        
        return allUsers;
    }
}
```

---

### **Auto-Scaling Configuration**

```yaml
# Kubernetes Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-autoscaler
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale out at 70% CPU
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"  # Scale out if > 1000 req/sec per pod
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60  # Wait 1 min before scaling up
      policies:
      - type: Pods
        value: 2  # Add 2 pods at a time
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
      - type: Pods
        value: 1  # Remove 1 pod at a time
        periodSeconds: 60
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Business Impact:**
- **Vertical scaling** enables fast iteration (simple, no architecture changes)
- **Horizontal scaling** enables unlimited growth (serve billions of users)
- Wrong choice = wasted money (over-provisioning) or outages (under-provisioning)

**User Experience:**
- **Vertical:** Faster queries (no network hops), but higher downtime risk
- **Horizontal:** Higher availability (no single point of failure), but potential latency

**Engineering Impact:**
- **Vertical:** Fast development (no distributed systems)
- **Horizontal:** Slower development (handle failures, retries, eventual consistency)

---

### **How It Works (Simple Summary)**

#### **Vertical Scaling:**
1. Monitor bottleneck (CPU, RAM, disk)
2. Upgrade to larger instance
3. Restart service (brief downtime)
4. Repeat until hitting physical/cost limits

#### **Horizontal Scaling:**
1. Design stateless services
2. Add load balancer
3. Deploy multiple instances
4. Add auto-scaling rules
5. Monitor and adjust thresholds

---

### **Key Trade-Offs to Remember**

| **Factor**              | **Choose Vertical**                     | **Choose Horizontal**                    |
|-------------------------|-----------------------------------------|------------------------------------------|
| **Simplicity**          | ✅ No code changes                      | ❌ Complex architecture                  |
| **Consistency**         | ✅ Strong (single machine)              | ⚠️ Eventual (distributed)                |
| **Cost at Small Scale** | ✅ Cheaper (1 big server)               | ❌ More expensive (LB + multiple servers)|
| **Cost at Large Scale** | ❌ Exponential                          | ✅ Linear                                |
| **Scalability Limit**   | ❌ Hard ceiling                         | ✅ Unlimited                             |
| **Fault Tolerance**     | ❌ Single point of failure              | ✅ Redundant                             |
| **Latency**             | ✅ No network hops                      | ⚠️ Network latency                       |
| **Development Speed**   | ✅ Fast                                 | ❌ Slower (handle distributed issues)    |

---

### **Decision Framework**

```
Use VERTICAL scaling when:
✅ You're early-stage (< 100K users)
✅ You need strong consistency (payments, inventory)
✅ Your data model requires complex joins
✅ Simplicity is more important than scalability

Use HORIZONTAL scaling when:
✅ You've hit vertical limits (cost or performance)
✅ You need fault tolerance (high availability)
✅ Your workload is stateless (web servers, workers)
✅ You're building for internet scale (millions of users)

Use HYBRID (most common at FAANG):
✅ Horizontal for stateless tiers (web, cache, workers)
✅ Vertical for stateful tiers (databases) + horizontal replicas
✅ Shard horizontally only when writes exceed single-machine limits
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Start simple, scale incrementally**
- Don't shard on day 1
- Vertical → Vertical + replicas → Sharding

✅ **Know when each approach breaks**
- Vertical breaks: Cost, physical limits, SPOF
- Horizontal breaks: Consistency, cross-shard queries

✅ **Always address fault tolerance**
- Vertical: "I'd add a standby for failover"
- Horizontal: "Load balancer handles server failures automatically"

✅ **Use real examples**
- "Stack Overflow scales vertically because..."
- "Twitter scales horizontally because..."

✅ **Think in terms of hybrid**
- "I'd scale the web tier horizontally and the database vertically first, then add read replicas..."

The best engineers know **both approaches** and choose the right one based on requirements, not dogma.

---

**End of Topic 10: Vertical vs Horizontal Scaling**
