# REST Principles — Statelessness, Uniform Interface
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **REST** (Representational State Transfer) is an architectural style — 6 constraints that Roy Fielding defined in his 2000 PhD thesis — NOT a standard or protocol. Any HTTP API that follows these constraints is "RESTful." Most APIs labelled REST violate at least one constraint in practice.
- **Statelessness** (the most important constraint): the server must NOT store any session state between requests. Every request must contain ALL the information the server needs to process it — auth token, user ID, pagination cursor, everything. The server is "memory-less" between calls. This enables horizontal scaling: any server instance can handle any request, because no instance holds your session.
- **Uniform Interface** (the second most important): all resources follow the same interface contract — identified by URIs, manipulated through representations, self-descriptive messages, and HATEOAS (links to next actions). The uniform interface decouples client from server so they can evolve independently.
- **The 6 REST constraints**: (1) Client-Server, (2) Stateless, (3) Cacheable, (4) Uniform Interface, (5) Layered System, (6) Code on Demand (optional). An API that breaks constraint 2 or 4 is technically not RESTful — it's just HTTP.
- **Richardson Maturity Model**: Level 0 = HTTP tunnel; Level 1 = Resources; Level 2 = HTTP Verbs; Level 3 = HATEOAS. Most production APIs are Level 2. True REST is Level 3.
- **Key interview pair**: statelessness enables horizontal scaling; uniform interface enables independent client-server evolution. These two are the answers to "why REST scales" and "why REST is flexible."

---

## 1. One-Line Definition
REST is a set of 6 architectural constraints for distributed hypermedia systems — the most critical being statelessness (server holds no session state) and uniform interface (all resources accessed and manipulated the same way) — that together make APIs scalable, evolvable, and interoperable.

---

## 2. The Problem It Solves

### The Pre-REST World — SOAP and RPC Problems

```
SOAP (Simple Object Access Protocol) APIs in the early 2000s:
  - Every operation is a custom procedure call: getUserById(), updateUserProfile()
  - XML envelopes with custom schemas — every API is a new protocol to learn
  - Session state stored on the server (stateful connections)
  - Scaling: sticky sessions required — load balancer must route the same user
    to the same server, or sessions break
  - Only ONE way to call operations — POST everything to one endpoint

Result: tightly coupled systems, expensive integration, horizontal scaling nightmares.
If your server holds session state for 10,000 users, you can't add a second server
without session replication or sticky routing.
```

### What REST Fixed

```
REST API (properly implemented):

Before:
  POST /userService
  Body: <soap:Envelope><getUserById>42</getUserById></soap:Envelope>

After:
  GET /users/42
  Authorization: Bearer <token>  ← auth in every request, no server session needed

Benefits:
  - Any of your 10 server instances can handle GET /users/42
    because the auth token + user ID is IN the request — no session lookup needed
  - Add a server at 3am during a spike: it immediately handles traffic
    without session replication setup
  - Caching: GET /users/42 can be cached at every layer (CDN, load balancer, app)
    because the response is the same for the same resource regardless of server

Real impact at Swiggy/Meesho scale:
  Black Friday: traffic 10× normal. Spin up 50 new app instances.
  They immediately serve requests — no session warm-up, no sticky routing.
  That's what statelessness buys you.
```

---

## 3. How It Works Internally

### The 6 REST Constraints Explained Simply

