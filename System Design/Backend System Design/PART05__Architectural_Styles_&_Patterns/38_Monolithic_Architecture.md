# 38. Monolithic Architecture

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Monolithic Architecture** is a traditional software design pattern where all components of an application (UI, business logic, data access) are tightly integrated and deployed as a single, unified unit.

**What it is:**
- Single codebase containing entire application
- All modules compiled together into one deployable artifact (JAR, WAR, binary)
- Shared memory space (all code runs in same process)
- Single database for entire application

**Why it exists:**
- Simplicity (easier to develop, test, deploy initially)
- Strong consistency (ACID transactions across entire application)
- No network latency (in-process method calls)
- Easier debugging (single stack trace, one log file)

**Problem it solves:**
- Unified development (one codebase, one team can understand everything)
- Simplified deployment (deploy entire app at once)
- Strong data consistency (single database, local transactions)
- Lower operational complexity (one thing to monitor)

**Traditional structure:**

```
Monolithic Application (single deployable)
├── Presentation Layer (UI controllers)
├── Business Logic Layer (services)
├── Data Access Layer (repositories)
└── Database (single PostgreSQL/MySQL)
```

💡 **Interview Opening:** "Monolithic architecture is a design where the entire application—UI, business logic, and data access—is built, deployed, and scaled as a single unit. For example, an e-commerce monolith might have user management, product catalog, orders, and payments all in one Java WAR file connected to one PostgreSQL database. This works great for small-to-medium applications (< 10 developers, < 100K users) because of simplicity: single codebase, easy local development, straightforward deployment. However, it faces scaling challenges—can't scale components independently, slow deployments (entire app restart), technology lock-in (one language/framework), and tight coupling makes changes risky. Companies like Amazon and Netflix started as monoliths, then migrated to microservices as they scaled. The key trade-off: monoliths optimize for simplicity early on, but microservices optimize for scalability and team autonomy later."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Monolithic Architecture Structure**

```
┌─────────────────────────────────────────────────────┐
│         Monolithic Application (single process)     │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │         Presentation Layer                     │ │
│  │  (Controllers, Views, REST APIs)              │ │
│  └──────────────────┬────────────────────────────┘ │
│                     │                               │
│  ┌──────────────────▼────────────────────────────┐ │
│  │         Business Logic Layer                   │ │
│  │  (Services, Domain Models, Validators)        │ │
│  └──────────────────┬────────────────────────────┘ │
│                     │                               │
│  ┌──────────────────▼────────────────────────────┐ │
│  │         Data Access Layer                      │ │
│  │  (Repositories, ORM, SQL queries)             │ │
│  └──────────────────┬────────────────────────────┘ │
│                     │                               │
└─────────────────────┼───────────────────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │    Database     │
            │   (PostgreSQL)  │
            └─────────────────┘

All layers in single deployment unit (e.g., app.war)
```

### **Example: E-commerce Monolith**

```java
// Single Spring Boot application
@SpringBootApplication
public class EcommerceApplication {
    public static void main(String[] args) {
        SpringApplication.run(EcommerceApplication.class, args);
    }
}

// User Management
@RestController
@RequestMapping("/api/users")
public class UserController {
    @Autowired
    private UserService userService;
    
    @PostMapping("/register")
    public ResponseEntity<User> register(@RequestBody UserDto dto) {
        User user = userService.createUser(dto);
        return ResponseEntity.ok(user);
    }
}

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
    
    @Transactional
    public User createUser(UserDto dto) {
        // All business logic in same codebase
        User user = new User(dto.getEmail(), dto.getPassword());
        return userRepository.save(user);
    }
}

// Product Catalog
@RestController
@RequestMapping("/api/products")
public class ProductController {
    @Autowired
    private ProductService productService;
    
    @GetMapping("/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id) {
        Product product = productService.findById(id);
        return ResponseEntity.ok(product);
    }
}

// Order Management
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    @Autowired
    private OrderService orderService;
    
    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderDto dto) {
        Order order = orderService.createOrder(dto);
        return ResponseEntity.ok(order);
    }
}

@Service
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;
    @Autowired
    private ProductService productService;
    @Autowired
    private UserService userService;
    @Autowired
    private PaymentService paymentService;
    
    @Transactional
    public Order createOrder(OrderDto dto) {
        // All in same transaction (ACID guarantee)
        User user = userService.findById(dto.getUserId());
        Product product = productService.findById(dto.getProductId());
        
        if (product.getStock() < dto.getQuantity()) {
            throw new OutOfStockException();
        }
        
        // Deduct stock
        product.setStock(product.getStock() - dto.getQuantity());
        productService.save(product);
        
        // Create order
        Order order = new Order(user, product, dto.getQuantity());
        orderRepository.save(order);
        
        // Process payment
        paymentService.charge(user, order.getTotalAmount());
        
        return order;
        // All or nothing - single database transaction
    }
}

// Single database schema
/*
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    product_id BIGINT REFERENCES products(id),
    quantity INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
*/
```

**Deployment:**

```bash
# Build entire application
mvn clean package
# Result: ecommerce-app.war (includes all modules)

# Deploy to Tomcat/Jetty
cp target/ecommerce-app.war /opt/tomcat/webapps/

# Single application server runs everything
# All requests handled by same JVM process
```

### **Characteristics of Monolithic Architecture**

#### **1. Single Deployment Unit**

```
Codebase structure:
ecommerce-monolith/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   ├── com.example.user/
│   │   │   │   ├── UserController.java
│   │   │   │   ├── UserService.java
│   │   │   │   └── UserRepository.java
│   │   │   ├── com.example.product/
│   │   │   │   ├── ProductController.java
│   │   │   │   ├── ProductService.java
│   │   │   │   └── ProductRepository.java
│   │   │   ├── com.example.order/
│   │   │   │   ├── OrderController.java
│   │   │   │   ├── OrderService.java
│   │   │   │   └── OrderRepository.java
│   │   │   └── Application.java
│   │   └── resources/
│   │       ├── application.properties
│   │       └── schema.sql
│   └── test/
├── pom.xml (single Maven/Gradle build)
└── Dockerfile (optional, single container)

Build output: Single JAR/WAR file
Deploy: All code deployed together
Scale: Replicate entire application (can't scale parts independently)
```

