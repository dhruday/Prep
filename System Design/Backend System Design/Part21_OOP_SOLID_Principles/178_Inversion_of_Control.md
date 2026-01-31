# 178. Inversion of Control (IoC)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Inversion of Control (IoC)**: A design principle where the framework controls the flow of program execution, calling your code when needed, rather than your code calling the framework.

### Core Concept

**What it means:**
- **Traditional control flow**: Your code controls execution, calls libraries
- **Inverted control flow**: Framework controls execution, calls your code
- **"Don't call us, we'll call you"** - Hollywood Principle
- **You provide implementations**, framework manages lifecycle

**Simple analogy:**
- **Traditional**: You call restaurant to order food, wait on phone, receive delivery
- **IoC**: You provide restaurant with your address/preferences, they call you when ready
- The restaurant (framework) controls when and how to contact you

**In code:**
```java
// TRADITIONAL: You control the flow ❌
public class Application {
    public static void main(String[] args) {
        // You create objects
        Database db = new MySQLDatabase();
        Repository repo = new UserRepository(db);
        Service service = new UserService(repo);
        
        // You call methods
        User user = service.getUser("123");
        
        // You manage lifecycle
        db.close();
    }
}

// INVERSION OF CONTROL: Framework controls the flow ✓
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args); // Framework takes over!
    }
}

@RestController
public class UserController {
    private final UserService userService;
    
    // Framework creates and injects dependencies
    public UserController(UserService userService) {
        this.userService = userService;
    }
    
    @GetMapping("/users/{id}")
    public User getUser(@PathVariable String id) {
        return userService.getUser(id); // Framework calls this when request arrives!
    }
}

// Framework:
// 1. Creates UserController, UserService, UserRepository
// 2. Injects dependencies
// 3. Starts web server
// 4. Routes HTTP requests to your methods
// 5. Handles exceptions, logging, transactions
// 6. Manages object lifecycle
```

### Key Aspects of IoC

**1. Object Lifecycle Management**
- Framework creates objects (not you)
- Framework manages lifecycle (initialization, destruction)
- Framework handles dependencies
- You just provide class definitions

**2. Event/Request Handling**
- Framework receives events (HTTP requests, messages, timers)
- Framework routes events to your code
- Framework calls your methods
- You implement business logic only

**3. Configuration-Based Behavior**
- You configure framework via annotations/XML/properties
- Framework reads configuration
- Framework wires everything together
- Declarative rather than imperative

**4. Separation of Concerns**
- Framework handles infrastructure (HTTP, transactions, security)
- Your code handles business logic
- Clear separation of technical vs business concerns

### IoC vs Dependency Injection

**Relationship:**
- **IoC**: Broad principle (framework controls flow)
- **Dependency Injection**: Specific implementation of IoC (framework provides dependencies)
- DI is **one way** to achieve IoC, not the only way

**IoC Container:**
- Software framework implementing IoC principle
- Manages object creation and lifecycle
- Resolves and injects dependencies
- Examples: Spring IoC Container, Google Guice, CDI

### Why Inversion of Control Matters

**Simplifies Development:**
- Don't write infrastructure code (HTTP handling, transactions, etc.)
- Focus on business logic
- Framework handles cross-cutting concerns

**Improves Testability:**
- Framework can inject test doubles
- Easier to mock dependencies
- Unit tests don't need full framework

**Enables Flexibility:**
- Change implementations without code changes
- Configuration-driven behavior
- Plugin architectures

**Reduces Boilerplate:**
- No manual object creation
- No manual dependency wiring
- No manual lifecycle management

**Role in interviews:**
- FAANG asks: "What's the difference between IoC and DI?"
- Design questions: "How does Spring manage object lifecycle?"
- Expects understanding of framework internals and control flow

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🎯 Traditional Control Flow vs IoC

#### Traditional Control Flow (Library Pattern)

```java
// YOU control the flow of execution

public class ECommerceApplication {
    
    public static void main(String[] args) {
        // You create all objects manually
        DatabaseConnection db = new MySQLConnection(
            "jdbc:mysql://localhost/ecommerce",
            "user",
            "password"
        );
        
        // You open connection
        db.connect();
        
        // You create repository with dependency
        ProductRepository productRepo = new ProductRepository(db);
        OrderRepository orderRepo = new OrderRepository(db);
        
        // You create service with dependencies
        EmailService emailService = new EmailService(
            "smtp.gmail.com",
            "username",
            "password"
        );
        
        PaymentGateway paymentGateway = new StripePaymentGateway(
            "sk_test_123"
        );
        
        OrderService orderService = new OrderService(
            orderRepo,
            productRepo,
            paymentGateway,
            emailService
        );
        
        // You parse input
        Scanner scanner = new Scanner(System.in);
        System.out.println("Enter customer ID:");
        String customerId = scanner.nextLine();
        
        System.out.println("Enter product ID:");
        String productId = scanner.nextLine();
        
        // You call methods
        Product product = productRepo.findById(productId);
        
        if (product == null) {
            System.out.println("Product not found");
            return;
        }
        
        // You orchestrate the workflow
        try {
            Order order = orderService.createOrder(customerId, productId);
            System.out.println("Order created: " + order.getId());
        } catch (PaymentException e) {
            System.out.println("Payment failed: " + e.getMessage());
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
        }
        
        // You clean up resources
        db.close();
        scanner.close();
    }
}

// Problems with this approach:
// 1. Tight coupling to concrete classes
// 2. Hard to test (how to mock database?)
// 3. Repetitive object creation code
// 4. Manual lifecycle management
// 5. Configuration mixed with code
// 6. Error handling scattered
// 7. No transaction management
// 8. No security
// 9. No logging infrastructure
// 10. Doesn't scale (single-threaded, blocking)
```

#### Inverted Control Flow (Framework Pattern)

