# Exception Handling — @ControllerAdvice, @ExceptionHandler
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- `@ControllerAdvice` is a global exception handler — a single class that catches exceptions thrown by any controller in your application and converts them to HTTP responses
- `@ExceptionHandler(SomeException.class)` inside a `@ControllerAdvice` class handles that specific exception type for the whole app
- Without this, Spring Boot's default error endpoint (`/error` via `BasicErrorController`) returns different formats for HTML vs JSON — inconsistent, internal-detail-leaking, and uncontrollable
- Return `ResponseEntity<ErrorResponse>` with a consistent error DTO — a standard format that every client can parse predictably
- `@ResponseStatus` on a custom exception class is a quick shortcut for simple cases — but it leaks exception class names if not wrapped
- Never expose stack traces in production API responses — they reveal your framework, file structure, and potential attack vectors

---

## 1. One-Line Definition
`@ControllerAdvice` + `@ExceptionHandler` is Spring MVC's centralized exception handling mechanism — one place to convert every type of exception into a consistent, well-formatted HTTP error response, applied globally to all controllers.

---

## 2. The Problem It Solves

Without centralized exception handling, every controller method needs its own try-catch block. Developer A catches `NotFoundException` and returns `{"error": "not found"}`. Developer B catches the same exception and returns `{"message": "No such resource"}`. Developer C forgets to catch it entirely — Spring's default error handler kicks in and returns a 500 with a full Java stack trace in the HTML body (even for JSON API calls on older Spring Boot configs).

Now the API client — a mobile app, a frontend, a partner integration — gets three different error formats depending on which endpoint they call and which developer wrote it. The partner's error parser breaks. On-call engineers get "500 Internal Server Error" alerts with no useful context. The stack trace in the response body reveals your Spring Boot version, your package structure, and sometimes database driver details — a security problem.

Real scenario: at Oracle, we had three teams contributing to the same API service. Each team used different exception handling conventions. When I joined, partner integrations were failing with `org.springframework.web.bind.MethodArgumentNotValidException` as the response body — raw Spring exception class names exposed publicly. One `@ControllerAdvice` class fixed it for every team's controllers simultaneously.

---

## 3. How It Works Internally

### The Mental Model
Think of `@ControllerAdvice` as a building's security desk. If any employee on any floor causes a disturbance (throws an exception), the security desk intercepts it, determines the right response (call the police? give a warning?), and sends the appropriate, standardised message outside — not the employee's raw 30-second rant. The consistent response is determined by the security desk policy, applied uniformly regardless of which floor the incident happened on.

### The Mechanism — Step by Step

1. **Exception thrown** anywhere inside a controller method (or in `@Valid` processing, or in service methods called by the controller)
2. Spring MVC's `ExceptionHandlerExceptionResolver` intercepts the exception before it propagates further
3. It searches for a method annotated with `@ExceptionHandler` that matches the exception type — first in the same controller, then in any `@ControllerAdvice` class
4. The matching `@ExceptionHandler` method runs with the exception as an argument
5. The return value is processed like any controller method — `ResponseEntity<ErrorResponse>` is serialised to JSON with the specified status code
6. If no `@ExceptionHandler` matches: `ResponseStatusExceptionResolver` checks for `@ResponseStatus` on the exception class, then `DefaultHandlerExceptionResolver` catches well-known Spring exceptions (400, 405, 415 etc.), and finally the default `/error` endpoint handles everything else

### Exception Handling Hierarchy

```
Exception thrown in Controller / Service
       │
       ▼
ExceptionHandlerExceptionResolver
   Look for @ExceptionHandler in same Controller → not found
   Look for @ExceptionHandler in @ControllerAdvice beans → found!
       │
       ▼
@ControllerAdvice method handles it
  → returns ResponseEntity<ErrorResponse>
  → Jackson serializes to JSON
  → HTTP response sent

  If no match found here:
       │
       ▼
ResponseStatusExceptionResolver
   Is @ResponseStatus annotation on exception class?
   → use its code and reason

  If still no match:
       │
       ▼
DefaultHandlerExceptionResolver
   Known Spring exceptions → standard HTTP codes
   (MethodArgumentNotValidException → 400)
   (HttpMessageNotReadableException → 400)
   (NoHandlerFoundException → 404)
   (HttpRequestMethodNotSupportedException → 405)

  If still no match:
       │
       ▼
Spring Boot BasicErrorController (/error)
  → Returns the Spring Boot default error JSON (timestamp, status, error, path)
  → This is what you see without any custom handling
```

