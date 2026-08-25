# Secure Headers Audit — HSTS, X-Frame-Options, Referrer-Policy
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Six essential security headers** — every production web application should have all six; together they reduce the attack surface for MITM, clickjacking, MIME confusion, information leakage, and browser API abuse
- **HSTS** (`Strict-Transport-Security: max-age=31536000; includeSubDomains`): tells the browser to always use HTTPS for this domain — even if the user types `http://`; prevents SSL-stripping MITM attacks; covered in depth in Topic 175
- **X-Frame-Options** (`DENY` or `SAMEORIGIN`): prevents the page from being embedded in an iframe; deprecated in favour of CSP `frame-ancestors` but still needed for IE11 and older browsers; use both for maximum coverage
- **X-Content-Type-Options** (`nosniff`): prevents MIME type sniffing — browser must respect the `Content-Type` header and not try to guess; prevents content-type confusion attacks (serving a JS file as `text/plain` and having it executed)
- **Referrer-Policy** (`strict-origin-when-cross-origin`): controls how much of the referring URL is included in the `Referer` header when navigating away; prevents leaking sensitive URL path information (e.g. `https://bank.com/user/12345/statement`) to third-party domains
- **Permissions-Policy** (`camera=(), microphone=(), geolocation=()`): prevents scripts (including third-party) from requesting access to device APIs the app doesn't need; `()` means nobody — not even same-origin — can request that permission
- **X-XSS-Protection** (`0`): disable the old browser XSS filter — it is deprecated and had its own exploitable vulnerabilities; modern CSP (Topic 178) is the replacement
- **Hruday's production experience** (✅): all 6 headers configured via Spring Security `headers()` at SAP as part of the OWASP compliance initiative; used `securityheaders.com` to verify and grade the configuration

---

## 1. One-Line Definition
Secure headers are HTTP response headers that instruct the browser to apply protective behaviours — enforcing HTTPS, blockng iframe embedding, preventing MIME sniffing, limiting referrer information, restricting device API access — forming a declarative security policy that requires no JavaScript and applies to every response from the server.

---

## 2. The Problem It Solves

Default Spring Boot applications send no security headers. The browser has no instructions about HTTPS enforcement, framing, content type handling, or referrer behaviour. Each missing header leaves a specific attack vector open:

| Missing header | What attacks are enabled |
|---|---|
| No HSTS | SSL-stripping: attacker downgrades HTTPS to HTTP, intercepts traffic |
| No X-Frame-Options | Clickjacking: page embedded in attacker's invisible iframe; user clicks on attacker's overlay thinking they're clicking your button |
| No X-Content-Type-Options | MIME sniffing: browser executes a file served as `text/plain` as JavaScript if its content "looks like" JS |
| No Referrer-Policy | Path leakage: `https://bank.com/accounts/9876/statement` appears in `Referer` header to third-party analytics, CDNs, Google Fonts |
| No Permissions-Policy | Third-party scripts can request camera/microphone in iframes; malicious ad scripts can request geolocation |
| X-XSS-Protection: 1 | The IE XSS filter had exploitable bugs — enabling it can be used for XSS in some edge cases |

These are all "browser instruction" problems — the browser will do the right thing if you tell it to, but it won't do it automatically. Security headers are those instructions.

For interviews: every security header can be demonstrated in 1-2 sentences — what it sets, what attack it prevents. This is a topic where breadth matters. Knowing all 6 headers and their values is more important than deep implementation detail.

---

## 3. How It Works Internally

### HSTS — HTTP Strict Transport Security

Covered in detail in Topic 175. The key points:
```
Header: Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

max-age=31536000:     Browser caches the "always use HTTPS" rule for 1 year (31536000 seconds)
                      If user types http://company.com, browser converts to https:// internally
                      No HTTP request ever leaves the browser for this domain

includeSubDomains:    Applies the rule to ALL subdomains (api.company.com, cdn.company.com)
                      Prevents MITM on subdomains that might be HTTP

preload:              Opt into the browser's hardcoded HSTS preload list
                      Browser knows to use HTTPS even on the FIRST ever visit (no first HTTP request)
                      Submit at https://hstspreload.org/

SSL stripping attack without HSTS:
  User visits: http://company.com
  Attacker on same WiFi intercepts, responds with plain HTTP
  Attacker makes the HTTPS request to company.com on behalf of user
  User never sees HTTPS, attacker reads all traffic
  HSTS prevents step 1: browser never sends the initial HTTP request
```

