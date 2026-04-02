# 205. Module Federation
**Phase:** Performance & Architecture | **Sequence:** 10 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer
> What to say in the first 60 seconds.

"Module Federation is a Webpack 5 feature that lets one JavaScript application load another application's modules at runtime — without rebuilding. At SAP, this was the technical backbone of our micro-frontend architecture. The shell app loaded product modules from three different team deployments dynamically. The key innovation is that dependencies — like Angular and RxJS — can be shared across all the modules, so the user only downloads them once. Without Module Federation, micro-frontends either required npm packages (need shell rebuild to update) or iframes (total isolation, terrible UX)."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists
Module Federation is a feature introduced in Webpack 5 that allows separately deployed JavaScript bundles to share code and load each other's modules at runtime.

**Before Module Federation, micro-frontend options were:**
1. **npm packages:** Team A publishes component library → Team B installs it. Problem: shell must be rebuilt and redeployed on every update.
2. **iframes:** Each MFE in an iframe. Problem: no shared styling, terrible UX, complex postMessage communication.
3. **Script tag injection:** Globals (`window.ProductsApp`). Problem: no TypeScript, no tree shaking, global namespace pollution.

Module Federation solves all of these by enabling true runtime code sharing.

### How It Works Internally

**Three core concepts:**

**1. Host (Shell):** The consuming application that loads remote modules
**2. Remote:** The providing application that exposes modules
**3. Shared:** Dependencies that should load only once across all apps

**Loading sequence:**
```
1. Browser loads shell's index.html
2. Shell's main.js runs
3. Shell encounters: import('products/ProductsApp')
4. Shell fetches: https://products-cdn.myapp.com/remoteEntry.js
   → remoteEntry.js is a manifest: "ProductsApp is at ./chunk-123.js"
5. Shell fetches the actual module chunk: chunk-123.js
6. Module Federation checks: does shell already have React 18?
   → Yes → skip downloading React again (shared: singleton)
   → No → download it
7. ProductsApp renders inside shell
```

**remoteEntry.js explained:**
```
remoteEntry.js = a lightweight registry/manifest file
  - Lists all exposed modules and their chunk file names
  - Lists shared dependency versions
  - ~3KB in most cases
  - Fetched first, before any module code
```

### Architecture & Component Boundaries

```
Module Federation Runtime:

Browser Memory
├── Shell (loaded first)
│   ├── shared: { react@18: [loaded] }    ← React loaded once
│   ├── shared: { rxjs@7: [loaded] }
│   └── Remote Registry:
│         products → https://team-products.cdn/
│         cart → https://team-cart.cdn/
│
├── Products Remote (loaded on /products navigate)
│   └── uses Shell's React instance (no duplicate)
│
└── Cart Remote (loaded on /cart navigate)
    └── uses Shell's React instance (no duplicate)
```

### Data Flow & State Flow

**Version negotiation for shared dependencies:**
```
Shell says: "I need React 18.2.0"
Products remote says: "I need React >=18.0.0"
Cart remote says: "I need React ^18.0.0"

Module Federation negotiates:
  → All three are compatible with 18.2.0
  → Load 18.2.0 once, share with all three
  → If incompatible versions: each loads its own (bundle duplication)
```

**State sharing:**
Module Federation doesn't manage state — it just shares modules. State sharing is a separate concern handled by:
- Custom events (`window.dispatchEvent`)
- Shell-injected global store (`window.__STORE__`)
- URL-based state

### Performance Implications
- **remoteEntry.js:** Small ~3KB file per remote fetched on each page load (or cached)
- **Shared dependencies:** React, Angular, RxJS loaded once = significant bundle savings
- **Lazy loading:** Remote modules load only when the user navigates to their routes
- **Network waterfall risk:** Shell loads → fetches remoteEntry.js → fetches actual module → renders. Three round trips. Mitigate with `<link rel="preload">` hints.
- **Cache strategy:** Version remoteEntry.js in filename (`remoteEntry.v2.js`) for cache busting when teams deploy

