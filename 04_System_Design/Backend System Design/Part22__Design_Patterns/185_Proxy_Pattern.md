# Topic 185: Proxy Pattern

> **"A proxy controls access to another object, acting as a surrogate or placeholder."**

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

### What is the Proxy Pattern?

The **Proxy Pattern** provides a **surrogate or placeholder** for another object to **control access** to it. A proxy has the **same interface** as the real object but adds an **additional layer of control** before delegating to the actual implementation.

Think of a proxy like a **security guard at a building entrance**:
- The guard has the same job description as letting people enter
- But adds **access control** (checking IDs, visitor logs)
- Eventually allows access to the real building (if authorized)

### Three Core Problems Proxy Solves

#### 1. **Expensive Object Creation (Virtual Proxy)**
```
Problem: Loading a 10MB image on application startup wastes resources
Solution: Create proxy that loads image only when first displayed
Result: Faster startup, better memory usage
```

#### 2. **Access Control (Protection Proxy)**
```
Problem: Direct access to sensitive objects bypasses security
Solution: Proxy checks permissions before delegating
Result: Centralized security, authorization enforcement
```

#### 3. **Remote Object Access (Remote Proxy)**
```
Problem: Client needs to call methods on object in different JVM/server
Solution: Proxy handles network communication, serialization
Result: Transparent remote calls, location independence
```

### Real-World Analogy

**Bank ATM as Proxy:**
```
Real Object: Your bank account (stored in central database)
Proxy: ATM machine

ATM provides:
1. Virtual Proxy: Doesn't load all account data, only what's needed
2. Protection Proxy: Requires PIN before granting access
3. Remote Proxy: Communicates with remote bank server
4. Caching Proxy: Caches recent balance for quick display
```

The ATM has the **same interface** (deposit, withdraw, check balance) but adds **control layers** before accessing the real account.

### When to Use Proxy Pattern

| Scenario | Proxy Type | Example |
|----------|------------|---------|
| **Expensive to create** | Virtual Proxy | Large images, heavy objects, database connections |
| **Access control needed** | Protection Proxy | Sensitive data, admin operations, authenticated resources |
| **Remote object** | Remote Proxy | gRPC stubs, RMI, REST client wrappers |
| **Add functionality** | Smart Reference | Reference counting, logging, thread-safety |
| **Cache results** | Caching Proxy | CDN, Nginx, database query cache |

### Proxy vs Decorator vs Adapter

All three patterns use **composition** and **wrap** another object, but have different **intents**:

```
┌─────────────────────────────────────────────────────────────┐
│ Pattern       │ Interface  │ Intent                        │
├───────────────┼────────────┼───────────────────────────────┤
│ Adapter       │ Different  │ Make incompatible compatible  │
│ Decorator     │ Same       │ Add behavior dynamically      │
│ Proxy         │ Same       │ Control access to object      │
└─────────────────────────────────────────────────────────────┘

Example:
- Adapter: Stripe API → PaymentGateway interface (translation)
- Decorator: BasicService → LoggingService (add logging)
- Proxy: RealImage → ImageProxy (lazy loading, access control)
```

**Key Distinction:**
- **Decorator** adds behavior (logging, caching, retry)
- **Proxy** controls access (lazy loading, permissions, remote communication)

In practice, the line blurs—a caching proxy adds caching behavior, making it decorator-like. The **intent** matters: if you're **controlling access**, it's a proxy; if you're **enhancing functionality**, it's a decorator.

### Types of Proxies

#### 1. Virtual Proxy (Lazy Initialization)
```java
// Don't load heavy object until actually needed
public class ImageProxy implements Image {
    private RealImage realImage;  // Initially null
    private final String filename;
    
    public void display() {
        if (realImage == null) {
            realImage = new RealImage(filename);  // Load on first access
        }
        realImage.display();
    }
}
```

#### 2. Protection Proxy (Access Control)
```java
// Check permissions before delegating
public class SecureDocumentProxy implements Document {
    private final RealDocument document;
    private final User user;
    
    public String read() {
        if (!user.hasPermission("READ")) {
            throw new SecurityException("No read permission");
        }
        return document.read();
    }
}
```

#### 3. Remote Proxy (Network Communication)
```java
// Hide network complexity
public class UserServiceProxy implements UserService {
    private final String serverUrl;
    
    public User findById(Long id) {
        // Marshal request, send over network, unmarshal response
        return httpClient.get(serverUrl + "/users/" + id, User.class);
    }
}
```

#### 4. Smart Reference (Additional Behavior)
```java
// Add reference counting, logging, thread-safety
public class SmartReference implements Resource {
    private final RealResource resource;
    private int referenceCount = 0;
    
    public void access() {
        referenceCount++;
        logger.info("Access count: {}", referenceCount);
        resource.access();
    }
}
```

### Interview Red Flags to Avoid

❌ **"Proxy is just a wrapper"** → Too vague; explain the **control access** intent

❌ **Confusing Proxy with Decorator** → Know the intent difference (access control vs behavior addition)

❌ **Not discussing thread-safety** → Virtual proxies need synchronization for lazy loading

❌ **Ignoring real-world examples** → Mention Spring @Lazy, JPA lazy loading, gRPC

✅ **What interviewers want to hear:**
- "Proxy controls access: lazy loading for performance, permissions for security, remote communication for distribution"
- "Virtual proxy uses lazy initialization with double-checked locking for thread-safety"
- "Spring AOP creates proxies automatically for @Transactional, @Cacheable"
- "JPA/Hibernate use proxies for lazy-loaded associations to avoid N+1 queries"

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Core Structure of Proxy Pattern

```
┌──────────────────────────────────────────────────────────────┐
│                        Client                                │
│                           │                                  │
│                           ▼                                  │
│                   ┌──────────────┐                          │
│                   │   Subject    │ (Interface)              │
│                   │  (Interface) │                          │
│                   └──────────────┘                          │
│                           △                                  │
│              ┌────────────┴────────────┐                    │
│              │                         │                    │
│      ┌───────▼──────┐         ┌───────▼──────┐            │
│      │  RealSubject │         │     Proxy    │            │
│      │              │         │              │            │
│      │ + operation()│◄────────│ + operation()│            │
│      └──────────────┘         │ - realSubject│            │
│                                │ + checkAccess│            │
│                                │ + logAccess  │            │
│                                └──────────────┘            │
│                                                             │
│  Flow:                                                      │
│  1. Client calls proxy.operation()                         │
│  2. Proxy performs control logic (check access, lazy load) │
│  3. Proxy delegates to realSubject.operation()             │
│  4. Proxy may add post-processing (logging, caching)       │
└──────────────────────────────────────────────────────────────┘
```

### Four Key Components

1. **Subject Interface**: Common interface for RealSubject and Proxy
2. **RealSubject**: The actual object doing the real work
3. **Proxy**: Controls access to RealSubject, same interface
4. **Client**: Uses Subject interface, unaware of proxy vs real

### Deep Dive: Virtual Proxy (Lazy Loading)

#### Problem: Expensive Object Creation

```java
// Problem: Loading all images at startup wastes memory
public class DocumentViewer {
    private List<Image> images = new ArrayList<>();
    
    public DocumentViewer(List<String> imageFiles) {
        for (String file : imageFiles) {
            // Loads ALL images immediately (10MB each)
            images.add(new RealImage(file));  // ❌ Slow startup, wasted memory
        }
    }
}

// Result: Application takes 30 seconds to start for 100 images (1GB memory)
```

#### Solution: Virtual Proxy with Lazy Loading

```java
// Subject interface
public interface Image {
    void display();
    int getWidth();
    int getHeight();
}

// Real subject: Expensive to create
public class RealImage implements Image {
    private final String filename;
    private final BufferedImage imageData;
    
    public RealImage(String filename) {
        this.filename = filename;
        logger.info("Loading image from disk: {}", filename);
        
        // Expensive operation: Load from disk
        try {
            this.imageData = ImageIO.read(new File(filename));
            Thread.sleep(1000);  // Simulate slow disk I/O
        } catch (IOException | InterruptedException e) {
            throw new RuntimeException("Failed to load image", e);
        }
        
        logger.info("Image loaded: {} ({}x{}, {} MB)", 
            filename, imageData.getWidth(), imageData.getHeight(),
            imageData.getData().getDataBuffer().getSize() / (1024 * 1024));
    }
    
    @Override
    public void display() {
        logger.info("Displaying image: {}", filename);
        // Render image on screen
    }
    
    @Override
    public int getWidth() {
        return imageData.getWidth();
    }
    
    @Override
    public int getHeight() {
        return imageData.getHeight();
    }
}

// Virtual Proxy: Lazy initialization
public class ImageProxy implements Image {
    private final String filename;
    private RealImage realImage;  // Initially null
    
    public ImageProxy(String filename) {
        this.filename = filename;
        logger.info("ImageProxy created for: {} (not loaded yet)", filename);
    }
    
    @Override
    public void display() {
        // Load on first access
        if (realImage == null) {
            realImage = new RealImage(filename);
        }
        realImage.display();
    }
    
    @Override
    public int getWidth() {
        if (realImage == null) {
            realImage = new RealImage(filename);
        }
        return realImage.getWidth();
    }
    
    @Override
    public int getHeight() {
        if (realImage == null) {
            realImage = new RealImage(filename);
        }
        return realImage.getHeight();
    }
}

// Usage: Fast startup, lazy loading
public class DocumentViewer {
    private List<Image> images = new ArrayList<>();
    
    public DocumentViewer(List<String> imageFiles) {
        for (String file : imageFiles) {
            // Create proxy instantly (no disk I/O)
            images.add(new ImageProxy(file));  // ✅ Instant startup
        }
    }
    
    public void displayPage(int pageIndex) {
        // Only loads the image being displayed
        images.get(pageIndex).display();  // Triggers lazy load
    }
}

// Results:
// - Startup: 0.1 seconds (vs 30 seconds without proxy)
// - Memory: 10MB (vs 1GB without proxy)
// - User sees page 1 instantly, other pages load as needed
```

#### Thread-Safe Virtual Proxy

**Problem**: Multiple threads may trigger lazy initialization simultaneously, creating duplicate objects.

```java
// Thread-safe virtual proxy with double-checked locking
public class ThreadSafeImageProxy implements Image {
    private final String filename;
    private volatile RealImage realImage;  // volatile for visibility
    
    @Override
    public void display() {
        // First check (no locking)
        if (realImage == null) {
            synchronized (this) {
                // Second check (with lock)
                if (realImage == null) {
                    realImage = new RealImage(filename);
                }
            }
        }
        realImage.display();
    }
}
```

**Why double-checked locking?**
1. **First check**: Avoid synchronization overhead after initialization (99.9% of calls)
2. **Synchronized block**: Ensure only one thread initializes
3. **Second check**: Another thread may have initialized while waiting for lock
4. **volatile**: Ensure visibility of `realImage` across threads

### Deep Dive: Protection Proxy (Access Control)

#### Problem: Bypassing Security Checks

```java
// Problem: Direct access bypasses authorization
public class DocumentService {
    public void deleteDocument(Long documentId) {
        // ❌ No authorization check
        documentRepository.delete(documentId);
    }
}

// Any code can delete any document
documentService.deleteDocument(sensitiveDocId);  // ❌ Security breach
```

