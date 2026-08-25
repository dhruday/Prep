# Load Balancing — Layer 4 vs Layer 7 🔥
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Load balancing** = distributing incoming requests across multiple server instances so no single server gets overloaded. The load balancer sits between clients and servers. Clients talk to the load balancer's IP; the load balancer forwards to one of the backend servers and returns the response.
- **Layer 4 (Transport Layer)**: routes by IP address and TCP/UDP port alone. The load balancer never inspects the actual HTTP content — it just sees "TCP connection to port 443, route it to server 3." Ultra-fast (no packet parsing overhead). Stateful TCP connections make it complex. AWS equivalent: Network Load Balancer (NLB).
- **Layer 7 (Application Layer)**: understands HTTP/HTTPS. Can inspect the URL path, HTTP headers, cookie values, query parameters, request body. Routes requests based on that understanding: `/api/images/*` → Image Service, `/api/orders/*` → Order Service, requests with cookie `beta=true` → Canary Deployment. More CPU-intensive than L4. AWS equivalent: Application Load Balancer (ALB). Spring Cloud Gateway is a software L7 load balancer.
- **When L4 is better**: raw TCP performance (WebSocket connections at scale, database connections, gaming servers). You need minimum latency and maximum throughput with no HTTP intelligence needed.
- **When L7 is better**: any modern HTTP microservices architecture. Content-based routing, path-based routing to different microservices, A/B testing, rate limiting, JWT validation, SSL termination, circuit breaking. Essentially all REST/GraphQL/gRPC-HTTP2 APIs.
- **Health checks**: both L4 and L7 load balancers perform health checks. L4: "can I open a TCP connection to this server on this port?" L7: "do I get an HTTP 200 response from `/actuator/health`?" L7 health checks are application-aware and catch more failure modes (app runs but returns 503).

---

## 1. One-Line Definition
Layer 4 load balancing routes traffic based on network-level information (IP, port, protocol); Layer 7 routes based on application-level content (URL, HTTP headers, cookies), enabling intelligent request distribution, content-based routing, and application-aware features.

---

## 2. The Problem It Solves

### Why Dumb Routing Eventually Breaks

```
SCENARIO: Swiggy has one public endpoint (api.swiggy.com) serving
          multiple microservices. Without content-based routing,
          all traffic hits a single monolithic backend.

PROBLEM WITHOUT L7 ROUTING:

  All requests → single backend service
  GET  /api/menus/123      → hits Order-Service (wrong!)
  POST /api/orders         → hits Order-Service (correct)
  GET  /api/restaurants/   → hits Order-Service (wrong!)
  POST /api/payments/pay   → hits Order-Service (wrong!)
  
  Order-Service forwards to the correct microservice internally
  → Unnecessary internal hop (latency +5-10ms)
  → Order-Service becomes the traffic aggregator = single point of failure
  → Can't scale Menu-Service independently from Order-Service
  → Can't rate-limit payment API separately from menu browsing API
  
SOLUTION WITH L7 ROUTING:
  
  L7 Load Balancer routing rules:
  GET  /api/menus/*       → Menu-Service     (3 instances, small)
  GET  /api/restaurants/* → Restaurant-Service (5 instances, large — read-heavy)
  POST /api/orders        → Order-Service    (8 instances — write-heavy)
  POST /api/payments/     → Payment-Service  (4 instances — strict isolation)
  GET  /api/users/*       → User-Service     (3 instances)
  
  Each microservice scales independently based on its own load.
  Payment-Service is isolated — a spike in menus browsing doesn't touch it.
  Rate limiting applied per route: /api/payments/ = 100 req/sec/user; /api/menus/ = 1000 req/sec/user
  All routing logic in ONE place (the L7 load balancer), not scattered across services.
```

---

## 3. How It Works Internally

### L4 Deep Dive — TCP/IP Level Routing

