# API Gateway — Authentication, Routing, Throttling
> Part 7 — API Design & Communication
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **API Gateway** is the single entry point for all external client requests to a microservices backend. Clients (browser, mobile, third-party) call the gateway — never the individual services directly. The gateway routes each request to the correct service(s) and handles cross-cutting concerns: authentication/authorization, SSL termination, rate limiting, request/response transformation, logging, tracing.
- **Core responsibilities**: (1) **Routing** — route `/api/orders/**` to the Order Service, `/api/products/**` to the Product Service based on path, method, headers, or query params. (2) **Auth** — validate JWT tokens once at the gateway; services receive a trusted request without each needing to implement auth. (3) **Rate limiting** — per-client quotas enforced at the entry point before any service is loaded. (4) **SSL termination** — decrypt HTTPS once at the gateway; internal traffic can be plain HTTP (within the trusted internal network). (5) **Request transformation** — add headers (correlation ID, user context), strip sensitive headers before forwarding to services.
- **Options**: Spring Cloud Gateway (Java/Spring ecosystem), Kong (Nginx-based, plugin ecosystem), AWS API Gateway (managed, serverless), Netflix Zuul (older, blocking). For Java microservices: Spring Cloud Gateway is the idiomatic choice.
- **Spring Cloud Gateway**: routes defined as predicates (path, method, header, weight) + filters (AddRequestHeader, RewritePath, CircuitBreaker, RateLimiter). Non-blocking, runs on Netty (reactive). Routes can be loaded from config files or defined programmatically.
- **Authentication at gateway**: JWT validator filter reads Authorization header, verifies signature (no DB call — JWT is self-contained), rejects 401 immediately. Passes user ID as a trusted downstream header (`X-User-Id`). Services trust this header without re-verifying the JWT.
- **Correlation ID**: gateway generates a unique UUID for every request, adds it as `X-Correlation-Id` header. All services log it with every log line. Critical for distributed tracing — a single user-facing error maps to one correlation ID across 20 log files.

---

## 1. One-Line Definition
An API Gateway is the single entry point for all client traffic in a microservices architecture that handles routing, authentication, rate limiting, SSL termination, and request transformation centrally so individual services can focus on business logic.

---

## 2. The Problem It Solves

### Microservices Without a Gateway — The Fan-Out Auth Problem

```
WITHOUT GATEWAY:
  Mobile App □ ─────────────────────────────────── ▶ Order Service :8001
  Mobile App □ ─────────────────────────────────── ▶ Product Service :8002
  Mobile App □ ─────────────────────────────────── ▶ User Service :8003
  Browser    □ ─────────────────────────────────── ▶ Payment Service :8004
  Third-Party □ ─────────────────────────────────── ▶ Review Service :8005

  PROBLEMS:
  ╔═══════════════════════════════════════════════════════════════════════╗
  ║ 1. Authentication duplication                                         ║
  ║    Every one of those 5 services must:                                ║
  ║    - Read Authorization header                                        ║
  ║    - Verify JWT signature (same crypto code, copied 5 times)         ║
  ║    - Handle expiry, invalid token, missing token (5 copies)           ║
  ║    When the JWT secret rotates: update all 5 services                 ║
  ║                                                                       ║
  ║ 2. Rate limiting: each service rate-limits independently              ║
  ║    User can attack Product Service without Order Service knowing       ║
  ║    No aggregate "this user is hammering us" visibility                ║
  ║                                                                       ║
  ║ 3. Client knows internal microservice addresses                       ║
  ║    Mobile app hardcodes :8001, :8002, :8003, :8004, :8005            ║
  ║    When Order Service moves to :9001: mobile app breaks               ║
  ║    When you split Payment Service into PaymentInitService and         ║
  ║    PaymentSettlementService: all clients must update                  ║
  ║                                                                       ║
  ║ 4. SSL termination: each service handles TLS → 5 certificates        ║
  ║    Certificate rotation × 5 services                                  ║
  ║                                                                       ║
  ║ 5. Correlation ID: no common request tracing identifier               ║
  ║    Error in Order Service trace → cannot find related Product Service ║
  ║    log entry because there's no shared ID                            ║
  ╚═══════════════════════════════════════════════════════════════════════╝

WITH GATEWAY:
  Mobile App □ ─── ▶ API GATEWAY ─── ▶ Order Service (internal, no auth logic)
  Mobile App □ ─────────────────── ▶  Product Service (internal, no auth logic)
  Browser    □                       ▶ User Service (internal, no auth logic)
  Third-Party □                      ▶ Payment Service (internal, no auth logic)
                                     ▶ Review Service (internal, no auth logic)

  ✅ Auth: once at gateway, JWT validated, X-User-Id header injected
  ✅ Rate limiting: aggregate per-user across all services at one point
  ✅ SSL: one certificate on gateway, internal HTTP
  ✅ Clients: single public hostname api.swiggy.com — internal topology hidden
  ✅ Correlation ID: generated once at gateway, logged by all services
```