#### **2. Shared Memory & In-Process Communication**

```java
// Direct method calls (no network overhead)
@Service
public class OrderService {
    @Autowired
    private ProductService productService;  // Direct reference
    
    public Order createOrder(OrderDto dto) {
        // In-process method call (~nanoseconds)
        Product product = productService.findById(dto.getProductId());
        
        // No network latency, no serialization overhead
        // Compared to microservices: REST call (~10ms) or gRPC (~1ms)
    }
}

// Shared memory means:
✅ Fast communication (method calls)
✅ No serialization/deserialization
✅ Type safety (compile-time checks)
✅ Easy debugging (single stack trace)
```

#### **3. Single Database & Strong Consistency**

```java
@Service
public class OrderService {
    @Transactional  // Single database transaction
    public Order createOrder(OrderDto dto) {
        BEGIN TRANSACTION;
        
        // All operations in same transaction
        Product product = productRepository.findById(dto.getProductId());
        product.decrementStock(dto.getQuantity());
        productRepository.save(product);
        
        Order order = new Order(dto);
        orderRepository.save(order);
        
        paymentRepository.save(new Payment(order));
        
        COMMIT;  // Atomic: all succeed or all fail
        
        // Strong consistency guaranteed (ACID)
        // If payment fails, stock rollback happens automatically
    }
}

// Contrast with microservices:
// - Multiple databases (eventual consistency)
// - Distributed transactions (2PC, Saga)
// - Complex to ensure consistency
```

#### **4. Technology Stack Uniformity**

```
Monolith constraints:
- Single language: Java (can't mix Java + Python + Go)
- Single framework: Spring Boot (all modules use same framework)
- Single runtime: JVM (can't have Node.js modules)
- Single database: PostgreSQL (hard to add MongoDB for specific module)

Benefits:
✅ Easier to hire (one skill set)
✅ Code reuse (shared libraries)
✅ Consistent patterns (same coding style)

Drawbacks:
❌ Technology lock-in (hard to adopt new tech)
❌ Can't use best tool for specific job
❌ Entire team must agree on one stack
```

### **Scaling Monolithic Applications**

#### **Horizontal Scaling (Replication)**

```
Load Balancer
      │
      ├──────┬──────┬──────┐
      ▼      ▼      ▼      ▼
   App1   App2   App3   App4
   (Full  (Full  (Full  (Full
   copy)  copy)  copy)  copy)
      │      │      │      │
      └──────┴──────┴──────┘
               │
         ┌─────▼─────┐
         │ Database  │
         │(bottleneck)│
         └───────────┘

Limitations:
❌ Must replicate entire application (waste resources)
❌ Even if only Order service is bottleneck, must scale all
❌ Database becomes bottleneck (read replicas help, but writes limited)
❌ Can't scale components independently
```

#### **Vertical Scaling (Bigger Servers)**

```
Small server:  4 CPU, 8 GB RAM  → Handles 1K RPS
Medium server: 8 CPU, 16 GB RAM → Handles 2K RPS
Large server: 16 CPU, 32 GB RAM → Handles 4K RPS

Limitations:
❌ Expensive (larger servers cost exponentially more)
❌ Hard limit (can't buy infinite CPU/RAM)
❌ Single point of failure (if server dies, entire app down)
```

#### **Modular Monolith (Improvement)**

```
Instead of:
OrderService → ProductService → UserService (tight coupling)

Use:
OrderModule ────────────────┐
  │                         │
  └─→ OrderPublicAPI        │
                            │
ProductModule               │
  │                         │
  └─→ ProductPublicAPI ←────┘
  
UserModule
  │
  └─→ UserPublicAPI

Internal structure:
ecommerce-monolith/
├── order-module/
│   ├── internal/ (package-private)
│   │   ├── OrderServiceImpl.java
│   │   └── OrderRepository.java
│   └── api/ (public interface)
│       └── OrderPublicAPI.java
├── product-module/
│   ├── internal/
│   └── api/
└── user-module/
    ├── internal/
    └── api/

Benefits:
✅ Clear module boundaries (easier to understand)
✅ Controlled dependencies (only through public APIs)
✅ Easier to extract to microservices later
✅ Better team organization (team per module)

Still monolith:
- Single deployment
- Shared database
- In-process communication
```

### **Monolith vs Microservices Decision**

**When to use Monolith:**

```
✅ Small team (< 10 developers)
✅ Simple domain (not many subdomains)
✅ Early-stage product (need to move fast)
✅ Unclear requirements (domain still evolving)
✅ Limited ops expertise (no DevOps team)

Examples:
- Startup MVP (validate product-market fit)
- Internal tools (low traffic, small scope)
- Small SaaS product (< 100K users)
```

**When to migrate to Microservices:**

```
❌ Team > 20-50 developers (coordination overhead)
❌ Frequent deployments needed (can't wait for full app redeploy)
❌ Different scaling needs (some services need 10x more resources)
❌ Technology diversity needed (ML in Python, web in Node.js)
❌ Team autonomy wanted (independent releases)

Examples:
- Amazon (2001): Monolith → Microservices
- Netflix (2009): Monolith → Microservices
- Uber (2013): Monolith → Microservices
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Monolith Capacity Planning**

**Scenario:** E-commerce monolith with 100K daily active users

**Calculations:**

```
Assumptions:
- Average user: 10 requests per session
- Peak load: 5x average
- Application: Java Spring Boot monolith

Requests per day:
100K users × 10 requests = 1M requests

Requests per second (average):
1M / 86,400 = 11.5 RPS

Peak RPS:
11.5 × 5 = 57.5 RPS

Single instance capacity:
- Typical Spring Boot app: 500-1000 RPS (on 4 CPU, 8 GB RAM server)
- Our peak: 57.5 RPS
- Single instance sufficient!

Recommended setup:
- 2-3 instances (HA + rolling deploys)
- Load balancer (NGINX, AWS ALB)
- Read replicas for database (if read-heavy)

