# 55. FCP, LCP, CLS, TTI

────────────────────────────────────
## 1. High-Level Explanation (Frontend Interview Level)
────────────────────────────────────

**FCP (First Contentful Paint), LCP (Largest Contentful Paint), CLS (Cumulative Layout Shift), and TTI (Time to Interactive)** are the four critical performance metrics that define how users perceive your web application's speed and stability. These metrics form the backbone of Google's Core Web Vitals and directly impact SEO rankings, user retention, and business outcomes.

### What These Metrics Are:

**FCP (First Contentful Paint)**:
- Time when the **first text, image, or canvas** renders on screen
- Marks the transition from blank page to "something is happening"
- User's first visual feedback that the page is loading

**LCP (Largest Contentful Paint)**:
- Time when the **largest visible content element** renders
- Typically the hero image, video, or large text block
- Represents perceived "page loaded" moment

**CLS (Cumulative Layout Shift)**:
- Sum of all **unexpected layout shifts** during page lifecycle
- Measures visual stability (buttons jumping, text shifting)
- Only unexpected shifts count (not user-initiated)

**TTI (Time to Interactive)**:
- Time when page becomes **fully interactive**
- Main thread is idle, event handlers are registered
- User can reliably interact with the page

### Why They Exist:

Traditional metrics like `window.onload` or DOMContentLoaded don't reflect actual user experience:
- A page can be "loaded" but still blank (CSR apps)
- A page can show content but be unresponsive (heavy JavaScript)
- A page can appear stable but elements keep shifting

These metrics were created to:
- **Align technical measurements with user perception**
- **Provide actionable optimization targets**
- **Enable apples-to-apples performance comparisons**
- **Drive industry toward user-centric performance**

### When and Where Used:

**Development Phase**:
- Lighthouse audits in Chrome DevTools
- Performance budgets in PR reviews
- Local testing before deployment

**CI/CD Pipeline**:
- Automated Lighthouse CI checks
- Performance regression testing
- Deployment gates (fail if metrics regress)

**Production Monitoring**:
- Real-User Monitoring (RUM) via tools like SpeedCurve, Datadog, New Relic
- A/B testing performance impact
- Geographic/device-specific monitoring

**Business Decisions**:
- Correlating metrics with conversion rates
- Prioritizing performance investments
- Measuring impact of architectural changes

### Role in Large-Scale Frontend Applications:

At FAANG scale, these metrics are:
- **Tracked per page type** (homepage, product page, checkout)
- **Segmented by dimensions** (device, network, geography, user cohort)
- **Monitored at P50, P75, P95, P99** percentiles
- **Tied to SLAs and team OKRs**
- **Used for capacity planning** and infrastructure decisions
- **Integrated into incident response** workflows

────────────────────────────────────
## 2. Deep-Dive Explanation (Senior / Staff Level)
────────────────────────────────────

### FCP (First Contentful Paint) - Deep Dive

#### Technical Definition:
FCP measures the time from navigation start until the browser renders the first bit of content from the DOM. This includes text, images (including background images), non-white `<canvas>` elements, or SVGs.

#### Browser Internals:
```
Navigation Start
    ↓
DNS Lookup
    ↓
TCP Connection
    ↓
TLS Negotiation
    ↓
Server Response (TTFB)
    ↓
HTML Parsing Begins
    ↓
CSSOM Construction
    ↓
Render Tree Construction
    ↓
Layout (Reflow)
    ↓
Paint
    ↓
🎯 FCP - First pixel of content painted
```

#### What Counts vs Doesn't Count:
✅ **Counts**: Text, images, `<svg>`, non-white `<canvas>`  
❌ **Doesn't Count**: White background, `<iframe>` contents, skeleton screens (unless actual content)

#### Performance Thresholds:
- **Good**: < 1.8 seconds
- **Needs Improvement**: 1.8 - 3.0 seconds
- **Poor**: > 3.0 seconds

#### Common Bottlenecks:

1. **Render-Blocking Resources**:
   ```html
   <!-- BAD: Blocks rendering -->
   <link rel="stylesheet" href="styles.css">
   <script src="analytics.js"></script>
   
   <!-- GOOD: Non-blocking -->
   <link rel="stylesheet" href="critical.css">
   <link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'">
   <script src="analytics.js" defer></script>
   ```

2. **Slow Server Response (TTFB)**:
   - High TTFB directly delays FCP
   - Target: < 200ms on 3G, < 100ms on fast connections
   - Fix: CDN, server-side caching, database optimization

3. **Large Critical CSS**:
   - Only inline critical above-the-fold CSS
   - Defer non-critical styles
   - Use tools like Critical, Critters, PurgeCSS

4. **Font Loading Delays**:
   ```css
   /* FOIT (Flash of Invisible Text) */
   @font-face {
     font-family: 'CustomFont';
     src: url('font.woff2');
     font-display: auto; /* Bad: invisible during load */
   }
   
   /* Better: Show fallback immediately */
   @font-face {
     font-family: 'CustomFont';
     src: url('font.woff2');
     font-display: swap; /* Show fallback, swap when loaded */
   }
   ```

#### Trade-offs:

**Inline Critical CSS vs External Stylesheet**:
- ✅ Inline: Faster FCP (no network request)
- ❌ Inline: Can't cache, larger HTML
- **Decision**: Inline critical CSS (< 14KB), defer rest

**Server-Side Rendering vs Client-Side Rendering**:
- ✅ SSR: Faster FCP (content in initial HTML)
- ❌ SSR: More complex, higher server cost, slower TTI
- **Decision**: SSR for content-heavy, CSR for app-heavy

---

### LCP (Largest Contentful Paint) - Deep Dive

#### Technical Definition:
LCP measures when the largest content element visible in the viewport becomes fully rendered. This is a user-centric metric representing perceived "the page has loaded."

#### What Elements Count:
- `<img>` elements
- `<image>` inside `<svg>`
- `<video>` elements (poster image)
- Background images loaded via `url()`
- Block-level text nodes

#### Performance Thresholds:
- **Good**: < 2.5 seconds
- **Needs Improvement**: 2.5 - 4.0 seconds
- **Poor**: > 4.0 seconds

#### The LCP Element Can Change:

```html
<!-- Initially, this h1 is LCP -->
<h1>Welcome</h1>

<!-- After image loads, this becomes LCP -->
<img src="hero.jpg" alt="Hero" width="1200" height="600">

<!-- Final LCP: largest element in viewport -->
```

**Why it changes**: As page loads progressively, larger elements appear and become the new LCP candidate. The metric stops changing after user interaction (scroll, click, tap).

#### Four Sub-Parts of LCP:

```
LCP = TTFB + Resource Load Time + Render Time + Delay Time

1. TTFB (Time to First Byte)
   - Server response time
   - Optimize: CDN, caching, database queries

2. Resource Load Time
   - Time to download LCP resource (image, video)
   - Optimize: compression, CDN, smaller files

3. Render Time
   - Browser parsing and painting
   - Optimize: reduce CSS complexity, avoid render-blocking

4. Delay Time
   - Any blocking before render (blocking scripts)
   - Optimize: async/defer scripts, code splitting
```

#### LCP Optimization Strategies:

**1. Preload LCP Resource**:
```html
<!-- Critical: Tell browser to fetch hero image ASAP -->
<link rel="preload" as="image" href="hero.jpg">
<link rel="preload" as="image" href="hero.webp" type="image/webp">

<!-- In body -->
<img src="hero.jpg" alt="Hero" width="1200" height="600">
```

