# REST API Design Principles
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- REST = Representational State Transfer — 6 architectural constraints, not a protocol; HTTP is just the most common transport
- Resources are nouns, HTTP methods are verbs: `GET /orders` (list), `POST /orders` (create), `GET /orders/42` (read one), `PUT /orders/42` (replace), `PATCH /orders/42` (partial update), `DELETE /orders/42` (delete)
- Use HTTP status codes correctly: 200 OK, 201 Created (with `Location` header), 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable, 500 Internal Server Error
- Stateless: every request carries all the information the server needs — no session stored on the server between requests
- Version your API from day 1: `v1` in the URL (`/api/v1/orders`) or in a header — changing an API without versioning breaks existing clients
- Hruday strength: built REST APIs at Oracle (Spring Boot) and Node.js/Express at Capgemini — real experience on both sides

---

## 1. One-Line Definition
REST is an architectural style for distributed systems where clients interact with server-managed resources using a uniform interface (standard HTTP methods and status codes) over stateless, cacheable request-response cycles.

---

## 2. The Problem It Solves

Before REST, enterprise APIs were built with SOAP — XML envelopes, WSDL contracts, tightly coupled clients and servers. Adding one new field to the response required updating the WSDL schema, regenerating client stubs, and redeploying both sides simultaneously. Teams were constantly blocked on each other.

REST changed this by using standard HTTP — every client already understands HTTP. Resources are URLs. Operations are HTTP methods. The server returns whatever representation it has (JSON, XML, HTML). The client does not need to know the server's implementation — only the resource URL and the HTTP method. Loose coupling: the server can add fields to the JSON response and old clients just ignore the new fields.

Real production failure from bad REST design: A team at a company I know designed all their APIs as RPC-style: `POST /api/doCreateOrder`, `POST /api/getOrdersByUser`, `POST /api/cancelOrderById`. Everything was POST. Every call went through a single endpoint. URL-level security, caching, and load balancer routing all became useless because everything looked identical to the infrastructure. Rate limiting by endpoint was impossible. CDN caching for GET responses was impossible. One bad deploy broke every API function at once. Proper REST design — separate resources, proper HTTP methods — routes these concerns cleanly.

---

## 3. How It Works Internally

### The Mental Model
Think of a REST API like a filing cabinet system at an office. Each drawer is a resource (Orders, Products, Users). You use standard actions on any drawer: open to read, insert new documents, replace a document, cross out a field, or remove a document. The action (method) is always the same — what changes is which drawer (URL) you point it at. Anyone who knows how a filing cabinet works can use any drawer without a special manual.

### REST Constraints — The Real Six

1. **Client-server**: clear separation between UI and data storage — they can evolve independently
2. **Stateless**: every request contains all the information needed — no session state on the server
3. **Cacheable**: responses must declare whether they can be cached — enables infrastructure-level caching
4. **Uniform interface**: standard resource names, HTTP methods, status codes, self-descriptive messages
5. **Layered system**: clients do not know if they're talking to the real server, a load balancer, or a CDN
6. **Code on demand (optional)**: server can send executable code to clients (rare — JavaScript via CDN)

### HTTP Methods Mapped to Operations

| Method | Safe? | Idempotent? | Use for | Example |
|--------|-------|-------------|---------|---------|
| GET | ✅ yes | ✅ yes | Read a resource or list | `GET /orders`, `GET /orders/42` |
| POST | ❌ no | ❌ no | Create a new resource | `POST /orders` |
| PUT | ❌ no | ✅ yes | Replace entire resource | `PUT /orders/42` |
| PATCH | ❌ no | ❌ usually | Partial update | `PATCH /orders/42` |
| DELETE | ❌ no | ✅ yes | Delete a resource | `DELETE /orders/42` |

**Safe** = calling it never changes server state. **Idempotent** (safe to call many times — same result every time) = calling it 5 times gives the same result as calling it once.

### URL Design Rules

