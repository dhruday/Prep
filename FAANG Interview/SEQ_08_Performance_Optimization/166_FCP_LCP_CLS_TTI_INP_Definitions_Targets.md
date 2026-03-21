# 166. FCP, LCP, CLS, TTI, INP — Precise Definitions and Targets
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"I treat each Web Vital as having three components: a precise definition of what the browser measures and when, the threshold that separates 'good' from 'needs improvement' from 'poor', and the root cause categories that push you into each band. At SAP, our LCP was 4.2s — in the 'poor' range — caused by a render-blocking JS bundle combined with no LCP element hint. Our INP was 400ms — also 'poor' — caused by synchronous Redux computation on the main thread. Our CLS was 0.19 — 'needs improvement' — caused by an analytics sidebar injected without height reservation. Understanding the precise definitions matters because each metric implicates a different part of the stack: LCP is about loading and rendering, INP is about main thread responsiveness, CLS is about layout discipline. I can speak to each one from diagnosis through fix."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### FCP — First Contentful Paint

**Precise Definition:** The time from **navigation start** to when the browser renders the **first piece of DOM content** — text, image, SVG, non-white `<canvas>`, or the background of an `input[type=radio]` or `input[type=checkbox]`. Background images and images hidden via opacity/visibility do NOT count.

**What constitutes "contentful":**
- Text nodes (rendered using any font)
- PNG/JPEG/GIF/WEBP/SVG images
- `<video>` poster images
- Elements with a background-image CSS property (with actual image, not gradient)
- `<canvas>` elements with painted content

**What does NOT count:**
- `<html>`, `<body>`, `<head>` processing
- White/blank paint passes
- JS parsing (not visible)

**Thresholds:**
| Band | Value |
|------|-------|
| ✅ Good | < 1.8s |
| ⚠️ Needs Improvement | 1.8s – 3.0s |
| ❌ Poor | > 3.0s |

**Root Causes of Poor FCP:**
1. **Render-blocking CSS** — `<link rel="stylesheet">` in `<head>` without `media` attribute blocks all paint
2. **Render-blocking JS** — `<script>` without `async`/`defer` in `<head>` blocks HTML parsing
3. **Slow TTFB** — server response above 800ms defers everything downstream
4. **Large critical CSS** — even with no render-blocking, 100KB+ critical CSS inlining delays first paint
5. **No preconnect/preload** for critical fonts causing FOUT/FOIT blocking layout

**Fix hierarchy:**
```
1. Eliminate render-blocking resources (defer/async JS, media queries on CSS)
2. Reduce TTFB (CDN, edge caching, faster server)
3. Inline critical CSS (< 14KB)
4. Preconnect to font servers
```

---

### LCP — Largest Contentful Paint

**Precise Definition:** The render time of the **largest image or text block visible in the viewport** from navigation start. The LCP element can change during loading — the browser continuously reports new LCP candidates until the user first interacts (scroll, click, keypress), at which point the last reported LCP is the final value.

**Candidate element types (browser checks in this order):**
1. `<img>` elements
2. `<image>` elements inside SVG
3. `<video>` elements (poster image time used)
4. Elements with `background-image` loaded via CSS `url()` (NOT gradients)
5. Block-level elements containing text nodes or inline-level text child elements

**Size calculation:** The intrinsic size cropped to the visible portion in the viewport. Overflow hidden reduces the candidate size.

**Thresholds:**
| Band | Value |
|------|-------|
| ✅ Good | < 2.5s |
| ⚠️ Needs Improvement | 2.5s – 4.0s |
| ❌ Poor | > 4.0s |

**LCP Three-Phase Breakdown:**

```
Navigation Start
      │
      ▼ Phase 1: Resource Load Delay
      │  Time from nav start until browser discovers the LCP resource
      │  Causes: render-blocking resources, slow HTML response
      │
      ▼ Phase 2: Resource Load Time
      │  Time to download the LCP resource (image/font)
      │  Causes: large file size, no CDN, wrong format (JPEG vs WebP)
      │
      ▼ Phase 3: Element Render Delay
      │  Time from resource downloaded to actual paint on screen
      │  Causes: JS blocking main thread during render, CSS not applied yet
      │
    LCP timestamp
```

