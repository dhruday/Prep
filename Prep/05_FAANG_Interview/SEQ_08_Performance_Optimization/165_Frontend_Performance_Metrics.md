# 165. Frontend Performance Metrics
**Phase:** Performance & Architecture | **Sequence:** SEQ 8 | **Company:** Microsoft, Adobe, Salesforce, Cisco

---

## 🎯 1. Interview Opening Answer

> What to say in the first 60 seconds.

"At SAP, I owned frontend performance end-to-end — we moved Lighthouse from 60 to 95, cut LCP from 4.2s to 2.3s, reduced INP from 400ms to 120ms, and achieved a 45% overall load time reduction. To get there systematically, I tracked six metric categories: loading (FCP, LCP, TTFB), interactivity (INP, FID, TBT), visual stability (CLS), resource efficiency (bundle size, request count), runtime health (long task count, main thread blocked ms), and user-perceived performance (time-to-content for each page section). Each metric has a specific threshold and a specific tool to measure it — you can't improve what you don't measure. I distinguish lab metrics from field metrics: Lighthouse gives you lab data reproducibly in CI, but only RUM via CrUX or Datadog gives you real-user reality at the 75th percentile, which is what Google uses for Core Web Vitals ranking."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What It Is & Why It Exists

Frontend performance metrics are quantified, time-indexed measurements of how fast a browser fetches, parses, renders, and responds to user interaction for a given page load. They exist because:

1. **Business impact is direct and measurable** — Google: every 100ms LCP improvement → ~1% conversion increase; Pinterest: 40% reduction in load time → 15% increase in organic traffic; Amazon: 100ms delay → 1% revenue loss
2. **Browser APIs expose precise events** — `PerformanceObserver`, `PerformanceTiming`, `PerformanceNavigationTiming`, `PerformanceResourceTiming` give millisecond-precision data
3. **Search ranking depends on them** — Google incorporates Core Web Vitals (LCP, INP, CLS) directly into Page Experience ranking signal since 2021

### Metric Taxonomy

```
Frontend Performance Metrics
├── Field Metrics (Real Users — CrUX, RUM)
│   ├── Core Web Vitals (Google ranking signal)
│   │   ├── LCP  — Largest Contentful Paint     (loading)
│   │   ├── INP  — Interaction to Next Paint     (interactivity) ← replaced FID March 2024
│   │   └── CLS  — Cumulative Layout Shift       (visual stability)
│   └── Diagnostic Metrics
│       ├── FCP  — First Contentful Paint
│       ├── TTFB — Time to First Byte
│       └── FID  — First Input Delay             (legacy, still in some dashboards)
│
├── Lab Metrics (Controlled Environment — Lighthouse, WebPageTest)
│   ├── TBT  — Total Blocking Time               (proxy for INP in lab)
│   ├── SI   — Speed Index                       (visual progress over time)
│   ├── TTI  — Time to Interactive               (deprecated in Lighthouse 10)
│   └── All CWV metrics also measurable in lab
│
├── Application Metrics
│   ├── Bundle size per route (js/css/images)
│   ├── Gzipped vs uncompressed sizes
│   ├── Request count & waterfall depth
│   ├── Cache hit rate (static + API)
│   └── Long task count (tasks > 50ms)
│
└── Runtime Metrics
    ├── Main thread blocked time (LoAF API — Long Animation Frames)
    ├── Memory usage (JS heap)
    ├── GPU frame time
    └── Layout / Style recalculation cost
```

### How Each Metric Is Computed

**LCP (Largest Contentful Paint)**
- Measures: render time of largest text block or image element visible in viewport
- Element candidates: `<img>`, `<image>` inside SVG, `<video>` poster, block-level element with background-image, block-level element with text
- Reported as: last LCP entry before the page becomes interactive (new candidate invalidates previous)
- Browser API:
```typescript
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const last = entries[entries.length - 1];
  console.log('LCP:', last.startTime, 'Element:', last.element);
}).observe({ type: 'largest-contentful-paint', buffered: true });
```
- Thresholds: **Good < 2.5s** | Needs Improvement 2.5–4.0s | Poor > 4.0s

