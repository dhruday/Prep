# 18. Browser Resource Prioritization

---

## 1. High-Level Explanation (Frontend Interview Level)

When a browser parses HTML and discovers resources to download (scripts, styles, images, fonts, etc.), it doesn't fetch them all with equal urgency. The browser has a prioritization system that decides which resources should be fetched first, based on their type, location in the document, and rendering impact.

**Why prioritization exists:**
- Bandwidth is limited (especially mobile)
- Some resources block rendering (CSS, synchronous JS)
- Others are critical for UX (LCP hero image, above-fold fonts)
- Others are optional until user interaction (offscreen images, lazy-loaded routes)

**The goal:** Get the page visible and interactive as fast as possible, given finite bandwidth.

**Key mechanisms:**
- **Built-in browser heuristics** — CSS and blocking scripts always get high priority
- **`<link rel="preload">`** — Tell the browser explicitly: "fetch this now, I'll need it soon"
- **`<link rel="prefetch">`** — Tell the browser: "fetch this when idle, for the next navigation"
- **`<link rel="preconnect">`** — Warm up the TCP/TLS connection to a third-party origin
- **`fetchpriority` attribute** — Override the browser's default priority (`high`, `low`, `auto`)
- **Lazy loading** (`loading="lazy"`, dynamic `import()`) — Defer non-critical resources

---

## 2. Deep-Dive Explanation (Senior / Staff Level)

### Browser's Default Priority Assignment

Chrome assigns each resource a network priority:

| Resource Type | Default Priority | Notes |
|--------------|-----------------|-------|
| HTML document | **Highest** | Navigation request |
| CSS (in `<head>`) | **Highest** | Render-blocking |
| Synchronous `<script>` | **High** | Parser-blocking |
| `<script defer>` | **Low** (loaded) / **High** (executed) | Downloaded low-priority, but executes before DOMContentLoaded |
| `<script async>` | **Low** | Downloaded & executed when ready |
| Preloaded resources (`<link rel="preload">`) | Matches `as` attribute type |  |
| Fonts (`@font-face`) | **High** as Web Font | Blocks text rendering |
| Images above-fold | **High** | Detected by viewport position heuristic |
| Images below-fold | **Low** | Deferred until bandwidth available |
| `fetch()` API call | **High** | Same as XHR by default |
| Service Worker main script | **High** | Needed to intercept fetches |

**Deprioritization:** Chrome will delay low-priority resource fetches when the document is still loading (bandwidth reservation for high-priority resources).

### Resource Hints

**`<link rel="preload">`**
Tells the browser: "I know I'll need this resource soon, please fetch it at high priority now."

```html
<!-- LCP hero image — fetch early, avoid LCP being blocked by discovery time -->
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high">

<!-- Critical font — fetch before @font-face rule is parsed from stylesheet -->
<link rel="preload" href="/fonts/inter-500.woff2" as="font" type="font/woff2" crossorigin>

<!-- Critical JS chunk that will be needed immediately -->
<link rel="preload" href="/vendor.js" as="script">

<!-- API call needed early in page lifecycle -->
<link rel="preload" href="/api/user" as="fetch" crossorigin>
```

**The `as` attribute is mandatory** — it tells the browser which resource type to use for priority assignment, cache lookup, and request headers.

**`<link rel="prefetch">`**
Tells the browser: "I'll need this resource in the NEXT navigation, not the current page. Fetch it when idle."

```html
<!-- Prefetch the next page's main bundle while user reads current page -->
<link rel="prefetch" href="/app.next-route.js" as="script">

<!-- Prefetch product image before user clicks "next" in a carousel -->
<link rel="prefetch" href="/products/item-4.jpg" as="image">
```

**Key difference from preload:**
- `preload` = current page, high priority, browser MUST fetch
- `prefetch` = future navigation, idle priority, browser MAY fetch (respects data saver mode)

**`<link rel="preconnect">`**
Pre-establishes TCP + TLS connection to a third-party origin before any resource from that origin is needed:

```html
<!-- Pre-warm connection to third-party font service -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- Pre-warm CDN used for assets (a.cdn.example.com) -->
<link rel="preconnect" href="https://a.cdn.example.com">
```

**Cost:** Each `preconnect` consumes a TCP connection slot. Don't preconnect to origins you're not sure about — wasting a connection slot can be detrimental.

**`<link rel="dns-prefetch">`**
Cheaper version of `preconnect` — only resolves DNS, no TCP/TLS warm-up. Use as fallback for browsers that don't support `preconnect`, or for origins where you don't want full connection pre-warming:

```html
<link rel="dns-prefetch" href="https://third-party-analytics.example.com">
```

### `fetchpriority` Attribute

Introduced in Chromium 101+ and Safari 17.2+. Allows explicit priority override on individual resources:

```html
<!-- LCP image — boost priority so it doesn't compete with minor images -->
<img src="/hero.jpg" fetchpriority="high" alt="Hero">

<!-- Below-fold images — reduce priority -->
<img src="/decoration.jpg" fetchpriority="low" alt="" loading="lazy">

<!-- API call needed for initial render — high priority -->
<script>
  fetch('/api/critical-data', { priority: 'high' });
</script>

<!-- Analytics — doesn't affect rendering, deprioritize -->
<script>
  fetch('/analytics/event', { priority: 'low' });
</script>
```

