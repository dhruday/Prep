# 12. Latency vs Throughput

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Latency** and **Throughput** are two fundamental performance metrics that measure different aspects of system performance. Understanding the distinction and trade-offs between them is critical for designing high-performance systems.

### What They Are

#### **Latency**
The **time** it takes to complete a **single operation** or **request**.
- Measured in: **Milliseconds (ms)**, **seconds**
- User-facing metric: "How long do I wait?"
- Example: "This API call returns a response in 50ms"

#### **Throughput**
The **number of operations** a system can handle **per unit of time**.
- Measured in: **Requests per second (RPS/QPS)**, **transactions per second (TPS)**
- System-facing metric: "How much work can the system do?"
- Example: "This server handles 10,000 requests per second"

---

### The Key Distinction

> **Latency** = "How fast is each individual request?"  
> **Throughput** = "How many requests can we handle concurrently?"

**Critical Insight:**
- **Low latency** ≠ **High throughput**
- You can have high throughput with high latency (batch processing)
- You can have low latency with low throughput (single-threaded server)

---

### The Analogy: Highway Traffic

**Latency = Speed of each car (mph)**
- How fast can one car travel from point A to point B?
- Measured per individual car

**Throughput = Number of cars passing per hour**
- How many cars can the highway handle?
- Measured across all lanes

**Key Insight:**
- A highway can have **high throughput** (1000 cars/hour) with **high latency** (each car stuck in traffic)
- A racing track can have **low latency** (cars move fast) but **low throughput** (only a few cars at once)

---

### Why This Matters

**In Interviews:**
- Interviewers test whether you understand that optimizing for one may hurt the other
- You must identify which metric matters more for the use case
- Example: "Should we optimize for latency or throughput for a payment system vs. batch ETL?"

**In Production:**
- **User-facing systems** care about latency (web apps, APIs, mobile apps)
- **Backend processing** cares about throughput (data pipelines, batch jobs)
- **Real-time systems** need both (video streaming, online gaming)

---

### The Problem They Solve

#### **Latency Problems:**
- Users complaining: "The app is slow"
- High p99 latency: 5% of users wait 2 seconds
- **Impact:** Poor user experience, lost conversions

#### **Throughput Problems:**
- System can't keep up with load
- Queue backlog growing: 1M messages pending
- **Impact:** System crashes, data loss, SLA violations

---

### Where and When They're Used

**Latency-Critical Systems:**
- Web applications (page load time)
- Mobile apps (API response time)
- Payment processing (instant confirmation)
- Search engines (results in <100ms)
- Trading platforms (microsecond latency)

**Throughput-Critical Systems:**
- Data processing pipelines (process 1B events/day)
- Batch ETL jobs (transform 100M records)
- Log aggregation (ingest 10TB logs/day)
- Video encoding (process 10K videos/hour)

**Both Critical (Hardest!):**
- Video streaming (low latency playback + high throughput delivery)
- Online gaming (low latency actions + many concurrent players)
- Real-time analytics (fast queries + high data ingestion)

---

### Role in Large-Scale Distributed Systems

At FAANG scale, **both metrics matter but in different contexts**:

**Google Search:**
- **Latency:** Results in <200ms (p99)
- **Throughput:** 8.5 billion searches/day = ~100K QPS

**Netflix:**
- **Latency:** Video starts in <1 second (p99)
- **Throughput:** 200M+ subscribers streaming concurrently

**Stripe:**
- **Latency:** Payment confirmed in <100ms (p99)
- **Throughput:** Handles 1M+ transactions/minute (peak)

**Amazon Prime Video:**
- **Latency:** Video playback with <5 second buffering
- **Throughput:** Petabytes of video streamed per day

The key is understanding **which metric is the constraint** for your system and optimizing accordingly.

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### The Mathematical Relationship

#### **Little's Law**
```
Concurrent Connections = Throughput × Latency

Or rearranged:
Throughput = Concurrent Connections / Latency
```

**Example:**
```
If latency = 100ms (0.1 seconds)
And we can handle 1,000 concurrent connections
Then throughput = 1,000 / 0.1 = 10,000 requests/second

If we reduce latency to 50ms:
Throughput = 1,000 / 0.05 = 20,000 requests/second (2x improvement!)
```

**Key Insight:** Lower latency → Higher throughput (if concurrency is constant)

---

#### **Latency Components**

```
Total Latency = Network Latency + Processing Latency + Queue Latency

Network Latency:
  - Client → Load Balancer: 5ms
  - Load Balancer → Server: 2ms
  - Server → Database: 3ms
  Total Network: 10ms

Processing Latency:
  - Application logic: 20ms
  - Database query: 30ms
  Total Processing: 50ms

Queue Latency:
  - Time waiting in queue: 10ms

Total = 10ms + 50ms + 10ms = 70ms
```

---

#### **Throughput Limits**

```
Max Throughput = min(
    CPU capacity,
    Memory bandwidth,
    Network bandwidth,
    Disk I/O,
    Database capacity
)
```

**Example:**
```
CPU: Can handle 50,000 QPS
Network: 10 Gbps = 100,000 QPS (10KB responses)
Database: Max 10,000 QPS
Memory: 64GB RAM (no bottleneck)

Max Throughput = min(50K, 100K, 10K) = 10,000 QPS
→ Database is the bottleneck!
```

---

### The Latency-Throughput Trade-Off

#### **Scenario 1: Optimizing for Latency Hurts Throughput**

**Example: Single-Threaded Processing**

```java
// Low latency per request (fast processing)
// But low throughput (one at a time)
@RestController
public class SingleThreadedController {
    
    @GetMapping("/process")
    public Result processRequest(@RequestBody Request request) {
        // Process immediately (low latency)
        return processSync(request);  // 10ms processing
    }
}

// Latency: 10ms per request (good!)
// Throughput: 1 / 0.01 = 100 requests/second (bad!)
```

---

#### **Scenario 2: Optimizing for Throughput Hurts Latency**

**Example: Batch Processing**

```java
// High throughput (process many at once)
// But high latency (wait for batch to fill)
@RestController
public class BatchController {
    private List<Request> batch = new ArrayList<>();
    
    @GetMapping("/process")
    public CompletableFuture<Result> processRequest(@RequestBody Request request) {
        batch.add(request);
        
        // Wait until batch is full (high latency!)
        if (batch.size() >= 100) {
            List<Request> toBatch = new ArrayList<>(batch);
            batch.clear();
            return processBatch(toBatch);
        }
        
        // User waits until batch fills up
        return waitForBatch(request);
    }
}

// Latency: Up to 5 seconds (wait for batch to fill)
// Throughput: 100 requests / 0.1 seconds = 1,000 requests/second
```

---

#### **Scenario 3: Balancing Both**

**Example: Async Processing with Timeouts**