Resource requirements per instance:
- CPU: 4 cores (@ 20% utilization during peak)
- Memory: 8 GB (JVM heap: 4-6 GB)
- Storage: 50 GB (logs, temp files)

Database sizing:
- 100K users × 1 KB per user = 100 MB user data
- Product catalog: 10K products × 5 KB = 50 MB
- Orders: 1K orders/day × 2 KB = 2 MB/day = 730 MB/year
- Total: ~1 GB (easily fits in single PostgreSQL instance)

Costs (AWS):
- EC2 instances: 3 × t3.medium ($30/month) = $90/month
- RDS PostgreSQL: db.t3.medium ($50/month)
- Load Balancer: ALB ($20/month)
Total: ~$160/month

Scaling timeline:
0-10K users:    Single instance
10K-100K users: 2-3 instances (current)
100K-500K users: 5-10 instances + DB optimization
500K-1M users:  Consider microservices (monolith hitting limits)
```

### **Breaking Point Analysis**

**When does a monolith become problematic?**

```
Development team size:
5 developers:    Monolith works well
10 developers:   Starting to feel pain (merge conflicts, long CI/CD)
20+ developers:  Significant issues (deployment coordination, testing time)
50+ developers:  Critical (productivity drops, consider microservices)

Codebase size:
< 50K lines:     Easy to navigate
50K-200K lines:  Manageable with good structure
200K-500K lines: Hard to onboard new developers
> 500K lines:    Very difficult (long build times, unclear dependencies)

Deployment frequency:
Daily deploys:        Fine
10+ deploys per day:  Problematic (long deployment, high risk)
Continuous deployment: Very hard (small change requires full redeploy)

Response time degradation:
Average RPS: 1K   → Response time: 50ms
Average RPS: 5K   → Response time: 100ms (acceptable)
Average RPS: 10K  → Response time: 500ms (degraded)
Average RPS: 20K+ → Response time: 2000ms+ (unacceptable)

At this point, need to:
1. Identify bottlenecks (profiling, APM tools)
2. Optimize hot paths (caching, query optimization)
3. Scale vertically (bigger servers)
4. If still insufficient → Consider microservices
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Single Database Schema**

```sql
-- All tables in single database
-- Strong foreign key relationships

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL
);

CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    processed_at TIMESTAMP DEFAULT NOW()
);

-- Benefits of single database:
✅ Strong consistency (ACID transactions)
✅ Foreign key constraints (referential integrity)
✅ Joins (efficient queries across tables)
✅ Simple backup/restore (one database)

-- Drawbacks:
❌ Single point of failure (if DB down, entire app down)
❌ Scaling limitations (all tables scale together)
❌ Can't use different DB tech for different modules
   (e.g., PostgreSQL for orders, MongoDB for product catalog)
```

### **Transaction Management**

```java
@Service
public class OrderService {
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Order createOrder(Long userId, Long productId, int quantity) {
        // BEGIN TRANSACTION
        
        // 1. Check user exists
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException());
        
        // 2. Check product exists and has stock
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException());
        
        if (product.getStock() < quantity) {
            throw new OutOfStockException();
        }
        
        // 3. Deduct stock (pessimistic lock to prevent race conditions)
        product.setStock(product.getStock() - quantity);
        productRepository.save(product);
        
        // 4. Create order
        Order order = new Order();
        order.setUser(user);
        order.setTotalAmount(product.getPrice().multiply(quantity));
        order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order);
        
        // 5. Create order items
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setPrice(product.getPrice());
        orderItemRepository.save(item);
        
        // 6. Process payment
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setAmount(order.getTotalAmount());
        payment.setStatus(PaymentStatus.PENDING);
        
        boolean success = paymentGateway.charge(
            user.getPaymentMethod(), 
            order.getTotalAmount()
        );
        
        if (!success) {
            throw new PaymentFailedException();
            // Automatic rollback: stock restored, order deleted
        }
        
        payment.setStatus(PaymentStatus.COMPLETED);
        paymentRepository.save(payment);
        
        order.setStatus(OrderStatus.CONFIRMED);
        orderRepository.save(order);
        
        // COMMIT TRANSACTION
        return order;
    }
}

// If ANY step fails:
// - Entire transaction rolls back
// - Database restored to original state
// - No orphaned data, no inconsistencies

// This is HARD in microservices:
// - Need distributed transactions (2PC) or
// - Saga pattern (compensating transactions) or
// - Accept eventual consistency
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Scaling Strategies**

#### **1. Vertical Scaling (Scale Up)**

```
Timeline:
Year 1: 1K users  → 2 CPU, 4 GB RAM  ($20/month)
Year 2: 10K users → 4 CPU, 8 GB RAM  ($50/month)
Year 3: 50K users → 8 CPU, 16 GB RAM ($100/month)
Year 4: 100K users → 16 CPU, 32 GB RAM ($200/month)

Pros:
✅ Simple (no code changes)
✅ No complexity (still single instance)

Cons:
❌ Expensive (exponential cost growth)
❌ Hard limit (largest AWS instance: 448 CPUs, 24 TB RAM - but $$$)
❌ No redundancy (single point of failure)
```

#### **2. Horizontal Scaling (Scale Out)**

```
Load Balancer (NGINX / AWS ALB)
        │
        ├──────┬──────┬──────┐
        ▼      ▼      ▼      ▼
     App1   App2   App3   App4
     (copy) (copy) (copy) (copy)
        │      │      │      │
        └──────┴──────┴──────┘
                 │
           ┌─────▼──────┐
           │ PostgreSQL │
           │  (Primary) │
           └─────┬──────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
    Replica1          Replica2
    (Read only)       (Read only)

Configuration:
- Stateless application (no session data in-memory)
- Session storage: Redis / database
- Load balancer: Round-robin or least connections

Scaling math:
- 1 instance: 1K RPS
- 4 instances: 4K RPS (linear scaling)
- Limited by database (eventually need sharding)

Pros:
✅ Better availability (if one instance dies, others continue)
✅ Rolling deployments (update one instance at a time)
✅ Cost-effective (small instances cheaper)

