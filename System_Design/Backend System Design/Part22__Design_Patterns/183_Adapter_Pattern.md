# 183. Adapter Pattern

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Adapter Pattern** is a structural design pattern that allows incompatible interfaces to work together. It acts as a bridge between two incompatible interfaces by wrapping an existing class with a new interface, converting the interface of one class into another interface that clients expect.

### **What It Is**

**Core Concept:**
The Adapter pattern lets you use classes with incompatible interfaces by creating a wrapper (adapter) that translates calls from one interface to another. Think of it like a power adapter that lets you plug a US appliance into a European outlet.

```java
// Incompatible interfaces
interface ModernPaymentGateway {
    PaymentResult processPayment(PaymentRequest request);
}

class LegacyPaymentSystem {
    // Different interface (incompatible)
    public boolean charge(String cardNumber, double amount, String currency) {
        // Legacy implementation
        return true;
    }
}

// Adapter: Makes LegacyPaymentSystem compatible with ModernPaymentGateway
class LegacyPaymentAdapter implements ModernPaymentGateway {
    private final LegacyPaymentSystem legacySystem;
    
    public LegacyPaymentAdapter(LegacyPaymentSystem legacySystem) {
        this.legacySystem = legacySystem;
    }
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // Translate modern interface to legacy interface
        boolean success = legacySystem.charge(
            request.getCardNumber(),
            request.getAmount(),
            request.getCurrency()
        );
        return new PaymentResult(success);
    }
}

// Client code works with modern interface
ModernPaymentGateway gateway = new LegacyPaymentAdapter(new LegacyPaymentSystem());
PaymentResult result = gateway.processPayment(request);  // Works!
```

**Key Components:**
1. **Target Interface:** Interface that client expects
2. **Adaptee:** Existing class with incompatible interface
3. **Adapter:** Wrapper that implements target interface and delegates to adaptee
4. **Client:** Uses target interface, unaware of adapter

---

### **Why It Exists**

**Problem It Solves:**

**Scenario: Integrating Third-Party Libraries**

```java
// Your application uses this interface
public interface Logger {
    void log(String level, String message, Map<String, Object> context);
}

// Third-party library has different interface
public class ThirdPartyLogger {
    public void writeLog(int severity, String msg) {
        // Different method signature
    }
    
    public void writeError(String msg, Throwable t) {
        // Different method for errors
    }
}

// Problem: Can't use ThirdPartyLogger where Logger is expected
public class UserService {
    private final Logger logger;  // Expects Logger interface
    
    public void createUser(User user) {
        logger.log("INFO", "Creating user", Map.of("userId", user.getId()));
        
        // Can't pass ThirdPartyLogger here ❌
    }
}
```

**Solution with Adapter:**

```java
// Adapter: Makes ThirdPartyLogger compatible with Logger interface
public class ThirdPartyLoggerAdapter implements Logger {
    private final ThirdPartyLogger thirdPartyLogger;
    
    public ThirdPartyLoggerAdapter(ThirdPartyLogger thirdPartyLogger) {
        this.thirdPartyLogger = thirdPartyLogger;
    }
    
    @Override
    public void log(String level, String message, Map<String, Object> context) {
        // Translate Logger interface to ThirdPartyLogger interface
        int severity = convertLevelToSeverity(level);
        String formattedMessage = formatMessage(message, context);
        thirdPartyLogger.writeLog(severity, formattedMessage);
    }
    
    private int convertLevelToSeverity(String level) {
        switch (level) {
            case "ERROR": return 1;
            case "WARN": return 2;
            case "INFO": return 3;
            case "DEBUG": return 4;
            default: return 3;
        }
    }
    
    private String formatMessage(String message, Map<String, Object> context) {
        return message + " " + context.toString();
    }
}

// Usage: Client code unchanged
Logger logger = new ThirdPartyLoggerAdapter(new ThirdPartyLogger());
UserService userService = new UserService(logger);  // Works! ✓
```

---

### **When to Use Adapter Pattern**

**Perfect Use Cases:**

1. **Third-Party Library Integration**
   - Library has incompatible interface
   - Can't modify third-party code
   - Need to adapt to your interface

2. **Legacy System Integration**
   - Old system with outdated interface
   - Can't refactor legacy code (too risky)
   - Need to work with modern code

3. **Multiple Implementations with Different Interfaces**
   - Stripe, PayPal, Square have different APIs
   - Want uniform interface in your code
   - Adapters translate to each provider

4. **Interface Standardization**
   - Different libraries for same purpose (logging, caching)
   - Want consistent interface across application
   - Swap implementations without code changes

5. **API Versioning**
   - Old API version still in use
   - New API version with different interface
   - Adapter bridges old and new

**When NOT to Use:**

- You control both interfaces (just refactor)
- Interfaces are similar (use inheritance)
- Too many methods to adapt (consider Facade)
- Adaptation logic is complex (might need redesign)

---

### **Adapter Types**

**1. Object Adapter (Composition - Recommended)**

```java
// Uses composition (HAS-A relationship)
public class PaymentAdapter implements ModernPaymentGateway {
    private final LegacyPaymentSystem legacySystem;  // Composition
    
    public PaymentAdapter(LegacyPaymentSystem legacySystem) {
        this.legacySystem = legacySystem;
    }
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // Delegates to legacy system
        return legacySystem.charge(request);
    }
}
```

**2. Class Adapter (Inheritance - Less Flexible)**

```java
// Uses inheritance (IS-A relationship)
public class PaymentAdapter 
    extends LegacyPaymentSystem 
    implements ModernPaymentGateway {
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // Calls inherited method
        return super.charge(request);
    }
}

// Problem: Java doesn't support multiple inheritance
// Can only adapt one class at a time
```

---

### **Role in Large-Scale Distributed Systems**

**Scenario: Multi-Cloud Storage**

```java
// Your application interface
public interface StorageService {
    void upload(String key, byte[] data);
    byte[] download(String key);
    void delete(String key);
}

// AWS S3 (third-party SDK)
public class S3Client {
    public PutObjectResult putObject(PutObjectRequest request) { ... }
    public S3Object getObject(GetObjectRequest request) { ... }
    public void deleteObject(DeleteObjectRequest request) { ... }
}

// Adapter for AWS S3
@Component
public class S3StorageAdapter implements StorageService {
    private final S3Client s3Client;
    
    @Autowired
    public S3StorageAdapter(S3Client s3Client) {
        this.s3Client = s3Client;
    }
    
    @Override
    public void upload(String key, byte[] data) {
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .body(RequestBody.fromBytes(data))
            .build();
        s3Client.putObject(request);
    }
    
    @Override
    public byte[] download(String key) {
        GetObjectRequest request = GetObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build();
        ResponseBytes<GetObjectResponse> response = 
            s3Client.getObjectAsBytes(request);
        return response.asByteArray();
    }
    
    @Override
    public void delete(String key) {
        DeleteObjectRequest request = DeleteObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build();
        s3Client.deleteObject(request);
    }
}

// Google Cloud Storage adapter
@Component
public class GCSStorageAdapter implements StorageService {
    private final Storage gcsClient;
    
    @Override
    public void upload(String key, byte[] data) {
        BlobId blobId = BlobId.of(bucketName, key);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId).build();
        gcsClient.create(blobInfo, data);
    }
    
    @Override
    public byte[] download(String key) {
        BlobId blobId = BlobId.of(bucketName, key);
        return gcsClient.readAllBytes(blobId);
    }
    
    @Override
    public void delete(String key) {
        BlobId blobId = BlobId.of(bucketName, key);
        gcsClient.delete(blobId);
    }
}

// Application code: Cloud provider agnostic
@Service
public class FileService {
    private final StorageService storageService;
    
    @Autowired
    public FileService(StorageService storageService) {
        this.storageService = storageService;  // Injected based on config
    }
    
    public void saveFile(String filename, byte[] data) {
        storageService.upload(filename, data);  // Works with any cloud!
    }
}

// Configuration: Switch cloud provider without code changes
@Configuration
public class StorageConfig {
    
    @Bean
    @ConditionalOnProperty(name = "cloud.provider", havingValue = "aws")
    public StorageService awsStorage(S3Client s3Client) {
        return new S3StorageAdapter(s3Client);
    }
    
    @Bean
    @ConditionalOnProperty(name = "cloud.provider", havingValue = "gcp")
    public StorageService gcsStorage(Storage gcsClient) {
        return new GCSStorageAdapter(gcsClient);
    }
}

// application.yml
cloud:
  provider: aws  # Change to 'gcp' without code changes
```

**Benefits at Scale:**
- **Vendor Lock-in Prevention:** Switch cloud providers in configuration
- **Disaster Recovery:** Failover to different provider automatically
- **Cost Optimization:** Route to cheapest provider dynamically
- **Multi-Cloud Strategy:** Use different providers for different regions

---

### **Business Impact**

**Migration Safety:**
```
Real scenario (Financial services company):

Migrating payment gateway: Stripe → Braintree

Without Adapter:
- Code changes: 250+ files
- Migration: Big bang (all at once)
- Risk: High (can't rollback easily)
- Downtime: 4 hours
- Revenue loss: $200K

With Adapter:
- Code changes: 1 adapter class + 1 config line
- Migration: Gradual (canary deployment)
- Risk: Low (rollback is configuration change)
- Downtime: 0 minutes
- Revenue loss: $0

Savings: $200K + reduced risk
```

**Development Velocity:**
```
Before Adapter (Direct integration):
- Integrate new payment provider: 2 weeks
- Changes: 50+ files (payment logic scattered)
- Testing: Full regression (all payment flows)

After Adapter:
- Integrate new payment provider: 2 days
- Changes: 1 adapter class
- Testing: Only adapter (existing code unchanged)

Impact: 7x faster integrations
```

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Object Adapter vs Class Adapter**

**Object Adapter (Composition - Preferred in Java)**

```java
// Target interface
public interface MediaPlayer {
    void play(String audioType, String fileName);
}

// Adaptee (incompatible interface)
public class AdvancedMediaPlayer {
    public void playVlc(String fileName) {
        System.out.println("Playing VLC file: " + fileName);
    }
    
    public void playMp4(String fileName) {
        System.out.println("Playing MP4 file: " + fileName);
    }
}

// Object Adapter (uses composition)
public class MediaAdapter implements MediaPlayer {
    private final AdvancedMediaPlayer advancedPlayer;  // Composition
    
    public MediaAdapter(AdvancedMediaPlayer advancedPlayer) {
        this.advancedPlayer = advancedPlayer;
    }
    
    @Override
    public void play(String audioType, String fileName) {
        if (audioType.equalsIgnoreCase("vlc")) {
            advancedPlayer.playVlc(fileName);
        } else if (audioType.equalsIgnoreCase("mp4")) {
            advancedPlayer.playMp4(fileName);
        } else {
            throw new IllegalArgumentException("Unsupported format: " + audioType);
        }
    }
}
```

**Class Adapter (Inheritance - Rarely Used in Java)**

```java
// Class Adapter (uses inheritance)
public class MediaAdapter 
    extends AdvancedMediaPlayer  // Inheritance
    implements MediaPlayer {
    
    @Override
    public void play(String audioType, String fileName) {
        if (audioType.equalsIgnoreCase("vlc")) {
            super.playVlc(fileName);  // Call inherited method
        } else if (audioType.equalsIgnoreCase("mp4")) {
            super.playMp4(fileName);
        }
    }
}

// Problems with class adapter:
// ❌ Java doesn't support multiple inheritance
// ❌ Can't adapt multiple classes
// ❌ Tight coupling (inheritance)
// ❌ Exposes all adaptee methods
```

**Comparison:**

| **Aspect** | **Object Adapter** | **Class Adapter** |
|------------|-------------------|-------------------|
| **Mechanism** | Composition (HAS-A) | Inheritance (IS-A) |
| **Flexibility** | Can adapt multiple classes | Only one class |
| **Coupling** | Loose (composition) | Tight (inheritance) |
| **Runtime** | Can change adaptee | Fixed at compile-time |
| **Access** | Only public methods | All methods (including protected) |
| **Java Support** | ✓ Yes | ⚠️ Limited (no multiple inheritance) |

