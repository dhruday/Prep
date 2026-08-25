# Chapter 3 — Project 1: SAP BI Launchpad — Deep Dive

*Memory hook: **"Legacy jQuery jungle → React island city."***

**This is the most important chapter.** 60% of your interviews will spend 30+ minutes here. Every claim on your resume comes from this project. Own every detail.

---

## 3.1 Project Overview (60-second version) ⭐

> "SAP BI Launchpad is the **web entry point** for SAP BusinessObjects — the analytics platform used by enterprise customers in 50+ countries. Think of it as a **portal**: users log in, browse folders, open Web Intelligence reports, Crystal Reports, dashboards, schedule reports, and manage permissions.
>
> When I joined in 2022, the frontend was a **10-year-old jQuery + JSP + SAPUI5** codebase. My team rebuilt it into a **React + TypeScript + Redux Toolkit** app with a **Module Federation micro-frontend** shell, backed by **Java Spring Boot microservices** exposing REST APIs."

**Users:** enterprise analysts, executives, IT admins. Thousands of daily active users across the customer base. Not consumer-scale (millions) but **enterprise-critical** — a 5-minute outage triggers CEO-level escalation.

---

## 3.2 The Problem (Why the Rewrite?)

**Before (2022):**
- Lighthouse **60**, LCP **~5s** on mid-range laptops.
- Every navigation = **full page reload** (JSP-rendered).
- **3 teams sharing one repo** — 2-week merge queues.
- **CVEs** in jQuery 1.x, older SAPUI5.
- **Zero test automation**, manual QA for every release.
- No **accessibility** — screen-reader users blocked entirely.

**Business trigger:** Two enterprise customers threatened non-renewal citing performance + a11y. Product leadership approved a 3-year modernization plan.

**My scope:** frontend architecture, migration strategy, performance, security, accessibility. Not backend, not infra.

---

## 3.3 Architecture — Draw & Explain ⭐🔥

**When an interviewer says "draw the architecture," this is the exact diagram to draw.** Practice it on paper 5 times.

```
                         ┌──────────────────────────────┐
                         │      Browser (User)          │
                         │  Chrome / Edge / Firefox     │
                         └──────────────┬───────────────┘
                                        │ HTTPS
                                        ▼
                         ┌──────────────────────────────┐
                         │   CDN (Akamai / CloudFront)  │
                         │   Static assets + edge cache │
                         └──────────────┬───────────────┘
                                        │
                                        ▼
              ┌─────────────────────────────────────────────────┐
              │      Approuter (SAP BTP / Nginx on prem)        │
              │   TLS · Auth cookie · CSP headers · rate limit  │
              └───────────┬──────────────────────────┬──────────┘
                          │                          │
                          ▼                          ▼
        ┌──────────────────────────┐   ┌──────────────────────────┐
        │   Launchpad Shell (MFE)  │   │   Auth Service (Java)    │
        │   React + Redux Toolkit  │   │   SAP XSUAA / SAML / SSO │
        │   Module Federation host │   └────────────┬─────────────┘
        └────┬──────┬──────┬───────┘                │
             │      │      │                        │
             ▼      ▼      ▼                        │
       ┌────────┐┌────────┐┌────────┐               │
       │ MFE A  ││ MFE B  ││ MFE C  │               │
       │Folder  ││ Report ││ Admin  │               │
       │Browser ││Viewer  ││Console │               │
       └───┬────┘└───┬────┘└───┬────┘               │
           │         │         │                    │
           └────┬────┴────┬────┘                    │
                │         │                         │
                ▼         ▼                         ▼
        ┌─────────────────────────────────────────────────┐
        │       API Gateway (Spring Cloud Gateway)        │
        │  Routing · JWT validation · Rate limit · CORS   │
        └────┬──────────┬──────────┬──────────┬───────────┘
             │          │          │          │
             ▼          ▼          ▼          ▼
       ┌──────────┐┌──────────┐┌──────────┐┌──────────┐
       │ CMS svc  ││ Report   ││ Sched    ││ User     │
       │ (folders,││  Viewer  ││ Service  ││ Prefs    │
       │  perms)  ││  service ││          ││ service  │
       └────┬─────┘└────┬─────┘└────┬─────┘└────┬─────┘
            │           │           │           │
            └─────┬─────┴─────┬─────┴───────────┘
                  ▼           ▼
            ┌──────────┐┌──────────────┐
            │ Postgres ││   Redis      │
            │ (metadata)││ (cache,     │
            │           ││  sessions)  │
            └──────────┘└──────────────┘

           ┌────────────────────────────────────┐
           │ Observability: OpenTelemetry →     │
           │ Prometheus + Grafana + Loki +      │
           │ Jaeger. Sentry for FE errors.      │
           └────────────────────────────────────┘
```

