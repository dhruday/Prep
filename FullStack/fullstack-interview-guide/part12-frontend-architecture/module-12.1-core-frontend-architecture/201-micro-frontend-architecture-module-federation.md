# Micro-Frontend Architecture — Module Federation
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Micro-frontend architecture** applies the microservices idea to the frontend: instead of one large React/Angular app deployed as a single bundle, you split the UI into independently developed, independently deployed frontend applications that are assembled at runtime in the browser
- **Module Federation** (Webpack 5 and Vite) is the technical mechanism that makes this possible — it lets one JavaScript bundle expose components/modules that another bundle can load at runtime, without those modules being bundled together at build time; the "host" app loads "remote" app modules over the network at runtime
- **The deployment independence goal**: team A that owns the checkout micro-frontend deploys their React bundle independently of team B that owns the product catalog; neither team waits for the other; the host shell stitches them together in the user's browser
- **Three integration patterns**: build-time (npm packages — NOT true micro-frontends, shared at build time), server-side composition (Edge Side Includes, module at CDN level), runtime via Module Federation (true dynamic loading into a running app — the most common approach)
- **The real challenges**: shared dependency versions (React must be the same version in host and remote or you get duplicate React errors), cross-micro-frontend communication (shared event bus or shared Redux slice), authentication (single shared token propagated to all remotes), and routing (who owns the URL namespace)
- ✅ **Hruday's anchor**: built and maintained the micro-frontend shell at SAP Labs — host app with Module Federation loading 6 independently deployed remote applications

---

## 1. One-Line Definition
Micro-frontend architecture splits a large frontend application into multiple independently developed, tested, and deployed UI applications that are assembled into a single user experience at runtime, usually via Webpack Module Federation.

---

## 2. The Problem It Solves

At scale, a single-page application becomes a deployment bottleneck. Imagine Swiggy's frontend: the search team, the restaurant listing team, the cart team, the checkout team, and the tracking team all work on the same React codebase. Every deploy of any feature requires the entire 50-person frontend team's work to be coordinated, code-reviewed, tested, and deployed together. A bug introduced by the tracking team blocks the checkout team's release. Releases become weekly events instead of daily.

The bundle size also becomes a problem. A 5MB JavaScript bundle that includes code for search, catalog, cart, checkout, tracking, and account settings means users downloading code for features they may never use in that session. Code splitting helps but cannot fully solve it when all that code lives in one repository and one deployment pipeline.

The third problem: technology lock-in. When different teams have different expertise — one team works in React, another has a legacy Angular section, a third wants to experiment with a new framework — a monolithic frontend forces everyone onto the same technology and version. Upgrading React 17 to 18 becomes a massive coordination effort across 50 engineers.

Micro-frontend architecture solves all three. Each team owns and deploys their micro-frontend independently. The checkout team deploys their changes ten times a day without waiting for the tracking team. Bundle loading is split — the user loads only the chunks they navigate to. Technology diversity is possible — different micro-frontends can use different frameworks or versions (though React version sharing is common practice).

At SAP, I built and maintained the host shell application that loaded six independently deployed micro-frontends via Module Federation. Team autonomy was the driving reason — each product team had full ownership of their domain from code to production deploy.

---

## 3. How It Works Internally

### Module Federation — How Runtime Sharing Works

```
Without Module Federation (traditional SPA):
  Build time: all code compiled into one or several chunks
  Deploy: one bundle, one CDN upload
  
  team-a code ──┐
  team-b code ──┤──→ Webpack → app.bundle.js (2MB)
  team-c code ──┘
  
  To deploy team-a's change → rebuild everything → redeploy everything

With Module Federation:
  
  HOST APPLICATION (shell)           REMOTE APP (checkout)
  ┌──────────────────────┐           ┌─────────────────────────┐
  │ webpack.config.js    │           │ webpack.config.js       │
  │  ModuleFederationPlugin          │  ModuleFederationPlugin │
  │    remotes: {        │           │    name: 'checkout'     │
  │      checkout:       │           │    exposes: {           │
  │       'checkout@     │           │      './CheckoutPage':  │
  │       https://cdn/   │           │        './src/Checkout' │
  │       remoteEntry.js'│           │    }                    │
  │    }                 │           │    shared: ['react',    │
  │    shared: ['react'] │           │             'react-dom']│
  └──────────┬───────────┘           └─────────────┬───────────┘
             │                                     │
             │  Browser navigates to /checkout      │
             │                                     │
             │  1. Host loads remoteEntry.js ◄──────┤
             │     from checkout CDN URL             │
             │  2. remoteEntry.js tells host         │
             │     which chunks expose which modules │
             │  3. Host asynchronously imports       │
             │     CheckoutPage from the chunk       │
             │  4. Module resolved using SHARED      │
             │     React version (not bundled twice) │
             │  5. CheckoutPage renders inside host  │
             └─────────────────────────────────────►│
```

