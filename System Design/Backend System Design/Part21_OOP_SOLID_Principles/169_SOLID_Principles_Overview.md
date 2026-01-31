# 169. SOLID Principles (Overview)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**SOLID** is an acronym for five design principles that make object-oriented software more maintainable, flexible, and scalable. Introduced by Robert C. Martin (Uncle Bob), these principles are foundational to writing clean, professional code that stands the test of time.

### The Five SOLID Principles

**S - Single Responsibility Principle (SRP)**
- A class should have only one reason to change
- Each class should do one thing and do it well
- Separates concerns into distinct classes

**O - Open-Closed Principle (OCP)**
- Open for extension, closed for modification
- Add new functionality without changing existing code
- Use abstraction and polymorphism

**L - Liskov Substitution Principle (LSP)**
- Subtypes must be substitutable for their base types
- Child classes shouldn't break parent class contracts
- Maintains behavioral compatibility

**I - Interface Segregation Principle (ISP)**
- Clients shouldn't depend on interfaces they don't use
- Many specific interfaces are better than one general interface
- Prevents "fat" interfaces with unused methods

**D - Dependency Inversion Principle (DIP)**
- Depend on abstractions, not concretions
- High-level modules shouldn't depend on low-level modules
- Both should depend on abstractions

### Why SOLID Matters

**Code Quality Benefits:**
- **Maintainability**: Changes are localized and predictable
- **Flexibility**: Easy to extend and modify
- **Testability**: Dependencies can be mocked and tested
- **Readability**: Clear responsibilities and boundaries
- **Reusability**: Components can be reused across projects
- **Scalability**: System grows without accumulating technical debt

**Business Impact:**
- Reduces bug introduction during changes
- Faster feature development (less spaghetti code)
- Lower maintenance costs
- Easier onboarding for new developers
- Enables team scaling (multiple developers work independently)

**Where SOLID is used:**
- Enterprise applications (Spring Boot, Java EE)
- Microservices architectures
- API design and development
- Framework and library development
- Large-scale distributed systems
- Any codebase with > 10K lines of code

**Role in interviews:**
- FAANG companies expect SOLID knowledge at L4+
- Common questions: "Explain SRP violation and refactor"
- Code reviews evaluate SOLID adherence
- System design discussions reference SOLID principles
- Used to assess software design maturity

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔴 Single Responsibility Principle (SRP)

**Definition**: A class should have one, and only one, reason to change.

**What it means:**
- Each class focuses on a single concern
- "Reason to change" = responsibility
- Changes in one area don't force changes in unrelated areas

#### SRP Violation Example

```java
// BAD: Multiple responsibilities in one class ❌
@Service
public class UserService {
    
    // Responsibility 1: User management
    public User createUser(UserDto dto) {
        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        
        // Responsibility 2: Password encryption
        String encryptedPassword = BCrypt.hashpw(dto.getPassword(), BCrypt.gensalt());
        user.setPassword(encryptedPassword);
        
        // Responsibility 3: Data persistence
        Connection conn = DriverManager.getConnection(dbUrl, username, password);
        PreparedStatement stmt = conn.prepareStatement("INSERT INTO users ...");
        stmt.setString(1, user.getName());
        stmt.executeUpdate();
        
        // Responsibility 4: Email notification
        MimeMessage message = new MimeMessage(session);
        message.setFrom(new InternetAddress("noreply@example.com"));
        message.addRecipient(Message.RecipientType.TO, new InternetAddress(user.getEmail()));
        message.setSubject("Welcome!");
        message.setText("Welcome to our platform!");
        Transport.send(message);
        
        // Responsibility 5: Logging
        Logger logger = Logger.getLogger("UserService");
        logger.info("User created: " + user.getEmail());
        
        return user;
    }
}

// Problems:
// - Changes to email format requires modifying UserService
// - Changes to database requires modifying UserService
// - Changes to encryption algorithm requires modifying UserService
// - Cannot test each responsibility independently
// - Cannot reuse encryption, email, or persistence logic elsewhere
```

#### SRP Compliant Solution

```java
// GOOD: Each class has single responsibility ✓

// Responsibility 1: Password encryption
@Component
public class PasswordEncoder {
    public String encode(String rawPassword) {
        return BCrypt.hashpw(rawPassword, BCrypt.gensalt());
    }
    
    public boolean matches(String rawPassword, String encodedPassword) {
        return BCrypt.checkpw(rawPassword, encodedPassword);
    }
}

// Responsibility 2: Data persistence
@Repository
public class UserRepository {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public User save(User user) {
        String sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
        jdbcTemplate.update(sql, user.getName(), user.getEmail(), user.getPassword());
        return user;
    }
    
    public Optional<User> findByEmail(String email) {
        String sql = "SELECT * FROM users WHERE email = ?";
        return jdbcTemplate.query(sql, new UserRowMapper(), email).stream().findFirst();
    }
}

// Responsibility 3: Email notifications
@Service
public class EmailService {
    
    @Autowired
    private JavaMailSender mailSender;
    
    public void sendWelcomeEmail(String email, String name) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Welcome!");
        message.setText("Welcome to our platform, " + name + "!");
        mailSender.send(message);
    }
}

// Responsibility 4: User business logic (orchestration only)
@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    
    @Autowired
    public UserService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        EmailService emailService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }
    
    public User createUser(UserDto dto) {
        // Orchestration - delegates to specialized components
        User user = new User();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        
        User savedUser = userRepository.save(user);
        emailService.sendWelcomeEmail(savedUser.getEmail(), savedUser.getName());
        
        return savedUser;
    }
}

// Benefits:
// ✓ PasswordEncoder can be tested independently
// ✓ EmailService can be reused for other notifications
// ✓ UserRepository handles all database logic
// ✓ UserService focuses on business workflow
// ✓ Easy to mock dependencies for testing
// ✓ Changes to email don't affect UserService
```

