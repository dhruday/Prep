# CORS — Preflight, Credentialed Requests
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **CORS** (Cross-Origin Resource Sharing): a browser security mechanism that restricts which origins can access your API — it does NOT protect your API from server-to-server calls, only from browser-initiated cross-origin requests
- **Same-Origin Policy**: browsers block JavaScript from reading responses from a different origin (scheme + domain + port) by default — CORS is how a server explicitly relaxes this restriction for specified trusted origins
- **Preflight request**: for non-simple requests (POST with JSON, custom headers, PUT, DELETE), the browser automatically sends an OPTIONS request to the server first to ask "are you OK with this?" — your server must respond with the correct `Access-Control-Allow-*` headers or the browser blocks the actual request
- **Credentialed requests**: if you need cookies or Authorization headers to be sent cross-origin, both server (`Access-Control-Allow-Credentials: true`) and client (`withCredentials: true`) must explicitly opt in — and `Access-Control-Allow-Origin` cannot be `*` when credentials are involved; it must be a specific origin
- **In Spring**: use `@CrossOrigin` on a controller or configure `WebMvcConfigurer.addCorsMappings()` globally — Spring Security requires CORS configured before the security filter chain so OPTIONS preflight requests are not blocked by authentication

---

## 1. One-Line Definition
CORS (Cross-Origin Resource Sharing) is a browser-enforced mechanism where a web server declares which external origins are allowed to access its resources via HTTP headers — allowing controlled cross-origin requests while the Same-Origin Policy blocks all others by default.

---

## 2. The Problem It Solves

Your React app runs at `app.company.com`. Your Spring Boot API runs at `api.company.com`. When the React app makes an `axios.get('https://api.company.com/products')`, the browser enforces the Same-Origin Policy: `app.company.com` and `api.company.com` are different origins (different subdomains). The browser blocks the response from reaching JavaScript.

This is not an API error — the API received and processed the request fine. The browser intercepted the response and refused to hand it to your JavaScript code. The browser console shows: `Access to fetch at 'api.company.com/products' from origin 'app.company.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`

Your Spring Boot API needs to explicitly say: "I trust `app.company.com`. When responses go to requests from that origin, include the `Access-Control-Allow-Origin: https://app.company.com` header, and the browser will release the response to JavaScript."

The harder version: your SPA calls the API with a POST containing a JSON body. The browser first sends an OPTIONS preflight request to `api.company.com` before the actual POST. If your Spring Boot app has a security filter that blocks unauthenticated requests, it blocks the OPTIONS preflight too — and the actual POST never gets made. The browser sees no valid preflight response and stops. This is the most common CORS misconfiguration in Spring Security apps.

---

## 3. How It Works Internally

### The Mental Model
CORS is a handshake. You (the browser) want to introduce two parties who haven't met: your React app and the Spring API. You send a messenger (OPTIONS preflight) to the API first: "My React app at `app.company.com` wants to POST JSON to you. Is that OK?" The API says "Yes, I trust that origin, and these are the rules." Then the browser allows the actual conversation.

Without the handshake, the browser says "I don't have permission to introduce you" and blocks the communication entirely — even though both systems technically sent and received the data.

`Access-Control-Allow-Origin: *` is like saying "I trust everyone." Fine for public read-only APIs. But if you need cookies to be sent (credentialed requests), `*` is forbidden by the spec — you must name the specific origin, because sending cookies to a wildcard origin is too risky.

### The Mechanism — Step by Step

**Simple requests (no preflight):**
- Method is GET, HEAD, or POST
- Content-Type is `text/plain`, `multipart/form-data`, or `application/x-www-form-urlencoded`
- No custom headers
- Browser sends request directly with `Origin: https://app.company.com` header
- Server checks if that origin is allowed and returns `Access-Control-Allow-Origin: https://app.company.com`
- Browser compares: does the response header match the request origin? Yes → gives response to JavaScript

