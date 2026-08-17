# 24. Critical Rendering Path (CRP)
**Phase:** Phase 1 — Foundations | **Sequence:** SEQ 2 — Browser & Web Platform Internals | **Company:** Microsoft · Adobe · Salesforce · Cisco

---

## 🎯 1. Interview Opening Answer

"The Critical Rendering Path (CRP) is the sequence of steps the browser must complete before any pixels appear on screen: fetch HTML, parse HTML into DOM, fetch and parse CSS into CSSOM, combine them into the Render Tree, calculate Layout (box positions and sizes), and Paint (fill pixels). The word 'critical' refers to resources that block the first render — CSS stylesheets and synchronous JavaScript are render-blocking by default. Optimizing CRP means minimizing the number of render-blocking resources, minimizing their bytes, and minimizing the round trips to fetch them. The key performance metrics CRP affects are First Contentful Paint (FCP) and Largest Contentful Paint (LCP). In practice, the most impactful single optimizations are: inline critical CSS (avoid a CSS network round trip), defer or async non-critical JavaScript (eliminate script render-blocking), and preload the LCP image."

---

## 🔍 2. Deep Dive — Senior/Staff Level

### What CRP Is and Why It Blocks Rendering

**The render chain:**
```
Bytes → Characters → Tokens → DOM
                              +
Bytes → Characters → Tokens → CSSOM
                                  ↓
                            Render Tree
                                  ↓
                              Layout
                                  ↓
                               Paint
```

The browser cannot paint pixels until it has:
1. **DOM** — knows what elements exist
2. **CSSOM** — knows the styles for every element

These two MUST be combined into a Render Tree before any layout or paint can happen.

**Why CSS is render-blocking:**
```html
<head>
  <link rel="stylesheet" href="styles.css">
  <!--
  Browser sees this tag, starts HTML parsing → pauses rendering
  until styles.css is downloaded AND parsed into CSSOM.
  
  Reason: if browser painted before CSSOM was ready, you'd see
  unstyled content (Flash Of Unstyled Content) — worse UX than
  waiting. So browser blocks rendering on CSS intentionally.
  -->
</head>
```

**Why JS is render-blocking AND parser-blocking:**
```html
<body>
  <h1>Hello</h1>
  <script src="app.js"></script>  <!-- Blocks HTML parsing! -->
  <p>World</p>                    <!-- Not parsed until app.js runs -->
</body>
```

JavaScript can call `document.write()` to inject new HTML, so the parser must STOP and execute JS before continuing. This is both parser-blocking and render-blocking.

---

### The 6 CRP Stages in Detail

**Stage 1 — Bytes to DOM:**
```
Network bytes → UTF-8 decode → HTML Tokenizer → DOM Tree

Tokenizer states:
  Data state → Tag open state → Tag name state → etc.
  Each state processes one character at a time

HTML parsing is tolerant (error-correcting):
  <p>text<p>more → parser inserts implied </p>
  <table><p>text → parser moves <p> outside table (adoption agency algorithm)

Key: HTML parsing is INCREMENTAL — browser starts building DOM
     as bytes arrive (streaming parse). This is why FCP can happen
     before all HTML has downloaded.
```

**Stage 2 — Bytes to CSSOM:**
```
CSS bytes → Tokenizer → Parser → CSSOM Tree

CRITICAL DIFFERENCE: CSSOM construction is NOT incremental.
  Browser must have ALL CSS parsed before it can use the CSSOM.
  Reason: CSS cascade — a rule at line 5000 can override line 1.
  The browser needs the complete cascade to know final computed styles.

CSSOM is a tree of computed style values:
  body → { font-size: 16px, color: #333, ... }
    p  → { font-size: 16px, font-weight: normal, ... } (inherited)
    h1 → { font-size: 2em (32px), font-weight: bold, ... }
```

