# 190. Chain of Responsibility

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

The **Chain of Responsibility Pattern** is a behavioral design pattern that lets you pass requests along a chain of handlers. Each handler decides either to process the request or to pass it to the next handler in the chain. This pattern decouples the sender of a request from its receivers by giving multiple objects a chance to handle the request.

**What it is:**
- A design pattern that chains objects to process requests sequentially
- Each handler has a reference to the next handler in the chain
- Handlers can process the request, pass it along, or both
- The chain can be dynamic—handlers added/removed at runtime
- Promotes loose coupling between sender and receiver

**Why it exists:**
- Decouples request senders from receivers
- Allows multiple objects to handle a request without the sender knowing which one will handle it
- Enables dynamic handler chain configuration
- Promotes Single Responsibility Principle (each handler does one thing)
- Simplifies adding new handlers without modifying existing code
- Facilitates ordered processing and validation pipelines

**The problem it solves:**
- Eliminates hard-coded request-to-handler mappings
- Avoids coupling sender to specific receiver
- Enables flexible request routing and filtering
- Supports multiple levels of request processing
- Allows conditional request handling
- Facilitates building processing pipelines

**Where and when it is used:**
- Middleware pipelines (Express.js, Spring Filters)
- Request validation chains (input validation, auth, rate limiting)
- Logging frameworks (log level filtering)
- Event handling systems (event bubbling in UI)
- Exception handling (try-catch chains)
- Authorization systems (role-based access checks)
- HTTP request/response processing
- Approval workflows (manager → director → VP)

**Role in large-scale distributed systems:**
- Foundation for middleware architectures
- Enables request preprocessing (auth, validation, transformation)
- Supports cross-cutting concerns (logging, metrics, tracing)
- Facilitates API gateway request routing
- Powers service mesh interceptors
- Enables fault tolerance patterns (circuit breaker, retry chains)
- Supports multi-tenant filtering and routing

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Core Components

1. **Handler Interface**: Defines the interface for handling requests
2. **ConcreteHandler**: Implements the handler interface and processes specific requests
3. **Client**: Initiates the request to the first handler in the chain
4. **Chain Link**: Reference to the next handler in the chain

### System Architecture & Component Boundaries

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     ▼
┌─────────────────┐     next     ┌─────────────────┐     next     ┌─────────────────┐
│   Handler 1     │─────────────▶│   Handler 2     │─────────────▶│   Handler 3     │
│                 │              │                 │              │                 │
│ - canHandle()   │              │ - canHandle()   │              │ - canHandle()   │
│ - handle()      │              │ - handle()      │              │ - handle()      │
│ - setNext()     │              │ - setNext()     │              │ - setNext()     │
└─────────────────┘              └─────────────────┘              └─────────────────┘
     │                                  │                                  │
     ▼ (if can't handle,               ▼ (if can't handle,               ▼ (handles or
        pass to next)                      pass to next)                      returns)
```

### Data Flow & Request Lifecycle

**Flow 1: First Handler Processes**
```
Request → Handler1 (processes) → Response
          Handler2 (not invoked)
          Handler3 (not invoked)
```

**Flow 2: Middle Handler Processes**
```
Request → Handler1 (passes) → Handler2 (processes) → Response
                               Handler3 (not invoked)
```

**Flow 3: All Handlers Process (Pipeline)**
```
Request → Handler1 (preprocesses) → Handler2 (preprocesses) → Handler3 (processes) → Response
```

**Flow 4: No Handler Processes**
```
Request → Handler1 (passes) → Handler2 (passes) → Handler3 (passes) → null/default response
```

### Chain Execution Models

**Model 1: Stop on First Handler (Classic)**
```java
public interface Handler {
    void setNext(Handler next);
    Response handle(Request request);
}

public abstract class AbstractHandler implements Handler {
    private Handler next;
    
    @Override
    public void setNext(Handler next) {
        this.next = next;
    }
    
    @Override
    public Response handle(Request request) {
        if (canHandle(request)) {
            return doHandle(request);
        }
        
        if (next != null) {
            return next.handle(request); // Pass to next
        }
        
        return null; // End of chain
    }
    
    protected abstract boolean canHandle(Request request);
    protected abstract Response doHandle(Request request);
}
```

**Model 2: Pipeline (All Handlers Process)**
```java
public abstract class PipelineHandler implements Handler {
    private Handler next;
    
    @Override
    public Response handle(Request request) {
        // Preprocess
        preProcess(request);
        
        // Continue chain
        Response response = (next != null) 
            ? next.handle(request) 
            : defaultResponse();
        
        // Postprocess
        postProcess(response);
        
        return response;
    }
    
    protected abstract void preProcess(Request request);
    protected abstract void postProcess(Response response);
}
```

**Model 3: Branch Chain (Conditional Routing)**
```java
public class BranchingHandler implements Handler {
    private Handler successPath;
    private Handler errorPath;
    
    @Override
    public Response handle(Request request) {
        if (validate(request)) {
            return successPath.handle(request);
        } else {
            return errorPath.handle(request);
        }
    }
}
```

### Scalability Strategies

**Horizontal Scaling:**
- Each handler can be a separate microservice
- API Gateway routes to handler chain
- Service mesh handles inter-service communication
- Handlers scale independently based on load

**Vertical Scaling:**
- Thread pools for concurrent request processing
- Async handlers for non-blocking execution
- Parallel chain execution where possible

### Performance Bottlenecks

**1. Linear Chain Traversal:**
```java
// PROBLEM: O(n) lookup for every request
public Response handle(Request request) {
    Handler current = firstHandler;
    while (current != null) {
        if (current.canHandle(request)) {
            return current.handle(request);
        }
        current = current.getNext();
    }
    return null;
}

// SOLUTION: Use map for direct lookup
public class OptimizedChain {
    private final Map<String, Handler> handlerMap = new HashMap<>();
    
    public Response handle(Request request) {
        String type = request.getType();
        Handler handler = handlerMap.get(type);
        
        if (handler != null) {
            return handler.handle(request);
        }
        
        return defaultHandler.handle(request);
    }
}
```

**2. Blocking Handlers:**
```java
// PROBLEM: One slow handler blocks entire chain
public Response handle(Request request) {
    preProcess(request); // Blocks here
    return next.handle(request);
}

// SOLUTION: Async chain execution
public CompletableFuture<Response> handleAsync(Request request) {
    return CompletableFuture.supplyAsync(() -> preProcess(request))
        .thenCompose(processed -> next.handleAsync(processed));
}
```

**3. Deep Call Stack:**
```java
// PROBLEM: Deep recursion for long chains
// Handler1 → Handler2 → Handler3 → ... → Handler100
// Risk of StackOverflowError

// SOLUTION: Iterative chain traversal
public Response handle(Request request) {
    Handler current = this;
    while (current != null) {
        if (current.canHandle(request)) {
            return current.doHandle(request);
        }
        current = current.getNext();
    }
    return null;
}
```

### Consistency Models

**Strong Consistency (Synchronous Chain):**
- Each handler completes before next handler executes
- Easy to reason about
- Suitable for validation chains

**Eventual Consistency (Async Chain):**
- Handlers execute asynchronously
- Results may arrive out of order
- Suitable for logging, metrics pipelines

### Failure Modes & Recovery Paths

**1. Handler Failure:**
```java
public class ResilientHandler extends AbstractHandler {
    
    @Override
    public Response handle(Request request) {
        try {
            if (canHandle(request)) {
                return doHandle(request);
            }
        } catch (Exception e) {
            logger.error("Handler {} failed", getClass().getSimpleName(), e);
            // Continue chain despite error
        }
        
        return (next != null) ? next.handle(request) : null;
    }
}
```

**2. Circuit Breaker in Chain:**
```java
public class CircuitBreakerHandler extends AbstractHandler {
    private final CircuitBreaker circuitBreaker;
    
    @Override
    protected Response doHandle(Request request) {
        return circuitBreaker.executeSupplier(() -> 
            externalService.process(request)
        );
    }
}
```

**3. Fallback Handler:**
```java
public class ChainWithFallback {
    private final Handler primaryChain;
    private final Handler fallbackChain;
    