### Shared Dependencies — The Version Problem

```
Problem: both host and checkout import React.
If bundled separately: 2 copies of React in the browser = duplicate state,
hooks don't work across the boundary, useContext fails.

Solution: Module Federation "shared" configuration.

shared: {
  react: {
    singleton: true,       // Only one instance loaded at runtime
    requiredVersion: '^18.0.0',  // Version constraint
    eager: false,          // Load lazily when first needed (not in initial bundle)
  },
  'react-dom': {
    singleton: true,
    requiredVersion: '^18.0.0',
  },
}

Runtime resolution:
  Host loads React 18.2.0
  Checkout remote requests React 18.2.0
  Module Federation sees: already loaded, compatible version → reuse host's copy
  
  If checkout requests React 17.x:
  → Version mismatch → Module Federation loads 2nd copy → hooks fail across boundary
  → Solution: standardise React version across all micro-frontends (enforced in CI)
```

### Communication Between Micro-Frontends

```
Problem: Cart micro-frontend needs to know when Checkout updates the order count.
Different React trees can't share state via Context.

Pattern 1 — Shared Event Bus (browser CustomEvents):
  Checkout fires: window.dispatchEvent(new CustomEvent('order-placed', { detail: { orderId } }))
  Cart listens:   window.addEventListener('order-placed', (e) => updateCount(e.detail))
  Loose coupling — no direct import between micro-frontends

Pattern 2 — Shared Redux Store (federated module):
  Shell exposes a store module:
    exposes: { './store': './src/shared/store' }
  All remotes import the same store instance:
    import { store } from 'shell/store'
  Strong coupling to shell — use only for truly global state (auth, locale, theme)

Pattern 3 — URL as communication (cleanest for navigation events):
  Checkout navigates to /cart?updated=true
  Cart reads URL parameter on mount
  Works with any framework — no shared JavaScript needed
```

---

## 4. The Code

### Wrong Way — Iframe-Based Micro-Frontends
```html
<!-- ❌ WRONG — using iframes as micro-frontend isolation -->
<!-- This is the classic approach before Module Federation existed -->

<div id="shell">
  <nav>Shell Navigation</nav>
  
  <!-- Each micro-frontend in its own iframe -->
  <iframe src="https://checkout.internal/embed" 
          width="100%" height="600px"
          sandbox="allow-scripts allow-same-origin">
  </iframe>
</div>
```

```javascript
// ❌ Cross-iframe communication is painful and insecure
window.addEventListener('message', (event) => {
  // How do you verify this is from your checkout iframe?
  // What if a malicious script posts a fake message?
  if (event.data.type === 'ORDER_PLACED') {
    // ... but no type safety, no schema, fragile string matching
  }
});
```

> **Why this fails:** Iframes create hard boundaries — shared styles are impossible, the browser renders each iframe separately (worse performance than code splitting), `postMessage` cross-origin communication has no type safety, and accessibility is compromised (no seamless focus management between frames). Cookie and authentication state is complex across origins. The user experience is degraded: scroll is per-iframe, modal dialogs are clipped by iframe boundaries, print styling breaks.

### Right Way — Webpack Module Federation
```javascript
// HOST SHELL — webpack.config.js
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      
      remotes: {
        // Each key becomes the import namespace: import('checkout/CheckoutPage')
        checkout: 'checkout@https://checkout.myapp.com/remoteEntry.js',
        catalog:  'catalog@https://catalog.myapp.com/remoteEntry.js',
        cart:     'cart@https://cart.myapp.com/remoteEntry.js',
      },
      
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0', eager: true },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0', eager: true },
        // Design system shared — one copy, all micro-frontends use same version
        '@myapp/design-system': { singleton: true, requiredVersion: '^2.0.0' },
      },
    }),
  ],
};
```

```javascript
// CHECKOUT REMOTE — webpack.config.js
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'checkout',   // Must match the key in host's remotes config
      filename: 'remoteEntry.js',   // The manifest file the host loads first
      
      exposes: {
        './CheckoutPage': './src/pages/CheckoutPage',
        './CheckoutWidget': './src/components/CheckoutWidget',
        // Expose only the PUBLIC API of the checkout micro-frontend
      },
      
      shared: {
        react: { singleton: true, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.2.0' },
        '@myapp/design-system': { singleton: true, requiredVersion: '^2.0.0' },
      },
    }),
  ],
};
```