```
CONSTRAINT 1 — CLIENT-SERVER SEPARATION:
  The UI (client) and the data/business logic (server) are separate.
  Client does not worry about data storage.
  Server does not worry about presentation.
  They communicate only through a defined interface (the API).
  
  Example: the React frontend doesn't care if the backend is Java or Node.js.
  The backend doesn't care if the client is a browser, mobile app, or CLI tool.

CONSTRAINT 2 — STATELESS (most important):
  The server remembers nothing between requests.
  Every request is complete and self-describing.
  Session state is NEVER stored server-side — it lives in the client
  and is sent with every request (JWT token, correlation ID, etc.).
  
  What "stateless" does NOT mean: the server has no state at all.
  The database stores application state. That's fine.
  "Stateless" means no server-instance-specific session state between requests.

CONSTRAINT 3 — CACHEABLE:
  Server responses must say whether they are cacheable or not.
  GET responses with Cache-Control headers can be cached by clients,
  CDNs, and proxies. This reduces server load and improves response time.
  
  POST/PUT/DELETE responses are typically not cacheable (they modify state).

CONSTRAINT 4 — UNIFORM INTERFACE (4 sub-constraints):
  4a. Resource identification: every resource has a unique URI
      Example: /users/42, /orders/ORD-001, /products/789
  
  4b. Manipulation through representations: clients hold a representation
      (JSON, XML) and use it to modify the resource via HTTP methods
  
  4c. Self-descriptive messages: each message carries enough info to process it
      Content-Type: application/json tells the server how to parse the body
  
  4d. HATEOAS (Hypermedia as the Engine of Application State):
      Responses include links to next possible actions
      Example: order response includes { "status": "placed", 
               "_links": { "cancel": "/orders/42/cancel", 
                           "track": "/orders/42/tracking" } }
      Client doesn't hardcode API paths — it follows links

CONSTRAINT 5 — LAYERED SYSTEM:
  Client doesn't know if it's talking to the real server, a load balancer,
  a CDN, an API gateway, or a caching proxy. They all look the same.
  Each layer can only see the layer immediately above and below.

CONSTRAINT 6 — CODE ON DEMAND (optional):
  Server can return executable code (JavaScript) to extend client functionality.
  Rarely used in modern REST APIs. Web browsers use it routinely (loading JS).
```

### The Richardson Maturity Model — REST Levels

```
LEVEL 0 — HTTP Tunnel:
  One endpoint. All operations go to it.
  POST /api
  Body: { "action": "getUser", "id": 42 }   ← not RESTful at all
  
  Most SOAP and early RPC APIs are Level 0.

LEVEL 1 — Resources:
  Separate endpoints per resource type.
  POST /users/get  ← still not right (verb in URL, everything is POST)
  POST /orders/place
  
  Better — resources identified. But HTTP verbs not used correctly.

LEVEL 2 — HTTP Verbs (most production APIs land here):
  GET  /users/42        ← read one user
  POST /users           ← create user
  PUT  /users/42        ← full update
  PATCH /users/42       ← partial update
  DELETE /users/42      ← delete
  
  HTTP verbs carry semantic meaning. Status codes used correctly.
  This is "REST" as most engineers understand it.

LEVEL 3 — Hypermedia / HATEOAS (true REST per Fielding):
  GET /orders/42 returns:
  {
    "orderId": "42",
    "status": "payment_pending",
    "_links": {
      "pay":    { "href": "/orders/42/payment", "method": "POST" },
      "cancel": { "href": "/orders/42/cancel",  "method": "DELETE" },
      "self":   { "href": "/orders/42",         "method": "GET" }
    }
  }
  
  Client follows links from the response — it never needs to know API paths upfront.
  The server can change paths and client adapts automatically.
  
  Reality: most teams find HATEOAS too complex to implement and maintain.
  Level 2 + clear documentation is the practical standard.
```

### Statefulness vs Statelessness — The Critical Difference

```
STATEFUL (bad) — server session approach:
  POST /login           → server creates session, stores it in memory
  GET /users/me         → server looks up your session in memory → returns profile
  POST /checkout        → server reads your cart from your session
  DELETE /logout        → server deletes session from memory
  
  Problem: Server instance 1 has your session. 
  Load balancer routes you to Server instance 2.
  Instance 2 has no session for you → 401 Unauthorized or empty cart.
  Fix: sticky sessions (same user always goes to same server)
  OR session replication (every server syncs sessions to every other server)
  Both are expensive and slow to scale.

STATELESS (correct):
  POST /login           → server returns JWT token
  GET /users/me         → client sends: Authorization: Bearer <JWT>
                          server validates JWT (no DB lookup for session)
                          returns profile
  POST /checkout        → client sends: Authorization: Bearer <JWT> + cart in body
                          any server handles it — no shared state needed
  JWT expiry → client logs in again
  
  Server instance 1 or 2 or 20 — doesn't matter.
  Scale horizontally: add servers freely.
```