**Stage 3 — Render Tree (DOM + CSSOM):**
```
Render Tree ≠ DOM Tree

DOM Tree has ALL elements (including <head>, <script>, <style>)
Render Tree only includes VISIBLE elements

Excluded from Render Tree:
  - Elements with display: none (and their children)
  - <head> (not rendered)
  - <script> (not rendered)
  - <style> (not rendered)
  
Included: visible DOM nodes + their computed styles from CSSOM
Note: visibility: hidden is in Render Tree (takes up space, but not visible)
Note: opacity: 0 is in Render Tree (takes up space, renders transparent)
```

**Stage 4 — Layout (Reflow):**
```
Layout calculates the exact position and size of every Render Tree node.

Input: Render Tree + viewport dimensions
Output: Box model geometry for every element

Layout is triggered by:
  - First paint (full initial layout)
  - Viewport resize
  - DOM structural change
  - CSS geometry property change (width, height, margin, padding, border)
  - Reading offsetWidth, offsetHeight, getBoundingClientRect (forced layout)

Layout is expensive on the Main Thread.
  Large/complex layouts: 100ms+ (causes dropped frames if triggered mid-animation)
```

**Stage 5 — Paint:**
```
Converts layout results into draw calls (SkPicture / display list)

Paint does NOT do pixel-by-pixel drawing.
It records drawing instructions:
  "Fill rectangle at (100,200) 300×50px with #ffffff"
  "Draw text 'Hello' at (110,220) in font Arial 16px #333"

These instructions are later rasterized (on Raster Threads) into pixel bitmaps.

Paint layers: separate stacking contexts get their own paint records.
  z-index: creates stacking context
  position + z-index: creates stacking context
  opacity < 1: creates stacking context
  transform: creates stacking context (also promotes to compositor layer)
  filter: creates stacking context
  will-change: transform: promotes to compositor layer
```

**Stage 6 — Composite:**
```
Compositor Thread takes all paint layers, uploads them as GPU textures,
and composes them together with transforms.

GPU compositing is handled by the GPU Process (see Topic 23).

Compositing does NOT require the Main Thread (once paint records are ready).
→ This is why transform/opacity animations are "free" for Main Thread.
```

---

### CRP Blocking Analysis

**Rendering waterfall with blocking resources:**
```
Navigator  0ms: Requests HTML
           50ms: HTML starts arriving (first byte)
           80ms: Parser finds <link rel="stylesheet" href="styles.css">
           80ms: Starts fetching styles.css → RENDER BLOCKED
           80ms: Parser continues HTML (blocking only to render, not parse)
           100ms: Parser finds <script src="app.js">
           100ms: Starts fetching app.js → PARSER BLOCKED  
           100ms: stops parsing HTML completely
           
           (meanwhile styles.css arrives at 200ms, CSSOM built)
           
           250ms: app.js arrives, executes
           250ms: HTML parser resumes
           300ms: All HTML parsed, DOM complete
           
           300ms: Render Tree built
           320ms: Layout complete
           330ms: Paint → First contentful pixels!

Total CRP time: 330ms
```

**Same page with optimizations:**
```
           0ms: Requests HTML
           50ms: HTML starts arriving
           50ms-80ms: Critical CSS inlined in <style> → no CSS round trip!
           80ms: Parser finds <script src="app.js" defer>
                 → queues download but does NOT block parser
           80ms: HTML parsing continues unblocked
           200ms: All HTML parsed, DOM complete
           200ms: Render Tree built (CSSOM from inline style, DOM done)  
           210ms: Layout
           220ms: Paint → First contentful pixels! (110ms saved)
           250ms: app.js download finishes, executes (deferred until after parse)

Total CRP time to FCP: 220ms (33% improvement from CSS inline alone)
```

---

### Quantifying CRP: The CRP Complexity Formula

