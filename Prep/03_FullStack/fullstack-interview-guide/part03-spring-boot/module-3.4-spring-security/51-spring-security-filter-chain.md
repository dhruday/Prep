# Spring Security Filter Chain
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- Spring Security is a chain of Servlet Filters — each request passes through all of them before reaching your controller
- The chain sits BEFORE DispatcherServlet — unauthenticated requests never reach Spring MVC at all
- Every filter in the chain either: continues to the next filter, OR stops the chain and writes a response directly (e.g., 401 Unauthorized)
- `UsernamePasswordAuthenticationFilter` handles form login; `BearerTokenAuthenticationFilter` handles JWT; you can add your own custom filter anywhere in the chain
- Default filter chain has 15+ filters — understanding which ones matter (and in what order) separates senior from junior
- Hruday strength: OWASP/XSS/CSP security at SAP makes this deeper than it looks — applied security experience is a natural anchor

---

## 1. One-Line Definition
Spring Security's filter chain is an ordered list of Servlet filters that intercepts every HTTP request, authenticates the caller, checks authorization, and either passes the request to the application or rejects it before it reaches your code.

---

## 2. The Problem It Solves

Without a security filter chain, every controller endpoint is publicly accessible. Anyone can call `POST /api/admin/delete-user` without proving who they are. You would need to add authentication checks manually to every controller method. One developer forgets to add the check — that endpoint is exposed. Inconsistency is inevitable.

The filter chain solves two problems. First, it intercepts ALL requests at the Servlet container level, before any framework code runs. No way to accidentally bypass it. Second, it separates the security concern entirely from your business logic. Your controller does not know how authentication works — it only sees the result (an authenticated `SecurityContext`).

Real failure without this: at an older project at Oracle, authentication was implemented as a custom interceptor applied via annotations on controllers. A new developer created a batch endpoint and forgot the annotation. The endpoint accepted unauthenticated requests in production for two weeks before anyone noticed. A proper security filter chain would have blocked the request by default — you explicitly opt individual paths OUT rather than opting in.

---

## 3. How It Works Internally

### The Mental Model
Think of the Spring Security filter chain as a hotel checkpoint system. Before any guest can enter the hotel floor, they must pass through the front desk (authentication — who are you?), then the key card scanner (authorization — are you allowed on this floor?). If either check fails, they cannot proceed. The hotel rooms (your controllers) never deal with security — the checkpoints handle everything before the guest gets close to a room.

The chain is ordered. Specific filters run before others. If any filter decides to reject the request, it writes a response (401 or 403) and stops — later filters and controllers never run.

### The Mechanism — Step by Step

1. **HTTP request arrives** at the Servlet container (Tomcat embedded in Spring Boot)
2. Spring Security registers a `DelegatingFilterProxy` in Tomcat's filter chain — this is the bridge into Spring's filter beans
3. `DelegatingFilterProxy` delegates to `FilterChainProxy` — Spring Security's internal manager
4. `FilterChainProxy` picks the right `SecurityFilterChain` based on the request path (you can have multiple chains — e.g., one for `/api/**` and one for `/admin/**`)
5. The request enters the matched `SecurityFilterChain` — a list of security filters executed in exact order
6. Each filter in the chain calls `chain.doFilter()` to pass the request to the next filter, or writes a response directly and returns (stopping the chain)
7. If all filters pass, the request reaches `DispatcherServlet` and your controller
8. After your controller responds, the request travels back through the filters in reverse order (for tasks like `SecurityContextPersistenceFilter` saving the updated `SecurityContext`)

### Key Filters in the Default Chain (in order)

| Order | Filter | What it does |
|-------|--------|--------------|
| 1 | `DisableEncodeUrlFilter` | Disables session ID in URL (security hardening) |
| 2 | `SecurityContextHolderFilter` | Loads/saves `SecurityContext` for this request |
| 3 | `UsernamePasswordAuthenticationFilter` | Processes POST /login form submissions |
| 4 | `BasicAuthenticationFilter` | Processes HTTP Basic auth headers |
| 5 | `BearerTokenAuthenticationFilter` | Processes JWT Bearer tokens (if OAuth2 resource server configured) |
| 6 | `ExceptionTranslationFilter` | Catches auth/access exceptions → maps to 401/403 responses |
| 7 | `AuthorizationFilter` | Checks if the authenticated user can access this specific URL |

