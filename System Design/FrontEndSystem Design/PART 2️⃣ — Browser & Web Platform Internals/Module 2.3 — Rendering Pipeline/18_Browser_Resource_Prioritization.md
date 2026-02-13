# 18. Browser Resource Prioritization

## 1. High-Level Explanation (Frontend Interview Level)

**Browser Resource Prioritization** controls the order and priority of resource loading—browsers assign priorities based on resource type and viewport position, and developers can influence this with hints like preload, prefetch, and fetchpriority to optimize loading performance.

- **Fetch Priority**: High (critical CSS/fonts), Medium (images in viewport), Low (offscreen images)
- **Resource Hints**: preload (high priority now), prefetch (low priority future), preconnect (early DNS/TLS)
- **Priority Hints**: fetchpriority attribute to manually adjust resource priority

**Key Principle**: "Load critical resources first—optimize network waterfall with priority hints."

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Default Browser Prioritization

**Browser's Priority Queue**:
```
Highest Priority:
├── HTML document (blocks everything)
├── CSS in <head> (render-blocking)
└── JavaScript <script> in <head> (parser-blocking)

High Priority:
├── Fonts (if used in viewport)
├── Images in viewport
└── XHR/fetch (explicitly high priority)

Medium Priority:
├── Images in viewport (not critical)
├── <script async> in <head>
└── Early images (above fold)

Low Priority:
├── Images below viewport (lazy load)
├── <script defer>
└── Prefetch resources

Lowest Priority:
└── Resources for next navigation
```

**Resource Type Priorities** (Chrome):
```
Priority Levels (0-5):
5 (Highest):  Main HTML, blocking CSS, blocking JS
4 (High):     Fonts, Images in viewport, early XHR
3 (Medium):   Images slightly below viewport, async scripts
2 (Low):      Images far below viewport, deferred scripts
1 (Lowest):   Prefetch resources
0 (Idle):     Background fetch
```

---

### Resource Hints

#### 1. **Preload** (Load Now, High Priority)

**Purpose**: Tell browser to fetch resource NOW with high priority.

**Syntax**:
```html
<link rel="preload" href="font.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="critical.css" as="style">
<link rel="preload" href="hero.jpg" as="image">
<link rel="preload" href="app.js" as="script">
```

**Use Cases**:
```html
<!-- ✅ Critical fonts (avoid FOIT/FOUT) -->
<link rel="preload" href="/fonts/heading.woff2" as="font" crossorigin>

<!-- ✅ Critical CSS (before link stylesheet) -->
<link rel="preload" href="/styles/critical.css" as="style">
<link rel="stylesheet" href="/styles/critical.css">

<!-- ✅ Hero image (LCP candidate) -->
<link rel="preload" href="/images/hero.jpg" as="image">

<!-- ✅ Critical JavaScript (before script tag) -->
<link rel="preload" href="/js/critical.js" as="script">
```

**Benefits**:
- Starts download ASAP (high priority)
- Discovered before parser reaches resource
- Reduces latency (parallel download)

**Drawbacks**:
- **Not cached across pages** (page-specific)
- **Wastes bandwidth** if not used
- **Can delay other resources** (steals priority)

**Best Practice**:
```html
<!-- ❌ BAD: Preload everything (wastes bandwidth) -->
<link rel="preload" href="font1.woff2" as="font">
<link rel="preload" href="font2.woff2" as="font">
<link rel="preload" href="image1.jpg" as="image">
<link rel="preload" href="image2.jpg" as="image">

<!-- ✅ GOOD: Preload only critical (LCP candidates) -->
<link rel="preload" href="heading-font.woff2" as="font" crossorigin>
<link rel="preload" href="hero-image.jpg" as="image">
```

---

#### 2. **Prefetch** (Load Later, Low Priority)

**Purpose**: Tell browser to fetch resource for FUTURE navigation (low priority).

**Syntax**:
```html
<link rel="prefetch" href="/page2.html">
<link rel="prefetch" href="/page2.js">
<link rel="prefetch" href="/page2.css">
```

