# OAuth 2.0 + OIDC with Spring Security
> Part 3 — Spring Boot Deep Dive
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **OAuth 2.0** = authorization framework — it lets one app access another app's resources on behalf of a user, without the user sharing their password
- **OIDC (OpenID Connect)** = identity layer on top of OAuth 2.0 — adds a standardised way to get the user's identity (who are you?) not just access (what can you do?)
- OAuth 2.0 issues an **access token** (what you can access); OIDC adds an **ID token** (who you are)
- Most common flow: Authorization Code with PKCE — user logs in at the identity provider (Google, Okta, Keycloak), gets redirected back with a code, your server exchanges the code for tokens
- Spring Security handles this entirely with: `spring-boot-starter-oauth2-client` or `spring-boot-starter-oauth2-resource-server` — almost no manual code needed
- Gap to bridge: knowing WHEN to be a client (your app delegates login to Google) vs WHEN to be a resource server (your API validates tokens issued by an external auth server like Okta/Keycloak)

---

## 1. One-Line Definition
OAuth 2.0 is a protocol that lets users grant applications limited access to their resources at another service without sharing passwords — and OIDC adds standardized identity information (who the user is) on top of that access delegation.

---

## 2. The Problem It Solves

You are building a feature: users can import their Google Contacts into your app. The bad way: ask users to give you their Google password, then use it to call the Google Contacts API yourself. You now store Google passwords — a massive security liability and a violation of Google's ToS.

OAuth 2.0 solves this: your app redirects the user to Google. Google asks the user: "App X wants to read your contacts. Allow?" The user clicks Allow. Google gives your app a specific, limited token — it can only read contacts (not email, not Drive), and it expires. Your app never sees the password.

The second problem OAuth solves is single sign-on (SSO). Users want to sign in to your app using "Login with Google" — without creating another username/password. But OAuth 2.0 alone only says "you can access this resource" — it does not say who the user is. OIDC adds: here is a standardised ID token with the user's email, name, and profile picture. Your app reads the ID token, gets the user's identity, and either creates an account or signs them in.

Real scenario: Enterprise SaaS products where companies want employees to log in using their corporate Okta/Azure AD — no separate password needed, automatic deprovisioning on employee exit.

---

## 3. How It Works Internally

### The Mental Model
OAuth 2.0 is like a hotel key card system. The hotel (resource server — Google, GitHub) issues a limited key card. The card only opens certain doors (scopes) and expires. The card was issued because you proved to the front desk (authorization server) that you are the room guest. The key card is not a password — losing it does not compromise your permanent identity.

OIDC adds a visitor badge. The badge has your photo and name on it (ID token with user claims). When you enter a room (your app), the room attendant reads both your key card (access) and your badge (identity) and knows both what you can do and who you are.

### OAuth 2.0 Roles
- **Resource Owner**: the user (owns their Google Contacts)
- **Client**: your application (wants to read contacts)
- **Authorization Server**: Google's auth server — the one that authenticates the user and issues tokens
- **Resource Server**: Google Contacts API — validates tokens and serves data

### The Authorization Code + PKCE Flow (the modern standard)

```
1. User clicks "Login with Google" on your app
2. Your app redirects to: https://accounts.google.com/o/oauth2/auth?
      response_type=code
      &client_id=YOUR_CLIENT_ID
      &redirect_uri=https://yourapp.com/callback
      &scope=openid email profile contacts.readonly
      &state=RANDOM_CSRF_TOKEN
      &code_challenge=BASE64(SHA256(code_verifier))   ← PKCE
      &code_challenge_method=S256

3. Google shows login screen + consent screen
4. User approves → Google redirects to your callback URL:
      https://yourapp.com/callback?code=AUTH_CODE&state=RANDOM_CSRF_TOKEN

5. Your server (backend) exchanges the code:
      POST https://oauth2.googleapis.com/token
      {
        grant_type: authorization_code,
        code: AUTH_CODE,
        redirect_uri: https://yourapp.com/callback,
        client_id: ...,
        client_secret: ...,
        code_verifier: ORIGINAL_RANDOM_STRING   ← PKCE verification
      }

6. Google responds with:
      {
        access_token: "ya29...",      ← for calling Google APIs
        id_token: "eyJ...",           ← OIDC: who the user is (JWT)
        expires_in: 3600,
        refresh_token: "1//..."
      }

7. Your app decodes the id_token (JWT):
      {sub: "1234567890", email: "user@gmail.com", name: "John Doe", picture: "..."}
      → Create or find user in your DB by "sub" (unique Google user ID)
      → Issue your OWN session or JWT for your app
```

**PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception attacks. Your app generates a random `code_verifier`, sends its hash (`code_challenge`) with the auth request. When exchanging the code, you send the original `code_verifier`. Google verifies it matches the hash. An attacker who intercepts the code cannot use it — they don't have the `code_verifier`.

### Spring Security Roles

**OAuth2 Client** (your app uses Google/GitHub for user login):
- Dependency: `spring-boot-starter-oauth2-client`
- Spring handles the entire redirect, code exchange, and token storage automatically
- You configure provider details in `application.yml`

**OAuth2 Resource Server** (your API accepts tokens issued by Keycloak/Okta):
- Dependency: `spring-boot-starter-oauth2-resource-server`
- Spring validates incoming Bearer tokens against the issuer's JWKS endpoint
- Your API does NOT handle login — it only validates tokens

### ASCII Diagram

```
OAUTH2 CLIENT FLOW (your app delegates login to Google):
────────────────────────────────────────────────────────────
  User → Your App    →  Redirect to Google (with scope, code_challenge)
  User → Google Auth →  Login + Consent
  Google            →  Redirect back to /callback?code=...
  Your App          →  Exchange code → id_token + access_token
  Your App          →  Decode id_token → user identity
  Your App          →  Issue your own session/JWT → User is logged in

OAUTH2 RESOURCE SERVER FLOW (your API validates tokens from Keycloak):
────────────────────────────────────────────────────────────
  Client App        →  Login at Keycloak → gets access_token (JWT)
  Client App        →  GET /api/orders Authorization: Bearer <token>
  Your Spring API   →  Validate token:
                        1. Fetch Keycloak public keys from JWKS endpoint
                        2. Verify token signature
                        3. Check issuer, audience, expiry
                        4. Extract roles/claims → set SecurityContext
  Your Spring API   →  Serve the request (or 401/403 if invalid)
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Manually implementing OAuth2 token exchange in a controller
@RestController
public class AuthController {

    @GetMapping("/callback")
    public String handleCallback(@RequestParam String code) {
        // DANGER 1: Manual HTTP call to token endpoint — no signature validation
        // DANGER 2: No state parameter check → CSRF vulnerability open
        // DANGER 3: Storing full access_token in DB without expiry tracking
        RestTemplate restTemplate = new RestTemplate();
        // This is prone to configuration errors and misses all the security hooks
        Map<String, Object> tokens = restTemplate.getForObject(
            "https://provider.com/token?code=" + code, Map.class);
        
        String accessToken = (String) tokens.get("access_token");
        // ... manual user creation logic
        return "logged in";
    }
}
```
> **Why this fails in production:** Spring Security's OAuth2 client handles state parameter validation (CSRF protection), PKCE, secure token storage, automatic token refresh, and error handling. Manual implementation almost always misses the state validation check — leaving you open to CSRF attacks. Also, injecting the `code` directly into a URL creates a log injection risk (authorization codes appear in server logs).

### Right Way — OAuth2 Client (Login with Google/GitHub)
```yaml
# application.yml — configure OAuth2 providers
spring:
  security:
    oauth2:
      client:
        registration:
          google:
            client-id: "${GOOGLE_CLIENT_ID}"           # set via environment variable
            client-secret: "${GOOGLE_CLIENT_SECRET}"
            scope: openid, email, profile              # openid required for OIDC
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"

          github:
            client-id: "${GITHUB_CLIENT_ID}"
            client-secret: "${GITHUB_CLIENT_SECRET}"
            scope: read:user, user:email

        provider:
          # Google provider details are auto-configured — no need to specify
          # GitHub provider details are auto-configured
          # For custom providers (Keycloak), specify manually:
          keycloak:
            issuer-uri: "http://localhost:8080/realms/my-realm"
            # Spring fetches OIDC discovery document from {issuer-uri}/.well-known/openid-configuration
            # This auto-configures all endpoints (auth, token, userinfo, JWKS)
```

