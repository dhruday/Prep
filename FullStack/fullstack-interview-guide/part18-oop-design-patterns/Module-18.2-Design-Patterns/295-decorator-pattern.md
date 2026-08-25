# Decorator Pattern
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Decorator pattern**: wraps an object with the SAME interface to add behaviour without changing the original class; the wrapper delegates to the wrapped object and adds logic before/after
- **Key property**: stacking — you can wrap a decorator around another decorator; `TimedLogger(FilteredLogger(ConsoleLogger))` — three behaviours stacked without a class explosion
- **vs Inheritance**: inheritance adds behaviour at COMPILE TIME, permanently; Decorator adds behaviour at RUNTIME, composably; a class with 3 optional behaviours (A, B, C) would need 7 subclasses (A, B, C, AB, AC, BC, ABC) vs 3 decorator classes (compose any combination at runtime)
- **Spring AOP = Decorator at the framework level**: `@Transactional`, `@Cacheable`, `@CircuitBreaker`, `@Retryable` all wrap your method in a proxy (a decorator) that adds the behaviour; you didn't change your method; Spring composed the behaviour on top
- **Java I/O is all decorators**: `new BufferedReader(new InputStreamReader(new FileInputStream("file.txt")))` — BufferedReader decorates InputStreamReader which decorates FileInputStream; all implement `Reader` or `InputStream`
- **Rule of thumb**: if you find yourself adding a boolean flag to a class to optionally enable/disable a feature, a decorator is the right shape instead

---

## 1. One-Line Definition
Decorator wraps an object with the same interface to add or alter behaviour at runtime, allowing behaviour to be composed by stacking decorators without changing the original class or creating a combinatorial explosion of subclasses.

---

## 2. The Problem It Solves

**Without Decorator:**

```text
OrderRepository (base)
    └── CachedOrderRepository        (extends OrderRepository — adds caching)
        └── LoggedOrderRepository    (extends CachedOrderRepository — adds logging)
            └── ValidatedOrderRepository (extends LoggedOrderRepository — adds validation)
                └── AuditedOrderRepository (+ auditing)
```

Adding each feature multiplies the class hierarchy. To have caching + logging but NOT validation? Another subclass. To add timing? Re-derive every combination.

**With Decorator:** 3 decorator classes. Compose any combination at runtime: `Timed(Cached(Logged(OrderRepository)))`. No new subclass for each combination.

---

## 3. How It Works Internally

```
Client → Component interface (OrderRepository)
             ↓
         LogDecorator implements OrderRepository
           - wraps: OrderRepository delegate
           - on findById(id):
               log "calling findById"
               result = delegate.findById(id)   ← delegates to next in chain
               log "findById returned " + result
               return result
             ↓
         CacheDecorator implements OrderRepository
           - wraps: OrderRepository delegate
           - on findById(id):
               if cache.has(id) return cache.get(id)
               result = delegate.findById(id)   ← delegates to base repository
               cache.put(id, result)
               return result
             ↓
         JpaOrderRepository (base — the real work)
```

---

## 4. The Code

### Wrong Way — Boolean Flags or Subclass Explosion

```java
// ❌ INHERITANCE EXPLOSION: a subclass for each combination

interface OrderRepository {
    Optional<Order> findById(Long id);
    void save(Order order);
}

class JpaOrderRepository implements OrderRepository {
    public Optional<Order> findById(Long id) { /* JPA */ return Optional.empty(); }
    public void save(Order o) { /* JPA */ }
}

// ❌ Each "feature" requires full subclass reimplementation
class CachedOrderRepository extends JpaOrderRepository {
    private Map<Long, Order> cache = new HashMap<>();
    @Override public Optional<Order> findById(Long id) {
        if (cache.containsKey(id)) return Optional.of(cache.get(id));
        Optional<Order> result = super.findById(id);
        result.ifPresent(o -> cache.put(id, o));
        return result;
    }
    // save() must also clear cache — now JPA save() is duplicated here
}

class LoggedCachedOrderRepository extends CachedOrderRepository {
    // ❌ Must extend CachedOrderRepository specifically — logging becomes tied to caching
    // Can't have logging WITHOUT caching; can't have caching without logging as a subclass
    @Override public Optional<Order> findById(Long id) {
        System.out.println("findById: " + id);
        Optional<Order> result = super.findById(id);
        System.out.println("findById result: " + result);
        return result;
    }
}

// ❌ Want validation too? Another class. Want timing too? Another class.
// 3 features = 7 possible combinations = 7 subclasses to maintain
```