### ASCII Diagram

```
HTTP Request
     │
     ▼
Tomcat Servlet Container
     │
     ▼
DelegatingFilterProxy  ──────── (Spring Security bridge into Spring context)
     │
     ▼
FilterChainProxy
     │  (matches request URL to the right SecurityFilterChain)
     ▼
SecurityFilterChain [/api/**]
     │
     ├─ Filter 1: SecurityContextHolderFilter
     │       Loads SecurityContext from store (session / request scope)
     │
     ├─ Filter 2: UsernamePasswordAuthenticationFilter
     │       Is this POST /login? → authenticate → populate SecurityContext
     │       For API JWT setups: this filter is usually DISABLED or REPLACED
     │
     ├─ Filter 3: [Your Custom JWT Filter]  ←── You insert here
     │       Reads Authorization: Bearer <token>
     │       Validates JWT → creates Authentication → sets in SecurityContext
     │
     ├─ Filter 4: ExceptionTranslationFilter
     │       Wraps remaining chain in try/catch
     │       AuthenticationException → 401 Unauthorized
     │       AccessDeniedException → 403 Forbidden
     │
     └─ Filter 5: AuthorizationFilter
             Is the authenticated user allowed for this URL+method?
             YES → continue to DispatcherServlet
             NO  → throw AccessDeniedException → ExceptionTranslationFilter → 403
     │
     ▼
DispatcherServlet → Your Controller
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Extending WebSecurityConfigurerAdapter — deprecated since Spring Security 5.7
// This pattern turns up in every old tutorial and blog post
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter { // ← DEPRECATED

    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            .authorizeRequests() // ← old API, replaced by authorizeHttpRequests()
                .antMatchers("/admin/**").hasRole("ADMIN") // ← antMatchers deprecated
                .anyRequest().authenticated()
                .and()
            .formLogin(); // ← adds form login filter whether you want it or not
    }
}
```
> **Why this fails in production:** `WebSecurityConfigurerAdapter` is removed in Spring Boot 3.x / Spring Security 6.x. Projects migrated to Spring Boot 3 will not compile with this pattern. Also: the old `authorizeRequests()` API has subtle differences from the new `authorizeHttpRequests()` — particularly around how `RequestMatcher` evaluates paths. The new API is more explicit and predictable.

### Right Way — Production Quality (Spring Security 6 / Spring Boot 3)
```java
@Configuration
@EnableWebSecurity
// Do NOT extend WebSecurityConfigurerAdapter — it is removed in Spring Security 6
public class SecurityConfig {

    // Register a SecurityFilterChain bean — the modern approach
    // Spring Boot auto-detects this bean and uses it
    @Bean
    public SecurityFilterChain apiSecurityFilterChain(
            HttpSecurity http,
            JwtAuthenticationFilter jwtAuthFilter) throws Exception {

        http
            // Disable CSRF for stateless REST APIs
            // CSRF protection is for browser sessions — JWT APIs are stateless
            .csrf(csrf -> csrf.disable())

            // Disable session creation — every request brings its own JWT
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // Authorization rules — order matters! More specific rules first
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()         // login, register — no token needed
                .requestMatchers("/api/admin/**").hasRole("ADMIN")   // admin endpoints
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll() // public reads
                .anyRequest().authenticated()                         // everything else: must be logged in
            )

            // Add your JWT filter BEFORE the default UsernamePasswordAuthenticationFilter
            // This ensures JWT is validated before Spring Security tries to authenticate
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // Password encoder — BCrypt is the standard
    // NEVER store plain text passwords
    @Bean
    public PasswordEncoder passwordEncoder() {
        // strength=12: ~250ms to hash (strong enough, not too slow for login endpoints)
        return new BCryptPasswordEncoder(12);
    }

    // Expose AuthenticationManager as a bean — needed for your login service
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
```

