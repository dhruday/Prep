# 174. Dependency Inversion Principle (DIP)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Dependency Inversion Principle (DIP)**: High-level modules should not depend on low-level modules. Both should depend on abstractions. Abstractions should not depend on details. Details should depend on abstractions.

### Core Concept

**What it means:**
- Don't create dependencies on concrete implementations
- Depend on interfaces or abstract classes instead
- High-level policy code shouldn't know about low-level details
- Invert the dependency direction: details depend on abstractions

**Simple analogy:**
- Light switch (high-level) doesn't depend on specific bulb brand (low-level)
- Both depend on electrical standard interface (abstraction)
- You can swap LED bulb for incandescent without changing switch
- DIP says: define interface, let implementations depend on it

**In code:**
```java
// BAD: High-level depends on low-level ❌
class OrderService {
    private MySQLDatabase database; // Concrete dependency!
    
    public OrderService() {
        this.database = new MySQLDatabase(); // Tight coupling!
    }
    
    public void createOrder(Order order) {
        database.save(order); // Locked to MySQL
    }
}

// GOOD: Both depend on abstraction ✓
interface Database {
    void save(Order order);
}

class OrderService {
    private Database database; // Abstract dependency
    
    public OrderService(Database database) { // Injected!
        this.database = database;
    }
    
    public void createOrder(Order order) {
        database.save(order); // Works with any implementation
    }
}

class MySQLDatabase implements Database { /* MySQL details */ }
class PostgreSQLDatabase implements Database { /* PostgreSQL details */ }
class MongoDatabase implements Database { /* MongoDB details */ }
```

### Why DIP Matters

**Code Quality Benefits:**
- **Flexibility**: Swap implementations without changing high-level code
- **Testability**: Mock abstractions easily in tests
- **Decoupling**: High-level and low-level modules independent
- **Maintainability**: Changes to details don't affect policy
- **Reusability**: High-level modules work with many implementations

**Business Impact:**
- Switch databases without rewriting business logic
- Test code without real database/network/filesystem
- Deploy same code with different infrastructure
- A/B test implementations (Redis vs Memcached)
- Parallel development (teams work on interfaces)

**Common DIP Violations:**
- `new MySQLDatabase()` in business logic
- Direct file system calls in service layer
- Concrete class dependencies in constructors
- Static method calls to utility classes
- Framework code mixed with business logic

**Role in interviews:**
- FAANG asks: "This service creates new EmailSender()—what's wrong?"
- Refactoring: "How would you make this testable?"
- Design questions: "How do you decouple business logic from infrastructure?"
- Expects understanding of dependency injection

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔴 Classic DIP Violation: Direct Dependencies

#### Example 1: Order Service Tightly Coupled to Infrastructure

```java
// BAD: High-level business logic depends on low-level details ❌

public class OrderService {
    
    // Direct dependencies on concrete classes
    private MySQLDatabase database;           // Database detail
    private SmtpEmailSender emailSender;      // Email detail
    private TwilioSmsSender smsSender;        // SMS detail
    private StripePaymentGateway paymentGateway; // Payment detail
    private S3FileStorage fileStorage;        // Storage detail
    
    public OrderService() {
        // Creating instances directly - tight coupling!
        this.database = new MySQLDatabase("localhost", 3306, "orders_db");
        this.emailSender = new SmtpEmailSender("smtp.gmail.com", 587);
        this.smsSender = new TwilioSmsSender("account_sid", "auth_token");
        this.paymentGateway = new StripePaymentGateway("sk_test_...");
        this.fileStorage = new S3FileStorage("us-east-1", "order-files-bucket");
    }
    
    public void createOrder(Order order) {
        // Validate order
        if (order.getTotal().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order total must be positive");
        }
        
        // Process payment
        PaymentResult paymentResult = paymentGateway.charge(
            order.getCustomerId(),
            order.getTotal(),
            "usd"
        );
        
        if (!paymentResult.isSuccessful()) {
            throw new PaymentFailedException("Payment failed");
        }
        
        order.setPaymentId(paymentResult.getTransactionId());
        order.setStatus(OrderStatus.PAID);
        
        // Save to database
        database.executeUpdate(
            "INSERT INTO orders (id, customer_id, total, status) VALUES (?, ?, ?, ?)",
            order.getId(),
            order.getCustomerId(),
            order.getTotal(),
            order.getStatus()
        );
        
        // Send confirmation email
        emailSender.send(
            order.getCustomerEmail(),
            "Order Confirmation",
            "Your order #" + order.getId() + " has been confirmed"
        );
        
        // Send SMS notification
        smsSender.send(
            order.getCustomerPhone(),
            "Order confirmed: " + order.getId()
        );
        
        // Upload receipt to S3
        String receipt = generateReceipt(order);
        fileStorage.upload(
            "receipts/" + order.getId() + ".pdf",
            receipt.getBytes()
        );
    }
    
    private String generateReceipt(Order order) {
        return "Receipt for order " + order.getId();
    }
}

// Problems with this design:
// 1. OrderService (high-level) depends on 5 concrete classes (low-level)
// 2. Cannot test without real MySQL, SMTP, Twilio, Stripe, S3
// 3. Cannot switch from MySQL to PostgreSQL without changing OrderService
// 4. Cannot mock dependencies - all created in constructor
// 5. Configuration hardcoded (connection strings, API keys)
// 6. Violates DIP: High-level module knows about low-level implementation details
// 7. Violates OCP: Adding new notification channel requires changing OrderService
// 8. Violates SRP: OrderService knows about database, email, SMS, payment, storage

// Concrete classes implementing infrastructure details
class MySQLDatabase {
    public MySQLDatabase(String host, int port, String database) {
        // MySQL-specific connection logic
    }
    
    public void executeUpdate(String sql, Object... params) {
        // MySQL-specific query execution
    }
}

class SmtpEmailSender {
    public SmtpEmailSender(String host, int port) {
        // SMTP-specific configuration
    }
    
    public void send(String to, String subject, String body) {
        // SMTP-specific sending logic
    }
}

class TwilioSmsSender {
    public TwilioSmsSender(String accountSid, String authToken) {
        // Twilio-specific authentication
    }
    
    public void send(String phone, String message) {
        // Twilio API calls
    }
}

class StripePaymentGateway {
    public StripePaymentGateway(String apiKey) {
        // Stripe-specific configuration
    }
    
    public PaymentResult charge(String customerId, BigDecimal amount, String currency) {
        // Stripe API calls
    }
}

class S3FileStorage {
    public S3FileStorage(String region, String bucket) {
        // AWS S3 configuration
    }
    
    public void upload(String key, byte[] data) {
        // S3 API calls
    }
}

// Testing is nearly impossible
@Test
public void testCreateOrder() {
    OrderService orderService = new OrderService(); // Creates real dependencies!
    
    Order order = new Order();
    order.setTotal(new BigDecimal("100.00"));
    
    orderService.createOrder(order); // Calls real MySQL, Stripe, SMTP, Twilio, S3!
    
    // Cannot verify behavior without checking real systems
    // Test is slow (network calls)
    // Test is brittle (depends on external services)
    // Test requires infrastructure setup
}
```

