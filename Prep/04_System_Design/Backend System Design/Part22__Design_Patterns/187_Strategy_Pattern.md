# 187. Strategy Pattern

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

The **Strategy Pattern** is a behavioral design pattern that defines a family of algorithms, encapsulates each one in a separate class, and makes them interchangeable. The strategy pattern lets the algorithm vary independently from the clients that use it.

**What it is:**
- A design pattern that enables selecting an algorithm at runtime
- Defines a family of behaviors and makes them interchangeable
- Encapsulates algorithmic logic in separate strategy classes

**Why it exists:**
- Eliminates complex conditional logic (if-else chains, switch statements)
- Promotes Open-Closed Principle (open for extension, closed for modification)
- Increases code maintainability and testability
- Enables runtime algorithm selection based on business needs

**The problem it solves:**
- Avoids bloated classes with multiple conditional branches
- Removes tight coupling between context and algorithm implementation
- Makes it easy to add new algorithms without modifying existing code
- Simplifies unit testing by isolating algorithmic logic

**Where and when it is used:**
- Payment processing systems (credit card, PayPal, crypto)
- Pricing engines (discount strategies, surge pricing)
- Notification systems (email, SMS, push, in-app)
- Compression algorithms (ZIP, RAR, GZIP)
- Sorting algorithms (quick sort, merge sort, bubble sort)
- Authentication mechanisms (OAuth, JWT, API Key)

**Role in large-scale distributed systems:**
- Enables dynamic behavior changes without redeployment
- Supports A/B testing and feature flags
- Facilitates plugin architectures
- Allows configuration-driven algorithm selection
- Simplifies microservice communication patterns

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Core Components

1. **Strategy Interface**: Defines the contract for all concrete strategies
2. **Concrete Strategies**: Implement different variations of the algorithm
3. **Context**: Maintains a reference to a Strategy and delegates algorithm execution
4. **Client**: Configures the Context with the appropriate Strategy

### System Architecture & Component Boundaries

```
Client
  |
  v
Context (maintains strategy reference)
  |
  v
Strategy Interface
  |
  +-- ConcreteStrategyA
  +-- ConcreteStrategyB
  +-- ConcreteStrategyC
```

### Data Flow & Request Lifecycle

1. **Initialization Phase**:
   - Client creates Context
   - Client selects and injects appropriate Strategy
   - Context holds reference to Strategy interface

2. **Execution Phase**:
   - Client calls Context's method
   - Context delegates to Strategy's algorithm
   - Strategy executes its specific implementation
   - Result flows back through Context to Client

3. **Runtime Strategy Switching**:
   - Context can change Strategy dynamically
   - No need to modify Context or Client code
   - New strategies can be added without touching existing code

### Control Plane vs Data Plane

**Control Plane** (Configuration):
- Strategy selection logic
- Factory or Registry for strategy creation
- Configuration management (feature flags, A/B tests)
- Strategy lifecycle management

**Data Plane** (Execution):
- Actual algorithm execution
- Business logic processing
- Performance-critical operations
- Stateless strategy implementations (preferred)

### Scalability Strategies

**Horizontal Scaling:**
- Stateless strategies scale linearly
- Each service instance can execute strategies independently
- Strategy selection can be load-balanced

**Vertical Scaling:**
- Complex strategies may require more CPU/memory
- Resource allocation per strategy type
- Thread pool sizing for compute-intensive strategies

### Performance Bottlenecks

1. **Strategy Instantiation Overhead**:
   - Solution: Use singleton strategies or object pooling
   - Pre-initialize strategies at startup

2. **Dynamic Strategy Selection**:
   - Solution: Cache strategy lookups
   - Use efficient registry/factory patterns

3. **Polymorphic Call Overhead**:
   - Solution: JIT optimization handles this well
   - Profile hotspots if critical

### Consistency Models

- Strategies themselves are typically **stateless**
- If state is needed, consider **Strategy + State pattern hybrid**
- For distributed systems, strategy selection may use **eventual consistency**

### Failure Modes & Recovery Paths

1. **Missing Strategy**:
   - Fallback to default strategy
   - Throw meaningful exception
   - Circuit breaker pattern for external strategy sources

2. **Strategy Execution Failure**:
   - Retry with exponential backoff
   - Fallback to alternative strategy
   - Dead letter queue for failed operations

3. **Strategy Configuration Errors**:
   - Validation at startup
   - Health checks for strategy availability
   - Graceful degradation

### Trade-offs