### Scalability Considerations
- **3–5 remotes:** Works well out of the box
- **10–20 remotes:** Need a remote registry service to track which version of remoteEntry.js is live for each team
- **50+ remotes:** MFE orchestration layer — track health, versions, availability of all remotes

### Trade-offs
| Module Federation | npm Package MFE | iFrame MFE |
|---|---|---|
| Runtime independence | Build-time dependency | Complete isolation |
| Shared dependencies | Shared via npm | No sharing possible |
| Shell needn't rebuild | Shell must rebuild | Shell is just an iframe container |
| Webpack 5 required | Any bundler | Any setup |
| Vite support via vite-plugin-federation | N/A | N/A |

### ⚠️ Anti-Patterns & Pitfalls
- **Not marking dependencies as singleton:** Two React instances on the same page → hooks fail, createContext doesn't work across MFE boundary. Always `react: { singleton: true }`.
- **Synchronous imports of federation modules:** `import ProductsApp from 'products/ProductsApp'` at the top of a file blocks the shell bootstrap. Use dynamic `import()` to keep it asynchronous.
- **No fallback when remote is down:** If Team A's CDN fails, the whole shell breaks. Add error boundary + fallback UI around every remote `React.lazy` import.
- **Sharing too much:** Sharing `lodash` between all teams locks them to the same version. Share only the framework (React/Angular), not utility libraries.

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, I configured Module Federation for the Performance module micro-frontend. My webpack config exposed `PerformanceDashboard` and `PerformanceReports` as federated modules. The shell loaded them at `/performance/*` routes. Key configuration: Angular and RxJS as `singleton: true` shared dependencies. Without this, each team loading their own Angular would cause dependency version conflicts and double the runtime bundle size. My module's remoteEntry.js was ~2KB — virtually free to fetch.

**At FAANG scale:**
- **Microsoft:** Teams uses Module Federation principles (or equivalent) for feature team isolation — calendar, chat, calls all independently deployable
- **Adobe:** Experience Manager Forms, Assets, and Sites are independently federated modules in the Experience Cloud shell
- **Salesforce:** Salesforce has an internal framework called "Locker Service" with Module Federation-style isolation for Lightning apps
- **Cisco:** Cisco uses Webpack Module Federation for Webex feature modules (meetings, calling, messaging as separate deployable units)

**How it evolves with scale:**
- 3 teams: Manual webpack config per team
- 10 teams: Shared `webpack.federation.config.js` template, automatic version registry
- 50 teams: Platform team owns the Federation framework, CI/CD templates include federation config, automated integration testing

---

## 💬 4. Interview Execution

### Sample Answer (verbatim, 7+ years level)
> "Module Federation is Webpack 5's mechanism for runtime code sharing between independently deployed applications. It solves the biggest challenge with micro-frontends: how do you share Angular or React across 5 teams without every team bundling their own copy? The answer is the `shared` config with `singleton: true` — Module Federation negotiates at runtime to load the dependency only once. At SAP, my team's module was a separate deployment. The shell downloaded our `remoteEntry.js` — a 2KB manifest — and then lazily loaded our actual module chunks when the user navigated to `/performance`. The critical thing I learned: never synchronously import a federated module — always use dynamic `import()` so the shell doesn't block on the remote loading."

### Likely Follow-up Questions
1. "What is remoteEntry.js?" → A small manifest file the shell fetches that lists what modules are exposed and what shared dependencies are available
2. "What happens if the remote is offline?" → Without a fallback, the shell breaks. Wrap remote lazy imports in `React.lazy` + ErrorBoundary to isolate failures
3. "How does Module Federation handle different framework versions?" → If versions are compatible, one instance is shared. If incompatible, each loads its own (duplication). This is why version discipline matters.
4. "Can you use Module Federation with Vite?" → Yes — `vite-plugin-federation` is a Vite plugin that implements the same pattern. Same concepts, different config syntax.

### vs Alternatives
| Module Federation | Single-SPA | iFrames |
|---|---|---|
| Webpack-native | Framework-agnostic orchestrator | Browser-native isolation |
| Best shared dependency handling | Works across any build tool | No dependency sharing |
| Webpack 5 required | More orchestration code | Simple but poor UX |
| Industry standard today | Popular for legacy migration | Last resort option |