#### DIP-Compliant Solution: Depend on Abstractions

```java
// GOOD: High-level module depends on abstractions ✓

// ═══════════════════════════════════════════════════════════
// STEP 1: Define abstractions (interfaces)
// ═══════════════════════════════════════════════════════════

public interface OrderRepository {
    void save(Order order);
    Optional<Order> findById(String orderId);
}

public interface PaymentProcessor {
    PaymentResult charge(String customerId, BigDecimal amount, String currency);
    void refund(String transactionId, BigDecimal amount);
}

public interface EmailNotificationService {
    void sendOrderConfirmation(Order order);
    void sendShippingUpdate(Order order, String trackingNumber);
}

public interface SmsNotificationService {
    void sendOrderConfirmation(Order order);
}

public interface FileStorage {
    void upload(String key, byte[] data);
    byte[] download(String key);
}

// ═══════════════════════════════════════════════════════════
// STEP 2: High-level module depends on abstractions
// ═══════════════════════════════════════════════════════════

@Service
public class OrderService {
    
    // Depend on abstractions, not concretions!
    private final OrderRepository orderRepository;
    private final PaymentProcessor paymentProcessor;
    private final EmailNotificationService emailService;
    private final SmsNotificationService smsService;
    private final FileStorage fileStorage;
    
    // Dependencies injected via constructor (Dependency Injection)
    @Autowired
    public OrderService(
        OrderRepository orderRepository,
        PaymentProcessor paymentProcessor,
        EmailNotificationService emailService,
        SmsNotificationService smsService,
        FileStorage fileStorage
    ) {
        this.orderRepository = orderRepository;
        this.paymentProcessor = paymentProcessor;
        this.emailService = emailService;
        this.smsService = smsService;
        this.fileStorage = fileStorage;
    }
    
    public void createOrder(Order order) {
        // Validate order
        validateOrder(order);
        
        // Process payment (don't care if it's Stripe, PayPal, or Adyen)
        PaymentResult paymentResult = paymentProcessor.charge(
            order.getCustomerId(),
            order.getTotal(),
            "usd"
        );
        
        if (!paymentResult.isSuccessful()) {
            throw new PaymentFailedException("Payment failed");
        }
        
        order.setPaymentId(paymentResult.getTransactionId());
        order.setStatus(OrderStatus.PAID);
        
        // Save to database (don't care if it's MySQL, PostgreSQL, or MongoDB)
        orderRepository.save(order);
        
        // Send notifications (don't care about SMTP, SendGrid, or AWS SES)
        emailService.sendOrderConfirmation(order);
        smsService.sendOrderConfirmation(order);
        
        // Upload receipt (don't care if it's S3, Azure Blob, or GCS)
        String receipt = generateReceipt(order);
        fileStorage.upload("receipts/" + order.getId() + ".pdf", receipt.getBytes());
    }
    
    private void validateOrder(Order order) {
        if (order.getTotal().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order total must be positive");
        }
    }
    
    private String generateReceipt(Order order) {
        return "Receipt for order " + order.getId();
    }
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Low-level modules implement abstractions
// ═══════════════════════════════════════════════════════════

@Repository
public class MySQLOrderRepository implements OrderRepository {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    @Override
    public void save(Order order) {
        jdbcTemplate.update(
            "INSERT INTO orders (id, customer_id, total, status, payment_id) " +
            "VALUES (?, ?, ?, ?, ?)",
            order.getId(),
            order.getCustomerId(),
            order.getTotal(),
            order.getStatus().name(),
            order.getPaymentId()
        );
    }
    
    @Override
    public Optional<Order> findById(String orderId) {
        // MySQL-specific query logic
        return Optional.empty();
    }
}

@Service
public class StripePaymentProcessor implements PaymentProcessor {
    
    @Value("${stripe.api.key}")
    private String apiKey;
    
    private Stripe stripeClient;
    
    @PostConstruct
    public void init() {
        this.stripeClient = new Stripe(apiKey);
    }
    
    @Override
    public PaymentResult charge(String customerId, BigDecimal amount, String currency) {
        try {
            Charge charge = stripeClient.charges.create(
                Map.of(
                    "amount", amount.multiply(new BigDecimal("100")).longValue(),
                    "currency", currency,
                    "customer", customerId
                )
            );
            
            return new PaymentResult(true, charge.getId(), charge.getStatus());
        } catch (StripeException e) {
            return new PaymentResult(false, null, "failed");
        }
    }
    
    @Override
    public void refund(String transactionId, BigDecimal amount) {
        // Stripe refund logic
    }
}

@Service
public class SendGridEmailService implements EmailNotificationService {
    
    @Autowired
    private SendGridClient sendGridClient;
    
    @Override
    public void sendOrderConfirmation(Order order) {
        Email from = new Email("orders@example.com");
        Email to = new Email(order.getCustomerEmail());
        String subject = "Order Confirmation #" + order.getId();
        Content content = new Content(
            "text/html",
            buildOrderConfirmationHtml(order)
        );
        
        Mail mail = new Mail(from, subject, to, content);
        sendGridClient.send(mail);
    }
    
    @Override
    public void sendShippingUpdate(Order order, String trackingNumber) {
        // Shipping email logic
    }
    
    private String buildOrderConfirmationHtml(Order order) {
        return "<h1>Order Confirmed</h1><p>Order #" + order.getId() + "</p>";
    }
}

@Service
public class TwilioSmsService implements SmsNotificationService {
    
    @Value("${twilio.account.sid}")
    private String accountSid;
    
    @Value("${twilio.auth.token}")
    private String authToken;
    
    @Value("${twilio.phone.number}")
    private String fromPhoneNumber;
    
    private Twilio twilioClient;
    
    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
    }
    
    @Override
    public void sendOrderConfirmation(Order order) {
        Message.creator(
            new PhoneNumber(order.getCustomerPhone()),
            new PhoneNumber(fromPhoneNumber),
            "Your order #" + order.getId() + " has been confirmed!"
        ).create();
    }
}

@Service
public class S3FileStorage implements FileStorage {
    
    @Autowired
    private AmazonS3 s3Client;
    
    @Value("${aws.s3.bucket}")
    private String bucketName;
    
    @Override
    public void upload(String key, byte[] data) {
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(data.length);
        
        s3Client.putObject(
            bucketName,
            key,
            new ByteArrayInputStream(data),
            metadata
        );
    }
    
    @Override
    public byte[] download(String key) {
        S3Object s3Object = s3Client.getObject(bucketName, key);
        return s3Object.getObjectContent().readAllBytes();
    }
}

// ═══════════════════════════════════════════════════════════
// STEP 4: Spring configuration wires dependencies
// ═══════════════════════════════════════════════════════════

@Configuration
public class OrderConfiguration {
    
    @Bean
    public OrderRepository orderRepository(JdbcTemplate jdbcTemplate) {
        return new MySQLOrderRepository();
    }
    
    @Bean
    public PaymentProcessor paymentProcessor() {
        return new StripePaymentProcessor();
    }
    
    @Bean
    public EmailNotificationService emailNotificationService() {
        return new SendGridEmailService();
    }
    
    @Bean
    public SmsNotificationService smsNotificationService() {
        return new TwilioSmsService();
    }
    
    @Bean
    public FileStorage fileStorage(AmazonS3 s3Client) {
        return new S3FileStorage();
    }
}

// ═══════════════════════════════════════════════════════════
// STEP 5: Easy testing with mocks
// ═══════════════════════════════════════════════════════════

@ExtendWith(MockitoExtension.class)
public class OrderServiceTest {
    
    @Mock
    private OrderRepository orderRepository;
    
    @Mock
    private PaymentProcessor paymentProcessor;
    
    @Mock
    private EmailNotificationService emailService;
    
    @Mock
    private SmsNotificationService smsService;
    
    @Mock
    private FileStorage fileStorage;
    
    @InjectMocks
    private OrderService orderService;
    
    @Test
    public void testCreateOrder_Success() {
        // Arrange
        Order order = new Order();
        order.setId("order-123");
        order.setCustomerId("customer-456");
        order.setTotal(new BigDecimal("100.00"));
        order.setCustomerEmail("customer@example.com");
        order.setCustomerPhone("+1234567890");
        
        PaymentResult successResult = new PaymentResult(true, "payment-789", "succeeded");
        when(paymentProcessor.charge(anyString(), any(BigDecimal.class), anyString()))
            .thenReturn(successResult);
        
        // Act
        orderService.createOrder(order);
        
        // Assert
        verify(paymentProcessor).charge("customer-456", new BigDecimal("100.00"), "usd");
        verify(orderRepository).save(order);
        verify(emailService).sendOrderConfirmation(order);
        verify(smsService).sendOrderConfirmation(order);
        verify(fileStorage).upload(eq("receipts/order-123.pdf"), any(byte[].class));
        
        assertEquals(OrderStatus.PAID, order.getStatus());
        assertEquals("payment-789", order.getPaymentId());
    }
    
    @Test
    public void testCreateOrder_PaymentFailure() {
        // Arrange
        Order order = new Order();
        order.setTotal(new BigDecimal("100.00"));
        
        PaymentResult failureResult = new PaymentResult(false, null, "failed");
        when(paymentProcessor.charge(anyString(), any(BigDecimal.class), anyString()))
            .thenReturn(failureResult);
        
        // Act & Assert
        assertThrows(PaymentFailedException.class, () -> {
            orderService.createOrder(order);
        });
        
        verify(orderRepository, never()).save(any(Order.class));
        verify(emailService, never()).sendOrderConfirmation(any(Order.class));
    }
}

// ═══════════════════════════════════════════════════════════
// Benefits of DIP-compliant design
// ═══════════════════════════════════════════════════════════

// ✓ OrderService doesn't know about MySQL, Stripe, SendGrid, Twilio, or S3
// ✓ Can swap MySQL for PostgreSQL by changing configuration
// ✓ Can swap Stripe for PayPal by implementing PaymentProcessor
// ✓ Tests run in milliseconds with mocks (no network calls)
// ✓ Can test payment failures without calling Stripe API
// ✓ Configuration externalized (application.properties)
// ✓ Parallel development: Team A works on OrderService, Team B on StripePaymentProcessor
// ✓ A/B testing: Switch between SendGrid and AWS SES in production
// ✓ Follows Open-Closed Principle: Add new implementations without changing OrderService
```

