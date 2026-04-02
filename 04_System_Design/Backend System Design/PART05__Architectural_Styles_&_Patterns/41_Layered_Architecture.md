# 41. Layered Architecture

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Layered Architecture** (also called **N-Tier Architecture**) organizes code into horizontal layers, each with specific responsibilities. The most common is **3-Tier**: Presentation Layer (UI), Business Logic Layer (domain rules), and Data Access Layer (database).

**What it is:**
- Code organized into layers (presentation, business, data)
- Each layer only communicates with adjacent layer
- Separation of concerns (UI separate from database logic)
- Common in enterprise applications (Java Spring, .NET, Django)

**Why it exists:**
- Maintainability (change one layer without affecting others)
- Testability (test business logic without UI or database)
- Reusability (business logic shared across multiple UIs)
- Team organization (frontend/backend/database specialists)

**Layer flow:**

```
User → Presentation Layer (Controllers, Views)
         ↓
       Business Logic Layer (Services, Domain Logic)
         ↓
       Data Access Layer (Repositories, DAO)
         ↓
       Database (PostgreSQL, MySQL)
```

💡 **Interview Opening:** "Layered Architecture organizes code into horizontal layers—typically Presentation, Business Logic, and Data Access. Each layer has a single responsibility: Controllers handle HTTP requests, Services implement business rules, Repositories abstract database access. A request flows through layers: User calls `POST /api/orders` → `OrderController.createOrder()` → `OrderService.validateAndCreate()` → `OrderRepository.save()` → PostgreSQL. Each layer only depends on the layer below (top-down dependency), never upward. Benefits: separation of concerns (UI changes don't affect business logic), testability (mock repositories for unit tests), reusability (same business logic for web + mobile). Trade-off: can become overly rigid (strict layers add indirection), and cross-cutting concerns (logging, security) span multiple layers. Used widely in enterprise Java (Spring Boot with @Controller/@Service/@Repository) and .NET. Modern Clean Architecture improves on this by inverting dependencies (business logic doesn't depend on database, uses interfaces)."

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **3-Tier Layered Architecture**

#### **Presentation Layer (UI / Controllers)**

**Responsibilities:**
- Handle HTTP requests/responses
- Input validation (format, required fields)
- Authentication/authorization (JWT validation)
- Route to appropriate business logic
- Return response (JSON, HTML, XML)

**Java Spring Boot example:**

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {
  
  @Autowired
  private OrderService orderService;
  
  // POST /api/orders
  @PostMapping
  public ResponseEntity<OrderDTO> createOrder(
    @RequestBody @Valid CreateOrderRequest request,
    @AuthenticationPrincipal User user
  ) {
    // Input validation (done by @Valid annotation)
    // Authentication (done by @AuthenticationPrincipal)
    
    // Delegate to business layer
    Order order = orderService.createOrder(
      user.getId(),
      request.getItems(),
      request.getShippingAddress()
    );
    
    // Convert to DTO (Data Transfer Object)
    OrderDTO dto = OrderDTO.from(order);
    
    return ResponseEntity.status(HttpStatus.CREATED).body(dto);
  }
  
  // GET /api/orders/{id}
  @GetMapping("/{id}")
  public ResponseEntity<OrderDTO> getOrder(@PathVariable Long id) {
    Order order = orderService.getOrder(id);
    
    if (order == null) {
      return ResponseEntity.notFound().build();
    }
    
    return ResponseEntity.ok(OrderDTO.from(order));
  }
}
```

**Key principles:**
- **Thin controllers**: No business logic (just routing)
- **DTOs**: Convert domain objects to API responses (hide internal fields)
- **Validation**: Request validation (but not business rules)

#### **Business Logic Layer (Services / Domain)**

**Responsibilities:**
- Implement business rules (discounts, inventory checks)
- Coordinate multiple data access operations
- Transaction management (@Transactional)
- Domain logic (calculate totals, validate constraints)

**Java Spring Boot example:**

```java
@Service
public class OrderService {
  
  @Autowired
  private OrderRepository orderRepository;
  
  @Autowired
  private ProductRepository productRepository;
  
  @Autowired
  private InventoryService inventoryService;
  
  @Transactional
  public Order createOrder(
    Long userId,
    List<OrderItem> items,
    Address shippingAddress
  ) {
    // Business rule: Validate items not empty
    if (items == null || items.isEmpty()) {
      throw new BusinessException("Order must have at least one item");
    }
    
    // Business rule: Check inventory for each item
    for (OrderItem item : items) {
      Product product = productRepository.findById(item.getProductId())
        .orElseThrow(() -> new NotFoundException("Product not found"));
      
      boolean available = inventoryService.checkAvailability(
        product.getId(),
        item.getQuantity()
      );
      
      if (!available) {
        throw new BusinessException(
          "Product " + product.getName() + " out of stock"
        );
      }
    }
    
    // Business rule: Calculate total (with tax, shipping)
    BigDecimal subtotal = items.stream()
      .map(item -> {
        Product product = productRepository.findById(item.getProductId()).get();
        return product.getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
      })
      .reduce(BigDecimal.ZERO, BigDecimal::add);
    
    BigDecimal tax = subtotal.multiply(BigDecimal.valueOf(0.08)); // 8% tax
    BigDecimal shipping = BigDecimal.valueOf(9.99);
    BigDecimal total = subtotal.add(tax).add(shipping);
    
    // Business rule: Apply discount if total > $100
    if (total.compareTo(BigDecimal.valueOf(100)) > 0) {
      total = total.multiply(BigDecimal.valueOf(0.9)); // 10% off
    }
    
    // Create order entity
    Order order = new Order();
    order.setUserId(userId);
    order.setItems(items);
    order.setShippingAddress(shippingAddress);
    order.setSubtotal(subtotal);
    order.setTax(tax);
    order.setShipping(shipping);
    order.setTotal(total);
    order.setStatus(OrderStatus.PENDING);
    order.setCreatedAt(Instant.now());
    
    // Save to database (via data layer)
    order = orderRepository.save(order);
    
    // Deduct inventory (coordination with another service)
    for (OrderItem item : items) {
      inventoryService.deductStock(item.getProductId(), item.getQuantity());
    }
    
    return order;
  }
  
