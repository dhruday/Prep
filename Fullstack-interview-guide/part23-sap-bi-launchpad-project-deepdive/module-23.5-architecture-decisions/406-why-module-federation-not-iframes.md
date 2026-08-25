# Why Module Federation, Not iFrames
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.5: The Architecture Decisions
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **iFrames work but have real UX and integration limits**: each iFrame is an isolated browsing context; clicking a button inside an iFrame that needs to update the shell's URL or nav state is a postMessage dance; deep linking (user bookmarks a URL that opens a specific module view) requires custom routing coordination; performance: every iFrame loads independently with no shared dependencies
- **Module Federation trade-off**: modules share a JavaScript execution context with the shell; this means React and other deps can be shared (one copy); routing is handled by the shell naturally; communication is a direct function call or event on the same DOM; the cost is that one module's uncaught error can affect the shell (mitigated by ErrorBoundaries)
- **The three iFrame problems that mattered for BI Launchpad**: (1) URL/deep link: a user shares a URL to a specific report; the shell needs to route to the reports module and pass parameters into it — this is trivial with Module Federation and difficult with iFrames; (2) performance: each iFrame loads its own copy of React + dependencies (2+ MB per iFrame vs shared 380 KB with Module Federation); (3) UX: modal dialogs in an iFrame cannot visually extend outside the frame boundary; a modal that darkens the whole screen can't be done in an iFrame
- **When iFrames ARE the right choice**: when modules are completely separate products (different auth, different origin, different security domain), or when you have zero control over the embedded content (embedding a third-party widget), or when security isolation is the primary requirement
- **The honest answer about Module Federation costs**: it's complex to set up, version conflicts in shared deps cause hard-to-debug failures ("two copies of React"), build times increase, the webpack config is large — these are real costs vs the simplicity of an iFrame

---

## 1. One-Line Definition
Module Federation was chosen over iFrames because the modules needed to share routing context, communicate naturally with the shell, and load shared dependencies once — iFrames would have required a complex message-passing layer for every integration point that Module Federation handles natively.

---

## 2. iFrames vs Module Federation — Feature by Feature

```
FEATURE          IFRAME                              MODULE FEDERATION
──────────────────────────────────────────────────────────────────────────
Routing          postMessage to notify shell         Direct: module uses shell router
Deep links       Custom coordination needed          Works: URL is one — shell routes
Shared deps      Each frame loads own React copy     One React copy, shared in memory
Communication    postMessage (async, serialised)     Direct event bus or function call
Modal overlay    Constrained to iFrame boundary      Full-screen modal works naturally
Performance      N × full dependency load            Dependencies loaded once, shared
Error isolation  iFrame crash can't affect shell     Requires ErrorBoundary per module
CSS isolation    Automatic (separate documents)      Must use CSS Modules / scoping
Auth token       cookie or postMessage per message   httpOnly cookie sent on every /api call
SSO              Complex cross-origin coordination   Shell handles auth, modules inherit
Dev experience   Hard to debug across boundaries     Normal browser DevTools
Bundle size      N × duplicated deps                 Shared — dramatically smaller
```

---

## 3. The Deep Link Problem — Concrete Example

```
USER STORY:
  A business analyst emails a colleague a link to a specific report:
  https://bi.sap.com/reports/dashboard/revenue-q4-2024?filter=region:EMEA

  The link must:
    1. Load the shell app
    2. Route to the reports micro-frontend
    3. Pass the specific report ID and filter to the reports module
    4. Render the correct filtered report view

─────────────────────────────────────────────────────────────────────────
WITH IFRAMES:
  Shell loads; iframe loads as a separate document
  Shell needs to extract parameters from the URL
  Shell sends a postMessage to the iframe:
    window.frames['reports'].postMessage({
      type: 'NAVIGATE',
      reportId: 'revenue-q4-2024',
      filter: { region: 'EMEA' }
    }, '*')   // '*' is a security risk; need explicit target origin
  iFrame receives message; sets its own internal state
  On browser back button: shell URL changes; iFrame doesn't update (or vice versa)
  If iFrame is not loaded yet, the message is lost (race condition)

  Result: custom message protocol for every integration point

─────────────────────────────────────────────────────────────────────────
WITH MODULE FEDERATION:
  Shell loads; React Router reads the URL
  Route match: /reports/:id  → lazy-loads the reports module
  Reports module mounts with { reportId, filter } as React props
  Module renders the correct view immediately
  Browser back button → React Router handles it → module reacts to route change

  No message protocol. No cross-document coordination.
  Deep links work exactly like they would in a monolith.

─────────────────────────────────────────────────────────────────────────
// Shell routing config (simplified):
const ReportsModule = React.lazy(() => import('reportsRemote/ReportsApp'));

<Route
  path="/reports/*"
  element={
    <Suspense fallback={<PageLoader />}>
      <ReportsModule basePath="/reports" />
    </Suspense>
  }
/>

// Reports module receives basePath as prop; uses it with BrowserRouter + basename
const ReportsApp: React.FC<{ basePath: string }> = ({ basePath }) => (
  <BrowserRouter basename={basePath}>
    <Routes>
      <Route path="/" element={<ReportsList />} />
      <Route path="/:reportId" element={<ReportDashboard />} />
    </Routes>
  </BrowserRouter>
);
```

---

## 4. The Performance Problem with iFrames

