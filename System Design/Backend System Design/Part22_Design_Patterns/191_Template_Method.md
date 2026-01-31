# 191. Template Method

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

The **Template Method Pattern** is a behavioral design pattern that defines the skeleton of an algorithm in a base class but lets subclasses override specific steps of the algorithm without changing its structure. It's one of the most fundamental patterns for creating reusable algorithms with customizable behavior.

**What it is:**
- A pattern where a base class defines the algorithm's structure
- Abstract or hook methods allow subclasses to customize specific steps
- The template method itself is `final` to prevent modification of the algorithm structure
- Uses inheritance to share common code and enforce consistent workflows
- Implements the "Hollywood Principle" - "Don't call us, we'll call you"

**Why it exists:**
- Eliminates code duplication across similar algorithms
- Enforces consistent algorithm structure while allowing variation
- Centralizes invariant behavior in one place
- Provides control points for extension without modification
- Ensures proper ordering of operations
- Facilitates testing by allowing mock implementations

**The problem it solves:**
- Multiple classes implement similar algorithms with slight variations
- Duplicate code across implementations of similar workflows
- Need to ensure consistent execution order of operations
- Want to share common behavior while allowing customization
- Need to enforce certain steps while making others optional
- Desire to prevent algorithm structure modification

**Where and when it is used:**
- Data processing pipelines (ETL: Extract, Transform, Load)
- Test frameworks (JUnit setUp, test, tearDown)
- Spring Boot lifecycle methods (init, process, destroy)
- Database connection management (open, execute, close)
- HTTP request processing (preHandle, handle, postHandle)
- File parsing (open, parse, validate, close)
- Order processing workflows (validate, process payment, fulfill, notify)
- Report generation (fetch data, format, render, export)

**Role in large-scale distributed systems:**
- Standardizes microservice request processing
- Ensures consistent error handling across services
- Provides uniform logging and metrics collection
- Enforces security checks and validation steps
- Standardizes retry and timeout logic
- Facilitates compliance and audit requirements
- Enables consistent health checks and monitoring

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Core Components

1. **Abstract Class**: Defines the template method and abstract operations
2. **Template Method**: Defines algorithm skeleton (usually `final`)
3. **Abstract Operations**: Must be implemented by subclasses
4. **Hook Methods**: Optional operations with default implementations
5. **Concrete Classes**: Implement abstract operations

### System Architecture & Component Boundaries

```
┌─────────────────────────────────────┐
│      AbstractTemplate               │
│                                     │
│  + final templateMethod()           │◄─── Fixed algorithm structure
│  # abstract step1()                 │
│  # abstract step2()                 │
│  # hook step3() { }                 │◄─── Optional override
│  - finalStep()                      │◄─── Cannot be overridden
└─────────────────▲───────────────────┘
                  │
                  │ extends
          ┌───────┴────────┐
          │                │
┌─────────┴────────┐  ┌────┴──────────┐
│  ConcreteClass1  │  │ ConcreteClass2│
│                  │  │               │
│  + step1()       │  │ + step1()     │
│  + step2()       │  │ + step2()     │
│  + step3()       │  │ + step3()     │
└──────────────────┘  └───────────────┘
```

### Algorithm Structure & Flow

**Template Method (Base Class):**
```java
public abstract class DataProcessor {
    
    // Template method - FINAL to prevent modification
    public final ProcessResult process() {
        try {
            // Step 1: Validate input (required)
            validate();
            
            // Step 2: Connect to data source (required)
            connect();
            
            // Step 3: Extract data (required)
            Data data = extract();
            
            // Step 4: Transform data (required)
            Data transformed = transform(data);
            
            // Step 5: Optional preprocessing (hook)
            preLoad(transformed);
            
            // Step 6: Load data (required)
            load(transformed);
            
            // Step 7: Optional postprocessing (hook)
            postLoad();
            
            // Step 8: Cleanup (always executed)
            return success();
            
        } catch (Exception e) {
            // Step 9: Error handling (overridable)
            return handleError(e);
        } finally {
            // Step 10: Cleanup (always executed)
            cleanup();
        }
    }
    
    // Required steps - must be implemented
    protected abstract void validate();
    protected abstract void connect();
    protected abstract Data extract();
    protected abstract Data transform(Data data);
    protected abstract void load(Data data);
    
    // Optional hooks - default implementation
    protected void preLoad(Data data) {
        // Do nothing by default
    }
    
    protected void postLoad() {
        // Do nothing by default
    }
    
    // Error handling - can be overridden
    protected ProcessResult handleError(Exception e) {
        logger.error("Processing failed", e);
        return ProcessResult.failure(e);
    }
    
    // Cleanup - final, cannot be overridden
    private void cleanup() {
        closeConnections();
        releaseResources();
    }
}
```

### Hook Methods vs Abstract Methods

**Abstract Methods (Required):**
```java
protected abstract Data extract();  // Must be implemented
```

**Hook Methods (Optional):**
```java
protected void preProcess(Data data) {
    // Default: do nothing
    // Subclass can override if needed
}
```

**Template Methods (Fixed Structure):**
```java
public final Result process() {
    // Algorithm structure cannot be changed
    step1();
    step2();
    step3();
    return result();
}
```

### Concrete Implementation Example

```java
// CSV Data Processor
public class CsvDataProcessor extends DataProcessor {
    private final String filePath;
    private BufferedReader reader;
    
    @Override
    protected void validate() {
        if (filePath == null || !new File(filePath).exists()) {
            throw new ValidationException("Invalid file path");
        }
    }
    
    @Override
    protected void connect() {
        try {
            reader = new BufferedReader(new FileReader(filePath));
            logger.info("Connected to CSV file: {}", filePath);
        } catch (IOException e) {
            throw new ConnectionException("Failed to open file", e);
        }
    }
    
    @Override
    protected Data extract() {
        List<String[]> rows = new ArrayList<>();
        String line;
        
        try {
            while ((line = reader.readLine()) != null) {
                rows.add(line.split(","));
            }
        } catch (IOException e) {
            throw new ExtractionException("Failed to read CSV", e);
        }
        
        return new Data(rows);
    }
    
    @Override
    protected Data transform(Data data) {
        // Transform CSV rows to domain objects
        List<Customer> customers = data.getRows().stream()
            .skip(1) // Skip header
            .map(row -> new Customer(row[0], row[1], row[2]))
            .collect(Collectors.toList());
        
        return new Data(customers);
    }
    
    @Override
    protected void load(Data data) {
        customerRepository.saveAll(data.getCustomers());
        logger.info("Loaded {} customers", data.size());
    }
    
    @Override
    protected void preLoad(Data data) {
        // Optional: Remove duplicates before loading
        data.removeDuplicates();
    }
}

// Database Data Processor
public class DatabaseDataProcessor extends DataProcessor {
    private final DataSource dataSource;
    private Connection connection;
    
    @Override
    protected void validate() {
        if (dataSource == null) {
            throw new ValidationException("DataSource is null");
        }
    }
    
    @Override
    protected void connect() {
        try {
            connection = dataSource.getConnection();
            logger.info("Connected to database");
        } catch (SQLException e) {
            throw new ConnectionException("Failed to connect", e);
        }
    }
    
    @Override
    protected Data extract() {
        try (Statement stmt = connection.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT * FROM customers");
            
            List<Customer> customers = new ArrayList<>();
            while (rs.next()) {
                customers.add(new Customer(
                    rs.getString("name"),
                    rs.getString("email"),
                    rs.getString("phone")
                ));
            }
            
            return new Data(customers);
        } catch (SQLException e) {
            throw new ExtractionException("Failed to query database", e);
        }
    }
    
    @Override
    protected Data transform(Data data) {
        // Transform database records
        data.getCustomers().forEach(customer -> {
            customer.normalizeEmail();
            customer.formatPhone();
        });
        
        return data;
    }
    
    @Override
    protected void load(Data data) {
        elasticsearchService.indexAll(data.getCustomers());
        logger.info("Indexed {} customers", data.size());
    }
}
```

### Spring Boot Integration