```tsx
// HOST SHELL — lazy loading remote components in React Router
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MicrofrontendLoadingFallback } from './components/MicrofrontendLoadingFallback';
import { MicrofrontendErrorFallback } from './components/MicrofrontendErrorFallback';

// Lazy import from remote — loaded only when user navigates to /checkout
// The string literal MUST be "checkout/CheckoutPage" — no variables
const CheckoutPage = lazy(() => import('checkout/CheckoutPage'));
const CatalogPage  = lazy(() => import('catalog/CatalogPage'));
const CartWidget   = lazy(() => import('cart/CartWidget'));

export const AppRouter: React.FC = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    
    {/* Each remote wrapped in ErrorBoundary — if checkout crashes, rest of app is fine */}
    <Route
      path="/checkout/*"
      element={
        <ErrorBoundary fallback={<MicrofrontendErrorFallback name="Checkout" />}>
          <Suspense fallback={<MicrofrontendLoadingFallback />}>
            <CheckoutPage />
          </Suspense>
        </ErrorBoundary>
      }
    />
    
    <Route
      path="/catalog/*"
      element={
        <ErrorBoundary fallback={<MicrofrontendErrorFallback name="Catalog" />}>
          <Suspense fallback={<MicrofrontendLoadingFallback />}>
            <CatalogPage />
          </Suspense>
        </ErrorBoundary>
      }
    />
  </Routes>
);
```

```tsx
// SHARED AUTH PROPAGATION — host passes auth token to remotes via props
// Remotes should NOT access cookies/localStorage themselves — 
// they should receive auth context from the host

// Host's SharedContext (exposed as federated module):
interface SharedAppContext {
  authToken: string | null;
  userId: string | null;
  locale: 'en' | 'hi' | 'te';
  theme: 'light' | 'dark';
}

// Host wraps each remote with the shared context:
<SharedContextProvider value={sharedContext}>
  <Suspense fallback={<Loading />}>
    <CheckoutPage />
  </Suspense>
</SharedContextProvider>

// Checkout remote consumes context:
// import { useSharedContext } from 'shell/SharedContext'
const { authToken } = useSharedContext();
// Makes authenticated API calls using this token
```

> **Key decisions here:**
> - `eager: true` on React in the host — React must be available before any dynamic import attempt; remotes can have `eager: false` since they share the already-loaded host React
> - `ErrorBoundary` around each remote — if the checkout JavaScript bundle fails to load (network error, deployment issue), only checkout is broken; the rest of the app continues to work
> - Auth token passed down via Context exposed as a shared federated module — remotes never manage auth independently; the shell is the single source of truth for the authenticated user identity

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is a micro-frontend and how does it differ from just code-splitting?"

**Hruday's answer:**
> Code splitting is a bundler technique where you split one application's code into multiple chunks that load on demand. All the code is still part of the same build, committed together, deployed together. Code splitting improves performance by not shipping all of the code upfront, but it doesn't address team autonomy or deployment independence.
>
> Micro-frontends take the idea further: each team's frontend is a completely separate repository, build pipeline, and deployment. Team A deploys their checkout micro-frontend to a CDN at version 1.5.0. Team B deploys their catalog micro-frontend at version 2.3.1. A third shell application loads both at runtime and composes them into the user interface. Neither team waits on the other to deploy. There's no shared repository, no shared build, no coordinated release train.
>
> Module Federation is the technique that makes runtime composition possible — the shell loads a `remoteEntry.js` from each team's CDN, which tells the shell how to dynamically import components from that team's bundle. Shared dependencies like React are negotiated at runtime so you don't end up with two copies of React.
>
> At SAP, I built the shell that loaded 6 micro-frontends this way. The real benefit wasn't performance — it was that six product teams could deploy independently without waiting for a central release coordinator.

---

### Q2 — Deep Dive
**Interviewer asks:** "What happens when a micro-frontend's remote JavaScript fails to load? How do you handle that?"

