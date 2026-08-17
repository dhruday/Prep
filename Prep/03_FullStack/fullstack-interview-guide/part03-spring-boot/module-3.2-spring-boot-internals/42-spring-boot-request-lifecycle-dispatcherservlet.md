# Spring Boot Request Lifecycle — DispatcherServlet Flow
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Every HTTP request in Spring MVC goes through: **Servlet Container → Filters → DispatcherServlet → HandlerMapping → HandlerAdapter → Your Controller → ViewResolver/MessageConverter → Response**
- `DispatcherServlet` is the single front controller — it receives ALL requests and delegates them to the right handler
- `HandlerMapping` is what maps a URL to a controller method — `RequestMappingHandlerMapping` reads your `@GetMapping`, `@PostMapping` annotations
- `HandlerAdapter` is the bridge that actually invokes your controller method — `RequestMappingHandlerAdapter` handles `@RequestMapping` methods
- `HttpMessageConverter` (e.g., `MappingJackson2HttpMessageConverter`) converts your returned object to JSON in the response body
- Gap to bridge: knowing that `@ResponseBody` (or `@RestController`) tells the adapter to use `HttpMessageConverter` instead of a view resolver — this is why removing `@RestController` breaks JSON responses

---

## 1. One-Line Definition
When an HTTP request hits a Spring Boot application, `DispatcherServlet` acts as the central traffic controller — it maps the request to the right handler method, invokes it, and converts the result to the right response format.

---

## 2. The Problem It Solves

Before Spring MVC, Java web apps used raw Servlets. Each endpoint was a separate Servlet class. Every Servlet had to: parse the URL, extract path variables, read the request body, call business logic, serialize the response, handle exceptions, and write the HTTP status code. Multiplied across 50 endpoints, you had 50 classes full of repetitive low-level HTTP plumbing.

Spring MVC solved this by centralising all the plumbing in `DispatcherServlet`. One class handles all incoming requests. It delegates the URL-to-method mapping to `HandlerMapping`. It delegates method invocation to `HandlerAdapter`. It delegates serialization to `HttpMessageConverter`. It delegates exception handling to `HandlerExceptionResolver`.

Your controller method does not know about HTTP at all — it receives Java objects (already deserialized from the request body) and returns Java objects (which get serialized to the response). All the HTTP plumbing is hidden.

The result: you write `public Order createOrder(@RequestBody OrderRequest request)` and Spring handles the rest.

---

## 3. How It Works Internally

### The Mental Model
Think of `DispatcherServlet` as the front desk at a large government office. Every visitor (HTTP request) walks in through the main door. The front desk looks at their request form (URL + HTTP method), checks the directory (HandlerMapping), sends them to the right desk (your controller), waits for the result, translates it to the official format (JSON/XML via HttpMessageConverter), and sends the response back. The individual desks (your controllers) do not manage visitors — they just do their job when they are called.

### The Mechanism — Step by Step

1. **Client sends HTTP request** — A browser, mobile app, or API client sends an HTTP request (e.g., `POST /api/orders`).

2. **Servlet Container receives it** — Embedded Tomcat (or Jetty/Undertow — Spring Boot embeds one by default) receives the raw TCP connection, parses the HTTP protocol, and creates `HttpServletRequest` and `HttpServletResponse` objects.

3. **Filter Chain runs** — Before reaching any Servlet, the request passes through registered `javax.servlet.Filter` objects. Spring Security's filter chain runs here. `CorsFilter`, `CharacterEncodingFilter`, `RequestContextFilter` also run here. Filters run outside Spring MVC — they have access to the raw Servlet request/response.

4. **DispatcherServlet receives the request** — After filters, the request reaches `DispatcherServlet`'s `service()` method, which delegates to `doDispatch()`.

5. **HandlerMapping lookup** — `DispatcherServlet` calls all registered `HandlerMapping` objects, asking "who handles this URL and HTTP method?" `RequestMappingHandlerMapping` scans all `@RequestMapping`, `@GetMapping`, etc. annotations on `@Controller` classes. It returns a `HandlerExecutionChain` — the matched controller method plus any `HandlerInterceptor` objects registered for this path.

