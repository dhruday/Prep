# 184. Decorator Pattern

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Decorator Pattern** is a structural design pattern that allows you to dynamically add new behavior to objects at runtime by wrapping them in decorator objects. It provides a flexible alternative to subclassing for extending functionality.

### **What It Is**

**Core Concept:**
The Decorator pattern lets you attach additional responsibilities to an object dynamically. Decorators provide a flexible alternative to subclassing for extending functionality. Instead of creating many subclasses for every combination of features, you wrap objects in decorators that add specific behaviors.

```java
// Base component
interface Coffee {
    String getDescription();
    double getCost();
}

// Concrete component
class SimpleCoffee implements Coffee {
    @Override
    public String getDescription() {
        return "Simple coffee";
    }
    
    @Override
    public double getCost() {
        return 2.0;
    }
}

// Decorator base class
abstract class CoffeeDecorator implements Coffee {
    protected Coffee decoratedCoffee;
    
    public CoffeeDecorator(Coffee coffee) {
        this.decoratedCoffee = coffee;
    }
    
    @Override
    public String getDescription() {
        return decoratedCoffee.getDescription();
    }
    
    @Override
    public double getCost() {
        return decoratedCoffee.getCost();
    }
}

// Concrete decorators
class MilkDecorator extends CoffeeDecorator {
    public MilkDecorator(Coffee coffee) {
        super(coffee);
    }
    
    @Override
    public String getDescription() {
        return decoratedCoffee.getDescription() + ", milk";
    }
    
    @Override
    public double getCost() {
        return decoratedCoffee.getCost() + 0.5;
    }
}

class SugarDecorator extends CoffeeDecorator {
    public SugarDecorator(Coffee coffee) {
        super(coffee);
    }
    
    @Override
    public String getDescription() {
        return decoratedCoffee.getDescription() + ", sugar";
    }
    
    @Override
    public double getCost() {
        return decoratedCoffee.getCost() + 0.2;
    }
}

// Usage: Dynamically compose behaviors
Coffee coffee = new SimpleCoffee();                  // $2.00
coffee = new MilkDecorator(coffee);                  // $2.50
coffee = new SugarDecorator(coffee);                 // $2.70
coffee = new MilkDecorator(coffee);                  // $3.20 (double milk!)

System.out.println(coffee.getDescription());  // "Simple coffee, milk, sugar, milk"
System.out.println(coffee.getCost());         // 3.20
```

**Key Components:**
1. **Component Interface:** Common interface for base and decorators
2. **Concrete Component:** Basic implementation without decorations
3. **Decorator Base:** Abstract class that wraps component
4. **Concrete Decorators:** Add specific behaviors/responsibilities

---

### **Why It Exists**

**Problem: Combinatorial Explosion with Inheritance**

```java
// Without Decorator: Need a class for every combination
class SimpleCoffee { }
class CoffeeWithMilk { }
class CoffeeWithSugar { }
class CoffeeWithMilkAndSugar { }
class CoffeeWithDoubleMilk { }
class CoffeeWithDoubleMilkAndSugar { }
// ... 2^n classes for n features! 💥

// Problem: Rigid, not runtime-configurable, maintenance nightmare
```

**Solution with Decorator:**

```java
// With Decorator: Flexible composition
Coffee coffee = new SimpleCoffee();
coffee = new MilkDecorator(coffee);
coffee = new SugarDecorator(coffee);

// Want different combo? Just wrap differently
Coffee another = new SugarDecorator(new MilkDecorator(new SimpleCoffee()));

// Benefits:
// ✓ Runtime composition
// ✓ No class explosion
// ✓ Open for extension, closed for modification (OCP)
// ✓ Single Responsibility (each decorator has one job)
```

---

### **When to Use Decorator Pattern**

**Perfect Use Cases:**

1. **Adding Responsibilities Dynamically**
   - Features need to be added/removed at runtime
   - Different combinations for different instances
   - Example: Logging, caching, authentication wrapping

2. **Avoiding Subclass Explosion**
   - Many optional features
   - Features can be combined in various ways
   - Example: UI components with borders, scrollbars, shadows

3. **Cross-Cutting Concerns**
   - Logging
   - Performance monitoring
   - Security (authentication, authorization)
   - Transaction management
   - Caching
   - Retry logic

4. **Enhancing Existing Functionality**
   - Can't modify original class (third-party library)
   - Want to preserve original interface
   - Example: Adding buffering to I/O streams

**When NOT to Use:**

- Simple inheritance works fine (no combinations needed)
- Order of decorators matters and becomes confusing
- Too many small decorators (overhead, debugging complexity)
- Need to identify specific decorator types at runtime

---

### **Decorator vs Adapter vs Proxy**

| **Pattern** | **Purpose** | **Interface** | **Use Case** |
|-------------|-------------|---------------|--------------|
| **Decorator** | Add responsibilities | Same interface | Add logging, caching, validation |
| **Adapter** | Make interfaces compatible | Different interface | Integrate third-party library |
| **Proxy** | Control access | Same interface | Lazy loading, access control, remote proxy |

**Example:**

```java
// Decorator: Add behavior (same interface)
DataSource dataSource = new FileDataSource("data.txt");
dataSource = new EncryptionDecorator(dataSource);  // Add encryption
dataSource = new CompressionDecorator(dataSource);  // Add compression

// Adapter: Change interface (different interface)
ModernPaymentGateway gateway = new StripeAdapter(legacyStripeClient);

// Proxy: Control access (same interface)
Image image = new ImageProxy("large_photo.jpg");  // Lazy load
```

---

### **Role in Large-Scale Distributed Systems**

**Scenario: HTTP Client with Cross-Cutting Concerns**

```java
// Base HTTP client
interface HttpClient {
    Response execute(Request request);
}

class BasicHttpClient implements HttpClient {
    @Override
    public Response execute(Request request) {
        // Basic HTTP call
        return httpEngine.send(request);
    }
}

// Decorator 1: Logging
class LoggingHttpClient implements HttpClient {
    private final HttpClient delegate;
    private final Logger logger;
    
    @Override
    public Response execute(Request request) {
        logger.info("Request: {} {}", request.method(), request.url());
        long start = System.currentTimeMillis();
        
        Response response = delegate.execute(request);
        
        long duration = System.currentTimeMillis() - start;
        logger.info("Response: {} in {}ms", response.status(), duration);
        return response;
    }
}

// Decorator 2: Metrics
class MetricsHttpClient implements HttpClient {
    private final HttpClient delegate;
    private final MeterRegistry metrics;
    
    @Override
    public Response execute(Request request) {
        Timer.Sample sample = Timer.start(metrics);
        
        try {
            Response response = delegate.execute(request);
            sample.stop(metrics.timer("http.request", 
                "method", request.method(),
                "status", String.valueOf(response.status())));
            return response;
        } catch (Exception e) {
            metrics.counter("http.request.error").increment();
            throw e;
        }
    }
}

// Decorator 3: Retry
class RetryHttpClient implements HttpClient {
    private final HttpClient delegate;
    private final int maxRetries;
    
    @Override
    public Response execute(Request request) {
        int attempt = 0;
        while (true) {
            try {
                return delegate.execute(request);
            } catch (Exception e) {
                attempt++;
                if (attempt >= maxRetries) {
                    throw e;
                }
                Thread.sleep(1000 * attempt);  // Exponential backoff
            }
        }
    }
}

// Decorator 4: Circuit Breaker
class CircuitBreakerHttpClient implements HttpClient {
    private final HttpClient delegate;
    private final CircuitBreaker circuitBreaker;
    
    @Override
    public Response execute(Request request) {
        return circuitBreaker.executeSupplier(() -> delegate.execute(request));
    }
}

// Decorator 5: Authentication
class AuthenticatedHttpClient implements HttpClient {
    private final HttpClient delegate;
    private final TokenProvider tokenProvider;
    
    @Override
    public Response execute(Request request) {
        String token = tokenProvider.getToken();
        Request authenticatedRequest = request.withHeader("Authorization", "Bearer " + token);
        return delegate.execute(authenticatedRequest);
    }
}

// Composition: Build client with all features
HttpClient httpClient = new BasicHttpClient();
httpClient = new AuthenticatedHttpClient(httpClient, tokenProvider);
httpClient = new RetryHttpClient(httpClient, 3);
httpClient = new CircuitBreakerHttpClient(httpClient, circuitBreaker);
httpClient = new MetricsHttpClient(httpClient, meterRegistry);
httpClient = new LoggingHttpClient(httpClient, logger);

// Use client: All decorators automatically applied
Response response = httpClient.execute(request);

// Execution flow:
// 1. LoggingHttpClient logs request
// 2. MetricsHttpClient starts timer
// 3. CircuitBreakerHttpClient checks circuit state
// 4. RetryHttpClient handles failures
// 5. AuthenticatedHttpClient adds token
// 6. BasicHttpClient makes actual HTTP call
// 7. Response flows back through decorators
```

**Benefits at Scale:**
- **Composable:** Mix and match decorators per use case
- **Testable:** Test each decorator in isolation
- **Maintainable:** Add new decorators without changing existing code
- **Configurable:** Enable/disable decorators via configuration
- **Observable:** Logging and metrics decorators provide visibility

---

### **Business Impact**

**Development Velocity:**
```
Before Decorator (Inheritance):
- Add feature: Modify multiple classes (10+ files)
- Combine features: Create new subclasses (5+ classes)
- Testing: Test all combinations (n^2 tests)
- Time: 2 weeks per feature

After Decorator:
- Add feature: Create one decorator class
- Combine features: Wrap in decorator chain
- Testing: Test decorator in isolation
- Time: 2 days per feature

Impact: 5x faster feature development
```

**Production Flexibility:**
```
Real scenario (E-commerce API):

Without Decorator:
- Enable retry: Deploy new code, restart services
- Change retry config: Code change, full deployment
- A/B test retry: Difficult (hardcoded)

With Decorator:
- Enable retry: Add decorator in configuration
- Change retry config: Change config, no deployment
- A/B test retry: Feature flag controls decorator

Result: 10x faster experimentation
```

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Complete Implementation: Data Source with Decorators**

