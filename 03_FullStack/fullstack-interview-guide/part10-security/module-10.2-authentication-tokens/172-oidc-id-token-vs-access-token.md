# OIDC — ID Token vs Access Token
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **OIDC** (OpenID Connect): an identity layer built ON TOP of OAuth 2.0 — adds the "who is the user?" answer; OAuth 2.0 handles "what is the user allowed to do?"; OIDC adds "who is the user?"
- **ID Token**: a JWT that tells YOUR application who the user is — contains identity claims (`sub`, `email`, `name`, `picture`, `email_verified`); consumed ONLY by your app (the client); never sent to APIs; it's the answer to "authenticate this user"
- **Access Token**: credential for calling a resource server (API) — contains authorisation claims (`scope`, `roles`); sent as `Authorization: Bearer` on every API call; can be JWT or opaque; the resource server validates it; it's the answer to "authorise this action"
- **The key distinction**: ID token = identity (who you are); Access token = capability (what you're allowed to do); mixing them up = security anti-pattern
- **`openid` scope triggers OIDC**: without it, you get standard OAuth2 (access token only); add `openid` to scope and the auth server also returns an ID token
- **UserInfo endpoint**: `/userinfo` — returns the same claims as the ID token on demand; call it with the access token when you need fresher claims than what's in the ID token
- ✅ At SAP: used SAP IAS (Identity Authentication Service) — OIDC-compliant; ID token decoded on Angular frontend for display name/avatar; access token sent to Spring Boot APIs; never swapped them

---

## 1. One-Line Definition
OIDC (OpenID Connect) is an identity layer on top of OAuth 2.0 that standardises how applications discover who a user is — using a signed JWT called the ID token — while OAuth 2.0 handles what that user is authorised to do via the access token.

---

## 2. The Problem It Solves

OAuth 2.0 was designed for authorisation — granting access to resources. It answers "Can this app call this API?" It does not answer "Who is the user?"

You could technically use an access token to identify a user by calling the `/userinfo` endpoint. But this wasn't standardised: different providers returned different response formats, different claim names, different endpoint URLs. "Login with Google" built on raw OAuth 2.0 would require custom code for every OAuth provider.

OIDC solves this: it standardises that when you add `openid` to your OAuth scopes, the auth server issues an **ID token** — a JWT with a well-defined set of identity claims. The claim names are standard: `sub` (user identifier), `email`, `email_verified`, `name`, `picture`, `phone_number`. Every OIDC provider uses the same claim names. Your Angular/React app can work with Google, Microsoft, SAP, Okta, and any other OIDC-compliant provider using the same code.

The second problem it solves: the access token is meant for the API, not for the app. When "Login with Google" gives you an access token for the Google API, your Angular app shouldn't decode it to get the user's name — the access token's format is Google's internal implementation detail and can change. The ID token is specifically designed for your app to consume, with a stable format and purpose.

---

## 3. How It Works Internally

### The Complete OIDC Flow

```
OIDC extends Authorization Code Flow:

1. Client requests both authorisation AND identity:
   GET /authorize?
     response_type=code
     &client_id=my-app
     &scope=openid profile email orders.read    ← "openid" triggers OIDC
     &redirect_uri=https://app.company.com/callback
     &nonce=random-nonce-per-request            ← OIDC-specific: replay protection for ID token
     &state=csrf-nonce

2. User authenticates at identity provider (Google, SAP IAS, Keycloak)

3. Client receives authorization code at redirect URI

4. Client exchanges code for tokens:
   POST /token
   grant_type=authorization_code
   &code=AUTH_CODE
   &client_id=...
   &client_secret=...  (or PKCE verifier for SPA)

5. Auth server returns THREE things:
   {
     "access_token": "eyJ...",      ← for calling APIs (opaque or JWT)
     "id_token": "eyJ...",          ← consumed by your app only (always JWT)
     "refresh_token": "xxx",        ← for obtaining new tokens
     "token_type": "Bearer",
     "expires_in": 3600
   }

6. Client validates the ID token:
   a. Verify signature using auth server's public key (JWKS)
   b. Verify "iss" = expected issuer URL
   c. Verify "aud" = your client_id (prevents token intended for another app being used here)
   d. Verify "exp" is in the future
   e. Verify "nonce" matches what was sent in step 1 (prevents replay attacks)

7. ID token claims → display user info in the UI:
   {
     "sub": "google|12345",         ← stable unique user ID (use for DB foreign key)
     "email": "user@gmail.com",
     "email_verified": true,
     "name": "Hruday D",
     "picture": "https://...",      ← profile picture URL
     "iss": "https://accounts.google.com",
     "aud": "your-client-id",
     "exp": 1700001000,
     "iat": 1700000000,
     "nonce": "random-nonce-per-request"
   }

8. Access token → sent to Spring Boot API:
   GET /api/orders
   Authorization: Bearer {access_token}  ← NOT the ID token

9. Optional: call UserInfo endpoint for fresh claims
   GET https://auth.server/.well-known/userinfo
   Authorization: Bearer {access_token}
   → Returns same claims as ID token but fresh (for long-lived sessions)
```

### ID Token vs Access Token — The Mental Model

```
ID Token (who are you?):
├── Audience: YOUR application (the client)
├── Purpose: tell the app who the user is
├── Format: always JWT (standard)  
├── Claims: sub, email, name, picture, email_verified
├── Validation: by your app's frontend/backend
├── Never sent: to APIs (don't use ID token as API credential)
└── Analogy: a passport — it identifies you; you show it to the gatekeeper (your app)

Access Token (what can you do?):
├── Audience: the resource server (your API)
├── Purpose: authorise API calls
├── Format: JWT or opaque (provider's choice)
├── Claims: scope, roles, sub (for user context in the API)
├── Validation: by the resource server (Spring Boot API)
├── Sent to: APIs in Authorization: Bearer header
└── Analogy: a ticket — it grants entry to the plane (the API); you give it to each door
```

### Standard OIDC Claims

| Claim | Meaning | Use case |
|-------|---------|----------|
| `sub` | Subject — unique stable user ID from the identity provider | Store as foreign key in your database for this user |
| `email` | User's email address | Display; send notifications |
| `email_verified` | `true` if the provider has verified the email | Don't send email confirmations if already verified; show "verified" badge |
| `name` | Full display name | Show in UI header |
| `given_name` | First name | Personalised greetings |
| `family_name` | Last name | Profile display |
| `picture` | URL to profile picture | Avatar in UI |
| `phone_number` | Phone number | Only present if requested + user granted it |
| `locale` | User's locale (e.g. "en-US") | i18n — set app locale automatically on login |
| `updated_at` | When the profile was last updated | Trigger profile sync if stale |

### Discovery Document — Auto-configuration

OIDC standardises a discovery document at `/.well-known/openid-configuration`. This JSON document tells any client everything it needs:

```json
{
  "issuer": "https://auth.company.com",
  "authorization_endpoint": "https://auth.company.com/oauth2/authorize",
  "token_endpoint": "https://auth.company.com/oauth2/token",
  "userinfo_endpoint": "https://auth.company.com/userinfo",
  "jwks_uri": "https://auth.company.com/.well-known/jwks.json",
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email"],
  "claims_supported": ["sub", "email", "email_verified", "name"]
}
```

Spring Boot's `spring.security.oauth2.client.provider.*.issuer-uri` auto-fetches this document and configures all endpoints automatically. You provide only the issuer URI.

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```typescript
// Wrong: using ID token as API credential
// The Angular app sends the ID token to the backend API
// The ID token is intended for the CLIENT, not the resource server

// API call with ID token — WRONG
const idToken = this.oauthService.getIdToken();  // ID token
return this.http.get('/api/orders', {
  headers: { 'Authorization': `Bearer ${idToken}` }  // WRONG: sending ID token to API
});
// The Spring Boot API validates the ID token's audience
// audience = your_client_id (the Angular app)
// NOT the API's expected audience
// This will fail proper validation or be accepted incorrectly
```

```java
// Wrong: Spring Boot resource server configured to validate ID tokens
// This means anyone who has an ID token (even a third-party idp token)
// can call your API — the audience check is for the client, not the API
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.oauth2ResourceServer(oauth2 -> oauth2
        .jwt(jwt -> jwt
            .jwkSetUri("https://auth.company.com/.well-known/jwks.json")
            // Missing: audience validation — not checking that the token is for THIS API
            // An ID token intended for the Angular app (aud = angular-spa)
            // would also pass this validation
        )
    );
    return http.build();
}
```

```java
// Wrong: using email as the user identifier in your database
// email can change; the stable identifier is "sub"
@Entity
public class User {
    @Id
    private String email;  // WRONG: email can change (user changes email at provider)
    
    // The sub claim is the stable, immutable identifier from the identity provider
    // Use sub as the unique identifier for the user in your system
}
```

> **Why this fails in production:** ID tokens sent to APIs will fail audience validation if the API is properly configured. If the API isn't checking audience (common mistake), an ID token from any trusted IDP for any app could be used to call your API — a security bypass. Using email as the user's database key breaks when users change their email address at the identity provider — all their data becomes orphaned.

### Right Way — Production Quality

**Spring Boot — OIDC client configuration (auto-discovery):**
```java
// Spring Boot auto-configures everything from the OIDC discovery document
// You only need to provide the issuer URI, client credentials, and scopes
```

```yaml
# application.yml — Spring Boot OIDC client setup
spring:
  security:
    oauth2:
      client:
        registration:
          sap-ias:                                    # registration name
            client-id: ${OIDC_CLIENT_ID}             # from environment/Vault
            client-secret: ${OIDC_CLIENT_SECRET}     # from environment/Vault
            scope:
              - openid                               # triggers OIDC — issues ID token
              - profile                              # name, picture, locale claims
              - email                                # email, email_verified claims
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
        provider:
          sap-ias:
            # Spring auto-fetches /.well-known/openid-configuration from this URI
            # All endpoints (auth, token, userinfo, jwks) are discovered automatically
            issuer-uri: https://your-tenant.accounts.ondemand.com
```

**Spring Boot — OIDC Resource Server with audience validation:**
```java
@Configuration
@EnableWebSecurity
public class ResourceServerConfig {

    @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}")
    private String issuerUri;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.decoder(jwtDecoder()))
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        // NimbusJwtDecoder fetches JWKS from the OIDC discovery document
        NimbusJwtDecoder decoder = JwtDecoders.fromIssuerLocation(issuerUri);
        
        // Validate that the token was issued for THIS API, not just for the Angular app
        // The "aud" (audience) claim must include this API's identifier
        // This prevents ID tokens (aud = client_id) from being accepted by the API
        OAuth2TokenValidator<Jwt> audienceValidator = token -> {
            List<String> audiences = token.getAudience();
            if (audiences.contains("https://api.company.com")) {  // this API's identifier
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                new OAuth2Error("invalid_audience", "Token not intended for this API", null)
            );
        };

        // Combine issuer validation (built-in) with audience validation (custom)
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(issuerUri),
            audienceValidator
        );
        
        decoder.setJwtValidator(validator);
        return decoder;
    }
}
```

**Spring Boot — OAuth2 Login (OIDC authentication for web apps):**
```java
// spring-boot-starter-oauth2-client handles the full OIDC flow
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/", "/login").permitAll()
                .anyRequest().authenticated()
            )
            // Enable OIDC login — Spring handles the full Authorization Code + PKCE flow
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")
                .defaultSuccessUrl("/dashboard", true)
                .userInfoEndpoint(userInfo -> userInfo
                    // Map OIDC claims to Spring Security's OidcUser
                    .oidcUserService(oidcUserService())
                )
            )
            .logout(logout -> logout
                .logoutSuccessUrl("/login?logout")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
            );
        return http.build();
    }

    @Bean
    public OidcUserService oidcUserService() {
        OidcUserService delegate = new OidcUserService();
        return (oidcUserRequest) -> {
            OidcUser oidcUser = delegate.loadUser(oidcUserRequest);
            
            // Extract the stable "sub" identifier — use this for your DB user foreign key
            String sub = oidcUser.getSubject();
            String email = oidcUser.getEmail();
            String name = oidcUser.getFullName();
            Boolean emailVerified = oidcUser.getEmailVerified();
            
            // Upsert user in your database using "sub" as the unique identifier
            // sub is stable; email can change
            userRepository.upsertByOidcSub(sub, email, name);
            
            return oidcUser;
        };
    }
}
```

**Angular — correct ID token vs access token usage:**
```typescript
import { OAuthService } from 'angular-oauth2-oidc';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private oauthService: OAuthService) {}

  // Display current user's info from ID token — for UI only
  // ID token is decoded client-side; never sent to APIs
  get currentUser(): UserProfile | null {
    if (!this.oauthService.hasValidIdToken()) return null;
    
    const claims = this.oauthService.getIdentityClaims() as any;
    return {
      id: claims.sub,                    // stable unique identifier
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
      emailVerified: claims.email_verified,
    };
  }

  // Access token — for calling APIs
  // This is what goes in the Authorization: Bearer header
  // angular-oauth2-oidc's HTTP interceptor adds this automatically
  get accessToken(): string {
    return this.oauthService.getAccessToken();
  }

  // Making API calls — the interceptor adds the ACCESS token, not the ID token
  // This is done automatically when sendAccessToken: true is set in OAuthModule config
}

// HTTP interceptor — angular-oauth2-oidc handles this automatically
// It adds: Authorization: Bearer {ACCESS_TOKEN} to all configured URLs
// The ID token is NOT sent to APIs
```

**React — reading ID token claims and using access token for APIs:**
```typescript
import { useAuth } from 'react-oidc-context';

function UserProfile() {
  const auth = useAuth();
  
  // auth.user?.profile contains ID token claims — for display
  // auth.user?.access_token contains the access token — for API calls
  
  const userProfile = auth.user?.profile;  // ID token claims
  
  return (
    <div>
      {/* Display from ID token claims */}
      <img src={userProfile?.picture} alt="Profile" />
      <p>{userProfile?.name}</p>
      <p>{userProfile?.email}</p>
      {userProfile?.email_verified && <span>✓ Verified</span>}
    </div>
  );
}

// API calls — always use the access token
async function fetchOrders() {
  const auth = useAuth.getState();
  const response = await fetch('/api/orders', {
    headers: {
      // Access token, NOT ID token
      'Authorization': `Bearer ${auth.user?.access_token}`
    }
  });
  return response.json();
}
```

> **Key decisions here:**
> - `sub` from the ID token is the correct database foreign key for users — never `email`; `sub` is immutable even if the user changes their email at the identity provider
> - Audience validation on the resource server is mandatory — the `aud` claim must match the API's identifier; this prevents ID tokens from being used as API credentials and prevents cross-tenant token reuse
> - `nonce` claim validation prevents replay attacks — an intercepted ID token used again in a second flow is rejected because the nonce won't match
> - Spring's `issuer-uri` configuration auto-fetches the entire OIDC discovery document — you never need to hardcode endpoint URLs; if the IDP changes a URL, your config adapts automatically on restart

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is OpenID Connect and how does it differ from OAuth 2.0?"

**Hruday's answer:**
> OAuth 2.0 is an authorisation framework — it answers "can this app do this operation?" It issues access tokens that represent permission to call APIs. But OAuth 2.0 alone doesn't define a standard way to say "here's who the user is."
>
> OIDC (OpenID Connect) adds an identity layer on top of OAuth 2.0. When you add `openid` to your OAuth scopes, the auth server issues an ID token in addition to the access token. The ID token is a JWT with standardised claims — `sub` (the user's unique identifier), `email`, `name`, `picture` — that your application consumes to know who the logged-in user is.
>
> The key relationship: OIDC enables authentication (who is the user), OAuth 2.0 enables authorisation (what can they do). "Login with Google" uses OIDC — Google's ID token tells your app the user's Google identity. The access token from the same flow lets your app call Google APIs on the user's behalf.
>
> The practical benefit of OIDC over raw OAuth 2.0 for login: standardised claim names work the same across Google, Microsoft, Okta, SAP IAS, and any other OIDC-compliant provider. You write one auth integration, and it works with any provider.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is the difference between an ID token and an access token, and when does each get used?"

**Hruday's answer:**
> The ID token is for the client application — the Angular/React SPA or your backend that processed the login. Its purpose is to tell the application who the user is. You decode it, extract the claims — `name`, `email`, `sub`, `picture` — and use them to display the user's profile, create their record in your database, or personalise the UI. You never send the ID token to your API as a credential.
>
> The access token is for the resource server — your Spring Boot API. Its purpose is to authorise operations. It contains `scope` (what operations are permitted) and optionally `roles`. You send it in every API call's `Authorization: Bearer` header. The API validates the signature, checks the audience matches the API's identifier, and checks the scopes before executing the operation.
>
> The analogy I use: ID token is your passport — it identifies you; you show it to the airport check-in (your app) to prove who you are. Access token is your boarding pass — it grants you access to a specific plane (a specific API); you hand it to the gate attendant. You wouldn't hand your passport at the gate, and you wouldn't use your boarding pass to prove your identity at the hotel.
>
> Practically in Angular: `angular-oauth2-oidc` has `getIdentityClaims()` for the ID token claims (display name, avatar) and `getAccessToken()` for the token sent to API calls. The HTTP interceptor adds the access token, never the ID token.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you call the UserInfo endpoint instead of reading claims directly from the ID token?"

**Hruday's answer:**
> The ID token's claims are captured at the moment of authentication. If the user updates their profile at the identity provider — changes their name, adds a phone number, verifies their email — the ID token still has the old values until the next login.
>
> For short sessions — standard web app with a few hours of session time — the ID token claims are fresh enough. Most users don't change their provider profile during a single session.
>
> For long-lived sessions — mobile apps or SPAs where users stay logged in for weeks — the ID token will be stale. In that case, calling the UserInfo endpoint with the access token returns the freshest claims from the provider in real time. This is also useful when you need claims that weren't included in the ID token at issuance but can be retrieved from UserInfo — some providers limit ID token size and put extended claims only in UserInfo.
>
> The cost of UserInfo: it's an HTTP call to the auth server on demand — adds latency compare to reading claims from a cached ID token locally. A sensible approach: read standard display claims from the ID token, call UserInfo lazily when you specifically need fresh or extended data (e.g. on the user profile settings page).

---

### Q4 — Scenario
**Interviewer asks:** "A user logs in with Google via OIDC. Later they change their email at Google. What happens in your system?"

**Hruday's answer:**
> If I've stored the user's `sub` claim as the identifier in my database — which is correct — nothing breaks. The `sub` claim is the stable, immutable identifier Google assigns to each user. It never changes, even if the user changes their email, name, or any other profile attribute.
>
> When the user logs in again after changing their email, the new ID token will have the new email in the `email` claim. My OIDC user service intercepts the login, extracts the `sub`, finds the existing user in the database by `sub`, and updates their `email` field to the new value. The user's account is seamlessly updated — all their orders, history, and data remain linked through the immutable `sub`.
>
> If instead I had used `email` as the primary key — which is wrong — the new email would look like a new user. The old account with the old email would be orphaned. The user would start over with no history. This is a real production bug in systems that used email as the OIDC user identifier.
>
> The lesson: always use `sub` as the foreign key linking your application's user records to the external identity. Treat `email` as a display field and a notification address — not as an identifier.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| ID token as API credential | "Send the ID token to the API for authentication" | ID token is for the CLIENT only; sending it to the API breaks audience validation and is a security anti-pattern; send the access token |
| OAuth 2.0 = authentication | "OAuth 2.0 handles authentication" | OAuth 2.0 is authorisation only; OIDC adds authentication; "Login with Google" is OIDC, not raw OAuth |
| Email as user identifier | "Store the user's email as the primary key from OIDC" | `sub` is the stable immutable identifier; email can change; use `sub` as the FK in your database |
| OIDC is only for external IdPs | "OIDC is only needed when using Google/Microsoft login" | OIDC is also the right architecture for your own internal auth server; standardised claim format makes your app portable across any OIDC-compliant provider |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our enterprise portal used SAP IAS (Identity Authentication Service) as the OIDC provider. I configured the Angular frontend with `angular-oauth2-oidc` to request `openid profile email` scopes. The ID token claims — `name`, `email`, `picture` — were decoded client-side to display the user's SAP profile in the header without any backend call. The access token was sent to our Spring Boot APIs via the library's built-in HTTP interceptor. On the Spring Boot side, I configured `oauth2ResourceServer` with audience validation — the API's service URL was the expected audience, ensuring ID tokens intended for the Angular app couldn't be reused against the API. I also built the user provisioning logic to use `sub` as the stable identifier, which prevented orphaned accounts when SAP IAS administrators updated user email addresses."

---

## 8. Scale Evolution

**1,000 users/day →** OIDC standard claim handling from day one — `sub` as user identifier, `email` as display. Load the OIDC discovery document on startup and cache it; don't re-fetch on every request. Spring Boot does this automatically.

**100,000 users/day →** JWKS key caching with background refresh (Spring handles this). Monitor ID token decode errors — a surge may indicate key rotation or a misconfigured OIDC provider. Consider storing profile claims (`email`, `name`) in your database on each login with a `last_seen` timestamp so you can show profile data even when the OIDC provider is temporarily unavailable.

**10 million users/day →** Multi-provider OIDC (Google + Microsoft + internal SSO) — each provider has its own `sub` namespace; prefix the stored identifier with the provider: `google|12345`, `microsoft|67890`. This handles the edge case where two providers could issue the same `sub` value. Evaluate claim normalization layer if you need consistent user data format regardless of provider.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Partner and merchant portals use SSO; OIDC for enterprise customer login | Know how to validate ID tokens, extract `sub`, and prevent ID token misuse as API credentials |
| Swiggy / Meesho | Social login (Google, Phone OTP via OIDC bridge) for consumer apps | Know standard claims (`sub`, `email`), `email_verified` for conditional UX flows |
| Adobe / Microsoft | Enterprise SSO with Azure AD / Microsoft Entra OIDC; multi-tenant apps | Know discovery document, multi-provider `sub` namespacing, audience validation |
| SAP Labs | SAP IAS is OIDC-compliant; SAP BTP uses XSUAA which is OIDC-based; SAP Fiori apps use OIDC for SSO | Know the full Spring Boot OIDC integration, ID token claim extraction, and access token audience validation |

---

## 10. Related Topics — What to Study Next

- **Topic 171 — OAuth 2.0 flows** — OIDC is built directly on OAuth 2.0's Authorization Code flow; the ID token is issued alongside the access token in the same token response
- **Topic 170 — JWT deep dive** — the ID token is always a JWT; all JWT validation rules (RS256, `iss`, `exp`, signature verification) apply to ID token validation; the audience (`aud`) claim is especially important
- **Topic 173 — Silent refresh pattern** — the Angular/React implementation of token refresh that keeps OIDC sessions alive; the `id_token_hint` claim is used in the silent refresh endpoint call
- **Topic 174 — Passkeys and WebAuthn** — the modern alternative to password-based OIDC login; passkeys can be used as the authentication mechanism at the identity provider while OIDC remains the token format
- **Topic 171 — CORS** — the OIDC redirect flow has specific CORS requirements at the redirect URI and token endpoint; understanding both is required for SPA + OIDC integration

---

*Part 10 · OIDC — ID Token vs Access Token · Full Stack Interview Guide · Hruday D · 2026*
