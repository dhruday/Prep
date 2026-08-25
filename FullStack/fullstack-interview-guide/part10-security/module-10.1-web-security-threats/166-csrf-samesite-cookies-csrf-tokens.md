# CSRF — SameSite Cookies, CSRF Tokens
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **CSRF** (Cross-Site Request Forgery): a malicious site tricks your already-logged-in user's browser into making an unauthorised request to your site — the browser automatically includes the session cookie, so your server thinks the request is legitimate
- **Why it works**: cookies are attached to requests automatically by the browser, regardless of which site triggered the request
- **SameSite=Strict**: browser only sends cookie when origin matches exactly — blocks all cross-site requests; best protection, breaks OAuth redirects
- **SameSite=Lax** (default since Chrome 80): browser sends cookie on top-level GET navigations (clicking links) but not on cross-origin POST/PUT/DELETE — good balance; protects state-changing operations
- **CSRF token**: server generates a unique per-session random token, stores it server-side, requires it in every state-changing request as a hidden form field or request header; a cross-site attacker cannot read this token because cross-origin JS cannot read your site's cookies or HTML
- ✅ At SAP, `SameSite=Strict` + Spring Security CSRF token together eliminated all CSRF vulnerabilities in our enterprise portal — the two-layer approach handles both form submission and AJAX requests

---

## 1. One-Line Definition
CSRF (Cross-Site Request Forgery) is an attack where a malicious website causes a victim's browser to send a forged HTTP request to another site where the victim is authenticated, using the victim's session credentials automatically attached by the browser.

---

## 2. The Problem It Solves

A user is logged into their bank at `bank.com`. Their session cookie — `sessionid=abc123` — is valid and stored in the browser. The user then visits `evil.com` (a malicious site) in another tab.

`evil.com` contains hidden HTML:
```html
<img src="https://bank.com/transfer?to=attacker&amount=50000" />
```

The browser tries to load this "image." To do so, it sends a GET request to `bank.com` and automatically includes the `sessionid` cookie. If `bank.com`'s transfer endpoint accepts GET requests and trusts the cookie, the transfer happens.

With a form-based attack, `evil.com` can trigger a POST:
```html
<form id="csrf" method="POST" action="https://bank.com/transfer">
  <input name="to" value="attacker" />
  <input name="amount" value="50000" />
</form>
<script>document.getElementById('csrf').submit()</script>
```

The user never sees this form. It auto-submits on page load. The browser attaches the session cookie to the POST. The server validates the cookie, sees a valid session, and processes the transfer. The user loses money.

Modern CSRF protection — `SameSite` cookies and CSRF tokens — prevents this attack entirely. This is why payment APIs implement both.

---

## 3. How It Works Internally

### The Mental Model
Your browser is like a wallet that automatically pays for every meal at any restaurant you have an account at, whenever someone else says "This person wants to pay." You didn't authorise the payment — someone else triggered it — but the wallet paid because it saw your payment card inside.

`SameSite=Strict` means: only allow me to pay when I personally walk into the restaurant. My wallet says "I only open here if the request came from this restaurant's own pages."

A CSRF token is like a receipt number only you know. Every payment requires you to provide the receipt number from a previous interaction with the restaurant. An attacker who doesn't have your receipt can't trigger a payment.

### The Mechanism — Step by Step

**How the attack works:**
1. Victim logs into `yoursite.com`. Session cookie `sessionid=XYZ` stored in browser.
2. Victim (still logged in) visits `evil.com` in another tab.
3. `evil.com` page contains a hidden form that POSTs to `yoursite.com/account/transfer`.
4. JavaScript on `evil.com` auto-submits the form.
5. Browser sends POST to `yoursite.com`, automatically attaches `sessionid=XYZ` cookie.
6. `yoursite.com` server receives the request, sees a valid session cookie, processes the transfer.
7. Attack complete — victim transferred funds without knowing.

**Why SameSite protects:**
- `Set-Cookie: sessionid=XYZ; SameSite=Strict` — browser checks the request's origin. The form submission from `evil.com` is a cross-site request. `SameSite=Strict` says: do not attach this cookie on any cross-site request. The server receives the POST without the session cookie. Server returns 401: unauthenticated. Attack fails.