**How to explain (script):**

1. **Start from the user.** "A browser hits the CDN over HTTPS. Static assets — JS chunks, CSS, images — are served from edge caches with 1-year immutable caching keyed on content hash."
2. **Approuter.** "Approuter is the SAP BTP edge tier — it terminates TLS, validates the auth cookie, injects CSP headers, and applies rate limits."
3. **Shell + MFEs.** "The shell is a React app acting as the Module Federation host. It loads three remote entries at runtime: Folder Browser, Report Viewer, Admin Console. Each is owned by a different team."
4. **Backend.** "Requests flow through Spring Cloud Gateway, which validates the JWT and routes to microservices — CMS for metadata, Report Viewer for opening reports, Scheduler for jobs, User Prefs."
5. **Data.** "Postgres holds metadata. Redis caches session tokens and frequently accessed folder trees."
6. **Observability.** "OpenTelemetry traces flow through all services. Sentry captures frontend errors."

**End the story with:** *"The killer feature is that each MFE deploys independently. If Admin Console has a bad release, Folder Browser keeps working."*

---

## 3.4 Request Flow — Opening a Report ⭐

**Walk through this end-to-end when asked "what happens when I click a report?"**

1. **User clicks** report tile in Folder Browser MFE.
2. React Router intra-shell navigation fires; shell dynamically imports **Report Viewer MFE** (`import('reportViewer/App')`).
3. Module Federation resolves shared deps (React, ReactDOM singletons); Report Viewer bundle streams from CDN.
4. Report Viewer mounts, dispatches Redux action `report/open` with report ID.
5. **RTK Query** (or `TanStack Query`) fires `GET /api/v1/reports/:id`:
   - Approuter validates auth cookie → attaches JWT.
   - API Gateway validates JWT signature, checks scope.
   - Routes to Report Viewer service.
   - Service checks Redis for cached metadata; miss → Postgres query.
   - Returns JSON: report descriptor, permissions, first-page URL.
6. Frontend receives descriptor, renders viewer skeleton (LCP fires here).
7. First page fetched as separate call (chunked / streaming).
8. Interaction ready — user can page, filter, drill down. Each action is a new API call.

**Latencies (targets):**
- CDN → LCP paint: < 2.5s p75 on 4G.
- API GET metadata: p50 40ms, p95 200ms.
- Report first page: p50 400ms, p95 2s.

---

## 3.5 Data Flow — State Management Model ⭐

**Client state layers (know cold):**

| Layer | Tool | Example |
|---|---|---|
| **URL state** | React Router | `/folder/42?sort=name` |
| **Server state** | RTK Query | Folder contents, report metadata |
| **Global client state** | Redux Toolkit | Current user, theme, feature flags |
| **Local component state** | `useState` / `useReducer` | Modal open, form draft |
| **Persisted state** | `localStorage` (via redux-persist) | User prefs, last folder |

**Rule I lived by:** *"URL first, server second, Redux third, useState last."*

The URL should reproduce the app state. Server data doesn't belong in Redux (put in RTK Query cache). Redux is only for truly global, cross-MFE stuff.

---

## 3.6 Database Design (BOE Metadata)

**I didn't own this**, but I need to speak to it:

- **Postgres** stores object metadata: users, groups, folders, reports (name, path, ACL).
- **File store** (S3-like) stores report binaries (`.wid`, `.rpt`, `.dashboard`).
- **Redis** — session tokens (TTL 15min access, 7d refresh), folder tree cache (LRU).

