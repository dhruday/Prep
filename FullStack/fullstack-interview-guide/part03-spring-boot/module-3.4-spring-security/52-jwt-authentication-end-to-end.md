# JWT Authentication — End-to-End Implementation
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- JWT (JSON Web Token) = stateless authentication — the token itself contains everything the server needs; no session on the server
- Structure: `base64(header).base64(payload).signature` — the signature is the only part you cannot fake without the secret key
- Flow: Login → server validates credentials → server issues JWT → client sends JWT in `Authorization: Bearer <token>` header on every request
- Server validates JWT on every request: decode → verify signature → check expiry → extract claims → trust the identity
- Key: short-lived access tokens (15 min) + long-lived refresh tokens (7 days) — this limits the damage if an access token is stolen
- Gap to bridge: token revocation before expiry — stateless JWTs cannot be "logged out" without a blocklist (Redis) or very short TTLs

---

## 1. One-Line Definition
JWT is a signed, self-contained token that carries the user's identity and roles as Base64-encoded JSON — the server can verify and trust it without looking up a session in a database.

---

## 2. The Problem It Solves

Traditional session-based authentication stores the user's session in the server's memory (or a database). The session ID is sent to the browser as a cookie. This works fine for a single server. But once you have multiple server instances (horizontal scaling), every request could hit a different server — and the session only exists on one of them.

The naive fix: sticky sessions — route each user's requests to the same server. This breaks load balancing and adds complexity. Another fix: shared session storage (Redis) — but now every request needs to hit Redis, adding latency and a new point of failure.

JWT solves this by moving all state to the client. The token itself contains the user ID and roles. Any server can verify the token's signature and trust the payload — no session lookup, no shared state, no sticky sessions required. Scale to 100 servers: every server can independently validate the same JWT.

The trade-off: you cannot invalidate a JWT before it expires without maintaining a blocklist (which reintroduces state). This is why access tokens should be short-lived.

---

## 3. How It Works Internally

### The Mental Model
Think of a JWT like a digitally signed concert ticket. The ticket has your name, seat number, and event date printed on it. The signature (a hologram, QR code) proves it was issued by the event organiser. At the venue gate, the staff checks the signature (scans the QR code) without calling anyone at head office. If the QR code is valid and the date is today, you are in. The organiser does not maintain a list of "people currently inside" — the valid ticket is enough.

If someone steals your ticket, they can use it. That is why tickets are date/time-scoped. If your access token expires in 15 minutes, a stolen token is only useful for 15 minutes.

### The Mechanism — Step by Step

**JWT Structure:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9    ← Header (base64)
.eyJzdWIiOiJ1c2VyMTIzIiwicm9sZXMiOlsiUk9MRV9VU0VSIl0     ← Payload (base64)
.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c             ← Signature (HMAC-SHA256)