| Aspect | Benefit | Cost |
|--------|---------|------|
| **Flexibility** | Easy to add new strategies | More classes to maintain |
| **Testability** | Isolated unit testing | Need to test all combinations |
| **Runtime Selection** | Dynamic behavior changes | Increased complexity |
| **Code Clarity** | Eliminates conditionals | Indirection adds cognitive load |
| **Open-Closed** | No modification to existing code | More upfront design effort |

### Design Decisions at FAANG-Scale

1. **Strategy Registration**:
   - Use Spring's `@Component` with qualifier annotations
   - Registry pattern with `Map<String, Strategy>`
   - Service locator for cross-service strategies

2. **Configuration-Driven Selection**:
   - Feature flags (LaunchDarkly, Split.io)
   - Database-driven configuration
   - Environment-specific strategies

3. **Performance Optimization**:
   - Lazy loading for expensive strategies
   - Caching of strategy results
   - Async strategy execution for non-blocking operations

4. **Observability**:
   - Log which strategy is selected
   - Metrics per strategy type
   - Distributed tracing across strategy boundaries

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation (When Applicable)
## ────────────────────────────────────

### Example: Payment Processing System

**Assumptions:**
- 1M transactions/day
- Peak traffic: 5x average = ~60 TPS
- Payment strategies: Credit Card, PayPal, Crypto, Buy Now Pay Later
- Average strategy execution: 100ms
- Read:Write ratio: 1:1 (validation + execution)

**QPS Estimation:**
```
Average TPS: 1M / (24 * 3600) ≈ 12 TPS
Peak TPS: 12 * 5 = 60 TPS

Per Strategy:
- Credit Card: 60% = 36 TPS
- PayPal: 25% = 15 TPS
- Crypto: 10% = 6 TPS
- BNPL: 5% = 3 TPS
```

**Latency Budget:**
```
Total transaction latency target: 500ms
- Strategy selection: 1ms (in-memory lookup)
- Strategy execution: 100ms (payment gateway call)
- Validation: 50ms
- Logging/metrics: 10ms
- Buffer: 339ms for network/queue time
```

**Storage:**
```
Strategy configuration: ~10KB per strategy = 40KB
Strategy execution logs: 1KB per transaction
Daily logs: 1M * 1KB = 1GB/day = 365GB/year
```

**Why These Numbers Matter:**
- Strategy selection must be < 1ms (in-memory)
- Heavy strategies need caching or async processing
- Monitoring per-strategy latency reveals bottlenecks
- Strategy distribution influences resource allocation

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

### Strategy Configuration Storage

**Option 1: In-Memory (Code-Based)**
```java
// Compile-time strategy registration
@Configuration
public class StrategyConfig {
    @Bean
    public Map<String, PaymentStrategy> strategies(
        CreditCardStrategy cc,
        PayPalStrategy pp,
        CryptoStrategy crypto
    ) {
        return Map.of(
            "CREDIT_CARD", cc,
            "PAYPAL", pp,
            "CRYPTO", crypto
        );
    }
}
```

**Pros:** Fast, type-safe, no database dependency
**Cons:** Requires redeployment for new strategies

**Option 2: Database-Driven Configuration**

**Schema:**
```sql
CREATE TABLE strategy_config (
    id BIGINT PRIMARY KEY,
    strategy_type VARCHAR(50) UNIQUE NOT NULL,
    strategy_class VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    config_json JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_strategy_enabled ON strategy_config(enabled, priority);
```

**Pros:** Dynamic configuration, no redeployment
**Cons:** Database dependency, caching complexity

**Option 3: Hybrid Approach (Recommended for Production)**
- Core strategies: code-based (fast, reliable)
- Business rules: database-driven (flexible)
- Cache strategy configurations in Redis
- TTL-based cache invalidation

### Strategy Execution Audit Log

```sql
CREATE TABLE strategy_execution_log (
    id BIGINT PRIMARY KEY,
    request_id VARCHAR(100),
    strategy_type VARCHAR(50),
    execution_time_ms INT,
    success BOOLEAN,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_strategy_type_time ON strategy_execution_log(strategy_type, created_at);
```

**Why:**
- Debugging strategy behavior
- Performance monitoring per strategy
- Compliance and audit requirements
- A/B testing analysis

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

### Horizontal Scaling

**Stateless Strategies** (Recommended):
```java
@Component
public class CreditCardPaymentStrategy implements PaymentStrategy {
    private final PaymentGatewayClient client; // stateless client
    
    @Override
    public PaymentResult execute(PaymentRequest request) {
        // No instance state, fully scalable
        return client.processPayment(request);
    }
}
```

**Scaling Characteristics:**
- Each service instance can handle any strategy
- Load balancer distributes traffic evenly
- No sticky sessions required
- Linear scalability

### Caching Layer

