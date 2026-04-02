# Stateless Services — Why They Scale Better 🔥
> Part 8 — Distributed Systems & Scalability
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Stateless service**: every incoming request contains all information needed to process it. The server holds zero per-user runtime data between requests — no session, no cache, no user context. After a request is handled, the server forgets everything about it.
- **Stateful service**: the server holds per-user data *between* requests. HTTP session objects in JVM memory are the classic example — `session.setAttribute("cart", cartItems)`. The server must remember this across the user's session lifetime. If the user's next request goes to a different server: that cart is gone.
- **Why stateless scales**: if any server can handle any request, load balancers can distribute freely using round-robin. You can spin up 5 new pods and immediately start routing traffic to them. No "warm up" needed. Pod dies? Users transparently routed to surviving pods.
- **Why stateful breaks scaling**: stateful servers create "sticky sessions" — each user is locked to one server. When Server 1 has 200 active sessions and Server 2 has 20: you can't rebalance. Load balancer must route User A always to Server 1, User B always to Server 2. Adding Server 3 doesn't help existing users; it only helps new users. Scaling is effectively sequential, not parallel.
- **The three stateless patterns**: (1) JWT for authentication — token carries identity/roles, no server-side session needed; (2) Redis for session data that must persist across requests; (3) no in-process caches — replace with a shared cache (Redis / CDN).
- **The JVM thread model**: a stateless service can handle requests with any thread in the pool (no thread-local user state). Any thread processes any request. A stateful service with thread-local session must ensure the same thread (or at least the same JVM) handles the user's requests — a severe constraint.

---

## 1. One-Line Definition
A stateless service holds no per-user state between requests — each request is self-contained. This allows any server instance to handle any request, which is the prerequisite for horizontal scaling.

---

## 2. The Problem It Solves

### Why Sticky Sessions Kill Horizontal Scaling

```
SCENARIO: E-commerce order service with in-JVM sessions.
          Currently 3 servers. Need to add more for peak traffic.

STATEFUL SETUP (sticky sessions):
  Server-1: handleing 400 active sessions (JVM Heap)
  Server-2: handling 250 active sessions (JVM Heap)
  Server-3: handling 200 active sessions (JVM Heap)
  
  Load Balancer config: route by JSESSIONID cookie
  → User-A always → Server-1
  → User-B always → Server-1
  → User-C always → Server-2
  
  Add Server-4:
  Server-4: 0 active sessions
  Load balancer: new users → Server-4
                 existing users → same servers as before (sticky cookies)
  
  5 minutes later:
  Server-1: still 400 sessions (existing users still sticky)
  Server-4: 40 new users
  Server-1 is still the hotspot. Server-4 is nearly idle.
  Adding servers DOESN'T HELP existing traffic.
  
  WORSE: Server-1 crashes at peak:
  400 users' sessions lost → all 400 logged out, carts emptied
  These users must log in again, rebuild cart → support calls
  
STATELESS SETUP (shared state in Redis):
  Server-1: zero session state in memory
  Server-2: zero session state in memory
  Server-3: zero session state in memory
  Redis:    all session data for all users (TTL=24h)
  
  Load Balancer: pure round-robin
  → Request 1 → Server-1
  → Request 2 → Server-2
  → Request 3 → Server-3
  → Request 4 → Server-1 ...
  
  Add Server-4:
  Load balancer immediately routes 25% of ALL traffic to Server-4
  (including existing users' next requests — stateless means no stickiness needed)
  Existing users feel nothing — their state is in Redis, accessible by any server
  
  Server-1 crashes:
  Traffic redistributed to Servers 2, 3, 4 instantly
  Users' sessions in Redis — still accessible
  Users continue shopping, logged in, cart intact
```

---

## 3. How It Works Internally

### The Three Patterns That Make a Service Stateless

