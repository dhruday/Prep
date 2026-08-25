# 181. Abstract Factory Pattern

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Abstract Factory Pattern** is a creational design pattern that provides an interface for creating **families of related or dependent objects** without specifying their concrete classes. Unlike the regular Factory Pattern (which creates one type of object), Abstract Factory creates **multiple related products** that belong together.

### **What It Is**

**Core Concept:**
The Abstract Factory Pattern lets you produce families of related objects without coupling your code to specific classes. It's like a "factory of factories."

```java
// Without Abstract Factory (Mixing incompatible objects)
Button windowsButton = new WindowsButton();
Checkbox macCheckbox = new MacCheckbox();  // ❌ Inconsistent UI!

// With Abstract Factory (Ensures consistency)
GUIFactory factory = new WindowsFactory();
Button button = factory.createButton();      // Windows button
Checkbox checkbox = factory.createCheckbox(); // Windows checkbox
// ✓ All components match!
```

**Key Components:**
1. **Abstract Factory:** Interface declaring methods to create each product
2. **Concrete Factory:** Implements abstract factory to create specific product variants
3. **Abstract Product:** Interface for each type of product
4. **Concrete Product:** Specific implementations of products
5. **Client:** Uses factories and products through abstract interfaces

---

### **Why It Exists**

**Problem It Solves:**

```java
// BAD: Client creates mismatched components
public class Application {
    public void renderUI() {
        // Developer accidentally mixes Windows and Mac components
        Button button = new WindowsButton();
        TextField textField = new MacTextField();
        Checkbox checkbox = new WindowsCheckbox();
        
        // Result: UI looks inconsistent (mixed themes)
        button.render();      // Windows style
        textField.render();   // Mac style
        checkbox.render();    // Windows style
        
        // Problems:
        // ❌ Components don't match visually
        // ❌ Easy to make mistakes
        // ❌ No compile-time guarantee of consistency
        // ❌ Hard to switch entire theme
    }
}
```

**Solution with Abstract Factory:**

```java
// GOOD: Factory ensures all components match
public class Application {
    private final GUIFactory factory;
    
    public Application(GUIFactory factory) {
        this.factory = factory;
    }
    
    public void renderUI() {
        // Factory creates matching components
        Button button = factory.createButton();
        TextField textField = factory.createTextField();
        Checkbox checkbox = factory.createCheckbox();
        
        // All components guaranteed to match
        button.render();      // All Windows or all Mac
        textField.render();
        checkbox.render();
        
        // Benefits:
        // ✓ Components always consistent
        // ✓ Switch theme by changing factory
        // ✓ Compile-time type safety
        // ✓ Easy to add new themes
    }
}

// Usage
GUIFactory windowsFactory = new WindowsFactory();
Application app = new Application(windowsFactory);
app.renderUI();  // Renders complete Windows-themed UI

// Switch to Mac theme
GUIFactory macFactory = new MacFactory();
Application app2 = new Application(macFactory);
app2.renderUI();  // Renders complete Mac-themed UI
```

---

### **When to Use Abstract Factory**

**Perfect Use Cases:**

1. **UI Themes/Skins**
   - Windows, Mac, Linux themes
   - Dark mode, light mode
   - Ensure all UI components match

2. **Cross-Platform Applications**
   - Desktop, mobile, web variants
   - Platform-specific implementations
   - Consistent API across platforms

3. **Database Abstraction Layers**
   - Connection, Query Builder, Transaction Manager
   - PostgreSQL family, MySQL family, MongoDB family
   - All components must be compatible

4. **Cloud Provider SDKs**
   - AWS, GCP, Azure resources
   - Storage, Compute, Networking
   - Switch providers without code changes

5. **Testing Frameworks**
   - Real implementations vs Mock implementations
   - All mocks must be compatible
   - Easy to switch between real and test

**When NOT to Use:**

- Products are independent (use Simple Factory)
- Only one product type (use Factory Method)
- Products don't need to be compatible
- Overkill for simple scenarios

---

### **Role in Large-Scale Distributed Systems**

**Scenario: Multi-Cloud Strategy**

```java
// Large enterprise runs on multiple cloud providers
// Need to abstract cloud-specific APIs

// Abstract Factory for cloud resources
public interface CloudFactory {
    StorageService createStorage();
    ComputeService createCompute();
    DatabaseService createDatabase();
    QueueService createQueue();
}

// AWS implementation
@Component
@ConditionalOnProperty(name = "cloud.provider", havingValue = "aws")
public class AWSFactory implements CloudFactory {
    
    @Override
    public StorageService createStorage() {
        return new S3StorageService();
    }
    
    @Override
    public ComputeService createCompute() {
        return new EC2ComputeService();
    }
    
    @Override
    public DatabaseService createDatabase() {
        return new RDSService();
    }
    
    @Override
    public QueueService createQueue() {
        return new SQSService();
    }
}

// GCP implementation
@Component
@ConditionalOnProperty(name = "cloud.provider", havingValue = "gcp")
public class GCPFactory implements CloudFactory {
    
    @Override
    public StorageService createStorage() {
        return new CloudStorageService();
    }
    
    @Override
    public ComputeService createCompute() {
        return new ComputeEngineService();
    }
    
    @Override
    public DatabaseService createDatabase() {
        return new CloudSQLService();
    }
    
    @Override
    public QueueService createQueue() {
        return new PubSubService();
    }
}

// Application uses abstract interfaces
@Service
public class ApplicationService {
    
    private final CloudFactory cloudFactory;
    
    public ApplicationService(CloudFactory cloudFactory) {
        this.cloudFactory = cloudFactory;
    }
    
    public void deployApplication() {
        // All services guaranteed to be from same provider
        StorageService storage = cloudFactory.createStorage();
        ComputeService compute = cloudFactory.createCompute();
        DatabaseService database = cloudFactory.createDatabase();
        QueueService queue = cloudFactory.createQueue();
        
        // Deploy application (works on any cloud)
        storage.uploadArtifacts();
        compute.provisionServers();
        database.createSchema();
        queue.setupTopics();
    }
}

// Configuration (switch provider without code changes)
# application.yml
cloud:
  provider: aws  # Change to 'gcp' or 'azure'
```

**Benefits at Scale:**
- **Vendor Lock-in Prevention:** Switch cloud providers in configuration
- **Multi-Region Deployment:** Different providers in different regions
- **Cost Optimization:** Route to cheapest provider dynamically
- **Disaster Recovery:** Failover to different provider automatically
- **Compliance:** Use specific provider per data residency requirements

---

### **Business Impact**

**Development Velocity:**
```
Without Abstract Factory:
- Add new cloud provider: Change 50+ files
- Risk: Breaking existing providers
- Time: 2 weeks (implementation + testing)
- Testing: Full regression across all providers

With Abstract Factory:
- Add new cloud provider: Implement one factory class
- Risk: Isolated (existing providers unchanged)
- Time: 2 days (one factory implementation)
- Testing: Only new provider needs testing

Impact: 5x faster new provider integration
```

**Production Flexibility:**
```
Real scenario (E-commerce company):

AWS outage → Need to failover to GCP

Without Abstract Factory:
- Emergency code changes to swap AWS API calls
- Deploy under pressure (30+ files changed)
- High risk of bugs
- Downtime: 2-4 hours
- Revenue loss: $100K-$200K

With Abstract Factory:
- Configuration change: cloud.provider=gcp
- Restart services
- No code changes
- Downtime: 5 minutes
- Revenue loss: $4K

Savings: $96K-$196K per incident
```

**Cost Optimization:**
```
Multi-cloud cost arbitrage:

Strategy: Route workloads to cheapest provider

Implementation:
@Component
public class CostOptimizingCloudFactory implements CloudFactory {
    private final AWSFactory awsFactory;
    private final GCPFactory gcpFactory;
    private final CostAnalyzer costAnalyzer;
    
    @Override
    public StorageService createStorage() {
        // Route to cheapest storage provider
        if (costAnalyzer.isAWSCheaper("storage")) {
            return awsFactory.createStorage();
        } else {
            return gcpFactory.createStorage();
        }
    }
}

Result:
- Storage costs: 30% reduction ($150K/year)
- Compute costs: 25% reduction ($200K/year)
- Total savings: $350K/year
- Implementation cost: $50K (6-month ROI)
```

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Abstract Factory vs Factory Method**

**Key Difference:**
- **Factory Method:** Creates **ONE** type of object (polymorphic constructors)
- **Abstract Factory:** Creates **FAMILIES** of related objects (product suites)

```java
// Factory Method: Creates one type
public abstract class DocumentEditor {
    protected abstract Document createDocument();  // One factory method
}

// Abstract Factory: Creates multiple related types
public interface GUIFactory {
    Button createButton();        // Multiple factory methods
    TextField createTextField();  // for creating product family
    Checkbox createCheckbox();
}
```

---

### **Complete Implementation: Database Abstraction Layer**

#### **Step 1: Define Abstract Products**

```java
// Abstract product: Connection
public interface Connection {
    void connect();
    void disconnect();
    void executeQuery(String query);
}

// Abstract product: QueryBuilder
public interface QueryBuilder {
    QueryBuilder select(String... columns);
    QueryBuilder from(String table);
    QueryBuilder where(String condition);
    String build();
}

// Abstract product: TransactionManager
public interface TransactionManager {
    void beginTransaction();
    void commit();
    void rollback();
}
```

---

#### **Step 2: Define Abstract Factory**

```java
// Abstract Factory: Creates family of database components
public interface DatabaseFactory {
    Connection createConnection();
    QueryBuilder createQueryBuilder();
    TransactionManager createTransactionManager();
}
```

---

#### **Step 3: Implement Concrete Products (PostgreSQL Family)**

