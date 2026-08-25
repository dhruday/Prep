# Topic 186: Facade Pattern

> **"A facade provides a simplified interface to a complex subsystem, making it easier to use."**

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

### What is the Facade Pattern?

The **Facade Pattern** provides a **unified, simplified interface** to a set of interfaces in a subsystem. It defines a **higher-level interface** that makes the subsystem **easier to use** by hiding its complexity.

Think of a facade like a **hotel concierge**:
- You don't need to know how to book restaurants, arrange transportation, schedule spa appointments
- You just tell the concierge what you want
- The concierge coordinates with all the underlying services
- You get a simple, unified experience

### The Core Problem: Subsystem Complexity

**Without Facade:**
```java
// Client must understand and coordinate multiple subsystems
PaymentValidator validator = new PaymentValidator();
FraudDetector fraudDetector = new FraudDetector();
PaymentGateway gateway = new PaymentGateway();
NotificationService notifications = new NotificationService();
AuditLogger auditLogger = new AuditLogger();

// Complex orchestration in every client
ValidationResult validationResult = validator.validate(payment);
if (!validationResult.isValid()) {
    throw new ValidationException(validationResult.getErrors());
}

FraudCheckResult fraudResult = fraudDetector.check(payment);
if (fraudResult.isFraudulent()) {
    auditLogger.logFraudAttempt(payment);
    throw new FraudException("Fraudulent transaction");
}

TransactionResult txResult = gateway.charge(payment);
if (txResult.isSuccess()) {
    auditLogger.logSuccess(payment);
    notifications.sendReceipt(payment.getUserId(), txResult);
} else {
    auditLogger.logFailure(payment, txResult.getError());
    throw new PaymentException(txResult.getError());
}

// Result: Complex, error-prone, duplicated across codebase
```

**With Facade:**
```java
// Simple, unified interface
PaymentFacade paymentFacade = new PaymentFacade();

// One method call hides all complexity
PaymentResult result = paymentFacade.processPayment(payment);

// Result: Simple, clean, consistent
```

The facade **doesn't remove complexity**—it **organizes and encapsulates** it, providing a clean API for common use cases.

### Three Core Benefits of Facade

#### 1. **Simplification**
```
Complex subsystem (10 classes, 50 methods)
           ↓
Facade (1 class, 5 high-level methods)
           ↓
Client code becomes 10x simpler
```

#### 2. **Decoupling**
```
Without Facade:
Client → knows about 10 subsystem classes
Client → tightly coupled to subsystem internals

With Facade:
Client → knows only Facade
Client → loosely coupled, subsystem can change independently
```

#### 3. **Consistency**
```
Without Facade:
- 20 places in codebase orchestrate payment logic
- Each slightly different
- Hard to maintain, bugs in variations

With Facade:
- 1 place (facade) orchestrates payment logic
- All clients use same logic
- Single source of truth, easy to maintain
```

### Real-World Analogy

**Travel Booking Website:**
```
User sees: Simple search form
           "Book flight + hotel + car for $1,200"
           Click "Book Now"

Behind the scenes (Facade coordinates):
1. Flight API → Search, reserve, book
2. Hotel API → Check availability, reserve, book
3. Car rental API → Check availability, reserve, book
4. Payment API → Validate, charge credit card
5. Email service → Send confirmation
6. Database → Store booking
7. Analytics → Track conversion

Facade = TravelBookingFacade
- hideComplexity(10+ APIs)
- provideSimpleInterface("bookTrip()")
- handleErrors(retry, fallback)
- ensureConsistency(all-or-nothing booking)
```

### When to Use Facade Pattern

| Scenario | Why Facade | Example |
|----------|------------|---------|
| **Complex subsystem** | Many classes, intricate dependencies | Payment processing (validation, fraud, gateway, audit) |
| **Multiple APIs** | Need to coordinate several services | Order fulfillment (inventory, shipping, billing) |
| **Legacy system** | Hide messy legacy code | Modernizing old codebase with clean facade |
| **Third-party libraries** | Simplify complex external APIs | AWS SDK (hundreds of methods → facade for common operations) |
| **Layered architecture** | Decouple layers | Service layer facade over DAOs |

### Facade vs Other Structural Patterns

All four structural patterns we've covered have distinct purposes:

```
┌────────────────────────────────────────────────────────────────┐
│ Pattern     │ Intent              │ Interface │ Example       │
├─────────────┼─────────────────────┼───────────┼───────────────┤
│ Adapter     │ Make incompatible   │ Different │ Stripe →      │
│             │ compatible          │           │ Payment       │
├─────────────┼─────────────────────┼───────────┼───────────────┤
│ Decorator   │ Add behavior        │ Same      │ Logging,      │
│             │ dynamically         │           │ caching       │
├─────────────┼─────────────────────┼───────────┼───────────────┤
│ Proxy       │ Control access      │ Same      │ Lazy loading, │
│             │                     │           │ security      │
├─────────────┼─────────────────────┼───────────┼───────────────┤
│ Facade      │ Simplify complex    │ New,      │ Payment       │
│             │ subsystem           │ unified   │ processing    │
└────────────────────────────────────────────────────────────────┘

Key Distinction:
- Adapter: 1 class → 1 adapted class (one-to-one translation)
- Decorator: 1 decorator → 1 wrapped object (adds behavior)
- Proxy: 1 proxy → 1 real object (controls access)
- Facade: 1 facade → MANY subsystem classes (simplifies many)
```

**Example:**
```java
// Adapter: One-to-one translation
StripeAdapter adapter = new StripeAdapter(stripeClient);
adapter.charge();  // Translates to stripeClient.createPaymentIntent()

// Decorator: One-to-one enhancement
LoggingService decorated = new LoggingDecorator(realService);
decorated.process();  // Adds logging, delegates to realService

// Proxy: One-to-one control
ImageProxy proxy = new ImageProxy(realImage);
proxy.display();  // Controls when realImage is loaded

// Facade: One-to-many simplification
PaymentFacade facade = new PaymentFacade(validator, fraudDetector, gateway, audit, notifications);
facade.processPayment();  // Coordinates all 5 subsystem components
```

### Types of Facades

#### 1. Simple Facade (Most Common)
```java
// Single unified interface to subsystem
public class PaymentFacade {
    public PaymentResult processPayment(Payment payment) {
        // Coordinate subsystem
    }
}
```

#### 2. Layered Facade
```java
// Facades at different abstraction levels
public class HighLevelFacade {
    private MidLevelFacade midLevel = new MidLevelFacade();
    
    public void doComplexOperation() {
        midLevel.doOperation();
    }
}

public class MidLevelFacade {
    private LowLevelSubsystem subsystem = new LowLevelSubsystem();
    
    public void doOperation() {
        subsystem.step1();
        subsystem.step2();
    }
}
```

#### 3. Configurable Facade
```java
// Facade with different strategies
public class NotificationFacade {
    public void sendNotification(Notification notification) {
        if (notification.isUrgent()) {
            sendSms();
            sendPush();
            sendEmail();
        } else {
            sendEmail();
        }
    }
}
```

### Interview Red Flags to Avoid

❌ **"Facade is just a wrapper class"** → Too vague; it's specifically for simplifying complex subsystems with MANY classes

❌ **Confusing Facade with Adapter** → Adapter translates one interface, Facade simplifies many

❌ **Thinking Facade hides all subsystem access** → Optional; clients can still access subsystem directly if needed

❌ **Not discussing trade-offs** → Facade adds a layer, reduces flexibility for advanced users

✅ **What interviewers want to hear:**
- "Facade provides a simplified interface to a complex subsystem with many classes and dependencies"
- "It doesn't remove complexity, it organizes it—subsystem still exists, just easier to use"
- "Examples: Spring's JdbcTemplate (facade over JDBC), payment processing, booking systems"
- "Trade-off: Simplicity for common cases vs flexibility for advanced users"

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Core Structure of Facade Pattern

```
┌──────────────────────────────────────────────────────────────┐
│                      Facade Pattern                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌──────────────┐                         │
│                    │    Client    │                         │
│                    └──────┬───────┘                         │
│                           │                                  │
│                           │ uses simple interface            │
│                           ▼                                  │
│                    ┌──────────────┐                         │
│                    │    Facade    │                         │
│                    │              │                         │
│                    │ + operation()│                         │
│                    └──────┬───────┘                         │
│                           │                                  │
│                           │ coordinates                      │
│                           ▼                                  │
│         ┌─────────────────┴─────────────────┐              │
│         │                                     │              │
│         ▼                                     ▼              │
│  ┌──────────────┐                    ┌──────────────┐      │
│  │ Subsystem A  │                    │ Subsystem B  │      │
│  │              │                    │              │      │
│  │ + methodA1() │                    │ + methodB1() │      │
│  │ + methodA2() │                    │ + methodB2() │      │
│  └──────┬───────┘                    └──────┬───────┘      │
│         │                                    │              │
│         │      ┌──────────────┐             │              │
│         └─────►│ Subsystem C  │◄────────────┘              │
│                │              │                             │
│                │ + methodC1() │                             │
│                │ + methodC2() │                             │
│                └──────────────┘                             │
│                                                              │
│  Key Points:                                                 │
│  1. Client only knows Facade                                │
│  2. Facade knows all subsystems                             │
│  3. Subsystems don't know about Facade                      │
│  4. Client CAN access subsystems directly (optional)        │
│  5. Facade provides convenient default behavior             │
└──────────────────────────────────────────────────────────────┘
```

### Deep Dive: Payment Processing Facade

#### Problem: Complex Payment Workflow

```java
// Payment processing involves many steps and subsystems:
// 1. Validation (amount, card number, expiry, CVV)
// 2. Fraud detection (ML model, rules engine, blacklist check)
// 3. Payment gateway (Stripe, PayPal, Square)
// 4. Retry logic (transient errors)
// 5. Audit logging (compliance, debugging)
// 6. Notifications (receipt, confirmation)
// 7. Analytics (conversion tracking)

// Without facade: Every controller/service repeats this logic
@RestController
public class OrderController {
    @Autowired private PaymentValidator validator;
    @Autowired private FraudDetector fraudDetector;
    @Autowired private StripeGateway stripeGateway;
    @Autowired private AuditLogger auditLogger;
    @Autowired private EmailService emailService;
    @Autowired private MetricsCollector metrics;
    
    @PostMapping("/orders")
    public OrderResponse createOrder(OrderRequest request) {
        // Step 1: Validation (10 lines)
        ValidationResult validation = validator.validate(request.getPayment());
        if (!validation.isValid()) {
            auditLogger.logValidationFailure(request);
            throw new ValidationException(validation.getErrors());
        }
        
        // Step 2: Fraud detection (15 lines)
        FraudCheckResult fraudCheck = fraudDetector.checkTransaction(
            request.getPayment(),
            request.getUserId(),
            request.getIpAddress()
        );
        if (fraudCheck.isFraudulent()) {
            auditLogger.logFraudAttempt(request);
            metrics.incrementFraudCounter();
            throw new FraudException("Transaction blocked");
        }
        
        // Step 3: Payment processing with retry (20 lines)
        PaymentResult paymentResult = null;
        int attempts = 0;
        while (attempts < 3) {
            try {
                paymentResult = stripeGateway.charge(
                    request.getPayment().getAmount(),
                    request.getPayment().getCardToken()
                );
                break;
            } catch (TransientException e) {
                attempts++;
                if (attempts >= 3) {
                    auditLogger.logPaymentFailure(request, e);
                    throw new PaymentException("Payment failed after 3 attempts");
                }
                Thread.sleep(1000 * attempts); // Exponential backoff
            }
        }
        
        // Step 4: Post-processing (10 lines)
        if (paymentResult.isSuccess()) {
            auditLogger.logPaymentSuccess(request, paymentResult);
            emailService.sendReceipt(request.getUserId(), paymentResult);
            metrics.recordSuccessfulPayment(paymentResult.getAmount());
        }
        
        // Create order...
        return new OrderResponse(order);
    }
}

// Problems:
// ❌ 55+ lines just for payment processing
// ❌ Duplicated in CheckoutController, SubscriptionController, RefundController
// ❌ Hard to test (7 dependencies to mock)
// ❌ Hard to maintain (change validation? Update 4 places)
// ❌ Inconsistent (each place slightly different)
```

#### Solution: Payment Facade

