# 170. Single Responsibility Principle (SRP)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Single Responsibility Principle (SRP)**: A class should have one, and only one, reason to change.

### Core Concept

**What it means:**
- Each class should focus on a single concern or responsibility
- "Reason to change" = responsibility
- When requirements change, only one class should need modification
- Separates orthogonal concerns into distinct modules

**Simple analogy:**
- A restaurant has separate staff: chef (cooking), waiter (serving), cashier (billing)
- Each person has one job—if menu changes, only chef affected
- In code: UserService (business logic), UserRepository (database), EmailService (notifications)

### Why SRP is Foundational

**Code Quality Impact:**
- **Maintainability**: Changes are localized and predictable
- **Testability**: Each class tested independently with focused unit tests
- **Readability**: Clear naming and purpose (UserRepository does what it says)
- **Reusability**: Single-purpose classes work in multiple contexts
- **Low Coupling**: Classes don't depend on unrelated functionality

**Common SRP Violations:**
- God classes (doing everything)
- Classes with "Manager", "Handler", "Util" in name
- Methods with no relationship to each other
- Classes > 500 lines
- Classes with 10+ dependencies

**Role in interviews:**
- Most frequently discussed SOLID principle
- Appears in code review scenarios: "What's wrong with this class?"
- Refactoring questions: "How would you improve this design?"
- FAANG L5+ expect automatic SRP adherence in code

**Where SRP applies:**
- Services, repositories, controllers (Spring Boot layered architecture)
- Utility classes, validators, formatters
- Event handlers, message processors
- Any production code with multiple developers

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔴 Understanding "Reason to Change"

**Definition**: A "reason to change" is an axis of change driven by a stakeholder or requirement.

#### Example: E-commerce Order Processing

```java
// BAD: Multiple reasons to change ❌
@Service
public class OrderService {
    
    // Reason 1: Business rules change
    public Order createOrder(OrderDto dto) {
        // Validate order
        if (dto.getItems().isEmpty()) {
            throw new ValidationException("Order must have items");
        }
        
        // Calculate discounts (marketing team drives changes)
        BigDecimal discount = BigDecimal.ZERO;
        if (dto.isFirstTimeCustomer()) {
            discount = dto.getTotal().multiply(new BigDecimal("0.10"));
        }
        if (dto.getTotal().compareTo(new BigDecimal("100")) > 0) {
            discount = discount.add(new BigDecimal("5.00"));
        }
        
        // Calculate tax (finance team drives changes)
        BigDecimal taxRate = getTaxRateByState(dto.getShippingAddress().getState());
        BigDecimal tax = dto.getTotal().multiply(taxRate);
        
        // Reason 2: Database schema changes (DBA drives changes)
        Connection conn = DriverManager.getConnection(
            "jdbc:mysql://localhost:3306/ecommerce", 
            "user", 
            "password"
        );
        PreparedStatement stmt = conn.prepareStatement(
            "INSERT INTO orders (customer_id, total, discount, tax) VALUES (?, ?, ?, ?)"
        );
        stmt.setLong(1, dto.getCustomerId());
        stmt.setBigDecimal(2, dto.getTotal());
        stmt.setBigDecimal(3, discount);
        stmt.setBigDecimal(4, tax);
        stmt.executeUpdate();
        
        // Reason 3: Inventory system integration changes (inventory team drives changes)
        for (OrderItem item : dto.getItems()) {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("http://inventory-service/reserve"))
                .POST(HttpRequest.BodyPublishers.ofString(
                    String.format("{\"sku\": \"%s\", \"quantity\": %d}", 
                        item.getSku(), item.getQuantity())
                ))
                .build();
            client.send(request, HttpResponse.BodyHandlers.ofString());
        }
        
        // Reason 4: Email template changes (marketing team drives changes)
        MimeMessage message = new MimeMessage(session);
        message.setFrom(new InternetAddress("orders@example.com"));
        message.addRecipient(Message.RecipientType.TO, 
            new InternetAddress(dto.getCustomerEmail()));
        message.setSubject("Order Confirmation #" + orderId);
        message.setText(
            "Thank you for your order!\n" +
            "Order Total: $" + dto.getTotal() + "\n" +
            "Discount: $" + discount
        );
        Transport.send(message);
        
        // Reason 5: Payment gateway integration changes (payments team drives changes)
        StripeClient stripeClient = new StripeClient();
        ChargeRequest chargeRequest = new ChargeRequest();
        chargeRequest.setAmount(dto.getTotal().subtract(discount).add(tax));
        chargeRequest.setCurrency("USD");
        chargeRequest.setSource(dto.getPaymentToken());
        Charge charge = stripeClient.charges().create(chargeRequest);
        
        // Reason 6: Logging format changes (ops team drives changes)
        Logger logger = LoggerFactory.getLogger(OrderService.class);
        logger.info(String.format(
            "[ORDER_CREATED] OrderId=%d CustomerId=%d Total=%.2f Discount=%.2f Tax=%.2f",
            orderId, dto.getCustomerId(), dto.getTotal(), discount, tax
        ));
        
        return order;
    }
}

// Problems with this design:
// 1. Marketing changes discount rules → modify OrderService
// 2. Finance changes tax calculation → modify OrderService
// 3. DBA changes database schema → modify OrderService
// 4. Inventory team changes API contract → modify OrderService
// 5. Marketing changes email template → modify OrderService
// 6. Payments team switches from Stripe to PayPal → modify OrderService
// 7. Ops changes logging format → modify OrderService
//
// This class has 7 reasons to change = 7 responsibilities!
// Every team's changes require touching this file = merge conflicts, regression risks
```

