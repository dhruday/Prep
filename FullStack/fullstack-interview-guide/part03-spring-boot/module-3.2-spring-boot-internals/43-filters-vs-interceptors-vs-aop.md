# Filters vs Interceptors vs AOP — When to Use Which
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Filter** — Servlet level, runs before Spring MVC. Has raw `HttpServletRequest`/`Response`. Applies to ALL requests including static files. Use for auth, CORS, encoding.
- **HandlerInterceptor** — Spring MVC level, runs inside DispatcherServlet. Knows the handler (controller method). Applies only to DispatcherServlet-handled requests. Use for logging, audit, per-route auth.
- **AOP (@Around, @Before etc.)** — Spring bean level, wraps Spring bean method calls. No HTTP knowledge. Use for timing, transactions, retry, caching on service/repository methods.
- The key decision rule: **Filter** = HTTP layer, **Interceptor** = request routing layer, **AOP** = business logic layer
- Gap to bridge: Spring Security uses Filters, NOT Interceptors — security must run before Spring MVC routes the request

---

## 1. One-Line Definition
Filters run at the Servlet level before Spring sees the request, interceptors run inside Spring MVC's request handling pipeline, and AOP runs around Spring bean method calls — each intercepts at a different depth and serves a different purpose.

---

## 2. The Problem It Solves

You want to add three things to a Spring Boot app:
1. Parse a JWT from every HTTP request header and check if it is valid
2. Log the execution time of every API call, including which controller handled it
3. Log execution time of every service method, including method arguments

These three look similar — all add behaviour around existing code — but they need to sit at different levels:

- JWT parsing MUST run before Spring MVC routes the request. If it runs in an interceptor and the request somehow reaches the controller first, you have a security gap. Use a **Filter**.
- Logging the API call and controller name requires knowing which controller Spring chose. That information is only available inside DispatcherServlet's pipeline. Use an **Interceptor**.
- Logging service method calls has nothing to do with HTTP. The service does not know about requests. You want this to run when the service method is called, even if it is called from a Kafka consumer or a scheduler — not just from an HTTP request. Use **AOP**.

One mechanism cannot cleanly do all three. Understanding which tool fits which problem is the senior-level answer.

---

## 3. How It Works Internally

### The Mental Model
Think of a building. The Filter is the security guard at the front door — checks everyone before they enter the building. The Interceptor is the receptionist inside — knows which floor and which office the visitor is headed to, can send them upstairs or turn them back. AOP is the team lead in each office — adds behaviour (note-taking, time-tracking) to the work happening at each desk, completely unaware of how the person got to that desk.

### Execution Order

```
HTTP Request
    |
    v
[FILTER 1] → [FILTER 2] → [FILTER 3]           ← Servlet container level
                                |
                                v
                     [DispatcherServlet]
                                |
                     [INTERCEPTOR preHandle]     ← Spring MVC level
                                |
                     [HandlerAdapter]
                                |
              [AOP @Before]                      ← Spring bean level
                     |
              [YOUR METHOD]
                     |
              [AOP @AfterReturning]
                                |
                     [INTERCEPTOR postHandle]
                                |
                     [INTERCEPTOR afterCompletion]
    |
    v
HTTP Response
```

### Filter Details
- Part of the **Java Servlet API** — `javax.servlet.Filter` (or `jakarta.servlet.Filter` in Spring Boot 3)
- Registered with the Servlet container (Tomcat), not with Spring
- Runs for ALL requests: REST endpoints, static files, actuator endpoints, h2-console
- Has no knowledge of Spring beans, controller methods, or MVC routing
- Can read and modify request/response at the byte level
- Can set response and stop the chain: call `chain.doFilter()` to continue, skip it to stop

### HandlerInterceptor Details
- Part of **Spring MVC** — `org.springframework.web.servlet.HandlerInterceptor`
- Registered via `WebMvcConfigurer.addInterceptors()`
- Runs only for requests handled by `DispatcherServlet` — not for static resources
- Has access to the resolved `handler` object — the matched controller method — and its metadata
- Three methods: `preHandle()` (before controller), `postHandle()` (after controller, before response commit), `afterCompletion()` (always, for cleanup)
- `preHandle()` returns boolean — return false to stop the request

### AOP Details
- Part of **Spring AOP** — runs as proxy method interception on Spring beans
- Knows nothing about HTTP — it intercepts Java method calls
- Works on `@Service`, `@Repository`, `@Component`, `@Controller` beans equally
- Applies to: HTTP requests, Kafka consumer callbacks, scheduled tasks, any other caller
- Cannot intercept `private` methods or calls made via `this` inside the same class
- Most powerful (`@Around`) but also most overused — often a simpler alternative exists