**INP (Interaction to Next Paint)**
- Measures: latency from user interaction (click, tap, key press) to next visual frame painted in response
- Replaced FID March 2024 — FID measured only first interaction, INP measures ALL interactions
- Uses 98th percentile of all interactions per session
- Three phases: **Input Delay** (blocked by long tasks) + **Processing Time** (event handlers) + **Presentation Delay** (rendering pipeline)
- Browser API:
```typescript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.interactionId) {
      console.log('INP candidate:', entry.duration, entry.name);
    }
  }
}).observe({ type: 'event', durationThreshold: 16, buffered: true });
```
- Thresholds: **Good < 200ms** | Needs Improvement 200–500ms | Poor > 500ms

**CLS (Cumulative Layout Shift)**
- Measures: sum of all unexpected layout shift scores during page life
- Shift score = impact fraction × distance fraction
- Impact fraction: % of viewport area affected; Distance fraction: % of viewport moved
- NOT counted: shifts within 500ms of user input
- Browser API:
```typescript
new PerformanceObserver((list) => {
  let cls = 0;
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) cls += entry.value;
  }
  console.log('CLS:', cls);
}).observe({ type: 'layout-shift', buffered: true });
```
- Thresholds: **Good < 0.1** | Needs Improvement 0.1–0.25 | Poor > 0.25

**FCP (First Contentful Paint)**
- Measures: time from navigation start to first DOM content painted (text, image, SVG)
- Thresholds: **Good < 1.8s** | Needs Improvement 1.8–3.0s | Poor > 3.0s

**TTFB (Time to First Byte)**
- Measures: time from navigation start to first byte of response received
- Includes DNS, TCP, TLS handshake, server processing, first byte
- Thresholds: **Good < 800ms** | Needs Improvement 800ms–1.8s | Poor > 1.8s

**TBT (Total Blocking Time)**
- Measures: sum of "blocking portion" of all long tasks between FCP and TTI
- Blocking portion = time a task runs beyond 50ms (threshold for "blocking")
- Strong lab proxy for INP (Lighthouse uses TBT since INP requires real user events)
- Thresholds: **Good < 200ms** | Needs Improvement 200–600ms | Poor > 600ms

### The PerformanceNavigationTiming API

```typescript
// Full navigation timing breakdown
const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];

const metrics = {
  // Network
  dns:            nav.domainLookupEnd - nav.domainLookupStart,
  tcp:            nav.connectEnd - nav.connectStart,
  tls:            nav.secureConnectionStart > 0
                    ? nav.connectEnd - nav.secureConnectionStart
                    : 0,
  ttfb:           nav.responseStart - nav.requestStart,
  
  // Document
  responseTime:   nav.responseEnd - nav.responseStart,
  domParsing:     nav.domInteractive - nav.responseEnd,
  domContentLoad: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
  
  // Full page
  loadEvent:      nav.loadEventEnd - nav.loadEventStart,
  totalTime:      nav.loadEventEnd - nav.startTime,
};
```

### The web-vitals Library (Google — Production Standard)

```typescript
import { onLCP, onINP, onCLS, onFCP, onTTFB } from 'web-vitals';

// Report each metric to your analytics
function sendToAnalytics({ name, value, rating, id }: Metric) {
  fetch('/analytics', {
    method: 'POST',
    body: JSON.stringify({ metric: name, value, rating, id }),
    keepalive: true, // ensures delivery even on page unload
  });
}

onLCP(sendToAnalytics);
onINP(sendToAnalytics);
onCLS(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Architecture & Component Boundaries

```
Metric Collection Architecture
─────────────────────────────────────────────────
Browser APIs (PerformanceObserver, PerformanceTiming)
    ↓
web-vitals library (normalizes + enriches)
    ↓
RUM Collector (custom endpoint or Datadog, Sentry, SpeedCurve)
    ↓
Time-series DB (percentile aggregation: p50, p75, p95, p99)
    ↓
Dashboard (CrUX for Google ranking, internal for ops)
    ↓