**Strategy Selection Cache:**
```java
@Service
public class CachedStrategySelector {
    private final LoadingCache<String, PaymentStrategy> strategyCache;
    
    public CachedStrategySelector(Map<String, PaymentStrategy> strategies) {
        this.strategyCache = CacheBuilder.newBuilder()
            .maximumSize(100)
            .expireAfterWrite(10, TimeUnit.MINUTES)
            .build(new CacheLoader<>() {
                public PaymentStrategy load(String type) {
                    return strategies.get(type);
                }
            });
    }
}
```

**Strategy Result Cache:**
```java
// For expensive, idempotent operations
@Cacheable(value = "pricing-strategy", key = "#request.productId")
public PricingResult calculatePrice(PricingRequest request) {
    return pricingStrategy.calculate(request);
}
```

### Asynchronous Processing

**Non-Blocking Strategy Execution:**
```java
@Service
public class AsyncStrategyExecutor {
    private final ExecutorService executorService;
    
    public CompletableFuture<Result> executeAsync(Strategy strategy, Request req) {
        return CompletableFuture.supplyAsync(
            () -> strategy.execute(req),
            executorService
        );
    }
}
```

**Use Cases:**
- Non-critical strategies (analytics, logging)
- Background processing
- Fan-out to multiple strategies

### Failover & Redundancy

**Fallback Strategy Pattern:**
```java
@Service
public class ResilientPaymentProcessor {
    private final List<PaymentStrategy> strategies; // ordered by priority
    
    public PaymentResult processWithFallback(PaymentRequest request) {
        for (PaymentStrategy strategy : strategies) {
            try {
                return strategy.execute(request);
            } catch (Exception e) {
                logger.warn("Strategy {} failed, trying next", strategy.getClass());
            }
        }
        throw new AllStrategiesFailedException();
    }
}
```

**Chain of Responsibility + Strategy Hybrid:**
```java
@Service
public class PaymentStrategyChain {
    public PaymentResult process(PaymentRequest request) {
        return primaryStrategy.execute(request)
            .recover(e -> secondaryStrategy.execute(request))
            .recover(e -> tertiaryStrategy.execute(request))
            .orElseThrow(() -> new PaymentFailedException());
    }
}
```

### Circuit Breaker

```java
@Service
public class CircuitBreakerStrategy implements PaymentStrategy {
    private final CircuitBreaker circuitBreaker;
    private final PaymentStrategy delegate;
    
    @Override
    public PaymentResult execute(PaymentRequest request) {
        return circuitBreaker.executeSupplier(
            () -> delegate.execute(request)
        );
    }
}
```

**Configuration:**
- Failure threshold: 50% over 10 requests
- Open state duration: 30 seconds
- Half-open state: test with 1 request

### Retry Strategies

```java
@Service
public class RetryableStrategy implements PaymentStrategy {
    @Retryable(
        value = {TransientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2)
    )
    public PaymentResult execute(PaymentRequest request) {
        return delegate.execute(request);
    }
}
```

**Exponential Backoff:**
- Attempt 1: immediate
- Attempt 2: 1s delay
- Attempt 3: 2s delay
- Attempt 4: 4s delay

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance (When Relevant)
## ────────────────────────────────────

### API Design with Strategy Pattern

**RESTful Endpoint:**
```java
@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {
    private final PaymentStrategyFactory strategyFactory;
    
    @PostMapping("/process")
    public ResponseEntity<PaymentResponse> processPayment(
        @RequestBody PaymentRequest request,
        @RequestHeader("X-Payment-Method") String method
    ) {
        PaymentStrategy strategy = strategyFactory.getStrategy(method);
        PaymentResult result = strategy.execute(request);
        return ResponseEntity.ok(result);
    }
}
```

**Strategy Selection via Header:**
- `X-Payment-Method: CREDIT_CARD`
- `X-Payment-Method: PAYPAL`
- `X-Payment-Method: CRYPTO`

### Authentication per Strategy

```java
public interface SecurePaymentStrategy extends PaymentStrategy {
    boolean validateCredentials(Credentials credentials);
    
    default PaymentResult secureExecute(PaymentRequest request) {
        if (!validateCredentials(request.getCredentials())) {
            throw new UnauthorizedException();
        }
        return execute(request);
    }
}
```

### Rate Limiting per Strategy

```java
@Service
public class RateLimitedStrategyDecorator implements PaymentStrategy {
    private final RateLimiter rateLimiter;
    private final PaymentStrategy delegate;
    
    @Override
    public PaymentResult execute(PaymentRequest request) {
        if (!rateLimiter.tryAcquire()) {
            throw new RateLimitExceededException();
        }
        return delegate.execute(request);
    }
}
```

