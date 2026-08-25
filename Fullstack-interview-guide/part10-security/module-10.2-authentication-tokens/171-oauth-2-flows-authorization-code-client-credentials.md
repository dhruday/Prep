# OAuth 2.0 Flows — Authorization Code, Client Credentials
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **OAuth 2.0**: an authorisation framework that lets users grant third-party apps limited access to their resources without sharing passwords — "Login with Google" is OAuth; it delegates permission without credential sharing
- **Authorization Code Flow** (for SPAs and web apps): user → browser redirects to auth server → user logs in → auth server sends short-lived `code` to your app's redirect URI → your app exchanges `code` for access token + refresh token on backend; the token never travels via browser URL — most secure
- **PKCE** (Proof Key for Code Exchange): required for SPAs in Authorization Code Flow — the SPA generates a `code_verifier` before the redirect, sends `code_challenge` (hash) to auth server, and sends `code_verifier` on token exchange; prevents auth code interception attacks; required since no backend secret is possible in a pure SPA
- **Client Credentials Flow**: machine-to-machine (no user) — Service A authenticates directly to the auth server using its own `client_id` + `client_secret`; gets an access token for calling Service B; no user consent involved; used for backend microservice-to-microservice calls
- **Implicit Flow**: deprecated — token in URL fragment was readable by browser history and third-party scripts; replaced by Authorization Code + PKCE for SPAs
- **Device Flow**: for devices without browsers (Smart TVs, CLI tools) — device displays a code; user enters it on a separate device (phone) and approves
- ✅ At SAP: implemented Authorization Code Flow + PKCE for our Angular SPA with Spring Authorization Server; Client Credentials Flow for microservice-to-microservice API calls within our internal platform

---

## 1. One-Line Definition
OAuth 2.0 is an authorisation framework that allows an application to obtain limited access to a user's resources on another service — by having the user grant permission directly, without ever sharing their password with the requesting application.

---

## 2. The Problem It Solves

You're building a productivity app that needs to read a user's Google Calendar. The naive approach: ask the user for their Google username and password. Your app logs in to Google as the user and reads their calendar.

This is catastrophically bad: you now store Google credentials in your database. If you're breached, every user's Google account is compromised. Users have no way to limit what you can do — you have full account access. They can't revoke access without changing their Google password.

OAuth 2.0 solves the delegation problem. Your app redirects the user to Google's auth server. Google asks the user: "Do you want to allow [YourApp] to read your calendar?" User clicks Yes. Google issues an access token scoped only to calendar read access. User is redirected back to your app with the token. Your app uses the token to call Google Calendar API. At no point does your app see the user's Google password. User can revoke access at any time from Google's settings without affecting your app's other users.

The scoped token is the key insight: `scope=calendar.readonly` means even if the token is stolen, the attacker can only read calendar entries — they can't send emails, change passwords, or access Drive.

For internal microservices: Service A needs to call Service B's API. Both are internal, no human user involved. Client Credentials Flow: Service A authenticates as itself (not as a user) using a service account `client_id + secret`. Auth server issues a service-to-service access token. Service B validates it. No shared API keys embedded in code; the auth server manages service identities.

---

## 3. How It Works Internally

### Authorization Code Flow (the secure default for user-facing apps)