Alerts (p75 LCP > 2.5s → PagerDuty)
─────────────────────────────────────────────────
Lab path:
Developer → Lighthouse / WebPageTest → CI pipeline assertion
→ PR blocked if budget exceeded
```

### The 75th Percentile Rule

Google assesses Core Web Vitals at the **75th percentile** of page loads across mobile and desktop. This means:
- If 75% of your users see LCP < 2.5s, you pass
- Optimizing for the median is NOT enough — you must also fix the long tail
- P75 is more actionable than P99 (P99 is often noise from slow network edges)

### Long Animation Frames API (LoAF) — 2024 Addition

Replacement for Long Tasks API — captures full rendering + interaction context:
```typescript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // entry.blockingDuration = ms dominated by scripts + rendering
    // entry.renderStart / styleAndLayoutStart available
    console.log('Long animation frame:', entry.duration, 'blocking:', entry.blockingDuration);
    for (const script of entry.scripts) {
      console.log('Offending script:', script.sourceURL, script.duration);
    }
  }
}).observe({ type: 'long-animation-frame', buffered: true });
```
LoAF pinpoints exactly which script (source URL + line) caused a long frame — far more actionable than Long Tasks.

### Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|---|---|---|
| Optimizing for Lighthouse score alone | Lab scores can diverge from field CWV by 100%+ | Instrument RUM, compare Lighthouse to CrUX |
| Measuring median instead of P75 | Google uses P75; median hides the long tail | Aggregate at P75 for CWV decisions |
| Ignoring mobile metrics | Mobile P75 is often 3–4× worse than desktop | Set mobile-specific budgets |
| Measuring TTI instead of INP | TTI is deprecated; INP reflects real interaction lag | Migrate dashboards to INP |
| Conflating FCP with LCP | FCP fires on any content; LCP is the meaningful content | Treat them independently |
| Not attributing LCP element | LCP drops after deploy — no idea what changed | Log `entry.element.tagName` in RUM |

---

## 🌍 3. Real-World Examples

### SAP Labs (Hruday's Direct Experience)
The SAP BI Launchpad started at Lighthouse Performance 60 — a lab score. But the first insight was that Lighthouse didn't tell us *why*. I instrumented `web-vitals` in production and found:
- **LCP 4.2s** — caused by the main content area waiting for a 380KB uncompressed JS bundle before first render. The LCP element was a `<div>` with dynamically injected text, not even an image.
- **INP 400ms** — filter panel click triggered a Redux dispatch that synchronously recomputed 1,200-row table state in the main thread. No debounce, no `useTransition`.
- **CLS 0.19** — analytics sidebar injected 60px above the main table after data loaded. No reserved space.

Each metric pointed at a specific fix. After 6 months: LCP 2.3s, INP 120ms, CLS 0.04, Lighthouse 95. The score improvement was the *result* of fixing real metric problems — not the goal in itself.

### Microsoft (Scale Context)
Microsoft Teams web client tracks INP as a reliability SLO — any deployment that increases P75 INP by more than 50ms on the message compose panel triggers an automatic rollback. They collect ~500M interaction events per day via the web-vitals library batched into Azure Monitor. Metric thresholds differ by surface: real-time chat has tighter INP budget (< 100ms target) than settings pages (< 200ms).

### Adobe (Media-Heavy Context)
Adobe Creative Cloud web has LCP dominated by preview thumbnails (images). An aggressive `fetchpriority="high"` + `preload` strategy on the first-viewport thumbnail alone dropped LCP by 800ms. They also discovered a CLS cliff: lazy-loaded thumbnails with no `width`/`height` attributes caused CLS > 0.25 in mobile. Setting explicit `aspect-ratio` via CSS resolved it.

### Salesforce (Enterprise CRM)
Salesforce Lightning Experience monitors TTFB at the 95th percentile in Hyperforce regions. High P95 TTFB (> 2s) in the APAC region exposed that their CDN cache was bypassed for authenticated requests. Moving session token validation to edge workers (Cloudflare Workers) cut APAC P95 TTFB from 2.1s to 380ms.

### Cisco (Dashboard Context)
Cisco Webex network monitoring dashboards update 500+ widgets every 5 seconds. CLS became critical — each data refresh caused layout recalculation across 50+ chart containers. Solution: `contain: layout style` CSS on each chart container prevented layout bubbling, cutting CLS from 0.22 to 0.01.

---

## 💼 4. Interview Execution

### Sample Answer (2 minutes)

> "I categorize performance metrics into three tiers: **user-experience metrics** (LCP, INP, CLS — these are Google's Core Web Vitals and directly affect search ranking), **diagnostic metrics** (FCP, TTFB, TBT — they explain *why* CWV metrics are poor), and **engineering metrics** (bundle size, long task count, main thread blocking time — these are what developers actually tune). At SAP, I saw Lighthouse scores without RUM data and learned the hard way they can diverge significantly. The browser's `web-vitals` library is the production standard — it measures at the 75th percentile, same as Google CrUX. After instrumenting it, I found our LCP element was a dynamically injected div waiting on a 380KB bundle, our INP was a synchronous Redux computation, and our CLS was an analytics sidebar with no reserved height. Each metric told me exactly what to fix. Result: LCP 4.2s → 2.3s, INP 400ms → 120ms, Lighthouse 60 → 95."

### Follow-Up Q&A

**Q: Why did Google replace FID with INP?**
A: FID measured only the first interaction, and only input delay (not processing time or presentation delay). A page could have excellent FID but terrible interactivity on all subsequent clicks. INP measures the 98th percentile of ALL interactions, captures the full three phases (input delay + processing + presentation), and is therefore a much stronger signal of true interactivity quality.

**Q: How does CLS scoring work — can a single shift cause a poor score?**
A: CLS is additive — it accumulates throughout the page lifecycle. Score = sum of (impact fraction × distance fraction) for all unexpected shifts. A shift of 50% viewport area moving 30% of viewport height = 0.50 × 0.30 = 0.15, which alone crosses into "Needs Improvement." Late-injecting ads, dynamic content without reserved space, and web fonts swapping are the most common causes. Shifts within 500ms of user input are excluded (expected responses to gestures).

**Q: My Lighthouse score is 90 but real users report the page feels slow. Why?**
A: Three main gaps: (1) Lighthouse runs on simulated throttled 4G + mid-tier CPU; real users may be on faster *or* slower conditions. (2) Lighthouse measures a cold load; real users may experience second-load scenarios where memory is pre-occupied. (3) Lighthouse lab metrics (especially TBT) are proxies — they don't capture real INP. Check CrUX data in PageSpeed Insights for field data at the 75th percentile.

**Q: What is Total Blocking Time and why does Lighthouse emphasize it?**
A: TBT = sum of the "blocking portion" of long tasks (time over 50ms) between FCP and TTI. It's a lab proxy for INP because real interaction events can't be simulated in lab conditions. Long tasks block the main thread, preventing response to user input. TBT doesn't map 1:1 to INP but improves correlate highly — reducing TBT consistently improves INP in field data.

### Metric Comparison Table

| Metric | Measures | Tool | Threshold (Good) | Phase |
|---|---|---|---|---|
| TTFB | Server responsiveness | Chrome DevTools / Lighthouse | < 800ms | Network |
| FCP | First visual content | Lighthouse / web-vitals | < 1.8s | Loading |
| LCP | Main content visible | CrUX / web-vitals | < 2.5s | Loading |
| TBT | Main thread blocking | Lighthouse (lab only) | < 200ms | Interactivity |
| INP | Interaction latency | CrUX / web-vitals | < 200ms | Interactivity |
| CLS | Visual stability | CrUX / web-vitals | < 0.1 | Stability |
| SI | Visual progress rate | WebPageTest | < 3.4s | Loading |

---

## 💻 5. Code Example (TypeScript)

```typescript
// production-ready performance monitoring module
import { onLCP, onINP, onCLS, onFCP, onTTFB, Metric } from 'web-vitals';