---

## 4. The Code

### Wrong Way — Putting Auth in the Wrong Layer
```java
// WRONG: putting JWT authentication in a HandlerInterceptor
// Security MUST run in a Filter — before any Spring MVC processing
@Component
public class JwtInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String token = request.getHeader("Authorization");
        // PROBLEM 1: if any filter before this one already processed auth, this is redundant
        // PROBLEM 2: static resources, actuator endpoints, error pages bypass interceptors
        //            but may not bypass controllers — security gap
        // PROBLEM 3: Spring Security's filter already runs before this — conflict risk
        if (!jwtService.isValid(token)) {
            response.setStatus(401);
            return false;
        }
        return true;
    }
}
```
> **Why this fails in production:** Filters run before Interceptors. Spring Security's auth filter runs first. If it allows the request through (e.g., for a public path), your interceptor runs next — but for paths Spring Security blocks, your interceptor may never see the request. Mixing auth logic across both levels creates unpredictable behaviour. Auth belongs in Security Filter chain only.

### Right Way — Each Mechanism in Its Correct Layer

```java
// LAYER 1: Filter — auth, CORS, encoding
// This is a Servlet Filter — it runs before Spring MVC
@Component  // Spring Boot auto-registers @Component Filters via FilterRegistrationBean
@Order(1)   // run this filter early in the chain — lower number = earlier
public class CorrelationIdFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest request = (HttpServletRequest) req;

        // Extract correlation ID from header, or generate a new one if missing
        String correlationId = request.getHeader("X-Correlation-ID");
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        // MDC is a thread-local map — adding values here makes them appear in ALL log lines
        // on this thread automatically (requires %X{correlationId} in your log pattern)
        MDC.put("correlationId", correlationId);

        try {
            // MUST call chain.doFilter() — otherwise the request stops here
            chain.doFilter(req, res);
        } finally {
            // MUST remove from MDC — thread is returned to Tomcat's pool after this request
            // Without removal, the next request on this thread gets the old correlation ID
            MDC.remove("correlationId");
        }
    }
}
```

```java
// LAYER 2: HandlerInterceptor — request routing, handler info, per-route behaviour
// This knows WHICH controller handled the request
@Component
public class ApiAuditInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        if (handler instanceof HandlerMethod method) {
            // HandlerMethod gives you metadata about the controller method
            String controllerName = method.getBeanType().getSimpleName();
            String methodName = method.getMethod().getName();

            // Log with controller context — only possible in Interceptor, not in Filter
            log.info("[API] {} {}.{} started",
                request.getMethod(), controllerName, methodName);

            request.setAttribute("apiStart", System.currentTimeMillis());
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                               HttpServletResponse response,
                               Object handler,
                               Exception ex) {
        Long start = (Long) request.getAttribute("apiStart");
        if (start != null) {
            long duration = System.currentTimeMillis() - start;
            log.info("[API] {} {} → {}ms status={}",
                request.getMethod(),
                request.getRequestURI(),
                duration,
                response.getStatus());
        }
    }
}
```

```java
// LAYER 3: AOP — service/repository method behaviour
// This intercepts Java method calls on Spring beans — not HTTP-aware
@Aspect
@Component
@Slf4j
public class ServiceTimingAspect {

    // Matches ALL methods in ALL @Service-annotated classes
    // Runs for HTTP requests, Kafka consumers, scheduled tasks, tests — anything
    @Around("within(@org.springframework.stereotype.Service *)")
    public Object timeServiceMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        String methodName = joinPoint.getSignature().toShortString();
        long start = System.currentTimeMillis();

        try {
            Object result = joinPoint.proceed(); // call the real method
            log.debug("[SVC] {} → {}ms", methodName, System.currentTimeMillis() - start);
            return result;
        } catch (Throwable t) {
            log.error("[SVC] {} FAILED after {}ms", methodName, System.currentTimeMillis() - start);
            throw t;
        }
    }
}
```

