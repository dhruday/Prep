# 182. Builder Pattern

---

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

**Builder Pattern** is a creational design pattern that provides a flexible solution for constructing complex objects step-by-step. Unlike constructors or factories that require all parameters upfront, the Builder pattern separates the construction of an object from its representation, allowing the same construction process to create different variations.

### **What It Is**

**Core Concept:**
The Builder pattern lets you construct complex objects step-by-step using a fluent API. It's particularly useful when an object has many optional parameters or requires multiple steps to construct properly.

```java
// Without Builder (Telescoping Constructor Anti-Pattern)
User user = new User(
    "john@example.com",    // email (required)
    "John Doe",            // name (required)
    "+1234567890",         // phone (optional)
    "123 Main St",         // address (optional)
    "New York",            // city (optional)
    "USA",                 // country (optional)
    true,                  // emailVerified (optional)
    false,                 // phoneVerified (optional)
    null,                  // lastLogin (optional)
    null                   // preferences (optional)
);
// ❌ Hard to read, error-prone, what's the 7th parameter?

// With Builder (Fluent API)
User user = User.builder()
    .email("john@example.com")
    .name("John Doe")
    .phone("+1234567890")
    .address("123 Main St")
    .city("New York")
    .country("USA")
    .emailVerified(true)
    .build();
// ✓ Clear, readable, self-documenting
// ✓ Optional parameters are optional
// ✓ Order doesn't matter
```

**Key Components:**
1. **Product:** The complex object being built
2. **Builder:** Interface defining construction steps
3. **Concrete Builder:** Implements the builder interface
4. **Director (Optional):** Controls the building process
5. **Fluent API:** Method chaining for readability

---

### **Why It Exists**

**Problem It Solves:**

**Problem 1: Telescoping Constructor Anti-Pattern**

```java
// BAD: Multiple constructor overloads
public class HttpRequest {
    public HttpRequest(String url) { ... }
    public HttpRequest(String url, String method) { ... }
    public HttpRequest(String url, String method, Map<String, String> headers) { ... }
    public HttpRequest(String url, String method, Map<String, String> headers, String body) { ... }
    public HttpRequest(String url, String method, Map<String, String> headers, String body, int timeout) { ... }
    // 10+ more constructors...
    
    // Problems:
    // ❌ Combinatorial explosion (2^n constructors)
    // ❌ Hard to remember parameter order
    // ❌ Can't have multiple constructors with same parameter types
    // ❌ Can't skip middle parameters (must pass null)
}

// Usage (confusing)
HttpRequest request = new HttpRequest(
    "https://api.example.com/users",
    "POST",
    null,      // No headers (must pass null)
    "{\"name\":\"John\"}",
    5000,      // Timeout
    null,      // No auth (must pass null)
    true       // Follow redirects
);
// What's the 5th parameter? 🤔
```

**Solution with Builder:**

```java
// GOOD: Builder pattern
HttpRequest request = HttpRequest.builder()
    .url("https://api.example.com/users")
    .method("POST")
    .body("{\"name\":\"John\"}")
    .timeout(5000)
    .followRedirects(true)
    .build();
// ✓ Clear, self-documenting
// ✓ No null values for optional parameters
// ✓ Can skip any optional parameter
```

---

**Problem 2: Immutable Objects with Many Fields**

```java
// BAD: Mutable object with setters
public class DatabaseConfig {
    private String host;
    private int port;
    private String database;
    private String username;
    private String password;
    
    // Setters allow mutation
    public void setHost(String host) { this.host = host; }
    public void setPort(int port) { this.port = port; }
    // ... more setters
}

// Usage (mutable, not thread-safe)
DatabaseConfig config = new DatabaseConfig();
config.setHost("localhost");
config.setPort(5432);
config.setDatabase("mydb");
// Can be modified later (not safe) ❌
config.setPort(3306);  // Oops, changed port!
```

**Solution with Builder:**

```java
// GOOD: Immutable object with builder
public class DatabaseConfig {
    private final String host;       // final = immutable
    private final int port;
    private final String database;
    private final String username;
    private final String password;
    
    // Private constructor (only builder can create)
    private DatabaseConfig(Builder builder) {
        this.host = builder.host;
        this.port = builder.port;
        this.database = builder.database;
        this.username = builder.username;
        this.password = builder.password;
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String host = "localhost";  // Default values
        private int port = 5432;
        private String database;
        private String username;
        private String password;
        
        public Builder host(String host) {
            this.host = host;
            return this;
        }
        
        public Builder port(int port) {
            this.port = port;
            return this;
        }
        
        public Builder database(String database) {
            this.database = database;
            return this;
        }
        
        public DatabaseConfig build() {
            // Validation before construction
            if (database == null) {
                throw new IllegalStateException("Database name required");
            }
            return new DatabaseConfig(this);
        }
    }
}

// Usage (immutable, thread-safe)
DatabaseConfig config = DatabaseConfig.builder()
    .host("prod-db.example.com")
    .port(5432)
    .database("users")
    .username("admin")
    .password("secret")
    .build();
// ✓ Immutable (cannot be modified after creation)
// ✓ Thread-safe
// ✓ Validation at build time
```

---

**Problem 3: Complex Object Construction with Validation**

```java
// BAD: Constructor with validation (messy)
public User(String email, String name, String phone) {
    if (email == null || !email.contains("@")) {
        throw new IllegalArgumentException("Invalid email");
    }
    if (name == null || name.length() < 2) {
        throw new IllegalArgumentException("Invalid name");
    }
    if (phone != null && !phone.matches("\\+?[0-9]{10,}")) {
        throw new IllegalArgumentException("Invalid phone");
    }
    this.email = email;
    this.name = name;
    this.phone = phone;
}

// Problems:
// ❌ Validation logic in constructor
// ❌ Can't partially build and validate
// ❌ Error messages not specific
```

**Solution with Builder:**

```java
// GOOD: Builder with step-by-step validation
public static class Builder {
    private String email;
    private String name;
    private String phone;
    
    public Builder email(String email) {
        if (email == null || !email.contains("@")) {
            throw new IllegalArgumentException("Email must contain @");
        }
        this.email = email;
        return this;
    }
    
    public Builder name(String name) {
        if (name == null || name.length() < 2) {
            throw new IllegalArgumentException("Name must be at least 2 characters");
        }
        this.name = name;
        return this;
    }
    
    public Builder phone(String phone) {
        if (phone != null && !phone.matches("\\+?[0-9]{10,}")) {
            throw new IllegalArgumentException("Phone must be 10+ digits");
        }
        this.phone = phone;
        return this;
    }
    
    public User build() {
        if (email == null) {
            throw new IllegalStateException("Email is required");
        }
        if (name == null) {
            throw new IllegalStateException("Name is required");
        }
        return new User(this);
    }
}

// ✓ Validation happens immediately when setting value
// ✓ Clear error messages
// ✓ Final validation in build()
```

---

### **When to Use Builder Pattern**

**Perfect Use Cases:**

1. **Many Optional Parameters (4+)**
   - Configuration objects
   - Request/Response objects
   - Domain entities with optional fields

2. **Immutable Objects**
   - Thread-safe value objects
   - DTOs (Data Transfer Objects)
   - Configuration classes

3. **Complex Construction Logic**
   - Objects requiring validation
   - Objects with dependencies between fields
   - Objects with default values

4. **Fluent APIs**
   - Query builders (SQL, HTTP, etc.)
   - Test data builders
   - DSLs (Domain-Specific Languages)

5. **Multiple Representations**
   - Same construction process, different outputs
   - Different formats (JSON, XML, Protobuf)

**When NOT to Use:**

- Simple objects (1-3 fields)
- No optional parameters
- Construction logic is trivial
- Mutable objects preferred

---

### **Role in Large-Scale Distributed Systems**

**Scenario: API Client Configuration**

```java
// Large-scale microservices need flexible HTTP client configuration

@Service
public class UserService {
    
    private final RestTemplate restTemplate;
    
    public UserService() {
        this.restTemplate = RestTemplate.builder()
            .baseUrl("https://api.example.com")
            .connectTimeout(Duration.ofSeconds(5))
            .readTimeout(Duration.ofSeconds(10))
            .defaultHeader("Accept", "application/json")
            .defaultHeader("User-Agent", "MyApp/1.0")
            .requestInterceptor(new LoggingInterceptor())
            .requestInterceptor(new AuthInterceptor())
            .errorHandler(new CustomErrorHandler())
            .messageConverter(new MappingJackson2HttpMessageConverter())
            .basicAuthentication("user", "pass")
            .build();
    }
    
    public User getUser(Long id) {
        return restTemplate.getForObject("/users/" + id, User.class);
    }
}

// Benefits at scale:
// ✓ Environment-specific configuration (dev, staging, prod)
// ✓ Easy to add/remove interceptors
// ✓ Consistent client setup across microservices
// ✓ Testable (can build test client with mocks)
```

---

### **Business Impact**

**Development Velocity:**
```
Without Builder:
- Adding new optional field: Change all constructor calls (100+ places)
- Risk: Breaking existing code
- Time: 2 hours (find all usages, update, test)

With Builder:
- Adding new optional field: Add one builder method
- Risk: Zero (existing code unchanged)
- Time: 5 minutes (add method, document)

Impact: 24x faster feature additions
```

**Production Safety:**
```
Real scenario (E-commerce company):

Before Builder (Mutable Config):
- Config changed at runtime: 15 incidents/month
- Root cause: Shared mutable config modified by different threads
- Impact: Inconsistent behavior, data corruption
- Cost: $50K/month in incident response + revenue loss

After Builder (Immutable Config):
- Config immutable after creation
- Incidents: 0
- Savings: $50K/month

ROI: Immediate (builder implementation: 1 week)
```