---

## 3. How It Works Internally

### Request Flow Through Spring Cloud Gateway

```
1. Client sends:
   POST https://api.example.com/api/v1/orders
   Authorization: Bearer eyJhbGci...
   Content-Type: application/json
   Body: { "restaurantId": "R-45", "items": [...] }

2. Gateway receives request (Netty, non-blocking):
   
   ┌─────────────────────────────────────────────────────┐
   │ GLOBAL PRE-FILTERS (run for every request)          │
   │                                                     │
   │ A. Correlation ID filter                            │
   │    Generate UUID, add X-Correlation-Id header       │
   │    → "X-Correlation-Id: a3f7c21b-8e04-..."         │
   │                                                     │
   │ B. JWT Auth filter                                  │
   │    Read Authorization: Bearer eyJhbGci...           │
   │    Verify signature with public key (no DB call)    │
   │    Extract sub: "user:u-5432", roles: ["CUSTOMER"]  │
   │    Add header: X-User-Id: u-5432                    │
   │    Add header: X-User-Roles: CUSTOMER               │
   │    If invalid/expired → return 401 immediately      │
   │    (Order Service never sees the request)           │
   │                                                     │
   │ C. Rate limit filter                                │
   │    Check Redis bucket for user:u-5432               │
   │    All requests (across all routes) count together  │
   │    If bucket empty → return 429 + Retry-After       │
   │                                                     │
   │ D. Request logging                                  │
   │    Log: [a3f7c21b] POST /api/v1/orders user=u-5432  │
   └────────────────────────────┬────────────────────────┘
                                │
   Route matching:
   Path: /api/v1/orders/** matches → ORDER_SERVICE route
                                │
   ┌────────────────────────────▼────────────────────────┐
   │ ROUTE-SPECIFIC FILTERS                              │
   │                                                     │
   │ E. RewritePath filter                               │
   │    /api/v1/orders/ORD-42 → /orders/ORD-42          │
   │    (internal service uses different path prefix)    │
   │                                                     │
   │ F. AddRequestHeader filters                         │
   │    X-Internal-Token: <service-mesh-secret>          │
   │    X-Gateway-Version: 2.1.0                         │
   └────────────────────────────┬────────────────────────┘
                                │
   Forward to Order Service:
   POST http://order-service:8080/orders
   X-User-Id: u-5432
   X-User-Roles: CUSTOMER
   X-Correlation-Id: a3f7c21b-8e04-...
   (Authorization: Bearer header STRIPPED — internal service doesn't need it)

3. Order Service processes request:
   - Does NOT validate JWT (trusts X-User-Id from gateway)
   - Logs: [a3f7c21b] Processing order for user=u-5432
   - Returns 201 to gateway

4. Gateway post-filters:
   - Remove internal headers from response (X-Internal-Token)
   - Add response timing header: X-Response-Time: 34ms
   - Log completion: [a3f7c21b] 201 in 34ms

5. Client receives:
   HTTP/1.1 201 Created
   X-Correlation-Id: a3f7c21b-8e04-...
   X-Response-Time: 34ms
   (internal implementation details hidden)
```