---

### 🟢 Open-Closed Principle (OCP)

**Definition**: Software entities should be open for extension but closed for modification.

**What it means:**
- Add new functionality without changing existing code
- Achieved through abstraction (interfaces, abstract classes)
- New requirements = new classes, not modified classes

#### OCP Violation Example

```java
// BAD: Every new payment method requires modifying this class ❌
public class PaymentProcessor {
    
    public void processPayment(Order order, String paymentMethod) {
        if (paymentMethod.equals("CREDIT_CARD")) {
            // Credit card processing logic
            String token = order.getCreditCardToken();
            ChargeRequest request = new ChargeRequest(token, order.getAmount());
            stripeClient.charge(request);
            
        } else if (paymentMethod.equals("PAYPAL")) {
            // PayPal processing logic
            PayPalPayment payment = new PayPalPayment();
            payment.setAmount(order.getAmount());
            paypalClient.execute(payment);
            
        } else if (paymentMethod.equals("CRYPTO")) {
            // Crypto processing logic
            Transaction tx = new Transaction(order.getAmount(), order.getCryptoAddress());
            blockchainClient.broadcast(tx);
            
        } else if (paymentMethod.equals("BANK_TRANSFER")) {
            // Bank transfer logic
            // MORE CODE...
        }
        // Adding Apple Pay requires modifying this method!
        // This method grows infinitely!
    }
}
```

#### OCP Compliant Solution

```java
// GOOD: Open for extension, closed for modification ✓

// Abstraction - defines contract
public interface PaymentStrategy {
    PaymentResult process(Order order);
    boolean supports(PaymentMethod method);
}

// Extension 1: Credit Card
@Component
public class CreditCardPaymentStrategy implements PaymentStrategy {
    
    @Autowired
    private StripeClient stripeClient;
    
    @Override
    public PaymentResult process(Order order) {
        ChargeRequest request = new ChargeRequest(
            order.getCreditCardToken(), 
            order.getAmount()
        );
        Charge charge = stripeClient.charge(request);
        return PaymentResult.success(charge.getId());
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.CREDIT_CARD;
    }
}

// Extension 2: PayPal
@Component
public class PayPalPaymentStrategy implements PaymentStrategy {
    
    @Autowired
    private PayPalClient paypalClient;
    
    @Override
    public PaymentResult process(Order order) {
        PayPalPayment payment = new PayPalPayment(order.getAmount());
        PayPalResponse response = paypalClient.execute(payment);
        return PaymentResult.success(response.getTransactionId());
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.PAYPAL;
    }
}

// Extension 3: Cryptocurrency (NEW - no modification to existing code!)
@Component
public class CryptoPaymentStrategy implements PaymentStrategy {
    
    @Autowired
    private BlockchainClient blockchainClient;
    
    @Override
    public PaymentResult process(Order order) {
        Transaction tx = new Transaction(order.getAmount(), order.getCryptoAddress());
        String txHash = blockchainClient.broadcast(tx);
        return PaymentResult.success(txHash);
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.CRYPTO;
    }
}

// Processor - CLOSED for modification
@Service
public class PaymentProcessor {
    
    private final List<PaymentStrategy> strategies;
    
    @Autowired
    public PaymentProcessor(List<PaymentStrategy> strategies) {
        this.strategies = strategies; // Spring auto-injects all implementations
    }
    
    public PaymentResult processPayment(Order order, PaymentMethod method) {
        PaymentStrategy strategy = strategies.stream()
            .filter(s -> s.supports(method))
            .findFirst()
            .orElseThrow(() -> new UnsupportedPaymentMethodException(method));
        
        return strategy.process(order);
    }
}

// Benefits:
// ✓ Add new payment methods by creating new classes
// ✓ PaymentProcessor never needs modification
// ✓ Each strategy tested independently
// ✓ Easy to enable/disable payment methods
// ✓ Follows Strategy pattern
```

---

### 🔵 Liskov Substitution Principle (LSP)

**Definition**: Objects of a superclass should be replaceable with objects of its subclasses without breaking the application.

**What it means:**
- Child classes must honor parent class contracts
- Subtype shouldn't weaken preconditions or strengthen postconditions
- Behavior should be consistent across inheritance hierarchy

