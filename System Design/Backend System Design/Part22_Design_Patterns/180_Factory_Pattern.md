# 180. Factory Pattern

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Factory Pattern** is a creational design pattern that provides an interface for creating objects without specifying their exact class. Instead of calling constructors directly (`new SomeClass()`), you call a factory method that returns an instance of the appropriate type based on the input parameters or configuration.

### **What It Is**

The Factory Pattern comes in three flavors:

1. **Simple Factory (Factory Method):** Static method that returns objects based on parameters
2. **Factory Method Pattern:** Subclasses decide which class to instantiate
3. **Abstract Factory Pattern:** Families of related objects without specifying concrete classes

**Core Concept:**
```java
// Without Factory (Direct instantiation)
PaymentProcessor processor = new StripePaymentProcessor();

// With Factory (Indirect instantiation)
PaymentProcessor processor = PaymentProcessorFactory.create("stripe");
```

**Key Benefits:**
- **Encapsulation:** Object creation logic hidden from client
- **Flexibility:** Easy to add new types without changing client code
- **Loose Coupling:** Client depends on interface, not concrete classes
- **Single Responsibility:** Creation logic separated from business logic

---

### **Why It Exists**

**Problem It Solves:**

```java
// BAD: Client code tightly coupled to concrete classes
public class PaymentService {
    
    public void processPayment(String paymentMethod, BigDecimal amount) {
        PaymentProcessor processor;
        
        // Client code knows about all concrete implementations
        if (paymentMethod.equals("stripe")) {
            processor = new StripePaymentProcessor(apiKey, secretKey);
        } else if (paymentMethod.equals("paypal")) {
            processor = new PayPalPaymentProcessor(clientId, clientSecret);
        } else if (paymentMethod.equals("square")) {
            processor = new SquarePaymentProcessor(accessToken);
        } else if (paymentMethod.equals("braintree")) {
            processor = new BraintreePaymentProcessor(merchantId, publicKey, privateKey);
        } else {
            throw new IllegalArgumentException("Unknown payment method");
        }
        
        processor.process(amount);
    }
}

// Problems:
// ❌ Client code knows about all implementations
// ❌ Adding new payment method requires changing client code
// ❌ Constructor details exposed (API keys, configuration)
// ❌ Violates Open-Closed Principle
// ❌ Hard to test (can't mock constructors)
```

**Solution with Factory:**

```java
// GOOD: Client code decoupled from concrete classes
public class PaymentService {
    
    private final PaymentProcessorFactory factory;
    
    public PaymentService(PaymentProcessorFactory factory) {
        this.factory = factory;
    }
    
    public void processPayment(String paymentMethod, BigDecimal amount) {
        // Client doesn't know about concrete implementations
        PaymentProcessor processor = factory.create(paymentMethod);
        processor.process(amount);
    }
}

// Factory encapsulates creation logic
@Component
public class PaymentProcessorFactory {
    
    private final Map<String, PaymentProcessor> processors;
    
    public PaymentProcessorFactory(
            StripePaymentProcessor stripe,
            PayPalPaymentProcessor paypal,
            SquarePaymentProcessor square) {
        this.processors = Map.of(
            "stripe", stripe,
            "paypal", paypal,
            "square", square
        );
    }
    
    public PaymentProcessor create(String type) {
        PaymentProcessor processor = processors.get(type);
        if (processor == null) {
            throw new IllegalArgumentException("Unknown payment method: " + type);
        }
        return processor;
    }
}

// Benefits:
// ✓ Client code isolated from implementations
// ✓ Adding new payment method: add to factory only
// ✓ Configuration centralized
// ✓ Follows Open-Closed Principle
// ✓ Easy to test (inject mock factory)
```

---

### **Where and When Used**

**Common Use Cases at FAANG:**

1. **Payment Processing:** Different payment gateways (Stripe, PayPal, Square)
2. **Notification Delivery:** Email, SMS, Push, Slack channels
3. **Data Storage:** Different database types (SQL, NoSQL, Cache)
4. **File Parsing:** CSV, JSON, XML, Protobuf parsers
5. **Authentication:** OAuth, SAML, JWT, Basic Auth strategies
6. **Cloud Providers:** AWS, GCP, Azure resource creation
7. **Message Serialization:** JSON, XML, Protobuf, Avro serializers
8. **Caching Strategies:** Redis, Memcached, Caffeine, Ehcache

**Real Examples:**

```java
// Spring Framework (uses factories extensively)
ApplicationContext ctx = new AnnotationConfigApplicationContext(AppConfig.class);
UserService service = ctx.getBean(UserService.class);  // Factory method

// JDBC (DriverManager is a factory)
Connection conn = DriverManager.getConnection(url);  // Returns appropriate driver

// SLF4J (LoggerFactory)
Logger logger = LoggerFactory.getLogger(MyClass.class);  // Returns appropriate logger

// Java Collections
List<String> list = Collections.emptyList();  // Factory method
```

---

### **Role in Large-Scale Distributed Systems**

**Scenario: Multi-Region Notification System**

```java
// Without Factory (Hard to scale)
public class NotificationService {
    public void sendNotification(User user, String message) {
        if (user.getRegion().equals("US")) {
            TwilioSMSService twilioUS = new TwilioSMSService("us-account-sid");
            twilioUS.send(user.getPhone(), message);
        } else if (user.getRegion().equals("EU")) {
            VonageSMSService vonageEU = new VonageSMSService("eu-api-key");
            vonageEU.send(user.getPhone(), message);
        } else if (user.getRegion().equals("ASIA")) {
            InfobipSMSService infobipAsia = new InfobipSMSService("asia-username");
            infobipAsia.send(user.getPhone(), message);
        }
    }
}

// Problems:
// ❌ Adding region requires code change
// ❌ Region-specific configuration scattered
// ❌ Can't deploy region-specific providers independently
// ❌ Hard to test (real SMS services called)
```

**With Factory (Scales Easily):**

```java
@Service
public class NotificationService {
    
    private final SMSProviderFactory factory;
    
    public NotificationService(SMSProviderFactory factory) {
        this.factory = factory;
    }
    
    public void sendNotification(User user, String message) {
        SMSProvider provider = factory.getProviderForRegion(user.getRegion());
        provider.send(user.getPhone(), message);
    }
}

@Component
public class SMSProviderFactory {
    
    private final Map<String, SMSProvider> regionProviders;
    
    public SMSProviderFactory(
            @Qualifier("us") SMSProvider usProvider,
            @Qualifier("eu") SMSProvider euProvider,
            @Qualifier("asia") SMSProvider asiaProvider) {
        this.regionProviders = Map.of(
            "US", usProvider,
            "EU", euProvider,
            "ASIA", asiaProvider
        );
    }
    
    public SMSProvider getProviderForRegion(String region) {
        SMSProvider provider = regionProviders.get(region);
        if (provider == null) {
            throw new IllegalArgumentException("No SMS provider for region: " + region);
        }
        return provider;
    }
}

// Configuration (separate file, can be changed without code deployment)
@Configuration
public class SMSProviderConfig {
    
    @Bean("us")
    public SMSProvider usProvider() {
        return new TwilioSMSService(twilioAccountSid, twilioAuthToken);
    }
    
    @Bean("eu")
    public SMSProvider euProvider() {
        return new VonageSMSService(vonageApiKey, vonageApiSecret);
    }
    
    @Bean("asia")
    public SMSProvider asiaProvider() {
        return new InfobipSMSService(infobipUsername, infobipPassword);
    }
}

// Benefits:
// ✓ Add new region: Update configuration only (no code change)
// ✓ Region-specific providers can be deployed independently
// ✓ Easy to test (inject mock factory)
// ✓ Configuration centralized
// ✓ Can switch providers per region dynamically
```

---

### **Business Impact**

**Development Velocity:**
```
Without Factory:
- New payment gateway: Change 15 files (service, tests, config)
- Risk: Breaking existing payment methods
- Time: 3 days (code + testing)
- Code review: Complex (many changes)

With Factory:
- New payment gateway: Add one implementation + register in factory
- Risk: Isolated (existing methods unaffected)
- Time: 4 hours (implementation + test)
- Code review: Simple (small, focused change)

Impact: 6x faster development for new integrations
```

**Production Flexibility:**
```
Real scenario (E-commerce company):

Black Friday spike → Primary payment gateway (Stripe) hit rate limits
Without Factory: Emergency code change + deployment (30 minutes downtime)
With Factory: Configuration change to fallback gateway (0 downtime)

Business impact:
- Lost sales: $0 (vs $50K with downtime)
- Customer trust: Maintained
- Engineering cost: Minimal (config change vs emergency deployment)
```

**Cost Optimization:**
```
Multi-cloud strategy:

// Factory allows switching cloud providers based on cost/performance
@Component
public class CloudStorageFactory {
    
    public StorageProvider create(String fileType, String region) {
        // Large files → AWS S3 (cheaper for large objects)
        if (fileSize > 100_MB) {
            return awsS3Provider;
        }
        // Small files, Europe → Cloudflare R2 (cheaper egress)
        if (region.equals("EU")) {
            return cloudflareR2Provider;
        }
        // Default
        return gcpCloudStorageProvider;
    }
}

// Dynamically route to cheapest provider
// Impact: 40% reduction in storage costs ($200K/year savings)
```

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Three Types of Factory Patterns**

#### **1. Simple Factory (Not a Gang of Four Pattern)**

```java
// Simple Factory: Static method returns objects based on parameter
public class NotificationFactory {
    
    public static Notification create(String type, String message) {
        switch (type.toLowerCase()) {
            case "email":
                return new EmailNotification(message);
            case "sms":
                return new SMSNotification(message);
            case "push":
                return new PushNotification(message);
            default:
                throw new IllegalArgumentException("Unknown notification type: " + type);
        }
    }
}

// Usage
Notification notification = NotificationFactory.create("email", "Welcome!");
notification.send();

// Pros:
// ✓ Simple to implement
// ✓ Centralizes object creation
// ✓ Client code cleaner

// Cons:
// ❌ Violates Open-Closed Principle (need to modify factory for new types)
// ❌ Static method (hard to test, can't override)
// ❌ Can become God class (knows about all types)
```

---

#### **2. Factory Method Pattern (Gang of Four)**

**Definition:** Define an interface for creating objects, but let subclasses decide which class to instantiate.

```java
// Product interface
public interface PaymentProcessor {
    PaymentResult process(BigDecimal amount);
}

// Concrete products
public class StripePaymentProcessor implements PaymentProcessor {
    @Override
    public PaymentResult process(BigDecimal amount) {
        // Stripe-specific logic
        return new PaymentResult("stripe-tx-123", true);
    }
}

public class PayPalPaymentProcessor implements PaymentProcessor {
    @Override
    public PaymentResult process(BigDecimal amount) {
        // PayPal-specific logic
        return new PaymentResult("paypal-tx-456", true);
    }
}

// Creator (abstract class with factory method)
public abstract class PaymentService {
    
    // Factory method (subclasses implement)
    protected abstract PaymentProcessor createProcessor();
    
    // Business logic (uses factory method)
    public PaymentResult processPayment(BigDecimal amount) {
        PaymentProcessor processor = createProcessor();
        
        // Common pre-processing
        logPaymentAttempt(amount);
        
        // Delegate to specific processor
        PaymentResult result = processor.process(amount);
        
        // Common post-processing
        logPaymentResult(result);
        
        return result;
    }
    
    private void logPaymentAttempt(BigDecimal amount) {
        System.out.println("Processing payment: $" + amount);
    }
    
    private void logPaymentResult(PaymentResult result) {
        System.out.println("Payment result: " + result.getStatus());
    }
}

// Concrete creators (each returns different product)
public class StripePaymentService extends PaymentService {
    @Override
    protected PaymentProcessor createProcessor() {
        return new StripePaymentProcessor();
    }
}

public class PayPalPaymentService extends PaymentService {
    @Override
    protected PaymentProcessor createProcessor() {
        return new PayPalPaymentProcessor();
    }
}

// Usage
PaymentService service = new StripePaymentService();
PaymentResult result = service.processPayment(new BigDecimal("99.99"));

// Pros:
// ✓ Follows Open-Closed Principle (add new types via subclasses)
// ✓ Single Responsibility (each creator knows its product)
// ✓ Flexibility (can override creation behavior)

// Cons:
// ❌ Requires subclass for each product type
// ❌ More complex than simple factory
// ❌ Inheritance-based (less flexible than composition)
```