**Preflight request (OPTIONS):**
1. Browser detects a "non-simple" request: POST with `Content-Type: application/json`, or any PUT/DELETE, or custom headers like `Authorization`
2. Browser automatically sends `OPTIONS https://api.company.com/products` with headers:
   - `Origin: https://app.company.com`
   - `Access-Control-Request-Method: POST`
   - `Access-Control-Request-Headers: Authorization, Content-Type`
3. Server must respond with:
   - `Access-Control-Allow-Origin: https://app.company.com`
   - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE`
   - `Access-Control-Allow-Headers: Authorization, Content-Type`
   - `Access-Control-Max-Age: 3600` (cache preflight result for 1 hour — reduces OPTIONS request overhead)
   - Status: 200 OK
4. Browser reads preflight response. Allowed? → Sends the actual POST request with full body
5. Server processes the real request and again returns `Access-Control-Allow-Origin` in the response

**Credentialed request (cookies + CORS):**
- Client sets `withCredentials: true` (axios/fetch)
- Browser sends cookies and `Authorization` header cross-origin
- Server MUST return `Access-Control-Allow-Credentials: true`
- Server MUST return a specific origin in `Access-Control-Allow-Origin` — not `*`
- If either is missing, browser blocks the response
- Wildcard `*` + `Allow-Credentials: true` is explicitly forbidden by the CORS spec

**Spring Security CORS issue:**
- Spring Security's filter chain runs before Spring MVC routing
- If you define CORS in `WebMvcConfigurer`, it applies at the MVC routing layer
- But if Spring Security blocks unauthenticated requests first, the OPTIONS preflight (which has no auth credentials by design) gets a 401 before reaching the MVC CORS handler
- Fix: configure CORS in Spring Security itself (`.cors()`) OR add `.requestMatchers(HttpMethod.OPTIONS).permitAll()` explicitly

### ASCII Diagram

```
PREFLIGHT FLOW:

Browser (React app at app.company.com)
         │
         │ wants to POST JSON to api.company.com
         │
         ▼
Step 1: Browser sends OPTIONS preflight automatically
         OPTIONS /api/products HTTP/1.1
         Origin: https://app.company.com
         Access-Control-Request-Method: POST
         Access-Control-Request-Headers: Content-Type, Authorization
         │
         ▼
    api.company.com (Spring Boot)
         │  CORS handler checks: is app.company.com in allowed origins?
         │  Yes → respond:
         │  HTTP/1.1 200 OK
         │  Access-Control-Allow-Origin: https://app.company.com
         │  Access-Control-Allow-Methods: GET, POST, PUT, DELETE
         │  Access-Control-Allow-Headers: Content-Type, Authorization
         │  Access-Control-Max-Age: 3600
         │
         ▼
Step 2: Browser sees valid preflight → sends actual request
         POST /api/products HTTP/1.1
         Origin: https://app.company.com
         Content-Type: application/json
         Authorization: Bearer eyJ...
         { ...body... }
         │
         ▼
    api.company.com processes request
    returns response with:
    Access-Control-Allow-Origin: https://app.company.com
         │
         ▼
Browser sees origin matches → gives response to JavaScript ✅


WITHOUT CORRECT CORS CONFIG:

Step 1: Browser sends OPTIONS preflight
         │
         ▼
    Spring Security (no Origin allowlist configured)
         │  no Access-Control-Allow-Origin header in response
         │
         ▼