#### Solution: Protection Proxy

```java
// Subject interface
public interface DocumentService {
    Document read(Long id);
    void update(Long id, Document document);
    void delete(Long id);
}

// Real subject: Actual business logic
public class DocumentServiceImpl implements DocumentService {
    private final DocumentRepository repository;
    
    @Override
    public Document read(Long id) {
        return repository.findById(id);
    }
    
    @Override
    public void update(Long id, Document document) {
        repository.save(document);
    }
    
    @Override
    public void delete(Long id) {
        repository.delete(id);
    }
}

// Protection Proxy: Enforces access control
public class SecureDocumentServiceProxy implements DocumentService {
    private final DocumentService realService;
    private final User currentUser;
    private final PermissionChecker permissionChecker;
    
    public SecureDocumentServiceProxy(
            DocumentService realService,
            User currentUser,
            PermissionChecker permissionChecker) {
        this.realService = realService;
        this.currentUser = currentUser;
        this.permissionChecker = permissionChecker;
    }
    
    @Override
    public Document read(Long id) {
        // Check READ permission
        if (!permissionChecker.hasPermission(currentUser, "document:" + id, "READ")) {
            logger.warn("Access denied: User {} attempted to read document {}", 
                currentUser.getId(), id);
            throw new SecurityException("You don't have permission to read this document");
        }
        
        logger.info("Access granted: User {} reading document {}", 
            currentUser.getId(), id);
        return realService.read(id);
    }
    
    @Override
    public void update(Long id, Document document) {
        if (!permissionChecker.hasPermission(currentUser, "document:" + id, "WRITE")) {
            throw new SecurityException("You don't have permission to update this document");
        }
        
        // Additional validation
        if (document.getOwner() != null && 
            !document.getOwner().equals(currentUser.getId())) {
            throw new SecurityException("You can't change document ownership");
        }
        
        realService.update(id, document);
    }
    
    @Override
    public void delete(Long id) {
        if (!permissionChecker.hasPermission(currentUser, "document:" + id, "DELETE")) {
            throw new SecurityException("You don't have permission to delete this document");
        }
        
        // Check if document has dependencies
        if (realService.read(id).hasReferences()) {
            throw new BusinessException("Cannot delete document with references");
        }
        
        realService.delete(id);
    }
}

// Spring configuration
@Configuration
public class SecurityConfig {
    
    @Bean
    @Primary
    public DocumentService secureDocumentService(
            DocumentServiceImpl realService,
            PermissionChecker permissionChecker) {
        return new SecureDocumentServiceProxy(
            realService,
            SecurityContext.getCurrentUser(),
            permissionChecker
        );
    }
}

// Usage: Automatic security enforcement
@RestController
@RequestMapping("/api/documents")
public class DocumentController {
    private final DocumentService documentService;  // Injected proxy
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        // Security check happens automatically in proxy
        documentService.delete(id);  // Throws SecurityException if unauthorized
        return ResponseEntity.noContent().build();
    }
}
```

#### Advanced: Role-Based Protection Proxy

```java
// Protection proxy with role-based access control
public class RoleBasedDocumentProxy implements DocumentService {
    private final DocumentService realService;
    private final User currentUser;
    
    private static final Map<String, Set<String>> OPERATION_ROLES = Map.of(
        "READ", Set.of("USER", "ADMIN", "GUEST"),
        "WRITE", Set.of("USER", "ADMIN"),
        "DELETE", Set.of("ADMIN")
    );
    
    @Override
    public void delete(Long id) {
        checkRole("DELETE");
        
        // Additional check: Admins can delete any, users only their own
        if (currentUser.getRole().equals("USER")) {
            Document doc = realService.read(id);
            if (!doc.getOwner().equals(currentUser.getId())) {
                throw new SecurityException("Users can only delete their own documents");
            }
        }
        
        realService.delete(id);
    }
    
    private void checkRole(String operation) {
        Set<String> allowedRoles = OPERATION_ROLES.get(operation);
        if (!allowedRoles.contains(currentUser.getRole())) {
            throw new SecurityException(
                String.format("Role %s not allowed for operation %s", 
                    currentUser.getRole(), operation)
            );
        }
    }
}
```

### Deep Dive: Remote Proxy (Network Communication)

#### Problem: Complex Network Communication

```java
// Problem: Client needs to handle HTTP, serialization, errors manually
public class UserClient {
    public User findById(Long id) {
        try {
            // ❌ Manual HTTP request
            URL url = new URL("http://user-service:8080/users/" + id);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            
            // ❌ Manual JSON parsing
            InputStream is = conn.getInputStream();
            String json = new String(is.readAllBytes());
            User user = objectMapper.readValue(json, User.class);
            
            // ❌ Manual error handling
            if (conn.getResponseCode() != 200) {
                throw new RuntimeException("HTTP error: " + conn.getResponseCode());
            }
            
            return user;
        } catch (IOException e) {
            throw new RuntimeException("Network error", e);
        }
    }
}

// Result: Complex, error-prone, repeated for every method
```

#### Solution: Remote Proxy

```java
// Subject interface (same on client and server)
public interface UserService {
    User findById(Long id);
    List<User> findAll();
    User create(User user);
    void delete(Long id);
}

// Server-side implementation (in user-service)
@RestController
@RequestMapping("/users")
public class UserController implements UserService {
    private final UserRepository repository;
    
    @GetMapping("/{id}")
    public User findById(@PathVariable Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new NotFoundException("User not found"));
    }
    
    @GetMapping
    public List<User> findAll() {
        return repository.findAll();
    }
    
    @PostMapping
    public User create(@RequestBody User user) {
        return repository.save(user);
    }
    
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repository.deleteById(id);
    }
}

// Client-side Remote Proxy
@Component
public class UserServiceProxy implements UserService {
    private final RestTemplate restTemplate;
    private final String serviceUrl;
    
    public UserServiceProxy(
            RestTemplate restTemplate,
            @Value("${user.service.url}") String serviceUrl) {
        this.restTemplate = restTemplate;
        this.serviceUrl = serviceUrl;
    }
    
    @Override
    public User findById(Long id) {
        try {
            String url = serviceUrl + "/users/" + id;
            return restTemplate.getForObject(url, User.class);
        } catch (RestClientException e) {
            logger.error("Failed to fetch user {}: {}", id, e.getMessage());
            throw new ServiceUnavailableException("User service unavailable", e);
        }
    }
    
    @Override
    public List<User> findAll() {
        String url = serviceUrl + "/users";
        User[] users = restTemplate.getForObject(url, User[].class);
        return Arrays.asList(users);
    }
    
    @Override
    public User create(User user) {
        String url = serviceUrl + "/users";
        return restTemplate.postForObject(url, user, User.class);
    }
    
    @Override
    public void delete(Long id) {
        String url = serviceUrl + "/users/" + id;
        restTemplate.delete(url);
    }
}

// Usage: Client code doesn't know it's remote
@Service
public class OrderService {
    private final UserService userService;  // Remote proxy injected
    
    public Order createOrder(Long userId, OrderRequest request) {
        // Looks like local call, actually remote
        User user = userService.findById(userId);  // HTTP call hidden
        
        // Use user data
        return new Order(user, request);
    }
}
```

#### Advanced: Remote Proxy with Resilience

```java
// Remote proxy with retry, circuit breaker, timeout
@Component
public class ResilientUserServiceProxy implements UserService {
    private final RestTemplate restTemplate;
    private final String serviceUrl;
    private final CircuitBreaker circuitBreaker;
    
    public ResilientUserServiceProxy(
            RestTemplate restTemplate,
            @Value("${user.service.url}") String serviceUrl,
            CircuitBreakerRegistry circuitBreakerRegistry) {
        this.restTemplate = restTemplate;
        this.serviceUrl = serviceUrl;
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("user-service");
    }
    
    @Override
    public User findById(Long id) {
        // Wrap in circuit breaker
        return circuitBreaker.executeSupplier(() -> {
            try {
                String url = serviceUrl + "/users/" + id;
                
                // Add timeout
                HttpComponentsClientHttpRequestFactory factory = 
                    new HttpComponentsClientHttpRequestFactory();
                factory.setConnectTimeout(2000);  // 2 second connect timeout
                factory.setReadTimeout(5000);     // 5 second read timeout
                RestTemplate timeoutRestTemplate = new RestTemplate(factory);
                
                return timeoutRestTemplate.getForObject(url, User.class);
                
            } catch (ResourceAccessException e) {
                // Timeout or connection error
                logger.error("User service timeout for user {}", id);
                throw new ServiceUnavailableException("User service unavailable", e);
            } catch (HttpClientErrorException e) {
                if (e.getStatusCode() == HttpStatus.NOT_FOUND) {
                    throw new NotFoundException("User not found: " + id);
                }
                throw e;
            }
        });
    }
}
```

### Deep Dive: Smart Reference Proxy

Smart Reference proxies add **additional behavior** like reference counting, logging, thread-safety, copy-on-write.

#### Example: Reference Counting Proxy

```java
// Subject interface
public interface DatabaseConnection {
    ResultSet executeQuery(String sql);
    void close();
}

// Real subject: Expensive to create
public class RealDatabaseConnection implements DatabaseConnection {
    private final Connection jdbcConnection;
    
    public RealDatabaseConnection(String url) throws SQLException {
        logger.info("Creating expensive database connection to {}", url);
        this.jdbcConnection = DriverManager.getConnection(url);
    }
    
    @Override
    public ResultSet executeQuery(String sql) {
        // Execute SQL
        return jdbcConnection.createStatement().executeQuery(sql);
    }
    
    @Override
    public void close() {
        try {
            jdbcConnection.close();
            logger.info("Database connection closed");
        } catch (SQLException e) {
            logger.error("Failed to close connection", e);
        }
    }
}

// Smart Reference: Reference counting
public class ReferenceCoun tingConnectionProxy implements DatabaseConnection {
    private final RealDatabaseConnection realConnection;
    private int referenceCount = 0;
    
    public ReferenceCoun tingConnectionProxy(RealDatabaseConnection connection) {
        this.realConnection = connection;
    }
    
    public DatabaseConnection acquire() {
        referenceCount++;
        logger.info("Connection acquired, reference count: {}", referenceCount);
        return this;
    }
    
    @Override
    public ResultSet executeQuery(String sql) {
        if (referenceCount == 0) {
            throw new IllegalStateException("Connection not acquired");
        }
        return realConnection.executeQuery(sql);
    }
    
    @Override
    public void close() {
        referenceCount--;
        logger.info("Connection released, reference count: {}", referenceCount);
        
        if (referenceCount == 0) {
            // Last reference released, actually close
            logger.info("All references released, closing real connection");
            realConnection.close();
        }
    }
}

// Usage: Multiple components share connection
public class ConnectionPool {
    private final ReferenceCountingConnectionProxy proxy;
    
    public DatabaseConnection getConnection() {
        return proxy.acquire();  // Increment reference count
    }
}

// Component 1
DatabaseConnection conn1 = pool.getConnection();
conn1.executeQuery("SELECT * FROM users");
conn1.close();  // Decrements count, doesn't actually close

// Component 2
DatabaseConnection conn2 = pool.getConnection();
conn2.executeQuery("SELECT * FROM orders");
conn2.close();  // Decrements count to 0, now actually closes
```