Cons:
❌ Session management complexity (sticky sessions or external storage)
❌ Database bottleneck (all instances share same DB)
❌ Can't scale components independently (still replicating everything)
```

#### **3. Database Scaling**

```
Read-heavy workload:

          Application Instances
                  │
        ┌─────────┼─────────┐
        │ Writes (20%)      │ Reads (80%)
        ▼                   ▼
    ┌──────────┐      ┌────────────┐
    │ Primary  │ ───► │  Replica 1 │
    │   (RW)   │      └────────────┘
    └──────────┘
                      ┌────────────┐
                  ──► │  Replica 2 │
                      └────────────┘
                      
                      ┌────────────┐
                  ──► │  Replica 3 │
                      └────────────┘

Read scaling:
- Add read replicas (up to 5-10 replicas)
- Route reads to replicas
- Eventual consistency (replication lag: 100-500ms)

Write-heavy workload:
- Vertical scaling (bigger primary)
- Sharding (partition data):

User data (shard by user_id):
Shard 1: users 1-100K    → DB1
Shard 2: users 100K-200K → DB2
Shard 3: users 200K-300K → DB3

Pros:
✅ Handles more writes (distributed across shards)

Cons:
❌ Complex queries (joins across shards hard)
❌ Rebalancing (when adding new shards)
❌ At this point, consider microservices
```

### **Reliability & Fault Tolerance**

```
High Availability Setup:

          Route 53 (DNS)
                │
          ┌─────▼─────┐
          │    ALB    │
          │(multi-AZ) │
          └─────┬─────┘
                │
     ┌──────────┼──────────┐
     │          │          │
   ┌─▼─┐      ┌─▼─┐      ┌─▼─┐
   │Az1│      │Az2│      │Az3│
   └─┬─┘      └─┬─┘      └─┬─┘
     │          │          │
   App1       App2       App3
   
     │          │          │
     └──────────┼──────────┘
                ▼
          ┌──────────┐
          │ RDS      │
          │(multi-AZ)│
          │Primary+  │
          │Standby   │
          └──────────┘

Failure scenarios:

1. Single app instance dies:
   - ALB health check detects failure
   - Stops routing to dead instance
   - Other instances continue serving
   - Auto-scaling launches replacement
   - Downtime: 0 seconds

2. Entire availability zone fails:
   - Instances in other AZs continue
   - RDS automatic failover to standby (if multi-AZ)
   - Downtime: 30-120 seconds

3. Database primary fails:
   - RDS promotes standby to primary
   - DNS update (endpoint stays same)
   - Downtime: 60-120 seconds

SLA calculation:
- App instances: 99.95% (multi-AZ)
- RDS: 99.95% (multi-AZ)
- ALB: 99.99%
- Overall: ~99.9% (3 nines = 43 minutes downtime/month)
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **Security in Monolithic Architecture**

```java
// Single authentication/authorization layer
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .authorizeRequests()
                .antMatchers("/api/public/**").permitAll()
                .antMatchers("/api/admin/**").hasRole("ADMIN")
                .antMatchers("/api/**").authenticated()
            .and()
            .oauth2Login();  // Single OAuth2 configuration
    }
}

// Simpler than microservices:
✅ Single authentication point (no token propagation)
✅ Centralized authorization logic
✅ Single security audit (one codebase)
✅ Uniform security policies

// Session management
@Service
public class SessionService {
    @Autowired
    private HttpSession session;  // In-memory or Redis
    
    public void createSession(User user) {
        session.setAttribute("user", user);
        // All requests in same application can access session
    }
}
```

### **API Design**

```java
// Internal APIs (package-private)
@Service
class OrderServiceImpl {
    // Only accessible within order package
    void internalMethod() { }
}

// Public APIs (REST endpoints)
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {
    @Autowired
    private OrderService orderService;
    
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(orderService.findById(id));
    }
    
    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderDto dto) {
        return ResponseEntity.ok(orderService.createOrder(dto));
    }
}

// Versioning strategy
/api/v1/orders  → Current version
/api/v2/orders  → New version (breaking changes)

// Both versions coexist in same monolith
// Easier than microservices (no service discovery, no routing)
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Shopify (Modular Monolith)**

**Approach:** Shopify maintains a Ruby on Rails monolith (2M+ lines of code) but uses modular architecture

**Architecture:**
```
Shopify Monolith
├── Shop Module (store management)
├── Product Module (catalog)
├── Order Module (order processing)
├── Payment Module (payment processing)
├── Theme Module (storefront customization)
└── API Module (external APIs)

All in single Rails application
Deployed as one unit
Shared PostgreSQL database

Benefits:
✅ Strong consistency (ACID transactions)
✅ Fast development (easy to move code between modules)
✅ Simple deployment (one artifact)
✅ Handles 2M merchants, billions in GMV

Techniques to manage scale:
- Modular structure (clear boundaries)
- Feature flags (gradual rollouts)
- Database sharding (by merchant ID)
- Read replicas (for read-heavy queries)
- Background jobs (Sidekiq for async work)
- Caching (Redis, CDN)

Result: Successful large-scale monolith
```

### **Example 2: GitHub (Monolithic Rails App)**

**Architecture:**
```
GitHub Monolith (Rails)
├── Git operations (repositories, commits, branches)
├── Issues & Projects
├── Pull Requests & Code Review
├── Actions (CI/CD)
├── Packages (npm, Docker, Maven registries)
└── Security (Dependabot, CodeQL)

Scale:
- 100M+ developers
- 300M+ repositories
- Billions of API requests per day

Still a monolith in 2026!

How they scale:
1. Horizontal scaling (many application instances)
2. Database sharding (by repository ID)
3. Caching layers (Redis, memcached)
4. CDN for static assets
5. Background jobs (Resque for async work)
6. Service extraction (select services as microservices)
   - CI/CD runners (separate infrastructure)
   - Git storage (separate layer)

Why stay monolith:
✅ Strong consistency needed (repository data)
✅ Complex transactions (pull requests involve multiple tables)
✅ Developer productivity (single codebase, easy navigation)
✅ Works at scale (with right optimizations)
```

### **Example 3: Stack Overflow (ASP.NET Monolith)**

**Architecture:**
```
Stack Overflow Monolith (ASP.NET MVC + SQL Server)
├── Questions & Answers
├── User profiles & reputation
├── Tags & search
├── Jobs board
└── Teams (private Q&A)

