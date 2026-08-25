# 176. Tight Coupling vs Loose Coupling

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Coupling**: The degree of interdependence between software modules. How much one module knows about and depends on another module.

**Tight Coupling**: Modules are highly dependent on each other. Changes in one module require changes in dependent modules.

**Loose Coupling**: Modules are independent. Changes in one module have minimal impact on others.

### Core Concept

**What it means:**
- **Tight Coupling**: Classes directly depend on concrete implementations
- **Loose Coupling**: Classes depend on abstractions (interfaces)
- **Goal**: Minimize dependencies between modules
- **Benefit**: Changes are localized, not cascading

**Simple analogy:**
- **Tight Coupling**: Hardwired lamp directly soldered to wall socket—change socket, must rewire lamp
- **Loose Coupling**: Lamp with plug and standard outlet—swap lamp or outlet independently
- Standard interface (plug/outlet) enables independence

**In code:**
```java
// TIGHT COUPLING: Class depends on concrete implementation ❌
class OrderService {
    private MySQLDatabase database; // Direct dependency on MySQL!
    
    public OrderService() {
        this.database = new MySQLDatabase(); // Creates concrete object!
    }
    
    public void saveOrder(Order order) {
        database.saveToMySQL(order); // MySQL-specific method!
    }
}

// Problems:
// - Cannot use PostgreSQL without changing OrderService
// - Cannot test without real MySQL
// - OrderService knows MySQL implementation details
// - Changes to MySQLDatabase affect OrderService

// LOOSE COUPLING: Class depends on abstraction ✓
class OrderService {
    private Database database; // Depends on interface!
    
    public OrderService(Database database) { // Injected!
        this.database = database;
    }
    
    public void saveOrder(Order order) {
        database.save(order); // Generic method!
    }
}

interface Database {
    void save(Order order);
}

class MySQLDatabase implements Database { /* MySQL implementation */ }
class PostgreSQLDatabase implements Database { /* PostgreSQL implementation */ }

// Benefits:
// ✓ Can swap MySQL for PostgreSQL without changing OrderService
// ✓ Can test with MockDatabase
// ✓ OrderService doesn't know implementation details
// ✓ Changes to MySQLDatabase don't affect OrderService
```

### Why Loose Coupling Matters

**Code Quality Benefits:**
- **Maintainability**: Changes localized to one module
- **Testability**: Mock dependencies easily
- **Reusability**: Modules work in different contexts
- **Flexibility**: Swap implementations without rewriting
- **Parallel Development**: Teams work independently

**Business Impact:**
- Faster feature development (independent modules)
- Lower maintenance costs (no cascading changes)
- Easier testing (mock dependencies)
- Technology upgrades simpler (swap components)
- Team scalability (parallel work)

**Signs of Tight Coupling:**
- Using `new` to create dependencies
- Importing concrete classes instead of interfaces
- Static method calls
- Hard-coded configuration
- Circular dependencies
- Changes in one class break many others

**Role in interviews:**
- FAANG asks: "This class has tight coupling—refactor it"
- Design questions: "How do you decouple these services?"
- Expects understanding of dependency injection, interfaces, abstractions

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔴 Classic Tight Coupling: E-commerce Order System

#### Example 1: Tightly Coupled Order Processing