**Recommendation:** Always use Object Adapter in Java.

---

### **Complete Implementation: Payment Gateway Adapter**

```java
// Target interface (what your application expects)
public interface PaymentGateway {
    PaymentResult charge(PaymentRequest request);
    RefundResult refund(RefundRequest request);
    PaymentStatus checkStatus(String transactionId);
}

// Value objects
public class PaymentRequest {
    private final String customerId;
    private final BigDecimal amount;
    private final String currency;
    private final String paymentMethod;
    private final Map<String, String> metadata;
    
    // Constructor, getters
}

public class PaymentResult {
    private final boolean success;
    private final String transactionId;
    private final String message;
    
    // Constructor, getters
}

// Adaptee 1: Stripe (third-party library)
public class StripeClient {
    public ChargeResponse createCharge(ChargeRequest request) {
        // Stripe-specific implementation
        return new ChargeResponse(/* ... */);
    }
    
    public RefundResponse createRefund(String chargeId, long amount) {
        return new RefundResponse(/* ... */);
    }
    
    public Charge retrieveCharge(String chargeId) {
        return new Charge(/* ... */);
    }
}

// Adapter for Stripe
public class StripePaymentAdapter implements PaymentGateway {
    private final StripeClient stripeClient;
    
    public StripePaymentAdapter(StripeClient stripeClient) {
        this.stripeClient = stripeClient;
    }
    
    @Override
    public PaymentResult charge(PaymentRequest request) {
        try {
            // Translate your interface to Stripe's interface
            ChargeRequest stripeRequest = ChargeRequest.builder()
                .amount(convertToStripeAmount(request.getAmount()))
                .currency(request.getCurrency().toLowerCase())
                .customer(request.getCustomerId())
                .source(request.getPaymentMethod())
                .metadata(request.getMetadata())
                .build();
            
            ChargeResponse response = stripeClient.createCharge(stripeRequest);
            
            return new PaymentResult(
                response.isSucceeded(),
                response.getId(),
                response.getStatus()
            );
        } catch (StripeException e) {
            return new PaymentResult(false, null, e.getMessage());
        }
    }
    
    @Override
    public RefundResult refund(RefundRequest request) {
        try {
            RefundResponse response = stripeClient.createRefund(
                request.getTransactionId(),
                convertToStripeAmount(request.getAmount())
            );
            
            return new RefundResult(
                response.isSucceeded(),
                response.getId(),
                response.getStatus()
            );
        } catch (StripeException e) {
            return new RefundResult(false, null, e.getMessage());
        }
    }
    
    @Override
    public PaymentStatus checkStatus(String transactionId) {
        try {
            Charge charge = stripeClient.retrieveCharge(transactionId);
            return convertStripeStatus(charge.getStatus());
        } catch (StripeException e) {
            return PaymentStatus.UNKNOWN;
        }
    }
    
    // Helper methods for translation
    private long convertToStripeAmount(BigDecimal amount) {
        // Stripe uses cents, not dollars
        return amount.multiply(new BigDecimal("100")).longValue();
    }
    
    private PaymentStatus convertStripeStatus(String stripeStatus) {
        switch (stripeStatus) {
            case "succeeded": return PaymentStatus.COMPLETED;
            case "pending": return PaymentStatus.PENDING;
            case "failed": return PaymentStatus.FAILED;
            default: return PaymentStatus.UNKNOWN;
        }
    }
}

// Adaptee 2: PayPal (different third-party library)
public class PayPalClient {
    public Payment createPayment(PaymentDetails details) {
        return new Payment(/* ... */);
    }
    
    public Refund createRefund(Sale sale, Amount amount) {
        return new Refund(/* ... */);
    }
    
    public Payment getPayment(String paymentId) {
        return new Payment(/* ... */);
    }
}

// Adapter for PayPal
public class PayPalPaymentAdapter implements PaymentGateway {
    private final PayPalClient paypalClient;
    
    public PayPalPaymentAdapter(PayPalClient paypalClient) {
        this.paypalClient = paypalClient;
    }
    
    @Override
    public PaymentResult charge(PaymentRequest request) {
        try {
            // Translate your interface to PayPal's interface
            PaymentDetails paypalDetails = new PaymentDetails();
            paypalDetails.setIntent("sale");
            
            Amount amount = new Amount();
            amount.setCurrency(request.getCurrency());
            amount.setTotal(request.getAmount().toString());
            paypalDetails.setAmount(amount);
            
            Payer payer = new Payer();
            payer.setPaymentMethod(request.getPaymentMethod());
            paypalDetails.setPayer(payer);
            
            Payment payment = paypalClient.createPayment(paypalDetails);
            
            return new PaymentResult(
                "approved".equals(payment.getState()),
                payment.getId(),
                payment.getState()
            );
        } catch (PayPalRESTException e) {
            return new PaymentResult(false, null, e.getMessage());
        }
    }
    
    @Override
    public RefundResult refund(RefundRequest request) {
        try {
            Sale sale = new Sale();
            sale.setId(request.getTransactionId());
            
            Amount amount = new Amount();
            amount.setCurrency(request.getCurrency());
            amount.setTotal(request.getAmount().toString());
            
            Refund refund = paypalClient.createRefund(sale, amount);
            
            return new RefundResult(
                "completed".equals(refund.getState()),
                refund.getId(),
                refund.getState()
            );
        } catch (PayPalRESTException e) {
            return new RefundResult(false, null, e.getMessage());
        }
    }
    
    @Override
    public PaymentStatus checkStatus(String transactionId) {
        try {
            Payment payment = paypalClient.getPayment(transactionId);
            return convertPayPalStatus(payment.getState());
        } catch (PayPalRESTException e) {
            return PaymentStatus.UNKNOWN;
        }
    }
    
    private PaymentStatus convertPayPalStatus(String paypalStatus) {
        switch (paypalStatus) {
            case "approved": return PaymentStatus.COMPLETED;
            case "created": return PaymentStatus.PENDING;
            case "failed": return PaymentStatus.FAILED;
            default: return PaymentStatus.UNKNOWN;
        }
    }
}

// Application service (provider-agnostic)
@Service
public class PaymentService {
    private final PaymentGateway paymentGateway;
    
    @Autowired
    public PaymentService(PaymentGateway paymentGateway) {
        this.paymentGateway = paymentGateway;
    }
    
    public PaymentResult processPayment(Order order) {
        PaymentRequest request = PaymentRequest.builder()
            .customerId(order.getCustomerId())
            .amount(order.getTotal())
            .currency(order.getCurrency())
            .paymentMethod(order.getPaymentMethod())
            .metadata(Map.of("orderId", order.getId()))
            .build();
        
        return paymentGateway.charge(request);  // Works with any provider!
    }
}

// Spring configuration
@Configuration
public class PaymentConfig {
    
    @Bean
    @ConditionalOnProperty(name = "payment.provider", havingValue = "stripe")
    public PaymentGateway stripePaymentGateway(StripeClient stripeClient) {
        return new StripePaymentAdapter(stripeClient);
    }
    
    @Bean
    @ConditionalOnProperty(name = "payment.provider", havingValue = "paypal")
    public PaymentGateway paypalPaymentGateway(PayPalClient paypalClient) {
        return new PayPalPaymentAdapter(paypalClient);
    }
}

// application.yml
payment:
  provider: stripe  # Change to 'paypal' without code changes
```

---

### **Two-Way Adapter (Bidirectional)**

```java
// Two-way adapter: Can be used as either interface

// Interface A
public interface OldSystem {
    void legacyMethod();
}

// Interface B
public interface NewSystem {
    void modernMethod();
}

// Bidirectional adapter
public class TwoWayAdapter implements OldSystem, NewSystem {
    private OldSystem oldSystem;
    private NewSystem newSystem;
    
    // Can adapt OldSystem to NewSystem
    public TwoWayAdapter(OldSystem oldSystem) {
        this.oldSystem = oldSystem;
    }
    
    // Can adapt NewSystem to OldSystem
    public TwoWayAdapter(NewSystem newSystem) {
        this.newSystem = newSystem;
    }
    
    @Override
    public void legacyMethod() {
        if (oldSystem != null) {
            oldSystem.legacyMethod();
        } else {
            // Translate modern to legacy
            newSystem.modernMethod();
        }
    }
    
    @Override
    public void modernMethod() {
        if (newSystem != null) {
            newSystem.modernMethod();
        } else {
            // Translate legacy to modern
            oldSystem.legacyMethod();
        }
    }
}
```

---

### **Adapter with Caching**

```java
// Adapter that adds caching layer
public class CachedStorageAdapter implements StorageService {
    private final StorageService delegate;
    private final Cache<String, byte[]> cache;
    
    public CachedStorageAdapter(StorageService delegate, Cache<String, byte[]> cache) {
        this.delegate = delegate;
        this.cache = cache;
    }
    
    @Override
    public void upload(String key, byte[] data) {
        delegate.upload(key, data);
        cache.put(key, data);  // Cache on upload
    }
    
    @Override
    public byte[] download(String key) {
        // Check cache first
        byte[] cached = cache.getIfPresent(key);
        if (cached != null) {
            return cached;
        }
        
        // Cache miss: fetch from storage
        byte[] data = delegate.download(key);
        cache.put(key, data);
        return data;
    }
    
    @Override
    public void delete(String key) {
        delegate.delete(key);
        cache.invalidate(key);  // Invalidate cache
    }
}
```

---

### **Adapter Chain (Composing Multiple Adapters)**

```java
// Layered adapters for cross-cutting concerns

// Base adapter: Protocol translation
StorageService s3Adapter = new S3StorageAdapter(s3Client);

// Add caching
StorageService cachedAdapter = new CachedStorageAdapter(s3Adapter, cache);

// Add retry logic
StorageService retryAdapter = new RetryStorageAdapter(cachedAdapter, retryPolicy);

// Add logging
StorageService loggingAdapter = new LoggingStorageAdapter(retryAdapter, logger);

// Add metrics
StorageService metricsAdapter = new MetricsStorageAdapter(loggingAdapter, metrics);

// Use final composed adapter
@Bean
public StorageService storageService() {
    StorageService s3 = new S3StorageAdapter(s3Client);
    s3 = new CachedStorageAdapter(s3, cache);
    s3 = new RetryStorageAdapter(s3, retryPolicy);
    s3 = new LoggingStorageAdapter(s3, logger);
    s3 = new MetricsStorageAdapter(s3, metrics);
    return s3;
}
```

---

### **Spring Integration: Multiple Adapters**

```java
// Register multiple adapters as beans
@Configuration
public class StorageConfig {
    
    @Bean
    @Qualifier("s3")
    public StorageService s3Storage(S3Client s3Client) {
        return new S3StorageAdapter(s3Client);
    }
    
    @Bean
    @Qualifier("gcs")
    public StorageService gcsStorage(Storage gcsClient) {
        return new GCSStorageAdapter(gcsClient);
    }
    
    @Bean
    @Qualifier("azure")
    public StorageService azureStorage(BlobServiceClient azureClient) {
        return new AzureBlobStorageAdapter(azureClient);
    }
    
    @Bean
    @Primary  // Default implementation
    public StorageService primaryStorage(@Qualifier("s3") StorageService s3) {
        return s3;
    }
}

// Use specific adapter
@Service
public class BackupService {
    
    @Autowired
    @Qualifier("s3")
    private StorageService primaryStorage;
    
    @Autowired
    @Qualifier("gcs")
    private StorageService backupStorage;
    
    public void backupFile(String key, byte[] data) {
        primaryStorage.upload(key, data);    // Upload to S3
        backupStorage.upload(key, data);     // Backup to GCS
    }
}
```

---

### **Adapter for Testing (Test Doubles)**