  public Order getOrder(Long id) {
    return orderRepository.findById(id).orElse(null);
  }
}
```

**Key principles:**
- **Business rules centralized**: All domain logic in service layer
- **Transactions**: @Transactional ensures atomicity (all or nothing)
- **No direct database access**: Uses repositories
- **Coordination**: Calls multiple repositories, external services

#### **Data Access Layer (Repositories / DAO)**

**Responsibilities:**
- Abstract database operations (CRUD)
- Encapsulate SQL/queries
- No business logic (just data access)

**Java Spring Boot example (Spring Data JPA):**

```java
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
  
  // Custom queries
  
  @Query("SELECT o FROM Order o WHERE o.userId = :userId ORDER BY o.createdAt DESC")
  List<Order> findByUserId(@Param("userId") Long userId);
  
  @Query("SELECT o FROM Order o WHERE o.status = :status")
  List<Order> findByStatus(@Param("status") OrderStatus status);
  
  @Query("""
    SELECT o FROM Order o
    WHERE o.createdAt BETWEEN :startDate AND :endDate
    AND o.status = 'COMPLETED'
  """)
  List<Order> findCompletedOrdersInRange(
    @Param("startDate") Instant startDate,
    @Param("endDate") Instant endDate
  );
}
```

**Traditional DAO (Data Access Object) pattern:**

```java
@Repository
public class OrderDAO {
  
  @Autowired
  private JdbcTemplate jdbcTemplate;
  
  public Order findById(Long id) {
    String sql = "SELECT * FROM orders WHERE id = ?";
    
    return jdbcTemplate.queryForObject(
      sql,
      new Object[]{id},
      (rs, rowNum) -> {
        Order order = new Order();
        order.setId(rs.getLong("id"));
        order.setUserId(rs.getLong("user_id"));
        order.setTotal(rs.getBigDecimal("total"));
        order.setStatus(OrderStatus.valueOf(rs.getString("status")));
        order.setCreatedAt(rs.getTimestamp("created_at").toInstant());
        return order;
      }
    );
  }
  
  public Order save(Order order) {
    if (order.getId() == null) {
      // INSERT
      String sql = """
        INSERT INTO orders (user_id, total, status, created_at)
        VALUES (?, ?, ?, ?)
      """;
      
      KeyHolder keyHolder = new GeneratedKeyHolder();
      
      jdbcTemplate.update(connection -> {
        PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
        ps.setLong(1, order.getUserId());
        ps.setBigDecimal(2, order.getTotal());
        ps.setString(3, order.getStatus().name());
        ps.setTimestamp(4, Timestamp.from(order.getCreatedAt()));
        return ps;
      }, keyHolder);
      
      order.setId(keyHolder.getKey().longValue());
    } else {
      // UPDATE
      String sql = """
        UPDATE orders
        SET total = ?, status = ?
        WHERE id = ?
      """;
      
      jdbcTemplate.update(
        sql,
        order.getTotal(),
        order.getStatus().name(),
        order.getId()
      );
    }
    
    return order;
  }
  
  public List<Order> findByUserId(Long userId) {
    String sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC";
    
    return jdbcTemplate.query(
      sql,
      new Object[]{userId},
      (rs, rowNum) -> mapRowToOrder(rs)
    );
  }
  
  private Order mapRowToOrder(ResultSet rs) throws SQLException {
    Order order = new Order();
    order.setId(rs.getLong("id"));
    order.setUserId(rs.getLong("user_id"));
    order.setTotal(rs.getBigDecimal("total"));
    order.setStatus(OrderStatus.valueOf(rs.getString("status")));
    order.setCreatedAt(rs.getTimestamp("created_at").toInstant());
    return order;
  }
}
```

**Key principles:**
- **Database abstraction**: Hide SQL from business layer
- **No business logic**: Just CRUD operations
- **Mapping**: Convert database rows to domain objects

### **Dependency Rules**

```
Presentation Layer
    ↓ (depends on)
Business Logic Layer
    ↓ (depends on)
Data Access Layer
    ↓ (depends on)
Database

Top-down dependencies only!

✅ Controller can call Service
✅ Service can call Repository
❌ Repository CANNOT call Service
❌ Service CANNOT call Controller

Why?
- Clear separation of concerns
- Prevents circular dependencies
- Easier to test (mock lower layers)
```

**Violations and consequences:**

```java
// ❌ BAD: Repository calling Service (upward dependency)
@Repository
public class OrderRepository {
  
