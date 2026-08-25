# 42. Blocking vs Non-Blocking Rendering

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

### What It Is
Blocking vs Non-Blocking Rendering refers to how browser resources (HTML, CSS, JavaScript) are loaded and processed, and whether they **block the Critical Rendering Path (CRP)** — the sequence of steps the browser takes to convert HTML, CSS, and JavaScript into pixels on the screen.

- **Blocking Resources**: Prevent the browser from rendering any content until they are fully downloaded and processed
- **Non-Blocking Resources**: Allow the browser to continue parsing and rendering while they load in the background

### Why It Exists
The browser needs to make decisions about **when it's safe to paint** content to the screen. Some resources are critical to layout and appearance (CSS, synchronous JS), while others can be deferred without impacting the initial render. Understanding this distinction is crucial for optimizing **First Contentful Paint (FCP)** and **Largest Contentful Paint (LCP)**.

### When and Where It's Used
- **Every web page load**: The browser evaluates each resource and decides whether it blocks rendering
- **Performance optimization**: Senior engineers strategically control blocking behavior to optimize Core Web Vitals
- **Critical path optimization**: Identifying and minimizing blocking resources is key to fast page loads

### Role in Large-Scale Applications
In FAANG-level applications serving millions of users:
- **Every 100ms of blocking delay** can reduce conversions by 1-2%
- **LCP must be < 2.5s** for good user experience (Google's Core Web Vitals)
- Blocking resources on slow networks (3G) can make pages completely unusable
- Strategic non-blocking techniques can improve perceived performance by 40-60%

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### Browser Rendering Pipeline & Blocking

**The Critical Rendering Path:**
```
1. DOM Construction (HTML parsing)
2. CSSOM Construction (CSS parsing)
3. Render Tree = DOM + CSSOM
4. Layout (calculate positions)
5. Paint (draw pixels)
```

**Key Principle**: The browser **CANNOT render without both DOM and CSSOM**. This is why CSS is render-blocking by default.

### Blocking Resources Breakdown

#### 1. **CSS is Always Render-Blocking**
```html
<link rel="stylesheet" href="styles.css">
```

**Why CSS Blocks:**
- Browser must wait for CSSOM to be fully constructed before rendering
- Prevents **FOUC (Flash of Unstyled Content)**
- Applies to all `<link rel="stylesheet">` in `<head>`

**Performance Impact:**
- On 3G network: 400KB CSS file = 4-5 seconds blocked rendering
- Even 20KB CSS takes ~300ms on slow networks
- CSS on slow CDNs can completely tank LCP

**Deep Implications:**
- CSS blocks **everything below it** in the document
- CSS **also blocks JavaScript execution** (because JS might query computed styles)
- Multiple CSS files block **sequentially** on HTTP/1.1

#### 2. **JavaScript is Parser-Blocking (and Often Render-Blocking)**

**Synchronous Script (Default):**
```html
<script src="app.js"></script>
```

**What Happens:**
1. HTML parser encounters `<script>`
2. Parser **STOPS** (blocks)
3. Script is downloaded (if external)
4. Script is executed
5. Parser resumes

**Why JS Blocks:**
- JavaScript can modify the DOM (`document.write`, element manipulation)
- JavaScript can modify CSSOM (`element.style.color = 'red'`)
- Browser must execute scripts in order to maintain correctness

**Render-Blocking Chain:**
```
CSS → JS → DOM Parsing → Rendering
```
- If JS appears after CSS, it must **wait for CSS** (because JS might query styles)
- This creates a **blocking cascade**

#### 3. **HTML Parsing is Incremental (Non-Blocking)**
- Browser parses HTML **progressively** as it streams in
- Can start rendering before entire HTML is downloaded
- This is why "streaming HTML" is powerful for SSR

### Non-Blocking Techniques

#### 1. **Async Scripts**
```html
<script async src="analytics.js"></script>
```

**Behavior:**
- Downloads in parallel with HTML parsing
- **Does NOT block parser**
- Executes **immediately when ready** (can interrupt parsing)
- No guaranteed execution order
- Still blocks rendering briefly during execution

**Use Cases:**
- Analytics, tracking pixels
- Independent widgets (chat, ads)
- Third-party scripts that don't affect initial render

**Gotcha:**
- Can still impact INP if executes during user interaction
- Can cause layout shifts if modifies DOM

#### 2. **Defer Scripts**
```html
<script defer src="app.js"></script>
```

**Behavior:**
- Downloads in parallel with HTML parsing
- **Does NOT block parser**
- Executes **after DOM is fully parsed** (before `DOMContentLoaded`)
- **Maintains order** (multiple defer scripts execute in sequence)

**Use Cases:**
- Main application JavaScript
- Scripts that need full DOM but don't affect initial paint
- Non-critical interactivity

**Performance Win:**
- Allows browser to parse HTML and render content immediately
- Defer is almost always better than default sync scripts

#### 3. **Preload (Non-Blocking Discovery)**
```html
<link rel="preload" href="critical.css" as="style">
<link rel="preload" href="hero-image.webp" as="image">
```

**Behavior:**
- Tells browser to download resource **early** without blocking
- Doesn't execute/apply automatically (need separate link/script tag)
- Prioritizes resource in browser's network queue

**Use Cases:**
- Critical CSS that's referenced late in document
- Hero images
- Fonts (combined with `crossorigin`)

#### 4. **Media Queries for Conditional CSS**
```html
<link rel="stylesheet" href="print.css" media="print">
<link rel="stylesheet" href="mobile.css" media="(max-width: 768px)">
```

**Behavior:**
- CSS still **downloads**, but only **blocks rendering** if media query matches
- On desktop, `mobile.css` downloads but doesn't block render

**Performance Win:**
- Reduces critical CSS size
- Non-matching CSS downloads at lower priority

#### 5. **Inline Critical CSS**
```html
<style>
  /* Critical above-the-fold CSS */
  .header { display: flex; }
  .hero { height: 100vh; }
</style>
<link rel="preload" href="full.css" as="style" onload="this.rel='stylesheet'">
```

**Technique:**
- Inline minimal CSS needed for first paint
- Load full CSS asynchronously
- Eliminates CSS network round-trip for critical content

**Trade-offs:**
- Increases HTML size (impacts TTFB)
- Cache inefficient (HTML not cached as aggressively)
- Complexity in build process

### Blocking Cascade Example

**Bad (Waterfall Blocking):**
```html
<head>
  <link rel="stylesheet" href="styles.css">        <!-- 500ms -->
  <script src="framework.js"></script>             <!-- WAITS 500ms, then 800ms -->
  <script src="app.js"></script>                   <!-- WAITS 1300ms, then 400ms -->
</head>
<!-- Total blocking time: 1700ms before any content renders -->
```

**Good (Optimized):**
```html
<head>
  <style>/* Critical CSS inlined */</style>         <!-- 0ms network -->
  <link rel="preload" href="styles.css" as="style">
  <script defer src="framework.js"></script>        <!-- Non-blocking -->
  <script defer src="app.js"></script>              <!-- Non-blocking -->
</head>
<!-- Content renders immediately, JS executes after parse -->
```

### Performance Metrics Impact

| Blocking Type | FCP Impact | LCP Impact | TTI Impact | CLS Impact |
|--------------|------------|------------|------------|------------|
| Blocking CSS | **HIGH** (delays first paint) | **HIGH** | Medium | Low |
| Blocking JS | **HIGH** (delays parser) | **HIGH** | **VERY HIGH** | Medium |
| Async JS | Low | Low | Medium | **HIGH** (if modifies layout) |
| Defer JS | **Low** | **Low** | Medium | Low |
| Non-blocking images | Low | Medium | Low | **HIGH** (if no dimensions) |

### Real-World Scalability Considerations

#### At FAANG Scale:

**1. CDN Geography Matters**
- User in India loading US-hosted CSS: 2-3 second blocking delay
- **Solution**: Edge-deployed critical CSS, regionalized asset delivery

**2. Mobile Networks**
- 3G/4G have high latency (200-500ms RTT)
- Single blocking resource can block for seconds
- **Solution**: Aggressive inlining, defer everything possible

**3. Bundle Size Impact**
- 1MB blocking JS bundle = 10+ seconds on slow networks
- **Solution**: Code splitting, defer non-critical chunks

**4. Third-Party Scripts**
- Analytics, ads, social widgets often blocking by default
- **Solution**: Async/defer all third-party, use facade pattern

### Common Anti-Patterns

❌ **Anti-Pattern 1: Multiple Blocking Scripts in `<head>`**
```html
<script src="jquery.js"></script>
<script src="bootstrap.js"></script>
<script src="app.js"></script>
<!-- Blocks for seconds on slow networks -->
```

✅ **Better:**
```html
<script defer src="bundle.js"></script>
<!-- Single bundled, deferred script -->
```

❌ **Anti-Pattern 2: Large CSS File in `<head>`**
```html
<link rel="stylesheet" href="styles.css">  <!-- 500KB -->
<!-- Blocks rendering for entire file download -->
```

✅ **Better:**
```html
<style>/* 5KB critical CSS */</style>
<link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'">
```

❌ **Anti-Pattern 3: Mixing Async/Defer Inappropriately**
```html
<script async src="app.js"></script>  <!-- Might execute before DOM ready -->
```

✅ **Better:**
```html
<script defer src="app.js"></script>  <!-- Guaranteed DOM ready -->
```

❌ **Anti-Pattern 4: Not Using Resource Hints**
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto">
<!-- Extra DNS + TLS negotiation adds 200-500ms -->
```

✅ **Better:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Roboto">
```

### Advanced: JavaScript Execution is Also Blocking

Even "non-blocking" scripts **block rendering** during execution:

```javascript
// This runs on main thread and blocks rendering
for (let i = 0; i < 1000000; i++) {
  // Heavy computation
}
```

**Solutions:**
- Break into smaller chunks with `requestIdleCallback`
- Use Web Workers for heavy computation
- Yield to main thread: `await new Promise(resolve => setTimeout(resolve, 0))`

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce Product Page (Amazon-Scale)

**Scenario**: Product detail page must show hero image, price, and "Add to Cart" button ASAP.

**Before Optimization (Blocking):**
```html
<head>
  <link rel="stylesheet" href="global.css">        <!-- 300KB, 2s on 3G -->
  <script src="react.js"></script>                 <!-- 100KB, 800ms -->
  <script src="app-bundle.js"></script>            <!-- 500KB, 3s -->
</head>
```
**Result**: 5-6 seconds before anything renders. Users bounce.

**After Optimization (Non-Blocking):**
```html
<head>
  <style>
    /* Critical CSS: header, hero, CTA button - 8KB */
    .hero-image { width: 100%; height: 600px; }
    .cta-button { background: #ff9900; font-size: 18px; }
  </style>
  
  <link rel="preload" href="hero-product.webp" as="image">
  <link rel="preload" href="global.css" as="style" onload="this.rel='stylesheet'">
  
  <script defer src="app-bundle.js"></script>
</head>
<body>
  <img src="hero-product.webp" width="600" height="600" alt="Product">
  <button class="cta-button">Add to Cart</button>
  <!-- Content renders in ~500ms -->
</body>
```

**Result**: 
- FCP: 500ms (10x improvement)
- LCP: 1.2s (hero image loads fast via preload)
- Button interactive after 2s (defer JS)

### Example 2: News Feed (Facebook/LinkedIn Style)

**Challenge**: Show feed skeleton immediately, load actual content progressively.

**Strategy:**
```html
<head>
  <style>
    /* Critical: Layout skeleton, fonts */
    .feed-skeleton { 
      animation: pulse 1.5s infinite;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    }
  </style>
  
  <link rel="preload" href="fonts/Roboto-Regular.woff2" as="font" crossorigin>
  <script type="module" defer src="feed-app.js"></script>
</head>
<body>
  <!-- Static skeleton renders immediately -->
  <div class="feed-skeleton"></div>
  <div class="feed-skeleton"></div>
  
  <!-- Real content injected by deferred JS -->
</body>
```

**Progressive Enhancement:**
1. Skeleton visible in 200ms (no blocking resources)
2. Fonts load in parallel (preloaded)
3. JS loads non-blocking (defer)
4. Feed data fetches after JS hydrates

### Example 3: Analytics & Third-Party Scripts

**Problem**: Third-party scripts often block unnecessarily.

**Bad:**
```html
<script src="https://analytics.com/tracker.js"></script>
<!-- Blocks rendering, slows LCP by 1-2 seconds -->
```

**Good:**
```html
<script async src="https://analytics.com/tracker.js"></script>
<!-- Non-blocking, executes when ready -->
```

**Better (Facade Pattern):**
```html
<script>
  // Minimal inline tracker
  window.analytics = {
    track: (event, data) => {
      (window.analyticsQueue = window.analyticsQueue || []).push([event, data]);
    }
  };
</script>
<script async src="https://analytics.com/tracker.js"></script>
<!-- Queue events immediately, real tracker loads async -->
```

### Example 4: Dashboard with Charts (Real-Time Data)

**Scenario**: Trading dashboard with live charts.

**Optimization Strategy:**
```html
<head>
  <style>
    /* Critical: Dashboard grid, placeholder */
    .dashboard-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
    .chart-placeholder { background: #1a1a1a; min-height: 300px; }
  </style>
  
  <!-- Heavy chart library loaded non-blocking -->
  <link rel="preload" href="chart-lib.js" as="script">
  <script defer src="chart-lib.js"></script>
  <script type="module" defer src="dashboard.js"></script>
</head>
<body>
  <div class="dashboard-grid">
    <div class="chart-placeholder">Loading chart...</div>
    <!-- Immediate layout, charts load progressively -->
  </div>
</body>
```

**Result:**
- Layout visible immediately
- Charts render progressively as library loads
- No blocking on initial render

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Level)