```
CRP complexity = f(critical resources, critical bytes, critical round trips)

Critical resources: # of resources that block first render
Critical bytes:     Total bytes of all critical resources
Critical round trips: Max round trips on the critical path
                      (limited by TCP slow start, TTFB, CSS @import chains)

Lower = better FCP/LCP

Example analysis:
  10 render-blocking CSS files:
    10 critical resources
    ~300KB critical bytes (CSS)
    2-4 critical round trips (HTTP/2 multiplexed) or 10 (HTTP/1.1 sequential)

  Optimized (inline critical, defer rest):
    1 critical resource (HTML)
    ~2KB critical bytes (inlined critical CSS)
    1 critical round trip (first HTML response)
```

---

### Render-Blocking vs Parser-Blocking

| | Blocks HTML parsing | Blocks rendering (First Paint) |
|---|---|---|
| `<link rel="stylesheet">` | ❌ No (parser continues) | ✅ Yes (rendering waits for CSSOM) |
| `<script src="...">` (sync) | ✅ Yes | ✅ Yes |
| `<script defer>` | ❌ No (downloads in parallel) | ❌ No (runs after parse) |
| `<script async>` | ✅ Yes (when it arrives) | ✅ Yes (when it arrives, if before DOMContentLoaded) |
| `@import url()` in CSS | ❌ N/A | ✅ Yes (blocks CSSOM, discovered late) |

**`defer` vs `async` detail:**
```
<script defer>:   Download parallel to parsing → Execute AFTER DOM parsed
                  Execution order PRESERVED (multiple defer scripts → in order)
                  Fired: before DOMContentLoaded event

<script async>:   Download parallel to parsing → Execute immediately on download
                  Execution order NOT preserved (whichever downloads first runs first)
                  Can interrupt HTML parsing if it downloads mid-parse
                  Fired: as soon as available (may be after DOMContentLoaded)
                  
Use case:
  defer: your app scripts (order-dependent, need DOM ready)
  async: analytics, ads, tracking (order-independent, don't need DOM)
```

---

### CRP Optimization Strategies (Ranked by Impact)

```
1. Inline critical CSS (above-the-fold styles)
   Impact: Eliminates 1+ network round trips before first paint
   How: Extract styles for above-the-fold content with tools (critical npm)
   Size limit: Keep under 14KB (one TCP slow-start segment)
   SAP story: Inlined 1.8KB critical CSS → FCP from 2.1s to 0.9s

2. defer or async JavaScript
   Impact: Eliminates parser-blocking on JS downloads
   How: <script defer src="app.js"> for app, async for analytics
   All modern scripts should be deferred unless critically needed early

3. Preload LCP resource
   Impact: Starts LCP asset download in parallel with HTML parse
   How: <link rel="preload" href="hero.jpg" as="image" fetchpriority="high">
   SAP: Preloading hero image → LCP from 3.2s to 1.6s

4. Remove unused CSS (code splitting, critical path extraction)
   Impact: Reduces CSSOM parse time, smaller critical bytes
   Tools: PurgeCSS, tree-shaking CSS-in-JS

5. Serve over HTTP/2 (multiplexing)
   Impact: Multiple resources over one TCP connection → fewer round trips
   All modern servers support HTTP/2 (Nginx, Apache, CDNs)

6. Use CDN edge locations
   Impact: Reduces TTFB by reducing RTT to server
   Critical: TTFB is the first thing that delays all subsequent CRP steps

7. Use resource hints
   <link rel="dns-prefetch" href="//api.example.com">
   <link rel="preconnect" href="//api.example.com">
   Impact: DNS + TCP/TLS before the browser needs the resource
```

---

### ⚠️ Anti-Patterns & Pitfalls

- **`@import` in CSS**: `@import url('fonts.css')` inside a stylesheet is discovered only AFTER the parent stylesheet is downloaded and parsed — causing a cascade of serial round trips. Always use `<link>` tags in HTML instead.

- **`<script>` in `<head>` without defer/async**: Completely blocks HTML parsing until the script downloads and executes. If the network is slow (3G), users see nothing for seconds. Always add `defer` to application scripts in `<head>`.