---

## 4. The Code

### ❌ Wrong Way — Stateful, Non-Uniform, REST Anti-Patterns

```java
// ❌ WRONG: Stateful server session
@RestController
public class BadOrderController {

    @Autowired
    private HttpSession httpSession;  // ❌ Server-side session — kills horizontal scaling

    @PostMapping("/login")
    public void login(@RequestBody LoginRequest req) {
        User user = userService.authenticate(req);
        httpSession.setAttribute("currentUser", user);  // ❌ State stored server-side
    }

    @PostMapping("/addToCart")
    public void addToCart(@RequestBody CartItem item) {
        List<CartItem> cart = (List<CartItem>) httpSession.getAttribute("cart");
        if (cart == null) cart = new ArrayList<>();
        cart.add(item);
        httpSession.setAttribute("cart", cart);  // ❌ Cart in session — breaks on different server
    }

    // ❌ Wrong: verbs in URL, ignoring HTTP semantics
    @PostMapping("/api/getUser")      // ❌ GET operation via POST, verb in URL
    @PostMapping("/api/deleteOrder")  // ❌ DELETE operation via POST
    @PostMapping("/api/updateCart")   // ❌ Update via POST (should be PUT/PATCH)
}
```

> **Why this fails in production:** Sticky sessions or session replication are required, making horizontal scaling expensive and fragile. During a traffic spike, you cannot freely add server instances.

---

### ✅ Right Way — Stateless, Uniform, RESTful API

```java
// ✅ CORRECT: Stateless REST API with JWT — any server handles any request
@RestController
@RequestMapping("/api/v1")
public class OrderController {

    // ✅ No HttpSession. No server-side state. JWT carries user identity.

    @GetMapping("/users/{userId}")              // ✅ Resource URI, correct HTTP verb
    public ResponseEntity<UserDto> getUser(
            @PathVariable Long userId,
            @AuthenticationPrincipal JwtUserDetails currentUser) { // ✅ Auth from JWT, not session

        // Any server can handle this — userId in URI, auth in JWT header
        return ResponseEntity.ok(userService.findById(userId));
    }

    @PostMapping("/orders")                     // ✅ POST = create new resource
    public ResponseEntity<OrderDto> createOrder(
            @Valid @RequestBody CreateOrderRequest request,
            @AuthenticationPrincipal JwtUserDetails currentUser) {

        OrderDto created = orderService.create(request, currentUser.getUserId());
        // ✅ 201 Created + Location header pointing to the new resource
        URI location = URI.create("/api/v1/orders/" + created.getOrderId());
        return ResponseEntity.created(location).body(created);
    }

    @PatchMapping("/orders/{orderId}")          // ✅ PATCH = partial update (not POST /updateOrder)
    public ResponseEntity<OrderDto> updateOrderStatus(
            @PathVariable String orderId,
            @Valid @RequestBody UpdateOrderStatusRequest request) {

        return ResponseEntity.ok(orderService.updateStatus(orderId, request));
    }

    @DeleteMapping("/orders/{orderId}")         // ✅ DELETE = delete, not POST /deleteOrder
    public ResponseEntity<Void> cancelOrder(@PathVariable String orderId) {
        orderService.cancel(orderId);
        return ResponseEntity.noContent().build();  // ✅ 204 No Content — correct for successful DELETE
    }

    @GetMapping("/orders")
    public ResponseEntity<Page<OrderDto>> listOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @AuthenticationPrincipal JwtUserDetails currentUser) {

        // ✅ Pagination state in query params — NOT in server session
        // Client controls page/size — server is stateless
        return ResponseEntity.ok(orderService.listForUser(
            currentUser.getUserId(), page, size, status));
    }
}
```