---

### 🟢 DIP in Layered Architecture

```java
// BAD: Layers depend on concrete implementations ❌

// Presentation Layer
@RestController
public class OrderController {
    
    // Depends on concrete service class
    private OrderServiceImpl orderService;
    
    public OrderController() {
        this.orderService = new OrderServiceImpl(); // Creates concrete dependency
    }
    
    @PostMapping("/orders")
    public ResponseEntity<Order> createOrder(@RequestBody OrderRequest request) {
        Order order = orderService.createOrder(request);
        return ResponseEntity.ok(order);
    }
}

// Business Logic Layer
public class OrderServiceImpl {
    
    // Depends on concrete repository class
    private MySQLOrderRepository orderRepository;
    
    public OrderServiceImpl() {
        this.orderRepository = new MySQLOrderRepository(); // Creates concrete dependency
    }
    
    public Order createOrder(OrderRequest request) {
        Order order = new Order();
        // ... business logic
        orderRepository.save(order);
        return order;
    }
}

// Data Access Layer
public class MySQLOrderRepository {
    
    private Connection connection;
    
    public MySQLOrderRepository() {
        // MySQL-specific connection
        this.connection = DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/orders", 
            "root", 
            "password"
        );
    }
    
    public void save(Order order) {
        // MySQL-specific SQL
    }
}

// Problems:
// 1. Controller depends on OrderServiceImpl (concrete)
// 2. OrderServiceImpl depends on MySQLOrderRepository (concrete)
// 3. Cannot test without concrete implementations
// 4. Cannot swap implementations
// 5. Changes ripple through layers
```

#### DIP-Compliant Layered Architecture

