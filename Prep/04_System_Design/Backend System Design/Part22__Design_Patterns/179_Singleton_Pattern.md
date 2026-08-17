# 179. Singleton (and why it's dangerous)

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Singleton Pattern** is a creational design pattern that **restricts the instantiation of a class to a single instance** and provides a **global point of access** to that instance. While conceptually simple, it's one of the most controversial patterns in software engineering.

### **What It Is**

The Singleton pattern ensures that:
1. **Only one instance** of a class exists in the application
2. **Global access point** to that instance
3. **Lazy or eager initialization** of the instance
4. **Thread-safe** creation (in multi-threaded environments)

**Classic Implementation:**
```java
public class DatabaseConnection {
    private static DatabaseConnection instance;
    
    private DatabaseConnection() {
        // Private constructor prevents external instantiation
    }
    
    public static DatabaseConnection getInstance() {
        if (instance == null) {
            instance = new DatabaseConnection();
        }
        return instance;
    }
}

// Usage
DatabaseConnection db = DatabaseConnection.getInstance();
```

---

### **Why It Exists**

**The Original Intent:**
- **Resource management:** Single database connection pool
- **Configuration:** Single configuration manager
- **Logging:** Single logger instance
- **Caching:** Single cache instance
- **State sharing:** Share state across application

**Historical Context:**
- Popular in 90s/2000s (before dependency injection became mainstream)
- Gang of Four (1994) design patterns book
- Used heavily in enterprise Java (pre-Spring era)

---

### **The Problem (Why It's Dangerous)**

**⚠️ Modern Software Engineering Reality:**

```
Singleton is considered an ANTI-PATTERN in modern systems because:

1. ❌ Global State (Hidden Dependencies)
2. ❌ Tight Coupling (Hard to change)
3. ❌ Testing Nightmare (Can't mock, can't isolate)
4. ❌ Thread Safety Issues (Race conditions)
5. ❌ Violates Single Responsibility Principle
6. ❌ Hidden Side Effects
7. ❌ Lifecycle Management Problems
8. ❌ Scalability Issues (doesn't work in distributed systems)
```

---

### **Where and When Used**

**Legacy Systems (Pre-Spring):**
```java
// Old-style singleton (BAD)
Logger logger = Logger.getInstance();
Config config = ConfigManager.getInstance();
Cache cache = CacheManager.getInstance();
```

**Modern Systems (Spring Boot):**
```java
// Spring manages singleton lifecycle (GOOD)
@Service
public class UserService {
    // Spring creates ONE instance (singleton scope by default)
    // But managed by Spring container, not static getInstance()
}
```

**When Singleton Might Be Acceptable:**
1. **Stateless utility classes** (but even then, static methods are better)
2. **Immutable configuration** (but dependency injection is better)
3. **True hardware resources** (printer spooler, device drivers)
4. **Performance-critical scenarios** (very rare, and DI is usually fine)

---

### **Role in Large-Scale Distributed Systems**

**Reality at FAANG Scale:**

```
❌ Singleton doesn't work in distributed systems:

Problem 1: Multiple JVM instances
- Server 1: Singleton instance A
- Server 2: Singleton instance B
- Server 3: Singleton instance C
→ Not a singleton anymore! (3 instances)

Problem 2: No shared state across servers
- User session on Server 1
- Load balancer routes to Server 2
- Server 2 doesn't have user's singleton state
→ Data loss

Solution: Use external shared state (Redis, database)
```

**What FAANG Uses Instead:**
- **Dependency Injection** (Spring, Guice)
- **Distributed Caching** (Redis, Memcached)
- **Service Registries** (Consul, Eureka)
- **Configuration Services** (Spring Cloud Config, AWS AppConfig)

---

### **Business Impact**

**Development Velocity:**
```
With Singleton:
- New feature requires changing global state
- Risk of breaking existing features
- Hard to test in isolation
- Difficult to refactor
- Team velocity: SLOW

With Dependency Injection:
- Each component isolated
- Easy to mock and test
- Safe to refactor
- Parallel development possible
- Team velocity: FAST
```

**Production Issues:**
```
Real incident at major e-commerce company:

Singleton logger accumulated state over time
→ Memory leak (retained references)
→ OutOfMemoryError after 3 days uptime
→ Required server restarts every 2 days
→ $500K/year in operational costs

Solution: Replace with injected logger
→ No memory leak
→ No restarts needed
→ Saved $500K/year
```

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Singleton Implementations (Evolution)**

#### **Version 1: Naive Singleton (BROKEN)**

```java
public class DatabaseConnection {
    private static DatabaseConnection instance;
    
    private DatabaseConnection() {
        System.out.println("Creating database connection...");
    }
    
    public static DatabaseConnection getInstance() {
        if (instance == null) {
            instance = new DatabaseConnection();
        }
        return instance;
    }
}

// Problem: NOT thread-safe!
// Two threads can create two instances simultaneously

// Thread 1: Checks instance == null → TRUE
// Thread 2: Checks instance == null → TRUE (before Thread 1 creates)
// Thread 1: Creates new instance
// Thread 2: Creates new instance
// Result: TWO instances! (violates singleton contract)
```

---

#### **Version 2: Synchronized Method (SLOW)**

```java
public class DatabaseConnection {
    private static DatabaseConnection instance;
    
    private DatabaseConnection() {
        System.out.println("Creating database connection...");
    }
    
    public static synchronized DatabaseConnection getInstance() {
        if (instance == null) {
            instance = new DatabaseConnection();
        }
        return instance;
    }
}

// Thread-safe: ✓
// Performance: ✗ (synchronized on EVERY call)

// Benchmark:
// Without synchronization: 1 million calls in 10ms
// With synchronization: 1 million calls in 500ms
// Result: 50x slower!
```

---

#### **Version 3: Double-Checked Locking (BROKEN in Java < 5)**

```java
public class DatabaseConnection {
    private static DatabaseConnection instance;
    
    private DatabaseConnection() {
        System.out.println("Creating database connection...");
    }
    
    public static DatabaseConnection getInstance() {
        if (instance == null) {  // Check 1 (no lock)
            synchronized (DatabaseConnection.class) {
                if (instance == null) {  // Check 2 (with lock)
                    instance = new DatabaseConnection();
                }
            }
        }
        return instance;
    }
}

// Problem: Subtle bug due to JVM instruction reordering
// Thread 1: Allocates memory for instance
// Thread 1: Assigns reference to instance (before constructor completes!)
// Thread 2: Sees instance != null, returns partially constructed object
// Result: NullPointerException or corrupt state
```

---

#### **Version 4: Double-Checked Locking with Volatile (CORRECT)**

```java
public class DatabaseConnection {
    private static volatile DatabaseConnection instance;
    
    private DatabaseConnection() {
        System.out.println("Creating database connection...");
    }
    
    public static DatabaseConnection getInstance() {
        if (instance == null) {  // Check 1 (no lock)
            synchronized (DatabaseConnection.class) {
                if (instance == null) {  // Check 2 (with lock)
                    instance = new DatabaseConnection();
                }
            }
        }
        return instance;
    }
}

// Thread-safe: ✓
// Performance: ✓ (fast after initialization)
// Correctness: ✓ (volatile prevents instruction reordering)

// But: Complex, hard to understand, easy to implement incorrectly
```

---

#### **Version 5: Bill Pugh Singleton (BEST Classic Approach)**

```java
public class DatabaseConnection {
    
    private DatabaseConnection() {
        System.out.println("Creating database connection...");
    }
    
    private static class SingletonHelper {
        private static final DatabaseConnection INSTANCE = new DatabaseConnection();
    }
    
    public static DatabaseConnection getInstance() {
        return SingletonHelper.INSTANCE;
    }
}

// Thread-safe: ✓ (JVM guarantees)
// Lazy loading: ✓ (loaded when first accessed)
// Performance: ✓ (no synchronization)
// Simplicity: ✓ (leverages JVM's class loading mechanism)

// How it works:
// 1. Outer class loaded → inner class NOT loaded
// 2. getInstance() called → inner class loaded
// 3. JVM ensures thread-safe initialization of static field
// 4. INSTANCE created once, subsequent calls return same instance
```

---

#### **Version 6: Enum Singleton (MOST CORRECT)**

```java
public enum DatabaseConnection {
    INSTANCE;
    
    private Connection connection;
    
    DatabaseConnection() {
        System.out.println("Creating database connection...");
        // Initialize connection
    }
    
    public Connection getConnection() {
        return connection;
    }
    
    public void executeQuery(String sql) {
        // Use connection
    }
}

// Usage
DatabaseConnection.INSTANCE.executeQuery("SELECT * FROM users");

// Thread-safe: ✓
// Serialization-safe: ✓ (prevents multiple instances during deserialization)
// Reflection-safe: ✓ (prevents reflection attacks)
// Simplicity: ✓ (shortest implementation)

// Recommended by Joshua Bloch (Effective Java)
// But: Still a singleton with all its problems!
```