```java
// FRAMEWORK controls the flow of execution

// 1. You define configuration
@SpringBootApplication
@EnableTransactionManagement
public class ECommerceApplication {
    
    public static void main(String[] args) {
        // You start the framework
        // Framework takes control from here!
        SpringApplication.run(ECommerceApplication.class, args);
        
        // Framework:
        // - Scans for @Component/@Service/@Repository/@Controller
        // - Creates beans (managed objects)
        // - Resolves dependencies
        // - Injects dependencies
        // - Starts web server
        // - Listens for HTTP requests
        // - Routes requests to controller methods
        // - Manages transactions
        // - Handles exceptions
        // - Logs everything
        // - Provides security
        // - Manages thread pools
        // - ... you just provide business logic!
    }
}

// 2. You define beans (framework creates them)
@Configuration
public class AppConfig {
    
    @Bean
    public PaymentGateway paymentGateway() {
        return new StripePaymentGateway(
            environment.getProperty("stripe.api.key")
        );
    }
    
    @Bean
    public EmailService emailService() {
        return new EmailService(
            environment.getProperty("email.host"),
            environment.getProperty("email.username"),
            environment.getProperty("email.password")
        );
    }
}

// 3. You define data layer (framework manages)
@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String customerId;
    private String productId;
    private BigDecimal total;
    
    // Framework handles CRUD via JPA
}

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Framework implements this interface!
    List<Order> findByCustomerId(String customerId);
}

// 4. You define service layer (framework calls it)
@Service
@Transactional // Framework manages transactions!
public class OrderService {
    
    // Framework injects dependencies
    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final PaymentGateway paymentGateway;
    private final EmailService emailService;
    
    public OrderService(
        OrderRepository orderRepository,
        ProductRepository productRepository,
        PaymentGateway paymentGateway,
        EmailService emailService
    ) {
        this.orderRepository = orderRepository;
        this.productRepository = productRepository;
        this.paymentGateway = paymentGateway;
        this.emailService = emailService;
    }
    
    // Framework calls this within transaction boundary
    public Order createOrder(String customerId, String productId) {
        // Framework already started transaction
        
        Product product = productRepository.findById(productId)
            .orElseThrow(() -> new ProductNotFoundException(productId));
        
        PaymentResult result = paymentGateway.charge(
            customerId,
            product.getPrice()
        );
        
        if (!result.isSuccessful()) {
            throw new PaymentException(result.getError());
            // Framework rolls back transaction
        }
        
        Order order = Order.builder()
            .customerId(customerId)
            .productId(productId)
            .total(product.getPrice())
            .build();
        
        Order savedOrder = orderRepository.save(order);
        
        emailService.sendOrderConfirmation(savedOrder);
        
        // Framework commits transaction
        return savedOrder;
    }
}

// 5. You define controller (framework routes to it)
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    
    // Framework injects service
    private final OrderService orderService;
    
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }
    
    // Framework calls this when POST /api/orders arrives
    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody OrderRequest request) {
        // Framework already:
        // - Parsed HTTP request
        // - Validated JSON
        // - Deserialized to OrderRequest
        // - Authenticated user (if @Secured)
        // - Rate-limited request
        // - Started MDC logging context
        
        Order order = orderService.createOrder(
            request.getCustomerId(),
            request.getProductId()
        );
        
        // Framework will:
        // - Serialize order to JSON
        // - Set Content-Type header
        // - Return HTTP 200
        // - Log response
        // - Clean up resources
        
        return ResponseEntity.ok(order);
    }
    
    // Framework calls this when exception thrown
    @ExceptionHandler(PaymentException.class)
    public ResponseEntity<ErrorResponse> handlePaymentException(PaymentException e) {
        return ResponseEntity
            .status(HttpStatus.PAYMENT_REQUIRED)
            .body(new ErrorResponse(e.getMessage()));
    }
}

// ═══════════════════════════════════════════════════════════
// Benefits of IoC
// ═══════════════════════════════════════════════════════════

// 1. FRAMEWORK MANAGES COMPLEXITY
//    HTTP handling, threading, transactions, security, logging
//    You focus on business logic only

// 2. CONFIGURATION-DRIVEN
//    Change behavior via application.properties
//    No code changes needed
server.port=8080
spring.datasource.url=jdbc:postgresql://localhost/ecommerce
spring.datasource.username=user
spring.datasource.password=pass
stripe.api.key=sk_live_xyz

// 3. DECLARATIVE PROGRAMMING
//    @Transactional = framework manages transactions
//    @Cacheable = framework manages caching
//    @Secured = framework manages security
//    @Async = framework manages async execution

// 4. LIFECYCLE MANAGEMENT
//    Framework creates objects when needed
//    Framework destroys objects when done
//    Framework manages singletons, prototypes, request scope, session scope

// 5. DEPENDENCY RESOLUTION
//    Framework resolves dependency graph
//    Detects circular dependencies
//    Manages initialization order

// 6. CROSS-CUTTING CONCERNS
//    Framework handles via AOP (Aspect-Oriented Programming)
//    Logging, metrics, tracing added without modifying code

// 7. TESTABILITY
@SpringBootTest
class OrderServiceTest {
    @MockBean
    private PaymentGateway paymentGateway; // Framework injects mock
    
    @Autowired
    private OrderService orderService; // Framework injects real service
    
    @Test
    void testCreateOrder() {
        when(paymentGateway.charge(any(), any()))
            .thenReturn(PaymentResult.success("txn-123"));
        
        Order order = orderService.createOrder("cust-1", "prod-1");
        
        assertNotNull(order);
    }
}
```

---

### 🏗️ IoC Container Internals

#### How Spring IoC Container Works