```java
// GOOD: Layers depend on abstractions ✓

// ═══════════════════════════════════════════════════════════
// Define abstractions at each layer boundary
// ═══════════════════════════════════════════════════════════

// Business Logic Layer Interface
public interface OrderService {
    Order createOrder(OrderRequest request);
    Order getOrder(String orderId);
    void cancelOrder(String orderId);
}

// Data Access Layer Interface
public interface OrderRepository {
    void save(Order order);
    Optional<Order> findById(String orderId);
    void delete(String orderId);
}

// ═══════════════════════════════════════════════════════════
// Presentation Layer depends on abstraction
// ═══════════════════════════════════════════════════════════

@RestController
@RequestMapping("/orders")
public class OrderController {
    
    // Depends on abstraction, not concrete implementation
    private final OrderService orderService;
    
    @Autowired
    public OrderController(OrderService orderService) {
        this.orderService = orderService; // Injected by Spring
    }
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) {
        Order order = orderService.createOrder(request);
        OrderResponse response = OrderResponse.from(order);
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable String orderId) {
        Order order = orderService.getOrder(orderId);
        return ResponseEntity.ok(OrderResponse.from(order));
    }
    
    @DeleteMapping("/{orderId}")
    public ResponseEntity<Void> cancelOrder(@PathVariable String orderId) {
        orderService.cancelOrder(orderId);
        return ResponseEntity.noContent().build();
    }
}

// ═══════════════════════════════════════════════════════════
// Business Logic Layer depends on abstraction
// ═══════════════════════════════════════════════════════════

@Service
public class OrderServiceImpl implements OrderService {
    
    // Depends on abstraction, not concrete repository
    private final OrderRepository orderRepository;
    private final PaymentProcessor paymentProcessor;
    
    @Autowired
    public OrderServiceImpl(
        OrderRepository orderRepository,
        PaymentProcessor paymentProcessor
    ) {
        this.orderRepository = orderRepository; // Injected
        this.paymentProcessor = paymentProcessor; // Injected
    }
    
    @Override
    public Order createOrder(OrderRequest request) {
        // Business logic
        Order order = new Order();
        order.setId(UUID.randomUUID().toString());
        order.setCustomerId(request.getCustomerId());
        order.setTotal(request.getTotal());
        
        // Process payment
        PaymentResult result = paymentProcessor.charge(
            order.getCustomerId(),
            order.getTotal(),
            "usd"
        );
        
        if (!result.isSuccessful()) {
            throw new PaymentFailedException("Payment failed");
        }
        
        order.setPaymentId(result.getTransactionId());
        order.setStatus(OrderStatus.PAID);
        
        // Save order
        orderRepository.save(order);
        
        return order;
    }
    
    @Override
    public Order getOrder(String orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException(orderId));
    }
    
    @Override
    public void cancelOrder(String orderId) {
        Order order = getOrder(orderId);
        
        if (order.getStatus() == OrderStatus.SHIPPED) {
            throw new IllegalStateException("Cannot cancel shipped order");
        }
        
        // Refund payment
        if (order.getPaymentId() != null) {
            paymentProcessor.refund(order.getPaymentId(), order.getTotal());
        }
        
        // Delete order
        orderRepository.delete(orderId);
    }
}

// ═══════════════════════════════════════════════════════════
// Data Access Layer implements abstraction
// ═══════════════════════════════════════════════════════════

@Repository
public class JpaOrderRepository implements OrderRepository {
    
    @PersistenceContext
    private EntityManager entityManager;
    
    @Override
    public void save(Order order) {
        entityManager.persist(order);
    }
    
    @Override
    public Optional<Order> findById(String orderId) {
        Order order = entityManager.find(Order.class, orderId);
        return Optional.ofNullable(order);
    }
    
    @Override
    public void delete(String orderId) {
        Order order = entityManager.find(Order.class, orderId);
        if (order != null) {
            entityManager.remove(order);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// Alternative implementations (easily swappable)
// ═══════════════════════════════════════════════════════════

// Redis implementation for caching layer
@Repository
@Profile("redis")
public class RedisOrderRepository implements OrderRepository {
    
    @Autowired
    private RedisTemplate<String, Order> redisTemplate;
    
    @Override
    public void save(Order order) {
        redisTemplate.opsForValue().set("order:" + order.getId(), order);
    }
    
    @Override
    public Optional<Order> findById(String orderId) {
        Order order = redisTemplate.opsForValue().get("order:" + orderId);
        return Optional.ofNullable(order);
    }
    
    @Override
    public void delete(String orderId) {
        redisTemplate.delete("order:" + orderId);
    }
}

// MongoDB implementation for document storage
@Repository
@Profile("mongodb")
public class MongoOrderRepository implements OrderRepository {
    
    @Autowired
    private MongoTemplate mongoTemplate;
    
    @Override
    public void save(Order order) {
        mongoTemplate.save(order, "orders");
    }
    
    @Override
    public Optional<Order> findById(String orderId) {
        Order order = mongoTemplate.findById(orderId, Order.class, "orders");
        return Optional.ofNullable(order);
    }
    
    @Override
    public void delete(String orderId) {
        mongoTemplate.remove(Query.query(Criteria.where("id").is(orderId)), "orders");
    }
}

// Benefits:
// ✓ Controller doesn't know about OrderServiceImpl
// ✓ OrderServiceImpl doesn't know about JpaOrderRepository
// ✓ Can switch JPA → Redis → MongoDB without changing business logic
// ✓ Each layer testable independently
// ✓ Configuration controls which implementation is used
```

---

### 🔵 DIP with Factory Pattern

