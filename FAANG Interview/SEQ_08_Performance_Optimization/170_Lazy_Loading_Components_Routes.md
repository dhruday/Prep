# 170. Lazy Loading Components & Routes
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"Lazy loading is the runtime delivery of code splitting — it determines when a chunk actually loads, not just how it's split. Where code splitting draws the boundaries, lazy loading enforces the timing. I think of it in two contexts: route lazy loading (load the page's JS only when the user navigates to that route) and component lazy loading (load a component's JS only when it's about to be rendered). At SAP we had a reporting module with a heavy charting library — 320KB — loaded on every page because it was imported at the app root. Moving to lazy loading cut the initial bundle and deferred that 320KB until users actually opened a report. The key discipline is the loading state: a lazy component needs a skeleton fallback that matches the component's dimensions to prevent CLS, a timeout pattern to show error state if loading takes too long, and an error boundary to handle network failures gracefully."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Lazy loading defers the download, parsing, and execution of JavaScript (and other assets) until the moment they are actually needed. It builds on code splitting (which creates the boundaries) by controlling when each boundary chunk is fetched.

```
Without lazy loading:
Browser startup → Parse ALL JS → Execute ALL JS → Render any part
                  ─────────────────────────────
                         2.1s main thread blocked (SAP example)

With lazy loading:
Browser startup → Parse CORE JS → Render (LCP) → User navigates → Parse NEXT route
                  ──────────────
                     400ms (core only)
```

### React.lazy() — Internal Mechanism

`React.lazy()` wraps a dynamic import in a React-compatible lazy loader. Internally:

1. Returns a "lazy component" that is initially in a `pending` state
2. When rendered for the first time, calls the `() => import()` factory and throws the resulting Promise
3. React's Suspense boundary catches the thrown Promise
4. React renders the `fallback` prop while the Promise is pending
5. When the Promise resolves (chunk loaded), React re-renders with the real component
6. If the Promise rejects (chunk load failure), propagates to the nearest Error Boundary

```typescript
// How React.lazy works internally (simplified)
function lazy<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  let status: 'pending' | 'fulfilled' | 'rejected' = 'pending';
  let result: T | unknown;
  const promise = factory().then(
    (module) => { status = 'fulfilled'; result = module.default; },
    (error)  => { status = 'rejected';  result = error; }
  );

  return {
    $$typeof: REACT_LAZY_TYPE,
    _payload: { _status: status, _result: result },
    _init: () => {
      if (status === 'fulfilled') return result as T;
      throw status === 'pending' ? promise : result; // throws Promise or Error
    },
  } as LazyExoticComponent<T>;
}
```

### The Complete Lazy Loading Pattern

```typescript
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// ─── 1. Lazy component declaration (module scope — critical) ─────
const ReportDashboard = lazy(() => import('./features/reports/Dashboard'));
const AdminPanel      = lazy(() => import('./features/admin/AdminPanel'));

// ─── 2. Error fallback for chunk load failures ───────────────────
function LazyErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div role="alert">
      <p>Failed to load this section.</p>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

// ─── 3. Skeleton matching real component dimensions ──────────────
function ReportDashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-busy="true" aria-label="Loading dashboard...">
      <div className="skeleton-header" style={{ height: 56 }} />
      <div className="skeleton-chart"  style={{ height: 320 }} />
      <div className="skeleton-table"  style={{ height: 400 }} />
    </div>
  );
}

// ─── 4. Composed lazy component usage ────────────────────────────
function App() {
  return (
    <ErrorBoundary
      FallbackComponent={LazyErrorFallback}
      onReset={() => window.location.reload()}
    >
      <Suspense fallback={<ReportDashboardSkeleton />}>
        <ReportDashboard />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Route-Level Lazy Loading with React Router

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';

// All routes lazy-loaded by default
const HomeRoute     = lazy(() => import('./routes/Home'));
const ProductsRoute = lazy(() => import('./routes/Products'));
const CheckoutRoute = lazy(() => import('./routes/Checkout'));
const AdminRoute    = lazy(() => import('./routes/Admin'));

// Route-level Suspense built into router definition
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<RouteLoadingSkeleton />}>
        <HomeRoute />
      </Suspense>
    ),
  },
  {
    path: '/products',
    element: (
      <Suspense fallback={<RouteLoadingSkeleton />}>
        <ProductsRoute />
      </Suspense>
    ),
  },
  {
    path: '/checkout',
    element: (
      <Suspense fallback={<RouteLoadingSkeleton />}>
        <CheckoutRoute />
      </Suspense>
    ),
  },
]);

// React Router v6.4+ Data API — parallel data + component loading
const routerWithPrefetch = createBrowserRouter([
  {
    path: '/products',
    lazy: async () => {
      // Parallel: load component AND data simultaneously
      const [{ default: Component }, data] = await Promise.all([
        import('./routes/Products'),
        fetch('/api/products').then(r => r.json()),
      ]);
      return {
        Component,
        loader: () => data, // pre-fetched data available immediately
      };
    },
  },
]);
```

