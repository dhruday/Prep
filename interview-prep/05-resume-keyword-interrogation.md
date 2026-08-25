# Chapter 5 — Resume Keyword Interrogation

*Memory hook: **"Every number is a question waiting to happen."***

Interviewers scan your resume for **claims** and **numbers**. Every one of them is a trap. This chapter goes **claim-by-claim** with the exact drilldown questions and the answers you'll give.

**Format for each claim:**
- **Claim** — exact resume phrase
- **Q →** likely interviewer follow-up
- **A →** your prepared answer
- **⚠ Trap** — what NOT to say

---

## 5.1 Header & Summary

### Claim: "8+ years architecting high-scale, performant, and secure web applications"

**Q1:** *"What does 'high-scale' mean for you?"*
**A:** "Concurrent users in the thousands and dataset sizes in the tens of millions of rows for enterprise reporting. Not consumer-scale like Instagram, but enterprise-critical — downtime = CEO escalation."
**⚠ Trap:** Don't claim FAANG-scale. Be honest — enterprise B2B scale is respected.

**Q2:** *"Break the 8 years into skill areas."*
**A:** "2 years Angular fundamentals (Capgemini + early Oracle). 2 years component libraries + testing culture (Oracle + Bosch). 4 years React architecture + performance + security + micro-frontends (SAP)."

### Claim: "Lighthouse score 60 → 95+"

**Q1:** *"On what page, which device, which network?"*
**A:** "Landing + folder browser, measured on median mobile (throttled to 4× CPU slowdown, slow 4G) via Lighthouse CI on every PR. Numbers are p75."

**Q2:** *"What were the top 3 wins?"*
**A:** "(1) Route-level code split — initial JS from 1.2MB to ~480KB. (2) Image strategy — AVIF + `<picture>` + `fetchpriority=high` on hero → LCP down ~40%. (3) Replaced React with Preact-compat on a rarely-used legacy view — saved 30KB and unblocked lazy-load of the shell."
**⚠ Trap:** Don't say "we optimized everything." Interviewers spot vagueness.

### Claim: "Page-load time −45%"

**Q:** *"Which metric? p50 or p95? Same URL before/after?"*
**A:** "LCP p75 from Sentry Performance RUM — real user data, not lab. Same landing route, same customer cohorts, month-over-month comparison. ~5.0s → ~2.7s."

### Claim: "Reported vulnerabilities −80%"

**Q:** *"Reported by whom, measured how?"*
**A:** "SAP internal Fortify SAST plus quarterly third-party pentest. Baseline 45 critical+high, post-hardening 9. Metric is critical + high; I ignore informational."

### Claim: "Test coverage 0 → 85%"

**Q:** *"Line coverage or branch coverage? On what?"*
**A:** "Line coverage from Karma / Istanbul on the Oracle Angular product. Branch coverage on core business modules was closer to 95%. I don't chase 100% — the last 15% is glue code and rarely worth the maintenance cost."

### Claim: "Enterprise clients in 50+ countries"

**Q:** *"How much of that was you?"*
**A:** "Zero of the sales geography — that's SAP. My contribution is the frontend layer that ships to those customers. I claim the engineering impact, not the customer count."
**⚠ Trap:** Don't inflate. Interviewers hate BS.

### Claim: "SAP 'Excellence in Frontend Engineering' award"

**Q:** *"How is that awarded?"*
**A:** "Nominated by peers or manager, reviewed by a cross-org panel, awarded quarterly. Mine was Q4 2023 for the Launchpad rewrite hitting Lighthouse 95+ and WCAG-AA."

---

## 5.2 Technical Skills Section

For each skill, be able to answer: *"When did you last write this? What's a subtle gotcha?"*

### React

**Q:** *"What React feature did you use most recently?"*
**A:** "Suspense with `use()` for streaming a large report descriptor in NiftyLens. The gotcha: `use()` can only be called during render, not in event handlers."

### Redux / RTK

**Q:** *"Why RTK not Redux vanilla?"*
**A:** "Immer + createSlice removes 70% of boilerplate. Also RTK Query pretty much killed our need for a separate data-fetching layer."

### Next.js

**Q:** *"App Router or Pages Router?"*
**A:** "App Router for NiftyLens, since 2024 that's the recommended path. RSC + streaming was the reason to pick it."

### Angular

**Q:** *"Signals or Zone.js today?"*
**A:** "Signals — they solve the OnPush-everywhere pain and give fine-grained reactivity. My Bosch app was Zone-based; a greenfield today I'd start with Signals + standalone components."

### TypeScript

