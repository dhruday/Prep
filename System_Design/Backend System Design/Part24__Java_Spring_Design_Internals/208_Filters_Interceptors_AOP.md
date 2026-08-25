# 208. Filters vs Interceptors vs AOP

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

Spring provides three distinct mechanisms for injecting **cross-cutting concerns** (logging, authentication, timing, validation) into the request/response pipeline. Each operates at a different layer with different capabilities and trade-offs.

| Mechanism | Level | Who Processes | When to Use |
|---|---|---|---|
| **Filter** (Servlet) | HTTP / Servlet | Servlet Container (Tomcat) | Raw request/response bytes, security, CORS, rate limiting |
| **Interceptor** (Spring MVC) | Controller / Spring MVC | Spring DispatcherServlet | Spring-aware business cross-cutting (audit, access control by role) |
| **AOP** (`@Aspect`) | Bean method | Spring Proxy mechanism | Service-layer concerns (caching, retry, transaction, timing) |

**What they all share:** They let you add behavior to existing code without modifying it — the Open/Closed Principle applied to the request pipeline.

**Why understanding the difference matters:**
- Placing auth logic in an interceptor instead of a filter creates a security gap (non-controller URL paths bypass interceptors)
- Placing DB transaction management in an interceptor instead of `@Transactional` (AOP) loses Spring transaction propagation semantics
- Placing method timing in a filter is too coarse — a filter times the entire request including serialization

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Filters (Servlet Level)

**Position:** Before `DispatcherServlet` — first in the request pipeline; last on the way out.

**Capabilities:**
- Read and modify raw `HttpServletRequest` / `HttpServletResponse`
- Wrap request/response streams (e.g., to buffer body for logging)
- Short-circuit the request (send response without calling the chain)
- No access to Spring beans via class fields (unless also a Spring component)

**What they CANNOT do:**
- Access `HandlerMethod` or controller metadata (no knowledge of which endpoint will be called)
- Participate in Spring's `@Transactional` or other AOP proxies

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE) // Runs first
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse res,
                                     FilterChain chain) throws IOException, ServletException {
        long start = System.currentTimeMillis();
        try {
            chain.doFilter(request, res);           // Proceed
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            log.info("{} {} → {} ({}ms)",
                request.getMethod(), request.getRequestURI(),
                res.getStatus(), elapsed);
        }
    }
}
```

---

### Interceptors (Spring MVC Level)

**Position:** Inside Spring `DispatcherServlet`, before/after the controller executes.

**Capabilities:**
- Access `HandlerMethod` — can read controller annotations (`@PreAuthorize`, `@RateLimit`)
- Access `ModelAndView` in `postHandle()`
- Access the exception that occurred in `afterCompletion()`
- Full Spring bean injection

**What they CANNOT do:**
- Apply to requests that bypass DispatcherServlet (e.g., static resources served by a different servlet, or paths matched before Spring)
- Wrap method invocations — they fire around the Controller call, not arbitrary service methods

```java
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    @Autowired
    RateLimiterService rateLimiterService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                              Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod)) return true; // Static resources, skip

        HandlerMethod handlerMethod = (HandlerMethod) handler;
        RateLimit annotation = handlerMethod.getMethodAnnotation(RateLimit.class);
        if (annotation != null) {
            String userId = resolveUserId(request);
            if (!rateLimiterService.isAllowed(userId, annotation.limit())) {
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                return false; // Short-circuit
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                 Object handler, Exception ex) {
        // Cleanup per-request state
        MDC.remove("userId");
    }
}
```

---

### AOP (Spring Proxy Level)

**Position:** Wraps any Spring-managed bean method — applies anywhere in the application, not just the web layer.

**Capabilities:**
- Target any public method on any Spring bean
- Full access to method arguments, return value, exception
- Compose multiple aspects on the same method with `@Order`
- Apply to service, repository, component, or controller layers

**How it works — Proxy-based:**
Spring wraps the target bean in a JDK dynamic proxy (interface-based) or CGLIB proxy (class-based). When a method is called, Spring calls advice code (before/after/around the actual method).

```
Client → Spring Proxy (wraps bean)
              ├── @Before advice (runs first)
              ├── Target Method (actual method body)
              ├── @AfterReturning advice (runs on success)
              ├── @AfterThrowing advice (runs on exception)
              └── @After advice (always runs)
```

```java
@Aspect
@Component
public class TimingAspect {