```java
// BAD: Tightly coupled order service ❌

public class OrderService {
    
    // Direct dependencies on concrete classes (tight coupling!)
    private MySQLOrderRepository orderRepository;
    private StripePaymentGateway paymentGateway;
    private SendGridEmailService emailService;
    private TwilioSmsService smsService;
    private S3StorageService storageService;
    private RedisCache cache;
    
    public OrderService() {
        // Creating concrete instances directly (very tight coupling!)
        this.orderRepository = new MySQLOrderRepository(
            "jdbc:mysql://localhost:3306/orders",
            "root",
            "password"
        );
        
        this.paymentGateway = new StripePaymentGateway(
            "sk_test_4eC39HqLyjWDarjtT1zdp7dc"
        );
        
        this.emailService = new SendGridEmailService(
            "SG.abc123xyz789",
            "noreply@company.com"
        );
        
        this.smsService = new TwilioSmsService(
            "ACxxxxxxxxxxxxxxxxxxxxx",
            "auth_token_xxxxxxx",
            "+1234567890"
        );
        
        this.storageService = new S3StorageService(
            "us-east-1",
            "my-bucket",
            "AKIAIOSFODNN7EXAMPLE",
            "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        );
        
        this.cache = new RedisCache("localhost", 6379);
    }
    
    public void createOrder(OrderRequest request) {
        // Validate order
        if (request.getTotal().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Invalid order total");
        }
        
        // Check cache using Redis-specific API
        String cacheKey = "order:" + request.getCustomerId();
        String cachedData = cache.get(cacheKey);
        if (cachedData != null) {
            // Handle cached order
        }
        
        // Process payment using Stripe-specific API
        StripeChargeRequest chargeRequest = new StripeChargeRequest();
        chargeRequest.setAmount(request.getTotal().multiply(new BigDecimal("100")).longValue());
        chargeRequest.setCurrency("usd");
        chargeRequest.setCustomer(request.getCustomerId());
        
        StripeChargeResponse chargeResponse = paymentGateway.charge(chargeRequest);
        
        if (!chargeResponse.getStatus().equals("succeeded")) {
            throw new PaymentFailedException("Payment failed: " + chargeResponse.getError());
        }
        
        // Create order entity
        Order order = new Order();
        order.setId(UUID.randomUUID().toString());
        order.setCustomerId(request.getCustomerId());
        order.setTotal(request.getTotal());
        order.setPaymentId(chargeResponse.getChargeId());
        order.setStatus("PAID");
        order.setCreatedAt(LocalDateTime.now());
        
        // Save using MySQL-specific API
        String sql = "INSERT INTO orders (id, customer_id, total, payment_id, status, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?)";
        orderRepository.executeUpdate(sql, 
            order.getId(),
            order.getCustomerId(),
            order.getTotal(),
            order.getPaymentId(),
            order.getStatus(),
            order.getCreatedAt()
        );
        
        // Send email using SendGrid-specific API
        SendGridEmail email = new SendGridEmail();
        email.setFrom(new EmailAddress("noreply@company.com"));
        email.addTo(new EmailAddress(request.getCustomerEmail()));
        email.setSubject("Order Confirmation");
        email.setContent(new Content("text/html", buildEmailHtml(order)));
        email.setTemplateId("d-abc123"); // SendGrid-specific template ID
        
        SendGridResponse emailResponse = emailService.send(email);
        if (emailResponse.getStatusCode() >= 400) {
            // Email failed, but order already created!
            System.err.println("Email failed: " + emailResponse.getBody());
        }
        
        // Send SMS using Twilio-specific API
        TwilioMessage smsMessage = new TwilioMessage();
        smsMessage.setFrom("+1234567890");
        smsMessage.setTo(request.getCustomerPhone());
        smsMessage.setBody("Your order #" + order.getId() + " is confirmed!");
        
        TwilioResponse smsResponse = smsService.send(smsMessage);
        if (!smsResponse.getStatus().equals("sent")) {
            System.err.println("SMS failed: " + smsResponse.getError());
        }
        
        // Upload receipt to S3 using AWS-specific API
        String receiptContent = generateReceiptPdf(order);
        S3PutRequest putRequest = new S3PutRequest();
        putRequest.setBucket("my-bucket");
        putRequest.setKey("receipts/" + order.getId() + ".pdf");
        putRequest.setContent(receiptContent.getBytes());
        putRequest.setContentType("application/pdf");
        putRequest.setStorageClass("STANDARD");
        
        storageService.put(putRequest);
        
        // Update cache
        cache.set(cacheKey, order.getId(), 3600); // Redis-specific TTL parameter
    }
    
    private String buildEmailHtml(Order order) {
        return "<html><body>Order confirmed</body></html>";
    }
    
    private String generateReceiptPdf(Order order) {
        return "Receipt content";
    }
}

// ═══════════════════════════════════════════════════════════
// Problems with this tightly coupled design:
// ═══════════════════════════════════════════════════════════

// 1. CANNOT CHANGE IMPLEMENTATIONS
//    - Want to switch from Stripe to PayPal? Rewrite OrderService
//    - Want to switch from MySQL to PostgreSQL? Rewrite OrderService
//    - Want to switch from SendGrid to AWS SES? Rewrite OrderService
//    - Every vendor change requires changing OrderService

// 2. CANNOT TEST
//    - Test requires real MySQL, Stripe, SendGrid, Twilio, S3, Redis
//    - Cannot test payment failures without calling Stripe API
//    - Cannot test email failures without calling SendGrid API
//    - Tests are slow (network calls), expensive (API calls), flaky (network issues)

// 3. HARD-CODED CONFIGURATION
//    - API keys, connection strings, phone numbers all in code
//    - Cannot change environment without recompiling
//    - Security risk (credentials in source code)
//    - Different configs for dev/staging/prod require code changes

// 4. VIOLATES SOLID PRINCIPLES
//    - Single Responsibility: OrderService handles orders + payment + email + SMS + storage + cache
//    - Open-Closed: Cannot extend without modifying OrderService
//    - Dependency Inversion: Depends on concrete classes, not abstractions

// 5. PARALLEL DEVELOPMENT IMPOSSIBLE
//    - All developers must work on same OrderService class
//    - Merge conflicts every day
//    - Cannot develop payment, email, SMS modules independently

// 6. VENDOR LOCK-IN
//    - Entire system locked to Stripe, SendGrid, Twilio, AWS
//    - Migration to different vendors requires rewriting core business logic
//    - Cannot A/B test alternative providers

// 7. CASCADING CHANGES
//    - StripePaymentGateway API changes → OrderService must change
//    - MySQLOrderRepository changes → OrderService must change
//    - Any dependency change forces OrderService rewrite

// 8. RUNTIME INFLEXIBILITY
//    - Cannot switch implementations at runtime
//    - Cannot use different storage in different regions
//    - Cannot fallback to alternative payment gateway

// This is EXTREMELY TIGHTLY COUPLED. Every module knows implementation
// details of every other module. Changes ripple through entire system.
```

#### Loose Coupling Solution: Decoupled Architecture