```java
// GOOD: Factory depends on abstraction, returns abstraction ✓

// ═══════════════════════════════════════════════════════════
// Abstraction for notification channels
// ═══════════════════════════════════════════════════════════

public interface NotificationChannel {
    void send(String recipient, String message);
    boolean supports(String channelType);
}

// ═══════════════════════════════════════════════════════════
// Concrete implementations
// ═══════════════════════════════════════════════════════════

@Component
public class EmailNotificationChannel implements NotificationChannel {
    
    @Autowired
    private JavaMailSender mailSender;
    
    @Override
    public void send(String recipient, String message) {
        SimpleMailMessage email = new SimpleMailMessage();
        email.setTo(recipient);
        email.setSubject("Notification");
        email.setText(message);
        mailSender.send(email);
    }
    
    @Override
    public boolean supports(String channelType) {
        return "EMAIL".equalsIgnoreCase(channelType);
    }
}

@Component
public class SmsNotificationChannel implements NotificationChannel {
    
    @Autowired
    private SmsClient smsClient;
    
    @Override
    public void send(String recipient, String message) {
        smsClient.sendSms(recipient, message);
    }
    
    @Override
    public boolean supports(String channelType) {
        return "SMS".equalsIgnoreCase(channelType);
    }
}

@Component
public class PushNotificationChannel implements NotificationChannel {
    
    @Autowired
    private FirebaseMessaging firebaseMessaging;
    
    @Override
    public void send(String recipient, String message) {
        Message pushMessage = Message.builder()
            .setToken(recipient)
            .setNotification(Notification.builder().setBody(message).build())
            .build();
        firebaseMessaging.send(pushMessage);
    }
    
    @Override
    public boolean supports(String channelType) {
        return "PUSH".equalsIgnoreCase(channelType);
    }
}

// ═══════════════════════════════════════════════════════════
// Factory depends on abstraction
// ═══════════════════════════════════════════════════════════

@Component
public class NotificationChannelFactory {
    
    // Factory depends on abstraction (NotificationChannel)
    // Spring injects all implementations automatically
    private final List<NotificationChannel> channels;
    
    @Autowired
    public NotificationChannelFactory(List<NotificationChannel> channels) {
        this.channels = channels;
    }
    
    // Returns abstraction, not concrete type
    public NotificationChannel getChannel(String channelType) {
        return channels.stream()
            .filter(channel -> channel.supports(channelType))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "Unsupported channel type: " + channelType
            ));
    }
}

// ═══════════════════════════════════════════════════════════
// Service depends on abstraction
// ═══════════════════════════════════════════════════════════

@Service
public class NotificationService {
    
    private final NotificationChannelFactory channelFactory;
    
    @Autowired
    public NotificationService(NotificationChannelFactory channelFactory) {
        this.channelFactory = channelFactory;
    }
    
    public void sendNotification(String recipient, String message, String channelType) {
        // Get channel based on type (EMAIL, SMS, PUSH)
        NotificationChannel channel = channelFactory.getChannel(channelType);
        
        // Send notification (don't care about concrete implementation)
        channel.send(recipient, message);
    }
    
    public void sendMultiChannel(String recipient, String message, List<String> channels) {
        for (String channelType : channels) {
            try {
                NotificationChannel channel = channelFactory.getChannel(channelType);
                channel.send(recipient, message);
            } catch (Exception e) {
                // Log and continue with other channels
                System.err.println("Failed to send via " + channelType + ": " + e.getMessage());
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════
// Adding new channel is trivial (OCP + DIP)
// ═══════════════════════════════════════════════════════════

@Component
public class SlackNotificationChannel implements NotificationChannel {
    
    @Autowired
    private SlackClient slackClient;
    
    @Override
    public void send(String recipient, String message) {
        slackClient.postMessage(recipient, message);
    }
    
    @Override
    public boolean supports(String channelType) {
        return "SLACK".equalsIgnoreCase(channelType);
    }
}

// No changes needed to:
// - NotificationChannelFactory (automatically picks up new implementation)
// - NotificationService (already depends on abstraction)
// - Existing notification channels (isolated)

// Benefits:
// ✓ Factory depends on NotificationChannel interface, not concrete classes
// ✓ Service depends on NotificationChannel interface
// ✓ Adding Slack channel requires zero changes to existing code
// ✓ Can test with mock NotificationChannel
// ✓ Runtime polymorphism chooses correct implementation
```

---

### 🟡 DIP with Strategy Pattern + Spring

