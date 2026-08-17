# 129. Code Splitting — React.lazy, Suspense, Dynamic Import
**Phase:** React, Next.js & Redux Deep Dive | **Sequence:** SEQ 05 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

Code splitting is the technique of dividing your JavaScript bundle into smaller chunks loaded on demand — instead of sending 1MB of JS on initial load, you send 200KB for the critical path and load the rest lazily as the user navigates. React provides `React.lazy()` for component-level code splitting: it wraps a dynamic import and tells React to download that chunk only when the component needs to render. `<Suspense>` provides the fallback UI during the load. Webpack (webpack default) and Vite (Rollup-based) both perform automatic code splitting at dynamic import boundaries. In Next.js, every `page.tsx` is automatically a separate chunk (route-level splitting is free), and `next/dynamic` wraps `React.lazy` with SSR support. The payoff: faster initial load (less JS to parse/execute), better TTI, and better Lighthouse scores.

---

## 🔍 2. Deep Dive — Senior/Staff Level

### The Problem: Bundle Bloat

```
Without code splitting:
  Initial load → bundle.js (1.2MB)
  ├── React core           (40KB)
  ├── App router/nav       (50KB)
  ├── Dashboard component  (80KB)
  ├── Analytics charts     (350KB!  Highcharts)
  ├── Admin panel          (200KB)
  ├── Rich text editor     (300KB!  Quill.js)
  └── Utilities            (180KB)

User only visits Dashboard → paid 1.2MB for Analytics + Admin + RTE they never used

With code splitting:
  Initial load → main.js (170KB)  ← 86% smaller
  ├── React core           (40KB)
  ├── App router/nav       (50KB)
  ├── Dashboard (eager)    (80KB)

  Only when chart route accessed:
  → charts.chunk.js       (350KB)  Analytics Highcharts

  Only when admin navigates to admin:
  → admin.chunk.js         (200KB)
  → editor.chunk.js        (300KB)
```

### React.lazy + Suspense

```typescript
import { lazy, Suspense, useState } from 'react';

// ====== Route-level splitting ======
// NOT a component — just a lazy import of the default export
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const RichEditor = lazy(() =>
  import('./pages/RichEditor').then(m => ({ default: m.RichEditor }))
  // ↑ named export → wrap in { default } shape as required by React.lazy
);

export function App() {
  const [page, setPage] = useState<'home' | 'analytics' | 'admin' | 'editor'>('home');

  return (
    <>
      <nav>
        <button onClick={() => setPage('analytics')}>Analytics</button>
        <button onClick={() => setPage('admin')}>Admin</button>
      </nav>

      {/* Suspense MUST wrap lazy component (can be ancestor) */}
      <Suspense fallback={<PageSkeleton />}>
        {page === 'analytics' && <AnalyticsDashboard />}
        {page === 'admin' && <AdminPanel />}
        {page === 'editor' && <RichEditor />}
      </Suspense>
    </>
  );
}

// ====== Multiple lazy components — one Suspense ======
// One <Suspense> can catch multiple lazy children
// They load in parallel, skeleton shown until ALL are ready:
const Header = lazy(() => import('./Header'));
const Sidebar = lazy(() => import('./Sidebar'));
const MainContent = lazy(() => import('./MainContent'));

function Layout() {
  return (
    <Suspense fallback={<LayoutSkeleton />}>
      <Header />
      <Sidebar />
      <MainContent />
    </Suspense>
  );
}

// ====== Nested Suspense — independent loading states ======
// Different components load independently with their own skeletons
function PageWithIndependentParts() {
  return (
    <div>
      {/* Header loads first, shows quickly */}
      <Suspense fallback={<HeaderSkeleton />}>
        <Header />
      </Suspense>

      <div className="content">
        {/* Sidebar and content load independently */}
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>

        <Suspense fallback={<ContentSkeleton />}>
          <MainContent />
        </Suspense>
      </div>
    </div>
  );
}
```

### Preloading — Remove Load Latency on Navigation

```typescript
// Problem: user clicks "Analytics" → wait for analytics.chunk.js to download
// Solution: start loading the chunk BEFORE user clicks (on hover)

const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));

// Preload: manually trigger the dynamic import (not handled by React)
function preloadAnalytics() {
  void import('./pages/AnalyticsDashboard');  // fire and forget
}

function NavLink() {
  return (
    <button
      onPointerEnter={preloadAnalytics}  // start download on hover
      onFocus={preloadAnalytics}         // keyboard navigation: preload on focus
      onClick={() => navigate('/analytics')}
    >
      Analytics
    </button>
  );
}

// The chunk starts downloading on hover (200-500ms before click)
// By the time user clicks, the chunk is usually already loaded → zero wait
```