**Code Maintainability:**
```
Before Builder (Telescoping Constructors):
- 15 constructor overloads for HttpRequest
- New parameter: Add 15 more constructors (30 total)
- Developer confusion: "Which constructor do I use?"
- Code review time: 30 minutes (verify correct constructor used)

After Builder:
- 1 builder class
- New parameter: Add 1 method
- Developer clarity: Fluent API is self-documenting
- Code review time: 5 minutes (verify required fields set)

Impact: 6x faster code reviews, fewer bugs
```

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### **Builder Pattern Variations**

#### **Variation 1: Classic Gang of Four Builder**

```java
// Product
public class Pizza {
    private final String dough;
    private final String sauce;
    private final String topping;
    
    private Pizza(String dough, String sauce, String topping) {
        this.dough = dough;
        this.sauce = sauce;
        this.topping = topping;
    }
}

// Abstract Builder
public interface PizzaBuilder {
    void buildDough();
    void buildSauce();
    void buildTopping();
    Pizza getPizza();
}

// Concrete Builder
public class HawaiianPizzaBuilder implements PizzaBuilder {
    private String dough;
    private String sauce;
    private String topping;
    
    @Override
    public void buildDough() {
        this.dough = "cross";
    }
    
    @Override
    public void buildSauce() {
        this.sauce = "mild";
    }
    
    @Override
    public void buildTopping() {
        this.topping = "ham+pineapple";
    }
    
    @Override
    public Pizza getPizza() {
        return new Pizza(dough, sauce, topping);
    }
}

// Director (optional)
public class Waiter {
    private PizzaBuilder pizzaBuilder;
    
    public void setPizzaBuilder(PizzaBuilder pb) {
        this.pizzaBuilder = pb;
    }
    
    public Pizza getPizza() {
        return pizzaBuilder.getPizza();
    }
    
    public void constructPizza() {
        pizzaBuilder.buildDough();
        pizzaBuilder.buildSauce();
        pizzaBuilder.buildTopping();
    }
}

// Usage
Waiter waiter = new Waiter();
PizzaBuilder hawaiianBuilder = new HawaiianPizzaBuilder();
waiter.setPizzaBuilder(hawaiianBuilder);
waiter.constructPizza();
Pizza pizza = waiter.getPizza();
```

**Pros:**
- Follows Gang of Four pattern exactly
- Director controls construction order
- Easy to add new builder types

**Cons:**
- Verbose (many classes)
- Not fluent (no method chaining)
- Rarely used in modern Java

---

#### **Variation 2: Fluent Builder (Modern Java)**

```java
// Product with nested builder
public class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final String body;
    private final int timeout;
    private final boolean followRedirects;
    
    // Private constructor
    private HttpRequest(Builder builder) {
        this.url = builder.url;
        this.method = builder.method;
        this.headers = Collections.unmodifiableMap(new HashMap<>(builder.headers));
        this.body = builder.body;
        this.timeout = builder.timeout;
        this.followRedirects = builder.followRedirects;
    }
    
    // Static factory method
    public static Builder builder() {
        return new Builder();
    }
    
    // Nested builder class
    public static class Builder {
        private String url;
        private String method = "GET";  // Default
        private Map<String, String> headers = new HashMap<>();
        private String body;
        private int timeout = 30000;  // Default 30s
        private boolean followRedirects = true;  // Default
        
        // Fluent methods (return this)
        public Builder url(String url) {
            this.url = url;
            return this;
        }
        
        public Builder method(String method) {
            this.method = method;
            return this;
        }
        
        public Builder header(String key, String value) {
            this.headers.put(key, value);
            return this;
        }
        
        public Builder headers(Map<String, String> headers) {
            this.headers.putAll(headers);
            return this;
        }
        
        public Builder body(String body) {
            this.body = body;
            return this;
        }
        
        public Builder timeout(int timeout) {
            if (timeout < 0) {
                throw new IllegalArgumentException("Timeout must be positive");
            }
            this.timeout = timeout;
            return this;
        }
        
        public Builder followRedirects(boolean followRedirects) {
            this.followRedirects = followRedirects;
            return this;
        }
        
        // Build method with validation
        public HttpRequest build() {
            if (url == null || url.isEmpty()) {
                throw new IllegalStateException("URL is required");
            }
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                throw new IllegalStateException("URL must start with http:// or https://");
            }
            return new HttpRequest(this);
        }
    }
    
    // Getters (no setters - immutable)
    public String getUrl() { return url; }
    public String getMethod() { return method; }
    public Map<String, String> getHeaders() { return headers; }
    public String getBody() { return body; }
    public int getTimeout() { return timeout; }
    public boolean isFollowRedirects() { return followRedirects; }
}

// Usage (fluent API)
HttpRequest request = HttpRequest.builder()
    .url("https://api.example.com/users")
    .method("POST")
    .header("Content-Type", "application/json")
    .header("Authorization", "Bearer token123")
    .body("{\"name\":\"John\"}")
    .timeout(5000)
    .followRedirects(false)
    .build();
```

**Pros:**
- Fluent API (method chaining)
- Immutable product
- Self-documenting
- Type-safe
- Default values supported

**Cons:**
- More code than simple constructor
- Builder code must be maintained

---

#### **Variation 3: Lombok Builder (Zero Boilerplate)**

```java
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class User {
    private final Long id;
    private final String email;
    private final String name;
    private final String phone;
    private final String address;
    @Builder.Default
    private final boolean emailVerified = false;
    @Builder.Default
    private final LocalDateTime createdAt = LocalDateTime.now();
}

// Lombok generates builder automatically
User user = User.builder()
    .id(1L)
    .email("john@example.com")
    .name("John Doe")
    .phone("+1234567890")
    .address("123 Main St")
    .emailVerified(true)
    .build();
```

**Pros:**
- Zero boilerplate
- Automatically updates when fields change
- @Builder.Default for default values

**Cons:**
- Requires Lombok dependency
- Less control over validation
- IDE may not show generated code

---

#### **Variation 4: Step Builder (Enforced Order)**

```java
// Forces required fields in specific order
public class DatabaseConnection {
    private final String host;
    private final int port;
    private final String database;
    private final String username;
    private final String password;
    
    private DatabaseConnection(Builder builder) {
        this.host = builder.host;
        this.port = builder.port;
        this.database = builder.database;
        this.username = builder.username;
        this.password = builder.password;
    }
    
    // Step 1: Host (required)
    public static HostStep builder() {
        return new Builder();
    }
    
    // Step interfaces (enforce order)
    public interface HostStep {
        PortStep host(String host);
    }
    
    public interface PortStep {
        DatabaseStep port(int port);
    }
    
    public interface DatabaseStep {
        UsernameStep database(String database);
    }
    
    public interface UsernameStep {
        PasswordStep username(String username);
    }
    
    public interface PasswordStep {
        BuildStep password(String password);
    }
    
    public interface BuildStep {
        BuildStep connectionTimeout(int timeout);  // Optional
        BuildStep maxPoolSize(int size);           // Optional
        DatabaseConnection build();
    }
    
    // Builder implements all steps
    public static class Builder implements 
            HostStep, PortStep, DatabaseStep, 
            UsernameStep, PasswordStep, BuildStep {
        
        private String host;
        private int port;
        private String database;
        private String username;
        private String password;
        private int connectionTimeout = 30000;
        private int maxPoolSize = 10;
        
        @Override
        public PortStep host(String host) {
            this.host = host;
            return this;
        }
        
        @Override
        public DatabaseStep port(int port) {
            this.port = port;
            return this;
        }
        
        @Override
        public UsernameStep database(String database) {
            this.database = database;
            return this;
        }
        
        @Override
        public PasswordStep username(String username) {
            this.username = username;
            return this;
        }
        
        @Override
        public BuildStep password(String password) {
            this.password = password;
            return this;
        }
        
        @Override
        public BuildStep connectionTimeout(int timeout) {
            this.connectionTimeout = timeout;
            return this;
        }
        
        @Override
        public BuildStep maxPoolSize(int size) {
            this.maxPoolSize = size;
            return this;
        }
        
        @Override
        public DatabaseConnection build() {
            return new DatabaseConnection(this);
        }
    }
}

// Usage (enforced order)
DatabaseConnection conn = DatabaseConnection.builder()
    .host("localhost")    // Must be first
    .port(5432)           // Must be second
    .database("mydb")     // Must be third
    .username("admin")    // Must be fourth
    .password("secret")   // Must be fifth
    .connectionTimeout(5000)  // Optional (any order after required fields)
    .maxPoolSize(20)          // Optional
    .build();

// Compile error if order wrong:
DatabaseConnection conn = DatabaseConnection.builder()
    .port(5432)  // ❌ Compile error: host() must be called first
```

**Pros:**
- Compile-time enforcement of required fields
- Can't forget required parameters
- Clear construction order

**Cons:**
- Very verbose (many interfaces)
- Complex to implement
- Only worth it for critical APIs

---

### **Spring Boot Integration**

#### **Example 1: RestTemplate Builder**

```java
@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .rootUri("https://api.example.com")
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            .defaultHeader("Accept", "application/json")
            .defaultHeader("User-Agent", "MyApp/1.0")
            .basicAuthentication("user", "password")
            .interceptors(new LoggingInterceptor())
            .errorHandler(new CustomErrorHandler())
            .build();
    }
}

// Spring provides builder out of the box
```

---

#### **Example 2: WebClient Builder (Reactive)**