```java
// Custom JWT filter — inserts just before UsernamePasswordAuthenticationFilter
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    // OncePerRequestFilter guarantees this runs exactly once per request
    // even in nested dispatch scenarios (forward, include)

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        // Extract the Authorization header
        final String authHeader = request.getHeader("Authorization");

        // No token present → skip this filter, let the chain continue
        // ExceptionTranslationFilter + AuthorizationFilter will handle unauthenticated access
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // Extract JWT from "Bearer <token>"
        final String jwt = authHeader.substring(7);

        try {
            final String username = jwtService.extractUsername(jwt);

            // Only proceed if: username extracted AND SecurityContext not yet populated
            // (avoid re-authenticating on an already-authenticated request)
            if (username != null &&
                    SecurityContextHolder.getContext().getAuthentication() == null) {

                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // Validate token: signature + expiry + username match
                if (jwtService.isTokenValid(jwt, userDetails)) {

                    // Create an authenticated token with the user's roles
                    UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,                      // credentials: null after authentication
                            userDetails.getAuthorities()
                        );

                    // Attach request details (IP, session ID) to the authentication
                    authToken.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request));

                    // Set authentication in the SecurityContext
                    // From this point, the request is authenticated
                    // AuthorizationFilter can now check roles/permissions
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException e) {
            // Invalid token: expired, bad signature, malformed
            // Do NOT throw here — let ExceptionTranslationFilter handle it
            // Just clear the context and continue the chain
            SecurityContextHolder.clearContext();
        }

        // Always continue the chain — AuthorizationFilter will handle rejection for protected URLs
        filterChain.doFilter(request, response);
    }
}
```