**Common LCP Anti-Patterns:**
```typescript
// ❌ WRONG: LCP image hidden inside lazy component - browser can't discover it early
// <Suspense><LazyHeroImage /></Suspense>  → Lighthouse sees 0.8s resource delay

// ✅ CORRECT: LCP image preloaded and given highest fetch priority
// In <head>:
// <link rel="preload" as="image" href="/hero.webp" fetchpriority="high">
// In component:
// <img src="/hero.webp" fetchpriority="high" decoding="async" />
```

**`fetchpriority="high"` — The Most Impactful Single LCP Fix:**
Without `fetchpriority`, browsers assign "Low" priority to images below the `<head>` because they can't see them yet. By the time the image is discovered via CSS/JS, other network requests have filled bandwidth. `fetchpriority="high"` on the LCP `<img>` + a matching `<link rel="preload">` in `<head>` consistently delivers 200–800ms LCP improvement.

---

### CLS — Cumulative Layout Shift

**Precise Definition:** The sum of all **unexpected layout shift scores** throughout the entire page lifetime. A layout shift is any time a visible element changes its starting position between frames.

**Score formula per shift:**
```
Shift Score = Impact Fraction × Distance Fraction

Impact Fraction: the area of the viewport covered by the union of the element's
                 start and end positions (as a percentage of viewport area)

Distance Fraction: the maximum distance any element moved (as a percentage
                   of the largest viewport dimension — width or height)
```

**Example calculation:**
- Image shifts: occupies 50% of viewport area before/after = impact 0.5
- It moves 25% of viewport height = distance 0.25
- Shift score = 0.5 × 0.25 = **0.125** (Needs Improvement with this single shift)

**CLS Exception — Expected Input Shifts:**
Layout shifts within 500ms of a user interaction (click, tap, key press) are excluded. Expanding an accordion, opening a dropdown — these are expected and don't contribute to CLS.

**Thresholds:**
| Band | Value |
|------|-------|
| ✅ Good | < 0.1 |
| ⚠️ Needs Improvement | 0.1 – 0.25 |
| ❌ Poor | > 0.25 |

**Root Causes (in order of frequency):**

| Cause | Fix |
|-------|-----|
| Images without width/height | Set explicit `width`/`height` attributes or `aspect-ratio: 16/9` CSS |
| Ads/embeds without reserved space | Set min-height container before ad loads |
| Web fonts causing FOUT | Use `font-display: optional` or `size-adjust` descriptor |
| Dynamically injected banners above content | Reserve space in skeleton or use `position: sticky` |
| Late JS injecting elements above text | Render skeleton placeholders with same dimensions |
| CSS animations with layout-triggering properties | Use `transform`/`opacity` only (compositor-friendly) |

**CLS Diagnostic Tool:**
```javascript
// Identify which elements are causing shifts
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput && entry.value > 0.02) {
      console.group(`Layout Shift: ${entry.value.toFixed(4)}`);
      entry.sources.forEach(source => {
        console.log('Element:', source.node);
        console.log('Previous rect:', source.previousRect);
        console.log('Current rect:', source.currentRect);
      });
      console.groupEnd();
    }
  }
}).observe({ type: 'layout-shift', buffered: true });
```

---

### TTI — Time to Interactive (Deprecated but Still Referenced)

**Precise Definition (historical):** The time at which the page becomes **reliably interactive** — defined as the first 5-second quiet window after FCP where no long tasks (> 50ms) exist and the network is idle (< 2 requests in-flight).

**Why it was deprecated:**
1. The 5-second quiet window heuristic was arbitrary and often didn't correlate with user experience
2. It over-penalized pages with necessary background activity (prefetching, analytics)
3. INP better captures actual interactivity because it measures real interactions, not predicted quiet windows
4. Lighthouse 10 removed TTI from the score calculation (June 2023)

**What replaced it:** INP (field) + TBT (lab proxy). TBT directly measures main thread time that would delay interaction — same root cause TTI was trying to expose, but without the flawed quiet-window heuristic.

**When you'll still see TTI:** Legacy dashboards, older Lighthouse reports (< 10), some third-party tools. Know the definition but don't optimize for it separately if you're optimizing INP.