6. **HandlerInterceptor preHandle()** — Any matching interceptors run their `preHandle()` method. If any interceptor returns `false`, the request stops here — the response is already written by the interceptor.

7. **HandlerAdapter invokes the controller** — `DispatcherServlet` passes the handler to `RequestMappingHandlerAdapter`. The adapter handles all the complexity: resolving `@PathVariable`, `@RequestParam`, `@RequestBody` (deserializing JSON → Java object), injecting `HttpServletRequest` if needed, checking `@Valid` annotations, and calling the actual method.

8. **Your controller method runs** — Your method runs and returns a result. If `@ResponseBody` is used (or `@RestController`), the return value is passed to `HttpMessageConverter`. If returning a view name string, it goes to `ViewResolver`.

9. **HttpMessageConverter serializes the response** — `MappingJackson2HttpMessageConverter` checks: "can I write this return type as JSON?" If yes, it uses Jackson to serialize your returned Java object to JSON bytes and writes them to the response. It also sets `Content-Type: application/json`.

10. **HandlerInterceptor postHandle() and afterCompletion()** — Interceptors run `postHandle()` (after controller, before response commit) and `afterCompletion()` (always, after response is written — for cleanup).

11. **Response sent to client** — Tomcat writes the HTTP response (status code, headers, body) back to the client.

### Error Path

If any exception escapes the controller, `DispatcherServlet` catches it and calls `HandlerExceptionResolver`. Spring's `ExceptionHandlerExceptionResolver` looks for `@ExceptionHandler` methods in `@ControllerAdvice` classes. If it finds one, it runs it and writes the error response. If no handler is found, a 500 error is sent.

### ASCII Diagram

```
HTTP Request: POST /api/orders  {body: {"productId":1,"qty":2}}
        |
        v
 ┌──────────────────┐
 │  Embedded Tomcat │  (parses HTTP, creates HttpServletRequest/Response)
 └──────────┬───────┘
            |
            v
 ┌──────────────────────────────┐
 │       Filter Chain           │  (SecurityFilter, CorsFilter, LogFilter...)
 └──────────┬───────────────────┘
            |
            v
 ┌──────────────────────────────┐
 │      DispatcherServlet       │  doDispatch()
 └──────────┬───────────────────┘
            |
     ┌──────▼──────────────────────────────────────┐
     │  1. HandlerMapping.getHandler()             │
     │     → RequestMappingHandlerMapping          │
     │     → finds: OrderController.createOrder() │
     │     → returns HandlerExecutionChain        │
     └──────┬──────────────────────────────────────┘
            |
     ┌──────▼──────────────────────────────────────┐
     │  2. HandlerInterceptor.preHandle()          │
     │     → AuthInterceptor, LogInterceptor...    │
     └──────┬──────────────────────────────────────┘
            |
     ┌──────▼──────────────────────────────────────┐
     │  3. HandlerAdapter.handle()                 │
     │     → RequestMappingHandlerAdapter          │
     │     → deserialize @RequestBody (Jackson)   │
     │     → validate @Valid (Hibernate Validator) │
     │     → call OrderController.createOrder()   │
     └──────┬──────────────────────────────────────┘
            |
     ┌──────▼──────────────────────────────────────┐
     │  4. YOUR Controller Method runs             │
     │     → return Order object                   │
     └──────┬──────────────────────────────────────┘
            |
     ┌──────▼──────────────────────────────────────┐
     │  5. HttpMessageConverter writes response    │
     │     → MappingJackson2HttpMessageConverter   │
     │     → serializes Order → JSON              │
     │     → sets Content-Type: application/json  │
     └──────┬──────────────────────────────────────┘
            |
            v
 ┌──────────────────────────────┐
 │  HandlerInterceptor cleanup  │  postHandle(), afterCompletion()
 └──────────┬───────────────────┘
            |
            v
 HTTP Response: 201 Created  {body: {"id":42,...}}
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Returning a response without @ResponseBody / @RestController
@Controller  // NOT @RestController
@RequestMapping("/api/orders")
public class OrderController {

    @PostMapping
    public Order createOrder(@RequestBody OrderRequest request) {
        // WRONG: without @ResponseBody, Spring treats "Order" as a view name
        // It tries to find a template named after the Order object type
        // You get a TemplateInputException or ViewResolutionException
        return orderService.createOrder(request);
    }
}
```
> **Why this fails in production:** Without `@ResponseBody` on the method (or `@RestController` on the class), Spring treats the return value as a logical view name (like a Thymeleaf template name). It tries to resolve it as a view and throws a `ViewResolutionException` because "com.myapp.Order" is not a valid template name.

