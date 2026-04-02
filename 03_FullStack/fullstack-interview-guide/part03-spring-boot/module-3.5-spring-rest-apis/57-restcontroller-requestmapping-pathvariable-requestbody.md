# @RestController, @RequestMapping, @PathVariable, @RequestBody
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- `@RestController` = `@Controller` + `@ResponseBody` — every method return value is directly written to the HTTP response body (via Jackson to JSON); no view resolution
- `@RequestMapping` = maps a URL pattern + HTTP method to a controller method; `@GetMapping`, `@PostMapping` etc. are shortcuts that set the method automatically
- `@PathVariable` extracts a value from the URL path: `GET /orders/{orderId}` → `@PathVariable Long orderId`
- `@RequestParam` extracts a query string value: `GET /orders?status=PENDING` → `@RequestParam String status`
- `@RequestBody` deserializes the HTTP request body (JSON → Java object) via Jackson; always pair with `@Valid` for validation
- `@ResponseStatus`, `ResponseEntity<T>`, and `@ControllerAdvice` control the HTTP status code — returning from a method gives 200 by default

---

## 1. One-Line Definition
These annotations map incoming HTTP requests to Java methods and handle the conversion between HTTP data (URL path, query params, request body) and Java objects, removing all the manual parsing code you would otherwise write.

---

## 2. The Problem It Solves

Without Spring MVC's annotation model, you write raw Servlet code. To handle `GET /orders/42`, you override `doGet()` in an `HttpServlet`, manually parse the URL to extract `42`, call `Integer.parseInt()`, validate it is not null, query the database, manually serialize the result to JSON using a toString or a JSON library, set the `Content-Type` header, and write to `response.getOutputStream()`. Every handler method is 30 lines of infrastructure code wrapped around 5 lines of actual business logic.

Spring MVC collapses all that infrastructure into annotations. The method is just the business logic. Path parsing, type conversion, JSON serialization/deserialization, header management — all handled by the framework. A controller method that was 30 lines in raw Servlets becomes 5 lines with Spring MVC annotations.

At Oracle, I migrated a module from an old custom MVC framework to Spring Boot. The before-and-after was striking: the old `handleRequest()` method was 60 lines of parsing and serialization. After migration, the same logic was 6 lines in a `@GetMapping` method. The business logic was finally visible without the noise.

---

## 3. How It Works Internally

### The Mental Model
Think of these annotations as routing labels on mailboxes. `@RequestMapping("/orders")` puts a label on the class — all mail for this address comes here. `@GetMapping("/{id}")` puts a smaller label on a specific slot — GET mail for `/orders/{anything}` goes to this exact slot. When mail (an HTTP request) arrives, the postmaster (`DispatcherServlet`) reads the label and delivers the mail directly to the right slot (method). The method just processes the content — it never needs to open the envelope or check the address itself.

### The Mechanism — Step by Step

1. **Request arrives** at `DispatcherServlet`
2. `HandlerMapping` scans for a method whose `@RequestMapping` (or `@GetMapping` etc.) matches the URL + HTTP method
3. `HandlerAdapter` prepares method arguments by consulting `HandlerMethodArgumentResolver` implementations:
   - `@PathVariable` → `PathVariableMethodArgumentResolver` extracts from the URI template
   - `@RequestParam` → `RequestParamMethodArgumentResolver` reads from `request.getParameter()`
   - `@RequestBody` → `RequestResponseBodyMethodProcessor` delegates to `HttpMessageConverter` (Jackson) to deserialize the body
   - `@RequestHeader` → reads from HTTP headers
   - Parameters with no annotation → Spring tries to match them as model attributes or path variables by name
4. **Method executes** with all arguments populated
5. **Return value handling** — `HandlerMethodReturnValueHandler`:
   - `@ResponseBody` / `@RestController` → `HttpMessageConverter` (Jackson) serializes the return value → writes to response body
   - `ResponseEntity<T>` → status code + headers + body all come from the `ResponseEntity`
   - `void` with `@ResponseStatus(HttpStatus.NO_CONTENT)` → 204, empty body

### Key Annotations / Classes At a Glance