---

## 4. The Code

### ❌ Wrong Way — Auth Duplicated in Every Service

```java
// ❌ WRONG: JWT validation code in Order Service, Product Service, User Service — all of them
@RestController
public class OrderController {
    
    @PostMapping("/orders")
    public ResponseEntity<OrderDto> createOrder(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody CreateOrderRequest request) {
        
        // ❌ This auth code is copy-pasted across every microservice
        // ❌ When JWT secret rotates, update every service
        // ❌ When JWT library updates, update every service
        // ❌ When auth logic changes (add role, change claim name), every service
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).build();
        }
        String token = authHeader.substring(7);
        Claims claims = jwtParser.parseClaimsJws(token).getBody();  // ❌ duplicated
        String userId = claims.getSubject();                          // ❌ duplicated
        // ... continues with business logic
    }
}
```

---

### ✅ Right Way — Spring Cloud Gateway with JWT Filter

```java
// Gateway application.yml — route configuration
// spring:
//   cloud:
//     gateway:
//       routes:
//         - id: order-service
//           uri: lb://order-service        # lb:// = Ribbon/LoadBalancer to service registry
//           predicates:
//             - Path=/api/v1/orders/**
//             - Method=GET,POST,PUT,DELETE
//           filters:
//             - RewritePath=/api/v1/(?<segment>.*), /${segment}
//             - name: CircuitBreaker
//               args:
//                 name: orderServiceCB
//                 fallbackUri: forward:/fallback/order-service
//             - name: RequestRateLimiter
//               args:
//                 redis-rate-limiter.replenishRate: 100
//                 redis-rate-limiter.burstCapacity: 200
//                 key-resolver: "#{@userIdKeyResolver}"

// JWT Authentication Global Filter
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtPublicKeyProvider keyProvider;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().value();

        // ✅ Whitelist: public endpoints don't require a token
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorized(exchange, "Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7);
        try {
            // ✅ Verify JWT signature using public key (asymmetric RS256)
            // No database call — JWT is self-contained
            Claims claims = Jwts.parserBuilder()
                .setSigningKey(keyProvider.getPublicKey())
                .build()
                .parseClaimsJws(token)
                .getBody();

            String userId = claims.getSubject();
            String roles = claims.get("roles", String.class);

            // ✅ Add verified user info as trusted downstream headers
            // Services trust these headers — they came from the gateway, not the client
            ServerHttpRequest mutatedRequest = request.mutate()
                .header("X-User-Id", userId)
                .header("X-User-Roles", roles)
                .header("X-Auth-Time", String.valueOf(System.currentTimeMillis()))
                // ✅ REMOVE the raw JWT — services don't need it; reduces payload and attack surface
                .headers(h -> h.remove(HttpHeaders.AUTHORIZATION))
                .build();

            log.debug("Authenticated request: userId={} path={}", userId, path);
            return chain.filter(exchange.mutate().request(mutatedRequest).build());

        } catch (ExpiredJwtException e) {
            return unauthorized(exchange, "Token has expired");
        } catch (JwtException e) {
            return unauthorized(exchange, "Invalid token");
        }
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange, String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = """
            {"error":"UNAUTHORIZED","message":"%s"}
            """.formatted(message);
        log.warn("Auth rejected: path={} reason={}", exchange.getRequest().getPath(), message);
        return response.writeWith(Mono.just(response.bufferFactory().wrap(body.getBytes())));
    }

    private boolean isPublicPath(String path) {
        return path.startsWith("/api/auth/")
            || path.startsWith("/api/health/")
            || path.equals("/api/products/search");  // Public product search
    }

    @Override
    public int getOrder() {
        return -100;  // Runs before routing filters; higher priority = lower number
    }
}
```