**Why CSRF tokens protect:**
1. When the real user loads the form on `yoursite.com`, Spring Security embeds a unique random token: `<input type="hidden" name="_csrf" value="abc-def-ghi" />`
2. This token is also stored in the user's session server-side.
3. When the form is submitted, the token is sent with the request.
4. Spring Security validates: does the `_csrf` value in the request match what's in the session? Yes → valid. No → reject with 403.
5. An attacker on `evil.com` cannot read the CSRF token from `yoursite.com`'s HTML — the Same-Origin Policy prevents cross-origin JavaScript from reading another site's HTML or cookies.
6. The attacker's forged form either doesn't include the token or has a wrong one → request rejected.

**SameSite=Lax vs Strict trade-off:**
- `Strict`: No cookie on ANY cross-site request — including navigating to your site from a link in an email. If a user clicks a link in a marketing email to `yoursite.com`, the cookie is not sent; they appear logged out.
- `Lax` (default in modern browsers): Cookie IS sent on top-level GET navigations (links, redirects) but NOT on cross-origin form POSTs, PUT, DELETE, or AJAX. This protects state-changing operations while keeping normal link navigation working.
- Most applications use `SameSite=Lax` for session cookies and add CSRF tokens as a second layer for POST/PUT/DELETE operations.

### ASCII Diagram

```
CSRF ATTACK flow (without protection):

User (bank.com session cookie active)
         │
         ▼
    visits evil.com
         │
         ▼
evil.com auto-submits form → POST bank.com/transfer
         │
         │  Browser automatically attaches session cookie
         │
         ▼
    bank.com server
         │  sees valid session cookie → trusts request
         ▼
    Transfer processes ← ATTACK SUCCEEDS


WITH SameSite=Strict protection:

evil.com auto-submits form → POST bank.com/transfer
         │
         │  Browser checks: SameSite=Strict? Cross-site request?
         │  → Does NOT attach session cookie
         │
         ▼
    bank.com server
         │  receives request with no session cookie
         ▼
    401 Unauthorized ← ATTACK BLOCKED


WITH CSRF Token protection:

evil.com auto-submits form → POST bank.com/transfer
         │  (attacker doesn't know the CSRF token)
         │
         ▼
    bank.com server
         │  checks _csrf token: not present or wrong
         ▼
    403 Forbidden ← ATTACK BLOCKED
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```java
// Spring Boot — CSRF protection disabled (commonly done "to simplify" REST APIs)
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // DANGER: disabling CSRF protection entirely
            // Developers often do this because "REST APIs shouldn't need CSRF"
            // But if your API uses cookies (session-based auth), you need CSRF protection
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().authenticated());
        return http.build();
    }
}
```

```java
// Transfer endpoint that accepts GET requests — allows the simple image tag CSRF attack
@GetMapping("/transfer")  // WRONG: state-changing operation should never be GET
public ResponseEntity<String> transfer(@RequestParam String to, @RequestParam int amount) {
    // Attacker uses: <img src="/transfer?to=attacker&amount=50000">
    // GET requests bypass most CSRF protections — this is extremely dangerous
    transferService.execute(to, amount);
    return ResponseEntity.ok("Transferred");
}
```

```yaml
# application.yml — no SameSite configuration
server:
  servlet:
    session:
      cookie:
        http-only: true
        # Missing: same-site not set — browser default applies, which may be None for older configs
        # Missing: secure not set — cookie sent over HTTP too
```

> **Why this fails in production:** REST APIs that use session cookies are NOT exempt from CSRF. The `SameSite` attribute is the primary protection, but it's not supported in all browsers uniformly. Disabling CSRF in Spring Security and relying solely on browser `SameSite` defaults is insufficient — older clients, mobile browsers, and edge cases can still be exploited. CSRF tokens provide defence-in-depth.

### Right Way — Production Quality

**Spring Security CSRF configuration:**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF protection ENABLED (this is the default in Spring Security)
            // For SPAs using SameSite cookies, use CookieCsrfTokenRepository
            // which puts the CSRF token in a cookie that Angular/React can read via JS
            // (the CSRF cookie is readable by JS; only the session cookie is HttpOnly)
            .csrf(csrf -> csrf
                // CookieCsrfTokenRepository.withHttpOnlyFalse() allows the SPA to read
                // the CSRF token from the cookie and include it as a request header
                // Spring Security then validates the header value against the cookie value
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                // Ignore CSRF for public endpoints (login, registration) — these don't need it
                .ignoringRequestMatchers("/api/auth/login", "/api/auth/register")
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
```

