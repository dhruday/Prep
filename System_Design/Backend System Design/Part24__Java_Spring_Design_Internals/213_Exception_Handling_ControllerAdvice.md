# 213. Exception Handling Strategy (ControllerAdvice)

## ────────────────────────────────────
## 1️⃣ High-Level Explanation (Interview-Level Overview)
## ────────────────────────────────────

A well-designed exception handling strategy in a Spring Boot service converts internal exceptions into structured, client-safe API responses while maintaining security and observability. `@ControllerAdvice` with `@ExceptionHandler` is the standard mechanism for centralising this logic globally.

**What it is:**
- A global consolidation point for all exception-to-response translation
- `@ControllerAdvice` is a class-level annotation that makes `@ExceptionHandler` methods apply to all controllers, not just one
- Produces consistent error responses: same JSON structure regardless of which exception occurred or which endpoint triggered it

**Why it matters:**
- Without centralised handling: each controller has its own try-catch with different response shapes → inconsistent client experience
- With it: exceptions are thrown by business logic, converted to responses by one place, maintaining separation of concerns
- Security: raw exception messages (stack traces, SQL errors, internal class names) must never reach clients — `@ControllerAdvice` is the sanitisation boundary

**Role in distributed systems:**
- Standardised error responses enable clients and API gateways to parse errors uniformly
- Correlation IDs in error responses allow distributed tracing across microservices
- Problem Details (RFC 7807) provides a standard JSON error format adopted across the industry

---

## ────────────────────────────────────
## 2️⃣ Deep-Dive Explanation (Senior / Staff Engineer Level)
## ────────────────────────────────────

### Exception Handler Resolution Order

Spring resolves exception handlers in this priority order:

1. `@ExceptionHandler` in the **same `@Controller` class** (most specific, highest priority)
2. `@ExceptionHandler` in `@ControllerAdvice` (applied globally)
3. `HandlerExceptionResolver` implementations (fallback — Spring MVC internals)
4. Servlet container error handling → `/error` endpoint (last resort)

---

### Global Exception Handler with @ControllerAdvice

```java
@RestControllerAdvice  // @ControllerAdvice + @ResponseBody
@Slf4j
public class GlobalExceptionHandler {

    // ── 4xx Client Errors ──────────────────────────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleValidationFailure(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Validation Failed");
        problem.setDetail("Request body contains invalid fields");
        
        Map<String, String> fieldErrors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "invalid value",
                (a, b) -> a + "; " + b   // Merge duplicate field errors
            ));
        
        problem.setProperty("fieldErrors", fieldErrors);
        return problem;
    }

    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ProblemDetail handleNotFound(EntityNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        problem.setTitle("Resource Not Found");
        problem.setDetail(ex.getMessage()); // Safe: our own exception message
        return problem;
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.FORBIDDEN);
        problem.setTitle("Access Denied");
        problem.setDetail("You do not have permission to access this resource");
        // ❌ Do NOT include ex.getMessage() — may leak internal role names
        return problem;
    }

    @ExceptionHandler(ConflictException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public ProblemDetail handleConflict(ConflictException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);
        problem.setTitle("Conflict");
        problem.setDetail(ex.getMessage());
        return problem;
    }

    // ── 5xx Server Errors ──────────────────────────────────────────────

    @ExceptionHandler(Exception.class)  // Catch-all — must be last
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ProblemDetail handleUnexpected(Exception ex, HttpServletRequest request) {
        String traceId = MDC.get("traceId"); // From distributed tracing (OpenTelemetry)
        log.error("Unhandled exception on {} {}, traceId={}",
                  request.getMethod(), request.getRequestURI(), traceId, ex);
        
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problem.setTitle("Internal Server Error");
        problem.setDetail("An unexpected error occurred. Reference: " + traceId);
        // ❌ Never include ex.getMessage() or stack trace — security risk
        return problem;
    }
}
```

---

### Problem Details (RFC 7807)

Spring 6 / Spring Boot 3 introduced native support for RFC 7807 Problem Details — a standard JSON error response format:

```json
{
  "type": "https://example.com/errors/order-not-found",
  "title": "Order Not Found",
  "status": 404,
  "detail": "Order with id 42 was not found",
  "instance": "/orders/42",
  "correlationId": "9a8b7c6d-...",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Enable in Spring Boot 3:
```yaml
spring:
  mvc:
    problemdetails:
      enabled: true  # Spring Boot auto-generates RFC 7807 for built-in exceptions