### Next.js Dynamic Imports — Advanced Patterns

```typescript
import dynamic from 'next/dynamic';

// ─── Pattern 1: With custom loading ──────────────────────────────
const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // client-only component (uses window, canvas, WebGL)
});

// ─── Pattern 2: Named export ──────────────────────────────────────
const { LineChart } = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { ssr: false }
);

// ─── Pattern 3: Conditional loading based on feature flag ─────────
const GanttChart = dynamic(
  () => process.env.NEXT_PUBLIC_GANTT_ENABLED
    ? import('./GanttChart')
    : Promise.resolve({ default: () => <div>Feature disabled</div> }),
  { ssr: false }
);

// ─── Pattern 4: Multiple named exports from heavy library ─────────
// Don't: import entire recharts
// Do: individually lazy-load needed chart types
const LazyLineChart = dynamic(() =>
  import('recharts').then(m => ({ default: m.LineChart })), { ssr: false });
const LazyBarChart = dynamic(() =>
  import('recharts').then(m => ({ default: m.BarChart })), { ssr: false });
```

### Angular @defer Block — Angular 17+

Angular's `@defer` template syntax is the most declarative lazy loading for Angular:

```typescript
// products.component.html
@defer (on viewport) {
  <!-- Loaded when element enters viewport -->
  <app-product-reviews [productId]="product.id" />
} @loading (minimum 200ms) {
  <app-skeleton height="200px" />
} @error {
  <p>Failed to load reviews. <button (click)="$event">Retry</button></p>
} @placeholder {
  <!-- Shown before intersection, unlike @loading which shows during download -->
  <div style="height: 200px" aria-hidden="true"></div>
}

@defer (on interaction; prefetch on hover) {
  <!-- Heavy PDF viewer — only loads when user clicks "View PDF" -->
  <app-pdf-viewer [url]="documentUrl" />
} @placeholder {
  <button>View PDF Document</button>
}

@defer (when userHasScrolledDown) {
  <!-- Custom condition-based lazy loading -->
  <app-below-fold-content />
}
```

### Angular Traditional Lazy Loading

```typescript
// app-routing.module.ts — route-level lazy loading
const routes: Routes = [
  { path: '', component: HomeComponent }, // eagerly loaded — home needs to be instant
  {
    path: 'reports',
    loadChildren: () =>
      import('./features/reports/reports.module').then(m => m.ReportsModule),
  },
  {
    path: 'admin',
    loadComponent: () =>    // Angular 14+ standalone component lazy loading
      import('./features/admin/admin.component').then(c => c.AdminComponent),
    canActivate: [AdminGuard],
  },
];
```

### Intersection Observer Lazy Loading

For below-the-fold sections (not route-based), use IntersectionObserver to trigger load exactly when content enters viewport:

```typescript
import { useState, useRef, useEffect } from 'react';

// Hook: load component when it enters viewport
function useLazyLoad(rootMargin = '200px') {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // load once, never observe again
        }
      },
      { rootMargin } // 200px pre-load buffer before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, isVisible };
}

// Usage: lazy-load below-fold section
const HeavyAnalyticsSection = lazy(() => import('./AnalyticsSection'));

function ProductPage() {
  const { ref, isVisible } = useLazyLoad('300px');

  return (
    <div>
      <AboveFoldContent />  {/* loaded immediately */}

      {/* Placeholder div triggers IntersectionObserver */}
      <div ref={ref} style={{ minHeight: '400px' }}>
        {isVisible && (
          <Suspense fallback={<AnalyticsSkeleton />}>
            <HeavyAnalyticsSection />
          </Suspense>
        )}
      </div>
    </div>
  );
}
```