```
L4 LOAD BALANCER OPERATION:

Client: 192.168.1.100
Sends TCP SYN to: 10.0.0.1:443 (load balancer VIP)

L4 LB receives SYN:
  Sees: source IP 192.168.1.100, dest port 443
  Does NOT look at HTTP content (doesn't know or care)
  
  Picks backend: Server-3 at 10.0.1.3:8443 (using its algorithm)
  
  Forwards: SYN → 10.0.1.3:8443
  The LB maintains a "connection table":
  {source: 192.168.1.100:54321, dest: 10.0.0.1:443} → {backend: 10.0.1.3:8443}
  
  All subsequent packets in this TCP session:
  LB sees same source IP + port → looks up connection table → forwards to 10.0.1.3:8443
  (This is the "TCP stickiness" — not logical stickiness by user, but by TCP connection)
  
  Connection between client and backend:
  Client thinks it's talking to 10.0.0.1:443
  Server 10.0.1.3 sees connection from 10.0.0.1 (the LB's IP, via NAT)
  This is NAT-mode load balancing (common for L4)

L4 PROS:
  - Extremely fast — no HTTP parsing (avoids ~0.1ms overhead per request)
  - Lower latency (processing happens at kernel level, not application level)
  - Works for ANY TCP/UDP protocol (not just HTTP)
  - Can handle millions of concurrent connections

L4 CONS:
  - Can't route based on URL path (doesn't know the URL)
  - Can't terminate SSL and inspect encrypted headers
  - Can't do A/B testing (doesn't understand HTTP cookies)
  - Health checks can only check TCP connectivity (not HTTP 200 responses)
  - All requests on one TCP connection go to the same backend (connection-level stickiness)

AWS NLB (Network Load Balancer) = L4:
  - Handles millions of requests/second with ultra-low latency
  - Uses: TCP pass-through, gRPC (which needs HTTP/2 but at L4), database load balancing
```

### L7 Deep Dive — HTTP-Aware Routing

```
L7 LOAD BALANCER OPERATION:

Client: 192.168.1.100
Sends HTTPS request → L7 LB terminates SSL (LB has the cert private key)
L7 LB decrypts the request → now sees full HTTP:

  GET /api/restaurants/456/menus HTTP/1.1
  Host: api.swiggy.com
  Authorization: Bearer eyJhbGci...
  X-User-City: Bangalore
  Cookie: beta_user=true

L7 LB routing decision (checks rules in order):
  Rule 1: path starts with /api/payments/ → Payment-Service cluster
  Rule 2: path starts with /api/restaurants/ → Restaurant-Service cluster ← MATCHES
  Result: forward to Restaurant-Service pod (replicas: 5)
  
  ALSO:
  - Strips the Authorization header before forwarding (centralized auth at gateway)
  - Adds X-Forwarded-For: 192.168.1.100 header (so backend knows real client IP)
  - Adds X-Request-Id: uuid (for distributed tracing)
  - Checks JWT expiry → if expired, returns 401 without hitting backend at all
  
Advanced L7 features:
  CANARY DEPLOYMENT:
  Header X-Canary:true OR Cookie beta_user=true → route 10% traffic to v2 pods
  All other traffic → v1 pods (stable)
  
  A/B TESTING:
  userId hash mod 2 == 0 → Experiment-A pods
  userId hash mod 2 == 1 → Experiment-B pods
  
  RATE LIMITING (at L7 layer):
  Extract JWT claim userId → count requests per userId per minute
  /api/search → 100 req/min per user
  /api/checkout → 10 req/min per user
  Exceeds limit → return 429 Too Many Requests (backend never sees the request)
  
  CIRCUIT BREAKER (at L7 layer):
  Backend Restaurant-Service returns 503 > 50% of the time in last 10 seconds
  L7 LB opens circuit → returns fallback response from cache
  Backend not hammered when already failing

AWS ALB (Application Load Balancer) = L7:
  - Supports content-based routing, path-based routing, host-based routing
  - Integrates with AWS WAF (Web Application Firewall)
  - Supports WebSocket connections (upgrades from HTTP to WS at L7)
  - gRPC is only supported on ALB (not NLB), because gRPC needs HTTP/2 features
```