### Decision Cheat Sheet
```
Decision Flow — which to use?
┌─────────────────────────────────────────────────────┐
│ Does it apply to static files / actuator too?       │
│   YES → Filter                                      │
│   NO → continue                                     │
│                                                     │
│ Does it need to know which controller method runs?  │
│   YES → HandlerInterceptor                          │
│   NO → continue                                     │
│                                                     │
│ Is it about business logic / method calls?          │
│   YES → AOP                                         │
│                                                     │
│ Examples:                                           │
│   Authentication      → Filter (Spring Security)   │
│   CORS                → Filter (CorsFilter)         │
│   Request logging     → Filter or Interceptor      │
│   Per-route auth      → Interceptor                 │
│   Audit trail         → Interceptor or AOP          │
│   @Transactional      → AOP (built-in)              │
│   Retry logic         → AOP                         │
│   Caching (@Cacheable)→ AOP (built-in)              │
└─────────────────────────────────────────────────────┘
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between a Filter and a HandlerInterceptor?"

**Hruday's answer:**
> Both intercept requests, but at different levels.
>
> A Filter is a Servlet API concept. It runs before `DispatcherServlet` even receives the request. It has access to the raw HTTP request and response. It runs for ALL requests — REST endpoints, static files, actuator endpoints, everything. Tomcat manages filters. You register them via `FilterRegistrationBean` or the `@Component` annotation.
>
> A `HandlerInterceptor` is a Spring MVC concept. It runs INSIDE `DispatcherServlet`'s processing pipeline — after the servlet has already started processing. It knows which controller method was matched (`HandlerMethod`). It only runs for requests that `DispatcherServlet` handles — static resources served directly by Tomcat skip interceptors.
>
> The practical rule: use Filters for anything that must run for every HTTP request at the protocol level — auth, CORS headers, request encoding, rate limiting. Use Interceptors for Spring MVC-specific concerns where you need handler metadata — request logging with controller name, per-route authorization checks.

---

### Q2 — Deep Dive
**Interviewer asks:** "You need to add request-level rate limiting — 100 requests per minute per IP. Where in the lifecycle do you put it? Justify your answer."

**Hruday's answer:**
> Rate limiting belongs in a **Filter**, not an Interceptor or AOP.
>
> Three reasons. First, rate limiting must apply to ALL requests — including static resources, health checks, and actuator endpoints. An Interceptor would miss requests that bypass DispatcherServlet.
>
> Second, rate limiting needs to reject requests early — before any business processing happens. Filters run before Spring MVC parses the request body, before authentication, before handler resolution. This means you reject a rate-limited request at the lowest possible cost.
>
> Third, a Filter can return a 429 Too Many Requests response by writing directly to `HttpServletResponse` and NOT calling `chain.doFilter()`. This is clean and well-understood Servlet behaviour.
>
> In practice, for production rate limiting you would use a Bucket4J library with a Redis backend (so limits are shared across multiple instances), wrapped in a `GenericFilterBean`. The filter reads the client IP, checks the Redis-backed rate counter, and either lets the request through or responds 429.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use AOP over a HandlerInterceptor for cross-cutting concerns?"

**Hruday's answer:**
> Use AOP when the concern applies to business logic that can be called from multiple entry points — not just HTTP requests.
>
> Example: execution time monitoring and slow method alerting. If `OrderService.createOrder()` is called from an HTTP endpoint, a Kafka consumer, and a scheduled batch job, putting timing in an Interceptor would miss the Kafka and batch calls. AOP covers all three entry points because it intercepts the method call, not the HTTP request.
>
> Example: `@Transactional` — Spring implements it as AOP. A transactional service method should start a transaction whether it is called from an HTTP controller or from a Kafka consumer. The transaction belongs to the service layer, not the HTTP layer.
>
> Use an Interceptor when: you need HTTP request/response context (headers, URL, status code), when the concern is specific to the web layer, or when you need to run BEFORE the method is even resolved (e.g., per-route access control based on the URL pattern).
>
> The simple rule: does your concern make sense if the app has no HTTP at all? If yes, use AOP. If it requires HTTP, use a Filter or Interceptor.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design an audit system that: (1) logs every API call with user and IP, (2) logs which service methods ran, (3) captures both for compliance reports. Where does each part live?"

**Hruday's answer:**
> I would build this in two layers.
>
> Layer 1 — Filter: extract the client IP and user identity at request entry. At this point, Spring Security has already run (its filter ran before mine), so `SecurityContextHolder` has the authenticated user. I write `{userId, ip, timestamp, method, path}` to an audit log. This captures ALL API calls including ones that fail authentication.
>
> Layer 2 — AOP: add `@Around` advice targeting `@Service` classes that have a custom `@Audited` annotation. Inside the advice, log the method name, arguments, result type, and duration. Link it to the HTTP request via the correlation ID already in MDC (set by the Filter). This captures the service-layer action trace.
>
> For compliance reports, both audit entries share the same correlation ID. The report queries: "for this API call, which service methods executed and what were their outcomes?"
>
> I would store audit entries asynchronously in an `audit_log` table (separate from the main DB) using `@Async` to avoid adding latency to the request. If the audit write fails, the main request is not affected — audit is observational, not transactional.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Use Interceptor for authentication" | "preHandle() is where I check the JWT" | "No. Authentication must be in a Filter (Spring Security's FilterSecurityInterceptor). Filters run before DispatcherServlet. Interceptors run after it, which means Spring MVC has already started processing. A missed auth check in an interceptor could allow partial request processing." |
| "AOP can intercept all methods" | "Yes, @Around on * matches everything" | "No. AOP only works on Spring-managed beans via proxies. It cannot intercept: private methods, methods called via this inside the same class, methods on non-Spring objects created with new, static methods, or final methods (with CGLIB proxying)." |
| "Filter vs Interceptor for CORS" | "Either works" | "Both work but Filter is the right place. CORS preflight (OPTIONS) requests need to be handled before any Spring MVC processing — Spring MVC might not have a handler for OPTIONS. Spring's CorsFilter handles preflight at the Filter level. WebMvcConfigurer.addCorsMappings() registers CORS via Interceptor — fine for simple cases, but Filter is safer." |
| "afterCompletion() vs postHandle()" | "They're the same" | "Different. postHandle() runs after the controller but BEFORE the response is written — you can still modify response headers. afterCompletion() runs AFTER the response is committed — you cannot change the response. Also: postHandle() does NOT run if the controller threw an exception. afterCompletion() ALWAYS runs — use it for cleanup and final logging." |

---

## 7. Hruday's Real Experience Hook

> "At SAP, we needed to add PII (personally identifiable information) masking to all API response logs — no customer names, emails, or IDs in plain text in log files. I initially put this in AOP — intercept service methods and mask the return values. But this missed responses that returned early from filters (auth failures, rate limits) or changed in the response body after the controller. Moving the masking logic to a custom `HttpServletResponseWrapper` inside a Filter gave us complete coverage — every byte written to the HTTP response went through the masking logic. That is a case where Filter was the only correct level."

---

## 8. Scale Evolution

**1,000 users →** One instance, all three mechanisms work independently. No contention. Filters, interceptors, and AOP all add <1ms overhead per request. No issues.

**100,000 users →** Audit logging volume grows. If your Filter or Interceptor writes to a database synchronously on every request, the DB becomes the bottleneck. Move audit writes to an async queue (`@Async` + an in-memory bounded queue + a background flusher). Accept eventual consistency for audit logs — slight delay is fine.

**10 million users →** Rate limiting in a Filter using local state (a single `ConcurrentHashMap` per instance) does not work — each instance has its own counter, so 10 instances each allow 100 requests = 1000 requests total. Move rate limit state to Redis. Use Bucket4J with a Redis backend. Each Filter instance reads from and writes to the shared Redis store. Network RTT for Redis reads adds ~1ms per request — acceptable for rate limiting, unacceptable for critical path operations.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | PCI DSS compliance requires complete audit trails. The right separation of concerns means compliance logging is reliable and comprehensive — no entry points missed. | "A payment request was processed but not logged in the audit system — how does that happen and how do you prevent it?" |
| Swiggy / Meesho | Rate limiting at API gateway level AND service level. Understanding which layer handles what helps design multi-layer rate limiting without conflicts. | "Design a rate limiting system where the API gateway limits by IP, but the service limits by user ID." |
| Adobe / Microsoft | Platform engineering teams building shared Spring Boot foundations. They decide which cross-cutting concerns go in filters, which in interceptors, and which in AOP for 100+ services. | "You are designing the standard logging setup for all microservices in the platform. What goes where?" |
| Remote / Global roles | System design interviews often start from "add feature X to an existing service" — knowing the right interception layer differentiates senior devs. | "Add throttling to a Spring Boot service without using a third-party library. Walk me through the implementation." |

---

## 10. Related Topics — What to Study Next

- **Topic 42 — Spring Boot Request Lifecycle** — the lifecycle is the foundation: knowing WHERE each mechanism runs in the lifecycle explains why you pick one over another
- **Topic 51 — Spring Security Filter Chain** — Spring Security is built entirely on Filters — this is the most production-critical use of the Filter mechanism
- **Topic 40 — Spring AOP** — deep dive into how AOP proxies work, the exact advice types, and the self-call proxy bypass problem
- **Topic 58 — Exception Handling (@ControllerAdvice)** — `@ControllerAdvice` is a Spring MVC concept that runs as part of the Interceptor/DispatcherServlet exception handling path
- **Topic 83 — Centralized Configuration Management** — cross-cutting concerns like audit log destination and rate limit thresholds are often driven by externalized config — how does that interact with Filters?

---

*Part 3 · Filters vs Interceptors vs AOP · Full Stack Interview Guide · Hruday D · 2026*