```java
// Production adapter
public class StripePaymentAdapter implements PaymentGateway {
    // Real Stripe integration
}

// Test adapter (fake implementation)
public class FakePaymentAdapter implements PaymentGateway {
    private final Map<String, PaymentResult> transactions = new HashMap<>();
    private boolean shouldFail = false;
    
    @Override
    public PaymentResult charge(PaymentRequest request) {
        if (shouldFail) {
            return new PaymentResult(false, null, "Simulated failure");
        }
        
        String transactionId = UUID.randomUUID().toString();
        PaymentResult result = new PaymentResult(true, transactionId, "succeeded");
        transactions.put(transactionId, result);
        return result;
    }
    
    @Override
    public RefundResult refund(RefundRequest request) {
        if (!transactions.containsKey(request.getTransactionId())) {
            return new RefundResult(false, null, "Transaction not found");
        }
        return new RefundResult(true, UUID.randomUUID().toString(), "succeeded");
    }
    
    @Override
    public PaymentStatus checkStatus(String transactionId) {
        return transactions.containsKey(transactionId) 
            ? PaymentStatus.COMPLETED 
            : PaymentStatus.UNKNOWN;
    }
    
    // Test helper methods
    public void simulateFailure() {
        this.shouldFail = true;
    }
    
    public void reset() {
        this.shouldFail = false;
        this.transactions.clear();
    }
}

// Test configuration
@TestConfiguration
public class TestPaymentConfig {
    
    @Bean
    @Primary  // Override production bean
    public PaymentGateway testPaymentGateway() {
        return new FakePaymentAdapter();
    }
}

// Test
@SpringBootTest
public class PaymentServiceTest {
    
    @Autowired
    private PaymentService paymentService;
    
    @Autowired
    private FakePaymentAdapter fakePayment;
    
    @Test
    public void testSuccessfulPayment() {
        Order order = new Order(/* ... */);
        
        PaymentResult result = paymentService.processPayment(order);
        
        assertTrue(result.isSuccess());
        assertNotNull(result.getTransactionId());
    }
    
    @Test
    public void testFailedPayment() {
        fakePayment.simulateFailure();
        
        Order order = new Order(/* ... */);
        PaymentResult result = paymentService.processPayment(order);
        
        assertFalse(result.isSuccess());
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### **Performance Considerations**

**Adapter Overhead:**

```java
// Scenario: API calls through adapter (10,000 requests/second)

// Direct call (no adapter)
PaymentResult result = stripeClient.createCharge(request);
// Time: 150ms (network latency)
// CPU: Negligible

// Call through adapter
PaymentResult result = stripeAdapter.charge(request);
// Time: 150ms + 0.1ms (adapter overhead)
// CPU: 0.1ms (object translation)

// Adapter overhead: 0.1ms / 150ms = 0.067% (negligible)
//
// At 10,000 req/sec:
// Total adapter overhead: 10,000 × 0.1ms = 1 second/second
// Result: Requires 1 CPU core for translation
//
// Conclusion: Adapter overhead is negligible compared to network I/O
```

**Memory Overhead:**

```java
// Without adapter: Direct object usage
StripeCharge stripeCharge = new StripeCharge();
// Memory: 256 bytes

// With adapter: Translation objects
PaymentRequest request = new PaymentRequest();  // 128 bytes
StripeCharge stripeCharge = adapter.translate(request);  // 256 bytes
PaymentResult result = adapter.translate(stripeCharge);  // 128 bytes
//
// Total memory: 512 bytes (2x overhead)
// Short-lived (GC'd immediately after request)
//
// At 10,000 req/sec:
// Memory allocation rate: 10,000 × 512 = 5 MB/sec
// With G1GC: Easily handled in Eden space
//
// Conclusion: Minimal GC impact
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Adapter for Database Abstraction**

```java
// Your application's repository interface
public interface UserRepository {
    User findById(Long id);
    List<User> findAll();
    void save(User user);
    void delete(Long id);
}

// JPA implementation (SQL databases)
@Repository
public class JpaUserRepositoryAdapter implements UserRepository {
    
    @PersistenceContext
    private EntityManager entityManager;
    
    @Override
    public User findById(Long id) {
        UserEntity entity = entityManager.find(UserEntity.class, id);
        return entity != null ? entityToDomain(entity) : null;
    }
    
    @Override
    public List<User> findAll() {
        return entityManager
            .createQuery("SELECT u FROM UserEntity u", UserEntity.class)
            .getResultList()
            .stream()
            .map(this::entityToDomain)
            .collect(Collectors.toList());
    }
    
    @Override
    public void save(User user) {
        UserEntity entity = domainToEntity(user);
        entityManager.merge(entity);
    }
    
    @Override
    public void delete(Long id) {
        UserEntity entity = entityManager.find(UserEntity.class, id);
        if (entity != null) {
            entityManager.remove(entity);
        }
    }
    
    private User entityToDomain(UserEntity entity) {
        return User.builder()
            .id(entity.getId())
            .email(entity.getEmail())
            .name(entity.getName())
            .build();
    }
    
    private UserEntity domainToEntity(User user) {
        UserEntity entity = new UserEntity();
        entity.setId(user.getId());
        entity.setEmail(user.getEmail());
        entity.setName(user.getName());
        return entity;
    }
}

// MongoDB implementation (NoSQL databases)
@Repository
public class MongoUserRepositoryAdapter implements UserRepository {
    
    @Autowired
    private MongoTemplate mongoTemplate;
    
    @Override
    public User findById(Long id) {
        UserDocument doc = mongoTemplate.findById(id, UserDocument.class);
        return doc != null ? documentToDomain(doc) : null;
    }
    
    @Override
    public List<User> findAll() {
        return mongoTemplate
            .findAll(UserDocument.class)
            .stream()
            .map(this::documentToDomain)
            .collect(Collectors.toList());
    }
    
    @Override
    public void save(User user) {
        UserDocument doc = domainToDocument(user);
        mongoTemplate.save(doc);
    }
    
    @Override
    public void delete(Long id) {
        Query query = new Query(Criteria.where("_id").is(id));
        mongoTemplate.remove(query, UserDocument.class);
    }
    
    private User documentToDomain(UserDocument doc) {
        return User.builder()
            .id(doc.getId())
            .email(doc.getEmail())
            .name(doc.getName())
            .build();
    }
    
    private UserDocument domainToDocument(User user) {
        UserDocument doc = new UserDocument();
        doc.setId(user.getId());
        doc.setEmail(user.getEmail());
        doc.setName(user.getName());
        return doc;
    }
}

// Configuration: Switch database without code changes
@Configuration
public class RepositoryConfig {
    
    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "postgres")
    public UserRepository postgresUserRepository(EntityManager em) {
        return new JpaUserRepositoryAdapter(em);
    }
    
    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "mongodb")
    public UserRepository mongoUserRepository(MongoTemplate mongoTemplate) {
        return new MongoUserRepositoryAdapter(mongoTemplate);
    }
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Adapter with Circuit Breaker**

```java
// Resilient adapter with circuit breaker
public class ResilientPaymentAdapter implements PaymentGateway {
    private final PaymentGateway delegate;
    private final CircuitBreaker circuitBreaker;
    
    public ResilientPaymentAdapter(
            PaymentGateway delegate,
            CircuitBreaker circuitBreaker) {
        this.delegate = delegate;
        this.circuitBreaker = circuitBreaker;
    }
    
    @Override
    public PaymentResult charge(PaymentRequest request) {
        return circuitBreaker.executeSupplier(() -> delegate.charge(request));
    }
    
    @Override
    public RefundResult refund(RefundRequest request) {
        return circuitBreaker.executeSupplier(() -> delegate.refund(request));
    }
    
    @Override
    public PaymentStatus checkStatus(String transactionId) {
        return circuitBreaker.executeSupplier(() -> delegate.checkStatus(transactionId));
    }
}

// Configuration
@Bean
public PaymentGateway resilientPaymentGateway(PaymentGateway stripeAdapter) {
    CircuitBreakerConfig config = CircuitBreakerConfig.custom()
        .failureRateThreshold(50)
        .waitDurationInOpenState(Duration.ofSeconds(60))
        .build();
    
    CircuitBreaker circuitBreaker = CircuitBreaker.of("payment", config);
    
    return new ResilientPaymentAdapter(stripeAdapter, circuitBreaker);
}
```

---

### **Adapter with Retry Logic**

```java
// Adapter with automatic retries
public class RetryableStorageAdapter implements StorageService {
    private final StorageService delegate;
    private final RetryPolicy retryPolicy;
    
    public RetryableStorageAdapter(StorageService delegate, RetryPolicy retryPolicy) {
        this.delegate = delegate;
        this.retryPolicy = retryPolicy;
    }
    
    @Override
    public void upload(String key, byte[] data) {
        retryPolicy.execute(() -> delegate.upload(key, data));
    }
    
    @Override
    public byte[] download(String key) {
        return retryPolicy.execute(() -> delegate.download(key));
    }
    
    @Override
    public void delete(String key) {
        retryPolicy.execute(() -> delegate.delete(key));
    }
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### **Adapter for API Authentication**

```java
// Adapter that adds authentication
public class AuthenticatedAPIAdapter implements APIClient {
    private final APIClient delegate;
    private final TokenProvider tokenProvider;
    
    public AuthenticatedAPIAdapter(APIClient delegate, TokenProvider tokenProvider) {
        this.delegate = delegate;
        this.tokenProvider = tokenProvider;
    }
    
    @Override
    public Response get(String path) {
        String token = tokenProvider.getToken();
        Request authenticatedRequest = new Request(path)
            .header("Authorization", "Bearer " + token);
        return delegate.get(authenticatedRequest);
    }
    
    @Override
    public Response post(String path, String body) {
        String token = tokenProvider.getToken();
        Request authenticatedRequest = new Request(path, body)
            .header("Authorization", "Bearer " + token);
        return delegate.post(authenticatedRequest);
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: JDBC Driver Architecture**

**Background:**
JDBC uses Adapter pattern to allow Java applications to work with any database through a uniform interface.

**Implementation:**

```java
// Target interface (defined by Java)
public interface java.sql.Connection {
    Statement createStatement();
    PreparedStatement prepareStatement(String sql);
    void commit();
    void rollback();
    // ... many other methods
}

// Adaptee: PostgreSQL native driver
public class PGConnection {
    // PostgreSQL-specific implementation
    public native PGStatement createPGStatement();
    public native void pgCommit();
}

// Adapter: PostgreSQL JDBC driver
public class org.postgresql.jdbc.PgConnection implements java.sql.Connection {
    private final PGConnection nativeConnection;
    
    @Override
    public Statement createStatement() {
        // Adapt PostgreSQL native to JDBC interface
        return new PgStatement(nativeConnection.createPGStatement());
    }
    
    @Override
    public void commit() {
        nativeConnection.pgCommit();
    }
    
    // ... adapter methods for all Connection methods
}

// Usage: Same code works with any database
Connection conn = DriverManager.getConnection(
    "jdbc:postgresql://localhost/mydb");  // PostgreSQL
Connection conn = DriverManager.getConnection(
    "jdbc:mysql://localhost/mydb");       // MySQL
Connection conn = DriverManager.getConnection(
    "jdbc:oracle:thin:@localhost:1521");  // Oracle

// All use the same JDBC interface!
```

**Results:**
- **Portability:** 1 million+ Java applications work with any database
- **Vendor Independence:** Switch databases without code changes
- **Ecosystem:** 100+ database drivers available
- **Standardization:** Industry standard since 1997

---

### **Case Study 2: SLF4J Logging Facade**

**Background:**
SLF4J (Simple Logging Facade for Java) uses Adapter pattern to provide a unified logging API that works with any logging framework (Log4j, Logback, JUL).

**Implementation:**

```java
// Target interface (SLF4J)
public interface org.slf4j.Logger {
    void trace(String msg);
    void debug(String msg);
    void info(String msg);
    void warn(String msg);
    void error(String msg);
}

// Adaptee 1: Log4j
public class org.apache.log4j.Logger {
    public void trace(Object message);
    public void debug(Object message);
    public void info(Object message);
    public void warn(Object message);
    public void error(Object message);
}

// Adapter: SLF4J → Log4j
public class org.slf4j.impl.Log4jLoggerAdapter implements org.slf4j.Logger {
    private final org.apache.log4j.Logger log4jLogger;
    
    @Override
    public void info(String msg) {
        log4jLogger.info(msg);  // Delegate to Log4j
    }
    
    @Override
    public void error(String msg) {
        log4jLogger.error(msg);
    }
    
