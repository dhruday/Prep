# Critical Rendering Path
> Part 12 — Frontend Architecture
> Full Stack Interview Guide · Hruday D · 2026

---

## ⚡ 60-Second Revision Card
> Read this the night before an interview. Nothing else needed.

- **Critical Rendering Path (CRP)**: the sequence of steps the browser performs to convert HTML, CSS, and JavaScript bytes into pixels on screen — HTML parsing → DOM construction → CSSOM construction → Render Tree → Layout → Paint → Composite; optimising CRP is the foundation of all performance work
- **Render-blocking resources**: CSS is render-blocking by default — the browser won't render ANYTHING until ALL CSS in `<head>` is downloaded and parsed (CSSOM must be complete for layout); JavaScript is also render-blocking by default if in `<head>` without `async`/`defer` — it pauses HTML parsing when encountered
- **`async` vs `defer`**: `async` — script downloads in parallel, executes immediately when downloaded (may interrupt parsing mid-page); `defer` — script downloads in parallel, executes AFTER HTML parsing is complete, in order; use `defer` for scripts that need the full DOM; use `async` for independent analytics-type scripts
- **First Contentful Paint (FCP)**: first pixel of ANY content on screen; determined by when the critical CSS and HTML are processed; optimise by inlining critical CSS, reducing render-blocking CSS files
- **Largest Contentful Paint (LCP)**: the time when the main content (largest image or text block) is visible; Google's primary quality signal; optimise the LCP element directly — preload its resource, avoid render-blocking delays before it
- **Eliminate render-blocking**: move non-critical CSS to async loading (`<link rel="stylesheet" media="print" onload="this.media='all'">`), inline critical CSS in `<style>` tags, use `defer` for all scripts
- ✅ **Hruday's anchor**: improved Lighthouse score from 60 → 95+ at SAP Labs — CRP optimisation was central to that work

---

## 1. One-Line Definition
The critical rendering path is the sequence of steps the browser follows to transform raw bytes of HTML, CSS, and JavaScript into rendered pixels — and understanding each step reveals exactly where performance time is lost and how to get it back.

---

## 2. The Problem It Solves

A user types a URL and presses Enter. The browser fetches the HTML file. The HTML contains `<link>` tags to five CSS files and three `<script>` tags in the `<head>`. The browser must download and process all of those before it can show the user anything — even if the CSS files are for a footer the user won't scroll to for 10 minutes, and the scripts are third-party analytics.