---

#### **3. Abstract Factory Pattern (Gang of Four)**

**Definition:** Create families of related objects without specifying their concrete classes.

```java
// Abstract products (family of related objects)
public interface Button {
    void render();
}

public interface TextField {
    void render();
}

public interface Checkbox {
    void render();
}

// Concrete products for Windows theme
public class WindowsButton implements Button {
    @Override
    public void render() {
        System.out.println("Rendering Windows-style button");
    }
}

public class WindowsTextField implements TextField {
    @Override
    public void render() {
        System.out.println("Rendering Windows-style text field");
    }
}

public class WindowsCheckbox implements Checkbox {
    @Override
    public void render() {
        System.out.println("Rendering Windows-style checkbox");
    }
}

// Concrete products for Mac theme
public class MacButton implements Button {
    @Override
    public void render() {
        System.out.println("Rendering Mac-style button");
    }
}

public class MacTextField implements TextField {
    @Override
    public void render() {
        System.out.println("Rendering Mac-style text field");
    }
}

public class MacCheckbox implements Checkbox {
    @Override
    public void render() {
        System.out.println("Rendering Mac-style checkbox");
    }
}

// Abstract factory (creates family of products)
public interface GUIFactory {
    Button createButton();
    TextField createTextField();
    Checkbox createCheckbox();
}

// Concrete factory for Windows
public class WindowsFactory implements GUIFactory {
    @Override
    public Button createButton() {
        return new WindowsButton();
    }
    
    @Override
    public TextField createTextField() {
        return new WindowsTextField();
    }
    
    @Override
    public Checkbox createCheckbox() {
        return new WindowsCheckbox();
    }
}

// Concrete factory for Mac
public class MacFactory implements GUIFactory {
    @Override
    public Button createButton() {
        return new MacButton();
    }
    
    @Override
    public TextField createTextField() {
        return new MacTextField();
    }
    
    @Override
    public Checkbox createCheckbox() {
        return new MacCheckbox();
    }
}

// Client code (works with abstract factory)
public class Application {
    
    private final GUIFactory factory;
    
    public Application(GUIFactory factory) {
        this.factory = factory;
    }
    
    public void renderUI() {
        Button button = factory.createButton();
        TextField textField = factory.createTextField();
        Checkbox checkbox = factory.createCheckbox();
        
        button.render();
        textField.render();
        checkbox.render();
    }
}

// Usage
GUIFactory factory = new WindowsFactory();  // Or MacFactory
Application app = new Application(factory);
app.renderUI();

// Pros:
// ✓ Ensures product compatibility (all Windows or all Mac)
// ✓ Isolates concrete classes
// ✓ Easy to switch entire product family
// ✓ Follows Open-Closed Principle

// Cons:
// ❌ Complex (many interfaces and classes)
// ❌ Adding new product requires changing all factories
// ❌ Overkill for simple scenarios
```

---

### **Real-World Spring Boot Implementation**

#### **Scenario: Multi-Database Support**

```java
// Product interface
public interface DatabaseClient {
    void connect();
    void executeQuery(String query);
    void disconnect();
}

// Concrete products
@Component
public class PostgreSQLClient implements DatabaseClient {
    
    private final DataSource dataSource;
    
    public PostgreSQLClient(@Qualifier("postgresDataSource") DataSource dataSource) {
        this.dataSource = dataSource;
    }
    
    @Override
    public void connect() {
        System.out.println("Connecting to PostgreSQL...");
    }
    
    @Override
    public void executeQuery(String query) {
        System.out.println("Executing PostgreSQL query: " + query);
        // Use dataSource to execute query
    }
    
    @Override
    public void disconnect() {
        System.out.println("Disconnecting from PostgreSQL");
    }
}

@Component
public class MySQLClient implements DatabaseClient {
    
    private final DataSource dataSource;
    
    public MySQLClient(@Qualifier("mysqlDataSource") DataSource dataSource) {
        this.dataSource = dataSource;
    }
    
    @Override
    public void connect() {
        System.out.println("Connecting to MySQL...");
    }
    
    @Override
    public void executeQuery(String query) {
        System.out.println("Executing MySQL query: " + query);
    }
    
    @Override
    public void disconnect() {
        System.out.println("Disconnecting from MySQL");
    }
}

@Component
public class MongoDBClient implements DatabaseClient {
    
    private final MongoTemplate mongoTemplate;
    
    public MongoDBClient(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }
    
    @Override
    public void connect() {
        System.out.println("Connecting to MongoDB...");
    }
    
    @Override
    public void executeQuery(String query) {
        System.out.println("Executing MongoDB query: " + query);
        // Use mongoTemplate
    }
    
    @Override
    public void disconnect() {
        System.out.println("Disconnecting from MongoDB");
    }
}

// Factory
@Component
public class DatabaseClientFactory {
    
    private final Map<String, DatabaseClient> clients;
    
    public DatabaseClientFactory(
            PostgreSQLClient postgresClient,
            MySQLClient mysqlClient,
            MongoDBClient mongoClient) {
        this.clients = new HashMap<>();
        this.clients.put("postgres", postgresClient);
        this.clients.put("mysql", mysqlClient);
        this.clients.put("mongodb", mongoClient);
    }
    
    public DatabaseClient getClient(String databaseType) {
        DatabaseClient client = clients.get(databaseType.toLowerCase());
        if (client == null) {
            throw new IllegalArgumentException("Unsupported database: " + databaseType);
        }
        return client;
    }
}

// Service using factory
@Service
public class DataMigrationService {
    
    private final DatabaseClientFactory factory;
    
    public DataMigrationService(DatabaseClientFactory factory) {
        this.factory = factory;
    }
    
    public void migrateData(String sourceDB, String targetDB, String query) {
        DatabaseClient source = factory.getClient(sourceDB);
        DatabaseClient target = factory.getClient(targetDB);
        
        source.connect();
        source.executeQuery(query);
        
        target.connect();
        target.executeQuery(query);
        
        source.disconnect();
        target.disconnect();
    }
}

// Controller
@RestController
@RequestMapping("/api/migration")
public class MigrationController {
    
    private final DataMigrationService migrationService;
    
    public MigrationController(DataMigrationService migrationService) {
        this.migrationService = migrationService;
    }
    
    @PostMapping
    public ResponseEntity<String> migrate(@RequestBody MigrationRequest request) {
        migrationService.migrateData(
            request.getSourceDB(),
            request.getTargetDB(),
            request.getQuery()
        );
        return ResponseEntity.ok("Migration started");
    }
}
```

---

### **Advanced Pattern: Parameterized Factory**

```java
// Factory that creates objects based on complex parameters
@Component
public class PaymentProcessorFactory {
    
    private final ApplicationContext context;
    private final Map<String, Class<? extends PaymentProcessor>> processorTypes;
    
    public PaymentProcessorFactory(ApplicationContext context) {
        this.context = context;
        this.processorTypes = new HashMap<>();
        registerProcessors();
    }
    
    private void registerProcessors() {
        processorTypes.put("stripe", StripePaymentProcessor.class);
        processorTypes.put("paypal", PayPalPaymentProcessor.class);
        processorTypes.put("square", SquarePaymentProcessor.class);
    }
    
    public PaymentProcessor create(PaymentRequest request) {
        // Select processor based on multiple criteria
        String processorType = selectProcessor(request);
        
        // Get prototype-scoped bean (new instance each time)
        Class<? extends PaymentProcessor> processorClass = processorTypes.get(processorType);
        return context.getBean(processorClass);
    }
    
    private String selectProcessor(PaymentRequest request) {
        // Complex selection logic
        
        // Rule 1: Use preferred processor if available
        if (request.getPreferredProcessor() != null) {
            return request.getPreferredProcessor();
        }
        
        // Rule 2: Use region-specific processor
        if (request.getCountry().equals("US")) {
            return "stripe";
        } else if (request.getCountry().equals("UK")) {
            return "paypal";
        }
        
        // Rule 3: Use amount-based routing (large transactions → Stripe)
        if (request.getAmount().compareTo(new BigDecimal("10000")) > 0) {
            return "stripe";
        }
        
        // Default
        return "stripe";
    }
}

// Prototype-scoped beans (new instance each time)
@Component
@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
public class StripePaymentProcessor implements PaymentProcessor {
    // Implementation
}

@Component
@Scope(ConfigurableBeanFactory.SCOPE_PROTOTYPE)
public class PayPalPaymentProcessor implements PaymentProcessor {
    // Implementation
}
```

---

### **Factory with Registry Pattern**

```java
// Self-registering factories
public interface FileParser {
    boolean supports(String fileExtension);
    ParsedData parse(InputStream inputStream);
}

@Component
public class CSVParser implements FileParser {
    @Override
    public boolean supports(String fileExtension) {
        return "csv".equalsIgnoreCase(fileExtension);
    }
    
    @Override
    public ParsedData parse(InputStream inputStream) {
        // CSV parsing logic
        return new ParsedData();
    }
}

@Component
public class JSONParser implements FileParser {
    @Override
    public boolean supports(String fileExtension) {
        return "json".equalsIgnoreCase(fileExtension);
    }
    
    @Override
    public ParsedData parse(InputStream inputStream) {
        // JSON parsing logic
        return new ParsedData();
    }
}

@Component
public class XMLParser implements FileParser {
    @Override
    public boolean supports(String fileExtension) {
        return "xml".equalsIgnoreCase(fileExtension);
    }
    
    @Override
    public ParsedData parse(InputStream inputStream) {
        // XML parsing logic
        return new ParsedData();
    }
}

// Factory with auto-registration
@Component
public class FileParserFactory {
    
    private final List<FileParser> parsers;
    
    // Spring injects all FileParser implementations
    public FileParserFactory(List<FileParser> parsers) {
        this.parsers = parsers;
    }
    
    public FileParser getParser(String filename) {
        String extension = getFileExtension(filename);
        
        return parsers.stream()
            .filter(parser -> parser.supports(extension))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "No parser found for file extension: " + extension
            ));
    }
    
    private String getFileExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot == -1) {
            throw new IllegalArgumentException("File has no extension: " + filename);
        }
        return filename.substring(lastDot + 1);
    }
}

// Usage
@Service
public class FileProcessingService {
    
    private final FileParserFactory factory;
    
    public FileProcessingService(FileParserFactory factory) {
        this.factory = factory;
    }
    
    public ParsedData processFile(String filename, InputStream inputStream) {
        FileParser parser = factory.getParser(filename);
        return parser.parse(inputStream);
    }
}

// Benefits:
// ✓ Adding new parser: Just implement FileParser interface
// ✓ No factory modification needed (auto-registration)
// ✓ Spring handles dependency injection
// ✓ Follows Open-Closed Principle perfectly
```

---

### **Factory with Caching (Object Pool Pattern)**

