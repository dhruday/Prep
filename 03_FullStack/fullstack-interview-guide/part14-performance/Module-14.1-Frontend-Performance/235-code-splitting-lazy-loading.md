# Code Splitting and Lazy Loading
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Code splitting** breaks your JavaScript bundle into smaller chunks; **lazy loading** delivers those chunks only when needed — together they reduce initial bundle size, speed up first load (LCP), and keep the main thread clear for interactions (INP)
- **React**: `React.lazy(() => import('./Dashboard'))` with `<Suspense fallback={<Spinner />}>` for component-level splitting; React Router's `lazy` for route-level splitting — each route gets its own chunk, downloaded only when user navigates to it
- **Angular**: `loadChildren: () => import('./feature/feature.module').then(m => m.FeatureModule)` in route config for module-based lazy loading; `loadComponent` for standalone component lazy loading (Angular 15+); the Angular CLI generates separate chunk files automatically
- **Why it matters for INP**: large initial bundles create long JavaScript parsing and execution tasks on the main thread; splitting means each page loads only the code it needs; a 4MB monolithic bundle → first page might only need 400KB → 90% less JavaScript to parse → much lower INP risk
- **Preloading vs prefetching**: `/* webpackPreload: true */` = fetch in parallel with current chunk (for resources needed now); `/* webpackPrefetch: true */` = fetch during browser idle time (for resources likely needed next — like the checkout page when user is on cart)
- ✅ **Hruday's anchor**: SAP Labs — micro-frontend lazy loading via Module Federation; also reduced main product bundle from 2.4MB to 680KB by route-splitting and lazy-loading the heavy reporting module; LCP improved from 3.1s to 1.4s on the product listing page

---

## 1. One-Line Definition
Code splitting divides a JavaScript application into multiple smaller chunks that can be loaded independently; lazy loading defers the download and execution of those chunks until the moment they are actually needed — reducing initial payload, speeding up first paint, and minimizing main-thread blocking.

---

## 2. The Problem It Solves

The default behavior of most JavaScript bundlers (Webpack, Vite, Rollup) is to combine all your source files into one bundle. For a small app this is fine. For a large app this creates a serious performance problem.

Imagine an app with these features: authentication pages, a product catalog, a complex report builder with chart libraries (D3, Recharts — ~800KB combined), an admin panel with data grids, and a checkout flow. If all this code is in one bundle, every user — including someone who just wants to check their order status — downloads the chart libraries and the admin panel on first load. They will never use those things. You've made them wait for code they don't need.

The concrete impact:
- Large bundle → browser downloads more bytes → longer network time → worse LCP
- Large bundle → browser parses and executes more JavaScript → long main-thread task → worse INP
- Users on mobile (3G, limited CPU) feel this most severely

Code splitting solves this by making the bundler output separate files: a small initial bundle for the first page, plus separate chunks for each feature. Users download the 150KB initial bundle immediately, then download the 800KB chart library only when they actually navigate to the reporting section.

At SAP, the reporting module (which included a 600KB charting library) was being shipped to every user even on the product listing page. After lazy-loading that module, initial bundle dropped from 2.4MB to 680KB. LCP improved by 1.7 seconds on mobile.

---

## 3. How It Works Internally

### How the Bundler Knows Where to Split

```
Dynamic import syntax is the split signal:

  // Static import → code STAYS in the main bundle (no split)
  import Dashboard from './Dashboard';  // merged at build time

  // Dynamic import → code is extracted to a SEPARATE CHUNK (split signal)
  import('./Dashboard');  // bundler creates dashboard.chunk.abc123.js

The bundler (Webpack/Vite) scans for dynamic import() calls.
Each unique dynamic import is the root of a new chunk.
The chunk is only downloaded when that import() statement is executed at runtime.
```

### What Webpack Actually Outputs