    // Pointcut: any method in service layer
    @Around("execution(* com.example.service.*.*(..))")
    public Object measureTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long start = System.nanoTime();
        try {
            return joinPoint.proceed(); // Execute the actual method
        } finally {
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;
            log.info("{} took {}ms", joinPoint.getSignature().getName(), elapsedMs);
        }
    }
}
```

---

### AOP Pointcut Expressions

```java
// All methods in com.example.service package
execution(* com.example.service.*.*(..))

// Methods annotated with @Transactional
@annotation(org.springframework.transaction.annotation.Transactional)

// Methods named "save" in any class
execution(* *.save(..))

// Within a specific class
within(com.example.service.OrderService)

// Methods with a specific first argument type
execution(* *(com.example.model.Order, ..))
```

---

### AOP Advice Types

```java
@Aspect
@Component
public class SecurityAspect {

    @Before("@annotation(RequiresAdmin)")
    public void checkAdminRole(JoinPoint jp) {
        // Runs BEFORE the method; can throw exception to prevent execution
        if (!SecurityContextHolder.getContext().getAuthentication().getAuthorities()
                .contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
            throw new AccessDeniedException("Admin required");
        }
    }

    @AfterReturning(pointcut = "execution(* com.example.service.OrderService.createOrder(..))",
                    returning = "result")
    public void logOrderCreated(Object result) {
        // Runs AFTER successful return; receives the return value
        log.info("Order created: {}", result);
    }

    @AfterThrowing(pointcut = "within(com.example.service.*)", throwing = "ex")
    public void handleServiceException(Exception ex) {
        // Runs when an exception propagates out; for alerting/logging
        alerting.sendAlert(ex);
    }
}
```

---

### The Self-Invocation Problem (AOP Critical Gotcha)

AOP proxies intercept calls made **through the proxy**. Direct method calls within the same class bypass the proxy entirely.

```java
@Service
public class OrderService {

    @Transactional
    public void processOrder(Order order) {
        saveOrder(order);     // ❌ Direct call — bypasses @Transactional proxy!
    }

    @Transactional(propagation = REQUIRES_NEW)
    public void saveOrder(Order order) {  // This @Transactional is IGNORED on direct call
        repo.save(order);
    }
}

// ✅ Fix 1: Extract saveOrder into a separate service bean (best practice)
// ✅ Fix 2: Inject self (ApplicationContext.getBean) — ugly but works
// ✅ Fix 3: Use @Scope("prototype") — expensive; avoid
// ✅ Fix 4: AspectJ load-time weaving — compile-time AOP, no proxy limits
```

---

### Execution Order Diagram

```
HTTP Request
    │
    ▼
[Filter 1] ─────────────────────────── (outermost)
    │
[Filter 2]
    │
[DispatcherServlet]
    │
[HandlerInterceptor.preHandle()]
    │
[AOP @Around → @Before]
    │
[Controller Method] ←── actual invocation
    │
[AOP @AfterReturning / @AfterThrowing / @After]
    │
[HandlerInterceptor.postHandle()]
    │
[HandlerInterceptor.afterCompletion()]
    │
[Filter 2 after chain]
    │
[Filter 1 after chain] ──────────────── (outermost, last out)
    │
    ▼
HTTP Response
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

- Each additional Filter/Interceptor/AOP advice adds overhead — typically 1–5μs per lightweight advice
- For heavily-invoked methods (1M+ calls/sec), AOP method interception overhead should be benchmarked with JMH
- AOP proxies add one extra method dispatch per invoked bean method — CGLIB proxies are fast but create subclasses at startup (slight startup slowdown)

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