```java
// Facade: Encapsulates entire payment workflow
@Component
public class PaymentFacade {
    private final PaymentValidator validator;
    private final FraudDetector fraudDetector;
    private final PaymentGateway gateway;
    private final AuditLogger auditLogger;
    private final NotificationService notificationService;
    private final MetricsCollector metrics;
    private final RetryTemplate retryTemplate;
    
    @Autowired
    public PaymentFacade(
            PaymentValidator validator,
            FraudDetector fraudDetector,
            PaymentGateway gateway,
            AuditLogger auditLogger,
            NotificationService notificationService,
            MetricsCollector metrics,
            RetryTemplate retryTemplate) {
        this.validator = validator;
        this.fraudDetector = fraudDetector;
        this.gateway = gateway;
        this.auditLogger = auditLogger;
        this.notificationService = notificationService;
        this.metrics = metrics;
        this.retryTemplate = retryTemplate;
    }
    
    /**
     * Process payment with full validation, fraud detection, and retry logic.
     * 
     * @param payment Payment details
     * @return PaymentResult with transaction ID and status
     * @throws ValidationException if payment validation fails
     * @throws FraudException if transaction is flagged as fraudulent
     * @throws PaymentException if payment processing fails
     */
    public PaymentResult processPayment(Payment payment) {
        logger.info("Processing payment for user {}, amount {}", 
            payment.getUserId(), payment.getAmount());
        
        long startTime = System.currentTimeMillis();
        
        try {
            // Step 1: Validate payment
            validatePayment(payment);
            
            // Step 2: Fraud detection
            checkFraud(payment);
            
            // Step 3: Charge with retry
            PaymentResult result = chargeWithRetry(payment);
            
            // Step 4: Post-processing
            handleSuccess(payment, result);
            
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Payment processed successfully in {}ms: {}", duration, result.getTransactionId());
            
            return result;
            
        } catch (Exception e) {
            handleFailure(payment, e);
            throw e;
        }
    }
    
    /**
     * Process refund for a previous payment.
     */
    public RefundResult processRefund(String transactionId, BigDecimal amount) {
        logger.info("Processing refund for transaction {}, amount {}", transactionId, amount);
        
        try {
            // Validate refund request
            validateRefund(transactionId, amount);
            
            // Execute refund with retry
            RefundResult result = retryTemplate.execute(context -> 
                gateway.refund(transactionId, amount)
            );
            
            // Audit and notify
            auditLogger.logRefund(transactionId, amount, result);
            notificationService.sendRefundConfirmation(transactionId, result);
            metrics.recordRefund(amount);
            
            return result;
            
        } catch (Exception e) {
            auditLogger.logRefundFailure(transactionId, amount, e);
            throw new RefundException("Refund failed", e);
        }
    }
    
    // Private helper methods (encapsulate complexity)
    
    private void validatePayment(Payment payment) {
        ValidationResult validation = validator.validate(payment);
        if (!validation.isValid()) {
            auditLogger.logValidationFailure(payment, validation);
            metrics.incrementValidationErrors();
            throw new ValidationException("Payment validation failed: " + validation.getErrors());
        }
    }
    
    private void checkFraud(Payment payment) {
        FraudCheckResult fraudCheck = fraudDetector.check(payment);
        if (fraudCheck.isFraudulent()) {
            auditLogger.logFraudAttempt(payment, fraudCheck);
            metrics.incrementFraudDetections();
            
            // Block user if multiple fraud attempts
            if (fraudCheck.getFraudScore() > 0.9) {
                fraudDetector.blockUser(payment.getUserId());
            }
            
            throw new FraudException("Transaction blocked: " + fraudCheck.getReason());
        }
    }
    
    private PaymentResult chargeWithRetry(Payment payment) {
        return retryTemplate.execute(context -> {
            try {
                PaymentResult result = gateway.charge(
                    payment.getAmount(),
                    payment.getCardToken(),
                    payment.getCurrency()
                );
                return result;
                
            } catch (TransientException e) {
                logger.warn("Payment attempt {} failed: {}", 
                    context.getRetryCount() + 1, e.getMessage());
                throw e; // RetryTemplate will retry
            }
        });
    }
    
    private void handleSuccess(Payment payment, PaymentResult result) {
        auditLogger.logPaymentSuccess(payment, result);
        notificationService.sendPaymentReceipt(payment.getUserId(), result);
        metrics.recordSuccessfulPayment(payment.getAmount());
    }
    
    private void handleFailure(Payment payment, Exception e) {
        auditLogger.logPaymentFailure(payment, e);
        metrics.incrementPaymentErrors();
        
        if (e instanceof FraudException) {
            notificationService.sendFraudAlert(payment.getUserId());
        }
    }
    
    private void validateRefund(String transactionId, BigDecimal amount) {
        // Check transaction exists
        PaymentResult original = gateway.getTransaction(transactionId);
        if (original == null) {
            throw new ValidationException("Transaction not found: " + transactionId);
        }
        
        // Check refund amount
        if (amount.compareTo(original.getAmount()) > 0) {
            throw new ValidationException("Refund amount exceeds original payment");
        }
        
        // Check refund window (90 days)
        if (original.getTimestamp().isBefore(LocalDateTime.now().minusDays(90))) {
            throw new ValidationException("Refund window expired");
        }
    }
}

// Now clients are dramatically simpler:
@RestController
public class OrderController {
    @Autowired private PaymentFacade paymentFacade;  // Single dependency
    
    @PostMapping("/orders")
    public OrderResponse createOrder(OrderRequest request) {
        // 1 line for payment processing (was 55 lines)
        PaymentResult paymentResult = paymentFacade.processPayment(request.getPayment());
        
        // Create order...
        Order order = orderService.createOrder(request, paymentResult);
        return new OrderResponse(order);
    }
}

@RestController
public class SubscriptionController {
    @Autowired private PaymentFacade paymentFacade;  // Reuse same facade
    
    @PostMapping("/subscriptions")
    public SubscriptionResponse subscribe(SubscriptionRequest request) {
        // Same simple interface
        PaymentResult paymentResult = paymentFacade.processPayment(request.getPayment());
        
        // Create subscription...
        return new SubscriptionResponse(subscription);
    }
}

// Benefits:
// ✅ Client code reduced from 55 lines to 1 line
// ✅ Consistent payment logic across all endpoints
// ✅ Easy to test (mock PaymentFacade, or test facade with mocked subsystems)
// ✅ Easy to maintain (change validation? Update facade only)
// ✅ Easy to extend (add new payment provider? Change facade implementation)
```

### Advanced: Layered Facade with Service Layer

Real applications often have multiple facade layers:

```java
// Layer 1: Low-level subsystem (DAOs, external APIs)
@Repository
public class UserRepository {
    public User findById(Long id) { /* JDBC */ }
    public void save(User user) { /* JDBC */ }
}

@Repository
public class OrderRepository {
    public Order findById(Long id) { /* JDBC */ }
    public List<Order> findByUserId(Long userId) { /* JDBC */ }
}

@Component
public class StripeGateway {
    public PaymentResult charge(Payment payment) { /* Stripe API */ }
}

// Layer 2: Service layer (Business logic facade)
@Service
public class OrderService {
    @Autowired private OrderRepository orderRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private PaymentFacade paymentFacade;  // Facade over payment subsystem
    @Autowired private InventoryService inventoryService;
    @Autowired private ShippingService shippingService;
    
    @Transactional
    public Order createOrder(OrderRequest request) {
        // Service layer is a facade over domain operations
        User user = userRepo.findById(request.getUserId());
        
        // Validate inventory
        inventoryService.reserveItems(request.getItems());
        
        // Process payment
        PaymentResult paymentResult = paymentFacade.processPayment(request.getPayment());
        
        // Create order
        Order order = new Order(user, request.getItems(), paymentResult);
        orderRepo.save(order);
        
        // Schedule shipping
        shippingService.scheduleDelivery(order);
        
        return order;
    }
}

// Layer 3: Controller (HTTP facade)
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    @Autowired private OrderService orderService;  // Facade over business logic
    
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) {
        // Controller is a facade over services
        Order order = orderService.createOrder(request);
        return ResponseEntity.ok(new OrderResponse(order));
    }
}

// Three layers of facades:
// 1. PaymentFacade: Simplifies payment subsystem (validation, fraud, gateway, audit)
// 2. OrderService: Simplifies order creation (inventory, payment, persistence, shipping)
// 3. OrderController: Simplifies HTTP interface (request/response mapping, status codes)
```

### Facade with Multiple Implementations

Facades can have different implementations for different environments:

```java
// Interface (optional but useful)
public interface NotificationFacade {
    void sendOrderConfirmation(Order order);
    void sendPaymentReceipt(Payment payment);
    void sendShippingUpdate(Shipment shipment);
}

// Production implementation: Multi-channel notifications
@Component
@Profile("prod")
public class MultiChannelNotificationFacade implements NotificationFacade {
    @Autowired private EmailService emailService;
    @Autowired private SmsService smsService;
    @Autowired private PushNotificationService pushService;
    
    @Override
    public void sendOrderConfirmation(Order order) {
        // Send via all channels
        emailService.send(order.getUserEmail(), "Order Confirmation", buildEmail(order));
        smsService.send(order.getUserPhone(), buildSms(order));
        pushService.send(order.getUserId(), buildPush(order));
    }
    
    @Override
    public void sendPaymentReceipt(Payment payment) {
        emailService.send(payment.getUserEmail(), "Payment Receipt", buildReceipt(payment));
    }
    
    @Override
    public void sendShippingUpdate(Shipment shipment) {
        smsService.send(shipment.getPhone(), "Your package is on the way!");
        pushService.send(shipment.getUserId(), "Shipment tracking: " + shipment.getTrackingNumber());
    }
}

// Development implementation: Log-only notifications
@Component
@Profile("dev")
public class LoggingNotificationFacade implements NotificationFacade {
    
    @Override
    public void sendOrderConfirmation(Order order) {
        logger.info("Would send order confirmation to user {}: {}", order.getUserId(), order.getId());
    }
    
    @Override
    public void sendPaymentReceipt(Payment payment) {
        logger.info("Would send payment receipt to user {}: ${}", 
            payment.getUserId(), payment.getAmount());
    }
    
    @Override
    public void sendShippingUpdate(Shipment shipment) {
        logger.info("Would send shipping update to user {}: {}", 
            shipment.getUserId(), shipment.getTrackingNumber());
    }
}

// Test implementation: Capture notifications for verification
@Component
@Profile("test")
public class InMemoryNotificationFacade implements NotificationFacade {
    private final List<Notification> sentNotifications = new ArrayList<>();
    
    @Override
    public void sendOrderConfirmation(Order order) {
        sentNotifications.add(new Notification("ORDER_CONFIRMATION", order.getUserId()));
    }
    
    public List<Notification> getSentNotifications() {
        return new ArrayList<>(sentNotifications);
    }
    
    public void clear() {
        sentNotifications.clear();
    }
}

// Client code doesn't change across environments
@Service
public class OrderService {
    @Autowired private NotificationFacade notificationFacade;  // Injected based on profile
    
    public Order createOrder(OrderRequest request) {
        // ... create order ...
        
        // Same code works in all environments
        notificationFacade.sendOrderConfirmation(order);
        
        return order;
    }
}
```

### Facade with Builder Pattern

Complex facades benefit from builders for configuration:

```java
// Facade with many optional configurations
public class ReportFacade {
    private final ReportGenerator generator;
    private final DataAggregator aggregator;
    private final ChartRenderer chartRenderer;
    private final PdfExporter pdfExporter;
    private final EmailService emailService;
    
    private final boolean includeCharts;
    private final boolean exportToPdf;
    private final boolean sendEmail;
    private final String emailRecipient;
    
    // Private constructor (use builder)
    private ReportFacade(Builder builder) {
        this.generator = builder.generator;
        this.aggregator = builder.aggregator;
        this.chartRenderer = builder.chartRenderer;
        this.pdfExporter = builder.pdfExporter;
        this.emailService = builder.emailService;
        this.includeCharts = builder.includeCharts;
        this.exportToPdf = builder.exportToPdf;
        this.sendEmail = builder.sendEmail;
        this.emailRecipient = builder.emailRecipient;
    }
    
    public Report generateReport(ReportRequest request) {
        // Aggregate data
        ReportData data = aggregator.aggregate(request);
        
        // Generate report
        Report report = generator.generate(data);
        
        // Optional: Add charts
        if (includeCharts) {
            List<Chart> charts = chartRenderer.render(data);
            report.setCharts(charts);
        }
        
        // Optional: Export to PDF
        if (exportToPdf) {
            byte[] pdf = pdfExporter.export(report);
            report.setPdfBytes(pdf);
        }
        
        // Optional: Send via email
        if (sendEmail && emailRecipient != null) {
            emailService.sendReport(emailRecipient, report);
        }
        
        return report;
    }
    
    // Builder for flexible configuration
    public static class Builder {
        private final ReportGenerator generator;
        private final DataAggregator aggregator;
        private ChartRenderer chartRenderer;
        private PdfExporter pdfExporter;
        private EmailService emailService;
        private boolean includeCharts = false;
        private boolean exportToPdf = false;
        private boolean sendEmail = false;
        private String emailRecipient;
        
        public Builder(ReportGenerator generator, DataAggregator aggregator) {
            this.generator = generator;
            this.aggregator = aggregator;
        }
        
        public Builder withCharts(ChartRenderer chartRenderer) {
            this.chartRenderer = chartRenderer;
            this.includeCharts = true;
            return this;
        }
        
        public Builder withPdfExport(PdfExporter pdfExporter) {
            this.pdfExporter = pdfExporter;
            this.exportToPdf = true;
            return this;
        }
        
        public Builder withEmailDelivery(EmailService emailService, String recipient) {
            this.emailService = emailService;
            this.emailRecipient = recipient;
            this.sendEmail = true;
            return this;
        }
        
        public ReportFacade build() {
            return new ReportFacade(this);
        }
    }
}

// Usage: Flexible configuration
ReportFacade basicReportFacade = new ReportFacade.Builder(generator, aggregator)
    .build();

ReportFacade fullReportFacade = new ReportFacade.Builder(generator, aggregator)
    .withCharts(chartRenderer)
    .withPdfExport(pdfExporter)
    .withEmailDelivery(emailService, "reports@company.com")
    .build();

Report basicReport = basicReportFacade.generateReport(request);
Report fullReport = fullReportFacade.generateReport(request);
```

### Facade vs Direct Subsystem Access

Key principle: **Facade doesn't prevent direct access to subsystems.**

```java
// Good practice: Allow both facade and direct access
@Configuration
public class PaymentConfig {
    
    @Bean
    public PaymentValidator paymentValidator() {
        return new PaymentValidator();  // Available for direct use
    }
    
    @Bean
    public FraudDetector fraudDetector() {
        return new FraudDetector();  // Available for direct use
    }
    
    @Bean
    public PaymentGateway paymentGateway() {
        return new StripeGateway();  // Available for direct use
    }
    
    @Bean
    public PaymentFacade paymentFacade(
            PaymentValidator validator,
            FraudDetector fraudDetector,
            PaymentGateway gateway,
            AuditLogger auditLogger,
            NotificationService notificationService) {
        return new PaymentFacade(validator, fraudDetector, gateway, auditLogger, notificationService);
    }
}

// Most clients use facade (simple, common use case)
@Service
public class OrderService {
    @Autowired private PaymentFacade paymentFacade;
    
    public Order createOrder(OrderRequest request) {
        PaymentResult result = paymentFacade.processPayment(request.getPayment());
        // ...
    }
}

// Advanced clients can bypass facade (custom workflow)
@Service
public class SubscriptionService {
    @Autowired private PaymentValidator validator;
    @Autowired private PaymentGateway gateway;
    // Not using facade because subscription has custom logic
    
    public Subscription createSubscription(SubscriptionRequest request) {
        // Custom validation (different from standard payment)
        validator.validateRecurring(request.getPayment());
        
        // Setup recurring payment
        String subscriptionId = gateway.createSubscription(
            request.getPayment(),
            request.getBillingCycle()
        );
        
        // ...
    }
}
```

**When to bypass facade:**
- Custom workflow not supported by facade
- Performance-critical code (facade adds slight overhead)
- Advanced features not exposed by facade
- Testing subsystem components in isolation

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Performance Impact of Facade

#### Overhead Analysis

**Scenario: E-commerce Payment Processing**

```
Without Facade (Direct calls):
= Client → Validator: 2ms
= Client → Fraud Detector: 50ms (ML model)
= Client → Gateway: 150ms (network call to Stripe)
= Client → Audit Logger: 5ms
= Client → Email Service: 100ms (SMTP)
──────────────
Total: 307ms

With Facade:
= Client → Facade: 0.1ms (method call)
= Facade → Validator: 2ms
= Facade → Fraud Detector: 50ms
= Facade → Gateway: 150ms
= Facade → Audit Logger: 5ms
= Facade → Email Service: 100ms
──────────────
Total: 307.1ms

Overhead: 0.1ms (0.03%)
Conclusion: Negligible overhead, massive benefits
```

**At scale (10,000 payments/second):**
```
Additional latency: 0.1ms per payment
= 10,000 × 0.1ms = 1,000ms = 1 CPU-second per second
= Requires 1 additional CPU core

Cost: ~$20/month
Benefit: 
- Simplified codebase (55 lines → 1 line per usage)
- Consistent logic (no bugs from variations)
- Easy to maintain (change in one place)
Verdict: ✅ Absolutely worth it
```

#### Memory Footprint

```java
// Facade instance size
PaymentFacade instance:
= 6 object references × 8 bytes = 48 bytes
= Total: ~50 bytes per facade instance

For singleton facade (Spring default):
= 50 bytes total (shared across all requests)
= Memory impact: Negligible

For instance-per-request (stateful facade):
= 50 bytes × 10,000 requests/sec × 5 sec average
= 2.5 MB active memory
= Still negligible on modern servers (GB+ heap)
```

### Scalability Benefits

**Before Facade: Code duplication across 10 services**

```
Payment logic duplicated in:
1. OrderController (55 lines)
2. SubscriptionController (55 lines)
3. RefundController (55 lines)
4. CheckoutController (55 lines)
5. DonationController (55 lines)
... 10 total

Total lines of code: 550 lines
Maintenance cost: 
- Bug fix = 10 places to update
- New feature = 10 places to add
- Testing = 10 sets of tests

Risk: Variations in implementations (bugs)
```

**After Facade: Centralized logic**

```
Payment logic in PaymentFacade: 150 lines (includes helpers)
10 services using facade: 10 lines total

Total lines of code: 160 lines (71% reduction)
Maintenance cost:
- Bug fix = 1 place to update
- New feature = 1 place to add
- Testing = 1 set of comprehensive tests

Risk: Zero (consistent behavior everywhere)

Developer time saved:
= 550 lines → 160 lines (390 lines eliminated)
= 390 lines / 50 lines per hour = 7.8 hours saved
= $100/hour × 7.8 hours = $780 saved upfront

Ongoing maintenance:
= 10 places → 1 place
= 10x faster to add features, fix bugs
= ~$5K saved per year in maintenance
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Database Facade Pattern

Facades are commonly used to simplify database access:

```java
// Problem: Complex JDBC code repeated everywhere
public class UserController {
    public User getUser(Long id) {
        String sql = "SELECT * FROM users WHERE id = ?";
        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setLong(1, id);
            ResultSet rs = stmt.executeQuery();
            
            if (rs.next()) {
                User user = new User();
                user.setId(rs.getLong("id"));
                user.setName(rs.getString("name"));
                user.setEmail(rs.getString("email"));
                // ... 20 more fields
                return user;
            }
            return null;
            
        } catch (SQLException e) {
            throw new DataAccessException("Failed to fetch user", e);
        }
    }
    // 50+ lines of boilerplate repeated for every query
}

// Solution: Spring JdbcTemplate (Facade over JDBC)
@Repository
public class UserRepository {
    @Autowired private JdbcTemplate jdbcTemplate;  // Facade
    
    public User findById(Long id) {
        String sql = "SELECT * FROM users WHERE id = ?";
        return jdbcTemplate.queryForObject(sql, new UserRowMapper(), id);
        // 2 lines instead of 50
    }
    
    public List<User> findAll() {
        return jdbcTemplate.query("SELECT * FROM users", new UserRowMapper());
    }
    
    public void save(User user) {
        String sql = "INSERT INTO users (name, email) VALUES (?, ?)";
        jdbcTemplate.update(sql, user.getName(), user.getEmail());
    }
}

// JdbcTemplate (Facade) hides:
// - Connection management (acquire, release, pool)
// - Exception translation (SQLException → DataAccessException)
// - Resource cleanup (close ResultSet, Statement, Connection)
// - Transaction management (if @Transactional)
```

### Multi-Database Facade

Facades can abstract over multiple databases:

```java
// Facade over multiple storage systems
@Service
public class UserStorageFacade {
    @Autowired private MySQLUserRepository mySqlRepo;  // Primary storage
    @Autowired private RedisTemplate<String, User> redisTemplate;  // Cache
    @Autowired private ElasticsearchRepository elasticRepo;  // Search
    
    public User findById(Long id) {
        // 1. Check cache first
        String cacheKey = "user:" + id;
        User cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            logger.debug("Cache hit for user {}", id);
            return cached;
        }
        
        // 2. Query database
        User user = mySqlRepo.findById(id);
        if (user == null) {
            return null;
        }
        
        // 3. Populate cache
        redisTemplate.opsForValue().set(cacheKey, user, 1, TimeUnit.HOURS);
        
        return user;
    }
    
    public List<User> search(String query) {
        // Use Elasticsearch for search
        return elasticRepo.findByNameOrEmail(query);
    }
    
    public void save(User user) {
        // 1. Save to MySQL (source of truth)
        mySqlRepo.save(user);
        
        // 2. Update cache
        redisTemplate.opsForValue().set("user:" + user.getId(), user, 1, TimeUnit.HOURS);
        
        // 3. Index in Elasticsearch (async)
        CompletableFuture.runAsync(() -> elasticRepo.save(user));
    }
    
    public void delete(Long id) {
        // 1. Delete from MySQL
        mySqlRepo.deleteById(id);
        
        // 2. Invalidate cache
        redisTemplate.delete("user:" + id);
        
        // 3. Remove from Elasticsearch
        elasticRepo.deleteById(id);
    }
}

// Client code is simple and storage-agnostic
@Service
public class UserService {
    @Autowired private UserStorageFacade storageFacade;
    
    public User getUser(Long id) {
        return storageFacade.findById(id);  // Don't care about cache, DB, search
    }
    
