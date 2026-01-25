# 15. Availability Patterns

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Availability Patterns** are architectural strategies designed to **maximize uptime** and **minimize downtime** in distributed systems. They define how systems handle failures, route traffic, and recover from outages to maintain continuous service availability.

### **What They Are**

Availability patterns are **proven architectural blueprints** for building highly available systems. They address the fundamental question: **"What happens when a component fails?"**

**Core Patterns:**
1. **Active-Passive (Failover):** One active instance, one standby
2. **Active-Active (Load Balancing):** Multiple active instances serving traffic
3. **Multi-Region (Geo-Redundancy):** Deploy across geographic regions
4. **Circuit Breaker:** Prevent cascading failures
5. **Bulkhead:** Isolate failures to specific components
6. **Graceful Degradation:** Reduce functionality under stress
7. **Health Checks:** Monitor and route traffic to healthy instances

---

### **Why They Exist**

**The Problem: Components Fail**

```
Reality of distributed systems:
- Servers crash (hardware failure)
- Networks partition (cable cut)
- Databases lock up (deadlock)
- Cloud regions go down (AWS/Azure outages)
- Software bugs cause crashes
- Deployments introduce issues
```

**Without availability patterns:**
```
Component fails → Entire system down → Users blocked → Revenue lost
```

**With availability patterns:**
```
Component fails → Traffic rerouted → System stays up → Users happy
```

---

### **Where and When Used**

**Mission-Critical Systems (Five Nines: 99.999%)**
- Financial systems (trading, banking)
- Payment processing (Stripe, PayPal)
- Healthcare systems (patient records)
- E-911 emergency services
- Air traffic control

**Business-Critical Systems (Four Nines: 99.99%)**
- E-commerce platforms (Amazon, Shopify)
- SaaS applications (Salesforce, Slack)
- Cloud infrastructure (AWS, Azure, GCP)
- Social media (Facebook, Twitter)

**Standard Systems (Three Nines: 99.9%)**
- Corporate websites
- Internal tools
- Blogs and content sites

---

### **The Business Impact**

**Downtime Costs:**

| **Company** | **Revenue/Hour** | **1 Hour Downtime Cost** | **Target Availability** |
|-------------|------------------|--------------------------|-------------------------|
| **Amazon** | $13.2M | $13.2M | 99.99% |
| **Google** | $6.5M | $6.5M | 99.99% |
| **Facebook** | $2M | $2M | 99.95% |
| **Shopify** | $500K | $500K | 99.95% |

**Availability SLA Examples:**

```
99.9% (Three Nines):
- Downtime: 43.8 minutes/month
- Acceptable for: Internal tools, blogs
- Cost: $

99.95% (Four Nines - 0.05% down):
- Downtime: 21.6 minutes/month
- Acceptable for: E-commerce, SaaS
- Cost: $$

99.99% (Four Nines):
- Downtime: 4.38 minutes/month
- Acceptable for: Payments, critical services
- Cost: $$$

99.999% (Five Nines):
- Downtime: 26 seconds/month
- Acceptable for: Financial trading, healthcare
- Cost: $$$$
```

---

### **Role in Large-Scale Distributed Systems**

At FAANG scale, availability patterns are **mandatory**, not optional:

**Google Search:**
- Pattern: Multi-region active-active
- Availability: 99.99%
- Strategy: If one data center fails, traffic instantly rerouted to others
- Result: Users never notice failures

**Netflix:**
- Pattern: Active-active across 3 AWS regions
- Availability: 99.99%
- Strategy: Chaos Monkey randomly terminates servers to test resilience
- Result: Survived multiple AWS region outages

**Stripe:**
- Pattern: Multi-region active-active + circuit breakers
- Availability: 99.999% (five nines)
- Strategy: Each region can process payments independently
- Result: Financial operations never interrupted

**Facebook:**
- Pattern: Active-active data centers + traffic shifting
- Availability: 99.95%
- Strategy: Shift traffic away from degraded data centers
- Result: Billions of users served continuously

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Pattern 1: Active-Passive (Failover)**

#### **Architecture**

```
                    ┌──────────────────┐
                    │  Load Balancer   │
                    │  (Health Checks) │
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                ↓                         ↓
        ┌───────────────┐         ┌───────────────┐
        │ PRIMARY Server│ ← - - - │ STANDBY Server│
        │   (Active)    │ Heartbeat│  (Passive)   │
        │               │         │ (Ready, Idle) │
        └───────┬───────┘         └───────────────┘
                │
                ↓
        ┌───────────────┐
        │   Database    │
        └───────────────┘

Normal Operation:
- Primary handles ALL traffic
- Standby sits idle, waiting
- Heartbeat monitors primary health

Failure Scenario:
- Primary fails → Health check detects (5-30 seconds)
- Load balancer routes traffic to standby
- Standby becomes new primary
- Downtime: 30-60 seconds (health check + DNS)
```

---

#### **Implementation: Spring Boot + Kubernetes**

**Health Check Endpoint:**
```java
@RestController
public class HealthCheckController {
    
    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private RedisTemplate<String, String> redis;
    
    @Value("${server.role}")
    private String serverRole;  // "primary" or "standby"
    
    @GetMapping("/health")
    public ResponseEntity<HealthStatus> health() {
        HealthStatus status = new HealthStatus();
        status.setRole(serverRole);
        
        // Check database connectivity
        try (Connection conn = dataSource.getConnection()) {
            status.setDatabase("UP");
        } catch (SQLException e) {
            log.error("Database health check failed", e);
            status.setDatabase("DOWN");
            return ResponseEntity.status(503).body(status);  // Unhealthy
        }
        
        // Check Redis connectivity
        try {
            redis.opsForValue().get("health-check");
            status.setCache("UP");
        } catch (Exception e) {
            log.error("Redis health check failed", e);
            status.setCache("DOWN");
            return ResponseEntity.status(503).body(status);  // Unhealthy
        }
        
        // Primary-specific checks
        if ("primary".equals(serverRole)) {
            // Check if handling traffic
            long activeConnections = getActiveConnections();
            if (activeConnections == 0) {
                log.warn("Primary server has no active connections");
                return ResponseEntity.status(503).body(status);
            }
            status.setActiveConnections(activeConnections);
        }
        
        return ResponseEntity.ok(status);
    }
}

@Data
class HealthStatus {
    private String role;
    private String database;
    private String cache;
    private long activeConnections;
}
```

**Kubernetes Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-primary
spec:
  replicas: 1  # Only 1 primary
  selector:
    matchLabels:
      app: api
      role: primary
  template:
    metadata:
      labels:
        app: api
        role: primary
    spec:
      containers:
        - name: api
          image: company/api:v1.0
          env:
            - name: SERVER_ROLE
              value: "primary"
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5       # Check every 5 seconds
            failureThreshold: 3    # 3 failures = unhealthy (15 seconds)
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-standby
spec:
  replicas: 1  # Only 1 standby
  selector:
    matchLabels:
      app: api
      role: standby
  template:
    metadata:
      labels:
        app: api
        role: standby
    spec:
      containers:
        - name: api
          image: company/api:v1.0
          env:
            - name: SERVER_ROLE
              value: "standby"
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3

---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080

# Traffic routing:
# - Normal: Primary receives all traffic (standby filtered by readiness)
# - Failure: Primary fails health check → Standby receives traffic
```

---

#### **Trade-Offs: Active-Passive**

| **Aspect** | **Active-Passive** |
|------------|-------------------|
| **Cost** | ⚠️ Medium (standby idle, 50% utilization) |
| **Complexity** | ✅ Low (simple setup) |
| **Failover Time** | ⚠️ 30-60 seconds (health check + routing) |
| **Capacity** | ⚠️ Half (standby idle) |
| **Data Consistency** | ✅ Strong (single writer) |
| **Use Case** | Stateful applications, databases |

---

### **Pattern 2: Active-Active (Load Balancing)**

#### **Architecture**

```
                    ┌──────────────────┐
                    │  Load Balancer   │
                    │  (Round Robin)   │
                    └────────┬─────────┘
                             │
                ┌────────────┼────────────┐
                ↓            ↓            ↓
        ┌───────────┐ ┌───────────┐ ┌───────────┐
        │ Server 1  │ │ Server 2  │ │ Server 3  │
        │ (Active)  │ │ (Active)  │ │ (Active)  │
        │ 33% load  │ │ 33% load  │ │ 33% load  │
        └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
              │             │             │
              └─────────────┼─────────────┘
                            ↓
                    ┌───────────────┐
                    │   Database    │
                    └───────────────┘

Normal Operation:
- All servers handle traffic (load distributed)
- Load balancer uses algorithm (round robin, least conn)
- High resource utilization (3x capacity)

Failure Scenario:
- Server 2 fails → Health check detects (5 seconds)
- Load balancer removes from pool
- Remaining servers handle load (50% each)
- Downtime: 0 seconds (instant rerouting)
- Capacity: Reduced to 66%
```

---

#### **Implementation: Stateless Services**

**Requirement:** Services must be **stateless** for active-active to work.

**Stateless Service (Good for Active-Active):**
```java
@RestController
public class ProductController {
    
    @Autowired
    private ProductRepository repository;
    
    @Autowired
    private RedisTemplate<String, Product> cache;
    
    @GetMapping("/products/{id}")
    public Product getProduct(@PathVariable Long id) {
        // Check cache (shared across all instances)
        Product product = cache.opsForValue().get("product:" + id);
        if (product != null) {
            return product;
        }
        
        // Fetch from database (shared state)
        product = repository.findById(id).orElseThrow();
        
        // Cache for future requests
        cache.opsForValue().set("product:" + id, product, 1, TimeUnit.HOURS);
        
        return product;
    }
}