### Configuration
```yaml
spring:
  security:
    # For Spring Security debug logging — see every filter decision
    # ONLY in development; never in production (exposes security decisions in logs)
    debug: false  # set to true only locally

# Custom JWT config
app:
  security:
    jwt:
      secret: "${JWT_SECRET}"         # inject from environment variable — NEVER hardcode
      expiration: 86400000            # 24 hours in milliseconds
      refresh-token-expiration: 604800000  # 7 days
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "How does Spring Security filter chain work? What happens when a request comes in?"

**Hruday's answer:**
> Spring Security filter chain is a list of Servlet filters that sit between the HTTP request and your controller. Every request, regardless of URL, goes through these filters before reaching Spring MVC.
>
> When a request comes in, Tomcat receives it first. Spring Security has registered a `DelegatingFilterProxy` in Tomcat's filter chain — this bridges into Spring's bean world. That proxy delegates to `FilterChainProxy`, which picks the right `SecurityFilterChain` based on the request path. The request then flows through each filter in order.
>
> Key filters: `SecurityContextHolderFilter` loads any existing auth context. A JWT or username-password filter validates credentials and sets an `Authentication` object in `SecurityContextHolder`. `ExceptionTranslationFilter` catches any auth failures and converts them to 401 or 403 responses. Finally, `AuthorizationFilter` checks if the authenticated user is allowed to access this specific URL.
>
> If all filters pass, the request reaches `DispatcherServlet` and your controller. The whole thing is transparent to your business logic — controllers just see an authenticated request.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the difference between authentication and authorization in Spring Security? Which happens first and why?"

**Hruday's answer:**
> Authentication answers: "Who are you?" — it establishes identity by validating credentials (password, JWT, OAuth token) and creating an `Authentication` object in `SecurityContextHolder`. Authorization answers: "Are you allowed to do this?" — it checks the authenticated identity against permission rules for a specific resource.
>
> Authentication always happens first — you cannot check permissions for an unknown identity.
>
> In the filter chain, authentication filters (JWT filter, Basic auth filter) run earlier in the chain. `AuthorizationFilter` runs last — it reads the `Authentication` already set in `SecurityContextHolder` and checks the URL against your `authorizeHttpRequests` rules.
>
> Important: if no authentication filter matches (the request has no token), `SecurityContextHolder` holds an `AnonymousAuthenticationToken`. The `AuthorizationFilter` still runs — it just sees an anonymous user. If the URL requires authentication, the filter throws `AuthenticationException`, which `ExceptionTranslationFilter` converts to a 401.
>
> This separation matters in production. If you mix auth logic into your authorization checks, you get 403 when you should get 401 — that confuses API clients and breaks OAuth redirect flows.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you configure multiple security filter chains? Walk me through a real scenario."

**Hruday's answer:**
> Multiple filter chains are useful when different parts of your application need different security policies. The classic case is a single Spring Boot app that serves both a REST API and a management/admin interface.
>
> For example: `/api/**` needs stateless JWT authentication — no sessions, CSRF disabled, Bearer token required. But `/admin/**` might use form login with sessions and CSRF enabled because it is a traditional web UI used by internal staff.
>
> You define two `SecurityFilterChain` beans and use `@Order` to set their priority. The chain with lower order number matches first. Each chain has its own `securityMatcher` — a pattern that tells Spring Security which URLs this chain applies to.
>
> ```java
> @Bean
> @Order(1)
> public SecurityFilterChain apiChain(HttpSecurity http) throws Exception {
>     http.securityMatcher("/api/**")
>         .csrf(csrf -> csrf.disable())
>         .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
>         // ... JWT setup
> }
>
> @Bean
> @Order(2)
> public SecurityFilterChain adminChain(HttpSecurity http) throws Exception {
>     http.securityMatcher("/admin/**")
>         // ... form login, CSRF, sessions
> }
> ```
>
> A request to `/api/users` matches chain 1 and never reaches chain 2. A request to `/admin/dashboard` skips chain 1 and matches chain 2. This is cleaner than trying to configure both policies in a single chain with complex conditionals.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Your application is receiving requests with forged JWTs. Someone is crafting tokens with valid-looking payloads. How does your security filter chain protect against this?"

**Hruday's answer:**
> The core protection is JWT signature verification. Every JWT has three parts: header, payload, and signature. The signature is the HMAC of `base64(header) + "." + base64(payload)` using your secret key (or the private key for RSA).
>
> An attacker can easily decode the header and payload — they are just base64. But they cannot generate a valid signature without the secret key. When our `JwtAuthenticationFilter` validates the token, it re-computes the signature from the received header and payload using our secret, then compares it against the token's signature. If the attacker modified any byte in the payload (changing userId, roles, expiry), the computed signature will not match the token's signature. The token is rejected — the filter does not set an `Authentication` in `SecurityContextHolder`.
>
> The `AuthorizationFilter` then sees an anonymous user trying to access a protected resource and returns 401.
>
> Hardening I would add in production: use RS256 (RSA) instead of HS256 (HMAC). With RS256, you sign with a private key (kept secret on the server) and verify with a public key. Even if someone reads your JWT verification code, they only see the public key — useless for forging. Keep token expiry short (15 minutes) and use refresh tokens. For the most security-critical endpoints, add the JWT `jti` (JWT ID) claim and check it against a Redis set of invalidated tokens — this enables real-time token revocation.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Order of filters doesn't matter" | "Spring Security just handles it" | "Order is critical. If your JWT filter runs AFTER `AuthorizationFilter`, the request is rejected as anonymous before your token is ever read. Use `addFilterBefore()` with the correct reference filter. Use `http.addFilterAt()` only when you fully replace a filter." |
| "Disable CSRF for all APIs" | "Just `.csrf(c -> c.disable())`" | "Disable CSRF only for stateless APIs (JWT Bearer token). For session-based login flows (form login, cookies), CSRF must stay enabled. Disabling CSRF on a stateful session endpoint opens your app to CSRF attacks where a malicious site can trigger authenticated actions on your behalf." |
| "SecurityContextHolder is global" | "It stores the current user" | "`SecurityContextHolder` uses a `ThreadLocal` by default — scoped to the current thread, not the JVM. This works for traditional blocking Servlet threads. It BREAKS with reactive/async programming (`WebFlux`, `CompletableFuture`) because those run on different threads. Use `SecurityContextHolder.setStrategyName(MODE_INHERITABLETHREADLOCAL)` for async, or use the reactive `ReactiveSecurityContextHolder` in WebFlux apps." |
| "403 vs 401 is just HTTP status" | "Not important, both mean 'no access'" | "401 = not authenticated (you need to provide credentials). 403 = authenticated but not authorized (I know who you are, but you don't have permission). Getting this wrong confuses OAuth clients — a 401 triggers re-authentication (token refresh), a 403 signals a permission problem. Spring Security maps `AuthenticationException` → 401 and `AccessDeniedException` → 403 — learn this mapping." |

---

## 7. Hruday's Real Experience Hook

> "At SAP, I led the OWASP security hardening work — we reduced vulnerabilities by 80% by implementing proper CSP headers, XSS protection, and securing all API endpoints. The filter chain thinking maps directly: every HTTP response goes through a security post-processing step that adds security headers, just as every request goes through a pre-processing step for authentication. That mental model of 'chain of concerns, ordered, applied to everything' is exactly how Spring Security's filter chain works."

---

## 8. Scale Evolution

**1,000 users →** Default Spring Security filter chain works out of the box. JWT stateless auth scales horizontally with no shared session state — add more servers, no sticky sessions needed.

**100,000 users →** Filter chain performance becomes measurable. Each filter adds a small overhead — multiplied by 100K requests/second. Profile which filters are actually needed and disable unused ones (e.g., `httpBasic` if you only use JWT). Add response caching headers in a security filter to reduce authenticated repeated requests. Consider Redis-backed token invalidation for logout functionality.

**10 million users →** At this scale, the JWT signature verification step (crypto operation) can be a bottleneck under extreme load. Preload and cache the verification key. For very high-frequency non-critical reads (public product listings), consider bypassing the security filter chain entirely for those specific paths via `web.ignoring().requestMatchers("/api/public/**")` — removes filter overhead completely, not just `permitAll()` (which still runs all filters).

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment APIs must be secured end-to-end. Filter chain controls which endpoints require what authentication. One misconfigured permitAll() exposes a payment endpoint. | "How do you prevent unauthenticated access to payment APIs?" |
| Swiggy / Meesho | High-volume APIs with multiple client types (mobile app, web, delivery partner app) — each may use different auth mechanisms. Multiple security chains for different path patterns. | "Your app serves both a mobile API and a delivery partner API. How do you configure different security policies for each?" |
| Adobe / SAP | Enterprise security compliance — OWASP, role-based access, audit logging. Security filters are the enforcement point for enterprise access policies. | "How does Spring Security implement defence-in-depth?" |
| Remote / Global roles | Spring Security is a universal backend interview requirement. Understanding filter chain internals is the dividing line between junior and senior candidates. | "Walk me through what happens in Spring Security when a JWT request comes in." |

---

## 10. Related Topics — What to Study Next

- **Topic 52 — JWT Authentication End-to-End** — the JWT filter shown here is incomplete without the full JWT generation, parsing, and validation implementation that sits alongside it
- **Topic 53 — OAuth 2.0 + OIDC with Spring Security** — OAuth2 replaces the manual JWT filter with Spring Security's built-in `BearerTokenAuthenticationFilter` and `JwtDecoder` — same filter chain concept, different filter
- **Topic 54 — RBAC in Spring** — role-based access rules plug directly into the `authorizeHttpRequests()` configuration shown in the filter chain setup
- **Topic 55 — Method-Level Security** — `@PreAuthorize` adds a second authorization check inside your service layer, working alongside the URL-level rules in the filter chain
- **Topic 43 — Filters vs Interceptors vs AOP** — understand where in the request lifecycle Spring Security filters sit vs Spring MVC interceptors — they are at different layers

---

*Part 3 · Spring Security Filter Chain · Full Stack Interview Guide · Hruday D · 2026*
