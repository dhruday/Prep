# 173. Interface Segregation Principle (ISP)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Interface Segregation Principle (ISP)**: No client should be forced to depend on methods it does not use.

### Core Concept

**What it means:**
- Many specific interfaces are better than one general interface
- Clients should depend only on methods they actually need
- Don't force implementations to provide methods they don't use
- Split large interfaces into smaller, focused ones

**Simple analogy:**
- A restaurant menu (interface) has sections: appetizers, mains, desserts, drinks
- Vegetarian customers (clients) shouldn't be forced to read meat dishes
- Kids menu (specialized interface) has only relevant items
- ISP says: create focused menus for different customer types

**In code:**
```java
// BAD: Fat interface forces unused methods ❌
interface Worker {
    void work();
    void eat();
    void conductMeeting();      // Only managers!
    void approveExpenses();     // Only managers!
    void manageTeam();          // Only managers!
}

class Developer implements Worker {
    void work() { /* code */ }
    void eat() { /* lunch */ }
    void conductMeeting() { throw new UnsupportedOperationException(); } // ❌
    void approveExpenses() { throw new UnsupportedOperationException(); } // ❌
    void manageTeam() { throw new UnsupportedOperationException(); } // ❌
}

// GOOD: Segregated interfaces ✓
interface Employee {
    void work();
    void eat();
}

interface Manager {
    void conductMeeting();
    void approveExpenses();
    void manageTeam();
}

class Developer implements Employee { /* only relevant methods */ }
class TeamLead implements Employee, Manager { /* all methods */ }
```

### Why ISP Matters

**Code Quality Benefits:**
- **Clean Dependencies**: Classes depend only on what they use
- **No Bloat**: No empty/stub implementations
- **Flexibility**: Easy to compose capabilities
- **Testability**: Mock only relevant methods
- **Maintainability**: Changes affect fewer clients

**Business Impact:**
- Reduces coupling between modules
- Enables role-based access (admin vs user interfaces)
- Supports feature toggles (optional capabilities)
- Makes APIs easier to understand and use

**Common ISP Violations:**
- Interfaces with 10+ methods
- Implementations throwing UnsupportedOperationException
- Implementations with empty method bodies
- "God interfaces" trying to do everything
- Clients depending on methods they never call

**Role in interviews:**
- FAANG asks: "This interface has 15 methods—what's wrong?"
- Refactoring: "Split this interface following ISP"
- Design questions: "How would you model user roles with ISP?"
- Expects understanding of interface composition

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### 🔴 Classic ISP Violation: The Fat Interface

#### Example 1: Worker Interface Anti-Pattern

```java
// BAD: Fat interface with all possible worker capabilities ❌

public interface Worker {
    
    // Basic employee methods
    void clockIn();
    void clockOut();
    void work();
    void takeBreak();
    void eat();
    void attendMeeting();
    void submitTimesheet();
    void requestLeave();
    void updateProfile();
    
    // Manager-only methods
    void conductPerformanceReview();
    void approveLeaveRequest();
    void approveExpenses();
    void manageTeam();
    void assignTasks();
    void reviewCode();          // Only for tech leads!
    void approveArchitecture(); // Only for architects!
    
    // HR-only methods
    void conductInterview();
    void makeHiringDecision();
    void processPayroll();
    void terminateEmployee();
    
    // Executive-only methods
    void setCompanyStrategy();
    void approveBudget();
    void makeAcquisitionDecision();
}

// Developer forced to implement 25 methods!
public class Developer implements Worker {
    
    @Override
    public void clockIn() {
        System.out.println("Developer clocked in");
    }
    
    @Override
    public void work() {
        System.out.println("Writing code");
    }
    
    // Forced to implement manager methods
    @Override
    public void conductPerformanceReview() {
        throw new UnsupportedOperationException("Developers don't conduct reviews");
    }
    
    @Override
    public void approveLeaveRequest() {
        throw new UnsupportedOperationException("Developers don't approve leave");
    }
    
    @Override
    public void approveExpenses() {
        throw new UnsupportedOperationException("Developers don't approve expenses");
    }
    
    @Override
    public void manageTeam() {
        throw new UnsupportedOperationException("Developers don't manage teams");
    }
    
    // ... 15 more stub methods throwing exceptions
    
    // Problems:
    // 1. Developer implements 25 methods, uses only 9
    // 2. 16 methods throw UnsupportedOperationException
    // 3. Every change to Worker affects all implementations
    // 4. Cannot tell from interface what Developer actually does
    // 5. Testing requires mocking 25 methods
    // 6. Violates ISP: Developer depends on methods it doesn't use
}

// Manager also forced to implement everything
public class Manager implements Worker {
    
    // Implements basic employee methods
    @Override
    public void work() {
        System.out.println("Managing and planning");
    }
    
    // Implements manager methods
    @Override
    public void conductPerformanceReview() {
        System.out.println("Conducting review");
    }
    
    // Forced to implement executive methods
    @Override
    public void setCompanyStrategy() {
        throw new UnsupportedOperationException("Managers don't set strategy");
    }
    
    @Override
    public void makeAcquisitionDecision() {
        throw new UnsupportedOperationException("Managers don't make acquisitions");
    }
    
    // Forced to implement HR methods
    @Override
    public void processPayroll() {
        throw new UnsupportedOperationException("Managers don't process payroll");
    }
    
    // ... more stub methods
}

// Client code becomes dangerous
public class EmployeeService {
    
    public void promoteToManager(Worker employee) {
        // Dangerous: employee might be Developer who can't conduct reviews!
        employee.conductPerformanceReview(); // 💥 May throw exception!
    }
}
```

