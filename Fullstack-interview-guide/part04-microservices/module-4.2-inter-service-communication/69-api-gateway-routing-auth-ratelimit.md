# API Gateway — Routing, Authentication, and Rate Limiting
> Part 4 — Microservices Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- API Gateway = the single entry point for all external clients (browsers, mobile, third parties) into your microservices system — handles routing, auth, rate limiting, SSL termination, and response aggregation before traffic ever reaches a service
- Without it: every client must know the addresses of 10 services, every service must implement its own auth, every service must implement its own rate limiting — cross-cutting concerns duplicated everywhere
- Core responsibilities: route `/api/v1/orders/*` to OrderService, `/api/v1/payments/*` to PaymentService; validate JWT tokens centrally; rate limit by API key; aggregate responses (call 3 services, stitch together one response); handle CORS for browsers
- Spring Cloud Gateway: the Spring Boot native API gateway — reactive, filter-based pipeline, expressive route configuration in YAML — the primary option for Spring Boot microservices architectures
- Gap to bridge: understanding the difference between an API Gateway (cross-cutting concerns) and BFF (backend for frontend — shaped for a specific client type) — this distinction comes up frequently in senior design interviews

---

## 1. One-Line Definition
An API Gateway is a server that acts as the single entry point for all external requests, accepting calls from clients, applying cross-cutting concerns (authentication, rate limiting, routing, logging), and forwarding requests to the appropriate downstream microservice — so individual services stay focused on their domain logic.

---

## 2. The Problem It Solves

Without an API Gateway, a mobile app making a "show the user's home screen" request might need to:
1. Call `https://user-service:8081/api/users/42/profile`
2. Call `https://order-service:8082/api/users/42/recent-orders?limit=3`
3. Call `https://catalog-service:8083/api/users/42/recommendations`
4. Self-assemble the response from three different services

Problems:
- Each service must individually validate the auth token
- Each service must individually implement rate limiting
- The mobile app must know the internal address of 3 services
- Every service change (address, port, protocol) requires a client-side release
- No central point for logging or observability

With an API Gateway:
- The mobile app calls one endpoint: `https://api.myapp.com/v1/home?userId=42`
- The gateway authenticates the JWT token once
- The gateway routes to the right service OR calls all three and aggregates
- Backend services change freely — clients never see the internal topology
- Every request is logged at one place

---

## 3. How It Works Internally

### Gateway Request Processing Pipeline

```
CLIENT REQUEST → API GATEWAY FILTER CHAIN → DOWNSTREAM SERVICE

Request arrives
    ↓
Pre-Filters (execute before routing):
  1. JWT Authentication Filter: validate Bearer token, extract userId
  2. Rate Limit Filter: check Redis counter for this API key
  3. Request Logging Filter: log request method, path, clientId
  4. CORS Filter: handle preflight OPTIONS requests from browsers
  5. Request Transformation Filter: add X-User-ID header (extracted from JWT)
    ↓
Routing: match path pattern → select target service
  /api/v1/orders/** → order-service (via Kubernetes DNS)
  /api/v1/payments/** → payment-service
  /api/v1/catalog/** → catalog-service
    ↓
Proxy: forward modified request to downstream service
    ↓
Post-Filters (execute after downstream response):
  6. Response Logging Filter: log status code, latency
  7. Response Transformation Filter: remove internal headers from response
  8. Security Headers Filter: add HSTS, X-Content-Type-Options, etc.
    ↓
RESPONSE RETURNED TO CLIENT
```

### Spring Cloud Gateway — Route Configuration

Spring Cloud Gateway uses a declarative YAML-based route configuration. Each route has: predicates (when does this route match?), filters (what transformations apply?), and a URI (where does traffic go?).