This is the render-blocking problem. The browser waits because it CAN'T render safely without all CSS (lay out incorrectly, then reflow is expensive) and CAN'T continue parsing HTML when synchronous JavaScript runs (the script might modify the DOM it's about to parse — `document.write`, `insertBefore`).

The result: a user sees a white blank screen for 3-4 seconds on a slow mobile connection — all because resources that aren't needed for the first visible screen are blocking rendering.

Understanding the critical rendering path is understanding WHY the Lighthouse score is low, and therefore knowing exactly what to fix. At SAP, the audit revealed that three below-the-fold CSS files were loaded in `<head>` with no `media` attribute, blocking the initial render by ~800ms. Inlining above-the-fold CSS and deferring the rest was the single change that moved FCP from 4.2s to 1.8s.

---

## 3. How It Works Internally

### The Full Rendering Pipeline

```
Browser receives bytes from network for https://app.com

Step 1 — HTML Parsing → DOM (Document Object Model):
  Bytes → Characters → Tokens → Nodes → DOM Tree
  
  <html>
    <head><link href="styles.css"></head>
    <body>
      <div id="hero">
        <h1>Big Heading</h1>
        <img src="hero.jpg">
    ↓
  DOM Tree:
    Document
    └── html
        ├── head
        │   └── link [rel=stylesheet, href=styles.css]
        └── body
            └── div#hero
                ├── h1 → TextNode: "Big Heading"
                └── img [src=hero.jpg]

  ⚠️ Hits the <link> tag → pauses to fetch styles.css
     (CSSOM MUST be complete before rendering continues)

Step 2 — CSS Parsing → CSSOM (CSS Object Model):
  Cascades all CSS rules → computes final styles per selector
  Attached to DOM nodes (not yet visible — still building data structures)
  
  ⚠️ JavaScript in <head>: CSSOM must be complete BEFORE JS executes
     (JS might read computed styles — getComputedStyle() — so CSS
      must be resolved first; JS in <head> waits for CSS then runs)

Step 3 — Render Tree construction:
  DOM + CSSOM → Render Tree
  Excludes invisible nodes: <head>, display:none elements
  Includes only what will be painted
  
  Each node has: content + computed styles (font, colour, width)

Step 4 — Layout (Reflow):
  Computes exact position and size of every Render Tree node
  Given viewport width, calculates where each box goes
  Expensive: layout of one element can trigger reflow of siblings/ancestors

Step 5 — Paint:
  Renders pixels on the screen for text, colours, borders, images
  Some properties trigger their own layer: opacity, transform, will-change

Step 6 — Compositing:
  Layers sent to GPU compositor
  GPU assembles layers into final screen image
  Animations using transform/opacity are GPU-composited — don't trigger Layout/Paint
  (This is why transform animations are smooth; margin animations are not)
```

### Render-Blocking Explained

```
Timeline for page with render-blocking CSS and JS:

0ms    Browser receives first bytes of HTML
50ms   Parses HTML, encounters <link rel="stylesheet" href="main.css">
       ↳ STOPS HTML parsing, fires request to download main.css
50ms   Parses HTML, encounters <link rel="stylesheet" href="vendor.css">
       ↳ Fires second request
50ms   Parses HTML, encounters <script src="analytics.js"> (no async/defer)
       ↳ Must wait for CSSOM to complete, then STOPS HTML parsing, downloads script

  300ms  main.css downloaded ✓
  450ms  vendor.css downloaded ✓
  CSSOM complete at 450ms
  
  500ms  analytics.js downloaded ✓, executes
    HTML parsing RESUMES after JS finishes executing
  
  520ms  Rest of HTML parsed, DOM complete
  520ms  Render Tree built
  530ms  Layout
  540ms  Paint → FIRST PIXEL ON SCREEN

Total render-blocking time: 490ms where user saw nothing
(Even if the page content was ready in the HTML!)

Optimised version (inline critical CSS, defer scripts):
0ms    Browser receives HTML + inlined critical CSS (in <style> tag)
       → Immediately starts building CSSOM from inline styles
50ms   Parses <link rel="stylesheet" href="non-critical.css" media="print">
       → Not render-blocking (print media doesn't affect screen render)
50ms   Parses <script src="analytics.js" defer>
       → Not blocking: browser downloads in parallel, runs it after parse

100ms  DOM + CSSOM (from inline critical CSS) complete
110ms  Render Tree, Layout, Paint → FIRST PIXEL ON SCREEN
420ms  (analytics.js runs in background after page paint — doesn't delay user)

Improvement: 540ms → 110ms first paint   (without any network speed change)
```

---

## 4. The Code

### Wrong Way — Render-Blocking Resource Loading
```html
<!-- ❌ WRONG — classic render-blocking HTML head setup -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Dashboard</title>
  
  <!-- ❌ All CSS is render-blocking — browser loads ALL before first paint -->
  <link rel="stylesheet" href="reset.css">           <!-- 20KB -->
  <link rel="stylesheet" href="typography.css">      <!-- 15KB -->
  <link rel="stylesheet" href="components.css">      <!-- 80KB -->
  <link rel="stylesheet" href="dashboard-page.css">  <!-- 35KB -->
  <!-- Total: 150KB of CSS fully parsed before ANYTHING renders -->
  
  <!-- ❌ Synchronous script in <head> — blocks HTML parsing -->
  <!-- Must wait for ALL CSS above (CSSOM) + download this script -->
  <script src="https://analytics.vendor.com/track.js"></script>
  
  <!-- ❌ Another blocking script — sequential download -->
  <script src="/app/utils.js"></script>
</head>
<body>
  <!-- User sees NOTHING until all of the above finishes -->
  <div id="app">Loading...</div>
  
  <!-- ❌ App bundle at bottom (correct position) but app.js is 800KB -->
  <script src="/app/main.js"></script>
</body>
</html>
```

> **Why this fails:** 150KB of CSS must be fully downloaded and parsed before the browser renders a single pixel. The `analytics.js` script blocks parsing of the body HTML. A user on a 4G connection (50ms RTT, 5Mbps) sees a blank white screen for 800ms+ while waiting for these resources, even though the actual content they came to see is in the HTML right below.

### Right Way — Optimised Critical Rendering Path
```html
<!-- ✅ RIGHT — critical path optimised -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Dashboard</title>
  
  <!-- ✅ Preconnect to third-party origins used by LCP element -->
  <!-- Establishes DNS + TCP + TLS connection early before the resource is needed -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://cdn.myapp.com" crossorigin>
  
  <!-- ✅ Preload the LCP resource — highest priority early signal to browser -->
  <!-- The hero image IS the LCP element — tell browser to fetch it immediately -->
  <link rel="preload" as="image" href="/images/hero-banner.webp" 
        imagesrcset="/images/hero-banner-480.webp 480w, /images/hero-banner.webp 800w"
        imagesizes="100vw">
  
  <!-- ✅ Preload fonts (browsers discover them late — CSS must be parsed first normally) -->
  <link rel="preload" as="font" type="font/woff2" href="/fonts/inter-regular.woff2" crossorigin>
  
  <!-- ✅ CRITICAL CSS INLINED — above-the-fold styles directly in <style> tag -->
  <!-- No network request needed; CSSOM builds from this immediately -->
  <!-- Content: only hero section, header, initial loading state — NOT the full stylesheet -->
  <style>
    /* Critical: base layout, hero, header, nav — what user sees FIRST */
    *,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #111; }
    .header { height: 64px; background: #001F60; display: flex; align-items: center; }
    .hero { width: 100%; aspect-ratio: 16/5; background: #f0f4ff; }
    .hero img { width: 100%; height: 100%; object-fit: cover; }
    /* ~3-4KB of actual above-the-fold CSS */
  </style>
  
  <!-- ✅ Non-critical CSS loaded asynchronously — does NOT block rendering -->
  <!-- Trick: media="print" makes it non-render-blocking; onload switches to "all" -->
  <link rel="stylesheet" href="/css/full-app.css" 
        media="print" 
        onload="this.media='all'">
  <!-- Fallback for browsers without JS: -->
  <noscript>
    <link rel="stylesheet" href="/css/full-app.css">
  </noscript>
  
  <!-- ✅ Third-party analytics — async so it doesn't block, at all -->
  <script async src="https://analytics.vendor.com/track.js"></script>
  
  <!-- ✅ Internal utilities that are needed before body scripts -->
  <!-- defer: downloads in parallel, runs AFTER HTML is fully parsed, in order -->
  <script defer src="/js/polyfills.js"></script>
</head>
<body>
  <!-- Content is now rendered WITH the inlined critical CSS immediately -->
  <header class="header">...</header>
  <div class="hero">
    <!-- fetchpriority="high" — signals browser to prioritize this resource -->
    <!-- loading="eager" — don't lazy-load (this IS the LCP element, load immediately) -->
    <img src="/images/hero-banner.webp" 
         alt="Payment Dashboard Overview"
         fetchpriority="high"
         loading="eager"
         width="1200" height="375">
    <!-- width+height prevent Cumulative Layout Shift (CLS) — browser knows the space to reserve -->
  </div>
  
  <!-- App bundle at end of body — parses AFTER HTML; React hydrates after paint -->
  <!-- type="module" is deferred by default (like defer attribute) -->
  <script type="module" src="/js/app.js"></script>
</body>
</html>
```

```javascript
// JavaScript: avoid forced synchronous reflow patterns

// ❌ WRONG — Layout Thrashing: read → write → read → write in a loop
// Forces browser to recalculate layout on EVERY iteration
function resizeAllBoxes(boxes) {
  for (const box of boxes) {
    const currentWidth = box.offsetWidth;      // READ: triggers layout recalculation
    box.style.width = (currentWidth * 1.1) + 'px'; // WRITE: invalidates layout
  }
  // 100 boxes = 100 forced synchronous reflows = main thread freeze
}

// ✅ RIGHT — Batch reads then batch writes
function resizeAllBoxesOptimised(boxes) {
  // Phase 1: read ALL values first (one layout calculation covers all reads)
  const widths = Array.from(boxes, box => box.offsetWidth);
  
  // Phase 2: write ALL values (browser defers and batches layout to end of frame)
  boxes.forEach((box, i) => {
    box.style.width = (widths[i] * 1.1) + 'px';
  });
}

// ✅ EVEN BETTER — use CSS transforms instead of layout-triggering properties
// transform/opacity are GPU-composited — no Layout or Paint step triggered
function animateBox(element) {
  // ✅ GPU-composited, smooth 60fps
  element.style.transform = 'translateX(100px)';
  element.style.opacity = '0.5';
  
  // ❌ AVOID these for animations (both trigger Layout):
  // element.style.left = '100px';     // triggers Layout
  // element.style.width = '200px';    // triggers Layout
  // element.style.marginTop = '20px'; // triggers Layout
}
```

---

## 5. Interview Questions & Model Answers

### Q1 — Warm Up
**Interviewer asks:** "What is the critical rendering path and why does it matter?"

**Hruday's answer:**
> The critical rendering path is the sequence of steps the browser takes to go from receiving raw HTML/CSS/JavaScript bytes to painting the first pixels on screen. The steps are: parse HTML into a DOM, download and parse CSS into a CSSOM, combine DOM and CSSOM into a Render Tree, run Layout to calculate element positions and sizes, then Paint to draw pixels.
>
> It matters because every step in the chain is an opportunity for delay. CSS is render-blocking by default — the browser won't paint anything until CSS is fully downloaded and parsed. JavaScript in `<head>` blocks HTML parsing. Images that are the main content (the LCP element) start downloading only after the browser parses down to the `<img>` tag — which may be several seconds in.
>
> When I improved our Lighthouse score from 60 to 95+ at SAP, the critical rendering path was the primary diagnostic tool. The Lighthouse report shows the render-blocking timeline — which resources delayed the first paint by how many milliseconds. We identified three CSS files in `<head>` that weren't needed for the initial viewport. Inlining the critical CSS and deferring those three files moved FCP from 4.2 seconds to 1.8 seconds. That was the biggest single gain in the entire optimisation project.

---

### Q2 — Deep Dive
**Interviewer asks:** "Explain the difference between async and defer for script loading."

**Hruday's answer:**
> Both `async` and `defer` tell the browser to download the script in parallel with HTML parsing — neither blocks the HTML parser during download. The difference is when the script EXECUTES.
>
> `async`: executes immediately when the download finishes, regardless of where HTML parsing is at that moment. If the script takes 200ms to download and HTML parsing is halfway through the body, it pauses parsing and runs the script immediately. Order is not guaranteed — if you have two async scripts, whichever downloads first runs first. Use `async` for completely independent scripts that don't depend on the DOM or each other — third-party analytics, chat widgets.
>
> `defer`: executes after HTML parsing is COMPLETE, in the order they appear in the HTML. All deferred scripts wait until the entire DOM is built, then run in sequence. This is predictable — the DOM is always fully available when a deferred script runs. Use `defer` for your application's own scripts, utilities, and anything that needs to interact with the DOM.
>
> The third option: `type="module"`. Scripts with this attribute are deferred by default — they behave like `defer`. No extra attribute needed.
>
> My rule: analytics → `async`. Application scripts → `defer` or `type="module"`. Anything in `<head>` without either attribute → fix it. At SAP the audit found two scripts in `<head>` without `async` or `defer`, adding 340ms to the critical path.

---

### Q3 — Trade-Off
**Interviewer asks:** "When would you use `<link rel="preload">` vs `<link rel="prefetch">`?"

**Hruday's answer:**
> `preload` is for resources the current page needs soon, at high priority. The browser downloads them immediately, as part of the current page load. Use `preload` for: LCP images (the browser discovers images late when it parses to `<img>` — preloading tells it early), web fonts needed in critical CSS (fonts are discovered when CSS is parsed, which is already late — preloading starts the download immediately), and JavaScript files that are critical for first interaction.
>
> `prefetch` is for resources the NEXT page might need. It downloads at low priority in the browser's idle time. Use `prefetch` for resources that a user is likely to need after their next navigation — lazy-loaded JavaScript chunks for the next likely route, images on the next page. The browser downloads these only when it has no higher-priority work.
>
> The risk with `preload`: over-preloading. Every `preload` competes for bandwidth with the current page's critical resources. If you preload 10 resources that aren't critical, you may delay the LCP element loading by 200ms. Preload only what is genuinely needed in the first 0-2 seconds of the page. Lighthouse warns "Preloaded resource not used within a few seconds" when you preload something that isn't actually critical.
>
> Rule of thumb: preload the LCP image and critical fonts — usually 2-4 resources maximum. Prefetch the next page's route chunk when the user hovers a navigation link.

---

### Q4 — Scenario
**Interviewer asks:** "A Lighthouse audit shows FCP is 4.2 seconds for your product's homepage. Walk me through how you diagnose and fix it."

**Hruday's answer:**
> Step 1: look at the Lighthouse "Opportunities" and "Diagnostics" sections. Two specific items are most relevant to FCP: "Eliminate render-blocking resources" and "Reduce initial server response time." If render-blocking resources are listed, I know the critical path has blocking CSS or JS.
>
> Step 2: in the Performance tab (Chrome DevTools), record a page load. The waterfall shows individual resource timelines. I look for the line of "render-blocking" (typically a horizontal red bar in the Network waterfall), and I identify which CSS files are loaded at the top without any async strategy.
>
> Step 3: categorise what I find. For CSS: identify what's above-the-fold (inline it in a `<style>` tag), what's below-the-fold or conditional (`media="print"` async load trick or `loadCSS` pattern). For scripts: add `defer` to all application scripts, `async` to analytics.
>
> Step 4: for LCP specifically — if the LCP element is an image, `<link rel="preload">` it in the `<head>`. Add `fetchpriority="high"` to the `<img>` element. Ensure the image has `width` and `height` attributes to prevent CLS.
>
> Step 5: re-run Lighthouse after each fix in isolation to measure impact. Don't batch all fixes — measure each one so you know where the time is actually coming from.
>
> This was the exact sequence we ran at SAP. The biggest gains came from: inlining 4KB of critical CSS (saved 800ms), preloading the hero banner image (saved 400ms), and deferring two synchronous scripts (saved 340ms). Total: from 4.2s FCP to 1.8s before touching any code logic.

---

## 6. The Traps

| Trap | What most candidates say | What Hruday says |
|------|--------------------------|------------------|
| "CSS is not render-blocking if it's at the bottom" | "I move CSS to the bottom to avoid render-blocking" | CSS at the bottom still blocks rendering — the browser will not paint until the CSSOM is complete REGARDLESS of where the `<link>` is; moving CSS to the bottom causes a Flash of Unstyled Content (FOUC) and the browser still won't paint; the solution is async CSS loading (`media="print"` trick) or inline critical CSS |
| "JavaScript at the bottom doesn't need async/defer" | "Scripts at the bottom of body are fine without defer" | Scripts at the bottom of `<body>` don't block HTML PARSING (there's nothing left to parse after them) but they still block the `DOMContentLoaded` event and can delay user interaction; `defer` is still better for clarity and correctness; modern best practice is `type="module"` or explicit `defer` on all app scripts |
| "Layout thrashing only happens with jQuery" | "This was a problem in the old jQuery era" | Layout thrashing happens any time you interleave DOM reads (offsetWidth, getBoundingClientRect) and writes (style changes) in a loop; React apps can cause it too — directly touching the DOM in a render or effect, third-party DOM-manipulating libraries, resize observers that read layout and then write style; still a live issue in 2026 |
| "Preload everything important for performance" | "I preloaded all images and fonts for better performance" | Preloading competes for bandwidth; preloading a below-the-fold image delays the above-the-fold LCP image which IS the performance metric; preload ONLY the LCP element and critical fonts (2-4 resources maximum); everything else either loads naturally or uses prefetch with low priority |

