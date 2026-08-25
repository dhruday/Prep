# Chapter 2 — Every Technology on the Resume

*Memory hook: **"What it is → Why I picked it → How it works inside → What I gave up."***

**For every tech below, be ready to answer these 7 questions:**
1. What is it? (1 line)
2. Why did you use it? (1 trade-off)
3. How does it work internally? (1 mental model)
4. Alternatives? (2–3 named)
5. Trade-offs? (what you lose)
6. Production considerations? (1 gotcha)
7. 2026-relevant practice? (what changed recently)

---

## 2.1 React ⭐🔥

**What:** A JavaScript library for building UIs from small, reusable components.

**Why:** Huge ecosystem, hire-ability, matches our component-driven design system, and the render model fits data-heavy dashboards.

**How it works inside (mental model):**
- You write **components** that return **JSX** (a description of UI, not the UI).
- React builds a **virtual DOM tree** from JSX.
- On state change it builds a **new tree**, compares (**reconciliation**) with the previous, and applies the **minimum diff** to the real DOM.
- Since React 18, work runs on a **fiber scheduler** — rendering is **interruptible** and **prioritized** (urgent updates like typing beat non-urgent ones like list re-renders).

*Memory hook: **"Describe the UI, React finds the diff."***

**Alternatives:** Vue (simpler API), Svelte (compile-time, no VDOM), SolidJS (fine-grained reactivity), Angular (batteries-included framework).

**Trade-offs you gave up:**
- Bigger bundle than Svelte / Solid.
- No opinionated structure — every team invents their own patterns.
- Hooks are easy to misuse (stale closures, missing deps).

**Production considerations:**
- Set a **key** on lists — no key = wrong reuse = subtle bugs.
- `useMemo` and `useCallback` are **not free** — profile first.
- Concurrent features need `startTransition` for non-urgent updates.

**2026 practices:**
- **React Server Components (RSC)** — server-rendered components with zero JS shipped.
- **React 19** — `use()` hook, actions, form state, `useOptimistic`.
- **Compiler (React Forget)** — auto-memoization, killing most `useMemo` boilerplate.

**Follow-up questions:**
- *"What is reconciliation?"* → tree diff algorithm, O(n) with same-type + key heuristics.
- *"Fiber vs Stack reconciler?"* → Fiber is interruptible; Stack was recursive and blocking.
- *"When would you NOT use React?"* → Static content site (use Astro / plain HTML), tiny widget (Preact / Svelte), extreme real-time perf (Solid).

---

## 2.2 Redux + Redux Toolkit ⭐🔥

**What:** Predictable state container. One store, pure reducers, actions describe changes.

**Why:** Cross-cutting state (auth, user prefs, feature flags) shared across 3 micro-frontends. Time-travel debugging saved us during the migration.

**How it works inside:**
```
UI ──dispatch(action)──▶ reducer(state, action) → newState ──▶ subscribers re-render
```
- **Reducers are pure** — same input, same output, no side effects.
- **Middleware** intercepts actions (`redux-thunk` for async, `redux-saga` for orchestration).
- **Redux Toolkit (RTK)** adds `createSlice` (auto-generates action creators + reducers) and uses **Immer** so you can "mutate" state safely.

*Memory hook: **"Slices, not reducers. Immer, not spread."***

**Alternatives:**
- **Zustand** — 1KB, no boilerplate, hooks-first.
- **Jotai / Recoil** — atomic state.
- **TanStack Query** — server state (replaces 80% of Redux usage in 2026).
- **React Context** — for low-frequency, small state.

**Trade-offs:**
- Boilerplate (mitigated by RTK).
- Overkill for local state.
- Middleware chains can hide bugs.

**Production considerations:**
- Never put non-serializable stuff (Dates, functions, class instances) — breaks time-travel and persistence.
- Selectors must be **memoized** (`reselect` / `createSelector`) or you re-render on every change.
- **Normalize** deeply nested data (`{ byId, allIds }`) — avoids deep updates.

