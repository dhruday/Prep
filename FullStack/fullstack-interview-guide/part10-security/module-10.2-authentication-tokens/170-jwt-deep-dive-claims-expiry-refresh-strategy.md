# JWT Deep Dive — Claims, Expiry, Refresh Strategy
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **JWT** (JSON Web Token): a self-contained, signed token that encodes claims (user identity + permissions) — the server issues it at login; the client sends it on every request; the server verifies the signature without a DB lookup
- **Structure**: `Header.Payload.Signature` — Base64url-encoded header (algorithm, type) + Base64url-encoded payload (claims) + cryptographic signature
- **Critical claims**: `sub` (subject/user ID), `iss` (issuer), `exp` (expiry — Unix timestamp), `iat` (issued-at), `jti` (unique ID for this token — required for revocation)
- **HS256 vs RS256**: HS256 uses one shared secret for both signing and verification — any service with the secret can forge tokens; RS256 uses private key to sign + public key to verify — microservices only get the public key, cannot forge tokens; RS256 is correct for multi-service architectures
- **Refresh strategy**: access token = short-lived (15 min); refresh token = long-lived (7–30 days), stored `HttpOnly` cookie; when access token expires, the SPA silently exchanges the refresh token for a new access token; refresh token rotation: each use issues a new refresh token and invalidates the old one
- **Revocation**: JWTs are stateless — by design they cannot be revoked before expiry; to revoke, store `jti` in Redis blocklist and check on each request; or use short expiry + refresh token rotation (compromised token expires in 15 min)
- ✅ At SAP: implemented RS256 JWT + refresh token rotation + Redis `jti` blocklist for our enterprise portal — eliminated session fixation and enabled instant token revocation for security incidents

---

## 1. One-Line Definition
JWT (JSON Web Token) is a compact, cryptographically signed token that encodes user identity and authorisation claims in a self-verifiable format — enabling stateless authentication where any server can validate user identity without contacting an auth server or database.

---

## 2. The Problem It Solves

Traditional session-based auth stores session state server-side. Every request hits the database: "does this session ID exist? What user is it? What are their permissions?" At 10,000 requests/second, that's 10,000 database calls per second just for authentication — before any business logic runs.

Another problem: microservices. Service A receives a user request with a session ID. It calls Service B to get order data. Service B doesn't have the session store — it can't know who the user is. You'd need a shared session store (Redis), adding a dependency and failure point.

JWT solves both: the token carries the user's identity and permissions encoded inside it. Service A extracts the token and passes it to Service B in the `Authorization` header. Service B verifies the signature using the issuer's public key — a computation, no network call, no database. Any service that has the public key can independently verify any JWT.

The trade-off: JWTs cannot be easily revoked before expiry. If a user logs out, their JWT remains valid until `exp`. If a JWT is stolen, it remains valid until expiry. Managing this trade-off is where the depth lies.

---

## 3. How It Works Internally

### The JWT Structure

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9       ← Header (Base64url encoded)
.
eyJzdWIiOiI0MiIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGVzIjpbIlVTRVIiXSwiaXNzIjoiaHR0cHM6Ly9hdXRoLmNvbXBhbnkuY29tIiwiZXhwIjoxNzAwMDAwOTAwLCJpYXQiOjE3MDAwMDAwMDAsImp0aSI6ImFiYzEyMy11dWlkIn0=  ← Payload (Base64url encoded)
.
[signature bytes Base64url encoded]            ← Signature
```

**Decoded Header:**
```json
{
  "alg": "RS256",
  "typ": "JWT"
}
```

**Decoded Payload:**
```json
{
  "sub": "42",                                     // User ID — who this token is about
  "email": "user@example.com",                     // Non-sensitive identity claim
  "roles": ["USER", "PREMIUM"],                    // Authorisation claims
  "iss": "https://auth.company.com",               // Who issued this token — validate this
  "exp": 1700000900,                               // Expiry: Unix timestamp — validate this
  "iat": 1700000000,                               // Issued at — for audit
  "jti": "abc123-uuid"                             // Unique token ID — for revocation blocklist
}
```

**Signature:**
- RS256: `RSA_SHA256(base64url(header) + "." + base64url(payload), privateKey)`
- Verification: any server with the public key can verify without contacting the auth server

### HS256 vs RS256

```
HS256 (HMAC-SHA256):
├── One shared secret ("supersecret")  
├── Used for both signing AND verification
├── Problem: every service that needs to verify tokens must have the secret
├── Any service with the secret can FORGE tokens
├── Single secret, if leaked — all tokens forsakeable
└── Use only: single-service apps, internal tools where all services are equally trusted

