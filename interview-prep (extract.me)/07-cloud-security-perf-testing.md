# Chapter 7 — Cloud · Security · Performance · Testing · Incidents

*Memory hook: **"Deploy safe. Defend everywhere. Measure always."***

---

# Part A — Cloud / DevOps Questions

## 7.A.1 The Core Cloud Concepts (must-know)

| Concept | One-line | Interview trap |
|---|---|---|
| IaaS | VMs (EC2) | Full OS ownership |
| PaaS | App runtime (Vercel, Heroku) | Less control, more speed |
| SaaS | Product (Gmail) | Just an app user |
| Serverless | Functions per event | Cold start, no long-running |
| Edge | Runs near user (Cloudflare Workers, Lambda@Edge) | V8 isolates, limited APIs |
| CDN | Static asset cache at edge | Cache-key design is everything |

## 7.A.2 Common Cloud Questions

**Q: Deploying a React app — what's the pipeline?**
> Build via GitHub Actions → hashed static assets → upload to S3 → invalidate CloudFront (or blue/green pointer flip). Deploy = seconds. Rollback = flip pointer.

**Q: How do you handle secrets?**
> Never in git. Use cloud secret manager (AWS Secrets Manager / SSM Parameter Store / Vault / Doppler). Inject at runtime via env vars or SDK. Rotate every 90 days. Access via IAM role, not long-lived credentials.

**Q: CI/CD security?**
> **OIDC to cloud** — GitHub Actions issues short-lived tokens, no static AWS keys in CI. Least-privilege IAM role per workflow. Signed commits. Branch protection with required reviews.

**Q: Blue-green vs canary vs rolling?**
- **Blue-green:** two full environments; switch traffic instantly. Fast rollback, 2× infra cost.
- **Canary:** small % of traffic to new version. Great for gradual validation.
- **Rolling:** replace pods gradually. Cheap, but rollback = re-deploy.

**Q: Multi-region — active-active or active-passive?**
- **Active-passive:** simpler, one write region, DR failover in minutes.
- **Active-active:** complex (write conflicts), but zero RTO. Requires CRDTs or single-writer-per-key model.

## 7.A.3 Docker Questions

**Q: How does Docker work?**
> Namespaces (PID, net, mount, UTS, user) + cgroups (CPU/mem limits) + union filesystem (layered images). It's not a VM — it's process isolation.

**Q: Multi-stage build — show me.**
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

**Q: Reducing image size?**
> Alpine base, multi-stage, `.dockerignore`, don't `apt-get install` dev tools in final stage, distroless / scratch base for compiled binaries.

## 7.A.4 Kubernetes Questions

**Q: Explain a Deployment.**
> Declarative desired state → ReplicaSet controller → Pods. Rolling updates with maxUnavailable / maxSurge. Rollout history for `kubectl rollout undo`.

**Q: When does a pod get evicted?**
> Node under memory pressure → kubelet evicts by QoS class (BestEffort first). Also on health probe failure, node drain, HPA scale-down.

**Q: How do you debug a stuck pod?**
> `kubectl describe pod` → events. `kubectl logs -p` for previous crash. `kubectl exec -it -- sh`. Check probes, resource limits, image pull errors, PVC binding.

---

# Part B — Security Questions

## 7.B.1 The 10 Security Questions You Will Get

### 1. What is XSS and how do you prevent it?

**Answer:** XSS injects attacker JS into a page under the victim's origin. Three types: reflected (URL), stored (DB), DOM-based (client sink).

**Prevention pyramid:**
1. Framework auto-escaping (React JSX by default).
2. CSP as defense-in-depth.
3. Sanitize any HTML you inject (`DOMPurify`).
4. HttpOnly cookies for sessions (steal JS ≠ steal auth).
5. Trusted Types API in browsers that support it.

*Memory hook: **"Never inject. Always escape. HttpOnly cookies. CSP as safety net."***

### 2. What is CSRF? How to prevent?

**Answer:** Attacker's site tricks a logged-in user's browser into sending a state-changing request to yours (cookie auto-sent).

**Prevention:**
- **SameSite=Strict cookies** — blocks most cross-site requests. Modern default.
- **Anti-CSRF token** — double-submit pattern (cookie + header must match).
- **Custom header** — `X-Requested-With: XMLHttpRequest` (forces preflight).
- **Never** rely on Referer alone — spoof-able / stripped.