**Session cookie configuration — SameSite + Secure + HttpOnly:**
```java
// Custom cookie serializer to set SameSite attribute
// (Spring Boot's application.yml same-site property handles this too)
@Bean
public CookieSerializer cookieSerializer() {
    DefaultCookieSerializer serializer = new DefaultCookieSerializer();
    serializer.setCookieName("SESSION");
    serializer.setSameSite("Strict");  // or "Lax" for OAuth redirect compatibility
    serializer.setUseHttpOnlyCookie(true);
    serializer.setUseSecureCookie(true);
    return serializer;
}
```

```yaml
# application.yml — complete cookie security configuration
server:
  servlet:
    session:
      cookie:
        http-only: true       # JavaScript cannot read the session cookie (XSS protection)
        secure: true          # Cookie only sent over HTTPS
        same-site: strict     # Cookie not sent on cross-origin requests (CSRF protection)
        max-age: 3600         # Session expires after 1 hour of inactivity
```

**Angular SPA — reading and sending the CSRF token:**
```typescript
// Angular HTTP interceptor — reads the CSRF token from the cookie set by Spring Security
// and adds it as a request header on every state-changing request
@Injectable()
export class CsrfInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Spring Security sets a cookie named XSRF-TOKEN (readable by JS since HttpOnly=false)
    // Angular's built-in HttpClientXsrfModule does this automatically — use that if possible
    const csrfToken = this.getCookie('XSRF-TOKEN');

    // Only add CSRF header on state-changing methods, not GET/HEAD/OPTIONS
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (csrfToken && !safeMethods.includes(req.method)) {
      const cloned = req.clone({
        headers: req.headers.set('X-XSRF-TOKEN', csrfToken)
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() ?? null;
    }
    return null;
  }
}

// Angular module — the simpler built-in approach:
// Angular's HttpClientXsrfModule does the above automatically
// It reads the XSRF-TOKEN cookie and sets X-XSRF-TOKEN header on non-GET requests
@NgModule({
  imports: [
    HttpClientModule,
    HttpClientXsrfModule.withOptions({
      cookieName: 'XSRF-TOKEN',    // matches what Spring Security sets
      headerName: 'X-XSRF-TOKEN'  // matches what Spring Security reads
    })
  ]
})
export class AppModule {}
```

**React SPA — CSRF token with axios:**
```typescript
import axios from 'axios';

// Configure axios to automatically read and send the CSRF token
// Spring Security writes the token to a cookie; axios reads it and sends it as a header

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,  // include cookies on cross-origin requests if needed
});

api.interceptors.request.use((config) => {
  // Read CSRF token from cookie set by Spring Security
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (token && config.method && !['get', 'head', 'options'].includes(config.method)) {
    config.headers['X-XSRF-TOKEN'] = token;
  }

  return config;
});
```

**State-changing endpoints must use POST/PUT/DELETE, never GET:**
```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    // CORRECT: POST for creating resources (state change)
    @PostMapping
    public ResponseEntity<Order> createOrder(@Valid @RequestBody CreateOrderRequest request) {
        // Spring Security validates X-XSRF-TOKEN header automatically
        // before this method is called — no manual token checking needed
        Order order = orderService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    // CORRECT: DELETE for removing resources (state change)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelOrder(@PathVariable Long id) {
        orderService.cancel(id);
        return ResponseEntity.noContent().build();
    }

    // CORRECT: GET for read operations (safe, idempotent)
    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrder(@PathVariable Long id) {
        // GET is safe — no CSRF risk for read-only operations
        return ResponseEntity.ok(orderService.findById(id));
    }
}
```

> **Key decisions here:**
> - `CookieCsrfTokenRepository.withHttpOnlyFalse()` is the correct approach for SPAs — the CSRF token must be readable by JavaScript (not HttpOnly) so the SPA can include it in request headers; only the session cookie needs to be HttpOnly
> - `SameSite=Strict` is strong but can break OAuth flows where the identity provider redirects back to your site — in that case use `SameSite=Lax` for the session cookie and rely on Double Submit Cookie pattern as the primary CSRF defence
> - Never disable CSRF in Spring Security for cookie-based sessions — the justification "REST APIs don't need CSRF" only applies to stateless JWT-in-Authorization-header auth, where there are no cookies for the browser to auto-submit

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Explain CSRF. What makes a browser vulnerable to it?"