```java
@RestController
public class HybridController {
    private List<Request> batch = new ArrayList<>();
    private ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    
    @PostConstruct
    public void init() {
        // Flush batch every 100ms (latency bound)
        scheduler.scheduleAtFixedRate(this::flushBatch, 0, 100, TimeUnit.MILLISECONDS);
    }
    
    @GetMapping("/process")
    public CompletableFuture<Result> processRequest(@RequestBody Request request) {
        synchronized (batch) {
            batch.add(request);
            
            // Flush immediately if batch is full (throughput optimization)
            if (batch.size() >= 100) {
                flushBatch();
            }
        }
        
        return request.getFuture();
    }
    
    private void flushBatch() {
        List<Request> toBatch;
        synchronized (batch) {
            if (batch.isEmpty()) return;
            toBatch = new ArrayList<>(batch);
            batch.clear();
        }
        
        processBatchAsync(toBatch);
    }
}

// Latency: Max 100ms (timeout) + processing time
// Throughput: Up to 1,000 requests/second (batching)
// Result: Good balance!
```

---

### Deep Dive: Latency Optimization Techniques

#### **1. Caching (Massive Latency Reduction)**

```java
@Service
public class ProductService {
    @Autowired
    private RedisTemplate<String, Product> redis;
    
    @Cacheable(value = "products", key = "#id")
    public Product getProduct(Long id) {
        // Cache miss: 50ms (DB query)
        // Cache hit: 1ms (Redis)
        return productRepository.findById(id).orElseThrow();
    }
}

// Without cache: 50ms latency
// With cache (90% hit rate): 0.9 × 1ms + 0.1 × 50ms = 5.9ms
// Latency improvement: 8.5x faster!
```

---

#### **2. Database Indexing**

```sql
-- Without index: Full table scan (1000ms)
SELECT * FROM users WHERE email = 'user@example.com';

-- With index: Index lookup (10ms)
CREATE INDEX idx_users_email ON users(email);

-- Latency improvement: 100x faster!
```

---

#### **3. Async I/O (Non-Blocking)**

```java
// BAD: Blocking I/O (high latency)
@GetMapping("/user/{id}")
public UserDTO getUser(@PathVariable Long id) {
    User user = userService.getUser(id);           // 50ms
    List<Order> orders = orderService.getOrders(id); // 50ms
    Profile profile = profileService.getProfile(id); // 50ms
    
    return new UserDTO(user, orders, profile);
    // Total latency: 150ms (sequential)
}

// GOOD: Async I/O (low latency)
@GetMapping("/user/{id}")
public CompletableFuture<UserDTO> getUser(@PathVariable Long id) {
    CompletableFuture<User> userFuture = 
        CompletableFuture.supplyAsync(() -> userService.getUser(id));
    
    CompletableFuture<List<Order>> ordersFuture = 
        CompletableFuture.supplyAsync(() -> orderService.getOrders(id));
    
    CompletableFuture<Profile> profileFuture = 
        CompletableFuture.supplyAsync(() -> profileService.getProfile(id));
    
    return CompletableFuture.allOf(userFuture, ordersFuture, profileFuture)
        .thenApply(v -> new UserDTO(
            userFuture.join(),
            ordersFuture.join(),
            profileFuture.join()
        ));
    // Total latency: 50ms (parallel) - 3x faster!
}
```

---

#### **4. Connection Pooling**

```java
@Configuration
public class DataSourceConfig {
    
    @Bean
    public HikariDataSource dataSource() {
        HikariConfig config = new HikariConfig();
        
        // Connection pooling reduces latency
        config.setMaximumPoolSize(50);  // Reuse connections
        config.setMinimumIdle(10);
        config.setConnectionTimeout(3000);
        
        return new HikariDataSource(config);
    }
}

// Without pooling: 50ms (create connection) + 10ms (query) = 60ms
// With pooling: 0ms (reuse connection) + 10ms (query) = 10ms
// Latency improvement: 6x faster!
```

---

### Deep Dive: Throughput Optimization Techniques

#### **1. Horizontal Scaling**

```
Single Server:
  - Throughput: 1,000 QPS
  
10 Servers (behind load balancer):
  - Throughput: 10,000 QPS (10x)
  
100 Servers:
  - Throughput: 100,000 QPS (100x)
```

**Implementation:**
```yaml
# Kubernetes Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 10
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

#### **2. Database Read Replicas**

```
Master (writes only): 5,000 QPS
Master + 5 Read Replicas: 30,000 QPS (6x throughput)

Architecture:
[App Servers]
      |
   Routing Layer
   /          \
[Master]    [Read Replicas × 5]
(Writes)    (Reads)
```

**Code:**
```java
@Service
public class UserService {
    
    @Transactional(readOnly = true)  // Routes to read replica
    public User getUser(Long id) {
        return userRepository.findById(id).orElseThrow();
    }
    
    @Transactional  // Routes to master
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
```

---

#### **3. Batch Processing**

```java
// Low throughput: Process one at a time
public void processOrders(List<Order> orders) {
    for (Order order : orders) {
        processOrder(order);  // 1,000 orders = 1,000 DB calls
    }
}
// Throughput: 100 orders/second

// High throughput: Process in batches
public void processOrdersBatch(List<Order> orders) {
    List<List<Order>> batches = Lists.partition(orders, 100);
    
    batches.parallelStream().forEach(batch -> {
        orderRepository.saveAll(batch);  // 1 DB call per 100 orders
    });
}
// Throughput: 10,000 orders/second (100x improvement!)
```

---

#### **4. Async Message Queues**

```java
@RestController
public class OrderController {
    @Autowired
    private KafkaTemplate<String, Order> kafka;
    
    @PostMapping("/orders")
    public ResponseEntity<String> createOrder(@RequestBody Order order) {
        // Don't process synchronously (low throughput)
        // Send to queue and process asynchronously (high throughput)
        kafka.send("orders", order);
        
        return ResponseEntity.accepted()
            .body("Order queued for processing");
    }
}

// Synchronous: 100 orders/second (limited by processing time)
// Asynchronous: 10,000 orders/second (limited only by queue capacity)
```

---

### The Trade-Off Spectrum

| **Optimization**               | **Latency Impact** | **Throughput Impact** | **Use Case**                    |
|--------------------------------|--------------------|-----------------------|---------------------------------|
| **Caching**                    | ✅✅ Much lower    | ✅ Higher             | Read-heavy systems              |
| **Database Indexing**          | ✅✅ Much lower    | ⚠️ Slightly lower (writes) | Query optimization         |
| **Async Processing**           | ⚠️ Higher (queuing)| ✅✅ Much higher       | Background jobs, batch processing |
| **Connection Pooling**         | ✅ Lower           | ✅ Higher             | Database-heavy apps             |
| **Batching**                   | ❌ Higher          | ✅✅ Much higher       | Bulk operations, ETL            |
| **Compression**                | ⚠️ Higher (CPU)    | ✅ Higher (less network) | Large payloads                |
| **CDN**                        | ✅✅ Much lower    | ✅✅ Much higher       | Static assets, images           |
| **Sharding**                   | ⚠️ Higher (routing)| ✅✅ Much higher       | Massive datasets                |
| **Multi-threading**            | ⚠️ Higher (context switching) | ✅ Higher      | CPU-bound tasks                 |
| **Load Balancing**             | ⚠️ Slightly higher (hop) | ✅✅ Much higher | Horizontal scaling              |

---

### Percentile Latency (p50, p95, p99, p99.9)

**Why Percentiles Matter:**

```
API Latency Distribution:
- p50 (median): 20ms    → 50% of requests faster than this
- p90: 50ms             → 90% of requests faster than this
- p95: 100ms            → 95% of requests faster than this
- p99: 500ms            → 99% of requests faster than this
- p99.9: 2000ms         → 99.9% of requests faster than this
```

**Key Insight:**
- **Average latency** is misleading (hides outliers)
- **p99 latency** reveals user experience for 1 in 100 users
- At scale (1M requests/hour), 10,000 users experience p99 latency

**Example: Amazon's 1% Rule**
```
If p99 latency = 2 seconds
And you have 1M requests/day
Then 10,000 users wait 2+ seconds
Impact: Lost revenue, poor experience
```

---

### Latency Budgets

**Concept:** Allocate latency budget across system components

```
Total Latency Budget: 200ms (p99)

Breakdown:
- CDN/Edge: 10ms
- Load Balancer: 5ms
- API Gateway: 10ms
- Application Server: 50ms
- Database: 100ms
- Network overhead: 25ms
Total: 200ms

If any component exceeds budget → Investigate and optimize
```

**Code: Latency Tracking**
```java
@Aspect
@Component
public class LatencyTracker {
    