```java
@Configuration
public class WebClientConfig {
    
    @Bean
    public WebClient webClient(WebClient.Builder builder) {
        return builder
            .baseUrl("https://api.example.com")
            .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
            .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
            .defaultUriVariables(Collections.singletonMap("version", "v1"))
            .filter(ExchangeFilterFunction.ofRequestProcessor(
                clientRequest -> {
                    System.out.println("Request: " + clientRequest.url());
                    return Mono.just(clientRequest);
                }
            ))
            .clientConnector(
                new ReactorClientHttpConnector(
                    HttpClient.create()
                        .responseTimeout(Duration.ofSeconds(10))
                )
            )
            .build();
    }
}

// Usage
@Service
public class UserService {
    
    private final WebClient webClient;
    
    public UserService(WebClient webClient) {
        this.webClient = webClient;
    }
    
    public Mono<User> getUser(Long id) {
        return webClient.get()
            .uri("/users/{id}", id)
            .retrieve()
            .bodyToMono(User.class);
    }
}
```

---

#### **Example 3: JPA Query Builder**

```java
@Repository
public class UserRepository {
    
    @PersistenceContext
    private EntityManager entityManager;
    
    public List<User> findUsers(UserSearchCriteria criteria) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<User> query = cb.createQuery(User.class);
        Root<User> user = query.from(User.class);
        
        List<Predicate> predicates = new ArrayList<>();
        
        // Builder-like pattern for query construction
        if (criteria.getEmail() != null) {
            predicates.add(cb.equal(user.get("email"), criteria.getEmail()));
        }
        
        if (criteria.getNamePattern() != null) {
            predicates.add(cb.like(user.get("name"), "%" + criteria.getNamePattern() + "%"));
        }
        
        if (criteria.getMinAge() != null) {
            predicates.add(cb.greaterThanOrEqualTo(user.get("age"), criteria.getMinAge()));
        }
        
        if (criteria.isEmailVerified() != null) {
            predicates.add(cb.equal(user.get("emailVerified"), criteria.isEmailVerified()));
        }
        
        query.where(predicates.toArray(new Predicate[0]));
        
        return entityManager.createQuery(query).getResultList();
    }
}

// Better: Use QueryDSL or Spring Data Specifications for builder-like API
```

---

#### **Example 4: Custom Configuration Builder**

```java
// Application configuration with builder
@Configuration
public class AppConfig {
    
    @Bean
    public DatabaseConfig databaseConfig(
            @Value("${db.host}") String host,
            @Value("${db.port}") int port,
            @Value("${db.name}") String database) {
        
        return DatabaseConfig.builder()
            .host(host)
            .port(port)
            .database(database)
            .username(getUsername())  // From secure vault
            .password(getPassword())
            .maxPoolSize(20)
            .connectionTimeout(Duration.ofSeconds(30))
            .validationQuery("SELECT 1")
            .build();
    }
    
    private String getUsername() {
        // Fetch from vault
        return "admin";
    }
    
    private String getPassword() {
        // Fetch from vault
        return "secret";
    }
}

// DatabaseConfig with builder
public class DatabaseConfig {
    private final String host;
    private final int port;
    private final String database;
    private final String username;
    private final String password;
    private final int maxPoolSize;
    private final Duration connectionTimeout;
    private final String validationQuery;
    
    private DatabaseConfig(Builder builder) {
        this.host = builder.host;
        this.port = builder.port;
        this.database = builder.database;
        this.username = builder.username;
        this.password = builder.password;
        this.maxPoolSize = builder.maxPoolSize;
        this.connectionTimeout = builder.connectionTimeout;
        this.validationQuery = builder.validationQuery;
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String host = "localhost";
        private int port = 5432;
        private String database;
        private String username;
        private String password;
        private int maxPoolSize = 10;
        private Duration connectionTimeout = Duration.ofSeconds(30);
        private String validationQuery = "SELECT 1";
        
        public Builder host(String host) {
            this.host = host;
            return this;
        }
        
        public Builder port(int port) {
            this.port = port;
            return this;
        }
        
        public Builder database(String database) {
            this.database = database;
            return this;
        }
        
        public Builder username(String username) {
            this.username = username;
            return this;
        }
        
        public Builder password(String password) {
            this.password = password;
            return this;
        }
        
        public Builder maxPoolSize(int maxPoolSize) {
            this.maxPoolSize = maxPoolSize;
            return this;
        }
        
        public Builder connectionTimeout(Duration connectionTimeout) {
            this.connectionTimeout = connectionTimeout;
            return this;
        }
        
        public Builder validationQuery(String validationQuery) {
            this.validationQuery = validationQuery;
            return this;
        }
        
        public DatabaseConfig build() {
            if (database == null) {
                throw new IllegalStateException("Database name is required");
            }
            if (username == null) {
                throw new IllegalStateException("Username is required");
            }
            if (password == null) {
                throw new IllegalStateException("Password is required");
            }
            return new DatabaseConfig(this);
        }
    }
    
    // Getters
    public String getHost() { return host; }
    public int getPort() { return port; }
    public String getDatabase() { return database; }
    public String getUsername() { return username; }
    public String getPassword() { return password; }
    public int getMaxPoolSize() { return maxPoolSize; }
    public Duration getConnectionTimeout() { return connectionTimeout; }
    public String getValidationQuery() { return validationQuery; }
}
```

---

### **Advanced Pattern: Builder with Inheritance**

```java
// Base class with builder
public abstract class Vehicle {
    private final String brand;
    private final String model;
    private final int year;
    
    protected Vehicle(Builder<?> builder) {
        this.brand = builder.brand;
        this.model = builder.model;
        this.year = builder.year;
    }
    
    // Recursive generics for fluent API with inheritance
    public static abstract class Builder<T extends Builder<T>> {
        private String brand;
        private String model;
        private int year;
        
        protected abstract T self();
        
        public T brand(String brand) {
            this.brand = brand;
            return self();
        }
        
        public T model(String model) {
            this.model = model;
            return self();
        }
        
        public T year(int year) {
            this.year = year;
            return self();
        }
        
        public abstract Vehicle build();
    }
    
    public String getBrand() { return brand; }
    public String getModel() { return model; }
    public int getYear() { return year; }
}

// Subclass with additional fields
public class Car extends Vehicle {
    private final int doors;
    private final boolean sunroof;
    
    private Car(Builder builder) {
        super(builder);
        this.doors = builder.doors;
        this.sunroof = builder.sunroof;
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder extends Vehicle.Builder<Builder> {
        private int doors = 4;  // Default
        private boolean sunroof = false;
        
        @Override
        protected Builder self() {
            return this;
        }
        
        public Builder doors(int doors) {
            this.doors = doors;
            return this;
        }
        
        public Builder sunroof(boolean sunroof) {
            this.sunroof = sunroof;
            return this;
        }
        
        @Override
        public Car build() {
            return new Car(this);
        }
    }
    
    public int getDoors() { return doors; }
    public boolean hasSunroof() { return sunroof; }
}

// Usage (fluent API works across inheritance hierarchy)
Car car = Car.builder()
    .brand("Toyota")      // From Vehicle.Builder
    .model("Camry")       // From Vehicle.Builder
    .year(2024)           // From Vehicle.Builder
    .doors(4)             // From Car.Builder
    .sunroof(true)        // From Car.Builder
    .build();
```

---

### **Test Data Builders**

```java
// Builder specifically for tests
public class UserTestBuilder {
    private Long id = 1L;
    private String email = "test@example.com";
    private String name = "Test User";
    private String phone = "+1234567890";
    private boolean emailVerified = true;
    private LocalDateTime createdAt = LocalDateTime.now();
    
    public static UserTestBuilder aUser() {
        return new UserTestBuilder();
    }
    
    public UserTestBuilder withId(Long id) {
        this.id = id;
        return this;
    }
    
    public UserTestBuilder withEmail(String email) {
        this.email = email;
        return this;
    }
    
    public UserTestBuilder withName(String name) {
        this.name = name;
        return this;
    }
    
    public UserTestBuilder withUnverifiedEmail() {
        this.emailVerified = false;
        return this;
    }
    
    public UserTestBuilder createdDaysAgo(int days) {
        this.createdAt = LocalDateTime.now().minusDays(days);
        return this;
    }
    
    public User build() {
        return User.builder()
            .id(id)
            .email(email)
            .name(name)
            .phone(phone)
            .emailVerified(emailVerified)
            .createdAt(createdAt)
            .build();
    }
}

// Usage in tests
@Test
public void testActiveUsers() {
    User activeUser = aUser()
        .withEmail("active@example.com")
        .createdDaysAgo(10)
        .build();
    
    User inactiveUser = aUser()
        .withEmail("inactive@example.com")
        .withUnverifiedEmail()
        .createdDaysAgo(365)
        .build();
    
    // Test logic
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### **Performance Considerations**

**Object Creation Overhead:**

```java
// Scenario: Creating 1 million HttpRequest objects

// Approach 1: Mutable object with setters
HttpRequest request = new HttpRequest();
request.setUrl("https://api.example.com");
request.setMethod("POST");
request.addHeader("Content-Type", "application/json");
request.setBody("{\"data\":\"value\"}");

// Performance:
// - Object creation: Fast
// - Memory overhead: Low
// - Thread safety: None (mutable)
// - Validation: None (can be invalid state)

// Approach 2: Builder with immutable object
HttpRequest request = HttpRequest.builder()
    .url("https://api.example.com")
    .method("POST")
    .header("Content-Type", "application/json")
    .body("{\"data\":\"value\"}")
    .build();

// Performance:
// - Object creation: Slightly slower (builder allocation)
// - Memory overhead: Medium (temporary builder object)
// - Thread safety: Complete (immutable)
// - Validation: Strong (enforced in build())

// Benchmarks:
// Mutable: 50 ns/object
// Builder: 75 ns/object (50% slower)
//
// For 1M objects:
// Mutable: 50ms
// Builder: 75ms
// Difference: 25ms (negligible in most cases)
//
// Memory:
// Mutable: 64 bytes/object
// Builder: 64 bytes (product) + 64 bytes (builder) = 128 bytes during construction
//         (builder is GC'd after build(), so final = 64 bytes)
//
// GC pressure:
// Mutable: Low
// Builder: Medium (temporary builder objects)
```

**Conclusion:** Builder overhead is negligible for typical use cases. Benefits (immutability, validation, readability) far outweigh 50% performance cost.

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### **Builder for Complex Data Structures**

```java
// Building complex nested data structures
public class QueryRequest {
    private final String table;
    private final List<String> selectColumns;
    private final List<WhereClause> whereClauses;
    private final List<OrderBy> orderBys;
    private final Integer limit;
    private final Integer offset;
    