#### ISP-Compliant Solution: Role-Based Interface Segregation

```java
// GOOD: Segregated interfaces by responsibility ✓

// ═══════════════════════════════════════════════════════════
// Core employee interface - everyone implements this
// ═══════════════════════════════════════════════════════════
public interface Employee {
    void clockIn();
    void clockOut();
    void work();
    void takeBreak();
    void eat();
    void attendMeeting();
    void submitTimesheet();
    void requestLeave();
    void updateProfile();
}

// ═══════════════════════════════════════════════════════════
// Management capabilities - only managers implement this
// ═══════════════════════════════════════════════════════════
public interface Manager {
    void conductPerformanceReview();
    void approveLeaveRequest();
    void approveExpenses();
    void manageTeam();
    void assignTasks();
}

// ═══════════════════════════════════════════════════════════
// Technical leadership - only tech leads implement this
// ═══════════════════════════════════════════════════════════
public interface TechnicalLead {
    void reviewCode();
    void approveArchitecture();
    void conductTechnicalInterview();
    void mentorDevelopers();
}

// ═══════════════════════════════════════════════════════════
// HR capabilities - only HR staff implement this
// ═══════════════════════════════════════════════════════════
public interface HumanResourcesStaff {
    void conductInterview();
    void makeHiringDecision();
    void processPayroll();
    void handleTermination();
}

// ═══════════════════════════════════════════════════════════
// Executive capabilities - only executives implement this
// ═══════════════════════════════════════════════════════════
public interface Executive {
    void setCompanyStrategy();
    void approveBudget();
    void makeAcquisitionDecision();
    void communicateVision();
}

// ═══════════════════════════════════════════════════════════
// Implementations: Compose only needed interfaces
// ═══════════════════════════════════════════════════════════

// Developer: Only Employee interface
public class Developer implements Employee {
    
    @Override
    public void clockIn() {
        System.out.println("Developer clocked in");
    }
    
    @Override
    public void work() {
        System.out.println("Writing code");
    }
    
    @Override
    public void takeBreak() {
        System.out.println("Taking break");
    }
    
    // Only implements 9 relevant methods
    // No stub methods throwing exceptions!
}

// Team Lead: Employee + Manager + TechnicalLead
public class TeamLead implements Employee, Manager, TechnicalLead {
    
    // Implements all Employee methods
    @Override
    public void work() {
        System.out.println("Coding and leading");
    }
    
    // Implements all Manager methods
    @Override
    public void conductPerformanceReview() {
        System.out.println("Conducting review");
    }
    
    @Override
    public void manageTeam() {
        System.out.println("Managing team");
    }
    
    // Implements all TechnicalLead methods
    @Override
    public void reviewCode() {
        System.out.println("Reviewing code");
    }
    
    @Override
    public void approveArchitecture() {
        System.out.println("Approving architecture");
    }
    
    // Only implements methods relevant to role
    // All methods have real implementations
}

// HR Specialist: Employee + HumanResourcesStaff
public class HRSpecialist implements Employee, HumanResourcesStaff {
    
    @Override
    public void work() {
        System.out.println("Processing HR tasks");
    }
    
    @Override
    public void conductInterview() {
        System.out.println("Conducting interview");
    }
    
    @Override
    public void processPayroll() {
        System.out.println("Processing payroll");
    }
    
    // Only relevant methods
}

// CTO: Employee + Manager + TechnicalLead + Executive
public class CTO implements Employee, Manager, TechnicalLead, Executive {
    
    @Override
    public void work() {
        System.out.println("Strategic planning and oversight");
    }
    
    @Override
    public void setCompanyStrategy() {
        System.out.println("Setting technical strategy");
    }
    
    @Override
    public void approveArchitecture() {
        System.out.println("Approving major architecture decisions");
    }
    
    // Implements all methods from all interfaces
    // All implementations are meaningful
}

// ═══════════════════════════════════════════════════════════
// Client code: Type-safe and focused
// ═══════════════════════════════════════════════════════════

public class EmployeeService {
    
    // Works with any employee
    public void processAttendance(Employee employee) {
        employee.clockIn();
        employee.work();
        employee.clockOut();
    }
    
    // Only accepts managers (type-safe!)
    public void conductReviews(Manager manager) {
        manager.conductPerformanceReview();
        manager.approveLeaveRequest();
        // Guaranteed to work - no exceptions!
    }
    
    // Only accepts technical leads
    public void reviewPullRequest(TechnicalLead lead) {
        lead.reviewCode();
        lead.approveArchitecture();
        // Type-safe, no runtime surprises
    }
}

// Benefits of ISP-compliant design:
// ✓ Developer implements only 9 methods (not 25)
// ✓ No UnsupportedOperationException
// ✓ No empty stub methods
// ✓ Type safety: Can't pass Developer to conductReviews()
// ✓ Clear role separation
// ✓ Easy to test (mock only relevant interfaces)
// ✓ Changes to Executive don't affect Developer
// ✓ Can compose capabilities flexibly
```