### X-Frame-Options vs CSP frame-ancestors

```
X-Frame-Options: DENY
  ├── Oldest/most widely supported header for anti-clickjacking
  ├── Values: DENY (never embed), SAMEORIGIN (only same-origin iframes allowed)
  │          ALLOW-FROM https://example.com (DEPRECATED — ignored by modern browsers)
  └── For new code: use CSP frame-ancestors instead; use BOTH for browser compatibility

CSP frame-ancestors (Topic 178):
  ├── Supersedes X-Frame-Options
  ├── More flexible: frame-ancestors 'self' https://trusted-partner.com
  ├── Works in all modern browsers
  └── IE11 and very old mobile browsers: still need X-Frame-Options

Production rule: set BOTH:
  X-Frame-Options: DENY
  Content-Security-Policy: [...] frame-ancestors 'none' [...]
  They are not redundant — they cover different browser generations

Clickjacking attack:
  Attacker hosts: <iframe src="https://bank.com/transfer" style="opacity:0; z-index:999">
                  <button onclick="attacker_action()">Win a prize!</button>
  User clicks "Win a prize" → actually clicks bank.com's transfer button (transparent iframe)
  Triggered a fund transfer without user's knowledge
  X-Frame-Options: DENY → bank.com refuses to be embedded → attack fails
```

### X-Content-Type-Options

```
Header: X-Content-Type-Options: nosniff

Without nosniff:
  Browser has content sniffing: if a response has Content-Type: text/plain but contains
  JavaScript-looking content, some browsers (IE, old Chrome) "sniff" the content type
  and execute it as JavaScript anyway
  
  Attack vector:
    1. Attacker uploads a file "profile.txt" with JavaScript content to your CDN/image host
    2. Server serves it as Content-Type: text/plain (correct — it's a text file)
    3. Without nosniff: browser sniffs it, decides "this looks like JS", executes it
    4. XSS achieved via an uploaded file even though it was never intended to be a script

With nosniff:
  Browser strictly follows the Content-Type header
  Content-Type: text/plain → treated as plain text, never executed as script
  Content-Type: text/javascript → only this header causes JS execution

Also applies to:
  CSS loading: if a stylesheet is served from a URL and the Content-Type isn't a CSS type,
  nosniff prevents it from being applied as CSS
  
  MIME confusion: serves as the backstop for any misconfigured Content-Type headers
```

### Referrer-Policy

```
The Referer header (misspelled since RFC 1945 — historical error):
  When you navigate from page A to page B, the browser sends:
  Referer: https://pageA.com/some/path?sensitive=data
  to page B's server
  
  Problem:
    User on https://bank.com/account/9876/statement/2024-01
    → clicks a link to Google Fonts CDN for a font
    → Referer: https://bank.com/account/9876/statement/2024-01
    → Google Fonts server (or any CDN, analytics, third-party widget) now knows
       the user's account number and what they were viewing
    
    More seriously:
    https://medical-records.company.com/patient/John%20Smith/HIV-test-results
    → This URL appearing in third-party Referer headers is a HIPAA violation

Referrer-Policy values (from most to least restrictive):
  no-referrer:                   Send no Referer header at all
                                 Very restrictive — breaks analytics that use referrer for attribution
  
  no-referrer-when-downgrade:    Old default — send full URL to HTTPS, nothing to HTTP
                                 Still leaks paths to HTTPS third parties
  
  strict-origin:                 Send only the origin (domain) — never the path or query string
                                 https://bank.com/account/9876 → Referer: https://bank.com
  
  strict-origin-when-cross-origin:  RECOMMENDED — same origin gets full URL; cross-origin gets only origin
                                    Allows your own analytics to see full URLs; third parties only see domain
  
  origin:                        Always send only origin, even within same-site navigation
  
  unsafe-url:                    Always send full URL — worst option — never use in production

Best practice:
  Referrer-Policy: strict-origin-when-cross-origin
  ├── Your own Google Analytics (same setup) or server-side analytics still works
  ├── Third-party CDNs, fonts, ad networks only see the origin (not the path)
  └── Cross-site navigation doesn't leak URL path information
```