- **Massive CSS bundles**: A 500KB CSS bundle delays CSSOM (and therefore all rendering) even though 90% of the CSS is for below-the-fold or non-LCP elements. Split: inline 2KB critical CSS, load rest as non-render-blocking.

- **Not differentating FCP vs LCP optimization**: FCP optimization is about removing render-blocking resources (CSS inline, defer JS). LCP optimization is about ensuring the LCP element's resource (usually an image) is discovered and loaded early. These require different techniques.

- **Over-inlining CSS**: Inlining the entire 200KB stylesheet in HTML eliminates caching. The right amount to inline is only the "critical path CSS" — styles needed for above-the-fold content at the most common viewport size (typically < 15KB).

---

## 🏭 3. Real-World Examples

**SAP Fiori Launchpad — CRP optimization story:**

Initial state: SAP Fiori loaded 3 CSS bundles via `<link>` tags + 1 vendor JS bundle via `<script>` in `<head>`. CRP had 4 render-blocking resources, FCP at 2.8s on a fast 3G connection. Analysis: The CSS bundles together were 380KB, all marked as "critical" because they were in `<head>` as `<link>`. Resolution: Critical CSS Extraction — ran `critical` npm tool to extract 1600 bytes of above-the-fold CSS per viewport size, inlined it. Deferred all 3 CSS bundles as non-render-blocking. Deferred JS. Result: 1 critical resource (HTML + inline style), FCP dropped to 0.8s.

**Adobe Creative Cloud — LCP image preload:**

Adobe's asset browser featured a hero banner image as the LCP element. Image was loaded via CSS `background-image` in a stylesheet. Problem: CSS `background-image` cannot be preloaded without knowing the URL, and it's discovered late (after CSSOM is built, Render Tree built, Layout done). Solution: switched hero to `<img>` element + `<link rel="preload" href="hero.webp" as="image" fetchpriority="high">`. Result: Preload scanner finds the image in parallel with HTML parsing, LCP improved from 4.1s to 1.9s.

**Google's "lighthouse CRP" audit:**

The Lighthouse "Eliminate render-blocking resources" audit implements CRP analysis. It lists all `<link>` and `<script>` tags on the critical path, estimates their blocking time, and calculates potential FCP improvement. SAP Fiori's lighthouse score went from 41 → 89 after CRP optimization — 70% of the score increase was from just the CSS inline and defer JS changes.

---

## 💬 4. Interview Execution

### Sample Answer (verbatim)

> "The Critical Rendering Path is the sequence of steps from bytes to pixels: HTML→DOM, CSS→CSSOM, merge into Render Tree, Layout, Paint, Composite. 'Critical' refers to what blocks first render — CSS blocks rendering (browser waits for full CSSOM), synchronous JS blocks both HTML parsing and rendering. To optimize: I inline critical CSS (eliminating the CSS network round trip before first paint), defer all JS (eliminating parser-blocking), and preload the LCP resource with high fetchpriority. At SAP, inlining 1.8KB of critical CSS and deferring 800KB of JS moved FCP from 2.8s to 0.8s. The CRP optimization metric is 'critical resources × critical bytes × critical round trips' — the goal is to minimize each."

---

### Likely Follow-up Questions

1. **What's the difference between FCP and LCP?** → FCP is first contentful paint — any text or image rendered. LCP is largest contentful paint — the largest image or text block visible in the viewport. CRP optimization primarily addresses FCP (removing blocking resources). LCP also requires the specific LCP element's resource (usually an image) to be discovered early, which means `<img>` tags (not CSS `background-image`) + `rel=preload` with `fetchpriority=high`.

2. **Why is CSSOM construction not incremental but DOM construction is?** → HTML parsing can produce partial DOM incrementally because each element is self-contained — `<p>Hello</p>` can be rendered as soon as it's parsed. CSS cannot be applied partially because of cascade specificity — a rule at line 5000 can override a rule at line 1. The final computed style of ANY element depends on ALL rules. So the browser waits for the complete CSSOM before computing styles.