---

### INP — Interaction to Next Paint

**Precise Definition:** The latency from when a user **interaction begins** (click, tap, keyboard press) to when the browser **paints the next visual frame** in response. INP is the **98th percentile** of all interaction latencies observed during the page session (not just the first interaction).

**Three phases of INP:**

```
User Interaction
      │
      ▼ Phase 1: Input Delay
      │  From interaction event to when event handler starts executing
      │  Cause: other tasks were running on the main thread at the time
      │  (Long tasks, setState batches, timers, requestAnimationFrame loops)
      │
      ▼ Phase 2: Processing Time
      │  Event handler execution time
      │  Cause: heavy computation in onClick/onKeyPress handlers
      │  (Sorting 1000 items, unoptimized reducer, synchronous API reads)
      │
      ▼ Phase 3: Presentation Delay
      │  From handler completing to next frame painted
      │  Cause: large style recalculation or layout triggered by DOM changes
      │  (Adding 500 DOM nodes, triggering reflow on the full document)
      │
    INP timestamp (next paint)
```

**Thresholds:**
| Band | Value |
|------|-------|
| ✅ Good | < 200ms |
| ⚠️ Needs Improvement | 200ms – 500ms |
| ❌ Poor | > 500ms |

**INP vs FID Comparison:**

| Aspect | FID (deprecated) | INP (current) |
|--------|-----------------|---------------|
| Scope | First interaction only | All interactions |
| Measurement | Input delay ONLY | Input delay + processing + presentation |
| Aggregation | First FID value | 98th percentile across session |
| Availability | CrUX (legacy) | CrUX (2024+) |
| Lab proxy | Not measurable | TBT (indirect) |

**High INP Root Causes and Fixes:**

```typescript
// ❌ PROBLEM: Synchronous computation in event handler
function onFilterChange(filter: string) {
  // Blocks main thread for 300ms on 5000 rows
  const results = expensiveFilter(allData, filter); 
  setFilteredData(results);
}

// ✅ FIX 1: useTransition — defer non-urgent state update
function onFilterChange(filter: string) {
  setSearchInput(filter);            // immediate — updates input (high priority)
  startTransition(() => {
    setFilteredData(                 // deferred — can be interrupted
      expensiveFilter(allData, filter)
    );
  });
}

// ✅ FIX 2: Move computation to Web Worker
const worker = new Worker('/filterWorker.js');
function onFilterChange(filter: string) {
  setSearchInput(filter);
  worker.postMessage({ allData, filter });
}
worker.onmessage = (e) => setFilteredData(e.data);

// ✅ FIX 3: Yield control mid-computation (scheduler.yield)
async function onFilterChange(filter: string) {
  setSearchInput(filter);
  await scheduler.yield(); // yield to browser, then continue
  const results = expensiveFilter(allData, filter);
  setFilteredData(results);
}
```

### The Metric-to-Phase Mapping

```
Navigation Start ──────────────────────────────── Page Interactive
│                                                          │
│ TTFB        FCP          LCP        TTI (deprecated)     │
│ <800ms      <1.8s        <2.5s      <3.8s                │
│ ─────       ────────     ────────── ─────────────────────│
│                                                          │
│                    CLS < 0.1 (accumulated throughout)    │
│                                                          │
│                              INP < 200ms (any interaction) │
└──────────────────────────────────────────────────────────┘

Diagnostic:
  TBT = sum of long task blocking portions (FCP → TTI window)
  TBT < 200ms is lab proxy for INP < 200ms in field
```

### Anti-Patterns & Common Mistakes

| Mistake | Consequence |
|---------|-------------|
| "We optimized TTI" (2025) | TTI is deprecated — INP is now the interactivity metric |
| Setting TTI as an alert threshold | Wrong metric — teams hit TTI target while INP is 400ms |
| Treating FCP as the key metric | FCP fires on any content; a spinner fires FCP. LCP is what matters |
| Not distinguishing INP phases | Fixing event handlers when input delay is the actual bottleneck |
| Measuring P50 instead of P75 | Google uses P75 for CWV; P50 can look fine while P75 is in 'poor' band |

---

## 🌍 3. Real-World Examples