### Permissions-Policy (formerly Feature-Policy)

```
Header: Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()

Controls which browser APIs the page (and embedded iframes) can access:
  camera=()          → No JS on this page can request camera access
  microphone=()      → No JS on this page can request microphone access
  geolocation=()     → No JS can call navigator.geolocation.getCurrentPosition()
  payment=()         → No Payment Request API
  accelerometer=()   → No device motion data
  autoplay=(self)    → Video autoplay: only same-origin allowed
  fullscreen=(self)  → Only same-origin can go fullscreen

Why this matters:
  Your page might include 10 third-party scripts: analytics, chat widget, A/B testing,
  cookie consent, ReCaptcha, social share buttons, customer support widget...
  
  Without Permissions-Policy:
  ANY of these scripts can call navigator.geolocation.getCurrentPosition()
  That tracks the user's location for that third party's purposes
  
  With Permissions-Policy: geolocation=()
  The browser rejects any geolocation request regardless of which script makes it
  Total protection against third-party API abuse on your page

For iframes:
  Permissions-Policy applies to iframes — embedded forms, payment widgets, video players
  frame.allow attribute on the iframe element grants specific permissions to that frame:
  <iframe src="payment.3rdparty.com" allow="payment">
  All other APIs remain restricted for that iframe
```

### X-XSS-Protection — Why to Disable It

```
Header: X-XSS-Protection: 0  (DISABLE it)

History:
  Browser built-in XSS filter was introduced in IE8 (2008)
  Microsoft's attempt to detect and block reflected XSS
  
The problem: the filter itself had vulnerabilities
  Security researchers discovered that X-XSS-Protection: 1 mode=block could be used
  to CAUSE XSS in some scenarios — the filter could be triggered on legitimate content, 
  creating injection opportunities that wouldn't exist without the filter
  
  CVE-2019-9205 and similar: XSS via X-XSS-Protection filter bypass

Current state:
  Chrome removed it in Chrome 78 (2019)
  Firefox never implemented it
  Only Edge Legacy and IE still honour it
  Safari dropped support
  The header is effectively retired
  
The right configuration:
  X-XSS-Protection: 0
  → Explicitly disables the filter in the browsers that still support it (IE/Edge Legacy)
  → Prevents potential XSS-via-filter attacks
  → Modern protection is Content-Security-Policy (Topic 178)
  
Do NOT set: X-XSS-Protection: 1 or X-XSS-Protection: 1; mode=block
  The filter is dangerous in the browsers that honour it
```

---

## 4. The Code

### Wrong Way — No Security Headers (Spring Boot Default)
```java
// Default Spring Boot — no security headers configured beyond the basics
// Response headers will be: Content-Type, Date, Transfer-Encoding, Connection
// Missing: HSTS, X-Frame-Options proper config, X-Content-Type, Referrer-Policy, Permissions-Policy

@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
        .formLogin(withDefaults());
    // No .headers() block → browser has no security instructions
    return http.build();
}
```

```java
// Also wrong: adding X-XSS-Protection: 1 (enables the dangerous filter)
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http
        .headers(headers -> headers
            .xssProtection(xss -> xss
                .headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK)
                // This sets X-XSS-Protection: 1; mode=block
                // The XSS filter has known security vulnerabilities — should be DISABLED
            )
        );
    return http.build();
}
```

> **Why this fails in production:** Without HSTS, a user who types `http://bank.com` might be SSL-stripped by an attacker on the same WiFi. Without X-Frame-Options, clicking on an attacker's innocent-looking webpage might secretly perform actions on your authenticated site through a transparent iframe. These aren't theoretical — clickjacking and SSL stripping are well-documented real-world attacks. Missing security headers is OWASP A05: Security Misconfiguration.

### Right Way — All Six Headers in Spring Security