```
PLAYERS:
Resource Owner = the user (owns the Google Calendar data)
Client = your application (wants access to the calendar)
Authorization Server = Google's auth server (issues tokens)
Resource Server = Google Calendar API (has the protected data)

FLOW:

Step 1: Client initiates — user clicks "Login with Google"

Client generates:
├── state: random nonce (CSRF protection for OAuth redirect)
└── For SPAs with PKCE:
    ├── code_verifier: random 43-128 char string (kept in memory, never sent until exchange)
    └── code_challenge: BASE64URL(SHA256(code_verifier))

Client redirects browser to auth server:
GET https://accounts.google.com/o/oauth2/auth?
    response_type=code
    &client_id=YOUR_CLIENT_ID
    &redirect_uri=https://yourapp.com/callback
    &scope=openid profile email calendar.readonly
    &state=random-csrf-nonce
    &code_challenge=Base64URLEncodedHash            ← PKCE
    &code_challenge_method=S256                    ← PKCE

Step 2: User authenticates at auth server

Google shows its login page. User enters their Google credentials.
You (the app) never see these credentials.
Google asks: "YourApp wants to read your calendar. Allow?"
User clicks Allow.

Step 3: Auth server sends authorization code to redirect URI

Browser redirects to:
https://yourapp.com/callback?
    code=AUTHORIZATION_CODE_SHORT_LIVED      ← valid for ~10 min, single use
    &state=random-csrf-nonce                ← must match what was sent in Step 1

Client validates state matches (CSRF protection).

Step 4: Client exchanges code for tokens (backend-to-backend, NOT in browser)

POST https://accounts.google.com/o/oauth2/token
Body:
{
  grant_type: authorization_code,
  code: AUTHORIZATION_CODE,
  redirect_uri: https://yourapp.com/callback,
  client_id: YOUR_CLIENT_ID,
  client_secret: YOUR_CLIENT_SECRET,          ← secret, sent from backend only
  code_verifier: ORIGINAL_CODE_VERIFIER       ← PKCE: proves it's the same client
}

Auth server validates:
├── code is valid and not yet used
├── code_verifier hashes to the code_challenge sent in Step 1
├── client_id and client_secret match
└── redirect_uri matches registered URI exactly

Returns:
{
  access_token: JWT or opaque token (short-lived, 1 hour),
  refresh_token: opaque string (long-lived, 30 days),
  id_token: JWT with user identity claims (if openid scope)
  token_type: Bearer,
  expires_in: 3600
}

Step 5: Client calls resource server with access token

GET https://www.googleapis.com/calendar/v3/calendars/primary/events
Authorization: Bearer {access_token}

Resource server validates token → returns calendar events.
```

### PKCE Explained — Why SPAs Need It

A backend web app can store a `client_secret` securely on the server. A single-page app (Angular, React) running in the browser cannot — any secret in JavaScript source code is visible to anyone who reads the page.

Without PKCE, the Authorization Code flow has a gap: if an attacker intercepts the authorization code (via URL history, referrer headers, or a malicious browser extension), they can exchange it for tokens.

PKCE closes this gap:
1. SPA generates `code_verifier` (random, kept only in memory)
2. SPA sends `code_challenge = BASE64URL(SHA256(code_verifier))` to the auth server at the start
3. Auth server stores the `code_challenge` alongside the issued code
4. At token exchange, SPA sends the `code_verifier`
5. Auth server verifies: does `SHA256(code_verifier)` match the stored `code_challenge`?
6. Only the original SPA that started the flow knows the `code_verifier` — an attacker who stole the code cannot complete the exchange without it

### Client Credentials Flow (machine-to-machine)

```
No user. Service A wants to call Service B.

Service A:
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded
Body:
  grant_type=client_credentials
  &client_id=service-a-id
  &client_secret=service-a-secret
  &scope=service-b.read service-b.write

Auth Server validates client_id + secret → returns access token

Service A calls Service B:
GET https://service-b/api/internal/data
Authorization: Bearer {access_token}

Service B validates the token (RS256, public key from JWKS endpoint).
Checks scope: does this token have service-b.read? Yes → proceed.
```

### Comparison of Flows

```
Flow               │ Who    │ Use Case                   │ Client Secret? │ User Interaction?
───────────────────┼────────┼────────────────────────────┼────────────────┼──────────────────
Authorization Code │ User   │ Web apps, mobile apps      │ Yes (backend)  │ Yes
+ PKCE             │ User   │ SPAs (no backend secret)   │ No             │ Yes
Client Credentials │ M2M    │ Microservice-to-service    │ Yes (service)  │ No
Device Flow        │ User   │ Smart TV, CLI tool         │ No             │ Yes (other device)
Implicit (deprecated)│ User │ Old SPAs (replaced by PKCE)│ No             │ Yes
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Wrong: using Implicit Flow (deprecated, insecure)
// The access token is returned in the URL fragment (#access_token=...)
// Tokens in URL fragments are:
// - visible in browser history
// - sent in Referer headers to any resources on the page
// - readable by any JavaScript on the page (including third-party scripts)
// Do not use Implicit Flow for any new applications

// application.yml — wrong: implicit flow still configured
// spring.security.oauth2.client.registration.google.authorization-grant-type: implicit
```