**Configuration:**
```yaml
rate-limits:
  credit-card: 100/minute
  paypal: 50/minute
  crypto: 10/minute  # more expensive
```

### Encryption & Data Masking

```java
public abstract class SecurePaymentStrategy implements PaymentStrategy {
    @Override
    public PaymentResult execute(PaymentRequest request) {
        // Mask sensitive data in logs
        logger.info("Processing payment for card ending in {}", 
            maskCardNumber(request.getCardNumber()));
        
        // Encrypt before external call
        EncryptedRequest encrypted = encrypt(request);
        return processEncrypted(encrypted);
    }
    
    protected abstract PaymentResult processEncrypted(EncryptedRequest request);
}
```

### Governance & Compliance

**Strategy Audit Decorator:**
```java
@Component
public class AuditableStrategyDecorator implements PaymentStrategy {
    private final AuditLogger auditLogger;
    private final PaymentStrategy delegate;
    
    @Override
    public PaymentResult execute(PaymentRequest request) {
        AuditEntry entry = AuditEntry.start(request);
        try {
            PaymentResult result = delegate.execute(request);
            entry.success(result);
            return result;
        } catch (Exception e) {
            entry.failure(e);
            throw e;
        } finally {
            auditLogger.log(entry);
        }
    }
}
```

**Compliance Requirements:**
- PCI-DSS for payment strategies
- GDPR for data handling strategies
- SOX for financial calculation strategies
- Audit trail for all strategy executions

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Example 1: Payment Processing at Scale (Stripe-like)

**Problem:**
- Support multiple payment methods (card, bank, wallet, crypto)
- Each payment method has different validation, processing, fee structure
- Need to add new payment methods without modifying core code

**Strategy Implementation:**

```java
// Strategy Interface
public interface PaymentStrategy {
    PaymentResult process(PaymentRequest request);
    boolean supports(PaymentMethod method);
    BigDecimal calculateFee(BigDecimal amount);
}

// Concrete Strategy
@Component
public class CreditCardStrategy implements PaymentStrategy {
    @Override
    public PaymentResult process(PaymentRequest request) {
        // Validate card
        validateCard(request.getCard());
        // Process with payment gateway
        return paymentGateway.charge(request);
    }
    
    @Override
    public BigDecimal calculateFee(BigDecimal amount) {
        return amount.multiply(new BigDecimal("0.029")).add(new BigDecimal("0.30"));
    }
}

// Context
@Service
public class PaymentProcessor {
    private final List<PaymentStrategy> strategies;
    
    public PaymentResult processPayment(PaymentRequest request) {
        PaymentStrategy strategy = strategies.stream()
            .filter(s -> s.supports(request.getMethod()))
            .findFirst()
            .orElseThrow(() -> new UnsupportedPaymentMethodException());
        
        return strategy.process(request);
    }
}
```

**Evolution at Scale:**
1. **Phase 1**: 3 strategies (card, bank, PayPal) → handles 10K TPS
2. **Phase 2**: Add crypto strategy → no changes to existing code
3. **Phase 3**: Add buy-now-pay-later → register new strategy
4. **Phase 4**: Implement strategy-specific circuit breakers
5. **Phase 5**: A/B test new fraud detection per strategy

**What Breaks First:**
- Strategy factory lookup becomes bottleneck → cache strategy instances
- External payment gateway latency → implement async processing
- Hot partition on strategy config table → cache in Redis

### Example 2: Dynamic Pricing Engine (Uber/Airbnb)

**Problem:**
- Price calculation varies by time, demand, location, user segment
- Promotional pricing strategies
- Surge pricing during peak hours

**Implementation:**

```java
public interface PricingStrategy {
    BigDecimal calculatePrice(PricingContext context);
}

@Component
public class SurgePricingStrategy implements PricingStrategy {
    @Override
    public BigDecimal calculatePrice(PricingContext context) {
        BigDecimal basePrice = context.getBasePrice();
        double surgeMultiplier = calculateSurgeMultiplier(context);
        return basePrice.multiply(BigDecimal.valueOf(surgeMultiplier));
    }
    
    private double calculateSurgeMultiplier(PricingContext context) {
        int demand = context.getDemand();
        int supply = context.getSupply();
        return Math.min(3.0, 1.0 + (demand - supply) / (double) supply);
    }
}

@Service
public class DynamicPricingEngine {
    private final Map<String, PricingStrategy> strategies;
    
    public PriceQuote getQuote(PricingRequest request) {
        // Select strategy based on time, location, demand
        String strategyType = selectStrategy(request);
        PricingStrategy strategy = strategies.get(strategyType);
        
        PricingContext context = buildContext(request);
        BigDecimal price = strategy.calculatePrice(context);
        
        return new PriceQuote(price, strategyType);
    }
}
```