**Interviewer trap:** *"Design the schema for folders + permissions."*
See Ch 6 System Design — I cover it there.

---

## 3.7 API Design

**Style:** REST + JSON. Versioned `/api/v1/`. HAL-lite links on collection responses.

**Examples:**
```
GET    /api/v1/folders/:id                   → folder metadata + children
GET    /api/v1/reports/:id                   → report descriptor
POST   /api/v1/reports/:id/instances         → run a report
DELETE /api/v1/reports/:id                   → soft delete
PATCH  /api/v1/users/me/prefs                → update prefs
```

**Contracts:**
- **OpenAPI 3.0** spec is the source of truth. Frontend types are generated via `openapi-typescript`.
- **Idempotency-Key** header for POST that must not double-execute.
- **ETag / If-None-Match** for GETs on cacheable resources.
- **Pagination:** cursor-based (`?cursor=xxx&limit=50`) for stable ordering. Offset-based only for admin lists.

**Errors:** RFC 7807 (`application/problem+json`):
```json
{ "type": "https://.../not-found", "title": "Report not found", "status": 404, "traceId": "abc..." }
```

---

## 3.8 Authentication & Authorization ⭐

**AuthN:** SAP XSUAA (OAuth 2.0 + OIDC) or SAML for on-prem. Authorization Code + PKCE flow for the SPA.

**Session model:**
- Access token JWT, 15-min TTL, stored **in memory** (never localStorage).
- Refresh token, 7-day TTL, in **HttpOnly Secure SameSite=Strict cookie**.
- Silent refresh via a hidden iframe or a `/refresh` endpoint before expiry.
- On logout: revoke refresh token server-side, clear cookie, redirect to IdP end-session.

**AuthZ:**
- Role-based (RBAC) — Admin / Author / Consumer.
- Object-level ACLs stored on CMS objects (folder-level inheritance).
- **Frontend** hides UI a user can't use, but **server always re-checks** — never trust the client.

**Interviewer trap:**
- *"Why not store JWT in localStorage?"* → XSS steals it. HttpOnly cookies + short-lived in-memory access token = defense in depth.
- *"CSRF risk with cookies?"* → SameSite=Strict cookies + double-submit token on state-changing requests.

---

## 3.9 Caching Strategy ⭐

**5 caching layers (memorize):**

| Layer | Where | TTL | Invalidation |
|---|---|---|---|
| **CDN** | CloudFront / Akamai | 1 year (hashed files) | New hash on deploy |
| **HTTP** | Browser cache | ETag + `Cache-Control: no-cache` for JSON | Server returns 304 |
| **Service Worker** | Client offline shell | Config per route | Skip-waiting on new SW |
| **RTK Query / TanStack Query** | React memory | 5-min default | Tag-based invalidation |
| **Redis** | Backend | 60s folder tree | On mutation event |

**Cache-invalidation story ready:** When a user renames a folder, backend publishes a Kafka event `folder.renamed` → Redis invalidates the folder-tree key → next fetch is warm again.

*Memory hook: **"Cache the shell forever, cache the data briefly, invalidate on write."***

---

## 3.10 Messaging / Async Processing

- **Report schedule jobs** — dispatched via **RabbitMQ** to a fleet of workers.
- **Cache invalidation events** — **Kafka** topic (in newer stack).
- **WebSocket** channel from server → client for job completion notifications ("Your export is ready").

**Failure model:** at-least-once delivery. Consumers must be idempotent. We use a dedup key (`job-id + attempt`) in Redis with 24h TTL.

---

## 3.11 Error Handling ⭐

**Frontend layers:**
1. **Top-level React Error Boundary** in shell — catches render errors, shows friendly fallback, reports to Sentry.
2. **Per-MFE Error Boundary** — one bad MFE doesn't kill the whole shell.
3. **Network-level** in RTK Query — retries with exponential backoff, surfaces `error.status` to UI.
4. **User-facing** — never show raw stack traces. Show a friendly message + a Trace ID so support can look up logs.

**Rule:** *"Every error must be either handled, logged, or bubbled — never swallowed."*

---