**Hruday's answer:**
> Webpack Module Federation throws a JavaScript error when a remote's chunk fails to load — network error, CDN outage, deployment gone wrong. Without proper handling, this crashes the entire host application — which is the opposite of what micro-frontends promise.
>
> The defensive pattern is wrapping every remote component in a React Error Boundary. The `<Suspense>` boundary catches loading states; the `<ErrorBoundary>` catches runtime errors including failed remote loads. When the checkout remote fails to load, the Error Boundary renders a graceful fallback — "Checkout is temporarily unavailable. Please try again." The user can still navigate the catalog, view their account, and access features from other micro-frontends. Only the broken remote is degraded.
>
> I go further with a try-catch at the lazy import level:
> ```
> const CheckoutPage = lazy(() =>
>   import('checkout/CheckoutPage').catch(() => ({
>     default: () => <ServiceUnavailable name="Checkout" />
>   }))
> );
> ```
> This catches the import failure and substitutes a fallback module instead of throwing. Now even the `<Suspense>` layer works correctly — it resolves with a fallback component instead of erroring.
>
> We also set up monitoring: when a remote fails to load in production, a CloudWatch alarm fires so the on-call engineer knows before users start complaining.

---

### Q3 — Trade-Off
**Interviewer asks:** "What are the main downsides of micro-frontend architecture?"

**Hruday's answer:**
> Real downsides — I've experienced these first-hand.
>
> First: operational complexity. Six deployment pipelines, six CDN configurations, six monitoring dashboards. Debugging a bug that spans two micro-frontends (shell state affecting checkout behaviour) is significantly harder than debugging within a single repository. You need distributed tracing, correlation IDs, and strong team communication to find cross-boundary issues.
>
> Second: consistency risk. If teams diverge on React versions or design system versions, you end up with visual inconsistencies or broken shared state. We enforced React version standardisation via CI checks — any PR that changed the React version in a remote's `package.json` triggered a cross-team review. That's overhead a monorepo wouldn't need.
>
> Third: initial load performance. The first page load in a micro-frontend architecture involves the shell's bundle plus network requests for each remote's `remoteEntry.js` manifest. This is several extra round trips compared to a well-code-split monolith. We partially solved this with preloading: the shell prefetches `remoteEntry.js` files for likely-next routes while the user is on the current page.
>
> My recommendation: micro-frontends are justified when you have more than three teams working on the same frontend product, where deployment coordination is already a real pain point. Below that threshold, a well-organised monorepo with code splitting is simpler and faster to operate.

---

### Q4 — Scenario
**Interviewer asks:** "Design the micro-frontend architecture for a payment platform like Razorpay — multiple product teams, multiple user interfaces."

**Hruday's answer:**
> Razorpay has distinct domains: Dashboard (analytics, reporting), Payments (transaction management), Payouts, Settlements, Developer Tools (API keys, webhooks), and Settings. Each maps to a separate micro-frontend team.
>
> Architecture: One shell app hosts the navigation and authentication. It handles login, token refresh, and propagates the auth context to all remotes. It owns the URL namespace — each micro-frontend owns a sub-path: `/dashboard/*` → dashboard remote, `/payments/*` → payments remote.
>
> Each team publishes their micro-frontend bundle to their own CDN path. The shell has a configuration file (loaded at startup from a remote config endpoint) that maps team names to remote URLs — this allows A/B testing (serve checkout-v2 to 10% of users), canary deploys (dashboard remote at v2.0.0-rc.1 for internal users), and emergency rollbacks (revert the shell config to point to the previous dashboard version without any code deploy).
>
> Shared concerns: the design system is a federated module exposed by the shell. The auth context is a federated module. Everything else is team-owned. Cross-team events use browser CustomEvents with a documented event schema in a shared TypeScript type package.
>
> The one thing I would NOT micro-frontend: the critical payment form. That goes in the shell or its own carefully audited micro-frontend with extra security review, isolated from all other micro-frontends to minimise attack surface.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Module Federation solves everything" | "Just set up Module Federation and teams are independent" | Module Federation is the bundler mechanism — it doesn't solve governance, shared dependency versioning, cross-team communication contracts, or monitoring; these team conventions are harder than the technical setup and account for 80% of the operational effort |
| "Each micro-frontend has its own React" | "Teams can use whatever React version they want" | Multiple React instances in the same browser break hooks — `useState` in the remote connects to a different React runtime than the host; `singleton: true` in shared config enforces one instance; all micro-frontends must agree on a compatible React version range |
| "Use iframes for isolation" | "Iframes are the simplest micro-frontend approach" | Iframes have no shared stylesheet, broken accessibility (focus management, screen readers), iframe-to-parent communication only via `postMessage` with no type safety, and cookie sharing issues; Module Federation with a proper Error Boundary gives isolation without iframe downsides |
| "Micro-frontends for all team sizes" | "We should use micro-frontends to allow team autonomy" | A 3-person team sharing one frontend app does NOT benefit from micro-frontend overhead; the coordination cost of micro-frontends (versioning, shared deps, CI pipelines per remote) only pays off when the coordination cost of a monolithic repo is already painful — typically 20+ engineers working on the same frontend |