  @Autowired
  private EmailService emailService;  // ← Upward dependency!
  
  public Order save(Order order) {
    order = saveToDatabase(order);
    emailService.sendOrderConfirmation(order);  // ← Wrong layer!
    return order;
  }
}

Why bad?
- Repository doing business logic (sending email)
- Can't reuse repository without sending email
- Hard to test (must mock EmailService in data layer tests)

✅ GOOD: Service coordinates
@Service
public class OrderService {
  
  @Autowired
  private OrderRepository orderRepository;
  
  @Autowired
  private EmailService emailService;
  
  @Transactional
  public Order createOrder(...) {
    Order order = orderRepository.save(order);
    emailService.sendOrderConfirmation(order);  // ← Correct layer!
    return order;
  }
}
```

### **Clean Architecture (Layered Architecture 2.0)**

**Problem with traditional layered architecture:**
- Business logic depends on database (tight coupling)
- Hard to change database (business logic coupled to JPA entities)
- Business logic not reusable (tied to framework)

**Clean Architecture solution: Dependency Inversion**

```
Traditional (top-down dependencies):
Controller → Service → Repository → Database
Business logic depends on database ❌

Clean Architecture (inverted):
Controller → Service (interface) ← Repository
              ↑                      ↓
         Domain (pure)          Database

Business logic doesn't depend on database ✅
Business logic defines interface
Repository implements interface
```

**Example:**

```java
// Domain layer (core business logic, no dependencies)
public class Order {
  private Long id;
  private Long userId;
  private List<OrderItem> items;
  private BigDecimal total;
  private OrderStatus status;
  
  // Business logic (pure domain methods)
  public void addItem(Product product, int quantity) {
    if (quantity <= 0) {
      throw new IllegalArgumentException("Quantity must be positive");
    }
    items.add(new OrderItem(product.getId(), quantity, product.getPrice()));
    recalculateTotal();
  }
  
  public void applyDiscount(BigDecimal discountPercent) {
    if (discountPercent.compareTo(BigDecimal.ZERO) < 0 || 
        discountPercent.compareTo(BigDecimal.valueOf(100)) > 0) {
      throw new IllegalArgumentException("Invalid discount");
    }
    total = total.multiply(BigDecimal.ONE.subtract(discountPercent.divide(BigDecimal.valueOf(100))));
  }
  
  private void recalculateTotal() {
    total = items.stream()
      .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
      .reduce(BigDecimal.ZERO, BigDecimal::add);
  }
}

// Service layer defines interface (doesn't depend on implementation)
public interface OrderRepository {
  Order save(Order order);
  Optional<Order> findById(Long id);
  List<Order> findByUserId(Long userId);
}

// Service uses interface (dependency inversion)
@Service
public class OrderService {
  
  private final OrderRepository orderRepository;  // Interface, not implementation
  
  public OrderService(OrderRepository orderRepository) {
    this.orderRepository = orderRepository;
  }
  
  @Transactional
  public Order createOrder(Long userId, List<OrderItem> items) {
    Order order = new Order();
    order.setUserId(userId);
    
    for (OrderItem item : items) {
      order.addItem(/* ... */);
    }
    
    order.applyDiscount(BigDecimal.valueOf(10));  // Business rule
    
    return orderRepository.save(order);
  }
}

// Infrastructure layer implements interface (adapter pattern)
@Repository
public class JpaOrderRepository implements OrderRepository {
  
  @Autowired
  private OrderJpaRepository jpaRepository;  // Spring Data JPA
  
  @Override
  public Order save(Order order) {
    OrderEntity entity = OrderEntity.fromDomain(order);
    entity = jpaRepository.save(entity);
    return entity.toDomain();
  }
  
  @Override
  public Optional<Order> findById(Long id) {
    return jpaRepository.findById(id)
      .map(OrderEntity::toDomain);
  }
}
```

**Benefits of Clean Architecture:**
- **Business logic independent**: No JPA annotations in domain objects
- **Testable**: Test business logic without database (mock interface)
- **Flexible**: Switch database (PostgreSQL → MongoDB) without changing business logic
- **Framework-independent**: Domain logic not tied to Spring, Django, etc.

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

### **Performance Characteristics**

**Latency by layer:**

```
User request → Presentation Layer:    10-50ms (parsing, validation)
              ↓
             Business Logic Layer:    20-100ms (business rules, coordination)
              ↓
             Data Access Layer:       10-50ms (SQL query)
              ↓
             Database:                5-20ms (index lookup)
              
Total: 45-220ms (typical web request)

Optimization:
- Caching at each layer
- Async processing (for non-critical operations)
- Database connection pooling
```

**Throughput:**

```
Single application instance:
- Tomcat (Spring Boot): 200-500 req/s (default 200 threads)
- Gunicorn (Django): 100-300 req/s (default 4 workers)

Bottleneck: Usually database (connection pool exhausted)

Connection pool sizing:
connections = ((core_count × 2) + effective_spindle_count)

Example: 4 CPU cores, 1 SSD
connections = (4 × 2) + 1 = 9 connections

HikariCP (Spring Boot default):
spring.datasource.hikari.maximum-pool-size=10
spring.datasource.hikari.minimum-idle=5