```
✅ Good URL patterns (nouns, hierarchical, lowercase, hyphens):
GET    /api/v1/orders                    ← list all orders
POST   /api/v1/orders                    ← create order
GET    /api/v1/orders/42                 ← get order 42
PATCH  /api/v1/orders/42                 ← partial update
DELETE /api/v1/orders/42                 ← delete order 42
GET    /api/v1/orders/42/items           ← items belonging to order 42
POST   /api/v1/orders/42/items           ← add item to order 42

❌ Bad URL patterns (verbs in URL, RPC-style, not resource-centric):
POST   /api/createOrder
POST   /api/getOrderById?id=42
POST   /api/deleteOrder/42
GET    /api/cancelOrder?orderId=42
```

### ASCII Diagram — Full Request → Response Lifecycle

```
Client                        Spring Boot REST API
  │                                    │
  │  GET /api/v1/orders/42             │
  │  Authorization: Bearer <jwt>       │
  │  Accept: application/json  ───────►│
  │                                    │ 1. Security filter chain validates JWT
  │                                    │ 2. DispatcherServlet routes to controller
  │                                    │ 3. @PathVariable extracts orderId=42
  │                                    │ 4. Service loads Order 42 from DB
  │                                    │ 5. Order not found?
  │                                    │    → throw ResourceNotFoundException
  │                                    │    → @ControllerAdvice → 404
  │                                    │ 6. Order found:
  │  HTTP/1.1 200 OK            ◄──────│    → Jackson serializes to JSON
  │  Content-Type: application/json    │    → HTTP 200 returned
  │  {                                 │
  │    "id": 42,                       │
  │    "status": "PENDING",            │
  │    "total": 1499.00,               │
  │    "_links": {                     │ (HATEOAS — optional, advanced)
  │      "self": "/api/v1/orders/42",  │
  │      "items": "/api/v1/orders/42/items"
  │    }                               │
  │  }                                 │
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// RPC-style controller — anti-pattern
@RestController
@RequestMapping("/api")
public class OrderController {

    // WRONG 1: Verb in URL ("/createOrder", "/getOrder") — not RESTful
    // WRONG 2: Everything is POST — safe GETs cannot be cached or differentiated
    // WRONG 3: Non-standard status codes — returning 200 for creation, no Location header
    // WRONG 4: Returning success/failure in the body instead of HTTP status

    @PostMapping("/createOrder")
    public Map<String, Object> createOrder(@RequestBody OrderRequest req) {
        Order order = orderService.create(req);
        return Map.of("success", true, "orderId", order.getId());
        // Always returns 200 — clients cannot tell success from failure by status code
    }

    @PostMapping("/getOrderById")
    public Order getOrder(@RequestBody Map<String, Long> req) {
        return orderService.findById(req.get("id"));
        // POST for a read operation — not cacheable, not idempotent — violates REST
    }

    @PostMapping("/deleteOrder")
    public String deleteOrder(@RequestBody Map<String, Long> req) {
        orderService.delete(req.get("id"));
        return "deleted";
        // Everything via POST to a single action endpoint — not a resource
    }
}
```
> **Why this fails in production:** Infrastructure cannot help you. Load balancers cannot route GETs to read replicas vs POSTs to primaries. CDNs cannot cache POST responses. Rate limiters cannot distinguish read vs write traffic. API documentation tools (Swagger/OpenAPI) produce meaningless docs. Client HTTP caches (ETags, If-None-Match) cannot work. Security rules cannot be expressed at the URL level. You lose every benefit of HTTP.