---

### 🟢 ISP in Repository Pattern

#### Fat Repository Violation

```java
// BAD: Fat repository interface with all possible operations ❌

public interface Repository<T, ID> {
    
    // Basic CRUD
    T save(T entity);
    Optional<T> findById(ID id);
    List<T> findAll();
    void delete(T entity);
    void deleteById(ID id);
    boolean existsById(ID id);
    long count();
    
    // Batch operations
    List<T> saveAll(Iterable<T> entities);
    void deleteAll(Iterable<T> entities);
    void deleteAllInBatch();
    
    // Paging and sorting
    Page<T> findAll(Pageable pageable);
    List<T> findAll(Sort sort);
    
    // Query by example
    Optional<T> findOne(Example<T> example);
    List<T> findAll(Example<T> example);
    
    // Flush operations
    void flush();
    T saveAndFlush(T entity);
    
    // Locking
    Optional<T> findByIdWithLock(ID id);
    
    // Refresh
    void refresh(T entity);
    
    // ... 20+ methods total
}

// Simple read-only repository forced to implement everything!
public class UserViewRepository implements Repository<UserView, Long> {
    
    @Override
    public UserView save(UserView entity) {
        throw new UnsupportedOperationException("Read-only repository");
    }
    
    @Override
    public void delete(UserView entity) {
        throw new UnsupportedOperationException("Read-only repository");
    }
    
    @Override
    public void flush() {
        throw new UnsupportedOperationException("Read-only repository");
    }
    
    // ... 15 more stub methods
    
    // Only 5 methods are actually used!
    @Override
    public Optional<UserView> findById(Long id) {
        // Real implementation
    }
    
    @Override
    public List<UserView> findAll() {
        // Real implementation
    }
}

// ISP violation: UserViewRepository depends on methods it doesn't use
```

#### ISP-Compliant Solution

```java
// GOOD: Segregated repository interfaces ✓

// ═══════════════════════════════════════════════════════════
// Base: Read operations only
// ═══════════════════════════════════════════════════════════
public interface ReadOnlyRepository<T, ID> {
    Optional<T> findById(ID id);
    List<T> findAll();
    boolean existsById(ID id);
    long count();
}

// ═══════════════════════════════════════════════════════════
// Extension: Add write operations
// ═══════════════════════════════════════════════════════════
public interface CrudRepository<T, ID> extends ReadOnlyRepository<T, ID> {
    T save(T entity);
    void delete(T entity);
    void deleteById(ID id);
}

// ═══════════════════════════════════════════════════════════
// Extension: Add batch operations
// ═══════════════════════════════════════════════════════════
public interface BatchRepository<T, ID> extends CrudRepository<T, ID> {
    List<T> saveAll(Iterable<T> entities);
    void deleteAll(Iterable<T> entities);
    void deleteAllInBatch();
}

// ═══════════════════════════════════════════════════════════
// Extension: Add paging and sorting
// ═══════════════════════════════════════════════════════════
public interface PagingRepository<T, ID> extends ReadOnlyRepository<T, ID> {
    Page<T> findAll(Pageable pageable);
    List<T> findAll(Sort sort);
}

// ═══════════════════════════════════════════════════════════
// Extension: Add JPA-specific operations
// ═══════════════════════════════════════════════════════════
public interface JpaRepository<T, ID> extends CrudRepository<T, ID>, 
                                              BatchRepository<T, ID>, 
                                              PagingRepository<T, ID> {
    void flush();
    T saveAndFlush(T entity);
    void refresh(T entity);
}

// ═══════════════════════════════════════════════════════════
// Implementations: Choose appropriate interface
// ═══════════════════════════════════════════════════════════

// Read-only view: Only ReadOnlyRepository
public interface UserViewRepository extends ReadOnlyRepository<UserView, Long> {
    // Only 4 methods to implement
    // No save/delete operations to stub out
    
    // Can add custom query methods
    List<UserView> findByDepartment(String department);
}

// Full entity: JpaRepository
public interface OrderRepository extends JpaRepository<Order, Long> {
    // Gets all CRUD, batch, paging operations
    List<Order> findByCustomerId(Long customerId);
}

// Simple CRUD: CrudRepository
public interface AuditLogRepository extends CrudRepository<AuditLog, Long> {
    // Basic CRUD, no need for paging or batch
}

// Read with paging: ReadOnlyRepository + PagingRepository
public interface ProductCatalogRepository extends ReadOnlyRepository<Product, Long>, 
                                                   PagingRepository<Product, Long> {
    // Read operations + paging
    // No write operations
}

// ═══════════════════════════════════════════════════════════
// Client code: Depends only on needed operations
// ═══════════════════════════════════════════════════════════

@Service
public class ReportService {
    
    // Depends only on read operations
    private final ReadOnlyRepository<UserView, Long> userViewRepository;
    
    public ReportService(ReadOnlyRepository<UserView, Long> userViewRepository) {
        this.userViewRepository = userViewRepository;
    }
    
    public Report generateReport() {
        List<UserView> users = userViewRepository.findAll();
        // Can't accidentally call save() - not in interface!
        return createReport(users);
    }
}

@Service
public class OrderService {
    
    // Needs full CRUD + batch operations
    private final BatchRepository<Order, Long> orderRepository;
    
    public void bulkCreateOrders(List<OrderDto> orders) {
        List<Order> entities = orders.stream()
            .map(Order::from)
            .collect(Collectors.toList());
        
        orderRepository.saveAll(entities); // Batch operation available
    }
}

// Benefits:
// ✓ UserViewRepository implements only 4 methods (not 20+)
// ✓ No UnsupportedOperationException
// ✓ Type safety: ReportService can't call save()
// ✓ Clear intent: Interface name tells you capabilities
// ✓ Flexible composition: Mix and match capabilities
// ✓ Changes to JpaRepository don't affect ReadOnlyRepository users
```