```java
@Configuration
@EnableWebSecurity
public class SecurityHeadersConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/public/**").permitAll()
                .anyRequest().authenticated()
            )
            .headers(headers -> configureSecurityHeaders(headers));

        return http.build();
    }

    private void configureSecurityHeaders(HeadersConfigurer<HttpSecurity> headers) {
        headers
            // 1. HSTS — Strict Transport Security
            .httpStrictTransportSecurity(hsts -> hsts
                .maxAgeInSeconds(31536000)           // 1 year — browser caches HTTPS-only rule
                .includeSubDomains(true)             // Covers api.company.com, cdn.company.com etc.
                .preload(true)                       // Eligible for HSTS preload list submission
            )

            // 2. X-Frame-Options — anti-clickjacking (keep for legacy browser support)
            .frameOptions(frame -> frame.deny())     // X-Frame-Options: DENY

            // 3. X-Content-Type-Options — prevent MIME sniffing
            .contentTypeOptions(withDefaults())      // X-Content-Type-Options: nosniff

            // 4. X-XSS-Protection — DISABLE the old XSS filter
            .xssProtection(xss -> xss
                .headerValue(XXssProtectionHeaderWriter.HeaderValue.DISABLED)
                // Sets X-XSS-Protection: 0
            )

            // 5. Referrer-Policy
            .referrerPolicy(referrer -> referrer
                .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                // Referrer-Policy: strict-origin-when-cross-origin
            )

            // 6. Content-Security-Policy (with frame-ancestors covering X-Frame-Options for modern browsers)
            .contentSecurityPolicy(csp -> csp
                .policyDirectives(
                    "default-src 'self'; " +
                    "script-src 'self'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data: https:; " +
                    "font-src 'self' https://fonts.gstatic.com; " +
                    "connect-src 'self'; " +
                    "frame-ancestors 'none'; " +   // Modern replacement for X-Frame-Options
                    "object-src 'none'; " +
                    "base-uri 'self'; " +
                    "form-action 'self'; " +
                    "upgrade-insecure-requests; " +
                    "report-uri /csp-violations"
                )
            );

        // Permissions-Policy — Spring Security doesn't have built-in support (as of Spring Security 6.x)
        // Add via a custom filter or a response wrapper
    }
}
```

**Permissions-Policy — via custom filter (Spring Security 6.x lacks built-in support):**
```java
// Spring Security 6.x does not have a built-in PermissionsPolicy configurator
// Add it via a servlet filter

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class PermissionsPolicyFilter extends OncePerRequestFilter {

    private static final String PERMISSIONS_POLICY =
        "camera=(), " +           // No camera access for any script on this page
        "microphone=(), " +       // No microphone access
        "geolocation=(), " +      // No location access
        "payment=(), " +          // No Payment Request API (unless you specifically need it)
        "usb=(), " +              // No USB device access
        "magnetometer=(), " +     // No compass/magnetometer access
        "accelerometer=(), " +    // No device motion
        "gyroscope=()";           // No device orientation

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        response.setHeader("Permissions-Policy", PERMISSIONS_POLICY);
        filterChain.doFilter(request, response);
    }
}
```

**Additional: Cache-Control for sensitive pages:**
```java
// Sensitive pages (account details, payment history) should not be cached by browser
// Prevents data leakage if device is shared or sold
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class SensitiveCacheControlFilter extends OncePerRequestFilter {

    private static final List<String> SENSITIVE_PATHS = List.of(
        "/account", "/payment", "/profile", "/admin"
    );

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        boolean isSensitive = SENSITIVE_PATHS.stream().anyMatch(path::startsWith);

        if (isSensitive) {
            response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
            response.setHeader("Pragma", "no-cache");       // HTTP/1.0 compatibility
            response.setIntHeader("Expires", 0);
        }

        filterChain.doFilter(request, response);
    }
}
```