```java
// ═══════════════════════════════════════════════════════════
// Phase 1: Component Scanning
// ═══════════════════════════════════════════════════════════

// Spring scans classpath for classes with:
// @Component, @Service, @Repository, @Controller, @Configuration

// Example:
@Service // Found by component scan!
public class OrderService {
    // ...
}

// Internally, Spring:
// 1. Loads all .class files in base package
// 2. Checks for stereotype annotations
// 3. Creates BeanDefinition for each component
// 4. Stores BeanDefinitions in BeanDefinitionRegistry

// ═══════════════════════════════════════════════════════════
// Phase 2: Bean Definition Processing
// ═══════════════════════════════════════════════════════════

// Spring analyzes each BeanDefinition:
// - Bean name (default: uncapitalized class name)
// - Bean scope (singleton, prototype, request, session)
// - Bean dependencies (constructor parameters, @Autowired fields)
// - Lifecycle callbacks (@PostConstruct, @PreDestroy)
// - Lazy initialization (@Lazy)

class BeanDefinition {
    String beanName;              // "orderService"
    Class<?> beanClass;           // OrderService.class
    Scope scope;                  // SINGLETON
    List<Dependency> dependencies; // [orderRepository, paymentGateway, ...]
    Method postConstruct;         // method annotated with @PostConstruct
    Method preDestroy;            // method annotated with @PreDestroy
    boolean lazy;                 // false (default)
}

// ═══════════════════════════════════════════════════════════
// Phase 3: Dependency Resolution
// ═══════════════════════════════════════════════════════════

// Spring builds dependency graph:
// OrderController → OrderService → [OrderRepository, PaymentGateway, EmailService]
//                                   ↓
//                              DatabaseConnection

// Spring determines initialization order (topological sort):
// 1. DatabaseConnection (no dependencies)
// 2. OrderRepository (depends on DatabaseConnection)
// 3. PaymentGateway (no dependencies)
// 4. EmailService (no dependencies)
// 5. OrderService (depends on repository, gateway, email)
// 6. OrderController (depends on OrderService)

// Circular dependency detection:
// OrderService → OrderRepository → OrderService (CIRCULAR!)
// Spring throws BeanCurrentlyInCreationException

// ═══════════════════════════════════════════════════════════
// Phase 4: Bean Instantiation
// ═══════════════════════════════════════════════════════════

// Spring creates instances in dependency order:

// Pseudo-code for Spring's bean creation:
public Object createBean(BeanDefinition beanDef) {
    // 1. Check if already created (singleton cache)
    Object existingBean = singletonCache.get(beanDef.beanName);
    if (existingBean != null) {
        return existingBean;
    }
    
    // 2. Resolve dependencies first (recursive)
    List<Object> dependencies = new ArrayList<>();
    for (Dependency dep : beanDef.dependencies) {
        BeanDefinition depBeanDef = beanDefinitionRegistry.get(dep.name);
        Object depInstance = createBean(depBeanDef); // Recursive!
        dependencies.add(depInstance);
    }
    
    // 3. Create instance via constructor
    Constructor<?> constructor = beanDef.beanClass.getConstructor(...);
    Object bean = constructor.newInstance(dependencies.toArray());
    
    // 4. Inject @Autowired fields (if any)
    for (Field field : beanDef.autowiredFields) {
        Object fieldValue = getBean(field.getType());
        field.setAccessible(true);
        field.set(bean, fieldValue);
    }
    
    // 5. Call @PostConstruct method
    if (beanDef.postConstruct != null) {
        beanDef.postConstruct.invoke(bean);
    }
    
    // 6. Apply AOP proxies
    bean = applyAopProxies(bean, beanDef);
    
    // 7. Store in singleton cache
    if (beanDef.scope == Scope.SINGLETON) {
        singletonCache.put(beanDef.beanName, bean);
    }
    
    return bean;
}

// ═══════════════════════════════════════════════════════════
// Phase 5: AOP Proxy Creation
// ═══════════════════════════════════════════════════════════

// If bean has @Transactional, @Cacheable, @Async, etc.
// Spring creates proxy that wraps original bean

@Service
public class OrderService {
    @Transactional
    public Order createOrder(...) {
        // business logic
    }
}

// Spring creates proxy:
class OrderService$Proxy extends OrderService {
    private OrderService target; // Real OrderService instance
    private TransactionManager transactionManager;
    
    @Override
    public Order createOrder(...) {
        // Before advice: Start transaction
        TransactionStatus tx = transactionManager.getTransaction();
        
        try {
            // Call real method
            Order result = target.createOrder(...);
            
            // After advice: Commit transaction
            transactionManager.commit(tx);
            
            return result;
        } catch (Exception e) {
            // After-throwing advice: Rollback transaction
            transactionManager.rollback(tx);
            throw e;
        }
    }
}

// ═══════════════════════════════════════════════════════════
// Phase 6: Application Context Ready
// ═══════════════════════════════════════════════════════════

// All beans created, dependencies injected, proxies applied
// Application context publishes ContextRefreshedEvent
// Listeners can react to application startup

@Component
public class StartupListener implements ApplicationListener<ContextRefreshedEvent> {
    @Override
    public void onApplicationEvent(ContextRefreshedEvent event) {
        System.out.println("Application started!");
        // Initialize caches, warm up connections, etc.
    }
}

// ═══════════════════════════════════════════════════════════
// Runtime: Request Handling
// ═══════════════════════════════════════════════════════════

// HTTP request arrives: POST /api/orders
// Spring's DispatcherServlet:

public void handleRequest(HttpServletRequest request, HttpServletResponse response) {
    // 1. Find handler method
    HandlerMethod handler = handlerMapping.getHandler(request);
    // Maps to: OrderController.createOrder()
    
    // 2. Get controller bean from context
    Object controller = applicationContext.getBean(handler.getBeanName());
    // Returns: OrderController instance (singleton)
    
    // 3. Parse request body
    Object requestBody = messageConverter.read(
        request.getInputStream(),
        OrderRequest.class
    );
    
    // 4. Invoke handler method
    Object result = handler.getMethod().invoke(controller, requestBody);
    
    // 5. Serialize response
    messageConverter.write(result, response.getOutputStream());
}

// Framework calls YOUR code (OrderController.createOrder)
// This is INVERSION OF CONTROL!
```

---

### 🎭 IoC Types and Examples

#### 1. Dependency Injection (Most Common)

```java
// Framework injects dependencies

@Service
public class UserService {
    private final UserRepository userRepository; // Injected by framework
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

// Framework controls which implementation is injected
// Can inject JpaUserRepository in production
// Can inject MockUserRepository in tests
```