```java
// Security config — enable OAuth2 login
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login", "/error").permitAll()
                .anyRequest().authenticated()
            )
            // Enable OAuth2 login — Spring handles the entire flow
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")              // Custom login page showing all providers
                .defaultSuccessUrl("/dashboard")  // Where to go after successful login
                .failureUrl("/login?error=true")
                // Optional: custom success handler for additional logic (create user in DB)
                .successHandler(oAuth2LoginSuccessHandler())
            );

        return http.build();
    }

    @Bean
    public OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler() {
        return new OAuth2LoginSuccessHandler();
    }
}
```

```java
// Custom success handler — create/update user in your database
@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserService userService;

    public OAuth2LoginSuccessHandler(UserService userService) {
        this.userService = userService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                         HttpServletResponse response,
                                         Authentication authentication)
            throws IOException, ServletException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // Extract user info from the OIDC claims (for Google)
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String googleId = oAuth2User.getAttribute("sub"); // unique, stable Google user ID

        // Create or update user in your database
        // Use "sub" (not email) as the unique identifier — emails can change
        userService.findOrCreateUser(googleId, email, name);

        // Redirect to the dashboard
        getRedirectStrategy().sendRedirect(request, response, "/dashboard");
    }
}
```

### Right Way — OAuth2 Resource Server (your API validates external tokens)
```yaml
# application.yml — resource server validates tokens issued by Keycloak
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          # Spring fetches the JWKS (public keys) from this endpoint automatically
          # and caches them for validation
          issuer-uri: "http://keycloak:8080/realms/my-realm"
          # OR specify JWKS URI directly:
          # jwk-set-uri: "http://keycloak:8080/realms/my-realm/protocol/openid-connect/certs"
```