**Q:** *"Favorite TS feature?"*
**A:** "Template literal types + `satisfies` for typed route configs. Second favorite: discriminated unions for state machines."

**Q:** *"When have you fought TypeScript?"*
**A:** "Higher-kinded types — libraries like fp-ts need workarounds. Also generic inference on curried functions. Usually the answer is: rewrite the API surface, don't fight the compiler."

### JavaScript (ES2022+)

**Q:** *"Top of head — ES2022 features?"*
**A:** "`.at()` for arrays, `Object.hasOwn()`, top-level await, private class fields (`#foo`), error `.cause`, Array.prototype.findLast."

### RxJS

**Q:** *"Explain switchMap vs mergeMap."*
**A:** "Both flatten inner observables. `switchMap` **cancels** the previous inner obs when a new outer value arrives — great for typeahead. `mergeMap` keeps them all running in parallel — great for uploads. `concatMap` queues them — great for ordered writes."

### HTML5 / CSS3 / SCSS

**Q:** *"When to use Grid over Flexbox?"*
**A:** "Grid for 2D — page layouts, dashboards with rows AND columns. Flex for 1D — a toolbar, a card row. Use both together often."

**Q:** *"Container queries — used them?"*
**A:** "Yes, for Launchpad's embedded viewer where the container size doesn't match the viewport. Killed a lot of viewport-based media query hacks."

### Node.js / Express

**Q:** *"Why Express and not Fastify?"*
**A:** "Legacy at SAP — the older services predate Fastify. Greenfield today I'd choose Fastify for the throughput and native TS support. Or Hono if edge-runtime."

### Java / Spring Boot

**Q:** *"Beans scope?"*
**A:** "Singleton by default, prototype for per-request objects, request/session scopes for web. Most services should be singleton and stateless."

### GraphQL

**Q:** *"N+1 fix?"*
**A:** "DataLoader batching. Each resolver enqueues a key, DataLoader batches all keys in one tick, single DB call, returns keyed results."

### WebSocket

**Q:** *"Scaling WS horizontally?"*
**A:** "Sticky sessions at the load balancer OR a Redis pub/sub fan-out so any node can broadcast to any user's socket. We used the pub/sub model — nodes are truly stateless."

### Jest / RTL / Playwright / Cypress / Jasmine / Karma

**Q:** *"Playwright over Cypress — why?"*
**A:** "Playwright: multi-tab, multi-context, iframe support, all browsers including WebKit, better parallelism, native TypeScript. Cypress: friendlier debug UI, but architecturally locked to Chromium-family + iframe pain for us."

### Micro-Frontends

**Q:** *"When does an MFE become a distraction?"*
**A:** "When teams are small (< 3), when release cadence is aligned across features, or when the shared-runtime coupling causes more incidents than the org saves in coordination. MFE is an org solution, not a tech solution."

### SSR, SSG, Code Splitting, Lazy Loading, Tree Shaking, Bundle Optimization

**Q:** *"What breaks tree shaking?"*
**A:** "CommonJS require, side-effectful modules without `"sideEffects": false` in package.json, re-exports through a barrel that pulls the whole tree, and dynamic property access on module exports. Fix: pure ES modules + explicit imports + sideEffects declaration."

### Webpack, Vite, Babel

**Q:** *"Vite prod — why Rollup, not esbuild?"*
**A:** "Rollup produces smaller, cleaner output because it does better tree-shaking and code-splitting than esbuild. esbuild is used for TS/JSX transform in dev only. Rolldown (Rust rewrite of Rollup) is the future."

### AWS (S3, CloudFront, Lambda)

**Q:** *"Lambda cold-start mitigation?"*
**A:** "Provisioned concurrency for latency-critical paths. Smaller deployment package. Prefer Node.js / Bun over Java for cold-start. Lambda@Edge / CloudFront Functions for header manipulation — zero cold start."

### Docker / Kubernetes

**Q:** *"Multi-stage Dockerfile — why?"*
**A:** "Build stage has heavy tooling (npm, tsc), runtime stage only ships the compiled output. Cuts image size 5–10× and removes attack surface (no build tools in prod)."

**Q:** *"Liveness vs Readiness — one-line difference?"*
**A:** "Liveness fails → pod restarted. Readiness fails → traffic stops but pod lives. Rule: readiness should be cheap and shallow; liveness should catch true deadlocks."

### CI/CD (Jenkins, GitHub Actions)

**Q:** *"Secret handling?"*
**A:** "OIDC to the cloud provider (short-lived tokens, no long-lived secrets in CI). If secrets required, GitHub environment secrets or Vault, never in a repo file, never in logs."

### SAP BTP