### Preloading Strategy — Load Before User Needs It

```typescript
// Prefetch on authenticated user entering app
// (knows they will likely navigate to dashboard)
function useRoutePrefetch() {
  useEffect(() => {
    // After 3 seconds of idle time, prefetch likely routes
    const timer = setTimeout(() => {
      import('./routes/Dashboard');
      import('./routes/Reports');
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
}

// Prefetch on link hover (React Router Link wrapper)
function SmartLink({ to, prefetch, children, ...props }: {
  to: string;
  prefetch?: boolean;
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  const prefetchModule = async () => {
    if (!prefetch) return;
    const prefetchMap: Record<string, () => Promise<unknown>> = {
      '/checkout': () => import('./routes/Checkout'),
      '/admin':    () => import('./routes/Admin'),
    };
    await prefetchMap[to]?.();
  };

  return (
    <Link to={to} onMouseEnter={prefetchModule} {...props}>
      {children}
    </Link>
  );
}
```

### Loading State — The Critical Detail

The #1 mistake with lazy loading is a **dimension mismatch** between the skeleton and the loaded component — causes CLS:

```typescript
// ❌ BAD: Generic spinner that doesn't match component dimensions
<Suspense fallback={<Spinner />}>
  <DataTable />  {/* DataTable is 600px tall; spinner is 40px → CLS 0.3 */}
</Suspense>

// ✅ GOOD: Skeleton matching exact component dimensions
<Suspense fallback={<DataTableSkeleton rows={10} />}>
  <DataTable />  {/* Skeleton reserves 600px → no CLS */}
</Suspense>

function DataTableSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-busy="true" aria-label="Loading table...">
      <div className="skeleton-header" style={{ height: 48 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row" style={{ height: 52 }} />
      ))}
    </div>
  );
}
```

### The Timing Triangle — When to Load What

```
                    Time of Need
                         ↑
     Too early ──────────┼──────────── Too late
  (wastes bandwidth)     │         (user waits)
                         │
  ────────────────────── │ ──────────────────────
  Eager load:     now    │  Renders immediately — for above-fold critical
  Prefetch:       idle   │  Loads after main page — for likely-next routes
  Lazy + viewport: enter │  Loads as user scrolls — for below-fold sections
  Lazy + click:   click  │  Loads on demand — for rarely used heavy features
```

### Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| `React.lazy()` inside component body | Creates new lazy instance every render; re-downloads on every render | Declare `lazy()` at module scope |
| No error boundary around lazy components | Chunk load failure crashes entire React tree | Always pair `<Suspense>` with `<ErrorBoundary>` |
| `ssr: false` without proper fallback (Next.js) | Hydration mismatch if SSR renders nothing but client expects skeleton | Use `loading` option to show consistent fallback |
| Lazy loading the LCP element's component | Forces browser to start chunk download before LCP — worsens LCP | Never lazy-load above-the-fold components |
| Spinner as Suspense fallback | CLS when real component is different size than spinner | Use dimension-matched skeleton |
| No `minimum` on `@defer @loading` | Loading flash if chunk loads in 50ms — shows/hides too fast | Add `minimum 200ms` debounce |

---

## 🌍 3. Real-World Examples

### SAP — Deferred Charting Library
Charts in the BI Launchpad used `@amcharts/amcharts5` — 320KB. It was imported at the app module level (Angular). Even pages with no charts carried this cost. After wrapping chart components in Angular lazy-loaded feature modules and using `@defer (on viewport)` in Angular 17, charts only loaded when users actually navigated to a report page AND scrolled to the chart position. 20% of sessions never visited reports — those users saw 320KB savings entirely.

### Microsoft — Adaptive Loading by Device Class
Microsoft Teams web detects device capability via `navigator.deviceMemory` at startup. On low-end devices (< 2GB), the reaction panel, poll creation, and background blur are lazy-loaded after 10 seconds of idle instead of eagerly prefetched at 3s. On high-end devices, all are prefetched aggressively. This "adaptive lazy loading" tailors the experience: high-end users see instant feature availability; low-end users get a fast initial render.

