# 169. Code Splitting Strategies
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"Code splitting is about shipping only the JavaScript a user needs for the current page or interaction — nothing more. At SAP, we had a monolithic 1.2MB JS bundle that loaded everything for all 12 modules on every page visit. After route-level code splitting, the initial bundle dropped to 280KB, and each module loaded as needed. LCP improved by 1.1 seconds because the main-thread blocking time before first render dropped from 2.1s to under 400ms. I apply three layers of code splitting: route splitting (per page, automatic in Next.js App Router), component splitting (modals, heavy charts, admin panels that most users never see), and library splitting (moment.js, PDF libraries, Mapbox — import only on the page that needs them). The discipline is defining the right split boundaries — too many small chunks creates waterfall round trips, too few defeats the purpose."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Code splitting breaks one large JavaScript bundle into multiple smaller chunks. The browser loads only the chunks needed for the current page, deferring the rest until required. Without code splitting:

```
Initial bundle: ──────────────────────── 1.2MB ──────────────────────── all routes
Download + parse + execute 1.2MB on every page load
Main thread blocked for 2-3 seconds before first interactive render

With route-level code splitting:
Initial bundle: ─── 280KB ─── (core framework + current route)
Other routes: ───────────── loaded on demand ────────────────
```

### The Three Levels of Code Splitting

```
Level 1: Entry Point Splitting
  Multiple Webpack entry points per page
  Legacy pattern — modern frameworks handle this automatically

Level 2: Route-Level Splitting (most impactful)
  Each route = separate chunk
  Loaded when route is activated
  3–10× initial bundle reduction for large SPAs

Level 3: Component-Level Splitting (fine-grained)
  Individual components lazy-loaded
  Used for: modals, drawers, admin panels, heavy charts, file upload UIs
  Applied when component is: > 50KB AND not needed on initial render

Level 4: Library Splitting (vendor chunks)
  Third-party libraries in separate chunks
  Benefits from long cache TTLs (libraries change less than app code)
  Critical: separate "common" vendor chunk vs "per-route" vendor chunk
```

### Route-Level Code Splitting

**React (React.lazy + Suspense):**
```typescript
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Each lazy() call = separate async chunk
const HomePage     = lazy(() => import('./pages/Home'));
const ProductsPage = lazy(() => import('./pages/Products'));
const CheckoutPage = lazy(() => import('./pages/Checkout'));
const AdminPage    = lazy(() => import('./pages/Admin'));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/"          element={<HomePage />} />
        <Route path="/products"  element={<ProductsPage />} />
        <Route path="/checkout"  element={<CheckoutPage />} />
        <Route path="/admin/*"   element={<AdminPage />} />
      </Routes>
    </Suspense>
  );
}
```

**Next.js App Router (automatic):**
```typescript
// Next.js App Router automatically code-splits by route segment
// app/products/page.tsx → compiled to its own chunk
// app/checkout/page.tsx → compiled to its own chunk
// No manual lazy() needed for routes

// For components that are not routes, use dynamic() for additional splitting:
import dynamic from 'next/dynamic';

const HeavyDataVizChart = dynamic(
  () => import('@/components/DataVizChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // skip SSR for browser-only chart libraries
  }
);
```

**Angular (Lazy Module Loading):**
```typescript
// app-routing.module.ts
const routes: Routes = [
  { path: '', component: HomeComponent },
  {
    path: 'products',
    loadChildren: () =>
      import('./features/products/products.module').then(m => m.ProductsModule),
  },
  {
    path: 'admin',
    loadChildren: () =>
      import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AdminGuard],
  },
];

// Angular 17+ — standalone component lazy loading
const routes: Routes = [
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/products.component').then(c => c.ProductsComponent),
  },
];
```

### Component-Level Code Splitting

Use for components that are:
- **Heavy** (> 30–50KB gzipped)
- **Not needed on initial render** (above-the-fold test)
- **Conditionally rendered** (modals, drawers, admin panels)