```java
// GOOD: Loosely coupled order service ✓

// ═══════════════════════════════════════════════════════════
// STEP 1: Define abstractions (interfaces)
// ═══════════════════════════════════════════════════════════

public interface OrderRepository {
    void save(Order order);
    Optional<Order> findById(String orderId);
    List<Order> findByCustomerId(String customerId);
}

public interface PaymentGateway {
    PaymentResult processPayment(PaymentRequest request);
    void refund(String transactionId);
}

public interface EmailService {
    void sendOrderConfirmation(Order order, String recipientEmail);
    void sendShippingNotification(Order order, String trackingNumber);
}

public interface SmsService {
    void sendOrderConfirmation(Order order, String phoneNumber);
}

public interface StorageService {
    void uploadReceipt(String orderId, byte[] content);
    byte[] downloadReceipt(String orderId);
}

public interface CacheService {
    Optional<String> get(String key);
    void set(String key, String value, int ttlSeconds);
    void delete(String key);
}

// ═══════════════════════════════════════════════════════════
// STEP 2: Loosely coupled service depends on abstractions
// ═══════════════════════════════════════════════════════════

@Service
public class OrderService {
    
    // Depend on INTERFACES, not concrete classes (loose coupling!)
    private final OrderRepository orderRepository;
    private final PaymentGateway paymentGateway;
    private final EmailService emailService;
    private final SmsService smsService;
    private final StorageService storageService;
    private final CacheService cacheService;
    
    // Dependencies INJECTED via constructor
    @Autowired
    public OrderService(
        OrderRepository orderRepository,
        PaymentGateway paymentGateway,
        EmailService emailService,
        SmsService smsService,
        StorageService storageService,
        CacheService cacheService
    ) {
        this.orderRepository = orderRepository;
        this.paymentGateway = paymentGateway;
        this.emailService = emailService;
        this.smsService = smsService;
        this.storageService = storageService;
        this.cacheService = cacheService;
    }
    
    public void createOrder(OrderRequest request) {
        // Validate
        validateOrderRequest(request);
        
        // Check cache (using generic interface, not Redis-specific API)
        String cacheKey = "order:recent:" + request.getCustomerId();
        Optional<String> cachedOrderId = cacheService.get(cacheKey);
        
        if (cachedOrderId.isPresent()) {
            throw new DuplicateOrderException("Recent order exists: " + cachedOrderId.get());
        }
        
        // Process payment (using generic interface, not Stripe-specific API)
        PaymentRequest paymentRequest = PaymentRequest.builder()
            .customerId(request.getCustomerId())
            .amount(request.getTotal())
            .currency("USD")
            .description("Order payment")
            .build();
        
        PaymentResult paymentResult = paymentGateway.processPayment(paymentRequest);
        
        if (!paymentResult.isSuccessful()) {
            throw new PaymentFailedException("Payment failed: " + paymentResult.getErrorMessage());
        }
        
        // Create order
        Order order = Order.builder()
            .id(UUID.randomUUID().toString())
            .customerId(request.getCustomerId())
            .total(request.getTotal())
            .paymentId(paymentResult.getTransactionId())
            .status(OrderStatus.PAID)
            .createdAt(LocalDateTime.now())
            .build();
        
        // Save (using generic interface, not MySQL-specific API)
        orderRepository.save(order);
        
        // Send notifications (using generic interfaces)
        emailService.sendOrderConfirmation(order, request.getCustomerEmail());
        smsService.sendOrderConfirmation(order, request.getCustomerPhone());
        
        // Upload receipt (using generic interface, not S3-specific API)
        byte[] receipt = generateReceiptPdf(order);
        storageService.uploadReceipt(order.getId(), receipt);
        
        // Update cache
        cacheService.set(cacheKey, order.getId(), 3600);
    }
    
    private void validateOrderRequest(OrderRequest request) {
        if (request.getTotal().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order total must be positive");
        }
    }
    
    private byte[] generateReceiptPdf(Order order) {
        // Receipt generation logic
        return new byte[0];
    }
}

// ═══════════════════════════════════════════════════════════
// STEP 3: Concrete implementations (separately maintained)
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
    public List<Order> findByCustomerId(String customerId) {
        return entityManager.createQuery(
            "SELECT o FROM Order o WHERE o.customerId = :customerId",
            Order.class
        )
        .setParameter("customerId", customerId)
        .getResultList();
    }
}

@Service
public class StripePaymentGateway implements PaymentGateway {
    
    @Value("${stripe.api.key}")
    private String apiKey;
    
    private Stripe stripeClient;
    
    @PostConstruct
    public void init() {
        this.stripeClient = new Stripe(apiKey);
    }
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        try {
            Charge charge = stripeClient.charges.create(
                Map.of(
                    "amount", request.getAmount().multiply(new BigDecimal("100")).longValue(),
                    "currency", request.getCurrency().toLowerCase(),
                    "customer", request.getCustomerId(),
                    "description", request.getDescription()
                )
            );
            
            return PaymentResult.builder()
                .successful(true)
                .transactionId(charge.getId())
                .build();
                
        } catch (StripeException e) {
            return PaymentResult.builder()
                .successful(false)
                .errorMessage(e.getMessage())
                .build();
        }
    }
    
    @Override
    public void refund(String transactionId) {
        try {
            stripeClient.refunds.create(Map.of("charge", transactionId));
        } catch (StripeException e) {
            throw new RefundFailedException("Stripe refund failed", e);
        }
    }
}

@Service
public class SendGridEmailService implements EmailService {
    
    @Autowired
    private SendGridClient sendGridClient;
    
    @Value("${email.from}")
    private String fromEmail;
    
    @Override
    public void sendOrderConfirmation(Order order, String recipientEmail) {
        Email from = new Email(fromEmail);
        Email to = new Email(recipientEmail);
        String subject = "Order Confirmation #" + order.getId();
        Content content = new Content(
            "text/html",
            buildOrderConfirmationHtml(order)
        );
        
        Mail mail = new Mail(from, subject, to, content);
        
        try {
            sendGridClient.send(mail);
        } catch (IOException e) {
            throw new EmailSendException("Failed to send email", e);
        }
    }
    
    @Override
    public void sendShippingNotification(Order order, String trackingNumber) {
        // Shipping email implementation
    }
    
    private String buildOrderConfirmationHtml(Order order) {
        return String.format(
            "<html><body><h1>Order Confirmed</h1><p>Order ID: %s</p></body></html>",
            order.getId()
        );
    }
}

@Service
public class TwilioSmsService implements SmsService {
    
    @Value("${twilio.account.sid}")
    private String accountSid;
    
    @Value("${twilio.auth.token}")
    private String authToken;
    
    @Value("${twilio.phone.number}")
    private String fromPhoneNumber;
    
    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
    }
    
    @Override
    public void sendOrderConfirmation(Order order, String phoneNumber) {
        try {
            Message.creator(
                new PhoneNumber(phoneNumber),
                new PhoneNumber(fromPhoneNumber),
                "Your order #" + order.getId() + " has been confirmed!"
            ).create();
        } catch (ApiException e) {
            throw new SmsSendException("Failed to send SMS", e);
        }
    }
}

@Service
public class S3StorageService implements StorageService {
    
    @Autowired
    private AmazonS3 s3Client;
    
    @Value("${aws.s3.bucket}")
    private String bucketName;
    
    @Override
    public void uploadReceipt(String orderId, byte[] content) {
        String key = "receipts/" + orderId + ".pdf";
        
        ObjectMetadata metadata = new ObjectMetadata();
        metadata.setContentLength(content.length);
        metadata.setContentType("application/pdf");
        
        s3Client.putObject(
            bucketName,
            key,
            new ByteArrayInputStream(content),
            metadata
        );
    }
    
    @Override
    public byte[] downloadReceipt(String orderId) {
        String key = "receipts/" + orderId + ".pdf";
        S3Object s3Object = s3Client.getObject(bucketName, key);
        
        try {
            return s3Object.getObjectContent().readAllBytes();
        } catch (IOException e) {
            throw new StorageException("Failed to download receipt", e);
        }
    }
}

@Service
public class RedisCache implements CacheService {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @Override
    public Optional<String> get(String key) {
        String value = redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(value);
    }
    
    @Override
    public void set(String key, String value, int ttlSeconds) {
        redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
    }
    
    @Override
    public void delete(String key) {
        redisTemplate.delete(key);
    }
}

// ═══════════════════════════════════════════════════════════
// STEP 4: Alternative implementations (easy to swap!)
// ═══════════════════════════════════════════════════════════

@Service
@Profile("paypal")
public class PayPalPaymentGateway implements PaymentGateway {
    // PayPal implementation
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // PayPal API calls
        return PaymentResult.builder().successful(true).build();
    }
    
    @Override
    public void refund(String transactionId) {
        // PayPal refund
    }
}

@Service
@Profile("ses")
public class AwsSesEmailService implements EmailService {
    // AWS SES implementation
    
    @Override
    public void sendOrderConfirmation(Order order, String recipientEmail) {
        // AWS SES API calls
    }
    
    @Override
    public void sendShippingNotification(Order order, String trackingNumber) {
        // AWS SES shipping notification
    }
}

@Service
@Profile("test")
public class MockPaymentGateway implements PaymentGateway {
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // Always succeeds in tests
        return PaymentResult.builder()
            .successful(true)
            .transactionId("test-" + UUID.randomUUID())
            .build();
    }
    
    @Override
    public void refund(String transactionId) {
        // No-op in tests
    }
}

// ═══════════════════════════════════════════════════════════
// STEP 5: Testing is trivial with loose coupling
// ═══════════════════════════════════════════════════════════

@ExtendWith(MockitoExtension.class)
public class OrderServiceTest {
    
    @Mock
    private OrderRepository orderRepository;
    
    @Mock
    private PaymentGateway paymentGateway;
    
    @Mock
    private EmailService emailService;
    
    @Mock
    private SmsService smsService;
    
    @Mock
    private StorageService storageService;
    
    @Mock
    private CacheService cacheService;
    
    @InjectMocks
    private OrderService orderService;
    
    @Test
    public void testCreateOrder_Success() {
        // Arrange
        OrderRequest request = OrderRequest.builder()
            .customerId("cust-123")
            .total(new BigDecimal("100.00"))
            .customerEmail("customer@example.com")
            .customerPhone("+1234567890")
            .build();
        
        when(cacheService.get(anyString())).thenReturn(Optional.empty());
        
        PaymentResult paymentResult = PaymentResult.builder()
            .successful(true)
            .transactionId("pay-456")
            .build();
        when(paymentGateway.processPayment(any(PaymentRequest.class)))
            .thenReturn(paymentResult);
        
        // Act
        orderService.createOrder(request);
        
        // Assert
        verify(orderRepository).save(any(Order.class));
        verify(emailService).sendOrderConfirmation(any(Order.class), eq("customer@example.com"));
        verify(smsService).sendOrderConfirmation(any(Order.class), eq("+1234567890"));
        verify(storageService).uploadReceipt(anyString(), any(byte[].class));
        verify(cacheService).set(anyString(), anyString(), eq(3600));
    }
    
    @Test
    public void testCreateOrder_PaymentFailure() {
        // Arrange
        OrderRequest request = OrderRequest.builder()
            .customerId("cust-123")
            .total(new BigDecimal("100.00"))
            .build();
        
        when(cacheService.get(anyString())).thenReturn(Optional.empty());
        
        PaymentResult paymentResult = PaymentResult.builder()
            .successful(false)
            .errorMessage("Insufficient funds")
            .build();
        when(paymentGateway.processPayment(any(PaymentRequest.class)))
            .thenReturn(paymentResult);
        
        // Act & Assert
        assertThrows(PaymentFailedException.class, () -> {
            orderService.createOrder(request);
        });
        
        verify(orderRepository, never()).save(any(Order.class));
        verify(emailService, never()).sendOrderConfirmation(any(), anyString());
    }
}

// ═══════════════════════════════════════════════════════════
// Benefits of loose coupling
// ═══════════════════════════════════════════════════════════

// ✓ EASY TO CHANGE IMPLEMENTATIONS
//   - Switch Stripe → PayPal: Change @Profile, zero code changes
//   - Switch MySQL → PostgreSQL: Change configuration, zero code changes
//   - Switch SendGrid → AWS SES: Change @Profile, zero code changes

// ✓ EASY TO TEST
//   - Mock all dependencies
//   - Tests run in milliseconds (no network calls)
//   - Test payment failures without calling Stripe
//   - 100% test coverage possible

// ✓ CONFIGURATION EXTERNALIZED
//   - API keys in application.properties
//   - Different configs for dev/staging/prod
//   - No recompilation needed

// ✓ FOLLOWS SOLID PRINCIPLES
//   - Single Responsibility: OrderService handles orders only
//   - Open-Closed: Extend with new implementations
//   - Dependency Inversion: Depends on abstractions

// ✓ PARALLEL DEVELOPMENT
//   - Team A works on OrderService
//   - Team B works on StripePaymentGateway
//   - Team C works on SendGridEmailService
//   - No merge conflicts

// ✓ NO VENDOR LOCK-IN
//   - Can switch vendors anytime
//   - Can A/B test providers
//   - Can use different providers per region

// ✓ NO CASCADING CHANGES
//   - StripePaymentGateway changes don't affect OrderService
//   - OrderService depends on PaymentGateway interface
//   - Interface is stable

// ✓ RUNTIME FLEXIBILITY
//   - Spring profiles control which implementation loads
//   - Can switch implementations without redeployment
//   - Can use different implementations in different environments
```