    @Around("@annotation(Timed)")
    public Object trackLatency(ProceedingJoinPoint joinPoint) throws Throwable {
        String component = joinPoint.getSignature().getName();
        long start = System.nanoTime();
        
        try {
            return joinPoint.proceed();
        } finally {
            long duration = (System.nanoTime() - start) / 1_000_000; // Convert to ms
            
            // Log if exceeds budget
            if (duration > getLatencyBudget(component)) {
                log.warn("Latency budget exceeded: {} took {}ms (budget: {}ms)",
                    component, duration, getLatencyBudget(component));
            }
            
            // Send to monitoring
            metrics.recordLatency(component, duration);
        }
    }
    
    private long getLatencyBudget(String component) {
        Map<String, Long> budgets = Map.of(
            "getDatabaseData", 100L,
            "callExternalAPI", 50L,
            "processRequest", 200L
        );
        return budgets.getOrDefault(component, 500L);
    }
}
```

---

### Throughput Saturation

**Concept:** Throughput plateaus as load increases

```
Light Load (0-1000 QPS):
  - Latency: 10ms
  - Throughput: Linear with load
  
Medium Load (1000-5000 QPS):
  - Latency: 50ms (queuing starts)
  - Throughput: Still increasing
  
Heavy Load (5000-8000 QPS):
  - Latency: 500ms (severe queuing)
  - Throughput: Approaching max
  
Saturation (>8000 QPS):
  - Latency: 5000ms+ (timeout)
  - Throughput: Plateaus at 8000 QPS
  - System starts rejecting requests
```

**Visual:**
```
Throughput
    ^
8000|         ___________  (Saturation)
    |        /
6000|       /
    |      /
4000|     /
    |    /
2000|   /
    |  /
   0|_/________________> Load
    0  2K  4K  6K  8K 10K

Latency
    ^
5000|              ___/  (Exponential growth)
    |            _/
 500|          _/
    |        _/
  50|      _/
    |    _/
  10|___/________________> Load
    0  2K  4K  6K  8K 10K
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Example: Social Media API

**Requirements:**
- 50M daily active users (DAU)
- Each user makes 20 requests/day
- Target latency: p99 < 200ms
- Business hours: 8 AM - 10 PM (14 hours)

---

**Step 1: Calculate Required Throughput**

```
Daily Requests = 50M users × 20 requests = 1B requests/day

Average QPS = 1B / (24 × 3600) = 11,574 QPS

Peak QPS (during business hours):
  - Assume 80% of traffic in 14 hours
  - Peak = (0.8 × 1B) / (14 × 3600) = 15,873 QPS
  
With 2x spike buffer:
  - Peak QPS = 15,873 × 2 = 31,746 QPS
```

---

**Step 2: Calculate Latency Budget**

```
Target: p99 < 200ms

Component Breakdown:
- CDN (static assets): 10ms
- Load Balancer: 5ms
- API Server: 80ms
- Cache (Redis): 5ms
- Database: 80ms
- Network: 20ms
Total: 200ms

Optimization needed if any component exceeds budget
```

---

**Step 3: Determine Server Count**

```
Assumptions:
- Each server: 1,000 QPS (after latency optimization)
- Peak load: 31,746 QPS

Servers needed:
  - Base: 31,746 / 1,000 = 32 servers
  - +30% buffer: 32 × 1.3 = 42 servers
  - Across 3 AZs: 42 × 3 = 126 servers

Cost:
  - Each server: $100/month
  - Total: 126 × $100 = $12,600/month
```

---

**Step 4: Database Capacity**

```
Read/Write Ratio: 90% reads, 10% writes

Reads: 31,746 × 0.9 = 28,571 read QPS
Writes: 31,746 × 0.1 = 3,175 write QPS

Strategy:
- Master (writes): 1 instance (handles 5,000 write QPS)
- Read Replicas: 28,571 / 5,000 = 6 replicas
- With buffer: 8 read replicas

Database Cost:
- Master: $1,000/month
- Replicas: 8 × $500 = $4,000/month
- Total: $5,000/month
```

---

**Step 5: Caching Strategy**

```
Cache Hit Rate Target: 90%

With 90% cache hit rate:
- Cached reads: 28,571 × 0.9 = 25,714 QPS (Redis)
- DB reads: 28,571 × 0.1 = 2,857 QPS

Cache Performance:
- Redis latency: 1ms
- DB latency: 50ms
- Weighted latency: (0.9 × 1ms) + (0.1 × 50ms) = 5.9ms

Without cache: 50ms
With cache: 5.9ms (8.5x faster!)

Cache Capacity:
- Hot data: 20% of users active at once
- 50M × 0.2 = 10M users
- Each user: 1KB data
- Total: 10GB cache needed

Redis Cluster:
- 3 master nodes (3 × 5GB)
- 3 replica nodes
- Cost: 6 × $150 = $900/month
```

---

**Final Architecture & Metrics:**

```
[CDN] → 80% cache hit rate (static assets)
  ↓
[Load Balancer] → 126 app servers across 3 AZs
  ↓
[Redis Cluster] → 90% cache hit rate
  ↓
[PostgreSQL Master + 8 Read Replicas]

Capacity:
- Throughput: 126K QPS (4x over peak)
- Latency: p99 < 150ms (better than target!)

Cost Summary:
- App Servers: $12,600/month
- Database: $5,000/month
- Redis: $900/month
- Load Balancer: $100/month
- CDN: $500/month
Total: $19,100/month

Cost per request: $0.0000006 (sub-penny economics!)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### How Latency and Throughput Affect Storage Choices

#### **Latency-Optimized Storage**

**1. In-Memory Cache (Redis, Memcached)**
```
Latency: 1ms (sub-millisecond)
Throughput: 100K ops/sec per node
Use Case: Session storage, hot data

When to use:
✅ Need <10ms latency
✅ Read-heavy workload
✅ Data fits in memory (10-100GB)
```

**2. SSD-Based Database (PostgreSQL on NVMe)**
```
Latency: 5-10ms
Throughput: 10K QPS per instance
Use Case: Transactional data, relational queries

When to use:
✅ Need ACID guarantees
✅ Complex queries (JOINs)
✅ Moderate latency acceptable (10-50ms)
```

---

#### **Throughput-Optimized Storage**

**1. NoSQL (Cassandra, DynamoDB)**
```
Latency: 10-50ms
Throughput: 100K writes/sec (auto-scales)
Use Case: Time-series data, high write volume

When to use:
✅ Need massive write throughput
✅ Eventually consistent OK
✅ Simple key-value queries
```

**2. Object Storage (S3, GCS)**
```
Latency: 50-200ms
Throughput: Unlimited (parallel uploads)
Use Case: Images, videos, backups

When to use:
✅ Large files (MB-GB)
✅ Latency not critical
✅ Need unlimited scalability
```

---

### Database Query Optimization: Latency vs Throughput

#### **Example: E-Commerce Order Query**

**Slow Query (High Latency, Low Throughput):**
```sql
-- No index, full table scan
SELECT o.*, u.name, p.title
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 20;

-- Performance:
-- Latency: 5000ms (full table scan of 10M orders)
-- Throughput: 200 QPS (blocks other queries)
```

**Optimized Query (Low Latency, High Throughput):**
```sql
-- Add index
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);

