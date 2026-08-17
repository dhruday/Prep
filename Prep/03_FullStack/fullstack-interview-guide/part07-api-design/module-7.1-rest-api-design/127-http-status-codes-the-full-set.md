# HTTP Status Codes — The Full Set, Not Just 200 and 404
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **1xx — Informational**: `100 Continue` (send the body), `101 Switching Protocols` (WebSocket upgrade). Rarely used in application code.
- **2xx — Success**: `200 OK` (request succeeded), `201 Created` (resource created — always include `Location` header), `202 Accepted` (request queued, will process async), `204 No Content` (success but no body — use for DELETE and void PATCH), `206 Partial Content` (range request, used for video streaming/large file downloads).
- **3xx — Redirection**: `301 Moved Permanently` (update your bookmark), `302 Found` (temporary redirect), `304 Not Modified` (ETag matched — client cache is still valid, don't send body), `307 Temporary Redirect` (same as 302 but preserves HTTP method — POST stays POST).
- **4xx — Client Error** (client's fault): `400 Bad Request` (malformed syntax, invalid JSON), `401 Unauthorized` (not authenticated — authentication required), `403 Forbidden` (authenticated but not authorized), `404 Not Found`, `405 Method Not Allowed`, `409 Conflict` (state conflict — duplicate order), `410 Gone` (permanently deleted), `422 Unprocessable Entity` (valid JSON but failed business validation), `429 Too Many Requests` (rate limited — always include `Retry-After` header).
- **5xx — Server Error** (our fault): `500 Internal Server Error` (unexpected crash), `502 Bad Gateway` (upstream service unreachable), `503 Service Unavailable` (intentional — maintenance or overloaded, include `Retry-After`), `504 Gateway Timeout` (upstream too slow).
- **Critical interview pair**: `401 vs 403` — 401 means "who are you?" (not authenticated); 403 means "I know who you are, and you can't do this" (authenticated but not authorized). This distinction is a classic interview trap.
- **Critical interview pair**: `400 vs 422` — 400 = malformed/unparseable request; 422 = valid syntax, failed semantic/business validation (correct JSON, but field value violates a business rule).

---

## 1. One-Line Definition
HTTP status codes are the standardised three-digit response codes that tell the client precisely what happened on the server — whether the request succeeded, why it failed, and what the client should do next — and using them correctly determines whether clients retry safely, cache correctly, and display the right error messages.

---

## 2. The Problem It Solves

### When Status Codes Are Wrong — Production Bugs

```
BUG 1: Returning 200 for everything, including errors

Response to GET /orders/999 (order not found):
HTTP/1.1 200 OK
{ "error": "Order not found", "success": false }

Problems this creates:
- Browser caches the 200 response for 3600 seconds (from Cache-Control headers)
  Next time the client requests /orders/999: gets cached "error" response
  The real order might exist now — but client shows stale "not found" from cache
- HTTP client retry logic: 200 = success, no retry
  A service mesh / load balancer sees 200 for every "error" — health checks pass
  Circuit breakers never open — they count only 5xx errors
  Your payment service is "healthy" despite returning error for every payment ❌
- Frontend error handling: if (response.status === 200) show success — always shows success

BUG 2: Using 500 for business validation failures

User creates order with quantity = -5 (invalid).
Response: 500 Internal Server Error

Problems:
- Retry logic retries 500 by default (it's a server error, maybe transient)
  Client retries 3 times with quantity=-5 → same 500 → wasted retries
- The client doesn't know: "I sent wrong data" vs "server crashed"
  Cannot show the user a meaningful error message (should say "quantity must be positive")
- Monitoring alerts: 500 rate spikes → on-call engineer woken up at 3am
  For a validation error that's 100% the client's fault
  On-call checks — finds hundreds of 500s for invalid user inputs → noise in alerts

BUG 3: 401 and 403 confused

User is authenticated (has valid JWT) but tries to access someone else's order:
GET /orders/ORD-9999 (belongs to another user)
Response: 401 Unauthorized

Problems:
- 401 means "not authenticated" → client thinks the JWT expired → triggers re-login flow
  User logs in again, gets a new JWT → retries → gets 401 again → loops
  Actually the user can never access this order — it's 403 Forbidden
- Security: returning 404 (not found) for 403 cases is intentional security practice
  "You don't know this order exists" — resource enumeration prevention
  But returning 401 actively misleads clients into unnecessary re-auth flows
```

---

## 3. How It Works Internally

### The Complete Status Code Reference — What Interviewers Actually Ask About

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 2xx SUCCESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

200 OK
  Meaning: Request succeeded. Body contains the result.
  Use for: GET (returns resource), PUT/PATCH (returns updated resource)
  Common mistake: using 200 for all responses including POST creates

201 Created
  Meaning: A new resource was created.
  ALWAYS include: Location: /api/v1/orders/ORD-003 header
  Use for: POST that creates a resource
  Body: the created resource (or empty if client doesn't need it)

202 Accepted
  Meaning: We accepted the request but haven't processed it yet.
  Processing will happen asynchronously.
  Use for: async operations (video processing, email sending, data export)
  Response body should include: where to check status later
  { "jobId": "job-123", "statusUrl": "/api/v1/jobs/job-123" }

204 No Content
  Meaning: Request succeeded but there's nothing to return.
  Use for: DELETE (resource deleted, nothing to return)
           PATCH operations that don't return the updated resource
  Body: empty (don't send a body with 204 — HTTP spec says not to)

206 Partial Content
  Meaning: Range request succeeded, returning a portion of the resource.
  Use for: large file downloads, video streaming
  Response includes: Content-Range: bytes 0-999/5000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 3xx REDIRECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

301 Moved Permanently
  Meaning: Resource has permanently moved to new URL.
  Client should update bookmarks. Browsers cache 301 aggressively.
  Use for: API versioning migration (/v1 → /v2), domain changes

302 Found (Temporary Redirect)
  Meaning: Resource temporarily at this other URL.
  Client follows, but doesn't update bookmarks.
  ⚠️ Browsers convert POST → GET when following 302. Known quirk.

304 Not Modified
  Meaning: The copy you have in cache is still current. Use it.
  Response has NO body — saving bandwidth.
  How it works: client sends "If-None-Match: etag123" or "If-Modified-Since: [date]"
  Server checks: resource unchanged? Return 304 — client uses cached version.
  Use for: conditional GET requests on resources that change infrequently

307 Temporary Redirect
  Meaning: Like 302 but PRESERVES the HTTP method.
  POST stays POST when following 307 (unlike 302 where POST becomes GET).
  Use for: redirecting form submissions, maintaining PUT/DELETE semantics

308 Permanent Redirect
  Meaning: Like 301 but PRESERVES the HTTP method.
  POST stays POST (unlike 301 where POST becomes GET).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 4xx CLIENT ERROR (client did something wrong)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

400 Bad Request
  Meaning: Malformed syntax — server can't parse the request.
  Unparseable JSON, missing required header, URL encoding errors.
  Retrying with the same request will always fail.
  Use for: truly invalid request structure.

401 Unauthorized (misleading name — actually means "not authenticated")
  Meaning: You haven't proven who you are. Show me credentials.
  Include: WWW-Authenticate header telling the client HOW to authenticate
  Examples: missing JWT, expired JWT, invalid JWT signature
  Client action: show login screen, refresh the token

403 Forbidden
  Meaning: I know who you are, but you can't do this.
  Authenticated but not authorized.
  Examples: user trying to delete another user's order,
            trying to access admin endpoint without admin role
  Client action: show "access denied" message, NOT a login screen
  
  Security note: 404 preferred over 403 for resource enumeration prevention.
  "We can't tell you this order exists" → return 404 even if it exists but you can't see it.
  This prevents attackers from probing which resource IDs exist.

404 Not Found
  Meaning: Resource doesn't exist at this URI.
  Also used intentionally for: resources that exist but the caller can't access (security)
  
405 Method Not Allowed
  Meaning: Resource exists but doesn't support this HTTP method.
  Include: Allow: GET, PUT header listing supported methods
  Example: POST /orders/ORD-42 (POST on a specific resource, not the collection)

408 Request Timeout
  Meaning: Client took too long to send the complete request.
  Server gave up waiting.

409 Conflict
  Meaning: Request conflicts with current resource state.
  Use for: duplicate order with same idempotency key + different params,
           optimistic lock version mismatch,
           trying to ship an already-cancelled order
  Body should describe what conflicted and current state.

410 Gone
  Meaning: Resource USED TO exist but is permanently deleted.
  Unlike 404 (never knew), 410 says "it existed, we deleted it".
  Use for: expired promo codes, deleted user accounts that shouldn't be re-created
  Clients should remove the resource from bookmarks.

422 Unprocessable Entity
  Meaning: Syntax is fine (valid JSON), but semantic validation failed.
  Business rule violations, invalid field values, constraint violations.
  Examples: order quantity=-5, email address format invalid, future birthdate
  Body should include: which fields failed and why
  Distinguished from 400: JSON parsed fine, contents are logically wrong.

429 Too Many Requests
  Meaning: You've exceeded the rate limit. Slow down.
  ALWAYS include: Retry-After: 30 (seconds until they can retry)
  Optionally include: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 5xx SERVER ERROR (we did something wrong)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

500 Internal Server Error
  Meaning: Something unexpected broke on our side.
  NEVER return 500 for client validation errors — use 4xx.
  Body: error ID for tracing (NOT stack traces in production — security risk).
  Client: retry with backoff (server error might be transient).

502 Bad Gateway
  Meaning: The server is a gateway/proxy and got an invalid response from upstream.
  Common in API gateway setups. Upstream service is down or returning garbage.

503 Service Unavailable
  Meaning: Server intentionally unable to handle request right now.
  Use for: planned maintenance mode, deliberate overload shedding.
  ALWAYS include: Retry-After header
  Circuit breakers watch for 503 to open quickly.

504 Gateway Timeout
  Meaning: Gateway/proxy waited for upstream service and it didn't respond in time.
  Distinct from 503: upstream didn't respond vs upstream refused connection.
  Common in microservices: payment service called inventory service, inventory timed out.
```

---

## 4. The Code

### ❌ Wrong Way — Incorrect Status Code Usage

```java
// ❌ WRONG: 200 for everything, 500 for validation, auth codes confused
@RestController
public class BadStatusCodeController {

    @PostMapping("/orders")
    public ResponseEntity<Map<String, Object>> createOrder(@RequestBody OrderRequest req) {
        if (req.getQuantity() <= 0) {
            // ❌ 500 for a client validation error — triggers unnecessary retries + ops alerts
            return ResponseEntity.status(500)
                .body(Map.of("error", "Invalid quantity"));
        }

        if (!currentUser.canCreateOrders()) {
            // ❌ 401 for authorization failure — client thinks JWT expired, triggers re-login loop
            return ResponseEntity.status(401)
                .body(Map.of("error", "Not allowed"));
        }

        try {
            Order order = orderService.create(req);
            // ❌ 200 for resource creation — should be 201 with Location header
            return ResponseEntity.ok(Map.of("order", order));
        } catch (Exception e) {
            // ❌ Never expose stack trace — security risk
            return ResponseEntity.status(500)
                .body(Map.of("error", e.getMessage(), "stackTrace", Arrays.toString(e.getStackTrace())));
        }
    }
}
```

> **Why this fails in production:** 5xx for client errors pollutes monitoring, circuit breakers react to false server failures, retry logic retries unretriable requests. 401 for authorization sends clients into infinite re-auth loops.

---

### ✅ Right Way — Correct Status Codes with Spring

```java
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/orders")
    public ResponseEntity<OrderDto> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal JwtUserDetails user) {

        // ✅ @Valid handles: missing fields, format violations → 400 automatically via @ExceptionHandler
        // ✅ Business logic here

        OrderDto order = orderService.create(request, user.getUserId());

        // ✅ 201 Created + Location header pointing to the new resource
        URI location = WebMvcLinkBuilder.linkTo(
            WebMvcLinkBuilder.methodOn(OrderController.class).getOrder(order.getOrderId(), user)
        ).toUri();

        return ResponseEntity.created(location).body(order);
    }

    @GetMapping("/orders/{orderId}")
    public ResponseEntity<OrderDto> getOrder(
            @PathVariable String orderId,
            @AuthenticationPrincipal JwtUserDetails user) {

        Order order = orderService.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderId));
            // ✅ ResourceNotFoundException → @ExceptionHandler → 404

        // ✅ Security: if the order exists but user can't access it, throw 404 (not 403)
        // Reason: don't reveal to an attacker that this orderId exists in the system
        if (!order.getBelongsTo().equals(user.getUserId()) && !user.hasRole("ADMIN")) {
            throw new ResourceNotFoundException("Order not found: " + orderId);
            // ✅ 404 on unauthorized access — resource enumeration prevention
        }

        return ResponseEntity.ok()
            .eTag(order.getVersion().toString())                    // ✅ ETag for conditional GET
            .cacheControl(CacheControl.noCache())                   // ✅ Private data — no shared cache
            .body(OrderDto.from(order));
    }

    @DeleteMapping("/orders/{orderId}")
    public ResponseEntity<Void> cancelOrder(
            @PathVariable String orderId,
            @AuthenticationPrincipal JwtUserDetails user) {

        try {
            orderService.cancel(orderId, user.getUserId());
            return ResponseEntity.noContent().build();              // ✅ 204 No Content — deleted, nothing to return
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();               // ✅ 404 — already gone (idempotent delete)
        } catch (InvalidStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).     // ✅ 409 Conflict — can't cancel shipped order
                body(null);
        }
    }

    @PostMapping("/orders/{orderId}/async-report")
    public ResponseEntity<JobDto> generateReport(@PathVariable String orderId) {
        JobDto job = reportService.scheduleReport(orderId);
        // ✅ 202 Accepted: we'll process it, check back at statusUrl
        URI statusUri = URI.create("/api/v1/jobs/" + job.getJobId());
        return ResponseEntity.accepted()                            // 202
            .location(statusUri)
            .body(job);
    }
}
```

### ✅ Global Exception Handler — Mapping Exceptions to Status Codes

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // ✅ 400: malformed request structure (unparseable JSON, missing required body)
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMalformedJson(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
            .body(ErrorResponse.of("MALFORMED_REQUEST", "Request body is malformed or missing"));
    }

    // ✅ 400: Spring's @Valid / @Validated throws this for field-level validation failures
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors()
            .stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value"
            ));
        return ResponseEntity.badRequest()
            .body(ErrorResponse.ofValidationErrors(fieldErrors));
    }

    // ✅ 422: business validation (valid JSON, semantically wrong per business rules)
    @ExceptionHandler(BusinessValidationException.class)
    public ResponseEntity<ErrorResponse> handleBusinessValidation(BusinessValidationException ex) {
        return ResponseEntity.unprocessableEntity()
            .body(ErrorResponse.of("BUSINESS_RULE_VIOLATED", ex.getMessage()));
    }

    // ✅ 404: resource not found (also used for security 403 → 404 conversions)
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.notFound().build();
    }

    // ✅ 409: state conflicts (duplicate, optimistic lock failure)
    @ExceptionHandler(StateConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(StateConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
            .body(ErrorResponse.of("CONFLICT", ex.getMessage()));
    }

    // ✅ 429: rate limit exceeded — always include Retry-After
    @ExceptionHandler(RateLimitExceededException.class)
    public ResponseEntity<ErrorResponse> handleRateLimit(RateLimitExceededException ex) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
            .header(HttpHeaders.RETRY_AFTER, String.valueOf(ex.getRetryAfterSeconds()))
            .body(ErrorResponse.of("RATE_LIMITED", "Too many requests. Retry after " + ex.getRetryAfterSeconds() + "s"));
    }

    // ✅ 500: unexpected errors — log internally, return error ID (not stack trace)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex, HttpServletRequest request) {
        String errorId = UUID.randomUUID().toString();
        // ✅ Log full details internally with errorId for tracing
        log.error("Unexpected error [errorId={}] on request {} {}: {}",
            errorId, request.getMethod(), request.getRequestURI(), ex.getMessage(), ex);

        // ✅ Return only errorId to client — never expose stack trace, cause, or internal details
        return ResponseEntity.internalServerError()
            .body(ErrorResponse.of("INTERNAL_ERROR",
                "An unexpected error occurred. Reference ID: " + errorId));
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Classic Trap
**Interviewer asks:** "What is the difference between 401 and 403?"

**Hruday's answer:**
> 401 Unauthorized means the server doesn't know who you are — authentication is missing or failed. The name is misleading because "unauthorized" sounds like a permission issue, but 401 is specifically about identity. A missing JWT, an expired token, an invalid signature — these all produce 401. The client's response should be to authenticate: show the login screen, refresh the token, re-send credentials.
>
> 403 Forbidden means the server knows exactly who you are, but you're not allowed to do this specific thing. Authentication succeeded; authorisation failed. A user trying to access another user's payment history, or a regular user calling an admin endpoint — these produce 403. The client's response should be to show an "access denied" message — NOT to re-authenticate, because re-authenticating doesn't help when the problem is permissions.
>
> The practical bug this causes: when teams return 401 for authorization failures, clients enter an infinite re-authentication loop. They log in, get a new token, retry the request, get 401 again, log in again. The issue is permissions, not identity — but the status code sends the client in the wrong direction.
>
> Security nuance: for resources that exist but the requester can't access, return 404 instead of 403. This prevents resource enumeration — attackers probing which IDs exist by using your 403 responses as confirmation that the resource exists.

---

### Q2 — Scenario
**Interviewer asks:** "A user submits a payment form with an invalid card number. What status code should the API return, and why?"

**Hruday's answer:**
> I'd return 422 Unprocessable Entity with a structured error body describing which field failed and why.
>
> Here's the reasoning. The request is syntactically valid — it's well-formed JSON, all required fields are present, the server can parse it. The problem is semantic: the card number fails the Luhn check or doesn't match a known card network format. That's a business validation failure, not a syntax error.
>
> 400 Bad Request would imply the server couldn't parse or understand the request — not the case here. 422 specifically means "I understood the request, but it violates business or semantic rules."
>
> The response body would be:
> ```json
> {
>   "code": "VALIDATION_FAILED",
>   "message": "Payment request contains invalid fields",
>   "errors": {
>     "cardNumber": "Invalid card number format"
>   }
> }
> ```
>
> The client (whether it's a React form or a merchant SDK) can then display "Invalid card number" next to the specific field. If I returned 400, the client might interpret it as a malformed request and not know which field failed.
>
> Retry behaviour: 422 tells the client "retrying with the same data will fail again." Don't retry. Ask the user to fix the input. That's the correct client behaviour for a 422.

---

### Q3 — Deep Dive
**Interviewer asks:** "When would you use 202 Accepted, and what should the response body contain?"

**Hruday's answer:**
> 202 Accepted is for operations that take longer than a request-response cycle allows. The server says "I've received your request and will process it, but it's not done yet." Classic cases: generating a large report, processing a bulk import, kicking off a video transcoding job, sending a large batch of emails.
>
> The response body should give the client everything it needs to track progress and retrieve results:
> ```json
> {
>   "jobId": "job-a1b2c3",
>   "status": "QUEUED",
>   "statusUrl": "/api/v1/jobs/job-a1b2c3",
>   "estimatedDuration": "PT5M"
> }
> ```
> Most importantly: the `statusUrl`. The client polls this endpoint to check job status. When the job completes: the status endpoint returns 200 with the result, and ideally a `resultUrl` pointing to where the completed output lives.
>
> Alternative to polling: the server sends a webhook to a client-provided callback URL when done. Or uses Server-Sent Events (Topic 133) to push status updates. Which pattern to use depends on latency requirements and whether the client can receive callbacks.
>
> 202 is distinct from 200 + async processing: if you return 200 but actually processed async, the client thinks it's done immediately and might act on the result. 202 sets correct expectations.

---

### Q4 — Monitoring Angle
**Interviewer asks:** "How do you use HTTP status codes to set up meaningful monitoring and alerting?"

**Hruday's answer:**
> Status codes directly feed monitoring strategy. The key insight: 4xx and 5xx are fundamentally different alert signals.
>
> 5xx errors are server problems — always alert. A spike in 500s or 503s means our code is crashing, a dependency is down, or we're overloaded. These need immediate attention. SLA metrics track 5xx rate: if 5xx rate exceeds 0.1% of requests over 2 minutes, page the on-call engineer.
>
> 4xx errors are client problems — monitor but don't blindly alert. A spike in 400s might mean a client SDK has a bug, an API consumer is calling incorrectly, or a deployment changed the request format. 429 spikes tell you about load patterns. 401 spikes tell you about auth issues. These need dashboards, not 3am pages — mostly.
>
> Exception: sudden 401 or 403 spikes at unusual times can indicate security events — brute force auth attempts, credential stuffing. Those do warrant security alerts.
>
> Circuit breakers in microservices (Resilience4j) typically open on 5xx errors. If our payment service returns 503 10 times in 30 seconds, the circuit breaker opens. This only works correctly if we NEVER return 5xx for client-side validation errors. That's why the 4xx/5xx split discipline matters: mixing them up causes circuit breakers to open incorrectly on data validation spikes.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "200 is fine for all success cases" | "I just return 200 with a JSON body containing success/error info" | "200 for resource creation (should be 201), 200 for async acceptance (should be 202), 200 for no-content responses (should be 204) all lose semantic information that clients, caches, and infrastructure depend on. 201 without a Location header means API consumers don't know where to find the new resource. 200 vs 202 affects whether a client thinks the operation is complete. 204 vs 200 with empty body: 204 explicitly signals no body — some clients break if they try to parse an empty 200 response body. Use the right 2xx code, not just 200 for everything." |
| "Return the actual exception message in 500" | "I return the exception message so clients know what went wrong" | "Never expose internal exception messages, stack traces, class names, or file paths in 500 responses. These are security vulnerabilities: stack traces reveal internal architecture, framework versions, file structure, and sometimes credentials. A `java.sql.SQLSyntaxErrorException: You have an error in your SQL syntax... table 'users_table'` tells an attacker your exact table name. PCI-DSS and OWASP explicitly prohibit exposing stack traces. Return a correlation ID / error reference number in the 500 body. Log the full exception internally against that ID. Operations team looks up the error by ID in Kibana. Client gets: `{ 'errorId': 'ERR-abc123', 'message': 'An unexpected error occurred' }` — informative enough to report, zero information leakage." |
| "429 with no Retry-After header is fine" | "I return 429 to indicate rate limiting — the client will figure out when to retry" | "Returning 429 without a Retry-After header forces clients to implement their own backoff strategy, often poorly. They may retry immediately in a tight loop — making the overload situation WORSE. Retry-After tells the client exactly how long to wait. `Retry-After: 30` means wait 30 seconds. Every client SDK and HTTP library knows to honour this header. Without it: some clients retry in 1 second repeatedly, amplifying the load on your rate-limited service. The header costs one line of code on the server side and prevents unnecessary load amplification. Always include it with 429, and ideally with 503 too." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, we built financial REST APIs for Oracle ERP workflows — expense reports, purchase orders, financial approvals. Early versions of the API returned 500 for business validation failures: 'approval workflow not found,' 'insufficient budget,' 'fiscal year closed.' This created a nightmare in monitoring — the ops team was drowning in 500 alerts that were actually data/configuration issues in specific customer ERP setups, not server crashes. We systematically reclassified: business rule violations became 422 with structured field-level error responses, missing authorisations became 403, data conflicts became 409. Within a week, the 5xx alert noise dropped by 70%, and the client-side Angular form validation errors became actually actionable because the error responses now mapped directly to specific form fields."

---

## 8. Scale Evolution

**1,000 users →** Consistent 4xx/5xx usage with `@ControllerAdvice`. ErrorResponse DTO with code, message, timestamp. 500s log to application log with error context for debugging.

**100,000 users →** Status code rate monitoring in Prometheus: `http_requests_total{status="5xx"}` alert on rate > 0.5%. 429 with `Retry-After` on all rate-limited endpoints. 404 rate monitoring (spike might indicate client-side bugs or API breaking change). Structured JSON error responses with `requestId` (correlation ID) in every error response for tracing across services.

**10 million users →** API Gateway level: 429 enforcement before requests reach app servers (token bucket at gateway — not app). All 5xx responses include `X-RequestId` matching distributed trace ID in Jaeger/Zipkin. 503 from overloaded services triggers circuit breaker at gateway — load shedding before app servers are overwhelmed. Status code distribution dashboards: real-time plots of 2xx/4xx/5xx ratios per endpoint, per country, per client version.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant integrations depend on correct status codes to build retry logic. Wrong 5xx for validation failures causes merchants to set up incorrect retry automation that can attempt double-payments. 429 with Retry-After protects against merchant traffic spikes overwhelming payment rails. | "A merchant integration is getting 5xx errors on valid payment requests. How do you investigate and what does the status code tell you about where to look?" |
| Swiggy / Meesho | Mobile clients (React Native, Flutter) implement retry logic based on status codes. 503 + Retry-After during lunch peak prevents mobile app retry storms. 202 for async order confirmation flows gives correct UX. | "How do you design status codes for a Swiggy order API so that mobile client retry logic handles peak load gracefully without creating duplicate orders?" |
| Adobe / Microsoft | Enterprise SDK clients rely on status codes for automated error recovery. 303 See Other for asynchronous document processing workflows. 416 Range Not Satisfiable for large document chunk streaming. | "Design the HTTP status code strategy for an Adobe document processing API supporting both synchronous small-file and asynchronous large-file processing." |
| SAP Labs (current) | ERP integration partners write automated workflows that react to status codes. 409 Conflict for optimistic locking failures in concurrent ERP document editing. 422 for fiscal year constraints. | "SAP partners are building automated ERP document workflows. Which status codes do you use to signal retryable vs non-retryable failures, and how do error response bodies help partners build robust integrations?" |

---

## 10. Related Topics — What to Study Next

- **Topic 126 — HTTP Methods** — status codes pair with HTTP methods: POST → 201, DELETE → 204/404, GET → 200/304/404; understanding both together gives the complete HTTP semantic picture for REST API design
- **Topic 125 — REST Principles** — self-descriptive messages (REST constraint 4c) require correct status codes; status codes are how HTTP messages describe their own meaning to intermediaries, caches, and clients
- **Topic 136 — API Gateway** — gateways route and rate-limit based on status codes; understanding how infrastructure (Nginx, Kong, AWS ALB) interprets 5xx vs 4xx is essential for designing resilient systems that fail gracefully at the gateway layer
- **Topic 138 — Circuit Breaker at API Level** — Resilience4j circuit breakers open based on 5xx error rates; if validation errors return 5xx, circuit breakers trigger prematurely; correct 4xx usage prevents false circuit opens

---

*Part 7 · HTTP Status Codes — The Full Set · Full Stack Interview Guide · Hruday D · 2026*
