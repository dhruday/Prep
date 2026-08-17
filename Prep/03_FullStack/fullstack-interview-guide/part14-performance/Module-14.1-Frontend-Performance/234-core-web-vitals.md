# Core Web Vitals — LCP, CLS, INP, FCP
> Part 14 — Performance
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Core Web Vitals** are Google's three user-experience metrics that directly affect search ranking: **LCP** (Largest Contentful Paint) — how fast the main content loads; **INP** (Interaction to Next Paint) — how quickly the page responds to clicks and taps; **CLS** (Cumulative Layout Shift) — how much content jumps around unexpectedly while loading
- **LCP target: under 2.5 seconds** — the time from navigation start until the largest visible image or text block paints; most common cause of bad LCP: unoptimized hero images, render-blocking CSS/JS, slow server response (TTFB > 600ms); fix with: `<link rel="preload">` for hero image, CDN for fast TTFB, size the hero image correctly
- **INP target: under 200ms** — replaces FID (First Input Delay) in March 2024; measures the WORST interaction delay across the entire page visit (not just first); most common cause: long JavaScript tasks on the main thread blocking input processing; fix with: code splitting, web workers, `scheduler.yield()`, `requestIdleCallback` for non-urgent work
- **CLS target: under 0.1** — score is calculated as Impact Fraction × Distance Fraction per layout shift; most common causes: images without width/height attributes, dynamically injected banners, web fonts causing FOUT; fix with: always set `width` and `height` on images, use `font-display: optional` or `swap`, reserve space for ads/banners with CSS
- **FCP** (First Contentful Paint) — not a Core Web Vital but still important; the time until any content paints; bad FCP (> 1.8s) usually caused by render-blocking resources; fix with: `<link rel="preload">`, defer non-critical scripts, inline critical CSS
- ✅ **Hruday's anchor**: SAP Labs — Lighthouse score 60 → 95+; LCP improved from 4.2s to 1.3s by preloading hero image and moving to CDN-served assets; CLS reduced from 0.34 to 0.04 by fixing images without dimensions in product cards; SAP Excellence Award

---

## 1. One-Line Definition
Core Web Vitals are Google's three standardized user-experience metrics — LCP (loading), INP (interactivity), CLS (visual stability) — that measure the page experience a real user has, are collected from Chrome User Experience Report (CrUX), and directly influence Google Search ranking.

---

## 2. The Problem It Solves

Before Core Web Vitals, "performance" was a vague concept. Teams argued about whether to optimize Time to First Byte, DOMContentLoaded, or the Load event. None of these mapped directly to user experience. A page could have a fast Load event but feel slow because the hero image appeared 5 seconds in. A page could have fast DOMContentLoaded but trigger jarring layout shifts as fonts loaded.

Google solved this with three metrics that map to three distinct user-experience questions:

"Did the page load its main content fast?" → LCP. This is the question users ask in the first 2 seconds. If the hero image doesn't appear within 2.5 seconds, users assume the page is broken.

"Does the page respond to my touch?" → INP. This is the question users ask when they click a button and nothing happens for 500ms. Long JavaScript tasks on the main thread queue input events; the user-perceived delay is INP.

"Did the content jump around?" → CLS. This is frustration. The user is about to click a link and an ad loads above it, shifting the link down. They click the ad instead. CLS quantifies this.

The business case: Core Web Vitals are a ranking signal in Google Search. A page with poor vitals is outranked by competitors with equal content but better scores. At SAP, improving Lighthouse from 60 to 95 was partly a SEO strategy for the commercial portal pages.

---

## 3. How It Works Internally

### How Each Metric Is Calculated