-- Same query with index
SELECT o.*, u.name, p.title
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN products p ON o.product_id = p.id
WHERE o.status = 'pending'
ORDER BY o.created_at DESC
LIMIT 20;

-- Performance:
-- Latency: 10ms (index seek + join)
-- Throughput: 10,000 QPS (fast, non-blocking)
```

**Improvement:**
- Latency: 500x faster
- Throughput: 50x higher

---

### Caching Strategies: Latency Impact

```java
@Service
public class ProductService {
    @Autowired
    private ProductRepository repository;
    
    @Autowired
    private RedisTemplate<String, Product> redis;
    
    // Strategy 1: Cache-Aside (Manual)
    public Product getProduct(Long id) {
        String key = "product:" + id;
        
        // Check cache first (1ms)
        Product product = redis.opsForValue().get(key);
        if (product != null) {
            return product;  // Cache hit: 1ms latency
        }
        
        // Cache miss: Query DB (50ms)
        product = repository.findById(id).orElseThrow();
        
        // Update cache
        redis.opsForValue().set(key, product, 1, TimeUnit.HOURS);
        
        return product;  // Cache miss: 50ms latency
    }
    
    // With 90% cache hit rate:
    // Average latency = (0.9 × 1ms) + (0.1 × 50ms) = 5.9ms
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### How Latency and Throughput Affect Reliability

#### **Problem 1: High Latency → Cascading Failures**

**Scenario:**
```
Normal: API latency = 50ms
Under load: API latency = 5000ms (100x slower)

Timeline:
1. Traffic spike: 10,000 QPS
2. Each request takes 5 seconds
3. Concurrent connections: 10,000 × 5 = 50,000
4. Server maxConnections: 10,000
5. Connection pool exhausted → New requests timeout
6. Clients retry → Even more load
7. Cascading failure across all services
```

**Solution: Circuit Breaker + Timeout**
```java
@Service
public class PaymentService {
    
    @CircuitBreaker(
        name = "payment",
        fallbackMethod = "paymentFallback"
    )
    @Timeout(duration = 2, unit = TimeUnit.SECONDS)
    public PaymentResponse processPayment(PaymentRequest request) {
        return paymentClient.charge(request);
    }
    
    public PaymentResponse paymentFallback(PaymentRequest request, Exception e) {
        // Queue for later processing
        paymentQueue.enqueue(request);
        return PaymentResponse.pending("Will process shortly");
    }
}

// Configuration
resilience4j.circuitbreaker:
  instances:
    payment:
      failureRateThreshold: 50       # Open if 50% fail
      slowCallRateThreshold: 50      # Open if 50% slow
      slowCallDurationThreshold: 2s  # Define "slow"
      waitDurationInOpenState: 30s   # Stay open for 30s
```

**Impact:**
- Latency capped at 2 seconds (timeout)
- Cascading failure prevented (circuit breaker)
- System remains available (fallback)

---

#### **Problem 2: Insufficient Throughput → Queue Backlog**

**Scenario:**
```
System Capacity: 10,000 QPS
Peak Traffic: 50,000 QPS

Result:
- Processing: 10,000 requests/second
- Incoming: 50,000 requests/second
- Queue growth: 40,000 requests/second
- After 10 seconds: 400,000 requests queued
- Queue latency: 40 seconds (unacceptable!)
```

**Solution: Auto-Scaling + Load Shedding**
```java
@Component
public class LoadShedder {
    private final AtomicLong requestCount = new AtomicLong(0);
    private static final long MAX_QPS = 10_000;
    
    @Scheduled(fixedRate = 1000)
    public void resetCounter() {
        long count = requestCount.getAndSet(0);
        double qps = count / 1.0;
        
        if (qps > MAX_QPS * 0.9) {
            log.warn("Approaching capacity: {} QPS", qps);
            // Trigger auto-scaling
            scaleUp();
        }
    }
    
    public boolean allowRequest() {
        long count = requestCount.incrementAndGet();
        if (count > MAX_QPS) {
            return false;  // Shed load
        }
        return true;
    }
}

@RestController
public class APIController {
    @Autowired
    private LoadShedder loadShedder;
    
    @GetMapping("/api/resource")
    public ResponseEntity<?> getResource() {
        if (!loadShedder.allowRequest()) {
            return ResponseEntity.status(429)
                .body("Too many requests, try again later");
        }
        
        return ResponseEntity.ok(processRequest());
    }
}
```

---

### Graceful Degradation

**Strategy: Reduce latency by sacrificing features**

```java
@Service
public class FeedService {
    @Autowired
    private FeedRepository feedRepository;
    
    @Autowired
    private RecommendationService recommendationService;
    
    public Feed getUserFeed(Long userId, boolean fullFeatures) {
        // Always include core feed (100ms)
        List<Post> posts = feedRepository.getRecentPosts(userId);
        
        // Optional: Personalized recommendations (500ms)
        if (fullFeatures && systemHealthy()) {
            List<Post> recommended = recommendationService.getRecommended(userId);
            posts.addAll(recommended);
        }
        
        // Optional: Real-time notifications (200ms)
        if (fullFeatures && systemHealthy()) {
            int unreadCount = notificationService.getUnreadCount(userId);
            return new Feed(posts, unreadCount);
        }
        
        return new Feed(posts, 0);
    }
    
    private boolean systemHealthy() {
        // Check system load
        return metrics.getCurrentQPS() < 8000;  // Under 80% capacity
    }
}

// Under normal load:
// - Full features: 800ms latency
// - Full user experience

// Under high load:
// - Core features only: 100ms latency
// - Degraded but functional
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Rate Limiting: Protecting Latency and Throughput

**Goal: Prevent abuse from degrading performance**

```java
@Component
public class RateLimiter {
    @Autowired
    private RedisTemplate<String, Integer> redis;
    
