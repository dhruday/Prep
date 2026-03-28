# What You Changed — The Exact Fixes in Order
> Part 23 — SAP BI Launchpad Project Deep Dive · Module 23.2: The Performance Story
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Five fixes, in priority order**: (1) lazy load all four micro-frontend modules via `React.lazy` — this alone cut initial JS from 2.1 MB to 380 KB; (2) code split the shell into vendor, routes, utilities; (3) convert images to WebP with responsive `srcset`; (4) lazy load all below-fold images with `loading="lazy"`; (5) move scripts to `<body>` bottom with `defer` to stop render blocking
- **The single biggest win**: switching module imports from static (`import ReportModule from ...`) to dynamic (`React.lazy(() => import('reportModule/ReportModule'))`) — one word change per route, 60% JS reduction on initial load
- **The image fix detail**: hero image went from 1.2 MB PNG to 78 KB WebP — 94% size reduction; LCP dropped 1.5 seconds on its own because the LCP element was that image
- **Code splitting command**: `webpack-bundle-analyzer` runs as part of CI, generates a treemap of bundle contents; we found 150 KB of i18n strings for languages the user had not selected, loaded upfront
- **Lighthouse CI in the pipeline**: the final step was adding `lhci autorun` to the GitHub Actions pipeline so any PR that regressed LCP above 3.0s was blocked from merging; this locked in the gains permanently
- **Interview sequence**: fixes in this order — lazy load modules → split shell bundle → optimise images → remove render-blocking → add Lighthouse CI gate

---

## 1. One-Line Definition
The performance fix was five changes applied in order of impact: lazy load modules, split the shell bundle, convert images to WebP with responsive sizes, add `loading="lazy"` to below-fold images, and add a Lighthouse CI gate to prevent future regressions.

---

## 2. Fix 1 — Lazy Load All Micro-Frontend Modules (Biggest Win)

```typescript
// ❌ BEFORE — static imports; all four modules bundled and loaded upfront
import { ReportModule }    from 'reportModule/ReportModule';
import { DashboardModule } from 'dashboardModule/DashboardModule';
import { AnalyticsModule } from 'analyticsModule/AnalyticsModule';
import { AdminModule }     from 'adminModule/AdminModule';

// ✅ AFTER — React.lazy; each module fetched ONLY when the user navigates to it
const RemoteReportModule    = React.lazy(() => import('reportModule/ReportModule'));
const RemoteDashboardModule = React.lazy(() => import('dashboardModule/DashboardModule'));
const RemoteAnalyticsModule = React.lazy(() => import('analyticsModule/AnalyticsModule'));
const RemoteAdminModule     = React.lazy(() => import('adminModule/AdminModule'));

function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Module code fetched only on first navigation to this route */}
        <Route path="/reports/*"    element={<ErrorBoundary><RemoteReportModule /></ErrorBoundary>} />
        <Route path="/dashboards/*" element={<ErrorBoundary><RemoteDashboardModule /></ErrorBoundary>} />
        <Route path="/analytics/*"  element={<ErrorBoundary><RemoteAnalyticsModule /></ErrorBoundary>} />
        <Route path="/admin/*"      element={<ErrorBoundary><RemoteAdminModule /></ErrorBoundary>} />
      </Routes>
    </Suspense>
  );
}

// Impact:
// Initial JS: 2.1 MB → 380 KB (shell bundle only)
// User on /dashboards never downloads reportModule.bundle.js
// Report module: fetched in ~1.2s on first navigation, cached after that
```

---

## 3. Fix 2 — Code Split the Shell Bundle

```javascript
// webpack.config.js — shell bundle optimisation
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunk: React, React-DOM, Redux — changes rarely → long cache TTL
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 20,
        },
        // i18n chunk: load only the user's language, not all 12
        i18n: {
          test: /[\\/]locales[\\/]/,
          name(module) {
            // Creates: i18n.en.js, i18n.de.js etc. — only the active locale loads
            const lang = module.context.match(/[\\/]locales[\\/](\w+)/)?.[1];
            return `i18n.${lang}`;
          },
        },
      },
    },
  },
};

// Result:
//   shell.js         →  95 KB  (core shell logic only)
//   vendors.js       → 180 KB  (React, Redux — cached long-term)
//   i18n.en.js       →  14 KB  (only English strings loaded for English user)
//   routes.xyz.js    → loaded on demand per route (code splitting on routes)
//
// Before: shell.bundle.js 380 KB for every user in every language
// After:  shell.js 95 KB + vendors.js 180 KB + i18n.en.js 14 KB = 289 KB
```