    public Response handle(Request request) {
        try {
            return primaryChain.handle(request);
        } catch (Exception e) {
            logger.warn("Primary chain failed, using fallback", e);
            return fallbackChain.handle(request);
        }
    }
}
```

### Trade-offs at FAANG Scale

| Decision | Benefit | Cost | When to Use |
|----------|---------|------|-------------|
| **Sequential Chain** | Simple, ordered processing | Slow, blocking | Validation pipelines |
| **Parallel Chain** | Fast, concurrent | Complex coordination | Independent processors |
| **Dynamic Chain** | Flexible, runtime config | Management overhead | Multi-tenant systems |
| **Static Chain** | Fast, compile-time safety | Less flexible | Known, fixed pipelines |
| **Sync Processing** | Immediate feedback | Blocks caller | Critical path operations |
| **Async Processing** | High throughput | Eventual consistency | Logging, metrics |

### Design Decisions at FAANG-Scale

**1. Handler Registration:**

**Static Registration (Compile-Time):**
```java
@Configuration
public class HandlerChainConfig {
    @Bean
    public Handler handlerChain(
        AuthHandler auth,
        ValidationHandler validation,
        RateLimitHandler rateLimit,
        BusinessLogicHandler business
    ) {
        auth.setNext(validation);
        validation.setNext(rateLimit);
        rateLimit.setNext(business);
        return auth; // Return first handler
    }
}
```

**Dynamic Registration (Runtime):**
```java
@Service
public class DynamicHandlerChain {
    private final List<Handler> handlers = new CopyOnWriteArrayList<>();
    
    public void addHandler(Handler handler) {
        handlers.add(handler);
        rebuildChain();
    }
    
    public void removeHandler(Handler handler) {
        handlers.remove(handler);
        rebuildChain();
    }
    
    private void rebuildChain() {
        for (int i = 0; i < handlers.size() - 1; i++) {
            handlers.get(i).setNext(handlers.get(i + 1));
        }
    }
}
```

**2. Handler Ordering:**

**Priority-Based:**
```java
public class PriorityHandler implements Handler, Comparable<PriorityHandler> {
    private final int priority;
    
    @Override
    public int compareTo(PriorityHandler other) {
        return Integer.compare(this.priority, other.priority);
    }
}

// Chain builder
public Handler buildChain(List<PriorityHandler> handlers) {
    handlers.sort(Comparator.naturalOrder());
    
    for (int i = 0; i < handlers.size() - 1; i++) {
        handlers.get(i).setNext(handlers.get(i + 1));
    }
    
    return handlers.get(0);
}
```

**Annotation-Based:**
```java
@Order(1)
@Component
public class AuthHandler extends AbstractHandler { }

@Order(2)
@Component
public class ValidationHandler extends AbstractHandler { }

@Order(3)
@Component
public class BusinessLogicHandler extends AbstractHandler { }
```

**3. Chain Termination:**

**Explicit Termination:**
```java
if (canHandle(request)) {
    return doHandle(request); // Stop chain
}
return next.handle(request); // Continue chain
```

**Implicit Termination:**
```java
// Always pass to next, last handler provides response
Response response = (next != null) ? next.handle(request) : defaultResponse();
return enrichResponse(response);
```

**4. Request Modification:**

**Immutable Requests:**
```java
public Response handle(Request request) {
    Request modified = request.withAdditionalData(processedData);
    return next.handle(modified);
}
```

**Mutable Requests (Context):**
```java
public Response handle(RequestContext context) {
    context.addAttribute("processed_by", getClass().getSimpleName());
    return next.handle(context);
}
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Example: API Gateway Request Processing Chain

**Assumptions:**
- 100K requests/second at peak
- Average chain length: 5 handlers
- Handler processing times:
  - Auth: 5ms
  - Rate Limit: 2ms
  - Validation: 3ms
  - Transform: 10ms
  - Business Logic: 30ms
- Target latency: < 100ms (p95)

**Processing Capacity:**
```
Total processing per request: 5 + 2 + 3 + 10 + 30 = 50ms

At 100K req/sec:
CPU time required: 100,000 * 0.05s = 5,000 CPU-seconds/second

Required cores: 5,000 cores
With 50% overhead: 7,500 cores
Typical server: 32 cores

Required servers: 7,500 / 32 ≈ 235 servers
```

**Per-Handler Capacity:**
```
Auth Handler:
- 100K req/sec * 5ms = 500 CPU-sec/sec
- Required cores: 500 (~16 servers @ 32 cores)

Rate Limit Handler:
- 100K req/sec * 2ms = 200 CPU-sec/sec
- Required cores: 200 (~7 servers)

Validation Handler:
- 100K req/sec * 3ms = 300 CPU-sec/sec
- Required cores: 300 (~10 servers)

Transform Handler:
- 100K req/sec * 10ms = 1,000 CPU-sec/sec
- Required cores: 1,000 (~32 servers)

Business Logic Handler:
- 100K req/sec * 30ms = 3,000 CPU-sec/sec
- Required cores: 3,000 (~94 servers)
```

**Latency Budget:**
```
Target: 100ms (p95)

- Handler chain: 50ms
- Network latency: 20ms
- Queue time: 10ms
- Database queries: 15ms
- Buffer: 5ms
━━━━━━━━━━━━━━━━━━━━━━
Total: 100ms
```

**Memory Requirements:**
```
Request context: ~5KB per request
In-flight requests (at 100K/sec with 50ms processing): 
100,000 * 0.05 = 5,000 concurrent requests

Memory: 5,000 * 5KB = 25MB

With 10x safety margin: 250MB per server
```

**Network Bandwidth:**
```
Request size: 10KB average
Response size: 50KB average

Ingress: 100K req/sec * 10KB = 1GB/sec = 8 Gbps
Egress: 100K req/sec * 50KB = 5GB/sec = 40 Gbps

Total per datacenter: ~50 Gbps
```

**Why These Numbers Matter:**
- Handler processing time directly impacts latency
- Slow handlers become bottlenecks
- Independent scaling of handlers optimizes cost
- Chain depth affects overall latency
- Async handlers reduce blocking time

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Handler Chain Configuration Storage

**Dynamic Chain Configuration:**
```sql
CREATE TABLE handler_chains (
    id BIGSERIAL PRIMARY KEY,
    chain_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE chain_handlers (
    id BIGSERIAL PRIMARY KEY,
    chain_id BIGINT NOT NULL REFERENCES handler_chains(id),
    handler_type VARCHAR(100) NOT NULL,
    handler_config JSONB,
    order_position INT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(chain_id, order_position)
);

CREATE INDEX idx_chain_handlers ON chain_handlers(chain_id, order_position);

-- Example data
INSERT INTO handler_chains (chain_name, description) 
VALUES ('api_request_chain', 'Standard API request processing chain');

INSERT INTO chain_handlers (chain_id, handler_type, handler_config, order_position)
VALUES 
    (1, 'AuthHandler', '{"issuer": "auth.example.com"}', 1),
    (1, 'RateLimitHandler', '{"limit": 100, "window": 60}', 2),
    (1, 'ValidationHandler', '{}', 3),
    (1, 'BusinessLogicHandler', '{}', 4);
```

**Handler Execution Metrics:**
```sql
CREATE TABLE handler_execution_metrics (
    id BIGSERIAL PRIMARY KEY,
    handler_type VARCHAR(100) NOT NULL,
    request_id VARCHAR(100) NOT NULL,
    execution_time_ms INT NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

CREATE INDEX idx_handler_metrics ON handler_execution_metrics(handler_type, timestamp);
CREATE INDEX idx_request_trace ON handler_execution_metrics(request_id);

-- Partitions (daily)
CREATE TABLE handler_execution_metrics_2026_01_26 PARTITION OF handler_execution_metrics
    FOR VALUES FROM ('2026-01-26') TO ('2026-01-27');
```

**Request Processing Audit Log:**
```sql
CREATE TABLE request_processing_log (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(100) UNIQUE NOT NULL,
    chain_name VARCHAR(100) NOT NULL,
    handlers_executed TEXT[], -- Array of handler names
    total_execution_time_ms INT,
    status VARCHAR(50), -- success, failed, partial
    error_handler VARCHAR(100), -- Which handler failed
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_request_status ON request_processing_log(status, created_at);
CREATE INDEX idx_chain_performance ON request_processing_log(chain_name, created_at);
```