---

### 🔵 ISP in Notification System

```java
// BAD: Fat notification interface ❌

public interface NotificationService {
    void sendEmail(String to, String subject, String body);
    void sendEmailWithAttachment(String to, String subject, String body, byte[] attachment);
    void sendEmailWithTemplate(String to, String templateId, Map<String, Object> data);
    void sendBulkEmail(List<String> recipients, String subject, String body);
    
    void sendSms(String phone, String message);
    void sendBulkSms(List<String> phones, String message);
    
    void sendPushNotification(String deviceToken, String message, Map<String, String> data);
    void sendPushToTopic(String topic, String message);
    
    void sendSlackMessage(String channel, String message);
    void sendSlackDirectMessage(String userId, String message);
    
    void sendWebhook(String url, String payload);
    
    // 15+ methods!
}

// Mobile app only needs push notifications
public class MobileNotificationService implements NotificationService {
    
    @Override
    public void sendPushNotification(String deviceToken, String message, Map<String, String> data) {
        // Real implementation
    }
    
    @Override
    public void sendPushToTopic(String topic, String message) {
        // Real implementation
    }
    
    // Forced to implement 13 methods it doesn't use!
    @Override
    public void sendEmail(String to, String subject, String body) {
        throw new UnsupportedOperationException();
    }
    
    @Override
    public void sendSms(String phone, String message) {
        throw new UnsupportedOperationException();
    }
    
    // ... 11 more stub methods
}
```

#### ISP-Compliant Solution