---

### 🟢 Measuring Coupling

```java
// Metrics to measure coupling

// 1. AFFERENT COUPLING (Ca): Number of classes that depend on this class
// 2. EFFERENT COUPLING (Ce): Number of classes this class depends on
// 3. INSTABILITY (I): Ce / (Ca + Ce) — ranges from 0 (stable) to 1 (unstable)

// Example: Tightly coupled class
public class TightlyCoupledOrderService {
    private MySQLOrderRepository orderRepository;      // +1 Ce
    private StripePaymentGateway paymentGateway;      // +1 Ce
    private SendGridEmailService emailService;         // +1 Ce
    private TwilioSmsService smsService;              // +1 Ce
    private S3StorageService storageService;          // +1 Ce
    private RedisCache cache;                         // +1 Ce
    private LoggerUtil logger;                        // +1 Ce
    private ConfigManager config;                     // +1 Ce
    
    // Efferent Coupling (Ce) = 8
    // High Ce means class depends on many others (tight coupling)
    // Changes to any of these 8 classes can break TightlyCoupledOrderService
}

// Example: Loosely coupled class
public class LooselyCoupledOrderService {
    private OrderRepository orderRepository;           // +1 Ce (interface)
    private PaymentGateway paymentGateway;            // +1 Ce (interface)
    private EmailService emailService;                // +1 Ce (interface)
    private SmsService smsService;                    // +1 Ce (interface)
    private StorageService storageService;            // +1 Ce (interface)
    private CacheService cacheService;                // +1 Ce (interface)
    
    // Efferent Coupling (Ce) = 6 (all interfaces)
    // Depends on abstractions, not concrete classes
    // Changes to concrete implementations don't affect this class
}

// Coupling comparison:
// TightlyCoupledOrderService: 8 concrete dependencies
// LooselyCoupledOrderService: 6 interface dependencies
// 
// Impact:
// - Tight: Any change to 8 concrete classes potentially breaks OrderService
// - Loose: Changes to concrete implementations isolated by interfaces
```

