# Spring AOP — Cross-Cutting Concerns, @Aspect, Pointcuts
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- AOP = Aspect-Oriented Programming — a way to add behaviour (logging, security, transactions) to many methods WITHOUT changing those methods
- Spring AOP works via **proxies**: Spring replaces your bean with a proxy object that runs extra code before/after/around your method
- Key terms: **Aspect** (the class holding your extra logic), **Advice** (when to run — Before/After/Around), **Pointcut** (which methods to target), **JoinPoint** (the actual method call)
- Spring AOP is **proxy-based** — it ONLY intercepts method calls on Spring-managed beans. Calling a method on `this` inside the same class bypasses the proxy
- Gap to bridge: understand that `@Transactional` and Spring Security are both built on AOP — that is why calling a `@Transactional` method from inside the same class breaks transactions

---

## 1. One-Line Definition
Spring AOP lets you wrap extra behaviour (logging, security, performance monitoring, transaction management) around existing methods without touching those methods — by replacing the bean with a proxy that runs your extra code at the right moment.

---

## 2. The Problem It Solves

You are building an order service with 50 API endpoints. Every method needs: execution time logging, user authentication check, and audit trail recording.

Option A: Add logging, auth check, and audit code to all 50 methods. Every method now has 20 lines of non-business code before the first real line. When the logging format changes, you update 50 places. When the audit requirement changes, you update 50 places. The business logic is buried in boilerplate.

Option B: Use AOP. Write ONE logging aspect, ONE authentication aspect, ONE audit aspect. Declare which methods they apply to using a pointcut expression. Spring wires them automatically. Your 50 service methods contain only business logic.

This pattern is called a **cross-cutting concern** — something that cuts across many layers and many classes but has nothing to do with any single class's business purpose. Logging, security, transactions, caching, retry logic — all of these are cross-cutting concerns that AOP handles cleanly.

Spring itself uses AOP internally for `@Transactional`, Spring Security, `@Cacheable`, and `@Async`.

---

## 3. How It Works Internally

### The Mental Model
Think of a security checkpoint at a building entrance. Every person (method call) must go through the checkpoint. The people inside (your actual methods) do not know about the checkpoint — they just do their work. The checkpoint runs extra logic before (ID check), during (scan), and after (log exit). If you sneak into the building through a back door (calling a method directly on `this`), you bypass the checkpoint entirely.

### The Mechanism — Step by Step

1. **Aspect class registered** — You annotate a class with `@Aspect` and `@Component`. Spring registers it as a bean. A special `AnnotationAwareAspectJAutoProxyCreator` BeanPostProcessor detects it.

2. **Proxy creation** — When Spring creates any bean, this BeanPostProcessor checks: does any `@Aspect` pointcut match this bean's methods? If yes, Spring creates a **proxy** to wrap the bean.

3. **Two proxy strategies:**
   - **JDK Dynamic Proxy**: used when the bean implements an interface. The proxy implements the same interface. Callers use the interface type.
   - **CGLIB Proxy**: used when the bean does NOT implement an interface (or when `proxyTargetClass=true` is set). Spring creates a subclass of your class at runtime using CGLIB bytecode generation.

4. **The original bean is replaced** — The proxy takes the place of your original bean in the Spring context. When someone injects `OrderService`, they get the proxy, not the original.

5. **Method call intercept** — When a method is called on the proxy, the proxy checks: what advice is registered for this method? It runs them in order: `@Around` advice takes control first, then `@Before`, then the actual method, then `@After`/`@AfterReturning`/`@AfterThrowing`.

6. **The `this` call problem** — Inside your bean class, `this` refers to the original object, NOT the proxy. Calling `this.anotherMethod()` skips the proxy entirely. If `anotherMethod()` is `@Transactional` or has AOP advice, that advice will NOT run. This is the most common Spring AOP bug.

### Advice Types

| Advice | When it runs | Common use |
|--------|-------------|------------|
| `@Before` | Before the method executes | Auth check, input validation logging |
| `@After` | After the method always (success OR exception) | Audit trail |
| `@AfterReturning` | Only after successful return | Log result, update cache |
| `@AfterThrowing` | Only after an exception | Alert, rollback non-Spring resources |
| `@Around` | Full control — wraps entire method | Timing, retry, circuit breaker |

### Pointcut Expressions

```
execution(* com.myapp.service.*.*(..))
 |          |  |              |   |
 |          |  |              |   └── any parameters
 |          |  |              └── any method name
 |          |  └── any class in service package
 |          └── any return type
 └── execution: match method execution
```

Common patterns:
- `execution(* *.*(..))` — all methods everywhere
- `@annotation(org.springframework.transaction.annotation.Transactional)` — methods with `@Transactional`
- `@within(org.springframework.stereotype.Service)` — all methods in `@Service` classes
- `bean(orderService)` — methods on the `orderService` bean

