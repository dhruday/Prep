# 🚀 File 08 — Performance, Quality & DevOps

> **~84 topics** | Performance Metrics, Code & Rendering Optimization, Assets, Accessibility, Testing, Observability, CI/CD
> **Hruday D — Senior/Staff Frontend Engineer**

---

## Table of Contents

### Performance Optimization (FE 165–181)
- **Part A: Performance Metrics (165–168)** — Metrics, Core Web Vitals, Lighthouse CI, RUM vs Synthetic
- **Part B: Code Optimization (169–173)** — Splitting, Lazy Loading, Tree Shaking, Memoization, Bundle Analysis
- **Part C: Rendering Performance (174–177)** — Virtualization, Re-renders, Performance Budgets, Angular OnPush
- **Part D: Main Thread Management (178–181)** — Scheduling, Long Tasks, INP, scheduler.postTask

### Assets & Resource Optimization (FE 182–195)
- **Part E: Media & Fonts (182–186)** — Image Optimization, Responsive Images, Fonts, Modern Formats, Variable Fonts
- **Part F: CSS & JS Assets (187–190)** — CSS Optimization, Bundle Optimization, Compression, CSS-in-JS Perf
- **Part G: Delivery & Third-Party (191–195)** — CDN, Third-Party Scripts, Tag Managers, Self-Hosting, Resource Hints

### Accessibility & UX (FE 304–316)
- **Part H: Accessibility Basics (304–308)** — WCAG, ARIA, Keyboard Nav, Screen Readers, A11y Tree
- **Part I: Inclusive Design (309–312)** — Color Contrast, Responsive Systems, Motion, Cognitive
- **Part J: UX Trade-offs (313–316)** — UX vs Perf, A11y as NFR, Perf Impact, Auditing Tools

### Testing Strategy (FE 317–331)
- **Part K: Testing Pyramid (317–319)** — Unit/Integration/E2E, Pyramid/Trophy/Honeycomb, Cost
- **Part L: Unit & Component Testing (320–324)** — Jest, RTL, Custom Hooks, Redux, Angular Testing
- **Part M: E2E & Visual Testing (325–331)** — Playwright/Cypress, POM, Flaky Tests, Visual Regression, Lighthouse CI, Bundle Size

### Observability & Debugging (FE 332–342)
- **Part N: Monitoring (332–336)** — Logging, Error Tracking, Perf Monitoring, RUM, OpenTelemetry
- **Part O: Debugging UX (337–342)** — Analytics, Source Maps, Correlation IDs, Session Replay, Rage Clicks, Synthetic

### CI/CD & Frontend DevOps (FE 343–356)
- **Part P: Git Workflows (343–345)** — Trunk-Based, PR Strategy, Conventional Commits
- **Part Q: CI/CD Pipelines (346–349)** — GitHub Actions, Jenkins, Frontend Pipeline, Caching
- **Part R: Deployment & Docker (350–356)** — Blue-Green, Canary, Feature Flags, Rollback, Docker, Multi-Stage, Env Vars

---

# Part A — Performance Metrics (Topics 165–168)

---

## 165. Frontend Performance Metrics

### Q: What are the key frontend performance metrics and why do they matter?

**Answer (Interview-Ready):**

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| **FCP** (First Contentful Paint) | Time to first text/image | < 1.8s |
| **LCP** (Largest Contentful Paint) | Time to largest visible element | < 2.5s |
| **CLS** (Cumulative Layout Shift) | Visual stability (unexpected movement) | < 0.1 |
| **INP** (Interaction to Next Paint) | Responsiveness to user input | < 200ms |
| **TTFB** (Time to First Byte) | Server response time | < 800ms |
| **TBT** (Total Blocking Time) | Main thread blocked time (between FCP and TTI) | < 200ms |
| **TTI** (Time to Interactive) | When page becomes fully interactive | < 3.8s |

**Core Web Vitals (Google ranking factors):** LCP + CLS + INP

**Measurement tools:**
- **Lab:** Lighthouse, WebPageTest, Chrome DevTools Performance tab
- **Field (RUM):** Chrome UX Report (CrUX), web-vitals library, Datadog RUM

```js
import { onLCP, onCLS, onINP } from 'web-vitals';
onLCP(metric => sendToAnalytics('LCP', metric.value));
onCLS(metric => sendToAnalytics('CLS', metric.value));
onINP(metric => sendToAnalytics('INP', metric.value));
```

🔥 **Most Asked**: Core Web Vitals definitions, targets, lab vs field
🧠 **Strategy**: "LCP < 2.5s, CLS < 0.1, INP < 200ms. Measure with web-vitals in the field, Lighthouse in the lab"

---

## 166. FCP, LCP, CLS, TTI, INP — Precise Definitions and Targets

### Q: Explain each Core Web Vital in depth with optimization strategies.

**Answer (Interview-Ready):**

**LCP — Largest Contentful Paint:**
- Element types: `<img>`, `<video>`, `<svg>`, block-level elements with text, background images
- Optimizations: preload hero image, optimize server response (TTFB), avoid render-blocking resources, use `fetchpriority="high"` on hero image

**CLS — Cumulative Layout Shift:**
- Caused by: images without dimensions, dynamic content injection, web fonts causing FOUT, ads
- Optimizations: set width/height on images, use `aspect-ratio`, `font-display: swap` + `size-adjust`, reserve space for ads/embeds

**INP — Interaction to Next Paint:**
- Measures: time from user input (click/tap/keypress) → next frame painted
- Optimizations: break up long tasks (`scheduler.yield()`), defer non-critical work, use `useTransition`, minimize main thread work

```
INP breakdown:
  Input delay (main thread busy) → Processing time (event handler) → Presentation delay (rendering + paint)
  Target: all three combined < 200ms
```

**TTFB optimization:** CDN, edge rendering, HTTP streaming, server caching

🔥 **Most Asked**: How to improve LCP (hero image), CLS causes, INP optimization
🧠 **Strategy**: "LCP = preload hero + fast TTFB. CLS = dimensions on everything. INP = break long tasks + yield to main thread"

---

## 167. Lighthouse CI — Automating Performance Budgets in CI/CD

### Q: How do you automate performance monitoring in CI/CD?

**Answer (Interview-Ready):**

```yaml
# lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/products'],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      }
    },
    upload: { target: 'temporary-public-storage' }
  }
};
```

```yaml
# GitHub Actions
- name: Lighthouse CI
  uses: treosh/lighthouse-ci-action@v10
  with:
    configPath: './lighthouserc.js'
    uploadArtifacts: true
```

**Performance budget in bundler:**
```js
// webpack.config.js
performance: {
  maxAssetSize: 250000,      // 250KB per asset
  maxEntrypointSize: 500000,  // 500KB entry point
  hints: 'error'             // Fail build if exceeded
}
```

🔥 **Most Asked**: Lighthouse CI setup, performance budgets, failing builds on regression
🧠 **Strategy**: "Lighthouse CI in GitHub Actions. Assert on LCP < 2.5s, CLS < 0.1. Bundle size budgets in webpack"

---

## 168. Real User Monitoring (RUM) vs Synthetic Testing

### Q: What is the difference between RUM and synthetic testing?

**Answer (Interview-Ready):**

| | RUM | Synthetic |
|-|-----|-----------|
| **Data source** | Real users in production | Simulated tests in controlled environment |
| **Network** | Real (3G, 4G, WiFi) | Simulated (throttled) |
| **Devices** | Real devices (varied) | Standardized VM |
| **When** | Continuous (production) | On-demand or scheduled |
| **Coverage** | All pages users actually visit | Pages you configure |
| **Insights** | Real user experience, P50/P75/P95 | Consistent baseline, regression detection |

**Use both:**
- **Synthetic** in CI/CD: catch regressions before deployment
- **RUM** in production: understand real user experience across geographies/devices

```js
// RUM with web-vitals
import { onLCP, onCLS, onINP } from 'web-vitals';

function sendToRUM(metric) {
  navigator.sendBeacon('/analytics', JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,  // 'good' | 'needs-improvement' | 'poor'
    url: window.location.href,
    device: navigator.userAgent,
  }));
}

onLCP(sendToRUM);
onCLS(sendToRUM);
onINP(sendToRUM);
```

🔥 **Most Asked**: RUM vs synthetic, when to use each, web-vitals library
🧠 **Strategy**: "Synthetic for regression (lab). RUM for real experience (field). Both needed. P75 is the Google target percentile"

---

# Part B — Code Optimization (Topics 169–173)

---

## 169. Code Splitting Strategies

### Q: What are the different code splitting strategies for frontend apps?

**Answer (Interview-Ready):**

| Strategy | How | When |
|----------|-----|------|
| **Route-based** | `React.lazy(() => import('./Page'))` | Always (baseline) |
| **Component-based** | Lazy load heavy components (editor, chart) | Below-fold, on interaction |
| **Vendor splitting** | Separate `node_modules` chunk | Long-term caching |
| **Dynamic import** | `import('library')` on demand | Feature-flag gated, rare features |

```tsx
// Route-based (most impactful)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

// Component-based (heavy third-party)
const RichEditor = lazy(() => import('./components/RichEditor'));
function EditPage() {
  const [editing, setEditing] = useState(false);
  return editing
    ? <Suspense fallback={<Skeleton />}><RichEditor /></Suspense>
    : <button onClick={() => setEditing(true)}>Edit</button>;
}

// Webpack magic comments
const AdminPanel = lazy(() => import(
  /* webpackChunkName: "admin" */
  /* webpackPrefetch: true */
  './AdminPanel'
));
```

🔥 **Most Asked**: Route vs component splitting, webpack magic comments, measuring impact
🧠 **Strategy**: "Route-split everything. Component-split heavy libraries. Prefetch on hover. Target < 200KB initial JS"

---

## 170. Lazy Loading Components & Routes

### Q: What are the best practices for lazy loading in modern frameworks?

**Answer (Interview-Ready):**

**React:** `React.lazy` + `Suspense`
**Angular:** `loadComponent` / `loadChildren` + `@defer`
**Next.js:** `next/dynamic` or automatic route-based splitting

```tsx
// Next.js dynamic import (with SSR disabled for client-only libs)
const Map = dynamic(() => import('../components/Map'), {
  ssr: false,
  loading: () => <MapSkeleton />
});

// Angular @defer (template-level lazy loading)
@defer (on viewport) { <app-heavy-chart /> }
@placeholder { <div class="skeleton" /> }
```

**Preloading patterns:**
- **Route prefetch:** On link hover (`<Link prefetch>` in Next.js)
- **Intersection Observer:** Preload when approaching viewport
- **requestIdleCallback:** Preload during browser idle

🔥 **Most Asked**: lazy vs dynamic, preloading, SSR considerations
🧠 **Strategy**: "Lazy load below-fold. Preload on hover/idle. Disable SSR for client-only libraries"

---

## 171. Tree Shaking

### Q: How does tree shaking work and how do you ensure it's effective?

**Answer (Interview-Ready):**

**Tree shaking = eliminate unused code at build time (dead code elimination)**

**Requirements:**
- ES Modules (`import/export`) — NOT CommonJS (`require`)
- `"sideEffects": false` in package.json (tells bundler: safe to remove unused exports)
- Production build (Terser/esbuild removes dead code)

```json
// package.json of a library
{ "sideEffects": false }  // All files are pure

// Or specify files with side effects:
{ "sideEffects": ["*.css", "./src/polyfills.js"] }
```