## 3.12 Observability ⭐

**Metrics** (Prometheus): request rate, p50/p95/p99 latency, error rate, JS bundle size trend.
**Logs** (Loki, structured JSON): every log line has `traceId`, `userId` (hashed), `tenant`.
**Traces** (Jaeger): OpenTelemetry propagates a trace ID from the browser (via `traceparent` header) all the way to the DB query.
**Frontend errors** (Sentry): unhandled exceptions, network failures, and Web Vitals metrics.
**RUM** (Real User Monitoring): Sentry Performance / SpeedCurve — real-user LCP / INP / CLS from actual customers.

**SLOs:**
- 99.9% availability of shell → **43 minutes** downtime budget per month.
- p95 LCP ≤ 2.5s on 4G median device.
- p95 API GET ≤ 500ms.

---

## 3.13 Scaling ⭐

**Horizontal:**
- Shell + MFEs are static files → CDN scales infinitely.
- Backend services are stateless containers → HPA scales on CPU + custom metric (RPS).

**Vertical:**
- Postgres primary + read replicas for heavy reporting queries.
- Redis cluster (3 shards, 3 replicas) for session + cache.

**Bottlenecks I've seen:**
- **N+1** in the folder-tree service — solved with a single recursive CTE.
- **JWT verification** hot on gateway — cached JWKs, dropped mean latency from 8ms to 0.4ms.
- **Report render** CPU-bound on backend — pool of worker services with pre-warmed JVMs.

**"What if traffic 10×?"** answer:
- CDN takes the 90% static hit — no change needed.
- API Gateway: add pods, scale on RPS.
- Postgres: read replicas → connection pooler (PgBouncer) → possible sharding by tenant.
- Redis: cluster mode, add shards.
- Reduce chatty endpoints; batch calls.
- **The real answer:** measure first, don't guess where the bottleneck is.

---

## 3.14 Security ⭐

**Frontend hardening I led:**
1. **CSP** — nonce-based, `default-src 'self'`, `script-src 'self' 'nonce-<random>' https://cdn.sap.com`. Report-only for 4 weeks, then enforce.
2. **XSS** — React auto-escapes. For the 3 places we needed HTML (rich-text reports), we sanitize with DOMPurify + strict allowlist.
3. **Secure headers** — HSTS, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.
4. **Dependency scanning** — npm audit + Snyk in CI. Fail build on critical.
5. **Session hardening** — HttpOnly + Secure + SameSite=Strict cookies, short-lived access tokens.
6. **Input validation** — every API input validated against JSON Schema, both server (source of truth) and client (UX).
7. **Log hygiene** — never log PII or tokens. Redact via a logger middleware.

**Numbers:** vulnerability count (critical + high) dropped **45 → 9** over 6 months. Metric came from SAP's internal Fortify + a third-party pentest.

---

## 3.15 Deployment ⭐

**Flow:**
```
git push → GitHub Actions → build → test → docker → push to registry
       → deploy staging (auto) → smoke tests → deploy prod (manual gate)
```

**Strategies:**
- **Frontend:** blue/green on CDN — new hashed folder uploaded, then atomic pointer switch. Rollback = flip pointer back.
- **Backend:** rolling deploy on Kubernetes, 25% batch, readiness probes gate traffic.
- **Feature flags** (LaunchDarkly / Unleash) for risky changes — dark launch, gradual rollout.

**Zero-downtime rules:**
- Backward-compatible API changes only.
- Migrations: expand → migrate → contract.
- Feature flags default OFF; enable per-tenant.

---

## 3.16 CI/CD Pipeline ⭐

**Actual stages we used:**

```
1. Install deps (npm ci with cache)             ~30s
2. Lint (ESLint + Prettier check)               ~20s
3. Typecheck (tsc --noEmit)                     ~40s
4. Unit tests (Vitest, parallel)                ~90s
5. Build (Vite, production, sourcemaps)         ~120s
6. Bundle-size gate (bundlesize / size-limit)   ~10s
7. Component tests (Playwright component)       ~60s
8. E2E (Playwright, 3 shards)                   ~4min
9. Lighthouse CI (perf gate)                    ~90s
10. Accessibility (axe-core in Playwright)      inline
11. Snyk / npm audit                            ~30s
12. Deploy to preview env                       ~2min
13. Manual approval → prod                       —
```