**2. Optimize Images**:
```html
<!-- Modern image format -->
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero" 
       width="1200" height="600"
       loading="eager"> <!-- Don't lazy-load LCP image! -->
</picture>
```

**3. Server-Side Rendering for LCP Content**:
```javascript
// BAD: LCP element rendered client-side
function HeroSection() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/hero').then(r => r.json()).then(setData);
  }, []);
  
  if (!data) return <div>Loading...</div>;
  return <img src={data.image} alt={data.title} />;
}

// GOOD: LCP element in initial HTML (SSR/SSG)
export async function getServerSideProps() {
  const data = await fetchHeroData();
  return { props: { data } };
}

function HeroSection({ data }) {
  return <img src={data.image} alt={data.title} />;
}
```

**4. Avoid Render-Blocking Resources**:
```html
<!-- BAD: CSS blocks LCP -->
<link rel="stylesheet" href="all-styles.css">

<!-- GOOD: Critical CSS inline, rest deferred -->
<style>
  /* Critical above-the-fold CSS only */
  .hero { width: 100%; height: 600px; }
</style>
<link rel="preload" href="all-styles.css" as="style" onload="this.rel='stylesheet'">
```

#### Common LCP Anti-Patterns:

1. **Lazy-Loading LCP Image**:
   ```html
   <!-- WRONG: Delays LCP -->
   <img src="hero.jpg" loading="lazy">
   
   <!-- RIGHT: Load immediately -->
   <img src="hero.jpg" loading="eager">
   ```

2. **Client-Side Rendering LCP Content**:
   - SPA fetching data client-side
   - Fix: SSR, SSG, or critical data inlined

3. **Unoptimized Images**:
   - Large file sizes (5MB+ hero images)
   - Wrong formats (PNG instead of WebP/AVIF)
   - No compression

4. **Multiple Network Hops for LCP Resource**:
   ```html
   <!-- BAD: CSS → fetch font → blocks LCP text -->
   <link rel="stylesheet" href="fonts.css">
   
   <!-- GOOD: Preload font directly -->
   <link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
   ```

---

### CLS (Cumulative Layout Shift) - Deep Dive

#### Technical Definition:
CLS measures the sum of all individual layout shift scores for every unexpected layout shift that occurs during the entire lifespan of a page.

#### Layout Shift Score Formula:
```
Layout Shift Score = Impact Fraction × Distance Fraction

Impact Fraction:
- Area of viewport affected by the shift
- 0.0 (no impact) to 1.0 (100% of viewport)

Distance Fraction:
- Distance shifted / viewport dimension
- Element moved 25% of viewport height = 0.25
```

#### Example Calculation:
```
Scenario: Button 500px tall starts at top, shifts down 100px

Impact Fraction:
- Button takes 50% of 1000px viewport = 0.5

Distance Fraction:
- Moved 100px / 1000px viewport = 0.1

Layout Shift Score = 0.5 × 0.1 = 0.05
```

#### Performance Thresholds:
- **Good**: < 0.1
- **Needs Improvement**: 0.1 - 0.25
- **Poor**: > 0.25

#### What Causes Layout Shifts:

**1. Images Without Dimensions**:
```html
<!-- BAD: Browser can't reserve space -->
<img src="product.jpg" alt="Product">

<!-- GOOD: Explicit dimensions -->
<img src="product.jpg" alt="Product" width="400" height="300">

<!-- BETTER: Aspect ratio (modern CSS) -->
<img src="product.jpg" alt="Product" style="aspect-ratio: 4/3; width: 100%;">
```

**2. Ads, Embeds, Iframes Without Dimensions**:
```html
<!-- BAD: Ad loads and pushes content down -->
<div id="ad"></div>
<main>Content here</main>

<!-- GOOD: Reserve space -->
<div id="ad" style="min-height: 250px; background: #f0f0f0;">
  <!-- Ad loads here -->
</div>
<main>Content here</main>
```

**3. Dynamic Content Injection Above Existing Content**:
```javascript
// BAD: Inserts banner above content
function showPromo() {
  const banner = document.createElement('div');
  banner.textContent = 'Sale!';
  document.body.prepend(banner); // Pushes everything down
}

// GOOD: Reserve space or use overlay
function showPromo() {
  const banner = document.getElementById('promo-space'); // Pre-existing
  banner.textContent = 'Sale!';
  banner.style.display = 'block';
}
```

**4. Web Fonts Causing FOIT/FOUT**:
```css
/* BAD: Font loads, text re-renders, layout shifts */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
  font-display: block; /* Invisible text during load */
}

body {
  font-family: 'CustomFont', Arial, sans-serif;
}

/* GOOD: Use fallback with similar metrics */
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
  font-display: swap;
  /* Use font-metrics to match fallback */
  ascent-override: 105%;
  descent-override: 35%;
  line-gap-override: 0%;
  size-adjust: 95%;
}
```

**5. Animations Triggering Layout**:
```css
/* BAD: Triggers layout (reflow) */
.box {
  animation: grow 1s;
}

@keyframes grow {
  from { width: 100px; }
  to { width: 200px; }
}

/* GOOD: Use transform (composited) */
.box {
  width: 100px;
  animation: grow 1s;
}

@keyframes grow {
  from { transform: scaleX(1); }
  to { transform: scaleX(2); }
}
```

#### CLS Exemptions:
Layout shifts **don't count** if:
- User-initiated (within 500ms of tap, click, key press)
- Transform/opacity animations
- Viewport size changes (window resize, orientation change)

#### Advanced CLS Debugging:

```javascript
// Track which elements cause layout shifts
let clsScore = 0;
const shiftDetails = [];

new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // Ignore user-initiated shifts
    if (entry.hadRecentInput) continue;
    
    clsScore += entry.value;
    
    // Identify shifted elements
    const sources = entry.sources.map(source => ({
      node: source.node,
      previousRect: source.previousRect,
      currentRect: source.currentRect
    }));
    
    shiftDetails.push({
      score: entry.value,
      time: entry.startTime,
      sources
    });
    
    console.log('Layout Shift:', {
      score: entry.value.toFixed(4),
      cumulativeScore: clsScore.toFixed(4),
      sources
    });
  }
}).observe({ type: 'layout-shift', buffered: true });
```

#### CLS Optimization Strategies:

**1. Always Set Image/Video Dimensions**:
```html
<img src="image.jpg" width="800" height="600" alt="...">
<!-- Or use aspect-ratio -->
<img src="image.jpg" style="aspect-ratio: 16/9; width: 100%;" alt="...">
```

**2. Reserve Space for Dynamic Content**:
```css
.ad-slot {
  min-height: 250px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.skeleton-loader {
  height: 200px; /* Match expected content height */
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  animation: loading 1.5s infinite;
}
```

**3. Avoid Inserting Content Above Existing Content**:
```javascript
// Instead of prepending (causes shift):
container.prepend(newElement);

// Use fixed positioning or append:
container.append(newElement);

// Or use transform:
newElement.style.transform = 'translateY(-100%)';
container.prepend(newElement);
newElement.style.transform = 'translateY(0)';
```

**4. Preload Fonts to Avoid FOUT**:
```html
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
```

---

### TTI (Time to Interactive) - Deep Dive

#### Technical Definition:
TTI measures the time from page start until the page is fully interactive:
1. Page has displayed useful content (FCP has occurred)
2. Event handlers are registered for most visible page elements
3. Page responds to user interactions within 50ms