#### SRP-Compliant Solution

```java
// GOOD: Each class has ONE reason to change ✓

// ═══════════════════════════════════════════════════════════
// Responsibility 1: Discount calculation (Marketing owns)
// ═══════════════════════════════════════════════════════════
@Component
public class DiscountCalculator {
    
    public BigDecimal calculateDiscount(Order order, Customer customer) {
        BigDecimal discount = BigDecimal.ZERO;
        
        // First-time customer discount
        if (customer.isFirstOrder()) {
            discount = discount.add(
                order.getTotal().multiply(new BigDecimal("0.10"))
            );
        }
        
        // Bulk order discount
        if (order.getTotal().compareTo(new BigDecimal("100")) > 0) {
            discount = discount.add(new BigDecimal("5.00"));
        }
        
        // Loyalty program discount
        if (customer.getLoyaltyPoints() > 1000) {
            discount = discount.add(new BigDecimal("10.00"));
        }
        
        return discount;
    }
}

// ═══════════════════════════════════════════════════════════
// Responsibility 2: Tax calculation (Finance owns)
// ═══════════════════════════════════════════════════════════
@Component
public class TaxCalculator {
    
    private static final Map<String, BigDecimal> TAX_RATES = Map.of(
        "CA", new BigDecimal("0.0725"),
        "NY", new BigDecimal("0.0400"),
        "TX", new BigDecimal("0.0625"),
        "FL", new BigDecimal("0.06")
    );
    
    public BigDecimal calculateTax(BigDecimal amount, Address shippingAddress) {
        BigDecimal taxRate = TAX_RATES.getOrDefault(
            shippingAddress.getState(), 
            BigDecimal.ZERO
        );
        return amount.multiply(taxRate);
    }
}

// ═══════════════════════════════════════════════════════════
// Responsibility 3: Database persistence (DBA owns)
// ═══════════════════════════════════════════════════════════
@Repository
public class OrderRepository {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public Order save(Order order) {
        String sql = "INSERT INTO orders (customer_id, total, discount, tax, status) " +
                     "VALUES (?, ?, ?, ?, ?)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, order.getCustomerId());
            ps.setBigDecimal(2, order.getTotal());
            ps.setBigDecimal(3, order.getDiscount());
            ps.setBigDecimal(4, order.getTax());
            ps.setString(5, order.getStatus().name());
            return ps;
        }, keyHolder);
        
        order.setId(keyHolder.getKey().longValue());
        return order;
    }
    
    public Optional<Order> findById(Long id) {
        String sql = "SELECT * FROM orders WHERE id = ?";
        return jdbcTemplate.query(sql, new OrderRowMapper(), id)
            .stream()
            .findFirst();
    }
}

// ═══════════════════════════════════════════════════════════
// Responsibility 4: Inventory management (Inventory team owns)
// ═══════════════════════════════════════════════════════════
@Service
public class InventoryService {
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${inventory.service.url}")
    private String inventoryServiceUrl;
    
    public void reserveItems(List<OrderItem> items) {
        for (OrderItem item : items) {
            ReservationRequest request = new ReservationRequest(
                item.getSku(), 
                item.getQuantity()
            );
            
            restTemplate.postForObject(
                inventoryServiceUrl + "/reserve",
                request,
                ReservationResponse.class
            );
        }
    }
    
    public void releaseItems(List<OrderItem> items) {
        // Release inventory if order fails
    }
}

// ═══════════════════════════════════════════════════════════
// Responsibility 5: Email notifications (Marketing owns)
// ═══════════════════════════════════════════════════════════
@Service
public class OrderEmailService {
    
    @Autowired
    private JavaMailSender mailSender;
    
    @Autowired
    private TemplateEngine templateEngine;
    
    public void sendOrderConfirmation(Order order, Customer customer) {
        Context context = new Context();
        context.setVariable("order", order);
        context.setVariable("customer", customer);
        
        String htmlContent = templateEngine.process("order-confirmation", context);
        
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);
        
        try {
            helper.setFrom("orders@example.com");
            helper.setTo(customer.getEmail());
            helper.setSubject("Order Confirmation #" + order.getId());
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
        } catch (MessagingException e) {
            throw new EmailException("Failed to send order confirmation", e);
        }
    }
}

// ═══════════════════════════════════════════════════════════
// Responsibility 6: Payment processing (Payments team owns)
// ═══════════════════════════════════════════════════════════
@Service
public class PaymentService {
    
    @Autowired
    private StripeClient stripeClient;
    
    public PaymentResult processPayment(Order order, String paymentToken) {
        try {
            ChargeRequest request = new ChargeRequest();
            request.setAmount(order.getFinalTotal()); // total - discount + tax
            request.setCurrency("USD");
            request.setSource(paymentToken);
            request.setDescription("Order #" + order.getId());
            
            Charge charge = stripeClient.charges().create(request);
            
            return PaymentResult.success(charge.getId());
        } catch (StripeException e) {
            return PaymentResult.failure(e.getMessage());
        }
    }
}

// ═══════════════════════════════════════════════════════════
// Responsibility 7: Order orchestration (Product/Engineering owns)
// This is the ONLY class that coordinates the workflow
// ═══════════════════════════════════════════════════════════
@Service
public class OrderService {
    
    private final OrderRepository orderRepository;
    private final DiscountCalculator discountCalculator;
    private final TaxCalculator taxCalculator;
    private final InventoryService inventoryService;
    private final OrderEmailService emailService;
    private final PaymentService paymentService;
    
    @Autowired
    public OrderService(
        OrderRepository orderRepository,
        DiscountCalculator discountCalculator,
        TaxCalculator taxCalculator,
        InventoryService inventoryService,
        OrderEmailService emailService,
        PaymentService paymentService
    ) {
        this.orderRepository = orderRepository;
        this.discountCalculator = discountCalculator;
        this.taxCalculator = taxCalculator;
        this.inventoryService = inventoryService;
        this.emailService = emailService;
        this.paymentService = paymentService;
    }
    
    @Transactional
    public Order createOrder(OrderDto dto, Customer customer) {
        // Build order
        Order order = Order.from(dto);
        
        // Calculate discount
        BigDecimal discount = discountCalculator.calculateDiscount(order, customer);
        order.setDiscount(discount);
        
        // Calculate tax
        BigDecimal tax = taxCalculator.calculateTax(
            order.getTotal().subtract(discount),
            dto.getShippingAddress()
        );
        order.setTax(tax);
        
        // Reserve inventory
        inventoryService.reserveItems(dto.getItems());
        
        // Process payment
        PaymentResult paymentResult = paymentService.processPayment(
            order, 
            dto.getPaymentToken()
        );
        
        if (!paymentResult.isSuccess()) {
            inventoryService.releaseItems(dto.getItems());
            throw new PaymentException("Payment failed: " + paymentResult.getErrorMessage());
        }
        
        order.setPaymentId(paymentResult.getPaymentId());
        order.setStatus(OrderStatus.CONFIRMED);
        
        // Save order
        Order savedOrder = orderRepository.save(order);
        
        // Send confirmation email
        emailService.sendOrderConfirmation(savedOrder, customer);
        
        return savedOrder;
    }
}

// Benefits of SRP-compliant design:
// ✓ Marketing changes discounts → only DiscountCalculator modified
// ✓ Finance changes tax rules → only TaxCalculator modified
// ✓ DBA changes schema → only OrderRepository modified
// ✓ Inventory team changes API → only InventoryService modified
// ✓ Marketing changes email → only OrderEmailService modified
// ✓ Payments switches to PayPal → only PaymentService modified
// ✓ Each class < 100 lines, focused, testable
// ✓ OrderService = 40 lines of pure orchestration
// ✓ Zero merge conflicts between teams
```