**Perf gate:** if median LCP regresses > 200ms vs `main`, block the PR.
**Bundle gate:** if any chunk grows > 5%, warn; > 10% block.

---

## 3.17 Cost

Rough guess if asked:
- **CDN:** dominant cost at low latency SLA. ~$1–2 per TB egress, plus request cost. Optimized by proper cache headers.
- **Compute:** stateless K8s pods, autoscaling — pay for baseline + peaks.
- **Data:** Postgres + Redis fixed nodes.
- **My frontend contribution to cost savings:** bundle size cut ~40% → CDN egress cut proportionally on cold caches.

*If you don't know exact numbers, say **"I didn't own the FinOps but I know CDN egress was the biggest lever and my bundle work moved it materially."*** Honesty beats guessed numbers.

---

## 3.18 Failure Scenarios (Have Answers Ready) ⭐🔥

**Q: "What if Report Viewer MFE fails to load?"**
> Shell wraps every MFE in an Error Boundary + Suspense fallback. If `remoteEntry.js` 404s (bad deploy), we show a fallback UI and log the error. The rest of the shell (folder browser, admin) keeps working. That's the whole point of Module Federation.

**Q: "What if the CDN is down?"**
> Two-tier CDN (primary + secondary origin failover). If both fail, backend can serve static files directly via nginx as a last resort — slow but alive. Monitored via synthetic canary from 5 regions every 30s.

**Q: "What if Postgres primary dies?"**
> Managed Postgres with automated failover to a hot standby (usually < 30s). App uses a connection pooler (PgBouncer) — reconnects transparently. Users see 2–3 requests fail; auto-retry with backoff hides most of it.

**Q: "What if Redis dies?"**
> Cache miss → fallback to Postgres directly. Requests get slower, not broken. **Cache-aside pattern** means Redis is a nice-to-have, not a dependency.

**Q: "What if a bad deploy takes down the shell?"**
> CDN pointer flip = 5-second rollback. We also feature-flag risky changes and dark-launch to 1% traffic first.

**Q: "What if a token is stolen?"**
> Refresh token is HttpOnly + SameSite=Strict + short-lived. Access token is in-memory only (killed on tab close). Server-side we can revoke refresh tokens by user. Anomaly detection alerts on impossible-travel logins.

---

## 3.19 What I Would Change Today (2026 lens) ⭐

**Ask yourself: "If I started this project fresh in 2026, what would I do differently?"**

1. **RSC (React Server Components)** — a lot of our folder-tree fetching would move to server components; less JS shipped.
2. **Zustand + TanStack Query** — I'd trim Redux to true global client state; server state fully in TanStack Query. Half the Redux boilerplate would disappear.
3. **Native Federation** (framework-agnostic) — decouple MFEs from Webpack, allow non-React MFEs.
4. **Signals** exploration for the fine-grained parts (dashboard cell updates).
5. **Preact** on the ultra-lightweight admin pages — save ~30KB.
6. **Trusted Types** as a stricter next step after CSP.
7. **View Transitions API** for smoother route changes.
8. **OpenTelemetry browser SDK** end-to-end trace correlation (we had partial).
9. **Container queries** everywhere — no more viewport hacks for embedded viewer scenarios.
10. **AI-assisted a11y scan** in CI to catch things axe misses (screen-reader semantics).

**Honest self-critique:**
- Migration took **12 months longer than planned** because we underestimated backend contract mismatches. I would run a **contract-testing (Pact) phase** upfront in a redo.
- We over-invested in unit tests early; the ROI was in **E2E happy-path** coverage. Would flip the testing pyramid.

---

## 3.20 Interview Questions — By Difficulty

### 🟢 Easy
1. **"What did BI Launchpad do?"** → Portal for SAP BusinessObjects — folders, reports, dashboards, scheduling.
2. **"Which frontend framework?"** → React 18 + Redux Toolkit + TypeScript.
3. **"How did you deploy?"** → GitHub Actions → Docker → K8s (backend) + CDN blue-green (frontend).
4. **"How did you test?"** → Vitest unit, Playwright E2E + component, Lighthouse CI perf gate, axe a11y gate.