**Common tree-shaking killers:**
```js
// ❌ Barrel exports (re-exports everything)
export * from './Button';
export * from './Modal';
// Importing one component may pull in all

// ❌ CommonJS
const lodash = require('lodash');  // Entire library imported
// ✅ ES Module named import
import { debounce } from 'lodash-es';  // Only debounce

// ❌ Class with static methods (often not tree-shakeable)
// ✅ Individual exported functions
```

**Verify with bundle analyzer:**
```bash
npx webpack-bundle-analyzer dist/stats.json
```

🔥 **Most Asked**: ESM requirement, sideEffects flag, barrel export problem
🧠 **Strategy**: "ES Modules + sideEffects: false. Avoid barrel exports. Use lodash-es over lodash. Verify with bundle analyzer"

---

## 172. Memoization Techniques

### Q: What memoization techniques are available in frontend development?

**Answer (Interview-Ready):**

| Technique | Scope | Framework |
|-----------|-------|-----------|
| `useMemo` | Computed values | React |
| `useCallback` | Function references | React |
| `React.memo` | Component (shallow props compare) | React |
| `computed()` | Derived values | Angular Signals, Vue |
| `reselect` / `createSelector` | Store selectors | Redux, NgRx |
| Manual memoize | Any function | Vanilla JS |

```js
// Generic memoize function
function memoize(fn) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// LRU memoize (bounded memory)
function lruMemoize(fn, maxSize = 100) {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      const val = cache.get(key);
      cache.delete(key);
      cache.set(key, val);  // Move to end (most recent)
      return val;
    }
    const result = fn(...args);
    cache.set(key, result);
    if (cache.size > maxSize) cache.delete(cache.keys().next().value);  // Delete oldest
    return result;
  };
}
```

🔥 **Most Asked**: React memoization (useMemo/useCallback/memo), when to memoize, LRU cache
🧠 **Strategy**: "Memoize expensive computations and reference-sensitive props. Don't memoize cheap operations. React Compiler will auto-memoize"

---

## 173. Bundle Analysis — webpack-bundle-analyzer, Rollup Visualiser

### Q: How do you analyze and optimize JavaScript bundle size?

**Answer (Interview-Ready):**

**Tools:**
```bash
# Webpack
npx webpack-bundle-analyzer dist/stats.json

# Next.js
ANALYZE=true npm run build   # with @next/bundle-analyzer

# Vite / Rollup
npx rollup-plugin-visualizer
```

**What to look for:**
| Problem | Sign | Fix |
|---------|------|-----|
| Large library | Huge box in treemap | Use lighter alternative (`date-fns` over `moment`) |
| Duplicates | Same library in multiple chunks | Deduplicate with `resolve.alias` |
| Unused code | Library included but barely used | Tree shake or replace |
| Polyfills | Large polyfill bundle | Use `browserslist` + `core-js` usage-based |
| No splitting | Single huge chunk | Route-based code splitting |

**Size budgets:**
```
Initial JS (compressed): < 200KB
Per-route chunk: < 50KB
Individual library: < 30KB
Total JS (all routes): < 1MB
```

🔥 **Most Asked**: Bundle analyzer usage, common findings, size budgets
🧠 **Strategy**: "Run bundle analyzer regularly. Target < 200KB initial JS. Replace heavy libraries. Deduplicate. Split by route"

---

# Part C — Rendering Performance (Topics 174–177)

---

## 174. Virtualization (Large Lists)

### Q: When and how should you virtualize large lists?

**Answer (Interview-Ready):**
(Detailed implementation in Topic 132. Summary:)

**When:** > 100-200 items in a scrollable list.
**How:** Only render visible items + small overscan buffer.
**Libraries:** TanStack Virtual (headless), react-window, react-virtuoso.

**Key metrics:** 10,000 items unvirtualized → ~30s render. Virtualized → ~20ms (only ~30 DOM nodes).

🔥 **Most Asked**: When to virtualize, library choice, overscan
🧠 **Strategy**: "Virtualize lists > 100 items. TanStack Virtual for flexibility. Combine with infinite scroll"

---

## 175. Avoiding Unnecessary Re-Renders

### Q: What are the strategies to prevent unnecessary re-renders?

**Answer (Interview-Ready):**
(Detailed in Topics 128-135. Summary:)

| Strategy | When |
|----------|------|
| `React.memo` | Expensive child with stable props |
| `useMemo` | Expensive computed values |
| `useCallback` | Function props to memo'd children |
| Split Context | Prevent unrelated consumers re-rendering |
| Selectors (Zustand) | Subscribe to minimal state slice |
| `useDeferredValue` | Defer expensive re-renders |

**Systematic approach:** Profile first → identify slow components → apply targeted optimization.

🔥 **Most Asked**: Complete optimization strategy, profiling workflow
🧠 **Strategy**: "Measure before optimizing. React.memo + useMemo/useCallback for targeted fixes. Split contexts"

---

## 176. Performance Budgets

### Q: What are performance budgets and how do you enforce them?

**Answer (Interview-Ready):**

| Budget Type | Target | Tool |
|-------------|--------|------|
| **Bundle size** | < 200KB initial JS | webpack `performance.maxEntrypointSize` |
| **LCP** | < 2.5s | Lighthouse CI assertions |
| **CLS** | < 0.1 | Lighthouse CI |
| **INP** | < 200ms | RUM monitoring + alerts |
| **Third-party JS** | < 50KB total | bundlesize CI check |
| **Image weight** | < 500KB per page | Custom CI script |

**Enforcement in CI:**
```yaml
# bundlesize check
"bundlesize": [
  { "path": "dist/main.*.js", "maxSize": "200 kB" },
  { "path": "dist/vendor.*.js", "maxSize": "150 kB" }
]
```

**Process:** Set budgets → automate in CI → alert on regression → fix before merge.

🔥 **Most Asked**: What to budget, how to enforce, team adoption
🧠 **Strategy**: "Set budgets for bundle size + Core Web Vitals. Enforce in CI (fail PR if exceeded). Review regularly"

---

## 177. Angular OnPush + trackBy Performance Patterns

### Q: How do you optimize Angular applications for performance?

**Answer (Interview-Ready):**
(Detailed in Topics 63, 77. Summary:)

**Key Angular optimizations:**
1. **OnPush** everywhere (skip unchanged subtrees)
2. **trackBy** on all `*ngFor` (reuse DOM elements)
3. **Pure pipes** for transformations (cached)
4. **Signals** for fine-grained reactivity (Angular 17+)
5. **@defer** for lazy template sections
6. **runOutsideAngular** for non-UI async operations

🔥 **Most Asked**: OnPush + trackBy combo, migrating to signals
🧠 **Strategy**: "OnPush + trackBy as baseline. Signals for fine-grained updates. @defer for lazy loading"

---

# Part D — Main Thread Management (Topics 178–181)

---

## 178. Main Thread Scheduling

### Q: How do you manage main thread work for responsiveness?

**Answer (Interview-Ready):**

**Problem:** JavaScript is single-threaded. Long tasks (>50ms) block input handling → poor INP.

**Solutions:**
```js
// 1. Break up long tasks
async function processLargeList(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);
    if (i % 100 === 0) {
      await scheduler.yield?.() ?? new Promise(r => setTimeout(r, 0));
      // Yield to browser: handle pending input, paint, etc.
    }
  }
}

// 2. Web Worker for heavy computation
const worker = new Worker('heavy-calc.js');
worker.postMessage(data);
worker.onmessage = (e) => setResult(e.data);

// 3. requestIdleCallback for non-urgent work
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0 && tasks.length > 0) {
    processTask(tasks.shift());
  }
});
```

🔥 **Most Asked**: Breaking long tasks, yielding, Web Workers vs main thread
🧠 **Strategy**: "Break tasks > 50ms. Yield between chunks. Move heavy computation to Web Workers. requestIdleCallback for non-urgent"

---

## 179. Long Tasks & Yielding Control

### Q: What are long tasks and how do you yield control back to the browser?

**Answer (Interview-Ready):**

**Long task = any task > 50ms on the main thread.** Blocks user input during execution.

**Yielding strategies:**
```js
// scheduler.yield() — best (priority-aware)
await scheduler.yield();

// setTimeout(0) — fallback (puts task at end of queue)
await new Promise(resolve => setTimeout(resolve, 0));

// requestAnimationFrame — before next paint
requestAnimationFrame(() => continueWork());

// isInputPending() — yield only when user is trying to interact
while (tasks.length > 0) {
  processTask(tasks.shift());
  if (navigator.scheduling?.isInputPending()) {
    await scheduler.yield();
  }
}
```

**Detect long tasks:**
```js
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      console.warn(`Long task: ${entry.duration}ms`);
    }
  }
});
observer.observe({ type: 'longtask', buffered: true });
```

🔥 **Most Asked**: What is 50ms threshold, yielding strategies, PerformanceObserver
🧠 **Strategy**: "Long tasks > 50ms degrade INP. Yield with scheduler.yield() or setTimeout(0). Monitor with PerformanceObserver"

---

## 180. Interaction to Next Paint (INP)

### Q: How do you optimize INP (Interaction to Next Paint)?

**Answer (Interview-Ready):**

**INP = time from user input → next frame painted (replaces FID as Core Web Vital)**

```
INP = Input Delay + Processing Time + Presentation Delay
       (main thread     (event handler    (render + paint
        was busy)         execution)        + compositing)
```

**Optimization by phase:**
| Phase | Optimization |
|-------|-------------|
| Input delay | Reduce long tasks, yield more frequently |
| Processing | Minimize event handler work, debounce, Web Workers |
| Presentation | Reduce DOM size, avoid forced reflow, optimize CSS |

```tsx
// ❌ Heavy work in click handler
function handleClick() {
  const sorted = sortMillionItems(data);  // 200ms blocking
  setData(sorted);
}

// ✅ Defer heavy work
function handleClick() {
  startTransition(() => {
    setData(sortMillionItems(data));  // Non-blocking (React concurrent)
  });
}

// ✅ Or use Web Worker
function handleClick() {
  worker.postMessage({ action: 'sort', data });
  worker.onmessage = (e) => setData(e.data);
}
```

🔥 **Most Asked**: INP breakdown, optimization per phase, useTransition connection
🧠 **Strategy**: "INP = input delay + processing + presentation. Minimize each. useTransition for non-urgent updates. Target < 200ms"

---

## 181. scheduler.postTask() API

### Q: What is the scheduler.postTask() API?

**Answer (Interview-Ready):**

**scheduler.postTask() = schedule tasks with explicit priority levels**

```js
// Priority levels (highest → lowest):
// 'user-blocking' → 'user-visible' → 'background'

// Schedule low-priority analytics
scheduler.postTask(() => sendAnalytics(data), { priority: 'background' });

// Schedule UI update
scheduler.postTask(() => updateNotificationBadge(), { priority: 'user-visible' });

// Abort scheduled task
const controller = new TaskController({ priority: 'background' });
scheduler.postTask(() => heavyWork(), { signal: controller.signal });
controller.abort();  // Cancel if no longer needed
```

**scheduler.yield() — yield and resume with same priority:**
```js
async function processItems(items) {
  for (const item of items) {
    processItem(item);
    await scheduler.yield();  // Let browser handle input, then resume
  }
}
```

**Browser support:** Chrome 94+. Polyfill: use `setTimeout(fn, 0)` with manual priority queue.

🔥 **Most Asked**: Priority levels, yield vs postTask, browser support
🧠 **Strategy**: "postTask for priority-based scheduling. yield() inside loops. Fallback to setTimeout(0) for older browsers"

---

# Part E — Media & Fonts (Topics 182–186)

---

## 182. Image Optimization

### Q: What are the key image optimization techniques for web performance?

**Answer (Interview-Ready):**

