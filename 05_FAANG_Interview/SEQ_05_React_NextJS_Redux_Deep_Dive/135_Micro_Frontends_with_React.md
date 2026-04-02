# 135. Micro Frontends with React
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Micro Frontends (MFEs) extend the microservices philosophy to the frontend — decompose a monolithic frontend into independently deployable UI pieces, each owned by a separate team. The most production-proven approach is **Webpack 5 Module Federation**: a host "shell" application that loads remote modules (components, pages) at runtime from separately deployed apps. Each remote is a full mini-app that can be deployed independently; the shell composes them at runtime. The key challenges are: shared dependency management (React can't have two instances), CSS isolation (classname collisions), cross-team communication (typed contracts, not direct imports), and deployment independence (without a global release lockstep). At SAP Labs I worked within the SAP Fiori Elements architecture, which uses a similar pattern where individual application shells consume reusable, separately deployed UI building blocks.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### Module Federation — Concepts

```typescript
// THE ARCHITECTURE
//
//  shell (host)                 → loads and renders
//  ├─ /products → ProductsMFE  → deployed independently at https://products.company.com
//  ├─ /orders   → OrdersMFE    → deployed independently at https://orders.company.com
//  └─ /auth     → (shared)     → bundled into shell itself
//
// At runtime:
//  1. User navigates to /products
//  2. Shell fetches https://products.company.com/remoteEntry.js (manifest)
//  3. Shell downloads only the modules needed from ProductsMFE
//  4. Shared libs (react, react-dom) loaded once — not re-downloaded per remote
//  5. ProductsMFE components render as if they're part of the shell

// webpack.config.js — SHELL (HOST)
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'shell',
      remotes: {
        // alias: 'remoteName@url/remoteEntry.js'
        ProductsMFE: 'products@https://products.company.com/remoteEntry.js',
        OrdersMFE:  'orders@https://orders.company.com/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
        // singleton: true → only one instance; fails if version mismatch is too large
        // This prevents the "two React instances" bug
      },
    }),
  ],
};

// webpack.config.js — PRODUCTS MFE (REMOTE)
module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'products',          // must match alias above
      filename: 'remoteEntry.js',  // manifest file
      exposes: {
        // './LocalPath': 'what shell calls it'
        './ProductsList': './src/ProductsList',
        './ProductDetail': './src/ProductDetail',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0' },
      },
    }),
  ],
};
```

### Consuming a Remote in the Shell

```typescript
// ❌ Wrong: static import (breaks — ProductsMFE doesn't exist at build time)
import ProductsList from 'ProductsMFE/ProductsList';

// ✅ Dynamic import with React.lazy
import React, { Suspense, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Type the remote module for TypeScript safety
interface RemoteComponent {
  default: React.ComponentType<{ category?: string }>;
}

const ProductsList = lazy<React.ComponentType<{ category?: string }>>(
  () => import('ProductsMFE/ProductsList') as Promise<RemoteComponent>
);

// Usage in shell router:
export function ProductsPage() {
  return (
    <ErrorBoundary fallback={<div>Products unavailable</div>}>
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsList category="electronics" />
      </Suspense>
    </ErrorBoundary>
  );
}

// IMPORTANT: remotes can fail to load (network, deployment issues)
// Always wrap in ErrorBoundary — if ProductsMFE is down, shell should not crash
```

### TypeScript Declarations for Remote Modules

```typescript
// src/declarations.d.ts in the SHELL project
// Without this, TypeScript doesn't know what ProductsMFE/ProductsList exports

declare module 'ProductsMFE/ProductsList' {
  const ProductsList: React.ComponentType<{ category?: string }>;
  export default ProductsList;
}

declare module 'ProductsMFE/ProductDetail' {
  interface Props { productId: string; onBack: () => void; }
  const ProductDetail: React.ComponentType<Props>;
  export default ProductDetail;
}

// In monorepo: generate these types from the remote's own TypeScript exports
// using @module-federation/typescript or @touk/federated-types
```

### Cross-MFE Communication

```typescript
// The problem: ProductsMFE and OrdersMFE are separate bundles — they can't
// share React state. Three patterns for cross-MFE communication:

// ---- Pattern A: Custom Events (DOM events) ----
// Loosely coupled, works across any technology (React, Angular, vanilla)
// Downside: no TypeScript safety without care; hard to trace

// ProductsMFE dispatches:
function addToCart(product: Product) {
  window.dispatchEvent(new CustomEvent('mfe:cart:add', {
    detail: { product },
    bubbles: true,
    composed: true,  // crosses shadow DOM boundaries
  }));
}

// CartMFE listens:
useEffect(() => {
  const handler = (e: Event) => {
    const { product } = (e as CustomEvent).detail;
    setCartItems(prev => [...prev, product]);
  };
  window.addEventListener('mfe:cart:add', handler);
  return () => window.removeEventListener('mfe:cart:add', handler);
}, []);

// ---- Pattern B: Shared Event Bus (Module Federation shared lib) ----
// Expose EventBus from a shared @company/event-bus package
// Both MFEs use singleton instance — same object in memory

// @company/event-bus (shared lib, singleton: true in Module Federation)
type EventMap = {
  'cart:add': { product: Product };
  'auth:logout': void;
  'notifications:show': { message: string; type: 'success' | 'error' };
};

class EventBus {
  private handlers = new Map<string, Set<Function>>();

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]) {
    this.handlers.get(event)?.forEach(handler => handler(payload));
  }

  on<K extends keyof EventMap>(event: K, handler: (payload: EventMap[K]) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)!.delete(handler);  // unsubscribe
  }
}

export const eventBus = new EventBus();  // singleton

// ---- Pattern C: URL / Route State ----
// Shell owns routing; MFEs read from URL params
// Most traceable, survives refresh, bookmarkable
// src/shell/router — shell pushes to history; MFEs read via useSearchParams
```

### CSS Isolation

```typescript
// The problem: ProductsMFE uses class .btn { background: blue }
//              OrdersMFE uses class .btn { background: green }
//              They leak into each other

// ---- CSS Modules (recommended for React MFEs) ----
// webpack transforms .module.css classnames to [filename]_[class]_[hash]
// ProductsMFE: .btn → products_btn_8f3k2
// OrdersMFE: .btn → orders_btn_9x1m4
// Zero collisions

// ---- Shadow DOM ----
// Hard boundary — React needs a special interop to render into Shadow DOM
// Most complex to implement; reserved for when hosting in any host (not just React)

// ---- CSS-in-JS with MFE ----
// Emotion/styled-components: ensure generateAndInjectStyles runs per MFE,
// not once globally. Configure StyleSheet.reset() or use createCache()
// with a custom container per MFE to isolate style tags.
```

### Runtime Environment Config

```typescript
// The problem: at build time, ProductsMFE can't know which environment shell renders it in
// At runtime, shell needs to pass config to remotes

// Pattern: inject global config before loading remotes
// index.html (shell):
/*
  window.__MFE_CONFIG__ = {
    apiBaseUrl: '__API_BASE_URL__',  // replaced by nginx / env-inject at runtime
    featureFlags: { newCheckout: false },
  };
*/

// MFE reads at module init time:
declare global {
  interface Window {
    __MFE_CONFIG__: { apiBaseUrl: string; featureFlags: Record<string, boolean> };
  }
}

const config = window.__MFE_CONFIG__;

// This avoids needing to pass config as React props (which requires shell
// to know MFE's prop interface) and works for all Module Federation consumers
```

### Version Mismatch and Shared Dependencies

```typescript
// The shared: config controls what is deduplicated at runtime

// SCENARIO: Shell uses React 18.2, ProductsMFE built with React 18.1
// With singleton: true → ONE instance is used (shell's 18.2), MFE's 18.1 code uses it
// Works if versions are compatible within semver range

// SCENARIO: Shell uses React 18, OrdersMFE uses React 17
// Module Federation will WARN, then load both versions
// → TWO React instances → hooks break (invalid hook call)
// → Must align React versions across all MFEs

// requiredVersion enforcement — fails loudly in development:
shared: {
  react: {
    singleton: true,
    requiredVersion: '^18.0.0',  // MFE fails to load if version incompatible
    eager: false,  // lazy-loaded with the first consumer (better performance)
  },
}

// eager: true → included in initial bundle (needed for bootstrap/entry point)
// Only the shell's entry bootstrap file should use eager: true
```

### Local Development

```typescript
// Running 10 MFEs locally = painful. Solution: conditionally load local vs deployed:

// shell webpack config:
const isDev = process.env.NODE_ENV === 'development';

remotes: {
  ProductsMFE: isDev
    ? 'products@http://localhost:3001/remoteEntry.js'  // local dev server
    : 'products@https://products.company.com/remoteEntry.js',  // deployed
}

// Also useful: fallback when remote is unavailable locally
async function loadRemoteSafely<T>(importFn: () => Promise<T>, Fallback: React.ComponentType) {
  try { return await importFn(); }
  catch { return { default: Fallback }; }
}

const ProductsList = lazy(() =>
  loadRemoteSafely(
    () => import('ProductsMFE/ProductsList'),
    () => <div>Products module unavailable in this environment</div>
  )
);
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP Labs, the SAP Fiori Elements framework itself is a micro frontend architecture — application UI shells consume independently-versioned UI5 library components, each maintained by separate product teams. Real Module Federation experience comes from complex Fiori extension scenarios where custom apps (React or UI5) were embedded into a standard Fiori shell. Key lessons: shared dependency versioning must be governed centrally (a version bump in one MFE can break others), CSS isolation using CSS Modules prevents the most common integration breakage, and cross-team contract testing (TypeScript declaration files shared via npm package `@company/mfe-types`) ensures type safety at module boundaries.

**At FAANG scale:**
- **Microsoft:** Azure Portal uses an MFE-like architecture with "blades" — each Azure service owns its portal UI, deployed independently, composed at runtime; shared Fluent UI design system consumed as singleton
- **Adobe:** Creative Cloud desktop app uses a shell-remote pattern where each Creative Cloud application (Photoshop web, Express, Frame.io) is an independently deployed module composed in the CC hub
- **Salesforce:** Lightning Web Runtime (LWR) + Experience Cloud is Salesforce's MFE approach — independently deployed components assembled into custom pages by admins, each component independently cached and distributed via CDN
- **Cisco:** DevNet developer portal — documentation, sandbox, APIs, and community are separate MFEs with shared navigation shell; deployment independence means the sandbox team can deploy without a full portal release

---

## 💬 4. Interview Execution

### Sample Answer

> "Micro Frontends extend the microservices model to the frontend — multiple independently deployable UI apps composing into one coherent product. The most production-proven implementation today is Webpack 5 Module Federation.
>
> The key concept: a host 'shell' application declares remotes and shared dependencies. At runtime, the shell fetches a `remoteEntry.js` manifest from each remote (a separately deployed app), downloads only the modules needed, and renders them inside `React.lazy` + `Suspense`. The `shared` config ensures React loads only once — the singleton requirement prevents the two-React-instances bug that breaks hooks.
>
> Four challenges I've worked through: First, shared dependency management — all MFEs must agree on React/React-DOM semver range; `singleton: true` + `requiredVersion` enforces this. Second, CSS isolation — CSS Modules with content hashing prevents classname collisions across teams. Third, cross-MFE communication — prefer typed CustomEvents or a shared event bus (not URL state manipulation), avoiding tight coupling. Fourth, TypeScript contracts — share `@company/mfe-types` npm package with declaration files so the shell has compile-time safety on what each remote exposes.
>
> Always wrap remote consumption in ErrorBoundary — remotes are a network call and can fail independently."

---

## 💻 5. Code Example

```typescript
// Complete Module Federation setup for a products MFE

// ===== products-mfe/webpack.config.js =====
const { ModuleFederationPlugin } = require('webpack').container;
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => ({
  entry: './src/index.ts',
  output: {
    filename: '[name].[contenthash].js',
    publicPath: 'auto',  // auto-detects base URL at runtime — critical for CDN deploys
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'products',
      filename: 'remoteEntry.js',
      exposes: {
        './ProductsList': './src/components/ProductsList',
        './ProductDetail': './src/components/ProductDetail',
        './useProductsStore': './src/store/productsStore',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.0.0', eager: false },
        'react-dom': { singleton: true, requiredVersion: '^18.0.0', eager: false },
        'react-router-dom': { singleton: true, requiredVersion: '^6.0.0', eager: false },
      },
    }),
    new HtmlWebpackPlugin({ template: './public/index.html' }),
  ],
});