---

### 🔵 Granularity: How Small is Too Small?

**Balance between SRP and over-engineering:**

#### Too Coarse (SRP Violation)

```java
// BAD: One class does everything ❌
@Service
public class UserManagementService {
    public void registerUser(UserDto dto) { }
    public void loginUser(String email, String password) { }
    public void resetPassword(String email) { }
    public void updateProfile(Long userId, ProfileDto dto) { }
    public void deactivateAccount(Long userId) { }
    public void sendWelcomeEmail(User user) { }
    public void validateEmail(String email) { }
    public byte[] generateAvatar(String name) { }
    public void logUserActivity(Long userId, String action) { }
}
```

#### Too Fine (Over-Engineering)

```java
// BAD: Too granular, creates complexity ❌
@Component
public class UserEmailValidator { } // 10 lines

@Component
public class UserPasswordValidator { } // 10 lines

@Component
public class UserNameValidator { } // 10 lines

@Component
public class UserAgeValidator { } // 10 lines

@Component
public class UserPhoneValidator { } // 10 lines

// 5 classes for validation that could be one focused validator
```

#### Just Right (SRP Sweet Spot)

```java
// GOOD: Balanced granularity ✓

// Single validator with focused responsibility
@Component
public class UserValidator {
    
    public void validate(UserDto dto) {
        validateEmail(dto.getEmail());
        validatePassword(dto.getPassword());
        validateName(dto.getName());
        validateAge(dto.getAge());
        validatePhone(dto.getPhone());
    }
    
    private void validateEmail(String email) {
        // Email validation logic
    }
    
    private void validatePassword(String password) {
        // Password validation logic
    }
    
    // Other private validation methods
}

// Separate service for user operations
@Service
public class UserService {
    public User registerUser(UserDto dto) { }
    public User updateProfile(Long userId, ProfileDto dto) { }
    public void deactivateAccount(Long userId) { }
}

// Separate service for authentication
@Service
public class AuthenticationService {
    public AuthToken login(String email, String password) { }
    public void resetPassword(String email) { }
    public void logout(String token) { }
}

// Separate service for notifications
@Service
public class UserNotificationService {
    public void sendWelcomeEmail(User user) { }
    public void sendPasswordResetEmail(User user) { }
    public void sendAccountDeactivationEmail(User user) { }
}
```

**Guidelines for granularity:**
- Class should be 50-300 lines (sweet spot: 100-150)
- Methods should be 5-20 lines (sweet spot: 10)
- Related private methods can stay together
- Extract when class has > 5 public methods doing unrelated things
- Extract when method has > 3 levels of indentation

---

### 🟢 SRP in Different Layers

#### Controller Layer (SRP: Handle HTTP)