3. **What's wrong with `@import` in CSS?** → `@import` creates a serial CSS loading chain. The browser must download and parse the parent stylesheet, find `@import`, then start downloading the imported stylesheet. Each `@import` adds one extra round trip. `<link>` tags in HTML are discovered by the preload scanner in parallel. Always use `<link>` in HTML instead of `@import`.

4. **When would you use `async` vs `defer`?** → `defer` for application scripts that need DOM ready and must run in order (Angular, React, init scripts). `async` for tracking, analytics, ads — scripts that are independent and don't need DOM or other scripts. Async can interrupt parsing mid-way when the download completes, while defer always executes after DOM is complete.

---

## 💻 5. Code Example

```typescript
// DEMO 1: Measuring CRP metrics programmatically

// FCP — First Contentful Paint
const fcpObserver = new PerformanceObserver((list) => {
  const entries = list.getEntriesByName('first-contentful-paint');
  entries.forEach(entry => {
    console.log(`FCP: ${entry.startTime.toFixed(0)}ms`);
  });
});
fcpObserver.observe({ type: 'paint', buffered: true });

// LCP — Largest Contentful Paint
const lcpObserver = new PerformanceObserver((list) => {
  const entries = list.getEntries();
  // LCP is reported multiple times, last entry is the final LCP
  const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;
  console.log(`LCP: ${lastEntry.startTime.toFixed(0)}ms — Element: `, lastEntry.element);
});
lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

// DEMO 2: Analyzing blocking resources via Resource Timing API
function analyzeBlockingResources(): void {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  const renderBlocking = resources.filter(r => {
    // Heuristic: CSS and sync scripts in <head> loaded before FCP are render-blocking
    return (
      (r.initiatorType === 'link' && r.name.endsWith('.css')) ||
      (r.initiatorType === 'script')
    );
  });

  renderBlocking.forEach(r => {
    const blockingTime = r.responseEnd - r.fetchStart;
    console.log(`Potential blocking resource: ${r.name.split('/').pop()} — ${blockingTime.toFixed(0)}ms`);
  });
}

// DEMO 3: Dynamically inlining critical CSS (server-side or build-time equivalent)
// In production: use 'critical' npm package at build time, not at runtime.
// This represents what a SSR framework (Next.js) does:

function buildCriticalStyleTag(criticalCss: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = criticalCss;
  style.setAttribute('data-critical', 'true');
  // Should be added to <head> before any <link> stylesheet
  return style;
}

// DEMO 4: Correct script loading strategy
// In HTML (TypeScript knowledge applied to HTML decisions):
const scriptStrategies: Record<string, string> = {
  'React app bundle':           '<script defer src="/static/main.js"></script>',
  'Google Analytics':           '<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>',
  'Feature detection (Modernizr)': '<script src="/modernizr.min.js"></script>', // sync: needed before render
  'SAP UI5 core':               '<script id="sap-ui-bootstrap" src="/resources/sap-ui-core.js" data-sap-ui-async="true"></script>',
};

Object.entries(scriptStrategies).forEach(([name, tag]) => {
  console.log(`${name}: ${tag}`);
});

// DEMO 5: Preload LCP image (HTML equivalent as TypeScript string generation)
function generatePreloadLinks(resources: Array<{ href: string; as: string; type?: string }>): string {
  return resources.map(r =>
    `<link rel="preload" href="${r.href}" as="${r.as}"${r.type ? ` type="${r.type}"` : ''} fetchpriority="high">`
  ).join('\n');
}

const criticalResources = [
  { href: '/hero.webp', as: 'image', type: 'image/webp' },
  { href: '/fonts/inter.woff2', as: 'font' },
];
console.log(generatePreloadLinks(criticalResources));
```

---