Browser sees missing header → blocks ACTUAL request from ever sending
JavaScript receives CORS error — the POST never reached the server ❌
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Approach 1: Too permissive — wildcard allows any origin
@CrossOrigin(origins = "*")  // WRONG for APIs that use cookies/auth
@RestController
@RequestMapping("/api")
public class ProductController {
    // Any website in the world can now call your API from users' browsers
    // Combined with allowCredentials=true (if someone adds it), this is forbidden by spec
    // and breaks in modern browsers
}
```

```java
// Approach 2: CORS configured in WebMvcConfigurer but Spring Security blocks OPTIONS preflight
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins("https://app.company.com");
        // This configuration never gets to process OPTIONS preflight requests
        // because Spring Security blocks them first with 401 Unauthorized
        // (OPTIONS requests do not carry credentials, so Spring Security sees unauthenticated)
    }
}

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // Missing: no .cors() call to integrate Spring MVC CORS with Security
            // Missing: no permitAll() for OPTIONS preflight requests
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated());
        return http.build();
    }
}
```

```typescript
// Angular — missing withCredentials for credentialed requests
// Your HttpInterceptor doesn't set withCredentials, so cookies are not sent
const headers = new HttpHeaders({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});
// Missing: { withCredentials: true } for cookie-based auth
this.http.post('/api/orders', body, { headers }).subscribe(...);
```

> **Why this fails in production:** The wildcard origin (`*`) issue is subtle — `Access-Control-Allow-Origin: *` works fine for public APIs without credentials. But the moment you add cookies, session auth, or any credentialed mechanism, modern browsers explicitly block the response if the server sends `*` instead of the specific origin. This causes authentication to silently fail in production for any cross-origin SPA. The Spring Security issue is more common — developers configure CORS in the MVC layer and wonder why OPTIONS returns 401 even after the CORS config is added.

### Right Way — Production Quality

**Spring Boot — CORS in Spring Security (the correct integration point):**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CORS must be configured BEFORE authorisation rules
            // .cors() tells Spring Security to use the CorsConfigurationSource bean
            // This ensures OPTIONS preflight requests get CORS headers before auth checking
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse()))
            .authorizeHttpRequests(auth -> auth
                // Permit OPTIONS preflight requests explicitly
                // Preflight requests carry no credentials, so they must be unauthenticated
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Specific allowed origins — never * when credentials are involved
        config.setAllowedOrigins(List.of(
            "https://app.company.com",
            "https://admin.company.com"
        ));
        
        // For local dev — use an environment variable or Spring profile:
        // if (environment.acceptsProfiles(Profiles.of("local"))) {
        //     config.addAllowedOrigin("http://localhost:4200");
        // }
        
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        
        // Only allow headers your API actually uses — not *
        config.setAllowedHeaders(List.of(
            "Authorization", "Content-Type", "X-XSRF-TOKEN", "Accept"
        ));
        
        // Allow cookies and Authorization header to be sent cross-origin
        // Required for session-based auth or cookie-based JWT
        config.setAllowCredentials(true);
        
        // Browser can cache preflight response for 1 hour — reduces OPTIONS request overhead
        config.setMaxAge(3600L);
        
        // Headers that JavaScript is allowed to read from the response
        // By default, only basic headers are exposed — add custom ones here if needed
        config.setExposedHeaders(List.of("Content-Disposition", "X-Total-Count"));
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

**Controller-level `@CrossOrigin` for fine-grained control:**
```java
@RestController
@RequestMapping("/api/products")
// Use @CrossOrigin when different controllers need different origins
// e.g. public read API allows any origin; admin API allows only internal apps
@CrossOrigin(
    origins = { "https://app.company.com", "https://admin.company.com" },
    methods = { RequestMethod.GET, RequestMethod.POST },
    allowedHeaders = { "Authorization", "Content-Type" },
    allowCredentials = "true",      // string "true", not boolean — Spring's annotation API
    maxAge = 3600
)
public class ProductController {

    @GetMapping
    public List<Product> getProducts() {
        return productService.findAll();
    }

    @PostMapping
    public ResponseEntity<Product> createProduct(@Valid @RequestBody CreateProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(req));
    }
}
```

**Angular — handling credentials in HTTP calls:**
```typescript
// app.module.ts — configure HttpClient to always send credentials (cookies)
@NgModule({
  imports: [
    HttpClientModule,
    // Always include cookies on requests — required for session-based auth cross-origin
    // This sets withCredentials: true on ALL requests
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: CredentialsInterceptor,
      multi: true
    }
  ]
})
export class AppModule {}