### ASCII Diagram

```
WITHOUT AOP
──────────────────────────────────────────────────────
  Client → OrderService.createOrder()
               |
               └── {logging code}
               └── {auth code}
               └── {business logic}  ← buried in boilerplate
               └── {audit code}

WITH AOP (Proxy Pattern)
──────────────────────────────────────────────────────
  Client → OrderServiceProxy (CGLIB subclass)
               |
               ├── @Before LoggingAspect  ← runs first
               ├── @Before AuthAspect     ← runs second
               |       |
               |   OrderService.createOrder()  ← original method — pure business logic
               |       |
               ├── @AfterReturning AuditAspect ← runs on success
               └── @AfterThrowing ErrorAspect  ← runs on exception

Inside OrderService class:
  this.helper()  ← calls ORIGINAL object, bypasses proxy — NO AOP advice runs
──────────────────────────────────────────────────────
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Adding cross-cutting concerns directly in business methods
@Service
public class OrderService {

    public Order createOrder(OrderRequest request) {
        // This is NOT business logic — it is a cross-cutting concern
        long start = System.currentTimeMillis();
        log.info("Starting createOrder for user {}", request.getUserId());

        // Another cross-cutting concern — should not be in business code
        if (!securityContext.hasRole("ORDER_CREATE")) {
            throw new AccessDeniedException("No permission");
        }

        // ACTUAL business logic — buried after boilerplate
        Order order = new Order(request);
        orderRepository.save(order);

        // More cross-cutting boilerplate
        log.info("createOrder took {}ms", System.currentTimeMillis() - start);
        auditService.record("ORDER_CREATED", order.getId(), request.getUserId());

        return order;
    }

    // Now multiply this boilerplate across 50 methods
    // Every time logging format changes — update 50 methods
}
```
> **Why this fails in production:** Cross-cutting concerns mixed with business logic violates Single Responsibility Principle. When the audit format changes (happens every compliance cycle), you update 50 methods. When you add rate limiting, you add it to 50 methods. One missed method causes a bug.

### Right Way — Production Quality
```java
// Pure business logic — no logging, no auth check, no timing code
@Service
public class OrderService {

    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    public Order createOrder(OrderRequest request) {
        // ONLY business logic here
        Order order = new Order(request);
        validateInventory(order);
        return orderRepository.save(order);
    }

    public Order getOrder(Long id) {
        return orderRepository.findById(id)
            .orElseThrow(() -> new OrderNotFoundException(id));
    }
}
```

```java
// The Aspect — holds all cross-cutting logic separately
@Aspect   // marks this as an AOP aspect — Spring reads pointcuts and advice from it
@Component // makes it a Spring bean — required for Spring to find and register it
@Slf4j
public class ServiceMonitoringAspect {

    // @Around gives you full control — you can decide to call the method, not call it,
    // change the arguments, change the return value, or catch exceptions
    @Around("within(@org.springframework.stereotype.Service *)")
    // "within(@Service *)" means: any method inside any class annotated with @Service
    public Object measureExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {

        String methodName = joinPoint.getSignature().toShortString();
        long start = System.currentTimeMillis();

        try {
            // proceed() calls the actual method — without this, the method never runs
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - start;

            log.info("[PERF] {} completed in {}ms", methodName, duration);
            return result;

        } catch (Exception ex) {
            long duration = System.currentTimeMillis() - start;
            log.error("[PERF] {} FAILED after {}ms — {}", methodName, duration, ex.getMessage());
            throw ex; // re-throw — do not swallow exceptions in @Around advice
        }
    }
}
```

```java
@Aspect
@Component
@Slf4j
public class AuditAspect {

    private final AuditService auditService;

    public AuditAspect(AuditService auditService) {
        this.auditService = auditService;
    }

    // @Before runs before the target method — good for auth checks, validation logging
    // Note: if this throws, the target method never runs
    @Before("execution(* com.myapp.service.OrderService.createOrder(..))")
    // This pointcut matches ONLY createOrder in OrderService — very specific
    public void auditOrderCreation(JoinPoint joinPoint) {
        // JoinPoint gives you access to method args, target object, method name
        Object[] args = joinPoint.getArgs();
        log.info("[AUDIT] createOrder called with args: {}", Arrays.toString(args));
    }

    // @AfterReturning — runs only on successful return, gives you the returned value
    @AfterReturning(
        pointcut = "execution(* com.myapp.service.OrderService.createOrder(..))",
        returning = "order"  // bind return value to this parameter name
    )
    public void auditSuccessfulOrder(JoinPoint joinPoint, Order order) {
        // 'order' is the actual returned value — you can read it here
        auditService.record(AuditEvent.ORDER_CREATED, order.getId());
    }

    // @AfterThrowing — runs only when an exception is thrown
    @AfterThrowing(
        pointcut = "execution(* com.myapp.service.OrderService.*(..))",
        throwing = "ex"  // bind the exception to this parameter name
    )
    public void auditOrderFailure(JoinPoint joinPoint, Exception ex) {
        log.error("[AUDIT] {} threw {}: {}",
            joinPoint.getSignature().getName(),
            ex.getClass().getSimpleName(),
            ex.getMessage());
        auditService.recordFailure(joinPoint.getSignature().getName(), ex);
    }
}
```