```typescript
// Heavy PDF viewer — only load when user actually opens it
const PDFViewer = lazy(() => import('@/components/PDFViewer'));
// react-pdf is 500KB+ — never load it on page load

function DocumentPage() {
  const [showPDF, setShowPDF] = useState(false);

  return (
    <div>
      <button onClick={() => setShowPDF(true)}>View PDF</button>
      {showPDF && (
        <Suspense fallback={<PDFLoadingSpinner />}>
          <PDFViewer url="/document.pdf" />
        </Suspense>
      )}
    </div>
  );
}

// Heavy data grid — only used by enterprise users
const DataGrid = lazy(() => import('@/components/EnterpriseDataGrid'));
// AG Grid is 380KB — split it out of the main bundle
```

### Library-Level Splitting

The biggest wins often come from third-party libraries:

```typescript
// ❌ WRONG: Import entire library at top level
import moment from 'moment'; // 67KB gzipped — for a single date format!

// ✅ CORRECT: Import only what you need from a smaller alternative
import { format } from 'date-fns'; // 2KB tree-shaken

// ❌ WRONG: Import Mapbox in every component
import mapboxgl from 'mapbox-gl'; // 200KB+ — user might never see the map

// ✅ CORRECT: Dynamic import on component mount
async function loadMap(container: HTMLElement) {
  const { default: mapboxgl } = await import('mapbox-gl');
  return new mapboxgl.Map({ container, style: 'mapbox://styles/mapbox/streets-v11' });
}
```

### Webpack Chunk Configuration

```javascript
// webpack.config.js — smart chunking strategy
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // React core + essential deps — cached aggressively
        framework: {
          name: 'framework',
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          priority: 40,
          enforce: true,
        },
        // Large UI library — separate cache key from app code
        ui: {
          name: 'ui',
          test: /[\\/]node_modules[\\/](@mui|antd|@mantine)[\\/]/,
          priority: 30,
        },
        // Charts — often only on specific pages
        charts: {
          name: 'charts',
          test: /[\\/]node_modules[\\/](recharts|d3|chart\.js)[\\/]/,
          priority: 20,
        },
        // All remaining vendor code
        vendors: {
          name: 'vendors',
          test: /[\\/]node_modules[\\/]/,
          priority: 10,
          minChunks: 2,    // only split if used in ≥2 routes
          minSize: 20_000, // only split if > 20KB
        },
        // Shared app code used across multiple routes
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  },
};
```

### Prefetching Lazy Chunks

The main downside of lazy loading is a waterfall: user navigates → browser discovers chunk needed → download begins → delay. **Prefetching** downloads chunks during idle time before they're needed:

```typescript
// Magic comment: webpack/Vite prefetch hint
const AdminPage = lazy(() =>
  import(/* webpackPrefetch: true */ './pages/Admin')
);
// Browser adds: <link rel="prefetch" href="/admin.[hash].js">
// Downloads during idle time after main page loads

// Preload (loads in parallel with current page — use carefully)
const CriticalModal = lazy(() =>
  import(/* webpackPreload: true */ './components/CriticalModal')
);
// Use preload only for things needed very soon after initial render

// Programmatic prefetch on hover (better UX than magic comments)
function NavLink({ to, label }: { to: string; label: string }) {
  const prefetchRoute = async () => {
    if (to === '/products') await import('./pages/Products');
    if (to === '/checkout') await import('./pages/Checkout');
  };

  return (
    <Link to={to} onMouseEnter={prefetchRoute}>
      {label}
    </Link>
  );
}
```

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React framework — separate stable chunk
          if (id.includes('react') || id.includes('react-dom')) {
            return 'react-vendor';
          }
          // UI library
          if (id.includes('@radix-ui') || id.includes('@headlessui')) {
            return 'ui-vendor';
          }
          // Charts
          if (id.includes('recharts') || id.includes('d3')) {
            return 'charts-vendor';
          }
          // All other node_modules
          if (id.includes('node_modules')) {
            return 'vendors';
          }
        },
      },
    },
    chunkSizeWarningLimit: 300, // warn if any chunk > 300KB
  },
  plugins: [react()],
});
```

### The Split Point Decision Framework

```
Should I code-split this component/route?