### Caching Handler Results

**Redis Cache for Handler Decisions:**
```java
@Service
public class CachedAuthHandler extends AbstractHandler {
    private final RedisTemplate<String, AuthResult> redis;
    
    @Override
    protected Response doHandle(Request request) {
        String token = request.getToken();
        String cacheKey = "auth:token:" + token;
        
        // Check cache
        AuthResult cached = redis.opsForValue().get(cacheKey);
        if (cached != null) {
            logger.debug("Auth result cache hit");
            return cached.toResponse();
        }
        
        // Validate token
        AuthResult result = authService.validate(token);
        
        // Cache for 5 minutes
        redis.opsForValue().set(cacheKey, result, Duration.ofMinutes(5));
        
        return result.toResponse();
    }
}
```

**Cache Key Strategy:**
```java
public class RateLimitHandler extends AbstractHandler {
    
    private String buildCacheKey(Request request) {
        // Different strategies based on use case
        
        // Per-user rate limiting
        return "ratelimit:user:" + request.getUserId();
        
        // Per-IP rate limiting
        return "ratelimit:ip:" + request.getClientIp();
        
        // Per-API-key rate limiting
        return "ratelimit:apikey:" + request.getApiKey();
        
        // Composite key
        return String.format("ratelimit:%s:%s", 
            request.getApiKey(), 
            request.getEndpoint()
        );
    }
}
```

### Chain Configuration Hot Reload

```java
@Service
public class ConfigurableHandlerChain {
    private volatile Handler firstHandler;
    private final HandlerFactory handlerFactory;
    
    @PostConstruct
    public void initialize() {
        loadChainConfiguration();
    }
    
    @Scheduled(fixedDelay = 60000) // Every minute
    public void reloadConfiguration() {
        logger.info("Reloading handler chain configuration");
        loadChainConfiguration();
    }
    
    private void loadChainConfiguration() {
        List<ChainHandlerConfig> configs = chainRepository
            .findByChainNameAndEnabled("api_request_chain", true)
            .stream()
            .sorted(Comparator.comparing(ChainHandlerConfig::getOrderPosition))
            .collect(Collectors.toList());
        
        Handler newChain = buildChain(configs);
        
        // Atomic update
        this.firstHandler = newChain;
    }
    
    private Handler buildChain(List<ChainHandlerConfig> configs) {
        if (configs.isEmpty()) {
            return null;
        }
        
        List<Handler> handlers = configs.stream()
            .map(handlerFactory::createHandler)
            .collect(Collectors.toList());
        
        for (int i = 0; i < handlers.size() - 1; i++) {
            handlers.get(i).setNext(handlers.get(i + 1));
        }
        
        return handlers.get(0);
    }
    
    public Response handle(Request request) {
        Handler chain = firstHandler; // Local copy for thread-safety
        return (chain != null) ? chain.handle(request) : defaultResponse();
    }
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Async Chain Execution

```java
@Service
public class AsyncHandlerChain {
    private final ExecutorService executor;
    
    public CompletableFuture<Response> handleAsync(Request request) {
        return CompletableFuture.supplyAsync(() -> {
            return authHandler.handle(request);
        }, executor)
        .thenApplyAsync(authResponse -> {
            if (!authResponse.isAuthenticated()) {
                throw new UnauthorizedException();
            }
            return validationHandler.handle(request);
        }, executor)
        .thenApplyAsync(validationResponse -> {
            if (!validationResponse.isValid()) {
                throw new ValidationException();
            }
            return businessLogicHandler.handle(request);
        }, executor);
    }
}
```

### Parallel Handler Execution

```java
@Service
public class ParallelHandlerChain {
    
    public Response handle(Request request) {
        // Execute independent handlers in parallel
        CompletableFuture<ValidationResult> validation = 
            CompletableFuture.supplyAsync(() -> validationHandler.validate(request));
        
        CompletableFuture<RateLimitResult> rateLimit = 
            CompletableFuture.supplyAsync(() -> rateLimitHandler.check(request));
        
        CompletableFuture<AuthResult> auth = 
            CompletableFuture.supplyAsync(() -> authHandler.authenticate(request));
        
        // Wait for all to complete
        CompletableFuture.allOf(validation, rateLimit, auth).join();
        
        // Check results
        if (!auth.join().isAuthenticated()) {
            throw new UnauthorizedException();
        }
        
        if (!validation.join().isValid()) {
            throw new ValidationException();
        }
        
        if (!rateLimit.join().isAllowed()) {
            throw new RateLimitExceededException();
        }
        
        // Continue with business logic
        return businessLogicHandler.handle(request);
    }
}
```

### Circuit Breaker Integration

```java
public class CircuitBreakerHandler extends AbstractHandler {
    private final CircuitBreaker circuitBreaker;
    
    @Override
    protected Response doHandle(Request request) {
        Try<Response> result = Try.ofSupplier(
            CircuitBreaker.decorateSupplier(
                circuitBreaker,
                () -> externalService.call(request)
            )
        );
        
        if (result.isSuccess()) {
            return result.get();
        }
        
        // Circuit open or call failed
        logger.warn("Circuit breaker triggered, using fallback");
        return fallbackResponse(request);
    }
    
    private Response fallbackResponse(Request request) {
        // Return cached response or default
        return cacheService.getCached(request)
            .orElse(Response.serviceUnavailable());
    }
}
```

### Retry Handler

```java
public class RetryHandler extends AbstractHandler {
    private final int maxRetries;
    private final Duration retryDelay;
    
    @Override
    protected Response doHandle(Request request) {
        int attempt = 0;
        Exception lastException = null;
        
        while (attempt < maxRetries) {
            try {
                return next.handle(request);
            } catch (TransientException e) {
                lastException = e;
                attempt++;
                
                if (attempt < maxRetries) {
                    logger.warn("Attempt {} failed, retrying in {}", 
                        attempt, retryDelay);
                    sleep(retryDelay.multipliedBy(attempt)); // Exponential backoff
                }
            } catch (PermanentException e) {
                // Don't retry permanent failures
                throw e;
            }
        }
        
        throw new MaxRetriesExceededException(lastException);
    }
}
```

### Timeout Handler

```java
public class TimeoutHandler extends AbstractHandler {
    private final Duration timeout;
    private final ExecutorService executor;
    
    @Override
    protected Response doHandle(Request request) {
        CompletableFuture<Response> future = CompletableFuture.supplyAsync(
            () -> next.handle(request),
            executor
        );
        
        try {
            return future.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            logger.error("Handler timed out after {}", timeout);
            throw new HandlerTimeoutException(timeout);
        } catch (Exception e) {
            throw new HandlerExecutionException(e);
        }
    }
}
```

### Bulkhead Pattern

```java
@Component
public class BulkheadHandler extends AbstractHandler {
    private final Semaphore semaphore;
    
    public BulkheadHandler() {
        // Limit concurrent executions
        this.semaphore = new Semaphore(100);
    }
    
    @Override
    protected Response doHandle(Request request) {
        try {
            if (!semaphore.tryAcquire(1, TimeUnit.SECONDS)) {
                throw new BulkheadFullException("Too many concurrent requests");
            }
            
            try {
                return next.handle(request);
            } finally {
                semaphore.release();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new HandlerInterruptedException(e);
        }
    }
}
```

### Graceful Degradation

```java
@Service
public class DegradableHandlerChain {
    private final Handler fullChain;
    private final Handler essentialChain;
    private final HealthIndicator healthIndicator;
    
    public Response handle(Request request) {
        if (healthIndicator.isHealthy()) {
            // Full processing
            return fullChain.handle(request);
        } else {
            // Degraded mode - skip non-essential handlers
            logger.warn("System degraded, using essential chain only");
            return essentialChain.handle(request);
        }
    }
}
```

### Load Shedding

```java
public class LoadSheddingHandler extends AbstractHandler {
    private final AtomicInteger inFlightRequests = new AtomicInteger(0);
    private final int maxInFlight = 1000;
    