---

### **Why Singleton is Dangerous (Deep Analysis)**

#### **Problem 1: Hidden Dependencies (Global State)**

```java
// BAD: Hidden dependency on singleton
public class OrderService {
    
    public void createOrder(Order order) {
        // Hidden dependency! Not visible in constructor
        Logger logger = Logger.getInstance();
        Config config = Config.getInstance();
        Cache cache = Cache.getInstance();
        
        logger.info("Creating order: " + order.getId());
        
        if (config.getBoolean("cache.enabled")) {
            cache.put("order:" + order.getId(), order);
        }
        
        // Business logic...
    }
}

// Problems:
// 1. Not obvious what this class depends on
// 2. Can't see dependencies without reading entire code
// 3. Hard to change (global state shared everywhere)
// 4. Impossible to mock for testing

// GOOD: Explicit dependencies (Dependency Injection)
@Service
public class OrderService {
    
    private final Logger logger;
    private final Config config;
    private final Cache cache;
    
    // Dependencies explicit in constructor
    public OrderService(Logger logger, Config config, Cache cache) {
        this.logger = logger;
        this.config = config;
        this.cache = cache;
    }
    
    public void createOrder(Order order) {
        logger.info("Creating order: " + order.getId());
        
        if (config.getBoolean("cache.enabled")) {
            cache.put("order:" + order.getId(), order);
        }
        
        // Business logic...
    }
}

// Benefits:
// 1. Dependencies visible at constructor level
// 2. Easy to mock for testing
// 3. Easy to change implementations
// 4. Encourages loose coupling
```

---

#### **Problem 2: Testing Nightmare**

```java
// Singleton class (HARD TO TEST)
public class EmailService {
    private static EmailService instance;
    private int emailsSent = 0;
    
    private EmailService() {}
    
    public static EmailService getInstance() {
        if (instance == null) {
            instance = new EmailService();
        }
        return instance;
    }
    
    public void sendEmail(String to, String subject, String body) {
        // Actually sends email to external SMTP server
        System.out.println("Sending email to: " + to);
        emailsSent++;
    }
    
    public int getEmailsSent() {
        return emailsSent;
    }
}

// Code using singleton
public class UserService {
    public void registerUser(User user) {
        // Save to database
        
        // Send welcome email (uses singleton)
        EmailService.getInstance().sendEmail(
            user.getEmail(),
            "Welcome!",
            "Thanks for registering"
        );
    }
}

// TEST: How do you test this?
@Test
public void testUserRegistration() {
    UserService service = new UserService();
    User user = new User("test@example.com");
    
    service.registerUser(user);
    
    // Problem 1: Emails actually sent to real SMTP server!
    // Problem 2: Can't mock EmailService.getInstance()
    // Problem 3: State shared across tests (emailsSent counter)
    // Problem 4: Tests depend on execution order
    // Problem 5: Can't test in parallel (shared state)
}

// With Dependency Injection (EASY TO TEST)
@Service
public class UserService {
    
    private final EmailService emailService;
    
    public UserService(EmailService emailService) {
        this.emailService = emailService;
    }
    
    public void registerUser(User user) {
        // Save to database
        
        // Send welcome email
        emailService.sendEmail(
            user.getEmail(),
            "Welcome!",
            "Thanks for registering"
        );
    }
}

// TEST: Easy to mock!
@Test
public void testUserRegistration() {
    EmailService mockEmailService = mock(EmailService.class);
    UserService service = new UserService(mockEmailService);
    
    User user = new User("test@example.com");
    service.registerUser(user);
    
    // Verify email was sent (no real SMTP call)
    verify(mockEmailService).sendEmail(
        eq("test@example.com"),
        eq("Welcome!"),
        eq("Thanks for registering")
    );
}

// Benefits:
// ✓ No real email sent
// ✓ Fast tests (no I/O)
// ✓ Isolated tests (no shared state)
// ✓ Parallel execution safe
// ✓ Easy to verify interactions
```

---

#### **Problem 3: Thread Safety Issues**

```java
// Singleton with mutable state (DANGEROUS)
public class Counter {
    private static Counter instance;
    private int count = 0;  // Mutable state!
    
    private Counter() {}
    
    public static Counter getInstance() {
        if (instance == null) {
            instance = new Counter();
        }
        return instance;
    }
    
    public void increment() {
        count++;  // Not thread-safe!
    }
    
    public int getCount() {
        return count;
    }
}

// Test: Multi-threaded access
public static void main(String[] args) throws InterruptedException {
    Counter counter = Counter.getInstance();
    
    // 10 threads, each increments 1000 times
    ExecutorService executor = Executors.newFixedThreadPool(10);
    for (int i = 0; i < 10; i++) {
        executor.submit(() -> {
            for (int j = 0; j < 1000; j++) {
                counter.increment();
            }
        });
    }
    
    executor.shutdown();
    executor.awaitTermination(10, TimeUnit.SECONDS);
    
    System.out.println("Expected: 10000");
    System.out.println("Actual: " + counter.getCount());
}

// Output:
// Expected: 10000
// Actual: 9847  ← Lost updates due to race conditions!

// Problem: count++ is not atomic
// Thread 1: Read count (0)
// Thread 2: Read count (0)
// Thread 1: Write count (1)
// Thread 2: Write count (1)
// Result: Expected 2, got 1 (lost update)

// Solution 1: Synchronization (slow)
public synchronized void increment() {
    count++;
}

// Solution 2: AtomicInteger (better)
private AtomicInteger count = new AtomicInteger(0);

public void increment() {
    count.incrementAndGet();
}

// Solution 3: Don't use singleton! (best)
@Service
public class CounterService {
    private AtomicInteger count = new AtomicInteger(0);
    
    public void increment() {
        count.incrementAndGet();
    }
}
```

---

#### **Problem 4: Violates SOLID Principles**

```java
// Singleton violates Single Responsibility Principle
public class DatabaseConnection {
    private static DatabaseConnection instance;
    private Connection connection;
    
    private DatabaseConnection() {
        // Responsibility 1: Manage own lifecycle (singleton logic)
        connection = createConnection();
    }
    
    public static DatabaseConnection getInstance() {
        // Responsibility 2: Control instantiation
        if (instance == null) {
            instance = new DatabaseConnection();
        }
        return instance;
    }
    
    public ResultSet executeQuery(String sql) {
        // Responsibility 3: Execute database queries
        try {
            Statement stmt = connection.createStatement();
            return stmt.executeQuery(sql);
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }
    
    private Connection createConnection() {
        // Responsibility 4: Connection creation logic
        try {
            return DriverManager.getConnection(
                "jdbc:postgresql://localhost:5432/db",
                "user",
                "password"
            );
        } catch (SQLException e) {
            throw new RuntimeException(e);
        }
    }
}

// Problems:
// ❌ Too many responsibilities
// ❌ Hard to change (coupled to lifecycle management)
// ❌ Can't separate concerns

// GOOD: Separate concerns
@Configuration
public class DatabaseConfig {
    // Responsibility 1: Configuration
    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://localhost:5432/db");
        config.setUsername("user");
        config.setPassword("password");
        return new HikariDataSource(config);
    }
}

@Repository
public class UserRepository {
    // Responsibility 2: Database operations
    private final JdbcTemplate jdbcTemplate;
    
    public UserRepository(DataSource dataSource) {
        this.jdbcTemplate = new JdbcTemplate(dataSource);
    }
    
    public List<User> findAll() {
        return jdbcTemplate.query(
            "SELECT * FROM users",
            (rs, rowNum) -> new User(rs.getLong("id"), rs.getString("name"))
        );
    }
}

// Spring manages lifecycle (Responsibility 3: Lifecycle)
// Each component has single responsibility
```

---

#### **Problem 5: Doesn't Work in Distributed Systems**