    // Token Bucket Algorithm
    public boolean allowRequest(String userId, int maxRequests, Duration window) {
        String key = "rate_limit:" + userId;
        Long count = redis.opsForValue().increment(key);
        
        if (count == 1) {
            redis.expire(key, window.getSeconds(), TimeUnit.SECONDS);
        }
        
        if (count > maxRequests) {
            log.warn("Rate limit exceeded for user: {}", userId);
            return false;
        }
        
        return true;
    }
}

@RestController
public class APIController {
    @Autowired
    private RateLimiter rateLimiter;
    
    @GetMapping("/api/data")
    public ResponseEntity<?> getData(@RequestHeader("User-Id") String userId) {
        // 100 requests per minute per user
        if (!rateLimiter.allowRequest(userId, 100, Duration.ofMinutes(1))) {
            return ResponseEntity.status(429)
                .header("Retry-After", "60")
                .body("Rate limit exceeded");
        }
        
        return ResponseEntity.ok(fetchData());
    }
}
```

**Benefits:**
- **Latency:** Prevents system overload (keeps latency low)
- **Throughput:** Ensures fair resource allocation
- **Security:** Prevents DDoS attacks

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: Twitter's Latency Optimization**

**Problem (2012):**
- Home timeline load time: 10+ seconds
- Users abandoning the platform

**Root Cause Analysis:**
```
Timeline Generation:
1. Fetch user's followees (1000 users): 100ms
2. For each followee, fetch recent tweets: 1000 × 50ms = 50 seconds!
3. Merge and sort: 5 seconds
Total: 55+ seconds (unacceptable!)
```

**Solution: Fanout on Write (Pre-Computation)**
```
Old (Fanout on Read):
- User requests timeline
- Generate timeline on-the-fly (slow!)
- Latency: 10+ seconds

New (Fanout on Write):
- When user tweets, push to all followers' timelines
- User requests timeline → Read pre-computed timeline
- Latency: 100ms (100x faster!)

Trade-off:
✅ Latency: 10s → 100ms
❌ Write throughput: Higher (fanout to millions)
✅ Read throughput: Much higher (simple lookup)
```

**Code Pattern:**
```java
// Old: Fanout on Read (slow)
public List<Tweet> getTimeline(Long userId) {
    List<Long> followees = getFollowees(userId);  // 100ms
    List<Tweet> tweets = new ArrayList<>();
    
    for (Long followeeId : followees) {
        tweets.addAll(getTweets(followeeId));  // 1000 × 50ms = 50s
    }
    
    return tweets.stream()
        .sorted(Comparator.comparing(Tweet::getCreatedAt).reversed())
        .limit(20)
        .collect(Collectors.toList());
}

// New: Fanout on Write (fast reads)
public List<Tweet> getTimeline(Long userId) {
    // Pre-computed timeline in Redis
    return redis.opsForList()
        .range("timeline:" + userId, 0, 19);  // 5ms!
}

// Background: When user tweets
public void createTweet(Tweet tweet) {
    tweetRepository.save(tweet);
    
    // Fanout to all followers asynchronously
    List<Long> followers = getFollowers(tweet.getUserId());
    for (Long followerId : followers) {
        redis.opsForList().leftPush("timeline:" + followerId, tweet);
        redis.opsForList().trim("timeline:" + followerId, 0, 799);  // Keep 800 tweets
    }
}
```

**Results:**
- Read latency: 10s → 100ms (100x improvement)
- Read throughput: 10x higher
- Write throughput: Lower (but acceptable)

---

### **Case Study 2: Netflix's Throughput Challenge**

**Problem:**
- 200M+ subscribers
- Peak: 500K concurrent streams
- Each stream: 5 Mbps bitrate
- Required bandwidth: 2.5 Petabits/second (Pbps)

**Solution: Multi-Tier CDN Strategy**

```
Tier 1: Edge Servers (10,000+ nodes globally)
- Located at ISPs
- Serve 95% of traffic
- Latency: <10ms (local)
- Throughput: Massive (distributed)

Tier 2: Regional Cache
- Serve misses from Tier 1
- Latency: 50ms
- Throughput: High

Tier 3: Origin (AWS S3)
- Serve misses from Tier 2
- Latency: 200ms
- Throughput: Unlimited (S3)

Cache Hit Rates:
- Tier 1: 95%
- Tier 2: 4%
- Tier 3: 1%

Effective Latency:
(0.95 × 10ms) + (0.04 × 50ms) + (0.01 × 200ms) = 13.5ms
```

**Optimizations:**
1. **Adaptive Bitrate Streaming**
   - Low bandwidth? → Lower quality
   - Maintains throughput, sacrifices quality (not latency)

2. **Predictive Caching**
   - Pre-cache popular content to edge servers
   - Increases cache hit rate → Lower latency

3. **Connection Pooling**
   - Reuse TCP connections
   - Reduces connection setup latency

**Results:**
- Latency: <1 second to start (p99)
- Throughput: Handles 200M+ concurrent users
- Cost: Optimized by caching close to users

---

### **Case Study 3: Amazon DynamoDB (Throughput at Scale)**

**Design Goal:**
- Unlimited throughput (auto-scaling)
- Predictable latency (<10ms at any scale)

**Architecture:**
```
[Client]
   ↓
[API Gateway] → Load balancing
   ↓
[Request Routers] → Partition routing (consistent hashing)
   ↓
[Storage Nodes: 1000s of nodes]
   - Each node: Independent throughput
   - Add nodes → Increase throughput linearly
   - No single bottleneck

Partitioning:
- Data split by partition key
- Each partition: 3,000 read units/sec, 1,000 write units/sec
- Need more? Add partitions automatically
```

**Key Design Decisions:**

1. **Latency: Single-Digit Milliseconds**
   - SSD storage (fast I/O)
   - In-memory caching
   - Optimized replication protocol

2. **Throughput: Unlimited**
   - Horizontal partitioning
   - Auto-scaling (add partitions on demand)
   - No manual sharding required

**Code Example:**
```java
@Service
public class OrderService {
    @Autowired
    private DynamoDbClient dynamodb;
    