```java
// Concrete product: PostgreSQL Connection
public class PostgreSQLConnection implements Connection {
    
    private java.sql.Connection jdbcConnection;
    
    @Override
    public void connect() {
        try {
            String url = "jdbc:postgresql://localhost:5432/mydb";
            this.jdbcConnection = DriverManager.getConnection(url, "user", "pass");
            System.out.println("Connected to PostgreSQL");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to connect to PostgreSQL", e);
        }
    }
    
    @Override
    public void disconnect() {
        try {
            if (jdbcConnection != null && !jdbcConnection.isClosed()) {
                jdbcConnection.close();
                System.out.println("Disconnected from PostgreSQL");
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to disconnect", e);
        }
    }
    
    @Override
    public void executeQuery(String query) {
        System.out.println("Executing PostgreSQL query: " + query);
        // PostgreSQL-specific query execution
    }
}

// Concrete product: PostgreSQL QueryBuilder
public class PostgreSQLQueryBuilder implements QueryBuilder {
    
    private StringBuilder query = new StringBuilder();
    
    @Override
    public QueryBuilder select(String... columns) {
        query.append("SELECT ").append(String.join(", ", columns));
        return this;
    }
    
    @Override
    public QueryBuilder from(String table) {
        query.append(" FROM ").append(table);
        return this;
    }
    
    @Override
    public QueryBuilder where(String condition) {
        query.append(" WHERE ").append(condition);
        return this;
    }
    
    @Override
    public String build() {
        // PostgreSQL-specific: Add RETURNING clause support
        String finalQuery = query.toString();
        System.out.println("Built PostgreSQL query: " + finalQuery);
        return finalQuery;
    }
}

// Concrete product: PostgreSQL TransactionManager
public class PostgreSQLTransactionManager implements TransactionManager {
    
    private java.sql.Connection connection;
    
    public PostgreSQLTransactionManager(java.sql.Connection connection) {
        this.connection = connection;
    }
    
    @Override
    public void beginTransaction() {
        try {
            connection.setAutoCommit(false);
            System.out.println("PostgreSQL transaction started");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to begin transaction", e);
        }
    }
    
    @Override
    public void commit() {
        try {
            connection.commit();
            System.out.println("PostgreSQL transaction committed");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to commit", e);
        }
    }
    
    @Override
    public void rollback() {
        try {
            connection.rollback();
            System.out.println("PostgreSQL transaction rolled back");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to rollback", e);
        }
    }
}
```

---

#### **Step 4: Implement Concrete Products (MySQL Family)**

```java
// Concrete product: MySQL Connection
public class MySQLConnection implements Connection {
    
    private java.sql.Connection jdbcConnection;
    
    @Override
    public void connect() {
        try {
            String url = "jdbc:mysql://localhost:3306/mydb";
            this.jdbcConnection = DriverManager.getConnection(url, "user", "pass");
            System.out.println("Connected to MySQL");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to connect to MySQL", e);
        }
    }
    
    @Override
    public void disconnect() {
        try {
            if (jdbcConnection != null && !jdbcConnection.isClosed()) {
                jdbcConnection.close();
                System.out.println("Disconnected from MySQL");
            }
        } catch (SQLException e) {
            throw new RuntimeException("Failed to disconnect", e);
        }
    }
    
    @Override
    public void executeQuery(String query) {
        System.out.println("Executing MySQL query: " + query);
        // MySQL-specific query execution
    }
}

// Concrete product: MySQL QueryBuilder
public class MySQLQueryBuilder implements QueryBuilder {
    
    private StringBuilder query = new StringBuilder();
    
    @Override
    public QueryBuilder select(String... columns) {
        query.append("SELECT ").append(String.join(", ", columns));
        return this;
    }
    
    @Override
    public QueryBuilder from(String table) {
        query.append(" FROM ").append(table);
        return this;
    }
    
    @Override
    public QueryBuilder where(String condition) {
        query.append(" WHERE ").append(condition);
        return this;
    }
    
    @Override
    public String build() {
        // MySQL-specific: Add LIMIT clause support
        String finalQuery = query.toString();
        System.out.println("Built MySQL query: " + finalQuery);
        return finalQuery;
    }
}

// Concrete product: MySQL TransactionManager
public class MySQLTransactionManager implements TransactionManager {
    
    private java.sql.Connection connection;
    
    public MySQLTransactionManager(java.sql.Connection connection) {
        this.connection = connection;
    }
    
    @Override
    public void beginTransaction() {
        try {
            connection.setAutoCommit(false);
            System.out.println("MySQL transaction started");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to begin transaction", e);
        }
    }
    
    @Override
    public void commit() {
        try {
            connection.commit();
            System.out.println("MySQL transaction committed");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to commit", e);
        }
    }
    
    @Override
    public void rollback() {
        try {
            connection.rollback();
            System.out.println("MySQL transaction rolled back");
        } catch (SQLException e) {
            throw new RuntimeException("Failed to rollback", e);
        }
    }
}
```

---

#### **Step 5: Implement Concrete Factories**

```java
// Concrete Factory: PostgreSQL
public class PostgreSQLFactory implements DatabaseFactory {
    
    @Override
    public Connection createConnection() {
        return new PostgreSQLConnection();
    }
    
    @Override
    public QueryBuilder createQueryBuilder() {
        return new PostgreSQLQueryBuilder();
    }
    
    @Override
    public TransactionManager createTransactionManager() {
        // In real implementation, would pass actual JDBC connection
        return new PostgreSQLTransactionManager(null);
    }
}

// Concrete Factory: MySQL
public class MySQLFactory implements DatabaseFactory {
    
    @Override
    public Connection createConnection() {
        return new MySQLConnection();
    }
    
    @Override
    public QueryBuilder createQueryBuilder() {
        return new MySQLQueryBuilder();
    }
    
    @Override
    public TransactionManager createTransactionManager() {
        return new MySQLTransactionManager(null);
    }
}
```

---

#### **Step 6: Client Code**

```java
// Client uses abstract interfaces
public class DataAccessLayer {
    
    private final DatabaseFactory factory;
    
    public DataAccessLayer(DatabaseFactory factory) {
        this.factory = factory;
    }
    
    public void performDatabaseOperations() {
        // Create family of related objects
        Connection connection = factory.createConnection();
        QueryBuilder queryBuilder = factory.createQueryBuilder();
        TransactionManager transactionManager = factory.createTransactionManager();
        
        // All components are guaranteed to be compatible
        connection.connect();
        
        transactionManager.beginTransaction();
        
        String query = queryBuilder
            .select("id", "name", "email")
            .from("users")
            .where("active = true")
            .build();
        
        connection.executeQuery(query);
        
        transactionManager.commit();
        
        connection.disconnect();
    }
}

// Usage
public class Application {
    public static void main(String[] args) {
        // PostgreSQL
        DatabaseFactory postgresFactory = new PostgreSQLFactory();
        DataAccessLayer dalPostgres = new DataAccessLayer(postgresFactory);
        dalPostgres.performDatabaseOperations();
        
        System.out.println("\n--- Switching to MySQL ---\n");
        
        // MySQL (same client code, different factory)
        DatabaseFactory mysqlFactory = new MySQLFactory();
        DataAccessLayer dalMySQL = new DataAccessLayer(mysqlFactory);
        dalMySQL.performDatabaseOperations();
    }
}

// Output:
// Connected to PostgreSQL
// PostgreSQL transaction started
// Built PostgreSQL query: SELECT id, name, email FROM users WHERE active = true
// Executing PostgreSQL query: SELECT id, name, email FROM users WHERE active = true
// PostgreSQL transaction committed
// Disconnected from PostgreSQL
//
// --- Switching to MySQL ---
//
// Connected to MySQL
// MySQL transaction started
// Built MySQL query: SELECT id, name, email FROM users WHERE active = true
// Executing MySQL query: SELECT id, name, email FROM users WHERE active = true
// MySQL transaction committed
// Disconnected from MySQL
```

---

### **Spring Boot Integration**

```java
// Configuration
@Configuration
public class DatabaseConfig {
    
    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "postgresql")
    public DatabaseFactory postgresFactory() {
        return new PostgreSQLFactory();
    }
    
    @Bean
    @ConditionalOnProperty(name = "database.type", havingValue = "mysql")
    public DatabaseFactory mysqlFactory() {
        return new MySQLFactory();
    }
}

// Service using factory
@Service
public class UserService {
    
    private final DatabaseFactory databaseFactory;
    
    public UserService(DatabaseFactory databaseFactory) {
        this.databaseFactory = databaseFactory;
    }
    
    public List<User> findActiveUsers() {
        Connection connection = databaseFactory.createConnection();
        QueryBuilder queryBuilder = databaseFactory.createQueryBuilder();
        
        connection.connect();
        
        String query = queryBuilder
            .select("*")
            .from("users")
            .where("active = true")
            .build();
        
        connection.executeQuery(query);
        
        connection.disconnect();
        
        // Parse results and return users
        return Collections.emptyList();
    }
}

// application.yml
database:
  type: postgresql  # Change to 'mysql' to switch database
```

---

### **Advanced Pattern: Hierarchical Abstract Factory**

```java
// Multi-level abstraction for cloud services

// Level 1: Abstract Factory for cloud infrastructure
public interface CloudInfrastructureFactory {
    StorageFactory createStorageFactory();
    ComputeFactory createComputeFactory();
    NetworkFactory createNetworkFactory();
}

// Level 2: Abstract Factory for storage services
public interface StorageFactory {
    ObjectStorage createObjectStorage();
    BlockStorage createBlockStorage();
    FileStorage createFileStorage();
}

// Level 2: Abstract Factory for compute services
public interface ComputeFactory {
    VirtualMachine createVM();
    Container createContainer();
    ServerlessFunction createFunction();
}

// AWS Implementation
public class AWSInfrastructureFactory implements CloudInfrastructureFactory {
    
    @Override
    public StorageFactory createStorageFactory() {
        return new AWSStorageFactory();
    }
    
    @Override
    public ComputeFactory createComputeFactory() {
        return new AWSComputeFactory();
    }
    
    @Override
    public NetworkFactory createNetworkFactory() {
        return new AWSNetworkFactory();
    }
}

public class AWSStorageFactory implements StorageFactory {
    
    @Override
    public ObjectStorage createObjectStorage() {
        return new S3Storage();
    }
    
    @Override
    public BlockStorage createBlockStorage() {
        return new EBSStorage();
    }
    
    @Override
    public FileStorage createFileStorage() {
        return new EFSStorage();
    }
}

// Usage
CloudInfrastructureFactory cloudFactory = new AWSInfrastructureFactory();
StorageFactory storageFactory = cloudFactory.createStorageFactory();
ObjectStorage s3 = storageFactory.createObjectStorage();
```

---

### **Abstract Factory with Dependency Injection**