```
PATTERN 1: REPLACE HTTP SESSION WITH JWT

BEFORE (stateful):
  POST /api/login → Server validates credentials → creates HTTP session
  HttpSession session = request.getSession();
  session.setAttribute("userId", user.getId());
  session.setAttribute("roles", user.getRoles());
  session.setAttribute("tenantId", tenant.getId());
  Response sends: Set-Cookie: JSESSIONID=ABCD1234
  
  Server-1 JVM Heap now has: {ABCD1234: {userId:42, roles:[ADMIN], tenantId:99}}
  Next request must come to Server-1 (only Server-1 has this data in memory)

AFTER (stateless):
  POST /api/login → Server validates credentials → creates JWT
  JWT payload (claims): {userId:42, roles:[ADMIN], tenantId:99, exp:1735689600}
  JWT is signed with server's private key → tamper-proof
  Response sends: Authorization: Bearer eyJhbGci...
  
  Server-1 JVM Heap: empty. No session stored.
  Next request: ANY server receives JWT → verifies signature → reads claims
  No server-to-server coordination needed. Fully stateless. ✅
  
  JWT drawbacks:
  - Can't invalidate a JWT before it expires (no server-side state to check)
  - Solution: short TTL (15 minutes) + refresh token (stored in Redis for revocation)
  - For logout: add JWT jti (JWT ID) to Redis "revoked" set until original expiry

PATTERN 2: EXTERNALISE SESSION DATA TO REDIS

  Some multi-step workflows genuinely need cross-request state:
  - Checkout wizard (step 1: cart, step 2: address, step 3: payment details)
  - OAuth flow (state parameter, code verifier)
  - File upload progress (resumable uploads)
  
  Instead of JVM session: store in Redis with TTL
  Key: "session:{userId}" or "session:{sessionToken}"
  Value: serialised session object (JSON or binary)
  TTL: 30 minutes of inactivity → auto-expire
  
  Any server reads session from Redis → processes request → updates Redis
  Redis is the single source of truth, not any one server's heap

PATTERN 3: EXTERNALISE IN-PROCESS CACHES

BEFORE (stateful — in-process cache):
  Server-1 cache: {product:123 → {name: "SAP License", price: 999}}
  Server-2 cache: {product:123 → {name: "SAP License", price: 999}}
  
  Admin updates product price to 1099:
  Server-1 cache UPDATED (received the update event)
  Server-2 cache STALE (missed the event or not subscribed)
  
  User's request routes to Server-2 → sees old price 999
  User routes to Server-1 → sees new price 1099
  INCONSISTENT. Different users see different data.
  
AFTER (stateless — shared Redis cache):
  Redis: {product:123 → {name: "SAP License", price: 1099}}
  
  Admin updates price → writes to DB + invalidates Redis key
  Server-1 next request: Redis miss → fetch from DB → cache in Redis → 1099
  Server-2 next request: Redis hit → 1099
  ALL users see consistent data regardless of which server they hit
```

### Spring Session Redis — Zero-Code Externalisation

```
SETUP: replace in-JVM HttpSession with Redis automatically

pom.xml:
  spring-boot-starter-data-redis
  spring-session-data-redis
  
Config:
  @Configuration
  @EnableRedisHttpSession(maxInactiveIntervalInSeconds = 1800)  // 30 min
  public class SessionConfig {
      // Spring Session automatically intercepts all HttpSession calls
      // and routes them to Redis instead of JVM heap
      // ZERO changes to existing session-using code required
  }
  
application.yml:
  spring:
    redis:
      host: redis-cluster.internal
      port: 6379
  
What happens automatically:
  session.setAttribute("cart", cart) → stored in Redis as hash
  session.getAttribute("cart")       → fetched from Redis
  session.invalidate()               → deleted from Redis
  
  JSESSIONID cookie still works — it's now the Redis key prefix
  But any server can serve any JSESSIONID — they all read from shared Redis
  No sticky sessions needed. ✅

Redis key structure (Spring Session):
  spring:session:sessions:{session-id}
    userId: 42
    cart: [serialised list]
    tenantId: 99
    lastAccessedTime: 1735685000
  
  TTL: set by maxInactiveIntervalInSeconds = auto-reset on each access
```

---

## 4. The Code

### ❌ Wrong Way — Session Stored in JVM Memory