interface PerformanceReport {
  metric: string;
  value: number;        // raw ms or score
  rating: 'good' | 'needs-improvement' | 'poor';
  id: string;           // unique per page session
  navigationType: string;
  attribution?: Record<string, unknown>;
}

class PerformanceMonitor {
  private queue: PerformanceReport[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private endpoint: string) {
    this.initCoreWebVitals();
    this.initLongAnimationFrames();
    this.initNavigationTiming();
    // Flush on page exit
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush(true);
    });
  }

  private send(metric: Metric): void {
    this.queue.push({
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
    });
    // Batch flush every 5s to avoid per-metric requests
    if (!this.flushTimer) {
      this.flushTimer = setTimeout(() => this.flush(), 5000);
    }
  }

  private flush(urgent = false): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.queue.length === 0) return;
    const payload = [...this.queue];
    this.queue = [];

    // Use sendBeacon for guaranteed delivery on page unload
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (urgent && navigator.sendBeacon) {
      navigator.sendBeacon(this.endpoint, blob);
    } else {
      fetch(this.endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      }).catch(() => {/* non-critical, best effort */});
    }
  }

  private initCoreWebVitals(): void {
    onLCP((m) => this.send(m), { reportAllChanges: false });
    onINP((m) => this.send(m), { reportAllChanges: false });
    onCLS((m) => this.send(m), { reportAllChanges: false });
    onFCP((m) => this.send(m));
    onTTFB((m) => this.send(m));
  }

  private initLongAnimationFrames(): void {
    if (!PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) return;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const loaf = entry as PerformanceLongAnimationFrameTiming;
        if (loaf.blockingDuration > 50) {
          // Report: which script caused the long frame
          const topScript = loaf.scripts?.[0];
          this.queue.push({
            metric: 'LoAF',
            value: loaf.blockingDuration,
            rating: loaf.blockingDuration > 200 ? 'poor' : 'needs-improvement',
            id: `loaf-${Date.now()}`,
            navigationType: 'navigate',
            attribution: {
              sourceURL: topScript?.sourceURL,
              invokerType: topScript?.invokerType,
              duration: topScript?.duration,
            },
          });
        }
      }
    }).observe({ type: 'long-animation-frame', buffered: true });
  }

  private initNavigationTiming(): void {
    // Delay until fully loaded
    window.addEventListener('load', () => {
      requestIdleCallback(() => {
        const [nav] = performance.getEntriesByType('navigation') as
          PerformanceNavigationTiming[];
        if (!nav) return;
        const ttfb = nav.responseStart - nav.requestStart;
        this.queue.push({
          metric: 'TTFB_detailed',
          value: ttfb,
          rating: ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor',
          id: `nav-${Date.now()}`,
          navigationType: nav.type,
          attribution: {
            dns: nav.domainLookupEnd - nav.domainLookupStart,
            tcp: nav.connectEnd - nav.connectStart,
            tls: nav.secureConnectionStart > 0
              ? nav.connectEnd - nav.secureConnectionStart : 0,
            serverTime: nav.responseStart - nav.requestStart,
          },
        });
      });
    });
  }
}