### SAP Labs — Direct Experience (Hruday)
Each metric pointed at a distinct layer:
- **LCP 4.2s → 2.3s:** Root cause was a 380KB uncompressed JS bundle loaded synchronously before the main content `<div>` could render. Fix: code split into async chunks + `fetchpriority="high"` on the hero text section's wrapping block. LCP element changed from a CSS-loaded background (`<div class="hero">`) to direct HTML text — browser could paint it 800ms earlier.
- **INP 400ms → 120ms:** Filter click dispatched a Redux action that synchronously iterated 1,200 rows to compute derived state in the reducer. Fix: moved computation to `createSelector` (memoized), wrapped UI update in `startTransition`. Input delay was actually 180ms (another Redux dispatch running during click) — fixed by debouncing non-critical background syncs.
- **CLS 0.19 → 0.04:** Analytics sidebar rendered with zero height, then grew 60px after data loaded. Fix: added `min-height: 80px` placeholder + `Suspense` fallback with skeleton matching sidebar dimensions.

### Microsoft — Teams Web Client
Teams uses a custom INP alerting system per UI surface. The emoji reaction panel had INP of 450ms — classified as 'poor'. Deep dive using LoAF API revealed: 240ms input delay caused by a React concurrent render running during the interaction, plus 210ms processing time from an unoptimized emoji search function (linear scan of 3,000 emoji). Fix: `useTransition` for the re-render + trie-based search structure cut INP to 85ms.

### Adobe — Fonts and CLS
Adobe Fonts CDN serves thousands of custom typefaces. FOUT (Flash of Unstyled Text) on font swap caused CLS of 0.15 across editorial pages. The font swap shifted paragraph heights unpredictably. Fix: `font-display: optional` (never swap after initial load) + `size-adjust` CSS descriptor to pre-calculate fallback font metrics to match Adobe Fonts dimensions exactly. CLS dropped to 0.01.

### Salesforce — CLS from Dynamic Record Views
Lightning record pages dynamically inject related list components as they load. Each injection pushed the main record form down. CLS peaked at 0.31 in enterprise orgs with many related lists. Fix: precomputed record page layout stored server-side → sent as initial payload → DOM structure reserved (collapsed, but correct height) from initial paint → hydrated as data loaded. CLS fell to 0.06.

---

## 💼 4. Interview Execution

### Sample Answer — Deep Definitions (2 minutes)

> "LCP measures the render time of the largest content element visible in viewport — image or text block. The threshold is 2.5s for 'good'. At 4.2s, our SAP dashboard was 'poor'. The root cause was a render-blocking JS bundle preventing the browser from painting the LCP candidate — the main table header — until that bundle finished executing. INP replaced FID in March 2024 — it measures the full interaction latency: input delay plus event processing plus presentation delay, at the 98th percentile across all page interactions. Our 400ms INP was 'poor'. Root cause: synchronous Redux computation in the event handler eating 220ms of processing time. CLS measures accumulated layout instability — the impact fraction times the distance fraction for each unexpected shift. Our 0.19 was 'needs improvement' — a single analytics sidebar injection caused it. TTI is deprecated since Lighthouse 10 — INP plus TBT have replaced it. In CI we budget TBT < 200ms as the lab proxy for INP."

### Follow-Up Q&A

**Q: At what percentile does Google evaluate Core Web Vitals for search ranking?**
A: Google evaluates at the **75th percentile** of all page loads in CrUX data, separated by device type (mobile and desktop assessed separately). This means 75% of your real users must experience LCP < 2.5s, INP < 200ms, and CLS < 0.1 for a "good" rating. You can pass desktop but fail mobile — they are graded independently.

**Q: What's the difference between TBT and INP? Why does Lighthouse use TBT if INP is the current standard?**
A: INP requires actual user interactions — it cannot be measured in lab conditions because Lighthouse runs a scripted, bot-based page load without genuine interaction events. TBT (Total Blocking Time) is the lab substitute — it measures how much the main thread was blocked by long tasks during page load, which correlates with how much input delay users would experience. TBT and INP improve together because both are caused by long-running main thread tasks. Lighthouse uses TBT; CrUX field data uses INP.