---

## 4. Fix 3 — Image Optimisation (Second Biggest LCP Win)

```html
<!-- ❌ BEFORE — unoptimised PNG, no responsive sizes, no lazy load -->
<img 
  src="/assets/dashboard-hero.png"
  alt="Dashboard overview"
  width="2400" 
  height="1200"
/>
<!-- File size: 1.2 MB. LCP candidate. Loaded on every page. -->

<!-- ✅ AFTER — WebP with JPEG fallback, responsive srcset, proper dimensions -->
<picture>
  <!-- WebP for modern browsers (Chrome, Edge, Firefox, Safari 14+) -->
  <source 
    type="image/webp"
    srcset="
      /assets/dashboard-hero-400w.webp   400w,
      /assets/dashboard-hero-800w.webp   800w,
      /assets/dashboard-hero-1200w.webp  1200w
    "
    sizes="(max-width: 768px) 100vw, 1200px"
  />
  <!-- JPEG fallback for older browsers -->
  <source 
    type="image/jpeg"
    srcset="
      /assets/dashboard-hero-400w.jpg   400w,
      /assets/dashboard-hero-800w.jpg   800w,
      /assets/dashboard-hero-1200w.jpg  1200w
    "
  />
  <!-- Explicit width/height prevents layout shift (CLS) -->
  <img 
    src="/assets/dashboard-hero-1200w.jpg"
    alt="Dashboard overview"
    width="1200" 
    height="600"
    fetchpriority="high"   /* Tell browser: prioritise this for LCP */
  />
</picture>

<!-- Below-fold thumbnails: lazy load — not fetched until they scroll into view -->
<img
  src="/assets/report-thumb-1.webp"
  alt="Q1 Sales Report thumbnail"
  loading="lazy"
  width="240"
  height="160"
/>

<!-- Results:
  Hero image: 1.2 MB PNG → 78 KB WebP (94% reduction)
  LCP improvement from image alone: -1.5 seconds
  Below-fold thumbnails: no longer compete with above-fold load
-->
```

---

## 5. Fix 4 — Remove Render-Blocking Scripts

```html
<!-- ❌ BEFORE -->
<head>
  <!-- Browser STOPS parsing HTML until these scripts download and execute -->
  <script src="/shell.bundle.js"></script>
  <script src="/analytics-tracker.js"></script>
</head>

<!-- ✅ AFTER — defer moves execution after HTML parse; async for non-critical scripts -->
<head>
  <!-- defer: downloads in parallel, executes after HTML parsed, in order -->
  <script defer src="/shell.bundle.js"></script>
  
  <!-- async: downloads in parallel, executes immediately when ready (non-critical) -->
  <script async src="/analytics-tracker.js"></script>
  
  <!-- Critical CSS inlined — above-fold styles don't wait for a CSS file download -->
  <style>
    /* Only the styles needed for the first paint: nav bar, skeleton loaders */
    body { margin: 0; font-family: var(--shell-font-family); }
    .nav { height: 60px; background: #0a2351; }
    .skeleton { background: #e0e0e0; border-radius: 4px; }
  </style>
  
  <!-- Non-critical CSS: loaded asynchronously; applies when downloaded -->
  <link rel="preload" href="/styles/main.css" as="style" onload="this.rel='stylesheet'">
</head>

<!-- Impact:
  Browser can paint the nav bar and skeleton placeholders immediately
  FCP improved: 3.8s → 1.4s (browser shows something within 1.4s)
-->
```

---

## 6. Fix 5 — Lighthouse CI Gate in Pipeline

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build shell
        run: npm run build
        
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v10
        with:
          urls: |
            http://localhost:3000/
            http://localhost:3000/dashboards
            http://localhost:3000/reports
          # Block the PR if ANY of these thresholds are breached
          budgetPath: ./lighthouse-budget.json
          
# lighthouse-budget.json
[
  {
    "path": "/*",
    "timings": [
      { "metric": "largest-contentful-paint", "budget": 3000 },
      { "metric": "total-blocking-time",       "budget": 300 },
      { "metric": "cumulative-layout-shift",   "budget": 0.1 }
    ],
    "resourceSizes": [
      { "resourceType": "script", "budget": 500 }
    ]
  }
]

