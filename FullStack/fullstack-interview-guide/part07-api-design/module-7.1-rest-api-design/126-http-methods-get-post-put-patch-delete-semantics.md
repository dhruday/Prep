# HTTP Methods — GET, POST, PUT, PATCH, DELETE Semantics
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **GET**: read a resource. Safe (no side effects) + idempotent (safe to repeat many times — same result). Never changes server state. Cacheable by default. Never put a request body in GET.
- **POST**: create a new resource or trigger an action. NOT safe, NOT idempotent (calling twice creates two resources). Not cacheable by default. Use for: creating orders, submitting payments, sending messages.
- **PUT**: replace an entire resource with what you send. NOT safe, but IS idempotent (sending the same PUT 5 times = same final state). If you omit a field, it becomes missing. Use for: full profile updates.
- **PATCH**: partial update — update ONLY the fields you send, leave the rest unchanged. NOT safe. Typically idempotent, but can be designed as non-idempotent. Use for: updating order status, changing one preference.
- **DELETE**: remove a resource. NOT safe, IS idempotent (deleting what's already deleted = 404, but state is the same). Use for: cancelling orders, removing cart items.
- **Critical interview answer**: Idempotent means "calling it once vs calling it N times produces the same server state." GET, PUT, DELETE are idempotent. POST is NOT. PATCH is typically idempotent by design. This matters for retry logic: you can safely retry an idempotent method; retrying POST without an idempotency key creates duplicates.
- **Safety**: safe methods (GET, HEAD, OPTIONS) make no changes to server state. Unsafe methods (POST, PUT, PATCH, DELETE) can change state.

---

## 1. One-Line Definition
HTTP methods are the verbs of the Uniform Interface constraint — each carries precise semantics for safety (does it change state?), idempotency (is it safe to repeat?), and cacheability (can intermediaries store the response?) — and using the wrong verb breaks client expectations, caches, and retry logic.

---

## 2. The Problem It Solves

### When Teams Ignore HTTP Semantics — Real Production Bugs

```
ANTI-PATTERN: POST for everything

POST /api/getUser         → returns user (should be GET)
POST /api/deleteOrder     → deletes order (should be DELETE)
POST /api/createOrder     → creates order (OK, but could be POST /orders)

Problems this creates:

1. CACHING BROKEN:
   Browsers and CDNs cache GET responses automatically.
   POST responses are never cached.
   GET /products/42 → CDN serves from cache for 3600 seconds (zero backend load)
   POST /api/getProduct/42 → CDN cannot cache → every request hits backend
   At 1M requests/day on product catalog: enormous unnecessary load.

2. BROWSER BACK BUTTON BUG:
   Browser hits POST → user clicks back → browser shows "Resend form data?" dialog.
   Because GET is safe and cacheable — browser can replay it silently.
   POST is not safe — browser warns you.
   "Always POST" breaks browser navigation for users.

3. RETRY LOGIC BROKEN:
   HTTP client: POST /orders fails with 503.
   Retry? Unsafe — might create a duplicate order.
   DELETE /orders/42 fails with 503.
   Retry? Safe — idempotent, retrying delete of same resource is fine.
   Libraries like Resilience4j retry logic respects HTTP method semantics.
   Ignoring semantics → duplicates on retry or missing retry where safe.

4. SEARCH ENGINE AND CDN INDEXING:
   GET /products → CDN can cache, search engines can index.
   POST /products → No caching, no indexing.
   Public catalog APIs using POST lose all CDN and browser caching benefits.
```

---

## 3. How It Works Internally

### HTTP Method Properties: Safety + Idempotency + Cacheability

```
Method    | Safe | Idempotent | Cacheable | Request Body
----------|------|------------|-----------|-------------
GET       |  ✅  |     ✅     |    ✅     | No (ignore if sent)
HEAD      |  ✅  |     ✅     |    ✅     | No
OPTIONS   |  ✅  |     ✅     |    No     | No
POST      |  ❌  |     ❌     |    No*    | Yes
PUT       |  ❌  |     ✅     |    No     | Yes
PATCH     |  ❌  |    ✅/❌   |    No     | Yes
DELETE    |  ❌  |     ✅     |    No     | Usually No

* POST responses can be cached with explicit Cache-Control — rare in practice.

SAFE = the method does not change server state. Pure read.
  - Clients can repeat safe calls freely (browser prefetching, health checks)
  - Caches store safe method responses
  - NOT SAFE ≠ dangerous — it just means the server state may change

IDEMPOTENT = calling once or N times leaves server in the same final state
  It does NOT mean the response is identical every time (DELETE returns 200 first time, 404 second)
  It means the RESOURCE STATE is the same after N calls as after 1 call
  
  Idempotent: PUT /orders/42 { status: SHIPPED }
    Call 1: order 42 changes to SHIPPED → 200
    Call 2: order 42 is already SHIPPED → 200 (or 204)
    State after 1 call = State after 2 calls = order 42 is SHIPPED ✅
  
  Not idempotent: POST /orders
    Call 1: creates order ORD-001 → 201
    Call 2: creates order ORD-002 → 201
    State after 2 calls ≠ State after 1 call ❌ (two orders vs one)
```

### POST vs PUT vs PATCH — The Differences That Trip People Up

```
POST /orders          — create a NEW order, server assigns the ID
  {                     Server decides: "this is order ORD-003"
    "userId": 42,       Response 201 + Location: /orders/ORD-003
    "amount": 499.99
  }
  
  "I'm giving you data, you decide where to put it."

PUT /orders/ORD-003   — REPLACE order ORD-003 with exactly this
  {                     If you omit "notes" field — notes becomes null/gone.
    "userId": 42,       This is a FULL replacement.
    "amount": 499.99    Client must send the complete representation.
  }                     Response: 200 OK or 204 No Content
  
  "Replace exactly what I'm sending."

PATCH /orders/ORD-003  — UPDATE only these specified fields on ORD-003
  {                      "userId" and all other fields: untouched.
    "status": "SHIPPED", Only "status" and "trackingId" change.
    "trackingId": "TK1"  Response: 200 OK with updated resource
  }
  
  "Change only what I'm specifying."

DECISION RULE:
  POST  → create new resource, server assigns ID
  PUT   → full replacement when client knows the entire resource state
  PATCH → update specific fields when changing one or two things
  
  In practice: PATCH is used far more than PUT in modern REST APIs
  because clients rarely want to send the entire resource to change one field.
```

### DELETE Idempotency — What 404 Actually Means

```
Common confusion: "DELETE returns 404 on second call — isn't that different behaviour?"

DELETE /orders/ORD-003
  Call 1: order exists → delete it → 200 OK or 204 No Content
  Call 2: order does NOT exist → 404 Not Found

The responses are different. But the RESOURCE STATE is the same:
  After call 1: order ORD-003 does not exist
  After call 2: order ORD-003 does not exist
  
Same resource state → DELETE is idempotent.

The 404 on second call is informational — it tells you the resource was already gone.
It does NOT mean the operation failed in a harmful way.
Some APIs return 204 on repeated DELETE to make idempotency more explicit —
both are valid, team convention decides.

When does DELETE NOT become idempotent?
  If your DELETE returns 404 AND triggers a side effect (like "resource not found,
  create an incident ticket") — then repeated DELETE causes repeated incident tickets.
  That's a side effect — not idempotent. Design side effects carefully.
```

---

## 4. The Code

### ❌ Wrong Way — HTTP Method Misuse

```java
// ❌ WRONG: Everything via POST, verbs in URI, broken semantics
@RestController
@RequestMapping("/api")
public class BadApiController {

    // ❌ Reading via POST — bypasses all caching, breaks CDN
    @PostMapping("/getProduct")
    public Product getProduct(@RequestBody Map<String, Long> body) {  // ❌ ID in body, not URI
        return productService.findById(body.get("id"));
    }

    // ❌ Verb in URI — anti-pattern
    @PostMapping("/deleteOrder")
    public void deleteOrder(@RequestBody Map<String, String> body) {
        orderService.delete(body.get("orderId"));
    }

    // ❌ POST for idempotent operation — retries create duplicates
    @PostMapping("/updateOrderStatus")
    public Order updateStatus(@RequestBody UpdateRequest req) {
        // Retrying this POST: might update status twice with race conditions
        return orderService.setStatus(req.getOrderId(), req.getStatus());
    }

    // ❌ Using POST to read list — breaks all HTTP caching
    @PostMapping("/listUserOrders")
    public List<Order> listForUser(@RequestBody UserFilter filter) {
        return orderService.findForUser(filter.getUserId());  // Should be GET /users/{id}/orders
    }
}
```

> **Why this fails in production:** Caching for read-heavy endpoints is lost, CDNs can't cache, retry logic in HTTP clients doesn't safely retry POST (risk of duplicates), and the API is unpredictable for consumers.

---

### ✅ Right Way — Correct HTTP Method Semantics

```java
@RestController
@RequestMapping("/api/v1")
public class OrderController {

    // ✅ GET: read, safe, idempotent, cacheable
    @GetMapping("/products/{productId}")
    public ResponseEntity<ProductDto> getProduct(@PathVariable Long productId) {
        ProductDto product = productService.findById(productId);
        return ResponseEntity.ok()
            .cacheControl(CacheControl.maxAge(3600, TimeUnit.SECONDS).cachePublic()) // ✅ CDN-cacheable: product data doesn't change often
            .body(product);
    }

    // ✅ GET with query params: list read, safe, cacheable (private)
    @GetMapping("/orders")
    public ResponseEntity<Page<OrderDto>> listOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal JwtUserDetails user) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noCache())  // User-specific, don't cache publicly
            .body(orderService.findByUser(user.getUserId(), page, size, status));
    }

    // ✅ POST: create new resource, server assigns ID, NOT idempotent
    @PostMapping("/orders")
    public ResponseEntity<OrderDto> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal JwtUserDetails user) {

        OrderDto created = orderService.create(request, user.getUserId());
        // ✅ 201 Created + Location header pointing to the new resource
        URI location = URI.create("/api/v1/orders/" + created.getOrderId());
        return ResponseEntity.created(location).body(created);
    }

    // ✅ PUT: full replacement (idempotent — retrying produces same state)
    @PutMapping("/orders/{orderId}")
    public ResponseEntity<OrderDto> replaceOrder(
            @PathVariable String orderId,
            @Valid @RequestBody OrderDto fullOrderRepresentation) {

        // Client sends the ENTIRE order — PUT replaces completely
        OrderDto updated = orderService.replace(orderId, fullOrderRepresentation);
        return ResponseEntity.ok(updated);
        // Calling this 3 times with the same body → same final state ✅
    }

    // ✅ PATCH: partial update (change only what's specified)
    @PatchMapping("/orders/{orderId}/status")
    public ResponseEntity<OrderDto> updateOrderStatus(
            @PathVariable String orderId,
            @Valid @RequestBody UpdateStatusRequest request) {

        // Only updates status + reason — all other fields untouched
        OrderDto updated = orderService.updateStatus(orderId, request.getStatus(), request.getReason());
        return ResponseEntity.ok(updated);
    }

    // ✅ DELETE: remove resource (idempotent)
    @DeleteMapping("/orders/{orderId}")
    public ResponseEntity<Void> cancelOrder(@PathVariable String orderId) {
        try {
            orderService.cancel(orderId);
            return ResponseEntity.noContent().build();  // ✅ 204 No Content
        } catch (OrderNotFoundException e) {
            return ResponseEntity.notFound().build();    // ✅ 404 — idempotent: resource already gone
        }
        // Retrying DELETE is safe — either 204 (deleted) or 404 (already gone) — same final state ✅
    }

    // ✅ POST for non-CRUD action: "cancel" is an action, not resource replacement
    // Alternative approach: use POST for actions on sub-resources
    @PostMapping("/orders/{orderId}/cancellations")
    public ResponseEntity<CancellationDto> requestCancellation(
            @PathVariable String orderId,
            @Valid @RequestBody CancellationRequest request) {
        // Creating a "cancellation" sub-resource
        CancellationDto cancellation = orderService.requestCancellation(orderId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(cancellation);
    }
}
```

### Idempotency Key for POST — Making Non-Idempotent Safe to Retry

```java
// ✅ Idempotency Key: client-generated ID that makes POST retryable
@PostMapping("/payments")
public ResponseEntity<PaymentDto> initiatePayment(
        @Valid @RequestBody PaymentRequest request,
        @RequestHeader("Idempotency-Key") String idempotencyKey) {

    // Check: has this exact idempotency key been used before?
    Optional<PaymentDto> existing = idempotencyStore.get(idempotencyKey);
    if (existing.isPresent()) {
        // ✅ Return the same response as the original call — deduplication
        log.info("Idempotent replay for key={}", idempotencyKey);
        return ResponseEntity.ok(existing.get());
    }

    // First time: process and store result
    PaymentDto payment = paymentService.process(request);
    idempotencyStore.put(idempotencyKey, payment, Duration.ofHours(24));

    return ResponseEntity.status(HttpStatus.CREATED).body(payment);
    // Client retries with same Idempotency-Key → gets same response → safe ✅
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Basics
**Interviewer asks:** "What is the difference between PUT and PATCH? When would you use each?"

**Hruday's answer:**
> PUT replaces the entire resource with whatever you send in the request body. If I send `PUT /users/42` with `{ "name": "Hruday" }` and omit the `email` field, the email gets deleted. The semantics are: "this is the complete new version of this resource."
>
> PATCH updates only the fields I specify, leaving everything else unchanged. `PATCH /users/42` with `{ "name": "Hruday" }` updates only the name — email, phone, preferences all stay.
>
> In practice at Oracle and SAP, I used PATCH almost exclusively for update operations. We built profile editing, order status updates, preference toggles — all PATCH. The only time PUT makes sense is when the client genuinely owns the full resource state and wants to do a complete replacement, like syncing a configuration document.
>
> The key risk with PUT: if the client doesn't send a field (because it doesn't know about it, or it was just added to the schema), that field gets nulled out on replacement. For evolving APIs where new fields get added over time, PATCH is safer because it only touches what it knows about.

---

### Q2 — Idempotency
**Interviewer asks:** "Why is POST not idempotent, and how do you safely retry a POST request?"

**Hruday's answer:**
> POST is not idempotent because each call creates a new resource. `POST /orders` twice creates two separate orders, each with a different ID. The second call changes state differently from the first. Compare: `DELETE /orders/42` twice — first call deletes it, second call finds it already gone. Same final state. POST has no such guarantee.
>
> Safely retrying POST requires an idempotency key. We follow Stripe's model: the client generates a UUID before making the request and sends it as an `Idempotency-Key` header. Before processing, the server checks whether it has seen this key in a Redis store or idempotency table. If yes — return the original response. If no — process, store the result against the key, return it.
>
> The key must be deterministic: based on the payment ID, order ID, or business transaction ID — not a random UUID generated on each retry attempt. A retry must use the same key as the original attempt.
>
> This was directly applicable at SAP. Downstream API calls from our Spring Boot services to payment gateways always included an idempotency key. Network timeouts on payment calls are common — safe retry prevents double-charging, which is an obvious critical requirement.

---

### Q3 — Trade-Offs
**Interviewer asks:** "When is it acceptable to use POST instead of GET for a read operation?"

**Hruday's answer:**
> Technically it's almost never "correct" by REST semantics. But there are legitimate cases where POST for a read is a pragmatic choice.
>
> The main scenario: complex query with sensitive parameters. `GET /orders/search?userId=42&dateFrom=2025-01&cardLast4=9999` puts sensitive data in the URL — it gets logged in server access logs, proxy logs, CDN logs, and browser history. That's a PCI-DSS violation for payment-related fields.
>
> The pragmatic solution: `POST /orders/search` with the search criteria in the request body. The body is not logged by default, not saved in browser history, not included in proxy logs.
>
> Another case: queries where the filter object is genuinely complex — deeply nested, 500B+ of JSON filters for analytics — where a URL-encoded query string becomes unmanageable.
>
> The trade-offs to acknowledge: you lose caching (POST responses aren't cached by default), you lose safe retry semantics, and you confuse API consumers who don't expect POST for a read. I treat "POST for reads" as a targeted exception, documented explicitly, not a general pattern.

---

### Q4 — Scenario
**Interviewer asks:** "You're designing a payment API for Razorpay. A merchant retries a payment POST because they got a network timeout. How do you prevent double-charging?"

**Hruday's answer:**
> This is the idempotency key pattern. Before making the POST, the merchant generates a unique key — typically a UUID tied to their internal transaction ID. They send it as `Idempotency-Key: txn-merchant-001-{UUID}` in every attempt for the same payment.
>
> On our side: before processing any payment, we check Redis or a PostgreSQL idempotency table for this key. If found: return the stored response from the first attempt — the payment result, status, reference ID. No second charge. If not found: process the payment, store the result against the key with a 24-hour TTL, return the result.
>
> Edge case 1: the first request is still in flight when the retry arrives. We acquire a distributed lock keyed on the idempotency key before processing. The second request waits, sees the first was already processed, returns its result.
>
> Edge case 2: the first request failed mid-payment (database crash after gateway charge but before our DB write). On retry: key not found, we initiate a new payment. The gateway reconciliation catches the orphaned first charge and we issue a refund. This is the "dual write" problem — Topic 79 (Outbox pattern) handles this by writing the payment event atomically with the order state change.
>
> Key design rule: the idempotency key scope should be meaningful — tied to a merchant transaction ID, not to a per-request random UUID. Otherwise retries generate new keys and bypass the deduplication.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "GET with a body for complex queries" | "I'll include a request body in GET for complex filter objects" | "HTTP spec technically allows GET bodies but explicitly says servers SHOULD ignore them, and many clients and proxies (nginx, AWS ALB, CDN) will strip or reject GET bodies. In practice, GET with a body is broken on production infrastructure. For complex read queries with too-long query strings: use POST /resource/search with clear documentation that it's a read operation, OR design better query parameter structures, OR accept URL length limits. Never rely on GET with a body working consistently in production." |
| "DELETE is not idempotent because it returns 404 the second time" | "DELETE isn't idempotent — the response changes between calls" | "Idempotency is about resource STATE, not response codes. After the first DELETE, the resource is gone. After repeated DELETEs, the resource is still gone — same state. The response code changing (200 → 404) reflects the state accurately: first delete succeeded, second detected it was already absent. What matters for retry safety: is the final state of the system different if I retry? For DELETE: no. It's safe to retry a DELETE. The 404 on second call is not an error you need to handle differently — it means the desired outcome (resource is gone) was already achieved." |
| "PATCH is always idempotent" | "PATCH is idempotent just like PUT" | "PATCH's idempotency depends on the operation. A simple field assignment — `{ status: 'SHIPPED' }` — is idempotent: applying it twice lands in the same state. But an incremental operation — `{ score: '+5' }` (increment score by 5) — is NOT idempotent: applying it twice increments score by 10. The RFC for PATCH (RFC 5789) explicitly states PATCH is not guaranteed to be idempotent. It CAN be designed as idempotent (and should be, where possible), but the verb itself carries no idempotency guarantee unlike PUT. Always ask: does 'PATCH twice' produce the same result? If yes: idempotent. If no: not idempotent, add idempotency key." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, building Spring Boot REST APIs for the Oracle ERP financial module, we initially used POST for several read operations on complex financial report queries because the query filtering logic was intricate. This created a real problem: the frontend Angular team couldn't cache any report data because POST responses aren't cached. Every filter change, every refresh, every back-button navigation hit the backend. We refactored to GET with well-structured query parameters for most cases, and POST /reports/search (clearly documented as a read) for the most complex multi-dimensional filter queries. The caching benefit alone — browser-side caching of unchanged report data — reduced backend request volume by about 40% for the reporting module."

---

## 8. Scale Evolution

**1,000 users →** Correct HTTP methods + Spring's `@GetMapping`, `@PostMapping`, etc. GET responses with `Cache-Control` headers. Basic idempotency for POST payment endpoints via Redis key.

**100,000 users →** CDN caching on public GET endpoints (`Cache-Control: public, max-age=3600`). Downstream retry config in Resilience4j set to retry only idempotent methods. ETag support on GET responses to avoid transferring unchanged data (304 Not Modified).

**10 million users →** API Gateway enforces method-level routing rules — GET requests never reach the write service tier. Rate limiting differentiated by method: GET at 1000 req/s, POST at 100 req/s per client. Idempotency keys for all POST operations with 24h Redis TTL. CQRS separation: GET endpoints read from read replicas/cache, POST/PUT/PATCH/DELETE go to primary write service. Method-level access logging for audit — all non-GET operations logged to immutable audit trail.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Double-charging prevention requires understanding POST non-idempotency and idempotency key patterns. Payment API method correctness affects merchant trust directly. | "A merchant's server crashed mid-POST to your payment API. How do you guarantee exactly-once payment processing?" |
| Swiggy / Meesho | High read traffic (menu browsing, product search) needs GET caching. Order creation and cart operations need correct POST/PATCH semantics. | "How do you design your order and catalog APIs so that CDN handles 80% of read traffic without hitting backend servers?" |
| Adobe / Microsoft | Enterprise SDKs rely on method semantics for retry logic. SDK auto-retry on 503 must only retry safe/idempotent methods — wrong method choice = data corruption via retry. | "Your Adobe API returns 503 on POST document creation. Your SDK auto-retries. Under what conditions is this safe, and how do you design for it?" |
| SAP Labs (current) | ERP APIs consumed by partner integrations where HTTP semantics are contractual. Wrong method choice breaks partner SDK retry logic and violates OData protocol expectations. | "An ERP integration partner is calling your API — their SDK retries all HTTP calls on network failure. What API design decisions protect their integration correctness?" |

---

## 10. Related Topics — What to Study Next

- **Topic 127 — HTTP Status Codes** — the other half of HTTP semantics: which status codes go with which methods (GET + 200/304, POST + 201/202, DELETE + 204/404), and how incorrect status codes break client retry logic and error handling
- **Topic 125 — REST Principles** — statelessness and uniform interface: the "why" behind correct HTTP method usage; methods are the execution of the Uniform Interface constraint
- **Topic 121 — Idempotent Consumers** — the idempotency key pattern used in POST requests cross-cuts to message consumer idempotency; the same design principle (check before process, store result after) applies to both HTTP and Kafka
- **Topic 137 — Request Deduplication** — the service-side implementation of idempotency keys: how to store, expire, and look up idempotency records efficiently at scale using Redis or a database unique constraint

---

*Part 7 · HTTP Methods — GET, POST, PUT, PATCH, DELETE Semantics · Full Stack Interview Guide · Hruday D · 2026*