```java
// GOOD: Complete DIP example with multiple abstractions ✓

// ═══════════════════════════════════════════════════════════
// Domain model
// ═══════════════════════════════════════════════════════════

public class ShippingRequest {
    private String orderId;
    private Address destination;
    private List<Item> items;
    private BigDecimal totalWeight;
    private ShippingSpeed speed; // STANDARD, EXPRESS, OVERNIGHT
    
    // Getters and setters
}

public class ShippingQuote {
    private String provider;
    private BigDecimal cost;
    private int estimatedDays;
    private String trackingUrl;
    
    // Constructor, getters, setters
}

// ═══════════════════════════════════════════════════════════
// Abstractions (high-level defines what it needs)
// ═══════════════════════════════════════════════════════════

public interface ShippingCalculator {
    ShippingQuote calculateShipping(ShippingRequest request);
    boolean supports(ShippingSpeed speed);
}

public interface ShippingRepository {
    void saveQuote(ShippingQuote quote);
    Optional<ShippingQuote> findByOrderId(String orderId);
}

public interface RateCache {
    Optional<BigDecimal> getCachedRate(String cacheKey);
    void cacheRate(String cacheKey, BigDecimal rate, Duration ttl);
}

// ═══════════════════════════════════════════════════════════
// High-level module (business logic)
// ═══════════════════════════════════════════════════════════

@Service
public class ShippingService {
    
    // Depends on abstractions
    private final List<ShippingCalculator> calculators;
    private final ShippingRepository shippingRepository;
    private final RateCache rateCache;
    
    @Autowired
    public ShippingService(
        List<ShippingCalculator> calculators,
        ShippingRepository shippingRepository,
        RateCache rateCache
    ) {
        this.calculators = calculators;
        this.shippingRepository = shippingRepository;
        this.rateCache = rateCache;
    }
    
    public ShippingQuote getShippingQuote(ShippingRequest request) {
        // Try cache first
        String cacheKey = buildCacheKey(request);
        Optional<BigDecimal> cachedRate = rateCache.getCachedRate(cacheKey);
        
        if (cachedRate.isPresent()) {
            return buildQuoteFromCache(cachedRate.get(), request);
        }
        
        // Find appropriate calculator
        ShippingCalculator calculator = calculators.stream()
            .filter(calc -> calc.supports(request.getSpeed()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "No calculator for speed: " + request.getSpeed()
            ));
        
        // Calculate shipping
        ShippingQuote quote = calculator.calculateShipping(request);
        
        // Cache the rate
        rateCache.cacheRate(cacheKey, quote.getCost(), Duration.ofHours(1));
        
        // Save quote
        shippingRepository.saveQuote(quote);
        
        return quote;
    }
    
    private String buildCacheKey(ShippingRequest request) {
        return String.format("shipping:%s:%s:%s",
            request.getDestination().getZipCode(),
            request.getTotalWeight(),
            request.getSpeed()
        );
    }
    
    private ShippingQuote buildQuoteFromCache(BigDecimal cost, ShippingRequest request) {
        return new ShippingQuote("CACHED", cost, 0, "");
    }
}

// ═══════════════════════════════════════════════════════════
// Low-level modules implement abstractions
// ═══════════════════════════════════════════════════════════

@Component
public class StandardShippingCalculator implements ShippingCalculator {
    
    @Override
    public ShippingQuote calculateShipping(ShippingRequest request) {
        // Standard shipping calculation
        BigDecimal baseCost = new BigDecimal("10.00");
        BigDecimal weightCost = request.getTotalWeight()
            .multiply(new BigDecimal("0.50"));
        
        return new ShippingQuote(
            "USPS",
            baseCost.add(weightCost),
            7,
            "https://usps.com/track"
        );
    }
    
    @Override
    public boolean supports(ShippingSpeed speed) {
        return speed == ShippingSpeed.STANDARD;
    }
}

@Component
public class ExpressShippingCalculator implements ShippingCalculator {
    
    @Autowired
    private FedExApiClient fedExClient;
    
    @Override
    public ShippingQuote calculateShipping(ShippingRequest request) {
        // Call FedEx API for express shipping
        FedExRateResponse response = fedExClient.getRates(
            request.getDestination(),
            request.getTotalWeight(),
            "EXPRESS"
        );
        
        return new ShippingQuote(
            "FedEx",
            response.getTotalCost(),
            2,
            response.getTrackingUrl()
        );
    }
    
    @Override
    public boolean supports(ShippingSpeed speed) {
        return speed == ShippingSpeed.EXPRESS;
    }
}

@Component
public class OvernightShippingCalculator implements ShippingCalculator {
    
    @Autowired
    private UpsApiClient upsClient;
    
    @Override
    public ShippingQuote calculateShipping(ShippingRequest request) {
        // Call UPS API for overnight shipping
        UpsRateResponse response = upsClient.getRates(
            request.getDestination(),
            request.getTotalWeight(),
            "OVERNIGHT"
        );
        
        return new ShippingQuote(
            "UPS",
            response.getTotalCost(),
            1,
            response.getTrackingUrl()
        );
    }
    
    @Override
    public boolean supports(ShippingSpeed speed) {
        return speed == ShippingSpeed.OVERNIGHT;
    }
}

@Repository
public class JpaShippingRepository implements ShippingRepository {
    
    @PersistenceContext
    private EntityManager entityManager;
    
    @Override
    public void saveQuote(ShippingQuote quote) {
        entityManager.persist(quote);
    }
    
    @Override
    public Optional<ShippingQuote> findByOrderId(String orderId) {
        TypedQuery<ShippingQuote> query = entityManager.createQuery(
            "SELECT q FROM ShippingQuote q WHERE q.orderId = :orderId",
            ShippingQuote.class
        );
        query.setParameter("orderId", orderId);
        
        try {
            return Optional.of(query.getSingleResult());
        } catch (NoResultException e) {
            return Optional.empty();
        }
    }
}

@Component
public class RedisRateCache implements RateCache {
    
    @Autowired
    private RedisTemplate<String, BigDecimal> redisTemplate;
    
    @Override
    public Optional<BigDecimal> getCachedRate(String cacheKey) {
        BigDecimal rate = redisTemplate.opsForValue().get(cacheKey);
        return Optional.ofNullable(rate);
    }
    
    @Override
    public void cacheRate(String cacheKey, BigDecimal rate, Duration ttl) {
        redisTemplate.opsForValue().set(cacheKey, rate, ttl);
    }
}

// Benefits:
// ✓ ShippingService doesn't know about USPS, FedEx, UPS
// ✓ ShippingService doesn't know about JPA or Redis
// ✓ Can add DHL calculator without changing ShippingService
// ✓ Can swap Redis cache for Memcached
// ✓ Can swap JPA for MongoDB
// ✓ Testable with mocks
```

---

## ────────────────────────────────────
## 3️⃣ DIP Design Guidelines
## ────────────────────────────────────

### Identifying DIP Violations

**Signs of DIP violation:**
□ `new ConcreteClass()` in business logic
□ Direct imports of infrastructure classes
□ Type declarations using concrete classes
□ Static method calls to utility classes
□ Framework APIs in business logic
□ Hard-coded configuration values
□ Direct database/network/filesystem access

**How to apply DIP:**
1. **Define abstractions first**: Start with interfaces
2. **Inject dependencies**: Use constructor injection
3. **Depend on interfaces**: Never depend on concrete classes
4. **Invert the dependency**: Let details depend on policy
5. **Use factories**: When you need to create objects

### Abstraction Guidelines

```java
// ❌ DON'T: High-level depends on low-level
class OrderService {
    private MySQLDatabase db = new MySQLDatabase(); // Concrete!
}

// ✓ DO: Both depend on abstraction
interface Database { void save(Order order); }

class OrderService {
    private Database db; // Abstract!
    
    OrderService(Database db) { this.db = db; }
}

class MySQLDatabase implements Database { /* details */ }
```

### Layer Dependency Rules

```
Traditional (Wrong):
Presentation → Business Logic → Data Access
     ↓              ↓                ↓
(Depends on concrete implementations)

DIP (Correct):
Presentation → BusinessInterface ← Business Logic → DataInterface
                      ↑                                    ↑
                (Abstractions)                      (Abstractions)
                      ↓                                    ↓
            BusinessLogicImpl                    DataAccessImpl
```

---

## ────────────────────────────────────
## 4️⃣ Real-World Production Examples
## ────────────────────────────────────

### Example 1: Spring Framework - Core Design

Spring Framework is built on DIP:

```java
// Spring's DIP in action

// High-level component depends on abstraction
@Service
public class UserService {
    
    // Depends on abstraction (interface)
    private final UserRepository userRepository;
    
    // Spring injects concrete implementation
    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

// Abstraction defined by high-level module
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}

// Spring Data provides concrete implementation at runtime
// UserService never knows about the concrete class
// Can swap JPA for MongoDB without changing UserService
```

### Example 2: JDBC - Driver Manager

JDBC uses DIP to support multiple databases:

```java
// High-level JDBC API (abstraction)
Connection connection = DriverManager.getConnection(url, user, password);
Statement statement = connection.createStatement();
ResultSet resultSet = statement.executeQuery("SELECT * FROM users");

// Works with any database driver:
// - MySQL: com.mysql.cj.jdbc.Driver
// - PostgreSQL: org.postgresql.Driver
// - Oracle: oracle.jdbc.driver.OracleDriver

// Your code depends on Connection, Statement, ResultSet interfaces
// Never depends on MySQLConnection, PostgreSQLConnection, etc.
// Database vendors provide concrete implementations
```