---

### 🔵 Types of Coupling (From Worst to Best)

```java
// 1. CONTENT COUPLING (Worst)
//    One class modifies internal state of another class

public class ContentCouplingExample {
    public void breakEncapsulation(Order order) {
        // Directly accessing private field via reflection (terrible!)
        Field statusField = Order.class.getDeclaredField("status");
        statusField.setAccessible(true);
        statusField.set(order, "CANCELLED");
    }
}

// 2. COMMON COUPLING
//    Multiple classes share global data

public class GlobalState {
    public static Order currentOrder; // Global mutable state (bad!)
}

public class ServiceA {
    public void process() {
        GlobalState.currentOrder = new Order(); // Modifies global state
    }
}

public class ServiceB {
    public void handle() {
        Order order = GlobalState.currentOrder; // Reads global state
    }
}

// 3. EXTERNAL COUPLING
//    Dependency on external format or protocol

public class ExternalCouplingExample {
    public void saveOrder(Order order) {
        // Tightly coupled to XML format
        String xml = "<order>" +
                     "<id>" + order.getId() + "</id>" +
                     "<total>" + order.getTotal() + "</total>" +
                     "</order>";
        writeToFile(xml);
    }
}

// 4. CONTROL COUPLING
//    One class controls behavior of another via flag

public class ControlCouplingExample {
    public void processOrder(Order order, boolean useStripe) {
        if (useStripe) {
            // Stripe logic
        } else {
            // PayPal logic
        }
    }
}

// Better: Use strategy pattern
public class StrategyExample {
    public void processOrder(Order order, PaymentGateway gateway) {
        gateway.processPayment(order); // No control flag!
    }
}

// 5. STAMP COUPLING (DATA STRUCTURE COUPLING)
//    Classes share composite data structure

public class StampCouplingExample {
    public void processOrder(Order order) {
        // Uses only order.getTotal(), but receives entire Order object
        paymentGateway.charge(order); // Passes whole object
    }
}

// Better: Pass only needed data
public class BetterExample {
    public void processOrder(Order order) {
        // Pass only required data
        paymentGateway.charge(order.getTotal(), order.getCurrency());
    }
}

// 6. DATA COUPLING (Best)
//    Classes share only primitive data or simple objects

public class DataCouplingExample {
    public BigDecimal calculateTax(BigDecimal amount, String country) {
        // Only uses primitive data
        TaxRate rate = getTaxRate(country);
        return amount.multiply(rate.getPercentage());
    }
}

// 7. MESSAGE COUPLING (Best)
//    Classes communicate via messages (loose coupling)

public class MessageCouplingExample {
    private EventPublisher eventPublisher;
    
    public void processOrder(Order order) {
        // Process order
        order.setStatus(OrderStatus.PAID);
        
        // Publish event (loose coupling!)
        eventPublisher.publish(new OrderPaidEvent(order.getId()));
        
        // No direct dependency on email service, SMS service, etc.
        // Event subscribers handle their own logic
    }
}

// Coupling ranking (worst to best):
// 1. Content Coupling ❌❌❌
// 2. Common Coupling ❌❌
// 3. External Coupling ❌
// 4. Control Coupling ⚠️
// 5. Stamp Coupling ⚠️
// 6. Data Coupling ✓
// 7. Message Coupling ✓✓
```