#### Technical Criteria:
```
TTI is the time when:
1. FCP has occurred
2. Main thread has been quiet for at least 5 seconds
   (no long tasks > 50ms)
3. Network is idle (< 2 in-flight requests)
```

#### Performance Thresholds:
- **Good**: < 3.8 seconds (mobile)
- **Needs Improvement**: 3.8 - 7.3 seconds
- **Poor**: > 7.3 seconds

#### Why TTI Matters:
Users can see content (FCP/LCP) but can't interact = **frustrating experience**
- Click button → nothing happens
- Scroll → janky or no response
- Type in input → delayed character appearance

#### Common TTI Bottlenecks:

**1. Heavy JavaScript Execution**:
```javascript
// BAD: Blocks main thread during parse/execute
<script src="bundle.js"></script> // 500KB uncompressed

// GOOD: Code split, defer non-critical
<script src="critical.js"></script> // 50KB
<script src="secondary.js" defer></script>
<script src="analytics.js" async></script>
```

**2. Long Tasks (> 50ms)**:
```javascript
// BAD: Blocks main thread for 300ms
function processData(items) {
  items.forEach(item => {
    // Heavy computation
    const result = complexCalculation(item);
    updateDOM(result);
  });
}

// GOOD: Break into chunks
function processData(items) {
  const chunkSize = 50;
  let index = 0;
  
  function processChunk() {
    const end = Math.min(index + chunkSize, items.length);
    
    for (let i = index; i < end; i++) {
      const result = complexCalculation(items[i]);
      updateDOM(result);
    }
    
    index = end;
    
    if (index < items.length) {
      // Let browser breathe (handle user input)
      requestIdleCallback(processChunk, { timeout: 1000 });
    }
  }
  
  processChunk();
}
```

**3. Third-Party Scripts**:
```javascript
// Third-party scripts often block main thread
// Load non-critical ones after TTI

window.addEventListener('load', () => {
  // Page interactive, now load analytics/marketing
  setTimeout(() => {
    const script = document.createElement('script');
    script.src = 'https://analytics.example.com/tracker.js';
    document.head.appendChild(script);
  }, 3000); // Delay 3s after load
});
```

**4. Polyfills and Legacy Bundles**:
```javascript
// BAD: All users download polyfills
<script src="bundle-with-polyfills.js"></script>

// GOOD: Differential loading (modern/legacy)
<script type="module" src="modern.js"></script>
<script nomodule src="legacy-with-polyfills.js"></script>
```

#### TTI vs TBT (Total Blocking Time):

**TBT** is often easier to optimize:
- Sum of blocking time from FCP to TTI
- Any task > 50ms contributes (task duration - 50ms)
- Lab metric (can measure locally)

```
Task 1: 80ms  → Blocking: 30ms
Task 2: 120ms → Blocking: 70ms
Task 3: 40ms  → Blocking: 0ms
Total Blocking Time = 100ms
```

#### TTI Optimization Strategies:

**1. Code Splitting**:
```javascript
// Route-based splitting (React)
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

**2. Defer Non-Critical JavaScript**:
```html
<!-- Critical: Loads immediately -->
<script src="app.js"></script>

<!-- Non-critical: Deferred -->
<script src="analytics.js" defer></script>
<script src="chat-widget.js" async></script>
```

**3. Tree Shaking & Dead Code Elimination**:
```javascript
// webpack.config.js
module.exports = {
  mode: 'production',
  optimization: {
    usedExports: true, // Tree shaking
    minimize: true,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10
        }
      }
    }
  }
};
```

**4. Use Web Workers for Heavy Computation**:
```javascript
// main.js
const worker = new Worker('worker.js');

worker.postMessage({ data: largeDataset });

worker.onmessage = (e) => {
  const result = e.data;
  updateUI(result);
};

// worker.js
self.onmessage = (e) => {
  const result = heavyComputation(e.data);
  self.postMessage(result);
};
```

**5. Reduce Third-Party Impact**:
```javascript
// Lazy-load third-party widgets
function loadChatWidget() {
  const script = document.createElement('script');
  script.src = 'https://chat.example.com/widget.js';
  script.async = true;
  document.body.appendChild(script);
}

// Load only when user shows intent
document.getElementById('chat-button').addEventListener('mouseenter', () => {
  loadChatWidget();
}, { once: true });
```

---

### Inter-Metric Relationships & Trade-offs

#### FCP vs TTI:
```
Early FCP + Late TTI = "Looks ready, but can't interact"

Example: SPA with SSR
- SSR: Fast FCP (content in HTML)
- Large JS bundle: Slow TTI (parsing/execution)

Solution: Progressive hydration, streaming SSR
```

#### LCP vs CLS:
```
Optimizing LCP can worsen CLS if not careful

Example: Eager-loading images
- Fast LCP: Image loads quickly
- Bad CLS: No dimensions set, layout shifts

Solution: Always set dimensions, use aspect-ratio
```

#### TTI vs FCP/LCP:
```
Aggressive code splitting can delay critical features

Example: Over-split code
- Fast FCP/LCP: Minimal initial JS
- Slow TTI: Many round-trips to load features

Solution: Balance—inline critical, defer secondary
```

### Percentile Analysis:

Different user segments see vastly different metrics:

```javascript
// Example metric distribution
const metricDistribution = {
  LCP: {
    p50: 2100,  // Median user: good experience
    p75: 3400,  // Slower devices/networks
    p90: 5200,  // Mobile 3G
    p95: 7800,  // Worst 5%: slow phones, poor networks
    p99: 12000  // Edge cases
  },
  
  // Pattern: Long tail on slow devices/networks
  // Optimize for P75-P95, not just P50
};
```

**Senior Insight**: At FAANG scale, you monitor P50 for average UX, but optimize for P75-P95 because that's where you lose users and revenue.

────────────────────────────────────
## 3. Clear Real-World Examples
────────────────────────────────────

### Example 1: E-Commerce Product Page (Amazon-Style)

**Scenario**: Product page with hero image, reviews, recommendations

#### Initial Metrics (Poorly Optimized):
```
FCP: 3.2s  ❌ (Render-blocking CSS/JS)
LCP: 5.8s  ❌ (Large hero image, lazy-loaded)
CLS: 0.35  ❌ (Images without dimensions, dynamic reviews)
TTI: 8.4s  ❌ (Heavy JS bundle, third-party scripts)
```

#### Issues Identified:

1. **FCP Problem**: Blocking resources
   ```html
   <!-- Before -->
   <link rel="stylesheet" href="all-styles.css"> <!-- 200KB -->
   <script src="bundle.js"></script> <!-- 800KB -->
   ```

2. **LCP Problem**: Hero image optimization
   ```html
   <!-- Before -->
   <img src="product-hero.jpg" loading="lazy"> <!-- 2.5MB, lazy! -->
   ```

3. **CLS Problem**: No dimensions, dynamic content
   ```html
   <!-- Before -->
   <img src="product.jpg"> <!-- No dimensions -->
   <div id="reviews"></div> <!-- Loads async, pushes content -->
   ```

4. **TTI Problem**: Monolithic bundle, blocking scripts
   ```javascript
   // Everything in one bundle
   import analytics from 'analytics';
   import chatWidget from 'chat';
   import allComponents from './components';
   ```

#### Optimizations Applied:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- 1. FCP: Inline critical CSS -->
  <style>
    /* Critical above-the-fold styles only (~10KB) */
    .hero { width: 100%; height: 600px; }
    .product-info { display: flex; }
    /* ... */
  </style>
  
  <!-- 2. LCP: Preload hero image -->
  <link rel="preload" as="image" href="hero.webp" type="image/webp">
  <link rel="preload" as="image" href="hero.jpg">
  
  <!-- 3. Defer non-critical CSS -->
  <link rel="preload" href="styles.css" as="style" onload="this.rel='stylesheet'">
  
  <!-- 4. TTI: Load critical JS only -->
  <script src="critical.js" defer></script>
</head>
<body>
  <!-- 5. LCP: Hero with dimensions, eager loading -->
  <picture>
    <source srcset="hero.avif" type="image/avif">
    <source srcset="hero.webp" type="image/webp">
    <img src="hero.jpg" alt="Product"
         width="1200" height="600"
         loading="eager"
         fetchpriority="high">
  </picture>
  
  <!-- 6. CLS: Reserve space for reviews -->
  <div id="reviews" style="min-height: 400px;">
    <div class="skeleton-loader"></div>
  </div>
  
  <!-- 7. CLS: All images with dimensions -->
  <img src="gallery-1.jpg" width="200" height="200" alt="View 1" loading="lazy">
  <img src="gallery-2.jpg" width="200" height="200" alt="View 2" loading="lazy">
  
  <!-- 8. TTI: Defer third-party scripts -->
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        // Load analytics after TTI
        const script = document.createElement('script');
        script.src = 'analytics.js';
        document.head.appendChild(script);
      }, 3000);
    });
  </script>
</body>
</html>
```