// Key: No local state
// - Cache is shared (Redis)
// - Database is shared (PostgreSQL)
// - Request can be handled by any server
```

**Session Management (Redis for Shared State):**
```java
@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 3600)
public class SessionConfig {
    
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        // Redis Cluster for high availability
        RedisClusterConfiguration clusterConfig = new RedisClusterConfiguration();
        clusterConfig.addClusterNode(new RedisNode("redis1", 6379));
        clusterConfig.addClusterNode(new RedisNode("redis2", 6379));
        clusterConfig.addClusterNode(new RedisNode("redis3", 6379));
        
        return new LettuceConnectionFactory(clusterConfig);
    }
}

@RestController
public class AuthController {
    
    @PostMapping("/login")
    public ResponseEntity<String> login(@RequestBody LoginRequest request, 
                                        HttpSession session) {
        // Authenticate user
        User user = authService.authenticate(request.getUsername(), request.getPassword());
        
        // Store in session (persisted to Redis)
        session.setAttribute("userId", user.getId());
        session.setAttribute("username", user.getUsername());
        
        return ResponseEntity.ok("Logged in");
    }
    
    @GetMapping("/profile")
    public User getProfile(HttpSession session) {
        // Session retrieved from Redis (works on any server)
        Long userId = (Long) session.getAttribute("userId");
        return userService.getUser(userId);
    }
}

// Result: User can hit any server, session always available
```

**Kubernetes Deployment (Active-Active):**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 3  # 3 active instances
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: company/api:v1.0
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 2
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3

---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080
  sessionAffinity: None  # No sticky sessions (stateless)

---
# Horizontal Pod Autoscaler (auto-scale based on load)
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale when CPU > 70%
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80  # Scale when memory > 80%

# Result:
# - 3 servers minimum (high availability)
# - Auto-scale to 10 under load
# - If one fails: Traffic distributed to others (0 downtime)
```

---

#### **Trade-Offs: Active-Active**

| **Aspect** | **Active-Active** |
|------------|-------------------|
| **Cost** | ✅ Low (100% utilization) |
| **Complexity** | ⚠️ Medium (stateless requirement) |
| **Failover Time** | ✅ 0 seconds (instant) |
| **Capacity** | ✅ Full (all servers active) |
| **Data Consistency** | ⚠️ Eventual (multiple writers) |
| **Use Case** | Stateless APIs, web servers |

---

### **Pattern 3: Multi-Region (Geo-Redundancy)**

#### **Architecture**

```
                    ┌──────────────────────┐
                    │  Global Load Balancer│
                    │  (Route 53 / Cloudflare)│
                    └──────────┬────────────┘
                               │
                ┌──────────────┼──────────────┐
                ↓              ↓              ↓
        ┏━━━━━━━━━━━┓   ┏━━━━━━━━━━━┓   ┏━━━━━━━━━━━┓
        ┃ US-EAST-1 ┃   ┃ EU-WEST-1 ┃   ┃ AP-SOUTH-1┃
        ┃           ┃   ┃           ┃   ┃           ┃
        ┃ Full Stack┃   ┃ Full Stack┃   ┃ Full Stack┃
        ┃ - API     ┃   ┃ - API     ┃   ┃ - API     ┃
        ┃ - DB      ┃   ┃ - DB      ┃   ┃ - DB      ┃
        ┃ - Cache   ┃   ┃ - Cache   ┃   ┃ - Cache   ┃
        ┗━━━━━┯━━━━━┛   ┗━━━━━┯━━━━━┛   ┗━━━━━┯━━━━━┛
              │                │                │
              └────────────────┴────────────────┘
                               │
                    Cross-region replication

Routing Strategy:
- Latency-based: Route to nearest region
- Failover: If region fails, route to next nearest
- Weighted: 50% US, 30% EU, 20% AP (traffic distribution)

Benefits:
- Survive entire region failure
- Lower latency (proximity)
- Regulatory compliance (data locality)
```

---

#### **Implementation: AWS Multi-Region**

**Route 53 Latency-Based Routing:**
```json
{
  "HostedZoneId": "Z123456ABCDEFG",
  "ChangeBatch": {
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "SetIdentifier": "US-EAST-1",
          "Region": "us-east-1",
          "AliasTarget": {
            "HostedZoneId": "Z1234567890ABC",
            "DNSName": "api-us-east-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "SetIdentifier": "EU-WEST-1",
          "Region": "eu-west-1",
          "AliasTarget": {
            "HostedZoneId": "Z0987654321ZYX",
            "DNSName": "api-eu-west-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "api.example.com",
          "Type": "A",
          "SetIdentifier": "AP-SOUTH-1",
          "Region": "ap-south-1",
          "AliasTarget": {
            "HostedZoneId": "ZXXXYYYYZZZ123",
            "DNSName": "api-ap-south-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }
}

// Route 53 routing logic:
// 1. User in New York → US-EAST-1 (lowest latency)
// 2. User in London → EU-WEST-1 (lowest latency)
// 3. User in Mumbai → AP-SOUTH-1 (lowest latency)
// 4. If US-EAST-1 unhealthy → Route to EU-WEST-1
```

**Database Replication (Multi-Region):**
```java
@Configuration
public class MultiRegionDataSourceConfig {
    
    @Bean
    @Primary
    public DataSource primaryDataSource() {
        // Local region database (write)
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://db-us-east-1:5432/app");
        config.setUsername("app");
        config.setPassword(System.getenv("DB_PASSWORD"));
        config.setMaximumPoolSize(50);
        return new HikariDataSource(config);
    }
    
    @Bean
    public DataSource replicaDataSource() {
        // Cross-region replica (read)
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://db-eu-west-1:5432/app");
        config.setUsername("app");
        config.setPassword(System.getenv("DB_PASSWORD"));
        config.setMaximumPoolSize(50);
        config.setReadOnly(true);
        return new HikariDataSource(config);
    }
}

@Service
public class UserService {
    @Autowired
    @Qualifier("primaryDataSource")
    private DataSource primaryDataSource;
    
    @Autowired
    @Qualifier("replicaDataSource")
    private DataSource replicaDataSource;
    
    @Transactional
    public void createUser(User user) {
        // Write to local region (primary)
        jdbcTemplate.update("INSERT INTO users (name, email) VALUES (?, ?)",
            user.getName(), user.getEmail());
        
        // Replication happens asynchronously to other regions
    }
    
    @Transactional(readOnly = true)
    public User getUser(Long userId) {
        // Read from local region (could be replica)
        return jdbcTemplate.queryForObject(
            "SELECT * FROM users WHERE id = ?",
            new Object[]{userId},
            (rs, rowNum) -> new User(rs.getLong("id"), rs.getString("name"), rs.getString("email"))
        );
    }
}

// AWS DMS (Database Migration Service) for replication:
// - Continuous replication from us-east-1 → eu-west-1
// - Replication lag: 1-5 seconds (eventual consistency)
// - If us-east-1 fails: Promote eu-west-1 to primary
```

---

#### **Trade-Offs: Multi-Region**

| **Aspect** | **Multi-Region** |
|------------|-------------------|
| **Cost** | ❌ High (3x infrastructure) |
| **Complexity** | ❌ High (data sync, networking) |
| **Failover Time** | ✅ 0-60 seconds (DNS propagation) |
| **Capacity** | ✅ High (3 independent regions) |
| **Data Consistency** | ⚠️ Eventual (cross-region lag) |
| **Use Case** | Global apps, mission-critical |

---

### **Pattern 4: Circuit Breaker**

#### **Architecture**

```
CIRCUIT BREAKER STATE MACHINE
══════════════════════════════

         ┌─────────────┐
         │   CLOSED    │  (Normal operation)
         │ (Requests   │
         │  flowing)   │
         └──────┬──────┘
                │
                │ Failure rate > threshold
                ↓
         ┌─────────────┐
         │    OPEN     │  (Block all requests)
         │ (Fail fast) │
         └──────┬──────┘
                │
                │ After timeout (30s)
                ↓
         ┌─────────────┐
         │ HALF-OPEN   │  (Test with few requests)
         │ (Trying...)  │
         └──────┬──────┘
                │
      ┌─────────┴─────────┐
      │                   │
    Success             Failure
      │                   │
      ↓                   ↓
   CLOSED               OPEN
```

---

#### **Implementation: Resilience4j**

```java
@Configuration
public class CircuitBreakerConfig {
    
    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            // Open circuit if 50% of requests fail
            .failureRateThreshold(50)
            
            // Open circuit if 50% of requests are slow (>1s)
            .slowCallRateThreshold(50)
            .slowCallDurationThreshold(Duration.ofSeconds(1))
            
            // Stay open for 30 seconds before trying again
            .waitDurationInOpenState(Duration.ofSeconds(30))
            
            // Test with 10 requests in half-open state
            .permittedNumberOfCallsInHalfOpenState(10)
            
            // Use last 100 calls to calculate failure rate
            .slidingWindowSize(100)
            .slidingWindowType(SlidingWindowType.COUNT_BASED)
            
            .build();
        
        return CircuitBreakerRegistry.of(config);
    }
}

@Service
public class PaymentService {
    
    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;
    
    @Autowired
    private PaymentGateway paymentGateway;
    
    public PaymentResponse processPayment(PaymentRequest request) {
        CircuitBreaker circuitBreaker = circuitBreakerRegistry
            .circuitBreaker("payment-gateway");
        
        // Wrap call in circuit breaker
        return circuitBreaker.executeSupplier(() -> {
            try {
                return paymentGateway.charge(request);
            } catch (PaymentGatewayException e) {
                // Circuit breaker tracks failures
                throw e;
            }
        });
    }
    
    @Recover
    public PaymentResponse fallback(PaymentRequest request, CircuitBreakerOpenException e) {
        log.warn("Circuit breaker open for payment gateway, queueing request");
        
        // Fallback: Queue for later processing
        kafka.send("payment-retry-topic", request);
        
        return PaymentResponse.builder()
            .status("PENDING")
            .message("Payment processing, you'll receive confirmation shortly")
            .build();
    }
}

// Circuit breaker lifecycle:
// 1. Normal: All requests pass through (CLOSED)
// 2. Failures: If 50 of 100 requests fail → OPEN
// 3. Open: All requests fail fast (no calls to gateway)
// 4. After 30s: Try 10 requests (HALF-OPEN)
// 5. If successful: Back to CLOSED
// 6. If fail: Back to OPEN
```

