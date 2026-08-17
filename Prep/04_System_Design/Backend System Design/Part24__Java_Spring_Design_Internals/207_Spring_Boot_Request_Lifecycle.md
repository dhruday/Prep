# 207. Spring Boot Request Lifecycle

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

The **Spring Boot request lifecycle** describes the complete journey of an HTTP request from the moment it arrives at the server to when the response is sent back. Understanding this pipeline is critical for diagnosing performance issues, placing cross-cutting logic (logging, auth, tracing) at the right layer, and configuring exception handling correctly.

**What it is:**
- A multi-stage processing pipeline involving the Servlet container (Tomcat/Jetty), Spring's `DispatcherServlet`, handler mapping, interceptors, argument resolvers, controller execution, and response writing
- Every Spring MVC request flows through the same pipeline

**Why it matters:**
- Knowing where each cross-cutting concern belongs (Filter vs Interceptor vs AOP) prevents duplicate logic, ordering bugs, and security gaps
- Response serialization, content negotiation, exception handling, and CORS processing all happen at specific stages — misplacing them causes subtle bugs
- Performance profiling requires knowing where in the pipeline time is spent

**Role in distributed systems:**
- This is the request path on a single node — the entry point before business logic executes
- Proper lifecycle understanding enables correct integration with observability tools, distributed tracing (Micrometer, OpenTelemetry), security (Spring Security filters), and request/response transformations

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Complete Lifecycle — Stage by Stage

```
HTTP Request
     │
     ▼
1. Tomcat (TCP accept, thread from pool assigned)
     │
     ▼
2. Servlet Filter Chain (javax/jakarta FilterChain)
   [Spring Security filter chain, MDC logging, CORS, GZIP]
     │
     ▼
3. DispatcherServlet.doDispatch()
     │
     ▼
4. HandlerMapping → resolves Handler (Controller method) + HandlerInterceptors
     │
     ▼
5. HandlerAdapter selected (RequestMappingHandlerAdapter for @RequestMapping)
     │
     ▼
6. HandlerInterceptor.preHandle()
     │
     ▼
7. Argument Resolvers (@RequestBody, @PathVariable, @RequestParam, Principal)
     │
     ▼
8. Controller method execution (@GetMapping/@PostMapping etc.)
     │
     ▼
9. Return value handler (@ResponseBody → HttpMessageConverter → serialize to JSON/XML)
     │
     ▼
10. HandlerInterceptor.postHandle()
     │
     ▼
11. ViewResolver (if MVC view; skipped for REST @ResponseBody)
     │
     ▼
12. HandlerInterceptor.afterCompletion() [always called, even on exception]
     │
     ▼
13. Response committed → sent back via Tomcat
```

---

### Stage 1: Tomcat Request Handling

- Tomcat maintains an `acceptor` thread + NIO `Poller` + worker threads from the thread pool
- Default worker thread pool: 200 threads (`server.tomcat.threads.max=200`)
- Each request is handled by one worker thread for its entire duration (thread-per-request model until virtual threads)
- `server.tomcat.accept-count=100` — queue for accepted connections waiting for a worker thread

```yaml
server:
  tomcat:
    threads:
      max: 200
      min-spare: 10
    accept-count: 100
    connection-timeout: 20000
```

---

### Stage 2: Servlet Filter Chain