```java
// GOOD: Segregated by notification channel ✓

// ═══════════════════════════════════════════════════════════
// Email notifications
// ═══════════════════════════════════════════════════════════
public interface EmailNotificationService {
    void send(String to, String subject, String body);
    void sendWithAttachment(String to, String subject, String body, byte[] attachment);
    void sendWithTemplate(String to, String templateId, Map<String, Object> data);
    void sendBulk(List<String> recipients, String subject, String body);
}

// ═══════════════════════════════════════════════════════════
// SMS notifications
// ═══════════════════════════════════════════════════════════
public interface SmsNotificationService {
    void send(String phone, String message);
    void sendBulk(List<String> phones, String message);
}

// ═══════════════════════════════════════════════════════════
// Push notifications
// ═══════════════════════════════════════════════════════════
public interface PushNotificationService {
    void sendToDevice(String deviceToken, String message, Map<String, String> data);
    void sendToTopic(String topic, String message);
}

// ═══════════════════════════════════════════════════════════
// Slack notifications
// ═══════════════════════════════════════════════════════════
public interface SlackNotificationService {
    void sendToChannel(String channel, String message);
    void sendDirectMessage(String userId, String message);
}

// ═══════════════════════════════════════════════════════════
// Webhook notifications
// ═══════════════════════════════════════════════════════════
public interface WebhookNotificationService {
    void send(String url, String payload);
}

// ═══════════════════════════════════════════════════════════
// Implementations: One per channel
// ═══════════════════════════════════════════════════════════

@Service
public class SendGridEmailService implements EmailNotificationService {
    
    @Autowired
    private SendGridClient sendGridClient;
    
    @Override
    public void send(String to, String subject, String body) {
        // Only implements email methods
        Mail mail = new Mail(from, to, subject, new Content("text/plain", body));
        sendGridClient.send(mail);
    }
    
    @Override
    public void sendWithTemplate(String to, String templateId, Map<String, Object> data) {
        // Template-based email
    }
    
    // Only 4 methods - all relevant
}

@Service
public class TwilioSmsService implements SmsNotificationService {
    
    @Autowired
    private TwilioClient twilioClient;
    
    @Override
    public void send(String phone, String message) {
        Message.creator(
            new PhoneNumber(phone),
            new PhoneNumber(fromNumber),
            message
        ).create();
    }
    
    @Override
    public void sendBulk(List<String> phones, String message) {
        // Bulk SMS
    }
    
    // Only 2 methods - both relevant
}

@Service
public class FirebasePushService implements PushNotificationService {
    
    @Autowired
    private FirebaseMessaging firebaseMessaging;
    
    @Override
    public void sendToDevice(String deviceToken, String message, Map<String, String> data) {
        Message msg = Message.builder()
            .setToken(deviceToken)
            .putAllData(data)
            .setNotification(Notification.builder().setBody(message).build())
            .build();
        
        firebaseMessaging.send(msg);
    }
    
    @Override
    public void sendToTopic(String topic, String message) {
        // Topic-based push
    }
    
    // Only 2 methods - both relevant
}

// ═══════════════════════════════════════════════════════════
// Client code: Depends only on needed channels
// ═══════════════════════════════════════════════════════════

@Service
public class OrderNotificationService {
    
    // Only depends on email and SMS
    private final EmailNotificationService emailService;
    private final SmsNotificationService smsService;
    
    @Autowired
    public OrderNotificationService(
        EmailNotificationService emailService,
        SmsNotificationService smsService
    ) {
        this.emailService = emailService;
        this.smsService = smsService;
    }
    
    public void notifyOrderConfirmation(Order order) {
        // Send email
        emailService.send(
            order.getCustomerEmail(),
            "Order Confirmation",
            "Your order #" + order.getId() + " is confirmed"
        );
        
        // Send SMS
        smsService.send(
            order.getCustomerPhone(),
            "Order confirmed: " + order.getId()
        );
    }
}

@Service
public class MobileAppNotificationService {
    
    // Only depends on push notifications
    private final PushNotificationService pushService;
    
    @Autowired
    public MobileAppNotificationService(PushNotificationService pushService) {
        this.pushService = pushService;
    }
    
    public void notifyNewMessage(String deviceToken, String message) {
        pushService.sendToDevice(deviceToken, message, Map.of("type", "message"));
    }
}

// Benefits:
// ✓ Each implementation focused on one channel
// ✓ MobileAppNotificationService doesn't depend on email/SMS
// ✓ OrderNotificationService doesn't depend on push/Slack
// ✓ No stub methods
// ✓ Easy to test (mock only used channels)
// ✓ Changes to Slack don't affect email clients
```

---

### 🟡 ISP in Authentication System

```java
// GOOD: Role-based interface segregation ✓

// ═══════════════════════════════════════════════════════════
// Basic authentication - all users need this
// ═══════════════════════════════════════════════════════════
public interface Authenticatable {
    boolean authenticate(String username, String password);
    String generateToken(User user);
    boolean validateToken(String token);
}

// ═══════════════════════════════════════════════════════════
// Multi-factor authentication - optional capability
// ═══════════════════════════════════════════════════════════
public interface MultiFactorAuthenticatable {
    void enableTwoFactor(User user);
    void disableTwoFactor(User user);
    boolean verifyTwoFactorCode(User user, String code);
    List<String> generateBackupCodes(User user);
}

// ═══════════════════════════════════════════════════════════
// OAuth integration - external auth providers
// ═══════════════════════════════════════════════════════════
public interface OAuthAuthenticatable {
    String getAuthorizationUrl(String provider);
    User authenticateWithOAuth(String provider, String code);
    void linkOAuthAccount(User user, String provider, String oauthId);
}

// ═══════════════════════════════════════════════════════════
// Session management - web applications
// ═══════════════════════════════════════════════════════════
public interface SessionManageable {
    Session createSession(User user);
    void invalidateSession(String sessionId);
    Optional<Session> getSession(String sessionId);
    void extendSession(String sessionId);
}

// ═══════════════════════════════════════════════════════════
// API key authentication - service-to-service
// ═══════════════════════════════════════════════════════════
public interface ApiKeyAuthenticatable {
    String generateApiKey(Application application);
    void revokeApiKey(String apiKey);
    Optional<Application> validateApiKey(String apiKey);
}

// ═══════════════════════════════════════════════════════════
// Implementations compose needed interfaces
// ═══════════════════════════════════════════════════════════

// Basic auth service: Just password authentication
@Service
public class BasicAuthService implements Authenticatable {
    
    @Override
    public boolean authenticate(String username, String password) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new AuthenticationException("Invalid credentials"));
        
        return passwordEncoder.matches(password, user.getPasswordHash());
    }
    
    @Override
    public String generateToken(User user) {
        return jwtService.generateToken(user);
    }
    
    @Override
    public boolean validateToken(String token) {
        return jwtService.validateToken(token);
    }
}

// Full-featured auth service: All capabilities
@Service
public class EnterpriseAuthService implements Authenticatable, 
                                              MultiFactorAuthenticatable, 
                                              OAuthAuthenticatable, 
                                              SessionManageable {
    
    // Implements all methods from all interfaces
    // Used by enterprise customers needing all features
}

// API auth service: API key only
@Service
public class ApiAuthService implements ApiKeyAuthenticatable {
    
    @Override
    public String generateApiKey(Application application) {
        String apiKey = UUID.randomUUID().toString();
        application.setApiKey(hashApiKey(apiKey));
        applicationRepository.save(application);
        return apiKey;
    }
    
    @Override
    public Optional<Application> validateApiKey(String apiKey) {
        String hash = hashApiKey(apiKey);
        return applicationRepository.findByApiKeyHash(hash);
    }
    
    // Only API key methods - no password/OAuth complexity
}

// Benefits:
// ✓ BasicAuthService: 3 methods (not 15+)
// ✓ ApiAuthService: 3 methods (no password/session logic)
// ✓ Clients depend only on capabilities they use
// ✓ Easy to add new auth methods without affecting existing
```