RS256 (RSA-SHA256):
├── Private key: held ONLY by the auth server (Spring Authorization Server)
├── Public key: published at /.well-known/jwks.json — any service can download it
├── Signing: auth server uses private key → only auth server can CREATE tokens
├── Verification: any microservice uses public key → any service can VERIFY tokens
├── A compromised microservice cannot forge tokens — it only has the public key
└── Use for: any multi-service architecture, OAuth flows, external JWTs
```

### Access Token + Refresh Token Flow

```
Login flow:
User → POST /auth/login (email, password)
Auth Server validates credentials
     │
     ├─► Issues ACCESS TOKEN (JWT, 15 min expiry, in response body)
     │   [sub, roles, exp=now+15min, jti=uuid1]
     │
     └─► Issues REFRESH TOKEN (opaque string or JWT, 7 days expiry)
         Stored: in DB linked to user + device
         Sent to client: HttpOnly Secure SameSite=Strict cookie

SPA stores:
├── Access token: in memory (React state / Angular service) — NOT localStorage
└── Refresh token: in HttpOnly cookie (browser auto-sends, JS never reads it)

Authenticated request:
SPA → GET /api/orders
      Authorization: Bearer {access_token}

Server validates access token:
1. Decode Base64url header and payload
2. Verify signature with auth server's public key
3. Check exp: token expired? → reject with 401
4. Check jti: token in blocklist? → reject with 401  
5. Check iss: from expected issuer? → reject if not
6. Extract sub and roles → serve request

Access token expires (exp reached, 15 min later):
SPA → POST /auth/refresh
      Cookie: refreshToken=xxxx (browser auto-sends HttpOnly cookie)
      
Auth Server:
1. Find refresh token xxxx in DB
2. Is it valid and not expired?
3. Is it already used? (rotation — if yes, security incident: revoke ALL tokens for this user)
4. Issue new access token (15 min)
5. Issue new refresh token (7 days) — previous one is now invalidated (rotation)
6. Return new access token in response body
7. Set new refresh token in HttpOnly cookie (replaces old one)

Logout:
SPA → POST /auth/logout
      Cookie: refreshToken=xxxx
      
Auth Server:
1. Delete refresh token from DB (server-side invalidation)
2. Add current access token's jti to Redis blocklist with TTL = remaining expiry
3. Clear refresh token cookie (Set-Cookie: refreshToken=; Max-Age=0)
```

### Why JWT + Refresh Token Rotation is the Security Foundation

- **Short access token expiry (15 min)**: limits the window of a stolen access token; attacker can only use it for 15 min max
- **Refresh token rotation**: each refresh issues a new refresh token and invalidates the old one; if an attacker steals a refresh token and uses it, the next legitimate use by the real user will fail (token already used); auth server detects the conflict and revokes ALL tokens for that user — the attack surface window narrows to the time between token theft and first rotation
- **`jti` blocklist**: for immediate revocation needs (admin forces logout, security incident); store `jti` in Redis with TTL equal to token's remaining expiry — the check adds one Redis lookup per request, but with Redis in memory this is sub-millisecond
- **`HttpOnly` cookie for refresh token**: JS cannot read it — XSS cannot steal it; the browser sends it automatically on the `/auth/refresh` endpoint only (SameSite=Strict)

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Wrong: HS256 with a weak hardcoded secret — forgeable if secret is leaked
@Service
public class JwtService {
    
    // WRONG: hardcoded secret, short and guessable, HS256 in multi-service arch
    private static final String SECRET = "secret123";
    
    public String generateToken(User user) {
        return Jwts.builder()
            .setSubject(user.getId().toString())
            .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 24 hours — too long
            // Missing: iss, iat, jti claims
            .signWith(Keys.hmacShaKeyFor(SECRET.getBytes()))  // HS256 — any service can forge
            .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(Keys.hmacShaKeyFor(SECRET.getBytes()))
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (Exception e) {
            return false;
        }
        // Missing: iss validation, exp already checked by jjwt
        // Missing: jti blocklist check
    }
}
```

```typescript
// Wrong: storing JWT in localStorage — readable by any script on the page
// XSS attack can do: localStorage.getItem('token') → steal JWT → impersonate user
function login(email: string, password: string) {
  return api.post('/auth/login', { email, password }).then(response => {
    // WRONG: JWT in localStorage is exposed to XSS
    localStorage.setItem('token', response.data.accessToken);
  });
}

// Wrong: no refresh token strategy — user just gets logged out after 24 hours
// forcing frequent re-login is bad UX; long token expiry is bad security
```