    // ... other methods
}

// Adaptee 2: Logback
public class ch.qos.logback.classic.Logger {
    public void trace(String msg);
    public void debug(String msg);
    // ...
}

// Adapter: SLF4J → Logback
public class org.slf4j.impl.LogbackLoggerAdapter implements org.slf4j.Logger {
    private final ch.qos.logback.classic.Logger logbackLogger;
    
    @Override
    public void info(String msg) {
        logbackLogger.info(msg);  // Delegate to Logback
    }
    
    // ... other methods
}

// Application code: Framework-agnostic
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class UserService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    
    public void createUser(User user) {
        logger.info("Creating user: {}", user.getEmail());
        // Works with Log4j, Logback, JUL, or any other framework!
    }
}

// Switch logging framework: Change dependency in pom.xml
<!-- Use Log4j -->
<dependency>
    <groupId>org.slf4j</groupId>
    <artifactId>slf4j-log4j12</artifactId>
</dependency>

<!-- Use Logback -->
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-classic</artifactId>
</dependency>

// No code changes needed!
```

**Results:**
- **Framework Independence:** Switch logging frameworks without code changes
- **Adoption:** Used by 90%+ of Java projects
- **Performance:** Zero overhead (compile-time binding)
- **Ecosystem:** Adapters for 10+ logging frameworks

---

### **Case Study 3: Spring Data Repositories**

**Background:**
Spring Data uses Adapter pattern to provide unified repository interface for different databases (JPA, MongoDB, Redis, Cassandra).

**Implementation:**

```java
// Target interface (Spring Data)
public interface UserRepository extends Repository<User, Long> {
    User findById(Long id);
    List<User> findAll();
    User save(User user);
    void delete(User user);
}

// Adaptee 1: JPA (SQL databases)
@Entity
public class UserEntity {
    @Id
    private Long id;
    private String email;
    private String name;
}

// Spring Data generates JPA adapter at runtime
public class SimpleJpaRepository<User, Long> implements UserRepository {
    @PersistenceContext
    private EntityManager entityManager;
    
    @Override
    public User findById(Long id) {
        return entityManager.find(User.class, id);
    }
    
    @Override
    public User save(User user) {
        return entityManager.merge(user);
    }
    
    // ... Spring generates adapter code
}

// Adaptee 2: MongoDB
@Document
public class UserDocument {
    @Id
    private String id;
    private String email;
    private String name;
}

// Spring Data generates MongoDB adapter at runtime
public class SimpleMongoRepository<User, Long> implements UserRepository {
    private MongoTemplate mongoTemplate;
    
    @Override
    public User findById(Long id) {
        return mongoTemplate.findById(id, User.class);
    }
    
    @Override
    public User save(User user) {
        return mongoTemplate.save(user);
    }
    
    // ... Spring generates adapter code
}

// Application code: Database-agnostic
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;  // Works with JPA or MongoDB!
    
    public User getUser(Long id) {
        return userRepository.findById(id);  // Same code, different DB
    }
}

// Configuration: Switch database in application.yml
spring:
  data:
    mongodb:
      uri: mongodb://localhost/mydb  # Use MongoDB
# OR
spring:
  datasource:
    url: jdbc:postgresql://localhost/mydb  # Use PostgreSQL
```

**Results:**
- **Database Portability:** Switch from SQL to NoSQL without code changes
- **Developer Productivity:** 80% less boilerplate code
- **Adoption:** Used by 70%+ of Spring Boot applications
- **Flexibility:** Support for 15+ databases out of the box

---

### **Case Study 4: AWS SDK v2 Multi-Region**

**Background:**
AWS SDK uses adapters to handle region-specific endpoints and configurations.

**Implementation:**

```java
// Target interface
public interface S3Client {
    PutObjectResponse putObject(PutObjectRequest request);
    GetObjectResponse getObject(GetObjectRequest request);
}

// Adaptee: Region-specific implementation
public class RegionalS3Client {
    private final String endpoint;
    private final String region;
    
    public HttpResponse put(String bucket, String key, byte[] data) {
        // Region-specific HTTP call
        return httpClient.post(endpoint + "/" + bucket + "/" + key, data);
    }
}

// Adapter: Translates SDK interface to regional client
public class S3ClientImpl implements S3Client {
    private final RegionalS3Client regionalClient;
    
    @Override
    public PutObjectResponse putObject(PutObjectRequest request) {
        HttpResponse response = regionalClient.put(
            request.bucket(),
            request.key(),
            request.body().asByteArray()
        );
        
        return PutObjectResponse.builder()
            .eTag(response.header("ETag"))
            .build();
    }
}

// Factory: Creates region-specific adapter
S3Client usEast = S3Client.builder()
    .region(Region.US_EAST_1)  // Adapter for us-east-1
    .build();

S3Client euWest = S3Client.builder()
    .region(Region.EU_WEST_1)  // Adapter for eu-west-1
    .build();

// Same interface, different regions
usEast.putObject(request);  // Calls us-east-1 endpoint
euWest.putObject(request);  // Calls eu-west-1 endpoint
```

**Results:**
- **Multi-Region Support:** 25+ regions with unified interface
- **Failover:** Automatic region failover on errors
- **Cost Optimization:** Route to cheapest region
- **Compliance:** Data residency requirements met automatically

---

### **Case Study 5: Stripe API Migration (Real Company)**

**Background:**
E-commerce company needed to migrate from Stripe v1 API to v3 API without breaking existing payment flows.

**Problem:**
- 500+ payment-related code locations
- Stripe v1 → v3: Breaking API changes
- Can't stop processing payments (24/7 operation)
- Need gradual migration (not big bang)

**Solution with Adapter:**

```java
// Target interface (internal)
public interface PaymentGateway {
    PaymentResult charge(BigDecimal amount, String currency, String customerId);
}

// Adaptee 1: Stripe v1 (legacy)
public class StripeV1 {
    public Charge create(Map<String, Object> params) {
        // v1 API call
    }
}

// Adapter 1: Stripe v1
public class StripeV1Adapter implements PaymentGateway {
    private final StripeV1 stripe;
    
    @Override
    public PaymentResult charge(BigDecimal amount, String currency, String customerId) {
        Map<String, Object> params = new HashMap<>();
        params.put("amount", amount.multiply(new BigDecimal("100")).intValue());
        params.put("currency", currency);
        params.put("customer", customerId);
        
        Charge charge = stripe.create(params);
        return new PaymentResult(charge.getId(), charge.getStatus());
    }
}

// Adaptee 2: Stripe v3 (new)
public class StripeV3 {
    public ChargeResponse createCharge(ChargeRequest request) {
        // v3 API call
    }
}

// Adapter 2: Stripe v3
public class StripeV3Adapter implements PaymentGateway {
    private final StripeV3 stripe;
    
    @Override
    public PaymentResult charge(BigDecimal amount, String currency, String customerId) {
        ChargeRequest request = ChargeRequest.builder()
            .amount(amount.multiply(new BigDecimal("100")).longValue())
            .currency(currency)
            .customerId(customerId)
            .build();
        
        ChargeResponse response = stripe.createCharge(request);
        return new PaymentResult(response.getId(), response.getStatus());
    }
}

// Configuration: Gradual rollout
@Bean
public PaymentGateway paymentGateway(
        @Value("${stripe.version}") String version) {
    if ("v3".equals(version)) {
        return new StripeV3Adapter(new StripeV3());
    } else {
        return new StripeV1Adapter(new StripeV1());
    }
}

// Canary deployment
# Week 1: 1% traffic to v3
stripe.version=v1  # 99% of servers
stripe.version=v3  # 1% of servers