```java
// ✅ DECORATOR PATTERN — compose at runtime, no subclass explosion

// 1. Component interface
public interface OrderRepository {
    Optional<Order> findById(Long id);
    void save(Order order);
}

// 2. Base implementation (the real work)
@Repository
public class JpaOrderRepository implements OrderRepository {
    private final EntityManager em;
    public JpaOrderRepository(EntityManager em) { this.em = em; }
    
    @Override public Optional<Order> findById(Long id) {
        return Optional.ofNullable(em.find(Order.class, id));
    }
    @Override public void save(Order order) { em.persist(order); }
}

// 3. Base decorator (optional — holds the delegate, reduces boilerplate)
public abstract class OrderRepositoryDecorator implements OrderRepository {
    protected final OrderRepository delegate;  // ← wraps the component (same interface)
    
    public OrderRepositoryDecorator(OrderRepository delegate) { this.delegate = delegate; }
    
    // Default: delegate to wrapped component (override only what you add)
    @Override public Optional<Order> findById(Long id) { return delegate.findById(id); }
    @Override public void save(Order order) { delegate.save(order); }
}

// 4. Caching decorator
public class CachingOrderRepository extends OrderRepositoryDecorator {
    private final Map<Long, Order> cache = new ConcurrentHashMap<>();
    
    public CachingOrderRepository(OrderRepository delegate) { super(delegate); }
    
    @Override
    public Optional<Order> findById(Long id) {
        if (cache.containsKey(id)) {
            return Optional.of(cache.get(id));  // ← cache hit: no delegate call
        }
        Optional<Order> result = delegate.findById(id);  // ← cache miss: delegate
        result.ifPresent(o -> cache.put(id, o));
        return result;
    }
    
    @Override
    public void save(Order order) {
        delegate.save(order);
        cache.put(order.getId(), order);  // ← keep cache consistent on write
    }
}

// 5. Logging decorator
public class LoggingOrderRepository extends OrderRepositoryDecorator {
    private static final Logger log = LoggerFactory.getLogger(LoggingOrderRepository.class);
    
    public LoggingOrderRepository(OrderRepository delegate) { super(delegate); }
    
    @Override
    public Optional<Order> findById(Long id) {
        log.debug("findById: {}", id);
        long start = System.currentTimeMillis();
        Optional<Order> result = delegate.findById(id);  // ← delegate
        log.debug("findById({}) → {} in {}ms", id, result.map(Order::getId).orElse(null),
                  System.currentTimeMillis() - start);
        return result;
    }
}

// 6. Validation decorator
public class ValidatingOrderRepository extends OrderRepositoryDecorator {
    public ValidatingOrderRepository(OrderRepository delegate) { super(delegate); }
    
    @Override
    public void save(Order order) {
        if (order.getItems() == null || order.getItems().isEmpty()) {
            throw new IllegalArgumentException("Order must have at least one item");
        }
        if (order.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Order total must be > 0");
        }
        delegate.save(order);  // ← only delegate if validation passes
    }
}

// 7. Compose any combination in Spring configuration — zero changes to each decorator
@Configuration
public class RepositoryConfig {
    
    @Bean
    public OrderRepository orderRepository(EntityManager em) {
        // ✅ Stack decorators — order matters:
        // Logging wraps Caching wraps Validation wraps JPA
        // → log is first/last in chain (logs cache hits too)
        // → cache check happens before validation
        // → validation only before actual JPA save
        OrderRepository base = new JpaOrderRepository(em);
        OrderRepository validated = new ValidatingOrderRepository(base);
        OrderRepository cached = new CachingOrderRepository(validated);
        return new LoggingOrderRepository(cached);
    }
    
    // For test environment: logging only, no cache, no validation
    @Bean @Profile("test")
    public OrderRepository testOrderRepository(EntityManager em) {
        return new LoggingOrderRepository(new JpaOrderRepository(em));
    }
}
```

```java
// ✅ Java I/O — classic textbook decorator example

// All implement InputStream — the component interface
InputStream raw           = new FileInputStream("data.csv");         // base
InputStream buffered      = new BufferedInputStream(raw);            // decorate: adds buffering
InputStream uncompressed  = new GZIPInputStream(buffered);           // decorate: adds decompression
InputStreamReader reader  = new InputStreamReader(uncompressed, StandardCharsets.UTF_8);
BufferedReader lines      = new BufferedReader(reader);              // decorate: adds readLine()

// Reading from `lines` transparently:
// - reads from file (FileInputStream)
// - buffers in 8KB chunks (BufferedInputStream)
// - decompresses on the fly (GZIPInputStream)
// - decodes UTF-8 bytes to chars (InputStreamReader)
// - provides .readLine() API (BufferedReader)
// Each layer is a Decorator — same interface, adds one behaviour, stacked
```