#### Example: Copy-on-Write Proxy

```java
// Smart reference with copy-on-write semantics
public class CopyOnWriteListProxy<T> implements List<T> {
    private volatile List<T> list;
    
    public CopyOnWriteListProxy(List<T> original) {
        this.list = new ArrayList<>(original);
    }
    
    @Override
    public T get(int index) {
        // Read without copying
        return list.get(index);
    }
    
    @Override
    public boolean add(T element) {
        synchronized (this) {
            // Copy on write
            List<T> newList = new ArrayList<>(list);
            boolean result = newList.add(element);
            list = newList;  // Atomic swap
            return result;
        }
    }
    
    // Other methods similar: read without copy, write with copy
}
```

### Spring Boot Integration: Automatic Proxy Creation

Spring heavily uses proxies for AOP, transactions, lazy loading, security.

#### 1. Spring AOP Proxies

```java
// Service with @Transactional (Spring creates proxy automatically)
@Service
public class UserService {
    private final UserRepository repository;
    
    @Transactional
    public User createUser(User user) {
        return repository.save(user);
    }
}

// What Spring generates (conceptually):
public class UserService$$SpringProxy extends UserService {
    private final UserService target;
    private final PlatformTransactionManager txManager;
    
    @Override
    public User createUser(User user) {
        TransactionStatus tx = txManager.getTransaction(new DefaultTransactionDefinition());
        try {
            User result = target.createUser(user);
            txManager.commit(tx);
            return result;
        } catch (Exception e) {
            txManager.rollback(tx);
            throw e;
        }
    }
}

// This is a Proxy pattern! Spring generates proxy that:
// 1. Begins transaction
// 2. Delegates to real method
// 3. Commits or rolls back
```

#### 2. Spring @Lazy Proxies

```java
// Lazy bean initialization with proxy
@Configuration
public class AppConfig {
    
    @Bean
    @Lazy  // Create proxy immediately, initialize bean on first use
    public ExpensiveService expensiveService() {
        logger.info("Creating expensive service (this should be lazy)");
        return new ExpensiveService();
    }
}

@Service
public class OrderService {
    private final ExpensiveService expensiveService;  // Injected proxy
    
    public OrderService(@Lazy ExpensiveService expensiveService) {
        this.expensiveService = expensiveService;  // Proxy injected, not real object
        logger.info("OrderService created");  // ExpensiveService not created yet
    }
    
    public void processOrder(Order order) {
        // First call triggers initialization
        expensiveService.doWork();  // NOW ExpensiveService is created
    }
}

// Result:
// 1. Application starts: OrderService created, ExpensiveService proxy created
// 2. First processOrder call: ExpensiveService actually initialized
// 3. Subsequent calls: Use already-initialized ExpensiveService
```

#### 3. JPA/Hibernate Lazy Loading Proxies

```java
// Entity with lazy association
@Entity
public class User {
    @Id
    private Long id;
    
    private String name;
    
    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)  // Lazy loading
    private List<Order> orders;
    
    // Getters/setters
}

// Usage
User user = userRepository.findById(1L);
// At this point, user.orders is a Hibernate proxy (not loaded yet)

System.out.println(user.getName());  // ✅ Loaded (part of User)
System.out.println(user.getOrders().size());  // 🔄 Triggers lazy loading (SQL query)

// Hibernate created a proxy that:
// 1. Implements List<Order>
// 2. On first access (size()), executes SQL: SELECT * FROM orders WHERE user_id = 1
// 3. Replaces proxy with real list
// 4. Subsequent accesses use real list
```

#### 4. Spring Security Method Security

```java
// Method security with proxy
@Service
public class DocumentService {
    
    @PreAuthorize("hasRole('ADMIN') or #documentId == principal.documentId")
    public Document getDocument(Long documentId) {
        return repository.findById(documentId);
    }
}

// Spring Security creates proxy that:
// 1. Evaluates @PreAuthorize expression
// 2. If true, delegates to real method
// 3. If false, throws AccessDeniedException
```

### Combining Proxy Types

Real production systems often combine multiple proxy types:

```java
// Combined proxy: Virtual + Protection + Caching + Remote
@Component
public class ProductServiceProxy implements ProductService {
    private final RestTemplate restTemplate;
    private final String serviceUrl;
    private final Cache<Long, Product> cache;
    private final User currentUser;
    
    // Remote + Virtual + Caching + Protection proxy
    @Override
    public Product findById(Long id) {
        // Protection proxy: Check permissions
        if (!currentUser.hasPermission("product:read")) {
            throw new SecurityException("No permission to read products");
        }
        
        // Caching proxy: Check cache first
        Product cached = cache.getIfPresent(id);
        if (cached != null) {
            logger.info("Cache hit for product {}", id);
            return cached;
        }
        
        // Remote proxy: Fetch from remote service
        logger.info("Cache miss, fetching product {} from remote service", id);
        String url = serviceUrl + "/products/" + id;
        Product product = restTemplate.getForObject(url, Product.class);
        
        // Update cache
        cache.put(id, product);
        
        return product;
    }
}

// This single proxy provides:
// 1. Protection (authorization)
// 2. Caching (performance)
// 3. Remote communication (distribution)
// 4. Virtual (lazy loading via cache)
```

### Proxy vs Decorator: When Intent Blurs

Sometimes the distinction between Proxy and Decorator is subtle:

```java
// Is this a Proxy or Decorator?
public class CachingUserService implements UserService {
    private final UserService delegate;
    private final Cache<Long, User> cache;
    
    @Override
    public User findById(Long id) {
        return cache.get(id, () -> delegate.findById(id));
    }
}

// Arguments for Proxy:
// - Controls access (you get cached version, not real)
// - Caching proxy is a known proxy type
// - Intent: Avoid expensive call

// Arguments for Decorator:
// - Adds caching behavior
// - Enhances functionality
// - Not about access control

// Answer: Intent matters
// - If goal is "control access to expensive operation" → Proxy
// - If goal is "add caching feature to any service" → Decorator
// - In practice: Often called "caching proxy" (proxy terminology wins)
```

**Practical guideline:**
- **Lazy loading, security, remote communication** → Clearly Proxy
- **Logging, metrics, retry** → Clearly Decorator
- **Caching** → Either (often called proxy, but behaves like decorator)

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Performance Impact of Proxy Pattern

#### Scenario: Image Gallery Application

**System:**
- 10,000 users
- Each user views 50 images per session on average
- 100 images in typical gallery
- Each image: 5MB average size

**Without Virtual Proxy (Eager Loading):**

```
Startup cost per gallery:
= 100 images × 5MB × loading time
= 500MB per gallery

Memory usage for 1,000 concurrent galleries:
= 1,000 galleries × 500MB
= 500GB memory required
= Unacceptable for most servers

Network bandwidth:
= 1,000 galleries × 500MB
= 500GB data transfer on load
= With 1Gbps connection: 500GB / (1Gbps / 8) = 4,000 seconds = 67 minutes

User experience:
= 67 minutes wait time
= 100% bounce rate
```

**With Virtual Proxy (Lazy Loading):**

```
Actual images viewed per session:
= 50 images (out of 100 available)

Memory usage:
= 1,000 users × 50 images × 5MB
= 250GB (50% reduction)

Network bandwidth:
= 1,000 users × 50 images × 5MB
= 250GB data transfer
= 33 minutes total
= But spread over time: ~2 seconds per image as user scrolls

User experience:
= First image visible in 2 seconds
= Subsequent images load as scrolling
= Acceptable UX

Cost savings:
= 50% less memory: $2,000/month → $1,000/month
= 50% less bandwidth: $500/month → $250/month
= Total savings: $1,250/month = $15,000/year
```

#### Overhead Analysis: Protection Proxy

**Scenario: Document Management System**

```java
// Without proxy: Direct call
public Document read(Long id) {
    return repository.findById(id);  // 5ms database query
}

// With protection proxy: Authorization check
public Document read(Long id) {
    permissionChecker.hasPermission(user, id, "READ");  // +2ms
    return realService.read(id);  // 5ms database query
}

Total latency:
= Permission check + Database query
= 2ms + 5ms
= 7ms (40% overhead)

At 10,000 requests/second:
= 10,000 × 2ms = 20,000ms = 20 CPU-seconds per second
= Requires 20 CPU cores for permission checks

Cost-benefit analysis:
Cost: 20 CPU cores = ~$500/month
Benefit: Centralized authorization, audit trail, compliance
Verdict: ✅ Worth it (security >>> 40% latency overhead)

Optimization:
- Cache permission checks (5 min TTL)
- Reduces permission check from 2ms to 0.1ms
- New overhead: 0.1ms / 5ms = 2% (acceptable)
- Cache hit rate: 90% (typical user performs similar operations)
```

#### Remote Proxy Overhead

**Scenario: Microservices Communication**

```
Local method call (without proxy):
= 0.01ms (in-memory)

Remote call via proxy:
= Network latency + Serialization + Deserialization + Network latency
= 1ms (same datacenter) + 0.5ms + 0.5ms + 1ms
= 3ms

Overhead:
= 3ms / 0.01ms = 300x slower
= But necessary for distributed systems

At 50,000 req/sec:
= 50,000 × 3ms = 150,000ms = 150 CPU-seconds per second
= Requires 150 CPU cores

Mitigation strategies:
1. Batching: Combine 10 calls into 1
   = 3ms for 10 items vs 30ms for 10 individual calls
   = 10x reduction

2. Caching: 80% hit rate
   = 0.8 × 0.1ms + 0.2 × 3ms = 0.68ms average
   = 4.4x faster

3. Async processing: Non-blocking calls
   = Frees up threads while waiting
   = Same latency, but higher throughput

Result with optimizations:
= 150 cores → 30 cores (5x reduction)
= Cost: $5,000/month → $1,000/month
```

### Capacity Planning: Lazy Loading Database Connections

**Scenario: Connection Pool with Virtual Proxy**

```
System: Web application with varying load
- Peak: 10,000 concurrent requests
- Average: 1,000 concurrent requests
- Off-peak: 100 concurrent requests

Without virtual proxy (Eager loading):
= Create 10,000 connections at startup
= Memory: 10,000 × 2MB per connection = 20GB
= Database: 10,000 connections (may exceed database max_connections)

With virtual proxy (Lazy loading):
= Create connections as needed
= Average load uses: 1,000 connections
= Memory: 1,000 × 2MB = 2GB (10x reduction)
= Peak load: Gradually scales to 10,000 if needed
= Off-peak: Idle connections released, back to 100 connections

Benefits:
1. Faster startup: 10,000 connections × 100ms = 16 minutes → Instant
2. Lower average memory: 20GB → 2GB
3. Database friendly: Gradual ramp-up vs instant 10,000 connections
4. Cost savings: Smaller database instance (500 connections vs 10,000)
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Lazy Loading Database Queries with Proxy

Proxies are fundamental to ORM frameworks for avoiding N+1 query problems.

#### Problem: N+1 Query Anti-Pattern

```java
// Without proxy: Eager loading causes N+1 queries
@Entity
public class User {
    @Id
    private Long id;
    