```yaml
# gateway/application.yml
spring:
  application:
    name: api-gateway

  cloud:
    gateway:
      routes:
        # Route 1: Order Service
        - id: order-service-route
          uri: lb://order-service        # "lb://" = load-balanced via service discovery
          predicates:
            - Path=/api/v1/orders/**     # Matches all paths starting with /api/v1/orders/
          filters:
            - StripPrefix=0             # Don't strip any prefix — forward as-is
            - name: RequestRateLimiter  # Apply rate limiting on this route
              args:
                redis-rate-limiter.replenishRate: 100   # 100 requests/second
                redis-rate-limiter.burstCapacity: 200   # Allow burst up to 200
                key-resolver: "#{@userKeyResolver}"     # Rate limit per user
            - name: CircuitBreaker      # Circuit breaker for this upstream
              args:
                name: orderServiceCB
                fallbackUri: forward:/fallback/order-service

        # Route 2: Payment Service (stricter rate limiting — critical path)
        - id: payment-service-route
          uri: lb://payment-service
          predicates:
            - Path=/api/v1/payments/**
            - Method=POST,GET            # Only allow POST and GET (not DELETE)
          filters:
            - AddRequestHeader=X-Gateway-Source, api-gateway
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 50
                redis-rate-limiter.burstCapacity: 100
                key-resolver: "#{@apiKeyResolver}"  # Rate limit per API key

        # Route 3: Catalog Service (public, no auth needed)
        - id: catalog-service-route
          uri: lb://catalog-service
          predicates:
            - Path=/api/v1/catalog/**
          # No auth filter — public catalog, no JWT required
          metadata:
            auth-required: false

      default-filters:
        - AddResponseHeader=X-Gateway-Version, 1.0
        - DedupeResponseHeader=Access-Control-Allow-Credentials Access-Control-Allow-Origin

      globalcors:
        cors-configurations:
          '[/**]':
            allowedOriginPatterns:
              - "https://*.myapp.com"
              - "http://localhost:*"   # Dev only — restrict in production
            allowedMethods: [GET, POST, PUT, DELETE, OPTIONS]
            allowedHeaders: [Authorization, Content-Type, X-Request-ID]
            maxAge: 3600
```

### JWT Authentication Filter
```java
@Component
@Slf4j
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private final JwtValidator jwtValidator;
    // Routes that do not require authentication
    private static final Set<String> PUBLIC_PATHS = Set.of(
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/catalog"  // Public catalog — no auth needed
    );

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();

        // Skip auth for public paths
        if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return onUnauthorised(exchange, "Missing or malformed Authorization header");
        }

        String token = authHeader.substring(7);

        return jwtValidator.validate(token)
                .flatMap(claims -> {
                    // Add extracted user info as headers for downstream services
                    // Downstream services trust these headers (only gateway can set them)
                    ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                            .header("X-User-ID", claims.getSubject())
                            .header("X-User-Roles", String.join(",", claims.getRoles()))
                            .header("X-Tenant-ID", claims.getTenantId())
                            .build();
                    return chain.filter(exchange.mutate().request(mutatedRequest).build());
                })
                .onErrorResume(JwtValidationException.class,
                    ex -> onUnauthorised(exchange, ex.getMessage()));
    }

    private Mono<Void> onUnauthorised(ServerWebExchange exchange, String reason) {
        log.warn("Unauthorized request to {}: {}", exchange.getRequest().getPath(), reason);
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = """
            {"error": "UNAUTHORIZED", "message": "%s"}
            """.formatted(reason);
        DataBuffer buffer = exchange.getResponse().bufferFactory()
                                    .wrap(body.getBytes(StandardCharsets.UTF_8));
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -100;  // Run early in the filter chain
    }
}
```

### Rate Limiting with Redis
```java
// Rate limiter key resolver — rate limit per authenticated user
@Bean
public KeyResolver userKeyResolver() {
    return exchange -> {
        // Extract userId from the X-User-ID header (set by JWT filter)
        String userId = exchange.getRequest().getHeaders().getFirst("X-User-ID");
        return Mono.just(userId != null ? "user:" + userId : "anonymous");
    };
}

// Alternative: rate limit per API key (for third-party integrations)
@Bean
public KeyResolver apiKeyResolver() {
    return exchange -> {
        String apiKey = exchange.getRequest().getHeaders().getFirst("X-API-Key");
        return Mono.just(apiKey != null ? "apikey:" + apiKey : "anonymous");
    };
}
```