**Use case for LCP optimization:**
Without `fetchpriority="high"` on the LCP image, the browser might initially assign it medium priority (treating it as a normal image). By the time the preload scanner OR the image tag itself is processed, other medium-priority resources (unused CSS, deferred scripts) may already occupy bandwidth. `fetchpriority="high"` forces the browser to treat the LCP image at the same priority as render-blocking CSS.

### Lazy Loading

**Images:** `loading="lazy"` defers image loading until the image is within a threshold distance of the viewport (typically 1250px in Chrome for mobile):

```html
<!-- Only loads when user is about to scroll to it -->
<img src="/below-fold.jpg" loading="lazy" alt="Content image">

<!-- NEVER lazy-load LCP images! -->
<img src="/hero.jpg" alt="Hero"> <!-- No loading="lazy" on above-fold! -->
```

**Route-level code splitting** (lazy loading JS chunks):
```javascript
// React — route is lazy-loaded when user navigates there
const ProductPage = lazy(() => import('./routes/ProductPage'));

// Next.js — automatic route-level code splitting by default
// Manual lazy loading with dynamic import
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Spinner />,
  ssr: false, // Client-side only
});
```

### Priority and the Preload Scanner

The preload scanner runs ahead of the main parser to discover resources. But it can only find resources declared in HTML. Resources discovered via CSS (`@font-face`, `background-image`) or JavaScript execution are not discovered by the preload scanner.

```html
<!-- ✅ Preload scanner FINDS this — HTML declaration -->
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>

<!-- ❌ Preload scanner MISSES this — discovered only when CSS is parsed -->
<!-- In CSS: @font-face { src: url('/fonts/inter.woff2'); } -->

<!-- Solution: also declare as preload in HTML when font is critical -->
```

**This is why `<link rel="preload">` for fonts is important** — it promotes the font fetch to scanner-discoverable HTML, giving it a head start.

### Priority in HTTP/2 and HTTP/3

HTTP/2 introduced stream prioritization — individual request streams within a single connection can be assigned weights. Modern browsers use this to signal resource priorities to the server, which can use it to schedule data transmission order.

In practice, Chrome's priority signals translate to H2 stream weights that hint to CDNs and servers to send CSS/critical JS bytes before image bytes. CDN support for priority varies significantly.

### Resource Loading Performance Budget

Production systems define a **performance budget** per page type:

| Page Type | JS Budget | CSS Budget | Image Budget | Font Budget |
|-----------|-----------|-----------|--------------|-------------|
| Marketing landing | 200KB | 50KB | 200KB | 2 fonts |
| Product listing | 300KB | 75KB | Lazy load | 2 fonts |
| Admin dashboard | 500KB | 100KB | Lazy load | 2 fonts |

Bundler CI checks enforce these budgets on every PR, preventing regressions.

---

## 3. Real-World Examples

### Netflix — Priority Hints for LCP
Netflix's homepage has a large hero image as the LCP element. They use `<link rel="preload">` in the SSR HTML plus `fetchpriority="high"` directly on the `<img>` tag to ensure the hero image is fetched at the absolute highest priority, competing only with CSS and blocking scripts. This dramatically reduces their LCP score.

### Airbnb — Prefetching on Hover
Airbnb prefetches listing detail pages when the user hovers over a search result card for 200ms+ (before they click). When the user actually navigates, the JS bundle and initial data for the detail page are already downloaded. The perceived navigation is near-instant.

```javascript
// On hover/focus for 200ms → prefetch next route
function usePrefetchOnHover(href) {
  return {
    onMouseEnter: debounce(() => {
      router.prefetch(href); // Next.js: triggers <link rel="prefetch">
    }, 200),
  };
}
```

### Google — `fetchpriority` for Search Results
Google's search results page uses `fetchpriority="high"` on the first few result favicons and `fetchpriority="low"` on ads and below-fold content. This ensures the primary search result content loads without competing with supplementary resources.

### Next.js — Automatic Priority Optimization
Next.js's `<Image>` component automatically:
- Adds `loading="lazy"` for non-priority images
- Adds `fetchpriority="high"` for `priority` prop images (LCP)
- Generates `<link rel="preload">` for priority images
- Converts images to WebP/AVIF for smaller transfer sizes

---

## 4. Interview-Oriented Explanation

### Sample Answer (7+ Years Level)

*"Browser resource prioritization is how the browser allocates limited bandwidth across many concurrent resource downloads. CSS and blocking scripts get highest priority because they're on the Critical Rendering Path. Fonts, above-fold images, and fetch API calls default to high priority. Below-fold images, async scripts, and prefetches get low priority.*

*For LCP optimization specifically, `<link rel="preload">` + `fetchpriority='high'` on the hero image is the standard pattern. Preload makes the resource parser-discoverable earlier (the preload scanner finds it in `<head>`), and `fetchpriority='high'` ensures it doesn't compete with other high-priority resources for bandwidth.*

