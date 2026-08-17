# 14. Availability, Reliability & Durability

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Availability, Reliability, and Durability** are three **distinct but related** non-functional requirements that define how systems behave under failure, over time, and under load. They are **critical pillars** of any large-scale distributed system and are frequently confused in interviews.

---

### **Availability**

**Definition:** The percentage of time a system is **operational and accessible** to users.

**Formula:**
```
Availability = (Uptime / Total Time) × 100%
```

**Example:**
- **99.9% availability** (three nines) = 43.8 minutes downtime/month
- **99.99% availability** (four nines) = 4.38 minutes downtime/month
- **99.999% availability** (five nines) = 26 seconds downtime/month

**Real-World Context:**
- "Can users access the service **right now**?"
- Focuses on **minimizing downtime**
- Measured over a period (daily, monthly, yearly)

---

### **Reliability**

**Definition:** The probability that a system will **perform its intended function correctly** without failure over a specified period.

**Key Insight:** A system can be **available but unreliable**.

**Example:**
```
System A: 99.9% available, returns wrong data 10% of the time → Unreliable!
System B: 99.9% available, returns correct data 100% of the time → Reliable!
```

**Real-World Context:**
- "Does the service **work correctly** when it's up?"
- "Can I **trust** the results?"
- Focuses on **correctness and consistency**

**Metrics:**
- **MTBF (Mean Time Between Failures):** Average time between failures
- **MTTF (Mean Time To Failure):** Expected time until next failure
- **MTTR (Mean Time To Recovery):** Average time to recover from failure

**Formula:**
```
Reliability = MTBF / (MTBF + MTTR)
```

---

### **Durability**

**Definition:** The guarantee that once data is **successfully written**, it will **not be lost** even in the event of hardware failure, power outage, or disaster.

**Key Insight:** Durability is about **data persistence**, not system uptime.

**Example:**
```
Database A: Writes to memory only → Not durable (power loss = data loss)
Database B: Writes to disk + replicates to 3 nodes → Durable
```

**Real-World Context:**
- "Will my data **survive** failures?"
- "Can I **recover** data after a disaster?"
- Focuses on **data integrity and persistence**

**Levels of Durability:**
- **99.999999999% (11 nines):** Standard for AWS S3 (lose 1 object per 100 billion per year)
- **99.9999999% (9 nines):** High durability storage
- **99.999% (5 nines):** Replicated databases

---

### **The Key Distinction**

| **Concept**       | **Question**                          | **Focus**             | **Example**                                |
|-------------------|---------------------------------------|-----------------------|--------------------------------------------|
| **Availability**  | Can I **access** the system?          | Uptime                | Service responds (even if wrong data)      |
| **Reliability**   | Does it **work correctly**?           | Correctness           | Service returns accurate results           |
| **Durability**    | Will my data **survive** failures?    | Data persistence      | Data not lost after disk failure           |

---

### **Interview Analogy**

**Think of a car:**

- **Availability:** Can you **start** the car? (Is it operational?)
- **Reliability:** Does the car **drive smoothly** without breaking down? (Does it work correctly?)
- **Durability:** If the car crashes, is the **black box** data preserved? (Is data persistent?)

**A system can be:**
- ✅ **Available but unreliable:** Website loads, but shows wrong prices
- ✅ **Reliable but unavailable:** When it's up, it works perfectly, but it's often down
- ✅ **Available and reliable but not durable:** Returns correct data, but loses data on crash

**FAANG companies require all three:** High availability (99.99%+), high reliability (correct results), and high durability (11 nines for data).

---

### **Why These Matter at Scale**

**Business Impact:**

**Availability:**
- Amazon: 1 minute downtime = $220,000 revenue loss
- Google: 5 minutes downtime = $545,000 revenue loss
- Target: 99.99% availability (4.38 minutes/month) vs 99.9% (43.8 minutes/month) = $2M+/year difference

**Reliability:**
- Incorrect payment processing → Chargebacks, legal liability
- Wrong recommendation → User distrust, churn
- Corrupted data → Manual cleanup, customer support cost

**Durability:**
- Losing user data → Legal liability (GDPR), reputation damage
- Financial transaction loss → Regulatory penalties, lawsuits
- S3 data loss → Business-ending event for customers

**User Trust:**
- Users tolerate occasional downtime (availability)
- Users **cannot tolerate** data loss (durability)
- Users **cannot tolerate** incorrect results (reliability)

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Availability Deep-Dive**

#### **Availability Calculation**

**Formula:**
```
Availability = Uptime / (Uptime + Downtime)
```

**Standard SLA Tiers:**

| **SLA**       | **Uptime %** | **Downtime/Year** | **Downtime/Month** | **Downtime/Week** | **Use Case**                    |
|---------------|--------------|-------------------|--------------------|-------------------|---------------------------------|
| **Two nines** | 99%          | 3.65 days         | 7.2 hours          | 1.68 hours        | Internal tools                  |
| **Three nines** | 99.9%      | 8.76 hours        | 43.8 minutes       | 10.1 minutes      | Standard web services           |
| **Four nines** | 99.99%      | 52.56 minutes     | 4.38 minutes       | 1.01 minutes      | Business-critical services      |
| **Five nines** | 99.999%     | 5.26 minutes      | 26 seconds         | 6 seconds         | Mission-critical (payments)     |
| **Six nines** | 99.9999%     | 31.5 seconds      | 2.6 seconds        | 0.6 seconds       | Financial trading systems       |

---

#### **Availability Patterns**

**1. Redundancy (Eliminate Single Points of Failure)**

```
Single Server (No Redundancy):
[Client] → [Server] → [Database]
             ↓ FAILS
         ALL DOWN (0% availability during failure)

Active-Passive (Failover):
[Client] → [Load Balancer] → [Primary Server] → [Database]
                           → [Standby Server] (idle)
                           
If primary fails: Standby activated (downtime: 30-60 seconds)

Active-Active (High Availability):
[Client] → [Load Balancer] → [Server 1] → [Database]
                           → [Server 2]
                           → [Server 3]
                           
If one server fails: Traffic rerouted instantly (downtime: 0 seconds)
```

**Java Implementation: Health Checks**

```java
@RestController
public class HealthCheckController {
    @Autowired
    private DataSource dataSource;
    
    @Autowired
    private RedisTemplate<String, String> redis;
    
    @GetMapping("/health")
    public ResponseEntity<HealthStatus> health() {
        HealthStatus status = new HealthStatus();
        
        // Check database connectivity
        try {
            dataSource.getConnection().close();
            status.setDatabase("UP");
        } catch (Exception e) {
            status.setDatabase("DOWN");
            status.setHealthy(false);
        }
        
        // Check Redis connectivity
        try {
            redis.opsForValue().get("health-check");
            status.setCache("UP");
        } catch (Exception e) {
            status.setCache("DOWN");
            status.setHealthy(false);
        }
        
        // Check disk space
        long freeSpace = new File("/").getFreeSpace();
        long totalSpace = new File("/").getTotalSpace();
        double freePercent = (freeSpace * 100.0) / totalSpace;
        
        if (freePercent < 10) {
            status.setDisk("LOW_SPACE");
            status.setHealthy(false);
        } else {
            status.setDisk("UP");
        }
        
        if (status.isHealthy()) {
            return ResponseEntity.ok(status);
        } else {
            return ResponseEntity.status(503).body(status);  // Service Unavailable
        }
    }
}

// Load balancer checks /health every 5 seconds
// If 503: Remove server from pool
// If 200: Keep server in pool
```

---

**2. Multi-Region Deployment**

```
Single Region:
US-EAST-1 → If AWS outage: ALL DOWN

Multi-Region (Active-Active):
[Global Load Balancer / DNS]
        ↓
        ├─> US-EAST-1 (50% traffic)
        ├─> EU-WEST-1 (30% traffic)
        └─> AP-SOUTH-1 (20% traffic)

If US-EAST-1 fails: Redirect 100% to EU-WEST + AP-SOUTH
Downtime: 0 seconds (DNS failover: 30-60 seconds)
```

**Kubernetes Multi-Region Setup:**

```yaml
# Global load balancer routes to multiple regions
apiVersion: v1
kind: Service
metadata:
  name: api-service
  annotations:
    external-dns.alpha.kubernetes.io/hostname: api.company.com
    external-dns.alpha.kubernetes.io/ttl: "60"  # Fast DNS propagation
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
    - port: 80
      targetPort: 8080

---
# US-EAST-1 Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-us-east
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api
      region: us-east
  template:
    metadata:
      labels:
        app: api
        region: us-east
    spec:
      containers:
        - name: api
          image: company/api:v1.0
          resources:
            requests:
              memory: "256Mi"
              cpu: "500m"
            limits:
              memory: "512Mi"
              cpu: "1000m"

---
# EU-WEST-1 Deployment (identical structure)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-eu-west
  namespace: production
spec:
  replicas: 10
  selector:
    matchLabels:
      app: api
      region: eu-west
  # ... same as above
```

---

**3. Circuit Breaker (Prevent Cascading Failures)**

```java
@Configuration
public class ResilienceConfig {
    
    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)                       // Open if 50% fail
            .waitDurationInOpenState(Duration.ofSeconds(30)) // Stay open for 30s
            .slidingWindowSize(100)                         // Last 100 calls
            .permittedNumberOfCallsInHalfOpenState(10)      // Test with 10 calls
            .build();
        
        return CircuitBreakerRegistry.of(config);
    }
}

@Service
public class PaymentService {
    
    @CircuitBreaker(name = "payment", fallbackMethod = "paymentFallback")
    public PaymentResponse processPayment(PaymentRequest request) {
        // Call external payment API
        return paymentGateway.charge(request);
    }
    
    // Fallback: Queue for later processing
    public PaymentResponse paymentFallback(PaymentRequest request, Exception e) {
        log.warn("Payment service down, queueing request", e);
        
        // Queue for async processing
        kafka.send("payment-retry-topic", request);
        
        return PaymentResponse.builder()
            .status("PENDING")
            .message("Processing, you'll receive confirmation shortly")
            .build();
    }
}

// Result: Even if payment gateway is down, system remains available
// Availability maintained through graceful degradation
```

---

### **Reliability Deep-Dive**

#### **Reliability Metrics**

**1. Mean Time Between Failures (MTBF)**

```
MTBF = Total Operational Time / Number of Failures

Example:
- System runs for 10,000 hours
- Experiences 10 failures
- MTBF = 10,000 / 10 = 1,000 hours

Interpretation: On average, expect failure every 1,000 hours (41.6 days)
```

**2. Mean Time To Recovery (MTTR)**

```
MTTR = Total Downtime / Number of Failures

Example:
- 10 failures
- Total downtime: 200 minutes
- MTTR = 200 / 10 = 20 minutes

Interpretation: On average, takes 20 minutes to recover from failure
```

**3. Reliability Calculation**

```
Reliability = MTBF / (MTBF + MTTR)

Example:
- MTBF = 1,000 hours (41.6 days)
- MTTR = 0.33 hours (20 minutes)
- Reliability = 1,000 / (1,000 + 0.33) = 99.97%

Interpretation: System works correctly 99.97% of the time
```

---

#### **Improving Reliability**

**1. Idempotency (Prevent Duplicate Operations)**

**Problem: Retry without idempotency**
```
User clicks "Submit Order"
→ Request 1: Times out (network issue)
→ Client retries
→ Request 2: Succeeds
→ User charged twice! (Unreliable)
```