### Right Way — Production Quality REST Controller
```java
@RestController
@RequestMapping("/api/v1/orders")  // version in path prefix — all orders endpoints here
@Tag(name = "Orders", description = "Order management APIs")  // OpenAPI documentation tag
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // ─── List with pagination ─────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<Page<OrderDto>> listOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            Pageable pageable) {

        Page<OrderDto> orders = orderService.findAll(status, pageable);
        return ResponseEntity.ok(orders);
        // Returns 200 OK with pagination metadata in the Page object
    }

    // ─── Get single resource ──────────────────────────────────────────────────
    @GetMapping("/{orderId}")
    public ResponseEntity<OrderDto> getOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.findById(orderId));
        // If not found, orderService throws ResourceNotFoundException
        // @ControllerAdvice converts it to 404 Not Found
    }

    // ─── Create — POST with 201 Created + Location header ────────────────────
    @PostMapping
    public ResponseEntity<OrderDto> createOrder(
            @RequestBody @Valid CreateOrderRequest request,
            UriComponentsBuilder uriBuilder) {

        OrderDto created = orderService.create(request);

        // 201 Created — the standard response for a successful POST
        // Location header tells the client where to find the new resource
        URI location = uriBuilder
            .path("/api/v1/orders/{id}")
            .buildAndExpand(created.id())
            .toUri();

        return ResponseEntity.created(location).body(created);
    }

    // ─── Partial update — PATCH ───────────────────────────────────────────────
    @PatchMapping("/{orderId}")
    public ResponseEntity<OrderDto> updateOrder(
            @PathVariable Long orderId,
            @RequestBody @Valid UpdateOrderRequest request) {

        return ResponseEntity.ok(orderService.update(orderId, request));
    }

    // ─── Full replace — PUT ───────────────────────────────────────────────────
    @PutMapping("/{orderId}")
    public ResponseEntity<OrderDto> replaceOrder(
            @PathVariable Long orderId,
            @RequestBody @Valid CreateOrderRequest request) {

        return ResponseEntity.ok(orderService.replace(orderId, request));
        // PUT replaces the entire resource — client must send ALL fields
    }

    // ─── Delete — 204 No Content ──────────────────────────────────────────────
    @DeleteMapping("/{orderId}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long orderId) {
        orderService.delete(orderId);
        return ResponseEntity.noContent().build(); // 204 — success, no body
    }

    // ─── Sub-resource ─────────────────────────────────────────────────────────
    @GetMapping("/{orderId}/items")
    public ResponseEntity<List<OrderItemDto>> getOrderItems(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getItems(orderId));
    }

    // ─── Custom action that doesn't fit CRUD — use a descriptive noun ─────────
    // Not /cancelOrder — use a sub-resource to represent the action
    @PostMapping("/{orderId}/cancellation")
    public ResponseEntity<OrderDto> cancelOrder(
            @PathVariable Long orderId,
            @RequestBody @Valid CancellationRequest request) {
        // POST to /cancellation sub-resource — creates a "cancellation" event
        return ResponseEntity.ok(orderService.cancel(orderId, request));
    }
}
```