Decoded Header:  {"alg": "HS256", "typ": "JWT"}
Decoded Payload: {"sub": "user123", "roles": ["ROLE_USER"], "iat": 1700000000, "exp": 1700003600}
```

**Login flow:**
1. Client sends `POST /api/auth/login` with credentials
2. Server validates username + password against the database
3. Server creates JWT: `HMAC_SHA256(base64(header) + "." + base64(payload), secretKey)`
4. Server returns both tokens: `{accessToken: "...", refreshToken: "..."}`
5. Client stores tokens (memory for access token, httpOnly cookie for refresh token)

**Request flow (every subsequent API call):**
1. Client sends `GET /api/products` with `Authorization: Bearer <accessToken>`
2. `JwtAuthenticationFilter` reads the header, extracts the token
3. Filter decodes the payload (base64 — no key needed, anyone can read it)
4. Filter re-computes the signature: `HMAC(header + payload, secretKey)`
5. Re-computed signature == token signature? YES → continue. NO → reject (someone tampered)
6. Is `exp` timestamp in the future? YES → continue. NO → reject (expired)
7. Extract `sub` (user ID) from payload → load `UserDetails` from DB or cache
8. Set `Authentication` in `SecurityContextHolder`
9. Request reaches controller — user is authenticated

**Refresh token flow:**
1. Client sends `POST /api/auth/refresh` with the refresh token (from httpOnly cookie)
2. Server validates refresh token (same signature + expiry check)
3. Server looks up the refresh token in the database (refresh tokens ARE tracked — revocable)
4. Issues a new short-lived access token
5. Returns new `{accessToken: "..."}`

### ASCII Diagram

```
CLIENT                              SERVER
  │                                    │
  │   POST /api/auth/login             │
  │   {username, password}    ────────►│
  │                                    │  1. Check credentials in DB
  │                                    │  2. Create JWT:
  │                                    │     header.payload.signature
  │   {accessToken (15min),   ◄────────│  3. Return tokens
  │    refreshToken (7 days)}          │
  │                                    │
  │   GET /api/products                │
  │   Authorization: Bearer <jwt>  ───►│  1. JwtAuthenticationFilter
  │                                    │  2. Decode payload (base64)
  │                                    │  3. Re-compute signature
  │                                    │  4. Compare signatures ✅
  │                                    │  5. Check exp ✅
  │   200 OK {products}       ◄────────│  6. Set SecurityContext → Controller
  │                                    │
  │   GET /api/products (15min later)  │
  │   Authorization: Bearer <jwt>  ───►│  Check exp ❌ EXPIRED
  │   401 Unauthorized        ◄────────│  Token rejected
  │                                    │
  │   POST /api/auth/refresh           │
  │   Cookie: refreshToken=...  ──────►│  1. Validate refresh token
  │                                    │  2. Look up in DB (is it revoked?)
  │   {accessToken (new, 15min)} ◄─────│  3. Issue new access token
  │                                    │
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Using a weak or hardcoded secret, no expiry handling, no refresh tokens
@Service
public class JwtService {

    // DANGER 1: Hardcoded secret in source code
    // Anyone with access to your Git repository can forge tokens
    private static final String SECRET = "mySecret";

    public String generateToken(String username) {
        return Jwts.builder()
            .setSubject(username)
            // DANGER 2: No expiry set — token is valid forever
            // A stolen token grants permanent access — no recovery possible
            .signWith(Keys.hmacShaKeyFor(SECRET.getBytes()))
            .compact();
    }

    public String extractUsername(String token) {
        // DANGER 3: No exception handling for invalid/expired tokens
        // JwtException will propagate as an unhandled 500 Internal Server Error
        return Jwts.parserBuilder()
            .setSigningKey(SECRET.getBytes())
            .build()
            .parseClaimsJws(token)
            .getBody()
            .getSubject();
    }
}
```
> **Why this fails in production:** Hardcoded secrets end up in version control history — permanently compromised even after you change the secret. No token expiry means one stolen token grants access until you rotate the signing key (requiring all users to log in again). Missing exception handling for expired/malformed tokens returns 500 instead of 401 — leaking stack trace information.

### Right Way — Production Quality

**Dependencies (pom.xml):**
```xml
<!-- JJWT — Java JWT library (use 0.12.x for Spring Boot 3 / Java 17+) -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
```

```java
// JwtService — handles all JWT operations
@Service
public class JwtService {

    // Inject from application.properties — set via environment variable in production
    @Value("${app.security.jwt.secret}")
    private String secretKey;

    @Value("${app.security.jwt.expiration}")
    private long accessTokenExpiration; // 15 minutes = 900000 ms