    private QueryRequest(Builder builder) {
        this.table = builder.table;
        this.selectColumns = List.copyOf(builder.selectColumns);
        this.whereClauses = List.copyOf(builder.whereClauses);
        this.orderBys = List.copyOf(builder.orderBys);
        this.limit = builder.limit;
        this.offset = builder.offset;
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String table;
        private List<String> selectColumns = new ArrayList<>();
        private List<WhereClause> whereClauses = new ArrayList<>();
        private List<OrderBy> orderBys = new ArrayList<>();
        private Integer limit;
        private Integer offset;
        
        public Builder table(String table) {
            this.table = table;
            return this;
        }
        
        public Builder select(String... columns) {
            this.selectColumns.addAll(Arrays.asList(columns));
            return this;
        }
        
        public Builder where(String column, String operator, Object value) {
            this.whereClauses.add(new WhereClause(column, operator, value));
            return this;
        }
        
        public Builder orderBy(String column, String direction) {
            this.orderBys.add(new OrderBy(column, direction));
            return this;
        }
        
        public Builder limit(int limit) {
            this.limit = limit;
            return this;
        }
        
        public Builder offset(int offset) {
            this.offset = offset;
            return this;
        }
        
        public QueryRequest build() {
            if (table == null) {
                throw new IllegalStateException("Table is required");
            }
            if (selectColumns.isEmpty()) {
                selectColumns.add("*");  // Default to all columns
            }
            return new QueryRequest(this);
        }
    }
    
    public String toSQL() {
        StringBuilder sql = new StringBuilder("SELECT ");
        sql.append(String.join(", ", selectColumns));
        sql.append(" FROM ").append(table);
        
        if (!whereClauses.isEmpty()) {
            sql.append(" WHERE ");
            sql.append(whereClauses.stream()
                .map(WhereClause::toSQL)
                .collect(Collectors.joining(" AND ")));
        }
        
        if (!orderBys.isEmpty()) {
            sql.append(" ORDER BY ");
            sql.append(orderBys.stream()
                .map(OrderBy::toSQL)
                .collect(Collectors.joining(", ")));
        }
        
        if (limit != null) {
            sql.append(" LIMIT ").append(limit);
        }
        
        if (offset != null) {
            sql.append(" OFFSET ").append(offset);
        }
        
        return sql.toString();
    }
}

// Usage
QueryRequest query = QueryRequest.builder()
    .table("users")
    .select("id", "name", "email")
    .where("age", ">", 18)
    .where("country", "=", "USA")
    .orderBy("createdAt", "DESC")
    .limit(10)
    .offset(0)
    .build();

String sql = query.toSQL();
// SELECT id, name, email FROM users WHERE age > 18 AND country = 'USA' ORDER BY createdAt DESC LIMIT 10 OFFSET 0
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### **Builder for Resilience Configuration**

```java
// Resilience4j configuration with builder
@Configuration
public class ResilienceConfig {
    
    @Bean
    public CircuitBreaker userServiceCircuitBreaker() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
            .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
            .slidingWindowSize(100)
            .failureRateThreshold(50.0f)
            .waitDurationInOpenState(Duration.ofSeconds(60))
            .permittedNumberOfCallsInHalfOpenState(10)
            .minimumNumberOfCalls(20)
            .automaticTransitionFromOpenToHalfOpenEnabled(true)
            .recordExceptions(IOException.class, TimeoutException.class)
            .ignoreExceptions(BusinessException.class)
            .build();
        
        return CircuitBreaker.of("userService", config);
    }
    
    @Bean
    public RetryConfig retryConfig() {
        return RetryConfig.custom()
            .maxAttempts(3)
            .waitDuration(Duration.ofSeconds(1))
            .retryExceptions(IOException.class, TimeoutException.class)
            .ignoreExceptions(BusinessException.class)
            .build();
    }
    
    @Bean
    public TimeLimiterConfig timeLimiterConfig() {
        return TimeLimiterConfig.custom()
            .timeoutDuration(Duration.ofSeconds(5))
            .cancelRunningFuture(true)
            .build();
    }
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### **Builder for Security Configuration**

```java
// Spring Security configuration with builder
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf().disable()
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder())
                )
            )
            .build();
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### **Case Study 1: OkHttp Client (Square)**

**Background:**
OkHttp is one of the most popular HTTP clients for Java/Android. It uses the Builder pattern extensively for configuration.

**Implementation:**

```java
// OkHttp client with builder
OkHttpClient client = new OkHttpClient.Builder()
    .connectTimeout(10, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .writeTimeout(30, TimeUnit.SECONDS)
    .connectionPool(new ConnectionPool(10, 5, TimeUnit.MINUTES))
    .addInterceptor(new LoggingInterceptor())
    .addNetworkInterceptor(new CacheInterceptor())
    .retryOnConnectionFailure(true)
    .followRedirects(true)
    .followSslRedirects(true)
    .cache(new Cache(cacheDir, 10 * 1024 * 1024))  // 10 MB cache
    .proxy(new Proxy(Proxy.Type.HTTP, new InetSocketAddress("proxy.example.com", 8080)))
    .proxyAuthenticator((route, response) -> {
        String credential = Credentials.basic("user", "password");
        return response.request().newBuilder()
            .header("Proxy-Authorization", credential)
            .build();
    })
    .build();

// Request with builder
Request request = new Request.Builder()
    .url("https://api.example.com/users")
    .header("Accept", "application/json")
    .header("Authorization", "Bearer token123")
    .post(RequestBody.create(jsonBody, MediaType.get("application/json")))
    .build();

Response response = client.newCall(request).execute();
```

**Results:**
- **Adoption:** 5+ billion Android devices use OkHttp
- **Flexibility:** Supports 20+ configuration options
- **Backward Compatibility:** Add new options without breaking existing code
- **Developer Experience:** Fluent API is intuitive and self-documenting

---

### **Case Study 2: AWS SDK v2 (Amazon)**

**Background:**
AWS SDK v2 completely rebuilt their API using builders for every operation.

**Implementation:**

```java
// S3 client with builder
S3Client s3 = S3Client.builder()
    .region(Region.US_EAST_1)
    .credentialsProvider(DefaultCredentialsProvider.create())
    .httpClient(UrlConnectionHttpClient.builder()
        .connectionTimeout(Duration.ofSeconds(5))
        .socketTimeout(Duration.ofSeconds(10))
        .build())
    .overrideConfiguration(ClientOverrideConfiguration.builder()
        .apiCallTimeout(Duration.ofSeconds(30))
        .apiCallAttemptTimeout(Duration.ofSeconds(10))
        .retryPolicy(RetryPolicy.builder()
            .numRetries(3)
            .build())
        .build())
    .build();

// PutObject request with builder
PutObjectRequest putObjectRequest = PutObjectRequest.builder()
    .bucket("my-bucket")
    .key("my-key")
    .contentType("application/json")
    .metadata(Map.of("custom-key", "custom-value"))
    .serverSideEncryption(ServerSideEncryption.AES256)
    .acl(ObjectCannedACL.PRIVATE)
    .build();

s3.putObject(putObjectRequest, RequestBody.fromFile(new File("data.json")));
```

**Results:**
- **250+ AWS Services:** Consistent builder API across all services
- **Type Safety:** Compile-time validation of parameters
- **Discoverability:** IDE auto-complete shows all options
- **Migration:** v1 → v2 simplified by consistent builder pattern

---

### **Case Study 3: Retrofit (Square)**

**Background:**
Retrofit is a type-safe HTTP client for Android and Java. Uses builders for client and request configuration.

**Implementation:**

```java
// Retrofit with builder
Retrofit retrofit = new Retrofit.Builder()
    .baseUrl("https://api.example.com/")
    .client(okHttpClient)  // Custom OkHttpClient
    .addConverterFactory(GsonConverterFactory.create())
    .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
    .validateEagerly(true)
    .build();

// Service interface
public interface UserService {
    @GET("users/{id}")
    Call<User> getUser(@Path("id") Long id);
    
    @POST("users")
    Call<User> createUser(@Body User user);
}

UserService service = retrofit.create(UserService.class);
```

**Results:**
- **Type-Safe:** Compile-time verification of API calls
- **Extensible:** Easy to add custom converters and adapters
- **Testable:** Can inject mock Retrofit instance
- **Adoption:** 100K+ Android apps use Retrofit

---

### **Case Study 4: Spring Boot (Pivotal)**

**Background:**
Spring Boot extensively uses builders for configuration.

**Implementation:**

```java
// SpringApplication with builder
new SpringApplicationBuilder()
    .sources(MyApplication.class)
    .bannerMode(Banner.Mode.OFF)
    .logStartupInfo(false)
    .registerShutdownHook(true)
    .properties("server.port=8081")
    .profiles("dev")
    .run(args);

// RestTemplate with builder
@Bean
public RestTemplate restTemplate(RestTemplateBuilder builder) {
    return builder
        .setConnectTimeout(Duration.ofSeconds(5))
        .setReadTimeout(Duration.ofSeconds(10))
        .defaultHeader("User-Agent", "MyApp/1.0")
        .basicAuthentication("user", "password")
        .requestFactory(() -> new BufferingClientHttpRequestFactory(
            new SimpleClientHttpRequestFactory()))
        .interceptors(new LoggingInterceptor())
        .build();
}

// UriComponentsBuilder (for building URIs)
URI uri = UriComponentsBuilder
    .fromUriString("https://api.example.com")
    .path("/users/{id}")
    .queryParam("include", "profile")
    .queryParam("include", "settings")
    .buildAndExpand(123)
    .toUri();
// Result: https://api.example.com/users/123?include=profile&include=settings
```