```java
// GOOD: Controller only handles HTTP concerns ✓
@RestController
@RequestMapping("/api/orders")
public class OrderController {
    
    private final OrderService orderService;
    
    @Autowired
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }
    
    // Responsibility: Convert HTTP request → domain call
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(
        @Valid @RequestBody OrderRequest request,
        @AuthenticationPrincipal User user
    ) {
        Order order = orderService.createOrder(request.toDto(), user);
        return ResponseEntity.ok(OrderResponse.from(order));
    }
    
    // Responsibility: Handle HTTP-level errors
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidationError(ValidationException e) {
        return ResponseEntity.badRequest()
            .body(new ErrorResponse("VALIDATION_ERROR", e.getMessage()));
    }
}

// Controller does NOT:
// ❌ Validate business rules (that's Service layer)
// ❌ Access database directly (that's Repository layer)
// ❌ Calculate discounts (that's Domain layer)
// ❌ Send emails (that's Service layer)
```

#### Service Layer (SRP: Business Logic)

```java
// GOOD: Service handles business orchestration ✓
@Service
public class OrderService {
    
    // Dependencies injected (other single-responsibility classes)
    private final OrderRepository orderRepository;
    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    
    @Transactional
    public Order createOrder(OrderDto dto, User user) {
        // Pure business orchestration
        Order order = buildOrder(dto, user);
        
        // Delegate to specialized services
        PaymentResult payment = paymentService.process(order);
        inventoryService.reserve(order.getItems());
        
        return orderRepository.save(order);
    }
    
    private Order buildOrder(OrderDto dto, User user) {
        // Domain logic
        return Order.builder()
            .customerId(user.getId())
            .items(dto.getItems())
            .total(calculateTotal(dto.getItems()))
            .build();
    }
}

// Service does NOT:
// ❌ Format JSON responses (that's Controller)
// ❌ Write SQL queries (that's Repository)
// ❌ Handle HTTP status codes (that's Controller)
// ❌ Manage connections (that's Repository/DataSource)
```

#### Repository Layer (SRP: Data Access)

```java
// GOOD: Repository handles database operations ✓
@Repository
public class OrderRepository {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public Order save(Order order) {
        // Pure data access
        String sql = "INSERT INTO orders (customer_id, total) VALUES (?, ?)";
        jdbcTemplate.update(sql, order.getCustomerId(), order.getTotal());
        return order;
    }
    
    public Optional<Order> findById(Long id) {
        String sql = "SELECT * FROM orders WHERE id = ?";
        return jdbcTemplate.query(sql, new OrderRowMapper(), id)
            .stream()
            .findFirst();
    }
}

// Repository does NOT:
// ❌ Validate business rules (that's Service)
// ❌ Calculate discounts (that's Service/Domain)
// ❌ Send notifications (that's Service)
// ❌ Handle transactions (that's Service with @Transactional)
```

---

### 🟡 God Class Anti-Pattern

**God class**: A class that knows too much or does too much.

#### Classic God Class Example

```java
// BAD: God class doing everything ❌
@Service
public class UserManager {
    
    // 50+ fields
    private Connection dbConnection;
    private EmailService emailService;
    private SmsService smsService;
    private CacheManager cacheManager;
    private SecurityValidator securityValidator;
    private PasswordEncoder passwordEncoder;
    private TokenGenerator tokenGenerator;
    private AuditLogger auditLogger;
    // ... 40+ more dependencies
    
    // 100+ methods
    public void registerUser() { }
    public void loginUser() { }
    public void logoutUser() { }
    public void validateEmail() { }
    public void validatePassword() { }
    public void hashPassword() { }
    public void generateSalt() { }
    public void sendWelcomeEmail() { }
    public void sendPasswordResetEmail() { }
    public void sendVerificationSms() { }
    public void updateProfile() { }
    public void uploadAvatar() { }
    public void compressAvatar() { }
    public void deleteAvatar() { }
    public void changePassword() { }
    public void resetPassword() { }
    public void verifyEmail() { }
    public void verify2FA() { }
    public void generateBackupCodes() { }
    public void enableNotifications() { }
    public void updatePrivacySettings() { }
    public void exportUserData() { }
    public void deleteAccount() { }
    public void anonymizeData() { }
    // ... 80+ more methods
    
    // 2000+ lines of code
}

// Problems:
// - Impossible to understand
// - Impossible to test (50+ dependencies to mock)
// - Every team touches this file = merge hell
// - Changes anywhere break everything
// - Cannot reuse parts independently
```

#### Refactored into Cohesive Classes

```java
// GOOD: Decomposed into single-responsibility classes ✓

// Authentication (login, logout, token management)
@Service
public class AuthenticationService {
    public AuthToken login(String email, String password) { }
    public void logout(String token) { }
    public AuthToken refresh(String refreshToken) { }
}

// Registration (account creation)
@Service
public class UserRegistrationService {
    public User register(RegistrationDto dto) { }
    public void verifyEmail(String token) { }
}

// Profile management (user data updates)
@Service
public class UserProfileService {
    public User updateProfile(Long userId, ProfileDto dto) { }
    public void uploadAvatar(Long userId, MultipartFile file) { }
    public void deleteAvatar(Long userId) { }
}

// Password management (password operations)
@Service
public class PasswordService {
    public void changePassword(Long userId, String oldPassword, String newPassword) { }
    public void resetPassword(String email) { }
    public void confirmPasswordReset(String token, String newPassword) { }
}

// Notification preferences
@Service
public class NotificationPreferencesService {
    public void updateEmailPreferences(Long userId, EmailPreferencesDto dto) { }
    public void updateSmsPreferences(Long userId, SmsPreferencesDto dto) { }
}

// Security settings (2FA, backup codes)
@Service
public class SecuritySettingsService {
    public void enable2FA(Long userId) { }
    public void verify2FA(Long userId, String code) { }
    public List<String> generateBackupCodes(Long userId) { }
}

// Account lifecycle (deletion, export)
@Service
public class AccountLifecycleService {
    public void deactivateAccount(Long userId) { }
    public void deleteAccount(Long userId) { }
    public byte[] exportUserData(Long userId) { }
}

// Benefits:
// ✓ Each service < 150 lines
// ✓ Clear ownership per team
// ✓ Independent testing
// ✓ Reusable components
// ✓ Parallel development
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Metrics
## ────────────────────────────────────

### SRP Impact on Performance

**Class loading and memory:**
```
God Class Approach:
- 1 class = 2000 lines
- Loaded into memory: ~500KB bytecode + metadata
- All dependencies loaded even if unused
- JIT compilation time: ~200ms