**Q: Can CLS be negative? Can a layout shift improve your score?**
A: No. CLS only accumulates upward — it's a sum of shift magnitudes, and shifts within 500ms of user input are excluded (not subtracted). The only way to reduce CLS is to prevent shifts from occurring, not to "cancel" them with opposite-direction shifts.

**Q: My team claims our FCP is fast but users complain the page takes forever to be usable. What's wrong?**
A: FCP fires on the first painted content — this is often a spinner, skeleton, or progress bar. Fast FCP does not mean useful content is visible. LCP measures the meaningful content. If LCP is poor while FCP is fast, the skeleton/spinner pattern is masking a slow actual content load. Additionally, high INP means even after LCP, the page feels sluggish to interact with.

### Metric Quick Reference

| Metric | What | Threshold (Good) | Lab or Field | Replaces/Replaced By |
|--------|------|------------------|--------------|----------------------|
| TTFB | First byte received | < 800ms | Both | — |
| FCP | First DOM content painted | < 1.8s | Both | — |
| LCP | Largest content painted | < 2.5s | Both | — |
| TBT | Main thread blocking time | < 200ms | Lab only | TTI (lab) |
| CLS | Accumulated layout shifts | < 0.1 | Both | — |
| FID | First input delay | < 100ms | Field only | **Replaced by INP** |
| INP | Interaction to next paint | < 200ms | Both | Replaced FID (2024) |
| TTI | Time to Interactive | < 3.8s | Lab only | **Deprecated (Lighthouse 10)** |

---

## 💻 5. Code Example (TypeScript)

```typescript
// Detailed per-metric attribution helper
// Use in development to identify root causes before they reach production

interface LCPAttribution {
  element: string;
  loadTime: number;
  renderTime: number;
  resourceLoadDelay: number;
  resourceLoadDuration: number;
  elementRenderDelay: number;
}

interface INPAttribution {
  eventType: string;
  eventTarget: string;
  loadState: string;
  inputDelay: number;
  processingDuration: number;
  presentationDelay: number;
  interactionId: number;
}

interface CLSAttribution {
  largestShiftTarget: string;
  largestShiftValue: number;
  largestShiftSource: {
    previousRect: DOMRectReadOnly;
    currentRect: DOMRectReadOnly;
  };
}

import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

// LCP — identify which element and which phase to fix
onLCP((metric) => {
  const { attribution } = metric;
  const a: LCPAttribution = {
    element: attribution.element || 'unknown',
    loadTime: attribution.lcpResourceEntry?.responseEnd ?? 0,
    renderTime: metric.value,
    resourceLoadDelay: attribution.resourceLoadDelay,
    resourceLoadDuration: attribution.resourceLoadDuration,
    elementRenderDelay: attribution.elementRenderDelay,
  };

  if (a.resourceLoadDelay > 500) {
    console.warn('LCP fix: Preload or preconnect — resource discovered too late');
  }
  if (a.resourceLoadDuration > 500) {
    console.warn('LCP fix: Compress image or use CDN — resource download too slow');
  }
  if (a.elementRenderDelay > 200) {
    console.warn('LCP fix: Reduce JS blocking render — element ready but paint delayed');
  }
});

// INP — identify which phase to optimize
onINP((metric) => {
  const { attribution } = metric;
  const a: INPAttribution = {
    eventType: attribution.eventType,
    eventTarget: attribution.eventTarget || 'unknown',
    loadState: attribution.loadState,
    inputDelay: attribution.inputDelay,
    processingDuration: attribution.processingDuration,
    presentationDelay: attribution.presentationDelay,
    interactionId: attribution.interactionId,
  };

  if (a.inputDelay > 100) {
    console.warn('INP fix: Input delay high — long tasks running at interaction time');
    console.warn('Check: setTimeout chains, unnecessary re-renders, background syncs');
  }
  if (a.processingDuration > 50) {
    console.warn('INP fix: Event handler heavy — move compute to worker or useTransition');
    console.warn(`Interaction: ${a.eventType} on ${a.eventTarget}`);
  }
  if (a.presentationDelay > 50) {
    console.warn('INP fix: Presentation delay — large style/layout recalculation post-handler');
    console.warn('Check: adding many DOM nodes, triggering layout with DOM reads after writes');
  }
});

// CLS — identify which element is shifting
onCLS((metric) => {
  const { attribution } = metric;
  if (metric.value > 0.05) {
    const a: CLSAttribution = {
      largestShiftTarget: attribution.largestShiftTarget || 'unknown',
      largestShiftValue: attribution.largestShiftValue,
      largestShiftSource: {
        previousRect: attribution.largestShiftSource?.previousRect,
        currentRect: attribution.largestShiftSource?.currentRect,
      },
    };
    console.warn('CLS fix target element:', a.largestShiftTarget);
    console.warn('Shift value:', a.largestShiftValue);
    console.warn('Previous position:', a.largestShiftSource.previousRect);
    console.warn('Current position:', a.largestShiftSource.currentRect);
  }
});
```