    @OneToMany(fetch = FetchType.EAGER)  // ❌ Eager loading
    private List<Order> orders;
}

// Query all users
List<User> users = userRepository.findAll();  // 1 query for users

// Accessing orders
for (User user : users) {
    System.out.println(user.getOrders().size());  // N queries (one per user)
}

// Total queries: 1 + N (if 1,000 users, 1,001 queries!)
// Time: 1,001 × 5ms = 5 seconds
```

#### Solution: Virtual Proxy with Lazy Loading

```java
// With proxy: Lazy loading
@Entity
public class User {
    @Id
    private Long id;
    
    @OneToMany(fetch = FetchType.LAZY)  // ✅ Lazy loading via proxy
    private List<Order> orders;
}

// Hibernate creates proxy for orders
List<User> users = userRepository.findAll();  // 1 query

// orders is a Hibernate proxy (not loaded yet)
for (User user : users) {
    // Only load if accessed
    if (needsOrders(user)) {
        System.out.println(user.getOrders().size());  // Triggers SQL
    }
}

// If only 10 users need orders: 1 + 10 = 11 queries (vs 1,001)
// Time: 11 × 5ms = 55ms (vs 5 seconds)
// 90x faster
```

#### Hibernate Proxy Implementation (Conceptual)

```java
// Hibernate generates proxy class at runtime
public class OrderListProxy implements List<Order> {
    private List<Order> realOrders;  // Null until loaded
    private final Long userId;
    private final SessionImplementor session;
    private boolean initialized = false;
    
    @Override
    public int size() {
        initializeIfNeeded();
        return realOrders.size();
    }
    
    @Override
    public Order get(int index) {
        initializeIfNeeded();
        return realOrders.get(index);
    }
    
    private void initializeIfNeeded() {
        if (!initialized) {
            // Execute SQL: SELECT * FROM orders WHERE user_id = ?
            realOrders = session.createQuery(
                "FROM Order WHERE user.id = :userId", Order.class)
                .setParameter("userId", userId)
                .getResultList();
            initialized = true;
        }
    }
}
```

### Advanced: Batch Fetching with Proxy

```java
// Problem: Even with lazy loading, N queries if all accessed
for (User user : users) {
    user.getOrders().size();  // N lazy loads = N queries
}

// Solution: Batch fetching
@Entity
public class User {
    @OneToMany(fetch = FetchType.LAZY)
    @BatchSize(size = 10)  // Load in batches of 10
    private List<Order> orders;
}

// Hibernate optimizes:
// First access: SELECT * FROM orders WHERE user_id IN (1,2,3,4,5,6,7,8,9,10)
// 11th access: SELECT * FROM orders WHERE user_id IN (11,12,13,14,15,16,17,18,19,20)
// Result: 1 + N/10 queries (e.g., 1 + 100 = 101 for 1,000 users)
```

### Storage-Aware Proxy: Copy-on-Write

```java
// Scenario: Large cached objects that rarely change
public class CopyOnWriteCacheProxy<K, V> implements Cache<K, V> {
    private final Map<K, V> cache = new ConcurrentHashMap<>();
    
    @Override
    public V get(K key) {
        // Read without copying (fast path)
        return cache.get(key);
    }
    
    @Override
    public void put(K key, V value) {
        synchronized (this) {
            // Deep copy value to prevent external modifications
            V copy = deepCopy(value);
            cache.put(key, copy);
        }
    }
    
    // Multiple readers can access simultaneously (no lock)
    // Writers copy data (prevent shared mutable state)
}

// Use case: Configuration cache
// - Read 1,000,000 times/second (no contention)
// - Write 1 time/minute (copy cost amortized)
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Remote Proxy with Resilience Patterns

Production remote proxies must handle failures gracefully.

```java
// Resilient remote proxy with circuit breaker, retry, timeout, fallback
@Component
public class ResilientUserServiceProxy implements UserService {
    private final RestTemplate restTemplate;
    private final String primaryUrl;
    private final String fallbackUrl;
    private final CircuitBreaker circuitBreaker;
    private final RetryTemplate retryTemplate;
    private final Cache<Long, User> cache;
    
    public ResilientUserServiceProxy(
            RestTemplate restTemplate,
            @Value("${user.service.primary.url}") String primaryUrl,
            @Value("${user.service.fallback.url}") String fallbackUrl,
            CircuitBreakerRegistry registry,
            Cache<Long, User> cache) {
        this.restTemplate = configureTimeout(restTemplate);
        this.primaryUrl = primaryUrl;
        this.fallbackUrl = fallbackUrl;
        this.circuitBreaker = registry.circuitBreaker("user-service");
        this.retryTemplate = createRetryTemplate();
        this.cache = cache;
    }
    
    @Override
    public User findById(Long id) {
        // Layer 1: Check cache
        User cached = cache.getIfPresent(id);
        if (cached != null) {
            logger.debug("Cache hit for user {}", id);
            return cached;
        }
        
        // Layer 2: Circuit breaker
        return circuitBreaker.executeSupplier(() -> {
            // Layer 3: Retry with exponential backoff
            return retryTemplate.execute(context -> {
                try {
                    // Layer 4: Primary service with timeout
                    String url = primaryUrl + "/users/" + id;
                    User user = restTemplate.getForObject(url, User.class);
                    
                    // Update cache on success
                    cache.put(id, user);
                    
                    return user;
                    
                } catch (HttpServerErrorException e) {
                    // 5xx errors: Retry
                    logger.warn("Primary service error (attempt {}): {}", 
                        context.getRetryCount() + 1, e.getMessage());
                    throw e;
                    
                } catch (ResourceAccessException e) {
                    // Timeout: Retry
                    logger.warn("Primary service timeout (attempt {})", 
                        context.getRetryCount() + 1);
                    throw e;
                }
            });
        }, throwable -> {
            // Layer 5: Fallback to secondary service
            logger.error("Primary service failed, trying fallback service", throwable);
            try {
                String fallbackUrL = fallbackUrl + "/users/" + id;
                User user = restTemplate.getForObject(fallbackUrL, User.class);
                cache.put(id, user);
                return user;
            } catch (Exception fallbackError) {
                logger.error("Fallback service also failed", fallbackError);
                
                // Layer 6: Return stale cache if available
                User stale = cache.getIfPresent(id);
                if (stale != null) {
                    logger.warn("Returning stale cached data for user {}", id);
                    return stale;
                }
                
                // Layer 7: Final fallback - throw exception
                throw new ServiceUnavailableException("All services unavailable", fallbackError);
            }
        });
    }
    
    private RestTemplate configureTimeout(RestTemplate restTemplate) {
        HttpComponentsClientHttpRequestFactory factory = 
            new HttpComponentsClientHttpRequestFactory();
        factory.setConnectTimeout(2000);  // 2 second connect timeout
        factory.setReadTimeout(5000);     // 5 second read timeout
        return new RestTemplate(factory);
    }
    
    private RetryTemplate createRetryTemplate() {
        RetryTemplate template = new RetryTemplate();
        
        // Retry up to 3 times with exponential backoff
        FixedBackOffPolicy backOffPolicy = new FixedBackOffPolicy();
        backOffPolicy.setBackOffPeriod(1000);  // 1 second between retries
        template.setBackOffPolicy(backOffPolicy);
        
        SimpleRetryPolicy retryPolicy = new SimpleRetryPolicy();
        retryPolicy.setMaxAttempts(3);
        template.setRetryPolicy(retryPolicy);
        
        return template;
    }
}
```

**Resilience layers:**
1. **Cache**: Avoid remote call entirely (fastest)
2. **Circuit Breaker**: Fail fast if service is down (prevent cascading failures)
3. **Retry**: Transient errors (network blips)
4. **Timeout**: Prevent hanging (resource exhaustion)
5. **Fallback service**: Alternative provider (high availability)
6. **Stale cache**: Eventual consistency (better than nothing)
7. **Exception**: Final fallback (graceful degradation)

**Result:**
- **99.9% availability** even if primary service has 95% uptime
- **Sub-second failover** to backup service
- **Graceful degradation** with stale data

### Distributed Caching Proxy

```java
// Distributed cache proxy for horizontal scaling
@Component
public class DistributedCacheProxy implements CacheService {
    private final RedisTemplate<String, Object> redisTemplate;
    private final CacheService localCache;
    private final CacheService databaseService;
    
    @Override
    public Object get(String key) {
        // Level 1: Local cache (in-process, fastest)
        Object value = localCache.get(key);
        if (value != null) {
            metrics.increment("cache.local.hit");
            return value;
        }
        
        // Level 2: Distributed cache (Redis, across servers)
        value = redisTemplate.opsForValue().get(key);
        if (value != null) {
            metrics.increment("cache.distributed.hit");
            // Populate local cache for future hits
            localCache.put(key, value);
            return value;
        }
        
        // Level 3: Database (slowest)
        metrics.increment("cache.miss");
        value = databaseService.get(key);
        
        // Populate both caches
        redisTemplate.opsForValue().set(key, value, 1, TimeUnit.HOURS);
        localCache.put(key, value);
        
        return value;
    }
}

// Scaling benefits:
// - Local cache: 0.1ms latency, 90% hit rate
// - Redis cache: 1ms latency, 9% hit rate
// - Database: 50ms latency, 1% miss rate
// - Average latency: 0.9 × 0.1ms + 0.09 × 1ms + 0.01 × 50ms = 0.68ms
// - vs database only: 50ms (73x faster)
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Protection Proxy for API Security

```java
// Security proxy for API access control
@Component
public class SecureApiProxy implements ApiService {
    private final ApiService realService;
    private final RateLimiter rateLimiter;
    private final AuditLogger auditLogger;
    
    @Override
    public ApiResponse call(ApiRequest request) {
        User user = SecurityContext.getCurrentUser();
        
        // 1. Rate limiting
        if (!rateLimiter.allowRequest(user.getId())) {
            auditLogger.logRateLimitExceeded(user, request);
            throw new RateLimitException("Rate limit exceeded: 100 req/min");
        }
        
        // 2. Authentication
        if (user == null || !user.isAuthenticated()) {
            auditLogger.logUnauthorizedAccess(request);
            throw new UnauthorizedException("Authentication required");
        }
        
        // 3. Authorization
        if (!user.hasPermission(request.getResource(), request.getAction())) {
            auditLogger.logAccessDenied(user, request);
            throw new ForbiddenException("Access denied");
        }
        
        // 4. Input validation
        if (!request.isValid()) {
            auditLogger.logInvalidRequest(user, request);
            throw new BadRequestException("Invalid request: " + request.getErrors());
        }
        
        // 5. Execute with audit
        long start = System.currentTimeMillis();
        try {
            ApiResponse response = realService.call(request);
            auditLogger.logSuccess(user, request, response, 
                System.currentTimeMillis() - start);
            return response;
        } catch (Exception e) {
            auditLogger.logFailure(user, request, e, 
                System.currentTimeMillis() - start);
            throw e;
        }
    }
}
```

### Encryption Proxy

```java
// Transparent encryption/decryption proxy
@Component
public class EncryptedStorageProxy implements StorageService {
    private final StorageService realStorage;
    private final EncryptionService encryptionService;
    