**Use Cases**:
```html
<!-- ✅ Next page assets (likely navigation) -->
<link rel="prefetch" href="/product-page.html">
<link rel="prefetch" href="/product-page.js">

<!-- ✅ Search results (user typing) -->
<input type="search" oninput="prefetchResults()">
<script>
function prefetchResults() {
  const query = input.value;
  if (query.length > 2) {
    // Prefetch likely result page
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/search?q=${query}`;
    document.head.appendChild(link);
  }
}
</script>

<!-- ✅ Product details (user hovering) -->
<a href="/product/123" onmouseenter="prefetch('/product/123')">
  Product 123
</a>
```

**Benefits**:
- Low priority (doesn't block critical resources)
- **Cached across navigations** (HTTP cache)
- Instant navigation (already downloaded)

**Drawbacks**:
- Wasted bandwidth if user doesn't navigate
- Low priority (may not finish before navigation)

**Prefetch vs Preload**:
```
Preload:
├── High priority (NOW)
├── Current page
├── Not cached across pages
└── Use for critical resources

Prefetch:
├── Low priority (FUTURE)
├── Next page
├── Cached across pages (HTTP cache)
└── Use for likely next navigation
```

---

#### 3. **Preconnect** (Early Connection Setup)

**Purpose**: Establish early DNS + TCP + TLS connection (save ~100-300ms).

**Syntax**:
```html
<link rel="preconnect" href="https://cdn.example.com">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://api.example.com">
```

**Connection Steps**:
```
Without preconnect:
1. Parse HTML (10ms)
2. Discover <link href="https://cdn.example.com/style.css">
3. DNS lookup (50ms)
4. TCP handshake (30ms)
5. TLS negotiation (50ms)
6. HTTP request (50ms)
7. Download (100ms)
Total: 290ms

With preconnect:
<link rel="preconnect" href="https://cdn.example.com">
0. DNS lookup (50ms) ← During HTML parse
0. TCP handshake (30ms) ← During HTML parse
0. TLS negotiation (50ms) ← During HTML parse
1. Parse HTML (10ms)
2. Discover <link href="https://cdn.example.com/style.css">
3. HTTP request (50ms) ← Connection ready!
4. Download (100ms)
Total: 160ms (saved 130ms)
```

**Use Cases**:
```html
<!-- ✅ CDN for static assets -->
<link rel="preconnect" href="https://cdn.example.com">

<!-- ✅ Google Fonts (2 domains) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- ✅ API server (known origin) -->
<link rel="preconnect" href="https://api.example.com">

<!-- ✅ Third-party analytics (known) -->
<link rel="preconnect" href="https://www.google-analytics.com">
```

**Benefits**:
- Saves DNS + TCP + TLS time (~100-300ms)
- Parallel with HTML parsing
- Low cost (just connection, no data transfer)

**Drawbacks**:
- Connection kept open (~10s idle, consumes resources)
- Limit to 6-10 preconnects (browser limit)
- Wasted if not used within ~10s

**Best Practice**:
```html
<!-- ❌ BAD: Too many preconnects (wasted connections) -->
<link rel="preconnect" href="https://cdn1.com">
<link rel="preconnect" href="https://cdn2.com">
<link rel="preconnect" href="https://cdn3.com">
... (20 preconnects)

<!-- ✅ GOOD: Only critical origins -->
<link rel="preconnect" href="https://cdn.example.com"> <!-- Main CDN -->
<link rel="preconnect" href="https://api.example.com"> <!-- API -->
```

---

#### 4. **DNS-Prefetch** (DNS Only)

**Purpose**: Resolve DNS only (cheaper than preconnect).

**Syntax**:
```html
<link rel="dns-prefetch" href="https://cdn.example.com">
```

**DNS-Prefetch vs Preconnect**:
```
DNS-Prefetch:
├── DNS lookup ONLY (cheapest)
├── No TCP/TLS (saved ~30ms, costs ~20ms)
├── Use for many origins (20+)

Preconnect:
├── DNS + TCP + TLS (saves ~100-300ms)
├── Keeps connection open (~10s)
├── Use for critical origins (3-5)
```

**Use Cases**:
```html
<!-- ✅ Many third-party origins (ads, social) -->
<link rel="dns-prefetch" href="https://facebook.com">
<link rel="dns-prefetch" href="https://twitter.com">
<link rel="dns-prefetch" href="https://ads-provider.com">
... (20+ domains OK)