```
MEMORY IMPACT:
  React 18 minified: ~130 KB
  ReactDOM: ~130 KB
  Redux Toolkit: ~80 KB
  Common utilities (lodash, date-fns): ~120 KB
  ──────────────────────────
  Shared base: ~460 KB

  WITH 4 IFRAMES:
    Each of 4 iFrames loads this independently
    460 KB × 4 = 1.84 MB of shared dependencies loaded 4 times
    Each is a separate JavaScript environment (separate heap)
    No sharing possible — iFrames are isolated documents

  WITH MODULE FEDERATION:
    Shell bundles React and shared deps
    webpack Module Federation 'singleton: true' config:
    shared: {
      react: { singleton: true, requiredVersion: '^18.2.0' },
      'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
      'react-redux': { singleton: true },
    }
    All 4 remote modules use the shell's React copy
    Shared deps loaded ONCE: ~460 KB total
    Saving: 1.84 MB → 460 KB for shared deps = 1.38 MB savings

PRACTICAL IMPACT:
  iFrames approach: 4 separate documents bootstrapping React 4 times
  Page would show 4 white rectangles while each frame loads
  Total parse/execute time for shared deps: 4× what Module Federation needs
```

---

## 5. When iFrames ARE Right

```
USE IFRAMES WHEN:
  ✅ Embedding third-party content you don't control
     (e.g., embedding a payment widget from Stripe or PayPal)
     → You want full isolation; you don't want their code in your JS context

  ✅ Maximum security isolation is the requirement
     (e.g., running user-submitted HTML safely)
     → iFrame with sandbox="allow-scripts" prevents access to parent DOM

  ✅ Separate auth domains
     (e.g., integrating an acquired product that has its own login)
     → Each iFrame manages its own auth independently

  ✅ Independent products that happen to be displayed together
     (not one product with multiple modules)
     → If there's no need for shared routing, shared deps, or shell communication,
        iFrame simplicity is a genuine advantage

FOR SAP BI LAUNCHPAD — IFRAMES WERE WRONG BECAUSE:
  Modules share auth (one SAP SSO session)
  Modules need to deep-link (users share URLs)
  Modals need to overlay the full window (not constrained to a frame)
  Shared deps would be loaded 4 times (significant perf cost)
  The modules ARE one product, not separate products
```

---

## 6. Interview Questions & Model Answers

### Q1
**Interviewer asks:** "Why didn't you just use iFrames? They're simpler."

**Hruday's answer:**
> "For some things, yes — iFrames are simpler. But we had three specific requirements that iFrames couldn't meet well. First, deep linking: analysts share URLs to specific reports and filters. With iFrames, the shell and the frame are separate documents — routing the module to a specific view requires a custom message protocol for every integration point. With Module Federation, it's just React Router — the URL is the state, modules receive props from the shell, no coordination needed. Second, performance: each iFrame would load its own copy of React and common dependencies — about 460 KB replicated four times. With Module Federation shared deps, that's loaded once. Third, modal overlays: enterprise analytics tools use full-screen modals that need to visually cover the entire page. In an iFrame, a modal is constrained to the frame boundary. I'd choose iFrames for embedding a third-party payment widget or content from a separate security domain. But for four modules that are genuinely one product sharing auth, routing, and design system, Module Federation treats them as one JavaScript environment, which is what they actually are."

---

## 7. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "iFrames are always wrong" | Absolute statement | "iFrames are right when isolation or third-party embedding is the requirement; we had three specific requirements that Module Federation handles natively and iFrames don't" |
| "Module Federation is better" | Vague comparison | Name the three specific problems: deep link routing, dep duplication, modal overlay |
| No cost for Module Federation | "It's the obvious choice" | "Module Federation is complex: shared singleton config causes hard-to-debug 'two copies of React' errors; webpack config is large; version contracts between teams require governance" |
| postMessage is fine | Downplay the iFrame coordination cost | "postMessage is one async message — every routing change, every state sync, every modal trigger needs its own message protocol; that's a custom integration layer that grows with every new feature" |

---

## 8. Hruday's Real Experience Hook

> "We actually prototyped the iFrame approach first, in week one. The deep linking test killed it: we tried to have the shell URL include a report ID and have the iFrame navigate to it. We got it working after two days of postMessage coordination. Then we tried the browser back button. The URL changed in the shell. The iFrame stayed where it was. We could have fixed it with more postMessage. But the module count was four, and we had estimated 20+ integration points where shell and modules need to coordinate. That's 20 separate message types to design, document, and maintain. We moved to Module Federation in week two."

---

## 9. Scale Evolution

**2 modules, prototype →** Module Federation with 2 remotes. Basic shared dep config. Simple routing props.

**4 modules, production →** Typed event bus contract. Shared component library. SRI hash automation. CSP per CDN domain. dep singleton governance.

**10+ modules →** Module federation manifest endpoint (dynamic module registration). Capability negotiation API (shell asks "does this module support dark mode?"). Platform team owns shared dep upgrade cadence. Canary deployment for individual modules.

---

## 10. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multiple product surfaces share auth session; deep linking between payment logs, analytics, and merchant dashboard; iFrame per surface would break URL-based deep links | Module federation routing story; shared auth via httpOnly cookie |
| Swiggy / Meesho | Consumer platform: shared design system, shared cart state across surfaces; iFrames can't share state without message protocol | Shared dep savings; event bus for cart sync |
| Adobe / Microsoft | Platform SDK with plugin modules; iFrames for untrusted plugins; Module Federation for trusted first-party features | Decision matrix: when iFrame vs when Module Federation |
| SAP Labs | You prototyped both, chose for concrete technical reasons, can explain the exact failure mode of iFrames | The candidate who made the architecture decision with evidence, not preference |

---

*Part 23 · Why Module Federation, Not iFrames · Full Stack Interview Guide · Hruday D · 2026*