Filters are Java Servlet standard — they run **before Spring context** is involved. This makes them appropriate for:
- Security (Spring Security's `DelegatingFilterProxy`)
- Request logging (Correlation ID, MDC setup)
- CORS headers
- Request/response compression
- Rate limiting

```java
@Component
@Order(1)
public class CorrelationIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res,
                                     FilterChain chain) throws IOException, ServletException {
        String correlationId = Optional.ofNullable(req.getHeader("X-Correlation-ID"))
                                       .orElse(UUID.randomUUID().toString());
        MDC.put("correlationId", correlationId);
        res.setHeader("X-Correlation-ID", correlationId);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear(); // Always clean up ThreadLocal!
        }
    }
}
```

---

### Stage 3–4: DispatcherServlet & HandlerMapping

`DispatcherServlet` is the **Front Controller** — every request enters the Spring MVC world here.

**HandlerMapping** resolves which controller method (handler) to invoke based on URL, HTTP method, headers, and params.

- `RequestMappingHandlerMapping` — processes `@RequestMapping`, `@GetMapping`, etc.
- `RouterFunctionMapping` — processes functional routing (WebFlux-style)
- Resolution result: `HandlerExecutionChain` (handler + applicable interceptors)

---

### Stage 6 & 10: HandlerInterceptors

Spring MVC interceptors run **inside** Spring context — they have access to Spring beans, handler metadata, and model/view.

```java
@Component
public class AuditInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                              Object handler) {
        // Runs BEFORE controller method
        // Return false to abort the request (e.g., authorization check)
        log.info("Request to: {}", request.getRequestURI());
        return true;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler, ModelAndView modelAndView) {
        // Runs AFTER controller method but BEFORE response committed
        // Can modify response headers, add data to model
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                 Object handler, Exception ex) {
        // Always runs — cleanup, timing, logging
        // Called even if exception was thrown
    }
}
```

Register interceptors:
```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    @Autowired
    AuditInterceptor auditInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(auditInterceptor)
                .addPathPatterns("/api/**")
                .excludePathPatterns("/api/health");
    }
}
```

---

### Stage 7: Argument Resolution

Before invoking the controller method, `RequestMappingHandlerAdapter` resolves each method parameter:
- `@RequestBody` → `HttpMessageConverter` (Jackson) deserializes JSON to POJO + `@Valid` triggers JSR-303 validation
- `@PathVariable` → extracted from URL path
- `@RequestParam` → query string / form data
- `@RequestHeader` → HTTP header value
- `Principal` → resolved from `SecurityContext`
- `HttpServletRequest/Response` → passed directly

**JSR-303 validation failure:** `MethodArgumentNotValidException` is thrown → caught by `@ExceptionHandler` or `@ControllerAdvice`.

---

### Stage 9: Response Writing & Content Negotiation

Spring uses `HttpMessageConverter` to serialize the response:
- `MappingJackson2HttpMessageConverter` for `application/json`
- `StringHttpMessageConverter` for `text/plain`
- Content type selected via `Accept` header and `produces` attribute on `@RequestMapping`

```java
@GetMapping(value = "/orders/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
public ResponseEntity<OrderDto> getOrder(@PathVariable Long id) {
    return ResponseEntity.ok(orderService.findById(id));
}
```

---

### Exception Handling in the Lifecycle

Exception resolution follows a specific order:
1. `@ExceptionHandler` in the **same controller** — handled first
2. `@ControllerAdvice` global exception handlers — second
3. `HandlerExceptionResolver` chain (final fallback)
4. Servlet container error handling (`/error` endpoint)

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

**Throughput bottleneck model:**
```
Max RPS = Tomcat thread count / Average request duration
200 threads / 50ms = 4,000 RPS maximum

If average request takes 200ms (slow DB):
200 threads / 200ms = 1,000 RPS maximum → reduce DB time or scale horizontally
```

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

- Request lifecycle does not own data storage — data access happens in service layer
- Thread-local state (MDC, SecurityContext, TransactionSynchronization) is request-scoped and must be cleaned up in `afterCompletion()` or `finally` blocks
- `@RequestScope` beans are instantiated per-request and destroyed when thread returns to pool

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- **Thread pool exhaustion:** 200 Tomcat threads all blocked on slow I/O → 503s. Mitigation: timeout all downstream calls, circuit breaker
- **Filter ordering matters:** Spring Security must run before business logic filters — `@Order` or SecurityFilterChain ordering
- **Exception in `preHandle()`:** If interceptor throws, `afterCompletion()` is NOT called for that interceptor — put cleanup in try-finally within the interceptor itself
- **Async requests:** `DeferredResult` and `WebAsyncTask` release the Tomcat thread while waiting — allows higher concurrency with fewer threads

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- Spring Security filter chain runs at stage 2 (Filter level) — before any Spring MVC logic
- Security context is stored in `SecurityContextHolder` (ThreadLocal) — available to entire request thread
- CSRF, CORS, and authentication checks must occur in filters (before DispatcherServlet) to protect ALL resources, not just controller-mapped paths
- For REST APIs, disable session creation: `http.sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)`

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### GitHub: Dynamic Rate Limiting via Filters
- GitHub implements rate limiting at the Servlet Filter level (before controller)
- This ensures even malformed requests or non-existent endpoints count against rate limit
- Reason: if placed at interceptor level, load from 404s wouldn't count

### Observability: Distributed Tracing in Filters
- Filters set up OpenTelemetry `TraceId` and `SpanId` from incoming headers
- MDC context is populated once in the filter, available to all log statements downstream
- Cleaned up in `finally` block after chain completes

### Content Negotiation: Media Type Priority
- Client sends `Accept: application/xml, application/json;q=0.9`
- Spring tries XML converter first; if registered, returns XML response
- Configuration error (registering XML converter) breaks clients expecting JSON

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "A Spring Boot request starts at Tomcat, which assigns a worker thread from its pool. The request then flows through the Servlet Filter chain — this is where Spring Security, correlation ID logging, and CORS are processed. After filters, the request reaches `DispatcherServlet`, which uses `HandlerMapping` to resolve the controller method and the applicable interceptors. Interceptor `preHandle()` runs next — useful for authorization checks that need Spring context. Then argument resolution occurs: `@RequestBody` is deserialized via Jackson, `@Valid` triggers validation. The controller method executes. On the way out, the return value is serialized via `HttpMessageConverter`, `postHandle()` runs, and finally `afterCompletion()` runs unconditionally for cleanup like MDC clearing."

### Follow-Up Questions

1. **"Where does Spring Security fit in the lifecycle?"** → Servlet Filter level (stage 2), before DispatcherServlet. This is why Spring Security protects all URLs, not just controller-mapped ones.
2. **"When would you choose a Filter vs Interceptor?"** → Filter when access to raw request/response bytes is needed, or for security concerns that must cover all resources. Interceptor when you need Spring beans, handler metadata, or want to narrow the scope to specific URL patterns.
3. **"What is `OncePerRequestFilter`?"** → A Spring base class ensuring a filter executes exactly once per request, even if async dispatch mechanisms would otherwise trigger it multiple times.
4. **"How does `@RequestBody` validation work?"** → Jackson deserializes the JSON body first; then if `@Valid` is present, Hibernate Validator runs JSR-303 constraints on the resulting POJO. If validation fails, `MethodArgumentNotValidException` is thrown.

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

```
[Tomcat]────Thread Assigned────►[Filter Chain]
                                      │
                             [Spring Security]
                             [Correlation ID Filter]
                             [CORS Filter]
                                      │
                             [DispatcherServlet]
                                      │
                             [HandlerMapping]
                             → resolves Handler + Interceptors
                                      │
                             [Interceptor.preHandle()]
                                      │
                             [ArgumentResolver]
                             → deserialize @RequestBody
                             → validate @Valid
                                      │
                             [Controller Method]
                                      │
                             [ReturnValueHandler]
                             → serialize with Jackson
                                      │
                             [Interceptor.postHandle()]
                                      │
                             [ViewResolver] (skip for REST)
                                      │
                             [Interceptor.afterCompletion()]
                                      │
                             [Response → Tomcat → Client]
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

**Why this matters:**
- Misplacing cross-cutting logic (auth in interceptor vs filter) can create security gaps
- Understanding lifecycle stages is essential for debugging unexpected behavior (e.g., `afterCompletion` not called, security filter bypassed)
- Lifecycle bottlenecks (thread pool exhaustion, slow argument resolution) directly affect service throughput

**How the lifecycle works:**
- Tomcat → Filters → DispatcherServlet → HandlerMapping → Interceptors → Argument Resolvers → Controller → Response Writing → Interceptors out → Response sent
- Each stage is specialized: Filters for raw HTTP; Interceptors for Spring logic; AOP for method-level concerns
- All stages share the same thread; ThreadLocal state set in any stage is available in later stages

**Key rules:**
- Security must be at Filter level (before DispatcherServlet)
- Cleanup code goes in `afterCompletion()` or filter `finally` blocks
- ThreadLocal state must always be cleared to prevent cross-request pollution in thread pool environments