```java
// Component interface
public interface DataSource {
    void writeData(String data);
    String readData();
}

// Concrete component (basic implementation)
public class FileDataSource implements DataSource {
    private final String filename;
    
    public FileDataSource(String filename) {
        this.filename = filename;
    }
    
    @Override
    public void writeData(String data) {
        try {
            Files.writeString(Path.of(filename), data);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write file", e);
        }
    }
    
    @Override
    public String readData() {
        try {
            return Files.readString(Path.of(filename));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file", e);
        }
    }
}

// Decorator base class (optional but recommended)
public abstract class DataSourceDecorator implements DataSource {
    protected final DataSource wrappee;
    
    public DataSourceDecorator(DataSource source) {
        this.wrappee = source;
    }
    
    @Override
    public void writeData(String data) {
        wrappee.writeData(data);
    }
    
    @Override
    public String readData() {
        return wrappee.readData();
    }
}

// Concrete Decorator 1: Encryption
public class EncryptionDecorator extends DataSourceDecorator {
    
    public EncryptionDecorator(DataSource source) {
        super(source);
    }
    
    @Override
    public void writeData(String data) {
        String encryptedData = encrypt(data);
        super.writeData(encryptedData);
    }
    
    @Override
    public String readData() {
        String encryptedData = super.readData();
        return decrypt(encryptedData);
    }
    
    private String encrypt(String data) {
        // Simple Base64 encoding (use real encryption in production)
        return Base64.getEncoder().encodeToString(data.getBytes());
    }
    
    private String decrypt(String data) {
        return new String(Base64.getDecoder().decode(data));
    }
}

// Concrete Decorator 2: Compression
public class CompressionDecorator extends DataSourceDecorator {
    
    public CompressionDecorator(DataSource source) {
        super(source);
    }
    
    @Override
    public void writeData(String data) {
        String compressedData = compress(data);
        super.writeData(compressedData);
    }
    
    @Override
    public String readData() {
        String compressedData = super.readData();
        return decompress(compressedData);
    }
    
    private String compress(String data) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            GZIPOutputStream gzip = new GZIPOutputStream(out);
            gzip.write(data.getBytes());
            gzip.close();
            return Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (IOException e) {
            throw new RuntimeException("Compression failed", e);
        }
    }
    
    private String decompress(String compressedData) {
        try {
            byte[] compressed = Base64.getDecoder().decode(compressedData);
            ByteArrayInputStream in = new ByteArrayInputStream(compressed);
            GZIPInputStream gzip = new GZIPInputStream(in);
            return new String(gzip.readAllBytes());
        } catch (IOException e) {
            throw new RuntimeException("Decompression failed", e);
        }
    }
}

// Concrete Decorator 3: Logging
public class LoggingDecorator extends DataSourceDecorator {
    private static final Logger logger = LoggerFactory.getLogger(LoggingDecorator.class);
    
    public LoggingDecorator(DataSource source) {
        super(source);
    }
    
    @Override
    public void writeData(String data) {
        logger.info("Writing data: {} bytes", data.length());
        long start = System.currentTimeMillis();
        
        super.writeData(data);
        
        long duration = System.currentTimeMillis() - start;
        logger.info("Write completed in {}ms", duration);
    }
    
    @Override
    public String readData() {
        logger.info("Reading data");
        long start = System.currentTimeMillis();
        
        String data = super.readData();
        
        long duration = System.currentTimeMillis() - start;
        logger.info("Read completed in {}ms: {} bytes", duration, data.length());
        return data;
    }
}

// Usage: Compose decorators
public class Application {
    public static void main(String[] args) {
        // Basic file storage
        DataSource dataSource = new FileDataSource("data.txt");
        
        // Add compression
        dataSource = new CompressionDecorator(dataSource);
        
        // Add encryption (compressed data is encrypted)
        dataSource = new EncryptionDecorator(dataSource);
        
        // Add logging (logs all operations)
        dataSource = new LoggingDecorator(dataSource);
        
        // Write data (automatically compressed, encrypted, and logged)
        dataSource.writeData("This is sensitive data that needs to be compressed and encrypted.");
        
        // Read data (automatically decrypted, decompressed, and logged)
        String data = dataSource.readData();
        System.out.println("Data: " + data);
        
        // Order matters!
        // Write flow: Logging → Encryption → Compression → File
        // Read flow: File → Decompression → Decryption → Logging
    }
}
```

---

### **Spring Boot Integration: Request/Response Decorators**

```java
// Component interface
public interface RequestHandler {
    Response handle(Request request);
}

// Concrete component
@Component
public class BasicRequestHandler implements RequestHandler {
    
    @Override
    public Response handle(Request request) {
        // Basic request handling logic
        return processBusinessLogic(request);
    }
    
    private Response processBusinessLogic(Request request) {
        // Implementation
        return new Response(200, "Success");
    }
}

// Decorator 1: Authentication
@Component
public class AuthenticationDecorator implements RequestHandler {
    private final RequestHandler delegate;
    private final AuthenticationService authService;
    
    @Autowired
    public AuthenticationDecorator(
            @Qualifier("basicHandler") RequestHandler delegate,
            AuthenticationService authService) {
        this.delegate = delegate;
        this.authService = authService;
    }
    
    @Override
    public Response handle(Request request) {
        String token = request.getHeader("Authorization");
        
        if (token == null || !authService.validateToken(token)) {
            return new Response(401, "Unauthorized");
        }
        
        // Set user context
        User user = authService.getUserFromToken(token);
        SecurityContext.setUser(user);
        
        try {
            return delegate.handle(request);
        } finally {
            SecurityContext.clear();
        }
    }
}

// Decorator 2: Rate Limiting
@Component
public class RateLimitingDecorator implements RequestHandler {
    private final RequestHandler delegate;
    private final RateLimiter rateLimiter;
    
    @Autowired
    public RateLimitingDecorator(
            @Qualifier("authenticationDecorator") RequestHandler delegate,
            RateLimiter rateLimiter) {
        this.delegate = delegate;
        this.rateLimiter = rateLimiter;
    }
    
    @Override
    public Response handle(Request request) {
        String clientId = request.getClientId();
        
        if (!rateLimiter.allowRequest(clientId)) {
            return new Response(429, "Too Many Requests");
        }
        
        return delegate.handle(request);
    }
}

// Decorator 3: Caching
@Component
public class CachingDecorator implements RequestHandler {
    private final RequestHandler delegate;
    private final Cache<String, Response> cache;
    
    @Autowired
    public CachingDecorator(
            @Qualifier("rateLimitingDecorator") RequestHandler delegate,
            Cache<String, Response> cache) {
        this.delegate = delegate;
        this.cache = cache;
    }
    
    @Override
    public Response handle(Request request) {
        if (request.getMethod().equals("GET")) {
            String cacheKey = generateCacheKey(request);
            Response cached = cache.getIfPresent(cacheKey);
            
            if (cached != null) {
                return cached;
            }
            
            Response response = delegate.handle(request);
            cache.put(cacheKey, response);
            return response;
        }
        
        return delegate.handle(request);
    }
    
    private String generateCacheKey(Request request) {
        return request.getUrl() + ":" + request.getQueryParams();
    }
}

// Configuration: Build decorator chain
@Configuration
public class RequestHandlerConfig {
    
    @Bean
    @Qualifier("basicHandler")
    public RequestHandler basicRequestHandler() {
        return new BasicRequestHandler();
    }
    
    @Bean
    @Qualifier("authenticationDecorator")
    public RequestHandler authenticationDecorator(
            @Qualifier("basicHandler") RequestHandler handler,
            AuthenticationService authService) {
        return new AuthenticationDecorator(handler, authService);
    }
    
    @Bean
    @Qualifier("rateLimitingDecorator")
    public RequestHandler rateLimitingDecorator(
            @Qualifier("authenticationDecorator") RequestHandler handler,
            RateLimiter rateLimiter) {
        return new RateLimitingDecorator(handler, rateLimiter);
    }
    
    @Bean
    @Primary
    public RequestHandler cachingDecorator(
            @Qualifier("rateLimitingDecorator") RequestHandler handler,
            Cache<String, Response> cache) {
        return new CachingDecorator(handler, cache);
    }
}

// Controller uses fully decorated handler
@RestController
public class ApiController {
    private final RequestHandler handler;
    
    @Autowired
    public ApiController(RequestHandler handler) {
        this.handler = handler;  // Fully decorated
    }
    
    @GetMapping("/api/resource")
    public Response getResource(HttpServletRequest httpRequest) {
        Request request = convertToRequest(httpRequest);
        return handler.handle(request);
        
        // Automatically:
        // 1. Check cache
        // 2. Check rate limit
        // 3. Authenticate user
        // 4. Execute business logic
    }
}
```

---

### **Java I/O Streams: Classic Decorator Example**

```java
// Java's InputStream is a classic decorator pattern

// Base component
InputStream fileStream = new FileInputStream("data.txt");

// Add buffering (decorator)
InputStream bufferedStream = new BufferedInputStream(fileStream);

// Add decompression (decorator)
InputStream gzipStream = new GZIPInputStream(bufferedStream);

// Add object deserialization (decorator)
ObjectInputStream objectStream = new ObjectInputStream(gzipStream);

// Read object (all decorators automatically applied)
MyObject obj = (MyObject) objectStream.readObject();

// Chain: File → Buffer → Decompress → Deserialize
```

**Custom I/O Decorator:**

```java
// Decorator: Count bytes read
public class ByteCountingInputStream extends FilterInputStream {
    private long bytesRead = 0;
    
    public ByteCountingInputStream(InputStream in) {
        super(in);
    }
    
    @Override
    public int read() throws IOException {
        int result = super.read();
        if (result != -1) {
            bytesRead++;
        }
        return result;
    }
    
    @Override
    public int read(byte[] b, int off, int len) throws IOException {
        int result = super.read(b, off, len);
        if (result != -1) {
            bytesRead += result;
        }
        return result;
    }
    
    public long getBytesRead() {
        return bytesRead;
    }
}

// Usage
ByteCountingInputStream counter = new ByteCountingInputStream(
    new BufferedInputStream(
        new FileInputStream("large_file.bin")
    )
);

byte[] buffer = new byte[1024];
while (counter.read(buffer) != -1) {
    // Process data
}

System.out.println("Total bytes read: " + counter.getBytesRead());
```

---

### **Decorator with Conditional Application**

```java
// Conditional decorator application based on configuration
@Configuration
public class HttpClientConfig {
    
    @Value("${http.client.retry.enabled:true}")
    private boolean retryEnabled;
    
    @Value("${http.client.cache.enabled:true}")
    private boolean cacheEnabled;
    
    @Value("${http.client.logging.enabled:false}")
    private boolean loggingEnabled;
    
    @Bean
    public HttpClient httpClient(
            CircuitBreaker circuitBreaker,
            Cache<String, Response> cache,
            Logger logger) {
        
        HttpClient client = new BasicHttpClient();
        
        // Always apply authentication
        client = new AuthenticatedHttpClient(client, tokenProvider);
        
        // Conditionally apply retry
        if (retryEnabled) {
            client = new RetryHttpClient(client, 3);
        }
        
        // Always apply circuit breaker
        client = new CircuitBreakerHttpClient(client, circuitBreaker);
        
        // Conditionally apply caching
        if (cacheEnabled) {
            client = new CachingHttpClient(client, cache);
        }
        
        // Conditionally apply logging (typically only in dev/staging)
        if (loggingEnabled) {
            client = new LoggingHttpClient(client, logger);
        }
        
        return client;
    }
}

// application.yml
http:
  client:
    retry:
      enabled: true
    cache:
      enabled: true
    logging:
      enabled: false  # Disable in production (performance)
```

---

### **Decorator vs Inheritance**

```java
// WITHOUT DECORATOR (Inheritance - Class Explosion)
class Coffee { }
class CoffeeWithMilk extends Coffee { }
class CoffeeWithSugar extends Coffee { }
class CoffeeWithMilkAndSugar extends Coffee { }
class CoffeeWithWhip extends Coffee { }
class CoffeeWithMilkAndWhip extends Coffee { }
class CoffeeWithSugarAndWhip extends Coffee { }
class CoffeeWithMilkSugarAndWhip extends Coffee { }
// 2^n classes for n toppings! 💥

// WITH DECORATOR (Composition - Flexible)
Coffee coffee = new SimpleCoffee();
coffee = new MilkDecorator(coffee);
coffee = new SugarDecorator(coffee);
coffee = new WhipDecorator(coffee);

// Any combination at runtime
Coffee custom = new WhipDecorator(
    new SugarDecorator(
        new MilkDecorator(
            new SimpleCoffee()
        )
    )
);
```

---

### **Decorator with State Management**

```java
// Decorator that maintains state (use carefully)
public class StatefulCachingDecorator implements DataSource {
    private final DataSource delegate;
    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final long ttlMillis;
    
    private static class CacheEntry {
        final String data;
        final long timestamp;
        
        CacheEntry(String data) {
            this.data = data;
            this.timestamp = System.currentTimeMillis();
        }
        
        boolean isExpired(long ttl) {
            return System.currentTimeMillis() - timestamp > ttl;
        }
    }
    
    public StatefulCachingDecorator(DataSource delegate, long ttlMillis) {
        this.delegate = delegate;
        this.ttlMillis = ttlMillis;
    }
    
    @Override
    public String readData() {
        String key = "singleton";  // Simplified
        CacheEntry entry = cache.get(key);
        
        if (entry != null && !entry.isExpired(ttlMillis)) {
            return entry.data;  // Cache hit
        }
        
        // Cache miss or expired
        String data = delegate.readData();
        cache.put(key, new CacheEntry(data));
        return data;
    }
    
    @Override
    public void writeData(String data) {
        delegate.writeData(data);
        cache.clear();  // Invalidate cache on write
    }
    
    // Expose cache management
    public void clearCache() {
        cache.clear();
    }
    
    public int getCacheSize() {
        return cache.size();
    }
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### **Performance Impact of Decorators**

**Scenario: REST API with Decorators (10,000 requests/second)**

```java
// Without decorators: Direct call
Response response = handler.handle(request);
// Time: 50ms (business logic)
// CPU: Minimal

