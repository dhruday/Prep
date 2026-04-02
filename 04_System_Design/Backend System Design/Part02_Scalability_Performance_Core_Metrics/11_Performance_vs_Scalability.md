# 11. Performance vs Scalability

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Performance** and **Scalability** are two distinct but related concepts that engineers often confuse. Understanding the difference is critical for making the right architectural decisions.

### What They Are

#### **Performance**
How **fast** a system responds to a **single request** or completes a **single task**.
- Measured in: **Latency** (response time), **throughput** (tasks per unit time)
- Example: "This API returns a response in 50ms"

#### **Scalability**
How well a system handles **increased load** by adding resources.
- Measured in: **Linear scaling**, **efficiency**, **cost per unit**
- Example: "Adding 2x servers doubles our throughput"

### The Key Distinction

> **Performance** = "How fast is it?"  
> **Scalability** = "How much load can it handle, and how easily can it grow?"

**Critical Insight:**
- A system can be **high-performance but not scalable** (fast for 1 user, crashes at 1000)
- A system can be **scalable but low-performance** (handles millions of users, but each request is slow)
- **Ideal:** Both high-performance AND scalable

---

### Why This Matters

**In Interviews:**
- Interviewers test whether you understand that adding more servers doesn't always fix performance problems
- You must identify if a bottleneck is a **performance issue** (slow code) or a **scalability issue** (resource limits)

**In Production:**
- **Performance problems** require optimization (better algorithms, caching, indexing)
- **Scalability problems** require more resources (horizontal/vertical scaling)
- **Wrong diagnosis = wasted time and money**

---

### The Problem They Solve

#### **Performance Problems:**
- Users complaining: "The app is slow"
- Symptoms: High latency (500ms → 5000ms)
- **Root causes:** Inefficient queries, no caching, N+1 queries, blocking I/O

#### **Scalability Problems:**
- System crashes during traffic spikes
- Symptoms: Out of memory, connection exhaustion, server overload
- **Root causes:** Single server limit, no load balancing, database bottleneck

---

### Where and When They're Used

**Performance Optimization:**
- Early stage: Make the system fast for early users
- Focus: Algorithms, database queries, caching, CDN
- Tools: Profilers, APM (New Relic, DataDog), query analyzers

**Scalability Engineering:**
- Growth stage: Handle 10x, 100x more users
- Focus: Load balancers, sharding, replication, microservices
- Tools: Auto-scaling, Kubernetes, distributed systems

---

### Role in Large-Scale Distributed Systems

At FAANG scale, **both matter**:

**Netflix:**
- **Performance:** Video starts in <1 second (99th percentile)
- **Scalability:** Serves 200M+ subscribers globally

**Google Search:**
- **Performance:** Results in <200ms
- **Scalability:** Handles 8.5 billion searches per day

**Amazon:**
- **Performance:** Product pages load in <100ms
- **Scalability:** Handles Prime Day (millions of orders/hour)

The best systems optimize for **both** through:
- **Performance:** Caching, CDN, efficient algorithms
- **Scalability:** Horizontal scaling, sharding, microservices

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### The Mathematical Relationship

#### **Performance Formula:**
```
Latency = Processing Time + Network Time + Queue Time
```

**Example:**
```
API Latency = 10ms (compute) + 5ms (network) + 2ms (queue) = 17ms
```

#### **Scalability Formula:**
```
Scalability Efficiency = Actual Throughput / (Ideal Throughput × Resources)

Ideal: 100% efficiency (linear scaling)
Reality: 70-90% efficiency (due to overhead)
```

**Example:**
```
1 server:  1,000 QPS
10 servers: 9,000 QPS (90% efficiency)
- Lost 10% to network overhead, load balancer, coordination
```

---

### Performance vs Scalability: The Matrix

| **Scenario**                     | **Performance** | **Scalability** | **Diagnosis**                              |
|----------------------------------|-----------------|-----------------|-------------------------------------------|
| **Fast for 1 user, crashes at scale** | ✅ High         | ❌ Low          | No horizontal scaling, single server limit |
| **Slow for everyone, regardless of load** | ❌ Low          | ✅ High         | Inefficient code, needs optimization      |
| **Fast at low load, slow at high load** | ✅ High         | ❌ Low          | Resource contention (DB locks, memory)    |
| **Slow at all loads, crashes at scale** | ❌ Low          | ❌ Low          | Both problems (fix performance first!)    |
| **Fast and handles any load**    | ✅ High         | ✅ High         | 🎯 GOAL: This is what FAANG systems aim for |

---

### Common Misconceptions

#### ❌ **Misconception 1: "Scaling fixes performance"**
```
BAD THINKING:
"Our API is slow (500ms). Let's add 10 more servers!"

REALITY:
- 1 server: 500ms per request
- 10 servers: Still 500ms per request (just handles more requests)

FIX:
Optimize the code first (caching, indexing) to reduce latency to 50ms
THEN scale horizontally to handle more users
```

#### ❌ **Misconception 2: "Performance optimization fixes scalability"**
```
BAD THINKING:
"We optimized our code to 10ms. We can handle infinite users!"

REALITY:
- Single server: Max 10,000 QPS (hardware limit)
- Without horizontal scaling, you hit a ceiling

FIX:
After optimizing performance, add horizontal scaling to break through limits
```

#### ✅ **Correct Thinking: "Optimize Performance, Then Scale"**
```
STEP 1: Optimize performance (reduce latency per request)
STEP 2: Scale horizontally (handle more concurrent requests)

Example:
- Start: 1 server, 500ms latency, 2,000 QPS
- Optimize: 1 server, 50ms latency, 20,000 QPS
- Scale: 10 servers, 50ms latency, 200,000 QPS
```

---

### Deep Dive: Performance Bottlenecks

#### **1. CPU-Bound Performance Issues**

**Problem:**
```java
// Inefficient algorithm: O(n²)
public List<User> findCommonFriends(User user1, User user2) {
    List<User> common = new ArrayList<>();
    for (User friend1 : user1.getFriends()) {
        for (User friend2 : user2.getFriends()) {
            if (friend1.equals(friend2)) {
                common.add(friend1);
            }
        }
    }
    return common;
}
// For 1000 friends each: 1,000,000 comparisons!
```