### Spring Cloud Gateway as a Software L7 Load Balancer

```
SPRING CLOUD GATEWAY: code-configured L7 routing in Java

Gateway sits in front of all microservices in a Spring Boot ecosystem:

@Configuration
public class GatewayRoutingConfig {

    @Bean
    public RouteLocator routes(RouteLocatorBuilder builder) {
        return builder.routes()
            
            // Route 1: Restaurant API → Restaurant Service
            .route("restaurant-service", r -> r
                .path("/api/restaurants/**")
                .filters(f -> f
                    .stripPrefix(0)             // keep /api/restaurants/ prefix
                    .addRequestHeader("X-Gateway-Source", "api-gateway")
                    .circuitBreaker(c -> c       // L7 circuit breaking
                        .setName("restaurant-cb")
                        .setFallbackUri("forward:/fallback/restaurants")))
                .uri("lb://restaurant-service"))  // 'lb://' = Spring Cloud LoadBalancer
            
            // Route 2: Payment API → Payment Service (with stricter rate limiting)
            .route("payment-service", r -> r
                .path("/api/payments/**")
                .filters(f -> f
                    .requestRateLimiter(c -> c    // Per-user rate limiting
                        .setRateLimiter(redisRateLimiter())
                        .setKeyResolver(userKeyResolver())))
                .uri("lb://payment-service"))
            
            // Route 3: Canary — 10% of order traffic to v2
            .route("order-service-canary", r -> r
                .path("/api/orders/**")
                .and()
                .header("X-Canary", "true")       // Only requests with this header
                .uri("lb://order-service-v2"))
            
            // Route 4: All other order traffic to stable v1
            .route("order-service-stable", r -> r
                .path("/api/orders/**")
                .uri("lb://order-service-v1"))
            
            .build();
    }
}
```

---

## 4. The Code

### ❌ Wrong Way — Direct Client-to-Service Routing With No Gateway

```java
// ❌ WRONG: React frontend calls microservices directly (no L7 load balancer)
// This is a common frontend architecture mistake in early-stage startups

// Frontend JavaScript (React service calls):
const fetchRestaurant = async (id) => {
    // ❌ Hardcoded internal service URLs from the frontend
    const response = await fetch(`http://restaurant-service.internal:8083/api/restaurants/${id}`);
    return response.json();
};