**Question**: "How would you optimize the loading performance of a product listing page with 50 images?"

**Answer:**

> "I'd approach this from a blocking vs non-blocking resource perspective. First, I'd identify the critical rendering path—what users need to see immediately.
>
> **For CSS**, I'd inline critical above-the-fold styles (product grid layout, typography) to eliminate the CSS network round-trip. The full stylesheet would load asynchronously using a preload with onload event to promote it to stylesheet once loaded.
>
> **For JavaScript**, I'd defer all application bundles since they're not needed for initial paint. If we have framework code like React, it goes in a separate chunk with defer attribute so the HTML parser isn't blocked.
>
> **For images**, none should block rendering, but I'd use several techniques:
> - Preload the hero/banner image to prioritize it
> - Lazy load below-the-fold images with Intersection Observer
> - Set explicit width/height to prevent CLS
> - Use responsive images with srcset for optimal bandwidth
>
> **The key metric I'd target is LCP under 2.5 seconds**. By making CSS and JS non-blocking and prioritizing the LCP element (likely hero image), we can achieve first paint in under 1 second even on 3G networks.
>
> I'd validate this with Lighthouse and RUM data, monitoring not just lab metrics but real user P75 LCP across different connection speeds."

### Likely Follow-Up Questions

**Q1**: "What if the JavaScript needs to run before first paint for critical functionality?"