```java
// Factory that reuses expensive objects
@Component
public class DatabaseConnectionFactory {
    
    private final Map<String, Queue<DatabaseConnection>> connectionPools;
    private final int maxPoolSize = 10;
    
    public DatabaseConnectionFactory() {
        this.connectionPools = new ConcurrentHashMap<>();
    }
    
    public DatabaseConnection getConnection(String database) {
        Queue<DatabaseConnection> pool = connectionPools.computeIfAbsent(
            database,
            k -> new ConcurrentLinkedQueue<>()
        );
        
        // Try to reuse existing connection
        DatabaseConnection conn = pool.poll();
        if (conn != null && conn.isValid()) {
            return conn;
        }
        
        // Create new connection if pool is empty
        return createNewConnection(database);
    }
    
    public void releaseConnection(String database, DatabaseConnection conn) {
        Queue<DatabaseConnection> pool = connectionPools.get(database);
        if (pool != null && pool.size() < maxPoolSize) {
            pool.offer(conn);
        } else {
            conn.close();
        }
    }
    
    private DatabaseConnection createNewConnection(String database) {
        System.out.println("Creating new connection to: " + database);
        return new DatabaseConnection(database);
    }
}

// Usage with try-with-resources pattern
@Service
public class UserRepository {
    
    private final DatabaseConnectionFactory factory;
    
    public UserRepository(DatabaseConnectionFactory factory) {
        this.factory = factory;
    }
    
    public User findById(Long id) {
        DatabaseConnection conn = factory.getConnection("users_db");
        try {
            // Use connection
            return conn.query("SELECT * FROM users WHERE id = ?", id);
        } finally {
            factory.releaseConnection("users_db", conn);
        }
    }
}
```

---

### **Factory with Strategy Pattern**

```java
// Combine Factory with Strategy for powerful abstraction
public interface ExportStrategy {
    String getFormat();
    void export(List<User> users, OutputStream output);
}

@Component
public class CSVExportStrategy implements ExportStrategy {
    @Override
    public String getFormat() {
        return "csv";
    }
    
    @Override
    public void export(List<User> users, OutputStream output) {
        // CSV export logic
        PrintWriter writer = new PrintWriter(output);
        writer.println("id,name,email");
        users.forEach(user -> 
            writer.println(user.getId() + "," + user.getName() + "," + user.getEmail())
        );
        writer.flush();
    }
}

@Component
public class JSONExportStrategy implements ExportStrategy {
    
    private final ObjectMapper objectMapper;
    
    public JSONExportStrategy(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }
    
    @Override
    public String getFormat() {
        return "json";
    }
    
    @Override
    public void export(List<User> users, OutputStream output) {
        try {
            objectMapper.writeValue(output, users);
        } catch (IOException e) {
            throw new RuntimeException("Failed to export JSON", e);
        }
    }
}

@Component
public class PDFExportStrategy implements ExportStrategy {
    @Override
    public String getFormat() {
        return "pdf";
    }
    
    @Override
    public void export(List<User> users, OutputStream output) {
        // PDF export logic using iText or similar
    }
}

// Factory
@Component
public class ExportStrategyFactory {
    
    private final Map<String, ExportStrategy> strategies;
    
    public ExportStrategyFactory(List<ExportStrategy> strategyList) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(
                ExportStrategy::getFormat,
                Function.identity()
            ));
    }
    
    public ExportStrategy getStrategy(String format) {
        ExportStrategy strategy = strategies.get(format.toLowerCase());
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported format: " + format);
        }
        return strategy;
    }
}

// Service
@Service
public class UserExportService {
    
    private final UserRepository userRepository;
    private final ExportStrategyFactory strategyFactory;
    
    public UserExportService(
            UserRepository userRepository,
            ExportStrategyFactory strategyFactory) {
        this.userRepository = userRepository;
        this.strategyFactory = strategyFactory;
    }
    
    public void exportUsers(String format, OutputStream output) {
        List<User> users = userRepository.findAll();
        ExportStrategy strategy = strategyFactory.getStrategy(format);
        strategy.export(users, output);
    }
}

// Controller
@RestController
@RequestMapping("/api/users/export")
public class UserExportController {
    
    private final UserExportService exportService;
    
    public UserExportController(UserExportService exportService) {
        this.exportService = exportService;
    }
    
    @GetMapping
    public void exportUsers(
            @RequestParam String format,
            HttpServletResponse response) throws IOException {
        
        response.setContentType(getContentType(format));
        response.setHeader("Content-Disposition", 
            "attachment; filename=users." + format);
        
        exportService.exportUsers(format, response.getOutputStream());
    }
    
    private String getContentType(String format) {
        switch (format.toLowerCase()) {
            case "csv": return "text/csv";
            case "json": return "application/json";
            case "pdf": return "application/pdf";
            default: return "application/octet-stream";
        }
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### **Performance Impact: Factory vs Direct Instantiation**

**Scenario: High-throughput API (10,000 requests/second)**

**Approach 1: Direct Instantiation (Without Factory)**

```java
public class NotificationService {
    public void sendNotification(String type, String message) {
        if (type.equals("email")) {
            EmailSender sender = new EmailSender();
            sender.send(message);
        } else if (type.equals("sms")) {
            SMSSender sender = new SMSSender();
            sender.send(message);
        }
    }
}

// Performance:
// - Object creation: 0.01ms per instance
// - 10,000 req/sec × 0.01ms = 100ms/sec CPU time
// - But: Recreating objects every time (garbage collection overhead)
// - GC pauses: 50ms every 1 second (5% of time)
// - Effective throughput: 9,500 req/sec (5% lost to GC)
```

**Approach 2: Factory with Singleton Instances (Best)**

```java
@Component
public class NotificationFactory {
    
    private final EmailSender emailSender;
    private final SMSSender smsSender;
    
    public NotificationFactory(EmailSender emailSender, SMSSender smsSender) {
        this.emailSender = emailSender;  // Created once by Spring
        this.smsSender = smsSender;      // Created once by Spring
    }
    
    public Sender getSender(String type) {
        if (type.equals("email")) {
            return emailSender;  // Return existing instance
        } else if (type.equals("sms")) {
            return smsSender;    // Return existing instance
        }
        throw new IllegalArgumentException("Unknown type");
    }
}

// Performance:
// - Object creation: 0 (reuse existing instances)
// - Lookup time: 0.001ms per request
// - 10,000 req/sec × 0.001ms = 10ms/sec CPU time
// - GC pauses: 5ms every 10 seconds (0.05% of time)
// - Effective throughput: 10,000 req/sec (no loss)

// Improvement: 10x less CPU time, 100x less GC overhead
```

**Capacity Calculation:**

```
E-commerce notification system:

Traffic:
- 1M daily active users
- 10 notifications per user per day
- 10M notifications per day
- Peak: 5x average = 50M notifications / day
- Peak QPS: 50M / 86400 sec = 579 req/sec

Without Factory:
- CPU per request: 0.01ms (object creation) + 2ms (business logic) = 2.01ms
- Requests per second per core: 1000ms / 2.01ms = 497 req/sec
- Cores needed: 579 / 497 = 1.17 → 2 cores
- Server cost (8 cores): $100/month
- Servers needed: 1 (plenty of headroom)

With Factory:
- CPU per request: 0.001ms (lookup) + 2ms (business logic) = 2.001ms
- Requests per second per core: 1000ms / 2.001ms = 499 req/sec
- Cores needed: 579 / 499 = 1.16 → 2 cores
- Server cost: Same ($100/month)

Looks similar? But consider growth:

Scale to 10M DAU (10x growth):

Without Factory:
- Peak QPS: 5,790 req/sec
- Cores needed: 5790 / 497 = 11.6 → 12 cores
- Servers needed (8 cores each): 12 / 8 = 1.5 → 2 servers
- Cost: 2 × $100 = $200/month
- Plus: GC overhead increases (more objects)
- Actual cores needed: 12 × 1.05 (GC) = 12.6 → 13 cores → 2 servers

With Factory:
- Peak QPS: 5,790 req/sec
- Cores needed: 5790 / 499 = 11.6 → 12 cores
- Servers needed: 12 / 8 = 1.5 → 2 servers
- Cost: 2 × $100 = $200/month
- GC overhead: Minimal (no new objects)
- Actual cores needed: 12 cores → 2 servers

Difference at scale:
- Without factory: More GC pauses, potential OOM errors at peak
- With factory: Stable, predictable performance
- Operational benefit: Fewer production incidents
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Factory Pattern for Multi-Tenancy**

```java
// Multi-tenant system with separate databases per tenant
@Component
public class TenantDataSourceFactory {
    
    private final Map<String, DataSource> dataSources = new ConcurrentHashMap<>();
    private final DataSourceProperties properties;
    
    public TenantDataSourceFactory(DataSourceProperties properties) {
        this.properties = properties;
    }
    
    public DataSource getDataSource(String tenantId) {
        return dataSources.computeIfAbsent(tenantId, this::createDataSource);
    }
    
    private DataSource createDataSource(String tenantId) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(properties.getUrl().replace("{tenant}", tenantId));
        config.setUsername(properties.getUsername());
        config.setPassword(properties.getPassword());
        config.setMaximumPoolSize(10);
        config.setConnectionTimeout(5000);
        
        return new HikariDataSource(config);
    }
}

// Tenant context (thread-local)
public class TenantContext {
    private static final ThreadLocal<String> currentTenant = new ThreadLocal<>();
    
    public static void setTenantId(String tenantId) {
        currentTenant.set(tenantId);
    }
    
    public static String getTenantId() {
        return currentTenant.get();
    }
    
    public static void clear() {
        currentTenant.remove();
    }
}

// Repository that uses factory
@Repository
public class UserRepository {
    
    private final TenantDataSourceFactory dataSourceFactory;
    
    public UserRepository(TenantDataSourceFactory dataSourceFactory) {
        this.dataSourceFactory = dataSourceFactory;
    }
    
    public List<User> findAll() {
        String tenantId = TenantContext.getTenantId();
        DataSource dataSource = dataSourceFactory.getDataSource(tenantId);
        
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        return jdbcTemplate.query(
            "SELECT * FROM users",
            (rs, rowNum) -> new User(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("email")
            )
        );
    }
}

// Filter to set tenant context
@Component
public class TenantFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        // Extract tenant ID from header
        String tenantId = httpRequest.getHeader("X-Tenant-ID");
        
        try {
            TenantContext.setTenantId(tenantId);
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
```

---

### **Factory for Database Sharding**

```java
// Shard selection based on user ID
@Component
public class ShardedDataSourceFactory {
    
    private final List<DataSource> shards;
    
    public ShardedDataSourceFactory(
            @Qualifier("shard1") DataSource shard1,
            @Qualifier("shard2") DataSource shard2,
            @Qualifier("shard3") DataSource shard3,
            @Qualifier("shard4") DataSource shard4) {
        this.shards = List.of(shard1, shard2, shard3, shard4);
    }
    
    public DataSource getDataSource(Long userId) {
        int shardIndex = Math.abs(userId.hashCode() % shards.size());
        return shards.get(shardIndex);
    }
}

@Repository
public class UserRepository {
    
    private final ShardedDataSourceFactory factory;
    
    public UserRepository(ShardedDataSourceFactory factory) {
        this.factory = factory;
    }
    
    public User findById(Long userId) {
        DataSource dataSource = factory.getDataSource(userId);
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        
        return jdbcTemplate.queryForObject(
            "SELECT * FROM users WHERE id = ?",
            new Object[]{userId},
            (rs, rowNum) -> new User(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("email")
            )
        );
    }
    
    public void save(User user) {
        DataSource dataSource = factory.getDataSource(user.getId());
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        
        jdbcTemplate.update(
            "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
            user.getId(),
            user.getName(),
            user.getEmail()
        );
    }
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Factory with Circuit Breaker**

```java
// Factory that wraps payment processors with circuit breakers
@Component
public class ResilientPaymentProcessorFactory {
    
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final Map<String, PaymentProcessor> processors;
    