*`preconnect` is critical for pages using Google Fonts, third-party CDNs, or any cross-origin API called in the first second of load. Each cross-origin request pays DNS + TCP + TLS overhead — preconnect eliminates that overhead for the most impactful third-party origins.*

*At scale, these are enforced via performance budgets in CI pipelines — every PR checks that new routes don't exceed JS/CSS bundle size thresholds, and that critical resources have proper priority hints."*

### Likely Follow-up Questions

1. **"What's the difference between `preload` and `prefetch`?"**
   → `preload`: current page, mandatory high-priority fetch, used for resources needed during current page load. `prefetch`: future navigation, idle-priority, browser may skip on data saver or when busy.

2. **"Can you over-preload? What happens?"**
   → Yes. Every `preload` that isn't used within 3 seconds triggers a console warning in Chrome ("resource was preloaded but not used"). Over-preloading wastes bandwidth and can delay higher-priority resources by competing for connections.

3. **"How does Next.js `<Image priority>` work?"**
   → It emits `<link rel="preload" as="image" fetchpriority="high">` in the document `<head>`, removes `loading="lazy"`, and sets `fetchpriority="high"` on the img element directly. Multi-level hint for maximum priority.

4. **"When would you use `dns-prefetch` vs `preconnect`?"**
   → `dns-prefetch` for origins where you want DNS resolved but don't want to waste a full TCP connection slot. `preconnect` for origins you will definitely load critical resources from (Google Fonts, your API origin, CDN). Use both together for maximum compatibility: `preconnect` + `dns-prefetch` as fallback.

---

## 5. Code Examples

### Comprehensive Resource Hints Template

```html
<!DOCTYPE html>
<html>
<head>
  <!-- 1. Preconnect to critical third-party origins (max 6) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="dns-prefetch" href="https://analytics.example.com"> <!-- fallback -->
  
  <!-- 2. Preload critical resources for current page -->
  <!-- LCP image — must be discoverable by preload scanner -->
  <link rel="preload" href="/images/hero.webp" as="image" fetchpriority="high">
  <!-- Critical font used above fold -->  
  <link rel="preload" href="/fonts/inter-500.woff2" as="font" type="font/woff2" crossorigin>
  <!-- Critical JS required for interactivity -->
  <link rel="preload" href="/app.chunk.js" as="script">
  
  <!-- 3. RENDER-BLOCKING CSS (intentionally blocking — contains critical styles) -->
  <style>
    /* Critical above-fold CSS inlined here */
    body { margin: 0; font-family: 'Inter', sans-serif; }
    .hero { min-height: 100vh; display: flex; align-items: center; }
  </style>
  
  <!-- 4. Non-critical CSS loaded asynchronously -->
  <link rel="preload" href="/styles.css" as="style" onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="/styles.css"></noscript>
  
  <!-- 5. Defer app JS -->
  <script src="/app.chunk.js" defer></script>
</head>
<body>
  <!-- fetchpriority="high" on LCP element -->
  <img src="/images/hero.webp" alt="Hero" fetchpriority="high" width="1200" height="600">
  
  <!-- Below-fold images: lazy loaded -->
  <img src="/images/product.webp" alt="Product" loading="lazy" width="400" height="300">
</body>
</html>
```

### Programmatic Priority Control

```javascript
// Dynamic preload for route-based splitting
function prefetchRoute(routePath) {
  // Create preload link dynamically
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = routePath;
  link.as = 'document';
  document.head.appendChild(link);
}

// Intersection Observer for image lazy-load control
const lazyLoadObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;           // Swap in real src
        img.removeAttribute('data-src');
        lazyLoadObserver.unobserve(img);     // Stop observing
      }
    });
  },
  { rootMargin: '200px' } // Start 200px before element enters viewport
);

document.querySelectorAll('img[data-src]').forEach(img => {
  lazyLoadObserver.observe(img);
});
```

---

## 6. Why & How Summary

**Why it matters:**
Resource prioritization directly affects Core Web Vitals — LCP, FCP, and TTI. Misaligned priorities (hero image at medium priority, minor CSS at high) cause LCP regressions. Missing preconnect hints add 100-300ms to first requests from third-party origins. Unused preloads waste bandwidth. Getting prioritization right is low-effort, high-impact work that scales across essentially all traffic without additional infrastructure. Google uses resource priority hints as a ranking signal, and field LCP scores affect SEO.

**How it works:**
The browser's network prioritization stack assigns each resource a priority tier (Highest, High, Medium, Low, Lowest) based on resource type, document position, and viewport position. High-priority resources get network connections first and are served before low-priority ones when bandwidth is constrained. Resource hints (`preload`, `prefetch`, `preconnect`, `dns-prefetch`) and the `fetchpriority` attribute allow developers to override or supplement these heuristics. The preload scanner discovers HTML-declared resources early — resources discovered only via CSS or JS execution are inevitably discovered later and thus fetched later. Lazy loading deferral (`loading="lazy"`, dynamic `import()`) moves non-critical resources out of the critical path entirely.