#### 2. Template Method Pattern (IoC via Inheritance)

```java
// Framework defines algorithm, you implement specific steps

// Framework provides:
public abstract class JdbcTemplate {
    
    // Template method (framework calls this)
    public <T> T query(String sql, Object[] args, RowMapper<T> rowMapper) {
        Connection conn = null;
        PreparedStatement stmt = null;
        ResultSet rs = null;
        
        try {
            // Framework handles infrastructure
            conn = dataSource.getConnection();
            stmt = conn.prepareStatement(sql);
            
            for (int i = 0; i < args.length; i++) {
                stmt.setObject(i + 1, args[i]);
            }
            
            rs = stmt.executeQuery();
            List<T> results = new ArrayList<>();
            
            while (rs.next()) {
                // Framework calls YOUR code here!
                T row = rowMapper.mapRow(rs, rs.getRow());
                results.add(row);
            }
            
            return results.get(0);
            
        } catch (SQLException e) {
            throw new DataAccessException(e);
        } finally {
            // Framework handles cleanup
            close(rs);
            close(stmt);
            close(conn);
        }
    }
}

// You implement specific step:
public class UserRepository {
    private JdbcTemplate jdbcTemplate;
    
    public User findById(String id) {
        return jdbcTemplate.query(
            "SELECT * FROM users WHERE id = ?",
            new Object[]{id},
            // You provide row mapping logic, framework calls it
            (rs, rowNum) -> new User(
                rs.getString("id"),
                rs.getString("name"),
                rs.getString("email")
            )
        );
    }
}

// Framework controls flow:
// 1. Opens connection
// 2. Creates statement
// 3. Executes query
// 4. Iterates results
// 5. CALLS YOUR CODE (RowMapper)
// 6. Closes resources
```

#### 3. Event-Driven IoC (Observer Pattern)

```java
// Framework detects events, calls your listeners

@Component
public class OrderEventListener {
    
    // Framework calls this when OrderCreatedEvent published
    @EventListener
    public void handleOrderCreated(OrderCreatedEvent event) {
        System.out.println("Order created: " + event.getOrderId());
        // Send email, update analytics, etc.
    }
    
    // Framework calls this when payment fails
    @EventListener
    public void handlePaymentFailed(PaymentFailedEvent event) {
        System.out.println("Payment failed: " + event.getReason());
        // Retry, notify customer, etc.
    }
}

// You publish event:
@Service
public class OrderService {
    private final ApplicationEventPublisher eventPublisher;
    
    public Order createOrder(...) {
        Order order = // create order
        
        // Framework distributes this event to all listeners
        eventPublisher.publishEvent(new OrderCreatedEvent(order.getId()));
        
        return order;
    }
}

// Framework:
// - Maintains registry of event listeners
// - Calls listeners when event published
// - Handles threading (sync vs async)
// - Manages error handling
```

#### 4. Lifecycle Callbacks (IoC via Hooks)

```java
// Framework calls your methods at specific lifecycle points

@Component
public class CacheWarmer {
    
    private Cache cache;
    
    // Framework calls this after bean created
    @PostConstruct
    public void warmCache() {
        System.out.println("Warming cache...");
        cache.put("popular-items", loadPopularItems());
    }
    
    // Framework calls this before bean destroyed
    @PreDestroy
    public void cleanupCache() {
        System.out.println("Cleaning up cache...");
        cache.clear();
    }
}

// Framework controls WHEN to call these methods
// You just provide the logic
```

#### 5. Aspect-Oriented Programming (IoC via Interception)

```java
// Framework intercepts method calls, executes your advice

@Aspect
@Component
public class LoggingAspect {
    
    // Framework calls this BEFORE every service method
    @Before("execution(* com.example.service.*.*(..))")
    public void logBefore(JoinPoint joinPoint) {
        System.out.println("Calling: " + joinPoint.getSignature());
    }
    
    // Framework calls this AFTER every service method
    @After("execution(* com.example.service.*.*(..))")
    public void logAfter(JoinPoint joinPoint) {
        System.out.println("Completed: " + joinPoint.getSignature());
    }
    
    // Framework calls this AROUND every @Timed method
    @Around("@annotation(Timed)")
    public Object measureTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        
        // Framework lets you control whether to proceed
        Object result = joinPoint.proceed();
        
        long duration = System.currentTimeMillis() - start;
        System.out.println("Duration: " + duration + "ms");
        
        return result;
    }
}

// You write business logic:
@Service
public class OrderService {
    
    @Timed // Framework intercepts this!
    public Order createOrder(...) {
        // Your business logic
    }
}

// Framework:
// - Creates proxy around OrderService
// - Intercepts createOrder() call
// - Executes advice (logBefore, measureTime)
// - Calls actual method
// - Executes advice (logAfter)
// - Returns result
```

---

### 🆚 IoC Container Comparison

```java
// ═══════════════════════════════════════════════════════════
// Spring Framework (Most Popular)
// ═══════════════════════════════════════════════════════════

@SpringBootApplication
public class App {
    public static void main(String[] args) {
        SpringApplication.run(App.class, args);
    }
}

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}

// Features:
// - Comprehensive (DI, AOP, transactions, web, data, security)
// - Annotation-based configuration
// - XML configuration (legacy)
// - Large ecosystem (Spring Boot, Spring Cloud, Spring Data)
// - Steep learning curve
// - Heavy framework

// ═══════════════════════════════════════════════════════════
// Google Guice (Lightweight)
// ═══════════════════════════════════════════════════════════

public class App {
    public static void main(String[] args) {
        Injector injector = Guice.createInjector(new AppModule());
        UserService service = injector.getInstance(UserService.class);
    }
}

class AppModule extends AbstractModule {
    @Override
    protected void configure() {
        bind(UserRepository.class).to(JpaUserRepository.class);
    }
}

public class UserService {
    @Inject
    private UserRepository userRepository;
}

// Features:
// - Pure dependency injection (no web, data, etc.)
// - Fast, lightweight
// - Compile-time validation (via Guice extensions)
// - Less magic than Spring
// - Smaller ecosystem

// ═══════════════════════════════════════════════════════════
// Java CDI (Standard)
// ═══════════════════════════════════════════════════════════

@ApplicationScoped
public class UserService {
    @Inject
    private UserRepository userRepository;
}

// Features:
// - Java EE standard (JSR-330, JSR-299)
// - Multiple implementations (Weld, OpenWebBeans)
// - Type-safe dependency injection
// - Event-driven programming
// - Decorator pattern support
// - Requires Java EE application server

// ═══════════════════════════════════════════════════════════
// Dagger (Compile-Time)
// ═══════════════════════════════════════════════════════════

@Component
interface AppComponent {
    UserService userService();
}

@Module
class AppModule {
    @Provides
    static UserRepository provideUserRepository() {
        return new JpaUserRepository();
    }
}

public class UserService {
    @Inject
    UserRepository userRepository;
    
    @Inject
    UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

// Features:
// - Compile-time dependency injection (generated code)
// - No reflection (fast!)
// - Compile-time validation (no runtime errors)
// - Popular for Android
// - Verbose setup
```