**Solution: Idempotent API**
```java
@RestController
public class OrderController {
    
    @Autowired
    private OrderRepository orderRepository;
    
    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(
        @RequestBody OrderRequest request,
        @RequestHeader("Idempotency-Key") String idempotencyKey) {
        
        // Check if order already exists with this key
        Optional<Order> existing = orderRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            log.info("Duplicate request detected, returning existing order");
            return ResponseEntity.ok(existing.get());  // Return same result
        }
        
        // Create new order
        Order order = Order.builder()
            .idempotencyKey(idempotencyKey)
            .userId(request.getUserId())
            .items(request.getItems())
            .total(request.getTotal())
            .status("PENDING")
            .build();
        
        orderRepository.save(order);
        
        return ResponseEntity.status(201).body(order);
    }
}

// Client generates unique key per operation
String idempotencyKey = UUID.randomUUID().toString();

// First request: Creates order
POST /orders
Idempotency-Key: abc-123-def-456

// Retry (network issue): Returns same order (no duplicate)
POST /orders
Idempotency-Key: abc-123-def-456

Result: Reliable (no duplicate charges)
```

---

**2. Exactly-Once Semantics (Message Processing)**

**Problem: At-Least-Once (Unreliable)**
```
Kafka sends message → Consumer processes → Consumer crashes before commit
→ Message redelivered → Processed twice (duplicate charge!)
```

**Solution: Exactly-Once Processing**
```java
@Service
public class PaymentProcessor {
    
    @Autowired
    private PaymentRepository paymentRepository;
    
    @Autowired
    private EntityManager entityManager;
    
    @KafkaListener(topics = "payments", groupId = "payment-processor")
    @Transactional
    public void processPayment(ConsumerRecord<String, PaymentEvent> record) {
        String messageId = record.key();  // Unique message ID
        long offset = record.offset();
        
        // Check if already processed (database as source of truth)
        if (paymentRepository.existsByMessageId(messageId)) {
            log.info("Message {} already processed, skipping", messageId);
            return;  // Idempotent: Skip duplicate
        }
        
        // Process payment
        PaymentEvent event = record.value();
        Payment payment = Payment.builder()
            .messageId(messageId)
            .userId(event.getUserId())
            .amount(event.getAmount())
            .status("COMPLETED")
            .processedAt(Instant.now())
            .build();
        
        paymentRepository.save(payment);
        
        // Commit offset in same transaction (atomic)
        entityManager.flush();
        
        log.info("Payment {} processed exactly once", messageId);
    }
}

// Database schema
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    message_id VARCHAR(255) UNIQUE NOT NULL,  -- Prevents duplicates
    user_id BIGINT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP NOT NULL
);

Result: Each message processed exactly once (reliable)
```

---

**3. Data Validation (Ensure Correctness)**

```java
@Service
public class OrderValidationService {
    
    public void validateOrder(Order order) throws ValidationException {
        List<String> errors = new ArrayList<>();
        
        // Business rule: Order total must match item prices
        BigDecimal calculatedTotal = order.getItems().stream()
            .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (!order.getTotal().equals(calculatedTotal)) {
            errors.add(String.format(
                "Order total mismatch: claimed=%s, calculated=%s",
                order.getTotal(), calculatedTotal
            ));
        }
        
        // Business rule: Stock availability
        for (OrderItem item : order.getItems()) {
            int availableStock = inventoryService.getStock(item.getProductId());
            if (item.getQuantity() > availableStock) {
                errors.add(String.format(
                    "Insufficient stock for product %d: requested=%d, available=%d",
                    item.getProductId(), item.getQuantity(), availableStock
                ));
            }
        }
        
        // Business rule: User credit limit
        BigDecimal userCredit = userService.getAvailableCredit(order.getUserId());
        if (order.getTotal().compareTo(userCredit) > 0) {
            errors.add(String.format(
                "Insufficient credit: order=%s, available=%s",
                order.getTotal(), userCredit
            ));
        }
        
        if (!errors.isEmpty()) {
            throw new ValidationException("Order validation failed", errors);
        }
    }
}

// Result: Only valid orders processed (reliable)
```

---

**4. Distributed Transactions (Maintain Consistency)**

**Saga Pattern (Eventual Consistency)**
```java
@Service
public class OrderSaga {
    
    @Autowired
    private KafkaTemplate<String, Object> kafka;
    
    @Transactional
    public void createOrder(OrderRequest request) {
        // Step 1: Create order
        Order order = orderRepository.save(new Order(request));
        kafka.send("order-created", new OrderCreatedEvent(order));
        
        // Subsequent steps handled by event listeners
    }
    
    @KafkaListener(topics = "order-created")
    @Transactional
    public void reserveInventory(OrderCreatedEvent event) {
        try {
            inventoryService.reserve(event.getOrderId(), event.getItems());
            kafka.send("inventory-reserved", new InventoryReservedEvent(event.getOrderId()));
        } catch (InsufficientStockException e) {
            // Compensating transaction: Cancel order
            kafka.send("order-cancelled", new OrderCancelledEvent(event.getOrderId(), "Out of stock"));
        }
    }
    
    @KafkaListener(topics = "inventory-reserved")
    @Transactional
    public void processPayment(InventoryReservedEvent event) {
        try {
            paymentService.charge(event.getOrderId());
            kafka.send("payment-completed", new PaymentCompletedEvent(event.getOrderId()));
        } catch (PaymentFailedException e) {
            // Compensating transactions:
            // 1. Release inventory
            kafka.send("inventory-released", new InventoryReleasedEvent(event.getOrderId()));
            // 2. Cancel order
            kafka.send("order-cancelled", new OrderCancelledEvent(event.getOrderId(), "Payment failed"));
        }
    }
    
    @KafkaListener(topics = "payment-completed")
    @Transactional
    public void completeOrder(PaymentCompletedEvent event) {
        orderRepository.updateStatus(event.getOrderId(), "COMPLETED");
        kafka.send("order-completed", new OrderCompletedEvent(event.getOrderId()));
    }
}

// Saga Coordinator tracks state
@Entity
public class SagaState {
    @Id
    private String sagaId;
    private String orderId;
    private String currentStep;  // CREATED, INVENTORY_RESERVED, PAYMENT_COMPLETED, COMPLETED
    private String status;       // IN_PROGRESS, COMPLETED, FAILED
    private List<String> completedSteps;
    private Instant createdAt;
    private Instant updatedAt;
}

// Result: Eventually consistent, reliable (compensating transactions handle failures)
```

---

### **Durability Deep-Dive**

#### **Durability Guarantees**

**1. Synchronous Replication (Strong Durability)**

```
Write Request → Primary Node
             ↓
          Write to disk
             ↓
          Replicate to Secondary 1 (sync)
             ↓
          Replicate to Secondary 2 (sync)
             ↓
          ACK to client (after all replicas confirm)

Durability: High (data on 3 nodes)
Latency: High (wait for all replicas)
```

**PostgreSQL Synchronous Replication:**
```sql
-- postgresql.conf
wal_level = replica
max_wal_senders = 10
synchronous_commit = on
synchronous_standby_names = 'standby1,standby2'

-- Writes wait for confirmation from both standbys
-- Result: Strong durability, higher latency (100ms+)
```

---

**2. Asynchronous Replication (Eventual Durability)**

```
Write Request → Primary Node
             ↓
          Write to disk
             ↓
          ACK to client (immediately)
             ↓
          Replicate to secondaries (async, in background)

Durability: Medium (data on 1 node initially)
Latency: Low (don't wait for replication)
Risk: If primary fails before replication, data lost
```

**MySQL Asynchronous Replication:**
```sql
-- my.cnf (primary)
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW

-- my.cnf (replica)
server-id = 2
relay_log = /var/log/mysql/relay-log
read_only = 1

-- Writes acknowledged immediately
-- Replication happens in background
-- Result: Low latency, but risk of data loss if primary fails
```

---

**3. Quorum-Based Durability (Tunable)**

```
Write Request → Coordinator
             ↓
          Send to 3 replicas in parallel
             ↓
          Wait for W=2 confirmations (quorum)
             ↓
          ACK to client

Durability: High (data on 2+ nodes)
Latency: Medium (wait for 2 of 3)
Tunable: Adjust W for latency vs durability trade-off
```

**Cassandra Quorum Write:**
```java
@Configuration
public class CassandraConfig {
    
    @Bean
    public CqlSession cqlSession() {
        return CqlSession.builder()
            .addContactPoint(new InetSocketAddress("cassandra1", 9042))
            .withLocalDatacenter("datacenter1")
            .withKeyspace("orders")
            .build();
    }
}

@Repository
public class OrderRepository {
    @Autowired
    private CqlSession session;
    
    public void saveOrder(Order order) {
        String query = "INSERT INTO orders (id, user_id, total, status) VALUES (?, ?, ?, ?)";
        
        PreparedStatement statement = session.prepare(query);
        BoundStatement bound = statement.bind(
            order.getId(),
            order.getUserId(),
            order.getTotal(),
            order.getStatus()
        );
        
        // Set consistency level: QUORUM (W=2 for RF=3)
        bound.setConsistencyLevel(ConsistencyLevel.QUORUM);
        
        session.execute(bound);
        
        // Data written to 2 of 3 replicas before ACK
        // Result: Durable (survives 1 node failure)
    }
}
```

**Consistency Levels:**
| **Level**     | **Writes** | **Durability** | **Latency** | **Use Case**          |
|---------------|------------|----------------|-------------|-----------------------|
| **ONE**       | 1 of 3     | Low            | Low         | High throughput       |
| **QUORUM**    | 2 of 3     | High           | Medium      | Balanced              |
| **ALL**       | 3 of 3     | Highest        | High        | Critical data         |

---

**4. Write-Ahead Log (WAL) for Durability**

```
Application writes data
       ↓
   Write to WAL (sequential disk write, fast)
       ↓
   ACK to client (data durable)
       ↓
   Apply to data structures in memory (async)
       ↓
   Flush to disk in batches (background)

If crash: Replay WAL to recover
Result: Fast writes (sequential), strong durability
```

**Kafka Durability Configuration:**
```java
@Configuration
public class KafkaProducerConfig {
    
    @Bean
    public ProducerFactory<String, Order> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "kafka1:9092,kafka2:9092,kafka3:9092");
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        
        // Durability settings
        config.put(ProducerConfig.ACKS_CONFIG, "all");  // Wait for all in-sync replicas
        config.put(ProducerConfig.RETRIES_CONFIG, 3);    // Retry on failure
        config.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1); // Ordering guarantee
        
        return new DefaultKafkaProducerFactory<>(config);
    }
}

@Service
public class OrderEventPublisher {
    @Autowired
    private KafkaTemplate<String, Order> kafka;
    
    public void publishOrder(Order order) throws Exception {
        SendResult<String, Order> result = kafka.send("orders", order.getId(), order).get();
        
        RecordMetadata metadata = result.getRecordMetadata();
        log.info("Order {} written to Kafka: partition={}, offset={}", 
            order.getId(), metadata.partition(), metadata.offset());
        
        // Data now durable (written to 3 brokers' WAL)
    }
}

// Topic configuration (must have min.insync.replicas)
kafka-topics --create --topic orders \
  --partitions 10 \
  --replication-factor 3 \
  --config min.insync.replicas=2

Result: Message durable after 2 of 3 brokers acknowledge
```

---

**5. Snapshots + WAL (Redis Example)**