---

## ────────────────────────────────────
## 3️⃣ ISP Design Guidelines
## ────────────────────────────────────

### Interface Design Checklist

**Signs of ISP violation:**
□ Interface has > 10 methods
□ Implementations throw UnsupportedOperationException
□ Implementations have empty method bodies
□ Implementations with many no-op methods
□ Clients mock 20 methods but use 3
□ Interface name has "Manager", "Service", "Handler"
□ Multiple unrelated responsibilities in one interface

**How to apply ISP:**
1. **Group by capability**: Email, SMS, Push (not "Notification")
2. **Role-based interfaces**: Employee, Manager, Executive
3. **Read vs Write**: ReadRepository, WriteRepository
4. **Core vs Optional**: BasicAuth, MultiFactorAuth
5. **Compose interfaces**: Class implements multiple small interfaces

### Interface Sizing Guidelines

```
Ideal interface sizes:
• 1-3 methods: Highly focused (Comparable, Runnable, Callable)
• 4-7 methods: Well-focused (List core methods)
• 8-10 methods: Yellow flag (consider splitting)
• 11+ methods: Red flag (likely ISP violation)

Examples from Java:
✓ Runnable: 1 method (run)
✓ Comparable: 1 method (compareTo)
✓ Iterator: 3 methods (hasNext, next, remove)
✓ Map: 11 methods (arguably too large, but necessary)
✗ Worker with 25 methods: Clear violation
```

### Composition Over Huge Interfaces

```java
// ❌ DON'T: One huge interface
public interface SuperWorker {
    // 30 methods covering everything
}

// ✓ DO: Multiple focused interfaces
public interface Employee { /* 5 methods */ }
public interface Manager { /* 4 methods */ }
public interface TechnicalLead { /* 5 methods */ }

// Compose as needed
public class EngineeringManager implements Employee, Manager, TechnicalLead {
    // Gets all 14 methods
    // All are relevant to this role
}
```

---

## ────────────────────────────────────
## 4️⃣ Real-World Production Examples
## ────────────────────────────────────

### Example 1: Spring Data - Repository Hierarchy

Spring Data perfectly demonstrates ISP:

```java
// Base: Minimal interface
public interface Repository<T, ID> {
    // Marker interface - no methods!
}

// Add read operations
public interface CrudRepository<T, ID> extends Repository<T, ID> {
    <S extends T> S save(S entity);
    Optional<T> findById(ID id);
    Iterable<T> findAll();
    long count();
    void deleteById(ID id);
    // 8 methods total
}

// Add paging - optional capability
public interface PagingAndSortingRepository<T, ID> extends CrudRepository<T, ID> {
    Iterable<T> findAll(Sort sort);
    Page<T> findAll(Pageable pageable);
    // Adds 2 methods
}

// Add JPA-specific operations - optional
public interface JpaRepository<T, ID> extends PagingAndSortingRepository<T, ID> {
    void flush();
    <S extends T> List<S> saveAllAndFlush(Iterable<S> entities);
    void deleteInBatch(Iterable<T> entities);
    // Adds 3 more methods
}

// Usage: Choose appropriate level
public interface UserRepository extends CrudRepository<User, Long> {
    // Gets basic CRUD - 8 methods
}

public interface OrderRepository extends JpaRepository<Order, Long> {
    // Gets everything - 13 methods
}

// ISP compliance: Clients depend only on needed operations
```

### Example 2: Java Collections - List vs RandomAccess

```java
// List interface: Sequential access
public interface List<E> extends Collection<E> {
    E get(int index);
    E set(int index, E element);
    void add(int index, E element);
    E remove(int index);
    int indexOf(Object o);
    // ... other methods
}

// RandomAccess: Marker interface for optimization hint
public interface RandomAccess {
    // No methods - just a marker
}

// ArrayList: Fast random access
public class ArrayList<E> implements List<E>, RandomAccess {
    // get(index) is O(1)
}

// LinkedList: Sequential access only
public class LinkedList<E> implements List<E> {
    // get(index) is O(n)
    // Does NOT implement RandomAccess
}

// Client code can optimize based on interface
public static <T> void processElements(List<T> list) {
    if (list instanceof RandomAccess) {
        // Use index-based iteration (fast)
        for (int i = 0; i < list.size(); i++) {
            process(list.get(i));
        }
    } else {
        // Use iterator (fast for linked lists)
        for (T element : list) {
            process(element);
        }
    }
}

// ISP: RandomAccess is separate optional capability
```

