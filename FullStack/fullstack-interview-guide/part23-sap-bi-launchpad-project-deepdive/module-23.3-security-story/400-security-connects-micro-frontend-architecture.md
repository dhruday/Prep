# Security Connects to Micro-Frontend Architecture
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.3: The Security Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Why micro-frontends create new security surface**: 4 separate teams each own a CDN-hosted JavaScript bundle; the shell loads all of them at runtime; if any bundle is compromised, the attacker's code runs inside the shell tab with full access to the session
- **CSP in a micro-frontend**: each team's CDN subdomain must be in `script-src`; without this, the browser refuses to load the remote bundle; maintaining this central CSP list is the shell team's job
- **JWT story**: one token, four modules; storing it in `localStorage` means any of the four bundles (and any of their dependencies) can read it; `httpOnly` cookie means only the server can see it — none of the four bundles can access it directly
- **SRI (Subresource Integrity)**: `integrity="sha384-..."` on each `<script>` tag; if Team A's CDN is compromised and the file is swapped for a malicious one, the browser rejects it because the hash doesn't match; this is the defence against CDN supply chain attack
- **Dependency isolation**: each team has its own `node_modules`; a critical CVE in Team A's lodash doesn't affect Teams B, C, D; this is a security benefit of micro-frontends over a single monolith where all teams share one `node_modules`
- **One logout endpoint**: shell fires `USER_LOGGED_OUT` on the event bus; all four modules clear their state; the `httpOnly` cookie is cleared server-side; this ensures logout is complete across all modules — not a partial logout where one module still holds state

---

## 1. One-Line Definition
In a micro-frontend, the security attack surface expands because multiple independent JavaScript bundles load into one tab — the security model must treat each bundle as a potential vector and protect the shared session token, the module loading process, and the cross-module communication channel.

---

## 2. The Expanded Attack Surface

```
MONOLITH SECURITY SURFACE:
  One bundle, one CDN, one codebase
  A CVE in one dependency affects one codebase
  One team responsible

MICRO-FRONTEND SECURITY SURFACE:
  Shell (React + Redux)
    └─ loads remoteEntry.js from Team A CDN (SAP UI5 reports module)
    └─ loads remoteEntry.js from Team B CDN (React dashboards module)
    └─ loads remoteEntry.js from Team C CDN (Next.js analytics module)
    └─ loads remoteEntry.js from Team D CDN (React admin module)

  Each CDN is a separate origin: a separate attack vector
  A compromised CDN → malicious JS runs inside the shell tab
  The malicious JS has access to:
    - document.cookie (if not HttpOnly)
    - localStorage / sessionStorage (completely readable)
    - Any DOM element
    - Any XHR/fetch request the module makes
    - The shell event bus
```

---

## 3. The Three Security Layers Added for Micro-Frontend

```
LAYER 1: CSP WITH ALL REMOTE ORIGINS
──────────────────────────────────────────────────────────────────
Content-Security-Policy:
  default-src 'self';
  script-src
    'self'
    https://cdn-teama.bi.sap.com     ← Team A SAP UI5 module
    https://cdn-teamb.bi.sap.com     ← Team B React dashboards
    https://cdn-teamc.bi.sap.com     ← Team C Next.js analytics
    https://cdn-teamd.bi.sap.com     ← Team D admin
    'nonce-{request-nonce}';         ← for inline event handlers
  style-src 'self' 'unsafe-hashes';
  img-src 'self' data: https://*.sap.com https://*.s3.amazonaws.com;
  connect-src 'self' https://api.bi.sap.com;
  frame-ancestors 'none';
  report-uri /csp-violations;

If ANY bundle is served from a CDN not in this list,
the browser refuses to execute it.
The shell team owns this file and reviews it when a team's CDN changes.

──────────────────────────────────────────────────────────────────
LAYER 2: SRI ON EACH MODULE SCRIPT TAG
──────────────────────────────────────────────────────────────────
// In shell's webpack-generated HTML / module loader:
const loadRemoteEntry = (url, integrity) => {
  const script = document.createElement('script');
  script.src = url;
  script.integrity = integrity;       // sha384 hash of the known-good file
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
};

// Called during app bootstrap:
loadRemoteEntry(
  'https://cdn-teama.bi.sap.com/remoteEntry.v2.3.1.js',
  'sha384-abc123...'     // stored in shell's build artifact — updated per release
);

What this prevents:
  CDN is compromised → attacker swaps remoteEntry.js for malicious version
  Browser computes sha384 of the downloaded file
  Hash doesn't match the integrity attribute
  Browser refuses to execute the script
  Error is logged to CSP report endpoint
  On-call is alerted

──────────────────────────────────────────────────────────────────
LAYER 3: SESSION TOKEN — ONE PLACE, NOT READABLE BY ANY MODULE
──────────────────────────────────────────────────────────────────
// Spring Boot — login endpoint response:
ResponseCookie jwtCookie = ResponseCookie
    .from("jwt", token)
    .httpOnly(true)     // JS cannot read this — not localStorage
    .secure(true)       // HTTPS only
    .sameSite("Strict") // no cross-site requests carry the token
    .path("/api")       // cookie only sent to /api, not to CDN requests
    .maxAge(Duration.ofHours(8))
    .build();

// Frontend — all four modules use credentials: 'include' in fetch:
fetch('/api/reports', {
  credentials: 'include'   // browser sends the httpOnly cookie automatically
  // no Authorization header — no JS code touches the token
});

// RESULT: even if Team A's bundle is compromised, the malicious code
// cannot read the JWT. It can make requests to /api with the cookie
// (CSRF risk — mitigated by SameSite=Strict), but it cannot exfiltrate
// the raw token.
```

---

## 4. Cross-Module Communication — Security Boundary