**Monitoring Circuit Breaker:**
```java
@Component
public class CircuitBreakerEventListener {
    
    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;
    
    @PostConstruct
    public void registerEventListeners() {
        circuitBreakerRegistry.getAllCircuitBreakers().forEach(circuitBreaker -> {
            
            circuitBreaker.getEventPublisher()
                .onStateTransition(event -> {
                    log.warn("Circuit breaker state changed: {} → {}",
                        event.getStateTransition().getFromState(),
                        event.getStateTransition().getToState());
                    
                    if (event.getStateTransition().getToState() == State.OPEN) {
                        alertService.sendAlert("Circuit breaker OPEN: " + circuitBreaker.getName());
                    }
                });
            
            circuitBreaker.getEventPublisher()
                .onError(event -> {
                    log.error("Circuit breaker error: {}", event.getThrowable().getMessage());
                });
        });
    }
}
```

---

### **Pattern 5: Bulkhead (Failure Isolation)**

#### **Architecture**

```
WITHOUT BULKHEAD (Bad)
═══════════════════════

[Thread Pool: 100 threads]
  ├── Service A calls (slow, consuming 80 threads)
  ├── Service B calls (normal, needs 20 threads)
  └── Service C calls (BLOCKED! No threads available)

Result: Service A failure affects Service B & C


WITH BULKHEAD (Good)
═════════════════════

[Service A Pool: 40 threads]
  └── Service A calls (slow, consuming 40/40)
      Status: SATURATED (but isolated)

[Service B Pool: 30 threads]
  └── Service B calls (normal, using 15/30)
      Status: HEALTHY

[Service C Pool: 30 threads]
  └── Service C calls (normal, using 10/30)
      Status: HEALTHY

Result: Service A failure DOES NOT affect Service B & C
```

---

#### **Implementation: Thread Pool Isolation**

```java
@Configuration
public class BulkheadConfig {
    
    @Bean
    public ThreadPoolBulkheadRegistry bulkheadRegistry() {
        return ThreadPoolBulkheadRegistry.ofDefaults();
    }
    
    @Bean
    public ThreadPoolExecutor serviceAExecutor() {
        return new ThreadPoolExecutor(
            10,      // Core threads
            40,      // Max threads
            60,      // Keep alive (seconds)
            TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(100)  // Queue size
        );
    }
    
    @Bean
    public ThreadPoolExecutor serviceBExecutor() {
        return new ThreadPoolExecutor(
            10,
            30,
            60,
            TimeUnit.SECONDS,
            new LinkedBlockingQueue<>(100)
        );
    }
}

@Service
public class ExternalServiceClient {
    
    @Autowired
    @Qualifier("serviceAExecutor")
    private ThreadPoolExecutor serviceAExecutor;
    
    @Autowired
    @Qualifier("serviceBExecutor")
    private ThreadPoolExecutor serviceBExecutor;
    
    // Service A (isolated thread pool)
    @Bulkhead(name = "serviceA", type = Bulkhead.Type.THREADPOOL)
    public CompletableFuture<Response> callServiceA(Request request) {
        return CompletableFuture.supplyAsync(() -> {
            return serviceAClient.call(request);
        }, serviceAExecutor);
    }
    
    // Service B (separate isolated thread pool)
    @Bulkhead(name = "serviceB", type = Bulkhead.Type.THREADPOOL)
    public CompletableFuture<Response> callServiceB(Request request) {
        return CompletableFuture.supplyAsync(() -> {
            return serviceBClient.call(request);
        }, serviceBExecutor);
    }
}

// Monitoring
@Component
public class BulkheadMonitor {
    
    @Scheduled(fixedRate = 10000)  // Every 10 seconds
    public void monitorPools() {
        ThreadPoolExecutor poolA = (ThreadPoolExecutor) serviceAExecutor;
        ThreadPoolExecutor poolB = (ThreadPoolExecutor) serviceBExecutor;
        
        log.info("Service A Pool: active={}, queue={}, completed={}",
            poolA.getActiveCount(),
            poolA.getQueue().size(),
            poolA.getCompletedTaskCount());
        
        log.info("Service B Pool: active={}, queue={}, completed={}",
            poolB.getActiveCount(),
            poolB.getQueue().size(),
            poolB.getCompletedTaskCount());
        
        // Alert if pool saturated
        if (poolA.getActiveCount() >= poolA.getMaximumPoolSize() * 0.9) {
            alertService.sendAlert("Service A thread pool 90% saturated");
        }
    }
}
```

---

### **Pattern 6: Graceful Degradation**

#### **Implementation**

```java
@Service
public class ProductRecommendationService {
    
    @Autowired
    private MLRecommendationService mlService;
    
    @Autowired
    private TrendingProductService trendingService;
    
    @Autowired
    private RedisTemplate<String, List<Product>> cache;
    
    @Autowired
    private SystemHealthChecker healthChecker;
    
    public List<Product> getRecommendations(Long userId) {
        SystemHealth health = healthChecker.getHealth();
        
        // Level 1: Full experience (ML-based personalization)
        if (health.isHealthy() && health.getLoadPercent() < 70) {
            try {
                return mlService.getPersonalizedRecommendations(userId);
            } catch (MLServiceException e) {
                log.warn("ML service unavailable, degrading to Level 2", e);
                metrics.recordDegradation("ml_service");
            }
        }
        
        // Level 2: Degraded (trending products)
        if (health.getLoadPercent() < 85) {
            try {
                return trendingService.getTrendingProducts();
            } catch (TrendingServiceException e) {
                log.warn("Trending service unavailable, degrading to Level 3", e);
                metrics.recordDegradation("trending_service");
            }
        }
        
        // Level 3: Minimal (cached popular products)
        try {
            List<Product> popular = cache.opsForValue().get("popular-products");
            if (popular != null) {
                return popular;
            }
        } catch (Exception e) {
            log.warn("Cache unavailable, degrading to Level 4", e);
            metrics.recordDegradation("cache");
        }
        
        // Level 4: Emergency (hardcoded fallback)
        log.error("All recommendation services down, returning fallback");
        metrics.recordDegradation("all_services");
        return getHardcodedFallback();
    }
    
    private List<Product> getHardcodedFallback() {
        // Return bestsellers (statically configured)
        return Arrays.asList(
            new Product(1L, "iPhone 15", 999.99),
            new Product(2L, "MacBook Pro", 1999.99),
            new Product(3L, "AirPods Pro", 249.99)
        );
    }
}

// Result:
// - Normal: Full ML-powered recommendations
// - Under load: Trending products
// - High load: Cached popular products
// - Emergency: Hardcoded bestsellers
// - System always responds (availability maintained)
```

---

### **Pattern 7: Health Checks (Proactive Monitoring)**

#### **Comprehensive Health Check**

```java
@RestController
public class HealthCheckController {
    
    @GetMapping("/health")
    public ResponseEntity<HealthStatus> health() {
        HealthStatus status = new HealthStatus();
        status.setTimestamp(Instant.now());
        status.setOverallStatus("UP");
        
        // Check all dependencies
        checkDatabase(status);
        checkCache(status);
        checkMessageQueue(status);
        checkDiskSpace(status);
        checkMemory(status);
        
        // Aggregate status
        if (!status.isHealthy()) {
            return ResponseEntity.status(503).body(status);
        }
        
        return ResponseEntity.ok(status);
    }
    
    private void checkDatabase(HealthStatus status) {
        try {
            long start = System.currentTimeMillis();
            dataSource.getConnection().close();
            long latency = System.currentTimeMillis() - start;
            
            if (latency > 1000) {
                status.setDatabase("SLOW");
                status.setDatabaseLatency(latency);
                status.setOverallStatus("DEGRADED");
            } else {
                status.setDatabase("UP");
                status.setDatabaseLatency(latency);
            }
        } catch (Exception e) {
            status.setDatabase("DOWN");
            status.setDatabaseError(e.getMessage());
            status.setOverallStatus("DOWN");
            status.setHealthy(false);
        }
    }
    
    private void checkCache(HealthStatus status) {
        try {
            long start = System.currentTimeMillis();
            redis.opsForValue().get("health-check");
            long latency = System.currentTimeMillis() - start;
            
            status.setCache("UP");
            status.setCacheLatency(latency);
        } catch (Exception e) {
            // Cache failure is non-critical (degrade gracefully)
            status.setCache("DOWN");
            status.setCacheError(e.getMessage());
            status.setOverallStatus("DEGRADED");
        }
    }
    
    private void checkDiskSpace(HealthStatus status) {
        File root = new File("/");
        long freeSpace = root.getFreeSpace();
        long totalSpace = root.getTotalSpace();
        double freePercent = (freeSpace * 100.0) / totalSpace;
        
        status.setDiskFreePercent(freePercent);
        
        if (freePercent < 10) {
            status.setDisk("CRITICAL");
            status.setOverallStatus("DEGRADED");
        } else if (freePercent < 20) {
            status.setDisk("LOW");
            status.setOverallStatus("DEGRADED");
        } else {
            status.setDisk("UP");
        }
    }
    
    private void checkMemory(HealthStatus status) {
        Runtime runtime = Runtime.getRuntime();
        long maxMemory = runtime.maxMemory();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        double usedPercent = (usedMemory * 100.0) / maxMemory;
        
        status.setMemoryUsedPercent(usedPercent);
        
        if (usedPercent > 90) {
            status.setMemory("CRITICAL");
            status.setOverallStatus("DEGRADED");
        } else if (usedPercent > 80) {
            status.setMemory("HIGH");
            status.setOverallStatus("DEGRADED");
        } else {
            status.setMemory("UP");
        }
    }
}

@Data
class HealthStatus {
    private Instant timestamp;
    private String overallStatus;
    private boolean healthy = true;
    
    // Database
    private String database;
    private Long databaseLatency;
    private String databaseError;
    
    // Cache
    private String cache;
    private Long cacheLatency;
    private String cacheError;
    
    // Disk
    private String disk;
    private Double diskFreePercent;
    
    // Memory
    private String memory;
    private Double memoryUsedPercent;
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### **Example: E-Commerce Platform (99.95% Availability Target)**

**Requirements:**
- 50M users
- 10M daily active users
- 5M orders/day
- Target: 99.95% availability (21.6 minutes downtime/month)
- Peak traffic: 3x average (holiday sales)

---

### **Step 1: Calculate Required Redundancy**

**Single Server Availability:**
```
Typical server uptime: 99% (3.5 days downtime/year)