**Production Characteristics:**
- 100K pricing requests/second during peak
- Strategy selection: < 1ms (in-memory map)
- 15 different pricing strategies (base, surge, promo, loyalty, etc.)
- A/B test new strategies on 1% traffic
- Feature flags control strategy enablement

### Example 3: Notification Delivery System (Facebook/LinkedIn)

**Problem:**
- Send notifications via email, SMS, push, in-app
- User preferences dictate delivery method
- Fallback if primary method fails

**Implementation:**

```java
public interface NotificationStrategy {
    void send(Notification notification, User user);
    boolean isAvailable();
    int getPriority();
}

@Service
public class NotificationDispatcher {
    private final List<NotificationStrategy> strategies;
    
    public void sendNotification(Notification notification, User user) {
        List<NotificationStrategy> userStrategies = 
            getUserPreferredStrategies(user);
        
        for (NotificationStrategy strategy : userStrategies) {
            try {
                if (strategy.isAvailable()) {
                    strategy.send(notification, user);
                    return;
                }
            } catch (Exception e) {
                logger.error("Strategy {} failed", strategy, e);
            }
        }
        
        // All strategies failed - use fallback
        fallbackStrategy.send(notification, user);
    }
}
```

**Scale:**
- 1B notifications/day
- 4 delivery strategies (push, email, SMS, in-app)
- 99.99% delivery rate with fallback strategies
- Strategy selection based on user preferences + availability

### Example 4: Compression Strategy (Netflix/YouTube)

**Problem:**
- Different video quality levels require different compression
- Bandwidth optimization for mobile vs desktop
- Storage optimization for archive

**Implementation:**

```java
public interface CompressionStrategy {
    byte[] compress(byte[] data);
    String getFormat();
    int getCompressionRatio();
}

@Service
public class VideoEncoder {
    private final Map<VideoQuality, CompressionStrategy> strategies;
    
    public EncodedVideo encode(RawVideo video, VideoQuality quality) {
        CompressionStrategy strategy = strategies.get(quality);
        
        byte[] compressed = strategy.compress(video.getData());
        
        return EncodedVideo.builder()
            .data(compressed)
            .format(strategy.getFormat())
            .quality(quality)
            .compressionRatio(strategy.getCompressionRatio())
            .build();
    }
}
```

**Strategies:**
- 4K: H.265/HEVC, 10:1 compression
- 1080p: H.264, 20:1 compression
- 720p: H.264, 30:1 compression
- Mobile: VP9, 40:1 compression

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Crisp Interview Answer

**"Explain the Strategy Pattern":**

*"The Strategy Pattern is a behavioral design pattern that allows us to define a family of algorithms, encapsulate each one in a separate class, and make them interchangeable at runtime.*

*I use it extensively in backend systems to eliminate complex conditional logic. For example, in a payment processing system, instead of having a massive if-else chain for credit card, PayPal, and crypto payments, I define a PaymentStrategy interface and implement each payment method as a concrete strategy.*

*The key benefit is the Open-Closed Principle—I can add new payment methods without modifying existing code. It also makes testing easier since I can test each strategy in isolation.*

*In production, I typically use Spring's dependency injection to register strategies and use a factory or registry pattern for runtime selection. I've also combined it with circuit breakers and fallback strategies for resilience.*

*At scale, the main considerations are strategy selection performance—which I solve with caching—and observability, ensuring we log which strategy was used for debugging and metrics."*

### Common Follow-Up Questions

**Q1: "How would you refactor this if-else chain using Strategy?"**

```java
// BEFORE (Code Smell)
public PaymentResult processPayment(PaymentRequest req) {
    if (req.getMethod().equals("CREDIT_CARD")) {
        // 50 lines of credit card logic
    } else if (req.getMethod().equals("PAYPAL")) {
        // 50 lines of PayPal logic
    } else if (req.getMethod().equals("CRYPTO")) {
        // 50 lines of crypto logic
    }
    // ... more else-if chains
}

// AFTER (Strategy Pattern)
@Service
public class PaymentProcessor {
    private final Map<String, PaymentStrategy> strategies;
    
    public PaymentResult processPayment(PaymentRequest req) {
        PaymentStrategy strategy = strategies.get(req.getMethod());
        if (strategy == null) {
            throw new UnsupportedPaymentMethodException();
        }
        return strategy.execute(req);
    }
}
```