SRP Approach:
- 10 classes × 150 lines each = 1500 lines total
- Loaded on-demand: 10 × ~50KB = 500KB total
- Only needed dependencies loaded
- JIT compilation time: 10 × ~15ms = 150ms
- Benefit: Faster startup, lower memory footprint
```

### Build and Test Time

**Compilation:**
```
God Class (2000 lines):
- Javac compilation: ~800ms
- Every change recompiles everything
- 100 changes/day × 800ms = 80 seconds wasted

SRP Classes (10 × 150 lines):
- Javac compilation per class: ~60ms
- Only changed class recompiles
- 100 changes/day × 60ms = 6 seconds
- Savings: 74 seconds/day = 6 minutes/day per developer
```

**Testing:**
```
God Class Tests:
- 50+ mocks required
- Test setup: ~500 lines
- Test execution: ~5 seconds per test
- 20 tests × 5s = 100 seconds

SRP Class Tests:
- 3-5 mocks per class
- Test setup: ~50 lines per class
- Test execution: ~0.5 seconds per test
- 20 tests × 0.5s = 10 seconds
- Savings: 90 seconds = 90% faster
```

### Team Scalability

**Merge conflicts:**
```
God Class Repository (1 file):
- 5 developers editing same file
- Merge conflicts: 15-20 per week
- Average resolution time: 20 minutes
- Wasted time: 5-6 hours/week

SRP Repository (10 files):
- 5 developers editing different files
- Merge conflicts: 2-3 per week
- Average resolution time: 5 minutes
- Wasted time: 15-20 minutes/week
- Savings: 4.5 hours/week = 18 hours/month
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### SRP in Domain Models

```java
// BAD: Anemic domain model violating SRP ❌
public class Order {
    private Long id;
    private Long customerId;
    private BigDecimal total;
    private BigDecimal discount;
    private BigDecimal tax;
    private OrderStatus status;
    
    // Only getters and setters (1000+ lines)
    // All logic in OrderService (another 2000 lines)
}

// GOOD: Rich domain model with SRP ✓
public class Order {
    
    private Long id;
    private Long customerId;
    private Money total;
    private Money discount;
    private Money tax;
    private OrderStatus status;
    private List<OrderItem> items;
    
    // Responsibility: Order business rules
    public Money calculateFinalTotal() {
        return total.subtract(discount).add(tax);
    }
    
    public void applyDiscount(Discount discount) {
        if (!discount.isApplicable(this)) {
            throw new InvalidDiscountException();
        }
        this.discount = discount.calculate(this.total);
    }
    
    public void confirm() {
        if (status != OrderStatus.PENDING) {
            throw new InvalidOrderStateException("Cannot confirm order in status: " + status);
        }
        this.status = OrderStatus.CONFIRMED;
    }
    
    public boolean canBeCancelled() {
        return status == OrderStatus.PENDING || status == OrderStatus.CONFIRMED;
    }
    
    // NOT responsible for:
    // ❌ Database persistence (that's OrderRepository)
    // ❌ Email notifications (that's OrderEmailService)
    // ❌ Payment processing (that's PaymentService)
}

// Separate value object for money operations
public class Money {
    private final BigDecimal amount;
    private final Currency currency;
    
    // Responsibility: Money arithmetic and formatting
    public Money add(Money other) {
        validateSameCurrency(other);
        return new Money(amount.add(other.amount), currency);
    }
    
    public Money subtract(Money other) {
        validateSameCurrency(other);
        return new Money(amount.subtract(other.amount), currency);
    }
    
    public Money multiply(BigDecimal factor) {
        return new Money(amount.multiply(factor), currency);
    }
    
    private void validateSameCurrency(Money other) {
        if (!currency.equals(other.currency)) {
            throw new CurrencyMismatchException();
        }
    }
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Performance & Reliability
## ────────────────────────────────────

### SRP Enables Caching Strategies

```java
// SRP allows targeted caching

// GOOD: Cache only expensive operations ✓
@Service
public class ProductPriceService {
    
    @Autowired
    private RedisTemplate<String, BigDecimal> redisTemplate;
    
    // Single responsibility: Calculate product price
    @Cacheable(value = "product-prices", key = "#productId")
    public BigDecimal calculatePrice(Long productId) {
        // Expensive calculation
        return complexPriceCalculation(productId);
    }
}

@Service
public class ProductInventoryService {
    
    // Single responsibility: Manage inventory
    // NOT cached (inventory changes frequently)
    public int getAvailableStock(Long productId) {
        return inventoryRepository.getStock(productId);
    }
}