```typescript
// Wrong: SPA using Authorization Code without PKCE
// If someone intercepts the authorization code, they can exchange it for tokens
// because there's no way to prove the original requester is the same one exchanging

// angular-oauth2-oidc — wrong config (no PKCE)
authConfig: AuthConfig = {
  issuer: 'https://auth.company.com',
  redirectUri: window.location.origin + '/callback',
  clientId: 'my-spa',
  responseType: 'code',
  // Missing: usePkce: true
  // Without PKCE, code interception attack is possible
  scope: 'openid profile email',
};
```

```java
// Wrong: Client Credentials — client_secret in application.yml without encryption
// Anyone with read access to the config file or environment gets the secret
// application.yml:
// spring:
//   security:
//     oauth2:
//       client:
//         registration:
//           service-account:
//             client-secret: my-plaintext-secret-12345  ← secret in plaintext config file
```

> **Why this fails in production:** Implicit flow was deprecated by RFC 9700 because tokens in URL fragments have leaked in real breaches through browser logs and analytics scripts. Authorization Code without PKCE is vulnerable to authorization code interception. Client secrets in plaintext config files get committed to Git, copied to Slack, and rotate poorly.

### Right Way — Production Quality

**Spring Boot — OAuth2 Resource Server (validates tokens from external auth server):**
```java
// Spring Boot service act as a Resource Server — validates JWTs from the auth server
@Configuration
@EnableWebSecurity
public class ResourceServerConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .oauth2ResourceServer(oauth2 -> oauth2
                // Spring fetches JWKS from the auth server's well-known endpoint
                // Validates RS256 JWT signatures using the public key
                .jwt(jwt -> jwt
                    .jwkSetUri("https://auth.company.com/.well-known/jwks.json")
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                // Scope-based access control: token must have the 'orders.read' scope
                .requestMatchers("/api/orders").hasAuthority("SCOPE_orders.read")
                .anyRequest().authenticated()
            );
        return http.build();
    }

    // Extract roles from the "roles" claim in the JWT
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter converter = new JwtGrantedAuthoritiesConverter();
        converter.setAuthoritiesClaimName("roles");      // custom claim name for roles
        converter.setAuthorityPrefix("ROLE_");           // Spring Security prefix convention
        
        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(converter);
        return jwtConverter;
    }
}
```

**Spring Boot — OAuth2 Client (Client Credentials for M2M):**
```java
// Service calling another service using Client Credentials flow
@Configuration
public class OAuth2ClientConfig {

    @Bean
    public OAuth2AuthorizedClientManager authorizedClientManager(
        ClientRegistrationRepository clientRegistrationRepository,
        OAuth2AuthorizedClientRepository authorizedClientRepository
    ) {
        // ClientCredentialsOAuth2AuthorizedClientProvider handles token refresh automatically
        // When the access token expires, it requests a new one transparently
        OAuth2AuthorizedClientProvider authorizedClientProvider =
            OAuth2AuthorizedClientProviderBuilder.builder()
                .clientCredentials()
                .build();

        DefaultOAuth2AuthorizedClientManager manager = new DefaultOAuth2AuthorizedClientManager(
            clientRegistrationRepository, authorizedClientRepository);
        manager.setAuthorizedClientProvider(authorizedClientProvider);
        return manager;
    }
}

// application.yml — Client Credentials registration
// spring:
//   security:
//     oauth2:
//       client:
//         registration:
//           inventory-service:
//             client-id: ${INVENTORY_CLIENT_ID}          ← from environment / Vault
//             client-secret: ${INVENTORY_CLIENT_SECRET}  ← from environment / Vault
//             authorization-grant-type: client_credentials
//             scope: inventory.read, inventory.write
//         provider:
//           company-auth:
//             token-uri: https://auth.company.com/oauth2/token
```

```java
// WebClient configured with OAuth2 to add access token automatically
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient inventoryWebClient(
        OAuth2AuthorizedClientManager authorizedClientManager
    ) {
        // ServletOAuth2AuthorizedClientExchangeFilterFunction adds
        // the Authorization: Bearer {token} header automatically on each request
        // It handles token refresh via Client Credentials transparently
        var oauth2Client = new ServletOAuth2AuthorizedClientExchangeFilterFunction(
            authorizedClientManager);
        oauth2Client.setDefaultClientRegistrationId("inventory-service");

        return WebClient.builder()
            .baseUrl("https://inventory-service.company.com")
            .filter(oauth2Client)
            .build();
    }
}

// Usage — the Bearer token is added automatically, no manual handling
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final WebClient inventoryWebClient;

    public Flux<Product> getAvailableProducts() {
        // OAuth2 token fetched and attached automatically by the WebClient filter
        return inventoryWebClient.get()
            .uri("/api/products/available")
            .retrieve()
            .bodyToFlux(Product.class);
    }
}
```