1. Is it > 30KB gzipped?
   └── No → don't split (roundtrip cost > saving)

2. Is it needed on initial render (above the fold)?
   └── Yes → don't split (would cause lazy-load delay on first paint)

3. Is it used by < 50% of page visitors?
   └── Yes → strong candidate for splitting

4. Is it conditionally rendered (modal, drawer, tooltip)?
   └── Yes → definitely split

5. Is the route accessed via navigation (not initial URL)?
   └── Yes → route split it

Decision: if answers to 1+3 OR 1+4 OR 1+5 are YES → split it
```

### Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Splitting everything into tiny chunks (< 5KB) | Too many roundtrips; HTTP/2 helps but not infinite | Minimum 20–30KB threshold per chunk |
| Not using Suspense boundaries | `lazy()` throws a Promise; without Suspense it crashes | Always wrap with `<Suspense fallback>` |
| Splitting the LCP element's component | The LCP component lazy-loads → delayed first paint | Never split above-the-fold critical components |
| Dynamic import inside render | `import()` inside render creates new promise each render → infinite load | Put `lazy()` at module scope, not inside component |
| No error boundary around Suspense | Chunk load failure crashes entire tree | Pair `<Suspense>` with `<ErrorBoundary>` |
| Over-splitting shared utilities | `utils.js` lazy-loaded causes waterfall | Only split large, rarely-used code |

```typescript
// ❌ WRONG: lazy() inside component body
function App() {
  // New lazy() on every render = new chunk request on every render!
  const Modal = lazy(() => import('./Modal'));
  return <Suspense><Modal /></Suspense>;
}