    public ResilientPaymentProcessorFactory(
            CircuitBreakerRegistry circuitBreakerRegistry,
            StripePaymentProcessor stripe,
            PayPalPaymentProcessor paypal,
            SquarePaymentProcessor square) {
        this.circuitBreakerRegistry = circuitBreakerRegistry;
        this.processors = Map.of(
            "stripe", stripe,
            "paypal", paypal,
            "square", square
        );
    }
    
    public PaymentProcessor create(String type) {
        PaymentProcessor processor = processors.get(type);
        if (processor == null) {
            throw new IllegalArgumentException("Unknown payment processor: " + type);
        }
        
        // Wrap with circuit breaker
        CircuitBreaker circuitBreaker = circuitBreakerRegistry.circuitBreaker(type);
        return new CircuitBreakerPaymentProcessor(processor, circuitBreaker);
    }
}

// Wrapper that applies circuit breaker
public class CircuitBreakerPaymentProcessor implements PaymentProcessor {
    
    private final PaymentProcessor delegate;
    private final CircuitBreaker circuitBreaker;
    
    public CircuitBreakerPaymentProcessor(
            PaymentProcessor delegate,
            CircuitBreaker circuitBreaker) {
        this.delegate = delegate;
        this.circuitBreaker = circuitBreaker;
    }
    
    @Override
    public PaymentResult process(BigDecimal amount) {
        try {
            return circuitBreaker.executeSupplier(() -> delegate.process(amount));
        } catch (CallNotPermittedException e) {
            // Circuit is open, return fallback
            return PaymentResult.failed("Payment processor unavailable");
        }
    }
}

// Configuration
@Configuration
public class Resilience4jConfig {
    
    @Bean
    public CircuitBreakerRegistry circuitBreakerRegistry() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .failureRateThreshold(50)
            .waitDurationInOpenState(Duration.ofSeconds(30))
            .slidingWindowSize(10)
            .build();
        
        return CircuitBreakerRegistry.of(config);
    }
}
```

---

### **Factory with Fallback Strategy**

```java
@Component
public class FallbackPaymentProcessorFactory {
    
    private final PaymentProcessorFactory primaryFactory;
    private final List<String> fallbackOrder = List.of("stripe", "paypal", "square");
    
    public FallbackPaymentProcessorFactory(PaymentProcessorFactory primaryFactory) {
        this.primaryFactory = primaryFactory;
    }
    
    public PaymentResult processWithFallback(String preferredProcessor, BigDecimal amount) {
        // Try preferred processor first
        try {
            PaymentProcessor processor = primaryFactory.create(preferredProcessor);
            PaymentResult result = processor.process(amount);
            if (result.isSuccessful()) {
                return result;
            }
        } catch (Exception e) {
            System.err.println("Preferred processor failed: " + e.getMessage());
        }
        
        // Try fallback processors
        for (String fallbackProcessor : fallbackOrder) {
            if (fallbackProcessor.equals(preferredProcessor)) {
                continue;  // Skip preferred (already tried)
            }
            
            try {
                PaymentProcessor processor = primaryFactory.create(fallbackProcessor);
                PaymentResult result = processor.process(amount);
                if (result.isSuccessful()) {
                    return result;
                }
            } catch (Exception e) {
                System.err.println("Fallback processor failed: " + e.getMessage());
            }
        }
        
        return PaymentResult.failed("All payment processors unavailable");
    }
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### **Factory for Authentication Strategies**

```java
// Authentication strategy interface
public interface AuthenticationStrategy {
    AuthResult authenticate(AuthRequest request);
}

// Concrete strategies
@Component
public class JWTAuthenticationStrategy implements AuthenticationStrategy {
    
    private final JwtService jwtService;
    
    public JWTAuthenticationStrategy(JwtService jwtService) {
        this.jwtService = jwtService;
    }
    
    @Override
    public AuthResult authenticate(AuthRequest request) {
        String token = request.getToken();
        if (jwtService.isValid(token)) {
            String userId = jwtService.extractUserId(token);
            return AuthResult.success(userId);
        }
        return AuthResult.failure("Invalid JWT token");
    }
}

@Component
public class OAuth2AuthenticationStrategy implements AuthenticationStrategy {
    
    private final OAuth2Service oAuth2Service;
    
    public OAuth2AuthenticationStrategy(OAuth2Service oAuth2Service) {
        this.oAuth2Service = oAuth2Service;
    }
    
    @Override
    public AuthResult authenticate(AuthRequest request) {
        String accessToken = request.getToken();
        OAuth2User user = oAuth2Service.getUserInfo(accessToken);
        if (user != null) {
            return AuthResult.success(user.getId());
        }
        return AuthResult.failure("Invalid OAuth2 token");
    }
}

@Component
public class APIKeyAuthenticationStrategy implements AuthenticationStrategy {
    
    private final APIKeyRepository apiKeyRepository;
    
    public APIKeyAuthenticationStrategy(APIKeyRepository apiKeyRepository) {
        this.apiKeyRepository = apiKeyRepository;
    }
    
    @Override
    public AuthResult authenticate(AuthRequest request) {
        String apiKey = request.getApiKey();
        if (apiKeyRepository.isValid(apiKey)) {
            String userId = apiKeyRepository.getUserId(apiKey);
            return AuthResult.success(userId);
        }
        return AuthResult.failure("Invalid API key");
    }
}

// Factory
@Component
public class AuthenticationStrategyFactory {
    
    private final Map<String, AuthenticationStrategy> strategies;
    
    public AuthenticationStrategyFactory(
            JWTAuthenticationStrategy jwtStrategy,
            OAuth2AuthenticationStrategy oauth2Strategy,
            APIKeyAuthenticationStrategy apiKeyStrategy) {
        this.strategies = Map.of(
            "jwt", jwtStrategy,
            "oauth2", oauth2Strategy,
            "apikey", apiKeyStrategy
        );
    }
    
    public AuthenticationStrategy getStrategy(String type) {
        AuthenticationStrategy strategy = strategies.get(type.toLowerCase());
        if (strategy == null) {
            throw new IllegalArgumentException("Unsupported auth type: " + type);
        }
        return strategy;
    }
}

// Filter that uses factory
@Component
public class AuthenticationFilter extends OncePerRequestFilter {
    
    private final AuthenticationStrategyFactory factory;
    
    public AuthenticationFilter(AuthenticationStrategyFactory factory) {
        this.factory = factory;
    }
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        // Determine auth type from header
        String authType = request.getHeader("X-Auth-Type");
        if (authType == null) {
            authType = "jwt";  // Default
        }
        
        try {
            AuthenticationStrategy strategy = factory.getStrategy(authType);
            AuthRequest authRequest = buildAuthRequest(request);
            AuthResult result = strategy.authenticate(authRequest);
            
            if (result.isSuccessful()) {
                // Set security context
                SecurityContextHolder.getContext()
                    .setAuthentication(new UsernamePasswordAuthenticationToken(
                        result.getUserId(), null, Collections.emptyList()
                    ));
                filterChain.doFilter(request, response);
            } else {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write(result.getErrorMessage());
            }
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Authentication failed");
        }
    }
    
    private AuthRequest buildAuthRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        String apiKey = request.getHeader("X-API-Key");
        // Build AuthRequest from headers
        return new AuthRequest(authHeader, apiKey);
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: Stripe's Multi-Provider Payment System**

**Background:**
Stripe processes billions of dollars in payments annually. They support multiple payment methods (credit cards, ACH, SEPA, Alipay, WeChat Pay) and need to route transactions to different processors based on country, amount, and payment method.

**Implementation:**

```java
// Stripe's internal architecture (simplified)
@Service
public class StripePaymentService {
    
    private final PaymentProcessorFactory factory;
    private final RoutingEngine routingEngine;
    
    public StripePaymentService(
            PaymentProcessorFactory factory,
            RoutingEngine routingEngine) {
        this.factory = factory;
        this.routingEngine = routingEngine;
    }
    
    public PaymentResult charge(PaymentRequest request) {
        // Intelligent routing based on multiple factors
        RoutingDecision decision = routingEngine.selectProcessor(request);
        
        // Factory creates appropriate processor
        PaymentProcessor processor = factory.create(decision.getProcessorType());
        
        // Process with retry logic
        return processWithRetry(processor, request, decision.getFallbackProcessors());
    }
    
    private PaymentResult processWithRetry(
            PaymentProcessor processor,
            PaymentRequest request,
            List<String> fallbacks) {
        
        try {
            return processor.process(request);
        } catch (ProcessorException e) {
            // Try fallback processors
            for (String fallback : fallbacks) {
                try {
                    PaymentProcessor fallbackProcessor = factory.create(fallback);
                    return fallbackProcessor.process(request);
                } catch (Exception ex) {
                    // Log and continue
                }
            }
            throw new PaymentFailedException("All processors failed");
        }
    }
}

// Routing engine (complex selection logic)
@Component
public class RoutingEngine {
    
    public RoutingDecision selectProcessor(PaymentRequest request) {
        // Rule 1: Regional compliance (SEPA in EU, ACH in US)
        if (request.getCountry().equals("US") && request.getMethod().equals("ach")) {
            return new RoutingDecision("ach_processor", List.of("wire_processor"));
        }
        
        // Rule 2: Large transactions (> $10K) → Direct bank integration
        if (request.getAmount().compareTo(new BigDecimal("10000")) > 0) {
            return new RoutingDecision("direct_bank", List.of("credit_card"));
        }
        
        // Rule 3: Cost optimization (route to cheapest processor)
        if (request.getCountry().equals("UK")) {
            return new RoutingDecision("low_cost_uk", List.of("standard_uk"));
        }
        
        // Default: Credit card processor
        return new RoutingDecision("credit_card", List.of("backup_card"));
    }
}
```

**Results:**
- **Success rate:** 99.9% (fallback processors increase success)
- **Cost savings:** 15% reduction by intelligent routing
- **Processing time:** <500ms p95 latency
- **Flexibility:** Added 10+ payment methods without changing core logic

---

### **Case Study 2: Netflix's Video Encoding Pipeline**

**Background:**
Netflix encodes videos in 100+ formats (different resolutions, bitrates, codecs) for various devices. They need to create appropriate encoders based on device type, network conditions, and content type.

**Implementation:**

```java
// Encoder factory based on device capabilities
@Component
public class VideoEncoderFactory {
    
    private final Map<String, VideoEncoder> encoders;
    
    public VideoEncoderFactory() {
        this.encoders = new HashMap<>();
        registerEncoders();
    }
    
    private void registerEncoders() {
        // Mobile encoders (lower bitrate, H.264)
        encoders.put("mobile-low", new H264Encoder(480, 800_000));
        encoders.put("mobile-medium", new H264Encoder(720, 2_000_000));
        encoders.put("mobile-high", new H264Encoder(1080, 5_000_000));
        
        // Desktop encoders (higher quality, H.265)
        encoders.put("desktop-hd", new H265Encoder(1080, 8_000_000));
        encoders.put("desktop-4k", new H265Encoder(2160, 25_000_000));
        
        // TV encoders (highest quality, AV1)
        encoders.put("tv-4k", new AV1Encoder(2160, 15_000_000));
        encoders.put("tv-8k", new AV1Encoder(4320, 50_000_000));
    }
    