Target: 99.95% (21.6 min downtime/month)

Question: How many servers needed?
```

**Active-Passive (2 servers):**
```
Probability both fail = 0.01 × 0.01 = 0.0001
Availability = 1 - 0.0001 = 99.99%

Close, but not quite 99.95%
```

**Active-Active (3 servers):**
```
Probability all 3 fail = 0.01 × 0.01 × 0.01 = 0.000001
Availability = 1 - 0.000001 = 99.9999%

✓ Exceeds 99.95% target
```

**Conclusion: Need minimum 3 active servers**

---

### **Step 2: Calculate Traffic Load**

```
Daily orders: 5M
Orders/second (average): 5M / 86,400 = 58 QPS
Peak (3x): 58 × 3 = 174 QPS

Server capacity (properly sized): 100 QPS per server

Servers needed:
- Normal: 58 / 100 = 1 server (but need 3 for availability)
- Peak: 174 / 100 = 2 servers

Provision: 3 servers (handle peak + 1 failure)
```

---

### **Step 3: Failure Scenarios**

**Scenario 1: 1 Server Fails (Normal Load)**
```
Capacity: 3 servers × 100 QPS = 300 QPS
Load: 58 QPS
After failure: 2 servers × 100 QPS = 200 QPS

200 QPS > 58 QPS ✓ (still sufficient)
```

**Scenario 2: 1 Server Fails (Peak Load)**
```
Capacity: 3 servers × 100 QPS = 300 QPS
Load: 174 QPS (peak)
After failure: 2 servers × 100 QPS = 200 QPS

200 QPS > 174 QPS ✓ (still sufficient, but tight)
```

**Scenario 3: 2 Servers Fail (Unlikely)**
```
Capacity: 1 server × 100 QPS = 100 QPS
Load: 174 QPS (peak)

100 QPS < 174 QPS ✗ (insufficient, degraded)

Solution: Enable graceful degradation
- Disable recommendations
- Reduce image quality
- Queue non-critical operations
```

---

### **Step 4: Multi-Region Calculation**

**Goal: Survive entire region failure**

**Single Region:**
```
Availability: 99.95%
Risk: AWS region outage (rare but possible)
```

**Multi-Region (2 regions):**
```
Region 1: 99.95% available
Region 2: 99.95% available

Probability both fail: 0.0005 × 0.0005 = 0.00000025
Availability: 1 - 0.00000025 = 99.999975%

Downtime: 0.000025% × 30 days × 24 hours × 60 min
        = 0.0108 minutes/month
        = 0.648 seconds/month

✓ Exceeds target (six nines vs required four nines)
```

**Cost:**
```
Single region: 3 servers × $500/month = $1,500/month
Multi-region: 2 regions × 3 servers × $500 = $3,000/month

Additional cost: $1,500/month
Benefit: 99.95% → 99.9999% (200x better)

ROI: Worth it for e-commerce
```

---

### **Step 5: Downtime Budget**

```
99.95% availability = 0.05% downtime allowed

Monthly budget:
= 30 days × 24 hours × 60 minutes × 0.0005
= 21.6 minutes/month

Weekly: 5 minutes
Daily: 43 seconds

Incident allocation:
- Planned maintenance: 5 minutes/month
- Unplanned outages: 16.6 minutes/month

If 20 minutes used this month:
→ 1.6 minutes remaining
→ Stop all deployments, focus on stability!
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Database Availability Patterns**

#### **Pattern 1: Primary-Replica (Active-Passive)**

```java
@Configuration
public class DatabaseConfig {
    
    @Bean
    @Primary
    public DataSource primaryDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://db-primary:5432/app");
        config.setUsername("app");
        config.setPassword(System.getenv("DB_PASSWORD"));
        config.setMaximumPoolSize(50);
        config.setConnectionTimeout(5000);
        return new HikariDataSource(config);
    }
    
    @Bean
    public DataSource replicaDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://db-replica:5432/app");
        config.setUsername("app");
        config.setPassword(System.getenv("DB_PASSWORD"));
        config.setMaximumPoolSize(50);
        config.setReadOnly(true);
        return new HikariDataSource(config);
    }
}

@Configuration
public class RoutingDataSourceConfig {
    
    @Bean
    public DataSource routingDataSource(
        @Qualifier("primaryDataSource") DataSource primary,
        @Qualifier("replicaDataSource") DataSource replica) {
        
        Map<Object, Object> dataSourceMap = new HashMap<>();
        dataSourceMap.put("primary", primary);
        dataSourceMap.put("replica", replica);
        
        AbstractRoutingDataSource routingDataSource = new AbstractRoutingDataSource() {
            @Override
            protected Object determineCurrentLookupKey() {
                // Route based on transaction type
                boolean readOnly = TransactionSynchronizationManager
                    .isCurrentTransactionReadOnly();
                return readOnly ? "replica" : "primary";
            }
        };
        
        routingDataSource.setTargetDataSources(dataSourceMap);
        routingDataSource.setDefaultTargetDataSource(primary);
        
        return routingDataSource;
    }
}

@Service
public class OrderService {
    
    @Transactional  // Write to primary
    public Order createOrder(OrderRequest request) {
        Order order = new Order(request);
        return orderRepository.save(order);
    }
    
    @Transactional(readOnly = true)  // Read from replica
    public List<Order> getOrders(Long userId) {
        return orderRepository.findByUserId(userId);
    }
}

// Failover:
// - If primary fails: Promote replica to primary (manual or automatic)
// - Downtime: 30-60 seconds (DNS + application restart)
```

---

#### **Pattern 2: Multi-Primary (Active-Active)**

```java
@Configuration
public class MultiPrimaryConfig {
    
    @Bean
    public DataSource us_east_datasource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://db-us-east:3306/app");
        config.setMaximumPoolSize(50);
        return new HikariDataSource(config);
    }
    
    @Bean
    public DataSource eu_west_datasource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://db-eu-west:3306/app");
        config.setMaximumPoolSize(50);
        return new HikariDataSource(config);
    }
}

@Service
public class GeoRoutingService {
    
    public DataSource getLocalDataSource() {
        String region = System.getenv("AWS_REGION");
        
        switch (region) {
            case "us-east-1":
                return us_east_datasource;
            case "eu-west-1":
                return eu_west_datasource;
            default:
                return us_east_datasource;  // Default
        }
    }
}

// Multi-primary replication (MySQL Group Replication):
// - Each region has primary
// - Writes to us-east → Replicated to eu-west (async)
// - Writes to eu-west → Replicated to us-east (async)
// - Conflict resolution: Last-write-wins (timestamp)
```

---

### **Cache Availability Patterns**

```java
@Configuration
public class RedisSentinelConfig {
    
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        // Redis Sentinel for automatic failover
        RedisSentinelConfiguration sentinelConfig = new RedisSentinelConfiguration()
            .master("mymaster")
            .sentinel("sentinel1", 26379)
            .sentinel("sentinel2", 26379)
            .sentinel("sentinel3", 26379);
        
        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
            .commandTimeout(Duration.ofSeconds(2))
            .build();
        
        return new LettuceConnectionFactory(sentinelConfig, clientConfig);
    }
}

@Service
public class CacheService {
    @Autowired
    private RedisTemplate<String, Product> redis;
    
    @Autowired
    private ProductRepository repository;
    
    public Product getProduct(Long id) {
        String key = "product:" + id;
        
        try {
            // Try cache first
            Product product = redis.opsForValue().get(key);
            if (product != null) {
                return product;
            }
        } catch (RedisConnectionException e) {
            log.warn("Redis unavailable, falling back to database", e);
            metrics.recordCacheMiss("redis_down");
        }
        
        // Fallback to database
        Product product = repository.findById(id).orElseThrow();
        
        // Try to populate cache (best effort)
        try {
            redis.opsForValue().set(key, product, 1, TimeUnit.HOURS);
        } catch (Exception e) {
            log.warn("Failed to populate cache", e);
        }
        
        return product;
    }
}

// Redis Sentinel:
// - 1 master, 2 replicas
// - 3 sentinels monitor health
// - If master fails: Sentinels elect new master (10-30 seconds)
// - Client automatically connects to new master
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Combining Patterns for Maximum Availability**

**Netflix Architecture (Real Example):**

```
LAYER 1: GLOBAL (DNS / CDN)
════════════════════════════
[Route 53 / Cloudflare]
- Latency-based routing
- Health checks
- Automatic failover

       ↓

LAYER 2: REGIONAL (Load Balancers)
═══════════════════════════════════
[3 AWS Regions]
- US-EAST: Active
- EU-WEST: Active
- AP-SOUTH: Active
- ELB in each region (active-active)

       ↓

LAYER 3: SERVICE (Microservices)
═════════════════════════════════
[Microservices per region]
- API Gateway (Circuit breaker)
- Recommendation Service (3+ instances)
- Video Service (3+ instances)
- User Service (3+ instances)
- Auto-scaling (based on load)

       ↓