    @Override
    protected Response doHandle(Request request) {
        if (inFlightRequests.get() >= maxInFlight) {
            // Shed load
            logger.warn("Load shedding triggered, rejecting request");
            throw new ServiceOverloadedException("System at capacity");
        }
        
        inFlightRequests.incrementAndGet();
        try {
            return next.handle(request);
        } finally {
            inFlightRequests.decrementAndGet();
        }
    }
}
```

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### Authentication Handler

```java
@Component
@Order(1) // First in chain
public class AuthenticationHandler extends AbstractHandler {
    private final JwtService jwtService;
    
    @Override
    protected boolean canHandle(Request request) {
        return true; // All requests need auth
    }
    
    @Override
    protected Response doHandle(Request request) {
        String token = extractToken(request);
        
        if (token == null) {
            throw new UnauthorizedException("Missing authentication token");
        }
        
        try {
            Claims claims = jwtService.validateToken(token);
            
            // Add user context to request
            request.setUserContext(new UserContext(
                claims.getSubject(),
                claims.get("roles", List.class)
            ));
            
            // Continue chain
            return next.handle(request);
            
        } catch (JwtException e) {
            throw new UnauthorizedException("Invalid token", e);
        }
    }
    
    private String extractToken(Request request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }
}
```

### Authorization Handler

```java
@Component
@Order(2)
public class AuthorizationHandler extends AbstractHandler {
    private final PermissionService permissionService;
    
    @Override
    protected Response doHandle(Request request) {
        UserContext user = request.getUserContext();
        String resource = request.getPath();
        String action = request.getMethod();
        
        if (!permissionService.hasPermission(user, resource, action)) {
            throw new ForbiddenException(
                String.format("User %s not authorized for %s on %s",
                    user.getUserId(), action, resource)
            );
        }
        
        return next.handle(request);
    }
}
```

### Rate Limiting Handler

```java
@Component
@Order(3)
public class RateLimitHandler extends AbstractHandler {
    private final RateLimiterService rateLimiter;
    
    @Override
    protected Response doHandle(Request request) {
        String userId = request.getUserContext().getUserId();
        String key = "ratelimit:" + userId;
        
        if (!rateLimiter.tryAcquire(key, 100, Duration.ofMinutes(1))) {
            throw new RateLimitExceededException(
                "Rate limit exceeded: 100 requests per minute"
            );
        }
        
        // Add rate limit headers to response
        Response response = next.handle(request);
        response.setHeader("X-RateLimit-Limit", "100");
        response.setHeader("X-RateLimit-Remaining", 
            String.valueOf(rateLimiter.getRemaining(key)));
        
        return response;
    }
}
```

### Input Validation Handler

```java
@Component
@Order(4)
public class ValidationHandler extends AbstractHandler {
    private final Validator validator;
    
    @Override
    protected Response doHandle(Request request) {
        // Validate request structure
        Set<ConstraintViolation<Request>> violations = validator.validate(request);
        
        if (!violations.isEmpty()) {
            List<String> errors = violations.stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toList());
            
            throw new ValidationException("Request validation failed", errors);
        }
        
        // Sanitize inputs to prevent injection attacks
        sanitizeInputs(request);
        
        return next.handle(request);
    }
    
    private void sanitizeInputs(Request request) {
        // Remove potentially malicious content
        String sanitizedBody = Jsoup.clean(
            request.getBody(), 
            Whitelist.basic()
        );
        request.setBody(sanitizedBody);
    }
}
```

### Audit Logging Handler

```java
@Component
public class AuditLogHandler extends AbstractHandler {
    private final AuditLogService auditLog;
    
    @Override
    protected Response doHandle(Request request) {
        String requestId = UUID.randomUUID().toString();
        request.setRequestId(requestId);
        
        Instant startTime = Instant.now();
        
        AuditEntry entry = AuditEntry.builder()
            .requestId(requestId)
            .userId(request.getUserContext().getUserId())
            .action(request.getMethod() + " " + request.getPath())
            .timestamp(startTime)
            .ipAddress(request.getClientIp())
            .build();
        
        try {
            Response response = next.handle(request);
            
            entry.setStatus("SUCCESS");
            entry.setDurationMs(Duration.between(startTime, Instant.now()).toMillis());
            
            return response;
            
        } catch (Exception e) {
            entry.setStatus("FAILED");
            entry.setErrorMessage(e.getMessage());
            throw e;
            
        } finally {
            auditLog.log(entry);
        }
    }
}
```

### Data Masking Handler

```java
@Component
public class DataMaskingHandler extends AbstractHandler {
    
    @Override
    protected Response doHandle(Request request) {
        Response response = next.handle(request);
        
        // Mask sensitive data in response
        if (response.getBody() != null) {
            String maskedBody = maskSensitiveData(response.getBody());
            response.setBody(maskedBody);
        }
        
        return response;
    }
    
    private String maskSensitiveData(String body) {
        return body
            .replaceAll("\"ssn\":\\s*\"\\d{9}\"", "\"ssn\": \"***-**-****\"")
            .replaceAll("\"creditCard\":\\s*\"\\d{16}\"", "\"creditCard\": \"****-****-****-****\"")
            .replaceAll("\"password\":\\s*\"[^\"]+\"", "\"password\": \"[REDACTED]\"");
    }
}
```

### CORS Handler

```java
@Component
@Order(0) // Very first in chain
public class CorsHandler extends AbstractHandler {
    
    @Override
    protected Response doHandle(Request request) {
        // Handle preflight OPTIONS request
        if ("OPTIONS".equals(request.getMethod())) {
            Response response = new Response();
            addCorsHeaders(response, request);
            return response;
        }
        
        // Continue chain for actual request
        Response response = next.handle(request);
        addCorsHeaders(response, request);
        
        return response;
    }
    
    private void addCorsHeaders(Response response, Request request) {
        String origin = request.getHeader("Origin");
        
        if (isAllowedOrigin(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
            response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
            response.setHeader("Access-Control-Max-Age", "3600");
        }
    }
    
    private boolean isAllowedOrigin(String origin) {
        List<String> allowedOrigins = List.of(
            "https://app.example.com",
            "https://admin.example.com"
        );
        return allowedOrigins.contains(origin);
    }
}
```

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Express.js Middleware (Node.js)

**Problem:**
- Process HTTP requests through multiple stages
- Authentication, logging, parsing, validation
- Each middleware can modify request/response or terminate chain

**Implementation:**

```java
// Java equivalent of Express.js middleware pattern
public interface Middleware {
    void handle(Request req, Response res, NextFunction next);
}

@FunctionalInterface
public interface NextFunction {
    void next();
}

// Middleware chain executor
@Service
public class MiddlewareChain {
    private final List<Middleware> middlewares = new ArrayList<>();
    
    public void use(Middleware middleware) {
        middlewares.add(middleware);
    }
    
    public void execute(Request req, Response res) {
        executeChain(req, res, 0);
    }
    