### Example 3: Logging Frameworks - SLF4J

SLF4J (Simple Logging Facade for Java) is pure DIP:

```java
// Your code depends on abstraction
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrderService {
    
    // Depends on SLF4J interface (abstraction)
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
    
    public void createOrder(Order order) {
        logger.info("Creating order: {}", order.getId());
        // Business logic
        logger.debug("Order created successfully");
    }
}

// At runtime, bind to any implementation:
// - Logback: ch.qos.logback.classic.Logger
// - Log4j2: org.apache.logging.log4j.core.Logger
// - JUL: java.util.logging.Logger

// Change binding in pom.xml, no code changes needed
// OrderService never knows about concrete logging framework
```

### Example 4: Payment Gateway Abstraction

Real production payment service:

```java
// Abstraction (owned by business logic)
public interface PaymentGateway {
    PaymentResult charge(ChargeRequest request);
    RefundResult refund(String transactionId, BigDecimal amount);
    PaymentStatus getStatus(String transactionId);
}

// Business logic depends on abstraction
@Service
public class CheckoutService {
    
    private final PaymentGateway paymentGateway;
    
    @Autowired
    public CheckoutService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }
    
    public Order checkout(Cart cart) {
        ChargeRequest request = ChargeRequest.from(cart);
        PaymentResult result = paymentGateway.charge(request);
        
        if (result.isSuccessful()) {
            return createOrder(cart, result);
        } else {
            throw new PaymentFailedException(result.getErrorMessage());
        }
    }
}

// Multiple implementations (swappable)
@Service
@Profile("production")
public class StripePaymentGateway implements PaymentGateway {
    // Stripe API calls
}

@Service
@Profile("test")
public class MockPaymentGateway implements PaymentGateway {
    // Always returns success
}

@Service
@Profile("staging")
public class PayPalPaymentGateway implements PaymentGateway {
    // PayPal API calls
}

// Switch payment gateway by changing application profile
// No code changes to CheckoutService
// Can A/B test Stripe vs PayPal in production
```

---

## ────────────────────────────────────
## 5️⃣ Interview Q&A (Behavioral Questions)
## ────────────────────────────────────

### Q1: "What is Dependency Inversion Principle?"

**Answer:** *"Dependency Inversion Principle has two parts: First, high-level modules should not depend on low-level modules—both should depend on abstractions. Second, abstractions should not depend on details—details should depend on abstractions.*

*Classic violation: OrderService with MySQLDatabase database = new MySQLDatabase(). High-level business logic (OrderService) depends on low-level infrastructure detail (MySQLDatabase). Cannot test without real MySQL. Cannot switch to PostgreSQL without rewriting OrderService.*

*DIP solution: Define Database interface. OrderService depends on Database interface, not MySQLDatabase. MySQLDatabase implements Database interface. Dependency injected via constructor. Now OrderService doesn't know about MySQL—can swap PostgreSQL, MongoDB, or InMemoryDatabase by changing configuration.*

*Key insight: 'inversion' means traditional dependency direction is reversed. Traditionally, high-level → low-level. With DIP, both → abstraction. Details depend on abstraction, not other way around.*

*Benefits: flexibility (swap implementations), testability (mock abstractions), decoupling (changes isolated), maintainability (business logic stable)."*

### Q2: "Give a real example where you applied DIP"

**Answer:** *"At my company, our OrderService directly created new StripePaymentProcessor()—violating DIP. High-level order processing logic depended on low-level Stripe API details. Testing required real Stripe API calls—tests were slow (5 seconds each), flaky (network issues), and required test API keys in CI.*

*I refactored using DIP. First, defined PaymentProcessor interface with charge() and refund() methods—abstraction owned by business logic. Second, changed OrderService to accept PaymentProcessor in constructor—dependency injection. Third, created StripePaymentProcessor implementing PaymentProcessor—encapsulated Stripe details. Fourth, created MockPaymentProcessor for testing—always returns success.*

*Spring configuration injected StripePaymentProcessor in production, MockPaymentProcessor in tests. OrderService never changed—depends on abstraction.*

*Results: Test execution 5 seconds → 50 milliseconds (100x faster). Zero flaky tests—no network calls. Test coverage 30% → 85%—could test failure scenarios without calling Stripe. Bonus: Product wanted to A/B test PayPal—implemented PayPalPaymentProcessor, changed configuration, zero code changes to OrderService. DIP enabled flexibility we didn't anticipate."*

### Q3: "How do you identify DIP violations in code reviews?"

**Answer:** *"I look for six red flags:*

*First, 'new' keyword in business logic. If I see OrderService creating new MySQLRepository(), that's direct dependency—DIP violation. Business logic shouldn't instantiate infrastructure.*

*Second, concrete type declarations. Private MySQLRepository repository—depends on concrete class, not abstraction. Should be private Repository repository.*

*Third, static method calls. Utils.sendEmail()—tight coupling to utility class. Should inject EmailService interface.*

*Fourth, framework imports in business logic. Import com.mysql.jdbc in OrderService—business logic knows about MySQL. Framework details should be isolated.*

*Fifth, configuration hardcoded. New Database('localhost', 3306)—connection details in code. Should be externalized and injected.*

*Sixth, difficult testing. Test creates OrderService and it fails with 'Connection refused'—test needs real infrastructure, proves DIP violation.*

*When I find violations, I suggest: Define abstraction (interface/abstract class), inject via constructor, implement in separate class, wire with Spring/configuration."*

### Q4: "Doesn't DIP create too many interfaces?"

**Answer:** *"It creates more interfaces, but each enables flexibility and testability. Let me compare:*

*Without DIP: OrderService with new MySQLDatabase(), new StripePaymentProcessor(), new SendGridEmailSender()—three concrete dependencies. Testing requires real MySQL, Stripe API, SendGrid. Switching MySQL to PostgreSQL requires changing OrderService. Zero interfaces, but inflexible and untestable.*

*With DIP: Database, PaymentProcessor, EmailService interfaces—three abstractions. OrderService depends on abstractions. Testing uses mocks—milliseconds instead of seconds. Switching MySQL to PostgreSQL changes configuration, not OrderService. Three interfaces, maximum flexibility.*

*More interfaces? Yes—three instead of zero. But each interface enables capability: test without infrastructure, swap implementations, parallel development (team A: OrderService, team B: StripePaymentProcessor), A/B test providers.*