### Error Handling with Suspense + ErrorBoundary

```typescript
import { lazy, Suspense, Component } from 'react';

class ChunkErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log chunk loading failures — often network timeouts
    console.error('Chunk loading failed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      // Offer retry — the chunk may have failed due to network
      return (
        <div role="alert">
          <p>Failed to load this section.</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const HeavyFeature = lazy(() => import('./HeavyFeature'));

function FeatureSection() {
  return (
    <ChunkErrorBoundary fallback={<div>Feature unavailable</div>}>
      <Suspense fallback={<Spinner />}>
        <HeavyFeature />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
```

### Webpack Magic Comments — Fine-Grained Chunk Control

```typescript
// Named chunk — easier to identify in bundle analysis and CDN logs
const AdminPanel = lazy(() =>
  import(/* webpackChunkName: "admin-panel" */ './AdminPanel')
);

// Prefetch hint — browser downloads this chunk during idle time (low priority)
// Same as <link rel="prefetch"> but for JS chunks
const ProfilePage = lazy(() =>
  import(/* webpackPrefetch: true */ './ProfilePage')
);

// Preload hint — download this chunk as soon as possible (high priority)
// Use sparingly — it competes with critical resources
const CriticalModal = lazy(() =>
  import(/* webpackPreload: true */ './CriticalModal')
);
```

### Dynamic Import for Non-Component Code

```typescript
// Code splitting doesn't require React.lazy — any dynamic import creates a chunk

// Lazy load a heavy utility library
async function exportToPDF(data: any[]) {
  const { jsPDF } = await import('jspdf');        // chunk only loaded when exporting
  const { autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF();
  autoTable(doc, { body: data });
  doc.save('export.pdf');
}

// Lazy load a heavy chart library on demand
async function renderChart(canvas: HTMLCanvasElement, data: number[]) {
  const { Chart } = await import('chart.js/auto');  // 200KB — only load when needed
  return new Chart(canvas, { type: 'bar', data: { datasets: [{ data }] } });
}

// Conditional polyfill loading
async function setupIntersectionObserver() {
  if (!('IntersectionObserver' in window)) {
    await import('intersection-observer');  // polyfill for old browsers only
  }
  // ... use IntersectionObserver
}
```

### Measuring Code Splitting Effectiveness

```bash
# Before splitting: check initial bundle size
npx source-map-explorer dist/main.js
# or with Next.js:
ANALYZE=true next build

# After splitting: verify chunks are created
ls -la .next/static/chunks/
# Look for: pages/dashboard.js, pages/analytics.js etc.

# Check that heavy deps are NOT in main bundle:
# grep for 'highcharts', 'quill', 'moment' in main chunk
# If present → import() boundary not working

# Measure improvement with Lighthouse:
# Before:  FCP 3.2s, TTI 8.5s
# After:   FCP 1.1s, TTI 2.8s (lazy loading removed 1MB from parsing)
```

---

## 🏭 3. Real-World Examples

**At Hruday's level:**
At SAP, the main app bundle was 1.4MB because every page including the "advanced analytics" dashboard (Highcharts, 400KB) and "document editor" (Quill, 340KB) were eagerly imported in the root component. Converting both to `React.lazy()` + `Suspense` with `webpackChunkName` annotations reduced the initial bundle to 210KB. Added `onPointerEnter` preloading on nav links so chunks started downloading on hover — users navigating to analytics experienced zero perceptible load time (chunk was already downloaded during the ~300ms hover delay). TTI improved from 8.5s → 2.2s on a simulated 3G connection.

**At FAANG scale:**
- **Microsoft:** VS Code Web — hundreds of language service workers and editor features loaded with dynamic import on first use; `webpackChunkName` annotations in every feature file for tracing in production monitoring
- **Adobe:** Photoshop on the web — each tool (crop, select, filter) loaded as a separate Wasm + JS chunk; `webpackPrefetch: true` on likely next tool based on current tool usage patterns (data-driven preloading)
- **Salesforce:** Einstein Analytics — dashboard widgets lazy-loaded per type; preloading triggered by viewport proximity (IntersectionObserver watching viewport, `import()` when widget is 2 screens away)
- **Cisco:** Network topology editor — SVG rendering engine (300KB) lazy-loaded only when "Edit Topology" button is clicked; user sees the diagram initially but editor controls load deferred

---

## 💬 4. Interview Execution

### Sample Answer