    private void executeChain(Request req, Response res, int index) {
        if (index >= middlewares.size()) {
            return; // End of chain
        }
        
        Middleware current = middlewares.get(index);
        current.handle(req, res, () -> executeChain(req, res, index + 1));
    }
}

// Concrete middlewares
public class LoggingMiddleware implements Middleware {
    @Override
    public void handle(Request req, Response res, NextFunction next) {
        logger.info("Request: {} {}", req.getMethod(), req.getPath());
        long start = System.currentTimeMillis();
        
        next.next();
        
        long duration = System.currentTimeMillis() - start;
        logger.info("Response: {} - {}ms", res.getStatus(), duration);
    }
}

public class AuthMiddleware implements Middleware {
    @Override
    public void handle(Request req, Response res, NextFunction next) {
        String token = req.getHeader("Authorization");
        
        if (token == null || !isValid(token)) {
            res.setStatus(401);
            res.setBody("{\"error\": \"Unauthorized\"}");
            return; // Stop chain
        }
        
        req.setUser(extractUser(token));
        next.next();
    }
}

public class BodyParserMiddleware implements Middleware {
    @Override
    public void handle(Request req, Response res, NextFunction next) {
        if ("application/json".equals(req.getContentType())) {
            try {
                Object parsed = jsonParser.parse(req.getBody());
                req.setBody(parsed);
            } catch (JsonException e) {
                res.setStatus(400);
                res.setBody("{\"error\": \"Invalid JSON\"}");
                return;
            }
        }
        
        next.next();
    }
}

// Usage
@Configuration
public class MiddlewareConfig {
    @Bean
    public MiddlewareChain middlewareChain() {
        MiddlewareChain chain = new MiddlewareChain();
        chain.use(new LoggingMiddleware());
        chain.use(new CorsMiddleware());
        chain.use(new BodyParserMiddleware());
        chain.use(new AuthMiddleware());
        chain.use(new ValidationMiddleware());
        return chain;
    }
}
```

**Production Scale:**
- 1M requests/second
- Average 5 middlewares per request
- Latency: < 5ms for entire middleware chain
- Each middleware adds 0.5-2ms

### Example 2: Spring Security Filter Chain

**Problem:**
- Secure web applications with layered security
- Authentication, CSRF protection, session management, authorization
- Each filter performs specific security function

**Implementation:**

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            // Filter chain is implicitly created by Spring Security
            .csrf().csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            .and()
            .authorizeRequests()
                .antMatchers("/public/**").permitAll()
                .antMatchers("/api/**").authenticated()
                .antMatchers("/admin/**").hasRole("ADMIN")
            .and()
            .addFilterBefore(new JwtAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(new AuditFilter(), FilterSecurityInterceptor.class);
    }
}

// Custom filter in the chain
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        
        String token = extractToken(request);
        
        if (token != null && jwtService.validateToken(token)) {
            Claims claims = jwtService.getClaims(token);
            
            Authentication auth = new UsernamePasswordAuthenticationToken(
                claims.getSubject(),
                null,
                getAuthorities(claims)
            );
            
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        // Continue chain
        filterChain.doFilter(request, response);
    }
}

// Spring Security internally builds this filter chain:
/*
SecurityContextPersistenceFilter
↓
CsrfFilter
↓
JwtAuthenticationFilter (custom)
↓
UsernamePasswordAuthenticationFilter
↓
FilterSecurityInterceptor (authorization)
↓
AuditFilter (custom)
↓
Application Controller
*/
```

**Filter Chain Order:**
1. SecurityContextPersistenceFilter (loads security context)
2. CsrfFilter (CSRF protection)
3. JwtAuthenticationFilter (custom authentication)
4. AuthorizationFilter (access control)
5. ExceptionTranslationFilter (exception handling)

### Example 3: Approval Workflow System

**Problem:**
- Purchase orders require multi-level approval
- Amount-based routing (< $1K → Manager, < $10K → Director, $10K+ → VP)
- Each approver can approve, reject, or escalate

**Implementation:**

```java
// Approval handler interface
public interface ApprovalHandler {
    void setNext(ApprovalHandler next);
    ApprovalResult approve(PurchaseOrder po);
}

// Base approval handler
public abstract class BaseApprovalHandler implements ApprovalHandler {
    protected ApprovalHandler next;
    
    @Override
    public void setNext(ApprovalHandler next) {
        this.next = next;
    }
    
    @Override
    public ApprovalResult approve(PurchaseOrder po) {
        if (canApprove(po)) {
            return doApprove(po);
        }
        
        if (next != null) {
            return next.approve(po);
        }
        
        return ApprovalResult.rejected("No approver found for this amount");
    }
    
    protected abstract boolean canApprove(PurchaseOrder po);
    protected abstract ApprovalResult doApprove(PurchaseOrder po);
}

// Manager approval (up to $1K)
@Component
public class ManagerApprovalHandler extends BaseApprovalHandler {
    
    @Override
    protected boolean canApprove(PurchaseOrder po) {
        return po.getAmount().compareTo(new BigDecimal("1000")) < 0;
    }
    
    @Override
    protected ApprovalResult doApprove(PurchaseOrder po) {
        logger.info("Manager approving PO {} for ${}", po.getId(), po.getAmount());
        
        po.setStatus(OrderStatus.APPROVED);
        po.setApprovedBy("Manager");
        po.setApprovedAt(Instant.now());
        
        poRepository.save(po);
        notificationService.notifyRequester(po, "Approved by Manager");
        
        return ApprovalResult.approved("Manager", "Auto-approved under $1K");
    }
}

// Director approval ($1K - $10K)
@Component
public class DirectorApprovalHandler extends BaseApprovalHandler {
    
    @Override
    protected boolean canApprove(PurchaseOrder po) {
        BigDecimal amount = po.getAmount();
        return amount.compareTo(new BigDecimal("1000")) >= 0 &&
               amount.compareTo(new BigDecimal("10000")) < 0;
    }
    
    @Override
    protected ApprovalResult doApprove(PurchaseOrder po) {
        logger.info("Escalating to Director for approval: PO {} - ${}", 
            po.getId(), po.getAmount());
        
        po.setStatus(OrderStatus.PENDING_DIRECTOR_APPROVAL);
        poRepository.save(po);
        
        notificationService.notifyDirector(po);
        
        return ApprovalResult.pending("Director", "Awaiting director approval");
    }
}

// VP approval ($10K+)
@Component
public class VPApprovalHandler extends BaseApprovalHandler {
    
    @Override
    protected boolean canApprove(PurchaseOrder po) {
        return po.getAmount().compareTo(new BigDecimal("10000")) >= 0;
    }
    
    @Override
    protected ApprovalResult doApprove(PurchaseOrder po) {
        logger.info("Escalating to VP for approval: PO {} - ${}", 
            po.getId(), po.getAmount());
        
        po.setStatus(OrderStatus.PENDING_VP_APPROVAL);
        poRepository.save(po);
        
        notificationService.notifyVP(po);
        
        return ApprovalResult.pending("VP", "Awaiting VP approval");
    }
}

// Chain builder
@Configuration
public class ApprovalChainConfig {
    
    @Bean
    public ApprovalHandler approvalChain(
        ManagerApprovalHandler manager,
        DirectorApprovalHandler director,
        VPApprovalHandler vp
    ) {
        manager.setNext(director);
        director.setNext(vp);
        return manager;
    }
}

// Service
@Service
public class PurchaseOrderService {
    private final ApprovalHandler approvalChain;
    
    public ApprovalResult submitForApproval(PurchaseOrder po) {
        return approvalChain.approve(po);
    }
}
```

**Workflow:**
```
$500 PO → Manager (approves immediately)

$5000 PO → Manager (can't approve) → Director (requires manual approval)

$50000 PO → Manager (can't approve) → Director (can't approve) → VP (requires manual approval)
```

### Example 4: Log Level Filtering (Log4j/Logback)

**Problem:**
- Different log levels (TRACE, DEBUG, INFO, WARN, ERROR)
- Each logger in hierarchy checks if it should handle the message
- Pass to parent logger if not handled

**Implementation:**

```java
// Logger handler interface
public interface LogHandler {
    void setNext(LogHandler next);
    void log(LogLevel level, String message);
}

// Base log handler
public abstract class BaseLogHandler implements LogHandler {
    protected LogHandler next;
    protected LogLevel threshold;
    
    @Override
    public void setNext(LogHandler next) {
        this.next = next;
    }
    
    @Override
    public void log(LogLevel level, String message) {
        if (level.ordinal() >= threshold.ordinal()) {
            write(level, message);
        }
        
        // Always pass to next (unlike stop-on-first)
        if (next != null) {
            next.log(level, message);
        }
    }
    
    protected abstract void write(LogLevel level, String message);
}

// Console logger
public class ConsoleLogHandler extends BaseLogHandler {
    
    public ConsoleLogHandler(LogLevel threshold) {
        this.threshold = threshold;
    }
    
    @Override
    protected void write(LogLevel level, String message) {
        String timestamp = Instant.now().toString();
        System.out.printf("[%s] %s - %s%n", timestamp, level, message);
    }
}

// File logger
public class FileLogHandler extends BaseLogHandler {
    private final String filename;
    
    public FileLogHandler(String filename, LogLevel threshold) {
        this.filename = filename;
        this.threshold = threshold;
    }
    
    @Override
    protected void write(LogLevel level, String message) {
        try (FileWriter fw = new FileWriter(filename, true)) {
            String timestamp = Instant.now().toString();
            fw.write(String.format("[%s] %s - %s%n", timestamp, level, message));
        } catch (IOException e) {
            System.err.println("Failed to write to log file: " + e.getMessage());
        }
    }
}

// Error notification handler
public class ErrorNotificationHandler extends BaseLogHandler {
    
    public ErrorNotificationHandler() {
        this.threshold = LogLevel.ERROR;
    }
    
    @Override
    protected void write(LogLevel level, String message) {
        // Send alert for errors
        alertService.sendAlert("Error logged: " + message);
    }
}

// Logger configuration
@Configuration
public class LoggerConfig {
    
    @Bean
    public LogHandler loggerChain() {
        // Build chain: Console → File → Error Notification
        LogHandler console = new ConsoleLogHandler(LogLevel.DEBUG);
        LogHandler file = new FileLogHandler("app.log", LogLevel.INFO);
        LogHandler errorAlert = new ErrorNotificationHandler();
        
        console.setNext(file);
        file.setNext(errorAlert);
        
        return console;
    }
}

// Usage
logger.log(LogLevel.DEBUG, "Debug message");  // Only console
logger.log(LogLevel.INFO, "Info message");    // Console + file
logger.log(LogLevel.ERROR, "Error message");  // Console + file + alert
```

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Crisp Interview Answer

**"Explain the Chain of Responsibility Pattern":**

*"Chain of Responsibility is a behavioral pattern that passes requests along a chain of handlers. Each handler decides whether to process the request or pass it to the next handler. This decouples the sender from the receiver.*

*I've used this extensively in API gateway request processing. For example, when a request comes in, it goes through a chain: CORS handler → Authentication → Rate limiting → Validation → Business logic. Each handler either processes and continues, or rejects the request.*

*The key benefit is flexibility and loose coupling. I can add, remove, or reorder handlers without touching other handlers or the client code. It's also perfect for building middleware pipelines like Express.js or Spring Security filters.*

*At scale, I optimize the chain by making handlers async where possible, caching handler decisions (like auth tokens), and running independent handlers in parallel. For example, auth and rate-limit checks can run concurrently since they don't depend on each other.*

*The main considerations are chain length—too many handlers add latency—and error handling. I ensure each handler is resilient, with timeout protection and fallbacks. I also instrument each handler for observability to identify bottlenecks."*

### Common Follow-Up Questions

**Q1: "What's the difference between Chain of Responsibility and Decorator patterns?"**

| Aspect | Chain of Responsibility | Decorator Pattern |
|--------|------------------------|-------------------|
| **Purpose** | Pass request along until handled | Add behavior to an object |
| **Termination** | Can stop at any handler | Always processes through all decorators |
| **Flow** | Linear chain, may skip handlers | Nested, each decorator processes |
| **Responsibility** | One handler processes | All decorators contribute |
| **Example** | Auth → Validation → Business logic | Base Logger → Timestamp → Level → Output |

**Answer:**
*"Chain of Responsibility is about finding the right handler—request may stop at first handler. Decorator always processes through all layers, adding behavior at each step. For request processing where you want to potentially reject early (like auth failure), use Chain. For adding layers of behavior (like logging with timestamp + level + formatting), use Decorator."*

**Q2: "How do you prevent long chains from causing performance issues?"**

```java
// Problem: Long sequential chain
Auth (5ms) → RateLimit (2ms) → Validation (3ms) → Transform (10ms) → Business (30ms)
Total: 50ms

// Solution 1: Parallel execution for independent handlers
CompletableFuture<AuthResult> auth = async(() -> authHandler.check());
CompletableFuture<RateLimitResult> rateLimit = async(() -> rateLimitHandler.check());
CompletableFuture.allOf(auth, rateLimit).join();
Total: max(5ms, 2ms) = 5ms (parallelized)

// Solution 2: Short-circuit on failure
public Response handle(Request req) {
    if (!authHandler.check(req)) {
        return Response.unauthorized(); // Stop immediately
    }
    // Continue only if auth passes
    return next.handle(req);
}

// Solution 3: Cache handler results
@Cacheable("auth-results")
public AuthResult authenticate(String token) {
    // Expensive auth check
    return authService.validate(token);
}

// Solution 4: Handler map instead of linear chain
Map<RequestType, Handler> handlerMap;
Handler handler = handlerMap.get(request.getType());
return handler.handle(request); // O(1) instead of O(n)
```

**Answer:**
*"I optimize long chains by: 1) Running independent handlers in parallel (auth + rate limit), 2) Short-circuiting on early failures to avoid processing remaining handlers, 3) Caching expensive handler decisions, and 4) Using a handler map for direct lookup instead of sequential traversal when possible."*

**Q3: "How do you handle errors in the middle of a chain?"**

```java
// Strategy 1: Fail Fast (Stop chain)
public Response handle(Request req) {
    try {
        if (canHandle(req)) {
            return doHandle(req);
        }
        return next.handle(req);
    } catch (Exception e) {
        logger.error("Handler failed", e);
        throw e; // Stop chain
    }
}

// Strategy 2: Continue Despite Errors (Resilient)
public Response handle(Request req) {
    try {
        if (canHandle(req)) {
            return doHandle(req);
        }
    } catch (Exception e) {
        logger.error("Handler failed, continuing chain", e);
        metrics.increment("handler.error");
    }
    
    return (next != null) ? next.handle(req) : null;
}

// Strategy 3: Fallback Handler
public Response handle(Request req) {
    try {
        return next.handle(req);
    } catch (Exception e) {
        return fallbackHandler.handle(req);
    }
}

// Strategy 4: Error Handler in Chain
public class ErrorHandlerDecorator extends AbstractHandler {
    @Override
    public Response handle(Request req) {
        try {
            return next.handle(req);
        } catch (ValidationException e) {
            return Response.badRequest(e.getMessage());
        } catch (AuthException e) {
            return Response.unauthorized(e.getMessage());
        } catch (Exception e) {
            return Response.internalError("Unexpected error");
        }
    }
}
```

**Answer:**
*"It depends on the use case. For security checks (auth), I fail fast—any error stops the chain. For optional handlers like analytics, I log the error and continue. I also use an error handler wrapper at the chain's end to convert exceptions to proper HTTP responses. For critical chains, I add circuit breakers to prevent cascading failures."*

**Q4: "Can you implement dynamic chain reconfiguration?"**

```java
@Service
public class DynamicChainManager {
    private volatile List<Handler> handlers = new CopyOnWriteArrayList<>();
    
    public void addHandler(Handler handler, int position) {
        handlers.add(position, handler);
        rebuildChain();
    }
    
    public void removeHandler(Handler handler) {
        handlers.remove(handler);
        rebuildChain();
    }
    
    public void reorderHandler(Handler handler, int newPosition) {
        handlers.remove(handler);
        handlers.add(newPosition, handler);
        rebuildChain();
    }
    
    private synchronized void rebuildChain() {
        for (int i = 0; i < handlers.size() - 1; i++) {
            handlers.get(i).setNext(handlers.get(i + 1));
        }
        
        // Last handler has no next
        if (!handlers.isEmpty()) {
            handlers.get(handlers.size() - 1).setNext(null);
        }
    }
    
    public Handler getChain() {
        return handlers.isEmpty() ? null : handlers.get(0);
    }
}

// Feature flag-based chain
@Service
public class FeatureFlagChain {
    
    public Response handle(Request req) {
        Handler chain = buildChain(req);
        return chain.handle(req);
    }
    
    private Handler buildChain(Request req) {
        List<Handler> handlers = new ArrayList<>();
        
        handlers.add(new AuthHandler());
        
        if (featureFlags.isEnabled("rate-limiting")) {
            handlers.add(new RateLimitHandler());
        }
        
        if (featureFlags.isEnabled("advanced-validation")) {
            handlers.add(new AdvancedValidationHandler());
        } else {
            handlers.add(new BasicValidationHandler());
        }
        
        handlers.add(new BusinessLogicHandler());
        
        // Link chain
        for (int i = 0; i < handlers.size() - 1; i++) {
            handlers.get(i).setNext(handlers.get(i + 1));
        }
        
        return handlers.get(0);
    }
}
```

**Answer:**
*"I use a CopyOnWriteArrayList to store handlers and rebuild the chain atomically when handlers change. For feature flags, I rebuild the chain per-request based on enabled features. I also use configuration databases where handler order and configuration are stored, reloaded periodically for hot-swapping handlers without redeployment."*

**Q5: "How do you test Chain of Responsibility?"**

```java
// Test individual handler
@Test
public void testAuthHandler() {
    AuthHandler handler = new AuthHandler(mockAuthService);
    Handler mockNext = mock(Handler.class);
    handler.setNext(mockNext);
    
    Request validRequest = new Request().withToken("valid-token");
    when(mockAuthService.validate("valid-token")).thenReturn(true);
    
    handler.handle(validRequest);
    
    verify(mockNext).handle(validRequest); // Passed to next
}

// Test chain stops on auth failure
@Test
public void testChainStopsOnAuthFailure() {
    AuthHandler authHandler = new AuthHandler(mockAuthService);
    ValidationHandler validationHandler = mock(ValidationHandler.class);
    authHandler.setNext(validationHandler);
    
    Request invalidRequest = new Request().withToken("invalid-token");
    when(mockAuthService.validate("invalid-token")).thenReturn(false);
    
    assertThrows(UnauthorizedException.class, () -> {
        authHandler.handle(invalidRequest);
    });
    
    verify(validationHandler, never()).handle(any()); // Never reached
}

// Test full chain integration
@Test
@SpringBootTest
public void testFullChain() {
    Request request = new Request()
        .withToken("valid-token")
        .withBody(validJson)
        .withHeaders(Map.of("Origin", "https://app.example.com"));
    
    Response response = handlerChain.handle(request);
    
    assertEquals(200, response.getStatus());
    assertNotNull(response.getBody());
}

// Test chain order
@Test
public void testHandlerOrder() {
    List<String> executionOrder = new ArrayList<>();
    
    Handler h1 = createTestHandler("H1", executionOrder);
    Handler h2 = createTestHandler("H2", executionOrder);
    Handler h3 = createTestHandler("H3", executionOrder);
    
    h1.setNext(h2);
    h2.setNext(h3);
    
    h1.handle(new Request());
    
    assertEquals(List.of("H1", "H2", "H3"), executionOrder);
}
```

**Answer:**
*"I test each handler in isolation with mocked dependencies and next handler. I verify that handlers correctly pass requests to next or stop the chain. For integration tests, I test the full chain with real handlers. I also test chain order, error handling at each stage, and that adding/removing handlers doesn't break the chain."*

**Q6: "When would you NOT use Chain of Responsibility?"**

**Avoid Chain of Responsibility When:**
- Single handler always processes (just call directly)
- Handler selection logic is complex (use Strategy + Factory)
- Need multiple handlers to always execute (use Observer/Pipeline)
- Return value from each handler needed (use Decorator)
- Performance critical with many handlers (use direct dispatch map)

**Example:**
```java
// BAD: Chain of Responsibility for simple routing
Handler handler = firstHandler;
while (handler != null) {
    if (handler.canHandle(request)) {
        return handler.handle(request);
    }
    handler = handler.getNext();
}

// GOOD: Direct routing with map
Map<String, Handler> handlers = Map.of(
    "PAYMENT", paymentHandler,
    "SHIPMENT", shipmentHandler,
    "REFUND", refundHandler
);

Handler handler = handlers.get(request.getType());
return handler.handle(request);
```

**Answer:**
*"Don't use Chain of Responsibility for simple routing—use a map for O(1) lookup. If all handlers must execute, use Pipeline or Observer pattern. If you need complex handler selection logic, use Strategy pattern with a factory. Chain is best when you have ordered processing with potential early termination."*

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### Classic Chain of Responsibility UML

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │creates and invokes
       ▼
┌──────────────────────┐
│   <<interface>>      │
│      Handler         │
│                      │
│  - next: Handler     │
│  + setNext(Handler)  │
│  + handle(Request)   │
└──────────▲───────────┘
           │
           │implements
           │
    ┌──────┴──────┬──────────────┬──────────────┐
    │             │              │              │
┌───┴────────┐ ┌──┴─────────┐ ┌──┴─────────┐ ┌──┴─────────┐
│ConcreteH1  │ │ConcreteH2  │ │ConcreteH3  │ │ConcreteH4  │
│            │ │            │ │            │ │            │
│+handle()   │ │+handle()   │ │+handle()   │ │+handle()   │
└────────────┘ └────────────┘ └────────────┘ └────────────┘

Request flows: H1 → H2 → H3 → H4 (or stops at any point)
```

### Sequence Diagram: Request Processing

```
Client      Handler1     Handler2     Handler3
  │            │            │            │
  │─handle(req)│            │            │
  │            │            │            │
  │            ├─canHandle? │            │
  │            │            │            │
  │            │ (no)       │            │
  │            │            │            │
  │            │─handle(req)│            │
  │            │            │            │
  │            │            ├─canHandle? │
  │            │            │            │
  │            │            │ (no)       │
  │            │            │            │
  │            │            │─handle(req)│
  │            │            │            │
  │            │            │            ├─canHandle?
  │            │            │            │
  │            │            │            │ (yes)
  │            │            │            │
  │            │            │            ├─doHandle()
  │            │            │            │
  │            │            │◀──response─┤
  │            │            │            │
  │            │◀──response─┤            │
  │            │            │            │
  │◀──response─┤            │            │
  │            │            │            │
```

### Spring Boot Handler Chain Implementation

```java
// ===== 1. Handler Interface =====
public interface RequestHandler {
    void setNext(RequestHandler next);
    Response handle(HttpRequest request);
}

// ===== 2. Abstract Base Handler =====
public abstract class AbstractRequestHandler implements RequestHandler {
    protected RequestHandler next;
    