```

Custom field addition to Problem Details:
```java
ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
problem.setType(URI.create("https://api.example.com/errors/order-not-found"));
problem.setTitle("Order Not Found");
problem.setDetail("Order #" + orderId + " does not exist");
problem.setInstance(URI.create("/orders/" + orderId));
problem.setProperty("correlationId", MDC.get("correlationId"));
problem.setProperty("timestamp", Instant.now().toString());
```

---

### Custom Exception Hierarchy

Design exceptions in layers — domain exceptions carry business context:

```java
// Base exception for all business errors
public abstract class BusinessException extends RuntimeException {
    private final String errorCode;
    
    protected BusinessException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
    
    public String getErrorCode() { return errorCode; }
}

// Domain-specific exceptions
public class OrderNotFoundException extends BusinessException {
    public OrderNotFoundException(Long orderId) {
        super("ORDER_NOT_FOUND", "Order with id " + orderId + " was not found");
    }
}

public class InsufficientInventoryException extends BusinessException {
    private final int available;
    private final int requested;
    
    public InsufficientInventoryException(int available, int requested) {
        super("INSUFFICIENT_INVENTORY",
              "Requested " + requested + " units but only " + available + " available");
        this.available = available;
        this.requested = requested;
    }
}

public class PaymentDeclinedException extends BusinessException {
    public PaymentDeclinedException(String reason) {
        super("PAYMENT_DECLINED", "Payment was declined: " + reason);
    }
}
```

Map exception hierarchy to HTTP status codes in `@ControllerAdvice`:
```java
@ExceptionHandler(BusinessException.class)
public ResponseEntity<ProblemDetail> handleBusinessException(BusinessException ex) {
    HttpStatus status = resolveStatus(ex);
    ProblemDetail problem = ProblemDetail.forStatus(status);
    problem.setTitle(ex.getErrorCode());
    problem.setDetail(ex.getMessage());
    return ResponseEntity.status(status).body(problem);
}

private HttpStatus resolveStatus(BusinessException ex) {
    if (ex instanceof OrderNotFoundException) return HttpStatus.NOT_FOUND;
    if (ex instanceof InsufficientInventoryException) return HttpStatus.UNPROCESSABLE_ENTITY;
    if (ex instanceof PaymentDeclinedException) return HttpStatus.PAYMENT_REQUIRED;
    return HttpStatus.BAD_REQUEST;
}
```

---

### Exception Logging Strategy

Not all exceptions have the same severity — log levels should reflect this:

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // Client errors: WARN level — client did something wrong
    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        log.warn("Validation failed: {}", ex.getMessage()); // WARN — not our fault
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Validation Failed", ...);
    }

    // Not found: INFO or DEBUG — expected in normal operation
    @ExceptionHandler(EntityNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ProblemDetail handleNotFound(EntityNotFoundException ex) {
        log.debug("Resource not found: {}", ex.getMessage()); // DEBUG — normal path
        return buildErrorResponse(HttpStatus.NOT_FOUND, "Not Found", ex.getMessage());
    }

    // Unexpected: ERROR — needs investigation
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public ProblemDetail handleUnexpected(Exception ex) {
        log.error("Unexpected exception", ex); // ERROR with full stack trace
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Server Error", null);
    }
}
```

---

### Validation: @Valid Integration

Validation errors are automatically thrown as `MethodArgumentNotValidException` by Spring:

```java
@PostMapping("/orders")
public ResponseEntity<OrderDto> createOrder(@Valid @RequestBody CreateOrderRequest request) {
    // If request is invalid → MethodArgumentNotValidException thrown automatically
    // Handled in GlobalExceptionHandler above
    return ResponseEntity.status(HttpStatus.CREATED)
                         .body(orderService.createOrder(request));
}

// Request DTO with constraints
public class CreateOrderRequest {
    @NotNull(message = "Customer ID is required")
    private Long customerId;

    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 1000, message = "Quantity cannot exceed 1000")
    private int quantity;

    @NotBlank(message = "Product ID is required")
    @Size(max = 50, message = "Product ID must not exceed 50 characters")
    private String productId;
}
```

---

### Custom Error Type for Feign / RestClient Calls

When calling downstream services fail, translate their errors into domain exceptions:

```java
@Component
public class PaymentServiceErrorDecoder implements feign.codec.ErrorDecoder {
    @Override
    public Exception decode(String methodKey, Response response) {
        return switch (response.status()) {
            case 402 -> new PaymentDeclinedException("Insufficient funds");
            case 422 -> new PaymentDeclinedException("Card validation failed");
            case 503 -> new ServiceUnavailableException("Payment service is down");
            default  -> new RuntimeException("Payment service returned: " + response.status());
        };
    }
}
```

---

### Security: What Never to Expose

```java
// ❌ NEVER expose internal details in error responses:
// - Stack traces
// - SQL exceptions (table names, column names, constraint names)
// - Spring internal class names
// - File paths from FileNotFoundException
// - Internal IP addresses
// - Database connection strings

// ✅ Expose:
// - Human-readable error message relevant to the client request
// - Error code the client can use to handle the error programmatically
// - Correlation/trace ID the client can include in bug reports
// - Timestamp

// ❌ Example of what NOT to do:
return ResponseEntity.status(500).body("org.hibernate.exception.ConstraintViolationException: 
    could not execute statement [ERROR: duplicate key value violates unique constraint 
    \"orders_pkey\" DETAIL: Key (id)=(42) already exists.]");

// ✅ Example of correct response:
return ResponseEntity.status(409).body(ProblemDetail with title="Conflict", 
    detail="An order with this reference already exists");
```

---

## ────────────────────────────────────
## 3️⃣ Capacity Planning & Estimation
## ────────────────────────────────────

- Exception handling overhead is negligible compared to business logic
- Exception stack trace generation is O(stack depth) — avoid creating exceptions in hot paths (avoid using exceptions for flow control)
- High 4xx rate → check upstream client bugs or API design issues; do not alert on 4xx at high rate unless it indicates abuse
- Alert on 5xx rate > baseline threshold — indicates server-side regression

---

## ────────────────────────────────────
## 4️⃣ Data & Storage Design
## ────────────────────────────────────

- Exception messages should not quote raw DB constraint names — abstract them to business language
- `DataIntegrityViolationException` (Spring wrapper for `SQLIntegrityConstraintViolationException`) should be caught and translated:

```java
@ExceptionHandler(DataIntegrityViolationException.class)
@ResponseStatus(HttpStatus.CONFLICT)
public ProblemDetail handleDataIntegrity(DataIntegrityViolationException ex) {
    log.warn("Data integrity violation: {}", ex.getMostSpecificCause().getMessage());
    ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.CONFLICT);
    problem.setTitle("Conflict");
    problem.setDetail("A resource with the provided data already exists");
    return problem;
}
```

---

## ────────────────────────────────────
## 5️⃣ Scalability, Reliability & Fault Tolerance
## ────────────────────────────────────

- `@ControllerAdvice` is a singleton Spring bean — it is thread-safe by construction (no mutable state)
- Error responses should be returned within the same timeout as successful responses — don't perform additional DB calls in exception handlers
- Correlate all errors with a trace ID (MDC, OpenTelemetry) so distributed errors can be traced across services

---

## ────────────────────────────────────
## 6️⃣ Security, APIs & Governance
## ────────────────────────────────────

- The catch-all `Exception.class` handler is the final security wall — log full details server-side, return minimal safe message to client
- `AccessDeniedException` and `AuthenticationException` messages must NOT expose role names, permission names, or resource hierarchy
- Spring Security's `AuthenticationEntryPoint` (for 401) and `AccessDeniedHandler` (for 403) run in filters, before `@ControllerAdvice`, and should also return Problem Details format
- Rate limiting 429 responses should not reveal the rate limit threshold or remaining quota in the default case (prevents attackers from timing requests to stay under limit)

---

## ────────────────────────────────────
## 7️⃣ Real-World Examples & Case Studies
## ────────────────────────────────────

### GitHub API: Consistent Error Format
- GitHub REST API returns a consistent JSON error structure for all errors:
  `{ "message": "Not Found", "documentation_url": "..." }`
- Enables SDK/client library authors to write generic error handling
- Machine-readable codes allow programmatic retry logic

### Stripe: Error Codes as First-Class Citizens
- Stripe returns `type`, `code`, `decline_code`, and `message` in every error response
- Clients can distinguish `card_declined` from `insufficient_funds` from `expired_card`
- Spring implementation: custom exception hierarchy with error codes maps to these differentiated responses

### Stack Overflow: Log Every 5xx with Context
- Stack Overflow's engineering blog documented their policy: every 5xx is logged with full context (userId, URL, params, timing, stack trace)
- Errors are aggregated and triaged by frequency in their error tracking system (Exceptional)
- Prevents repeated unknown error patterns from persisting unnoticed