# Week 2: 10% traffic to v3
# Week 3: 50% traffic to v3
# Week 4: 100% traffic to v3
```

**Results:**
- **Zero Downtime:** Gradual migration over 4 weeks
- **Risk Mitigation:** Rollback is configuration change
- **Code Changes:** 1 adapter class (vs 500+ files)
- **Incidents:** 0 (vs estimated 10+ without adapter)
- **Savings:** $500K (avoided downtime and incidents)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "Adapter Pattern is a structural pattern that makes incompatible interfaces work together. It acts as a bridge by wrapping an existing class with a new interface, translating calls from one interface to another.
>
> **The classic analogy is a power adapter**—you have a US plug but need to plug into a European outlet. The adapter doesn't change the plug or the outlet; it just makes them compatible.
>
> **In software, this happens when:**
> - Integrating third-party libraries with different interfaces
> - Working with legacy systems that can't be modified
> - Supporting multiple implementations with different APIs
>
> **For example, payment gateways.** Stripe, PayPal, and Square all have different APIs:
> ```java
> // Stripe
> stripe.createCharge(amount, currency, customer);
>
> // PayPal
> paypal.makePayment(paymentDetails, payer);
>
> // Square
> square.charge(chargeRequest);
> ```
>
> **Without adapters, your code is tightly coupled:**
> ```java
> if (provider.equals("stripe")) {
>     stripe.createCharge(amount, currency, customer);
> } else if (provider.equals("paypal")) {
>     paypal.makePayment(paymentDetails, payer);
> }
> // Payment logic scattered everywhere!
> ```
>
> **With adapters, you have a uniform interface:**
> ```java
> interface PaymentGateway {
>     PaymentResult charge(PaymentRequest request);
> }
>
> class StripeAdapter implements PaymentGateway {
>     public PaymentResult charge(PaymentRequest request) {
>         // Translate to Stripe's interface
>         return stripe.createCharge(request.getAmount(), ...);
>     }
> }
>
> class PayPalAdapter implements PaymentGateway {
>     public PaymentResult charge(PaymentRequest request) {
>         // Translate to PayPal's interface
>         return paypal.makePayment(...);
>     }
> }
> ```
>
> **Now your application code is clean:**
> ```java
> PaymentGateway gateway = getPaymentGateway();  // Injected
> PaymentResult result = gateway.charge(request);  // Provider-agnostic!
> ```
>
> **Key benefits:**
> 1. **Decoupling:** Application doesn't depend on specific provider APIs
> 2. **Flexibility:** Switch providers by changing configuration, not code
> 3. **Testability:** Easy to create fake adapters for testing
> 4. **Maintainability:** Provider-specific logic isolated in adapters
>
> **Real-world examples:**
> - **JDBC:** Every database driver is an adapter (PostgreSQL, MySQL, Oracle)
> - **SLF4J:** Adapts Log4j, Logback, JUL to unified logging interface
> - **Spring Data:** Adapts JPA, MongoDB, Redis to common repository interface
>
> **The pattern is essential for:**
> - **Multi-cloud:** Adapt AWS, GCP, Azure to unified interface
> - **Payment processing:** Adapt Stripe, PayPal, Square
> - **Logging:** Adapt different logging frameworks
> - **Database:** Adapt SQL and NoSQL databases
>
> **In production, I've used adapters for payment gateway integration**—we started with Stripe but needed to add PayPal. Instead of scattering PayPal-specific code everywhere, we created adapters for both. Later, when we added Square, it was just one new adapter class. The application code never changed."

---

### **Common Follow-Up Questions**

#### **Q1: What's the difference between Adapter and Facade patterns?**

> "Great question—they're both structural patterns that provide simplified interfaces, but they have different intents and use cases.
>
> **Adapter Pattern:**
> - **Intent:** Make incompatible interfaces compatible
> - **Focus:** Interface translation
> - **Constraint:** Works with existing interfaces (can't change them)
> - **Result:** One-to-one mapping (one adapter per adaptee)
>
> **Facade Pattern:**
> - **Intent:** Provide simplified interface to complex subsystem
> - **Focus:** Interface simplification
> - **Control:** You design the simplified interface
> - **Result:** Many-to-one (facade hides multiple classes)
>
> **Example: Payment System**
>
> **Adapter (Interface Translation):**
> ```java
> // Target interface (what you want)
> interface PaymentGateway {
>     PaymentResult charge(PaymentRequest request);
> }
>
> // Adaptee (what you have - can't change)
> class StripeAPI {
>     ChargeResponse createCharge(Map<String, Object> params);
> }
>
> // Adapter (translates interface)
> class StripeAdapter implements PaymentGateway {
>     private StripeAPI stripe;
>     
>     public PaymentResult charge(PaymentRequest request) {
>         // Translate your interface to Stripe's interface
>         Map<String, Object> params = new HashMap<>();
>         params.put("amount", request.getAmount());
>         params.put("currency", request.getCurrency());
>         
>         ChargeResponse response = stripe.createCharge(params);
>         
>         return new PaymentResult(response);  // Translate back
>     }
> }
> ```
>
> **Facade (Interface Simplification):**
> ```java
> // Complex subsystem (multiple classes)
> class PaymentValidator { ... }
> class FraudDetector { ... }
> class TransactionLogger { ... }
> class PaymentGateway { ... }
> class NotificationService { ... }
>
> // Facade (simplified interface)
> class PaymentFacade {
>     private PaymentValidator validator;
>     private FraudDetector fraudDetector;
>     private TransactionLogger logger;
>     private PaymentGateway gateway;
>     private NotificationService notifier;
>     
>     public PaymentResult processPayment(PaymentRequest request) {
>         // Simplifies complex workflow
>         validator.validate(request);
>         fraudDetector.checkFraud(request);
>         PaymentResult result = gateway.charge(request);
>         logger.log(result);
>         notifier.sendReceipt(result);
>         return result;
>     }
> }
>
> // Client: Simple one-method call
> PaymentResult result = paymentFacade.processPayment(request);
> // Instead of calling 5 different classes
> ```
>
> **Key Differences:**
>
> | **Aspect** | **Adapter** | **Facade** |
> |------------|-------------|------------|
> | **Purpose** | Interface compatibility | Interface simplification |
> | **Problem** | Incompatible interfaces | Complex subsystem |
> | **Solution** | Translate interface | Hide complexity |
> | **Classes** | One adapter per adaptee | One facade for many classes |
> | **Relationship** | One-to-one | Many-to-one |
> | **Intent** | Make existing interfaces work | Create new simplified interface |
>
> **When to use each:**
>
> **Adapter:**
> - Third-party library has different interface
> - Legacy system can't be modified
> - Need to support multiple implementations
> - Example: Database drivers (JDBC), logging frameworks (SLF4J)
>
> **Facade:**
> - Complex subsystem with many classes
> - Want to provide simple interface to common operations
> - Hide implementation details
> - Example: Framework APIs, library wrappers
>
> **They can work together:**
> ```java
> // Adapter: Makes Stripe compatible
> class StripeAdapter implements PaymentGateway { ... }
>
> // Facade: Simplifies payment workflow
> class PaymentFacade {
>     private PaymentGateway gateway;  // Uses adapter
>     
>     public PaymentResult processPayment(Order order) {
>         // Simplifies payment flow using adapted gateway
>     }
> }
> ```
>
> **Real example:** Spring JDBC uses both. `JdbcTemplate` is a facade that simplifies database operations (hides connection management, exception translation, etc.). Under the hood, it uses JDBC drivers which are adapters for different databases."

---

#### **Q2: When would you use Adapter over just refactoring the code?**

> "Excellent question—this is about knowing when to adapt versus when to refactor. The decision depends on whether you can modify the code.
>
> **Use Adapter When:**
>
> **1. Can't Modify the Source**
> ```java
> // Third-party library (can't modify)
> public class ThirdPartyLogger {
>     public void writeLog(int level, String message) { ... }
> }
>
> // Can't change ThirdPartyLogger, so adapt it
> class LoggerAdapter implements Logger {
>     private ThirdPartyLogger logger;
>     
>     public void log(String level, String message) {
>         logger.writeLog(convertLevel(level), message);
>     }
> }
>
> // ✓ Adapter is correct choice
> ```
>
> **2. Legacy System (Too Risky to Refactor)**
> ```java
> // Legacy payment system (10 years old, 1M lines)
> class LegacyPaymentProcessor {
>     public int processPayment(String xml) { ... }  // Returns error code
> }
>
> // Risky to refactor (might break existing integrations)
> // Safer to adapt for new code
> class LegacyPaymentAdapter implements PaymentGateway {
>     private LegacyPaymentProcessor legacy;
>     
>     public PaymentResult charge(PaymentRequest request) {
>         String xml = requestToXML(request);
>         int errorCode = legacy.processPayment(xml);
>         return new PaymentResult(errorCode == 0);
>     }
> }
>
> // ✓ Adapter is safer than refactoring
> ```
>
> **3. Multiple Implementations with Different Interfaces**
> ```java
> // Stripe API
> stripe.createCharge(params);
>
> // PayPal API
> paypal.createPayment(details);
>
> // Square API
> square.charge(request);
>
> // Can't make them all have the same interface (not our code)
> // Adapt each to common interface
>
> // ✓ Adapter is the only option
> ```
>
> **4. Gradual Migration**
> ```java
> // Migrating from old API to new API
> // Both need to coexist during migration
>
> // Adapt old API to new interface
> class OldAPIAdapter implements NewAPI {
>     private OldAPI oldAPI;
>     // Translation logic
> }
>
> // Gradually switch users from old to new
> // ✓ Adapter enables gradual migration
> ```
>
> ---
>
> **Use Refactoring When:**
>
> **1. You Own Both Interfaces**
> ```java
> // Your code
> class OldUserService {
>     public User getUser(int id) { ... }
> }
>
> // Your code
> class NewUserService {
>     public User findById(Long id) { ... }
> }
>
> // ❌ Don't use adapter (you control both)
> // ✓ Just refactor OldUserService to match NewUserService
> ```
>
> **2. Interfaces Are Similar**
> ```java
> interface ReportGenerator {
>     void generateReport(String format);
> }
>
> interface DocumentGenerator {
>     void generate(String type);  // Almost same interface
> }
>
> // ❌ Don't use adapter (interfaces too similar)
> // ✓ Refactor to use same interface
> ```
>
> **3. Adapter Logic Is Complex**
> ```java
> class ComplexAdapter implements Target {
>     private Adaptee adaptee;
>     
>     public void method1() {
>         // 100 lines of translation logic
>         adaptee.call1();
>         adaptee.call2();
>         // More translation
>     }
> }
>
> // ❌ Adapter is too complex (code smell)
> // ✓ Refactor adaptee to have better interface
> ```
>
> **4. Only One Implementation**
> ```java
> class PaymentAdapter implements PaymentGateway {
>     private StripeAPI stripe;  // Only Stripe, no other providers
> }
>
> // ❌ Adapter is overkill (only one implementation)
> // ✓ Just use Stripe directly (or refactor to common interface if planning for more)
> ```
>
> ---
>
> **Decision Framework:**
>
> ```
> Can you modify the source code?
>   │
>   ├─ NO ──> Use Adapter
>   │         (Third-party library, legacy system)
>   │
>   └─ YES ──> Is it risky to modify?
>              │
>              ├─ YES ──> Use Adapter
>              │         (Legacy code, production system)
>              │
>              └─ NO ──> Are interfaces very different?
>                        │
>                        ├─ YES ──> Use Adapter
>                        │         (Major API changes)
>                        │
>                        └─ NO ──> Refactor
>                                  (Small differences, you own code)
> ```
>
> **Real Example:**
>
> At my company, we had to integrate Stripe and PayPal. We **adapted** them to a common interface because:
> 1. Can't modify Stripe/PayPal SDKs (third-party)
> 2. APIs are very different (Stripe uses tokens, PayPal uses payment details)
> 3. Need to support both simultaneously
>
> But for our internal services, when we migrated from `UserService` v1 to v2, we **refactored** instead of adapting because:
> 1. We own the code
> 2. Changes were safe (good test coverage)
> 3. v1 and v2 were similar (just method renames)
> 4. Didn't need both versions simultaneously
>
> **Rule of thumb:** If you can't touch the code or it's too risky, use Adapter. If you can safely modify it, refactor."

---

#### **Q3: How do you handle adapters for APIs that change frequently?**

> "This is a real challenge in production systems—third-party APIs evolve and you need to adapt to changes without breaking your application. Here's my approach:
>
> **Strategy 1: Version-Specific Adapters**
>
> ```java
> // Common interface (stable)
> public interface PaymentGateway {
>     PaymentResult charge(PaymentRequest request);
> }
>
> // Adapter for Stripe API v1
> public class StripeV1Adapter implements PaymentGateway {
>     private final StripeV1Client stripe;
>     
>     @Override
>     public PaymentResult charge(PaymentRequest request) {
>         // v1-specific translation
>         return stripe.createCharge(toV1Params(request));
>     }
> }
>
> // Adapter for Stripe API v3 (new version)
> public class StripeV3Adapter implements PaymentGateway {
>     private final StripeV3Client stripe;
>     
>     @Override
>     public PaymentResult charge(PaymentRequest request) {
>         // v3-specific translation (different API)
>         return stripe.charges().create(toV3Request(request));
>     }
> }
>
> // Configuration: Easy version switching
> @Bean
> public PaymentGateway stripeGateway(@Value("${stripe.version}") String version) {
>     if ("v3".equals(version)) {
>         return new StripeV3Adapter(new StripeV3Client());
>     } else {
>         return new StripeV1Adapter(new StripeV1Client());
>     }
> }
>
> // Benefits:
> // ✓ Support multiple API versions simultaneously
> // ✓ Gradual migration (canary deployment)
> // ✓ Easy rollback (change configuration)
> // ✓ Adapters isolated (v1 changes don't affect v3)
> ```
>
> **Strategy 2: Adapter Abstraction Layer**
>
> ```java
> // Very stable interface (rarely changes)
> public interface PaymentGateway {
>     PaymentResult charge(PaymentRequest request);
> }
>
> // Abstraction: Stripe-specific operations
> interface StripeOperations {
>     StripeCharge createCharge(StripeChargeParams params);
>     StripeRefund createRefund(String chargeId, long amount);
> }
>
> // Implementation: Adapt Stripe API to StripeOperations
> class StripeV3Operations implements StripeOperations {
>     private StripeV3Client client;
>     
>     @Override
>     public StripeCharge createCharge(StripeChargeParams params) {
>         // v3-specific call
>         return client.charges().create(params);
>     }
> }
>
> // Adapter: Uses StripeOperations (not direct API)
> class StripePaymentAdapter implements PaymentGateway {
>     private StripeOperations operations;  // Abstraction layer
>     
>     @Override
>     public PaymentResult charge(PaymentRequest request) {
>         StripeChargeParams params = toStripeParams(request);
>         StripeCharge charge = operations.createCharge(params);
>         return toPaymentResult(charge);
>     }
> }
>
> // Benefits:
> // ✓ Two layers of adaptation (more flexible)
> // ✓ API changes isolated to StripeV3Operations
> // ✓ Adapter logic stable (uses StripeOperations)
> ```
>
> **Strategy 3: Feature-Based Adapters**
>
> ```java
> // Break adapter into feature-specific components
>
> // Payment charging
> interface ChargeAdapter {
>     PaymentResult charge(PaymentRequest request);
> }
>
> // Refunds
> interface RefundAdapter {
>     RefundResult refund(RefundRequest request);
> }
>
> // Status checking
> interface StatusAdapter {
>     PaymentStatus checkStatus(String transactionId);
> }
>
> // Composite adapter
> class StripePaymentAdapter implements PaymentGateway {
>     private final ChargeAdapter chargeAdapter;
>     private final RefundAdapter refundAdapter;
>     private final StatusAdapter statusAdapter;
>     
>     // Delegate to feature-specific adapters
>     public PaymentResult charge(PaymentRequest request) {
>         return chargeAdapter.charge(request);
>     }
>     
>     public RefundResult refund(RefundRequest request) {
>         return refundAdapter.refund(request);
>     }
>     
>     public PaymentStatus checkStatus(String id) {
>         return statusAdapter.checkStatus(id);
>     }
> }
>
> // Benefits:
> // ✓ Change one feature without affecting others
> // ✓ Easy to test individual features
> // ✓ Small, focused adapter classes
> ```
>
> **Strategy 4: API Client Wrapper (Internal SDK)**
>
> ```java
> // Create internal wrapper around third-party SDK
> public class StripeClientWrapper {
>     private final StripeClient stripe;
>     
>     public StripeCharge createCharge(Money amount, Customer customer) {
>         // Handle API version differences internally
>         if (isV3API()) {
>             return stripe.charges().create(toV3Request(amount, customer));
>         } else {
>             return stripe.createCharge(toV1Params(amount, customer));
>         }
>     }
> }
>
> // Adapter uses stable wrapper (not raw SDK)
> class StripePaymentAdapter implements PaymentGateway {
>     private StripeClientWrapper wrapper;  // Stable interface
>     
>     public PaymentResult charge(PaymentRequest request) {
>         StripeCharge charge = wrapper.createCharge(
>             request.getAmount(),
>             request.getCustomer()
>         );
>         return toPaymentResult(charge);
>     }
> }
>
> // Benefits:
> // ✓ API changes isolated to wrapper
> // ✓ Can version the wrapper independently
> // ✓ Reusable across multiple adapters
> ```
>
> **Strategy 5: Automated Testing**
>
> ```java
> // Contract tests: Verify adapter still works after API changes
> @Test
> public void testStripeAdapterContract() {
>     PaymentGateway gateway = new StripeV3Adapter(stripeClient);
>     
>     PaymentRequest request = PaymentRequest.builder()
>         .amount(new BigDecimal("10.00"))
>         .currency("USD")
>         .build();
>     
>     PaymentResult result = gateway.charge(request);
>     
>     // Verify contract
>     assertNotNull(result);
>     assertNotNull(result.getTransactionId());
>     assertTrue(result.isSuccess() || result.isFailure());
> }
>
> // Run tests against real Stripe API (sandbox)
> // Detects breaking changes immediately
> ```
>
> **Strategy 6: Feature Flags for Gradual Migration**
>
> ```java
> @Service
> public class PaymentService {
>     @Autowired
>     @Qualifier("stripeV1")
>     private PaymentGateway stripeV1;
>     
>     @Autowired
>     @Qualifier("stripeV3")
>     private PaymentGateway stripeV3;
>     
>     @Autowired
>     private FeatureFlags featureFlags;
>     
>     public PaymentResult processPayment(PaymentRequest request) {
>         // Gradual rollout of new API
>         if (featureFlags.isEnabled("stripe-v3", request.getCustomerId())) {
>             return stripeV3.charge(request);  // New API
>         } else {
>             return stripeV1.charge(request);  // Old API
>         }
>     }
> }
>
> // Week 1: 1% traffic to v3
> // Week 2: 10% traffic to v3
> // Week 3: 50% traffic to v3
> // Week 4: 100% traffic to v3
> // Week 5: Remove v1 code
> ```
>
> **Real Example:**
>
> We integrated Stripe and they released v3 API with breaking changes. Our approach:
>
> 1. **Created StripeV3Adapter** alongside StripeV1Adapter
> 2. **Contract tests** detected incompatibilities immediately
> 3. **Feature flag** controlled which adapter was used
> 4. **Gradual rollout** over 3 weeks (1% → 10% → 50% → 100%)
> 5. **Monitoring** showed v3 had slightly better latency
> 6. **Rollback** was just disabling feature flag (happened once during rollout)
> 7. **Removed v1 code** after 1 month of stable v3
>
> **Key Practices:**
>
> 1. **Keep your interface stable** (don't expose third-party types)
> 2. **Version adapters explicitly** (StripeV1Adapter, StripeV3Adapter)
> 3. **Automated testing** against real API (detect breaking changes)
> 4. **Feature flags** for gradual migration
> 5. **Monitoring** to compare adapter performance
> 6. **Documentation** of API version compatibility
>
> This approach saved us from a big-bang migration disaster and allowed us to adopt new API features gradually while maintaining production stability."

---

#### **Q4: How do you test Adapter Pattern implementations?**

> "Testing adapters requires a multi-layered approach because adapters sit between your application and external systems. Here's my comprehensive testing strategy:
>
> **Layer 1: Unit Tests (Mock the Adaptee)**
>
> ```java
> @Test
> public void testStripeAdapter_Charge_Success() {
>     // Mock the third-party library
>     StripeClient mockStripe = mock(StripeClient.class);
>     ChargeResponse mockResponse = new ChargeResponse("ch_123", "succeeded");
>     when(mockStripe.createCharge(any())).thenReturn(mockResponse);
>     
>     // Test the adapter
>     PaymentGateway adapter = new StripePaymentAdapter(mockStripe);
>     PaymentRequest request = new PaymentRequest(/* ... */);
>     
>     PaymentResult result = adapter.charge(request);
>     
>     // Verify translation
>     assertTrue(result.isSuccess());
>     assertEquals("ch_123", result.getTransactionId());
>     
>     // Verify correct parameters passed to Stripe
>     ArgumentCaptor<ChargeRequest> captor = ArgumentCaptor.forClass(ChargeRequest.class);
>     verify(mockStripe).createCharge(captor.capture());
>     assertEquals(1000, captor.getValue().getAmount());  // $10.00 → 1000 cents
> }
>
> @Test
> public void testStripeAdapter_Charge_Failure() {
>     StripeClient mockStripe = mock(StripeClient.class);
>     when(mockStripe.createCharge(any()))
>         .thenThrow(new StripeException("Card declined"));
>     
>     PaymentGateway adapter = new StripePaymentAdapter(mockStripe);
>     PaymentRequest request = new PaymentRequest(/* ... */);
>     
>     PaymentResult result = adapter.charge(request);
>     
>     assertFalse(result.isSuccess());
>     assertEquals("Card declined", result.getMessage());
> }
> ```
>
> **Layer 2: Integration Tests (Real External System)**
>
> ```java
> @SpringBootTest
> @ActiveProfiles("integration-test")
> public class StripeAdapterIntegrationTest {
>     
>     @Autowired
>     private PaymentGateway stripeAdapter;  // Real Stripe adapter
>     
>     @Test
>     public void testRealStripeCharge() {
>         // Use Stripe test environment
>         PaymentRequest request = PaymentRequest.builder()
>             .amount(new BigDecimal("1.00"))
>             .currency("USD")
>             .paymentMethod("tok_visa")  // Stripe test token
>             .build();
>         
>         PaymentResult result = stripeAdapter.charge(request);
>         
>         assertTrue(result.isSuccess());
>         assertNotNull(result.getTransactionId());
>         assertTrue(result.getTransactionId().startsWith("ch_"));  // Stripe format
>     }
>     
>     @Test
>     public void testRealStripeDecline() {
>         PaymentRequest request = PaymentRequest.builder()
>             .amount(new BigDecimal("1.00"))
>             .paymentMethod("tok_chargeDeclined")  // Stripe test token for decline
>             .build();
>         
>         PaymentResult result = stripeAdapter.charge(request);
>         
>         assertFalse(result.isSuccess());
>         assertThat(result.getMessage()).contains("card was declined");
>     }
> }
> ```
>
> **Layer 3: Contract Tests (Verify API Compatibility)**
>
> ```java
> // Contract test: Ensures adapter meets interface contract
> @Test
> public void testPaymentGatewayContract() {
>     PaymentGateway adapter = new StripePaymentAdapter(realStripeClient);
>     
>     // Contract: charge() must return non-null result
>     PaymentRequest request = PaymentRequest.builder()
>         .amount(new BigDecimal("1.00"))
>         .currency("USD")
>         .build();
>     
>     PaymentResult result = adapter.charge(request);
>     
>     assertNotNull(result);
>     assertNotNull(result.isSuccess());  // Must have success flag
>     assertNotNull(result.getTransactionId());  // Must have transaction ID
> }
>
> // Contract test: Verify all adapters implement same contract
> @ParameterizedTest
> @MethodSource("paymentAdapters")
> public void testAllAdaptersFollowContract(PaymentGateway adapter) {
>     PaymentRequest request = PaymentRequest.builder()
>         .amount(new BigDecimal("1.00"))
>         .currency("USD")
>         .build();
>     
>     PaymentResult result = adapter.charge(request);
>     
>     // All adapters must return consistent result structure
>     assertNotNull(result);
>     assertNotNull(result.getTransactionId());
>     assertTrue(result.isSuccess() || !result.isSuccess());  // Boolean
> }
>
> static Stream<PaymentGateway> paymentAdapters() {
>     return Stream.of(
>         new StripePaymentAdapter(stripeClient),
>         new PayPalPaymentAdapter(paypalClient),
>         new SquarePaymentAdapter(squareClient)
>     );
> }
> ```
>
> **Layer 4: Fake Adapter (For Application Tests)**
>
> ```java
> // Fake adapter for testing application logic
> public class FakePaymentAdapter implements PaymentGateway {
>     private boolean shouldSucceed = true;
>     private Map<String, PaymentResult> transactions = new HashMap<>();
>     
>     @Override
>     public PaymentResult charge(PaymentRequest request) {
>         if (!shouldSucceed) {
>             return new PaymentResult(false, null, "Simulated failure");
>         }
>         
>         String txnId = "fake_" + UUID.randomUUID().toString();
>         PaymentResult result = new PaymentResult(true, txnId, "succeeded");
>         transactions.put(txnId, result);
>         return result;
>     }
>     
>     // Test helpers
>     public void simulateFailure() { this.shouldSucceed = false; }
>     public void reset() { 
>         this.shouldSucceed = true;
>         this.transactions.clear();
>     }
>     public boolean wasCharged(String txnId) {
>         return transactions.containsKey(txnId);
>     }
> }
>
> // Use in application tests
> @SpringBootTest
> public class OrderServiceTest {
>     @MockBean
>     private PaymentGateway paymentGateway;
>     
>     @Autowired
>     private OrderService orderService;
>     
>     @Test
>     public void testOrderCreation() {
>         // Mock payment success
>         when(paymentGateway.charge(any()))
>             .thenReturn(new PaymentResult(true, "txn_123", "succeeded"));
>         
>         Order order = orderService.createOrder(/* ... */);
>         
>         assertEquals(OrderStatus.CONFIRMED, order.getStatus());
>         verify(paymentGateway).charge(any());
>     }
> }
> ```
>
> **Layer 5: Property-Based Testing**
>
> ```java
> // Property: Money conversions should be reversible
> @Property
> public void testMoneyConversion(@ForAll @BigRange(min = "0.01", max = "10000") BigDecimal amount) {
>     // Convert dollars to cents
>     long cents = stripeAdapter.dollarsToCents(amount);
>     
>     // Convert back
>     BigDecimal dollars = stripeAdapter.centsToDollars(cents);
>     
>     // Should be equal (within rounding error)
>     assertEquals(amount.doubleValue(), dollars.doubleValue(), 0.01);
> }
>
> // Property: Status conversion should be deterministic
> @Property
> public void testStatusConversion(@ForAll("stripeStatuses") String stripeStatus) {
>     PaymentStatus status1 = stripeAdapter.convertStatus(stripeStatus);
>     PaymentStatus status2 = stripeAdapter.convertStatus(stripeStatus);
>     
>     assertEquals(status1, status2);  // Same input → same output
> }
> ```
>
> **Layer 6: Error Handling Tests**
>
> ```java
> @Test
> public void testNetworkTimeout() {
>     StripeClient mockStripe = mock(StripeClient.class);
>     when(mockStripe.createCharge(any()))
>         .thenThrow(new SocketTimeoutException("Connection timeout"));
>     
>     PaymentGateway adapter = new StripePaymentAdapter(mockStripe);
>     
>     PaymentResult result = adapter.charge(request);
>     
>     assertFalse(result.isSuccess());
>     assertThat(result.getMessage()).contains("timeout");
> }
>
> @Test
> public void testInvalidResponse() {
>     StripeClient mockStripe = mock(StripeClient.class);
>     ChargeResponse invalidResponse = new ChargeResponse(null, null);  // Invalid
>     when(mockStripe.createCharge(any())).thenReturn(invalidResponse);
>     
>     PaymentGateway adapter = new StripePaymentAdapter(mockStripe);
>     
>     assertThrows(AdapterException.class, () -> {
>         adapter.charge(request);
>     });
> }
> ```
>
> **Layer 7: Performance Tests**
>
> ```java
> @Test
> public void testAdapterPerformance() {
>     PaymentGateway adapter = new StripePaymentAdapter(mockStripe);
>     
>     long start = System.currentTimeMillis();
>     
>     for (int i = 0; i < 10000; i++) {
>         adapter.charge(request);
>     }
>     
>     long duration = System.currentTimeMillis() - start;
>     
>     // Adapter overhead should be < 1ms per call
>     assertTrue(duration < 10000);  // 10,000 calls in 10 seconds
> }
> ```
>
> **Test Organization:**
>
> ```
> src/test/java/
>   adapters/
>     payment/
>       stripe/
>         StripePaymentAdapterTest.java          # Unit tests (fast)
>         StripePaymentAdapterIntegrationTest.java  # Integration tests (slow)
>         StripePaymentAdapterContractTest.java  # Contract tests
>       FakePaymentAdapter.java                  # Test double
>       PaymentGatewayContractTest.java          # Tests all adapters
> ```
>
> **Best Practices:**
>
> 1. **Unit tests (fast):** Mock adaptee, test translation logic
> 2. **Integration tests (slow):** Real external system, test actual API calls
> 3. **Contract tests:** Verify all adapters implement same interface correctly
> 4. **Fake adapters:** For testing application logic without real external systems
> 5. **Error tests:** Network errors, timeouts, invalid responses
> 6. **Performance tests:** Verify adapter overhead is negligible
>
> **Real Example:**
>
> For our payment adapters, we have:
> - **500+ unit tests:** Fast (5 seconds), run on every commit
> - **50 integration tests:** Slow (2 minutes), run nightly against real Stripe/PayPal sandbox
> - **Contract tests:** Ensure all 3 payment adapters (Stripe, PayPal, Square) have consistent behavior
> - **FakePaymentAdapter:** Used in 1000+ application tests (don't hit real payment APIs)
>
> This layered approach catches bugs at different levels and gives us confidence that adapters work correctly in production."

---

#### **Q5: What are common mistakes when implementing Adapter Pattern?**

> "I've seen (and made) several mistakes with Adapter Pattern. Here are the most common pitfalls:
>
> **Mistake 1: Exposing Adaptee Types in Interface**
>
> ```java
> // BAD: Exposes Stripe types
> public interface PaymentGateway {
>     StripeCharge charge(PaymentRequest request);  // ❌ Stripe type!
> }
>
> // Problem: Clients depend on Stripe SDK
> // Can't swap to PayPal without changing interface
>
> // GOOD: Use your own types
> public interface PaymentGateway {
>     PaymentResult charge(PaymentRequest request);  // ✓ Your type
> }
>
> public class PaymentResult {  // Your class
>     private boolean success;
>     private String transactionId;
>     private String message;
> }
> ```
>
> ---
>
> **Mistake 2: Not Handling Exceptions Properly**
>
> ```java
> // BAD: Lets third-party exceptions leak
> public PaymentResult charge(PaymentRequest request) {
>     return stripe.createCharge(request);  // ❌ Throws StripeException
> }
>
> // Problem: Clients must handle StripeException
> // Breaks abstraction (clients know about Stripe)
>
> // GOOD: Translate exceptions
> public PaymentResult charge(PaymentRequest request) {
>     try {
>         StripeCharge charge = stripe.createCharge(toStripeRequest(request));
>         return new PaymentResult(true, charge.getId(), "succeeded");
>     } catch (StripeException e) {
>         // Translate to your exception
>         throw new PaymentException("Payment failed: " + e.getMessage(), e);
>     }
> }
> ```
>
> ---
>
> **Mistake 3: Incomplete Adaptation**
>
> ```java
> // BAD: Doesn't translate all fields
> public PaymentResult charge(PaymentRequest request) {
>     StripeCharge charge = stripe.createCharge(
>         request.getAmount(),
>         request.getCurrency()
>         // ❌ Missing: customer, metadata, description
>     );
>     return new PaymentResult(charge.getId());
>     // ❌ Missing: status, error message, receipt URL
> }
>
> // Problem: Loses information
> // Clients can't get full details
>
> // GOOD: Complete translation
> public PaymentResult charge(PaymentRequest request) {
>     ChargeRequest stripeRequest = ChargeRequest.builder()
>         .amount(convertAmount(request.getAmount()))
>         .currency(request.getCurrency())
>         .customer(request.getCustomerId())
>         .metadata(request.getMetadata())
>         .description(request.getDescription())
>         .build();
>     
>     StripeCharge charge = stripe.createCharge(stripeRequest);
>     
>     return PaymentResult.builder()
>         .success(charge.isSuccess())
>         .transactionId(charge.getId())
>         .message(charge.getStatus())
>         .receiptUrl(charge.getReceiptUrl())
>         .metadata(charge.getMetadata())
>         .build();
> }
> ```
>
> ---
>
> **Mistake 4: Stateful Adapter**
>
> ```java
> // BAD: Adapter has mutable state
> public class StripeAdapter implements PaymentGateway {
>     private String lastTransactionId;  // ❌ State!
>     
>     public PaymentResult charge(PaymentRequest request) {
>         StripeCharge charge = stripe.createCharge(request);
>         this.lastTransactionId = charge.getId();  // ❌ Mutating state
>         return new PaymentResult(charge);
>     }
>     
>     public String getLastTransactionId() {
>         return lastTransactionId;  // ❌ Not thread-safe!
>     }
> }
>
> // Problem: Not thread-safe, hard to test
>
> // GOOD: Stateless adapter
> public class StripeAdapter implements PaymentGateway {
>     private final StripeClient stripe;  // Immutable dependency
>     
>     public PaymentResult charge(PaymentRequest request) {
>         StripeCharge charge = stripe.createCharge(request);
>         return new PaymentResult(charge);  // Return all data
>     }
> }
> ```
>
> ---
>
> **Mistake 5: Adapter Doing Too Much**
>
> ```java
> // BAD: Adapter has business logic
> public PaymentResult charge(PaymentRequest request) {
>     // ❌ Business logic in adapter
>     if (request.getAmount().compareTo(new BigDecimal("1000")) > 0) {
>         sendFraudAlert(request);
>     }
>     
>     // ❌ Retry logic in adapter
>     for (int i = 0; i < 3; i++) {
>         try {
>             return stripe.createCharge(request);
>         } catch (StripeException e) {
>             if (i == 2) throw e;
>             Thread.sleep(1000);
>         }
>     }
> }
>
> // Problem: Adapter should only translate, not add logic
>
> // GOOD: Adapter only translates
> public PaymentResult charge(PaymentRequest request) {
>     // Just translation, no business logic
>     ChargeRequest stripeRequest = toStripeRequest(request);
>     StripeCharge charge = stripe.createCharge(stripeRequest);
>     return toPaymentResult(charge);
> }
>
> // Business logic in service layer
> @Service
> public class PaymentService {
>     public PaymentResult processPayment(PaymentRequest request) {
>         // Business logic here
>         if (request.getAmount().compareTo(new BigDecimal("1000")) > 0) {
>             fraudDetector.check(request);
>         }
>         
>         // Retry logic here
>         return retryTemplate.execute(() -> paymentGateway.charge(request));
>     }
> }
> ```
>
> ---
>
> **Mistake 6: Not Using Dependency Injection**
>
> ```java
> // BAD: Creates adaptee directly
> public class StripeAdapter implements PaymentGateway {
>     private StripeClient stripe = new StripeClient();  // ❌ Hard-coded
>     
>     public PaymentResult charge(PaymentRequest request) {
>         return stripe.createCharge(request);
>     }
> }
>
> // Problem: Can't inject mock for testing
> // Can't configure Stripe client
>
> // GOOD: Inject dependencies
> @Component
> public class StripeAdapter implements PaymentGateway {
>     private final StripeClient stripe;
>     
>     @Autowired
>     public StripeAdapter(StripeClient stripe) {
>         this.stripe = stripe;
>     }
>     
>     public PaymentResult charge(PaymentRequest request) {
>         return stripe.createCharge(request);
>     }
> }
> ```
>
> ---
>
> **Mistake 7: Over-Adapting**
>
> ```java
> // BAD: Adapter for simple class
> class StringAdapter implements CharSequence {
>     private String string;
>     // Adapts String to CharSequence (❌ String already implements CharSequence!)
> }
>
> // BAD: Adapter when interfaces are identical
> interface ServiceA {
>     void doSomething();
> }
>
> interface ServiceB {
>     void doSomething();  // Same signature
> }
>
> class AdapterAtoB implements ServiceB {
>     private ServiceA serviceA;
>     
>     public void doSomething() {
>         serviceA.doSomething();  // ❌ Useless adapter
>     }
> }
>
> // GOOD: Only adapt when actually needed
> // If interfaces are compatible, just use directly
> ```
>
> ---
>
> **Mistake 8: Ignoring Null Values**
>
> ```java
> // BAD: Doesn't handle nulls
> public PaymentResult charge(PaymentRequest request) {
>     ChargeRequest stripeRequest = ChargeRequest.builder()
>         .amount(convertAmount(request.getAmount()))
>         .customer(request.getCustomerId())  // ❌ NPE if null
>         .metadata(request.getMetadata())    // ❌ NPE if null
>         .build();
>     
>     return stripe.createCharge(stripeRequest);
> }
>
> // GOOD: Handle nulls gracefully
> public PaymentResult charge(PaymentRequest request) {
>     ChargeRequest.Builder builder = ChargeRequest.builder()
>         .amount(convertAmount(request.getAmount()));
>     
>     if (request.getCustomerId() != null) {
>         builder.customer(request.getCustomerId());
>     }
>     
>     if (request.getMetadata() != null) {
>         builder.metadata(request.getMetadata());
>     }
>     
>     return stripe.createCharge(builder.build());
> }
> ```
>
> ---
>
> **Mistake 9: Not Documenting Limitations**
>
> ```java
> // BAD: No documentation of limitations
> public class StripeAdapter implements PaymentGateway {
>     public PaymentResult charge(PaymentRequest request) {
>         // Stripe doesn't support INR currency
>         // Stripe max amount is $999,999
>         // But adapter doesn't document this!
>     }
> }
>
> // GOOD: Document limitations
> /**
>  * Stripe payment adapter.
>  * 
>  * Limitations:
>  * - Supported currencies: USD, EUR, GBP (no INR)
>  * - Maximum amount: $999,999.99
>  * - Minimum amount: $0.50
>  * - Refunds: Only full refunds supported
>  * 
>  * @throws PaymentException if currency not supported
>  * @throws PaymentException if amount exceeds limit
>  */
> public class StripeAdapter implements PaymentGateway {
>     public PaymentResult charge(PaymentRequest request) {
>         validateRequest(request);  // Validate limitations
>         // ...
>     }
> }
> ```
>
> ---
>
> **Mistake 10: Not Testing Adapter Thoroughly**
>
> ```java
> // BAD: Only happy path test
> @Test
> public void testCharge() {
>     PaymentResult result = adapter.charge(request);
>     assertTrue(result.isSuccess());
> }
>
> // GOOD: Test all scenarios
> @Test public void testCharge_Success() { ... }
> @Test public void testCharge_Declined() { ... }
> @Test public void testCharge_InsufficientFunds() { ... }
> @Test public void testCharge_NetworkError() { ... }
> @Test public void testCharge_InvalidRequest() { ... }
> @Test public void testCharge_NullValues() { ... }
> @Test public void testCharge_CurrencyConversion() { ... }
> ```
>
> ---
>
> **Key Takeaways:**
>
> 1. **Hide adaptee types** (don't expose Stripe/PayPal types in interface)
> 2. **Translate exceptions** (don't let third-party exceptions leak)
> 3. **Complete adaptation** (translate all fields, not just some)
> 4. **Stateless adapters** (no mutable state, thread-safe)
> 5. **Adapter only translates** (no business logic or retry logic)
> 6. **Use dependency injection** (for testing and configuration)
> 7. **Don't over-adapt** (only when actually needed)
> 8. **Handle nulls** gracefully
> 9. **Document limitations** clearly
> 10. **Test thoroughly** (happy path + error cases)
>
> In interviews, mentioning these pitfalls shows you've actually implemented adapters in production and understand the nuances beyond the textbook definition."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Adapter Pattern Structure**

```
ADAPTER PATTERN
═══════════════