---

## ────────────────────────────────────
## 3️⃣ Real-World Production Examples
## ────────────────────────────────────

### Example 1: Spring Boot REST API (Complete IoC)

```java
// Complete e-commerce system with IoC

// ═══════════════════════════════════════════════════════════
// 1. Application entry point (Framework takes control)
// ═══════════════════════════════════════════════════════════

@SpringBootApplication
@EnableTransactionManagement
@EnableCaching
@EnableAsync
public class ECommerceApplication {
    
    public static void main(String[] args) {
        // Hand over control to Spring
        SpringApplication.run(ECommerceApplication.class, args);
        
        // Spring now:
        // - Scans for components
        // - Creates beans
        // - Injects dependencies
        // - Starts web server
        // - Listens for requests
        // - Routes to controllers
        // - Manages transactions
        // - Handles exceptions
        // - Logs everything
        // - Provides metrics
    }
}

// ═══════════════════════════════════════════════════════════
// 2. Configuration (Framework reads this)
// ═══════════════════════════════════════════════════════════

@Configuration
public class AppConfig {
    
    @Bean
    public PaymentGateway paymentGateway(
        @Value("${payment.provider}") String provider,
        @Value("${payment.api.key}") String apiKey
    ) {
        if ("stripe".equals(provider)) {
            return new StripePaymentGateway(apiKey);
        } else if ("paypal".equals(provider)) {
            return new PayPalPaymentGateway(apiKey);
        }
        throw new IllegalArgumentException("Unknown provider: " + provider);
    }
    
    @Bean
    public Executor asyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.setMaxPoolSize(50);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        return executor;
    }
}

// application.properties (Framework reads configuration)
// payment.provider=stripe
// payment.api.key=sk_live_xyz
// spring.datasource.url=jdbc:postgresql://localhost/ecommerce
// spring.cache.type=redis

// ═══════════════════════════════════════════════════════════
// 3. Data Layer (Framework manages persistence)
// ═══════════════════════════════════════════════════════════

@Entity
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String customerId;
    private BigDecimal total;
    private OrderStatus status;
    
    @CreatedDate // Framework sets this automatically
    private LocalDateTime createdAt;
    
    @LastModifiedDate // Framework updates this automatically
    private LocalDateTime updatedAt;
}

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Framework implements these methods!
    List<Order> findByCustomerId(String customerId);
    List<Order> findByStatus(OrderStatus status);
    
    @Query("SELECT o FROM Order o WHERE o.total > :amount")
    List<Order> findLargeOrders(@Param("amount") BigDecimal amount);
}

// ═══════════════════════════════════════════════════════════
// 4. Service Layer (Framework calls this)
// ═══════════════════════════════════════════════════════════

@Service
@Slf4j
public class OrderService {
    
    // Framework injects all dependencies
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    private final InventoryService inventoryService;
    private final ApplicationEventPublisher eventPublisher;
    
    public OrderService(
        OrderRepository orderRepository,
        PaymentGateway paymentGateway,
        InventoryService inventoryService,
        ApplicationEventPublisher eventPublisher
    ) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
        this.inventoryService = inventoryService;
        this.eventPublisher = eventPublisher;
    }
    
    @Transactional // Framework manages transaction!
    @Cacheable("orders") // Framework manages cache!
    public Order getOrder(Long orderId) {
        // Framework:
        // - Checks cache first
        // - If cache hit, returns cached value
        // - If cache miss, calls this method
        // - Stores result in cache
        
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
    
    @Transactional // Framework manages transaction!
    @CacheEvict(value = "orders", allEntries = true) // Framework clears cache!
    public Order createOrder(OrderRequest request) {
        log.info("Creating order for customer: {}", request.getCustomerId());
        // Framework logs with MDC context
        
        // Framework started transaction here
        
        // Check inventory
        boolean available = inventoryService.checkAvailability(request.getItems());
        if (!available) {
            throw new OutOfStockException("Items not available");
            // Framework rolls back transaction
        }
        
        // Process payment
        PaymentResult result = paymentGateway.charge(
            request.getCustomerId(),
            request.getTotal()
        );
        
        if (!result.isSuccessful()) {
            throw new PaymentFailedException(result.getError());
            // Framework rolls back transaction
        }
        
        // Create order
        Order order = Order.builder()
            .customerId(request.getCustomerId())
            .total(request.getTotal())
            .status(OrderStatus.PAID)
            .build();
        
        Order savedOrder = orderRepository.save(order);
        // Framework executes SQL INSERT
        
        // Publish event
        eventPublisher.publishEvent(new OrderCreatedEvent(savedOrder));
        // Framework distributes to listeners
        
        // Framework commits transaction here
        log.info("Order created: {}", savedOrder.getId());
        
        return savedOrder;
    }
    
    @Async // Framework executes this in thread pool!
    public void processOrderAsync(Long orderId) {
        // Framework:
        // - Submits to thread pool
        // - Manages thread lifecycle
        // - Handles exceptions
        // - Returns CompletableFuture
        
        Order order = getOrder(orderId);
        // Process order asynchronously
    }
}

// ═══════════════════════════════════════════════════════════
// 5. Event Listeners (Framework calls these)
// ═══════════════════════════════════════════════════════════

@Component
@Slf4j
public class OrderEventListener {
    
    private final EmailService emailService;
    private final AnalyticsService analyticsService;
    
    public OrderEventListener(
        EmailService emailService,
        AnalyticsService analyticsService
    ) {
        this.emailService = emailService;
        this.analyticsService = analyticsService;
    }
    
    @EventListener // Framework calls this when event published
    @Async // Framework executes in separate thread
    public void handleOrderCreated(OrderCreatedEvent event) {
        log.info("Handling order created event: {}", event.getOrderId());
        
        // Send confirmation email
        emailService.sendOrderConfirmation(event.getOrder());
        
        // Track analytics
        analyticsService.trackOrderCreated(event.getOrder());
    }
    
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    // Framework calls this AFTER transaction commits
    public void handleOrderCreatedAfterCommit(OrderCreatedEvent event) {
        // Safe to send external notifications here
        // Transaction already committed, won't roll back
    }
}

// ═══════════════════════════════════════════════════════════
// 6. Controller Layer (Framework routes here)
// ═══════════════════════════════════════════════════════════

@RestController
@RequestMapping("/api/orders")
@Slf4j
public class OrderController {
    
    private final OrderService orderService;
    
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }
    
    @PostMapping // Framework calls this for POST /api/orders
    @ResponseStatus(HttpStatus.CREATED)
    public Order createOrder(@Valid @RequestBody OrderRequest request) {
        // Framework already:
        // - Authenticated user (if security enabled)
        // - Rate-limited request
        // - Parsed JSON to OrderRequest
        // - Validated request with @Valid
        // - Started MDC logging context
        
        log.info("Creating order via API");
        
        Order order = orderService.createOrder(request);
        
        // Framework will:
        // - Serialize order to JSON
        // - Set HTTP status 201
        // - Set Content-Type: application/json
        // - Log response
        // - Clean up resources
        
        return order;
    }
    
    @GetMapping("/{id}") // Framework calls this for GET /api/orders/{id}
    public Order getOrder(@PathVariable Long id) {
        // Framework extracted {id} from URL path
        return orderService.getOrder(id);
    }
    
    @ExceptionHandler(OrderNotFoundException.class)
    // Framework calls this when OrderNotFoundException thrown
    public ResponseEntity<ErrorResponse> handleNotFound(OrderNotFoundException e) {
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse(e.getMessage()));
    }
}

// ═══════════════════════════════════════════════════════════
// 7. Aspect (Framework intercepts methods)
// ═══════════════════════════════════════════════════════════

@Aspect
@Component
@Slf4j
public class PerformanceMonitoringAspect {
    
    @Around("@annotation(Timed)") // Framework intercepts @Timed methods
    public Object measureExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.currentTimeMillis();
        
        // Framework lets us call actual method
        Object result = joinPoint.proceed();
        
        long duration = System.currentTimeMillis() - start;
        
        log.info("Method {} executed in {}ms",
            joinPoint.getSignature(),
            duration
        );
        
        return result;
    }
}

// ═══════════════════════════════════════════════════════════
// Summary: What Framework Controls
// ═══════════════════════════════════════════════════════════

// 1. Object creation (all @Component/@Service/@Repository/@Controller)
// 2. Dependency injection (constructor/field/setter)
// 3. Lifecycle management (@PostConstruct, @PreDestroy)
// 4. HTTP request routing (maps URLs to controller methods)
// 5. Request parsing (JSON → Java objects)
// 6. Response serialization (Java objects → JSON)
// 7. Transaction management (@Transactional)
// 8. Cache management (@Cacheable, @CacheEvict)
// 9. Async execution (@Async)
// 10. Event publishing and listening (@EventListener)
// 11. Exception handling (@ExceptionHandler)
// 12. Security (authentication, authorization)
// 13. Logging (with MDC context)
// 14. Metrics collection
// 15. Database connection pooling
// 16. Thread pool management

// YOU control: Business logic only!
// Framework controls: Everything else!
```