```java
// Product interfaces
public interface EmailSender {
    void send(String to, String subject, String body);
}

public interface SMSSender {
    void send(String phoneNumber, String message);
}

public interface PushNotificationSender {
    void send(String deviceToken, String message);
}

// Abstract Factory
public interface NotificationFactory {
    EmailSender createEmailSender();
    SMSSender createSMSSender();
    PushNotificationSender createPushSender();
}

// Production factory (uses real services)
@Component
@Profile("prod")
public class ProductionNotificationFactory implements NotificationFactory {
    
    private final JavaMailSender mailSender;
    private final TwilioClient twilioClient;
    private final FCMClient fcmClient;
    
    public ProductionNotificationFactory(
            JavaMailSender mailSender,
            TwilioClient twilioClient,
            FCMClient fcmClient) {
        this.mailSender = mailSender;
        this.twilioClient = twilioClient;
        this.fcmClient = fcmClient;
    }
    
    @Override
    public EmailSender createEmailSender() {
        return new RealEmailSender(mailSender);
    }
    
    @Override
    public SMSSender createSMSSender() {
        return new TwilioSMSSender(twilioClient);
    }
    
    @Override
    public PushNotificationSender createPushSender() {
        return new FCMPushSender(fcmClient);
    }
}

// Test factory (uses mocks)
@Component
@Profile("test")
public class TestNotificationFactory implements NotificationFactory {
    
    @Override
    public EmailSender createEmailSender() {
        return new MockEmailSender();
    }
    
    @Override
    public SMSSender createSMSSender() {
        return new MockSMSSender();
    }
    
    @Override
    public PushNotificationSender createPushSender() {
        return new MockPushSender();
    }
}

// Service using factory
@Service
public class NotificationService {
    
    private final NotificationFactory factory;
    
    public NotificationService(NotificationFactory factory) {
        this.factory = factory;
    }
    
    public void notifyUser(User user, String message) {
        if (user.hasEmail()) {
            EmailSender emailSender = factory.createEmailSender();
            emailSender.send(user.getEmail(), "Notification", message);
        }
        
        if (user.hasPhone()) {
            SMSSender smsSender = factory.createSMSSender();
            smsSender.send(user.getPhone(), message);
        }
        
        if (user.hasDeviceToken()) {
            PushNotificationSender pushSender = factory.createPushSender();
            pushSender.send(user.getDeviceToken(), message);
        }
    }
}

// Test
@SpringBootTest
@ActiveProfiles("test")
public class NotificationServiceTest {
    
    @Autowired
    private NotificationService notificationService;
    
    @Test
    public void testNotifyUser() {
        User user = new User("test@example.com", "+1234567890", "device-token");
        
        // Uses TestNotificationFactory automatically
        notificationService.notifyUser(user, "Hello!");
        
        // No real emails/SMS sent (mocked)
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### **Performance Considerations**

**Object Creation Overhead:**

```java
// Scenario: Notification system (10,000 notifications/second)

// Approach 1: Create new objects each time
public void sendNotification(String type, String message) {
    NotificationFactory factory = getFactory(type);
    
    // Create new objects for each notification
    EmailSender emailSender = factory.createEmailSender();
    SMSSender smsSender = factory.createSMSSender();
    PushNotificationSender pushSender = factory.createPushSender();
    
    // Send notification
}

// Performance:
// - Object creation: 0.1ms per family (3 objects)
// - 10,000 req/sec × 0.1ms = 1,000ms/sec CPU time
// - Result: 1 full CPU core wasted on object creation

// Approach 2: Reuse objects (Singleton products)
@Component
public class OptimizedProductionFactory implements NotificationFactory {
    
    private final EmailSender emailSender;  // Created once
    private final SMSSender smsSender;      // Created once
    private final PushNotificationSender pushSender;  // Created once
    
    public OptimizedProductionFactory(
            EmailSender emailSender,
            SMSSender smsSender,
            PushNotificationSender pushSender) {
        this.emailSender = emailSender;
        this.smsSender = smsSender;
        this.pushSender = pushSender;
    }
    
    @Override
    public EmailSender createEmailSender() {
        return emailSender;  // Return existing instance
    }
    
    @Override
    public SMSSender createSMSSender() {
        return smsSender;
    }
    
    @Override
    public PushNotificationSender createPushSender() {
        return pushSender;
    }
}

// Performance:
// - Object creation: 0 (reuse existing)
// - CPU time: 0ms
// - Result: 0 CPU wasted
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Abstract Factory for Multi-Tenancy**

```java
// Each tenant gets appropriate database configuration

public interface TenantDatabaseFactory {
    DataSource createDataSource();
    EntityManagerFactory createEntityManagerFactory();
    PlatformTransactionManager createTransactionManager();
}

// Small tenant (shared database)
public class SharedDatabaseFactory implements TenantDatabaseFactory {
    
    private final String tenantId;
    
    @Override
    public DataSource createDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://shared-db:5432/tenants");
        config.setMaximumPoolSize(5);  // Small pool
        return new HikariDataSource(config);
    }
    
    @Override
    public EntityManagerFactory createEntityManagerFactory() {
        // Configure JPA with schema filter for tenant
        return configurePersistenceUnit(tenantId);
    }
    
    @Override
    public PlatformTransactionManager createTransactionManager() {
        return new JpaTransactionManager(createEntityManagerFactory());
    }
}

// Large tenant (dedicated database)
public class DedicatedDatabaseFactory implements TenantDatabaseFactory {
    
    private final String tenantId;
    
    @Override
    public DataSource createDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://tenant-" + tenantId + ":5432/db");
        config.setMaximumPoolSize(50);  // Large pool
        return new HikariDataSource(config);
    }
    
    @Override
    public EntityManagerFactory createEntityManagerFactory() {
        return configurePersistenceUnit(tenantId);
    }
    
    @Override
    public PlatformTransactionManager createTransactionManager() {
        return new JpaTransactionManager(createEntityManagerFactory());
    }
}

// Factory selector
@Component
public class TenantDatabaseFactoryProvider {
    
    public TenantDatabaseFactory getFactory(String tenantId, TenantTier tier) {
        switch (tier) {
            case ENTERPRISE:
                return new DedicatedDatabaseFactory(tenantId);
            case PROFESSIONAL:
            case STARTER:
            default:
                return new SharedDatabaseFactory(tenantId);
        }
    }
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Abstract Factory for Failover**

```java
// Primary and fallback implementations

public interface PaymentGatewayFactory {
    PaymentProcessor createProcessor();
    RefundService createRefundService();
    WebhookHandler createWebhookHandler();
}

// Primary factory (Stripe)
public class StripeFactory implements PaymentGatewayFactory {
    
    @Override
    public PaymentProcessor createProcessor() {
        return new StripePaymentProcessor();
    }
    
    @Override
    public RefundService createRefundService() {
        return new StripeRefundService();
    }
    
    @Override
    public WebhookHandler createWebhookHandler() {
        return new StripeWebhookHandler();
    }
}

// Fallback factory (PayPal)
public class PayPalFactory implements PaymentGatewayFactory {
    
    @Override
    public PaymentProcessor createProcessor() {
        return new PayPalPaymentProcessor();
    }
    
    @Override
    public RefundService createRefundService() {
        return new PayPalRefundService();
    }
    
    @Override
    public WebhookHandler createWebhookHandler() {
        return new PayPalWebhookHandler();
    }
}

// Service with automatic failover
@Service
public class PaymentService {
    
    private final PaymentGatewayFactory primaryFactory;
    private final PaymentGatewayFactory fallbackFactory;
    private final CircuitBreaker circuitBreaker;
    
    public PaymentService(
            @Qualifier("stripe") PaymentGatewayFactory primaryFactory,
            @Qualifier("paypal") PaymentGatewayFactory fallbackFactory,
            CircuitBreaker circuitBreaker) {
        this.primaryFactory = primaryFactory;
        this.fallbackFactory = fallbackFactory;
        this.circuitBreaker = circuitBreaker;
    }
    
    public PaymentResult processPayment(PaymentRequest request) {
        try {
            // Try primary factory
            PaymentProcessor processor = primaryFactory.createProcessor();
            return circuitBreaker.executeSupplier(() -> processor.process(request));
        } catch (Exception e) {
            // Fallback to secondary factory
            System.err.println("Primary failed, using fallback: " + e.getMessage());
            PaymentProcessor fallbackProcessor = fallbackFactory.createProcessor();
            return fallbackProcessor.process(request);
        }
    }
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### **Abstract Factory for Environment-Specific Security**

```java
// Different security implementations per environment

public interface SecurityComponentFactory {
    Encryptor createEncryptor();
    TokenValidator createTokenValidator();
    AuditLogger createAuditLogger();
}

// Production factory (strong security)
@Component
@Profile("prod")
public class ProductionSecurityFactory implements SecurityComponentFactory {
    
    @Override
    public Encryptor createEncryptor() {
        return new AES256Encryptor();  // Strong encryption
    }
    
    @Override
    public TokenValidator createTokenValidator() {
        return new JWTValidator();  // Real JWT validation
    }
    
    @Override
    public AuditLogger createAuditLogger() {
        return new DatabaseAuditLogger();  // Persist all audits
    }
}

// Development factory (relaxed security)
@Component
@Profile("dev")
public class DevelopmentSecurityFactory implements SecurityComponentFactory {
    
    @Override
    public Encryptor createEncryptor() {
        return new NoOpEncryptor();  // No encryption (faster debugging)
    }
    
    @Override
    public TokenValidator createTokenValidator() {
        return new LenientTokenValidator();  // Accept any token
    }
    
    @Override
    public AuditLogger createAuditLogger() {
        return new ConsoleAuditLogger();  // Just print to console
    }
}

// Service using security components
@Service
public class UserService {
    
    private final SecurityComponentFactory securityFactory;
    
    public UserService(SecurityComponentFactory securityFactory) {
        this.securityFactory = securityFactory;
    }
    
    public void updateUserProfile(User user, String newData) {
        Encryptor encryptor = securityFactory.createEncryptor();
        TokenValidator validator = securityFactory.createTokenValidator();
        AuditLogger auditLogger = securityFactory.createAuditLogger();
        
        // Validate token
        validator.validate(user.getToken());
        
        // Encrypt sensitive data
        String encryptedData = encryptor.encrypt(newData);
        
        // Update user
        user.setData(encryptedData);
        
        // Audit action
        auditLogger.log("User profile updated: " + user.getId());
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: JDBC Driver Architecture**

**Background:**
JDBC (Java Database Connectivity) is one of the most famous examples of Abstract Factory in production. It allows Java applications to connect to any database without changing code.

**Implementation:**

```java
// JDBC's Abstract Factory pattern

// Abstract Factory: DriverManager
public class DriverManager {
    