**Solution: Optimize Algorithm (O(n))**
```java
public List<User> findCommonFriends(User user1, User user2) {
    Set<User> friends1 = new HashSet<>(user1.getFriends());
    List<User> common = new ArrayList<>();
    for (User friend2 : user2.getFriends()) {
        if (friends1.contains(friend2)) {
            common.add(friend2);
        }
    }
    return common;
}
// For 1000 friends each: 2,000 operations (500x faster!)
```

**Impact:**
- **Before:** 500ms per request (500 QPS max per server)
- **After:** 1ms per request (50,000 QPS max per server)
- **Result:** 100x performance improvement without adding servers

---

#### **2. I/O-Bound Performance Issues**

**Problem: N+1 Query**
```java
// BAD: N+1 queries
@GetMapping("/users/{id}/posts")
public List<PostDTO> getUserPosts(@PathVariable Long id) {
    User user = userRepository.findById(id);  // 1 query
    
    List<PostDTO> posts = new ArrayList<>();
    for (Post post : user.getPosts()) {       // N queries!
        Author author = authorRepository.findById(post.getAuthorId());
        posts.add(new PostDTO(post, author));
    }
    return posts;
}
// For 100 posts: 101 database queries (1 + 100)
// Latency: 101 × 5ms = 505ms
```

**Solution: Batch Fetching**
```java
// GOOD: 2 queries total
@GetMapping("/users/{id}/posts")
public List<PostDTO> getUserPosts(@PathVariable Long id) {
    User user = userRepository.findById(id);  // 1 query
    
    List<Post> posts = user.getPosts();
    Set<Long> authorIds = posts.stream()
        .map(Post::getAuthorId)
        .collect(Collectors.toSet());
    
    Map<Long, Author> authors = 
        authorRepository.findAllById(authorIds)  // 1 batch query
            .stream()
            .collect(Collectors.toMap(Author::getId, a -> a));
    
    return posts.stream()
        .map(post -> new PostDTO(post, authors.get(post.getAuthorId())))
        .collect(Collectors.toList());
}
// For 100 posts: 2 queries
// Latency: 2 × 5ms = 10ms (50x faster!)
```

---

#### **3. Memory-Bound Performance Issues**

**Problem: Loading Entire Dataset**
```java
// BAD: Loads all users into memory
@GetMapping("/users/search")
public List<User> searchUsers(@RequestParam String query) {
    List<User> allUsers = userRepository.findAll();  // 10M users!
    return allUsers.stream()
        .filter(u -> u.getName().contains(query))
        .limit(20)
        .collect(Collectors.toList());
}
// Memory: 10M users × 1KB = 10GB (OutOfMemoryError!)
```

**Solution: Database Filtering + Pagination**
```java
// GOOD: Let DB do the filtering
@GetMapping("/users/search")
public Page<User> searchUsers(
    @RequestParam String query,
    @RequestParam(defaultValue = "0") int page) {
    
    Pageable pageable = PageRequest.of(page, 20);
    return userRepository.findByNameContaining(query, pageable);
}
// Query: SELECT * FROM users WHERE name LIKE '%query%' LIMIT 20 OFFSET 0
// Memory: 20 users × 1KB = 20KB (500,000x less memory!)
```

---

### Deep Dive: Scalability Bottlenecks

#### **1. Database Scalability**

**Problem: Single Master Bottleneck**
```
[App Servers: 100 nodes] 
        ↓
[Single PostgreSQL Master]  ← Bottleneck!
  - Max 10,000 writes/sec
  - CPU at 100%
```

**Solution: Read Replicas + Sharding**
```
[App Servers: 100 nodes]
        ↓
     /     \
[Master]  [Read Replicas × 10]
(Writes)  (Reads)

+ Sharding by user_id (for writes):
Shard 1: Users 1-1M
Shard 2: Users 1M-2M
Shard 3: Users 2M-3M
Shard 4: Users 3M-4M

Result:
- Reads: 10x throughput (replicas)
- Writes: 4x throughput (sharding)
```

**Code: Read/Write Split**
```java
@Configuration
public class DataSourceConfig {
    
    @Bean
    public DataSource routingDataSource() {
        ReplicationRoutingDataSource dataSource = 
            new ReplicationRoutingDataSource();
        
        Map<Object, Object> sources = new HashMap<>();
        sources.put("write", masterDataSource());
        sources.put("read", readReplicaDataSource());
        
        dataSource.setTargetDataSources(sources);
        return dataSource;
    }
}

// Usage
@Service
public class UserService {
    
    @Transactional(readOnly = true)  // Routes to read replica
    public User getUserById(Long id) {
        return userRepository.findById(id).orElseThrow();
    }
    
    @Transactional  // Routes to master
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
```

---

#### **2. Stateful Service Scalability**

**Problem: Session Stored in Memory**
```java
// BAD: Session in server memory (doesn't scale)
@RestController
public class SessionController {
    private Map<String, User> sessions = new ConcurrentHashMap<>();
    
    @PostMapping("/login")
    public String login(@RequestBody LoginRequest request) {
        User user = authenticate(request);
        String sessionId = UUID.randomUUID().toString();
        sessions.put(sessionId, user);  // Stored locally!
        return sessionId;
    }
    
    @GetMapping("/profile")
    public User getProfile(@RequestHeader("Session-Id") String sessionId) {
        return sessions.get(sessionId);  // Only works on same server!
    }
}

// Problem: User logs in on Server 1, next request goes to Server 2
// Server 2 doesn't have the session → User appears logged out
```

**Solution: External Session Store (Redis)**
```java
// GOOD: Session in Redis (scales horizontally)
@Service
public class SessionService {
    @Autowired
    private RedisTemplate<String, User> redis;
    
    public String createSession(User user) {
        String sessionId = UUID.randomUUID().toString();
        redis.opsForValue().set(
            "session:" + sessionId, 
            user, 
            30, 
            TimeUnit.MINUTES
        );
        return sessionId;
    }
    
    public User getSession(String sessionId) {
        return redis.opsForValue().get("session:" + sessionId);
    }
}

// Now any server can access the session
// Can add/remove app servers freely (horizontal scaling)
```

---

#### **3. Cache Scalability**