---

## ────────────────────────────────────
## 4️⃣ Interview Q&A (Behavioral Questions)
## ────────────────────────────────────

### Q1: "What is Inversion of Control and how is it different from Dependency Injection?"

**Answer:** *"Inversion of Control is design principle where framework controls program flow, calling your code when needed, rather than your code controlling flow by calling framework. Traditional approach: you create objects, call methods, manage lifecycle. IoC approach: framework creates objects, calls your methods, manages lifecycle. 'Don't call us, we'll call you' - Hollywood Principle.*

*Dependency Injection is specific implementation of IoC principle. DI means framework injects dependencies into your classes. IoC is broader—includes any scenario where framework controls flow.*

*Example: Spring MVC controller. You define controller method with @GetMapping. You don't call your method. Framework receives HTTP request, routes to your method, calls it with parsed parameters, serializes your return value. That's IoC—framework controls when and how your code executes.*

*DI is subset of IoC. OrderService with constructor injection—framework injects OrderRepository. That's DI. Framework also calls OrderService methods when HTTP requests arrive. That's IoC. DI is 'how dependencies are provided.' IoC is 'who controls execution.'*

*Real-world: At my company, traditional servlet code: we created objects, opened connections, parsed requests, called business logic, closed connections. Migrated to Spring Boot: framework does all infrastructure work, we just provide business logic with annotations. Reduced code by 60%, eliminated boilerplate, improved maintainability. That's IoC in action."*

### Q2: "How does the Spring IoC container work internally?"

**Answer:** *"Spring IoC container works in six phases:*

*Phase 1: Component scanning. Spring scans classpath for classes with @Component, @Service, @Repository, @Controller annotations. Creates BeanDefinition for each component containing metadata: bean name, class, scope, dependencies, lifecycle callbacks.*