```
WRONG WAY ❌ — Global window state:
  window.currentUser = { id: '...', roles: ['ADMIN'] };
  // Any module (or injected script) reads and modifies this

RIGHT WAY ✅ — Typed event bus owned by shell:
  // Shell defines the event bus contract:
  type ShellEvent =
    | { type: 'USER_LOGGED_OUT' }
    | { type: 'THEME_CHANGED'; theme: 'light' | 'dark' }
    | { type: 'USER_CONTEXT'; user: UserContext };

  class ShellEventBus {
    private handlers: Map<string, Set<Function>> = new Map();
    emit<T extends ShellEvent>(event: T) { /* ... */ }
    on<T extends ShellEvent['type']>(type: T, handler: Function) { /* ... */ }
  }

  // Only shell exposes the bus — via a provided React context, not window
  // Remote modules import the type contract, not the window object

LOGOUT FLOW — COMPLETE ACROSS ALL 4 MODULES:
  User clicks "Logout" in shell header
  ↓
  Shell calls DELETE /api/session (server clears httpOnly cookie)
  ↓
  Server responds with Set-Cookie: jwt=; Max-Age=0   (cookie deleted)
  ↓
  Shell fires: eventBus.emit({ type: 'USER_LOGGED_OUT' })
  ↓
  All 4 modules receive the event
  ↓
  Each module clears its own Redux/Zustand store and navigates to /
  ↓
  Result: no module holds stale user data in memory
```

---

## 5. Interview Questions & Model Answers

### Q1 — Architecture Link
**Interviewer asks:** "How does your security approach differ because you used micro-frontends instead of a single React app?"

**Hruday's answer:**
> "Three differences. First, the CSP needs to list all four team CDN domains explicitly — in a monolith there's one origin. If a new module is added or a CDN domain changes, the security team reviews the update. Second, we added SRI integrity hashes to each remote entry script. If any CDN is compromised and the file is swapped, the browser rejects it — this is a supply chain attack defence that a monolith doesn't need because there's only one bundle. Third, the session token design becomes critical. With four independent JavaScript bundles running in one tab, storing JWT in localStorage means any of those four bundles — and their entire dependency trees — can read the token. So we moved to an httpOnly cookie. None of the four modules can read it in JavaScript. They just send credentials: 'include' in every API call and the browser attaches the cookie automatically."

---

### Q2 — Hard Detail
**Interviewer asks:** "What happens if one micro-frontend team accidentally introduces a vulnerable dependency? Does that affect all teams?"

**Hruday's answer:**
> "No — and this is actually a security advantage of the micro-frontend approach over a monolith. Each team has its own package.json and node_modules. A critical CVE in a dependency used only by Team A's bundle doesn't affect Teams B, C, D. In a monolith with a shared package.json, the same CVE would affect everyone and stall everyone's deployment. The isolation is real. What we made sure is that each team's CI pipeline runs npm audit --audit-level=critical before building. So Team A's vulnerability is caught before their bundle reaches the CDN. The shell team doesn't need to know about Team A's dependency choices. Each team owns their security posture independently, with the CI gate as the enforcement mechanism."

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| CSP in micro-frontend | "We just use CSP like any app" | "Each of the four team CDN domains is in script-src; the shell team owns this file; a CDN domain change requires a CSP update reviewed by security" |
| JWT across modules | "We store the token and share it" | "httpOnly cookie — none of the four module bundles can read the token; credentials: 'include' in fetch; SameSite=Strict prevents CSRF" |
| CDN compromise risk | No mention | "SRI integrity hash on each remoteEntry.js; compromised CDN file → browser rejects execution → CSP report triggered → on-call alerted" |
| Logout completeness | "User clicks logout, done" | "Shell fires USER_LOGGED_OUT event on the bus; all four modules clear their state; server clears the httpOnly cookie; no module holds stale user data" |

---

## 7. Hruday's Real Experience Hook

> "The security audit picked up a gap we hadn't thought about: we had CSP configured, but it was missing Team C's analytics CDN domain because they had just migrated to a new CDN. Their module was loading successfully only because CSP was in report-only mode. When we switched to enforce mode, Team C's module was blocked. That's exactly what report-only mode is for — two weeks of catching gaps before enforcement. That gap also showed us we needed a process: every CDN domain change requires a pull request to the shell's CSP configuration file, reviewed by the security-aware maintainer. We added that as a documented requirement in the team agreement."

---

## 8. Scale Evolution

**4 teams →** CSP with 4 CDN domains. SRI on remoteEntry. httpOnly cookie. Event bus logout.

**20 teams →** CSP policy becomes a managed configuration file with automated validation. SRI hash generation is automated in each team's CI. CSP violation dashboard (real-time view of report-uri data).

**100 teams →** Module federation manifest validated against allowed CDN domains at deploy time. Security team approves CDN additions as part of an RFC process. Automated SBOM (Software Bill of Materials) per team's bundle for CVE tracking.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment apps with micro-frontends need bulletproof token security — any JS readable token is a critical risk | httpOnly cookie + SameSite=Strict story; SRI for CDN supply chain protection |
| Swiggy / Meesho | Multiple teams shipping independent modules; dependency isolation prevents one team's CVE from blocking others | npm audit CI gate per team; dependency isolation advantage |
| Adobe / Microsoft | Enterprise products deployed as micro-frontend platforms; CSP management at scale is a product feature | CSP governance process; automated SRI generation; module manifest validation |
| SAP Labs | You built this — CSP with 4 CDN subdomains, SRI, httpOnly cookie, event bus logout, dependency isolation per team | The candidate who designed all four layers of this, not just read about them |

---

*Part 23 · Security Connects to Micro-Frontend Architecture · Full Stack Interview Guide · Hruday D · 2026*