#### Results After Optimization:
```
FCP: 1.2s  ✅ (-2.0s, 63% improvement)
LCP: 2.1s  ✅ (-3.7s, 64% improvement)
CLS: 0.04  ✅ (-0.31, 89% improvement)
TTI: 3.2s  ✅ (-5.2s, 62% improvement)

Business Impact:
- Conversion rate: +11%
- Bounce rate: -18%
- Mobile cart abandonment: -23%
```

---

### Example 2: Social Media Feed (Twitter/Facebook-Style)

**Challenge**: Infinite scroll with images, videos, dynamic content

#### Critical Requirements:
```javascript
const performanceGoals = {
  initialLoad: {
    FCP: 1500,  // Show feed skeleton
    LCP: 2500,  // First posts visible
    TTI: 3500   // Can scroll/interact
  },
  
  scrolling: {
    CLS: 0.05,  // Minimal shifts as content loads
    fps: 60     // Smooth scrolling
  },
  
  interaction: {
    likeButton: 50,    // Instant feedback
    imageExpand: 100   // Smooth transitions
  }
};
```

#### Architecture:

```javascript
// Feed optimization strategy
class OptimizedFeed {
  constructor() {
    this.observer = new IntersectionObserver(this.loadContent);
    this.virtualizer = new VirtualScroller({
      itemHeight: 400, // Prevents CLS
      buffer: 3        // Preload 3 items ahead
    });
  }
  
  // 1. FCP: Show skeleton immediately
  renderSkeleton() {
    return Array(5).fill(null).map((_, i) => (
      <SkeletonPost key={i} height={400} /> // Fixed height prevents CLS
    ));
  }
  
  // 2. LCP: Progressive image loading
  renderPost(post) {
    return (
      <article style={{ minHeight: '400px' }}> {/* Reserve space */}
        <img 
          src={post.thumbnail} // Low-res placeholder
          data-src={post.fullImage} // Full-res loaded on intersection
          alt={post.title}
          width={600}
          height={400}
          loading="lazy" // Not LCP element, safe to lazy-load
          onLoad={this.handleImageLoad}
        />
      </article>
    );
  }
  
  // 3. TTI: Defer non-critical features
  componentDidMount() {
    // Critical: Render feed
    this.renderInitialFeed();
    
    // Non-critical: Load after TTI
    requestIdleCallback(() => {
      this.loadShareButtons();
      this.loadRecommendations();
      this.initializeAnalytics();
    });
  }
  
  // 4. CLS: Virtualization with fixed heights
  renderVirtualizedFeed() {
    return (
      <VirtualList
        height={800}
        itemCount={posts.length}
        itemSize={400} // Fixed height prevents CLS
        renderItem={({ index, style }) => (
          <div style={style}>
            <Post data={posts[index]} />
          </div>
        )}
      />
    );
  }
}
```

#### Metrics Tracking:

```javascript
// Monitor feed-specific metrics
class FeedPerformanceMonitor {
  trackScrollPerformance() {
    let lastScrollTime = performance.now();
    let frameDrops = 0;
    
    window.addEventListener('scroll', () => {
      const now = performance.now();
      const delta = now - lastScrollTime;
      
      // 60fps = 16.67ms per frame
      if (delta > 16.67) {
        frameDrops++;
      }
      
      lastScrollTime = now;
    });
    
    // Report if scroll is janky
    setInterval(() => {
      if (frameDrops > 10) {
        this.reportMetric('scroll-jank', { frameDrops });
      }
      frameDrops = 0;
    }, 5000);
  }
  
  trackImageLoad() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('image')) {
          this.reportMetric('image-load-time', entry.duration);
        }
      }
    });
    
    observer.observe({ entryTypes: ['resource'] });
  }
  
  trackCLS() {
    let cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          cls += entry.value;
          
          // Alert if CLS threshold exceeded
          if (cls > 0.1) {
            this.reportMetric('cls-threshold-exceeded', {
              score: cls,
              sources: entry.sources
            });
          }
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  }
}
```

---

### Example 3: Dashboard with Live Data (FAANG Monitoring)

**Challenge**: Real-time updates without sacrificing performance

#### Problem:
```javascript
// BAD: Frequent updates cause CLS and TTI issues
setInterval(() => {
  fetchLatestData().then(data => {
    updateAllCharts(data); // Causes layout shifts
  });
}, 1000); // Every second
```

#### Solution:

```javascript
// Performance-optimized dashboard
class Dashboard {
  constructor() {
    this.animationFrame = null;
    this.pendingUpdates = [];
  }
  
  // 1. FCP: Render static layout immediately
  renderInitialLayout() {
    return (
      <>
        <Header /> {/* Static */}
        <div className="charts-grid"> {/* Fixed dimensions */}
          {charts.map(chart => (
            <ChartContainer
              key={chart.id}
              style={{ 
                width: '100%', 
                height: '300px', // Prevents CLS
                minHeight: '300px' 
              }}
            >
              <ChartSkeleton />
            </ChartContainer>
          ))}
        </div>
      </>
    );
  }
  
  // 2. LCP: Load critical chart data first
  async loadData() {
    // Parallel fetch for above-fold charts
    const [criticalData, secondaryData] = await Promise.all([
      fetchCriticalCharts(), // Above fold
      fetchSecondaryCharts() // Below fold, deferred
    ]);
    
    this.updateCharts(criticalData);
    
    // Defer secondary data
    requestIdleCallback(() => {
      this.updateCharts(secondaryData);
    });
  }
  
  // 3. CLS: Batch updates, avoid layout thrashing
  scheduleUpdate(chartId, data) {
    this.pendingUpdates.push({ chartId, data });
    
    if (!this.animationFrame) {
      this.animationFrame = requestAnimationFrame(() => {
        this.flushUpdates();
      });
    }
  }
  
  flushUpdates() {
    // Read phase (no DOM writes)
    const layouts = this.pendingUpdates.map(update => {
      const chart = this.charts.get(update.chartId);
      return chart.calculateLayout(update.data);
    });
    
    // Write phase (batch DOM updates)
    layouts.forEach((layout, i) => {
      const update = this.pendingUpdates[i];
      const chart = this.charts.get(update.chartId);
      chart.render(layout); // Single paint
    });
    
    this.pendingUpdates = [];
    this.animationFrame = null;
  }
  
  // 4. TTI: Use Web Workers for heavy computation
  processMetrics(rawData) {
    return new Promise((resolve) => {
      const worker = new Worker('metrics-processor.js');
      
      worker.postMessage(rawData);
      
      worker.onmessage = (e) => {
        resolve(e.data);
        worker.terminate();
      };
    });
  }
  
  // 5. Real-time updates without CLS
  setupRealtimeUpdates() {
    const socket = new WebSocket('wss://metrics.example.com');
    
    socket.onmessage = (event) => {
      const update = JSON.parse(event.data);
      
      // Use CSS transforms (no layout shift)
      const chart = document.getElementById(update.chartId);
      
      // Animate data point addition
      chart.style.transform = 'translateX(-10px)';
      this.addDataPoint(update);
      
      requestAnimationFrame(() => {
        chart.style.transition = 'transform 300ms ease-out';
        chart.style.transform = 'translateX(0)';
      });
    };
  }
}
```

#### Results:
```
Initial Load:
FCP: 800ms  ✅ (Static layout)
LCP: 1900ms ✅ (First chart)
TTI: 2800ms ✅ (Interactive)

During Updates:
CLS: 0.02   ✅ (Transform-based animations)
Update Latency: 50ms ✅ (requestAnimationFrame batching)
```

────────────────────────────────────
## 4. Interview-Oriented Explanation
────────────────────────────────────

### Sample Interview Answer (7+ Years Experience)

**Question**: "Explain FCP, LCP, CLS, and TTI, and how you've optimized them in production."

**Strong Answer**:

"These are the four core user-centric performance metrics that I prioritize when building and optimizing web applications.

**FCP—First Contentful Paint**—is when the user sees something is happening. It's typically the first text or image rendered. In my last project, we improved FCP from 3.2s to 1.1s by inlining critical CSS, eliminating render-blocking scripts, and using a CDN to reduce TTFB.

**LCP—Largest Contentful Paint**—represents when the main content is visible. This is usually a hero image or the primary content block. The key insight is that LCP is what users perceive as "the page has loaded." I optimized this by preloading LCP resources, using modern image formats like WebP and AVIF, and ensuring we never lazy-load the LCP element—a common mistake I see in code reviews.

**CLS—Cumulative Layout Shift**—measures visual stability. Buttons jumping around as the page loads is incredibly frustrating. I've debugged many CLS issues caused by images without dimensions, dynamically injected ads, or web fonts causing text reflow. The solution is always to reserve space upfront—use aspect-ratio CSS, set explicit dimensions, or skeleton loaders.

**TTI—Time to Interactive**—is when the page actually responds to user input. Users can see your page (LCP) but still can't click buttons if JavaScript is still parsing. I focus on code splitting, deferring non-critical scripts, and using requestIdleCallback for background tasks. At my previous company, we moved from a 900KB monolithic bundle to route-based code splitting, dropping TTI from 8s to 3.2s on mobile.

**The key trade-off** I navigate is that optimizing one metric can hurt another. For example, server-side rendering improves FCP and LCP because content is in the initial HTML, but it can worsen TTI if you're shipping a large hydration bundle. I solved this with progressive hydration—rendering critical components immediately, deferring secondary ones.

**In production**, I monitor these at P75 and P95 percentiles, not just averages, because that's where you see the real user pain—slow devices, poor networks, users in emerging markets. We also have performance budgets in CI/CD—if a PR regresses LCP by more than 200ms, it fails the build.

**For measurement**, I use both synthetic monitoring in CI/CD via Lighthouse CI and real-user monitoring in production via our RUM platform, segmented by device type, network, and geography."

---

### Likely Follow-Up Questions

#### 1. **"How would you debug a slow LCP when you don't know the root cause?"**

**Answer**:
"I'd use a systematic approach:

First, I'd identify the LCP element using the PerformanceObserver API or Chrome DevTools Performance panel. It's often a hero image or main content block.

Second, I'd break LCP into its four components:
1. **TTFB** (Time to First Byte) - If this is slow (>500ms), it's a backend or network issue. I'd check server response times, database queries, CDN cache hit rates.

2. **Resource load time** - If the LCP element is an image taking 3+ seconds, I'd check image size, format (should be WebP/AVIF), and CDN performance. I'd also check if there's a redirect chain or CORS preflight adding latency.

3. **Render delay** - If there are render-blocking stylesheets or scripts, I'd defer non-critical CSS, inline critical CSS, and use async/defer on scripts.

4. **Element render time** - If the browser is slow to paint, I'd check for expensive CSS (box-shadow, filters), JavaScript blocking the main thread, or missing `width`/`height` attributes causing reflow.

Third, I'd use WebPageTest or Lighthouse to get a waterfall view and see if there's a cascade of requests before the LCP resource loads—this often points to font loading or JavaScript bundles that need to be split.

Finally, I'd check if we're accidentally lazy-loading the LCP element—I've seen this multiple times where developers apply `loading="lazy"` to all images, including the hero image, which delays LCP by seconds."

---

#### 2. **"What causes CLS and how do you fix it systematically?"**

**Answer**:
"CLS is caused by unexpected layout shifts, and there are five common culprits:

**1. Images without dimensions** - The most common issue. The fix is always set `width` and `height` attributes or use `aspect-ratio` CSS:
```html
<img src="image.jpg" width="800" height="600" alt="...">
```
Or modern approach:
```css
img { aspect-ratio: 16/9; width: 100%; }
```

**2. Ads and embeds** - They load asynchronously and push content down. I reserve space with `min-height`:
```html
<div class="ad-slot" style="min-height: 250px;"></div>
```

**3. Dynamically injected content** - Like banners or notifications added above existing content. I use one of three strategies:
- Reserve space from the start
- Use overlays instead of pushing content
- Animate using `transform` instead of changing layout

**4. Web fonts causing FOUT** - When custom fonts load, they can have different metrics than system fonts, causing text to reflow. I use `font-display: swap` and font metric adjustments:
```css
@font-face {
  font-family: 'CustomFont';
  src: url('font.woff2');
  font-display: swap;
  size-adjust: 95%; /* Match fallback font metrics */
}
```

**5. Animations that trigger layout** - Animating `width`, `height`, `top`, `left` causes reflow. I use `transform` and `opacity` instead, which are GPU-accelerated and don't trigger layout.

To debug systematically, I use the Layout Shift entries in PerformanceObserver to identify which elements are shifting:
```javascript
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Shift:', entry.sources);
  }
}).observe({ type: 'layout-shift', buffered: true });
```

I also use Chrome DevTools Performance panel with 'Experience' section enabled, which highlights layout shifts visually."

---

#### 3. **"How do you balance FCP/LCP (loading) vs TTI (interactivity)?"**

**Answer**:
"This is the classic trade-off between 'looking fast' and 'being fast.' The wrong approach is optimizing one at the expense of the other.