**Q:** *"What's XSUAA?"*
**A:** "SAP's OAuth 2 authorization server on BTP. Issues JWTs for authenticated users, maps SAP identity provider (IAS / IdP) roles to app scopes. Approuter validates + forwards."

### Security — CSP, XSS, OWASP, JWT, OAuth

*See Chapter 2 § 2.22 — memorize.*

### n8n, LLM API, Prompt Engineering

**Q:** *"When have you used n8n in production?"*
**A:** "For NiftyLens I use it to schedule the nightly Claude analysis run and to funnel completed analyses into an email digest. It's not production-critical — if it dies, users still see cached scores."

**Q:** *"How do you version prompts?"*
**A:** "Git-tracked prompt files. Each version has an eval suite — a set of (input, expected traits) pairs. New prompt must beat the old one on evals before it ships."

### GitHub Copilot, Cursor

**Q:** *"How do you use AI without becoming dependent?"*
**A:** "Two rules. First, I write the tests first — Copilot fills in the implementation. Test-driven pins the correctness. Second, I never ship code I couldn't have written myself. AI accelerates typing, not thinking."

---

## 5.3 SAP Bullet-by-Bullet

### "Architected a full React/Redux overhaul... establishing a component-driven design system adopted by 3 cross-functional teams"

**Q:** *"What was the design system built on?"*
**A:** "Radix UI primitives + design tokens (spacing, color, typography) + typed React components published as an internal npm package. Storybook was the source of truth. Chromatic for visual regression."

**Q:** *"How did you get 3 teams to adopt it?"*
**A:** "Not by mandate. I made it easier to use than not: a component was 30% less code than DIY, plus a11y + theme + tests came for free. Adoption was pull, not push."

### "Eliminating recurring cross-team deployment conflicts"

**Q:** *"Concrete conflict example."*
**A:** "Two teams shipping to the same repo — one changes shared header, another rebases and their footer PR breaks. Weekly. Post-MFE, each team owns a repo + independent CDN entry — zero cross-team merge conflicts."

### "Drove Lighthouse score 60 → 95+"

*See §5.1.*

### "45% page-load reduction"

*See §5.1.*

### "Engineered frontend security hardening with CSP, XSS sanitization, OWASP-aligned secure HTTP headers... 80% vulnerability reduction, zero critical incidents"

**Q:** *"Which OWASP items did the 80% cover?"*
**A:** "Mostly A03 (Injection — XSS), A05 (Security Misconfiguration — missing headers), A06 (Vulnerable & Outdated Components — dep upgrades), and A07 (Auth failures — cookie hardening). Server-side items like SSRF weren't my scope."

**Q:** *"What is a 'critical incident' in this context?"*
**A:** "P0 security incident meaning customer data exposure or exploitable production vulnerability. Post-hardening we had **zero P0s** in the 12 months following rollout — that's the strong claim, not the 80%."

### "Led WCAG-AA accessibility certification, remediating 30+ violations"

**Q:** *"What kind of violations?"*
**A:** "Contrast (color palette redesign for 4 buttons), keyboard traps in modals (added focus trap + Escape), missing landmarks (semantic HTML), image alt text (audit + fix), form labels, ARIA misuse (removed `role="button"` from `<button>` — redundant)."

**Q:** *"How do you keep it AA over time?"*
**A:** "axe-core in Playwright — every E2E page runs an a11y snapshot. Regressions block PRs. Quarterly manual QA on NVDA + VoiceOver for full flows."

### "Designed micro-frontend module architecture... accelerating release cadence ~30%"

**Q:** *"How do you measure release cadence?"*
**A:** "Deploys per week per team. Before MFE: shared repo, monthly release train. After: each MFE deploys on its own schedule — mean 3–4 deploys/week/team. That's roughly a 30% shorter median lead-time from PR-merge to prod."

### "Mentored 4 junior engineers... reduced rework cycles by 30% within 6 months"

**Q:** *"How did you mentor?"*
**A:** "Three tactics: (1) code review with **rubber-duck reasoning** — I asked *why*, not just annotated *what*. (2) Pair-programming 2h/week on their hardest tickets. (3) Weekly 1:1s focused on their career map, not my project deadlines."

**Q:** *"How did you measure rework?"*
**A:** "PRs that required > 2 review rounds before merge. Baseline ~35% of PRs, post-mentoring ~25%. Not a perfect metric but a real signal."

### "Presented 'Frontend Performance Patterns at Scale' at SAP Internal Tech Forum (2023)"