**2026 practice:** Split **server state (TanStack Query)** from **client state (Zustand / RTK)**. Don't put API responses in Redux anymore.

**Follow-up:**
- *"Why not just use Context?"* → Context re-renders **every consumer** on any change. Redux uses `useSelector` with equality check.
- *"When would you drop Redux today?"* → New greenfield app with mostly server state → TanStack Query + Zustand for UI state.

---

## 2.3 Next.js

**What:** React meta-framework with routing, SSR, SSG, ISR, and RSC baked in.

**Why (NiftyLens):** SEO for public stock pages + fast time-to-content via SSR + Vercel edge cache.

**How it works:**
- **App Router** uses React Server Components by default.
- **Rendering modes:**
  - **SSR** — HTML built per request on the server.
  - **SSG** — HTML built at build time.
  - **ISR** — SSG + revalidate on a schedule.
  - **CSR** — pure client render.
- **Edge runtime** for low-latency APIs (V8 isolates, no cold start).

*Memory hook: **"Static when you can, server when you must, client when you have to."***

**Alternatives:** Remix (nested routing, web standards first), Astro (islands), Nuxt (Vue), SvelteKit.

**Trade-offs:** Vendor pull (Vercel), server complexity, RSC learning curve.

**2026:** Partial Prerendering (PPR), server actions replacing most APIs, streaming SSR default.

**Follow-up:** *"When SSR vs SSG?"* → SSR for personalized/frequently-changing data, SSG for public static content.

---

## 2.4 Angular

**What:** Opinionated, batteries-included TS framework — DI, RxJS, forms, router.

**Why (Bosch, Oracle):** Enterprise-friendly, strong typing, DI makes testing easy, RxJS is perfect for real-time streams.

**How it works:**
- **Modules → Components → Services** wired by **Dependency Injection**.
- **Change detection** runs via **Zone.js** (patches async APIs), or in 2026 via **Signals** (fine-grained reactivity, no Zone.js).
- **Ivy** compiler produces small tree-shakable bundles.

*Memory hook: **"Framework, not library. Everything comes in the box."***

**Alternatives:** React + a-la-carte libs, Vue.

**Trade-offs:** Steeper learning curve, RxJS operators are hard, bundle historically larger.

**2026:** **Signals-based reactivity** (default in v18+), standalone components (no NgModules), deferred views, zoneless.

**Follow-up:**
- *"Zone.js vs Signals?"* → Zone patches every async call; Signals track only what a component actually reads. Signals are faster and more predictable.
- *"When Angular over React?"* → Large enterprise team, long-lived product, standardization matters more than freedom.

---

## 2.5 TypeScript ⭐

**What:** JS with a static type system that compiles to JS.

**Why:** Refactor safety on 200k+ LOC. Types are documentation that can't lie.

**How it works:** `tsc` type-checks then strips types → JS. No runtime cost. `strict: true` catches ~15% of bugs pre-runtime.

**Alternatives:** JSDoc (types in comments — used by Svelte, Rome, VS Code), Flow (dead).

**Trade-offs:** Compile step, `any` escape hatch, some libs still un-typed.

**Production tips:**
- `strict: true` from day 1.
- Ban `any` in code review — use `unknown` if unsure.
- Generics beat overloads for reusable utilities.

**2026:** Type-checker rewritten in Go (10× faster), `satisfies` operator is standard, `const` type parameters, less need for `zod` schemas thanks to standardized decorators.

**Follow-up:**
- *"`any` vs `unknown`?"* → `any` disables type checks; `unknown` forces you to narrow before use. Prefer `unknown`.
- *"Type vs Interface?"* → Interfaces merge and are open; types can express unions and mapped types. Use `type` unless you need extension merging.

---

## 2.6 JavaScript (ES2022+) ⭐🔥

**Must know cold:**