**Problem: Single Redis Instance Bottleneck**
```
[App Servers: 50 nodes]
        ↓
[Single Redis: r5.4xlarge]
  - Max 500,000 ops/sec
  - Bottleneck at scale
```

**Solution: Redis Cluster**
```
[App Servers: 50 nodes]
        ↓
[Redis Cluster: 10 nodes]
  - 5 master nodes (each with 1 replica)
  - Each master handles different key ranges
  - Total: 5M ops/sec

Key Distribution (Consistent Hashing):
  user:1 → Node 1
  user:2 → Node 3
  user:3 → Node 1
  user:4 → Node 5
```

**Code: Redis Cluster Configuration**
```java
@Configuration
public class RedisClusterConfig {
    
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisClusterConfiguration clusterConfig = 
            new RedisClusterConfiguration(Arrays.asList(
                "redis-node-1:6379",
                "redis-node-2:6379",
                "redis-node-3:6379",
                "redis-node-4:6379",
                "redis-node-5:6379"
            ));
        
        return new LettuceConnectionFactory(clusterConfig);
    }
    
    @Bean
    public RedisTemplate<String, Object> redisTemplate() {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());
        return template;
    }
}
```

---

### The Trade-Off Spectrum

| **Approach**                  | **Performance** | **Scalability** | **Complexity** | **Cost** | **Use Case**                  |
|-------------------------------|-----------------|-----------------|----------------|----------|-------------------------------|
| **Single powerful server**    | ✅ High         | ❌ Low          | ✅ Low         | 💰 Medium | Startups, internal tools      |
| **Optimized single server**   | ✅✅ Very High   | ❌ Low          | ✅ Low         | 💰 Medium | Early growth phase            |
| **Vertical + Read Replicas**  | ✅ High         | ⚠️ Medium       | ⚠️ Medium      | 💰💰 High | Mid-size apps (100K-1M users) |
| **Horizontal + Sharding**     | ⚠️ Medium       | ✅✅ Very High   | ❌ High        | 💰 Medium | Large-scale (1M+ users)       |
| **Optimized + Horizontal**    | ✅✅ Very High   | ✅✅ Very High   | ❌ High        | 💰💰 High | FAANG-scale systems           |

---

### Real-World Pattern: Netflix's Approach

**Phase 1: Performance Optimization**
- Implemented adaptive bitrate streaming (reduce bandwidth by 40%)
- Optimized video encoding (better compression, faster start times)
- CDN caching (99% cache hit rate)