#### LSP Violation Example

```java
// BAD: Rectangle-Square problem (classic LSP violation) ❌
public class Rectangle {
    protected int width;
    protected int height;
    
    public void setWidth(int width) {
        this.width = width;
    }
    
    public void setHeight(int height) {
        this.height = height;
    }
    
    public int getArea() {
        return width * height;
    }
}

public class Square extends Rectangle {
    
    @Override
    public void setWidth(int width) {
        this.width = width;
        this.height = width; // Breaks LSP!
    }
    
    @Override
    public void setHeight(int height) {
        this.width = height;  // Breaks LSP!
        this.height = height;
    }
}

// Client code that works with Rectangle
public class AreaCalculator {
    
    public void testRectangle(Rectangle rect) {
        rect.setWidth(5);
        rect.setHeight(4);
        
        // Expect area = 20
        assert rect.getArea() == 20; // Works for Rectangle
        // FAILS for Square (area = 16)! LSP violation!
    }
}

// Problem: Square cannot substitute Rectangle without breaking behavior
```

#### LSP Compliant Solution

```java
// GOOD: Separate hierarchies or composition ✓

// Option 1: Separate hierarchies
public interface Shape {
    int getArea();
}

public class Rectangle implements Shape {
    private final int width;
    private final int height;
    
    public Rectangle(int width, int height) {
        this.width = width;
        this.height = height;
    }
    
    @Override
    public int getArea() {
        return width * height;
    }
}

public class Square implements Shape {
    private final int side;
    
    public Square(int side) {
        this.side = side;
    }
    
    @Override
    public int getArea() {
        return side * side;
    }
}

// Option 2: Real-world LSP example
public abstract class Bird {
    public abstract void eat();
    public abstract void sleep();
}

public abstract class FlyingBird extends Bird {
    public abstract void fly(); // Only birds that can fly extend this
}

public class Sparrow extends FlyingBird {
    
    @Override
    public void fly() {
        logger.info("Sparrow flying");
    }
    
    @Override
    public void eat() {
        logger.info("Sparrow eating");
    }
    
    @Override
    public void sleep() {
        logger.info("Sparrow sleeping");
    }
}

public class Penguin extends Bird { // Doesn't extend FlyingBird
    
    @Override
    public void eat() {
        logger.info("Penguin eating");
    }
    
    @Override
    public void sleep() {
        logger.info("Penguin sleeping");
    }
    
    public void swim() {
        logger.info("Penguin swimming");
    }
}

// Benefits:
// ✓ No LSP violation
// ✓ Penguin doesn't inherit fly() it can't implement
// ✓ FlyingBird can be used polymorphically where flight is needed
```

#### Production LSP Example

```java
// Database repository hierarchy
public interface Repository<T, ID> {
    Optional<T> findById(ID id);
    T save(T entity);
    void delete(T entity);
}

// READ-ONLY repository (LSP compliant)
public interface ReadOnlyRepository<T, ID> {
    Optional<T> findById(ID id);
    // No mutation methods
}

// Full repository extends read-only
public interface CrudRepository<T, ID> extends ReadOnlyRepository<T, ID> {
    T save(T entity);
    void delete(T entity);
}

// Client code
public class ReportGenerator {
    
    // Accepts read-only - guarantees no modifications
    public void generateReport(ReadOnlyRepository<Order, Long> repository) {
        Optional<Order> order = repository.findById(123L);
        // Cannot call save() or delete() - LSP maintained
    }
}
```

---

### 🟡 Interface Segregation Principle (ISP)

**Definition**: No client should be forced to depend on methods it does not use.

**What it means:**
- Many small, specific interfaces > one large, general interface
- Clients should only know about methods they use
- Prevents "fat" interfaces with irrelevant methods

#### ISP Violation Example

```java
// BAD: Fat interface forces implementations to provide unused methods ❌
public interface Worker {
    void work();
    void eat();
    void sleep();
    void attendMeeting();
    void submitTimesheet();
    void requestLeave();
    void conductPerformanceReview(); // Only for managers!
    void approveExpenses();           // Only for managers!
    void manageTeam();                // Only for managers!
}

// Regular employee forced to implement manager methods
public class Developer implements Worker {
    
    @Override
    public void work() {
        // Write code
    }
    
    @Override
    public void eat() {
        // Take lunch break
    }
    
    @Override
    public void sleep() {
        // Go home and sleep
    }
    
    @Override
    public void attendMeeting() {
        // Attend meetings
    }
    
    @Override
    public void submitTimesheet() {
        // Submit timesheet
    }
    
    @Override
    public void requestLeave() {
        // Request leave
    }
    
    // Forced to implement methods that don't apply!
    @Override
    public void conductPerformanceReview() {
        throw new UnsupportedOperationException("Developers don't conduct reviews");
    }
    
    @Override
    public void approveExpenses() {
        throw new UnsupportedOperationException("Developers don't approve expenses");
    }
    
    @Override
    public void manageTeam() {
        throw new UnsupportedOperationException("Developers don't manage teams");
    }
}
```

#### ISP Compliant Solution

