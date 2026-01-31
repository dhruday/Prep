# 171. Open-Closed Principle (OCP)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Open-Closed Principle (OCP)**: Software entities (classes, modules, functions) should be open for extension but closed for modification.

### Core Concept

**What it means:**
- **Open for extension**: You can add new functionality
- **Closed for modification**: Without changing existing code
- Add features by creating new classes, not editing old ones
- Achieved through abstraction (interfaces, abstract classes, polymorphism)

**Simple analogy:**
- USB ports are open for extension (plug in any USB device)
- USB ports are closed for modification (don't rewire your laptop)
- New USB devices (keyboards, mice, drives) work without changing the port

**In code:**
```java
// BAD: Adding new payment method requires modifying this method ❌
public void processPayment(String type) {
    if (type.equals("CREDIT_CARD")) { /* code */ }
    else if (type.equals("PAYPAL")) { /* code */ }
    // Need to modify this file to add Apple Pay!
}

// GOOD: Adding new payment method is creating a new class ✓
public interface PaymentProcessor {
    void process(Payment payment);
}
// Add Apple Pay = new class implementing PaymentProcessor
// No modification to existing code!
```

### Why OCP Matters

**Code Quality Benefits:**
- **Stability**: Existing code doesn't change (fewer regression bugs)
- **Flexibility**: Easy to add features without risk
- **Testability**: New features tested independently
- **Maintainability**: Old code stays frozen and reliable
- **Team Scalability**: Multiple developers add features in parallel

**Business Impact:**
- Faster feature delivery (no impact analysis on existing code)
- Lower bug rates (existing code untouched)
- Reduced testing costs (only test new extensions)
- Enables plugin architectures (WordPress, Eclipse, VS Code)

**Common OCP Violations:**
- Long if-else or switch statements on types
- Adding features by modifying core classes
- Type checking with instanceof
- Hard-coded behavior that varies by type

**Role in interviews:**
- FAANG loves asking: "How would you add this feature without modifying existing code?"
- Refactoring questions: "This if-else chain violates OCP—fix it"
- Design patterns are implementations of OCP (Strategy, Factory, Template Method)

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔴 Classic OCP Violation: The If-Else Chain

#### Example 1: Payment Processing

```java
// BAD: Violates OCP ❌
@Service
public class PaymentProcessor {
    
    public PaymentResult processPayment(Order order, String paymentMethod) {
        
        if (paymentMethod.equals("CREDIT_CARD")) {
            // Credit card logic
            String token = order.getCreditCardToken();
            StripeClient stripe = new StripeClient();
            ChargeRequest request = new ChargeRequest(token, order.getAmount());
            Charge charge = stripe.charge(request);
            return PaymentResult.success(charge.getId());
            
        } else if (paymentMethod.equals("PAYPAL")) {
            // PayPal logic
            PayPalClient paypal = new PayPalClient();
            PayPalPayment payment = new PayPalPayment(order.getAmount());
            PayPalResponse response = paypal.execute(payment);
            return PaymentResult.success(response.getTransactionId());
            
        } else if (paymentMethod.equals("BANK_TRANSFER")) {
            // Bank transfer logic
            BankClient bank = new BankClient();
            TransferRequest transfer = new TransferRequest(
                order.getAmount(), 
                order.getBankAccount()
            );
            TransferResponse response = bank.transfer(transfer);
            return PaymentResult.success(response.getReferenceNumber());
            
        } else if (paymentMethod.equals("CRYPTO")) {
            // Cryptocurrency logic
            BlockchainClient blockchain = new BlockchainClient();
            Transaction tx = new Transaction(order.getAmount(), order.getCryptoAddress());
            String txHash = blockchain.broadcast(tx);
            return PaymentResult.success(txHash);
            
        } else if (paymentMethod.equals("APPLE_PAY")) {
            // Apple Pay logic (REQUIRES MODIFYING THIS FILE!)
            ApplePayClient applePay = new ApplePayClient();
            // 30+ lines of Apple Pay code...
            
        } else if (paymentMethod.equals("GOOGLE_PAY")) {
            // Google Pay logic (REQUIRES MODIFYING THIS FILE!)
            GooglePayClient googlePay = new GooglePayClient();
            // 30+ lines of Google Pay code...
            
        } else {
            throw new UnsupportedPaymentMethodException(paymentMethod);
        }
    }
}

// Problems with this design:
// 1. Every new payment method requires modifying this method
// 2. This method grows infinitely (already 200+ lines)
// 3. Regression risk: Adding Google Pay might break Stripe
// 4. Testing: Must test ALL payment methods when ANY changes
// 5. Merge conflicts: 3 teams adding payment methods = chaos
// 6. Cannot test new payment methods without deploying code
// 7. Violates OCP: Not closed for modification
```

#### OCP-Compliant Solution: Strategy Pattern

```java
// GOOD: Open for extension, closed for modification ✓

// ═══════════════════════════════════════════════════════════
// Step 1: Define abstraction (interface)
// ═══════════════════════════════════════════════════════════
public interface PaymentProcessor {
    PaymentResult process(Order order);
    boolean supports(PaymentMethod method);
    String getProcessorName();
}

// ═══════════════════════════════════════════════════════════
// Step 2: Implement concrete strategies (EXTENSIONS)
// ═══════════════════════════════════════════════════════════

@Component
public class StripePaymentProcessor implements PaymentProcessor {
    
    @Autowired
    private StripeClient stripeClient;
    
    @Override
    public PaymentResult process(Order order) {
        try {
            ChargeRequest request = new ChargeRequest(
                order.getCreditCardToken(),
                order.getAmount()
            );
            Charge charge = stripeClient.charge(request);
            return PaymentResult.success(charge.getId());
            
        } catch (StripeException e) {
            return PaymentResult.failure(e.getMessage());
        }
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.CREDIT_CARD;
    }
    
    @Override
    public String getProcessorName() {
        return "Stripe";
    }
}

@Component
public class PayPalPaymentProcessor implements PaymentProcessor {
    
    @Autowired
    private PayPalClient paypalClient;
    
    @Override
    public PaymentResult process(Order order) {
        try {
            PayPalPayment payment = new PayPalPayment(order.getAmount());
            PayPalResponse response = paypalClient.execute(payment);
            return PaymentResult.success(response.getTransactionId());
            
        } catch (PayPalException e) {
            return PaymentResult.failure(e.getMessage());
        }
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.PAYPAL;
    }
    
    @Override
    public String getProcessorName() {
        return "PayPal";
    }
}

@Component
public class CryptoPaymentProcessor implements PaymentProcessor {
    
    @Autowired
    private BlockchainClient blockchainClient;
    
    @Override
    public PaymentResult process(Order order) {
        try {
            Transaction tx = new Transaction(
                order.getAmount(),
                order.getCryptoAddress()
            );
            String txHash = blockchainClient.broadcast(tx);
            return PaymentResult.success(txHash);
            
        } catch (BlockchainException e) {
            return PaymentResult.failure(e.getMessage());
        }
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.CRYPTO;
    }
    
    @Override
    public String getProcessorName() {
        return "Blockchain";
    }
}

// ═══════════════════════════════════════════════════════════
// NEW EXTENSION: Apple Pay (NO MODIFICATION TO EXISTING CODE!)
// ═══════════════════════════════════════════════════════════
@Component
public class ApplePayPaymentProcessor implements PaymentProcessor {
    
    @Autowired
    private ApplePayClient applePayClient;
    
    @Override
    public PaymentResult process(Order order) {
        try {
            ApplePayRequest request = new ApplePayRequest(
                order.getAmount(),
                order.getApplePayToken()
            );
            ApplePayResponse response = applePayClient.charge(request);
            return PaymentResult.success(response.getTransactionId());
            
        } catch (ApplePayException e) {
            return PaymentResult.failure(e.getMessage());
        }
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.APPLE_PAY;
    }
    
    @Override
    public String getProcessorName() {
        return "Apple Pay";
    }
}

// ═══════════════════════════════════════════════════════════
// Step 3: Context class (CLOSED FOR MODIFICATION)
// ═══════════════════════════════════════════════════════════
@Service
public class PaymentService {
    
    private final List<PaymentProcessor> processors;
    
    @Autowired
    public PaymentService(List<PaymentProcessor> processors) {
        // Spring automatically injects ALL implementations of PaymentProcessor
        this.processors = processors;
        
        logger.info("Loaded {} payment processors: {}", 
            processors.size(),
            processors.stream()
                .map(PaymentProcessor::getProcessorName)
                .collect(Collectors.joining(", "))
        );
    }
    
    public PaymentResult processPayment(Order order, PaymentMethod method) {
        // Find appropriate processor
        PaymentProcessor processor = processors.stream()
            .filter(p -> p.supports(method))
            .findFirst()
            .orElseThrow(() -> new UnsupportedPaymentMethodException(method));
        
        // Delegate to strategy
        return processor.process(order);
    }
    
    public List<PaymentMethod> getSupportedMethods() {
        return Arrays.stream(PaymentMethod.values())
            .filter(method -> processors.stream().anyMatch(p -> p.supports(method)))
            .collect(Collectors.toList());
    }
}

// Benefits of OCP-compliant design:
// ✓ Add Apple Pay by creating ApplePayPaymentProcessor class
// ✓ PaymentService NEVER changes (closed for modification)
// ✓ Each processor tested independently
// ✓ No regression risk (existing processors untouched)
// ✓ Spring auto-discovers new processors
// ✓ Can enable/disable processors via @Profile or @ConditionalOnProperty
// ✓ Parallel development: 3 teams add 3 payment methods simultaneously
// ✓ New processor = new JAR file (plugin architecture)
```

---

### 🟢 OCP with Abstract Classes

Sometimes you need shared behavior across extensions. Use abstract classes with template methods.

```java
// Abstract base class with common behavior
public abstract class PaymentProcessor {
    
    @Autowired
    protected PaymentRepository paymentRepository;
    
    @Autowired
    protected PaymentMetricsService metricsService;
    
    // Template method (closed for modification)
    public final PaymentResult processPayment(Order order) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Common behavior: Log start
            logger.info("Processing payment for order {} using {}", 
                order.getId(), getProcessorName());
            
            // Common behavior: Validate
            validateOrder(order);
            
            // Extension point: Delegate to subclass
            PaymentResult result = doProcess(order);
            
            // Common behavior: Save payment record
            Payment payment = Payment.builder()
                .orderId(order.getId())
                .amount(order.getAmount())
                .processor(getProcessorName())
                .transactionId(result.getTransactionId())
                .status(result.isSuccess() ? "SUCCESS" : "FAILED")
                .build();
            paymentRepository.save(payment);
            
            // Common behavior: Record metrics
            long duration = System.currentTimeMillis() - startTime;
            metricsService.recordPayment(getProcessorName(), result.isSuccess(), duration);
            
            return result;
            
        } catch (Exception e) {
            logger.error("Payment processing failed", e);
            metricsService.recordPayment(getProcessorName(), false, 
                System.currentTimeMillis() - startTime);
            return PaymentResult.failure(e.getMessage());
        }
    }
    
    // Common validation logic
    protected void validateOrder(Order order) {
        if (order.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Order amount must be positive");
        }
        if (order.getAmount().compareTo(new BigDecimal("100000")) > 0) {
            throw new ValidationException("Order amount exceeds maximum");
        }
    }
    
    // Extension point: Subclasses implement payment-specific logic
    protected abstract PaymentResult doProcess(Order order);
    
    // Extension point: Subclasses provide processor name
    protected abstract String getProcessorName();
    
    // Extension point: Subclasses can override validation
    protected boolean requiresThreeDSecure(Order order) {
        return order.getAmount().compareTo(new BigDecimal("500")) > 0;
    }
}

// Extension 1: Stripe
@Component
public class StripePaymentProcessor extends PaymentProcessor {
    
    @Autowired
    private StripeClient stripeClient;
    
    @Override
    protected PaymentResult doProcess(Order order) {
        // Stripe-specific logic only
        ChargeRequest request = new ChargeRequest(
            order.getCreditCardToken(),
            order.getAmount()
        );
        
        // Use inherited validation
        if (requiresThreeDSecure(order)) {
            request.setThreeDSecure(true);
        }
        
        Charge charge = stripeClient.charge(request);
        return PaymentResult.success(charge.getId());
    }
    
    @Override
    protected String getProcessorName() {
        return "Stripe";
    }
}

// Extension 2: PayPal
@Component
public class PayPalPaymentProcessor extends PaymentProcessor {
    
    @Autowired
    private PayPalClient paypalClient;
    
    @Override
    protected PaymentResult doProcess(Order order) {
        // PayPal-specific logic only
        PayPalPayment payment = new PayPalPayment(order.getAmount());
        PayPalResponse response = paypalClient.execute(payment);
        return PaymentResult.success(response.getTransactionId());
    }
    
    @Override
    protected String getProcessorName() {
        return "PayPal";
    }
    
    // Override validation if needed
    @Override
    protected boolean requiresThreeDSecure(Order order) {
        return false; // PayPal handles security differently
    }
}

// Benefits:
// ✓ Common logic (logging, validation, metrics) in base class
// ✓ Payment-specific logic in subclasses
// ✓ Base class closed for modification
// ✓ Extensions override only what they need
```

---

### 🔵 OCP with Configuration

Sometimes extensions are configuration-driven, not code-driven.

```java
// GOOD: Configuration-based extension ✓

// Define behavior as data
public class DiscountRule {
    private String name;
    private String condition;  // SpEL expression
    private BigDecimal discount;
    private String type; // PERCENTAGE, FIXED
    
    public boolean applies(Order order) {
        ExpressionParser parser = new SpelExpressionParser();
        Expression expression = parser.parseExpression(condition);
        
        StandardEvaluationContext context = new StandardEvaluationContext(order);
        return expression.getValue(context, Boolean.class);
    }
    
    public BigDecimal calculate(Order order) {
        if (type.equals("PERCENTAGE")) {
            return order.getTotal().multiply(discount);
        } else {
            return discount;
        }
    }
}

// Load rules from database or config file
@Service
public class DiscountService {
    
    @Autowired
    private DiscountRuleRepository ruleRepository;
    
    public BigDecimal calculateDiscount(Order order) {
        List<DiscountRule> rules = ruleRepository.findActiveRules();
        
        return rules.stream()
            .filter(rule -> rule.applies(order))
            .map(rule -> rule.calculate(order))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}

// Rules stored in database (no code changes needed!)
/*
INSERT INTO discount_rules (name, condition, discount, type) VALUES
('First-time customer', 'customer.isFirstOrder()', 0.10, 'PERCENTAGE'),
('Bulk order', 'total > 100', 5.00, 'FIXED'),
('VIP customer', 'customer.tier == "VIP"', 0.15, 'PERCENTAGE'),
('Holiday special', 'order.date >= "2024-12-20" and order.date <= "2024-12-31"', 0.20, 'PERCENTAGE');
*/

// Add new discount = INSERT new row (OCP compliant!)
// No code modification required
```

---

### 🟡 OCP in Spring Boot

Spring Framework is built on OCP principles.

#### Example 1: Spring Security Filter Chain

```java
// Spring Security is OPEN for extension

// Extension 1: JWT Authentication Filter
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        
        String token = extractToken(request);
        
        if (token != null && jwtService.validateToken(token)) {
            Authentication auth = jwtService.getAuthentication(token);
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        filterChain.doFilter(request, response);
    }
}

// Extension 2: Rate Limiting Filter
@Component
public class RateLimitingFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        
        String clientIp = request.getRemoteAddr();
        
        if (!rateLimiter.allowRequest(clientIp)) {
            response.setStatus(429); // Too Many Requests
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}

// Spring Security configuration (CLOSED for modification)
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitingFilter, JwtAuthenticationFilter.class);
        
        return http.build();
    }
}

// Add new filter = create new class extending OncePerRequestFilter
// No modification to Spring Security core!
```

#### Example 2: Spring Data Repository

```java
// Spring Data is OPEN for extension

// Extension 1: Add custom query methods by declaration
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Spring generates implementation automatically
    Optional<User> findByEmail(String email);
    List<User> findByAgeGreaterThan(int age);
    List<User> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);
    
    // Custom query
    @Query("SELECT u FROM User u WHERE u.status = 'ACTIVE' AND u.tier = :tier")
    List<User> findActiveUsersByTier(@Param("tier") String tier);
}

// Extension 2: Add custom implementation
@Repository
public class UserRepositoryImpl implements UserRepositoryCustom {
    
    @Autowired
    private EntityManager entityManager;
    
    @Override
    public List<User> findUsersWithComplexCriteria(SearchCriteria criteria) {
        // Custom JPQL or native SQL
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<User> query = cb.createQuery(User.class);
        // Complex query building...
        return entityManager.createQuery(query).getResultList();
    }
}

// No modification to JpaRepository interface!
```

---

### 🟣 OCP Anti-Pattern: Type Checking

```java
// BAD: Type checking violates OCP ❌
public class NotificationService {
    
    public void send(Notification notification) {
        
        if (notification instanceof EmailNotification) {
            EmailNotification email = (EmailNotification) notification;
            sendEmail(email.getTo(), email.getSubject(), email.getBody());
            
        } else if (notification instanceof SmsNotification) {
            SmsNotification sms = (SmsNotification) notification;
            sendSms(sms.getPhone(), sms.getMessage());
            
        } else if (notification instanceof PushNotification) {
            PushNotification push = (PushNotification) notification;
            sendPush(push.getDeviceToken(), push.getMessage());
            
        } else if (notification instanceof SlackNotification) {
            // Need to modify this method to add Slack!
        }
    }
}

// GOOD: Polymorphism (OCP compliant) ✓
public interface Notification {
    void send();
}

public class EmailNotification implements Notification {
    @Override
    public void send() {
        emailService.send(to, subject, body);
    }
}

public class SmsNotification implements Notification {
    @Override
    public void send() {
        smsService.send(phone, message);
    }
}

public class PushNotification implements Notification {
    @Override
    public void send() {
        pushService.send(deviceToken, message);
    }
}

// NEW: Slack (no modification to existing code!)
public class SlackNotification implements Notification {
    @Override
    public void send() {
        slackClient.sendMessage(channelId, message);
    }
}

// Service is trivial now
public class NotificationService {
    public void send(Notification notification) {
        notification.send(); // Polymorphism!
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Performance
## ────────────────────────────────────

### Performance Impact of OCP

**Polymorphism overhead:**
```
Direct method call:
- invokevirtual bytecode instruction
- Single vtable lookup: ~1-2 CPU cycles
- JIT compiler inlines frequently-called methods
- Negligible overhead: < 1 nanosecond

If-else chain with 10 branches:
- Average 5 comparisons to find right branch
- Each comparison: ~1-2 CPU cycles
- No inlining opportunity
- Overhead: ~5-10 nanoseconds

Verdict: Polymorphism is FASTER than if-else chains!
```

**Memory footprint:**
```
If-else approach:
- 1 large class with all logic
- Loaded into memory: ~200KB bytecode
- All dependencies loaded even if unused

OCP approach:
- 10 small strategy classes
- Loaded on-demand: 10 × ~20KB = 200KB total
- Only used strategies loaded
- With lazy loading: ~40KB (only 2 strategies active)
- Memory savings: 160KB per service instance
```

### Scalability at 1M requests/second

**Scenario**: Payment processing system handling 1M payments/day

```java
// Non-OCP approach: Monolithic if-else
public class PaymentProcessor {
    public PaymentResult process(Order order, String method) {
        if (method.equals("STRIPE")) { /* 50 lines */ }
        else if (method.equals("PAYPAL")) { /* 50 lines */ }
        else if (method.equals("CRYPTO")) { /* 50 lines */ }
        // 10 payment methods = 500 lines
    }
}

// Problems at scale:
// - All 500 lines loaded for every request
// - CPU i-cache misses (code doesn't fit in L1 cache)
// - Cannot scale payment methods independently
// - Cannot route traffic to specialized instances

// OCP approach: Strategy pattern
@Component
@Profile("stripe")
public class StripeProcessor implements PaymentProcessor {
    // 50 lines
}

@Component
@Profile("paypal")
public class PayPalProcessor implements PaymentProcessor {
    // 50 lines
}

// Deployment strategy:
// - Stripe-only instances (profile=stripe): 100 pods
// - PayPal-only instances (profile=paypal): 50 pods
// - Crypto-only instances (profile=crypto): 20 pods

// Benefits:
// ✓ Each instance loads only needed code (50 lines vs 500)
// ✓ Better CPU cache utilization
// ✓ Independent scaling per payment method
// ✓ Isolate failures (Stripe down ≠ PayPal down)

// Performance gain: ~30% throughput increase
// Stripe requests: 12,000 QPS → 15,600 QPS per pod
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Strategy Pattern with Database

```java
// Store strategy selection in database
@Entity
@Table(name = "payment_methods")
public class PaymentMethodConfig {
    
    @Id
    private Long id;
    
    @Column(name = "method_name")
    private String methodName; // "STRIPE", "PAYPAL", etc.
    
    @Column(name = "processor_class")
    private String processorClass; // "com.example.StripeProcessor"
    
    @Column(name = "enabled")
    private boolean enabled;
    
    @Column(name = "priority")
    private int priority; // For fallback ordering
    
    @Column(name = "config_json")
    private String configJson; // Processor-specific config
}

// Dynamic processor loading
@Service
public class PaymentService {
    
    @Autowired
    private PaymentMethodConfigRepository configRepository;
    
    @Autowired
    private ApplicationContext context;
    
    @Cacheable("payment-processors")
    public Map<String, PaymentProcessor> getActiveProcessors() {
        return configRepository.findByEnabledTrue().stream()
            .collect(Collectors.toMap(
                PaymentMethodConfig::getMethodName,
                config -> loadProcessor(config)
            ));
    }
    
    private PaymentProcessor loadProcessor(PaymentMethodConfig config) {
        try {
            Class<?> clazz = Class.forName(config.getProcessorClass());
            return (PaymentProcessor) context.getBean(clazz);
        } catch (Exception e) {
            throw new ProcessorLoadException("Failed to load: " + config.getMethodName(), e);
        }
    }
    
    public PaymentResult process(Order order, String method) {
        PaymentProcessor processor = getActiveProcessors().get(method);
        if (processor == null) {
            throw new UnsupportedPaymentMethodException(method);
        }
        return processor.process(order);
    }
}

// Enable/disable payment methods via SQL (no deployment!)
/*
-- Enable Apple Pay
UPDATE payment_methods SET enabled = true WHERE method_name = 'APPLE_PAY';

-- Disable PayPal temporarily
UPDATE payment_methods SET enabled = false WHERE method_name = 'PAYPAL';

-- Change processor priority (for fallback)
UPDATE payment_methods SET priority = 1 WHERE method_name = 'STRIPE';
UPDATE payment_methods SET priority = 2 WHERE method_name = 'PAYPAL';
*/
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Performance & Reliability
## ────────────────────────────────────

### Circuit Breaker per Strategy

```java
// Each payment processor has independent circuit breaker

@Component
public class StripePaymentProcessor implements PaymentProcessor {
    
    @Autowired
    private StripeClient stripeClient;
    
    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;
    
    @Override
    public PaymentResult process(Order order) {
        CircuitBreaker circuitBreaker = circuitBreakerRegistry
            .circuitBreaker("stripe-payment");
        
        return circuitBreaker.executeSupplier(() -> {
            Charge charge = stripeClient.charge(order);
            return PaymentResult.success(charge.getId());
        });
    }
}

@Component
public class PayPalPaymentProcessor implements PaymentProcessor {
    
    @Autowired
    private PayPalClient paypalClient;
    
    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;
    
    @Override
    public PaymentResult process(Order order) {
        CircuitBreaker circuitBreaker = circuitBreakerRegistry
            .circuitBreaker("paypal-payment");
        
        return circuitBreaker.executeSupplier(() -> {
            PayPalResponse response = paypalClient.execute(order);
            return PaymentResult.success(response.getTransactionId());
        });
    }
}

// Benefits:
// ✓ Stripe circuit breaker opens → fallback to PayPal
// ✓ PayPal circuit breaker opens → fallback to Crypto
// ✓ Independent failure isolation
// ✓ Automatic recovery per processor

// Configuration (application.yml)
/*
resilience4j.circuitbreaker:
  instances:
    stripe-payment:
      failure-rate-threshold: 50
      wait-duration-in-open-state: 60s
      sliding-window-size: 100
    paypal-payment:
      failure-rate-threshold: 50
      wait-duration-in-open-state: 60s
      sliding-window-size: 100
*/
```

### Fallback Chain

```java
// OCP enables elegant fallback chains

@Service
public class PaymentService {
    
    private final List<PaymentProcessor> processors;
    
    @Autowired
    public PaymentService(List<PaymentProcessor> processors) {
        // Sort by priority
        this.processors = processors.stream()
            .sorted(Comparator.comparing(PaymentProcessor::getPriority))
            .collect(Collectors.toList());
    }
    
    public PaymentResult processWithFallback(Order order, PaymentMethod primaryMethod) {
        // Try primary method
        PaymentProcessor primary = findProcessor(primaryMethod);
        
        try {
            return primary.process(order);
        } catch (PaymentException e) {
            logger.warn("Primary payment failed: {}, trying fallback", e.getMessage());
            
            // Fallback to next available processor
            return processors.stream()
                .filter(p -> !p.equals(primary))
                .filter(PaymentProcessor::isAvailable)
                .findFirst()
                .map(processor -> processor.process(order))
                .orElseThrow(() -> new AllProcessorsFailedException());
        }
    }
}

// Fallback chain: Stripe → PayPal → Crypto → Bank Transfer
// OCP: Add new processor to chain by implementing interface
```

---

## ────────────────────────────────────
## 6️⃣ Security & API Design
## ────────────────────────────────────

### OCP in Authentication Strategies

```java
// GOOD: Authentication strategies ✓

public interface AuthenticationStrategy {
    Authentication authenticate(Credentials credentials);
    boolean supports(AuthenticationType type);
}

@Component
public class JwtAuthenticationStrategy implements AuthenticationStrategy {
    
    @Override
    public Authentication authenticate(Credentials credentials) {
        String token = credentials.getToken();
        if (jwtService.validateToken(token)) {
            return jwtService.getAuthentication(token);
        }
        throw new AuthenticationException("Invalid JWT token");
    }
    
    @Override
    public boolean supports(AuthenticationType type) {
        return type == AuthenticationType.JWT;
    }
}

@Component
public class OAuth2AuthenticationStrategy implements AuthenticationStrategy {
    
    @Override
    public Authentication authenticate(Credentials credentials) {
        String accessToken = credentials.getAccessToken();
        UserInfo userInfo = oauth2Client.getUserInfo(accessToken);
        return new OAuth2Authentication(userInfo);
    }
    
    @Override
    public boolean supports(AuthenticationType type) {
        return type == AuthenticationType.OAUTH2;
    }
}

@Component
public class ApiKeyAuthenticationStrategy implements AuthenticationStrategy {
    
    @Override
    public Authentication authenticate(Credentials credentials) {
        String apiKey = credentials.getApiKey();
        Optional<Application> app = applicationRepository.findByApiKey(apiKey);
        return app.map(ApplicationAuthentication::new)
            .orElseThrow(() -> new AuthenticationException("Invalid API key"));
    }
    
    @Override
    public boolean supports(AuthenticationType type) {
        return type == AuthenticationType.API_KEY;
    }
}

// NEW: SAML authentication (no modification!)
@Component
public class SamlAuthenticationStrategy implements AuthenticationStrategy {
    
    @Override
    public Authentication authenticate(Credentials credentials) {
        String samlResponse = credentials.getSamlResponse();
        SAMLAssertion assertion = samlParser.parse(samlResponse);
        return new SamlAuthentication(assertion);
    }
    
    @Override
    public boolean supports(AuthenticationType type) {
        return type == AuthenticationType.SAML;
    }
}

// Authentication manager (closed for modification)
@Service
public class AuthenticationManager {
    
    private final List<AuthenticationStrategy> strategies;
    
    @Autowired
    public AuthenticationManager(List<AuthenticationStrategy> strategies) {
        this.strategies = strategies;
    }
    
    public Authentication authenticate(Credentials credentials, AuthenticationType type) {
        return strategies.stream()
            .filter(strategy -> strategy.supports(type))
            .findFirst()
            .map(strategy -> strategy.authenticate(credentials))
            .orElseThrow(() -> new UnsupportedAuthenticationException(type));
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Production Examples
## ────────────────────────────────────

### Example 1: AWS SDK - Service Clients

AWS SDK follows OCP perfectly:

```java
// AWS SDK is open for extension

// Base interface (closed)
public interface AmazonWebServiceClient {
    ResponseMetadata getCachedResponseMetadata(AmazonWebServiceRequest request);
}

// Extensions (200+ services)
public class AmazonS3Client implements AmazonWebServiceClient {
    public PutObjectResult putObject(String bucket, String key, File file) { }
    public S3Object getObject(String bucket, String key) { }
}

public class AmazonDynamoDBClient implements AmazonWebServiceClient {
    public PutItemResult putItem(PutItemRequest request) { }
    public GetItemResult getItem(GetItemRequest request) { }
}

public class AmazonSQSClient implements AmazonWebServiceClient {
    public SendMessageResult sendMessage(String queueUrl, String messageBody) { }
    public ReceiveMessageResult receiveMessage(String queueUrl) { }
}

// Adding new AWS service = new client class (no core modification!)
```

### Example 2: Hibernate - Dialect System

Hibernate supports 30+ databases without modifying core:

```java
// Hibernate dialect system

// Base class (closed for modification)
public abstract class Dialect {
    public abstract String getAddColumnString();
    public abstract String getDropTableString();
    public abstract String getSequenceNextValString(String sequenceName);
    // 100+ methods for SQL generation
}

// Extension: MySQL
public class MySQL8Dialect extends Dialect {
    @Override
    public String getAddColumnString() {
        return "add column";
    }
    
    @Override
    public String getSequenceNextValString(String sequenceName) {
        return "select nextval('" + sequenceName + "')";
    }
}

// Extension: PostgreSQL
public class PostgreSQL95Dialect extends Dialect {
    @Override
    public String getAddColumnString() {
        return "add column";
    }
    
    @Override
    public String getSequenceNextValString(String sequenceName) {
        return "nextval('" + sequenceName + "')";
    }
}

// Extension: Oracle
public class Oracle12cDialect extends Dialect {
    @Override
    public String getAddColumnString() {
        return "add";
    }
    
    @Override
    public String getSequenceNextValString(String sequenceName) {
        return sequenceName + ".nextval";
    }
}

// Configuration (application.properties)
/*
# Switch databases without code changes!
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect
# OR
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQL95Dialect
*/

// OCP in action: 30+ database dialects, zero Hibernate core changes
```

### Example 3: Stripe Webhooks - Event Handlers

```java
// Stripe webhook event handling (OCP pattern)

public interface WebhookEventHandler {
    void handle(Event event);
    boolean supports(String eventType);
}

@Component
public class PaymentSucceededHandler implements WebhookEventHandler {
    
    @Override
    public void handle(Event event) {
        Charge charge = (Charge) event.getDataObjectDeserializer()
            .getObject()
            .orElseThrow();
        
        // Update order status
        orderService.markAsPaid(charge.getMetadata().get("order_id"));
    }
    
    @Override
    public boolean supports(String eventType) {
        return eventType.equals("charge.succeeded");
    }
}

@Component
public class PaymentFailedHandler implements WebhookEventHandler {
    
    @Override
    public void handle(Event event) {
        Charge charge = (Charge) event.getDataObjectDeserializer()
            .getObject()
            .orElseThrow();
        
        // Send email to customer
        emailService.sendPaymentFailedEmail(charge.getMetadata().get("customer_email"));
    }
    
    @Override
    public boolean supports(String eventType) {
        return eventType.equals("charge.failed");
    }
}

@Component
public class RefundCreatedHandler implements WebhookEventHandler {
    
    @Override
    public void handle(Event event) {
        Refund refund = (Refund) event.getDataObjectDeserializer()
            .getObject()
            .orElseThrow();
        
        // Process refund
        refundService.processRefund(refund.getId());
    }
    
    @Override
    public boolean supports(String eventType) {
        return eventType.equals("charge.refunded");
    }
}

// Webhook controller (closed for modification)
@RestController
@RequestMapping("/webhooks/stripe")
public class StripeWebhookController {
    
    private final List<WebhookEventHandler> handlers;
    
    @Autowired
    public StripeWebhookController(List<WebhookEventHandler> handlers) {
        this.handlers = handlers;
    }
    
    @PostMapping
    public ResponseEntity<Void> handleWebhook(
        @RequestBody String payload,
        @RequestHeader("Stripe-Signature") String signature
    ) {
        Event event = Webhook.constructEvent(payload, signature, webhookSecret);
        
        handlers.stream()
            .filter(handler -> handler.supports(event.getType()))
            .forEach(handler -> handler.handle(event));
        
        return ResponseEntity.ok().build();
    }
}

// Add new event handler = new class implementing WebhookEventHandler
// No modification to controller!
```

---

## ────────────────────────────────────
## 8️⃣ Interview Q&A (Behavioral Questions)
## ────────────────────────────────────

### Q1: "What is Open-Closed Principle?"

**Answer:** *"Open-Closed Principle states that software entities should be open for extension but closed for modification. This means you should be able to add new functionality without changing existing code.*

*For example, if I have a payment processing system with credit cards and PayPal, and business wants to add Apple Pay, I shouldn't modify the existing PaymentProcessor class. Instead, I create a PaymentProcessor interface with process() method, implement StripeProcessor and PayPalProcessor, then add ApplePayProcessor as a new class implementing the same interface.*

*The service that uses processors depends on the interface and Spring auto-injects all implementations. Now adding Apple Pay is just creating one new class—zero modifications to existing code. Existing credit card and PayPal logic is untouched, so zero regression risk. That's OCP—extend through new classes, not editing old classes."*

### Q2: "Give a real example where you applied OCP"

**Answer:** *"At my company, we had a 300-line if-else chain in NotificationService checking notification types—email, SMS, push. Adding Slack notifications required editing this method, and we accidentally broke SMS notifications in production.*

*I refactored using Strategy pattern. Created NotificationChannel interface with send() method. Extracted EmailChannel, SmsChannel, PushChannel as implementations. NotificationService became 10 lines—find channel by type, call send().*

*When we added Slack, it was one new class implementing NotificationChannel. Zero modifications to existing email, SMS, or push code. Spring auto-discovered the new implementation. We deployed Slack notifications without re-testing email and SMS.*

*Results: Added Slack in 2 hours vs previous estimate of 2 days. No regression bugs. When we later added WhatsApp and Discord, each took 1-2 hours. OCP turned feature additions from risky multi-day efforts into safe same-day deployments."*

### Q3: "How do you identify OCP violations during code review?"

**Answer:** *"I look for three patterns:*

*First, long if-else or switch statements on types. If I see 'if type equals A, else if type equals B', that's an OCP violation. Adding type C requires modifying this method.*

*Second, instanceof checks. Code like 'if notification instanceof EmailNotification' violates OCP. Should use polymorphism instead.*

*Third, comments saying 'TODO: Add new type here'. That's a smoking gun—code expects modifications.*

*When I spot violations, I suggest Strategy pattern for behaviors, or Template Method for algorithms with shared structure. For simple cases, I recommend polymorphism—let subclasses override methods instead of parent class switching on types."*

### Q4: "Doesn't OCP create too many classes?"

**Answer:** *"It creates more classes, but each is simpler and safer. Let me compare:*

*Non-OCP approach: 1 class with 500 lines handling 10 payment methods. Every new method adds 50 lines. Testing requires all 10 payment methods mocked. Any change risks breaking all 10 methods.*

*OCP approach: 1 interface + 10 classes × 50 lines each. Each class tested independently with 2-3 mocks. New method is new class, no risk to existing methods.*

*At my company, our PaymentProcessor was 800 lines. After refactoring to OCP, we had 8 strategy classes averaging 80 lines. Yes, more files, but developers preferred it—you open one focused file instead of scrolling through 800 lines.*

*More classes isn't bad if each class is focused, tested, and independent. Bad is one 800-line class that everyone's afraid to touch."*

### Q5: "When should you NOT follow OCP?"

**Answer:** *"I skip OCP in four situations:*

*First, when there are only 2-3 variants and unlikely to grow. If I have USD and EUR currency formatting, a simple if-else is fine. OCP overhead isn't worth it.*

*Second, performance-critical hot paths. In high-frequency trading systems, virtual method dispatch overhead matters. Direct calls can be faster.*

*Third, prototypes and POCs. When exploring ideas, premature abstraction slows you down. Build concretely first, refactor to OCP later.*

*Fourth, when abstraction is unclear. If I can't identify stable abstraction, forcing OCP creates wrong interfaces that need frequent changes—that defeats 'closed for modification'.*

*But for production systems with 5+ variants or expected growth, OCP is essential. Payment methods, notification channels, authentication strategies—these benefit from OCP because they grow over time."*

### Q6: "How does OCP relate to other SOLID principles?"

**Answer:** *"OCP builds on and enables other principles:*

*OCP depends on DIP (Dependency Inversion). My PaymentService depends on PaymentProcessor interface, not concrete implementations. That abstraction is what makes extension possible—I can add new implementations without changing PaymentService.*

*OCP relates to LSP (Liskov Substitution). For extensions to work, all PaymentProcessor implementations must be substitutable. If ApplePayProcessor throws UnsupportedOperationException, that breaks OCP—I'd need type checking in PaymentService.*

*OCP enables SRP (Single Responsibility). Instead of one class with if-else for all payment methods, each processor has single responsibility. StripeProcessor only knows Stripe.*

*Example: My authentication system uses all three—AuthenticationService depends on AuthenticationStrategy interface (DIP), each strategy has one authentication method (SRP), and all strategies are substitutable (LSP). That combination enables OCP—adding SAML auth is one new class, no existing code changes."*

---

## ────────────────────────────────────
## 9️⃣ Diagrams & Patterns
## ────────────────────────────────────

### OCP Violation Architecture

```
┌───────────────────────────────────────────────────────────┐
│              PaymentProcessor                             │
│            (MONOLITHIC CLASS)                             │
│                                                           │
│  public PaymentResult process(Order order, String type) { │
│                                                           │
│    if (type.equals("CREDIT_CARD")) {                     │
│        // 50 lines of Stripe code                        │
│    }                                                      │
│    else if (type.equals("PAYPAL")) {                     │
│        // 50 lines of PayPal code                        │
│    }                                                      │
│    else if (type.equals("CRYPTO")) {                     │
│        // 50 lines of Crypto code                        │
│    }                                                      │
│    else if (type.equals("APPLE_PAY")) {                  │
│        // 50 lines of Apple Pay code                     │
│        // ⚠️  REQUIRES MODIFYING THIS FILE!              │
│    }                                                      │
│    else if (type.equals("GOOGLE_PAY")) {                 │
│        // 50 lines of Google Pay code                    │
│        // ⚠️  REQUIRES MODIFYING THIS FILE!              │
│    }                                                      │
│  }                                                        │
│                                                           │
│  500+ lines of code                                      │
│  NOT closed for modification                             │
└───────────────────────────────────────────────────────────┘

Problems:
❌ Every new payment method modifies this file
❌ Regression risk: Adding Google Pay might break Stripe
❌ Cannot test payment methods independently
❌ Merge conflicts when multiple teams add methods
❌ Cannot deploy payment methods independently
```

### OCP-Compliant Architecture

```
                 ┌──────────────────────┐
                 │  PaymentProcessor    │
                 │    (INTERFACE)       │
                 │                      │
                 │ + process(Order)     │
                 │ + supports(Method)   │
                 └──────────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │   Stripe     │ │   PayPal     │ │   Crypto     │
    │  Processor   │ │  Processor   │ │  Processor   │
    │              │ │              │ │              │
    │  50 lines    │ │  50 lines    │ │  50 lines    │
    └──────────────┘ └──────────────┘ └──────────────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
              ┌─────────────▼─────────────┐
              │   NEW: ApplePayProcessor   │
              │   (NO MODIFICATION TO      │
              │    EXISTING CODE!)         │
              │                            │
              │   50 lines                 │
              └────────────────────────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │   PaymentService     │
                 │   (CONTEXT)          │
                 │                      │
                 │ - List<Processor>    │
                 │ + process(order)     │
                 │                      │
                 │ CLOSED for           │
                 │ modification         │
                 └──────────────────────┘

Benefits:
✓ Add payment method = new class
✓ Zero modifications to existing code
✓ Independent testing
✓ No regression risk
✓ Parallel development
✓ Spring auto-discovery
```

### OCP Refactoring Steps

```
Step 1: Identify variation points
─────────────────────────────────
• What varies? Payment methods
• What stays same? Process payment workflow
• How many variants? 5+ (will grow)

Step 2: Extract interface
─────────────────────────────────
public interface PaymentProcessor {
    PaymentResult process(Order order);
    boolean supports(PaymentMethod method);
}

Step 3: Create implementations
─────────────────────────────────
@Component
public class StripeProcessor implements PaymentProcessor { }

@Component
public class PayPalProcessor implements PaymentProcessor { }

Step 4: Inject all implementations
─────────────────────────────────
@Service
public class PaymentService {
    private final List<PaymentProcessor> processors;
    
    @Autowired
    public PaymentService(List<PaymentProcessor> processors) {
        this.processors = processors;
    }
}

Step 5: Use polymorphism
─────────────────────────────────
public PaymentResult process(Order order, PaymentMethod method) {
    return processors.stream()
        .filter(p -> p.supports(method))
        .findFirst()
        .orElseThrow()
        .process(order);
}

Step 6: Add new variant (extension)
─────────────────────────────────
@Component
public class ApplePayProcessor implements PaymentProcessor {
    // New class, zero modifications!
}
```

---

## 🔟 Why & How Summary

### Why OCP Matters

**Code Stability:**
- Existing code never changes (zero regression risk)
- Battle-tested code stays frozen
- New features can't break old features
- Reduces testing burden (only test new extensions)

**Business Agility:**
- Add features in hours, not days
- Deploy features independently
- Enable/disable features via configuration
- A/B test new implementations

**Team Efficiency:**
- Multiple teams add features in parallel
- Zero merge conflicts (different files)
- Clear extension points (implement interface)
- Reduces code review scope (only new code)

**Architecture Quality:**
- Plugin architecture (WordPress, Eclipse, VS Code)
- Microservices-friendly (each service can extend independently)
- Enables feature flags
- Supports multi-tenancy (tenant-specific extensions)

### How to Apply OCP

**Detection:**
1. Long if-else or switch on types → Extract Strategy
2. instanceof checks → Use polymorphism
3. Type enum with behavior → Create interface
4. "Adding X requires modifying Y" → OCP violation

**Refactoring:**
1. Identify what varies (payment methods, notifications, etc.)
2. Extract interface representing variation
3. Create implementation per variant
4. Use dependency injection to get all implementations
5. Delegate to appropriate implementation via polymorphism

**Prevention:**
1. Think "how will this grow?" before coding
2. Use interfaces for anything with 3+ variants
3. Favor composition over inheritance
4. Use Strategy pattern for algorithms
5. Use Template Method for workflows with customization points

### Interview Red Flags

🚫 "OCP means never changing code"
✅ "OCP means extending through new classes, not modifying existing classes"

🚫 "Use OCP everywhere, always"
✅ "Use OCP for variation points with 3+ variants or expected growth"

🚫 "OCP is just about inheritance"
✅ "OCP is about abstraction—interfaces, abstract classes, or composition"

### Final Sound Bite

*"Open-Closed Principle is about extending software without modifying existing code. When business wants Apple Pay support, I create ApplePayProcessor implementing PaymentProcessor interface—zero modifications to existing StripeProcessor or PayPalProcessor classes.*

*This stability is gold at scale. At my company processing 1M+ payments daily, every code change has blast radius. With OCP, adding Apple Pay can't break Stripe—different classes, different code paths, different deployments if needed. No regression testing of existing payment methods.*

*OCP isn't premature abstraction. It's strategic abstraction at known variation points. Payment methods will grow—history proves it. Notification channels will grow. Authentication strategies will grow. For these, OCP is insurance against future chaos.*

*The alternative is 500-line if-else chains that terrify everyone. OCP transforms 'risky multi-day refactoring' into 'safe 2-hour extension'. That's the business case: faster features, fewer bugs, happier developers."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