    // Returns appropriate Driver implementation
    public static Connection getConnection(String url) throws SQLException {
        // Selects driver based on URL prefix
        // jdbc:postgresql:// → PostgreSQL driver
        // jdbc:mysql:// → MySQL driver
        // jdbc:oracle:// → Oracle driver
        
        for (Driver driver : registeredDrivers) {
            if (driver.acceptsURL(url)) {
                return driver.connect(url, properties);
            }
        }
        throw new SQLException("No suitable driver");
    }
}

// Abstract Product: Connection
public interface Connection {
    Statement createStatement();
    PreparedStatement prepareStatement(String sql);
    CallableStatement prepareCall(String sql);
    // ... other methods
}

// Concrete Product: PostgreSQLConnection
public class PGConnection implements Connection {
    // PostgreSQL-specific implementation
}

// Concrete Product: MySQLConnection
public class MySQLConnection implements Connection {
    // MySQL-specific implementation
}

// Usage (same code works with any database)
Connection conn = DriverManager.getConnection("jdbc:postgresql://localhost/db");
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery("SELECT * FROM users");

// Change to MySQL (just change URL)
Connection conn = DriverManager.getConnection("jdbc:mysql://localhost/db");
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery("SELECT * FROM users");
```

**Results:**
- **Portability:** 1 million+ Java applications switch databases easily
- **Vendor Independence:** No lock-in to specific database
- **Ecosystem:** 100+ database drivers available
- **Standardization:** Industry standard since 1997

---

### **Case Study 2: AWS SDK Multi-Region Architecture**

**Background:**
AWS SDK needs to support 25+ regions with consistent API but region-specific implementations.

**Implementation:**

```java
// Abstract Factory for AWS regions
public interface AWSRegionFactory {
    S3Client createS3Client();
    EC2Client createEC2Client();
    RDSClient createRDSClient();
    DynamoDBClient createDynamoDBClient();
}

// US East factory
public class USEastFactory implements AWSRegionFactory {
    
    @Override
    public S3Client createS3Client() {
        return S3Client.builder()
            .region(Region.US_EAST_1)
            .endpointOverride(URI.create("https://s3.us-east-1.amazonaws.com"))
            .build();
    }
    
    @Override
    public EC2Client createEC2Client() {
        return EC2Client.builder()
            .region(Region.US_EAST_1)
            .build();
    }
    
    // ... other clients
}

// EU West factory
public class EUWestFactory implements AWSRegionFactory {
    
    @Override
    public S3Client createS3Client() {
        return S3Client.builder()
            .region(Region.EU_WEST_1)
            .endpointOverride(URI.create("https://s3.eu-west-1.amazonaws.com"))
            .build();
    }
    
    @Override
    public EC2Client createEC2Client() {
        return EC2Client.builder()
            .region(Region.EU_WEST_1)
            .build();
    }
    
    // ... other clients
}

// Application uses factory
@Service
public class MultiRegionService {
    
    private final Map<String, AWSRegionFactory> regionFactories;
    
    public MultiRegionService() {
        this.regionFactories = Map.of(
            "us-east-1", new USEastFactory(),
            "eu-west-1", new EUWestFactory(),
            "ap-south-1", new APSouthFactory()
        );
    }
    
    public void deployToRegion(String region, DeploymentConfig config) {
        AWSRegionFactory factory = regionFactories.get(region);
        
        // All clients guaranteed to be from same region
        S3Client s3 = factory.createS3Client();
        EC2Client ec2 = factory.createEC2Client();
        RDSClient rds = factory.createRDSClient();
        
        // Deploy resources
        s3.putObject(config.getBucket(), config.getArtifact());
        ec2.runInstances(config.getInstanceConfig());
        rds.createDBInstance(config.getDBConfig());
    }
}
```

**Results:**
- **Multi-Region Support:** Deploy to 25+ regions consistently
- **Compliance:** Data residency requirements met automatically
- **Disaster Recovery:** Failover to different region seamlessly
- **Cost Optimization:** Route to cheapest region dynamically

---

### **Case Study 3: Spring Framework's Testing Support**

**Background:**
Spring provides test vs production implementations of infrastructure components.

**Implementation:**

```java
// Abstract Factory for application context
public interface ApplicationContextFactory {
    DataSource createDataSource();
    EntityManagerFactory createEntityManagerFactory();
    CacheManager createCacheManager();
    MessageSource createMessageSource();
}

// Production factory
@Configuration
@Profile("prod")
public class ProductionContextFactory implements ApplicationContextFactory {
    
    @Bean
    @Override
    public DataSource createDataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://prod-db:5432/app");
        config.setMaximumPoolSize(100);
        return new HikariDataSource(config);
    }
    
    @Bean
    @Override
    public EntityManagerFactory createEntityManagerFactory() {
        LocalContainerEntityManagerFactoryBean factory = 
            new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(createDataSource());
        factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
        return factory.getObject();
    }
    
    @Bean
    @Override
    public CacheManager createCacheManager() {
        return new RedisCacheManager(/* Redis config */);
    }
    
    @Bean
    @Override
    public MessageSource createMessageSource() {
        return new DatabaseMessageSource();
    }
}

// Test factory
@Configuration
@Profile("test")
public class TestContextFactory implements ApplicationContextFactory {
    
    @Bean
    @Override
    public DataSource createDataSource() {
        // In-memory H2 database
        return new EmbeddedDatabaseBuilder()
            .setType(EmbeddedDatabaseType.H2)
            .build();
    }
    
    @Bean
    @Override
    public EntityManagerFactory createEntityManagerFactory() {
        LocalContainerEntityManagerFactoryBean factory = 
            new LocalContainerEntityManagerFactoryBean();
        factory.setDataSource(createDataSource());
        return factory.getObject();
    }
    
    @Bean
    @Override
    public CacheManager createCacheManager() {
        return new ConcurrentMapCacheManager();  // Simple in-memory cache
    }
    
    @Bean
    @Override
    public MessageSource createMessageSource() {
        return new StaticMessageSource();  // Hard-coded messages
    }
}

// Service works with both
@Service
public class UserService {
    
    private final DataSource dataSource;
    private final CacheManager cacheManager;
    
    @Autowired
    public UserService(DataSource dataSource, CacheManager cacheManager) {
        this.dataSource = dataSource;
        this.cacheManager = cacheManager;
    }
    
    // Works in production (PostgreSQL + Redis)
    // Works in tests (H2 + in-memory cache)
}
```

**Results:**
- **Fast Tests:** In-memory implementations = 100x faster tests
- **Isolation:** Tests don't affect production data
- **Simplicity:** Same code works in prod and test
- **Confidence:** Production-like testing without complexity

---

### **Case Study 4: Netflix's Chaos Engineering Platform**

**Background:**
Netflix uses Abstract Factory to inject failures into production systems for resilience testing.

**Implementation:**

```java
// Abstract Factory for network clients
public interface HTTPClientFactory {
    HTTPClient createClient();
    RequestInterceptor createInterceptor();
    RetryPolicy createRetryPolicy();
}

// Normal factory (production)
public class StandardHTTPClientFactory implements HTTPClientFactory {
    
    @Override
    public HTTPClient createClient() {
        return new OkHttpClient.Builder()
            .connectTimeout(5, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .build();
    }
    
    @Override
    public RequestInterceptor createInterceptor() {
        return new LoggingInterceptor();
    }
    
    @Override
    public RetryPolicy createRetryPolicy() {
        return new ExponentialBackoffRetry(3);
    }
}

// Chaos factory (inject failures)
public class ChaosHTTPClientFactory implements HTTPClientFactory {
    
    private final ChaosConfiguration config;
    
    @Override
    public HTTPClient createClient() {
        return new ChaosHTTPClient(
            new OkHttpClient(),
            config  // Random failures, latency, etc.
        );
    }
    
    @Override
    public RequestInterceptor createInterceptor() {
        return new ChaosInterceptor(config);  // Inject errors
    }
    
    @Override
    public RetryPolicy createRetryPolicy() {
        return new ChaosRetryPolicy(config);  // Sometimes don't retry
    }
}

// Service uses factory
@Service
public class MovieRecommendationService {
    
    private final HTTPClientFactory clientFactory;
    
    public MovieRecommendationService(HTTPClientFactory clientFactory) {
        this.clientFactory = clientFactory;
    }
    
    public List<Movie> getRecommendations(User user) {
        HTTPClient client = clientFactory.createClient();
        RequestInterceptor interceptor = clientFactory.createInterceptor();
        RetryPolicy retryPolicy = clientFactory.createRetryPolicy();
        
        // Make API call (may fail if using ChaosFactory)
        Response response = client.execute(
            new Request("https://api.netflix.com/recommendations"),
            interceptor,
            retryPolicy
        );
        
        return parseMovies(response);
    }
}

// Configuration
@Configuration
public class ServiceConfig {
    
    @Bean
    public HTTPClientFactory httpClientFactory() {
        if (chaosEnabled()) {
            return new ChaosHTTPClientFactory(chaosConfig());
        } else {
            return new StandardHTTPClientFactory();
        }
    }
}
```

**Results:**
- **Resilience:** Systems tested under failure conditions
- **Confidence:** Know system behaves correctly during outages
- **Production Testing:** Real traffic with injected failures
- **Famous Success:** Survived AWS outage because of chaos testing

---

### **Case Study 5: Enterprise SaaS Multi-Tenancy**

**Background:**
Large SaaS company serves 10,000+ tenants with different tiers (Starter, Professional, Enterprise).

**Implementation:**

```java
// Abstract Factory for tenant resources
public interface TenantResourceFactory {
    DatabaseConnection createDatabaseConnection();
    StorageProvider createStorageProvider();
    RateLimiter createRateLimiter();
    AnalyticsCollector createAnalyticsCollector();
}

// Starter tier (shared resources)
public class StarterTierFactory implements TenantResourceFactory {
    
    @Override
    public DatabaseConnection createDatabaseConnection() {
        return new SharedDatabaseConnection(5);  // 5 connections max
    }
    
    @Override
    public StorageProvider createStorageProvider() {
        return new SharedStorageProvider(1_000_000_000);  // 1GB limit
    }
    
    @Override
    public RateLimiter createRateLimiter() {
        return new RateLimiter(100);  // 100 req/min
    }
    