If 500 req/s, each request holds connection for 50ms:
concurrent_requests = 500 × 0.05 = 25 requests
Need 25 connections → Scale horizontally (multiple app instances + load balancer)

Horizontal scaling:
3 app instances × 500 req/s = 1500 req/s total
Each instance: 10 connections
Total database connections: 30 (manageable for PostgreSQL)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Domain Model (Entities)**

```java
// Order entity (mapped to database table)
@Entity
@Table(name = "orders")
public class Order {
  
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  
  @Column(name = "user_id", nullable = false)
  private Long userId;
  
  @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
  @JoinColumn(name = "order_id")
  private List<OrderItem> items = new ArrayList<>();
  
  @Column(name = "subtotal", precision = 10, scale = 2)
  private BigDecimal subtotal;
  
  @Column(name = "tax", precision = 10, scale = 2)
  private BigDecimal tax;
  
  @Column(name = "shipping", precision = 10, scale = 2)
  private BigDecimal shipping;
  
  @Column(name = "total", precision = 10, scale = 2)
  private BigDecimal total;
  
  @Enumerated(EnumType.STRING)
  @Column(name = "status", nullable = false)
  private OrderStatus status;
  
  @Column(name = "created_at", nullable = false)
  private Instant createdAt;
  
  @Column(name = "updated_at")
  private Instant updatedAt;
  
  // Getters, setters, equals, hashCode
}

@Entity
@Table(name = "order_items")
public class OrderItem {
  
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  
  @Column(name = "order_id")
  private Long orderId;
  
  @Column(name = "product_id", nullable = false)
  private Long productId;
  
  @Column(name = "quantity", nullable = false)
  private Integer quantity;
  
  @Column(name = "price", precision = 10, scale = 2, nullable = false)
  private BigDecimal price;
  
  // Getters, setters
}

// Database schema
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  shipping DECIMAL(10, 2),
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

CREATE TABLE order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order_id (order_id)
);
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Horizontal Scaling**

```
Load Balancer (NGINX)
         │
    ┌────┴────┬─────────┬─────────┐
    │         │         │         │
    ▼         ▼         ▼         ▼
 App Inst1 App Inst2 App Inst3 App Inst4
    │         │         │         │
    └─────────┴────┬────┴─────────┘
                   │
                   ▼
            Database (PostgreSQL)

Scaling presentation + business layers:
✅ Stateless (no session data in memory)
✅ Shared database (all instances connect to same DB)
✅ Load balancer distributes requests

Configuration:
- Sticky sessions OFF (requests can go to any instance)
- Session store: Redis (if needed)
- Health checks: GET /health (200 OK = healthy)

Database scaling:
- Read replicas (scale reads)
- Connection pooling (limit connections per instance)
- Caching (Redis for frequent queries)
```

### **Caching Strategy**

```java
@Service
public class OrderService {
  
  @Autowired
  private OrderRepository orderRepository;
  
  @Autowired
  private RedisTemplate<String, Order> redisTemplate;
  
  private static final String CACHE_KEY_PREFIX = "order:";
  private static final Duration CACHE_TTL = Duration.ofMinutes(15);
  
  public Order getOrder(Long id) {
    // Check cache first
    String cacheKey = CACHE_KEY_PREFIX + id;
    Order cached = redisTemplate.opsForValue().get(cacheKey);
    
    if (cached != null) {
      return cached;  // Cache hit
    }
    
    // Cache miss: Query database
    Order order = orderRepository.findById(id).orElse(null);
    
    if (order != null) {
      // Store in cache
      redisTemplate.opsForValue().set(cacheKey, order, CACHE_TTL);
    }
    
    return order;
  }
  