> **Why this fails in production:** HS256 in microservices means every service has the signing secret — a breach of any downstream service means an attacker can forge tokens for any user with any role. A 24-hour expiry means a stolen token is valid all day. No `jti` means you can't revoke a stolen token without taking down auth entirely. No refresh token means users re-login constantly with short tokens, or tokens are dangerously long-lived for good UX.

### Right Way — Production Quality

**Spring Boot — JWT service with RS256:**
```java
@Service
@Slf4j
public class JwtService {

    // Private key: only this auth service has it — loaded from secure key store, not hardcoded
    @Value("${jwt.private-key}")
    private RSAPrivateKey privateKey;

    // Public key: any service can verify — published at /.well-known/jwks.json
    @Value("${jwt.public-key}")
    private RSAPublicKey publicKey;

    @Value("${jwt.issuer}")
    private String issuer;  // e.g. "https://auth.company.com"

    private final RedisTemplate<String, String> redisTemplate;
    
    // Access token: short-lived — limits stolen token window
    private static final Duration ACCESS_TOKEN_EXPIRY = Duration.ofMinutes(15);

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        
        return Jwts.builder()
            .setSubject(user.getId().toString())
            // Non-sensitive claims only — don't put PII in JWT (it's Base64, not encrypted)
            .claim("email", user.getEmail())
            .claim("roles", user.getRoles().stream()
                .map(Role::name)
                .collect(Collectors.toList()))
            .setIssuer(issuer)                                              // iss claim
            .setIssuedAt(Date.from(now))                                    // iat claim
            .setExpiration(Date.from(now.plus(ACCESS_TOKEN_EXPIRY)))        // exp claim
            .setId(UUID.randomUUID().toString())                            // jti claim — for blocklist
            .signWith(privateKey)                                           // RS256, private key only
            .compact();
    }

    public Claims validateAndExtractClaims(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                .setSigningKey(publicKey)        // verify with public key
                .requireIssuer(issuer)           // reject tokens from other issuers
                .build()
                .parseClaimsJws(token)
                .getBody();

            // Check jti blocklist — Redis lookup, sub-millisecond
            String jti = claims.getId();
            if (Boolean.TRUE.equals(redisTemplate.hasKey("jwt:blocklist:" + jti))) {
                throw new JwtException("Token has been revoked");
            }

            return claims;
        } catch (ExpiredJwtException e) {
            throw new JwtException("Token expired", e);
        } catch (InvalidClaimException e) {
            throw new JwtException("Invalid token claims", e);
        }
    }

    // Revoke a specific token — used on logout or security incident
    public void revokeToken(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                .setSigningKey(publicKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
            
            String jti = claims.getId();
            Instant expiry = claims.getExpiration().toInstant();
            Duration ttl = Duration.between(Instant.now(), expiry);
            
            if (!ttl.isNegative()) {
                // Add to blocklist with TTL = remaining token lifetime
                // Redis automatically removes the key after the token would have expired anyway
                redisTemplate.opsForValue().set(
                    "jwt:blocklist:" + jti,
                    "revoked",
                    ttl
                );
            }
        } catch (ExpiredJwtException e) {
            // Already expired — no need to blocklist
        }
    }
}
```

**Spring Security — JWT filter (stateless auth):**
```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7); // Remove "Bearer " prefix
        
        try {
            Claims claims = jwtService.validateAndExtractClaims(token);
            String userId = claims.getSubject();
            
            if (userId != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // Load user from claims directly — no DB call needed
                // All needed data is in the JWT claims
                List<String> roles = claims.get("roles", List.class);
                List<SimpleGrantedAuthority> authorities = roles.stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                    .collect(Collectors.toList());
                
                UsernamePasswordAuthenticationToken authToken =
                    new UsernamePasswordAuthenticationToken(userId, null, authorities);
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        } catch (JwtException e) {
            // Token invalid or revoked — don't set authentication
            // Spring Security will return 401 for protected endpoints
            log.warn("JWT validation failed: {}", e.getMessage());
        }
        
        filterChain.doFilter(request, response);
    }
}

// SecurityConfig — stateless JWT setup
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable()) // JWT via Authorization header, no CSRF needed
        .sessionManagement(session -> session
            .sessionCreationPolicy(SessionCreationPolicy.STATELESS) // No HTTP session
        )
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
        );
    return http.build();
}
```