    @Override
    public void store(String key, byte[] data) {
        // Encrypt before storing
        byte[] encrypted = encryptionService.encrypt(data);
        realStorage.store(key, encrypted);
    }
    
    @Override
    public byte[] retrieve(String key) {
        // Decrypt after retrieving
        byte[] encrypted = realStorage.retrieve(key);
        return encryptionService.decrypt(encrypted);
    }
}

// Usage: Application code doesn't know about encryption
storageService.store("user-123", userData);  // Transparently encrypted
byte[] data = storageService.retrieve("user-123");  // Transparently decrypted
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Case Study 1: Spring Framework AOP Proxies

**System:** Spring Framework (90%+ of Java enterprise applications)

**Problem:**
- Applications need cross-cutting concerns: transactions, security, caching, logging
- Manual implementation: Error-prone, boilerplate, scattered across codebase

**Solution:** Spring AOP creates proxies automatically

```java
// Developer writes clean code
@Service
public class OrderService {
    @Transactional
    @Cacheable("orders")
    @PreAuthorize("hasRole('USER')")
    public Order findById(Long id) {
        return orderRepository.findById(id);
    }
}

// Spring generates proxy at runtime:
public class OrderService$$SpringProxy implements OrderService {
    private OrderService target;
    private TransactionManager txManager;
    private Cache cache;
    private SecurityManager securityManager;
    
    @Override
    public Order findById(Long id) {
        // 1. Security proxy
        securityManager.checkAccess("hasRole('USER')");
        
        // 2. Caching proxy
        Order cached = cache.get("orders::" + id);
        if (cached != null) return cached;
        
        // 3. Transaction proxy
        Transaction tx = txManager.begin();
        try {
            Order order = target.findById(id);
            cache.put("orders::" + id, order);
            tx.commit();
            return order;
        } catch (Exception e) {
            tx.rollback();
            throw e;
        }
    }
}
```

**Architecture:**
- **JDK Dynamic Proxy**: For interfaces (uses `java.lang.reflect.Proxy`)
- **CGLIB Proxy**: For classes (generates bytecode subclass)

**Results:**
- **90%+ adoption** in Spring Boot applications
- **Zero boilerplate** for transactions, security, caching
- **< 1ms overhead** per proxy call
- **Millions of applications** rely on this pattern

**Interview insight:** "Spring AOP is the Proxy pattern at scale—it generates proxies automatically for annotated methods, making cross-cutting concerns transparent."

---

### Case Study 2: Hibernate Lazy Loading

**System:** Hibernate ORM (most popular Java ORM, 70%+ market share)

**Problem:**
- Loading entire object graph wastes memory and network bandwidth
- Eager loading causes N+1 query problem (performance disaster)

**Solution:** Virtual proxies for lazy-loaded associations

```java
@Entity
public class Author {
    @Id
    private Long id;
    
    @OneToMany(fetch = FetchType.LAZY)
    private List<Book> books;  // Hibernate proxy, not real list
}

// Query author
Author author = session.get(Author.class, 1L);
// SQL: SELECT * FROM authors WHERE id = 1

// books is a Hibernate proxy (not loaded yet)
System.out.println(author.getName());  // ✅ No SQL

// First access triggers lazy loading
System.out.println(author.getBooks().size());  
// SQL: SELECT * FROM books WHERE author_id = 1
```

**Hibernate Proxy Implementation:**
- Uses **Javassist** or **CGLIB** to generate proxy classes at runtime
- Proxy extends entity class, intercepts method calls
- First access loads data from database, subsequent accesses use loaded data

**Results:**
- **50-90% reduction** in queries for typical applications
- **10x faster** page loads (only load displayed data)
- **Used by millions** of Java applications

**Anti-Pattern:** LazyInitializationException
```java
// Problem: Accessing lazy proxy outside session
Author author = session.get(Author.class, 1L);
session.close();  // Session closed

author.getBooks().size();  // ❌ LazyInitializationException

// Solution: Use @Transactional or fetch join
@Transactional
public Author getAuthorWithBooks(Long id) {
    return session.get(Author.class, id);
    // Transaction kept open until method returns
}
```

---

### Case Study 3: gRPC Stubs (Remote Proxy)