**Answer:**
- Extract each conditional branch into a separate strategy class
- Define a common interface for all strategies
- Use a map or factory for strategy lookup
- Context delegates to the selected strategy

**Q2: "What's the difference between Strategy and State pattern?"**

| Aspect | Strategy | State |
|--------|----------|-------|
| **Purpose** | Select algorithm/behavior | Manage object state transitions |
| **Who decides** | Client selects strategy | Object changes its own state |
| **Relationship** | Strategies are independent | States know about each other |
| **Mutability** | Strategy can change anytime | State changes based on actions |
| **Example** | Payment methods | Order workflow (pending → confirmed → shipped) |

**Q3: "How do you handle strategy selection at runtime in a distributed system?"**

**Answer:**
```java
@Service
public class DistributedStrategySelector {
    private final RedisTemplate<String, String> redis;
    private final Map<String, PaymentStrategy> strategies;
    
    public PaymentStrategy selectStrategy(String userId) {
        // Check feature flag or A/B test configuration
        String strategyType = redis.opsForValue()
            .get("user:strategy:" + userId);
        
        if (strategyType == null) {
            // Fallback to default strategy
            strategyType = getDefaultStrategy(userId);
        }
        
        return strategies.get(strategyType);
    }
}
```

**Key points:**
- Use distributed cache (Redis) for strategy configuration
- Feature flags control strategy enablement
- A/B testing framework determines strategy per user
- Always have a fallback/default strategy

**Q4: "How do you test systems using Strategy pattern?"**

**Answer:**
```java
@Test
public void testPaymentProcessorWithMockStrategy() {
    // Arrange
    PaymentStrategy mockStrategy = mock(PaymentStrategy.class);
    when(mockStrategy.execute(any())).thenReturn(successResult());
    
    Map<String, PaymentStrategy> strategies = Map.of("TEST", mockStrategy);
    PaymentProcessor processor = new PaymentProcessor(strategies);
    
    // Act
    PaymentResult result = processor.processPayment(
        new PaymentRequest("TEST", amount)
    );
    
    // Assert
    verify(mockStrategy).execute(any());
    assertEquals(SUCCESS, result.getStatus());
}

@Test
public void testCreditCardStrategyInIsolation() {
    // Test each strategy independently
    CreditCardStrategy strategy = new CreditCardStrategy(gateway);
    PaymentResult result = strategy.execute(validRequest());
    assertTrue(result.isSuccessful());
}
```

**Benefits:**
- Mock strategies for integration tests
- Unit test each strategy in isolation
- Test strategy selection logic separately
- Easy to test edge cases per strategy

**Q5: "What are the performance implications?"**

**Answer:**
- **Strategy Lookup**: O(1) with HashMap, typically < 1ms
- **Polymorphic Dispatch**: Negligible overhead, JIT optimizes
- **Strategy Instantiation**: Use singleton strategies, not per-request
- **Memory**: Minimal—one instance per strategy type

**Optimization techniques:**
```java
// Cache strategy instances (singleton)
@Configuration
public class StrategyConfig {
    @Bean
    @Scope("singleton")  // Default, but explicit
    public CreditCardStrategy creditCardStrategy() {
        return new CreditCardStrategy();
    }
}

// Lazy initialization for expensive strategies
@Component
public class LazyStrategyFactory {
    private final Supplier<ExpensiveStrategy> lazyStrategy = 
        Suppliers.memoize(ExpensiveStrategy::new);
    
    public ExpensiveStrategy getStrategy() {
        return lazyStrategy.get();
    }
}
```

### Talking Points for Interviews

1. **Start with the problem**: "In a payment system with 10 payment methods..."
2. **Show evolution**: "Started with if-else, refactored to Strategy"
3. **Mention trade-offs**: "More classes, but easier to maintain"
4. **Production concerns**: "Added circuit breakers, caching, observability"
5. **Real numbers**: "Reduced payment processing logic from 500 LOC to 5 strategy classes of 100 LOC each"

### Comparison with Alternative Approaches

| Approach | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **If-Else Chain** | Simple, no abstraction | Hard to maintain, violates OCP | < 3 branches, simple logic |
| **Switch Statement** | Readable | Still rigid, hard to extend | Enum-based, < 5 cases |
| **Strategy Pattern** | Extensible, testable | More classes | > 3 algorithms, frequent changes |
| **Command Pattern** | Undo/redo support | Overkill for simple selection | Need history, undo |
| **Dependency Injection** | Framework-managed | Tight coupling to framework | Spring-based apps |

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams (When Applicable)
## ────────────────────────────────────

### UML Class Diagram