LAYER 4: DATA (Multi-AZ)
════════════════════════
[Data layer per region]
- DynamoDB (multi-AZ, 99.99% SLA)
- S3 (99.999999999% durability)
- ElastiCache (Redis Cluster, 3 nodes)

Result: 99.99%+ availability
```

---

### **Implementation: Full Stack HA**

```java
@SpringBootApplication
@EnableCircuitBreaker
@EnableHystrix
public class HighAvailabilityApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(HighAvailabilityApplication.class, args);
    }
}

@Configuration
public class HighAvailabilityConfig {
    
    // Pattern 1: Circuit Breaker
    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry() {
        return CircuitBreakerRegistry.ofDefaults();
    }
    
    // Pattern 2: Bulkhead
    @Bean
    public BulkheadRegistry bulkheadRegistry() {
        return BulkheadRegistry.ofDefaults();
    }
    
    // Pattern 3: Retry
    @Bean
    public RetryRegistry retryRegistry() {
        RetryConfig config = RetryConfig.custom()
            .maxAttempts(3)
            .waitDuration(Duration.ofMillis(500))
            .build();
        return RetryRegistry.of(config);
    }
    
    // Pattern 4: Rate Limiter
    @Bean
    public RateLimiterRegistry rateLimiterRegistry() {
        RateLimiterConfig config = RateLimiterConfig.custom()
            .limitForPeriod(100)
            .limitRefreshPeriod(Duration.ofSeconds(1))
            .timeoutDuration(Duration.ofMillis(500))
            .build();
        return RateLimiterRegistry.of(config);
    }
}

@Service
public class ResilientService {
    
    @CircuitBreaker(name = "backend", fallbackMethod = "fallback")
    @Retry(name = "backend")
    @Bulkhead(name = "backend")
    @RateLimiter(name = "backend")
    public Response callBackend(Request request) {
        return backendClient.call(request);
    }
    
    public Response fallback(Request request, Exception e) {
        log.warn("Fallback triggered for request: {}", request, e);
        return Response.cached(request);
    }
}

// Result: 
// - Circuit breaker prevents cascading failures
// - Retry handles transient failures
// - Bulkhead isolates failures
// - Rate limiter prevents overload
// - Combined: 99.95%+ availability
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### **Health Check Security**

```java
@RestController
public class SecureHealthCheckController {
    
    // Public health check (minimal info)
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> publicHealth() {
        boolean healthy = checkBasicHealth();
        
        if (healthy) {
            return ResponseEntity.ok(Map.of("status", "UP"));
        } else {
            return ResponseEntity.status(503)
                .body(Map.of("status", "DOWN"));
        }
    }
    
    // Detailed health check (requires authentication)
    @GetMapping("/health/detailed")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DetailedHealthStatus> detailedHealth() {
        DetailedHealthStatus status = new DetailedHealthStatus();
        
        // Detailed checks (don't expose to public)
        status.setDatabase(checkDatabase());
        status.setCache(checkCache());
        status.setDiskSpace(checkDiskSpace());
        status.setMemory(checkMemory());
        status.setActiveConnections(getActiveConnections());
        status.setDatabaseHosts(getDatabaseHosts());  // Sensitive!
        status.setCacheHosts(getCacheHosts());        // Sensitive!
        
        return ResponseEntity.ok(status);
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: AWS S3 (99.99% Availability)**

**Architecture:**
```
S3 Availability Design:
═══════════════════════

REGIONAL (Default):
- Data stored across 3 Availability Zones
- Each AZ: Independent power, cooling, networking
- If 1 AZ fails: Data still available from other 2
- Availability: 99.99%

CROSS-REGION REPLICATION:
- Replicate to another AWS region
- If entire region fails: Failover to other region
- Availability: 99.999%+

DATA PATH:
[Client] → [Route 53] → [S3 Region 1 (3 AZ)]
                      → [S3 Region 2 (3 AZ)] (replica)
```

**How They Achieve It:**
1. **Multi-AZ by default** (active-active across AZs)
2. **Automated failover** (transparent to clients)
3. **Load balancing** (distribute across AZs)
4. **Health checks** (continuous monitoring)
5. **Chaos testing** (GameDays to test failures)

**Results:**
- Availability: 99.99% (four nines)
- Durability: 99.999999999% (eleven nines)
- Scale: Trillions of objects

---

### **Case Study 2: Netflix (Survived AWS Outages)**

**2012: AWS US-EAST-1 Outage**

**Problem:**
- AWS US-EAST-1 region down (6+ hours)
- Many services offline (Reddit, Pinterest, Instagram)
- Netflix: Stayed online!

**How:**
- **Multi-region architecture** (US, EU, Asia all active)
- **Chaos Monkey** (regularly tests failures)
- **Circuit breakers** (isolate failed services)
- **Graceful degradation** (disable recommendations, keep streaming)

**Timeline:**
```
00:00 - AWS US-EAST-1 ELB fails
00:01 - Netflix health checks detect failure
00:02 - Route 53 routes traffic to US-WEST-2
00:05 - 100% traffic on US-WEST-2 + EU-WEST-1
Result: Users never noticed (0 downtime)
```

**Architecture:**
```
BEFORE OUTAGE:
US-EAST (50%) → [Active]
US-WEST (30%) → [Active]
EU-WEST (20%) → [Active]

DURING OUTAGE:
US-EAST (0%)  → [DOWN] ✗
US-WEST (60%) → [Active] ✓
EU-WEST (40%) → [Active] ✓

AFTER RECOVERY:
US-EAST (50%) → [Active]
US-WEST (30%) → [Active]
EU-WEST (20%) → [Active]
```

---

### **Case Study 3: GitHub (2018 Outage - Lessons Learned)**

**Problem:**
- Network partition between US-EAST and US-WEST
- Split-brain scenario (both think they're primary)
- Data inconsistency

**What Happened:**
```
Normal:
US-EAST (Primary) ← → US-WEST (Replica)

