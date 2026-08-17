# 62. Time to Interactive (TTI) Trade-offs ★

## 1. High-Level Explanation (Frontend Interview Level)

**Time to Interactive (TTI)** is a performance metric that measures how long it takes a page to go from "visually loaded" to "reliably interactive" — specifically, the point at which the main thread has been quiet for at least 5 seconds and the page responds to user input with ≤50ms latency. TTI is distinct from **FCP (First Contentful Paint)** and **LCP (Largest Contentful Paint)**: a page can visually appear complete (good FCP/LCP) while still being unresponsive because heavy JavaScript is parsing and executing on the main thread. TTI captures this "looks ready but isn't" gap. In 2024, **Total Blocking Time (TBT)** has largely replaced TTI as the reported Core Web Vitals metric (TTI is no longer in the Core Web Vitals set), but TBT directly measures the same problem — main thread JavaScript blocking user interaction — and all optimisations for TTI improve TBT equally.

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### TTI vs TBT — Understanding the Relationship

```
Page load timeline:
  0ms         FCP           LCP              TTI
  |─────────────|─────────────|──────────────|───────────── interactive
                              ↑               ↑
                    visually appears done    reliably responds to input
                    
Total Blocking Time (TBT) = sum of all blocking periods between FCP and TTI
  
  FCP                                                    TTI
  |──50ms──|──200ms block──|──80ms──|──300ms block──|──idle 5s──|
                ↑                         ↑
         TBT contribution             TBT contribution
         = 200-50 = 150ms             = 300-50 = 250ms
  Total TBT = 150 + 250 = 400ms
  
  Long Tasks = any main thread task >50ms
  Blocking time = Long Task duration - 50ms (the first 50ms is acceptable)
```

### Root Causes of High TTI/TBT

**1. Large JavaScript bundle — Parse + Compile + Execute**

```
JS bundle pipeline on low-end device (4x CPU throttle = Moto G4 equivalent):
  Raw JS parse:    ~1ms per KB   (300KB bundle → 300ms parse)
  Compilation:     JS engine compiles to bytecode (additional CPU cost)
  Execution:       running all module initialisation code
  
  400KB JS bundle on mobile: ~400-600ms main thread time before first input response
  
Impact: If this happens after FCP → user sees the page, taps, gets no response → frustrated
```

**2. Rendering blocking third-party scripts**

```html
<!-- ❌ Synchronous third-party script — blocks main thread before page is interactive -->
<script src="https://cdn.analytics.com/tracker.js"></script>

<!-- ✅ Deferred — runs after DOM parsed, doesn't block parsing -->
<script src="https://cdn.analytics.com/tracker.js" defer></script>

<!-- ✅ Async — runs as soon as downloaded, out-of-order — use for fully independent scripts -->
<script src="https://cdn.analytics.com/tracker.js" async></script>
```

**3. Hydration cost in SSR/SSG apps**

```
SSR page load with large React app:
  TTFB → HTML received (FCP) → browser renders HTML → downloads React + app JS
  → React hydrates (reconciliation of server HTML with client VDOM — expensive)
  → Page becomes interactive (TTI)
  
  Gap between FCP and TTI = hydration time
  Large React app: 200-800ms hydration time on mobile
  
Expensive operations during hydration:
  - Re-executing all component render functions
  - Attaching all event listeners
  - Re-creating all context trees
  - Running all useEffect hooks (after hydration completes)
```

### TTI Optimisation Strategies

**Strategy 1: Code Splitting + Lazy Loading**

```typescript
// ❌ Everything in one bundle — full bundle parsed even for simple home page
import { DataTable } from './DataTable';          // heavy virtualisation library
import { ChartDashboard } from './ChartDashboard'; // chart rendering library
import { ExportPanel } from './ExportPanel';       // PDF generation library

// ✅ Lazy load heavy components — only load when needed
const DataTable = lazy(() => import('./DataTable'));
const ChartDashboard = lazy(() => import('./ChartDashboard'));
const ExportPanel = lazy(() => import('./ExportPanel'));

// These chunks don't parse/execute until the user navigates to them
// TTI on the home page is now unaffected by DataTable's heavy deps
```

**Strategy 2: Break Up Long Tasks with scheduler**

Long Tasks (>50ms) are the direct cause of high TBT. Break them into smaller chunks:

```typescript
// ❌ Single long task — blocks the main thread for duration of the loop
function processLargeDataset(items: Item[]) {
  items.forEach((item) => expensiveTransform(item));  // 600ms single task → TBT += 550ms
}

// ✅ Use scheduler.yield() (Chrome 115+) to break into smaller tasks
async function processLargeDataset(items: Item[]) {
  for (let i = 0; i < items.length; i++) {
    expensiveTransform(items[i]);
    
    // Yield to the browser every 50 items — allows input events to be processed
    if (i % 50 === 0 && 'scheduler' in window) {
      await scheduler.yield();  // browser can handle pending user events
    }
  }
}

// Alternative: setTimeout(fn, 0) breaks up task queue, but scheduler.yield()
// allows pending user interactions and microtasks to run first (better priority)
```