**A**: "That's when I'd evaluate whether it's truly critical. If it is—for example, determining user experiment variant—I'd:
1. Inline minimal JS directly in HTML (0 network cost)
2. Keep it under 1KB if possible
3. Use it only for critical decisions, not full app logic
4. Consider doing this server-side instead (SSR) to avoid client-side blocking entirely.

In most cases, perceived critical JS can be refactored to progressive enhancement—render static content first, enhance with JS after."

**Q2**: "How do you handle CSS for components loaded dynamically?"

**A**: "I'd use code splitting for CSS as well:
- Critical CSS inlined
- Route-specific CSS loaded on-demand with dynamic imports
- Use CSS-in-JS (styled-components, CSS Modules) that bundles CSS with component code
- For large apps, consider CSS splitting by route using webpack's mini-css-extract-plugin

The key is ensuring the critical path CSS is minimal, and everything else is loaded non-blocking or on-demand."

**Q3**: "What about async vs defer—when do you use each?"

**A**: 
- **Defer**: Default for application code. Maintains execution order, waits for DOM ready, doesn't block parser. Use for React/Vue apps, UI libraries, anything that manipulates DOM.
- **Async**: For independent scripts that don't depend on DOM or each other. Analytics, ads, social widgets. Caution: can execute mid-parse and cause jank if heavy.
- **Neither (blocking)**: Only for truly critical inline scripts or if you need to prevent FOUC with document.write (legacy pattern, avoid)."