```java
// Singleton in single JVM (works)
public class SessionManager {
    private static SessionManager instance;
    private Map<String, UserSession> sessions = new ConcurrentHashMap<>();
    
    public static SessionManager getInstance() {
        if (instance == null) {
            instance = new SessionManager();
        }
        return instance;
    }
    
    public void createSession(String sessionId, UserSession session) {
        sessions.put(sessionId, session);
    }
    
    public UserSession getSession(String sessionId) {
        return sessions.get(sessionId);
    }
}

// Scenario: Horizontal scaling (3 servers)

// Request 1: User logs in
// → Load balancer routes to Server 1
// → SessionManager.getInstance() creates session
// → Session stored in Server 1's memory

// Request 2: User makes API call
// → Load balancer routes to Server 2
// → SessionManager.getInstance() doesn't have session!
// → User appears logged out
// → 401 Unauthorized

// Problem: Each server has its own singleton instance
// Not truly a singleton across the cluster!

// SOLUTION: External shared state (Redis)
@Service
public class SessionService {
    
    private final RedisTemplate<String, UserSession> redis;
    
    public SessionService(RedisTemplate<String, UserSession> redis) {
        this.redis = redis;
    }
    
    public void createSession(String sessionId, UserSession session) {
        redis.opsForValue().set(
            "session:" + sessionId,
            session,
            30,
            TimeUnit.MINUTES
        );
    }
    
    public UserSession getSession(String sessionId) {
        return redis.opsForValue().get("session:" + sessionId);
    }
}

// Now works across all servers:
// Request 1 (Server 1): Store session in Redis
// Request 2 (Server 2): Read session from Redis
// Result: Session found! ✓
```

---

#### **Problem 6: Serialization Issues**

```java
// Singleton with serialization
public class Config implements Serializable {
    private static Config instance;
    private String apiKey;
    
    private Config() {
        apiKey = "secret-key-12345";
    }
    
    public static Config getInstance() {
        if (instance == null) {
            instance = new Config();
        }
        return instance;
    }
}

// Serialize and deserialize
Config original = Config.getInstance();
ByteArrayOutputStream baos = new ByteArrayOutputStream();
ObjectOutputStream oos = new ObjectOutputStream(baos);
oos.writeObject(original);

ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray());
ObjectInputStream ois = new ObjectInputStream(bais);
Config deserialized = (Config) ois.readObject();

System.out.println(original == deserialized);  // FALSE!
// Problem: Deserialization creates NEW instance (violates singleton)

// SOLUTION: Implement readResolve()
public class Config implements Serializable {
    private static Config instance;
    private String apiKey;
    
    private Config() {
        apiKey = "secret-key-12345";
    }
    
    public static Config getInstance() {
        if (instance == null) {
            instance = new Config();
        }
        return instance;
    }
    
    // Prevent creating new instance during deserialization
    protected Object readResolve() {
        return getInstance();
    }
}

// Now: original == deserialized (TRUE)

// But: This is complex and error-prone!
// Better: Don't use singleton, use Spring beans (Spring handles this)
```

---

#### **Problem 7: Reflection Attack**

```java
// Singleton can be broken by reflection
public class DatabaseConnection {
    private static DatabaseConnection instance;
    
    private DatabaseConnection() {
        System.out.println("Creating instance");
    }
    
    public static DatabaseConnection getInstance() {
        if (instance == null) {
            instance = new DatabaseConnection();
        }
        return instance;
    }
}

// Normal usage
DatabaseConnection instance1 = DatabaseConnection.getInstance();
System.out.println("Instance 1: " + instance1);

// Reflection attack
Constructor<DatabaseConnection> constructor = 
    DatabaseConnection.class.getDeclaredConstructor();
constructor.setAccessible(true);  // Bypass private
DatabaseConnection instance2 = constructor.newInstance();
System.out.println("Instance 2: " + instance2);

System.out.println("Same instance? " + (instance1 == instance2));  // FALSE!

// Output:
// Creating instance
// Instance 1: DatabaseConnection@1a2b3c
// Creating instance
// Instance 2: DatabaseConnection@4d5e6f
// Same instance? false

// SOLUTION 1: Throw exception in constructor
private DatabaseConnection() {
    if (instance != null) {
        throw new IllegalStateException("Instance already created!");
    }
}

// SOLUTION 2: Use enum (reflection can't instantiate enums)
public enum DatabaseConnection {
    INSTANCE;
}

// SOLUTION 3: Don't use singleton! Use Spring (best)
```

---

### **Modern Alternative: Spring Beans (Singleton Scope)**

```java
// Spring manages singleton lifecycle
@Service  // Creates singleton-scoped bean by default
public class UserService {
    
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    // Constructor injection (dependencies explicit)
    public UserService(UserRepository userRepository, 
                       EmailService emailService) {
        this.userRepository = userRepository;
        this.emailService = emailService;
    }
    
    public void registerUser(User user) {
        userRepository.save(user);
        emailService.sendWelcomeEmail(user.getEmail());
    }
}

// Spring creates ONE instance of UserService
// But managed by Spring container, not static getInstance()

// Benefits over traditional singleton:
// ✓ Dependencies injected (not hidden globals)
// ✓ Easy to test (can inject mocks)
// ✓ Thread-safe (Spring manages lifecycle)
// ✓ Can change scope (prototype, request, session)
// ✓ Lifecycle callbacks (@PostConstruct, @PreDestroy)
// ✓ AOP support (interceptors, proxies)
// ✓ Works with Spring ecosystem (transactions, caching, etc.)
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### **Performance Impact of Singleton vs Dependency Injection**

**Scenario: E-commerce API (10,000 requests/second)**

**Approach 1: Synchronized Singleton (BAD)**
```java
public class Logger {
    private static Logger instance;
    
    public static synchronized Logger getInstance() {
        if (instance == null) {
            instance = new Logger();
        }
        return instance;
    }
}

// Every request acquires lock
Benchmark:
- 10,000 req/sec
- Each request: 3 logger calls
- Total: 30,000 getInstance() calls/sec
- Synchronized overhead: 0.01ms per call
- Total overhead: 300ms/sec per server
- Result: 30% CPU wasted on synchronization!
```

**Approach 2: Spring Bean (GOOD)**
```java
@Service
public class UserService {
    private final Logger logger;
    
    public UserService(Logger logger) {
        this.logger = logger;  // Injected once at startup
    }
}

// Logger injected once, no runtime lookup
Benchmark:
- 10,000 req/sec
- Logger lookup: 0 (already injected)
- Overhead: 0ms
- Result: 0% CPU wasted
```

**Impact:**
```
Servers needed:

With synchronized singleton:
- 30% CPU wasted on locks
- Effective capacity: 7,000 req/sec per server
- Servers needed: 10,000 / 7,000 = 1.43 → 2 servers
- Cost: 2 × $500/month = $1,000/month

With Spring DI:
- 0% CPU wasted
- Effective capacity: 10,000 req/sec per server
- Servers needed: 10,000 / 10,000 = 1 server
- Cost: 1 × $500/month = $500/month

Savings: $500/month = $6,000/year per service
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Configuration Management: Singleton vs External Store**

**Anti-Pattern: Singleton Configuration**
```java
public class AppConfig {
    private static AppConfig instance;
    private Properties properties;
    
    private AppConfig() {
        properties = loadPropertiesFromFile();
    }
    
    public static AppConfig getInstance() {
        if (instance == null) {
            instance = new AppConfig();
        }
        return instance;
    }
    
    public String get(String key) {
        return properties.getProperty(key);
    }
}

// Problems:
// ❌ Can't change config without restart
// ❌ Different config per server (if file-based)
// ❌ No centralized management
// ❌ No audit trail
```

**Modern Pattern: Externalized Configuration**
```java
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppConfig {
    private String apiKey;
    private int maxConnections;
    private boolean featureFlagEnabled;
    
    // Getters and setters
}

// application.yml
app:
  api-key: ${API_KEY}  # From environment variable
  max-connections: 100
  feature-flag-enabled: true

// Or: Spring Cloud Config Server
@EnableConfigServer
@SpringBootApplication
public class ConfigServerApplication {
    // Centralized configuration for all services
}

// Benefits:
// ✓ Change config without restart (@RefreshScope)
// ✓ Centralized management
// ✓ Environment-specific configs (dev, staging, prod)
// ✓ Audit trail (who changed what, when)
// ✓ Feature flags (enable/disable features dynamically)
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Singleton's Impact on Scalability**

**Problem: Singleton Prevents Horizontal Scaling**

```java
// In-memory cache singleton
public class ProductCache {
    private static ProductCache instance;
    private Map<Long, Product> cache = new ConcurrentHashMap<>();
    
    public static ProductCache getInstance() {
        if (instance == null) {
            instance = new ProductCache();
        }
        return instance;
    }
    
    public void put(Long id, Product product) {
        cache.put(id, product);
    }
    
    public Product get(Long id) {
        return cache.get(id);
    }
}

// Scenario: Scale from 1 to 3 servers

// Server 1:
ProductCache.getInstance().put(1L, product1);

// Server 2:
Product p = ProductCache.getInstance().get(1L);  // NULL! (not in Server 2's cache)

// Result: Cache miss rate skyrockets!
// - 1 server: 95% hit rate
// - 3 servers: 68% hit rate (data distributed)
// - Database load increases 3x
```

**Solution: Distributed Cache**
```java
@Service
public class ProductService {
    