### Example 3: AWS SDK - Service Client Interfaces

```java
// AWS S3: Segregated by operation type

// Core S3 operations
public interface AmazonS3 {
    PutObjectResult putObject(String bucket, String key, File file);
    S3Object getObject(String bucket, String key);
    void deleteObject(String bucket, String key);
    // ... basic operations
}

// Presigned URL generation - optional
public interface AmazonS3Presigner {
    URL generatePresignedUrl(GeneratePresignedUrlRequest request);
}

// Encryption - optional
public interface AmazonS3Encryption extends AmazonS3 {
    // Encrypted operations
}

// Transfer acceleration - optional
public interface AmazonS3TransferAcceleration {
    void setTransferAcceleration(String bucket, boolean enabled);
}

// Clients use only needed capabilities
@Service
public class FileStorageService {
    
    private final AmazonS3 s3Client; // Basic operations only
    
    public void uploadFile(String bucket, String key, File file) {
        s3Client.putObject(bucket, key, file);
    }
}

@Service
public class SecureStorageService {
    
    private final AmazonS3Encryption s3Client; // With encryption
    
    public void uploadEncrypted(String bucket, String key, File file) {
        s3Client.putObject(bucket, key, file);
        // Automatically encrypted
    }
}
```

---

## ────────────────────────────────────
## 5️⃣ Interview Q&A (Behavioral Questions)
## ────────────────────────────────────

### Q1: "What is Interface Segregation Principle?"

**Answer:** *"Interface Segregation Principle states that no client should be forced to depend on methods it doesn't use. In other words, many specific interfaces are better than one general interface.*

*Classic example: Worker interface with 25 methods covering employees, managers, HR, and executives. A Developer class forced to implement this interface must provide 25 methods but only uses 9. The other 16 methods throw UnsupportedOperationException—ISP violation.*

*Solution is splitting into focused interfaces: Employee (9 methods), Manager (5 methods), TechnicalLead (4 methods), Executive (4 methods). Developer implements only Employee. TeamLead implements Employee + Manager + TechnicalLead. Each class implements only relevant methods—no stub methods, no exceptions.*

*ISP prevents 'fat interfaces' that do everything. Benefits: cleaner dependencies, easier testing, better composition, changes isolated to relevant clients."*

### Q2: "Give a real example where you applied ISP"

**Answer:** *"At my company, we had NotificationService interface with 15 methods: email, SMS, push, Slack, webhooks. Our mobile app only needed push notifications but was forced to depend on entire interface with 13 irrelevant methods.*

*Testing was painful—mocking 15 methods to test push notification logic. Worse, changes to email template method forced recompilation and redeployment of mobile app despite not using email.*

*I refactored into segregated interfaces: EmailNotificationService, SmsNotificationService, PushNotificationService, SlackNotificationService. Each had 2-4 methods.*

*Mobile app changed to depend only on PushNotificationService—2 methods instead of 15. Testing became trivial—mock 2 methods. Deployment decoupled—email changes don't affect mobile app. OrderService uses Email + SMS. SlackIntegrationService uses only Slack.*

*Result: Test setup went from 100 lines to 10 lines. Build times improved—fewer dependencies. Team velocity increased—changes isolated to relevant services."*

### Q3: "How do you identify ISP violations in code reviews?"

**Answer:** *"I look for five red flags:*

*First, interfaces with 10+ methods. If interface has 15 methods, likely doing too much. I count methods—over 10 is yellow flag, over 15 is red flag.*

*Second, UnsupportedOperationException in implementations. That's smoking gun—class forced to implement methods it doesn't support. ISP violation guaranteed.*

*Third, empty method bodies or no-op implementations. Methods that do nothing indicate interface has irrelevant methods.*

*Fourth, clients mocking 20 methods but using 3 in tests. If test setup is 100 lines mocking everything but test uses 3 methods, interface is too large.*

*Fifth, interface names with 'Manager', 'Service', 'Handler'—these often become dumping grounds for unrelated methods.*

*When I spot violations, I suggest: Group methods by capability. Split into multiple interfaces. Use interface composition. Example: NotificationService → EmailService + SmsService + PushService."*

### Q4: "Doesn't ISP create too many interfaces?"

**Answer:** *"It creates more interfaces, but each is simpler and more focused. Let me compare:*

*One fat interface approach: NotificationService with 15 methods. Every client depends on all 15 methods. Changes to any method affect all clients. Tests mock 15 methods. 200 lines of interface definition.*

*ISP approach: 5 interfaces × 3 methods = 15 total methods. Same functionality, better organized. Client depends on 1-2 interfaces (3-6 methods). Changes affect only relevant clients. Tests mock 3 methods. 5 × 40 lines = 200 lines total.*

*More files? Yes. But each file is simpler. Developer opens EmailNotificationService—3 methods, clear purpose. Opens fat NotificationService—15 methods, overwhelming.*

*Real benefit: selective dependencies. Mobile app doesn't compile email code. Backend doesn't include push notification dependencies. ISP enables granular dependency management.*