### Right Way — Production Quality
```java
// @RestController = @Controller + @ResponseBody
// @ResponseBody tells HandlerAdapter: write the return value directly to response, skip view resolution
// MappingJackson2HttpMessageConverter converts the Java object to JSON
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // Spring resolves all these annotations before calling this method:
    // @Valid → runs Bean Validation on the request body before this method is called
    // @RequestBody → Jackson deserializes the JSON request body into OrderRequest
    // ResponseEntity → lets you control the HTTP status code explicitly
    @PostMapping
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest request) {
        Order order = orderService.createOrder(request);
        // 201 Created is more accurate than 200 OK for resource creation
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(OrderResponse.from(order));
    }

    // @PathVariable extracts {id} from the URL path
    @GetMapping("/{id}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long id) {
        return orderService.findById(id)
            .map(order -> ResponseEntity.ok(OrderResponse.from(order)))
            .orElse(ResponseEntity.notFound().build());
    }
}
```

```java
// HandlerInterceptor — runs in Spring MVC, after Filters, before/after controller
@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    // Runs BEFORE the controller method
    // Return true to continue, false to abort the request
    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) {
        // Store start time in request attribute — available in postHandle/afterCompletion
        request.setAttribute("startTime", System.currentTimeMillis());
        log.info("→ {} {}", request.getMethod(), request.getRequestURI());
        return true; // continue processing
    }

    // Runs AFTER controller, BEFORE response is written
    // 'modelAndView' is null for @RestController (no view model)
    @Override
    public void postHandle(HttpServletRequest request,
                          HttpServletResponse response,
                          Object handler,
                          ModelAndView modelAndView) {
        // can modify response headers here if needed
    }

    // ALWAYS runs — even if controller threw an exception — use for cleanup and final logging
    @Override
    public void afterCompletion(HttpServletRequest request,
                               HttpServletResponse response,
                               Object handler,
                               Exception ex) {
        long start = (Long) request.getAttribute("startTime");
        long duration = System.currentTimeMillis() - start;
        log.info("← {} {} → {}ms status={}", 
            request.getMethod(),
            request.getRequestURI(),
            duration,
            response.getStatus());
    }
}
```

