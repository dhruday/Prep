# 177. Dependency Injection (Constructor vs Field vs Setter)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Dependency Injection (DI)**: A design pattern where an object receives its dependencies from external sources rather than creating them itself.

### Core Concept

**What it means:**
- **Don't create dependencies**: Don't use `new` to create dependencies
- **Receive dependencies**: Dependencies are "injected" from outside
- **Three injection types**: Constructor, Field (Property), Setter (Method)
- **Goal**: Loose coupling, testability, flexibility

**Simple analogy:**
- **No DI**: You walk to grocery store, buy ingredients, cook meal yourself
- **With DI**: Someone delivers ingredients to your kitchen (injection), you just cook
- The "someone" is the DI container (Spring, Guice, etc.)

**In code:**
```java
// BAD: No dependency injection ❌
class OrderService {
    private OrderRepository repository;
    
    public OrderService() {
        this.repository = new MySQLOrderRepository(); // Creates dependency!
    }
}

// GOOD: Constructor injection ✓
class OrderService {
    private final OrderRepository repository;
    
    @Autowired
    public OrderService(OrderRepository repository) { // Injected!
        this.repository = repository;
    }
}

// GOOD: Field injection ✓
class OrderService {
    @Autowired
    private OrderRepository repository; // Injected via reflection!
}

// GOOD: Setter injection ✓
class OrderService {
    private OrderRepository repository;
    
    @Autowired
    public void setRepository(OrderRepository repository) { // Injected!
        this.repository = repository;
    }
}
```

### Three Types of Dependency Injection

**1. Constructor Injection (BEST PRACTICE)**
- Dependencies injected via constructor
- Dependencies are `final` (immutable)
- All dependencies required at construction time
- **Pros**: Immutability, testability, explicit dependencies
- **Cons**: Many dependencies = large constructor

**2. Field Injection (CONVENIENT BUT PROBLEMATIC)**
- Dependencies injected directly into fields via reflection
- Uses `@Autowired` on field
- **Pros**: Concise, less boilerplate
- **Cons**: Cannot be final, hard to test, hides dependencies

**3. Setter Injection (FOR OPTIONAL DEPENDENCIES)**
- Dependencies injected via setter methods
- **Pros**: Optional dependencies, can change at runtime
- **Cons**: Mutable, can forget to call setter, not obvious what's required

### Why Dependency Injection Matters

**Code Quality Benefits:**
- **Testability**: Inject mocks in tests
- **Loose Coupling**: Class doesn't know about concrete implementations
- **Flexibility**: Swap implementations easily
- **Maintainability**: Dependencies explicit and clear
- **Single Responsibility**: Class doesn't create its own dependencies

**Role in interviews:**
- FAANG asks: "Why is constructor injection better than field injection?"
- Design questions: "How would you inject dependencies in this service?"
- Expects understanding of DI principles and Spring Framework

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🟢 Constructor Injection (RECOMMENDED)

#### Complete Example