| Annotation / Class | Purpose | Typical use |
|--------------------|---------|-------------|
| `@RestController` | `@Controller` + `@ResponseBody` | Every REST API controller |
| `@RequestMapping` | Base path for a controller or specific method | Class-level prefix; method-level combined with HTTP method |
| `@GetMapping` | `@RequestMapping(method=GET)` shortcut | Read operations |
| `@PostMapping` | `@RequestMapping(method=POST)` shortcut | Create operations |
| `@PutMapping` | `@RequestMapping(method=PUT)` shortcut | Full replace |
| `@PatchMapping` | `@RequestMapping(method=PATCH)` shortcut | Partial update |
| `@DeleteMapping` | `@RequestMapping(method=DELETE)` shortcut | Delete |
| `@PathVariable` | Extracts from URL path template `{var}` | `/orders/{orderId}` |
| `@RequestParam` | Extracts from query string `?key=value` | `/orders?status=PENDING` |
| `@RequestBody` | Deserializes request body (JSON → Java) | POST/PUT/PATCH bodies |
| `@ResponseBody` | Serializes return value to response body | On individual methods when not using `@RestController` |
| `@ResponseStatus` | Sets a default HTTP status code on a method | `@ResponseStatus(HttpStatus.CREATED)` |
| `ResponseEntity<T>` | Full control — status + headers + body | When status code changes based on logic |
| `@RequestHeader` | Extracts a specific HTTP request header | `Authorization`, `X-Correlation-ID` |
| `@CookieValue` | Extracts a cookie value | `refreshToken` cookie |

### ASCII Diagram

```
GET /api/v1/orders/42?includeItems=true
  Authorization: Bearer <jwt>
       │
       ▼
DispatcherServlet
       │
       ▼
HandlerMapping
  Scans: @GetMapping("/{orderId}")
  on OrderController (mapped to /api/v1/orders)
  ✅ Match found
       │
       ▼
HandlerAdapter — resolves method arguments:
  ┌── @PathVariable Long orderId  ← "42" from URL → converted to Long 42
  ├── @RequestParam(defaultValue="false") boolean includeItems ← "true" → true
  └── automatically injects: Principal, HttpServletRequest etc. if declared
       │
       ▼
OrderController.getOrder(42L, true)
  → orderService.findById(42L, true)
  → returns OrderDto object
       │
       ▼
ReturnValueHandler
  @RestController present → @ResponseBody implied
  Jackson ObjectMapper serializes OrderDto → JSON bytes
  Sets Content-Type: application/json
  Writes to HttpServletResponse
       │
       ▼
HTTP/1.1 200 OK
Content-Type: application/json
{"id": 42, "status": "PENDING", ...}
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
@RestController
@RequestMapping("/orders")
public class OrderController {

    @GetMapping
    public List<Order> getOrders(
            @RequestParam String status,  // WRONG 1: required=true by default
                                          // caller gets 400 if ?status= is omitted
                                          // should be optional with a default

            @RequestParam int page,       // WRONG 2: primitive — NPE if not provided
                                          // use Integer (boxed) or provide defaultValue

            @PathVariable Long userId) {  // WRONG 3: @PathVariable on getOrders()
                                          // but URL is /orders — no {userId} in path!
                                          // This binds nothing and throws at startup or runtime
        return orderService.findByStatus(status);
    }

    @PostMapping
    public Order createOrder(@RequestBody Order order) {
        // WRONG 4: @RequestBody Order (entity) directly — exposes your DB schema
        // WRONG 5: No @Valid — no input validation at all
        // WRONG 6: Returns the raw entity with all fields including sensitive ones
        return orderService.save(order);
    }
}
```
> **Why this fails in production:** Required `@RequestParam` with no default causes 400 errors for callers who omit it — bad DX. Binding `@PathVariable` for a variable that doesn't exist in the URL template causes `MissingPathVariableException` at runtime. Accepting the entity directly in `@RequestBody` is a mass-assignment vulnerability — callers can set internal fields like `id`, `createdAt`, `status` directly. No `@Valid` means any garbage JSON is accepted and crashes deep in the service layer.