### 3. CSP — how does it work?

**Answer:** HTTP response header listing allowed sources per resource type. Browser blocks anything not on the list.

**Modern policy example:**
```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-abc123' https://cdn.trusted.com;
  style-src 'self' 'unsafe-inline';   /* remove 'unsafe-inline' when you can */
  img-src 'self' data: https:;
  connect-src 'self' https://api.mycompany.com;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  report-uri /csp-report;
```

**Rollout:** Report-Only mode first, collect violations, then enforce.

### 4. JWT best practices

- Short-lived access (5–15 min) + rotating refresh (7d in HttpOnly cookie).
- **Never** store JWT in localStorage — XSS bait.
- Sign with **RS256** (asymmetric) for microservices, not HS256.
- Validate signature, expiry, issuer, audience — every request.
- **Rotate signing keys** — publish JWKS endpoint.

### 5. OAuth 2.0 / OIDC flows

- **Authorization Code + PKCE** — SPAs, mobile (2026 standard).
- **Client Credentials** — server-to-server.
- **Implicit** — deprecated, never use.
- **Password Grant** — deprecated, never use.

### 6. Rate limiting

- Token bucket at edge (CloudFront, Cloudflare, or app-level with Redis).
- Per-IP + per-user + per-endpoint.
- Response: `429 Too Many Requests` + `Retry-After` header.
- Beware **CAPTCHA soft-fail** — bots pass free tier.

### 7. Secrets in the frontend

- **Never** put secrets in frontend code. It's shipped to every user.
- Backend proxies with server-side keys.
- Public keys (Stripe pk_, Google Maps API) are fine — they're designed to be public.

### 8. Password storage

- Never plaintext. Never MD5. Never SHA-256 alone.
- **Argon2id** (modern default), or **bcrypt** (still fine).
- Cost factor tuned to ~100–250ms per hash on your prod hardware.
- Never log passwords, even truncated.

### 9. HTTPS / TLS

- TLS 1.2 minimum, TLS 1.3 preferred.
- HSTS with `preload` and long `max-age`.
- Redirect HTTP → HTTPS with 301.
- OCSP stapling for certificate freshness.
- Use `Strict-Transport-Security` and `Upgrade-Insecure-Requests`.

### 10. Supply-chain attacks (2026 concern)

- **Lockfiles committed**, verified.
- **Pinned deps** (not `^` in prod deps for critical libs).
- **Provenance** via npm attestations / SLSA.
- **SCA** in CI — Snyk / GitHub Dependabot / npm audit.
- **Ban** typosquatted packages (dependency-review-action).

## 7.B.2 Security Trap Questions

**Q: "Show me a vulnerable code snippet — fix it."**
```jsx
// VULNERABLE — DOM-based XSS
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// FIXED
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// BETTER — don't inject HTML at all
<div>{userInput}</div>
```

**Q: "Your login endpoint — what's wrong?"**
Interviewer shows something like:
```js
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.users.findOne({ email });
  if (user && user.password === password) {
    res.cookie('session', user.id).send('ok');
  } else res.status(401).send('bad creds');
});
```
**Answer:** (1) password compared in plaintext → hash + timing-safe compare. (2) cookie missing HttpOnly/Secure/SameSite. (3) no rate limit → credential stuffing. (4) session ID is user.id — enumerable. (5) `bad creds` message reveals nothing — good, but early bail on `user` reveals timing.

---

# Part C — Performance & Scalability

## 7.C.1 Core Web Vitals — Deep Dive

*See Ch 2 § 2.15 for the summary. Below is the depth.*

### LCP — Largest Contentful Paint

**What it measures:** time from navigation start until the largest element in the viewport is rendered.

**Common LCP element:** hero image, large heading, video poster.

**Fix playbook:**
1. **Preload** the LCP resource: `<link rel="preload" as="image" href="hero.avif" fetchpriority="high">`
2. **Prioritize** — `<img fetchpriority="high">` on the LCP image.
3. **Server response** — CDN, edge cache, faster TTFB.
4. **Render blocking** — defer non-critical CSS/JS; inline critical CSS.
5. **Image format** — AVIF > WebP > JPEG.
6. **Correct sizing** — no 4K image scaled down; use `<picture>` + `srcset`.
7. **Font** — `font-display: swap` (or `optional`), preload the font.