```java
// GOOD: Segregated interfaces ✓

// Core employee interface
public interface Employee {
    void work();
    void eat();
    void sleep();
}

// Administrative capabilities
public interface Administrative {
    void attendMeeting();
    void submitTimesheet();
    void requestLeave();
}

// Management capabilities
public interface Manager {
    void conductPerformanceReview();
    void approveExpenses();
    void manageTeam();
}

// Developer only implements relevant interfaces
public class Developer implements Employee, Administrative {
    
    @Override
    public void work() {
        logger.info("Writing code");
    }
    
    @Override
    public void eat() {
        logger.info("Taking lunch break");
    }
    
    @Override
    public void sleep() {
        logger.info("Going home");
    }
    
    @Override
    public void attendMeeting() {
        logger.info("Attending meeting");
    }
    
    @Override
    public void submitTimesheet() {
        logger.info("Submitting timesheet");
    }
    
    @Override
    public void requestLeave() {
        logger.info("Requesting leave");
    }
    
    // No manager methods to implement!
}

// Team Lead implements all three
public class TeamLead implements Employee, Administrative, Manager {
    
    // Implements all methods from all interfaces
    
    @Override
    public void work() {
        logger.info("Coding and leading");
    }
    
    @Override
    public void conductPerformanceReview() {
        logger.info("Reviewing team performance");
    }
    
    @Override
    public void manageTeam() {
        logger.info("Managing team");
    }
    
    // ... other methods
}

// Benefits:
// ✓ Developer not forced to implement manager methods
// ✓ Clients can depend on specific interfaces they need
// ✓ Easy to add new roles with different capability combinations
```

#### Real-World ISP Example

```java
// Spring Data repositories follow ISP

// Basic CRUD
public interface CrudRepository<T, ID> extends Repository<T, ID> {
    <S extends T> S save(S entity);
    Optional<T> findById(ID id);
    void deleteById(ID id);
    long count();
}

// Paging capability (optional)
public interface PagingAndSortingRepository<T, ID> extends CrudRepository<T, ID> {
    Page<T> findAll(Pageable pageable);
    Iterable<T> findAll(Sort sort);
}

// JPA-specific features (optional)
public interface JpaRepository<T, ID> extends PagingAndSortingRepository<T, ID> {
    void flush();
    <S extends T> List<S> saveAllAndFlush(Iterable<S> entities);
    void deleteInBatch(Iterable<T> entities);
}

// Usage: Choose interface based on needs
public interface UserRepository extends CrudRepository<User, Long> {
    // Only needs CRUD, not paging or JPA features
}

public interface OrderRepository extends JpaRepository<Order, Long> {
    // Needs all features including batch operations
}
```

---

### 🟣 Dependency Inversion Principle (DIP)

**Definition**: High-level modules should not depend on low-level modules. Both should depend on abstractions.

**What it means:**
- Depend on interfaces/abstractions, not concrete implementations
- Invert the traditional dependency structure
- Enables flexibility, testability, and loose coupling

#### DIP Violation Example

```java
// BAD: High-level module depends on low-level implementation ❌
@Service
public class OrderService {
    
    // Direct dependency on concrete MySQL implementation
    private MySQLOrderRepository repository;
    
    public OrderService() {
        this.repository = new MySQLOrderRepository(); // Tight coupling!
    }
    
    public Order createOrder(OrderRequest request) {
        Order order = Order.from(request);
        repository.save(order); // Depends on MySQL
        return order;
    }
}

// Low-level module
public class MySQLOrderRepository {
    public void save(Order order) {
        // MySQL-specific code
        Connection conn = DriverManager.getConnection("jdbc:mysql://...");
        // ...
    }
}

// Problems:
// - Cannot switch to PostgreSQL without modifying OrderService
// - Cannot test OrderService without MySQL database
// - Tight coupling between layers
// - Violates DIP: High-level (OrderService) depends on low-level (MySQLOrderRepository)
```

#### DIP Compliant Solution