Scale:
- 10M+ monthly visitors
- 9 servers (application tier)
- 2 SQL Server clusters

Famously efficient monolith:
- 9 web servers handle 10M visitors
- 2 SQL Server clusters (master + replica)
- Total: ~25 servers for entire infrastructure

Techniques:
1. Aggressive caching (Redis)
2. Optimized SQL queries
3. Denormalization where needed
4. No ORM overhead (Dapper micro-ORM)
5. Vertical scaling (powerful servers)

Why it works:
✅ Read-heavy workload (95% reads, 5% writes)
✅ Excellent caching (90%+ hit ratio)
✅ Simple domain (Q&A site)
✅ Strong engineering culture (performance focus)

Result: Proves monoliths can scale with right approach
```

### **Example 4: Basecamp (Ruby on Rails Majestic Monolith)**

**Philosophy:** "Majestic Monolith" approach

**Architecture:**
```
Basecamp 3 (Rails monolith)
├── Projects
├── To-dos
├── Messages
├── Schedules
├── Docs & Files
└── Real-time chat (via Action Cable)

Scale:
- 3M+ users
- 20M+ projects
- Single Rails application
- 6 application servers
- 1 PostgreSQL cluster

Why monolith:
✅ Small team (12 developers)
✅ Fast development (no microservice complexity)
✅ Simple operations (one thing to deploy/monitor)
✅ Strong consistency (important for collaboration)

Tools for scale:
- Caching (Russian doll caching)
- Background jobs (Sidekiq)
- Real-time (Action Cable / WebSockets)
- CDN (static assets)

Philosophy:
"Start with a monolith. Extract services only when pain is unbearable."
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain monolithic architecture and when you would use it.**

**Answer:**
"Monolithic architecture is a design where the entire application—UI, business logic, and data access—is built, deployed, and scaled as a single unit. For example, an e-commerce monolith has user management, product catalog, orders, and payments all in one Java WAR file deployed to Tomcat, connected to one PostgreSQL database.

**Core characteristics:**

**1. Single deployment unit:** All code compiled into one artifact (JAR/WAR). Changes to any module require redeploying entire application.

**2. In-process communication:** Direct method calls between modules (nanoseconds), not network calls. Contrast with microservices: REST call (~10ms) or gRPC (~1ms).

**3. Single database:** All modules share same database. Strong consistency via ACID transactions. Example: creating an order with payment in one transaction—if payment fails, stock automatically rolls back.

**4. Shared resources:** Same memory space, thread pool, connection pool. One module consuming resources affects others.

**When to use monolithic architecture:**

**1. Small teams (< 10 developers):**
- Easy coordination (everyone works in same codebase)
- No microservice overhead (no service discovery, no API versioning)
- Fast development (move code easily between modules)

**2. Early-stage product (MVP):**
- Requirements unclear (domain still evolving)
- Need to move fast (build features, not infrastructure)
- Premature microservices = premature optimization

**3. Simple domain (not complex):**
- Clear bounded contexts not yet identified
- Low complexity (few subdomains)
- Monolith with good modular structure sufficient

**4. Strong consistency required:**
- ACID transactions critical (financial, inventory)
- Distributed transactions complex (2PC, Saga)
- Monolith provides strong guarantees out-of-box

**When to migrate away:**

**1. Team growth (> 20-50 developers):**
- Coordination overhead (merge conflicts, testing time)
- Deployment bottleneck (wait for full regression)
- Teams want autonomy (independent releases)

**2. Scaling challenges:**
- Different modules need different resources (CPU-bound vs memory-bound)
- Can't scale independently (must replicate entire app)
- Example: order service needs 10x capacity, but user service doesn't

**3. Technology diversity needed:**
- Best tool for job (ML in Python, web in Node.js, real-time in Go)
- Monolith locks entire app into one stack

**4. Deployment frequency:**
- Need 10+ deploys per day (continuous deployment)
- Small change requires full application restart (slow, risky)

**Real-world example:**

**Before (Monolith):**
- 5 developers, single codebase, deploy 1x per week
- 10K users, 100 RPS peak, single PostgreSQL database
- 2 application instances behind load balancer
- Cost: $200/month, complexity: low
- Works great!

**After growth (problems):**
- 30 developers, deployment takes 30 minutes, merge conflicts daily
- 500K users, 10K RPS peak, database bottleneck
- Order service needs 10x capacity, but can't scale independently
- Deploy coordination nightmare (teams blocking each other)

**Solution: Migrate to microservices:**
- Extract high-traffic services (order, product catalog)
- Keep low-traffic in monolith (user settings, admin)
- Result: Order service scales independently, deployments faster

**Best practice: Modular monolith**

Instead of tightly coupled monolith, use clear module boundaries:

```
ecommerce-monolith/
├── order-module/
│   ├── internal/ (package-private, encapsulated)
│   └── api/ (public interface)
├── product-module/
│   ├── internal/
│   └── api/
└── user-module/
    ├── internal/
    └── api/
```

Benefits:
✅ Still monolith (simple deployment, strong consistency)
✅ Clear boundaries (easier to understand, test)
✅ Easy extraction (if needed, extract module to microservice)

Examples of successful monoliths:
- Shopify: 2M+ lines Rails monolith, 2M merchants, billions GMV
- GitHub: Rails monolith, 100M developers, 300M repositories
- Stack Overflow: ASP.NET monolith, 10M visitors on 9 servers
- Basecamp: Rails monolith, 3M users, 12 developers

**Key insight:** Monolith is not bad—it's the default, simple choice. Microservices solve problems of scale and team coordination but introduce complexity. Don't migrate prematurely. Migrate when pain (deployment coordination, scaling limitations) justifies cost (operational complexity, distributed transactions)."

### **Common Follow-Up Questions**

**Q1: How do you prevent a monolith from becoming a "big ball of mud"?**