**Strategy 3: Reduce Hydration Cost — Selective/Partial Hydration**

```typescript
// React 18: Concurrent features allow progressive hydration
// Wrap non-critical UI in Suspense → hydrates after critical path
import { Suspense, lazy } from 'react';

// SSR renders everything to HTML; hydration is progressive
function AppRoot() {
  return (
    <>
      {/* Hydrates first — critical interactive controls */}
      <SearchBar />
      <PrimaryNavigation />
      
      {/* Hydrates after — lower priority; user unlikely to interact immediately */}
      <Suspense fallback={null}>
        <Recommendations />   {/* lazy hydration — React hydrates when idle */}
        <Footer />            {/* below fold — hydrates last */}
      </Suspense>
    </>
  );
}
```

**Strategy 4: Defer Non-Critical Third-Party Scripts**

```typescript
// Next.js Script component — fine-grained third-party loading strategy
import Script from 'next/script';

function App() {
  return (
    <>
      {/* Critical: loads before page is interactive */}
      <Script src="/critical-config.js" strategy="beforeInteractive" />
      
      {/* Default: loads after page hydrates */}
      <Script src="https://analytics.example.com/tracker.js" strategy="afterInteractive" />
      
      {/* Non-critical: loads when browser is idle */}
      <Script src="https://chat-widget.example.com/widget.js" strategy="lazyOnload" />
    </>
  );
}
```

**Strategy 5: Web Workers for Non-UI Computation**

```typescript
// Move CPU-intensive work off the main thread entirely
// Main thread: parse JSON => dedicate to rendering and interaction
// Worker thread: heavy data processing => runs in parallel

// worker.ts
self.onmessage = function(event) {
  const { data, operation } = event.data;
  
  // CPU-intensive: runs in Worker — never touches the main thread
  const result = operation === 'sort'
    ? data.sort((a, b) => b.value - a.value)
    : data.filter((item) => meetsComplexCriteria(item));
  
  self.postMessage(result);
};

// main.ts — UI thread
const worker = new Worker('/worker.js');

function processLargeData(data: DataItem[]) {
  worker.postMessage({ data, operation: 'sort' });
  worker.onmessage = (event) => {
    setProcessedData(event.data);  // Re-render with processed data
  };
}
// Main thread stays free for user input during processing
```

### TTI Trade-offs

| Optimisation | TTI/TBT Benefit | Trade-off |
|---|---|---|
| Code splitting | Reduces parse/execute for initial page | More network requests; waterfall on navigation if preload not configured |
| Lazy hydration | Reduces hydration cost on initial load | Components not yet hydrated may briefly appear unresponsive on early click |
| Defer 3rd-party scripts | Removes blocking main thread tasks | Analytics events fired before script loads may be lost |
| Web Workers | Completely removes heavy compute from main thread | Serialisation cost (postMessage copies data); more complex code; no DOM access from worker |
| SSG vs SSR | SSG has lower TTI (no server wait); SSR adds hydration overhead | SSG cannot personalise; SSR enables dynamic content |
| Islands Architecture | Only interactive "islands" hydrate; pure HTML otherwise | Increased architectural complexity; not always framework-native |

---

## 3. Real-World Examples