```java
// GOOD: Both depend on abstraction ✓

// Abstraction (interface)
public interface OrderRepository {
    Order save(Order order);
    Optional<Order> findById(Long id);
    List<Order> findAll();
}

// High-level module depends on abstraction
@Service
public class OrderService {
    
    private final OrderRepository repository; // Depends on abstraction!
    
    @Autowired // Spring injects implementation
    public OrderService(OrderRepository repository) {
        this.repository = repository;
    }
    
    public Order createOrder(OrderRequest request) {
        Order order = Order.from(request);
        return repository.save(order); // Works with any implementation
    }
}

// Low-level module 1: MySQL implementation
@Repository
public class MySQLOrderRepository implements OrderRepository {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    @Override
    public Order save(Order order) {
        String sql = "INSERT INTO orders (customer_id, total) VALUES (?, ?)";
        jdbcTemplate.update(sql, order.getCustomerId(), order.getTotal());
        return order;
    }
    
    @Override
    public Optional<Order> findById(Long id) {
        // MySQL implementation
    }
    
    @Override
    public List<Order> findAll() {
        // MySQL implementation
    }
}

// Low-level module 2: MongoDB implementation (can swap without changing OrderService!)
@Repository
@Profile("mongodb")
public class MongoDBOrderRepository implements OrderRepository {
    
    @Autowired
    private MongoTemplate mongoTemplate;
    
    @Override
    public Order save(Order order) {
        return mongoTemplate.save(order);
    }
    
    @Override
    public Optional<Order> findById(Long id) {
        return Optional.ofNullable(mongoTemplate.findById(id, Order.class));
    }
    
    @Override
    public List<Order> findAll() {
        return mongoTemplate.findAll(Order.class);
    }
}

// Testing: Easy to mock abstraction
@SpringBootTest
public class OrderServiceTest {
    
    @Mock
    private OrderRepository mockRepository;
    
    @InjectMocks
    private OrderService orderService;
    
    @Test
    public void testCreateOrder() {
        // Mock abstraction, not concrete implementation
        Order mockOrder = new Order();
        when(mockRepository.save(any(Order.class))).thenReturn(mockOrder);
        
        Order result = orderService.createOrder(new OrderRequest());
        
        assertNotNull(result);
        verify(mockRepository).save(any(Order.class));
    }
}

// Benefits:
// ✓ OrderService doesn't know about MySQL or MongoDB
// ✓ Can switch implementations via configuration
// ✓ Easy to test with mocks
// ✓ Loose coupling between layers
// ✓ Both layers depend on abstraction (OrderRepository)
```

#### DIP in Layered Architecture

```
┌─────────────────────────────────────┐
│     Presentation Layer              │
│     (Controllers)                   │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│     Business Layer                  │
│     (Services)                      │
└──────────────┬──────────────────────┘
               │ depends on
               ▼
┌─────────────────────────────────────┐
│     Abstraction Layer               │ ◄── Key: Abstraction in middle
│     (Repository Interfaces)         │
└──────────────┬──────────────────────┘
               │ implemented by
               ▼
┌─────────────────────────────────────┐
│     Data Layer                      │
│     (Repository Implementations)    │
└─────────────────────────────────────┘

Traditional: Business Layer → Data Layer (direct dependency)
DIP: Business Layer → Abstraction ← Data Layer (both depend on abstraction)
```

---

## ────────────────────────────────────
## 3️⃣ SOLID Principles Interplay
## ────────────────────────────────────

### How Principles Work Together

```java
// Real-world example showing all SOLID principles

// ═══════ SRP: Separate concerns ═══════
// Email sending responsibility
public interface EmailSender {
    void send(String to, String subject, String body);
}

// SMS sending responsibility
public interface SmsSender {
    void send(String phone, String message);
}

// Push notification responsibility
public interface PushNotificationSender {
    void send(String deviceToken, String message);
}

// ═══════ ISP: Segregated interfaces ═══════
// Each notification type has its own interface (not one fat interface)

// ═══════ DIP: Depend on abstractions ═══════
// NotificationService depends on abstractions, not implementations

@Service
public class NotificationService {
    
    private final EmailSender emailSender;         // DIP: Abstraction
    private final SmsSender smsSender;             // DIP: Abstraction
    private final PushNotificationSender pushSender; // DIP: Abstraction
    
    @Autowired
    public NotificationService(
        EmailSender emailSender,
        SmsSender smsSender,
        PushNotificationSender pushSender
    ) {
        this.emailSender = emailSender;
        this.smsSender = smsSender;
        this.pushSender = pushSender;
    }
    
    // SRP: This service only orchestrates notifications
    public void notifyUser(User user, String message, NotificationChannel channel) {
        NotificationStrategy strategy = getStrategy(channel); // OCP
        strategy.send(user, message);
    }
    
    // OCP: Easy to add new channels without modifying existing code
    private NotificationStrategy getStrategy(NotificationChannel channel) {
        return switch (channel) {
            case EMAIL -> new EmailNotificationStrategy(emailSender);
            case SMS -> new SmsNotificationStrategy(smsSender);
            case PUSH -> new PushNotificationStrategy(pushSender);
        };
    }
}

// ═══════ OCP: Open for extension ═══════
public interface NotificationStrategy {
    void send(User user, String message);
}

public class EmailNotificationStrategy implements NotificationStrategy {
    
    private final EmailSender emailSender;
    
    public EmailNotificationStrategy(EmailSender emailSender) {
        this.emailSender = emailSender;
    }
    
    @Override
    public void send(User user, String message) {
        emailSender.send(user.getEmail(), "Notification", message);
    }
}

// Can add new strategy without modifying NotificationService!
public class SlackNotificationStrategy implements NotificationStrategy {
    
    private final SlackClient slackClient;
    
    public SlackNotificationStrategy(SlackClient slackClient) {
        this.slackClient = slackClient;
    }
    
    @Override
    public void send(User user, String message) {
        slackClient.sendMessage(user.getSlackId(), message);
    }
}

// ═══════ LSP: Substitutability ═══════
// All NotificationStrategy implementations can substitute base type
// All EmailSender implementations can substitute base type

// Implementation 1
@Service
public class SendGridEmailSender implements EmailSender {
    
    @Override
    public void send(String to, String subject, String body) {
        // SendGrid implementation
    }
}

// Implementation 2 (can substitute SendGrid without breaking code)
@Service
@Profile("aws")
public class SesEmailSender implements EmailSender {
    
    @Override
    public void send(String to, String subject, String body) {
        // AWS SES implementation
    }
}

// LSP maintained: Both implementations honor EmailSender contract
```

