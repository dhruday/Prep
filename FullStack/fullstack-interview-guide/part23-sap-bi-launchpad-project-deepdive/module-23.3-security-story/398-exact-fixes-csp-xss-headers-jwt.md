# What You Implemented — The Exact Security Fixes
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.3: The Security Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Fix 1 — XSS**: replaced every `innerHTML` assignment with `textContent` or React JSX; added DOMPurify for the one place that genuinely needed HTML rendering (rich-text report descriptions); banned `innerHTML` via ESLint custom rule that fails PRs
- **Fix 2 — Security headers**: added CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy as HTTP response headers in the Spring Boot gateway; started in report-only mode for CSP (logs violations without blocking) then moved to enforce mode after 2 weeks
- **Fix 3 — JWT in httpOnly cookies**: moved token storage from `localStorage.setItem('jwt', token)` to server-side `Set-Cookie: jwt=...; HttpOnly; Secure; SameSite=Strict`; the browser sends the cookie automatically on every request; JavaScript never has access to the token value
- **Fix 4 — npm CVEs**: ran `npm audit fix` for patch-level fixes; manually upgraded lodash to 4.17.21 for the critical prototype pollution CVE; added `npm audit --audit-level=critical` to CI pipeline — blocks builds with any new critical CVE
- **The CSP implementation challenge in micro-frontends**: each team's module bundle is hosted on a different CDN subdomain; the CSP must list all of them in `script-src`; we used `nonce`-based CSP for the inline event handlers in legacy components rather than `unsafe-inline`
- **The ESLint rules were the force multiplier**: they prevented regressions without requiring code reviews to catch everything; every engineer gets immediate feedback when they write dangerous code

---

## 1. One-Line Definition
The security fixes addressed each vulnerability class: DOMPurify + ESLint ban for XSS, security headers in the gateway for policy enforcement, httpOnly cookies for token storage, and npm audit CI gates for dependency CVEs.

---

## 2. Fix 1 — XSS Remediation

```typescript
// ❌ BEFORE — innerHTML renders script tags
class ReportThumbnail {
  render(report: Report) {
    const div = document.createElement('div');
    div.innerHTML = report.name;  // ← Stored XSS entry point
    return div;
  }
}

// ✅ FIX A — Switch to textContent (for plain text; no HTML needed)
class ReportThumbnail {
  render(report: Report) {
    const div = document.createElement('div');
    div.textContent = report.name;  // textContent treats content as plain text
    return div;                      // Script tags become literal text, not executed
  }
}

// ✅ FIX B — DOMPurify for the one place that needs HTML (rich text descriptions)
import DOMPurify from 'dompurify';

function ReportDescription({ htmlContent }: { htmlContent: string }) {
  const sanitised = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'li'],
    ALLOWED_ATTR: [],  // No attributes at all — blocks event handlers and href="javascript:"
  });
  
  return (
    <div dangerouslySetInnerHTML={{ __html: sanitised }} />
    // After DOMPurify: any <script> tags, onerror attributes, javascript: hrefs
    // are stripped before rendering. Only safe tags listed above survive.
  );
}
```

```javascript
// ✅ FIX C — ESLint rule to prevent future innerHTML regressions
// .eslintrc.js
module.exports = {
  rules: {
    // Custom rule: block all innerHTML assignments
    'no-restricted-properties': ['error', {
      object: 'element',
      property: 'innerHTML',
      message: 'Use textContent or React JSX. If HTML is required, use DOMPurify first. See security-guide.md.',
    }],
    // Ban dangerouslySetInnerHTML in React unless preceded by DOMPurify call
    // (enforced by custom ESLint plugin in internal packages)
    '@sap-bi/no-unsanitised-html': 'error',
  },
};
// Result: any PR that introduces innerHTML fails CI immediately
// No security review needed — the tool catches it at the keyboard
```

---

## 3. Fix 2 — HTTP Security Headers in the Gateway