*Real-world: My team added three interfaces, eliminated 20 minutes of test infrastructure setup, reduced build time from 10 minutes to 2 minutes (tests run in parallel, no database waits), enabled production A/B test (Stripe vs PayPal) that increased conversion 3%.*

*Interfaces have cost—more files, indirection. But benefits—flexibility, testability, decoupling—far outweigh costs. DIP interfaces are investment in maintainability."*

### Q5: "How does DIP relate to other SOLID principles?"

**Answer:** *"DIP complements all SOLID principles:*

*DIP + SRP: SRP says each class has one responsibility. DIP says depend on abstractions. Together: OrderService (one responsibility: process orders) depends on PaymentProcessor interface (one responsibility: process payments). Neither knows implementation details.*

*DIP + OCP: OCP says open for extension, closed for modification. DIP enables OCP through abstractions. Example: PaymentProcessor interface. OrderService closed for modification. Add PayPalPaymentProcessor—extends system without changing OrderService. DIP provides extension points OCP requires.*

*DIP + LSP: LSP says subtypes substitutable for base types. DIP depends on base types. Example: Database interface. OrderService works with any Database implementation—MySQLDatabase, PostgreSQLDatabase, MongoDatabase. LSP ensures substitution works correctly.*

*DIP + ISP: ISP says focused interfaces. DIP says depend on abstractions. Together: Define many focused interfaces (ReadRepository, WriteRepository) instead of one fat interface. DIP depends on focused abstractions ISP recommends.*

*DIP is foundational—enables other principles. Without DIP, hard to achieve OCP (need abstractions to extend), LSP (need base types to substitute), ISP (need interfaces to segregate). DIP provides abstraction layer other principles build on."*

### Q6: "When should you NOT use DIP?"

**Answer:** *"DIP has overhead—interfaces, injection, configuration. Not every dependency needs abstraction.*

*Skip DIP when dependency is stable and unlikely to change. Example: Java standard library—String, List, Map. Don't create StringInterface—String is final, stable, never swapping implementations. Over-abstraction adds complexity with zero benefit.*

*Skip DIP for simple value objects and DTOs. Example: Address, Money, Coordinate—no behavior, just data. No need for AddressInterface—never multiple implementations.*

*Skip DIP for framework-specific code in framework layer. Example: Spring's @RestController directly uses HttpServletRequest—that's fine, controller is already framework-specific. No need to abstract framework APIs in framework layer.*

*Skip DIP in throwaway/prototype code. If building POC to test idea, direct dependencies fine. Refactor to DIP if it becomes production code.*

*Use DIP for volatile dependencies: infrastructure (databases, message queues, email), third-party APIs (payment, SMS), cross-cutting concerns (logging, monitoring), anything you might swap or mock.*

*Rule of thumb: If you need to mock it in tests or might swap implementations, use DIP. If it's stable, standard, or temporary, direct dependency acceptable. DIP is tool for managing change—apply where change is likely."*

---

## 🔟 Why & How Summary

### Why DIP Matters

**Flexibility:**
- Swap database MySQL → PostgreSQL without changing business logic
- A/B test payment providers (Stripe vs PayPal) in production
- Deploy same code with different infrastructure (cloud vs on-premise)
- Runtime configuration controls implementations

**Testability:**
- Mock abstractions without real infrastructure
- Tests run in milliseconds (no network calls)
- Test failure scenarios without calling external APIs
- 100% test coverage possible
- Tests independent of infrastructure availability

**Decoupling:**
- High-level business logic isolated from low-level details
- Changes to infrastructure don't affect business logic
- Teams work independently (parallel development)
- Compile-time dependencies minimized
- Runtime flexibility maximized

**Business Value:**
- Faster development (mockable dependencies)
- Lower maintenance costs (isolated changes)
- Better testing (fast, reliable tests)
- Easier migrations (swap implementations)
- Vendor independence (not locked to specific providers)

### How to Apply DIP

**Design Phase:**
1. Identify high-level modules (business logic)
2. Identify low-level modules (infrastructure, frameworks)
3. Define abstractions at layer boundaries
4. Make high-level depend on abstractions
5. Make low-level implement abstractions

**Refactoring:**
1. Extract interface from concrete class
2. Change type declarations to interface
3. Inject via constructor (dependency injection)
4. Create implementations implementing interface
5. Wire dependencies with Spring/configuration

**Prevention:**
1. Never use 'new' for infrastructure in business logic
2. Always inject dependencies via constructor
3. Declare dependencies as interfaces
4. Keep abstractions in business logic package
5. Keep implementations in infrastructure package

### Dependency Injection Patterns

```java
// ❌ BAD: Create dependencies
class OrderService {
    private Database db = new MySQLDatabase();
}

// ✓ GOOD: Inject dependencies
class OrderService {
    private Database db;
    
    OrderService(Database db) { // Constructor injection
        this.db = db;
    }
}

// ✓ GOOD: Spring auto-wires
@Service
class OrderService {
    private final Database db;
    
    @Autowired
    OrderService(Database db) {
        this.db = db;
    }
}
```

### Interview Red Flags

🚫 "Interfaces add unnecessary complexity"
✅ "Interfaces enable flexibility, testability, and decoupling"

🚫 "We don't need abstraction, we only have one implementation"
✅ "We need abstraction for testing and future flexibility"

🚫 "DIP is same as dependency injection"
✅ "DIP is principle (depend on abstractions), DI is technique (inject dependencies)"

### Final Sound Bite

*"Dependency Inversion Principle says high-level modules shouldn't depend on low-level modules—both should depend on abstractions. Instead of OrderService creating new MySQLDatabase() (direct dependency), define Database interface, make OrderService depend on Database, make MySQLDatabase implement Database, inject via constructor.*

*This inverts traditional dependency direction. Without DIP: OrderService → MySQLDatabase (high-level depends on low-level). With DIP: OrderService → Database ← MySQLDatabase (both depend on abstraction).*

*Benefits: flexibility (swap MySQL for PostgreSQL by changing configuration), testability (mock Database interface, no real database needed), decoupling (changes to MySQL don't affect OrderService), maintainability (business logic stable, infrastructure changes isolated).*

*Real production impact: tests 5 seconds → 50 milliseconds (100x faster), eliminated flaky tests (no network calls), enabled A/B testing payment providers (Stripe vs PayPal, 3% conversion increase), reduced vendor lock-in.*

*DIP is foundation of clean architecture. Without abstractions, you have rigid, untestable, tightly-coupled system. With abstractions, you have flexible, testable, decoupled system. DIP enables all other SOLID principles—provides abstraction layer they build on."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