---

## ────────────────────────────────────
## 4️⃣ Real-World Application at Scale
## ────────────────────────────────────

### Payment Processing System (1M+ transactions/day)

```java
// ═══════════════════════════════════════════════════
// SRP: Each class has single responsibility
// ═══════════════════════════════════════════════════

// Validation responsibility
@Component
public class PaymentValidator {
    public void validate(PaymentRequest request) {
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Amount must be positive");
        }
    }
}

// Fraud detection responsibility
@Service
public class FraudDetectionService {
    public FraudCheckResult checkFraud(PaymentRequest request) {
        // Fraud detection logic
        return FraudCheckResult.passed();
    }
}

// Metrics responsibility
@Service
public class PaymentMetricsService {
    public void recordPayment(String processor, PaymentResult result) {
        // Record metrics
    }
}

// ═══════════════════════════════════════════════════
// OCP & DIP: Payment processor abstraction
// ═══════════════════════════════════════════════════

public interface PaymentProcessor {
    PaymentResult process(PaymentRequest request);
    boolean supports(PaymentMethod method);
}

// Concrete implementations (OCP: extend without modifying)
@Component
public class StripePaymentProcessor implements PaymentProcessor {
    
    @Override
    public PaymentResult process(PaymentRequest request) {
        // Stripe-specific logic
    }
    
    @Override
    public boolean supports(PaymentMethod method) {
        return method == PaymentMethod.CREDIT_CARD;
    }
}

@Component
public class PayPalPaymentProcessor implements PaymentProcessor {
    // PayPal implementation
}

@Component
public class CryptoPaymentProcessor implements PaymentProcessor {
    // Crypto implementation
}

// ═══════════════════════════════════════════════════
// Orchestration service (DIP: depends on abstractions)
// ═══════════════════════════════════════════════════

@Service
public class PaymentService {
    
    private final PaymentValidator validator;              // SRP
    private final FraudDetectionService fraudService;      // SRP
    private final PaymentMetricsService metricsService;    // SRP
    private final List<PaymentProcessor> processors;       // DIP: abstraction
    
    @Autowired
    public PaymentService(
        PaymentValidator validator,
        FraudDetectionService fraudService,
        PaymentMetricsService metricsService,
        List<PaymentProcessor> processors  // Spring injects all implementations
    ) {
        this.validator = validator;
        this.fraudService = fraudService;
        this.metricsService = metricsService;
        this.processors = processors;
    }
    
    // SRP: Orchestration only
    public PaymentResult processPayment(PaymentRequest request) {
        // Step 1: Validate
        validator.validate(request);
        
        // Step 2: Fraud check
        FraudCheckResult fraudCheck = fraudService.checkFraud(request);
        if (fraudCheck.isSuspicious()) {
            return PaymentResult.fraudDetected();
        }
        
        // Step 3: Find processor (OCP)
        PaymentProcessor processor = processors.stream()
            .filter(p -> p.supports(request.getPaymentMethod()))
            .findFirst()
            .orElseThrow(() -> new UnsupportedPaymentMethodException());
        
        // Step 4: Process
        PaymentResult result = processor.process(request);
        
        // Step 5: Record metrics
        metricsService.recordPayment(
            processor.getClass().getSimpleName(), 
            result
        );
        
        return result;
    }
}

// Benefits at scale:
// ✓ Add new payment methods without touching PaymentService (OCP)
// ✓ Each component tested independently (SRP)
// ✓ Easy to mock dependencies (DIP)
// ✓ Can swap fraud detection service (DIP)
// ✓ Metrics service reusable elsewhere (SRP)
```

---

## ────────────────────────────────────
## 5️⃣ Interview-Oriented Answers
## ────────────────────────────────────

### Crisp 2-Minute SOLID Explanation

*"SOLID is five design principles that make code maintainable and extensible.*

*Single Responsibility means each class does one thing—I separate UserService into UserRepository for persistence, PasswordEncoder for encryption, and EmailService for notifications.*

*Open-Closed means add features without changing existing code—I use interfaces like PaymentProcessor where adding Apple Pay is a new class, not modifying existing logic.*

*Liskov Substitution means subtypes must honor parent contracts—if PaymentProcessor defines process(), all implementations must process payments correctly, not throw UnsupportedOperationException.*

*Interface Segregation means specific interfaces over fat ones—instead of one Worker interface with 10 methods, I have Employee, Administrative, and Manager interfaces that classes implement as needed.*

*Dependency Inversion means depend on abstractions—my OrderService depends on OrderRepository interface, not MySQLRepository class, so I can swap MySQL for MongoDB without code changes.*