Network Partition:
US-EAST (Thinks it's primary) ✗ → ← ✗ US-WEST (Promoted to primary)

Both accepting writes!
- US-EAST: User A creates PR #1234
- US-WEST: User B creates PR #1234 (conflict!)

When partition healed:
- Conflicting data
- Manual reconciliation needed
- 24 hours to fully resolve
```

**Lessons Learned:**
1. **Quorum-based consensus** (prevent split-brain)
2. **Region affinity** (keep users on one region)
3. **Read-only mode** (during uncertainty)
4. **Better monitoring** (detect partitions faster)

**New Architecture:**
```
After Improvement:
- Raft consensus (quorum required)
- If < quorum: Enter read-only mode
- Manual failover (not automatic)
- Result: Prevent split-brain
```

---

### **Case Study 4: Stripe (Five Nines Availability)**

**Target: 99.999% (5 nines) = 26 seconds downtime/month**

**Architecture:**
```
MULTI-REGION ACTIVE-ACTIVE:
═══════════════════════════

[Global Load Balancer]
       ↓
       ├─> US-EAST (Primary)
       ├─> EU-WEST (Active)
       └─> AP-SOUTHEAST (Active)

Each region:
- Full payment processing capability
- Independent database (CockroachDB)
- Cross-region replication (async)

CIRCUIT BREAKERS:
- Wrap all external calls
- Fail fast (don't wait for timeout)
- Fallback to queue

IDEMPOTENCY:
- Every API call requires idempotency key
- Retries safe (no duplicate charges)

OBSERVABILITY:
- Real-time monitoring
- Automated alerts
- 24/7 on-call
```

**How They Hit Five Nines:**
1. **Multi-region** (no single point of failure)
2. **Circuit breakers** (prevent cascading failures)
3. **Idempotency** (safe retries)
4. **Chaos engineering** (test failures regularly)
5. **Fast MTTR** (automated failover, 10 seconds)

**Results:**
- Availability: 99.999% (achieved)
- MTBF: 8,760 hours (1 year)
- MTTR: 10 seconds (automated)

---

### **Case Study 5: Facebook (Traffic Shifting)**

**Technique: Dynamic Traffic Shifting**

**Normal Day:**
```
Data Center 1 (Oregon):    40% traffic
Data Center 2 (Iowa):      30% traffic
Data Center 3 (Virginia):  30% traffic
```

**Data Center 1 Degraded (High Latency):**
```
Detect: p99 latency > 500ms (health check)
Action: Shift traffic away

After shift:
Data Center 1 (Oregon):    5% traffic  (reduced)
Data Center 2 (Iowa):      47% traffic (increased)
Data Center 3 (Virginia):  48% traffic (increased)

Result: Overall p99 back to normal
```

**Implementation:**
```python
def route_traffic():
    health = check_datacenter_health()
    
    weights = {
        'dc1': 40,
        'dc2': 30,
        'dc3': 30
    }
    
    # Adjust weights based on health
    for dc, status in health.items():
        if status['p99_latency'] > 500:
            weights[dc] = 5  # Reduce to minimal
            
            # Redistribute to healthy DCs
            healthy_dcs = [d for d in weights if d != dc]
            extra = (40 - 5) / len(healthy_dcs)
            for healthy_dc in healthy_dcs:
                weights[healthy_dc] += extra
    
    return weights
```

**Results:**
- Users don't notice degradation
- Degraded DC has time to recover
- Availability maintained

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "Availability patterns are architectural strategies for maximizing uptime in distributed systems. The core patterns are active-passive (failover), active-active (load balancing), and multi-region (geo-redundancy).
>
> **Active-passive** uses a primary server with a standby waiting in hot-standby mode. When the primary fails, traffic routes to the standby. This works well for stateful systems like databases where you need a single writer. The downside is 30-60 seconds of failover time and 50% resource utilization since the standby sits idle.
>
> **Active-active** distributes traffic across multiple servers simultaneously. All servers are processing requests, so if one fails, the others immediately absorb the load with zero downtime. The key requirement is that services must be stateless—session state must be externalized to Redis or a similar store. This pattern gives you both high availability and high resource utilization.
>
> **Multi-region** deploys your full stack across multiple geographic regions. This protects against entire region failures and also reduces latency by routing users to their nearest region. The challenge is data consistency—cross-region replication introduces lag, typically 1-5 seconds for eventual consistency. Netflix uses this pattern and stayed online during the 2012 AWS US-EAST outage by routing all traffic to their other regions.
>
> In practice, you combine patterns. Stripe achieves 99.999% availability (five nines—only 26 seconds downtime per month) by running active-active within each of three regions, wrapping all external calls in circuit breakers to prevent cascading failures, and requiring idempotency keys so retries are safe. The circuit breaker is critical—it fails fast when a dependency is down rather than letting requests pile up and consuming all threads.
>
> For FAANG interviews, you'd want to discuss trade-offs: active-passive is simpler but has failover time; active-active is more complex but gives instant failover; multi-region is expensive but provides the highest availability. The choice depends on your SLA target, budget, and whether your system can handle eventual consistency."

---

### **Common Follow-Up Questions**

#### **Q1: How do you implement zero-downtime deployments?**

> "Zero-downtime deployments require a combination of patterns:
>
> **1. Blue-Green Deployment:**
> ```
> Step 1: Run V1 (blue environment, handling 100% traffic)
> Step 2: Deploy V2 to green environment (0% traffic)
> Step 3: Test green thoroughly (smoke tests, health checks)
> Step 4: Switch traffic: blue (0%) → green (100%)
> Step 5: Monitor for 1 hour
> Step 6: If issues: Instant rollback to blue
> Step 7: If successful: Decommission blue
>
> Downtime: 0 seconds (instant switch)
> Rollback time: 0 seconds (instant)
> Cost: 2x infrastructure during deployment
> ```
>
> **2. Rolling Deployment (Kubernetes):**
> ```yaml
> strategy:
>   type: RollingUpdate
>   rollingUpdate:
>     maxSurge: 1        # Create 1 extra pod during update
>     maxUnavailable: 0  # Keep all pods available
>
> Timeline:
> - 3 pods running V1
> - Create 1 pod with V2 (total: 4 pods)
> - When V2 healthy: Terminate 1 V1 pod (total: 3 pods)
> - Repeat until all V2
>
> Downtime: 0 seconds
> Cost: Minimal (1 extra pod temporarily)
> ```
>
> **3. Canary Deployment:**
> ```
> Step 1: V1 handling 100% traffic
> Step 2: Deploy V2, route 1% traffic
> Step 3: Monitor metrics (error rate, latency)
> Step 4: If healthy: Increase to 10%
> Step 5: If healthy: Increase to 50%
> Step 6: If healthy: Increase to 100%
> Step 7: If ANY issues: Instant rollback
>
> Benefit: Detect issues with minimal user impact
> ```
>
> **4. Database Schema Migrations (Backwards Compatible):**
> ```
> Problem: Deploying code that requires new DB column
>
> Bad approach:
> 1. Add column
> 2. Deploy new code
> → If rollback needed: Code expects column that doesn't exist!
>
> Good approach (3-phase):
> Phase 1 (Expand): Add column, but don't use it yet
> - Old code: Works (ignores new column)
> - New code: Works (column exists)
>
> Phase 2 (Migrate): Deploy new code that uses column
> - All instances on new code
> - Column now being used
>
> Phase 3 (Contract): Remove old code paths
> - Safe to clean up
>
> Result: Rollback safe at every phase
> ```
>
> **5. Feature Flags:**
> ```java
> @Service
> public class OrderService {
>     @Autowired
>     private FeatureFlagClient featureFlags;
>     
>     public Order processOrder(OrderRequest request) {
>         if (featureFlags.isEnabled("new-checkout-flow")) {
>             return newCheckoutFlow(request);
>         } else {
>             return oldCheckoutFlow(request);
>         }
>     }
> }
>
> Deployment:
> - Deploy code with flag=false (new code inactive)
> - Monitor for issues
> - Gradually enable flag: 1% → 10% → 50% → 100%
> - If issues: Flip flag to false (instant rollback, no redeploy)
> ```
>
> **Key Principles:**
> - **Never break backwards compatibility**
> - **Always have instant rollback**
> - **Monitor aggressively during deployment**
> - **Automate rollback triggers** (error rate > 1%, p99 > 500ms)"

---

#### **Q2: What's the difference between high availability and disaster recovery?**

> "High availability and disaster recovery are related but address different failure scenarios:
>
> **High Availability (Prevent Downtime):**
> - **Goal:** Minimize planned and unplanned downtime
> - **Scope:** Component failures (server crash, network issue)
> - **Recovery Time:** Seconds to minutes
> - **Strategy:** Redundancy, failover, load balancing
> - **Example:** Active-active servers with automatic failover
> - **SLA:** 99.99% (4 minutes downtime/month)
>
> **Disaster Recovery (Survive Catastrophic Failures):**
> - **Goal:** Recover from catastrophic events
> - **Scope:** Region failure, natural disaster, data corruption
> - **Recovery Time:** Hours to days
> - **Strategy:** Backups, cross-region replication
> - **Example:** Restore from backup after data center fire
> - **Metrics:** RPO (data loss tolerance), RTO (recovery time)
>
> **Comparison:**
>
> | **Aspect** | **High Availability** | **Disaster Recovery** |
> |------------|----------------------|----------------------|
> | **Focus** | Uptime | Data protection |
> | **Failure Type** | Single component | Entire system |
> | **Recovery** | Automatic | Manual/semi-automatic |
> | **RTO** | Seconds | Hours |
> | **RPO** | Near-zero | Minutes to hours |
> | **Cost** | $$$ (active redundancy) | $ (cold backups) |
>
> **Real-World Example:**
>
> **High Availability Setup:**
> ```
> [Load Balancer]
>     ↓
> [Server 1, Server 2, Server 3] (active-active)
>     ↓
> [Database Primary + 2 Replicas]
>
> Server 1 fails → LB routes to Server 2/3 (0 downtime)
> DB Primary fails → Promote replica (30 sec downtime)
> ```
>
> **Disaster Recovery Setup:**
> ```
> PRIMARY REGION (US-EAST):
> - Full production stack
> - Daily backups to S3
> - Cross-region replication
>
> DR REGION (US-WEST):
> - Cold standby (minimal resources)
> - Database replica (1 hour lag acceptable)
> - Backup restoration scripts
>
> Fire destroys US-EAST data center:
> 1. Restore from backup (2 hours)
> 2. Promote US-WEST replica to primary
> 3. Scale up resources
> 4. Update DNS
> RTO: 4 hours
> RPO: 1 hour (can lose last hour of data)
> ```
>
> **You Need Both:**
> - **HA:** Handle common failures (server crashes, network issues)
> - **DR:** Handle rare catastrophic events (region failure, ransomware)
>
> **My Recommendation:**
> - **Start:** Focus on HA (more common failures)
> - **Then:** Add DR (as budget allows)
> - **Ideal:** Multi-region active-active (both HA + DR)"

---

#### **Q3: How do you test availability in production without impacting users?**

> "Testing availability in production is critical—staging never matches production complexity. Here's how FAANG companies do it:
>
> **1. Chaos Engineering (Netflix Approach):**
> ```java
> @Service
> @Profile("production")
> public class ChaosMonkey {
>     
>     @Scheduled(cron = "0 */30 9-17 * * MON-FRI")  // Business hours
>     public void injectFailure() {
>         if (Math.random() < 0.05) {  // 5% chance every 30 min
>             selectAndExecuteChaosExperiment();
>         }
>     }
> }
>
> Experiments:
> 1. Terminate random EC2 instance
> 2. Inject 2-second latency to random service
> 3. Fill disk to 95% capacity
> 4. Simulate AWS region failure (block traffic)
> 5. Corrupt random cache entries
>
> Benefits:
> - Discover failure modes before users do
> - Build confidence in recovery mechanisms
> - Force teams to build resilient systems
>
> Key: Run during business hours (not weekends)
> Reason: If something breaks, team is online to fix it
> ```
>
> **2. Shadow Traffic:**
> ```
> Production V1 (100% traffic) → Users see results
>         ↓ (copy)
> Shadow V2 (0% traffic) → Results discarded
>
> Compare:
> - Latency: V2 slower? (performance regression)
> - Errors: V2 more errors? (stability issues)
> - Resource usage: V2 uses more memory? (leak)
>
> If any issues: Don't deploy V2
> If healthy: Safe to deploy
>
> Benefit: Test with real traffic, no user impact
> ```
>
> **3. Canary with Synthetic Users:**
> ```
> Deploy V2 to 1% of traffic
> But: 1% = real users (risky!)
>
> Better: Canary with synthetic traffic
> - Create fake user accounts
> - Generate synthetic requests (automated)
> - Only synthetic users see V2 initially
> - Monitor for issues
> - If healthy: Expand to real users
>
> Benefit: Catch issues before real users affected
> ```
>
> **4. GameDays (Scheduled Failure Tests):**
> ```
> Schedule: Last Friday of every month
>
> Scenario: Simulate region failure
> 1. 9 AM: Announce GameDay to team
> 2. 10 AM: Randomly select AWS region to "fail"
> 3. 10:05 AM: Block all traffic to that region
> 4. Monitor:
>    - Did traffic failover to other regions? ✓
>    - Any user-facing errors? ✗
>    - How long to detect? (Target: < 1 minute)
>    - How long to recover? (Target: < 5 minutes)
> 5. 11 AM: Restore region
> 6. Debrief: What went well, what didn't
>
> Benefits:
> - Scheduled (team prepared)
> - Safe (rollback plan ready)
> - Learning (improve runbooks)
> ```
>
> **5. Synthetic Monitoring (Datadog / New Relic):**
> ```java
> @Scheduled(fixedRate = 60000)  // Every minute
> public void syntheticTest() {
>     // Simulate user journey
>     try {
>         long start = System.currentTimeMillis();
>         
>         // 1. Login
>         loginAPI.login("synthetic@test.com", "password");
>         
>         // 2. Browse products
>         productAPI.search("laptop");
>         
>         // 3. Add to cart
>         cartAPI.add(productId);
>         
>         // 4. Checkout
>         checkoutAPI.complete(cartId);
>         
>         long latency = System.currentTimeMillis() - start;
>         
>         if (latency > 5000) {
>             alertService.send("Synthetic test exceeded 5s");
>         }
>         
>     } catch (Exception e) {
>         alertService.send("Synthetic test failed: " + e);
>     }
> }
>
> Benefit: Catch issues before users report them
> ```
>
> **Key Principles:**
> - **Start small:** 1% traffic, synthetic users
> - **Automate rollback:** Error rate > 1% → instant rollback
> - **Monitor aggressively:** Latency, errors, resource usage
> - **Fail during business hours:** Team ready to respond
> - **Learn from failures:** Improve runbooks, automation"

---

#### **Q4: How do you handle state in active-active architectures?**

> "State is the biggest challenge in active-active architectures. The key is **externalizing state** so any server can handle any request.
>
> **1. Stateless Application Servers:**
> ```java
> // BAD: Store state in server memory
> @RestController
> public class BadController {
>     private Map<String, Cart> carts = new HashMap<>();  // Local state!
>     
>     @PostMapping("/cart/add")
>     public void addToCart(@RequestBody Item item, HttpSession session) {
>         String userId = (String) session.getAttribute("userId");
>         Cart cart = carts.get(userId);  // Only on THIS server!
>         cart.add(item);
>         carts.put(userId, cart);
>     }
> }
>
> Problem:
> - User's first request → Server 1 (cart stored locally)
> - User's second request → Server 2 (cart not found!)
>
> // GOOD: Externalize state to Redis
> @RestController
> public class GoodController {
>     @Autowired
>     private RedisTemplate<String, Cart> redis;
>     
>     @PostMapping("/cart/add")
>     public void addToCart(@RequestBody Item item, HttpSession session) {
>         String userId = (String) session.getAttribute("userId");
>         String key = "cart:" + userId;
>         
>         Cart cart = redis.opsForValue().get(key);
>         if (cart == null) {
>             cart = new Cart();
>         }
>         cart.add(item);
>         redis.opsForValue().set(key, cart, 7, TimeUnit.DAYS);
>     }
> }
>
> Result: Any server can handle any request
> ```
>
> **2. Session Management (Spring Session + Redis):**
> ```java
> @Configuration
> @EnableRedisHttpSession(maxInactiveIntervalInSeconds = 3600)
> public class SessionConfig {
>     @Bean
>     public RedisConnectionFactory redisConnectionFactory() {
>         RedisClusterConfiguration config = new RedisClusterConfiguration();
>         config.addClusterNode(new RedisNode("redis1", 6379));
>         config.addClusterNode(new RedisNode("redis2", 6379));
>         config.addClusterNode(new RedisNode("redis3", 6379));
>         return new LettuceConnectionFactory(config);
>     }
> }
>
> // Sessions automatically stored in Redis
> // Load balancer doesn't need sticky sessions
> // User can hit any server
> ```
>
> **3. Database (Shared State):**
> ```java
> // All servers share same database
> @Service
> public class OrderService {
>     @Autowired
>     private OrderRepository repository;
>     
>     @Transactional
>     public Order createOrder(OrderRequest request) {
>         // Write to shared database
>         Order order = new Order(request);
>         return repository.save(order);
>     }
> }
>
> // Key: Database is external shared state
> // Any server can read/write
> ```
>
> **4. Distributed Locks (When Needed):**
> ```java
> @Service
> public class InventoryService {
>     @Autowired
>     private RedissonClient redisson;
>     
>     public void reserveInventory(Long productId, int quantity) {
>         String lockKey = "inventory-lock:" + productId;
>         RLock lock = redisson.getLock(lockKey);
>         
>         try {
>             // Acquire distributed lock
>             boolean acquired = lock.tryLock(5, 10, TimeUnit.SECONDS);
>             if (!acquired) {
>                 throw new LockException("Could not acquire lock");
>             }
>             
>             // Critical section (only 1 server at a time)
>             Product product = productRepository.findById(productId).orElseThrow();
>             if (product.getInventory() < quantity) {
>                 throw new InsufficientInventoryException();
>             }
>             product.setInventory(product.getInventory() - quantity);
>             productRepository.save(product);
>             
>         } finally {
>             lock.unlock();
>         }
>     }
> }
>
> // Result: Prevent race conditions across servers
> ```
>
> **5. Event Sourcing (For Complex State):**
> ```java
> // Instead of storing current state, store events
> @Service
> public class OrderEventService {
>     @Autowired
>     private KafkaTemplate<String, OrderEvent> kafka;
>     
>     public void createOrder(OrderRequest request) {
>         // Emit event (immutable, append-only)
>         OrderCreatedEvent event = new OrderCreatedEvent(request);
>         kafka.send("orders-topic", event);
>     }
>     
>     public void payOrder(Long orderId) {
>         OrderPaidEvent event = new OrderPaidEvent(orderId);
>         kafka.send("orders-topic", event);
>     }
>     
>     // Reconstruct state from events
>     public Order getOrder(Long orderId) {
>         List<OrderEvent> events = eventStore.getEvents(orderId);
>         return rebuildOrderFromEvents(events);
>     }
> }
>
> Benefit:
> - No shared mutable state
> - Full audit trail
> - Time travel (replay events)
> ```
>
> **Trade-Offs:**
>
> | **Approach** | **Complexity** | **Latency** | **Use Case** |
> |--------------|---------------|-------------|--------------|
> | Redis | Low | Low (<1ms) | Session, cart |
> | Database | Low | Medium (10ms) | Orders, users |
> | Distributed Lock | High | Medium (10-100ms) | Inventory |
> | Event Sourcing | Very High | Variable | Complex workflows |
>
> **Key Principle:** Externalize ALL state. Servers should be cattle, not pets—any server dies, others take over seamlessly."

---

#### **Q5: What's the relationship between availability and consistency (CAP theorem)?**

> "The CAP theorem states that in a distributed system, you can't have all three of: **Consistency, Availability, and Partition tolerance**. You must choose two.
>
> **CAP Theorem:**
> ```
> C (Consistency): All nodes see the same data at the same time
> A (Availability): Every request receives a response (success or failure)
> P (Partition tolerance): System continues despite network partitions
>
> The theorem: Can only achieve 2 of 3 simultaneously
> ```
>
> **In Practice:**
> Partitions WILL happen (network cables cut, routers fail), so you must choose between **C and A**:
>
> **CP System (Consistency + Partition tolerance, sacrifice Availability):**
> ```
> Example: Banking system
>
> Normal operation:
> - Node 1: Balance = $100
> - Node 2: Balance = $100 (consistent)
> - Withdraw $50 → Both nodes updated
> - Balance = $50 (consistent)
>
> Network partition:
> - Node 1 and Node 2 can't communicate
> - Choice: Reject writes (sacrifice availability)
> - Reason: Can't guarantee consistency
>
> Result:
> - Consistency: ✓ (data always correct)
> - Availability: ✗ (requests rejected during partition)
> - Use case: Financial systems (correctness > availability)
> ```
>
> **AP System (Availability + Partition tolerance, sacrifice Consistency):**
> ```
> Example: Social media feed
>
> Normal operation:
> - Node 1: Post count = 100
> - Node 2: Post count = 100
> - New post → Both nodes updated
> - Post count = 101
>
> Network partition:
> - Node 1 and Node 2 can't communicate
> - Choice: Accept writes (sacrifice consistency)
> - Node 1: Post count = 102 (user A posts)
> - Node 2: Post count = 102 (user B posts)
> - Actual count: 103 (but nodes don't know)
>
> When partition heals:
> - Conflict resolution (merge posts)
> - Eventually consistent
>
> Result:
> - Consistency: ✗ (temporary inconsistency)
> - Availability: ✓ (always accepts requests)
> - Use case: Social media (availability > strict consistency)
> ```
>
> **Real-World Examples:**
>
> **CP Systems:**
> - **HBase, MongoDB (strong consistency mode):**
>   - During partition: Reject writes to minority partition
>   - Result: Always consistent, but unavailable during partition
>
> - **Google Spanner:**
>   - Uses TrueTime API (synchronized clocks)
>   - Strong consistency globally
>   - Trade-off: Higher latency (wait for quorum)
>
> **AP Systems:**
> - **Cassandra, DynamoDB:**
>   - During partition: Accept writes on both sides
>   - Conflict resolution: Last-write-wins (timestamp)
>   - Result: Always available, eventually consistent
>
> - **DNS:**
>   - Cached records may be stale
>   - Trade-off: High availability, eventual consistency
>
> **PACELC Theorem (Extension of CAP):**
> ```
> PACELC: If Partition, choose Availability or Consistency
>         Else (no partition), choose Latency or Consistency
>
> Examples:
> - Cassandra: PA/EL (availability + low latency)
> - MongoDB: PC/EC (consistency always)
> - DynamoDB: PA/EL (configurable)
> ```
>
> **Availability Pattern Impact:**
>
> **Multi-Region Active-Active (AP):**
> ```
> US-EAST: User A updates profile
> EU-WEST: User B reads profile (might see old data)
>
> Replication lag: 1-5 seconds
> Result: Eventually consistent (AP system)
> ```
>
> **Multi-Region with Quorum (CP):**
> ```
> US-EAST: User A updates profile
> Write requires quorum (2 of 3 regions)
> Wait for EU-WEST to confirm
> Then ACK to user
>
> Result: Strongly consistent (CP system)
> Trade-off: Higher latency (100-200ms)
> ```
>
> **My Recommendation:**
> - **Financial transactions:** CP (correctness matters)
> - **Social media:** AP (availability matters)
> - **E-commerce:** Hybrid (inventory: CP, recommendations: AP)
>
> **Key Insight:** Availability patterns must align with CAP choice. Active-active multi-region typically implies AP (eventual consistency). If you need strong consistency, you must sacrifice some availability or accept higher latency."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Availability Pattern Decision Tree**

```
START: Design for Availability
       │
       ↓
┌──────────────────────────┐
│ What's your target SLA?  │
└──────────┬───────────────┘
           │
    ┌──────┴──────┐
    ↓             ↓
99.9%          99.99%+
(3 nines)      (4+ nines)
    │             │
    ↓             ↓
Simple         Complex
    │             │
    ↓             │
Active-Passive    │
(2 servers)       │
                  ↓
           ┌──────────────────────┐
           │ Can you be stateless?│
           └──────┬───────────────┘
                  │
         ┌────────┴────────┐
         ↓                 ↓
       YES               NO
         │                 │
         ↓                 ↓
    Active-Active    Multi-Primary
    (3+ servers)     (Distributed DB)
         │                 │
         └────────┬────────┘
                  │
                  ↓
           ┌──────────────────────────┐
           │ Global users / compliance│
           └──────┬───────────────────┘
                  │
         ┌────────┴────────┐
         ↓                 ↓
       YES               NO
         │                 │
         ↓                 ↓
    Multi-Region      Single Region
    (3+ regions)      (Multi-AZ)
         │                 │
         └────────┬────────┘
                  │
                  ↓
           ┌──────────────────────┐
           │ Add resilience layers│
           └──────────────────────┘
                  │
                  ↓
         Circuit Breaker +
         Bulkhead +
         Graceful Degradation +
         Health Checks
                  │
                  ↓
              SUCCESS!
```

---

### **Failover Timeline Comparison**

```
ACTIVE-PASSIVE FAILOVER
════════════════════════

Time (seconds):
0    10   20   30   40   50   60
│────┼────┼────┼────┼────┼────┤

Normal Operation (0-10s):
[Primary] → Handling traffic ✓
[Standby] → Idle (waiting)

Primary Fails (10s):
[Primary] → ✗ CRASH
[Standby] → Still idle

Health Check Detects Failure (15s):
[Load Balancer] → Marks primary unhealthy
                → 3 consecutive failures (15s)

Route Traffic to Standby (20s):
[Standby] → Receives traffic ✓

Downtime: 10 seconds (from failure to recovery)
User Impact: 5-10 failed requests


ACTIVE-ACTIVE FAILOVER
═══════════════════════

Time (seconds):
0    5    10   15   20   25   30
│────┼────┼────┼────┼────┼────┤

Normal Operation (0-10s):
[Server 1] → 33% traffic ✓
[Server 2] → 33% traffic ✓
[Server 3] → 33% traffic ✓

Server 2 Fails (10s):
[Server 1] → 33% traffic ✓
[Server 2] → ✗ CRASH
[Server 3] → 33% traffic ✓

Health Check Detects (12s):
[Load Balancer] → Marks Server 2 unhealthy

Redistribute Traffic (12s):
[Server 1] → 50% traffic ✓
[Server 3] → 50% traffic ✓

Downtime: 0 seconds (instant redistribution)
User Impact: 0 failed requests (only requests in-flight)
```

---

### **Multi-Region Routing Logic**

```
DNS ROUTING DECISION
════════════════════

User Request → api.example.com
       ↓
[Route 53 / Cloudflare]
       │
       ↓ Check user location
       │
┌──────┴──────────────────────────────┐
│                                      │
User in North America    User in Europe    User in Asia
       ↓                      ↓               ↓
   US-EAST-1               EU-WEST-1       AP-SOUTH-1
       │                      │               │
       ↓                      ↓               ↓
   Health Check           Health Check    Health Check
       │                      │               │
   ┌───┴───┐              ┌───┴───┐       ┌───┴───┐
   ↓       ↓              ↓       ↓       ↓       ↓
Healthy  Unhealthy     Healthy  Unhealthy ...
   │       │              │       │
   ↓       │              ↓       │
Route     │           Route      │
Here      │           Here       │
          │                      │
          └──────────┬───────────┘
                     ↓
              Find Next Healthy Region
                     │
          ┌──────────┼──────────┐
          ↓          ↓          ↓
      US-EAST   EU-WEST   AP-SOUTH
          │          │          │
      Healthy?   Healthy?   Healthy?
          ↓          ↓          ↓
       Route     Route     Return
       Here      Here      Error

Latency Optimization:
- User in NYC → US-EAST-1 (10ms)
- User in London → EU-WEST-1 (15ms)
- User in Mumbai → AP-SOUTH-1 (20ms)

Failover:
- If nearest region down → Route to next nearest
- Latency increases, but availability maintained
```

---

### **Circuit Breaker State Flow**

```
CIRCUIT BREAKER LIFECYCLE
══════════════════════════

         CLOSED (Normal)
         ┌──────────────┐
         │  Requests    │
         │  flowing ✓   │
         │              │
         │ Success: 95% │
         │ Failure: 5%  │
         └──────┬───────┘
                │
                │ Failure rate > 50%
                │ (50 of 100 requests fail)
                ↓
         ┌──────────────┐
         │    OPEN      │
         │ (Fail fast)  │
         │              │
         │ All requests │
         │ rejected ✗   │
         │              │
         │ Timer: 30s   │
         └──────┬───────┘
                │
                │ After 30 seconds
                ↓
         ┌──────────────┐
         │  HALF-OPEN   │
         │  (Testing)   │
         │              │
         │ Allow 10     │
         │ test requests│
         └──────┬───────┘
                │
       ┌────────┴────────┐
       ↓                 ↓
   8+ succeed       <8 succeed
       │                 │
       ↓                 ↓
   Back to           Back to
   CLOSED            OPEN
       │                 │
       ↓                 ↓
   Success!      Try again in 30s

Metrics:
- Time in CLOSED: 99% (healthy system)
- Time in OPEN: 0.5% (dependency down)
- Time in HALF-OPEN: 0.5% (testing recovery)

Availability Impact:
- Without circuit breaker: Entire system down (cascading failure)
- With circuit breaker: System degraded but available (fallback)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Business Impact:**
- **Downtime = Lost Revenue:** Amazon loses $220K/minute during outages
- **SLA Penalties:** Cloud providers pay credits for SLA violations
- **Customer Trust:** One major outage = long-term reputation damage
- **Competitive Advantage:** 99.99% vs 99.9% = 10x better uptime

**User Experience:**
- Users expect **always-on** services
- Mobile apps make availability more critical (can't troubleshoot)
- Global users expect low latency (multi-region)

---

### **How It Works (Simple Summary)**

**Availability = Eliminate Single Points of Failure**

**Core Patterns:**

1. **Active-Passive (Failover):**
   - 2 servers: 1 active, 1 standby
   - Failover time: 30-60 seconds
   - Use: Stateful systems (databases)

2. **Active-Active (Load Balancing):**
   - 3+ servers: All active
   - Failover time: 0 seconds
   - Use: Stateless APIs

3. **Multi-Region:**
   - Full stack in 3+ regions
   - Survives region failure
   - Use: Global, mission-critical systems

4. **Circuit Breaker:**
   - Fail fast when dependency down
   - Prevents cascading failures
   - Use: All external service calls

5. **Graceful Degradation:**
   - Reduce features under load
   - Maintain core functionality
   - Use: User-facing applications

---

### **Key Trade-Offs**

| **Pattern** | **Availability** | **Cost** | **Complexity** | **Failover Time** |
|-------------|-----------------|----------|---------------|------------------|
| **Active-Passive** | 99.9% | $$ | Low | 30-60s |
| **Active-Active** | 99.99% | $$$ | Medium | 0s |
| **Multi-Region** | 99.999% | $$$$ | High | 0-60s |
| **Circuit Breaker** | +0.5% | $ | Low | Instant |
| **Graceful Degradation** | +1% | $ | Medium | Instant |

---

### **Decision Framework**

```
TARGET SLA → PATTERN SELECTION
═══════════════════════════════

99% (Two Nines):
- Pattern: Single server + backups
- Cost: $
- Use: Internal tools

99.9% (Three Nines):
- Pattern: Active-passive (2 servers)
- Cost: $$
- Use: Standard web apps

99.95% (Four Nines - 0.05%):
- Pattern: Active-active (3+ servers)
- Cost: $$$
- Use: E-commerce, SaaS

99.99% (Four Nines):
- Pattern: Active-active + multi-AZ
- Cost: $$$
- Use: Business-critical

99.999% (Five Nines):
- Pattern: Multi-region active-active
- Cost: $$$$
- Use: Financial, payments
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Always Start with Requirements**
- "What's your target SLA?"
- "99.9%, 99.99%, or 99.999%?"
- Shows you understand trade-offs

✅ **Discuss Multiple Patterns**
- "I'd use active-active for API layer (instant failover)"
- "And active-passive for database (single writer)"
- "Wrapped in circuit breakers to prevent cascading failures"

✅ **Quantify Everything**
- "99.99% = 4.38 minutes downtime/month"
- "Active-active: 0 seconds failover"
- "Active-passive: 30 seconds failover"

✅ **Address Failure Scenarios**
- "If one server fails..."
- "If entire region fails..."
- "If external dependency fails..."

✅ **Reference Real Systems**
- "Netflix uses multi-region active-active"
- "Stripe achieves five nines through..."
- "Facebook shifts traffic dynamically..."

✅ **Consider Cost**
- "Multi-region is 3x infrastructure cost"
- "But worth it for mission-critical systems"
- "For this use case, active-active is sufficient"

**The interviewer wants to see** that you can design for availability systematically, understand the trade-offs, and choose patterns appropriate for the business requirements and budget.

---

**End of Topic 15: Availability Patterns**