    public List<User> searchUsers(String query) {
        return storageFacade.search(query);  // Automatically uses Elasticsearch
    }
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Facade with Resilience Patterns

Production facades should include resilience:

```java
// Resilient booking facade with fallback
@Service
public class BookingFacade {
    @Autowired private FlightService flightService;
    @Autowired private HotelService hotelService;
    @Autowired private CarRentalService carRentalService;
    @Autowired private PaymentFacade paymentFacade;
    
    private final CircuitBreaker circuitBreaker;
    private final RetryTemplate retryTemplate;
    
    public BookingFacade(CircuitBreakerRegistry circuitBreakerRegistry) {
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("booking");
        this.retryTemplate = createRetryTemplate();
    }
    
    /**
     * Book complete trip with automatic rollback on failure.
     */
    @Transactional
    public BookingResult bookTrip(TripRequest request) {
        logger.info("Booking trip for user {}: {} → {}", 
            request.getUserId(), request.getOrigin(), request.getDestination());
        
        BookingResult result = new BookingResult();
        
        try {
            // Step 1: Reserve flight (with retry)
            FlightReservation flightReservation = reserveFlightWithRetry(request);
            result.setFlightReservation(flightReservation);
            
            // Step 2: Reserve hotel (with retry)
            HotelReservation hotelReservation = reserveHotelWithRetry(request);
            result.setHotelReservation(hotelReservation);
            
            // Step 3: Reserve car (with retry, optional)
            if (request.isCarRentalRequested()) {
                try {
                    CarReservation carReservation = reserveCarWithRetry(request);
                    result.setCarReservation(carReservation);
                } catch (Exception e) {
                    // Car rental failure is non-critical
                    logger.warn("Car rental failed, continuing without car: {}", e.getMessage());
                    result.setCarReservationError(e.getMessage());
                }
            }
            
            // Step 4: Calculate total cost
            BigDecimal totalCost = calculateTotalCost(result);
            
            // Step 5: Process payment
            PaymentResult paymentResult = paymentFacade.processPayment(
                new Payment(request.getUserId(), totalCost, request.getPaymentMethod())
            );
            result.setPaymentResult(paymentResult);
            
            // Step 6: Confirm all reservations
            confirmReservations(result);
            
            logger.info("Trip booked successfully: {}", result.getBookingId());
            return result;
            
        } catch (Exception e) {
            // Rollback all reservations
            logger.error("Booking failed, rolling back reservations", e);
            rollbackReservations(result);
            throw new BookingException("Failed to book trip", e);
        }
    }
    
    private FlightReservation reserveFlightWithRetry(TripRequest request) {
        return circuitBreaker.executeSupplier(() ->
            retryTemplate.execute(context -> {
                logger.info("Reserving flight (attempt {})", context.getRetryCount() + 1);
                return flightService.reserve(
                    request.getOrigin(),
                    request.getDestination(),
                    request.getDepartureDate()
                );
            })
        );
    }
    
    private HotelReservation reserveHotelWithRetry(TripRequest request) {
        return circuitBreaker.executeSupplier(() ->
            retryTemplate.execute(context -> {
                logger.info("Reserving hotel (attempt {})", context.getRetryCount() + 1);
                return hotelService.reserve(
                    request.getDestination(),
                    request.getCheckInDate(),
                    request.getCheckOutDate()
                );
            })
        );
    }
    
    private CarReservation reserveCarWithRetry(TripRequest request) {
        return retryTemplate.execute(context ->
            carRentalService.reserve(
                request.getDestination(),
                request.getCheckInDate(),
                request.getCheckOutDate()
            )
        );
    }
    
    private void confirmReservations(BookingResult result) {
        if (result.getFlightReservation() != null) {
            flightService.confirm(result.getFlightReservation().getId());
        }
        if (result.getHotelReservation() != null) {
            hotelService.confirm(result.getHotelReservation().getId());
        }
        if (result.getCarReservation() != null) {
            carRentalService.confirm(result.getCarReservation().getId());
        }
    }
    
    private void rollbackReservations(BookingResult result) {
        // Cancel in reverse order
        if (result.getCarReservation() != null) {
            try {
                carRentalService.cancel(result.getCarReservation().getId());
            } catch (Exception e) {
                logger.error("Failed to cancel car reservation", e);
            }
        }
        
        if (result.getHotelReservation() != null) {
            try {
                hotelService.cancel(result.getHotelReservation().getId());
            } catch (Exception e) {
                logger.error("Failed to cancel hotel reservation", e);
            }
        }
        
        if (result.getFlightReservation() != null) {
            try {
                flightService.cancel(result.getFlightReservation().getId());
            } catch (Exception e) {
                logger.error("Failed to cancel flight reservation", e);
            }
        }
    }
    
    private RetryTemplate createRetryTemplate() {
        RetryTemplate template = new RetryTemplate();
        
        FixedBackOffPolicy backOffPolicy = new FixedBackOffPolicy();
        backOffPolicy.setBackOffPeriod(2000);  // 2 seconds between retries
        template.setBackOffPolicy(backOffPolicy);
        
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(3);
        template.setRetryPolicy(retryPolicy);
        
        return template;
    }
}

// Resilience features:
// 1. Retry: Each service call retried up to 3 times
// 2. Circuit breaker: Fail fast if service is down
// 3. Partial failure: Car rental failure doesn't fail entire booking
// 4. Rollback: Automatic cancellation if any critical step fails
// 5. Transaction: @Transactional ensures database consistency
```

### Facade with Async Processing

```java
// Facade with async operations for performance
@Service
public class OrderFulfillmentFacade {
    @Autowired private InventoryService inventoryService;
    @Autowired private PaymentFacade paymentFacade;
    @Autowired private ShippingService shippingService;
    @Autowired private NotificationFacade notificationFacade;
    @Autowired private AnalyticsService analyticsService;
    
    @Async
    public CompletableFuture<OrderResult> fulfillOrder(Order order) {
        logger.info("Fulfilling order {}", order.getId());
        
        // Sequential critical path
        try {
            // 1. Reserve inventory (critical)
            InventoryReservation reservation = inventoryService.reserve(order.getItems());
            
            // 2. Process payment (critical)
            PaymentResult paymentResult = paymentFacade.processPayment(order.getPayment());
            
            // 3. Schedule shipping (critical)
            Shipment shipment = shippingService.scheduleDelivery(order);
            
            // 4. Async non-critical tasks (run in parallel)
            CompletableFuture<Void> notificationFuture = CompletableFuture.runAsync(() ->
                notificationFacade.sendOrderConfirmation(order)
            );
            
            CompletableFuture<Void> analyticsFuture = CompletableFuture.runAsync(() ->
                analyticsService.trackOrderPlaced(order)
            );
            
            // Wait for non-critical tasks (with timeout)
            CompletableFuture.allOf(notificationFuture, analyticsFuture)
                .orTimeout(5, TimeUnit.SECONDS)
                .exceptionally(ex -> {
                    logger.warn("Non-critical task failed: {}", ex.getMessage());
                    return null;  // Don't fail order
                });
            
            OrderResult result = new OrderResult(order, paymentResult, shipment);
            logger.info("Order {} fulfilled successfully", order.getId());
            
            return CompletableFuture.completedFuture(result);
            
        } catch (Exception e) {
            logger.error("Order fulfillment failed: {}", order.getId(), e);
            return CompletableFuture.failedFuture(e);
        }
    }
}

// Benefits:
// - Critical path: 150ms (inventory + payment + shipping)
// - Non-critical (async): 200ms (notifications + analytics) doesn't block
// - Total user-facing latency: 150ms (vs 350ms if synchronous)
// - 57% faster response time
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Security Facade

```java
// Facade for centralized security operations
@Service
public class SecurityFacade {
    @Autowired private AuthenticationService authService;
    @Autowired private AuthorizationService authzService;
    @Autowired private AuditLogger auditLogger;
    @Autowired private RateLimiter rateLimiter;
    @Autowired private EncryptionService encryptionService;
    
    /**
     * Validate and authorize user request.
     */
    public SecurityContext validateRequest(HttpServletRequest request) {
        String userId = request.getHeader("X-User-Id");
        String authToken = request.getHeader("Authorization");
        String ipAddress = request.getRemoteAddr();
        
        // 1. Rate limiting
        if (!rateLimiter.allowRequest(ipAddress)) {
            auditLogger.logRateLimitExceeded(ipAddress);
            throw new RateLimitException("Too many requests");
        }
        
        // 2. Authentication
        User user = authService.authenticate(authToken);
        if (user == null) {
            auditLogger.logAuthenticationFailure(userId, ipAddress);
            throw new AuthenticationException("Invalid token");
        }
        
        // 3. Authorization
        String resource = request.getRequestURI();
        String action = request.getMethod();
        if (!authzService.hasPermission(user, resource, action)) {
            auditLogger.logAuthorizationFailure(user, resource, action);
            throw new AuthorizationException("Access denied");
        }
        
        // 4. Audit
        auditLogger.logAccessGranted(user, resource, action);
        
        return new SecurityContext(user);
    }
    