// credentials.interceptor.ts
@Injectable()
export class CredentialsInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Clone request with withCredentials: true
    // This tells the browser to send cookies and authenticate headers cross-origin
    // Server must respond with Access-Control-Allow-Credentials: true (not *)
    const credentialedReq = req.clone({ withCredentials: true });
    return next.handle(credentialedReq);
  }
}
```

**React — `axios` credentialed configuration:**
```typescript
// api.ts — configure axios instance
import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://api.company.com',
  
  // withCredentials: true tells the browser:
  // "include cookies and auth headers on this cross-origin request"
  // Without this, cookies are never sent cross-origin even if SameSite allows it
  withCredentials: true,
});

// For fetch-based requests:
fetch('https://api.company.com/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  // credentials: 'include' is the fetch equivalent of axios's withCredentials: true
  credentials: 'include',
  body: JSON.stringify(data),
});
```

**Multiple environment support — CORS origins from config:**
```java
// Read allowed origins from properties — never hard-code in many environments
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    // In application.yml: cors.allowed-origins: https://app.company.com,https://admin.company.com
    // In application-local.yml: cors.allowed-origins: http://localhost:4200,http://localhost:3000
    config.setAllowedOrigins(corsProperties.getAllowedOrigins());
    config.setAllowCredentials(true);
    // ... rest of config
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", config);
    return source;
}

// application.yml
// cors:
//   allowed-origins:
//     - https://app.company.com
//     - https://admin.company.com

// application-local.yml
// cors:
//   allowed-origins:
//     - http://localhost:4200
//     - http://localhost:3000
```

> **Key decisions here:**
> - Configure CORS in Spring Security's `.cors()` method, not just in `WebMvcConfigurer` — the Security filter chain runs before MVC, so CORS must be declared at the Security level for OPTIONS preflight to work
> - `Access-Control-Allow-Origin: *` works for public unauthenticated APIs; the moment you use cookies or the `Authorization` header, you must use specific origins and `allowCredentials: true`
> - `maxAge: 3600` is important at scale — it tells browsers to cache the preflight response for 1 hour; without it, every non-simple request sends an OPTIONS preflight, doubling your API call volume
> - Origins come from application configuration (`@ConfigurationProperties`), not hardcoded in Java code — this allows different origins per environment without code changes

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain what CORS is and why the browser needs it."

**Hruday's answer:**
> CORS is how a web server tells browsers which cross-origin requests it trusts. Without it, the browser's Same-Origin Policy blocks all cross-origin JavaScript requests by default — which is a security feature. The SOP prevents a malicious site from making API calls using your browser's cookies and reading the responses.
>
> But same-origin is too restrictive for real applications. Your React app at `app.company.com` genuinely needs to call your API at `api.company.com`. CORS is the permission mechanism for this: the server responds with `Access-Control-Allow-Origin: https://app.company.com` and the browser says "the API trusts this origin, release the response to JavaScript."
>
> The key thing to understand about CORS is that it's a browser mechanism — it protects browser-based JavaScript. Server-to-server calls, Postman, curl — none of these are affected by CORS. CORS only applies when a browser's JavaScript engine makes a cross-origin request. This is why you'll sometimes see a CORS error in the browser but the same request works fine in Postman.

---

### Q2 — Deep Dive
**Interviewer asks:** "What is a preflight request and when is it sent?"