*Phase 2: Dependency resolution. Spring builds dependency graph, determines initialization order via topological sort. Detects circular dependencies—throws BeanCurrentlyInCreationException if found.*

*Phase 3: Bean instantiation. Spring creates beans in dependency order. For each bean: resolves dependencies recursively, calls constructor with dependencies, injects @Autowired fields, calls @PostConstruct method.*

*Phase 4: AOP proxy creation. If bean has @Transactional, @Cacheable, @Async, Spring creates dynamic proxy wrapping original bean. Proxy intercepts method calls, executes cross-cutting concerns.*

*Phase 5: Singleton caching. Spring stores singleton beans in cache. Subsequent requests return cached instance. Prototype beans created fresh each time.*

*Phase 6: Application context ready. Spring publishes ContextRefreshedEvent. Application ready to handle requests.*

*Example: OrderService depends on OrderRepository. Spring creates OrderRepository first (no dependencies), then creates OrderService injecting OrderRepository. If OrderService has @Transactional, Spring creates proxy intercepting createOrder() method, starting transaction before method, committing after.*

*Real-world: Understanding this helped debug production issue. Circular dependency between UserService and AuthService hidden by setter injection. Refactored to constructor injection, Spring detected circular dependency at startup. Fixed by introducing facade breaking cycle."*

### Q3: "When would you NOT use an IoC container?"

**Answer:** *"Five scenarios where IoC container not appropriate:*

*First, simple scripts or utilities. Creating single-purpose script to process CSV file. IoC container adds complexity with no benefit. Plain Java with main() method sufficient. Library code, not framework code.*

*Second, performance-critical systems with low latency requirements. IoC containers use reflection, proxy generation, runtime dependency resolution. High-frequency trading system where microseconds matter—avoid reflection overhead. Use manual dependency injection, compile-time frameworks like Dagger.*

*Third, embedded systems with resource constraints. IoT device with 512KB RAM. Spring Boot application requires 100MB+ heap. Too heavy. Use lightweight alternatives or manual wiring.*

*Fourth, legacy codebases with incompatible architecture. 20-year-old system with singletons, static methods, global state. Refactoring to IoC container requires rewriting entire codebase. Risk too high. Gradual migration via adapter pattern.*

*Fifth, when team lacks expertise. Small team unfamiliar with Spring. Learning curve steep, debugging difficult. More bugs due to misunderstanding framework magic. Better to start simple, add framework when complexity justifies it.*

*Example: Built data processing pipeline processing 1M+ events/second. Initial implementation used Spring Boot. Profiling showed 15% overhead from framework (reflection, AOP proxies). Refactored to plain Java with manual wiring. Latency dropped from 50μs to 42μs—16% improvement. Removed framework, gained performance.*

*IoC containers powerful for complex applications. Overkill for simple use cases. Choose right tool for job."*

### Q4: "Explain how @Transactional works with IoC"

**Answer:** *"@Transactional is perfect example of IoC combined with AOP. You declare intent via annotation, framework handles transaction management. Classic IoC—framework controls transactional behavior.*

*How it works: When Spring creates bean with @Transactional methods, creates dynamic proxy wrapping original bean. Proxy intercepts method calls, executes transaction logic around actual method.*

*Sequence:*
*1. Client calls orderService.createOrder(). Actually calling proxy, not real service.*
*2. Proxy starts transaction via TransactionManager.getTransaction().*
*3. Proxy calls real orderService.createOrder() method.*
*4. Method executes business logic. Any exceptions thrown bubble up.*
*5. If method completes successfully, proxy commits transaction.*
*6. If exception thrown, proxy rolls back transaction.*
*7. Proxy returns result or re-throws exception.*

*Example proxy code (conceptual):*
```java
class OrderService$Proxy {
    private OrderService target;
    private TransactionManager txManager;
    
    public Order createOrder(...) {
        TransactionStatus tx = txManager.getTransaction();
        try {
            Order result = target.createOrder(...);
            txManager.commit(tx);
            return result;
        } catch (Exception e) {
            txManager.rollback(tx);
            throw e;
        }
    }
}
```

*Important constraints: Only works for public methods. Proxy created by Spring, not you. Self-invocation doesn't work—calling @Transactional method from another method in same class bypasses proxy.*

*Real-world: Encountered bug where @Transactional not working. Investigation revealed private method—proxy can't intercept. Made public, worked. Understanding IoC and AOP crucial for debugging Spring behavior.*

*@Transactional demonstrates IoC power: declarative programming, framework handles complexity, you focus on business logic."*

### Q5: "What are the downsides of IoC frameworks?"

**Answer:** *"Six downsides of IoC frameworks based on production experience:*

*First, steep learning curve. Spring has 200+ annotations, complex configuration options, XML vs Java config vs annotation-driven. New developers struggle for months. Magic behavior hard to understand—'How does @Autowired find the right bean?' Need to understand component scanning, bean resolution, proxy creation.*

*Second, debugging difficulty. Framework controls flow, uses reflection and proxies. Stack traces show framework code, not your code. @Transactional doesn't work—why? Proxy not created? Self-invocation? Private method? Hard to diagnose.*

*Third, runtime errors. Field injection compiles fine, fails at runtime if bean missing. Constructor injection fails at startup—better, but still runtime. Compare to compile-time DI like Dagger—dependency errors caught at compile time.*

*Fourth, performance overhead. Reflection for dependency injection, dynamic proxy for AOP, component scanning at startup. Small overhead per operation, adds up at scale. Benchmarked Spring Boot app: 100μs per request just for framework overhead.*

*Fifth, tight coupling to framework. Code littered with @Autowired, @Transactional, @Service. Hard to use without Spring. Want to extract library—must remove all Spring dependencies. Spring becomes part of your API.*

*Sixth, hidden complexity. @Transactional seems simple, hides transaction propagation rules, isolation levels, rollback rules. Developers use without understanding. Production bugs due to REQUIRES_NEW propagation or checked exceptions not rolling back.*

