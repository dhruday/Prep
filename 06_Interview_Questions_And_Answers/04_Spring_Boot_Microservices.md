# ☕ Spring Boot & Microservices - FAANG Level

> **Target:** Senior Backend Engineer (7+ YOE)  
> **Focus:** Production-grade microservices, Spring internals, distributed systems  
> **Companies:** All FAANG companies use similar patterns (not necessarily Spring, but concepts apply)

---

## 📋 Table of Contents

1. [Spring Core Internals](#spring-core)
2. [Spring Boot Deep Dive](#spring-boot)
3. [Microservices Architecture](#microservices)
4. [Communication Patterns](#communication)
5. [Data Management](#data-management)
6. [Security](#security)
7. [Observability](#observability)
8. [Production Scenarios](#production)
9. [FAANG Interview Questions](#interview-questions)

---

## 🌱 Spring Core Internals

### IoC Container & Dependency Injection

**How Spring IoC Works:**

```java
// Application startup flow:
1. SpringApplication.run(Application.class, args);
2. Create ApplicationContext
3. Scan for @Component, @Service, @Repository, @Controller
4. Create BeanDefinitions
5. Instantiate beans
6. Inject dependencies
7. Call @PostConstruct methods
8. Application ready

// Behind the scenes:
ApplicationContext context = new AnnotationConfigApplicationContext(AppConfig.class);

// BeanFactory (parent interface)
BeanFactory
   ↓
ApplicationContext (adds more features)
   ├── Event publishing
   ├── Internationalization
   ├── Resource loading
   └── Multiple context hierarchies
```

**Bean Lifecycle:**

```java
public class MyBean implements InitializingBean, DisposableBean {
    
    // 1. Constructor
    public MyBean() {
        System.out.println("1. Constructor called");
    }
    
    // 2. Setter injection
    @Autowired
    public void setDependency(SomeDependency dependency) {
        System.out.println("2. Dependencies injected");
    }
    
    // 3. BeanNameAware
    @Override
    public void setBeanName(String name) {
        System.out.println("3. Bean name set: " + name);
    }
    
    // 4. BeanFactoryAware
    @Override
    public void setBeanFactory(BeanFactory beanFactory) {
        System.out.println("4. BeanFactory set");
    }
    
    // 5. ApplicationContextAware
    @Override
    public void setApplicationContext(ApplicationContext ctx) {
        System.out.println("5. ApplicationContext set");
    }
    
    // 6. @PostConstruct
    @PostConstruct
    public void init() {
        System.out.println("6. @PostConstruct called");
    }
    
    // 7. InitializingBean.afterPropertiesSet()
    @Override
    public void afterPropertiesSet() {
        System.out.println("7. afterPropertiesSet called");
    }
    
    // 8. Custom init method
    public void customInit() {
        System.out.println("8. Custom init method");
    }
    
    // Bean is ready for use
    
    // 9. @PreDestroy
    @PreDestroy
    public void cleanup() {
        System.out.println("9. @PreDestroy called");
    }
    
    // 10. DisposableBean.destroy()
    @Override
    public void destroy() {
        System.out.println("10. destroy called");
    }
}

// Configuration:
@Bean(initMethod = "customInit", destroyMethod = "customDestroy")
public MyBean myBean() {
    return new MyBean();
}
```

**Output:**
```
1. Constructor called
2. Dependencies injected
3. Bean name set: myBean
4. BeanFactory set
5. ApplicationContext set
6. @PostConstruct called
7. afterPropertiesSet called
8. Custom init method
[Bean ready]
9. @PreDestroy called
10. destroy called
```

---

### Bean Scopes

```java
// 1. Singleton (default) - One instance per Spring container
@Component
@Scope("singleton")  // or @Scope(ConfigurableBeanFactory.SCOPE_SINGLETON)
public class SingletonBean {
    // Shared across entire application
    // NOT thread-safe by default!
}

// 2. Prototype - New instance every time
@Component
@Scope("prototype")
public class PrototypeBean {
    // New instance on every getBean() or @Autowired injection
}

// 3. Request (Web) - One per HTTP request
@Component
@Scope(WebApplicationContext.SCOPE_REQUEST)
public class RequestScopedBean {
    // New instance for each HTTP request
}

// 4. Session (Web) - One per HTTP session
@Component
@Scope(WebApplicationContext.SCOPE_SESSION)
public class SessionScopedBean {
    // Shared within user session
}

// 5. Application (Web) - One per ServletContext
@Component
@Scope(WebApplicationContext.SCOPE_APPLICATION)
public class ApplicationScopedBean {
    // One instance for entire web application
}

// 6. Custom scope
public class TenantScope implements Scope {
    private Map<String, Object> scopedObjects = new ConcurrentHashMap<>();
    
    @Override
    public Object get(String name, ObjectFactory<?> objectFactory) {
        String tenantId = TenantContext.getCurrentTenant();
        String key = tenantId + ":" + name;
        
        return scopedObjects.computeIfAbsent(key, 
            k -> objectFactory.getObject());
    }
    
    // implement other methods...
}

// Register custom scope
@Configuration
public class ScopeConfig implements BeanFactoryPostProcessor {
    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory factory) {
        factory.registerScope("tenant", new TenantScope());
    }
}

@Component
@Scope("tenant")
public class TenantScopedBean {
    // One instance per tenant
}
```

---

### Proxy Mechanisms

**When Spring creates proxies:**

1. `@Transactional`
2. `@Cacheable`
3. `@Async`
4. `@Scheduled`
5. AOP aspects

**JDK Dynamic Proxy vs CGLIB:**

```java
// JDK Dynamic Proxy (interface-based)
public interface UserService {
    User findById(Long id);
}

@Service
public class UserServiceImpl implements UserService {
    @Override
    @Transactional  // Proxy created via JDK Dynamic Proxy
    public User findById(Long id) {
        return userRepository.findById(id);
    }
}

// Generated proxy:
public class UserServiceProxy implements UserService {
    private UserService target;
    private TransactionManager txManager;
    
    @Override
    public User findById(Long id) {
        // Before method
        txManager.begin();
        
        try {
            User result = target.findById(id);
            txManager.commit();
            return result;
        } catch (Exception e) {
            txManager.rollback();
            throw e;
        }
    }
}

// CGLIB (class-based, when no interface)
@Service
public class UserService {  // No interface
    @Transactional
    public User findById(Long id) {
        return userRepository.findById(id);
    }
}

// Generated proxy (subclass):
public class UserService$$EnhancerBySpringCGLIB$$12345 extends UserService {
    @Override
    public User findById(Long id) {
        // Transaction logic
        return super.findById(id);
    }
}
```

**Proxy Pitfalls:**

```java
@Service
public class UserService {
    
    @Transactional
    public void createUser(User user) {
        save(user);
        sendEmail(user);  // ❌ @Transactional on sendEmail won't work!
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendEmail(User user) {
        // This runs in SAME transaction as createUser!
        // Because 'this.sendEmail()' bypasses proxy
    }
}

// Fix 1: Use self-injection
@Service
public class UserService {
    @Autowired
    private UserService self;  // Proxy injected
    
    @Transactional
    public void createUser(User user) {
        save(user);
        self.sendEmail(user);  // ✅ Goes through proxy
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendEmail(User user) {
        // Now runs in NEW transaction
    }
}

// Fix 2: Use @Lazy
@Service
public class UserService {
    private final UserService self;
    
    public UserService(@Lazy UserService self) {
        this.self = self;
    }
}

// Fix 3: Separate into different beans
@Service
public class UserService {
    @Autowired
    private EmailService emailService;
    
    @Transactional
    public void createUser(User user) {
        save(user);
        emailService.sendEmail(user);  // ✅ Different bean
    }
}

@Service
public class EmailService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendEmail(User user) {
        // Runs in NEW transaction
    }
}
```

---

## 🚀 Spring Boot Deep Dive

### Auto-Configuration

**How it works:**

```java
// 1. @SpringBootApplication breakdown
@SpringBootApplication
= @Configuration          // Marks as configuration class
+ @EnableAutoConfiguration // Enables auto-configuration
+ @ComponentScan          // Scans current package and sub-packages

// 2. @EnableAutoConfiguration
@Import(AutoConfigurationImportSelector.class)
public @interface EnableAutoConfiguration {
}

// 3. AutoConfigurationImportSelector
// Reads META-INF/spring.factories
// Loads all *AutoConfiguration classes

// Example: DataSourceAutoConfiguration
@Configuration
@ConditionalOnClass(DataSource.class)  // Only if class exists
@ConditionalOnMissingBean(DataSource.class)  // Only if no user-defined bean
public class DataSourceAutoConfiguration {
    
    @Bean
    @ConfigurationProperties("spring.datasource")
    public DataSource dataSource() {
        return DataSourceBuilder.create().build();
    }
}

// If you define your own DataSource:
@Configuration
public class MyConfig {
    @Bean
    public DataSource dataSource() {
        // Your custom DataSource
    }
}
// → DataSourceAutoConfiguration is skipped
```

**Conditional Annotations:**

```java
// 1. @ConditionalOnClass
@Configuration
@ConditionalOnClass(name = "org.springframework.data.redis.core.RedisTemplate")
public class RedisAutoConfiguration {
    // Only loaded if Redis is on classpath
}

// 2. @ConditionalOnMissingClass
@ConditionalOnMissingClass("com.example.CustomService")
public class DefaultServiceConfiguration {
}

// 3. @ConditionalOnBean
@Bean
@ConditionalOnBean(DataSource.class)
public JdbcTemplate jdbcTemplate(DataSource dataSource) {
    return new JdbcTemplate(dataSource);
}

// 4. @ConditionalOnMissingBean
@Bean
@ConditionalOnMissingBean
public ObjectMapper objectMapper() {
    return new ObjectMapper();
}

// 5. @ConditionalOnProperty
@Configuration
@ConditionalOnProperty(
    name = "feature.enabled",
    havingValue = "true",
    matchIfMissing = false
)
public class FeatureConfiguration {
}

// 6. @ConditionalOnExpression
@Bean
@ConditionalOnExpression("${feature.enabled:false} and ${env} == 'prod'")
public FeatureService featureService() {
    return new FeatureService();
}

// 7. Custom condition
public class OnDatabaseCondition implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        String dbType = context.getEnvironment().getProperty("database.type");
        return "postgres".equals(dbType);
    }
}

@Configuration
@Conditional(OnDatabaseCondition.class)
public class PostgresConfiguration {
}
```

---

### Configuration Properties

```java
// application.yml
app:
  name: My Application
  version: 1.0.0
  features:
    feature1: true
    feature2: false
  database:
    url: jdbc:postgresql://localhost:5432/mydb
    username: admin
    pool:
      max-size: 20
      min-idle: 5

// Configuration class
@ConfigurationProperties(prefix = "app")
@Validated
public class AppProperties {
    
    @NotBlank
    private String name;
    
    @Pattern(regexp = "\\d+\\.\\d+\\.\\d+")
    private String version;
    
    private Map<String, Boolean> features;
    
    @Valid
    private Database database;
    
    // Getters and setters
    
    @Data
    public static class Database {
        @NotBlank
        private String url;
        
        @NotBlank
        private String username;
        
        @Valid
        private Pool pool;
        
        @Data
        public static class Pool {
            @Min(1)
            private int maxSize;
            
            @Min(0)
            private int minIdle;
        }
    }
}

// Enable configuration properties
@Configuration
@EnableConfigurationProperties(AppProperties.class)
public class AppConfig {
}

// Usage
@Service
public class MyService {
    private final AppProperties appProperties;
    
    public MyService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }
    
    public void doSomething() {
        String appName = appProperties.getName();
        int maxPoolSize = appProperties.getDatabase().getPool().getMaxSize();
    }
}

// Validation errors at startup if invalid configuration
// org.springframework.boot.context.properties.bind.validation.BindValidationException
```

---

### Actuator Internals

```java
// Built-in endpoints
/actuator/health      - Health status
/actuator/metrics     - Application metrics
/actuator/info        - Application info
/actuator/env         - Environment properties
/actuator/loggers     - Logger configuration
/actuator/threaddump  - Thread dump
/actuator/heapdump    - Heap dump

// Custom health indicator
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    @Autowired
    private DataSource dataSource;
    
    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(1)) {
                return Health.up()
                    .withDetail("database", "PostgreSQL")
                    .withDetail("validationQuery", "SELECT 1")
                    .build();
            }
        } catch (SQLException e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
        
        return Health.down().build();
    }
}

// Custom metric
@Service
public class OrderService {
    private final MeterRegistry meterRegistry;
    private final Counter orderCounter;
    
    public OrderService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.orderCounter = Counter.builder("orders.created")
            .description("Total orders created")
            .tag("type", "online")
            .register(meterRegistry);
    }
    
    public void createOrder(Order order) {
        // Business logic
        orderCounter.increment();
        
        // Gauge (current value)
        meterRegistry.gauge("orders.pending", pendingOrders.size());
        
        // Timer (latency)
        Timer.Sample sample = Timer.start(meterRegistry);
        try {
            processOrder(order);
        } finally {
            sample.stop(Timer.builder("orders.process.time").register(meterRegistry));
        }
    }
}

// Custom endpoint
@Endpoint(id = "custom")
@Component
public class CustomEndpoint {
    
    @ReadOperation
    public Map<String, Object> customInfo() {
        return Map.of(
            "timestamp", System.currentTimeMillis(),
            "uptime", getUptime(),
            "custom-metric", calculateMetric()
        );
    }
    
    @WriteOperation
    public void triggerAction(@Selector String action) {
        // POST /actuator/custom/{action}
        if ("reset".equals(action)) {
            resetMetrics();
        }
    }
}

// Security
@Configuration
public class ActuatorSecurityConfig extends WebSecurityConfigurerAdapter {
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .requestMatcher(EndpointRequest.toAnyEndpoint())
            .authorizeRequests()
                .requestMatchers(EndpointRequest.to("health", "info")).permitAll()
                .anyRequest().hasRole("ADMIN")
            .and()
            .httpBasic();
    }
}
```

---

## 🏗️ Microservices Architecture

### When to Use Microservices

**✅ Good fit:**
```
1. Large team (>30 engineers)
   - Multiple teams can work independently
   - Clear ownership boundaries
   
2. Need for independent scaling
   - Different services have different load patterns
   - Example: Image service needs more CPU, search needs more memory
   
3. Polyglot requirements
   - Payment service in Java (strong typing, security)
   - Recommendation in Python (ML libraries)
   - Real-time chat in Node.js (async I/O)
   
4. Different release cycles
   - Critical payment service: monthly releases
   - Experimental features: daily releases
   
5. Clear bounded contexts
   - E-commerce: Order, Payment, Inventory, Shipping
   - Each domain has clear boundaries
```

**❌ Bad fit:**
```
1. Small team (<10 engineers)
   - Overhead of distributed system too high
   - Start with modular monolith
   
2. Unclear domain boundaries
   - Premature splitting leads to distributed monolith
   - Wait until boundaries emerge
   
3. Tight coupling
   - If services constantly change together
   - Should be single service
   
4. No DevOps capability
   - Need automation for deployment, monitoring
   - Requires mature infrastructure
```

---

### Service Decomposition Strategies

**1. By Business Capability (DDD)**

```
E-commerce domain:

┌─────────────────────────────────────┐
│         E-commerce Platform          │
└─────────────────────────────────────┘
    ↓         ↓         ↓         ↓
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Product │ │ Order  │ │Payment │ │Shipping│
│Service │ │Service │ │Service │ │Service │
└────────┘ └────────┘ └────────┘ └────────┘

Each service:
- Owns its data
- Has its own database
- Exposes APIs
- Can be deployed independently
```

**2. By Subdomain (Strategic DDD)**

```
Core Domain (competitive advantage):
- Recommendation Engine
- Fraud Detection

Supporting Domain (necessary but not differentiating):
- User Management
- Notifications

Generic Domain (off-the-shelf solutions):
- Payment Processing (Stripe)
- Email Service (SendGrid)
```

**3. Strangler Fig Pattern (Migration from Monolith)**

```
Phase 1: Monolith
┌──────────────────┐
│                  │
│    Monolith      │
│                  │
└──────────────────┘

Phase 2: Extract Payment Service
┌──────────────────┐    ┌────────┐
│                  │────│Payment │
│  Monolith (minus│    │Service │
│    payment)      │    └────────┘
└──────────────────┘

Phase 3: Extract Order Service
┌──────────────────┐    ┌────────┐
│                  │────│Payment │
│  Monolith (minus│    │Service │
│ payment, order)  │    └────────┘
└──────────────────┘    ┌────────┐
                   ────│ Order  │
                       │Service │
                       └────────┘

Phase 4: Eventually
┌────────┐  ┌────────┐  ┌────────┐
│Product │  │ Order  │  │Payment │
│Service │  │Service │  │Service │
└────────┘  └────────┘  └────────┘
```

---

### Communication Patterns

#### 1. Synchronous (REST)

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final PaymentServiceClient paymentClient;
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) {
        // 1. Validate order
        Order order = validateAndCreate(request);
        
        // 2. Call Payment Service (synchronous)
        try {
            PaymentResponse payment = paymentClient.processPayment(
                new PaymentRequest(order.getTotalAmount(), order.getUserId())
            );
            
            if (payment.isSuccess()) {
                order.setStatus(OrderStatus.PAID);
                orderRepository.save(order);
                return ResponseEntity.ok(new OrderResponse(order));
            } else {
                order.setStatus(OrderStatus.PAYMENT_FAILED);
                orderRepository.save(order);
                return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                    .body(new OrderResponse(order));
            }
        } catch (FeignException e) {
            // Payment service down
            order.setStatus(OrderStatus.PENDING);
            orderRepository.save(order);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new OrderResponse(order));
        }
    }
}

// Feign client (declarative REST client)
@FeignClient(
    name = "payment-service",
    url = "${services.payment.url}",
    fallbackFactory = PaymentServiceFallbackFactory.class
)
public interface PaymentServiceClient {
    @PostMapping("/api/payments")
    PaymentResponse processPayment(@RequestBody PaymentRequest request);
}

// Circuit breaker with Resilience4j
@CircuitBreaker(name = "payment-service", fallbackMethod = "paymentFallback")
public PaymentResponse processPayment(PaymentRequest request) {
    return paymentClient.processPayment(request);
}

public PaymentResponse paymentFallback(PaymentRequest request, Exception e) {
    // Fallback logic
    return new PaymentResponse(false, "Service temporarily unavailable");
}

// Configuration
resilience4j:
  circuitbreaker:
    instances:
      payment-service:
        slidingWindowSize: 10
        minimumNumberOfCalls: 5
        failureRateThreshold: 50
        waitDurationInOpenState: 10s
        permittedNumberOfCallsInHalfOpenState: 3
```

**Pros:**
- Simple to understand
- Immediate response
- Easy debugging (call stack)

**Cons:**
- Tight coupling (caller waits for response)
- Cascading failures
- Lower availability (if downstream service down)

---

#### 2. Asynchronous (Message Queue)

```java
// Order Service (Producer)
@Service
public class OrderService {
    private final KafkaTemplate<String, OrderCreatedEvent> kafkaTemplate;
    
    public void createOrder(OrderRequest request) {
        // 1. Create order
        Order order = new Order(request);
        order.setStatus(OrderStatus.PENDING_PAYMENT);
        orderRepository.save(order);
        
        // 2. Publish event (fire and forget)
        OrderCreatedEvent event = new OrderCreatedEvent(
            order.getId(),
            order.getUserId(),
            order.getTotalAmount()
        );
        
        kafkaTemplate.send("order-created", order.getId(), event);
        
        // 3. Return immediately (don't wait for payment)
    }
}

// Payment Service (Consumer)
@Service
public class PaymentEventHandler {
    
    @KafkaListener(topics = "order-created", groupId = "payment-service")
    public void handleOrderCreated(OrderCreatedEvent event) {
        try {
            // Process payment
            PaymentResult result = processPayment(
                event.getUserId(), 
                event.getAmount()
            );
            
            // Publish result
            if (result.isSuccess()) {
                kafkaTemplate.send("payment-completed", 
                    new PaymentCompletedEvent(event.getOrderId()));
            } else {
                kafkaTemplate.send("payment-failed",
                    new PaymentFailedEvent(event.getOrderId(), result.getReason()));
            }
        } catch (Exception e) {
            // Kafka will retry automatically
            log.error("Payment processing failed", e);
            throw e;  // Triggers retry
        }
    }
}

// Order Service listens for payment events
@Service
public class OrderEventHandler {
    
    @KafkaListener(topics = "payment-completed", groupId = "order-service")
    public void handlePaymentCompleted(PaymentCompletedEvent event) {
        Order order = orderRepository.findById(event.getOrderId());
        order.setStatus(OrderStatus.PAID);
        orderRepository.save(order);
        
        // Trigger next step (e.g., shipping)
        kafkaTemplate.send("order-ready-for-shipping", 
            new OrderReadyEvent(order.getId()));
    }
    
    @KafkaListener(topics = "payment-failed", groupId = "order-service")
    public void handlePaymentFailed(PaymentFailedEvent event) {
        Order order = orderRepository.findById(event.getOrderId());
        order.setStatus(OrderStatus.PAYMENT_FAILED);
        orderRepository.save(order);
    }
}

// Kafka configuration
@Configuration
public class KafkaConfig {
    @Bean
    public NewTopic orderCreatedTopic() {
        return TopicBuilder.name("order-created")
            .partitions(10)  // Parallel processing
            .replicas(3)     // Fault tolerance
            .config(TopicConfig.RETENTION_MS_CONFIG, "86400000")  // 1 day
            .build();
    }
    
    @Bean
    public ProducerFactory<String, Object> producerFactory() {
        Map<String, Object> config = new HashMap<>();
        config.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        config.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        config.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        config.put(ProducerConfig.ACKS_CONFIG, "all");  // Wait for all replicas
        config.put(ProducerConfig.RETRIES_CONFIG, 3);
        config.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);  // Exactly-once
        return new DefaultKafkaProducerFactory<>(config);
    }
}
```

**Pros:**
- Loose coupling
- Better availability (async, no waiting)
- Natural load leveling (queue buffers spikes)

**Cons:**
- Eventual consistency
- Complex debugging (no call stack)
- Need message ordering guarantees

---

### Saga Pattern (Distributed Transactions)

**Problem:** How to maintain data consistency across services without 2PC?

**Choreography Saga (Event-driven):**

```java
// Order created → Payment → Inventory → Shipping

// 1. Order Service
@Service
public class OrderService {
    public void createOrder(OrderRequest request) {
        Order order = new Order(request);
        order.setStatus(OrderStatus.PENDING);
        orderRepository.save(order);
        
        // Publish event
        eventPublisher.publish(new OrderCreatedEvent(order));
    }
    
    @EventListener
    public void onInventoryReserved(InventoryReservedEvent event) {
        Order order = orderRepository.findById(event.getOrderId());
        order.setStatus(OrderStatus.INVENTORY_RESERVED);
        orderRepository.save(order);
    }
    
    @EventListener
    public void onInventoryReservationFailed(InventoryReservationFailedEvent event) {
        Order order = orderRepository.findById(event.getOrderId());
        order.setStatus(OrderStatus.FAILED);
        orderRepository.save(order);
        
        // Trigger compensation
        eventPublisher.publish(new CancelPaymentEvent(order.getPaymentId()));
    }
}

// 2. Payment Service
@Service
public class PaymentService {
    @EventListener
    public void onOrderCreated(OrderCreatedEvent event) {
        try {
            Payment payment = processPayment(event);
            paymentRepository.save(payment);
            
            eventPublisher.publish(new PaymentCompletedEvent(
                event.getOrderId(), payment.getId()
            ));
        } catch (PaymentException e) {
            eventPublisher.publish(new PaymentFailedEvent(event.getOrderId()));
        }
    }
    
    @EventListener
    public void onCancelPayment(CancelPaymentEvent event) {
        // Compensation: Refund payment
        Payment payment = paymentRepository.findById(event.getPaymentId());
        refundPayment(payment);
    }
}

// 3. Inventory Service
@Service
public class InventoryService {
    @EventListener
    public void onPaymentCompleted(PaymentCompletedEvent event) {
        try {
            reserveInventory(event.getOrderId());
            eventPublisher.publish(new InventoryReservedEvent(event.getOrderId()));
        } catch (OutOfStockException e) {
            eventPublisher.publish(new InventoryReservationFailedEvent(
                event.getOrderId()
            ));
        }
    }
}
```

**Orchestration Saga (Centralized):**

```java
// Saga Orchestrator
@Service
public class OrderSagaOrchestrator {
    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    private final ShippingService shippingService;
    
    public void executeOrderSaga(Order order) {
        SagaState state = new SagaState(order.getId());
        
        try {
            // Step 1: Process payment
            PaymentResult paymentResult = paymentService.processPayment(order);
            state.setPaymentId(paymentResult.getPaymentId());
            
            // Step 2: Reserve inventory
            InventoryResult inventoryResult = inventoryService.reserveInventory(order);
            state.setReservationId(inventoryResult.getReservationId());
            
            // Step 3: Create shipment
            ShipmentResult shipmentResult = shippingService.createShipment(order);
            state.setShipmentId(shipmentResult.getShipmentId());
            
            // Success!
            order.setStatus(OrderStatus.COMPLETED);
            
        } catch (PaymentException e) {
            // No compensation needed (first step failed)
            order.setStatus(OrderStatus.PAYMENT_FAILED);
            
        } catch (InventoryException e) {
            // Compensate: Refund payment
            paymentService.refund(state.getPaymentId());
            order.setStatus(OrderStatus.OUT_OF_STOCK);
            
        } catch (ShippingException e) {
            // Compensate: Release inventory, refund payment
            inventoryService.releaseReservation(state.getReservationId());
            paymentService.refund(state.getPaymentId());
            order.setStatus(OrderStatus.SHIPPING_FAILED);
        }
        
        orderRepository.save(order);
    }
}

// Framework: Camunda, Temporal.io, or custom state machine
@Service
public class OrderSagaStateMachine {
    
    public void execute(Order order) {
        StateMachine<OrderState, OrderEvent> stateMachine = buildStateMachine(order);
        
        stateMachine.start();
        stateMachine.sendEvent(OrderEvent.PAYMENT_REQUESTED);
        
        // State machine handles transitions and compensations
    }
    
    private StateMachine<OrderState, OrderEvent> buildStateMachine(Order order) {
        return StateMachineBuilder.builder()
            .state(OrderState.PAYMENT_PENDING)
                .on(OrderEvent.PAYMENT_COMPLETED).transitionTo(OrderState.INVENTORY_PENDING)
                .on(OrderEvent.PAYMENT_FAILED).transitionTo(OrderState.FAILED)
            
            .state(OrderState.INVENTORY_PENDING)
                .on(OrderEvent.INVENTORY_RESERVED).transitionTo(OrderState.SHIPPING_PENDING)
                .on(OrderEvent.INVENTORY_FAILED).compensate(this::refundPayment)
                                                .transitionTo(OrderState.FAILED)
            .build();
    }
}
```

**Choreography vs Orchestration:**

| Choreography | Orchestration |
|-------------|---------------|
| Decentralized | Centralized |
| Event-driven | Command-driven |
| Each service knows what to do | Orchestrator controls flow |
| Harder to track | Easy to track |
| No single point of failure | Orchestrator is SPOF |
| Best for simple sagas | Best for complex sagas |

---

## 🔒 Security

### JWT Authentication

```java
// JWT Token structure:
// Header.Payload.Signature
// eyJhbGc...eyJzdWI...SflKxw

// JWT Service
@Service
public class JwtService {
    @Value("${jwt.secret}")
    private String secret;
    
    @Value("${jwt.expiration}")
    private long expiration;
    
    public String generateToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("email", user.getEmail());
        claims.put("roles", user.getRoles());
        
        return Jwts.builder()
            .setClaims(claims)
            .setSubject(user.getUsername())
            .setIssuedAt(new Date())
            .setExpiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(SignatureAlgorithm.HS512, secret)
            .compact();
    }
    
    public Claims extractClaims(String token) {
        return Jwts.parser()
            .setSigningKey(secret)
            .parseClaimsJws(token)
            .getBody();
    }
    
    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractClaims(token);
            return !claims.getExpiration().before(new Date());
        } catch (JwtException e) {
            return false;
        }
    }
}

// JWT Filter
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Autowired
    private JwtService jwtService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response,
                                   FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            if (jwtService.isTokenValid(token)) {
                Claims claims = jwtService.extractClaims(token);
                String username = claims.getSubject();
                List<String> roles = claims.get("roles", List.class);
                
                // Set authentication in SecurityContext
                UsernamePasswordAuthenticationToken auth = 
                    new UsernamePasswordAuthenticationToken(
                        username, null, 
                        roles.stream()
                             .map(SimpleGrantedAuthority::new)
                             .collect(Collectors.toList())
                    );
                
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}

// Security Configuration
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    @Autowired
    private JwtAuthenticationFilter jwtFilter;
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .sessionManagement()
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .authorizeRequests()
                .antMatchers("/api/auth/**").permitAll()
                .antMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            .and()
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    }
}
```

---

## 📊 Production Scenarios

### Memory Leak Debugging

**Scenario:** Application memory keeps growing, eventually OutOfMemoryError.

**Investigation:**

```bash
# 1. Monitor heap usage
jstat -gc <PID> 1000