| Technique | Impact |
|-----------|--------|
| **Modern formats** (WebP, AVIF) | 25-50% smaller than JPEG/PNG |
| **Responsive images** (`srcset`) | Serve right size for device |
| **Lazy loading** (`loading="lazy"`) | Don't load below-fold images |
| **Compression** (quality 75-85%) | Reduce file size with minimal quality loss |
| **CDN + edge optimization** | Transform on-the-fly (Cloudinary, Imgix) |
| **Blur placeholder** | Show blurred preview while loading |

```html
<img
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  loading="lazy"
  decoding="async"
  alt="Product hero"
  width="1200" height="600"
  fetchpriority="high"       <!-- For above-fold hero images -->
/>
```

🔥 **Most Asked**: WebP/AVIF, srcset, lazy loading, fetchpriority
🧠 **Strategy**: "WebP/AVIF for format. srcset for responsive. lazy for below-fold. fetchpriority=high for hero. Always set width/height"

---

## 183. Responsive Images

### Q: How do you implement responsive images properly?

**Answer (Interview-Ready):**

```html
<!-- srcset + sizes: browser picks best match -->
<img
  srcset="photo-320.jpg 320w, photo-640.jpg 640w, photo-1280.jpg 1280w"
  sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw"
  src="photo-640.jpg"
  alt="Photo"
/>

<!-- Art direction: different crops for different viewports -->
<picture>
  <source media="(max-width: 600px)" srcset="portrait.webp" type="image/webp" />
  <source media="(min-width: 601px)" srcset="landscape.webp" type="image/webp" />
  <img src="landscape.jpg" alt="Photo" />
</picture>

<!-- Format negotiation -->
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="Photo" />
</picture>
```

**`srcset` + `sizes`:** Browser picks smallest image that covers the display area.
**`<picture>`:** Developer controls which source based on media query or format support.

🔥 **Most Asked**: srcset vs picture, sizes attribute, art direction use case
🧠 **Strategy**: "srcset + sizes for resolution switching. <picture> for art direction and format negotiation"

---

## 184. Font Optimization

### Q: How do you optimize web fonts for performance?

**Answer (Interview-Ready):**

| Strategy | Impact |
|----------|--------|
| `font-display: swap` | Text visible immediately (FOUT > FOIT) |
| Subset fonts | Only include needed characters (Latin = ~30KB vs full = ~200KB) |
| Self-host | Eliminate third-party connection (dns, TCP, TLS) |
| Preload critical font | `<link rel="preload" as="font">` |
| WOFF2 format | Best compression (~30% smaller than WOFF) |
| `size-adjust` | Match fallback metrics to custom font → reduce CLS |

```html
<link rel="preload" href="/fonts/Inter-var.woff2" as="font" type="font/woff2" crossorigin />
```

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-var.woff2') format('woff2');
  font-display: swap;
  unicode-range: U+0000-00FF;  /* Latin subset only */
}

/* Fallback with matching metrics (reduce CLS) */
@font-face {
  font-family: 'Inter-fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
}
```

🔥 **Most Asked**: font-display values, preloading, CLS from fonts, subsetting
🧠 **Strategy**: "Self-host WOFF2. Preload critical font. font-display: swap. Subset to needed characters. size-adjust to reduce CLS"

---

## 185. AVIF vs WebP vs JPEG XL — Modern Image Formats

### Q: Compare modern image formats and when to use each.

**Answer (Interview-Ready):**

| Format | Size (vs JPEG) | Quality | Browser Support | Best For |
|--------|---------------|---------|-----------------|----------|
| **AVIF** | -50% | Excellent | Chrome, Firefox, Safari 16.1+ | Photos, complex images |
| **WebP** | -25-35% | Good | All modern browsers | Universal fallback |
| **JPEG XL** | -35% | Best | ❌ Dropped from Chrome | (Not recommended) |
| **JPEG** | Baseline | Baseline | Universal | Legacy fallback |
| **PNG** | Larger | Lossless | Universal | Transparency, screenshots |

```html
<picture>
  <source srcset="photo.avif" type="image/avif" />
  <source srcset="photo.webp" type="image/webp" />
  <img src="photo.jpg" alt="" />
</picture>
```

**Strategy:** AVIF first → WebP fallback → JPEG/PNG legacy. Use a CDN (Cloudflare, Cloudinary) for automatic format negotiation via `Accept` header.

🔥 **Most Asked**: AVIF vs WebP trade-offs, browser support, CDN auto-negotiation
🧠 **Strategy**: "AVIF for best compression, WebP for universal. Use <picture> for fallback. CDN auto-negotiation is ideal"

---

## 186. Variable Fonts

### Q: What are variable fonts and how do they help performance?

**Answer (Interview-Ready):**

**Variable font = single font file with adjustable axes (weight, width, slant)**

```css
@font-face {
  font-family: 'Inter';
  src: url('Inter-var.woff2') format('woff2-variations');
  font-weight: 100 900;  /* Supports all weights in one file */
  font-style: normal;
}

/* Use any weight */
.light { font-weight: 300; }
.regular { font-weight: 400; }
.bold { font-weight: 700; }
.custom { font-weight: 550; }  /* Fine-grained, not possible with static fonts */
```

**Performance:**
| Approach | Files | Size |
|----------|-------|------|
| Static fonts (4 weights) | 4 files × ~25KB = 100KB | 100KB |
| Variable font (all weights) | 1 file = ~70KB | 70KB |

- Fewer requests (1 vs 4+)
- Smaller total size (1 variable < N static fonts)
- Design flexibility (any weight/width value)

🔥 **Most Asked**: Variable vs static fonts, performance benefit, CSS syntax
🧠 **Strategy**: "Variable font = 1 file, all weights. Smaller total than multiple static files. Use font-weight range in @font-face"

---

# Part F — CSS & JS Assets (Topics 187–190)

---

## 187. CSS Optimization

### Q: What are the key CSS optimization techniques?

**Answer (Interview-Ready):**

| Technique | Impact |
|-----------|--------|
| **Critical CSS** | Inline above-fold CSS in `<head>`, load rest async |
| **Remove unused CSS** | PurgeCSS / Tailwind built-in purging |
| **CSS containment** | `contain: layout paint` → limit browser reflow scope |
| **Minimize specificity** | Flat selectors, BEM methodology |
| **Modern features** | CSS Grid/Flexbox over float hacks, `:has()`, container queries |

```html
<!-- Critical CSS inlined -->
<head>
  <style>/* Inlined critical CSS for above-fold */</style>
  <link rel="preload" href="full.css" as="style" onload="this.rel='stylesheet'" />
</head>
```

```css
/* CSS containment — limit reflow scope */
.card { contain: layout style paint; }
/* Browser knows changes inside .card don't affect outside layout */

/* content-visibility — skip rendering off-screen content */
.section { content-visibility: auto; contain-intrinsic-size: 0 200px; }
```

🔥 **Most Asked**: Critical CSS extraction, unused CSS removal, containment
🧠 **Strategy**: "Critical CSS inline for above-fold. PurgeCSS for unused. contain + content-visibility for render perf"

---

## 188. JavaScript Bundle Optimization

### Q: How do you optimize JavaScript bundle delivery?

**Answer (Interview-Ready):**

| Optimization | How |
|-------------|-----|
| **Code splitting** | Route + component-level (`React.lazy`, dynamic `import()`) |
| **Tree shaking** | ESM + `sideEffects: false` |
| **Minification** | Terser / esbuild / SWC |
| **Compression** | Brotli (best) > Gzip |
| **Differential serving** | Modern bundle (ESM) + legacy (polyfilled) |
| **Module/nomodule** | `<script type="module">` for modern, `nomodule` for legacy |

```html
<!-- Differential serving -->
<script type="module" src="app.modern.js"></script>
<script nomodule src="app.legacy.js"></script>
<!-- Modern browsers: ~30% smaller (no polyfills) -->
```

**Import maps (native in browsers):**
```html
<script type="importmap">
{
  "imports": { "react": "/vendor/react.production.min.js" }
}
</script>
<script type="module">import React from 'react';</script>
```

🔥 **Most Asked**: Minification tools, differential serving, Brotli vs Gzip
🧠 **Strategy**: "Split + tree shake + minify + Brotli compress. Differential serving for smaller modern bundles"

---

## 189. Compression (Gzip, Brotli)

### Q: How do content compression algorithms work and when to use each?

**Answer (Interview-Ready):**

| | Gzip | Brotli |
|-|------|--------|
| **Compression** | Good | 15-25% better than Gzip |
| **Speed (compress)** | Fast | Slower (use pre-compression) |
| **Speed (decompress)** | Fast | Fast |
| **Support** | Universal | All modern browsers |
| **Best for** | Dynamic content (on-the-fly) | Static assets (pre-compressed) |

**Server config (Nginx):**
```nginx
# Brotli for static assets (pre-compressed)
brotli_static on;
# Gzip for dynamic content
gzip on;
gzip_types text/plain application/json application/javascript text/css;
```

**Pre-compress at build time:**
```js
// Vite / Webpack plugin
// Generates .br and .gz files during build
// Nginx serves pre-compressed files (no CPU cost at runtime)
```

**Content-Encoding header:** `Content-Encoding: br` or `Content-Encoding: gzip`

🔥 **Most Asked**: Brotli vs Gzip, pre-compression, when to use each
🧠 **Strategy**: "Brotli for static (pre-compressed at build). Gzip for dynamic (fast on-the-fly). Both: ~70% size reduction"

---

## 190. CSS-in-JS Performance Trade-offs

### Q: What are the performance implications of CSS-in-JS?

**Answer (Interview-Ready):**

| Approach | Runtime Cost | Bundle Size | SSR |
|----------|-------------|-------------|-----|
| **Runtime CSS-in-JS** (styled-components, Emotion) | High (generates CSS at render) | Medium | Extraction needed |
| **Zero-runtime** (Vanilla Extract, Panda CSS, Linaria) | None (extracted at build) | Minimal | Built-in |
| **Utility CSS** (Tailwind) | None | Small (purged) | N/A |
| **CSS Modules** | None | Minimal | Built-in |

**Runtime CSS-in-JS problems:**
- Generates `<style>` tags at runtime → blocks paint
- Extra work on every render (computing styles)
- Larger bundle (library runtime: ~12KB)
- SSR: must extract CSS to avoid FOUC

**Modern recommendation:**
1. **Best perf:** Tailwind CSS or CSS Modules
2. **DX + perf:** Vanilla Extract, Panda CSS (zero-runtime)
3. **Legacy/migration:** styled-components with Babel plugin (partial extraction)

🔥 **Most Asked**: Runtime vs zero-runtime, Tailwind vs styled-components, SSR issues
🧠 **Strategy**: "Zero-runtime CSS-in-JS or Tailwind for best performance. Runtime CSS-in-JS adds overhead. CSS Modules for simple projects"

---

# Part G — Delivery & Third-Party (Topics 191–195)

---

## 191. CDN Usage

### Q: How do you effectively use CDNs for frontend delivery?

**Answer (Interview-Ready):**
(Detailed in Topic 289 — CDN-First Architecture. Key points:)

- **Static assets** (JS/CSS/images): Immutable cache with content hash (`max-age=31536000, immutable`)
- **HTML**: Short TTL + `stale-while-revalidate`
- **API responses** (public): Edge cache with targeted invalidation
- **Multi-CDN** for resilience (Cloudflare primary, Fastly fallback)

🔥 **Most Asked**: Cache strategy per asset type, invalidation, multi-CDN
🧠 **Strategy**: "Immutable cache for hashed assets. Short TTL for HTML. Surrogate keys for API invalidation"

---

## 192. Third-Party Script Management

### Q: How do you manage third-party scripts without degrading performance?

**Answer (Interview-Ready):**

| Strategy | Implementation |
|----------|---------------|
| **Defer loading** | `<script defer>` or `<script async>` |
| **Lazy load** | Load after user interaction or idle |
| **Facade pattern** | Show placeholder, load real embed on interaction |
| **Web Worker** | Run analytics in Partytown (web worker) |
| **Resource hints** | `<link rel="preconnect">` for known hosts |

```html
<!-- Façade: YouTube embed loads only on click -->
<div class="youtube-facade" onclick="loadYouTube(this)">
  <img src="thumbnail.jpg" alt="Video" />
  <button>▶ Play</button>