```
Answer:

1. Modular structure (bounded contexts):
   - Organize by business domain, not technical layer
   - Bad:  /controllers, /services, /repositories (technical)
   - Good: /order, /product, /user (domain-driven)
   
   order-module/
   ├── OrderController.java
   ├── OrderService.java
   ├── OrderRepository.java
   └── Order.java (domain model)

2. Enforce module boundaries:
   - Package-private classes (internal implementation)
   - Public interfaces (module API)
   - ArchUnit tests (enforce no violations)

   @Test
   public void orderModuleShouldNotDependOnPaymentInternal() {
       noClasses()
           .that().resideInPackage("..order..")
           .should().dependOnClassesThat()
           .resideInPackage("..payment.internal..")
           .check(classes);
   }

3. Dependency direction:
   - Domain layer doesn't depend on infrastructure
   - Use dependency inversion (interfaces)

   Bad:
   OrderService → PostgresOrderRepository (tight coupling)

   Good:
   OrderService → OrderRepository (interface)
                         ▲
                         │
              PostgresOrderRepository (implementation)

4. Shared kernel (minimal):
   - Common utilities in separate package
   - Minimize shared code (prefer duplication over coupling)

5. Bounded contexts (DDD):
   - Each module has own vocabulary
   - No shared domain models across modules
   - Example: "Customer" in sales context ≠ "Customer" in support context

6. API-first design:
   - Modules expose well-defined APIs
   - Internal implementation hidden
   - Like microservices, but in-process

7. Code reviews & architecture guardians:
   - Senior engineers review cross-module dependencies
   - Reject PRs that violate boundaries
   - Automated checks in CI/CD

8. Regular refactoring:
   - Don't let technical debt accumulate
   - Allocate time for cleanup
   - Boy Scout Rule: "Leave code better than you found it"

Real-world example (Shopify):
- 2M+ lines Rails monolith
- Strict module boundaries (enforced by tooling)
- Public vs internal APIs clearly defined
- Regular refactoring sprints
- Result: Maintainable despite size
```

**Q2: When should you migrate from monolith to microservices?**

```
Answer:

Triggers for migration (must have multiple):

1. Team size > 20-50 developers:
   - Coordination overhead (daily standup takes 1 hour)
   - Merge conflicts frequent (competing for same files)
   - Deployment coordination (teams blocking each other)

2. Deployment bottleneck:
   - Need > 10 deploys per day (continuous deployment)
   - Small change requires full regression (hours)
   - Deployment failure affects all teams

3. Scaling limitations:
   - Different modules need different resources
   - Example: Payment (CPU-bound) needs 2x capacity,
             Orders (memory-bound) needs 8x capacity
   - Can't scale independently (must replicate all)

4. Technology diversity:
   - Need different tech for different jobs
   - Example: ML in Python, web in Node.js, streaming in Go
   - Monolith locks to single stack

5. Team autonomy desired:
   - Teams want independent releases
   - Don't want to coordinate with other teams
   - Want ownership of specific services

Migration strategy (Strangler Fig Pattern):

Phase 1: Identify boundaries
- Map existing monolith modules
- Identify high-value services to extract first

High-value characteristics:
✅ Clear bounded context (well-defined API)
✅ Different scaling needs (bottleneck)
✅ Independent deployment needed (high change frequency)
✅ Team ownership clear (dedicated team)

Example:
- Order service: 80% of traffic, needs 10x capacity ← Extract first
- User service: 5% of traffic, stable ← Keep in monolith
- Admin service: 1% of traffic, rarely changes ← Keep in monolith

Phase 2: Extract service (one at a time)
Step 1: Create interface in monolith
Step 2: Build microservice implementing same interface
Step 3: Proxy pattern (monolith calls microservice via HTTP)
Step 4: Migrate clients to call microservice directly
Step 5: Remove code from monolith

Timeline: 3-6 months per service (careful migration)

Phase 3: Extract data
- Separate database for microservice
- Data synchronization (dual writes or CDC)
- Eventual consistency (accept trade-off)

Phase 4: Repeat
- Extract next high-value service
- Keep low-value in monolith (don't need to migrate everything)

Anti-patterns (avoid):

❌ Big bang rewrite:
- Rewrite entire monolith to microservices at once
- High risk (6-12 month project, hard to deliver)
- Feature freeze (no new features during rewrite)

❌ Premature extraction:
- Extract before boundaries clear
- Result: Chatty microservices (many calls between services)
- Distributed monolith (worst of both worlds)

❌ Extract everything:
- Low-traffic, stable services don't need extraction
- Keep in monolith (simpler)

✅ Best practice:
- Extract 20-30% high-traffic services
- Keep 70-80% low-traffic in monolith
- Hybrid: Microservices + modular monolith

Real-world examples:

Amazon (2001):
- Monolith → Microservices over 5 years
- Extracted critical services first (catalog, payments)
- Kept low-priority in monolith initially

Netflix (2009):
- DVD monolith → Streaming microservices over 7 years
- Gradual migration (strangler fig)
- Result: 700+ microservices by 2016

Shopify:
- Modular monolith (2M+ lines)
- Extracted select services (checkout, payments)
- Core remains monolith (works great)

Key decision factors:
Team size          < 20:      Monolith
                   20-50:     Consider microservices
                   > 50:      Likely need microservices

Traffic            < 1K RPS:  Monolith
                   1K-10K:    Monolith with optimization
                   > 10K:     Consider microservices

Deployment freq    < 1/day:   Monolith
                   1-10/day:  Either
                   > 10/day:  Microservices

If 2+ factors favor microservices → Migrate
If 1 factor → Optimize monolith first
If 0 factors → Stay monolith
```

**Q3: Compare monolith vs microservices trade-offs**