┌─────────────────────────────────────┐
│            Client                   │
│                                     │
│  gateway.charge(request)            │
└──────────────┬──────────────────────┘
               │ uses
               ↓
┌─────────────────────────────────────┐
│   PaymentGateway (Target)           │
│                                     │
│   + charge(PaymentRequest)          │
│   + refund(RefundRequest)           │
│   + checkStatus(String)             │
└──────────────┬──────────────────────┘
               │ implements
               ↓
┌─────────────────────────────────────┐
│   StripeAdapter (Adapter)           │
│                                     │
│   - stripeClient: StripeClient      │──┐
│                                     │  │ uses
│   + charge(PaymentRequest)          │  │
│     → stripe.createCharge()         │  │
│   + refund(RefundRequest)           │  │
│     → stripe.createRefund()         │  │
└─────────────────────────────────────┘  │
                                         │
                                         ↓
┌─────────────────────────────────────┐
│   StripeClient (Adaptee)            │
│                                     │
│   + createCharge(ChargeRequest)     │
│   + createRefund(String, long)      │
│   + retrieveCharge(String)          │
└─────────────────────────────────────┘

KEY FLOW:
═════════
1. Client calls adapter using Target interface
2. Adapter translates call to Adaptee interface
3. Adaptee performs actual operation
4. Adapter translates result back to Target type
5. Client receives result in expected format