# Old Generation keeps growing:
 S0C    S1C    S0U    S1U      EC       EU        OC         OU       MC     MU
 0.0   1024.0  0.0   1024.0  8192.0   4096.0   20480.0    15000.0  4864.0 4500.0
 0.0   1024.0  0.0   1024.0  8192.0   5000.0   20480.0    16000.0  4864.0 4500.0
 0.0   1024.0  0.0   1024.0  8192.0   6000.0   20480.0    17000.0  4864.0 4500.0
# OU (Old Gen Used) keeps growing → Memory leak

# 2. Heap dump
jmap -dump:live,format=b,file=heap.hprof <PID>

# 3. Analyze with Eclipse MAT
# → Find "Leak Suspects"
# → Common culprits:
#    - ThreadLocal not cleaned
#    - Static collections growing
#    - Event listeners not unregistered
```

**Common fix:**

```java
// Before (memory leak)
@Component
public class RequestContext {
    private static ThreadLocal<User> currentUser = new ThreadLocal<>();
    
    public static void setUser(User user) {
        currentUser.set(user);
    }
}

// Filter
public class UserFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(...) {
        User user = authenticateUser(request);
        RequestContext.setUser(user);
        
        filterChain.doFilter(request, response);
        // ThreadLocal not cleared!
        // Tomcat reuses threads → memory leak
    }
}

// After (fixed)
public class UserFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(...) {
        try {
            User user = authenticateUser(request);
            RequestContext.setUser(user);
            filterChain.doFilter(request, response);
        } finally {
            RequestContext.clear();  // ✅ Always cleanup
        }
    }
}

@Component
public class RequestContext {
    private static ThreadLocal<User> currentUser = new ThreadLocal<>();
    
    public static void setUser(User user) {
        currentUser.set(user);
    }
    
    public static void clear() {
        currentUser.remove();  // ✅ Remove from ThreadLocal
    }
}
```

---

**This is a solid foundation for Spring Boot & Microservices! Would you like me to continue with:**
1. Behavioral interview questions with STAR examples
2. Frontend (React) deep dive
3. More production scenarios and debugging
4. Database optimization techniques

Let me know what would be most valuable!