**Results:**
- **Consistency:** Builders used throughout Spring ecosystem
- **Configuration:** Easy to customize every component
- **Testing:** Simple to create test-specific configurations

---

### **Case Study 5: Guava (Google)**

**Background:**
Google's Guava library uses builders for immutable collections and caching.

**Implementation:**

```java
// ImmutableList with builder
ImmutableList<String> list = ImmutableList.<String>builder()
    .add("Alice")
    .add("Bob")
    .addAll(Arrays.asList("Charlie", "David"))
    .build();

// ImmutableMap with builder
ImmutableMap<String, Integer> map = ImmutableMap.<String, Integer>builder()
    .put("Alice", 30)
    .put("Bob", 25)
    .put("Charlie", 35)
    .build();

// Cache with builder
LoadingCache<String, User> cache = CacheBuilder.newBuilder()
    .maximumSize(1000)
    .expireAfterWrite(10, TimeUnit.MINUTES)
    .expireAfterAccess(5, TimeUnit.MINUTES)
    .refreshAfterWrite(1, TimeUnit.MINUTES)
    .recordStats()
    .build(new CacheLoader<String, User>() {
        @Override
        public User load(String key) {
            return loadUserFromDatabase(key);
        }
    });
```

**Results:**
- **Immutability:** All collections immutable by default
- **Performance:** Optimized for read-heavy workloads
- **Thread-Safe:** No synchronization needed

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### **Sample Interview Answer**

> "Builder Pattern is a creational pattern that constructs complex objects step-by-step using a fluent API. It's particularly useful when an object has many optional parameters or requires validation during construction.
>
> **The classic problem is the telescoping constructor anti-pattern.** Imagine you have a class with 10 parameters, some required and some optional. You'd need multiple constructor overloads—2^10 combinations in the worst case. The code becomes unreadable with all those null values.
>
> **Builder solves this with a fluent interface:**
> ```java
> User user = User.builder()
>     .email("john@example.com")
>     .name("John Doe")
>     .phone("+1234567890")
>     .address("123 Main St")
>     .build();
> ```
>
> **Key benefits:**
> 1. **Readability:** Self-documenting code—you see exactly what each parameter is
> 2. **Immutability:** The product is typically immutable (all final fields)
> 3. **Validation:** Can validate in the build() method before constructing
> 4. **Default Values:** Builder can provide sensible defaults
> 5. **Optional Parameters:** Only set what you need, skip the rest
>
> **In production systems, I've used builders extensively:**
> - **HTTP clients:** OkHttp and Retrofit use builders for all configuration
> - **Configuration objects:** Database configs, API clients, resilience settings
> - **Query builders:** Constructing SQL or NoSQL queries programmatically
> - **Test data:** Creating test objects with sensible defaults
>
> **The trade-off is verbosity**—you need to write a builder class with all the methods. But this is often auto-generated with Lombok's @Builder annotation, so the cost is minimal.
>
> **When NOT to use Builder:**
> - Objects with 1-3 parameters (simple constructor is fine)
> - All parameters are required (no optionals)
> - Object construction is trivial (no validation needed)
> - Mutable objects preferred (though this is rare)
>
> **Real example:** At my last company, we had an HttpRequest class with 15+ optional parameters (headers, timeouts, retry policies, etc.). Before builders, we had constructors that took 10 parameters with most being null. After refactoring to use builders, code reviews became faster because the intent was clear, and we caught configuration errors at compile-time instead of runtime."

---

### **Common Follow-Up Questions**

#### **Q1: How does Builder Pattern differ from Factory Pattern?**

> "Great question—they're both creational patterns but solve different problems.
>
> **Factory Pattern:** Decides WHICH concrete class to instantiate
> **Builder Pattern:** Constructs complex objects step-by-step
>
> **Factory focuses on polymorphism:**
> ```java
> // Factory: "Give me an Animal"
> Animal animal = AnimalFactory.create("dog");  // Returns Dog instance
> Animal animal = AnimalFactory.create("cat");  // Returns Cat instance
> 
> // The factory decides which concrete class to create
> ```
>
> **Builder focuses on complexity:**
> ```java
> // Builder: "Construct this complex object"
> HttpRequest request = HttpRequest.builder()
>     .url("https://api.example.com")
>     .method("POST")
>     .header("Content-Type", "application/json")
>     .body("{\"data\":\"value\"}")
>     .timeout(5000)
>     .retryPolicy(retryPolicy)
>     .build();
> 
> // Builder handles complex construction with many parameters
> ```
>
> **Key differences:**
>
> | **Aspect** | **Factory** | **Builder** |
> |------------|-------------|-------------|
> | **Purpose** | Select concrete class | Construct complex object |
> | **Focus** | Polymorphism | Complexity |
> | **Returns** | Different types | Same type |
> | **Parameters** | Few (type selection) | Many (construction details) |
> | **Immutability** | Not necessarily | Usually immutable |
> | **Fluent API** | No | Yes |
>
> **They can work together:**
> ```java
> // Factory returns different builders
> NotificationBuilder builder = NotificationFactory.getBuilder("email");
> Notification notification = builder
>     .recipient("user@example.com")
>     .subject("Welcome!")
>     .body("Welcome to our service")
>     .build();
> ```
>
> **In practice:**
> - **Factory:** Use when you need to select between different classes (EmailNotifier vs SMSNotifier)
> - **Builder:** Use when you have one class with many optional parameters (HttpRequest configuration)
>
> **Real example:** AWS SDK uses both. The SDK has factories for creating clients (S3Client, EC2Client), and each client uses builders for configuration. The factory decides which service client to create, and the builder configures that client."

---

#### **Q2: What's the difference between Builder and JavaBeans pattern (setters)?**

> "The JavaBeans pattern uses a no-arg constructor with setters, while Builder uses a fluent API. They seem similar but have significant differences:
>
> **JavaBeans Pattern:**
> ```java
> User user = new User();
> user.setEmail("john@example.com");
> user.setName("John Doe");
> user.setPhone("+1234567890");
> // Object can be in invalid state between setters
> ```
>
> **Builder Pattern:**
> ```java
> User user = User.builder()
>     .email("john@example.com")
>     .name("John Doe")
>     .phone("+1234567890")
>     .build();  // Object only created when fully constructed
> ```
>
> **Key Differences:**
>
> **1. Immutability:**
> - **JavaBeans:** Mutable (has setters, can change after creation)
> - **Builder:** Immutable (no setters, all fields final)
>
> **2. Thread Safety:**
> - **JavaBeans:** Not thread-safe (mutable)
> - **Builder:** Thread-safe (immutable product)
>
> **3. Validity:**
> - **JavaBeans:** Can be in invalid state (between setter calls)
> - **Builder:** Always valid (validated in build())
>
> **4. Readability:**
> - **JavaBeans:** Verbose (separate lines for each setter)
> - **Builder:** Fluent (method chaining)
>
> **Problem with JavaBeans:**
> ```java
> // JavaBeans: Object in invalid state
> User user = new User();
> user.setEmail("john@example.com");
> // user is in invalid state (no name yet)
> 
> // Another thread reads user
> String name = user.getName();  // null! 💥
> 
> user.setName("John Doe");
> // Now it's valid, but too late
> ```
>
> **Builder solves this:**
> ```java
> User user = User.builder()
>     .email("john@example.com")
>     .name("John Doe")
>     .build();  // Object only created when complete
> 
> // user is always in valid state
> // Other threads can safely read it
> ```
>
> **When JavaBeans is OK:**
> - **ORMs/JPA:** Entities need no-arg constructor and setters
> - **JSON/XML libraries:** Some deserializers require setters
> - **Spring beans:** Dependency injection with setters
>
> **When Builder is better:**
> - **DTOs:** Data transfer objects should be immutable
> - **Value objects:** Should never change after creation
> - **Configuration:** Settings should be immutable
> - **API clients:** Request/response objects
>
> **Modern approach (best of both):**
> ```java
> // JPA entity (mutable for ORM)
> @Entity
> public class UserEntity {
>     @Id
>     private Long id;
>     private String email;
>     private String name;
>     
>     // No-arg constructor for JPA
>     protected UserEntity() {}
>     
>     // Setters for JPA
> }
>
> // DTO (immutable for API)
> @Data
> @Builder
> public class UserDTO {
>     private final Long id;
>     private final String email;
>     private final String name;
> }
>
> // Convert entity → DTO
> UserDTO dto = UserDTO.builder()
>     .id(entity.getId())
>     .email(entity.getEmail())
>     .name(entity.getName())
>     .build();
> ```
>
> **Real experience:** We had a bug where a User object was being modified by multiple threads. Some threads were seeing partially updated state (email changed but name not yet). We refactored to use Builder pattern with immutable User objects. The bug disappeared because threads could only see fully constructed, valid User instances. The refactor took 2 days but prevented 10+ future bugs."

---

#### **Q3: How do you handle required vs optional parameters in Builder?**