    public VideoEncoder getEncoder(DeviceProfile device, NetworkConditions network) {
        // Select encoder based on device and network
        if (device.isMobile()) {
            if (network.getBandwidth() < 1_000_000) {
                return encoders.get("mobile-low");
            } else if (network.getBandwidth() < 3_000_000) {
                return encoders.get("mobile-medium");
            } else {
                return encoders.get("mobile-high");
            }
        } else if (device.isTV()) {
            if (device.supports8K()) {
                return encoders.get("tv-8k");
            } else {
                return encoders.get("tv-4k");
            }
        } else {
            // Desktop
            if (device.supports4K()) {
                return encoders.get("desktop-4k");
            } else {
                return encoders.get("desktop-hd");
            }
        }
    }
}

@Service
public class VideoStreamingService {
    
    private final VideoEncoderFactory encoderFactory;
    
    public VideoStreamingService(VideoEncoderFactory encoderFactory) {
        this.encoderFactory = encoderFactory;
    }
    
    public VideoStream streamVideo(
            String videoId,
            DeviceProfile device,
            NetworkConditions network) {
        
        // Get appropriate encoder for device/network
        VideoEncoder encoder = encoderFactory.getEncoder(device, network);
        
        // Encode and stream
        return encoder.encode(videoId);
    }
}
```

**Results:**
- **Adaptive streaming:** Automatically adjusts to device/network
- **Bandwidth savings:** 30% reduction by optimized encoding
- **User experience:** 99.9% playback success rate
- **Scalability:** 200M+ concurrent streams

---

### **Case Study 3: AWS SDK (Factory Pattern Throughout)**

**Background:**
AWS SDK provides access to 200+ services. Each service client needs different configuration (region, credentials, retry policies).

**Implementation:**

```java
// AWS SDK uses builder pattern (a form of factory)
public class AWSClientFactory {
    
    private final String region;
    private final AWSCredentialsProvider credentialsProvider;
    
    public AWSClientFactory(String region, AWSCredentialsProvider credentialsProvider) {
        this.region = region;
        this.credentialsProvider = credentialsProvider;
    }
    
    public AmazonS3 createS3Client() {
        return AmazonS3ClientBuilder.standard()
            .withRegion(region)
            .withCredentials(credentialsProvider)
            .withClientConfiguration(new ClientConfiguration()
                .withMaxConnections(100)
                .withConnectionTimeout(5000)
                .withSocketTimeout(10000)
                .withRetryPolicy(PredefinedRetryPolicies.getDynamoDBDefaultRetryPolicy())
            )
            .build();
    }
    
    public AmazonDynamoDB createDynamoDBClient() {
        return AmazonDynamoDBClientBuilder.standard()
            .withRegion(region)
            .withCredentials(credentialsProvider)
            .withClientConfiguration(new ClientConfiguration()
                .withMaxConnections(50)
                .withConnectionTimeout(2000)
                .withSocketTimeout(5000)
            )
            .build();
    }
    
    public AmazonSQS createSQSClient() {
        return AmazonSQSClientBuilder.standard()
            .withRegion(region)
            .withCredentials(credentialsProvider)
            .build();
    }
}

// Usage in application
@Configuration
public class AWSConfig {
    
    @Bean
    public AWSClientFactory awsClientFactory() {
        return new AWSClientFactory(
            "us-east-1",
            new DefaultAWSCredentialsProviderChain()
        );
    }
    
    @Bean
    public AmazonS3 amazonS3(AWSClientFactory factory) {
        return factory.createS3Client();
    }
    
    @Bean
    public AmazonDynamoDB amazonDynamoDB(AWSClientFactory factory) {
        return factory.createDynamoDBClient();
    }
}
```

**Benefits:**
- **Consistent configuration:** All clients use same credentials/region
- **Easy to switch regions:** Change factory configuration
- **Testable:** Inject mock clients
- **Maintainable:** Centralized client creation

---

### **Case Study 4: Spring Framework's BeanFactory**

**Background:**
Spring's `ApplicationContext` is essentially a sophisticated factory that creates and manages beans.

**How It Works:**

```java
// Spring's internal factory mechanism (simplified)
public class SimpleBeanFactory {
    
    private final Map<String, Object> singletonBeans = new ConcurrentHashMap<>();
    private final Map<Class<?>, Constructor<?>> constructors = new HashMap<>();
    
    public <T> T getBean(Class<T> beanClass) {
        // Check if singleton exists
        Object bean = singletonBeans.get(beanClass.getName());
        if (bean != null) {
            return beanClass.cast(bean);
        }
        
        // Create new instance
        return createBean(beanClass);
    }
    
    private <T> T createBean(Class<T> beanClass) {
        try {
            // Get constructor
            Constructor<T> constructor = beanClass.getDeclaredConstructor();
            
            // Create instance
            T instance = constructor.newInstance();
            
            // Store as singleton
            singletonBeans.put(beanClass.getName(), instance);
            
            return instance;
        } catch (Exception e) {
            throw new BeanCreationException("Failed to create bean", e);
        }
    }
}

// Real Spring usage
@Configuration
public class AppConfig {
    
    @Bean
    public UserService userService(UserRepository userRepository) {
        return new UserService(userRepository);  // Factory method
    }
    
    @Bean
    public UserRepository userRepository(DataSource dataSource) {
        return new UserRepository(dataSource);  // Factory method
    }
}

// Spring creates beans automatically
ApplicationContext context = new AnnotationConfigApplicationContext(AppConfig.class);
UserService service = context.getBean(UserService.class);  // Factory pattern
```

**Why Spring Uses Factory:**
- **Lifecycle management:** Control creation, initialization, destruction
- **Dependency injection:** Resolve dependencies automatically
- **Lazy loading:** Create beans only when needed
- **Scopes:** Singleton, prototype, request, session
- **AOP:** Wrap beans with proxies transparently

---

### **Case Study 5: Dropbox's File Storage System**

**Background:**
Dropbox stores files across multiple cloud providers (AWS S3, Google Cloud Storage, Azure Blob) for redundancy and cost optimization.

**Implementation:**

```java
@Component
public class CloudStorageFactory {
    
    private final Map<String, CloudStorageProvider> providers;
    private final CostOptimizer costOptimizer;
    
    public CloudStorageFactory(
            S3StorageProvider s3,
            GCSStorageProvider gcs,
            AzureBlobStorageProvider azure,
            CostOptimizer costOptimizer) {
        this.providers = Map.of(
            "s3", s3,
            "gcs", gcs,
            "azure", azure
        );
        this.costOptimizer = costOptimizer;
    }
    
    public CloudStorageProvider selectProvider(FileMetadata file) {
        // Intelligent selection based on cost and performance
        
        // Rule 1: Large files (> 1GB) → S3 (cheapest for large files)
        if (file.getSize() > 1_000_000_000L) {
            return providers.get("s3");
        }
        
        // Rule 2: Frequently accessed files → GCS (better performance)
        if (file.getAccessCount() > 100) {
            return providers.get("gcs");
        }
        
        // Rule 3: Use cost optimizer for others
        String cheapestProvider = costOptimizer.getCheapestProvider(file);
        return providers.get(cheapestProvider);
    }
}

@Service
public class FileStorageService {
    
    private final CloudStorageFactory storageFactory;
    
    public FileStorageService(CloudStorageFactory storageFactory) {
        this.storageFactory = storageFactory;
    }
    
    public void uploadFile(FileMetadata metadata, InputStream content) {
        // Select optimal provider
        CloudStorageProvider provider = storageFactory.selectProvider(metadata);
        
        // Upload to selected provider
        String url = provider.upload(metadata.getFileName(), content);
        
        // Store metadata with provider info
        metadata.setStorageProvider(provider.getName());
        metadata.setStorageUrl(url);
    }
    