*Java's Collections Framework has 20+ interfaces. That's a lot, but enables precise contracts. List vs Set vs Queue—each focused. Alternative is one Collection interface with 50 methods where half don't apply to each implementation. More interfaces > fat interfaces."*

### Q5: "How does ISP relate to Single Responsibility Principle?"

**Answer:** *"ISP is client-side view of SRP. SRP says each class has one responsibility. ISP says each interface has one purpose from client perspective.*

*Example: PaymentProcessor class. SRP says don't combine payment processing with email notifications in one class. ISP says don't force all payment processors to implement refund capabilities if some don't support refunds.*

*Without ISP, we might have PaymentProcessor interface with process() and refund() methods. StripeProcessor implements both. GiftCardProcessor implements process() but throws UnsupportedOperationException for refund()—gift cards aren't refundable.*

*ISP solution: PaymentProcessor interface with process(), separate RefundablePaymentProcessor interface with refund(). StripeProcessor implements both. GiftCardProcessor implements only PaymentProcessor. Type system enforces correctness.*

*Both principles promote focused design. SRP: focused classes. ISP: focused interfaces. Together: clean architecture with clear boundaries and dependencies."*

### Q6: "When is a large interface acceptable?"

**Answer:** *"Large interfaces are acceptable when methods are genuinely cohesive and most implementations use most methods.*

*Example: java.util.Map has 11 methods. That's borderline large, but all methods are core map operations: put, get, remove, containsKey, size, isEmpty, etc. Every Map implementation uses almost all methods. Splitting Map into ReadMap and WriteMap would create artificial separation—maps inherently support both.*

*Another example: JDBC ResultSet has 50+ methods. That's huge, but necessary—different data types (getString, getInt, getDate), different access patterns (next, previous), metadata. Splitting would create hundreds of tiny interfaces.*

*I accept large interface when:*
*1. Methods are highly cohesive (all about same concept)
*2. Most implementations use 80%+ of methods
*3. Splitting creates more confusion than clarity
*4. Interface is stable (not frequently changing)*

*But Worker interface with employee + manager + HR + executive methods? Not cohesive. Only 30% of methods used by each implementation. Splitting improves clarity. That's ISP violation worth fixing."*

---

## 🔟 Why & How Summary

### Why ISP Matters

**Clean Dependencies:**
- Clients depend only on methods they actually use
- No unnecessary coupling to irrelevant functionality
- Changes affect fewer clients
- Build times faster (fewer dependencies to recompile)

**Better Testing:**
- Mock only relevant methods (3 vs 15)
- Test setup simpler (10 lines vs 100)
- Tests focus on actual behavior
- No confusion about unused methods

**Flexible Composition:**
- Classes implement multiple small interfaces
- Mix and match capabilities
- Role-based access control natural
- Feature flags easy (optional interfaces)

**Business Value:**
- Faster development (clear contracts)
- Lower maintenance costs (isolated changes)
- Better team scaling (parallel development)
- Easier API evolution (add capabilities without breaking clients)

### How to Apply ISP

**Design Phase:**
1. Group methods by capability or role
2. Ask: "Do all implementations need all methods?"
3. If answer is "no", split interface
4. Aim for 3-7 methods per interface
5. Use interface composition for rich capabilities

**Refactoring:**
1. Identify fat interfaces (10+ methods)
2. Group methods by related capability
3. Extract focused interfaces
4. Update implementations to compose interfaces
5. Update clients to depend on specific interfaces

**Prevention:**
1. Start with focused interfaces
2. Resist adding "just one more method"
3. Code reviews check interface size
4. Question methods with few implementations
5. Use composition over accumulation

### Interview Red Flags

🚫 "ISP creates interface explosion"
✅ "ISP creates focused, composable interfaces that reduce coupling"

🚫 "One interface is simpler"
✅ "One fat interface forces all clients to depend on everything"

🚫 "UnsupportedOperationException is acceptable"
✅ "UnsupportedOperationException indicates wrong interface design"

### Final Sound Bite

*"Interface Segregation Principle prevents fat interfaces that force clients to depend on methods they don't use. Instead of one NotificationService with 15 methods (email, SMS, push, Slack, webhooks), create five focused interfaces with 2-4 methods each.*

*Developer implements only Employee interface (9 methods), not Worker interface (25 methods where 16 throw UnsupportedOperationException). Mobile app depends on PushNotificationService (2 methods), not entire NotificationService (15 methods).*

*ISP enables clean dependencies, simpler testing, and flexible composition. Classes implement multiple small interfaces to compose capabilities. TeamLead implements Employee + Manager + TechnicalLead—all methods relevant, no stubs.*

*At scale, ISP means changes to email don't force recompilation of mobile app. Tests mock 3 methods instead of 15. New capabilities added as new interfaces, not bloating existing ones. ISP is insurance against dependency bloat and forced coupling."*

---

**Last Updated**: January 2026  
**Target Audience**: Senior Backend Engineers (7+ YOE)  
**Interview Level**: FAANG L5/L6 (Senior/Staff)