---

## 7. Hruday's Real Experience Hook
> "The Lighthouse 60 → 95+ improvement at SAP is the clearest example I have of critical rendering path optimisation at real production scale. The initial audit showed FCP at 4.2 seconds on a simulated 4G connection — unacceptable for a B2B product that sales teams used during customer demos.
>
> The three fixes that moved the needle most were: inlining the above-the-fold CSS (extracted ~4KB of critical CSS into a `<style>` tag and deferred the full 160KB CSS bundle), preloading the application shell image with a `<link rel="preload">` (the hero section was a large banner image that started loading 900ms later than it should have), and converting three synchronous `<head>` scripts to `defer` (an analytics snippet and two polyfills that had no reason to block page render).
>
> What surprised me: the analytics team was initially reluctant to change their script from synchronous to `async` because they feared losing session tracking. We worked with them to confirm that `async` analytics scripts don't lose the page view — the event fires as soon as the script runs, just slightly after initial paint instead of before. No data was lost; 340ms was gained."

---

## 8. Scale Evolution

**Single developer, small site →** Basic wins: move scripts to bottom of body, add `defer` to all `<script>` tags, avoid inline `style="background-image: url(...)"` for LCP elements. These alone improve FCP by 1-2 seconds on a typical site with moderate CSS.

**Product team, 50K users/day →** Full critical path audit with Lighthouse CI in the build pipeline (block merges that regress FCP over 100ms); extract and inline critical CSS programmatically (Critters/critical npm package for inline automation); `preload` the LCP element; audit third-party scripts (use `async` or `defer`, consider moving to Partytown for off-main-thread execution).