> "Handling required vs optional parameters is one of the key challenges in Builder design. There are several approaches:
>
> **Approach 1: Validation in build() (Most Common)**
> ```java
> public static class Builder {
>     private String email;      // Required
>     private String name;       // Required
>     private String phone;      // Optional
>     private String address;    // Optional
>     
>     public Builder email(String email) {
>         this.email = email;
>         return this;
>     }
>     
>     public Builder name(String name) {
>         this.name = name;
>         return this;
>     }
>     
>     public User build() {
>         // Validate required fields
>         if (email == null) {
>             throw new IllegalStateException("Email is required");
>         }
>         if (name == null) {
>             throw new IllegalStateException("Name is required");
>         }
>         return new User(this);
>     }
> }
> ```
>
> **Pros:**
> - Simple to implement
> - Clear error messages
> - Flexible (can set in any order)
>
> **Cons:**
> - Runtime error (not compile-time)
> - Can't enforce at type level
>
> ---
>
> **Approach 2: Step Builder (Compile-Time Enforcement)**
> ```java
> // Forces required fields in specific order
> public static EmailStep builder() {
>     return new Builder();
> }
>
> public interface EmailStep {
>     NameStep email(String email);
> }
>
> public interface NameStep {
>     BuildStep name(String name);
> }
>
> public interface BuildStep {
>     BuildStep phone(String phone);    // Optional
>     BuildStep address(String address); // Optional
>     User build();
> }
>
> public static class Builder implements EmailStep, NameStep, BuildStep {
>     private String email;
>     private String name;
>     private String phone;
>     private String address;
>     
>     @Override
>     public NameStep email(String email) {
>         this.email = email;
>         return this;
>     }
>     
>     @Override
>     public BuildStep name(String name) {
>         this.name = name;
>         return this;
>     }
>     
>     @Override
>     public BuildStep phone(String phone) {
>         this.phone = phone;
>         return this;
>     }
>     
>     @Override
>     public User build() {
>         return new User(this);
>     }
> }
>
> // Usage (enforced order)
> User user = User.builder()
>     .email("john@example.com")  // Must be first
>     .name("John Doe")           // Must be second
>     .phone("+1234567890")       // Optional
>     .build();
> ```
>
> **Pros:**
> - Compile-time enforcement
> - Can't forget required fields
> - IDE guides you through steps
>
> **Cons:**
> - Very verbose
> - Complex implementation
> - Fixed order (less flexible)
>
> ---
>
> **Approach 3: Constructor for Required, Builder for Optional**
> ```java
> public class User {
>     private final String email;  // Required
>     private final String name;   // Required
>     private final String phone;  // Optional
>     private final String address; // Optional
>     
>     // Constructor for required fields
>     public User(String email, String name) {
>         this.email = email;
>         this.name = name;
>     }
>     
>     // Static factory method
>     public static Builder builder(String email, String name) {
>         return new Builder(email, name);
>     }
>     
>     public static class Builder {
>         private final String email;  // Required (final in builder)
>         private final String name;   // Required (final in builder)
>         private String phone;        // Optional
>         private String address;      // Optional
>         
>         private Builder(String email, String name) {
>             this.email = email;
>             this.name = name;
>         }
>         
>         public Builder phone(String phone) {
>             this.phone = phone;
>             return this;
>         }
>         
>         public Builder address(String address) {
>             this.address = address;
>             return this;
>         }
>         
>         public User build() {
>             return new User(this);
>         }
>     }
>     
>     private User(Builder builder) {
>         this.email = builder.email;
>         this.name = builder.name;
>         this.phone = builder.phone;
>         this.address = builder.address;
>     }
> }
>
> // Usage
> User user = User.builder("john@example.com", "John Doe")
>     .phone("+1234567890")
>     .address("123 Main St")
>     .build();
> ```
>
> **Pros:**
> - Required fields enforced at builder creation
> - Clear which fields are required
> - Can't create builder without required fields
>
> **Cons:**
> - Not fully fluent (constructor params)
> - Mixing constructor and builder
>
> ---
>
> **Approach 4: Lombok with @NonNull**
> ```java
> @Data
> @Builder
> public class User {
>     @NonNull
>     private final String email;  // Required
>     @NonNull
>     private final String name;   // Required
>     private final String phone;  // Optional
>     private final String address; // Optional
> }
>
> // Build without required field
> User user = User.builder()
>     .phone("+1234567890")
>     .build();  // NullPointerException: email is marked non-null
> ```
>
> **Pros:**
> - Zero boilerplate
> - Runtime validation
> - Clear marking (@NonNull)
>
> **Cons:**
> - Runtime error (not compile-time)
> - Requires Lombok
>
> ---
>
> **My Recommendation:**
>
> **For most cases:** Use Approach 1 (validation in build())
> - Simple
> - Clear error messages
> - Easy to maintain
>
> **For critical APIs:** Use Approach 2 (Step Builder)
> - Compile-time safety
> - Can't make mistakes
> - Worth the complexity for public APIs
>
> **For internal code:** Use Approach 4 (Lombok)
> - Minimal boilerplate
> - Fast to implement
> - Good enough for internal use
>
> **Real example:** We built a payment processing API where incorrect configuration could cause financial loss. We used Step Builder to enforce required fields (amount, currency, merchantId) at compile-time. For optional fields (description, metadata), we used normal builder methods. This prevented production incidents where misconfigured payment requests were submitted."

---

#### **Q4: How do you test code that uses Builder Pattern?**

> "Testing with Builder is actually easier than with constructors because builders make test data creation flexible and readable.
>
> **Approach 1: Test Data Builders**
> ```java
> // Create reusable test builders with sensible defaults
> public class UserTestBuilder {
>     private Long id = 1L;
>     private String email = "test@example.com";
>     private String name = "Test User";
>     private String phone = "+1234567890";
>     private boolean emailVerified = true;
>     
>     public static UserTestBuilder aUser() {
>         return new UserTestBuilder();
>     }
>     
>     public UserTestBuilder withId(Long id) {
>         this.id = id;
>         return this;
>     }
>     
>     public UserTestBuilder withEmail(String email) {
>         this.email = email;
>         return this;
>     }
>     
>     public UserTestBuilder withUnverifiedEmail() {
>         this.emailVerified = false;
>         return this;
>     }
>     
>     public User build() {
>         return User.builder()
>             .id(id)
>             .email(email)
>             .name(name)
>             .phone(phone)
>             .emailVerified(emailVerified)
>             .build();
>     }
> }
>
> // Usage in tests
> @Test
> public void testSendWelcomeEmail() {
>     User user = aUser()
>         .withEmail("john@example.com")
>         .build();
>     
>     emailService.sendWelcomeEmail(user);
>     
>     // Verify email sent
> }
>
> @Test
> public void testUnverifiedUser() {
>     User user = aUser()
>         .withUnverifiedEmail()
>         .build();
>     
>     assertFalse(user.canLogin());
> }
> ```
>
> **Benefits:**
> - **Defaults:** Don't repeat common values in every test
> - **Readability:** Only specify what's different
> - **Maintainability:** Change defaults in one place
>
> ---
>
> **Approach 2: Builder Variations for Edge Cases**
> ```java
> public class UserTestBuilder {
>     
>     // Factory methods for common scenarios
>     public static User adminUser() {
>         return aUser()
>             .withRole("ADMIN")
>             .withAllPermissions()
>             .build();
>     }
>     
>     public static User newUser() {
>         return aUser()
>             .withUnverifiedEmail()
>             .withoutPhone()
>             .build();
>     }
>     
>     public static User suspendedUser() {
>         return aUser()
>             .withStatus("SUSPENDED")
>             .withSuspensionReason("Terms violation")
>             .build();
>     }
> }
>
> // Tests become very readable
> @Test
> public void adminCanAccessAdminPanel() {
>     User admin = adminUser();
>     assertTrue(admin.canAccessAdminPanel());
> }
>
> @Test
> public void newUserMustVerifyEmail() {
>     User newUser = newUser();
>     assertFalse(newUser.canLogin());
> }
> ```
>
> ---
>
> **Approach 3: Parameterized Tests with Builders**
> ```java
> @ParameterizedTest
> @MethodSource("userProvider")
> public void testUserValidation(User user, boolean expectedValid) {
>     assertEquals(expectedValid, validator.isValid(user));
> }
>
> static Stream<Arguments> userProvider() {
>     return Stream.of(
>         Arguments.of(
>             aUser().withEmail("valid@example.com").build(),
>             true
>         ),
>         Arguments.of(
>             aUser().withEmail("invalid-email").build(),
>             false
>         ),
>         Arguments.of(
>             aUser().withEmail(null).build(),
>             false
>         ),
>         Arguments.of(
>             aUser().withName("A").build(),  // Too short
>             false
>         )
>     );
> }
> ```
>
> ---
>
> **Approach 4: Testing the Builder Itself**
> ```java
> @Test
> public void testBuilderValidation() {
>     // Test that build() fails without required fields
>     assertThrows(IllegalStateException.class, () -> {
>         User.builder()
>             .name("John Doe")
>             // Missing email
>             .build();
>     });
> }
>
> @Test
> public void testBuilderDefaults() {
>     User user = User.builder()
>         .email("test@example.com")
>         .name("Test User")
>         .build();
>     
>     // Verify default values
>     assertFalse(user.isEmailVerified());  // Default false
>     assertNotNull(user.getCreatedAt());   // Default now
> }
>
> @Test
> public void testBuilderImmutability() {
>     User user = User.builder()
>         .email("test@example.com")
>         .name("Test User")
>         .build();
>     
>     // Verify object is immutable
>     assertThrows(UnsupportedOperationException.class, () -> {
>         user.setEmail("new@example.com");  // Should not have setter
>     });
> }
> ```
>
> ---
>
> **Approach 5: Mocking Builders (Integration Tests)**
> ```java
> @Test
> public void testServiceWithMockedBuilder() {
>     // Mock the builder
>     HttpRequest.Builder mockBuilder = mock(HttpRequest.Builder.class);
>     HttpRequest mockRequest = mock(HttpRequest.class);
>     
>     when(mockBuilder.url(anyString())).thenReturn(mockBuilder);
>     when(mockBuilder.method(anyString())).thenReturn(mockBuilder);
>     when(mockBuilder.build()).thenReturn(mockRequest);
>     
>     // Inject mock builder
>     HttpClient client = new HttpClient(mockBuilder);
>     
>     // Test
>     client.get("https://api.example.com/users");
>     
>     // Verify
>     verify(mockBuilder).url("https://api.example.com/users");
>     verify(mockBuilder).method("GET");
>     verify(mockBuilder).build();
> }
> ```
>
> ---
>
> **Best Practices:**
>
> 1. **Create test data builders** with sensible defaults
> 2. **Use factory methods** for common scenarios (adminUser(), newUser())
> 3. **Only specify what's different** from defaults in each test
> 4. **Test builder validation** to ensure invalid objects can't be created
> 5. **Test immutability** to verify objects can't be modified after creation
>
> **Real example:** In our payment system, we had 50+ test cases for different payment scenarios. Before test data builders, each test had 10-15 lines just setting up the payment request. After introducing test data builders with defaults, most tests were 3-4 lines. Code reviews became faster because you could immediately see what made each test case unique (e.g., 'withCurrency("EUR")' vs default USD)."