```
Redis (In-Memory Database):

Strategy 1: RDB (Snapshot)
- Full snapshot every N minutes
- Fast recovery
- Data loss: Up to N minutes

Strategy 2: AOF (Append-Only File / WAL)
- Log every write command
- Durable (configurable)
- Slower recovery (replay all commands)

Strategy 3: RDB + AOF (Hybrid)
- Snapshot every 5 minutes
- WAL since last snapshot
- Recovery: Load snapshot + replay WAL
- Best of both worlds
```

**Redis Durability Configuration:**
```yaml
# redis.conf

# RDB Snapshots
save 900 1      # Snapshot if 1 write in 900 seconds
save 300 10     # Snapshot if 10 writes in 300 seconds
save 60 10000   # Snapshot if 10,000 writes in 60 seconds

# AOF (Append-Only File)
appendonly yes
appendfsync everysec  # Fsync to disk every second

# Hybrid: Use both
aof-use-rdb-preamble yes

# Durability levels:
# appendfsync always   → Fsync every write (slowest, most durable)
# appendfsync everysec → Fsync every second (balanced)
# appendfsync no       → OS decides when to fsync (fastest, least durable)
```

**Java Client Configuration:**
```java
@Configuration
public class RedisConfig {
    
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName("redis-primary");
        config.setPort(6379);
        
        return new LettuceConnectionFactory(config);
    }
    
    @Bean
    public RedisTemplate<String, Object> redisTemplate() {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(redisConnectionFactory());
        return template;
    }
}

@Service
public class SessionService {
    @Autowired
    private RedisTemplate<String, Session> redis;
    
    public void saveSession(Session session) {
        redis.opsForValue().set("session:" + session.getId(), session, 1, TimeUnit.HOURS);
        
        // Data written to Redis (durable if AOF enabled)
        // If Redis crashes: Session recovered from AOF on restart
    }
}
```

---

### **Trade-Offs: Availability vs Reliability vs Durability**

```
Scenario 1: Prioritize Availability (Social Media Feed)
═══════════════════════════════════════════════════════
- Show cached/stale data if database down (available, but maybe unreliable)
- Async replication (available, risk losing recent posts)
- Result: Users can always access feed, but data might be slightly stale

Scenario 2: Prioritize Reliability (Banking Transaction)
════════════════════════════════════════════════════════
- Validate every transaction (reject if any doubt)
- Synchronous replication (wait for confirmation)
- Result: Correct balances always, but higher latency

Scenario 3: Prioritize Durability (Financial Records)
══════════════════════════════════════════════════════
- Synchronous replication to 3+ nodes
- Write-ahead log + snapshots
- Result: Data never lost, but higher latency and cost
```

**CAP Theorem Context:**
```
CAP Theorem: Can't have all three (Consistency, Availability, Partition Tolerance)

CP System (Prioritize Consistency + Partition Tolerance):
- Strong reliability and durability
- Sacrifice availability during network partition
- Example: Banking systems (refuse requests if can't guarantee correctness)

AP System (Prioritize Availability + Partition Tolerance):
- Always available
- Sacrifice consistency (eventual consistency)
- Example: Social media feeds (show stale data, sync later)

CA System (Prioritize Consistency + Availability):
- Not realistic in distributed systems (partitions happen)
- Only viable in single-node systems
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### **Example: E-Commerce Platform SLA Design**

**Requirements:**
- 100M users
- 10M daily active users (DAU)
- 5M orders/day
- Target SLA: 99.95% availability (four nines)

---

### **Step 1: Calculate Downtime Budget**

```
99.95% availability = 0.05% downtime allowed

Monthly downtime budget:
= 30 days × 24 hours × 60 minutes × 0.0005
= 21.6 minutes/month

Weekly: 5 minutes
Daily: 43 seconds
```

---

### **Step 2: Component Availability**

**Serial Components (Availability Multiplies):**
```
System = Client → API Gateway → Service → Database

If each component: 99.99% availability
System availability = 0.9999^4 = 99.96%

Close to target (99.95%)!
```

**Parallel Components (Availability Improves):**
```
Active-Active Servers (3 servers, any 1 can serve):
Probability all fail = (0.0001)^3 = 0.000000001
Availability = 99.9999999% (9 nines!)

Result: Redundancy dramatically improves availability
```

---

### **Step 3: Database Durability**

**Goal: 99.999999999% (11 nines) durability**

```
Replication Factor: 3 (data on 3 nodes)
Node failure rate: 0.1% per year (1 in 1000 nodes)

Probability of losing all 3 replicas:
= (0.001)^3 = 0.000000001 = 0.0000001%

Durability = 99.99999999% (10 nines)

Add cross-region replication (6 total replicas):
= (0.001)^6 = 0.000000000000000001
= 99.999999999999999% (15 nines!)
```

**Storage Cost:**
```
Data size: 100 TB
Replication factor: 3
Total storage: 100 TB × 3 = 300 TB

Cost (AWS EBS):
- 300 TB × $0.10/GB/month
- = 300,000 GB × $0.10 = $30,000/month

Worth it? YES (cost of data loss >> $30K)
```

---

### **Step 4: Reliability (MTBF/MTTR)**

**Current State:**
```
Historical data:
- 10 incidents/year
- Average incident duration: 30 minutes

MTBF = (365 days × 24 hours - 10 × 0.5 hours) / 10
     = (8760 - 5) / 10
     = 875.5 hours (36.5 days)

MTTR = (10 incidents × 30 minutes) / 10
     = 30 minutes

Availability = MTBF / (MTBF + MTTR)
             = 875.5 / (875.5 + 0.5)
             = 99.94%

Close to target (99.95%)!
```

**Improvement: Reduce MTTR**
```
Invest in:
- Automated failover (30 min → 5 min)
- Better monitoring (detect faster)
- Runbooks (faster response)

New MTTR = 5 minutes = 0.083 hours

New Availability = 875.5 / (875.5 + 0.083)
                 = 99.99%

Exceeds target!
```

---

### **Step 5: Cost Analysis**

| **Investment**               | **Cost/Month** | **Benefit**                     |
|------------------------------|----------------|---------------------------------|
| Multi-region (3 regions)     | $150,000       | 99.95% → 99.99% availability    |
| Database replication (RF=3)  | $30,000        | 99% → 99.9999999% durability    |
| Automated failover           | $5,000         | MTTR: 30 min → 5 min            |
| Load balancers (redundant)   | $3,000         | Eliminate single point of failure|
| Monitoring & alerts          | $2,000         | Faster incident detection       |
| **Total**                    | **$190,000**   | **Meet 99.95% SLA**             |

**Revenue Impact:**
```
Revenue: $100M/year
Downtime cost: $100M / 525,600 minutes = $190/minute

Old SLA (99.9%): 43.8 min/month downtime = $8,300/month loss
New SLA (99.95%): 21.6 min/month downtime = $4,100/month loss

Savings: $4,200/month
Cost: $190,000/month

ROI: Negative purely on downtime cost, BUT:
- Customer trust (intangible, huge)
- No reputation damage from outages
- Competitive advantage (better SLA than competitors)

Worth it: YES
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Storage Systems Ranked by Durability**

| **System**              | **Durability**     | **How Achieved**                                    | **Use Case**                |
|-------------------------|--------------------|----------------------------------------------------|----------------------------|
| **AWS S3**              | 99.999999999% (11 nines) | Replication across multiple AZs/regions, checksums | Long-term object storage   |
| **Google Cloud Storage**| 99.999999999% (11 nines) | Erasure coding, geo-replication                    | Backup, archival           |
| **Cassandra**           | 99.999999% (9 nines)     | RF=3, quorum writes, hinted handoff                | High-write workloads       |
| **PostgreSQL (replicated)** | 99.9999% (6 nines)   | Synchronous replication to 2+ replicas             | Transactional data         |
| **Redis (AOF)**         | 99.99% (4 nines)         | Append-only file, fsync every second               | Session store, cache       |
| **Redis (RDB only)**    | 99% (2 nines)            | Snapshot every N minutes                           | Non-critical cache         |
| **Memcached**           | 0% (No durability)       | In-memory only, no persistence                     | Ephemeral cache            |

---

### **Choosing Storage Based on Requirements**

**Scenario 1: User Uploaded Photos**
```
Requirements:
- Durability: 99.999999999% (can't lose user photos!)
- Availability: 99.9% (acceptable if briefly unavailable)
- Cost: Optimize for cheap storage

Choice: AWS S3
- 11 nines durability
- Automatic replication across availability zones
- Cheap ($0.023/GB/month)
```

**Implementation:**
```java
@Service
public class PhotoStorageService {
    @Autowired
    private AmazonS3 s3Client;
    
    private static final String BUCKET = "user-photos";
    
    public String uploadPhoto(MultipartFile file, Long userId) {
        String key = String.format("%d/%s", userId, UUID.randomUUID());
        
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentType(file.getContentType());
        metadata.setContentLength(file.getSize());
        
        // Upload to S3 with server-side encryption
        PutObjectRequest request = new PutObjectRequest(
            BUCKET, 
            key, 
            file.getInputStream(), 
            metadata
        ).withSSEAwsKeyManagementParams(
            new SSEAwsKeyManagementParams()  // Encrypt at rest
        );
        
        s3Client.putObject(request);
        
        // Generate CloudFront URL for fast access
        return String.format("https://cdn.example.com/%s", key);
    }
}

// S3 configuration for durability
// - Versioning: Enabled (recover from accidental deletes)
// - Cross-region replication: Enabled (disaster recovery)
// - Lifecycle policy: Move to Glacier after 90 days (cost optimization)
```

---

**Scenario 2: Shopping Cart (Session Data)**
```
Requirements:
- Availability: 99.99% (users need cart always)
- Durability: 99.99% (losing cart is bad, but not catastrophic)
- Latency: <5ms (fast user experience)

Choice: Redis with AOF
- In-memory (fast)
- AOF provides durability
- Replication for availability
```

**Implementation:**
```java
@Configuration
public class RedisConfig {
    
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        // Redis Sentinel for high availability
        RedisSentinelConfiguration sentinelConfig = new RedisSentinelConfiguration()
            .master("mymaster")
            .sentinel("sentinel1", 26379)
            .sentinel("sentinel2", 26379)
            .sentinel("sentinel3", 26379);
        
        return new LettuceConnectionFactory(sentinelConfig);
    }
}

@Service
public class ShoppingCartService {
    @Autowired
    private RedisTemplate<String, Cart> redis;
    
    public void saveCart(Long userId, Cart cart) {
        String key = "cart:" + userId;
        redis.opsForValue().set(key, cart, 7, TimeUnit.DAYS);
        
        // Data persisted to Redis (AOF ensures durability)
        // Sentinel ensures availability (auto-failover)
    }
    
    public Cart getCart(Long userId) {
        String key = "cart:" + userId;
        Cart cart = redis.opsForValue().get(key);
        
        if (cart == null) {
            // Fallback: Load from database (if Redis down)
            cart = cartRepository.findByUserId(userId).orElse(new Cart());
        }
        
        return cart;
    }
}

// Redis configuration (redis.conf)
// appendonly yes
// appendfsync everysec
// save 900 1
// save 300 10
```

---

**Scenario 3: Financial Transactions**
```
Requirements:
- Durability: 99.99999999% (absolutely cannot lose transactions)
- Reliability: 100% (no incorrect transactions)
- Availability: 99.99% (high, but correctness over availability)

Choice: PostgreSQL with synchronous replication
- ACID guarantees (reliability)
- Synchronous replication to 3 nodes (durability)
- Strong consistency
```