```
┌─────────────────┐
│     Client      │
└────────┬────────┘
         │
         │ uses
         ▼
┌─────────────────┐           ┌──────────────────────┐
│    Context      │◆─────────▶│  <<interface>>       │
│                 │           │  Strategy            │
│ +setStrategy()  │           │                      │
│ +executeAction()│           │ +execute()           │
└─────────────────┘           └──────────┬───────────┘
                                         │
                      ┌──────────────────┼──────────────────┐
                      │                  │                  │
              ┌───────▼────────┐ ┌──────▼───────┐ ┌───────▼────────┐
              │ ConcreteStrategyA│ │ConcreteStrategyB│ │ConcreteStrategyC│
              │                 │ │              │ │                │
              │ +execute()      │ │ +execute()   │ │ +execute()     │
              └─────────────────┘ └──────────────┘ └────────────────┘
```

### Sequence Diagram

```
Client          Context         Strategy
  │               │                │
  │─create────────▶               │
  │               │                │
  │─setStrategy(A)┼───────────────▶
  │               │◀────────────────
  │               │                │
  │─execute()─────▶               │
  │               │─execute()─────▶
  │               │                │ (StrategyA logic)
  │               │◀────result─────
  │◀──result──────│                │
  │               │                │
  │─setStrategy(B)┼───────────────────────────┐
  │               │◀──────────────────────────┘
  │               │                            │
  │─execute()─────▶                           │
  │               │─execute()──────────────────▶
  │               │                            │ (StrategyB logic)
  │               │◀────result─────────────────
  │◀──result──────│                            │
```

### Code Flow Diagram

```
Request arrives
    │
    ▼
┌──────────────────────────┐
│  Strategy Selector       │
│  - Check feature flags   │
│  - A/B test segment      │
│  - User preferences      │
└──────────┬───────────────┘
           │
           │ Selected: "CREDIT_CARD"
           ▼
┌──────────────────────────┐
│  Strategy Factory/       │
│  Registry Lookup         │
│  strategies.get(type)    │
└──────────┬───────────────┘
           │
           │ Returns: CreditCardStrategy instance
           ▼
┌──────────────────────────┐
│  Strategy Execution      │
│  strategy.execute(req)   │
│                          │
│  - Validate input        │
│  - Call external API     │
│  - Transform result      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  Post-Processing         │
│  - Log execution         │
│  - Emit metrics          │
│  - Update audit trail    │
└──────────┬───────────────┘
           │
           ▼
      Return result
```

### Strategy Pattern with Spring Boot

```java
// 1. Define Strategy Interface
public interface PaymentStrategy {
    PaymentResult execute(PaymentRequest request);
    String getStrategyName();
}

// 2. Implement Concrete Strategies
@Component("creditCard")
public class CreditCardStrategy implements PaymentStrategy {
    @Override
    public PaymentResult execute(PaymentRequest request) {
        // Implementation
        return result;
    }
    
    @Override
    public String getStrategyName() {
        return "CREDIT_CARD";
    }
}

@Component("paypal")
public class PayPalStrategy implements PaymentStrategy {
    // Similar implementation
}

// 3. Strategy Factory/Registry
@Service
public class PaymentStrategyFactory {
    private final Map<String, PaymentStrategy> strategies;
    
    @Autowired
    public PaymentStrategyFactory(List<PaymentStrategy> strategyList) {
        this.strategies = strategyList.stream()
            .collect(Collectors.toMap(
                PaymentStrategy::getStrategyName,
                Function.identity()
            ));
    }
    
    public PaymentStrategy getStrategy(String type) {
        PaymentStrategy strategy = strategies.get(type);
        if (strategy == null) {
            throw new IllegalArgumentException("Unknown strategy: " + type);
        }
        return strategy;
    }
}

// 4. Context (Service Layer)
@Service
public class PaymentProcessor {
    private final PaymentStrategyFactory factory;
    
    public PaymentResult processPayment(PaymentRequest request) {
        // Select strategy
        PaymentStrategy strategy = factory.getStrategy(request.getMethod());
        
        // Execute strategy
        return strategy.execute(request);
    }
}

// 5. Controller (API Layer)
@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentProcessor processor;
    
    @PostMapping
    public ResponseEntity<PaymentResult> pay(@RequestBody PaymentRequest req) {
        PaymentResult result = processor.processPayment(req);
        return ResponseEntity.ok(result);
    }
}
```

### Advanced Pattern: Strategy + Template Method