---

## ────────────────────────────────────
## 3️⃣ Real-World Production Examples
## ────────────────────────────────────

### Example 1: Spring Framework - Loose Coupling by Design

```java
// Spring Framework is built on loose coupling principles

// Application depends on interfaces, not implementations
@Service
public class UserService {
    
    // Depends on interface (loose coupling)
    private final UserRepository userRepository;
    
    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    public User createUser(String username, String email) {
        User user = new User(username, email);
        return userRepository.save(user);
    }
}

// Interface defined by application
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}

// Spring Data JPA provides implementation at runtime
// UserService never knows about JPA implementation details
// Can swap JPA for MongoDB by changing interface:
//   public interface UserRepository extends MongoRepository<User, String>

// Loose coupling enables:
// - Testing with mocks
// - Swapping data stores
// - Multiple implementations
```

### Example 2: JDBC - Database Abstraction

```java
// JDBC is classic example of loose coupling

// Application code depends on interfaces
Connection connection = dataSource.getConnection();
PreparedStatement statement = connection.prepareStatement(
    "SELECT * FROM users WHERE id = ?"
);
statement.setLong(1, userId);
ResultSet resultSet = statement.executeQuery();

// Works with any database:
// - MySQL: com.mysql.cj.jdbc.Driver
// - PostgreSQL: org.postgresql.Driver
// - Oracle: oracle.jdbc.driver.OracleDriver
// - SQL Server: com.microsoft.sqlserver.jdbc.SQLServerDriver

// Application depends on Connection, PreparedStatement, ResultSet interfaces
// Database vendors provide concrete implementations
// Switch databases without changing application code
```

### Example 3: SLF4J - Logging Facade

```java
// SLF4J provides loose coupling for logging

// Application depends on SLF4J interface
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
    
    public void createOrder(Order order) {
        logger.info("Creating order: {}", order.getId());
        // Business logic
        logger.debug("Order created successfully");
    }
}

// At runtime, bind to any implementation:
// - Logback (most common)
// - Log4j2
// - Java Util Logging
// - Simple Logger

// Change binding in pom.xml:
// <dependency>
//     <groupId>ch.qos.logback</groupId>
//     <artifactId>logback-classic</artifactId>
// </dependency>

// No code changes needed
// Loose coupling enables swapping logging frameworks
```

### Example 4: Microservices - Service-to-Service Communication

```java
// Loosely coupled microservices via REST APIs

// Order Service depends on abstraction
@Service
public class OrderService {
    
    // Depends on interface, not concrete HTTP client
    private final InventoryClient inventoryClient;
    
    @Autowired
    public OrderService(InventoryClient inventoryClient) {
        this.inventoryClient = inventoryClient;
    }
    
    public void createOrder(OrderRequest request) {
        // Check inventory via interface
        boolean available = inventoryClient.checkAvailability(
            request.getProductId(),
            request.getQuantity()
        );
        
        if (!available) {
            throw new OutOfStockException();
        }
        
        // Create order
    }
}

// Interface abstracts HTTP communication
public interface InventoryClient {
    boolean checkAvailability(String productId, int quantity);
    void reserveStock(String productId, int quantity);
}

// Feign implementation for production
@FeignClient(name = "inventory-service", url = "${inventory.service.url}")
public interface InventoryFeignClient extends InventoryClient {
    
    @GetMapping("/api/inventory/{productId}/availability")
    boolean checkAvailability(
        @PathVariable String productId,
        @RequestParam int quantity
    );
    
    @PostMapping("/api/inventory/{productId}/reserve")
    void reserveStock(
        @PathVariable String productId,
        @RequestBody int quantity
    );
}

// Mock implementation for testing
@Service
@Profile("test")
public class MockInventoryClient implements InventoryClient {
    
    @Override
    public boolean checkAvailability(String productId, int quantity) {
        return true; // Always available in tests
    }
    
    @Override
    public void reserveStock(String productId, int quantity) {
        // No-op in tests
    }
}

// Loose coupling enables:
// - Testing without real inventory service
// - Swapping Feign for RestTemplate
// - Using circuit breakers (wrap in Resilience4j decorator)
// - Service evolution (change inventory service implementation)
```