```
Before code splitting:
  dist/
    main.js         → 2.4 MB  (EVERYTHING: app + charts + admin + auth + checkout)

After route-based code splitting:
  dist/
    main.js         → 320 KB  (shell: router, common components, utilities)
    vendor.js       → 180 KB  (React, ReactDOM — changes rarely, long cache)
    auth.chunk.js   →  45 KB  (login/register pages)
    catalog.chunk.js → 220 KB (product listing + search)
    reporting.chunk.js → 820 KB (D3, Recharts, complex data grid — lazy loaded)
    admin.chunk.js  → 340 KB  (admin panel — lazy loaded)
    checkout.chunk.js → 95 KB (cart + payment forms)

User visits product listing:  downloads main.js + vendor.js + catalog.chunk.js = 720 KB
User never visits reporting:  NEVER downloads reporting.chunk.js = saves 820 KB download
```

### React Lazy Loading Flow

```
Router Navigation to /reports:
       │
       ▼
React Router resolves /reports → ReportsPage component
       │
       ▼
  React.lazy() wrapper is evaluated for first time
  → React starts dynamic import('/reports-bundle.chunk.js')
       │
       ▼
  Suspense boundary catches "loading" state
  → Renders <fallback> (spinner, skeleton screen)
  → User sees loading indicator immediately
       │
       ▼ (network request completes)
  chunk downloaded + parsed + executed
       │
       ▼
  ReportsPage component is now available
  → Suspense renders ReportsPage
  → Loading indicator replaced with actual page
```

---

## 4. The Code

### Wrong Way — One Giant Bundle with Static Imports

```typescript
// ❌ WRONG — app.tsx with ALL imports static
// Everything is merged into one bundle at build time

import { BrowserRouter, Routes, Route } from 'react-router-dom';
// ❌ Static import: D3, Recharts, data-grid all bundled in main chunk
// User on the home page downloads 800KB of chart libraries they'll never use
import ReportsPage from './pages/ReportsPage';
import AdminPanel from './pages/AdminPanel';
import CheckoutPage from './pages/CheckoutPage';
import ProductCatalog from './pages/ProductCatalog';

// All 4 pages (and their entire dependency trees) are in main.bundle.js
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductCatalog />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/checkout" element={<CheckoutPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

> **Why this fails:** `import ReportsPage from './pages/ReportsPage'` is a static import. Webpack merges `ReportsPage`, all its imports (D3, Recharts, data-grid), and all their transitive dependencies into `main.bundle.js`. Every page load includes the reports library (800KB) even for users who never visit `/reports`. LCP on the catalog page is terrible because the browser parses 2.4MB of JavaScript before it can respond to interactions.

### Right Way — Route-Based Lazy Loading with React

```typescript
// ✅ RIGHT — app.tsx with route-based code splitting

import { BrowserRouter, Routes, Route } from 'react-router-dom';
// ✅ Import only the non-lazy parts statically (router, shared layout)
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import { lazy, Suspense } from 'react';