**Consumer product, millions of users →** HTTP/2 Server Push for critical CSS (though replaced by 103 Early Hints in modern stacks); edge-served critical CSS via CDN with zero-RTT retrieval; Resource Hints (`dns-prefetch`, `preconnect`) for every third-party origin; advanced LCP optimisation (priority hints API `fetchpriority`); image compression pipelines (AVIF serving with WebP fallback); Largest Contentful Paint debugging via real-user measurement with Web Vitals JS library.

---

## 9. Company Relevance

| Company | Why this matters here | Interview signal |
|---------|----------------------|-----------------|
| Razorpay / PhonePe | Payment checkout pages are conversion-critical; every 100ms of FCP delay measurably reduces conversion rate; Core Web Vitals directly affect Google ad quality scores for fintech companies; CRP knowledge is expected at senior level | Know render-blocking specifically for checkout flows; resource hints for third-party payment SDKs; LCP optimisation for payment confirmation screens |
| Swiggy / Meesho | Mobile-first consumer apps where 60% of traffic is on 3G/4G connections; FCP on mobile networks is 3-5× worse than desktop; LCP for product images on listing pages is measured and tracked; performance regression alerting in CI | Critical path on mobile (bandwidth × latency); image loading strategy (lazy vs eager); font loading impact on FCP |
| Adobe / Microsoft | Adobe Experience Manager (CMS/DXP) produces pages for enterprise clients — performance is a product feature; Microsoft Edge's performance team tracks Web Vitals across all Microsoft properties; engineering interviews probe CRP deeply | Advanced: streaming HTML, early hints (103 status), preload scanner behaviour, parser-blocking vs render-blocking distinction |
| SAP Labs | Direct experience: Lighthouse 60→95 at SAP; render-blocking CSS identification and inlining; async script migration; preload for hero image — all production-confirmed at SAP | Anchor the real SAP story confidently — 4.2s → 1.8s FCP, specific techniques, the analytics team negotiation for async migration |