### INP — Interaction to Next Paint (replaced FID in 2024)

**What it measures:** longest observed input-to-paint latency across all interactions.

**Fix playbook:**
1. **Break up long tasks** > 50ms. Use `scheduler.yield()` (2026 API) or `await` a microtask.
2. **`startTransition`** for non-urgent updates.
3. **Debounce** high-frequency handlers (input, scroll).
4. **Web Workers** for CPU-heavy work.
5. **`useDeferredValue`** for stale-while-computing lists.
6. **Reduce main-thread work** — smaller bundles, less hydration.
7. **`content-visibility: auto`** for off-screen sections.

### CLS — Cumulative Layout Shift

**What it measures:** total layout shift over the page lifetime, unexpected shifts only.

**Fix playbook:**
1. **Size attrs on images/videos** — reserves space.
2. **`aspect-ratio` CSS** on responsive media.
3. **Never insert content above existing content** — insert below or into reserved slots.
4. **Fonts** — use `size-adjust` in `@font-face` or `font-display: optional`.
5. **Ads/embeds** — reserve container size.

## 7.C.2 Perf Question Templates

**Q: "Your homepage is slow. What do you do?"**
1. **Measure.** WebPageTest or Chrome DevTools Performance. Note LCP, INP, CLS, TTFB, TBT.
2. **Waterfall analysis.** What blocks first paint? What defers LCP?
3. **Coverage tab.** How much unused JS/CSS ships on this route?
4. **Network throttle.** Simulate mid-range mobile + slow 4G.
5. **Prioritize by ROI.** LCP first (usually image or server), then INP (JS), then CLS (layout).
6. **Change one thing, re-measure.** Never batch fixes — you'll never know what worked.

**Q: "How would you optimize a page with 1000 rows?"**
Virtualize (react-window / TanStack Virtual). Debounce filters. Column-level memo. `content-visibility: auto`. Consider server-side pagination for very large datasets.

**Q: "Bundle is 3MB. Where do you start?"**
1. `webpack-bundle-analyzer` or `source-map-explorer`.
2. Find biggest offenders — usually moment.js, lodash (import all), older React versions, duplicate deps.
3. **Tree-shake** — barrel-file elimination, `sideEffects: false`.
4. **Code-split** by route.
5. **Replace** heavy libs — moment → date-fns/dayjs, lodash → per-function imports.
6. **Lazy-load** below-fold and modal-only code.

## 7.C.3 Scalability Playbook

- **Vertical first.** Bigger box before more boxes.
- **Cache** at every layer.
- **Read replicas** for read-heavy.
- **CDN** for static.
- **Async / queue** for non-critical work.
- **Rate limit + backpressure** everywhere.
- **Idempotency** on writes.
- **Circuit breakers** on downstream deps.

---

# Part D — Testing

## 7.D.1 Testing Pyramid (2026 view)

```
        /\   E2E (5%)  — Playwright
       /  \
      / IT \ Integration (15%) — RTL + MSW
     /______\
    /        \ Unit (80%) — Vitest
   /__________\
```

Actually more of a **testing trophy** shape now:
- Big middle (integration / component tests)
- Some unit (pure functions, hooks)
- Small E2E (critical paths)

## 7.D.2 Testing Questions

**Q: What do you test?**
> **User-visible behavior.** Not implementation. Not state names. Not "did we call setUser." Instead: "when the user submits the form, does the success message appear?"

**Q: Coverage — how much is enough?**
> 80% is my rule of thumb, 90–95% for critical business logic. **Coverage is a floor, not a ceiling.** Better metric: does a randomly-selected 1% of production bugs get caught by tests?

**Q: Flaky tests?**
> Delete or fix root cause. Never retry-to-green. Root causes are usually: (1) time-based race (fix: use fake timers / explicit waits), (2) test order dependency (fix: reset state before each), (3) real network (fix: MSW mocks).

**Q: How do you test a Redux slice?**
> Reducer is pure — call with prev state + action, assert next state. Thunks — dispatch, assert dispatched actions & final state. RTL for component + slice integration.