### 🟡 Intermediate
1. **"How did you split the frontend into three teams?"** → Module Federation. Shell owns routing / auth / shared UI; each team owns one MFE.
2. **"How did you handle shared state across MFEs?"** → Two channels: shell's Redux (for auth + theme) exposed via a stable module boundary; **Custom Events** on the window for one-shot cross-MFE signals.
3. **"How did you achieve Lighthouse 95+?"** → Three wins: route-level code split (initial JS 60% smaller), AVIF + preload for hero images (LCP -40%), Preact-compat for a legacy view (30KB drop). All measured on median mobile, 4G throttled.
4. **"How did the Redux Toolkit migration go?"** → Slice-by-slice. Started with feature flags, kept legacy jQuery reducers running in parallel via a thin bridge. Cut over per feature, deleted legacy after 2 weeks of parity.

### 🔴 Deep Dive
1. **"Walk me through what happens when a user opens a report."** → *(See §3.4 — memorize this word-for-word.)*
2. **"How did you design cache invalidation across MFEs?"** → Kafka event on mutation → shell subscribes → dispatches an invalidation action → all RTK Query caches with matching tag drop → next fetch is fresh. Single source of truth is the backend event.
3. **"How did you achieve WCAG-AA?"** → **Audit → fix → automate.** Ran axe-core to establish baseline (~120 violations). Prioritized keyboard + screen reader flows. Fixed 30 blocker violations manually. Added axe to Playwright E2E — regressions block PRs. Screen-reader QA passes on NVDA + VoiceOver quarterly.
4. **"How did you reduce vulnerabilities 80%?"** → Baseline 45 critical+high from Fortify + external pentest. Wins: CSP kills all inline-script-based XSS (12 findings gone), replaced 4 outdated deps (11 CVEs), moved auth from localStorage to HttpOnly cookies (5 findings), HTTPS-only + HSTS (4). New number: 9.

### 🟣 Senior-level
1. **"How do you decide when to split into a micro-frontend?"** → **Team scale first, tech second.** Teams > ~8 engineers with independent release cadence → MFE. Otherwise a well-modularized monolith beats a distributed frontend every time.
2. **"What did you gain and lose with Module Federation vs iframes?"**
   - **Gain:** shared React singleton (no double bundle), typed cross-MFE APIs, common auth, smoother UX.
   - **Lose:** version drift risk, shared-runtime coupling, harder to isolate a rogue MFE that consumes memory.
3. **"How do you keep MFE teams from stepping on each other?"**
   - **Contract-first APIs** — TypeScript types published as a package versioned by the shell team.
   - **Design system + tokens** shipped as a shared singleton.
   - **Architecture Decision Records (ADRs)** and a monthly frontend guild for cross-team topics.
4. **"How do you know your Lighthouse gains held in production?"**
   - **Lab (Lighthouse CI)** for PR gates.
   - **Field (Sentry Performance / SpeedCurve RUM)** for real-user metrics.
   - When lab-good but field-bad → I dig into device / geography breakdown. Usually a slow region or a common low-end device.

### 🔥 "Why?" Chains (they will chain 5 deep)
- **Why React?** Ecosystem + team skill + MFE support.
- **Why Redux Toolkit?** Cross-cutting client state across MFEs; RTK kills boilerplate.
- **Why not just Context?** Context re-renders every consumer; performance for our folder tree was untenable.
- **Why not Zustand?** Reasonable choice today; back in 2022 RTK was more mature and the team knew Redux patterns.
- **Why not Redux without Toolkit?** Boilerplate cost. Immer-based writes are much less bug-prone than manual spreads.
- **Why not just wait for Signals in React?** They didn't exist for React in 2022, and I don't bet a 3-team migration on future features.

### ⚠ Troubleshooting Scenarios
1. **"Users report the folder tree is stale."**
   - Look at cache invalidation events → Kafka lag? Redis TTL wrong? RTK Query tag missing?
   - Reproduce with two tabs and a rename.
   - Add a manual "Refresh" as a temporary escape hatch.