// ✅ CORRECT: lazy() at module scope (outside component)
const Modal = lazy(() => import('./Modal'));
function App() {
  return <Suspense fallback={<Spinner />}><Modal /></Suspense>;
}
```

---

## 🌍 3. Real-World Examples

### SAP Labs — Module-Level Code Splitting
The SAP BI Launchpad had 12 distinct modules (Reports, Dashboards, Administration, Scheduling, etc.), all bundled together. Initial bundle was 1.2MB. Strategy:
1. **Route split** each of the 12 modules via Angular lazy loaded modules
2. **Library split** SAP UI5 rendering engine (loaded ~450KB for components on pages that never rendered any UI5 controls)
3. **Component split** the PDF export module (180KB) and Excel export (220KB) — only loaded when user actually exports

Result: Initial bundle 1.2MB → 280KB. LCP improved by 1.1s. Most users visit 2–3 modules per session, so they never load the other 9.

### Microsoft — Office Web Apps
Microsoft Word Online uses aggressive component-level code splitting. The equation editor (MathML/LaTeX), drawing tools, and track changes panel are all separate chunks loaded on first access. This keeps the initial interactive bundle under 400KB even though the total application is > 8MB. On first equation insertion, there's a deliberate 200ms loading indicator while the equation chunk downloads — users accept this once vs having it slow every initial load.

### Adobe — Photoshop Web
Adobe Photoshop web uses dynamic imports for every filter and adjustment panel. The "Curves" adjustment panel, "Neural Filters" (AI-powered), and "Camera Raw" are each separate WASM + JS bundles (500KB–2MB each). None are loaded at startup. Adobe found that 60% of sessions use < 5 distinct panels — splitting all 40+ panels saves 8MB+ of initial download for typical users. They prefetch the 5 most-used panels after initial render completes.

### Salesforce — Lightning Component Registry
Salesforce Lightning Experience dynamically loads LWC (Lightning Web Components) on demand using a component registry — essentially route-level splitting for components. A record page for Opportunity objects loads only the components defined in the page layout for that record type. An Opportunity with 12 components doesn't load the 80+ other components in the system. This is why Salesforce UI feels different on configuration-heavy vs simple page layouts.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Code splitting is the discipline of loading only the JavaScript required for the current page. I apply three levels: route-level (each page = separate chunk — biggest win, often 3-5× initial bundle reduction), component-level (heavy modals, chart libraries, admin panels that most users never see), and library-level (third-party packages like PDF viewers, maps, or data grids loaded on demand). At SAP, a 1.2MB monolithic bundle loaded all 12 modules on every visit. After lazy-loading each module with Angular's `loadChildren`, the initial bundle dropped to 280KB, main-thread parse time fell from 2.1s to 400ms, and LCP improved by 1.1 seconds. The critical rules are: never split components that are above the fold (delays LCP), always pair `React.lazy` with `Suspense` and an `ErrorBoundary`, and prefetch on hover for routes the user is likely to navigate to. Too many tiny chunks causes waterfall round-trips — minimum threshold is ~20KB per split."

### Follow-Up Q&A

**Q: What's the difference between `webpackPrefetch` and `webpackPreload`?**
A: `Prefetch` adds `<link rel="prefetch">` — tells the browser to download the chunk during idle time, with low priority, after the current page is fully loaded. Use for routes the user might navigate to next. `Preload` adds `<link rel="preload">` — tells the browser to download the chunk with high priority, in parallel with the current page load. Use for chunks needed very soon after the initial render (e.g., a modal that opens 500ms after page load). Misusing `preload` for all lazy chunks competes with LCP resources for bandwidth, worsening performance.

**Q: How does HTTP/2 multiplexing change the code splitting strategy?**
A: HTTP/1.1 limited connections per domain, so having 50 small chunks caused serialized downloads. HTTP/2 multiplexes unlimited streams over one connection, making many smaller chunks feasible. But there's still overhead: each chunk requires its own request header, and the browser's module evaluation happens sequentially. Optimal chunk count under HTTP/2 is 10–30 per page load, not hundreds. Module bundlers use `minSize: 20000` and `maxAsyncRequests: 25` to calibrate this.

**Q: What happens if a lazy chunk fails to load (network offline)?**
A: `React.lazy()` throws a Promise rejection which propagates up the component tree. Without an error boundary, it crashes React rendering entirely. The solution is to wrap every `<Suspense>` with a `<ErrorBoundary>` that catches chunk load failures and shows a "Failed to load this section — tap to retry" message. Libraries like `react-error-boundary` and TanStack Query handle retry logic; for lazy chunks you implement manual retry via the `resetErrorBoundary` function.

### Split Strategy Decision Table

| Code Type | Split Level | Trigger | Priority |
|-----------|------------|---------|----------|
| Page routes | Route | Navigation | High (always) |
| Admin panel | Route + guard | Auth check | High |
| Modal dialogs > 50KB | Component | User interaction | High |
| Data grid (AG Grid, etc.) | Component | Page render | High |  
| PDF/Excel export | Component | Button click | Medium |
| Map (Mapbox, Leaflet) | Component | Tab/section reveal | Medium |
| Rich text editor | Component | Click to edit | Medium |
| Tiny components < 20KB | Don't split | — | None |
| Authentication flow | Don't split | — | None (needed immediately) |

---

## 💻 5. Code Example (TypeScript)

```typescript
// Complete code splitting implementation with error boundaries and prefetch

import { lazy, Suspense, ComponentType, useState } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

// ─── Route-level splits ───────────────────────────────────────────
const HomePage     = lazy(() => import('./pages/Home'));
const ProductsPage = lazy(() => import('./pages/Products'));
const CheckoutPage = lazy(() => import('./pages/Checkout'));
// Admin split — with prefetch only after auth check
const AdminPage    = lazy(() =>
  import(/* webpackPrefetch: true */ './pages/Admin')
);

// ─── Component-level splits ───────────────────────────────────────
const PDFExport = lazy(() => import('./components/PDFExport'));
const DataGrid  = lazy(() => import('./components/DataGrid'));
const RichEditor = lazy(() => import('./components/RichTextEditor'));

// ─── Error boundary for chunk load failures ───────────────────────
function ChunkErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const isChunkError = error.message.includes('Loading chunk')
    || error.message.includes('Failed to fetch dynamically imported module');

  return (
    <div role="alert" className="chunk-error">
      {isChunkError ? (
        <>
          <p>Failed to load this section. Check your connection.</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </>
      ) : (
        <p>Something went wrong: {error.message}</p>
      )}
    </div>
  );
}