```java
// BEST PRACTICE: Constructor injection ✓

@Service
public class OrderService {
    
    // Dependencies are FINAL (immutable)
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final MetricsCollector metricsCollector;
    
    // Single constructor with all dependencies
    @Autowired // Optional in Spring 4.3+ if only one constructor
    public OrderService(
        OrderRepository orderRepository,
        PaymentGateway paymentGateway,
        EmailService emailService,
        NotificationService notificationService,
        MetricsCollector metricsCollector
    ) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.metricsCollector = metricsCollector;
    }
    
    public void createOrder(OrderRequest request) {
        // All dependencies guaranteed to be available
        // because they were required in constructor
        
        metricsCollector.incrementCounter("orders.created");
        
        PaymentResult result = paymentGateway.processPayment(
            request.getCustomerId(),
            request.getTotal()
        );
        
        if (!result.isSuccessful()) {
            throw new PaymentFailedException("Payment failed");
        }
        
        Order order = Order.builder()
            .customerId(request.getCustomerId())
            .total(request.getTotal())
            .paymentId(result.getTransactionId())
            .build();
        
        orderRepository.save(order);
        emailService.sendOrderConfirmation(order);
        notificationService.notifyOrderCreated(order);
    }
}

// ═══════════════════════════════════════════════════════════
// Benefits of constructor injection
// ═══════════════════════════════════════════════════════════

// 1. IMMUTABILITY
//    All dependencies are final - cannot be changed after construction
//    Thread-safe by design
//    No risk of partially initialized object

// 2. REQUIRED DEPENDENCIES EXPLICIT
//    Constructor signature shows ALL required dependencies
//    Impossible to create OrderService without providing dependencies
//    Fails fast at construction time if dependency missing

// 3. EASY TO TEST
@Test
public void testCreateOrder() {
    // Arrange - create mocks
    OrderRepository mockRepo = mock(OrderRepository.class);
    PaymentGateway mockGateway = mock(PaymentGateway.class);
    EmailService mockEmail = mock(EmailService.class);
    NotificationService mockNotification = mock(NotificationService.class);
    MetricsCollector mockMetrics = mock(MetricsCollector.class);
    
    // Create service with mocks via constructor
    OrderService service = new OrderService(
        mockRepo,
        mockGateway,
        mockEmail,
        mockNotification,
        mockMetrics
    );
    
    // Configure mock behavior
    when(mockGateway.processPayment(anyString(), any(BigDecimal.class)))
        .thenReturn(PaymentResult.success("txn-123"));
    
    // Act
    OrderRequest request = new OrderRequest("cust-1", new BigDecimal("100"));
    service.createOrder(request);
    
    // Assert
    verify(mockRepo).save(any(Order.class));
    verify(mockEmail).sendOrderConfirmation(any(Order.class));
}

// 4. NO REFLECTION REQUIRED
//    Spring calls constructor directly
//    No magic, easy to understand
//    Works without Spring (plain Java)

// 5. COMPILE-TIME SAFETY
//    If dependency type changes, constructor signature changes
//    Compiler catches all usages
//    Refactoring safe

// 6. SELF-DOCUMENTING
//    Constructor shows exactly what's needed
//    No need to search for @Autowired annotations
//    Clear contract

// 7. PREVENTS CIRCULAR DEPENDENCIES
//    Circular dependencies cause StackOverflowError at construction
//    Fails immediately, easy to debug
//    Forces better design

// ═══════════════════════════════════════════════════════════
// Handling many dependencies (code smell)
// ═══════════════════════════════════════════════════════════

// If constructor has 7+ parameters, it's a code smell
// Indicates class has too many responsibilities (violates SRP)

// Solution 1: Group related dependencies into facade
@Service
public class NotificationFacade {
    private final EmailService emailService;
    private final SmsService smsService;
    private final PushService pushService;
    
    public NotificationFacade(
        EmailService emailService,
        SmsService smsService,
        PushService pushService
    ) {
        this.emailService = emailService;
        this.smsService = smsService;
        this.pushService = pushService;
    }
    
    public void sendOrderNotification(Order order) {
        emailService.sendOrderConfirmation(order);
        smsService.sendOrderSms(order);
        pushService.sendOrderPush(order);
    }
}

@Service
public class OrderService {
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    private final NotificationFacade notificationFacade; // Single dependency!
    
    public OrderService(
        OrderRepository orderRepository,
        PaymentGateway paymentGateway,
        NotificationFacade notificationFacade
    ) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
        this.notificationFacade = notificationFacade;
    }
}

// Solution 2: Split class into multiple classes (SRP)
@Service
public class OrderCreationService {
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    
    // Focused class with fewer dependencies
}

@Service
public class OrderNotificationService {
    private final EmailService emailService;
    private final SmsService smsService;
    
    // Separate class for notifications
}
```

---

### 🟡 Field Injection (AVOID IN PRODUCTION)

#### Example and Problems