// With decorators:
// 1. Logging decorator: 0.1ms (write to buffer)
// 2. Metrics decorator: 0.1ms (increment counters)
// 3. Caching decorator: 0.5ms (cache lookup - miss)
// 4. Authentication decorator: 5ms (validate JWT)
// 5. Business logic: 50ms
// Total: 55.7ms (11.4% overhead)

// At 10,000 req/sec:
// Additional CPU: 10,000 × 5.7ms = 57 seconds/second
// Result: Requires ~1 additional CPU core for decorators

// Conclusion: Overhead acceptable for benefits gained
```

**With Cache Hit:**
```java
// Cache decorator (hit): 0.5ms (cache lookup - hit)
// Short-circuit: Business logic skipped (50ms saved)
// Total: 0.7ms (92% faster!)

// Cache hit rate: 80%
// Average response time: 
//   (0.2 × 55.7ms) + (0.8 × 0.7ms) = 11.7ms
// Result: 4.3x faster with caching decorator
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Decorator for Database Operations**

```java
// Base repository
public interface UserRepository {
    User findById(Long id);
    void save(User user);
    void delete(Long id);
}

// Basic implementation
@Repository
public class JpaUserRepository implements UserRepository {
    
    @PersistenceContext
    private EntityManager entityManager;
    
    @Override
    public User findById(Long id) {
        return entityManager.find(UserEntity.class, id);
    }
    
    @Override
    public void save(User user) {
        entityManager.merge(user);
    }
    
    @Override
    public void delete(Long id) {
        entityManager.remove(entityManager.find(UserEntity.class, id));
    }
}

// Decorator 1: Caching
public class CachedUserRepository implements UserRepository {
    private final UserRepository delegate;
    private final Cache<Long, User> cache;
    
    @Override
    public User findById(Long id) {
        User cached = cache.getIfPresent(id);
        if (cached != null) {
            return cached;
        }
        
        User user = delegate.findById(id);
        if (user != null) {
            cache.put(id, user);
        }
        return user;
    }
    
    @Override
    public void save(User user) {
        delegate.save(user);
        cache.invalidate(user.getId());  // Invalidate on write
    }
    
    @Override
    public void delete(Long id) {
        delegate.delete(id);
        cache.invalidate(id);
    }
}

// Decorator 2: Audit Logging
public class AuditedUserRepository implements UserRepository {
    private final UserRepository delegate;
    private final AuditLogger auditLogger;
    
    @Override
    public User findById(Long id) {
        User user = delegate.findById(id);
        auditLogger.log("READ", "User", id, SecurityContext.getCurrentUser());
        return user;
    }
    
    @Override
    public void save(User user) {
        auditLogger.log("WRITE", "User", user.getId(), SecurityContext.getCurrentUser());
        delegate.save(user);
    }
    
    @Override
    public void delete(Long id) {
        auditLogger.log("DELETE", "User", id, SecurityContext.getCurrentUser());
        delegate.delete(id);
    }
}

// Decorator 3: Validation
public class ValidatedUserRepository implements UserRepository {
    private final UserRepository delegate;
    private final Validator validator;
    
    @Override
    public User findById(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("Invalid user ID");
        }
        return delegate.findById(id);
    }
    
    @Override
    public void save(User user) {
        Set<ConstraintViolation<User>> violations = validator.validate(user);
        if (!violations.isEmpty()) {
            throw new ValidationException(violations);
        }
        delegate.save(user);
    }
    
    @Override
    public void delete(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("Invalid user ID");
        }
        delegate.delete(id);
    }
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Decorator for Resilience Patterns**

```java
// Base service
public interface PaymentService {
    PaymentResult processPayment(PaymentRequest request);
}

// Basic implementation
public class StripePaymentService implements PaymentService {
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        // Call Stripe API
        return stripeClient.charge(request);
    }
}

// Decorator 1: Retry with Exponential Backoff
public class RetryPaymentService implements PaymentService {
    private final PaymentService delegate;
    private final int maxRetries;
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < maxRetries) {
            try {
                return delegate.processPayment(request);
            } catch (TransientException e) {
                lastException = e;
                attempt++;
                
                if (attempt >= maxRetries) {
                    throw new PaymentException("Max retries exceeded", lastException);
                }
                
                long backoff = (long) Math.pow(2, attempt) * 1000;  // Exponential
                Thread.sleep(backoff);
            }
        }
        
        throw new PaymentException("Payment failed after retries", lastException);
    }
}

// Decorator 2: Circuit Breaker
public class CircuitBreakerPaymentService implements PaymentService {
    private final PaymentService delegate;
    private final CircuitBreaker circuitBreaker;
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        return circuitBreaker.executeSupplier(() -> delegate.processPayment(request));
    }
}

// Decorator 3: Timeout
public class TimeoutPaymentService implements PaymentService {
    private final PaymentService delegate;
    private final long timeoutMillis;
    private final ExecutorService executor;
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        Future<PaymentResult> future = executor.submit(() -> 
            delegate.processPayment(request)
        );
        
        try {
            return future.get(timeoutMillis, TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new PaymentException("Payment timeout", e);
        } catch (Exception e) {
            throw new PaymentException("Payment failed", e);
        }
    }
}

// Decorator 4: Fallback
public class FallbackPaymentService implements PaymentService {
    private final PaymentService primary;
    private final PaymentService fallback;
    
    @Override
    public PaymentResult processPayment(PaymentRequest request) {
        try {
            return primary.processPayment(request);
        } catch (Exception e) {
            logger.warn("Primary payment failed, using fallback", e);
            return fallback.processPayment(request);
        }
    }
}

// Build resilient payment service
PaymentService paymentService = new StripePaymentService();
paymentService = new TimeoutPaymentService(paymentService, 5000);  // 5s timeout
paymentService = new RetryPaymentService(paymentService, 3);  // 3 retries
paymentService = new CircuitBreakerPaymentService(paymentService, circuitBreaker);
paymentService = new FallbackPaymentService(paymentService, backupPaymentService);

// Use service: All resilience patterns automatically applied
PaymentResult result = paymentService.processPayment(request);
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### **Security Decorators**

```java
// Decorator 1: Encryption
public class EncryptedDataSource implements DataSource {
    private final DataSource delegate;
    private final Encryptor encryptor;
    
    @Override
    public void writeData(String data) {
        String encrypted = encryptor.encrypt(data);
        delegate.writeData(encrypted);
    }
    
    @Override
    public String readData() {
        String encrypted = delegate.readData();
        return encryptor.decrypt(encrypted);
    }
}

// Decorator 2: Access Control
public class SecuredDataSource implements DataSource {
    private final DataSource delegate;
    private final AccessControlService acl;
    
    @Override
    public void writeData(String data) {
        User user = SecurityContext.getCurrentUser();
        if (!acl.hasPermission(user, "WRITE")) {
            throw new AccessDeniedException("Write permission required");
        }
        delegate.writeData(data);
    }
    
    @Override
    public String readData() {
        User user = SecurityContext.getCurrentUser();
        if (!acl.hasPermission(user, "READ")) {
            throw new AccessDeniedException("Read permission required");
        }
        return delegate.readData();
    }
}

// Decorator 3: Data Masking
public class DataMaskingDecorator implements DataSource {
    private final DataSource delegate;
    private final DataMasker masker;
    
    @Override
    public void writeData(String data) {
        delegate.writeData(data);  // Write original
    }
    
    @Override
    public String readData() {
        String data = delegate.readData();
        User user = SecurityContext.getCurrentUser();
        
        if (!user.hasRole("ADMIN")) {
            return masker.maskSensitiveData(data);  // Mask for non-admins
        }
        
        return data;  // Full data for admins
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: Java I/O Streams**

**Background:**
Java's I/O library uses Decorator pattern extensively for streams.

**Implementation:**

```java
// Base component
abstract class InputStream {
    abstract int read() throws IOException;
}

// Concrete component
class FileInputStream extends InputStream {
    @Override
    public int read() throws IOException {
        // Read from file
    }
}

// Decorator
class FilterInputStream extends InputStream {
    protected InputStream in;  // Wrapped stream
    
    public FilterInputStream(InputStream in) {
        this.in = in;
    }
    
    @Override
    public int read() throws IOException {
        return in.read();  // Delegate
    }
}

// Concrete decorators
class BufferedInputStream extends FilterInputStream {
    private byte[] buffer;
    private int pos;
    
    @Override
    public int read() throws IOException {
        if (pos >= buffer.length) {
            fillBuffer();
        }
        return buffer[pos++];
    }
}

class DataInputStream extends FilterInputStream {
    public int readInt() throws IOException {
        // Read 4 bytes and convert to int
    }
}

// Usage: Stack decorators
InputStream stream = new FileInputStream("data.bin");
stream = new BufferedInputStream(stream);  // Add buffering
stream = new DataInputStream(stream);      // Add data conversion
```

**Results:**
- **Flexibility:** Mix and match I/O capabilities
- **Adoption:** Used in every Java application
- **Ecosystem:** Hundreds of custom stream decorators
- **Performance:** BufferedInputStream 10-100x faster than unbuffered

---

### **Case Study 2: Spring Framework**

**Background:**
Spring uses Decorator pattern for AOP (Aspect-Oriented Programming).

**Implementation:**

```java
// Target interface
public interface OrderService {
    void placeOrder(Order order);
}

// Real implementation
@Service
public class OrderServiceImpl implements OrderService {
    @Override
    public void placeOrder(Order order) {
        // Business logic
    }
}

// Spring creates decorator proxy at runtime
public class OrderServiceProxy implements OrderService {
    private final OrderService target;
    private final List<MethodInterceptor> interceptors;
    
    @Override
    public void placeOrder(Order order) {
        // Before advice: @Before, @Around
        transactionInterceptor.before();
        loggingInterceptor.before();
        
        try {
            // Invoke target
            target.placeOrder(order);
            
            // After advice: @AfterReturning
            transactionInterceptor.afterReturning();
        } catch (Exception e) {
            // After advice: @AfterThrowing
            transactionInterceptor.afterThrowing(e);
            throw e;
        } finally {
            // After advice: @After
            loggingInterceptor.after();
        }
    }
}

// Usage: Spring injects decorated proxy
@Autowired
private OrderService orderService;  // Actually OrderServiceProxy

orderService.placeOrder(order);  // Advice automatically applied
```

**Results:**
- **Separation of Concerns:** Cross-cutting concerns isolated
- **Declarative:** Annotations instead of boilerplate
- **Adoption:** 90%+ of Spring Boot applications use AOP
- **Performance:** Minimal overhead (< 1ms per call)

---

### **Case Study 3: OkHttp Interceptors**

**Background:**
OkHttp uses Decorator pattern for request/response interceptors.

**Implementation:**

```java
// Base interface
interface Interceptor {
    Response intercept(Chain chain) throws IOException;
}

// Concrete interceptors (decorators)
class LoggingInterceptor implements Interceptor {
    @Override
    public Response intercept(Chain chain) throws IOException {
        Request request = chain.request();
        
        logger.info("Request: {} {}", request.method(), request.url());
        long start = System.nanoTime();
        
        Response response = chain.proceed(request);  // Delegate
        
        long duration = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start);
        logger.info("Response: {} in {}ms", response.code(), duration);
        
        return response;
    }
}