```
Answer:

Comparison table:

Aspect              Monolith                Microservices
────────────────────────────────────────────────────────────
Development         ✅ Simple               ❌ Complex
Onboarding          ✅ Easy                 ❌ Hard
Testing             ✅ Easy (one app)       ❌ Hard (integration tests)
Deployment          ✅ Simple               ❌ Complex (orchestration)
Consistency         ✅ Strong (ACID)        ❌ Eventual (distributed)
Latency             ✅ Low (in-process)     ❌ Higher (network calls)
Scaling             ❌ Coarse-grained       ✅ Fine-grained
Team autonomy       ❌ Low                  ✅ High
Technology choice   ❌ Uniform              ✅ Polyglot
Debugging           ✅ Easy (stack trace)   ❌ Hard (distributed tracing)
Ops complexity      ✅ Low                  ❌ High (monitoring, logging)
Failure isolation   ❌ Cascade              ✅ Isolated
Cost (small scale)  ✅ Low                  ❌ High
Cost (large scale)  ❌ High                 ✅ Optimized

Detailed trade-offs:

1. Development speed:
   Monolith: Fast initially (no distributed complexity)
   Microservices: Slow initially (setup infrastructure)
   
   Crossover: ~20-50 developers
   Below: Monolith faster
   Above: Microservices faster (team autonomy)

2. Consistency:
   Monolith: ACID transactions (strong consistency)
   Example:
   @Transactional
   void createOrder() {
       deductStock();  // Step 1
       createOrder();  // Step 2
       chargePayment(); // Step 3
       // All succeed or all fail (atomic)
   }
   
   Microservices: Distributed transactions (eventual consistency)
   Example (Saga pattern):
   OrderService: Create order (step 1)
     → InventoryService: Deduct stock (step 2)
       → PaymentService: Charge (step 3)
   If step 3 fails: Compensate (refund stock, cancel order)
   
   Complexity: 10x more code, edge cases, failure modes

3. Performance:
   Monolith: In-process method calls (~1 nanosecond)
   Microservices: Network calls (~1-10 milliseconds)
   
   Example:
   Monolith: orderService.findById(123)  // 1 ns
   Microservices: http.get("/orders/123") // 10 ms
   
   Difference: 10,000,000x slower!
   
   For single call: Negligible
   For 100 calls per request: 1 second added latency

4. Scaling:
   Monolith: Replicate entire app
   - Order service bottleneck? Must scale all services
   - Waste: Scale user service even if not needed
   
   Microservices: Scale specific services
   - Order service: 10 instances
   - User service: 2 instances (not bottleneck)
   - Cost savings: 50-70%

5. Deployment:
   Monolith: Single deployment
   - One artifact, one pipeline
   - But: Full regression needed (risk)
   
   Microservices: Independent deployments
   - Order service: 10 deploys/day (no coordination)
   - User service: 1 deploy/week (stable)
   - But: Need sophisticated CI/CD (cost)

When to use each:

Use Monolith when:
✅ Small team (< 10 developers)
✅ Early-stage product (MVP, unclear requirements)
✅ Strong consistency critical (financial transactions)
✅ Low operational expertise (no DevOps team)
✅ Cost-sensitive (startups)

Use Microservices when:
✅ Large team (> 20-50 developers)
✅ Need frequent deployments (> 10/day)
✅ Different scaling needs (some services 10x traffic)
✅ Team autonomy wanted (independent releases)
✅ Have ops expertise (DevOps, SRE team)

Hybrid approach (best for many):
- Modular monolith (80% of features)
- Extract 20% to microservices (high-traffic, bottleneck services)
- Example: Shopify, GitHub

Benefits of hybrid:
✅ Simplicity where possible (monolith)
✅ Scalability where needed (microservices)
✅ Lower complexity than pure microservices
✅ Easier migration path (gradual extraction)

Real-world decision:
- Start monolith (< 10 developers)
- Grow to modular monolith (10-20 developers)
- Extract critical services (> 20 developers, scaling pain)
- Keep low-priority in monolith (simplicity)

Amazon's rule: "You build it, you run it"
- If team can't operate microservice, keep in monolith
- Only extract when team ready for operational burden
```

### **Key Talking Points**

1. **"Monolith = single deployable unit, strong consistency, simple operations"**: Core definition
2. **"Works great for < 10 developers, < 100K users, simple domain"**: When to use
3. **"Shopify, GitHub, Stack Overflow run large monoliths successfully"**: Proof it scales
4. **"Migrate to microservices when > 20 developers, deployment bottleneck"**: When to change
5. **"Modular monolith: Clear boundaries, easier extraction later"**: Best practice
6. **"Strangler Fig Pattern: Extract incrementally, not big bang rewrite"**: Migration strategy
7. **"Hybrid: 80% monolith + 20% microservices = practical solution"**: Real-world approach

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **Monolithic Architecture Layers**

```
┌─────────────────────────────────────────────────┐
│        Load Balancer (NGINX / AWS ALB)          │
└───────────────────┬─────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
┌───▼────┐      ┌───▼────┐      ┌───▼────┐
│ App 1  │      │ App 2  │      │ App 3  │
│Instance│      │Instance│      │Instance│
└───┬────┘      └───┬────┘      └───┬────┘
    │               │               │
    │  ┌────────────┴────────────┐  │
    │  │                         │  │
    │  │   Application Layers:   │  │
    │  │                         │  │
    │  │  ┌─────────────────┐   │  │
    │  │  │ Presentation    │   │  │
    │  │  │ (Controllers)   │   │  │
    │  │  └────────┬────────┘   │  │
    │  │           │             │  │
    │  │  ┌────────▼────────┐   │  │
    │  │  │ Business Logic  │   │  │
    │  │  │ (Services)      │   │  │
    │  │  └────────┬────────┘   │  │
    │  │           │             │  │
    │  │  ┌────────▼────────┐   │  │
    │  │  │ Data Access     │   │  │
    │  │  │ (Repositories)  │   │  │
    │  │  └────────┬────────┘   │  │
    │  │           │             │  │
    │  └───────────┼─────────────┘  │
    │              │                │
    └──────────────┼────────────────┘
                   │
                   ▼
        ┌──────────────────┐
        │    PostgreSQL    │
        │   (Primary)      │
        └────────┬─────────┘
                 │
        ┌────────┴────────┐
        │                 │
    ┌───▼────┐       ┌───▼────┐
    │Replica1│       │Replica2│
    │(Read)  │       │(Read)  │
    └────────┘       └────────┘
```

### **Request Flow in Monolith**