    public InputStream downloadFile(FileMetadata metadata) {
        // Get provider from metadata
        CloudStorageProvider provider = storageFactory.getProvider(
            metadata.getStorageProvider()
        );
        
        // Download from that provider
        return provider.download(metadata.getStorageUrl());
    }
}
```

**Results:**
- **Cost savings:** 25% reduction by intelligent routing
- **Reliability:** 99.999% durability (multi-provider redundancy)
- **Performance:** Files served from optimal provider
- **Flexibility:** Easy to add/remove providers

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "The Factory Pattern is a creational design pattern that encapsulates object creation logic. Instead of calling constructors directly with `new`, you call a factory method that returns an instance based on parameters or configuration.
>
> **I've used this extensively in production systems.** For example, in a payment processing service I built, we supported multiple payment gateways—Stripe, PayPal, and Square. Without a factory, the service class would have if-else chains checking the payment method and instantiating the appropriate processor, knowing all the constructor details and API keys. This violates the Open-Closed Principle—every new gateway requires modifying the service class.
>
> **With a factory, I created a `PaymentProcessorFactory`** that mapped payment method strings to processor implementations. Spring injected all processor implementations into the factory constructor, and the factory just did a map lookup. The service class doesn't know about concrete processors—it just calls `factory.create("stripe")` and gets back a `PaymentProcessor` interface.
>
> **There are three types of factory patterns:**
>
> **First, Simple Factory—** just a static method that returns objects based on a parameter. It's not in the Gang of Four patterns, but it's practical. The downside is it violates Open-Closed Principle because you modify the factory method for each new type.
>
> **Second, Factory Method—** an abstract class with a factory method that subclasses override. This follows Open-Closed Principle better because you add new types via subclasses, not by modifying existing code. But it requires inheritance, which is less flexible than composition.
>
> **Third, Abstract Factory—** creates families of related objects. For example, a UI factory that creates matching sets of buttons, text fields, and checkboxes for Windows or Mac themes. You swap the entire factory to change the family.
>
> **In Spring applications, I use dependency injection with the factory,** which is the best of both worlds. Spring automatically injects all implementations of an interface into a list, and the factory can auto-register them. Adding a new payment processor is just implementing the interface and adding the `@Component` annotation—no factory modification needed.
>
> **The factory pattern really shines at scale.** At a previous company, we had a notification system that sent emails, SMS, and push notifications. Originally, the service had if-else logic checking notification type. When we added Slack notifications, we had to modify the service class and update all tests. After refactoring to a factory pattern, adding new channels was isolated—implement the interface, register with the factory, done. Development time went from days to hours.
>
> **The trade-off is added abstraction.** For simple cases with 2-3 types that never change, a factory might be overkill. But once you have 5+ types or expect future growth, the factory pays for itself in maintainability and flexibility."

---

### **Common Follow-Up Questions**

#### **Q1: When would you NOT use a factory pattern?**

> "Great question. Factory patterns add a layer of indirection, which is only valuable if you need that flexibility. Here are scenarios where I'd skip it:
>
> **1. Only one or two types that never change**
> ```java
> // Don't need factory for this:
> if (useCache) {
>     return new CachedDataSource(dataSource);
> } else {
>     return dataSource;
> }
> ```
> The overhead of a factory isn't justified for a simple boolean decision.
>
> **2. Construction is trivial with no dependencies**
> ```java
> // Don't need factory for simple POJOs:
> User user = new User(name, email);
> Order order = new Order(userId, amount);
> ```
> Factories make sense when object creation is complex or requires configuration.
>
> **3. You need compile-time type safety**
> ```java
> // Factory returns generic interface, loses type information:
> PaymentProcessor processor = factory.create("stripe");
> processor.process(amount);
> 
> // Direct instantiation preserves type:
> StripePaymentProcessor stripe = new StripePaymentProcessor();
> stripe.refund(transactionId);  // Stripe-specific method
> ```
> If you need type-specific methods, direct instantiation is clearer.
>
> **4. Performance-critical code paths**
> Factories add a map lookup or if-else chain. For 99% of cases, this is negligible (<0.1ms). But in ultra-low-latency systems (HFT trading, game engines), every nanosecond counts.
>
> **5. Single Responsibility classes**
> If a class does exactly one thing and will never have alternatives, direct instantiation is simpler:
> ```java
> // No factory needed:
> EmailValidator validator = new EmailValidator();
> ```
>
> **My rule of thumb:**
> - **Use factory when:** 3+ implementations, expect growth, complex creation, runtime selection needed
> - **Skip factory when:** 1-2 simple types, construction trivial, compile-time selection, never changing
>
> **Example where I removed a factory:** We had a factory for date formatters (ISO, US, EU formats). But we only ever used ISO format in 99% of code. I removed the factory and just used `DateTimeFormatter.ISO_DATE_TIME` directly. The 1% that needed other formats could instantiate directly. Simpler code, one less abstraction."

---

#### **Q2: How do you test code that uses factories?**

> "Testing factory-based code is actually easier than testing code with direct instantiation, because you can inject mock factories. Let me show you:
>
> **Approach 1: Mock the Factory (Best for Unit Tests)**
> ```java
> @Test
> public void testPaymentProcessing() {
>     // Mock the factory
>     PaymentProcessorFactory mockFactory = mock(PaymentProcessorFactory.class);
>     PaymentProcessor mockProcessor = mock(PaymentProcessor.class);
>     
>     when(mockFactory.create("stripe")).thenReturn(mockProcessor);
>     when(mockProcessor.process(any())).thenReturn(PaymentResult.success());
>     
>     // Inject mock factory into service
>     PaymentService service = new PaymentService(mockFactory);
>     
>     // Test
>     PaymentResult result = service.processPayment("stripe", BigDecimal.TEN);
>     
>     // Verify
>     assertTrue(result.isSuccessful());
>     verify(mockFactory).create("stripe");
>     verify(mockProcessor).process(BigDecimal.TEN);
> }
> ```
>
> **Approach 2: Use Test Double Implementations**
> ```java
> // Test implementation of product interface
> public class FakePaymentProcessor implements PaymentProcessor {
>     private List<BigDecimal> processedAmounts = new ArrayList<>();
>     
>     @Override
>     public PaymentResult process(BigDecimal amount) {
>         processedAmounts.add(amount);
>         return PaymentResult.success();
>     }
>     
>     public List<BigDecimal> getProcessedAmounts() {
>         return processedAmounts;
>     }
> }
>
> @Test
> public void testPaymentProcessing() {
>     FakePaymentProcessor fakeProcessor = new FakePaymentProcessor();
>     PaymentProcessorFactory factory = type -> fakeProcessor;
>     
>     PaymentService service = new PaymentService(factory);
>     service.processPayment("stripe", BigDecimal.TEN);
>     
>     assertEquals(1, fakeProcessor.getProcessedAmounts().size());
>     assertEquals(BigDecimal.TEN, fakeProcessor.getProcessedAmounts().get(0));
> }
> ```
>
> **Approach 3: Spring Test Configuration**
> ```java
> @TestConfiguration
> public class TestConfig {
>     @Bean
>     @Primary  // Override production bean
>     public PaymentProcessorFactory testFactory() {
>         return new PaymentProcessorFactory(
>             new FakeStripeProcessor(),
>             new FakePayPalProcessor()
>         );
>     }
> }
>
> @SpringBootTest
> @Import(TestConfig.class)
> public class PaymentServiceIntegrationTest {
>     @Autowired
>     private PaymentService paymentService;
>     
>     @Test
>     public void testPayment() {
>         // Uses test factory automatically
>         PaymentResult result = paymentService.processPayment("stripe", BigDecimal.TEN);
>         assertTrue(result.isSuccessful());
>     }
> }
> ```
>
> **Approach 4: Test the Factory Itself**
> ```java
> @Test
> public void testFactoryReturnsCorrectProcessor() {
>     PaymentProcessorFactory factory = new PaymentProcessorFactory(
>         new StripePaymentProcessor(),
>         new PayPalPaymentProcessor()
>     );
>     
>     PaymentProcessor stripe = factory.create("stripe");
>     assertInstanceOf(StripePaymentProcessor.class, stripe);
>     
>     PaymentProcessor paypal = factory.create("paypal");
>     assertInstanceOf(PayPalPaymentProcessor.class, paypal);
> }
>
> @Test
> public void testFactoryThrowsForUnknownType() {
>     PaymentProcessorFactory factory = new PaymentProcessorFactory(...);
>     
>     assertThrows(IllegalArgumentException.class, () -> {
>         factory.create("unknown");
>     });
> }
> ```
>
> **Key insight:** Factory pattern improves testability because:
> - Dependencies are explicit (injected, not hidden)
> - Easy to substitute test doubles
> - Can test factory logic separately from product logic
> - No need for PowerMock or reflection hacks
>
> **Without factory, testing is harder:**
> ```java
> // Hard to test (direct instantiation)
> public class PaymentService {
>     public PaymentResult process(String type, BigDecimal amount) {
>         PaymentProcessor processor = new StripePaymentProcessor();  // Hard-coded!
>         return processor.process(amount);
>     }
> }
>
> // Can't mock StripePaymentProcessor without PowerMock
> ```
>
> So factory pattern is actually a testing enabler, not an obstacle."

---

#### **Q3: How does factory pattern relate to dependency injection?**

> "Factory pattern and dependency injection solve similar problems but at different levels. They complement each other beautifully, especially in Spring applications.
>
> **Factory Pattern:** Decides which concrete class to instantiate at **runtime** based on input
> 
> **Dependency Injection:** Wires dependencies at **startup** (or request time) based on configuration
>
> **How they work together:**
>
> **Level 1: Factory without DI (Manual)**
> ```java
> public class PaymentProcessorFactory {
>     public PaymentProcessor create(String type) {
>         if (type.equals("stripe")) {
>             return new StripePaymentProcessor(
>                 System.getenv("STRIPE_API_KEY"),
>                 new HttpClient(),
>                 new JsonSerializer()
>             );
>         }
>         // Problems:
>         // ❌ Factory knows about dependencies
>         // ❌ Hard to test (can't inject mocks)
>         // ❌ Configuration scattered
>     }
> }
> ```
>
> **Level 2: Factory with DI (Better)**
> ```java
> @Component
> public class PaymentProcessorFactory {
>     private final StripePaymentProcessor stripe;
>     private final PayPalPaymentProcessor paypal;
>     
>     // Spring injects fully-configured processors
>     public PaymentProcessorFactory(
>             StripePaymentProcessor stripe,
>             PayPalPaymentProcessor paypal) {
>         this.stripe = stripe;
>         this.paypal = paypal;
>     }
>     
>     public PaymentProcessor create(String type) {
>         // Factory just selects, doesn't construct
>         if (type.equals("stripe")) {
>             return stripe;
>         } else if (type.equals("paypal")) {
>             return paypal;
>         }
>         throw new IllegalArgumentException("Unknown: " + type);
>     }
> }
>
> // Benefits:
> // ✓ Processors configured by Spring
> // ✓ Easy to test (inject mock processors)
> // ✓ Configuration centralized
> ```
>
> **Level 3: Self-Registering Factory (Best)**
> ```java
> @Component
> public class PaymentProcessorFactory {
>     private final Map<String, PaymentProcessor> processors;
>     
>     // Spring injects ALL implementations automatically
>     public PaymentProcessorFactory(List<PaymentProcessor> processorList) {
>         this.processors = processorList.stream()
>             .collect(Collectors.toMap(
>                 PaymentProcessor::getType,
>                 Function.identity()
>             ));
>     }
>     
>     public PaymentProcessor create(String type) {
>         PaymentProcessor processor = processors.get(type);
>         if (processor == null) {
>             throw new IllegalArgumentException("Unknown: " + type);
>         }
>         return processor;
>     }
> }
>
> // Add new processor: Just implement interface
> @Component
> public class SquarePaymentProcessor implements PaymentProcessor {
>     @Override
>     public String getType() {
>         return "square";
>     }
>     // No factory modification needed!
> }
> ```
>
> **Key differences:**
>
> | **Aspect** | **Factory Pattern** | **Dependency Injection** |
> |------------|-------------------|------------------------|
> | **When** | Runtime | Startup (or request) |
> | **Based on** | Input parameters | Configuration |
> | **Decides** | Which type | How to construct |
> | **Level** | Business logic | Infrastructure |
>
> **Real-world example:**
>
> In a project I worked on, we had a notification service that used both:
>
> ```java
> // DI: Spring creates and configures all senders
> @Service
> public class NotificationService {
>     private final NotificationSenderFactory factory;
>     
>     public NotificationService(NotificationSenderFactory factory) {
>         this.factory = factory;  // Injected by Spring
>     }
>     
>     // Factory: Selects sender based on runtime preference
>     public void notify(User user, String message) {
>         String channel = user.getPreferredChannel();  // Runtime decision
>         NotificationSender sender = factory.create(channel);
>         sender.send(user, message);
>     }
> }
> ```
>
> - **DI handles:** Creating EmailSender, SMSSender, PushSender with their dependencies (SMTP config, Twilio client, etc.)
> - **Factory handles:** Selecting which sender to use based on user's preference
>
> **They're complementary, not competing.** DI manages object lifecycle and dependencies. Factory manages runtime selection logic. Together, they create clean, flexible, testable code."

---

#### **Q4: What's the difference between Factory Method and Abstract Factory?**

> "This is a classic interview question. Both create objects, but they solve different problems at different scales. Let me break it down:
>
> **Factory Method: Creates ONE type of object**
>
> **Problem it solves:** You have a class hierarchy, and you want subclasses to decide which concrete class to instantiate.
>
> ```java
> // Abstract creator
> public abstract class DocumentEditor {
>     // Factory method (subclasses implement)
>     protected abstract Document createDocument();
>     
>     // Business logic (uses factory method)
>     public void openDocument() {
>         Document doc = createDocument();
>         doc.open();
>         doc.render();
>     }
> }
>
> // Concrete creators
> public class WordEditor extends DocumentEditor {
>     @Override
>     protected Document createDocument() {
>         return new WordDocument();  // Word creates Word docs
>     }
> }
>
> public class PDFEditor extends DocumentEditor {
>     @Override
>     protected Document createDocument() {
>         return new PDFDocument();  // PDF creates PDF docs
>     }
> }
> ```
>
> **Key characteristics:**
> - One factory method per creator
> - Creates one product
> - Uses inheritance (subclasses override factory method)
> - Couples creator hierarchy with product hierarchy
>
> **Abstract Factory: Creates FAMILIES of related objects**
>
> **Problem it solves:** You need to create multiple related objects that belong together.
>
> ```java
> // Abstract factory (creates family of products)
> public interface GUIFactory {
>     Button createButton();
>     TextField createTextField();
>     Checkbox createCheckbox();
> }
>
> // Concrete factory for Windows theme
> public class WindowsFactory implements GUIFactory {
>     @Override
>     public Button createButton() {
>         return new WindowsButton();
>     }
>     
>     @Override
>     public TextField createTextField() {
>         return new WindowsTextField();
>     }
>     
>     @Override
>     public Checkbox createCheckbox() {
>         return new WindowsCheckbox();
>     }
> }
>
> // Concrete factory for Mac theme
> public class MacFactory implements GUIFactory {
>     @Override
>     public Button createButton() {
>         return new MacButton();
>     }
>     
>     @Override
>     public TextField createTextField() {
>         return new MacTextField();
>     }
>     
>     @Override
>     public Checkbox createCheckbox() {
>         return new MacCheckbox();
>     }
> }
>
> // Client uses factory (doesn't know concrete classes)
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
>         // All match! (all Windows or all Mac)
>     }
> }
> ```
>
> **Key characteristics:**
> - Multiple factory methods per factory
> - Creates family of related products
> - Uses composition (client has a factory)
> - Ensures product compatibility (all Windows or all Mac)
>
> **Real-world example I've implemented:**
>
> **Factory Method:** Cloud storage service
> ```java
> public abstract class CloudStorageService {
>     protected abstract CloudClient createClient();
>     
>     public void uploadFile(File file) {
>         CloudClient client = createClient();
>         client.upload(file);
>     }
> }
>
> class S3Service extends CloudStorageService {
>     protected CloudClient createClient() {
>         return new S3Client();
>     }
> }
>
> class GCSService extends CloudStorageService {
>     protected CloudClient createClient() {
>         return new GCSClient();
>     }
> }
> ```
>
> **Abstract Factory:** Database access layer
> ```java
> public interface DatabaseFactory {
>     Connection createConnection();
>     QueryBuilder createQueryBuilder();
>     TransactionManager createTransactionManager();
> }
>
> class PostgreSQLFactory implements DatabaseFactory {
>     public Connection createConnection() {
>         return new PostgreSQLConnection();
>     }
>     public QueryBuilder createQueryBuilder() {
>         return new PostgreSQLQueryBuilder();
>     }
>     public TransactionManager createTransactionManager() {
>         return new PostgreSQLTransactionManager();
>     }
> }
>
> class MySQLFactory implements DatabaseFactory {
>     // Creates MySQL-specific family
> }
> ```
>
> The factory ensures all components are compatible (can't mix PostgreSQL connection with MySQL query builder).
>
> **Decision matrix:**
>
> | **Use Case** | **Pattern** |
> |--------------|-------------|
> | Create ONE type of object | Factory Method |
> | Create FAMILY of related objects | Abstract Factory |
> | Product types independent | Factory Method |
> | Products must be compatible | Abstract Factory |
> | Simple object creation | Factory Method |
> | Complex multi-object creation | Abstract Factory |
>
> **In practice:** Abstract Factory is often overkill. I've used Factory Method frequently, Abstract Factory rarely. Most systems don't need to create entire families of related objects that must be compatible. But when you do (UI themes, database layers, multi-platform SDKs), Abstract Factory is the right tool."

---

#### **Q5: How do you handle dynamic registration of new types in a factory?**

> "Dynamic registration is a powerful technique that makes factories truly extensible. Instead of hard-coding all types, you let implementations register themselves. I've used this in plugin systems and microservices.
>
> **Approach 1: Spring's Auto-Registration (Best for Spring Apps)**
>
> ```java
> // Interface with self-describing method
> public interface PaymentProcessor {
>     String getType();  // Each processor declares its type
>     PaymentResult process(BigDecimal amount);
> }
>
> // Implementations auto-registered by Spring
> @Component
> public class StripeProcessor implements PaymentProcessor {
>     @Override
>     public String getType() {
>         return "stripe";
>     }
>     
>     @Override
>     public PaymentResult process(BigDecimal amount) {
>         // Stripe logic
>     }
> }
>
> @Component
> public class PayPalProcessor implements PaymentProcessor {
>     @Override
>     public String getType() {
>         return "paypal";
>     }
>     
>     @Override
>     public PaymentResult process(BigDecimal amount) {
>         // PayPal logic
>     }
> }
>
> // Factory auto-discovers all implementations
> @Component
> public class PaymentProcessorFactory {
>     private final Map<String, PaymentProcessor> processors;
>     
>     public PaymentProcessorFactory(List<PaymentProcessor> processorList) {
>         // Spring injects ALL PaymentProcessor beans
>         this.processors = processorList.stream()
>             .collect(Collectors.toMap(
>                 PaymentProcessor::getType,
>                 Function.identity()
>             ));
>     }
>     
>     public PaymentProcessor create(String type) {
>         return processors.get(type);
>     }
> }
>
> // Add new processor: Just implement interface and add @Component
> // NO factory modification needed!
> ```
>
> **Approach 2: ServiceLoader (Java's Built-in Plugin Mechanism)**
>
> ```java
> // In META-INF/services/com.example.PaymentProcessor file:
> com.example.StripeProcessor
> com.example.PayPalProcessor
> com.example.SquareProcessor
>
> // Factory loads via ServiceLoader
> public class PaymentProcessorFactory {
>     private final Map<String, PaymentProcessor> processors;
>     
>     public PaymentProcessorFactory() {
>         this.processors = new HashMap<>();
>         
>         // Discover all implementations via ServiceLoader
>         ServiceLoader<PaymentProcessor> loader = 
>             ServiceLoader.load(PaymentProcessor.class);
>         
>         for (PaymentProcessor processor : loader) {
>             processors.put(processor.getType(), processor);
>         }
>     }
>     
>     public PaymentProcessor create(String type) {
>         return processors.get(type);
>     }
> }
>
> // Benefits:
> // ✓ No compile-time dependency on implementations
> // ✓ Can add JARs at runtime (true plugin system)
> // ✓ Used by JDBC drivers (DriverManager uses ServiceLoader)
> ```
>
> **Approach 3: Manual Registration (Most Control)**
>
> ```java
> public class PaymentProcessorFactory {
>     private final Map<String, Supplier<PaymentProcessor>> registry;
>     
>     public PaymentProcessorFactory() {
>         this.registry = new ConcurrentHashMap<>();
>     }
>     
>     // Register new processor types dynamically
>     public void register(String type, Supplier<PaymentProcessor> supplier) {
>         registry.put(type, supplier);
>     }
>     
>     public PaymentProcessor create(String type) {
>         Supplier<PaymentProcessor> supplier = registry.get(type);
>         if (supplier == null) {
>             throw new IllegalArgumentException("Unknown type: " + type);
>         }
>         return supplier.get();
>     }
> }
>
> // Registration at startup
> @Configuration
> public class ProcessorConfig {
>     @Bean
>     public PaymentProcessorFactory factory(
>             ApplicationContext context) {
>         PaymentProcessorFactory factory = new PaymentProcessorFactory();
>         
>         // Register each processor
>         factory.register("stripe", () -> context.getBean(StripeProcessor.class));
>         factory.register("paypal", () -> context.getBean(PayPalProcessor.class));
>         factory.register("square", () -> context.getBean(SquareProcessor.class));
>         
>         return factory;
>     }
> }
> ```
>
> **Approach 4: Annotation-Based Registration**
>
> ```java
> // Custom annotation
> @Retention(RetentionPolicy.RUNTIME)
> @Target(ElementType.TYPE)
> public @interface Processor {
>     String type();
> }
>
> // Annotated implementations
> @Component
> @Processor(type = "stripe")
> public class StripeProcessor implements PaymentProcessor {
>     // Implementation
> }
>
> @Component
> @Processor(type = "paypal")
> public class PayPalProcessor implements PaymentProcessor {
>     // Implementation
> }
>
> // Factory discovers via annotation
> @Component
> public class PaymentProcessorFactory implements ApplicationContextAware {
>     private Map<String, PaymentProcessor> processors;
>     
>     @Override
>     public void setApplicationContext(ApplicationContext context) {
>         this.processors = new HashMap<>();
>         
>         // Find all beans with @Processor annotation
>         Map<String, Object> beans = context.getBeansWithAnnotation(Processor.class);
>         
>         for (Object bean : beans.values()) {
>             Processor annotation = bean.getClass().getAnnotation(Processor.class);
>             processors.put(annotation.type(), (PaymentProcessor) bean);
>         }
>     }
>     
>     public PaymentProcessor create(String type) {
>         return processors.get(type);
>     }
> }
> ```
>
> **Real production example:**
>
> At a previous company, we had a data pipeline system that processed files in various formats. New formats were added frequently by different teams.
>
> ```java
> // Each team adds their parser
> @Component
> @FileParser(extension = "parquet")
> public class ParquetParser implements DataParser {
>     // Parquet parsing logic
> }
>
> @Component
> @FileParser(extension = "avro")
> public class AvroParser implements DataParser {
>     // Avro parsing logic
> }
>
> // Factory auto-discovers all parsers
> // No central team bottleneck
> ```
>
> **Benefits:**
> - New formats added without touching factory
> - Teams independent (no merge conflicts)
> - Parallel development
> - Discovery at startup (fail fast if missing)
>
> **When to use each:**
> - **Spring auto-registration:** 95% of cases (simplest)
> - **ServiceLoader:** True plugin system (JARs added at runtime)
> - **Manual registration:** Need fine control over lifecycle
> - **Annotation-based:** Large teams, need metadata
>
> **Key insight:** Dynamic registration is what makes factory pattern truly follow Open-Closed Principle. You extend behavior without modifying code."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Factory Pattern Types Comparison**

```
SIMPLE FACTORY
══════════════