**Verify headers — integration test:**
```java
// Spring Boot integration test to verify all security headers are present
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class SecurityHeadersIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser
    void allSecurityHeadersPresent() throws Exception {
        mockMvc.perform(get("/dashboard"))
            .andExpect(header().string(
                "Strict-Transport-Security",
                "max-age=31536000 ; includeSubDomains ; preload"))
            .andExpect(header().string(
                "X-Frame-Options", "DENY"))
            .andExpect(header().string(
                "X-Content-Type-Options", "nosniff"))
            .andExpect(header().string(
                "X-XSS-Protection", "0"))
            .andExpect(header().string(
                "Referrer-Policy", "strict-origin-when-cross-origin"))
            .andExpect(header().exists("Content-Security-Policy"))
            .andExpect(header().exists("Permissions-Policy"));
    }

    @Test
    @WithMockUser
    void cspContainsFrameAncestorsNone() throws Exception {
        mockMvc.perform(get("/dashboard"))
            .andExpect(header().string(
                "Content-Security-Policy",
                containsString("frame-ancestors 'none'")));
    }

    @Test
    @WithMockUser
    void cspContainsNoUnsafeInlineForScripts() throws Exception {
        MvcResult result = mockMvc.perform(get("/dashboard")).andReturn();
        String csp = result.getResponse().getHeader("Content-Security-Policy");
        // Verify script-src does NOT contain 'unsafe-inline'
        assertThat(csp).doesNotContain("script-src 'unsafe-inline'");
        assertThat(csp).doesNotContain("script-src * 'unsafe-inline'");
    }
}
```

**Complete header output — what the response should look like:**
```
HTTP/1.1 200 OK
Content-Type: text/html;charset=UTF-8
Strict-Transport-Security: max-age=31536000 ; includeSubDomains ; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests; report-uri /csp-violations
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=()
```

> **Key decisions here:**
> - Both `X-Frame-Options: DENY` AND CSP `frame-ancestors 'none'` simultaneously — not redundant; they cover different browser versions; `X-Frame-Options` is respected by IE11 and many mobile browsers that don't support CSP `frame-ancestors`
> - `X-XSS-Protection: 0` — explicitly disable the old filter; setting it to 1 or omitting it enables an insecure, deprecated feature; `0` explicitly turns it off even in IE/Edge Legacy
> - Permissions-Policy requires a custom filter in Spring Security 6.x (no built-in API); keep the permissions list restrictive — only grant permissions the application actually uses
> - Write automated tests for security headers — this catches regressions when the security config is modified for new feature work; easily forgotten otherwise

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is clickjacking and how does X-Frame-Options prevent it?"

**Hruday's answer:**
> Clickjacking is a UI redress attack. An attacker creates a webpage that embeds your application in a transparent or low-opacity iframe. They place their own content — "Click here to win a prize!" — underneath the invisible iframe. When the user clicks what they think is the attacker's button, they're actually clicking on your application content inside the hidden iframe — potentially confirming a transaction, accepting a permission, or submitting a form on your app — without any awareness.
>
> `X-Frame-Options: DENY` prevents this by instructing the browser to refuse to render the page inside any iframe at all. The browser checks this header when processing an iframe `src` attribute. If the `src` page responds with `X-Frame-Options: DENY`, the browser renders nothing in the iframe — the attacker's page shows a blank box instead of your application. The attack fails.
>
> `SAMEORIGIN` is the alternate value — your application can be embedded in an iframe from your own domain (useful for dashboards or micro-frontends) but not from any external domain.
>
> The modern equivalent is the CSP `frame-ancestors` directive — `frame-ancestors 'none'` has the same effect as `DENY`. Both should be set simultaneously: `frame-ancestors` for modern browsers; `X-Frame-Options` as fallback for IE11 and older mobile browsers that don't support CSP `frame-ancestors`.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain the difference between HSTS and just redirecting HTTP to HTTPS."

**Hruday's answer:**
> Redirecting HTTP to HTTPS is important — a request to `http://` gets a 301 response pointing to `https://`. But there's a vulnerability window: the initial HTTP request itself is sent in plaintext before the redirect is received. An attacker on the same network — public WiFi, compromised router — can intercept that first HTTP request and perform SSL stripping: they respond to the user's browser with a plain HTTP page that proxies the HTTPS content, and the user never gets redirected to HTTPS at all. From the user's perspective, the page loads; they never notice it's HTTP. Every request they make, including authentication, is visible to the attacker.
>
> HSTS eliminates this window. After the first HTTPS response with `Strict-Transport-Security: max-age=31536000`, the browser caches this rule for a year. The browser now knows: for this domain, always use HTTPS, even before making any request. If the user types `http://bank.com`, the browser converts it to `https://bank.com` internally — no HTTP request ever leaves the device. The SSL-stripping attack fails because there's no HTTP request for the attacker to intercept.
>
> There's still a first-visit vulnerability: the very first HTTPS response sets the HSTS header, but the very first visit might be HTTP. HSTS preloading solves this — the domain is baked into the browser binary's preload list; the browser knows to use HTTPS for that domain even on the first ever visit, before any HTTP request. Submitting to `hstspreload.org` opts into this list, but it's hard to undo, so it should only be done when you're fully committed to HTTPS for all subdomains.