**The problem**: You can achieve fast FCP/LCP by shipping minimal JavaScript, but then users can't interact. Or you can make the page highly interactive (fast TTI) by inlining everything, but it takes forever to load.

**My approach**:

**1. Critical Path Optimization** - Identify the absolute minimum needed for FCP/LCP:
- Critical CSS (above-the-fold only)
- Minimal JavaScript for core interaction
- LCP resource (hero image)

Everything else is deferred.

**2. Progressive Enhancement** - Render a usable UI fast (FCP/LCP), then progressively enhance:
```javascript
// Initial render: Static HTML (fast FCP/LCP)
<button disabled>Add to Cart</button>

// After JS loads: Enhance (TTI achieved)
<button onclick="addToCart()">Add to Cart</button>
```

**3. Code Splitting** - Route-based or component-based:
- Critical route: Inline or small bundle (fast FCP/LCP/TTI)
- Secondary features: Lazy-loaded
- Below-fold content: Loaded on scroll

**4. Streaming SSR** - With React 18 or frameworks like Next.js:
- Server streams HTML immediately (fast FCP)
- Critical components render first (fast LCP)
- Non-critical components stream in later
- Hydration is progressive (faster TTI)

**5. Measure Both** - Set budgets for both:
```javascript
const budgets = {
  FCP: 1500,
  LCP: 2500,
  TTI: 3800,
  // Also measure the gap
  LCPtoTTIGap: 1500 // Max acceptable delay
};
```

**Real example**: At my last company, we had a product page with LCP at 2.1s but TTI at 7.8s because of a 1.2MB JavaScript bundle. We did route-based code splitting, reducing the initial bundle to 180KB. LCP stayed at 2.2s (acceptable), but TTI dropped to 3.1s—massive improvement in perceived and actual responsiveness."

---

#### 4. **"How do TTI and FID/INP relate? Which do you optimize for?"**

**Answer**:
"TTI and FID/INP measure different aspects of interactivity:

**TTI (Time to Interactive)**:
- Lab metric (can measure in Lighthouse)
- Measures when page *becomes* interactive
- Backward-looking: 'When did the main thread settle?'
- Useful for understanding initial load performance

**FID (First Input Delay)** - being replaced by INP:
- Field metric (requires real users)
- Measures responsiveness to *first* user interaction
- Tells you if the page felt responsive when user first engaged

**INP (Interaction to Next Paint)** - new standard:
- Field metric
- Measures *all* interactions throughout page lifecycle
- More comprehensive than FID
- Good: < 200ms, Poor: > 500ms

**The relationship**:
- Fast TTI often means good FID/INP (main thread is less busy)
- But you can have good TTI and bad INP if you have long tasks triggered by user actions

**Which to optimize**:
- In development (lab): Optimize TTI—it's measurable and actionable
- In production (field): Monitor INP—it reflects real user experience

**My optimization strategy**:
1. **Reduce TTI** via code splitting, defer non-critical JS
2. **Monitor INP** in production with RUM
3. **Optimize long tasks** that cause poor INP:
   - Break up heavy computation with requestIdleCallback
   - Debounce expensive event handlers
   - Use Web Workers for heavy processing
   - Avoid synchronous layout reads/writes

**Example**: We had TTI of 3.5s (good) but INP was 450ms (poor). Investigation showed our table sort was blocking the main thread for 400ms. We moved sorting to a Web Worker, dropping INP to 120ms without affecting TTI."

---

#### 5. **"What's your process for preventing performance regressions?"**

**Answer**:
"Prevention is critical because regressions accumulate—you ship small features, each slightly degrading performance, and suddenly your P95 LCP is 8 seconds.

**My multi-layer approach**:

**1. Performance Budgets in CI/CD**:
```javascript
// lighthouse-ci.json
{
  "ci": {
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "maxNumericValue": 1800 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 200 }]
      }
    }
  }
}
```
If a PR fails budgets, it doesn't merge.

**2. Bundle Size Tracking**:
- Bundlesize or bundlephobia in CI
- Alert if bundle grows >10KB
- Visualize with webpack-bundle-analyzer

**3. Synthetic Monitoring**:
- Lighthouse CI runs on every deploy
- WebPageTest scheduled tests from multiple geos
- Trend analysis—catch gradual degradation

**4. Real-User Monitoring**:
- P75/P95 metrics dashboards
- Alerts on metric degradation (>10% increase)
- Segmented by route, device, network

**5. Performance Reviews**:
- Quarterly performance audits
- Review top regressions
- Share learnings across teams

**6. Culture**:
- Performance is part of definition of done
- Engineers own their metrics
- Performance champions in each team

**Real story**: We caught a 2.3s LCP regression in CI before production. A developer added a 3MB hero image. Without budgets, it would've shipped, affecting millions of users."

────────────────────────────────────
## 5. Code Examples (When Applicable)
────────────────────────────────────

### Comprehensive Metrics Tracking Library