**Implementation:**
```java
@Configuration
@EnableTransactionManagement
public class DatabaseConfig {
    
    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://postgres-primary:5432/transactions");
        config.setUsername("app");
        config.setPassword(System.getenv("DB_PASSWORD"));
        
        // Connection pooling
        config.setMaximumPoolSize(50);
        config.setConnectionTimeout(10000);
        
        return new HikariDataSource(config);
    }
}

@Service
public class TransactionService {
    
    @Autowired
    private TransactionRepository repository;
    
    @Transactional(isolation = Isolation.SERIALIZABLE)  // Strongest isolation
    public void transfer(Long fromAccount, Long toAccount, BigDecimal amount) {
        // Pessimistic locking for consistency
        Account from = repository.findByIdForUpdate(fromAccount);
        Account to = repository.findByIdForUpdate(toAccount);
        
        // Validation (reliability)
        if (from.getBalance().compareTo(amount) < 0) {
            throw new InsufficientFundsException();
        }
        
        // Execute transfer
        from.setBalance(from.getBalance().subtract(amount));
        to.setBalance(to.getBalance().add(amount));
        
        repository.save(from);
        repository.save(to);
        
        // Transaction log (audit trail)
        TransactionLog log = TransactionLog.builder()
            .fromAccount(fromAccount)
            .toAccount(toAccount)
            .amount(amount)
            .timestamp(Instant.now())
            .build();
        
        transactionLogRepository.save(log);
        
        // Commit: Synchronously replicated to 3 nodes before ACK
        // Result: Durable, reliable, consistent
    }
}

// PostgreSQL configuration (postgresql.conf)
// synchronous_commit = on
// synchronous_standby_names = 'standby1,standby2'
// wal_level = replica
// max_wal_senders = 10
```

---

### **Multi-Tier Storage Strategy**

```
HOT TIER (Recent data, frequently accessed)
═══════════════════════════════════════════
Storage: Redis (in-memory)
Durability: 99.99% (AOF)
Latency: <1ms
Cost: $$$
Retention: 7 days

↓ Move after 7 days

WARM TIER (Older data, occasionally accessed)
═════════════════════════════════════════════
Storage: PostgreSQL (SSD)
Durability: 99.9999% (replicated)
Latency: 10ms
Cost: $$
Retention: 90 days

↓ Move after 90 days

COLD TIER (Archival, rarely accessed)
══════════════════════════════════════
Storage: AWS S3 Glacier
Durability: 99.999999999% (11 nines)
Latency: Minutes to hours
Cost: $
Retention: Forever
```

**Implementation:**
```java
@Service
public class DataTieringService {
    
    @Scheduled(cron = "0 0 2 * * *")  // Run daily at 2 AM
    public void tierData() {
        // Move hot → warm (Redis → PostgreSQL)
        Instant sevenDaysAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        List<Session> oldSessions = redis.scan("session:*");
        
        for (Session session : oldSessions) {
            if (session.getLastAccessedAt().isBefore(sevenDaysAgo)) {
                // Move to PostgreSQL
                sessionRepository.save(session);
                redis.delete("session:" + session.getId());
                log.info("Moved session {} from Redis to PostgreSQL", session.getId());
            }
        }
        
        // Move warm → cold (PostgreSQL → S3 Glacier)
        Instant ninetyDaysAgo = Instant.now().minus(90, ChronoUnit.DAYS);
        List<Transaction> oldTransactions = transactionRepository.findOlderThan(ninetyDaysAgo);
        
        for (Transaction tx : oldTransactions) {
            // Archive to S3 Glacier
            String json = objectMapper.writeValueAsString(tx);
            s3Client.putObject(new PutObjectRequest(
                "transactions-archive",
                "transactions/" + tx.getId() + ".json",
                new ByteArrayInputStream(json.getBytes())
            ).withStorageClass(StorageClass.Glacier));
            
            // Delete from PostgreSQL (keep reference)
            transactionRepository.delete(tx);
            log.info("Archived transaction {} to S3 Glacier", tx.getId());
        }
    }
}

// Cost savings:
// - Hot tier: $100/GB/month (Redis)
// - Warm tier: $10/GB/month (PostgreSQL SSD)
// - Cold tier: $0.004/GB/month (S3 Glacier)
// Result: 99% cost reduction while maintaining durability!
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Availability Patterns**

#### **1. Active-Passive (Failover)**

```
Architecture:
═══════════

                    ┌──────────────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
                ┌──────────┴──────────┐
                ↓                     ↓
        ┌───────────────┐     ┌───────────────┐
        │ Primary Server│     │Standby Server │
        │   (Active)    │     │   (Passive)   │
        └───────┬───────┘     └───────┬───────┘
                │                     │
                └──────────┬──────────┘
                           ↓
                    ┌─────────────┐
                    │  Database   │
                    └─────────────┘

Normal: Primary handles all traffic
Failure: Load balancer detects failure → Routes to standby
Recovery time: 30-60 seconds (health check interval)
```

**Implementation:**
```yaml
# Kubernetes Deployment with Readiness Probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 2  # Primary + Standby
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
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5        # Check every 5 seconds
            failureThreshold: 3     # Mark unhealthy after 3 failures
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

# If primary fails readiness probe: Traffic routed to standby
```

---

#### **2. Active-Active (Load Balancing)**

```
Architecture:
═══════════

                    ┌──────────────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
                ┌──────────┼──────────┐
                ↓          ↓          ↓
        ┌─────────┐ ┌─────────┐ ┌─────────┐
        │Server 1 │ │Server 2 │ │Server 3 │
        │(Active) │ │(Active) │ │(Active) │
        └────┬────┘ └────┬────┘ └────┬────┘
             │           │           │
             └───────────┼───────────┘
                         ↓
                  ┌─────────────┐
                  │  Database   │
                  └─────────────┘

Normal: Load distributed across all servers
Failure: Traffic redistributed to healthy servers
Recovery time: 0 seconds (instant)
Capacity: Reduced during failure (2 of 3 servers)
```

**Implementation:**
```java
@Configuration
public class LoadBalancerConfig {
    
    @Bean
    @LoadBalanced  // Netflix Ribbon client-side load balancing
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}

@Service
public class OrderService {
    @Autowired
    @LoadBalanced
    private RestTemplate restTemplate;
    
    public Order getOrder(Long orderId) {
        // Ribbon automatically load balances across instances
        String url = "http://order-service/orders/" + orderId;
        return restTemplate.getForObject(url, Order.class);
    }
}

// Spring Cloud LoadBalancer configuration
@Configuration
@LoadBalancerClient(name = "order-service", configuration = LoadBalancerConfig.class)
public class LoadBalancerConfig {
    
    @Bean
    public ServiceInstanceListSupplier instanceSupplier(ConfigurableApplicationContext context) {
        return ServiceInstanceListSupplier.builder()
            .withDiscoveryClient()  // Discover instances from Eureka/Consul
            .withHealthChecks()     // Filter unhealthy instances
            .build(context);
    }
}
```

---

#### **3. Multi-Region (Geo-Redundancy)**

```
Architecture:
═══════════

                   ┌──────────────────┐
                   │ Global DNS / CDN │
                   └────────┬─────────┘
                            │
               ┌────────────┼────────────┐
               ↓            ↓            ↓
        ┏━━━━━━━━━┓  ┏━━━━━━━━━┓  ┏━━━━━━━━━┓
        ┃ US-EAST ┃  ┃ EU-WEST ┃  ┃ AP-SOUTH┃
        ┃         ┃  ┃         ┃  ┃         ┃
        ┃ Full    ┃  ┃ Full    ┃  ┃ Full    ┃
        ┃ Stack   ┃  ┃ Stack   ┃  ┃ Stack   ┃
        ┗━━━━━┯━━━┛  ┗━━━━━┯━━━┛  ┗━━━━━┯━━━┛
              │            │            │
              └────────────┴────────────┘
                         │
                  Cross-region replication

Normal: Route users to nearest region (latency)
Failure: Route users to other regions (availability)
Recovery time: DNS TTL (60 seconds)
```

**AWS Route 53 Failover:**
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
          "Failover": "PRIMARY",
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
          "Failover": "SECONDARY",
          "AliasTarget": {
            "HostedZoneId": "Z0987654321ZYX",
            "DNSName": "api-eu-west-1.elb.amazonaws.com",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }
}

// Route 53 health checks US-EAST-1 every 30 seconds
// If unhealthy: Automatically routes traffic to EU-WEST-1
// Result: 99.99%+ availability (survives region failure)
```

---

### **Reliability Patterns**

#### **1. Retry with Exponential Backoff**

```java
@Service
public class ResilientPaymentService {
    
    @Retryable(
        value = {PaymentGatewayException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public PaymentResponse processPayment(PaymentRequest request) {
        return paymentGateway.charge(request);
    }
    
    @Recover
    public PaymentResponse recover(PaymentGatewayException e, PaymentRequest request) {
        log.error("Payment failed after retries", e);
        
        // Fallback: Queue for manual review
        paymentQueue.enqueue(request);
        
        return PaymentResponse.builder()
            .status("PENDING_REVIEW")
            .message("Your payment is being processed, you'll receive confirmation shortly")
            .build();
    }
}

// Retry timeline:
// Attempt 1: 0 seconds → Fails
// Attempt 2: 1 second later → Fails
// Attempt 3: 2 seconds later (1 × 2) → Fails
// Recover: Queue for manual review

// Result: Reliable (retries transient failures, handles permanent failures gracefully)
```

---

#### **2. Idempotency for Reliability**

```java
@RestController
public class PaymentController {
    
    @PostMapping("/payments")
    public ResponseEntity<Payment> createPayment(
        @RequestBody PaymentRequest request,
        @RequestHeader("Idempotency-Key") String idempotencyKey) {
        
        // Check cache first (fast path)
        Payment cached = cache.get("payment:" + idempotencyKey);
        if (cached != null) {
            log.info("Returning cached payment for idempotency key: {}", idempotencyKey);
            return ResponseEntity.ok(cached);
        }
        
        // Check database (in case cache evicted)
        Optional<Payment> existing = paymentRepository.findByIdempotencyKey(idempotencyKey);
        if (existing.isPresent()) {
            Payment payment = existing.get();
            cache.put("payment:" + idempotencyKey, payment);  // Repopulate cache
            return ResponseEntity.ok(payment);
        }
        
        // Create new payment (first time)
        Payment payment = Payment.builder()
            .idempotencyKey(idempotencyKey)
            .userId(request.getUserId())
            .amount(request.getAmount())
            .status("COMPLETED")
            .createdAt(Instant.now())
            .build();
        
        paymentRepository.save(payment);
        cache.put("payment:" + idempotencyKey, payment, 1, TimeUnit.HOURS);
        
        return ResponseEntity.status(201).body(payment);
    }
}

// Database schema
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_payments_idempotency_key ON payments(idempotency_key);

// Result: Reliable (no duplicate payments even with retries)
```

---

### **Fault Tolerance Patterns**

#### **1. Bulkhead Pattern (Isolate Failures)**