</div>

<!-- Partytown: run third-party in web worker -->
<script type="text/partytown" src="https://analytics.com/script.js"></script>
```

**Impact measurement:**
- Chrome DevTools → Performance → Third-party badge
- WebPageTest → third-party diagnostics
- Lighthouse → "Reduce impact of third-party code"

🔥 **Most Asked**: Façade pattern, Partytown, measuring third-party impact
🧠 **Strategy**: "Defer/lazy load all third-party. Facade for embeds. Partytown for analytics. Measure with Performance tab"

---

## 193. Tag Managers & Risks

### Q: What are the performance risks of tag managers (GTM)?

**Answer (Interview-Ready):**

**Risks:**
- Uncontrolled script injection (marketing adds heavy scripts without engineering review)
- Cascading loads (GTM loads script A which loads B which loads C)
- Main thread blocking (synchronous tags)
- No CSP control (scripts bypass Content-Security-Policy)

**Mitigation:**
| Strategy | How |
|----------|-----|
| Governance | Require engineering approval for new tags |
| Server-side GTM | Tags execute on server, not client |
| Performance budgets | Alert when third-party JS exceeds budget |
| Audit regularly | Review all active tags quarterly |
| `loading="lazy"` | Defer non-critical tags |

🔥 **Most Asked**: GTM risks, governance process, server-side tagging
🧠 **Strategy**: "GTM is a backdoor for unreviewed JS. Govern with approval process. Server-side GTM for better control. Budget third-party"

---

## 194. Self-Hosting vs Third-Party Assets

### Q: When should you self-host assets vs use third-party CDNs?

**Answer (Interview-Ready):**

| | Self-Hosting | Third-Party CDN |
|-|-------------|----------------|
| **Control** | Full | Limited |
| **Performance** | Better (same-origin, HTTP/2 multiplexing) | Extra DNS + TLS connection |
| **Caching** | Your CDN cache | Shared cache (no benefit since Chrome 86 partitioned cache) |
| **Privacy** | No data sent to third party | May track users |
| **Availability** | Your uptime | Their uptime |

**Recommendation: Self-host everything possible** (fonts, popular libraries, icons).

```bash
# Instead of loading from Google Fonts CDN:
# <link href="https://fonts.googleapis.com/css2?family=Inter" rel="stylesheet">

# Self-host:
# Download Inter, serve from your own domain
# Benefits: no DNS lookup, no CORS, HTTP/2 multiplexing with other assets
```

🔥 **Most Asked**: Why self-host over CDN, Chrome cache partitioning, privacy
🧠 **Strategy**: "Self-host fonts and libraries. Chrome's partitioned cache killed shared CDN cache benefit. Same-origin is faster (HTTP/2)"

---

## 195. Resource Hints — Priority Hints API

### Q: What are resource hints and when should you use them?

**Answer (Interview-Ready):**

| Hint | When | Use Case |
|------|------|----------|
| `<link rel="preconnect">` | TCP + TLS early | Third-party domains you'll use soon |
| `<link rel="dns-prefetch">` | DNS only | Many third-party domains |
| `<link rel="preload">` | Critical resource (this page) | Hero image, critical font, above-fold CSS |
| `<link rel="prefetch">` | Next navigation | Next page's JS chunk |
| `<link rel="modulepreload">` | ES module | Critical JS modules |
| `fetchpriority="high/low"` | Override browser priority | Hero image high, below-fold images low |

```html
<head>
  <link rel="preconnect" href="https://api.example.com" />
  <link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/hero.avif" as="image" fetchpriority="high" />
  <link rel="prefetch" href="/next-page-chunk.js" />
</head>

<img src="hero.jpg" fetchpriority="high" />     <!-- Boost hero image -->
<img src="footer-logo.jpg" fetchpriority="low" /> <!-- Deprioritize -->
```

🔥 **Most Asked**: preload vs prefetch, fetchpriority, preconnect use case
🧠 **Strategy**: "preload for THIS page's critical resources. prefetch for NEXT page. preconnect for known third-party. fetchpriority for hero"

---

# Part H — Accessibility Basics (Topics 304–308)

---

## 304. Web Accessibility — WCAG 2.1 vs WCAG 2.2

### Q: What are WCAG guidelines and what changed between 2.1 and 2.2?

**Answer (Interview-Ready):**

**WCAG = Web Content Accessibility Guidelines.** Four principles (POUR):
1. **Perceivable** — Content must be presentable (text alternatives, captions)
2. **Operable** — Interface must be usable (keyboard, time limits, seizure-safe)
3. **Understandable** — Content must be comprehensible (readable, predictable)
4. **Robust** — Content must work with assistive technologies

**Conformance levels:** A (minimum) → AA (standard target) → AAA (enhanced)

**WCAG 2.2 additions (over 2.1):**
| Criterion | What |
|-----------|------|
| Focus Not Obscured | Focused element must not be hidden by sticky headers/banners |
| Dragging Movements | Must provide non-drag alternative (click, keyboard) |
| Target Size (minimum) | Interactive elements ≥ 24×24 CSS pixels |
| Consistent Help | Help mechanisms in consistent location across pages |
| Redundant Entry | Don't ask user to re-enter previously provided info |

🔥 **Most Asked**: POUR principles, AA vs AAA, WCAG 2.2 new criteria
🧠 **Strategy**: "POUR framework. Target WCAG 2.1 AA minimum. WCAG 2.2 adds focus visibility and target size requirements"

---

## 305. ARIA — Roles, Properties, States

### Q: How do you use ARIA correctly?

**Answer (Interview-Ready):**

**First rule of ARIA: Don't use ARIA if native HTML works.**

```html
<!-- ❌ Unnecessary ARIA -->
<div role="button" tabindex="0" onclick="...">Click</div>

<!-- ✅ Native HTML (built-in semantics, keyboard, focus) -->
<button onclick="...">Click</button>
```

**When ARIA IS needed:**
```html
<!-- Custom widget with no native equivalent -->
<div role="tablist">
  <button role="tab" aria-selected="true" aria-controls="panel-1">Tab 1</button>
  <button role="tab" aria-selected="false" aria-controls="panel-2">Tab 2</button>
</div>
<div role="tabpanel" id="panel-1">Content 1</div>

<!-- Dynamic content -->
<div aria-live="polite" aria-atomic="true">
  3 items added to cart  <!-- Screen reader announces changes -->
</div>

<!-- Labeling -->
<input aria-label="Search products" />
<div aria-labelledby="heading-1" aria-describedby="desc-1">...</div>
```

**Key ARIA categories:**
- **Roles:** `button`, `tab`, `dialog`, `alert`, `navigation`, `complementary`
- **Properties:** `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-controls`
- **States:** `aria-selected`, `aria-expanded`, `aria-checked`, `aria-disabled`, `aria-hidden`

🔥 **Most Asked**: First rule of ARIA, aria-live, labeling, common mistakes
🧠 **Strategy**: "Use native HTML first. ARIA for custom widgets. aria-live for dynamic content. aria-label for non-visible labels"

---

## 306. Keyboard Navigation — Focus Management, Tab Order

### Q: How do you implement proper keyboard navigation?

**Answer (Interview-Ready):**

**Tab order:**
- Default: follows DOM order. Don't use `tabindex > 0` (breaks natural flow)
- `tabindex="0"` — add to tab order (for custom interactive elements)
- `tabindex="-1"` — focusable programmatically, not in tab order (for skip links, managed focus)

**Focus management patterns:**
```tsx
// Focus trap in modal (focus stays inside modal)
function Modal({ isOpen, onClose, children }) {
  const firstFocusable = useRef(null);
  
  useEffect(() => {
    if (isOpen) firstFocusable.current?.focus();  // Focus first element on open
  }, [isOpen]);
  
  // On Tab at last element → focus first. On Shift+Tab at first → focus last.
  // Libraries: focus-trap-react, @headlessui/react
}

// Roving tabindex (arrow key navigation within a group)
// Tab into group → focus active item. Arrow keys move focus within group.
<div role="radiogroup">
  <input role="radio" tabIndex={selected === 0 ? 0 : -1} />  <!-- Active: 0, others: -1 -->
  <input role="radio" tabIndex={selected === 1 ? 0 : -1} />
</div>
```

**Essential keyboard patterns:**
- `Escape` closes modals/dropdowns
- `Enter/Space` activates buttons
- Arrow keys navigate within widgets (tabs, menus, radio groups)
- Skip links: "Skip to main content" (first focusable element)

🔥 **Most Asked**: Focus trap, roving tabindex, skip links, tabindex values
🧠 **Strategy**: "Never use tabindex > 0. Focus trap in modals. Roving tabindex for widget groups. Skip link as first element"

---

## 307. Screen Reader Testing — NVDA, VoiceOver, JAWS

### Q: How do you test with screen readers?

**Answer (Interview-Ready):**

| Screen Reader | OS | Cost | Use For |
|--------------|-----|------|---------|
| **VoiceOver** | macOS/iOS | Free | Primary testing on Mac |
| **NVDA** | Windows | Free | Primary testing on Windows |
| **JAWS** | Windows | Paid | Enterprise standard |
| **TalkBack** | Android | Free | Mobile testing |

**VoiceOver testing shortcuts (Mac):**
- `Cmd + F5` — toggle VoiceOver
- `VO + →/←` — navigate elements
- `VO + Space` — activate element
- `VO + U` — rotor (headings, links, landmarks)

**What to test:**
- Page headings announced in order (h1 → h2 → h3)
- Form labels read correctly
- Dynamic content announced (`aria-live`)
- Images have alt text (or `alt=""` for decorative)
- Focus order is logical
- Interactive elements have accessible names

🔥 **Most Asked**: VoiceOver basics, what to test, common failures
🧠 **Strategy**: "Test with VoiceOver (Mac) + NVDA (Windows). Check headings, labels, live regions, focus order"

---

## 308. Accessibility Tree — How Browsers Expose to Assistive Tech

### Q: What is the accessibility tree?

**Answer (Interview-Ready):**

**Accessibility tree = parallel tree to the DOM that strips visual styling and exposes semantic information to assistive technologies.**

```
DOM element: <button class="btn-primary" onClick={...}>Submit Order</button>

Accessibility tree node:
  Role: button
  Name: "Submit Order"
  State: focusable, enabled
  (CSS classes, visual styling are NOT in the tree)