**SAP Lighthouse (Hruday's project):** The SAP BI Launchpad initially had >3s TTI on mobile because the SAP UI5 core library (1.2MB+) parsed synchronously on page load. Optimisation: async loading of SAPUI5 core, lazy-loading of non-critical modules (reporting widget library), and deferring analytics scripts — collectively reducing TTI from 3.4s to 1.8s.

**LinkedIn case study:** LinkedIn's 2020 performance work reduced TTI from 6.5s to under 3s on mobile by implementing React.lazy code splitting per route, deferring their realtime update websocket initialisation until after TTI, and breaking up long tasks in their feed update processing with async scheduling (same as the `scheduler.yield()` pattern above).

**Google PageSpeed Insights:** Every Lighthouse audit includes TBT as a key metric alongside LCP and CLS. Any TBT > 200ms shows as "orange" (needs improvement); > 600ms is "red" (poor). Reducing TBT from 800ms to <200ms directly improves from poor to good Core Web Vitals and is measurable via CrUX data in Search Console.

---

## 4. Interview-Oriented Answer

**Sample Answer (7+ years level):**
> "TTI measures the gap between when a page looks ready and when it's actually reliably responsive to input. The cause is always the same: too much JavaScript work on the main thread after the visual content loads — parsing and executing large bundles, hydrating SSR-rendered HTML, or running synchronous third-party scripts. Total Blocking Time is the 2024 metric that replaced TTI in Core Web Vitals — it sums the total blocking time from Long Tasks (>50ms tasks contribute their excess over 50ms to TBT). The three most impactful fixes are: first, code splitting so only the JS needed for the current page is parsed on load; second, deferring or async-loading third-party scripts that don't need to run before interaction; and third, for SSR apps, progressive hydration using React 18 Concurrent features so only above-fold interactive components hydrate on the critical path. Beyond that, moving CPU-intensive work to Web Workers eliminates main thread blocking entirely. The key trade-off is that lazy loading trades small TTI for slightly higher navigation latency — you mitigate this with route-level prefetching so the next page's bundle downloads in the background before the user navigates."

**Likely Follow-up Questions:**
1. Is TTI still a Core Web Vitals metric? → No — TTI was removed from Core Web Vitals; TBT and INP (Interaction to Next Paint) replaced it. But all TTI optimisations improve TBT/INP, so the strategies remain fully relevant.
2. How does Islands Architecture help TTI? → In Islands, large portions of the page are static HTML with zero hydration cost; only small "islands" of interactive functionality hydrate → dramatic TTI improvement on content-heavy pages but requires framework support (Astro, Fresh, Qwik)
3. What is `scheduler.yield()` and how does it help? → scheduler.yield() is a browser Scheduler API that breaks up a long synchronous task by yielding control back to the browser, allowing pending user input events and higher-priority tasks to run before the rest of the long task continues; reduces TBT without sacrificing correctness
4. At what TTI/TBT threshold should you act? → Lighthouse: TBT < 200ms = good; 200-600ms = needs improvement; > 600ms = poor. For mobile (4G, mid-range device), target TBT < 300ms; for desktop, < 100ms.

---

## 5. Code Example

```typescript
// Measuring TBT programmatically with PerformanceObserver
// Use this to track production TTI/TBT regressions

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) {
      // This is a Long Task — contributes to TBT
      const blockingTime = entry.duration - 50;
      console.warn(`Long Task detected: ${entry.duration.toFixed(0)}ms | Blocking: ${blockingTime.toFixed(0)}ms`);
      
      // Send to monitoring
      analytics.track('long_task', {
        duration: entry.duration,
        blockingMs: blockingTime,
        startTime: entry.startTime,
        page: location.pathname,
      });
    }
  }
});

observer.observe({ type: 'longtask', buffered: true });

// Web Vitals library — measure TBT (approximated from Long Tasks)
import { onTBT } from 'web-vitals';
onTBT((metric) => {
  // metric.value = TBT in milliseconds
  sendToAnalytics({ name: 'TBT', value: metric.value, page: location.pathname });
});
```

---

## 6. Memory Aid

**Mental Model:** TTI is the restaurant **"kitchen ready" signal**. The food looks done on the pass (FCP/LCP), but the waiter is still carrying other orders and unavailable to you (main thread is busy). TTI is when they put down those plates and are finally ready to take your order. TBT is the total time they spent carrying those other dishes while you were waiting.

**Key sentence if you go blank:** "TTI = gap between visual readiness (LCP) and input responsiveness; caused by Long Tasks on the main thread; fixed by code splitting, deferred scripts, progressive hydration, and Web Workers."

**Tech mnemonic CDHW = Code-split, Defer, Hydrate progressively, Workers** — the four pillars of TTI/TBT reduction.

---

## 7. Why & How Summary

**Why it matters:**
→ UX: High TTI/TBT causes the frustrating "unresponsive page" experience — users tap buttons and see no response; this is the most damaging UX failure because users feel the app is broken
→ Business: Google's research shows 1s delay in mobile page interactivity reduces conversions by up to 12%; TBT is now a ranking factor via Core Web Vitals
→ Mobile first: TTI problems are 3–5× worse on mid-range mobile devices (slower CPUs, throttled JavaScript parsing); optimising for TTI = optimising for your median mobile user

**How it works (3 sentences):**
TTI measures the point after FCP where the main thread has been free from Long Tasks (>50ms) for at least 5 seconds consecutively; until that point, any user interaction (click, tap, keypress) may be delayed by up to the duration of the blocking Long Task. Total Blocking Time (TBT) quantifies this problem as the sum of all blocking time (task_duration - 50ms) from all Long Tasks between FCP and TTI, providing a single actionable number that correlates with the "unresponsive page" user experience. The primary causes are large JavaScript bundles (parse + execute time), SSR hydration cost, and synchronous third-party scripts — and the primary fixes are code splitting, async/deferred script loading, progressive hydration (React 18 Concurrent), and off-main-thread processing via Web Workers.

**Company relevance:**
- Microsoft: Bing and MSN have multi-million user mobile traffic where TBT directly affects SEO ranking and user engagement metrics
- Adobe: Creative Cloud home page (adobe.com/creativecloud) ships heavy marketing JS; TBT optimisation is ongoing performance engineering work
- Salesforce: Trailhead learning platform on mobile — TBT reduction was a documented performance initiative to improve engagement in emerging markets
- Cisco: Webex web meeting join flow — TBT from 3s → <500ms was a KPI in the Webex web performance team based on user complaints about slow meeting join