> "Code splitting at its core is creating dynamic import boundaries so webpack generates separate chunk files for different parts of the app — the critical path gets a small main bundle, everything else loads on demand.
>
> React.lazy wraps a dynamic import. It requires Suspense as an ancestor to show a fallback while the chunk downloads. For named exports you need to reshape: `.then(m => ({ default: m.Component }))`. For error handling, wrap in an ErrorBoundary — chunk loads can fail due to network issues.
>
> The most underused technique is preloading. By default there's latency between 'user clicked' and 'module arrives.' If you start the import on `onPointerEnter`, you've got 200-500ms of head start — by the time the click fires, the chunk is cached. On a fast connection this feels instant; on slow connections it makes the difference between 2s and 0.3s navigation.
>
> For things that don't need to be visible immediately, webpack magic comments `/* webpackPrefetch: true */` tell the browser to download the chunk during idle time — it shows up in your network panel with low priority after the page is interactive."

---

## 💻 5. Code Example

```typescript
// Complete code splitting setup with preloading + error boundary
import { lazy, Suspense, Component, useState, type ReactNode } from 'react';

// Lazy imports with named chunks for analytics
const AnalyticsDashboard = lazy(() =>
  import(/* webpackChunkName: "analytics-dashboard" */ '@/features/analytics/Dashboard')
);
const DataExporter = lazy(() =>
  import(/* webpackPrefetch: true, webpackChunkName: "data-exporter" */ '@/features/DataExporter')
);

// Error boundary for chunk failures
class LazyBoundary extends Component<
  { children: ReactNode; name: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div role="alert">
          Failed to load {this.props.name}.{' '}
          <button onClick={() => this.setState({ error: null })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Preload utility
function preload<T>(factory: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    if (!promise) promise = factory();
    return promise;
  };
}

const preloadAnalytics = preload(() =>
  import(/* webpackChunkName: "analytics-dashboard" */ '@/features/analytics/Dashboard')
);

// Usage in nav
export function AppNav() {
  const [view, setView] = useState<'home' | 'analytics'>('home');

  return (
    <>
      <nav>
        <button
          onPointerEnter={preloadAnalytics}  // preload on hover
          onClick={() => setView('analytics')}
        >
          Analytics
        </button>
      </nav>

      <LazyBoundary name="Analytics Dashboard">
        <Suspense fallback={<div aria-busy="true">Loading analytics...</div>}>
          {view === 'analytics' && <AnalyticsDashboard />}
        </Suspense>
      </LazyBoundary>
    </>
  );
}
```

---

## 🧠 6. Memory Aid

**SLPE — code splitting pattern:**
- **S**plit: `React.lazy(() => import('./Component'))`
- **L**oad fallback: `<Suspense fallback={<Skeleton />}>`
- **P**reload on hover: `onPointerEnter={() => import('./Component')}`
- **E**rror boundary: wrap `<Suspense>` in `<ErrorBoundary>` for chunk failures

**Chunk naming options:**
- `webpackChunkName` = readable name in DevTools
- `webpackPrefetch` = low priority idle download (for maybe next)
- `webpackPreload` = high priority alongside parent (for definitely next)

**Mnemonic:** **SLPE** — Split modules, Load with Suspense, Preload on hover, Error boundary for safety.

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ Bundle size is directly correlated with Time to Interactive (TTI) — every 100KB of additional JS adds ~0.5s of parse/compile time on a mid-range mobile device (per Addy Osmani's research); code splitting is the most impactful single technique for improving TTI and first-load experience at scale
→ The preloading pattern (pointerEnter + import()) is a concrete differentiator — most candidates explain how React.lazy works but few demonstrate the proactive performance technique that eliminates perceived load time; it's the kind of detail that comes from actually building production UIs, not reading docs
→ Error boundaries around lazy components are frequently missed — a user on flaky mobile network sees ChunkLoadError without them; raising this shows you think about failure modes, not just happy paths

**How it works (2 sentences):**
`React.lazy()` stores the import factory as a pending Promise — when React first tries to render the lazy component, it calls the factory (triggering the HTTP request for the chunk), and if the Promise isn't resolved yet, React throws the Promise object (a special mechanism called "suspense throwing"), which is caught by the nearest `<Suspense>` ancestor that renders the fallback instead; when the Promise resolves (chunk loaded), React re-renders the Suspense subtree using the now-available component.
At the bundler level, `import('./module')` is an async import boundary that webpack turns into a split point: the imported module and all its unique dependencies are extracted into a separate chunk file (e.g., `analytics-dashboard.abc123.js`), a `__webpack_require__.e()` call is generated in the parent chunk that loads the chunk file via a dynamically injected `<script>` tag and returns a Promise that resolves when the script is loaded and evaluated — this is what `React.lazy`'s factory function ultimately awaits.

---
✅ Topic 129/486 complete → Continuing to Topic 130: Memoization — React.memo, useMemo, useCallback Deep Dive