```
LCP — Largest Contentful Paint:

  Browser tracks all "large content" paint events:
    - <img> elements
    - <video> poster images
    - Block-level elements with background-image
    - Block-level text nodes (including at the start)
  
  At each paint, it asks: "Is this larger than the previous LCP candidate?"
  LCP is finalized when the user first interacts (scroll, click, keypress)
  or when 2500ms passes with no larger content painted.
  
  Measurement:
  LCP = Time(largest content element paints) - Time(navigation start)
  
  LCP 0-2.5s    → ✅ Good
  LCP 2.5-4.0s  → ⚠️ Needs Improvement
  LCP > 4.0s    → ❌ Poor


CLS — Cumulative Layout Shift:

  Browser detects any element that moves unexpectedly
  (not caused by user interaction in the last 500ms).
  
  For each shift:
    Impact fraction = % of viewport the element occupied before + after
    Distance fraction = largest distance it moved ÷ viewport dimension
    Shift score = Impact fraction × Distance fraction
  
  CLS = sum of layout shift scores within 5-second "session windows"
  (largest window's score is used, to avoid penalizing long-lived SPA pages)
  
  CLS < 0.1   → ✅ Good
  CLS 0.1-0.25 → ⚠️ Needs Improvement
  CLS > 0.25  → ❌ Poor


INP — Interaction to Next Paint:

  Browser measures every user interaction (click, keypress, tap):
    Delay = time from interaction until browser's next paint after processing it
  
  INP = 98th percentile interaction delay across the entire page session
  (98th percentile = "the worst interaction, excluding outliers")
  
  INP < 200ms → ✅ Good
  INP 200-500ms → ⚠️ Needs Improvement
  INP > 500ms → ❌ Poor
```

### The LCP Waterfall

```
Navigation starts
       │
       ▼
  HTML response starts arriving
       │
       ▼
  Browser parses HTML, discovers resources
  ├── CSS → render-blocking (browser waits for CSS before painting)
  ├── JS → potentially render-blocking if <script> without defer/async
  └── Hero image discovered in HTML
            │
            ▼
       Image download starts
  (if NOT preloaded: starts AFTER CSS finishes — kills LCP)
  (if preloaded: starts IN PARALLEL with CSS — good LCP)
            │
            ▼
       Image decoded
            │
            ▼
       LCP ⏱️ — measured here

Preload: <link rel="preload" href="/hero.jpg" as="image" fetchpriority="high">
→ Browser fetches hero image immediately, before CSS finishes parsing
→ LCP is now: TTFB + image download time (not TTFB + CSS + image download)
```

---

## 4. The Code

### Wrong Way — Classic Performance Antipatterns

```html
<!-- ❌ WRONG — All the most common CWV killers in one page: -->

<!DOCTYPE html>
<html>
<head>
  <!-- ❌ Render-blocking CSS from external URL: delays first paint -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700" />
  <!-- ❌ Render-blocking scripts in <head>: nothing paints until this finishes -->
  <script src="/analytics.js"></script>
  <script src="/vendor-bundle.js"></script>

  <!-- ❌ No hero image preload: LCP image discovered late, queued after CSS -->
  <!-- No <link rel="preload"> -->
</head>
<body>
  <!-- ❌ Image with no dimensions: browser doesn't know to reserve space → CLS -->
  <img src="/hero.jpg" alt="Hero image" />

  <!-- ❌ Image with no dimensions below fold: still causes CLS when it loads -->
  <img src="/product.jpg" alt="Product" />

  <!-- ❌ Ad slot with no reserved height: ad loads late, shifts content below it → CLS -->
  <div id="ad-banner"></div>
  <p>This text jumps down when the ad loads above it</p>

  <!-- ❌ Heavy script at end of body, not deferred: still large main-thread task → INP -->
  <script src="/react-bundle-4mb.js"></script>
</body>
</html>
```

> **Why this fails:** LCP image is discovered late (after blocking CSS); images with no dimensions cause layout shifts (CLS 0.34+); blocking scripts delay interactivity; no preconnect to CDN means DNS lookup cost for every external resource.

### Right Way — All CWV Optimized