┌──────────────────────────────────┐
│   Client                         │
│                                  │
│   NotificationFactory.create()   │  ← Static method
└──────────────┬───────────────────┘
               │
               ↓
┌──────────────────────────────────┐
│   NotificationFactory            │
│                                  │
│   + create(type): Notification   │
│         if (type == "email")     │
│             return EmailNotif    │
│         if (type == "sms")       │
│             return SMSNotif      │
└──────────────┬───────────────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
┌─────────────┐ ┌─────────────┐
│EmailNotif   │ │SMSNotif     │
└─────────────┘ └─────────────┘

Pros: Simple, centralized
Cons: Violates Open-Closed


FACTORY METHOD PATTERN
═══════════════════════

┌──────────────────────────────────┐
│   Client                         │
└──────────────┬───────────────────┘
               │ uses
               ↓
┌──────────────────────────────────┐
│   Creator (abstract)             │
│                                  │
│   + operation()                  │ ← Template method
│       product = createProduct()  │
│       product.doSomething()      │
│                                  │
│   # createProduct(): Product     │ ← Factory method
│     (abstract)                   │
└──────────────┬───────────────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
┌─────────────┐ ┌─────────────┐
│ConcreteA    │ │ConcreteB    │
│             │ │             │
│createProduct│ │createProduct│
│  return A   │ │  return B   │
└─────────────┘ └─────────────┘

Pros: Follows Open-Closed, flexible
Cons: Requires subclass per type


ABSTRACT FACTORY PATTERN
═════════════════════════

┌──────────────────────────────────┐
│   Client                         │
│                                  │
│   factory.createButton()         │
│   factory.createTextField()      │
│   factory.createCheckbox()       │
└──────────────┬───────────────────┘
               │
               ↓
┌──────────────────────────────────┐
│   GUIFactory (interface)         │
│                                  │
│   + createButton(): Button       │
│   + createTextField(): TextField │
│   + createCheckbox(): Checkbox   │
└──────────────┬───────────────────┘
               │
        ┌──────┴──────┐
        ↓             ↓
┌─────────────┐ ┌─────────────┐
│WindowsFactory│ │MacFactory   │
│             │ │             │
│create*()    │ │create*()    │
│  return     │ │  return     │
│  Windows*   │ │  Mac*       │
└──────┬──────┘ └──────┬──────┘
       │               │
       │               │
   ┌───┴───┐       ┌───┴───┐
   ↓       ↓       ↓       ↓
Windows   Windows  Mac    Mac
Button    TextField Button TextField

Pros: Ensures product family compatibility
Cons: Complex, hard to add new products
```

---

### **Factory Pattern with Spring DI**

```
WITHOUT FACTORY (Tight Coupling)
════════════════════════════════

┌─────────────────────────────────┐
│   PaymentService                │
│                                 │
│   processPayment(type) {        │
│     if (type == "stripe")       │
│       p = new StripeProcessor() │  ← Tight coupling
│     else if (type == "paypal")  │
│       p = new PayPalProcessor() │  ← Knows concrete classes
│     p.process()                 │
│   }                             │
└─────────────────────────────────┘