### ASCII Diagram

```
Controller.getOrder() throws OrderNotFoundException
       │
       ▼
ExceptionHandlerExceptionResolver
  Search: @ControllerAdvice GlobalExceptionHandler
  → @ExceptionHandler(OrderNotFoundException.class) found ✅
       │
       ▼
GlobalExceptionHandler.handleOrderNotFound(ex, request)
  → returns ResponseEntity.status(404).body(ErrorResponse{
        code: "ORDER_NOT_FOUND",
        message: "Order 42 not found",
        timestamp: "2026-03-25T10:30:00Z",
        path: "/api/v1/orders/42"
      })
       │
       ▼
Jackson serialises ErrorResponse → JSON
HTTP/1.1 404 Not Found
Content-Type: application/json
{"code": "ORDER_NOT_FOUND", "message": "Order 42 not found", ...}
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Exception handling scattered across individual controllers
@RestController
public class OrderController {

    @GetMapping("/{id}")
    public Order getOrder(@PathVariable Long id) {
        try {
            return orderService.findById(id);
        } catch (OrderNotFoundException e) {
            // WRONG 1: Returns 200 OK with an error body — HTTP status ignored
            // WRONG 2: Different format from what other controllers return
            // WRONG 3: Manual try-catch in every controller method — repeated boilerplate
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
            // At least this is partially better, but still: per-controller handling
        }
    }
}

// Spring's default /error response leaks internals:
// {
//   "timestamp": "2026-03-25T10:30:00.000+00:00",
//   "status": 500,
//   "error": "Internal Server Error",
//   "path": "/api/v1/orders/42",
//   "trace": "java.lang.NullPointerException\n\tat com.example..."  ← SECURITY RISK
// }
```
> **Why this fails in production:** Each controller has its own error format. Partners and frontend apps cannot reliably parse the error. The raw stack trace is a security risk — it reveals your framework version, internal package names, and sometimes DB query details. Manual try-catch in every method is boilerplate that developers skip when rushing, leaving gaps in error handling.

### Right Way — Production Quality Centralized Handler
```java
// Standard error response DTO — a record for immutability and clarity
public record ErrorResponse(
    String code,           // machine-readable: "ORDER_NOT_FOUND", "VALIDATION_ERROR"
    String message,        // human-readable: "Order 42 not found"
    int status,            // the HTTP status code (also in the HTTP response header — useful for logging)
    String path,           // the URL that caused the error
    Instant timestamp,     // when the error occurred (ISO 8601)
    List<FieldError> errors // for validation errors: list of field-level messages
) {
    // Factory method for single-message errors
    public static ErrorResponse of(String code, String message, int status, String path) {
        return new ErrorResponse(code, message, status, path, Instant.now(), null);
    }
}

// Field-level error record — used for @Valid validation failures
public record FieldError(String field, String rejectedValue, String message) {}
```

