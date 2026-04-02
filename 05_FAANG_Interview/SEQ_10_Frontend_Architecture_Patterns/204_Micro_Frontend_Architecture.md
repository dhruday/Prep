# 204. Micro-Frontend Architecture
**Phase:** Performance & Architecture | **Sequence:** 10 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"Micro-frontends apply microservice thinking to the UI — instead of one monolithic frontend, multiple teams own and deploy independent frontend modules that are composed into one user experience. At SAP, I worked directly in this model: 3 cross-functional teams each owned their own Angular module with independent deployments. The shell application loaded each team's module at runtime using Module Federation. The key benefit is team autonomy — each team ships when they're ready, not when the whole monolith is ready."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists
Micro-frontends solve the problem of scaling frontend development across many teams. When 5+ teams work on the same frontend codebase, they collide:
- Release trains — one team's bug blocks everyone
- Bundle growth — every team adds dependencies, bundle grows
- Merge conflicts — 10 teams in one repo → constant conflicts
- Different frameworks — one team uses Angular 15, another wants React

Micro-frontends give each team its own deployable frontend unit.

### How It Works Internally

**Composition Approaches:**

**1. Build-time composition:**
Teams publish npm packages. Shell imports them as regular modules. Shared code is bundled together at build time.
- ✅ Simple, no runtime complexity
- ❌ Teams must redeploy shell to update

**2. Runtime composition (most common):**
Each team deploys their own JS bundle. Shell loads them dynamically at runtime using Module Federation or script tags.
- ✅ Teams deploy independently
- ❌ Version coordination needed for shared dependencies

**3. Server-side composition:**
A server (or CDN edge) assembles HTML fragments from different team servers.
- ✅ No JS bloat
- ❌ More complex infrastructure

**Module Federation (Webpack 5):**
```
Shell App (Host)
  → at runtime, loads remote modules:
  
Team A deploys: https://team-a.myapp.com/remoteEntry.js
  exposes: { ProductModule: './src/product/ProductModule' }
  
Team B deploys: https://team-b.myapp.com/remoteEntry.js
  exposes: { CartModule: './src/cart/CartModule' }
  
Shell loads both at runtime — user sees one app
```

### Architecture & Component Boundaries

```
Micro-Frontend Architecture at SAP:

Shell Application (Platform Team)
├── Routing — /products → loads Team A's module
├── Shared Auth — JWT token management, shared across all MFEs
├── Shared Design System — common component library
├── Inter-MFE Communication — custom events / shared store
│
├── Team A: ProductModule (owns /products/*)
│     ├── Deployed independently to team-a.myapp.com
│     ├── Own CI/CD pipeline
│     └── Exposes: ProductListPage, ProductDetailPage
│
├── Team B: CartModule (owns /cart/*)
│     ├── Deployed independently to team-b.myapp.com
│     └── Exposes: CartPage, MiniCart component
│
└── Team C: CheckoutModule (owns /checkout/*)
      ├── Deployed independently
      └── Exposes: CheckoutFlow
```

### Data Flow & State Flow
Communication between micro-frontends:
```
Option 1: Custom DOM Events (loosest coupling)
  Team A fires: window.dispatchEvent(new CustomEvent('cart:add', { detail: item }))
  Team B listens: window.addEventListener('cart:add', ...)

Option 2: Shared State (via shell-injected store)
  Shell provides: window.__SHARED_STORE__ = Redux/Zustand store
  MFEs subscribe to slices they own

Option 3: URL as state (cleanest)
  Team A navigates to: /cart?added=product123
  Team B reads URL params — no direct coupling
```

### Performance Implications
- **More HTTP requests:** Each MFE has its own `remoteEntry.js` — extra network requests on first load
- **Duplicate dependencies:** If Team A bundles React 18 and Team B bundles React 18 separately, the user downloads React twice. **Solution:** Share React via Module Federation's `shared` config
- **Lazy loading:** Each module loads only when the user navigates to that team's routes
- **Version mismatches:** Different teams on different Angular/React versions can cause conflicts — use `singleton: true` in Module Federation shared config

### Scalability Considerations
- **3 teams:** Micro-frontends start making sense — independent deployments save significant coordination overhead
- **10 teams:** Essential — without it, you have a monolith where any team can break any other
- **50+ teams:** Multiple shells (portal-level composition), team namespacing, strict contracts between teams

### Trade-offs
| Micro-Frontend | Monolith | When to Choose Micro-Frontend |
|---|---|---|
| Independent deployability | One deploy | 3+ teams needing autonomy |
| Team technology freedom | One tech stack | Teams have different tech needs |
| Runtime complexity | Build simplicity | Scale outweighs operational cost |
| Harder to share code | Easy to share code | Teams need clear boundaries |
| Duplicate dependencies possible | One shared bundle | When per-team independence > bundle size |

### ⚠️ Anti-Patterns & Pitfalls
- **Micro-frontend for a 1-team app:** The operational overhead isn't worth it — you get all the complexity with none of the benefit
- **Tight coupling through shared state:** If every MFE reads/writes the same global store, they're not really independent — breaking changes cascade
- **Different React version per team:** Two React instances on the same page causes hooks to fail — use Module Federation's `singleton: true` to share one React instance
- **No design system contract:** Each team uses a different Button component → visual inconsistency across the app

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, I led the Performance module as one of 3 micro-frontend teams. We used Angular Module Federation. Each team had its own repo, CI/CD, and deployment pipeline. The shell handled auth, shared state (NgRx), and the design system. My team's module was independently deployable — we could ship a hotfix at 2am without coordinating with the other two teams. This was a significant advantage over the Bosch monolith where every release needed all teams to align.