*At my company handling 1M+ payments daily, SOLID enables adding new payment methods in days without touching existing code, and makes testing easy with mockable dependencies."*

### Common Interview Follow-Ups

**Q1: "Which SOLID principle is most important?"**

**Answer:** *"Single Responsibility is foundational—it's the easiest to violate and hardest to fix later. When each class has one responsibility, the other principles naturally follow. In my experience, most design issues trace back to SRP violations—classes doing too much. At scale, SRP enables team parallelization—different developers own different responsibilities without stepping on each other's toes."*

**Q2: "How do SOLID principles relate to design patterns?"**

| Design Pattern | Primary SOLID Principle |
|----------------|------------------------|
| Strategy | OCP, DIP |
| Factory | OCP, DIP |
| Decorator | OCP, SRP |
| Observer | OCP, DIP |
| Adapter | ISP, DIP |
| Template Method | OCP, DIP |
| Repository | SRP, DIP |

**Answer:** *"Design patterns are implementations of SOLID principles. Strategy pattern applies OCP—I can add new strategies without modifying context. Decorator applies SRP and OCP—each decorator adds one behavior. Repository pattern applies SRP and DIP—separates persistence logic and depends on abstraction."*

**Q3: "Give an example where you violated SOLID and refactored"**

```java
// Before: SRP violation
@Service
public class OrderService {
    public Order createOrder(OrderRequest request) {
        // Validate
        if (request.getItems().isEmpty()) throw new ValidationException();
        
        // Calculate total
        BigDecimal total = request.getItems().stream()
            .map(item -> item.getPrice().multiply(item.getQuantity()))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Process payment
        if (request.getPaymentMethod() == PaymentMethod.CREDIT_CARD) {
            // 50 lines of Stripe code
        } else if (request.getPaymentMethod() == PaymentMethod.PAYPAL) {
            // 50 lines of PayPal code
        }
        
        // Save to database
        Connection conn = DriverManager.getConnection(...);
        PreparedStatement stmt = conn.prepareStatement(...);
        stmt.executeUpdate();
        
        // Send email
        MimeMessage message = new MimeMessage(...);
        Transport.send(message);
        
        return order;
    }
}

// After: SOLID compliant
@Service
public class OrderService {
    private final OrderValidator validator;           // SRP
    private final PriceCalculator calculator;         // SRP
    private final PaymentProcessor paymentProcessor;  // OCP, DIP
    private final OrderRepository repository;         // SRP, DIP
    private final EmailService emailService;          // SRP
    
    public Order createOrder(OrderRequest request) {
        validator.validate(request);
        BigDecimal total = calculator.calculate(request);
        PaymentResult payment = paymentProcessor.process(request);
        Order order = repository.save(Order.from(request, total));
        emailService.sendConfirmation(order);
        return order;
    }
}
```

**Answer:** *"We had a 500-line OrderService doing validation, pricing, payment, persistence, and notifications—classic SRP violation. Adding new payment methods required editing this god class, risking bugs. I refactored by extracting each responsibility into separate classes. This cut OrderService to 20 lines of orchestration. We then added 3 new payment methods in one sprint without touching OrderService—that's OCP in action. Testability improved—we mock dependencies instead of database/email in every test."*

**Q4: "When should you NOT follow SOLID?"**

**When to skip SOLID:**
- Scripts < 100 lines (overhead not worth it)
- Performance-critical hot paths (abstraction adds overhead)
- Prototype/POC code (speed > structure)
- Data structures (classes that are just data holders)

**Answer:** *"SOLID adds indirection and abstraction overhead. For small scripts or performance-critical code like high-frequency trading systems, direct calls are faster. For prototypes, speed matters more than structure. But for production systems with > 10K lines and multiple developers, SOLID prevents technical debt that would cost 10x to fix later."*

**Q5: "How do you teach SOLID to junior developers?"**

**Answer:** *"I use code reviews and real examples. When I see a class doing multiple things, I ask: 'What are the reasons this class might change?' Multiple reasons = SRP violation. For OCP, I show if-else chains and ask: 'How would you add a new case?' If answer is 'modify this method,' that's OCP violation. For DIP, I point out direct instantiation ('new MySQLRepository()') and ask: 'How would you test this?' Can't mock = DIP violation. Concrete examples stick better than abstract principles."*

**Q6: "Explain LSP with a real production bug"**

```java
// Bug: BaseService throws checked exception
public class BaseService {
    public void process() throws IOException {
        // Base implementation
    }
}

// Subclass changes exception type (LSP violation!)
public class CachedService extends BaseService {
    @Override
    public void process() throws CacheException { // Different exception!
        // Implementation
    }
}

// Client code expects IOException
public class ServiceClient {
    public void execute(BaseService service) {
        try {
            service.process(); // Expects IOException
        } catch (IOException e) {
            // Handle IO errors
        }
        // CacheException not caught! Production bug!
    }
}
```