| Concept | 1-line explanation | Trap |
|---|---|---|
| **Event loop** | Call stack + Web APIs + macrotask + microtask queues. | Microtasks (Promise callbacks) drain **fully** before next macrotask. |
| **Closures** | Function remembers its lexical scope. | `for var i` in setTimeout logs the last i — use `let`. |
| **`this`** | Depends on call site, not definition site. | Arrow functions **inherit** `this`; regular functions get theirs from the caller. |
| **Promises** | State machine: pending → fulfilled / rejected. | `.then` always returns a new Promise. Chain, don't nest. |
| **async/await** | Sugar over Promises. `await` pauses the function, not the thread. | An unawaited promise = silent floating error. |
| **Prototype chain** | Object lookup walks `__proto__` up to `null`. | `hasOwnProperty` avoids inherited props. |
| **Modules** | `import` is static, hoisted, and live-bound. | Dynamic `import()` returns a Promise — used for code splitting. |
| **Iterators / generators** | Lazy sequences. `function*` + `yield`. | Great for large streams; poor for random access. |
| **Structured clone** | `structuredClone(obj)` — real deep clone. | Doesn't clone functions, DOM nodes, or class prototypes. |

**2026:** `Temporal` API (finally kills `Date`), pipeline operator `|>`, `Array.prototype.groupBy`, decorators stable.

**Interview trap questions:**
- **"What logs?"**
  ```js
  console.log(1);
  setTimeout(() => console.log(2), 0);
  Promise.resolve().then(() => console.log(3));
  console.log(4);
  ```
  Answer: `1, 4, 3, 2`. Sync runs first; microtask (Promise) before macrotask (setTimeout).

- **"Why is `typeof null === 'object'`?"** JS legacy bug from 1995. Kept for backward compat.

- **"Difference between `==` and `===`?"** `==` does type coercion. Use `===` always, except `x == null` to check null-or-undefined.

---

## 2.7 HTML5, CSS3, SCSS

**HTML5 must-know:** semantic tags (`<main>`, `<nav>`, `<article>`), ARIA landmarks, `<dialog>`, `loading="lazy"`, `<picture>` for responsive images.

**CSS3 must-know:**
- **Cascade order:** inline > id > class > element > `*`. `!important` breaks the cascade — avoid.
- **Specificity math:** `(inline, id, class, element)`.
- **Box model:** `content-box` vs `border-box` (use `border-box`).
- **Flexbox** for 1D, **Grid** for 2D.
- **Container queries** (2023+) — style based on parent size, not viewport.
- **`:has()`** — parent selector (finally!).
- **Cascade layers** (`@layer`) — control specificity without hacks.

*Memory hook: **"Flex is a line, Grid is a page."***

**SCSS:** Variables, mixins, nesting, `@use`, `@forward`. In 2026, native CSS has most of this — SCSS mostly for legacy or complex mixins.

**2026:** CSS **nesting** native, `color-mix()`, `light-dark()`, view transitions API, subgrid everywhere.

---

## 2.8 React Hooks (deep) ⭐🔥

| Hook | Purpose | Trap |
|---|---|---|
| `useState` | Local state | Batched in event handlers (React 18+ everywhere). |
| `useEffect` | Side effects after render | Runs **twice in dev** (Strict Mode). Cleanup must be idempotent. |
| `useLayoutEffect` | Sync after DOM mutation, before paint | Blocks paint — use sparingly. |
| `useMemo` | Cache a computed value | Not free — measure before adding. |
| `useCallback` | Cache a function reference | Only helps if child is memoized. |
| `useRef` | Mutable value that survives renders | Doesn't trigger re-render. |
| `useContext` | Read a Context | Every consumer re-renders on Context value change. |
| `useReducer` | Complex state transitions | Prefer when next state depends on prev + action. |
| `useTransition` | Mark update as non-urgent | Keeps UI responsive during heavy renders. |
| `useDeferredValue` | Debounce a value for rendering | Great for search boxes with expensive result lists. |
| `useId` | Stable SSR-safe IDs | Use for aria-labelledby, form label linking. |
| `use()` (React 19) | Unwrap a promise in render | Enables Suspense for data fetching. |