class RetryInterceptor implements Interceptor {
    @Override
    public Response intercept(Chain chain) throws IOException {
        Request request = chain.request();
        int attempt = 0;
        
        while (true) {
            try {
                return chain.proceed(request);
            } catch (IOException e) {
                attempt++;
                if (attempt >= 3) throw e;
                Thread.sleep(1000 * attempt);
            }
        }
    }
}

class AuthenticationInterceptor implements Interceptor {
    @Override
    public Response intercept(Chain chain) throws IOException {
        Request original = chain.request();
        
        Request authenticated = original.newBuilder()
            .header("Authorization", "Bearer " + getToken())
            .build();
        
        return chain.proceed(authenticated);
    }
}

// Build client with interceptors (decorators)
OkHttpClient client = new OkHttpClient.Builder()
    .addInterceptor(new AuthenticationInterceptor())
    .addInterceptor(new RetryInterceptor())
    .addInterceptor(new LoggingInterceptor())
    .build();

// Usage: All interceptors automatically applied
Response response = client.newCall(request).execute();
```

**Results:**
- **Modularity:** Each interceptor is independent
- **Composability:** Stack multiple interceptors
- **Adoption:** 5 billion+ Android devices use OkHttp
- **Ecosystem:** Hundreds of third-party interceptors available

---

### **Case Study 4: Servlet Filters**

**Background:**
Java Servlets use Decorator pattern for request/response filtering.

**Implementation:**

```java
// Filter interface (decorator)
public interface Filter {
    void doFilter(ServletRequest request, 
                  ServletResponse response,
                  FilterChain chain) throws IOException, ServletException;
}

// Concrete filter 1: Authentication
public class AuthenticationFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        
        String token = httpRequest.getHeader("Authorization");
        if (token == null || !validateToken(token)) {
            ((HttpServletResponse) response).sendError(401);
            return;
        }
        
        chain.doFilter(request, response);  // Proceed to next filter
    }
}

// Concrete filter 2: Logging
public class LoggingFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        logger.info("Request: {}", request.getRemoteAddr());
        
        chain.doFilter(request, response);
        
        logger.info("Response: {}", ((HttpServletResponse) response).getStatus());
    }
}

// Configuration (web.xml or Spring)
@Configuration
public class FilterConfig {
    @Bean
    public FilterRegistrationBean<AuthenticationFilter> authFilter() {
        FilterRegistrationBean<AuthenticationFilter> registration = 
            new FilterRegistrationBean<>();
        registration.setFilter(new AuthenticationFilter());
        registration.setOrder(1);
        return registration;
    }
    
    @Bean
    public FilterRegistrationBean<LoggingFilter> loggingFilter() {
        FilterRegistrationBean<LoggingFilter> registration = 
            new FilterRegistrationBean<>();
        registration.setFilter(new LoggingFilter());
        registration.setOrder(2);
        return registration;
    }
}

// Execution: Filters form decorator chain
// Request → AuthFilter → LoggingFilter → Servlet → LoggingFilter → AuthFilter → Response
```

**Results:**
- **Standardization:** Industry standard for 20+ years
- **Flexibility:** Add/remove filters without changing servlets
- **Adoption:** Every Java web application uses filters
- **Performance:** Minimal overhead (< 0.1ms per filter)

---

### **Case Study 5: Netflix Zuul (API Gateway)**

**Background:**
Netflix Zuul uses Decorator pattern for request filtering in API gateway.

**Implementation:**

```java
// Base filter
public abstract class ZuulFilter {
    public abstract String filterType();  // "pre", "route", "post", "error"
    public abstract int filterOrder();
    public abstract boolean shouldFilter();
    public abstract Object run();
}

// Pre-filter: Authentication
public class AuthenticationFilter extends ZuulFilter {
    @Override
    public String filterType() { return "pre"; }
    
    @Override
    public int filterOrder() { return 1; }
    
    @Override
    public boolean shouldFilter() { return true; }
    
    @Override
    public Object run() {
        RequestContext ctx = RequestContext.getCurrentContext();
        HttpServletRequest request = ctx.getRequest();
        
        String token = request.getHeader("Authorization");
        if (token == null || !authService.validate(token)) {
            ctx.setResponseStatusCode(401);
            ctx.setSendZuulResponse(false);
        }
        
        return null;
    }
}

// Pre-filter: Rate Limiting
public class RateLimitFilter extends ZuulFilter {
    @Override
    public String filterType() { return "pre"; }
    
    @Override
    public int filterOrder() { return 2; }
    
    @Override
    public Object run() {
        RequestContext ctx = RequestContext.getCurrentContext();
        String clientId = ctx.getRequest().getHeader("X-Client-Id");
        
        if (!rateLimiter.allowRequest(clientId)) {
            ctx.setResponseStatusCode(429);
            ctx.setSendZuulResponse(false);
        }
        
        return null;
    }
}

// Post-filter: Add response headers
public class ResponseHeaderFilter extends ZuulFilter {
    @Override
    public String filterType() { return "post"; }
    
    @Override
    public int filterOrder() { return 1; }
    
    @Override
    public Object run() {
        RequestContext ctx = RequestContext.getCurrentContext();
        ctx.getResponse().addHeader("X-Gateway", "Zuul");
        ctx.getResponse().addHeader("X-Request-Id", ctx.getRequestId());
        return null;
    }
}