Problems:
❌ Service knows all implementations
❌ Adding new type requires changing service
❌ Hard to test (can't mock)


WITH FACTORY (Loose Coupling)
═══════════════════════════════

┌─────────────────────────────────┐
│   PaymentService                │
│                                 │
│   - factory: Factory            │  ← Dependency injection
│                                 │
│   processPayment(type) {        │
│     p = factory.create(type)    │  ← Delegates to factory
│     p.process()                 │
│   }                             │
└──────────────┬──────────────────┘
               │ depends on
               ↓
┌─────────────────────────────────┐
│   PaymentProcessorFactory       │
│                                 │
│   - processors: Map             │
│                                 │
│   create(type) {                │
│     return processors.get(type) │  ← Map lookup
│   }                             │
└──────────────┬──────────────────┘
               │ contains
               ↓
        ┌──────┴──────┬──────┐
        ↓             ↓      ↓
┌─────────────┐ ┌─────────┐ ┌─────────┐
│Stripe       │ │PayPal   │ │Square   │
│Processor    │ │Processor│ │Processor│
└─────────────┘ └─────────┘ └─────────┘
                  ↑
                  │ All implement
                  │
           ┌──────────────┐
           │PaymentProcessor│
           │  (interface)  │
           └──────────────┘

Benefits:
✓ Service doesn't know implementations
✓ Adding type: Implement interface + register
✓ Easy to test (inject mock factory)


SPRING AUTOWIRING (Best)
═════════════════════════

         Spring Container
┌─────────────────────────────────┐
│                                 │
│  @Component                     │
│  ┌──────────────────────┐      │
│  │ PaymentService       │      │
│  │                      │      │
│  │ @Autowired           │      │
│  │ factory: Factory ────┼──┐   │
│  └──────────────────────┘  │   │
│                             ↓   │
│  @Component                     │
│  ┌──────────────────────┐      │
│  │ Factory              │      │
│  │                      │      │
│  │ @Autowired           │      │
│  │ processors: List ────┼──┐   │
│  └──────────────────────┘  │   │
│                             ↓   │
│  @Component   @Component   @Component
│  ┌─────┐     ┌─────┐     ┌─────┐
│  │Stripe│    │PayPal│    │Square│
│  └─────┘     └─────┘     └─────┘
│                                 │
│  Spring auto-injects all        │
│  PaymentProcessor beans into    │
│  the factory's List constructor │
│                                 │
└─────────────────────────────────┘

Benefits:
✓ Zero configuration
✓ Auto-discovery
✓ Add implementation: Just @Component
✓ Follows Open-Closed perfectly
```

---

### **Factory Decision Tree**

```
SHOULD I USE FACTORY PATTERN?
══════════════════════════════

Start
  │
  ↓
Do I need to create objects?
  │
  ├─ No ────────────────→ Don't use factory
  │
  ↓ Yes
  │
How many types?
  │
  ├─ 1 type ────────────→ Direct instantiation
  │
  ├─ 2 types ───────────→ Simple if-else (or factory if expect growth)
  │
  ↓ 3+ types
  │
Will types change/grow?
  │
  ├─ No, fixed ─────────→ Simple factory or if-else
  │
  ↓ Yes, expect growth
  │
Runtime or compile-time selection?
  │
  ├─ Compile-time ──────→ Direct instantiation or enum
  │
  ↓ Runtime
  │
Single product or product family?
  │
  ├─ Single product ────→ Factory Method or Simple Factory
  │
  ↓ Product family (related objects)
  │
Must products be compatible?
  │
  ├─ No ───────────────→ Multiple Simple Factories
  │
  ↓ Yes (all Windows or all Mac)
  │
  → ABSTRACT FACTORY
  
  
Using Spring?
  │
  ├─ No ───────────────→ Manual factory with registration
  │
  ↓ Yes
  │
  → Spring-based factory with auto-discovery
     (List<Implementation> autowired)
```

---

### **Factory Pattern Evolution in Project**

```
PHASE 1: DIRECT INSTANTIATION
══════════════════════════════

┌─────────────────────────────┐
│ if (type == "email")        │
│   sender = new EmailSender()│
│ else if (type == "sms")     │
│   sender = new SMSSender()  │
└─────────────────────────────┘

Issues:
- 2 notification types (email, sms)
- if-else in 5 places across codebase
- Adding push notification = change 5 files


PHASE 2: SIMPLE FACTORY
═══════════════════════

┌─────────────────────────────┐
│ NotificationFactory.create()│
│   if (type == "email")      │
│     return new Email()      │
│   if (type == "sms")        │
│     return new SMS()        │
│   if (type == "push")       │  ← Easy to add
│     return new Push()       │
└─────────────────────────────┘

Improvement:
- Centralized creation logic
- Client code unchanged
- Still need to modify factory


PHASE 3: SPRING + MAP
═════════════════════

┌─────────────────────────────┐
│ @Component                  │
│ NotificationFactory {       │
│                             │
│   Map<String, Sender> map   │
│                             │
│   create(type) {            │
│     return map.get(type)    │  ← Map lookup
│   }                         │
│ }                           │
└─────────────────────────────┘
        ↑
        │ Populated by constructor
        │
┌───────┴──────────┬──────────┐
│                  │          │
@Component         @Component  @Component
EmailSender       SMSSender   PushSender

Improvement:
- Adding type: Implement + @Component
- No factory modification
- Open-Closed Principle


PHASE 4: AUTO-REGISTRATION
═══════════════════════════

┌─────────────────────────────┐
│ @Component                  │
│ NotificationFactory {       │
│                             │
│   List<Sender> senders      │  ← Spring injects ALL
│                             │
│   Map<String, Sender> map = │
│     senders.stream()        │
│       .collect(toMap(...))  │  ← Auto-populate
│                             │
│   create(type) {            │
│     return map.get(type)    │
│   }                         │
│ }                           │
└─────────────────────────────┘

Final state:
- Zero configuration
- Auto-discovery
- Perfect Open-Closed
- 15+ notification types supported
- Adding new type: 30 seconds
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Engineering Impact:**
- **Maintainability:** Adding new types doesn't require changing existing code (Open-Closed Principle)
- **Testability:** Easy to inject mock implementations for testing
- **Flexibility:** Switch implementations without changing client code
- **Parallel Development:** Multiple teams can add new types independently

**Business Impact:**
- **Time to Market:** New features (payment methods, notification channels) added in hours instead of days
- **Quality:** Isolated changes reduce risk of breaking existing functionality
- **Operational Flexibility:** Switch providers (payment gateways, cloud storage) via configuration, not code changes
- **Cost Optimization:** Intelligent routing to cheapest providers saves 20-40% on infrastructure costs

**Real Numbers:**
```
E-commerce company adding new payment gateway:

Without Factory:
- Change 12 files (service, tests, config, docs)
- 3 days of development
- 2 days of testing (regression risk)
- 1 day of code review
- Total: 6 days, $15,000 cost

With Factory:
- Implement interface (1 file)
- Add @Component annotation
- 4 hours of development
- 2 hours of testing (isolated)
- 1 hour of code review
- Total: 7 hours, $1,800 cost

ROI: 8.3x faster, 8.3x cheaper per integration
```

---

### **How It Works (Simple Summary)**

**Core Concept:**
Instead of creating objects directly with `new ClassName()`, you call a factory method that returns an object based on input parameters or configuration.

**Three Types:**
1. **Simple Factory:** Static method, if-else logic, returns object
2. **Factory Method:** Abstract class, subclasses override creation method
3. **Abstract Factory:** Interface, creates families of related objects

**Best Practice (Spring Boot):**
```java
@Component
public class Factory {
    private final Map<String, Implementation> implementations;
    
    public Factory(List<Implementation> implList) {
        this.implementations = implList.stream()
            .collect(Collectors.toMap(
                Implementation::getType,
                Function.identity()
            ));
    }
    
    public Implementation create(String type) {
        return implementations.get(type);
    }
}
```

---

### **Key Trade-Offs**

| **Aspect** | **With Factory** | **Without Factory** |
|------------|------------------|---------------------|
| **Adding New Type** | Implement interface + register | Modify all client code |
| **Code Complexity** | One extra class (factory) | Simpler (direct instantiation) |
| **Flexibility** | High (switch implementations easily) | Low (hard-coded dependencies) |
| **Testability** | Easy (inject mock factory) | Hard (can't mock constructors) |
| **Performance** | Minimal overhead (map lookup <0.1ms) | Faster (direct instantiation) |
| **Learning Curve** | Medium (understand pattern) | Low (straightforward) |
| **Maintenance** | Easier (isolated changes) | Harder (scattered logic) |

---

### **Decision Framework**

```
When to Use Factory:
═══════════════════

✅ Use Factory When:
- 3+ types that might grow
- Runtime selection based on input
- Need to isolate client from implementations
- Complex object creation
- Multiple teams adding implementations
- Need testability (mock implementations)

❌ Skip Factory When:
- Only 1-2 types, never changing
- Compile-time selection (use enum or if-else)
- Simple POJOs (User, Order)
- Performance ultra-critical (nanoseconds matter)
- Team unfamiliar with pattern (educate first)

🤔 Consider Factory When:
- 2-3 types, might grow
- Configuration-based selection
- Want to improve testability
- Planning for future extensibility
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Explain Three Types Clearly**
- Simple Factory: Static method, not Gang of Four
- Factory Method: Subclasses override creation
- Abstract Factory: Families of related objects

✅ **Emphasize Spring Integration**
- "In production, I use Spring's dependency injection with factory pattern"
- Show auto-registration with `List<Interface>` constructor injection
- Demonstrate Open-Closed Principle in action

✅ **Provide Real Examples**
- Payment processing (Stripe, PayPal, Square)
- Notification delivery (Email, SMS, Push)
- Cloud storage (AWS, GCP, Azure)
- File parsing (CSV, JSON, XML)

✅ **Discuss Trade-Offs**
- "Factory adds abstraction, which is only valuable if you need flexibility"
- "For 1-2 fixed types, direct instantiation is simpler"
- "Performance overhead is negligible (<0.1ms), but matters in HFT systems"

✅ **Show Testing Knowledge**
- "Factory pattern makes testing easier—inject mock factory"
- "Can test factory logic separately from product logic"
- "Much better than PowerMock hacks for mocking constructors"

✅ **Connect to SOLID Principles**
- Open-Closed: Add new types without modifying existing code
- Single Responsibility: Factory handles creation, client handles business logic
- Dependency Inversion: Depend on abstractions (interface), not concrete classes

✅ **Reference Real Systems**
- "Spring Framework is essentially a giant factory (ApplicationContext)"
- "AWS SDK uses factory pattern extensively for client creation"
- "JDBC DriverManager is a classic factory example"

**Interview Script:**
> "Factory pattern encapsulates object creation. Instead of `new StripeProcessor()`, I call `factory.create("stripe")`. This decouples client code from concrete implementations.
>
> There are three types: Simple Factory (static method with if-else), Factory Method (subclasses override creation), and Abstract Factory (creates families of related objects).
>
> In Spring applications, I combine factory pattern with dependency injection. The factory's constructor takes a `List<Interface>` which Spring auto-populates with all implementations. Adding a new type is just implementing the interface and adding `@Component`—no factory modification needed. This perfectly follows Open-Closed Principle.
>
> I've used this extensively. For example, in a payment system supporting Stripe, PayPal, and Square. The factory selected the processor based on user preference. When we added Apple Pay, it took 4 hours instead of 3 days because we only touched one new class.
>
> The trade-off is added abstraction. For 1-2 fixed types, it's overkill. But once you hit 3+ types or expect growth, factory pays for itself in maintainability and flexibility."

---

**End of Topic 180: Factory Pattern**