**Rules of Hooks (ask cold):**
1. Only call at the top level.
2. Only call from React functions.
3. Deps array — **include every value you read**.

**Custom hook = extraction of stateful logic.** Naming: `useX`.

---

## 2.9 RxJS

**What:** Reactive streams library — Observables + operators.

**Why (Bosch):** WebSocket telemetry naturally fits `Observable<Reading>`. Backpressure, retry, debounce all built-in.

**Core mental model:** `Observable = lazy stream + subscribers`.

**Must-know operators:**
- `map` / `filter` — transform / drop
- `switchMap` — cancel previous inner obs (typeahead)
- `mergeMap` — parallel inner obs (uploads)
- `concatMap` — sequential (order matters)
- `debounceTime` — wait for pause (search input)
- `retryWhen` — reconnect on WebSocket drop
- `combineLatest` / `withLatestFrom` — merge streams

**Trap:** Forgetting to `unsubscribe` = memory leak. Use `takeUntil(destroy$)` pattern or `async` pipe in Angular templates.

*Memory hook: **"Switch cancels, Merge parallels, Concat queues."***

---

## 2.10 Node.js + Express ⭐

**What:** JS runtime on V8 with a non-blocking, event-driven I/O model.

**Mental model:**
```
JS thread (single) ──▶ libuv thread pool (I/O) ──▶ event loop drains callbacks
```
- **Single-threaded** for JS execution.
- **Blocking JS blocks the whole process** — never do `fs.readFileSync` in a request handler.
- **CPU-heavy work?** Worker threads or offload to a queue.

**Express** = minimal middleware chain. Every request walks a stack of `(req, res, next) => …`.

**2026 practices:**
- Prefer **Fastify** over Express (2×+ throughput, TS-first).
- **HTTP/2** and **HTTP/3** support.
- **`node:` prefix** for built-ins (`import fs from 'node:fs'`).
- Built-in `--test` runner, `--watch` mode, permission model.

**Trap questions:**
- *"How is Node single-threaded but handles concurrency?"* → JS runs on one thread; I/O offloaded to libuv thread pool. Event loop dispatches completions back.
- *"Why is Node bad for CPU work?"* → Blocks the event loop. Use worker_threads or a separate service.
- *"What's `process.nextTick` vs `setImmediate`?"* → `nextTick` runs before the next event loop phase; `setImmediate` runs on the check phase. `nextTick` is higher priority.

---

## 2.11 Java + Spring Boot

**Why (SAP, Bosch, Oracle):** BOE server, factory telemetry, and financial services all run on JVM.

**Must-know:**
- **Spring Boot** = auto-config + embedded server + starter dependencies.
- **DI** via `@Autowired` / constructor injection (prefer constructor).
- **`@RestController` + `@GetMapping`** = REST endpoint.
- **JPA / Hibernate** — ORM. Beware N+1 (fetch eagerly, or use `@EntityGraph`).
- **Actuator** — health, metrics, tracing endpoints.

**2026:** Spring Boot 3.x, **native image via GraalVM** (millisecond cold start), virtual threads (Loom), records for DTOs.

---

## 2.12 REST APIs ⭐

**Rules:**
1. **Nouns, not verbs:** `GET /users/42` not `GET /getUser?id=42`.
2. **HTTP verbs:** GET (read), POST (create), PUT (replace), PATCH (partial update), DELETE.
3. **Status codes:** 2xx success, 3xx redirect, 4xx client, 5xx server. Know `201 Created`, `204 No Content`, `304 Not Modified`, `409 Conflict`, `422 Unprocessable`, `429 Rate Limited`.
4. **Idempotency:** GET, PUT, DELETE = idempotent. POST = not.
5. **Versioning:** `/v1/` or `Accept: application/vnd.myapi.v1+json`.
6. **HATEOAS** rarely used in practice.

**2026:** OpenAPI 3.1, **tRPC** for TS-only monorepos, **gRPC** for internal service-to-service, **GraphQL** where clients need flexible shapes.