**Angular SPA — Authorization Code + PKCE with `angular-oauth2-oidc`:**
```typescript
// app.module.ts
import { OAuthModule, AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer: 'https://auth.company.com',
  redirectUri: window.location.origin + '/callback',
  postLogoutRedirectUri: window.location.origin,
  clientId: 'angular-spa',
  responseType: 'code',    // Authorization Code Flow
  usePkce: true,           // PKCE enabled — required for SPAs without client_secret
  scope: 'openid profile email orders.read orders.write',
  // Automatic silent refresh before token expires
  sessionChecksEnabled: true,
  clearHashAfterLogin: true, // Remove token/code fragments from URL after login
};

@NgModule({
  imports: [
    OAuthModule.forRoot({
      resourceServer: {
        // Automatically add Authorization header to these URLs
        allowedUrls: ['https://api.company.com'],
        sendAccessToken: true
      }
    })
  ]
})
export class AppModule {}

// auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private oauthService: OAuthService) {
    this.oauthService.configure(authConfig);
    this.oauthService.loadDiscoveryDocumentAndTryLogin();
    // Set up automatic silent token refresh
    this.oauthService.setupAutomaticSilentRefresh();
  }

  login(): void {
    // Generates code_verifier, stores it, redirects to auth server with code_challenge
    this.oauthService.initAuthorizationCodeFlow();
  }

  logout(): void {
    this.oauthService.logOut();
  }

  get accessToken(): string {
    return this.oauthService.getAccessToken();
  }

  get isLoggedIn(): boolean {
    return this.oauthService.hasValidAccessToken();
  }
}
```

**React SPA — using Auth.js (next-auth) or oidc-client-ts:**
```typescript
// For React apps using oidc-client-ts
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const userManager = new UserManager({
  authority: 'https://auth.company.com',
  client_id: 'react-spa',
  redirect_uri: window.location.origin + '/callback',
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',              // Authorization Code
  scope: 'openid profile email',
  // PKCE is enabled by default in oidc-client-ts v2+
  // automaticSilentRenew enables silent token refresh
  automaticSilentRenew: true,
  silent_redirect_uri: window.location.origin + '/silent-renew',
  // Store tokens in session storage — survives page reload but not new tabs
  // This is safer than localStorage (tab-isolated) but less convenient than in-memory
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
});

export function login() {
  userManager.signinRedirect();
}

export async function handleCallback() {
  const user = await userManager.signinRedirectCallback();
  return user;
}

export async function getAccessToken(): Promise<string | null> {
  const user = await userManager.getUser();
  return user?.access_token ?? null;
}
```

> **Key decisions here:**
> - `usePkce: true` is mandatory for any SPA — `angular-oauth2-oidc` defaults this to true in recent versions; always verify it's enabled
> - Client secrets must come from environment variables or Vault — never hardcoded in `application.yml`; use `${INVENTORY_CLIENT_SECRET}` syntax which reads from the environment at runtime
> - `WebClient` with `ServletOAuth2AuthorizedClientExchangeFilterFunction` handles token lifecycle completely — you write no token management code in service classes; the OAuth2 client handles acquisition, caching, and refresh automatically
> - Scope validation on the resource server (`hasAuthority("SCOPE_orders.read")`) implements least-privilege access — a token for `inventory.read` cannot access the orders endpoint even if it's a valid token from the same auth server

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain the Authorization Code flow. Why does the access token exchange happen server-side?"