**Template Method in Spring:**
```java
@Component
public abstract class AbstractRequestHandler {
    
    @Autowired
    protected MetricsService metrics;
    
    @Autowired
    protected AuditService audit;
    
    // Template method
    public final Response handle(Request request) {
        String requestId = UUID.randomUUID().toString();
        long startTime = System.currentTimeMillis();
        
        try {
            // Authentication
            authenticate(request);
            
            // Authorization
            authorize(request);
            
            // Validation
            validate(request);
            
            // Business logic (subclass-specific)
            Response response = doHandle(request);
            
            // Post-processing hook
            postProcess(request, response);
            
            // Metrics
            long duration = System.currentTimeMillis() - startTime;
            metrics.recordSuccess(getClass().getSimpleName(), duration);
            
            // Audit
            audit.log(requestId, request, response, "SUCCESS");
            
            return response;
            
        } catch (Exception e) {
            metrics.recordFailure(getClass().getSimpleName(), e);
            audit.log(requestId, request, null, "FAILED", e);
            return handleError(request, e);
        }
    }
    
    // Required step
    protected abstract Response doHandle(Request request);
    
    // Optional hooks with default implementations
    protected void authenticate(Request request) {
        // Default: Check JWT token
        String token = request.getHeader("Authorization");
        if (!jwtService.isValid(token)) {
            throw new UnauthorizedException();
        }
    }
    
    protected void authorize(Request request) {
        // Default: Allow all authenticated requests
        // Subclasses can override for specific permissions
    }
    
    protected void validate(Request request) {
        // Default: Basic validation
        if (request.getBody() == null) {
            throw new ValidationException("Request body is required");
        }
    }
    
    protected void postProcess(Request request, Response response) {
        // Hook for subclasses
    }
    
    protected Response handleError(Request request, Exception e) {
        if (e instanceof ValidationException) {
            return Response.badRequest(e.getMessage());
        } else if (e instanceof UnauthorizedException) {
            return Response.unauthorized(e.getMessage());
        } else {
            return Response.internalError("Internal server error");
        }
    }
}

// Concrete handler
@RestController
@RequestMapping("/api/orders")
public class OrderHandler extends AbstractRequestHandler {
    
    @Autowired
    private OrderService orderService;
    
    @PostMapping
    public Response createOrder(@RequestBody Request request) {
        return handle(request);  // Uses template method
    }
    
    @Override
    protected Response doHandle(Request request) {
        Order order = request.getBody(Order.class);
        Order created = orderService.createOrder(order);
        return Response.ok(created);
    }
    
    @Override
    protected void validate(Request request) {
        super.validate(request);  // Call parent validation
        
        // Additional validation
        Order order = request.getBody(Order.class);
        if (order.getItems().isEmpty()) {
            throw new ValidationException("Order must have at least one item");
        }
    }
    
    @Override
    protected void authorize(Request request) {
        // Order-specific authorization
        User user = request.getUser();
        if (!user.hasRole("CUSTOMER")) {
            throw new ForbiddenException("Only customers can create orders");
        }
    }
}
```

### Performance Considerations

**Problem: Template Method Overhead**
```java
// Each method call has overhead
public final Result process() {
    step1();  // Virtual method call
    step2();  // Virtual method call
    step3();  // Virtual method call
    return result();
}
```

**Solution: Inline Critical Paths**
```java
// For hot paths, consider strategy pattern instead
public interface ProcessingStrategy {
    Result process(Data data);
}

// Direct implementation without virtual calls
public class FastProcessor implements ProcessingStrategy {
    public Result process(Data data) {
        // All steps inlined
        validateData(data);
        Data transformed = transformData(data);
        saveData(transformed);
        return Result.success();
    }
}
```

**Caching Hook Results:**
```java
public abstract class CachedTemplateProcessor {
    private final Map<String, Result> cache = new ConcurrentHashMap<>();
    
    public final Result process(String key, Data data) {
        // Check cache before processing
        return cache.computeIfAbsent(key, k -> {
            return doProcess(data);
        });
    }
    
    private Result doProcess(Data data) {
        // Standard template method
        validate(data);
        transform(data);
        return load(data);
    }
}
```

### Trade-offs at FAANG Scale

| Decision | Benefit | Cost | When to Use |
|----------|---------|------|-------------|
| **Template Method** | Code reuse, consistent flow | Inheritance coupling | Similar algorithms with variations |
| **Strategy Pattern** | Composition, flexible | More classes | Completely different algorithms |
| **Hook Methods** | Optional customization | Can be forgotten | Optional behaviors |
| **Abstract Methods** | Forced implementation | All subclasses must implement | Required behaviors |
| **Final Template** | Prevents modification | Less flexible | Fixed algorithm structure |
| **Open Template** | Allows override | Can break consistency | Flexible algorithm structure |

### Design Decisions at FAANG-Scale

**When to Use Template Method:**
- ✅ Multiple implementations share significant common code
- ✅ Algorithm structure is well-defined and stable
- ✅ Need to enforce consistent workflow
- ✅ Want to centralize invariant behavior
- ✅ Subclasses vary in only specific steps

**When NOT to Use Template Method:**
- ❌ Algorithms are completely different
- ❌ Need to combine behaviors from multiple sources (use composition)
- ❌ Algorithm structure changes frequently
- ❌ Performance is critical (virtual method overhead)
- ❌ Prefer composition over inheritance

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Example: ETL Pipeline Processing

**Assumptions:**
- Process 10 million records/hour
- 5 data sources (CSV, Database, API, S3, Kafka)
- Each source uses template method pattern
- Average record size: 1KB
- Processing steps: Extract (20ms) → Transform (30ms) → Load (50ms)

**Processing Capacity:**
```
Per Record Processing Time:
- Extract: 20ms
- Transform: 30ms
- Load: 50ms
- Overhead (method calls, validation): 10ms
Total: 110ms per record

Records per second per thread:
1000ms / 110ms = 9.09 records/second

Required throughput:
10,000,000 records/hour = 2,778 records/second

Required threads:
2,778 / 9.09 ≈ 306 threads

With thread pool overhead (70% efficiency):
306 / 0.7 ≈ 437 threads

With redundancy (2x):
437 * 2 = 874 threads

Servers (32 cores per server, 2 threads per core):
874 / (32 * 2) = 874 / 64 ≈ 14 servers
```

**Memory Requirements:**
```
Per Record Memory:
- Record data: 1KB
- Processing buffer: 2KB
- Overhead: 1KB
Total: 4KB per record

Batch Size: 1000 records

Memory per batch:
1000 * 4KB = 4MB

Concurrent batches (437 threads):
437 * 4MB = 1,748MB ≈ 1.7GB

With JVM overhead (heap, metaspace):
1.7GB * 3 = 5.1GB per server

Total memory across 14 servers:
14 * 5.1GB ≈ 72GB
```

**Storage Requirements:**
```
Daily data volume:
10M records/hour * 24 hours = 240M records/day

Storage per record: 1KB

Daily storage:
240M * 1KB = 240GB/day

With replication (3x):
240GB * 3 = 720GB/day

Monthly storage:
720GB * 30 = 21.6TB/month

With compression (50% reduction):
21.6TB * 0.5 = 10.8TB/month
```

**Latency Budget:**
```
Target: Process batch of 1000 records in < 2 minutes

Actual:
1000 records * 110ms = 110,000ms = 110 seconds = 1.83 minutes ✅

P95 latency (with outliers):
110ms * 1.5 = 165ms per record
1000 * 165ms = 165 seconds = 2.75 minutes ❌

Need optimization:
- Parallel processing within template steps
- Batch database operations
- Async loading
```

**Why These Numbers Matter:**
- Template method overhead (method calls) adds ~10ms per record
- Virtual method dispatch impacts performance at scale
- Need to balance code reuse vs performance
- Hook methods should be lightweight (< 5ms)
- Consider caching for expensive validation steps

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Template Configuration Storage

**Dynamic Template Configuration:**
```sql
CREATE TABLE processing_templates (
    id BIGSERIAL PRIMARY KEY,
    template_name VARCHAR(100) UNIQUE NOT NULL,
    template_class VARCHAR(255) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    config JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE template_steps (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES processing_templates(id),
    step_name VARCHAR(100) NOT NULL,
    step_order INT NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'REQUIRED', 'OPTIONAL', 'HOOK'
    timeout_ms INT DEFAULT 30000,
    retry_count INT DEFAULT 3,
    config JSONB,
    UNIQUE(template_id, step_order)
);

CREATE INDEX idx_template_steps ON template_steps(template_id, step_order);

-- Example data
INSERT INTO processing_templates (template_name, template_class, config)
VALUES ('csv_processor', 'com.example.CsvDataProcessor', '{"batch_size": 1000}');

INSERT INTO template_steps (template_id, step_name, step_order, step_type, timeout_ms)
VALUES 
    (1, 'validate', 1, 'REQUIRED', 5000),
    (1, 'connect', 2, 'REQUIRED', 10000),
    (1, 'extract', 3, 'REQUIRED', 60000),
    (1, 'transform', 4, 'REQUIRED', 30000),
    (1, 'preLoad', 5, 'OPTIONAL', 10000),
    (1, 'load', 6, 'REQUIRED', 120000),
    (1, 'postLoad', 7, 'OPTIONAL', 5000);
```