```javascript
/**
 * Production-grade Core Web Vitals monitoring
 * Tracks FCP, LCP, CLS, FID/INP, TTI
 */
class CoreWebVitalsMonitor {
  constructor(config = {}) {
    this.config = {
      reportEndpoint: '/api/metrics',
      sampleRate: 1.0,
      enabledMetrics: ['FCP', 'LCP', 'CLS', 'FID', 'INP', 'TTI'],
      ...config
    };
    
    this.metrics = {};
    this.sessionId = this.generateSessionId();
    
    if (Math.random() <= this.config.sampleRate) {
      this.init();
    }
  }
  
  init() {
    this.trackFCP();
    this.trackLCP();
    this.trackCLS();
    this.trackFID();
    this.trackINP();
    this.trackTTI();
    this.setupReporting();
  }
  
  // FCP - First Contentful Paint
  trackFCP() {
    if (!this.config.enabledMetrics.includes('FCP')) return;
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.FCP = Math.round(entry.startTime);
          
          console.log('[FCP]', this.metrics.FCP, 'ms');
          
          // Rate FCP
          this.metrics.FCPRating = this.metrics.FCP <= 1800 ? 'good' :
                                   this.metrics.FCP <= 3000 ? 'needs-improvement' :
                                   'poor';
          
          observer.disconnect();
        }
      }
    });
    
    observer.observe({ type: 'paint', buffered: true });
  }
  
  // LCP - Largest Contentful Paint
  trackLCP() {
    if (!this.config.enabledMetrics.includes('LCP')) return;
    
    let lcpValue = 0;
    let lcpElement = null;
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      
      lcpValue = Math.round(lastEntry.renderTime || lastEntry.loadTime);
      lcpElement = lastEntry.element;
      
      this.metrics.LCP = lcpValue;
      this.metrics.LCPElement = this.getElementSelector(lcpElement);
      this.metrics.LCPRating = lcpValue <= 2500 ? 'good' :
                               lcpValue <= 4000 ? 'needs-improvement' :
                               'poor';
      
      console.log('[LCP]', this.metrics.LCP, 'ms', this.metrics.LCPElement);
    });
    
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
    
    // Stop observing after user interaction
    ['keydown', 'click', 'scroll'].forEach(event => {
      window.addEventListener(event, () => {
        observer.disconnect();
      }, { once: true, passive: true });
    });
  }
  
  // CLS - Cumulative Layout Shift
  trackCLS() {
    if (!this.config.enabledMetrics.includes('CLS')) return;
    
    let clsValue = 0;
    let clsEntries = [];
    
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        // Only count layout shifts without recent user input
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          
          clsEntries.push({
            value: entry.value,
            time: entry.startTime,
            sources: entry.sources?.map(source => ({
              node: this.getElementSelector(source.node),
              previousRect: source.previousRect,
              currentRect: source.currentRect
            }))
          });
          
          this.metrics.CLS = Math.round(clsValue * 10000) / 10000;
          this.metrics.CLSEntries = clsEntries;
          this.metrics.CLSRating = clsValue <= 0.1 ? 'good' :
                                   clsValue <= 0.25 ? 'needs-improvement' :
                                   'poor';
          
          console.log('[CLS]', this.metrics.CLS, entry.sources);
        }
      }
    });
    
    observer.observe({ type: 'layout-shift', buffered: true });
  }
  
  // FID - First Input Delay (legacy)
  trackFID() {
    if (!this.config.enabledMetrics.includes('FID')) return;
    
    const observer = new PerformanceObserver((list) => {
      const firstInput = list.getEntries()[0];
      
      const fidValue = Math.round(firstInput.processingStart - firstInput.startTime);
      
      this.metrics.FID = fidValue;
      this.metrics.FIDTarget = this.getElementSelector(firstInput.target);
      this.metrics.FIDRating = fidValue <= 100 ? 'good' :
                               fidValue <= 300 ? 'needs-improvement' :
                               'poor';
      
      console.log('[FID]', this.metrics.FID, 'ms', this.metrics.FIDTarget);
      
      observer.disconnect();
    });
    
    observer.observe({ type: 'first-input', buffered: true });
  }
  
  // INP - Interaction to Next Paint (approximation)
  trackINP() {
    if (!this.config.enabledMetrics.includes('INP')) return;
    
    let worstINP = 0;
    let worstINPEntry = null;
    
    // Track all interactions
    const interactionHandler = (event) => {
      const startTime = performance.now();
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const duration = performance.now() - startTime;
          
          if (duration > worstINP) {
            worstINP = duration;
            worstINPEntry = {
              type: event.type,
              target: this.getElementSelector(event.target),
              duration
            };
            
            this.metrics.INP = Math.round(worstINP);
            this.metrics.INPEntry = worstINPEntry;
            this.metrics.INPRating = worstINP <= 200 ? 'good' :
                                     worstINP <= 500 ? 'needs-improvement' :
                                     'poor';
            
            console.log('[INP]', this.metrics.INP, 'ms', worstINPEntry);
          }
        });
      });
    };
    
    ['click', 'keydown', 'pointerdown'].forEach(eventType => {
      window.addEventListener(eventType, interactionHandler, { passive: true });
    });
  }
  
  // TTI - Time to Interactive (simplified estimation)
  trackTTI() {
    if (!this.config.enabledMetrics.includes('TTI')) return;
    
    // Wait for page to be mostly idle
    window.addEventListener('load', () => {
      // Use a heuristic: DOMContentLoaded + some idle time
      const navigation = performance.getEntriesByType('navigation')[0];
      
      if (!navigation) return;
      
      // Simplified TTI approximation
      const ttiEstimate = navigation.domInteractive;
      
      this.metrics.TTI = Math.round(ttiEstimate);
      this.metrics.TTIRating = ttiEstimate <= 3800 ? 'good' :
                               ttiEstimate <= 7300 ? 'needs-improvement' :
                               'poor';
      
      console.log('[TTI]', this.metrics.TTI, 'ms');
      
      // Track long tasks (> 50ms)
      if ('PerformanceLongTaskTiming' in window) {
        const longTaskObserver = new PerformanceObserver((list) => {
          const longTasks = list.getEntries();
          this.metrics.longTaskCount = (this.metrics.longTaskCount || 0) + longTasks.length;
          
          // Calculate Total Blocking Time
          const tbt = longTasks.reduce((sum, task) => {
            return sum + Math.max(0, task.duration - 50);
          }, 0);
          
          this.metrics.TBT = (this.metrics.TBT || 0) + tbt;
        });
        
        try {
          longTaskObserver.observe({ type: 'longtask', buffered: true });
        } catch (e) {
          // longtask not supported
        }
      }
    });
  }
  
  // Helper: Get CSS selector for element
  getElementSelector(element) {
    if (!element) return 'unknown';
    
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
    
    return `${tag}${id}${classes}`;
  }
  
  // Setup beacon reporting
  setupReporting() {
    const sendMetrics = () => {
      const payload = {
        ...this.metrics,
        url: window.location.href,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        connection: navigator.connection?.effectiveType,
        deviceMemory: navigator.deviceMemory,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };
      
      // Send via beacon (reliable even on page close)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(this.config.reportEndpoint, blob);
      } else {
        // Fallback
        fetch(this.config.reportEndpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
          keepalive: true,
          headers: { 'Content-Type': 'application/json' }
        }).catch(err => console.error('Metrics send failed:', err));
      }
    };
    
    // Send on visibility change (tab switch, close)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        sendMetrics();
      }
    });
    
    // Fallback for page close
    window.addEventListener('pagehide', sendMetrics);
  }
  
  generateSessionId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Public API: Get current metrics
  getMetrics() {
    return { ...this.metrics };
  }
}

// Usage
const monitor = new CoreWebVitalsMonitor({
  reportEndpoint: 'https://analytics.example.com/metrics',
  sampleRate: 0.1, // 10% sampling
  enabledMetrics: ['FCP', 'LCP', 'CLS', 'INP', 'TTI']
});

// Expose globally for debugging
window.__performanceMonitor = monitor;
```

---

### React Component Performance Wrapper

```javascript
import { useEffect, useRef, Profiler } from 'react';

/**
 * HOC that tracks component-level FCP, LCP contribution, and render performance
 */
function withPerformanceMetrics(Component, componentName) {
  return function PerformanceTrackedComponent(props) {
    const mountTime = useRef(null);
    const renderCount = useRef(0);
    
    useEffect(() => {
      // Track component mount time (contributes to FCP/LCP)
      if (!mountTime.current) {
        mountTime.current = performance.now();
        
        performance.mark(`${componentName}-mount`);
        
        // Check if this is the LCP element
        const element = document.getElementById(componentName);
        if (element) {
          const rect = element.getBoundingClientRect();
          const viewportArea = window.innerWidth * window.innerHeight;
          const elementArea = rect.width * rect.height;
          const coverage = elementArea / viewportArea;
          
          if (coverage > 0.3) { // Likely LCP candidate
            console.log(`[LCP Candidate] ${componentName}`, {
              mountTime: mountTime.current,
              coverage: `${(coverage * 100).toFixed(1)}%`
            });
          }
        }
      }
    }, []);
    
    // Profiler callback for render performance
    const onRender = (
      id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    ) => {
      renderCount.current++;
      
      // Alert on slow renders (impacts TTI)
      if (actualDuration > 16) {
        console.warn(`[Slow Render] ${componentName}`, {
          phase,
          actualDuration: `${actualDuration.toFixed(2)}ms`,
          baseDuration: `${baseDuration.toFixed(2)}ms`,
          renderCount: renderCount.current
        });
        
        // Send to analytics
        window.__performanceMonitor?.trackCustomMetric(
          `slow-render-${componentName}`,
          actualDuration
        );
      }
      
      // Alert on excessive re-renders
      if (renderCount.current > 20) {
        console.warn(`[Excessive Renders] ${componentName}`, {
          count: renderCount.current,
          suggestion: 'Consider memoization or refactoring'
        });
      }
    };
    
    return (
      <Profiler id={componentName} onRender={onRender}>
        <Component {...props} />
      </Profiler>
    );
  };
}

// Usage
const HeroSection = ({ image, title }) => (
  <section id="HeroSection" style={{ width: '100%', height: '600px' }}>
    <img 
      src={image} 
      alt={title}
      width={1200}
      height={600}
      loading="eager"
      fetchpriority="high"
    />
  </section>
);

export default withPerformanceMetrics(HeroSection, 'HeroSection');
```