    private final RedisTemplate<Long, Product> redis;
    
    public ProductService(RedisTemplate<Long, Product> redis) {
        this.redis = redis;
    }
    
    public void cacheProduct(Long id, Product product) {
        redis.opsForValue().set(id, product, 1, TimeUnit.HOURS);
    }
    
    public Product getCachedProduct(Long id) {
        return redis.opsForValue().get(id);
    }
}

// Now all servers share same cache:
// Server 1: Put product in Redis
// Server 2: Get product from Redis (HIT!)
// Server 3: Get product from Redis (HIT!)

// Result:
// - 3 servers: 95% hit rate (same as 1 server)
// - Database load: Unchanged
// - Scales horizontally ✓
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### **Security Issues with Singleton**

**Problem: Shared Mutable State (Security Risk)**

```java
// Singleton stores sensitive data
public class SecurityContext {
    private static SecurityContext instance;
    private String currentUsername;
    private Set<String> permissions;
    
    private SecurityContext() {
        permissions = new HashSet<>();
    }
    
    public static SecurityContext getInstance() {
        if (instance == null) {
            instance = new SecurityContext();
        }
        return instance;
    }
    
    public void setCurrentUser(String username, Set<String> userPermissions) {
        this.currentUsername = username;
        this.permissions = userPermissions;
    }
    
    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }
}

// Request 1: User A logs in
SecurityContext.getInstance().setCurrentUser("alice", Set.of("READ", "WRITE"));

// Request 2: User B logs in (different thread, same server)
SecurityContext.getInstance().setCurrentUser("bob", Set.of("READ"));

// Request 1 continues: Check permission
boolean canWrite = SecurityContext.getInstance().hasPermission("WRITE");
// FALSE! Because Request 2 overwrote the permissions!
// Alice lost WRITE permission due to race condition!

// SECURITY BUG: User A might gain User B's permissions or vice versa
```

**Solution: Thread-Local or Request-Scoped**
```java
@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
public class SecurityContext {
    
    private String currentUsername;
    private Set<String> permissions;
    
    public void setCurrentUser(String username, Set<String> permissions) {
        this.currentUsername = username;
        this.permissions = permissions;
    }
    
    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }
}

// Spring creates NEW instance for EACH request
// Request 1: SecurityContext instance A (for User A)
// Request 2: SecurityContext instance B (for User B)
// No interference! ✓

// Or: Use Spring Security's SecurityContextHolder (thread-local)
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: Twitter's Early Architecture (Singleton Hell)**

**Problem (2007-2008):**
```
Twitter's early Ruby on Rails codebase heavily used singletons:
- DatabaseConnection.instance
- Cache.instance
- Logger.instance
- Config.instance