// ✅ React.lazy() + dynamic import: each page is a separate chunk
// Webpack creates: reports.chunk.js, admin.chunk.js, checkout.chunk.js, catalog.chunk.js
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const AdminPanel  = lazy(() => import('./pages/AdminPanel'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ProductCatalog = lazy(() => import('./pages/ProductCatalog'));

// ✅ Named chunks: webpackChunkName comment controls output filename
// This makes debugging easier and enables long-term caching by filename
const ReportsPageNamed = lazy(
  () => import(/* webpackChunkName: "reports" */ './pages/ReportsPage')
);

function App() {
  return (
    <BrowserRouter>
      {/*
        ✅ Suspense: required wrapper for lazy components
        fallback: what to show while the chunk is downloading
        boundary placed at route level: one spinner per page transition
      */}
      <Suspense fallback={<LoadingSpinner fullPage />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<ProductCatalog />} />
            <Route path="reports" element={<ReportsPageNamed />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="checkout" element={<CheckoutPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

```typescript
// ✅ RIGHT — React Router v6.4+ data router with lazy() (no React.lazy needed)
// Preferred approach in 2024+: combines route loading + data fetching

import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        index: true,
        // ✅ React Router's built-in lazy: downloads route component + data loader together
        // No Suspense required — React Router handles the loading state
        lazy: async () => {
          const { default: Component, loader } = await import('./pages/ProductCatalog');
          return { Component, loader };
        },
      },
      {
        path: 'reports',
        lazy: async () => {
          const { default: Component, loader } = await import('./pages/ReportsPage');
          return { Component, loader };
        },
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}
```

```typescript
// ✅ RIGHT — Component-level lazy loading (not just routes)
// For heavy components rendered conditionally within a page

import { lazy, Suspense, useState } from 'react';

// ✅ Heavy chart component: only loaded when user toggles the chart view
// The chart library (Recharts, ~450KB gzipped ~120KB) only downloads when needed
const SalesChart = lazy(
  () => import(/* webpackChunkName: "sales-chart" */ './components/SalesChart')
);

// ✅ PDF viewer: heavy library, only shown when user clicks "View Invoice"
const PdfViewer = lazy(
  () => import(/* webpackChunkName: "pdf-viewer" */ './components/PdfViewer')
);

const OrderDetailPage: React.FC = () => {
  const [showChart, setShowChart] = useState(false);
  const [showPdf, setShowPdf]     = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Sales Chart</button>
      
      {showChart && (
        // ✅ Suspense with specific fallback: chart skeleton shows while loading
        <Suspense fallback={<ChartSkeleton />}>
          <SalesChart orderId={orderId} />
        </Suspense>
      )}

      <button onClick={() => setShowPdf(true)}>View Invoice PDF</button>
      
      {showPdf && (
        <Suspense fallback={<div>Loading PDF viewer...</div>}>
          <PdfViewer invoiceUrl={invoiceUrl} />
        </Suspense>
      )}
    </div>
  );
};
```

### Angular Lazy Loading

```typescript
// ✅ RIGHT — Angular route-based lazy loading (app.routes.ts)

import { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      // ✅ Standalone component lazy load (Angular 15+)
      // Angular CLI creates: product-catalog.chunk.js automatically
      import('./product-catalog/product-catalog.component')
        .then(m => m.ProductCatalogComponent),
  },
  {
    path: 'reports',
    // ✅ Feature module lazy load (traditional NgModule approach)
    // Loads entire module + all its declared components when route is activated
    loadChildren: () =>
      import('./reports/reports.module')
        .then(m => m.ReportsModule),
  },
  {
    path: 'admin',
    // ✅ Guard-protected lazy route: auth guard runs before chunk downloads
    // If guard fails, the chunk is never downloaded (saves bandwidth for unauthorized users)
    canLoad: [AuthGuard],
    loadChildren: () =>
      import('./admin/admin.module')
        .then(m => m.AdminModule),
  },
];
```

```typescript
// ✅ RIGHT — Preloading strategy in Angular (app.config.ts)
// Choose preloading strategy to balance lazy loading with UX responsiveness

import { ApplicationConfig } from '@angular/core';
import { provideRouter, PreloadAllModules, withPreloading } from '@angular/router';
import { APP_ROUTES } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      APP_ROUTES,
      // ✅ PreloadAllModules: after initial page loads, prefetch all lazy chunks in background
      // Trade-off: wastes bandwidth for chunks user might never visit
      withPreloading(PreloadAllModules),
      
      // Alternative: QuicklinkModule (third-party) — only preloads links visible in viewport
      // Much smarter: preloads only what the user is likely to navigate to next
    ),
  ],
};
```

### Prefetch and Preload Hints

```typescript
// ✅ RIGHT — Webpack magic comments for prefetch (likely next navigation)

// webpackPrefetch: true → browser downloads chunk during CPU/network idle time
// Use for: routes user is likely to visit next (checkout when on cart page)
const CheckoutPage = lazy(
  () => import(/* webpackPrefetch: true */ './pages/CheckoutPage')
);

// webpackPreload: true → browser downloads chunk in parallel with current chunk
// Use for: resources needed immediately on the current page but in a code-split module
// WARNING: misuse hurts more than helps (forces parallel download, competes with LCP resources)
const CriticalModal = lazy(
  () => import(/* webpackPreload: true */ './components/CriticalModal')
);

// Manual prefetch trigger: programmatically trigger prefetch on hover
// Classic pattern: user hovers over "Go to Checkout" → we prefetch checkout bundle
const CartPage: React.FC = () => {
  const handleCheckoutHover = () => {
    // Trigger prefetch when user shows intent (hovering over the link)
    import(/* webpackPrefetch: true */ './pages/CheckoutPage');
  };

  return (
    <Link to="/checkout" onMouseEnter={handleCheckoutHover}>
      Go to Checkout
    </Link>
  );
};
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is React.lazy and when would you use it?"

**Hruday's answer:**
> `React.lazy()` is a function that lets you define a component whose code is loaded dynamically — it's only downloaded from the server when the component is first rendered, not when the app first loads. You wrap it in a `Suspense` boundary that shows a fallback (spinner, skeleton) while the chunk downloads.
>
> The practical use cases where it pays off are: route-level splitting for any page with its own heavy dependencies; large conditional UI like a PDF viewer or a complex chart library that only appears when the user explicitly requests it; and heavy third-party components like rich text editors (TipTap, Quill — each ~300KB+) that only some users interact with.
>
> The cases where it's NOT worth it: small components (under ~30KB), shared layout components that appear on every page (those belong in the main bundle), or components that users interact with immediately on page load (lazy-loading those means they see a spinner when they first arrive, which is worse UX than a slightly larger initial bundle).
>
> At SAP, the reporting module had D3 and Recharts as dependencies. These are 400KB combined. They were being shipped to every user even on the product listing page. Lazy-loading that route reduced initial bundle by 38% and improved LCP by 1.7 seconds.

---

### Q2 — Experience Deep Dive
**Interviewer asks:** "Describe a code splitting implementation you did and how you measured its impact."

**Hruday's answer:**
> At SAP Labs, the main product bundle was 2.4MB gzipped at the time I joined the performance initiative. The first step was analysis: I used `webpack-bundle-analyzer` to generate a visual treemap of the bundle. Two things stood out: the reporting module (D3 + Recharts + a data grid library) was 820KB and loaded on every route; and the admin panel components were another 340KB, but only 15% of users had admin access.
>
> The fix was route-based lazy loading. I converted both modules to `React.lazy(() => import('./pages/ReportsPage'))` with `Suspense` boundaries. Angular Router already handles lazy loading natively, so the equivalent change in the Angular micro-frontend was adding `loadChildren` to the route config.
>
> For measurement: before and after Lighthouse runs on the product listing page (the most visited page). LCP went from 3.1s to 1.4s. Time to Interactive dropped from 6.2s to 2.8s. The actual bundle size for the product listing route dropped from 2.4MB to 680KB.
>
> The one gotcha: I added Suspense boundaries but the initial fallback was a plain white div — which actually increased CLS because the page layout shifted when the component loaded. Fixed by replacing the white div with a skeleton screen that matched the page layout dimensions.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "What are the downsides of aggressive code splitting and how do you manage them?"

**Hruday's answer:**
> The main downsides are: waterfall loading, cache fragmentation, and route transition jank.
>
> Waterfall loading: if you split too aggressively, navigating to a page might require downloading the route chunk, then inside that component discovering more lazy-loaded sub-components, downloading those, and so on. Instead of one network request you have three serial ones. User sees multiple spinners sequentially. The fix is to keep the logical unit of a "page" in one chunk — don't split inside a lazy-loaded route unless that sub-component is genuinely rarely used.
>
> Cache fragmentation: webpack creates content-hash filenames (catalog.chunk.a3f8c2.js). When you split into many chunks, the number of files a user must cache increases. If you deploy frequently, more chunks get invalidated. The right balance: split at route level (each route is independently deployable), keep shared utilities in a vendor chunk (changes rarely, long cache TTL), avoid micro-splitting (one component per chunk is too granular).
>
> Route transition jank: user clicks a link, there's a 300-500ms delay downloading the chunk, then the page appears. This feels slow. The fix is preloading: for routes the user is likely to visit next (checkout when on cart, reports when on dashboard), trigger a `webpackPrefetch` either automatically (Angular's `PreloadAllModules`) or manually on hover. The chunk arrives before the user navigates.
>
> The principle: split by "features a user visits occasionally" not by "any component that's large."

---

### Q4 — System Design Angle
**Interviewer asks:** "Design the bundle strategy for a large SaaS dashboard with 12 feature modules, some rarely used by most users."

**Hruday's answer:**
> I'd structure it in three tiers.
>
> Tier 1 — Always-loaded (main bundle, target < 300KB): router, authentication shell, navigation bar, shared design system components (buttons, inputs, typography), global error boundary, Sentry SDK. No feature code — only infrastructure.
>
> Tier 2 — Commonly-used features (preloaded prefetch): the home dashboard, the most-used 3-4 modules. These get `webpackPrefetch` or Angular's PreloadAllModules. After the main bundle loads, browser prefetches these during idle time. By the time the user clicks to navigate, the chunk is already cached.
>
> Tier 3 — Rarely-used features (lazy on demand): the reporting module with heavy chart libraries, the data export module, the admin panel, billing settings. These are pure `React.lazy()` with no prefetch — they only download when the user explicitly navigates. They get skeleton placeholders so the navigation feels intentional rather than broken.
>
> For the vendor chunk strategy: I'd separate `react/react-dom` into their own chunk (changes only when you update React — historically stable), third-party UI library (MUI or Ant Design) into its own chunk, charting libraries into a chunk shared by the modules that need them.
>
> Measurement: Lighthouse CI in PR pipeline (budget: initial bundle < 300KB, each route chunk < 500KB). webpack-bundle-analyzer run on every major dependency upgrade. Real User Monitoring for per-route time-to-interactive to catch regressions.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "Suspense for any async operation" | "I put Suspense everywhere for loading states" | `React.lazy()` requires `Suspense` for the code-splitting loading state; using `Suspense` for data fetching (with React Query / SWR's experimental Suspense mode) is different and has different trade-offs; mixing chunk-loading Suspense with data-loading Suspense in the same boundary means ANY loading state shows the same spinner — this can cause confusing UI where the page flashes a spinner even when only data (not code) is loading; use separate Suspense boundaries for code vs data loading, or use dedicated loading state management for data |
| "Just split every component" | "I React.lazy'd every component to minimize bundle size" | Splitting creates network round trips; a 5KB component lazy-loaded saves 5KB of initial bundle but costs a full network request (minimum 50-100ms on fast networks, 500ms on 3G) when it renders; the round trip costs more than the saved parse time; the rule: only lazy-load components where the dynamic import saves at least 30-50KB AND the component is not needed on first render; aggressive micro-splitting makes initial page load feel jankier (many small spinners) compared to one well-sized initial bundle |
| "Lazy loading = better always" | "Lazy loading always improves performance" | Lazy loading improves INITIAL LOAD but can worsen navigation performance; a user on their second page view (where they've navigated to the reports page for the first time) will wait for the chunk download; without preloading hints, this feels slow even though the first page was fast; the right strategy is lazy loading + targeted prefetching — load chunks before the user navigates to them, just not at initial page load; Angular's `PreloadAllModules` and `webpackPrefetch` are the tools; design the UX so chunk download time is hidden (start download on hover/focus, not on click) |

---

## 7. Hruday's Real Experience Hook
> "The moment that crystallized code splitting for me was running webpack-bundle-analyzer on the SAP product bundle for the first time. The visual treemap showed an enormous orange block — Recharts + D3 + the data grid library — sitting right in the center of the main bundle. I could cross-reference it: these libraries were only referenced by the reports page, which was visited by maybe 20% of users. Yet 100% of users were downloading them on every initial load.
>
> After splitting that module out, the initial bundle dropped from 2.4MB to 680KB. That's 1.76MB less JavaScript parsed on first load. On a typical mobile CPU, JavaScript parsing runs at about 1MB/second — so we saved 1.7 seconds of parse time. LCP improved by 1.7 seconds. The numbers matched almost perfectly.
>
> The lesson I took from that: profile before you optimize. Don't guess which code to split — look at the bundle analyzer output and follow the biggest blocks. The reports module was obvious once visible. We added a rule to our code review checklist: if adding a new library that's only used in one route, that route must be lazy-loaded."

---

## 8. Scale Evolution

**Small app (< 50KB source code) →** Code splitting probably not needed; the routing overhead and Suspense boundaries may add complexity with no real benefit; focus on keeping dependencies lean instead.

**Medium app (Amazon-scale single team) →** Route-based lazy loading for every major page; component-level lazy loading for any component with dependencies > 50KB (charts, rich text editors, file uploaders); `webpackPrefetch` for the "next step" in common user flows (login → dashboard, cart → checkout); Lighthouse CI budget for initial bundle size.

**Large app (SAP/Swiggy scale, many teams) →** Module Federation (Webpack 5) for micro-frontend architecture — each team owns and independently deploys their module; host shell lazy-loads remote modules on demand; shared dependencies (React, design system) in the host's shared scope to avoid duplicate downloads; per-module Lighthouse budgets; RUM monitoring for per-route chunk load time.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment dashboard with many distinct user roles (merchant, finance, developer) — most users only ever see 2-3 of 10 feature modules; initial bundle size directly affects payment portal LCP which correlates with checkout start rate; mobile users in India on slower networks feel heavy bundles acutely | Route-based splitting strategy for role-based feature access; prefetch for checkout flow; performance budget enforcement |
| Swiggy / Meesho | Consumer app with catalog, search, cart, checkout, order tracking — distinct feature areas; sellers and buyers have entirely different feature sets; image-heavy modules (product galleries, restaurant menus) that benefit from component-level lazy loading; high mobile traffic makes initial bundle size critical | Consumer vs seller bundle separation; mobile-first bundle budgets; chart/visualization libraries in seller tools |
| Adobe / Microsoft | Creative Cloud web apps have many rarely-used tools in the same shell; Microsoft Teams splits "calling UI" from "chat UI" from "meeting UI"; both companies have published architectural approaches to large-scale code splitting; micro-frontend patterns at scale; Module Federation use cases | Module Federation architecture experience; micro-frontend bundle strategy at enterprise scale |
| SAP Labs | Direct experience: webpack-bundle-analyzer analysis; 2.4MB → 680KB initial bundle; Recharts + D3 in reporting module; LCP improvement 3.1s → 1.4s; Angular loadChildren for micro-frontend modules in SAP Commerce; Module Federation for shared design system; added bundle size check to Jenkins pipeline | Quantified results; bundle analyzer workflow; micro-frontend lazy loading experience; pipeline enforcement |

---

## 10. Related Topics — What to Study Next

- **Topic 236 — Tree Shaking and Bundle Optimization** — the complementary technique that removes UNUSED code from bundles (code splitting removes UNNEEDED code for current route); tree shaking must work alongside code splitting — a lazy-loaded chunk that imports `import _ from 'lodash'` (not tree-shakeable) will include the entire lodash library in that chunk
- **Topic 237 — Image Optimization** — images are often the biggest contributor to LCP after JavaScript; once you've split the JavaScript bundle, image optimization is the next biggest win; WebP/AVIF, srcset, loading="lazy", explicit dimensions work in combination with JS code splitting
- **Topic 238 — Lighthouse CI Pipeline** — how to automate bundle size monitoring so that a team adding a new un-split heavy dependency gets caught in code review; Lighthouse CI budget assertions for `transfer size` of the initial route
- **Topic 242 — Avoiding Unnecessary Re-renders** — after code splitting reduces what's loaded, avoiding re-renders reduces how much React work runs on each interaction; these are the two main levers for keeping INP low in React apps

---

*Part 14 · Code Splitting and Lazy Loading · Full Stack Interview Guide · Hruday D · 2026*