---

### Performance Budget Enforcement (CI/CD)

```javascript
#!/usr/bin/env node

/**
 * Lighthouse CI - Performance Budget Enforcement
 * Run in CI/CD to fail builds that violate budgets
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');

const PERFORMANCE_BUDGETS = {
  'first-contentful-paint': {
    budget: 1800,
    weight: 1.0
  },
  'largest-contentful-paint': {
    budget: 2500,
    weight: 1.5 // Higher weight = more important
  },
  'cumulative-layout-shift': {
    budget: 0.1,
    weight: 1.2
  },
  'total-blocking-time': {
    budget: 200,
    weight: 1.0
  },
  'speed-index': {
    budget: 3400,
    weight: 0.8
  },
  'interactive': {
    budget: 3800,
    weight: 1.0
  }
};

const PAGES_TO_TEST = [
  { url: 'http://localhost:3000/', name: 'Homepage' },
  { url: 'http://localhost:3000/products', name: 'Product Listing' },
  { url: 'http://localhost:3000/product/123', name: 'Product Detail' }
];

async function runLighthouse(url) {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox']
  });
  
  const options = {
    logLevel: 'error',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1
    },
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2
    }
  };
  
  const runnerResult = await lighthouse(url, options);
  await chrome.kill();
  
  return runnerResult.lhr;
}

function evaluateBudgets(results, pageName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Performance Report: ${pageName}`);
  console.log('='.repeat(60));
  
  let totalScore = 0;
  let totalWeight = 0;
  let failures = [];
  
  for (const [metricKey, budgetConfig] of Object.entries(PERFORMANCE_BUDGETS)) {
    const audit = results.audits[metricKey];
    if (!audit) continue;
    
    const value = audit.numericValue;
    const budget = budgetConfig.budget;
    const weight = budgetConfig.weight;
    
    const passed = value <= budget;
    const percentDiff = ((value - budget) / budget * 100).toFixed(1);
    
    totalWeight += weight;
    
    if (passed) {
      totalScore += weight;
      console.log(`✅ ${metricKey}`);
      console.log(`   Value: ${value.toFixed(0)} | Budget: ${budget} | Status: PASS`);
    } else {
      console.log(`❌ ${metricKey}`);
      console.log(`   Value: ${value.toFixed(0)} | Budget: ${budget} | Over by: ${percentDiff}%`);
      failures.push({
        metric: metricKey,
        value,
        budget,
        percentOver: percentDiff
      });
    }
  }
  
  const scorePercent = (totalScore / totalWeight * 100).toFixed(1);
  
  console.log('\n' + '-'.repeat(60));
  console.log(`📈 Overall Score: ${scorePercent}% (${totalScore.toFixed(1)}/${totalWeight})`);
  
  return {
    passed: failures.length === 0,
    score: scorePercent,
    failures
  };
}

async function main() {
  console.log('🚀 Running Lighthouse Performance Audits...\n');
  
  const results = [];
  
  for (const page of PAGES_TO_TEST) {
    console.log(`🔍 Auditing: ${page.name} (${page.url})`);
    
    try {
      const lhr = await runLighthouse(page.url);
      const evaluation = evaluateBudgets(lhr, page.name);
      
      results.push({
        page: page.name,
        url: page.url,
        ...evaluation
      });
    } catch (error) {
      console.error(`❌ Error auditing ${page.name}:`, error.message);
      results.push({
        page: page.name,
        url: page.url,
        passed: false,
        error: error.message
      });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  
  const allPassed = results.every(r => r.passed);
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} | ${result.page} | Score: ${result.score || 'N/A'}%`);
    
    if (result.failures && result.failures.length > 0) {
      result.failures.forEach(f => {
        console.log(`      ⚠️  ${f.metric}: ${f.value.toFixed(0)} (${f.percentOver}% over budget)`);
      });
    }
  });
  
  // Write detailed report
  fs.writeFileSync(
    'lighthouse-report.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n📄 Detailed report saved to: lighthouse-report.json');
  
  if (!allPassed) {
    console.log('\n❌ Performance budgets violated. Build failed.');
    process.exit(1);
  } else {
    console.log('\n✅ All performance budgets met. Build passed.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

────────────────────────────────────
## 6. Why & How Summary
────────────────────────────────────

### Why It Matters

**User Experience**:
- **FCP**: First sign of progress—reduces perceived wait time
- **LCP**: Represents "page loaded" perception—users can consume content
- **CLS**: Visual stability—prevents frustration from shifting elements
- **TTI**: Actual usability—users can interact with confidence

**Business Impact**:
- **BBC**: Lost 10% of users for every additional second of load time
- **Pinterest**: Reduced perceived wait time by 40% → 15% increase in sign-ups
- **Walmart**: Every 1s improvement → 2% increase in conversions
- **Amazon**: 100ms delay → 1% drop in sales

**SEO & Ranking**:
- Google uses Core Web Vitals (LCP, CLS, FID/INP) as ranking signals
- Faster sites get better visibility in search results
- Mobile-first indexing prioritizes performance

**Competitive Advantage**:
- Users compare your site to competitors
- Faster sites perceived as more professional and trustworthy
- Performance is a moat in emerging markets with slow networks

### How It Works

**Technical Flow**:
```
User navigates
    ↓
[TTFB] Server responds
    ↓
[FCP] First pixel of content painted
    ↓
[LCP] Largest content element painted
    ↓
[CLS] Layout stability measured continuously
    ↓
[TTI] Main thread idle, page interactive
    ↓
[INP] Ongoing responsiveness to user interactions
```

**Measurement**:
1. **Browser Performance APIs** collect timing data
2. **PerformanceObserver** reports metrics in real-time
3. **Beacon API** sends data reliably (even on page close)
4. **Backend aggregation** by percentiles, dimensions
5. **Dashboards visualize** trends and regressions
6. **Alerts trigger** when thresholds exceeded

**Optimization Strategy**:
1. **Measure**: Establish baselines (P50, P75, P95)
2. **Set budgets**: Define acceptable thresholds
3. **Identify bottlenecks**: Use waterfall charts, flamegraphs
4. **Optimize**: Apply targeted fixes (critical path, code splitting, image optimization)
5. **Validate**: Test with Lighthouse, RUM
6. **Prevent regressions**: CI/CD gates, monitoring alerts
7. **Iterate**: Continuously improve based on data

**Key Principle**: 
> "Measure what users perceive, optimize for the long tail (P95), prevent regressions automatically."

────────────────────────────────────

**In a senior/staff interview, demonstrate**:
- Deep understanding of what each metric represents and why it exists
- Experience optimizing all four metrics in production systems
- Knowledge of trade-offs (e.g., SSR improves LCP but can worsen TTI)
- Familiarity with browser Performance APIs and debugging tools
- Real war stories of debugging performance issues at scale
- Systematic approach to prevention (budgets, monitoring, culture)
- Business acumen (connecting metrics to user behavior and revenue)