**Refresh token service with rotation:**
```java
@Service
@Transactional
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;
    private final UserRepository userRepository;

    private static final Duration REFRESH_TOKEN_EXPIRY = Duration.ofDays(7);

    public RefreshToken createRefreshToken(Long userId) {
        RefreshToken token = RefreshToken.builder()
            .userId(userId)
            // Opaque random token — not a JWT; stored in DB for server-side invalidation
            .token(UUID.randomUUID().toString())
            .expiresAt(Instant.now().plus(REFRESH_TOKEN_EXPIRY))
            .used(false)
            .build();
        return refreshTokenRepository.save(token);
    }

    public TokenPair rotate(String refreshTokenValue) {
        RefreshToken refreshToken = refreshTokenRepository
            .findByToken(refreshTokenValue)
            .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token not found"));

        // Refresh token rotation: if already used, security incident!
        // An attacker and the legitimate user both have this token; block both
        if (refreshToken.isUsed()) {
            // Revoke ALL refresh tokens for this user — assume compromise
            refreshTokenRepository.deleteAllByUserId(refreshToken.getUserId());
            throw new RefreshTokenReuseException("Refresh token reuse detected — all sessions revoked");
        }

        if (refreshToken.getExpiresAt().isBefore(Instant.now())) {
            throw new InvalidRefreshTokenException("Refresh token expired");
        }

        // Mark old token as used — cannot be used again
        refreshToken.setUsed(true);
        refreshTokenRepository.save(refreshToken);

        // Issue new access token
        User user = userRepository.findById(refreshToken.getUserId()).orElseThrow();
        String newAccessToken = jwtService.generateAccessToken(user);

        // Issue new refresh token (rotation)
        RefreshToken newRefreshToken = createRefreshToken(user.getId());

        return new TokenPair(newAccessToken, newRefreshToken.getToken());
    }
}
```

**Frontend (React) — access token in memory, refresh in cookie:**
```typescript
// authStore.ts — access token stored in memory only
// Never in localStorage (XSS risk); cookie is HttpOnly for refresh token
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

// Zustand store — in-memory only; React component state persists during session
// On page reload, access token is lost — the SPA calls /auth/refresh to get a new one
// using the HttpOnly refresh token cookie (which survived the reload)
export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
}));
```

```typescript
// tokenRefresh.ts — silent token refresh before expiry
function parseTokenExpiry(token: string): number {
  const payload = JSON.parse(atob(token.split('.')[1]));
  return payload.exp * 1000; // Convert to milliseconds
}

export async function refreshAccessToken(): Promise<string> {
  // POST to refresh endpoint — browser automatically sends HttpOnly refresh token cookie
  // withCredentials: true ensures the cookie is sent cross-origin if needed
  const response = await api.post('/auth/refresh', {}, { withCredentials: true });
  return response.data.accessToken;
}

// Set up proactive refresh 1 minute before expiry
export function scheduleTokenRefresh(accessToken: string) {
  const expiry = parseTokenExpiry(accessToken);
  const refreshAt = expiry - Date.now() - 60_000; // 1 minute before expiry

  if (refreshAt > 0) {
    setTimeout(async () => {
      try {
        const newToken = await refreshAccessToken();
        useAuthStore.getState().setAccessToken(newToken);
        scheduleTokenRefresh(newToken); // Schedule next refresh recursively
      } catch {
        // Refresh token expired or revoked — user must re-login
        useAuthStore.getState().setAccessToken(null);
      }
    }, refreshAt);
  }
}
```

> **Key decisions here:**
> - RS256 for any multi-service architecture — private key never leaves the auth server; downstream services only have the public key and can verify but never forge
> - Access token in React/Angular memory state, never `localStorage` — page reload triggers one silent refresh; this is a minor UX non-issue vs the XSS safety improvement
> - Refresh token in `HttpOnly` cookie — invisible to JavaScript completely; XSS on any page cannot steal the refresh token
> - Refresh token rotation with reuse detection — the most important defence against refresh token theft; reuse = compromise = revoke all sessions for that user
> - `jti` blocklist in Redis for immediate revocation on logout/security incident; TTL = remaining token validity so Redis automatically cleans up

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain the structure of a JWT and what each claim in the payload does."