---

## 4. The Code

### Fallback Handler for Circuit Breaker
```java
// When downstream service is unavailable, circuit breaker triggers fallback
@RestController
public class FallbackController {

    @RequestMapping("/fallback/order-service")
    public ResponseEntity<Map<String, Object>> orderServiceFallback(
            @RequestHeader HttpHeaders headers,
            ServerWebExchange exchange) {

        log.warn("Order service fallback triggered for path: {}",
                 exchange.getRequest().getPath());

        Map<String, Object> response = Map.of(
            "error", "SERVICE_UNAVAILABLE",
            "message", "Order service is temporarily unavailable. Please try again shortly.",
            "retryAfter", 30,
            "correlationId", headers.getFirst("X-Correlation-ID")
        );

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }

    @RequestMapping("/fallback/payment-service")
    public ResponseEntity<Map<String, Object>> paymentServiceFallback() {
        // Payment service unavailable — cannot degrade gracefully, must fail fast
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of(
                    "error", "PAYMENT_SERVICE_UNAVAILABLE",
                    "message", "Payment processing is temporarily unavailable."
                ));
    }
}
```

### Request ID Propagation (Distributed Tracing Support)
```java
// Add correlation ID to every request if not present — traces across all services
@Component
public class CorrelationIdFilter implements GlobalFilter, Ordered {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String correlationId = exchange.getRequest().getHeaders().getFirst(CORRELATION_ID_HEADER);

        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
            exchange = exchange.mutate()
                    .request(r -> r.header(CORRELATION_ID_HEADER, correlationId))
                    .build();
        }

        // Also add to response so client can reference it in support tickets
        final String finalCorrelationId = correlationId;
        exchange.getResponse().getHeaders().add(CORRELATION_ID_HEADER, finalCorrelationId);

        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        return -200;  // Run BEFORE JWT filter — correlation ID needed for logging in all filters
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is an API Gateway and why do you need one in a microservices architecture?"

**Hruday's answer:**
> An API Gateway is the single entry point for all external traffic into a microservices system. Every client — browser, mobile app, third-party partner — sends requests to one gateway URL. The gateway handles authentication, rate limiting, routing to the appropriate downstream service, and response assembly.
>
> Without a gateway, every service must individually implement auth validation, rate limiting, CORS, SSL termination, and logging. That's duplicated cross-cutting concern code in every service — 10 services each implementing JWT validation means 10 places to update if the JWT secret rotates. The gateway centralises this.
>
> It also provides client isolation from internal topology. Clients don't know if OrderService runs as one service or is internally split into CreateOrderService and ReadOrderService. They call `/api/v1/orders` and the gateway routes appropriately. Internal refactoring does not require client app changes.
>
> In Spring Boot microservices, Spring Cloud Gateway is the reactive (Project Reactor based) gateway with a YAML-driven route configuration, reusable filter chains, and native integration with Spring Cloud LoadBalancer, Resilience4j circuit breakers, and Redis rate limiting.

---

### Q2 — Deep Dive
**Interviewer asks:** "How does request authentication work in the API Gateway?"

**Hruday's answer:**
> The gateway implements a global authentication filter that runs on every request before routing. For JWT-based auth, the filter extracts the Bearer token from the Authorization header, validates its signature and expiry against the public key (using a JwtValidator bean), and if valid, extracts claims — user ID, roles, tenant ID.
>
> The key action: the gateway then ADDS the extracted claims as request headers (X-User-ID, X-User-Roles, X-Tenant-ID) on the forwarded request to the downstream service. Downstream services trust these headers — they do not re-validate the JWT themselves. This is because traffic that reaches a downstream service inside the cluster has already passed through the gateway. Downstream services should be on a private network — not accessible from the internet directly.
>
> This architecture has a security dependency: downstream services MUST NOT be publicly accessible. If InventoryService is accidentally exposed to the internet, a caller can skip the gateway, forge the X-User-ID header, and bypass authentication entirely. Kubernetes NetworkPolicies or a service mesh mutual TLS configuration ensures service-to-service traffic only comes from the gateway and other authorised services.
>
> For public endpoints (catalog browsing, login page), the gateway explicitly skips the auth filter for those paths. The configuration is a path-based exclusion list checked before JWT validation.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the risks of putting too much logic in the API Gateway?"

**Hruday's answer:**
> The API Gateway can become an anti-pattern if it accumulates business logic that belongs in services. "Too much gateway" looks like: the gateway joins data from two services and transforms the response; the gateway contains pricing rules or eligibility checks; the gateway calls 8 services and assembles a complex response with business rules.
>
> The risk: the gateway becomes a monolith chokepoint. If every request requires 8 downstream calls and complex transformation logic in the gateway, you've created a distributed monolith where the gateway is the tightly coupled orchestrator. Performance suffers (8 serial calls per user request), the gateway becomes the single most important system to keep running, and business logic is hidden in infrastructure code.
>
> The rule: the gateway handles cross-cutting infrastructure concerns — auth, rate limiting, routing, SSL, CORS, logging, tracing. Business logic stays in services. For complex response aggregation that genuinely needs multiple services, consider a Backend for Frontend (BFF) — a dedicated lightweight service that aggregates for a specific client type. The BFF is a service, not the gateway — it can have business logic and can be owned by a product team.
>
> Keep the gateway thin and fast. It is in the critical path of every single user request. Latency in the gateway multiplied by all requests is very costly.

---

### Q4 — Security Question
**Interviewer asks:** "How do you implement rate limiting in the API Gateway?"

**Hruday's answer:**
> Spring Cloud Gateway has a built-in `RequestRateLimiter` filter that uses Redis for distributed counter storage. Redis stores request counts with automatic TTL — no manual cleanup needed.
>
> The configuration: replenishRate (tokens added per second) and burstCapacity (maximum burst before throttling). This is a token bucket algorithm. A user with replenishRate=100 and burstCapacity=200 can burst up to 200 requests immediately from a full bucket, but sustains only 100 requests per second over time.
>
> The key decision is what the rate limiting key is. Options: rate limit per authenticated user (prevents one user from overwhelming the system), per API key (for third-party integrations — each partner has a quota), per IP (for unauthenticated endpoints to prevent scraping), or globally per route.
>
> For a payment API like Razorpay: rate limiting per merchant API key is critical. A merchant with a buggy integration sending 10,000 payment requests per second should be throttled — both to protect the system and to protect the merchant from accidental charges. Different merchants can have different limits configured in Redis (a `RateLimitConfig` service can push per-merchant limits to Redis, which the gateway reads).
>
> When a rate limit is exceeded: gateway returns HTTP 429 Too Many Requests with a `Retry-After` header telling the client when to try again. The response body includes the current quota and reset time so clients can self-regulate.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Put business logic in the gateway" | "The gateway can do the response aggregation for the home screen" | "Keep the gateway stateless and thin — routing, auth, rate limiting, logging, CORS. Response aggregation with business logic belongs in a BFF service that the gateway routes to. If the gateway goes down, everything goes down — minimising the gateway's surface area and complexity directly reduces mean-time-to-outage." |
| "The gateway validates JWT with the auth service on every request" | "The gateway calls AuthService to validate every JWT" | "Calling AuthService synchronously on every request is a performance kill and a single point of failure. JWT is designed for local validation — the public key is cached in the gateway at startup, and validation is a CPU operation (signature check). No network call needed. Only token revocation (invalidating a specific token before expiry) needs a Redis lookup — and even that can use a bloom filter for sub-millisecond performance." |
| "No circuit breaker on gateway upstream calls" | "If the service is down, the gateway will just timeout" | "If InventoryService is down and the gateway has no circuit breaker, every request to /api/v1/inventory/ will wait the full timeout duration (say 5 seconds), exhausting gateway thread pool and creating cascading failure. Spring Cloud Gateway integrates Resilience4j circuit breakers per route — when the circuit opens (>50% failures), the gateway returns the fallback immediately without waiting for the timeout." |
| "One API gateway for everything" | "A single gateway handles all clients" | "Different clients have very different needs. A mobile app home screen needs a compact, bandwidth-efficient response; an admin dashboard needs verbose detail; a third-party partner API needs a stable versioned interface. Serving all from one gateway with one response shape forces the lowest common denominator. The BFF pattern (Topic 70) addresses this — gateway routes client-type traffic to dedicated BFF services optimised for each client." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, the frontend I worked on consumed SAP's internal API Gateway (SAP API Management on BTP). The gateway handled OAuth 2.0 token validation, request/response transformation between OData v4 and our custom JSON format, and rate limiting for different consumer tiers. When I started studying microservices architecture deeper, I realised that what I had been a consumer of — the API Management layer — is exactly what Spring Cloud Gateway implements in Java. The conceptual model I absorbed as a frontend developer (single entry point, standardised auth, route configuration) directly applies now as a backend architect. That translation from 'API consumer' to 'API gateway designer' is a concrete experiential anchor I can explain in interviews."

---

## 8. Scale Evolution

**10 services, <1K RPS →** A single Spring Cloud Gateway instance is fine. Basic JWT validation and routing. No Redis needed — in-memory rate limiting with Guava cache.

**100 services, 10K RPS →** Spring Cloud Gateway cluster (2-3 instances behind a load balancer). Redis for distributed rate limiting and circuit state. Route configuration externalised to Spring Cloud Config Server so updates don't require gateway restart.

**1M RPS →** Consider a battle-tested managed gateway: Kong (open source, Lua plugins), AWS API Gateway (fully managed), or Nginx Plus. Optional: Kubernetes Ingress Controller (NGINX Ingress, Traefik, or Kong Ingress) as the edge layer, with Spring Cloud Gateway as a second-layer gateway for service-mesh-level routing. Service mesh (Istio) handles mTLS between services, gateway handles external auth.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | API Gateway is the entry point for merchant integrations. Rate limiting per merchant API key, versioned routes (/v1, /v2), JWT/OAuth for merchant and user auth — all gateway concerns. | "How do you rate limit Razorpay's payment API per merchant while allowing bursts during flash sales?" |
| Swiggy / Meesho | Multiple client types (consumer app, driver app, restaurant app, web) — gateway routes by client and can aggregate for common page loads. High-traffic events require rate limiting to prevent cascade. | "The restaurant home page calls 5 APIs. How would you reduce this to 1 call from the app?" |
| Adobe / Microsoft | Complex auth (OAuth, SAML, API keys for different client types), API versioning, partner integrations through a single gateway — enterprise-grade gateway patterns are directly applicable. | "How do you implement API versioning at the gateway level without breaking existing clients?" |
| SAP Labs (current) | SAP API Management (part of BTP) is SAP's enterprise API Gateway. Understanding Spring Cloud Gateway gives context for what SAP API Management provides and how to architect service integration on SAP BTP. | SAP API Management setup and policy configuration discussions. |

---

## 10. Related Topics — What to Study Next

- **Topic 70 — Backend for Frontend (BFF) Pattern** — the complementary pattern: when different client types (mobile, web, third party) need different response shapes from the same underlying services, the BFF pattern creates client-specific aggregators that sit behind the gateway
- **Topic 71 — Circuit Breaker Pattern** — the gateway applies circuit breakers per route; when a downstream service is degraded, the circuit opens and the gateway returns fallbacks immediately — critical for gateway-level resilience
- **Topic 68 — Service Discovery** — the gateway discovers downstream services via Kubernetes DNS or Eureka; the `lb://service-name` syntax in Spring Cloud Gateway configuration uses service discovery under the hood
- **Topic 84 — Distributed Tracing** — the gateway is the ideal place to inject correlation IDs and start trace spans — key for end-to-end request tracing from client through gateway to every downstream service
- **Topic 72 — Retry with Exponential Backoff** — configuring retry policies on the gateway for transient downstream failures, without causing retry storms

---

*Part 4 · API Gateway · Full Stack Interview Guide · Hruday D · 2026*