```java
@Configuration
public class BulkheadConfig {
    
    @Bean
    public ThreadPoolBulkheadRegistry bulkheadRegistry() {
        ThreadPoolBulkheadConfig config = ThreadPoolBulkheadConfig.custom()
            .maxThreadPoolSize(10)      // Max 10 threads for this service
            .coreThreadPoolSize(5)
            .queueCapacity(20)
            .build();
        
        return ThreadPoolBulkheadRegistry.of(config);
    }
}

@Service
public class ExternalServiceClient {
    
    // External service A (isolated thread pool)
    @Bulkhead(name = "serviceA", type = Bulkhead.Type.THREADPOOL)
    public Response callServiceA(Request request) {
        return serviceAClient.call(request);
    }
    
    // External service B (separate isolated thread pool)
    @Bulkhead(name = "serviceB", type = Bulkhead.Type.THREADPOOL)
    public Response callServiceB(Request request) {
        return serviceBClient.call(request);
    }
}

// If Service A becomes slow/unresponsive:
// - Only Service A's thread pool saturates
// - Service B continues working normally
// - System remains partially available (fault tolerance)
```

---

#### **2. Graceful Degradation**

```java
@Service
public class RecommendationService {
    
    public List<Product> getRecommendations(Long userId) {
        try {
            // Try ML-based recommendations (slow, complex)
            return mlService.getPersonalizedRecommendations(userId);
            
        } catch (MLServiceException e) {
            log.warn("ML service unavailable, falling back to trending products", e);
            
            try {
                // Fallback 1: Trending products (faster, simpler)
                return trendingService.getTrendingProducts();
                
            } catch (TrendingServiceException e2) {
                log.warn("Trending service unavailable, falling back to popular products", e2);
                
                try {
                    // Fallback 2: Popular products (cached, fast)
                    return cache.get("popular-products");
                    
                } catch (Exception e3) {
                    log.error("All recommendation services down, returning empty list", e3);
                    
                    // Fallback 3: Empty list (system still available!)
                    return Collections.emptyList();
                }
            }
        }
    }
}

// Degradation levels:
// 1. Full experience: Personalized ML recommendations
// 2. Degraded: Generic trending products
// 3. More degraded: Popular products (cached)
// 4. Minimal: Empty (but no error, system still up)

// Result: High availability (always returns something)
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### **SLA/SLO/SLI Framework**

**Definitions:**

- **SLI (Service Level Indicator):** Metric that measures service performance
- **SLO (Service Level Objective):** Target value for SLI
- **SLA (Service Level Agreement):** Contract with consequences if SLO not met

---

**Example: API Service**

```yaml
SLIs (What to measure):
══════════════════════
1. Availability:    % of successful requests (non-5xx)
2. Latency:         p99 response time
3. Correctness:     % of requests with correct results
4. Durability:      % of data not lost

SLOs (Targets):
═══════════════
1. Availability:    99.95% (21.6 minutes downtime/month)
2. Latency:         p99 < 500ms
3. Correctness:     99.99% (1 error per 10,000 requests)
4. Durability:      99.999999999% (11 nines)

SLA (Contract):
═══════════════
If availability < 99.95%:
  - 99.9-99.95%: 10% service credit
  - 99.0-99.9%:  25% service credit
  - <99.0%:      50% service credit

If p99 latency > 500ms:
  - 500-750ms:   5% service credit
  - >750ms:      10% service credit
```

**Monitoring SLOs:**

```java
@Component
public class SLOMonitor {
    