```
User Request: POST /api/orders
                │
                ▼
        ┌───────────────┐
        │Load Balancer  │
        └───────┬───────┘
                │ (Route to instance)
                ▼
        ┌───────────────┐
        │ Controller    │
        │ Layer         │
        └───────┬───────┘
                │ orderService.createOrder(dto)
                ▼
        ┌───────────────┐
        │ Service       │
        │ Layer         │
        │               │
        │ BEGIN TX      │
        │   │           │
        │   ├─→ productService.checkStock()
        │   │   (in-process call, ~1 ns)
        │   │           │
        │   ├─→ productRepository.decrementStock()
        │   │   (SQL UPDATE, ~5 ms)
        │   │           │
        │   ├─→ orderRepository.save()
        │   │   (SQL INSERT, ~5 ms)
        │   │           │
        │   ├─→ paymentService.charge()
        │   │   (external API, ~100 ms)
        │   │           │
        │   └─→ COMMIT TX
        │       (if all succeed)
        │       or ROLLBACK
        │       (if any fails)
        │               │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │ Repository    │
        │ Layer         │
        └───────┬───────┘
                │
                ▼
        ┌───────────────┐
        │  Database     │
        └───────────────┘
                │
                ▼
        Response: Order created
        Total time: ~120 ms
        (mostly payment API, not internal calls)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why Monolithic Architecture Matters**

**Business Impact:**
- **Fast time-to-market**: Simple to develop, deploy, test (good for MVP/startups)
- **Lower operational cost**: One application to monitor, no microservice overhead
- **Strong consistency**: ACID transactions, no distributed transaction complexity
- **Team efficiency**: Small teams productive (< 10 developers optimal)

**Technical Impact:**
- **Low latency**: In-process method calls (nanoseconds vs milliseconds for network)
- **Simple deployment**: Single artifact, one CI/CD pipeline
- **Easy debugging**: Single stack trace, one log file, straightforward troubleshooting
- **Type safety**: Compile-time checks (vs runtime failures in microservices)

### **How It Works (Simple Summary)**

1. **Single codebase**: All modules (UI, business logic, data access) in one repository
2. **Compile together**: Build process produces single artifact (JAR, WAR, binary)
3. **Deploy as unit**: All code deployed together to application server
4. **Shared database**: Single database for entire application (strong consistency)
5. **In-process calls**: Modules communicate via direct method calls (no network)
6. **Scale horizontally**: Replicate entire application behind load balancer

**For production systems:**
- Use **modular structure** (clear bounded contexts, package organization)
- Implement **layered architecture** (presentation, business, data access)
- Apply **dependency inversion** (interfaces, not concrete dependencies)
- Setup **horizontal scaling** (multiple instances, stateless design)
- Add **database read replicas** (for read-heavy workloads)
- Monitor for **breaking point** (team size, deployment frequency, scaling needs)

### **Key Trade-offs**

| Aspect | Monolith | Microservices |
|--------|----------|---------------|
| **Initial development** | Fast ✅ | Slow ❌ |
| **Team size** | < 10 ✅ | > 20 ✅ |
| **Deployment** | Simple ✅ | Complex ❌ |
| **Scaling** | Coarse-grained ❌ | Fine-grained ✅ |
| **Consistency** | Strong (ACID) ✅ | Eventual ❌ |
| **Latency** | Low (in-process) ✅ | Higher (network) ❌ |
| **Ops complexity** | Low ✅ | High ❌ |
| **Technology choice** | Uniform ❌ | Polyglot ✅ |

### **Remember These Numbers**

```
Optimal team size:              5-10 developers
Breaking point team size:       20-50 developers
Critical team size:             > 50 developers (high dysfunction risk)

Method call latency:            ~1 nanosecond
REST API call latency:          ~10 milliseconds
Latency difference:             10,000,000x

Single instance capacity:       500-1000 RPS (typical)
Horizontal scaling:             Linear (2 instances = 2x capacity)

Database transaction overhead:  ~1 millisecond
Distributed transaction:        ~50-200 milliseconds (20-200x slower)

Build time (small monolith):    1-5 minutes
Build time (large monolith):    10-30 minutes
Build time (microservices):     5-10 minutes per service

Deployment time (monolith):     5-15 minutes (full restart)
Deployment time (microservice): 2-5 minutes (one service)

Successful monolith examples:
- Shopify: 2M+ lines, 2M merchants
- GitHub: 100M developers, 300M repos
- Stack Overflow: 10M visitors, 9 servers
- Basecamp: 3M users, 12 developers
```

### **Production Wisdom**

✅ **Start with monolith** (optimize for learning and speed)  
✅ **Use modular structure** (clear boundaries, easier extraction later)  
✅ **Enforce boundaries** (ArchUnit tests, code reviews, package-private)  
✅ **Strong layering** (presentation, business, data access)  
✅ **Stateless design** (horizontal scaling, session in Redis/DB)  
✅ **Monitor breaking point** (team size, deployment frequency, scaling limits)  
✅ **Migrate incrementally** (Strangler Fig, not big bang rewrite)  
✅ **Hybrid approach** (80% monolith + 20% microservices = practical)  

❌ **Don't rewrite from scratch** (risky, expensive, often fails)  
❌ **Don't migrate prematurely** (microservices add complexity, cost)  
❌ **Don't extract everything** (keep low-priority in monolith)  
❌ **Don't ignore module boundaries** (leads to "big ball of mud")  
❌ **Don't share domain models** (causes tight coupling)  
❌ **Don't fear monoliths** (they work at scale with right approach)  

---

**Final thought for interviews:**

> "Monolithic architecture is the default, practical choice for most applications. It optimizes for simplicity, consistency, and development speed—critical for small teams and early-stage products. Companies like Shopify (2M merchants), GitHub (100M developers), and Stack Overflow (10M visitors) prove monoliths can scale with proper engineering: modular structure, clear boundaries, horizontal scaling, and aggressive caching. The key mistake is premature microservices—they introduce distributed transaction complexity, operational overhead, and network latency without providing benefits until you have specific pain points (team coordination, scaling limitations, deployment frequency). Start monolith, grow to modular monolith, extract critical services when pain justifies cost. The goal isn't architectural purity—it's delivering business value with appropriate technical complexity."