```java
// PROBLEMATIC: Field injection ⚠️

@Service
public class OrderService {
    
    // Dependencies injected directly into fields via reflection
    @Autowired
    private OrderRepository orderRepository;
    
    @Autowired
    private PaymentGateway paymentGateway;
    
    @Autowired
    private EmailService emailService;
    
    // Constructor not needed
    // Spring uses reflection to inject dependencies
    
    public void createOrder(OrderRequest request) {
        // Dependencies are available, but...
        // how do you know? Magic!
        
        PaymentResult result = paymentGateway.processPayment(
            request.getCustomerId(),
            request.getTotal()
        );
        
        // ... rest of logic
    }
}

// ═══════════════════════════════════════════════════════════
// Problems with field injection
// ═══════════════════════════════════════════════════════════

// 1. CANNOT BE FINAL (MUTABLE)
//    Dependencies can be changed after construction
//    Thread-safety concerns
//    Risk of NPE if accessed before Spring initializes

// 2. HARD TO TEST
@Test
public void testCreateOrder() {
    // How to inject mocks?
    OrderService service = new OrderService();
    
    // Dependencies are private with no constructor or setter
    // Must use reflection to inject mocks (ugly!)
    Field repoField = OrderService.class.getDeclaredField("orderRepository");
    repoField.setAccessible(true);
    repoField.set(service, mockRepository);
    
    // Repeat for each dependency... painful!
    
    // OR: Use Spring test context (slow!)
    // OR: Change fields to package-private for testing (breaks encapsulation)
}

// 3. HIDES DEPENDENCIES
//    Dependencies not visible in constructor
//    Must scan entire class to find all @Autowired fields
//    Easy to add too many dependencies (no constructor size warning)
//    Violates "explicit is better than implicit" principle

// 4. TIGHT COUPLING TO SPRING
//    Class cannot be instantiated without Spring
//    Cannot use as plain Java object (POJO)
//    Makes unit testing harder

// 5. NULLPOINTEREXCEPTION RISK
public class OrderService {
    @Autowired
    private OrderRepository orderRepository;
    
    // If someone creates OrderService directly (not via Spring)
    public OrderService() {
        // orderRepository is null here!
        // NPE waiting to happen
    }
    
    public void createOrder(OrderRequest request) {
        orderRepository.save(order); // NPE if not initialized by Spring!
    }
}

// 6. CIRCULAR DEPENDENCY ISSUES
//    Circular dependencies may "work" with field injection
//    Only fail at runtime when method is called
//    Hard to debug

// 7. CANNOT VALIDATE DEPENDENCIES
//    Constructor injection can validate dependencies
//    Field injection happens after construction
public OrderService(OrderRepository orderRepository) {
    if (orderRepository == null) {
        throw new IllegalArgumentException("Repository required");
    }
    this.orderRepository = orderRepository;
}
// Cannot do this with field injection!

// ═══════════════════════════════════════════════════════════
// When field injection is acceptable
// ═══════════════════════════════════════════════════════════

// 1. Spring configuration classes (internal framework use)
@Configuration
public class AppConfig {
    @Autowired
    private Environment environment; // OK for configuration
}

// 2. Controllers with many dependencies (debatable)
@RestController
public class OrderController {
    @Autowired
    private OrderService orderService; // Some teams allow in controllers
    
    @Autowired
    private OrderValidator orderValidator;
    
    // But constructor injection still preferred!
}

// 3. Prototyping/exploratory code
//    Field injection is faster to write
//    OK for throwaway code, refactor before production

// 4. Integration tests with Spring context
@SpringBootTest
public class OrderServiceIntegrationTest {
    @Autowired
    private OrderService orderService; // OK in integration tests
}
```

---

### 🔵 Setter Injection (FOR OPTIONAL DEPENDENCIES)

#### Example and Use Cases