---

## ────────────────────────────────────
## 8️⃣ Interview-Oriented Answer & Follow-Ups
## ────────────────────────────────────

### Sample Interview Answer

> "`@RestControllerAdvice` centralises all exception-to-response translation in one place. I design a custom exception hierarchy: `BusinessException` base class with an `errorCode` field, and domain-specific subclasses like `OrderNotFoundException` or `InsufficientInventoryException`. The `@ControllerAdvice` catches these and maps them to HTTP status codes and RFC 7807 Problem Details responses. The critical security rule is the catch-all `Exception.class` handler — log the full stack trace server-side with a correlation ID, but return only a trace ID reference to the client. Never expose stack traces, SQL error messages, constraint names, or internal class names in API responses. I also differentiate log levels: client errors (4xx) are WARN or DEBUG; server errors (5xx) are ERROR with the full stack trace."

### Follow-Up Questions

1. **"What is `@RestControllerAdvice` vs `@ControllerAdvice`?"** → `@RestControllerAdvice` is a composed annotation: `@ControllerAdvice` + `@ResponseBody`. It serialises the return value of exception handler methods to the response body (JSON). Without `@ResponseBody`, the return value would be treated as a view name.
2. **"What is RFC 7807 Problem Details?"** → A standardized JSON schema for HTTP error responses: `type` (URI identifying the error), `title` (human-readable summary), `status` (HTTP status code), `detail` (human-readable explanation), `instance` (URI of the specific occurrence). Spring Boot 3 supports this natively.
3. **"When is a local `@ExceptionHandler` preferred over `@ControllerAdvice`?"** → When the handling is genuinely specific to one controller and would be incorrect or confusing for others. Example: a `FileUploadController`'s `MaxUploadSizeExceededException` handler that returns a specific redirect.
4. **"How do you handle exceptions from `@Async` methods?"** → Exceptions from `@Async` do not propagate back to the caller thread. They must be handled via `AsyncUncaughtExceptionHandler`:
   ```java
   @Override
   public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
       return (ex, method, params) -> log.error("Async exception in {}", method.getName(), ex);
   }
   ```

---

## ────────────────────────────────────
## 9️⃣ Pseudocode / Diagrams
## ────────────────────────────────────

### Exception Handler Priority

```
Exception thrown in Controller/Service
            │
            ▼
Local @ExceptionHandler in same @Controller?
  YES → use it (highest priority)
  NO  ↓
            ▼
Matching @ExceptionHandler in @ControllerAdvice?
  YES → use it
  NO  ↓
            ▼
HandlerExceptionResolver?
  YES → use it
  NO  ↓
            ▼
Servlet /error endpoint (least specific)
```

### Error Response Architecture

```
Exception Hierarchy           HTTP Response Mapping
──────────────────           ─────────────────────
BusinessException
  ├── OrderNotFoundException        → 404 Not Found
  ├── InsufficientInventory         → 422 Unprocessable Entity 
  ├── PaymentDeclined               → 402 Payment Required
  └── ConflictException             → 409 Conflict

MethodArgumentNotValidException     → 400 Bad Request
DataIntegrityViolationException     → 409 Conflict
AccessDeniedException               → 403 Forbidden
AuthenticationException             → 401 Unauthorized
RateLimitExceededException          → 429 Too Many Requests
Exception (catch-all)               → 500 Internal Server Error
```

---

## ────────────────────────────────────
## 🔟 Why & How Summary
## ────────────────────────────────────

**Why centralised exception handling matters:**
- Without it: duplicated try-catch in every controller, inconsistent response shapes, security leaks of internal details
- With it: single source of truth for error responses, clean controller code, consistent RFC 7807 format

**How it works:**
- `@RestControllerAdvice` registers global `@ExceptionHandler` methods
- Spring's `ExceptionHandlerExceptionResolver` routes exceptions to the best matching handler method
- Business logic throws typed exceptions; the handler maps exception type → HTTP status + structured body

**Key design rules:**
- Throw typed domain exceptions in service layer; never catch-and-ignore silently
- Map exceptions to HTTP semantics at the advice layer — business code should not know HTTP status codes
- Log 5xx errors with full stack trace and correlation ID; log 4xx at WARN/DEBUG
- Never expose internal exception messages, SQL details, or stack traces to API clients
- Use RFC 7807 Problem Details for a standard, parseable error format