    @Value("${app.security.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration; // 7 days = 604800000 ms

    // Build HMAC key from the secret — minimum 256 bits for HS256
    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(UserDetails userDetails) {
        return generateToken(
            Map.of("roles", userDetails.getAuthorities()
                .stream().map(GrantedAuthority::getAuthority).toList()),
            userDetails,
            accessTokenExpiration
        );
    }

    public String generateRefreshToken(UserDetails userDetails) {
        // Refresh token: minimal claims — just the subject and expiry
        return generateToken(Map.of(), userDetails, refreshTokenExpiration);
    }

    private String generateToken(Map<String, Object> extraClaims,
                                  UserDetails userDetails,
                                  long expiration) {
        Instant now = Instant.now();
        return Jwts.builder()
            .claims(extraClaims)
            .subject(userDetails.getUsername())
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plus(expiration, ChronoUnit.MILLIS)))
            // jti claim: unique ID per token — needed for token revocation
            .id(UUID.randomUUID().toString())
            .signWith(getSigningKey())
            .compact();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
        } catch (JwtException e) {
            // Expired, malformed, or tampered token
            return false;
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    // Generic claim extractor
    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        // parseSignedClaims verifies signature AND identifies structure issues
        // Throws JwtException (parent of ExpiredJwtException, MalformedJwtException, etc.)
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }
}
```

```java
// Authentication Controller — login and refresh endpoints
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    // Constructor injection (preferred over @Autowired)
    public AuthController(AuthenticationManager authenticationManager,
                          UserDetailsService userDetailsService,
                          JwtService jwtService,
                          RefreshTokenService refreshTokenService) {
        this.authenticationManager = authenticationManager;
        this.userDetailsService = userDetailsService;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request,
                                               HttpServletResponse response) {
        // Authenticate credentials — throws AuthenticationException if invalid
        // Spring Security handles BadCredentialsException, AccountLockedException etc.
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.username(), request.password()));

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());

        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshToken = refreshTokenService.createRefreshToken(request.username());

        // Access token: returned in body — client stores in memory (NOT localStorage)
        // Refresh token: httpOnly cookie — NOT accessible to JavaScript (XSS-safe)
        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
            .httpOnly(true)       // JavaScript cannot read this — XSS-safe
            .secure(true)         // HTTPS only
            .path("/api/auth/refresh") // Only sent to the refresh endpoint
            .maxAge(Duration.ofDays(7))
            .sameSite("Strict")   // CSRF protection — not sent on cross-site requests
            .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(new AuthResponse(accessToken));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = "refreshToken") String refreshToken) {
        // RefreshTokenService validates and rotates the refresh token
        String username = refreshTokenService.validateAndRotate(refreshToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        String newAccessToken = jwtService.generateAccessToken(userDetails);
        return ResponseEntity.ok(new AuthResponse(newAccessToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletResponse response) {
        if (refreshToken != null) {
            refreshTokenService.revoke(refreshToken);
        }
        // Clear the cookie
        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
            .httpOnly(true).secure(true).path("/api/auth/refresh").maxAge(0).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        return ResponseEntity.noContent().build();
    }
}

// Simple records for request/response
record LoginRequest(@NotBlank String username, @NotBlank String password) {}
record AuthResponse(String accessToken) {}
```

### Configuration
```yaml
app:
  security:
    jwt:
      # Generate with: openssl rand -base64 64
      # Set via environment variable in production: JWT_SECRET=...
      secret: "${JWT_SECRET}"
      expiration: 900000          # 15 minutes
      refresh-token-expiration: 604800000  # 7 days

spring:
  jpa:
    # For RefreshToken entity
    hibernate:
      ddl-auto: update
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a JWT? How does the server verify it without a database lookup?"

**Hruday's answer:**
> A JWT is a JSON payload — containing user ID, roles, and expiry time — that is Base64-encoded and cryptographically signed by the server using a secret key.
>
> The structure is three Base64-encoded parts joined by dots: header, payload, and signature. The signature is an HMAC — a hash of the header and payload combined with the server's secret key.
>
> Verification works like this: when the server receives a token, it decodes the header and payload — no key needed for decoding. Then it re-computes the signature: `HMAC(header + payload, secretKey)`. If the re-computed signature matches the token's signature, the payload is authentic — nobody could have modified it without the secret key. The server also checks the `exp` claim to ensure the token hasn't expired.
>
> The elegance here is that the payload is NOT encrypted — it is just encoded. Anyone can read it. But nobody can CHANGE it without breaking the signature. The server trusts the payload because it verified the signature, not because it looked the session up in a database.

---

### Q2 — Deep Dive
**Interviewer asks:** "A user logs out. How do you invalidate their JWT before it expires?"

**Hruday's answer:**
> This is the fundamental limitation of stateless JWTs — once issued, a token is valid until it expires. There is no built-in revocation mechanism.
>
> The standard solutions are:
>
> **Short-lived access tokens**: Make access tokens expire in 15 minutes. Even a stolen token only works for 15 minutes. Logout invalidates the refresh token (tracked server-side), preventing the issuance of new access tokens. The stolen access token expires naturally.
>
> **Token blocklist / denylist**: Maintain a Redis set of invalidated `jti` (JWT ID) values. On logout, add the token's jti to Redis with a TTL equal to the remaining token lifetime. On every request, check Redis: if jti is in the blocklist, reject the token. This adds one Redis lookup per request — acceptable latency overhead, but it reintroduces some state.
>
> **Version field in user record**: Store a `tokenVersion` integer in the user table. Embed this in every JWT. On logout, increment `tokenVersion`. On every request, load the user's current version from cache (not DB — Redis) and compare. If the token's version is lower than current, reject it.
>
> At Oracle, we used approach 3 for admin users who needed immediate invalidation. Regular users got approach 1 — 15-minute tokens. The combination covered both cases without making every request hit a blocklist.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "JWT vs session-based authentication — when would you choose sessions?"

**Hruday's answer:**
> JWT wins for stateless microservices, mobile apps, and distributed systems where you need horizontal scaling without shared session storage. One JWT validates on any server without coordination.
>
> Sessions win in three scenarios. First: when you need instant revocation. A compromised account — you need to invalidate access in milliseconds, not wait for token expiry. Delete the session from Redis → immediate logout everywhere. Second: traditional server-side rendering. Spring MVC with Thymeleaf, Rails, Django — these frameworks are built around sessions. JWT is fighting the framework rather than using it. Third: tight compliance requirements. Banking applications in India (as per some RBI guidelines) require server-side session state for audit trails and revocability. Sessions with Redis give you a controllable, auditable authentication state.
>
> The hybrid approach works well: use JWT for stateless API authentication, but store refresh tokens in a database — giving you revocability for the long-lived credential while keeping the short-lived access token stateless.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design the authentication flow for a mobile banking app using JWT. What are the security requirements?"

**Hruday's answer:**
> For mobile banking, the requirements are: no token stored in a non-secure location, immediate revocation on compromise, short-lived access tokens, and device binding.
>
> Flow: Login requires username + password + OTP (second factor). On success, the server issues a 15-minute access token (returned in the response body, stored only in memory / secure storage, never in localStorage) and a 30-day refresh token (stored in device secure storage, NOT a cookie for native apps).
>
> The refresh token is bound to the device: I store the `deviceId` and `deviceFingerprint` as claims in the refresh token. When the client refreshes, the server verifies the device matches. A stolen refresh token used from a different device is rejected.
>
> For high-value operations (transfer > ₹10,000), I require re-authentication — even with a valid JWT, the server checks a `step_up_auth` claim in the token. If absent, return 403 with a specific code that triggers a fresh OTP challenge in the app.
>
> Revocation: every refresh token stored in a `refresh_tokens` DB table with a `revoked_at` timestamp. On logout, on password change, on suspicious activity detection — set `revoked_at`. Refresh endpoint checks this before issuing a new access token.
>
> Access token expiry at 15 minutes means even if intercepted in transit (despite HTTPS), the window is limited.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Store JWT in localStorage" | "It's the standard approach — easy to access from JavaScript" | "localStorage is accessible to any JavaScript on the page — including injected XSS payloads. If your app has a single XSS vulnerability, the attacker reads the token from localStorage and they own the session. Store access tokens in memory (JavaScript variable, not persisted) and refresh tokens in httpOnly cookies, which JavaScript cannot read." |
| "JWT payload is encrypted" | "The user data is safe because it's in the JWT" | "JWT payload is Base64-ENCODED, not encrypted. Anyone can decode it with a single API call or even `atob()` in the browser. Never put sensitive data in a JWT payload — no passwords, no SSNs, no PII. Put only user ID and roles. If you need encrypted payload, use JWE (JSON Web Encryption) — a different specification with explicit encryption." |
| "HS256 is fine for production" | "Built-in, simple, just use the default" | "HS256 uses a single symmetric key — the same key signs AND verifies. If any part of your system that needs to verify tokens is compromised, the attacker has the key to also forge tokens. RS256 (asymmetric): private key signs (only the auth server holds it), public key verifies (can be distributed to all services safely). Prefer RS256 for distributed systems with multiple services verifying tokens." |
| "Long expiry is better UX" | "Set access token to 24 hours so users don't get logged out" | "24-hour access tokens cannot be revoked without a blocklist. One stolen token = 24-hour window of impersonation. 15-minute tokens limit damage. Pair with refresh tokens for seamless UX — the client auto-refreshes silently in the background. The user never sees a re-login prompt unless the refresh token itself expires or is revoked." |

---

## 7. Hruday's Real Experience Hook

> "At Oracle, we built REST APIs consumed by Angular clients. We used session-based auth initially — which worked fine for the monolith. When I moved to SAP and worked on micro-frontend architecture, I saw why JWT matters at scale: each micro-frontend and its corresponding backend service needed to validate the same user identity independently. With JWT, every service can verify the token locally — no central session service needed. I designed the auth module to issue short-lived JWT access tokens and store refresh tokens in httpOnly cookies, which directly eliminated the XSS token-theft risk we had identified in our OWASP review."

---

## 8. Scale Evolution

**1,000 users →** Simple in-memory JWT signing and verification. Any JJWT library call is sub-millisecond. No performance concern. One database table for refresh tokens is sufficient.

**100,000 users →** Token verification is still fast (HMAC is cheap). The bottleneck becomes refresh token lookups — the table grows. Add an index on `token` column and a background job to purge expired tokens. Cache the signing key in memory instead of loading from config on every request (already in memory with `@Value` — just make sure you are not re-parsing it every call).

**10 million users →** Refresh token table has millions of rows. Partition or archive old tokens. Consider Redis for storing active refresh token metadata with TTL — auto-expires, no purge job needed. For microservices: publish the public key via a JWKS (JSON Web Key Set) endpoint (`GET /api/auth/.well-known/jwks.json`). Other services fetch and cache the public key, verifying tokens locally — no auth service call per request.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | OAuth2 + JWT is their API authentication standard. They issue JWTs to partner merchants for API access. Short-lived tokens + refresh rotation is a compliance requirement. | "How would you implement token-based authentication for a payment API used by 10,000 merchant integrations?" |
| Swiggy / Meesho | Mobile-first apps. JWT in secure storage on device, refresh silently. Multiple user types (customer, delivery partner, merchant) — different JWT claims and expiry. | "How do you handle JWT token refresh on mobile apps without interrupting user experience?" |
| Adobe / Microsoft | Enterprise OAuth2 integrations — Adobe Sign, Microsoft 365. JWTs are the backbone of identity federation between services. | "How does JWT fit into an OAuth2 authorization code flow?" |
| Remote / Global roles | JWT + refresh token implementation is a near-universal senior backend interview requirement. Companies expect hands-on implementation knowledge. | "Implement JWT authentication from scratch in Spring Boot." |

---

## 10. Related Topics — What to Study Next

- **Topic 51 — Spring Security Filter Chain** — the `JwtAuthenticationFilter` built here plugs into the filter chain covered in Topic 51 — these two topics form one complete implementation
- **Topic 53 — OAuth 2.0 + OIDC** — OAuth2 uses JWT as the access token format — understanding JWT deeply makes OAuth2 easier to reason about; Spring Security's resource server replaces the manual JWT filter with `JwtDecoder`
- **Topic 10 — Security: OWASP Top 10** — JWT storage (XSS), token hijacking, and insecure direct object reference are all OWASP concerns directly related to JWT implementation
- **Topic 104 — Redis Distributed Lock** — in a token blocklist implementation, Redis stores invalidated JTIs with TTL — Redis knowledge enables proper logout implementation
- **Topic 54 — RBAC in Spring** — JWT claims carry roles (`ROLE_ADMIN`, `ROLE_USER`) that feed directly into Spring Security's role-based access control decisions

---

*Part 3 · JWT Authentication End-to-End · Full Stack Interview Guide · Hruday D · 2026*