```java
// GOOD FOR OPTIONAL DEPENDENCIES: Setter injection ✓

@Service
public class OrderService {
    
    // Required dependencies via constructor
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    
    // Optional dependencies with defaults
    private EmailService emailService = new NoOpEmailService(); // Default
    private MetricsCollector metricsCollector = new NoOpMetricsCollector(); // Default
    
    // Constructor for required dependencies
    public OrderService(
        OrderRepository orderRepository,
        PaymentGateway paymentGateway
    ) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
    }
    
    // Setter for optional email service
    @Autowired(required = false) // Optional injection!
    public void setEmailService(EmailService emailService) {
        if (emailService != null) {
            this.emailService = emailService;
        }
    }
    
    // Setter for optional metrics
    @Autowired(required = false)
    public void setMetricsCollector(MetricsCollector metricsCollector) {
        if (metricsCollector != null) {
            this.metricsCollector = metricsCollector;
        }
    }
    
    public void createOrder(OrderRequest request) {
        // Required dependencies always available
        PaymentResult result = paymentGateway.processPayment(
            request.getCustomerId(),
            request.getTotal()
        );
        
        Order order = Order.builder()
            .customerId(request.getCustomerId())
            .total(request.getTotal())
            .build();
        
        orderRepository.save(order);
        
        // Optional dependencies with safe defaults
        emailService.sendOrderConfirmation(order); // NoOp if not set
        metricsCollector.incrementCounter("orders.created"); // NoOp if not set
    }
}

// ═══════════════════════════════════════════════════════════
// Use cases for setter injection
// ═══════════════════════════════════════════════════════════

// 1. OPTIONAL DEPENDENCIES WITH DEFAULTS
@Service
public class CacheableOrderService {
    private final OrderRepository orderRepository;
    private CacheService cacheService = new NoOpCacheService(); // Default no-op
    
    public CacheableOrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
    
    @Autowired(required = false)
    public void setCacheService(CacheService cacheService) {
        this.cacheService = cacheService;
    }
    
    public Order getOrder(String orderId) {
        // Try cache first (no-op if not configured)
        Optional<Order> cached = cacheService.get(orderId);
        if (cached.isPresent()) {
            return cached.get();
        }
        
        // Fetch from repository
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
        
        // Cache for next time (no-op if not configured)
        cacheService.put(orderId, order);
        
        return order;
    }
}

// 2. RECONFIGURABLE DEPENDENCIES (rare)
@Service
public class DynamicOrderService {
    private PaymentGateway paymentGateway;
    
    public DynamicOrderService(PaymentGateway defaultGateway) {
        this.paymentGateway = defaultGateway;
    }
    
    // Allow runtime reconfiguration (rare use case)
    public void setPaymentGateway(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }
    
    // Useful for A/B testing, feature flags, runtime provider switching
}

// 3. LEGACY CODE INTEGRATION
//    Existing code uses setters
//    Gradual migration to constructor injection

// 4. FRAMEWORK REQUIREMENTS
//    Some frameworks require no-arg constructor + setters
//    JSF managed beans, some XML-based configurations

// ═══════════════════════════════════════════════════════════
// Problems with setter injection
// ═══════════════════════════════════════════════════════════

// 1. MUTABLE DEPENDENCIES
//    Dependencies can change at runtime
//    Thread-safety concerns
//    Hard to reason about state

// 2. PARTIAL INITIALIZATION
public class ProblematicService {
    private OrderRepository orderRepository;
    private PaymentGateway paymentGateway;
    
    public void setOrderRepository(OrderRepository repo) {
        this.orderRepository = repo;
    }
    
    public void setPaymentGateway(PaymentGateway gateway) {
        this.paymentGateway = gateway;
    }
    
    public void createOrder(Order order) {
        orderRepository.save(order); // NPE if setter not called!
        paymentGateway.charge(order); // NPE if setter not called!
    }
}

// Object can be created without calling setters
// No compile-time guarantee dependencies are set
// Runtime NPEs possible

// 3. NOT OBVIOUS WHAT'S REQUIRED
//    Are setters optional or required?
//    Must read code/documentation to know
//    Constructor makes requirements explicit

// ═══════════════════════════════════════════════════════════
// Testing with setter injection
// ═══════════════════════════════════════════════════════════

@Test
public void testCreateOrder() {
    // Arrange
    OrderRepository mockRepo = mock(OrderRepository.class);
    PaymentGateway mockGateway = mock(PaymentGateway.class);
    EmailService mockEmail = mock(EmailService.class);
    
    // Create service
    OrderService service = new OrderService(mockRepo, mockGateway);
    
    // Set optional dependencies via setters
    service.setEmailService(mockEmail);
    
    // Act & Assert
    service.createOrder(request);
    verify(mockEmail).sendOrderConfirmation(any(Order.class));
}
```

---

### 🟣 Method Injection (Special Cases)

```java
// RARE: Method injection for specific use cases

@Service
public class OrderService {
    
    private final OrderRepository orderRepository;
    
    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }
    
    // Inject dependency at method level (not class level)
    @Autowired
    public void initialize(
        ApplicationContext context,
        @Value("${app.version}") String appVersion
    ) {
        System.out.println("OrderService initialized with version: " + appVersion);
        // Can access context to lookup beans dynamically
    }
    
    // Another method injection use case
    @Lookup
    public OrderProcessor getOrderProcessor() {
        // Spring overrides this method to return new instance each time
        // Useful for prototype-scoped beans
        return null; // Spring provides implementation
    }
}

// Use cases:
// 1. Need ApplicationContext or Spring internals
// 2. Prototype-scoped beans (@Lookup)
// 3. Lifecycle callbacks with dependencies
// 4. Dynamic bean lookup
```

---