**Hruday's answer:**
> A JWT has three parts separated by dots: header, payload, and signature. All three are Base64url-encoded — not encrypted, just encoded. Anyone who has the token can decode and read the payload. This is why you should never put sensitive information like passwords or raw credit card numbers in a JWT.
>
> The header specifies the algorithm — typically RS256 in production — and the token type, which is JWT.
>
> The payload contains claims. The standard ones I use: `sub` is the subject, typically the user's ID — who this token is about. `iss` is the issuer, your auth server's URL — you validate this on every request to reject tokens from unexpected sources. `exp` is the expiry timestamp — a Unix epoch second; the library automatically rejects tokens past this time. `iat` is issued-at, useful for audit logs. `jti` is a unique token ID — this is what you store in a Redis blocklist when you need to revoke a specific token before it expires.
>
> You can add custom claims for roles, scopes, or any non-sensitive app-specific data the services need without a DB lookup.
>
> The signature is created by the auth server using its private key over the header and payload. Any service with the corresponding public key can verify the signature — ensuring the token was issued by the expected auth server and that neither the header nor the payload was tampered with.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why is HS256 wrong for microservices and RS256 correct?"

**Hruday's answer:**
> HS256 uses a single symmetric secret for both signing and verification. This means every microservice that needs to verify JWTs must have that secret. If you have 20 services, 20 places store the secret. If any one of those services is compromised, the attacker has the signing secret and can forge JWTs for any user with any role — "give me a token for user ID 1 with ADMIN role." The entire authentication system is broken.
>
> RS256 uses asymmetric cryptography: a private key for signing and a public key for verification. Only the auth server holds the private key — it never leaves that service. All other microservices receive only the public key, which they use to verify signatures. The public key has no signing capability — a compromised microservice has the public key but cannot forge tokens.
>
> In practice, the auth server publishes its public key at `/.well-known/jwks.json` (JSON Web Key Set). Microservices fetch this on startup and cache it. Token verification is a cryptographic operation in memory — no network call, sub-millisecond.
>
> The practical overhead of RS256 is marginal — maybe 0.5ms more than HS256 per verification. The security improvement is categorical: even a full compromise of a downstream service doesn't break authentication.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "JWTs are stateless and can't be revoked. How do you handle logout or account suspension?"

**Hruday's answer:**
> JWTs can be revoked — it just requires a small piece of state. The `jti` claim gives each token a unique ID. On logout, you add the `jti` to a Redis-backed blocklist with a TTL equal to the token's remaining validity. On every request, the JWT filter does a Redis lookup: is this `jti` in the blocklist? If yes, reject. Redis is in-memory — sub-millisecond; it adds almost no latency to each request.
>
> When the token would have naturally expired, Redis automatically removes the blocklist entry (TTL expires). The blocklist only ever contains tokens that were issued but not yet expired, so its size is bounded.
>
> For account suspension, revoke all current tokens by blocklisting their `jti` values and also invalidate all refresh tokens in the database for that user. Future login attempts fail because the account is marked suspended.
>
> The alternative to `jti` blocklist is very short access token expiry — 5 to 15 minutes. This limits the damage window for any stolen token to the expiry period without requiring any revocation infrastructure. The refresh token handles session continuity. For most applications, 15-minute access tokens + refresh token rotation is sufficient and simpler than maintaining a blocklist. Use the blocklist when you need near-instant revocation — security incidents, regulatory requirements.

---

### Q4 — Scenario
**Interviewer asks:** "A user reports their account was accessed without their consent. What do you do, and what does your JWT architecture enable you to do?"