*Real example: Microservice with 5-second startup time. 90% spent in Spring component scanning, bean creation, proxy generation. Optimization: moved to compile-time DI (Dagger), startup dropped to 500ms. 10x improvement.*

*IoC frameworks powerful for complex applications. Downsides: complexity, learning curve, debugging difficulty, performance overhead. Trade-off—convenience vs control. Choose wisely based on team expertise and system requirements."*

### Q6: "How do you test code that uses an IoC container?"

**Answer:** *"Three testing strategies for IoC-based code:*

*Strategy 1: Unit tests WITHOUT IoC container (preferred). Constructor injection enables creating objects directly with mock dependencies. No Spring, no framework, fast tests.*
```java
@Test
void testCreateOrder() {
    // Create mocks
    OrderRepository mockRepo = mock(OrderRepository.class);
    PaymentGateway mockGateway = mock(PaymentGateway.class);
    
    // Create service directly
    OrderService service = new OrderService(mockRepo, mockGateway);
    
    // Configure mocks
    when(mockGateway.charge(any(), any()))
        .thenReturn(PaymentResult.success("txn-123"));
    
    // Test
    Order order = service.createOrder(request);
    
    // Verify
    verify(mockRepo).save(any(Order.class));
}
```
*No @SpringBootTest, no container startup. Tests run in milliseconds. 1000 unit tests execute in 5 seconds.*

*Strategy 2: Integration tests WITH IoC container. Testing controller-to-database flow, need Spring context. Use @SpringBootTest to start full application context.*
```java
@SpringBootTest
@AutoConfigureMockMvc
class OrderControllerIntegrationTest {
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean // Spring replaces real PaymentGateway with mock
    private PaymentGateway paymentGateway;
    
    @Test
    void testCreateOrderEndpoint() throws Exception {
        when(paymentGateway.charge(any(), any()))
            .thenReturn(PaymentResult.success("txn-123"));
        
        mockMvc.perform(post("/api/orders")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"customerId\":\"cust-1\"}"))
            .andExpect(status().isCreated());
    }
}
```
*Slow—Spring context startup takes 2-5 seconds. Run fewer integration tests, more unit tests.*

*Strategy 3: Slice tests for specific layers. @WebMvcTest for controllers only, @DataJpaTest for repositories only. Faster than full @SpringBootTest.*
```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private OrderService orderService; // Mock service layer
    
    @Test
    void testGetOrder() throws Exception {
        when(orderService.getOrder(1L))
            .thenReturn(new Order(1L, "cust-1"));
        
        mockMvc.perform(get("/api/orders/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1));
    }
}
```

*Testing pyramid: 70% unit tests (no container), 20% integration tests (full container), 10% E2E tests. Unit tests fast and focused. Integration tests verify components work together. E2E tests validate full system.*

*Real-world: Inherited codebase with only integration tests. 500 tests taking 45 minutes. Refactored to constructor injection, wrote unit tests. New test suite: 4500 unit tests (2 minutes) + 500 integration tests (10 minutes). Better coverage, faster feedback. Constructor injection and IoC understanding enabled this."*

---

## 🔟 Why & How Summary

### Why Inversion of Control Matters

**Simplifies Development:**
- Framework handles infrastructure
- Focus on business logic only
- Reduced boilerplate
- Faster development

**Improves Maintainability:**
- Loose coupling via DI
- Declarative programming
- Separation of concerns
- Easy to modify and extend

**Enables Testability:**
- Mock dependencies easily
- Unit test without framework
- Integration test with framework
- Better test coverage

**Provides Flexibility:**
- Configuration-driven behavior
- Plugin architectures
- Change implementations easily
- Environment-specific configs

### How Inversion of Control Works

**Framework Takes Control:**
```java
// You provide implementations
@Service
public class OrderService {
    // Business logic
}

@RestController
public class OrderController {
    // HTTP endpoints
}

// Framework:
// - Creates objects
// - Injects dependencies
// - Routes requests
// - Manages lifecycle
// - Handles transactions
// - Controls execution
```

**You Configure Behavior:**
```java
// Annotations declare intent
@Transactional // Framework manages transactions
@Cacheable // Framework manages caching
@Async // Framework manages threading
@EventListener // Framework calls on events

// Properties configure framework
spring.datasource.url=jdbc:postgresql://localhost/db
server.port=8080
```

### Best Practices

1. **Use constructor injection** (testable, immutable)
2. **Understand framework behavior** (not magic)
3. **Unit test without framework** (fast, focused)
4. **Integration test with framework** (verify wiring)
5. **Keep business logic framework-agnostic** (portable)

### Interview Red Flags

🚫 "IoC is the same as DI"
✅ "DI is one implementation of IoC principle"

🚫 "Spring does magic"
✅ "Spring uses reflection, proxies, and lifecycle management"

🚫 "Always use @SpringBootTest for testing"
✅ "Unit test without framework, integration test with framework"

### Final Sound Bite

*"Inversion of Control means framework controls program execution, calling your code when needed. Traditional approach: you create objects, call methods, manage lifecycle. IoC approach: framework creates objects, calls your methods, manages lifecycle. 'Don't call us, we'll call you.'*

*Spring example: Define @RestController method. You don't call your method. Framework receives HTTP request, routes to your method, calls it with parsed parameters, serializes return value. Framework controls flow—that's IoC.*

*Dependency Injection is specific IoC implementation—framework injects dependencies. IoC broader principle—framework controls any aspect of execution.*

*Benefits: simplified development (framework handles infrastructure), improved testability (inject mocks), better maintainability (declarative programming), flexibility (configuration-driven).*

*Downsides: steep learning curve, debugging difficulty, performance overhead, tight coupling to framework. Trade-off—convenience vs control.*

*Testing: unit tests WITHOUT framework (fast, use constructor injection with mocks), integration tests WITH framework (slow, verify full stack). 70% unit tests, 20% integration tests, 10% E2E tests.*

*IoC powerful for complex applications with cross-cutting concerns. Framework handles transactions, caching, security, threading. You handle business logic. Clear separation of concerns—foundation of modern frameworks."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