```java
// ❌ WRONG: Classic HttpSession in JVM heap → breaks horizontal scaling

@RestController
@RequestMapping("/api/checkout")
public class CheckoutController {

    @PostMapping("/cart/add")
    public ResponseEntity<String> addToCart(
            HttpSession session,
            @RequestBody AddToCartRequest request) {

        // ❌ Stored in THIS server's JVM heap — invisible to other pods
        @SuppressWarnings("unchecked")
        List<CartItem> cart = (List<CartItem>) session.getAttribute("cart");
        if (cart == null) {
            cart = new ArrayList<>();
        }

        cart.add(new CartItem(request.getProductId(), request.getQuantity()));
        session.setAttribute("cart", cart);  // ❌ JVM-local

        return ResponseEntity.ok("Added to cart");
    }

    @GetMapping("/cart")
    public ResponseEntity<List<CartItem>> getCart(HttpSession session) {
        // ❌ Returns null if this request routes to a different pod than the POST
        List<CartItem> cart = (List<CartItem>) session.getAttribute("cart");
        return ResponseEntity.ok(cart != null ? cart : Collections.emptyList());
    }
}
// This works fine with 1 server.
// With 2+ servers and no sticky sessions: cart disappears between requests.
// With sticky sessions: scaling is effectively disabled for existing users.
```

---

### ✅ Right Way — JWT Auth + Redis Session for Stateless Operation

```java
// ✅ CORRECT: JWT for authentication, Redis for session state
// Now any pod handles any request

@RestController
@RequestMapping("/api/checkout")
@RequiredArgsConstructor
@Slf4j
public class CheckoutController {

    private final RedisTemplate<String, Object> redis;
    private static final String CART_PREFIX = "cart:";
    private static final Duration CART_TTL = Duration.ofHours(24);

    @PostMapping("/cart/add")
    public ResponseEntity<CartResponse> addToCart(
            @AuthenticationPrincipal JwtPrincipal principal,  // ✅ JWT-extracted, stateless
            @RequestBody @Valid AddToCartRequest request) {

        String cartKey = CART_PREFIX + principal.getUserId();  // "cart:42"

        // ✅ Redis hash — any pod can read/write this
        redis.opsForHash().put(cartKey,
                String.valueOf(request.getProductId()),
                request.getQuantity());

        redis.expire(cartKey, CART_TTL);  // ✅ Reset TTL on activity (24h idle expiry)

        long itemCount = redis.opsForHash().size(cartKey);
        return ResponseEntity.ok(new CartResponse("Added to cart", itemCount));
    }

    @GetMapping("/cart")
    public ResponseEntity<List<CartItem>> getCart(
            @AuthenticationPrincipal JwtPrincipal principal) {

        String cartKey = CART_PREFIX + principal.getUserId();

        // ✅ Fetches from shared Redis — same data regardless of which pod serves it
        Map<Object, Object> cartEntries = redis.opsForHash().entries(cartKey);

        List<CartItem> cart = cartEntries.entrySet().stream()
                .map(e -> new CartItem(
                        Long.parseLong(e.getKey().toString()),
                        Integer.parseInt(e.getValue().toString())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(cart);
    }

    @DeleteMapping("/cart")
    public ResponseEntity<Void> clearCart(
            @AuthenticationPrincipal JwtPrincipal principal) {
        redis.delete(CART_PREFIX + principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}
```