```java
// Spring Boot API Gateway — SecurityHeadersFilter.java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletResponse response = (HttpServletResponse) res;
        
        // 1. Content Security Policy
        // script-src lists every CDN domain serving JS bundles
        // nonce-based for inline scripts (each request gets a unique nonce)
        String nonce = generateRandomNonce();
        request.setAttribute("cspNonce", nonce);
        response.setHeader("Content-Security-Policy",
            "default-src 'self'; " +
            "script-src 'self' 'nonce-" + nonce + "' " +
            "https://cdn.sap.com " +                    // SAP CDN for module bundles
            "https://fonts.googleapis.com; " +          // Google Fonts
            "style-src 'self' 'nonce-" + nonce + "' https://fonts.googleapis.com; " +
            "img-src 'self' data: https://cdn.sap.com; " +
            "connect-src 'self' https://api.sap.com; " +
            "frame-ancestors 'none'; " +                // Prevents clickjacking
            "base-uri 'self'; " +                       // Prevents base tag injection
            "form-action 'self'"
        );
        
        // 2. HSTS — browser enforces HTTPS for 2 years; include subdomains
        response.setHeader("Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload");
        
        // 3. Prevent clickjacking (belt AND suspenders with frame-ancestors in CSP)
        response.setHeader("X-Frame-Options", "DENY");
        
        // 4. Prevent MIME type sniffing
        response.setHeader("X-Content-Type-Options", "nosniff");
        
        // 5. Referrer — only send origin, not full URL with query params, on cross-origin
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        
        // 6. Permissions — disable browser features the app doesn't need
        response.setHeader("Permissions-Policy",
            "camera=(), microphone=(), geolocation=(), payment=()");
        
        chain.doFilter(req, res);
    }
    
    private String generateRandomNonce() {
        byte[] nonceBytes = new byte[16];
        new SecureRandom().nextBytes(nonceBytes);
        return Base64.getEncoder().encodeToString(nonceBytes);
    }
}
```

---

## 4. Fix 3 — JWT from localStorage to httpOnly Cookies

```java
// BEFORE — JWT returned in response body, stored in localStorage by frontend
// After OAuth callback, User Service sent:
// { "access_token": "eyJ...", "refresh_token": "eyJ..." }
// Frontend stored: localStorage.setItem('jwt', accessToken)

// AFTER — User Service sets httpOnly cookie directly
@PostMapping("/auth/token")
public ResponseEntity<Void> exchangeCode(@RequestBody TokenRequest request,
                                          HttpServletResponse response) {
    TokenPair tokens = authService.exchangeCode(request.code());
    
    // Set access token as httpOnly cookie — JavaScript cannot read this
    ResponseCookie accessCookie = ResponseCookie.from("access_token", tokens.accessToken())
        .httpOnly(true)           // JavaScript: document.cookie → empty for this cookie
        .secure(true)             // Only sent over HTTPS
        .sameSite("Strict")       // CSRF protection: only sent for same-site requests
        .path("/")                // Available for all API paths
        .maxAge(Duration.ofHours(1))
        .build();
    
    // Refresh token: httpOnly, longer TTL, stricter path
    ResponseCookie refreshCookie = ResponseCookie.from("refresh_token", tokens.refreshToken())
        .httpOnly(true)
        .secure(true)
        .sameSite("Strict")
        .path("/auth/refresh")    // Only sent to the refresh endpoint — not leaked to other APIs
        .maxAge(Duration.ofDays(30))
        .build();
    
    response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
    response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    
    // Return NO token in body — frontend stores nothing; browser manages the cookie
    return ResponseEntity.noContent().build();
}
```

```typescript
// BEFORE — frontend stored and managed the JWT
const token = localStorage.getItem('jwt');
fetch('/api/reports', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// AFTER — frontend sends nothing; browser attaches cookie automatically
// credentials: 'include' tells fetch to send cookies cross-origin (if CORS allows)
fetch('/api/reports', {
  credentials: 'include'  // Browser automatically includes the httpOnly cookie
  // No Authorization header needed
  // No localStorage access needed
  // No token management in React state
});
```

---

## 5. Fix 4 — npm CVE Remediation

```bash
# Step 1 — Audit and quantify
npm audit
# Output: 23 vulnerabilities (4 critical, 12 high, 7 moderate)

# Step 2 — Auto-fix patch-level CVEs
npm audit fix
# Fixes: 18 of 23 (patch-level upgrades, no breaking changes)
# Remaining: 5 (require major version bump)

# Step 3 — Manual upgrade for critical CVEs
npm install lodash@4.17.21       # Patches prototype pollution CVE-2019-10744
npm install moment@2.29.4        # Patches ReDoS CVE-2022-24785

# Step 4 — Verify
npm audit
# Output: 0 critical, 0 high, 3 moderate (transitive deps, no fix available yet)

# Step 5 — Add to CI pipeline (GitHub Actions)
# .github/workflows/security.yml (excerpt)
- name: Security audit
  run: npm audit --audit-level=critical
  # Exits with code 1 if any CRITICAL CVE found → blocks the PR merge
```