### Configuration — OpenAPI / Swagger Documentation
```yaml
# application.yml
springdoc:
  api-docs:
    path: /api-docs       # JSON spec at /api-docs
  swagger-ui:
    path: /swagger-ui     # Interactive UI at /swagger-ui
    operations-sorter: method  # Sort endpoints by HTTP method
  default-consumes-media-type: application/json
  default-produces-media-type: application/json
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are the key REST API design principles you follow? Walk me through a real example."

**Hruday's answer:**
> I follow five core principles when designing REST APIs.
>
> First: resources are nouns in the URL, HTTP methods are the verbs. `GET /orders` lists orders. `POST /orders` creates one. `DELETE /orders/42` removes a specific one. I never put verbs in URLs like `/createOrder` or `/deleteOrderById`.
>
> Second: use HTTP status codes correctly. 201 with a `Location` header for created resources. 204 for successful deletes. 404 when a resource doesn't exist. 422 when validation fails. Clients and monitoring tools depend on these codes being accurate.
>
> Third: statelessness. Every request carries everything needed — JWT for auth, page parameters for pagination. The server never remembers anything between requests. This makes every instance of my service identical — any request can hit any server.
>
> Fourth: versioning from day one. I put `/v1/` in the base path. Before any client is live, this costs nothing. After clients are live, changing an API without a version breaks them. I learned this at Oracle where we had to maintain two API versions simultaneously when we changed a response shape.
>
> Fifth: consistent error format. All errors return the same JSON structure: `{code, message, details[]}` — never raw stack traces in production.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is idempotency? Which HTTP methods are idempotent and why does it matter?"

**Hruday's answer:**
> Idempotency means: calling the same operation multiple times gives the same result as calling it once — the server state does not accumulate from repeated calls.
>
> GET is idempotent and safe — reading the same resource 100 times makes no state change. DELETE is idempotent — deleting an order and then trying to delete it again (404 on second call) leaves the system in the same state as after the first delete. PUT is idempotent — replacing an order with the same data 5 times is the same as replacing it once.
>
> POST is NOT idempotent — posting a new order 3 times creates 3 separate orders. PATCH is usually not idempotent (though it can be, if carefully designed — e.g., `{"status": "CANCELLED"}` is idempotent, but `{"increment_quantity": 1}` is not).
>
> Why does this matter in production? Network retries. If a POST request to create an order times out, the client doesn't know if the server received it. Retrying creates a duplicate order. This is why payment APIs use idempotency keys — the client generates a unique key per logical operation and sends it as a header. If the server already processed that key, it returns the same response without creating a duplicate. PUT being naturally idempotent means you can safely retry updates after a timeout without double-applying the change.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you NOT use REST? What alternatives exist?"

**Hruday's answer:**
> REST is not always the right choice. Three situations where I'd use something else.
>
> First: real-time bidirectional communication. REST is request-response — the client always initiates. For a live chat, live stock prices, or a collaborative document editor, the server needs to push updates to the client. WebSockets (which I used at Bosch for real-time industrial dashboards) or Server-Sent Events are better — persistent connection, server pushes when data changes, no polling overhead.
>
> Second: internal microservice communication where performance is critical. REST over HTTP/1.1 has significant overhead — HTTP headers, text serialization (JSON). gRPC uses HTTP/2, Protocol Buffers (compact binary format), and generates type-safe client code from a schema. Round-trip latency drops from ~2ms for REST to ~0.5ms for gRPC on the same hardware. For high-frequency internal service-to-service calls (thousands per second), that adds up.
>
> Third: complex event-driven systems. When a purchase triggers notifications, inventory updates, and invoice creation all at once, REST means Service A synchronously calls B, C, and D — a waterfall of HTTP calls. Kafka or RabbitMQ decouples these — Service A publishes an event, B, C, D consume it independently. More reliable, more scalable, no cascading failures.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the REST API for an e-commerce order system. Walk through the resource hierarchy and key endpoints."

**Hruday's answer:**
> The core resources: Orders, Products, Users, Carts, Payments, Shipments.
>
> Key endpoints:
> ```
> Users:
>   GET    /api/v1/users/me                    ← current user profile
>   PATCH  /api/v1/users/me                    ← update profile
>
> Products:
>   GET    /api/v1/products                    ← list (filterable, paginated)
>   GET    /api/v1/products/{id}               ← product detail
>   GET    /api/v1/products/{id}/reviews       ← sub-resource
>
> Cart:
>   GET    /api/v1/cart                        ← current user's cart
>   POST   /api/v1/cart/items                  ← add item
>   PATCH  /api/v1/cart/items/{itemId}         ← update quantity
>   DELETE /api/v1/cart/items/{itemId}         ← remove item
>
> Orders:
>   POST   /api/v1/orders                      ← place order (from cart)
>   GET    /api/v1/orders/{orderId}            ← order status
>   POST   /api/v1/orders/{orderId}/cancellation ← cancel
>   GET    /api/v1/orders/{orderId}/shipment   ← tracking info
>
> Payments:
>   POST   /api/v1/orders/{orderId}/payments   ← initiate payment (idempotency key required)
> ```
>
> Version prefix `/v1/` on all endpoints. JWT auth on all except product listing (public). Pagination on list endpoints. Each POST returns 201 with Location header. Payment uses idempotency keys to prevent duplicate charges.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Always use 200 OK for success" | "Return 200 for everything and put status in the body" | "Use correct HTTP status codes: 201 for resource creation, 204 for delete, 422 for validation failure, 409 for conflict. HTTP status codes are part of the REST interface — clients (caches, monitoring, API gateways) act on them. If you return 200 for a failed validation, clients think it succeeded." |
| "Put the version in the HTTP header" | "Use `Accept: application/vnd.api.v1+json` — more RESTful" | "URL versioning (`/v1/`) is operationally simpler: it shows in logs, monitoring dashboards, API gateways, and browser address bars without configuration. Header-based versioning is theoretically purer but harder to debug and requires explicit header configuration in every client, proxy, and monitoring tool. Most production teams (including Google, Stripe, Razorpay) use URL versioning." |
| "PATCH and PUT are the same" | "Both update a resource — use either" | "PUT replaces the ENTIRE resource — the client must send all fields. If a field is missing from PUT, it is set to null/default. PATCH is a partial update — the client sends only the fields to change. Use PATCH for most updates in practice. Use PUT when the client always owns the complete representation." |
| "Nested resources should be deeply nested" | "/api/v1/users/42/orders/99/items/5/reviews/" | "Limit nesting to 2 levels maximum. Deep nesting creates long, fragile URLs that break when resources are reused across different parent hierarchies. For deeply related resources (`/orders/99/items/5/reviews`), consider a flat route: `/reviews?itemId=5` or a dedicated parent: `/order-items/5/reviews`." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, I built the REST APIs for an ERP module — vendor management, purchase orders, invoice processing. We applied these exact REST principles: nouns in URLs, POST for creation returning 201 with Location, PUT for full replace, PATCH for status updates. The Angular frontend I also worked on consumed these APIs directly. Having both sides in my head meant I caught design mistakes early — 'this endpoint returns 200 for not-found because someone forgot the null check in the service' — before the frontend team had to debug it. Designing APIs that are clean on both sides is the fullstack advantage."

---

## 8. Scale Evolution

**1,000 users →** Standard REST with Spring Boot works perfectly. Consistent status codes and versioning are habits worth building now — they cost nothing but pay off at scale.

**100,000 users →** Caching becomes important. GET responses with proper `Cache-Control`, `ETag`, and `Last-Modified` headers allow CDN caching and conditional requests (304 Not Modified). This reduces backend load dramatically for read-heavy endpoints like product catalogs. Rate limiting by endpoint (GET vs POST) becomes necessary.

**10 million users →** A single versioned REST API is now consumed by mobile apps, partner integrations, and 3rd-party developers. API gateway (Kong, AWS API Gateway) handles: routing, rate limiting, authentication, SSL termination, and response caching. The REST API itself becomes a thin façade — each endpoint delegates to a microservice. API contracts are versioned and maintained with backward-compatibility guarantees (never remove a field, always add new fields as optional). Deprecation lifecycle for old versions (sunset headers).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Their entire business is a REST API used by merchants. API design *is* the product — versioning, idempotency keys, consistent error formats, and status codes are critical to merchant integration success. | "Design the REST API for a payment gateway. What endpoints, methods, and status codes?" |
| Swiggy / Meesho | Multiple client types (mobile, web, partner apps) consume the same APIs. Clean resource hierarchy and versioning allows independent evolution of clients and the API. | "Your mobile app and web app have different data needs for the order list. How do you design the API?" |
| Adobe / Microsoft | Developer-facing APIs (Adobe Document APIs, Microsoft Graph) must be clean, discoverable, and versioned. Poor REST design drives developer frustration and support tickets. | "What principles do you follow when designing a public API?" |
| Remote / Global roles | REST API design is a near-universal senior backend interview topic. Clean URL design and proper HTTP status codes usage immediately signal experience level. | "Review this API design and identify what's wrong." |

---

## 10. Related Topics — What to Study Next

- **Topic 57 — @RestController, @RequestMapping, @PathVariable, @RequestBody** — the Spring Boot annotations that implement the REST design patterns shown here — the "how" to this "what"
- **Topic 58 — Exception Handling (@ControllerAdvice)** — REST APIs need consistent error response format; `@ControllerAdvice` provides the centralized error handling that turns every exception into a proper HTTP status code and error body
- **Topic 59 — API Versioning Strategies** — URL versioning was recommended here; Topic 59 covers all four strategies in depth with trade-offs
- **Topic 69 — API Gateway** — at scale, REST APIs sit behind an API gateway that handles cross-cutting concerns (auth, rate limiting, routing) without changing the REST API itself
- **Topic 7 — Part 7: API Design Deep Dive** — Part 7 covers REST at a deeper, system-design level — pagination cursors, HATEOAS, GraphQL comparison, rate limiting patterns

---

*Part 3 · REST API Design Principles · Full Stack Interview Guide · Hruday D · 2026*