    @Override
    public AnalyticsCollector createAnalyticsCollector() {
        return new BasicAnalyticsCollector();  // Basic metrics only
    }
}

// Enterprise tier (dedicated resources)
public class EnterpriseTierFactory implements TenantResourceFactory {
    
    private final String tenantId;
    
    @Override
    public DatabaseConnection createDatabaseConnection() {
        return new DedicatedDatabaseConnection(tenantId, 100);  // 100 connections
    }
    
    @Override
    public StorageProvider createStorageProvider() {
        return new DedicatedStorageProvider(tenantId, 1_000_000_000_000L);  // 1TB
    }
    
    @Override
    public RateLimiter createRateLimiter() {
        return new UnlimitedRateLimiter();  // No limits
    }
    
    @Override
    public AnalyticsCollector createAnalyticsCollector() {
        return new AdvancedAnalyticsCollector();  // Real-time, detailed
    }
}

// Tenant service
@Service
public class TenantService {
    
    private final Map<String, TenantResourceFactory> tenantFactories;
    
    public void processRequest(String tenantId, Request request) {
        TenantResourceFactory factory = tenantFactories.get(tenantId);
        
        // All resources appropriate for tenant's tier
        DatabaseConnection db = factory.createDatabaseConnection();
        StorageProvider storage = factory.createStorageProvider();
        RateLimiter rateLimiter = factory.createRateLimiter();
        AnalyticsCollector analytics = factory.createAnalyticsCollector();
        
        // Check rate limit
        if (!rateLimiter.allowRequest()) {
            throw new RateLimitExceededException();
        }
        
        // Process request
        db.connect();
        Object data = db.query(request.getQuery());
        storage.store(data);
        analytics.track(request);
        db.disconnect();
    }
}
```

**Results:**
- **Fair Resource Allocation:** Each tier gets appropriate resources
- **Cost Efficiency:** Shared resources for small tenants
- **Scalability:** Dedicated resources for large tenants
- **Business Impact:** $10M ARR from enterprise tier

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "Abstract Factory is a creational pattern that creates families of related objects without specifying their concrete classes. Unlike the Factory Method pattern which creates one type of object, Abstract Factory creates multiple related products that must be compatible.
>
> **The classic example is UI themes.** Imagine you're building a cross-platform application that needs Windows and Mac themes. Each theme has buttons, text fields, and checkboxes. You want to ensure all components match—all Windows-style or all Mac-style, never mixed.
>
> **The Abstract Factory defines methods for creating each product type:**
> ```java
> public interface GUIFactory {
>     Button createButton();
>     TextField createTextField();
>     Checkbox createCheckbox();
> }
> ```
>
> **Then you have concrete factories for each theme:**
> ```java
> public class WindowsFactory implements GUIFactory {
>     public Button createButton() {
>         return new WindowsButton();
>     }
>     // Creates other Windows components
> }
>
> public class MacFactory implements GUIFactory {
>     public Button createButton() {
>         return new MacButton();
>     }
>     // Creates other Mac components
> }
> ```
>
> **The client code works with abstract interfaces:**
> ```java
> public class Application {
>     private final GUIFactory factory;
>     
>     public Application(GUIFactory factory) {
>         this.factory = factory;
>     }
>     
>     public void renderUI() {
>         Button btn = factory.createButton();
>         TextField text = factory.createTextField();
>         Checkbox check = factory.createCheckbox();
>         // All guaranteed to match!
>     }
> }
> ```
>
> **To switch themes, you just pass a different factory—no client code changes needed.**
>
> **In production systems, I've used this for database abstraction layers.** We supported PostgreSQL and MySQL, and each database needed three components: Connection, QueryBuilder, and TransactionManager. These must be compatible—you can't use a PostgreSQL connection with a MySQL transaction manager.
>
> **The Abstract Factory ensured consistency.** We had `PostgreSQLFactory` and `MySQLFactory`, each creating a matching family of components. Switching databases was just a configuration change—specify which factory to use in Spring.
>
> **The key benefits are:**
> - **Consistency:** Products from the same factory are guaranteed to work together
> - **Isolation:** Client code doesn't know about concrete classes
> - **Flexibility:** Switch entire product families by changing the factory
> - **Open-Closed Principle:** Add new product families without changing existing code
>
> **The trade-off is complexity.** Abstract Factory requires many interfaces and classes. It's overkill if products don't need to be compatible or if you're only creating one or two types. But when you need guaranteed compatibility across multiple related products, Abstract Factory is the right pattern.
>
> **Real-world examples include JDBC's DriverManager, which creates matching database connections and statements, and Spring's test vs production context factories, which create matching infrastructure components for different environments."

---

### **Common Follow-Up Questions**

#### **Q1: What's the difference between Abstract Factory and Factory Method?**

> "Great question—they're both factory patterns but solve different problems at different scales.
>
> **Factory Method creates ONE type of object.** It's about polymorphic constructors. You have an abstract class with a factory method that subclasses override to return different concrete types.
>
> ```java
> public abstract class DocumentEditor {
>     protected abstract Document createDocument();  // ONE factory method
>     
>     public void open() {
>         Document doc = createDocument();
>         doc.open();
>     }
> }
>
> public class WordEditor extends DocumentEditor {
>     protected Document createDocument() {
>         return new WordDocument();  // Creates ONE product
>     }
> }
> ```
>
> **Abstract Factory creates FAMILIES of related objects.** It's about creating multiple products that belong together.
>
> ```java
> public interface GUIFactory {
>     Button createButton();        // MULTIPLE factory methods
>     TextField createTextField();  // for creating product family
>     Checkbox createCheckbox();
> }
>
> public class WindowsFactory implements GUIFactory {
>     // Creates entire family of Windows products
> }
> ```
>
> **Here's the key distinction:**
>
> | **Aspect** | **Factory Method** | **Abstract Factory** |
> |------------|-------------------|---------------------|
> | **Number of products** | One | Multiple (family) |
> | **Structure** | Inheritance (abstract class) | Composition (interface) |
> | **Purpose** | Defer instantiation to subclasses | Create related products |
> | **Guarantees** | None | Products are compatible |
> | **Complexity** | Simpler | More complex |
>
> **When to use each:**
>
> **Factory Method:** You need to create one type of object with variations:
> - Different document types (Word, PDF, Text)
> - Different loggers (File, Console, Database)
> - Different parsers (JSON, XML, CSV)
>
> **Abstract Factory:** You need to create multiple related objects that must match:
> - UI themes (all Windows or all Mac)
> - Database layers (all PostgreSQL or all MySQL)
> - Cloud providers (all AWS or all GCP)
>
> **In practice, Abstract Factory often contains Factory Methods.** Each `createButton()`, `createTextField()` method is essentially a factory method. So Abstract Factory is like a collection of related factory methods.
>
> **Real example from my experience:** We had a notification system. Initially, we used Factory Method to create either EmailNotifier or SMSNotifier. But then we needed to create the Sender, Formatter, and Logger together—they had to match. An email sender needs an email formatter and email logger. That's when we refactored to Abstract Factory to create the full family of related components."

---

#### **Q2: How do you decide when Abstract Factory is overkill?**

> "Abstract Factory adds significant complexity, so it's important to know when it's justified. I use this decision framework:
>
> **Use Abstract Factory when ALL of these are true:**
>
> 1. **You have multiple product types (3+)**
>    - Button, TextField, Checkbox (not just Button)
>    - Connection, QueryBuilder, TransactionManager (not just Connection)
>
> 2. **Products must be compatible**
>    - Can't mix Windows button with Mac checkbox
>    - Can't mix PostgreSQL connection with MySQL transaction
>
> 3. **You switch entire families together**
>    - Switch from all-Windows to all-Mac
>    - Switch from all-AWS to all-GCP
>
> 4. **Variations are known and limited**
>    - 2-5 different factories (Windows, Mac, Linux)
>    - Not 100+ variations (then use registry pattern)
>
> **Skip Abstract Factory if:**
>
> 1. **Only 1-2 product types**
>    ```java
>    // Abstract Factory overkill for this:
>    public interface LoggerFactory {
>        Logger createLogger();  // Only one product
>    }
>    
>    // Just use Factory Method or Simple Factory
>    public class LoggerFactory {
>        public static Logger create(String type) {
>            // ...
>        }
>    }
>    ```
>
> 2. **Products are independent**
>    ```java
>    // Don't need Abstract Factory if components don't interact
>    EmailSender emailSender = emailFactory.create();
>    SMSSender smsSender = smsFactory.create();  // Independent
>    
>    // Can use separate Simple Factories
>    ```
>
> 3. **Only one variant**
>    ```java
>    // Don't need factory if only PostgreSQL supported
>    Connection conn = new PostgreSQLConnection();
>    QueryBuilder qb = new PostgreSQLQueryBuilder();
>    ```
>
> 4. **Switching is rare or never happens**
>    - If you'll never switch from AWS to GCP, don't abstract it
>    - YAGNI principle: You Aren't Gonna Need It
>
> **Warning signs Abstract Factory is overkill:**
>
> - **Too many small interfaces:** If each product has 1-2 methods, might be over-abstracted
> - **Empty implementations:** If concrete factories have empty or trivial implementations
> - **Frequent downcasting:** If clients cast products to concrete types, abstraction isn't working
> - **Premature optimization:** If you're abstracting "just in case"
>
> **A real mistake I made:**
>
> Early in my career, I built an Abstract Factory for payment processing. I had:
> ```java
> interface PaymentFactory {
>     PaymentProcessor createProcessor();
>     PaymentValidator createValidator();
>     PaymentLogger createLogger();
> }
> ```
>
> Problem: We only ever used Stripe. The Abstract Factory added complexity with zero benefit. After 6 months, we removed it and just used direct instantiation. Lesson learned: **Don't abstract until you have 2+ concrete use cases.**
>
> **My rule of thumb:**
> - **1 variant:** Direct instantiation
> - **2 variants, 1 product:** Simple Factory
> - **2 variants, 2+ products:** Consider Abstract Factory
> - **3+ variants, 3+ products:** Definitely Abstract Factory
> - **5+ variants:** Consider dynamic registration instead
>
> The pattern should simplify your code, not complicate it. If you're writing more boilerplate than business logic, Abstract Factory is probably overkill."

---

#### **Q3: How do you test code that uses Abstract Factory?**

> "Testing with Abstract Factory is actually easier than without it because dependencies are explicit and mockable. Here's my approach:
>
> **Approach 1: Mock the Factory (Unit Tests)**
>
> ```java
> @Test
> public void testDatabaseOperations() {
>     // Mock the factory
>     DatabaseFactory mockFactory = mock(DatabaseFactory.class);
>     Connection mockConnection = mock(Connection.class);
>     QueryBuilder mockQueryBuilder = mock(QueryBuilder.class);
>     
>     when(mockFactory.createConnection()).thenReturn(mockConnection);
>     when(mockFactory.createQueryBuilder()).thenReturn(mockQueryBuilder);
>     when(mockQueryBuilder.select(any()).from(any()).build())
>         .thenReturn("SELECT * FROM users");
>     
>     // Inject mock factory
>     DataAccessLayer dal = new DataAccessLayer(mockFactory);
>     
>     // Test
>     dal.performDatabaseOperations();
>     
>     // Verify all components used correctly
>     verify(mockConnection).connect();
>     verify(mockQueryBuilder).select("id", "name", "email");
>     verify(mockConnection).executeQuery("SELECT * FROM users");
>     verify(mockConnection).disconnect();
> }
> ```
>
> **Approach 2: Test Factory (Dedicated Test Implementation)**
>
> ```java
> // Test implementations of products
> public class InMemoryConnection implements Connection {
>     private Map<String, List<Map<String, Object>>> tables = new HashMap<>();
>     
>     public void connect() { }
>     public void disconnect() { }
>     
>     public void executeQuery(String query) {
>         // Parse query and return from in-memory tables
>     }
> }
>
> // Test factory that creates in-memory implementations
> public class InMemoryDatabaseFactory implements DatabaseFactory {
>     @Override
>     public Connection createConnection() {
>         return new InMemoryConnection();
>     }
>     
>     @Override
>     public QueryBuilder createQueryBuilder() {
>         return new InMemoryQueryBuilder();
>     }
>     
>     @Override
>     public TransactionManager createTransactionManager() {
>         return new InMemoryTransactionManager();
>     }
> }
>
> @Test
> public void testDatabaseOperations() {
>     // Use test factory (real implementations, but in-memory)
>     DatabaseFactory testFactory = new InMemoryDatabaseFactory();
>     DataAccessLayer dal = new DataAccessLayer(testFactory);
>     
>     // Test (no mocking, uses real logic)
>     dal.performDatabaseOperations();
>     
>     // Assertions work because in-memory database has state
>     InMemoryConnection conn = (InMemoryConnection) testFactory.createConnection();
>     assertEquals(3, conn.getTables().get("users").size());
> }
> ```
>
> **Approach 3: Spring Test Configuration**
>
> ```java
> // Test configuration with test factory
> @TestConfiguration
> public class TestDatabaseConfig {
>     
>     @Bean
>     @Primary  // Override production factory
>     public DatabaseFactory testDatabaseFactory() {
>         return new InMemoryDatabaseFactory();
>     }
> }
>
> @SpringBootTest
> @Import(TestDatabaseConfig.class)
> public class DataAccessLayerIntegrationTest {
>     
>     @Autowired
>     private DataAccessLayer dal;
>     
>     @Test
>     public void testDatabaseOperations() {
>         // Automatically uses InMemoryDatabaseFactory
>         dal.performDatabaseOperations();
>         
>         // Assertions...
>     }
> }
> ```
>
> **Approach 4: Profile-Based Factories**
>
> ```java
> // Production factory
> @Component
> @Profile("prod")
> public class ProductionDatabaseFactory implements DatabaseFactory {
>     // Real PostgreSQL implementations
> }
>
> // Test factory
> @Component
> @Profile("test")
> public class TestDatabaseFactory implements DatabaseFactory {
>     // In-memory H2 implementations
> }
>
> // Spring automatically selects based on active profile
> @SpringBootTest
> @ActiveProfiles("test")
> public class DataAccessLayerTest {
>     @Autowired
>     private DatabaseFactory factory;  // Gets TestDatabaseFactory
>     
>     @Test
>     public void test() {
>         // Uses test implementations automatically
>     }
> }
> ```
>
> **Testing the Factory Itself:**
>
> ```java
> @Test
> public void testFactoryCreatesCorrectProducts() {
>     DatabaseFactory factory = new PostgreSQLFactory();
>     
>     Connection conn = factory.createConnection();
>     assertInstanceOf(PostgreSQLConnection.class, conn);
>     
>     QueryBuilder qb = factory.createQueryBuilder();
>     assertInstanceOf(PostgreSQLQueryBuilder.class, qb);
>     
>     TransactionManager tm = factory.createTransactionManager();
>     assertInstanceOf(PostgreSQLTransactionManager.class, tm);
> }
>
> @Test
> public void testProductCompatibility() {
>     DatabaseFactory factory = new PostgreSQLFactory();
>     
>     // Create family of products
>     Connection conn = factory.createConnection();
>     QueryBuilder qb = factory.createQueryBuilder();
>     TransactionManager tm = factory.createTransactionManager();
>     
>     // Test they work together
>     conn.connect();
>     String query = qb.select("*").from("users").build();
>     conn.executeQuery(query);
>     // Should not throw ClassCastException or compatibility errors
> }
> ```
>
> **Key benefits for testing:**
>
> 1. **Easy mocking:** Factory is single injection point
> 2. **Swap implementations:** Test vs production factories
> 3. **Isolation:** Test each product independently
> 4. **Compatibility testing:** Verify products work together
> 5. **No external dependencies:** In-memory implementations for fast tests
>
> **In my experience:**
>
> For unit tests, I mock the factory. For integration tests, I use a test factory with in-memory implementations. For end-to-end tests, I use the production factory against a test database.
>
> This gives me fast feedback (unit tests in milliseconds), confidence (integration tests cover interactions), and reality checks (E2E tests use real implementations).
>
> Abstract Factory actually improves testability because all dependencies come from one place—the factory. Much better than scattered `new ClassName()` calls that you can't intercept."

---

#### **Q4: How does Abstract Factory relate to Dependency Injection?**

> "Abstract Factory and Dependency Injection solve similar problems but at different levels. They're highly complementary, especially in Spring applications.
>
> **Abstract Factory:** Runtime selection of product families based on context
> 
> **Dependency Injection:** Wiring dependencies at startup (or request time) based on configuration
>
> **How they work together:**
>
> **Level 1: Manual Factory (No DI)**
> ```java
> public class PostgreSQLFactory implements DatabaseFactory {
>     public Connection createConnection() {
>         // Manually create and configure
>         String url = System.getenv("DB_URL");
>         String user = System.getenv("DB_USER");
>         String pass = System.getenv("DB_PASS");
>         return new PostgreSQLConnection(url, user, pass);
>     }
> }
>
> // Problems:
> // ❌ Factory has hidden dependencies (environment variables)
> // ❌ Hard to test (can't inject mock config)
> // ❌ Configuration scattered
> ```
>
> **Level 2: DI for Products (Better)**
> ```java
> @Component
> public class PostgreSQLFactory implements DatabaseFactory {
>     
>     private final DataSource dataSource;
>     private final JdbcTemplate jdbcTemplate;
>     
>     // Spring injects dependencies
>     @Autowired
>     public PostgreSQLFactory(DataSource dataSource, JdbcTemplate jdbcTemplate) {
>         this.dataSource = dataSource;
>         this.jdbcTemplate = jdbcTemplate;
>     }
>     
>     public Connection createConnection() {
>         // Use injected dependencies
>         return new PostgreSQLConnection(dataSource);
>     }
> }
>
> // Benefits:
> // ✓ Dependencies explicit
> // ✓ Easy to test (inject mocks)
> // ✓ Configuration centralized
> ```
>
> **Level 3: DI for Factory Selection (Best)**
> ```java
> @Configuration
> public class DatabaseConfig {
>     
>     @Bean
>     @ConditionalOnProperty(name = "db.type", havingValue = "postgresql")
>     public DatabaseFactory postgresFactory(DataSource dataSource) {
>         return new PostgreSQLFactory(dataSource);
>     }
>     
>     @Bean
>     @ConditionalOnProperty(name = "db.type", havingValue = "mysql")
>     public DatabaseFactory mysqlFactory(DataSource dataSource) {
>         return new MySQLFactory(dataSource);
>     }
> }
>
> @Service
> public class UserService {
>     private final DatabaseFactory factory;
>     
>     // Spring injects appropriate factory based on configuration
>     @Autowired
>     public UserService(DatabaseFactory factory) {
>         this.factory = factory;
>     }
> }
> ```
>
> **The relationship:**
>
> | **Aspect** | **Abstract Factory** | **Dependency Injection** |
> |------------|---------------------|-------------------------|
> | **When** | Runtime | Startup (or request) |
> | **Based on** | Business logic/context | Configuration |
> | **Decides** | Which product family | How to construct objects |
> | **Level** | Application logic | Infrastructure |
>
> **Real example from production:**
>
> ```java
> // Notification system with both patterns
>
> // DI: Spring creates and configures all senders
> @Configuration
> public class NotificationConfig {
>     
>     @Bean
>     public EmailSender emailSender(JavaMailSender mailSender) {
>         return new EmailSender(mailSender);
>     }
>     
>     @Bean
>     public SMSSender smsSender(TwilioClient twilioClient) {
>         return new SMSSender(twilioClient);
>     }
>     
>     @Bean
>     public PushSender pushSender(FCMClient fcmClient) {
>         return new PushSender(fcmClient);
>     }
>     
>     @Bean
>     public NotificationFactory notificationFactory(
>             EmailSender emailSender,
>             SMSSender smsSender,
>             PushSender pushSender) {
>         return new NotificationFactory(emailSender, smsSender, pushSender);
>     }
> }
>
> // Service uses both
> @Service
> public class NotificationService {
>     
>     private final NotificationFactory factory;  // Injected by DI
>     
>     @Autowired
>     public NotificationService(NotificationFactory factory) {
>         this.factory = factory;
>     }
>     
>     public void notifyUser(User user, String message) {
>         // Runtime decision based on user preferences
>         String channel = user.getPreferredChannel();
>         
>         // Factory selects appropriate sender
>         NotificationSender sender = factory.createSender(channel);
>         sender.send(user, message);
>     }
> }
> ```
>
> **Key insight:**
>
> - **DI handles:** Object lifecycle, configuration, wiring dependencies
> - **Abstract Factory handles:** Runtime selection based on business logic
>
> **They're complementary:**
> - DI creates and configures factories and products
> - Abstract Factory selects which products to use based on runtime context
>
> **Without DI, Abstract Factory is harder:**
> - Factories have hidden dependencies
> - Configuration scattered across factory implementations
> - Testing difficult (can't inject mocks)
>
> **Without Abstract Factory, DI alone isn't enough:**
> - Can't select product families at runtime
> - Business logic mixed with construction logic
> - Hard to ensure product compatibility
>
> **Together, they're powerful:**
> - DI manages object lifecycle and configuration
> - Abstract Factory manages runtime selection and compatibility
> - Clean separation of concerns
> - Easy to test (inject mock factories)
> - Easy to extend (add new factories via configuration)
>
> In Spring applications, I always use them together. DI for infrastructure and wiring, Abstract Factory for business logic that needs runtime product selection."

---

#### **Q5: What are common mistakes when implementing Abstract Factory?**

> "I've seen (and made) several common mistakes with Abstract Factory. Here are the biggest pitfalls:
>
> **Mistake 1: Creating Abstract Factory When Simple Factory Suffices**
>
> ```java
> // BAD: Abstract Factory for single product
> public interface LoggerFactory {
>     Logger createLogger();  // Only one product!
> }
>
> public class FileLoggerFactory implements LoggerFactory {
>     public Logger createLogger() {
>         return new FileLogger();
>     }
> }
>
> // GOOD: Just use Simple Factory
> public class LoggerFactory {
>     public static Logger create(String type) {
>         switch (type) {
>             case "file": return new FileLogger();
>             case "console": return new ConsoleLogger();
>             default: throw new IllegalArgumentException();
>         }
>     }
> }
> ```
>
> **Why it's bad:** Unnecessary abstraction adds complexity without benefit.
>
> **Mistake 2: Products That Aren't Related**
>
> ```java
> // BAD: Unrelated products in same factory
> public interface MixedFactory {
>     EmailSender createEmailSender();
>     DatabaseConnection createDatabaseConnection();  // Unrelated!
>     PaymentProcessor createPaymentProcessor();      // Unrelated!
> }
>
> // GOOD: Separate factories for unrelated products
> public interface NotificationFactory {
>     EmailSender createEmailSender();
>     SMSSender createSMSSender();
>     PushSender createPushSender();
>     // All related to notifications
> }
> ```
>
> **Why it's bad:** Violates Single Responsibility. Products must be related and need to work together.
>
> **Mistake 3: Not Ensuring Product Compatibility**
>
> ```java
> // BAD: Factory allows incompatible products
> public class MixedFactory implements GUIFactory {
>     public Button createButton() {
>         return new WindowsButton();
>     }
>     
>     public Checkbox createCheckbox() {
>         return new MacCheckbox();  // Incompatible with Windows button!
>     }
> }
>
> // GOOD: All products from same family
> public class WindowsFactory implements GUIFactory {
>     public Button createButton() {
>         return new WindowsButton();
>     }
>     
>     public Checkbox createCheckbox() {
>         return new WindowsCheckbox();  // Matches Windows button
>     }
> }
> ```
>
> **Why it's bad:** Defeats the purpose of Abstract Factory (ensuring compatibility).
>
> **Mistake 4: Factories Creating Factories (Over-Engineering)**
>
> ```java
> // BAD: Factory that creates other factories
> public interface FactoryFactory {
>     GUIFactory createGUIFactory();
>     DatabaseFactory createDatabaseFactory();
> }
>
> // This is almost always overkill!
> ```
>
> **Why it's bad:** Excessive abstraction. Usually, one level of factories is enough.
>
> **Mistake 5: Not Using Dependency Injection**
>
> ```java
> // BAD: Factory creates dependencies manually
> public class PostgreSQLFactory implements DatabaseFactory {
>     public Connection createConnection() {
>         // Hardcoded dependencies
>         String url = "jdbc:postgresql://localhost/db";
>         return new PostgreSQLConnection(url);
>     }
> }
>
> // GOOD: Inject dependencies
> @Component
> public class PostgreSQLFactory implements DatabaseFactory {
>     private final DatabaseConfig config;
>     
>     @Autowired
>     public PostgreSQLFactory(DatabaseConfig config) {
>         this.config = config;
>     }
>     
>     public Connection createConnection() {
>         return new PostgreSQLConnection(config.getUrl());
>     }
> }
> ```
>
> **Why it's bad:** Hard to test, configure, and maintain. Always combine Abstract Factory with DI.
>
> **Mistake 6: Adding New Products Breaks All Factories**
>
> ```java
> // BAD: Adding product requires changing all factories
> public interface GUIFactory {
>     Button createButton();
>     TextField createTextField();
>     Checkbox createCheckbox();
>     Slider createSlider();  // New product added
> }
>
> // Now all existing factories must implement createSlider()
> // Even if they don't support sliders!
>
> public class LegacyFactory implements GUIFactory {
>     public Slider createSlider() {
>         throw new UnsupportedOperationException();  // Ugly!
>     }
> }
> ```
>
> **Better:** Use optional products or separate factories.
>
> ```java
> // Base factory
> public interface GUIFactory {
>     Button createButton();
>     TextField createTextField();
> }
>
> // Extended factory for advanced components
> public interface AdvancedGUIFactory extends GUIFactory {
>     Slider createSlider();
> }
> ```
>
> **Mistake 7: Returning Concrete Types Instead of Interfaces**
>
> ```java
> // BAD: Factory methods return concrete types
> public interface DatabaseFactory {
>     PostgreSQLConnection createConnection();  // Concrete type!
> }
>
> // GOOD: Return abstract types
> public interface DatabaseFactory {
>     Connection createConnection();  // Interface
> }
> ```
>
> **Why it's bad:** Defeats the purpose of abstraction. Clients become coupled to concrete types.
>
> **Mistake 8: No Default Implementation**
>
> ```java
> // BAD: Factory requires configuration
> DatabaseFactory factory = getFactory();  // What if config missing?
> Connection conn = factory.createConnection();  // NullPointerException!
>
> // GOOD: Provide sensible default
> @Bean
> public DatabaseFactory databaseFactory() {
>     String type = env.getProperty("db.type", "h2");  // Default to H2
>     switch (type) {
>         case "postgresql": return new PostgreSQLFactory();
>         case "mysql": return new MySQLFactory();
>         default: return new H2Factory();
>     }
> }
> ```
>
> **Mistake 9: Ignoring Lifecycle Management**
>
> ```java
> // BAD: Creating expensive objects every time
> public Connection createConnection() {
>     return new PostgreSQLConnection();  // Creates new connection pool!
> }
>
> // GOOD: Reuse expensive objects
> @Component
> public class PostgreSQLFactory implements DatabaseFactory {
>     private final HikariDataSource dataSource;  // Created once
>     
>     public PostgreSQLFactory(HikariDataSource dataSource) {
>         this.dataSource = dataSource;
>     }
>     
>     public Connection createConnection() {
>         return new PostgreSQLConnection(dataSource);  // Reuses pool
>     }
> }
> ```
>
> **Mistake 10: Not Testing Product Compatibility**
>
> ```java
> // Missing test
> @Test
> public void testProductFamilyCompatibility() {
>     DatabaseFactory factory = new PostgreSQLFactory();
>     
>     Connection conn = factory.createConnection();
>     QueryBuilder qb = factory.createQueryBuilder();
>     TransactionManager tm = factory.createTransactionManager();
>     
>     // Ensure they work together
>     conn.connect();
>     qb.select("*").from("users");
>     tm.beginTransaction();
>     conn.executeQuery(qb.build());
>     tm.commit();
>     conn.disconnect();
>     
>     // Should complete without exceptions
> }
> ```
>
> **Key lessons:**
>
> 1. **Only use Abstract Factory when products are related and need compatibility**
> 2. **Combine with Dependency Injection for configuration**
> 3. **Return interfaces, not concrete types**
> 4. **Provide sensible defaults**
> 5. **Test product compatibility explicitly**
> 6. **Consider lifecycle (reuse expensive objects)**
> 7. **Don't over-engineer (one level is usually enough)**
>
> In interviews, mentioning these pitfalls shows you've actually used the pattern in production, not just read about it in a textbook."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Abstract Factory Structure**

```
ABSTRACT FACTORY PATTERN
════════════════════════

┌─────────────────────────────────────┐
│            Client                   │
│                                     │
│  factory.createButton()             │
│  factory.createCheckbox()           │
└──────────────┬──────────────────────┘
               │ uses
               ↓
┌─────────────────────────────────────┐
│   GUIFactory (abstract)             │
│                                     │
│   + createButton(): Button          │
│   + createTextField(): TextField    │
│   + createCheckbox(): Checkbox      │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
┌─────────────┐ ┌─────────────┐
│WindowsFactory│ │MacFactory   │
│             │ │             │
│create*()    │ │create*()    │
│  returns    │ │  returns    │
│  Windows*   │ │  Mac*       │
└──────┬──────┘ └──────┬──────┘
       │               │
   ┌───┴───┐       ┌───┴───┐
   ↓       ↓       ↓       ↓
Windows Windows    Mac     Mac
Button  Checkbox  Button  Checkbox
   ↓       ↓       ↓       ↓
   └───────┴───────┴───────┘
           │
           ↓
   All implement abstract
   product interfaces


KEY GUARANTEE:
══════════════
All products from same factory
are GUARANTEED to be compatible

WindowsFactory creates:
- WindowsButton
- WindowsTextField
- WindowsCheckbox
→ All Windows style ✓

MacFactory creates:
- MacButton
- MacTextField  
- MacCheckbox
→ All Mac style ✓

CAN'T create:
- WindowsButton + MacCheckbox
→ Compile error ✗
```

---

### **Factory Method vs Abstract Factory**

```
FACTORY METHOD
══════════════

Creates ONE type of object

┌─────────────────────┐
│  Creator            │
│                     │
│  operation() {      │
│    product =        │
│      createProduct()│  ← Factory method
│    product.use()    │
│  }                  │
│                     │
│  createProduct():   │
│    Product          │  ← Abstract
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ↓           ↓
┌─────────┐ ┌─────────┐
│ConcreteA│ │ConcreteB│
│         │ │         │
│create() │ │create() │
│ return A│ │ return B│
└─────────┘ └─────────┘

ONE product type
Inheritance-based


ABSTRACT FACTORY
════════════════

Creates FAMILY of related objects

┌─────────────────────┐
│  Client             │
│                     │
│  button =           │
│    factory.         │
│      createButton() │
│  text =             │
│    factory.         │
│      createText()   │  ← Multiple
│  checkbox =         │     factory
│    factory.         │     methods
│      createCheckbox()│
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  AbstractFactory    │
│                     │
│  + createButton()   │
│  + createText()     │
│  + createCheckbox() │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ↓           ↓
┌─────────┐ ┌─────────┐
│FactoryA │ │FactoryB │
│         │ │         │
│create*()│ │create*()│
│ return  │ │ return  │
│ familyA │ │ familyB │
└─────────┘ └─────────┘

MULTIPLE product types
Composition-based
Products are related
```

---

### **Abstract Factory Evolution**

```
PHASE 1: DIRECT INSTANTIATION
══════════════════════════════

void renderUI() {
    Button btn = new WindowsButton();
    TextField text = new WindowsTextField();
    Checkbox check = new WindowsCheckbox();
}

Problem: Client knows concrete classes


PHASE 2: SIMPLE FACTORY
════════════════════════

void renderUI() {
    Button btn = UIFactory.createButton("windows");
    TextField text = UIFactory.createTextField("windows");
    Checkbox check = UIFactory.createCheckbox("windows");
}

Problem: Can accidentally mix types
Button btn = UIFactory.createButton("windows");
Checkbox check = UIFactory.createCheckbox("mac");  ← Mixed!


PHASE 3: ABSTRACT FACTORY
══════════════════════════

void renderUI(GUIFactory factory) {
    Button btn = factory.createButton();
    TextField text = factory.createTextField();
    Checkbox check = factory.createCheckbox();
}

// Usage
GUIFactory factory = new WindowsFactory();
renderUI(factory);

Solution: All components guaranteed to match!
✓ Can't accidentally mix Windows and Mac
✓ Switch entire theme by changing factory
✓ Client doesn't know concrete classes


PHASE 4: SPRING INTEGRATION
════════════════════════════

@Configuration
class UIConfig {
    @Bean
    @ConditionalOnProperty("ui.theme", "windows")
    GUIFactory windowsFactory() {
        return new WindowsFactory();
    }
    