// If these were in same God class, caching would be problematic:
// - Cache entire object including frequently-changing inventory?
// - Cache only price but reload entire object?
// - Cache granularity unclear
```

### SRP Enables Horizontal Scaling

```java
// Different services scale independently

// High read throughput - scale to 10 instances
@Service
public class ProductSearchService {
    public List<Product> search(String query) {
        // Deployed on 10 pods
        return elasticsearchClient.search(query);
    }
}

// High write throughput - scale to 5 instances
@Service
public class OrderCreationService {
    public Order create(OrderDto dto) {
        // Deployed on 5 pods with message queue
        return orderRepository.save(order);
    }
}

// Low throughput - scale to 2 instances
@Service
public class ReportGenerationService {
    public Report generate(ReportRequest request) {
        // Deployed on 2 pods (CPU-intensive)
        return generateReport(request);
    }
}

// SRP enables independent scaling decisions
// God class would force same scaling for all operations
```

### SRP Improves Fault Isolation

```java
// Failure in one service doesn't cascade

@Service
public class OrderService {
    
    private final PaymentService paymentService;
    private final EmailService emailService;
    
    @Transactional
    public Order createOrder(OrderDto dto) {
        Order order = orderRepository.save(Order.from(dto));
        
        // Payment failure = rollback order
        try {
            paymentService.process(order);
        } catch (PaymentException e) {
            throw e; // Transaction rolled back
        }
        
        // Email failure = log and continue (non-critical)
        try {
            emailService.sendConfirmation(order);
        } catch (EmailException e) {
            logger.error("Failed to send email", e);
            // Order still created successfully
        }
        
        return order;
    }
}

// SRP allows fine-grained error handling
// God class would have tangled error handling logic
```

---

## ────────────────────────────────────
## 6️⃣ Security & API Design
## ────────────────────────────────────

### SRP in Security

```java
// GOOD: Separate security concerns ✓

// Responsibility: Authentication
@Service
public class AuthenticationService {
    public AuthToken authenticate(String email, String password) {
        // Only handles authentication
    }
}

// Responsibility: Authorization
@Service
public class AuthorizationService {
    public boolean hasPermission(User user, Resource resource, Permission permission) {
        // Only handles authorization
    }
}

// Responsibility: Audit logging
@Service
public class SecurityAuditService {
    public void logAccess(User user, Resource resource, AccessResult result) {
        // Only handles audit
    }
}

// Usage: Each service focused on single security concern
@RestController
public class OrderController {
    