// Zuul executes filters in order
// Pre-filters → Route filter → Service → Post-filters → Response
```

**Results:**
- **Scale:** Handles 100,000+ requests/second at Netflix
- **Flexibility:** Add/remove filters without downtime
- **Resilience:** Error filters handle failures gracefully
- **Evolution:** Easy to add new features (logging, metrics, caching)

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "Decorator Pattern is a structural pattern that lets you attach additional responsibilities to an object dynamically. It provides a flexible alternative to subclassing for extending functionality.
>
> **The problem it solves is combinatorial explosion.** Imagine a coffee shop with 5 toppings: milk, sugar, whip, caramel, vanilla. With inheritance, you'd need 2^5 = 32 classes for every combination. With Decorator, you wrap the coffee object in decorator objects at runtime.
>
> **Here's how it works:**
> ```java
> // Base component
> interface Coffee {
>     double getCost();
> }
>
> class SimpleCoffee implements Coffee {
>     public double getCost() { return 2.0; }
> }
>
> // Decorator
> class MilkDecorator implements Coffee {
>     private Coffee coffee;
>     
>     public MilkDecorator(Coffee coffee) {
>         this.coffee = coffee;
>     }
>     
>     public double getCost() {
>         return coffee.getCost() + 0.5;  // Add milk cost
>     }
> }
>
> // Compose at runtime
> Coffee coffee = new SimpleCoffee();           // $2.00
> coffee = new MilkDecorator(coffee);           // $2.50
> coffee = new SugarDecorator(coffee);          // $2.70
> ```
>
> **Key differences from related patterns:**
>
> - **Decorator vs Adapter:** Decorator adds behavior with the same interface. Adapter changes the interface to make it compatible.
> - **Decorator vs Proxy:** Both have same interface, but Proxy controls access (lazy loading, security), while Decorator enhances behavior.
>
> **Real-world usage:**
>
> **Java I/O Streams:**
> ```java
> InputStream stream = new FileInputStream("data.bin");
> stream = new BufferedInputStream(stream);      // Add buffering
> stream = new GZIPInputStream(stream);          // Add decompression
> stream = new DataInputStream(stream);          // Add type conversion
> ```
>
> **HTTP Client with cross-cutting concerns:**
> ```java
> HttpClient client = new BasicHttpClient();
> client = new AuthenticationDecorator(client);  // Add auth
> client = new RetryDecorator(client);           // Add retry
> client = new LoggingDecorator(client);         // Add logging
> ```
>
> **Benefits:**
> 1. **Open-Closed Principle:** Extend behavior without modifying existing code
> 2. **Single Responsibility:** Each decorator has one job
> 3. **Runtime Composition:** Add/remove behaviors dynamically
> 4. **Flexible:** Mix and match decorators in any combination
>
> **Trade-offs:**
> - More objects (each decorator wraps another)
> - Order matters (logging before retry vs after retry)
> - Debugging harder (stack of wrappers)
>
> **In production, I've used decorators for:**
> - HTTP clients with logging, metrics, retry, circuit breaker
> - Repository decorators for caching and audit logging
> - Data source decorators for encryption and compression
>
> The pattern is essential when you have cross-cutting concerns that need to be composed flexibly at runtime."

---

### **Common Follow-Up Questions**

#### **Q1: When would you choose Decorator over inheritance?**

> "Great question—this is about understanding when composition is better than inheritance.
>
> **Use Decorator (Composition) When:**
>
> **1. Need Runtime Flexibility**
> ```java
> // With Decorator: Compose at runtime
> DataSource dataSource = new FileDataSource("data.txt");
>
> if (config.isEncryptionEnabled()) {
>     dataSource = new EncryptionDecorator(dataSource);
> }
>
> if (config.isCompressionEnabled()) {
>     dataSource = new CompressionDecorator(dataSource);
> }
>
> // ✓ Behavior determined at runtime based on config
> ```
>
> **2. Multiple Optional Features**
> ```java
> // With inheritance: Need class for every combination
> class DataSource { }
> class EncryptedDataSource extends DataSource { }
> class CompressedDataSource extends DataSource { }
> class EncryptedCompressedDataSource extends DataSource { }
> class EncryptedCompressedCachedDataSource extends DataSource { }
> // 2^n classes for n features! 💥
>
> // With Decorator: Compose features
> DataSource ds = new FileDataSource("data.txt");
> ds = new EncryptionDecorator(ds);
> ds = new CompressionDecorator(ds);
> ds = new CachingDecorator(ds);
> // ✓ 3 decorator classes for any combination
> ```
>
> **3. Different Combinations for Different Instances**
> ```java
> // User 1: Full features
> DataSource user1 = new CachingDecorator(
>     new EncryptionDecorator(
>         new FileDataSource("user1.txt")
>     )
> );
>
> // User 2: Minimal features
> DataSource user2 = new FileDataSource("user2.txt");
>
> // ✓ Same interface, different behavior per instance
> ```
>
> **4. Cross-Cutting Concerns**
> ```java
> // Logging, caching, metrics, retry, circuit breaker
> // These concerns are independent and composable
>
> HttpClient client = new BasicHttpClient();
> client = new LoggingDecorator(client);    // Add logging
> client = new MetricsDecorator(client);    // Add metrics
> client = new RetryDecorator(client);      // Add retry
>
> // ✓ Each concern is separate decorator
> ```
>
> ---
>
> **Use Inheritance When:**
>
> **1. Behavior is Fixed**
> ```java
> // Shape hierarchy: behavior is fixed, not runtime-configurable
> abstract class Shape {
>     abstract double area();
> }
>
> class Circle extends Shape {
>     double area() { return Math.PI * radius * radius; }
> }
>
> class Rectangle extends Shape {
>     double area() { return width * height; }
> }
>
> // ✓ Inheritance is appropriate (IS-A relationship)
> ```
>
> **2. Single Feature, Not Combinable**
> ```java
> // Payment types: not combinable
> abstract class Payment {
>     abstract void process();
> }
>
> class CreditCardPayment extends Payment { }
> class PayPalPayment extends Payment { }
>
> // ✓ Can't have CreditCard+PayPal payment
> ```
>
> **3. Template Method Pattern**
> ```java
> abstract class DataProcessor {
>     public final void process() {
>         load();
>         validate();
>         transform();
>         save();
>     }
>     
>     protected abstract void transform();  // Subclass implements
> }
>
> class CSVProcessor extends DataProcessor {
>     protected void transform() { /* CSV-specific */ }
> }
>
> // ✓ Inheritance provides template
> ```
>
> ---
>
> **Decision Framework:**
>
> ```
> Do you need runtime configuration?
>   │
>   ├─ YES ──> Use Decorator
>   │
>   └─ NO ──> Do you have multiple optional features?
>              │
>              ├─ YES ──> Use Decorator (avoid class explosion)
>              │
>              └─ NO ──> Is behavior combinable?
>                        │
>                        ├─ YES ──> Use Decorator
>                        │
>                        └─ NO ──> Use Inheritance (simple IS-A)
> ```
>
> **Real Example:**
>
> At my company, we had HTTP clients for external APIs. Initially, we used inheritance:
>
> ```java
> class BasicHttpClient { }
> class LoggingHttpClient extends BasicHttpClient { }
> class RetryHttpClient extends BasicHttpClient { }
> class LoggingRetryHttpClient extends BasicHttpClient { }
> // Class explosion!
> ```
>
> We refactored to Decorator:
>
> ```java
> HttpClient client = new BasicHttpClient();
> client = new LoggingDecorator(client);
> client = new RetryDecorator(client);
> // Any combination, runtime-configurable
> ```
>
> **Benefits:**
> - Reduced classes from 8 to 3
> - Feature flags control decorators (A/B testing)
> - Easy to add new decorators (metrics, circuit breaker)
> - Different configs per environment (dev: logging on, prod: logging off)
>
> **Key Principle:** Favor composition over inheritance when you need flexibility."

---

#### **Q2: How do you handle decorator ordering issues?**

> "Excellent question—decorator order can significantly affect behavior, and it's a common source of bugs. Here's how I handle it:
>
> **Problem: Order Matters**
>
> ```java
> // Order 1: Encrypt then Compress
> DataSource ds1 = new FileDataSource("data.txt");
> ds1 = new EncryptionDecorator(ds1);      // Encrypt
> ds1 = new CompressionDecorator(ds1);     // Compress encrypted data
>
> // Order 2: Compress then Encrypt
> DataSource ds2 = new FileDataSource("data.txt");
> ds2 = new CompressionDecorator(ds2);     // Compress
> ds2 = new EncryptionDecorator(ds2);      // Encrypt compressed data
>
> // Different results!
> // Compressed data has patterns → encrypts better (smaller size)
> ```
>
> ---
>
> **Solution 1: Builder Pattern with Explicit Ordering**
>
> ```java
> public class DataSourceBuilder {
>     private DataSource dataSource;
>     
>     public DataSourceBuilder(String filename) {
>         this.dataSource = new FileDataSource(filename);
>     }
>     
>     public DataSourceBuilder withCompression() {
>         this.dataSource = new CompressionDecorator(dataSource);
>         return this;
>     }
>     
>     public DataSourceBuilder withEncryption() {
>         this.dataSource = new EncryptionDecorator(dataSource);
>         return this;
>     }
>     
>     public DataSourceBuilder withCaching() {
>         this.dataSource = new CachingDecorator(dataSource);
>         return this;
>     }
>     
>     public DataSource build() {
>         return dataSource;
>     }
> }
>
> // Usage: Order is explicit in code
> DataSource ds = new DataSourceBuilder("data.txt")
>     .withCompression()   // First
>     .withEncryption()    // Second
>     .withCaching()       // Third
>     .build();
>
> // ✓ Clear order, readable
> ```
>
> ---
>
> **Solution 2: Priority-Based Decorators**
>
> ```java
> public abstract class PrioritizedDecorator implements HttpClient {
>     protected final HttpClient delegate;
>     private final int priority;
>     
>     protected PrioritizedDecorator(HttpClient delegate, int priority) {
>         this.delegate = delegate;
>         this.priority = priority;
>     }
>     
>     public int getPriority() {
>         return priority;
>     }
> }
>
> public class DecoratorChainBuilder {
>     private List<Function<HttpClient, PrioritizedDecorator>> decorators = new ArrayList<>();
>     
>     public DecoratorChainBuilder add(Function<HttpClient, PrioritizedDecorator> decorator) {
>         decorators.add(decorator);
>         return this;
>     }
>     
>     public HttpClient build(HttpClient base) {
>         // Sort decorators by priority
>         decorators.sort(Comparator.comparing(d -> 
>             d.apply(base).getPriority()
>         ));
>         
>         HttpClient result = base;
>         for (Function<HttpClient, PrioritizedDecorator> decorator : decorators) {
>             result = decorator.apply(result);
>         }
>         return result;
>     }
> }
>
> // Usage
> HttpClient client = new DecoratorChainBuilder()
>     .add(c -> new AuthenticationDecorator(c, 10))  // Priority 10 (first)
>     .add(c -> new RetryDecorator(c, 50))           // Priority 50
>     .add(c -> new LoggingDecorator(c, 100))        // Priority 100 (last)
>     .build(new BasicHttpClient());
>
> // ✓ Automatic ordering by priority
> ```
>
> ---
>
> **Solution 3: Named Phases**
>
> ```java
> public enum Phase {
>     AUTHENTICATION(1),
>     RATE_LIMITING(2),
>     CACHING(3),
>     RETRY(4),
>     CIRCUIT_BREAKER(5),
>     LOGGING(6);
>     
>     private final int order;
>     
>     Phase(int order) {
>         this.order = order;
>     }
> }
>
> public abstract class PhasedDecorator implements HttpClient {
>     protected abstract Phase getPhase();
> }
>
> public class AuthenticationDecorator extends PhasedDecorator {
>     @Override
>     protected Phase getPhase() {
>         return Phase.AUTHENTICATION;  // Explicit phase
>     }
> }
>
> // Builder automatically orders by phase
> HttpClient client = new HttpClientBuilder()
>     .withAuthentication()
>     .withRetry()
>     .withLogging()
>     .build();  // Sorted by phase automatically
> ```
>
> ---
>
> **Solution 4: Documentation + Convention**
>
> ```java
> /**
>  * Recommended decorator order:
>  * 
>  * 1. Logging (outermost - logs everything)
>  * 2. Metrics (measure everything including retries)
>  * 3. Circuit Breaker (fail fast before retry)
>  * 4. Retry (retry failed requests)
>  * 5. Authentication (add auth header)
>  * 6. Basic HTTP Client (innermost - actual HTTP call)
>  * 
>  * Example:
>  * <pre>
>  * HttpClient client = new BasicHttpClient();
>  * client = new AuthenticationDecorator(client);
>  * client = new RetryDecorator(client);
>  * client = new CircuitBreakerDecorator(client);
>  * client = new MetricsDecorator(client);
>  * client = new LoggingDecorator(client);
>  * </pre>
>  */
> public class HttpClientFactory {
>     public static HttpClient createDefault() {
>         // Enforce correct order
>         HttpClient client = new BasicHttpClient();
>         client = new AuthenticationDecorator(client);
>         client = new RetryDecorator(client);
>         client = new CircuitBreakerDecorator(client);
>         client = new MetricsDecorator(client);
>         client = new LoggingDecorator(client);
>         return client;
>     }
> }
> ```
>
> ---
>
> **Solution 5: Testing**
>
> ```java
> @Test
> public void testDecoratorOrder() {
>     // Verify decorators are applied in correct order
>     List<String> executionOrder = new ArrayList<>();
>     
>     HttpClient client = new BasicHttpClient();
>     client = new OrderTrackingDecorator(client, "Auth", executionOrder);
>     client = new OrderTrackingDecorator(client, "Retry", executionOrder);
>     client = new OrderTrackingDecorator(client, "Logging", executionOrder);
>     
>     client.execute(request);
>     
>     // Verify order
>     assertEquals(Arrays.asList("Logging", "Retry", "Auth"), executionOrder);
> }
> ```
>
> ---
>
> **Real-World Example:**
>
> We had a bug where caching decorator was inside retry decorator:
>
> ```java
> // Bug: Cache inside retry
> HttpClient client = new BasicHttpClient();
> client = new CachingDecorator(client);     // Cache
> client = new RetryDecorator(client, 3);    // Retry
>
> // Problem: Cache misses are retried 3 times (expensive!)
> ```
>
> Fix: Move cache outside retry:
>
> ```java
> // Fix: Cache outside retry
> HttpClient client = new BasicHttpClient();
> client = new RetryDecorator(client, 3);    // Retry
> client = new CachingDecorator(client);     // Cache
>
> // ✓ Cache hits don't trigger retries
> ```
>
> **Best Practices:**
>
> 1. **Document expected order** in comments/javadoc
> 2. **Use factory methods** to enforce correct order
> 3. **Use builder pattern** for explicit ordering
> 4. **Test decorator order** with unit tests
> 5. **Consider priority-based** automatic ordering
> 6. **Think about flow:** What should happen first/last?
>
> **Common Order Rules:**
>
> - **Logging:** Outermost (log everything including errors)
> - **Metrics:** After logging, before business logic
> - **Circuit Breaker:** Before retry (fail fast)
> - **Retry:** After circuit breaker, before auth
> - **Authentication:** Before actual request
> - **Caching:** Usually outermost (cache final result)
>
> The key is being intentional about order and making it explicit in code."

---

#### **Q3: How do you test decorators effectively?**

> "Testing decorators requires a multi-layered approach because decorators interact with other components. Here's my comprehensive strategy:
>
> **Layer 1: Unit Tests (Isolate Each Decorator)**
>
> ```java
> @Test
> public void testLoggingDecorator() {
>     // Mock the delegate
>     HttpClient mockDelegate = mock(HttpClient.class);
>     when(mockDelegate.execute(any())).thenReturn(new Response(200, "OK"));
>     
>     // Mock logger to verify logging
>     Logger mockLogger = mock(Logger.class);
>     
>     // Test decorator
>     HttpClient decorator = new LoggingDecorator(mockDelegate, mockLogger);
>     Request request = new Request("GET", "https://api.example.com");
>     
>     Response response = decorator.execute(request);
>     
>     // Verify delegate was called
>     verify(mockDelegate).execute(request);
>     
>     // Verify logging happened
>     verify(mockLogger).info(contains("Request: GET"));
>     verify(mockLogger).info(contains("Response: 200"));
>     
>     // Verify response passed through
>     assertEquals(200, response.status());
> }
>
> @Test
> public void testRetryDecorator_Success() {
>     HttpClient mockDelegate = mock(HttpClient.class);
>     when(mockDelegate.execute(any())).thenReturn(new Response(200, "OK"));
>     
>     HttpClient decorator = new RetryDecorator(mockDelegate, 3);
>     
>     Response response = decorator.execute(request);
>     
>     // Verify called only once (no retry needed)
>     verify(mockDelegate, times(1)).execute(any());
>     assertEquals(200, response.status());
> }
>
> @Test
> public void testRetryDecorator_Failure_ThenSuccess() {
>     HttpClient mockDelegate = mock(HttpClient.class);
>     when(mockDelegate.execute(any()))
>         .thenThrow(new TransientException("Network error"))
>         .thenThrow(new TransientException("Network error"))
>         .thenReturn(new Response(200, "OK"));  // Success on 3rd attempt
>     
>     HttpClient decorator = new RetryDecorator(mockDelegate, 3);
>     
>     Response response = decorator.execute(request);
>     
>     // Verify retried 3 times
>     verify(mockDelegate, times(3)).execute(any());
>     assertEquals(200, response.status());
> }
>
> @Test
> public void testRetryDecorator_ExhaustedRetries() {
>     HttpClient mockDelegate = mock(HttpClient.class);
>     when(mockDelegate.execute(any()))
>         .thenThrow(new TransientException("Network error"));
>     
>     HttpClient decorator = new RetryDecorator(mockDelegate, 3);
>     
>     assertThrows(RetryExhaustedException.class, () -> {
>         decorator.execute(request);
>     });
>     
>     // Verify retried max times
>     verify(mockDelegate, times(3)).execute(any());
> }
> ```
>
> ---
>
> **Layer 2: Integration Tests (Test Decorator Chains)**
>
> ```java
> @Test
> public void testDecoratorChain() {
>     // Real HTTP client (test server)
>     HttpClient baseClient = new BasicHttpClient(testServer.getUrl());
>     
>     // Build decorator chain
>     HttpClient client = baseClient;
>     client = new AuthenticationDecorator(client, tokenProvider);
>     client = new RetryDecorator(client, 3);
>     client = new LoggingDecorator(client, logger);
>     
>     // Execute request
>     Response response = client.execute(request);
>     
>     // Verify full chain worked
>     assertEquals(200, response.status());
>     
>     // Verify authentication header was added
>     String authHeader = testServer.getLastRequestHeader("Authorization");
>     assertNotNull(authHeader);
>     assertTrue(authHeader.startsWith("Bearer "));
> }
>
> @Test
> public void testDecoratorChain_WithFailure() {
>     // Test server that fails first 2 requests
>     testServer.setFailureCount(2);
>     
>     HttpClient baseClient = new BasicHttpClient(testServer.getUrl());
>     HttpClient client = new RetryDecorator(baseClient, 3);
>     
>     Response response = client.execute(request);
>     
>     // Verify retry worked
>     assertEquals(200, response.status());
>     assertEquals(3, testServer.getRequestCount());  // 2 failures + 1 success
> }
> ```
>
> ---
>
> **Layer 3: Behavioral Tests (Verify Decorator Behavior)**
>
> ```java
> @Test
> public void testCachingDecorator_CacheHit() {
>     HttpClient mockDelegate = mock(HttpClient.class);
>     when(mockDelegate.execute(any())).thenReturn(new Response(200, "Data"));
>     
>     Cache<String, Response> cache = Caffeine.newBuilder().build();
>     HttpClient decorator = new CachingDecorator(mockDelegate, cache);
>     
>     // First request (cache miss)
>     Response response1 = decorator.execute(request);
>     
>     // Second request (cache hit)
>     Response response2 = decorator.execute(request);
>     
>     // Verify delegate called only once
>     verify(mockDelegate, times(1)).execute(any());
>     
>     // Verify both responses are identical
>     assertEquals(response1.body(), response2.body());
>     
>     // Verify cache size
>     assertEquals(1, cache.estimatedSize());
> }
>
> @Test
> public void testCachingDecorator_CacheInvalidation() {
>     HttpClient mockDelegate = mock(HttpClient.class);
>     when(mockDelegate.execute(any())).thenReturn(new Response(200, "Data"));
>     
>     Cache<String, Response> cache = Caffeine.newBuilder().build();
>     CachingDecorator decorator = new CachingDecorator(mockDelegate, cache);
>     
>     // First request (cache miss)
>     decorator.execute(request);
>     
>     // Invalidate cache
>     decorator.clearCache();
>     
>     // Second request (cache miss again)
>     decorator.execute(request);
>     
>     // Verify delegate called twice (cache was cleared)
>     verify(mockDelegate, times(2)).execute(any());
> }
> ```
>
> ---
>
> **Layer 4: Contract Tests (Ensure Decorator Follows Interface)**
>
> ```java
> @ParameterizedTest
> @MethodSource("httpClientDecorators")
> public void testHttpClientContract(HttpClient client) {
>     // Contract: All implementations must handle null request
>     assertThrows(NullPointerException.class, () -> {
>         client.execute(null);
>     });
>     
>     // Contract: All implementations must return non-null response
>     Response response = client.execute(validRequest);
>     assertNotNull(response);
>     
>     // Contract: All implementations must preserve response
>     assertEquals(200, response.status());
> }
>
> static Stream<HttpClient> httpClientDecorators() {
>     HttpClient base = mock(HttpClient.class);
>     when(base.execute(any())).thenReturn(new Response(200, "OK"));
>     
>     return Stream.of(
>         base,
>         new LoggingDecorator(base, logger),
>         new RetryDecorator(base, 3),
>         new CachingDecorator(base, cache),
>         new AuthenticationDecorator(base, tokenProvider)
>     );
> }
> ```
>
> ---
>
> **Layer 5: Performance Tests**
>
> ```java
> @Test
> public void testDecoratorPerformance() {
>     HttpClient mockDelegate = mock(HttpClient.class);
>     when(mockDelegate.execute(any())).thenReturn(new Response(200, "OK"));
>     
>     // Build decorator chain
>     HttpClient client = mockDelegate;
>     client = new LoggingDecorator(client, logger);
>     client = new MetricsDecorator(client, meterRegistry);
>     client = new RetryDecorator(client, 3);
>     
>     // Measure performance
>     long start = System.currentTimeMillis();
>     
>     for (int i = 0; i < 10000; i++) {
>         client.execute(request);
>     }
>     
>     long duration = System.currentTimeMillis() - start;
>     
>     // Verify decorator overhead is acceptable (< 10% overhead)
>     assertTrue(duration < 1000, "10,000 requests should complete in < 1 second");
> }
> ```
>
> ---
>
> **Layer 6: Spy Pattern (Verify Decorator Applied)**
>
> ```java
> public class SpyDecorator implements HttpClient {
>     private final HttpClient delegate;
>     private int callCount = 0;
>     
>     public SpyDecorator(HttpClient delegate) {
>         this.delegate = delegate;
>     }
>     
>     @Override
>     public Response execute(Request request) {
>         callCount++;
>         return delegate.execute(request);
>     }
>     
>     public int getCallCount() {
>         return callCount;
>     }
> }
>
> @Test
> public void testDecoratorApplicationOrder() {
>     SpyDecorator spy1 = new SpyDecorator(mockClient);
>     SpyDecorator spy2 = new SpyDecorator(spy1);
>     SpyDecorator spy3 = new SpyDecorator(spy2);
>     
>     spy3.execute(request);
>     
>     // Verify all decorators were called
>     assertEquals(1, spy1.getCallCount());
>     assertEquals(1, spy2.getCallCount());
>     assertEquals(1, spy3.getCallCount());
> }
> ```
>
> ---
>
> **Best Practices:**
>
> 1. **Test decorators in isolation** (mock delegate)
> 2. **Test decorator chains** (integration tests)
> 3. **Use spy pattern** to verify decorator application
> 4. **Test all error paths** (failures, retries, timeouts)
> 5. **Test decorator order** (order-sensitive behavior)
> 6. **Performance tests** (ensure acceptable overhead)
> 7. **Contract tests** (all decorators follow interface)
>
> **Real Example:**
>
> We had a bug where caching decorator wasn't invalidating cache on write operations:
>
> ```java
> @Test
> public void testCacheInvalidationOnWrite() {
>     Repository mockRepo = mock(Repository.class);
>     when(mockRepo.findById(1L)).thenReturn(user1);
>     
>     Cache<Long, User> cache = Caffeine.newBuilder().build();
>     Repository decorator = new CachedRepository(mockRepo, cache);
>     
>     // Read (populate cache)
>     decorator.findById(1L);
>     
>     // Update
>     decorator.save(updatedUser1);
>     
>     // Read again
>     decorator.findById(1L);
>     
>     // Verify cache was invalidated (called twice, not once)
>     verify(mockRepo, times(2)).findById(1L);  // This test caught the bug!
> }
> ```
>
> This test caught the bug and forced us to add cache invalidation on write operations."

---

#### **Q4: What are common mistakes with Decorator Pattern?**

> "I've seen (and made) several mistakes with Decorator Pattern. Here are the most common pitfalls:
>
> **Mistake 1: Not Delegating All Methods**
>
> ```java
> // BAD: Forgot to delegate some methods
> public class LoggingDecorator implements HttpClient {
>     private HttpClient delegate;
>     
>     @Override
>     public Response execute(Request request) {
>         logger.info("Executing request");
>         return delegate.execute(request);  // ✓ Delegated
>     }
>     
>     @Override
>     public void close() {
>         // ❌ Forgot to delegate close()
>         logger.info("Closing client");
>         // Missing: delegate.close();
>     }
> }
>
> // GOOD: Delegate all methods
> public class LoggingDecorator implements HttpClient {
>     @Override
>     public void close() {
>         logger.info("Closing client");
>         delegate.close();  // ✓ Delegated
>     }
> }
> ```
>
> ---
>
> **Mistake 2: Breaking LSP (Liskov Substitution Principle)**
>
> ```java
> // BAD: Decorator changes behavior unexpectedly
> public class CachingDecorator implements DataSource {
>     private DataSource delegate;
>     private Cache<String, String> cache;
>     
>     @Override
>     public String readData() {
>         // ❌ Always returns cached data (never fresh)
>         return cache.get("key", k -> delegate.readData());
>     }
> }
>
> // Problem: Clients expect fresh data, but get stale cached data
>
> // GOOD: Make caching behavior explicit
> public class CachingDecorator implements DataSource {
>     private long ttlMillis;
>     
>     @Override
>     public String readData() {
>         CacheEntry entry = cache.get("key");
>         
>         if (entry != null && !entry.isExpired(ttlMillis)) {
>             return entry.data;  // Fresh enough
>         }
>         
>         String data = delegate.readData();  // Fetch fresh
>         cache.put("key", new CacheEntry(data));
>         return data;
>     }
> }
> ```
>
> ---
>
> **Mistake 3: Stateful Decorators with Thread-Safety Issues**
>
> ```java
> // BAD: Not thread-safe
> public class CountingDecorator implements HttpClient {
>     private int requestCount = 0;  // ❌ Mutable state
>     
>     @Override
>     public Response execute(Request request) {
>         requestCount++;  // ❌ Race condition!
>         return delegate.execute(request);
>     }
> }
>
> // GOOD: Thread-safe
> public class CountingDecorator implements HttpClient {
>     private final AtomicInteger requestCount = new AtomicInteger(0);
>     
>     @Override
>     public Response execute(Request request) {
>         requestCount.incrementAndGet();  // ✓ Thread-safe
>         return delegate.execute(request);
>     }
> }
> ```
>
> ---
>
> **Mistake 4: Deep Decorator Chains (Debugging Nightmare)**
>
> ```java
> // BAD: Too many decorators
> HttpClient client = new BasicHttpClient();
> client = new LoggingDecorator(client);
> client = new MetricsDecorator(client);
> client = new RetryDecorator(client);
> client = new CircuitBreakerDecorator(client);
> client = new TimeoutDecorator(client);
> client = new AuthenticationDecorator(client);
> client = new CachingDecorator(client);
> client = new CompressionDecorator(client);
> client = new EncryptionDecorator(client);
> // ❌ 9 layers deep! Hard to debug
>
> // When exception occurs:
> // EncryptionDecorator → CompressionDecorator → CachingDecorator → ...
> // Stack trace is huge!
>
> // GOOD: Group related decorators
> public class ResilientHttpClient implements HttpClient {
>     private final HttpClient delegate;
>     
>     public ResilientHttpClient(HttpClient delegate) {
>         // Combine retry + circuit breaker + timeout internally
>         this.delegate = new TimeoutDecorator(
>             new CircuitBreakerDecorator(
>                 new RetryDecorator(delegate, 3)
>             )
>         );
>     }
>     
>     @Override
>     public Response execute(Request request) {
>         return delegate.execute(request);
>     }
> }
>
> // Now: client → Resilient → Basic (2 layers)
> ```
>
> ---
>
> **Mistake 5: Not Handling Null Delegates**
>
> ```java
> // BAD: NPE waiting to happen
> public class LoggingDecorator implements HttpClient {
>     private HttpClient delegate;  // ❌ Can be null
>     
>     public LoggingDecorator(HttpClient delegate) {
>         this.delegate = delegate;  // No null check
>     }
>     
>     @Override
>     public Response execute(Request request) {
>         return delegate.execute(request);  // ❌ NPE if delegate is null
>     }
> }
>
> // GOOD: Validate constructor parameters
> public class LoggingDecorator implements HttpClient {
>     private final HttpClient delegate;
>     
>     public LoggingDecorator(HttpClient delegate) {
>         this.delegate = Objects.requireNonNull(delegate, "delegate cannot be null");
>     }
> }
> ```
>
> ---
>
> **Mistake 6: Decorating When Not Needed**
>
> ```java
> // BAD: Over-engineering
> interface StringManipulator {
>     String manipulate(String input);
> }
>
> class UpperCaseDecorator implements StringManipulator {
>     private StringManipulator delegate;
>     
>     public String manipulate(String input) {
>         return delegate.manipulate(input).toUpperCase();
>     }
> }
>
> // ❌ Overkill for simple string operations
>
> // GOOD: Just use simple methods
> public class StringUtils {
>     public static String toUpperCase(String input) {
>         return input.toUpperCase();
>     }
> }
> ```
>
> ---
>
> **Mistake 7: Not Preserving Exceptions**
>
> ```java
> // BAD: Swallows exceptions
> public class RetryDecorator implements HttpClient {
>     @Override
>     public Response execute(Request request) {
>         try {
>             return delegate.execute(request);
>         } catch (Exception e) {
>             // ❌ Retry, but lose original exception
>             return delegate.execute(request);
>         }
>     }
> }
>
> // GOOD: Preserve exception chain
> public class RetryDecorator implements HttpClient {
>     @Override
>     public Response execute(Request request) {
>         Exception firstException = null;
>         
>         for (int i = 0; i < maxRetries; i++) {
>             try {
>                 return delegate.execute(request);
>             } catch (Exception e) {
>                 if (firstException == null) {
>                     firstException = e;
>                 } else {
>                     firstException.addSuppressed(e);  // ✓ Preserve all exceptions
>                 }
>             }
>         }
>         
>         throw new RetryExhaustedException("Max retries exceeded", firstException);
>     }
> }
> ```
>
> ---
>
> **Mistake 8: Order-Dependent Decorators Without Documentation**
>
> ```java
> // BAD: No documentation about order
> HttpClient client = new BasicHttpClient();
> client = new CachingDecorator(client);
> client = new RetryDecorator(client);
> // ❌ Order matters, but not documented
>
> // GOOD: Document expected order
> /**
>  * HTTP client with caching and retry.
>  * 
>  * Decorator order:
>  * 1. Retry (outer) - retries cache misses
>  * 2. Cache (inner) - caches successful responses
>  * 
>  * This order ensures cache misses are retried, but cache hits are not.
>  */
> public HttpClient createHttpClient() {
>     HttpClient client = new BasicHttpClient();
>     client = new CachingDecorator(client);  // Cache
>     client = new RetryDecorator(client);    // Retry cache misses
>     return client;
> }
> ```
>
> ---
>
> **Mistake 9: Not Implementing equals/hashCode**
>
> ```java
> // Problem: Decorators break object equality
> HttpClient client1 = new LoggingDecorator(new BasicHttpClient());
> HttpClient client2 = new LoggingDecorator(new BasicHttpClient());
>
> // client1.equals(client2) → false (different objects)
> // But they're functionally equivalent!
>
> // Solution: Implement equals/hashCode if needed
> // Or: Use factories to ensure singleton instances
> ```
>
> ---
>
> **Mistake 10: Memory Leaks with Stateful Decorators**
>
> ```java
> // BAD: Decorator holds references indefinitely
> public class CachingDecorator implements DataSource {
>     private Map<String, byte[]> cache = new HashMap<>();  // ❌ Never cleaned
>     
>     @Override
>     public byte[] readData(String key) {
>         return cache.computeIfAbsent(key, k -> delegate.readData(k));
>         // ❌ Cache grows indefinitely (memory leak)
>     }
> }
>
> // GOOD: Use bounded cache with eviction
> public class CachingDecorator implements DataSource {
>     private Cache<String, byte[]> cache = Caffeine.newBuilder()
>         .maximumSize(10000)  // Bounded
>         .expireAfterWrite(Duration.ofMinutes(10))  // TTL
>         .build();
>     
>     @Override
>     public byte[] readData(String key) {
>         return cache.get(key, k -> delegate.readData(k));
>         // ✓ Cache is bounded and evicts old entries
>     }
> }
> ```
>
> ---
>
> **Key Takeaways:**
>
> 1. **Delegate all methods** (not just the main one)
> 2. **Preserve LSP** (decorator shouldn't break expectations)
> 3. **Thread-safety** for stateful decorators
> 4. **Limit decorator depth** (group related decorators)
> 5. **Validate constructor** parameters (no nulls)
> 6. **Don't over-decorate** simple operations
> 7. **Preserve exceptions** (don't swallow errors)
> 8. **Document order** requirements
> 9. **Implement equals/hashCode** if needed
> 10. **Bounded caches** (avoid memory leaks)
>
> In interviews, mentioning these pitfalls shows you've used Decorator in production and understand the subtleties beyond the textbook definition."

---

#### **Q5: How does Decorator relate to AOP (Aspect-Oriented Programming)?**

> "Excellent question—Decorator and AOP solve similar problems but at different levels. Understanding their relationship is important for senior engineers.
>
> **Relationship:**
>
> - **AOP is automated Decorator Pattern**
> - **Decorator is manual, AOP is framework-generated**
> - **Same goal:** Add cross-cutting concerns without modifying original code
>
> ---
>
> **Manual Decorator:**
>
> ```java
> // Manual decorator
> UserService userService = new UserServiceImpl();
> userService = new LoggingDecorator(userService);
> userService = new TransactionalDecorator(userService);
> userService = new MetricsDecorator(userService);
>
> // ✓ Explicit
> // ✓ Full control
> // ❌ Boilerplate for every service
> ```
>
> **AOP (Automated Decorator):**
>
> ```java
> // Spring AOP generates decorators automatically
> @Service
> public class UserServiceImpl implements UserService {
>     
>     @Transactional  // AOP generates TransactionalDecorator
>     @Loggable       // AOP generates LoggingDecorator
>     @Timed          // AOP generates MetricsDecorator
>     public void createUser(User user) {
>         // Business logic
>     }
> }
>
> // Spring creates proxy:
> // UserService → Proxy (AOP) → UserServiceImpl
> //
> // Proxy applies:
> // 1. Transaction management
> // 2. Logging
> // 3. Metrics
>
> // ✓ Declarative (annotations)
> // ✓ No boilerplate
> // ✓ Consistent across all services
> // ❌ Less control over order
> ```
>
> ---
>
> **How Spring AOP Works (Decorator Under the Hood):**
>
> ```java
> // What you write:
> @Service
> public class UserServiceImpl implements UserService {
>     @Transactional
>     public void createUser(User user) {
>         userRepository.save(user);
>     }
> }
>
> // What Spring generates (simplified):
> public class UserServiceProxy implements UserService {
>     private UserService target;
>     private TransactionManager txManager;
>     
>     @Override
>     public void createUser(User user) {
>         Transaction tx = txManager.begin();  // Before advice
>         
>         try {
>             target.createUser(user);  // Delegate to target
>             tx.commit();              // After advice
>         } catch (Exception e) {
>             tx.rollback();            // After throwing advice
>             throw e;
>         }
>     }
> }
>
> // This is exactly the Decorator Pattern!
> ```
>
> ---
>
> **When to Use Each:**
>
> **Use Manual Decorator When:**
>
> 1. **Need Fine-Grained Control**
> ```java
> // Different decorators for different instances
> HttpClient devClient = new LoggingDecorator(new BasicHttpClient());
> HttpClient prodClient = new BasicHttpClient();  // No logging in prod
> ```
>
> 2. **Runtime Configuration**
> ```java
> HttpClient client = new BasicHttpClient();
>
> if (config.isRetryEnabled()) {
>     client = new RetryDecorator(client, 3);
> }
>
> if (config.isCacheEnabled()) {
>     client = new CachingDecorator(client);
> }
> ```
>
> 3. **Third-Party Objects (Can't Annotate)**
> ```java
> // Can't annotate third-party library
> StripeClient stripe = new StripeClient();
> stripe = new LoggingDecorator(stripe);  // Wrap externally
> ```
>
> ---
>
> **Use AOP When:**
>
> 1. **Cross-Cutting Concerns Across Many Classes**
> ```java
> // Apply logging to ALL services automatically
> @Aspect
> @Component
> public class LoggingAspect {
>     
>     @Around("@annotation(Loggable)")
>     public Object logMethod(ProceedingJoinPoint pjp) throws Throwable {
>         logger.info("Method: {}", pjp.getSignature());
>         return pjp.proceed();
>     }
> }
>
> // Now any method annotated with @Loggable gets logging
> // No manual decorators needed
> ```
>
> 2. **Consistent Behavior Across Application**
> ```java
> // All @Transactional methods get transaction management
> // All @Cacheable methods get caching
> // All @Async methods run asynchronously
> //
> // Consistent without manual wiring
> ```
>
> 3. **Declarative (Annotations over Code)**
> ```java
> @Service
> public class OrderService {
>     
>     @Transactional
>     @Cacheable("orders")
>     @Timed
>     public Order getOrder(Long id) {
>         return orderRepository.findById(id);
>     }
> }
>
> // Clean, readable, no boilerplate
> ```
>
> ---
>
> **Combining Both:**
>
> ```java
> // Use AOP for common concerns
> @Service
> public class PaymentService {
>     
>     @Transactional  // AOP handles transactions
>     public PaymentResult processPayment(PaymentRequest request) {
>         return paymentGateway.charge(request);
>     }
> }
>
> // Use manual decorator for specific HTTP client configuration
> @Configuration
> public class HttpConfig {
>     
>     @Bean
>     public HttpClient httpClient() {
>         HttpClient client = new BasicHttpClient();
>         client = new RetryDecorator(client, 3);
>         client = new CircuitBreakerDecorator(client, circuitBreaker);
>         return client;
>     }
> }
>
> // Best of both: AOP for services, Decorator for infrastructure
> ```
>
> ---
>
> **Trade-offs:**
>
> | **Aspect** | **Manual Decorator** | **AOP** |
> |------------|---------------------|---------|
> | **Control** | Full control | Framework-controlled |
> | **Flexibility** | Runtime configuration | Compile/load-time |
> | **Boilerplate** | More code | Less code (annotations) |
> | **Debugging** | Easier (explicit) | Harder (framework magic) |
> | **Order** | Explicit | Configurable but less obvious |
> | **Performance** | Minimal overhead | Slight proxy overhead |
> | **Use Case** | Infrastructure | Business services |
>
> ---
>
> **Real Example:**
>
> At my company:
>
> **We use AOP for:**
> - Transaction management (@Transactional)
> - Security (@PreAuthorize)
> - Caching (@Cacheable)
> - Metrics (@Timed)
> - Async execution (@Async)
>
> **We use manual decorators for:**
> - HTTP clients (retry, circuit breaker, authentication)
> - Message queues (error handling, DLQ)
> - Storage adapters (encryption, compression)
> - External APIs (rate limiting, caching)
>
> **Why the split:**
> - AOP: Business services we control, consistent behavior
> - Decorator: Infrastructure we customize per use case
>
> ---
>
> **Key Insight:**
>
> AOP is essentially **automated Decorator Pattern** powered by proxy generation. Spring creates decorator proxies at runtime using:
> - **JDK Dynamic Proxy** (interface-based)
> - **CGLIB Proxy** (class-based)
>
> Both implement Decorator Pattern under the hood:
> ```
> Client → Proxy (Decorator) → Target
> ```
>
> Understanding this relationship helps you:
> 1. Know when to use each approach
> 2. Debug AOP issues (it's just decorators)
> 3. Mix both when appropriate
> 4. Explain framework behavior in interviews
>
> In interviews, showing you understand this relationship demonstrates deep architectural knowledge."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Decorator Pattern Structure**

```
DECORATOR PATTERN
══════════════════