    @Bean
    @ConditionalOnProperty("ui.theme", "mac")
    GUIFactory macFactory() {
        return new MacFactory();
    }
}

@Service
class UIService {
    private final GUIFactory factory;
    
    @Autowired
    UIService(GUIFactory factory) {
        this.factory = factory;  // Spring injects
    }
}

# application.yml
ui:
  theme: windows  # Change to 'mac'

Solution: Configuration-based theme switching
```

---

### **Real-World: Multi-Cloud Abstract Factory**

```
MULTI-CLOUD ARCHITECTURE
════════════════════════

           Application
               │
               ↓
         CloudFactory
               │
        ┌──────┴──────┬──────────┐
        ↓             ↓          ↓
    AWSFactory    GCPFactory  AzureFactory
        │             │          │
    ┌───┴───┐     ┌───┴───┐  ┌───┴───┐
    ↓       ↓     ↓       ↓  ↓       ↓
   S3    Lambda  GCS   Cloud  Blob  Functions
         EC2    Compute Run Storage
         RDS    SQL    Cosmos DB


GUARANTEED COMPATIBILITY:
═════════════════════════

AWS Family:
- S3 Storage
- EC2 Compute
- RDS Database
→ All work together ✓
→ IAM roles compatible ✓
→ VPC networking works ✓

GCP Family:
- Cloud Storage
- Compute Engine
- Cloud SQL
→ All work together ✓
→ IAM bindings compatible ✓
→ VPC networking works ✓

CANNOT MIX:
- S3 (AWS) + Compute Engine (GCP)
→ Different authentication ✗
→ Different networking ✗
→ Different IAM ✗


IMPLEMENTATION:
═══════════════

@Configuration
class CloudConfig {
    @Bean
    CloudFactory cloudFactory(
            @Value("${cloud.provider}") String provider) {
        switch (provider) {
            case "aws": return new AWSFactory();
            case "gcp": return new GCPFactory();
            case "azure": return new AzureFactory();
            default: throw new IllegalArgumentException();
        }
    }
}

@Service
class DeploymentService {
    private final CloudFactory cloud;
    