---

## 6. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Walk me through the most complex security fix you implemented."

**Hruday's answer:**
> "The most involved was the CSP implementation, because our micro-frontend architecture made it harder than a single-origin app. A Content Security Policy is an HTTP header that tells the browser which sources are allowed to load scripts, styles, and images. Without it, even if we fixed the XSS, the injected script could still call out to any external URL. The challenge was that we had four micro-frontend module bundles hosted on the SAP CDN, Google Fonts for typography, and a few third-party analytics scripts. Each of those origins needs to be explicitly whitelisted in the CSP. If we miss one, the browser blocks it and part of the app breaks. We started in `Content-Security-Policy-Report-Only` mode — this header logs violations to a report endpoint but doesn't block anything. We ran in report-only mode for two weeks, collected every violation, added the legitimate origins to the whitelist, and only then switched to enforce mode. That two-week window prevented a broken deployment while still moving toward full CSP enforcement. The inline event handlers in a legacy component were handled with a per-request nonce — the server generates a random nonce, adds it to the CSP header, and the HTML includes that nonce on the relevant script tags. The browser allows only scripts with the matching nonce."

---

### Q2 — Deep Dive
**Interviewer asks:** "Why is SameSite=Strict important for the auth cookie?"

**Hruday's answer:**
> "Without SameSite, a browser will attach cookies to any request going to your domain — even requests initiated from a different website. This is the basis of CSRF — Cross-Site Request Forgery. An attacker's page at `evil.com` loads an image with `src='https://api.yourapp.com/transfer?to=attacker&amount=10000'`. The browser makes that GET request and includes the user's session cookie. Your server sees a valid auth cookie and processes the transfer. With `SameSite=Strict`, the browser only sends the cookie when the request originates from your own domain. A request from `evil.com` to your API gets no cookie attached — the server sees an unauthenticated request and returns 401. Combined with `httpOnly` (XSS can't steal the cookie) and `Secure` (only sent over HTTPS), the three properties together give you strong defence against both XSS-based token theft and CSRF-based request forgery."

---

## 7. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We added security headers" | Vague | Name each header and what it prevents: CSP → XSS escalation, HSTS → HTTPS downgrade, X-Frame-Options → clickjacking |
| "We fixed XSS" | Vague | "Replaced innerHTML with textContent, added DOMPurify for rich-text, banned innerHTML via ESLint rule in CI" |
| SameSite isn't mentioned | Know httpOnly but not SameSite | "httpOnly + Secure + SameSite=Strict work as a trio — each addresses a different attack vector" |
| Didn't do report-only mode | "We deployed CSP directly" | "We ran CSP in report-only mode for two weeks — collected every violation, whitelisted legitimate sources, then enforced" |

---

## 8. Hruday's Real Experience Hook

> "The CSP report-only phase was humbling. The first week we had 142 violations per day — mostly from a third-party analytics script that was loading sub-resources from a domain we hadn't known about. Without report-only mode, switching directly to enforcement would have silently broken the analytics dashboard for two weeks before someone noticed. That two-week investment before enforcement was the cautious production-safe way to implement CSP in a complex micro-frontend environment."

---

## 9. Scale Evolution

**1,000 users →** All four fixes. CSP in enforce mode. ESLint rules in all module repos.

**100,000 users →** CSP violation reporting to a centralised endpoint — catches any misconfiguration before users report it. Dependency bot auto-PRs for npm CVE patches.

**10 million users →** WAF at CDN layer as a first-line XSS filter. Subresource integrity (SRI) hashes on CDN-hosted scripts — browser verifies the script content hasn't been tampered with. Security information and event management (SIEM) for CSP violation anomaly detection.

---

## 10. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | PCI-DSS compliance: security headers and httpOnly cookies are PCI requirements | CSP for payment pages; SameSite=Strict for transaction APIs |
| Swiggy / Meesho | User-generated content (reviews) → XSS attack surface; large user base means high-value target | DOMPurify for all UGC; ESLint ban; npm audit CI gate |
| Adobe / Microsoft | SOC2 Type II compliance; customers audit security controls before procurement | CSP report + enforce pipeline; SAST in CI as evidence of controls |
| SAP Labs | You implemented all of this — you own the CSP report-only → enforce story, the nonce implementation, the ESLint rule | Be specific: "47 → 9, CSP report-only for 2 weeks, nonce for inline scripts" |

---

*Part 23 · What You Implemented — The Exact Security Fixes · Full Stack Interview Guide · Hruday D · 2026*