```java
// Register the interceptor in WebMvcConfigurer
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final RequestLoggingInterceptor loggingInterceptor;

    public WebConfig(RequestLoggingInterceptor loggingInterceptor) {
        this.loggingInterceptor = loggingInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(loggingInterceptor)
            .addPathPatterns("/api/**")     // apply only to /api paths
            .excludePathPatterns("/api/health", "/actuator/**"); // skip health checks
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Walk me through what happens when a POST request hits a Spring Boot REST endpoint."

**Hruday's answer:**
> The request first hits the embedded Tomcat server, which parses the HTTP protocol and hands it to the registered Filters. Spring Security's filter chain runs here, checking authentication. Then the request reaches `DispatcherServlet`.
>
> `DispatcherServlet` asks its `HandlerMapping` — specifically `RequestMappingHandlerMapping` — which controller method handles this URL and HTTP method. The mapping was built at startup by scanning all `@RequestMapping`, `@PostMapping`, etc. annotations. It returns the matching method plus any registered interceptors.
>
> Interceptors run their `preHandle()` method. Then `RequestMappingHandlerAdapter` takes over. It resolves all method parameters — it reads `@RequestBody` and uses Jackson to deserialize the JSON request body into your `OrderRequest` object. If `@Valid` is present, it runs Bean Validation. Then it calls your controller method.
>
> Your method returns an `Order` object. Because the class has `@RestController` (which includes `@ResponseBody`), the adapter passes the return value to `MappingJackson2HttpMessageConverter`. It serializes the `Order` to JSON, writes it to the response body, and sets `Content-Type: application/json`. Tomcat writes the HTTP response back to the client.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the difference between a Filter and a HandlerInterceptor in Spring MVC? When do you use each?"

**Hruday's answer:**
> Both intercept requests but at different levels.
>
> Filters are part of the Servlet specification — they run completely outside Spring MVC, before `DispatcherServlet` is even involved. They have access to raw `HttpServletRequest` and `HttpServletResponse`. Because they run at the Servlet level, they apply to ALL requests — including static resources, actuator endpoints, and any other servlets. Spring Security's authentication filter runs here — it must run before Spring MVC can route the request.
>
> `HandlerInterceptor` is a Spring MVC concept — it runs inside `DispatcherServlet`'s request processing pipeline. It has access to the resolved handler (your controller method) and can get metadata about it. It runs only for requests that DispatcherServlet handles — not for static resources served directly by the container.
>
> Choose: Filter for authentication, CORS, encoding, rate limiting at the HTTP level — these need to run for every request before Spring processing. Interceptor for logging, audit trailing, per-controller auth checks, and anything that needs to know which handler was called. The key signal: do you need to know the handler method? Use Interceptor. Otherwise, a Filter is often simpler.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT use DispatcherServlet / Spring MVC for handling requests?"

**Hruday's answer:**
> Spring MVC and `DispatcherServlet` are built for the Servlet model — one thread per request. Each request blocks a thread until the response is written. This is fine for most APIs, but there are cases where it is the wrong tool.
>
> First: very high concurrency with slow downstream calls. If your handlers call a slow external API (200ms response time) and you have 1000 concurrent requests, you need 1000 threads. Spring MVC can handle this with a large thread pool, but Spring WebFlux (reactive) handles it with a small thread pool and non-blocking I/O — each thread can handle many requests while waiting for network calls.
>
> Second: WebSocket communication or server-sent events. While Spring MVC supports these, they sit awkwardly in the thread-per-request model. Spring WebFlux + Project Reactor is better suited for long-lived connections.
>
> Third: event-driven background processing. A Kafka consumer running inside a Spring Boot app is not using `DispatcherServlet` at all — it uses Spring Kafka's listener container. Using HTTP endpoints to receive events (hitting an endpoint per Kafka message) is an antipattern — message consumers should use the messaging infrastructure directly.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You need to add request tracing — every log message in any service call should include a correlation ID from the incoming request header. How do you implement this?"

**Hruday's answer:**
> The right place for this is a combination of Spring MVC's request lifecycle stages.
>
> First, I would write a `Filter` (not an Interceptor) to extract the correlation ID. Filters run before everything, so the ID is available everywhere including security checks. If the request has an `X-Correlation-ID` header, use it. If not, generate a new UUID. Store it in MDC — Mapped Diagnostic Context, which is a thread-local map used by SLF4J/Logback to add values to every log line automatically.
>
> `MDC.put("correlationId", correlationId)` — from this point on, every `log.info()` call on this thread includes the correlation ID automatically, as long as you add `%X{correlationId}` to your log pattern configuration.
>
> Critically, clear the MDC in a `finally` block — `MDC.remove("correlationId")` — otherwise it leaks to the next request on the same thread in a thread pool.
>
> For outgoing HTTP calls, add an `interceptor` to `RestTemplate` that reads from MDC and sets the `X-Correlation-ID` header on every outbound request. This propagates the ID to downstream services automatically.
>
> For async operations (`@Async`, CompletableFuture), MDC is thread-local so it does not propagate automatically. Use a custom `Executor` wrapped with `MDCTaskDecorator` to copy the MDC to the async thread.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "@RestController vs @Controller" | "@RestController is the newer, better version" | "@RestController = @Controller + @ResponseBody. The only difference is @ResponseBody applied to every method. @Controller without @ResponseBody is for server-side rendering (Thymeleaf, Freemarker) where methods return view names. For REST APIs, always @RestController." |
| "HandlerMapping vs HandlerAdapter" | "They're both about routing" | "Different jobs. HandlerMapping maps a request to a handler — it returns the method to call. HandlerAdapter invokes the handler — it knows how to call @RequestMapping methods, resolve all the parameters, run validation, and handle the return value. Separating these allows Spring MVC to support different handler types." |
| "Filters vs Interceptors for security" | "Either works" | "Auth must be in a Filter (before DispatcherServlet), not an Interceptor. If Spring Security's filter rejects a request, DispatcherServlet never runs. If you put auth in an Interceptor and a Filter already allowed a request through, you have a security gap because static resource requests don't go through Interceptors." |
| "Exception handling order" | "@ExceptionHandler on the controller handles all exceptions" | "@ExceptionHandler on a controller handles only exceptions from THAT controller. @ControllerAdvice handles exceptions from ALL controllers. Spring checks: controller-level @ExceptionHandler first, then @ControllerAdvice. If neither handles it, DefaultHandlerExceptionResolver handles standard Spring MVC exceptions, then ResponseStatusExceptionResolver." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we added request timing metrics to our entire REST API layer. My first attempt was to wrap business methods with `@Around` AOP. It worked but it measured only the service execution time — not the time spent in filters, argument deserialization, or response serialization. When I switched to `afterCompletion()` in a `HandlerInterceptor`, we captured wall-clock time from the moment `DispatcherServlet` received the request to the moment the response was sent. That gave us accurate P95 and P99 latency numbers. Understanding the `DispatcherServlet` lifecycle told me exactly where to put the timer."

---

## 8. Scale Evolution

**1,000 users →** Default Spring MVC with default Tomcat thread pool works perfectly. Max thread pool default is 200 threads, which handles 1,000 concurrent users easily (assuming most requests complete in milliseconds).

**100,000 users →** Tune Tomcat's thread pool: `server.tomcat.threads.max=400`, `server.tomcat.accept-count=100`. Add connection pooling metrics to monitor thread exhaustion. For long-running endpoints (file uploads, batch queries), consider async processing with `DeferredResult` or `Callable` — releases Tomcat threads while background processing continues.

**10 million users →** The thread-per-request model hits its ceiling. At this scale, consider: (1) Spring WebFlux (reactive) for non-blocking I/O — handles much higher concurrency with the same thread count, (2) Moving long-running processing into Kafka consumers — the HTTP endpoint just accepts the request and publishes to Kafka, immediately returning 202 Accepted, (3) Horizontal scaling behind a load balancer — many instances of the Spring Boot app, each with 200-400 threads.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment APIs must have complete request tracing (correlation IDs through every log line) and strict timeout enforcement. Understanding the request lifecycle tells you where to add these. | "How would you add a request-level timeout that returns 408 if your downstream service is slow?" |
| Swiggy / Meesho | High request rates. They tune Tomcat carefully and understand the lifecycle to minimize per-request overhead. | "Walk me through a request from the load balancer to your database and back — every hop." |
| Adobe / Microsoft | Complex enterprise apps with authentication, authorization, CORS, and content negotiation, all of which plug into different lifecycle stages. | "Where in the Spring MVC lifecycle does CORS preflight handling happen?" |
| Remote / Global roles | Standard senior Spring Boot question. This is the "depth check" — can you go beyond `@GetMapping` and explain what happens under the hood? | Expect a whiteboard exercise: draw the request lifecycle from HTTP to database and back. |

---

## 10. Related Topics — What to Study Next

- **Topic 43 — Filters vs Interceptors vs AOP** — the natural extension of this topic: exact comparison of all three request-interception mechanisms and when to pick each
- **Topic 58 — Exception Handling (@ControllerAdvice)** — exception handling is part of the DispatcherServlet's error path — understanding the lifecycle makes it clear why @ControllerAdvice works globally
- **Topic 51 — Spring Security Filter Chain** — Spring Security runs entirely in the Filter stage of the request lifecycle — understanding Filters is a prerequisite
- **Topic 56 — REST API Design Principles** — knowing the lifecycle helps you design APIs correctly (status codes, content types, error bodies)
- **Topic 40 — Spring AOP** — AOP (interceptors) wraps controller methods inside the HandlerAdapter phase — the proxy is called by the adapter, not by DispatcherServlet directly

---

*Part 3 · Spring Boot Request Lifecycle · Full Stack Interview Guide · Hruday D · 2026*