---

## ────────────────────────────────────
## 4️⃣ Interview Q&A (Behavioral Questions)
## ────────────────────────────────────

### Q1: "What is tight coupling vs loose coupling?"

**Answer:** *"Coupling measures how dependent modules are on each other. Tight coupling means modules are highly dependent—changes in one require changes in others. Loose coupling means modules are independent—changes in one don't affect others.*

*Tight coupling example: OrderService with private MySQLDatabase database = new MySQLDatabase(). OrderService directly creates and depends on MySQL concrete class. Cannot test without real MySQL. Cannot switch to PostgreSQL without rewriting OrderService. Change MySQLDatabase API, must change OrderService.*

*Loose coupling example: OrderService with private Database database injected via constructor. OrderService depends on Database interface, not concrete class. Inject MockDatabase for testing. Inject PostgreSQLDatabase for production. Change MySQL implementation, OrderService unchanged—protected by interface.*

*Key difference: Tight coupling depends on concrete classes (new MySQLDatabase()). Loose coupling depends on abstractions (Database interface). Loose coupling achieved through dependency injection and interfaces.*

*Benefits of loose coupling: testability (mock dependencies), flexibility (swap implementations), maintainability (changes localized), parallel development (teams work independently)."*

### Q2: "Give a real example where you refactored tight coupling to loose coupling"

**Answer:** *"At my company, OrderService was tightly coupled to Stripe payment gateway. Code had new StripePaymentGateway('api_key') directly in OrderService constructor. Stripe-specific API calls throughout—StripeChargeRequest, StripeChargeResponse, Stripe exception handling.*

*Problems: Cannot test without Stripe API. Tests were slow (5 seconds per test, real API calls). Cannot switch to PayPal without rewriting OrderService. Business wanted to A/B test Stripe vs PayPal—impossible with tight coupling.*

*I refactored to loose coupling. First, created PaymentGateway interface with processPayment() and refund() methods. Second, created StripePaymentGateway implementing PaymentGateway—encapsulated all Stripe details. Third, changed OrderService to accept PaymentGateway via constructor—dependency injection. Fourth, created MockPaymentGateway for tests—always returns success.*

*Configuration: Spring @Profile annotation. @Profile('stripe') on StripePaymentGateway, @Profile('paypal') on PayPalPaymentGateway, @Profile('test') on MockPaymentGateway.*

*Results: Tests now 50 milliseconds (100x faster, no API calls). Test coverage 30% → 90% (could test failures). Implemented PayPalPaymentGateway in 2 days (zero changes to OrderService). A/B test enabled: 50% users Stripe, 50% PayPal. Business chose PayPal (lower fees). Migration was changing configuration—zero code changes."*

### Q3: "How do you identify tight coupling in code reviews?"

**Answer:** *"I look for seven red flags:*

*First, 'new' keyword for dependencies. new MySQLDatabase() in service class means tight coupling to MySQL. Should inject via constructor.*

*Second, concrete type declarations. private MySQLDatabase database—depends on concrete class. Should be private Database database.*

*Third, imports of concrete classes. import com.mysql.jdbc.Driver in business logic—tight coupling to MySQL driver. Should import interface.*

*Fourth, static method calls. Util.sendEmail()—tight coupling to utility class. Should inject EmailService interface.*

*Fifth, hard-coded configuration. new Database('localhost', 3306)—connection details in code. Should externalize to application.properties.*

*Sixth, framework-specific code in business logic. Stripe API calls in OrderService—tight coupling to Stripe. Should abstract behind PaymentGateway interface.*

*Seventh, difficult testing. Test creates OrderService and fails with 'Connection refused'—proves tight coupling to real infrastructure.*

*When I find tight coupling, I suggest: Define interface for dependency. Inject via constructor. Implement interface separately. Configure with Spring. Test with mocks."*

### Q4: "What are the trade-offs of loose coupling?"

**Answer:** *"Loose coupling has costs, but benefits outweigh them:*

*Cost 1: More classes and interfaces. Tight coupling: 1 OrderService class. Loose coupling: OrderService + PaymentGateway interface + StripePaymentGateway + PayPalPaymentGateway + MockPaymentGateway—5 files vs 1.*

*Response: More files, but each is focused and testable. Alternative is one 2000-line OrderService with everything—unmaintainable.*

*Cost 2: Indirection. Method call goes through interface—orderService → paymentGateway → stripePaymentGateway. One extra level.*

*Response: JVM JIT compiler inlines these calls—no runtime cost after warm-up. Measured with profiler: <1% overhead.*

*Cost 3: Complexity for junior developers. Loose coupling requires understanding interfaces, dependency injection, Spring configuration.*

*Response: One-time learning curve. After understanding, loose coupling makes development faster—easier to test, change, extend.*

*Cost 4: Over-engineering risk. Can create too many abstractions for simple use cases.*

*Response: Apply pragmatically. Tight coupling acceptable for stable dependencies (Java standard library). Loose coupling for volatile dependencies (databases, APIs, infrastructure).*

*Real measurements: My team refactored from tight to loose coupling. Added 15 new files (interfaces + implementations). Development velocity increased 40% (easier testing, parallel development). Bug frequency decreased 60% (isolated changes). Worth the cost."*

### Q5: "How does loose coupling relate to SOLID principles?"

**Answer:** *"Loose coupling enables all SOLID principles:*

*Loose coupling + Dependency Inversion: DIP says depend on abstractions, not concretions. Loose coupling achieves this—OrderService depends on PaymentGateway interface (abstraction), not StripePaymentGateway (concretion). Tight coupling violates DIP—depends on concrete classes.*