**Answer:** *"We had a BaseRepository throwing SQLException that all clients caught. A developer created CachedRepository that threw CacheException instead—LSP violation. Client code expecting SQLException didn't catch CacheException, causing uncaught exceptions in production. Fix was making CachedRepository throw SQLException too, wrapping CacheException inside. LSP means subtype exception handling must be compatible with parent—you can throw the same exception or a subtype, but not a completely different exception."*

---

## ────────────────────────────────────
## 6️⃣ SOLID Principles Quick Reference
## ────────────────────────────────────

### Cheat Sheet

```
┌──────────────────────────────────────────────────────────────┐
│  S - Single Responsibility Principle                         │
│  "One class, one job, one reason to change"                  │
│  ✓ Separate concerns into distinct classes                   │
│  ✓ Each class focuses on single responsibility               │
│  ❌ God classes doing everything                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  O - Open-Closed Principle                                   │
│  "Open for extension, closed for modification"               │
│  ✓ Add features without changing existing code               │
│  ✓ Use interfaces and polymorphism                           │
│  ❌ Long if-else chains for new features                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  L - Liskov Substitution Principle                           │
│  "Subtypes must be substitutable for base types"             │
│  ✓ Child classes honor parent contracts                      │
│  ✓ Behavior consistent across hierarchy                      │
│  ❌ Subclass throws UnsupportedOperationException             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  I - Interface Segregation Principle                         │
│  "Many specific interfaces > one general interface"          │
│  ✓ Clients depend only on methods they use                   │
│  ✓ Focused, cohesive interfaces                              │
│  ❌ Fat interfaces with unused methods                        │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│  D - Dependency Inversion Principle                          │
│  "Depend on abstractions, not concretions"                   │
│  ✓ High-level modules depend on interfaces                   │
│  ✓ Easy to swap implementations                              │
│  ❌ Direct instantiation of concrete classes                  │
└──────────────────────────────────────────────────────────────┘
```

### Detection Checklist

**SRP Violation Indicators:**
- [ ] Class has "and" in its name (UserAndEmailService)
- [ ] Methods in class have no relationship
- [ ] Class has multiple reasons to change
- [ ] Class > 300 lines
- [ ] Class has many dependencies (> 5)

**OCP Violation Indicators:**
- [ ] Long if-else or switch statements for types
- [ ] Adding features requires modifying existing code
- [ ] "Closed" classes frequently modified
- [ ] Cannot extend without modifying source

**LSP Violation Indicators:**
- [ ] Subclass throws UnsupportedOperationException
- [ ] Subclass tightens preconditions
- [ ] Subclass weakens postconditions
- [ ] Subclass changes parent behavior unexpectedly

**ISP Violation Indicators:**
- [ ] Interface has > 10 methods
- [ ] Implementations provide empty/default methods
- [ ] Implementations throw UnsupportedOperationException
- [ ] Interface combines multiple concerns

**DIP Violation Indicators:**
- [ ] High-level modules instantiate low-level classes
- [ ] Direct use of "new" for dependencies
- [ ] Cannot easily swap implementations
- [ ] Hard to test (can't mock dependencies)

---

## 🔟 Why & How Summary

### Why SOLID Matters

**Code Quality:**
- Maintainable: Changes are localized and safe
- Flexible: Easy to add features and swap implementations
- Testable: Dependencies can be mocked
- Readable: Clear responsibilities and contracts
- Reusable: Components work in multiple contexts

**Business Value:**
- Faster feature delivery (less coupling, less risk)
- Lower bug rates (changes don't ripple unpredictably)
- Easier onboarding (well-structured code is self-documenting)
- Reduced technical debt (no god classes or spaghetti code)

### How to Apply SOLID

1. **Start with SRP**: Identify responsibilities and separate them
2. **Use interfaces (OCP, DIP)**: Define contracts before implementations
3. **Check substitutability (LSP)**: Ensure subtypes honor contracts
4. **Keep interfaces focused (ISP)**: Multiple small > one large
5. **Inject dependencies (DIP)**: Never instantiate dependencies directly

### Interview Red Flags

🚫 "SOLID is just best practices"
✅ "SOLID is five specific design principles that ensure maintainability, extensibility, and testability"

🚫 "Follow SOLID always, everywhere"
✅ "Apply SOLID to production codebases > 10K lines; skip for scripts and prototypes"

🚫 "SOLID principles are independent"
✅ "SOLID principles work together—SRP enables ISP, OCP relies on DIP, LSP enforces OCP"

### Final Sound Bite

*"SOLID principles are the foundation of maintainable object-oriented design. Single Responsibility keeps classes focused, Open-Closed enables extension without modification, Liskov ensures substitutability, Interface Segregation prevents fat interfaces, and Dependency Inversion promotes loose coupling.*

*In production, SOLID means adding a payment method is creating a new class, not editing a 500-line if-else chain. It means testing services with mocked dependencies, not spinning up databases. It means new developers understand code boundaries without spelunking through god classes.*

*At scale, SOLID is the difference between a codebase that evolves gracefully and one that collapses under technical debt. It's not overhead—it's investment that pays dividends every time you ship a feature without breaking existing ones."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