    @Override
    public void setNext(RequestHandler next) {
        this.next = next;
    }
    
    @Override
    public Response handle(HttpRequest request) {
        if (canHandle(request)) {
            return doHandle(request);
        }
        
        if (next != null) {
            return next.handle(request);
        }
        
        return Response.notFound("No handler found");
    }
    
    protected abstract boolean canHandle(HttpRequest request);
    protected abstract Response doHandle(HttpRequest request);
}

// ===== 3. Concrete Handlers =====

@Component
@Order(1)
public class CorsHandler extends AbstractRequestHandler {
    
    @Override
    protected boolean canHandle(HttpRequest request) {
        return request.getHeader("Origin") != null;
    }
    
    @Override
    protected Response doHandle(HttpRequest request) {
        logger.info("Processing CORS for origin: {}", request.getHeader("Origin"));
        
        // Add CORS headers
        Response response = (next != null) 
            ? next.handle(request) 
            : Response.ok();
        
        response.setHeader("Access-Control-Allow-Origin", request.getHeader("Origin"));
        return response;
    }
}

@Component
@Order(2)
public class AuthenticationHandler extends AbstractRequestHandler {
    private final JwtService jwtService;
    
    @Override
    protected boolean canHandle(HttpRequest request) {
        return !request.getPath().startsWith("/public");
    }
    