```java
// Global exception handler — handles ALL controllers in the application
@RestControllerAdvice
// @RestControllerAdvice = @ControllerAdvice + @ResponseBody
// (same as @ControllerAdvice when all your @ExceptionHandler methods return ResponseEntity)
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ─── Domain-specific exceptions ───────────────────────────────────────────

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(
            ResourceNotFoundException ex, HttpServletRequest request) {
        // Log at WARN — not found is not a server error
        log.warn("Resource not found: {} {}", request.getMethod(), request.getRequestURI());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(ErrorResponse.of("RESOURCE_NOT_FOUND", ex.getMessage(),
                HttpStatus.NOT_FOUND.value(), request.getRequestURI()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(
            ConflictException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ErrorResponse.of("CONFLICT", ex.getMessage(),
                HttpStatus.CONFLICT.value(), request.getRequestURI()));
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ErrorResponse> handleBusinessRule(
            BusinessRuleException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
            .body(ErrorResponse.of("BUSINESS_RULE_VIOLATION", ex.getMessage(),
                HttpStatus.UNPROCESSABLE_ENTITY.value(), request.getRequestURI()));
    }

    // ─── Spring MVC validation exceptions — from @Valid on @RequestBody ───────
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {

        // Collect all field-level validation errors
        List<FieldError> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
            .map(error -> new FieldError(
                error.getField(),
                Objects.toString(error.getRejectedValue(), "null"),
                error.getDefaultMessage()
            ))
            .toList();

        ErrorResponse body = new ErrorResponse(
            "VALIDATION_ERROR",
            "Request validation failed. Check the 'errors' field for details.",
            HttpStatus.BAD_REQUEST.value(),
            request.getRequestURI(),
            Instant.now(),
            fieldErrors
        );

        return ResponseEntity.badRequest().body(body);
    }

    // ─── Spring MVC — malformed JSON in request body ──────────────────────────
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedJson(
            HttpMessageNotReadableException ex, HttpServletRequest request) {
        return ResponseEntity.badRequest()
            .body(ErrorResponse.of("MALFORMED_REQUEST",
                "Request body could not be parsed. Check JSON syntax.",
                HttpStatus.BAD_REQUEST.value(), request.getRequestURI()));
    }

    // ─── @PathVariable / @RequestParam type mismatch (e.g., "abc" as Long) ───
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(
            MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String message = String.format("Parameter '%s' expects type %s",
            ex.getName(), ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "unknown");
        return ResponseEntity.badRequest()
            .body(ErrorResponse.of("TYPE_MISMATCH", message,
                HttpStatus.BAD_REQUEST.value(), request.getRequestURI()));
    }

    // ─── Spring Security access denied ────────────────────────────────────────
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest request) {
        // Log at INFO — not an application error; a security event
        log.info("Access denied: {} {} by {}", request.getMethod(),
            request.getRequestURI(), request.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(ErrorResponse.of("ACCESS_DENIED", "You do not have permission to perform this action.",
                HttpStatus.FORBIDDEN.value(), request.getRequestURI()));
    }

    // ─── Catch-all — for any exception not matched above ─────────────────────
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(
            Exception ex, HttpServletRequest request) {
        // Log at ERROR — this is a genuine server error; alert on-call
        // IMPORTANT: log the full exception, but NEVER send stack trace in response
        log.error("Unexpected error processing {} {}", request.getMethod(),
            request.getRequestURI(), ex);

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(ErrorResponse.of("INTERNAL_ERROR",
                "An unexpected error occurred. Please try again later.",
                HttpStatus.INTERNAL_SERVER_ERROR.value(), request.getRequestURI()));
        // Note: generic message only — no internal details in the response
    }
}
```