**System:** gRPC (Google's high-performance RPC framework)

**Problem:**
- Microservices need to communicate across network
- Manual HTTP requests are error-prone, verbose, untyped

**Solution:** gRPC generates client stubs (remote proxies)

```protobuf
// user.proto
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
}

message User {
  int64 id = 1;
  string name = 2;
  string email = 3;
}
```

**Generated stub (remote proxy):**
```java
// gRPC generates this automatically
public class UserServiceStub {
    private final ManagedChannel channel;
    
    public User getUser(GetUserRequest request) {
        // Serialize request to Protobuf
        byte[] requestBytes = request.toByteArray();
        
        // Send HTTP/2 request over network
        byte[] responseBytes = channel.sendRequest(
            "UserService/GetUser", requestBytes);
        
        // Deserialize response
        return User.parseFrom(responseBytes);
    }
}

// Client code: Looks like local call
UserServiceStub stub = new UserServiceStub(channel);
User user = stub.getUser(GetUserRequest.newBuilder().setId(123).build());
// Transparently makes network call
```

**Results:**
- **Used by Google** for internal services (millions of RPC calls/sec)
- **10x faster** than REST/JSON (Protobuf binary format)
- **Type-safe** (compile-time checking)
- **Streaming support** (bidirectional streams)

**Architecture:**
- **Client stub**: Remote proxy for service interface
- **Server skeleton**: Dispatches requests to implementation
- **HTTP/2**: Multiplexed, bidirectional streams

---

### Case Study 4: Nginx as Reverse Proxy

**System:** Nginx (30%+ of all websites, #1 web server)

**Problem:**
- Application servers need load balancing, caching, SSL termination, rate limiting
- Implementing these in application code is complex, inefficient

**Solution:** Nginx as reverse proxy (sits between client and application)

```nginx
# Nginx configuration: Protection + Caching + Load Balancing proxy
upstream backend {
    server app1.example.com:8080;
    server app2.example.com:8080;
    server app3.example.com:8080;
}

server {
    listen 443 ssl;
    
    # SSL termination (protection proxy)
    ssl_certificate /etc/nginx/cert.pem;
    ssl_certificate_key /etc/nginx/key.pem;
    
    # Rate limiting (protection proxy)
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
    limit_req zone=api_limit burst=20;
    
    location /api/ {
        # Caching (caching proxy)
        proxy_cache api_cache;
        proxy_cache_valid 200 5m;
        proxy_cache_key $request_uri;
        
        # Load balancing (virtual proxy)
        proxy_pass http://backend;
        
        # Resilience
        proxy_connect_timeout 2s;
        proxy_read_timeout 5s;
        proxy_next_upstream error timeout;
    }
}
```

**Nginx as Multi-Type Proxy:**
1. **Reverse Proxy**: Forwards requests to backend servers (remote proxy)
2. **Caching Proxy**: Caches responses (virtual proxy + caching)
3. **Protection Proxy**: SSL, rate limiting, authentication
4. **Load Balancing Proxy**: Distributes requests (virtual proxy)

**Results:**
- **100,000+ req/sec** on commodity hardware
- **50-90% cache hit rate** for typical applications
- **SSL offloading** saves backend CPU
- **Used by**: Netflix, Airbnb, GitHub, WordPress.com

---

### Case Study 5: Java RMI (Remote Method Invocation)

**System:** Java RMI (legacy but illustrates remote proxy concept)

**Problem:**
- Java client needs to call methods on object in different JVM
- Manual socket programming is complex, error-prone

**Solution:** RMI generates remote proxy automatically

```java
// Server-side interface
public interface Calculator extends Remote {
    int add(int a, int b) throws RemoteException;
    int multiply(int a, int b) throws RemoteException;
}

// Server-side implementation
public class CalculatorImpl extends UnicastRemoteObject implements Calculator {
    @Override
    public int add(int a, int b) {
        return a + b;
    }
    
    @Override
    public int multiply(int a, int b) {
        return a * b;
    }
}

// Client-side: RMI generates remote proxy
Registry registry = LocateRegistry.getRegistry("server.example.com");
Calculator calculator = (Calculator) registry.lookup("Calculator");

// Looks like local call, actually remote
int result = calculator.add(5, 3);  // Network call happens here
```

**RMI Proxy Architecture:**
```
┌─────────────┐      Network      ┌─────────────┐
│   Client    │ ←──────────────→ │   Server    │
│             │                   │             │
│  Calculator │                   │ Calculator  │
│   (proxy)   │ ──── RPC ────→   │   (real)    │
│             │                   │             │
│ 1. Serialize│                   │ 3. Execute  │
│ 2. Send     │                   │ 4. Serialize│
│ 6. Receive  │                   │ 5. Return   │
│ 7. Unmarshal│                   │             │
└─────────────┘                   └─────────────┘
```

**Results:**
- **Transparent remoting**: Client code doesn't know it's remote
- **Used in legacy Java EE** applications (EJB)
- **Replaced by**: gRPC, REST, messaging (more scalable)

**Modern alternative:** Spring Cloud OpenFeign
```java
// Modern remote proxy with Spring Cloud
@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/users/{id}")
    User getUser(@PathVariable Long id);
}

// Usage: Looks local, actually HTTP call
User user = userClient.getUser(123L);
```

---

### Case Study 6: CDN as Caching Proxy

**System:** Cloudflare CDN (handles 20%+ of all internet traffic)

**Problem:**
- Origin servers can't handle millions of requests globally
- Users far from origin experience high latency

**Solution:** CDN acts as distributed caching proxy

```
User Request Flow:
1. User (Tokyo) requests image.jpg
2. CDN edge server (Tokyo) checks cache
3. Cache miss → CDN fetches from origin (US)
4. CDN caches response (TTL: 1 hour)
5. CDN returns to user (50ms latency)

Subsequent requests (1 hour):
1. User (Tokyo) requests same image.jpg
2. CDN edge server (Tokyo) cache hit
3. Return cached response (5ms latency)
4. Origin server not contacted (saved bandwidth, load)

Results:
- 95%+ cache hit rate
- 200ms → 5ms latency (40x faster)
- Origin handles 5% traffic (20x less load)
```

**Architecture:**
- **150+ edge locations** worldwide
- **Anycast routing**: User hits nearest edge
- **Intelligent caching**: Respects Cache-Control headers
- **Invalidation**: Purge cache when content updated

**Results:**
- **10M+ websites** use CDN caching proxies
- **95%+ cache hit rate** for static content
- **40x latency reduction** for global users
- **$100K+ monthly savings** for large sites (bandwidth costs)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

**Interviewer:** "Explain the Proxy pattern and when you'd use it."

**Strong Answer:**

"The Proxy pattern provides a surrogate or placeholder for another object to **control access** to it. The key word is **control**—the proxy has the same interface as the real object but adds an additional layer before delegating.

There are four main types:

**1. Virtual Proxy** for expensive object creation. For example, in an image gallery, we don't want to load all 100 images at startup—that would waste memory and slow down the app. Instead, we create lightweight proxies for each image. The proxy only loads the actual image when it's first displayed. This is exactly what Hibernate does with lazy-loaded associations—the `@OneToMany` collection is actually a proxy that triggers a SQL query only when you first access it.

**2. Protection Proxy** for access control. Instead of scattering authorization checks throughout the codebase, we centralize them in a proxy. The proxy checks permissions before delegating to the real object. Spring Security uses this pattern—when you annotate a method with `@PreAuthorize`, Spring generates a proxy that evaluates the security expression before calling your method.

**3. Remote Proxy** for hiding network complexity. In microservices, a client shouldn't deal with HTTP requests, serialization, and error handling manually. The remote proxy provides a local interface but handles network communication behind the scenes. gRPC client stubs are perfect examples—the stub looks like a regular Java interface, but calls are actually serialized to Protobuf and sent over HTTP/2.

**4. Smart Reference** for adding behavior like reference counting, logging, or thread-safety.

The key distinction from Decorator is **intent**: Decorator adds functionality, Proxy controls access. Though in practice, they can look similar—a caching proxy both controls access and adds caching behavior.

In production, I've used proxies for lazy loading database connections in connection pools, which reduced startup time from 30 seconds to instant, and for adding resilience patterns (retry, circuit breaker, timeout) to remote service calls, which increased availability from 95% to 99.9%."

---

### Common Follow-Up Questions

#### Q1: "How is Proxy different from Decorator? They seem very similar."

**Answer:**

"Great question—they are similar in **structure** (both wrap an object and implement the same interface) but different in **intent**:

**Proxy** is about **controlling access**:
- Virtual proxy: Control when object is created (lazy loading)
- Protection proxy: Control who can access (authorization)
- Remote proxy: Control how object is accessed (network)
- The proxy often manages the lifecycle of the real object

**Decorator** is about **adding behavior**:
- Adds new functionality (logging, caching, retry)
- Multiple decorators can be stacked for combinations
- Doesn't control access, just enhances it

**Practical distinction:**

```java
// Decorator: You can stack multiple
DataSource ds = new FileDataSource("data.txt");
ds = new CompressionDecorator(ds);      // Add compression
ds = new EncryptionDecorator(ds);       // Add encryption
ds = new LoggingDecorator(ds);          // Add logging

// Proxy: Usually single, controls access
Image image = new ImageProxy("large.jpg");  // Lazy load (virtual proxy)
// OR
Document doc = new SecureDocumentProxy(realDoc, user);  // Access control (protection)
```

**When the line blurs:** Caching is often called a 'caching proxy' because it controls access (you get cached version, not real), but it also adds behavior (caching). The intent is what matters—if the primary goal is controlling access to an expensive resource, it's a proxy.

**In interviews, I mention:** 'Proxy typically has a 1:1 relationship with the real object and manages its lifecycle, while Decorator is about composing multiple decorators to add various behaviors. Spring AOP proxies are a great example—Spring creates a single proxy per bean to control access for transactions, security, caching.'"

---

#### Q2: "How would you implement a thread-safe virtual proxy with lazy initialization?"

**Answer:**

"Thread-safe lazy initialization is tricky because multiple threads might trigger initialization simultaneously, creating duplicate expensive objects. There are three approaches:

**Approach 1: Synchronized method (simple but slow)**
```java
public class ImageProxy implements Image {
    private RealImage realImage;
    
    public synchronized void display() {  // ❌ Synchronization on every call
        if (realImage == null) {
            realImage = new RealImage(filename);
        }
        realImage.display();
    }
}
// Problem: 99.9% of calls (after initialization) pay synchronization cost
```

**Approach 2: Double-checked locking (correct, efficient)**
```java
public class ImageProxy implements Image {
    private volatile RealImage realImage;  // volatile crucial
    
    public void display() {
        if (realImage == null) {  // First check (no lock)
            synchronized (this) {
                if (realImage == null) {  // Second check (with lock)
                    realImage = new RealImage(filename);
                }
            }
        }
        realImage.display();  // Fast path (no lock)
    }
}
```

**Why this works:**
1. **First check**: After initialization, 99.9% of calls skip synchronization (fast path)
2. **Synchronized block**: Ensures only one thread initializes
3. **Second check**: Another thread may have initialized while waiting for lock
4. **volatile**: Ensures visibility of `realImage` across threads (prevents seeing partially constructed object)

**Approach 3: Initialization-on-demand holder (lazy + thread-safe, no synchronization)**
```java
public class ImageProxy implements Image {
    private static class Holder {
        static final RealImage INSTANCE = new RealImage(filename);
    }
    
    public void display() {
        Holder.INSTANCE.display();  // JVM guarantees thread-safety
    }
}
```

**Why this works:** JVM guarantees that class initialization is thread-safe. The `RealImage` is created when `Holder` class is first accessed, and the JVM ensures only one thread initializes it.

**Which to use:**
- **Approach 2 (double-checked locking)**: When you need to pass parameters to constructor
- **Approach 3 (holder)**: When initialization is static (no parameters)

**In production:** I've used double-checked locking for connection pool proxies where each proxy needs a different database URL. It's the standard pattern in frameworks like Spring for lazy bean initialization."

---

#### Q3: "What are the challenges with remote proxies in a microservices architecture?"

**Answer:**

"Remote proxies in microservices face several challenges that local proxies don't:

**1. Network Failures (biggest challenge)**
- Problem: Network is unreliable—timeouts, packet loss, transient failures
- Solution: Retry with exponential backoff, circuit breaker, fallback service
```java
// Without resilience: One network blip = request fails
User user = userServiceProxy.findById(123);

// With resilience: Multiple layers of protection
try {
    return circuitBreaker.execute(() ->
        retryTemplate.execute(context ->
            timeoutWrapper.execute(() ->
                userServiceProxy.findById(123)
            )
        )
    );
} catch (Exception e) {
    return fallbackServiceProxy.findById(123);  // Fallback to replica
}
```

**2. Latency (300x slower than local calls)**
- Problem: Local call = 0.01ms, remote call = 3ms (same datacenter), 50ms (cross-region)
- Solution: Batching, caching, async processing
```java
// Bad: N individual calls (N × 3ms = 300ms for 100 items)
for (Long id : ids) {
    users.add(userServiceProxy.findById(id));
}

// Good: Batch call (1 × 3ms = 3ms for 100 items)
List<User> users = userServiceProxy.findByIds(ids);  // 100x faster
```

**3. Serialization Overhead**
- Problem: Java objects must be serialized (JSON, Protobuf) and deserialized
- Solution: Use efficient formats (Protobuf 5x faster than JSON), cache frequently accessed data
```java
// JSON: 1KB per user, 0.5ms serialization
// Protobuf: 200B per user, 0.1ms serialization (5x faster)
```

**4. Versioning and Compatibility**
- Problem: Client and server may be running different versions
- Solution: Backward-compatible changes, API versioning
```java
// v1: User has name, email
// v2: User adds phoneNumber (new field)
// Client v1 must still work with Server v2 (ignore unknown fields)
```

**5. Debugging and Observability**
- Problem: Failures are distributed—hard to trace
- Solution: Distributed tracing (trace ID propagated across services), correlation IDs
```java
// Add trace ID to every remote call
restTemplate.intercept((request, body, execution) -> {
    request.getHeaders().add("X-Trace-Id", TraceContext.getCurrentTraceId());
    return execution.execute(request, body);
});
```

**6. Service Discovery**
- Problem: Service instances come and go (scaling, deployments)
- Solution: Service registry (Consul, Eureka), client-side load balancing
```java
// Don't hardcode URLs
// Bad: String url = "http://user-service:8080";

// Good: Use service name, registry resolves to healthy instances
@FeignClient(name = "user-service")
public interface UserServiceProxy { ... }
```

**Real example:** At my previous company, we had a remote proxy for the payment service. Initially, a single network blip would fail orders. After adding retry (3 attempts), circuit breaker (fail fast after 50% errors), timeout (5s), and fallback to backup payment provider, availability increased from 95% to 99.95%. The key was treating remote proxies as inherently unreliable and adding resilience layers."

---

#### Q4: "When would you use a proxy instead of just calling the real object directly?"

**Answer:**

"You use a proxy when you need **control over access** or **additional behavior** without modifying the real object. Here's my decision framework:

**Use Virtual Proxy when:**
- Object is expensive to create (heavy computation, large data, network I/O)
- Object might not be needed (lazy loading)
- Want to defer creation until first use

**Example:** Image gallery with 100 images. Without proxy, loading all 100 images at startup takes 30 seconds and 500MB memory. With virtual proxy, only load images as user scrolls—instant startup, 10x less memory.

**Use Protection Proxy when:**
- Need access control (authorization, rate limiting)
- Want to centralize security checks (avoid scattering throughout code)
- Need audit trail of who accessed what

**Example:** Document management system where different users have different permissions. Without proxy, every method needs authorization checks (error-prone, scattered). With protection proxy, all checks in one place—single source of truth, easier to audit.

**Use Remote Proxy when:**
- Calling object in different JVM, server, datacenter
- Want to hide network complexity (serialization, errors, timeouts)
- Need transparent remoting (client thinks it's local)

**Example:** Microservices architecture. Without proxy, every service call requires manual HTTP requests, JSON parsing, error handling (verbose, error-prone). With remote proxy (like Spring Cloud Feign), client just calls Java interface—proxy handles networking.

**Use Smart Reference when:**
- Need reference counting (track usage)
- Want to add logging, metrics, thread-safety
- Copy-on-write semantics

**Example:** Connection pool where connections are expensive. Without proxy, creating/closing connections for every request wastes resources. With smart reference proxy (reference counting), connections are shared and reused—10x higher throughput.

**When NOT to use proxy:**
- Object is simple, cheap to create → overhead not worth it
- No need for access control → direct call is clearer
- Local, in-process call with no special requirements → YAGNI

**Red flags:**
- Using proxy for every object (over-engineering)
- Proxy doing business logic (violates Single Responsibility)
- Multiple layers of proxies (hard to debug)

**In interviews, I emphasize:** 'Proxy is about trade-offs. You add a layer of indirection, which has cost (complexity, slight overhead), but the benefits (lazy loading, security, resilience) often far outweigh the cost. The key is using it when you have a clear reason—control access or add infrastructure concerns—not just because it's a pattern.'"

---

#### Q5: "How do you avoid common mistakes with the Proxy pattern?"

**Answer:**

"I've seen (and made!) several common mistakes with proxies. Here are the big ones:

**Mistake 1: Not delegating all methods correctly**
```java
// ❌ Forgot to delegate close()
public class ConnectionProxy implements Connection {
    private Connection realConnection;
    
    public ResultSet executeQuery(String sql) {
        return realConnection.executeQuery(sql);  // ✅ Delegated
    }
    
    // ❌ Missing close() implementation
    // Result: Connection leak, resource exhaustion
}

// ✅ Correct: Delegate all interface methods
public void close() {
    logger.info("Closing connection");
    realConnection.close();
}
```

**Mistake 2: Breaking Liskov Substitution Principle**
```java
// ❌ Proxy changes behavior in unexpected way
public class CachingUserServiceProxy implements UserService {
    public User findById(Long id) {
        User cached = cache.get(id);
        if (cached != null) {
            return cached;  // ❌ Might return stale data
        }
        User user = realService.findById(id);
        cache.put(id, user);
        return user;
    }
}

// Client expects fresh data, gets stale → violates contract
// ✅ Fix: Document caching behavior, add cache TTL, invalidate on writes
```

**Mistake 3: Thread-safety issues in virtual proxy**
```java
// ❌ Race condition: Two threads may create duplicate objects
public class ImageProxy implements Image {
    private RealImage realImage;  // Not volatile
    
    public void display() {
        if (realImage == null) {  // ❌ Race condition
            realImage = new RealImage(filename);
        }
        realImage.display();
    }
}

// ✅ Fix: Double-checked locking with volatile
private volatile RealImage realImage;
```

**Mistake 4: Exposing the real object**
```java
// ❌ Leaking reference to real object
public class SecureDocumentProxy implements Document {
    private RealDocument realDocument;
    
    public RealDocument getRealDocument() {  // ❌ Bypasses security
        return realDocument;
    }
}

// Client can bypass proxy: proxy.getRealDocument().delete() → security breach
// ✅ Fix: Never expose real object reference
```

**Mistake 5: Not handling exceptions properly**
```java
// ❌ Swallowing exceptions from real object
public User findById(Long id) {
    try {
        return realService.findById(id);
    } catch (Exception e) {
        logger.error("Error", e);
        return null;  // ❌ Hides error, client thinks user doesn't exist
    }
}

// ✅ Fix: Propagate exceptions, only catch what you can handle
public User findById(Long id) {
    try {
        return realService.findById(id);
    } catch (TransientException e) {
        // Retry transient errors
        return retryTemplate.execute(ctx -> realService.findById(id));
    }
    // Let other exceptions propagate
}
```

**Mistake 6: Deep proxy chains (proxy wrapping proxy wrapping proxy)**
```java
// ❌ Hard to debug, performance overhead
UserService service = new UserServiceImpl();
service = new SecurityProxy(service);
service = new LoggingProxy(service);
service = new CachingProxy(service);
service = new MetricsProxy(service);
service = new RetryProxy(service);
// 5 layers deep → confusing stack traces, 5x overhead
```

**Mistake 7: Using proxy when not needed (over-engineering)**
```java
// ❌ Proxy for simple, cheap object
public class StringProxy implements CharSequence {
    private String realString;
    // Why? String is already lightweight, immutable, efficient
}

// ✅ Only use proxy when you have a real reason (expensive, security, remote)
```

**Mistake 8: Not considering proxy overhead in latency-sensitive code**
```java
// ❌ Virtual proxy in hot path (called 1M times/sec)
for (int i = 0; i < 1_000_000; i++) {
    imageProxy.getWidth();  // Each call checks if initialized (overhead)
}

// ✅ Fix: Initialize once, use real object in hot path
Image real = imageProxy.initialize();  // Explicit initialization
for (int i = 0; i < 1_000_000; i++) {
    real.getWidth();  // Direct call, no proxy overhead
}
```

**Mistake 9: Stateful proxies without thread-safety**
```java
// ❌ Shared mutable state in proxy
public class CachingProxy implements Service {
    private Map<String, Object> cache = new HashMap<>();  // ❌ Not thread-safe
}

// ✅ Fix: Use ConcurrentHashMap or synchronization
private Map<String, Object> cache = new ConcurrentHashMap<>();
```

**Mistake 10: Not testing proxy and real object independently**
```java
// ❌ Only testing through proxy
@Test
public void testUserService() {
    UserService proxy = new SecurityProxy(new UserServiceImpl());
    User user = proxy.findById(1L);
    assertNotNull(user);
}
// If test fails, is it proxy or real service?

// ✅ Test both separately
@Test
public void testRealService() {
    UserService real = new UserServiceImpl();
    User user = real.findById(1L);
    assertNotNull(user);  // Tests real service
}

@Test
public void testSecurityProxy() {
    UserService mock = mock(UserService.class);
    UserService proxy = new SecurityProxy(mock);
    
    // Test that proxy checks permissions
    assertThrows(SecurityException.class, () ->
        proxy.findById(1L));
}
```

**How I avoid these mistakes:**
1. **Code reviews**: Focus on proxy-specific issues (delegation, thread-safety, LSP)
2. **Testing**: Test proxy and real object separately, test failure scenarios
3. **Documentation**: Document what the proxy does (lazy loading? caching? security?)
4. **Simplicity**: Only use proxy when you have a clear, single reason
5. **Monitoring**: Track proxy overhead in production (metrics for cache hits, initialization time)

**In interviews:** 'The most important things are: delegate all methods correctly, maintain thread-safety for virtual proxies, don't violate LSP, and only use proxy when you have a clear reason. The pattern adds indirection, so the benefits (lazy loading, security, resilience) must justify the complexity.'"

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Proxy Pattern Structure

```
┌───────────────────────────────────────────────────────────────┐
│                     Proxy Pattern                             │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│                    ┌──────────────┐                          │
│                    │    Client    │                          │
│                    └──────┬───────┘                          │
│                           │                                   │
│                           │ uses                              │
│                           ▼                                   │
│                    ┌──────────────┐                          │
│                    │   Subject    │ (Interface)              │
│                    │              │                          │
│                    │ + request()  │                          │
│                    └──────────────┘                          │
│                           △                                   │
│                           │ implements                        │
│              ┌────────────┴────────────┐                     │
│              │                         │                     │
│      ┌───────▼──────┐         ┌───────▼──────┐             │
│      │ RealSubject  │         │     Proxy    │             │
│      │              │◄────────│              │             │
│      │ + request()  │ wraps   │ + request()  │             │
│      │              │         │ - realSubject│             │
│      └──────────────┘         │ + checkAccess│             │
│                                │ + lazy Load  │             │
│                                └──────────────┘             │
│                                                               │
│  Request Flow:                                                │
│  1. Client calls proxy.request()                             │
│  2. Proxy performs control logic:                            │
│     - Virtual: Check if loaded, load if needed               │
│     - Protection: Check permissions                          │
│     - Remote: Serialize, send over network                   │
│  3. Proxy delegates to realSubject.request()                 │
│  4. Real subject processes request                           │
│  5. Proxy may add post-processing (cache result, log)       │
│  6. Return result to client                                  │
└───────────────────────────────────────────────────────────────┘
```

### Virtual Proxy: Lazy Loading Sequence

```
Time: ────────────────────────────────────────────────────────►

Startup (without proxy):
  [Load Image1] [Load Image2] [Load Image3] ... [Load Image100]
  ▼             ▼             ▼                  ▼
  30 seconds loading time
  500MB memory used
  User waits... (bad UX)


Startup (with virtual proxy):
  [Create Proxy1] [Create Proxy2] [Create Proxy3] ... [Create Proxy100]
  ▼               ▼               ▼                    ▼
  0.1 seconds (instant)
  5MB memory (proxies are lightweight)
  ✅ User sees UI immediately


First display (image 1):
  User clicks image 1
  ▼
  Proxy1 checks: realImage == null? Yes
  ▼
  Proxy1 loads RealImage1 from disk (3 seconds)
  ▼
  Display image 1
  ✅ 3 second wait (acceptable, only for first image)


Second display (image 1 again):
  User clicks image 1 again
  ▼
  Proxy1 checks: realImage == null? No (already loaded)
  ▼
  Proxy1.realImage.display() (instant)
  ✅ 0 second wait (cached in proxy)


Display other images:
  User scrolls to image 2, 3, 4...
  ▼
  Each proxy loads on first access
  ▼
  Images load as needed (lazy)
  ✅ Memory grows incrementally, not all at once
```

### Protection Proxy: Access Control Flow

```
┌────────────────────────────────────────────────────────────────┐
│                   Protection Proxy Flow                        │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Client Request                                                │
│       │                                                        │
│       │ deleteDocument(123)                                    │
│       ▼                                                        │
│  ┌──────────────────┐                                         │
│  │ Security Proxy   │                                         │
│  ├──────────────────┤                                         │
│  │ 1. Get user      │                                         │
│  │    from context  │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ User: { id: 42, role: "USER" }                    │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ 2. Check role    │                                         │
│  │    for DELETE    │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ Allowed roles: ["ADMIN"]                          │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ Role check       │                                         │
│  │ USER in [ADMIN]? │                                         │
│  │ ❌ NO            │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ throw SecurityException                           │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ 3. Log denied    │                                         │
│  │    access        │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ AuditLog: "User 42 denied delete doc 123"         │
│           ▼                                                    │
│       Return to client                                         │
│       ❌ SecurityException: "Access denied"                   │
│                                                                │
│                                                                │
│  Alternative flow (ADMIN user):                               │
│       │                                                        │
│       │ User: { id: 99, role: "ADMIN" }                       │
│       ▼                                                        │
│  ┌──────────────────┐                                         │
│  │ Role check       │                                         │
│  │ ADMIN in [ADMIN]?│                                         │
│  │ ✅ YES           │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ Delegate to real service                          │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ Real Service     │                                         │
│  │ deleteDocument() │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ Document deleted                                   │
│           ▼                                                    │
│  ┌──────────────────┐                                         │
│  │ 4. Log success   │                                         │
│  └────────┬─────────┘                                         │
│           │                                                    │
│           │ AuditLog: "User 99 deleted doc 123"               │
│           ▼                                                    │
│       Return to client                                         │
│       ✅ Success                                              │
└────────────────────────────────────────────────────────────────┘
```

### Remote Proxy: Network Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                  Remote Proxy Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Client JVM                         Server JVM                │
│   (Order Service)                    (User Service)            │
│                                                                 │
│  ┌──────────────┐                   ┌──────────────┐          │
│  │ OrderService │                   │ UserService  │          │
│  └──────┬───────┘                   │ (Real)       │          │
│         │                            └──────▲───────┘          │
│         │ findById(123)                     │                  │
│         ▼                                   │                  │
│  ┌──────────────┐                           │                  │
│  │ UserService  │                           │                  │
│  │ Proxy        │                           │                  │
│  └──────┬───────┘                           │                  │
│         │                                   │                  │
│         │ 1. Serialize                      │ 5. Deserialize   │
│         │    request                        │    request       │
│         ▼                                   │                  │
│  ┌──────────────┐                           │                  │
│  │{ "id": 123 } │                           │                  │
│  └──────┬───────┘                           │                  │
│         │                                   │                  │
│         │ 2. HTTP POST                      │                  │
│         │    /users/123                     │                  │
│         ▼                                   │                  │
│  ┌──────────────────────────────────────────────┐              │
│  │           Network (HTTP/2)                   │              │
│  │  ┌─────────────────────────────────────┐     │              │
│  │  │ GET /users/123                      │── ──┼─────────────► │
│  │  │ Headers:                            │     │               │
│  │  │   Content-Type: application/json    │     │               │
│  │  │   X-Trace-Id: abc-123               │     │               │
│  │  └─────────────────────────────────────┘     │               │
│  └──────────────────────────────────────────────┘               │
│                                                  │              │
│                                                  │ 6. Execute   │ 
│                                                  ▼              │
│                                           ┌──────────────┐      │
│                                           │ userRepo     │      │
│                                           │ .findById()  │      │
│                                           └──────┬───────┘      │
│                                                  │              │
│                                                  │ 7. Return    │
│                                                  ▼              │ 
│                                           ┌──────────────┐      │
│                                           │ User object  │      │
│                                           └──────┬───────┘      │
│                                                  │             │
│                                                  │ 8. Serialize│
│  ┌──────────────────────────────────────────────┘             │
│  │           Network (HTTP/2)                   │             │
│  │  ┌─────────────────────────────────────┐    │             │
│  │  │ 200 OK                              │◄───┼─────────────│
│  │  │ {                                   │    │             │
│  │  │   "id": 123,                        │    │             │
│  │  │   "name": "Alice",                  │    │             │
│  │  │   "email": "alice@example.com"      │    │             │
│  │  │ }                                   │    │             │
│  │  └─────────────────────────────────────┘    │             │
│  └──────────────────────────────────────────────┘             │
│         │                                                      │
│         │ 3. Receive response                                  │
│         ▼                                                      │
│  ┌──────────────┐                                             │
│  │ Deserialize  │                                             │
│  │ to User obj  │                                             │
│  └──────┬───────┘                                             │
│         │                                                      │
│         │ 4. Return User                                       │
│         ▼                                                      │
│  ┌──────────────┐                                             │
│  │ OrderService │                                             │
│  │ (continues)  │                                             │
│  └──────────────┘                                             │
│                                                                 │
│  Latency Breakdown:                                            │
│  - Serialization: 0.5ms                                        │
│  - Network: 2ms (same datacenter)                              │
│  - Deserialization: 0.5ms                                      │
│  - Business logic: 5ms (database query)                        │
│  - Serialization: 0.5ms                                        │
│  - Network: 2ms                                                │
│  - Deserialization: 0.5ms                                      │
│  ────────────────────                                          │
│  Total: 11ms                                                   │
│                                                                 │
│  (vs local call: 5ms for database query only)                 │
│  Overhead: 6ms (54%) for network communication                 │
└─────────────────────────────────────────────────────────────────┘
```

### Proxy Types Comparison

```
┌──────────────────────────────────────────────────────────────────┐
│                    Proxy Types Comparison                        │
├──────────────┬───────────────┬──────────────┬──────────────────┤
│ Type         │ Purpose       │ When         │ Example          │
├──────────────┼───────────────┼──────────────┼──────────────────┤
│ Virtual      │ Lazy loading  │ Expensive to │ Image proxy      │
│ Proxy        │ Defer         │ create       │ Hibernate lazy   │
│              │ initialization│ Might not be │ Connection pool  │
│              │               │ needed       │                  │
├──────────────┼───────────────┼──────────────┼──────────────────┤
│ Protection   │ Access control│ Need security│ @PreAuthorize    │
│ Proxy        │ Authorization │ Check perms  │ Secure document  │
│              │ Audit trail   │ Rate limiting│ API gateway auth │
├──────────────┼───────────────┼──────────────┼──────────────────┤
│ Remote       │ Hide network  │ Distributed  │ gRPC stub        │
│ Proxy        │ Transparent   │ Microservices│ RMI              │
│              │ remoting      │ Different JVM│ Feign client     │
├──────────────┼───────────────┼──────────────┼──────────────────┤
│ Smart        │ Reference     │ Shared       │ Connection pool  │
│ Reference    │ counting      │ resources    │ Copy-on-write    │
│              │ Logging       │ Need metrics │ Smart pointer    │
├──────────────┼───────────────┼──────────────┼──────────────────┤
│ Caching      │ Cache results │ Expensive ops│ CDN              │
│ Proxy        │ Avoid repeated│ Slow queries │ Nginx cache      │
│              │ computation   │ Idempotent   │ Redis proxy      │
└──────────────┴───────────────┴──────────────┴──────────────────┘

Common Characteristics:
✅ Same interface as real object
✅ Controls access (adds layer of indirection)
✅ Delegates to real object eventually
✅ Often manages lifecycle of real object

Key Differences from Decorator:
- Proxy: Controls access (lazy load, security, remote)
- Decorator: Adds behavior (logging, caching, retry)
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why Proxy Matters

**1. Performance at Scale**
- **Virtual proxies** reduce startup time from minutes to seconds by deferring expensive initialization
- **Caching proxies** (CDN, Nginx) reduce latency by 40x (200ms → 5ms) and origin load by 20x
- **Lazy loading** (Hibernate) eliminates N+1 query problems, improving page load by 90x (5s → 55ms)

**2. Security & Compliance**
- **Protection proxies** centralize authorization, preventing security bypasses
- Audit trail for all sensitive operations (who accessed what, when)
- Rate limiting prevents abuse (DDoS protection)

**3. Distributed Systems Enabler**
- **Remote proxies** make microservices practical by hiding network complexity
- Client code looks local, proxy handles serialization, retries, failover
- gRPC, Feign, RMI all built on remote proxy pattern

**4. Reliability & Resilience**
- Remote proxies add resilience layers (retry, circuit breaker, timeout, fallback)
- Increases availability from 95% to 99.9% with proper resilience patterns
- Graceful degradation (stale cache better than failure)

**5. Cost Optimization**
- Lazy loading reduces memory usage by 50-90% (500GB → 50GB)
- CDN caching saves $100K+/month in bandwidth and compute costs
- Connection pooling increases throughput by 10x (reuse vs recreate)

### How It Works (Technical Summary)

**Core Mechanism:**
1. **Same interface**: Proxy implements same interface as real subject
2. **Composition**: Proxy wraps real subject (HAS-A relationship)
3. **Control logic**: Proxy adds layer before delegating (lazy load, security, remote)
4. **Delegation**: Eventually forwards to real subject for actual work
5. **Transparency**: Client unaware it's using proxy vs real object

**Four Types:**
- **Virtual**: Lazy initialization (`if (real == null) create();`)
- **Protection**: Authorization (`if (!hasPermission()) throw;`)
- **Remote**: Network communication (`serialize(); send(); deserialize();`)
- **Smart Reference**: Additional behavior (reference counting, logging, thread-safety)

**Implementation Pattern:**
```java
public class Proxy implements Subject {
    private RealSubject real;  // Lazy or eager initialization
    
    public void operation() {
        // Pre-processing (control logic)
        checkAccess();           // Protection
        loadIfNeeded();          // Virtual
        serializeAndSend();      // Remote
        incrementRefCount();     // Smart Reference
        
        // Delegation
        real.operation();
        
        // Post-processing
        logAccess();
        cacheResult();
    }
}
```

**Frameworks Using Proxy:**
- **Spring AOP**: Auto-generates proxies for @Transactional, @Cacheable, @PreAuthorize
- **Hibernate/JPA**: Lazy-loaded associations are proxies (avoid N+1 queries)
- **gRPC/Feign**: Client stubs are remote proxies (transparent remoting)
- **Nginx/CDN**: Caching proxies for web content (reduce latency, origin load)

### Trade-Offs

| Aspect | Benefits | Costs |
|--------|----------|-------|
| **Flexibility** | Runtime control over access | Additional layer of indirection |
| **Performance** | Lazy loading (50-90% memory), caching (40x faster) | Small overhead (0.1-1ms per proxy call) |
| **Security** | Centralized authorization, audit trail | Complexity (need to test proxy logic) |
| **Reliability** | Resilience (retry, circuit breaker, fallback) | Debugging harder (proxy + real object) |
| **Scalability** | Distributed systems (remote proxies) | Network latency (300x slower than local) |
| **Maintainability** | Single Responsibility (proxy = access control) | Must delegate all methods correctly |

**When to use:**
✅ Object is expensive to create (lazy loading)
✅ Need access control (security, rate limiting)
✅ Remote object (microservices, distributed systems)
✅ Add resilience (retry, circuit breaker, timeout)
✅ Cache expensive operations

**When NOT to use:**
❌ Object is cheap, simple
❌ No need for control (direct call clearer)
❌ Over-engineering (proxy for every object)
❌ Business logic belongs in proxy (violates SRP)

### Decision Framework

**Use Virtual Proxy if:**
```
- Object creation time > 100ms
- Object might not be needed (< 50% usage)
- Memory usage significant (> 10MB per object)
→ Example: Image gallery, connection pool, expensive computations
```

**Use Protection Proxy if:**
```
- Sensitive operations (delete, admin)
- Multiple access points (need centralized check)
- Audit requirements (who did what)
→ Example: Document access, API security, rate limiting
```

**Use Remote Proxy if:**
```
- Object in different JVM/server/datacenter
- Want transparent remoting (hide network)
- Need typed interface (not raw HTTP)
→ Example: Microservices (gRPC, Feign), RMI
```

**Use Smart Reference if:**
```
- Shared resources (need reference counting)
- Need logging/metrics per access
- Thread-safety required (add synchronization)
→ Example: Connection pool, copy-on-write collections
```

### Interview Checklist

✅ **Explain core concept**: Proxy controls access, same interface, delegates to real object

✅ **Know four types**: Virtual (lazy loading), Protection (security), Remote (network), Smart Reference (behavior)

✅ **Provide real examples**: 
- Spring AOP proxies (@Transactional)
- Hibernate lazy loading (N+1 query prevention)
- gRPC stubs (transparent remoting)
- CDN/Nginx (caching proxy)

✅ **Discuss trade-offs**:
- Benefits: Performance (lazy load, cache), security (centralized), resilience (retry, fallback)
- Costs: Indirection (overhead), complexity (testing), debugging (stack traces)

✅ **Differentiate from Decorator**:
- Proxy: Controls access (intent)
- Decorator: Adds behavior (intent)
- Both: Same interface, wrap object

✅ **Handle thread-safety**: Double-checked locking for virtual proxy, volatile keyword

✅ **Production concerns**:
- Remote proxy: Retry, circuit breaker, timeout, fallback
- Virtual proxy: Thread-safe lazy initialization
- Protection proxy: Audit logging, performance overhead
- Testing: Test proxy and real object independently

✅ **Common mistakes**:
- Not delegating all methods
- Breaking LSP (Liskov Substitution Principle)
- Exposing real object reference
- Race conditions in lazy loading
- Over-engineering (proxy when not needed)

### Key Takeaway for Interviews

> **"Proxy is about controlling access to an object. Virtual proxy delays expensive creation, protection proxy enforces security, remote proxy hides network complexity. The key is same interface but adding a control layer before delegating. Spring AOP, Hibernate lazy loading, and gRPC all use this pattern at massive scale. The benefits—performance, security, resilience—far outweigh the small indirection cost when applied correctly."**

---

**Congratulations!** You now have a comprehensive understanding of the **Proxy Pattern** from FAANG-level system design perspective. This pattern is fundamental to modern frameworks (Spring, Hibernate, gRPC) and appears frequently in interviews. Master the four types, understand when each applies, and you'll demonstrate senior/staff-level expertise.

**Next Steps:**
- Topic 186: **Facade Pattern** (final Structural Pattern)
- Then: **Behavioral Patterns** (Strategy, Observer, Command, Chain of Responsibility, Template Method)

**Remember:** Proxy is about **control**. Whether it's lazy loading for performance, authorization for security, or network communication for distribution, the proxy gives you a control point without modifying the real object.