```typescript
// React hook: show metric quality badge in development overlay
import { useState, useEffect } from 'react';
import { onLCP, onINP, onCLS } from 'web-vitals';

type Rating = 'good' | 'needs-improvement' | 'poor' | 'pending';

export function useWebVitalsOverlay() {
  const [vitals, setVitals] = useState({
    lcp: { value: 0, rating: 'pending' as Rating },
    inp: { value: 0, rating: 'pending' as Rating },
    cls: { value: 0, rating: 'pending' as Rating },
  });

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    onLCP((m) => setVitals(v => ({ ...v, lcp: { value: m.value, rating: m.rating } })));
    onINP((m) => setVitals(v => ({ ...v, inp: { value: m.value, rating: m.rating } })));
    onCLS((m) => setVitals(v => ({ ...v, cls: { value: m.value, rating: m.rating } })));
  }, []);

  return vitals;
}
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"FLiCk-IT"**
- **F** — FCP: First Contentful Paint | < **1.8**s | any DOM content
- **L** — LCP: Largest Contentful Paint | < **2.5**s | meaningful content
- **i** — INP: Interaction to Next Paint | < **200**ms | P98 all interactions  
- **C** — CLS: Cumulative Layout Shift | < **0.1** | stability score
- **k** — (TTI: k = killed / deprecated — don't optimize for it)
- **IT** — Input delay + Three phases (Input delay / Processing / Presentation = INP)

### Thresholds as a Number Line
```
FCP:   0ms ──────── 1800ms (good) ──── 3000ms (NI) ──── poor ────>
LCP:   0ms ──────────────── 2500ms (good) ──── 4000ms (NI) ─── poor ──>
INP:   0ms ──── 200ms (good) ───── 500ms (NI) ──── poor ──>
CLS:   0.0 ── 0.1 (good) ─── 0.25 (NI) ─── poor ──>
TBT:   0ms ────── 200ms (good) ────── 600ms (NI) ──── poor ──>
```

### Analogy
Think of a **restaurant experience**:
- **TTFB** = time until the menu arrives
- **FCP** = time until bread is served (something, anything)
- **LCP** = time until the main course arrives (what you actually came for)
- **INP** = how fast the waiter responds when you snap your fingers (every time, not just first time)
- **CLS** = the table not wobbling or being restacked while you're eating
- **TTI/TBT** = time until kitchen is no longer slammed (lab estimate, not real experience)

---

## ✅ 7. Why & How Summary

- **Why precise definitions matter:** Each metric implicates a different part of the stack — LCP is a loading and resource pipeline problem, INP is a main thread computation problem, CLS is a layout discipline problem; wrong diagnosis → wrong fix
- **How they are measured:** Browser APIs (`PerformanceObserver` with `largest-contentful-paint`, `event`, `layout-shift` entry types) collect raw data; `web-vitals/attribution` library enriches with phase breakdowns (resource load delay vs render delay for LCP; input delay vs processing vs presentation for INP)
- **How Hruday uses them:** At SAP each metric directly identified a specific fix: LCP → bundle blocking render, INP → synchronous Redux computation, CLS → unsized sidebar injection; addressing the root causes caused all three to move from 'poor'/'needs-improvement' to 'good' — Lighthouse 60→95

---

✅ Topic 166/486 complete → Continuing to Topic 167: Lighthouse CI — Automating Performance Budgets in CI/CD