**Phase 2: Scalability Engineering**
- Moved to AWS (elastic scaling)
- Microservices architecture (1000+ services)
- Regional isolation (failure in one region doesn't affect others)

**Result:**
- **Performance:** Video starts in <1 second (p99)
- **Scalability:** Serves 200M+ subscribers globally

---

### Performance + Scalability in Harmony

#### **Example: API Gateway Pattern**

```
         [Client]
            ↓
      [API Gateway]  ← Performance: Caching, rate limiting
            ↓
   [Load Balancer]   ← Scalability: Distribute load
       /    |    \
   [Service A] [Service B] [Service C]  ← Scalability: Horizontal
       ↓         ↓            ↓
   [Cache]   [Cache]      [Cache]       ← Performance: Reduce DB load
       ↓         ↓            ↓
   [DB Shard 1] [DB Shard 2] [DB Shard 3] ← Scalability: Shard data
```

**Performance Techniques:**
- API Gateway caches responses (reduce latency)
- Service-level caching (Redis)
- Database indexing (fast queries)

**Scalability Techniques:**
- Load balancer (distribute requests)
- Horizontal services (add more nodes)
- Database sharding (distribute data)

---

### Measuring Performance vs Scalability

#### **Performance Metrics:**
```
Latency Percentiles:
- p50 (median): 50ms
- p95: 150ms
- p99: 500ms
- p99.9: 2000ms

Goal: Keep p99 < 200ms
```

**Code: Measure Latency**
```java
@Aspect
@Component
public class PerformanceMonitor {
    
    @Around("@annotation(Timed)")
    public Object measureLatency(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        try {
            return joinPoint.proceed();
        } finally {
            long duration = System.currentTimeMillis() - start;
            String method = joinPoint.getSignature().getName();
            
            // Send to monitoring (Prometheus, DataDog)
            metrics.recordLatency(method, duration);
            
            if (duration > 200) {
                log.warn("Slow method: {} took {}ms", method, duration);
            }
        }
    }
}

// Usage
@Service
public class UserService {
    
    @Timed
    public User getUserProfile(Long userId) {
        return userRepository.findById(userId).orElseThrow();
    }
}
```

---

#### **Scalability Metrics:**
```
Throughput (QPS):
- 1 server: 1,000 QPS
- 10 servers: 9,500 QPS (95% efficiency)

Efficiency = 9,500 / (1,000 × 10) = 95%

Goal: Maintain 90%+ efficiency when scaling
```

**Code: Track Throughput**
```java
@Component
public class ThroughputMonitor {
    private final AtomicLong requestCount = new AtomicLong(0);
    private final ConcurrentHashMap<String, AtomicLong> endpointCounts 
        = new ConcurrentHashMap<>();
    
    @Scheduled(fixedRate = 60000)  // Every minute
    public void reportMetrics() {
        long count = requestCount.getAndSet(0);
        double qps = count / 60.0;
        
        log.info("Throughput: {} QPS", qps);
        metrics.gauge("app.qps", qps);
        
        endpointCounts.forEach((endpoint, counter) -> {
            long endpointCount = counter.getAndSet(0);
            metrics.gauge("app.qps." + endpoint, endpointCount / 60.0);
        });
    }
    
    public void recordRequest(String endpoint) {
        requestCount.incrementAndGet();
        endpointCounts.computeIfAbsent(endpoint, k -> new AtomicLong())
                      .incrementAndGet();
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Example: E-Commerce Platform

**Requirements:**
- 10M daily active users (DAU)
- Each user makes 10 requests/day (average)
- Peak traffic = 3x average
- Target latency: p99 < 200ms

---

**Step 1: Calculate Throughput Needs (Scalability)**

```
Daily Requests = 10M users × 10 requests = 100M requests/day

Average QPS = 100M / (24 × 3600) = 1,157 QPS

Peak QPS = 1,157 × 3 = 3,471 QPS
```

**Scalability Decision:**
```
Option 1: Single powerful server (max 10,000 QPS)
✅ Can handle peak load
❌ Single point of failure

Option 2: 4 smaller servers (each 1,000 QPS)
✅ Fault-tolerant
✅ Total capacity: 4,000 QPS (buffer for spikes)
Cost: 4 × $100 = $400/month
```

**Decision: Option 2** (horizontal scaling for redundancy)

---

**Step 2: Optimize Performance (Reduce Latency)**

**Initial State:**
- API latency: 500ms (before optimization)
- With 3,471 QPS peak, need 1,736 concurrent connections per server

**Performance Optimization:**

1. **Add Database Indexing**
   - Query time: 200ms → 10ms
   
2. **Implement Caching (Redis)**
   - Cache hit rate: 80%
   - Cached requests: 1ms
   
3. **CDN for Static Assets**
   - Image load time: 100ms → 10ms

**After Optimization:**
```
Latency Breakdown:
- 80% requests (cached): 5ms
- 20% requests (DB): 50ms

Weighted Average = (0.8 × 5ms) + (0.2 × 50ms) = 14ms

Result: p99 < 30ms (6x better than target!)
```

---

**Step 3: Capacity Planning**

**With Optimized Performance:**
```
Each server can handle:
- Max concurrent: 1,000 connections
- Avg latency: 14ms
- Theoretical QPS = 1,000 / 0.014 = 71,429 QPS per server

Practical QPS (accounting for overhead) = 1,000 QPS per server
```

**Servers Needed:**
```
Peak QPS: 3,471
Servers needed: 3,471 / 1,000 = 3.5 → 4 servers (with buffer)

With 30% buffer for spikes: 4 × 1.3 = 6 servers

Across 2 AZs: 6 × 2 = 12 servers total
```

**Final Architecture:**
```
[Load Balancer]
    |
[6 App Servers per AZ × 2 AZs = 12 total]
    |
[Redis Cluster: 3 master + 3 replica]
    |
[PostgreSQL Master + 5 Read Replicas]
```

**Cost:**
```
App Servers: 12 × $100 = $1,200/month
Redis: 6 nodes × $50 = $300/month
PostgreSQL: Master ($500) + Replicas (5 × $200) = $1,500/month
Load Balancer: $50/month

Total: $3,050/month

Capacity: 12,000 QPS (3.5x over peak for safety)
Latency: p99 < 30ms
Availability: 99.99% (multi-AZ)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Performance vs Scalability in Database Design

#### **Performance-Focused Database Design**

**Goal: Minimize query latency**

**Techniques:**

1. **Indexing (B-Tree, Hash)**
```sql
-- Without index: Full table scan (1,000ms)
SELECT * FROM users WHERE email = 'user@example.com';

-- With index: Index lookup (10ms)
CREATE INDEX idx_users_email ON users(email);
```

2. **Denormalization (Trade Storage for Speed)**
```sql
-- Normalized (requires JOIN, slower)
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;

-- Denormalized (pre-computed, faster)
SELECT name, order_count FROM users;
-- Update order_count via trigger or background job
```

3. **Materialized Views**
```sql
-- Expensive query (runs every time)
SELECT 
    product_id, 
    DATE(created_at) as date,
    SUM(quantity) as total_sales
FROM orders
GROUP BY product_id, date;

-- Materialized view (pre-computed)
CREATE MATERIALIZED VIEW daily_sales AS
SELECT 
    product_id, 
    DATE(created_at) as date,
    SUM(quantity) as total_sales
FROM orders
GROUP BY product_id, date;

-- Refresh periodically (e.g., hourly)
REFRESH MATERIALIZED VIEW daily_sales;
```

---

#### **Scalability-Focused Database Design**

**Goal: Handle more data and requests**

**Techniques:**

1. **Read Replicas (Scale Reads)**
```java
@Configuration
public class DatabaseRoutingConfig {
    
    @Bean
    public DataSource routingDataSource() {
        AbstractRoutingDataSource router = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                return TransactionSynchronizationManager
                    .isCurrentTransactionReadOnly() ? "read" : "write";
            }
        };
        
        Map<Object, Object> dataSources = new HashMap<>();
        dataSources.put("write", masterDataSource());
        dataSources.put("read", readReplicaDataSource());
        
        router.setTargetDataSources(dataSources);
        router.setDefaultTargetDataSource(masterDataSource());
        
        return router;
    }
}
```

2. **Sharding (Scale Writes)**
```java
@Component
public class ShardResolver {
    private static final int NUM_SHARDS = 4;
    
    public int getShardId(Long userId) {
        return (int) (userId % NUM_SHARDS);
    }
    
    public DataSource getDataSource(Long userId) {
        int shardId = getShardId(userId);
        return dataSourceMap.get(shardId);
    }
}

@Service
public class UserService {
    @Autowired
    private ShardResolver shardResolver;
    
    public User findUser(Long userId) {
        DataSource shard = shardResolver.getDataSource(userId);
        JdbcTemplate jdbc = new JdbcTemplate(shard);
        return jdbc.queryForObject(
            "SELECT * FROM users WHERE id = ?",
            new Object[]{userId},
            User.class
        );
    }
}
```

3. **Partitioning (Horizontal Partitioning)**
```sql
-- Partition by date (easier to manage, archive old data)
CREATE TABLE orders (
    id BIGINT,
    user_id BIGINT,
    created_at TIMESTAMP,
    total DECIMAL
) PARTITION BY RANGE (created_at) (
    PARTITION p_2024_q1 VALUES LESS THAN ('2024-04-01'),
    PARTITION p_2024_q2 VALUES LESS THAN ('2024-07-01'),
    PARTITION p_2024_q3 VALUES LESS THAN ('2024-10-01'),
    PARTITION p_2024_q4 VALUES LESS THAN ('2025-01-01')
);

-- Queries automatically use the right partition
SELECT * FROM orders 
WHERE created_at BETWEEN '2024-05-01' AND '2024-05-31';
-- Only scans p_2024_q2 partition
```

---

### Hybrid Approach: Performance + Scalability

**Example: Instagram's Database Strategy**

```
Performance Optimizations:
✅ PostgreSQL with optimized indexes
✅ Memcached for hot data (cache hit rate: 99%)
✅ CDN for images (reduce DB load)

Scalability:
✅ Sharded PostgreSQL by user_id (thousands of shards)
✅ Read replicas per shard (handle read traffic)
✅ Cassandra for feeds (eventual consistency, massive scale)
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### How Performance and Scalability Impact Reliability

#### **Scenario 1: Poor Performance → Cascading Failure**

**Problem:**
```
API latency: 5000ms (slow query)
Server timeout: 30 seconds
Max connections: 1,000

Timeline:
1. Traffic spike: 100 QPS
2. Each request takes 5 seconds
3. Concurrent requests: 100 × 5 = 500 connections
4. More traffic comes → 600, 700, 800 connections
5. Hit 1,000 connection limit
6. New requests rejected → 503 errors
7. Users retry → Even more load → System crashes
```

**Solution: Fix Performance First**
```
1. Optimize query: 5000ms → 50ms
2. Now handle: 100 QPS with only 5 concurrent connections
3. No cascading failure
```

---

#### **Scenario 2: Poor Scalability → Outage During Spike**

**Problem:**
```
Black Friday Sale:
- Normal: 1,000 QPS
- Black Friday: 50,000 QPS
- Single server max: 10,000 QPS
Result: Server crashes, site goes down
```

**Solution: Horizontal Scaling**
```
1. Auto-scaling policy:
   - If CPU > 70%: Add 2 servers
   - If CPU < 30%: Remove 1 server

2. Black Friday:
   - Start: 5 servers (10,000 QPS)
   - Auto-scale to 25 servers (50,000 QPS)
   - After sale: Scale back down to 5 servers

3. Result: No outage, cost-efficient
```

---

### Circuit Breaker Pattern (Performance + Reliability)

```java
@Service
public class PaymentService {
    private final CircuitBreaker circuitBreaker;
    
    @CircuitBreaker(name = "payment", fallbackMethod = "paymentFallback")
    @Retry(name = "payment", maxAttempts = 3)
    @Timeout(duration = 2, unit = TimeUnit.SECONDS)
    public PaymentResponse processPayment(PaymentRequest request) {
        // Call external payment service
        return paymentClient.charge(request);
    }
    
    // Fallback: Queue for later processing
    public PaymentResponse paymentFallback(PaymentRequest request, Exception e) {
        log.warn("Payment service down, queueing payment", e);
        paymentQueue.enqueue(request);
        return PaymentResponse.pending();
    }
}

// Configuration
resilience4j.circuitbreaker:
  instances:
    payment:
      slidingWindowSize: 10
      failureRateThreshold: 50  # Open circuit if 50% fail
      waitDurationInOpenState: 10s
      permittedNumberOfCallsInHalfOpenState: 3
```

**How It Helps:**
- **Performance:** 2-second timeout prevents slow requests from blocking
- **Reliability:** Circuit breaker stops cascading failures
- **Scalability:** Queueing allows async processing during spikes

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Rate Limiting: Performance vs Scalability Trade-Offs

#### **Performance-Focused: In-Memory Rate Limiting**

```java
@Component
public class LocalRateLimiter {
    private final Map<String, RateLimiter> limiters = new ConcurrentHashMap<>();
    
    public boolean allowRequest(String userId) {
        RateLimiter limiter = limiters.computeIfAbsent(
            userId, 
            k -> RateLimiter.create(100)  // 100 req/sec per user
        );
        
        return limiter.tryAcquire();
    }
}

// Pros: Very fast (<1ms)
// Cons: Doesn't scale (each server has separate limits)
```

---

#### **Scalability-Focused: Distributed Rate Limiting (Redis)**

```java
@Component
public class DistributedRateLimiter {
    @Autowired
    private RedisTemplate<String, Integer> redis;
    
    public boolean allowRequest(String userId) {
        String key = "rate_limit:" + userId;
        Long count = redis.opsForValue().increment(key);
        
        if (count == 1) {
            redis.expire(key, 1, TimeUnit.SECONDS);
        }
        
        return count <= 100;  // 100 requests per second
    }
}

// Pros: Accurate across all servers
// Cons: Slower (~5ms network round trip)
```

---

#### **Hybrid: Token Bucket with Local Cache**

```java
@Component
public class HybridRateLimiter {
    @Autowired
    private RedisTemplate<String, Integer> redis;
    
    private final Cache<String, AtomicInteger> localCache = 
        CacheBuilder.newBuilder()
            .expireAfterWrite(1, TimeUnit.SECONDS)
            .build();
    
    public boolean allowRequest(String userId) {
        String key = "rate_limit:" + userId;
        
        // Check local cache first (fast)
        AtomicInteger localCount = localCache.getIfPresent(key);
        if (localCount != null && localCount.get() >= 100) {
            return false;  // Fast rejection
        }
        
        // Check Redis (slower, but accurate)
        Long redisCount = redis.opsForValue().increment(key);
        if (redisCount == 1) {
            redis.expire(key, 1, TimeUnit.SECONDS);
        }
        
        // Update local cache
        if (localCount == null) {
            localCache.put(key, new AtomicInteger(redisCount.intValue()));
        } else {
            localCount.set(redisCount.intValue());
        }
        
        return redisCount <= 100;
    }
}

// Pros: Fast + scalable
// Cons: Slightly more complex
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: Twitter's "Fail Whale" (Performance Problem)**

**Problem (2008-2010):**
- Twitter frequently went down during high traffic
- Users saw the "Fail Whale" error page
- **Root cause: Performance, not scalability**

**Analysis:**
```
Issue: Inefficient Ruby on Rails code + slow MySQL queries
- Home timeline query: 10+ seconds (N+1 queries)
- Single-threaded request processing
- No caching

Misconception: "We need more servers!"
Reality: Adding servers didn't help because each request was slow
```

**Solution: Performance First**
```
Phase 1: Optimize Performance
✅ Rewrote timeline generation (10s → 100ms)
✅ Implemented caching (Memcached, Redis)
✅ Pre-computed timelines asynchronously
✅ Moved from Ruby to Scala (better concurrency)

Phase 2: Then Scale
✅ Horizontal scaling of microservices
✅ Sharded MySQL by user_id
✅ Cassandra for timeline storage
```

**Result:**
- Performance: Timeline loads in <100ms
- Scalability: Handles 400M tweets/day
- No more "Fail Whale"

**Lesson:** Performance optimization often matters more than adding servers.

---

### **Case Study 2: Stack Overflow (High Performance, Limited Scalability)**

**Strategy: Optimize performance, minimize scaling needs**

**Approach:**
```
Performance Optimizations:
✅ Aggressive caching (Redis)
✅ Optimized SQL queries (no N+1)
✅ Efficient C# code (.NET)
✅ CDN for static assets

Infrastructure:
❌ Only 9 web servers (not horizontally scaled much)
✅ 4 SQL Servers (vertically scaled)
```

**Results:**
- 1.3 billion page views/month
- Only ~9 web servers
- SQL Server with 1.5TB RAM

**Key Metrics:**
- Average page load: <50ms
- p99 latency: <200ms
- 99.99% uptime

**Lesson:** Extreme performance optimization can reduce the need for massive horizontal scaling.

---

### **Case Study 3: Amazon Prime Day (Scalability Challenge)**

**Challenge:**
- Normal: 100,000 orders/hour
- Prime Day: 5,000,000 orders/hour (50x spike)

**Approach:**

**Pre-Event Performance Optimization:**
```
✅ Optimized checkout flow (reduced latency by 40%)
✅ Database query optimization
✅ Cached product pages aggressively
```

**Scalability Preparation:**
```
✅ Pre-scaled infrastructure (10x normal capacity)
✅ Auto-scaling policies tested
✅ Sharded databases ready
✅ Load testing at 2x expected peak
```

**Architecture:**
```
[CloudFront CDN] → 99% cache hit rate (performance)
        ↓
[API Gateway] → Rate limiting (prevent abuse)
        ↓
[Load Balancers] → Multi-AZ (scalability)
        ↓
[Microservices: 1000s of containers] (scalability)
        ↓
[DynamoDB: Auto-scaled] (scalability)
[ElastiCache: Clustered] (performance)
```

**Result:**
- Handled 50x traffic spike
- No major outages
- p99 latency stayed under 500ms

**Lesson:** Large-scale events require both performance optimization AND scalability engineering.

---

### **Case Study 4: Discord (Real-Time Performance + Scalability)**

**Requirements:**
- Low latency (<50ms for messages)
- High scalability (150M monthly users)
- Real-time updates (WebSocket connections)

**Performance Optimizations:**
```
✅ Rust services for critical paths (low latency)
✅ Elixir for WebSocket handling (millions of connections)
✅ Optimized message storage (Cassandra → ScyllaDB)
✅ Regional caching (reduce latency)
```

**Scalability Strategy:**
```
✅ Sharded by "guild" (Discord server)
✅ Each guild assigned to a specific node
✅ Users in same guild → Same node (no cross-shard latency)
✅ Horizontal scaling of gateway servers
```

**Architecture:**
```
[WebSocket Gateways: 100+ nodes]
        ↓
[Message Routers: Sharded by guild]
        ↓
[ScyllaDB: 100+ nodes]
```

**Results:**
- Latency: p99 < 50ms
- Scalability: 19M concurrent users
- 99.99% uptime

**Lesson:** For real-time systems, both performance (low latency) and scalability (handle millions of connections) are critical.

---

### **Case Study 5: Shopify (Black Friday/Cyber Monday)**

**Challenge:**
- Normal: 50,000 QPS
- BFCM: 500,000 QPS (10x spike)
- Must handle flash sales (10,000 orders in 1 second)

**Performance Optimizations:**
```
✅ Aggressive caching (Redis, Memcached)
✅ Optimized checkout flow
✅ Database query optimization
✅ Background job processing (Sidekiq)
```

**Scalability Engineering:**
```
✅ Auto-scaling (Kubernetes)
✅ Sharded MySQL (by shop_id)
✅ Queue-based architecture (decouple checkout from payment)
✅ Regional deployments (multi-region)
```

**Interesting Pattern: Queue-Based Checkout**
```
User clicks "Buy" →
  ↓
Add to queue (instant response: "Processing...")
  ↓
Background workers process payment (5-10 seconds)
  ↓
User gets confirmation email

Benefit:
- User sees fast response (performance)
- System handles 10x spike (scalability)
- No lost orders (reliability)
```

**Result:**
- Handled 10x traffic spike
- No downtime
- Processed billions in sales

**Lesson:** Async processing improves both performance (fast response) and scalability (handle spikes).

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "Performance and scalability are related but distinct concepts. **Performance** is about how fast a system responds to individual requests—measured in latency and throughput. **Scalability** is about how well the system handles increased load by adding resources.
>
> A common mistake is thinking that adding more servers (scaling) fixes performance problems. If your API is slow because of an inefficient algorithm or N+1 queries, adding 10 more servers just means you have 10 servers with slow APIs. You need to optimize performance first.
>
> For example, at Twitter, the 'Fail Whale' outages weren't a scalability problem—they were a performance problem. Once they optimized their timeline generation from 10 seconds to 100ms and added caching, they could then scale horizontally with microservices.
>
> In practice, the best approach is to **optimize performance first, then scale**. For instance, if I have a slow database query taking 500ms, I'd:
> 1. Add indexing and caching to reduce it to 50ms (performance)
> 2. Then add read replicas and sharding to handle more load (scalability)
>
> At FAANG scale, you need both: Netflix optimizes video streaming for fast startup (<1 second) and scales globally to serve 200M+ subscribers."

---

### **Common Follow-Up Questions**

#### **Q1: How do you identify if a problem is performance or scalability?**

> "I look at the symptoms under different load conditions:
>
> **Performance Problem:**
> - System is slow even with 1 user
> - Latency high regardless of traffic
> - Root cause: Inefficient code, bad queries, no caching
> - Solution: Optimize algorithms, add indexes, implement caching
>
> **Scalability Problem:**
> - System fast at low load, crashes at high load
> - Errors: Out of memory, connection exhaustion, CPU at 100%
> - Root cause: Resource limits (single server, DB bottleneck)
> - Solution: Horizontal scaling, sharding, load balancing
>
> I'd use monitoring (DataDog, New Relic) to see:
> - If latency increases with load → Scalability problem
> - If latency is always high → Performance problem"

---

#### **Q2: Can you give an example where scaling made performance worse?**

> "Yes, this happens with improper microservices architecture. At a previous company, we broke a monolith into 20 microservices. Each API call now required:
> - 5 inter-service calls (network latency: 5 × 20ms = 100ms)
> - Service discovery overhead
> - Load balancer hops
>
> **Before (monolith):**
> - Latency: 50ms
> - Capacity: 5,000 QPS (single server)
>
> **After (microservices):**
> - Latency: 200ms (4x worse!)
> - Capacity: 50,000 QPS (scalable)
>
> We fixed it by:
> 1. Batching service calls (reduce round trips)
> 2. Implementing GraphQL federation (reduce over-fetching)
> 3. Adding service meshes with caching (Istio)
>
> The lesson: Scaling introduces network overhead. You need to optimize for distributed systems."

---

#### **Q3: How do you balance performance and scalability in database design?**

> "I use a hybrid approach:
>
> **Start with Performance (Single DB):**
> - Add indexes for fast queries
> - Use connection pooling
> - Implement query optimization
> - This gets you to ~10,000 QPS
>
> **Add Read Scalability (Replicas):**
> - Add 5-10 read replicas
> - Route reads to replicas, writes to master
> - This gets you to 50,000 read QPS
>
> **Add Write Scalability (Sharding):**
> - Shard by user_id or tenant_id
> - Each shard handles a subset of data
> - This gets you to 100,000+ write QPS
>
> **Key Trade-Offs:**
> - Sharding hurts performance for cross-shard queries (JOINs don't work)
> - Solution: Denormalize data or use a separate analytics DB
>
> For example, Instagram shards by user_id so a user's photos, posts, and followers are on the same shard—this keeps queries fast while scaling."

---

#### **Q4: What's your approach to capacity planning?**

> "I follow a three-step process:
>
> **Step 1: Estimate Traffic**
> - Calculate average and peak QPS
> - Example: 10M DAU × 50 requests/day = 5,800 QPS average, 15,000 QPS peak
>
> **Step 2: Optimize Performance**
> - Target latency: p99 < 200ms
> - Use caching, indexing, CDN
> - This reduces resource needs
>
> **Step 3: Scale for Capacity**
> - Each optimized server: 1,000 QPS
> - Need 15 servers for peak, add 30% buffer → 20 servers
> - Distribute across 2 AZs → 40 servers total
>
> **Monitor and Adjust:**
> - Auto-scaling: Add servers if CPU > 70%
> - Cost optimization: Remove servers if CPU < 30%
>
> I'd rather over-provision by 30% than risk an outage during unexpected spikes."

---

#### **Q5: Have you ever had to choose between performance and scalability?**

> "Yes, when designing a real-time analytics dashboard:
>
> **Option 1: High Performance, Low Scalability**
> - Pre-aggregate data in PostgreSQL
> - Materialized views for instant queries (<10ms)
> - But: Limited to 10K events/second (single DB)
>
> **Option 2: High Scalability, Lower Performance**
> - Stream events to Kafka + Cassandra
> - Aggregate on read (500ms latency)
> - Can handle 1M events/second
>
> **We chose a hybrid:**
> - Kafka + Cassandra for ingestion (scalability)
> - Pre-aggregate in Spark every 5 minutes
> - Store aggregates in Redis (performance)
> - Result: 50ms query latency, 500K events/sec capacity
>
> The lesson: You rarely have to fully sacrifice one for the other—there's usually a middle ground."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Performance vs Scalability: Decision Tree**

```
Problem: System is struggling
        |
        ├─ Is latency high with LOW load?
        │  YES → Performance Problem
        │        ↓
        │        ├─ Profile code (find bottlenecks)
        │        ├─ Optimize queries (add indexes)
        │        ├─ Add caching (Redis, CDN)
        │        └─ Fix algorithm (O(n²) → O(n))
        │
        └─ Is system crashing under HIGH load?
           YES → Scalability Problem
                 ↓
                 ├─ Horizontal scaling (add servers)
                 ├─ Database read replicas
                 ├─ Sharding (distribute data)
                 └─ Load balancing
```

---

### **Optimization Order**

```
STEP 1: Optimize Performance (Low-Hanging Fruit)
═══════════════════════════════════════════════
✅ Add database indexes (10x faster queries)
✅ Implement caching (100x faster reads)
✅ Fix N+1 queries (50x fewer DB calls)
✅ Use CDN for static assets (reduce server load)

Cost: $0 (just code changes)
Impact: 10-100x improvement

STEP 2: Vertical Scaling (Easy Scalability)
═══════════════════════════════════════════════
✅ Upgrade to bigger server (2x-4x capacity)

Cost: $200/month → $500/month
Impact: 2-4x capacity

STEP 3: Horizontal Scaling (Unlimited Growth)
═══════════════════════════════════════════════
✅ Add load balancer + multiple servers
✅ Stateless architecture
✅ Database read replicas

Cost: $500/month → $2,000/month
Impact: 10x capacity, fault-tolerant

STEP 4: Advanced Scaling (FAANG Level)
═══════════════════════════════════════════════
✅ Database sharding
✅ Microservices
✅ Multi-region deployment

Cost: $2,000/month → $10,000+/month
Impact: Unlimited scale
```

---

### **Sample Architecture Evolution**

```
PHASE 1: Startup (0-10K Users)
══════════════════════════════
┌─────────────────┐
│   Monolith App  │ ← Performance: Fast (single-process calls)
│       +         │    Scalability: Low (single server)
│   PostgreSQL    │
└─────────────────┘
Cost: $100/month


PHASE 2: Growth (10K-100K Users)
══════════════════════════════
        ┌──────────────┐
        │  App Server  │ ← Performance: Optimized (caching, indexes)
        └──────────────┘    Scalability: Medium (vertical scaling)
              ↓
        ┌──────────────┐
        │  PostgreSQL  │ (Bigger instance: 16 cores, 128GB)
        └──────────────┘
Cost: $500/month


PHASE 3: Scale (100K-1M Users)
══════════════════════════════
    ┌──────────────┐
    │Load Balancer │
    └──────────────┘
       /    |    \
   [App] [App] [App]  ← Scalability: High (horizontal)
       \    |    /
    ┌──────────────┐
    │    Redis     │   ← Performance: Cache (99% hit rate)
    └──────────────┘
            ↓
    ┌──────────────┐
    │   Master DB  │
    └──────────────┘
       /    |    \
   [Replica][Replica][Replica]  ← Scalability: Read scaling
Cost: $2,000/month


PHASE 4: FAANG Scale (1M+ Users)
══════════════════════════════
    ┌───────────────────┐
    │   API Gateway     │  ← Performance: Caching, rate limiting
    └───────────────────┘
            ↓
    ┌───────────────────┐
    │  Load Balancer    │
    └───────────────────┘
       /    |    |    \
  [Service A] [Service B] [Service C] [Service D]  ← Scalability: Microservices
     |          |           |           |
  [Cache]    [Cache]     [Cache]     [Cache]       ← Performance: Distributed cache
     |          |           |           |
  [Shard 1]  [Shard 2]  [Shard 3]  [Shard 4]      ← Scalability: Sharded DBs
Cost: $10,000+/month
```

---

### **Code Example: Before and After Optimization**

```java
// ❌ BEFORE: Poor Performance, Poor Scalability
@GetMapping("/users/{id}/dashboard")
public DashboardDTO getUserDashboard(@PathVariable Long id) {
    User user = userRepository.findById(id).orElseThrow();
    
    // N+1 query: 100 posts = 100 DB queries
    List<Post> posts = postRepository.findByUserId(id);
    List<PostDTO> postDTOs = new ArrayList<>();
    for (Post post : posts) {
        Author author = authorRepository.findById(post.getAuthorId());
        postDTOs.add(new PostDTO(post, author));
    }
    
    // Another query for each follower
    List<User> followers = followerRepository.findByUserId(id);
    
    // No caching: Every request hits DB
    return new DashboardDTO(user, postDTOs, followers);
}

// Performance: 500ms (100+ DB queries)
// Scalability: Max 200 QPS per server


// ✅ AFTER: High Performance, High Scalability
@GetMapping("/users/{id}/dashboard")
@Cacheable(value = "dashboards", key = "#id")  // ← Performance: Cache
public DashboardDTO getUserDashboard(@PathVariable Long id) {
    // Single query with JOIN
    User user = userRepository.findByIdWithDetails(id);
    
    // Batch query: 1 DB query instead of 100
    List<Post> posts = postRepository.findByUserIdWithAuthors(id);
    List<PostDTO> postDTOs = posts.stream()
        .map(post -> new PostDTO(post, post.getAuthor()))
        .collect(Collectors.toList());
    
    // Cached follower count (not full list)
    Long followerCount = followerService.getFollowerCount(id);
    
    return new DashboardDTO(user, postDTOs, followerCount);
}

// Performance: 20ms (2-3 DB queries, 99% cache hit rate)
// Scalability: Max 5,000 QPS per server (25x improvement!)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Business Impact:**
- **Performance:** Fast systems = happy users = higher conversion
  - Amazon: 100ms latency increase = 1% sales decrease
  - Google: 500ms delay = 20% traffic drop
  
- **Scalability:** Handle growth = capture market share
  - Can't scale = lose to competitors during viral growth
  - Over-scale = waste money on unused servers

**User Experience:**
- **Performance:** Users expect <200ms response times
- **Scalability:** Users expect 99.9%+ uptime during peak times

**Cost:**
- **Performance optimization:** Reduces infrastructure costs (fewer servers needed)
- **Scalability engineering:** Enables linear cost growth (not exponential)

---

### **How It Works (Simple Summary)**

#### **Performance Optimization:**
1. **Measure:** Profile code, identify bottlenecks
2. **Optimize:** Fix algorithms, add caching, optimize queries
3. **Validate:** Measure latency improvements (p50, p99)

#### **Scalability Engineering:**
1. **Estimate:** Calculate traffic (QPS, data growth)
2. **Design:** Stateless services, sharding, replication
3. **Scale:** Add servers, auto-scaling policies
4. **Monitor:** Track throughput, efficiency, costs

---

### **Key Trade-Offs to Remember**

| **Aspect**            | **Performance Focus**                   | **Scalability Focus**                  |
|-----------------------|-----------------------------------------|----------------------------------------|
| **Priority**          | Reduce latency                          | Handle more load                       |
| **Techniques**        | Caching, indexing, algorithms           | Horizontal scaling, sharding           |
| **Complexity**        | Low (single server optimizations)       | High (distributed systems)             |
| **Cost**              | Low (code changes)                      | Higher (more infrastructure)           |
| **When to Focus**     | Early stage, low traffic                | Growth stage, traffic spikes           |
| **Mistake**           | Over-optimization (premature)           | Scaling without optimizing             |

---

### **Decision Framework**

```
┌─────────────────────────────────────────────┐
│ Is your system slow with 1 user?            │
│ YES → Optimize Performance First            │
│       (Caching, indexing, better algorithms)│
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Does your system crash at high load?        │
│ YES → Scale Horizontally                    │
│       (Load balancers, replicas, sharding)  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Continuously monitor and optimize both      │
│ Performance: Keep p99 latency < 200ms       │
│ Scalability: Handle 10x current traffic     │
└─────────────────────────────────────────────┘
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Understand the Difference**
- Performance = speed per request
- Scalability = handling more requests

✅ **Optimize First, Scale Second**
- Don't add servers to fix slow code
- Optimize performance, then scale horizontally

✅ **Use Real Examples**
- "Twitter's Fail Whale was a performance problem..."
- "Amazon Prime Day required both performance and scalability..."

✅ **Address Both in System Design**
- "I'd optimize with caching (performance) and add read replicas (scalability)"

✅ **Know the Tools**
- Performance: Caching (Redis), CDN, indexing, profiling
- Scalability: Load balancers, sharding, microservices, auto-scaling

✅ **Think in Terms of Cost**
- "Optimizing performance reduced our server needs from 20 to 5..."
- "Scaling horizontally kept our cost per user constant as we grew 10x..."

**The best systems are both fast AND scalable.** FAANG engineers master both disciplines to build systems that serve billions of users with low latency.

---

**End of Topic 11: Performance vs Scalability**