### How to Signal Senior Thinking
> "Module Federation isn't magic — it's a dynamic import system with a negotiated shared dependency layer. The hard part isn't the Webpack config — it's the organizational discipline: shared dependency versions, API contracts between teams, and what happens when a remote is unavailable. Those decisions outlast any Webpack config."

---

## 💻 5. Code Example

```typescript
// Module Federation: Host (Shell) + Remote (Products Team)
// Complete, working configuration with all critical settings

// ─── HOST (Shell) webpack.config.js ────────────────────────
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        // Remote name → where to fetch remoteEntry.js
        products: 'products@https://team-products.cdn.myapp.com/remoteEntry.js',
        cart: 'cart@https://team-cart.cdn.myapp.com/remoteEntry.js',
      },
      shared: {
        react: {
          singleton: true,           // One React for all MFEs
          requiredVersion: '^18.0.0',
          eager: true,               // Load React before any MFE loads
        },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0', eager: true },
        'react-router-dom': { singleton: true, requiredVersion: '^6.0.0' },
      }
    })
  ]
};

// ─── REMOTE (Products Team) webpack.config.js ──────────────
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'products',
      filename: 'remoteEntry.js',    // URL: /remoteEntry.js
      exposes: {
        './ProductsApp': './src/bootstrap', // Exposed entry point
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.0.0' },
      }
    })
  ]
};

// ─── Shell: Consuming the remote ────────────────────────────
// ✅ Correct: asynchronous dynamic import
const ProductsApp = React.lazy(() => import('products/ProductsApp'));

function App() {
  return (
    <Routes>
      <Route path="/products/*" element={
        <ErrorBoundary fallback={<div>Products module unavailable</div>}>
          <Suspense fallback={<PageSkeleton />}>
            <ProductsApp />
          </Suspense>
        </ErrorBoundary>
      } />
    </Routes>
  );
}

// ─── Products Remote bootstrap.ts ───────────────────────────
// Important: async bootstrap prevents federation timing issues
import('./App').then(({ default: App }) => {
  const root = createRoot(document.getElementById('root')!);
  root.render(<App />);
});
```

**Interview vs Production difference:**
In an interview, the configuration above demonstrates full understanding. In production, add dynamic remote URL resolution (fetch from a registry so teams don't need to know each other's CDN URLs), health check endpoints per remote, and integration test pipelines that test the composed application.

---

## 🧠 6. Memory Aid
> The single thing to remember under pressure

**Mental Model:** "One team publishes a shop address (remoteEntry.js). Other teams look up the address and visit the shop at runtime — without knowing what's inside before they arrive."
**If you go blank:** "Shell fetches remoteEntry.js from each team → finds exposed modules → loads them lazily → shares React so it only loads once."
**Mnemonic:** **HOST** — **H**ost loads remotes, **O**nly one shared React, **S**ingleton config, **T**eams deploy independently

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ UX: One seamless app, despite 5 teams deploying independently
→ Performance: Shared React/Angular loads once — not once per team
→ Business: Teams ship without coordination — 10x faster feature delivery vs monolith train

**How it works (3 sentences):**
Each remote team bundles their application and exposes entry points via a `remoteEntry.js` manifest file. The shell application fetches each team's manifest at runtime, then lazily loads modules on demand. Shared dependencies (React, Angular, RxJS) are negotiated at runtime so only one version loads in the browser, preventing duplicate library overhead.

**Company relevance:**
- Microsoft: Teams feature modules use federation principles — any senior role on Teams expects this knowledge
- Adobe: Experience Cloud uses federation to compose independently-shipped product modules
- Salesforce: LWC OSS and internal Lightning framework have federation-equivalent mechanisms
- Cisco: Webex platform engineering — Module Federation for independently deployable meeting/call/messaging modules

---
**✅ Topic 205/486 complete → continuing to Topic 206: Design System Architecture**