**Hruday's answer:**
> CSRF exploits the browser's automatic cookie attachment behaviour. When a browser makes a request to a domain, it attaches all cookies it has for that domain, regardless of which website initiated the request. This is by design — how else would links and bookmarks work? But it means a malicious site can craft a request to your bank and the browser will include your bank's session cookie, making the request appear legitimate.
>
> The attacker doesn't need to read your cookie — they don't even know what's in it. They just need the browser to send the request, because the cookie goes along for the ride automatically.
>
> Modern browsers have `SameSite` cookie attribute which breaks this behaviour. `SameSite=Strict` tells the browser: only include this cookie if the request came from the same site as the cookie's domain. Cross-site requests get no cookie — CSRF attack fails.
>
> For legacy browser support and defence in depth, you add CSRF tokens. A random per-session token is embedded in forms and sent as a header in AJAX requests. An attacker can't forge this token because they can't read your site's cookies or HTML from a different origin — the Same-Origin Policy prevents that.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why do REST APIs using JWT in the Authorization header not need CSRF protection? But REST APIs using session cookies do?"

**Hruday's answer:**
> The key difference is how the credentials are sent.
>
> With JWT in the `Authorization: Bearer ...` header, the browser does NOT attach this header automatically. Only JavaScript code explicitly adds it. An `evil.com` page can auto-submit a form to `yourapi.com`, but that form will not have the `Authorization` header — the attacker would need JavaScript that reads the JWT from wherever it's stored. If it's in `localStorage`, same-origin policy prevents cross-origin JS from reading it. If it's in `HttpOnly` cookie, JS can't read it either.
>
> With session cookies, the browser auto-attaches them. Period. The attacker doesn't need JavaScript to read the cookie — the browser sends it automatically on every request to that domain in same-site and lax-mode POST requests if SameSite is not Strict. The attacker can trigger a form POST from any website, and the cookie goes along.
>
> At SAP, our portal used session-based auth, so we kept Spring Security's CSRF enabled and used `SameSite=Strict`. For our microservices that used JWT-based auth with the `Authorization` header, CSRF was not applicable — we explicitly documented this in our security architecture decisions to avoid future engineers re-enabling Spring Security CSRF on the wrong services.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When should you use `SameSite=Lax` instead of `SameSite=Strict`?"

**Hruday's answer:**
> Use `SameSite=Lax` when your app participates in OAuth flows or receives redirects from external services.
>
> `SameSite=Strict` means the session cookie is not sent on ANY cross-site request, including top-level navigations like clicking a link in an email or completing an OAuth login at an identity provider that redirects back to your app. With Strict, after the redirect lands on your site, the session cookie is not attached — the user appears logged out even though they just authenticated.
>
> `SameSite=Lax` sends the cookie on top-level GET navigations (links, redirects) but not on cross-origin POST/PUT/DELETE. Since CSRF attacks that do damage are POST operations — a transfer form, a delete action, a password change — Lax blocks them while keeping OAuth redirect flows working.
>
> For highest security, use `SameSite=Strict` and add a first-party redirect page for OAuth (user goes to `yoursite.com/oauth/callback` which sets the cookie and redirects to the app internally). Both `SameSite` levels should be combined with CSRF tokens for defence in depth.

---

### Q4 — Scenario
**Interviewer asks:** "You're building a payment form for a fintech app. How do you prevent CSRF end to end?"