```typescript
// ✅ TypeScript — Decorator pattern for Angular/React service enrichment

interface ApiClient {
    get<T>(url: string): Observable<T>;
    post<T>(url: string, body: unknown): Observable<T>;
}

// Base
class HttpApiClient implements ApiClient {
    constructor(private http: HttpClient) {}
    get<T>(url: string) { return this.http.get<T>(url); }
    post<T>(url: string, body: unknown) { return this.http.post<T>(url, body); }
}

// Logging decorator
class LoggingApiClient implements ApiClient {
    constructor(private delegate: ApiClient) {}
    
    get<T>(url: string) {
        console.log(`GET ${url}`);
        return this.delegate.get<T>(url).pipe(
            tap(res => console.log(`GET ${url} →`, res))
        );
    }
    post<T>(url: string, body: unknown) {
        console.log(`POST ${url}`, body);
        return this.delegate.post<T>(url, body);
    }
}

// Auth decorator
class AuthApiClient implements ApiClient {
    constructor(private delegate: ApiClient, private authService: AuthService) {}
    
    private withAuth<T>(call: Observable<T>): Observable<T> {
        // Inject auth header by catching 401 and refreshing token, then retrying
        return call.pipe(
            catchError(err => {
                if (err.status === 401) {
                    return this.authService.refreshToken().pipe(
                        switchMap(() => call)  // retry after refresh
                    );
                }
                return throwError(() => err);
            })
        );
    }
    
    get<T>(url: string) { return this.withAuth(this.delegate.get<T>(url)); }
    post<T>(url: string, body: unknown) { return this.withAuth(this.delegate.post<T>(url, body)); }
}

// Compose: logging + auth wraps base HTTP client
const client: ApiClient = new LoggingApiClient(
    new AuthApiClient(new HttpApiClient(httpClient), authService)
);
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How is Decorator different from subclassing for adding behaviour?"

**Hruday's answer:**
> Inheritance adds behaviour at compile time — you choose the combination when writing the class. If I have caching, logging, and validation as three features, I need a class for every combination I want to use: `CachedLogged`, `LoggedValidated`, `CachedValidated`, `CachedLoggedValidated` — 7 subclasses for 3 features, and each combination is baked at compile time.
>
> Decorator adds behaviour at runtime by composition. I write 3 decorator classes. At runtime (in a Spring `@Configuration`), I decide which combination to stack: test environment gets logging only, production gets `Logged(Cached(Validated(JpaRepository)))`. Adding a 4th feature (auditing) is one new decorator class — the 7 existing combinations don't change.
>
> The practical test: if you're adding behaviours that have natural orthogonal toggle combinations, Decorator beats inheritance. If the behaviour is always present and part of the type's identity, a subclass is correct.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does Spring AOP implement the Decorator pattern?"

**Hruday's answer:**
> When you annotate a method `@Transactional`, Spring doesn't modify your source code. At startup, it generates a dynamic proxy — a class that implements the same interface as your bean (or extends it if using CGLIB). The proxy wraps your bean and, when any method is called, runs the transaction begin/commit/rollback logic around the call to your actual method.
>
> This is exactly the Decorator pattern: the proxy implements the same interface as the real bean, delegates to the real bean, and adds transaction management. Spring composes multiple proxy layers: `@Transactional` is one decorator layer, `@Cacheable` is another, `@CircuitBreaker` from Resilience4j is another. They stack.
>
> The important implication: calling `@Transactional` on a method from WITHIN the same class bypasses the proxy. The proxy sits between the calling code and the bean — but when a method in the bean calls another method in the same bean, it calls `this.method()` directly, not through the proxy. No decorator = no transaction. This is a common Spring gotcha that understanding the Decorator/Proxy pattern explains.

---

### Q3 — Application
**Interviewer asks:** "What ordering of decorators matters and what order would you use for caching, logging, and validation?"

**Hruday's answer:**
> Ordering matters when decorators interact. My typical stack for write operations:
>
> `Logging → Caching → Validation → Base`
>
> Reasoning:
> - Logging outermost: captures the COMPLETE call including cache hits and validation failures; I want to log every request regardless of which layer handles it
> - Caching before validation on reads: if the data is cached, we skip validation (cached data was already valid when stored); on writes, caching would be AFTER validation (don't cache invalid data)
> - Validation before the base: validate before any I/O; fail fast on invalid input before touching the database
>
> For read operations: `Logging → Caching → Base` (validation usually applies to writes, not reads).
>
> The key insight: think about what each decorator's "before" and "after" logic needs to see. Logging needs to see the result of everything — it should be outermost. Caching needs to potentially short-circuit the whole chain — it should be outside any expensive operation. Validation should block before any I/O — it should be just inside the logging but outside the database call.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Spring AOP is different from Decorator" | "Decorator is a design pattern; AOP is a framework feature, not the same thing" | Spring AOP uses the Decorator pattern as its implementation mechanism — JDK dynamic proxies and CGLIB proxies ARE Decorator pattern applied by the framework; `@Transactional` is syntactic sugar for Spring creating a Logging/Transaction decorator around your bean; understanding that `@Transactional` is a decorator explains the "same-class call bypasses transaction" behaviour that catches every developer at some point |
| Decorator = Proxy | "Decorator and Proxy are the same — both wrap a class" | Both wrap objects with the same interface, but intention differs: Decorator ADDS behaviour (new functionality the original didn't have); Proxy CONTROLS access to the original (lazy loading, access control, remote delegation, caching without the component knowing); the distinction becomes clear with examples: `LoggingDecorator` adds logging capability; `RemoteProxy` stands in for an object that may not be local; in practice the line blurs and the two terms are often used interchangeably |
| Hard to trace decorated calls | "Decorators make debugging hard because the call goes through multiple objects" | This is a real trade-off worth acknowledging; a stack trace through 4 decorator layers is harder to follow than a single class; mitigation: name decorators clearly (`LoggingOrderRepository`, not `OrderRepositoryWrapper`); use structured log correlation IDs so all log lines for one request are traceable; in production Spring AOP stacks, the framework's proxy class names show in stack traces which helps identify which advice added which behaviour |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a `ProductDataService` consumed by about 15 other services. Over 18 months, product teams kept adding cross-cutting requirements: 'add logging', 'add metrics', 'add response caching', 'add circuit breaking', 'add rate limiting per consumer'.
>
> Early on, each feature was added directly inside `ProductDataService` — the method had grown from 20 lines to 120 lines, half of which were not product data logic: log statements, metrics counters, cache checks, circuit breaker calls, rate limit checks.
>
> We refactored to decorators. The core `ProductDataService` went back to 20 lines — pure product data retrieval. Five decorator classes wrapped it: `MetricCollectingDecorator`, `CachingDecorator`, `CircuitBreakingDecorator`, `RateLimitingDecorator`, `LoggingDecorator`. Composed in Spring configuration.
>
> Result: when the team needed to change caching TTL — a one-line change in `CachingDecorator`. When rate limiting needed to be disabled for internal services — swap the configuration for that consumer to exclude `RateLimitingDecorator`. When a new cross-cutting requirement came (SAP audit compliance logging in a specific format) — one new decorator class, added to the chain, zero changes to `ProductDataService` or any of the 5 existing decorators."

---

## 8. Scale Evolution

**1,000 users →** Decorator for clean separation of cross-cutting concerns: logging, validation, simple in-memory caching. Each decorator is pure and testable independently.

**100,000 users →** Spring AOP as framework-level Decorator: `@Cacheable` (cache decorator), `@CircuitBreaker` (fault tolerance decorator), `@Retryable` (retry decorator) — all stacked via AOP proxies without boilerplate code; metrics collection via Micrometer `@Timed` annotation (another decorator layer).

**10 million users →** Decorator pattern in middleware chains: API Gateway middleware stack (authentication → rate limiting → request logging → routing → response logging) is a Decorator chain for every HTTP request; each middleware step is a decorator; tuning middleware ordering has direct latency impact; identifying which decorator adds latency is production observability.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Decorator chain for payment API calls: auth → rate limit → idempotency check → payment processing → audit log; each layer is independently testable and replaceable | Multiple decorator layers for payment flow |
| Swiggy / Meesho | Product catalog API: Caching → Circuit breaker → Logging → Base; tuning decorator ordering for cache hit rate vs logging granularity | Decorator ordering rationale |
| Adobe / Microsoft | "Implement a decorator for logging and caching" is a common whiteboard question; Java I/O stream decorator knowledge (BufferedReader/InputStreamReader) | Java I/O as decorator example; whiteboard implementation |
| SAP Labs | ProductDataService 120 → 20 lines story (5 decorator extractions; one-line TTL change; decorator addition for audit compliance) | Measurable refactor benefit; decorator addition with zero existing changes |

---

## 10. Related Topics — What to Study Next

- **Topic 296 — Proxy Pattern — Spring AOP Uses This** — Proxy and Decorator are structurally identical (wrap an object with same interface); understanding the distinction in intent (Proxy = control access; Decorator = add behaviour) and seeing how Spring AOP is technically a Proxy implementing decorator behaviour is a senior-level topic
- **Topic 300 — Chain of Responsibility** — Chain of Responsibility is similar to a Decorator chain (each link processes a request and passes it on), but the intent differs: in Decorator, every layer ALWAYS adds its behaviour and delegates; in Chain of Responsibility, a handler can short-circuit and NOT pass to the next handler; Spring Security's filter chain is Chain of Responsibility (authentication filter can stop the chain)
- **Topic 287 — Composition over Inheritance** — Decorator is the formal pattern that embodies composition over inheritance; seeing in Decorator's code exactly why composition (wrapping + delegating) beats inheritance (subclass explosion) solidifies the principle as practical, not just philosophical

---

*Part 18 · Decorator Pattern · Full Stack Interview Guide · Hruday D · 2026*