*Loose coupling + Open-Closed: OCP says open for extension, closed for modification. Loose coupling enables this—add PayPalPaymentGateway without changing OrderService. Tight coupling violates OCP—adding PayPal requires modifying OrderService.*

*Loose coupling + Single Responsibility: SRP says one reason to change. Loose coupling supports this—OrderService changes only when order logic changes. Payment logic changes isolated to PaymentGateway implementations. Tight coupling violates SRP—Stripe API changes force OrderService changes.*

*Loose coupling + Interface Segregation: ISP says focused interfaces. Loose coupling uses this—PaymentGateway has processPayment() and refund(). Tight coupling leads to fat classes with many methods.*

*Loose coupling + Liskov Substitution: LSP says subtypes substitutable for base types. Loose coupling relies on this—any PaymentGateway works with OrderService. StripePaymentGateway, PayPalPaymentGateway, MockPaymentGateway all substitutable.*

*Loose coupling is foundation for SOLID. Without loose coupling, SOLID principles impossible to achieve. Tight coupling violates most SOLID principles by nature."*

### Q6: "When is tight coupling acceptable?"

**Answer:** *"Tight coupling acceptable in specific cases:*

*First, standard library dependencies. String, List, Map—no need to abstract Java standard library. These are stable, never changing, never swapping implementations. Over-abstraction adds complexity with zero benefit.*

*Second, framework core within framework layer. @RestController using HttpServletRequest—fine, controller is already framework-specific. No need to abstract Spring APIs in Spring layer.*

*Third, value objects and DTOs. Address, Money, Coordinate—just data, no behavior. No need for AddressInterface—never multiple implementations.*

*Fourth, utilities for simple operations. Math.abs(), UUID.randomUUID()—no need to inject MathService or UuidGenerator. Over-engineering.*

*Fifth, internal implementation details. Private helper methods calling each other within class—tight coupling within class boundary is fine.*

*Use loose coupling for volatile dependencies: External systems (databases, message queues, payment gateways). Third-party APIs (Stripe, Twilio, SendGrid). Infrastructure (file storage, email, SMS). Cross-cutting concerns (logging, monitoring, caching). Anything you might swap, mock, or change.*

*Rule of thumb: Loose coupling for dependencies crossing module boundaries. Tight coupling within module. Loose coupling for external/infrastructure dependencies. Tight coupling for language/standard library."*

---

## 🔟 Why & How Summary

### Why Loose Coupling Matters

**Maintainability:**
- Changes localized to one module
- No ripple effects through system
- Easier to understand (clear dependencies)
- Reduces cognitive load

**Testability:**
- Mock dependencies with interfaces
- Tests run fast (no real infrastructure)
- Test in isolation (no side effects)
- Higher test coverage achievable

**Flexibility:**
- Swap implementations without rewriting
- A/B test alternative providers
- Deploy different configs per environment
- Runtime configuration possible

**Team Scalability:**
- Parallel development (no conflicts)
- Clear module boundaries
- Independent deployment
- Team ownership of modules

**Business Value:**
- Faster feature development (independent modules)
- Lower maintenance costs (localized changes)
- Easier vendor switching (no lock-in)
- Technology upgrades simpler (swap components)

### How to Achieve Loose Coupling

**Design Phase:**
1. Define interfaces for dependencies
2. Program to interfaces, not implementations
3. Use dependency injection (constructor)
4. Externalize configuration
5. Avoid static methods and singletons

**Refactoring:**
1. Identify tightly coupled dependencies
2. Extract interface from concrete class
3. Change type declarations to interface
4. Inject via constructor
5. Create alternative implementations
6. Wire with Spring configuration

**Code Patterns:**
```java
// ❌ Tight Coupling
class Service {
    private MySQLRepo repo = new MySQLRepo();
}

// ✓ Loose Coupling
class Service {
    private Repository repo;
    Service(Repository repo) { this.repo = repo; }
}
```

### Interview Red Flags

🚫 "Interfaces add unnecessary complexity"
✅ "Interfaces enable testability, flexibility, and maintainability"

🚫 "We only have one implementation, don't need interface"
✅ "Interface enables testing with mocks and future flexibility"

🚫 "Loose coupling creates too many files"
✅ "Loose coupling creates focused, maintainable modules"

### Final Sound Bite

*"Tight coupling means modules highly dependent—OrderService creates new MySQLDatabase(), cannot test without real MySQL, cannot switch to PostgreSQL without rewriting. Loose coupling means modules independent—OrderService depends on Database interface, inject MySQLDatabase or PostgreSQLDatabase or MockDatabase via constructor.*

*Achieve loose coupling through dependency injection and abstractions. Define interfaces, inject via constructor, implement separately. Spring manages wiring. OrderService depends on PaymentGateway interface (abstraction), not StripePaymentGateway (concretion).*

*Benefits: testability (mock interfaces, tests run in milliseconds), flexibility (swap Stripe for PayPal by changing configuration), maintainability (changes to Stripe don't affect OrderService), parallel development (teams work independently).*

*Real impact: Refactored tightly coupled OrderService—tests 5 seconds → 50 milliseconds, test coverage 30% → 90%, added PayPal in 2 days with zero OrderService changes, A/B tested providers and switched based on data.*

*Loose coupling is foundation for SOLID, enables all five principles. Default to loose coupling for external dependencies—databases, APIs, infrastructure. Tight coupling acceptable only for stable dependencies—Java standard library, value objects, framework core in framework layer."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