### 📊 Comparison Table

```
┌─────────────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Aspect                  │ Constructor      │ Field            │ Setter           │
├─────────────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ Immutability           │ ✅ Final fields  │ ❌ Mutable       │ ❌ Mutable       │
│ Required Dependencies  │ ✅ Explicit      │ ⚠️ Hidden       │ ⚠️ Unclear      │
│ Optional Dependencies  │ ⚠️ Verbose      │ ✅ Simple        │ ✅ Natural       │
│ Testability            │ ✅ Easy (mocks)  │ ❌ Hard          │ ✅ Easy          │
│ Circular Dependencies  │ ✅ Fails fast    │ ⚠️ Hidden       │ ⚠️ Hidden       │
│ Thread Safety          │ ✅ Immutable     │ ⚠️ Mutable      │ ⚠️ Mutable      │
│ Code Clarity           │ ✅ Self-doc      │ ❌ Hidden        │ ⚠️ Unclear      │
│ Spring Dependency      │ ✅ Optional      │ ❌ Required      │ ✅ Optional      │
│ Boilerplate            │ ⚠️ Verbose      │ ✅ Concise       │ ⚠️ Verbose      │
│ Null Safety            │ ✅ Guaranteed    │ ⚠️ NPE risk     │ ⚠️ NPE risk     │
│ Refactoring Safety     │ ✅ Compile-time  │ ⚠️ Runtime      │ ⚠️ Runtime      │
│ Best For               │ Production code  │ Tests, prototypes│ Optional deps    │
└─────────────────────────┴──────────────────┴──────────────────┴──────────────────┘

RECOMMENDATION:
✅ Constructor injection: Default choice for all production code
⚠️ Setter injection: Only for truly optional dependencies with defaults
❌ Field injection: Avoid (only acceptable in tests and prototypes)
```

---

## ────────────────────────────────────
## 3️⃣ Real-World Production Examples
## ────────────────────────────────────

### Example 1: Spring Boot Service Layer

```java
// Production-ready service with constructor injection

@Service
@Slf4j
public class OrderManagementService {
    
    // All dependencies final and injected via constructor
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    private final InventoryService inventoryService;
    private final NotificationService notificationService;
    private final EventPublisher eventPublisher;
    
    // Single constructor with @Autowired (optional in Spring 4.3+)
    public OrderManagementService(
        OrderRepository orderRepository,
        PaymentGateway paymentGateway,
        InventoryService inventoryService,
        NotificationService notificationService,
        EventPublisher eventPublisher
    ) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
        this.inventoryService = inventoryService;
        this.notificationService = notificationService;
        this.eventPublisher = eventPublisher;
    }
    
    @Transactional
    public Order createOrder(OrderRequest request) {
        log.info("Creating order for customer: {}", request.getCustomerId());
        
        // Check inventory
        boolean available = inventoryService.checkAvailability(
            request.getItems()
        );
        
        if (!available) {
            throw new OutOfStockException("Items not available");
        }
        
        // Process payment
        PaymentResult paymentResult = paymentGateway.charge(
            request.getCustomerId(),
            request.getTotal()
        );
        
        if (!paymentResult.isSuccessful()) {
            throw new PaymentFailedException(paymentResult.getErrorMessage());
        }
        
        // Create order
        Order order = Order.builder()
            .customerId(request.getCustomerId())
            .items(request.getItems())
            .total(request.getTotal())
            .paymentId(paymentResult.getTransactionId())
            .status(OrderStatus.PAID)
            .build();
        
        // Save order
        Order savedOrder = orderRepository.save(order);
        
        // Reserve inventory
        inventoryService.reserveStock(request.getItems());
        
        // Send notifications
        notificationService.sendOrderConfirmation(savedOrder);
        
        // Publish event
        eventPublisher.publish(new OrderCreatedEvent(savedOrder));
        
        log.info("Order created successfully: {}", savedOrder.getId());
        
        return savedOrder;
    }
}

// Easy to test with constructor injection
@ExtendWith(MockitoExtension.class)
class OrderManagementServiceTest {
    
    @Mock private OrderRepository orderRepository;
    @Mock private PaymentGateway paymentGateway;
    @Mock private InventoryService inventoryService;
    @Mock private NotificationService notificationService;
    @Mock private EventPublisher eventPublisher;
    
    private OrderManagementService orderService;
    
    @BeforeEach
    void setUp() {
        // Create service with all mocked dependencies
        orderService = new OrderManagementService(
            orderRepository,
            paymentGateway,
            inventoryService,
            notificationService,
            eventPublisher
        );
    }
    
    @Test
    void testCreateOrder_Success() {
        // Arrange
        OrderRequest request = new OrderRequest(/* ... */);
        
        when(inventoryService.checkAvailability(any())).thenReturn(true);
        when(paymentGateway.charge(any(), any()))
            .thenReturn(PaymentResult.success("txn-123"));
        when(orderRepository.save(any(Order.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
        
        // Act
        Order result = orderService.createOrder(request);
        
        // Assert
        assertNotNull(result);
        assertEquals(OrderStatus.PAID, result.getStatus());
        verify(inventoryService).reserveStock(any());
        verify(notificationService).sendOrderConfirmation(any());
        verify(eventPublisher).publish(any(OrderCreatedEvent.class));
    }
}
```