### ✅ Optional Level 3 — HATEOAS with Spring HATEOAS

```java
// HATEOAS: responses include links to next valid actions
// Rare in practice but signals deep REST knowledge in interviews
@GetMapping("/orders/{orderId}")
public EntityModel<OrderDto> getOrder(@PathVariable String orderId) {
    OrderDto order = orderService.findById(orderId);

    EntityModel<OrderDto> model = EntityModel.of(order);
    model.add(linkTo(methodOn(OrderController.class).getOrder(orderId)).withSelfRel());

    if (order.canBeCancelled()) {
        model.add(linkTo(methodOn(OrderController.class)
            .cancelOrder(orderId)).withRel("cancel"));
    }
    if (order.canBePaid()) {
        model.add(linkTo(methodOn(PaymentController.class)
            .initiatePayment(orderId, null)).withRel("pay"));
    }
    // Client reads _links from response — never hardcodes paths
    return model;
}
```

### Configuration — Spring Security Stateless JWT Setup

```yaml
# application.yml
spring:
  security:
    # No session management — stateless REST
    session:
      creation-policy: STATELESS  # Never create HttpSession
```

```java
// Spring Security: explicitly configure stateless session management
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))  // ✅ No sessions
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .anyRequest().authenticated())
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .csrf(csrf -> csrf.disable())  // ✅ CSRF irrelevant for stateless JWT APIs
            .build();
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Principles
**Interviewer asks:** "What are the key REST constraints, and which ones matter most in practice?"

**Hruday's answer:**
> REST has six constraints: Client-Server, Stateless, Cacheable, Uniform Interface, Layered System, and the optional Code on Demand. In practice, the two that matter most for production system design are Stateless and Uniform Interface.
>
> Stateless means the server holds no session state between requests. Every request is self-contained — auth token, pagination cursor, all context included in the request itself. This is what makes horizontal scaling work. During high traffic at SAP Labs, when we scaled our React frontend backend API, stateless design meant we could add server instances immediately without any session replication or sticky session routing.
>
> Uniform Interface means every resource follows the same contract — URI identifies the resource, HTTP verb declares the operation, status code communicates the result. This is what makes APIs predictable. A developer consuming `/orders`, `/products`, or `/users` all encounter the same patterns, which drastically reduces integration time.
>
> The constraint most APIs skip in reality: HATEOAS — the hypermedia links in responses. True REST Level 3. Most teams find it hard to maintain and rely on documentation instead.

---

### Q2 — Statelessness
**Interviewer asks:** "Why is statelessness important for scalability? How do you achieve it with Spring Security?"

**Hruday's answer:**
> Statelessness removes the sticky session problem. Without statelessness, a load balancer must route a user to the SAME server instance every time — because only that instance has their session in memory. You can't freely add or remove servers because sessions are tied to specific instances. Session replication (syncing sessions across all instances) is expensive, complex, and introduces its own failure modes.
>
> With stateless REST: every request carries a JWT token. The server validates the token cryptographically — it doesn't look up a session in any store. Any of my 20 server instances can validate the same JWT independently. Zero coordination between instances. Adding a new instance: it works immediately. Removing one: no sessions lost.
>
> In Spring Security, I set `SessionCreationPolicy.STATELESS` in the security config. This tells Spring to never create `HttpSession`. Audit it regularly — if anywhere in the codebase calls `httpSession.setAttribute()`, it breaks statefulness guarantees silently.
>
> The one thing people confuse: stateless doesn't mean no server state at all. The database has state. Redis has state. "Stateless" specifically means no server-instance-specific session state. The database is shared — that's fine.

---

### Q3 — Trade-Offs
**Interviewer asks:** "What are the trade-offs of statelessness? Are there cases where you'd use sessions instead?"

**Hruday's answer:**
> The trade-off of statelessness is token size and security surface area. Every request must carry the full auth context — JWT grows as you add claims. A stateful session token is just an ID (32 bytes); a JWT with roles and permissions is 500+ bytes. At high request rates, that adds up to meaningful bandwidth overhead.
>
> JWT also has a revocation problem. If a user's token is compromised, you can't invalidate a stateless JWT until it expires (unless you maintain a blocklist — which is essentially a stateful store, defeating the pure statelessness). For financial applications at Razorpay or PhonePe, immediate revocation on logout or compromise is a requirement. They typically use short-lived JWTs (15 minutes) plus a refresh token stored server-side — technically a hybrid.
>
> Cases where I'd consider stateful sessions: internal admin tools with very low traffic where horizontal scaling isn't needed; OAuth flows during the authorization code handshake (inherently stateful); real-time features like WebSocket connections (inherently stateful connections).
>
> For public APIs at scale: stateless every time. For internal tools or specific protocol-level requirements: stateful is acceptable.

---

### Q4 — Design Scenario
**Interviewer asks:** "Design a RESTful order management API following all REST constraints. Walk me through your design decisions."

**Hruday's answer:**
> I'd structure it around resources: `/orders`, `/orders/{id}`, `/orders/{id}/items`, `/products`. Each is a noun — never verbs in the URI.
>
> Statelessness: JWT auth on every request. No session anywhere. Order state stored in database, not in any server memory. Pagination via cursor or page/size query params carried by the client.
>
> Uniform Interface: GET `/orders` lists; POST `/orders` creates (returns 201 + Location header); PATCH `/orders/{id}` updates status; DELETE `/orders/{id}` cancels. Each HTTP verb has clear semantics.
>
> Cacheability: GET `/orders/{id}` returns `Cache-Control: private, max-age=60` for the client only (not CDN-cacheable since it's user-specific). GET `/products/{id}` returns `Cache-Control: public, max-age=3600` — cacheable at CDN level.
>
> Layered: behind an API Gateway (Topic 136) that handles authentication, rate limiting, and SSL termination. The app server never sees unauthenticated requests.
>
> HATEOAS: for Level 3, include `_links` in order responses pointing to `cancel`, `track`, and `pay` based on current order state. Clients never hardcode state-specific URLs. In practice most real projects stop at Level 2 because HATEOAS adds implementation complexity.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Stateless means the server doesn't have any state" | "The server stores no data at all" | "Stateless means the server holds no SESSION state — no memory between requests for a specific client. The database is absolutely stateful — it stores application data. Redis is stateful — it stores cached data. Stateless is specifically about HTTP session state: no `HttpSession`, no server-side session store keyed by client. This distinction is critical: a database-backed application can be completely stateless at the HTTP layer." |
| "REST is just HTTP + JSON" | "REST is when you use HTTP and return JSON" | "REST is an architectural style with 6 constraints — HTTP and JSON are just implementation details. You can build a non-RESTful API with HTTP + JSON (e.g., POST everything to `/api`, use cookies for sessions). You can build a RESTful API with XML. Most engineers call their API 'REST' when they really mean 'JSON over HTTP.' A truly RESTful API at minimum: correct HTTP verbs, URI-identified resources, proper status codes, and statelessness. The elevator test: if I add a second server instance, do all requests still work without any session synchronisation? If yes — stateless, truly REST-eligible. If no — it's HTTP JSON but not REST." |
| "PUT vs PATCH doesn't matter, use whatever" | "PUT and PATCH both update, I use PUT for everything" | "PUT and PATCH have different semantics and different idempotency implications. PUT replaces the ENTIRE resource — if you omit a field, it becomes null/missing. PATCH updates ONLY the specified fields, leaving others unchanged. PUT is idempotent: sending the same PUT 5 times = the same result every time. PATCH is typically idempotent too but can be designed as non-idempotent (append operations). In a payment system: PATCH `/orders/42` with `{ status: 'CANCELLED' }` should update only status. PUT `/orders/42` with only `{ status: 'CANCELLED' }` would clear all other fields — a destructive operation. Wrong HTTP verb = wrong semantics = bugs in clients that assume correct semantics." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle India, I built Spring Boot REST APIs for the Oracle ERP financial module — specifically accounts payable and receivable APIs consumed by an Angular frontend. At the time, I applied REST principles mostly by convention — correct HTTP verbs, resource URIs, standard status codes — without fully understanding WHY Fielding's constraints matter. Shifting to SAP Labs and working on APIs consumed by multiple teams made statelessness real: our JWT-based auth meant any of our deployed instances handled any request, which made zero-downtime deployments straightforward. Understanding REST as constraints rather than conventions is the shift from junior to senior API design thinking."

---

## 8. Scale Evolution

**1,000 users →** Stateless JWT-based API with a single app instance. Standard Spring Security STATELESS config. GET responses cached for 60 seconds with `Cache-Control`. Works perfectly with no complex setup.

**100,000 users →** Multiple app instances behind a load balancer (Round Robin — no sticky sessions needed due to statelessness). CDN caching for public GET endpoints (`/products`, `/catalog`). Short-lived JWTs (15 min) + refresh token rotation for security without session overhead.

**10 million users →** API Gateway handles auth at the edge — app servers never validate JWT (gateway injects validated user context via headers). Response caching at gateway level. Versioned API (`/v1`, `/v2`) allowing independent evolution. Rate limiting per client. HATEOAS links generated dynamically based on user permissions and resource state — enables fine-grained per-customer feature enabling without client redeployment.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment APIs consumed by thousands of merchant integrations — REST correctness (idempotency, correct verbs, proper status codes) directly affects merchant developer experience and integration correctness. | "Design Razorpay's payment initiation REST API — what status codes, verbs, and idempotency mechanism would you use?" |
| Swiggy / Meesho | Mobile app + web + partner APIs all consume the same backend. Stateless JWT enables autoscaling during meal time spikes without session coordination. Cache-Control on product/catalog endpoints reduces backend load. | "How do you scale your order API to handle a 10× traffic spike at lunch without spinning up session-aware infrastructure?" |
| Adobe / Microsoft | REST APIs consumed by enterprise SDKs, CLI tools, browser plugins, and partner integrations simultaneously. Uniform interface is critical for predictable SDK behaviour across surfaces. | "Our Creative Cloud API is consumed by 50 partner integrations. How do you evolve the API without breaking existing clients?" |
| SAP Labs (current) | Internal and external REST APIs for ERP integrations consumed by SAP partners and customers. API versioning and backward compatibility are compliance concerns. | "How would you version the SAP Fiori OData API to support legacy ERP clients alongside new cloud clients without a flag day migration?" |

---

## 10. Related Topics — What to Study Next

- **Topic 126 — HTTP Methods** — the Uniform Interface constraint in detail: exact semantics, idempotency properties, and safety definitions of GET/POST/PUT/PATCH/DELETE; what makes PUT idempotent and POST non-idempotent
- **Topic 127 — HTTP Status Codes** — self-descriptive messages (REST constraint 4c) require correct status codes; the full set from 1xx to 5xx and when each is appropriate
- **Topic 129 — API Versioning** — evolving a RESTful API without breaking Uniform Interface guarantees; URL vs header vs media type versioning trade-offs
- **Topic 136 — API Gateway** — the Layered System constraint in practice; how an API gateway sits between clients and servers without clients knowing; authentication, rate limiting, and routing at the gateway layer

---

*Part 7 · REST Principles — Statelessness, Uniform Interface · Full Stack Interview Guide · Hruday D · 2026*