**Hruday's answer:**
> The Authorization Code flow has four steps. First, the user is redirected to the auth server's login page — the access request includes what permissions the app wants (scope), a redirect URI, and a random state value for CSRF protection. Second, the user authenticates at the auth server and grants the requested permissions. Third, the auth server redirects back to the app's redirect URI with a short-lived authorization code.
>
> The key security step is fourth: the app exchanges the authorization code for tokens. This exchange happens from the application's backend to the auth server — it includes the `client_secret`, which proves the app is who it claims to be.
>
> Why server-side? The `client_secret` cannot be exposed in the browser. If I did the token exchange in JavaScript (the Implicit flow), the secret would be in the JavaScript source code, visible to anyone. By doing it server-side over a direct HTTPS connection, only the auth server and the backend see the secret. The authorization code travels via the browser, but it's short-lived and single-use — even if stolen, it's useless without the client secret (or without the PKCE verifier for SPAs).
>
> For SPAs that have no backend, PKCE replaces the client secret as the proof of identity.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why was the Implicit flow deprecated, and what replaced it?"

**Hruday's answer:**
> The Implicit flow returned the access token directly in the URL fragment — `https://yourapp.com/callback#access_token=eyJ...`. This means the token is visible in browser history, in referrer headers sent to any resources loaded on the callback page, and in JavaScript running on the page including third-party scripts.
>
> Real-world attacks using this: a user logs in on a page that also loads some analytics or ad scripts. Those scripts can read `window.location.hash` and steal the access token. It's also problematic for browser history — if a user's computer is accessed by someone else, the access token is visible in the URL history.
>
> RFC 9700 deprecated Implicit flow in 2023. It's replaced by Authorization Code flow with PKCE for SPAs. PKCE gives you all the security benefits of the Authorization Code flow — token exchange over a direct backend-to-backend channel, token not in URL — without requiring a client secret. Instead, the SPA generates a cryptographic proof (code verifier) before the redirect and proves it at exchange time. The access token never appears in the URL.
>
> Libraries like `angular-oauth2-oidc` and `oidc-client-ts` handle PKCE automatically — you just set `usePkce: true` or it defaults true in modern versions.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use Client Credentials flow vs Authorization Code flow?"

**Hruday's answer:**
> The deciding factor is: is there a human user involved?
>
> Authorization Code is for user-delegated access — the token represents "User Alice has granted this app permission to access her data." The user is present during the flow, authenticates, and explicitly consents to the scope.
>
> Client Credentials is for machine-to-machine access — the token represents "Service A is authorised to call Service B." No user involvement; Service A authenticates as itself using its own credentials. The access is granted by a system administrator configuring the service account, not by a live user consent.
>
> Concrete examples: our Order Service needs to call the Inventory Service to check stock levels when processing an order — no user is present; this is Client Credentials. A user in our Angular app wants to authorise the app to read their profile from an identity provider — the user must consent; this is Authorization Code.
>
> At SAP, we used Client Credentials for all internal microservice-to-microservice calls using Spring WebClient with the OAuth2 filter. This gave us a centralised auth server managing service identities, with tokens scoped to specific services and operations — far better than shared API keys that get copied everywhere and never rotated.

---

### Q4 — Scenario
**Interviewer asks:** "You're designing a fintech app where users connect their bank accounts via OAuth. Walk through the security considerations."

**Hruday's answer:**
> The critical design decisions for a bank OAuth integration:
>
> First, scope minimisation. Request only the exact scopes needed — `accounts.read` for balance checking, `transactions.read` for history. Never request `payments.write` unless the feature genuinely needs it. Scopes should match the specific feature, not "grant everything in case we need it later."
>
> Second, `state` parameter validation. Every OAuth redirect must include a random CSRF nonce as `state`. When the callback returns, validate that `state` matches what was sent. Without this, an attacker can trick a user into authorising with the attacker's credentials — session fixation via OAuth.
>
> Third, the authorization code must be exchanged server-side, never in the browser. This means the Angular/React SPA redirects to the auth server, the callback goes to the SPA URL, but the SPA immediately POSTs the code to your backend, which performs the token exchange. The bank's access token stays on your server — never in the browser.
>
> Fourth, token storage on your server: access token in database encrypted at rest, refresh token in database encrypted differently. Access tokens are short-lived; use the refresh token to renew when needed.
>
> Fifth, `redirect_uri` must be an exact match — registered with the bank beforehand. Any deviation in the redirect URI should cause the auth server to reject the request. This prevents open redirect attacks.
>
> Sixth, audit logging: every time you use a bank token, log what API was called, when, and for which user. This is both a compliance requirement (open banking regulations) and critical for detecting misuse.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Implicit flow is for SPAs" | "SPAs should use Implicit flow since they can't have a secret" | Implicit was deprecated in 2023; Authorization Code + PKCE replaces it entirely for SPAs; PKCE removes the need for a client secret |
| PKCE is optional | "PKCE is an extra security measure you can skip if you trust the environment" | PKCE is mandatory for any OAuth client that cannot store a secret securely — all SPAs, mobile apps, CLI tools |
| Client Credentials for users | "Use Client Credentials to avoid the redirect flow overhead for your own backend" | Client Credentials is for machine identities only; using it for users means your app authenticates as itself, not as the user — you lose user-level scopes, audit trails, and revocability |
| OAuth = authentication | "OAuth authenticates users" | OAuth is an authorisation framework — it grants access to resources; it does not authenticate who the user is; OIDC (built on OAuth) adds authentication via the ID token |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I designed the OAuth2 integration for our enterprise portal. We had two distinct patterns. For the Angular SPA's user-facing auth, I used Authorization Code Flow with PKCE via `angular-oauth2-oidc` — SAP's own identity provider handled the auth server. For internal microservice communication, 4 backend services needed to call each other securely without passing user tokens around. I implemented Client Credentials Flow using Spring Boot's OAuth2 client auto-configuration, with `WebClient` and the `ServletOAuth2AuthorizedClientExchangeFilterFunction`. Each service had its own `client_id` and scoped permissions — the inventory service could never accidentally call the payments API because its token didn't have the payment scope. All client secrets were injected from environment variables via Kubernetes Secrets, never in source code."