**At FAANG scale:**
- **Microsoft Office 365:** Word Online, Excel Online, PowerPoint Online — each is a separate MFE composed in the Office shell. Independent release cycles, shared authentication.
- **Adobe Experience Cloud:** Marketo, Experience Manager, Analytics — different product teams, different tech stacks, composed in the Adobe Experience Cloud shell
- **Salesforce Lightning:** Each Salesforce cloud (Sales, Service, Marketing) is a separate MFE in the Lightning Experience shell
- **Cisco DevNet:** Different product dashboards (Meraki, Webex, DNA Center) composed in a shared Cisco portal

**How it evolves with scale:**
- 3 teams: Basic Module Federation — clean but manageable
- 10 teams: Shell team, platform team, design system team, dedicated integration environment
- 50+ teams: Multiple portals, team namespacing, strict API contracts, MFE registry

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Micro-frontends apply the same independence principle as microservices to the UI layer. At SAP, I worked in a 3-team micro-frontend setup using Webpack Module Federation. Each team owned a separate Angular module, had its own deployment pipeline, and could ship independently. The shell app handled routing, authentication, and the shared design system. When my team needed to push a critical performance fix, we deployed in 20 minutes — no cross-team coordination needed. The trade-offs I managed were: preventing duplicate dependencies by sharing Angular and RxJS via Module Federation's `shared` config, enforcing communication through custom events rather than direct store sharing, and maintaining design consistency by requiring all teams to use the shared component library."

### Likely Follow-up Questions
1. "How do MFEs communicate?" → Custom DOM events (loose coupling), shared store injected by shell (tighter), or URL params (cleanest)
2. "How do you share dependencies?" → Module Federation `shared` config — mark React, Angular, RxJS as shared/singleton so only one copy loads
3. "What if one MFE crashes?" → Error boundary at shell level isolates failures — rest of the app continues working
4. "How do you handle routing?" → Shell owns the router, loads MFE modules on route activation via lazy loading + Module Federation

### vs Alternatives
| Module Federation | iFrame-based MFE | npm Package MFE |
|---|---|---|
| Runtime code sharing | Complete isolation | Build-time sharing |
| Shared dependencies | No shared state possible | Deploy shell to update |
| Modern standard | Works with any tech | Simpler setup |
| Best for teams on same framework | Best for total isolation | Best for small teams |

### How to Signal Senior Thinking
> "The infrastructure cost of micro-frontends is real — you need a Module Federation setup, a shared design system contract, inter-team communication protocol, and a way to test integrated behavior across teams. I only recommend it when the team coordination cost of a monolith exceeds the operational cost of micro-frontends. That threshold is usually around 3–4 teams."

---

## 💻 5. Code Example

```typescript
// Module Federation Configuration — Webpack 5
// Shell (host) and one remote micro-frontend

// ─── SHELL webpack.config.js ────────────────────────────────
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        // Load Team A's ProductModule at runtime
        products: 'products@https://team-products.myapp.com/remoteEntry.js',
        cart: 'cart@https://team-cart.myapp.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        // One React instance shared across all MFEs
      }
    })
  ]
};

// ─── TEAM A (products) webpack.config.js ───────────────────
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'products',
      filename: 'remoteEntry.js', // Shell fetches this URL
      exposes: {
        './ProductsApp': './src/ProductsApp', // Exposed entry point
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      }
    })
  ]
};

// ─── Shell: Lazy-load remote MFE ────────────────────────────
const ProductsApp = React.lazy(
  () => import('products/ProductsApp') // Runtime import — no build-time dependency
);

function App() {
  return (
    <Router>
      <Route path="/products/*">
        <ErrorBoundary fallback={<MFEErrorFallback name="products" />}>
          <Suspense fallback={<PageSkeleton />}>
            <ProductsApp />
          </Suspense>
        </ErrorBoundary>
      </Route>
    </Router>
  );
}
```

**Interview vs Production difference:**
In an interview, showing the Module Federation config + lazy load is enough. In production, add health checks for each remote entry URL, fallback URLs for when a team's CDN is down, versioning in the URL (`remoteEntry.v2.js`), and integration tests that verify the composed app.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "Microservices for the UI — each team owns a frontend slice and deploys independently"
**If you go blank:** "Three teams, three modules, three deployments — shell stitches them together at runtime with Module Federation."
**Mnemonic:** **TIC** — **T**eam owns module, **I**ndependent deployment, **C**omposed in shell

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: Users see one app — teams work in many
→ Performance: Each module lazy-loads on demand — no user pays for code they won't use
→ Business: Teams ship independently — no release train coordination, faster feature delivery

**How it works (3 sentences):**
Each team builds and deploys their own JavaScript module as a separate artifact. The shell application (owned by a platform team) dynamically loads these modules at runtime using Module Federation or script injection. Teams communicate through custom events, URL state, or a shell-provided shared store.

**Company relevance:**
- Microsoft: Office 365 shell is a canonical micro-frontend implementation — any senior frontend role involves MFE knowledge
- Adobe: Multiple product teams (Marketo, Analytics, Experience Manager) compose in Experience Cloud shell
- Salesforce: Sales Cloud, Service Cloud, Marketing Cloud are independent MFEs in Lightning Experience
- Cisco: Meraki, Webex, DNA Center dashboards — all independent teams, composed in Cisco portal

---
**✅ Topic 204/486 complete → continuing to Topic 205: Module Federation**