---

### Q3 — Production Context
**Interviewer asks:** "How did you implement and audit security headers in your production Spring Boot services?"

**Hruday's answer:**
> At SAP, security headers were configured centrally in the Spring Security `SecurityFilterChain` `headers()` block, and the configuration was shared across all services through our internal security starter POM — a parent dependency that all services included. This ensured consistency: every service automatically got all 6 headers without each team needing to configure them individually.
>
> The specific configuration: HSTS with `max-age=31536000; includeSubDomains`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP with `frame-ancestors 'none'` (complementing `X-Frame-Options`), and `X-XSS-Protection: 0`. Permissions-Policy was added via a custom `OncePerRequestFilter` since Spring Security 6.x doesn't have a built-in configurator for it yet.
>
> For audit: we used `securityheaders.com` to scan each production endpoint and verify the presence and correct configuration of all headers. When we did our initial audit, we found that some older services running on a different security config version were missing `Referrer-Policy`. The shared starter fixed that discrepancy.
>
> We also wrote a suite of Spring Boot integration tests using `MockMvc` that checked the presence of each security header on responses from authenticated endpoints. These tests ran on every PR build — if anyone modified the security config and accidentally removed a header, the test would catch it immediately. This was the automation that kept the headers stable across 18 months of iterative feature work.

---

### Q4 — Scenario
**Interviewer asks:** "How would you handle a security headers audit request from enterprise customers? They want a report on your application's HTTP response headers."

**Hruday's answer:**
> Enterprise customers requesting a security headers audit typically want confirmation of: HSTS, X-Frame-Options (or CSP frame-ancestors), X-Content-Type-Options, Referrer-Policy, CSP score, and X-XSS-Protection set to 0.
>
> The practical steps: first, run `securityheaders.com` against the production endpoint — it produces a grade (A+ to F) and itemises which headers are present, which are missing, and flags any configurations that are insecure. This is the quickest way to get a snapshot. The report is shareable — customers can run it themselves or you can email it.
>
> If we're running correctly, we should see an A or A+ grade. Any gaps show up clearly — fix them in the Spring Security config, redeploy, verify the grade improved.
>
> For a more formal report: use OWASP ZAP or Nessus, which both have passive scans for security headers; they produce structured findings tied to OWASP categories and CVE references. These are acceptable to most enterprise procurement security review processes.
>
> Proactively for customers who haven't asked yet: include the expected header configuration in your security documentation and your responsible disclosure policy. When customers run their own security scans (they will), seeing the headers already present is a positive signal that reduces procurement friction.
>
> And ongoing monitoring: a synthetic monitoring check that hits the production URL, parses the response headers, and alerts if any required header disappears — catches misconfiguration regression before any customer audit does.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| X-XSS-Protection: 1 | "Enable X-XSS-Protection to protect against XSS" | Set it to 0 — the old XSS filter is deprecated, has known exploitation vectors, and is removed from modern browsers; modern CSP is the replacement; enabling the old filter can be harmful |
| ALLOW-FROM in X-Frame-Options | "Use X-Frame-Options: ALLOW-FROM to whitelist specific domains" | `ALLOW-FROM` is deprecated and ignored by all modern browsers (Chrome, Firefox never supported it); use CSP `frame-ancestors 'self' https://trusted.com` for domain whitelisting in modern browsers |
| Referrer-Policy: no-referrer | "Set no-referrer to maximally protect privacy" | `no-referrer` breaks server-side analytics, referral attribution, and some third-party integrations; `strict-origin-when-cross-origin` is the right balance — full URL for same-origin, only origin for cross-origin |
| Permissions-Policy is optional | "Permissions-Policy is for app features, not security" | Third-party scripts on your page can use browser APIs without Permissions-Policy; a malicious or compromised ad network script can request geolocation from your domain without your knowledge; Permissions-Policy is a defence-in-depth control |

---