**Hruday's answer:**
> I'd implement two independent layers.
>
> First, session cookies use `SameSite=Strict` and `HttpOnly` and `Secure`. The bank payment page and the internal API are on the same domain, so Strict works here — no OAuth redirects needed for the payment flow itself. This blocks the cookie auto-attachment attack entirely in modern browsers.
>
> Second, Spring Security's CSRF protection enabled with `CookieCsrfTokenRepository`. The CSRF token is embedded in the payment form as a hidden field and sent as a header in any AJAX calls. Spring validates the token server-side before processing the payment. Even if an attacker bypasses SameSite through an older browser, the CSRF token makes the forged request fail.
>
> Third — and this is the HTTP semantics layer — the payment endpoint is POST, not GET. This enforces RESTful state-change principles and also means simple `<img src=...>` tag attacks (which trigger GET) cannot affect payment operations.
>
> For the SPA layer, I'd use Angular's built-in `HttpClientXsrfModule` which automates CSRF token reading from the cookie and sending it as a header — no manual interceptor code needed.
>
> These three together mean a CSRF attack against this payment form would need to defeat SameSite cookies, forge a valid CSRF token (impossible without same-origin access), and somehow trigger a POST that the server would accept. That's effectively impossible.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "REST APIs don't need CSRF" | "Just disable CSRF in Spring Security for REST" | Only correct for JWT-in-Authorization-header; if you use session cookies, CSRF protection is mandatory |
| SameSite = complete protection | "SameSite=Lax is enough, no need for CSRF tokens" | SameSite is browser-side defence only; older browsers, misconfigured mobile clients, and edge cases mean you need CSRF tokens as a second layer |
| CSRF token in localStorage | "Store the CSRF token in localStorage" | CSRF token must come from the server (cookie or form field), not client-generated; a client-generated token in localStorage provides zero protection |
| GET is safe from CSRF | "GET requests don't cause CSRF" | GET requests CAN be CSRF'd via `<img src="...">` — the real rule is never perform state-changing operations on GET; CSRF protection matters for any operation that changes server state |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, our enterprise portal had session-based authentication with an Angular frontend. We had Spring Security's CSRF disabled initially — a past engineer had done this to 'simplify' the API integration. During a security audit, I identified this as a critical vulnerability and re-enabled it with `CookieCsrfTokenRepository.withHttpOnlyFalse()`. The Angular side used `HttpClientXsrfModule` to automatically handle the token, requiring zero changes to individual API calls. We also hardened the session cookie to `SameSite=Strict` once I confirmed that our OAuth redirect flow used a first-party callback endpoint. This eliminated the entire CSRF attack surface on our portal."

---

## 8. Scale Evolution

**1,000 users/day →** CSRF protection matters regardless of scale — one successful CSRF attack on a privileged admin account can compromise the entire system. Enable Spring Security CSRF defaults immediately. `SameSite=Lax` as minimum on session cookies.

**100,000 users/day →** Audit your cookie security headers systematically. Use browser security headers testing tools on all pages. Log CSRF validation failures to detect attack attempts — a spike in 403 CSRF failures indicates a targeted attack campaign.

**10 million users/day →** Rate limiting on state-changing endpoints — CSRF attacks that succeed at scale are often scripted. Token rotation after each state-changing request (per-form CSRF tokens instead of per-session) reduces the window for token theft via XSS. For session fixation prevention, regenerate the session ID after login.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment and funnel actions — a CSRF attack on a payment confirmation endpoint is a direct financial fraud risk; this is P0 | Know Spring Security's CSRF token setup and the difference between session-based and JWT-based CSRF requirements |
| Swiggy / Meesho | Order placement, address saving, review submission — all state-changing operations accessible to logged-in users | Understand when to use SameSite=Strict vs Lax and the trade-off with OAuth redirect flows |
| Adobe / Microsoft | Enterprise SaaS with SSO and OAuth flows — the SameSite=Strict vs Lax trade-off is directly relevant here | Can you explain the Double Submit Cookie pattern for cross-origin OAuth scenarios? |
| SAP Labs | Enterprise portals with Angular frontends using session auth — exactly where CSRF matters most | Know HttpClientXsrfModule for Angular and CookieCsrfTokenRepository for Spring Security |

---

## 10. Related Topics — What to Study Next

- **Topic 165 — XSS** — XSS and CSRF are often confused but are inverses: XSS attacks trust your site places in code from users; CSRF attacks trust your site places in requests from browsers
- **Topic 168 — CORS** — CORS and CSRF are related: CORS prevents cross-origin JavaScript from reading responses; Same-Origin Policy prevents cross-origin JS from reading cookies; CSRF exploits the fact that cookies are sent even when responses can't be read
- **Topic 170 — JWT deep dive** — JWT in Authorization header is why REST services can disable CSRF; understanding this connection is a common interview follow-up
- **Topic 173 — Silent refresh pattern** — token refresh in SPAs must consider CSRF for the refresh mechanism  
- **Topic 179 — Secure headers audit** — `SameSite` is one of several security-critical cookie and response header settings covered together

---

*Part 10 · CSRF — SameSite Cookies, CSRF Tokens · Full Stack Interview Guide · Hruday D · 2026*