### Right Way — Production Quality
```java
@RestController
@RequestMapping("/api/v1/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // ─── Proper optional query params ─────────────────────────────────────────
    @GetMapping
    public ResponseEntity<Page<OrderDto>> listOrders(
            // required=false makes it optional; defaultValue provides a fallback
            @RequestParam(required = false) String status,
            // Pageable is auto-populated from ?page=0&size=20&sort=createdAt,desc
            Pageable pageable) {

        return ResponseEntity.ok(orderService.findAll(status, pageable));
    }

    // ─── @PathVariable — must exist in the URL template ──────────────────────
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderDto> getOrder(
            // {orderId} in @GetMapping ↑ must match @PathVariable name
            @PathVariable Long orderId) {  // Spring auto-converts String → Long
        return ResponseEntity.ok(orderService.findById(orderId));
        // If orderId is not a number: 400 MethodArgumentTypeMismatchException
        // If order not found: service throws → @ControllerAdvice returns 404
    }

    // ─── @RequestBody with @Valid — enforce input validation ──────────────────
    @PostMapping
    public ResponseEntity<OrderDto> createOrder(
            @RequestBody @Valid CreateOrderRequest request,
            // UriComponentsBuilder injected by Spring — use to build the Location header
            UriComponentsBuilder uriBuilder,
            // Extract correlation ID from header for distributed tracing
            @RequestHeader(value = "X-Correlation-ID", required = false) String correlationId) {

        OrderDto created = orderService.create(request, correlationId);

        // 201 Created + Location: /api/v1/orders/99
        URI location = uriBuilder
            .path("/api/v1/orders/{id}")
            .buildAndExpand(created.id())
            .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // ─── PATCH — partial update ───────────────────────────────────────────────
    @PatchMapping("/{orderId}")
    public ResponseEntity<OrderDto> patchOrder(
            @PathVariable Long orderId,
            @RequestBody @Valid PatchOrderRequest request) {
        return ResponseEntity.ok(orderService.patch(orderId, request));
    }

    // ─── DELETE — 204 No Content ──────────────────────────────────────────────
    @DeleteMapping("/{orderId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)  // Shortcut instead of ResponseEntity
    public void deleteOrder(@PathVariable Long orderId) {
        orderService.delete(orderId);
        // @ResponseStatus(NO_CONTENT) sets 204 — method returns void, no body
    }

    // ─── Sub-resource ─────────────────────────────────────────────────────────
    @GetMapping("/{orderId}/items")
    public ResponseEntity<List<OrderItemDto>> getOrderItems(
            @PathVariable Long orderId,
            // Multiple @PathVariables are fine — each must match a {variable} in the path
            @RequestParam(defaultValue = "false") boolean includeDetails) {
        return ResponseEntity.ok(orderService.getItems(orderId, includeDetails));
    }
}
```