**Template Execution Metrics:**
```sql
CREATE TABLE template_executions (
    id BIGSERIAL PRIMARY KEY,
    template_id BIGINT NOT NULL REFERENCES processing_templates(id),
    execution_id VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'RUNNING', 'SUCCESS', 'FAILED'
    records_processed INT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_ms BIGINT,
    error_message TEXT
) PARTITION BY RANGE (started_at);

CREATE TABLE template_step_metrics (
    id BIGSERIAL PRIMARY KEY,
    execution_id VARCHAR(100) NOT NULL,
    step_name VARCHAR(100) NOT NULL,
    duration_ms BIGINT NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE INDEX idx_step_metrics ON template_step_metrics(execution_id, step_name);
CREATE INDEX idx_step_performance ON template_step_metrics(step_name, duration_ms);

-- Partitions (daily)
CREATE TABLE template_executions_2026_01_26 PARTITION OF template_executions
    FOR VALUES FROM ('2026-01-26') TO ('2026-01-27');

CREATE TABLE template_step_metrics_2026_01_26 PARTITION OF template_step_metrics
    FOR VALUES FROM ('2026-01-26') TO ('2026-01-27');
```

### Caching Template Results

**Redis Cache for Template Validations:**
```java
@Component
public abstract class CachedDataProcessor extends DataProcessor {
    
    @Autowired
    private RedisTemplate<String, ValidationResult> redis;
    
    @Override
    protected void validate() {
        String cacheKey = buildCacheKey();
        
        // Check cache
        ValidationResult cached = redis.opsForValue().get(cacheKey);
        if (cached != null && cached.isValid()) {
            logger.debug("Validation cache hit for {}", cacheKey);
            return;
        }
        
        // Perform validation
        ValidationResult result = doValidate();
        
        // Cache result (5 minutes)
        redis.opsForValue().set(cacheKey, result, Duration.ofMinutes(5));
    }
    
    protected abstract String buildCacheKey();
    protected abstract ValidationResult doValidate();
}
```

### Template Execution State Management

```java
@Service
public class TemplateExecutionTracker {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public String startExecution(Long templateId) {
        String executionId = UUID.randomUUID().toString();
        
        jdbcTemplate.update(
            "INSERT INTO template_executions (template_id, execution_id, status, started_at) " +
            "VALUES (?, ?, 'RUNNING', NOW())",
            templateId, executionId
        );
        
        return executionId;
    }
    
    public void recordStepMetric(String executionId, String stepName, long durationMs, boolean success, String error) {
        jdbcTemplate.update(
            "INSERT INTO template_step_metrics (execution_id, step_name, duration_ms, success, error_message) " +
            "VALUES (?, ?, ?, ?, ?)",
            executionId, stepName, durationMs, success, error
        );
    }
    
    public void completeExecution(String executionId, int recordsProcessed, boolean success, String error) {
        jdbcTemplate.update(
            "UPDATE template_executions " +
            "SET status = ?, records_processed = ?, completed_at = NOW(), " +
            "    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000, " +
            "    error_message = ? " +
            "WHERE execution_id = ?",
            success ? "SUCCESS" : "FAILED", recordsProcessed, error, executionId
        );
    }
}
```

**Instrumented Template Method:**
```java
public abstract class MonitoredDataProcessor extends DataProcessor {
    
    @Autowired
    private TemplateExecutionTracker tracker;
    
    @Autowired
    private MetricsService metrics;
    
    @Override
    public final ProcessResult process() {
        String executionId = tracker.startExecution(getTemplateId());
        int recordsProcessed = 0;
        
        try {
            recordsProcessed = executeWithMetrics(executionId);
            tracker.completeExecution(executionId, recordsProcessed, true, null);
            return ProcessResult.success(recordsProcessed);
            
        } catch (Exception e) {
            tracker.completeExecution(executionId, recordsProcessed, false, e.getMessage());
            return ProcessResult.failure(e);
        }
    }
    
    private int executeWithMetrics(String executionId) {
        recordStep(executionId, "validate", () -> validate());
        recordStep(executionId, "connect", () -> connect());
        
        Data data = recordStep(executionId, "extract", () -> extract());
        Data transformed = recordStep(executionId, "transform", () -> transform(data));
        recordStep(executionId, "load", () -> load(transformed));
        
        return transformed.size();
    }
    
    private <T> T recordStep(String executionId, String stepName, Supplier<T> step) {
        long start = System.currentTimeMillis();
        try {
            T result = step.get();
            long duration = System.currentTimeMillis() - start;
            
            tracker.recordStepMetric(executionId, stepName, duration, true, null);
            metrics.recordStepDuration(getClass().getSimpleName(), stepName, duration);
            
            return result;
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - start;
            tracker.recordStepMetric(executionId, stepName, duration, false, e.getMessage());
            throw e;
        }
    }
    
    protected abstract Long getTemplateId();
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Async Template Method

```java
public abstract class AsyncDataProcessor extends DataProcessor {
    
    private final ExecutorService executor;
    
    public AsyncDataProcessor() {
        this.executor = Executors.newFixedThreadPool(10);
    }
    