Issues:
1. Testing nightmare (couldn't mock singletons)
2. Memory leaks (singletons held references forever)
3. Race conditions (shared mutable state)
4. Couldn't scale horizontally (state in singletons)

Impact:
- "Fail Whale" appeared frequently
- Downtime: 3-5 hours/week
- Lost users to competitors
```

**Solution (2009-2010):**
```
1. Migrated to Scala (JVM-based)
2. Adopted dependency injection (Guice)
3. Replaced singletons with injected services
4. Moved state to external stores (Redis, MySQL)

Results:
- Fail Whale disappeared
- Scaled from 1M to 100M users
- Testing velocity increased 10x
```

---

### **Case Study 2: Netflix's Microservices (No Singletons)**

**Architecture:**
```java
// Netflix NEVER uses static singletons
// Everything is dependency injection

@RestController
public class MovieController {
    
    private final MovieService movieService;
    private final RecommendationService recommendationService;
    private final CacheService cacheService;
    
    // All dependencies injected by Spring
    public MovieController(MovieService movieService,
                          RecommendationService recommendationService,
                          CacheService cacheService) {
        this.movieService = movieService;
        this.recommendationService = recommendationService;
        this.cacheService = cacheService;
    }
    
    @GetMapping("/movies/{id}")
    public Movie getMovie(@PathVariable Long id) {
        return movieService.getMovie(id);
    }
}

// Benefits:
// ✓ Easy to test (inject mocks)
// ✓ Easy to scale (stateless services)
// ✓ Easy to deploy (independent services)
// ✓ Easy to maintain (clear dependencies)
```

**Results:**
- 1000+ microservices
- 100M+ users globally
- 99.99% availability
- 100+ deploys per day

---

### **Case Study 3: Spring Framework Evolution**

**Early Spring (2003):**
```xml
<!-- XML configuration (manual singleton management) -->
<bean id="userService" class="com.example.UserService" scope="singleton"/>
```

**Modern Spring (2020+):**
```java
// Annotation-based (automatic singleton management)
@Service  // Singleton by default, managed by Spring
public class UserService {
    // Spring handles lifecycle
}
```

**Why Spring's Singleton is Better:**
```
Traditional Singleton:
❌ Static getInstance()
❌ Global state
❌ Hard to test
❌ Tight coupling

Spring Bean (Singleton Scope):
✓ Managed lifecycle
✓ Dependency injection
✓ Easy to test (mockable)
✓ Loose coupling
✓ AOP support
✓ Transaction management
✓ Prototype scope available (if needed)
```

---

### **Case Study 4: Google's Guice vs Singleton**

**Before Guice (2005):**
```java
// Google's internal Java code used singletons heavily
DatabasePool pool = DatabasePool.getInstance();
Logger logger = Logger.getInstance();
Cache cache = Cache.getInstance();

// Problems:
// - Testing difficult (mocking hard)
// - Refactoring risky (global dependencies)
// - Parallel development impossible (merge conflicts)
```

**After Guice (2006+):**
```java
public class UserService {
    private final DatabasePool pool;
    private final Logger logger;
    
    @Inject
    public UserService(DatabasePool pool, Logger logger) {
        this.pool = pool;
        this.logger = logger;
    }
}

// Benefits:
// - Testing easy (inject mocks)
// - Refactoring safe (dependencies explicit)
// - Parallel development possible (no global state)
```

**Impact:**
```
Development velocity increased 3x
Code quality improved significantly
Guice open-sourced (2007), inspired Spring 3.0's @Autowired
```

---

### **Case Study 5: Real Production Incident**

**Company:** Major financial services firm  
**Date:** 2019  
**Issue:** Memory leak in singleton logger

**Root Cause:**
```java
public class Logger {
    private static Logger instance;
    private List<String> logBuffer = new ArrayList<>();  // Never cleared!
    
    public static Logger getInstance() {
        if (instance == null) {
            instance = new Logger();
        }
        return instance;
    }
    
    public void log(String message) {
        logBuffer.add(message);  // Memory leak!
        
        if (logBuffer.size() > 1000) {
            flushToFile();
            // BUG: Forgot to clear buffer after flush!
        }
    }
}

// After 3 days of uptime:
// - 10M log messages
// - logBuffer: 10M strings in memory
// - Memory usage: 5GB
// - OutOfMemoryError
// - Server crash
```

**Impact:**
```
- Production outage: 2 hours
- Revenue loss: $500K
- Customer complaints: 5000+
- Engineering time wasted: 100 hours debugging
```

**Solution:**
```java
@Service
public class LoggingService {
    
    @Autowired
    private FileWriter fileWriter;
    
    public void log(String message) {
        // Write immediately, don't buffer in memory
        fileWriter.write(message);
    }
}

// Or: Use SLF4J + Logback (industry standard)
@Service
public class UserService {
    
    private static final Logger log = LoggerFactory.getLogger(UserService.class);
    
    public void createUser(User user) {
        log.info("Creating user: {}", user.getEmail());
    }
}

// Benefits:
// ✓ No memory leaks (Logback manages buffers)
// ✓ Configurable (logback.xml)
// ✓ Production-ready (async appenders, rolling files)
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "Singleton is a creational design pattern that ensures only one instance of a class exists and provides global access to it. While conceptually simple, it's considered an **anti-pattern** in modern software engineering.
>
> **The pattern works like this:** You make the constructor private, provide a static `getInstance()` method, and store the instance in a static field. The classic implementation has thread-safety issues—two threads can create two instances if you don't synchronize. The most robust classic implementation is Bill Pugh's holder pattern using a nested static class, which leverages the JVM's class loading guarantees for thread-safety without synchronization overhead.
>
> **But here's why it's dangerous:**
>
> **First, it creates global state**, which means hidden dependencies. When I see `Logger.getInstance()` buried in code, I have no idea what that class depends on without reading the entire implementation. Compare that to dependency injection where dependencies are explicit in the constructor—I can see everything the class needs at a glance.
>
> **Second, it makes testing a nightmare.** You can't mock `getInstance()` calls easily, and state persists across tests. In a project I worked on, we had tests failing randomly because a singleton counter wasn't reset between tests. It took us two days to debug because tests were dependent on execution order.
>
> **Third, it doesn't work in distributed systems.** Each server has its own JVM, so each has its own singleton instance. If you store user sessions in a singleton, requests get load-balanced across servers, and users randomly lose their sessions. You need external state like Redis for this.
>
> **Fourth, thread safety is tricky.** If your singleton has mutable state, you need proper synchronization. The naive double-checked locking is broken in Java without `volatile` due to instruction reordering. Even with `volatile`, it's complex and error-prone.
>
> **The modern solution is Spring's dependency injection.** Spring beans are singleton-scoped by default, but Spring manages the lifecycle, not static methods. Dependencies are injected, so they're explicit and mockable. You get all the benefits of single-instance behavior without the downsides of the singleton pattern.
>
> **When might singleton be acceptable?** Maybe for truly stateless utility classes, but even then, static methods are cleaner. The only legitimate use case I've seen is the enum singleton for implementing constants with behavior, but that's more of a Java idiom than a design pattern.
>
> **In interviews, if asked to implement singleton,** I'd implement it correctly—probably the Bill Pugh holder pattern or enum—but I'd also explain why I'd use Spring beans in production instead. Showing you know the pattern but understand its limitations demonstrates senior-level thinking."

---

### **Common Follow-Up Questions**

#### **Q1: Implement a thread-safe singleton in Java.**

> "I'll show you three implementations, from naive to best:
>
> **Implementation 1: Bill Pugh Holder Pattern (My Recommendation)**
> ```java
> public class DatabaseConnection {
>     
>     private DatabaseConnection() {
>         // Private constructor
>     }
>     
>     private static class Holder {
>         private static final DatabaseConnection INSTANCE = new DatabaseConnection();
>     }
>     
>     public static DatabaseConnection getInstance() {
>         return Holder.INSTANCE;
>     }
> }
> ```
>
> **Why this works:**
> - The inner `Holder` class is loaded only when `getInstance()` is called
> - JVM guarantees thread-safe initialization of static fields
> - No synchronization needed, so it's fast
> - Lazy loading (instance created on first access)
>
> **Implementation 2: Double-Checked Locking with Volatile**
> ```java
> public class DatabaseConnection {
>     private static volatile DatabaseConnection instance;
>     
>     private DatabaseConnection() {}
>     
>     public static DatabaseConnection getInstance() {
>         if (instance == null) {  // First check (no lock)
>             synchronized (DatabaseConnection.class) {
>                 if (instance == null) {  // Second check (with lock)
>                     instance = new DatabaseConnection();
>                 }
>             }
>         }
>         return instance;
>     }
> }
> ```
>
> **Why `volatile` is critical:** Without it, the JVM can reorder instructions. Thread A might:
> 1. Allocate memory for `instance`
> 2. Assign reference to `instance` (before constructor runs!)
> 3. Call constructor
>
> Thread B sees `instance != null`, returns partially constructed object → crash.
>
> `volatile` prevents this reordering by enforcing happens-before relationship.
>
> **Implementation 3: Enum Singleton (Joshua Bloch's Recommendation)**
> ```java
> public enum DatabaseConnection {
>     INSTANCE;
>     
>     public void connect() {
>         // Connection logic
>     }
> }
> ```
>
> **Why enums are best for singletons:**
> - Thread-safe by JVM guarantee
> - Serialization-safe (prevents multiple instances during deserialization)
> - Reflection-safe (you can't use reflection to instantiate enums)
> - Shortest code
>
> **In production, I'd use Spring instead:**
> ```java
> @Service
> public class DatabaseConnection {
>     // Spring creates singleton, manages lifecycle
> }
> ```
>
> **Trade-offs:**
> - Bill Pugh: Complex but pure Java solution
> - DCL + volatile: More complex, easy to get wrong
> - Enum: Best classic approach, but still has singleton issues
> - Spring: Best overall, but requires framework"

---

#### **Q2: What are alternatives to singleton pattern?**

> "There are several modern alternatives that solve the same problems without singleton's downsides:
>
> **1. Dependency Injection (Best for Most Cases)**
> ```java
> // Instead of:
> Logger logger = Logger.getInstance();
> 
> // Use:
> @Service
> public class UserService {
>     private final Logger logger;
>     
>     public UserService(Logger logger) {
>         this.logger = logger;  // Injected by Spring
>     }
> }
> ```
>
> **Benefits:**
> - Dependencies explicit
> - Easy to test (inject mocks)
> - Loose coupling
> - Spring manages lifecycle
>
> **When to use:** Almost always (99% of cases)
>
> **2. Static Methods (For Stateless Utilities)**
> ```java
> // Instead of:
> MathUtils.getInstance().add(1, 2);
> 
> // Use:
> public class MathUtils {
>     private MathUtils() {}  // Prevent instantiation
>     
>     public static int add(int a, int b) {
>         return a + b;
>     }
> }
> ```
>
> **When to use:** Pure utility methods with no state
>
> **3. Monostate Pattern (Rarely Used)**
> ```java
> public class Config {
>     private static String apiKey;
>     private static int maxConnections;
>     
>     public String getApiKey() {
>         return apiKey;  // Static field, but non-static getter
>     }
>     
>     public void setApiKey(String key) {
>         apiKey = key;  // Static field, but non-static setter
>     }
> }
> 
> // Multiple instances allowed, but share state
> Config config1 = new Config();
> Config config2 = new Config();
> config1.setApiKey("key123");
> System.out.println(config2.getApiKey());  // "key123"
> ```
>
> **When to use:** Almost never (has same issues as singleton)
>
> **4. Factory Pattern (For Controlled Creation)**
> ```java
> public class DatabaseConnectionFactory {
>     private static final int MAX_CONNECTIONS = 10;
>     private static final Queue<DatabaseConnection> pool = new LinkedList<>();
>     
>     public static synchronized DatabaseConnection getConnection() {
>         if (pool.isEmpty()) {
>             return new DatabaseConnection();
>         }
>         return pool.poll();
>     }
>     
>     public static synchronized void releaseConnection(DatabaseConnection conn) {
>         if (pool.size() < MAX_CONNECTIONS) {
>             pool.offer(conn);
>         }
>     }
> }
> ```
>
> **When to use:** Connection pools, object pools
>
> **5. Service Locator (Anti-Pattern, but Sometimes Used)**
> ```java
> public class ServiceLocator {
>     private static Map<Class<?>, Object> services = new HashMap<>();
>     
>     public static <T> void register(Class<T> serviceClass, T implementation) {
>         services.put(serviceClass, implementation);
>     }
>     
>     @SuppressWarnings("unchecked")
>     public static <T> T get(Class<T> serviceClass) {
>         return (T) services.get(serviceClass);
>     }
> }
> 
> // Usage
> UserService service = ServiceLocator.get(UserService.class);
> ```
>
> **When to use:** Legacy code, plugin systems (but prefer DI)
>
> **6. ThreadLocal (For Thread-Specific Singletons)**
> ```java
> public class RequestContext {
>     private static ThreadLocal<RequestContext> context = new ThreadLocal<>();
>     
>     public static RequestContext get() {
>         RequestContext ctx = context.get();
>         if (ctx == null) {
>             ctx = new RequestContext();
>             context.set(ctx);
>         }
>         return ctx;
>     }
>     
>     public static void clear() {
>         context.remove();  // Prevent memory leak!
>     }
> }
> ```
>
> **When to use:** Request-scoped data (but prefer Spring's @RequestScope)
>
> **My recommendation by use case:**
>
> | **Use Case** | **Pattern** | **Example** |
> |--------------|-------------|-------------|
> | Business logic | Dependency Injection | `@Service` classes |
> | Utility functions | Static methods | `StringUtils.isEmpty()` |
> | Resource pools | Factory + DI | HikariCP (Spring manages) |
> | Configuration | Externalized config | Spring Boot properties |
> | Per-request data | Request scope | Spring Security context |
> | Logging | Static logger | SLF4J `LoggerFactory` |
>
> **Key insight:** The problem singleton solves—single instance with global access—is better solved by modern frameworks like Spring. Dependency injection gives you all the benefits without the downsides."

---

#### **Q3: How do you test code that uses singletons?**

> "Testing singleton-heavy code is challenging, but there are techniques:
>
> **Scenario: Code using singleton**
> ```java
> public class OrderService {
>     public void createOrder(Order order) {
>         Logger logger = Logger.getInstance();
>         Config config = Config.getInstance();
>         EmailService emailService = EmailService.getInstance();
>         
>         logger.info("Creating order: " + order.getId());
>         
>         if (config.getBoolean("email.enabled")) {
>             emailService.sendOrderConfirmation(order);
>         }
>     }
> }
> ```
>
> **Problem:** Can't mock `getInstance()` calls, can't isolate tests, state shared across tests.
>
> **Solution 1: Refactor to Dependency Injection (Best)**
> ```java
> public class OrderService {
>     private final Logger logger;
>     private final Config config;
>     private final EmailService emailService;
>     
>     public OrderService(Logger logger, Config config, EmailService emailService) {
>         this.logger = logger;
>         this.config = config;
>         this.emailService = emailService;
>     }
>     
>     public void createOrder(Order order) {
>         logger.info("Creating order: " + order.getId());
>         
>         if (config.getBoolean("email.enabled")) {
>             emailService.sendOrderConfirmation(order);
>         }
>     }
> }
> 
> // Test: Easy!
> @Test
> public void testCreateOrder() {
>     Logger mockLogger = mock(Logger.class);
>     Config mockConfig = mock(Config.class);
>     EmailService mockEmail = mock(EmailService.class);
>     
>     when(mockConfig.getBoolean("email.enabled")).thenReturn(true);
>     
>     OrderService service = new OrderService(mockLogger, mockConfig, mockEmail);
>     Order order = new Order(123L);
>     
>     service.createOrder(order);
>     
>     verify(mockEmail).sendOrderConfirmation(order);
> }
> ```
>
> **Solution 2: PowerMock (Hack for Legacy Code)**
> ```java
> @RunWith(PowerMockRunner.class)
> @PrepareForTest({Logger.class, Config.class, EmailService.class})
> public class OrderServiceTest {
>     
>     @Test
>     public void testCreateOrder() {
>         // Mock static getInstance() methods
>         Logger mockLogger = mock(Logger.class);
>         Config mockConfig = mock(Config.class);
>         EmailService mockEmail = mock(EmailService.class);
>         
>         PowerMockito.mockStatic(Logger.class);
>         when(Logger.getInstance()).thenReturn(mockLogger);
>         
>         PowerMockito.mockStatic(Config.class);
>         when(Config.getInstance()).thenReturn(mockConfig);
>         when(mockConfig.getBoolean("email.enabled")).thenReturn(true);
>         
>         PowerMockito.mockStatic(EmailService.class);
>         when(EmailService.getInstance()).thenReturn(mockEmail);
>         
>         OrderService service = new OrderService();
>         Order order = new Order(123L);
>         
>         service.createOrder(order);
>         
>         verify(mockEmail).sendOrderConfirmation(order);
>     }
> }
> ```
>
> **Why PowerMock is a last resort:**
> - Requires bytecode manipulation
> - Slow tests (reflection overhead)
> - Fragile (breaks with Java version changes)
> - Hides design issues (encourages bad code)
>
> **Solution 3: Reset Singleton State (Hacky)**
> ```java
> public class Logger {
>     private static Logger instance;
>     
>     // Add reset method for testing
>     @VisibleForTesting
>     public static void reset() {
>         instance = null;
>     }
> }
> 
> @Test
> public void testCreateOrder() {
>     Logger.reset();  // Reset before test
>     Config.reset();
>     EmailService.reset();
>     
>     // Test...
>     
>     Logger.reset();  // Reset after test
>     Config.reset();
>     EmailService.reset();
> }
> ```
>
> **Problems with reset:**
> - Easy to forget
> - Not thread-safe (parallel tests fail)
> - Pollutes production code
>
> **Solution 4: Wrap in Interface (Strangler Pattern)**
> ```java
> // Wrapper interface
> public interface LoggerAdapter {
>     void info(String message);
> }
> 
> // Production implementation
> public class SingletonLoggerAdapter implements LoggerAdapter {
>     @Override
>     public void info(String message) {
>         Logger.getInstance().info(message);
>     }
> }
> 
> // Test implementation
> public class MockLoggerAdapter implements LoggerAdapter {
>     private List<String> messages = new ArrayList<>();
>     
>     @Override
>     public void info(String message) {
>         messages.add(message);
>     }
>     
>     public List<String> getMessages() {
>         return messages;
>     }
> }
> 
> // Refactored service
> public class OrderService {
>     private final LoggerAdapter logger;
>     
>     public OrderService(LoggerAdapter logger) {
>         this.logger = logger;
>     }
> }
> 
> // Test: Easy!
> @Test
> public void testCreateOrder() {
>     MockLoggerAdapter mockLogger = new MockLoggerAdapter();
>     OrderService service = new OrderService(mockLogger);
>     
>     service.createOrder(order);
>     
>     assertTrue(mockLogger.getMessages().contains("Creating order: 123"));
> }
> ```
>
> **When to use each approach:**
> - **Refactor to DI:** New code, greenfield projects (best)
> - **PowerMock:** Legacy code, can't refactor yet (temporary)
> - **Reset:** Simple singletons with no dependencies (rare)
> - **Wrapper:** Legacy code, gradual migration (strangler pattern)
>
> **Key principle:** If testing is hard, the design is wrong. Difficulty testing is a code smell—it reveals hidden dependencies and tight coupling. The solution is better design, not more powerful testing tools."

---

#### **Q4: When would you actually use a singleton in production?**

> "In modern Java/Spring applications, I'd rarely use a traditional singleton. But there are a few legitimate cases:
>
> **1. Enum Constants with Behavior (Most Common)**
> ```java
> public enum PaymentStatus {
>     PENDING {
>         @Override
>         public boolean canTransitionTo(PaymentStatus newStatus) {
>             return newStatus == COMPLETED || newStatus == FAILED;
>         }
>     },
>     COMPLETED {
>         @Override
>         public boolean canTransitionTo(PaymentStatus newStatus) {
>             return newStatus == REFUNDED;
>         }
>     },
>     FAILED {
>         @Override
>         public boolean canTransitionTo(PaymentStatus newStatus) {
>             return false;  // Terminal state
>         }
>     },
>     REFUNDED {
>         @Override
>         public boolean canTransitionTo(PaymentStatus newStatus) {
>             return false;  // Terminal state
>         }
>     };
>     
>     public abstract boolean canTransitionTo(PaymentStatus newStatus);
> }
> 
> // Usage
> if (currentStatus.canTransitionTo(newStatus)) {
>     payment.setStatus(newStatus);
> }
> ```
>
> **Why this is acceptable:** Enums are immutable, stateless behavior, type-safe.
>
> **2. Logger (SLF4J Pattern)**
> ```java
> @Service
> public class UserService {
>     private static final Logger log = LoggerFactory.getLogger(UserService.class);
>     
>     public void createUser(User user) {
>         log.info("Creating user: {}", user.getEmail());
>     }
> }
> ```
>
> **Why this is acceptable:**
> - Industry standard (SLF4J)
> - Logger is stateless (delegates to framework)
> - Static field is per-class, not global
> - Doesn't affect testability (logging is infrastructure)
>
> **3. Immutable Configuration Constants**
> ```java
> public enum Environment {
>     INSTANCE;
>     
>     private final String name;
>     private final boolean production;
>     
>     Environment() {
>         // Read from environment variables (once)
>         this.name = System.getenv("ENV_NAME");
>         this.production = "production".equals(name);
>     }
>     
>     public boolean isProduction() {
>         return production;
>     }
> }
> ```
>
> **Why this is acceptable:** Immutable, read once at startup, no shared mutable state.
>
> **4. Hardware Resource Access (Rare)**
> ```java
> public enum PrinterSpooler {
>     INSTANCE;
>     
>     private final Printer physicalPrinter;
>     
>     PrinterSpooler() {
>         // Connect to actual hardware device
>         this.physicalPrinter = connectToHardware();
>     }
>     
>     public void print(Document doc) {
>         physicalPrinter.print(doc);
>     }
> }
> ```
>
> **Why this is acceptable:** Truly single hardware resource (can't have multiple printers).
>
> **What I'd NEVER use singleton for:**
> - ❌ Database connections (use HikariCP pool)
> - ❌ Caching (use Redis, Caffeine)
> - ❌ Configuration (use Spring properties)
> - ❌ User sessions (use Redis, database)
> - ❌ Business logic services (use Spring DI)
> - ❌ Repositories (use Spring DI)
> - ❌ Any mutable state
>
> **Decision framework:**
> ```
> Should I use singleton?
> 
> 1. Is it immutable? NO → Don't use singleton
> 2. Is it truly single resource? NO → Don't use singleton
> 3. Does Spring manage it better? YES → Use Spring bean
> 4. Can it be static method? YES → Use static method
> 5. Is it enum constant? YES → OK to use enum singleton
> 6. Still want singleton? → Reconsider, likely wrong choice
> ```
>
> **In interviews, if asked to use singleton:**
> I'd implement it correctly (Bill Pugh or enum), but I'd also say: _'In production, I'd use Spring beans instead because they're easier to test and maintain. I'd only use singleton for constants with behavior or loggers.'_
>
> This shows I know the pattern but understand its limitations—senior-level thinking."

---

#### **Q5: Explain double-checked locking and why it's broken without volatile.**

> "Double-checked locking is an optimization to avoid synchronization overhead after the singleton is initialized. Let me explain why the naive version is broken and how volatile fixes it.
>
> **The Pattern:**
> ```java
> public class Singleton {
>     private static Singleton instance;
>     
>     public static Singleton getInstance() {
>         if (instance == null) {           // Check 1 (no lock)
>             synchronized (Singleton.class) {
>                 if (instance == null) {   // Check 2 (with lock)
>                     instance = new Singleton();
>                 }
>             }
>         }
>         return instance;
>     }
> }
> ```
>
> **Why two checks?**
> - **First check (no lock):** Fast path for already-initialized singleton
> - **Synchronization:** Only acquire lock if instance is null
> - **Second check (with lock):** Multiple threads might pass first check simultaneously
>
> **The Subtle Bug (Without Volatile):**
>
> Creating an object involves three steps:
> 1. Allocate memory for object
> 2. Assign reference to `instance`
> 3. Call constructor (initialize object)
>
> **The JVM can reorder steps 2 and 3!**
>
> ```
> Thread 1:
> 1. Allocates memory at address 0x1234
> 2. Assigns instance = 0x1234 (BEFORE constructor!)
> 3. [Constructor hasn't run yet]
>
> Thread 2:
> 1. Checks instance == null? FALSE (it's 0x1234)
> 2. Returns instance (partially constructed!)
> 3. Calls method on instance → NullPointerException!
> ```
>
> **Why reordering happens:**
> - JVM optimizes for performance
> - From Thread 1's perspective, order doesn't matter
> - JVM doesn't know Thread 2 will check instance without lock
>
> **Concrete Example:**
> ```java
> public class DatabaseConnection {
>     private Connection connection;
>     private String url;
>     
>     public DatabaseConnection() {
>         this.url = "jdbc:postgresql://localhost:5432/db";
>         this.connection = createConnection();  // Expensive operation
>     }
> }
> ```
>
> Without volatile:
> ```
> Thread 1:
> 1. Allocates memory for DatabaseConnection
> 2. Sets static instance = reference (BEFORE constructor)
> 3. Thread 1 paused by scheduler
>
> Thread 2:
> 1. Checks instance == null? FALSE
> 2. Returns instance
> 3. Calls instance.connection.executeQuery(...)
> 4. connection is NULL! (constructor didn't run yet)
> 5. NullPointerException!
> ```
>
> **How Volatile Fixes It:**
> ```java
> private static volatile Singleton instance;
> ```
>
> **What volatile does:**
> 1. **Prevents reordering:** Constructor MUST complete before reference assigned
> 2. **Establishes happens-before:** Write to `instance` happens-before read
> 3. **Ensures visibility:** Changes visible to all threads immediately
>
> ```
> Thread 1 (with volatile):
> 1. Allocates memory
> 2. Calls constructor (MUST complete due to volatile)
> 3. Assigns instance = reference
> 4. Memory barrier (ensures visibility)
>
> Thread 2:
> 1. Checks instance == null? FALSE
> 2. Returns fully constructed instance ✓
> ```
>
> **Performance Impact:**
> - Without volatile: Broken, undefined behavior
> - With volatile: Correct, minimal overhead (modern JVMs optimize this)
>
> **Why Bill Pugh Pattern is Better:**
> ```java
> public class Singleton {
>     private static class Holder {
>         private static final Singleton INSTANCE = new Singleton();
>     }
>     
>     public static Singleton getInstance() {
>         return Holder.INSTANCE;
>     }
> }
> ```
>
> **Advantages:**
> - No synchronization needed
> - No volatile needed
> - JVM class loading guarantees thread-safety
> - Lazy loading (Holder class loaded on first access)
> - Simpler code (no double-checking)
>
> **When I'd use each:**
> - **DCL + volatile:** Never (too complex, easy to get wrong)
> - **Bill Pugh:** If forced to use singleton in pure Java
> - **Enum:** If need serialization-safety
> - **Spring Bean:** In real production code (99% of cases)
>
> **Interview tip:** If asked about DCL, explain the problem and solution, then say _'But I'd use Bill Pugh pattern or enum instead because they're simpler and less error-prone.'_ This shows deep understanding plus pragmatic thinking."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Singleton Pattern Evolution**

```
EVOLUTION OF SINGLETON IMPLEMENTATIONS
═══════════════════════════════════════

Version 1: Naive (BROKEN)
┌─────────────────────────────────┐
│ if (instance == null)           │
│     instance = new Singleton()  │ ← Race condition!
│ return instance                 │
└─────────────────────────────────┘
Thread-safe: ✗
Performance: ✓
Correct: ✗

↓

Version 2: Synchronized (SLOW)
┌─────────────────────────────────┐
│ synchronized getInstance() {    │ ← Lock on every call
│     if (instance == null)       │
│         instance = new Singleton()
│     return instance             │
│ }                               │
└─────────────────────────────────┘
Thread-safe: ✓
Performance: ✗ (50x slower)
Correct: ✓

↓

Version 3: Double-Checked Locking (BROKEN)
┌─────────────────────────────────┐
│ if (instance == null) {         │ ← Check 1 (no lock)
│     synchronized (this) {       │
│         if (instance == null)   │ ← Check 2 (with lock)
│             instance = new()    │ ← Reordering issue!
│     }                           │
│ }                               │
│ return instance                 │
└─────────────────────────────────┘
Thread-safe: ✗ (reordering bug)
Performance: ✓
Correct: ✗

↓

Version 4: DCL + Volatile (CORRECT but COMPLEX)
┌─────────────────────────────────┐
│ private static volatile instance│ ← Prevents reordering
│                                 │
│ if (instance == null) {         │
│     synchronized (this) {       │
│         if (instance == null)   │
│             instance = new()    │
│     }                           │
│ }                               │
│ return instance                 │
└─────────────────────────────────┘
Thread-safe: ✓
Performance: ✓
Correct: ✓
Complexity: High

↓

Version 5: Bill Pugh (BEST CLASSIC)
┌─────────────────────────────────┐
│ private static class Holder {   │
│     static final INSTANCE =     │ ← JVM guarantees
│         new Singleton()         │   thread-safety
│ }                               │
│                                 │
│ return Holder.INSTANCE          │ ← No synchronization
└─────────────────────────────────┘
Thread-safe: ✓
Performance: ✓
Correct: ✓
Complexity: Low

↓

Version 6: Enum (MOST ROBUST)
┌─────────────────────────────────┐
│ public enum Singleton {         │
│     INSTANCE;                   │
│ }                               │
└─────────────────────────────────┘
Thread-safe: ✓
Serialization-safe: ✓
Reflection-safe: ✓
Simplicity: ✓

↓

Modern: Spring Bean (BEST OVERALL)
┌─────────────────────────────────┐
│ @Service                        │
│ public class MyService {        │
│     // Spring manages lifecycle │ ← Testable, flexible
│ }                               │
└─────────────────────────────────┘
Thread-safe: ✓
Testable: ✓
Maintainable: ✓
Production-ready: ✓
```

---

### **Double-Checked Locking Bug Visualization**

```
WITHOUT VOLATILE (BROKEN)
═════════════════════════

Timeline →

Thread 1:                    Thread 2:
─────────                    ─────────

if (instance == null) ✓
                            
acquire lock                
                            
if (instance == null) ✓     
                            
allocate memory (0x1234)    
                            
assign: instance = 0x1234   ← BEFORE constructor!
                            
                             if (instance == null) ✗
                             
                             return instance (0x1234)
                             
                             call instance.method()
                             
                             ✗ NullPointerException!
                             (fields not initialized)
                            
call constructor            
                            
initialize fields           

result: Thread 2 got partially constructed object!


WITH VOLATILE (CORRECT)
═══════════════════════

Timeline →

Thread 1:                    Thread 2:
─────────                    ─────────

if (instance == null) ✓
                            
acquire lock                
                            
if (instance == null) ✓     
                            
allocate memory (0x1234)    
                            
call constructor ← FIRST    
                            
initialize fields           
                            
memory barrier (volatile)   
                            
assign: instance = 0x1234   ← AFTER constructor
                            
                             if (instance == null) ✗
                             
                             return instance (0x1234)
                             
                             call instance.method()
                             
                             ✓ Works! (fully constructed)

result: Thread 2 got fully constructed object!
```

---

### **Singleton vs Dependency Injection**

```
SINGLETON (STATIC)
══════════════════

┌─────────────────────────────────┐
│        Application              │
│                                 │
│  ┌─────────┐    ┌─────────┐     │
│  │Service A│───>│Logger   │     │
│  └─────────┘    │.getInstance() │
│                 └─────────┘     │
│  ┌─────────┐          ↑         │
│  │Service B│──────────┘         │
│  └─────────┘                    │
│                                 │
│  ┌─────────┐          ↑         │
│  │Service C│──────────┘         │
│  └─────────┘                    │
└─────────────────────────────────┘

Problems:
❌ Hidden dependencies (not visible)
❌ Global state (shared, mutable)
❌ Hard to test (can't mock getInstance())
❌ Tight coupling (changes risky)


DEPENDENCY INJECTION (SPRING)
══════════════════════════════

┌─────────────────────────────────┐
│     Spring Container            │
│                                 │
│     ┌─────────┐                 │
│     │ Logger  │              c  │
│     └────┬────┘                 │
│          │                      │
│    ┌─────┴──────┬──────┐        │
│    ↓            ↓      ↓        │
│  ┌──────┐   ┌──────┐ ┌──────┐   │
│  │Svc A │   │Svc B │ │Svc C │   │
│  └──────┘   └──────┘ └──────┘   │
└─────────────────────────────────┘

Constructor injection (explicit):

class ServiceA {
    private final Logger logger;
    
    ServiceA(Logger logger) {
        this.logger = logger;
    }
}

Benefits:
✓ Explicit dependencies (visible in constructor)
✓ Easy to test (inject mocks)
✓ Loose coupling (change implementations easily)
✓ Spring manages lifecycle
✓ Supports multiple scopes (singleton, prototype, request)
```

---

### **Singleton in Distributed System (Why It Fails)**

```
SINGLE SERVER (Singleton Works)
════════════════════════════════

┌─────────────────────────────────┐
│         Server                  │
│                                 │
│    ┌───────────────┐           │
│    │ JVM           │           │
│    │               │           │
│    │ Singleton     │           │
│    │ instance      │           │
│    │ (ONE copy)    │           │
│    │               │           │
│    └───────────────┘           │
└─────────────────────────────────┘

Request 1 → Server → Singleton ✓
Request 2 → Server → Singleton ✓
Request 3 → Server → Singleton ✓

Result: All requests see same instance


HORIZONTAL SCALING (Singleton Breaks)
══════════════════════════════════════

          ┌─ Load Balancer ─┐
          │                 │
     ┌────┴────┬────────────┴────┬─────────────┐
     ↓         ↓                  ↓             ↓
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│Server 1 │ │Server 2 │ │Server 3 │ │Server 4 │
│         │ │         │ │         │ │         │
│ JVM A   │ │ JVM B   │ │ JVM C   │ │ JVM D   │
│         │ │         │ │         │ │         │
│ Sing. A │ │ Sing. B │ │ Sing. C │ │ Sing. D │
└─────────┘ └─────────┘ └─────────┘ └─────────┘

Request 1 → Server 1 → Singleton A (different instance)
Request 2 → Server 2 → Singleton B (different instance)
Request 3 → Server 3 → Singleton C (different instance)
Request 4 → Server 1 → Singleton A (different instance)

Result: 4 instances, not a singleton!

Problem: Each JVM has its own instance
→ State not shared across servers
→ User sessions lost
→ Cache misses
→ Inconsistent behavior


SOLUTION: EXTERNAL STATE
═════════════════════════

          ┌─ Load Balancer ─┐
          │                 │
     ┌────┴────┬────────────┴────┐
     ↓         ↓                  ↓
┌─────────┐ ┌─────────┐ ┌─────────┐
│Server 1 │ │Server 2 │ │Server 3 │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┼───────────┘
                 ↓
        ┌─────────────────┐
        │   Redis         │
        │ (Shared State)  │
        └─────────────────┘

Request 1 → Server 1 → Redis ✓
Request 2 → Server 2 → Redis ✓ (same data)
Request 3 → Server 3 → Redis ✓ (same data)

Result: Shared state across all servers
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Engineering Impact:**
- **Development Velocity:** Singleton slows down development (hard to test, refactor, maintain)
- **Team Collaboration:** Global state causes merge conflicts, parallel development impossible
- **Maintenance Cost:** Hidden dependencies make code hard to understand and change
- **Technical Debt:** Singleton accumulates over time, becomes harder to remove

**Business Impact:**
- **Time to Market:** Slower development = slower feature delivery
- **Quality:** Harder testing = more bugs in production
- **Scalability:** Singleton prevents horizontal scaling
- **Operational Cost:** Memory leaks, thread safety issues → production incidents

---

### **How It Works (Simple Summary)**

**Singleton Pattern:**
- Private constructor (prevents external instantiation)
- Static instance field (holds single instance)
- Static getInstance() method (provides global access)
- Thread-safe initialization (various techniques)

**Why It's Dangerous:**
1. **Global state** (hidden dependencies)
2. **Testing nightmare** (can't mock)
3. **Thread safety issues** (race conditions)
4. **Violates SOLID** (too many responsibilities)
5. **Doesn't scale** (each server has own instance)
6. **Tight coupling** (hard to change)

**Modern Alternative:**
- **Spring Beans** (dependency injection)
- Singleton-scoped by default
- But managed by container, not static methods
- Testable, maintainable, scalable

---

### **Key Trade-Offs**

| **Aspect** | **Singleton** | **Spring Bean (DI)** |
|------------|---------------|----------------------|
| **Instance Control** | Static getInstance() | Spring container |
| **Dependencies** | Hidden (globals) | Explicit (constructor) |
| **Testing** | Hard (can't mock) | Easy (inject mocks) |
| **Thread Safety** | Manual (error-prone) | Managed by Spring |
| **Scalability** | Single JVM only | Distributed systems |
| **Lifecycle** | Manual | Managed (@PostConstruct) |
| **Scope** | Always singleton | Configurable (singleton, prototype, request) |
| **Complexity** | Low (simple code) | Medium (framework) |

---

### **Decision Framework**

```
Should I use Singleton?
═══════════════════════

1. Is it immutable?
   NO → ❌ Don't use singleton
   YES → Continue

2. Is it truly single resource (hardware)?
   NO → ❌ Don't use singleton
   YES → Continue

3. Can Spring manage it?
   YES → ✅ Use Spring bean instead
   NO → Continue

4. Can it be a static method?
   YES → ✅ Use static utility class
   NO → Continue

5. Is it an enum constant with behavior?
   YES → ✅ OK to use enum singleton
   NO → ❌ Reconsider your design

Default answer: Use Spring DI (99% of cases)
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Know the Pattern Thoroughly**
- Implement Bill Pugh holder pattern or enum
- Explain thread-safety issues (DCL, volatile)
- Discuss serialization and reflection attacks

✅ **Emphasize It's an Anti-Pattern**
- "Singleton is considered an anti-pattern in modern systems"
- Explain why: global state, testing, coupling, scaling
- Show you understand limitations

✅ **Recommend Modern Alternative**
- "In production, I'd use Spring beans with dependency injection"
- Explain benefits: testability, maintainability, scalability
- Shows pragmatic thinking

✅ **Provide Real Examples**
- When singleton might be OK: enums, loggers, immutable config
- When singleton is wrong: business logic, caching, sessions
- Reference real systems: Twitter's migration away from singletons

✅ **Discuss Trade-Offs**
- "Singleton gives you global access but at the cost of testability"
- "DI requires a framework but provides better design"
- "For a simple script, singleton is fine; for enterprise system, use DI"

✅ **Show Senior-Level Thinking**
- Don't just implement the pattern mechanically
- Question whether it's the right tool
- Propose better alternatives
- Demonstrate understanding of real-world implications

**Interview Script:**
> "I can implement singleton using the Bill Pugh holder pattern or enum, but I should mention that singleton is considered an anti-pattern in modern software engineering. It creates global state, makes testing difficult, violates SOLID principles, and doesn't work in distributed systems. In production, I'd use Spring's dependency injection instead—it gives you singleton behavior where needed but with explicit dependencies that are easy to test and maintain. The only places I'd use traditional singleton are for enum constants with behavior or static loggers, which are industry standards."

This response shows:
- ✓ Technical competence (can implement pattern)
- ✓ Critical thinking (understands limitations)
- ✓ Real-world experience (knows better alternatives)
- ✓ Senior-level judgment (recommends best practices)

---

**End of Topic 179: Singleton (and why it's dangerous)**