```java
// Security config for a resource server — the simplest and most production-correct approach
@Configuration
@EnableWebSecurity
public class ResourceServerConfig {

    @Bean
    public SecurityFilterChain resourceServerFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/admin/**").hasAuthority("SCOPE_admin")
                // Keycloak roles arrive as "ROLE_admin" — check your token format
                .anyRequest().authenticated()
            )
            // This one line enables JWT validation using the configured issuer URI
            // Spring fetches public keys, validates signature, expiry, audience
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(keycloakRoleConverter()))
            );

        return http.build();
    }

    // Convert Keycloak's role format to Spring Security's authority format
    @Bean
    public JwtAuthenticationConverter keycloakRoleConverter() {
        JwtGrantedAuthoritiesConverter roleConverter = new JwtGrantedAuthoritiesConverter();
        // Keycloak stores roles in "realm_access.roles" — not the default "scope" claim
        roleConverter.setAuthoritiesClaimName("realm_access.roles");
        roleConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(roleConverter);
        return converter;
    }
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the difference between OAuth 2.0 and OpenID Connect (OIDC)?"

**Hruday's answer:**
> OAuth 2.0 and OIDC are often confused because they work together, but they solve different problems.
>
> OAuth 2.0 is an authorization framework. It answers the question: "Can this application access this resource on behalf of the user?" It issues an access token — a credential that grants specific permissions (scopes) to specific resources. OAuth 2.0 says nothing about who the user is. The access token is just a key that opens certain doors.
>
> OIDC — OpenID Connect — is an identity layer built on top of OAuth 2.0. It adds: "Here is who the user is." OIDC adds a second token called the ID token. The ID token is a JWT containing standardised claims: `sub` (unique user ID), `email`, `name`, `picture`, and issuer details. Your application reads the ID token to get the user's identity and can create a user account or link to an existing one.
>
> The simple rule: if you need to access a resource on behalf of the user — OAuth 2.0. If you need to know WHO the user is (for login, SSO) — OIDC (which includes OAuth 2.0). In Spring Security, adding `scope: openid` to the OAuth2 client registration triggers OIDC and gives you the ID token alongside the access token.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is PKCE and why was it added to the Authorization Code flow?"

**Hruday's answer:**
> PKCE — Proof Key for Code Exchange — protects against the authorization code interception attack.
>
> Here is the attack it prevents: In the original Authorization Code flow without PKCE, the authorization server redirects the browser to your app's callback URL with a code in the URL. On mobile and some desktop apps, this redirect goes through the operating system's URL scheme. A malicious app on the same device could register the same URL scheme and intercept the redirect, receiving the authorization code. With the code, the attacker calls the token endpoint directly and gets the access token.
>
> PKCE closes this gap. Before starting the OAuth flow, your app generates a random string — the `code_verifier`. It hashes it (SHA-256) to create the `code_challenge`. The `code_challenge` is sent with the authorization request. The original `code_verifier` is kept secret on the device.
>
> When the app exchanges the code for tokens, it must also send the `code_verifier`. The authorization server re-hashes it and compares it to the stored `code_challenge`. Only the original device that started the flow has the `code_verifier` — the attacker who intercepted the code cannot use it without it.
>
> PKCE was originally designed for mobile and public clients (which cannot securely store a client secret). The current best practice (OAuth 2.1 draft) recommends PKCE for ALL clients, including confidential server-side apps. Spring Security's OAuth2 client adds PKCE automatically for public clients.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When should your Spring Boot app be an OAuth2 client vs an OAuth2 resource server?"

**Hruday's answer:**
> These are two completely different roles and projects often need both at the same time — as different components.
>
> Your app is an **OAuth2 client** when it needs to authenticate users via an external identity provider (Google, GitHub, Okta, your company's Keycloak). Your app does not own the authentication — it delegates to the IdP. The user logs in at Google, Google confirms their identity, and your app creates a local user session. Use `spring-boot-starter-oauth2-client`.
>
> Your app is an **OAuth2 resource server** when it exposes an API that other applications call using tokens issued by an authorization server. Your API does not handle login at all — it just validates incoming Bearer tokens. Microservices architectures almost always make each service a resource server. Use `spring-boot-starter-oauth2-resource-server`.
>
> The typical enterprise setup: a dedicated auth server (Keycloak, Okta) issues tokens. Your React frontend is an OAuth2 client (logs in via Keycloak). Your Spring Boot APIs are resource servers (validate Keycloak-issued JWTs). These are independent roles — the frontend handles the OAuth2 dance, the backend just validates tokens.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "Design SSO for a company with 10 internal Spring Boot microservices. Employees log in once and access all services."

**Hruday's answer:**
> The architecture: one central authorization server (Keycloak or Okta) acts as the SSO provider. All 10 microservices are configured as OAuth2 resource servers pointing to that Keycloak instance.
>
> The flow: An employee opens any internal tool. The frontend detects no valid token → redirects to Keycloak login. Employee authenticates with corporate credentials (Keycloak can federate to Active Directory via LDAP). Keycloak issues: an ID token (for the UI to know who you are) and an access token (JWT with roles, department, user ID). The access token is accepted by ALL microservices because they all trust the same Keycloak issuer and can verify tokens using the same public key.
>
> "Single sign-on" here means the token is valid across all services. When the employee goes to Service B after already being authenticated for Service A, the browser sends the same access token — no re-authentication.
>
> Configuration for each microservice is just two lines: `issuer-uri` pointing to Keycloak. Spring fetches the JWKS automatically and validates tokens locally.
>
> Token lifespan: access tokens 15 minutes, refresh tokens 8 hours (one workday). At end of day, or on logout, the refresh token is invalidated in Keycloak — all services' next token validation fails → user must log in again.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "OAuth 2.0 is for authentication" | "We use OAuth to log users in" | "OAuth 2.0 is an AUTHORIZATION framework — it answers 'what can you do?' not 'who are you?' Using OAuth access tokens alone for authentication is a known vulnerability (the 'OAuth login' anti-pattern). Use OIDC (openid scope) to get the ID token for authentication. The ID token contains the user's identity; the access token contains their permissions." |
| "Implicit flow with the token in URL" | "Just redirect with the token in the hash" | "The Implicit flow is deprecated. Tokens in URL fragments appear in browser history, server logs, and Referer headers — easily leaked. Use Authorization Code + PKCE. No exceptions. Spring Security does not even support Implicit flow anymore in current versions." |
| "Use email as unique user ID" | "Match users by email from the identity provider" | "Emails can change. The `sub` (subject) claim is the stable, unique user identifier within an identity provider. Every Google account has a permanent sub — even if the user changes their email. Always use `sub` as the primary key for linking OAuth identities to your user records. Store both `sub` and `email` but key uniqueness on `sub`." |
| "One set of client credentials for all environments" | "Same client_id used in dev, staging, prod" | "Each environment needs its own OAuth2 application registration with the provider — separate client_id, separate client_secret, separate allowed redirect URIs. This prevents dev tokens from being accepted by production and limits blast radius of a credential leak. Use environment-specific secrets managers." |

---

## 7. Hruday's Real Experience Hook

> "At SAP, our micro-frontends needed to authenticate users through SAP's corporate identity provider (which uses OAuth 2.0 and OIDC under the hood). I saw how the OIDC ID token flows from the identity provider to multiple micro-frontends sharing authentication state — the frontend received the token once, and each micro-frontend service validated it independently. When I transitioned to backend work, the resource server pattern clicked immediately: each Spring Boot service validates the same token locally using the shared public key, achieving SSO across services without any central session server."

---

## 8. Scale Evolution

**1,000 users →** Single Keycloak instance, direct JWKS validation on each service. All token validation is local after the first key fetch. Works fine.

**100,000 users →** Keycloak JWKS endpoint receives many requests on startup as services fetch public keys. Cache the JWKS aggressively with a long TTL (Spring Security does this by default). Consider running Keycloak in HA (high availability) mode with multiple nodes behind a load balancer. Token claims for group memberships can grow large — trim scopes to what each service actually needs.

**10 million users →** Token validation is local CPU operation — linearly scalable with service replicas. No bottleneck there. The bottleneck is the authorization server under login load. Keycloak clustering, geographic distribution, session storage in distributed cache (Infinispan). Consider event-driven token introspection for high-security scenarios (real-time revocation) with Kafka publishing revocation events to all services.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | OAuth 2.0 is their partner API authentication standard. Merchants get client credentials and call the payment API using access tokens. Resource server configuration must be rock-solid. | "How does Razorpay's merchant API authentication work using OAuth2 client credentials flow?" |
| Swiggy / Meesho | Google/Facebook login for customers. SSO for internal tools. Resource server pattern for all microservices. | "How do you implement 'Login with Google' in a Spring Boot app?" |
| Adobe / SAP | Enterprise OIDC SSO with Okta/Azure AD. Employee single sign-on across 200+ internal tools. SCIM provisioning alongside OIDC. | "Design SSO identity federation for an enterprise with Active Directory." |
| Remote / Global roles | OAuth2 + OIDC is the universal standard for modern authentication. Any company using Google Workspace, Microsoft 365, or Okta needs engineers who understand this. | "Implement OAuth2 login with Google in our Spring Boot application." |

---

## 10. Related Topics — What to Study Next

- **Topic 51 — Spring Security Filter Chain** — OAuth2 adds its own filters (`OAuth2LoginAuthenticationFilter`, `BearerTokenAuthenticationFilter`) to the filter chain — understanding the chain makes OAuth2 config choices obvious
- **Topic 52 — JWT Authentication End-to-End** — OIDC ID tokens and OAuth2 access tokens are both JWTs — knowledge from Topic 52 explains how resource servers validate them
- **Topic 54 — RBAC in Spring** — OAuth2 scopes and OIDC roles plug directly into Spring Security's role-based access control — the roles carried in the JWT claims become the authorities checked by `hasRole()`
- **Topic 69 — API Gateway** — in microservices, the API gateway often handles OAuth2 token validation centrally (rather than each service doing it independently) — gateway-level auth with resource server semantics
- **Topic 10 — Security: OWASP Top 10** — OAuth2 misimplementation (open redirectors, CSRF in state parameter, Implicit flow) is an OWASP category — knowing the vulnerabilities makes you a better implementer

---

*Part 3 · OAuth 2.0 + OIDC with Spring Security · Full Stack Interview Guide · Hruday D · 2026*