**Hruday's answer:**
> Immediate containment: revoke all active sessions for that user. In our architecture: delete all refresh tokens from the database for that user ID, and add all currently-issued access token `jti` values to the Redis blocklist. This immediately blocks any continued access using stolen credentials.
>
> But wait — finding all currently-issued active JWTs for a user is hard, because JWTs are stateless. We don't store them. This is why short access token expiry matters: at 15-minute expiry, the maximum window of continued access after we delete the refresh tokens is 15 minutes. The attacker's active JWT naturally expires and they can't get a new one because the refresh tokens are gone.
>
> The deeper investigation: check the `iat` (issued-at) claim on the suspicious access — when was the session started? Check the IP in the auth logs. If the `jti` of the suspicious session is logged, I can see exactly which endpoints were hit and when.
>
> For the user: force a password reset, re-enable the account with clean tokens after the reset. If MFA wasn't enabled, recommend enabling it now — this would have blocked the initial compromised-credential scenario.
>
> This incident is logged as an A07 (Authentication Failure) observation — input for improving our auth defences, possibly adding anomalous login detection (new IP + new device in the same session → trigger additional verification).

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "JWT is encrypted" | "JWT is safe to put sensitive data in" | JWT is Base64url-encoded, NOT encrypted — anyone who intercepts the token can read the payload; never put passwords, card numbers, or sensitive PII in JWT claims |
| "HS256 is fine" | "HS256 is simpler, good enough" | HS256 in multi-service arch means every service can forge tokens; RS256 limits signing to the auth server; simple is not the same as correct |
| "JWTs can't be revoked" | "You just have to wait for expiry" | `jti` blocklist in Redis enables instant revocation; short expiry (15 min) limits damage without blocklist |
| Store JWT in localStorage | "localStorage is convenient for persistence across page reload" | localStorage is readable by any script — XSS attack = instantly stolen JWT; store access token in memory; use HttpOnly cookie for refresh token |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I implemented the JWT architecture for our enterprise portal from scratch. I chose RS256 because we had 4 separate microservices all needing to verify tokens — HS256 would have required distributing the secret to all four services. With RS256, only the auth service holds the private key; the other services fetch the public key from our JWKS endpoint on startup. I set access token expiry to 15 minutes and implemented refresh token rotation with reuse detection: the first time a refresh token is used twice (indicating theft), all sessions for that user are revoked automatically. I added the `jti` Redis blocklist for immediate revocation on logout — each logout adds the `jti` to Redis with a 15-minute TTL. The end result was zero session continuation after logout and a 15-minute bounded window for any stolen access token."

---

## 8. Scale Evolution

**1,000 users/day →** In-memory JWT parsing with RS256 is effectively free at this scale. `jti` Redis blocklist is appropriate from day one. Short expiry (15 min) + refresh token rotation covers all security requirements.

**100,000 users/day →** JWKS (public key) caching in each microservice with periodic refresh (every 12 hours) — this eliminates any per-request network calls for key fetching. Monitor Redis blocklist size — should be small (only active non-expired revoked tokens). Log all token validation failures (expired, revoked, invalid signature) → anomaly detection.

**10 million users/day →** JWT verification is CPU-bound cryptography — at extreme scale, consider RSA key rotation (new signing key quarterly; services accept both old and new for the duration of the old tokens' max lifespan). Dedicated auth cluster with Redis Cluster for blocklist distribution across regions. Access token expiry tuning: shorter = more refresh calls to auth server; longer = larger blocklist and longer stolen token windows. 15 minutes is a well-established industry standard balancing these concerns.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Every payment API call requires valid authentication; JWT expiry + refresh token rotation is the foundation of session security; RS256 for merchant APIs | Know RS256 vs HS256 distinction; explain why short expiry + rotation is better than long expiry for payment APIs |
| Swiggy / Meesho | Mobile app sessions need long-lived refresh tokens + short access tokens; users expect to stay logged in for weeks on mobile | Explain the access token in memory + refresh token in HttpOnly cookie pattern for SPAs; know how mobile apps handle this differently |
| Adobe / Microsoft | Enterprise SSO with SAML/OIDC → JWT exchange; multi-service architectures where RS256 is architecturally necessary | Know JWKS endpoint, key rotation, and the trust model behind RS256 |
| SAP Labs | Enterprise portal with Angular frontend + Spring Boot backend + multiple microservices — exactly the RS256 multi-service scenario | Know the full Spring Security JWT filter setup, STATELESS session policy, jti blocklist in Redis |

---

## 10. Related Topics — What to Study Next

- **Topic 171 — OAuth 2.0 flows** — OAuth issues JWTs as access tokens; understanding JWT structure is a prerequisite to understanding OAuth token handling
- **Topic 172 — OIDC** — OIDC's ID token is a JWT; the `sub`, `email`, `iss` claims come directly from OIDC specs; JWT claims and OIDC claims align exactly
- **Topic 173 — Silent refresh pattern** — the frontend implementation of access token refresh before expiry; directly builds on the refresh token strategy described here
- **Topic 165 — XSS** — the reason JWT cannot be stored in localStorage; understanding XSS makes the "in memory only" access token storage decision clear
- **Topic 169 — OWASP Top 10** — JWT misconfiguration (no expiry, weak secret, algorithm confusion) maps to OWASP A07: Authentication Failures

---

*Part 10 · JWT Deep Dive — Claims, Expiry, Refresh Strategy · Full Stack Interview Guide · Hruday D · 2026*