  @Transactional
  public Order updateOrderStatus(Long id, OrderStatus newStatus) {
    Order order = orderRepository.findById(id).orElseThrow();
    order.setStatus(newStatus);
    order = orderRepository.save(order);
    
    // Invalidate cache
    String cacheKey = CACHE_KEY_PREFIX + id;
    redisTemplate.delete(cacheKey);
    
    return order;
  }
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

### **Security at Each Layer**

```java
// Presentation Layer: Authentication & Authorization
@RestController
@RequestMapping("/api/orders")
public class OrderController {
  
  @Autowired
  private OrderService orderService;
  
  @GetMapping("/{id}")
  @PreAuthorize("hasRole('USER')")
  public ResponseEntity<OrderDTO> getOrder(
    @PathVariable Long id,
    @AuthenticationPrincipal User user
  ) {
    Order order = orderService.getOrder(id);
    
    // Authorization: User can only view their own orders
    if (!order.getUserId().equals(user.getId()) && !user.hasRole("ADMIN")) {
      throw new ForbiddenException("Access denied");
    }
    
    return ResponseEntity.ok(OrderDTO.from(order));
  }
}

// Business Layer: Business rule validation
@Service
public class OrderService {
  
  public Order createOrder(Long userId, List<OrderItem> items) {
    // Validate business rules
    if (items.size() > 100) {
      throw new BusinessException("Maximum 100 items per order");
    }
    
    BigDecimal total = calculateTotal(items);
    
    if (total.compareTo(BigDecimal.valueOf(10000)) > 0) {
      throw new BusinessException("Order total exceeds limit");
    }
    
    // ...
  }
}

// Data Layer: SQL injection prevention
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
  
  // ✅ GOOD: Parameterized query
  @Query("SELECT o FROM Order o WHERE o.userId = :userId")
  List<Order> findByUserId(@Param("userId") Long userId);
  
  // ❌ BAD: String concatenation (SQL injection risk)
  // @Query("SELECT o FROM Order o WHERE o.userId = " + userId)  // NEVER DO THIS!
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Example 1: Spring Boot (Java Enterprise)**

**Architecture:**
```
Spring Boot E-commerce Application

Presentation Layer:
- @RestController (REST API endpoints)
- @Valid (request validation)
- @ExceptionHandler (error handling)

Business Layer:
- @Service (business logic)
- @Transactional (transaction management)
- Business rules (discounts, inventory checks)

Data Layer:
- @Repository (Spring Data JPA)
- JPA entities (@Entity)
- Database queries (JPQL, native SQL)

Database:
- PostgreSQL (relational data)
- Indexes on user_id, status, created_at

Benefits:
✅ Clear separation of concerns
✅ Testable (mock @Service in controller tests, mock @Repository in service tests)
✅ Framework support (@Transactional automatic rollback, @Cacheable built-in caching)

Used by:
- LinkedIn (Java Spring Boot microservices)
- Netflix (Java + Spring Cloud)
- Airbnb (parts of backend)
```

### **Example 2: Django (Python Web Framework)**

**Architecture:**
```
Django E-commerce Application

Presentation Layer:
- Views (request handlers)
- Forms (input validation)
- Templates (HTML rendering)
- REST framework (DRF for APIs)

Business Layer:
- Services (business logic in separate service modules)
- Managers (custom query logic)
- Signals (event handling)

Data Layer:
- Models (ORM entities)
- QuerySets (database queries)
- Migrations (schema changes)

Database:
- PostgreSQL (production)
- SQLite (development)

Example:

# models.py (Data Layer)
from django.db import models

class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['status']),
        ]

# services.py (Business Layer)
from django.db import transaction

class OrderService:
    @transaction.atomic
    def create_order(self, user_id, items):
        # Business rule: Validate items
        if not items:
            raise ValueError("Order must have items")
        
        # Business rule: Check inventory
        for item in items:
            if not InventoryService.check_availability(item['product_id'], item['quantity']):
                raise ValueError(f"Product {item['product_id']} out of stock")
        
        # Calculate total
        total = sum(item['price'] * item['quantity'] for item in items)
        
        # Apply discount
        if total > 100:
            total *= 0.9
        
        # Create order
        order = Order.objects.create(
            user_id=user_id,
            total=total,
            status='PENDING'
        )
        
        return order

# views.py (Presentation Layer)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