BENEFITS:
═════════
✓ Client doesn't depend on third-party types
✓ Easy to swap implementations
✓ Testable (can mock adapter)
✓ Third-party library changes isolated
```

---

### **Object Adapter vs Class Adapter**

```
OBJECT ADAPTER (Composition - Preferred)
════════════════════════════════════════

┌─────────────┐
│   Client    │
└──────┬──────┘
       │ uses
       ↓
┌─────────────┐
│   Target    │ (interface)
└──────┬──────┘
       │ implements
       ↓
┌─────────────┐
│   Adapter   │────────────┐
└─────────────┘  HAS-A     │
                           ↓
                    ┌─────────────┐
                    │   Adaptee   │
                    └─────────────┘

Code:
class Adapter implements Target {
    private Adaptee adaptee;  // Composition
    
    public void method() {
        adaptee.specificMethod();  // Delegate
    }
}

Pros:
✓ Loose coupling
✓ Can adapt multiple adaptees
✓ Runtime flexibility


CLASS ADAPTER (Inheritance - Rarely Used)
══════════════════════════════════════════

┌─────────────┐
│   Client    │
└──────┬──────┘
       │ uses
       ↓
┌─────────────┐
│   Target    │ (interface)
└──────┬──────┘
       │ implements
       │
┌──────┴──────┐
│   Adapter   │
│    (also    │
│  extends    │
│   Adaptee)  │
└─────────────┘
       │ extends
       ↓