### Example 2: Mixed Injection (Required + Optional)

```java
// Real-world pattern: Constructor for required, setter for optional

@Service
public class ProductSearchService {
    
    // Required dependencies (constructor injection)
    private final ProductRepository productRepository;
    private final SearchIndexer searchIndexer;
    
    // Optional dependencies with defaults (setter injection)
    private CacheService cacheService = new NoOpCacheService();
    private MetricsService metricsService = new NoOpMetricsService();
    
    // Constructor for required dependencies
    public ProductSearchService(
        ProductRepository productRepository,
        SearchIndexer searchIndexer
    ) {
        this.productRepository = productRepository;
        this.searchIndexer = searchIndexer;
    }
    
    // Optional: Cache service (feature flag controlled)
    @Autowired(required = false)
    @ConditionalOnProperty(name = "feature.cache.enabled", havingValue = "true")
    public void setCacheService(CacheService cacheService) {
        this.cacheService = cacheService;
    }
    
    // Optional: Metrics service (production only)
    @Autowired(required = false)
    @Profile("production")
    public void setMetricsService(MetricsService metricsService) {
        this.metricsService = metricsService;
    }
    
    public List<Product> search(String query) {
        metricsService.startTimer("product.search");
        
        // Check cache
        Optional<List<Product>> cached = cacheService.get("search:" + query);
        if (cached.isPresent()) {
            metricsService.incrementCounter("product.search.cache.hit");
            return cached.get();
        }
        
        // Search in index
        List<String> productIds = searchIndexer.search(query);
        
        // Fetch from repository
        List<Product> products = productRepository.findAllById(productIds);
        
        // Cache results
        cacheService.put("search:" + query, products);
        
        metricsService.stopTimer("product.search");
        metricsService.incrementCounter("product.search.cache.miss");
        
        return products;
    }
}
```

---

## ────────────────────────────────────
## 4️⃣ Interview Q&A (Behavioral Questions)
## ────────────────────────────────────

### Q1: "What is dependency injection and why use it?"

**Answer:** *"Dependency injection is design pattern where class receives its dependencies from external source rather than creating them itself. Instead of OrderService creating new MySQLRepository(), dependencies are injected via constructor, field, or setter.*

*Three types: Constructor injection (dependencies passed to constructor), field injection (dependencies injected into fields via @Autowired), setter injection (dependencies set via setter methods).*

*Benefits: Testability—inject mocks in tests. Loose coupling—class doesn't know about concrete implementations. Flexibility—swap implementations easily. Single Responsibility—class doesn't create dependencies.*

*Example: OrderService with constructor injection. Depends on OrderRepository interface (abstraction). In production, Spring injects JpaOrderRepository. In tests, inject MockOrderRepository. OrderService never knows concrete type—protected by abstraction."*

### Q2: "Why is constructor injection better than field injection?"

**Answer:** *"Constructor injection is better for six reasons:*

*First, immutability. Constructor injection allows final fields—dependencies cannot change after construction. Field injection requires mutable fields—thread-safety concerns.*

*Second, testability. Constructor injection: create service with mocks via constructor—OrderService service = new OrderService(mockRepo, mockGateway). Field injection: must use reflection or Spring test context—much harder.*

*Third, explicit dependencies. Constructor signature shows all required dependencies—self-documenting. Field injection hides dependencies—must scan entire class for @Autowired fields.*