    public Order getOrder(String orderId) {
        GetItemRequest request = GetItemRequest.builder()
            .tableName("Orders")
            .key(Map.of("orderId", AttributeValue.builder().s(orderId).build()))
            .build();
        
        GetItemResponse response = dynamodb.getItem(request);
        return mapToOrder(response.item());
        
        // Latency: <10ms (p99)
        // Throughput: Unlimited (auto-scales)
    }
}
```

**Results:**
- Latency: <10ms (p99) at any scale
- Throughput: Scales to millions of requests/second
- Amazon's largest tables: Petabytes of data

---

### **Case Study 4: Discord's Real-Time Messaging**

**Requirements:**
- Low latency (<50ms for messages)
- High throughput (100K+ messages/second)
- 150M monthly active users

**Architecture Decisions:**

**1. Latency Optimization:**
```
WebSocket Connections:
- Persistent connections (no TCP handshake overhead)
- Latency: <10ms for message delivery

Regional Clusters:
- Deploy servers in 10+ regions
- Users connect to nearest region
- Latency reduced by 50-100ms

Technology: Elixir/Erlang
- Lightweight processes (millions of connections per server)
- Low-latency message passing
```

**2. Throughput Optimization:**
```
Sharding Strategy:
- Shard by "guild" (Discord server)
- Each guild → Specific node
- Users in same guild → Same node (no cross-shard latency!)

Message Queue (Kafka):
- Buffer messages during spikes
- Process asynchronously
- Throughput: 100K+ messages/second

Database (Cassandra → ScyllaDB):
- High write throughput
- Eventually consistent
- Stores message history
```

**Code Pattern:**
```elixir
# Elixir: Handle millions of WebSocket connections
defmodule Discord.Gateway do
  use GenServer

  # Each connection is a lightweight process
  def handle_message(user_id, message) do
    # Get guild (Discord server) for user
    guild_id = get_guild_id(user_id)
    
    # Send to all guild members (same node!)
    guild_members = get_guild_members(guild_id)
    
    Enum.each(guild_members, fn member_id ->
      # Push message via WebSocket (< 10ms)
      send_to_user(member_id, message)
    end)
    