**Hruday's answer:**
> A preflight is an automatic `OPTIONS` request that the browser sends before certain cross-origin requests — it's asking the server for permission before committing to the real request.
>
> The browser sends a preflight for "non-simple" requests. Simple requests are GET, HEAD, or POST with a basic content type — `text/plain`, `application/x-www-form-urlencoded`, or `multipart/form-data`. Anything else is non-simple: POST with `application/json`, any PUT or DELETE, any custom header like `Authorization` or `X-Correlation-ID`.
>
> The preflight `OPTIONS` request includes `Access-Control-Request-Method` and `Access-Control-Request-Headers` telling the server what the real request will use. The server must respond with `200 OK` and the matching `Access-Control-Allow-*` headers. If it does, the browser then sends the real request.
>
> The critical operational issue with preflights in Spring Security is that OPTIONS requests carry no authentication credentials by design — there's no point sending credentials to check if the real request is permitted. This means if Spring Security requires auth before checking the request type, it returns `401` on the OPTIONS preflight, and the browser never sends the actual request. The fix is `.requestMatchers(HttpMethod.OPTIONS).permitAll()` in the security config, or configuring CORS in the Spring Security layer where it's applied before auth checking.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When is `Access-Control-Allow-Origin: *` safe and when is it dangerous?"

**Hruday's answer:**
> Wildcard `*` is safe for genuinely public, read-only APIs that don't involve user credentials — public data APIs, public CDN assets, a public product catalogue. Any origin can call these, and the responses don't contain sensitive user-specific data, so there's no risk.
>
> It's dangerous in two situations. First, if your API requires cookies or the `Authorization` header — the CORS spec explicitly forbids `*` with `allowCredentials: true`. Modern browsers reject this combination. Less obvious: it's a semantic danger because wildcard says "I trust every website in the world equally" — including `evil.com`. If your API has any private data, state-changing operations, or authentication, wildcard is wrong.
>
> Second, some engineers set `*` for a public endpoint but that endpoint eventually gets expanded to include user-specific data — the wildcard origin is already there and nobody notices it's now wrong. Specific origin lists force the security decision to be made explicitly at configuration time.
>
> In practice: fine to use `*` for public-looking-up APIs with no auth. Never for anything that reads or writes user data.

---

### Q4 — Scenario
**Interviewer asks:** "Your React app is getting CORS errors in production on POST requests, but GET requests work fine. What's wrong and how do you debug it?"

**Hruday's answer:**
> POST with `application/json` triggers a preflight OPTIONS request — GET requests don't. The fact that GET works but POST doesn't is the classic sign of a preflight issue.
>
> First thing I'd check: what does the OPTIONS preflight response look like? In the browser dev tools, network tab, filter by `options` — find the preflight. Is it returning 200 with the CORS headers? Or is it returning 401 or 403?
>
> If it's returning 401, it's the Spring Security issue I mentioned — OPTIONS preflight is being blocked before the CORS configuration is applied. Fix: add `.requestMatchers(HttpMethod.OPTIONS).permitAll()` to Spring Security, or move the CORS configuration into `.cors(corsConfigurationSource)` in the Security config.
>
> If the OPTIONS returns 200 but is missing `Access-Control-Allow-Headers: Content-Type, Authorization`, the preflight is succeeding but the browser sees the JSON content type or auth header isn't listed as allowed — it blocks the real request. Fix: add the missing headers to `allowedHeaders` in the CORS config.
>
> If OPTIONS is returning `Access-Control-Allow-Origin` but it says `*` while the POST includes `credentials: true` or sends cookies — browser blocks it. Fix: change `*` to the specific origin and add `allowCredentials: true`.
>
> At SAP, I debugged exactly this — GET worked, POST didn't, turned out the OPTIONS was hitting a rate limiter before reaching the CORS handler. Added a bypass rule in the rate limiter for OPTIONS requests with a recognisable cross-origin header.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "CORS is a security mechanism for APIs" | "CORS prevents attacks on my API" | CORS is a browser mechanism that protects the user — it stops a malicious site from reading responses of cross-origin requests; it does NOT prevent server-to-server attacks or API abuse from curl/Postman |
| Wildcard + credentials | "Use * to allow all origins" | `*` is forbidden by the spec when `Allow-Credentials: true` — modern browsers throw an error; you must use a specific origin |
| Spring Security + CORS | "Add CORS config to WebMvcConfigurer and it works" | Spring Security filter runs before MVC routing; OPTIONS preflight gets 401 unless CORS is configured at the Security layer or OPTIONS is explicitly permitted |
| CORS prevents CSRF | "CORS prevents cross-site attacks" | CORS prevents cross-origin JavaScript from READING responses; it does not prevent form-based or non-JS cross-origin requests; CORS and CSRF are separate protections |