## 7. Hruday's Real Experience Hook
> "At SAP, security headers were part of both our development baseline and our compliance posture. We ran regular security header audits using `securityheaders.com` and OWASP ZAP as part of our quarterly security review cycle. I standardised the Spring Security headers configuration into a shared security starter module that all Spring Boot services imported — this eliminated per-service variation and ensured that new services launched with correct headers from day one. The shared configuration included all six headers: HSTS, X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy (strict-origin-when-cross-origin), X-XSS-Protection (0), and CSP with frame-ancestors. Permissions-Policy was added via a custom filter covering camera, microphone, geolocation, and payment. I also built integration tests that validated header presence on every PR build — when someone once changed the security config to enable CORS for a new integration and accidentally suppressed the frame-options header, the test caught it before the PR merged. These tests became the most valuable part of our security header posture because they didn't rely on anyone remembering to run a manual audit."

---

## 8. Scale Evolution

**1,000 users/day →** Configure all 6 headers in Spring Security `headers()`. Run `securityheaders.com` to verify grade. This takes 2-3 hours and provides immediate broad protection. Write one integration test to detect regression.

**100,000 users/day →** Centralise the security header configuration in a shared module (Spring Boot auto-configure starter) so all services inherit it consistently. Automate `securityheaders.com` grade check or OWASP ZAP passive scan in the CI/CD pipeline. Alert on any production header regression via synthetic monitoring.

**10 million users/day →** HSTS preloading (submit domain to `hstspreload.org` after full HTTPS commitment). Customised Permissions-Policy per service based on actual API usage — payment flow might need `payment` allowed; other services keep it blocked. Certificate Transparency logs monitored for unexpected certificates for your domain (complements HSTS). `Report-To` header and Network Error Logging for infrastructure-level visibility into HSTS failures and certificate errors. Automated security header scoring in the release pipeline — deploys that reduce the CSP evaluator grade are rejected.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | PCI-DSS Requirement 6.3: system components handling cardholder data must be protected against known vulnerabilities; missing HSTS on a payment page is a PCI-DSS finding; `X-Frame-Options: DENY` on checkout prevents card skimming via clickjacking | Know the PCI-DSS framing; know HSTS first-visit vulnerability and preloading |
| Swiggy / Meesho | Consumer WAF rules often include security header compliance; customer data protection (PDPB) requires appropriate technical measures; missing `Referrer-Policy` causes user browsing history to leak to third-party analytics | Know the referrer leakage scenario; `strict-origin-when-cross-origin` rationale |
| Adobe / Microsoft | Enterprise security assessments are a standard part of sales — enterprise buyers run OWASP ZAP and security headers scans before purchasing; missing headers are blockers in procurement; also both companies have products used by regulated industries | Know all 6 headers fluently; know how to produce a formal audit report; know `securityheaders.com` and ZAP |
| SAP Labs | SAP's enterprise customers have security review requirements; SAP's own internal security baseline mandates specific header configurations; pen tests against SAP products regularly test for missing headers; misconfigurations delay certifications and customer go-lives | Know the shared-starter pattern for enterprise-wide enforcement; know integration test strategy for header regression detection |

---

## 10. Related Topics — What to Study Next

- **Topic 178 — CSP Implementation** — `frame-ancestors` in the CSP directive is the modern replacement for `X-Frame-Options`; CSP is the most powerful of all the security headers; Topics 178 and 179 are designed to be studied together as a complete security headers bundle
- **Topic 175 — HTTPS/TLS** — HSTS in this topic directly extends TLS; the full HSTS story (SSL stripping, preloading, certificate transparency) is in Topic 175
- **Topic 165 — XSS** — `X-XSS-Protection: 0`, `X-Content-Type-Options`, and CSP all address XSS vectors; understanding the attack makes the header values intuitive rather than memorised
- **Tool: securityheaders.com** — free, paste any URL, gets a grade and reports on every header; also shows what values other sites use; run it on 5 production URLs to build intuition for common configurations; run it on your own projects immediately
- **Tool: OWASP ZAP** — open-source; passive scan mode analyses security headers without attacking; produces structured findings with OWASP references; essential for professional-grade security auditing

---

*Part 10 · Secure Headers Audit — HSTS, X-Frame-Options, Referrer-Policy · Full Stack Interview Guide · Hruday D · 2026*