    # Persist to database asynchronously (high throughput)
    Kafka.produce("messages", message)
  end
end
```

**Results:**
- Latency: p99 < 50ms (real-time feel)
- Throughput: 100K+ messages/second
- Scalability: 19M concurrent users

**Key Insight:** Sharding by guild keeps related data together → Low latency + High throughput

---

### **Case Study 5: Stripe's Payment Processing**

**Requirements:**
- Low latency (<100ms)
- High reliability (99.999%)
- Moderate throughput (10K+ transactions/second)

**Design Philosophy: Latency Over Throughput**

```
Why Latency Matters More:
- Users waiting for payment confirmation
- Every 100ms delay = 1% conversion drop
- Throughput sufficient (10K TPS handles $100M+/day)
```

**Latency Optimizations:**

1. **Edge Processing**
```
[User] → [Stripe Edge] → Pre-validation, fraud checks (50ms)
         ↓
      [Stripe Core] → Payment processing (30ms)
         ↓
      [Bank API] → Authorization (20ms)
         
Total: 100ms (p99)
```

2. **Optimistic Locking**
```java
@Transactional
public PaymentResult processPayment(Payment payment) {
    // Optimistic: Assume it will succeed
    Payment record = paymentRepository.save(payment);
    
    try {
        // Call bank API
        BankResponse response = bankClient.authorize(payment);
        
        if (response.isApproved()) {
            record.setStatus("APPROVED");
        } else {
            record.setStatus("DECLINED");
        }
        
        paymentRepository.save(record);
        return PaymentResult.of(record);
        
    } catch (Exception e) {
        // Rollback
        record.setStatus("FAILED");
        paymentRepository.save(record);
        throw e;
    }
}
```

3. **Connection Pre-Warming**
```
- Maintain persistent connections to banks
- No TCP handshake overhead
- Reduces latency by 20-50ms
```

**Results:**
- Latency: <100ms (p99)
- Throughput: 10K+ TPS (sufficient for scale)
- Reliability: 99.999% uptime

**Key Insight:** For user-facing financial transactions, latency is more critical than throughput.

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "Latency and throughput are two distinct performance metrics. **Latency** measures how fast we complete a single operation—essentially the response time. **Throughput** measures how many operations we can handle per unit of time—the system's capacity.
>
> The key insight is that optimizing for one can sometimes hurt the other. For example, if we batch requests to improve throughput, we increase latency because individual requests wait for the batch to fill. Conversely, if we process every request immediately to minimize latency, we might not fully utilize resources and achieve lower throughput.
>
> In practice, the choice depends on the use case. **User-facing systems** like web APIs prioritize latency—users don't care if the system can handle 100K QPS if their individual request takes 5 seconds. **Backend systems** like data pipelines prioritize throughput—we want to process 1 billion records as quickly as possible, even if each record takes longer.
>
> At Twitter, they optimized for latency by pre-computing timelines (fanout on write), which reduced read latency from 10 seconds to 100ms, though it increased write throughput requirements. At Netflix, they optimize for both by using a multi-tier CDN—low latency from edge servers and massive throughput from distributed caching.
>
> The best systems balance both by understanding the critical path: optimize latency for user-facing operations, optimize throughput for background processing, and use async patterns to decouple them."

---

### **Common Follow-Up Questions**

#### **Q1: How do you measure latency in production?**

> "I use percentile-based metrics, not averages, because averages hide outliers. I track:
>
> - **p50 (median)**: Typical user experience
> - **p95**: Identifies slowdowns affecting 5% of users
> - **p99**: Critical for understanding worst-case experience
> - **p99.9**: Catches rare but severe issues
>
> For example, if p50 is 20ms but p99 is 2000ms, we have a serious tail latency problem affecting 1 in 100 users. At scale—say 1 million requests per hour—that's 10,000 users getting a terrible experience.
>
> I use tools like DataDog or New Relic to track these metrics in real-time, set up alerts when p99 exceeds thresholds, and trace slow requests using distributed tracing (Jaeger, Zipkin) to identify bottlenecks.
>
> Code-wise, I instrument key operations:
> ```java
> @Timed(value = "api.getUserProfile", percentiles = {0.5, 0.95, 0.99})
> public UserProfile getUserProfile(Long userId) {
>     return userService.getProfile(userId);
> }
> ```
>
> This gives me detailed latency breakdowns per endpoint."

---

#### **Q2: When would you choose throughput over latency?**

> "I'd prioritize throughput over latency for batch processing, data pipelines, and background jobs where individual operation latency isn't user-facing.
>
> **Example 1: ETL Pipeline**
> - Goal: Process 1 billion records overnight
> - Don't care if each record takes 100ms vs 10ms
> - Do care about total throughput (records/second)
> - Solution: Batch processing, parallel workers, maximize CPU utilization
>
> **Example 2: Video Encoding**
> - Goal: Encode 10,000 videos per hour
> - Each video takes 5 minutes to encode
> - Strategy: 100 parallel workers → 10,000 videos/hour
> - Throughput matters, latency per video is acceptable
>
> **Example 3: Log Aggregation**
> - Ingesting 10TB of logs per day
> - Compress and batch logs (increases latency per log)
> - But throughput increases 10x (compression ratio)
> - Logs aren't time-sensitive, so acceptable
>
> The pattern: If the operation isn't blocking a user, prioritize throughput. If a user is waiting, prioritize latency."

---

#### **Q3: How do you handle the trade-off between latency and consistency?**

> "This is a classic CAP theorem problem. Strong consistency often requires coordination across nodes, which increases latency. I choose based on business requirements:
>
> **Strong Consistency (Higher Latency):**
> - **Use Case:** Financial transactions, inventory management
> - **Approach:** Synchronous replication, distributed locks, 2-phase commit
> - **Example:** Stripe payments—must confirm with bank before responding (100ms latency acceptable for correctness)
>
> **Eventual Consistency (Lower Latency):**
> - **Use Case:** Social media feeds, analytics dashboards
> - **Approach:** Asynchronous replication, eventual consistency
> - **Example:** Twitter likes—update locally, propagate asynchronously (10ms latency, count might be slightly stale)
>
> **Hybrid Approach:**
> - **Read-After-Write Consistency:** User sees their own writes immediately
> - **Eventual Consistency:** Other users see updates within 100ms
> - **Example:** Instagram posts—author sees post instantly, followers see it shortly after
>
> Code pattern:
> ```java
> // Strong consistency (higher latency)
> @Transactional(isolation = Isolation.SERIALIZABLE)
> public void transferMoney(Account from, Account to, BigDecimal amount) {
>     // Blocks until both accounts locked and updated
> }
>
> // Eventual consistency (lower latency)
> @Async
> public void updateFeedCount(Long userId) {
>     // Updates asynchronously, non-blocking
> }
> ```
>
> I always ask: 'What's the business impact of stale data vs slow response?'"

---

#### **Q4: How do you optimize a system that has both poor latency AND poor throughput?**

> "This usually means fundamental architectural problems. I'd approach it systematically:
>
> **Step 1: Identify Bottleneck (80/20 Rule)**
> - Profile the system: CPU, memory, disk I/O, network
> - Use APM tools to find slow queries, N+1 problems
> - Often 20% of code causes 80% of problems
>
> **Step 2: Fix Low-Hanging Fruit (Latency)**
> - Add database indexes (10-100x faster queries)
> - Implement caching (Redis) for hot data
> - Fix N+1 queries (batch loading)
> - Use connection pooling
> - These often improve both latency AND throughput
>
> **Step 3: Horizontal Scaling (Throughput)**
> - After optimizing single-server performance
> - Add load balancer + more servers
> - Scale database with read replicas
> - Consider sharding if write-bound
>
> **Real Example:**
> At a previous company, our API was slow (500ms) and couldn't handle load (1K QPS max):
>
> 1. **Found N+1 query** in user profile endpoint (100 DB calls per request!)
>    - Fixed with batch loading
>    - Latency: 500ms → 50ms (10x)
>    - Throughput: 1K → 5K QPS (5x) on same hardware
>
> 2. **Added Redis caching** for user data
>    - 90% cache hit rate
>    - Latency: 50ms → 10ms (5x)
>    - Throughput: 5K → 20K QPS (4x)
>
> 3. **Horizontal scaling** (added 5 servers)
>    - Throughput: 20K → 100K QPS (5x)
>
> Total improvement: 50ms latency (10x), 100K QPS (100x), for 5x cost increase.
>
> The lesson: Fix performance first (cheap), then scale (expensive)."

---

#### **Q5: How do you set latency and throughput SLAs?**

> "I base SLAs on business requirements and user expectations, not just technical capabilities:
>
> **Latency SLAs (User-Facing):**
> - **p50 < 50ms**: Typical user experience should be fast
> - **p95 < 200ms**: 95% of users get good experience
> - **p99 < 500ms**: Even 1% of users shouldn't wait too long
> - **p99.9 < 2000ms**: Extreme outliers acceptable but tracked
>
> **Throughput SLAs (System-Facing):**
> - **Normal load**: 10,000 QPS (baseline)
> - **Peak load**: 30,000 QPS (3x buffer for spikes)
> - **Burst capacity**: 50,000 QPS (short bursts acceptable)
>
> **Example SLA Document:**
> ```
> API Endpoint: GET /api/users/{id}
> - Availability: 99.9% (43 minutes downtime/month)
> - Latency (p99): < 200ms
> - Throughput: 10,000 QPS sustained, 30,000 QPS peak
> - Error Rate: < 0.1%
> ```
>
> **How I Monitor:**
> - Dashboards with real-time metrics
> - Alerts when p99 > 200ms for 5 minutes
> - Alerts when error rate > 0.1%
> - Monthly SLA reports showing compliance
>
> **Consequences of Breach:**
> - Internal: On-call gets paged, post-mortem required
> - External (if SLA with customer): Service credits, penalties
>
> The key is setting realistic SLAs based on historical data, not aspirational targets. Under-promise, over-deliver."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Latency vs Throughput: Visual Comparison**

```
LATENCY (Time per Request)
═══════════════════════════════════════

Request A:  [████████] 80ms
Request B:  [████████] 80ms
Request C:  [████████] 80ms

Each request completes in 80ms
Total time: 240ms (sequential)


THROUGHPUT (Requests per Second)
═══════════════════════════════════════

Second 1:  [REQ1][REQ2][REQ3]...[REQ100]  → 100 requests
Second 2:  [REQ101][REQ102]...[REQ200]   → 100 requests
Second 3:  [REQ201][REQ202]...[REQ300]   → 100 requests

System handles 100 requests/second
Can be achieved even with high latency per request (via parallelism)
```

---

### **The Trade-Off Matrix**

```
                    LATENCY
                LOW          HIGH
              ┌────────┬────────┐
              │        │        │
      HIGH    │   🎯   │   ⚠️    │
              │ IDEAL  │ BATCH  │
THROUGHPUT    │        │ JOBS   │
              ├────────┼────────┤
              │        │        │
      LOW     │   📱   │   ❌    │
              │ MOBILE │  BAD   │
              │  APP   │        │
              └────────┴────────┘

🎯 High Throughput + Low Latency
   - Netflix video streaming
   - Google Search
   - Best but hardest to achieve

⚠️ High Throughput + High Latency
   - Batch ETL pipelines
   - Video encoding
   - Acceptable for background jobs

📱 Low Throughput + Low Latency
   - Mobile apps (low traffic)
   - Internal tools
   - Acceptable for small scale

❌ Low Throughput + High Latency
   - Needs immediate optimization
   - Unacceptable for any use case
```

---

### **Optimization Priority Flow**

```
START: Performance Problem
         |
         v
   Measure Current State
   - Latency (p50, p99)
   - Throughput (QPS)
   - Bottleneck (CPU, DB, Network)
         |
         v
   ┌─────────────────┐
   │ Is user-facing? │
   └─────────────────┘
       /          \
     YES           NO
      |             |
      v             v
Optimize        Optimize
LATENCY first   THROUGHPUT first
      |             |
      v             v
   Caching       Batching
   Indexing      Async processing
   Async I/O     Parallelization
   CDN           Horizontal scaling
      |             |
      v             v
   Latency OK?   Throughput OK?
      |             |
     NO             NO
      |             |
      v             v
Scale Horizontally  Add capacity
Load balancing      More workers
Read replicas       Bigger queues
      |             |
      └─────┬───────┘
            v
    Monitor & Iterate
    - Track metrics
    - Adjust SLAs
    - Continuous optimization
```

---

### **Code Example: Latency vs Throughput Trade-Off**

```java
// Example: Processing Orders

// ❌ BAD: Low Latency, Low Throughput (Sequential)
public void processOrders(List<Order> orders) {
    for (Order order : orders) {
        validateOrder(order);        // 10ms
        chargeCustomer(order);       // 50ms
        updateInventory(order);      // 20ms
        sendConfirmation(order);     // 30ms
    }
    // Per order latency: 110ms
    // Throughput: 9 orders/second (1000ms / 110ms)
}


// ⚠️ BETTER: Higher Latency, Higher Throughput (Batching)
public void processOrdersBatch(List<Order> orders) {
    // Validate all at once
    List<Order> valid = validateBatch(orders);  // 50ms for 100 orders
    
    // Charge all customers (bulk API)
    List<Order> charged = chargeBatch(valid);   // 100ms for 100 orders
    
    // Update inventory (batch update)
    updateInventoryBatch(charged);              // 50ms for 100 orders
    
    // Send confirmations (async)
    sendConfirmationsBatch(charged);            // 20ms to queue
    
    // Total: 220ms for 100 orders
    // Per order latency: 220ms (higher)
    // Throughput: 454 orders/second (100/0.22) - 50x higher!
}


// ✅ BEST: Low Latency, High Throughput (Async + Batching)
@Async
public CompletableFuture<Void> processOrdersOptimized(List<Order> orders) {
    // Immediate response to user (low latency for API call)
    orders.forEach(order -> 
        kafka.send("orders-topic", order)
    );
    
    return CompletableFuture.completedFuture(null);
    // API latency: 5ms (just queue the order)
    // User gets instant response!
}

@KafkaListener(topics = "orders-topic")
public void processOrderBackground(List<Order> batch) {
    // Process in background (high throughput via batching)
    validateBatch(batch);
    chargeBatch(batch);
    updateInventoryBatch(batch);
    sendConfirmationsBatch(batch);
    
    // API latency: 5ms (user perspective)
    // Background latency: 220ms (system perspective)
    // Throughput: 454 orders/second
    // BEST OF BOTH WORLDS!
}
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Business Impact:**
- **Latency:**
  - Google: 500ms delay = 20% traffic drop
  - Amazon: 100ms delay = 1% sales decrease
  - User experience directly impacts revenue

- **Throughput:**
  - Can't process orders fast enough = lost sales
  - Insufficient throughput = system crashes during peak
  - Determines how many users you can serve

**User Experience:**
- **Latency:** "The app feels slow" (individual experience)
- **Throughput:** "The app is down" (system can't handle load)

**Cost:**
- **Optimizing latency:** Often free (code optimization, caching)
- **Increasing throughput:** Costs money (more servers, infrastructure)
- **Sweet spot:** Optimize latency first, then scale for throughput

---

### **How It Works (Simple Summary)**

#### **Latency Optimization:**
1. **Measure:** Identify slow operations (profiling, APM)
2. **Optimize:**
   - Add caching (Redis, CDN)
   - Add database indexes
   - Fix N+1 queries
   - Use async I/O
3. **Monitor:** Track p50, p95, p99 percentiles

#### **Throughput Optimization:**
1. **Estimate:** Calculate required QPS (traffic × growth)
2. **Scale:**
   - Horizontal scaling (more servers)
   - Database read replicas
   - Async processing (queues)
   - Batching
3. **Monitor:** Track QPS, queue depth, error rates

---

### **Key Trade-Offs to Remember**

| **Optimization**        | **Latency** | **Throughput** | **Complexity** | **Cost** | **When to Use**             |
|-------------------------|-------------|----------------|----------------|----------|-----------------------------|
| **Caching**             | ✅✅ Much lower | ✅ Higher    | ⚠️ Medium      | 💰 Low   | Read-heavy, hot data        |
| **Batching**            | ❌ Higher   | ✅✅ Much higher | ⚠️ Medium   | 💰 Low   | Background jobs, bulk ops   |
| **Async Processing**    | ⚠️ Higher   | ✅✅ Much higher | ❌ High     | 💰 Medium| Non-blocking operations     |
| **Horizontal Scaling**  | ⚠️ Slightly higher | ✅✅ Much higher | ❌ High | 💰💰 High | High traffic, fault tolerance |
| **Database Indexing**   | ✅✅ Much lower | ✅ Higher    | ✅ Low         | 💰 Free  | Slow queries                |
| **Connection Pooling**  | ✅ Lower    | ✅ Higher      | ✅ Low         | 💰 Free  | Database-heavy apps         |
| **CDN**                 | ✅✅ Much lower | ✅✅ Much higher | ⚠️ Medium | 💰 Medium| Static assets, global users |

---

### **Decision Framework**

```
┌──────────────────────────────────────────┐
│ What is the use case?                    │
└──────────────────────────────────────────┘
              |
      ┌───────┴────────┐
      v                v
  User-Facing      Background Job
      |                |
      v                v
  Optimize          Optimize
  LATENCY          THROUGHPUT
  first            first
      |                |
      v                v
  Target:          Target:
  p99 < 200ms      10K+ ops/sec
      |                |
      v                v
  Techniques:      Techniques:
  - Caching        - Batching
  - Indexing       - Async queues
  - Async I/O      - Parallelization
  - CDN            - Partitioning
      |                |
      └────────┬────────┘
               v
    Then scale for throughput/latency
    (whichever wasn't prioritized first)
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Understand the Difference**
- Latency = Speed per request (ms)
- Throughput = Requests per second (QPS)
- They're related but optimizing one can hurt the other

✅ **Ask Clarifying Questions**
- "Is this user-facing or background processing?"
- "What's more important: fast response or high capacity?"
- "What are the latency and throughput requirements?"

✅ **Use Real Examples**
- "Twitter optimized latency by pre-computing timelines..."
- "Netflix achieves both with multi-tier CDN..."
- "Batch processing prioritizes throughput over latency..."

✅ **Address Trade-Offs**
- "Batching increases throughput but adds latency..."
- "Caching reduces latency but adds complexity..."
- "Async processing improves throughput but eventual consistency..."

✅ **Measure with Percentiles**
- Don't say "average latency"
- Say "p99 latency" (shows senior-level thinking)
- Explain why p99 matters at scale

✅ **Optimize in Order**
1. Fix performance (latency) first - often free
2. Then scale (throughput) - costs money
3. Monitor both continuously

**The best systems achieve both low latency AND high throughput** through careful architecture, caching, async processing, and horizontal scaling. FAANG engineers master this balance.

---

**End of Topic 12: Latency vs Throughput**