**Q: How do you test a custom hook?**
> `@testing-library/react` `renderHook`. Wrap in the same Providers you'd use in production.

**Q: How do you mock time?**
> `vi.useFakeTimers()` (Vitest) or `jest.useFakeTimers()`. Advance with `vi.advanceTimersByTime(1000)`. Restore in `afterEach`.

**Q: Snapshot tests — friend or foe?**
> Friend for stable output (JSON schemas, translations). Foe for UI — devs rubber-stamp diffs, snapshots decay. Use visual regression (Chromatic) for UI.

**Q: Contract testing?**
> Pact or Spring Cloud Contract. Consumer defines expected response → provider verifies it can meet it. Great for microservices + MFE.

---

# Part E — Production Incidents / Troubleshooting

## 7.E.1 The Incident Response Framework ⭐

**Real interviewers ask: "Tell me about a production incident."** Have 2–3 stories ready in STAR format.

### Story 1 — The CSP Rollout

**Situation:** After enabling CSP in enforce mode, a legacy third-party embed (chart lib) broke silently — no chart on some dashboards.
**Task:** Restore charts within SLA (30 min) without disabling CSP.
**Action:**
1. Checked CSP `report-uri` logs — saw `script-src` violation from `cdn.oldvendor.net`.
2. Confirmed the vendor loaded chart via `eval` — CSP was killing it.
3. Two-track fix: short-term, added `cdn.oldvendor.net` to script-src with a hash; long-term, opened ticket to move to a modern chart lib (Recharts, no eval).
**Result:** Charts restored in 25 min. Modern chart migration shipped 6 weeks later.

### Story 2 — The Memory Leak from useEffect

**Situation:** After a release, browser tabs crashed after 10 min of use.
**Task:** Root-cause and patch in the same day.
**Action:**
1. Chrome DevTools Memory tab → heap snapshot → growing detached DOM nodes.
2. Traced to a `useEffect` in the WebSocket subscription hook — cleanup didn't call `.close()`.
3. Fixed the cleanup, added an ESLint rule (`react-hooks/exhaustive-deps` strict), and a Playwright memory-leak canary test.
**Result:** Hotfix deployed 4h after report. Repeat regression prevented by CI test.

### Story 3 — The Cache Poisoning Bug

**Situation:** After a deploy, some users saw another tenant's folder tree.
**Task:** Immediate rollback + investigation.
**Action:**
1. Rolled back deploy (5 min via CDN pointer flip).
2. Investigation: new caching layer used `folder-tree-{userId}` as key but pod-level in-memory cache leaked across requests (shared object mutation).
3. Fixed: moved to Redis-only cache, added a per-request scope guard.
4. Post-mortem: added a Playwright test for "user A can't see user B's data even under load."
**Result:** Bug present for 12 minutes. No customer data was actually stored — the tree was folder names, not data. Wrote a blameless post-mortem, adopted key-scoping-lint rule.

## 7.E.2 Debugging Skills — Named Patterns

- **Binary search.** Bisect commits, features, users.
- **Rubber duck.** Explain the problem to a duck / colleague / yourself.
- **Simplify.** Reduce to a minimal repro.
- **Change one thing.** Never batch fixes.
- **Read the docs.** RTFM is a superpower.
- **Print statements > debuggers.** Sometimes. In async / distributed, structured logs win.
- **Reproduce before fixing.** A fix without repro is a hope.

## 7.E.3 Incident Response Vocabulary

- **MTTR** — mean time to resolution.
- **RTO** — recovery time objective (how fast).
- **RPO** — recovery point objective (how much data loss OK).
- **SLI** — service level indicator (measurement).
- **SLO** — service level objective (target).
- **SLA** — service level agreement (contract, penalties).
- **Post-mortem** — blameless doc, root cause, action items.
- **Runbook** — step-by-step "when X happens, do Y."

## 7.E.4 The "Have you paged at 3AM?" Answer

> "Yes — my on-call rotation at SAP included Launchpad. A memorable one was a certificate rotation that broke SSO in EMEA. I rolled to the previous cert, filed a bridge call, and the fix went live within 45 minutes. **The interesting part is what came after** — I wrote the runbook so nobody else pages for that again. Every incident is a chance to remove the class, not just the instance."

Next → **Chapter 8 — Behavioral · Traps · Cheat Sheet.**