### Adobe — Viewport-Triggered Load
Adobe Creative Cloud's asset library shows thumbnails for thousands of assets but only loads high-resolution previews when the thumbnail enters viewport. Using IntersectionObserver with `rootMargin: '400px'`, the full-res image starts loading 400px before it becomes visible — virtually always ready before the user scrolls to it. This reduced bandwidth consumption by 70% on long asset list pages since most users scroll only 30–40% of the list.

### Salesforce — Data Loading Co-located with Component
Salesforce Lightning uses a pattern where lazy-loaded components also declare their data requirements. When the component chunk loads, its `@wire` declarations activate and begin fetching data in parallel. This avoids the sequential "load component → then fetch data" waterfall — data fetch begins as soon as component code is available, not after it's fully parsed and rendered.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "Lazy loading controls *when* code splitting chunks are actually downloaded — route-level (on navigation), component-level (on render or viewport intersection), or on-demand (user interaction). At SAP, a 320KB charting library was imported at the app module level and loaded for every user even if they never visited a report. After lazy-loading it behind Angular's `loadChildren` and Angular 17's `@defer` directive, that 320KB is deferred for 20% of users who never navigate to reports at all, and for others it loads during idle time before they open a report. The critical implementation details: always pair `React.lazy` with `Suspense` AND `ErrorBoundary` — lazy chunks fail on network issues and without error handling the entire app crashes. The Suspense fallback must match the component's dimensions exactly or you get CLS. Never lazy-load the LCP component — that delays first paint. And `lazy()` must be declared at module scope, never inside a component body."

### Follow-Up Q&A

**Q: What is the difference between `React.lazy` and `next/dynamic`?**
A: `React.lazy` is the React core primitive — it wraps a dynamic import and integrates with Suspense. It runs on both client and server (RSC). `next/dynamic` is Next.js's wrapper that adds: `ssr: false` option (skip SSR for browser-only components, preventing hydration mismatch), a `loading` prop (declarative fallback without separate Suspense), and a `modules` option (for named exports). `next/dynamic` is preferred in Next.js projects; `React.lazy` is the portable standard for non-Next apps.

**Q: How does Angular's @defer differ from React.lazy?**
A: `@defer` is declarative in templates, not imperative in JS. It supports five trigger types: `on viewport` (IntersectionObserver-based), `on interaction` (user event on placeholder), `on idle` (requestIdleCallback), `when <condition>` (boolean expression), and `on timer(ms)`. It also has `@loading`, `@error`, and `@placeholder` blocks built-in — equivalent to Suspense fallback + ErrorBoundary in one construct. Angular's tree-shakes the deferred components at build time automatically; React requires explicit `lazy()` calls.

**Q: What happens when a React.lazy() chunk takes 10 seconds to load on a slow connection?**
A: The Suspense fallback is shown indefinitely until the chunk resolves or rejects. There's no built-in timeout. The recommended pattern: add a timeout-based fallback using `useEffect` inside the Suspense fallback component — after N seconds of loading, show an error message with a retry button. Alternatively, use the React error boundary with a `onError` that fires after the `lazy()` Promise rejects (which happens on true network failure, not just slowness).

### Lazy Loading Triggers Comparison

| Trigger | Use Case | Implementation |
|---------|----------|---------------|
| Route navigation | Page-level components | `React.lazy` + router, Angular `loadChildren` |
| Viewport entry | Below-fold sections | IntersectionObserver + `lazy()` |
| User interaction | Modal, drawer, overlay | `useState` gate + `lazy()` |
| Hover/focus | Likely-next navigation | Prefetch on hover |
| Idle time | Probable-next features | `setTimeout/requestIdleCallback` |
| Authenticated | Features behind login | Conditional `import()` after auth |

---

## 💻 5. Code Example (TypeScript)