---

## 8. Scale Evolution

**1,000 users/day →** OAuth2 is appropriate at any scale. For small apps, a hosted identity provider (Auth0, Keycloak, Okta) manages the auth server so you don't build it. Focus on getting PKCE, scope minimisation, and `state` validation right.

**100,000 users/day →** Token caching for Client Credentials — don't request a new token for every microservice call; cache the access token until 60 seconds before expiry, then refresh. Spring's `OAuth2AuthorizedClientManager` does this automatically. Monitor token validation error rates — a spike indicates either expired JWKS cache or an attack.

**10 million users/day →** Federated auth with multiple identity providers (Google, Microsoft, internal corporate SSO). Token introspection vs local JWT verification trade-off: local JWT verification scales infinitely (no auth server call), but requires handling key rotation; token introspection is real-time but adds latency. JWKS caching with key rotation (new key quarterly, old key accepted for 30 days) is the industry-standard balance.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | "Login with Razorpay" for merchant platforms; open banking OAuth for bank account linking; Client Credentials for internal payment microservices | Know Authorization Code PKCE end-to-end, scope design |
| Swiggy / Meesho | Social login (Google/Facebook) for customers; internal microservice auth for order→inventory→payment chains | Know Client Credentials flow and Spring WebClient OAuth2 integration |
| Adobe / Microsoft | Enterprise SSO with SAML→OIDC→OAuth bridge; multi-tenant OAuth apps where one App registration serves multiple customer organisations | Know OAuth federation, multi-tenant concepts, scope inheritance |
| SAP Labs | SAP Identity Provider integration; BTP (Business Technology Platform) uses OAuth2 heavily; XSUAA (SAP's auth service) implements OAuth2 | Client Credentials for service-to-service in SAP BTP architecture; Authorization Code for SAP Fiori apps |

---

## 10. Related Topics — What to Study Next

- **Topic 172 — OIDC** — OIDC is built directly on top of OAuth 2.0; the Authorization Code flow used in OIDC is identical; the difference is the `id_token` claim set that OIDC adds for user identity
- **Topic 170 — JWT deep dive** — OAuth access tokens are often JWTs; all JWT security considerations (RS256, exp, jti, short expiry) apply directly to OAuth access tokens
- **Topic 173 — Silent refresh pattern** — the frontend pattern for proactive token refresh built on top of Authorization Code + PKCE; the practical SPA implementation of Sections 3-4 here
- **Topic 176 — Secrets management** — OAuth client secrets (`client_id` + `client_secret`) are the most critical secrets in an OAuth architecture; how you store and rotate them is covered in the secrets management topic
- **Topic 169 — OWASP Top 10** — OAuth misconfiguration (missing `state` validation, open redirect_uri) maps to OWASP A07: Authentication Failures and A01: Broken Access Control

---

*Part 10 · OAuth 2.0 Flows — Authorization Code, Client Credentials · Full Stack Interview Guide · Hruday D · 2026*