```html
<!-- ✅ RIGHT — Optimized for LCP, INP, CLS: -->
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- ✅ Preconnect to CDN and Google Fonts: DNS + TCP resolved before they're needed -->
  <link rel="preconnect" href="https://cdn.example.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <!-- ✅ Preload the LCP image with high fetchpriority: starts download immediately -->
  <link rel="preload" href="/hero.webp" as="image" fetchpriority="high" />

  <!-- ✅ Async non-critical CSS: does not block rendering -->
  <!-- Critical CSS is inlined in <style> below -->
  <link rel="preload" href="/styles.css" as="style" onload="this.rel='stylesheet'" />
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>

  <!-- ✅ Inline critical CSS: above-the-fold styles paint without waiting for external CSS -->
  <style>
    /* Critical: hero section, header, LCP element layout */
    body { margin: 0; font-family: -apple-system, sans-serif; }
    .hero { position: relative; min-height: 500px; background: #f5f5f5; }
    /* Reserve space for hero image → prevents initial CLS -->
    .hero-img { width: 100%; height: 500px; object-fit: cover; }
  </style>

  <!-- ✅ Fonts: font-display: swap prevents invisible text; optional prevents CLS from FOUT -->
  <style>
    @font-face {
      font-family: 'Roboto';
      src: url('/fonts/roboto-400.woff2') format('woff2');
      font-weight: 400;
      /* font-display: swap = show fallback immediately, swap to Roboto when ready (some CLS) */
      /* font-display: optional = use Roboto only if already cached (zero CLS) */
      font-display: optional;
    }
  </style>

  <!-- ✅ Defer non-critical scripts: parsed after HTML, run after DOM ready, no render-block -->
  <script src="/vendor-bundle.js" defer></script>
</head>

<body>
  <!-- ✅ LCP image: explicit width/height prevents CLS; fetchpriority="high" signals importance -->
  <section class="hero">
    <img
      src="/hero.webp"
      alt="Product hero"
      width="1440"
      height="500"
      fetchpriority="high"
      decoding="async"
    />
    <!-- ✅ decoding="async": image decoded off main thread — doesn't block rendering -->
  </section>

  <!-- ✅ All images: explicit width + height prevents CLS (browser reserves space) -->
  <img src="/product.jpg" alt="Product" width="300" height="200" loading="lazy" />
  <!-- ✅ loading="lazy": below-fold images load on demand — saves bandwidth, improves LCP -->

  <!-- ✅ Ad slot: reserved height prevents CLS when ad loads -->
  <div id="ad-banner" style="min-height: 90px; width: 100%;">
    <!-- Ad will fill this space — content below does NOT shift -->
  </div>

  <!-- ✅ Main app bundle: deferred (no render-block) + code-split (smaller = faster INP) -->
  <div id="root"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>
```