- AOP is the standard mechanism for `@Transactional` (Spring's transaction management aspect wraps service methods)
- DAOs and repositories should not be invoked through AOP aspects that also manage transactions — transaction propagation is defined at the `@Transactional` level
- Avoid database calls inside `@Before`/`@After` advice indiscriminately — adds latency to every intercepted method

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- **AOP for retry:** `@Retryable` (Spring Retry) uses AOP to retry failed service methods — transparent to callers
- **AOP for circuit breaker:** Resilience4j's `@CircuitBreaker` uses AOP proxy wrapping
- **Interceptor for per-request resource cleanup:** `afterCompletion()` runs even on exception — reliable teardown
- **Filter for request throttling:** Reject excess requests before any Spring processing to protect downstream resources

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- **Authentication/Authorization:** Spring Security implements these as Filters — correct! Not interceptors or AOP.
- `@PreAuthorize` and `@Secured` use AOP — fine for method-level security AFTER the user is authenticated at the filter level
- Be careful with AOP on `@RestController` methods: Spring Security AOP advice and your custom AOP advice can conflict in ordering — explicitly set `@Order`
- Input validation should happen via argument resolvers + `@Valid`, not via AOP — AOP comes too late for structured validation responses

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### Stripe: Request Idempotency in Filter
- Idempotency key is extracted from `Idempotency-Key` HTTP header
- This check happens in a Servlet Filter — before any business logic executes
- If key matches a previous request, the cached response is returned immediately, bypassing the entire Spring pipeline

### Amazon: Method Retry via AOP
- DynamoDB client retries use `@Retryable`-equivalent logic (AOP-based)
- The calling service code is oblivious to retry logic — it's injected transparently
- Retry with exponential backoff + jitter is defined in aspect advice, not in business code

### Auth0 + Spring Boot: JWT Validation
- JWT Bearer token validation is a Filter (`JwtAuthenticationFilter extends OncePerRequestFilter`)
- Sets `SecurityContext` so interceptors and AOP can rely on `@AuthenticationPrincipal`
- If validation happened in an Interceptor, static resource paths and health endpoints would be unguarded

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "Filters, interceptors, and AOP are three complementary mechanisms for cross-cutting concerns, each operating at a different layer. Filters are at the Servlet level — before Spring even sees the request — making them the right place for security, CORS, and rate limiting since they cover all URLs unconditionally. Interceptors are inside DispatcherServlet and have access to handler metadata like controller annotations, making them suitable for MVC-specific concerns like audit logging or role checks that need to inspect which endpoint is being called. AOP operates on any Spring bean method, making it ideal for service-layer concerns: transactions, caching, retries, and performance monitoring. The key pitfall with AOP is self-invocation — a direct internal method call bypasses the proxy, which is why `@Transactional` on a private or self-called method has no effect."

### Follow-Up Questions

1. **"Why must Spring Security use Filters instead of Interceptors?"** → Interceptors only apply to controller-mapped URLs handled by `DispatcherServlet`. Filters apply to ALL URLs, including static resources, actuator endpoints, and error pages.
2. **"What is the difference between JDK dynamic proxy and CGLIB proxy in Spring AOP?"** → JDK proxy requires the target to implement an interface; CGLIB creates a subclass. Spring auto-selects: with an interface → JDK proxy; without → CGLIB. `@EnableAspectJAutoProxy(proxyTargetClass=true)` forces CGLIB.
3. **"How do you fix the self-invocation problem?"** → Extract the inner method to a separate bean; or inject the service into itself via `ApplicationContext`; or use AspectJ compile-time weaving.
4. **"Can you have multiple aspects on the same method? How do they order?"** → Yes. Use `@Order(n)` on the `@Aspect` class — lower number runs the `@Around` advice outermost (first in, last out).

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### Decision Flowchart: Which mechanism to use?

```
Do you need to operate on raw HTTP bytes (headers/body streams)?
  YES → Filter

Is it HTTP/web-layer specific and needs Spring bean access?
  YES → HandlerInterceptor

Is it service/repository layer, NOT web-layer specific?
  YES → AOP (@Aspect)

Needs to apply cross-layer (controller + service + repo)?
  YES → AOP with appropriate pointcut
```

### Proxy Call Diagram

```
Caller
  │
  ▼
Spring Proxy (CGLIB or JDK)
  │
  ├── @Before advice (runs first)
  │
  ├── proceeds to → Target Object method (actual code)
  │
  ├── @AfterReturning / @AfterThrowing
  │
  └── returns to caller

Direct call within same class bypasses proxy entirely:
  Target.methodA() calling this.methodB() → hits real object, NOT proxy
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

**Why these distinctions exist:**
- Spring provides layered extension points: HTTP layer (Filter), MVC layer (Interceptor), Bean layer (AOP)
- Each layer has exactly the right amount of context for its purpose
- Misuse causes security gaps (auth in wrong layer), silent behavior loss (self-invocation), or incorrect scoping

**How to choose:**
- Filter: raw HTTP, security, any URL, pre-Spring
- Interceptor: MVC-specific, controller annotation inspection, per-request teardown
- AOP: service layer, business logic cross-cutting, retry/circuit breaker/transaction

**Key trade-offs:**
- Filters are the most reliable for catching all traffic
- Interceptors require the Spring context and DispatcherServlet to be in the path
- AOP is the most powerful (any method) but has the self-invocation limitation