**Q:** *"Give me 3 patterns from that talk."*
**A:** "(1) *Ship less JS, ship it later* — route-level code split + defer non-critical. (2) *Escape the fold* — LCP is a distinct problem from TTI, treat them separately. (3) *Measure like a user* — RUM beats lab for regression signals, use lab for pre-merge gates."

---

## 5.4 Bosch Bullet-by-Bullet

### "Real-time industrial monitoring dashboards from scratch using Angular + WebSocket... ~15 production lines"

**Q:** *"How many concurrent WebSocket connections?"*
**A:** "Peak ~100 per plant (operators + supervisors). Per-connection state was tiny — subscription list only. Bottleneck was Redis pub/sub throughput, not connection count."

### "Refactored 20+ legacy Angular components... 25% render improvement"

*See §4.1.4.*

### "Cross-browser compatibility failures across Chrome, Firefox, Edge"

**Q:** *"Was IE required?"*
**A:** "Yes, one legacy plant. We polyfilled + progressive-enhanced — IE got a simplified view without live charts."

### "Spring Boot microservices via REST/WebSocket in Docker/Kubernetes... ~20% deployment failure reduction"

**Q:** *"What was the failure mode?"*
**A:** "Two things: (1) Spring Boot readiness probes hit the DB → cascading failure if DB slow. Fix: shallow readiness. (2) Ungraceful WebSocket termination on pod death. Fix: SIGTERM handler that broadcasts a disconnect notice and drains the socket buffer."

---

## 5.5 Oracle & Capgemini

Already covered in §5.1 (test coverage) and Ch 4.

---

## 5.6 Projects Section

### NiftyLens

**Q:** *"Is this a business, or a personal project?"*
**A:** "Personal. It started as an experiment for a content creator I follow. It's live, open-source, and I use it myself. Not monetized — the point was learning the 2026 stack (RSC, LLM APIs, edge) end-to-end."

**Q:** *"Metrics — 4h → 30m — how measured?"*
**A:** "The creator's own report — before, one video's research took a day of manual reading. After, they use the platform to shortlist candidates in ~30 minutes and do deep-dives only on the top 3. It's a workflow claim, not a systems claim."

### PerfScan

**Q:** *"Real users?"*
**A:** "SAP internally. Public open-source, but I don't oversell adoption — single-digit external contributors. I built it because I needed it; it's on my resume because it shipped and got used."

---

## 5.7 Awards & Education

### "Speaker at SAP Internal Tech Forum"

**Q:** *"Only SAP-internal? Any public talks?"*
**A:** "Only internal so far. That's on my 2026 goals — a JSConf or React India lightning talk on Module Federation migrations."

### "B.Tech, Electronics & Communication Engineering"

**Q:** *"Why software after ECE?"*
**A:** "Signals + control theory got me hooked on real-time systems, but I found the code side of the work more creative. Capgemini's campus hire program was the bridge."

**Q:** *"Any CS gaps you've had to close?"*
**A:** "Yes — algorithms and OS internals were self-study. I did MIT 6.006 online + LeetCode over two years. Not a Stanford-CS depth, but I hold my own in system design and can reason about complexity."

---

## 5.8 Number Cheat Sheet (Memorize)

| Number | Context | Measurement |
|---|---|---|
| **8+** years | Total experience | Since Jun 2018 |
| **60 → 95+** | Lighthouse score | Median mobile, 4G, Lighthouse CI, p75 |
| **45%** | Page-load reduction | Sentry RUM LCP p75, month over month |
| **80%** | Vulnerability reduction | Fortify + pentest, critical + high |
| **30+** | WCAG violations remediated | axe-core baseline count |
| **50+** | Countries | SAP customer geography, not personal |
| **3** | Cross-functional teams adopting DS | Launchpad, Analytics, Admin |
| **4** | Junior engineers mentored | Direct 1:1 |
| **30%** | Rework reduction | PR review rounds |
| **~30%** | Release cadence gain | Weekly deploys / team post-MFE |
| **20+** | Angular components refactored | Bosch WebCore migration |
| **25%** | Render improvement | Chrome Perf panel, same dataset |
| **~15** | Production lines dashboards | Bosch plant count |
| **~20%** | Deployment failure reduction | Bosch K8s pipeline |
| **35%** | UI implementation time saved | Oracle component lib adoption |
| **85%** | Test coverage | Oracle, line coverage via Karma/Istanbul |
| **1.2MB → 480KB** | Initial JS bundle | Vite prod build |
| **45 → 9** | Critical+high vulns | Fortify + external pentest |

**Rehearsal drill:** Cover the right column. State every metric's source. If you can't, don't use the number.

Next → **Chapter 6 — System Design, Coding, DB, API.**