```java
// ✅ JWT Security Config — stateless authentication
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            // ✅ STATELESS: no server-side session for Spring Security
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(csrf -> csrf.disable())  // JWT handles CSRF implicitly (no cookies)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()
                .anyRequest().authenticated())
            // ✅ JWT filter runs before UsernamePasswordAuthenticationFilter
            // Extracts userId, roles from JWT — no DB lookup required per request
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Core Concept
**Interviewer asks:** "What does 'stateless' mean for a web service, and why does it make scaling easier?"

**Hruday's answer:**
> A stateless service holds no information about past requests. When a request arrives, the service processes it using only what's in that request plus shared external stores like a database or Redis — it never looks up something it memorised from a previous request to the same instance.
>
> This makes scaling easier in two precise ways. First, load distribution becomes truly flexible. A load balancer can send request 1 to instance A, request 2 to instance B, request 3 to instance C — and each instance gets correct, consistent results because none of them depend on what a previous request left behind locally. If I add 10 new instances, 100% of traffic — including existing users' requests — can be distributed to those new instances immediately.
>
> Second, failure becomes cheap. If instance A crashes, the load balancer routes to instances B and C. The user's next request works fine because the session data is in Redis, not in instance A's heap. The user might not even notice. With a stateful instance, crashing instance A means every user whose session was on A gets logged out, loses their cart, and has to start over.
>
> The practical implementation: JWT for auth (the token itself carries identity — no server-side lookup), Redis for any session data that must persist between requests, Spring Cache with Redis backing for any caching. After these three steps, you can run 1 instance or 100 instances and the result is the same.

---

### Q2 — Practical Design
**Interviewer asks:** "You have a Spring Boot service that uses HttpSession heavily. How do you make it stateless without a full rewrite?"

**Hruday's answer:**
> There's a beautiful shortcut for existing Spring Boot applications: Spring Session Redis. You add two Maven dependencies — `spring-session-data-redis` and `spring-boot-starter-data-redis` — and add `@EnableRedisHttpSession` to a config class. That's it. No code changes to any of the `session.getAttribute()` or `session.setAttribute()` calls throughout the application.
>
> Spring Session transparently intercepts every HttpSession call and redirects it to Redis. The `JSESSIONID` cookie still works as the session identifier — but instead of looking up a JVM HashMap on the local server, Spring Session looks up a Redis hash with the session ID as the key. Any server that receives the request can look up the same Redis key and get the same session data.
>
> The immediate benefit: you can now run multiple replicas behind a Kubernetes Service with a plain round-robin load balancer — no sticky session configuration needed. Existing code works unchanged.
>
> The longer-term improvement: once you've externalised sessions to Redis, you can start evolving toward JWT where it makes sense — for pure authentication state (userId, roles), you don't need Redis at all; a properly signed JWT carries that in the token itself. This reduces Redis lookups for the most common case, leaving Redis only for actual application data like shopping carts or wizard state.

---

### Q3 — Trade-off Question
**Interviewer asks:** "What are the downsides of JWT-based stateless auth? When would you NOT use JWT?"

**Hruday's answer:**
> JWT's main downside is that you can't revoke a token before it expires. A JWT is a self-contained claim signed by the server. Once issued, any server that trusts the signing key will accept it — the server has no record of which JWTs it has issued. If a user logs out, you want to invalidate the JWT immediately. But you can't — the token is valid until its `exp` claim fires.
>
> The workaround is a "blocklist" (or deny-list): keep a Redis set of revoked JWT IDs (`jti` claim). On every request, after validating the signature, check if the JWT ID is in the revoked set. If yes, reject as 401. This re-introduces a small piece of state (the blocklist), but it's much lighter than full session storage — you only need to track revoked tokens, not active ones, and entries auto-expire when the token's original TTL would have fired anyway.
>
> The second scenario where JWT doesn't fit well: very long-lived sessions. If a JWT expires after 15 minutes and requires a refresh token exchange, that's friction. Some enterprise applications (SAP portal, internal tools) need sessions lasting 8+ hours. For those, Redis-backed sessions are simpler — the session is accessed frequently anyway, so the Redis lookup cost is negligible.
>
> Short answer: use JWT for stateless microservice-to-microservice auth (M2M calls) and API access tokens. Use Redis sessions for user-facing applications with long, complex sessions, or where immediate revocation (logout, account suspension) is required.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "JWT is always stateless" | "JWT makes authentication stateless" | "JWT authentication is stateless for reads — validating a JWT requires no server-side lookup. But logout (token revocation) requires state — a Redis blocklist indexed by JWT ID. A common interview mistake is saying 'JWT is stateless and you can't implement logout.' You CAN implement logout; you just need a lightweight blocklist. The checklist: JWT alone = stateless reads. JWT + Redis blocklist = stateless reads + revocation support. The blocklist is tiny (only invalid tokens, not all valid ones) and self-pruning (entries expire with the token)." |
| "Spring Session makes services truly stateless" | "With Spring Session Redis, the service is stateless" | "Spring Session externalises session storage — the session data moves from JVM heap to Redis. The service itself is now 'session-server-stateless' (any server can serve any user), but it's not truly stateless in the architectural sense. The architecture is 'effectively stateless' for scaling purposes but still has mutable per-user state in Redis. True stateless means no per-user state anywhere between requests — which is what JWT achieves for auth. For practical engineering, Spring Session Redis is often the right pragmatic choice." |

---

## 7. Hruday's Real Experience Hook

> "At SAP Labs, when we moved our SAP Fiori-like reporting portal from a monolith to microservices, the session management was the first challenge. The original monolith used `HttpSession` everywhere — storing the selected SAP company code, the user's active filters, the current report view. When we deployed two instances behind a Kubernetes Service (for high availability during deployments), users started randomly losing their filter state because round-robin load balancing sent requests to different pods.
>
> The migration was two steps. First, we added Spring Session Redis — literally two dependencies and one config annotation, no application code changed. This made the HA deployment work correctly within a sprint. Second, over the following two sprints, we migrated authentication state (userId, roles, SAP tenant ID) from session to JWT. This eliminated Redis lookups for every authenticated API call. The result: the service became truly zero-stickiness — any pod could handle any request. HPA now scales smoothly, and rolling deployments with zero sticky session config work perfectly."

---

## 8. Scale Evolution

**1,000 users →** HttpSession is fine. Single server, restart brings everyone back in 2 minutes. No need for Redis complexity.

**100,000 users →** Spring Session Redis immediately (2-dependency swap). Multiple pods behind a Kubernetes Service without sticky sessions. JWT for authentication. Redis for cart/wizard state. Enables HPA and rolling deployments without user disruption.

**10 million users →** Multi-region stateless services. JWT validation: each region has the public key to verify tokens locally (no cross-region lookup). Redis cluster per region for session data. Cache-aside pattern: most requests are cache hits on Redis — DB reads reduced by 90%+. Token refresh handled by a dedicated Auth Service per region. Complete independence between regions for reads.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment APIs are 100% stateless by design. JWT for merchant authentication. Redis for idempotency keys (prevent duplicate payments). No in-process state in payment processing — a retry to a different pod must produce the same result. | "A payment request to Razorpay's API is retried and hits a different pod than the original. How does the system prevent double-charging?" |
| Swiggy / Meesho | Order creation is stateless. Cart persistence in Redis. Session state (auth) in JWT. Delivery tracking uses event-driven updates (Kafka/Redis pub-sub), not session state on a server. | "Swiggy's restaurant-facing app refreshes the order dashboard every 5 seconds. How do they serve this to 50,000 concurrent restaurant partners efficiently?" |
| Adobe / Microsoft | Adobe Creative Cloud API: OAuth2 JWT tokens for asset access (Bearer tokens to CDN, storage services). Microsoft Azure AD: JWT-based OIDC. All stateless — no server remembers individual user sessions across the distributed services. | "An Adobe Creative Cloud API call needs to authenticate with three downstream services (assets, collaboration, export). How does stateless JWT enable this without three separate logins?" |
| SAP Labs (current) | SAP Fiori APIs: stateless with XSUAA JWT tokens (SAP's cloud UAA service issues JWTs). SAP BTP (Business Technology Platform) microservices: Spring Boot with `spring-security-xsuaa` — JWT claims carry SAP tenant, roles, and scopes. Zero server-side session. | "SAP CFIN has 500 concurrent finance managers querying reports during month-end close. How does the reporting microservice handle this at scale without sticky sessions?" |

---

## 10. Related Topics — What to Study Next

- **Topic 145 — Horizontal vs Vertical Scaling** — statelessness is the prerequisite for horizontal scaling; this topic explains what happens after you make the service stateless — how HPA works, why horizontal scaling requires statelessness, and the practical Kubernetes deployment configuration
- **Topic 147 — Load Balancing L4 vs L7** — the load balancing algorithm choice (round-robin vs IP hash for sticky sessions) becomes irrelevant once stateless; this topic explains how L7 load balancers route based on headers and path — and how JWT claims can be used for routing decisions (e.g., route premium users to faster pods)
- **Topic 104 — Redis Distributed Caching** — the "externalise in-process cache" step in the stateless migration; covers cache-aside, write-through, and TTL strategies; Redis as the shared state layer that enables stateless services to still have fast data access without per-request DB hits
- **Topic 93 — JWT Authentication Deep Dive** — the complete implementation of stateless auth with JWT: signature algorithms (RS256 vs HS256), claims design, refresh token rotation, revocation with Redis blocklist, and how Spring Security integrates with JWT automatically via `spring-security-oauth2-resource-server`

---

*Part 8 · Stateless Services — Why They Scale Better · Full Stack Interview Guide · Hruday D · 2026*