    /**
     * Encrypt sensitive data before storage.
     */
    public String encryptSensitiveData(String plaintext, DataClassification classification) {
        switch (classification) {
            case PII:
                return encryptionService.encryptWithKey(plaintext, "pii-key");
            case FINANCIAL:
                return encryptionService.encryptWithKey(plaintext, "financial-key");
            case PUBLIC:
                return plaintext;  // No encryption needed
            default:
                throw new IllegalArgumentException("Unknown classification");
        }
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Case Study 1: Spring Framework Facades

**System:** Spring Framework (90%+ Java enterprise market share)

**Problem:** JDBC, JMS, JPA are complex, low-level APIs with boilerplate code.

**Solution:** Spring provides facades that simplify common operations.

#### JdbcTemplate (Facade over JDBC)

```java
// Without JdbcTemplate (50+ lines of boilerplate)
public User findById(Long id) {
    Connection conn = null;
    PreparedStatement stmt = null;
    ResultSet rs = null;
    try {
        conn = dataSource.getConnection();
        stmt = conn.prepareStatement("SELECT * FROM users WHERE id = ?");
        stmt.setLong(1, id);
        rs = stmt.executeQuery();
        
        if (rs.next()) {
            User user = new User();
            user.setId(rs.getLong("id"));
            user.setName(rs.getString("name"));
            // ... map 20 more fields
            return user;
        }
        return null;
        
    } catch (SQLException e) {
        throw new DataAccessException("Query failed", e);
    } finally {
        if (rs != null) try { rs.close(); } catch (SQLException e) {}
        if (stmt != null) try { stmt.close(); } catch (SQLException e) {}
        if (conn != null) try { conn.close(); } catch (SQLException e) {}
    }
}

// With JdbcTemplate (2 lines)
public User findById(Long id) {
    return jdbcTemplate.queryForObject(
        "SELECT * FROM users WHERE id = ?",
        new BeanPropertyRowMapper<>(User.class),
        id
    );
}
```

**What JdbcTemplate (facade) hides:**
- Connection management
- Statement creation and cleanup
- ResultSet iteration and closing
- Exception translation
- Transaction management (with @Transactional)

**Results:**
- **90% less code** (50 lines → 2 lines)
- **Used by millions** of Java applications
- **Zero memory overhead** (stateless)
- **Standard pattern** in Spring ecosystem

---

### Case Study 2: AWS SDK Facades

**System:** AWS SDK (Amazon Web Services)

**Problem:** AWS APIs are massive (thousands of methods), complex, inconsistent.

**Solution:** Create facade for common workflows.

```java
// AWS S3 raw API (complex)
AmazonS3 s3Client = AmazonS3ClientBuilder.standard()
    .withRegion(Regions.US_EAST_1)
    .build();

// Upload file (10+ lines)
File file = new File("document.pdf");
PutObjectRequest putRequest = new PutObjectRequest("my-bucket", "documents/document.pdf", file);
ObjectMetadata metadata = new ObjectMetadata();
metadata.setContentType("application/pdf");
metadata.setContentLength(file.length());
putRequest.setMetadata(metadata);
PutObjectResult result = s3Client.putObject(putRequest);

// Download file (5+ lines)
S3Object s3Object = s3Client.getObject("my-bucket", "documents/document.pdf");
S3ObjectInputStream inputStream = s3Object.getObjectContent();
FileUtils.copyInputStreamToFile(inputStream, new File("downloaded.pdf"));

// Facade simplifies common operations
@Service
public class StorageFacade {
    @Autowired private AmazonS3 s3Client;
    @Value("${aws.s3.bucket}") private String bucket;
    
    public void uploadFile(String key, File file) {
        try {
            logger.info("Uploading file to S3: {}", key);
            s3Client.putObject(bucket, key, file);
            logger.info("Upload successful: {}", key);
        } catch (AmazonServiceException e) {
            throw new StorageException("Failed to upload file", e);
        }
    }
    
    public File downloadFile(String key) {
        try {
            logger.info("Downloading file from S3: {}", key);
            S3Object s3Object = s3Client.getObject(bucket, key);
            
            File tempFile = File.createTempFile("download-", ".tmp");
            FileUtils.copyInputStreamToFile(s3Object.getObjectContent(), tempFile);
            
            logger.info("Download successful: {}", key);
            return tempFile;
            
        } catch (IOException | AmazonServiceException e) {
            throw new StorageException("Failed to download file", e);
        }
    }
    
    public void deleteFile(String key) {
        s3Client.deleteObject(bucket, key);
    }
    
    public List<String> listFiles(String prefix) {
        ObjectListing listing = s3Client.listObjects(bucket, prefix);
        return listing.getObjectSummaries().stream()
            .map(S3ObjectSummary::getKey)
            .collect(Collectors.toList());
    }
}

// Client code (simple)
@Service
public class DocumentService {
    @Autowired private StorageFacade storageFacade;
    
    public void uploadDocument(Document document) {
        storageFacade.uploadFile("documents/" + document.getId(), document.getFile());
    }
}
```

**Results:**
- **10x simpler** client code
- **Consistent error handling** (single exception type)
- **Easy to switch providers** (change S3 to GCS by updating facade)
- **Company using this**: Airbnb, Netflix (internal storage facades)

---

### Case Study 3: Stripe Payment API Wrapper

**System:** Stripe (millions of businesses use Stripe)

**Problem:** Stripe API is powerful but complex (400+ methods).

**Solution:** Create payment facade for common e-commerce use cases.

```java
// Stripe raw API (complex)
Stripe.apiKey = "sk_test_...";

Map<String, Object> params = new HashMap<>();
params.put("amount", 2000);  // $20.00 in cents
params.put("currency", "usd");

Map<String, Object> cardParams = new HashMap<>();
cardParams.put("number", "4242424242424242");
cardParams.put("exp_month", 12);
cardParams.put("exp_year", 2025);
cardParams.put("cvc", "123");

Map<String, Object> tokenParams = new HashMap<>();
tokenParams.put("card", cardParams);
Token token = Token.create(tokenParams);

Map<String, Object> chargeParams = new HashMap<>();
chargeParams.put("amount", 2000);
chargeParams.put("currency", "usd");
chargeParams.put("source", token.getId());
chargeParams.put("description", "Order #12345");

Charge charge = Charge.create(chargeParams);

// Facade simplifies
@Service
public class StripePaymentFacade {
    @Value("${stripe.api.key}") private String apiKey;
    
    @PostConstruct
    public void init() {
        Stripe.apiKey = apiKey;
    }
    
    public PaymentResult chargeCard(PaymentRequest request) {
        try {
            // Create token
            Token token = createCardToken(request.getCard());
            
            // Create charge
            Map<String, Object> chargeParams = new HashMap<>();
            chargeParams.put("amount", request.getAmount().multiply(BigDecimal.valueOf(100)).intValue());
            chargeParams.put("currency", request.getCurrency().toLowerCase());
            chargeParams.put("source", token.getId());
            chargeParams.put("description", request.getDescription());
            chargeParams.put("metadata", request.getMetadata());
            
            Charge charge = Charge.create(chargeParams);
            
            return new PaymentResult(
                charge.getId(),
                charge.getStatus().equals("succeeded"),
                charge.getCreated()
            );
            
        } catch (StripeException e) {
            logger.error("Stripe payment failed: {}", e.getMessage());
            throw new PaymentException("Payment processing failed", e);
        }
    }
    
    public RefundResult refundPayment(String chargeId, BigDecimal amount) {
        try {
            Map<String, Object> refundParams = new HashMap<>();
            refundParams.put("charge", chargeId);
            if (amount != null) {
                refundParams.put("amount", amount.multiply(BigDecimal.valueOf(100)).intValue());
            }
            
            Refund refund = Refund.create(refundParams);
            
            return new RefundResult(refund.getId(), refund.getStatus());
            
        } catch (StripeException e) {
            throw new RefundException("Refund failed", e);
        }
    }
}

// Client code (simple, provider-agnostic)
@Service
public class CheckoutService {
    @Autowired private StripePaymentFacade paymentFacade;
    
    public Order checkout(CheckoutRequest request) {
        PaymentResult paymentResult = paymentFacade.chargeCard(
            new PaymentRequest(request.getAmount(), request.getCard())
        );
        
        return orderService.createOrder(request, paymentResult);
    }
}
```

**Results:**
- **Simplified integration** (50 lines → 5 lines)
- **Provider abstraction** (easy to switch from Stripe to PayPal)
- **Used by thousands** of e-commerce companies

---

### Case Study 4: Booking.com Travel Booking Facade

**System:** Booking.com (handles millions of bookings/day)

**Problem:** Booking involves multiple APIs (flights, hotels, cars, insurance, payment).

**Solution:** Unified booking facade.

```java
// Facade coordinates complex booking workflow
@Service
public class TravelBookingFacade {
    @Autowired private FlightSearchService flightSearch;
    @Autowired private HotelSearchService hotelSearch;
    @Autowired private CarRentalService carRental;
    @Autowired private InsuranceService insurance;
    @Autowired private PaymentFacade paymentFacade;
    @Autowired private EmailService emailService;
    
    @Transactional
    public BookingConfirmation bookCompleteTrip(TripRequest request) {
        logger.info("Booking trip: {} → {}", request.getOrigin(), request.getDestination());
        
        BookingConfirmation confirmation = new BookingConfirmation();
        
        try {
            // 1. Search and book flight
            List<Flight> flights = flightSearch.search(request.getFlightCriteria());
            Flight selectedFlight = flights.get(0);  // User's selection
            FlightBooking flightBooking = flightSearch.book(selectedFlight, request.getPassengers());
            confirmation.setFlightBooking(flightBooking);
            
            // 2. Search and book hotel
            List<Hotel> hotels = hotelSearch.search(request.getHotelCriteria());
            Hotel selectedHotel = hotels.get(0);
            HotelBooking hotelBooking = hotelSearch.book(selectedHotel, request.getCheckIn(), request.getCheckOut());
            confirmation.setHotelBooking(hotelBooking);
            
            // 3. Optional: Book car rental
            if (request.isCarRequested()) {
                CarBooking carBooking = carRental.book(request.getCarCriteria());
                confirmation.setCarBooking(carBooking);
            }
            
            // 4. Optional: Add travel insurance
            if (request.isInsuranceRequested()) {
                InsurancePolicy policy = insurance.purchase(request.getTripValue());
                confirmation.setInsurancePolicy(policy);
            }
            
            // 5. Calculate total and process payment
            BigDecimal totalCost = calculateTotalCost(confirmation);
            PaymentResult paymentResult = paymentFacade.processPayment(
                new Payment(request.getUserId(), totalCost, request.getPaymentMethod())
            );
            confirmation.setPaymentResult(paymentResult);
            
            // 6. Send confirmation email
            emailService.sendBookingConfirmation(request.getUserEmail(), confirmation);
            
            logger.info("Booking successful: {}", confirmation.getBookingId());
            return confirmation;
            
        } catch (Exception e) {
            logger.error("Booking failed, rolling back", e);
            rollbackBooking(confirmation);
            throw new BookingException("Failed to complete booking", e);
        }
    }
    
    private void rollbackBooking(BookingConfirmation confirmation) {
        if (confirmation.getFlightBooking() != null) {
            flightSearch.cancel(confirmation.getFlightBooking().getId());
        }
        if (confirmation.getHotelBooking() != null) {
            hotelSearch.cancel(confirmation.getHotelBooking().getId());
        }
        if (confirmation.getCarBooking() != null) {
            carRental.cancel(confirmation.getCarBooking().getId());
        }
    }
}
```

**Architecture:**
- **Subsystems**: 5+ external APIs (airlines, hotel chains, car companies, payment, email)
- **Facade**: Single `bookCompleteTrip()` method
- **Transaction**: All-or-nothing (if any step fails, rollback all)

**Results:**
- **User experience**: One-click booking (vs manual coordination of 5 services)
- **Consistency**: Same booking logic for all users
- **Reliability**: Automatic rollback on failure
- **Scale**: Handles millions of bookings/day

---

### Case Study 5: Netflix API Gateway (Zuul)

**System:** Netflix API Gateway (handles billions of requests/day)

**Problem:** Microservices architecture has 100+ backend services, each with unique APIs.

**Solution:** Zuul acts as facade for all backend services.

```
Client Request:
  GET /api/user/123/recommendations

Zuul (Facade):
  1. Authentication (check JWT token)
  2. Rate limiting (100 req/min per user)
  3. Route to user-service: GET /users/123
  4. Route to recommendation-service: GET /recommendations?userId=123
  5. Route to preference-service: GET /preferences/123
  6. Aggregate responses
  7. Return unified JSON

Client sees: Single API endpoint
Backend reality: 3 microservices called, aggregated by Zuul
```

**Zuul Facade Benefits:**
- **Single entry point**: Clients call one API (Zuul), not 100 microservices
- **Cross-cutting concerns**: Authentication, rate limiting, logging centralized
- **Aggregation**: Combine data from multiple services
- **Versioning**: Route /api/v1 and /api/v2 to different services
- **Failure isolation**: If one service fails, Zuul returns partial response

**Results:**
- **Billions of requests/day** handled
- **100+ backend services** hidden behind single facade
- **Sub-millisecond overhead** (<1ms for routing)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

**Interviewer:** "Explain the Facade pattern and when you'd use it."

**Strong Answer:**

"The Facade pattern provides a **simplified, unified interface** to a complex subsystem with many classes and intricate dependencies. The key word is **simplification**—the facade doesn't remove complexity, it organizes it, making common operations much easier for clients.

The classic example is payment processing. Without a facade, every place in your codebase that processes payments needs to coordinate: validation, fraud detection, calling the payment gateway, retry logic, audit logging, and sending receipts. That's 6+ subsystems, 50+ lines of code, duplicated everywhere. With a `PaymentFacade`, it's one method call: `paymentFacade.processPayment(payment)`. The facade handles all the orchestration internally.

**Facade vs related patterns:**

**Adapter** translates one interface to another (one-to-one). For example, adapting Stripe's API to your internal `PaymentGateway` interface.

**Proxy** controls access to a single object (also one-to-one). For example, lazy loading an expensive object or adding security checks.

**Facade** simplifies access to many objects (one-to-many). It's about reducing complexity for common use cases, not translation or access control.

**When to use Facade:**

**First**, when you have a complex subsystem with many classes. Payment processing with validation, fraud detection, gateway, audit, notifications—that's a perfect candidate.

**Second**, when you need to coordinate multiple APIs. For example, a booking system that calls flight API, hotel API, car rental API, and payment API. The `BookingFacade` orchestrates all of these.

**Third**, when you want to decouple clients from subsystem internals. If you hide the subsystem behind a facade, you can change the implementation (swap Stripe for PayPal) without affecting clients.

**Important trade-off**: The facade provides convenience for common cases but may lack flexibility for advanced use cases. That's why facades typically don't prevent direct subsystem access—advanced clients can bypass the facade when needed.

In production, I've used facades extensively. For example, we had payment processing duplicated across 10 controllers—each slightly different, some with bugs. We created a `PaymentFacade`, reduced those 10 implementations to 1, and cut maintenance time by 10x. Spring Framework uses this pattern everywhere: `JdbcTemplate` is a facade over JDBC, `RestTemplate` over HTTP clients. These facades reduce 50 lines of boilerplate to 2 lines while hiding resource management, exception translation, and cleanup."

---

### Common Follow-Up Questions

#### Q1: "How is Facade different from Adapter? They both wrap other classes."

**Answer:**

"Great question—the key difference is **purpose** and **cardinality**:

**Adapter** is about **interface translation** (making incompatible interfaces compatible):
- **One-to-one**: One adapter wraps one adaptee
- **Purpose**: Bridge between two specific interfaces
- **Example**: `StripePaymentAdapter` translates Stripe's API to your `PaymentGateway` interface

```java
// Adapter: One-to-one translation
public class StripePaymentAdapter implements PaymentGateway {
    private final StripeClient stripeClient;  // One adaptee
    
    public PaymentResult charge(Payment payment) {
        // Translate: Payment → Stripe API call
        return stripeClient.createPaymentIntent(payment.getAmount());
    }
}
```

**Facade** is about **simplification** (providing unified interface to complex subsystem):
- **One-to-many**: One facade coordinates many subsystem classes
- **Purpose**: Hide complexity, provide convenient high-level interface
- **Example**: `PaymentFacade` coordinates validation, fraud detection, gateway, audit, notifications

```java
// Facade: One-to-many simplification
public class PaymentFacade {
    private final PaymentValidator validator;         // Subsystem 1
    private final FraudDetector fraudDetector;        // Subsystem 2
    private final PaymentGateway gateway;             // Subsystem 3
    private final AuditLogger auditLogger;            // Subsystem 4
    private final NotificationService notifications;  // Subsystem 5
    
    public PaymentResult processPayment(Payment payment) {
        // Coordinate all subsystems
        validator.validate(payment);
        fraudDetector.check(payment);
        PaymentResult result = gateway.charge(payment);
        auditLogger.log(result);
        notifications.sendReceipt(result);
        return result;
    }
}
```

**Practical distinction:**

**When you have two incompatible interfaces that need to work together** → Adapter
- You have Stripe API (methods: `createPaymentIntent()`)
- You have internal interface (`PaymentGateway` with methods: `charge()`)
- You create `StripePaymentAdapter` to translate between them

**When you have a complex subsystem that's hard to use** → Facade
- You have 10+ classes for payment processing (validator, fraud detector, gateway, etc.)
- Client code has to coordinate all 10 classes (50+ lines, error-prone)
- You create `PaymentFacade` to simplify (1 line: `facade.processPayment()`)

**Can you use both together?** Absolutely!
```java
public class PaymentFacade {
    private final PaymentGateway gateway;  // Could be StripePaymentAdapter (adapter)
    // ... other subsystems
    
    public PaymentResult processPayment(Payment payment) {
        // Facade coordinates, adapter translates
        return gateway.charge(payment);  // gateway might be an adapter
    }
}
```

**In interviews, I emphasize:** 'Adapter is about compatibility (making two things work together), Facade is about convenience (making complex things simple). Adapter changes the interface, Facade provides a new, simpler interface.'"

---

#### Q2: "Doesn't a facade violate the Open-Closed Principle? If subsystems change, the facade must change."

**Answer:**

"That's a thoughtful question—let me address the nuance here.

**Short answer**: No, facade doesn't violate OCP when designed properly. The facade is **open for extension** (you can add new subsystems) but **closed for modification** (existing client code doesn't break).

**Detailed explanation:**

**OCP states:** Classes should be open for extension, closed for modification.

**What this means for Facade:**
1. **Clients are closed for modification**: If subsystem changes, clients don't need to change (facade absorbs the change)
2. **Facade is open for extension**: You can add new capabilities by extending the facade or adding new methods

**Example: Adding new payment provider**

```java
// Original facade
public class PaymentFacade {
    private final PaymentGateway gateway;  // StripeGateway
    
    public PaymentResult processPayment(Payment payment) {
        return gateway.charge(payment);
    }
}

// Client code
PaymentResult result = paymentFacade.processPayment(payment);

// Now we want to support multiple providers (Stripe, PayPal, Square)
// Option 1: Extend facade (OCP-compliant)
public class MultiProviderPaymentFacade extends PaymentFacade {
    private final Map<String, PaymentGateway> gateways;
    
    public PaymentResult processPayment(Payment payment) {
        String provider = payment.getProvider();  // "stripe", "paypal", "square"
        PaymentGateway gateway = gateways.get(provider);
        return gateway.charge(payment);
    }
}

// Client code UNCHANGED (OCP satisfied)
PaymentResult result = paymentFacade.processPayment(payment);
```

**When facade WOULD violate OCP:**

If you modify existing methods in a way that breaks clients:
```java
// ❌ BAD: Breaking change
public PaymentResult processPayment(Payment payment, String provider) {
    // Added parameter → breaks all existing clients
}
```

**OCP-compliant approach:**
```java
// ✅ GOOD: Add new method, keep old one
public PaymentResult processPayment(Payment payment) {
    return processPayment(payment, "default");  // Delegate to new method
}

public PaymentResult processPayment(Payment payment, String provider) {
    // New functionality
}
```

**The facade's value for OCP:**

The whole point of a facade is to **protect clients from subsystem changes**:
- Subsystem changes internally → Facade absorbs the change
- Client code unchanged → OCP satisfied

**Example: Switching from Stripe to PayPal**
```java
// Before
public class PaymentFacade {
    @Autowired private StripeGateway stripeGateway;
    
    public PaymentResult processPayment(Payment payment) {
        return stripeGateway.createPaymentIntent(payment);
    }
}

// After (subsystem changed, facade implementation changed)
public class PaymentFacade {
    @Autowired private PayPalGateway paypalGateway;
    
    public PaymentResult processPayment(Payment payment) {
        return paypalGateway.processPayment(payment);  // Different API
    }
}

// Client code UNCHANGED (protected by facade)
PaymentResult result = paymentFacade.processPayment(payment);
```

**Without facade**, every client would need to change from `stripeGateway.createPaymentIntent()` to `paypalGateway.processPayment()`. **With facade**, only the facade changes.

**Summary:**
- **Facade internal implementation changes**: Fine, that's the point (absorb subsystem changes)
- **Facade interface changes**: Should be rare and additive (new methods, not breaking changes)
- **Clients**: Should never need to change when subsystem changes (that's OCP value)

**In interviews:** 'The facade actually **enables** OCP by providing a stable interface that shields clients from subsystem changes. The facade implementation may change, but its public API remains stable, so clients are protected.'"

---

#### Q3: "When would you NOT use a facade? What are the downsides?"

**Answer:**

"Excellent question—facades aren't always the right choice. Here are scenarios where you shouldn't use a facade and the trade-offs:

**1. Simple subsystems (1-3 classes, straightforward interaction)**

```java
// ❌ DON'T: Over-engineering a simple subsystem
public class LoggingFacade {
    private final Logger logger;
    
    public void log(String message) {
        logger.info(message);  // Just use logger directly
    }
}

// ✅ DO: Use subsystem directly
logger.info("Order created");
```

**When subsystem is simple, facade adds unnecessary indirection.**

**2. Advanced use cases need flexibility**

```java
// Facade provides common operation
public class DatabaseFacade {
    public List<User> findActiveUsers() {
        return userRepo.findByStatus("ACTIVE");
    }
}

// ❌ Problem: What if I need custom query?
// "Find users active in last 30 days with premium subscription"
// Facade doesn't support this

// ✅ Solution: Provide both facade AND direct access
@Autowired private DatabaseFacade databaseFacade;  // For common cases
@Autowired private UserRepository userRepo;        // For advanced queries

// Common case: Use facade
List<User> activeUsers = databaseFacade.findActiveUsers();

// Advanced case: Bypass facade
List<User> premiumUsers = userRepo.findByStatusAndSubscriptionAndActiveDateAfter(
    "ACTIVE", "PREMIUM", LocalDate.now().minusDays(30)
);
```

**Facade provides convenience but may lack flexibility for edge cases.**

**3. Performance-critical code**

```java
// Facade adds method call overhead (albeit tiny)
public class PaymentFacade {
    public PaymentResult processPayment(Payment payment) {
        validate(payment);     // +0.1ms
        checkFraud(payment);   // +0.1ms
        return charge(payment);// +0.1ms
    }
}

// For 99% of code, 0.3ms overhead is negligible
// But in ultra-hot path (called 1M times/sec), maybe bypass facade

// ✅ Hot path optimization
if (isHighFrequencyTrader) {
    // Bypass facade, call gateway directly (save 0.3ms)
    return paymentGateway.charge(payment);
} else {
    // Normal path uses facade (includes validation, fraud check)
    return paymentFacade.processPayment(payment);
}
```

**4. Facade becomes "God Object"**

```java
// ❌ BAD: Facade doing too much (violates Single Responsibility)
public class SystemFacade {
    public User createUser() { ... }
    public Order createOrder() { ... }
    public void sendEmail() { ... }
    public Report generateReport() { ... }
    public void processPayment() { ... }
    // 50 more unrelated methods
}

// ✅ GOOD: Multiple focused facades
UserFacade
OrderFacade
NotificationFacade
ReportFacade
PaymentFacade
```

**Each facade should have a single, clear purpose.**

**5. Testing becomes harder**

```java
// Facade with many dependencies
public class OrderFacade {
    private final InventoryService inventory;
    private final PaymentFacade payment;
    private final ShippingService shipping;
    private final NotificationFacade notifications;
    private final AnalyticsService analytics;
    
    // Hard to test: Must mock 5 dependencies
}

// Sometimes better to test subsystems independently
@Test
public void testInventoryReservation() {
    // Test inventory service alone (easier)
    InventoryService inventory = new InventoryService();
    inventory.reserve(items);
}
```

**Trade-offs to consider:**

| Aspect | Benefits | Downsides |
|--------|----------|-----------|
| **Simplicity** | Clients use simple API | Facade implementation complex |
| **Flexibility** | Easy for common cases | Hard for edge cases |
| **Coupling** | Clients decoupled from subsystem | Facade coupled to subsystem |
| **Testing** | Mock single facade | Must mock all subsystem dependencies in facade tests |
| **Performance** | Negligible overhead (0.1-1ms) | May matter in ultra-hot paths |
| **Maintenance** | Single place to update | Facade can become God Object |

**Decision framework:**

**Use Facade when:**
- Subsystem is complex (5+ classes, intricate workflow)
- Common operations are repeated in many places
- Want to hide subsystem changes from clients
- Need consistent behavior across application

**Don't use Facade when:**
- Subsystem is simple (1-3 classes)
- Need maximum flexibility (advanced queries, custom workflows)
- Performance is critical (microseconds matter)
- Would create God Object (too many responsibilities)

**Real example from my experience:**

We had a `ReportingFacade` that handled 20 types of reports. It grew to 3,000 lines and became unmaintainable. We split it into:
- `SalesReportFacade`
- `InventoryReportFacade`
- `FinancialReportFacade`

Each focused facade was 300 lines, easy to understand and maintain.

**In interviews:** 'The key is using facade for genuine complexity, not over-engineering simple things. The 80/20 rule applies—facades should make 80% of use cases simple, while still allowing direct subsystem access for the 20% edge cases. If a facade becomes a bottleneck (performance or flexibility), it's a sign to reconsider the design.'"

---

#### Q4: "How do you handle versioning with facades? What if the underlying API changes?"

**Answer:**

"Versioning with facades is a common challenge, especially when wrapping third-party APIs. Here are strategies:

**Strategy 1: Facade absorbs version changes (most common)**

```java
// Stripe API v1 → v2 migration (breaking changes)
// Old: stripe.createCharge(amount, token)
// New: stripe.createPaymentIntent(amount, token)

// Facade hides the change
public class PaymentFacade {
    @Value("${stripe.api.version}") private String version;
    
    public PaymentResult processPayment(Payment payment) {
        if ("v1".equals(version)) {
            // Old API
            return stripeClient.createCharge(payment.getAmount(), payment.getToken());
        } else {
            // New API
            return stripeClient.createPaymentIntent(payment.getAmount(), payment.getToken());
        }
    }
}

// Client code UNCHANGED
PaymentResult result = paymentFacade.processPayment(payment);

// Benefits:
// - Gradual migration (test v2 with feature flag)
// - Rollback easy (flip config)
// - Zero client changes
```

**Strategy 2: Version-specific facades**

```java
// Multiple facades for different versions
public interface PaymentFacade {
    PaymentResult processPayment(Payment payment);
}

public class PaymentFacadeV1 implements PaymentFacade {
    public PaymentResult processPayment(Payment payment) {
        // Use Stripe API v1
    }
}

public class PaymentFacadeV2 implements PaymentFacade {
    public PaymentResult processPayment(Payment payment) {
        // Use Stripe API v2
    }
}

// Spring configuration (inject based on version)
@Configuration
public class PaymentConfig {
    @Bean
    @ConditionalOnProperty(name = "stripe.version", havingValue = "v1")
    public PaymentFacade paymentFacadeV1() {
        return new PaymentFacadeV1();
    }
    
    @Bean
    @ConditionalOnProperty(name = "stripe.version", havingValue = "v2")
    public PaymentFacade paymentFacadeV2() {
        return new PaymentFacadeV2();
    }
}

// Client code unchanged (injected facade determined by config)
@Autowired private PaymentFacade paymentFacade;
```

**Strategy 3: Adapter + Facade (clean separation)**

```java
// Adapter handles version translation
public interface StripeAdapter {
    ChargeResult charge(Payment payment);
}

public class StripeV1Adapter implements StripeAdapter {
    public ChargeResult charge(Payment payment) {
        return stripeV1Client.createCharge(payment);
    }
}

public class StripeV2Adapter implements StripeAdapter {
    public ChargeResult charge(Payment payment) {
        return stripeV2Client.createPaymentIntent(payment);
    }
}

// Facade uses adapter (doesn't know about versions)
public class PaymentFacade {
    @Autowired private StripeAdapter stripeAdapter;  // Version abstracted
    
    public PaymentResult processPayment(Payment payment) {
        // ... validation, fraud check ...
        return stripeAdapter.charge(payment);  // Version-agnostic
    }
}
```

**Strategy 4: Deprecation and migration path**

```java
// Phase 1: Add new method, deprecate old
public class PaymentFacade {
    @Deprecated
    public PaymentResult processPaymentOld(Payment payment) {
        // Old implementation
        logger.warn("Using deprecated processPaymentOld, migrate to processPayment");
        return processPayment(payment);  // Delegate to new method
    }
    
    public PaymentResult processPayment(Payment payment) {
        // New implementation
    }
}

// Phase 2: Migrate clients gradually
// Old code (deprecated, still works)
result = paymentFacade.processPaymentOld(payment);  // Warning logged

// New code
result = paymentFacade.processPayment(payment);

// Phase 3: Remove deprecated method (after all clients migrated)
```

**Strategy 5: Feature flags for gradual rollout**

```java
public class PaymentFacade {
    @Autowired private FeatureFlagService featureFlags;
    
    public PaymentResult processPayment(Payment payment) {
        if (featureFlags.isEnabled("stripe-v2", payment.getUserId())) {
            // New version (10% of users)
            return processPaymentV2(payment);
        } else {
            // Old version (90% of users)
            return processPaymentV1(payment);
        }
    }
}
```

**Handling breaking changes:**

```java
// Breaking change: Stripe now requires 3D Secure
// Old facade signature
public PaymentResult processPayment(Payment payment)

// Option 1: Add optional parameter (backward compatible)
public PaymentResult processPayment(Payment payment) {
    return processPayment(payment, null);  // Default: no 3DS
}

public PaymentResult processPayment(Payment payment, ThreeDSecureData threeDSecure) {
    // Handle both cases
    if (threeDSecure != null) {
        // Use 3DS
    }
}

// Option 2: Builder pattern for flexibility
public PaymentRequest.Builder builder() {
    return new PaymentRequest.Builder();
}

PaymentResult result = paymentFacade
    .builder()
    .withPayment(payment)
    .withThreeDSecure(threeDSecure)  // Optional
    .process();
```

**Real-world example:**

At my previous company, Stripe upgraded from v1 to v2 (breaking changes). We:
1. Created `StripeV2Adapter` (new API)
2. Updated `PaymentFacade` to use adapter
3. Tested with 5% of traffic (feature flag)
4. Gradually increased to 100% over 2 weeks
5. Removed old adapter

**Zero downtime, zero client changes.**

**In interviews:** 'The facade pattern is perfect for handling versioning because it provides a stable interface that absorbs underlying changes. The key strategies are: absorb changes internally, use adapters for translation, feature flags for gradual rollout, and maintain backward compatibility with deprecated methods during migration. The facade is your version compatibility layer.'"

---

#### Q5: "How do you test facades effectively? They have many dependencies."

**Answer:**

"Testing facades can be challenging because they coordinate multiple subsystems, but there are effective strategies:

**Layer 1: Unit tests (mock all dependencies)**

```java
public class PaymentFacadeTest {
    private PaymentValidator validator;
    private FraudDetector fraudDetector;
    private PaymentGateway gateway;
    private AuditLogger auditLogger;
    private NotificationService notifications;
    private PaymentFacade facade;
    
    @BeforeEach
    public void setup() {
        // Mock all dependencies
        validator = mock(PaymentValidator.class);
        fraudDetector = mock(FraudDetector.class);
        gateway = mock(PaymentGateway.class);
        auditLogger = mock(AuditLogger.class);
        notifications = mock(NotificationService.class);
        
        facade = new PaymentFacade(validator, fraudDetector, gateway, auditLogger, notifications);
    }
    
    @Test
    public void testSuccessfulPayment() {
        // Arrange
        Payment payment = new Payment(100.00, "tok_123");
        
        when(validator.validate(payment)).thenReturn(ValidationResult.valid());
        when(fraudDetector.check(payment)).thenReturn(FraudCheckResult.safe());
        when(gateway.charge(payment)).thenReturn(new PaymentResult("tx_123", true));
        
        // Act
        PaymentResult result = facade.processPayment(payment);
        
        // Assert
        assertNotNull(result);
        assertTrue(result.isSuccess());
        assertEquals("tx_123", result.getTransactionId());
        
        // Verify orchestration
        verify(validator).validate(payment);
        verify(fraudDetector).check(payment);
        verify(gateway).charge(payment);
        verify(auditLogger).logSuccess(payment, result);
        verify(notifications).sendReceipt(payment.getUserId(), result);
    }
    
    @Test
    public void testValidationFailure() {
        Payment payment = new Payment(-100.00, "tok_123");  // Invalid amount
        
        when(validator.validate(payment))
            .thenReturn(ValidationResult.invalid("Amount must be positive"));
        
        // Act & Assert
        assertThrows(ValidationException.class, () -> 
            facade.processPayment(payment)
        );
        
        // Verify gateway NOT called (fail fast)
        verify(gateway, never()).charge(any());
    }
    
    @Test
    public void testFraudDetection() {
        Payment payment = new Payment(10000.00, "tok_123");
        
        when(validator.validate(payment)).thenReturn(ValidationResult.valid());
        when(fraudDetector.check(payment))
            .thenReturn(FraudCheckResult.fraudulent("Suspicious large amount"));
        
        assertThrows(FraudException.class, () ->
            facade.processPayment(payment)
        );
        
        verify(auditLogger).logFraudAttempt(payment);
        verify(gateway, never()).charge(any());
    }
}
```

**Layer 2: Integration tests (test subsystems together)**

```java
@SpringBootTest
public class PaymentFacadeIntegrationTest {
    @Autowired private PaymentFacade paymentFacade;
    
    @MockBean private PaymentGateway gateway;  // Still mock external services
    
    @Test
    public void testRealValidationAndFraudDetection() {
        // Use real validator and fraud detector (not mocked)
        // Mock only external gateway
        
        Payment payment = new Payment(100.00, "tok_valid");
        when(gateway.charge(any())).thenReturn(new PaymentResult("tx_123", true));
        
        PaymentResult result = paymentFacade.processPayment(payment);
        
        assertTrue(result.isSuccess());
    }
}
```

**Layer 3: Test subsystems independently**

```java
// Test validator alone
@Test
public void testPaymentValidator() {
    PaymentValidator validator = new PaymentValidator();
    
    Payment validPayment = new Payment(100.00, "tok_123");
    assertTrue(validator.validate(validPayment).isValid());
    
    Payment invalidPayment = new Payment(-100.00, "tok_123");
    assertFalse(validator.validate(invalidPayment).isValid());
}

// Test fraud detector alone
@Test
public void testFraudDetector() {
    FraudDetector detector = new FraudDetector();
    
    Payment normalPayment = new Payment(50.00, "tok_123");
    assertFalse(detector.check(normalPayment).isFraudulent());
    
    Payment suspiciousPayment = new Payment(100000.00, "tok_123");
    assertTrue(detector.check(suspiciousPayment).isFraudulent());
}
```

**Layer 4: Contract tests (verify facade behavior)**

```java
// Test that facade behaves as expected for all clients
@ParameterizedTest
@MethodSource("providePaymentScenarios")
public void testPaymentFacadeContract(Payment payment, boolean shouldSucceed) {
    // Setup mocks based on scenario
    setupMocks(payment, shouldSucceed);
    
    if (shouldSucceed) {
        PaymentResult result = facade.processPayment(payment);
        assertNotNull(result);
        assertTrue(result.isSuccess());
    } else {
        assertThrows(Exception.class, () ->
            facade.processPayment(payment)
        );
    }
}

private static Stream<Arguments> providePaymentScenarios() {
    return Stream.of(
        Arguments.of(new Payment(100.00, "tok_valid"), true),
        Arguments.of(new Payment(-100.00, "tok_invalid"), false),
        Arguments.of(new Payment(100000.00, "tok_fraud"), false)
    );
}
```

**Layer 5: Test doubles for facades**

```java
// Create test facade for other components
public class FakePaymentFacade implements PaymentFacade {
    private List<Payment> processedPayments = new ArrayList<>();
    
    public PaymentResult processPayment(Payment payment) {
        processedPayments.add(payment);
        return new PaymentResult("test-tx-" + payment.getId(), true);
    }
    
    public List<Payment> getProcessedPayments() {
        return processedPayments;
    }
}

// Use in tests
@Test
public void testOrderCreation() {
    FakePaymentFacade fakePaymentFacade = new FakePaymentFacade();
    OrderService orderService = new OrderService(fakePaymentFacade);
    
    Order order = orderService.createOrder(request);
    
    // Verify payment was processed
    assertEquals(1, fakePaymentFacade.getProcessedPayments().size());
}
```

**Layer 6: Spy pattern (verify orchestration)**

```java
@Test
public void testPaymentOrchestration() {
    // Use real facade with spy to track calls
    PaymentFacade realFacade = new PaymentFacade(...);
    PaymentFacade spyFacade = spy(realFacade);
    
    Payment payment = new Payment(100.00, "tok_123");
    spyFacade.processPayment(payment);
    
    // Verify order of operations
    InOrder inOrder = inOrder(spyFacade);
    inOrder.verify(spyFacade).validatePayment(payment);
    inOrder.verify(spyFacade).checkFraud(payment);
    inOrder.verify(spyFacade).chargeWithRetry(payment);
    inOrder.verify(spyFacade).handleSuccess(payment, any());
}
```

**Testing strategy summary:**

| Layer | What to Test | Tools |
|-------|--------------|-------|
| Unit | Facade logic with mocked dependencies | Mockito |
| Integration | Facade with real subsystems | Spring Test, @MockBean for external only |
| Subsystem | Each subsystem independently | Plain JUnit |
| Contract | Facade behavior for all clients | @ParameterizedTest |
| Test Double | Use fake facade in other tests | Custom FakeXxx classes |
| Spy | Verify orchestration order | Mockito spy |

**Common mistakes to avoid:**

```java
// ❌ BAD: Testing implementation details
@Test
public void testFacadeCallsValidator() {
    verify(validator).validate(any());  // Too focused on internals
}

// ✅ GOOD: Testing behavior
@Test
public void testInvalidPaymentThrowsException() {
    assertThrows(ValidationException.class, () ->
        facade.processPayment(invalidPayment)
    );
}

// ❌ BAD: Not testing failure scenarios
@Test
public void testSuccessfulPayment() {
    // Only testing happy path
}

// ✅ GOOD: Test both success and failure
@Test
public void testValidationFailure() { ... }
@Test
public void testFraudDetection() { ... }
@Test
public void testPaymentGatewayFailure() { ... }
```

**In interviews:** 'The key to testing facades is layering: unit tests with mocks verify logic, integration tests verify subsystems work together, and contract tests verify behavior. Don't test implementation details—test that the facade provides the correct behavior. Also test failure scenarios extensively since facades often handle complex error cases.'"

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Facade Pattern Structure

```
┌───────────────────────────────────────────────────────────────┐
│                     Facade Pattern                            │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Without Facade:                                              │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐             │
│  │ Client 1 │────►│Subsystem │     │Subsystem │             │
│  └──────────┘     │    A     │────►│    C     │             │
│                   └──────────┘     └──────────┘             │
│  ┌──────────┐            │                                   │
│  │ Client 2 │────────────┼──────►┌──────────┐               │
│  └──────────┘            │       │Subsystem │               │
│                          └──────►│    B     │               │
│  ┌──────────┐                    └──────────┘               │
│  │ Client 3 │──────────────────────────┐                    │
│  └──────────┘                           │                    │
│                                         ▼                    │
│  Problems:                       ┌──────────┐               │
│  - Clients tightly coupled       │Subsystem │               │
│  - Complex coordination          │    D     │               │
│  - Duplicated logic              └──────────┘               │
│                                                               │
│  ─────────────────────────────────────────────────────────   │
│                                                               │
│  With Facade:                                                 │
│  ┌──────────┐                                                │
│  │ Client 1 │──┐                                             │
│  └──────────┘  │                                             │
│  ┌──────────┐  │     ┌──────────────┐                       │
│  │ Client 2 │──┼────►│    Facade    │                       │
│  └──────────┘  │     │              │                       │
│  ┌──────────┐  │     │ + operation()│                       │
│  │ Client 3 │──┘     └──────┬───────┘                       │
│  └──────────┘               │                                │
│                             │ coordinates                    │
│                             ▼                                │
│         ┌───────────────────┴───────────────┐               │
│         │                                     │               │
│         ▼                                     ▼               │
│  ┌──────────┐     ┌──────────┐       ┌──────────┐          │
│  │Subsystem │     │Subsystem │       │Subsystem │          │
│  │    A     │────►│    C     │       │    B     │          │
│  └──────────┘     └──────────┘       └──────────┘          │
│         │                                     │               │
│         └─────────────┬─────────────────────┘               │
│                       ▼                                       │
│                ┌──────────┐                                  │
│                │Subsystem │                                  │
│                │    D     │                                  │
│                └──────────┘                                  │
│                                                               │
│  Benefits:                                                    │
│  ✅ Simple client interface                                  │
│  ✅ Loose coupling                                           │
│  ✅ Centralized logic                                        │
│  ✅ Easy to maintain                                         │
└───────────────────────────────────────────────────────────────┘
```

### Payment Processing Facade Flow

```
┌────────────────────────────────────────────────────────────────┐
│              Payment Processing Facade Flow                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Client Request:                                               │
│       │                                                        │
│       │ paymentFacade.processPayment(payment)                │
│       ▼                                                        │
│  ┌──────────────────┐                                         │
│  │ PaymentFacade    │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ Step 1: Validate                                   │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ PaymentValidator │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ Valid? ✅                                         │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ PaymentFacade    │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ Step 2: Check Fraud                                │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │  FraudDetector   │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ Safe? ✅                                          │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ PaymentFacade    │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ Step 3: Charge (with retry)                       │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ PaymentGateway   │──────► Stripe API                      │
│  │ (Stripe)         │◄────── Response                        │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ Success? ✅                                       │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ PaymentFacade    │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           ├──► Step 4a: Audit                                 │
│           │    ┌──────────────────┐                          │
│           │    │  AuditLogger     │                          │
│           │    └──────────────────┘                          │
│           │                                                    │
│           └──► Step 4b: Notify (parallel)                     │
│                ┌──────────────────┐                          │
│                │NotificationService│                          │
│                └──────────────────┘                          │
│                                                                │
│       Return PaymentResult to Client                          │
│       ═════════════════════════════                           │
│                                                                │
│  Timeline:                                                     │
│  0ms    │ processPayment() called                            │
│  2ms    │ Validation complete                                │
│  52ms   │ Fraud check complete (ML model)                    │
│  202ms  │ Payment gateway response                           │
│  207ms  │ Audit logged                                       │
│  307ms  │ Email sent (async)                                 │
│  ─────────────────────────────────────                       │
│  Total: 207ms (blocking), 307ms (total)                      │
│                                                                │
│  Error Scenarios:                                              │
│                                                                │
│  Validation fails:                                             │
│     2ms │ ValidationException thrown                          │
│         │ Gateway NOT called (fail fast)                      │
│                                                                │
│  Fraud detected:                                               │
│    52ms │ FraudException thrown                               │
│         │ Gateway NOT called                                  │
│         │ Fraud attempt logged                                │
│                                                                │
│  Gateway fails (retry 3x):                                     │
│   202ms │ Attempt 1 fails (network timeout)                   │
│   204ms │ Attempt 2 fails                                     │
│   208ms │ Attempt 3 succeeds                                  │
│         │ Success logged                                      │
└────────────────────────────────────────────────────────────────┘
```

### Facade vs Adapter vs Proxy vs Decorator

```
┌─────────────────────────────────────────────────────────────────┐
│          Structural Patterns Comparison                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ADAPTER: One-to-One Translation                               │
│  ┌──────────┐          ┌─────────────┐                        │
│  │  Client  │─────────►│   Adapter   │                        │
│  │          │          │             │                        │
│  │ expects  │          │  translates │                        │
│  │PaymentGW │          └──────┬──────┘                        │
│  └──────────┘                 │                                │
│                               ▼                                │
│                        ┌─────────────┐                        │
│                        │ StripeClient│                        │
│                        │(incompatible│                        │
│                        │  interface) │                        │
│                        └─────────────┘                        │
│  Purpose: Make incompatible interfaces compatible             │
│  Example: Stripe API → PaymentGateway interface               │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  DECORATOR: One-to-One Enhancement                             │
│  ┌──────────┐          ┌─────────────┐                        │
│  │  Client  │─────────►│  Decorator  │                        │
│  │          │          │             │                        │
│  │          │          │ adds logging│                        │
│  └──────────┘          └──────┬──────┘                        │
│                               │ delegates                      │
│                               ▼                                │
│                        ┌─────────────┐                        │
│                        │RealService  │                        │
│                        │(same        │                        │
│                        │ interface)  │                        │
│                        └─────────────┘                        │
│  Purpose: Add behavior dynamically                             │
│  Example: LoggingService wraps RealService                    │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  PROXY: One-to-One Control                                     │
│  ┌──────────┐          ┌─────────────┐                        │
│  │  Client  │─────────►│    Proxy    │                        │
│  │          │          │             │                        │
│  │          │          │ lazy load/  │                        │
│  └──────────┘          │ security    │                        │
│                        └──────┬──────┘                        │
│                               │ controls access                │
│                               ▼                                │
│                        ┌─────────────┐                        │
│                        │ RealObject  │                        │
│                        │(same        │                        │
│                        │ interface)  │                        │
│                        └─────────────┘                        │
│  Purpose: Control access to object                             │
│  Example: ImageProxy lazy-loads RealImage                     │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  FACADE: One-to-Many Simplification                            │
│  ┌──────────┐          ┌─────────────┐                        │
│  │  Client  │─────────►│   Facade    │                        │
│  │          │          │             │                        │
│  │          │          │ simplifies  │                        │
│  └──────────┘          └──────┬──────┘                        │
│                               │ coordinates                    │
│                    ┌──────────┼──────────┐                    │
│                    │          │          │                    │
│                    ▼          ▼          ▼                    │
│             ┌──────────┐┌──────────┐┌──────────┐            │
│             │Subsystem ││Subsystem ││Subsystem │            │
│             │    A     ││    B     ││    C     │            │
│             └──────────┘└──────────┘└──────────┘            │
│  Purpose: Simplify complex subsystem                           │
│  Example: PaymentFacade coordinates validator, fraud, gateway │
│                                                                 │
│  KEY DISTINCTION:                                               │
│  - Adapter: Different interface (translation)                  │
│  - Decorator: Same interface (enhancement)                     │
│  - Proxy: Same interface (access control)                      │
│  - Facade: New interface (simplification of MANY)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why Facade Matters

**1. Developer Productivity (10x faster development)**
- **Without facade**: Payment processing = 55 lines per usage, duplicated 10 times = 550 lines
- **With facade**: Payment processing = 1 line per usage, 10 times = 10 lines + 150 lines facade = 160 lines
- **Result**: 71% less code, 10x faster to add features

**2. Consistency & Quality**
- **Without facade**: 10 implementations, each slightly different, 3 have bugs
- **With facade**: 1 implementation, all clients use same logic, 1 place to fix bugs
- **Result**: Zero variations, consistent behavior, easier to audit

**3. Maintenance Cost Reduction**
- **Without facade**: Change validation logic = update 10 places (4 hours work, risk of missing one)
- **With facade**: Change validation logic = update facade only (20 minutes work, zero risk)
- **Result**: 10x faster maintenance, $50K saved per year

**4. Onboarding Speed**
- **Without facade**: New developer must understand 10 subsystems, their interactions, error handling
- **With facade**: New developer uses `paymentFacade.processPayment()`, understands in 5 minutes
- **Result**: 20x faster onboarding, reduced knowledge transfer burden

**5. Decoupling & Flexibility**
- **Without facade**: Switching from Stripe to PayPal = update 10 places
- **With facade**: Switching providers = update facade only, clients unchanged
- **Result**: Easy migration, A/B testing, disaster recovery

### How It Works (Technical Summary)

**Core Mechanism:**
1. **Subsystem exists**: Complex set of classes with intricate dependencies
2. **Facade provides simplified interface**: High-level methods for common operations
3. **Facade coordinates subsystems**: Handles orchestration, error handling, transactions
4. **Clients use facade**: Simple API, loosely coupled to subsystems
5. **Optional direct access**: Advanced clients can bypass facade if needed

**Implementation Pattern:**
```java
public class ComplexSystemFacade {
    // Subsystem dependencies
    private final SubsystemA subsystemA;
    private final SubsystemB subsystemB;
    private final SubsystemC subsystemC;
    
    // High-level operation (hides complexity)
    public Result performOperation(Request request) {
        // Step 1: Coordinate subsystem A
        subsystemA.doSomething(request);
        
        // Step 2: Coordinate subsystem B (depends on A)
        IntermediateResult intermediate = subsystemB.process(request);
        
        // Step 3: Coordinate subsystem C (depends on B)
        Result result = subsystemC.finalize(intermediate);
        
        return result;
    }
}

// Client code (simple)
Result result = facade.performOperation(request);
```

**Key Characteristics:**
- **One-to-many**: Single facade coordinates multiple subsystems
- **New interface**: Facade provides new, higher-level API (not just wrapping)
- **Optional**: Clients can still access subsystems directly if needed
- **Focused**: Each facade has single, clear responsibility (avoid God Object)

**Common Use Cases:**
- **Payment processing**: Validation + fraud + gateway + audit + notifications
- **Booking systems**: Flight + hotel + car + payment + email
- **Database access**: Connection + query + mapping + cleanup (JdbcTemplate)
- **API orchestration**: Multiple microservices coordinated (API Gateway)
- **Legacy system modernization**: New facade over old subsystems

### Trade-Offs

| Aspect | Benefits | Costs |
|--------|----------|-------|
| **Simplicity** | 10x simpler client code | Facade itself is more complex |
| **Consistency** | Single source of truth | Must update facade when subsystem changes |
| **Coupling** | Clients decoupled from subsystems | Facade coupled to all subsystems |
| **Flexibility** | Easy for 80% of use cases | May lack features for 20% edge cases |
| **Testability** | Mock single facade in tests | Facade tests must mock many dependencies |
| **Performance** | <0.1ms overhead (negligible) | Extra method call in hot path |

**When to use:**
✅ Complex subsystem (5+ classes, intricate workflow)
✅ Common operations repeated in many places
✅ Want to hide subsystem changes from clients
✅ Need consistent behavior across application

**When NOT to use:**
❌ Subsystem is simple (1-3 classes)
❌ All use cases are advanced/custom
❌ Would create God Object (too many responsibilities)
❌ Performance critical (microseconds matter)

### Decision Framework

**Use Facade if:**
```
Subsystem complexity score:
- Number of classes: 5+                    → Facade
- Lines of code per usage: 30+             → Facade
- Number of usage sites: 5+                → Facade
- Need for consistency: High               → Facade
- Frequency of changes: High               → Facade

Examples: Payment, booking, reporting, API orchestration
```

**Don't use Facade if:**
```
Subsystem simplicity score:
- Number of classes: 1-3                   → Direct access
- Lines of code per usage: <10             → Direct access
- Number of usage sites: 1-2               → Direct access
- Need for flexibility: High               → Direct access
- Performance critical: Yes                → Direct access

Examples: Logger, simple DAO, utility class
```

### Interview Checklist

✅ **Explain core concept**: Facade provides simplified, unified interface to complex subsystem

✅ **Emphasize one-to-many**: One facade coordinates MANY subsystem classes (vs Adapter/Decorator/Proxy which are one-to-one)

✅ **Provide real examples**:
- Spring JdbcTemplate (facade over JDBC, 50 lines → 2 lines)
- Payment processing (facade coordinates validation, fraud, gateway, audit, notifications)
- AWS SDK wrapper (simplifies complex APIs)
- API Gateway (facade over microservices)

✅ **Discuss trade-offs**:
- Benefits: Simplicity, consistency, decoupling, maintainability
- Costs: Facade complexity, less flexibility for edge cases
- When to use: Complex subsystems, common operations
- When not to use: Simple subsystems, advanced use cases

✅ **Differentiate from other patterns**:
- Adapter: One-to-one translation (incompatible → compatible)
- Decorator: One-to-one enhancement (add behavior)
- Proxy: One-to-one control (access control, lazy loading)
- Facade: One-to-many simplification (complex → simple)

✅ **Handle versioning**: Facade absorbs subsystem changes, clients unchanged

✅ **Testing strategies**:
- Unit tests with mocked dependencies
- Integration tests with real subsystems
- Test subsystems independently
- Contract tests for facade behavior

✅ **Production concerns**:
- Avoid God Object (multiple focused facades)
- Allow direct subsystem access for advanced cases
- Add resilience patterns (retry, circuit breaker, fallback)
- Async for non-critical operations

✅ **Common mistakes**:
- Creating facade for simple subsystems (over-engineering)
- Facade becomes God Object (too many responsibilities)
- Not allowing direct subsystem access (inflexibility)
- Testing implementation instead of behavior

### Key Takeaway for Interviews

> **"Facade simplifies complex subsystems by providing a unified, high-level interface. It coordinates many classes (one-to-many) rather than translating one interface (Adapter), enhancing one object (Decorator), or controlling access to one object (Proxy). Spring's JdbcTemplate is a perfect example—it reduces 50 lines of JDBC boilerplate to 2 lines while hiding connection management, exception translation, and resource cleanup. The trade-off is simplicity for common cases vs flexibility for edge cases, which is why facades should be focused and allow direct subsystem access when needed."**

---

**Congratulations!** You've completed all four **Structural Patterns**! 🎉

**Summary of Structural Patterns:**
1. ✅ **Adapter** (183): Make incompatible interfaces compatible
2. ✅ **Decorator** (184): Add behavior dynamically
3. ✅ **Proxy** (185): Control access to objects
4. ✅ **Facade** (186): Simplify complex subsystems

**Progress:** 
- **Creational Patterns**: 4/4 complete (Singleton, Factory, Abstract Factory, Builder)
- **Structural Patterns**: 4/4 complete (Adapter, Decorator, Proxy, Facade)
- **Total**: 8/11 Design Patterns complete (73%)

**Next Steps:**
- Topic 187: **Strategy Pattern** (first Behavioral Pattern)
- Then: Observer, Command, Chain of Responsibility, Template Method
- Finally: When NOT to use patterns, Anti-Patterns

**Key Insight:** All four structural patterns use composition, but each has a distinct purpose. Understanding when to use each (and when NOT to) demonstrates senior/staff-level architectural thinking.