┌─────────────────┐
│     Client      │
└────────┬────────┘
         │ uses
         ↓
┌─────────────────┐
│   Component     │ (interface)
│                 │
│ + operation()   │
└────────┬────────┘
         △ implements
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───┴────┐ ┌──┴────┐ ┌──┴────┐ ┌──┴────┐
│Concrete│ │Deco   │ │Deco   │ │Deco   │
│Comp    │ │-rator │ │-rator │ │-rator │
│        │ │   A   │ │   B   │ │   C   │
└────────┘ └───┬───┘ └───┬───┘ └───┬───┘
               │         │         │
               │  HAS-A  │         │
               ↓         ↓         ↓
           ┌─────────────────┐
           │   Component     │ (wrapped)
           └─────────────────┘

EXAMPLE: Coffee Shop
═══════════════════

Coffee coffee = new SimpleCoffee();        // $2.00
coffee = new MilkDecorator(coffee);        // $2.50
coffee = new SugarDecorator(coffee);       // $2.70
coffee = new WhipDecorator(coffee);        // $3.20

Execution Flow:
───────────────
coffee.getCost()
  → WhipDecorator.getCost()
    → SugarDecorator.getCost()
      → MilkDecorator.getCost()
        → SimpleCoffee.getCost() = 2.0
      ← return 2.0 + 0.5 = 2.5
    ← return 2.5 + 0.2 = 2.7
  ← return 2.7 + 0.5 = 3.2