*Fourth, compile-time safety. Constructor signature is part of API—refactoring caught at compile time. Field injection uses reflection—errors caught at runtime.*

*Fifth, works without Spring. Constructor injection works as plain Java—can instantiate without container. Field injection requires Spring—tight coupling to framework.*

*Sixth, prevents circular dependencies. Constructor injection fails fast with StackOverflowError at construction. Field injection may hide circular dependencies until runtime.*

*Real example: At my company, refactored services from field to constructor injection. Test setup went from 50 lines (reflection magic) to 5 lines (simple constructor call). Found 3 circular dependencies that were hiding with field injection. Code became more maintainable and testable."*

### Q3: "When would you use setter injection?"

**Answer:** *"Setter injection for optional dependencies with sensible defaults. Three main use cases:*

*First, feature flags. CacheService that's optional—some environments have Redis, others don't. Constructor requires CacheService. Setter injection with @Autowired(required=false) and default NoOpCacheService. Service works without cache, better with cache.*

*Second, legacy code. Existing code uses setters, gradual migration to constructor injection. Change all at once risks breaking system. Incremental refactoring safer.*

*Third, runtime reconfiguration (rare). PaymentGateway that switches based on A/B test or feature flag. Setter allows changing gateway at runtime. Rare use case—most dependencies should be immutable.*

*Example: ProductSearchService with required dependencies (ProductRepository, SearchIndexer) via constructor. Optional dependencies (CacheService, MetricsService) via setters with defaults. Service works without cache/metrics but better with them. Production has both, development has neither. Same code runs in both environments.*

*Setter injection should be exception, not rule. Constructor injection default for 95% of dependencies."*

### Q4: "How do you handle a class with 10+ dependencies?"

**Answer:** *"10+ dependencies is code smell indicating Single Responsibility Principle violation. Class doing too much. Three solutions:*

*First, split class into multiple classes. Example: OrderService with 12 dependencies handling orders, payments, inventory, notifications, metrics, logging. Split into OrderCreationService (3 dependencies), OrderPaymentService (2 dependencies), OrderNotificationService (3 dependencies). Each focused class with fewer dependencies.*

*Second, create facade for related dependencies. Example: NotificationService, EmailService, SmsService, PushService—all related. Create NotificationFacade composing all four. OrderService depends on single NotificationFacade instead of four separate services. Reduces constructor from 12 parameters to 8.*

*Third, evaluate if all dependencies truly needed. Sometimes dependencies added over time, some no longer used. Remove unused dependencies. Sometimes dependencies can be extracted to separate layer.*

*Real example: Encountered UserService with 15 dependencies. Analysis showed 5 for CRUD operations, 4 for authentication, 3 for notifications, 3 for audit logging. Split into UserRepository (CRUD), AuthenticationService (auth), UserNotificationService (notifications), AuditService (logging). Original 15 dependencies across 4 focused services with 3-4 dependencies each.*

*Large constructor is symptom, not disease. Disease is SRP violation. Fix disease, symptom disappears."*

### Q5: "What's wrong with this code: @Autowired private UserRepository userRepository?"

**Answer:** *"Field injection has five problems:*

*First, cannot be final. userRepository is mutable—can be changed after construction. Thread-safety concerns. Constructor injection allows final fields.*

*Second, hard to test. Must use reflection to inject mocks. ReflectionTestUtils.setField(service, 'userRepository', mockRepo)—ugly, fragile. Or use Spring test context—slow. Constructor injection: just pass mock to constructor.*

*Third, hides dependencies. Dependencies not visible in constructor or anywhere obvious. Must scan class for @Autowired annotations. Easy to accumulate too many dependencies. Constructor injection makes dependencies explicit in signature.*

*Fourth, tight coupling to Spring. Class cannot be instantiated without Spring container. Cannot use as POJO. Constructor injection works with or without Spring.*

*Fifth, NullPointerException risk. If someone creates UserService directly (not via Spring), userRepository is null. Constructor injection fails fast—cannot create object without dependencies.*