class OrderAPIView(APIView):
    def post(self, request):
        # Input validation
        items = request.data.get('items')
        if not items:
            return Response({'error': 'Items required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Delegate to business layer
        try:
            order = OrderService().create_order(request.user.id, items)
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

Used by:
- Instagram (Django backend, scaled to billions of users)
- Pinterest (Django + Python)
- Disqus (Django comment system)
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

**Q: Explain Layered Architecture and its benefits.**

**Answer:**
"Layered Architecture organizes code into horizontal layers, each with a single responsibility. The most common is 3-Tier: Presentation (controllers, UI), Business Logic (services, domain rules), and Data Access (repositories, database).

**Layer responsibilities:**

**1. Presentation Layer (Controllers):**
- Handle HTTP requests/responses
- Input validation (format, required fields)
- Authentication/authorization
- Route to business logic
- No business rules (thin layer)

Example (Java Spring Boot):
```java
@RestController
@PostMapping("/api/orders")
public ResponseEntity<OrderDTO> createOrder(@RequestBody CreateOrderRequest request, @AuthenticationPrincipal User user) {
  // Validate input (@Valid annotation)
  // Delegate to business layer
  Order order = orderService.createOrder(user.getId(), request.getItems());
  return ResponseEntity.created(OrderDTO.from(order));
}
```

**2. Business Logic Layer (Services):**
- Implement business rules (discounts, limits, calculations)
- Coordinate multiple repositories
- Transaction management (@Transactional)
- No direct database access (uses repositories)

Example:
```java
@Service
@Transactional
public Order createOrder(Long userId, List<OrderItem> items) {
  // Business rule: Check inventory
  for (OrderItem item : items) {
    if (!inventoryService.checkStock(item.getProductId(), item.getQuantity())) {
      throw new BusinessException("Out of stock");
    }
  }
  
  // Business rule: Calculate total with discount
  BigDecimal total = calculateTotal(items);
  if (total.compareTo(BigDecimal.valueOf(100)) > 0) {
    total = total.multiply(BigDecimal.valueOf(0.9)); // 10% off
  }
  
  // Save order
  Order order = new Order(userId, items, total);
  return orderRepository.save(order);
}
```

**3. Data Access Layer (Repositories):**
- Abstract database operations (CRUD)
- Encapsulate SQL queries
- No business logic (just data retrieval/persistence)

Example:
```java
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
  List<Order> findByUserId(Long userId);
  List<Order> findByStatus(OrderStatus status);
}
```

**Dependency flow:**
```
User → Controller → Service → Repository → Database
```

**Top-down dependencies only:**
- ✅ Controller calls Service
- ✅ Service calls Repository
- ❌ Repository CANNOT call Service (upward dependency forbidden)

**Benefits:**

**1. Separation of concerns:**
- UI changes don't affect business logic
- Database changes isolated to repositories
- Each layer has single responsibility

Example: Switch PostgreSQL → MongoDB:
- Only change Data Layer (implement new repository)
- Business Logic Layer unchanged (uses repository interface)

**2. Testability:**
- Unit test business logic without database (mock repositories)
- Unit test controllers without business logic (mock services)

```java
@Test
public void testCreateOrder() {
  // Mock repository
  OrderRepository mockRepo = mock(OrderRepository.class);
  when(mockRepo.save(any())).thenReturn(new Order());
  
  // Test service in isolation
  OrderService service = new OrderService(mockRepo);
  Order order = service.createOrder(1L, items);
  
  verify(mockRepo).save(any());
}
```

**3. Reusability:**
- Same business logic for web + mobile + desktop
- Controllers differ (REST API vs GraphQL vs gRPC)
- Business Logic Layer shared across all UIs

**4. Team organization:**
- Frontend team owns Presentation Layer
- Backend team owns Business Logic Layer
- DBA team owns Data Layer optimization

**Trade-offs:**

**1. Rigidity:**
- Strict layers add indirection (3 classes for simple CRUD)
- Over-engineering for simple applications

Example: Simple blog
- Overkill: Controller → Service → Repository (3 layers)
- Sufficient: Controller → Repository (2 layers, skip service if no business logic)

**2. Cross-cutting concerns:**
- Logging, security, caching span multiple layers
- Solution: Aspect-Oriented Programming (AOP), middleware

```java
@Aspect
@Component
public class LoggingAspect {
  @Before("execution(* com.example.service.*.*(..))")
  public void logBefore(JoinPoint joinPoint) {
    log.info("Calling: " + joinPoint.getSignature().getName());
  }
}
```

**3. Performance:**
- Extra layers add method calls (negligible ~1-2ms)
- Caching needed for frequently accessed data

**When to use:**

**1. Enterprise applications:**
- Multiple teams (clear boundaries)
- Complex business rules (centralized in Service Layer)
- Long-term maintainability (clear structure)

**2. Frameworks encourage it:**
- Spring Boot: @Controller, @Service, @Repository annotations
- Django: views, services, models
- .NET: Controllers, Services, Repositories

**When to avoid:**

**1. Simple CRUD apps:**
- No business logic (just read/write database)
- Overhead not justified (use 2-tier: Controller → Repository)

**2. Microservices:**
- Each service small (50-500 lines)
- Simplified structure (no need for strict layers)

**Clean Architecture improvement:**
- **Problem:** Business logic depends on database (tight coupling to JPA entities)
- **Solution:** Dependency inversion (business logic defines interface, data layer implements)

```
Traditional: Service → Repository (Service depends on Repository)
Clean: Service → IRepository ← RepositoryImpl (Service depends on interface, not implementation)
```

**Benefits of Clean Architecture:**
- Business logic framework-independent (no Spring/JPA annotations in domain)
- Switch databases without changing business logic
- Pure domain objects (no @Entity, @Column annotations)

**Real-world usage:**
- **Spring Boot**: 3-Tier most common (LinkedIn, Netflix microservices)
- **Django**: Models-Views-Templates + Services (Instagram, Pinterest)
- **Clean Architecture**: Domain-driven design projects (Uncle Bob's books)

**Key insight:** Layered Architecture is default for enterprise apps (Spring Boot, Django, .NET). Start with 3-Tier, add Clean Architecture if domain logic complex and framework-independent important. For simple CRUD, skip Service Layer (Controller → Repository directly)."

### **Common Follow-Up Questions**

**Q1: How do you handle cross-cutting concerns like logging and security in layered architecture?**

```
Answer:

Cross-cutting concerns span multiple layers (logging needed in all layers, authentication in controller + service).

Problem:
- Don't want to duplicate code in every method
- Don't want to pollute business logic with logging/security

Solutions:

1. Aspect-Oriented Programming (AOP):
   - Intercept method calls
   - Execute cross-cutting logic (logging, security) before/after method

   Spring Boot example:
   
   @Aspect
   @Component
   public class LoggingAspect {
     
     @Before("execution(* com.example.service.*.*(..))")
     public void logMethodCall(JoinPoint joinPoint) {
       String methodName = joinPoint.getSignature().getName();
       Object[] args = joinPoint.getArgs();
       log.info("Calling {}: {}", methodName, Arrays.toString(args));
     }
     
     @AfterReturning(pointcut = "execution(* com.example.service.*.*(..))", returning = "result")
     public void logMethodReturn(JoinPoint joinPoint, Object result) {
       log.info("Returned from {}: {}", joinPoint.getSignature().getName(), result);
     }
     
     @AfterThrowing(pointcut = "execution(* com.example.service.*.*(..))", throwing = "error")
     public void logMethodException(JoinPoint joinPoint, Throwable error) {
       log.error("Exception in {}: {}", joinPoint.getSignature().getName(), error.getMessage());
     }
   }
   
   Result:
   - Logging automatically applied to all methods in service package
   - No logging code in business logic (separation of concerns)

2. Middleware (for web requests):
   - Filter/interceptor executes before request reaches controller
   
   Spring Boot filter:
   
   @Component
   public class LoggingFilter implements Filter {
     
     @Override
     public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
       HttpServletRequest httpRequest = (HttpServletRequest) request;
       
       long startTime = System.currentTimeMillis();
       log.info("Request: {} {}", httpRequest.getMethod(), httpRequest.getRequestURI());
       
       chain.doFilter(request, response);  // Proceed to controller
       
       long duration = System.currentTimeMillis() - startTime;
       log.info("Completed in {}ms", duration);
     }
   }
   
   Result:
   - All HTTP requests logged automatically
   - Controllers don't have logging code

3. Annotations + Interceptors:
   - Custom annotation marks methods needing special handling
   
   @Retention(RetentionPolicy.RUNTIME)
   @Target(ElementType.METHOD)
   public @interface Audited {
     String action();
   }
   
   @Service
   public class OrderService {
     
     @Audited(action = "CREATE_ORDER")
     public Order createOrder(...) {
       // Business logic
     }
   }
   
   Interceptor:
   
   @Aspect
   @Component
   public class AuditAspect {
     
     @Autowired
     private AuditService auditService;
     
     @AfterReturning(pointcut = "@annotation(audited)", returning = "result")
     public void auditMethod(JoinPoint joinPoint, Audited audited, Object result) {
       String user = SecurityContextHolder.getContext().getAuthentication().getName();
       auditService.log(user, audited.action(), result);
     }
   }
   
   Result:
   - Audit trail for important operations
   - Audit logic separate from business logic

Best practices:
✅ Use AOP for method-level cross-cutting concerns (logging, auditing, caching)
✅ Use middleware/filters for request-level concerns (authentication, request logging)
✅ Annotations mark methods needing special handling
✅ Keep business logic clean (no logging, security, caching code)

Real-world:
- Spring Boot: @Transactional uses AOP (transaction management)
- Spring Security: Filters handle authentication/authorization
- Hibernate: AOP for lazy loading, dirty checking
```

**Q2: When would you skip the service layer and go directly from controller to repository?**

```
Answer:

Skip Service Layer when:

1. Simple CRUD (no business logic):
   - Just reading/writing database
   - No validation beyond data types
   - No coordination between multiple repositories
   
   Example: Simple blog viewing
   
   ✅ Simplified (Controller → Repository):
   
   @RestController
   @RequestMapping("/api/posts")
   public class PostController {
     
     @Autowired
     private PostRepository postRepository;
     
     @GetMapping("/{id}")
     public ResponseEntity<Post> getPost(@PathVariable Long id) {
       return postRepository.findById(id)
         .map(ResponseEntity::ok)
         .orElse(ResponseEntity.notFound().build());
     }
     
     @GetMapping
     public List<Post> getAllPosts() {
       return postRepository.findAll();
     }
   }
   
   Why skip Service Layer?
   - No business logic (just database read)
   - Service would be pass-through (adds no value)
   
   ❌ Unnecessary Service Layer:
   
   @Service
   public class PostService {
     @Autowired
     private PostRepository postRepository;
     
     public Post getPost(Long id) {
       return postRepository.findById(id).orElse(null);  // Just delegates!
     }
   }

2. Prototyping/MVP:
   - Speed matters more than structure
   - Can refactor later if business logic emerges

3. Microservices (small scope):
   - Service already focused (single responsibility)
   - Total code < 500 lines
   - No need for strict layers

DON'T skip Service Layer when:

1. Business rules exist:
   - Validation (order total < $10,000)
   - Calculations (apply discounts, tax)
   - Coordination (check inventory, charge payment, send email)

2. Multiple repositories:
   - Create order: OrderRepository + InventoryRepository
   - Transaction spans multiple tables
   - Service coordinates

3. Long-term project:
   - Business logic will grow
   - Start with Service Layer (easier to add logic later)

4. Team size > 5:
   - Clear boundaries help coordination
   - Service Layer is contract between frontend/backend

Rule of thumb:
- If Controller method > 20 lines → Extract to Service Layer
- If no business logic now but likely later → Use Service Layer (future-proof)
- If simple CRUD forever → Skip Service Layer

Real-world:
- GitHub code viewer: Simple CRUD, no Service Layer
- E-commerce checkout: Complex business rules, needs Service Layer
- Admin panels: Often skip Service Layer (just CRUD)
```

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### **3-Tier Architecture Flow**

```
User makes request: POST /api/orders
   │
   ▼
┌─────────────────────────────────────┐
│   Presentation Layer (Controller)   │
│  - Parse request body               │
│  - Validate format (@Valid)         │
│  - Check authentication (JWT)       │
│  - Route to service method          │
└──────────┬──────────────────────────┘
           │ orderService.createOrder(userId, items)
           ▼
┌─────────────────────────────────────┐
│   Business Logic Layer (Service)    │
│  - Validate business rules          │
│  - Check inventory available        │
│  - Calculate total with discount    │
│  - Coordinate repositories          │
│  - Manage transaction               │
└──────────┬──────────────────────────┘
           │ orderRepository.save(order)
           ▼
┌─────────────────────────────────────┐
│   Data Access Layer (Repository)    │
│  - Build SQL INSERT statement       │
│  - Execute query                    │
│  - Map result to domain object      │
└──────────┬──────────────────────────┘
           │ INSERT INTO orders...
           ▼
┌─────────────────────────────────────┐
│   Database (PostgreSQL)             │
│  - Store order record               │
│  - Return generated ID              │
└─────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

### **Why Layered Architecture Matters**

**Business Impact:**
- **Maintainability**: Change UI without touching business logic (frontend redesign doesn't affect backend)
- **Team productivity**: Clear boundaries (frontend/backend/database teams work independently)
- **Reusability**: Same business logic for web + mobile + desktop
- **Time to market**: Parallel development (UI and business logic developed simultaneously)

**Technical Impact:**
- **Separation of concerns**: Each layer has single responsibility (easy to understand, modify)
- **Testability**: Unit test each layer in isolation (mock dependencies)
- **Flexibility**: Swap databases (PostgreSQL → MongoDB) without changing business logic
- **Framework support**: Spring Boot, Django, .NET encourage layered structure

### **How It Works (Simple Summary)**

1. **Presentation Layer** receives HTTP request, validates input, routes to Service
2. **Business Logic Layer** implements domain rules, coordinates repositories, manages transactions
3. **Data Access Layer** abstracts database operations, executes SQL, maps results to objects
4. **Top-down dependencies**: Each layer depends on layer below, never upward

**For production systems:**
- Use **3-Tier** (Presentation, Business, Data) for enterprise apps
- **Thin controllers** (no business logic, just routing)
- **Fat services** (all business rules centralized)
- **Repositories abstract database** (no SQL in service layer)
- **Dependency injection** (Spring @Autowired, Django DI)
- **Transaction management** (@Transactional for atomicity)

### **Key Trade-offs**

| Aspect | Layered Architecture | Flat Structure |
|--------|----------------------|----------------|
| **Maintainability** | High (clear boundaries) ✅ | Low (everything mixed) ❌ |
| **Testability** | High (mock layers) ✅ | Low (hard to isolate) ❌ |
| **Simplicity** | Medium (3 classes per feature) ⚠️ | High (1 class per feature) ✅ |
| **Performance** | Slight overhead (method calls) ⚠️ | Fastest (direct calls) ✅ |
| **Scalability** | Easy (scale layers independently) ✅ | Hard (monolithic) ❌ |

### **Remember These Numbers**

```
Request latency by layer:
- Presentation: 10-50ms (parsing, validation)
- Business Logic: 20-100ms (rules, coordination)
- Data Access: 10-50ms (SQL query)
- Database: 5-20ms (index lookup)
Total: 45-220ms (typical)

Connection pool sizing:
connections = (core_count × 2) + disk_count
Example: 4 CPUs, 1 SSD → 9 connections

Throughput:
- Single Spring Boot instance: 200-500 req/s
- Horizontal scaling: 3 instances × 500 req/s = 1500 req/s

When to skip Service Layer:
- Controller logic < 20 lines (simple CRUD)
- No business rules now or future
- Prototyping/MVP (speed matters)

When to use Service Layer:
- Business rules exist (validation, calculations)
- Multiple repositories coordinated
- Team size > 5 (clear boundaries)
```

### **Production Wisdom**

✅ **Use 3-Tier for enterprise apps** (Spring Boot, Django, .NET default)  
✅ **Thin controllers** (no business logic, just routing and validation)  
✅ **Fat services** (all business rules centralized, testable)  
✅ **Repository abstracts database** (no SQL in service layer)  
✅ **Dependency injection** (@Autowired, constructor injection)  
✅ **Transaction management** (@Transactional for atomicity)  
✅ **AOP for cross-cutting concerns** (logging, auditing, caching)  
✅ **Clean Architecture for complex domains** (dependency inversion)  
✅ **Skip Service Layer for simple CRUD** (no business logic)  
✅ **Caching at each layer** (Redis for frequently accessed data)  

❌ **Don't put business logic in controllers** (breaks separation of concerns)  
❌ **Don't let repositories call services** (upward dependency forbidden)  
❌ **Don't skip Service Layer if business logic exists** (centralize rules)  
❌ **Don't duplicate code across layers** (use AOP for cross-cutting concerns)  
❌ **Don't use for simple apps** (overkill for basic CRUD)  
❌ **Don't tightly couple to framework** (use Clean Architecture if needed)  

---

**Final thought for interviews:**

> "Layered Architecture (3-Tier: Presentation, Business, Data) is the default structure for enterprise applications. It provides separation of concerns (UI changes don't affect business logic), testability (mock repositories for unit tests), and reusability (same business logic for web + mobile). Used by Spring Boot (@Controller/@Service/@Repository), Django (views/services/models), and .NET. The key is top-down dependencies: Controller → Service → Repository, never upward. Trade-off: adds indirection (3 classes for simple CRUD) but essential for complex business rules. Skip Service Layer for simple CRUD (just Controller → Repository), but use it if business logic exists (validation, calculations, coordination). Clean Architecture improves on this by inverting dependencies (business logic doesn't depend on database, uses interfaces), making business logic framework-independent. In production: thin controllers (no business logic), fat services (centralize rules), repositories abstract database (no SQL in services), AOP for cross-cutting concerns (logging, security), caching at each layer (Redis), and horizontal scaling (stateless services)."