---

## 7. Hruday's Real Experience Hook
> "At SAP Labs, I owned the micro-frontend shell application — the host that loaded six independently deployed product application remotes via Webpack Module Federation. The most complex problem I solved was shared authentication: each remote needed the current user's JWT token to make API calls, but the token refresh cycle only happened in the shell. I exposed a `shell/AuthContext` federated module that remotes consumed — when the shell refreshed the token, all remotes automatically used the new token without any restart or re-login.
>
> The second real challenge was the shared design system. We had our component library exposed as a federated module from the shell. When we released a breaking change in the design system, we had to coordinate all six remotes to consume the new version before we could remove the old one. We solved this by running both old and new in parallel with a version negotiation layer for two sprints — painful, but necessary. That experience taught me that the social contract between teams matters as much as the technical implementation."

---

## 8. Scale Evolution

**2-3 teams, new product →** Don't start with micro-frontends. Use a monorepo (Nx or Turborepo) with clear library boundaries, code splitting, and module boundaries enforced by linting rules. Get fast — add architecture when the coordination pain is real, not speculative.

**5-10 teams, established product →** Introduce Module Federation with a shell that owns auth and navigation. Each team owns one remote. Establish the shared dependency version policy and the cross-micro-frontend event contract as written agreements, reviewed in cross-team architecture meetings. One dedicated platform engineer for the shell.

**20+ teams, enterprise scale →** Multiple shell applications (one per product line or audience), federated module catalog, design system as a federated module with versioning, automated compatibility matrix testing (verify all remotes work with the latest shell before any shell deploy), performance monitoring per remote (track bundle size per deploy, alert on size regressions), feature flags at the shell level for A/B testing specific remotes.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Multiple product teams (payments, payouts, dashboard, developer tools) working on the same customer-facing portal; micro-frontends enable team autonomy; payment form security isolation is a key concern | Know the deployment independence benefit; show awareness of security isolation for payment UI; Module Federation config |
| Swiggy / Meesho | Consumer app (ordering, tracking, profile) vs merchant app (orders management, menu editing) vs internal ops — possibly separate micro-frontends behind a unified shell; high-velocity deployments needed | Canary deploy via shell config switching; performance impact of extra network requests for remote bundles |
| Adobe / Microsoft | Adobe has multiple product suites (Creative Cloud, Experience Cloud, Document Cloud) potentially sharing UI shells; Microsoft has many properties on the same identity infrastructure; enterprise-scale micro-frontend governance experience is a differentiator | Cross-team dependency governance; version compatibility matrices; design system sharing |
| SAP Labs | Direct experience: built the SAP micro-frontend shell at SAP; loaded 6 remotes via Module Federation; solved shared auth context, design system federation, version coordination across teams | Anchor the real SAP story — 6 remotes, Auth federation, design system module, production incident learnings |

---

## 10. Related Topics — What to Study Next

- **Topic 200 — Component-Driven Architecture** — micro-frontends are component-driven architecture scaled to the deployment boundary; the same isolation and contract principles apply, just at a larger granularity; strong component design within each micro-frontend is what makes the system composable
- **Topic 202 — SPA vs SSR vs SSG** — micro-frontends are typically SPAs (client-side loaded via Module Federation); React Server Components and Next.js SSR complicate the micro-frontend model because server rendering a federated component requires the server to also know about the remote's bundle; Next.js has native support for Module Federation (next-federation plugin)
- **Topic 315 — Micro-Frontend Shell Architecture** (Part 19) — system design level: routing namespaces, shared state contracts, authentication propagation, canary deploy via shell config, rollback strategy — the full design problem for a Razorpay or SAP-scale micro-frontend system
- **Topic 225 — Redux Toolkit** — shared Redux store is one of the communication mechanisms between micro-frontends; the Shell exposes a federated store module; using RTK's `createSlice` + `createAsyncThunk` for the shared slices (auth, locale, cart count) is the standard implementation pattern
- **Topic 235 — Code Splitting and Lazy Loading** — the performance half of micro-frontends; even within a micro-frontend that is itself lazily loaded, internal routes should be code-split further; the browser performance waterfall for a micro-frontend architecture (remoteEntry fetch + chunk fetch) needs careful measurement and preloading strategy

---

*Part 12 · Micro-Frontend Architecture — Module Federation · Full Stack Interview Guide · Hruday D · 2026*