---

## 2.13 GraphQL

**What:** Query language where the client asks for exactly the fields it wants.

**Why:** Over-fetching / under-fetching gone. One endpoint, typed schema.

**How it works:** Client sends a query → resolver functions on server fetch each field.

**Traps:**
- **N+1** — use **DataLoader** batching.
- **Query cost / depth limiting** — malicious deep queries can DoS.
- **Caching is harder** than REST (no HTTP verbs / URLs to key on).

**2026:** Federation (Apollo, Hive), persisted queries, Relay-style pagination is standard.

---

## 2.14 WebSocket ⭐

**What:** Full-duplex TCP connection over HTTP-upgraded socket.

**Why (Bosch):** Live telemetry, sub-second latency, server-push.

**Alternatives (know these!):**
| Tech | Direction | Best for |
|---|---|---|
| Polling | client → server | dumb clients, low freq |
| Long-polling | client → server | firewalled envs |
| **SSE** (Server-Sent Events) | server → client only | notifications, one-way streams |
| **WebSocket** | bi-directional | chat, games, telemetry |
| **WebTransport** (2026) | bi-directional, HTTP/3, unreliable OK | low-latency streaming, better than WS |

**Production considerations:**
- **Heartbeat** every 30s to keep alive through NAT / proxies.
- **Reconnection with backoff** — exponential, jitter.
- **Sticky sessions or a Redis pub-sub fanout** for horizontal scaling.
- **Message ordering** not guaranteed across reconnects — send monotonic IDs.

---

## 2.15 Performance & Core Web Vitals ⭐🔥

*Memory hook: **"LCP paints, INP responds, CLS stays still."***

| Metric | What | Good | How to fix |
|---|---|---|---|
| **LCP** — Largest Contentful Paint | Time until biggest above-the-fold element renders | < 2.5s | Preload hero image, `fetchpriority=high`, SSR, CDN, AVIF/WebP |
| **INP** — Interaction to Next Paint (replaced FID in 2024) | Longest time from user input to paint | < 200ms | Break up long tasks, `startTransition`, code-split heavy components |
| **CLS** — Cumulative Layout Shift | Total unexpected layout shift | < 0.1 | Reserve space (width/height attrs), avoid inserting content above existing |

**Extra 2026 metrics you should mention:**
- **TTFB** — server response speed
- **FCP** — first paint
- **TBT** — total blocking time (lab)
- **INP** replaced FID as the responsiveness Core Web Vital

**Optimization playbook (know cold):**
1. **Ship less JS** — code-split, tree-shake, remove polyfills for evergreen browsers.
2. **Ship it later** — `defer` / `async`, lazy-load below-the-fold, `content-visibility: auto`.
3. **Cache it forever** — hashed filenames + immutable Cache-Control, CDN, service worker.
4. **Prioritize** — `fetchpriority`, `preconnect`, `dns-prefetch`, resource hints.
5. **Images** — `<picture>`, AVIF, correct sizes, `loading=lazy`.

---

## 2.16 Testing ⭐

*Memory hook: **"Test behavior, not implementation."***

| Level | Tool (2026) | Rule |
|---|---|---|
| Unit | Vitest / Jest | Fast, isolated, no I/O. |
| Component | React Testing Library / Testing Library | Query by role / label — how the **user** sees it. |
| Integration | Vitest + MSW (Mock Service Worker) | Real components, mocked network. |
| E2E | **Playwright** (Cypress is fading) | Real browser, real APIs (test env). |
| Visual | Chromatic / Percy | Catch pixel drift. |
| Perf | Lighthouse CI, WebPageTest | Regression gate. |
| Accessibility | axe-core, Playwright a11y snapshot | WCAG-AA in CI. |

**Rules:**
- Testing Library's mantra: *"The more your tests resemble the way your software is used, the more confidence they can give you."*
- **Never test implementation details** (state names, method calls). Test **user-visible outcomes**.
- **Coverage is a proxy, not a goal.** 85% meaningful > 100% shallow.
- Flaky test? **Delete it or fix its root cause.** Never retry-until-green in CI.