```java
// Abstract strategy with common template
public abstract class AbstractPaymentStrategy implements PaymentStrategy {
    
    @Override
    public final PaymentResult execute(PaymentRequest request) {
        // Template method defines the algorithm structure
        validate(request);
        
        PaymentResult result = doExecute(request);
        
        postProcess(result);
        
        return result;
    }
    
    // Common validation
    protected void validate(PaymentRequest request) {
        if (request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new InvalidAmountException();
        }
    }
    
    // Strategy-specific implementation
    protected abstract PaymentResult doExecute(PaymentRequest request);
    
    // Common post-processing
    protected void postProcess(PaymentResult result) {
        auditLog(result);
        emitMetrics(result);
    }
}

// Concrete implementation only overrides strategy-specific part
@Component
public class CreditCardStrategy extends AbstractPaymentStrategy {
    @Override
    protected PaymentResult doExecute(PaymentRequest request) {
        // Only credit-card-specific logic here
        return gateway.charge(request);
    }
}
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary (Executive-Level Wrap-Up)
## ────────────────────────────────────

### Why It Matters

**Business Impact:**
- **Faster Time-to-Market**: New payment methods, pricing strategies, notification channels without code surgery
- **Reduced Bugs**: Isolated changes don't ripple through codebase
- **A/B Testing**: Easy to test alternative algorithms in production
- **Cost Optimization**: Switch strategies based on cost/performance (e.g., cheaper payment gateway during low-priority times)

**User Experience:**
- **Personalization**: Different users get different strategies (premium vs free)
- **Reliability**: Fallback strategies ensure service continuity
- **Performance**: Select fast strategies for latency-sensitive paths

**Engineering Excellence:**
- **Maintainability**: 5 files of 100 lines each > 1 file of 500 lines
- **Testability**: Mock strategies for fast tests
- **Scalability**: Stateless strategies scale horizontally
- **Observability**: Per-strategy metrics reveal bottlenecks

### How It Works (Simple but Precise)

1. **Define**: Create a common interface for all algorithms
2. **Implement**: Each algorithm in its own class
3. **Select**: Factory/Registry chooses strategy at runtime
4. **Execute**: Context delegates to strategy
5. **Observe**: Log, monitor, measure per strategy

### Key Trade-offs to Remember

✅ **Use Strategy Pattern When:**
- You have 3+ related algorithms
- Conditional logic is growing complex
- New algorithms are added frequently
- Behavior needs to change at runtime
- Testing each algorithm independently is important

❌ **Avoid Strategy Pattern When:**
- Only 1-2 simple variations exist
- Algorithms never change
- Performance is ultra-critical (polymorphism overhead matters)
- Team is unfamiliar with design patterns

### Production Checklist

Before shipping strategy pattern to production:

- [ ] All strategies are **stateless** (or state is thread-safe)
- [ ] **Default/fallback strategy** exists
- [ ] Strategy selection is **cached** (if expensive)
- [ ] **Circuit breakers** protect external calls
- [ ] **Metrics** emit per-strategy performance
- [ ] **Logs** include which strategy executed
- [ ] **Tests** cover all strategies + selection logic
- [ ] **Documentation** explains when to use each strategy
- [ ] **Feature flags** control strategy enablement
- [ ] **Graceful degradation** if strategy fails

### Interview Red Flags to Avoid

🚫 "Strategy pattern adds unnecessary complexity"
✅ "For 2 cases I'd use if-else, but for 5+ payment methods Strategy makes sense"

🚫 "Just use one giant class with switch statements"
✅ "That violates Open-Closed Principle and makes testing hard"

🚫 "I'd create a new strategy class for every minor variation"
✅ "I'd parameterize strategies where possible and only create new classes for distinct algorithms"

### Final Interview Sound Bite

*"Strategy Pattern is my go-to for eliminating complex conditionals. I've used it in payment processing, pricing engines, and notification systems. The key is keeping strategies stateless, having good observability, and always providing a fallback. At FAANG scale, I've seen it handle millions of requests per second with proper caching and circuit breakers."*

---

## 📚 Additional Resources

**Books:**
- "Design Patterns: Elements of Reusable Object-Oriented Software" (Gang of Four)
- "Head First Design Patterns"
- "Effective Java" by Joshua Bloch (Item 34: Use enums instead of int constants - alternative to Strategy)

**Real-World Examples:**
- Spring Framework: `org.springframework.cache.Cache` implementations
- Java Collections: `Comparator` interface
- Apache Commons: `org.apache.commons.collections4.functors`

**Engineering Blogs:**
- Uber: Dynamic Pricing Strategy
- Netflix: Video Compression Strategy Selection
- Stripe: Payment Method Strategy Architecture

---

**Last Updated**: January 2026
**Target Audience**: Senior Backend Engineers (7+ YOE)
**Interview Level**: FAANG L5/L6 (Senior/Staff)