Each decorator adds its behavior and delegates to wrapped component.
```

---

### **Decorator vs Inheritance**

```
WITHOUT DECORATOR (Inheritance)
════════════════════════════════

         ┌──────────┐
         │  Coffee  │
         └─────┬────┘
               │
    ┌──────────┼──────────┬──────────┐
    │          │          │          │
┌───┴────┐ ┌──┴────┐ ┌──┴────┐ ┌──┴────┐
│Coffee  │ │Coffee │ │Coffee │ │Coffee │
│+Milk   │ │+Sugar │ │+Whip  │ │+Cara  │
└────────┘ └───────┘ └───────┘ └───mel─┘

Need all combinations:
├─ CoffeeWithMilkAndSugar
├─ CoffeeWithMilkAndWhip
├─ CoffeeWithMilkAndCaramel
├─ CoffeeWithSugarAndWhip
├─ CoffeeWithSugarAndCaramel
├─ CoffeeWithWhipAndCaramel
├─ CoffeeWithMilkSugarAndWhip
├─ CoffeeWithMilkSugarAndCaramel
└─ ... (2^n classes for n features!)

Problems:
❌ Class explosion
❌ Rigid (compile-time only)
❌ Can't add features at runtime


WITH DECORATOR (Composition)
═════════════════════════════

         ┌──────────┐
         │  Coffee  │ (interface)
         └─────┬────┘
               △
    ┌──────────┼──────────┬──────────┬──────────┐
    │          │          │          │          │