    void deploy() {
        StorageService storage = cloud.createStorage();
        ComputeService compute = cloud.createCompute();
        DatabaseService db = cloud.createDatabase();
        
        storage.upload(artifact);  // Works!
        compute.deploy(artifact);  // Works!
        db.createSchema(schema);   // Works!
        
        // All services compatible ✓
    }
}

BENEFIT:
════════
# application.yml
cloud:
  provider: aws  # Change to 'gcp' or 'azure'

→ Zero code changes
→ Full provider switch in configuration
→ No vendor lock-in
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Engineering Impact:**
- **Consistency Guarantee:** Products from same factory are guaranteed to be compatible
- **Flexibility:** Switch entire product families without changing client code
- **Vendor Independence:** Abstract away vendor-specific implementations (AWS vs GCP)
- **Testability:** Easy to swap production and test implementations

**Business Impact:**
- **Faster Integration:** Add new product families in days, not weeks
- **Vendor Negotiation:** Multi-cloud strategy enables better pricing
- **Disaster Recovery:** Failover to different provider in minutes
- **Cost Optimization:** Route to cheapest provider saves 20-40% infrastructure costs

**Real Numbers:**
```
E-commerce company switching cloud providers:

Without Abstract Factory:
- Code changes: 200+ files
- Implementation: 6 weeks
- Testing: 4 weeks
- Risk: High (production changes)
- Downtime: 4 hours
- Cost: $150K engineering + $40K lost revenue

With Abstract Factory:
- Code changes: 0 (configuration only)
- Implementation: 2 days
- Testing: 1 week (validation)
- Risk: Low (isolated change)
- Downtime: 5 minutes
- Cost: $15K validation

Savings: $175K per provider switch
ROI: Implementation cost recovered in first migration
```

---

### **How It Works (Simple Summary)**

**Core Concept:**
Abstract Factory provides an interface for creating families of related objects. Each concrete factory implementation creates a matching set of products.

**Structure:**
1. **Abstract Factory:** Interface with methods to create each product type
2. **Concrete Factory:** Implementation that creates specific product variants
3. **Abstract Products:** Interfaces for each type of product
4. **Concrete Products:** Specific implementations of products
5. **Client:** Uses abstract interfaces, never concrete classes

**Example:**
```java
// 1. Define abstract factory
interface GUIFactory {
    Button createButton();
    Checkbox createCheckbox();
}

// 2. Implement concrete factories
class WindowsFactory implements GUIFactory {
    Button createButton() { return new WindowsButton(); }
    Checkbox createCheckbox() { return new WindowsCheckbox(); }
}

// 3. Client uses factory
void renderUI(GUIFactory factory) {
    Button btn = factory.createButton();      // Windows or Mac
    Checkbox check = factory.createCheckbox(); // Matches button
}
```

---

### **Key Trade-Offs**

| **Aspect** | **With Abstract Factory** | **Without Abstract Factory** |
|------------|--------------------------|------------------------------|
| **Consistency** | Guaranteed (products match) | Manual (easy to mix incompatibly) |
| **Flexibility** | High (swap families easily) | Low (hard-coded dependencies) |
| **Code Complexity** | Higher (many interfaces) | Lower (direct instantiation) |
| **Adding New Product** | Hard (modify all factories) | Easy (just create class) |
| **Adding New Family** | Easy (new factory class) | Hard (modify client code) |
| **Testability** | Easy (swap test factory) | Hard (can't mock construction) |
| **Learning Curve** | Medium (understand pattern) | Low (straightforward) |

---

### **Decision Framework**

```
Should I Use Abstract Factory?
═══════════════════════════════

✅ Use Abstract Factory When:
- Multiple product types (3+) that must work together
- Products need to be compatible (same family)
- Switch entire families at once (all Windows or all Mac)
- Expect to add new families (Windows, Mac, Linux)
- Testing needs different implementations (prod vs test)

❌ Skip Abstract Factory When:
- Only 1-2 product types (use Factory Method)
- Products are independent (don't need compatibility)
- Only one variant exists (no abstraction needed)
- Adding products is more common than adding families
- Team unfamiliar with pattern (steep learning curve)

🤔 Consider Abstract Factory When:
- Building multi-platform applications
- Abstracting cloud providers (AWS, GCP, Azure)
- Supporting multiple databases (PostgreSQL, MySQL)
- Different environments (prod, test, dev)
- Theming/skinning systems
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Clearly Distinguish from Factory Method**
- Factory Method: ONE product type
- Abstract Factory: FAMILY of related products
- Show you understand the key difference

✅ **Emphasize Compatibility Guarantee**
- "The pattern ensures all products from same factory work together"
- "Can't accidentally mix Windows button with Mac checkbox"
- "Compiler enforces consistency"

✅ **Provide Real Examples**
- JDBC: DriverManager creates compatible database objects
- AWS SDK: Region-specific clients that work together
- Spring: Production vs test implementations
- UI frameworks: Theme-consistent components

✅ **Discuss When NOT to Use**
- "Abstract Factory is overkill if products are independent"
- "Only use when you need guaranteed product compatibility"
- "For single products, Factory Method is simpler"

✅ **Show Spring Integration**
- "In production, I combine Abstract Factory with Spring DI"
- "@ConditionalOnProperty to select factory based on configuration"
- "Easy to switch implementations without code changes"

✅ **Connect to Real Problems**
- Multi-cloud strategy (vendor independence)
- Testing (prod vs test implementations)
- Disaster recovery (automatic failover)
- Cost optimization (route to cheapest provider)

**Interview Script:**
> "Abstract Factory creates families of related objects that must be compatible. Unlike Factory Method which creates one product type, Abstract Factory creates multiple related products—like buttons, text fields, and checkboxes that all match the same theme.
>
> The key benefit is guaranteed consistency. If you use WindowsFactory, you get all Windows-style components. If you use MacFactory, you get all Mac-style components. You can't accidentally mix them.
>
> I've used this for database abstraction layers where Connection, QueryBuilder, and TransactionManager must be compatible—can't mix PostgreSQL connection with MySQL transaction manager. And for multi-cloud systems where Storage, Compute, and Database services must all be from the same provider.
>
> The trade-off is complexity—requires many interfaces and classes. It's overkill if products don't need to be compatible. But when you need to switch entire product families while ensuring consistency, Abstract Factory is the right pattern."

---

**End of Topic 181: Abstract Factory Pattern**