```java
// DTO — never expose the JPA entity directly in @RequestBody or as return type
// Records are ideal for immutable DTOs in Java 17+
public record CreateOrderRequest(
    @NotBlank(message = "Customer ID is required")
    String customerId,

    @NotEmpty(message = "Order must have at least one item")
    @Valid  // validates each element in the list with the nested constraints
    List<OrderItemRequest> items,

    @NotNull
    @Valid
    ShippingAddressRequest shippingAddress
) {}

public record OrderItemRequest(
    @NotNull Long productId,
    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 100, message = "Quantity cannot exceed 100 per item")
    int quantity
) {}

// Response DTO — controls exactly what fields are exposed
public record OrderDto(
    Long id,
    String status,
    BigDecimal total,
    String customerId,
    LocalDateTime createdAt
    // NOTE: never include 'password', internal audit fields, or fields from other aggregates
) {}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between @PathVariable, @RequestParam, and @RequestBody?"

**Hruday's answer:**
> These three annotations extract data from different parts of the HTTP request.
>
> `@PathVariable` pulls a value from the URL path itself. If the route is `@GetMapping("/{orderId}")`, then `@PathVariable Long orderId` extracts the `42` from `/api/orders/42`. The variable name in the annotation must match the `{name}` in the URL template. Spring automatically converts the string from the URL to the declared type — `Long`, `UUID`, `String`, whatever.
>
> `@RequestParam` extracts from the query string — the part after the `?` in the URL. `GET /orders?status=PENDING&page=2` — `@RequestParam String status` extracts `"PENDING"`. By default it is required; add `required=false` or `defaultValue` to make it optional. Use this for filters, sorting, and pagination parameters.
>
> `@RequestBody` reads the entire HTTP request body and deserializes it from JSON to a Java object using Jackson. Used for POST, PUT, PATCH requests where the data is too complex for a URL — the full order object, user registration details, etc. Always pair with `@Valid` to run bean validation constraints before the method body runs.
>
> A 4th one worth knowing: `@RequestHeader` extracts from HTTP headers — useful for `Authorization`, tracing IDs, and API keys.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is `ResponseEntity<T>` and when do you use it instead of returning the object directly?"

**Hruday's answer:**
> `ResponseEntity<T>` gives you full control over the HTTP response: the status code, headers, and body together. When you return a plain object from a `@RestController` method, Spring always returns 200 OK with the serialized body. That is fine for simple reads.
>
> You need `ResponseEntity` in these cases:
>
> First: non-200 status codes that depend on logic. Creating a resource should return 201 Created. Deleting should return 204 No Content. If you use `ResponseEntity.created(locationUri).body(dto)`, you get 201 + a `Location` header automatically.
>
> Second: conditional responses. If a request sends an `If-None-Match` header matching your ETag, you return `ResponseEntity.status(304).build()` — no body, the cache is still valid.
>
> Third: adding custom response headers. Pagination metadata in headers (`X-Total-Count`, `Link`), rate limit headers (`X-RateLimit-Remaining`), or a correlation ID — these all need `ResponseEntity` to add headers manually.
>
> The shortcut `@ResponseStatus(HttpStatus.CREATED)` on the method works for a fixed status code with a void method — but it cannot dynamically set headers. `ResponseEntity` is more explicit and flexible for anything beyond simple 200 OK responses.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "Should you accept your JPA entity directly in @RequestBody? Why or why not?"

**Hruday's answer:**
> No — never accept a JPA entity directly in `@RequestBody`. This is a mass-assignment vulnerability.
>
> Your entity likely has internal fields: `id`, `createdAt`, `version`, `status`, `isDeleted`, `role`. If you accept the entity directly, a caller can set any of these fields in the JSON payload. A request body like `{"customerId": "x", "status": "APPROVED", "isAdmin": true}` could bypass your business logic and set a field that should only be set server-side.
>
> Spring ignores fields with no setter (if you use Lombok's `@Setter` on specific fields only), but this is brittle and easy to get wrong. JPA entities are also annotated with `@Id`, `@Version`, and relationship annotations — if the caller sends a value for those, unexpected things happen.
>
> The right pattern: use a separate DTO (Data Transfer Object) as the `@RequestBody` parameter. The DTO has only the fields the caller is allowed to provide. The service layer maps the DTO to the entity — and in that mapping, it sets only the fields the service is responsible for setting.
>
> Java 17+ records are perfect for this: immutable, no setters, explicit fields. The record is exactly what the API contract says it is — nothing more.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "How does Spring convert a JSON request body to a Java object and back? What is Jackson's role?"

**Hruday's answer:**
> When a request arrives with `Content-Type: application/json`, Spring's `RequestResponseBodyMethodProcessor` is the argument resolver for `@RequestBody` parameters. It asks Spring's `HttpMessageConverter` chain: "Can anyone handle JSON?" `MappingJackson2HttpMessageConverter` says yes — it is registered automatically by Spring Boot's autoconfiguration.
>
> Jackson's `ObjectMapper` deserializes the JSON. It maps JSON keys to Java field names by default — `{"orderId": 42}` maps to a field named `orderId`. You can customise this with `@JsonProperty("order_id")` on the field or with global naming strategies like `SNAKE_CASE` in the `ObjectMapper` config. Unknown fields in the JSON are ignored by default (configurable with `DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES`).
>
> For the response, when the method returns and `@RestController` / `@ResponseBody` is present, `RequestResponseBodyMethodProcessor` handles the return value. Again, `MappingJackson2HttpMessageConverter` is selected. `ObjectMapper` serializes the object to JSON bytes, which are written to the response output stream.
>
> Key customisations I use in production: `@JsonIgnore` on fields that should never be serialised (passwords, internal audit fields). `@JsonInclude(NON_NULL)` to omit null fields from responses — cleaner output. `@JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")` on date fields for consistent ISO 8601 format across all APIs. These are configured globally on the `ObjectMapper` bean in Spring Boot 3.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "`@Controller` and `@RestController` are the same" | "Both handle HTTP requests" | "`@Controller` is for MVC — it returns a view name resolved by a `ViewResolver` (Thymeleaf, JSP). `@RestController` adds `@ResponseBody` — the return value is written directly to the HTTP response body (JSON). Using `@Controller` without `@ResponseBody` for a REST API returns a view name as a string in the body — not the JSON you intended." |
| "Required `@RequestParam` is fine" | "If it's required, just make it required" | "Required params return 400 Bad Request if omitted — but the error message from Spring (`Required request parameter 'x' for method parameter type String is not present`) is an internal Spring message, not your API's standard error format. Always use `required=false` with a default, or handle the missing case explicitly, and let your `@ControllerAdvice` format the 400 response consistently." |
| "Use `@RequestParam Map<String, String>` to capture all params" | "Just take them as a map for flexibility" | "`@RequestParam Map<String, String>` accepts ANY query parameter — it is essentially an open interface with no contract. It bypasses `@Valid`, makes documentation impossible (Swagger cannot infer what parameters are accepted), and opens SQL injection or logic injection if the map is used directly. Declare each parameter explicitly with its type and validation." |
| "Return null from a controller method" | "Return null if the resource isn't found" | "Returning null from a `@RestController` method that is not `ResponseEntity` writes an empty 200 OK response. Clients think the request succeeded with empty data. Throw a `ResourceNotFoundException` and let `@ControllerAdvice` return a proper 404 with a descriptive body." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, I built the Spring Boot REST APIs that the Angular frontend consumed. Having worked on the Angular side first, I knew exactly what the frontend needed — consistent response formats, proper 404 vs 400 error codes, pagination metadata in the right fields, date formats in ISO 8601. I wrote the controllers with both perspectives in mind — annotating every `@RequestParam` with `defaultValue`, using records as DTOs so the API contract was explicit, and returning `ResponseEntity` with the `Location` header on every POST. The frontend team integrated with the API in under a day with no clarification questions."