┌───┴────┐ ┌──┴────┐ ┌──┴────┐ ┌──┴────┐ ┌──┴────┐
│Simple  │ │Milk   │ │Sugar  │ │Whip   │ │Cara   │
│Coffee  │ │Deco   │ │Deco   │ │Deco   │ │mel    │
│        │ │       │ │       │ │       │ │Deco   │
└────────┘ └───────┘ └───────┘ └───────┘ └───────┘

Compose at runtime:
Coffee c = new SimpleCoffee();
c = new MilkDecorator(c);
c = new SugarDecorator(c);
// Any combination!

Benefits:
✓ Only 5 classes (1 + 4 decorators)
✓ Flexible (runtime composition)
✓ Open-Closed Principle
✓ Easy to add new decorators
```

---

### **HTTP Client Decorator Chain**

```
HTTP CLIENT DECORATOR CHAIN
════════════════════════════

Application
    │
    ↓
┌───────────────────┐
│ LoggingDecorator  │ ← Logs request/response
└─────────┬─────────┘
          │ wraps
          ↓
┌───────────────────┐
│ MetricsDecorator  │ ← Records metrics
└─────────┬─────────┘
          │ wraps
          ↓
┌───────────────────┐
│CircuitBreaker     │ ← Fails fast if service down
│Decorator          │
└─────────┬─────────┘
          │ wraps
          ↓
┌───────────────────┐
│ RetryDecorator    │ ← Retries on failure
└─────────┬─────────┘
          │ wraps
          ↓
┌───────────────────┐
│Authentication     │ ← Adds auth header
│Decorator          │
└─────────┬─────────┘
          │ wraps
          ↓
┌───────────────────┐
│ BasicHttpClient   │ ← Actual HTTP call
└───────────────────┘
          │
          ↓
      [Network]


EXECUTION FLOW
══════════════

Request (top → bottom):
────────────────────────
1. Logging: Log request details
2. Metrics: Start timer
3. Circuit Breaker: Check if open
4. Retry: Attempt 1
5. Authentication: Add Bearer token
6. Basic: Send HTTP request
   → Network call →

Response (bottom → top):
────────────────────────
← Network response ←
6. Basic: Parse response
5. Authentication: (no-op)
4. Retry: Success, return
3. Circuit Breaker: Record success
2. Metrics: Stop timer, record latency
1. Logging: Log response details
← Return to application ←


FAILURE SCENARIO
════════════════

1. Logging: Log request
2. Metrics: Start timer
3. Circuit Breaker: Allow (closed)
4. Retry: Attempt 1
5. Authentication: Add token
6. Basic: Network timeout ❌
5. Authentication: (exception propagates)
4. Retry: Attempt 2 (backoff 1s)
5. Authentication: Add token
6. Basic: Network timeout ❌
5. Authentication: (exception propagates)
4. Retry: Attempt 3 (backoff 2s)
5. Authentication: Add token
6. Basic: Success ✓
5. Authentication: (return response)
4. Retry: Return successful response
3. Circuit Breaker: Record success
2. Metrics: Record latency (3 attempts)
1. Logging: Log response

Benefits:
✓ Automatic retries
✓ Circuit breaker prevents cascading failures
✓ Metrics show retry rate
✓ Logging captures all attempts
✓ Each concern isolated in decorator
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Engineering Impact:**
- **Extensibility:** Add behavior without modifying existing code (Open-Closed Principle)
- **Flexibility:** Compose behaviors at runtime, not compile-time
- **Maintainability:** Each decorator has single responsibility
- **Testability:** Test each decorator in isolation
- **Reusability:** Mix and match decorators across different components

**Business Impact:**
- **Faster Feature Development:** Add logging, caching, metrics without changing core logic
- **Risk Mitigation:** Add resilience (retry, circuit breaker) without rewriting services
- **A/B Testing:** Enable/disable features via decorator composition
- **Cost Optimization:** Add caching decorator to reduce API calls (save $10K/month)

**Real Numbers:**
```
E-commerce API with decorators:

Before Decorator:
- Add retry logic: Modify 50+ service classes
- Add caching: Duplicate caching code everywhere
- Add metrics: Instrument each method manually
- Time: 4 weeks, high risk

After Decorator:
- Add retry: Create 1 RetryDecorator, wrap services
- Add caching: Create 1 CachingDecorator
- Add metrics: Create 1 MetricsDecorator
- Time: 2 days, low risk

Impact: 10x faster, consistent behavior across all services
```

---

### **How It Works (Simple Summary)**

**Core Concept:**
Decorator Pattern wraps an object in another object that adds behavior while maintaining the same interface. It's like wrapping a gift—each layer adds something, but the gift remains the same type.

**Structure:**
1. **Component Interface:** Common interface for base and decorators
2. **Concrete Component:** Basic implementation
3. **Decorator:** Wraps component, adds behavior, delegates to wrapped component
4. **Client:** Uses component interface, unaware of decorators

**Example:**
```java
// Component
interface Coffee {
    double getCost();
}

// Concrete component
class SimpleCoffee implements Coffee {
    public double getCost() { return 2.0; }
}

// Decorator
class MilkDecorator implements Coffee {
    private Coffee coffee;
    
    public MilkDecorator(Coffee coffee) {
        this.coffee = coffee;
    }
    
    public double getCost() {
        return coffee.getCost() + 0.5;  // Add milk cost
    }
}

// Usage
Coffee coffee = new SimpleCoffee();           // $2.00
coffee = new MilkDecorator(coffee);           // $2.50
coffee = new SugarDecorator(coffee);          // $2.70
```

---

### **Key Trade-Offs**

| **Aspect** | **With Decorator** | **With Inheritance** |
|------------|-------------------|----------------------|
| **Flexibility** | Runtime composition | Compile-time fixed |
| **Classes** | Few (1 + n decorators) | Many (2^n combinations) |
| **Extensibility** | Easy (add decorator) | Hard (modify hierarchy) |
| **Complexity** | More objects at runtime | Simpler object model |
| **Debugging** | Harder (wrapper chain) | Easier (direct class) |
| **Performance** | Slight overhead (delegation) | No overhead |

---

### **Decision Framework**

```
Should I Use Decorator Pattern?
════════════════════════════════

✅ Use Decorator When:
- Need to add responsibilities dynamically
- Multiple optional features that can be combined
- Cross-cutting concerns (logging, caching, metrics)
- Can't modify original class (third-party library)
- Want runtime configuration of behavior
- Need same interface after adding behavior

❌ Skip Decorator When:
- Simple inheritance works fine
- Only one feature (no combinations)
- Decorators don't share interface
- Performance critical (every nanosecond matters)
- Order of decorators becomes too complex

🤔 Consider Decorator When:
- Building HTTP clients with retry, circuit breaker
- Adding caching, logging, metrics to repositories
- Implementing resilience patterns
- Composing I/O streams (Java I/O classic use)
- Wrapping third-party APIs with cross-cutting concerns
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Clearly Explain the Problem**
- "Decorator adds behavior dynamically without subclassing"
- "Solves combinatorial explosion of inheritance"
- "Like wrapping gifts—each layer adds something"

✅ **Provide Real Examples**
- Java I/O: `new BufferedInputStream(new FileInputStream(...))`
- HTTP clients: Add retry, logging, authentication
- Spring AOP: Automated decorator for @Transactional, @Cacheable
- Servlet filters: Chain of decorators for request/response

✅ **Know the Differences**
- **Decorator:** Same interface, add behavior
- **Adapter:** Different interface, make compatible
- **Proxy:** Same interface, control access
- **All use composition, different intents**

✅ **Discuss Trade-offs**
- "More flexible than inheritance but more objects at runtime"
- "Slight delegation overhead but negligible in most cases"
- "Decorator order matters—must document or enforce"
- "Debugging harder due to wrapper chain"

✅ **Show Spring Integration**
- Spring AOP is automated Decorator (proxy generation)
- Manual decorators for infrastructure (HTTP clients)
- AOP for business services (@Transactional, @Cacheable)
- Mix both for maximum flexibility

✅ **Mention Testing Strategy**
- Test decorators in isolation (mock delegate)
- Test chains with integration tests
- Test order-sensitive behavior explicitly
- Use spy pattern to verify application

**Interview Script:**
> "Decorator Pattern adds responsibilities to objects dynamically by wrapping them in decorator objects. It solves the combinatorial explosion problem—instead of 2^n classes for n features, you have n decorator classes that can be composed at runtime.
>
> For example, Java I/O uses Decorator extensively. You can stack `FileInputStream`, `BufferedInputStream`, `GZIPInputStream` to add buffering and compression dynamically.
>
> In production, I've used decorators for HTTP clients—wrapping a basic client with retry, circuit breaker, logging, and metrics decorators. Each decorator is independent, testable, and composable. We can enable/disable decorators via configuration for different environments.
>
> The key benefit is the Open-Closed Principle—we extend behavior without modifying existing code. The trade-off is more objects at runtime and potential debugging complexity, but the overhead is negligible (< 1ms) compared to network I/O.
>
> Real-world examples include Spring AOP (automated decorator using proxies), Servlet filters (request/response decoration), and OkHttp interceptors (5 billion devices use decorated HTTP clients)."

---

**End of Topic 184: Decorator Pattern**