// Initialize once at app entry point
export const perfMonitor = new PerformanceMonitor('/api/metrics');
```

```typescript
// CI performance budget assertion (used in Lighthouse CI config)
// lighthouserc.js
module.exports = {
  ci: {
    collect: { numberOfRuns: 3 },
    assert: {
      assertions: {
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time':      ['error', { maxNumericValue: 200 }],
        'cumulative-layout-shift':  ['error', { maxNumericValue: 0.1 }],
        'first-contentful-paint':   ['warn',  { maxNumericValue: 1800 }],
        'interactive':              ['warn',  { maxNumericValue: 3800 }],
        'uses-optimized-images':    ['warn',  { minScore: 0.9 }],
        'unused-javascript':        ['warn',  { maxNumericValue: 50000 }], // bytes
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
```

---

## 🧠 6. Memory Aid

### Mnemonic: **"LIFT-CRS"**
- **L** — LCP (Largest Contentful Paint) | loading | < 2.5s
- **I** — INP (Interaction to Next Paint) | interactivity | < 200ms 
- **F** — FCP (First Contentful Paint) | loading start | < 1.8s
- **T** — TTFB (Time to First Byte) | network | < 800ms
- **C** — CLS (Cumulative Layout Shift) | stability | < 0.1
- **R** — RUM vs Lab — both required; P75 is the anchor
- **S** — Score ≠ Reality — Lighthouse score is lab proxy, field data wins

### Analogy
Think of performance metrics like a **hospital vital signs monitor**: pulse (INP = responsiveness), blood pressure (LCP = delivery pressure), temperature (TTFB = server health), and stability (CLS = patient not moving during examination). A doctor looks at all vitals together — optimizing one in isolation while ignoring others gives false confidence.

---

## ✅ 7. Why & How Summary

- **Why it matters:** Core Web Vitals directly affect Google search ranking and have proven business impact (100ms LCP improvement ≈ 1% conversion lift); without structured metric tracking you cannot locate what to fix or prove the improvement
- **How it works:** Browser PerformanceObserver APIs expose timing events; `web-vitals` library normalizes them to Google's exact CrUX methodology; RUM collection aggregates at P75 for real-user truth while Lighthouse CI catches regressions before deployment
- **How Hruday used it:** Instrumented `web-vitals` in SAP BI Launchpad production — metrics pointed directly at a 380KB blocking bundle (LCP), synchronous Redux computation (INP), and an unsized analytics sidebar (CLS) — fixing those three root causes drove Lighthouse 60→95 and 45% load time reduction

---

✅ Topic 165/486 complete → Continuing to Topic 166: FCP, LCP, CLS, TTI, INP — Precise Definitions and Targets