// ─── Skeleton components for Suspense fallbacks ───────────────────
function PageSkeleton() {
  return <div className="skeleton page-skeleton" aria-busy="true" />;
}
function ComponentSkeleton() {
  return <div className="skeleton component-skeleton" aria-busy="true" />;
}

// ─── Prefetch on hover navigation ────────────────────────────────
const routePrefetchMap: Record<string, () => Promise<unknown>> = {
  '/products': () => import('./pages/Products'),
  '/checkout': () => import('./pages/Checkout'),
  '/admin':    () => import('./pages/Admin'),
};

function PrefetchLink({ to, children }: { to: string; children: React.ReactNode }) {
  const handleMouseEnter = () => {
    const prefetch = routePrefetchMap[to];
    if (prefetch) prefetch(); // fire and forget; browser caches the module
  };

  return (
    <Link to={to} onMouseEnter={handleMouseEnter}>
      {children}
    </Link>
  );
}

// ─── Main App ─────────────────────────────────────────────────────
export function App() {
  return (
    <ErrorBoundary FallbackComponent={ChunkErrorFallback}>
      <nav>
        <PrefetchLink to="/products">Products</PrefetchLink>
        <PrefetchLink to="/checkout">Checkout</PrefetchLink>
      </nav>

      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/"         element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/admin/*"  element={<AdminPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

// ─── Lazy component usage example ────────────────────────────────
function ProductDetailPage({ productId }: { productId: string }) {
  const [showExport, setShowExport] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  return (
    <div>
      <h1>Product Detail</h1>

      {/* DataGrid: large enterprise component, only shown on demand */}
      <button onClick={() => setShowGrid(true)}>
        Show Price History Grid
      </button>
      {showGrid && (
        <ErrorBoundary FallbackComponent={ChunkErrorFallback}>
          <Suspense fallback={<ComponentSkeleton />}>
            <DataGrid productId={productId} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* PDF Export: 520KB library, only load when user requests */}
      <button onClick={() => setShowExport(true)}>
        Export as PDF
      </button>
      {showExport && (
        <ErrorBoundary FallbackComponent={ChunkErrorFallback}>
          <Suspense fallback={<ComponentSkeleton />}>
            <PDFExport productId={productId} />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"RACER"**
- **R** — Route-level (always — biggest impact, automatic in Next.js)
- **A** — Above-the-fold (never split — delays LCP)
- **C** — Component-level (heavy + conditional = split)
- **E** — Error Boundary (always pair with Suspense)
- **R** — Route Prefetch (on hover, not webpackPreload for routes)

### Analogy
Code splitting is like a **buffet restaurant that serves dishes on demand** vs a set menu delivered all at once. Without splitting, the waiter brings everything from the kitchen to your table before you can eat — including dishes you didn't order. With code splitting, you get your starter immediately, the main course when you're ready for it, and dessert only when you ask. Total food is the same; timing is right.

---

## ✅ 7. Why & How Summary

- **Why it matters:** A monolithic JS bundle forces users to download and parse code for routes and features they'll never visit; at SAP a 1.2MB bundle blocking first paint for 2.1s was reduced to 280KB (400ms parse) by route-splitting 12 modules — directly improving LCP by 1.1s
- **How it works:** Bundlers (Webpack/Vite/Rollup) convert dynamic `import()` calls into async chunk boundaries; the browser downloads each chunk only when needed; `React.lazy()` integrates with Suspense to show fallback UI during chunk download; `webpackPrefetch` hints download chunks in idle time before they're needed
- **How Hruday uses it:** Applied three levels at SAP — Angular `loadChildren` for 12 routes, dynamic `import()` for PDF/Excel exports, separate vendor chunks for Angular framework vs application code — reducing initial bundle 77% and LCP 1.1s

---

✅ Topic 169/486 complete → Continuing to Topic 170: Lazy Loading Components & Routes