**Follow-up:**
- *"Snapshot tests — good or bad?"* → Good for stable output (schemas, translations); bad for UI (auto-approved noise). Use them sparingly.

---

## 2.17 Webpack / Vite / Babel

**Webpack:** module bundler, mature, plugin ecosystem huge. Slow cold start.
**Vite:** dev = native ESM (blazing fast HMR), prod = Rollup. Default in 2026.
**Babel:** JS-to-JS transpiler. In 2026 mostly replaced by **SWC** or **esbuild** (10–100× faster).

**Must-know concepts:**
- **Code splitting** — dynamic `import()` creates a new chunk.
- **Tree shaking** — dead code elimination for ES modules. Requires `sideEffects: false` in package.json.
- **Chunking strategies** — vendor split, route split, per-route split.
- **Content hashing** — `[contenthash]` in filename for immutable caching.

*Memory hook: **"Vite dev, Rollup prod. Webpack for legacy."***

---

## 2.18 AWS (S3, CloudFront, Lambda)

**S3:** Object storage. Cheap, durable (11 nines). Static site hosting + versioning + lifecycle policies.
**CloudFront:** CDN. Edge locations cache your S3 objects. Terminates TLS. Signed URLs for private content.
**Lambda:** Serverless functions. Cold start = pain (use provisioned concurrency for latency-critical).

**2026 practice:** **Edge functions** (CloudFront Functions, Lambda@Edge) for auth, redirects, A/B tests. **Bun** and **Node 22** LTS as Lambda runtimes.

---

## 2.19 Docker + Kubernetes

**Docker:** Container = process + filesystem + isolated network / PIDs. Image = layered snapshot.
**Kubernetes:** Container orchestrator. Pods (1+ containers) → ReplicaSet → Deployment. Services expose pods. Ingress routes external traffic.

**Must-know:**
- **Liveness vs Readiness** probe — liveness restarts, readiness gates traffic.
- **Requests vs Limits** — requests guarantee scheduling, limits cap usage.
- **HPA** — horizontal pod autoscaler (CPU / memory / custom metric).