```typescript
// ✅ RIGHT — Breaking up long tasks to improve INP (React component)

// ❌ WRONG: Heavy synchronous computation on click blocks main thread → high INP
const BadFilterHandler = () => {
  const handleFilterChange = (newFilter: string) => {
    // ❌ Filtering 10,000 items synchronously: main thread blocked for 300ms
    // User click → 300ms blocked → next paint → INP = 300ms (POOR)
    const results = products.filter(p => heavyFilterLogic(p, newFilter));
    setFilteredProducts(results);
  };
  return <FilterBar onChange={handleFilterChange} />;
};

// ✅ RIGHT: Yield to browser between heavy operations to keep INP good
const GoodFilterHandler = () => {
  const handleFilterChange = async (newFilter: string) => {
    // ✅ Show immediate visual feedback first (button active state, spinner)
    setFilterState('loading');
    
    // ✅ scheduler.yield(): yields main thread back to browser for paints
    // Newer API (Chrome 129+) — polyfillable with scheduler.postTask()
    if ('scheduler' in window && 'yield' in (window as any).scheduler) {
      await (window as any).scheduler.yield();
    } else {
      // Fallback: setTimeout(0) yields to browser's task queue
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // ✅ Now run heavy computation (after paint has been given a chance)
    const results = products.filter(p => heavyFilterLogic(p, newFilter));
    setFilteredProducts(results);
    setFilterState('idle');
  };
  
  return <FilterBar onChange={handleFilterChange} />;
};

// ✅ RIGHT — useDeferredValue for React: keeps UI responsive during heavy renders
import { useDeferredValue, useMemo } from 'react';

const ProductList: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  // ✅ deferredQuery: React renders the previous searchQuery result first (keeps UI responsive)
  // then re-renders with the new query when the main thread is free
  const deferredQuery = useDeferredValue(searchQuery);
  
  const filteredProducts = useMemo(
    () => products.filter(p => p.name.includes(deferredQuery)),
    [deferredQuery]  // ← Only recomputes when deferredQuery changes (not the immediate input)
  );
  
  return (
    <ul style={{ opacity: searchQuery !== deferredQuery ? 0.7 : 1 }}>
      {/* ← Visual indicator that a stale result is showing while fresh result is computing */}
      {filteredProducts.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
};
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What are Core Web Vitals and which ones matter most?"

**Hruday's answer:**
> Core Web Vitals are Google's three user-experience metrics that measure loading performance, interactivity, and visual stability — and they're a ranking signal in Google Search. They matter most because they represent what users actually feel, not what developer-centric metrics like DOMContentLoaded measure.
>
> LCP is the most impactful for first impressions. It measures when the largest visible content — usually the hero image — becomes visible. Google's threshold is under 2.5 seconds. Poor LCP (over 4 seconds) causes users to abandon the page before it's usable. The most common cause is a large hero image that isn't preloaded, so it starts downloading only after render-blocking CSS finishes — which can add 600ms to 1.5 seconds of unnecessary delay.
>
> INP replaced FID in 2024. INP measures the worst interaction delay across the entire page session. Long JavaScript tasks on the main thread — heavy filter operations, large Redux reconciliations — block input processing. When a user clicks and nothing happens for 400ms, that's bad INP.
>
> CLS is about visual stability. Images without explicit dimensions, dynamically injected content, and web font loading can all cause content to jump. At SAP, our product card grid had images without width/height attributes. When they loaded asynchronously, every card's content shifted down. Our CLS was 0.34 — in the "Poor" range. Fixing it to always specify dimensions dropped CLS to 0.04.

---

### Q2 — SAP Experience Deep Dive
**Interviewer asks:** "Walk me through how you improved Lighthouse score from 60 to 95."

**Hruday's answer:**
> The Lighthouse 60 → 95 improvement at SAP took about 6 weeks and addressed problems across all three Core Web Vital categories.
>
> For LCP, the initial score was 4.2 seconds. The hero image was a 450KB JPEG discovered in HTML but not preloaded. It downloaded serially after render-blocking CSS — an extra 800ms delay on a 3G connection simulation. The fix was two things: first, a `<link rel="preload" fetchpriority="high">` tag so the image downloaded in parallel with CSS; second, converting to WebP format which reduced the image from 450KB to 125KB. LCP dropped to 1.3 seconds.
>
> For CLS, the initial score was 0.34. Two main causes: product card images without `width` and `height` attributes — all 24 cards shifted when they loaded; and a cookie banner injected via JavaScript after initial render that pushed all body content down. Fixed by adding dimensions to all `<img>` tags in the design system components, and pre-reserving space in the layout for the cookie banner.
>
> For INP (which was FID at that time — we updated during the migration), the main issue was a Redux state update on filter change that triggered a synchronous re-render of 200 product cards. The fix was introducing `useDeferredValue` for the filter state so React could render the previous results first and update in the background. Interaction delay dropped from 380ms to 90ms.
>
> Total result: Lighthouse Performance 60 → 95. Real user metrics via Sentry RUM confirmed the improvement matched the lab scores.

---

### Q3 — Trade-Off Question
**Interviewer asks:** "When would you accept a higher CLS score on a page?"

**Hruday's answer:**
> There are a few situations where some CLS is an acceptable trade-off.
>
> Progressive enhancement scenarios: if you're loading user-personalized content that can't be server-rendered or pre-fetched — like a "Based on your history" section — the first render shows a placeholder and the real content loads in. This will cause a layout shift. The alternative is showing nothing until the personalized data is ready, which hurts LCP and feels broken. A small, intentional shift with a smooth CSS transition is acceptable here.
>
> Authenticated experiences: for pages behind login, Google's CrUX data is less impactful (not crawled for ranking). CLS optimization is still good for user experience, but the SEO ranking pressure is lower.
>
> The key distinction is between shifts caused by NEW CONTENT appearing (somewhat acceptable if the user hasn't scrolled there yet) versus shifts that move content the user is actively looking at. The latter is always bad — especially a button that shifts just before click.
>
> At SAP, we decided that the cookie consent banner causing 0.05 CLS was acceptable for the authenticated admin portal, but not for the public-facing catalog pages where Google is indexing. So we fixed it on public pages and left a minor shift on admin pages.

---

### Q4 — System Design Angle
**Interviewer asks:** "You're building a high-traffic e-commerce product listing page. How do you ensure good Core Web Vitals at scale?"

**Hruday's answer:**
> I'd approach this with four layers.
>
> Server layer: ensure TTFB is under 600ms (Google's LCP component limit for TTFB). This means CDN edge caching for the product listing HTML, fast database queries for the product list (indexed, paginated), and a load balancer routing to the nearest data center. SSR or static generation for popular filter combinations (category pages) means the LCP image URL is in the HTML before the browser even starts processing.
>
> HTML/resource layer: `<link rel="preload" fetchpriority="high">` for the first visible grid image. All product card images have explicit `width` and `height`. The initial viewport images have `loading="eager"`, everything below uses `loading="lazy"`. Hero and first-fold images served as WebP with AVIF fallback via `<picture>` element.
>
> JavaScript layer: code-split so the product listing bundle is small. Heavy filter logic moved to a web worker — the main thread isn't blocked when users apply filters. `useDeferredValue` for filter state in React so the previous grid stays responsive while the new filtered grid renders. Product card list virtualized (react-window) once pagination delivers more than 50 items.
>
> Monitoring layer: Lighthouse CI in the PR pipeline with budget rules — fail the build if LCP regresses beyond 2.5s or CLS increases by 0.05. Real user monitoring via Sentry or Datadog Web Vitals to verify field data matches lab scores. CrUX data checked monthly to confirm ranking impact.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "LCP is Time to First Byte" | "LCP measures how fast the server responds" | LCP is the time until the largest visible CONTENT element paints — it includes TTFB + resource discovery + download + decode + paint; TTFB is one component of LCP (a slow TTFB > 600ms is a common LCP bottleneck) but they are not the same; improve TTFB via CDN and fast API responses, but also preload the LCP image so it doesn't wait behind CSS download time |
| "CLS is only caused by images" | "Fix CLS by adding dimensions to images" | Images without dimensions are the most common cause, but not the only one; web fonts cause CLS when FOUT (Flash of Unstyled Text) happens — text using fallback font reflows when web font loads; dynamically injected banners, ads, cookie notices push content; CSS animations that change layout properties (width, height, top) cause shifts; fix each differently: `font-display: optional` for fonts; reserved height containers for ads; avoid animating `height` — animate `transform` instead (doesn't cause layout) |
| "INP replaced FID with same concept" | "INP and FID both measure first interaction delay" | FID measured only the FIRST interaction on a page; INP measures the WORST interaction across the entire session (98th percentile); a page could have good FID (user's first click was fast) but poor INP (clicking a complex filter later was 600ms); INP is a much more comprehensive interactivity measure; a page optimized for FID may have poor INP if heavy interactions exist beyond the first one — requires profiling all interactions, not just first load |
| "Lighthouse score = Core Web Vitals score" | "My Lighthouse is 95, so my Core Web Vitals are good" | Lighthouse score is a lab measurement (throttled CPU, controlled network); Core Web Vitals (real CWV) come from the Chrome User Experience Report (CrUX) — real user data from Chrome browsers visiting your site; lab and field data frequently differ; a Lighthouse 95 with slow real users (due to a large React bundle on 3G) can still show "Poor" in Search Console; always check CrUX field data (Google Search Console → Core Web Vitals) alongside Lighthouse scores |

---

## 7. Hruday's Real Experience Hook
> "The SAP Lighthouse improvement story is the one I'm most proud of because it combined every dimension of performance — network, JavaScript, layout, and images — and the results were measurable both in lab scores and in real user data via Sentry RUM.
>
> The highest-impact single change was adding `<link rel="preload" fetchpriority="high">` to the hero image. It went from being discovered after 800ms of blocking CSS to starting download immediately on navigation. LCP improved by 1.4 seconds from that one line. The entire team was surprised that one HTML tag had more impact than any JavaScript optimization we'd done.
>
> The CLS work was more tedious — hunting down every `<img>` tag in the design system components without explicit dimensions — but the impact on the product catalog was immediate. Before: cards jumped when images loaded. After: cards rendered in place from the start because the browser had reserved the space. That's the kind of improvement users notice without being told about it."

---

## 8. Scale Evolution

**Small site (< 10k monthly users) →** Lighthouse CI in local dev; basic image dimensions; defer scripts; the defaults mostly work; check CrUX in Search Console once a month.

**Medium site (100k–1M monthly users) →** Lighthouse CI in PR pipeline with budget assertions; WebP/AVIF images via CDN image transformation; `<link rel="preload">` for critical assets; CLS monitoring with PerformanceObserver in prod; `useDeferredValue` / `useTransition` for React filter/search interactions.

**Large e-commerce (SAP scale, 10M+ users) →** Real User Monitoring (Sentry, Datadog RUM) with Web Vitals collected from real sessions; CrUX API integrated into internal dashboards; per-page-type performance budgets; CDN for HTML (ISR/SSG for top category pages); Lighthouse CI + CrUX field data both tracked as KPIs; engineering team owns specific CWV surfaces (listing team → LCP; product detail team → CLS; search team → INP); A/B test performance changes with RUM data before shipping.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment portal LCP directly affects checkout abandon rates; INP for payment action buttons (click → confirmation must feel instant); CLS in form layouts causing accidental mis-taps on payment methods is a real UX and trust problem; Google Search ranking for financial product pages | LCP optimization for payment flows; INP < 200ms for critical CTAs; CLS in dynamic form rendering |
| Swiggy / Meesho | LCP for restaurant/product listing pages is directly tied to order conversion; mobile-first audience on slower connections makes CWV critical; image optimization for food photos at scale; INP for add-to-cart button interactions on slow devices | Mobile CWV optimization depth; image optimization at catalog scale; INP for high-frequency tap interactions |
| Adobe / Microsoft | Creative Cloud and Microsoft 365 web apps: heavy JS bundles make INP the hardest metric; Adobe has published CWV case studies; Microsoft Teams web uses long task profiling; Adobe's image tools require special LCP handling for user-uploaded images | INP with large JS bundles; long task profiling; Web Workers for heavy processing |
| SAP Labs | Direct experience: Lighthouse 60 → 95 at SAP; LCP from 4.2s → 1.3s; CLS from 0.34 → 0.04; INP improvement via useDeferredValue; SAP Excellence Award; Sentry RUM for field validation; all metrics and techniques documented and taught to team | Real production story with all three vitals improved; mentored team on CWV; built Lighthouse CI gate in pipeline |

---

## 10. Related Topics — What to Study Next

- **Topic 235 — Code Splitting and Lazy Loading** — the primary tool for improving INP; large JavaScript bundles cause long tasks on the main thread that delay input processing; splitting by route and lazy-loading heavy components keeps the initial main thread clear for fast interactions
- **Topic 237 — Image Optimization** — the primary tool for improving LCP; WebP/AVIF formats, responsive images with `srcset`, `loading="lazy"` for below-fold images, explicit dimensions for CLS prevention — image optimization is the single highest-ROI frontend performance improvement
- **Topic 238 — Lighthouse CI in Pipeline** — how to automate CWV monitoring so regressions are caught before they reach production; the tooling that makes Core Web Vitals a continuous engineering discipline rather than a periodic audit
- **Topic 239 — Memoization** — the technique that prevents unnecessary React re-renders; directly improves INP by reducing the JavaScript work done on each interaction; `useMemo` for expensive computations, `React.memo` for pure render components, `useCallback` for stable function references passed to child components

---

*Part 14 · Core Web Vitals — LCP, CLS, INP, FCP · Full Stack Interview Guide · Hruday D · 2026*