### Configuration (if applicable)
```yaml
# application.yml
spring:
  aop:
    # proxy-target-class: true forces CGLIB proxying even for classes with interfaces
    # true = always CGLIB subclass proxy
    # false (default) = JDK proxy for interfaces, CGLIB for classes without interface
    proxy-target-class: true
    # auto: true means Spring Boot automatically configures AOP based on classpath
    auto: true
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Spring AOP and what problem does it solve? Give a real example."

**Hruday's answer:**
> Spring AOP lets you add behaviour to methods without changing those methods. The "problem" it solves is called cross-cutting concerns — things like logging, authentication checks, performance monitoring, and transactions that apply across many classes but have nothing to do with any one class's business purpose.
>
> Real example: at Oracle, our REST API had 30+ endpoints that all needed request timing logs and audit trail recording. Without AOP, every method would have had 10 lines of boilerplate before the first real business logic. With AOP, we wrote one `@Aspect` class. It had a pointcut that targeted all `@Service` methods. Every service method got execution time logging with zero code changes to the service.
>
> Spring itself uses this internally — `@Transactional` is just an AOP aspect that Spring registers for you. `@Cacheable` is another. `@PreAuthorize` in Spring Security wraps your method in an auth check via AOP.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why does calling a @Transactional method from within the same class not start a transaction? How do you fix it?"

**Hruday's answer:**
> This is a spring AOP proxy issue and it catches a lot of experienced developers.
>
> When Spring sees `@Transactional` on a method, it creates a CGLIB proxy around the bean. The proxy is what starts and commits the transaction. When external code calls `orderService.createOrder()`, it calls the PROXY — the proxy starts the transaction, calls the real method, and commits.
>
> But when code INSIDE `OrderService` calls `this.createOrder()`, `this` refers to the ORIGINAL object, not the proxy. The call goes directly to the real method without passing through the proxy — no transaction is started.
>
> There are three fixes. The cleanest: restructure the code so `@Transactional` methods are only called from outside the class — move them to a separate service. Second: inject the proxy into itself using `@Autowired OrderService self` and call `self.createOrder()`. Third: use `AopContext.currentProxy()` to get the proxy — but this couples your code to Spring's AOP internals, which is ugly.
>
> The correct long-term fix is always the first one: if a method needs a transaction, it should be called through the proxy — i.e., from another bean.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT use Spring AOP? What are its limitations?"

**Hruday's answer:**
> Spring AOP has three important limitations to know.
>
> First: it only works on Spring-managed beans. Plain Java objects created with `new` have no proxy, so AOP advice never runs on them.
>
> Second: it only intercepts method calls — not field access, not constructors. If your concern involves reading a field directly, AOP cannot intercept that.
>
> Third: the proxy problem for same-class calls. Internal `this.method()` calls bypass the proxy. If you need ALL method calls intercepted including internal ones, use AspectJ's full weaving mode (compile-time or load-time weaving), not Spring AOP.
>
> When would I not use AOP? For very fine-grained, performance-critical hot paths. AOP proxies add a small overhead per call — method interception via reflection. In a tight loop calling a method 1 million times, you would measure that overhead. For batch data processing that calls a repository method in a loop, disable AOP or pull the data in bulk outside the loop instead.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design an audit logging system for a financial service using AOP. Every create/update/delete operation must be logged with method name, user, timestamp, and input data."

**Hruday's answer:**
> I would design three components.
>
> First, a custom annotation `@Auditable` that I place on every method that needs auditing. This is more precise than matching by naming convention — some methods with create/update in the name might not need auditing.
>
> Second, the `@Aspect` class with an `@Around` advice that matches `@annotation(Auditable)`. Inside the advice: get the current user from Spring Security's `SecurityContextHolder`, capture method name and arguments from `JoinPoint`, record start time, call `joinPoint.proceed()`, capture return value or exception, and write all of this to an `AuditLog` entity via the audit repository.
>
> Third, make audit logging async. The audit write should not be in the critical path — if the audit DB is slow, it should not slow down the order creation. I would publish an event to an internal queue and save asynchronously with `@Async`.
>
> One important detail: for financial operations, capture the BEFORE state and AFTER state in updates. Passing `@EnableAsync` and making the audit write fire-and-forget means the main transaction commits first and the audit log catches up shortly after. If the audit write fails, a separate retry mechanism picks it up — this is effectively an outbox-lite pattern for audit events.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "AOP works on all methods calls" | "Yes, any method" | "No. Spring AOP only intercepts methods called through the Spring proxy — i.e., called from outside the class. Calling this.method() inside the same class bypasses the proxy. This is why @Transactional breaks when called from within the same class." |
| "CGLIB vs JDK proxy" | "They do the same thing" | "JDK proxy requires an interface — it creates a proxy implementing that interface. CGLIB creates a subclass of the target class using bytecode — no interface needed. CGLIB cannot proxy final classes or final methods because it cannot subclass them." |
| "@Before, @After, @Around difference" | "@Around is the most powerful — use it always" | "@Around is the most powerful but also the most error-prone. You MUST call joinPoint.proceed() inside @Around or the actual method never runs. For simple pre/post logic, @Before and @AfterReturning are clearer and safer." |
| "Pointcut expressions" | "execution(* *.*(..)) matches everything" | "Yes, but it is too broad — it matches Spring internal methods too. Always scope pointcuts tightly: target your own packages, your own annotations, or specific bean names. A too-broad pointcut on all beans causes overhead and unexpected behaviour." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we needed to add execution time monitoring to all our REST service methods to meet a contractual SLA. The naive approach was adding `System.currentTimeMillis()` calls to 40+ service methods. Instead, I wrote a single `@Aspect` with an `@Around` advice targeting `@within(Service)`. It auto-applied to all existing and future service methods. When we added 10 new endpoints in the next sprint, they got monitoring for free. That one aspect file saved probably 3-4 person-hours of repetitive work and made every future code review simpler — services had no boilerplate."

---

## 8. Scale Evolution

**1,000 users →** AOP is perfect at this scale. Log every method, audit every call. Overhead is negligible. The productivity gain from clean service code is large.

**100,000 users →** Revisit your pointcut scope. A too-broad pointcut (`execution(* *.*(..))`) intercepts every method including Spring internals. Profile your app — check how much time is in AOP proxy invocations. Scope pointcuts tightly to your own packages. Consider `@Async` for audit logging so audit writes do not slow down the API response path.

**10 million users →** At this scale, AOP proxies can add measurable overhead in hot paths. For performance-critical operations (payment processing, real-time feed generation), consider: (1) disabling AOP for specific beans using `@EnableAspectJAutoProxy(proxyTargetClass=true)` with selective exclusions, (2) compile-time weaving with AspectJ for zero-overhead interception, (3) replacing `@Transactional` with explicit transaction management in the hottest paths. For monitoring, prefer metrics aggregation (Micrometer + Prometheus) over per-method logging — aggregate, not per-call.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every financial transaction must have a complete, tamper-proof audit trail. AOP is the standard tool for this — write one aspect, cover all transaction methods. | "How would you add audit logging to 100+ payment APIs without modifying service code?" |
| Swiggy / Meesho | High-scale order processing. They use AOP for distributed tracing (adding correlation IDs to all log lines), retry logic, and circuit breaker triggering. | "Walk me through how you would add retry logic to all external HTTP calls in a Spring Boot service." |
| Adobe / Microsoft | Enterprise frameworks. Spring AOP is part of their internal platform. They care about pointcut precision, proxy types, and the self-call proxy bypass issue. | "What happens when a @Cacheable method calls another @Cacheable method in the same class?" (Answer: inner call misses cache due to proxy bypass.) |
| Remote / Global roles | Building shared platform libraries. AOP lets library authors add cross-cutting behaviour (logging, tracing, auth) to client services without requiring them to add boilerplate. | "How would you build a shared observability library that auto-instruments any Spring Boot service that includes it?" |

---

## 10. Related Topics — What to Study Next

- **Topic 44 — @Transactional Internals** — `@Transactional` IS an AOP aspect internally — this is the most important real-world application of Spring AOP. Understanding proxies here is essential
- **Topic 39 — Stereotype Annotations** — AOP pointcuts target stereotypes (`@within(Service)`) — knowing what `@Service` means makes pointcut expressions more precise
- **Topic 43 — Filters vs Interceptors vs AOP** — these three mechanisms all add behaviour to request handling — knowing when AOP is the right choice (vs a Servlet Filter) requires comparing them
- **Topic 51 — Spring Security Filter Chain** — Spring Security uses AOP (`@PreAuthorize`) in combination with its filter chain — two different interception mechanisms with different scopes
- **Topic 37 — IoC Container Internals** — AOP proxies are created by `BeanPostProcessor` during bean lifecycle — understanding the container lifecycle explains when and how proxies are woven

---

*Part 3 · Spring AOP · Full Stack Interview Guide · Hruday D · 2026*