    @GetMapping("/orders/{id}")
    public Order getOrder(@PathVariable Long id, @AuthenticationPrincipal User user) {
        // Authentication (handled by Spring Security filter)
        
        // Authorization
        if (!authorizationService.hasPermission(user, "ORDER", "READ")) {
            throw new ForbiddenException();
        }
        
        Order order = orderService.findById(id);
        
        // Audit
        securityAuditService.logAccess(user, order, AccessResult.SUCCESS);
        
        return order;
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Production Examples
## ────────────────────────────────────

### Example 1: Netflix - Hystrix Circuit Breaker

Netflix's Hystrix follows SRP by separating concerns:

```java
// Each class has single responsibility

// Responsibility: Execute command with fallback
public abstract class HystrixCommand<R> {
    protected abstract R run() throws Exception;
    protected abstract R getFallback();
}

// Responsibility: Circuit breaker logic
public class CircuitBreaker {
    public boolean allowRequest() { }
    public void markSuccess() { }
    public void markFailure() { }
}

// Responsibility: Metrics collection
public class HystrixMetrics {
    public void recordSuccess(long duration) { }
    public void recordFailure(long duration) { }
    public HealthCounts getHealthCounts() { }
}

// Responsibility: Thread pool management
public class HystrixThreadPool {
    public Future<R> submit(Callable<R> task) { }
}

// NOT a God class doing everything
```

### Example 2: Spring Framework - JdbcTemplate

Spring's JdbcTemplate demonstrates SRP:

```java
// Responsibility: JDBC operations
public class JdbcTemplate {
    public <T> T query(String sql, ResultSetExtractor<T> rse) { }
    public int update(String sql, Object... args) { }
}

// Responsibility: Transaction management (separate)
public class PlatformTransactionManager {
    public TransactionStatus getTransaction(TransactionDefinition definition) { }
    public void commit(TransactionStatus status) { }
    public void rollback(TransactionStatus status) { }
}

// Responsibility: Connection management (separate)
public interface DataSource {
    Connection getConnection() throws SQLException;
}

// Each class focuses on one aspect of data access
```

### Example 3: Stripe API - Payment Processing

Stripe API client follows SRP:

```java
// Each service class handles one domain

// Responsibility: Charge operations
public class ChargeService {
    public Charge create(ChargeCreateParams params) { }
    public Charge retrieve(String id) { }
    public Charge update(String id, ChargeUpdateParams params) { }
}

// Responsibility: Customer operations
public class CustomerService {
    public Customer create(CustomerCreateParams params) { }
    public Customer retrieve(String id) { }
}

// Responsibility: Refund operations
public class RefundService {
    public Refund create(RefundCreateParams params) { }
    public Refund retrieve(String id) { }
}

// Responsibility: Webhook signature verification
public class WebhookSignatureVerifier {
    public boolean verify(String payload, String signature, String secret) { }
}

// Clean separation of concerns
```

---

## ────────────────────────────────────
## 8️⃣ Interview Q&A (Behavioral Questions)
## ────────────────────────────────────

### Q1: "What is Single Responsibility Principle?"

**Answer:** *"Single Responsibility Principle states that a class should have one, and only one, reason to change. 'Reason to change' means responsibility. For example, if I have a UserService that handles user registration, database persistence, email notifications, and password hashing, it has four reasons to change—when registration rules change, when database schema changes, when email templates change, or when encryption algorithms change. That's four responsibilities.*

*To follow SRP, I'd extract PasswordEncoder for hashing, UserRepository for database, EmailService for notifications, and keep UserService focused on registration business logic. Now each class has one reason to change. When marketing wants different email templates, I only touch EmailService. When security requires stronger encryption, I only touch PasswordEncoder. Changes are localized, testable, and safe."*

### Q2: "Give a real example where you refactored to follow SRP"

**Answer:** *"At my company, we had an OrderProcessor class that was 1,200 lines doing everything—validation, discount calculation, tax calculation, inventory reservation, payment processing, database persistence, and email notifications. Every team touched this file, causing 10+ merge conflicts per week.*

*I refactored by extracting each responsibility: DiscountCalculator (80 lines), TaxCalculator (60 lines), InventoryService (120 lines), PaymentService (150 lines), OrderRepository (100 lines), EmailService (90 lines), and kept OrderService as pure orchestration (40 lines).*

*Results: Merge conflicts dropped to 1-2 per week. When finance changed tax rules, only TaxCalculator changed. When we added crypto payments, only PaymentService changed. Test suite went from 5 minutes to 30 seconds because each class had 3-5 mocks instead of 15. OrderService became readable—you see the workflow without implementation details."*

### Q3: "How do you identify SRP violations in code reviews?"

**Answer:** *"I look for five signals:*

*First, class names with 'Manager', 'Handler', 'Util', or 'Helper'—these are code smells for god classes.*

*Second, methods with no relationship—if a class has createOrder(), sendEmail(), and compressImage(), those are three unrelated responsibilities.*

*Third, class size—over 300 lines is yellow flag, over 500 is red flag.*

*Fourth, dependency count—if constructor has 10+ parameters, class is doing too much.*

*Fifth, 'and' in documentation—if class description has 'and', like 'handles orders and emails and inventory', that's multiple responsibilities.*

*When I see violations, I ask: 'What are all the reasons this class might change?' Multiple reasons = refactor time."*

### Q4: "What's the difference between SRP and low coupling?"

**Answer:** *"SRP is about internal focus—each class does one thing. Low coupling is about external relationships—classes don't depend on each other's internals.*

*Example: UserService (handles registration) and EmailService (sends emails) both follow SRP—each has one job. If UserService directly instantiates EmailService and calls internal methods, that's tight coupling. If UserService depends on EmailNotification interface and Spring injects implementation, that's loose coupling.*

*SRP enables low coupling. When classes have single responsibilities, their interfaces are clean and focused. UserService doesn't need to know how emails are sent—it just calls notify(). That's SRP enabling loose coupling through clear boundaries."*

### Q5: "When is it okay to violate SRP?"

**Answer:** *"I violate SRP in four scenarios:*

*First, scripts under 100 lines—if it's a one-time data migration, SRP overhead isn't worth it.*

*Second, performance-critical paths—in high-frequency trading systems, method call overhead matters. A 50-line hot path might combine responsibilities for speed.*

*Third, prototypes and POCs—when exploring ideas, structure comes after validation.*

*Fourth, value objects and DTOs—classes that are pure data holders don't need SRP. A User DTO with 20 fields is fine.*

*But for production services handling business logic, SRP is non-negotiable. Technical debt from SRP violations compounds exponentially. A 500-line god class becomes 2,000 lines, then 5,000 lines, then unmaintainable."*

### Q6: "How does SRP affect testing?"

**Answer:** *"SRP dramatically improves testability. God class with 15 dependencies requires 15 mocks—that's 100+ lines of test setup before you write one assertion. Each test is slow, brittle, and hard to understand.*

*SRP class with 3 dependencies requires 3 mocks—that's 10 lines of setup. Tests are fast, focused, and readable. Example: Testing DiscountCalculator only mocks Customer and Order—test runs in 10ms. Testing old OrderProcessor mocked database, payment gateway, email service, inventory service—test ran in 5 seconds.*

*SRP also enables targeted testing. I can test discount logic without payment gateway. I can test payment without email service. God class forces testing everything together, creating integration tests when you need unit tests. That's 100x slower and masks failure root causes."*

---

## ────────────────────────────────────
## 9️⃣ Diagrams & Code Patterns
## ────────────────────────────────────

### SRP Violation Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          OrderService                           │
│                         (GOD CLASS)                             │
│                                                                 │
│  + createOrder()              ← Business logic                 │
│  + validateOrder()            ← Validation                     │
│  + calculateDiscount()        ← Pricing                        │
│  + calculateTax()             ← Finance                        │
│  + saveToDatabase()           ← Persistence                    │
│  + callInventoryAPI()         ← Integration                    │
│  + processPayment()           ← Payment                        │
│  + sendEmailConfirmation()    ← Notifications                  │
│  + logActivity()              ← Logging                        │
│                                                                 │
│  Dependencies:                                                  │
│  - DataSource, Connection, PreparedStatement                   │
│  - StripeClient, PayPalClient                                  │
│  - JavaMailSender, MimeMessage                                 │
│  - HttpClient, RestTemplate                                    │
│  - Logger, MetricsCollector                                    │
│  - 10+ more dependencies...                                    │
│                                                                 │
│  2,000 lines of code                                           │
│  15+ dependencies                                              │
│  9 reasons to change                                           │
└─────────────────────────────────────────────────────────────────┘

Problems:
❌ Every team changes this file
❌ Impossible to test (15 mocks)
❌ Cannot reuse parts independently
❌ Changes break unrelated functionality
❌ Merge conflicts daily
```

### SRP-Compliant Architecture

```
                      ┌──────────────────┐
                      │  OrderService    │
                      │ (Orchestration)  │
                      │   40 lines       │
                      │   1 reason to    │
                      │   change         │
                      └────────┬─────────┘
                               │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
    │  Discount    │   │   Tax        │  │  Payment     │
    │  Calculator  │   │ Calculator   │  │   Service    │
    │  80 lines    │   │  60 lines    │  │  150 lines   │
    │  1 reason    │   │  1 reason    │  │  1 reason    │
    └──────────────┘   └──────────────┘  └──────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
    ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
    │  Inventory   │   │    Order     │  │    Email     │
    │   Service    │   │  Repository  │  │   Service    │
    │  120 lines   │   │  100 lines   │  │   90 lines   │
    │  1 reason    │   │  1 reason    │  │  1 reason    │
    └──────────────┘   └──────────────┘  └──────────────┘

Benefits:
✓ Each class independently testable
✓ Clear ownership per team
✓ Changes localized
✓ Reusable components
✓ Parallel development
✓ Zero merge conflicts
```

### SRP Refactoring Pattern

```java
// Step 1: Identify responsibilities in god class
/*
OrderProcessor responsibilities:
1. Validation
2. Discount calculation
3. Tax calculation
4. Inventory management
5. Payment processing
6. Database persistence
7. Email notifications
8. Logging
*/

// Step 2: Extract each responsibility into focused class
@Component class OrderValidator { }
@Component class DiscountCalculator { }
@Component class TaxCalculator { }
@Service   class InventoryService { }
@Service   class PaymentService { }
@Repository class OrderRepository { }
@Service   class EmailService { }

// Step 3: Keep orchestration in original service
@Service
public class OrderService {
    // Inject all extracted dependencies
    // Delegate to each specialized component
    // Keep only business workflow logic
}

// Step 4: Write focused tests for each class
@Test class DiscountCalculatorTest { }  // 3 mocks
@Test class TaxCalculatorTest { }       // 2 mocks
@Test class PaymentServiceTest { }      // 4 mocks
// vs
@Test class OrderProcessorTest { }      // 15 mocks
```

---

## 🔟 Why & How Summary

### Why SRP Matters

**Code Quality:**
- **Maintainability**: Changes are localized, predictable, safe
- **Testability**: Small focused classes with 3-5 dependencies vs god classes with 15+
- **Readability**: Clear purpose, no scrolling through 2,000 lines
- **Reusability**: EmailService works for orders, users, notifications
- **Low Coupling**: Classes don't know each other's internals

**Team Efficiency:**
- **Parallel Development**: Teams work on different files simultaneously
- **Zero Merge Conflicts**: Marketing changes discounts, finance changes taxes—different files
- **Clear Ownership**: DiscountCalculator owned by pricing team, TaxCalculator by finance
- **Faster Onboarding**: New developers understand focused 100-line classes quickly

**Business Value:**
- **Faster Features**: Add payment method in 1 day vs 1 week
- **Fewer Bugs**: Changes don't ripple unpredictably
- **Lower Costs**: Less time debugging tangled code
- **Technical Debt Prevention**: 100-line classes don't become 2,000-line monsters

### How to Apply SRP

**Detection:**
1. Count reasons to change: Multiple = SRP violation
2. Check class size: > 300 lines = investigate
3. Count dependencies: > 7 = likely violation
4. Read class name: "Manager", "Handler" = red flag
5. List methods: Unrelated methods = violation

**Refactoring:**
1. Identify distinct responsibilities
2. Extract each into focused class
3. Keep orchestration in original class
4. Write tests for each extracted class
5. Verify original behavior maintained

**Prevention:**
1. Start new classes with single purpose
2. Code reviews check for SRP
3. Limit class size (100-300 lines)
4. Limit dependencies (< 7)
5. Name classes by responsibility

### Interview Red Flags

🚫 "SRP means one method per class"
✅ "SRP means one reason to change per class"

🚫 "SRP creates too many small classes"
✅ "SRP creates focused, testable, reusable components"

🚫 "God classes are faster to develop"
✅ "God classes create technical debt that's 10x more expensive to fix later"

### Final Sound Bite

*"Single Responsibility Principle is the foundation of maintainable software. A class should have one reason to change—one job, one focus, one responsibility.*

*When I see a 1,200-line OrderProcessor doing validation, discounts, taxes, payments, database, emails, and logging, I see seven reasons to change. That's seven teams making conflicting changes, merge hell, and brittle tests with 15 mocks.*

*When I refactor to SRP—DiscountCalculator, TaxCalculator, PaymentService, OrderRepository, EmailService—each class is 100 lines, has one team owner, tests with 3 mocks, and changes independently. Marketing updates discounts without touching payments. Finance updates taxes without touching emails.*

*At scale, SRP is the difference between a codebase that grows gracefully and one that collapses under its own weight. It's not overhead—it's the foundation that enables everything else: Open-Closed, testability, team scalability, and business agility."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