---

## 7. Hruday's Real Experience Hook
> "At SAP, our Angular apps ran at different subdomains than our Spring Boot APIs. Every environment — dev, staging, production — had a different origin. I implemented a CORS configuration that read allowed origins from `application.yml` per-profile, so the local dev profile included `localhost:4200` while the production profile listed only the production subdomains. The bigger challenge was our Spring Security setup — initially, our OPTIONS preflight requests were getting blocked by the JWT validation filter with a 401. I moved the CORS bean setup into the Spring Security `.cors()` method and added `.requestMatchers(HttpMethod.OPTIONS).permitAll()` which fixed all environments simultaneously. I added this to our internal Spring Boot starter template so all new services got the correct CORS setup automatically."

---

## 8. Scale Evolution

**1,000 users/day →** CORS errors are often noticed in development — not usually a production issue if configured correctly. The key is configuring allowed origins from environment config (not hardcoded) so the right origins apply per environment.

**100,000 users/day →** `Access-Control-Max-Age: 3600` becomes important — without it, every non-simple API call doubles the request volume (OPTIONS preflight + actual request). With maxAge, browsers cache the preflight result for 1 hour, eliminating most OPTIONS requests for returning users.

**10 million users/day →** CDN-level CORS — most CDNs (Cloudflare, CloudFront) can handle CORS header injection at the edge, reducing load on origin servers for OPTIONS preflight responses. CORS headers for public endpoints can be served from cache entirely. Monitor for `Access-Control-Allow-Origin` misconfiguration using security scanning tools — a wildcard on an accidentally-credentialed endpoint is a real risk at scale.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment APIs called from merchant websites — every merchant's domain is a cross-origin caller; credentialed payment requests require specific origin allowlists, not wildcards | Know the credentials + specific-origin requirement cold; understand why `*` can't be used for payment APIs |
| Swiggy / Meesho | Partner APIs called from third-party marketplaces — CORS allows specific partner origins while blocking all others | Understand how to allowlist multiple specific origins and manage them per environment |
| Adobe / Microsoft | Enterprise SaaS with multiple internal apps at different origins calling shared APIs | Know the `maxAge` cache optimisation for high-traffic CORS; understand preflight batching |
| SAP Labs | Angular microfrontends on different subdomains calling Spring Boot microservices — exactly where Spring Security + CORS integration matters | Know the Spring Security `.cors()` integration and the OPTIONS preflight bypass pattern |

---

## 10. Related Topics — What to Study Next

- **Topic 166 — CSRF** — CORS and CSRF are related: CORS restricts which origins can read responses; Same-Origin Policy + CORS is part of the trust model; CSRF tokens handle what CORS can't — state-changing requests that browsers send automatically
- **Topic 169 — OWASP Top 10** — misconfigurations including CORS are covered under A05: Security Misconfiguration; a wildcard CORS configuration in an API that handles sensitive data is an OWASP A05 finding
- **Topic 179 — Secure headers audit** — `Access-Control-Allow-Origin` is one of several security-critical response headers; reviewed together with HSTS, CSP, and X-Frame-Options they form a complete header security posture
- **Topic 168's sibling at the frontend** — Angular's `HttpClientXsrfModule` and CORS's `withCredentials` interact — understanding both together is required for secure Angular + Spring Boot SPA setup
- **Topic 170 — JWT deep dive** — JWT in `Authorization` header triggers CORS preflight on every non-simple request; how you store and send JWTs directly affects your CORS complexity

---

*Part 10 · CORS — Preflight, Credentialed Requests · Full Stack Interview Guide · Hruday D · 2026*