---

#### **Q5: What are common mistakes when implementing Builder Pattern?**

> "I've seen (and made) several mistakes with Builder Pattern. Here are the most common:
>
> **Mistake 1: Not Making the Product Immutable**
> ```java
> // BAD: Mutable product (defeats purpose)
> public class User {
>     private String email;
>     private String name;
>     
>     // Setters (❌ BAD!)
>     public void setEmail(String email) { this.email = email; }
>     public void setName(String name) { this.name = name; }
>     
>     public static class Builder {
>         // ... builder implementation
>     }
> }
>
> // Problem: Can modify after building
> User user = User.builder()
>     .email("john@example.com")
>     .build();
> user.setEmail("hacker@evil.com");  // Oops! Modified!
>
> // GOOD: Immutable product
> public class User {
>     private final String email;  // final = immutable
>     private final String name;
>     
>     // No setters
>     public String getEmail() { return email; }
>     public String getName() { return name; }
> }
> ```
>
> ---
>
> **Mistake 2: Not Validating in build()**
> ```java
> // BAD: No validation
> public User build() {
>     return new User(this);  // Could create invalid object
> }
>
> // GOOD: Validate before construction
> public User build() {
>     if (email == null || !email.contains("@")) {
>         throw new IllegalStateException("Valid email required");
>     }
>     if (name == null || name.length() < 2) {
>         throw new IllegalStateException("Name must be at least 2 characters");
>     }
>     return new User(this);
> }
> ```
>
> ---
>
> **Mistake 3: Not Returning 'this' from Builder Methods**
> ```java
> // BAD: Doesn't return this (can't chain)
> public void email(String email) {
>     this.email = email;
> }
>
> // Can't chain methods
> User.Builder builder = User.builder();
> builder.email("john@example.com");
> builder.name("John Doe");
> User user = builder.build();
>
> // GOOD: Return this (enables chaining)
> public Builder email(String email) {
>     this.email = email;
>     return this;  // ← Return this!
> }
>
> // Can chain methods (fluent API)
> User user = User.builder()
>     .email("john@example.com")
>     .name("John Doe")
>     .build();
> ```
>
> ---
>
> **Mistake 4: Exposing Builder Fields Directly**
> ```java
> // BAD: Public builder fields
> public static class Builder {
>     public String email;  // ❌ Public!
>     public String name;
> }
>
> // Can modify directly (breaks encapsulation)
> User.Builder builder = User.builder();
> builder.email = "john@example.com";  // BAD!
>
> // GOOD: Private fields with methods
> public static class Builder {
>     private String email;  // ✓ Private
>     private String name;
>     
>     public Builder email(String email) {
>         this.email = email;
>         return this;
>     }
> }
> ```
>
> ---
>
> **Mistake 5: Not Making Constructor Private**
> ```java
> // BAD: Public constructor (can bypass builder)
> public class User {
>     public User(String email, String name) {
>         this.email = email;
>         this.name = name;
>     }
> }
>
> // Can create without builder (bypasses validation)
> User user = new User("invalid", "X");  // No validation!
>
> // GOOD: Private constructor
> public class User {
>     private User(Builder builder) {
>         this.email = builder.email;
>         this.name = builder.name;
>     }
> }
>
> // Must use builder (validation guaranteed)
> ```
>
> ---
>
> **Mistake 6: Copying Mutable Collections Incorrectly**
> ```java
> // BAD: Storing reference to mutable collection
> public static class Builder {
>     private List<String> tags;
>     
>     public Builder tags(List<String> tags) {
>         this.tags = tags;  // ❌ Stores reference!
>         return this;
>     }
> }
>
> // Product's collection can be modified externally
> List<String> tags = new ArrayList<>(Arrays.asList("java", "spring"));
> User user = User.builder().tags(tags).build();
> tags.add("hacked");  // Oops! Modified user's tags!
>
> // GOOD: Defensive copy
> public Builder tags(List<String> tags) {
>     this.tags = new ArrayList<>(tags);  // ✓ Copy
>     return this;
> }
>
> // In product
> private User(Builder builder) {
>     this.tags = List.copyOf(builder.tags);  // Immutable copy
> }
> ```
>
> ---
>
> **Mistake 7: Using Builder for Simple Objects**
> ```java
> // BAD: Overkill for simple object
> public class Point {
>     private final int x;
>     private final int y;
>     
>     public static class Builder {
>         private int x;
>         private int y;
>         
>         public Builder x(int x) { this.x = x; return this; }
>         public Builder y(int y) { this.y = y; return this; }
>         public Point build() { return new Point(this); }
>     }
> }
>
> // 15 lines of code for 2 fields!
>
> // GOOD: Simple constructor
> public class Point {
>     private final int x;
>     private final int y;
>     
>     public Point(int x, int y) {
>         this.x = x;
>         this.y = y;
>     }
> }
> ```
>
> ---
>
> **Mistake 8: Not Handling Null Values**
> ```java
> // BAD: Doesn't handle nulls
> public Builder tags(List<String> tags) {
>     this.tags = new ArrayList<>(tags);  // NullPointerException if tags is null!
>     return this;
> }
>
> // GOOD: Handle nulls gracefully
> public Builder tags(List<String> tags) {
>     this.tags = tags != null ? new ArrayList<>(tags) : new ArrayList<>();
>     return this;
> }
> ```
>
> ---
>
> **Mistake 9: Forgetting to Document Required Fields**
> ```java
> // BAD: No documentation
> public static Builder builder() {
>     return new Builder();
> }
>
> // GOOD: Clear documentation
> /**
>  * Creates a new User builder.
>  * 
>  * Required fields:
>  * - email
>  * - name
>  * 
>  * Optional fields:
>  * - phone
>  * - address
>  */
> public static Builder builder() {
>     return new Builder();
> }
> ```
>
> ---
>
> **Mistake 10: Not Thread-Safe Builder (When Reused)**
> ```java
> // BAD: Reusing builder across threads
> User.Builder builder = User.builder();
>
> // Thread 1
> builder.email("user1@example.com");
>
> // Thread 2
> builder.email("user2@example.com");  // Overwrites!
>
> // GOOD: Create new builder per object
> User user1 = User.builder()
>     .email("user1@example.com")
>     .build();
>
> User user2 = User.builder()
>     .email("user2@example.com")
>     .build();
> ```
>
> ---
>
> **Key Takeaways:**
>
> 1. **Make product immutable** (all final fields, no setters)
> 2. **Validate in build()** (fail fast with clear messages)
> 3. **Return 'this'** from all builder methods (fluent API)
> 4. **Make constructor private** (force usage of builder)
> 5. **Defensive copy** mutable collections
> 6. **Don't use for simple objects** (2-3 fields)
> 7. **Document required fields** clearly
> 8. **Handle nulls** gracefully
> 9. **Don't reuse builders** across threads
>
> In interviews, mentioning these pitfalls shows you've actually implemented builders in production and understand the nuances beyond the textbook definition."

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### **Builder Pattern Structure**

```
BUILDER PATTERN
═══════════════

┌─────────────────────────────────────┐
│            Client                   │
│                                     │
│  User user = User.builder()        │
│      .email("john@example.com")     │
│      .name("John Doe")              │
│      .phone("+1234567890")          │
│      .build();                      │
└──────────────┬──────────────────────┘
               │ uses
               ↓
┌─────────────────────────────────────┐
│   User (Product)                    │
│                                     │
│   - email: String (final)           │
│   - name: String (final)            │
│   - phone: String (final)           │
│                                     │
│   - User(Builder)  [private]        │
│   + builder(): Builder [static]     │
│   + getEmail(): String              │
│   + getName(): String               │
│   + getPhone(): String              │
└──────────────┬──────────────────────┘
               │ contains
               ↓
┌─────────────────────────────────────┐
│   User.Builder (Nested)             │
│                                     │
│   - email: String                   │
│   - name: String                    │
│   - phone: String                   │
│                                     │
│   + email(String): Builder          │
│   + name(String): Builder           │
│   + phone(String): Builder          │
│   + build(): User                   │
└─────────────────────────────────────┘


FLOW:
═════
1. Client creates builder
2. Sets fields via fluent methods
3. Calls build() to validate and create product
4. Product is immutable


KEY BENEFITS:
═════════════
✓ Fluent API (readable)
✓ Immutable product
✓ Validation before construction
✓ Optional parameters
✓ Default values
```

---

### **Telescoping Constructor vs Builder**