<!-- vs -->

<!-- ✅ Critical origins (preconnect) -->
<link rel="preconnect" href="https://cdn.example.com">
<link rel="preconnect" href="https://api.example.com">
... (3-5 domains max)
```

---

### Priority Hints (fetchpriority)

**Purpose**: Manually adjust resource priority (Chrome 101+).

**Syntax**:
```html
<!-- Image priority -->
<img src="hero.jpg" fetchpriority="high">
<img src="thumbnail.jpg" fetchpriority="low">

<!-- Script priority -->
<script src="critical.js" fetchpriority="high"></script>
<script src="analytics.js" fetchpriority="low"></script>

<!-- Link priority -->
<link rel="preload" href="font.woff2" as="font" fetchpriority="high">
```

**Values**:
- `fetchpriority="high"` — Increase priority (critical LCP image)
- `fetchpriority="low"` — Decrease priority (analytics, ads)
- `fetchpriority="auto"` — Browser default (default)

**Use Cases**:

**1. Boost LCP Image**:
```html
<!-- Hero image (LCP candidate) -->
<img src="hero.jpg" fetchpriority="high" alt="Hero">

<!-- Other images (not LCP) -->
<img src="thumbnail1.jpg" alt="Thumb 1">
<img src="thumbnail2.jpg" alt="Thumb 2">

Result:
- hero.jpg: Priority 4 (High) → downloads first
- thumbnails: Priority 3 (Medium) → wait
- LCP improved 0.5-1s
```

**2. Defer Non-Critical JS**:
```html
<!-- Critical app JS -->
<script src="app.js" fetchpriority="high"></script>

<!-- Analytics (non-critical) -->
<script src="analytics.js" fetchpriority="low"></script>