    public CompletableFuture<ProcessResult> processAsync() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return process();  // Delegate to template method
            } catch (Exception e) {
                return ProcessResult.failure(e);
            }
        }, executor);
    }
    
    @PreDestroy
    public void shutdown() {
        executor.shutdown();
        try {
            if (!executor.awaitTermination(30, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}

// Usage
asyncProcessor.processAsync()
    .thenAccept(result -> {
        logger.info("Processing completed: {}", result.getStatus());
    })
    .exceptionally(ex -> {
        logger.error("Processing failed", ex);
        return null;
    });
```

### Parallel Step Execution

```java
public abstract class ParallelStepProcessor extends DataProcessor {
    
    @Override
    protected Data transform(Data data) {
        List<CompletableFuture<Data>> futures = data.partition(1000).stream()
            .map(partition -> CompletableFuture.supplyAsync(() -> 
                transformPartition(partition)
            ))
            .collect(Collectors.toList());
        
        // Wait for all partitions
        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        
        // Combine results
        return futures.stream()
            .map(CompletableFuture::join)
            .reduce(Data::merge)
            .orElse(Data.empty());
    }
    
    protected abstract Data transformPartition(Data partition);
}
```

### Retry Logic in Template Steps

```java
public abstract class ResilientDataProcessor extends DataProcessor {
    
    private final int maxRetries = 3;
    private final Duration retryDelay = Duration.ofSeconds(2);
    
    @Override
    protected void connect() {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < maxRetries) {
            try {
                doConnect();
                return;  // Success
                
            } catch (TransientException e) {
                lastException = e;
                attempt++;
                
                if (attempt < maxRetries) {
                    logger.warn("Connection attempt {} failed, retrying in {}", 
                        attempt, retryDelay);
                    sleep(retryDelay.multipliedBy(attempt));
                }
            }
        }
        
        throw new ConnectionException("Failed after " + maxRetries + " attempts", lastException);
    }
    
    protected abstract void doConnect();
}
```

### Circuit Breaker for External Dependencies

```java
public abstract class CircuitBreakerProcessor extends DataProcessor {
    
    @Autowired
    private CircuitBreakerRegistry circuitBreakerRegistry;
    
    @Override
    protected void load(Data data) {
        CircuitBreaker circuitBreaker = circuitBreakerRegistry
            .circuitBreaker("data-loader");
        
        Try<Void> result = Try.ofSupplier(
            CircuitBreaker.decorateSupplier(
                circuitBreaker,
                () -> {
                    doLoad(data);
                    return null;
                }
            )
        );
        
        if (result.isFailure()) {
            if (circuitBreaker.getState() == CircuitBreaker.State.OPEN) {
                // Circuit is open, use fallback
                loadToBackup(data);
            } else {
                throw new LoadException("Failed to load data", result.getCause());
            }
        }
    }
    
    protected abstract void doLoad(Data data);
    protected abstract void loadToBackup(Data data);
}
```

### Timeout Protection

```java
public abstract class TimeoutProtectedProcessor extends DataProcessor {
    
    private final ExecutorService executor = Executors.newCachedThreadPool();
    
    @Override
    protected Data extract() {
        Future<Data> future = executor.submit(() -> doExtract());
        
        try {
            return future.get(60, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new ExtractionTimeoutException("Extract timed out after 60 seconds");
        } catch (Exception e) {
            throw new ExtractionException("Extract failed", e);
        }
    }
    
    protected abstract Data doExtract();
}
```

### Graceful Degradation

```java
public abstract class DegradableProcessor extends DataProcessor {
    
    @Autowired
    private HealthIndicator healthIndicator;
    
    @Override
    protected Data transform(Data data) {
        if (healthIndicator.isHealthy()) {
            // Full transformation
            return doFullTransform(data);
        } else {
            // Degraded mode - minimal transformation
            logger.warn("System degraded, using minimal transformation");
            return doMinimalTransform(data);
        }
    }
    
    @Override
    protected void postLoad() {
        if (healthIndicator.isHealthy()) {
            // Full post-processing
            doFullPostLoad();
        } else {
            // Skip non-essential post-processing
            logger.info("Skipping post-load in degraded mode");
        }
    }
    
    protected abstract Data doFullTransform(Data data);
    protected abstract Data doMinimalTransform(Data data);
    protected abstract void doFullPostLoad();
}
```

### Batch Processing with Template Method

```java
public abstract class BatchProcessor extends DataProcessor {
    
    private final int batchSize = 1000;
    
    @Override
    public final ProcessResult process() {
        List<Data> batches = extractInBatches();
        
        int totalProcessed = 0;
        List<Exception> errors = new ArrayList<>();
        
        for (Data batch : batches) {
            try {
                processBatch(batch);
                totalProcessed += batch.size();
            } catch (Exception e) {
                logger.error("Batch processing failed", e);
                errors.add(e);
                
                // Continue with next batch (don't fail entire job)
            }
        }
        
        if (errors.isEmpty()) {
            return ProcessResult.success(totalProcessed);
        } else {
            return ProcessResult.partial(totalProcessed, errors);
        }
    }
    
    private void processBatch(Data batch) {
        validate();
        connect();
        Data transformed = transform(batch);
        load(transformed);
        cleanup();
    }
    
    protected abstract List<Data> extractInBatches();
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Secure Template Method

```java
public abstract class SecureDataProcessor extends DataProcessor {
    
    @Autowired
    private EncryptionService encryptionService;
    
    @Autowired
    private AuditService auditService;
    
    @Override
    public final ProcessResult process() {
        // Audit start
        String processorName = getClass().getSimpleName();
        auditService.logStart(processorName, getUserContext());
        
        try {
            // Authentication check
            authenticate();
            
            // Authorization check
            authorize();
            
            // Standard processing
            ProcessResult result = super.process();
            
            // Audit success
            auditService.logSuccess(processorName, result);
            
            return result;
            
        } catch (Exception e) {
            auditService.logFailure(processorName, e);
            throw e;
        }
    }
    
    protected void authenticate() {
        UserContext user = getUserContext();
        if (user == null || !user.isAuthenticated()) {
            throw new UnauthorizedException("User not authenticated");
        }
    }
    
    protected void authorize() {
        UserContext user = getUserContext();
        if (!hasPermission(user, getRequiredPermission())) {
            throw new ForbiddenException("User lacks required permission");
        }
    }
    
    @Override
    protected Data transform(Data data) {
        // Decrypt sensitive fields
        data.getSensitiveFields().forEach(field -> {
            String decrypted = encryptionService.decrypt(field.getValue());
            field.setValue(decrypted);
        });
        
        // Transform
        Data transformed = doTransform(data);
        
        // Re-encrypt
        transformed.getSensitiveFields().forEach(field -> {
            String encrypted = encryptionService.encrypt(field.getValue());
            field.setValue(encrypted);
        });
        
        return transformed;
    }
    
    protected abstract UserContext getUserContext();
    protected abstract String getRequiredPermission();
    protected abstract Data doTransform(Data data);
}
```

### PII Masking in Template

```java
public abstract class PiiMaskingProcessor extends DataProcessor {
    
    private static final Pattern SSN_PATTERN = Pattern.compile("\\d{3}-\\d{2}-\\d{4}");
    private static final Pattern CREDIT_CARD_PATTERN = Pattern.compile("\\d{4}-\\d{4}-\\d{4}-\\d{4}");
    
    @Override
    protected void postLoad() {
        // Mask PII in logs
        maskSensitiveData();
    }
    
    private void maskSensitiveData() {
        String logContent = getLogContent();
        
        // Mask SSN
        logContent = SSN_PATTERN.matcher(logContent)
            .replaceAll("***-**-****");
        
        // Mask credit cards
        logContent = CREDIT_CARD_PATTERN.matcher(logContent)
            .replaceAll("****-****-****-****");
        
        updateLogContent(logContent);
    }
    
    protected abstract String getLogContent();
    protected abstract void updateLogContent(String masked);
}
```

### Rate-Limited Template Execution

```java
@Component
public abstract class RateLimitedProcessor extends DataProcessor {
    
    @Autowired
    private RateLimiter rateLimiter;
    
    @Override
    public final ProcessResult process() {
        String userId = getUserContext().getUserId();
        String rateLimitKey = String.format("processor:%s:user:%s", 
            getClass().getSimpleName(), userId);
        
        if (!rateLimiter.tryAcquire(rateLimitKey, 10, Duration.ofMinutes(1))) {
            throw new RateLimitExceededException(
                "Rate limit exceeded: 10 requests per minute"
            );
        }
        
        return super.process();
    }
}
```

### Compliance Logging

```java
public abstract class ComplianceAwareProcessor extends DataProcessor {
    
    @Autowired
    private ComplianceLogger complianceLogger;
    
    @Override
    protected Data extract() {
        Data data = doExtract();
        
        // Log data access for compliance
        complianceLogger.logDataAccess(
            getUserContext(),
            getDataSource(),
            data.getRecordCount(),
            Instant.now()
        );
        
        return data;
    }
    
    @Override
    protected void load(Data data) {
        doLoad(data);
        
        // Log data modification
        complianceLogger.logDataModification(
            getUserContext(),
            getDestination(),
            data.getRecordCount(),
            Instant.now()
        );
    }
    
    protected abstract Data doExtract();
    protected abstract void doLoad(Data data);
    protected abstract String getDataSource();
    protected abstract String getDestination();
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: JUnit Test Framework

**Problem:**
- Every test needs setup, execution, and teardown
- Common behavior should be enforced (setup before test, cleanup after)
- Individual tests customize test logic

**Implementation:**

```java
// JUnit internals use Template Method
public abstract class TestCase {
    
    // Template method
    public final void runTest() throws Throwable {
        setUp();          // Hook method
        try {
            runTest();    // Abstract method
        } finally {
            tearDown();   // Hook method
        }
    }
    
    protected void setUp() throws Exception {
        // Default: do nothing
        // Subclasses can override
    }
    
    protected abstract void runTest() throws Throwable;
    
    protected void tearDown() throws Exception {
        // Default: do nothing
        // Subclasses can override
    }
}

// User's test
public class OrderServiceTest extends TestCase {
    private OrderService orderService;
    private MockOrderRepository repository;
    
    @Override
    protected void setUp() {
        repository = new MockOrderRepository();
        orderService = new OrderService(repository);
    }
    
    @Override
    protected void runTest() {
        Order order = new Order("test-order");
        orderService.createOrder(order);
        
        assertEquals(1, repository.getOrderCount());
    }
    
    @Override
    protected void tearDown() {
        repository.clear();
        orderService = null;
    }
}

// Modern JUnit 5 equivalent with annotations
public class ModernOrderServiceTest {
    private OrderService orderService;
    
    @BeforeEach  // setUp hook
    void setUp() {
        orderService = new OrderService();
    }
    
    @Test  // runTest
    void testCreateOrder() {
        Order order = orderService.createOrder("test");
        assertNotNull(order);
    }
    
    @AfterEach  // tearDown hook
    void tearDown() {
        orderService = null;
    }
}
```

**Scale:**
- Thousands of test classes in enterprise projects
- Ensures consistent test lifecycle
- Template enforces proper cleanup (prevents resource leaks)

### Example 2: Spring JdbcTemplate

**Problem:**
- Database operations require connection management, error handling, cleanup
- Boilerplate code for try-catch-finally blocks
- Need consistent transaction handling

**Implementation:**

```java
// Spring JdbcTemplate uses Template Method internally
public class JdbcTemplate {
    
    // Template method
    public <T> T execute(ConnectionCallback<T> action) throws DataAccessException {
        Connection con = null;
        try {
            // Step 1: Get connection
            con = getConnection();
            
            // Step 2: Execute user-provided logic
            T result = action.doInConnection(con);
            
            // Step 3: Commit if needed
            return result;
            
        } catch (SQLException ex) {
            // Step 4: Error handling
            throw translateException(ex);
        } finally {
            // Step 5: Always cleanup
            releaseConnection(con);
        }
    }
    
    // Helper template method for queries
    public <T> T query(String sql, ResultSetExtractor<T> rse) {
        return execute(con -> {
            PreparedStatement ps = con.prepareStatement(sql);
            ResultSet rs = ps.executeQuery();
            return rse.extractData(rs);
        });
    }
}

// User's code - no boilerplate!
@Repository
public class OrderRepository {
    
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public List<Order> findAll() {
        return jdbcTemplate.query(
            "SELECT * FROM orders",
            (rs, rowNum) -> new Order(
                rs.getLong("id"),
                rs.getString("customer_id"),
                rs.getBigDecimal("amount")
            )
        );
    }
    
    public int create(Order order) {
        return jdbcTemplate.update(
            "INSERT INTO orders (customer_id, amount) VALUES (?, ?)",
            order.getCustomerId(),
            order.getAmount()
        );
    }
}

// What JdbcTemplate handles:
// - Connection acquisition ✓
// - PreparedStatement creation ✓
// - Exception translation ✓
// - Resource cleanup ✓
// - Transaction management ✓
```

**Benefits at Scale:**
- Eliminates 10-20 lines of boilerplate per query
- Prevents connection leaks (automatic cleanup)
- Consistent error handling across application
- Used by thousands of Spring applications

### Example 3: ETL Pipeline (Real Production)

**Problem:**
- Process data from multiple sources (CSV, DB, APIs, Kafka)
- Each source has different extraction logic
- Common validation, transformation, loading steps

**Implementation:**

```java
@Component
public abstract class EtlPipeline {
    
    @Autowired
    protected MetricsService metrics;
    
    @Autowired
    protected AlertService alerts;
    
    // Template method - executed by scheduler
    public final EtlResult execute() {
        String pipelineName = getClass().getSimpleName();
        logger.info("Starting ETL pipeline: {}", pipelineName);
        
        Instant start = Instant.now();
        
        try {
            // Step 1: Validation
            validateSource();
            
            // Step 2: Extract
            RawData raw = extract();
            logger.info("Extracted {} records", raw.size());
            
            // Step 3: Validate data quality
            DataQualityReport quality = validateData(raw);
            if (quality.hasErrors()) {
                handleDataQualityIssues(quality);
            }
            
            // Step 4: Transform
            TransformedData transformed = transform(raw);
            logger.info("Transformed {} records", transformed.size());
            
            // Step 5: Optional enrichment (hook)
            enrich(transformed);
            
            // Step 6: Load
            load(transformed);
            logger.info("Loaded {} records", transformed.size());
            
            // Step 7: Post-processing (hook)
            postProcess(transformed);
            
            // Step 8: Metrics
            long duration = Duration.between(start, Instant.now()).toMillis();
            metrics.recordSuccess(pipelineName, transformed.size(), duration);
            
            return EtlResult.success(transformed.size());
            
        } catch (Exception e) {
            logger.error("ETL pipeline failed: {}", pipelineName, e);
            alerts.sendAlert("ETL Failure", pipelineName, e);
            metrics.recordFailure(pipelineName);
            
            return EtlResult.failure(e);
        }
    }
    
    // Required steps
    protected abstract RawData extract();
    protected abstract TransformedData transform(RawData raw);
    protected abstract void load(TransformedData data);
    
    // Optional hooks
    protected void validateSource() {
        // Default: do nothing
    }
    
    protected DataQualityReport validateData(RawData raw) {
        return DataQualityReport.ok();
    }
    
    protected void handleDataQualityIssues(DataQualityReport report) {
        logger.warn("Data quality issues: {}", report.getIssues());
    }
    
    protected void enrich(TransformedData data) {
        // Default: no enrichment
    }
    
    protected void postProcess(TransformedData data) {
        // Default: no post-processing
    }
}

// CSV ETL Pipeline
@Component
public class CsvEtlPipeline extends EtlPipeline {
    
    @Value("${csv.input.path}")
    private String inputPath;
    
    @Override
    protected void validateSource() {
        File file = new File(inputPath);
        if (!file.exists()) {
            throw new SourceNotFoundException("CSV file not found: " + inputPath);
        }
    }
    
    @Override
    protected RawData extract() {
        try (BufferedReader reader = new BufferedReader(new FileReader(inputPath))) {
            List<String[]> rows = reader.lines()
                .map(line -> line.split(","))
                .collect(Collectors.toList());
            
            return new RawData(rows);
        } catch (IOException e) {
            throw new ExtractionException("Failed to read CSV", e);
        }
    }
    
    @Override
    protected DataQualityReport validateData(RawData raw) {
        DataQualityReport report = new DataQualityReport();
        
        for (String[] row : raw.getRows()) {
            if (row.length != 5) {
                report.addError("Invalid row length: " + Arrays.toString(row));
            }
            
            if (row[2].isEmpty()) {
                report.addWarning("Missing email in row: " + Arrays.toString(row));
            }
        }
        
        return report;
    }
    
    @Override
    protected TransformedData transform(RawData raw) {
        List<Customer> customers = raw.getRows().stream()
            .skip(1)  // Skip header
            .map(row -> new Customer(
                row[0],  // name
                row[1],  // email
                row[2]   // phone
            ))
            .collect(Collectors.toList());
        
        return new TransformedData(customers);
    }
    
    @Override
    protected void load(TransformedData data) {
        customerRepository.saveAll(data.getCustomers());
    }
    
    @Override
    protected void postProcess(TransformedData data) {
        // Send welcome emails to new customers
        data.getCustomers().forEach(customer -> {
            emailService.sendWelcomeEmail(customer.getEmail());
        });
    }
}

// Kafka ETL Pipeline
@Component
public class KafkaEtlPipeline extends EtlPipeline {
    
    @Autowired
    private KafkaConsumer<String, String> consumer;
    
    @Override
    protected RawData extract() {
        consumer.subscribe(List.of("customer-events"));
        
        ConsumerRecords<String, String> records = consumer.poll(Duration.ofSeconds(10));
        
        List<String> events = StreamSupport.stream(records.spliterator(), false)
            .map(ConsumerRecord::value)
            .collect(Collectors.toList());
        
        return new RawData(events);
    }
    
    @Override
    protected TransformedData transform(RawData raw) {
        List<Customer> customers = raw.getEvents().stream()
            .map(json -> objectMapper.readValue(json, CustomerEvent.class))
            .map(event -> event.toCustomer())
            .collect(Collectors.toList());
        
        return new TransformedData(customers);
    }
    
    @Override
    protected void load(TransformedData data) {
        elasticsearchService.bulkIndex(data.getCustomers());
    }
    
    @Override
    protected void enrich(TransformedData data) {
        // Enrich with demographic data from external API
        data.getCustomers().forEach(customer -> {
            DemographicData demo = demographicService.lookup(customer.getZipCode());
            customer.setDemographic(demo);
        });
    }
}

// Scheduler
@Component
public class EtlScheduler {
    
    @Autowired
    private List<EtlPipeline> pipelines;
    
    @Scheduled(cron = "0 0 2 * * *")  // 2 AM daily
    public void runEtlPipelines() {
        for (EtlPipeline pipeline : pipelines) {
            EtlResult result = pipeline.execute();
            logger.info("Pipeline {} completed with status: {}", 
                pipeline.getClass().getSimpleName(), 
                result.getStatus());
        }
    }
}
```

**Production Scale:**
- Processes 100M+ records daily
- 20+ different ETL pipelines (CSV, DB, Kafka, S3, APIs)
- Template ensures consistent monitoring, error handling, metrics
- Reduced code duplication by 70%

### Example 4: HTTP Request Handler (Spring MVC)

**Problem:**
- Every HTTP request needs authentication, authorization, validation
- Common error handling and logging
- Business logic varies per endpoint

**Implementation:**

```java
public abstract class BaseController {
    
    // Template method called by Spring
    protected final ResponseEntity<?> handleRequest(HttpServletRequest request, RequestBody body) {
        String requestId = UUID.randomUUID().toString();
        MDC.put("requestId", requestId);
        
        try {
            // Step 1: Authentication
            UserContext user = authenticate(request);
            
            // Step 2: Authorization
            authorize(user, request.getRequestURI());
            
            // Step 3: Validation
            validate(body);
            
            // Step 4: Rate limiting (hook)
            checkRateLimit(user);
            
            // Step 5: Business logic (subclass-specific)
            Object result = processRequest(user, body);
            
            // Step 6: Post-processing (hook)
            postProcess(result);
            
            return ResponseEntity.ok(result);
            
        } catch (ValidationException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (UnauthorizedException e) {
            return ResponseEntity.status(401).body("Unauthorized");
        } catch (ForbiddenException e) {
            return ResponseEntity.status(403).body("Forbidden");
        } catch (Exception e) {
            logger.error("Request processing failed", e);
            return ResponseEntity.status(500).body("Internal server error");
        } finally {
            MDC.clear();
        }
    }
    
    protected abstract Object processRequest(UserContext user, RequestBody body);
    
    // Hooks with default implementations
    protected void checkRateLimit(UserContext user) {
        // Default: no rate limiting
    }
    
    protected void postProcess(Object result) {
        // Default: no post-processing
    }
}
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Crisp Interview Answer

**"Explain the Template Method Pattern":**

*"Template Method is a behavioral pattern that defines the skeleton of an algorithm in a base class, letting subclasses override specific steps without changing the algorithm's structure.*

*I've used this extensively in ETL pipelines. The base class defines the workflow: validate → extract → transform → load → cleanup. This structure is fixed and enforced by making the template method `final`. Each concrete implementation—CSV processor, database processor, Kafka processor—provides its own extraction and transformation logic, but the overall flow remains consistent.*

*The pattern uses abstract methods for required steps that subclasses must implement, and hook methods for optional customization points with default implementations. For example, post-processing after loading is a hook—some pipelines send notifications, others don't.*

*The key benefits are code reuse and consistency. Common operations like metrics collection, error handling, and cleanup are centralized in the base class. When I add a new data source, I only implement the source-specific extraction logic—all the workflow management is inherited.*

*At scale, I instrument the template method to track each step's duration, enabling performance bottleneck identification. I also use async execution for I/O-heavy steps like extraction and loading, while keeping the synchronous template structure for clarity.*

*The main consideration is that Template Method relies on inheritance, which creates tight coupling. For cases where I need more flexibility, I use Strategy pattern instead. But for workflows with a well-defined, stable structure, Template Method is ideal."*

### Common Follow-Up Questions

**Q1: "What's the difference between Template Method and Strategy Pattern?"**

| Aspect | Template Method | Strategy Pattern |
|--------|----------------|------------------|
| **Structure** | Inheritance (IS-A) | Composition (HAS-A) |
| **Coupling** | Tight (subclass coupled to parent) | Loose (delegates to strategy interface) |
| **Granularity** | Entire algorithm structure | Single behavior/step |
| **Runtime Change** | No (fixed at compile-time) | Yes (can swap strategies) |
| **Code Reuse** | Via inheritance | Via composition |
| **Use Case** | Fixed workflow, varying steps | Single behavior with multiple implementations |

**Example:**
```java
// Template Method: Fixed workflow, vary steps
public abstract class ReportGenerator {
    public final Report generate() {
        Data data = fetchData();      // Varies by subclass
        Data processed = process(data); // Varies by subclass
        return render(processed);      // Varies by subclass
    }
}

// Strategy: Single behavior, swap implementation
public class PaymentProcessor {
    private PaymentStrategy strategy;
    
    public void setStrategy(PaymentStrategy strategy) {
        this.strategy = strategy;  // Runtime swap
    }
    
    public void processPayment(Order order) {
        strategy.pay(order);  // Delegate to strategy
    }
}
```

**Answer:**
*"Template Method defines a complete algorithm structure using inheritance—subclasses implement specific steps but can't change the flow. Strategy encapsulates a single varying behavior using composition—clients can swap strategies at runtime. Use Template Method for fixed workflows with varying implementations. Use Strategy when you need to change behavior dynamically or combine multiple strategies."*

**Q2: "How do you prevent subclasses from breaking the algorithm structure?"**

```java
// PROBLEM: Non-final template method can be overridden
public class BadTemplate {
    public ProcessResult process() {  // Can be overridden!
        validate();
        execute();
        return success();
    }
}

public class BrokenSubclass extends BadTemplate {
    @Override
    public ProcessResult process() {
        // Completely replaces parent's algorithm!
        return doMyOwnThing();
    }
}

// SOLUTION 1: Final template method
public abstract class GoodTemplate {
    public final ProcessResult process() {  // Cannot override
        validate();
        execute();
        return success();
    }
    
    protected abstract void validate();
    protected abstract void execute();
}

// SOLUTION 2: Private template method, public wrapper
public abstract class BetterTemplate {
    
    public final ProcessResult process() {
        return executeTemplate();  // Delegates to private
    }
    
    private ProcessResult executeTemplate() {
        validate();
        execute();
        return success();
    }
    
    protected abstract void validate();
    protected abstract void execute();
}

// SOLUTION 3: Sealed classes (Java 15+)
public abstract sealed class SealedTemplate 
    permits CsvProcessor, DbProcessor {
    
    public final ProcessResult process() {
        // Only permitted subclasses can extend
    }
}
```

**Answer:**
*"Mark the template method as `final` to prevent overriding. This ensures the algorithm structure cannot be modified. Only abstract methods and hooks can be overridden by subclasses. I also use sealed classes in Java 15+ to control which classes can extend the template, preventing unauthorized implementations."*

**Q3: "When would you choose composition over Template Method?"**

**Choose Composition When:**
- Need to mix and match behaviors from multiple sources
- Want to change behavior at runtime
- Avoid deep inheritance hierarchies
- Need to test behaviors independently
- Behaviors are orthogonal (independent)

**Example:**
```java
// BAD: Template Method for orthogonal concerns
public abstract class ServiceTemplate {
    public final void execute() {
        authenticate();  // Security concern
        log();          // Observability concern
        cache();        // Performance concern
        process();      // Business logic
    }
}

// Can't easily change caching strategy without changing entire class hierarchy

// GOOD: Composition with multiple strategies
public class Service {
    private final AuthStrategy auth;
    private final LogStrategy logger;
    private final CacheStrategy cache;
    private final ProcessStrategy processor;
    
    public void execute() {
        auth.authenticate();
        logger.log("Starting");
        
        Result result = cache.computeIfAbsent(() -> {
            return processor.process();
        });
        
        logger.log("Completed");
    }
    
    // Can swap strategies independently at runtime
    public void setCacheStrategy(CacheStrategy cache) {
        this.cache = cache;
    }
}
```

**Answer:**
*"Use composition when you need to combine behaviors from multiple sources or change behaviors at runtime. Template Method works best for algorithms with a fixed structure and clear inheritance hierarchy. If I'm mixing authentication, logging, caching, and business logic, composition is better—each concern is independent and can be tested/modified separately."*

**Q4: "How do you test classes using Template Method?"**

```java
// Testing abstract template class
@Test
public void testTemplateWorkflow() {
    // Create test double with minimal implementation
    TestableProcessor processor = new TestableProcessor();
    
    ProcessResult result = processor.process();
    
    // Verify workflow executed correctly
    assertTrue(processor.wasValidateCalled());
    assertTrue(processor.wasExtractCalled());
    assertTrue(processor.wasTransformCalled());
    assertTrue(processor.wasLoadCalled());
    
    // Verify order of execution
    List<String> callOrder = processor.getCallOrder();
    assertEquals(Arrays.asList("validate", "extract", "transform", "load"), callOrder);
}

class TestableProcessor extends DataProcessor {
    private final List<String> callOrder = new ArrayList<>();
    
    @Override
    protected void validate() {
        callOrder.add("validate");
    }
    
    @Override
    protected Data extract() {
        callOrder.add("extract");
        return new Data(List.of("test"));
    }
    
    @Override
    protected Data transform(Data data) {
        callOrder.add("transform");
        return data;
    }
    
    @Override
    protected void load(Data data) {
        callOrder.add("load");
    }
    
    public List<String> getCallOrder() {
        return callOrder;
    }
}

// Testing concrete implementation
@Test
public void testCsvProcessor() {
    CsvDataProcessor processor = new CsvDataProcessor("/path/to/test.csv");
    
    ProcessResult result = processor.process();
    
    assertEquals(ProcessResult.Status.SUCCESS, result.getStatus());
    verify(mockRepository).saveAll(anyList());
}

// Testing hooks are optional
@Test
public void testHookNotCalledByDefault() {
    MinimalProcessor processor = new MinimalProcessor();
    
    processor.process();
    
    // Hook method has default empty implementation
    assertFalse(processor.wasPostProcessCalled());
}
```

**Answer:**
*"I test the template method workflow with a minimal test double that tracks method calls and verifies execution order. For concrete implementations, I test with real or mocked dependencies. I verify that abstract methods are called correctly and hook methods are optional. I also test error handling paths to ensure cleanup happens even when steps fail."*

**Q5: "How do you handle errors in template methods?"**

```java
public abstract class ResilientTemplate {
    
    public final ProcessResult process() {
        try {
            // Required steps
            validate();
            Data data = extract();
            Data transformed = transform(data);
            load(transformed);
            
            return ProcessResult.success();
            
        } catch (ValidationException e) {
            // Recoverable error
            logger.warn("Validation failed", e);
            return handleValidationError(e);
            
        } catch (TransientException e) {
            // Retryable error
            logger.info("Transient error, will retry", e);
            return retryProcessing();
            
        } catch (Exception e) {
            // Unexpected error
            logger.error("Processing failed", e);
            return handleUnexpectedError(e);
            
        } finally {
            // Always cleanup
            cleanup();
        }
    }
    
    // Subclass can customize error handling
    protected ProcessResult handleValidationError(ValidationException e) {
        return ProcessResult.failure("Validation failed: " + e.getMessage());
    }
    
    protected ProcessResult handleUnexpectedError(Exception e) {
        alertService.sendAlert("Processing failed", e);
        return ProcessResult.failure("Unexpected error");
    }
    
    private void cleanup() {
        closeConnections();
        releaseResources();
        clearCache();
    }
}

// Transactional template
public abstract class TransactionalTemplate {
    
    @Autowired
    private TransactionTemplate transactionTemplate;
    
    public final ProcessResult process() {
        return transactionTemplate.execute(status -> {
            try {
                Data data = extract();
                load(data);
                return ProcessResult.success();
                
            } catch (Exception e) {
                status.setRollbackOnly();  // Rollback transaction
                throw e;
            }
        });
    }
}
```

**Answer:**
*"I use try-catch-finally in the template method to ensure cleanup always happens. I categorize exceptions—validation errors are user-facing, transient errors trigger retries, unexpected errors trigger alerts. Subclasses can override error handlers for custom behavior. For database operations, I wrap the template method in a Spring transaction that rolls back on errors."*

**Q6: "Can you show a real-world example where Template Method prevented bugs?"**

**Scenario: Database Connection Leak**

```java
// BEFORE: Developers repeatedly forgot to close connections
@Repository
public class CustomerRepository {
    public List<Customer> findAll() {
        Connection conn = dataSource.getConnection();
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery("SELECT * FROM customers");
        
        List<Customer> customers = new ArrayList<>();
        while (rs.next()) {
            customers.add(mapCustomer(rs));
        }
        
        return customers;
        // BUG: Forgot to close connection!
    }
    
    public void save(Customer customer) {
        Connection conn = dataSource.getConnection();
        // ... insert logic ...
        conn.close();  // Remembered here
    }
}

// Result: Connection pool exhausted after a few hours

// AFTER: Template Method enforces cleanup
public abstract class JdbcTemplate {
    
    public <T> T execute(ConnectionCallback<T> action) {
        Connection conn = null;
        try {
            conn = getConnection();
            return action.doInConnection(conn);  // User code here
        } catch (SQLException e) {
            throw new DataAccessException(e);
        } finally {
            closeConnection(conn);  // ALWAYS closes
        }
    }
}

@Repository
public class CustomerRepository {
    @Autowired
    private JdbcTemplate jdbcTemplate;
    
    public List<Customer> findAll() {
        return jdbcTemplate.execute(conn -> {
            // User only writes business logic
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT * FROM customers");
            return mapResults(rs);
            // Connection automatically closed by template
        });
    }
}

// Result: Zero connection leaks, 99.99% uptime
```

**Answer:**
*"At my previous company, we had recurring connection leak bugs—developers forgot to close database connections in finally blocks. We refactored to use Spring's JdbcTemplate, which implements Template Method. The template enforces connection cleanup in its finally block, regardless of success or failure. After migration, connection leaks dropped to zero, and we eliminated several production incidents."*

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Template Method UML

```
┌────────────────────────────────────────┐
│      AbstractTemplate                  │
│                                        │
│  + final templateMethod()              │◄─── Template method (fixed)
│      ↓                                 │
│      step1()                           │
│      step2()                           │
│      step3()                           │
│                                        │
│  # abstract step1()                    │◄─── Must implement
│  # abstract step2()                    │◄─── Must implement
│  # hook step3() { }                    │◄─── Optional override
└────────────────▲───────────────────────┘
                 │
                 │ extends
         ┌───────┴────────┐
         │                │
┌────────┴─────────┐  ┌───┴──────────────┐
│ ConcreteClass1   │  │ ConcreteClass2   │
│                  │  │                  │
│ + step1()        │  │ + step1()        │
│ + step2()        │  │ + step2()        │
│ + step3()        │  │ (uses default)   │
└──────────────────┘  └──────────────────┘
```

### Sequence Diagram

```
Client          AbstractTemplate     ConcreteClass
  │                    │                   │
  │─templateMethod()─> │                   │
  │                    │                   │
  │                    ├─step1()──────────>│
  │                    │                   │
  │                    │<─────returns──────┤
  │                    │                   │
  │                    ├─step2()──────────>│
  │                    │                   │
  │                    │<─────returns──────┤
  │                    │                   │
  │                    ├─step3() [hook]───>│
  │                    │                   │
  │                    │<─────returns──────┤
  │                    │                   │
  │<──────result───────┤                   │
  │                    │                   │
```

### Complete Java Implementation

```java
// ===== 1. Abstract Template Class =====
public abstract class DataProcessor {
    
    // Template method - FINAL, cannot be overridden
    public final ProcessResult process() {
        String processorName = getClass().getSimpleName();
        logger.info("Starting {}", processorName);
        
        Instant start = Instant.now();
        
        try {
            // Step 1: Validate (required)
            logger.debug("Validating...");
            validate();
            
            // Step 2: Connect (required)
            logger.debug("Connecting...");
            connect();
            
            // Step 3: Extract (required)
            logger.debug("Extracting...");
            Data data = extract();
            
            // Step 4: Transform (required)
            logger.debug("Transforming...");
            Data transformed = transform(data);
            
            // Step 5: Pre-load hook (optional)
            preLoad(transformed);
            
            // Step 6: Load (required)
            logger.debug("Loading...");
            load(transformed);
            
            // Step 7: Post-load hook (optional)
            postLoad();
            
            // Success
            long duration = Duration.between(start, Instant.now()).toMillis();
            logger.info("{} completed in {}ms", processorName, duration);
            
            return ProcessResult.success(transformed.size(), duration);
            
        } catch (Exception e) {
            logger.error("{} failed", processorName, e);
            return handleError(e);
        } finally {
            cleanup();
        }
    }
    
    // ===== Abstract Methods (MUST implement) =====
    protected abstract void validate();
    protected abstract void connect();
    protected abstract Data extract();
    protected abstract Data transform(Data data);
    protected abstract void load(Data data);
    
    // ===== Hook Methods (OPTIONAL override) =====
    protected void preLoad(Data data) {
        // Default: do nothing
    }
    
    protected void postLoad() {
        // Default: do nothing
    }
    
    // ===== Error Handler (CAN override) =====
    protected ProcessResult handleError(Exception e) {
        if (e instanceof ValidationException) {
            return ProcessResult.validationFailure(e.getMessage());
        } else if (e instanceof ConnectionException) {
            return ProcessResult.connectionFailure(e.getMessage());
        } else {
            return ProcessResult.unexpectedFailure(e);
        }
    }
    
    // ===== Cleanup (FINAL, cannot override) =====
    private void cleanup() {
        closeConnections();
        releaseResources();
        clearCache();
    }
    
    private void closeConnections() {
        // Close any open connections
    }
    
    private void releaseResources() {
        // Release any resources
    }
    
    private void clearCache() {
        // Clear any caches
    }
}

// ===== 2. Concrete Implementation: CSV Processor =====
@Component
public class CsvDataProcessor extends DataProcessor {
    
    private final String filePath;
    private BufferedReader reader;
    
    public CsvDataProcessor(@Value("${csv.file.path}") String filePath) {
        this.filePath = filePath;
    }
    
    @Override
    protected void validate() {
        File file = new File(filePath);
        if (!file.exists()) {
            throw new ValidationException("File not found: " + filePath);
        }
        if (!file.canRead()) {
            throw new ValidationException("File not readable: " + filePath);
        }
    }
    
    @Override
    protected void connect() {
        try {
            reader = new BufferedReader(new FileReader(filePath));
        } catch (IOException e) {
            throw new ConnectionException("Failed to open file", e);
        }
    }
    
    @Override
    protected Data extract() {
        try {
            List<String[]> rows = new ArrayList<>();
            String line;
            
            while ((line = reader.readLine()) != null) {
                rows.add(line.split(","));
            }
            
            return new Data(rows);
        } catch (IOException e) {
            throw new ExtractionException("Failed to read CSV", e);
        }
    }
    
    @Override
    protected Data transform(Data data) {
        List<Customer> customers = data.getRows().stream()
            .skip(1)  // Skip header
            .map(row -> new Customer(
                row[0].trim(),  // name
                row[1].trim(),  // email
                row[2].trim()   // phone
            ))
            .filter(customer -> isValidEmail(customer.getEmail()))
            .collect(Collectors.toList());
        
        return new Data(customers);
    }
    
    @Override
    protected void load(Data data) {
        customerRepository.saveAll(data.getCustomers());
    }
    
    @Override
    protected void preLoad(Data data) {
        // Optional: Remove duplicates
        data.removeDuplicates();
        logger.info("Removed {} duplicates", data.getDuplicateCount());
    }
    
    @Override
    protected void postLoad() {
        // Optional: Archive processed file
        archiveFile(filePath);
    }
}

// ===== 3. Concrete Implementation: Database Processor =====
@Component
public class DatabaseDataProcessor extends DataProcessor {
    
    @Autowired
    private DataSource dataSource;
    
    private Connection connection;
    
    @Override
    protected void validate() {
        if (dataSource == null) {
            throw new ValidationException("DataSource is null");
        }
    }
    
    @Override
    protected void connect() {
        try {
            connection = dataSource.getConnection();
        } catch (SQLException e) {
            throw new ConnectionException("Failed to connect to database", e);
        }
    }
    
    @Override
    protected Data extract() {
        try (Statement stmt = connection.createStatement()) {
            ResultSet rs = stmt.executeQuery(
                "SELECT id, name, email, phone FROM customers WHERE active = true"
            );
            
            List<Customer> customers = new ArrayList<>();
            while (rs.next()) {
                customers.add(new Customer(
                    rs.getLong("id"),
                    rs.getString("name"),
                    rs.getString("email"),
                    rs.getString("phone")
                ));
            }
            
            return new Data(customers);
        } catch (SQLException e) {
            throw new ExtractionException("Failed to query database", e);
        }
    }
    
    @Override
    protected Data transform(Data data) {
        // Transform: Normalize phone numbers
        data.getCustomers().forEach(customer -> {
            String normalized = normalizePhone(customer.getPhone());
            customer.setPhone(normalized);
        });
        
        return data;
    }
    
    @Override
    protected void load(Data data) {
        // Load to Elasticsearch
        elasticsearchService.bulkIndex("customers", data.getCustomers());
    }
}

// ===== 4. Usage =====
@Service
public class DataProcessingService {
    
    @Autowired
    private List<DataProcessor> processors;
    
    public void processAll() {
        for (DataProcessor processor : processors) {
            ProcessResult result = processor.process();  // Calls template method
            
            logger.info("Processor: {}, Status: {}, Records: {}, Duration: {}ms",
                processor.getClass().getSimpleName(),
                result.getStatus(),
                result.getRecordsProcessed(),
                result.getDurationMs()
            );
        }
    }
}

// ===== 5. Supporting Classes =====
public class Data {
    private List<String[]> rows;
    private List<Customer> customers;
    
    public void removeDuplicates() {
        customers = customers.stream()
            .distinct()
            .collect(Collectors.toList());
    }
}

public class ProcessResult {
    private final Status status;
    private final int recordsProcessed;
    private final long durationMs;
    private final String errorMessage;
    
    public static ProcessResult success(int records, long duration) {
        return new ProcessResult(Status.SUCCESS, records, duration, null);
    }
    
    public static ProcessResult validationFailure(String error) {
        return new ProcessResult(Status.VALIDATION_FAILED, 0, 0, error);
    }
    
    public enum Status {
        SUCCESS, VALIDATION_FAILED, CONNECTION_FAILED, UNEXPECTED_FAILURE
    }
}
```

### Hook Method Pattern

```java
// Demonstrating hook methods
public abstract class TemplateWithHooks {
    
    public final void execute() {
        // Always executed
        step1();
        
        // Hook - only if overridden
        if (shouldExecuteStep2()) {
            step2();
        }
        
        // Always executed
        step3();
        
        // Hook - with default implementation
        step4();
    }
    
    // Required
    protected abstract void step1();
    protected abstract void step3();
    
    // Hook - boolean return
    protected boolean shouldExecuteStep2() {
        return false;  // Default: don't execute
    }
    
    // Hook - optional override
    protected void step2() {
        throw new UnsupportedOperationException("step2 not implemented");
    }
    
    // Hook - with default implementation
    protected void step4() {
        // Default implementation
        logger.info("Default step4");
    }
}
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why It Matters

**Business Impact:**
- **Code Reuse**: 50-70% reduction in duplicate code across similar workflows
- **Consistency**: Enforces standard processing across all implementations
- **Maintainability**: Changes to common logic in one place
- **Quality**: Centralized error handling and validation reduces bugs
- **Onboarding**: New developers follow established patterns

**User Experience:**
- **Reliability**: Consistent error handling improves stability
- **Performance**: Centralized optimization benefits all implementations
- **Security**: Uniform security checks across all processors
- **Compliance**: Standard audit logging ensures regulatory compliance

**Engineering Excellence:**
- **DRY Principle**: Eliminates duplicate code
- **Open-Closed Principle**: Open for extension, closed for modification
- **Testability**: Test template and implementations independently
- **Maintainability**: Clear separation of invariant vs variant code
- **Documentation**: Algorithm structure self-documenting

### How It Works (Simple but Precise)

1. **Define Template**: Create abstract class with template method (marked `final`)
2. **Identify Steps**: Break algorithm into required steps (abstract) and optional steps (hooks)
3. **Implement Common Logic**: Put shared behavior in template method
4. **Create Concrete Classes**: Subclasses implement abstract methods
5. **Execute**: Client calls template method, which orchestrates the flow

**In Distributed Systems:**
1. **Standard Processing**: All microservices follow same request lifecycle
2. **Service-Specific Logic**: Each service implements its own business logic
3. **Consistent Metrics**: Template collects metrics for all services
4. **Uniform Error Handling**: All services report errors consistently

### Key Trade-offs to Remember

✅ **Use Template Method When:**
- Multiple implementations share significant common code
- Algorithm structure is well-defined and stable
- Need to enforce consistent workflow
- Want to centralize invariant behavior
- Subclasses vary in only specific steps

❌ **Avoid Template Method When:**
- Algorithms are completely different (no common structure)
- Need to change behavior at runtime (use Strategy)
- Want to combine behaviors from multiple sources (use Composition)
- Algorithm structure changes frequently
- Prefer composition over inheritance

### Production Checklist

Before shipping template pattern to production:

- [ ] **Template method is `final`** to prevent structure modification
- [ ] **Abstract methods** for all required steps
- [ ] **Hook methods** with sensible defaults for optional steps
- [ ] **Error handling** in template method with proper try-catch-finally
- [ ] **Cleanup** in finally block (connections, resources)
- [ ] **Logging** at each step for observability
- [ ] **Metrics** collection for duration and success rate
- [ ] **Documentation** of algorithm structure and extension points
- [ ] **Unit tests** for template workflow
- [ ] **Integration tests** for concrete implementations
- [ ] **Timeout protection** for long-running steps
- [ ] **Transaction management** for database operations

### Interview Red Flags to Avoid

🚫 "Template Method is just abstract classes"
✅ "Template Method is a specific pattern where a final method defines algorithm structure, and abstract/hook methods allow customization of specific steps"

🚫 "Hooks and abstract methods are the same"
✅ "Abstract methods must be implemented (required steps), hooks have default implementations and are optional (extension points)"

🚫 "Template Method and Strategy are interchangeable"
✅ "Template Method uses inheritance for fixed algorithm structure with varying steps. Strategy uses composition for runtime algorithm swapping"

🚫 "Always use Template Method for code reuse"
✅ "Template Method is best for algorithms with stable structure. For orthogonal concerns or runtime flexibility, use composition"

### Final Interview Sound Bite

*"Template Method is a fundamental pattern for eliminating code duplication in algorithms with a fixed structure but varying implementations. I've used it extensively in ETL pipelines, request handlers, and test frameworks.*

*The key is making the template method `final` to enforce the algorithm structure, while providing abstract methods for required customization and hook methods for optional extension points. This centralizes common logic—error handling, logging, metrics, cleanup—in one place, while allowing each implementation to provide domain-specific behavior.*

*The pattern shines in Spring Boot applications: JdbcTemplate handles connection management, JUnit enforces test lifecycle (setUp, test, tearDown), and Spring MVC standardizes request processing. Each eliminates boilerplate and prevents common bugs like resource leaks.*

*At scale, I instrument the template method to track step durations, enabling performance optimization. I also use async execution for I/O-heavy steps while maintaining the synchronous template structure for clarity.*

*The main limitation is inheritance coupling. When I need runtime flexibility or want to combine behaviors from multiple sources, I use Strategy pattern or composition instead. But for workflows with a well-defined, stable structure—like ETL, test frameworks, or request handling—Template Method is the gold standard."*

---

## 📚 Additional Resources

**Books:**
- "Design Patterns" by Gang of Four (original definition)
- "Head First Design Patterns" (accessible explanation)
- "Refactoring" by Martin Fowler (refactoring to Template Method)

**Frameworks Using Template Method:**
- **Spring JdbcTemplate**: Database operations
- **Spring RestTemplate**: HTTP operations
- **JUnit**: Test lifecycle (setUp, test, tearDown)
- **Servlet API**: service() method
- **Hibernate Template**: ORM operations

**Real-World Examples:**
- Spring Framework's Template classes
- JUnit test lifecycle
- Servlet lifecycle (init, service, destroy)
- Java's AbstractList, AbstractSet, AbstractMap
- Spring's transaction management

**Engineering Blogs:**
- Spring Framework: Template design in Spring
- JUnit: Test lifecycle implementation
- Netflix: ETL pipeline patterns
- Uber: Data processing workflows

---

**Last Updated**: January 2026
**Target Audience**: Senior Backend Engineers (7+ YOE)
**Interview Level**: FAANG L5/L6 (Senior/Staff)