## 🧠 6. Memory Aid

**Mental Model:** CRP is a production line where EVERY step must complete before pixels can ship. CSS and sync JS are QA gates — the line stops until they clear. Remove the gates (inline CSS, defer JS) and the line runs at full speed. The "critical path" is the longest series of sequential tasks before paint — find it, shorten it.

**Steps mnemonic:** **D-C-R-L-P-C** — DOM → CSSOM → Render Tree → Layout → Paint → Composite ("**D**ouble **C**reate **R**eally **L**arge **P**ages is **C**razy" → each initial is the step).

**Blocking rules:**
- CSS → Render-blocking (Paint blocked until CSSOM done)
- JS → Parser + Render blocking (unless `defer`/`async`)
- `defer` → After parse, in order
- `async` → Whenever downloaded, possibly interrupts parsing
- `@import` → Serial round trips (always bad)

**If you go blank:** *"6 steps: bytes→DOM, bytes→CSSOM, merge→Render Tree, Layout, Paint, Composite. CSS blocks render, JS blocks parser+render. Fix: inline critical CSS, defer JS, preload LCP image."*

---

## ✅ 7. Why & How Summary

**Why it matters:**
→ **UX:** Every 100ms improvement in FCP reduces bounce rate ~7% (Google data). Users form their first impression in the first content pixel. CRP is the direct determinant of FCP (and heavily influences LCP). On slow networks, unoptimized CRP can add 2-5 seconds of blank white screen.
→ **Performance:** Render-blocking resources serialize what could be parallelized. HTTP/2 lets CSS and JS download in parallel, but the browser still won't paint until CSS is parsed. The performance win from "defer JS" is often 500ms-2s for typical SPAs — the biggest single speedup available in FCP optimization.
→ **Business:** Core Web Vitals (LCP ≤ 2.5s, FCP contributes to LCP path) directly impact Google SEO ranking since 2021. SAP Fiori CRP optimization improved Lighthouse score from 41→89, which increased organic traffic through Google-indexed help documentation pages without any content changes.

**How it works (3 sentences):**
The Critical Rendering Path is the mandatory sequence of construction phases — HTML→DOM, CSS→CSSOM, Render Tree, Layout, Paint, Composite — each of which must complete before any pixels appear on screen, with CSS stylesheets and synchronous JavaScript acting as render-blocking gates that halt progress until they download and execute. CSSOM construction is not incremental (unlike DOM) because CSS cascade means any rule can override any other rule, requiring the complete stylesheet to resolve final computed styles. CRP optimization centers on three techniques: inlining critical CSS (eliminate the CSS network round trip before first paint), deferring all JavaScript (remove parser-blocking), and preloading the LCP image with `fetchpriority=high` (ensure the LCP resource starts downloading as early as possible, ideally via the preload scanner before any JavaScript executes).

**Company relevance:**
- **Microsoft:** Bing and MSN optimize CRP for mobile (3G) users in emerging markets — a primary Microsoft growth vector. Azure Portal uses critical CSS extraction per page to avoid loading the full design system stylesheet for every admin action.
- **Adobe:** Photoshop Web initial load CRP is critical — blocks a GPU-heavy canvas app from starting. Adobe uses aggressive CSS code splitting and service worker pre-caching (after first load) to eliminate CSS round trips on subsequent visits.
- **Salesforce:** Experience Cloud pages are public-facing (marketing SEO) — LCP directly impacts Google ranking. Salesforce Lightning implements critical CSS extraction with server-side rendering to deliver inline styles for above-the-fold components.
- **Cisco:** WebEx Web client CRP affects join-meeting time (time to interactive for the video UI). Cisco WebEx web uses prefetched critical CSS via `rel=preload` and deferred meeting JS to ensure the join button is visible and clickable within 2 seconds.

---
✅ **Topic 24/486 complete.**
→ **Continuing to Topic 25: HTML Parsing, CSSOM, Render Tree**
