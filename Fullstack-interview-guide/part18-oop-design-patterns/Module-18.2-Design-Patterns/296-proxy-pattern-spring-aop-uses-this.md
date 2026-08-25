# Proxy Pattern — Spring AOP Uses This
> Part 18 — OOP, SOLID & Design Patterns
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Proxy pattern**: a class that stands in for another object with the SAME interface; controls access to the real object; client thinks it's talking to the real object
- **Three proxy types**: Virtual Proxy (delays expensive creation until needed — lazy loading); Protection Proxy (controls access based on permissions); Remote Proxy (stands in for object in another address space — stub in RPC/gRPC)
- **Spring AOP IS proxy**: when you annotate `@Transactional`, `@Cacheable`, `@CircuitBreaker`, Spring wraps your bean in a dynamic proxy at startup; the proxy intercepts method calls, adds behaviour, delegates to the real bean; you never see the proxy — you inject the interface, Spring injects the proxy
- **JDK Dynamic Proxy vs CGLIB**: JDK proxy requires an interface (creates proxy implementing that interface); CGLIB subclasses the target class directly (no interface needed, but class must not be `final`); Spring Boot 2.x+ defaults to CGLIB for Spring components
- **The famous gotcha**: `@Transactional` method calling ANOTHER `@Transactional` method in the SAME class bypasses the proxy (calls `this.method()`, not through Spring's proxy); no proxy = no new transaction; fix: inject a reference to self via Spring, or extract to a separate bean
- **Spring Data Repositories** are a form of Virtual Proxy: you define an interface (no implementation); Spring generates a proxy implementation at startup that translates method names to JPQL and executes them

---

## 1. One-Line Definition
Proxy provides a surrogate for another object with the same interface, controlling access to the real object — adding lazy loading, access control, logging, caching, or cross-cutting concerns transparently so callers are unaware of the proxy's existence.

---

## 2. The Problem It Solves

**Without Proxy, every cross-cutting concern must be manually coded everywhere:**

```java
// Every service method needs transaction begin/commit/rollback manually
public void processOrder(Order order) {
    EntityTransaction tx = em.getTransaction();
    tx.begin();
    try {
        repo.save(order);             // your actual work
        inventory.reserve(order);
        tx.commit();
    } catch (RuntimeException e) {
        tx.rollback();
        throw e;
    }
}
```

With `@Transactional` Proxy: your method is 2 lines. Spring's proxy adds the 10 lines of transaction management around it, invisibly.

---

## 3. How It Works Internally

```
Startup:
  Spring scans @Transactional on OrderService.processOrder()
  Creates a JDK/CGLIB proxy class that:
    - implements the same interface as OrderService (or extends OrderService)
    - holds a reference to the REAL OrderService
    - OVERRIDES every public method with proxy logic

  Beans in ApplicationContext:
    OrderService bean → proxy object (NOT raw OrderService)

At call time:
  CheckoutController injects OrderService → gets the PROXY
  checkoutController.placeOrder() calls orderService.processOrder(order)
    → hits PROXY's processOrder()
    → proxy calls TransactionInterceptor.before()   (begin transaction)
    → proxy delegates: realOrderService.processOrder(order)
    → proxy calls TransactionInterceptor.after()    (commit or rollback)
    → returns result to CheckoutController

The SAME-CLASS CALL problem:
  Inside realOrderService.processOrder() calling this.validateOrder()
  → calls REAL bean's validateOrder(), NOT the proxy
  → any @Transactional on validateOrder() is BYPASSED
```

---

## 4. The Code

### Wrong Way — Cross-Cutting Concerns Scattered Everywhere

```java
// ❌ Manual cross-cutting: transaction + cache + metrics in every method

@Service
public class ProductService {
    // Scattered cross-cutting concerns: transaction, cache, metrics, logging
    
    public Product getProduct(Long id) {
        // ❌ Cache check manually
        Product cached = cache.get("product:" + id);
        if (cached != null) return cached;
        
        // ❌ Metrics manually
        long start = System.currentTimeMillis();
        
        // ❌ No transaction here but should be
        try {
            Product product = repo.findById(id).orElseThrow();
            
            // ❌ Cache put manually
            cache.put("product:" + id, product);
            
            // ❌ Metrics record manually
            metrics.recordLatency("getProduct", System.currentTimeMillis() - start);
            
            return product;
        } catch (Exception e) {
            metrics.recordFailure("getProduct");
            throw e;
        }
    }
    
    public void updateProduct(Product product) {
        // ❌ Same boilerplate repeated in EVERY method
        long start = System.currentTimeMillis();
        EntityTransaction tx = em.getTransaction();
        tx.begin();
        try {
            validate(product);
            repo.save(product);
            cache.invalidate("product:" + product.getId());  // must remember to invalidate
            tx.commit();
        } catch (RuntimeException e) {
            tx.rollback();
            metrics.recordFailure("updateProduct");
            throw e;
        } finally {
            metrics.recordLatency("updateProduct", System.currentTimeMillis() - start);
        }
    }
    // 20 more methods with the same boilerplate...
}
```

```java
// ✅ SPRING AOP PROXY — cross-cutting via annotations; method body = pure business logic

@Service
public class ProductService {
    private final ProductRepository repo;
    
    public ProductService(ProductRepository repo) { this.repo = repo; }
    
    @Cacheable(value = "products", key = "#id")   // ← Spring proxy adds cache check/put
    @Timed("product.get")                          // ← Micrometer proxy adds timing
    @Transactional(readOnly = true)               // ← Spring proxy manages transaction
    public Product getProduct(Long id) {
        return repo.findById(id).orElseThrow(
            () -> new ProductNotFoundException(id));
        // ← No cache logic, no metrics, no transaction code
        // Spring's proxy chain handles all of that AROUND this method
    }
    
    @CacheEvict(value = "products", key = "#product.id")  // ← proxy evicts cache after write
    @Transactional                                         // ← proxy begins transaction
    @CircuitBreaker(name = "productUpdate",                // ← Resilience4j proxy: circuit breaker
                    fallbackMethod = "updateProductFallback")
    public void updateProduct(Product product) {
        validateProduct(product);
        repo.save(product);
        // ← 3 lines vs 20 lines; cross-cutting is DECLARED, not coded
    }
    
    private void updateProductFallback(Product product, Throwable t) {
        log.error("Product update circuit open for {}: {}", product.getId(), t.getMessage());
        throw new ServiceUnavailableException("Product update temporarily unavailable");
    }
}
```

```java
// ✅ The self-invocation gotcha — understand the proxy limitation

@Service
public class OrderService {
    
    @Transactional
    public void placeOrder(Order order) {
        // ... save order
        this.sendConfirmation(order);  // ❌ 'this' calls REAL bean — bypasses proxy
                                       // sendConfirmation's @Transactional is ignored
                                       // → runs in the SAME transaction as placeOrder (not REQUIRES_NEW)
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)  // wants its OWN transaction
    public void sendConfirmation(Order order) {
        // This method's @Transactional ONLY works when called through the PROXY
        // (i.e., from OUTSIDE this class or through self-injection below)
    }
}

// ✅ FIX OPTION 1: Inject self via @Lazy (Spring injects the proxy of self)
@Service
public class OrderService {
    @Lazy @Autowired
    private OrderService self;  // Spring injects the PROXY — calls through proxy = transaction applies
    
    @Transactional
    public void placeOrder(Order order) {
        self.sendConfirmation(order);  // ✅ goes through proxy → REQUIRES_NEW transaction starts
    }
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendConfirmation(Order order) { /* own transaction */ }
}

// ✅ FIX OPTION 2: Extract to a separate Spring bean (cleaner, preferred)
@Service
public class OrderConfirmationService {
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendConfirmation(Order order) { /* own transaction */ }
}

@Service
public class OrderService {
    private final OrderConfirmationService confirmationService;  // different bean = goes through proxy
    
    @Transactional
    public void placeOrder(Order order) {
        confirmationService.sendConfirmation(order);  // ✅ different bean → through proxy → REQUIRES_NEW
    }
}
```

```java
// ✅ Manual Proxy — Virtual Proxy for expensive resource (lazy loading)

interface HeavyReport {
    byte[] generate();
}

class RealHeavyReport implements HeavyReport {
    private final ReportEngine engine;
    
    RealHeavyReport(ReportEngine engine) {
        this.engine = engine;
        System.out.println("RealHeavyReport constructed — expensive!");
    }
    
    @Override
    public byte[] generate() { return engine.runAllQueries(); }
}

// Virtual Proxy — delays construction until first actual use
class LazyHeavyReportProxy implements HeavyReport {
    private final ReportEngine engine;
    private RealHeavyReport real = null;         // ← null until generate() is called
    
    LazyHeavyReportProxy(ReportEngine engine) {
        this.engine = engine;                    // ← cheap; no engine queries yet
    }
    
    @Override
    public synchronized byte[] generate() {
        if (real == null) {                       // ← only create when actually needed
            real = new RealHeavyReport(engine);
        }
        return real.generate();
    }
}
// The caller uses HeavyReport interface — doesn't know it's a lazy proxy
// If the caller never calls generate(), the expensive report is never built
```

```typescript
// ✅ JavaScript Proxy object — language-level Proxy pattern

// ES6 Proxy: intercept property access on any object
function createValidatedConfig<T extends object>(config: T): T {
    return new Proxy(config, {
        set(target, prop, value) {
            // Intercept all property writes — validation before setting
            if (prop === 'timeout' && (typeof value !== 'number' || value < 100)) {
                throw new Error(`timeout must be a number >= 100, got: ${value}`);
            }
            if (prop === 'retries' && (typeof value !== 'number' || value < 0 || value > 10)) {
                throw new Error(`retries must be 0-10, got: ${value}`);
            }
            Reflect.set(target, prop, value);
            return true;
        },
        get(target, prop) {
            const value = Reflect.get(target, prop);
            console.log(`Config accessed: ${String(prop)} = ${JSON.stringify(value)}`);
            return value;
        }
    });
}

const config = createValidatedConfig({ timeout: 3000, retries: 3, baseUrl: '' });
config.timeout = 50;  // ← throws: "timeout must be a number >= 100"
config.timeout = 5000;  // ← accepted
console.log(config.timeout);  // ← logs "Config accessed: timeout = 5000"
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does Spring's @Transactional work under the hood?"

**Hruday's answer:**
> When Spring sees `@Transactional` on a class or method, it creates a dynamic proxy — a generated class that implements the same interface as your bean (or extends it via CGLIB subclassing).
>
> At application startup, Spring registers the proxy in the ApplicationContext instead of your raw bean. Any class that depends on your service receives the PROXY, not the raw bean, through dependency injection.
>
> When a method is called, the call goes to the proxy first. The proxy's `TransactionInterceptor` runs before your method: calls `PlatformTransactionManager.getTransaction()` to begin a transaction. Then it delegates to your real method. If your method returns normally, the interceptor calls `commit()`. If it throws a `RuntimeException` (or any exception you configure), it calls `rollback()`.
>
> The one critical implication: if a method inside your service class calls ANOTHER method in the same class with `this.method()`, it bypasses the proxy entirely — it's a direct method call on the raw object. Any `@Transactional` annotation on `method()` is ignored for that call. This is the most common Spring `@Transactional` bug in production.

---

### Q2 — Deep Dive
**Interviewer asks:** "JDK Dynamic Proxy vs CGLIB — when does Spring use each and what are the constraints?"

**Hruday's answer:**
> JDK Dynamic Proxy: requires the target class to implement an interface. The proxy implements the same interface. Only methods defined in the interface are interceptable. If the class has methods NOT in any interface, those can't be proxied with JDK.
>
> CGLIB: generates a subclass of the target class at runtime. No interface required. Intercepts any public method. Requirement: the class must NOT be `final` (can't subclass final classes), and the method must NOT be `final` (can't override final methods).
>
> Spring Boot defaults to CGLIB for `@Component` classes since Spring Boot 2.x. JDK Proxy is still used for JDK interface proxies (`@Repository` data interfaces via Spring Data, `@FeignClient`).
>
> The practical constraint: don't mark your Spring service classes or their methods `final`. If you do, CGLIB can't create the proxy, and Spring will throw an error at startup when `@Transactional` or `@Cacheable` is present. Kotlin classes are `final` by default — Spring Boot configures the Kotlin `allopen` plugin to open Spring-annotated classes automatically; without that plugin, `@Transactional` Kotlin classes would silently not work.

---

### Q3 — Application
**Interviewer asks:** "What is a Protection Proxy and where would you use one?"

**Hruday's answer:**
> A Protection Proxy controls access to the real object based on permissions. The proxy implements the same interface, checks whether the caller has the right to perform the operation, and either delegates or throws an access exception.
>
> Spring Security's `@PreAuthorize` is effectively a Protection Proxy at the method level: Spring's security AOP proxy intercepts the call, evaluates the SpEL expression in `@PreAuthorize("hasRole('ADMIN')")`, and throws `AccessDeniedException` if the condition isn't met — without the method body ever running.
>
> A manual example: a `SecuredOrderRepository` wraps a real `OrderRepository` and checks that the calling user's tenant matches the order's tenant before returning data. Multi-tenant data isolation via a protection proxy instead of embedding tenant checks in every repository method.
>
> Spring Data uses a related concept: `@PostFilter` and `@PreFilter` annotations add filtering proxies around repository queries for row-level security — returning only the subset of data the current user is permitted to see.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| @Transactional always works | "I just add @Transactional to my method and it handles transactions" | `@Transactional` only works when called through the Spring proxy; if the method is called from WITHIN the same class (this.method()), or if the class is marked `final`, or if the method is `private` (proxies can't override private methods), the annotation is silently IGNORED with no error; not knowing this proxy limitation leads to subtle data integrity bugs where you think you have transaction guarantees but don't; always test transactional behaviour with integration tests |
| Proxy = Decorator | "Proxy and Decorator look the same to me" | Both wrap an object with the same interface; the distinction is intent and scope: Proxy controls ACCESS — lazy loading, remote delegation, access control (the proxy stands IN for the object); Decorator ADDS BEHAVIOUR — enriches the object's functionality; Spring AOP is technically a proxy (stands in for the bean in the context) that adds decorating behaviour (`@Transactional` adds transaction management); in practice Spring calls them aspects/proxies; in interview discussion, the intent distinction matters |
| Reading proxy-generated stack traces | "I don't understand the proxy class names in stack traces like $Proxy23 or OrderServiceEnhancerBySpringCGLIB" | CGLIB-generated proxy classes appear in stack traces as `OrderService$$EnhancerBySpringCGLIB$$abc123`; they look unfamiliar but they're just Spring's generated wrapper; the real method is one frame below in the actual `OrderService`; JDK proxies appear as `com.sun.proxy.$Proxy23`; knowing to look ONE frame below the proxy class in a stack trace is a practical debugging skill; mentioning this shows production debugging experience |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, we had a data export service where the same `@Transactional` method internally called a helper method that was also `@Transactional(propagation = REQUIRES_NEW)`. The helper was supposed to write audit records in its own transaction — even if the main transaction rolled back, the audit record should persist.
>
> In production, we found that on validation failures, the main transaction rolled back AND — unexpectedly — the audit records were also missing. The audit records were supposed to survive the rollback.
>
> Root cause: the main `export()` method called `this.auditWrite(record)` — same class, bypasses the proxy. The `auditWrite` method's `REQUIRES_NEW` annotation was ignored; it ran in the parent transaction. When the parent rolled back, it took the audit records with it.
>
> Fix: extracted `AuditService` as a separate Spring bean. Injected it into the export service. When `export()` called `auditService.auditWrite(record)`, the call went through Spring's proxy, the `REQUIRES_NEW` transaction started correctly, committed independently, and survived the parent rollback.
>
> We added this as a rule to our onboarding: 'never call a transactional method on this within a Spring service — always extract to a separate bean if you need a nested transaction.'"

---

## 8. Scale Evolution

**1,000 users →** Spring AOP proxies handle transactions, caching, security — no boilerplate duplication in service methods.

**100,000 users →** Proxy-based circuit breakers (Resilience4j `@CircuitBreaker` on every external call) — Spring proxy intercepts and routes to fallback when upstream is degraded; the proxy IS the point of failure isolation without modifying business logic.

**10 million users →** Proxy layer at the infrastructure level: service mesh (Istio sidecar proxy) is the Proxy pattern at the network level — intercepts all inbound/outbound traffic for a microservice, adds (without changing the service): mTLS, retries, circuit breaking, distributed tracing headers, rate limiting; same idea as Spring AOP but in the network plane.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | `@Transactional` proxy for atomic payment state updates; `@CircuitBreaker` proxy for bank API calls; understanding the self-invocation gotcha for nested payment steps | Transactional proxy internals; self-invocation gotcha |
| Swiggy / Meesho | `@Cacheable` proxy for product catalog reads; `@PreAuthorize` protection proxy for seller data isolation; proxy debugging (CGLIB stack traces) | Protection proxy; proxy stack trace reading |
| Adobe / Microsoft | Spring AOP deep dive is common in principal engineer rounds; "explain how @Transactional works" without hand-waving; JDK vs CGLIB proxy selection | AOP internals; JDK vs CGLIB; proxy limitations |
| SAP Labs | self-invocation this.auditWrite() bug (REQUIRES_NEW ignored → audit loss → extract to separate bean → fix); rule added to onboarding | Concrete proxy self-invocation bug with data integrity impact |

---

## 10. Related Topics — What to Study Next

- **Topic 295 — Decorator Pattern** — Decorator and Proxy both wrap objects with the same interface; the key distinction is intent (Proxy = control access / stand in for; Decorator = add behaviour); being able to discuss both and explain Spring AOP as a proxy-that-decorates is a senior-level signal
- **Topic 289 — Dependency Injection** — the `@Transactional` self-invocation gotcha is directly caused by how DI + Proxy interact: Spring injects the proxy object, but within the bean you hold a reference to `this` (the real bean); understanding DI + Proxy interaction prevents the most common Spring transactional bug
- **Topic 300 — Chain of Responsibility** — Spring Security's filter chain is Chain of Responsibility sitting around a proxy-based security architecture; the security proxy (MethodSecurityInterceptor) delegates to the filter chain; seeing these patterns layered in Spring Security's design is an architectural insight

---

*Part 18 · Proxy Pattern — Spring AOP Uses This · Full Stack Interview Guide · Hruday D · 2026*