---

## 8. Scale Evolution

**1,000 users →** Default Spring Boot configuration handles this trivially. Jackson's `ObjectMapper` is shared and thread-safe. `@RequestMapping` handler mapping is computed at startup and cached — no per-request overhead for route matching.

**100,000 users →** Jackson serialization is CPU-intensive at high throughput. Profile which endpoints serialize large payloads. Projections or DTOs with fewer fields reduce payload size — less JSON to serialize and transmit. Consider Jackson's `@JsonView` to return different subsets of a DTO for different callers without multiple endpoint methods.

**10 million users →** At this scale, HTTP body deserialization itself becomes a bottleneck for write APIs with large bodies. Consider streaming large request bodies instead of loading them fully into memory (`StreamingResponseBody`, `SseEmitter` for responses). Binary protocols (gRPC + Protobuf) eliminate JSON parsing overhead for internal service calls. Public-facing REST APIs keep JSON for compatibility, internal calls switch to binary.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every API they expose to merchants is built with these exact annotations. Getting the HTTP method, status code, and error format right is critical for merchant integration. | "Walk me through how you handle a 404 in a Spring Boot REST controller vs a 422 validation error." |
| Swiggy / Meesho | High-volume mobile APIs where response efficiency matters — small DTOs, no nulls, pagination. Understanding `ResponseEntity` and Jackson customisation directly impacts API performance. | "How do you customise Jackson serialization in Spring Boot to exclude null fields from all responses?" |
| Adobe / Microsoft | Enterprise APIs with complex request bodies — document metadata, configuration payloads. `@RequestBody` + `@Valid` + nested DTOs are used heavily. | "How does Spring Boot validate a nested JSON object in a @RequestBody?" |
| Remote / Global roles | Spring MVC annotation knowledge is a standard senior Java interview requirement. Explaining the `DispatcherServlet` → `HandlerMapping` → argument resolver chain signals deep internals knowledge. | "Explain the life of an HTTP request in Spring Boot from the moment it hits the server." |

---

## 10. Related Topics — What to Study Next

- **Topic 58 — Exception Handling (@ControllerAdvice)** — the annotations here create the happy path; `@ControllerAdvice` handles when things go wrong — the error response format that completes the picture
- **Topic 56 — REST API Design Principles** — the annotations implement the design principles from Topic 56; understanding both gives you the full picture
- **Topic 60 — Request Validation (@Valid, Custom Validators)** — `@Valid` was used throughout this topic; Topic 60 covers all Bean Validation constraints, custom validators, and how validation errors are reported
- **Topic 42 — Spring Boot Request Lifecycle (DispatcherServlet)** — the `DispatcherServlet` → `HandlerMapping` → `HandlerAdapter` → `HttpMessageConverter` flow explained here IS the request lifecycle from Topic 42 — reading both together builds a complete mental model
- **Topic 43 — Filters vs Interceptors vs AOP** — knowing where `@RequestMapping` methods sit in the execution order (after filters, after interceptors, at the controller level) helps you decide where to put cross-cutting concerns

---

*Part 3 · @RestController, @RequestMapping, @PathVariable, @RequestBody · Full Stack Interview Guide · Hruday D · 2026*