Result:
- app.js: High priority (fast TTI)
- analytics.js: Low priority (doesn't block)
```

**3. Balance Multiple Images**:
```html
<!-- Above-fold (critical) -->
<img src="hero.jpg" fetchpriority="high">
<img src="product1.jpg" fetchpriority="high">

<!-- Below-fold (defer) -->
<img src="product2.jpg" fetchpriority="low" loading="lazy">
<img src="product3.jpg" fetchpriority="low" loading="lazy">

Result:
- hero + product1: Download immediately
- product2 + product3: Wait (low priority + lazy load)
```

---

### Lazy Loading (Native)

**Purpose**: Defer offscreen images/iframes until near viewport.

**Syntax**:
```html
<img src="offscreen.jpg" loading="lazy" alt="Offscreen">
<iframe src="embed.html" loading="lazy"></iframe>
```

**How It Works**:
```
Viewport: 1000px height

Image positions:
├── hero.jpg (0px) ← In viewport
├── product1.jpg (500px) ← In viewport
├── product2.jpg (1500px) ← Below viewport (lazy)
└── product3.jpg (2000px) ← Below viewport (lazy)

Load sequence:
1. hero.jpg: Load immediately (in viewport)
2. product1.jpg: Load immediately (in viewport)
3. Scroll to 1000px
4. product2.jpg: Trigger load (near viewport, ~500px threshold)
5. Scroll to 1500px
6. product3.jpg: Trigger load
```

**Benefits**:
- Reduces initial bandwidth (only visible images)
- Faster LCP (critical images load first)
- Better INP (less network congestion)

**Best Practice**:
```html
<!-- ✅ Above-fold: Eager load -->
<img src="hero.jpg" alt="Hero">

<!-- ✅ Below-fold: Lazy load -->
<img src="product1.jpg" loading="lazy" alt="Product 1">
<img src="product2.jpg" loading="lazy" alt="Product 2">

<!-- ❌ Don't lazy load LCP image -->
<img src="hero.jpg" loading="lazy"> <!-- BAD: delays LCP -->
```

---

### Resource Prioritization Strategy

**Optimal Loading Sequence**:
```html
<!DOCTYPE html>
<html>
<head>
  <!-- 1. Preconnect to critical origins (early DNS/TCP/TLS) -->
  <link rel="preconnect" href="https://cdn.example.com">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  
  <!-- 2. Preload critical resources (high priority) -->
  <link rel="preload" href="/fonts/heading.woff2" as="font" crossorigin>
  <link rel="preload" href="/images/hero.jpg" as="image">
  
  <!-- 3. Inline critical CSS (instant FCP) -->
  <style>
    /* Critical above-fold styles (5KB max) */
  </style>
  
  <!-- 4. Async load full CSS (non-blocking) -->
  <link rel="preload" href="/styles/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  
  <!-- 5. Defer non-critical JS -->
  <script src="/js/app.js" defer></script>
  <script src="/js/analytics.js" fetchpriority="low" defer></script>
</head>
<body>
  <!-- 6. LCP image with high priority -->
  <img src="/images/hero.jpg" fetchpriority="high" alt="Hero">
  
  <!-- 7. Below-fold images lazy load -->
  <img src="/images/product1.jpg" loading="lazy" alt="Product 1">
  <img src="/images/product2.jpg" loading="lazy" alt="Product 2">
  
  <!-- 8. Prefetch likely next page -->
  <link rel="prefetch" href="/product-page.html">
</body>
</html>
```

**Timeline**:
```
0ms:   HTML parsing starts
5ms:   Preconnect to CDN (DNS + TCP + TLS in parallel)
10ms:  Preload hero.jpg (high priority, parallel)
15ms:  Preload heading font (high priority, parallel)
20ms:  Inline CSS parsed → FCP (First Contentful Paint)
100ms: Hero image loaded → LCP (Largest Contentful Paint)
150ms: Full CSS loaded (async, non-blocking)
200ms: app.js loaded (defer, after HTML parsed)
300ms: analytics.js loaded (low priority, defer)
Idle:  Prefetch next page (low priority, cached)
```

---

## 3. Clear Real-World Examples

### Example 1: Amazon – Preload Hero Image (LCP Optimization)

**Challenge**: Hero image discovered late (after CSS), delaying LCP.

**Solution**: Preload hero image in `<head>`:
```html
<head>
  <!-- Preload hero (discovered before CSS) -->
  <link rel="preload" href="/images/hero.jpg" as="image">
  
  <!-- Boost priority -->
  <link rel="preload" href="/images/hero.jpg" as="image" fetchpriority="high">
</head>
<body>
  <img src="/images/hero.jpg" alt="Hero">
</body>
```

**Result**: LCP improved 3.5s → 2.1s (1.4s faster, 40% improvement).

---

### Example 2: Google – Prefetch Search Results

**Challenge**: User searches, result page loads slowly.

**Solution**: Prefetch results while user types:
```javascript
const searchInput = document.getElementById('search');

searchInput.addEventListener('input', () => {
  const query = searchInput.value;
  
  if (query.length > 2) {
    // Prefetch likely result page
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = `/search?q=${query}`;
    document.head.appendChild(link);
  }
});
```

**Result**: Instant navigation (result page already cached).

---

### Example 3: Netflix – Preconnect to Video CDN

**Challenge**: Video playback delayed by DNS + TLS (~200ms).

**Solution**: Preconnect to CDN early:
```html
<head>
  <!-- Preconnect to video CDN -->
  <link rel="preconnect" href="https://video-cdn.netflix.com">
</head>

<!-- When user clicks play, connection ready -->
<video src="https://video-cdn.netflix.com/video123.mp4"></video>
```

**Result**: Video starts 200ms faster (saved DNS + TLS).

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

> **Question**: "Explain browser resource prioritization."

**Answer**:

"Browser assigns **priorities** to resources based on **type** and **viewport position**. Developers can influence with **resource hints** and **priority hints**:

---

### Default Priorities

Browser's priority queue:

**Highest** (5):
- HTML document
- Blocking CSS (`<link rel='stylesheet'>` in `<head>`)
- Blocking JS (`<script>` in `<head>`, no async/defer)

**High** (4):
- Fonts (if used in viewport)
- Images in viewport
- High-priority XHR/fetch

**Medium** (3):
- Images slightly below viewport
- `<script async>`

**Low** (2):
- Images far below viewport
- `<script defer>`

**Lowest** (1):
- Prefetch resources

---

### Resource Hints

**1. Preload** (load NOW, high priority):
```html
<link rel="preload" href="hero.jpg" as="image">
<link rel="preload" href="font.woff2" as="font" crossorigin>
```

**Use**: Critical resources (LCP image, fonts, critical CSS/JS).

**Benefits**: High priority, starts download ASAP.

**Drawbacks**: Not cached across pages, wastes bandwidth if not used.

**2. Prefetch** (load LATER, low priority):
```html
<link rel="prefetch" href="/next-page.html">
```

**Use**: Likely next navigation (next page, search results).

**Benefits**: Low priority (doesn't block), cached across pages (HTTP cache).

**Drawbacks**: Wasted bandwidth if user doesn't navigate.

**Preload vs Prefetch**:
- **Preload**: High priority, current page, not cached across pages
- **Prefetch**: Low priority, next page, cached across pages

**3. Preconnect** (early DNS + TCP + TLS):
```html
<link rel="preconnect" href="https://cdn.example.com">
```

**Use**: Known origins (CDN, API, fonts).

**Benefits**: Saves ~100-300ms (DNS + TCP + TLS).

**Example**:
```
Without preconnect: 290ms (DNS 50ms + TCP 30ms + TLS 50ms + HTTP 50ms + Download 100ms)
With preconnect:    160ms (HTTP 50ms + Download 100ms, DNS/TCP/TLS during HTML parse)
Saved: 130ms
```

**Drawbacks**: Connection kept open ~10s (limit to 3-5 origins).

**4. DNS-Prefetch** (DNS only, cheaper):
```html
<link rel="dns-prefetch" href="https://ads.com">
```

**Use**: Many origins (20+), third-party (ads, social).

**DNS-Prefetch vs Preconnect**:
- **DNS-Prefetch**: DNS only (cheapest), many origins (20+)
- **Preconnect**: DNS + TCP + TLS (expensive), critical origins (3-5)

---

### Priority Hints (fetchpriority)

**Chrome 101+**: Manually adjust priority.

```html
<!-- Boost LCP image -->
<img src="hero.jpg" fetchpriority="high">

<!-- Defer analytics -->
<script src="analytics.js" fetchpriority="low"></script>
```

**Values**:
- `fetchpriority="high"` — Increase priority (critical)
- `fetchpriority="low"` — Decrease priority (non-critical)
- `fetchpriority="auto"` — Browser default

**Use Cases**:
- **High**: LCP image, critical JS
- **Low**: Analytics, ads, below-fold images

---

### Lazy Loading

**Native lazy loading** (defer offscreen):
```html
<img src="offscreen.jpg" loading="lazy">
```

**Triggers**: When image near viewport (~500px threshold).

**Benefits**: Reduces initial bandwidth, faster LCP (critical images first).

**Best Practice**:
```html
<!-- ✅ Above-fold: Eager -->
<img src="hero.jpg">

<!-- ✅ Below-fold: Lazy -->
<img src="product.jpg" loading="lazy">

<!-- ❌ Don't lazy load LCP -->
<img src="hero.jpg" loading="lazy"> <!-- BAD -->
```

---

### Optimal Strategy

```html
<head>
  <!-- 1. Preconnect (early connection) -->
  <link rel="preconnect" href="https://cdn.example.com">
  
  <!-- 2. Preload critical resources -->
  <link rel="preload" href="hero.jpg" as="image" fetchpriority="high">
  <link rel="preload" href="font.woff2" as="font" crossorigin>
  
  <!-- 3. Inline critical CSS (instant FCP) -->
  <style>/* Critical CSS */</style>
  
  <!-- 4. Async full CSS -->
  <link rel="preload" href="main.css" as="style" onload="this.rel='stylesheet'">
  
  <!-- 5. Defer JS -->
  <script src="app.js" defer></script>
  <script src="analytics.js" fetchpriority="low" defer></script>
</head>
<body>
  <!-- 6. LCP image (high priority) -->
  <img src="hero.jpg" fetchpriority="high">
  
  <!-- 7. Below-fold lazy -->
  <img src="product.jpg" loading="lazy">
  
  <!-- 8. Prefetch next page -->
  <link rel="prefetch" href="/next-page.html">
</body>
```

---

### Real-World Examples

**Amazon**: Preload hero image (LCP 3.5s → 2.1s, 40% improvement).

**Google**: Prefetch search results (instant navigation).

**Netflix**: Preconnect to video CDN (200ms faster playback).

---

### Trade-offs

**Preload**:
- ✅ High priority (fast)
- ❌ Not cached across pages (page-specific)
- ❌ Wastes bandwidth if not used

**Prefetch**:
- ✅ Cached across pages (HTTP cache)
- ✅ Low priority (doesn't block)
- ❌ Wasted if user doesn't navigate

**Preconnect**:
- ✅ Saves 100-300ms (DNS + TCP + TLS)
- ❌ Connection kept open ~10s (resource cost)
- ❌ Limit to 3-5 origins

**fetchpriority**:
- ✅ Fine-grained control
- ❌ Chrome only (limited support)

**Follow-up I Expect**:

Q: 'When to use preload vs prefetch?'
A: **Preload** for current page critical resources (LCP image, fonts). **Prefetch** for likely next navigation (next page, search results). Preload = high priority NOW, prefetch = low priority FUTURE.

Q: 'How many preconnects?'
A: Limit to **3-5 critical origins** (CDN, API, fonts). Each connection kept open ~10s (resource cost). For many origins (20+), use **dns-prefetch** (cheaper, DNS only).

Q: 'fetchpriority browser support?'
A: Chrome 101+, Edge 101+ (Chromium-based). Not Safari/Firefox yet. Progressive enhancement: add fetchpriority (Chromium benefits), no harm others (ignored)."

---

## 6. Why & How Summary

### Why It Matters

**Loading Performance**: Critical resources first (LCP image, fonts, critical CSS) → faster FCP/LCP/TTI  
**Network Efficiency**: Preconnect saves 100-300ms (DNS + TCP + TLS), prefetch caches next page (instant navigation)  
**User Experience**: Lazy loading reduces initial bandwidth, smooth loading prioritizes above-fold  
**Core Web Vitals**: Optimized loading improves LCP (preload hero), FID (defer non-critical JS), CLS (size attributes)

### How It Works

**Default Priorities**: Browser assigns 0-5 priority (5=HTML/blocking CSS/JS highest, 4=fonts/viewport images high, 3=async scripts medium, 2=offscreen images/defer scripts low, 1=prefetch lowest)  
**Preload**: `<link rel="preload" as="image/font/style/script">` high priority fetch NOW for current page, not cached across pages, use for LCP candidates (hero image, critical fonts)  
**Prefetch**: `<link rel="prefetch">` low priority fetch FUTURE navigation, cached across pages (HTTP cache), use for likely next page  
**Preconnect**: `<link rel="preconnect">` early DNS+TCP+TLS during HTML parse saves 100-300ms, limit 3-5 critical origins (CDN/API/fonts), connection kept open ~10s  
**DNS-Prefetch**: `<link rel="dns-prefetch">` DNS only (cheaper), use for many origins (20+) third-party (ads/social)  
**fetchpriority**: `fetchpriority="high/low/auto"` Chrome 101+ manual priority adjustment, high for LCP image/critical JS, low for analytics/ads  
**Lazy Loading**: `loading="lazy"` native defer offscreen images/iframes until near viewport (~500px threshold), reduces initial bandwidth, don't lazy load LCP image

**FAANG Expectation**: Explain default browser priorities (0-5 levels by resource type and viewport position), four resource hints (preload high priority current page, prefetch low priority next page, preconnect early connection saves 100-300ms, dns-prefetch DNS only for many origins), preload vs prefetch differences (priority, caching, use cases), preconnect cost/benefit (saves DNS+TCP+TLS but keeps connection open limit 3-5), fetchpriority attribute (high/low manual adjustment Chrome 101+), lazy loading (loading="lazy" defer offscreen don't use on LCP), optimal loading strategy (preconnect→preload critical→inline critical CSS→async full CSS→defer JS→lazy below-fold→prefetch next), real-world examples (Amazon preload hero 40% LCP improvement, Google prefetch search instant navigation, Netflix preconnect video 200ms faster), trade-offs (preload not cached across pages, prefetch wasted if no navigation, preconnect resource cost limit origins, fetchpriority browser support limited)