// ===== products-mfe/src/bootstrap.tsx =====
// IMPORTANT: async import prevents eager-loading sharing issues
import('./App');

// ===== products-mfe/src/index.ts =====
// Just re-exports the bootstrap (all module federation remotes need this pattern)
import('./bootstrap');

// ===== products-mfe/src/components/ProductsList.tsx =====
interface Product { id: string; name: string; price: number; }

interface ProductsListProps {
  category?: string;
  onSelect?: (product: Product) => void;
}

export default function ProductsList({ category, onSelect }: ProductsListProps) {
  const { data: products, isLoading } = useProducts(category);

  if (isLoading) return <ProductsSkeleton />;

  return (
    <ul>
      {products?.map(product => (
        <li key={product.id}>
          <button onClick={() => onSelect?.(product)}>
            {product.name} — ${product.price}
          </button>
        </li>
      ))}
    </ul>
  );
}

// ===== shell/src/pages/ProductsPage.tsx =====
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const ProductsList = lazy(() => import('ProductsMFE/ProductsList'));

export function ProductsPage() {
  const navigate = useNavigate();

  return (
    <ErrorBoundary
      fallback={<div role="alert">Products service is currently unavailable</div>}
      onError={(error) => {
        console.error('ProductsMFE load failed:', error);
        analytics.track('mfe_load_failure', { mfe: 'products' });
      }}
    >
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductsList
          category="electronics"
          onSelect={(product) => navigate(`/products/${product.id}`)}
        />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

## 🧠 6. Memory Aid

**MFE architecture — RECS:**
- **R**emote: each MFE is a separately deployed app with a `remoteEntry.js`
- **E**xposes + **S**hared: what the remote exposes; what is shared as singleton dependencies
- **C**onsume lazily: shell uses `React.lazy(() => import('RemoteName/Component'))`
- **E**rror Boundary: always wrap — remote is a network call, not a local module

**4 challenges with solutions:**
1. Dependency conflicts → `singleton: true` + `requiredVersion` in `shared`
2. CSS collisions → CSS Modules (scoped classnames per team)
3. Communication → typed CustomEvents or shared EventBus (not global variables)
4. TypeScript → `@company/mfe-types` shared npm package with declaration files

**`publicPath: 'auto'`** — always use this; without it, assets load from shell's URL, not the remote's URL, causing 404s for MFE's images and styles.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ MFEs solve the organizational scaling problem: when 50+ engineers work on one frontend, merge conflicts, coordination overhead, and "big bang" deployments become the bottleneck; MFEs let teams own, deploy, and scale their UI independently — this framing (engineering velocity, team autonomy) is what resonates at staff/principal level interviews
→ Module Federation `singleton: true` for React is the single most critical config line — without it, teams will deploy independent React version bumps that silently create two React instances and break hooks in production; demonstrating you know this failure mode shows you've shipped real MFEs
→ ErrorBoundary wrapping of remotes is non-negotiable in production — a remote `remoteEntry.js` fetch can fail due to network, CDN, or deployment issues; if the shell crashes instead of gracefully degrading, one MFE's deployment failure takes down the entire product; this resilience pattern shows senior operational judgment

**How it works (2 sentences):**
Webpack Module Federation works by generating a `remoteEntry.js` manifest at build time in the remote app — this file is a JavaScript module that, when executed, registers the remote's exposed modules and declares its shared dependency requirements; the host shell, at runtime, fetches and evaluates this manifest file to discover what is available, then uses dynamic `import()` to asynchronously download only the specific component modules needed, using the shared scope to deduplicate common libraries like React so they are loaded exactly once regardless of how many remotes are consumed.
The `singleton: true` field in the shared configuration instructs the Module Federation runtime to enforce that only one instance of the library (e.g., React) exists in the JavaScript VM for the lifetime of the page — when multiple remotes each declare `react` as shared, the runtime picks the highest compatible version that satisfies all `requiredVersion` ranges and provides that single instance to all consumers, preventing the "two React instances" failure where hook calls fail because they look up state in the wrong React object.

---
✅ SEQ 5 complete — 55 topics done. Say GO to start SEQ 6: State Management & TanStack Deep Dive