```

**What affects the accessibility tree:**
| HTML/ARIA | Effect |
|-----------|--------|
| Semantic HTML (`<button>`, `<nav>`) | Correct role automatically |
| `aria-label` | Overrides accessible name |
| `aria-hidden="true"` | Removes from tree (invisible to screen readers) |
| `display: none` / `visibility: hidden` | Removed from tree |
| `opacity: 0` | Still IN the tree (screen reader reads it) |

**Debug:** Chrome DevTools → Elements → Accessibility pane shows computed role, name, and properties.

🔥 **Most Asked**: How a11y tree relates to DOM, what removes elements, debugging
🧠 **Strategy**: "A11y tree = semantic version of DOM. Semantic HTML → correct tree. aria-hidden removes. Debug in Chrome Accessibility pane"

---

# Part I — Inclusive Design (Topics 309–312)

---

## 309. Color Contrast — WCAG AA vs AAA Ratios

### Q: What are the color contrast requirements for accessibility?

**Answer (Interview-Ready):**

| Level | Normal Text | Large Text (18pt/14pt bold) |
|-------|------------|---------------------------|
| **AA** | 4.5:1 | 3:1 |
| **AAA** | 7:1 | 4.5:1 |

```css
/* Test with: Chrome DevTools → Elements → Color picker → Contrast ratio */
/* Or: axe DevTools, Colour Contrast Analyser */