*Refactored version:*
```java
@Service
public class UserService {
    private final UserRepository userRepository;
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

*Now final, easy to test, explicit dependencies, works without Spring, null-safe. Constructor injection is Spring's recommended approach—even Spring documentation says prefer constructor injection."*

### Q6: "How do you test a class with constructor injection?"

**Answer:** *"Testing with constructor injection is straightforward:*

*Step 1: Create mocks for dependencies using Mockito. OrderRepository mockRepo = mock(OrderRepository.class). PaymentGateway mockGateway = mock(PaymentGateway.class).*

*Step 2: Create service instance passing mocks to constructor. OrderService service = new OrderService(mockRepo, mockGateway, mockEmail). No Spring, no reflection, plain Java.*

*Step 3: Configure mock behavior with when/thenReturn. when(mockGateway.charge(any(), any())).thenReturn(PaymentResult.success('txn-123')).*

*Step 4: Execute test. service.createOrder(request).*

*Step 5: Verify interactions. verify(mockRepo).save(any(Order.class)). verify(mockEmail).send(any()).*

*Example test:*
```java
@Test
void testCreateOrder() {
    // Arrange
    OrderRepository mockRepo = mock(OrderRepository.class);
    PaymentGateway mockGateway = mock(PaymentGateway.class);
    EmailService mockEmail = mock(EmailService.class);
    
    OrderService service = new OrderService(mockRepo, mockGateway, mockEmail);
    
    when(mockGateway.charge(any(), any()))
        .thenReturn(PaymentResult.success("txn-123"));
    
    // Act
    service.createOrder(new OrderRequest(/* ... */));
    
    // Assert
    verify(mockRepo).save(any(Order.class));
    verify(mockEmail).send(any());
}
```

*Compare to field injection: need reflection or @SpringBootTest. Constructor injection: simple, fast, no framework needed. Tests run in milliseconds, not seconds. Constructor injection makes testing natural and easy."*

---

## 🔟 Why & How Summary

### Why Dependency Injection Matters

**Testability:**
- Inject mocks for unit testing
- No need for real infrastructure
- Fast tests (milliseconds)
- Higher coverage achievable

**Loose Coupling:**
- Class doesn't create dependencies
- Depends on abstractions (interfaces)
- Easy to swap implementations
- Changes isolated

**Flexibility:**
- Configure dependencies externally
- Different configs per environment
- Runtime behavior changes possible
- A/B testing implementations

**Maintainability:**
- Dependencies explicit and clear
- Single Responsibility (no object creation)
- Easier to understand and modify
- Refactoring safer

### How to Apply Dependency Injection

**Choose the Right Type:**
```java
// ✅ Constructor: Required dependencies (default choice)
public OrderService(OrderRepository repo, PaymentGateway gateway) {
    this.repo = repo;
    this.gateway = gateway;
}

// ⚠️ Setter: Optional dependencies with defaults
@Autowired(required = false)
public void setCacheService(CacheService cache) {
    this.cache = cache;
}

// ❌ Field: Avoid (tests/prototypes only)
@Autowired
private OrderRepository repo;
```

**Best Practices:**
1. **Default to constructor injection** for all production code
2. **Make dependencies final** (immutability)
3. **Limit constructor parameters** to 5-7 (SRP check)
4. **Use setter only for optional** dependencies
5. **Avoid field injection** in production

### Interview Red Flags

🚫 "Field injection is cleaner/simpler"
✅ "Constructor injection is more testable and explicit"

🚫 "Constructor injection creates boilerplate"
✅ "Constructor injection makes dependencies explicit and testable"

🚫 "Setter injection gives flexibility"
✅ "Immutability is better than flexibility—use constructor injection"

### Final Sound Bite

*"Dependency injection means receiving dependencies from external source rather than creating them. Three types: constructor (best—immutable, testable, explicit), field (avoid—mutable, hard to test, hidden), setter (optional dependencies only).*

*Constructor injection: OrderService(OrderRepository repo, PaymentGateway gateway)—dependencies passed to constructor, made final, guaranteed available. Easy to test: new OrderService(mockRepo, mockGateway). Works without Spring. Compile-time safe.*

*Field injection: @Autowired private OrderRepository repo—injected via reflection, cannot be final, hard to test (need reflection or Spring context), hides dependencies, tight coupling to Spring. Convenient but problematic.*

*Setter injection: setOptional(CacheService cache)—for optional dependencies with defaults. Service works without cache, better with cache. NoOpCacheService default, real cache in production.*

*Constructor injection is Spring's recommended approach. Use for 95% of cases. Setter for optional dependencies. Avoid field injection in production—only acceptable in tests and prototypes. Constructor injection enables testability, immutability, explicit dependencies—foundations of maintainable code."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