```java
// Custom exception classes — clean business exception hierarchy
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
    // Factory method — descriptive and consistent
    public static ResourceNotFoundException forId(String resource, Long id) {
        return new ResourceNotFoundException(resource + " not found with id: " + id);
    }
}

public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}

public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) { super(message); }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does @ControllerAdvice work in Spring Boot? How is it different from try-catch in each controller?"

**Hruday's answer:**
> `@ControllerAdvice` is a specialised Spring component that acts as a global interceptor for exceptions thrown by any `@Controller` or `@RestController` in the application.
>
> When an exception propagates out of a controller method, Spring's `ExceptionHandlerExceptionResolver` looks for a method annotated with `@ExceptionHandler` that matches the exception type. It searches first in the same controller, then in any `@ControllerAdvice` class. When it finds a match, it calls that method and uses its return value as the HTTP response.
>
> Compared to try-catch in each controller: try-catch is local — it only handles exceptions in that specific method. If you have 50 controller methods, you need 50 try-catch blocks for the same exception type. Miss one and you get a 500 with a stack trace. `@ControllerAdvice` is global — one handler works for every controller in the entire application simultaneously.
>
> The other benefit: consistent response format. All error responses go through one place, so every error follows the same JSON structure — `code`, `message`, `status`, `timestamp`. Frontend and partner clients can write one error parser that works for all error scenarios.

---

### Q2 — Deep Dive
**Interviewer asks:** "Your API is returning stack traces in production error responses. How did this happen and how do you fix it?"

**Hruday's answer:**
> This typically happens in one of two ways.
>
> First: no `@ControllerAdvice` configured. Spring Boot's default `/error` endpoint (via `BasicErrorController`) includes the `trace` field in its JSON response when `server.error.include-stacktrace=always` is set (or when the default is `on-param` and someone calls with `?trace=true`). Fix: set `server.error.include-stacktrace=never` in `application.properties` for production AND add a `@ControllerAdvice` so the default error endpoint is never reached.
>
> Second: a developer wrote `@ExceptionHandler` methods that include `ex.getMessage()` or `ex.toString()` in the response body — and `ex.getMessage()` for some exceptions includes internal class names or SQL. Fix: use a fixed, generic message in the response for unexpected exceptions: "An unexpected error occurred." Log the full exception server-side with its stack trace (for on-call debugging), but never send it to the client.
>
> The production fix in one shot: in your catch-all `@ExceptionHandler(Exception.class)` method, always return a fixed body: `{"code": "INTERNAL_ERROR", "message": "An unexpected error occurred. Please try again later."}`. Log the exception with full details (`log.error("Unexpected error", ex)`) so your monitoring system (Splunk, ELK, Datadog) catches it. The client never sees the internals; your engineers see everything they need in the logs.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use `@ResponseStatus` on an exception class instead of `@ControllerAdvice`?"

**Hruday's answer:**
> `@ResponseStatus` on the exception class is the simplest approach when you have a small, well-defined exception with a fixed HTTP status and a static message.
>
> ```java
> @ResponseStatus(HttpStatus.NOT_FOUND)
> public class OrderNotFoundException extends RuntimeException {}
> ```
>
> This is useful for prototypes, small internal services, or when you need a quick mapping without the overhead of a full `@ControllerAdvice` class. Spring uses `ResponseStatusExceptionResolver` to read this annotation and return the right status code.
>
> BUT: it has real limitations. The response body from `@ResponseStatus` uses Spring's default error format — the `{timestamp, status, error, path}` format from `BasicErrorController`, not your custom `ErrorResponse` DTO. So your error format is inconsistent with everything else.
>
> More critically: if you want different messages for different instances of the same exception (e.g., "Order 42 not found" vs "Order 99 not found"), `@ResponseStatus` cannot do it — the `reason` attribute is a fixed string. `@ControllerAdvice` can read `ex.getMessage()` and put it in the response.
>
> My rule: use `@ResponseStatus` only in test code or very simple services. Production APIs should always use `@ControllerAdvice` for full control over the response body, format, and log output.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the error handling strategy for a payment API that serves both a web frontend and third-party merchant integrations."

**Hruday's answer:**
> A payment API has two very different consumers with different error handling needs.
>
> The web frontend needs: a consistent JSON error format with a user-facing message it can display, field-level validation errors for form highlighting, and error codes it can map to UI strings (for internationalization).
>
> The merchant integration needs: machine-readable error codes they can programmatically handle, consistent format across every endpoint, error documentation in their SDK, and no internal details that could change and break their integration.
>
> Both needs are met with one `@ControllerAdvice` that returns:
> ```json
> {
>   "code": "PAYMENT_INSUFFICIENT_FUNDS",
>   "message": "The payment could not be processed due to insufficient funds.",
>   "status": 422,
>   "timestamp": "2026-03-25T10:30:00Z",
>   "requestId": "req-abc-123"   ← for tracing calls back to logs
> }
> ```
>
> The `requestId` is the key for merchants — they include it in support tickets and we can find the exact transaction in logs. Never expose `orderId`, internal DB IDs, or exception class names.
>
> I add a separate handler for `ConstraintViolationException` (from `@Validated` on service methods) and `MethodArgumentNotValidException` (from `@Valid` on request bodies) that produces field-level errors for form validation.
>
> Logging: all 4xx logged at WARN (client error), all 5xx logged at ERROR (server error) with the full stack trace — but only in the server logs, never in the API response.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Catch Exception.class for everything" | "One catch-all handles everything" | "Order your `@ExceptionHandler` methods from most specific to least specific. If you have `handleOrderNotFound(OrderNotFoundException ex)` AND `handleAll(Exception ex)`, the specific handler wins for `OrderNotFoundException`. But if you have only the catch-all, every exception returns a generic message even when a specific, helpful message could be given. Specific handlers first, catch-all as the final safety net." |
| "`@ControllerAdvice` handles service layer exceptions too" | "Put all exception handling in the advice" | "`@ControllerAdvice` handles exceptions that propagate to the DispatcherServlet layer — i.e., exceptions thrown in or from controllers. Exceptions in services that are caught and rethrown reach the advice. BUT: exceptions in `@Async` methods, scheduled `@Scheduled` tasks, and Kafka `@KafkaListener` handlers do NOT reach `@ControllerAdvice`. These need their own error handling mechanisms." |
| "Always return 500 for unknown exceptions" | "If I don't know it, return 500" | "500 is correct for server errors — but log the full exception. Without a proper error log, your catch-all handler is silent. Use `log.error('Unexpected error at {} {}', method, uri, exception)` — the SLF4J API appends the stack trace to the log when you pass `exception` as the last argument. Monitoring alerts on ERROR-level logs will notify on-call. Without logging, you have 500s with no context." |
| "Include the exception message in all responses" | "`ex.getMessage()` is safe to return" | "`ex.getMessage()` for JPA exceptions often contains SQL queries. For type mismatch exceptions, it includes class names. For security exceptions, it can include token details. Always check what each exception's `getMessage()` returns for common failure cases. Use a fixed message for infrastructure exceptions (DB, network) and only use `ex.getMessage()` for domain exceptions where you explicitly control the message." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, I inherited an API service where partner integrations were built against inconsistent error responses — some endpoints returned `{error: 'Not found'}`, others returned the raw Spring exception JSON, and a few returned 200 OK with a null body when resources were missing. I wrote one `@RestControllerAdvice` class with 8 `@ExceptionHandler` methods, introduced a standard `ErrorResponse` record, and updated the exception classes to use descriptive messages. Partner integration tickets dropped by 60% in the next sprint because their error parsers could now reliably detect and handle every failure type."

---

## 8. Scale Evolution

**1,000 users →** One `@ControllerAdvice` class, straightforward exception hierarchy. No performance concern — exception handling is not on the hot path.

**100,000 users →** Error logging becomes important for operational visibility. Use structured logging (log the `requestId`, `userId`, and `errorCode` as structured fields — not just free text) so your log aggregation tool (ELK, Datadog, Splunk) can alert on error rates per error code. Distinguish expected business errors (4xx) from unexpected server errors (5xx) in your monitoring dashboards.

**10 million users →** At this scale, global unhandled exceptions can cascade. Implement error budgets: if the 5xx error rate exceeds X% in a sliding window, automatically open the circuit breaker (Resilience4j) on the downstream service that is causing the errors. The `@ControllerAdvice` catch-all should increment a Micrometer counter on each 5xx — these counters feed the circuit breaker thresholds.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every payment API error must be machine-parseable by merchant SDKs. Inconsistent errors break merchant code. Error codes (not just messages) are part of the API contract. | "What error response format would you use for a payment API? How do you differentiate insufficient funds from a validation error?" |
| Swiggy / Meesho | Mobile apps need structured errors — the app decides what to show the user based on the error code. Raw exception messages cannot be shown to end users. | "How does your exception handler differentiate between user-facing messages and internal log messages?" |
| Adobe / Microsoft | Public developer APIs — developer experience is critical. A consistent, documented error format reduces support tickets. Adobe Sign, Microsoft Graph both publish their error codes. | "How does your global exception handler help with API documentation and developer experience?" |
| Remote / Global roles | `@ControllerAdvice` + `@ExceptionHandler` is a universal senior Spring Boot interview topic. Knowing the exception resolver chain and the security implications of stack traces in responses shows depth. | "What is the difference between @ControllerAdvice and per-controller try-catch? What happens if no handler matches?" |

---

## 10. Related Topics — What to Study Next

- **Topic 57 — @RestController, @RequestMapping, @PathVariable, @RequestBody** — the exception scenarios handled here (404, 422, 400) come directly from the annotations in Topic 57 — these two topics are the happy path and error path of the same request lifecycle
- **Topic 60 — Request Validation (@Valid, Custom Validators)** — `MethodArgumentNotValidException` handled in the `@ControllerAdvice` here is thrown by `@Valid` on `@RequestBody` — Topic 60 covers how to configure and extend validation
- **Topic 45 — Spring Boot Actuator** — Actuator's `/health` and metrics endpoints need their own error handling considerations — they should NOT be caught by your general `@ControllerAdvice` (which applies to your API endpoints)
- **Topic 71 — Circuit Breaker (Resilience4j)** — exception handling and circuit breakers work together — the `@ControllerAdvice` catches the CircuitBreakerOpenException from Resilience4j and returns a graceful 503 fallback response
- **Topic 16 — Observability: Logging** — proper error logging in your `@ExceptionHandler` methods (structured log fields, log levels, correlation IDs) is the foundation of production observability

---

*Part 3 · Exception Handling (@ControllerAdvice, @ExceptionHandler) · Full Stack Interview Guide · Hruday D · 2026*