**Trap:** *"You containerized a Node app. What can go wrong?"*
→ Signal handling (must handle SIGTERM for graceful shutdown), zombie processes (use `tini` or `--init`), huge images (multi-stage build), running as root (don't).

---

## 2.20 CI/CD — Jenkins & GitHub Actions

**Jenkins:** on-prem, plugin-heavy, Groovy pipelines. SAP / bank world.
**GitHub Actions:** YAML workflows, marketplace actions, matrix jobs, OIDC to cloud.

**Pipeline stages (typical):**
```
lint → typecheck → unit tests → build → integration tests
   → e2e → lighthouse gate → docker build → push → deploy staging
   → smoke tests → deploy prod (manual approval)
```

**Best practices:**
- **Cache dependencies** — `actions/cache` with `package-lock.json` hash.
- **Fail fast** — cheapest gates first.
- **Preview environments** per PR (Vercel, Netlify, or Argo Rollouts).
- **Trunk-based development** + feature flags > long-lived branches.

---

## 2.21 SAP BTP

**What:** SAP Business Technology Platform — SAP's PaaS (Cloud Foundry / Kyma / ABAP).

**Why on resume:** Launchpad deploys to BTP CF.

**Key services:** XSUAA (auth), Destination service (backend routing), HTML5 App Repo (static hosting), Approuter (edge).

*Keep this section brief unless interviewer is ex-SAP.*

---

## 2.22 Security — CSP, XSS, OWASP, JWT, OAuth ⭐🔥

**CSP (Content Security Policy):**
- HTTP header telling the browser which sources of scripts, styles, images, connections are allowed.
- Nonce-based (`script-src 'nonce-abc123'`) beats hash-based for dynamic apps.
- **Report-Only** mode first (`Content-Security-Policy-Report-Only`) — collect violations before enforcing.

*Memory hook: **"Whitelist what runs. Block everything else."***

**XSS (Cross-Site Scripting):**
- **Reflected** — malicious script in URL, echoed by server.
- **Stored** — persisted in DB (comment field), served to other users.
- **DOM-based** — client-side sink (`innerHTML`, `document.write`).
- **Fix:** contextual escaping (React does this by default in JSX), CSP as defense-in-depth, sanitize with DOMPurify when you MUST inject HTML.

**OWASP Top 10 (2021, still current):**
1. Broken Access Control
2. Cryptographic Failures
3. Injection (SQLi, XSS)
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable / Outdated Components
7. Identification & Auth Failures
8. Software & Data Integrity Failures
9. Security Logging & Monitoring Failures
10. Server-Side Request Forgery (SSRF)

**JWT:**
- Three parts: header.payload.signature — base64url.
- **Signed, not encrypted** (payload is readable). Never store secrets in the payload.
- **Short expiry (5–15 min)** + rotating **refresh token** (in HttpOnly cookie).
- Revoke via blocklist (Redis) — JWTs are stateless by default, that's the trade-off.

**OAuth 2.0 / OIDC:**
- OAuth 2.0 = delegated **authorization**.
- OIDC = layer on top for **authentication** (adds `id_token`).
- **Authorization Code + PKCE** is the flow for SPAs and mobile (2026). Implicit flow is deprecated.

**Secure HTTP headers (know these cold):**
- `Content-Security-Policy` — script/style/etc allowlist
- `Strict-Transport-Security` — force HTTPS
- `X-Frame-Options: DENY` or `frame-ancestors 'none'` (via CSP) — clickjacking
- `X-Content-Type-Options: nosniff` — MIME sniffing
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — feature policy (camera, mic, etc.)
- `Cross-Origin-Opener-Policy: same-origin` — process isolation for Spectre defense

---

## 2.23 Micro-Frontends ⭐🔥

**What:** Extend microservices to the frontend. Independent teams, independent deploys, one shell.

**Options (know all 4):**
| Approach | How | Trade-off |
|---|---|---|
| **Iframes** | Legacy separation | Isolation ✅, UX terrible, comms hard |
| **Build-time integration** | npm packages | Simple, but one big deploy |
| **Server-side composition** | ESI / edge fragments | SEO + fast, complex infra |
| **Module Federation** (Webpack 5 / Vite plugin) | Runtime loading of remote entry | 2026 default, shared deps, best DX |

**Module Federation deep dive:**
- Each MFE exposes a `remoteEntry.js` manifest.
- Shell loads it lazily, negotiates **shared dependency versions** (react, react-dom singletons).
- Failure isolation: an MFE crash boundary (React Error Boundary) prevents shell death.

*Memory hook: **"Independent teams, independent deploys, shared shell."***

**Common problems:**
- **Version drift** — team A on React 17, team B on 18 → shared singleton conflict. Solution: enforce a **platform-team-managed shared version**.
- **Global CSS bleed** — solve with CSS Modules, Shadow DOM, or scoped tokens.
- **Auth / user context** — shell owns it, publishes via Custom Event or shared state.
- **Bundle bloat** — no dedup? Every MFE ships React. Solution: singleton + eager sharing.

**2026 alternative:** **Native Federation** (framework-agnostic, no Webpack), or **Web Components** as the boundary.

---

## 2.24 Accessibility — WCAG-AA ⭐

**What:** Web Content Accessibility Guidelines, Level AA.

**4 principles (POUR):**
- **P**erceivable — alt text, captions, contrast ≥ 4.5:1
- **O**perable — keyboard nav, focus rings, no seizure triggers
- **U**nderstandable — clear labels, error messages, consistent nav
- **R**obust — valid HTML, ARIA only when needed

**Tools:** axe-core, Lighthouse a11y audit, screen readers (NVDA on Windows, VoiceOver on Mac).

**Common fixes you did (memorize):**
1. Missing form labels → `<label htmlFor>` or aria-label.
2. Low contrast → adjusted design tokens.
3. Missing focus visible → `:focus-visible` outline.
4. Keyboard traps in modals → focus trap + Escape to close.
5. Missing landmarks → semantic HTML (`<main>`, `<nav>`, `<header>`).
6. Charts / data viz → text alternative or a11y-friendly table version.

*Memory hook: **"If you can't use it with a keyboard, it's broken."***

---

## 2.25 AI Automation — n8n, LLM APIs, Prompt Engineering

**n8n:** open-source workflow automation, node-based. Trigger → nodes → action. Self-hostable Zapier.

**LLM API integration (Claude, OpenAI):**
- **Streaming** responses via SSE.
- **Function / tool calling** — model asks for structured data or triggers a tool.
- **RAG** (Retrieval-Augmented Generation) — embed docs → vector DB → retrieve → inject into prompt.
- **Cost control** — cache prompts, limit tokens, prefer smaller models for routing.

**Prompt engineering rules:**
1. Give **role + context + constraints + format**.
2. Few-shot examples beat instructions.
3. Chain-of-thought for reasoning.
4. **Never trust output** — validate with a schema (Zod / JSON Schema).

**2026:** Agent frameworks (LangGraph, CrewAI), MCP (Model Context Protocol), local models (Llama 4, Qwen) for privacy.

---

## 2.26 GitHub Copilot / Cursor

**One line:** AI pair-programmer. **Great for boilerplate, dangerous for architecture.**

**Interview line:** "I use it as a fast typist for boilerplate — CRUD, tests, docs. I never trust it on business logic without reading every line. It's saved me hours on repetitive work."

**Common trap:** *"Doesn't AI replace frontend engineers?"*
Answer: *"It replaces typing, not thinking. Naming, architecture, trade-offs, security — those are human judgment calls. AI accelerates the 20% of my job that's typing; the other 80% is the reason I get paid."*

---

## 2.27 Storybook (mention if asked about component libraries)

**What:** Component workshop / documentation tool.
**Why:** Design-system source of truth, visual regression via Chromatic.
**2026:** Storybook 8, portable stories (reuse in tests), CSF3 format.

---

## 2.28 Quick-Reference Table

| Tech | 1-line pitch | Kill-switch alternative |
|---|---|---|
| React | Component-based UI lib, huge ecosystem | Solid / Svelte |
| Redux Toolkit | Predictable global state | Zustand / TanStack Query |
| Next.js | React meta-framework SSR/SSG/RSC | Remix / Astro |
| Angular | Batteries-included TS framework | React + libs |
| TypeScript | Static types on top of JS | JSDoc |
| RxJS | Reactive streams | Signals / plain observables |
| Node.js | Non-blocking JS runtime | Deno / Bun |
| Express | Middleware HTTP framework | Fastify / Hono |
| GraphQL | Client-driven query API | tRPC / REST |
| WebSocket | Bi-directional real-time | SSE / WebTransport |
| Playwright | Cross-browser E2E | Cypress |
| Vite | ESM-based dev server, Rollup prod | Turbopack / Rspack |
| Docker | Containerized processes | — |
| Kubernetes | Container orchestration | ECS / Nomad |
| CloudFront | AWS CDN | Cloudflare / Fastly |
| Jenkins | On-prem CI | GitHub Actions / GitLab CI |
| Module Federation | Runtime micro-frontends | Native Federation / Web Components |
| CSP | Script-source allowlist | Trusted Types (stricter) |
| JWT | Signed stateless token | Opaque session token + Redis |
| OAuth 2 / OIDC | Delegated auth | SAML (enterprise legacy) |
| axe-core | A11y test engine | pa11y |

---

**Practice drill:** Cover the right column. For each row, say:
1. What is it?
2. Why did I pick it?
3. What did I give up?
4. What would I use in 2026?

Next → **Chapter 3 — SAP BI Launchpad Deep Dive.**