/* Common failures: */
.light-gray-on-white { color: #999; }  /* ~2.85:1 — FAILS AA */
.better { color: #767676; }            /* ~4.54:1 — Passes AA */
```

**Non-text contrast (WCAG 2.1):** UI components and graphical objects require 3:1 ratio (button borders, form fields, icons).

**Dark mode:** Must also meet contrast ratios. Test both themes.

🔥 **Most Asked**: AA ratios, how to test, common failures
🧠 **Strategy**: "4.5:1 for normal text (AA). 3:1 for large text and UI components. Test with DevTools color picker"

---

## 310. Responsive Design Systems

### Q: How do you build a responsive design system?

**Answer (Interview-Ready):**

**Fluid typography + spacing:**
```css
/* Fluid font size (min 16px, scales with viewport, max 24px) */
h1 { font-size: clamp(1rem, 0.5rem + 2vw, 1.5rem); }

/* Fluid spacing with custom properties */
:root {
  --space-sm: clamp(0.5rem, 0.25rem + 1vw, 1rem);
  --space-md: clamp(1rem, 0.5rem + 2vw, 2rem);
}
```

**Container queries (modern responsive):**
```css
.card-container { container-type: inline-size; }

@container (min-width: 400px) {
  .card { display: grid; grid-template-columns: 1fr 2fr; }
}
```

**Design token approach:** Define tokens for breakpoints, spacing, typography → consume in all components → consistent responsive behavior.

🔥 **Most Asked**: Fluid typography, container queries, design tokens
🧠 **Strategy**: "clamp() for fluid sizing. Container queries for component-level responsive. Design tokens for consistency"

---

## 311. Motion Sensitivity — prefers-reduced-motion

### Q: How do you handle motion sensitivity in web applications?

**Answer (Interview-Ready):**

```css
/* Default: show animations */
.animated { transition: transform 0.3s ease; }

/* Respect user preference */
@media (prefers-reduced-motion: reduce) {
  .animated { transition: none; }
  /* Or: use shorter, simpler animations instead of none */
}
```

```tsx
// JavaScript check
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// React hook
function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefers(mq.matches);
    const handler = (e) => setPrefers(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefers;
}
```

🔥 **Most Asked**: CSS media query, JavaScript detection, what to reduce
🧠 **Strategy**: "prefers-reduced-motion: reduce animations/transitions. Don't remove all motion — provide simpler alternatives"

---

## 312. Cognitive Accessibility — Plain Language, Error Prevention

### Q: What are cognitive accessibility considerations?

**Answer (Interview-Ready):**

| Principle | Implementation |
|-----------|---------------|
| **Plain language** | Avoid jargon, short sentences, clear headings |
| **Error prevention** | Confirm destructive actions, inline validation |
| **Consistent navigation** | Same location for nav, help, search across pages |
| **Clear feedback** | Visual + text confirmation of actions |
| **Memory aid** | Remember previous inputs, autocomplete, progress indicators |
| **Reading level** | Target Grade 8 reading level for public sites |

```tsx
// Error prevention: confirm before delete
<AlertDialog>
  <AlertDialogTrigger>Delete Account</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
    <AlertDialogDescription>This will permanently delete your account and all data.</AlertDialogDescription>
    <AlertDialogAction>Yes, delete</AlertDialogAction>
    <AlertDialogCancel>Cancel</AlertDialogCancel>
  </AlertDialogContent>
</AlertDialog>
```

🔥 **Most Asked**: Error prevention patterns, plain language, consistent UI
🧠 **Strategy**: "Confirm destructive actions. Inline validation. Plain language. Consistent navigation. Progress indicators for multi-step"

---

# Part J — UX Trade-offs (Topics 313–316)

---

## 313–316. UX vs Performance, A11y as NFR, Performance Impact, Auditing Tools

### Q: How do you balance UX, performance, and accessibility trade-offs?

**Answer (Interview-Ready):**

**UX vs Performance trade-offs:**
| Situation | UX Preference | Performance Preference | Balance |
|-----------|--------------|----------------------|---------|
| Hero animations | Rich animations | Skip them | prefers-reduced-motion |
| Image quality | Highest resolution | Compressed | Responsive images + AVIF |
| Third-party embeds | Rich content | Eliminate | Façade pattern |
| Font loading | No FOUT | Swap immediately | size-adjust fallback |

**Accessibility as Non-Functional Requirement:**
- Include a11y in Definition of Done
- Automated testing in CI (axe-core, Lighthouse)
- Manual testing with screen reader quarterly
- Performance targets should not compromise a11y

**Auditing tools:**
| Tool | Type | Use |
|------|------|-----|
| **axe DevTools** | Browser extension | Component-level a11y testing |
| **Lighthouse** | CLI/CI | Automated audit (perf + a11y) |
| **arc-toolkit** | Browser extension | WCAG compliance checking |
| **Pa11y** | CI tool | Automated a11y testing in pipeline |
| **Storybook a11y addon** | Development | Catches issues during component development |

🔥 **Most Asked**: Balancing perf + a11y, automated a11y testing, tooling
🧠 **Strategy**: "A11y is non-negotiable — include in CI with axe-core. Balance UX/perf with progressive enhancement and feature detection"

---

# Part K — Testing Pyramid (Topics 317–319)

---

## 317. Unit vs Integration vs E2E — When to Use Which

### Q: When should you use unit, integration, or E2E tests?

**Answer (Interview-Ready):**

| Level | Scope | Speed | Confidence | When |
|-------|-------|-------|------------|------|
| **Unit** | Single function/component | ms | Low (isolated) | Pure logic, utilities, reducers |
| **Integration** | Multiple components together | 100ms | Medium | Component interactions, API + UI |
| **E2E** | Full user flow (browser) | seconds | High (real env) | Critical paths (login, checkout, onboarding) |

```tsx
// Unit: test reducer logic
test('increment reducer', () => {
  expect(counterReducer({ value: 0 }, increment())).toEqual({ value: 1 });
});

// Integration: test component with data fetching
test('shows users after API call', async () => {
  render(<UserList />);
  expect(await screen.findByText('Alice')).toBeInTheDocument();
});

// E2E: test full checkout flow
test('complete checkout', async ({ page }) => {
  await page.goto('/products');
  await page.click('text=Add to Cart');
  await page.click('text=Checkout');
  await page.fill('#email', 'user@example.com');
  await page.click('text=Place Order');
  await expect(page.locator('text=Order Confirmed')).toBeVisible();
});
```

🔥 **Most Asked**: When each level is appropriate, testing ROI
🧠 **Strategy**: "Unit for logic, integration for component behavior, E2E for critical user journeys. Write more integration than unit"

---

## 318. Testing Pyramid vs Trophy vs Honeycomb

### Q: What are the different testing shape philosophies?

**Answer (Interview-Ready):**

| Shape | Emphasis | Origin |
|-------|----------|--------|
| **Pyramid** | Many unit → fewer integration → few E2E | Google (traditional) |
| **Trophy** | Few unit → **many integration** → some E2E + static | Kent C. Dodds (React) |
| **Honeycomb** | Integration-heavy, minimal unit/E2E | Spotify |

**Testing Trophy (recommended for modern frontends):**
```
        E2E (few critical paths)
     Integration (bulk of tests)
    Unit (utilities, pure logic only)
  Static Analysis (TypeScript, ESLint)
```

**Why Trophy > Pyramid for frontends:**
- Frontend components are integration points (DOM + state + events)
- Unit testing a component in isolation often tests implementation details
- Integration tests (React Testing Library) test user behavior, not implementation

🔥 **Most Asked**: Trophy vs pyramid, why integration-heavy for frontends
🧠 **Strategy**: "Testing Trophy for frontends. Integration tests give best confidence-to-cost ratio. TypeScript as first defense layer"

---

## 319. Cost of Tests at Each Level

### Q: What are the costs and benefits at each testing level?

**Answer (Interview-Ready):**

| Level | Write Time | Run Time | Maintenance | Flakiness | Confidence |
|-------|-----------|----------|------------|-----------|------------|
| Static (TS, lint) | Low | Instant | Low | None | Catches 30% of bugs |
| Unit | Low | ms | Low | Rare | Logic-specific |
| Integration | Medium | 100ms | Medium | Low | High for component behavior |
| E2E | High | 10-30s | High | Moderate | Highest for user flows |

**ROI optimization:**
- TypeScript catches ~30% of bugs for near-zero runtime cost
- Integration tests catch ~60% of remaining bugs
- E2E tests catch final ~10% (edge cases, cross-system flows)
- **Most expensive bug to fix**: found in production > E2E > integration > unit > type error

🔥 **Most Asked**: Testing ROI, where to invest, cost of bugs at each stage
🧠 **Strategy**: "TypeScript first (free). Integration tests bulk (best ROI). E2E for critical paths only. Unit for pure logic"

---

# Part L — Unit & Component Testing (Topics 320–324)

---

## 320. Jest — Setup, Mocking, Spying, Snapshot

### Q: Explain Jest testing patterns for frontend applications.

**Answer (Interview-Ready):**

```tsx
// Mocking
jest.mock('./api', () => ({
  getUsers: jest.fn().mockResolvedValue([{ id: '1', name: 'Alice' }])
}));

// Spying
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
expect(consoleSpy).not.toHaveBeenCalled();
consoleSpy.mockRestore();

// Timer mocking
jest.useFakeTimers();
setTimeout(callback, 1000);
jest.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();

// Snapshot testing (use sparingly)
test('renders correctly', () => {
  const { container } = render(<Button label="Click" />);
  expect(container).toMatchSnapshot();
});
// Better: inline snapshot
expect(container.textContent).toMatchInlineSnapshot(`"Click"`);
```

**Jest best practices:**
- Mock at module boundary (APIs, services), not internal implementation
- Prefer `mockResolvedValue`/`mockRejectedValue` for async
- Avoid snapshot tests for large components (fragile)
- Use `jest.spyOn` for observation, `jest.fn` for replacement

🔥 **Most Asked**: Mocking patterns, when to use snapshots, timer mocking
🧠 **Strategy**: "Mock at boundaries (APIs). Spy on side effects. Fake timers for async. Minimal snapshots"

---

## 321. React Testing Library — render, screen, userEvent, async

### Q: How do you test React components with React Testing Library?

**Answer (Interview-Ready):**

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('search filters results', async () => {
  const user = userEvent.setup();
  render(<SearchableList items={mockItems} />);
  
  // Query by role (accessible)
  const input = screen.getByRole('textbox', { name: /search/i });
  await user.type(input, 'React');
  
  // Wait for async update
  await waitFor(() => {
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
    expect(screen.queryByText('Angular')).not.toBeInTheDocument();
  });
});
```

**Query priority (most accessible first):**
1. `getByRole` — accessible role + name
2. `getByLabelText` — form elements
3. `getByPlaceholderText` — when no label
4. `getByText` — non-interactive elements
5. `getByTestId` — last resort

**Anti-patterns:**
- ❌ Testing implementation details (state, hooks, methods)
- ❌ Using `container.querySelector` (DOM structure coupling)
- ✅ Test what user sees and does

🔥 **Most Asked**: Query priority, userEvent vs fireEvent, async patterns
🧠 **Strategy**: "Query by role first. Use userEvent (not fireEvent). Test behavior, not implementation. waitFor for async"

---

## 322. Testing Custom Hooks with renderHook

### Q: How do you test custom React hooks?

**Answer (Interview-Ready):**

```tsx
import { renderHook, act } from '@testing-library/react';

test('useCounter increments and decrements', () => {
  const { result } = renderHook(() => useCounter(10));
  
  expect(result.current.count).toBe(10);
  
  act(() => result.current.increment());
  expect(result.current.count).toBe(11);
  
  act(() => result.current.decrement());
  expect(result.current.count).toBe(10);
});

// Hook with dependencies (wrapper for providers)
test('useAuth returns user from context', () => {
  const wrapper = ({ children }) => (
    <AuthProvider value={{ user: mockUser }}>{children}</AuthProvider>
  );
  const { result } = renderHook(() => useAuth(), { wrapper });
  expect(result.current.user).toEqual(mockUser);
});

// Hook with async operations
test('useFetch loads data', async () => {
  const { result } = renderHook(() => useFetch('/api/users'));
  
  expect(result.current.loading).toBe(true);
  
  await waitFor(() => {
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockUsers);
  });
});
```

🔥 **Most Asked**: renderHook usage, act wrapper, testing async hooks
🧠 **Strategy**: "renderHook for isolated hook testing. act() for state updates. Wrapper prop for context providers"

---

## 323. Testing Redux / RTK Slices in Isolation

### Q: How do you test Redux slices and async thunks?

**Answer (Interview-Ready):**

```tsx
// Test reducer directly (no store needed)
test('increment action', () => {
  const state = counterReducer(undefined, increment());
  expect(state.value).toBe(1);
});

// Test async thunk
test('fetchUsers fulfills with user list', async () => {
  const store = configureStore({ reducer: { users: usersReducer } });
  
  // Mock API
  jest.spyOn(api, 'getUsers').mockResolvedValue([{ id: '1', name: 'Alice' }]);
  
  await store.dispatch(fetchUsers());
  
  const state = store.getState().users;
  expect(state.status).toBe('idle');
  expect(state.entities['1']).toEqual({ id: '1', name: 'Alice' });
});

// Integration test with component
test('UserList renders from Redux store', async () => {
  const store = configureStore({ reducer: { users: usersReducer } });
  
  render(
    <Provider store={store}>
      <UserList />
    </Provider>
  );
  
  await screen.findByText('Alice');
});
```

🔥 **Most Asked**: Reducer unit test, thunk test, component integration with store
🧠 **Strategy**: "Test reducers as pure functions. Test thunks with real store. Prefer integration tests (component + store)"

---

## 324. Jasmine & Karma — Angular Testing Patterns

### Q: How does Angular testing with Jasmine/Karma work?

**Answer (Interview-Ready):**

```ts
// Angular component test
describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    userService = jasmine.createSpyObj('UserService', ['getUser']);
    userService.getUser.and.returnValue(of({ name: 'Alice' }));

    await TestBed.configureTestingModule({
      imports: [UserComponent],  // Standalone component
      providers: [{ provide: UserService, useValue: userService }]
    }).compileComponents();

    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should display user name', () => {
    expect(fixture.nativeElement.textContent).toContain('Alice');
  });

  it('should call getUser on init', () => {
    expect(userService.getUser).toHaveBeenCalled();
  });
});
```

**Modern Angular testing trend:** Migrating from Karma → Jest + Testing Library (`@testing-library/angular`).

🔥 **Most Asked**: TestBed setup, service mocking, Karma → Jest migration
🧠 **Strategy**: "TestBed for component DI. jasmine.createSpyObj for service mocks. Consider migrating to Jest for speed"

---

# Part M — E2E & Visual Testing (Topics 325–331)

---

## 325. Playwright vs Cypress — Architecture & Trade-offs

### Q: Compare Playwright and Cypress for E2E testing.

**Answer (Interview-Ready):**

| | Playwright | Cypress |
|-|-----------|---------|
| **Architecture** | Controls browser externally (CDP/BiDi) | Runs inside browser |
| **Browsers** | Chromium, Firefox, WebKit | Chromium, Firefox, WebKit (experimentally) |
| **Multi-tab** | ✅ | ❌ |
| **iframes** | ✅ Easy | ⚠️ Limited |
| **Parallel** | ✅ Built-in (workers) | ✅ (paid dashboard or CI sharding) |
| **Language** | JS, TS, Python, Java, C# | JS, TS only |
| **Speed** | Faster (parallel + headless) | Slightly slower |
| **DX** | Good CLI, trace viewer | Excellent UI runner, time-travel |

```ts
// Playwright
test('login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', 'user@test.com');
  await page.fill('[name=password]', 'password');
  await page.click('button:has-text("Login")');
  await expect(page.locator('text=Dashboard')).toBeVisible();
});

// Cypress
it('login flow', () => {
  cy.visit('/login');
  cy.get('[name=email]').type('user@test.com');
  cy.get('[name=password]').type('password');
  cy.contains('Login').click();
  cy.contains('Dashboard').should('be.visible');
});
```

🔥 **Most Asked**: Architecture differences, when to choose which, parallel execution
🧠 **Strategy**: "Playwright for CI (faster, parallel, multi-browser). Cypress for developer DX (time-travel debugger). Both are solid choices"

---

## 326. Page Object Model (POM) Pattern

### Q: What is the Page Object Model and how do you implement it?

**Answer (Interview-Ready):**

```ts
// page objects encapsulate page interactions
class LoginPage {
  constructor(private page: Page) {}
  
  async goto() { await this.page.goto('/login'); }
  async login(email: string, password: string) {
    await this.page.fill('[name=email]', email);
    await this.page.fill('[name=password]', password);
    await this.page.click('button:has-text("Login")');
  }
  async getErrorMessage() {
    return this.page.locator('.error-message').textContent();
  }
}

// Test uses page object
test('successful login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('user@test.com', 'password');
  await expect(page.locator('text=Dashboard')).toBeVisible();
});
```

**Benefits:** DRY (one place for selectors), readable tests, easier maintenance when UI changes.

🔥 **Most Asked**: POM structure, benefits, when overkill
🧠 **Strategy**: "POM encapsulates selectors and actions. One place to update when UI changes. Use for apps with many E2E tests"

---

## 327–328. E2E in CI & Flaky Tests

### Q: How do you run E2E tests in CI and prevent flaky tests?

**Answer (Interview-Ready):**

**CI setup:**
```yaml
# Playwright in GitHub Actions
- name: Run E2E tests
  run: npx playwright test --shard=${{ matrix.shard }}/4
  strategy:
    matrix:
      shard: [1, 2, 3, 4]  # Parallel sharding
```

**Flaky test root causes + fixes:**
| Cause | Fix |
|-------|-----|
| **Timing** (element not ready) | Use Playwright auto-waiting, not `sleep()` |
| **Test isolation** | Reset state between tests (fresh user, clean DB) |
| **Shared state** | Each test creates its own data |
| **Network** | Mock external APIs, use fixtures |
| **Animation** | Disable CSS animations in test mode |
| **Race conditions** | Use `waitFor`, `expect.toBeVisible()` |

🔥 **Most Asked**: Flaky test prevention, CI sharding, test isolation
🧠 **Strategy**: "Shard tests in CI for speed. Auto-wait (no sleep). Isolate test data. Mock external APIs"

---

## 329–331. Visual Regression, Lighthouse CI, Bundle Size Testing

### Q: How do you catch visual regressions, performance regressions, and bundle size bloat?

**Answer (Interview-Ready):**

**Visual regression:**
```
Storybook → Chromatic (visual diff service)
Or: Playwright screenshot comparison

test('homepage visual', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', { maxDiffPixels: 100 });
});
```

**Lighthouse CI:** (Covered in Topic 167) — Assert performance scores in CI pipeline.

**Bundle size regression:**
```json
// bundlewatch or bundlesize
{
  "bundlewatch": {
    "files": [
      { "path": "dist/main.*.js", "maxSize": "200kB" },
      { "path": "dist/vendor.*.js", "maxSize": "150kB" }
    ]
  }
}
```

- Fail PR if bundle exceeds budget
- Track size over time (trend alerts)
- Comment on PR with size diff

🔥 **Most Asked**: Visual regression tools, bundle size CI, automating performance
🧠 **Strategy**: "Chromatic/Playwright for visual. Lighthouse CI for performance. bundlewatch for size. All automated in CI"

---

# Part N — Monitoring (Topics 332–336)

---

## 332. Frontend Logging Strategy

### Q: How do you design a frontend logging strategy?

**Answer (Interview-Ready):**

| Level | What | Example |
|-------|------|---------|
| **Error** | Unhandled exceptions, API failures | `Unhandled rejection: TypeError` |
| **Warn** | Degraded behavior, fallbacks used | `API timeout, using cached data` |
| **Info** | Business events, user actions | `User completed checkout` |
| **Debug** | Development diagnostics | `Component rendered with props: {...}` |

**Implementation:**
```ts
class Logger {
  private buffer: LogEntry[] = [];
  
  error(message: string, context?: Record<string, unknown>) {
    this.log('error', message, context);
    this.flush();  // Errors: send immediately
  }
  
  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
    // Batch: flush every 30s or when buffer reaches 50 entries
  }
  
  private log(level: string, message: string, context?: Record<string, unknown>) {
    this.buffer.push({
      level, message, context,
      timestamp: Date.now(),
      sessionId: getSessionId(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }
  
  private flush() {
    navigator.sendBeacon('/api/logs', JSON.stringify(this.buffer));
    this.buffer = [];
  }
}
```

**Best practices:**
- `navigator.sendBeacon` for reliable delivery (works during page unload)
- Batch non-critical logs (reduce API calls)
- Include session ID and URL for correlation
- Respect user privacy (no PII in logs)

🔥 **Most Asked**: Log levels, batching, sendBeacon, PII considerations
🧠 **Strategy**: "Errors: send immediately. Info: batch. Use sendBeacon for reliability. Include session ID for correlation"

---

## 333. Error Tracking — Sentry, Datadog, Rollbar

### Q: How do you set up error tracking for a frontend application?

**Answer (Interview-Ready):**

```tsx
// Sentry setup
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
  environment: process.env.NODE_ENV,
  release: process.env.COMMIT_SHA,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: true }),
  ],
  tracesSampleRate: 0.1,     // 10% of transactions
  replaysSessionSampleRate: 0.01,  // 1% of sessions
  replaysOnErrorSampleRate: 1.0,   // 100% of error sessions
});

// Error boundary integration
<Sentry.ErrorBoundary fallback={<ErrorPage />}>
  <App />
</Sentry.ErrorBoundary>

// Manual capture
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, { extra: { userId, action: 'checkout' } });
}
```

**Source maps:** Upload source maps to Sentry during build → readable stack traces in production.

**Alert rules:** Error rate > threshold → PagerDuty/Slack alert.

🔥 **Most Asked**: Sentry setup, source maps, sampling strategy, alert rules
🧠 **Strategy**: "Sentry with source maps for readable errors. Sample transactions (10%). Full capture on errors. Alert on spike"

---

## 334. Performance Monitoring

### Q: How do you monitor frontend performance in production?

**Answer (Interview-Ready):**

```js
// Core Web Vitals monitoring
import { onLCP, onCLS, onINP, onFCP, onTTFB } from 'web-vitals';

function sendMetric(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    url: window.location.pathname,
  });
  navigator.sendBeacon('/api/metrics', body);
}

onLCP(sendMetric);
onCLS(sendMetric);
onINP(sendMetric);
```

**What to monitor:**
| Metric | Alert Threshold |
|--------|----------------|
| LCP P75 | > 2.5s |
| CLS P75 | > 0.1 |
| INP P75 | > 200ms |
| JS Error rate | > 1% of sessions |
| API error rate | > 5% of requests |

**Dashboard:** P50/P75/P95 per metric, segmented by route, device type, geography.

🔥 **Most Asked**: web-vitals library, what to monitor, P75 targets
🧠 **Strategy**: "web-vitals for Core Web Vitals. P75 is the key percentile. Segment by route + device. Alert on regression"

---

## 335. Real User Monitoring (RUM)

### Q: What is RUM and how do you implement it?

**Answer (Interview-Ready):**
(Expanded from Topic 168)

**RUM = collecting performance data from real users in production**

**What RUM captures:**
- Page load timing (Navigation Timing API)
- Core Web Vitals (LCP, CLS, INP)
- Resource loading (Resource Timing API)
- User interactions (click, scroll, navigation)
- Errors and crashes
- Custom business metrics (time to checkout, search latency)

**Tools:** Datadog RUM, New Relic Browser, Google Analytics (basic), custom with `web-vitals` + `PerformanceObserver`.

**Custom business metric:**
```js
const searchStart = performance.now();
const results = await api.search(query);
const searchDuration = performance.now() - searchStart;
sendMetric({ name: 'search_latency', value: searchDuration, query });
```

🔥 **Most Asked**: RUM vs synthetic, what to capture, custom metrics
🧠 **Strategy**: "RUM for real user experience. Custom metrics for business KPIs. P75 from RUM is what Google uses for ranking"

---

## 336. OpenTelemetry for Frontend

### Q: How do you use OpenTelemetry for frontend observability?

**Answer (Interview-Ready):**

**OpenTelemetry = vendor-neutral observability framework (traces, metrics, logs).**

```js
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';

const provider = new WebTracerProvider();
provider.addSpanProcessor(new BatchSpanProcessor(
  new OTLPTraceExporter({ url: '/api/traces' })
));
provider.register();

// Auto-instrument fetch calls
registerInstrumentations({
  instrumentations: [new FetchInstrumentation()]
});

// Custom span
const tracer = trace.getTracer('checkout-flow');
const span = tracer.startSpan('place-order');
try {
  await placeOrder(cart);
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
} finally {
  span.end();
}
```

**Benefits:** 
- Distributed tracing: frontend span → API span → DB span (same trace ID)
- Vendor-neutral: switch backends (Jaeger, Datadog, Honeycomb) without code changes

🔥 **Most Asked**: Frontend tracing, distributed trace ID, vendor neutrality
🧠 **Strategy**: "OpenTelemetry for vendor-neutral traces. Propagate trace ID from frontend → backend. Auto-instrument fetch"

---

# Part O — Debugging UX (Topics 337–342)

---

## 337. User Analytics — Event Tracking, Funnels

### Q: How do you implement user analytics in a frontend application?

**Answer (Interview-Ready):**

```ts
// Event tracking
analytics.track('product_viewed', { productId: '123', category: 'shoes', price: 99 });
analytics.track('add_to_cart', { productId: '123', quantity: 1 });
analytics.track('checkout_started', { cartValue: 99 });
analytics.track('purchase_completed', { orderId: 'ORD-456', value: 99 });

// Funnel: Product View → Add to Cart → Checkout → Purchase
// Drop-off analysis: where do users leave?
```

**Implementation pattern:**
```tsx
// Analytics middleware / hook
function useTrackPageView() {
  const location = useLocation();
  useEffect(() => {
    analytics.page(location.pathname);
  }, [location]);
}

// Event boundary component
function TrackInteraction({ event, data, children }) {
  return <div onClick={() => analytics.track(event, data)}>{children}</div>;
}
```

🔥 **Most Asked**: Event naming conventions, funnel setup, privacy (GDPR consent)
🧠 **Strategy**: "Track key user actions (view, add, checkout, purchase). Define funnels. Respect GDPR consent before tracking"

---

## 338. Debugging Production — Source Maps, DevTools

### Q: How do you debug issues in production?

**Answer (Interview-Ready):**

**Source maps:**
- Generated at build time (`.map` files)
- Upload to error tracking service (Sentry, Datadog) — NOT to production server
- `.map` files should NOT be publicly accessible (exposes source code)
- Sentry uses them to show readable stack traces

```js
// webpack.config.js
devtool: 'hidden-source-map',  // Generates .map but doesn't reference it in bundle
// Upload .map files to Sentry via CLI/plugin during deploy
```

**Production debugging workflow:**
1. Error alert fires → Sentry shows error with stack trace + breadcrumbs
2. Session replay shows what user did before error
3. Check console messages + network requests in replay
4. Reproduce locally with same state/data
5. Fix → deploy → verify error rate drops

🔥 **Most Asked**: Source map security, debugging workflow, Sentry integration
🧠 **Strategy**: "hidden-source-map in prod. Upload to error service, not public CDN. Session replay for user context"

---

## 339. Correlation IDs — Tracing Requests End-to-End

### Q: How do you implement correlation IDs for frontend-to-backend tracing?

**Answer (Interview-Ready):**

```ts
// Generate correlation ID per request
function apiClient(url: string, options?: RequestInit) {
  const correlationId = crypto.randomUUID();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'X-Correlation-ID': correlationId,
      'X-Request-ID': correlationId,
    }
  });
}
// Backend logs same correlationId → trace request through entire system
// Error tracking: attach correlationId to Sentry → link frontend error to backend logs
```

**OpenTelemetry approach:** Trace context propagated automatically via `traceparent` header.

🔥 **Most Asked**: Correlation ID pattern, header conventions, linking frontend to backend
🧠 **Strategy**: "Generate UUID per request. Pass as X-Correlation-ID header. Backend logs same ID. Link in error tracking"

---

## 340–342. Session Replay, Rage Clicks, Synthetic Monitoring

### Q: How do session replays, rage click detection, and synthetic monitoring work?

**Answer (Interview-Ready):**

**Session Replay (FullStory, LogRocket, Sentry Replay):**
- Records DOM mutations + user interactions (not video — reconstructed)
- Privacy: mask sensitive fields, redact PII
- Value: see exactly what user did before error
- Sample: 1% of sessions, 100% of error sessions

**Rage Click Detection:**
```js
// Rapid clicks in same area = user frustration
let clicks = [];
document.addEventListener('click', (e) => {
  const now = Date.now();
  clicks = clicks.filter(c => now - c.time < 2000);  // 2s window
  clicks.push({ time: now, x: e.clientX, y: e.clientY });
  
  const nearby = clicks.filter(c => 
    Math.abs(c.x - e.clientX) < 50 && Math.abs(c.y - e.clientY) < 50
  );
  if (nearby.length >= 3) {
    analytics.track('rage_click', { url: location.href, element: e.target.tagName });
  }
});
```

**Synthetic Monitoring:** Scheduled automated tests that run from multiple locations.
```yaml
# Datadog synthetic test: check homepage loads < 3s every 5 min from 10 locations
# Alert if: 2+ locations fail → PagerDuty notification
```

🔥 **Most Asked**: Session replay privacy, rage click detection, synthetic vs RUM
🧠 **Strategy**: "Session replay for error context. Rage clicks signal UX issues. Synthetic for uptime/availability"

---

# Part P — Git Workflows (Topics 343–345)

---

## 343. Trunk-Based Development vs GitFlow

### Q: Compare trunk-based development and GitFlow. When would you use each?

**Answer (Interview-Ready):**

| Aspect | Trunk-Based | GitFlow |
|--------|------------|---------|
| **Branches** | Short-lived feature branches (< 1 day) | Long-lived develop, release, feature branches |
| **Merge frequency** | Multiple times/day | Per feature completion |
| **Release** | Continuous deployment from trunk | Release branches cut from develop |
| **Feature flags** | Required for WIP features | Not required (branch isolation) |
| **CI/CD** | Essential | Nice to have |
| **Best for** | High-performing teams, microservices | Scheduled releases, regulated industries |

```
# Trunk-based workflow
git checkout -b feat/button-color
# Small change, < 1 day of work
git push origin feat/button-color  # PR → merge same day

# GitFlow workflow
git checkout -b feature/new-checkout develop
# Days/weeks of work
git checkout -b release/v2.1 develop  # Cut release
```

🔥 **Most Asked**: When to use which, feature flags with trunk-based, CI/CD requirement
🧠 **Strategy**: "Trunk-based for speed + CI/CD maturity. GitFlow for scheduled releases. Feature flags decouple deploy from release"

---

## 344. PR Strategy — Code Reviews, Branch Protection

### Q: How do you design an effective PR strategy?

**Answer (Interview-Ready):**

**Branch protection rules:**
- Require 1-2 approvals
- Require passing CI checks (lint, test, build)
- Require up-to-date branch (rebase before merge)
- Enforce signed commits (optional)

**PR best practices:**
- **Small PRs** (< 400 lines): Review quality drops sharply with size
- **Descriptive title + description**: What changed, why, how to test
- **PR template:** Problem/Solution/Testing/Screenshots
- **Auto-assign reviewers**: CODEOWNERS file

```
# CODEOWNERS
*.ts       @frontend-team
*.css      @design-system-team
/api/**    @backend-team
```

**Review checklist:** Logic correctness → Edge cases → Performance → Security → Accessibility → Tests.

🔥 **Most Asked**: Small PRs, CODEOWNERS, branch protection, review quality
🧠 **Strategy**: "Small PRs (<400 lines). Branch protection with CI gates. CODEOWNERS for auto-assignment. Template for consistency"

---

## 345. Conventional Commits & Semantic Versioning

### Q: What are conventional commits and how do they enable semantic versioning?

**Answer (Interview-Ready):**

```
# Conventional Commit format:
<type>(<scope>): <description>

feat(auth): add OAuth2 login flow        → MINOR bump (1.x.0)
fix(cart): resolve race condition on add  → PATCH bump (1.0.x)
feat!: redesign checkout API              → MAJOR bump (x.0.0) (breaking)
chore(deps): bump lodash to 4.17.21      → no release
docs(readme): update setup instructions   → no release
```

**Semantic Versioning:** `MAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

**Automation:** Tools like `semantic-release` or `release-please` read commit messages → auto-bump version → generate CHANGELOG → create GitHub release.

🔥 **Most Asked**: Commit format, version bumping rules, automation with semantic-release
🧠 **Strategy**: "Conventional commits enforce structure. Semantic-release automates versioning + changelog from commits"

---

# Part Q — CI/CD Pipelines (Topics 346–349)

---

## 346. GitHub Actions — Workflows, Jobs, Actions

### Q: How do you set up a CI/CD pipeline with GitHub Actions?

**Answer (Interview-Ready):**

```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  build:
    needs: lint-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: { name: build-output }
      - run: echo "Deploy to production"
```

**Key concepts:** Workflow → triggered by events. Jobs → run in parallel by default (`needs` for dependencies). Steps → sequential within a job.

🔥 **Most Asked**: Workflow structure, job dependencies, caching, secrets management
🧠 **Strategy**: "Events trigger workflows. Jobs run in parallel unless needs specified. Cache npm for speed. Use secrets for credentials"

---

## 347. Jenkins Pipelines

### Q: How does a Jenkins pipeline work for frontend CI/CD?

**Answer (Interview-Ready):**

```groovy
// Jenkinsfile (Declarative Pipeline)
pipeline {
  agent { docker { image 'node:20-alpine' } }
  
  environment {
    NPM_TOKEN = credentials('npm-token')
  }
  
  stages {
    stage('Install') { steps { sh 'npm ci' } }
    stage('Lint & Test') {
      parallel {
        stage('Lint') { steps { sh 'npm run lint' } }
        stage('Test') { steps { sh 'npm run test -- --ci' } }
      }
    }
    stage('Build') { steps { sh 'npm run build' } }
    stage('Deploy') {
      when { branch 'main' }
      steps { sh './deploy.sh' }
    }
  }
  
  post {
    failure { slackSend channel: '#deploys', message: "Build failed: ${env.BUILD_URL}" }
  }
}
```

**Jenkins vs GitHub Actions:**
| | Jenkins | GitHub Actions |
|-|---------|---------------|
| Hosting | Self-hosted | Cloud (GitHub) |
| Config | Jenkinsfile (Groovy) | YAML |
| Plugins | 1800+ plugins | Marketplace actions |
| Best for | Enterprise, complex pipelines | OSS, GitHub-native teams |

🔥 **Most Asked**: Declarative vs scripted, parallel stages, when to use Jenkins over GHA
🧠 **Strategy**: "Jenkins for enterprise self-hosted. Declarative pipeline for readability. Parallel stages for speed"

---

## 348. Frontend-Specific Pipeline Stages

### Q: What stages should a frontend CI pipeline include?

**Answer (Interview-Ready):**

```
Install → Lint → Type Check → Unit Test → Build → Bundle Analysis → E2E → Visual Regression → Deploy
```

| Stage | Tool | Purpose |
|-------|------|---------|
| Install | `npm ci` | Reproducible deps |
| Lint | ESLint + Prettier | Code quality |
| Type Check | `tsc --noEmit` | Type safety |
| Unit Test | Jest/Vitest | Logic correctness |
| Build | webpack/Vite | Production bundle |
| Bundle Analysis | `bundlesize` | Size regression check |
| E2E | Playwright | User flow validation |
| Visual Regression | Percy/Chromatic | UI consistency |
| Lighthouse | `lighthouse-ci` | Performance budget |
| Deploy | CDN + Invalidation | Ship it |

**Fail-fast:** Lint/type check first (fastest). E2E last (slowest). Parallelize where possible.

🔥 **Most Asked**: Stage ordering, fail-fast, what's unique about frontend pipelines
🧠 **Strategy**: "Frontend pipelines add bundle size, visual regression, Lighthouse. Order: fast checks first, E2E last"

---

## 349. Artifact Caching & Build Optimization

### Q: How do you optimize CI build times for frontend projects?

**Answer (Interview-Ready):**

```yaml
# GitHub Actions caching
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'  # Auto-caches ~/.npm

# Manual cache for build output
- uses: actions/cache@v4
  with:
    path: |
      node_modules/.cache
      .next/cache        # Next.js incremental builds
    key: build-${{ hashFiles('**/package-lock.json') }}-${{ github.sha }}
    restore-keys: build-${{ hashFiles('**/package-lock.json') }}-
```

**Strategies:**
| Technique | Impact |
|-----------|--------|
| Cache `node_modules` / `.npm` | Skip install (30-60s saved) |
| Incremental builds (`.next/cache`, Nx cache) | Skip unchanged modules |
| Parallel jobs | Lint + test simultaneously |
| Turbo repo remote cache | Share cache across team |
| Docker layer caching | Reuse image layers |
| `npm ci` over `npm install` | Faster, deterministic |

🔥 **Most Asked**: npm caching, incremental builds, parallel jobs, monorepo caching
🧠 **Strategy**: "Cache dependencies + build artifacts. Parallelize independent stages. Use Nx/Turbo remote cache for monorepos"

---

# Part R — Deployment & Docker (Topics 350–356)

---

## 350. Blue-Green Deployment

### Q: What is blue-green deployment and how does it work?

**Answer (Interview-Ready):**

```
            Load Balancer
           /              \
     [Blue - v1.0]    [Green - v1.1]
     (live traffic)    (new version, testing)
     
After validation:
     [Blue - v1.0]    [Green - v1.1]
     (standby)          (live traffic - switched)
```

- Two identical environments (blue = current, green = new)
- Deploy new version to green, run smoke tests
- Switch load balancer to green (instant cutover)
- Rollback = switch back to blue (seconds)
- **Cost:** 2x infrastructure during deployment

🔥 **Most Asked**: How rollback works, cost implications, vs canary
🧠 **Strategy**: "Two environments. Deploy to idle one. Switch traffic. Instant rollback. Tradeoff: 2x infra cost"

---

## 351. Canary Releases

### Q: How do canary releases work?

**Answer (Interview-Ready):**

```
     Load Balancer (traffic splitting)
     /                        \
[v1.0 - 95% traffic]    [v1.1 - 5% traffic (canary)]

Monitor canary metrics → if healthy:
[v1.0 - 50%]  →  [v1.1 - 50%]  →  [v1.1 - 100%]
```

- Route small % of traffic to new version
- Monitor error rate, latency, business metrics
- Gradually increase traffic if healthy
- Auto-rollback if metrics degrade

**Blue-green vs canary:**
| | Blue-Green | Canary |
|-|-----------|--------|
| Traffic switch | All at once | Gradual |
| Risk | Higher (all users) | Lower (small %) |
| Rollback | Instant | Instant |
| Detection | After switch | During rollout |

🔥 **Most Asked**: Gradual rollout percentages, auto-rollback triggers, vs blue-green
🧠 **Strategy**: "Route 5% → monitor → increase. Auto-rollback on error spike. Lower risk than blue-green"

---

## 352. Feature Flags

### Q: How do feature flags decouple deployment from release?

**Answer (Interview-Ready):**

```tsx
// LaunchDarkly / Unleash / custom
const { isEnabled } = useFeatureFlag('new-checkout');

return isEnabled ? <NewCheckout /> : <OldCheckout />;
```

**Types:**
| Type | Example | Lifecycle |
|------|---------|-----------|
| Release toggle | New feature behind flag | Remove after rollout |
| Experiment | A/B test variant | Remove after experiment |
| Ops toggle | Kill switch for costly feature | Keep permanently |
| Permission | Beta access for premium users | Keep permanently |

**Best practices:**
- Clean up stale flags (technical debt)
- Default to off (safe deployment)
- Flag naming convention: `team-feature-description`

🔥 **Most Asked**: Types of flags, stale flag cleanup, decoupling deploy from release
🧠 **Strategy**: "Deploy code daily with flags off. Enable for % of users. Kill switch for incidents. Clean up stale flags"

---

## 353. Rollback Strategy

### Q: How do you design a rollback strategy for frontend apps?

**Answer (Interview-Ready):**

**Frontend rollback options:**
1. **Revert deploy:** Point CDN/server back to previous build artifact
2. **Feature flag:** Disable new feature instantly (no redeploy)
3. **Git revert:** Create revert commit → trigger new deploy
4. **Blue-green switch:** Route traffic back to previous environment

**Automated rollback trigger:**
```yaml
# Monitor after deploy
# If error_rate > 2% OR p75_LCP > 3s within 10 min:
#   → auto-rollback to previous version
#   → alert on-call engineer
```

**Key principle:** Keep previous build artifacts (at least 3 versions). Rollback should take < 5 minutes.

🔥 **Most Asked**: Automated triggers, rollback time targets, CDN cache invalidation
🧠 **Strategy**: "Keep previous artifacts. Feature flags for instant disable. Auto-rollback on error spike. Target < 5 min"

---

## 354. Dockerfile for Frontend

### Q: How do you write a Dockerfile for a frontend application?

**Answer (Interview-Ready):**

```dockerfile
# Multi-stage build
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf
server {
  listen 80;
  root /usr/share/nginx/html;
  
  location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
  }
  
  location /assets {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

🔥 **Most Asked**: Multi-stage builds, nginx config for SPA, image size optimization
🧠 **Strategy**: "Multi-stage: node for build, nginx for serve. SPA needs try_files fallback. Alpine for small images"

---

## 355. Multi-Stage Builds

### Q: Why use multi-stage Docker builds for frontend apps?

**Answer (Interview-Ready):**

| | Single Stage | Multi-Stage |
|-|-------------|-------------|
| Image size | ~1GB (node + src + deps) | ~25MB (nginx + static files) |
| Attack surface | Node.js runtime, npm, source code | Only nginx + built assets |
| Build time | Same | Same (layers cached) |

**Layer optimization:**
```dockerfile
# Bad: copies everything, busts cache for any file change
COPY . .
RUN npm ci && npm run build

# Good: install deps first (cached if package.json unchanged)
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
```

🔥 **Most Asked**: Size reduction, security benefits, layer caching strategy
🧠 **Strategy**: "Multi-stage separates build from runtime. Final image has only static files + nginx (~25MB). Cache deps layer"

---

## 356. Environment Variables in Containers

### Q: How do you manage environment variables for frontend apps in containers?

**Answer (Interview-Ready):**

**Challenge:** Frontend is static files — `process.env` doesn't exist at runtime.

**Solutions:**

| Approach | How | Pros | Cons |
|----------|-----|------|------|
| Build-time injection | `ARG REACT_APP_API_URL` in Dockerfile | Simple | Rebuild per env |
| Runtime injection | Shell script replaces placeholders at container start | One image, any env | Slightly complex |
| Config endpoint | Fetch `/config.json` at app load | Dynamic, no rebuild | Extra request |

```bash
# Runtime injection (entrypoint.sh)
#!/bin/sh
# Replace __API_URL__ placeholder in built JS files
find /usr/share/nginx/html -name '*.js' -exec \
  sed -i "s|__API_URL__|${API_URL}|g" {} +
  
nginx -g "daemon off;"
```

```dockerfile
COPY entrypoint.sh /
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

🔥 **Most Asked**: Build-time vs runtime injection, config endpoint pattern
🧠 **Strategy**: "Build-time is simple but requires rebuild per env. Runtime injection or config endpoint for one-image-any-env"

---

## ✅ File 08 Coverage Summary

| Part | Topics | Count |
|------|--------|-------|
| A — Performance Metrics | 165–168 | 4 |
| B — Code Optimization | 169–173 | 5 |
| C — Rendering Performance | 174–177 | 4 |
| D — Main Thread Management | 178–181 | 4 |
| E — Media & Fonts | 182–186 | 5 |
| F — CSS & JS Assets | 187–190 | 4 |
| G — Delivery & Third-Party | 191–195 | 5 |
| H — Accessibility Basics | 304–308 | 5 |
| I — Inclusive Design | 309–312 | 4 |
| J — UX Trade-offs | 313–316 | 4 |
| K — Testing Pyramid | 317–319 | 3 |
| L — Unit & Component Testing | 320–324 | 5 |
| M — E2E & Visual Testing | 325–331 | 7 |
| N — Monitoring | 332–336 | 5 |
| O — Debugging UX | 337–342 | 6 |
| P — Git Workflows | 343–345 | 3 |
| Q — CI/CD Pipelines | 346–349 | 4 |
| R — Deployment & Docker | 350–356 | 7 |
| **Total** | | **82** |

---

[⬅ Back to Master Index](00_MASTER_INDEX.md) | [⬆ Previous: 07_React_Angular_Frameworks.md](07_React_Angular_Frameworks.md) | [Next: 09_Company_Specific_Java.md ➡](09_Company_Specific_Java.md)