---

## 10. Related Topics — What to Study Next

- **Topic 234 — Core Web Vitals (LCP, CLS, INP, FCP)** — CRP is the mechanical explanation for WHY Core Web Vitals scores are what they are; LCP is determined by when the critical rendering path clears enough for the main content to paint; CLS is caused by elements rendering without reserved space (images without width/height); understanding CRP makes Core Web Vitals optimisations much more targeted
- **Topic 206 — Event Loop: Microtasks vs Macrotasks** — the browser's event loop determines when JavaScript runs relative to rendering; understanding that rendering happens between tasks (macrotasks) explains why long JavaScript tasks (over 50ms) delay INP and visual responsiveness; the CRP and the event loop are both parts of the same browser rendering model
- **Topic 207 — HTTP/1.1 vs HTTP/2 vs HTTP/3** — the critical rendering path is deeply affected by how resources are loaded over the network; HTTP/2 multiplexing (multiple resources over one connection) changes the strategy for resource loading; server push (replaced by 103 Early Hints) was designed to eliminate CRP waiting; Resource Hints work best with HTTP/2
- **Topic 235 — Code Splitting and Lazy Loading** — code splitting reduces the JavaScript that participates in the initial critical rendering path; once the critical CSS and main thread are optimised, the next win is reducing how much JavaScript runs at initial load; lazy loading is the runtime complement to preloading (load later vs load earlier)

---

*Part 12 · Critical Rendering Path · Full Stack Interview Guide · Hruday D · 2026*