    @Scheduled(fixedRate = 60000)  // Every minute
    public void calculateSLO() {
        Instant now = Instant.now();
        Instant hourAgo = now.minus(1, ChronoUnit.HOURS);
        
        // SLI 1: Availability
        long totalRequests = metricsRepository.countRequests(hourAgo, now);
        long successfulRequests = metricsRepository.countSuccessfulRequests(hourAgo, now);
        double availability = (successfulRequests * 100.0) / totalRequests;
        
        // SLI 2: Latency (p99)
        double p99Latency = metricsRepository.getP99Latency(hourAgo, now);
        
        // Check SLOs
        if (availability < 99.95) {
            alertService.sendAlert("SLO violation: Availability " + availability + "% (target: 99.95%)");
        }
        
        if (p99Latency > 500) {
            alertService.sendAlert("SLO violation: p99 latency " + p99Latency + "ms (target: 500ms)");
        }
        
        // Error budget
        double errorBudget = 100 - 99.95;  // 0.05%
        double errorBudgetUsed = 100 - availability;
        double errorBudgetRemaining = errorBudget - errorBudgetUsed;
        
        log.info("Error budget: {}% remaining (used: {}%)", errorBudgetRemaining, errorBudgetUsed);
        
        if (errorBudgetRemaining < 0) {
            alertService.sendAlert("ERROR BUDGET EXHAUSTED! Stop deployments, focus on reliability!");
        }
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: AWS S3's 11 Nines Durability**

**Challenge:**
- Store exabytes of data
- Guarantee 99.999999999% (11 nines) durability
- Meaning: Lose 1 object per 100 billion objects per year

**How They Achieve It:**

**1. Multi-AZ Replication**
```
Object uploaded to S3
       ↓
    Written to 3 availability zones (AZs)
       ↓
    Checksums calculated and verified
       ↓
    ACK to client (after 3 AZs confirm)

If AZ fails: Data still on 2 other AZs
```

**2. Continuous Data Validation**
```
Background process (always running):
1. Read random objects
2. Verify checksums
3. If corruption detected: Restore from replica
4. If replica count < 3: Create new replica
```

**3. Erasure Coding (Cost Optimization)**
```
Instead of 3 full copies (3x cost):
- Split data into N fragments
- Generate M parity fragments
- Store N+M fragments across AZs
- Can reconstruct from any N of (N+M) fragments

Example: N=10, M=4 (14 total fragments)
- Can lose any 4 fragments
- 1.4x cost (vs 3x for replication)
- Same durability (11 nines)
```

**Results:**
- Durability: 99.999999999% (11 nines)
- Availability: 99.99% (four nines)
- Cost: Optimized through erasure coding
- Scale: Trillions of objects

---

### **Case Study 2: Netflix's Chaos Engineering (Availability)**

**Problem:**
- Complex distributed system (hundreds of microservices)
- Unknown failure modes
- Need to ensure availability during failures

**Solution: Chaos Monkey (Deliberately Cause Failures)**

**1. Chaos Monkey**
```
Randomly terminates EC2 instances during business hours

Goal: Force engineers to build resilient systems
- No single point of failure
- Automatic failover
- Graceful degradation
```

**Implementation:**
```java
@Service
public class ChaosMonkey {
    @Autowired
    private EC2Client ec2;
    
    @Scheduled(cron = "0 */30 * * * *")  // Every 30 minutes
    public void maybeTerminateInstance() {
        if (Math.random() < 0.01) {  // 1% chance
            List<Instance> instances = ec2.describeInstances();
            Instance victim = instances.get(new Random().nextInt(instances.size()));
            
            log.warn("Chaos Monkey terminating instance: {}", victim.getInstanceId());
            ec2.terminateInstances(victim.getInstanceId());
            
            metrics.recordChaosEvent("instance_termination");
        }
    }
}

// Forces teams to:
// - Use auto-scaling groups (auto-replace terminated instances)
// - Implement health checks (detect failures fast)
// - Design for failure (assume any instance can die)
```

**2. Chaos Kong (Regional Failure)**
```
Simulates entire AWS region failure

Test: Can Netflix continue streaming if US-EAST-1 goes down?

Result: Multi-region architecture
- Active-active across 3 regions
- Automatic failover
- Availability: 99.99%+ (even during region failure)
```

**Results:**
- Availability: 99.99% (survived real AWS outages)
- Confidence: Failures tested regularly in production
- Culture: Engineers design for failure from day one

---

### **Case Study 3: Stripe's Five Nines Availability (Payments)**

**Requirements:**
- 99.999% availability (5 minutes downtime/year)
- 100% durability (cannot lose financial transactions)
- Strong consistency (no duplicate charges)

**Architecture:**

**1. Multi-Region Active-Active**
```
[Global Load Balancer]
      ↓
      ├─> US-EAST (Primary)
      ├─> EU-WEST (Active)
      └─> AP-SOUTHEAST (Active)

Any region can process transactions
Distributed database (CockroachDB) replicates globally
```

**2. Idempotency for Reliability**
```java
@PostMapping("/charges")
public Charge createCharge(
    @RequestBody ChargeRequest request,
    @RequestHeader("Idempotency-Key") String key) {
    
    // Check if already processed
    Charge existing = chargeRepository.findByIdempotencyKey(key);
    if (existing != null) {
        return existing;  // Return same result (no duplicate charge)
    }
    
    // Process charge
    Charge charge = processCharge(request);
    charge.setIdempotencyKey(key);
    chargeRepository.save(charge);
    
    return charge;
}

// Client retries on failure (network timeout)
// Idempotency ensures no duplicate charges
```

**3. Write-Ahead Log (Durability)**
```
Transaction received
       ↓
    Write to WAL (3 nodes, synchronous)
       ↓
    ACK to client (data durable)
       ↓
    Apply to database (async)
       ↓
    Replicate globally (async)

If crash: Replay WAL to recover
Result: No transaction lost
```

**4. Runbooks for Fast Recovery (Reduce MTTR)**
```
Incident detected (automated alert)
       ↓
    Runbook identified (based on alert type)
       ↓
    Automated remediation (e.g., failover to backup)
       ↓
    Manual escalation (if automation fails)

MTTR: 5 minutes (automated) vs 30 minutes (manual)
```

**Results:**
- Availability: 99.999% (achieved, even exceeded)
- Durability: 100% (no transaction ever lost)
- Reliability: 99.999% (no duplicate charges)
- MTTR: 3 minutes (automated failover)

---

### **Case Study 4: Facebook's MySQL Sharding (Reliability at Scale)**

**Challenge:**
- Billions of users
- Millions of writes/second
- Need high availability and reliability

**Solution: Sharding with Smart Failover**

**1. Sharding Strategy**
```
User ID → Hash → Shard ID

Shard 1: Users 1-100M     (Master + 3 Replicas)
Shard 2: Users 100M-200M  (Master + 3 Replicas)
Shard 3: Users 200M-300M  (Master + 3 Replicas)
...

Each shard: Independent MySQL cluster
Result: Failure isolated to 1 shard (99.999% of users unaffected)
```

**2. Automated Failover**
```
Normal:
[App] → [Shard 1 Master] → [Replica 1, Replica 2, Replica 3]

Master fails:
1. Health check detects failure (5 seconds)
2. Replica 1 promoted to master (10 seconds)
3. DNS updated (5 seconds)
4. App routes to new master (0 seconds, client-side load balancer)

Downtime: ~20 seconds (99.999% availability preserved)
```

**3. Read Replicas for Reliability**
```
Writes: Master only (strong consistency)
Reads: Any replica (eventual consistency, but fast)

Read ratio: 99% reads, 1% writes
Replicas handle 99% of traffic
Master failure: Reads still work (availability maintained)
```

**Results:**
- Availability: 99.999% per shard
- Reliability: No data loss during failover
- Scalability: Horizontal (add more shards)
- Isolation: Failure in one shard doesn't affect others

---

### **Case Study 5: Google Spanner (Strong Consistency + High Availability)**

**Challenge:**
- Global distribution (users worldwide)
- Strong consistency (no stale reads)
- High availability (99.999%)

**Breakthrough: TrueTime API**

**1. Synchronized Clocks**
```
Problem: Distributed systems have clock skew
Solution: TrueTime API (synchronized to atomic clocks + GPS)

TrueTime.now() returns interval [earliest, latest]
Uncertainty: ±7ms (worst case)

Use: Wait for uncertainty to pass before committing
Result: Globally consistent timestamps
```

**2. Multi-Paxos for Consistency**
```
Write transaction:
1. Acquire locks on all affected rows
2. Propose transaction to Paxos group (5 nodes)
3. Wait for majority (3 of 5) to agree
4. Commit transaction
5. Release locks

Read transaction:
1. Read from any replica with timestamp ≥ commit timestamp
2. Result: Always see latest committed data (strong consistency)
```

**3. Global Replication for Availability**
```
Data replicated across 3+ regions
Any region can handle reads
Writes require quorum (2 of 3 regions)

Region failure: System continues (quorum still achievable)
Result: 99.999% availability
```

**Results:**
- Consistency: Strong (no stale reads, globally)
- Availability: 99.999% (five nines)
- Latency: 100ms+ (due to global coordination)
- Use case: Financial systems (banks, stock exchanges)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "Availability, reliability, and durability are three distinct but related non-functional requirements that are often confused.
>
> **Availability** measures the percentage of time a system is operational and accessible to users. It's calculated as uptime divided by total time. For example, 99.99% availability means 4.38 minutes of downtime per month. Amazon's target is typically 99.95-99.99% for user-facing services. Availability is about **minimizing downtime** through redundancy, failover, and load balancing.
>
> **Reliability** measures whether the system performs its intended function **correctly** over time. A system can be available but unreliable—for example, a website that loads but shows wrong prices. Reliability is measured using metrics like MTBF (Mean Time Between Failures) and MTTR (Mean Time To Recovery). It's about **correctness and consistency**—ensuring accurate results through validation, idempotency, and proper error handling.
>
> **Durability** guarantees that once data is successfully written, it won't be lost even during hardware failures or disasters. AWS S3 achieves 99.999999999% (11 nines) durability through multi-AZ replication and continuous checksums. Durability is about **data persistence**, not system uptime. You achieve it through synchronous replication, write-ahead logs, and regular backups.
>
> The key distinction: A system can be **available but unreliable** (returns wrong data), **reliable but unavailable** (works correctly when up, but often down), or **available and reliable but not durable** (works great until a disk fails and data is lost).
>
> At FAANG scale, all three are critical. For example, Stripe needs 99.999% availability (users expect instant payment confirmation), 100% reliability (no duplicate charges), and 100% durability (cannot lose financial transactions). They achieve this through multi-region active-active architecture, idempotency keys, and synchronous replication with write-ahead logs."

---

### **Common Follow-Up Questions**

#### **Q1: How do you calculate system availability when components are in series vs parallel?**

> "System availability depends on whether components are in **series** (sequential) or **parallel** (redundant).
>
> **Series (Sequential Components):**
> When components are in series, **availability multiplies**:
> ```
> System Availability = A1 × A2 × A3 × ... × An
> ```
>
> Example:
> ```
> Client → Load Balancer → API Server → Database
> 
> Load Balancer: 99.99% available
> API Server:    99.99% available
> Database:      99.99% available
>
> System Availability = 0.9999 × 0.9999 × 0.9999 = 99.97%
> ```
> Notice: System availability is **worse** than any individual component!
>
> **Parallel (Redundant Components):**
> When components are in parallel, **availability improves** dramatically:
> ```
> Probability all fail = (1 - A1) × (1 - A2) × ... × (1 - An)
> System Availability = 1 - Probability all fail
> ```
>
> Example:
> ```
> 3 redundant servers (active-active):
> Each server: 99.9% available (0.1% failure rate)
>
> Probability all 3 fail = 0.001 × 0.001 × 0.001 = 0.000000001
> System Availability = 1 - 0.000000001 = 99.9999999% (9 nines!)
> ```
>
> **Real-World Example:**
> ```
> System:
> [Client] → [LB1, LB2] → [Server1, Server2, Server3] → [DB Master, DB Replica1, DB Replica2]
>
> Availability:
> - Load balancers (parallel): 1 - (0.0001 × 0.0001) = 99.99999% ≈ 100%
> - Servers (parallel):       1 - (0.001)^3 = 99.9999999% ≈ 100%
> - Databases (failover):     1 - (0.001 × 0.001) = 99.9999% ≈ 100%
>
> System Availability = 1 × 1 × 1 ≈ 99.9999% (six nines!)
> ```
>
> **Key Insight:** Redundancy is crucial. Even components with 99% availability can achieve 99.9999%+ through parallelism."

---

#### **Q2: What's the difference between RPO and RTO in disaster recovery?**

> "**RPO** (Recovery Point Objective) and **RTO** (Recovery Time Objective) are two critical disaster recovery metrics:
>
> **RPO (Recovery Point Objective):**
> - **Question:** How much **data loss** is acceptable?
> - **Measured in:** Time (e.g., 1 hour, 15 minutes, 0 seconds)
> - **Meaning:** Maximum age of data that can be lost during disaster
> - **Example:** RPO = 15 minutes means you can lose up to 15 minutes of recent data
>
> **RTO (Recovery Time Objective):**
> - **Question:** How much **downtime** is acceptable?
> - **Measured in:** Time (e.g., 4 hours, 30 minutes, 0 seconds)
> - **Meaning:** Maximum acceptable downtime to restore service
> - **Example:** RTO = 1 hour means system must be back online within 1 hour
>
> **Relationship:**
> ```
> Disaster occurs at time T
>
> ←────RPO────┤         ├────RTO────→
>             ↓         ↓
>         Last Backup  Disaster     System Restored
>         (T - 15min)    (T)         (T + 1hr)
>
> Data lost: Last 15 minutes (RPO)
> Downtime: 1 hour (RTO)
> ```
>
> **Trade-Offs:**
> 
> | **RPO** | **Backup Strategy** | **Cost** |
> |---------|---------------------|----------|
> | 24 hours | Daily backups | $ |
> | 1 hour | Hourly snapshots | $$ |
> | 15 minutes | Continuous replication (async) | $$$ |
> | 0 seconds | Synchronous replication | $$$$ |
>
> | **RTO** | **Recovery Strategy** | **Cost** |
> |---------|----------------------|----------|
> | 24 hours | Manual restore from backup | $ |
> | 4 hours | Automated restore scripts | $$ |
> | 1 hour | Warm standby (standby server ready) | $$$ |
> | 0 seconds | Hot standby (active-active) | $$$$ |
>
> **Real-World Examples:**
>
> **Financial Trading System:**
> ```
> RPO: 0 seconds (cannot lose any transaction)
> RTO: 0 seconds (must be always available)
> Solution: Active-active multi-region + synchronous replication
> Cost: Very high, but necessary
> ```
>
> **E-Commerce Site:**
> ```
> RPO: 5 minutes (can afford to lose few recent orders)
> RTO: 15 minutes (acceptable brief downtime)
> Solution: Asynchronous replication + automated failover
> Cost: Moderate
> ```
>
> **Internal Analytics:**
> ```
> RPO: 24 hours (daily batch job, can reprocess)
> RTO: 4 hours (not time-sensitive)
> Solution: Daily backups + manual restore
> Cost: Low
> ```
>
> **Key Insight:** RPO and RTO drive architecture decisions and costs. Tighter requirements (lower RPO/RTO) exponentially increase complexity and cost."

---

#### **Q3: How do you handle database replication lag for eventual consistency?**

> "Replication lag is the delay between writing to the primary database and that write appearing on replicas. This creates **eventual consistency**—replicas are eventually consistent, but might be temporarily stale.
>
> **The Problem:**
> ```
> User writes to primary: 'Update profile picture'
> Primary ACKs immediately (write committed)
> User refreshes page: Read from replica (stale data, old picture!)
>
> Why? Replication lag (100ms to several seconds)
> Result: Confusing user experience
> ```
>
> **Solution Strategies:**
>
> **1. Read-Your-Own-Writes Consistency**
> ```java
> @Service
> public class ProfileService {
>     
>     @Transactional
>     public void updateProfile(Long userId, Profile profile) {
>         // Write to primary
>         profileRepository.save(profile);
>         
>         // Cache the write with user ID as key
>         cache.put("profile:" + userId, profile, 5, TimeUnit.SECONDS);
>     }
>     
>     @Transactional(readOnly = true)
>     public Profile getProfile(Long userId) {
>         // Check cache first (recent write?)
>         Profile cached = cache.get("profile:" + userId);
>         if (cached != null) {
>             return cached;  // Return fresh data
>         }
>         
>         // Read from replica (eventually consistent)
>         return profileRepository.findById(userId).orElseThrow();
>     }
> }
> 
> Result: User always sees their own writes immediately
> ```
>
> **2. Session Affinity (Sticky Routing)**
> ```java
> @Configuration
> public class RoutingDataSource extends AbstractRoutingDataSource {
>     
>     @Override
>     protected Object determineCurrentLookupKey() {
>         Long lastWriteTime = SessionContext.getLastWriteTime();
>         
>         if (lastWriteTime != null && 
>             Instant.now().minusSeconds(5).isBefore(lastWriteTime)) {
>             // Recent write: Route to primary
>             return "primary";
>         } else {
>             // No recent write: Route to replica
>             return "replica";
>         }
>     }
> }
>
> Result: Reads go to primary for 5 seconds after write (avoids lag)
> ```
>
> **3. Causality Tracking (Version Numbers)**
> ```java
> @Entity
> public class Post {
>     @Id
>     private Long id;
>     
>     @Version  // Optimistic lock version
>     private Long version;
>     
>     private String content;
> }
>
> // Client stores version from write
> POST /posts/123
> Response: { "id": 123, "content": "Hello", "version": 42 }
>
> // Client includes version in read
> GET /posts/123?min_version=42
>
> @RestController
> public class PostController {
>     
>     @GetMapping("/posts/{id}")
>     public Post getPost(@PathVariable Long id, 
>                        @RequestParam(required = false) Long minVersion) {
>         Post post = postRepository.findById(id).orElseThrow();
>         
>         if (minVersion != null && post.getVersion() < minVersion) {
>             // Replica is stale, read from primary
>             post = postRepository.findByIdFromPrimary(id).orElseThrow();
>         }
>         
>         return post;
>     }
> }
>
> Result: Client can request specific version (guarantees consistency)
> ```
>
> **4. Bounded Staleness**
> ```java
> @Service
> public class OrderService {
>     
>     @Value("${max.replication.lag.ms}")
>     private long maxLagMs = 1000;  // 1 second max lag
>     
>     public Order getOrder(Long orderId) {
>         Order order = orderRepository.findById(orderId).orElseThrow();
>         
>         // Check replication lag
>         long replicationLag = getReplicationLag();
>         if (replicationLag > maxLagMs) {
>             log.warn("Replication lag {}ms exceeds max {}ms, reading from primary",
>                 replicationLag, maxLagMs);
>             order = orderRepository.findByIdFromPrimary(orderId).orElseThrow();
>         }
>         
>         return order;
>     }
>     
>     private long getReplicationLag() {
>         // Query replica: SELECT NOW() - pg_last_xact_replay_timestamp()
>         return jdbcTemplate.queryForObject(
>             "SELECT EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) * 1000",
>             Long.class
>         );
>     }
> }
>
> Result: Automatically fallback to primary if lag too high
> ```
>
> **5. Monotonic Reads (Always Forward in Time)**
> ```java
> @Service
> public class MonotonicReadService {
>     
>     public Feed getUserFeed(Long userId, Long lastSeenVersion) {
>         // Ensure replica is at least as fresh as last read
>         long replicaVersion = getReplicaVersion();
>         
>         if (replicaVersion < lastSeenVersion) {
>             // Replica behind last read: Use primary
>             return feedRepository.findByUserIdFromPrimary(userId, lastSeenVersion);
>         } else {
>             // Replica ahead: Use replica
>             return feedRepository.findByUserId(userId, lastSeenVersion);
>         }
>     }
> }
>
> Result: User never sees data "go backwards" (always monotonic)
> ```
>
> **Trade-Off Table:**
>
> | **Strategy** | **Consistency** | **Complexity** | **Load on Primary** | **Use Case** |
> |--------------|-----------------|----------------|---------------------|--------------|
> | Read-Your-Own-Writes | Strong for user | Low | Low (cache) | User profiles |
> | Session Affinity | Strong for session | Medium | Medium | Shopping carts |
> | Causality Tracking | Strong with version | High | Low | Social feeds |
> | Bounded Staleness | Tunable | Medium | Variable | Analytics |
> | Monotonic Reads | Forward-only | High | Low | Timelines |
>
> **Key Insight:** Eventual consistency is manageable with the right patterns. Choose based on user expectations and business requirements."

---

#### **Q4: How do you test reliability and availability in production?**

> "Testing reliability and availability in production is critical because **staging never matches production complexity**. Here's how FAANG companies do it:
>
> **1. Chaos Engineering (Netflix approach)**
> ```java
> @Service
> @Profile("production")  // Only in production!
> public class ChaosMonkey {
>     
>     @Scheduled(cron = "0 */30 9-17 * * MON-FRI")  // Business hours
>     public void injectFailure() {
>         if (Math.random() < 0.05) {  // 5% chance
>             ChaosExperiment experiment = selectRandomExperiment();
>             log.warn("Chaos Monkey executing: {}", experiment.getName());
>             experiment.execute();
>         }
>     }
> }
>
> interface ChaosExperiment {
>     String getName();
>     void execute();
> }
>
> @Component
> class TerminateInstanceExperiment implements ChaosExperiment {
>     public void execute() {
>         Instance instance = selectRandomInstance();
>         ec2.terminateInstances(instance.getInstanceId());
>     }
> }
>
> @Component
> class InjectLatencyExperiment implements ChaosExperiment {
>     public void execute() {
>         // Add 2 second delay to random service
>         chaosConfig.setLatency("payment-service", Duration.ofSeconds(2));
>     }
> }
>
> @Component
> class FailDatabaseExperiment implements ChaosExperiment {
>     public void execute() {
>         // Simulate database failure for 30 seconds
>         databaseProxy.blockConnections(Duration.ofSeconds(30));
>     }
> }
>
> Benefits:
> - Forces teams to build resilient systems
> - Discovers failure modes before customers do
> - Builds confidence in reliability
> ```
>
> **2. Canary Deployments (Gradual Rollout)**
> ```
> Deploy new version to:
> 1. 1% of traffic (10 minutes) → Monitor metrics
> 2. If healthy: 10% of traffic (30 minutes) → Monitor
> 3. If healthy: 50% of traffic (1 hour) → Monitor
> 4. If healthy: 100% of traffic
>
> If ANY step shows issues: Automatic rollback
>
> Metrics monitored:
> - Error rate (p99 < 1%)
> - Latency (p99 < 500ms)
> - Success rate (> 99.95%)
> ```
>
> **Implementation:**
> ```yaml
> # Kubernetes Canary Deployment
> apiVersion: flagger.app/v1beta1
> kind: Canary
> metadata:
>   name: api-service
> spec:
>   targetRef:
>     apiVersion: apps/v1
>     kind: Deployment
>     name: api-service
>   service:
>     port: 8080
>   analysis:
>     interval: 1m
>     threshold: 5  # Fail after 5 failed checks
>     maxWeight: 50
>     stepWeight: 10  # Increase by 10% each step
>     metrics:
>       - name: request-success-rate
>         thresholdRange:
>           min: 99.95
>       - name: request-duration
>         thresholdRange:
>           max: 500
> ```
>
> **3. Synthetic Monitoring (Proactive Detection)**
> ```java
> @Service
> public class SyntheticMonitor {
>     
>     @Scheduled(fixedRate = 60000)  // Every minute
>     public void runSyntheticTests() {
>         // Simulate user journey
>         try {
>             // Step 1: Create account
>             User user = createAccount("synthetic@test.com");
>             
>             // Step 2: Add to cart
>             Cart cart = addToCart(user.getId(), "product-123");
>             
>             // Step 3: Checkout
>             Order order = checkout(cart.getId());
>             
>             // Measure end-to-end latency
>             long totalLatency = /* calculate */;
>             metrics.record("synthetic.end_to_end_latency", totalLatency);
>             
>             if (totalLatency > 5000) {
>                 alertService.sendAlert("Synthetic test exceeded 5s: " + totalLatency + "ms");
>             }
>             
>         } catch (Exception e) {
>             log.error("Synthetic test failed", e);
>             alertService.sendAlert("Synthetic test failed: " + e.getMessage());
>         }
>     }
> }
>
> Benefits:
> - Catches issues before users report them
> - Tests actual user workflows
> - Validates SLAs continuously
> ```
>
> **4. Load Testing in Production (Facebook approach)**
> ```
> Shadow Traffic:
> - Mirror production traffic to new version
> - Process requests but don't return results
> - Compare latency/errors with production
> 
> Benefits:
> - Test with real production load
> - No user impact (shadow only)
> - Realistic performance data
> ```
>
> **5. Feature Flags (Safe Rollout)**
> ```java
> @Service
> public class OrderService {
>     @Autowired
>     private FeatureFlagClient featureFlags;
>     
>     public Order processOrder(OrderRequest request) {
>         if (featureFlags.isEnabled("new-payment-flow", request.getUserId())) {
>             return newPaymentFlow(request);  // 10% of users
>         } else {
>             return oldPaymentFlow(request);  // 90% of users
>         }
>     }
> }
>
> // Gradual rollout:
> Day 1: 1% of users
> Day 2: 10% of users
> Day 3: 50% of users
> Day 4: 100% of users
>
> If issues detected: Instant rollback (flip flag to false)
> ```
>
> **Key Insight:** Production testing is essential. Use chaos engineering to find weaknesses, canary deployments for safe rollouts, and synthetic monitoring for proactive detection."

---

#### **Q5: What's the difference between backup and replication for durability?**

> "Backup and replication are both durability strategies, but they serve **different purposes** and protect against **different failure modes**:
>
> **Replication (Continuous, Real-Time):**
> - **Purpose:** High availability + durability
> - **Method:** Continuous synchronization of data to multiple nodes
> - **Latency:** Near real-time (seconds to milliseconds)
> - **Use case:** Protect against hardware failure, maintain availability
>
> **Backup (Periodic, Point-in-Time):**
> - **Purpose:** Disaster recovery + compliance
> - **Method:** Periodic snapshots stored separately
> - **Latency:** Scheduled (hourly, daily, weekly)
> - **Use case:** Protect against logical errors, corruption, compliance
>
> **Key Differences:**
>
> | **Aspect** | **Replication** | **Backup** |
> |------------|----------------|------------|
> | **Frequency** | Continuous | Periodic |
> | **Latency** | Milliseconds-seconds | Hours-days |
> | **Purpose** | Availability + durability | Disaster recovery |
> | **Protects against** | Hardware failure | Logical errors, corruption |
> | **Storage** | Hot (same system) | Cold (separate system) |
> | **Cost** | Higher (active) | Lower (archived) |
> | **Recovery time** | Instant | Hours |
>
> **Example Scenarios:**
>
> **Scenario 1: Disk Failure**
> ```
> Problem: Primary database server's disk fails
>
> Replication saves the day:
> - Replica 1 promoted to primary instantly
> - Downtime: 0 seconds
> - Data loss: 0 (synchronous replication)
>
> Backup NOT needed (replication handled it)
> ```
>
> **Scenario 2: Accidental DELETE**
> ```
> Problem: Engineer accidentally runs 'DELETE FROM users WHERE 1=1'
>
> Replication makes it worse:
> - DELETE replicates to all nodes instantly!
> - All replicas now have no users
> - Replication CANNOT help
>
> Backup saves the day:
> - Restore from backup taken 1 hour ago
> - Data loss: 1 hour of new users
> - Downtime: 30 minutes (restore time)
> ```
>
> **Scenario 3: Database Corruption**
> ```
> Problem: Bug in application corrupts all user balances
>
> Replication makes it worse:
> - Corruption replicates to all nodes!
> - All replicas corrupted
>
> Backup saves the day:
> - Restore from backup before corruption
> - Identify when corruption started
> - Replay transactions after that point
> ```
>
> **Best Practice: Use Both!**
>
> **Replication (For Availability):**
> ```java
> // PostgreSQL Configuration
> // Primary → 2 replicas (synchronous)
> synchronous_commit = on
> synchronous_standby_names = 'replica1,replica2'
> wal_level = replica
>
> // Result:
> // - Hardware failure: Instant failover
> // - Availability: 99.99%
> // - Data loss: 0 (synchronous)
> ```
>
> **Backup (For Disaster Recovery):**
> ```java
> @Service
> public class BackupService {
>     
>     @Scheduled(cron = "0 0 2 * * *")  // Daily at 2 AM
>     public void performBackup() {
>         // Full backup daily
>         String backupFile = "backup-" + LocalDate.now() + ".sql";
>         pgDump(backupFile);
>         
>         // Upload to S3 (separate system)
>         s3Client.putObject("backups", backupFile, new File(backupFile));
>         
>         log.info("Backup completed: {}", backupFile);
>     }
>     
>     @Scheduled(cron = "0 */15 * * * *")  // Every 15 minutes
>     public void performIncrementalBackup() {
>         // WAL archiving (incremental)
>         archiveWalFiles();
>     }
> }
>
> // Retention policy:
> // - Daily backups: Keep 30 days
> // - Weekly backups: Keep 1 year
> // - Monthly backups: Keep 7 years (compliance)
> ```
>
> **Recovery Strategies:**
>
> **Point-in-Time Recovery (PITR):**
> ```
> Problem: Corruption detected at 3:00 PM today
>
> Recovery:
> 1. Restore full backup from 2:00 AM (before corruption)
> 2. Replay WAL files from 2:00 AM to 2:59 PM
> 3. Stop at 2:59 PM (just before corruption)
>
> Result:
> - Recovered to exact point before corruption
> - Data loss: 0
> - Downtime: 1 hour (restore + replay)
> ```
>
> **Cross-Region Backup:**
> ```
> Primary: US-EAST-1
> Replicas: US-EAST-1 (same region)
> Backups: US-WEST-2 (different region), EU-WEST-1 (different continent)
>
> Disaster: Entire US-EAST-1 region fails (AWS outage)
> - Replication: Useless (all replicas in same region)
> - Backup: Restore from US-WEST-2 backup
> ```
>
> **Cost Example:**
>
> **100 TB Database:**
> ```
> Replication:
> - 3 replicas × 100 TB = 300 TB storage
> - Cost: 300 TB × $10/TB/month = $3,000/month
> - Purpose: Availability
>
> Backup:
> - Daily full (30 days): 30 × 100 TB = 3,000 TB
> - Weekly (52 weeks): 52 × 100 TB = 5,200 TB
> - Monthly (12 months): 12 × 100 TB = 1,200 TB
> - Total: 9,400 TB
> - S3 Glacier cost: 9,400 TB × $0.004/GB/month = $38/month
> - Purpose: Disaster recovery
>
> Total: $3,038/month
> ```
>
> **Key Insight:** Replication protects against **infrastructure failures** (instant recovery). Backups protect against **logical errors and disasters** (slower recovery, but broader protection). You need BOTH for complete durability."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Availability vs Reliability vs Durability (Visual)**

```
SCENARIO 1: High Availability, Low Reliability
═══════════════════════════════════════════════

System: Always responds (99.99% uptime)
But: Returns wrong data 10% of the time

User experience:
Request 1: ✓ Fast response (10ms)  → Wrong price ($10 instead of $100)
Request 2: ✓ Fast response (15ms)  → Correct data
Request 3: ✓ Fast response (12ms)  → Wrong inventory (shows in stock, but sold out)

Result:
- Availability: ✓ 99.99%
- Reliability: ✗ 90%
- User trust: ✗ Low (can't trust results)


SCENARIO 2: High Reliability, Low Availability
═══════════════════════════════════════════════

System: Often down (95% uptime)
But: When up, always correct

User experience:
Request 1: ✓ Correct data (100ms)
Request 2: ✗ Service unavailable (system down)
Request 3: ✗ Service unavailable (system down)
Request 4: ✓ Correct data (105ms)

Result:
- Availability: ✗ 95%
- Reliability: ✓ 100% (when available)
- User trust: ✗ Low (can't access service)


SCENARIO 3: High Availability, High Reliability, Low Durability
════════════════════════════════════════════════════════════════

System: Always up, always correct
But: Data not replicated

User experience:
Request 1: ✓ Correct data (10ms)
Request 2: ✓ Correct data (12ms)
[Disk failure occurs]
Request 3: ✗ Data lost! (can't recover)

Result:
- Availability: ✓ 99.99%
- Reliability: ✓ 100%
- Durability: ✗ Data lost
- Business impact: ✗ Catastrophic


IDEAL: High Availability + High Reliability + High Durability
═══════════════════════════════════════════════════════════════

System: Always up, always correct, data never lost

User experience:
Request 1: ✓ Correct data (10ms)
Request 2: ✓ Correct data (12ms)
[Server failure] → Instant failover
Request 3: ✓ Correct data (15ms, from replica)
[Disk failure] → Data recovered from replica
Request 4: ✓ Correct data (10ms)

Result:
- Availability: ✓ 99.99%+
- Reliability: ✓ 100%
- Durability: ✓ 99.999999999%
- User trust: ✓ High
- Business value: ✓ Maximum
```

---

### **MTBF / MTTR Visualization**

```
SYSTEM LIFECYCLE (Over 1000 Hours)
═══════════════════════════════════

Time →
├──────────┬─┬──────────┬──┬─────────────┬─┬─────────────→
│  Running │X│  Running │X │   Running   │X│   Running
│ (250 hrs)│F│ (250 hrs)│F │  (250 hrs)  │F│  (250 hrs)
│          │A│          │A │             │A│
│          │I│          │I │             │I│
│          │L│          │L │             │L│
│          │ │          │  │             │ │
│          │ │          │  │             │ │
│   Uptime │↓│  Uptime  │↓ │   Uptime    │↓│  Uptime
└──────────┴─┴──────────┴──┴─────────────┴─┴─────────────→

MTBF (Mean Time Between Failures):
= Total uptime / Number of failures
= 1000 hours / 4 failures
= 250 hours (10.4 days)

MTTR (Mean Time To Recovery):
= Total downtime / Number of failures
= (1 + 2 + 1 + 0 hours) / 4
= 1 hour

Availability:
= MTBF / (MTBF + MTTR)
= 250 / (250 + 1)
= 99.6%


IMPROVEMENT: Reduce MTTR
═════════════════════════

Add automated failover (1 hour → 5 minutes)

New MTTR = 5 minutes = 0.083 hours

New Availability:
= 250 / (250 + 0.083)
= 99.97%

Downtime reduced: 60 minutes/year → 3 minutes/year (20x better!)
```

---

### **Durability Levels (S3 Example)**

```
DURABILITY: Probability of NOT Losing Data
═══════════════════════════════════════════

99% Durability (2 nines)
────────────────────────
Store 100 objects → Expect to lose 1 object per year
Annual object loss rate: 1%

Use case: Temp files, easily reproducible data


99.999% Durability (5 nines)
─────────────────────────────
Store 100,000 objects → Expect to lose 1 object per year
Annual object loss rate: 0.001%

Use case: Application logs, low-value data


99.9999999% Durability (9 nines)
─────────────────────────────────
Store 1 billion objects → Expect to lose 1 object per year
Annual object loss rate: 0.0000001%

Use case: Replicated databases, important data


99.999999999% Durability (11 nines) ← AWS S3
─────────────────────────────────────────────
Store 100 billion objects → Expect to lose 1 object per year
Annual object loss rate: 0.0000000001%

In practice:
- Store 100,000 objects → Lose 1 object every 1 million years
- Store 10 million objects → Lose 1 object every 10,000 years

Use case: Financial records, user data, critical backups


How AWS Achieves 11 Nines:
───────────────────────────

1. Replicate across 3+ availability zones
2. Continuous checksums and validation
3. Auto-repair corrupted data
4. Erasure coding (14 fragments, lose any 4)

                 ┌─────────────┐
                 │   Object    │
                 └──────┬──────┘
                        │
         ┌──────────────┼──────────────┐
         ↓              ↓              ↓
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │  AZ-1   │    │  AZ-2   │    │  AZ-3   │
   │ (Copy)  │    │ (Copy)  │    │ (Copy)  │
   └─────────┘    └─────────┘    └─────────┘

If AZ-1 fails: Data still on AZ-2 + AZ-3
If disk fails in AZ-2: Auto-create new copy in AZ-2
If data corrupted: Restore from checksum-validated copy

Result: 99.999999999% durability (virtually impossible to lose data)
```

---

### **Replication Strategies**

```
SYNCHRONOUS REPLICATION (Strong Durability, Higher Latency)
════════════════════════════════════════════════════════════

Client write request
       │
       ↓
┌──────────────┐
│   Primary    │
└──────┬───────┘
       │ Write to WAL
       ↓
┌──────────────┐
│  Disk (WAL)  │
└──────┬───────┘
       │ Replicate (sync)
       ├────────────────────┬────────────────────┐
       ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Replica 1   │    │  Replica 2   │    │  Replica 3   │
│  (Write WAL) │    │  (Write WAL) │    │  (Write WAL) │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                            │
                            ↓
                    All replicas ACK
                            │
                            ↓
                      ACK to client

Latency: 100-200ms (wait for all replicas)
Durability: 99.999999% (data on 4 nodes)
Data loss risk: Near zero
Use case: Financial transactions


ASYNCHRONOUS REPLICATION (Lower Latency, Lower Durability)
═══════════════════════════════════════════════════════════

Client write request
       │
       ↓
┌──────────────┐
│   Primary    │
└──────┬───────┘
       │ Write to WAL
       ↓
┌──────────────┐
│  Disk (WAL)  │
└──────┬───────┘
       │
       ↓
  ACK to client (immediate!)
       │
       ↓ (async replication in background)
       ├────────────────────┬────────────────────┐
       ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Replica 1   │    │  Replica 2   │    │  Replica 3   │
│  (Eventual)  │    │  (Eventual)  │    │  (Eventual)  │
└──────────────┘    └──────────────┘    └──────────────┘

Latency: 10-20ms (don't wait for replicas)
Durability: 99.99% (data on 1 node initially)
Data loss risk: 1-5 seconds of data if primary fails
Use case: Social media posts, non-critical data
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Business Impact:**
- **Availability:** Downtime = lost revenue ($220K/minute for Amazon)
- **Reliability:** Incorrect results = lost trust, chargebacks, legal liability
- **Durability:** Data loss = business-ending event (GDPR violations, lawsuits)

**User Trust:**
- Users tolerate brief downtime (availability)
- Users **cannot tolerate** incorrect results (reliability)
- Users **cannot tolerate** data loss (durability)

**Competitive Advantage:**
- 99.95% SLA (Stripe) vs 99.9% (competitors) = 5x better
- Customer retention: High availability/reliability = loyal customers

---

### **How It Works (Simple Summary)**

**Availability (Uptime):**
- **Redundancy:** Multiple servers, load balancing
- **Failover:** Automatic promotion of standby
- **Multi-region:** Survive regional failures
- **Target:** 99.95-99.999% (four to five nines)

**Reliability (Correctness):**
- **Validation:** Check data before processing
- **Idempotency:** Same request = same result (no duplicates)
- **Transactions:** ACID guarantees
- **Testing:** Chaos engineering, canary deployments
- **Target:** 99.99%+ correct results

**Durability (Data Persistence):**
- **Replication:** Write to multiple nodes
- **Write-Ahead Log:** Durable before ACK
- **Backups:** Periodic snapshots to separate storage
- **Checksums:** Continuous validation
- **Target:** 99.999999999% (11 nines)

---

### **Key Trade-Offs to Remember**

| **Requirement** | **Strategy** | **Latency** | **Cost** | **Complexity** |
|-----------------|--------------|-------------|----------|----------------|
| **High Availability** | Active-active | Low | $$$ | Medium |
| **High Reliability** | Validation + idempotency | Medium | $ | Medium |
| **High Durability** | Sync replication | High | $$$$ | High |
| **Balanced** | Async replication + backups | Low | $$ | Low |

---

### **Decision Framework**

```
SYSTEM TYPE → REQUIREMENTS
═══════════════════════════

Financial (Banking, Payments):
┌─────────────────────────────────┐
│ Availability:  99.999% (5 nines)│
│ Reliability:   100% (no errors) │
│ Durability:    100% (no loss)   │
│ Cost:          Very High         │
│ Strategy:      Sync replication  │
└─────────────────────────────────┘

E-Commerce (Shopping):
┌─────────────────────────────────┐
│ Availability:  99.95% (4 nines) │
│ Reliability:   99.99%            │
│ Durability:    99.9999999%       │
│ Cost:          High              │
│ Strategy:      Multi-region      │
└─────────────────────────────────┘

Social Media (Feeds):
┌─────────────────────────────────┐
│ Availability:  99.9% (3 nines)  │
│ Reliability:   99.9% (some stale)│
│ Durability:    99.999999%        │
│ Cost:          Medium            │
│ Strategy:      Eventual consistency│
└─────────────────────────────────┘

Internal Tools (Analytics):
┌─────────────────────────────────┐
│ Availability:  99% (2 nines)    │
│ Reliability:   99%               │
│ Durability:    99.999%           │
│ Cost:          Low               │
│ Strategy:      Daily backups     │
└─────────────────────────────────┘
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Always Distinguish the Three Concepts**
- Availability ≠ Reliability ≠ Durability
- Show you understand the nuances

✅ **Use Correct Terminology**
- "Four nines availability" (not "99.99% uptime")
- "Eleven nines durability" (not "very durable")
- MTBF, MTTR, RPO, RTO

✅ **Provide Concrete Numbers**
- "99.95% = 21.6 minutes downtime/month"
- "MTBF = 250 hours, MTTR = 1 hour"

✅ **Discuss Trade-Offs**
- "Synchronous replication: High durability, but 2x latency"
- "Async replication: Low latency, but risk of data loss"

✅ **Reference Real Systems**
- "AWS S3 achieves 11 nines through..."
- "Netflix uses chaos engineering to ensure..."
- "Stripe requires five nines availability because..."

✅ **Address All Three in System Design**
- "For availability: Multi-region active-active"
- "For reliability: Idempotency keys + validation"
- "For durability: Synchronous replication + backups"

**The interviewer wants to see** that you design production systems with all three pillars in mind, understand the trade-offs, and can articulate business impact.

---

**End of Topic 14: Availability, Reliability & Durability**