    @Override
    protected Response doHandle(HttpRequest request) {
        String token = request.getHeader("Authorization");
        
        if (token == null) {
            return Response.unauthorized("Missing token");
        }
        
        try {
            Claims claims = jwtService.validate(token);
            request.setAttribute("user", claims.getSubject());
            
            return (next != null) ? next.handle(request) : Response.ok();
            
        } catch (JwtException e) {
            return Response.unauthorized("Invalid token");
        }
    }
}

@Component
@Order(3)
public class RateLimitHandler extends AbstractRequestHandler {
    private final RateLimiter rateLimiter;
    
    @Override
    protected boolean canHandle(HttpRequest request) {
        return true; // All requests
    }
    
    @Override
    protected Response doHandle(HttpRequest request) {
        String userId = (String) request.getAttribute("user");
        
        if (!rateLimiter.tryAcquire(userId)) {
            return Response.tooManyRequests("Rate limit exceeded");
        }
        
        return (next != null) ? next.handle(request) : Response.ok();
    }
}

@Component
@Order(4)
public class ValidationHandler extends AbstractRequestHandler {
    
    @Override
    protected boolean canHandle(HttpRequest request) {
        return List.of("POST", "PUT", "PATCH").contains(request.getMethod());
    }
    
    @Override
    protected Response doHandle(HttpRequest request) {
        List<String> errors = validateRequest(request);
        
        if (!errors.isEmpty()) {
            return Response.badRequest("Validation failed: " + String.join(", ", errors));
        }
        
        return (next != null) ? next.handle(request) : Response.ok();
    }
}

// ===== 4. Chain Builder =====
@Configuration
public class HandlerChainConfig {
    