```typescript
// Complete lazy loading system with retry, timeout feedback, and intersection

import { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';

// ─── Retry-aware dynamic import ──────────────────────────────────
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries = 3
): LazyExoticComponent<T> {
  return lazy(() => {
    let retries = 0;
    const attempt = (): Promise<{ default: T }> =>
      importFn().catch((err) => {
        if (retries >= maxRetries) throw err;
        retries++;
        return new Promise(resolve => setTimeout(resolve, 1000 * retries))
          .then(() => attempt());
      });
    return attempt();
  });
}

// ─── Timeout Suspense fallback ────────────────────────────────────
function TimedSuspenseFallback({
  initialLabel = 'Loading...',
  slowLabel = 'Still loading… slow connection?',
  slowThreshold = 3000,
}: {
  initialLabel?: string;
  slowLabel?: string;
  slowThreshold?: number;
}) {
  const [isSlow, setIsSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIsSlow(true), slowThreshold);
    return () => clearTimeout(t);
  }, [slowThreshold]);

  return (
    <div role="status" aria-live="polite">
      <div className="skeleton loading-skeleton" aria-hidden="true" />
      <span className="sr-only">{isSlow ? slowLabel : initialLabel}</span>
      {isSlow && (
        <p className="slow-message" aria-live="assertive">
          {slowLabel}
        </p>
      )}
    </div>
  );
}

// ─── Viewport-triggered lazy load hook ───────────────────────────
function useViewportLazyLoad(options: { rootMargin?: string } = {}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || hasEntered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasEntered(true);
          observer.disconnect();
        }
      },
      { rootMargin: options.rootMargin ?? '250px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEntered, options.rootMargin]);

  return { sentinelRef, hasEntered };
}

// ─── Putting it all together ──────────────────────────────────────
import type { ComponentType, LazyExoticComponent } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// Use retry-aware lazy for critical components
const HeavyDataGrid    = lazyWithRetry(() => import('./HeavyDataGrid'), 3);
const ReportDashboard  = lazyWithRetry(() => import('./ReportDashboard'), 3);

function ProductPageWithLazyAnalytics() {
  const { sentinelRef, hasEntered } = useViewportLazyLoad({ rootMargin: '300px' });
  const [showExport, setShowExport] = useState(false);

  return (
    <div>
      {/* Above-fold: NOT lazy loaded */}
      <ProductHeader />
      <ProductDetails />

      {/* Below-fold: viewport-triggered lazy load */}
      <div ref={sentinelRef} style={{ minHeight: 500 }}>
        {hasEntered && (
          <ErrorBoundary
            fallback={<div>Failed to load analytics. <button onClick={() => window.location.reload()}>Reload</button></div>}
          >
            <Suspense fallback={<TimedSuspenseFallback initialLabel="Loading analytics..." slowThreshold={2000} />}>
              <ReportDashboard />
            </Suspense>
          </ErrorBoundary>
        )}
      </div>

      {/* On-demand: interaction-triggered */}
      <button onClick={() => setShowExport(true)}>Export Data</button>
      {showExport && (
        <ErrorBoundary fallback={<div>Export failed to load</div>}>
          <Suspense fallback={<TimedSuspenseFallback initialLabel="Loading export..." />}>
            <HeavyDataGrid />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"RIVE"**
- **R** — Route-level (on navigation — always)
- **I** — Interaction (click/hover — for modals, drawers, rarely used features)
- **V** — Viewport (IntersectionObserver — for below-fold sections)
- **E** — Error Boundary (always pair with Suspense — chunk load can fail)

### The Timing Rule
```
Above the fold → Eager (never lazy!)
First screenful of data → Prefetch on idle (likely seen)
Below fold → Viewport lazy load (seen when scrolled)
Triggered feature → On-demand lazy (optional heavy feature)
```

### Analogy
Lazy loading is like a **just-in-time warehouse**: customer orders a product → then you pick it from the shelf. You don't load every product onto the delivery truck at the start of the day when 80% of them won't be ordered. But you do pre-position the top-10 bestsellers near the loading dock (prefetch) so they're instantly ready. And you never delay loading the item the customer is standing right in front of (above the fold = eager load).

---

## ✅ 7. Why & How Summary

- **Why it matters:** Lazy loading ensures users only parse and execute JavaScript for features they actually use — at SAP a 320KB charting library eliminated from initial load for 20% of users who never visited reports, directly reducing main-thread blocking and improving LCP
- **How it works:** `React.lazy()` wraps a dynamic import — on first render it throws the Promise to the nearest Suspense boundary, which shows the fallback while the chunk downloads; when resolved, React replaces the fallback with the real component; `ErrorBoundary` catches Promise rejections (network failures)
- **How Hruday uses it:** Applied at SAP with Angular `loadChildren` for 12 route modules and `@defer (on viewport)` for below-fold chart components; skeleton fallbacks matched exact component dimensions to prevent CLS; `lazyWithRetry` pattern added for production reliability on slow corporate networks

---

✅ Topic 170/486 complete → Continuing to Topic 171: Tree Shaking