```java
// Correlation ID Global Filter
@Component
@Slf4j
public class CorrelationIdFilter implements GlobalFilter, Ordered {

    public static final String CORRELATION_ID_HEADER = "X-Correlation-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = exchange.getRequest().getHeaders()
            .getFirst(CORRELATION_ID_HEADER);

        // ✅ Use client-provided correlation ID (for chained requests) or generate new
        if (correlationId == null || correlationId.isBlank()) {
            correlationId = UUID.randomUUID().toString();
        }

        final String finalCoId = correlationId;
        ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
            .header(CORRELATION_ID_HEADER, finalCoId)
            .build();

        // ✅ Also add to response so clients can reference it in support tickets
        exchange.getResponse().getHeaders().add(CORRELATION_ID_HEADER, finalCoId);

        return chain.filter(exchange.mutate().request(mutatedRequest).build())
            .contextWrite(ctx -> ctx.put(CORRELATION_ID_HEADER, finalCoId));
    }

    @Override
    public int getOrder() {
        return -200;  // Runs first — before JWT filter, so correlation ID is in auth logs
    }
}
```

```java
// Downstream service — reads trusted headers (no JWT logic)
@RestController
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping("/orders")
    public ResponseEntity<OrderDto> createOrder(
            // ✅ Trust the X-User-Id header — it came from the gateway after JWT verification
            // Services must be protected at network level: only accept traffic from gateway
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader(value = "X-Correlation-Id", required = false) String correlationId,
            @RequestBody CreateOrderRequest request) {

        log.info("[{}] Creating order for user={}", correlationId, userId);
        OrderDto order = orderService.createOrder(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Role
**Interviewer asks:** "The Order Service and Product Service both need to authenticate requests. Where should authentication happen in a microservices setup, and why?"

**Hruday's answer:**
> Authentication should happen at the API Gateway, not in each individual service. Here's why: if you put JWT validation in every service, you're duplicating the same code — the JWT parsing, signature verification, expiry check, and claim extraction — across every microservice. When the JWT implementation needs to change (token rotation, new claim structure, library upgrade), you update 10+ services instead of 1.
>
> At the gateway, a single JWT auth filter verifies the token once. Upon successful verification, the gateway extracts the user ID and roles from the JWT claims and injects them as trusted downstream headers — `X-User-Id` and `X-User-Roles`. The gateway then strips the original Authorization header before forwarding to the internal service. The Order Service simply reads `@RequestHeader("X-User-Id")` and trusts it completely.
>
> The security model depends on network isolation: internal services must only accept traffic from the API Gateway (or the service mesh), not from external clients directly. In Kubernetes, this is enforced with NetworkPolicy — internal services only allow ingress from the gateway pod's namespace. Without this network boundary, a client could fabricate `X-User-Id: admin` and bypass auth entirely.
>
> Fine-grained authorization (can THIS user access THIS specific resource?) remains in the service: the Order Service checks if the order belongs to the user ID it received. The gateway handles authentication (who are you?); the service handles authorization (are you allowed to do this specific thing?).

---

### Q2 — Gateway Pattern
**Interviewer asks:** "What is the Backend For Frontend (BFF) pattern and when would you use it instead of a single API gateway?"

**Hruday's answer:**
> The BFF pattern means having a separate gateway (or API aggregation layer) per client type — one for the mobile app, one for the web app, one for the third-party API consumers. Each BFF is tailored to its client's specific data needs.
>
> The problem a BFF solves: a single API gateway routes requests but doesn't aggregate data. If the mobile app's home screen needs user profile + order history + recommendations, a single gateway routes three separate requests to three services. The mobile app makes three round trips. A BFF for mobile aggregates those three service calls in one backend request, returns a single tailored response.
>
> Another reason: mobile and web have different data needs. The mobile app on a 4G connection wants compact responses — fewer fields, lighter payloads. The admin web dashboard wants full detail. With a shared gateway, you're stuck with a one-size-fits-all response. With BFFs: the mobile BFF composes a compact response, the web BFF composes a detailed one.
>
> When to use: when you have clients with meaningfully different API consumption patterns — mobile (bandwidth-constrained, battery-constrained), web browser (full feature, user-driven interactions), public API (backward-compatible, documented), admin dashboard (internal, full access). Netflix pioneered this — they have BFFs per device type, each optimised for that device's network and UI characteristics.
>
> When a single gateway is enough: when all clients consume roughly the same API shape and there's no data aggregation needed.

---

### Q3 — Route Configuration
**Interviewer asks:** "How do you configure routing in Spring Cloud Gateway, and what is a predicate?"

**Hruday's answer:**
> Spring Cloud Gateway routes consist of three parts: ID, URI (where to forward), predicates (when to forward), and filters (how to transform the request/response).
>
> A predicate is a condition that must be true for the route to match. Common predicates: `Path=/api/orders/**` matches any request whose path starts with `/api/orders/`. `Method=GET,POST` matches only GET and POST requests. `Header=X-Internal-Source, service-mesh` matches when the header exists with that value. `Weight=group1, 80` sends 80% of traffic to one route and 20% to another — useful for canary deployments.
>
> Once a request matches a route, filters run. Pre-filters modify the request before forwarding (rewrite paths, add headers, validate auth). Post-filters modify the response after the service responds (add timing headers, remove internal headers, transform response bodies).
>
> A practical example for a canary deployment at Swiggy: `Weight=order-service, 90` routes 90% to the stable Order Service and `Weight=order-service-v2, 10` routes 10% to the new version. If metrics confirm the new version is healthy, adjust weights. No code change, no redeployment needed — just a config change via Spring Cloud Config Server.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Gateway becomes a bottleneck" | "Putting everything in the gateway creates a single point of failure and performance bottleneck" | "The gateway is a stateless router — it holds no data, no session state, no cache. It's the easiest tier in the system to horizontally scale: add instances behind a load balancer. With Spring Cloud Gateway running on Netty (non-blocking, reactive), a single instance can handle tens of thousands of concurrent connections efficiently. The real performance consideration: filter chain overhead. Keep global filters light and fast. JWT verification is a cryptographic operation — fast (microseconds for RS256). Avoid any database calls in the request path of the gateway. If you need to look up something per-request (user feature flags, account status), cache it aggressively in Redis with a short TTL. The gateway should add single-digit milliseconds of overhead, not tens of milliseconds." |
| "Trust X-User-Id header from any source" | "Services read X-User-Id from the request header which the gateway sets" | "This is a critical security trap. If a service accepts X-User-Id from any source — including direct external requests — an attacker could call the service directly (bypassing the gateway) with X-User-Id: admin and gain admin access. The X-User-Id trust model ONLY works with proper network isolation. In Kubernetes: NetworkPolicy that allows ingress to Order Service ONLY from the gateway pod's namespace. In AWS: security groups that allow inbound to service instances only from the ALB/gateway security group. Additionally, consider adding an internal shared secret header (X-Internal-Token) that the gateway adds and services validate — a defense-in-depth measure if network isolation is ever accidentally misconfigured. Never rely solely on trusting headers without network-level enforcement." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, our CFIN microservices exposed multiple REST endpoints consumed by both the SAP S/4HANA system and internal web frontends. We deployed Spring Cloud Gateway as the unified entry point. The most immediate win was centralising JWT validation — previously every service had the same auth filter code, copied. When we rotated the signing key (security policy requires rotation every 90 days), it was a single change at the gateway level. The second win was correlation ID injection — we went from 'this 500 error happened somewhere in the order flow' to 'trace ID xyz, grep it across all 6 service logs and reconstruct the exact request path in 30 seconds.' The circuit breaker filter at the gateway gave us a clean fallback for the SAP RFC integration service — when it became unavailable during batch windows, the gateway returned a cached fallback response instead of propagating 503 to the client."

---

## 8. Scale Evolution

**Single service →** No gateway needed. Direct client-to-service. Complexity not justified.

**3-5 microservices →** Spring Cloud Gateway with route config in YAML. Global JWT filter. Correlation ID filter. Rate limiter per user ID via Redis. All services use NetworkPolicy to accept only gateway ingress.

**20+ services →** Gateway is mission-critical. Separate deployment with redundant instances (3+ pods, HPA). Circuit breaker per upstream service. Request/response logging to ELK/Loki. Distributed tracing (Micrometer Tracing → Zipkin/Jaeger) with correlation IDs. Canary routing via weight predicates.

**Kong or AWS API Gateway for managed scale →** Kong: plugin ecosystem (hundreds of plugins for auth, rate limiting, logging). Declarative config via Deck. Admin API for runtime changes. AWS API Gateway: no server management, auto-scales, integrates with AWS WAF, Lambda authorizers, IAM auth. Cost model: per-request pricing. Fits well for serverless/Lambda backend; custom for ECS/EKS may favour Kong or Spring Cloud Gateway.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | API Gateway is the entry point for merchant APIs. Different rate limit tiers per API key. Auth via API key or OAuth2. Gateway-level request signing verification (HMAC-SHA256 payload signature). Traffic routing between v1 and v2 API versions during transitions. | "Design the API gateway strategy for Razorpay's merchant API — how do you handle authentication, versioning, and rate limiting at the gateway for thousands of merchant integrations?" |
| Swiggy / Meesho | BFF pattern for mobile vs web. Flash sale traffic routing. Circuit breaker at gateway for recommendation service (non-critical, degrade gracefully). Canary deployments via weight routing during peak hours. | "During a flash sale, Swiggy's recommendation service becomes slow. How does the API gateway ensure the order placement flow is unaffected?" |
| Adobe / Microsoft | GraphQL gateway over microservices (schema stitching / federation). Developer portal via gateway routing. Multi-tenant SaaS: tenant routing based on subdomain or header. | "How does the API gateway handle multi-tenant routing in Adobe's SaaS platform — routing tenant-A.api.adobe.com vs tenant-B.api.adobe.com to the same internal service?" |
| SAP Labs (current) | SAP API Management (managed gateway for SAP cloud APIs). Spring Cloud Gateway for custom microservices. SAP Integration Suite uses gateway patterns for B2B API integration with ERP systems. RFC → REST gateway for legacy SAP integration. | "SAP S/4HANA systems and internal microservices both call the payment API. How do you design the gateway to authenticate both types of callers (SAP technical user vs JWT-based human user) with different auth mechanisms?" |

---

## 10. Related Topics — What to Study Next

- **Topic 135 — Rate Limiting** — the algorithm (token bucket) and the Spring implementation (Bucket4j + Redis) are separate from where rate limiting lives in the architecture — the gateway; these two topics complete each other: one explains what, the other explains where and how
- **Topic 138 — Circuit Breaker at API Level** — Spring Cloud Gateway has a built-in `CircuitBreakerGatewayFilter` (backed by Resilience4j) that opens the circuit when an upstream service fails repeatedly; the circuit breaker at the gateway layer protects the entire traffic flow, not just individual service calls
- **Topic 75 — Resilience4j** — the library that backs most circuit breaker and rate limiter behaviour in Spring Cloud Gateway; understanding Resilience4j concepts (CLOSED/OPEN/HALF-OPEN, slow call rate threshold) enables correct gateway circuit breaker configuration
- **Topic 141 — Service Discovery** — Spring Cloud Gateway uses `lb://service-name` URIs that resolve via service discovery (Eureka, Consul, or Kubernetes DNS); without service discovery, the gateway routes to hardcoded IPs that change on every deployment; understanding service discovery completes the gateway routing picture

---

*Part 7 · API Gateway — Authentication, Routing, Throttling · Full Stack Interview Guide · Hruday D · 2026*