const createOrder = async (orderData) => {
    // ❌ Different base URL per service — fragile, not maintainable
    const response = await fetch(`http://order-service.internal:8084/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token },
        body: JSON.stringify(orderData)
    });
};

// ❌ Problems:
// - Internal service URLs exposed to browser — security risk
// - Can't add rate limiting without changing every service
// - Can't do canary deployments without complex frontend logic
// - CORS configured on every individual microservice (duplicated, error-prone)
// - No central authentication — JWT validation repeated in every service
// - Changing Restaurant Service from port 8083 to 8085 = frontend code change
```

---

### ✅ Right Way — L7 Gateway as Single Entry Point

```java
// ✅ CORRECT: All traffic through Spring Cloud Gateway (L7)
// Single entry point. Frontend only knows one URL.

// Frontend (React): single base URL
const API_BASE = 'https://api.swiggy.com';  // Gateway URL only

const fetchRestaurant = async (id) => {
    // ✅ Frontend only knows the gateway URL — internal routing is opaque
    const response = await fetch(`${API_BASE}/api/restaurants/${id}`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return response.json();
};
```

```java
// ✅ Spring Cloud Gateway configuration: central L7 routing
@Configuration
@EnableWebFlux
public class GatewayConfig {

    @Bean
    public RouteLocator gatewayRoutes(RouteLocatorBuilder builder,
                                      JwtAuthFilter jwtFilter) {
        return builder.routes()
            // ✅ Central JWT validation — all routes validate auth at the gateway
            // Backend microservices receive only pre-validated requests
            // No JWT code needed in Restaurant/Order/Payment services

            .route("restaurant-route", r -> r
                .path("/api/restaurants/**")
                .filters(f -> f
                    .filter(jwtFilter)   // ✅ Auth at gateway level
                    .rewritePath("/api/restaurants/(?<segment>.*)", "/${segment}")
                    .retry(config -> config  // ✅ Retry on 503 (transparent to client)
                        .setRetries(2)
                        .setStatuses(HttpStatus.SERVICE_UNAVAILABLE)))
                .uri("lb://restaurant-service"))   // Spring Cloud LB → picks instance

            .route("payment-route", r -> r
                .path("/api/payments/**")
                .filters(f -> f
                    .filter(jwtFilter)
                    // ✅ Stricter rate limiting for payment API (10 req/min per user)
                    .requestRateLimiter(config -> config
                        .setRateLimiter(customRateLimiter(10, 60))
                        .setKeyResolver(jwtUserIdResolver())))
                .uri("lb://payment-service"))

            .build();
    }

    // ✅ JWT filter: validates token, adds X-User-Id header for backend services
    // Backend services read X-User-Id header (already validated at gateway)
    @Bean
    public GatewayFilter jwtAuthFilter(JwtValidator validator) {
        return (exchange, chain) -> {
            String token = extractToken(exchange.getRequest());
            if (token == null) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
            try {
                JwtClaims claims = validator.validate(token);
                // ✅ Add user identity as a trusted internal header
                ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                    .header("X-User-Id", String.valueOf(claims.getUserId()))
                    .header("X-User-Roles", String.join(",", claims.getRoles()))
                    .header("X-Tenant-Id", claims.getTenantId())
                    .build();
                return chain.filter(exchange.mutate().request(mutatedRequest).build());
            } catch (JwtException ex) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }
        };
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Distinction
**Interviewer asks:** "What is the difference between L4 and L7 load balancing? When would you use each?"

**Hruday's answer:**
> Layer 4 and Layer 7 differ in how much they understand about the traffic they route. Layer 4 works at the network layer — it sees source/destination IP addresses and port numbers, but the actual content of the packets is opaque to it. It makes routing decisions based purely on that network metadata. Layer 7 operates at the application layer — it fully understands HTTP. It can see the URL path, request headers, cookies, and even the request body.
>
> I'd use L4 when I need to minimise latency above everything else, or when the protocol isn't HTTP — for example, a WebSocket server farm at massive scale, database connection load balancing, or a DNS-based load balancer. AWS Network Load Balancer is L4 and can handle millions of requests per second with sub-millisecond latency. It doesn't touch the payload — it just forwards TCP connections.
>
> I'd use L7 for essentially every modern HTTP microservices architecture. L7 lets me do path-based routing: `/api/orders` goes to the Order Service, `/api/menus` goes to the Menu Service — which is the basis of API Gateway pattern. It also enables JWT validation at the boundary (authenticate once, all services trust the gateway's headers), rate limiting per route, A/B testing via cookies, and canary deployments via headers. AWS ALB and Spring Cloud Gateway are my go-to L7 options. The latency overhead of L7 vs L4 is minimal for typical web APIs — around 0.5-1ms — and the feature set is worth it.

---

### Q2 — Practical Scenario
**Interviewer asks:** "How does a load balancer know an instance is healthy?"

**Hruday's answer:**
> L4 health checks are at the TCP level: the load balancer tries to open a TCP connection to the backend on the configured port. If the TCP handshake completes, the server is considered "healthy." This is a low bar — an application can be completely broken (throwing 500 errors, out of memory, database connection pool exhausted) and still pass L4 health checks because the JVM can still accept TCP connections.
>
> L7 health checks are HTTP-aware: the load balancer makes an actual HTTP GET request to a configured health endpoint — typically `/actuator/health` in Spring Boot applications. The server must return an HTTP 200 (or 2xx) response within a timeout. Spring Boot Actuator has a built-in `/health` endpoint that checks all registered health indicators: database connectivity, Redis connectivity, Kafka consumer group, disk space. If any is DOWN, the health endpoint returns 503. The L7 load balancer sees 503 → marks the instance as unhealthy → stops sending it traffic.
>
> In Kubernetes, this maps to Liveness and Readiness probes. The Readiness probe is what the load balancer uses — a pod not ready for traffic gets removed from the Kubernetes Service endpoints. I always configure separate liveness and readiness probes in our Spring Boot deployments: readiness checks application health (DB connections, dependencies), liveness just checks that the JVM is responsive (prevents routing to a dead pod without unnecessary restarts when a dependency is down).

---

### Q3 — Design Challenge
**Interviewer asks:** "How would you implement a canary deployment using an L7 load balancer?"

**Hruday's answer:**
> A canary deployment routes a small percentage of traffic to the new version while the rest goes to the stable version, letting you monitor the new version with real traffic before full rollout. At L7, there are two clean ways to do this.
>
> The first is header-based: engineers or automated canary tooling (like Argo Rollouts) sets a `X-Canary: true` header in requests, or a cookie is set for the canary user segment. The L7 gateway (Spring Cloud Gateway in our stack) has a routing rule: if the request has `X-Canary: true` header, route to the v2 pod pool; otherwise route to the v1 pod pool. This is deterministic — a specific user always gets v2, others always get v1. Good for internal testing or beta users.
>
> The second is traffic-weight-based: the L7 load balancer routes X% of all traffic to v2 and (100-X)% to v1, randomly. Start at 5% canary, monitor error rate and latency metrics, increase to 25%, 50%, 100% over hours or days. AWS ALB supports this natively with weighted target groups. Spring Cloud Gateway supports it with a `WeightRoutePredicateFactory`. If canary error rate spikes, roll back by setting v2 weight to 0: instant rollback, zero redeployment needed.
>
> The key monitoring: compare error rate, p99 latency, and business KPIs (order completion rate) between v1 and v2 traffic in real-time. Automated rollback triggers if v2 error rate exceeds v1 by more than 1%.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "L7 is always better" | "You should always use an L7 load balancer" | "L7 has meaningful overhead: it fully decrypts TLS traffic, parses the HTTP payload, evaluates routing rules, and re-encrypts for the backend (when using TLS everywhere). For latency-sensitive protocols — WebSocket at scale, database TCP connections, custom binary protocols over TCP — L4 (NLB in AWS) is the right choice. Gaming companies use L4 for UDP/TCP game server connections. Database proxy layers use L4. L7 is correct for HTTP API routing but L4 has valid use cases." |
| "A load balancer is just for HTTP" | "Load balancers distribute HTTP requests" | "Load balancing is a concept that applies to any protocol over any transport. DNS-based load balancing operates below L4 (returns multiple A records). TCP load balancers (L4) balance any stream-based protocol. HTTP load balancers (L7) balance application-layer protocols. gRPC uses HTTP/2 and requires L7 load balancing (AWS ALB with gRPC support, or Envoy/Istio service mesh which operates at L7 in containerised environments). When gRPC was set up for internal service communication at SAP Labs, we needed to switch from an L4 NLB to ALB specifically because gRPC requires HTTP/2 frame-level load balancing." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, when we containerised our Spring Boot services on Kubernetes, the first load balancing layer was a Kubernetes Ingress controller (NGINX) — which is effectively an L7 load balancer. We configured path-based routing: `/api/cfin-reporting/**` → CFIN Reporting Service, `/api/cfin-processing/**` → CFIN Processing Service. This was critical because the reporting service is read-heavy (scales to 10 pods during month-end) while the processing service is write-heavy with strict ordering constraints (needs fewer pods but larger instances). Without L7 routing, we couldn't scale them independently behind a shared entry point.
>
> We also used L7 features for zero-downtime deployments (canary via request header `X-Deploy-Version: canary`) and for centralised JWT validation in the NGINX ingress using the `nginx.ingress.kubernetes.io/auth-url` annotation. This removed JWT validation code from four separate microservices — centrally handled at the L7 layer. When we rotated the JWT signing key (key rotation every 90 days), we updated it in one place (the ingress) instead of four separate services. That's the real operational benefit of L7 centralization."

---

## 8. Scale Evolution

**1,000 users →** Kubernetes Ingress (NGINX, L7) with two microservices. Path-based routing. Health checks on `/actuator/health`. Simple round-robin within each service. No rate limiting needed yet.

**100,000 users →** AWS ALB (L7) in front of Kubernetes. Rate limiting at ALB level (AWS WAF rules) + Spring Cloud Gateway for fine-grained application-level rules. SSL termination at ALB. Private subnets for all pods — ALB is the only internet-facing component. Canary deployments via weighted target groups.

**10 million users →** AWS ALB + NGINX Ingress in Kubernetes (two layers of L7). AWS CloudFront CDN in front of ALB for static assets and API caching. Multi-region: Route 53 latency-based DNS routing between us-east-1 and ap-south-1 ALBs. Each region has its own ALB → Ingress → service mesh (Istio). Internal service-to-service: Istio sidecar proxies provide L7 routing, circuit breaking, and mTLS between every pod pair.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | AWS ALB routing payment API, merchant dashboard API, webhook delivery API to separate service clusters. L7 WAF rules block known attack patterns (OWASP Top 10 at gateway layer). Canary deployments for payment API changes (too risky to do full cutover). | "Razorpay needs to deploy a new payment processing algorithm that affects 0.1% of transactions. How do you roll it out safely with load balancer-based canary routing?" |
| Swiggy / Meesho | AWS ALB + Kong API Gateway (L7). Path routing: /v1/restaurants, /v1/orders, /v1/tracking → separate service clusters. Rate limiting at gateway (user-facing: 1000 req/min; restaurant facing: 200 req/min). Surge pricing routing: premium users → priority queue cluster. | "Swiggy's surge pricing feature routes premium subscribers to a higher-priority order cluster. How does the L7 load balancer implement this routing based on user tier?" |
| Adobe / Microsoft | Azure Application Gateway (L7) for Creative Cloud API. Azure Load Balancer (L4) for storage backend. Microsoft 365: DNS-based L4/global load balancing between regions, ALB within each region. URL rewriting rules for API versioning (/v1/ → /v2/ for internal routing). | "Adobe Creative Cloud serves both browser and desktop app clients. How does the L7 routing differ between these two client types, and why?" |
| SAP Labs (current) | Kubernetes NGINX Ingress (L7) for SAP BTP microservices. Path routing to SAP CFIN services. L7 auth annotation for centralised JWT (XSUAA) validation. TLS termination at Ingress. Spring Cloud Gateway for internal API composition. | "SAP CFIN has 6 microservices behind a single domain (cfin.sap-labs.internal). How does the L7 Ingress route requests to the correct microservice, and how does it handle authentication centrally?" |

---

## 10. Related Topics — What to Study Next

- **Topic 148 — Load Balancing Algorithms** — once you understand what L7 load balancing is, this topic covers HOW to pick which backend instance to send each request to: round-robin, least connections, IP hash, weighted algorithms; each algorithm has different suitability for stateless vs session-heavy vs compute-heavy services
- **Topic 136 — API Gateway — Authentication, Routing, Throttling** — the Spring Cloud Gateway deep dive; API gateway is the software implementation of L7 load balancing with additional application concerns: authentication, request transformation, circuit breaking, and API versioning — the code-level implementation of what this topic describes conceptually
- **Topic 146 — Stateless Services** — the load balancer's ability to use round-robin freely depends on the backend being stateless; if sticky sessions are required, L4 IP-hash or L7 cookie-based sticky sessions are needed — which defeats much of the benefit of horizontal scaling; stateless design removes the need for stickiness
- **Topic 135 — Rate Limiting** — rate limiting in the context of a production system is most efficiently implemented at the L7 load balancer/API gateway layer — the Token Bucket algorithm using Redis is how Spring Cloud Gateway's `RequestRateLimiter` works; the synergy between L7 routing and rate limiting is critical infrastructure knowledge

---

*Part 8 · Load Balancing — Layer 4 vs Layer 7 · Full Stack Interview Guide · Hruday D · 2026*