```
TELESCOPING CONSTRUCTOR ANTI-PATTERN
════════════════════════════════════

public class HttpRequest {
    // 1-param constructor
    public HttpRequest(String url) { ... }
    
    // 2-param constructor
    public HttpRequest(String url, String method) { ... }
    
    // 3-param constructor
    public HttpRequest(String url, String method, Map headers) { ... }
    
    // 4-param constructor
    public HttpRequest(String url, String method, Map headers, String body) { ... }
    
    // 5-param constructor (and counting...)
    public HttpRequest(String url, String method, Map headers, String body, int timeout) { ... }
}

Problems:
❌ 2^n constructors (combinatorial explosion)
❌ Must pass null for unwanted parameters
❌ Hard to remember parameter order
❌ Can't have multiple constructors with same types


BUILDER PATTERN SOLUTION
═════════════════════════

public class HttpRequest {
    private final String url;
    private final String method;
    private final Map<String, String> headers;
    private final String body;
    private final int timeout;
    
    private HttpRequest(Builder builder) { ... }
    
    public static class Builder {
        public Builder url(String url) { ... return this; }
        public Builder method(String method) { ... return this; }
        public Builder header(String k, String v) { ... return this; }
        public Builder body(String body) { ... return this; }
        public Builder timeout(int timeout) { ... return this; }
        public HttpRequest build() { ... }
    }
}

Usage:
HttpRequest req = HttpRequest.builder()
    .url("https://api.example.com")
    .method("POST")
    .body("{\"data\":\"value\"}")
    .timeout(5000)
    .build();

Benefits:
✓ 1 builder class (not 2^n constructors)
✓ No null values
✓ Self-documenting (clear what each param is)
✓ Any order
✓ Easy to add new parameters (backward compatible)
```

---

### **Builder Pattern Evolution**

```
PHASE 1: SIMPLE CONSTRUCTOR
═══════════════════════════

User user = new User("john@example.com", "John Doe");

Problem: Can't add optional parameters without breaking existing code


PHASE 2: TELESCOPING CONSTRUCTORS
══════════════════════════════════

User user = new User(
    "john@example.com",
    "John Doe",
    "+1234567890",
    "123 Main St",
    null,  // city
    null   // country
);

Problem: Too many nulls, hard to read


PHASE 3: JAVABEANS (SETTERS)
═════════════════════════════

User user = new User();
user.setEmail("john@example.com");
user.setName("John Doe");
user.setPhone("+1234567890");

Problem: Mutable, not thread-safe, can be in invalid state


PHASE 4: BUILDER PATTERN
═════════════════════════

User user = User.builder()
    .email("john@example.com")
    .name("John Doe")
    .phone("+1234567890")
    .address("123 Main St")
    .build();

Solution:
✓ Fluent API (readable)
✓ Immutable (thread-safe)
✓ Validated (always valid state)
✓ Optional parameters (no nulls)
✓ Backward compatible (add new fields without breaking)


PHASE 5: LOMBOK @Builder
═════════════════════════

@Data
@Builder
public class User {
    private final String email;
    private final String name;
    private final String phone;
}

// Builder auto-generated

Solution: Zero boilerplate, same benefits
```

---

### **Step Builder (Enforced Order)**

```
STEP BUILDER PATTERN
════════════════════

Enforces required fields in specific order at compile-time

      ┌─────────┐
      │ Client  │
      └────┬────┘
           │
           │ User.builder()
           ↓
      ┌─────────┐
      │EmailStep│
      └────┬────┘
           │
           │ .email("john@example.com")
           ↓
      ┌─────────┐
      │NameStep │
      └────┬────┘
           │
           │ .name("John Doe")
           ↓
      ┌─────────┐
      │BuildStep│ ← Optional fields
      └────┬────┘
           │
           │ .phone("+1234567890")
           │ .address("123 Main St")
           ↓
      ┌─────────┐
      │  .build()│
      └────┬────┘
           │
           ↓
      ┌─────────┐
      │  User   │ ← Immutable product
      └─────────┘


Code Structure:
═══════════════

public interface EmailStep {
    NameStep email(String email);
}

public interface NameStep {
    BuildStep name(String name);
}

public interface BuildStep {
    BuildStep phone(String phone);    // Optional
    BuildStep address(String address); // Optional
    User build();
}

public static class Builder 
    implements EmailStep, NameStep, BuildStep {
    // Implementation
}


Compile-time safety:
════════════════════

✓ Can't skip email (must call first)
✓ Can't skip name (must call after email)
✓ Can skip phone/address (optional)
✓ IDE auto-complete guides through steps
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### **Why It Matters**

**Engineering Impact:**
- **Readability:** Self-documenting code (clear what each parameter is)
- **Immutability:** Thread-safe objects (no synchronization needed)
- **Validation:** Enforced at build time (fail fast with clear errors)
- **Maintainability:** Add new optional fields without breaking existing code
- **Testability:** Easy to create test data with sensible defaults

**Business Impact:**
- **Fewer Bugs:** Immutable objects eliminate entire class of concurrency bugs
- **Faster Development:** 24x faster to add new optional parameters
- **Better Code Reviews:** Self-documenting code speeds reviews by 6x
- **Lower Incident Rate:** Validation prevents invalid configurations (50K/month savings in one case)

**Real Numbers:**
```
E-commerce company:

Before Builder (Telescoping Constructors):
- 15 constructor overloads for HttpRequest
- Adding new parameter: 2 hours (update all 15 constructors)
- Bugs from wrong constructor: 5/month
- Incident cost: $10K/month

After Builder:
- 1 builder class
- Adding new parameter: 5 minutes (add one method)
- Bugs from wrong constructor: 0
- Incident cost: $0

ROI: Implementation (1 week) recovered in first month
```

---

### **How It Works (Simple Summary)**

**Core Concept:**
Builder Pattern constructs complex objects step-by-step using a fluent API, separating construction from representation.

**Structure:**
1. **Product:** Complex object with many fields (usually immutable)
2. **Builder:** Nested class with fluent methods for each field
3. **build():** Validates and constructs the product
4. **Private constructor:** Forces usage of builder

**Example:**
```java
// Define product with builder
public class User {
    private final String email;
    private final String name;
    private final String phone;
    
    private User(Builder builder) {
        this.email = builder.email;
        this.name = builder.name;
        this.phone = builder.phone;
    }
    
    public static Builder builder() {
        return new Builder();
    }
    
    public static class Builder {
        private String email;
        private String name;
        private String phone;
        
        public Builder email(String email) {
            this.email = email;
            return this;  // Return this for chaining
        }
        
        public Builder name(String name) {
            this.name = name;
            return this;
        }
        
        public Builder phone(String phone) {
            this.phone = phone;
            return this;
        }
        
        public User build() {
            if (email == null) throw new IllegalStateException("Email required");
            if (name == null) throw new IllegalStateException("Name required");
            return new User(this);
        }
    }
}

// Usage
User user = User.builder()
    .email("john@example.com")
    .name("John Doe")
    .phone("+1234567890")
    .build();
```

---

### **Key Trade-Offs**

| **Aspect** | **With Builder** | **Without Builder** |
|------------|------------------|---------------------|
| **Readability** | High (self-documenting) | Low (positional params) |
| **Code Size** | More (builder class) | Less (just constructor) |
| **Immutability** | Easy (final fields) | Hard (setters needed) |
| **Validation** | Centralized (build()) | Scattered (constructor) |
| **Optional Params** | Easy (fluent methods) | Hard (many constructors) |
| **Backward Compat** | Easy (add methods) | Hard (change signature) |
| **Learning Curve** | Medium (pattern knowledge) | Low (basic Java) |
| **Performance** | Slightly slower (object allocation) | Faster (direct construction) |

---

### **Decision Framework**

```
Should I Use Builder Pattern?
═════════════════════════════

✅ Use Builder When:
- 4+ optional parameters
- Object should be immutable
- Complex validation required
- Default values needed
- Frequent addition of new optional fields
- API will be used by many developers

❌ Skip Builder When:
- 1-3 total parameters
- All parameters required
- Simple object (no validation)
- Mutable object preferred
- Internal class (not part of public API)
- Performance critical (every nanosecond matters)

🤔 Consider Builder When:
- 3-4 parameters (borderline)
- Testing needs (test data builders)
- Configuration objects
- Request/response objects
- DTOs with optional fields
```

---

### **Final Thoughts for FAANG Interviews**

✅ **Clearly Explain the Problem**
- "Telescoping constructor anti-pattern leads to unreadable code with many null values"
- "Builder provides a fluent API for constructing complex objects"

✅ **Emphasize Immutability**
- "Builder creates immutable objects, which are thread-safe by default"
- "All fields are final, no setters after construction"

✅ **Provide Real Examples**
- OkHttp: HTTP client configuration
- AWS SDK: Request builders for every operation
- Spring: RestTemplate, WebClient builders
- Lombok: @Builder annotation for zero boilerplate

✅ **Discuss Validation**
- "Validation happens in build() method before object creation"
- "Fail fast with clear error messages"
- "Can't create invalid objects"

✅ **Know When NOT to Use**
- "Builder is overkill for simple objects with 1-3 fields"
- "Use simple constructor or factory for trivial cases"
- "Don't add complexity without benefit"

✅ **Show Variations**
- Classic Builder (fluent API)
- Step Builder (enforced order)
- Lombok @Builder (zero boilerplate)
- Test Data Builders (for testing)

**Interview Script:**
> "Builder Pattern constructs complex objects step-by-step using a fluent API. It's especially useful when you have many optional parameters—instead of telescoping constructors with 10+ overloads, you have one builder with clear, chainable methods.
>
> The key benefits are readability, immutability, and validation. The product is typically immutable with all final fields, making it thread-safe. Validation happens in the build() method, so you can't create invalid objects.
>
> Real examples include OkHttp's HTTP client, AWS SDK requests, and Spring's RestTemplate. In production, I've used builders for configuration objects, API requests, and test data.
>
> The trade-off is more code—you need a full builder class. But with Lombok's @Builder, that's auto-generated. The pattern is worth it when you have 4+ optional parameters or need immutable, validated objects.
>
> I avoid using Builder for simple 1-3 field objects where a constructor is clearer. The pattern should simplify your code, not complicate it."

---

**End of Topic 182: Builder Pattern**