    @Bean
    public RequestHandler handlerChain(List<RequestHandler> handlers) {
        // Sort by @Order annotation
        handlers.sort(Comparator.comparingInt(h -> 
            h.getClass().getAnnotation(Order.class).value()
        ));
        
        // Link chain
        for (int i = 0; i < handlers.size() - 1; i++) {
            handlers.get(i).setNext(handlers.get(i + 1));
        }
        
        return handlers.isEmpty() ? null : handlers.get(0);
    }
}

// ===== 5. Controller Integration =====
@RestController
public class ApiController {
    private final RequestHandler handlerChain;
    
    @RequestMapping("/**")
    public ResponseEntity<?> handleRequest(HttpServletRequest servletRequest) {
        // Convert to internal request
        HttpRequest request = HttpRequest.from(servletRequest);
        
        // Process through chain
        Response response = handlerChain.handle(request);
        
        return ResponseEntity
            .status(response.getStatus())
            .headers(response.getHeaders())
            .body(response.getBody());
    }
}
```

### Pipeline vs Stop-on-First Pattern

```java
// Pattern 1: Stop on First Handler (Classic Chain)
public Response handle(Request req) {
    if (canHandle(req)) {
        return doHandle(req); // STOP here
    }
    return next != null ? next.handle(req) : null;
}

/*
Flow: H1 (can't handle) → H2 (handles) → STOP
Result: Only H2 processes
*/

// Pattern 2: Pipeline (All Handlers Process)
public Response handle(Request req) {
    // Preprocess
    preProcess(req);
    
    // Continue chain
    Response response = next != null ? next.handle(req) : defaultResponse();
    
    // Postprocess
    postProcess(response);
    
    return response;
}

/*
Flow: H1 (preprocesses) → H2 (preprocesses) → H3 (processes) → H2 (postprocesses) → H1 (postprocesses)
Result: All handlers contribute
*/
```

### Async Handler Chain

```java
public class AsyncHandlerChain {
    private final List<AsyncHandler> handlers;
    private final ExecutorService executor;
    
    public CompletableFuture<Response> handleAsync(Request request) {
        CompletableFuture<Response> future = CompletableFuture.completedFuture(null);
        
        for (AsyncHandler handler : handlers) {
            future = future.thenComposeAsync(
                prevResponse -> handler.handleAsync(request),
                executor
            );
        }
        
        return future;
    }
}

// Usage
handlerChain.handleAsync(request)
    .thenAccept(response -> {
        logger.info("Request processed: {}", response.getStatus());
    })
    .exceptionally(ex -> {
        logger.error("Request failed", ex);
        return null;
    });
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why It Matters

**Business Impact:**
- **Flexibility**: Add/remove request processing steps without code changes
- **Security**: Layered security checks (auth, authz, validation)
- **Scalability**: Independent scaling of handler components
- **Compliance**: Centralized audit logging and request tracking
- **Cost Optimization**: Process only necessary handlers (short-circuit)

**User Experience:**
- **Fast Rejection**: Early failures (auth) don't waste processing time
- **Consistent Errors**: Standardized error responses across chain
- **Rate Protection**: Rate limiting prevents abuse
- **Security**: Multiple validation layers protect users

**Engineering Excellence:**
- **Loose Coupling**: Handlers don't know about each other
- **Single Responsibility**: Each handler does one thing
- **Testability**: Test handlers independently
- **Maintainability**: Add new handlers without modifying existing ones
- **Observability**: Instrument each handler separately

### How It Works (Simple but Precise)

1. **Client** sends request to first handler
2. **Handler** checks if it can process the request
3. **Process or Pass**: Handler either processes and stops, or passes to next
4. **Continue Chain**: Next handler repeats steps 2-3
5. **Terminate**: Chain stops when handler processes or end reached

**In Distributed Systems:**
1. **API Gateway** receives request
2. **Handler Services**: Auth service → Rate limit service → Business service
3. **Each Service**: Processes and forwards or rejects
4. **Response**: Flows back through chain (optional postprocessing)

### Key Trade-offs to Remember

✅ **Use Chain of Responsibility When:**
- Multiple objects might handle a request
- Handler isn't known until runtime
- Want to decouple sender from receivers
- Building middleware/filter pipeline
- Need ordered processing with potential early termination

❌ **Avoid Chain of Responsibility When:**
- Only one handler ever processes
- Handler selection is complex (use Strategy + Factory)
- All handlers must execute (use Observer/Pipeline)
- Performance critical (use direct dispatch)
- Need handler responses aggregated (use Composite)

### Production Checklist

Before shipping chain pattern to production:

- [ ] **Handler timeout** protection
- [ ] **Error isolation**: One handler failure doesn't break chain
- [ ] **Circuit breakers** for external handler calls
- [ ] **Metrics per handler**: latency, success rate, throughput
- [ ] **Async handlers** for non-blocking execution
- [ ] **Parallel execution** for independent handlers
- [ ] **Short-circuit** on early failures (auth, validation)
- [ ] **Handler caching** for expensive operations (auth token validation)
- [ ] **Dynamic chain** reconfiguration support
- [ ] **Graceful degradation**: Essential-only chain under load
- [ ] **Audit logging** for compliance
- [ ] **Load shedding** at chain entry

### Interview Red Flags to Avoid

🚫 "Chain of Responsibility is just a linked list of if-else statements"
✅ "Chain of Responsibility decouples request sender from receivers, allowing dynamic handler chains and ordered processing"

🚫 "All requests must go through all handlers"
✅ "Chain can stop at any handler that fully processes the request, or pass through all handlers in pipeline mode"

🚫 "Chain of Responsibility is the same as Decorator"
✅ "Chain stops when a handler processes the request; Decorator always processes through all layers"

🚫 "Long chains always cause performance problems"
✅ "Optimize with parallel execution, caching, short-circuiting, and async processing"

### Final Interview Sound Bite

*"Chain of Responsibility is fundamental to building middleware pipelines and request processing systems. I've used it extensively in API gateways where requests flow through authentication, rate limiting, validation, and business logic handlers.*

*The pattern excels at decoupling—each handler is independent and can be added, removed, or reordered without affecting others. This is critical for microservices where each handler might be a separate service.*

*For performance, I optimize by running independent handlers in parallel (auth and rate limiting can run concurrently), caching expensive operations (JWT validation), and short-circuiting on failures to avoid unnecessary processing.*

*At scale, I instrument each handler with metrics to identify bottlenecks, use circuit breakers for resilience, and implement graceful degradation where non-essential handlers are skipped under load. The key is treating the chain as a flexible pipeline rather than a rigid sequence."*

---

## 📚 Additional Resources

**Books:**
- "Design Patterns" by Gang of Four
- "Head First Design Patterns"
- "Patterns of Enterprise Application Architecture" by Martin Fowler

**Frameworks Using Chain of Responsibility:**
- **Express.js**: Middleware chain
- **Spring Security**: Filter chain
- **Servlet API**: Filter chain
- **Apache Commons Chain**: Request processing
- **Netty**: Channel pipeline

**Real-World Examples:**
- Express.js middleware
- Spring Security `FilterChain`
- Log4j logger hierarchy
- Java Servlet Filters
- ASP.NET Core middleware pipeline

**Engineering Blogs:**
- Netflix: API Gateway Request Processing
- Uber: Request Validation Pipeline
- LinkedIn: Authentication Chain
- Amazon API Gateway: Authorization

---

**Last Updated**: January 2026
**Target Audience**: Senior Backend Engineers (7+ YOE)
**Interview Level**: FAANG L5/L6 (Senior/Staff)