### Comparison Table: Resource Loading Strategies

| Strategy | Blocks Parser | Blocks Render | Execution Order | Best For |
|----------|--------------|---------------|-----------------|----------|
| Sync `<script>` | ✅ Yes | ✅ Yes | Sequential | Legacy code only |
| `defer` | ❌ No | ❌ No | Sequential | App code |
| `async` | ❌ No | ⚠️ Briefly (during exec) | Random | Analytics, ads |
| `<link>` CSS | ❌ No | ✅ Yes | N/A | All CSS |
| Inline CSS | ❌ No | ❌ No | N/A | Critical CSS |
| `preload` | ❌ No | ❌ No | N/A | Priority hints |
| `prefetch` | ❌ No | ❌ No | N/A | Next page |
| `modulepreload` | ❌ No | ❌ No | N/A | ES modules |

### Trade-Offs Discussion

**Inlining CSS:**
- ✅ Pro: Eliminates network round-trip, faster FCP
- ❌ Con: Increases HTML size, cache inefficiency
- **Decision**: Inline if critical CSS < 10KB and FCP is priority

**Defer vs Async:**
- ✅ Defer: Predictable, DOM-ready guarantee
- ✅ Async: Faster execution (doesn't wait for parse)
- **Decision**: Defer unless truly independent script

**Server-Side Rendering:**
- ✅ Pro: No JS blocking, immediate content
- ❌ Con: Server load, complexity, hydration cost
- **Decision**: Use for content-heavy, SEO-critical pages

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Example 1: Critical CSS Extraction (Build Time)

```javascript
// webpack.config.js with critical CSS plugin
const CriticalCssPlugin = require('critical-css-webpack-plugin');

module.exports = {
  plugins: [
    new CriticalCssPlugin({
      base: 'dist/',
      src: 'index.html',
      dest: 'index.html',
      inline: true,
      minify: true,
      extract: true,
      width: 1300,
      height: 900,
      // Extracts CSS for above-the-fold content
      // Inlines in HTML, loads full CSS async
    })
  ]
};
```

**Why This Structure:**
- Automated critical CSS extraction at build time
- Inlines automatically in HTML
- Full CSS loaded asynchronously
- Production-ready approach used at scale

### Example 2: Progressive Script Loading Pattern

```javascript
// Critical inline script (< 1KB)
<script>
  // Immediately capture early events
  window.__EARLY_EVENTS__ = [];
  document.addEventListener('click', e => {
    window.__EARLY_EVENTS__.push({ type: 'click', target: e.target, time: Date.now() });
  }, { capture: true });
</script>

<!-- Deferred main app -->
<script defer src="app.js"></script>

// In app.js (loads later)
window.addEventListener('DOMContentLoaded', () => {
  // Replay early events that occurred before JS loaded
  window.__EARLY_EVENTS__.forEach(event => {
    analytics.track(event);
  });
  
  // Now attach real handlers
  attachEventHandlers();
});
```

**Architecture Explanation:**
- Captures critical data before full app loads
- No blocking on main app bundle
- Progressive enhancement pattern
- Used in Google Analytics, Mixpanel, etc.

### Example 3: Dynamic Import for Code Splitting

```javascript
// Initial bundle (small, deferred)
<script type="module" defer>
  // App shell loads first
  import { renderShell } from './shell.js';
  renderShell();

  // Heavy features loaded on-demand (non-blocking)
  document.getElementById('openChart').addEventListener('click', async () => {
    const { ChartWidget } = await import('./chart-widget.js');
    new ChartWidget().render();
  });
</script>
```

**Performance Impact:**
- Initial bundle: ~20KB (fast parse & execute)
- Chart library: ~200KB (only loaded when needed)
- Non-blocking: Chart code doesn't delay initial render
- TTI improvement: 3-5 seconds saved

### Example 4: Async CSS Loading with Fallback

```html
<head>
  <!-- Critical inline CSS -->
  <style>
    .app-shell { /* minimal layout */ }
  </style>

  <!-- Async CSS loading -->
  <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="styles.css"></noscript>
  
  <!-- Fallback for browsers without JS -->
</head>
```

**JavaScript Polyfill for Older Browsers:**
```javascript
// loadCSS polyfill for older browsers
<script>
  !function(e){"use strict";
    var t=function(t,n,r){
      var o=e.document.createElement("link");
      o.rel="stylesheet";
      o.href=t;
      e.document.head.appendChild(o);
    };
    if(!e.loadCSS){e.loadCSS=t}
  }("undefined"!=typeof global?global:this);
</script>
```

**Why This Approach:**
- CSS doesn't block render
- Graceful degradation for no-JS users
- Production-tested pattern (used by Google, Facebook)

### Example 5: Resource Priority Management

```javascript
// React component with priority management
import { lazy, Suspense } from 'react';

// High priority: Loaded immediately
import Header from './Header';
import Hero from './Hero';

// Low priority: Lazy loaded
const Comments = lazy(() => import(/* webpackPrefetch: true */ './Comments'));
const RelatedProducts = lazy(() => import('./RelatedProducts'));

function ProductPage() {
  return (
    <>
      <Header /> {/* Render immediately */}
      <Hero />   {/* Render immediately */}
      
      <Suspense fallback={<div>Loading comments...</div>}>
        <Comments /> {/* Loads after initial render */}
      </Suspense>
      
      <Suspense fallback={<div>Loading products...</div>}>
        <RelatedProducts /> {/* Lowest priority */}
      </Suspense>
    </>
  );
}
```

**Webpack Magic Comments:**
- `webpackPrefetch: true` - Hints browser to fetch during idle time
- `webpackPreload: true` - Fetch in parallel with parent chunk
- Creates separate bundles, loaded non-blocking

**Performance Impact:**
- Initial bundle: 50KB vs 250KB (5x smaller)
- FCP: 1.2s vs 3.5s
- User sees content immediately, features load progressively

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience:**
- **Every 100ms of blocking = 1-2% conversion loss** (Amazon study)
- Users expect content in under 2 seconds
- 53% of mobile users abandon if load > 3s

**Business Impact:**
- Google uses LCP as ranking factor (SEO)
- Core Web Vitals affect search visibility
- Faster sites = higher engagement, more revenue

**Technical Debt:**
- Blocking resources compound at scale
- Third-party scripts are biggest culprits
- Fixing blocking issues prevents future performance degradation

### How It Works (Technical Summary)

**Browser Critical Rendering Path:**
1. **Receive HTML** → Stream parsing begins
2. **Encounter CSS** → Download starts, **rendering blocks**
3. **Build CSSOM** → CSS parsed into tree
4. **Encounter JS** → Parser blocks, download + execute
5. **DOM + CSSOM** → Render Tree constructed
6. **Layout** → Calculate positions
7. **Paint** → Draw pixels

**Making Resources Non-Blocking:**
- **CSS**: Inline critical, async load full stylesheet
- **JS**: Use `defer` (app code) or `async` (independent scripts)
- **Images**: Lazy load, use `loading="lazy"`, preload hero image
- **Fonts**: Preload critical fonts with `crossorigin`
- **Third-party**: Always async, use facades for widgets

**Key Optimization Principles:**
1. **Minimize Critical Path Length**: Fewer blocking resources
2. **Reduce Critical Path Bytes**: Smaller CSS/JS bundles
3. **Optimize Critical Path Order**: Most important resources first
4. **Defer Non-Critical**: Everything else loads after initial render

**Production Checklist:**
- ✅ Inline critical CSS (< 10KB)
- ✅ Defer all JavaScript (except tiny critical scripts)
- ✅ Preload LCP image
- ✅ Async all third-party scripts
- ✅ Code split JS bundles
- ✅ Lazy load below-fold images
- ✅ Set explicit dimensions (prevent CLS)
- ✅ Use resource hints (preconnect, dns-prefetch)
- ✅ Monitor with Lighthouse + RUM data

**Interview Talking Points:**
- "Blocking resources are the #1 cause of slow LCP"
- "CSS blocks render, JS blocks parser—both delay FCP"
- "Defer is almost always better than sync for JS"
- "Critical CSS inlining eliminates network round-trip"
- "At scale, every millisecond of blocking impacts revenue"

---

**Related Topics:**
- [43. Render-Blocking CSS & JavaScript](./43_Render_Blocking_CSS_JavaScript.md)
- [44. Critical CSS Inlining](./44_Critical_CSS_Inlining.md)
- [45. Preload vs Prefetch vs Preconnect](./45_Preload_vs_Prefetch_vs_Preconnect.md)
- [10. Critical Rendering Path (CRP)](./10_Critical_Rendering_Path.md)
- [70. FCP, LCP, CLS, TTI](./70_FCP_LCP_CLS_TTI.md)