# Result: any PR that regresses LCP above 3 seconds is blocked from merging
# The score gains are permanent — no future PR can silently undo them
```

---

## 7. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "Walk me through the specific changes you made to improve the Lighthouse score."

**Hruday's answer:**
> "I tackled them in order of impact. The first and biggest change was switching the shell from static module imports to `React.lazy` dynamic imports for all four micro-frontend modules. That alone took the initial JavaScript payload from 2.1 MB down to 380 KB — the shell bundle only — because modules now load when the user navigates to them for the first time, not before. The second change was splitting the shell bundle itself with webpack's `splitChunks`, separating vendor code (React, Redux) from shell logic, and creating per-language i18n files so English users don't download German strings. Third, I converted the hero image from a 1.2 MB PNG to a 78 KB WebP with responsive `srcset` and added `fetchpriority='high'` to tell the browser it's the LCP element. Fourth, I added `loading='lazy'` to all below-fold images so they don't compete for bandwidth. Fifth, I added `defer` to the shell script tag to remove the render-blocking behaviour. The last step was adding Lighthouse CI to the GitHub Actions pipeline so any PR that regressed LCP above 3 seconds was blocked from merging."

---

### Q2 — Deep Dive
**Interviewer asks:** "Why did you prioritise lazy loading modules over image optimisation as the first fix?"

**Hruday's answer:**
> "Highest impact on the most users, with the lowest risk of regression. The module lazy loading change affected 2.1 MB minus 380 KB — 1.72 MB of JavaScript that every single user was downloading unnecessarily. Image optimisation also had big impact — the hero image alone was 1.2 MB — but it was a set of individual files to process, higher effort. The JS change was a one-line change per route in the shell code. `import ReportModule` becomes `React.lazy(() => import('reportModule/ReportModule'))`. Both changes together brought LCP from 6.2 seconds to 3.4 seconds. Neither alone would have been enough. We validated the order using the Lighthouse waterfall — it shows which resources are on the critical path. The JS parsing time was blocking the LCP element from rendering even after it had downloaded. Reducing the JS payload reduced the blocking time and let the image start rendering sooner."

---

## 8. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "We added lazy loading" | Vague, no numbers | "Switched from static to `React.lazy` dynamic import — initial JS 2.1 MB → 380 KB" |
| Skip the CI gate | Describe the fix but not the lock-in | "We added Lighthouse CI as a PR gate — gains are no good if they regress the next sprint" |
| Miss fetchpriority | Optimise image size but not loading priority | "Added `fetchpriority='high'` to the LCP image — tells browser to start loading it early in the page load waterfall" |
| Only mention image formats | "We switched to WebP" | Also mention: responsive `srcset`, `loading="lazy"` for below-fold, explicit `width`/`height` for CLS |

---

## 9. Hruday's Real Experience Hook

> "The moment that made the biggest impression on me was running webpack-bundle-analyzer after fix two — code splitting. The treemap showed a 150 KB block of Japanese language strings in the shell bundle served to every user including English-only users. Nobody had noticed because we never looked at what was in the bundle. Adding the bundle analyzer to CI changed that. Now every engineer can see what they're shipping. That visual accountability prevented three bundle bloat regressions in the next quarter."

---

## 10. Scale Evolution

**1,000 users →** Five fixes above. Lighthouse CI gate. Monitor LCP in production via Google CrUX data (field data, not just lab data).

**100,000 users →** CDN with HTTP/2 push for the critical JS and CSS; preload hints for the most-visited modules; service worker caching of module bundles after first visit (instant load on return visit).

**10 million users →** Edge rendering (SSR at the CDN edge) so the shell HTML is generated regionally and the LCP element is visible before any JavaScript executes. Module bundle streaming (streaming SSR with Suspense) so above-fold content renders before below-fold module code arrives.

---

## 11. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Merchant dashboard performance = merchant productivity = retention | JS lazy loading; LCP for dashboard first paint; Lighthouse CI gate |
| Swiggy / Meesho | Consumer app on low-bandwidth connections; 2 MB JS on first load = unacceptable | WebP images; `loading="lazy"`; aggressive code splitting |
| Adobe / Microsoft | A slow Creative Cloud load means creative professionals switch to faster tools | `fetchpriority` on LCP elements; service worker caching for returning users |
| SAP Labs | You did this work — you ran the analyzer, wrote the webpack config, added the CI gate | Numbers: 2.1 MB → 780 KB, LCP 6.2s → 3.4s, score 60 → 95 |

---

*Part 23 · What You Changed — The Exact Fixes in Order · Full Stack Interview Guide · Hruday D · 2026*