2. **"After the last deploy, INP p95 doubled."**
   - Check RUM breakdown by component / route.
   - Compare bundle sizes before/after.
   - Diff main JS chunk with `source-map-explorer`.
   - Likely culprits: new dep, new heavy component, missing memoization.
3. **"CSP is blocking legit inline scripts in a third-party embed."**
   - Choose: (a) whitelist the exact source via nonce (b) load via iframe with its own CSP (c) refactor to external file with hash.
   - Never disable CSP — that's the failure mode we came from.

### 🧠 Design Questions
1. **"Design a permissions system for folders and reports."** → RBAC + object-level ACL with inheritance. Store as `(principal, object, action, effect)` triples. Cache resolved effective permissions in Redis, invalidate on ACL change.
2. **"Design a report-scheduling system."** → Queue (RabbitMQ / SQS) + worker fleet + persisted job store + retry policy + WebSocket / email for completion. Idempotent workers keyed by (jobId, attempt).
3. **"Design real-time job status updates."** → WebSocket channel per user, backed by Redis pub/sub for fanout across app servers. Heartbeat 30s, resume by lastEventId.

### 📈 "What if traffic 10×?"
- Static: CDN scales, no change.
- API: horizontal scale + Postgres read replicas + PgBouncer + Redis cluster.
- Report render: pre-warmed worker pool + queue backpressure.
- **Don't guess — measure first.** Load test with k6, find the actual bottleneck.

### 🚨 "What if X goes down?"
See §3.18.

### ❓ "Why didn't you use X?"
- **Why not Vue?** Team's skill set was React; hiring was easier.
- **Why not Svelte?** In 2022 the ecosystem for enterprise (a11y libs, i18n, testing) was thinner. And no Module Federation story.
- **Why not GraphQL?** BOE's server APIs are REST. Rewriting the backend was out of scope. RTK Query gives us most of the client benefits.
- **Why not Next.js?** SSR wasn't a business need — behind SSO, no SEO gain. Vite + CDN was simpler.
- **Why not Remix?** Same as Next.js — no SSR need for authenticated internal app.
- **Why not Angular (stay)?** Legacy app was jQuery, not Angular. Given the rewrite, React had better team fit and MFE story.

### 🔬 "How do you know this works?"
- **Lab metrics:** Lighthouse CI PR gates.
- **Field metrics:** Sentry Performance / SpeedCurve RUM.
- **Business metrics:** two customers signed multi-year renewals citing perf.
- **User metrics:** support tickets tagged "slow" dropped 62% month over month post-launch.
- **Regression detection:** perf budget alerts, bundle-size CI gate.

---

## 3.21 Numbers Recap — Memorize These ⭐

| Metric | Before | After | How measured |
|---|---|---|---|
| Lighthouse | 60 | 95+ | Median mobile, 4G, Lighthouse CI |
| Page-load (LCP) | ~5s | ~2.6s | Sentry Performance p75 |
| Vulnerabilities (crit+high) | 45 | 9 | Fortify + external pentest |
| WCAG violations | ~120 | 0 blockers | axe-core Playwright suite |
| Test coverage | ~10% | 70% unit, 90% critical paths E2E | Vitest coverage + Playwright |
| Release cadence | monthly | weekly | Git tags |
| Cross-team merge conflicts | 8/wk | 0 | MFE isolation |
| Bundle initial JS | 1.2MB | 480KB | Vite build output |

*If asked how you know a number is accurate: **"Sentry RUM p75 median"** or **"Fortify scan on release branch."*** Always name the measurement, not the vibe.

---

## 3.22 Your One-Sentence Punchline for Launchpad

Write this on paper, memorize it:

> **"I turned a decade-old jQuery monolith into a micro-frontend React shell — 45% faster, WCAG-AA compliant, 80% fewer vulnerabilities, and three teams shipping independently on the same product."**

That's it. Say it in 15 seconds. Every interview.

Next → **Chapter 4 — Other Projects (Bosch, Oracle, NiftyLens, PerfScan).**