┌─────────────┐
│   Adaptee   │
└─────────────┘

Code:
class Adapter extends Adaptee implements Target {
    public void method() {
        super.specificMethod();  // Inherited
    }
}

Cons:
❌ Tight coupling (inheritance)
❌ Can't adapt multiple adaptees
❌ No multiple inheritance in Java
```

---

### **Adapter Pattern Evolution**

```
PHASE 1: DIRECT DEPENDENCY
══════════════════════════

Application → StripeClient

Problems:
❌ Tightly coupled to Stripe
❌ Hard to swap providers
❌ Stripe types everywhere


PHASE 2: ABSTRACTION
═════════════════════

Application → PaymentGateway
                    ↓
              StripeClient

Problems:
❌ Still tightly coupled
❌ Can't use other providers easily


PHASE 3: ADAPTER PATTERN
═════════════════════════

Application → PaymentGateway ← interface
                    ↑
              ┌─────┼─────┬──────┐
              │     │     │      │
        StripeAdapter  PayPalAdapter  SquareAdapter
              │     │     │      │
              ↓     ↓     ↓      ↓
        StripeClient  PayPalClient  SquareClient

Benefits:
✓ Application decoupled from providers
✓ Easy to add/remove providers
✓ Swap providers via configuration
✓ Testable (can mock gateway)


PHASE 4: SPRING + ADAPTER
══════════════════════════

@Bean
PaymentGateway gateway(
    @Value("${payment.provider}") String provider) {
    switch (provider) {
        case "stripe": 
            return new StripeAdapter(stripeClient);
        case "paypal": 
            return new PayPalAdapter(paypalClient);
    }
}

# application.yml
payment:
  provider: stripe  # Change to switch provider

Benefits:
✓ Configuration-driven
✓ No code changes to switch
✓ Easy canary deployment
```

---

### **Adapter with Multiple Providers**

```
MULTI-PROVIDER ARCHITECTURE
═══════════════════════════

              Application
                   │
                   ↓
         ┌─────────────────┐
         │ PaymentGateway  │ (interface)
         └─────────────────┘
                   △
          ┌────────┼────────┬────────┐
          │        │        │        │
     ┌────┴───┐ ┌──┴───┐ ┌──┴───┐ ┌──┴────┐
     │Stripe  │ │PayPal│ │Square│ │ Fake  │
     │Adapter │ │Adapter│ │Adapter│ │Adapter│
     └────┬───┘ └──┬───┘ └──┬───┘ └───────┘
          │        │        │    (for tests)
          ↓        ↓        ↓
     ┌────────┐ ┌────────┐ ┌────────┐
     │Stripe  │ │PayPal  │ │Square  │
     │ Client │ │ Client │ │ Client │
     └────────┘ └────────┘ └────────┘


Configuration-Based Selection:
══════════════════════════════

# Dev environment
payment.provider=fake

# Staging
payment.provider=stripe

# Production
payment.provider=stripe

# Canary
# 99% servers: stripe
# 1% servers: paypal


Benefits:
═════════
✓ No code changes to switch provider
✓ Easy A/B testing
✓ Gradual migration (canary)
✓ Fast rollback (change config)
✓ Region-specific providers
✓ Cost optimization (route to cheapest)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Engineering Impact:**
- **Decoupling:** Application doesn't depend on third-party APIs
- **Flexibility:** Switch implementations without code changes
- **Maintainability:** Provider-specific logic isolated
- **Testability:** Easy to create test doubles
- **Evolution:** Adapt to API changes without rewriting application

**Business Impact:**
- **Risk Mitigation:** Gradual migration instead of big bang
- **Vendor Negotiation:** Multi-provider strategy enables better pricing
- **Disaster Recovery:** Automatic failover to backup provider
- **Faster Development:** Integrate new providers in days, not weeks
- **Cost Optimization:** Route to cheapest provider saves 20-40%

**Real Numbers:**
```
E-commerce company migrating payment gateway:

Without Adapter:
- Code changes: 250+ files
- Migration: Big bang (high risk)
- Downtime: 4 hours
- Revenue loss: $200K

With Adapter:
- Code changes: 1 adapter class + config
- Migration: Gradual (4 weeks canary)
- Downtime: 0 minutes
- Revenue loss: $0

Savings: $200K + reduced risk
```

---

### **How It Works (Simple Summary)**

**Core Concept:**
Adapter Pattern makes incompatible interfaces work together by creating a wrapper that translates calls from one interface to another.

**Structure:**
1. **Target Interface:** What client expects (e.g., `PaymentGateway`)
2. **Adaptee:** Existing class with incompatible interface (e.g., `StripeClient`)
3. **Adapter:** Wrapper that implements target and delegates to adaptee
4. **Client:** Uses target interface, unaware of adaptation

**Example:**
```java
// Target interface (what you want)
interface PaymentGateway {
    PaymentResult charge(PaymentRequest request);
}

// Adaptee (what you have)
class StripeClient {
    ChargeResponse createCharge(ChargeRequest request);
}

// Adapter (translation layer)
class StripeAdapter implements PaymentGateway {
    private StripeClient stripe;
    
    public PaymentResult charge(PaymentRequest request) {
        // Translate your interface → Stripe interface
        ChargeRequest stripeReq = toStripeRequest(request);
        ChargeResponse stripeRes = stripe.createCharge(stripeReq);
        
        // Translate Stripe interface → your interface
        return toPaymentResult(stripeRes);
    }
}

// Usage (client doesn't know about Stripe)
PaymentGateway gateway = new StripeAdapter(stripeClient);
PaymentResult result = gateway.charge(request);
```

---

### **Key Trade-Offs**

| **Aspect** | **With Adapter** | **Without Adapter** |
|------------|------------------|---------------------|
| **Coupling** | Loose (depends on interface) | Tight (depends on implementation) |
| **Flexibility** | High (swap via config) | Low (hard-coded dependencies) |
| **Code Changes** | Minimal (add adapter) | Extensive (scattered changes) |
| **Testability** | Easy (mock interface) | Hard (mock third-party library) |
| **Complexity** | Higher (extra layer) | Lower (direct usage) |
| **Performance** | Slight overhead (translation) | Direct (no overhead) |
| **Migration Risk** | Low (gradual rollout) | High (big bang) |

---

### **Decision Framework**

```
Should I Use Adapter Pattern?
═════════════════════════════

✅ Use Adapter When:
- Third-party library has incompatible interface
- Legacy system can't be modified
- Supporting multiple implementations (Stripe, PayPal, Square)
- Need to isolate external dependencies
- Expect to swap implementations
- Want configuration-driven provider selection

❌ Skip Adapter When:
- You control both interfaces (just refactor)
- Interfaces are already compatible
- Only one implementation (no need for abstraction)
- Adaptation logic is trivial (direct usage simpler)
- Performance critical (every nanosecond matters)

🤔 Consider Adapter When:
- Migrating from old to new API (gradual transition)
- Multi-cloud strategy (AWS, GCP, Azure)
- A/B testing providers
- Cost optimization (route to cheapest)
- Disaster recovery (automatic failover)
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Clearly Explain the Problem**
- "Adapter makes incompatible interfaces work together"
- "Like a power adapter for electrical plugs"
- "Translates one interface to another"

✅ **Provide Real Examples**
- JDBC: Database drivers adapt to uniform interface
- SLF4J: Logging frameworks adapt to common API
- Spring Data: JPA, MongoDB, Redis adapt to repository interface
- Payment gateways: Stripe, PayPal, Square adapt to unified interface

✅ **Know the Difference**
- **Adapter:** Interface translation (incompatible → compatible)
- **Facade:** Interface simplification (complex → simple)
- **Decorator:** Add behavior (same interface, enhanced)
- **Proxy:** Control access (same interface, interceptor)

✅ **Discuss Trade-offs**
- "Adapter adds extra layer but provides decoupling"
- "Slight performance overhead but negligible compared to network I/O"
- "Worth it for flexibility and maintainability"

✅ **Show Spring Integration**
- "@ConditionalOnProperty to select adapter based on configuration"
- "Easy to swap implementations without code changes"
- "Testable with @MockBean or fake adapters"

✅ **Mention Testing Strategy**
- Unit tests: Mock adaptee, test translation
- Integration tests: Real external system
- Contract tests: Ensure all adapters consistent
- Fake adapter: For testing application logic

**Interview Script:**
> "Adapter Pattern makes incompatible interfaces work together by creating a wrapper that translates calls. It's essential when integrating third-party libraries or legacy systems you can't modify.
>
> For example, payment gateways like Stripe, PayPal, and Square all have different APIs. Instead of scattering provider-specific code everywhere, we create adapters that implement a common `PaymentGateway` interface. Each adapter translates our interface to the provider's interface.
>
> The key benefit is decoupling—our application doesn't depend on specific provider APIs. We can switch providers by changing configuration, not code. This enables gradual migration, A/B testing, and automatic failover.
>
> Real examples include JDBC drivers (adapt PostgreSQL, MySQL, Oracle to uniform interface) and SLF4J (adapts Log4j, Logback, JUL to common logging API).
>
> The trade-off is an extra layer of indirection, but the overhead is negligible (< 1ms) compared to network I/O. The flexibility and maintainability far outweigh the minimal performance cost.
>
> In production, I've used adapters for payment processing—we started with Stripe but added PayPal and Square later. Each was just one adapter class. The application code never changed."

---

**End of Topic 183: Adapter Pattern**
